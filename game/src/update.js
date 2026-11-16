// ROOTBOUND — one tick of the game: advance the clock, spawn the wave,
// fight, age the effects, and notice when a wave is won or the garden is
// lost. The live loop and the screenshot stager both step through here, so
// a staged shot is the same simulation a player would see.
import { updateParticles } from './garden.js';
import { updatePests } from './pests.js';
import { updatePlants, updateProjectiles } from './plants.js';
import { clearWave, updateSpawning, waveCleared } from './waves.js';
import { SCREEN_BOON, SCREEN_DEFEAT, SCREEN_VICTORY, recordBest } from './state.js';

/**
 * Advance the game by `dt` seconds. Returns 'victory', 'defeat', 'boon' or
 * null. The caller owns the screen transitions; this only reports them.
 */
export function stepGame(state, dt) {
  state.time += dt;
  if (state.bannerTimer > 0) state.bannerTimer -= dt;

  updateSpawning(state, dt);
  updatePlants(state, dt);
  updateProjectiles(state, dt);
  const pestResult = updatePests(state, dt);
  if (pestResult === 'defeat') {
    recordBest(state);
    return 'defeat';
  }
  updateParticles(state, dt);

  if (waveCleared(state)) {
    const outcome = clearWave(state);
    if (outcome === 'victory') {
      recordBest(state);
      return 'victory';
    }
    if (outcome === 'boon') return 'boon';
  }
  return null;
}
