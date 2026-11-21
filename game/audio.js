// Synthesized sound effects: everything is WebAudio oscillators, no audio files.
// The game is silent until the first key or click (browsers require a gesture).

let audioCtx = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

/** Create (or reuse) the AudioContext. Call from a user gesture. */
export function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function blip(freq, dur, type, gain, when = 0, slideTo = null) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Soft footstep tick while walking (quiet while sneaking). */
export function playFootstep(sneaking) {
  blip(sneaking ? 140 : 95, 0.05, 'triangle', sneaking ? 0.015 : 0.035);
}

/** A warden grows suspicious: a short rising note. */
export function playSuspicious() {
  blip(330, 0.16, 'sine', 0.06, 0, 440);
}

/** Full alarm: two-note sting when a chase starts. */
export function playAlert() {
  blip(220, 0.18, 'square', 0.05, 0, 330);
  blip(330, 0.22, 'square', 0.05, 0.16, 494);
}

/** Moon shard pickup chime. */
export function playPickup() {
  blip(660, 0.12, 'sine', 0.07);
  blip(990, 0.18, 'sine', 0.06, 0.09);
}

/** Pebble toss: a light tick. */
export function playPebble() {
  blip(520, 0.06, 'triangle', 0.05, 0, 300);
}

/** Level clear: a small rising arpeggio. */
export function playLevelClear() {
  [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'sine', 0.07, i * 0.11));
}

/** Victory: a longer fanfare. */
export function playVictory() {
  [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => blip(f, 0.3, 'sine', 0.07, i * 0.14));
}

/** Caught: a low falling drone. */
export function playCaught() {
  blip(180, 0.5, 'sawtooth', 0.05, 0, 70);
}
