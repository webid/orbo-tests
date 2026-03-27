const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

// ── 2. Load existing JSON (single source of truth) ───────────────────────────
const JSON_PATH = path.join(__dirname, '../app/src/orbo-creatures.json');
const existing = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const existingKeys = new Set(existing.map(c => c.key));

console.log('Existing creatures :', existing.length);
console.log('Input creatures    :', gameData.length);

// ── 3. Build tier templates (first creature of each tier as DPS reference) ───
const templates = {};
for (const c of existing) {
  if (!templates[c.tier]) templates[c.tier] = c;
}

// ── 4. Level generation ───────────────────────────────────────────────────────
function generateLevels(newCreature, template) {
  const ratio = newCreature.dpsMultiplier / template.baseDpsMultiplier;
  return template.levels.map(level => {
    const entry = {
      level: level.level,
      stage: level.stage,
      foodCost: level.foodCost,
      dps: Math.round(level.dps * ratio * 100) / 100,
    };
    if (level.evolution) {
      entry.evolution = true;
      entry.evolveFoodCost = level.evolveFoodCost;
    }
    return entry;
  });
}

// ── 5. Detect new creatures ───────────────────────────────────────────────────
const gameDataMap = Object.fromEntries(gameData.map(c => [c.key, c]));
const missing = gameData.filter(c => !existingKeys.has(c.key));

console.log('\n── New creatures (' + missing.length + ') ──────────────────────────────────────');
if (missing.length === 0) {
  console.log('  (none)');
} else {
  missing.forEach(c => console.log('  + ' + c.tier + '/' + c.key + '  (mult: ' + c.dpsMultiplier + ')'));
}

// ── 6. Build entries for new creatures ────────────────────────────────────────
const newEntries = missing.map(c => {
  const template = templates[c.tier];
  if (!template) { console.error('  ✗ No tier template for: ' + c.tier); return null; }
  return {
    key: c.key,
    name: c.name,
    tier: c.tier,
    aspect: c.aspect,
    baseDpsMultiplier: c.dpsMultiplier,
    image: 'base.png',
    bio: c.bio || '',
    levels: generateLevels(c, template),
  };
}).filter(Boolean);

// ── 7. Update existing creatures (multiplier changes + missing bios) ──────────
let bioUpdates = 0;
let multiplierUpdates = 0;

console.log('\n── Changed creatures ─────────────────────────────────────────────────────');

const updated = existing.map(c => {
  const game = gameDataMap[c.key];
  if (!game) return c;

  const changed = { ...c };

  // dpsMultiplier changed → recalculate all 80 DPS values from tier template
  const oldMult = c.baseDpsMultiplier;
  const newMult = game.dpsMultiplier;
  if (Math.abs(oldMult - newMult) > 0.0001) {
    const template = templates[c.tier];
    if (template) {
      const newLevels = generateLevels({ dpsMultiplier: newMult }, template);
      changed.baseDpsMultiplier = newMult;
      changed.levels = c.levels.map((lvl, i) => ({ ...lvl, dps: newLevels[i].dps }));
      multiplierUpdates++;
      console.log(
        '  ~ ' + c.key + ': mult ' + oldMult + ' → ' + newMult +
        '  (L1 dps ' + c.levels[0].dps + ' → ' + newLevels[0].dps + ')'
      );
    }
  }

  // Backfill missing bio
  if (game.bio && !c.bio) {
    changed.bio = game.bio;
    bioUpdates++;
  }

  return changed;
});

if (multiplierUpdates === 0) console.log('  (none)');
console.log('\nMultiplier updates :', multiplierUpdates);
console.log('Bio backfills      :', bioUpdates);

// ── 8. Merge, sort, validate ──────────────────────────────────────────────────
const merged = [...updated, ...newEntries].sort((a, b) => a.key.localeCompare(b.key));
console.log('Total creatures    :', merged.length);

const issues = [];
for (const c of merged) {
  if (c.levels.length !== 80) issues.push(c.key + ': wrong level count ' + c.levels.length);
  if (c.levels.filter(l => l.evolution).length !== 3) issues.push(c.key + ': wrong evo count');
}
if (issues.length > 0) { console.error('\n✗ Validation failed:', issues); process.exit(1); }
console.log('Validation         : ✓ all creatures have 80 levels and 3 evolutions');

// ── 9. Write ──────────────────────────────────────────────────────────────────
fs.writeFileSync(JSON_PATH, JSON.stringify(merged));
console.log('\n✓ Written to app/src/orbo-creatures.json');
