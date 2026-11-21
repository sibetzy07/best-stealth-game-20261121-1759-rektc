// Canvas rendering: moonlit floor, walls, crates, bushes, the glowing exit,
// warden vision cones, the courier's lantern light, and the HUD.
// Everything is drawn with the canvas API; there are no image assets.

import { TILE, COLS, ROWS } from './level.js';
import { VISION_RANGE, VISION_HALF_ANGLE, SUSPICION_FULL, SUSPICION_WARY } from './guards.js';

export const VIEW_W = 960;
export const VIEW_H = 640;

/** Deterministic speckle for a tile (same tile, same dots, every run). */
function tileHash(c, r) {
  let h = (c * 374761393 + r * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function drawFloor(ctx, level, time) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE;
      const y = r * TILE;
      const checker = (c + r) % 2 === 0;
      ctx.fillStyle = checker ? '#1d2436' : '#1a202f';
      ctx.fillRect(x, y, TILE, TILE);
      // faint stone speckle
      const h = tileHash(c, r);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(x + 4 + h * 20, y + 5 + ((h * 53) % 1) * 20, 2, 2);
      ctx.fillRect(x + 8 + ((h * 91) % 1) * 16, y + 14 + h * 12, 2, 2);
    }
  }
}

function drawWallsAndCover(ctx, level) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = level.grid[r][c];
      const x = c * TILE;
      const y = r * TILE;
      if (ch === '#') {
        ctx.fillStyle = '#39415a';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#4a5470';
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, y + TILE - 4, TILE, 4);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      } else if (ch === 'C') {
        ctx.fillStyle = '#6b4a26';
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = '#7d5a30';
        ctx.fillRect(x + 2, y + 2, TILE - 4, 6);
        ctx.strokeStyle = '#4a3016';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 2);
        ctx.lineTo(x + TILE - 2, y + TILE - 2);
        ctx.moveTo(x + TILE - 2, y + 2);
        ctx.lineTo(x + 2, y + TILE - 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      } else if (ch === 'B') {
        ctx.fillStyle = '#16351f';
        for (const [ox, oy, rad] of [[9, 10, 9], [22, 8, 10], [16, 21, 10], [8, 22, 8], [24, 22, 8]]) {
          ctx.beginPath();
          ctx.arc(x + ox, y + oy, rad, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#1f4d2a';
        for (const [ox, oy, rad] of [[12, 12, 5], [20, 18, 5], [16, 9, 4]]) {
          ctx.beginPath();
          ctx.arc(x + ox, y + oy, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function drawExit(ctx, level, time) {
  const { x, y } = level.exit;
  const pulse = 0.6 + 0.4 * Math.sin(time * 3);
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 70);
  glow.addColorStop(0, `rgba(80,255,140,${0.5 * pulse})`);
  glow.addColorStop(1, 'rgba(80,255,140,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 70, y - 70, 140, 140);
  ctx.fillStyle = '#0d3d1e';
  ctx.fillRect(x - 15, y - 15, 30, 30);
  ctx.strokeStyle = `rgba(120,255,160,${0.65 + 0.35 * pulse})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 15, y - 15, 30, 30);
  ctx.fillStyle = '#8dffab';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', x, y - 26);
  // animated chevrons pointing into the door
  ctx.strokeStyle = '#8dffab';
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const off = ((time * 14 + i * 9) % 18) - 9;
    ctx.beginPath();
    ctx.moveTo(x - 5 + off, y - 6);
    ctx.lineTo(x + 3 + off, y);
    ctx.lineTo(x - 5 + off, y + 6);
    ctx.stroke();
  }
}

function drawShards(ctx, level, time) {
  for (const shard of level.shards) {
    if (shard.taken) continue;
    const pulse = 0.7 + 0.3 * Math.sin(time * 4 + shard.x);
    const glow = ctx.createRadialGradient(shard.x, shard.y, 2, shard.x, shard.y, 30);
    glow.addColorStop(0, `rgba(110,220,255,${0.55 * pulse})`);
    glow.addColorStop(1, 'rgba(110,220,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(shard.x - 30, shard.y - 30, 60, 60);
    ctx.save();
    ctx.translate(shard.x, shard.y + Math.sin(time * 2 + shard.x) * 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#9be8ff';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.strokeStyle = '#e6fbff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-6, -6, 12, 12);
    ctx.restore();
  }
}

function drawVisionCone(ctx, guard) {
  const alert = guard.state === 'alert';
  const wary = guard.suspicion >= SUSPICION_WARY;
  const base = alert ? '255,70,70' : wary ? '255,170,60' : '255,220,90';
  const grad = ctx.createRadialGradient(guard.x, guard.y, 8, guard.x, guard.y, VISION_RANGE);
  grad.addColorStop(0, `rgba(${base},${alert ? 0.4 : 0.3})`);
  grad.addColorStop(1, `rgba(${base},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, VISION_RANGE, guard.facing - VISION_HALF_ANGLE, guard.facing + VISION_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(${base},0.35)`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGuard(ctx, guard, time) {
  // suspicion ring above the warden
  if (guard.suspicion > 1) {
    const w = 30;
    const frac = guard.suspicion / SUSPICION_FULL;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(guard.x - w / 2, guard.y - 30, w, 5);
    ctx.fillStyle = guard.state === 'alert' ? '#ff5252' : frac > 0.4 ? '#ffb02e' : '#ffe066';
    ctx.fillRect(guard.x - w / 2, guard.y - 30, w * frac, 5);
  }
  // body: a warden in a dark red coat with a brass lantern
  ctx.fillStyle = '#8e2f2f';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8b25c';
  ctx.lineWidth = 2;
  ctx.stroke();
  // facing tick (the warden's nose / lantern direction)
  const fx = guard.x + Math.cos(guard.facing) * 12;
  const fy = guard.y + Math.sin(guard.facing) * 12;
  ctx.fillStyle = '#ffd97a';
  ctx.beginPath();
  ctx.arc(fx, fy, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(guard.x - 3, guard.y - 3, 1.6, 0, Math.PI * 2);
  ctx.arc(guard.x + 3, guard.y - 3, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // "!" when chasing, "?" when wary
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  if (guard.state === 'alert') {
    ctx.fillStyle = '#ff5252';
    ctx.fillText('!', guard.x, guard.y - 32);
  } else if (guard.suspicion >= SUSPICION_WARY || guard.state === 'investigate') {
    ctx.fillStyle = '#ffb02e';
    ctx.fillText('?', guard.x, guard.y - 32);
  }
}

function drawPlayer(ctx, player, time) {
  const bob = player.moving ? Math.sin(time * 12) * 1.5 : 0;
  // lantern glow
  const glow = ctx.createRadialGradient(player.x, player.y, 6, player.x, player.y, 120);
  glow.addColorStop(0, 'rgba(255,214,130,0.30)');
  glow.addColorStop(1, 'rgba(255,214,130,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(player.x - 120, player.y - 120, 240, 240);
  // hooded courier: teal cloak, pale hood
  ctx.save();
  ctx.translate(player.x, player.y + bob);
  ctx.rotate(player.facing);
  ctx.fillStyle = '#2fa8a0';
  ctx.beginPath();
  ctx.moveTo(13, 0);
  ctx.lineTo(-9, -9);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-9, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#e8f4f2';
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#123b38';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.facing) * 3, player.y + Math.sin(player.facing) * 3 + bob, 3, 0, Math.PI * 2);
  ctx.fill();
  if (player.sneaking) {
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9be8ff';
    ctx.fillText('sneaking', player.x, player.y - 20 + bob);
  }
}

function drawPebble(ctx, player) {
  if (player.pebbleFlight) {
    const f = player.pebbleFlight;
    const x = f.x0 + (f.x1 - f.x0) * f.t;
    const y = f.y0 + (f.y1 - f.y0) * f.t - Math.sin(f.t * Math.PI) * 26;
    ctx.fillStyle = '#cfd6e4';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (player.pebbleRing) {
    const r = player.pebbleRing;
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - r.t / 0.9)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 8 + r.t * 90, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Night darkness with holes of light around the courier, the exit and shards. */
function drawDarkness(ctx, level, player, time) {
  const dark = document.createElement('canvas');
  dark.width = VIEW_W;
  dark.height = VIEW_H;
  const d = dark.getContext('2d');
  d.fillStyle = 'rgba(5,8,20,0.62)';
  d.fillRect(0, 0, VIEW_W, VIEW_H);
  d.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, strength) => {
    const g = d.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${strength})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g;
    d.fillRect(x - r, y - r, r * 2, r * 2);
  };
  hole(player.x, player.y, 165, 0.95);
  hole(level.exit.x, level.exit.y, 95, 0.85);
  for (const shard of level.shards) {
    if (!shard.taken) hole(shard.x, shard.y, 45, 0.5);
  }
  ctx.drawImage(dark, 0, 0);
}

function drawHud(ctx, game) {
  const { level, player, guards, levelIndex } = game;
  ctx.fillStyle = 'rgba(4,6,14,0.72)';
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.fillStyle = '#e8ecf5';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LEVEL ${levelIndex + 1} — ${level.name.toUpperCase()}`, 12, 18);
  const shardsTaken = level.shards.filter((s) => s.taken).length;
  ctx.fillStyle = '#9be8ff';
  ctx.fillText(`◆ ${shardsTaken}/${level.shards.length}`, 330, 18);
  ctx.fillStyle = '#ffd97a';
  ctx.fillText(`● pebbles ${player.pebbles}`, 420, 18);
  const mins = Math.floor(game.elapsed / 60);
  const secs = Math.floor(game.elapsed % 60).toString().padStart(2, '0');
  ctx.fillStyle = '#e8ecf5';
  ctx.fillText(`⏱ ${mins}:${secs}`, 540, 18);
  // alarm bar: the most suspicious warden
  const alarm = guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
  const bx = 640;
  const bw = 180;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bx, 10, bw, 14);
  ctx.fillStyle = alarm >= SUSPICION_FULL ? '#ff5252' : alarm >= SUSPICION_WARY ? '#ffb02e' : '#3fae6a';
  ctx.fillRect(bx, 10, bw * (alarm / SUSPICION_FULL), 14);
  ctx.strokeStyle = '#e8ecf5';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, 10.5, bw, 14);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(alarm >= SUSPICION_FULL ? 'SPOTTED!' : alarm >= SUSPICION_WARY ? 'SUSPICIOUS' : 'HIDDEN', bx + bw + 10, 18);
  // bottom hint
  ctx.fillStyle = 'rgba(4,6,14,0.6)';
  ctx.fillRect(0, VIEW_H - 26, VIEW_W, 26);
  ctx.fillStyle = '#b9c2d8';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD / arrows — move    Shift — sneak    Click — toss a pebble    M — mute    R — restart level', VIEW_W / 2, VIEW_H - 13);
}

function drawCenterBanner(ctx, title, subtitle, color) {
  ctx.fillStyle = 'rgba(4,6,14,0.78)';
  ctx.fillRect(0, VIEW_H / 2 - 78, VIEW_W, 156);
  ctx.fillStyle = color;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 22);
  ctx.fillStyle = '#e8ecf5';
  ctx.font = '17px sans-serif';
  ctx.fillText(subtitle, VIEW_W / 2, VIEW_H / 2 + 30);
}

/** Draw one frame for the current game state. */
export function renderGame(ctx, game, time) {
  const { level, player, guards } = game;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, level, time);
  drawWallsAndCover(ctx, level);
  drawExit(ctx, level, time);
  drawShards(ctx, level, time);
  drawDarkness(ctx, level, player, time);
  for (const guard of guards) drawVisionCone(ctx, guard);
  drawPebble(ctx, player);
  for (const guard of guards) drawGuard(ctx, guard, time);
  drawPlayer(ctx, player, time);
  drawHud(ctx, game);

  if (game.state === 'title') {
    ctx.fillStyle = 'rgba(4,6,14,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#ffd97a';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NIGHT PARCEL', VIEW_W / 2, 190);
    ctx.fillStyle = '#e8ecf5';
    ctx.font = '20px sans-serif';
    ctx.fillText('a silent courier stealth game', VIEW_W / 2, 232);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#b9c2d8';
    ctx.fillText('Carry the parcel through the night halls. Stay out of the wardens’ lantern cones,', VIEW_W / 2, 300);
    ctx.fillText('hide in the bushes, toss pebbles to lure them away — and reach the green EXIT unseen.', VIEW_W / 2, 324);
    ctx.fillStyle = '#9be8ff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('WASD / arrows to move · Shift to sneak · Click to toss a pebble', VIEW_W / 2, 380);
    ctx.fillStyle = '#fff';
    ctx.fillText('Press ENTER or click to begin', VIEW_W / 2, 430);
  } else if (game.state === 'caught') {
    drawCenterBanner(ctx, 'CAUGHT!', 'A warden grabbed the parcel. Press R or click to try this level again.', '#ff5252');
  } else if (game.state === 'levelclear') {
    const shardsTaken = level.shards.filter((s) => s.taken).length;
    drawCenterBanner(
      ctx,
      'DELIVERED!',
      `Level clear — ${shardsTaken}/${level.shards.length} moon shards. Press ENTER or click for the next hall.`,
      '#8dffab',
    );
  } else if (game.state === 'victory') {
    const mins = Math.floor(game.elapsed / 60);
    const secs = Math.floor(game.elapsed % 60).toString().padStart(2, '0');
    const ghost = game.everSpotted ? 'The wardens saw you once — but the parcel still arrived.' : 'GHOST COURIER — never once spotted. Flawless.';
    drawCenterBanner(
      ctx,
      'ALL PARCELS DELIVERED!',
      `Three halls, ${mins}:${secs}. ${ghost} Press R to play again.`,
      '#ffd97a',
    );
  } else if (game.state === 'playing' && game.levelIntroTimer > 0) {
    ctx.fillStyle = 'rgba(4,6,14,0.7)';
    ctx.fillRect(0, VIEW_H / 2 - 52, VIEW_W, 104);
    ctx.fillStyle = '#ffd97a';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${game.levelIndex + 1} — ${level.name.toUpperCase()}`, VIEW_W / 2, VIEW_H / 2 - 14);
    ctx.fillStyle = '#e8ecf5';
    ctx.font = '16px sans-serif';
    ctx.fillText(level.intro, VIEW_W / 2, VIEW_H / 2 + 22);
  }
}
