// ROOTBOUND — plants: what each one does every tick, how it grows, and the
// projectiles and spore clouds it leaves behind. A plant's stage comes from
// the damage it has dealt, so a plant that fights grows visibly on screen.
import { GROWTH_XP, PLANT_TYPES, seasonForWave } from './config.js';
import { burstParticles, earnDew } from './garden.js';
import { spawnPest } from './pests.js';
import { sfx } from './audio.js';

function stageOf(plant) {
  if (plant.xp >= GROWTH_XP[2]) return 2;
  if (plant.xp >= GROWTH_XP[1]) return 1;
  return 0;
}

function stageDef(plant) {
  return PLANT_TYPES[plant.type].stages[plant.stage];
}

function rangeOf(state, plant) {
  return stageDef(plant).range * state.mods.rangeMul;
}

/** Grant XP from damage dealt; grow a stage with a chime when it lands. */
function grantXp(state, plant, amount) {
  if (amount <= 0) return;
  const before = plant.stage;
  plant.xp += amount * seasonForWave(state.wave || 1).growthMul * state.mods.growthMul;
  plant.stage = stageOf(plant);
  if (plant.stage > before) {
    state.stats.grown += 1;
    burstParticles(state, plant.x, plant.y - 10, PLANT_TYPES[plant.type].color, 14);
    sfx.grow();
  }
}

function nearestPestInRange(state, x, y, range) {
  let best = null;
  let bestDist = Infinity;
  for (const pest of state.pests) {
    if (pest.dead) continue;
    const d = Math.hypot(pest.x - x, pest.y - y);
    if (d <= range && d < bestDist) {
      best = pest;
      bestDist = d;
    }
  }
  return best;
}

function damageMultiplier(state) {
  return seasonForWave(state.wave || 1).damageMul;
}

/** Apply damage to a pest from a plant; returns the damage actually dealt. */
export function damagePest(state, pest, amount, sourcePlant) {
  if (pest.dead) return 0;
  const dealt = Math.min(pest.hp, amount);
  pest.hp -= amount;
  pest.flash = 1;
  if (sourcePlant) grantXp(state, sourcePlant, dealt);
  if (pest.hp <= 0) {
    pest.dead = true;
    killPest(state, pest);
  }
  return dealt;
}

function killPest(state, pest) {
  const season = seasonForWave(state.wave || 1);
  const reward = Math.round(pest.reward * season.dewMul * state.mods.dewMul);
  earnDew(state, reward, pest.x, pest.y - 14);
  state.score += pest.score;
  state.kills += 1;
  state.stats.pests += 1;
  burstParticles(state, pest.x, pest.y, pest.color, pest.boss ? 26 : 10);
  sfx.kill();
  if (pest.boss) {
    state.stats.bosses += 1;
    state.score += 250;
    state.boss = null;
    if (pest.spawnOnDeath) {
      for (const [key, count] of pest.spawnOnDeath) {
        for (let i = 0; i < count; i += 1) {
          spawnMinion(state, pest, key);
        }
      }
    }
  }
}

function spawnMinion(state, parent, key) {
  // Minions crawl out of the fallen boss, a little behind on the path.
  spawnPest(state, key, Math.max(0, parent.distance - 60 - state.rng.next() * 80), true);
}

function updateThorn(state, plant, dt) {
  const def = stageDef(plant);
  plant.cooldown -= dt;
  if (plant.cooldown > 0) return;
  const target = nearestPestInRange(state, plant.x, plant.y, rangeOf(state, plant));
  if (!target) return;
  plant.cooldown = 1 / def.rate;
  plant.flash = 1;
  const damage = def.damage * damageMultiplier(state) * state.mods.thornMul;
  state.projectiles.push({
    kind: 'thorn',
    x: plant.x,
    y: plant.y - 14,
    target,
    speed: 520,
    damage,
    source: plant,
    color: PLANT_TYPES.thorn.color,
  });
  sfx.shoot();
}

function updateSunbloom(state, plant, dt) {
  const def = stageDef(plant);
  plant.dewTimer += dt;
  if (plant.dewTimer >= 1 / def.rate) {
    plant.dewTimer = 0;
    plant.flash = 1;
    earnDew(state, def.dew, plant.x, plant.y - 24, true);
    burstParticles(state, plant.x, plant.y - 18, '#ffd94a', 3);
    if (state.rng.next() < 0.3) sfx.coin();
  }
}

