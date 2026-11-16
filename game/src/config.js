// ROOTBOUND — tuning and content tables. One place for every number the
// designers tune: layout, plants, pests, waves, seasons and boons. The game
// reads only these tables, so a balance pass touches this file alone.
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

// --- layout ---------------------------------------------------------------
export const TOP_BAR_HEIGHT = 64;
export const BOTTOM_BAR_HEIGHT = 44;
export const RIGHT_PANEL_X = 992;
export const RIGHT_PANEL_WIDTH = 288;

// Garden grid: 10 columns x 6 rows of soil plots. Rows 0, 2 and 4 are the
// serpentine dirt path (unplantable); rows 1, 3 and 5 are plantable soil.
export const GRID_ORIGIN_X = 36;
export const GRID_ORIGIN_Y = 96;
export const GRID_COLS = 10;
export const GRID_ROWS = 6;
export const CELL = 92;
export const PLOT_GAP = 6;

// The pests' road, as waypoints in canvas pixels. It snakes across rows 0,
// 2 and 4 and ends at the Heartseed.
export const PATH_POINTS = [
  { x: -24, y: 142 },
  { x: 920, y: 142 },
  { x: 920, y: 326 },
  { x: 60, y: 326 },
  { x: 60, y: 510 },
  { x: 772, y: 510 },
];
export const HEARTSEED_POS = { x: 772, y: 510 };
export const PATH_WIDTH = 46;

// --- economy ---------------------------------------------------------------
export const START_DEW = 150;
export const HEARTSEED_MAX_HP = 100;
export const SELL_REFUND = 0.7;
export const WAVE_CLEAR_DEW = 40;
export const WAVE_CLEAR_DEW_PER_WAVE = 10;
export const TOTAL_WAVES = 15;

// --- plants ---------------------------------------------------------------
// growth: a plant earns XP equal to the damage it deals; stage thresholds
// below. Stages raise damage/range and redraw the plant bigger and brighter.
export const GROWTH_XP = [0, 70, 200];
export const PLANT_TYPES = {
  thorn: {
    key: 'thorn',
    name: 'Thornburst',
    hotkey: '1',
    cost: 50,
    color: '#7ddb4a',
    dark: '#3f8f2a',
    blurb: 'Fires sharp thorns at the nearest pest.',
    stages: [
      { damage: 9, rate: 2.0, range: 132, petals: 5 },
      { damage: 14, rate: 2.2, range: 148, petals: 6 },
      { damage: 21, rate: 2.4, range: 165, petals: 8 },
    ],
  },
  sunbloom: {
    key: 'sunbloom',
    name: 'Sunbloom',
    hotkey: '2',
    cost: 60,
    color: '#ffd94a',
    dark: '#b8860b',
    blurb: 'Blooms sun-dew: +dew every 3s. No attack.',
    stages: [
      { dew: 4, rate: 1 / 3, range: 0, petals: 6 },
      { dew: 6, rate: 1 / 3, range: 0, petals: 8 },
      { dew: 9, rate: 1 / 3, range: 0, petals: 10 },
    ],
  },
  spore: {
    key: 'spore',
    name: 'Sporecap',
    hotkey: '3',
    cost: 75,
    color: '#b678e8',
    dark: '#6a3fa0',
    blurb: 'Lobs spore clouds that rot pests over time.',
    stages: [
      { damage: 7, rate: 0.8, range: 152, radius: 56, cloudSecs: 3 },
      { damage: 10, rate: 0.9, range: 165, radius: 66, cloudSecs: 4 },
      { damage: 14, rate: 1.0, range: 180, radius: 78, cloudSecs: 5 },
    ],
  },
  frost: {
    key: 'frost',
    name: 'Frostpetal',
    hotkey: '4',
    cost: 80,
    color: '#8fd8ff',
    dark: '#3a7ca8',
    blurb: 'Chills every pest nearby, slowing them down.',
    stages: [
      { slow: 0.4, rate: 1.0, range: 122, petals: 5 },
      { slow: 0.5, rate: 1.0, range: 136, petals: 6 },
      { slow: 0.6, rate: 1.0, range: 150, petals: 8 },
    ],
  },
  ember: {
    key: 'ember',
    name: 'Emberpod',
    hotkey: '5',
    cost: 120,
    color: '#ff9a3d',
    dark: '#c2571a',
    blurb: 'Hurls bursting embers: big splash damage, slow.',
    stages: [
      { damage: 46, rate: 0.5, range: 172, radius: 70 },
      { damage: 72, rate: 0.55, range: 185, radius: 82 },
      { damage: 105, rate: 0.6, range: 200, radius: 96 },
    ],
  },
};
export const PLANT_ORDER = ['thorn', 'sunbloom', 'spore', 'frost', 'ember'];

