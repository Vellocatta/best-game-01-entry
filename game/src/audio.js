// ROOTBOUND — all sound is procedural WebAudio: no audio files, nothing to
// load over the network. The context starts only after the player's first
// gesture (browsers block audio before that), and every call is guarded so
// the game runs fine with sound off or unavailable.
let ctx = null;
let master = null;
let musicGain = null;
let muted = false;
let musicTimer = null;
let musicStep = 0;

// A calm pentatonic line the music scheduler walks through.
const MUSIC_SCALE = [0, 3, 5, 7, 10, 12, 15, 12, 10, 7, 5, 3];
const MUSIC_ROOT = 220; // A3

function ensureContext() {
  if (ctx) return ctx;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Call from the first user gesture. Starts the context and the music. */
export function unlockAudio() {
  const c = ensureContext();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  startMusic();
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  if (master && ctx) master.gain.setValueAtTime(muted ? 0 : 0.5, ctx.currentTime);
}

function tone(freq, duration, type, volume, when = 0, slideTo = null) {
  const c = ensureContext();
  if (!c || muted) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noiseBurst(duration, volume, lowpass) {
  const c = ensureContext();
  if (!c || muted) return;
  const t0 = c.currentTime;
  const length = Math.max(1, Math.floor(c.sampleRate * duration));
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = c.createBufferSource();
  source.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = c.createGain();
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(t0);
}

// --- one-shot effects -----------------------------------------------------
export const sfx = {
  plant() {
    tone(520, 0.12, 'sine', 0.25, 0, 780);
    tone(780, 0.1, 'triangle', 0.12, 0.05);
  },
  shoot() {
    tone(880, 0.06, 'square', 0.06, 0, 440);
  },
  hit() {
    noiseBurst(0.06, 0.12, 1800);
  },
  kill() {
    tone(660, 0.1, 'sine', 0.2, 0, 990);
    tone(990, 0.14, 'sine', 0.14, 0.06, 1320);
  },
  coin() {
    tone(1320, 0.09, 'sine', 0.16, 0, 1760);
  },
  hurt() {
    tone(180, 0.25, 'sawtooth', 0.22, 0, 90);
    noiseBurst(0.15, 0.18, 700);
  },
  wave() {
    tone(392, 0.16, 'triangle', 0.22);
    tone(523, 0.16, 'triangle', 0.22, 0.12);
    tone(659, 0.24, 'triangle', 0.22, 0.24);
  },
  clear() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.18, i * 0.09));
  },
  boon() {
    [784, 988, 1175].forEach((f, i) => tone(f, 0.2, 'sine', 0.2, i * 0.08));
  },
  boss() {
    tone(110, 0.7, 'sawtooth', 0.2, 0, 55);
    tone(165, 0.7, 'sawtooth', 0.14, 0.1, 82);
  },
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.2, i * 0.12));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'triangle', 0.18, i * 0.16));
  },
  click() {
    tone(700, 0.05, 'sine', 0.12);
  },
  error() {
    tone(220, 0.12, 'square', 0.1, 0, 160);
  },
  grow() {
    tone(440, 0.14, 'sine', 0.16, 0, 880);
  },
};

// --- music ----------------------------------------------------------------
function musicNote() {
  const c = ensureContext();
  if (!c || muted || !musicGain) return;
  const step = MUSIC_SCALE[musicStep % MUSIC_SCALE.length];
  musicStep += 1;
  const freq = MUSIC_ROOT * Math.pow(2, step / 12);
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(0.5, t0 + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.4);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start(t0);
  osc.stop(t0 + 1.5);
  // A soft fifth below, every fourth note, for warmth.
  if (musicStep % 4 === 0) {
    const osc2 = c.createOscillator();
    const gain2 = c.createGain();
    osc2.type = 'triangle';
    osc2.frequency.value = freq / 2;
    gain2.gain.setValueAtTime(0, t0);
    gain2.gain.linearRampToValueAtTime(0.18, t0 + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, t0 + 1.8);
    osc2.connect(gain2);
    gain2.connect(musicGain);
    osc2.start(t0);
    osc2.stop(t0 + 1.9);
  }
}

function startMusic() {
  if (musicTimer !== null) return;
  musicTimer = window.setInterval(musicNote, 620);
}
