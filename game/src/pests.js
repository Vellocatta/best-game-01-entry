// ROOTBOUND — pests: spawning, walking the dirt path, slowing, and what
// happens when one reaches the Heartseed. A pest is a distance along the
// path plus a little sideways wobble; bosses are pests with a name and a
// health bar of their own.
import {
  BOSS_TYPES, PEST_TYPES, seasonForWave,
} from './config.js';
import { damageHeart, pathLength, pointOnPath } from './garden.js';

function hpScale(wave) {
  return 1 + 0.16 * (wave - 1);
}

function speedScale(wave) {
  return 1 + 0.02 * (wave - 1);
}

/** Spawn one pest of `key` at `distance` along the path. */
export function spawnPest(state, key, distance = 0, isMinion = false) {
  const def = PEST_TYPES[key] || BOSS_TYPES[key];
  if (!def) return null;
  const boss = Boolean(BOSS_TYPES[key]);
  const season = seasonForWave(state.wave || 1);
  const hp = Math.round(def.hp * hpScale(state.wave || 1) * (boss ? 1 : 1));
  const pest = {
    key,
    name: def.name,
    boss,
    x: 0,
    y: 0,
    distance,
    hp,
    maxHp: hp,
    speed: def.speed * speedScale(state.wave || 1) * season.pestSpeedMul,
    reward: def.reward,
    damage: def.damage,
    radius: def.radius,
    color: def.color,
    dark: def.dark,
    score: def.score,
    zigzag: Boolean(def.zigzag),
    spawnOnDeath: def.spawnOnDeath || null,
    slowUntil: 0,
    slowFactor: 0,
    wobble: state.rng.next() * Math.PI * 2,
    flash: 0,
    dead: false,
    minion: isMinion,
  };
  const pos = pointOnPath(distance);
  pest.x = pos.x;
  pest.y = pos.y;
  state.pests.push(pest);
  if (boss) state.boss = pest;
  return pest;
}

/** Tick every pest: walk, wobble, slow, and arrive at the Heartseed. */
export function updatePests(state, dt) {
  const total = pathLength();
  for (let i = state.pests.length - 1; i >= 0; i -= 1) {
    const pest = state.pests[i];
    if (pest.dead) {
      state.pests.splice(i, 1);
      continue;
    }
    if (pest.flash > 0) pest.flash = Math.max(0, pest.flash - dt * 4);
    let speed = pest.speed;
    if (state.time < pest.slowUntil && pest.slowFactor > 0) {
      speed *= 1 - pest.slowFactor;
    }
    pest.distance += speed * dt;
    pest.wobble += dt * 2.2;
    const pos = pointOnPath(Math.min(pest.distance, total));
    pest.x = pos.x;
    pest.y = pos.y;
    if (pest.zigzag) {
      // Fireflies weave across the path instead of marching straight.
      const perp = Math.sin(pest.wobble * 1.7) * 16;
      pest.y += perp * dt * 4;
    }
    if (pest.distance >= total) {
      // Reached the Heartseed: bite it, then dissolve into the soil.
      state.pests.splice(i, 1);
      if (pest.boss) state.boss = null;
      const died = damageHeart(state, pest.damage);
      if (died) return 'defeat';
    }
  }
  return null;
}

/** How many pests are still alive or waiting to spawn. */
export function pestsRemaining(state) {
  return state.pests.length + state.spawnQueue.length;
}
