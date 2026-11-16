// ROOTBOUND — the garden: the plot grid, the dirt path, the Heartseed and
// the sun-dew economy. Plants live on soil plots; pests walk the path; the
// Heartseed is what they are all trying to reach.
import {
  CELL, GRID_COLS, GRID_ORIGIN_X, GRID_ORIGIN_Y, GRID_ROWS, HEARTSEED_POS,
  PATH_POINTS, PATH_WIDTH, PLANT_TYPES, SELL_REFUND,
} from './config.js';
import { sfx } from './audio.js';

export function plotCenter(col, row) {
  return {
    x: GRID_ORIGIN_X + col * CELL + CELL / 2,
    y: GRID_ORIGIN_Y + row * CELL + CELL / 2,
  };
}

export function plotAtPixel(x, y) {
  const col = Math.floor((x - GRID_ORIGIN_X) / CELL);
  const row = Math.floor((y - GRID_ORIGIN_Y) / CELL);
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
  return { col, row };
}

/** Distance from a point to one path segment. */
function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** True when the plot's centre sits on the dirt path (unplantable). */
export function isPathPlot(col, row) {
  const c = plotCenter(col, row);
  for (let i = 0; i < PATH_POINTS.length - 1; i += 1) {
    const a = PATH_POINTS[i];
    const b = PATH_POINTS[i + 1];
    if (distanceToSegment(c.x, c.y, a.x, a.y, b.x, b.y) < PATH_WIDTH / 2 + CELL * 0.28) return true;
  }
  return false;
}

/** True when the plot holds the Heartseed itself. */
export function isHeartseedPlot(col, row) {
  const c = plotCenter(col, row);
  return Math.hypot(c.x - HEARTSEED_POS.x, c.y - HEARTSEED_POS.y) < CELL * 0.62;
}

export function plantKey(col, row) {
  return `${col},${row}`;
}

export function plantAt(state, col, row) {
  return state.plants.get(plantKey(col, row)) || null;
}

/** The full path length, in pixels, for pest travel. */
export function pathLength() {
  let total = 0;
  for (let i = 0; i < PATH_POINTS.length - 1; i += 1) {
    total += Math.hypot(
      PATH_POINTS[i + 1].x - PATH_POINTS[i].x,
      PATH_POINTS[i + 1].y - PATH_POINTS[i].y,
    );
  }
  return total;
}

/** The point `distance` pixels along the path from its start. */
export function pointOnPath(distance) {
  let remaining = distance;
  for (let i = 0; i < PATH_POINTS.length - 1; i += 1) {
    const a = PATH_POINTS[i];
    const b = PATH_POINTS[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= seg) {
      const t = seg === 0 ? 0 : remaining / seg;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= seg;
  }
  const last = PATH_POINTS[PATH_POINTS.length - 1];
  return { x: last.x, y: last.y };
}

/** Try to plant `type` on a plot. Returns an error string, or null. */
export function tryPlant(state, col, row, type) {
  const def = PLANT_TYPES[type];
  if (!def) return 'Unknown plant.';
  if (isHeartseedPlot(col, row)) return 'The Heartseed grows here.';
  if (isPathPlot(col, row)) return 'The dirt path is no place to plant.';
  if (plantAt(state, col, row)) return 'Something already grows here.';
  if (state.dew < def.cost) return `Need ${def.cost} sun-dew.`;
  state.dew -= def.cost;
  const c = plotCenter(col, row);
  state.plants.set(plantKey(col, row), {
    type,
    col,
    row,
    x: c.x,
    y: c.y,
    stage: 0,
    xp: 0,
    cooldown: 0,
    dewTimer: 0,
    flash: 0,
    bornAt: state.time,
    invested: def.cost,
  });
  state.stats.planted += 1;
  burstParticles(state, c.x, c.y, def.color, 10);
  sfx.plant();
  return null;
}

/** Sell a plant back for a refund of its cost. */
export function sellPlant(state, plant) {
  const refund = Math.floor(plant.invested * SELL_REFUND);
  state.dew += refund;
  state.plants.delete(plantKey(plant.col, plant.row));
  burstParticles(state, plant.x, plant.y, '#ffd94a', 8);
  addFloater(state, plant.x, plant.y - 20, `+${refund} dew`, '#ffd94a');
  sfx.coin();
  return refund;
}

/** Earn sun-dew (kills, blooms, bonuses) and count it. */
export function earnDew(state, amount, x, y, silent = false) {
  if (amount <= 0) return;
  state.dew += amount;
  state.dewEarned += amount;
  if (!silent && x !== undefined) addFloater(state, x, y, `+${amount}`, '#ffd94a');
}

/** Damage the Heartseed. Returns true when it dies. */
export function damageHeart(state, amount) {
  state.heartHp = Math.max(0, state.heartHp - amount);
  state.heartFlash = 1;
  state.shake = Math.min(10, state.shake + 6);
  sfx.hurt();
  if (state.heartHp <= 0) return true;
  return false;
}

// --- cosmetic particles ---------------------------------------------------
export function burstParticles(state, x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = state.rng.next() * Math.PI * 2;
    const speed = 30 + state.rng.next() * 90;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0.5 + state.rng.next() * 0.5,
      age: 0,
      size: 2 + state.rng.next() * 3,
      color,
    });
  }
}

export function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color, age: 0, life: 1.1 });
}

export function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 140 * dt;
    if (p.age >= p.life) state.particles.splice(i, 1);
  }
  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const f = state.floaters[i];
    f.age += dt;
    f.y -= 28 * dt;
    if (f.age >= f.life) state.floaters.splice(i, 1);
  }
  if (state.heartFlash > 0) state.heartFlash = Math.max(0, state.heartFlash - dt * 2.5);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
}
