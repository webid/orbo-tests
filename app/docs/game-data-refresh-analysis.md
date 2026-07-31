# Game Data Refresh Analysis — playorbo.fun Snapshot vs Current Tool Data

**Date:** July 2026
**Scope:** Comparison of the current Orbo Command Center data files against a fresh static snapshot of `playorbo.fun` (Next.js build download at `/Users/opeculiar/Downloads/TEZCUP2026_ZUCKERPASS/playorbo.fun`), plus an API interaction reference derived from the `orbo-bot-go` project.

---

## Section 1: Current Tool State (orbo-tests)

The **Orbo Command Center** is a React 19 + TypeScript + Vite + Tailwind 4 battle calculator / creature planner for the Orbo game, deployed at <https://orbo.shadow.club/orbo/>. The main application code lives in `app/src/App.tsx` (~1,561 lines).

**Features:**

- Battle config panel (60 boss targets)
- 8-slot army builder
- Upgrade planner
- Creature explorer with comparison
- Luck table modal
- Base64 export/import of builds
- localStorage persistence with boss HP auto-sync
- Auto-update detection

### Data files (all in `app/src/`)

#### `orbo-creatures.json`

- **158 creatures**, 11 tiers.
- Per-creature fields: `key`, `name`, `tier`, `aspect`, `baseDpsMultiplier`, `image`, `bio`, and exactly **80 levels** (`level`, stage 1–4, `foodCost`, `dps`; evolution flags at levels **21/41/61** with `evolveFoodCost = 2x foodCost`).
- Tier counts:

| Tier | Count |
|---|---|
| common | 24 |
| uncommon | 24 |
| scarce | 12 |
| rare | 11 |
| esoteric | 21 |
| mythic | 28 |
| relic | 15 |
| untouched | 14 |
| **phaseBound** | **3** |
| **lightSworn** | **3** |
| **voidBorn** | **3** |

#### `orbo-bosses.json`

- 60 bosses, floors 10–600 in steps of 10.
- Fields: `bossNumber`, `floor`, `biome`, `biomeName`, `hp`, `minDps`, `timer` (30s), `gold`, `rocks`. Only `hp` / `bossNumber` / `timer` are actively used by the tool.
- Boss 60 HP: **24,351,830,754,810** (The Origin biome).
- Known biomes in the data: `grasslands`, `crystalcave`, `vortex`, `ashennecropolis`, `theorigin`.

#### `orbo-luck.json`

- 99 luck levels with `cost` + `spawnRates` per tier.
- Level 99 cost ≈ **4.91 trillion gold**.

### Tier base L1 DPS reference (at multiplier 1.0)

| Tier | Base L1 DPS |
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

Roughly **~3x per tier**. Food costs are identical within a tier, with **~1.25x growth per level**.

### Update tooling

`scripts/update-creatures.js` parses raw JS arrays pasted into `scripts/new-game-data.txt` (currently an empty template) and merges into the JSON with tier-template scaling:

```
newDps[level] = templateDps[level] × (dpsMultiplier / template.baseDpsMultiplier)
```

It reports new creatures / multiplier changes / bio backfills, and validates 80 levels + 3 evolutions per creature.

Docs in `docs/updating-creature-data.md` and `docs/updating-luck-and-bosses.md` document the formulas:

- **Luck cost:** level 1 = 0; levels 2–32 = `luckUpgradeCosts[level−2]` (31 entries); levels 33+ = `round(luckUpgradeCosts[30] × luckCostScale^(level−32))`. Current values: `luckUpgradeCosts[30] = 75,000,000`, `luckCostScale = 1.18`.
- **Boss HP:** `hp = round(minDps) × baseTimerSeconds (30)`; bosses 1–13 from `minDpsMilestones`; bosses 14+ = `minDpsMilestones[12] × 1.4^(N−13)`. Current `minDpsMilestones[12] = 110,000`.
- **Spawn rates:** linear interpolation between `spawnRateMilestones`; tiers locked below `tierUnlockLevels` get their rate folded into common. Tier unlocks: common 1, uncommon 2, scarce 3, rare 5, esoteric 6, mythic 9, relic 13, untouched 20, phaseBound 28, lightSworn 36, voidBorn 44.
- **New tier procedure:** add to `tierMap` in `getCreatureImageUrl()` in `App.tsx` + add a tier template entry to the JSON before running the script.

