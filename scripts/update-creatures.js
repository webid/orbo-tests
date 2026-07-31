const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ═══════════════════════════════════════════════════════════════════════════
// Regenerates app/src/orbo-creatures.json from the raw game creature arrays
// using the exact formulas from the game bundle (verified July 2026):
//
//   tier order (index 0-10): common, uncommon, scarce, rare, esoteric, mythic,
//                            relic, untouched, phaseBound, lightSworn, voidBorn
//
//   foodCost(L, tier)  = floor(35 * 1.25^(L-1) * 3.5^tier)
//   tierBaseDps(tier)  = round(1.82 * 3^tier) * 0.55
//                        (the game rounds 1.82 * 3^tier to an integer BEFORE
//                         applying the global allDps multiplier 0.55 — this
//                         gives 1.10, 2.75, 8.80, 26.95, 80.85, 243.10, ...)
//   bonus(L)           = 1 + (L-1)*0.25 + evolution bonuses for completed
//                        stages: [2.25, 6.0, 12.25] (from evolveDpsMultipliers
//                        [10, 25, 50]: 0.25 * (mult - 1))
//   dps(L)             = round(tierBaseDps * dpsMultiplier * bonus(L) * 100)/100
//
//   80 levels, 4 stages of 20; evolution flags on the first level of stages
//   2/3/4 (levels 21/41/61); evolveFoodCost = foodCost * 2.
//
// Usage: paste the raw game creature arrays (the "let o = [...]" tier arrays
// from the creatures chunk, e.g. 451-*.js) into scripts/new-game-data.txt,
// then run:  node scripts/update-creatures.js
// ═══════════════════════════════════════════════════════════════════════════

const TIER_ORDER = [
  'common', 'uncommon', 'scarce', 'rare', 'esoteric', 'mythic',
  'relic', 'untouched', 'phaseBound', 'lightSworn', 'voidBorn',
];
const TIER_INDEX = Object.fromEntries(TIER_ORDER.map((t, i) => [t, i]));

const MAX_LEVEL = 80;
const LEVELS_PER_STAGE = 20;
const FOOD_BASE = 35;
const FOOD_SCALE = 1.25;
const TIER_FOOD_MULT = 3.5;
const STAT_BONUS_PER_LEVEL = 0.25;
const EVOLVE_FOOD_MULTIPLIER = 2;
const EVOLVE_DPS_MULTIPLIERS = [10, 25, 50];
const BASE_DPS = 1.82;
const TIER_MULTIPLIER = 3;
const ALL_DPS = 0.55;

// ── 1. Load and parse raw input ───────────────────────────────────────────────
// Reads scripts/new-game-data.txt — paste the raw game JS data there as-is.
const TXT_PATH = path.join(__dirname, 'new-game-data.txt');
const rawText = fs.readFileSync(TXT_PATH, 'utf8').trim();

if (!rawText.startsWith('[')) {
  console.log('⚠️  new-game-data.txt has not been filled in yet.');
  console.log('   Paste the raw game creature arrays into scripts/new-game-data.txt and re-run.');
  console.log('   Usage: node scripts/update-creatures.js');
  process.exit(0);
}

// The raw game format starts with a bare array, followed by ", varName = [...]"
// for each subsequent tier. Prepending a variable assignment makes it all valid JS
// so vm can evaluate it and capture every array.
const code = 'var __t0 = ' + rawText;

let gameData;
try {
  const sandbox = {};
  vm.runInNewContext(code, sandbox);
  // Collect all array values from the sandbox, flatten, and filter to creature objects
  gameData = Object.values(sandbox)
    .filter(v => Array.isArray(v))
    .flat()
    .filter(c => c && typeof c === 'object' && c.key && c.tier);
} catch (err) {
  console.error('✗ Failed to parse new-game-data.txt:', err.message);
  console.error('  Make sure you pasted the raw game data and saved the file.');
  process.exit(1);
}

if (gameData.length === 0) {
  console.log('⚠️  new-game-data.txt appears empty or unrecognised.');
  console.log('   Paste the raw game creature arrays into scripts/new-game-data.txt and re-run.');
  process.exit(0);
}

// ── 2. Load existing JSON (for metadata preservation + change reporting) ─────
const JSON_PATH = path.join(__dirname, '../app/src/orbo-creatures.json');
const existing = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const existingByKey = Object.fromEntries(existing.map(c => [c.key, c]));

console.log('Existing creatures :', existing.length);
console.log('Input creatures    :', gameData.length);

// ── 3. Level generation (exact game formulas) ─────────────────────────────────
function foodCost(level, tierIdx) {
  return Math.floor(FOOD_BASE * Math.pow(FOOD_SCALE, level - 1) * Math.pow(TIER_FOOD_MULT, tierIdx));
}

function tierBaseDps(tierIdx) {
  return Math.round(BASE_DPS * Math.pow(TIER_MULTIPLIER, tierIdx)) * ALL_DPS;
}

