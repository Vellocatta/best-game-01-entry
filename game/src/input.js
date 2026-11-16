// ROOTBOUND — input: mouse clicks on the canvas and keyboard shortcuts,
// translated into game actions. Hit-testing reuses the renderer's own
// layout (panelLayout, boonCardRects) so a click never lands somewhere the
// drawing says it does not.
import { CANVAS_HEIGHT, CANVAS_WIDTH, PLANT_TYPES } from './config.js';
import { plotAtPixel } from './garden.js';
import { boonCardRects, panelLayout } from './render.js';
import { SCREEN_BOON, SCREEN_DEFEAT, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './state.js';

function inside(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function canvasPos(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
    y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
  };
}

/**
 * Wire mouse and keyboard to the game.
 * `api` is the controller main.js provides: startGame, togglePause,
 * startWave, selectPlant, plantOnPlot, selectPlotPlant, sellSelected,
 * pickBoon, restart, toggleMute, toggleSpeed.
 */
export function bindInput(canvas, state, api) {
  canvas.addEventListener('click', (event) => {
    const { x, y } = canvasPos(canvas, event.clientX, event.clientY);
    handleClick(state, api, x, y);
  });

  canvas.addEventListener('mousemove', (event) => {
    const { x, y } = canvasPos(canvas, event.clientX, event.clientY);
    state.hoverPlot = state.screen === SCREEN_PLAY ? plotAtPixel(x, y) : null;
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    handleKey(state, api, event.key);
  });
}

function handleClick(state, api, x, y) {
  if (state.screen === SCREEN_TITLE) {
    api.startGame();
    return;
  }
  if (state.screen === SCREEN_PAUSE) {
    api.togglePause();
    return;
  }
  if (state.screen === SCREEN_BOON) {
    const rects = boonCardRects();
    for (let i = 0; i < rects.length; i += 1) {
      if (inside(x, y, rects[i])) {
        api.pickBoon(i);
        return;
      }
    }
    return;
  }
  if (state.screen === SCREEN_VICTORY || state.screen === SCREEN_DEFEAT) return;
  if (state.screen !== SCREEN_PLAY) return;

  // Build cards in the right panel.
  const layout = panelLayout(state);
  for (const card of layout.buildCards) {
    if (inside(x, y, card)) {
      api.selectPlant(card.key);
      return;
    }
  }
  // Sell button for the selected plant.
  if (layout.sellButton && inside(x, y, layout.sellButton)) {
    api.sellSelected();
    return;
  }
  // A garden plot: plant, or select the plant already there.
  const plot = plotAtPixel(x, y);
  if (plot) {
    api.plantOnPlot(plot.col, plot.row);
    return;
  }
  // Anywhere else: clear the plot selection.
  state.selectedPlotPlant = null;
}

function handleKey(state, api, key) {
  const lower = key.toLowerCase();
  if (state.screen === SCREEN_TITLE) {
    if (lower === ' ' || lower === 'enter') api.startGame();
    return;
  }
  if (state.screen === SCREEN_VICTORY || state.screen === SCREEN_DEFEAT) {
    if (lower === 'r') api.restart();
    return;
  }
  if (state.screen === SCREEN_BOON) {
    if (lower === '1' || lower === '2' || lower === '3') api.pickBoon(Number(lower) - 1);
    return;
  }
  if (lower === 'p' || lower === 'escape') {
    api.togglePause();
    return;
  }
  if (lower === 'm') {
    api.toggleMute();
    return;
  }
  if (state.screen !== SCREEN_PLAY) return;
  if (lower === ' ') {
    api.startWave();
    return;
  }
  if (lower === 'f') {
    api.toggleSpeed();
    return;
  }
  if (lower === 'x') {
    api.sellSelected();
    return;
  }
  for (const plantKey of Object.keys(PLANT_TYPES)) {
    if (lower === PLANT_TYPES[plantKey].hotkey) {
      api.selectPlant(plantKey);
      return;
    }
  }
}
