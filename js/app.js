import { MODULES, getModule, itemByKey } from './modules/index.js';
import * as audio from './audio.js';
import * as L from './learner.js';
import { burst, rain } from './confetti.js';
import * as diag from './diagnostics.js';

const DEBUG = new URLSearchParams(location.search).has('debug');

const app = document.getElementById('app');
const PRAISE = ['Yes!', 'Great job!', 'You found it!', 'Hooray!', 'Super!', 'Wow, yes!'];
const IDLE_MS = 9000;
// Start-screen picture positions [left%, top%], kept around the edges so they never cover the title.
const FLOAT_AT = [[5, 8], [8, 42], [6, 76], [22, 88], [30, 10], [66, 9], [78, 86], [90, 16], [91, 52], [86, 74]];

let current = { screen: 'start' };
let quiz = null;
let timers = [];

audio.configure(L.getSettings());

// ---------- Helpers ----------

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pct = (x) => Math.round(x * 100);

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function later(fn, ms) {
  const t = setTimeout(fn, ms);
  timers.push(t);
  return t;
}

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function center(el) {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}

function bounce(el, cls = 'pop') {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function visual(it) {
  return it.swatch
    ? `<span class="swatch" style="--sw:${it.swatch}"></span>`
    : `<span class="emoji">${it.emoji}</span>`;
}

// Sentence builders. Modules can override with `ask` and `noArticle`.
const the = (m, it) => (m.noArticle ? it.name : `the ${it.name}`);
const askText = (m, it) => (m.ask ? m.ask(it) : `${it.plural ? 'Where are' : 'Where is'} the ${it.name}?`);
const thatsText = (m, it) => (m.noArticle ? `That's ${it.name}.` : it.plural ? `Those are the ${it.name}.` : `That's the ${it.name}.`);
const yesText = (m, it) => `${pick(PRAISE)} ${cap(the(m, it))}!`;

function backBtn(action, label = 'Back') {
  return `<button class="icon-btn hold-btn" data-action="${action}" data-hold aria-label="${label}">
    <span aria-hidden="true">⬅️</span><small class="hold-tip">hold</small></button>`;
}

function starRow(n, of = 3) {
  return Array.from({ length: of }, (_, i) => `<span class="star ${i < n ? 'on' : ''}" style="--d:${i * 0.25}s">⭐</span>`).join('');
}

// ---------- Screens ----------

const SCREENS = {
  oops() {
    return `<section class="screen oops">
      <div class="trophy" aria-hidden="true">🛟</div>
      <h2 class="done-title">Oops, something broke</h2>
      <p class="done-score">Tap the big button and we'll get going again.</p>
      <div class="done-actions">
        <button class="pill-btn play big" data-action="fixIt">🔧 Fix it</button>
        <button class="pill-btn big" data-action="copyReport">📋 Copy error report</button>
      </div>
      <textarea class="report-text" hidden readonly></textarea>
    </section>`;
  },

  start() {
    const floaters = ['🐄', '🦁', '🦜', '🐳', '🍎', '🥕', '🌻', '🚒', '🎨', '👃'];
    return `<section class="screen start">
      <div class="floaters" aria-hidden="true">${floaters.map((e, i) => `<span style="--i:${i};left:${FLOAT_AT[i][0]}%;top:${FLOAT_AT[i][1]}%">${e}</span>`).join('')}</div>
      <h1 class="logo"><span>Tiny</span><span>Explorers</span></h1>
      <button class="big-play" data-action="begin" aria-label="Start">▶</button>
      <p class="start-hint">Tap to play · turn the sound on 🔊</p>
    </section>`;
  },

  home() {
    return `<section class="screen home">
      <header class="topbar">
        <div class="brand">🧭 Tiny Explorers</div>
        <button class="icon-btn hold-btn" data-action="parent" data-hold="always" aria-label="Grown-ups (hold)">
          <span aria-hidden="true">👪</span><small class="hold-tip">grown-ups: hold</small></button>
      </header>
      <div class="module-grid scroll">
        ${MODULES.map((m) => {
          const ms = L.modState(m);
          return `<button class="module-tile" style="--c:${m.color};--c2:${m.color2}" data-action="open" data-id="${m.id}">
            <span class="tile-emoji">${m.emoji}</span>
            <span class="tile-title">${m.title}</span>
            <span class="tile-meta"><span class="tile-stars">⭐ ${ms.stars}</span>
              <span class="meter"><i style="width:${pct(L.moduleMastery(m))}%"></i></span></span>
          </button>`;
        }).join('')}
      </div>
    </section>`;
  },

  module({ id }) {
    const m = getModule(id);
    return `<section class="screen module" style="--c:${m.color};--c2:${m.color2}">
      <header class="topbar">
        ${backBtn('home')}
        <h2 class="screen-title">${m.emoji} ${m.title}</h2>
        <div class="top-actions">
          <button class="pill-btn listen" data-action="listen">👂 Listen</button>
          <button class="pill-btn play" data-action="play">🎯 Play</button>
        </div>
      </header>
      <div class="item-grid scroll">
        ${m.items.map((it) => {
          const known = L.itemState(it).pk >= 0.85;
          return `<button class="item-card" data-action="learn" data-id="${it.id}" aria-label="${it.name}">
            <span class="item-visual">${visual(it)}</span>
            <span class="item-name">${it.name}</span>
            ${known ? '<span class="badge" title="Knows it">⭐</span>' : ''}
          </button>`;
        }).join('')}
      </div>
    </section>`;
  },

  quiz() {
    const { mod, q } = quiz;
    const prompt = q.mode === 'sound' ? `Who says “${q.target.says}”?` : askText(mod, q.target);
    return `<section class="screen quiz" style="--c:${mod.color};--c2:${mod.color2}">
      <header class="topbar">
        ${backBtn('module')}
        <div class="dots">${dotsHtml()}</div>
        <span class="topbar-spacer"></span>
      </header>
      <button class="prompt" data-action="replay" aria-label="Hear it again">
        <span class="prompt-ear" aria-hidden="true">🔊</span><span class="prompt-text">${prompt}</span>
      </button>
      <div class="choices" data-n="${q.choices.length}">
        ${q.choices.map((c) => `<button class="choice" data-action="answer" data-id="${c.id}" aria-label="${c.name}">${visual(c)}</button>`).join('')}
      </div>
    </section>`;
  },

  done({ id, stars, unlocked, correct, total }) {
    const m = getModule(id);
    return `<section class="screen done" style="--c:${m.color};--c2:${m.color2}">
      <div class="trophy" aria-hidden="true">🏆</div>
      <h2 class="done-title">Great job!</h2>
      <div class="done-stars">${starRow(stars)}</div>
      <p class="done-score">${correct} of ${total} on the first try</p>
      ${unlocked ? `<div class="unlock"><span class="unlock-label">New!</span><span class="unlock-visual">${visual(unlocked)}</span><span class="unlock-name">${unlocked.name}</span></div>` : ''}
      <div class="done-actions">
        <button class="pill-btn play big" data-action="play">🔁 Again</button>
        <button class="pill-btn big" data-action="module">📚 ${m.title}</button>
        <button class="pill-btn big" data-action="home">🏠 Home</button>
      </div>
    </section>`;
  },

  parent() {
    const s = L.getSettings();
    const t = L.totals(MODULES);
    const confusions = L.topConfusions();
    const recent = t.sessions.slice(-8).reverse();
    const opt = (key, vals, labels = vals) => vals.map((v, i) => `<option value="${v}" ${s[key] == v ? 'selected' : ''}>${labels[i]}</option>`).join('');
    return `<section class="screen parent scroll">
      <header class="topbar">
        ${backBtn('home')}
        <h2 class="screen-title">👪 Grown-ups</h2>
        <span class="topbar-spacer"></span>
      </header>

      <div class="stat-row">
        <div class="stat"><b>${t.mastered}<small>/${t.totalItems}</small></b><span>words known</span></div>
        <div class="stat"><b>${t.attempts ? pct(t.accuracy) + '%' : '–'}</b><span>first-try accuracy</span></div>
        <div class="stat"><b>${t.rounds}</b><span>rounds played</span></div>
        <div class="stat"><b>${t.stars}</b><span>stars earned</span></div>
      </div>

      <h3>Progress by theme</h3>
      <p class="muted">A star badge means the learning engine is 85%+ confident he knows it. Faded items aren't in the quiz yet. They unlock as he masters the ones before them.</p>
      <div class="mod-progress">
        ${MODULES.map((m) => {
          const ms = L.modState(m);
          return `<div class="mod-card" style="--c:${m.color};--c2:${m.color2}">
            <div class="mod-head"><span class="mod-emoji">${m.emoji}</span><b>${m.title}</b>
              <span class="mod-pct">${pct(L.moduleMastery(m))}%</span></div>
            <div class="meter wide"><i style="width:${pct(L.moduleMastery(m))}%"></i></div>
            <div class="mod-sub">⭐ ${ms.stars} · ${ms.rounds} rounds · ${ms.answered ? pct(ms.firstTry / ms.answered) : 0}% first try · quizzing ${ms.unlocked}/${m.items.length}</div>
            <div class="chips">
              ${m.items.map((it, i) => {
                const st = L.itemState(it);
                const lvl = L.masteryLabel(st.pk);
                return `<div class="chip ${lvl} ${i >= ms.unlocked ? 'locked' : ''}" title="${it.name}: ${pct(st.pk)}% · ${st.correct}/${st.attempts} correct · seen ${st.seen}x">
                  <span class="chip-visual">${visual(it)}</span>
                  <span class="chip-bar"><i style="width:${pct(st.pk)}%"></i></span>
                </div>`;
              }).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="two-col">
        <div class="panel">
          <h3>Common mix-ups</h3>
          ${confusions.length ? `<ul class="mixups">${confusions.map((c) => {
            const a = itemByKey(c.target), b = itemByKey(c.chosen);
            if (!a || !b) return '';
            return `<li><span>${visual(a)}</span><span class="mix-arrow">picked</span><span>${visual(b)}</span><span class="muted">${c.count}×</span></li>`;
          }).join('')}</ul><p class="muted small">These show up more often as wrong choices, so he gets practice telling them apart.</p>` : '<p class="muted">No mix-ups yet.</p>'}
        </div>
        <div class="panel">
          <h3>Recent rounds</h3>
          ${recent.length ? `<ul class="recent">${recent.map((r) => {
            const m = getModule(r.mod);
            const d = new Date(r.t);
            return `<li><span>${m ? m.emoji : ''} ${m ? m.title : r.mod}</span><span>${r.correct}/${r.total}</span><span class="muted">${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span></li>`;
          }).join('')}</ul>` : '<p class="muted">No rounds yet.</p>'}
        </div>
      </div>

      <h3>Settings</h3>
      <div class="settings panel">
        <label class="setting"><span>Spoken words</span><input type="checkbox" data-setting="voice" ${s.voice ? 'checked' : ''}></label>
        <label class="setting"><span>Animal and fun sounds</span><input type="checkbox" data-setting="sounds" ${s.sounds ? 'checked' : ''}></label>
        <label class="setting"><span>Volume</span><input type="range" min="0.1" max="1" step="0.05" value="${s.volume}" data-setting="volume"></label>
        <label class="setting"><span>Most choices per question</span><select data-setting="maxChoices">${opt('maxChoices', [2, 3, 4])}</select></label>
        <label class="setting"><span>Questions per round</span><select data-setting="roundLength">${opt('roundLength', [3, 5, 8])}</select></label>
        <label class="setting"><span>Toddler lock (hold ⬅️ to go back)</span><input type="checkbox" data-setting="toddlerLock" ${s.toddlerLock ? 'checked' : ''}></label>
        <label class="setting"><span>Repeat the question if he goes quiet</span><input type="checkbox" data-setting="idleHints" ${s.idleHints ? 'checked' : ''}></label>
        <button class="pill-btn" data-action="testSound">🔊 Test sound</button>
      </div>

      <h3>Problems</h3>
      <div class="panel">
        <p class="muted">If a screen freezes or a sound won't play, it's logged here. Copy the report to share it.</p>
        ${problemsHtml(8)}
        <div class="row-actions">
          <button class="pill-btn" data-action="copyReport">📋 Copy error report</button>
          <button class="pill-btn" data-action="fixIt">🔧 Restart sound</button>
          <button class="pill-btn" data-action="clearProblems">Clear log</button>
        </div>
        <textarea class="report-text" hidden readonly></textarea>
      </div>

      <details class="panel how">
        <summary>How the learning engine works</summary>
        <ul>
          <li><b>Knowledge tracing.</b> Each word keeps a probability that he knows it (Bayesian Knowledge Tracing). Only first-try answers count as evidence, and a correct pick out of 2 counts less than one out of 4, because guessing is easier.</li>
          <li><b>Smart practice.</b> The next question favors words he knows least and words he hasn't seen in a while.</li>
          <li><b>Gradual unlocks.</b> Each theme starts with 3 words. A new one joins the quiz once he averages 60% on the current set.</li>
          <li><b>Adaptive difficulty.</b> 2 pictures while learning, then 3, then 4 (capped by the setting above).</li>
          <li><b>Mix-up aware.</b> If he confuses two things, they're paired up more often until the mix-up fades.</li>
          <li><b>Gentle hints.</b> After 2 misses, or if he goes quiet, the right answer gently glows.</li>
          <li><b>Private.</b> Progress stays on this device. No accounts, no tracking, nothing sent anywhere.</li>
        </ul>
      </details>

      <div class="danger">
        <button class="pill-btn danger-btn" data-action="askReset">Reset all progress</button>
      </div>
    </section>`;
  },
};

// Things to do right after a screen appears.
const ENTER = {
  module({ id }) {
    const m = getModule(id);
    audio.preload(m.items.map((i) => i.sound));
    audio.sequence([() => audio.speak(m.intro)]);
  },
  quiz() {
    later(askPrompt, 350);
    armIdle();
  },
  done({ stars, unlocked, id }) {
    const m = getModule(id);
    rain();
    const steps = [() => audio.sfx('cheer'), () => audio.speak(stars === 3 ? 'Hooray! Three stars! Great job!' : 'Hooray! Great job!')];
    if (unlocked) {
      steps.push(() => audio.wait(300), () => audio.speak(`Now let's learn ${the(m, unlocked)}!`), () => audio.playItemSound(unlocked));
    }
    audio.sequence(steps);
  },
};

let navCause = 'app';

function go(screen, params = {}, cause = navCause) {
  clearTimers();
  cancelHold();
  audio.stop();
  diag.trail(screen, DEBUG ? `${cause} | ${new Error().stack.split('\n').slice(2, 5).join(' < ')}` : cause);
  current = { screen, ...params };
  try {
    app.innerHTML = SCREENS[screen](params) + helpButton();
    ENTER[screen]?.(params);
  } catch (err) {
    diag.report(`show ${screen}`, err);
    current = { screen: 'oops' };
    app.innerHTML = SCREENS.oops();
  }
}

// ---------- Problems and recovery ----------

// A clear "something went wrong" button. It only shows up after an error,
// sits in the bottom corner away from the game, and opens the fix panel.
function helpButton() {
  const n = diag.unseen();
  if (!n || current.screen === 'start') return '';
  return `<button class="help-btn" data-action="openHelp" aria-label="Something went wrong. Tap to fix.">
    <span aria-hidden="true">🛟</span> Fix a problem <b>${n}</b></button>`;
}

function refreshHelp() {
  app.querySelector('.help-btn')?.remove();
  if (current.screen === 'oops') return;
  app.insertAdjacentHTML('beforeend', helpButton());
}

diag.onError(() => setTimeout(refreshHelp, 0));

function problemsHtml(limit = 5) {
  const errs = diag.errors().slice(-limit).reverse();
  if (!errs.length) return '<p class="muted">No problems logged. Everything is working.</p>';
  return `<ul class="problems">${errs.map((e) => `<li><b>${esc(e.where)}</b><span>${esc(e.message)}</span><small class="muted">${new Date(e.t).toLocaleString()}</small></li>`).join('')}</ul>`;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function copyReport(btn) {
  const text = diag.asText();
  try {
    await navigator.clipboard.writeText(text);
    if (btn) btn.textContent = '✅ Copied';
  } catch {
    // Older iPads or non-https: show the text so it can be selected by hand.
    const box = app.querySelector('.report-text');
    if (box) { box.hidden = false; box.value = text; box.focus(); box.select(); }
    if (btn) btn.textContent = 'Select the text below and copy it';
  }
}

// Fix: rebuild audio, close any overlay, and reload the screen we were on.
function fixAndContinue() {
  diag.markSeen();
  audio.reset();
  audio.unlock();
  app.querySelector('.modal')?.remove();
  const back = current.screen === 'oops' || current.screen === 'quiz' ? (current.id ? 'module' : 'home') : current.screen;
  go(back, back === 'module' ? { id: current.id } : current, 'fix button');
}

// ---------- Quiz flow ----------

function startQuiz(id) {
  const mod = getModule(id);
  quiz = { mod, i: 0, total: Number(L.getSettings().roundLength), correct: 0, results: [], lastKey: null, q: null };
  nextQuestion();
}

function nextQuestion() {
  const { mod } = quiz;
  if (quiz.i >= quiz.total) return finishRound();
  const n = L.numChoices(mod);
  const target = L.pickTarget(mod, quiz.lastKey);
  const choices = shuffle([target, ...L.pickDistractors(mod, target, n - 1)]);
  // Once a sound is half-learned, sometimes ask by sound alone: "Who says moo?"
  const mode = target.says && L.itemState(target).pk > 0.5 && Math.random() < 0.4 ? 'sound' : 'see';
  quiz.q = { target, choices, mode, first: true, wrong: 0, locked: false, idle: 0, cool: false };
  quiz.lastKey = target.key;
  go('quiz', { id: mod.id });
}

function advance(q) {
  if (quiz.q !== q || q.advanced) return;
  q.advanced = true;
  quiz.i++;
  nextQuestion();
}

function finishRound() {
  const { mod, correct, total } = quiz;
  const res = L.finishRound(mod, correct, total);
  go('done', { id: mod.id, ...res, correct, total });
}

function dotsHtml() {
  return Array.from({ length: quiz.total }, (_, i) => {
    const r = quiz.results[i];
    const cls = r === true ? 'ok' : r === false ? 'meh' : i === quiz.i ? 'now' : '';
    return `<span class="dot ${cls}">${r === undefined ? '' : '⭐'}</span>`;
  }).join('');
}

function askPrompt() {
  // Never re-ask once answered: a quick tap can land before the first prompt,
  // and asking then would cut off the celebration.
  if (current.screen !== 'quiz' || !quiz?.q || quiz.q.locked) return;
  const { mod, q } = quiz;
  const steps = q.mode === 'sound'
    ? [() => audio.speak(`Who says ${q.target.says}?`), () => audio.playItemSound(q.target)]
    : [() => audio.speak(askText(mod, q.target))];
  audio.sequence(steps);
}

function armIdle() {
  clearTimeout(quiz.idleTimer);
  if (!L.getSettings().idleHints) return;
  quiz.idleTimer = later(() => {
    if (current.screen !== 'quiz' || quiz.q.locked) return;
    quiz.q.idle++;
    if (quiz.q.idle >= 2) showHint();
    askPrompt();
    armIdle();
  }, IDLE_MS);
}

function showHint() {
  app.querySelector(`.choice[data-id="${quiz.q.target.id}"]`)?.classList.add('hint');
}

function answer(el) {
  const { mod, q } = quiz;
  if (!q || q.locked) return;
  const chosen = mod.items.find((i) => i.id === el.dataset.id);
  armIdle();

  if (chosen.key === q.target.key) {
    q.locked = true;
    L.recordAnswer(mod, q.target, chosen, q.choices.length, q.first);
    if (q.first) quiz.correct++;
    quiz.results.push(q.first);
    el.classList.add('correct');
    app.querySelectorAll('.choice').forEach((c) => c !== el && c.classList.add('fade'));
    app.querySelector('.dots').innerHTML = dotsHtml();
    burst(...center(el), 45);
    audio.sequence([
      () => audio.sfx('success'),
      () => audio.speak(yesText(mod, q.target)),
      () => audio.playItemSound(q.target),
      () => audio.wait(400),
    ]).then((ok) => {
      if (ok && current.screen === 'quiz' && quiz.q === q) advance(q);
    });
    // Safety net: never sit on a solved question, even if audio misbehaves.
    later(() => {
      if (current.screen === 'quiz' && quiz.q === q) {
        diag.report('quiz', new Error('stuck after a correct answer, moved on'));
        advance(q);
      }
    }, 12000);
    return;
  }

  // Wrong: name what he picked (that's learning too), then ask again.
  if (q.cool) return;
  q.cool = true;
  later(() => { q.cool = false; }, 700);
  L.recordAnswer(mod, q.target, chosen, q.choices.length, q.first);
  q.first = false;
  q.wrong++;
  el.classList.add('wrong');
  bounce(el, 'shake');
  if (q.wrong >= 2) showHint();
  const again = q.mode === 'sound'
    ? [() => audio.speak(`Who says ${q.target.says}?`), () => audio.playItemSound(q.target)]
    : [() => audio.speak(askText(mod, q.target))];
  audio.sequence([() => audio.sfx('oops'), () => audio.speak(thatsText(mod, chosen)), () => audio.wait(150), ...again]);
}

// ---------- Actions ----------

const ACTIONS = {
  begin() {
    go('home');
    audio.preload(['xylojingle', 'cheer']);
    audio.sequence([() => audio.sfx('xylojingle'), () => audio.speak("Hi! Let's learn and play!")]);
  },
  open(el) {
    go('module', { id: el.dataset.id });
  },
  home() {
    go('home');
  },
  module() {
    go('module', { id: current.id });
  },
  learn(el) {
    const m = getModule(current.id);
    const it = m.items.find((i) => i.id === el.dataset.id);
    app.querySelectorAll('.item-card.spot').forEach((c) => c.classList.remove('spot'));
    bounce(el);
    burst(...center(el), 16);
    L.recordExposure(it);
    audio.sequence([() => audio.speak(cap(it.name)), () => audio.playItemSound(it), () => audio.speak(it.phrase)]);
  },
  async listen() {
    const m = getModule(current.id);
    const cards = [...app.querySelectorAll('.item-card')];
    const spot = (i) => {
      cards.forEach((c) => c.classList.remove('spot'));
      cards[i]?.classList.add('spot');
      cards[i]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    const steps = m.items.flatMap((it, i) => [
      () => { spot(i); return audio.speak(cap(it.name)); },
      () => audio.playItemSound(it),
      () => audio.wait(450),
    ]);
    const done = await audio.sequence(steps);
    if (done) cards.forEach((c) => c.classList.remove('spot'));
  },
  play() {
    startQuiz(current.id);
  },
  replay() {
    if (quiz?.q && !quiz.q.locked) { armIdle(); askPrompt(); }
  },
  answer,
  parent() {
    go('parent');
  },
  testSound() {
    audio.sequence([() => audio.speak('The cow says moo!'), () => audio.sfx('cow')]);
  },
  askReset() {
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">
      <h3>Reset all progress?</h3>
      <p class="muted">Stars, mastery and history will be cleared. Settings are kept.</p>
      <div class="modal-actions">
        <button class="pill-btn" data-action="closeModal">Cancel</button>
        <button class="pill-btn danger-btn" data-action="doReset">Reset</button>
      </div></div>`;
    app.appendChild(wrap);
  },
  closeModal() {
    app.querySelector('.modal')?.remove();
  },
  openHelp() {
    audio.stop();
    app.querySelector('.modal')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">
      <h3>🛟 Something went wrong</h3>
      <p class="muted">Usually it's the sound. <b>Fix it</b> restarts the audio and reloads this screen. Progress is kept.</p>
      ${problemsHtml(3)}
      <div class="modal-actions wrap">
        <button class="pill-btn" data-action="copyReport">📋 Copy error report</button>
        <button class="pill-btn" data-action="closeModal">Close</button>
        <button class="pill-btn play" data-action="fixIt">🔧 Fix it</button>
      </div>
      <textarea class="report-text" hidden readonly></textarea>
    </div>`;
    app.appendChild(wrap);
  },
  fixIt() {
    fixAndContinue();
  },
  copyReport(el) {
    copyReport(el);
  },
  clearProblems() {
    diag.clear();
    go('parent', {}, 'clear problems');
  },
  doReset() {
    L.resetProgress();
    go('parent');
  },
};

// ---------- Input ----------

const needsHold = (el) => el.dataset.hold === 'always' || L.getSettings().toddlerLock;
let hold = null;
let suppressClickUntil = 0; // the release after a hold must not tap the next screen

function cancelHold() {
  if (!hold) return;
  clearTimeout(hold.t);
  hold.el.classList.remove('holding');
  hold = null;
}

app.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('[data-hold]');
  if (!el || !needsHold(el)) return;
  cancelHold();
  const ms = el.dataset.hold === 'always' ? 1200 : 800;
  const screen = current.screen;
  el.style.setProperty('--hold', `${ms}ms`);
  el.classList.add('holding');
  hold = {
    el,
    pointerId: e.pointerId,
    t: setTimeout(() => {
      const h = hold;
      hold = null;
      el.classList.remove('holding');
      // Only act if the same button is still on screen. A press that started
      // on an old screen must never navigate the new one.
      if (!h || h.el !== el || !el.isConnected || current.screen !== screen) return;
      suppressClickUntil = Date.now() + 500;
      audio.unlock();
      run(el.dataset.action, el, null, 'hold');
    }, ms),
  };
});
// Listen on window: if the button was replaced mid-press, the finger-up event
// never reaches #app, and the hold would otherwise fire on its own.
for (const type of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(type, cancelHold, true);
app.addEventListener('pointerout', (e) => {
  if (hold && !hold.el.contains(e.relatedTarget)) cancelHold();
});

app.addEventListener('click', (e) => {
  audio.unlock();
  if (Date.now() < suppressClickUntil) return;
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.hasAttribute('data-hold') && needsHold(el)) {
    bounce(el, 'nudge'); // short tap: show the "hold" hint instead
    return;
  }
  run(el.dataset.action, el, e);
});

// Every tap goes through here, so one bad handler can't freeze the app.
function run(action, el, e, how = 'tap') {
  navCause = `${how} ${action}`;
  try {
    const r = ACTIONS[action]?.(el, e);
    if (r?.catch) r.catch((err) => diag.report(action, err));
  } catch (err) {
    diag.report(action, err);
  }
  navCause = 'app';
}

app.addEventListener('change', (e) => {
  const el = e.target.closest('[data-setting]');
  if (!el) return;
  const key = el.dataset.setting;
  const value = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : Number(el.value);
  L.setSetting(key, value);
  audio.configure(L.getSettings());
});

app.addEventListener('input', (e) => {
  if (e.target.dataset?.setting === 'volume') {
    L.setSetting('volume', Number(e.target.value));
    audio.configure(L.getSettings());
  }
});

// No long-press menus or pinch zoom getting in a toddler's way.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

// Pause when the tab or app is backgrounded; pick up cleanly on return.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { audio.stop(); return; }
  audio.resume(); // iPad parks audio as 'interrupted' while backgrounded
  if (current.screen === 'quiz' && quiz?.q) {
    if (quiz.q.locked) advance(quiz.q);
    else { armIdle(); askPrompt(); }
  }
});

// Safari can restore the page from its back/forward cache with timers dead.
window.addEventListener('pageshow', (e) => {
  if (e.persisted && current.screen !== 'start') go(current.screen === 'quiz' ? 'module' : current.screen, current, 'page restored');
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

go('start');
