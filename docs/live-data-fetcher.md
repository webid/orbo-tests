# Live data fetcher

`scripts/fetch-live-data.mjs` pulls your live account state from the Orbo tRPC API
(`https://orbo.shadow.club/api/trpc`) so you don't have to copy stats out of the game by hand.
It is strictly **read-only** — it only calls query endpoints (`game.state`, `game.orbos.state`,
`game.player.inventory.state`, `game.totems.state`, `game.totems.discoveryPercentile`,
`game.player.stats.overview`, `game.depths.floors.state`, `game.depths.spawn.state`) and never
`game.executeActions` or any other mutation. Requests are batched with a 1s pause between batches.

No dependencies — plain Node 18+ (built-in `fetch`).

## Token setup

The script needs a bearer token. By default it uses `OPEC_TOKEN` (falling back to `RUBIS_TOKEN`),
looking in:

1. `../orbo-bot-go/.env` (sibling repo, relative to this repo's root)
2. `.env` in this repo's root

Format is plain `KEY=value` lines. If the API returns 401/403, the token has expired — grab a
fresh one from Telegram.

## Usage

```sh
node scripts/fetch-live-data.mjs --summary       # default: human-readable state overview
node scripts/fetch-live-data.mjs --export-army   # save code for the battle calculator
node scripts/fetch-live-data.mjs --json          # raw API responses (debugging)
node scripts/fetch-live-data.mjs --export-army --rubis   # same, but for the RUBIS_TOKEN account
```

Any mode can be combined with `--rubis` (or `--token rubis` / `--token opec`) to pick the
account explicitly. An explicit choice **never falls back** to the other token — if
`RUBIS_TOKEN` is missing, the script errors instead of silently exporting the opec account.

- `--summary` prints player level/floor/luck, army composition with per-creature DPS (resolved
  against `app/src/orbo-creatures.json`), equipped ring and its stats, equipped totems and
  aggregated effects, overcharge/surge levels, currencies, and depths/spawner info.
- `--export-army` prints a base64 code in the exact format the tool's Sync → Import field
  expects (`btoa(encodeURIComponent(JSON.stringify({ config, slots })))`). Pasting it loads your
  live army (creature keys + levels) and battle config (equipped ring, overcharge level,
  click flat bonus, totem damage/speed/energy-max percentages). Boss selection keeps the tool
  defaults since it's a planning input, not account state.
- `--json` dumps every fetched procedure's payload as one JSON object on stdout (progress and
  warnings go to stderr, so piping stdout to a file stays clean).

Failed batches are skipped with a warning; the script keeps going with whatever it got.
