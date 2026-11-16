// ROOTBOUND — the deterministic screenshot scenes behind ?shot=title|play|
// boon|victory. Each scene is a real game state rendered by the same code
// the player sees: the play scene simulates the live rules forward from a
// composed mid-game garden, the others compose a valid end-of-phase state.
// The same seed always gives the same frame.
import { PLANT_TYPES } from './config.js';
import { createState, SCREEN_BOON, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './state.js';
import { spawnPest } from './pests.js';
import { draftBoons, startWave } from './waves.js';
import { stepGame } from './update.js';

const STEP = 1 / 60;

/** Place a plant directly, bypassing cost (shot staging only). */
function placeDirect(state, col, row, type, stage) {
  const c = { x: 36 + col * 92 + 46, y: 96 + row * 92 + 46 };
  const xp = [0, 70, 200][stage];
  state.plants.set(`${col},${row}`, {
    type,
    col,
    row,
    x: c.x,
    y: c.y,
    stage,
    xp,
    cooldown: 0,
    dewTimer: 0,
    flash: 0,
    bornAt: 0,
    invested: PLANT_TYPES[type].cost,
  });
}

function titleShot(state) {
  // A garden already in bloom behind the title.
  placeDirect(state, 2, 1, 'sunbloom', 2);
  placeDirect(state, 5, 1, 'thorn', 1);
  placeDirect(state, 8, 1, 'frost', 2);
  placeDirect(state, 1, 3, 'thorn', 2);
  placeDirect(state, 4, 3, 'spore', 1);
  placeDirect(state, 7, 3, 'ember', 2);
  placeDirect(state, 3, 5, 'sunbloom', 1);
  placeDirect(state, 6, 5, 'thorn', 2);
  placeDirect(state, 8, 5, 'spore', 2);
  state.best = { score: 12400, wave: 8 };
  state.screen = SCREEN_TITLE;
  state.time = 3.2;
}

function playShot(state) {
  // Mid-wave 5 (summer, boss on the road): a strong garden, the Burrower
  // King walking in, thorns already flying.
  placeDirect(state, 2, 1, 'thorn', 2);
  placeDirect(state, 4, 1, 'sunbloom', 1);
  placeDirect(state, 6, 1, 'frost', 1);
  placeDirect(state, 8, 1, 'thorn', 2);
  placeDirect(state, 1, 3, 'sunbloom', 2);
  placeDirect(state, 3, 3, 'thorn', 2);
  placeDirect(state, 5, 3, 'spore', 2);
  placeDirect(state, 7, 3, 'ember', 2);
  placeDirect(state, 2, 5, 'thorn', 1);
  placeDirect(state, 5, 5, 'ember', 2);
  placeDirect(state, 7, 5, 'spore', 1);
  placeDirect(state, 8, 5, 'sunbloom', 1);
  state.dew = 212;
  state.score = 2840;
  state.kills = 96;
  state.wave = 5;
  state.waveActive = true;
  state.betweenWaves = false;
  state.spawnQueue = [];
  state.spawnTimer = 0;
  // Pests already on the road at staggered distances.
  const distances = [260, 420, 610, 780, 950, 1120, 1300, 1480, 1660, 1840, 2050, 2260];
  const kinds = ['aphid', 'aphid', 'cutworm', 'aphid', 'mite', 'aphid', 'cutworm', 'aphid', 'mite', 'cutworm', 'aphid', 'aphid'];
  for (let i = 0; i < distances.length; i += 1) {
    spawnPest(state, kinds[i], distances[i]);
  }
  spawnPest(state, 'burrower', 120);
  state.screen = SCREEN_PLAY;
  // Let the fight run for 3 seconds so projectiles, clouds and particles
  // are live in the frame.
  for (let i = 0; i < 180; i += 1) stepGame(state, STEP);
  state.banner = { title: 'WAVE 5 / 15', sub: 'SUMMER — Damage +25%  ·  BOSS: BURROWER KING' };
  state.bannerTimer = 2.6;
  state.screen = SCREEN_PLAY;
}

function boonShot(state) {
  // Just cleared wave 6: the draft is open, three cards on the table.
  placeDirect(state, 2, 1, 'thorn', 2);
  placeDirect(state, 4, 1, 'sunbloom', 2);
  placeDirect(state, 6, 1, 'frost', 1);
  placeDirect(state, 1, 3, 'thorn', 2);
  placeDirect(state, 5, 3, 'spore', 2);
  placeDirect(state, 7, 3, 'ember', 2);
  placeDirect(state, 3, 5, 'sunbloom', 1);
  state.dew = 340;
  state.score = 5120;
  state.kills = 148;
  state.wave = 6;
  state.waveActive = false;
  state.betweenWaves = false;
  state.boonDraftWave = 6;
  state.boonChoices = draftBoons(state);
  state.boons = [{ key: 'roots', name: 'Deep Roots', blurb: 'All plants +25% range.', color: '#7ddb4a' }];
  state.screen = SCREEN_BOON;
  state.time = 2.0;
}

function victoryShot(state) {
  // The garden after wave 15: elders everywhere, the results on screen.
  placeDirect(state, 2, 1, 'thorn', 2);
  placeDirect(state, 4, 1, 'sunbloom', 2);
  placeDirect(state, 6, 1, 'frost', 2);
  placeDirect(state, 8, 1, 'thorn', 2);
  placeDirect(state, 1, 3, 'thorn', 2);
  placeDirect(state, 3, 3, 'spore', 2);
  placeDirect(state, 5, 3, 'ember', 2);
  placeDirect(state, 7, 3, 'frost', 2);
  placeDirect(state, 2, 5, 'ember', 2);
  placeDirect(state, 5, 5, 'sunbloom', 2);
  placeDirect(state, 8, 5, 'thorn', 2);
  state.dew = 486;
  state.score = 48200;
  state.kills = 412;
  state.wave = 15;
  state.waveActive = false;
  state.heartHp = 62;
  state.stats = { pests: 412, bosses: 3, planted: 21, grown: 14 };
  state.dewEarned = 2840;
  state.boons = [
    { key: 'roots', name: 'Deep Roots', blurb: '', color: '#7ddb4a' },
    { key: 'soil', name: 'Rich Soil', blurb: '', color: '#e8a04c' },
    { key: 'thorns', name: 'Long Thorns', blurb: '', color: '#7ddb4a' },
    { key: 'wind', name: 'Second Wind', blurb: '', color: '#ff8a8a' },
  ];
  state.screen = SCREEN_VICTORY;
  state.time = 1.5;
}

/**
 * Stage the named scene into a fresh state and return it. Any other name
 * stages the title.
 */
export function stageShot(name, seed) {
  const state = createState(seed);
  if (name === 'play') playShot(state);
  else if (name === 'boon') boonShot(state);
  else if (name === 'victory') victoryShot(state);
  else titleShot(state);
  return state;
}

export { startWave };
