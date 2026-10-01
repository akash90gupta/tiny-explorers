// Languages: English and Hindi. Every word on screen and every spoken line
// comes from here or from an item's `hi` block in js/modules/*.js.

export const LANGS = {
  en: { label: 'English', speech: 'en-US', html: 'en' },
  hi: { label: 'हिंदी', speech: 'hi-IN', html: 'hi' },
};

let lang = 'en';

export const getLang = () => lang;
export function setLang(next) {
  lang = LANGS[next] ? next : 'en';
  document.documentElement.lang = LANGS[lang].html;
}

// Localized field of an item or module, falling back to English.
export const loc = (obj, field) => (lang !== 'en' && obj.hi?.[field] != null ? obj.hi[field] : obj[field]);

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const cap = (s) => (lang === 'en' ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const plural = (it) => (lang !== 'en' && it.hi?.plural != null ? it.hi.plural : it.plural);

// ---------- Sentences (grammar differs, so these are functions) ----------

const SENTENCES = {
  en: {
    ask: (m, it) => (m.ask ? m.ask(it) : `${plural(it) ? 'Where are' : 'Where is'} the ${it.name}?`),
    thats: (m, it) => (m.noArticle ? `That's ${it.name}.` : plural(it) ? `Those are the ${it.name}.` : `That's the ${it.name}.`),
    yes: (m, it) => `${pick(['Yes!', 'Great job!', 'You found it!', 'Hooray!', 'Super!', 'Wow, yes!'])} ${cap(m.noArticle ? it.name : `the ${it.name}`)}!`,
    whoSays: (it) => `Who says “${it.says}”?`,
    whoSaysSpoken: (it) => `Who says ${it.says}?`,
    unlock: (m, it) => `Now let's learn ${m.noArticle ? it.name : `the ${it.name}`}!`,
  },
  hi: {
    // "गाय कहाँ है?"  Colors: "इनमें से लाल कौन सा है?"
    ask: (m, it) => (m.noArticle ? `इनमें से ${loc(it, 'name')} कौन सा है?` : `${loc(it, 'name')} कहाँ ${plural(it) ? 'हैं' : 'है'}?`),
    thats: (m, it) => `${plural(it) ? 'ये' : 'यह'} ${loc(it, 'name')} ${plural(it) ? 'हैं' : 'है'}।`,
    yes: (m, it) => `${pick(['शाबाश!', 'बहुत बढ़िया!', 'तुमने ढूँढ लिया!', 'वाह!', 'हुर्रे!', 'बिल्कुल सही!'])} ${loc(it, 'name')}!`,
    // Hindi asks "Whose sound is this?" and then plays it.
    whoSays: () => 'यह आवाज़ किसकी है?',
    whoSaysSpoken: () => 'यह आवाज़ किसकी है?',
    unlock: (m, it) => `अब ${loc(it, 'name')} सीखते हैं!`,
  },
};

export const say = new Proxy({}, { get: (_, k) => SENTENCES[lang][k] || SENTENCES.en[k] });
export const nameOf = (it) => cap(loc(it, 'name'));

// ---------- UI strings ----------

const STR = {
  en: {
    appName: 'Tiny Explorers',
    logoTop: 'Tiny',
    logoBottom: 'Explorers',
    startHint: 'Tap to play · turn the sound on 🔊',
    start: 'Start',
    greeting: "Hi! Let's learn and play!",
    switchTo: 'हिंदी',
    switchToLabel: 'हिंदी में बदलें (switch to Hindi)',
    back: 'Back',
    hold: 'hold',
    grownUpsHold: 'grown-ups: hold',
    grownUpsLabel: 'Grown-ups (hold)',
    listen: '👂 Listen',
    play: '🎯 Play',
    knowsIt: 'Knows it',
    hearAgain: 'Hear it again',
    greatJob: 'Great job!',
    firstTry: '{correct} of {total} on the first try',
    newBadge: 'New!',
    again: '🔁 Again',
    homeBtn: '🏠 Home',
    cheer3: 'Hooray! Three stars! Great job!',
    cheer: 'Hooray! Great job!',
    testLine: 'The cow says moo!',

    grownUps: '👪 Grown-ups',
    wordsKnown: 'words known',
    accuracy: 'first-try accuracy',
    roundsPlayed: 'rounds played',
    starsEarned: 'stars earned',
    progressByTheme: 'Progress by theme',
    progressNote: "A star badge means the learning engine is 85%+ confident he knows it. Faded items aren't in the quiz yet. They unlock as he masters the ones before them.",
    modSub: '⭐ {stars} · {rounds} rounds · {pct}% first try · quizzing {unlocked}/{total}',
    chipTitle: '{name}: {pct}% · {correct}/{attempts} correct · seen {seen}x',
    mixups: 'Common mix-ups',
    picked: 'picked',
    mixupsNote: 'These show up more often as wrong choices, so he gets practice telling them apart.',
    noMixups: 'No mix-ups yet.',
    recent: 'Recent rounds',
    noRounds: 'No rounds yet.',
    settings: 'Settings',
    language: 'Language',
    noHindiVoice: 'No Hindi voice found on this device. On iPad: Settings › Accessibility › Spoken Content › Voices › Hindi.',
    sVoice: 'Spoken words',
    sSounds: 'Animal and fun sounds',
    sVolume: 'Volume',
    sChoices: 'Most choices per question',
    sRound: 'Questions per round',
    sLock: 'Toddler lock (hold ⬅️ to go back)',
    sIdle: 'Repeat the question if he goes quiet',
    testSound: '🔊 Test sound',
    problems: 'Problems',
    problemsNote: "If a screen freezes or a sound won't play, it's logged here. Copy the report to share it.",
    noProblems: 'No problems logged. Everything is working.',
    copyReport: '📋 Copy error report',
    copied: '✅ Copied',
    selectToCopy: 'Select the text below and copy it',
    restartSound: '🔧 Restart sound',
    clearLog: 'Clear log',
    howTitle: 'How the learning engine works',
    how: [
      ['Knowledge tracing.', 'Each word keeps a probability that he knows it (Bayesian Knowledge Tracing). Only first-try answers count as evidence, and a correct pick out of 2 counts less than one out of 4, because guessing is easier.'],
      ['Smart practice.', "The next question favors words he knows least and words he hasn't seen in a while."],
      ['Gradual unlocks.', 'Each theme starts with 3 words. A new one joins the quiz once he averages 60% on the current set.'],
      ['Adaptive difficulty.', '2 pictures while learning, then 3, then 4 (capped by the setting above).'],
      ['Mix-up aware.', "If he confuses two things, they're paired up more often until the mix-up fades."],
      ['Gentle hints.', 'After 2 misses, or if he goes quiet, the right answer gently glows.'],
      ['Private.', 'Progress stays on this device. No accounts, no tracking, nothing sent anywhere.'],
    ],
    resetAll: 'Reset all progress',
    resetQ: 'Reset all progress?',
    resetNote: 'Stars, mastery and history will be cleared. Settings are kept.',
    cancel: 'Cancel',
    reset: 'Reset',

    fixProblem: 'Fix a problem',
    fixLabel: 'Something went wrong. Tap to fix.',
    wentWrong: '🛟 Something went wrong',
    wentWrongNote: "Usually it's the sound. <b>Fix it</b> restarts the audio and reloads this screen. Progress is kept.",
    fixIt: '🔧 Fix it',
    close: 'Close',
    oopsTitle: 'Oops, something broke',
    oopsNote: "Tap the big button and we'll get going again.",
  },

  hi: {
    appName: 'नन्हे खोजी',
    logoTop: 'नन्हे',
    logoBottom: 'खोजी',
    startHint: 'खेलने के लिए दबाएँ · आवाज़ चालू करें 🔊',
    start: 'शुरू करें',
    greeting: 'नमस्ते! चलो सीखें और खेलें!',
    switchTo: 'English',
    switchToLabel: 'Switch to English (अंग्रेज़ी में बदलें)',
    back: 'वापस',
    hold: 'दबाकर रखें',
    grownUpsHold: 'बड़ों के लिए: दबाकर रखें',
    grownUpsLabel: 'बड़ों के लिए (दबाकर रखें)',
    listen: '👂 सुनो',
    play: '🎯 खेलो',
    knowsIt: 'आता है',
    hearAgain: 'फिर से सुनो',
    greatJob: 'बहुत बढ़िया!',
    firstTry: 'पहली बार में {total} में से {correct} सही',
    newBadge: 'नया!',
    again: '🔁 फिर से',
    homeBtn: '🏠 होम',
    cheer3: 'हुर्रे! तीन सितारे! बहुत बढ़िया!',
    cheer: 'हुर्रे! बहुत बढ़िया!',
    testLine: 'गाय बोलती है मूँ!',

    grownUps: '👪 बड़ों के लिए',
    wordsKnown: 'शब्द आते हैं',
    accuracy: 'पहली बार में सही',
    roundsPlayed: 'राउंड खेले',
    starsEarned: 'सितारे मिले',
    progressByTheme: 'हर विषय में प्रगति',
    progressNote: 'सितारे का मतलब है कि सीखने वाला इंजन 85% से ज़्यादा भरोसे से कहता है कि बच्चा यह शब्द जानता है। हल्के दिखने वाले शब्द अभी क्विज़ में नहीं हैं। पिछले शब्द सीखने पर वे खुल जाते हैं।',
    modSub: '⭐ {stars} · {rounds} राउंड · पहली बार में {pct}% · क्विज़ में {unlocked}/{total}',
    chipTitle: '{name}: {pct}% · {attempts} में से {correct} सही · {seen} बार देखा',
    mixups: 'अक्सर होने वाली उलझन',
    picked: 'की जगह चुना',
    mixupsNote: 'ये चीज़ें गलत विकल्प के रूप में ज़्यादा आती हैं, ताकि बच्चा इनमें फ़र्क करना सीखे।',
    noMixups: 'अभी कोई उलझन नहीं।',
    recent: 'हाल के राउंड',
    noRounds: 'अभी कोई राउंड नहीं।',
    settings: 'सेटिंग्स',
    language: 'भाषा',
    noHindiVoice: 'इस डिवाइस पर हिंदी आवाज़ नहीं मिली। iPad पर: Settings › Accessibility › Spoken Content › Voices › Hindi।',
    sVoice: 'बोले गए शब्द',
    sSounds: 'जानवरों और मज़ेदार आवाज़ें',
    sVolume: 'आवाज़ का स्तर',
    sChoices: 'हर सवाल में ज़्यादा से ज़्यादा विकल्प',
    sRound: 'हर राउंड में सवाल',
    sLock: 'बच्चा लॉक (वापस जाने के लिए ⬅️ दबाकर रखें)',
    sIdle: 'बच्चा चुप रहे तो सवाल दोहराएँ',
    testSound: '🔊 आवाज़ जाँचें',
    problems: 'समस्याएँ',
    problemsNote: 'अगर स्क्रीन रुक जाए या आवाज़ न चले, तो यहाँ दर्ज होता है। रिपोर्ट कॉपी करके भेज सकते हैं।',
    noProblems: 'कोई समस्या नहीं। सब ठीक चल रहा है।',
    copyReport: '📋 एरर रिपोर्ट कॉपी करें',
    copied: '✅ कॉपी हो गया',
    selectToCopy: 'नीचे का टेक्स्ट चुनकर कॉपी करें',
    restartSound: '🔧 आवाज़ फिर से शुरू करें',
    clearLog: 'लॉग मिटाएँ',
    howTitle: 'सीखने वाला इंजन कैसे काम करता है',
    how: [
      ['नॉलेज ट्रेसिंग।', 'हर शब्द के लिए अंदाज़ा रखा जाता है कि बच्चा उसे कितना जानता है (Bayesian Knowledge Tracing)। सिर्फ़ पहली कोशिश गिनी जाती है, और 2 में से सही चुनना 4 में से सही चुनने से कम गिना जाता है, क्योंकि अंदाज़ा लगाना आसान होता है।'],
      ['समझदार अभ्यास।', 'अगला सवाल उन शब्दों पर ज़्यादा आता है जो बच्चा सबसे कम जानता है या जो काफ़ी समय से नहीं देखे।'],
      ['धीरे धीरे नए शब्द।', 'हर विषय 3 शब्दों से शुरू होता है। मौजूदा शब्दों में औसत 60% होने पर नया शब्द जुड़ता है।'],
      ['बदलती कठिनाई।', 'सीखते समय 2 तस्वीरें, फिर 3, फिर 4 (ऊपर की सेटिंग तक)।'],
      ['उलझन पर ध्यान।', 'अगर बच्चा दो चीज़ों में उलझता है, तो वे साथ में ज़्यादा आती हैं जब तक फ़र्क समझ न आ जाए।'],
      ['प्यार से इशारा।', '2 गलतियों के बाद, या बच्चा चुप रहे, तो सही जवाब हल्के से चमकता है।'],
      ['निजी।', 'प्रगति इसी डिवाइस पर रहती है। कोई अकाउंट नहीं, कोई ट्रैकिंग नहीं, कुछ भी कहीं नहीं भेजा जाता।'],
    ],
    resetAll: 'सारी प्रगति मिटाएँ',
    resetQ: 'सारी प्रगति मिटाएँ?',
    resetNote: 'सितारे, सीखे हुए शब्द और इतिहास मिट जाएँगे। सेटिंग्स बनी रहेंगी।',
    cancel: 'रद्द करें',
    reset: 'मिटाएँ',

    fixProblem: 'समस्या ठीक करें',
    fixLabel: 'कुछ गड़बड़ हुई। ठीक करने के लिए दबाएँ।',
    wentWrong: '🛟 कुछ गड़बड़ हो गई',
    wentWrongNote: 'आमतौर पर आवाज़ की वजह से होता है। <b>ठीक करें</b> दबाने से आवाज़ फिर से शुरू होगी और यह स्क्रीन दोबारा खुलेगी। प्रगति बनी रहती है।',
    fixIt: '🔧 ठीक करें',
    close: 'बंद करें',
    oopsTitle: 'अरे, कुछ टूट गया',
    oopsNote: 'बड़ा बटन दबाएँ, हम फिर से शुरू करते हैं।',
  },
};

export function t(key, vars = {}) {
  const s = STR[lang][key] ?? STR.en[key] ?? key;
  return typeof s === 'string' ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s;
}

// Hindi digits stay Western (1, 2, 3), which Indian kids' apps commonly use.
export const locale = () => (lang === 'hi' ? 'hi-IN' : undefined);
