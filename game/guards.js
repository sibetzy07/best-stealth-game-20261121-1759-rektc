// Wardens: patrol routes, vision cones, suspicion, investigation and chase.
// A warden's suspicion is a meter, not a tripwire: being glimpsed raises it,
// breaking line of sight lets it fall again, and only a full meter turns a
// patrol into a chase. Getting caught ends the level, never the run.

import { TILE, circleHitsSolid, hasLineOfSight, tileCenter } from './level.js';

export const GUARD_RADIUS = 12;
export const VISION_RANGE = 195;
export const VISION_HALF_ANGLE = 0.62; // ~35 degrees each side
export const CHASE_SPEED = 118;
export const SUSPICION_FULL = 100;
export const SUSPICION_WARY = 40;
export const CATCH_DISTANCE = 22;
export const BUSH_HIDE_DISTANCE = 55;

export function createGuard(def) {
  const [c0, r0] = def.waypoints[0];
  const start = tileCenter(c0, r0);
  return {
    waypoints: def.waypoints.map(([c, r]) => tileCenter(c, r)),
    waypointIndex: 1 % def.waypoints.length,
    patrolSpeed: def.speed,
    x: start.x,
    y: start.y,
    facing: 0,
    suspicion: 0,
    state: 'patrol', // patrol | wary | investigate | alert | return
    lastSeen: null,
    lookTimer: 0,
    loseTimer: 0,
    investigateTarget: null,
    heardNoiseAt: null,
  };
}

/** Angle difference wrapped to [-PI, PI]. */
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Can this warden see the courier right now? Inside the cone, in line of
 * sight, and not hidden in a bush (unless the warden is right on top of it).
 */
export function guardCanSee(guard, player, level, hidden) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > VISION_RANGE) return false;
  if (hidden && dist > BUSH_HIDE_DISTANCE) return false;
  const angle = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(angle, guard.facing)) > VISION_HALF_ANGLE) return false;
  return hasLineOfSight(level, guard.x, guard.y, player.x, player.y);
}

/** Move a warden toward a point with axis-separated collision. */
function moveGuardToward(guard, level, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const nx = dx / dist;
  const ny = dy / dist;
  guard.facing = Math.atan2(ny, nx);
  const stepX = guard.x + nx * speed * dt;
  if (!circleHitsSolid(level, stepX, guard.y, GUARD_RADIUS)) guard.x = stepX;
  const stepY = guard.y + ny * speed * dt;
  if (!circleHitsSolid(level, guard.x, stepY, GUARD_RADIUS)) guard.y = stepY;
  return Math.hypot(tx - guard.x, ty - guard.y) < 6;
}

/** A footstep or pebble sound reaches this warden: turn and investigate it. */
export function guardHearsNoise(guard, x, y, radius) {
  if (guard.state === 'alert') return;
  const dist = Math.hypot(x - guard.x, y - guard.y);
  if (dist > radius) return;
  guard.heardNoiseAt = { x, y };
  guard.suspicion = Math.max(guard.suspicion, 25);
  if (guard.state === 'patrol' || guard.state === 'return') {
    guard.state = 'investigate';
    guard.investigateTarget = { x, y };
  }
}

/** Step one warden for a frame. Returns 'caught' when it catches the courier. */
export function updateGuard(guard, player, level, hidden, dt) {
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  const sees = guardCanSee(guard, player, level, hidden);

  if (sees) {
    guard.lastSeen = { x: player.x, y: player.y };
    guard.loseTimer = 0;
    // Closer and louder is scarier: suspicion climbs faster up close.
    const closeness = 1 - (dist / VISION_RANGE) * 0.55;
    let rate = 72 * closeness;
    if (player.sneaking) rate *= 0.5;
    else if (player.moving) rate *= 1.45;
    guard.suspicion = Math.min(SUSPICION_FULL, guard.suspicion + rate * dt);
    if (guard.suspicion >= SUSPICION_FULL && guard.state !== 'alert') {
      guard.state = 'alert';
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - 24 * dt);
    if (guard.state === 'alert') {
      guard.loseTimer += dt;
      if (guard.loseTimer > 2.5) {
        guard.state = 'investigate';
        guard.investigateTarget = guard.lastSeen ? { ...guard.lastSeen } : { x: guard.x, y: guard.y };
        guard.suspicion = 55;
      }
    }
  }

  switch (guard.state) {
    case 'patrol': {
      if (guard.suspicion >= SUSPICION_WARY) {
        // Wary: stop, turn toward the glimpse, watch for a moment.
        guard.state = 'wary';
        guard.lookTimer = 1.1;
        break;
      }
      const target = guard.waypoints[guard.waypointIndex];
      const arrived = moveGuardToward(guard, level, target.x, target.y, guard.patrolSpeed, dt);
      if (arrived) guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      break;
    }
    case 'wary': {
      if (guard.lastSeen) {
        const want = Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x);
        guard.facing += Math.max(-2.4 * dt, Math.min(2.4 * dt, angleDiff(want, guard.facing)));
      }
      guard.lookTimer -= dt;
      if (guard.suspicion < SUSPICION_WARY || guard.lookTimer <= 0) guard.state = 'patrol';
      break;
    }
    case 'investigate': {
      const target = guard.investigateTarget;
      if (!target) { guard.state = 'return'; break; }
      const arrived = moveGuardToward(guard, level, target.x, target.y, guard.patrolSpeed * 1.5, dt);
      if (arrived) {
        guard.lookTimer = 1.6;
        guard.state = 'wary';
        guard.investigateTarget = null;
        guard.heardNoiseAt = null;
      }
      break;
    }
    case 'alert': {
      // Chase the courier's live position while it is seen, else the last glimpse.
      const target = sees ? { x: player.x, y: player.y } : guard.lastSeen;
      if (target) moveGuardToward(guard, level, target.x, target.y, CHASE_SPEED, dt);
      if (Math.hypot(player.x - guard.x, player.y - guard.y) < CATCH_DISTANCE) return 'caught';
      break;
    }
    case 'return': {
      const target = guard.waypoints[guard.waypointIndex];
      const arrived = moveGuardToward(guard, level, target.x, target.y, guard.patrolSpeed, dt);
      if (arrived) guard.state = 'patrol';
      break;
    }
  }
  return null;
}

/** The highest suspicion among the wardens (drives the HUD alarm bar). */
export function maxSuspicion(guards) {
  return guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
}

/** Whether any warden is in full chase. */
export function anyAlert(guards) {
  return guards.some((g) => g.state === 'alert');
}
