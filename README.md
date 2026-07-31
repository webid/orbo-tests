# Orbo Tests / Battle Calculator

Battle calculator tool + data scripts for Orbo (playorbo.fun).

## Quick start: export your live army

Grab your current game state (orbos, rings, totems, overcharge/surge, and
current depth boss) as an import code for the tool:

```sh
node scripts/fetch-live-data.mjs --export-army
```

Paste the printed base64 string into the tool's **Sync → Import** field.
The script resolves your live floor (e.g. 260 → boss 26 "Ashen Necropolis")
and sets the correct boss HP/timer in the exported config.

### Token setup

The script reads `OPEC_TOKEN` (preferred) or `RUBIS_TOKEN` from:

1. `../orbo-bot-go/.env` (sibling repo)
2. `.env` in this repo's root

If you get a **401/403**, your token has expired — grab a fresh one from
Telegram and update the `.env` file.

### Other modes

```sh
node scripts/fetch-live-data.mjs --summary   # human-readable account overview
node scripts/fetch-live-data.mjs --json      # raw API responses (debugging)
```

## Docs

- [Live data fetcher](docs/live-data-fetcher.md) — full script documentation
- [Updating creature data](docs/updating-creature-data.md)
- [Updating luck & bosses](docs/updating-luck-and-bosses.md)

## App (battle calculator)

```sh
cd app
npm install
npm run dev
```
