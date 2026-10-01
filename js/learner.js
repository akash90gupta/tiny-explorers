// The learning engine. Everything runs on-device and is stored in localStorage.
//
// 1. Bayesian Knowledge Tracing (BKT): each item keeps P(known). A first-try
//    answer is evidence. The guess rate is 1 / number of choices, so a lucky
//    pick out of 2 counts for less than a correct pick out of 4.
// 2. Adaptive selection: the next question is sampled with weights that favor
//    items the child knows least and items not seen recently (spaced practice).
// 3. Curriculum: each module starts with 3 items. A new one unlocks when the
//    active set averages 60% mastery, so new words arrive at the child's pace.
// 4. Confusion-aware distractors: if the child mixes up cow and horse, horse
//    shows up as a wrong answer for cow more often, until the mix-up fades.
// 5. Adaptive difficulty: 2 choices while learning, 3 then 4 as mastery grows.

const KEY = 'tiny-explorers:v1';

export const BKT = { pInit: 0.1, pLearn: 0.18, pSlip: 0.1, exposureGain: 0.04, exposureCap: 0.45 };
const START_UNLOCKED = 3;
const UNLOCK_AT = 0.6;

const DEFAULT_SETTINGS = {
  // Start in Hindi if the device itself is set to Hindi.
  lang: /^hi/i.test(navigator.language || '') ? 'hi' : 'en',
  voice: true,
  sounds: true,
  volume: 0.9,
  maxChoices: 3,
  roundLength: 5,
  toddlerLock: true,
  idleHints: true,
};

let state = load();

function blank() {
  return { v: 1, items: {}, confusion: {}, modules: {}, sessions: [], settings: { ...DEFAULT_SETTINGS } };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { ...blank(), ...s, settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) } };
    }
  } catch { /* private mode or corrupt data: start fresh */ }
  return blank();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}

// ---------- Settings ----------

export const getSettings = () => state.settings;

export function setSetting(key, value) {
  state.settings[key] = value;
  save();
}

// ---------- Per-item and per-module state ----------

export function itemState(item) {
  return (state.items[item.key] ||= { pk: BKT.pInit, seen: 0, attempts: 0, correct: 0, streak: 0, last: 0 });
}

export function modState(mod) {
  return (state.modules[mod.id] ||= { unlocked: Math.min(START_UNLOCKED, mod.items.length), stars: 0, rounds: 0, answered: 0, firstTry: 0 });
}

export const activeItems = (mod) => mod.items.slice(0, modState(mod).unlocked);

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// Mastery across every item in the module, used for the progress meters.
export const moduleMastery = (mod) => mean(mod.items.map((i) => itemState(i).pk));

const activeMastery = (mod) => mean(activeItems(mod).map((i) => itemState(i).pk));

export function masteryLabel(pk) {
  if (pk >= 0.85) return 'knows';
  if (pk >= 0.5) return 'learning';
  return 'new';
}

// ---------- BKT ----------

export function bktUpdate(pk, correct, pGuess) {
  const s = BKT.pSlip;
  const posterior = correct
    ? (pk * (1 - s)) / (pk * (1 - s) + (1 - pk) * pGuess)
    : (pk * s) / (pk * s + (1 - pk) * (1 - pGuess));
  return posterior + (1 - posterior) * BKT.pLearn;
}

// Tapping a card in Learn mode is exposure, not evidence. It nudges P(known)
// up a little, capped so it can never stand in for real answers.
export function recordExposure(item) {
  const s = itemState(item);
  s.seen++;
  if (s.pk < BKT.exposureCap) s.pk = Math.min(BKT.exposureCap, s.pk + BKT.exposureGain * (1 - s.pk));
  save();
}

