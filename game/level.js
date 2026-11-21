// Level maps and tile helpers for Night Parcel.
// A level is a 30x20 grid of characters:
//   '.............................#' wall (solid, blocks sight)   '.' floor
//   'C' crate (solid cover, blocks sight)   'B' bush (walkable, hides the courier)
//   'S' courier start   'E' exit door   '*' moon shard (optional collectible)
// Guards are defined separately with patrol waypoints in tile coordinates.

export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;

export const LEVELS = [
  {
    name: 'The Depot',
    intro: 'Slip past the wardens. Reach the green EXIT door.',
    map: [
      '##############################',
      '#S....C.......B......*.......#',
      '#.....C......................#',
      '#..B......C..........C.......#',
      '#............................#',
      '#....C.......B.......C....*..#',
      '#....C.......................#',
      '#.........C......C...........#',
      '#..*......C..........C.......#',
      '#............................#',
      '#.....B.......C......B.......#',
      '#............................#',
      '#..C......C..........C......C#',
      '#.....................E......#',
      '#....C.......B.......C.......#',
      '#............................#',
      '#..B......C......*......C....#',
      '#............................#',
      '#.....C.....B.............C..#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 4], [27, 4]], speed: 55 },
      { waypoints: [[27, 9], [3, 9]], speed: 60 },
      { waypoints: [[22, 2], [22, 17]], speed: 50 },
      { waypoints: [[4, 15], [26, 15]], speed: 55 },
    ],
  },
  {
    name: 'The Gallery',
    intro: 'More wardens, tighter halls. Bushes hide you; crates block their eyes.',
    map: [
      '##############################',
      '#S....#..........C......*....#',
      '#.....#......................#',
      '#..B..#....C.........B....C..#',
      '#.....#......................#',
      '#..C..#....*......C......C...#',
      '#.....#......................#',
      '#.....########..#######......#',
      '#............................#',
      '#..*......C..........B......C#',
      '#............................#',
      '#....C.......#######.........#',
      '#............................#',
      '#..B......C..........C......B#',
      '#............................#',
      '#....*....C..........C....C..#',
      '#............................#',
      '#..C..........B......C......E#',
      '#.....C......................#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 8], [27, 8]], speed: 62 },
      { waypoints: [[27, 10], [2, 10]], speed: 58 },
      { waypoints: [[3, 12], [26, 12]], speed: 60 },
      { waypoints: [[24, 2], [24, 17]], speed: 52 },
      { waypoints: [[4, 2], [4, 17]], speed: 52 },
    ],
  },
  {
    name: 'The Vault',
    intro: 'The last door. Five wardens, one quiet courier. Make it count.',
    map: [
      '##############################',
      '#S...C....#......*......C....#',
      '#....C....#..................#',
      '#..B......#..C......B....C...#',
      '#.........#..................#',
      '#....*....#......C......C....#',
      '#.........#..................#',
      '#..C...#####..######.........#',
      '#............................#',
      '#....B....C..........*.....B.#',
      '#............................#',
      '#..C......#####..#####....C..#',
      '#............................#',
      '#....C.......B......C......*.#',
      '#............................#',
      '#..B......C..........C......B#',
      '#............................#',
      '#....*....C..........C......E#',
      '#.....C......................#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 8], [27, 8]], speed: 66 },
      { waypoints: [[27, 10], [2, 10]], speed: 62 },
      { waypoints: [[3, 12], [26, 12]], speed: 64 },
      { waypoints: [[22, 2], [22, 17]], speed: 55 },
      { waypoints: [[4, 2], [4, 17]], speed: 55 },
    ],
  },
];

/** Parse a level definition into a playable level object. */
export function parseLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  let start = { x: 1.5 * TILE, y: 1.5 * TILE };
  let exit = { x: 28.5 * TILE, y: 13.5 * TILE };
  const shards = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = grid[r][c];
      if (ch === 'S') start = { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
      if (ch === 'E') exit = { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
      if (ch === '*') shards.push({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE, taken: false });
    }
  }
  return {
    name: def.name,
    intro: def.intro,
    grid,
    start,
    exit,
    shards,
    guardDefs: def.guards,
  };
}

/** The tile character at a pixel position (out of bounds counts as wall). */
export function tileAt(level, px, py) {
  const c = Math.floor(px / TILE);
  const r = Math.floor(py / TILE);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return '.............................#';
  return level.grid[r][c];
}

/** Whether a tile blocks movement (wall or crate). */
export function isSolidTile(ch) {
  return ch === '.............................#' || ch === 'C';
}

/** Whether a tile blocks a guard's line of sight (wall or crate). */
export function blocksSightTile(ch) {
  return ch === '.............................#' || ch === 'C';
}

/** Whether a pixel position is inside a bush (hides the courier). */
export function isBushAt(level, px, py) {
  return tileAt(level, px, py) === 'B';
}

/** Whether a circle of radius r at (px,py) overlaps any solid tile. */
export function circleHitsSolid(level, px, py, r) {
  for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r], [0, -r], [0, r], [-r, 0], [r, 0]]) {
    if (isSolidTile(tileAt(level, px + ox, py + oy))) return true;
  }
  return false;
}

/**
 * Line of sight between two points: sample along the segment and fail
 * when a sample lands inside a sight-blocking tile.
 */
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 7));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (blocksSightTile(tileAt(level, x0 + dx * t, y0 + dy * t))) return false;
  }
  return true;
}

/** Tile-center pixel coordinates for a tile. */
export function tileCenter(c, r) {
  return { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
}
