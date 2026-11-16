// Seeded random numbers for ROOTBOUND. Every gameplay roll goes through one
// of these so a seed always replays the same game (screenshots, replays and
// the deterministic ?shot= scenes all depend on it). Never Math.random in
// game logic: the only unseeded numbers are cosmetic audio wobble.
/** mulberry32: small, fast, good-enough seeded PRNG. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A tiny RNG object with the helpers the game needs. */
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    /** Float in [min, max). */
    range(min, max) {
      return min + next() * (max - min);
    },
    /** Integer in [min, max] inclusive. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** Pick one element of an array. */
    pick(array) {
      return array[Math.floor(next() * array.length)];
    },
    /** Fisher-Yates shuffle, in place, seeded. */
    shuffle(array) {
      for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
      }
      return array;
    },
  };
}
