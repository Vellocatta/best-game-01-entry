// ROOTBOUND — the game state: everything that changes while playing, in one
// object the update and render code share. Fresh states come from
// createState(seed); best score and best wave persist in localStorage.
import {
  GRID_COLS, GRID_ROWS, HEARTSEED_MAX_HP, START_DEW, TOTAL_WAVES,
} from './config.js';
import { makeRng } from './rng.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_BOON = 'boon';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_DEFEAT = 'defeat';

const BEST_KEY = 'rootbound.best.v1';

export function loadBest() {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    if (!raw) return { score: 0, wave: 0 };
    const parsed = JSON.parse(raw);
    return {
      score: Number(parsed.score) || 0,
      wave: Number(parsed.wave) || 0,
    };
  } catch {
    return { score: 0, wave: 0 };
  }
}

export function saveBest(best) {
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // Storage may be unavailable (private mode, sandbox): the game plays on.
  }
}

/** A fresh state for a new run. `seed` drives every gameplay roll. */
export function createState(seed) {
  return {
    seed,
    rng: makeRng(seed),
    screen: SCREEN_TITLE,
    time: 0,
    // Economy and score.
    dew: START_DEW,
    score: 0,
    kills: 0,
    dewEarned: 0,
    // The garden: plants[sparse grid], keyed "col,row".
    plants: new Map(),
    projectiles: [],
    clouds: [],
    particles: [],
    floaters: [],
    // The pests: live list plus the spawn queue of the running wave.
    pests: [],
    spawnQueue: [],
    spawnTimer: 0,
    // Waves and seasons.
    wave: 0,
    waveActive: false,
    waveClearTimer: 0,
    betweenWaves: true,
    boons: [],
    boonChoices: null,
    boonDraftWave: 0,
    // The Heartseed.
    heartHp: HEARTSEED_MAX_HP,
    heartMaxHp: HEARTSEED_MAX_HP,
    heartFlash: 0,
    shake: 0,
    // Boss of the current wave, if any is alive.
    boss: null,
    // Selection and UI state.
    selectedPlant: 'thorn',
    hoverPlot: null,
    hoverPlant: null,
    selectedPlotPlant: null,
    banner: null,
    bannerTimer: 0,
    // Stats for the results screen.
    stats: { pests: 0, bosses: 0, planted: 0, grown: 0 },
    // Best results, loaded once per run.
    best: loadBest(),
    // Multipliers from boons (start at 1, drafts raise them).
    mods: {
      rangeMul: 1,
      growthMul: 1,
      dewMul: 1,
      frostMul: 1,
      thornMul: 1,
      sporeSecsMul: 1,
    },
  };
}

/** Reset a state in place for a new run (keeps the same seed source). */
export function resetState(state, seed) {
  const fresh = createState(seed);
  fresh.best = state.best;
  Object.keys(fresh).forEach((key) => {
    state[key] = fresh[key];
  });
  state.screen = SCREEN_PLAY;
}

/** Record a finished run against the persisted best. */
export function recordBest(state) {
  const best = {
    score: Math.max(state.best.score, state.score),
    wave: Math.max(state.best.wave, state.wave),
  };
  state.best = best;
  saveBest(best);
  return best;
}

export { TOTAL_WAVES };
