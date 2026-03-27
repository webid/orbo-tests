# Updating `orbo-creatures.json` with New Game Creatures

The single source of truth for creature data is **`app/src/orbo-creatures.json`**.  
The root-level copy was removed — only `app/src` matters.

---

## How to Run an Update

### 1. Paste new game data

Open **`scripts/new-game-data.txt`** and replace its contents with the raw creature arrays copied from the game JS — exactly as they appear, without any cleanup:

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

The script handles the `, varName = [...]` format automatically — all tiers are parsed and merged.

### 2. Run the script

```bash
node scripts/update-creatures.js
```

### 3. Review the output

The script reports three things:

| Section | What it means |
|---|---|
| `New creatures` | Keys not yet in the JSON — will be generated and added |
| `Changed creatures` | Existing creatures whose `dpsMultiplier` changed — DPS levels recalculated |
| `Bio backfills` | Existing creatures that were missing a bio — filled in |

Example output:
```
Existing creatures : 158
Input creatures    : 172

── New creatures (3) ───────────────────────────────────────
  + scarce/eagle  (mult: 1.06)
  + mythic/zodiac-crane  (mult: 0.9)
  + esoteric/ash-hound  (mult: 1.15)

── Changed creatures ─────────────────────────────────────────────────────
  ~ boar: mult 0.5 → 0.55  (L1 dps 4.4 → 4.84)

Multiplier updates : 1
Bio backfills      : 0
Total creatures    : 161
Validation         : ✓ all creatures have 80 levels and 3 evolutions

✓ Written to app/src/orbo-creatures.json
```

### 4. Clear the input file

After running, you can leave `new-game-data.js` as-is (the script ignores unchanged creatures) or wipe it back to the empty template for cleanliness.

---

## How Values Are Calculated

### Food Costs

Food costs are **identical for all creatures of the same tier** and are copied directly from the tier template. They grow ~×1.25 per level. Evolution levels (21, 41, 61) carry an extra `evolveFoodCost = foodCost × 2`.

### DPS

DPS scales linearly with `dpsMultiplier`. For a new creature `N` using tier template `T`:

```
newDps[level] = templateDps[level] × (N.dpsMultiplier / T.baseDpsMultiplier)
```

### Base DPS Reference (L1, multiplier = 1.0)

| Tier | ~L1 DPS |
|---|---|
| common | 1.10 |
| uncommon | 2.75 |
| scarce | 8.80 |
| rare | 26.95 |
| esoteric | 80.86 |
| mythic | 243.10 |
| relic | 729.85 |
| untouched | 2,189 |
| phaseBound | 6,567 |
| lightSworn | 19,703 |
| voidBorn | 59,108 |

Each tier is roughly **×3** the previous.

---

## Notes

- `image` is always `"base.png"` for new creatures until stage-specific art is confirmed.
- Image URLs are resolved at runtime via `getCreatureImageUrl()` in `App.tsx` — no code changes needed for new creatures in existing tiers.
- If the game adds a **new tier**, add it to the `tierMap` in `getCreatureImageUrl()` in `App.tsx` and add a template entry to `orbo-creatures.json` manually before running the script.
- Tier colors used in the UI are defined in `TIER_COLORS` at the top of `App.tsx`.
