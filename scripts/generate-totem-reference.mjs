// Generates app/public/totem-reference.html — a plain, self-contained HTML
// page listing every totem card (name, category, lore blurb and effects)
// with no interactive UI, so it can be run through Google Translate etc.
//
// Run from the repo root:  node scripts/generate-totem-reference.mjs
//
// NOTE: the effect labels/formatting and tier/lane constants below are
// duplicated from app/src/data.ts and app/src/utils.ts (this script cannot
// import them — data.ts uses bare JSON imports that Node ESM rejects).
// app/src/__tests__/totem-reference.test.ts fails if the generated page
// drifts from the app's real formatTotemEffect output, so after changing
// totem data or effect labels, re-run this script.
import fs from 'node:fs';

const totems = JSON.parse(
  fs.readFileSync(new URL('../app/src/orbo-totems.json', import.meta.url), 'utf8')
);

// --- display constants (keep in sync with app/src/data.ts) -----------------
const TIER_NAMES = { 1: 'Weak', 2: 'Lesser', 3: 'Rare', 4: 'Mighty', 5: 'Legendary', 6: 'Holy' };
const TIER_COLORS = { 1: '#888', 2: '#6b9', 3: '#69f', 4: '#c6f', 5: '#fa5', 6: '#ff5' };
const LANE_ORDER = { power: 1, energy: 2, tap: 3, economy: 4, idle: 5, descent: 6, orb: 7 };
const EFFECT_INFO = {
  orboDamageMult:        { label: 'Orbo Damage',         format: 'mult' },
  orboAttackSpeedMult:   { label: 'Attack Speed',        format: 'mult' },
  energyMaxMult:         { label: 'Energy Max',          format: 'mult' },
  energyRegenMult:       { label: 'Energy Regen',        format: 'mult' },
  freeTapChance:         { label: 'Free Tap Chance',     format: 'pct' },
  tapCritChance:         { label: 'Tap Crit Chance',     format: 'pct' },
  tapCritMultBonus:      { label: 'Tap Crit Mult',       format: 'flat' },
  apexOrboDamageMult:    { label: 'Apex Orbo Damage',    format: 'mult' },
  apexOrboCritChance:    { label: 'Apex Crit Chance',    format: 'pct' },
  apexOrboCritMult:      { label: 'Apex Crit Mult',      format: 'flat' },
  runtOrboDamageMult:    { label: 'Runt Orbo Damage',    format: 'mult' },
  runtOrboCritChance:    { label: 'Runt Crit Chance',    format: 'pct' },
  runtOrboCritMult:      { label: 'Runt Crit Mult',      format: 'flat' },
  rockCoinsMult:         { label: 'Rock Coins',          format: 'mult' },
  rockHpMult:            { label: 'Rock HP',             format: 'mult' },
  rockJackpotChance:     { label: 'Rock Jackpot',        format: 'pct' },
  energyPerRockBreak:    { label: 'Energy / Rock Break', format: 'flat' },
  idleCoinsMult:         { label: 'Idle Coins',          format: 'mult' },
  idleCapHoursBonus:     { label: 'Idle Cap',            format: 'hours' },
  descendOrbsBonus:      { label: 'Descend Orbs',        format: 'flat' },
  descendCoinFlipPayout: { label: 'Coin Flip Payout',    format: 'pct' },
  doubleDescendChance:   { label: 'Double Descend',      format: 'pct' },
};

// --- effect formatting (keep in sync with app/src/utils.ts) ----------------
const formatValue = (key, value) => {
  const fmt = EFFECT_INFO[key]?.format || 'flat';
  if (fmt === 'mult') return `\u00d7${Math.round(value * 100) / 100}`;
  if (fmt === 'pct') return `+${Math.round(value * 1000) / 10}%`;
  if (fmt === 'hours') return `+${value}h`;
  return `+${value}`;
};
const formatEffect = (e) => {
  if (!e.key && e.rush) {
    const rushLabel = e.rush === 'rockCoins' ? 'rock coins' : e.rush === 'rockHp' ? 'rock HP' : e.rush;
    return `Rush: ${rushLabel} \u00d7${e.value} for ${e.rocks} rocks`;
  }
  return `${EFFECT_INFO[e.key]?.label || e.key} ${formatValue(e.key, e.value)}`;
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// --- page -------------------------------------------------------------------
const sorted = [...totems].sort(
  (a, b) => a.tier - b.tier || (LANE_ORDER[a.lane] || 99) - (LANE_ORDER[b.lane] || 99)
);

const card = (t) => `      <article class="card">
        <div class="art" style="border-color:${TIER_COLORS[t.tier]}40">
          <img src="https://playorbo.fun/game/totems/cards/thumbs/${esc(t.key)}.png" alt="${esc(t.name)}" loading="lazy" onerror="this.style.display='none'" />
        </div>
        <div class="body">
          <h3><span class="dot" style="background:${TIER_COLORS[t.tier]}"></span>${esc(t.name)} <span class="lane">${esc(t.lane)}</span></h3>
${t.blurb ? `          <p class="blurb">\u201c${esc(t.blurb)}\u201d</p>\n` : ''}          <ul class="effects">
${t.effects.map(e => `            <li>${esc(formatEffect(e))}</li>`).join('\n')}
          </ul>
        </div>
      </article>`;

let sections = '';
for (const tier of [1, 2, 3, 4, 5, 6]) {
  const items = sorted.filter(t => t.tier === tier);
  if (!items.length) continue;
  sections += `    <section class="tier">
      <h2 style="color:${TIER_COLORS[tier]}">Tier ${tier} \u2014 ${TIER_NAMES[tier]}</h2>
${items.map(card).join('\n')}
    </section>
`;
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Orbo Totem Reference \u2014 Orbo Command Center</title>
  <meta name="description" content="Complete list of all ${totems.length} Orbo totem cards: names, categories, lore and effects." />
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #0a0a0a; color: #ededed; font: 15px/1.5 system-ui, -apple-system, sans-serif; }
    main { max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    .intro { color: #888; font-size: 13px; margin: 0 0 28px; }
    .intro a { color: #888; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #222; padding-bottom: 6px; margin: 32px 0 12px; }
    .card { display: flex; gap: 14px; align-items: flex-start; background: #111; border: 1px solid #222; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
    .art { flex: 0 0 88px; width: 88px; height: 88px; border-radius: 6px; border: 1px solid #333; background: #161616; overflow: hidden; }
    .art img { width: 100%; height: 100%; object-fit: contain; }
    .body { min-width: 0; }
    h3 { font-size: 15px; margin: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .lane { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 999px; padding: 2px 8px; }
    .blurb { color: #888; font-style: italic; margin: 6px 0 0; }
    .effects { margin: 8px 0 0; padding: 0; list-style: none; }
    .effects li { font-size: 13px; font-family: ui-monospace, monospace; color: #7ee2a8; opacity: 0.85; }
  </style>
</head>
<body>
  <main>
    <h1>Orbo Totem Reference</h1>
    <p class="intro">All ${totems.length} totem cards \u2014 name, category, lore and effects. <a href="./">Back to Orbo Command Center</a></p>
${sections}  </main>
</body>
</html>
`;

fs.writeFileSync(new URL('../app/public/totem-reference.html', import.meta.url), html);
console.log(`wrote app/public/totem-reference.html (${totems.length} totems)`);
