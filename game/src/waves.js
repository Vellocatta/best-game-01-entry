// ROOTBOUND — waves: building the spawn queue for a wave, running it, and
// the boon draft between waves. A wave is a list of pest groups; the boss,
// when the wave has one, walks in last.
import {
  BOON_POOL, BOON_WAVES, TOTAL_WAVES, WAVES, WAVE_CLEAR_DEW,
  WAVE_CLEAR_DEW_PER_WAVE, seasonForWave,
} from './config.js';
import { spawnPest } from './pests.js';
import { earnDew, isHeartseedPlot, isPathPlot, tryPlant } from './garden.js';
import { sfx } from './audio.js';

/** Build the spawn queue for `wave` (1-based) into state. */
export function buildWaveQueue(state, wave) {
  const def = WAVES[wave - 1];
  const queue = [];
  for (const [key, count, gap] of def.groups) {
    for (let i = 0; i < count; i += 1) {
      queue.push({ key, at: 0, gap });
    }
  }
  // Stagger the queue: each entry spawns `gap` seconds after the previous.
  let t = 0.5;
  for (const entry of queue) {
    entry.at = t;
    t += entry.gap;
  }
  if (def.boss) queue.push({ key: def.boss, at: t + 2.0, gap: 0, boss: true });
  return queue;
}

/** Start wave `wave`: banner, season note, spawn queue, boss warning. */
export function startWave(state, wave) {
  state.wave = wave;
  state.waveActive = true;
  state.betweenWaves = false;
  state.spawnQueue = buildWaveQueue(state, wave);
  state.spawnTimer = 0;
  const season = seasonForWave(wave);
  const def = WAVES[wave - 1];
  state.banner = {
    title: `WAVE ${wave} / ${TOTAL_WAVES}`,
    sub: def.boss
      ? `${season.name} — ${season.blurb}  ·  BOSS: ${def.boss.toUpperCase()}`
      : `${season.name} — ${season.blurb}`,
  };
  state.bannerTimer = 2.6;
  if (def.boss) sfx.boss();
  else sfx.wave();
}

/** Tick the spawn queue while a wave runs. */
export function updateSpawning(state, dt) {
  if (!state.waveActive) return;
  state.spawnTimer += dt;
  while (state.spawnQueue.length > 0 && state.spawnQueue[0].at <= state.spawnTimer) {
    const entry = state.spawnQueue.shift();
    spawnPest(state, entry.key, 0);
  }
}

/** True when the running wave has no one left to spawn or kill. */
export function waveCleared(state) {
  return state.waveActive && state.spawnQueue.length === 0 && state.pests.length === 0;
}

/** Pay the wave-clear bonus and open the boon draft when the wave earns one. */
export function clearWave(state) {
  state.waveActive = false;
  const bonus = WAVE_CLEAR_DEW + WAVE_CLEAR_DEW_PER_WAVE * state.wave;
  earnDew(state, bonus, 640, 200);
  state.score += 100 * state.wave;
  sfx.clear();
  if (state.wave >= TOTAL_WAVES) return 'victory';
  if (BOON_WAVES.includes(state.wave)) {
    state.boonDraftWave = state.wave;
    state.boonChoices = draftBoons(state);
    return 'boon';
  }
  state.betweenWaves = true;
  return 'between';
}

/** Pick 3 distinct boons the player has not taken yet, if any remain. */
export function draftBoons(state) {
  const taken = new Set(state.boons.map((b) => b.key));
  const available = BOON_POOL.filter((b) => !taken.has(b.key));
  const pool = available.length >= 3 ? available : BOON_POOL;
  const shuffled = state.rng.shuffle([...pool]);
  return shuffled.slice(0, 3);
}

/** Apply a drafted boon. Returns a one-line summary for the banner. */
export function applyBoon(state, boon) {
  state.boons.push(boon);
  state.boonChoices = null;
  state.betweenWaves = true;
  switch (boon.key) {
    case 'roots':
      state.mods.rangeMul *= 1.25;
      break;
    case 'golden':
      earnDew(state, 150, 640, 200, true);
      break;
    case 'sprouts':
      state.mods.growthMul *= 1.6;
      break;
    case 'wind':
      state.heartHp = Math.min(state.heartMaxHp, state.heartHp + 30);
      break;
    case 'soil':
      state.mods.dewMul *= 1.5;
      break;
    case 'frostbite':
      state.mods.frostMul *= 1.15;
      break;
    case 'thorns':
      state.mods.thornMul *= 1.3;
      break;
    case 'spores':
      state.mods.sporeSecsMul *= 1.5;
      break;
    case 'ember': {
      const plantable = [];
      for (let col = 0; col < 10; col += 1) {
        for (let row = 0; row < 6; row += 1) {
          const key = `${col},${row}`;
          if (!state.plants.has(key) && !isPathPlot(col, row) && !isHeartseedPlot(col, row)) {
            plantable.push({ col, row });
          }
        }
      }
      if (plantable.length > 0) {
        const spot = state.rng.pick(plantable);
        const err = tryPlant(state, spot.col, spot.row, 'ember');
        if (err) {
          // Fall back to dew if the plot refused for any reason.
          earnDew(state, 120, 640, 200, true);
        } else {
          // The free plant costs nothing: refund what tryPlant charged.
          state.dew += 120;
        }
      } else {
        earnDew(state, 120, 640, 200, true);
      }
      break;
    }
    case 'heart':
      state.heartMaxHp += 25;
      state.heartHp = Math.min(state.heartMaxHp, state.heartHp + 25);
      break;
    default:
      break;
  }
  sfx.boon();
  return `${boon.name} — ${boon.blurb}`;
}