function updateSpore(state, plant, dt) {
  const def = stageDef(plant);
  plant.cooldown -= dt;
  if (plant.cooldown > 0) return;
  const target = nearestPestInRange(state, plant.x, plant.y, rangeOf(state, plant));
  if (!target) return;
  plant.cooldown = 1 / def.rate;
  plant.flash = 1;
  const damage = def.damage * damageMultiplier(state);
  state.projectiles.push({
    kind: 'spore',
    x: plant.x,
    y: plant.y - 14,
    target,
    speed: 300,
    damage,
    radius: def.radius,
    cloudSecs: def.cloudSecs * state.mods.sporeSecsMul,
    source: plant,
    color: PLANT_TYPES.spore.color,
  });
}

function updateFrost(state, plant) {
  // Frostpetal needs no cooldown: it chills everything in range, always.
  const def = stageDef(plant);
  const range = rangeOf(state, plant);
  const slow = Math.min(0.75, def.slow * state.mods.frostMul);
  for (const pest of state.pests) {
    if (pest.dead) continue;
    if (Math.hypot(pest.x - plant.x, pest.y - plant.y) <= range) {
      pest.slowUntil = state.time + 0.25;
      pest.slowFactor = Math.max(pest.slowFactor || 0, slow);
    }
  }
}

function updateEmber(state, plant, dt) {
  const def = stageDef(plant);
  plant.cooldown -= dt;
  if (plant.cooldown > 0) return;
  const target = nearestPestInRange(state, plant.x, plant.y, rangeOf(state, plant));
  if (!target) return;
  plant.cooldown = 1 / def.rate;
  plant.flash = 1;
  const damage = def.damage * damageMultiplier(state);
  state.projectiles.push({
    kind: 'ember',
    x: plant.x,
    y: plant.y - 14,
    target,
    speed: 380,
    damage,
    radius: def.radius,
    source: plant,
    color: PLANT_TYPES.ember.color,
  });
  sfx.shoot();
}

/** Tick every plant once. */
export function updatePlants(state, dt) {
  for (const plant of state.plants.values()) {
    if (plant.flash > 0) plant.flash = Math.max(0, plant.flash - dt * 4);
    if (plant.type === 'thorn') updateThorn(state, plant, dt);
    else if (plant.type === 'sunbloom') updateSunbloom(state, plant, dt);
    else if (plant.type === 'spore') updateSpore(state, plant, dt);
    else if (plant.type === 'frost') updateFrost(state, plant);
    else if (plant.type === 'ember') updateEmber(state, plant, dt);
  }
}

/** Tick projectiles and spore clouds. */
export function updateProjectiles(state, dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const p = state.projectiles[i];
    if (!p.target || p.target.dead) {
      state.projectiles.splice(i, 1);
      continue;
    }
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const dist = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (dist <= step + 10) {
      if (p.kind === 'thorn') {
        damagePest(state, p.target, p.damage, p.source);
        burstParticles(state, p.target.x, p.target.y, p.color, 4);
        sfx.hit();
      } else if (p.kind === 'spore') {
        state.clouds.push({
          x: p.target.x, y: p.target.y, radius: p.radius,
          damage: p.damage, age: 0, life: p.cloudSecs, source: p.source,
          color: p.color, tick: 0,
        });
        burstParticles(state, p.target.x, p.target.y, p.color, 8);
      } else if (p.kind === 'ember') {
        burstParticles(state, p.target.x, p.target.y, p.color, 14);
        for (const pest of state.pests) {
          if (pest.dead) continue;
          if (Math.hypot(pest.x - p.target.x, pest.y - p.target.y) <= p.radius) {
            damagePest(state, pest, p.damage, p.source);
          }
        }
        sfx.hit();
      }
      state.projectiles.splice(i, 1);
      continue;
    }
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
  }
  for (let i = state.clouds.length - 1; i >= 0; i -= 1) {
    const c = state.clouds[i];
    c.age += dt;
    c.tick += dt;
    if (c.tick >= 0.5) {
      c.tick = 0;
      for (const pest of state.pests) {
        if (pest.dead) continue;
        if (Math.hypot(pest.x - c.x, pest.y - c.y) <= c.radius) {
          damagePest(state, pest, c.damage * 0.5, c.source);
        }
      }
    }
    if (c.age >= c.life) state.clouds.splice(i, 1);
  }
}
