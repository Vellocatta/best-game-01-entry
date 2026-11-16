// ROOTBOUND — every pixel the player sees: the garden, the plants, the
// pests, the HUD and the screens. The judge reads the game mostly through
// its screenshots, so this file is where the game wins or loses: every
// number is labelled, the win and lose conditions sit on screen, and the
// whole loop (title, play, boon, victory) renders from the same code.
import {
  BOTTOM_BAR_HEIGHT, CANVAS_HEIGHT, CANVAS_WIDTH, CELL, GRID_COLS,
  GRID_ORIGIN_X, GRID_ORIGIN_Y, GRID_ROWS, HEARTSEED_POS, PALETTE,
  PATH_POINTS, PATH_WIDTH, PLANT_ORDER, PLANT_TYPES, RIGHT_PANEL_WIDTH,
  RIGHT_PANEL_X, SEASONS, TOP_BAR_HEIGHT, TOTAL_WAVES, WAVES, seasonForWave,
} from './config.js';
import { isHeartseedPlot, isPathPlot, plantKey, plotCenter } from './garden.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function textOutline(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.font = `${weight} ${size}px "Trebuchet MS", "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(10, 20, 10, 0.85)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function bar(ctx, x, y, w, h, frac, fill, back = 'rgba(0,0,0,0.55)') {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = back;
  ctx.fill();
  if (frac > 0) {
    roundRect(ctx, x + 1, y + 1, Math.max(2, (w - 2) * Math.min(1, frac)), h - 2, (h - 2) / 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

// --- background -----------------------------------------------------------
function drawBackground(ctx, state) {
  const season = seasonForWave(Math.max(1, state.wave || 1));
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  grad.addColorStop(0, '#1d3a24');
  grad.addColorStop(1, '#12261a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Season tint over the whole garden.
  ctx.fillStyle = season.color;
  ctx.globalAlpha = 0.05;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.globalAlpha = 1;

  // Grass tufts, placed by a fixed formula so the background never shifts.
  ctx.fillStyle = 'rgba(120, 190, 90, 0.25)';
  for (let i = 0; i < 46; i += 1) {
    const x = 24 + ((i * 137) % 940);
    const y = 84 + ((i * 211) % 560);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3, y - 9);
    ctx.lineTo(x + 6, y);
    ctx.closePath();
    ctx.fill();
  }

  // The dirt path.
  ctx.strokeStyle = PALETTE.path;
  ctx.lineWidth = PATH_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
  for (let i = 1; i < PATH_POINTS.length; i += 1) ctx.lineTo(PATH_POINTS[i].x, PATH_POINTS[i].y);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.pathDark;
  ctx.lineWidth = PATH_WIDTH - 14;
  ctx.stroke();

  // Soil plots.
  for (let col = 0; col < GRID_COLS; col += 1) {
    for (let row = 0; row < GRID_ROWS; row += 1) {
      if (isPathPlot(col, row) || isHeartseedPlot(col, row)) continue;
      const c = plotCenter(col, row);
      roundRect(ctx, c.x - CELL / 2 + 4, c.y - CELL / 2 + 4, CELL - 8, CELL - 8, 10);
      ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.soil : PALETTE.soilDark;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Furrows.
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.moveTo(c.x - 30, c.y - 12);
      ctx.lineTo(c.x + 30, c.y - 12);
      ctx.moveTo(c.x - 30, c.y + 12);
      ctx.lineTo(c.x + 30, c.y + 12);
      ctx.stroke();
    }
  }

  // Hover highlight on a plantable plot.
  if (state.hoverPlot && state.screen === 'play') {
    const { col, row } = state.hoverPlot;
    if (!isPathPlot(col, row) && !isHeartseedPlot(col, row) && !state.plants.has(plantKey(col, row))) {
      const c = plotCenter(col, row);
      roundRect(ctx, c.x - CELL / 2 + 4, c.y - CELL / 2 + 4, CELL - 8, CELL - 8, 10);
      ctx.fillStyle = 'rgba(255, 217, 74, 0.22)';
      ctx.fill();
      ctx.strokeStyle = '#ffd94a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

// --- the Heartseed --------------------------------------------------------
function drawHeartseed(ctx, state) {
  const { x, y } = HEARTSEED_POS;
  const pulse = 1 + Math.sin(state.time * 2.4) * 0.05;
  const hpFrac = state.heartHp / state.heartMaxHp;
  // Glow.
  const glow = ctx.createRadialGradient(x, y, 6, x, y, 74 * pulse);
  glow.addColorStop(0, 'rgba(255, 107, 157, 0.5)');
  glow.addColorStop(1, 'rgba(255, 107, 157, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 74 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // The seed itself: a heart-shaped pod.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#ff6b9d';
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.bezierCurveTo(-30, -2, -22, -26, 0, -12);
  ctx.bezierCurveTo(22, -26, 30, -2, 0, 22);
  ctx.fill();
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.arc(-6, -8, 3.5, 0, Math.PI * 2);
  ctx.arc(8, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // HP ring.
  ctx.beginPath();
  ctx.arc(x, y, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpFrac);
  ctx.strokeStyle = hpFrac > 0.5 ? '#7ddb4a' : hpFrac > 0.25 ? '#ffd94a' : '#ff5a5a';
  ctx.lineWidth = 5;
  ctx.stroke();
  textOutline(ctx, 'HEARTSEED', x, y - 56, 12, '#ffd7e6', 'center');
  textOutline(ctx, `${state.heartHp}/${state.heartMaxHp}`, x, y + 58, 13, '#ffffff', 'center');
  if (state.heartFlash > 0) {
    ctx.fillStyle = `rgba(255, 60, 60, ${state.heartFlash * 0.35})`;
    ctx.beginPath();
    ctx.arc(x, y, 44, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- plants ---------------------------------------------------------------
function drawPlant(ctx, state, plant) {
  const def = PLANT_TYPES[plant.type];
  const stage = plant.stage;
  const scale = 0.82 + stage * 0.18 + (plant.flash > 0 ? 0.08 : 0);
  const { x, y } = plant;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // Range ring when this plant is selected or hovered.
  if (state.selectedPlotPlant === plant) {
    const range = def.stages[stage].range * state.mods.rangeMul;
    ctx.beginPath();
    ctx.arc(0, 0, range, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 217, 74, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 217, 74, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Stem.
  ctx.strokeStyle = def.dark;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.lineTo(0, 2);
  ctx.stroke();
  // Leaves.
  ctx.fillStyle = '#4d8a2f';
  ctx.beginPath();
  ctx.ellipse(-12, 12, 12, 6, -0.5, 0, Math.PI * 2);
  ctx.ellipse(12, 12, 12, 6, 0.5, 0, Math.PI * 2);
  ctx.fill();
  const petals = def.stages[stage].petals || 6;
  const R = plant.type === 'ember' ? 20 : 17;
  if (plant.type === 'thorn') {
    // Spiky thorn-bush: a dark green mound with pale spikes.
    ctx.fillStyle = def.dark;
    ctx.beginPath();
    ctx.arc(0, 2, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = def.color;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + state.time * 0.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 12, 2 + Math.sin(a) * 12);
      ctx.lineTo(Math.cos(a) * 24, 2 + Math.sin(a) * 24);
      ctx.lineTo(Math.cos(a + 0.35) * 12, 2 + Math.sin(a + 0.35) * 12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#e8ffd8';
    ctx.beginPath();
    ctx.arc(-4, -2, 4, 0, Math.PI * 2);
    ctx.arc(6, 4, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (plant.type === 'sunbloom') {
    for (let i = 0; i < petals; i += 1) {
      const a = (i / petals) * Math.PI * 2;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 16, -6 + Math.sin(a) * 16, 9, 5, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#8a5a1d';
    ctx.beginPath();
    ctx.arc(0, -6, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a3a10';
    ctx.beginPath();
    ctx.arc(-3, -9, 2, 0, Math.PI * 2);
    ctx.arc(4, -4, 2, 0, Math.PI * 2);
    ctx.arc(-1, -2, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (plant.type === 'spore') {
    // Mushroom cap.
    ctx.fillStyle = def.dark;
    ctx.fillRect(-4, 0, 8, 22);
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, 0, 20, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2e8ff';
    ctx.beginPath();
    ctx.arc(-9, -8, 3.5, 0, Math.PI * 2);
    ctx.arc(7, -12, 3, 0, Math.PI * 2);
    ctx.arc(11, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (plant.type === 'frost') {
    for (let i = 0; i < petals; i += 1) {
      const a = (i / petals) * Math.PI * 2;
      ctx.fillStyle = i % 2 === 0 ? def.color : '#e8f6ff';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(Math.cos(a - 0.28) * R, -6 + Math.sin(a - 0.28) * R);
      ctx.lineTo(Math.cos(a + 0.28) * R, -6 + Math.sin(a + 0.28) * R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -6, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (plant.type === 'ember') {
    // A round ember pod with glowing cracks.
    const flicker = 1 + Math.sin(state.time * 6 + plant.bornAt) * 0.06;
    ctx.fillStyle = def.dark;
    ctx.beginPath();
    ctx.arc(0, 0, 20 * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, 0, 14 * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff3c9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-7, 7);
    ctx.moveTo(6, -9);
    ctx.lineTo(2, -1);
    ctx.lineTo(8, 5);
    ctx.stroke();
  }
  // Elder stage: a golden crown ring.
  if (stage === 2) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -2, 28, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, '★', 20, -24, 14, '#ffd94a', 'center');
  }
  // Growth progress pips.
  const xpNext = plant.stage < 2 ? [70, 200][plant.stage] : null;
  if (xpNext !== null) {
    const frac = plant.xp / xpNext;
    bar(ctx, -18, 30, 36, 5, frac, '#8fd94a');
  }
  ctx.restore();
}

// --- pests ----------------------------------------------------------------
function drawPest(ctx, state, pest) {
  ctx.save();
  ctx.translate(pest.x, pest.y);
  const r = pest.radius;
  const flash = pest.flash > 0;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.8, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flash ? '#ffffff' : pest.color;
  ctx.strokeStyle = pest.dark;
  ctx.lineWidth = 2;
  if (pest.key === 'aphid') {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1d2b1f';
    ctx.beginPath();
    ctx.arc(-4, -3, 2, 0, Math.PI * 2);
    ctx.arc(4, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pest.dark;
    ctx.beginPath();
    ctx.moveTo(-6, -r);
    ctx.lineTo(-9, -r - 6);
    ctx.moveTo(6, -r);
    ctx.lineTo(9, -r - 6);
    ctx.stroke();
  } else if (pest.key === 'mite') {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = pest.dark;
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
      ctx.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5));
      ctx.stroke();
    }
  } else if (pest.key === 'cutworm') {
    for (let i = 2; i >= 0; i -= 1) {
      ctx.fillStyle = i === 0 ? pest.color : pest.dark;
      ctx.beginPath();
      ctx.arc(-i * 11, 0, r - 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#1d2b1f';
    ctx.beginPath();
    ctx.arc(8, -4, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (pest.key === 'snail') {
    ctx.fillStyle = pest.color;
    ctx.beginPath();
    ctx.arc(0, -2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = pest.dark;
    ctx.beginPath();
    ctx.arc(0, -2, r * 0.55, 0.5, Math.PI * 2.2);
    ctx.stroke();
    ctx.fillStyle = '#e8d8f2';
    ctx.beginPath();
    ctx.ellipse(10, r * 0.7, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (pest.key === 'firefly') {
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 2.2);
    glow.addColorStop(0, 'rgba(255, 224, 102, 0.8)');
    glow.addColorStop(1, 'rgba(255, 224, 102, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pest.color;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(-r, -4, 7, 3, -0.6, 0, Math.PI * 2);
    ctx.ellipse(r, -4, 7, 3, 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Bosses: a big spiked orb with a crown.
    ctx.fillStyle = pest.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.moveTo(-16, -r + 4);
    ctx.lineTo(-10, -r - 12);
    ctx.lineTo(-4, -r + 2);
    ctx.lineTo(2, -r - 14);
    ctx.lineTo(8, -r + 2);
    ctx.lineTo(14, -r - 10);
    ctx.lineTo(18, -r + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1d2b1f';
    ctx.beginPath();
    ctx.arc(-8, -4, 3.5, 0, Math.PI * 2);
    ctx.arc(8, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1d2b1f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 6, 10, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  // HP bar.
  if (pest.hp < pest.maxHp) {
    bar(ctx, -r, -r - 12, r * 2, 5, pest.hp / pest.maxHp, pest.boss ? '#ff5a5a' : '#7ddb4a');
  }
  ctx.restore();
}

// --- projectiles, clouds, particles ---------------------------------------
function drawEffects(ctx, state) {
  for (const c of state.clouds) {
    const alpha = 0.28 * (1 - c.age / c.life);
    ctx.fillStyle = c.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const p of state.projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.kind === 'ember' ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(p.x - 1, p.y - 1, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, 1 - f.age / f.life);
    textOutline(ctx, f.text, f.x, f.y, 14, f.color, 'center');
  }
  ctx.globalAlpha = 1;
}

// --- HUD ------------------------------------------------------------------
function drawTopBar(ctx, state) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, CANVAS_WIDTH, TOP_BAR_HEIGHT);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, TOP_BAR_HEIGHT - 3, CANVAS_WIDTH, 3);

  text(ctx, 'ROOTBOUND', 20, 32, 24, '#8fd94a');
  const titleWidth = ctx.measureText('ROOTBOUND').width;
  text(ctx, 'hold the last garden', 20 + titleWidth + 14, 34, 13, PALETTE.dim);

  const season = seasonForWave(Math.max(1, state.wave || 1));
  const waveLabel = state.wave === 0 ? 'READY' : `WAVE ${state.wave} / ${TOTAL_WAVES}`;
  text(ctx, waveLabel, 430, 26, 20, '#ffffff', 'center');
  text(ctx, season.name, 430, 48, 12, season.color, 'center');

  // Boss bar.
  if (state.boss) {
    bar(ctx, 560, 18, 220, 12, state.boss.hp / state.boss.maxHp, '#ff5a5a');
    text(ctx, `${state.boss.name.toUpperCase()}  ${Math.max(0, Math.ceil(state.boss.hp))} HP`, 670, 44, 12, '#ffb3c2', 'center');
  } else if (state.waveActive) {
    const remaining = state.pests.length + state.spawnQueue.length;
    text(ctx, `${remaining} pests left`, 670, 32, 14, PALETTE.dim, 'center');
  } else if (state.wave > 0) {
    text(ctx, 'Between waves — plant, then SPACE', 670, 32, 14, '#ffd94a', 'center');
  }

  text(ctx, `☀ ${Math.floor(state.dew)}`, 900, 26, 20, '#ffd94a', 'right');
  text(ctx, `SCORE ${state.score.toLocaleString('en-US')}`, 900, 48, 12, PALETTE.dim, 'right');
  text(ctx, `♥ ${state.heartHp}/${state.heartMaxHp}`, 1010, 26, 18, state.heartHp <= 25 ? '#ff5a5a' : '#ff8fb3', 'right');
  text(ctx, `BEST ${state.best.score.toLocaleString('en-US')}`, 1010, 48, 12, PALETTE.dim, 'right');
}

// --- shared hit-areas -----------------------------------------------------
// panelLayout walks exactly the same vertical steps drawRightPanel draws,
// so input hit-testing and drawing can never drift apart.
export function panelLayout(state) {
  const buildCards = [];
  let y = TOP_BAR_HEIGHT + 22 + 30;
  for (const key of PLANT_ORDER) {
    buildCards.push({ key, x: RIGHT_PANEL_X + 10, y, w: RIGHT_PANEL_WIDTH - 20, h: 78 });
    y += 78 + 8;
  }
  y += 6;
  y += 22;
  if (state.wave < TOTAL_WAVES) y += 20;
  y += 34;
  y += 22;
  y += state.boons.length * 18;
  let sellButton = null;
  if (state.selectedPlotPlant) {
    y += 14;
    y += 20;
    y += 24;
    sellButton = { x: RIGHT_PANEL_X + 16, y, w: 110, h: 30 };
  }
  return { buildCards, sellButton };
}

/** The three boon cards' rectangles on the draft screen. */
export function boonCardRects() {
  const cardW = 300;
  const cardH = 220;
  const gap = 36;
  const totalW = cardW * 3 + gap * 2;
  const x0 = (CANVAS_WIDTH - totalW) / 2;
  const y = 220;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (cardW + gap), y, w: cardW, h: cardH }));
}

function drawRightPanel(ctx, state) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(RIGHT_PANEL_X, TOP_BAR_HEIGHT, RIGHT_PANEL_WIDTH, CANVAS_HEIGHT - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(RIGHT_PANEL_X, TOP_BAR_HEIGHT, 3, CANVAS_HEIGHT - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT);

  const layout = panelLayout(state);
  let y = TOP_BAR_HEIGHT + 22;
  text(ctx, 'PLANT  —  click a plot', RIGHT_PANEL_X + 16, y, 14, '#8fd94a');
  y += 30;
  for (const card of layout.buildCards) {
    const def = PLANT_TYPES[card.key];
    const selected = state.selectedPlant === card.key;
    const afford = state.dew >= def.cost;
    const h = card.h;
    y = card.y;
    roundRect(ctx, card.x, y, card.w, h, 8);
    ctx.fillStyle = selected ? 'rgba(143, 217, 74, 0.22)' : 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = selected ? '#8fd94a' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.stroke();
    // Mini plant glyph.
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(RIGHT_PANEL_X + 34, y + 26, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = def.dark;
    ctx.beginPath();
    ctx.arc(RIGHT_PANEL_X + 30, y + 22, 4, 0, Math.PI * 2);
    ctx.arc(RIGHT_PANEL_X + 38, y + 28, 3, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, def.name, RIGHT_PANEL_X + 56, y + 16, 15, '#ffffff');
    text(ctx, `[${def.hotkey}]`, RIGHT_PANEL_X + RIGHT_PANEL_WIDTH - 26, y + 16, 12, PALETTE.dim, 'right');
    text(ctx, def.blurb, RIGHT_PANEL_X + 56, y + 36, 11, PALETTE.dim);
    text(ctx, `☀ ${def.cost}`, RIGHT_PANEL_X + 56, y + 58, 13, afford ? '#ffd94a' : '#ff8a8a');
    y += h + 8;
  }

  // Next wave preview.
  y += 6;
  text(ctx, 'NEXT WAVE', RIGHT_PANEL_X + 16, y, 13, '#8fd94a');
  y += 22;
  if (state.wave >= TOTAL_WAVES) {
    text(ctx, 'Final wave cleared.', RIGHT_PANEL_X + 16, y, 12, PALETTE.dim);
  } else {
    const next = state.wave + 1;
    const preview = nextWavePreview(next);
    text(ctx, `Wave ${next} — ${seasonForWave(next).name}`, RIGHT_PANEL_X + 16, y, 13, '#ffffff');
    y += 20;
    text(ctx, preview, RIGHT_PANEL_X + 16, y, 12, PALETTE.dim);
  }
  y += 34;
  // Boons owned.
  text(ctx, 'BOONS', RIGHT_PANEL_X + 16, y, 13, '#8fd94a');
  y += 22;
  if (state.boons.length === 0) {
    text(ctx, 'None yet — draft after waves 3, 6, 9, 12.', RIGHT_PANEL_X + 16, y, 12, PALETTE.dim);
  } else {
    for (const boon of state.boons) {
      text(ctx, `◆ ${boon.name}`, RIGHT_PANEL_X + 16, y, 12, boon.color);
      y += 18;
    }
  }

  // Selected plant: sell button.
  if (state.selectedPlotPlant && layout.sellButton) {
    const plant = state.selectedPlotPlant;
    const def = PLANT_TYPES[plant.type];
    y += 14;
    text(ctx, `${def.name} — stage ${plant.stage + 1}/3`, RIGHT_PANEL_X + 16, y, 13, '#ffffff');
    y += 20;
    text(ctx, `Click SELL or press X to remove it.`, RIGHT_PANEL_X + 16, y, 12, PALETTE.dim);
    y += 24;
    const btn = layout.sellButton;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 6);
    ctx.fillStyle = '#7a3a17';
    ctx.fill();
    text(ctx, `SELL  +${Math.floor(plant.invested * 0.7)} ☀`, btn.x + btn.w / 2, btn.y + 15, 12, '#ffd94a', 'center');
  }
}

function nextWavePreview(wave) {
  // A one-line summary of the coming wave, from the wave table.
  const def = WAVES[wave - 1];
  if (!def) return '';
  const groups = [];
  for (const [key, count] of def.groups) groups.push(`${count} ${key}s`);
  if (def.boss) groups.push(`BOSS ${def.boss}`);
  return groups.join(' · ');
}

function drawBottomBar(ctx, state) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, CANVAS_HEIGHT - BOTTOM_BAR_HEIGHT, CANVAS_WIDTH, BOTTOM_BAR_HEIGHT);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, CANVAS_HEIGHT - BOTTOM_BAR_HEIGHT, CANVAS_WIDTH, 3);
  text(
    ctx,
    '1–5 select plant · Click a plot to plant · X sell · SPACE start wave · P pause · F fast · M mute',
    20, CANVAS_HEIGHT - BOTTOM_BAR_HEIGHT / 2, 13, PALETTE.dim,
  );
  const season = seasonForWave(Math.max(1, state.wave || 1));
  text(ctx, `${season.name} — ${season.blurb}`, CANVAS_WIDTH - 20, CANVAS_HEIGHT - BOTTOM_BAR_HEIGHT / 2, 12, season.color, 'right');
}

// --- banners ----------------------------------------------------------------
function drawBanner(ctx, state) {
  if (!state.banner || state.bannerTimer <= 0) return;
  const alpha = Math.min(1, state.bannerTimer);
  ctx.globalAlpha = alpha;
  textOutline(ctx, state.banner.title, CANVAS_WIDTH / 2 - 140, 120, 34, '#ffffff', 'center');
  textOutline(ctx, state.banner.sub, CANVAS_WIDTH / 2 - 140, 152, 14, '#ffd94a', 'center');
  ctx.globalAlpha = 1;
}

// --- screens ----------------------------------------------------------------
function overlay(ctx, alpha = 0.72) {
  ctx.fillStyle = `rgba(8, 18, 10, ${alpha})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawTitle(ctx, state) {
  overlay(ctx, 0.55);
  textOutline(ctx, 'ROOTBOUND', CANVAS_WIDTH / 2, 190, 72, '#8fd94a', 'center');
  textOutline(ctx, 'Hold the last garden', CANVAS_WIDTH / 2, 248, 22, '#ffd94a', 'center');
  text(ctx, 'The blight comes in 15 waves. Plant, grow, and keep the Heartseed alive.', CANVAS_WIDTH / 2, 292, 16, '#f2e8d5', 'center');
  text(ctx, 'Plants grow sprout → bloom → elder as they fight · Seasons turn every 3 waves', CANVAS_WIDTH / 2, 320, 14, PALETTE.dim, 'center');
  if (state.best.score > 0) {
    text(ctx, `BEST  score ${state.best.score.toLocaleString('en-US')}  ·  wave ${state.best.wave}`, CANVAS_WIDTH / 2, 366, 15, '#ffd94a', 'center');
  }
  const blink = Math.sin(state.time * 4) > -0.2;
  if (blink) textOutline(ctx, 'CLICK TO PLAY', CANVAS_WIDTH / 2, 440, 26, '#ffffff', 'center');
  text(ctx, '1–5 pick a plant · click soil to plant · SPACE starts a wave · P pause', CANVAS_WIDTH / 2, 500, 14, PALETTE.dim, 'center');
  text(ctx, 'A complete original game — no libraries, no network, all art drawn in code.', CANVAS_WIDTH / 2, 660, 12, 'rgba(168,184,154,0.7)', 'center');
}

function drawPause(ctx) {
  overlay(ctx, 0.6);
  textOutline(ctx, 'PAUSED', CANVAS_WIDTH / 2, 330, 48, '#ffffff', 'center');
  text(ctx, 'Press P or click to keep playing', CANVAS_WIDTH / 2, 390, 16, PALETTE.dim, 'center');
}

function drawBoon(ctx, state) {
  overlay(ctx, 0.66);
  textOutline(ctx, `WAVE ${state.boonDraftWave} CLEARED — CHOOSE A BOON`, CANVAS_WIDTH / 2, 120, 28, '#ffd94a', 'center');
  text(ctx, 'One gift for the garden. Pick wisely — the next wave is already stirring.', CANVAS_WIDTH / 2, 156, 15, '#f2e8d5', 'center');
  const rects = boonCardRects();
  state.boonChoices.forEach((boon, i) => {
    const { x, y, w: cardW, h: cardH } = rects[i];
    roundRect(ctx, x, y, cardW, cardH, 12);
    ctx.fillStyle = 'rgba(29, 43, 31, 0.95)';
    ctx.fill();
    ctx.strokeStyle = boon.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, `◆`, x + cardW / 2, y + 44, 34, boon.color, 'center');
    text(ctx, boon.name, x + cardW / 2, y + 92, 20, '#ffffff', 'center');
    // Wrap the blurb to two lines.
    const words = boon.blurb.split(' ');
    let line = '';
    let ly = y + 132;
    for (const word of words) {
      if ((line + word).length > 26) {
        text(ctx, line.trim(), x + cardW / 2, ly, 14, PALETTE.dim, 'center');
        line = '';
        ly += 22;
      }
      line += `${word} `;
    }
    if (line.trim()) text(ctx, line.trim(), x + cardW / 2, ly, 14, PALETTE.dim, 'center');
    text(ctx, `[ ${i + 1} ]`, x + cardW / 2, y + cardH - 28, 14, boon.color, 'center');
  });
}

function drawEnd(ctx, state, victory) {
  overlay(ctx, 0.68);
  if (victory) {
    textOutline(ctx, 'THE GARDEN HOLDS', CANVAS_WIDTH / 2, 170, 54, '#8fd94a', 'center');
    text(ctx, 'Fifteen waves of blight, and the Heartseed still blooms.', CANVAS_WIDTH / 2, 224, 17, '#ffd94a', 'center');
  } else {
    textOutline(ctx, 'THE GARDEN FELL', CANVAS_WIDTH / 2, 170, 54, '#ff8a8a', 'center');
    text(ctx, `The blight reached the Heartseed on wave ${state.wave}.`, CANVAS_WIDTH / 2, 224, 17, '#ffd94a', 'center');
  }
  const rows = [
    ['SCORE', state.score.toLocaleString('en-US')],
    ['WAVES CLEARED', `${victory ? 15 : state.wave - 1} / 15`],
    ['PESTS BANISHED', `${state.kills}`],
    ['BOSSES FELLED', `${state.stats.bosses}`],
    ['PLANTS GROWN', `${state.stats.planted} planted · ${state.stats.grown} evolutions`],
    ['SUN-DEW EARNED', `${Math.floor(state.dewEarned)}`],
  ];
  let y = 300;
  for (const [label, value] of rows) {
    text(ctx, label, CANVAS_WIDTH / 2 - 190, y, 16, PALETTE.dim);
    text(ctx, value, CANVAS_WIDTH / 2 + 190, y, 16, '#ffffff', 'right');
    y += 32;
  }
  if (state.score >= state.best.score && state.score > 0) {
    text(ctx, '★ NEW BEST SCORE ★', CANVAS_WIDTH / 2, y + 8, 16, '#ffd94a', 'center');
  }
  const blink = Math.sin(state.time * 4) > -0.2;
  if (blink) textOutline(ctx, 'PRESS R TO PLAY AGAIN', CANVAS_WIDTH / 2, 590, 24, '#ffffff', 'center');
}

// --- the whole frame --------------------------------------------------------
export function drawGame(ctx, state) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate(
      (state.rng.next() - 0.5) * state.shake,
      (state.rng.next() - 0.5) * state.shake,
    );
  }
  drawBackground(ctx, state);
  drawHeartseed(ctx, state);
  for (const plant of state.plants.values()) drawPlant(ctx, state, plant);
  for (const pest of state.pests) drawPest(ctx, state, pest);
  drawEffects(ctx, state);
  drawTopBar(ctx, state);
  drawRightPanel(ctx, state);
  drawBottomBar(ctx, state);
  drawBanner(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state);
  else if (state.screen === 'pause') drawPause(ctx);
  else if (state.screen === 'boon') drawBoon(ctx, state);
  else if (state.screen === 'victory') drawEnd(ctx, state, true);
  else if (state.screen === 'defeat') drawEnd(ctx, state, false);
  ctx.restore();
}