export function recordAnswer(mod, target, chosen, nChoices, firstAttempt) {
  const s = itemState(target);
  s.last = Date.now();
  // Only first attempts are evidence. Retries after a miss are scaffolding.
  if (!firstAttempt) return save();
  const ms = modState(mod);
  const correct = chosen.key === target.key;
  s.attempts++;
  ms.answered++;
  if (correct) {
    s.correct++;
    s.streak++;
    ms.firstTry++;
  } else {
    s.streak = 0;
    const c = (state.confusion[target.key] ||= {});
    c[chosen.key] = (c[chosen.key] || 0) + 1;
  }
  s.pk = bktUpdate(s.pk, correct, 1 / nChoices);
  save();
}

// ---------- Question selection ----------

function weightedIndex(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

export function numChoices(mod) {
  const m = activeMastery(mod);
  const n = m < 0.45 ? 2 : m < 0.75 ? 3 : 4;
  return Math.max(2, Math.min(n, state.settings.maxChoices, mod.items.length));
}

export function pickTarget(mod, lastKey) {
  const now = Date.now();
  let pool = activeItems(mod);
  if (pool.length > 1) pool = pool.filter((i) => i.key !== lastKey);
  const weights = pool.map((it) => {
    const s = itemState(it);
    const need = 1 - s.pk;
    const hoursAgo = s.last ? (now - s.last) / 3.6e6 : 24;
    const due = Math.min(1, hoursAgo / 24);
    const novelty = s.attempts === 0 ? 0.5 : 0;
    return 0.15 + need + 0.4 * due + novelty;
  });
  return pool[weightedIndex(weights)];
}

export function pickDistractors(mod, target, k) {
  const active = new Set(activeItems(mod).map((i) => i.key));
  const conf = state.confusion[target.key] || {};
  const pool = mod.items
    .filter((i) => i.key !== target.key)
    .map((i) => ({ i, w: (active.has(i.key) ? 1 : 0.35) + Math.min(2, (conf[i.key] || 0) * 0.5) }));
  const picked = [];
  while (picked.length < k && pool.length) {
    const idx = weightedIndex(pool.map((p) => p.w));
    picked.push(pool[idx].i);
    pool.splice(idx, 1);
  }
  return picked;
}

// ---------- Rounds ----------

function maybeUnlock(mod) {
  const ms = modState(mod);
  if (ms.unlocked >= mod.items.length) return null;
  if (activeMastery(mod) < UNLOCK_AT) return null;
  ms.unlocked++;
  return mod.items[ms.unlocked - 1];
}

export function finishRound(mod, firstTry, total) {
  const ms = modState(mod);
  const ratio = total ? firstTry / total : 0;
  // Every finished round earns at least one star. Toddlers should always win.
  const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
  ms.stars += stars;
  ms.rounds++;
  state.sessions.push({ t: Date.now(), mod: mod.id, correct: firstTry, total });
  if (state.sessions.length > 200) state.sessions = state.sessions.slice(-200);
  const unlocked = maybeUnlock(mod);
  save();
  return { stars, unlocked };
}

// ---------- Parent insights ----------

export function topConfusions(limit = 6) {
  const rows = [];
  for (const [target, wrongs] of Object.entries(state.confusion)) {
    for (const [chosen, count] of Object.entries(wrongs)) rows.push({ target, chosen, count });
  }
  return rows.sort((a, b) => b.count - a.count).slice(0, limit);
}

export function totals(modules) {
  const all = modules.flatMap((m) => m.items);
  const st = all.map(itemState);
  const attempts = st.reduce((a, s) => a + s.attempts, 0);
  const correct = st.reduce((a, s) => a + s.correct, 0);
  return {
    rounds: modules.reduce((a, m) => a + modState(m).rounds, 0),
    stars: modules.reduce((a, m) => a + modState(m).stars, 0),
    attempts,
    accuracy: attempts ? correct / attempts : 0,
    mastered: st.filter((s) => s.pk >= 0.85).length,
    totalItems: all.length,
    sessions: state.sessions,
  };
}

export function resetProgress() {
  state = { ...blank(), settings: state.settings };
  save();
}
