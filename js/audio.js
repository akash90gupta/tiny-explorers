// Audio: text-to-speech, real recorded sounds, and a cancellable playback queue.
//
// Item sounds are real recordings in /sounds (credits in sounds/CREDITS.md).
// An item's `sound` is either a file name ('cow' -> sounds/cow.mp3) or a
// marimba note ('note:3') used for colors and for things that make no sound.
// Recordings are decoded once into Web Audio buffers, so they play instantly.

import { report } from './diagnostics.js';

let ctx = null;
let out = null;
let seq = 0;

const cfg = { voice: true, sounds: true, volume: 0.9 };
const bytes = new Map();   // name -> Promise<ArrayBuffer>
const buffers = new Map(); // name -> Promise<AudioBuffer>
const playing = new Set();

export function configure(settings) {
  cfg.voice = settings.voice;
  cfg.sounds = settings.sounds;
  cfg.volume = settings.volume;
  if (out) out.gain.value = cfg.volume;
}

// iOS only allows audio after a user gesture, so call this from a tap.
export function unlock() {
  // iOS 17+: play through the silent switch, like a video app would.
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = cfg.volume;
    out.connect(ctx.destination);
    const b = ctx.createBufferSource();
    b.buffer = ctx.createBuffer(1, 1, 22050);
    b.connect(ctx.destination);
    b.start(0);
  }
  // Safari uses 'interrupted' after calls, Siri, or backgrounding.
  if (ctx.state !== 'running') ctx.resume().catch((e) => report('audio resume', e));
  if ('speechSynthesis' in window && !unlock.spoke) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
    unlock.spoke = true;
  }
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// No single step may hang the app. If a sound or voice never reports that it
// finished (common on iPad when audio is interrupted), move on anyway.
const STEP_LIMIT_MS = 8000;
const bounded = (p) => Promise.race([Promise.resolve(p).catch((e) => report('audio step', e)), wait(STEP_LIMIT_MS)]);

// Runs steps in order. Starting a new sequence cancels the previous one, so a
// toddler mashing cards never stacks up a pile of overlapping sounds.
// Resolves true if it ran to the end, false if something cut it off.
export async function sequence(steps) {
  const my = ++seq;
  halt();
  await wait(40);
  for (const step of steps) {
    if (my !== seq) return false;
    await bounded(step());
  }
  return my === seq;
}

export function stop() {
  seq++;
  halt();
}

function halt() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  for (const src of playing) { try { src.stop(); } catch {} }
  playing.clear();
}

// ---------- Speech ----------

const VOICE_PREFS = {
  en: ['Samantha', 'Karen', 'Moira', 'Tessa', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Zira'],
  // iPad and Mac ship "Lekha". Chrome has "Google हिन्दी". Windows has Swara or Kalpana.
  hi: ['Lekha', 'Google हिन्दी', 'Microsoft Swara', 'Microsoft Kalpana', 'Kiyara', 'Neel'],
};
const voices = {};

function pickVoice(lang) {
  if (!('speechSynthesis' in window)) return null;
  const all = speechSynthesis.getVoices();
  const prefix = lang === 'hi' ? /^hi/i : /^en/i;
  for (const name of VOICE_PREFS[lang] || []) {
    const v = all.find((x) => x.name.includes(name) && prefix.test(x.lang));
    if (v) return v;
  }
  if (lang === 'hi') return all.find((v) => /^hi/i.test(v.lang)) || null;
  return all.find((v) => /^en[-_]US/i.test(v.lang)) || all.find((v) => /^en/i.test(v.lang)) || null;
}

function voiceFor(lang) {
  if (!voices[lang]) voices[lang] = pickVoice(lang);
  return voices[lang];
}

// True if this device can speak the language (used to warn grown-ups).
export const hasVoice = (lang) => !!voiceFor(lang);

if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.('voiceschanged', () => { for (const k in voices) delete voices[k]; });
}

let speechLang = 'en';
export function setSpeechLang(lang) { speechLang = lang; }

export function speak(text, { rate, pitch = 1.15 } = {}) {
  return new Promise((resolve) => {
    if (!cfg.voice || !text || !('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const lang = speechLang;
    const voice = voiceFor(lang);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = lang === 'hi' ? 'hi-IN' : 'en-US'; }
    u.rate = rate ?? (lang === 'hi' ? 0.78 : 0.82);
    u.pitch = lang === 'hi' ? 1.1 : pitch;
    u.volume = Math.min(1, cfg.volume + 0.1);
    if (speechSynthesis.paused) speechSynthesis.resume();
    let done = false;
    // Some browsers never fire onend, so a timeout guarantees we move on.
    const t = setTimeout(finish, 1500 + text.length * 120);
    function finish() { if (!done) { done = true; clearTimeout(t); resolve(); } }
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.speak(u);
  });
}

// ---------- Recordings ----------

const url = (name) => `sounds/${name}.mp3`;

function fetchBytes(name) {
  if (!bytes.has(name)) {
    bytes.set(name, fetch(url(name)).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))));
  }
  return bytes.get(name);
}

