#!/usr/bin/env node
/**
 * fetch-live-data.mjs — pull the player's live state from the Orbo tRPC API.
 *
 * Usage:
 *   node scripts/fetch-live-data.mjs [--summary | --export-army | --json]
 *                                    [--rubis | --token <opec|rubis>]
 *
 * Modes:
 *   --summary      (default) human-readable overview of the live account state
 *   --export-army  emit a base64 save code importable by the battle calculator
 *   --json         dump all raw API responses as one JSON object
 *
 * Account: uses OPEC_TOKEN by default (falls back to RUBIS_TOKEN). Pass
 *   --rubis (or --token rubis) to fetch the RUBIS_TOKEN account instead —
 *   an explicit choice never falls back, so you can't export the wrong account.
 *
 * Token: read from ../orbo-bot-go/.env (sibling repo) or a local .env in the
 *   repo root.
 *
 * Read-only: only GETs query procedures. Never calls game.executeActions
 * or any other mutation endpoint.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const BASE_URL = 'https://orbo.shadow.club/api/trpc';
const BATCH_PAUSE_MS = 1000;

// Read-only query batches. NEVER add mutation procedures here.
const BATCHES = [
  { name: 'core', procs: ['game.state', 'game.orbos.state', 'game.player.inventory.state'] },
  { name: 'totems', procs: ['game.totems.state', 'game.totems.discoveryPercentile'] },
  { name: 'progression', procs: ['game.player.stats.overview'] },
  { name: 'depths', procs: ['game.depths.floors.state', 'game.depths.spawn.state'], optional: true },
];

// ---------------------------------------------------------------------------
// Token loading (no deps: tiny key=value .env parser)
// ---------------------------------------------------------------------------

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const out = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const TOKEN_KEYS = { opec: 'OPEC_TOKEN', rubis: 'RUBIS_TOKEN' };

// account: 'opec' | 'rubis' | null. null = default behavior (prefer
// OPEC_TOKEN, fall back to RUBIS_TOKEN). An explicit account never falls
// back — exporting the wrong account would silently produce a wrong save code.
function loadToken(account) {
  const wanted = account ? [TOKEN_KEYS[account]] : [TOKEN_KEYS.opec, TOKEN_KEYS.rubis];
  const candidates = [
    path.resolve(REPO_ROOT, '..', 'orbo-bot-go', '.env'),
    path.resolve(REPO_ROOT, '.env'),
  ];
  for (const file of candidates) {
    const env = parseEnvFile(file);
    if (!env) continue;
    for (const key of wanted) {
      if (env[key]) {
        return { token: env[key], source: file, account: key === TOKEN_KEYS.rubis ? 'rubis' : 'opec' };
      }
    }
  }
  console.error(account
    ? `Error: ${TOKEN_KEYS[account]} not found (--${account} was requested, no fallback).`
    : 'Error: no API token found.');
  console.error(`Looked for ${wanted.join(' / ')} in:`);
  for (const file of candidates) console.error(`  - ${file}`);
  console.error('Add a line like `OPEC_TOKEN=<your bearer token>` to one of those files.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// tRPC batch GET
// ---------------------------------------------------------------------------

function buildBatchUrl(procs) {
  const input = {};
  procs.forEach((_, i) => {
    input[String(i)] = { json: null, meta: { values: ['undefined'] } };
  });
  const qs = `batch=1&input=${encodeURIComponent(JSON.stringify(input))}`;
  return `${BASE_URL}/${procs.join(',')}?${qs}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchBatch(procs, token) {
  const url = buildBatchUrl(procs);
  const doFetch = () =>
    fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

  let res;
  try {
    res = await doFetch();
  } catch (err) {
    // Network error → retry once after 2s.
    console.error(`  network error (${err.message}), retrying in 2s...`);
    await sleep(2000);
    res = await doFetch();
  }

  if (res.status === 401 || res.status === 403) {
    console.error('Error: API returned ' + res.status + ' — token expired, get a new one from Telegram.');
    process.exit(1);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const body = await res.json();
  // Response: array of {result:{data:{json:{...}}}} (or {error:{...}}), one per proc.
  const out = {};
  procs.forEach((proc, i) => {
    const entry = Array.isArray(body) ? body[i] : body;
    if (entry?.result?.data && 'json' in entry.result.data) {
      out[proc] = entry.result.data.json;
    } else if (entry?.result?.data !== undefined) {
      out[proc] = entry.result.data;
    } else if (entry?.error) {
      console.error(`  procedure ${proc} errored: ${entry.error?.json?.message ?? JSON.stringify(entry.error)}`);
      out[proc] = null;
    } else {
      out[proc] = null;
    }
  });
  return out;
}

async function fetchAll(token) {
  const data = {};
  const failed = [];
  for (let i = 0; i < BATCHES.length; i++) {
    const batch = BATCHES[i];
    if (i > 0) await sleep(BATCH_PAUSE_MS);
    console.error(`Fetching batch "${batch.name}" (${batch.procs.join(', ')})...`);
    try {
      Object.assign(data, await fetchBatch(batch.procs, token));
    } catch (err) {
      console.error(`  batch "${batch.name}" failed: ${err.message} — skipping.`);
      failed.push(batch.name);
    }
  }
  return { data, failed };
}

// ---------------------------------------------------------------------------
// Local tool data (optional enrichment; script still works without it)
// ---------------------------------------------------------------------------

function loadJsonSafe(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(REPO_ROOT, rel), 'utf8'));
  } catch {
    return null;
  }
}

const creaturesData = loadJsonSafe('app/src/orbo-creatures.json') ?? [];
const ringsData = loadJsonSafe('app/src/orbo-rings.json') ?? [];
const bossesData = loadJsonSafe('app/src/orbo-bosses.json') ?? [];
const creaturesDict = Object.fromEntries(creaturesData.map((c) => [c.key, c]));
const ringsDict = Object.fromEntries(ringsData.map((r) => [r.key, r]));
const bossesByNumber = Object.fromEntries(bossesData.map((b) => [b.bossNumber, b]));

// ---------------------------------------------------------------------------
// Shared extraction helpers
// ---------------------------------------------------------------------------

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : String(n ?? '?'));

function effectsToMap(effects) {
  // Accepts [{key,value}, ...] or an already-aggregated {key: value} object.
  if (Array.isArray(effects)) {
    const map = {};
    for (const e of effects) {
      if (e && e.key !== undefined) map[e.key] = e.value;
    }
    return map;
  }
  if (effects && typeof effects === 'object') return { ...effects };
  return {};
}

function findEquippedRing(inventory) {
  const items = inventory?.items ?? [];
  for (const item of items) {
    const equipped = item?.isEquipped ?? item?.equipped;
    if (!equipped) continue;
    const key = item.itemKey ?? item.key;
    if ((item.type && String(item.type).includes('ring')) || ringsDict[key]) {
      return { key, item };
    }
  }
  return null;
}

function getEquippedTotems(totemsState) {
  return (totemsState?.owned ?? []).filter((t) => t.isEquipped);
}

// ---------------------------------------------------------------------------
// --summary
// ---------------------------------------------------------------------------

function printSummary(data) {
  const state = data['game.state'];
  const orbosState = data['game.orbos.state'];
  const inventory = data['game.player.inventory.state'];
  const totemsState = data['game.totems.state'];
  const percentile = data['game.totems.discoveryPercentile'];
  const overview = data['game.player.stats.overview'];

  const lines = [];
  lines.push('=== Orbo Live State ===');

  if (overview) {
    lines.push('');
    lines.push('-- Player --');
    lines.push(`Level ${overview.level} | Floor ${overview.floor} | XP ${fmt(overview.xp)}`);
    lines.push(`Luck level: ${overview.luckLevel} | Rocks broken: ${fmt(overview.totalRocksBroken)} | Orbos spawned: ${fmt(overview.orbosSpawned)}`);
    lines.push(`Coins/hour: ${fmt(Math.round(overview.coinsPerHour ?? 0))}`);
    if (overview.orboTierBreakdown) {
      const tiers = Object.entries(overview.orboTierBreakdown).map(([k, v]) => `${k}: ${v}`).join(', ');
      lines.push(`Orbo tiers: ${tiers}`);
    }
  }

  if (state) {
    lines.push('');
    lines.push('-- Core state --');
    lines.push(`Orbo DPS: ${fmt(state.orboDps)} | Overcharge L${state.overchargeLevel ?? 0} | Surge L${state.surgeLevel ?? 0} | Luck L${state.luckLevel ?? '?'}`);
    lines.push(`Coins: ${fmt(state.coins)} | Food: ${fmt(state.food)} | Orbs: ${fmt(state.orbs)} | Gems: ${fmt(state.gems)} | Essence: ${fmt(state.essence)}`);
    lines.push(`Floor: ${fmt(state.floor)} | Orbo capacity: ${state.orbosCount ?? '?'}/${state.orboCapacity ?? '?'} | Orbo level-ups: ${fmt(state.orboLevelUps)}`);
  }

  if (orbosState) {
    lines.push('');
    lines.push(`-- Army (${(orbosState.orbos ?? []).length}/${orbosState.capacity ?? '?'} slots, total DPS ${fmt(orbosState.totalDps)}) --`);
    for (const orbo of orbosState.orbos ?? []) {
      const key = orbo.orboKey ?? orbo.key;
      const local = creaturesDict[key];
      const name = local?.name ?? key;
      const tier = local?.tier ? ` [${local.tier}]` : '';
      const dps = local?.levels?.[orbo.level - 1]?.dps;
      lines.push(`  ${name}${tier} (key: ${key}) — L${orbo.level}${dps != null ? ` — ${fmt(dps)} dps` : ''}`);
    }
  }

  if (inventory) {
    lines.push('');
    lines.push('-- Tap / inventory --');
    const cs = inventory.clickStats ?? {};
    lines.push(`Click flat bonus: ${fmt(cs.flatBonus)} | Orbo DPS multiplier: ${cs.orboDpsMultiplier ?? 0}`);
    const ring = findEquippedRing(inventory);
    if (ring) {
      const local = ringsDict[ring.key];
      const name = ring.item.name ?? local?.name ?? ring.key;
      const stats = local ? ` (flat +${local.flatDamage}, orbo mult ${local.orboDpsMultiplier})` : '';
      lines.push(`Equipped ring: ${name} (key: ${ring.key})${stats}`);
    } else {
      lines.push('Equipped ring: none');
    }
  }

  if (totemsState) {
    lines.push('');
    const equipped = getEquippedTotems(totemsState);
    lines.push(`-- Totems (${equipped.length} equipped / ${(totemsState.owned ?? []).length} owned) --`);
    for (const t of equipped) {
      const eff = (t.effects ?? []).map((e) => `${e.key}=${e.value}`).join(', ');
      lines.push(`  [slot ${t.slot ?? '?'}] ${t.name} (${t.itemKey}, T${t.tier} ${t.rarityName}, lane: ${t.lane}) — ${eff}`);
    }
    const agg = effectsToMap(totemsState.effects);
    // Aggregated values are deltas from baseline; only show active (non-zero) ones.
    const active = Object.entries(agg).filter(([, v]) => typeof v === 'number' && v !== 0);
    if (active.length) {
      lines.push(`Aggregated effects (deltas): ${active.map(([k, v]) => `${k}=+${v}`).join(', ')}`);
    }
    if (percentile != null) {
      const p = typeof percentile === 'object'
        ? `${percentile.collected}/${percentile.rosterSize} collected, beats ${percentile.beatsPercent}% of players`
        : String(percentile);
      lines.push(`Discovery: ${p}`);
    }
  }

  const floors = data['game.depths.floors.state'];
  const spawn = data['game.depths.spawn.state'];
  if (floors || spawn) {
    lines.push('');
    lines.push('-- Depths --');
    if (floors) {
      lines.push(`Floor ${fmt(floors.floor)} (max unlocked ${fmt(floors.maxFloorUnlocked)}) | Rock HP: ${fmt(floors.rockMaxHp)} | Rock gold: ${fmt(floors.rockGold)}`);
      if (floors.idleChestCoinsPerHour != null) lines.push(`Idle chest: ${fmt(floors.idleChestCoinsPerHour)} coins/hour`);
    }
    if (spawn) {
      lines.push(`Spawner: luck L${spawn.luckLevel ?? '?'} | multi-spawn x${spawn.multiSpawnCount ?? '?'} (unlocked x${spawn.multiSpawnUnlocked ?? '?'}) | total spawned: ${fmt(spawn.totalSpawned)}`);
      if (spawn.upgradeTimer?.completesAt) {
        lines.push(`Luck upgrade completes: ${new Date(spawn.upgradeTimer.completesAt).toISOString()}`);
      }
    }
  }

  console.log(lines.join('\n'));
}

// ---------------------------------------------------------------------------
// --export-army
// ---------------------------------------------------------------------------

function buildExportCode(data) {
  const state = data['game.state'] ?? {};
  const orbosState = data['game.orbos.state'];
  const inventory = data['game.player.inventory.state'];
  const totemsState = data['game.totems.state'];

  if (!orbosState?.orbos) {
    console.error('Error: game.orbos.state missing — cannot build army export.');
    process.exit(1);
  }

  // Slots: mirror the tool's ArmySlotInfo[8] shape, padded with empty slots.
  const capacity = Math.max(8, orbosState.capacity ?? 8);
  const slots = Array.from({ length: capacity }, () => ({ creatureKey: null, level: 1 }));
  (orbosState.orbos ?? []).slice(0, capacity).forEach((orbo, i) => {
    slots[i] = { creatureKey: orbo.orboKey ?? orbo.key ?? null, level: orbo.level ?? 1 };
  });
  for (const slot of slots) {
    if (slot.creatureKey && !creaturesDict[slot.creatureKey]) {
      console.error(`  warning: live creature "${slot.creatureKey}" not found in app/src/orbo-creatures.json — the tool may not resolve it.`);
    }
  }

  // Equipped totem cards → config.totemKeys[3]. Live items carry a slot index;
  // place each card at its slot when the indices look sane (0- or 1-based),
  // otherwise just fill left to right.
  const totemKeys = [null, null, null];
  const equippedTotems = getEquippedTotems(totemsState ?? {});
  const slotsLookZeroBased = equippedTotems.every((t) => Number.isInteger(t.slot) && t.slot >= 0 && t.slot <= 2);
  const slotsLookOneBased = equippedTotems.every((t) => Number.isInteger(t.slot) && t.slot >= 1 && t.slot <= 3);
  equippedTotems.slice(0, 3).forEach((t, i) => {
    const key = t.itemKey ?? t.key ?? null;
    if (slotsLookZeroBased) totemKeys[t.slot] = key;
    else if (slotsLookOneBased) totemKeys[t.slot - 1] = key;
    else totemKeys[i] = key;
  });

  // clickStats from game.player.inventory.state is already the aggregate of
  // all equipped rings — exactly what the tool's clickPercent/clickFixed
  // fields represent (Attributes screen: "Orbo DPS → Click"). Use it raw.
  const cs = inventory?.clickStats ?? {};
  const orboDpsMultiplier = typeof cs.orboDpsMultiplier === 'number' ? cs.orboDpsMultiplier : 0.35;
  const flatBonus = typeof cs.flatBonus === 'number' ? cs.flatBonus : 57;

  // Resolve the player's current depth floor → target boss.
  // Prefer depths API, fall back to overview/state.
  const depthsFloors = data['game.depths.floors.state'];
  const overview = data['game.player.stats.overview'];
  const currentFloor = depthsFloors?.floor ?? overview?.floor ?? state.floor ?? null;
  let bossNumber = 11; // fallback default
  let bossEnergy = 2550000;
  let battleDuration = 30;
  if (currentFloor != null) {
    const derived = Math.ceil(currentFloor / 10);
    const boss = bossesByNumber[derived];
    if (boss) {
      bossNumber = boss.bossNumber;
      bossEnergy = boss.hp;
      battleDuration = boss.timer;
      console.error(`  floor ${currentFloor} → boss ${bossNumber} (${boss.biomeName}, HP ${bossEnergy.toLocaleString('en-US')})`);
    } else {
      console.error(`  warning: floor ${currentFloor} → boss ${derived} not found in orbo-bosses.json, using default.`);
    }
  } else {
    console.error('  warning: could not determine current floor, using default boss 11.');
  }

  const config = {
    clickPercent: String(Math.round(orboDpsMultiplier * 100)),
    clickFixed: flatBonus,
    bossEnergy,
    battleDuration,
    maxClicks: 82,
    bossNumber,
    selectedBoss: null,
    overchargeLevel: state.overchargeLevel ?? 0,
    surgeLevel: state.surgeLevel ?? 0,
    totemKeys,
    luckLevel: state.luckLevel ?? null,
    totemImagesOn: true,
  };

  // Same encoding as the tool's exportData(): btoa(encodeURIComponent(JSON.stringify(...)))
  const json = JSON.stringify({ config, slots: slots.slice(0, 8) });
  return Buffer.from(encodeURIComponent(json), 'binary').toString('base64');
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function parseAccount(args) {
  const i = args.indexOf('--token');
  const val = i !== -1 ? (args[i + 1] ?? '').toLowerCase() : null;
  if (val && !Object.keys(TOKEN_KEYS).includes(val)) {
    console.error(`Error: --token expects one of: ${Object.keys(TOKEN_KEYS).join(' | ')} (got "${args[i + 1] ?? ''}")`);
    process.exit(1);
  }
  return args.includes('--rubis') ? 'rubis' : val; // null → default (opec, then rubis)
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--export-army') ? 'export-army' : args.includes('--json') ? 'json' : 'summary';

  const { token, source, account } = loadToken(parseAccount(args));
  console.error(`Using ${account} token from ${source}`);

  const { data, failed } = await fetchAll(token);
  if (failed.length) {
    console.error(`Warning: failed batches: ${failed.join(', ')}`);
  }
  if (Object.values(data).every((v) => v == null)) {
    console.error('Error: no data retrieved from any endpoint.');
    process.exit(1);
  }

  if (mode === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else if (mode === 'export-army') {
    const code = buildExportCode(data);
    console.error('\nPaste this code into the tool\'s Sync → Import field:\n');
    console.log(code);
  } else {
    printSummary(data);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
