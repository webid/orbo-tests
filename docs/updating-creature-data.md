# Updating `orbo-creatures.json` with New Game Creatures

This document explains the methodology used to detect new creatures added by the game and calculate their missing `foodCost` and `dps` values for inclusion in `orbo-creatures.json`.

---

## Overview

The game's source JS exposes creature definitions grouped by tier (arrays `a`, `s`, `l`, `c`, `p`, `d`, `h`, `m`, `u`). These only include:
- `key`, `name`, `tier`, `aspect`, `dpsMultiplier`, `bio`

They do **not** include `foodCost` or `dps`. These must be derived from the existing data in `orbo-creatures.json`.

---

## Step 1 — Detect New Creatures

Compare the `key` values from the game's JS against every `key` already present in `orbo-creatures.json`.

```js
const fs = require('fs');
const existing = JSON.parse(fs.readFileSync('app/src/orbo-creatures.json', 'utf8'));
const existingKeys = new Set(existing.map(c => c.key));

const newGameCreatures = [ /* paste the array from the game JS here */ ];
const missing = newGameCreatures.filter(c => !existingKeys.has(c.key));
console.log('New creatures:', missing.map(c => c.key));
```

---

## Step 2 — Understand the Data Model

Each creature in `orbo-creatures.json` has:
- **80 levels** across **4 stages** (1–20, 21–40, 41–60, 61–80).
- Levels 21, 41, and 61 are **evolution levels** with `evolution: true` and an `evolveFoodCost`.

### Food Costs

Food costs are **identical for all creatures within the same tier**. They don't vary by `dpsMultiplier`. So any existing creature from the same tier can serve as a template.

Food costs grow by approximately **×1.25 per level** within each stage. Evolution levels carry an `evolveFoodCost = foodCost × 2`.

### DPS Values

DPS scales **linearly** with the `dpsMultiplier` ratio. For a new creature `N` and any template creature `T` from the same tier:

```
newDps[level] = templateDps[level] × (N.dpsMultiplier / T.baseDpsMultiplier)
```

This was verified by comparing, for example, `bear` (scarce, multiplier 1.0) and `boar` (scarce, multiplier 0.5) — every level's DPS has exactly a 2× ratio.

### Base DPS per Tier (at level 1, multiplier = 1.0)

| Tier | Base L1 DPS |
|------|------------|
| common | ~1.10 |
| uncommon | ~2.75 |
| scarce | ~8.80 |
| rare | ~26.95 |
| esoteric | ~80.86 |
| mythic | ~243.10 |
| relic | ~729.85 |
| untouched | ~2,189 |
| phaseBound | ~6,567 |
| lightSworn | ~19,703 |
| voidBorn | ~59,108 |

Each tier is roughly **×3** the previous, matching the game's tier power curve.

---

## Step 3 — Generate the Missing Levels

Pick any existing creature from the same tier as the template. Scale all its DPS values by the multiplier ratio. Keep food costs identical.

```js
function generateCreatureLevels(newCreature, template) {
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

// Build and merge
const newEntries = missingCreatures.map(c => ({
  key: c.key,
  name: c.name,
  tier: c.tier,
  aspect: c.aspect,
  baseDpsMultiplier: c.dpsMultiplier,
  image: 'base.png',
  bio: c.bio || '',
  levels: generateCreatureLevels(c, templatePerTier[c.tier]),
}));

const merged = [...existing, ...newEntries].sort((a, b) => a.key.localeCompare(b.key));
fs.writeFileSync('app/src/orbo-creatures.json', JSON.stringify(merged));
```

---

## Step 4 — Spot-Check

Verify a sample of new creatures:

1. **Food costs** for a new creature should match an existing creature of the same tier exactly.
2. **DPS at L1** should equal `templateL1dps × (newMult / templateMult)`.
3. **Level count** should be exactly 80 with 3 evolution entries.

```js
const updated = JSON.parse(fs.readFileSync('app/src/orbo-creatures.json', 'utf8'));
for (const c of updated) {
  if (c.levels.length !== 80) console.error(c.key, 'wrong level count');
  if (c.levels.filter(l => l.evolution).length !== 3) console.error(c.key, 'wrong evolution count');
}
```

---

## Notes

- The `image` field should always be `"base.png"` for new creatures until stage-specific art is confirmed.
- The `bio` field comes directly from the game JS definition.
- After updating the JSON, the app's image URLs are resolved via `getCreatureImageUrl()` in `App.tsx`, which uses the tier-to-folder mapping — no changes needed there for new creatures in existing tiers.
- If a **new tier** is added by the game, a new entry must be added to the `tierMap` in `getCreatureImageUrl()` in `App.tsx`.