**Git state:** `main` only, clean working tree; recent commits are boss/luck rebalances and UI work.

---

## Section 2: Fresh Snapshot Analysis (playorbo.fun download)

The snapshot contains **37 webpack chunks** in `_next/static/chunks/`. Game data is inlined as minified JSON inside three chunks:

### `451-0752ded5df7671f9.js` — creatures (~1,872 lines; data starts ~line 299)

- **182 creature definitions** — fields: `key`, `tier`, `name`, `aspect`, `dpsMultiplier`, `bio`.
- Tier counts:

| Tier | Snapshot | Tool | Delta |
|---|---|---|---|
| common | 24 | 24 | — |
| uncommon | 24 | 24 | — |
| scarce | 12 | 12 | — |
| rare | 11 | 11 | — |
| esoteric | 21 | 21 | — |
| mythic | 28 | 28 | — |
| relic | 15 | 15 | — |
| untouched | 14 | 14 | — |
| **phaseBound** | **11** | 3 | **+8** |
| **lightSworn** | **11** | 3 | **+8** |
| **voidBorn** | **11** | 3 | **+8** |

### `1373-ce9979a82a0f7fcb.js` — game config (681 lines)

- `spawnRateMilestones` (luck 1–99)
- `tierUnlockLevels` — **matches current tool values**
- Luck config: `luckStartLevel 1`, **`luckMaxLevel 1000`**, `luckTimerMilestones`, `luckUpgradeCosts` (31 entries starting `[60, 100, 250, 600, 1500, ...]`)
- Shop/gacha config: `maxEquipped 8`, `maxInventory 32`, chest gem costs: standard free/50, premium 200, elite 450
- Totem config: `maxEquipped 3`, `slotUnlockFloors [30, 40, 50]`, `maxOpenAtOnce 10`, `totemRateMilestones`
- Leveling config: **`maxLevel 100`** *(note: verify vs tool's 80 levels)*, `levelsPerStage 25`, `foodBase`, `tierFoodMult`
- Sample spawn rates at luck 30: common 31.989, uncommon 12, scarce 12, rare 13, esoteric 13, mythic 12, relic 6, untouched 0.08, phaseBound 0.001

### `2953-965ebf8f0fa39111.js` — biomes/tasks (lines ~1767–1920)

- **30 biomes** (15 base + 15 inverted variants): Grasslands, Crystal Cave, Mushroom Grotto, Ice Cavern, Volcanic, Ancient Ruins, Shadow Depths, Golden Treasury, Abyssal, Celestial, Prismatic Reef, Clockwork Depths, Petrified Forest, Storm Citadel, Bioluminescent Abyss, Forgotten Library, Mirror Realm, Garden of Eternity, Astral Rift, The Origin, Fractured Cosmos, Solar Forge, Void Bloom, Obsidian Cathedral, Aurora Wastes, Ashen Necropolis, The Dreaming, Entropy's End, The Empyrean, The Absolute.
- Each biome: `key`, `name`, `tileCount`, `rockCount` (10–16).

### Asset folders (`orbos/`)

Confirm creature keys for the high tiers:

- **Phase-Bound:** dimension-walker, fold-warden, liminal-hunter, prism-drifter, quantum-nomad, reality-shifter, rift-bass, threshold-seer, void-traveler
- **Light-Sworn:** aegis-seraph, dawn-bringer, dawnforged-knight, gilded-owl, gilded-templar, halo-warden, holy-guardian, lumen-shepherd, radiant-oracle, radiant-paladin, sun-cantor
- **Void-Born:** abyss-walker, dark-herald, eclipse-warden, shadow-wraith, void-hound

Only **38/182** creatures have extracted sprite assets in the snapshot.

### Features present in snapshot but NOT in the tool

- Arena/PvP
- Garden/farming
- Totems (collectible cards with effects like `idleCoinsMult`; lanes: idle/energy/power/tap/descent/economy)
- Shop/gacha packs
- Earn/tasks
- Inbox
- Depths quests

### API captures (`api/trpc/`)

Mostly request URLs only. Exceptions with actual response data:

- `game.executeActions` → `{success, coins, totalCoinsEarned}`
- `game.player.stats.overview` → full player stats incl. `orboTierBreakdown {voidBorn: 6, lightSworn: 2}`, `luckLevel 58`, `floor 260`
- `game.totems.state` → full totem inventory structure with odds tables and effects

---

## Section 3: API Interaction Reference (orbo-bot-go)

- **Base URL:** `https://orbo.shadow.club/api/trpc/` (also `playorbo.fun/api/trpc`)
- **Protocol:** tRPC batch — POST `/api/trpc/{procedure}?batch=1`, payload `{"0": {"json": {...}}}`, responses as indexed arrays.
- **Auth:** `Authorization: Bearer <token>` header; tokens stored in `.env` (`OPEC_TOKEN`, `RUBIS_TOKEN`); no refresh flow. `auth.telegramCheck` accepts Telegram initData, but the bot bypasses it with pre-obtained tokens.

**Key endpoint catalog:**

| Domain | Endpoints |
|---|---|
| Auth | `auth.me`, `auth.telegramCheck` |
| Core game | `game.state`, `game.orbos.state`, `game.executeActions` (actions like `{type: "depths.click", data: {clicks: N}}` with `clientTimestamp`) |
| Player | `game.player.stats.overview`, `game.player.inventory.state` |
| Shop | `game.shop.state`, `game.shop.gemState`, `game.shop.packState` |
| Totems | `game.totems.state`, `game.totems.discoveryPercentile` |
| Garden | `game.garden.state` |
| Depths | `game.depths.floors.state`, `game.depths.spawn.state` |
| Arena | `game.arena.getLeague`, `game.arena.getTickets` |
| World | `game.world.leaderboard` |
| Tasks/misc | `game.tasks.claimedIds`, `game.earn.state`, `game.achievements.claimedIds`, `game.inbox.summary` |

**Bot timing:** 500ms loop, 50 actions × 55 clicks per batch, 5s timeout, disabled 30s throttle on earning-drop detection.

---

## Section 4: Gap Analysis (core deliverable — what to extract/update)

1. **+24 creatures missing** (158 → 182), all in the top tiers: phaseBound 3→11, lightSworn 3→11, voidBorn 3→11.
   *Extraction:* copy the creature arrays from chunk 451 into `scripts/new-game-data.txt` and run `node scripts/update-creatures.js` — the existing workflow handles this exactly. **No new tiers** — `tierMap` / `TIER_COLORS` already cover all 11.
2. **Verify `dpsMultiplier` changes** for all 158 existing creatures against chunk 451 (the script auto-detects and recalculates).
3. **Level cap discrepancy — must investigate.** The config chunk shows `maxLevel 100` / `levelsPerStage 25`, while the tool models 80 levels / 4 stages / evolutions at 21/41/61. Verify whether the game raised the creature level cap to 100 (5 stages?) — if so, the tool's level model, tier templates, and update script all need extension. **This is the highest-risk finding.**
4. **Luck:** `luckMaxLevel` is **1000** in config vs the tool's 99 levels. Verify `luckUpgradeCosts` + `luckCostScale` values in chunk 1373 against the docs values; regenerate `orbo-luck.json` costs and spawn rates from the fresh `spawnRateMilestones` if changed (the tool may also want to extend past level 99).
5. **Bosses/biomes:** fresh chunk 2953 lists **30 biomes** vs ~5 in the tool data. Verify `minDpsMilestones` / `minDpsFallbackMultiplier` / `baseTimerSeconds` in the config chunk and regenerate `orbo-bosses.json`; possibly extend past floor 600 with correct biome names.
6. **Bio backfills:** chunk 451 has bios for all creatures; the script backfills empty ones automatically.
7. **Optional/future:** live-data mode via the tRPC API (bearer token, batch queries) instead of static extraction; new tool features for totems/garden/arena using config from chunk 1373.

---

## Section 5: Recommended Action Plan

1. **Extract creatures.** Beautify chunk `451-0752ded5df7671f9.js`, extract the creature arrays (data starts ~line 299), paste into `scripts/new-game-data.txt`, run `node scripts/update-creatures.js`. Review the report of new creatures / multiplier changes / bio backfills.
2. **Diff config constants.** Compare chunk `1373-ce9979a82a0f7fcb.js` constants (`luckUpgradeCosts`, `luckCostScale`, `spawnRateMilestones`, `minDpsMilestones`, `baseTimerSeconds`, `tierUnlockLevels`) against the values documented in `docs/updating-luck-and-bosses.md`; regenerate `orbo-luck.json` and `orbo-bosses.json` via the documented formulas if anything changed.
3. **Investigate the maxLevel 100 discrepancy** before trusting any regenerated creature data — confirm whether the 80-level / 4-stage model is still valid or must extend to 100 levels / 5 stages.
4. **Update docs** (`docs/updating-creature-data.md`, `docs/updating-luck-and-bosses.md`) with the new chunk filenames as a future reference for where the data lives in the deployed bundle.
5. **Optional:** implement an API-driven refresh (tRPC batch queries with a bearer token, per Section 3) as a future enhancement replacing static extraction.

---

## Appendix: Source File Reference

| Role | Path |
|---|---|
| Snapshot — creatures chunk | `/Users/opeculiar/Downloads/TEZCUP2026_ZUCKERPASS/playorbo.fun/_next/static/chunks/451-0752ded5df7671f9.js` |
| Snapshot — game config chunk | `/Users/opeculiar/Downloads/TEZCUP2026_ZUCKERPASS/playorbo.fun/_next/static/chunks/1373-ce9979a82a0f7fcb.js` |
| Snapshot — biomes/tasks chunk | `/Users/opeculiar/Downloads/TEZCUP2026_ZUCKERPASS/playorbo.fun/_next/static/chunks/2953-965ebf8f0fa39111.js` |
| Snapshot — creature asset keys | `/Users/opeculiar/Downloads/TEZCUP2026_ZUCKERPASS/playorbo.fun/orbos/` |
| Snapshot — API captures | `/Users/opeculiar/Downloads/TEZCUP2026_ZUCKERPASS/playorbo.fun/api/trpc/` |
| Tool — main app code | `/Users/opeculiar/work/orbo-tests/app/src/App.tsx` |
| Tool — creature data | `/Users/opeculiar/work/orbo-tests/app/src/orbo-creatures.json` |
| Tool — boss data | `/Users/opeculiar/work/orbo-tests/app/src/orbo-bosses.json` |
| Tool — luck data | `/Users/opeculiar/work/orbo-tests/app/src/orbo-luck.json` |
| Tool — update script | `/Users/opeculiar/work/orbo-tests/scripts/update-creatures.js` |
| Tool — update input template | `/Users/opeculiar/work/orbo-tests/scripts/new-game-data.txt` |
| Tool — creature update docs | `/Users/opeculiar/work/orbo-tests/docs/updating-creature-data.md` |
| Tool — luck/boss update docs | `/Users/opeculiar/work/orbo-tests/docs/updating-luck-and-bosses.md` |
| Bot — API client reference | `/Users/opeculiar/work/orbo-bot-go/lol.go` |