function getBuffer(name) {
  if (!ctx) return Promise.reject(new Error('audio locked'));
  if (!buffers.has(name)) {
    const p = fetchBytes(name)
      // decodeAudioData detaches its input, so hand it a copy.
      .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab.slice(0), res, rej)));
    p.catch((e) => { buffers.delete(name); report(`load sound "${name}"`, e); });
    buffers.set(name, p);
    // Keep at most ~2 themes of decoded audio in memory on iPad.
    while (buffers.size > 24) buffers.delete(buffers.keys().next().value);
  }
  return buffers.get(name);
}

// Warm the cache for a screen's sounds so the first tap plays instantly.
export function preload(names) {
  for (const n of names) {
    if (!n || n.startsWith('note:')) continue;
    fetchBytes(n).catch(() => {});
    if (ctx) getBuffer(n).catch(() => {});
  }
}

async function playFile(name, gain = 1) {
  const buf = await Promise.race([getBuffer(name), wait(5000).then(() => Promise.reject(new Error(`sound "${name}" took too long to load`)))]);
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return new Promise((resolve) => {
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = gain;
    src.buffer = buf;
    src.connect(g);
    g.connect(out);
    playing.add(src);
    let done = false;
    const finish = () => { if (!done) { done = true; playing.delete(src); clearTimeout(t); resolve(); } };
    // onended never fires while the audio context is paused, so also finish on a timer.
    const t = setTimeout(finish, buf.duration * 1000 + 300);
    src.onended = finish;
    src.start();
  });
}

// HTML audio fallback for browsers where Web Audio decoding fails.
function playElement(name) {
  return new Promise((resolve) => {
    const a = new Audio(url(name));
    a.volume = cfg.volume;
    const t = setTimeout(resolve, 6000);
    const end = () => { clearTimeout(t); resolve(); };
    a.onended = end;
    a.onerror = () => { report(`play sound "${name}"`, new Error('audio element error')); end(); };
    a.play().catch(end);
  });
}

// ---------- Marimba ----------
// A struck wooden bar: a few inharmonic partials with fast exponential decay,
// plus a soft mallet click. Sounds like an instrument, not a beep.

const PARTIALS = [[1, 1, 1.0], [3.98, 0.32, 0.38], [10.6, 0.1, 0.12]]; // [ratio, gain, decay scale]
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

function marimba(freq, t = 0, vol = 0.5, length = 1.2) {
  const t0 = ctx.currentTime + t;
  for (const [ratio, g, d] of PARTIALS) {
    const f = freq * ratio;
    if (f > 16000) continue;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    const dur = length * d;
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(vol * g, t0 + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env);
    env.connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
  // mallet click
  const n = ctx.createBufferSource();
  const len = Math.floor(ctx.sampleRate * 0.02);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq * 2;
  const ng = ctx.createGain();
  ng.gain.value = vol * 0.25;
  n.buffer = buf;
  n.connect(bp);
  bp.connect(ng);
  ng.connect(out);
  n.start(t0);
  return t + length * 0.6;
}

const UI = {
  success: () => Math.max(...[0, 2, 4, 5].map((s, i) => marimba(SCALE[s], i * 0.09, 0.42, 0.9))),
  oops: () => Math.max(marimba(SCALE[2] / 2, 0, 0.35, 0.8), marimba(SCALE[0] / 2, 0.16, 0.35, 0.9)),
  sparkle: () => Math.max(...[5, 7, 9].map((s, i) => marimba(SCALE[s], i * 0.07, 0.3, 0.8))),
};

// ---------- Public API ----------

export async function sfx(key) {
  if (!ctx || !cfg.sounds || !(await ready())) return;
  if (UI[key]) return wait(UI[key]() * 1000);
  return playFile(key).catch(() => playElement(key));
}

// Try to wake a paused audio engine. Resolves true if sound can play now.
async function ready() {
  if (!ctx) return false;
  if (ctx.state === 'running') return true;
  try { await Promise.race([ctx.resume(), wait(300)]); } catch {}
  return ctx.state === 'running';
}

export async function playItemSound(item) {
  if (!cfg.sounds || !item.sound || !ctx) return;
  // If audio can't play (paused by iPad, or never unlocked), skip instead of waiting.
  if (!(await ready())) return;
  if (item.sound.startsWith('note:')) {
    const i = Number(item.sound.slice(5)) % SCALE.length;
    return wait(marimba(SCALE[i], 0, 0.5, 1.4) * 1000 + 200);
  }
  try {
    await playFile(item.sound);
  } catch {
    await playElement(item.sound);
  }
}

// Recovery: throw away the audio engine and start fresh on the next tap.
export function reset() {
  stop();
  try { ctx?.close(); } catch {}
  ctx = null;
  out = null;
  buffers.clear();
  unlock.spoke = false;
}

// Wake audio back up after the app returns from the background.
export function resume() {
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}

export const state = () => (ctx ? ctx.state : 'locked');
