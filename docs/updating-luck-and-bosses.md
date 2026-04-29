# Updating Luck Costs / Spawn Rates and Boss HP

Two JSON files hold the data used by the tool's luck table and boss calculator:

| File | Contents |
|---|---|
| `app/src/orbo-luck.json` | Cost and spawn-rate table for luck levels 1–99 |
| `app/src/orbo-bosses.json` | HP (and other fields) for every boss |

Both are derived from constants in the game's bundled JS. When the game updates these constants, the JSONs need regenerating.

---

## Where to Find the Source Values

Open the game's main JS bundle and search for `luckUpgradeCosts`. The relevant block looks like:

```js
luckUpgradeCosts: [60, 100, 250, ...],
luckCostScale: 1.18,
```

For bosses, search for `minDpsMilestones`:

```js
minDpsMilestones: [30, 300, 800, 1500, ...],
minDpsFallbackMultiplier: 1.4,
baseTimerSeconds: 30,
```

For spawn rates, search for `spawnRateMilestones` and `tierUnlockLevels`.

---

## Luck Costs (`orbo-luck.json` — `cost` field)

### Formula

- **Level 1**: cost = 0
- **Levels 2–32**: cost = `luckUpgradeCosts[level − 2]` (the array has 31 entries, indices 0–30)
- **Levels 33+**: cost = `round(luckUpgradeCosts[30] × luckCostScale ^ (level − 32))`

### Example (current values)

```
luckUpgradeCosts[30] = 75,000,000
luckCostScale = 1.18

Level 33 = round(75e6 × 1.18^1) = 88,500,000
Level 51 = round(75e6 × 1.18^19) ≈ 1,741,082,708  (~1.74bn)
```

### What to Check When Updating

1. Has the `luckUpgradeCosts` array changed? (length or values)
2. Has `luckCostScale` changed?
3. Spot-check a high level in-game (e.g. the "next upgrade" cost shown at the bottom of the luck UI) to confirm the formula still holds.

---

## Luck Spawn Rates (`orbo-luck.json` — `spawnRates` field)

### Formula

The game defines spawn rates at **milestone levels** (1, 2, 3, 5, 6, 8, 9, 10, 12, 13, 20, 23, 30, 38, 45, 60, 75, 90, 99) via `spawnRateMilestones`. Between milestones, each tier's rate is **linearly interpolated**.

Additionally, `tierUnlockLevels` defines when each tier becomes available:

| Tier | Unlocks at |
|---|---|
| common | 1 |
| uncommon | 2 |
| scarce | 3 |
| rare | 5 |
| esoteric | 6 |
| mythic | 9 |
| relic | 13 |
| untouched | 20 |
| phaseBound | 28 |
| lightSworn | 36 |
| voidBorn | 44 |

Before a tier is unlocked, its interpolated rate is set to **0** and added to **common**.

### Interpolation Pseudocode

```python
def interpolate(tier, level):
    low, high = bracket(level, milestone_levels)
    t = (level - low) / (high - low)
    return rate(tier, low) + t * (rate(tier, high) - rate(tier, low))

def spawn_rates(level):
    rates = {tier: interpolate(tier, level) for tier in ALL_TIERS}
    for tier in ALL_TIERS:
        if level < tierUnlockLevels[tier]:
            rates["common"] += rates[tier]
            rates[tier] = 0
    return rates
```

### What to Check When Updating

1. Has `spawnRateMilestones` changed? (new milestones, changed values, new tiers)
2. Has `tierUnlockLevels` changed?
3. Spot-check 2–3 levels against the in-game luck UI (it shows current → next level rates side by side).

---

## Boss HP (`orbo-bosses.json` — `hp` field)

### Formula

```
hp = round(minDps) × baseTimerSeconds
```

Where `minDps` for boss N is:
- **Boss 1–13**: `minDpsMilestones[N − 1]` (the array has 13 entries)
- **Boss 14+**: `minDpsMilestones[12] × minDpsFallbackMultiplier ^ (N − 13)`

**Important**: `round()` is applied to `minDps` **before** multiplying by the timer. This matters because floating-point `minDpsMilestones[12] × 1.4^N` produces values like `422575.9999…` which round differently depending on order of operations.

### Example (current values)

```
minDpsMilestones[12] = 110,000
minDpsFallbackMultiplier = 1.4
baseTimerSeconds = 30

Boss 17: round(110000 × 1.4^4) = round(422575.999…) = 422576 → × 30 = 12,677,280
Boss 18: round(110000 × 1.4^5) = round(591606.399…) = 591606 → × 30 = 17,748,180
```

### What to Check When Updating

1. Has `minDpsMilestones` changed? (length or values)
2. Has `minDpsFallbackMultiplier` changed?
3. Has `baseTimerSeconds` changed?
4. Spot-check a boss HP in-game to confirm (boss HP is shown during the fight).

### Other Boss Fields

The `minDps`, `timer`, `gold`, and `rocks` fields in the JSON are not currently used by the tool's calculator — only `hp` matters. They can be left as-is or updated separately if needed.

---

## LocalStorage Sync

When boss HP values change, returning users would see stale HP from their localStorage. This is handled automatically: `App.tsx` syncs `bossEnergy` from the current `bossesData` at load time using the saved `bossNumber`. No manual action needed — users get the updated HP on their next page load.

---

## Quick-Reference: Regeneration Commands

If you have the source constants ready, you can regenerate both files with Python one-liners from the repo root:

### Luck costs

```python
python3 -c "
import json
costs = [60, 100, 250, 600, 1500, 2e3, 12e3, 3e4, 65e3, 12e4, 22e4, 35e4, 5e5, 75e4, 12e5, 2e6, 3e6, 45e5, 75e5, 7e6, 85e5, 105e5, 13e6, 16e6, 2e7, 25e6, 31e6, 39e6, 49e6, 61e6, 75e6]
scale = 1.18
with open('app/src/orbo-luck.json') as f: levels = json.load(f)
for e in levels:
    l = e['level']
    e['cost'] = 0 if l == 1 else int(costs[l-2]) if l <= 32 else round(75e6 * scale**(l-32))
with open('app/src/orbo-luck.json','w') as f: json.dump(levels, f, indent=2)
print('Done')
"
```

### Boss HP

```python
python3 -c "
import json
ms = [30,300,800,1500,2500,4500,8500,17e3,3e4,5e4,65e3,85e3,11e4]
mult, timer = 1.4, 30
with open('app/src/orbo-bosses.json') as f: bosses = json.load(f)
for b in bosses:
    n = b['bossNumber']
    dps = ms[n-1] if n <= 13 else ms[12] * mult**(n-13)
    b['hp'] = round(dps) * timer
with open('app/src/orbo-bosses.json','w') as f: json.dump(bosses, f, indent=2)
print('Done')
"
```
