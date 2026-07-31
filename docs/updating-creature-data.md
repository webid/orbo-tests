# Updating `orbo-creatures.json` with New Game Creatures

The single source of truth for creature data is **`app/src/orbo-creatures.json`**.  
The root-level copy was removed — only `app/src` matters.

---

## How to Run an Update

### 1. Paste new game data

Find the creature arrays in the game's bundled JS (as of July 2026: `_next/static/chunks/451-0752ded5df7671f9.js`, the `let o = [...]` statement with one array per tier). Open **`scripts/new-game-data.txt`** and replace its contents with the raw creature arrays copied from the game JS — exactly as they appear, without any cleanup:

```
[{
    key: "eagle",
    tier: "scarce",
    ...
}]
, o = [{
    key: "axolotl",
    ...
}]
, a = [{ ... }]
```

The script handles the `, varName = [...]` format automatically — all tiers are parsed and merged. Only paste the 11 tier arrays; stop before the combined `b = [...o, ...a, ...]` array that follows them.

### 2. Run the script

```bash
node scripts/update-creatures.js
```

### 3. Review the output

The script reports:

| Section | What it means |
|---|---|
| `New creatures` | Keys not yet in the JSON — generated and added |
| `Changed creatures` | Existing creatures whose `dpsMultiplier` changed |
| `Bio backfills` | Existing creatures that were missing a bio — filled in |
| `Level-data diffs` | Creatures whose regenerated levels differ from what was stored |

Example output:
```
Existing creatures : 158
Input creatures    : 182

── New creatures ─────────────────────────────────────────────────────────
  + voidBorn/void-hound  (mult: 1.2)

── Changed creatures ─────────────────────────────────────────────────────
  ~ abyss-walker: mult 0.5 → 1.2  (L1 dps 29553.98 → 70929.54)

New creatures      : 24
Multiplier updates : 6
Bio backfills      : 93
Level-data diffs   : 54 (creatures whose regenerated levels differ from stored)
Total creatures    : 182
Validation         : ✓ all creatures have 80 levels, 3 evolutions (21/41/61), increasing dps

✓ Written to app/src/orbo-creatures.json
```

### 4. Clear the input file

After running, you can leave `new-game-data.js` as-is (the script ignores unchanged creatures) or wipe it back to the empty template for cleanliness.

---

## How Values Are Calculated

All 80 levels are regenerated from the exact game formulas (verified against the live bundle, July 2026). Tier index runs 0–10 in order: common, uncommon, scarce, rare, esoteric, mythic, relic, untouched, phaseBound, lightSworn, voidBorn.

### Level Model

As of the July 2026 refresh the live bundle confirms **80 levels, 4 stages of 20, evolutions at 21/41/61** (`maxLevel: 80`, `levelsPerStage: 20` in the config chunk). An earlier analysis claimed a move to 100 levels / 25 per stage — that was disproven against the live bundle.

### Food Costs

Food costs are identical for all creatures of the same tier:

```
foodCost(level, tier) = floor(35 × 1.25^(level−1) × 3.5^tier)
```

Evolution levels (21, 41, 61) carry an extra `evolveFoodCost = foodCost × 2`.

### DPS

```
tierBaseDps(tier) = round(1.82 × 3^tier) × 0.55
bonus(level)      = 1 + (level−1) × 0.25 + evolution bonuses for completed stages
                    (stages give +2.25 / +6.0 / +12.25, from evolveDpsMultipliers [10, 25, 50]: 0.25 × (mult − 1))
dps(level)        = round(tierBaseDps × dpsMultiplier × bonus(level) × 100) / 100
```

**Rounding detail**: the game rounds `1.82 × 3^tier` to an integer **before** applying the global `allDps` multiplier 0.55. This is why the base DPS values below are not an exact ×3 progression (e.g. 8.80, not 9.90).

### Base DPS Reference (L1, multiplier = 1.0)

| Tier | L1 DPS |
|---|---|
| common | 1.10 |
| uncommon | 2.75 |
| scarce | 8.80 |
| rare | 26.95 |
| esoteric | 80.85 |
| mythic | 243.10 |
| relic | 729.85 |
| untouched | 2,189.00 |
| phaseBound | 6,567.55 |
| lightSworn | 19,702.65 |
| voidBorn | 59,107.95 |

---

## Notes

- `image` is always `"base.png"` for new creatures until stage-specific art is confirmed.
- Image URLs are resolved at runtime via `getCreatureImageUrl()` in `App.tsx` — no code changes needed for new creatures in existing tiers.
- If the game adds a **new tier**, add it to the `tierMap` in `getCreatureImageUrl()` in `App.tsx` and add a template entry to `orbo-creatures.json` manually before running the script.
- Tier colors used in the UI are defined in `TIER_COLORS` at the top of `App.tsx`.
