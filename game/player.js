// The courier: movement, sneaking, noise, pebble tosses, shard pickup.

import { TILE, circleHitsSolid, isBushAt, tileAt } from './level.js';

export const PLAYER_RADIUS = 11;
export const WALK_SPEED = 150;
export const SNEAK_SPEED = 88;
export const NOISE_RADIUS = 120;
export const NOISE_INTERVAL = 0.38;

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: PLAYER_RADIUS,
    facing: 0, // radians, 0 = east
    moving: false,
    sneaking: false,
    noiseTimer: 0,
    pebbles: 3,
    pebbleFlight: null, // {x0,y0,x1,y1,t} while a pebble is in the air
    pebbleRing: null, // {x,y,t} expanding ring where a pebble landed
    shardsTaken: 0,
  };
}

/**
 * Move the courier with axis-separated collision so it slides along walls.
 * Returns true when the courier actually moved this frame.
 */
export function movePlayer(player, level, dx, dy, dt) {
  const nx = player.x + dx * dt;
  if (!circleHitsSolid(level, nx, player.y, player.radius)) player.x = nx;
  const ny = player.y + dy * dt;
  if (!circleHitsSolid(level, player.x, ny, player.radius)) player.y = ny;
}

/** Step the courier for one frame. `input` is {mx, my, sneak}. */
export function updatePlayer(player, level, input, dt, onNoise) {
  const len = Math.hypot(input.mx, input.my);
  player.moving = len > 0.01;
  player.sneaking = !!input.sneak && player.moving;
  if (player.moving) {
    const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const nx = input.mx / len;
    const ny = input.my / len;
    player.facing = Math.atan2(ny, nx);
    movePlayer(player, level, nx * speed, ny * speed, dt);
    // Running is loud: wardens nearby hear the footsteps.
    if (!player.sneaking) {
      player.noiseTimer -= dt;
      if (player.noiseTimer <= 0) {
        player.noiseTimer = NOISE_INTERVAL;
        onNoise(player.x, player.y, NOISE_RADIUS);
      }
    }
  }
  if (player.pebbleFlight) {
    const f = player.pebbleFlight;
    f.t += dt * 2.2;
    if (f.t >= 1) {
      player.pebbleRing = { x: f.x1, y: f.y1, t: 0 };
      player.pebbleFlight = null;
    }
  }
  if (player.pebbleRing) {
    player.pebbleRing.t += dt;
    if (player.pebbleRing.t > 0.9) player.pebbleRing = null;
  }
}

/** Whether the courier is currently hidden inside a bush. */
export function playerIsHidden(player, level) {
  return isBushAt(level, player.x, player.y);
}

/** Whether the courier stands on the exit tile. */
export function playerOnExit(player, level) {
  return tileAt(level, player.x, player.y) === 'E';
}

/** Pick up any shard the courier touches. Returns the shard or null. */
export function collectShards(player, level) {
  for (const shard of level.shards) {
    if (!shard.taken && Math.hypot(shard.x - player.x, shard.y - player.y) < TILE * 0.7) {
      shard.taken = true;
      player.shardsTaken++;
      return shard;
    }
  }
  return null;
}

/** Toss a pebble toward a point (clamped to throwing range). Returns false when none are left. */
export function throwPebble(player, tx, ty) {
  if (player.pebbles <= 0 || player.pebbleFlight) return false;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const dist = Math.hypot(dx, dy);
  const maxThrow = 320;
  const k = dist > maxThrow ? maxThrow / dist : 1;
  player.pebbles--;
  player.pebbleFlight = {
    x0: player.x,
    y0: player.y,
    x1: player.x + dx * k,
    y1: player.y + dy * k,
    t: 0,
  };
  return true;
}
