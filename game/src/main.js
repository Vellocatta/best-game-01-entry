// ROOTBOUND — bootstrap and the game loop. The canvas is fixed at
// 1280x720 and fills the window; the simulation runs on a fixed 1/60 s
// step so a seed always replays the same game. In ?shot= mode the scene is
// staged once, rendered once and frozen: the screenshot is one deterministic
// frame, and window.__shotReady tells the capture tool it is there.
import { CANVAS_HEIGHT, CANVAS_WIDTH, TOTAL_WAVES } from './config.js';
import { drawGame } from './render.js';
import { bindInput } from './input.js';
import { createState, resetState, SCREEN_BOON, SCREEN_DEFEAT, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './state.js';
import { tryPlant, sellPlant, plantAt, addFloater, plotCenter } from './garden.js';
import { applyBoon, startWave } from './waves.js';
import { stepGame } from './update.js';
import { stageShot } from './shots.js';
import { setMuted, isMuted, unlockAudio, sfx } from './audio.js';

const STEP = 1 / 60;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number(params.get('seed') || 7) >>> 0;

let state;
let speed = 1;

// --- the controller the input layer calls ---------------------------------
const controller = {
  startGame() {
    unlockAudio();
    resetState(state, (Date.now() % 2147483647) >>> 0);
    sfx.wave();
  },
  togglePause() {
    if (state.screen === SCREEN_PLAY) state.screen = SCREEN_PAUSE;
    else if (state.screen === SCREEN_PAUSE) state.screen = SCREEN_PLAY;
    sfx.click();
  },
  startWave() {
    if (!state.betweenWaves || state.wave >= TOTAL_WAVES) return;
    unlockAudio();
    startWave(state, state.wave + 1);
  },
  selectPlant(key) {
    state.selectedPlant = key;
    state.selectedPlotPlant = null;
    sfx.click();
  },
  plantOnPlot(col, row) {
    const existing = plantAt(state, col, row);
    if (existing) {
      state.selectedPlotPlant = existing;
      sfx.click();
      return;
    }
    state.selectedPlotPlant = null;
    const err = tryPlant(state, col, row, state.selectedPlant);
    if (err) {
      const c = plotCenter(col, row);
      addFloater(state, c.x, c.y - 20, err, '#ff8a8a');
      sfx.error();
    }
  },
  sellSelected() {
    if (!state.selectedPlotPlant) return;
    sellPlant(state, state.selectedPlotPlant);
    state.selectedPlotPlant = null;
  },
  pickBoon(index) {
    if (!state.boonChoices || !state.boonChoices[index]) return;
    const summary = applyBoon(state, state.boonChoices[index]);
    state.banner = { title: summary, sub: `Wave ${state.wave + 1} is coming — press SPACE when ready.` };
    state.bannerTimer = 3.0;
    state.screen = SCREEN_PLAY;
  },
  restart() {
    unlockAudio();
    resetState(state, (Date.now() % 2147483647) >>> 0);
  },
  toggleMute() {
    setMuted(!isMuted());
  },
  toggleSpeed() {
    speed = speed === 1 ? 2 : 1;
    sfx.click();
  },
};

if (shotName) {
  // Screenshot mode: stage, render once, freeze, signal readiness.
  state = stageShot(shotName, shotSeed);
  drawGame(ctx, state);
  window.__shotReady = true;
} else {
  state = createState((Date.now() % 2147483647) >>> 0);
  bindInput(canvas, state, controller);
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    accumulator += elapsed * speed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      if (state.screen === SCREEN_PLAY) {
        const outcome = stepGame(state, STEP);
        if (outcome === 'victory') state.screen = SCREEN_VICTORY;
        else if (outcome === 'defeat') state.screen = SCREEN_DEFEAT;
        else if (outcome === 'boon') state.screen = SCREEN_BOON;
      } else if (state.screen === SCREEN_TITLE || state.screen === SCREEN_VICTORY || state.screen === SCREEN_DEFEAT) {
        state.time += STEP;
      }
    }
    drawGame(ctx, state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
