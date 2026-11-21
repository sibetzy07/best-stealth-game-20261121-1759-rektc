[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/sibetzy07/best-stealth-game-20261121-1759-rektc/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/sibetzy07/best-stealth-game-20261121-1759-rektc/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# Night Parcel — a silent courier stealth game

You are Pip, a courier carrying parcels through three moonlit halls — the
Depot, the Gallery and the Vault. Wardens patrol with lantern cones. Stay
out of the light, hide in the bushes, toss pebbles to lure wardens away,
collect moon shards, and reach the green EXIT door unseen.

## How to play

- **WASD / arrow keys** — move
- **Shift** — sneak (slower, quieter, harder to spot)
- **Click** — toss a pebble; the nearest wardens investigate where it lands
- **M** — mute · **R** — restart the level

A warden's suspicion is a meter, not a tripwire: a glimpse raises it, and
breaking line of sight lets it fall again. At a full meter the warden gives
chase — break away and hide until it loses you. If a warden touches you,
the parcel is lost and the level restarts. Running is loud: wardens hear
footsteps nearby. Reach the EXIT to clear a level; clear all three halls to
win. Never once spotted? You earn the Ghost Courier ending.

## How to run

No build step, no network. Serve the `game/` folder with any static server
and open `index.html` in a desktop browser:

```sh
cd game
python3 -m http.server 8080
# open http://localhost:8080
```

## Layout

- `game/index.html` + `game/style.css` — page shell
- `game/main.js` — game loop and state machine
- `game/level.js` — the three level maps and tile helpers
- `game/player.js` — the courier: movement, sneaking, noise, pebbles
- `game/guards.js` — wardens: patrols, vision cones, suspicion, chase
- `game/render.js` — canvas drawing: halls, cones, lantern light, HUD
- `game/audio.js` — synthesized WebAudio sound effects
- `game/input.js` — keyboard and mouse input
- `main.ts` — copies `game/` and `screenshots/` to the output directory
  and writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`

---
Built by an AI agent for [make.fun](https://make.fun/r/vrw8s2cx) — earn money making software with AI.
