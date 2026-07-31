// One-off extraction script: pulls ring + totem catalogs out of the
// playorbo.fun webpack chunks and writes app/src/orbo-rings.json and
// app/src/orbo-totems.json. Not part of the app build.
import { readFileSync, writeFileSync } from 'node:fs';

const CHUNKS = '/Users/opeculiar/Downloads/TEZCUP2026_ZUCKERPASS/playorbo.fun/_next/static/chunks';
const OUT = '/Users/opeculiar/work/orbo-tests/app/src';

// Bracket-match an array literal starting at `start` (index of '[').
function sliceArray(src, start) {
  let depth = 0, inStr = null;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error('unbalanced array');
}

// NOTE: Evaluates array literals from the local game bundle snapshot.
// This script is a dev-time tool, not part of any runtime or build pipeline.
function evalArray(literal) {
  return new Function(`"use strict"; return (${literal});`)();
}

// ---- Rings (chunk 464, module 97738, array `r`) ----
const ringsSrc = readFileSync(`${CHUNKS}/464-29ceee808f21a1d6.js`, 'utf8');
const ringsModIdx = ringsSrc.indexOf('97738: (e, t, a)');
const ringsArrIdx = ringsSrc.indexOf('let r = [', ringsModIdx);
const rings = evalArray(sliceArray(ringsSrc, ringsSrc.indexOf('[', ringsArrIdx)));

const toDisplayName = (key) =>
  key.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

const ringsOut = rings.map((r) => ({
  key: r.key,
  name: toDisplayName(r.key),
  rarity: r.rarity,
  flatDamage: r.stats.flatDamage ?? 0,
  orboDpsMultiplier: r.stats.orboDpsMultiplier ?? 0,
}));

// ---- Totems (chunk 4922, module 94146, array `l`) ----
const totemSrc = readFileSync(`${CHUNKS}/4922-d36999e570519db3.js`, 'utf8');
const totemModIdx = totemSrc.indexOf('94146: (e, t, a)');
const numeralFix = totemSrc.replace(/numeral: o\.(I+)/g, 'numeral: "$1"');
const totemArrIdx = numeralFix.indexOf('l = [', totemModIdx);
const totems = evalArray(sliceArray(numeralFix, numeralFix.indexOf('[', totemArrIdx)));

const totemsOut = totems.map((t) => ({
  key: t.key,
  name: t.name,
  tier: t.tier,
  rarityName: t.rarityName,
  lane: t.lane,
  effects: t.effects,
  visual: t.visual,
}));

writeFileSync(`${OUT}/orbo-rings.json`, JSON.stringify(ringsOut, null, 2) + '\n');
writeFileSync(`${OUT}/orbo-totems.json`, JSON.stringify(totemsOut, null, 2) + '\n');

// ---- Report ----
const byRarity = {};
for (const r of ringsOut) byRarity[r.rarity] = (byRarity[r.rarity] ?? 0) + 1;
const byTier = {};
for (const t of totemsOut) byTier[t.tier] = (byTier[t.tier] ?? 0) + 1;
const byLane = {};
for (const t of totemsOut) byLane[t.lane] = (byLane[t.lane] ?? 0) + 1;
console.log('rings:', ringsOut.length, byRarity);
console.log('totems:', totemsOut.length, 'tiers:', byTier, 'lanes:', byLane);
console.log('effect keys:', [...new Set(totemsOut.flatMap((t) => t.effects.map((e) => e.key ?? `rush:${e.rush}`)))].join(', '));
