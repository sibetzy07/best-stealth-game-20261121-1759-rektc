// Night Parcel: game loop, state machine and level flow.
// States: title -> playing -> levelclear -> (next level) -> victory, or caught -> playing.

import { LEVELS, parseLevel } from './level.js';
import { createPlayer, updatePlayer, playerIsHidden, playerOnExit, collectShards, throwPebble } from './player.js';
import { createGuard, updateGuard, guardHearsNoise, anyAlert } from './guards.js';
import { renderGame, VIEW_W, VIEW_H } from './render.js';
import { createInput } from './input.js';
import {
  ensureAudio,
  playFootstep,
  playSuspicious,
  playAlert,
  playPickup,
  playPebble,
  playLevelClear,
  playVictory,
  playCaught,
  toggleMute,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);

const game = {
  state: 'title', // title | playing | caught | levelclear | victory
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  elapsed: 0,
  levelIntroTimer: 0,
  everSpotted: false,
  wasAlert: false,
  stepTimer: 0,
};

/** Load a level fresh: new courier, new wardens, shards reset. */
function loadLevel(index) {
  const def = LEVELS[index];
  const level = parseLevel(def);
  game.levelIndex = index;
  game.level = level;
  game.player = createPlayer(level.start);
  game.guards = level.guardDefs.map((d) => createGuard(d));
  game.levelIntroTimer = 2.6;
  game.state = 'playing';
}

function startGame() {
  game.elapsed = 0;
  game.everSpotted = false;
  game.wasAlert = false;
  loadLevel(0);
}

function restartLevel() {
  loadLevel(game.levelIndex);
}

function nextLevel() {
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.state = 'victory';
    playVictory();
  } else {
    loadLevel(game.levelIndex + 1);
  }
}

function onNoise(x, y, radius) {
  for (const guard of game.guards) guardHearsNoise(guard, x, y, radius);
}

function stepPlaying(dt) {
  const { player, level, guards } = game;
  game.elapsed += dt;
  if (game.levelIntroTimer > 0) game.levelIntroTimer -= dt;

  updatePlayer(player, level, input, dt, onNoise);

  // footstep sounds while walking
  if (player.moving) {
    game.stepTimer -= dt;
    if (game.stepTimer <= 0) {
      game.stepTimer = player.sneaking ? 0.55 : 0.34;
      playFootstep(player.sneaking);
    }
  }

  const hidden = playerIsHidden(player, level);

  let caught = false;
  for (const guard of game.guards) {
    const wasSuspicious = guard.suspicion >= 40;
    const result = updateGuard(guard, player, level, hidden, dt);
    if (result === 'caught') caught = true;
    if (!wasSuspicious && guard.suspicion >= 40) playSuspicious();
  }
  const alertNow = anyAlert(guards);
  if (alertNow && !game.wasAlert) {
    game.everSpotted = true;
    playAlert();
  }
  game.wasAlert = alertNow;

  if (caught) {
    game.state = 'caught';
    playCaught();
    return;
  }

  // pebble toss (mouse click)
  if (input.click) {
    const { x, y } = input.click;
    input.click = null;
    if (game.state === 'playing') {
      if (throwPebble(player, x, y)) {
        playPebble();
        const ring = () => {
          if (player.pebbleRing) {
            for (const guard of guards) guardHearsNoise(guard, player.pebbleRing.x, player.pebbleRing.y, 260);
          }
        };
        // the ring appears when the pebble lands; check it on the next frames
        player._pebbleLanded = ring;
      }
    }
  }
  if (player.pebbleRing && player._pebbleLanded) {
    player._pebbleLanded();
    player._pebbleLanded = null;
  }

  const shard = collectShards(player, level);
  if (shard) playPickup();

  if (playerOnExit(player, level)) {
    game.state = 'levelclear';
    playLevelClear();
  }
}

/** Handle one key press / click by state. */
function handleAction() {
  const key = input.anyKey;
  input.anyKey = null;
  if (key) {
    ensureAudio();
    if (key.key === 'm' || key.key === 'M') toggleMute();
    if (key.key === 'r' || key.key === 'R') {
      if (game.state === 'caught' || game.state === 'victory' || game.state === 'playing') restartLevel();
      return;
    }
    if (key.key === 'Enter' || key.key === ' ') {
      if (game.state === 'title') startGame();
      else if (game.state === 'levelclear') nextLevel();
      else if (game.state === 'caught') restartLevel();
      return;
    }
  }
  if (input.click) {
    ensureAudio();
    if (game.state === 'title') {
      input.click = null;
      startGame();
    } else if (game.state === 'levelclear') {
      input.click = null;
      nextLevel();
    } else if (game.state === 'caught') {
      input.click = null;
      restartLevel();
    }
    // in 'playing' the click is a pebble toss, handled in stepPlaying
  }
}

let lastTime = performance.now();
let time = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  time += dt;
  handleAction();
  if (game.state === 'playing') stepPlaying(dt);
  renderGame(ctx, game, time);
  requestAnimationFrame(frame);
}

// Show the first level behind the title screen.
game.level = parseLevel(LEVELS[0]);
game.player = createPlayer(game.level.start);
game.guards = game.level.guardDefs.map((d) => createGuard(d));
game.state = 'title';

requestAnimationFrame(frame);

/**
 * Debug handle for playtesting and screenshots: drives the real game state.
 * (Used by the maker's own screenshot script; not part of the game UI.)
 */
window.__stealth = {
  game,
  start: startGame,
  startLevel(index) {
    game.elapsed = 0;
    game.everSpotted = false;
    loadLevel(index);
  },
  teleport(tileX, tileY) {
    game.player.x = (tileX + 0.5) * 32;
    game.player.y = (tileY + 0.5) * 32;
  },
  setGuardSuspicion(i, value) {
    const g = game.guards[i];
    g.suspicion = value;
    if (value >= 100) {
      g.state = 'alert';
      g.lastSeen = { x: game.player.x, y: game.player.y };
    }
  },
  placeGuard(i, tileX, tileY, facing) {
    const g = game.guards[i];
    g.x = (tileX + 0.5) * 32;
    g.y = (tileY + 0.5) * 32;
    g.facing = facing;
  },
  winAll() {
    game.elapsed = 187;
    game.state = 'victory';
  },
  state() {
    return {
      state: game.state,
      level: game.levelIndex,
      player: { x: game.player.x, y: game.player.y },
      guards: game.guards.map((g) => ({ x: g.x, y: g.y, suspicion: g.suspicion, state: g.state })),
      shards: game.level.shards.filter((s) => s.taken).length,
    };
  },
};