function levelBonus(level) {
  const completedStages = Math.floor((level - 1) / LEVELS_PER_STAGE);
  let evoBonus = 0;
  for (let s = 0; s < completedStages; s++) {
    evoBonus += STAT_BONUS_PER_LEVEL * (EVOLVE_DPS_MULTIPLIERS[s] - 1);
  }
  return 1 + (level - 1) * STAT_BONUS_PER_LEVEL + evoBonus;
}

function dps(level, tierIdx, dpsMultiplier) {
  return Math.round(tierBaseDps(tierIdx) * dpsMultiplier * levelBonus(level) * 100) / 100;
}

function generateLevels(tierIdx, dpsMultiplier) {
  const levels = [];
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const food = foodCost(level, tierIdx);
    const entry = {
      level,
      stage: Math.floor((level - 1) / LEVELS_PER_STAGE) + 1,
      foodCost: food,
      dps: dps(level, tierIdx, dpsMultiplier),
    };
    // Evolution flag on the first level of stages 2/3/4 (21/41/61)
    if (level > 1 && (level - 1) % LEVELS_PER_STAGE === 0) {
      entry.evolution = true;
      entry.evolveFoodCost = food * EVOLVE_FOOD_MULTIPLIER;
    }
    levels.push(entry);
  }
  return levels;
}

// ── 4. Build full roster from game data ───────────────────────────────────────
let bioUpdates = 0;
let multiplierUpdates = 0;
let dpsCorrections = 0;
const newCreatures = [];

console.log('\n── New creatures ─────────────────────────────────────────────────────────');

const merged = gameData.map(game => {
  const tierIdx = TIER_INDEX[game.tier];
  if (tierIdx === undefined) {
    console.error('  ✗ Unknown tier: ' + game.tier + ' (' + game.key + ')');
    process.exit(1);
  }

  const prev = existingByKey[game.key];
  const levels = generateLevels(tierIdx, game.dpsMultiplier);

  if (!prev) {
    newCreatures.push(game);
    console.log('  + ' + game.tier + '/' + game.key + '  (mult: ' + game.dpsMultiplier + ')');
  } else {
    if (Math.abs(prev.baseDpsMultiplier - game.dpsMultiplier) > 0.0001) multiplierUpdates++;
    if (game.bio && !prev.bio) bioUpdates++;
    if (prev.levels.some((lvl, i) => lvl.dps !== levels[i].dps || lvl.foodCost !== levels[i].foodCost)) dpsCorrections++;
  }

  return {
    key: game.key,
    name: game.name,
    tier: game.tier,
    aspect: game.aspect,
    baseDpsMultiplier: game.dpsMultiplier,
    image: prev ? prev.image : 'base.png',
    levels,
    bio: game.bio || (prev && prev.bio) || '',
  };
}).sort((a, b) => a.key.localeCompare(b.key));

if (newCreatures.length === 0) console.log('  (none)');

// ── 5. Report changes ─────────────────────────────────────────────────────────
console.log('\n── Changed creatures ─────────────────────────────────────────────────────');
for (const c of merged) {
  const prev = existingByKey[c.key];
  if (!prev) continue;
  if (Math.abs(prev.baseDpsMultiplier - c.baseDpsMultiplier) > 0.0001) {
    console.log(
      '  ~ ' + c.key + ': mult ' + prev.baseDpsMultiplier + ' → ' + c.baseDpsMultiplier +
      '  (L1 dps ' + prev.levels[0].dps + ' → ' + c.levels[0].dps + ')'
    );
  }
}
if (multiplierUpdates === 0) console.log('  (none)');

const removed = existing.filter(c => !gameData.some(g => g.key === c.key));
if (removed.length > 0) {
  console.log('\n⚠️  Creatures in existing JSON but missing from game data (dropped):');
  removed.forEach(c => console.log('  - ' + c.key));
}

console.log('\nNew creatures      :', newCreatures.length);
console.log('Multiplier updates :', multiplierUpdates);
console.log('Bio backfills      :', bioUpdates);
console.log('Level-data diffs   :', dpsCorrections, '(creatures whose regenerated levels differ from stored)');
console.log('Total creatures    :', merged.length);

// ── 6. Validate ───────────────────────────────────────────────────────────────
const issues = [];
for (const c of merged) {
  if (c.levels.length !== MAX_LEVEL) issues.push(c.key + ': wrong level count ' + c.levels.length);
  const evos = c.levels.filter(l => l.evolution);
  if (evos.length !== 3) issues.push(c.key + ': wrong evo count');
  if (evos.some(l => ![21, 41, 61].includes(l.level))) issues.push(c.key + ': evo at wrong level');
  for (let i = 1; i < c.levels.length; i++) {
    if (c.levels[i].dps <= c.levels[i - 1].dps) { issues.push(c.key + ': dps not increasing at L' + c.levels[i].level); break; }
  }
}
if (issues.length > 0) { console.error('\n✗ Validation failed:', issues); process.exit(1); }
console.log('Validation         : ✓ all creatures have 80 levels, 3 evolutions (21/41/61), increasing dps');

// ── 7. Write ──────────────────────────────────────────────────────────────────
fs.writeFileSync(JSON_PATH, JSON.stringify(merged));
console.log('\n✓ Written to app/src/orbo-creatures.json');
