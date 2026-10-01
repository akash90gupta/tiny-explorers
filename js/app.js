import { MODULES, getModule, itemByKey } from './modules/index.js';
import * as audio from './audio.js';
import * as L from './learner.js';
import { burst, rain } from './confetti.js';
import * as diag from './diagnostics.js';
import { t, say, loc, nameOf, getLang, setLang, LANGS, locale } from './i18n.js';

const DEBUG = new URLSearchParams(location.search).has('debug');

const app = document.getElementById('app');
const IDLE_MS = 9000;
// Start-screen picture positions [left%, top%], kept around the edges so they never cover the title.
const FLOAT_AT = [[5, 8], [8, 42], [6, 76], [22, 88], [30, 10], [66, 9], [78, 86], [90, 16], [91, 52], [86, 74]];

let current = { screen: 'start' };
let quiz = null;
let timers = [];

audio.configure(L.getSettings());
applyLang(L.getSettings().lang);

function applyLang(lang) {
  setLang(lang);
  audio.setSpeechLang(getLang());
  document.title = t('appName');
}

// ---------- Helpers ----------

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

// Sentences live in i18n.js because word order differs between languages.
const title = (m) => loc(m, 'title');

// The language switch. A plain tap: switching is harmless, even for a toddler.
function langBtn(extra = '') {
  return `<button class="pill-btn lang-btn ${extra}" data-action="toggleLang" aria-label="${t('switchToLabel')}" lang="${getLang() === 'en' ? 'hi' : 'en'}">${t('switchTo')}</button>`;
}

function backBtn(action) {
  return `<button class="icon-btn hold-btn" data-action="${action}" data-hold aria-label="${t('back')}">
    <span aria-hidden="true">⬅️</span><small class="hold-tip">${t('hold')}</small></button>`;
}

function starRow(n, of = 3) {
  return Array.from({ length: of }, (_, i) => `<span class="star ${i < n ? 'on' : ''}" style="--d:${i * 0.25}s">⭐</span>`).join('');
}

// ---------- Screens ----------