// --- pests ----------------------------------------------------------------
// hp scales with the wave: hp * (1 + 0.16 * (wave - 1)). speed scales a touch.
export const PEST_TYPES = {
  aphid: {
    key: 'aphid', name: 'Aphid', hp: 30, speed: 86, reward: 4, damage: 5,
    radius: 13, color: '#9fe870', dark: '#4d8a2f', score: 10,
  },
  mite: {
    key: 'mite', name: 'Mite', hp: 12, speed: 112, reward: 2, damage: 2,
    radius: 8, color: '#d8d8d8', dark: '#777777', score: 5,
  },
  cutworm: {
    key: 'cutworm', name: 'Cutworm', hp: 95, speed: 56, reward: 8, damage: 10,
    radius: 16, color: '#e8a04c', dark: '#8a5a1d', score: 20,
  },
  snail: {
    key: 'snail', name: 'Snail', hp: 230, speed: 33, reward: 12, damage: 15,
    radius: 18, color: '#c9a0dc', dark: '#7a5a8a', score: 30,
  },
  firefly: {
    key: 'firefly', name: 'Firefly', hp: 46, speed: 96, reward: 8, damage: 8,
    radius: 12, color: '#ffe066', dark: '#b8930a', score: 25, zigzag: true,
  },
};
export const BOSS_TYPES = {
  burrower: {
    key: 'burrower', name: 'Burrower King', hp: 950, speed: 42, reward: 120,
    damage: 25, radius: 30, color: '#d97b4f', dark: '#7a3a17', score: 500,
    spawnOnDeath: [['aphid', 3]],
  },
  locust: {
    key: 'locust', name: 'Locust Queen', hp: 1900, speed: 58, reward: 200,
    damage: 30, radius: 32, color: '#e84c6f', dark: '#7a1f38', score: 800,
    spawnOnDeath: [['mite', 6]],
  },
  hollow: {
    key: 'hollow', name: 'The Hollow King', hp: 3600, speed: 46, reward: 320,
    damage: 40, radius: 36, color: '#8a6fd8', dark: '#3d2a6e', score: 1200,
    spawnOnDeath: [['cutworm', 4]],
  },
};

// --- seasons --------------------------------------------------------------
// Seasons rotate every 3 waves and change the rules on screen.
export const SEASONS = [
  {
    key: 'spring', name: 'SPRING', color: '#8fd94a',
    blurb: 'Growth +50% — plants evolve fast.',
    growthMul: 1.5, damageMul: 1, dewMul: 1, pestSpeedMul: 1,
  },
  {
    key: 'summer', name: 'SUMMER', color: '#ffcf3d',
    blurb: 'Damage +25% — thorns and embers bite harder.',
    growthMul: 1, damageMul: 1.25, dewMul: 1, pestSpeedMul: 1,
  },
  {
    key: 'autumn', name: 'AUTUMN', color: '#ff9a3d',
    blurb: 'Bounty x2 — kills pay double sun-dew.',
    growthMul: 1, damageMul: 1, dewMul: 2, pestSpeedMul: 1,
  },
  {
    key: 'winter', name: 'WINTER', color: '#a8d8ff',
    blurb: 'Pests -20% speed, growth -50% — hold the line.',
    growthMul: 0.5, damageMul: 1, dewMul: 1, pestSpeedMul: 0.8,
  },
];
export function seasonForWave(wave) {
  return SEASONS[Math.floor((wave - 1) / 3) % SEASONS.length];
}

