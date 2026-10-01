// Error log for grown-ups. Keeps the last 50 errors and the last 30 screen
// changes in localStorage, so a problem can be copied and shared later.

const KEY = 'tiny-explorers:log';
const MAX_ERRORS = 50;
const MAX_TRAIL = 30;
const listeners = new Set();

let log = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.errors) && Array.isArray(s.trail)) return s;
  } catch {}
  return { errors: [], trail: [] };
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(log)); } catch {}
}

const stamp = () => new Date().toISOString();

export function report(where, err) {
  const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
  const entry = { t: stamp(), where, message, stack: err?.stack?.split('\n').slice(0, 4).join('\n') || '' };
  reported++;
  log.errors.push(entry);
  if (log.errors.length > MAX_ERRORS) log.errors = log.errors.slice(-MAX_ERRORS);
  save();
  listeners.forEach((fn) => fn(entry));
  console.warn(`[tiny-explorers] ${where}: ${message}`);
}

// Breadcrumbs: which screen, and what sent us there.
export function trail(screen, cause) {
  log.trail.push({ t: stamp(), screen, cause });
  if (log.trail.length > MAX_TRAIL) log.trail = log.trail.slice(-MAX_TRAIL);
  save();
}

export const onError = (fn) => listeners.add(fn);
export const errors = () => log.errors;

// Errors this session since the grown-up last pressed Fix or Clear. A running
// counter, because the stored list is capped and stops growing.
let reported = 0;
let seen = 0;
export const unseen = () => reported - seen;
export const markSeen = () => { seen = reported; };

export function clear() {
  log = { errors: [], trail: [] };
  seen = reported;
  save();
}

export function asText() {
  const lines = [
    'Tiny Explorers error report',
    `When: ${stamp()}`,
    `Device: ${navigator.userAgent}`,
    `Screen: ${innerWidth}x${innerHeight}`,
    '',
    `Errors (${log.errors.length}):`,
    ...log.errors.map((e) => `- ${e.t} [${e.where}] ${e.message}${e.stack ? `\n    ${e.stack.replace(/\n/g, '\n    ')}` : ''}`),
    '',
    'Recent screens:',
    ...log.trail.map((c) => `- ${c.t} ${c.screen} (${c.cause})`),
  ];
  return lines.join('\n');
}

// Only log problems from this app, not from browser extensions.
const ours = (src = '') => !src || src.startsWith(location.origin);
const foreign = (stack = '') => /(chrome|moz|safari(-web)?)-extension:\/\//.test(stack);

window.addEventListener('error', (e) => {
  if (!ours(e.filename) || foreign(e.error?.stack)) return;
  report('page', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  if (foreign(e.reason?.stack)) return;
  report('promise', e.reason);
});