const SCREENS = {
  oops() {
    return `<section class="screen oops">
      <div class="trophy" aria-hidden="true">🛟</div>
      <h2 class="done-title">${t('oopsTitle')}</h2>
      <p class="done-score">${t('oopsNote')}</p>
      <div class="done-actions">
        <button class="pill-btn play big" data-action="fixIt">${t('fixIt')}</button>
        <button class="pill-btn big" data-action="copyReport">${t('copyReport')}</button>
      </div>
      <textarea class="report-text" hidden readonly></textarea>
    </section>`;
  },

  start() {
    const floaters = ['🐄', '🦁', '🦜', '🐳', '🍎', '🥕', '🌻', '🚒', '🎨', '👃'];
    return `<section class="screen start">
      <div class="floaters" aria-hidden="true">${floaters.map((e, i) => `<span style="--i:${i};left:${FLOAT_AT[i][0]}%;top:${FLOAT_AT[i][1]}%">${e}</span>`).join('')}</div>
      ${langBtn('corner')}
      <h1 class="logo"><span>${t('logoTop')}</span><span>${t('logoBottom')}</span></h1>
      <button class="big-play" data-action="begin" aria-label="${t('start')}">▶</button>
      <p class="start-hint">${t('startHint')}</p>
    </section>`;
  },

  home() {
    return `<section class="screen home">
      <header class="topbar">
        <div class="brand">🧭 ${t('appName')}</div>
        <div class="top-actions">
          ${langBtn()}
          <button class="icon-btn hold-btn" data-action="parent" data-hold="always" aria-label="${t('grownUpsLabel')}">
            <span aria-hidden="true">👪</span><small class="hold-tip">${t('grownUpsHold')}</small></button>
        </div>
      </header>
      <div class="module-grid scroll">
        ${MODULES.map((m) => {
          const ms = L.modState(m);
          return `<button class="module-tile" style="--c:${m.color};--c2:${m.color2}" data-action="open" data-id="${m.id}">
            <span class="tile-emoji">${m.emoji}</span>
            <span class="tile-title">${title(m)}</span>
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
        <h2 class="screen-title">${m.emoji} ${title(m)}</h2>
        <div class="top-actions">
          <button class="pill-btn listen" data-action="listen">${t('listen')}</button>
          <button class="pill-btn play" data-action="play">${t('play')}</button>
        </div>
      </header>
      <div class="item-grid scroll">
        ${m.items.map((it) => {
          const known = L.itemState(it).pk >= 0.85;
          return `<button class="item-card" data-action="learn" data-id="${it.id}" aria-label="${loc(it, 'name')}">
            <span class="item-visual">${visual(it)}</span>
            <span class="item-name">${loc(it, 'name')}</span>
            ${known ? `<span class="badge" title="${t('knowsIt')}">⭐</span>` : ''}
          </button>`;
        }).join('')}
      </div>
    </section>`;
  },

  quiz() {
    const { mod, q } = quiz;
    const prompt = q.mode === 'sound' ? say.whoSays(q.target) : say.ask(mod, q.target);
    return `<section class="screen quiz" style="--c:${mod.color};--c2:${mod.color2}">
      <header class="topbar">
        ${backBtn('module')}
        <div class="dots">${dotsHtml()}</div>
        <span class="topbar-spacer"></span>
      </header>
      <button class="prompt" data-action="replay" aria-label="${t('hearAgain')}">
        <span class="prompt-ear" aria-hidden="true">🔊</span><span class="prompt-text">${prompt}</span>
      </button>
      <div class="choices" data-n="${q.choices.length}">
        ${q.choices.map((c) => `<button class="choice" data-action="answer" data-id="${c.id}" aria-label="${loc(c, 'name')}">${visual(c)}</button>`).join('')}
      </div>
    </section>`;
  },

  done({ id, stars, unlocked, correct, total }) {
    const m = getModule(id);
    return `<section class="screen done" style="--c:${m.color};--c2:${m.color2}">
      <div class="trophy" aria-hidden="true">🏆</div>
      <h2 class="done-title">${t('greatJob')}</h2>
      <div class="done-stars">${starRow(stars)}</div>
      <p class="done-score">${t('firstTry', { correct, total })}</p>
      ${unlocked ? `<div class="unlock"><span class="unlock-label">${t('newBadge')}</span><span class="unlock-visual">${visual(unlocked)}</span><span class="unlock-name">${loc(unlocked, 'name')}</span></div>` : ''}
      <div class="done-actions">
        <button class="pill-btn play big" data-action="play">${t('again')}</button>
        <button class="pill-btn big" data-action="module">📚 ${title(m)}</button>
        <button class="pill-btn big" data-action="home">${t('homeBtn')}</button>
      </div>
    </section>`;
  },

  parent() {
    const s = L.getSettings();
    const tot = L.totals(MODULES);
    const confusions = L.topConfusions();
    const recent = tot.sessions.slice(-8).reverse();
    const hiVoiceMissing = getLang() === 'hi' && !audio.hasVoice('hi');
    const opt = (key, vals, labels = vals) => vals.map((v, i) => `<option value="${v}" ${s[key] == v ? 'selected' : ''}>${labels[i]}</option>`).join('');
    return `<section class="screen parent scroll">
      <header class="topbar">
        ${backBtn('home')}
        <h2 class="screen-title">${t('grownUps')}</h2>
        <span class="topbar-spacer"></span>
      </header>

      <div class="stat-row">
        <div class="stat"><b>${tot.mastered}<small>/${tot.totalItems}</small></b><span>${t('wordsKnown')}</span></div>
        <div class="stat"><b>${tot.attempts ? pct(tot.accuracy) + '%' : '–'}</b><span>${t('accuracy')}</span></div>
        <div class="stat"><b>${tot.rounds}</b><span>${t('roundsPlayed')}</span></div>
        <div class="stat"><b>${tot.stars}</b><span>${t('starsEarned')}</span></div>
      </div>

      <h3>${t('progressByTheme')}</h3>
      <p class="muted">${t('progressNote')}</p>
      <div class="mod-progress">
        ${MODULES.map((m) => {
          const ms = L.modState(m);
          return `<div class="mod-card" style="--c:${m.color};--c2:${m.color2}">
            <div class="mod-head"><span class="mod-emoji">${m.emoji}</span><b>${title(m)}</b>
              <span class="mod-pct">${pct(L.moduleMastery(m))}%</span></div>
            <div class="meter wide"><i style="width:${pct(L.moduleMastery(m))}%"></i></div>
            <div class="mod-sub">${t('modSub', { stars: ms.stars, rounds: ms.rounds, pct: ms.answered ? pct(ms.firstTry / ms.answered) : 0, unlocked: ms.unlocked, total: m.items.length })}</div>
            <div class="chips">
              ${m.items.map((it, i) => {
                const st = L.itemState(it);
                const lvl = L.masteryLabel(st.pk);
                return `<div class="chip ${lvl} ${i >= ms.unlocked ? 'locked' : ''}" title="${t('chipTitle', { name: loc(it, 'name'), pct: pct(st.pk), correct: st.correct, attempts: st.attempts, seen: st.seen })}">
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
          <h3>${t('mixups')}</h3>
          ${confusions.length ? `<ul class="mixups">${confusions.map((c) => {
            const a = itemByKey(c.target), b = itemByKey(c.chosen);
            if (!a || !b) return '';
            return `<li><span>${visual(a)}</span><span class="mix-arrow">${t('picked')}</span><span>${visual(b)}</span><span class="muted">${c.count}×</span></li>`;
          }).join('')}</ul><p class="muted small">${t('mixupsNote')}</p>` : `<p class="muted">${t('noMixups')}</p>`}
        </div>
        <div class="panel">
          <h3>${t('recent')}</h3>
          ${recent.length ? `<ul class="recent">${recent.map((r) => {
            const m = getModule(r.mod);
            const d = new Date(r.t);
            return `<li><span>${m ? m.emoji : ''} ${m ? title(m) : r.mod}</span><span>${r.correct}/${r.total}</span><span class="muted">${d.toLocaleDateString(locale(), { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' })}</span></li>`;
          }).join('')}</ul>` : `<p class="muted">${t('noRounds')}</p>`}
        </div>
      </div>

      <h3>${t('settings')}</h3>
      <div class="settings panel">
        <label class="setting"><span>${t('language')}</span><select data-setting="lang">${opt('lang', Object.keys(LANGS), Object.values(LANGS).map((l) => l.label))}</select></label>
        ${hiVoiceMissing ? `<p class="voice-warning">${t('noHindiVoice')}</p>` : ''}
        <label class="setting"><span>${t('sVoice')}</span><input type="checkbox" data-setting="voice" ${s.voice ? 'checked' : ''}></label>
        <label class="setting"><span>${t('sSounds')}</span><input type="checkbox" data-setting="sounds" ${s.sounds ? 'checked' : ''}></label>
        <label class="setting"><span>${t('sVolume')}</span><input type="range" min="0.1" max="1" step="0.05" value="${s.volume}" data-setting="volume"></label>
        <label class="setting"><span>${t('sChoices')}</span><select data-setting="maxChoices">${opt('maxChoices', [2, 3, 4])}</select></label>
        <label class="setting"><span>${t('sRound')}</span><select data-setting="roundLength">${opt('roundLength', [3, 5, 8])}</select></label>
        <label class="setting"><span>${t('sLock')}</span><input type="checkbox" data-setting="toddlerLock" ${s.toddlerLock ? 'checked' : ''}></label>
        <label class="setting"><span>${t('sIdle')}</span><input type="checkbox" data-setting="idleHints" ${s.idleHints ? 'checked' : ''}></label>
        <button class="pill-btn" data-action="testSound">${t('testSound')}</button>
      </div>

      <h3>${t('problems')}</h3>
      <div class="panel">
        <p class="muted">${t('problemsNote')}</p>
        ${problemsHtml(8)}
        <div class="row-actions">
          <button class="pill-btn" data-action="copyReport">${t('copyReport')}</button>
          <button class="pill-btn" data-action="fixIt">${t('restartSound')}</button>
          <button class="pill-btn" data-action="clearProblems">${t('clearLog')}</button>
        </div>
        <textarea class="report-text" hidden readonly></textarea>
      </div>

      <details class="panel how">
        <summary>${t('howTitle')}</summary>
        <ul>
          ${t('how').map(([head, body]) => `<li><b>${head}</b> ${body}</li>`).join('')}
        </ul>
      </details>

      <div class="danger">
        <button class="pill-btn danger-btn" data-action="askReset">${t('resetAll')}</button>
      </div>
    </section>`;
  },
};

// Things to do right after a screen appears.
const ENTER = {
  module({ id }) {
    const m = getModule(id);
    audio.preload(m.items.map((i) => i.sound));
    audio.sequence([() => audio.speak(loc(m, 'intro'))]);
  },
  quiz() {
    later(askPrompt, 350);
    armIdle();
  },
  done({ stars, unlocked, id }) {
    const m = getModule(id);
    rain();
    const steps = [() => audio.sfx('cheer'), () => audio.speak(stars === 3 ? t('cheer3') : t('cheer'))];
    if (unlocked) {
      steps.push(() => audio.wait(300), () => audio.speak(say.unlock(m, unlocked)), () => audio.playItemSound(unlocked));
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
  return `<button class="help-btn" data-action="openHelp" aria-label="${t('fixLabel')}">
    <span aria-hidden="true">🛟</span> ${t('fixProblem')} <b>${n}</b></button>`;
}

function refreshHelp() {
  app.querySelector('.help-btn')?.remove();
  if (current.screen === 'oops') return;
  app.insertAdjacentHTML('beforeend', helpButton());
}

diag.onError(() => setTimeout(refreshHelp, 0));

function problemsHtml(limit = 5) {
  const errs = diag.errors().slice(-limit).reverse();
  if (!errs.length) return `<p class="muted">${t('noProblems')}</p>`;
  return `<ul class="problems">${errs.map((e) => `<li><b>${esc(e.where)}</b><span>${esc(e.message)}</span><small class="muted">${new Date(e.t).toLocaleString(locale())}</small></li>`).join('')}</ul>`;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function copyReport(btn) {
  const text = diag.asText();
  try {
    await navigator.clipboard.writeText(text);
    if (btn) btn.textContent = t('copied');
  } catch {
    // Older iPads or non-https: show the text so it can be selected by hand.
    const box = app.querySelector('.report-text');
    if (box) { box.hidden = false; box.value = text; box.focus(); box.select(); }
    if (btn) btn.textContent = t('selectToCopy');
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
    ? [() => audio.speak(say.whoSaysSpoken(q.target)), () => audio.playItemSound(q.target)]
    : [() => audio.speak(say.ask(mod, q.target))];
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
      () => audio.speak(say.yes(mod, q.target)),
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
    ? [() => audio.speak(say.whoSaysSpoken(q.target)), () => audio.playItemSound(q.target)]
    : [() => audio.speak(say.ask(mod, q.target))];
  audio.sequence([() => audio.sfx('oops'), () => audio.speak(say.thats(mod, chosen)), () => audio.wait(150), ...again]);
}

// ---------- Actions ----------

const ACTIONS = {
  begin() {
    go('home');
    audio.preload(['xylojingle', 'cheer']);
    audio.sequence([() => audio.sfx('xylojingle'), () => audio.speak(t('greeting'))]);
  },
  toggleLang() {
    const next = getLang() === 'en' ? 'hi' : 'en';
    L.setSetting('lang', next);
    applyLang(next);
    go(current.screen, current, 'language switch');
    if (current.screen !== 'start') audio.sequence([() => audio.speak(t('greeting'))]);
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
    audio.sequence([() => audio.speak(nameOf(it)), () => audio.playItemSound(it), () => audio.speak(loc(it, 'phrase'))]);
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
      () => { spot(i); return audio.speak(nameOf(it)); },
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
    audio.sequence([() => audio.speak(t('testLine')), () => audio.sfx('cow')]);
  },
  askReset() {
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">
      <h3>${t('resetQ')}</h3>
      <p class="muted">${t('resetNote')}</p>
      <div class="modal-actions">
        <button class="pill-btn" data-action="closeModal">${t('cancel')}</button>
        <button class="pill-btn danger-btn" data-action="doReset">${t('reset')}</button>
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
      <h3>${t('wentWrong')}</h3>
      <p class="muted">${t('wentWrongNote')}</p>
      ${problemsHtml(3)}
      <div class="modal-actions wrap">
        <button class="pill-btn" data-action="copyReport">${t('copyReport')}</button>
        <button class="pill-btn" data-action="closeModal">${t('close')}</button>
        <button class="pill-btn play" data-action="fixIt">${t('fixIt')}</button>
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
  const raw = el.type === 'checkbox' ? el.checked : el.value;
  const value = typeof raw === 'string' && raw !== '' && !isNaN(raw) ? Number(raw) : raw;
  L.setSetting(key, value);
  audio.configure(L.getSettings());
  if (key === 'lang') { applyLang(value); go('parent', {}, 'language setting'); }
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