// --- waves ----------------------------------------------------------------
// Each wave: a list of [pestKey, count, gapSeconds] groups, spawned in
// order. Boss waves add the boss at the end. Counts stay modest so a wave
// runs ~30-45 seconds.
export const WAVES = [
  { groups: [['aphid', 8, 1.2]] },
  { groups: [['aphid', 12, 1.0]] },
  { groups: [['aphid', 10, 0.9], ['mite', 6, 0.4]] },
  { groups: [['aphid', 12, 0.9], ['cutworm', 4, 1.6]] },
  { groups: [['aphid', 10, 0.8], ['cutworm', 5, 1.4]], boss: 'burrower' },
  { groups: [['mite', 12, 0.35], ['aphid', 12, 0.8], ['cutworm', 5, 1.3]] },
  { groups: [['cutworm', 8, 1.2], ['firefly', 6, 1.0]] },
  { groups: [['aphid', 14, 0.7], ['snail', 3, 2.2], ['firefly', 6, 0.9]] },
  { groups: [['mite', 15, 0.3], ['cutworm', 8, 1.1], ['firefly', 8, 0.8]] },
  { groups: [['cutworm', 10, 1.0], ['snail', 4, 2.0], ['firefly', 8, 0.8]], boss: 'locust' },
  { groups: [['aphid', 16, 0.6], ['mite', 15, 0.3], ['snail', 4, 1.8]] },
  { groups: [['firefly', 12, 0.7], ['cutworm', 10, 0.9], ['snail', 5, 1.8]] },
  { groups: [['mite', 18, 0.3], ['aphid', 16, 0.6], ['firefly', 10, 0.7]] },
  { groups: [['cutworm', 12, 0.9], ['snail', 6, 1.6], ['firefly', 12, 0.7]] },
  { groups: [['aphid', 18, 0.5], ['mite', 18, 0.3], ['cutworm', 12, 0.8], ['snail', 6, 1.5]], boss: 'hollow' },
];

// --- boons ----------------------------------------------------------------
// After waves 3, 6, 9 and 12 the player drafts 1 of 3 boons.
export const BOON_POOL = [
  { key: 'roots', name: 'Deep Roots', blurb: 'All plants +25% range.', color: '#7ddb4a' },
  { key: 'golden', name: 'Golden Dew', blurb: '+150 sun-dew right now.', color: '#ffd94a' },
  { key: 'sprouts', name: 'Swift Sprouts', blurb: 'Growth +60% for the rest of the game.', color: '#8fd94a' },
  { key: 'wind', name: 'Second Wind', blurb: 'Restore 30 Heartseed health.', color: '#ff8a8a' },
  { key: 'soil', name: 'Rich Soil', blurb: 'Kills pay +50% sun-dew.', color: '#e8a04c' },
  { key: 'frostbite', name: 'Frostbite', blurb: 'Frostpetal slows 15% harder.', color: '#8fd8ff' },
  { key: 'thorns', name: 'Long Thorns', blurb: 'Thornburst +30% damage.', color: '#7ddb4a' },
  { key: 'spores', name: 'Spore Bloom', blurb: 'Spore clouds last +50% longer.', color: '#b678e8' },
  { key: 'ember', name: 'Ember Rain', blurb: 'A free Emberpod sprouts on an empty plot.', color: '#ff9a3d' },
  { key: 'heart', name: 'Heartwood', blurb: 'Heartseed +25 max health, healed 25.', color: '#ff6b9d' },
];
export const BOON_WAVES = [3, 6, 9, 12];

// --- palette --------------------------------------------------------------
export const PALETTE = {
  soil: '#4a3524',
  soilDark: '#3a2a1c',
  grass: '#2e5d33',
  grassDark: '#24492a',
  path: '#8a6b45',
  pathDark: '#755a38',
  panel: '#1d2b1f',
  panelEdge: '#3d5a40',
  gold: '#ffd94a',
  dew: '#7dd8ff',
  heart: '#ff6b9d',
  ink: '#f2e8d5',
  dim: '#a8b89a',
};
