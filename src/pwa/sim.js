/*
 * @license Proprietary - All Rights Reserved
 * ~~~~~~~~~~~~
 * sofitel-service-lestroisforts
 * ~~~~~~~~~~~~
 * Copyright (c) 2026 Abraham Ukachi. The Les Trois Forts Project. All rights reserved.
 *
 * This source code is proprietary and confidential. It is shown publicly for
 * viewing only. No permission is granted to copy, modify, merge, publish,
 * distribute, sublicense, sell, host or deploy this software, in whole or in
 * part, or to use it to build another product or service, without the prior
 * written permission of the copyright holder. See the LICENSE file for the
 * full terms.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND.
 *
 * @project: sofitel-service-lestroisforts
 * @name: Les Trois Forts - Simulation de service
 * @file: pwa/sim.js
 * @type: JavaScript (module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script type="module" src="sim.js"
 *    -|> Accueil › Chapitres › « Simulation de service » opens the chapter page (solo, créer, rejoindre)
 *   2+|> window.LTFopenSim() opens it from anywhere
 *   3+|> (sim-live.js) the live card on every page, my games' codes & the notification after a reload
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🛎️ Simulation de service: a dinner service at Les Trois Forts, in real time or sped up (×2, ×5, ×10).
// - ⚙️ Setup: 1 to 4 waiters, each with a « rang » (a section of the real floor plan), split automatically by
//   position or by tapping the tables
// - 🎲 Generation: 5 to 10 fictional bookings (names, covers, table, time, occasions, allergies, notes)
// - 📋 Briefing: the reservation sheet + the « points d'attention », then « Commencer le service »
// - 🕰️ Service: guests arrive on the clock, every table shows its status, patience runs out if nobody comes
// - 💬 Table dialogue: a chat with the guest, multiple choice from the welcome to the goodbye, built from the
//   real carte (dishes & allergens, wines, champagnes, cocktails, « À dire au client » lines)
// - 🏁 Scores per waiter & per table, XP through the app (`window.LTFrecord`, ids `sim_…`, daily anti-farm)
// - 🌐 Optional online game (Firestore `sim/{code}`, 4-digit code, steal a table or ask for permission)
// - 🔔 An ongoing notification while a game runs (clock, next event, tables waiting), closed at the end
// - 🍸 The waiter makes every drink ordered (sim-drinks.js), the guests speak (sim-voice.js), little 3D scenes
//   while a table waits (sim-scene.js), other guests interrupt and the waiter can ask questions (sim-talk.js)
// - 📡 « Parties en cours »: a live list of the team's online games (`simlist/{id}`, views in sim-list.js), join
//   an open one in a tap; the host (or anyone who played it on this phone) comes back without the code
// - 🛎️ sim-live.js: a live card on every page, the codes of my games, the notification after a reload; a solo game
//   is saved (`ltf_sim_solo_v1`) and can be resumed after a reload (« Reprendre la partie »)
// Shared by the JS & the Rust builds 🤝. Solo works fully offline: Firebase is only loaded for an online game.

// ===== MODULES 📦 ===== //

import { speakLines, stopSpeaking, avatarSvg, isMuted, setMuted, voiceAvailable } from './sim-voice.js';
import {
  useDrinkKit,
  drinkTask,
  drinkHtml,
  togglePick,
  scoreDrink,
  gradeOfDigit,
  answerText,
} from './sim-drinks.js';
import { sceneHtml, sceneOf, SCENE_CSS } from './sim-scene.js';
import {
  useTalkKit,
  buildInterruptions,
  questionsFor,
  askQuestion,
  questionText,
  isQuestionId,
} from './sim-talk.js';
import { useListKit, cleanListEntry, drawerHtml } from './sim-list.js';
import {
  useLiveKit,
  liveChanged,
  rememberGame,
  forgetGame,
  markLeft,
  mineCode,
  activeMine,
  readSoloSummary,
  clearSolo,
  SOLO_KEY,
} from './sim-live.js';

// ===== CONSTANTS 🧰 ===== //

// the Firebase JS SDK modules, loaded only for an online game (so solo never needs the network) 🔥
const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
const FIREBASE_AUTH_URL = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
const FIREBASE_STORE_URL = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// the saved progress & settings (for the language) 💾
const PROGRESS_KEY = 'ltf_v1';
// the best solo scores 🏆
const BEST_KEY = 'ltf_sim_best_v1';

// the service clock runs in real time (1 real minute = 1 service minute) at speed ×1 🕰️
const REAL_MS_PER_MINUTE = 60000;
// the speeds a game can run at (×1 = real time) ⏩
const SPEEDS = [1, 2, 5, 10];
// 19:00, the first booking & the start of the clock (minutes after midnight) 🕖
const SERVICE_START = 19 * 60;
// 21:45, the last possible arrival 🕘
const LAST_ARRIVAL = 21 * 60 + 45;
// 22:30, the planned end of the service 🕥
const SERVICE_END = 22 * 60 + 30;
// 23:30, the clock never goes further (the service closes) 🔒
const HARD_END = 23 * 60 + 30;
// an online game lives 6 hours ⏳
const GAME_TTL_MS = 6 * 60 * 60 * 1000;

// patience: the free minutes before it drops, then the loss per service minute 😤
const PATIENCE_GRACE = 5;
const PATIENCE_DECAY = 3;
// the points & patience change of each kind of answer 🎯
const GRADE_POINTS = { best: 10, ok: 4, wrong: 0, danger: -5 };
const GRADE_PATIENCE = { best: 3, ok: 0, wrong: -10, danger: -20 };
// the XP of a best answer (paid through window.LTFrecord, with its daily anti-farm) 🎓
const BEST_ANSWER_XP = 4;

// the ongoing notification of a running game (one at a time, replaced in place) 🔔
const NOTIFY_TAG = 'ltf-sim';

// an interruption's points (half a dialogue step) and a drink's points, by grade 🙋 🍸
const INTERRUPT_POINTS = { best: 6, ok: 2, wrong: 0, danger: -5 };
const DRINK_POINTS = { best: 8, ok: 3, wrong: 0 };

// the most games the « Parties en cours » list shows (the query's limit, checked by the rules) 📡
const LIST_LIMIT = 20;

// fictional children's first names (a child at the table) 🧒
const CHILD_NAMES = ['Lina', 'Noah', 'Jade', 'Léo', 'Mia', 'Tom', 'Zoé', 'Sacha', 'Nino', 'Lou'];

// the colours of the 4 waiters (their rang on the plan) 🎨
const WAITER_COLOURS = ['var(--gold)', 'var(--st2)', 'var(--st1)', 'var(--okb)'];

// the statuses of a table, in service order: [id, FR, EN] 🚦
const STATUSES = [
  ['waiting', 'Attendu', 'Expected'],
  ['arrived', 'Arrivé', 'Arrived'],
  ['seated', 'Installé', 'Seated'],
  ['ordered', 'Commandé', 'Ordered'],
  ['mains', 'Plats servis', 'Mains served'],
  ['dessert', 'Dessert', 'Dessert'],
  ['bill', 'Addition', 'Bill'],
  ['gone', 'Parti', 'Gone'],
];

// fictional first names, French & international: [name, 'f' | 'm'] (never real guests: the app is public) 👤
const FIRST_NAMES = [
  ['Camille', 'f'],
  ['Lucie', 'f'],
  ['Chloé', 'f'],
  ['Manon', 'f'],
  ['Inès', 'f'],
  ['Léa', 'f'],
  ['Sofia', 'f'],
  ['Amira', 'f'],
  ['Yuki', 'f'],
  ['Elena', 'f'],
  ['Hannah', 'f'],
  ['Priya', 'f'],
  ['Olivia', 'f'],
  ['Giulia', 'f'],
  ['Aïcha', 'f'],
  ['Ingrid', 'f'],
  ['Hugo', 'm'],
  ['Louis', 'm'],
  ['Gabriel', 'm'],
  ['Arthur', 'm'],
  ['Nathan', 'm'],
  ['Karim', 'm'],
  ['Mateo', 'm'],
  ['Lukas', 'm'],
  ['Kenji', 'm'],
  ['Oliver', 'm'],
  ['Rafael', 'm'],
  ['Daniel', 'm'],
  ['Samuel', 'm'],
  ['Marco', 'm'],
  ['Youssef', 'm'],
  ['Erik', 'm'],
];

// fictional surnames, French & international 👥
const SURNAMES = [
  'Martin',
  'Bernard',
  'Durand',
  'Lefèvre',
  'Moreau',
  'Fournier',
  'Girard',
  'Roux',
  'Mercier',
  'Blanchard',
  'Garnier',
  'Chevalier',
  'Fontaine',
  'Dubois',
  'Laurent',
  'Rossi',
  'Bianchi',
  'Marchetti',
  'Schneider',
  'Müller',
  'Fischer',
  'García',
  'Fernández',
  'Silva',
  'Costa',
  'Nakamura',
  'Tanaka',
  'Kowalski',
  'Novak',
  'Andersson',
  'Larsen',
  "O'Brien",
  'Murphy',
  'Taylor',
  'Haddad',
  'Benali',
  'Papadopoulos',
  'Okafor',
];

// the allergies & intolerances: the 14 EU allergens + lactose & strawberry ⚠️
// { id, fr: 'au gluten', en: 'gluten', codes: the dish `alg` codes it rules out ([] = not in the data), intolerance }
const ALLERGIES = [
  { id: 'gluten', fr: 'au gluten', noun: 'gluten', en: 'gluten', codes: ['gluten'] },
  { id: 'crust', fr: 'aux crustacés', noun: 'crustacés', en: 'shellfish (crustaceans)', codes: ['crust'] },
  { id: 'egg', fr: 'aux œufs', noun: 'œufs', en: 'eggs', codes: ['egg'] },
  { id: 'fish', fr: 'au poisson', noun: 'poisson', en: 'fish', codes: ['fish'] },
  { id: 'peanut', fr: 'aux arachides', noun: 'arachides', en: 'peanuts', codes: [] },
  { id: 'soy', fr: 'au soja', noun: 'soja', en: 'soy', codes: ['soy'] },
  { id: 'milk', fr: 'au lait', noun: 'lait', en: 'milk', codes: ['milk'] },
  { id: 'nuts', fr: 'aux fruits à coque', noun: 'fruits à coque', en: 'tree nuts', codes: ['nuts', 'pine'] },
  { id: 'celery', fr: 'au céleri', noun: 'céleri', en: 'celery', codes: ['celery'] },
  { id: 'mustard', fr: 'à la moutarde', noun: 'moutarde', en: 'mustard', codes: [] },
  { id: 'sesame', fr: 'au sésame', noun: 'sésame', en: 'sesame', codes: ['sesame'] },
  { id: 'sulphites', fr: 'aux sulfites', noun: 'sulfites', en: 'sulphites', codes: [] },
  { id: 'lupin', fr: 'au lupin', noun: 'lupin', en: 'lupin', codes: [] },
  { id: 'moll', fr: 'aux mollusques', noun: 'mollusques', en: 'molluscs', codes: ['moll'] },
  { id: 'lactose', fr: 'au lactose', noun: 'lactose', en: 'lactose', codes: ['milk'], intolerance: true },
  { id: 'strawberry', fr: 'à la fraise', noun: 'fraise', en: 'strawberries', codes: [] },
];

// the dinner waters (LTF.softs, carte du dîner): still & sparkling 💧
const STILL_WATERS = ['Vittel', 'Zilia'];
const SPARKLING_WATERS = ['San Pellegrino', 'Orezza'];

// « du Rhône », « d'Espagne »…: the region of a wine, spoken (same map as the app's wine lines) 🗺️
const REGION_FROM = {
  Provence: ['de Provence', 'from Provence'],
  Rhône: ['du Rhône', 'from the Rhône'],
  Bourgogne: ['de Bourgogne', 'from Burgundy'],
  Grèce: ['de Grèce', 'from Greece'],
  Espagne: ["d'Espagne", 'from Spain'],
  Loire: ['de la Loire', 'from the Loire'],
  Sicile: ['de Sicile', 'from Sicily'],
  Corse: ['de Corse', 'from Corsica'],
};

// simple single-colour outline icons (24 × 24, stroke = currentColor) ✏️
const ICON_PATHS = {
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  users:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.8c2 .7 3.5 2.4 3.5 5.2',
  key: 'M14 10a4 4 0 1 0-1.2 2.8L20 20M17 17l2-2M15 15l2-2',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  play: 'M7 4.5v15l12-7.5z',
  skip: 'M5 5l9 7-9 7zM18 5v14',
  chat: 'M4 5h16v11H9l-5 4z',
  cake: 'M4 20h16v-7H4zM4 16c2 1.2 4 1.2 6 0s4-1.2 6 0 3 1 4 0M12 13V9M12 6.5c-.8-.8-.8-1.8 0-2.8.8 1 .8 2 0 2.8',
  alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  check: 'M5 12.5l4.5 4.5L19 7',
  star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z',
  swap: 'M7 7h12l-3-3M17 17H5l3 3',
  hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4a1.5 1.5 0 0 1 3 0v6M14 10V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6 7-2.5 0-4-1.5-5.5-4L4 14a1.5 1.5 0 0 1 2.5-1.5L8 14',
  glass: 'M7 3h10c0 5-2 8-5 8s-5-3-5-8zM12 11v9M8 20h8',
  leaf: 'M5 19C5 10 10 5 20 4c-1 10-6 15-15 15zM5 19l8-8',
  bed: 'M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  briefcase: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  shuffle:
    'M4 7h3c5 0 5 10 10 10h3M4 17h3c2 0 3-1.5 4-3.5M13 9.5C14 8 15 7 17 7h3M18 4l3 3-3 3M18 14l3 3-3 3',
  dice: 'M5 5h14v14H5zM9 9h.01M15 15h.01M15 9h.01M9 15h.01M12 12h.01',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  door: 'M5 21h14M7 21V4h10v17M14 12h.01',
  plate: 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 4v6M21 4v16',
  speaker: 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  mute: 'M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6',
  replay: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
  question:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
  live: 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  up: 'M12 19V5M5 12l7-7 7 7',
};

// ===== HELPERS 🧰 ===== //

/**
 * `isEnglish` - Function 🇬🇧
 *
 * @returns { boolean } - true when the app is in English
 */
function isEnglish() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}').lang === 'en';
  } catch (error) {
    return false;
  }
}

/**
 * `translate` - Function 🌍
 *
 * @param { string } french - the French text
 * @param { string } english - the English text
 * @returns { string } - the text in the app's language
 */
function translate(french, english) {
  return isEnglish() ? english : french;
}

/**
 * `both` - Function 🌍
 *
 * @param { string } french - the French text
 * @param { string } english - the English text
 * @returns { {fr: string, en: string} } - a text in both languages (picked at draw time)
 */
function both(french, english) {
  return { fr: french, en: english };
}

/**
 * `pick` - Function 🌍
 *
 * @param { any } text - a `{ fr, en }` text (or a plain string)
 * @returns { string } - the text in the app's language (French when the English is missing)
 */
function pick(text) {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return String((isEnglish() && text.en) || text.fr || text.en || '');
}

/**
 * `escapeHtml` - Function 🛡️
 *
 * @param { any } value - any value
 * @returns { string } - the value, safe to put in HTML
 */
function escapeHtml(value) {
  return String(value == null ? '' : value).replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
}

/**
 * `icon` - Function ✏️
 *
 * @param { string } name - an icon of ICON_PATHS
 * @param { number } [size] - its size in px (20 by default)
 * @returns { string } - the outline SVG icon (single colour, follows the text colour)
 */
function icon(name, size) {
  const pixels = size || 20;
  return (
    `<svg class="simic" width="${pixels}" height="${pixels}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `<path d="${ICON_PATHS[name] || ICON_PATHS.star}"/></svg>`
  );
}

/**
 * `clockText` - Function 🕰️
 *
 * @param { number } minutes - a time of day in minutes after midnight
 * @returns { string } - « 19:45 »
 */
function clockText(minutes) {
  const whole = Math.floor(minutes);
  return String(Math.floor(whole / 60) % 24).padStart(2, '0') + ':' + String(whole % 60).padStart(2, '0');
}

/**
 * `clamp` - Function 📏
 *
 * @param { number } value - a number
 * @param { number } lowest - the lowest value allowed
 * @param { number } highest - the highest value allowed
 * @returns { number } - the value, kept between the two
 */
function clamp(value, lowest, highest) {
  return Math.max(lowest, Math.min(highest, value));
}

/**
 * `roundTenth` - Function 📏
 *
 * @param { number } value - a number
 * @returns { number } - rounded to one decimal (small, stable values for Firestore)
 */
function roundTenth(value) {
  return Math.round(value * 10) / 10;
}

/**
 * `stableKey` - Function 🔑
 *
 * @param { string } text - any text
 * @returns { string } - a short, stable id made from it (djb2 hash, base 36)
 */
function stableKey(text) {
  let hash = 5381;
  for (const character of String(text)) hash = ((hash * 33) ^ character.codePointAt(0)) >>> 0;
  return hash.toString(36);
}

/**
 * `makeRandom` - Function 🎲
 *
 * A small seeded random generator (mulberry32), so every phone builds the same dialogue from the same booking.
 *
 * @param { number } seed - the seed
 * @returns { () => number } - a function giving numbers in [0, 1)
 */
function makeRandom(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `randomItem` - Function 🎲
 *
 * @param { Array<any> } list - any list
 * @param { () => number } [random] - a random generator (Math.random by default)
 * @returns { any } - one item of the list (undefined when empty)
 */
function randomItem(list, random) {
  return list[Math.floor((random || Math.random)() * list.length)];
}

/**
 * `randomInt` - Function 🎲
 *
 * @param { number } lowest - the lowest number
 * @param { number } highest - the highest number (included)
 * @param { () => number } [random] - a random generator (Math.random by default)
 * @returns { number } - a whole number between the two
 */
function randomInt(lowest, highest, random) {
  return lowest + Math.floor((random || Math.random)() * (highest - lowest + 1));
}

/**
 * `shuffle` - Function 🔀
 *
 * @param { Array<any> } list - any list
 * @param { () => number } [random] - a random generator (Math.random by default)
 * @returns { Array<any> } - a shuffled copy
 */
function shuffle(list, random) {
  const copy = list.slice();
  const generator = random || Math.random;
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(generator() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

/**
 * `menuData` - Function 📦
 *
 * @returns { object } - the app's data (window.LTF), or an empty one before it loads
 */
function menuData() {
  return window.LTF || {};
}

// the one load of the data files (null until asked, or after a failed load) 📦
let dataPromise = null;

/**
 * `loadScript` - Function 📜
 *
 * @param { string } source - a script's path (same origin)
 * @returns { Promise<void> } - resolves once it ran (or failed: the game then says the data is missing)
 */
function loadScript(source) {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = source;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

/**
 * `ensureData` - Async Function 📦
 *
 * The Rust/wasm app keeps the menu inside the wasm and has no `window.LTF`: the game then loads the readable
 * data files it ships (src/pwa/data.js & the « À dire au client » lines), once, like the dashboard does.
 *
 * @returns { Promise<boolean> } - true when the floor plan & the dishes are there
 */
function ensureData() {
  // 🔁 one load for every caller (the page & the setup may ask at the same time)
  if (!dataPromise) dataPromise = loadData();
  return dataPromise;
}

/**
 * `loadData` - Async Function 📦
 *
 * @returns { Promise<boolean> } - loads the missing data files, then true when the plan & the dishes are there
 */
async function loadData() {
  if (!(window.LTF && window.LTF.tables && window.LTF.dishes)) await loadScript('src/pwa/data.js');
  if (!window.LTF_INFO) await loadScript('src/pwa/i18n.js');
  if (!window.LTF_INFO_FR) await loadScript('src/pwa/i18n_fr.js');
  const ready = floorTables().length > 0 && (menuData().dishes || []).length > 0;
  // 🔄 a failed load (offline) can be tried again later
  if (!ready) dataPromise = null;
  return ready;
}

/**
 * `firstSentence` - Function ✂️
 *
 * @param { string } text - a « À dire au client » line
 * @returns { string } - its first sentence (short enough for a chat bubble)
 */
function firstSentence(text) {
  const match = String(text || '').match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : String(text || '')).trim();
}

/**
 * `sayLine` - Function 💬
 *
 * @param { string } kind - the ⓘ section (dish, cocktail, champagne…)
 * @param { string } name - the item's name
 * @returns { {fr: string, en: string} } - the first sentence of its « À dire au client » line, FR & EN ('' if none)
 */
function sayLine(kind, name) {
  const french = ((window.LTF_INFO_FR || {})[kind] || {})[name];
  const english = ((window.LTF_INFO || {})[kind] || {})[name];
  return both(firstSentence(french && french.say), firstSentence(english && english.say));
}

/**
 * `addStyles` - Function 🎨
 *
 * @returns { void } - adds the chapter's styles once
 */
function addStyles() {
  if (document.getElementById('simStyle')) return;
  const style = document.createElement('style');
  style.id = 'simStyle';
  style.textContent = SIM_CSS + SCENE_CSS;
  document.head.appendChild(style);
}

// the chapter's look (every class starts with `sim`; grids use minmax(0,1fr) & min-width:0) 🎨
const SIM_CSS = `
#simPage{padding-bottom:calc(120px + env(safe-area-inset-bottom))}
#simPage .simic{flex:none;display:block}
.simintro{color:var(--mu);font-size:13.5px;line-height:1.45;margin:4px 2px 12px}
.simav{color:var(--gold)}
.simchev{font-size:22px;margin-left:6px}
.simrowic{font-size:21px}
.simsec{font-weight:700;font-size:15px;margin:18px 2px 10px;display:flex;align-items:center;gap:8px}
.simseg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.simseg>*{min-width:0}
.simsegbtn{height:48px;border-radius:16px;background:var(--sf2);color:var(--tx);font-weight:800;font-size:17px;
display:flex;align-items:center;justify-content:center;padding:0;margin:0;line-height:1;text-align:center;width:100%}
.simspeed{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:32px;padding:0 10px;margin-left:6px;
border-radius:99px;background:var(--pill);color:var(--tx);font-weight:800;font-size:14px;line-height:1}
.simsegbtn.simon{background:var(--gbtn);color:var(--ong)}
.simwaiters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.simwaiters>*{min-width:0}
.simwaiter{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:16px;background:var(--sf);
  border:2px solid transparent;color:inherit;font:inherit;text-align:left;min-width:0}
.simwaiter.simon{border-color:var(--gold)}
.simwaiter .simdot{width:14px;height:14px;border-radius:7px;flex:none}
.simwaiter input{min-width:0;width:100%;background:none;border:0;color:var(--tx);font:inherit;font-weight:700;padding:0}
.simwaiter .simname{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}
.simwaiter small{color:var(--mu);font-size:12px;white-space:nowrap}
.simgrow{flex:1;min-width:0}
.simplan{display:block;width:100%;height:auto;touch-action:manipulation}
.simplan .simroom{fill:var(--sf2);stroke:var(--line);stroke-width:.4}
.simplan .simwin{stroke:var(--st2);stroke-width:.8;stroke-dasharray:2 1}
.simplan .simctr{fill:var(--sf3)}
.simplan .simlabel{font-size:2.6px;fill:var(--mu);text-anchor:middle}
.simplan .simtable{fill:var(--sf);stroke-width:.9;cursor:pointer}
.simplan .simtable.simfree{opacity:.45}
.simplan .simtable.simmine{stroke-width:1.5}
.simplan .simtid{font-size:2.5px;font-weight:700;fill:var(--tx);text-anchor:middle;pointer-events:none}
.simplan .simtable.simst-arrived{fill:var(--kobg)}
.simplan .simtable.simst-seated,.simplan .simtable.simst-ordered{fill:var(--sf3)}
.simplan .simtable.simst-mains,.simplan .simtable.simst-dessert{fill:var(--okbg)}
.simplan .simtable.simst-bill{fill:var(--pill)}
.simplan .simtable.simst-gone{opacity:.35}
.simplan .simtable.simpulse{animation:simpulse 1.2s infinite}
@keyframes simpulse{50%{opacity:.45}}
.simcard{background:var(--sf);border-radius:20px;padding:14px;margin:0 0 12px}
.simhint{color:var(--mu);font-size:12.5px;line-height:1.4;margin-top:8px}
.simactions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}
.simactions>*{min-width:0}
.simsheet{display:grid;grid-template-columns:44px minmax(0,1.3fr) 30px 44px minmax(0,1.7fr);gap:0;font-size:12.5px;
  background:var(--sf);border-radius:16px;overflow:hidden}
.simsheet>*{min-width:0;padding:8px 6px;border-top:1px solid var(--line);overflow-wrap:anywhere}
.simsheet .simth{border-top:0;font-weight:800;color:var(--gold);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.simsheet .simnum{text-align:center;font-weight:700}
.simsheet .simnote{color:var(--mu)}
.simattn{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:14px;background:var(--sf);
  margin-bottom:8px;line-height:1.4;font-size:14px}
.simattn .simic{color:var(--gold);margin-top:1px}
.simbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:6px;height:56px;padding:0 8px;background:var(--bg)}
.simbar .simtitle{flex:1;min-width:0;font-size:17px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.simiconbtn{width:44px;height:44px;border-radius:22px;display:flex;align-items:center;justify-content:center;color:var(--tx);flex:none}
.simiconbtn:active{background:var(--sf)}
.simclock{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;background:var(--pill);
  color:var(--gold);font-weight:800;font-variant-numeric:tabular-nums;flex:none}
.simme{display:flex;gap:8px;overflow-x:auto;padding:0 0 10px;scrollbar-width:none}
.simme::-webkit-scrollbar{display:none}
.simmechip{flex:none;display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:18px;background:var(--sf2);
  color:var(--tx2);font-size:13px;border:2px solid transparent}
.simmechip.simon{border-color:var(--gold);color:var(--tx);font-weight:700}
.simmechip .simdot{width:10px;height:10px;border-radius:5px}
.simlist{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}
.simrow{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;border-radius:18px;
  background:var(--sf);color:inherit;font:inherit;text-align:left;width:100%;border:2px solid transparent}
.simrow>*{min-width:0}
.simrow.simmine{border-color:var(--line)}
.simrow.simnow{border-color:var(--kob)}
.simtag{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-weight:800;
  font-size:13px;background:var(--sf3);border:2px solid var(--gold)}
.simrow b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14.5px}
.simrow .simsub{color:var(--mu);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.simstatus{font-size:11px;font-weight:800;padding:3px 9px;border-radius:99px;background:var(--sf2);white-space:nowrap;text-align:center}
.simstatus.simst-arrived{background:var(--kobg);color:var(--kot)}
.simstatus.simst-mains,.simstatus.simst-dessert{background:var(--okbg);color:var(--okt)}
.simstatus.simst-bill{background:var(--pill);color:var(--gold)}
.simpat{height:5px;border-radius:3px;background:var(--sf3);overflow:hidden;margin-top:5px}
.simpat i{display:block;height:100%;background:var(--okb);transition:width .4s}
.simpat.simlow i{background:var(--kob)}
.simlock{color:var(--mu);font-size:11.5px;margin-top:4px;display:flex;align-items:center;gap:4px;justify-content:flex-end}
.simbanner{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;background:var(--pill);margin:0 0 10px;font-size:13.5px}
.simbanner .simgrow{line-height:1.35}
.simsmallbtn{height:36px;padding:0 12px;border-radius:18px;background:var(--gbtn);color:var(--ong);font-weight:700;font-size:13px;flex:none}
.simsmallbtn.simsec2{background:var(--sf2);color:var(--tx)}
.simtoast{position:fixed;left:12px;right:12px;top:calc(10px + env(safe-area-inset-top));z-index:60;max-width:616px;margin:0 auto;
  display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;background:var(--sf2);color:var(--tx);
  box-shadow:0 10px 30px rgba(0,0,0,.35);animation:simdrop .25s ease-out}
.simtoast .simic{color:var(--gold)}
@keyframes simdrop{from{transform:translateY(-20px);opacity:0}}
.siminfo{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
.simpill{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;padding:4px 10px;border-radius:99px;
  background:var(--sf2);color:var(--tx2)}
.simpill .simic{color:var(--gold)}
.simpill.simwarn{background:var(--kobg);color:var(--kot)}
.simpill.simwarn .simic{color:var(--kot)}
.simchat{display:flex;flex-direction:column;gap:8px;padding:4px 0 12px}
.simsay{max-width:86%;padding:10px 13px;border-radius:18px;line-height:1.4;font-size:14.5px;overflow-wrap:anywhere}
.simguest{align-self:flex-start;background:var(--sf2);border-bottom-left-radius:6px}
.simguest small{display:block;color:var(--gold);font-size:11px;font-weight:700;margin-bottom:2px}
.simmine2{align-self:flex-end;background:var(--gbtn);color:var(--ong);border-bottom-right-radius:6px}
.simsys{align-self:center;max-width:92%;text-align:center;color:var(--mu);font-size:12.5px;line-height:1.4;display:flex;gap:6px;align-items:center}
.simfb{align-self:flex-end;max-width:86%;font-size:12.5px;line-height:1.4;padding:6px 10px;border-radius:12px}
.simfb.simg-best{background:var(--okbg);color:var(--okx)}
.simfb.simg-ok{background:var(--sf2);color:var(--tx2)}
.simfb.simg-wrong,.simfb.simg-danger{background:var(--kobg);color:var(--kox)}
.simfb b{margin-right:4px}
.simchoices{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin-top:6px}
.simopt{display:flex;align-items:center;gap:10px;padding:12px;border-radius:16px;background:var(--sf);border:2px solid var(--sf3);
  color:var(--tx);font:inherit;font-size:14.5px;line-height:1.35;text-align:left;width:100%;min-width:0}
.simopt:active{transform:scale(.98)}
.simopt .simletter{width:26px;height:26px;border-radius:13px;background:var(--sf3);display:flex;align-items:center;
  justify-content:center;font-size:12px;font-weight:800;flex:none}
.simopt span:last-child{min-width:0;overflow-wrap:anywhere}
.simwait{display:flex;align-items:center;gap:10px;padding:14px;border-radius:16px;background:var(--sf);color:var(--mu);font-size:14px}
.simwait .simic{color:var(--gold)}
.simcode{display:block;width:100%;height:64px;border-radius:18px;border:2px solid var(--line);background:var(--sf2);color:var(--tx);
  font-size:32px;font-weight:800;letter-spacing:.4em;text-align:center;margin:6px 0 14px;padding-left:.4em}
.simbigcode{font-size:46px;font-weight:800;letter-spacing:.3em;color:var(--gold);text-align:center;margin:6px 0 2px;
  font-variant-numeric:tabular-nums}
.simplayers{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}
.simscore{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;border-radius:16px;background:var(--sf);margin-bottom:8px}
.simscore>*{min-width:0}
.simscore b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.simscore .simpts{font-weight:800;color:var(--gold);font-variant-numeric:tabular-nums}
.simscore .simrank{font-weight:800;color:var(--mu);text-align:center}
.simresult{text-align:center;padding:30px 0 10px}
.simresult .simbigic{width:76px;height:76px;border-radius:38px;margin:0 auto 10px;background:var(--pill);color:var(--gold);
  display:flex;align-items:center;justify-content:center}
.simxp{display:inline-block;margin-top:12px;padding:6px 14px;border-radius:999px;background:var(--gold);color:#111;font-weight:800}
.simdlgic{background:var(--pill)!important;color:var(--gold)}
.simfoot{position:fixed;left:0;right:0;bottom:0;z-index:25;max-width:640px;margin:0 auto;display:flex;gap:10px;
  padding:12px 16px calc(14px + env(safe-area-inset-bottom));background:linear-gradient(transparent,var(--bg) 30%)}
.simfoot .btn{flex:1;min-width:0}
.simrowend{display:flex;align-items:center;gap:6px}
.simseg2{grid-template-columns:repeat(2,minmax(0,1fr))}
.simseg2 .simsegbtn{font-size:14px}
.simcall{display:flex;align-items:center;gap:8px;padding:8px 10px;margin:0 0 10px;border-radius:18px;background:var(--sf)}
.simcall.simcallbar{position:fixed;left:0;right:0;bottom:0;z-index:26;max-width:640px;margin:0 auto;border-radius:20px 20px 0 0;
  padding:8px 12px calc(8px + env(safe-area-inset-bottom));box-shadow:0 -8px 24px rgba(0,0,0,.28)}
body:not(.notabs) .simcall.simcallbar{bottom:calc(76px + env(safe-area-inset-bottom));border-radius:20px}
#simPage.simtablepage{padding-bottom:calc(170px + env(safe-area-inset-bottom))}
.simtopfab{position:fixed;right:16px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:27;width:46px;height:46px;border-radius:23px;
  border:0;background:var(--sf2);color:var(--tx);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.3);
  opacity:0;pointer-events:none;transform:translateY(10px);transition:opacity .22s ease,transform .22s ease}
.simtopfab.simshow{opacity:1;pointer-events:auto;transform:none}
body:not(.notabs) .simtopfab{bottom:calc(168px + env(safe-area-inset-bottom))}
.simresume .simsmallbtn{display:inline-flex;align-items:center}
@media (min-width:960px){body:not(.notabs) .simcall.simcallbar,body:not(.notabs) .simfoot{left:248px}
  body:not(.notabs) .simcall.simcallbar{bottom:0;border-radius:20px 20px 0 0}body:not(.notabs) .simtopfab{bottom:calc(92px + env(safe-area-inset-bottom))}}
.simavatars{flex:1;min-width:0;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.simavatars::-webkit-scrollbar{display:none}
.simguestav{flex:none;width:46px;display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--tx2)}
.simguestav .simic{width:34px;height:34px;padding:5px;border-radius:17px;background:var(--sf2);box-sizing:border-box}
.simguestav small{font-size:10px;max-width:46px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.simguestav.simk-c .simic{color:var(--st1)}
.simguestav.simtalk .simic{color:var(--gold);box-shadow:0 0 0 2px var(--gold);animation:simring 1s ease-out infinite}
@keyframes simring{0%{box-shadow:0 0 0 2px var(--gold)}100%{box-shadow:0 0 0 9px transparent}}
.simcallbtns{display:flex;align-items:center;gap:2px;flex:none}
.simcallbtns .simsmallbtn{display:inline-flex;align-items:center;gap:5px}
.simiconbtn.simoff{color:var(--mu)}
.simguest small .simic{vertical-align:-2px;margin-right:3px}
.simwaitscene{flex-direction:column;text-align:center}
.simwaitscene .simsub{color:var(--mu);font-size:12px}
.simdrink{display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:18px;background:var(--sf);border:2px solid var(--sf3)}
.simdrinkhead{display:flex;align-items:center;gap:10px}
.simdrinkhead .simic{color:var(--gold)}
.simdrinkhead small{display:block;color:var(--mu);font-size:11.5px}
.simdrinklabel{font-size:12.5px;font-weight:700;color:var(--tx2);margin:4px 0 6px}
.simdrinklabel span{color:var(--mu);font-weight:400}
.simchips{display:flex;flex-wrap:wrap;gap:6px}
.simchip{display:inline-flex;align-items:center;gap:5px;min-height:36px;padding:6px 12px;border-radius:18px;background:var(--sf2);
  color:var(--tx);font:inherit;font-size:13px;line-height:1.25;border:2px solid transparent;text-align:left;max-width:100%;overflow-wrap:anywhere}
.simchip.simon{border-color:var(--gold);background:var(--pill);font-weight:700}
.simserve,.simwide{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:4px}
.simdrawer{position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;
  animation:simfade .2s ease-out}
.simdrawerbox{width:100%;max-width:640px;max-height:82vh;overflow-y:auto;background:var(--bg);border-radius:24px 24px 0 0;
  padding:12px 16px calc(18px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px;animation:simrise .25s ease-out}
.simdrawerhead{display:flex;align-items:center;gap:8px;min-height:44px}
.simdrawerhead>.simic{color:var(--gold)}
.simgame .simtag{font-variant-numeric:tabular-nums}
.simgame .simtag .simic{color:var(--mu)}
.simcode.simbad{border-color:var(--kob)}
@keyframes simfade{from{opacity:0}}
@keyframes simrise{from{transform:translateY(40px);opacity:.4}}
@media (prefers-reduced-motion: reduce){.simguestav.simtalk .simic,.simdrawer,.simdrawerbox{animation:none}.simtopfab{transition:none}}
`;

// ===== THE MENU DATA 🍽️ ===== //

/**
 * `todayIso` - Function 📅
 *
 * @returns { string } - today's date as YYYY-MM-DD (to know which dishes left the carte)
 */
function todayIso() {
  const now = new Date();
  return (
    now.getFullYear() +
    '-' +
    String(now.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(now.getDate()).padStart(2, '0')
  );
}

/**
 * `dinnerDishes` - Function 🍽️
 *
 * @returns { Array<object> } - the dinner carte today (svc 'diner', not past its `until` date)
 */
function dinnerDishes() {
  const today = todayIso();
  return (menuData().dishes || []).filter(
    (dish) => Array.isArray(dish.svc) && dish.svc.includes('diner') && (!dish.until || dish.until > today),
  );
}

/**
 * `oldDishes` - Function 🍂
 *
 * @returns { Array<object> } - dinner dishes that are no longer on the carte (their `until` date has passed)
 */
function oldDishes() {
  const today = todayIso();
  return (menuData().dishes || []).filter(
    (dish) => Array.isArray(dish.svc) && dish.svc.includes('diner') && dish.until && dish.until <= today,
  );
}

/**
 * `mainDishes` - Function 🐟
 *
 * @returns { Array<object> } - the dinner mains (from the sea, from the land, vegetarian)
 */
function mainDishes() {
  return dinnerDishes().filter((dish) => ['De la mer', 'De la terre', 'Végétarien'].includes(dish.s));
}

/**
 * `dessertDishes` - Function 🍰
 *
 * @returns { Array<object> } - the dinner desserts
 */
function dessertDishes() {
  return dinnerDishes().filter((dish) => dish.s === 'Desserts');
}

/**
 * `allergenCodes` - Function ⚠️
 *
 * @param { object } dish - a dish
 * @returns { Array<string> } - its allergen codes (a likely one, `egg?`, counts as present: safety first)
 */
function allergenCodes(dish) {
  return String((dish && dish.alg) || '')
    .split(',')
    .map((code) => code.replace('?', '').trim())
    .filter(Boolean);
}

/**
 * `dishName` - Function 🏷️
 *
 * @param { object } dish - a dish
 * @returns { {fr: string, en: string} } - its name (the English one = the first part of its translation)
 */
function dishName(dish) {
  return both(dish.n, dish.en ? String(dish.en).split(/[,:]/)[0].trim() : dish.n);
}

/**
 * `glassWines` - Function 🍷
 *
 * @param { string } colour - 'Blanc', 'Rosé' or 'Rouge'
 * @returns { Array<object> } - the dinner wines by the glass of that colour
 */
function glassWines(colour) {
  return (menuData().wines || []).filter((wine) => /^Verre/.test(wine.f || '') && wine.c === colour);
}

/**
 * `wineLine` - Function 🍷
 *
 * @param { object } wine - a wine of LTF.wines
 * @returns { {fr: string, en: string} } - the spoken line: « C'est un blanc de Provence, appellation …, signé … »
 */
function wineLine(wine) {
  const region = REGION_FROM[wine.r] || ['de ' + wine.r, 'from ' + wine.r];
  const colours = { Blanc: ['blanc', 'white'], Rosé: ['rosé', 'rosé'], Rouge: ['rouge', 'red'] }[wine.c] || [
    'vin',
    'wine',
  ];
  return both(
    `Je vous conseille un verre de ${wine.w} : c'est un ${colours[0]} ${region[0]}, appellation ${wine.a}, millésime ${wine.v}.`,
    `I'd suggest a glass of ${wine.w}: it's a ${colours[1]} ${region[1]}, ${wine.a}, ${wine.v} vintage.`,
  );
}

/**
 * `coupeChampagnes` - Function 🥂
 *
 * @returns { Array<object> } - the champagnes by the glass (« Coupe 15 cl »)
 */
function coupeChampagnes() {
  return (menuData().champagnes || []).filter((champagne) => /^Coupe/.test(champagne.t || ''));
}

/**
 * `houseCocktails` - Function 🍸
 *
 * @returns { Array<object> } - the house cocktails with alcohol (the mocktail & softs left out)
 */
function houseCocktails() {
  return (menuData().cocktails || []).filter(
    (cocktail) => !/mocktail|Citronnade|Thé glacé/i.test(cocktail.n) && Number(cocktail.p) >= 15,
  );
}

// ===== TABLES & BOOKINGS 🎲 ===== //

/**
 * `floorTables` - Function 🗺️
 *
 * @returns { Array<object> } - the real floor plan's tables (LTF.tables: id, x, y, shape, cap)
 */
function floorTables() {
  return (menuData().tables || []).filter((table) => table && /^[A-Z][0-9]{1,3}$/.test(table.id));
}

/**
 * `capacityOf` - Function 🪑
 *
 * @param { object } table - a table of the plan
 * @returns { [number, number] } - its [fewest, most] covers (2-4 assumed when the plan prints none)
 */
function capacityOf(table) {
  const match = /^(\d+)-(\d+)p$/.exec(table.cap || '');
  return match ? [Number(match[1]), Number(match[2])] : [2, 4];
}

/**
 * `tableFits` - Function 🪑
 *
 * @param { object } table - a table of the plan
 * @param { number } covers - a party size
 * @returns { boolean } - true when the party fits (the long table T100 is kept for 6 or more)
 */
function tableFits(table, covers) {
  const [fewest, most] = capacityOf(table);
  if (covers > most) return false;
  if (fewest >= 6) return covers >= 6;
  return covers >= Math.min(fewest, 1);
}

/**
 * `autoRangs` - Function ✂️
 *
 * Splits the room into N rangs by position: tables sorted from left to right (x), cut into equal groups.
 *
 * @param { number } count - the number of waiters (1 to 4)
 * @returns { object } - { tableId: rang index }
 */
function autoRangs(count) {
  const sorted = floorTables()
    .slice()
    .sort((left, right) => left.x - right.x || left.y - right.y);
  const rangs = {};
  sorted.forEach(
    (table, index) => (rangs[table.id] = Math.min(count - 1, Math.floor((index * count) / sorted.length))),
  );
  return rangs;
}

/**
 * `makeBooking` - Function 📝
 *
 * @param { object } table - the table it's on
 * @param { number } covers - the party size
 * @param { Array<string> } usedNames - the surnames already used tonight (no twins on the sheet)
 * @returns { object } - a fictional booking { table, first, last, gender, covers, time, occasion, allergies, veg, hotel, first visit, seed, party }
 */
function makeBooking(table, covers, usedNames) {
  const person = randomItem(FIRST_NAMES);
  const surname = randomItem(SURNAMES.filter((name) => !usedNames.includes(name)));
  usedNames.push(surname);
  // 🎂 every booking may be a birthday (so zero, some or all of them can be), else maybe an anniversary or business
  const roll = Math.random();
  const occasion = roll < 0.3 ? 'birthday' : roll < 0.4 ? 'anniversary' : roll < 0.52 ? 'business' : '';
  // ⚠️ some guests have an allergy or an intolerance (rarely two)
  const allergies = [];
  if (Math.random() < 0.4) {
    const pool = shuffle(ALLERGIES).slice(0, Math.random() < 0.15 ? 2 : 1);
    pool.forEach((allergy) =>
      allergies.push({ id: allergy.id, who: covers > 1 && Math.random() < 0.5 ? 'friend' : 'me' }),
    );
  }
  const booking = {
    table: table.id,
    first: person[0],
    last: surname,
    gender: person[1],
    covers,
    time: SERVICE_START + 15 * randomInt(0, (LAST_ARRIVAL - SERVICE_START) / 15),
    occasion,
    allergies,
    veg: Math.random() < 0.12 ? 1 : 0,
    hotel: Math.random() < 0.25 ? 1 : 0,
    firstVisit: Math.random() < 0.3 ? 1 : 0,
    friend: Math.random() < 0.5 ? 'f' : 'm',
    seed: randomInt(1, 2147483646),
  };
  // 👪 who sits at the table (stored with the booking, so every phone of an online game hears the same voices)
  booking.party = partyFromSeed(booking);
  return booking;
}

/**
 * `partyFromSeed` - Function 👪
 *
 * The party's composition from the booking's seed: the booker first, their friend second, then men, women and
 * sometimes children (never at a business meal).
 *
 * @param { object } booking - a booking (gender, friend, covers, occasion, seed)
 * @returns { string } - one letter per guest: 'm' a man, 'f' a woman, 'c' a child (e.g. 'fmc')
 */
function partyFromSeed(booking) {
  const random = makeRandom(((booking.seed * 3 + 11) % 2147483646) + 1);
  let party = booking.gender === 'f' ? 'f' : 'm';
  if (booking.covers > 1) party += booking.friend === 'f' ? 'f' : 'm';
  // 🧒 children now and then, from the third guest on
  const children =
    booking.occasion !== 'business' && booking.covers >= 3 && random() < 0.35
      ? Math.min(booking.covers - 2, random() < 0.4 ? 2 : 1)
      : 0;
  for (let index = 2; index < booking.covers; index++)
    party += index >= booking.covers - children ? 'c' : random() < 0.5 ? 'f' : 'm';
  return party;
}

/**
 * `cleanParty` - Function 🧼
 *
 * @param { any } party - a party from the network
 * @param { object } booking - its (already cleaned) booking
 * @returns { string } - the party when it fits the booking, else the one its seed gives
 */
function cleanParty(party, booking) {
  const valid =
    typeof party === 'string' &&
    /^[mfc]{1,10}$/.test(party) &&
    party.length === booking.covers &&
    party[0] === booking.gender &&
    (booking.covers < 2 || party[1] === booking.friend) &&
    (booking.occasion !== 'business' || !party.includes('c'));
  return valid ? party : partyFromSeed(booking);
}

/**
 * `partyGuests` - Function 👪
 *
 * @param { object } booking - a booking
 * @returns { Array<{index: number, kind: string, slot: number, name: {fr: string, en: string}}> } - every guest,
 *   with a fictional first name from the seed (the booker is « Madame Rossi ») and their rank among their kind
 */
function partyGuests(booking) {
  const party = booking.party || partyFromSeed(booking);
  const random = makeRandom(((booking.seed * 5 + 17) % 2147483646) + 1);
  const used = [booking.first];
  const slots = { m: 0, f: 0, c: 0 };
  return party.split('').map((kind, index) => {
    const slot = slots[kind]++;
    if (index === 0) return { index, kind, slot, name: guestTitle(booking) };
    const pool =
      kind === 'c'
        ? CHILD_NAMES.filter((name) => !used.includes(name))
        : FIRST_NAMES.filter((person) => person[1] === kind && !used.includes(person[0])).map(
            (person) => person[0],
          );
    const first = randomItem(pool, random) || '?';
    used.push(first);
    return {
      index,
      kind,
      slot,
      name: kind === 'c' ? both(first + ' (enfant)', first + ' (child)') : both(first, first),
    };
  });
}

/**
 * `generateBookings` - Function 🎲
 *
 * 5 to 10 bookings tonight, each on a table that fits it (sometimes 8 to 10 guests at the long table T100).
 *
 * @returns { Array<object> } - the bookings, by arrival time
 */
function generateBookings() {
  const count = randomInt(5, 10);
  const free = shuffle(floorTables());
  const usedNames = [];
  const bookings = [];
  // 👨‍👩‍👧‍👦 the big table, now and then
  const bigTable = free.find((table) => capacityOf(table)[0] >= 6);
  if (bigTable && Math.random() < 0.4) {
    bookings.push(makeBooking(bigTable, randomInt(8, 10), usedNames));
    free.splice(free.indexOf(bigTable), 1);
  }
  while (bookings.length < count && free.length) {
    const covers = Math.random() < 0.08 ? 1 : randomInt(2, Math.random() < 0.3 ? 6 : 4);
    // 🪑 the tightest free table that fits
    const fitting = free
      .filter((table) => tableFits(table, covers))
      .sort((left, right) => capacityOf(left)[1] - capacityOf(right)[1]);
    if (!fitting.length) continue;
    const tightest = fitting.filter((table) => capacityOf(table)[1] === capacityOf(fitting[0])[1]);
    const table = randomItem(tightest);
    bookings.push(makeBooking(table, covers, usedNames));
    free.splice(free.indexOf(table), 1);
  }
  return bookings.sort((left, right) => left.time - right.time || left.table.localeCompare(right.table));
}

/**
 * `cleanBooking` - Function 🧼
 *
 * Checks a booking from the network (an online game): every field typed, sized and known, or the booking is dropped.
 *
 * @param { any } booking - a booking
 * @returns { object | null } - a safe booking, or null
 */
function cleanBooking(booking) {
  if (!booking || typeof booking !== 'object') return null;
  const namePattern = /^[\p{L}' -]{1,40}$/u;
  const table = floorTables().find((entry) => entry.id === booking.table);
  const covers = Number(booking.covers);
  const time = Number(booking.time);
  const seed = Number(booking.seed);
  if (!table || !namePattern.test(booking.first || '') || !namePattern.test(booking.last || '')) return null;
  if (!Number.isInteger(covers) || covers < 1 || covers > 10) return null;
  if (!Number.isInteger(time) || time < SERVICE_START || time > LAST_ARRIVAL) return null;
  if (!Number.isInteger(seed) || seed < 1 || seed > 2147483647) return null;
  const clean = {
    table: table.id,
    first: booking.first,
    last: booking.last,
    gender: booking.gender === 'f' ? 'f' : 'm',
    covers,
    time,
    occasion: ['birthday', 'anniversary', 'business'].includes(booking.occasion) ? booking.occasion : '',
    allergies: (Array.isArray(booking.allergies) ? booking.allergies : [])
      .slice(0, 2)
      .filter((allergy) => allergy && ALLERGIES.some((known) => known.id === allergy.id))
      .map((allergy) => ({ id: allergy.id, who: allergy.who === 'friend' ? 'friend' : 'me' })),
    veg: booking.veg ? 1 : 0,
    hotel: booking.hotel ? 1 : 0,
    firstVisit: booking.firstVisit ? 1 : 0,
    friend: booking.friend === 'f' ? 'f' : 'm',
    seed,
  };
  clean.party = cleanParty(booking.party, clean);
  return clean;
}

/**
 * `allergyOf` - Function ⚠️
 *
 * @param { string } id - an allergy id
 * @returns { object } - its entry in ALLERGIES
 */
function allergyOf(id) {
  return ALLERGIES.find((allergy) => allergy.id === id) || ALLERGIES[0];
}

/**
 * `guestTitle` - Function 🎩
 *
 * @param { object } booking - a booking
 * @returns { {fr: string, en: string} } - « Madame Rossi » / « Mrs Rossi »
 */
function guestTitle(booking) {
  return booking.gender === 'f'
    ? both('Madame ' + booking.last, 'Mrs ' + booking.last)
    : both('Monsieur ' + booking.last, 'Mr ' + booking.last);
}

/**
 * `bookingNotes` - Function 🗒️
 *
 * @param { object } booking - a booking
 * @returns { Array<{icon: string, text: {fr: string, en: string}, warn?: boolean}> } - its notes (the sheet's last column)
 */
function bookingNotes(booking) {
  const notes = [];
  if (booking.occasion === 'birthday') notes.push({ icon: 'cake', text: both('Anniversaire', 'Birthday') });
  if (booking.occasion === 'anniversary')
    notes.push({ icon: 'heart', text: both('Anniversaire de mariage', 'Wedding anniversary') });
  if (booking.occasion === 'business')
    notes.push({ icon: 'briefcase', text: both("Repas d'affaires", 'Business meal') });
  booking.allergies.forEach((allergy) => {
    const entry = allergyOf(allergy.id);
    notes.push({
      icon: 'alert',
      warn: true,
      text: both(
        (entry.intolerance ? 'Intolérance ' : 'Allergie ') +
          entry.noun +
          (booking.covers > 1 ? ' (1 pers.)' : ''),
        (entry.intolerance ? 'Intolerance: ' : 'Allergy: ') +
          entry.en +
          (booking.covers > 1 ? ' (1 guest)' : ''),
      ),
    });
  });
  if (booking.veg) notes.push({ icon: 'leaf', text: both('Végétarien', 'Vegetarian') });
  if (booking.hotel) notes.push({ icon: 'bed', text: both("Client de l'hôtel", 'Hotel guest') });
  if (booking.firstVisit) notes.push({ icon: 'sparkle', text: both('1re visite', 'First visit') });
  if (booking.covers >= 8) notes.push({ icon: 'users', text: both('Grande table', 'Large party') });
  return notes;
}

// ===== THE TABLE DIALOGUE 💬 ===== //

// the allergen codes of the dishes (`alg`), spoken: [FR with article, EN] ⚠️
const CODE_LABELS = {
  gluten: ['du gluten', 'gluten'],
  crust: ['des crustacés', 'crustaceans'],
  egg: ["de l'œuf", 'egg'],
  fish: ['du poisson', 'fish'],
  moll: ['des mollusques', 'molluscs'],
  milk: ['du lait', 'milk'],
  nuts: ['des fruits à coque', 'tree nuts'],
  pine: ['des pignons de pin', 'pine nuts'],
  celery: ['du céleri', 'celery'],
  soy: ['du soja', 'soy'],
  sesame: ['du sésame', 'sesame'],
  pork: ['du porc', 'pork'],
};

/**
 * `choice` - Function 🔘
 *
 * @param { string } grade - 'best', 'ok', 'wrong' or 'danger' (a risk for the guest's health)
 * @param { {fr: string, en: string} } text - what the waiter says or does
 * @param { {fr: string, en: string} } feedback - the short explanation shown after the tap
 * @returns { object } - a choice { grade, text, feedback }
 */
function choice(grade, text, feedback) {
  return { grade, text, feedback };
}

/**
 * `labelsOf` - Function ⚠️
 *
 * @param { Array<string> } codes - allergen codes
 * @returns { {fr: string, en: string} } - « du gluten et du lait » / « gluten and milk »
 */
function labelsOf(codes) {
  const known = codes.filter((code) => CODE_LABELS[code]);
  /**
   * `join` - Function 🔗
   *
   * @param { Array<string> } list - words
   * @param { string } word - the last link ('et' / 'and')
   * @returns { string } - « a, b et c »
   */
  const join = (list, word) =>
    list.length > 1 ? list.slice(0, -1).join(', ') + ' ' + word + ' ' + list[list.length - 1] : list[0] || '';
  return both(
    join(
      known.map((code) => CODE_LABELS[code][0]),
      'et',
    ),
    join(
      known.map((code) => CODE_LABELS[code][1]),
      'and',
    ),
  );
}

/**
 * `allergyLine` - Function 💬
 *
 * @param { object } booking - a booking
 * @returns { {fr: string, en: string} } - what the guest says when asked about allergies (and vegetarian)
 */
function allergyLine(booking) {
  const female = booking.gender === 'f';
  const friendFemale = booking.friend === 'f';
  const french = [];
  const english = [];
  booking.allergies.forEach((allergy) => {
    const entry = allergyOf(allergy.id);
    if (allergy.who === 'friend') {
      const word = entry.intolerance ? (friendFemale ? 'intolérante' : 'intolérant') : 'allergique';
      french.push(`${friendFemale ? 'Mon amie' : 'Mon ami'} est ${word} ${entry.fr}.`);
      english.push(`My friend is ${entry.intolerance ? 'intolerant to' : 'allergic to'} ${entry.en}.`);
    } else {
      const word = entry.intolerance ? (female ? 'intolérante' : 'intolérant') : 'allergique';
      french.push(`Je suis ${word} ${entry.fr}.`);
      english.push(`I'm ${entry.intolerance ? 'intolerant to' : 'allergic to'} ${entry.en}.`);
    }
  });
  if (booking.veg) {
    french.push(female ? 'Et je suis végétarienne.' : 'Et je suis végétarien.');
    english.push("And I'm vegetarian.");
  }
  if (!french.length) return both('Non, rien de particulier, merci.', 'No, nothing in particular, thanks.');
  return both('Oui. ' + french.join(' '), 'Yes. ' + english.join(' '));
}

/**
 * `buildSteps` - Function 🧩
 *
 * Builds a table's whole dialogue from its booking and the real carte, with a seeded random generator
 * (every phone of an online game builds exactly the same steps & the same order of choices).
 *
 * @param { object } booking - a booking
 * @returns { Array<object> } - the steps { key, status, wait, note, guest, choices }
 */
function buildSteps(booking) {
  const random = makeRandom(booking.seed);
  const steps = [];
  const title = guestTitle(booking);
  const covers = booking.covers;
  const celebrate = booking.occasion === 'birthday' || booking.occasion === 'anniversary';

  /**
   * `addStep` - Function ➕
   *
   * @param { object } step - a step (its choices get shuffled)
   * @returns { void }
   */
  function addStep(step) {
    steps.push(
      Object.assign({ note: null, guest: null, wait: 0 }, step, { choices: shuffle(step.choices, random) }),
    );
  }

  // 👋 1. the welcome
  addStep({
    key: 'welcome',
    status: 'arrived',
    note: both(
      covers > 1 ? `${covers} personnes arrivent à l'accueil.` : "Une personne arrive à l'accueil.",
      covers > 1 ? `${covers} guests walk in.` : 'A guest walks in.',
    ),
    guest:
      covers > 1
        ? both('Bonsoir, nous avons réservé.', 'Good evening, we have a booking.')
        : both("Bonsoir, j'ai réservé.", 'Good evening, I have a booking.'),
    choices: [
      choice(
        'best',
        both(
          "Bonsoir et bienvenue aux Trois Forts ! À quel nom, s'il vous plaît ?",
          'Good evening and welcome to Les Trois Forts! What name is it under, please?',
        ),
        both(
          'Un accueil chaleureux, puis le nom pour retrouver la réservation.',
          'A warm welcome, then the name to find the booking.',
        ),
      ),
      choice(
        'ok',
        both('Bonsoir. Vous êtes combien ?', 'Good evening. How many of you?'),
        both(
          "Poli, mais le nom d'abord : c'est lui qui retrouve la table.",
          'Polite, but the name first: it finds the table.',
        ),
      ),
      choice(
        'wrong',
        both('Vous avez réservé ? On est complet ce soir.', "Do you have a booking? We're full tonight."),
        both(
          'Ils viennent de dire qu’ils ont réservé : on cherche le nom.',
          'They just said they have a booking: look up the name.',
        ),
      ),
      choice(
        'wrong',
        both('Installez-vous où vous voulez.', 'Sit wherever you like.'),
        both(
          'Chaque table est attribuée sur la feuille : on accompagne toujours les clients.',
          'Every table is assigned on the sheet: always walk the guests to it.',
        ),
      ),
    ],
  });

  // 🪑 2. the name check & the seating
  const otherName = randomItem(
    SURNAMES.filter((name) => name !== booking.last),
    random,
  );
  const otherTitle = guestTitle(Object.assign({}, booking, { last: otherName }));
  const otherTable = randomItem(
    floorTables()
      .map((table) => table.id)
      .filter((id) => id !== booking.table),
    random,
  );
  addStep({
    key: 'seating',
    status: 'seated',
    wait: 1,
    guest: both(`Au nom de ${booking.last}, pour ${covers}.`, `Under ${booking.last}, for ${covers}.`),
    choices: [
      choice(
        'best',
        both(
          `Parfait, ${title.fr}, votre table vous attend. Puis-je vous débarrasser de vos manteaux ?`,
          `Perfect, ${title.en}, your table is ready. May I take your coats?`,
        ),
        both(
          `Le nom, le vestiaire (cintre au numéro ${booking.table}), puis on accompagne à la table.`,
          `The name, the coats (hanger number ${booking.table}), then walk them to the table.`,
        ),
      ),
      choice(
        'ok',
        both('Très bien, suivez-moi.', 'Very good, follow me.'),
        both(
          'Correct, mais appelez-les par leur nom et proposez le vestiaire.',
          'Fine, but use their name and offer to take the coats.',
        ),
      ),
      choice(
        'wrong',
        both(`Bienvenue, ${otherTitle.fr} !`, `Welcome, ${otherTitle.en}!`),
        both(
          `Ce n'est pas le nom sur la feuille : c'est ${title.fr}.`,
          `That's not the name on the sheet: it's ${title.en}.`,
        ),
      ),
      choice(
        'wrong',
        both(`Je vous installe à la table ${otherTable} ?`, `Shall I seat you at table ${otherTable}?`),
        both(
          `La feuille dit ${booking.table} : on respecte le plan de salle.`,
          `The sheet says ${booking.table}: stick to the floor plan.`,
        ),
      ),
    ],
  });

  // 💧 3. the water
  addStep({
    key: 'water',
    status: 'seated',
    wait: 2,
    note: both(
      `Les clients sont installés à la ${booking.table}.`,
      `The guests are seated at ${booking.table}.`,
    ),
    guest: both(
      'Merci, c’est très joli ici, avec la vue sur le port.',
      "Thank you, it's lovely here, with the view of the harbour.",
    ),
    choices: [
      choice(
        'best',
        both(
          "Je vous apporte de l'eau ? Plutôt pétillante, plate, ou une carafe ?",
          'Shall I bring you some water? Sparkling, still, or a carafe?',
        ),
        both("L'eau d'abord, et on propose les trois.", 'Water first, and offer all three.'),
      ),
      choice(
        'ok',
        both('Vous voulez boire quelque chose ?', 'Would you like something to drink?'),
        both("Trop vague : la première question, c'est l'eau.", 'Too vague: the first question is water.'),
      ),
      choice(
        'wrong',
        both('Je vous sers une Evian ?', 'Shall I bring you an Evian?'),
        both(
          "Pas d'Evian à la carte : plates Vittel ou Zilia, pétillantes San Pellegrino ou Orezza.",
          'No Evian on the menu: still Vittel or Zilia, sparkling San Pellegrino or Orezza.',
        ),
      ),
      choice(
        'wrong',
        both('Vous avez déjà choisi vos plats ?', 'Have you chosen your dishes yet?'),
        both(
          "Trop tôt : ils n'ont pas encore la carte, et l'eau passe avant.",
          "Too early: they don't have the menu yet, and water comes first.",
        ),
      ),
    ],
  });

  // 🥂 4. the aperitif (champagne for an occasion)
  const waterKind = randomItem(['still', 'sparkling', 'carafe'], random);
  const waterName =
    waterKind === 'carafe'
      ? both("une carafe d'eau", 'a carafe of water')
      : (function namedBottle() {
          const bottle = randomItem(waterKind === 'still' ? STILL_WATERS : SPARKLING_WATERS, random);
          return both('une ' + bottle, 'a ' + bottle);
        })();
  const coupes = coupeChampagnes();
  const roseCoupe = coupes.find((champagne) => /Rosé/.test(champagne.n)) || {
    n: 'Taittinger Prestige Rosé',
    p: 27,
  };
  const brutCoupe = coupes.find((champagne) => !/Rosé/.test(champagne.n)) || {
    n: 'Pommery Apanage Brut',
    p: 25,
  };
  const cocktail = randomItem(houseCocktails(), random) || { n: 'Bellini Provençal' };
  const cocktailSay = sayLine('cocktail', cocktail.n);
  const wrongWater =
    waterKind === 'still'
      ? choice(
          'wrong',
          both('Je vous apporte une San Pellegrino.', "I'll bring you a San Pellegrino."),
          both(
            'Ils ont demandé de l’eau plate : Vittel ou Zilia.',
            'They asked for still water: Vittel or Zilia.',
          ),
        )
      : waterKind === 'sparkling'
        ? choice(
            'wrong',
            both('Je vous apporte une Vittel.', "I'll bring you a Vittel."),
            both(
              'Ils ont demandé de la pétillante : San Pellegrino ou Orezza.',
              'They asked for sparkling: San Pellegrino or Orezza.',
            ),
          )
        : choice(
            'wrong',
            both(
              'Je vous apporte une grande bouteille de Vittel.',
              "I'll bring you a large bottle of Vittel.",
            ),
            both(
              'Ils ont demandé une carafe : on ne leur impose pas une bouteille.',
              "They asked for a carafe: don't push a bottle on them.",
            ),
          );
  addStep({
    key: 'aperitif',
    status: 'seated',
    wait: 4,
    guest:
      waterKind === 'still'
        ? both("Plate, s'il vous plaît.", 'Still, please.')
        : waterKind === 'sparkling'
          ? both('Pétillante, merci.', 'Sparkling, thanks.')
          : both('Une carafe, ce sera parfait.', 'A carafe will be perfect.'),
    choices: [
      celebrate
        ? choice(
            'best',
            both(
              `Je vous apporte ${waterName.fr}. Et pour fêter ça, une coupe de ${roseCoupe.n} ?`,
              `I'll bring you ${waterName.en}. And to celebrate, a glass of ${roseCoupe.n}?`,
            ),
            both(
              `Une occasion, une coupe de champagne rosé : le bon réflexe (${roseCoupe.p} € la coupe).`,
              `An occasion, a glass of rosé champagne: the right reflex (${roseCoupe.p} € a glass).`,
            ),
          )
        : choice(
            'best',
            both(
              `Je vous apporte ${waterName.fr}. Pour l'apéritif, une coupe de ${brutCoupe.n}, ou notre ${cocktail.n} ?`,
              `I'll bring you ${waterName.en}. For an aperitif, a glass of ${brutCoupe.n}, or our ${cocktail.n}?`,
            ),
            cocktailSay.fr
              ? cocktailSay
              : both('Une suggestion précise donne envie.', 'A precise suggestion makes it tempting.'),
          ),
      choice(
        'ok',
        both(
          `Je vous apporte ${waterName.fr}. Vous prendrez un apéritif ?`,
          `I'll bring you ${waterName.en}. Would you like an aperitif?`,
        ),
        both(
          'Correct, mais une suggestion précise vend mieux.',
          'Fine, but a precise suggestion sells better.',
        ),
      ),
      choice(
        'wrong',
        both("On n'a pas de champagne au verre, désolé.", "We don't serve champagne by the glass, sorry."),
        both(
          `Si : ${brutCoupe.n} et ${roseCoupe.n} en coupe de 15 cl.`,
          `We do: ${brutCoupe.n} and ${roseCoupe.n} by the 15 cl glass.`,
        ),
      ),
      wrongWater,
    ],
  });

  // 📖 5. presenting the menu
  addStep({
    key: 'menu',
    status: 'seated',
    wait: 3,
    guest: celebrate
      ? both("Avec plaisir, c'est une soirée spéciale !", "With pleasure, it's a special evening!")
      : both('Volontiers, merci.', 'Yes please, thank you.'),
    choices: [
      choice(
        'best',
        both(
          'Voici nos cartes. Sur la gauche, notre Menu Dégustation, un menu surprise du chef ; à droite, la carte.',
          "Here are our menus. On the left, our Tasting Menu, the chef's surprise menu; on the right, the à la carte.",
        ),
        both(
          "Carte ouverte, donnée à la dame d'abord, et on présente le Menu Dégustation.",
          'Menu opened, handed to the lady first, and present the Tasting Menu.',
        ),
      ),
      choice(
        'ok',
        both('Voici les cartes, je vous laisse regarder.', "Here are the menus, I'll let you have a look."),
        both(
          'Bien, mais présentez le Menu Dégustation, page de gauche.',
          'Good, but present the Tasting Menu, on the left page.',
        ),
      ),
      choice(
        'wrong',
        both('Je vous pose les cartes fermées sur la table.', "I'll leave the menus closed on the table."),
        both(
          'On ouvre la carte avant de la donner, à chaque client.',
          'Open the menu before handing it to each guest.',
        ),
      ),
      choice(
        'wrong',
        both("Ce soir, il n'y a que le menu du chef.", "Tonight there's only the chef's menu."),
        both(
          'Faux : la carte du dîner est là, le Menu Dégustation en plus.',
          'Wrong: the dinner carte is there, plus the Tasting Menu.',
        ),
      ),
    ],
  });

  // 🩺 6. the allergy check
  addStep({
    key: 'allergy',
    status: 'seated',
    note: both('Les clients ont refermé la carte.', 'The guests have closed their menus.'),
    guest: both("Je crois qu'on est prêts !", "I think we're ready!"),
    choices: [
      choice(
        'best',
        both(
          'Avant de prendre la commande : avez-vous des allergies, ou des choses que vous ne mangez pas ?',
          "Before I take your order: any allergies, or anything you don't eat?",
        ),
        both(
          'Toujours avant la commande, pour toute la table.',
          'Always before the order, for the whole table.',
        ),
      ),
      choice(
        'ok',
        both("Je vous écoute. Pas d'allergies, j'imagine ?", 'Go ahead. No allergies, I suppose?'),
        both(
          'On ne suppose jamais : posez la question ouvertement.',
          'Never assume: ask the question openly.',
        ),
      ),
      choice(
        'wrong',
        both('Je vous écoute !', 'Go ahead!'),
        both(
          'Vous avez oublié les allergies : à demander avant chaque commande.',
          'You forgot the allergies: ask before every order.',
        ),
      ),
      choice(
        'wrong',
        both('Le chef ne fait aucune modification.', "The chef doesn't make any changes."),
        both(
          'On note toujours les allergies et on en parle avec la cuisine.',
          'Always note allergies and talk to the kitchen.',
        ),
      ),
    ],
  });

  // 📝 7. the order (wrong answers include dishes with the guest's allergen)
  const coded = [];
  const uncoded = [];
  booking.allergies.forEach((allergy) => {
    const entry = allergyOf(allergy.id);
    if (entry.codes.length) entry.codes.forEach((code) => !coded.includes(code) && coded.push(code));
    else uncoded.push(entry);
  });
  const mains = mainDishes();
  /**
   * `clashes` - Function ⚠️
   *
   * @param { object } dish - a dish
   * @returns { Array<string> } - its allergen codes that the guests can't have
   */
  const clashes = (dish) => allergenCodes(dish).filter((code) => coded.includes(code));
  /**
   * `isSafe` - Function ✅
   *
   * @param { object } dish - a dish
   * @returns { boolean } - true when it has none of their allergens (and is vegetarian when they are)
   */
  const isSafe = (dish) => !clashes(dish).length && (!booking.veg || dish.s === 'Végétarien');
  const safeMains = mains.filter(isSafe);
  const mainDish = randomItem(safeMains, random) ||
    mains.find((dish) => dish.s === 'Végétarien') ||
    mains[0] || { n: 'Plat du jour', s: 'De la mer' };
  const mainName = dishName(mainDish);
  const mainSay = sayLine('dish', mainDish.n);
  const cookingTip =
    mainDish.pict === 'beef'
      ? both(' Pensez à demander la cuisson.', ' Remember to ask how they want it cooked.')
      : both('', '');
  const orderChoices = [];
  if (uncoded.length) {
    const nouns = both(
      uncoded.map((entry) => entry.noun).join(', '),
      uncoded.map((entry) => entry.en).join(', '),
    );
    orderChoices.push(
      choice(
        'best',
        both(
          `Pour ${nouns.fr}, je vérifie avec le chef et je reviens vers vous. Sinon, je vous conseille « ${mainName.fr} ».`,
          `About ${nouns.en}, I'll check with the chef and come back to you. Otherwise, I'd suggest the « ${mainName.en} ».`,
        ),
        both(
          `${nouns.fr} : pas sur notre fiche allergènes. On ne promet rien sans la cuisine.${cookingTip.fr}`,
          `${nouns.en}: not on our allergen chart. Promise nothing without the kitchen.${cookingTip.en}`,
        ),
      ),
      choice(
        'danger',
        both("Il n'y en a dans aucun plat, ne vous inquiétez pas.", "There's none in any dish, don't worry."),
        both(
          'Ne promettez jamais sans vérifier : seule la cuisine peut confirmer.',
          'Never promise without checking: only the kitchen can confirm.',
        ),
      ),
    );
  } else {
    const careFr = coded.length
      ? ' Je préviens la cuisine pour l’allergie.'
      : booking.veg
        ? " C'est notre plat végétarien."
        : '';
    const careEn = coded.length
      ? " I'll let the kitchen know about the allergy."
      : booking.veg
        ? " It's our vegetarian main."
        : '';
    orderChoices.push(
      choice(
        'best',
        both(
          `Je vous conseille « ${mainName.fr} ». ${mainSay.fr}${careFr}`.replace(/\s+/g, ' ').trim(),
          `I'd suggest the « ${mainName.en} ». ${mainSay.en}${careEn}`.replace(/\s+/g, ' ').trim(),
        ),
        coded.length
          ? both(
              `Sans risque pour cette allergie d'après la fiche (indicative) : toujours confirmer avec la cuisine.${cookingTip.fr}`,
              `Safe for this allergy according to the chart (indicative): always confirm with the kitchen.${cookingTip.en}`,
            )
          : both(
              `Un plat précis, raconté avec la phrase « À dire au client ».${cookingTip.fr}`,
              `A precise dish, told with its « What to say » line.${cookingTip.en}`,
            ),
      ),
    );
    const unsafe = mains.filter((dish) => clashes(dish).length);
    const notVeg = mains.filter((dish) => dish.s !== 'Végétarien');
    if (coded.length && unsafe.length) {
      const risky = randomItem(unsafe, random);
      orderChoices.push(
        choice(
          'danger',
          both(
            `Je vous conseille « ${dishName(risky).fr} », c'est un de nos meilleurs plats.`,
            `I'd suggest the « ${dishName(risky).en} », one of our best.`,
          ),
          both(
            `Danger : il contient ${labelsOf(clashes(risky)).fr}.`,
            `Danger: it contains ${labelsOf(clashes(risky)).en}.`,
          ),
        ),
      );
    } else if (booking.veg && notVeg.length) {
      const meaty = randomItem(notVeg, random);
      orderChoices.push(
        choice(
          'danger',
          both(`Je vous conseille « ${dishName(meaty).fr} ».`, `I'd suggest the « ${dishName(meaty).en} ».`),
          both("Ce plat n'est pas végétarien.", "That dish isn't vegetarian."),
        ),
      );
    }
  }
  const pastDish = randomItem(oldDishes(), random);
  if (pastDish)
    orderChoices.push(
      choice(
        'wrong',
        both(
          `Je vous conseille « ${dishName(pastDish).fr} ».`,
          `I'd suggest the « ${dishName(pastDish).en} ».`,
        ),
        both(
          "Ce plat n'est plus à la carte : on vend la carte d'hiver.",
          'That dish is off the menu now: sell the winter carte.',
        ),
      ),
    );
  orderChoices.push(
    choice(
      'ok',
      both('Tout est très bon, je vous laisse choisir.', "Everything's very good, I'll let you choose."),
      both(
        'Le client demande un conseil : donnez un plat précis.',
        'The guest asked for advice: name a dish.',
      ),
    ),
  );
  if (orderChoices.length < 4)
    orderChoices.push(
      choice(
        'wrong',
        both('Je ne sais pas, je ne goûte jamais les plats.', 'No idea, I never taste the dishes.'),
        both(
          'Connaissez la carte : chaque plat a sa phrase « À dire au client ».',
          'Know the carte: every dish has its « What to say » line.',
        ),
      ),
    );
  addStep({
    key: 'order|' + mainDish.n,
    status: 'seated',
    guest: both(
      allergyLine(booking).fr + ' Qu’est-ce que vous nous conseillez comme plat ?',
      allergyLine(booking).en + ' What would you recommend for the main course?',
    ),
    choices: orderChoices.slice(0, 4),
  });

  // 🍷 8. the wine (the colour that goes with the main course)
  // 🐟 seafood (even « De la terre », like the squid pieds paquets) → a white; meat & poultry → a red
  const fromSea = allergenCodes(mainDish).some((code) => ['fish', 'moll', 'crust'].includes(code));
  const colour = mainDish.s === 'De la terre' && !fromSea ? 'Rouge' : 'Blanc';
  const bestWine = randomItem(glassWines(colour), random);
  const roseWine = randomItem(glassWines('Rosé'), random);
  const clashWine = randomItem(glassWines(colour === 'Rouge' ? 'Blanc' : 'Rouge'), random);
  const sulphites = booking.allergies.some((allergy) => allergy.id === 'sulphites');
  const clueless = choice(
    'wrong',
    both(
      "Le vin, je n'y connais rien, prenez le moins cher.",
      "I don't know much about wine, take the cheapest.",
    ),
    both(
      'Vous devez pouvoir conseiller un vin au verre.',
      'You should be able to suggest a wine by the glass.',
    ),
  );
  const wineChoices = [];
  if (sulphites) {
    wineChoices.push(
      choice(
        'best',
        both(
          'Le vin contient des sulfites : je vous propose plutôt un cocktail sans alcool, et je vérifie la recette avec le bar.',
          "Wine contains sulphites: I'd rather suggest an alcohol-free cocktail, and I'll check the recipe with the bar.",
        ),
        both(
          'Sulfites : presque tous les vins en contiennent.',
          'Sulphites: almost every wine contains them.',
        ),
      ),
    );
    if (bestWine)
      wineChoices.push(
        choice(
          'danger',
          wineLine(bestWine),
          both('Le vin contient des sulfites !', 'Wine contains sulphites!'),
        ),
      );
  } else if (bestWine) {
    wineChoices.push(
      choice(
        'best',
        wineLine(bestWine),
        colour === 'Rouge'
          ? both('Un rouge avec la viande : le bon accord.', 'A red with the meat: the right pairing.')
          : both('Un blanc avec ce plat : le bon accord.', 'A white with this dish: the right pairing.'),
      ),
    );
  }
  if (roseWine && !sulphites)
    wineChoices.push(
      choice(
        'ok',
        wineLine(roseWine),
        both(
          `Un rosé de Provence passe partout, mais un ${colour.toLowerCase()} irait mieux.`,
          `A Provence rosé goes with anything, but a ${colour === 'Rouge' ? 'red' : 'white'} would suit better.`,
        ),
      ),
    );
  if (clashWine && colour === 'Blanc' && !sulphites)
    wineChoices.push(
      choice(
        'wrong',
        wineLine(clashWine),
        both(
          'Un rouge avec ce plat : pas l’accord idéal, plutôt un blanc.',
          'A red with this dish: not ideal, a white is better.',
        ),
      ),
    );
  wineChoices.push(clueless);
  if (wineChoices.length < 4)
    wineChoices.push(
      choice(
        'wrong',
        both('Je vous apporte notre bouteille la plus chère ?', 'Shall I bring our most expensive bottle?'),
        both(
          'On conseille selon le plat et le goût, pas selon le prix.',
          'Advise by the dish and taste, not the price.',
        ),
      ),
    );
  addStep({
    key: 'wine|' + (bestWine ? bestWine.w : 'none'),
    status: 'ordered',
    wait: 18,
    guest: both('Parfait, on prend ça. Et pour le vin ?', "Perfect, we'll have that. And for the wine?"),
    choices: wineChoices.slice(0, 4),
  });

  // 🍽️ 9. serving the mains
  addStep({
    key: 'mains',
    status: 'mains',
    wait: 20,
    note: both('Les plats de la table sont prêts au passe.', "The table's dishes are ready at the pass."),
    choices: [
      choice(
        'best',
        both(
          covers > 1
            ? `Je sers tout le monde en même temps, par la droite, les dames d'abord : « ${mainName.fr}, bonne dégustation. »`
            : `Je sers par la droite : « ${mainName.fr}, bonne dégustation. »`,
          covers > 1
            ? `I serve everyone at the same time, from the right, ladies first: « The ${mainName.en}, enjoy. »`
            : `I serve from the right: « The ${mainName.en}, enjoy. »`,
        ),
        both(
          'Tous les plats ensemble, par la droite, et on annonce chaque plat.',
          'All plates together, from the right, naming each dish.',
        ),
      ),
      choice(
        'ok',
        both(
          "Je pose les assiettes, puis j'annonce les plats.",
          'I set the plates down, then name the dishes.',
        ),
        both(
          'Annoncez chaque plat en le posant, pas après.',
          'Name each dish as you set it down, not after.',
        ),
      ),
      choice(
        'wrong',
        both(
          "J'envoie les assiettes une par une, dès qu'elles sortent.",
          'I send the plates one by one, as they come out.',
        ),
        both('Toute la table est servie en même temps.', 'The whole table is served at the same time.'),
      ),
      choice(
        'wrong',
        both(
          'Je sers par la gauche, en passant le bras devant les clients.',
          'I serve from the left, reaching across the guests.',
        ),
        both('Les plats se servent par la droite.', 'Plates are served from the right.'),
      ),
    ],
  });

  // 🎂 10. the occasion (birthday, anniversary, business meal)
  const blunder = choice(
    'wrong',
    both('Je vous offre une bouteille de champagne !', "I'll give you a bottle of champagne on the house!"),
    both(
      "Pas de geste commercial sans l'accord du responsable.",
      'No freebies without the manager’s approval.',
    ),
  );
  if (booking.occasion === 'birthday')
    addStep({
      key: 'birthday',
      status: 'mains',
      note: both(
        'Pendant le plat, on vous glisse un mot.',
        'During the main course, someone has a quiet word.',
      ),
      guest:
        covers > 1
          ? both(
              `C'est l'anniversaire de ${booking.first} ce soir, chut !`,
              `It's ${booking.first}'s birthday tonight, shh!`,
            )
          : both("C'est mon anniversaire aujourd'hui.", "It's my birthday today."),
      choices: [
        choice(
          'best',
          both(
            'Je préviens la cuisine : une bougie sur le dessert, servi au bon moment.',
            "I'll tell the kitchen: a candle on the dessert, served at the right moment.",
          ),
          both(
            'Discret et organisé : la cuisine prépare la bougie.',
            'Discreet and organised: the kitchen prepares the candle.',
          ),
        ),
        choice(
          'ok',
          both(
            'Joyeux anniversaire ! Je vais voir ce que je peux faire.',
            "Happy birthday! I'll see what I can do.",
          ),
          both(
            'Gentil, mais dites le plan : bougie sur le dessert, cuisine prévenue.',
            'Kind, but say the plan: candle on the dessert, kitchen told.',
          ),
        ),
        choice(
          'wrong',
          both(
            "Il fallait le dire à la réservation, ce n'est plus possible.",
            "You should have said so when booking, it's too late.",
          ),
          both(
            "C'est toujours possible : on prévient la cuisine.",
            "It's always possible: tell the kitchen.",
          ),
        ),
        blunder,
      ],
    });
  if (booking.occasion === 'anniversary')
    addStep({
      key: 'anniversary',
      status: 'mains',
      guest: both("C'est notre anniversaire de mariage ce soir.", "It's our wedding anniversary tonight."),
      choices: [
        choice(
          'best',
          both(
            'Toutes nos félicitations ! Je préviens la cuisine pour une petite attention sur le dessert.',
            "Congratulations! I'll ask the kitchen for a little touch on the dessert.",
          ),
          both('On félicite, et on prévient la cuisine.', 'Congratulate them, and tell the kitchen.'),
        ),
        choice(
          'ok',
          both('Félicitations !', 'Congratulations!'),
          both(
            'Bien, mais pensez à prévenir la cuisine pour le dessert.',
            'Good, but remember to tell the kitchen for the dessert.',
          ),
        ),
        choice(
          'wrong',
          both("D'accord.", 'Okay.'),
          both(
            'Une occasion se fête : réagissez et prévenez la cuisine.',
            'An occasion deserves a reaction: tell the kitchen.',
          ),
        ),
        blunder,
      ],
    });
  if (booking.occasion === 'business')
    addStep({
      key: 'business',
      status: 'mains',
      guest: both(
        'Nous avons une discussion importante, on aimerait ne pas être trop dérangés.',
        "We're having an important discussion, we'd rather not be disturbed too much.",
      ),
      choices: [
        choice(
          'best',
          both(
            `Bien sûr. Je passerai discrètement, et l'addition vous sera remise directement, ${title.fr}.`,
            `Of course. I'll keep it discreet, and the bill will come straight to you, ${title.en}.`,
          ),
          both(
            "Service discret, et l'addition va à l'hôte.",
            'Discreet service, and the bill goes to the host.',
          ),
        ),
        choice(
          'ok',
          both('Pas de souci.', 'No problem.'),
          both(
            "Dites comment : service discret, addition à l'hôte.",
            'Say how: discreet service, bill to the host.',
          ),
        ),
        choice(
          'wrong',
          both(
            'Je reviens toutes les cinq minutes voir si tout va bien.',
            "I'll check on you every five minutes.",
          ),
          both("Trop intrusif pour un repas d'affaires.", 'Too intrusive for a business meal.'),
        ),
        choice(
          'wrong',
          both('Vous fêtez quelque chose ?', 'Are you celebrating something?'),
          both(
            'Écoutez la demande : ils veulent être tranquilles.',
            'Listen to the request: they want some peace.',
          ),
        ),
      ],
    });

  // 🍰 11. dessert or cheese (no dessert with the guest's allergen)
  const desserts = dessertDishes();
  const safeDesserts = desserts.filter((dish) => !clashes(dish).length);
  const candleFr = booking.occasion === 'birthday' ? ' La bougie arrive avec.' : '';
  const candleEn = booking.occasion === 'birthday' ? ' The candle comes with it.' : '';
  const milkRisk = coded.includes('milk');
  const dessertChoices = [];
  if (safeDesserts.length) {
    const dessert = randomItem(safeDesserts, random);
    const dessertSay = sayLine('dish', dessert.n);
    dessertChoices.push(
      choice(
        'best',
        milkRisk
          ? both(
              `En dessert, je vous conseille « ${dishName(dessert).fr} ».${candleFr}`,
              `For dessert, I'd suggest the « ${dishName(dessert).en} ».${candleEn}`,
            )
          : both(
              `Vous laisserez-vous tenter par nos fromages, ou un dessert ? Je vous conseille « ${dishName(dessert).fr} ».${candleFr}`,
              `Can I tempt you with our cheeses, or a dessert? I'd suggest the « ${dishName(dessert).en} ».${candleEn}`,
            ),
        dessertSay.fr
          ? dessertSay
          : both(
              'Fromages ou dessert précis : on donne envie.',
              'Cheese or a precise dessert: make it tempting.',
            ),
      ),
    );
  } else {
    dessertChoices.push(
      choice(
        'best',
        both(
          `Nos desserts contiennent ${labelsOf(coded).fr} : je demande au chef ce qu'il peut vous proposer.${candleFr}`,
          `Our desserts contain ${labelsOf(coded).en}: I'll ask the chef what he can offer you.${candleEn}`,
        ),
        both(
          "D'après la fiche, aucun dessert n'en est exempt : la cuisine décide.",
          'According to the chart, every dessert has it: the kitchen decides.',
        ),
      ),
    );
  }
  const riskyDessert = randomItem(
    desserts.filter((dish) => clashes(dish).length),
    random,
  );
  if (milkRisk)
    dessertChoices.push(
      choice(
        'danger',
        both(
          'Je vous propose le plateau de fromages de Provence ?',
          'May I offer you the Provence cheese board?',
        ),
        both('Les fromages sont au lait !', 'Cheese is made from milk!'),
      ),
    );
  else if (riskyDessert)
    dessertChoices.push(
      choice(
        'danger',
        both(
          `Je vous conseille « ${dishName(riskyDessert).fr} ».`,
          `I'd suggest the « ${dishName(riskyDessert).en} ».`,
        ),
        both(
          `Danger : il contient ${labelsOf(clashes(riskyDessert)).fr}.`,
          `Danger: it contains ${labelsOf(clashes(riskyDessert)).en}.`,
        ),
      ),
    );
  dessertChoices.push(
    choice(
      'ok',
      both('Je vous apporte la carte des desserts.', "I'll bring you the dessert menu."),
      both(
        'Correct, mais proposez les fromages ou un dessert précis.',
        'Fine, but suggest the cheeses or a precise dessert.',
      ),
    ),
    choice(
      'wrong',
      both("Je vous apporte l'addition ?", 'Shall I bring the bill?'),
      both(
        "On n'apporte jamais l'addition avant qu'on la demande.",
        'Never bring the bill before it is asked for.',
      ),
    ),
  );
  addStep({
    key: 'dessert',
    status: 'dessert',
    wait: 12,
    note: both(
      'Les assiettes sont débarrassées, la table est prête pour la suite.',
      'The plates are cleared, the table is ready for what comes next.',
    ),
    guest: both("C'était délicieux, merci !", 'That was delicious, thank you!'),
    choices: dessertChoices.slice(0, 4),
  });

  // ☕ 12. coffee, tea or a digestif
  const digestif = randomItem(menuData().digestifs || [], random) || { n: 'Limoncello' };
  addStep({
    key: 'coffee',
    status: 'dessert',
    wait: 6,
    guest: both('Parfait, merci.', 'Perfect, thanks.'),
    choices: [
      choice(
        'best',
        both(
          `Un café, un thé ou un digestif pour terminer ? Nous avons par exemple un ${digestif.n}.`,
          `A coffee, a tea or a digestif to finish? We have, for example, a ${digestif.n}.`,
        ),
        both(
          'Café, thé, infusion ou digestif, servis avec les mignardises.',
          'Coffee, tea, herbal tea or a digestif, served with petits fours.',
        ),
      ),
      choice(
        'ok',
        both('Un café ?', 'A coffee?'),
        both(
          'Pensez aux thés, aux infusions et aux digestifs.',
          'Remember the teas, herbal teas and digestifs.',
        ),
      ),
      choice(
        'wrong',
        both("On ferme bientôt, vous voulez l'addition ?", "We're closing soon, would you like the bill?"),
        both('On ne presse jamais les clients.', 'Never rush the guests.'),
      ),
      choice(
        'wrong',
        both('Je vous apporte des cafés pour tout le monde.', "I'll bring coffees for everyone."),
        both("On propose, on n'impose pas.", "Offer, don't impose."),
      ),
    ],
  });

  // 🧾 13. the bill
  addStep({
    key: 'bill',
    status: 'bill',
    wait: 3,
    guest: both("L'addition, s'il vous plaît.", 'The bill, please.'),
    choices: [
      booking.hotel
        ? choice(
            'best',
            both(
              'Bien sûr. Souhaitez-vous la mettre sur votre chambre ?',
              'Of course. Would you like to charge it to your room?',
            ),
            both(
              "Client de l'hôtel : numéro de chambre, nom, signature.",
              'Hotel guest: room number, name, signature.',
            ),
          )
        : choice(
            'best',
            booking.occasion === 'business'
              ? both(
                  `Je vous l'apporte tout de suite, ${title.fr}.`,
                  `I'll bring it right away, ${title.en}.`,
                )
              : both("Je vous l'apporte tout de suite.", "I'll bring it right away."),
            both(
              "Vite, dans le porte-addition fermé, à la personne qui l'a demandée.",
              'Quickly, in the closed bill folder, to the guest who asked.',
            ),
          ),
      choice(
        'ok',
        both("J'arrive dès que possible.", "I'll be with you as soon as I can."),
        both("Quand on la demande, on l'apporte vite.", "When it's asked for, bring it quickly."),
      ),
      choice(
        'wrong',
        both('Vous pouvez aller payer au bar.', 'You can go and pay at the bar.'),
        both('Le terminal vient à la table.', 'The card machine comes to the table.'),
      ),
      choice(
        'wrong',
        both('Donnez-moi votre carte, je reviens.', "Give me your card, I'll be right back."),
        both('La carte ne quitte jamais les yeux du client.', "The card never leaves the guest's sight."),
      ),
    ],
  });

  // 👋 14. the goodbye
  const extraFr =
    (booking.firstVisit ? ' J’espère que cette première visite vous a plu.' : '') +
    (booking.occasion === 'birthday' ? ' Et encore joyeux anniversaire !' : '') +
    (booking.occasion === 'anniversary' ? ' Et encore félicitations !' : '');
  const extraEn =
    (booking.firstVisit ? ' I hope you enjoyed your first visit.' : '') +
    (booking.occasion === 'birthday' ? ' And happy birthday again!' : '') +
    (booking.occasion === 'anniversary' ? ' And congratulations again!' : '');
  addStep({
    key: 'goodbye',
    status: 'gone',
    guest: both('Merci pour cette belle soirée !', 'Thank you for a lovely evening!'),
    choices: [
      choice(
        'best',
        both(
          `Merci pour votre visite, au plaisir de vous revoir très vite. Bonne soirée !${extraFr}`,
          `Thank you for coming, we hope to see you again soon. Have a lovely evening!${extraEn}`,
        ),
        both(
          'Manteaux (cintre au numéro de la table), on raccompagne et on invite à revenir.',
          'Coats (hanger with the table number), walk them out and invite them back.',
        ),
      ),
      choice(
        'ok',
        both('Au revoir, bonne soirée.', 'Goodbye, have a good evening.'),
        both(
          'Poli, mais remerciez et invitez-les à revenir.',
          'Polite, but thank them and invite them back.',
        ),
      ),
      choice(
        'wrong',
        both("Le service n'est pas compris, hein.", "Service isn't included, you know."),
        both('Jamais de remarque sur le pourboire.', 'Never comment on the tip.'),
      ),
      choice(
        'wrong',
        both('Vous pouvez y aller, on ferme.', 'You can go now, we are closing.'),
        both('On raccompagne, on ne pousse pas dehors.', 'Walk them out, never push them out.'),
      ),
    ],
  });

  // 🍸 what the table orders to drink, and the waiter's mini-tasks (their own seeded generator, so the dialogue
  // above stays the same as before)
  const drinkRandom = makeRandom(((booking.seed * 11 + 7) % 2147483646) + 1);
  const aperitifKind = celebrate || !cocktail.recipe || drinkRandom() < 0.5 ? 'champagne' : 'cocktail';
  const coffeeKind = drinkRandom() < 0.6 ? 'coffee' : 'digestif';
  const coffees = (menuData().coffee || []).filter((entry) => entry.diner).map((entry) => entry.n);
  steps.meta = {
    waterKind,
    aperitif: aperitifKind,
    cocktail,
    champagne: celebrate ? roseCoupe : brutCoupe,
    wine: sulphites ? null : bestWine || null,
    mainDish,
    coffeeKind,
    coffee: randomItem(coffees.length ? coffees : ['Expresso'], drinkRandom),
    digestif,
  };
  /**
   * `indexOfKey` - Function 🔎
   *
   * @param { string } base - a step key (before the « | »)
   * @returns { number } - the index of that step (-1 when the table has none)
   */
  const indexOfKey = (base) => steps.findIndex((step) => step.key.split('|')[0] === base);
  const details = Object.assign({ covers, water: waterKind }, steps.meta);
  steps.drinks = [
    [indexOfKey('aperitif'), 'water'],
    [indexOfKey('aperitif'), aperitifKind],
    [indexOfKey('wine'), 'wine'],
    [indexOfKey('coffee'), coffeeKind],
  ]
    .map(([at, kind]) => ({ at, task: at >= 0 ? drinkTask(kind, details, drinkRandom) : null }))
    .filter((drink) => drink.task);
  return steps;
}

/**
 * `translateWord` - Function 🇬🇧
 *
 * @param { string } word - a French word of the data (an ingredient, a glass, a garnish)
 * @returns { string } - its English version in English mode (LTF_EN.words, loaded by ensureData), else the word
 */
function translateWord(word) {
  const words = (window.LTF_EN && window.LTF_EN.words) || {};
  return (isEnglish() && words[word]) || word;
}

/**
 * `regionFrom` - Function 🗺️
 *
 * @param { string } region - a wine region of the data (Provence, Rhône…)
 * @returns { [string, string] } - « de Provence » / « from Provence »
 */
function regionFrom(region) {
  return REGION_FROM[region] || ['de ' + region, 'from ' + region];
}

// 🧰 the helpers the drinks & the talk modules borrow (they never touch window.LTF themselves)
const MODULE_KIT = {
  both,
  pick,
  translate,
  escapeHtml,
  menuData,
  makeRandom,
  shuffle,
  randomItem,
  randomInt,
  translateWord,
  choice,
  dinnerDishes,
  mainDishes,
  dessertDishes,
  oldDishes,
  dishName,
  allergenCodes,
  labelsOf,
  allergyOf,
  allergyLine,
  guestTitle,
  regionFrom,
};
useDrinkKit(MODULE_KIT);
useTalkKit(MODULE_KIT);
useListKit({ translate, escapeHtml, icon, clockText, clamp, isSafeUid, SERVICE_START });

// ===== THE GAME 🕹️ ===== //

// the page state: open?, the view, the run (stops old timers), the setup choices & the online flag 🌱
const page = {
  isOpen: false,
  view: 'page',
  run: 0,
  timer: 0,
  toastTimer: 0,
  quitting: false,
  online: false,
  waiterCount: 1,
  speed: 1,
  names: ['Serveur 1', 'Serveur 2', 'Serveur 3', 'Serveur 4'],
  rangs: {},
  brush: 0,
  bookings: [],
  tableId: '',
  joinedAsGuest: false,
  dataReady: false,
  openGame: true,
  spokenKey: '',
  questionGuest: 0,
  notifyAsked: false,
  games: null,
  gamesError: '',
  drawerGame: '',
  openOnBoot: false,
  hostNote: false,
  soloDirty: false,
  soloSavedAt: 0,
};

// the game being played (null when none): see `startGame` 🎮
let game = null;

// the Firebase handles, filled the first time an online game is used 🔥
const cloud = { ready: false, auth: null, db: null, store: null, unsubscribe: null, listUnsubscribe: null };

/**
 * `newEntry` - Function 🆕
 *
 * @param { object } booking - a booking
 * @param { string } owner - the id of the waiter who owns the table (uid online, 'w0'… solo)
 * @returns { object } - the table's state { o: owner, c: chosen answers, p: points, pa: patience, w: ready at, x: left,
 *   by: points per waiter, i: interruption answers, d: drink scores (0-3 each), q: questions asked (4 letters each) }
 */
function newEntry(booking, owner) {
  return { o: owner, c: '', p: 0, pa: 100, w: booking.time, x: 0, by: {}, i: '', d: '', q: '' };
}

/**
 * `startGame` - Function 🎮
 *
 * @param { object } options - { mode: 'solo' | 'online', code, host, me, waiters, rangs, bookings, tables, startMs }
 * @returns { void } - sets `game` (the steps of every table are built once here)
 */
function startGame(options) {
  const steps = {};
  const guests = {};
  options.bookings.forEach((booking) => {
    guests[booking.table] = partyGuests(booking);
    steps[booking.table] = buildSteps(booking);
    // 🙋 the other guests' interruptions, seeded like the steps
    steps[booking.table].interrupts = buildInterruptions(
      booking,
      steps[booking.table],
      guests[booking.table],
    );
  });
  game = Object.assign(
    {
      mode: 'solo',
      code: '',
      host: '',
      me: 'w0',
      requests: {},
      startMs: 0,
      speed: 1,
      anchorMs: 0,
      anchorClock: 0,
      seen: {},
      ended: false,
      earned: 0,
      endAwarded: false,
    },
    options,
    { steps, guests, results: {}, picks: {}, notified: '', listMinute: -1 },
  );
}

/**
 * `serviceNow` - Function 🕰️
 *
 * @returns { number } - the service clock in minutes after midnight (19:00 before the start, never past 23:30)
 */
function serviceNow() {
  if (!game || !game.startMs) return SERVICE_START;
  // ⚓ the last speed change (or the start): the clock runs from there at the game's speed
  const anchorMs = game.anchorMs || game.startMs;
  const anchorClock = game.anchorClock || SERVICE_START;
  return Math.min(HARD_END, anchorClock + ((Date.now() - anchorMs) / REAL_MS_PER_MINUTE) * (game.speed || 1));
}

/**
 * `cleanSpeed` - Function ⏩
 *
 * @param { any } value - a speed (from the setup or a remote game)
 * @returns { number } - one of SPEEDS (×1, real time, when it isn't one)
 */
function cleanSpeed(value) {
  const speed = Number(value);
  return SPEEDS.includes(speed) ? speed : 1;
}

/**
 * `setSpeed` - Function ⏩
 *
 * Solo only: changes the speed of the clock from now on (the time already played stays as it is).
 *
 * @param { number } speed - the new speed
 * @returns { void }
 */
function setSpeed(speed) {
  if (!game || game.mode !== 'solo' || !game.startMs) return;
  game.anchorClock = serviceNow();
  game.anchorMs = Date.now();
  game.speed = cleanSpeed(speed);
  page.soloDirty = true;
}

/**
 * `skipToNextArrival` - Function ⏭️
 *
 * Solo only: moves the clock straight to the next guests' arrival (nothing to do until then).
 *
 * @returns { boolean } - true when the clock moved
 */
function skipToNextArrival() {
  if (!game || game.mode !== 'solo' || !game.startMs) return false;
  const now = serviceNow();
  const upcoming = game.bookings.map((booking) => booking.time).filter((time) => time > now);
  if (!upcoming.length) return false;
  game.anchorClock = Math.min(...upcoming);
  game.anchorMs = Date.now();
  page.soloDirty = true;
  return true;
}

/**
 * `bookingOf` - Function 📝
 *
 * @param { string } tableId - a table id
 * @returns { object | undefined } - tonight's booking at that table
 */
function bookingOf(tableId) {
  return game && game.bookings.find((booking) => booking.table === tableId);
}

/**
 * `entryOf` - Function 📋
 *
 * @param { string } tableId - a table id
 * @returns { object } - the table's state (a fresh one when none was saved yet)
 */
function entryOf(tableId) {
  const saved = game.tables[tableId];
  return saved || newEntry(bookingOf(tableId), '');
}

/**
 * `isDone` - Function ✅
 *
 * @param { string } tableId - a table id
 * @returns { boolean } - true when the guests have left (served to the end, or gone without being welcomed)
 */
function isDone(tableId) {
  const entry = entryOf(tableId);
  return !!entry.x || entry.c.length >= game.steps[tableId].length;
}

/**
 * `patienceOf` - Function 😤
 *
 * @param { string } tableId - a table id
 * @param { number } now - the service clock
 * @returns { number } - the guests' patience (0 → 100): it drops when a step waits too long for its waiter
 */
function patienceOf(tableId, now) {
  const entry = entryOf(tableId);
  if (isDone(tableId) || now < entry.w) return entry.pa;
  return clamp(entry.pa - Math.max(0, now - entry.w - PATIENCE_GRACE) * PATIENCE_DECAY, 0, 100);
}

/**
 * `statusOf` - Function 🚦
 *
 * @param { string } tableId - a table id
 * @param { number } now - the service clock
 * @returns { string } - waiting, arrived, seated, ordered, mains, dessert, bill or gone
 */
function statusOf(tableId, now) {
  const booking = bookingOf(tableId);
  const entry = entryOf(tableId);
  if (now < booking.time) return 'waiting';
  if (isDone(tableId)) return 'gone';
  if (!entry.c.length) return 'arrived';
  return game.steps[tableId][entry.c.length - 1].status;
}

/**
 * `statusLabel` - Function 🚦
 *
 * @param { string } status - a status id
 * @returns { string } - its label in the app's language
 */
function statusLabel(status) {
  const entry = STATUSES.find((item) => item[0] === status) || STATUSES[0];
  return translate(entry[1], entry[2]);
}

/**
 * `needsWaiter` - Function 🙋
 *
 * @param { string } tableId - a table id
 * @param { number } now - the service clock
 * @returns { boolean } - true when the guests are here and the next step is ready (someone should go)
 */
function needsWaiter(tableId, now) {
  return now >= bookingOf(tableId).time && !isDone(tableId) && now >= entryOf(tableId).w;
}

/**
 * `waiterById` - Function 🤵
 *
 * @param { string } id - a waiter id
 * @returns { object | undefined } - the waiter { id, name, rang }
 */
function waiterById(id) {
  return game && game.waiters.find((waiter) => waiter.id === id);
}

/**
 * `waiterColour` - Function 🎨
 *
 * @param { string } id - a waiter id
 * @returns { string } - the colour of their rang (a muted one when nobody)
 */
function waiterColour(id) {
  const waiter = waiterById(id);
  return waiter ? WAITER_COLOURS[waiter.rang % WAITER_COLOURS.length] : 'var(--mu)';
}

/**
 * `waiterName` - Function 🤵
 *
 * @param { string } id - a waiter id
 * @returns { string } - their name (« Serveur ? » when unknown)
 */
function waiterName(id) {
  const waiter = waiterById(id);
  return waiter ? waiter.name : translate('Serveur ?', 'Waiter ?');
}

/**
 * `ownerForRang` - Function 🗺️
 *
 * @param { number } rang - a rang index
 * @returns { string } - the waiter playing it (the host, or the first waiter, when nobody took it)
 */
function ownerForRang(rang) {
  const waiter = game.waiters.find((entry) => entry.rang === rang);
  return waiter ? waiter.id : game.host || game.waiters[0].id;
}

/**
 * `award` - Function 🎓
 *
 * Gives XP through the app (`window.LTFrecord`, Rust or JS), with the same anti-farm rule as the other chapters:
 * the same id pays 100 % → 50 % → 25 % → 0 on the same day.
 *
 * @param { string } key - what was earned (turned into a stable id `sim_…`)
 * @param { number } xp - the full XP
 * @returns { number } - the XP really earned
 */
function award(key, xp) {
  if (typeof window.LTFrecord !== 'function' || xp <= 0) return 0;
  let earned = 0;
  try {
    earned = Number(window.LTFrecord('sim_' + stableKey(key), xp)) || 0;
  } catch (error) {
    earned = 0;
  }
  if (game) game.earned += earned;
  return earned;
}

/**
 * `commitTable` - Function 💾
 *
 * Saves a table's new state here, and (online) as one small field update of `sim/{code}`.
 *
 * @param { string } tableId - a table id
 * @param { object } entry - its new state
 * @returns { void }
 */
function commitTable(tableId, entry) {
  game.tables[tableId] = entry;
  page.soloDirty = true;
  if (game.mode === 'online') writeRemote({ ['tb.' + tableId]: entry });
}

/**
 * `answerStep` - Function 🎯
 *
 * Plays one answer of a table's dialogue: points (+ a time bonus when quick), patience, XP, then the next step
 * unlocks after the step's wait (the kitchen, the guests eating…).
 *
 * @param { string } tableId - a table id
 * @param { number } index - the chosen answer (0 → 3)
 * @returns { object | null } - the choice played, or null when it can't be played now
 */
function answerStep(tableId, index) {
  const now = serviceNow();
  const entry = entryOf(tableId);
  const steps = game.steps[tableId];
  const step = steps[entry.c.length];
  if (!step || !step.choices[index] || entry.o !== game.me || !needsWaiter(tableId, now)) return null;
  // 🙋 🍸 an interruption or a drink comes first
  if (pendingInterrupt(tableId) || pendingDrink(tableId)) return null;
  const picked = step.choices[index];
  // 🍸 a step with drinks to make: the wait starts once the last drink is served (see serveDrink)
  const hasDrinks = (steps.drinks || []).some((drink) => drink.at === entry.c.length);
  const waited = now - entry.w;
  const quick =
    picked.grade === 'best' || picked.grade === 'ok' ? (waited <= 3 ? 3 : waited <= 6 ? 1 : 0) : 0;
  const patience = clamp(patienceOf(tableId, now) + GRADE_PATIENCE[picked.grade], 0, 100);
  const isLast = entry.c.length + 1 >= steps.length;
  // 🌟 the last answer adds the patience bonus (up to 20 points)
  const points = GRADE_POINTS[picked.grade] + quick + (isLast ? Math.round(patience / 5) : 0);
  const byWaiter = Object.assign({}, entry.by);
  byWaiter[game.me] = (byWaiter[game.me] || 0) + points;
  commitTable(
    tableId,
    Object.assign({}, entry, {
      c: entry.c + index,
      p: entry.p + points,
      pa: Math.round(patience),
      w: roundTenth(hasDrinks ? now : now + step.wait),
      x: 0,
      by: byWaiter,
    }),
  );
  game.results[tableId] = { grade: picked.grade, points };
  if (navigator.vibrate)
    navigator.vibrate(picked.grade === 'best' ? 8 : picked.grade === 'ok' ? 12 : [20, 40, 20]);
  // 🎓 a best answer pays XP (never a wrong one)
  if (picked.grade === 'best') award(step.key + '|' + picked.text.fr, BEST_ANSWER_XP);
  return picked;
}

/**
 * `pendingInterrupt` - Function 🙋
 *
 * @param { string } tableId - a table id
 * @returns { object | null } - the interruption waiting for an answer now (its step is the next one), or null
 */
function pendingInterrupt(tableId) {
  const entry = entryOf(tableId);
  const list = game.steps[tableId].interrupts || [];
  const next = list[(entry.i || '').length];
  if (!next || entry.x || next.at > entry.c.length || entry.c.length >= game.steps[tableId].length)
    return null;
  return next;
}

/**
 * `pendingDrink` - Function 🍸
 *
 * @param { string } tableId - a table id
 * @returns { object | null } - the drink to make now (its step was answered, the drink not served yet), or null
 */
function pendingDrink(tableId) {
  const entry = entryOf(tableId);
  const list = game.steps[tableId].drinks || [];
  const next = list[(entry.d || '').length];
  if (!next || entry.x || next.at >= entry.c.length) return null;
  return next;
}

/**
 * `answerInterrupt` - Function 🙋
 *
 * Answers the guest who interrupted: points (half a step), a little patience, XP for a best answer.
 *
 * @param { string } tableId - a table id
 * @param { number } index - the chosen answer
 * @returns { object | null } - the choice played, or null when it can't be played now
 */
function answerInterrupt(tableId, index) {
  const now = serviceNow();
  const entry = entryOf(tableId);
  const interrupt = pendingInterrupt(tableId);
  if (!interrupt || !interrupt.choices[index] || entry.o !== game.me || !needsWaiter(tableId, now))
    return null;
  const picked = interrupt.choices[index];
  const points = INTERRUPT_POINTS[picked.grade];
  const byWaiter = Object.assign({}, entry.by);
  byWaiter[game.me] = (byWaiter[game.me] || 0) + points;
  commitTable(
    tableId,
    Object.assign({}, entry, {
      i: (entry.i || '') + index,
      p: entry.p + points,
      pa: Math.round(clamp(patienceOf(tableId, now) + GRADE_PATIENCE[picked.grade] / 2, 0, 100)),
      by: byWaiter,
    }),
  );
  if (picked.grade === 'best') award('interrupt|' + interrupt.id + '|' + picked.text.fr, BEST_ANSWER_XP);
  return picked;
}

/**
 * `serveDrink` - Function 🍸
 *
 * Serves the drink being made: scored 0 → 3 from the chips picked, then (after the step's last drink) the
 * table's wait starts.
 *
 * @param { string } tableId - a table id
 * @returns { object | null } - the score { digit, grade, right, total }, or null when nothing can be served
 */
function serveDrink(tableId) {
  const now = serviceNow();
  const entry = entryOf(tableId);
  const drink = pendingDrink(tableId);
  if (!drink || entry.o !== game.me || !needsWaiter(tableId, now)) return null;
  const count = (entry.d || '').length;
  const score = scoreDrink(drink.task, game.picks[tableId + '|' + count] || {});
  const steps = game.steps[tableId];
  const nextDrink = (steps.drinks || [])[count + 1];
  const lastOfStep = !nextDrink || nextDrink.at !== drink.at;
  const points = DRINK_POINTS[score.grade];
  const byWaiter = Object.assign({}, entry.by);
  byWaiter[game.me] = (byWaiter[game.me] || 0) + points;
  commitTable(
    tableId,
    Object.assign({}, entry, {
      d: (entry.d || '') + score.digit,
      p: entry.p + points,
      pa: Math.round(clamp(patienceOf(tableId, now) + (score.grade === 'best' ? 2 : 0), 0, 100)),
      w: lastOfStep ? roundTenth(now + steps[drink.at].wait) : entry.w,
      by: byWaiter,
    }),
  );
  delete game.picks[tableId + '|' + count];
  if (score.grade === 'best') award('drink|' + drink.task.name, BEST_ANSWER_XP);
  return score;
}

/**
 * `questionContext` - Function 🧭
 *
 * @param { string } tableId - a table id
 * @returns { {nextKey: string, nextIndex: number, orderIndex: number, asked: Array<object>} } - where the table is
 */
function questionContext(tableId) {
  const entry = entryOf(tableId);
  const steps = game.steps[tableId];
  const next = steps[entry.c.length];
  return {
    nextKey: next ? next.key : '',
    nextIndex: entry.c.length,
    orderIndex: steps.findIndex((step) => step.key.split('|')[0] === 'order'),
    asked: questionsAsked(entry),
  };
}

/**
 * `questionsAsked` - Function 📜
 *
 * @param { object } entry - a table's state
 * @returns { Array<{guest: number, id: string, at: number}> } - the questions in `q` (4 letters each: guest digit,
 *   question id, step letter a → p)
 */
function questionsAsked(entry) {
  const list = [];
  const text = entry.q || '';
  for (let index = 0; index + 4 <= text.length; index += 4)
    list.push({
      guest: Number(text[index]),
      id: text.slice(index + 1, index + 3),
      at: text.charCodeAt(index + 3) - 97,
    });
  return list;
}

/**
 * `askGuest` - Function ❓
 *
 * The waiter asks one guest a question (any time the table is mine and the guests are here).
 *
 * @param { string } tableId - a table id
 * @param { number } guestIndex - the guest asked (0 = the booker)
 * @param { string } id - the question id
 * @returns { object | null } - the reply { line, points, grade, feedback }, or null when it can't be asked now
 */
function askGuest(tableId, guestIndex, id) {
  const now = serviceNow();
  const entry = entryOf(tableId);
  const booking = bookingOf(tableId);
  const guest = game.guests[tableId][guestIndex];
  if (!guest || entry.o !== game.me || now < booking.time || isDone(tableId) || !isQuestionId(id))
    return null;
  if (questionsAsked(entry).length >= 12) return null;
  const context = questionContext(tableId);
  const reply = askQuestion(Object.assign({ booking, meta: game.steps[tableId].meta, guest, id }, context));
  const byWaiter = Object.assign({}, entry.by);
  if (reply.points) byWaiter[game.me] = (byWaiter[game.me] || 0) + reply.points;
  commitTable(
    tableId,
    Object.assign({}, entry, {
      q: (entry.q || '') + guestIndex + id + String.fromCharCode(97 + Math.min(15, entry.c.length)),
      p: entry.p + reply.points,
      by: byWaiter,
    }),
  );
  return reply;
}

/**
 * `checkLeaves` - Function 🚪
 *
 * Guests nobody welcomed lose all their patience and leave (−10 points). Online, the table's owner writes it.
 *
 * @param { number } now - the service clock
 * @returns { boolean } - true when a table changed
 */
function checkLeaves(now) {
  let changed = false;
  game.bookings.forEach((booking) => {
    const entry = entryOf(booking.table);
    if (isDone(booking.table) || entry.c.length || now < booking.time || patienceOf(booking.table, now) > 0)
      return;
    const ownerHere = waiterById(entry.o);
    if (game.mode === 'online' && entry.o !== game.me && (ownerHere || game.me !== game.host)) return;
    const byWaiter = Object.assign({}, entry.by);
    byWaiter[entry.o] = (byWaiter[entry.o] || 0) - 10;
    commitTable(booking.table, Object.assign({}, entry, { x: 1, p: entry.p - 10, pa: 0, by: byWaiter }));
    changed = true;
  });
  return changed;
}

/**
 * `gameOver` - Function 🏁
 *
 * @param { number } now - the service clock
 * @returns { boolean } - true when every table has left, or the restaurant closes (23:30)
 */
function gameOver(now) {
  if (!game || !game.startMs) return false;
  return now >= HARD_END || game.bookings.every((booking) => isDone(booking.table));
}

/**
 * `waiterTotals` - Function 🧮
 *
 * @returns { Array<{id: string, name: string, points: number}> } - the points of every waiter, best first
 */
function waiterTotals() {
  const totals = {};
  game.waiters.forEach((waiter) => (totals[waiter.id] = 0));
  Object.keys(game.tables).forEach((tableId) => {
    const byWaiter = game.tables[tableId].by || {};
    Object.keys(byWaiter).forEach((id) => (totals[id] = (totals[id] || 0) + byWaiter[id]));
  });
  return Object.keys(totals)
    .map((id) => ({ id, name: waiterName(id), points: totals[id] }))
    .sort((left, right) => right.points - left.points);
}

/**
 * `readBest` - Function 🏆
 *
 * @returns { number } - the best solo score on this phone
 */
function readBest() {
  try {
    return Number(JSON.parse(localStorage.getItem(BEST_KEY) || '{}').solo) || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * `saveBest` - Function 🏆
 *
 * @param { number } score - a solo score (kept when it beats the old one)
 * @returns { boolean } - true when it's a new record
 */
function saveBest(score) {
  if (score <= readBest()) return false;
  localStorage.setItem(BEST_KEY, JSON.stringify({ solo: score }));
  return true;
}

// ===== ONLINE GAME 🌐 ===== //

/**
 * `loadFirebase` - Async Function 🔥
 *
 * Loads the Firebase modules (only now, so solo never needs the network) and reuses the app `cloud.js` created.
 *
 * @returns { Promise<boolean> } - true when Firebase is ready
 */
async function loadFirebase() {
  if (cloud.ready) return true;
  try {
    const [appModule, authModule, storeModule] = await Promise.all([
      import(FIREBASE_APP_URL),
      import(FIREBASE_AUTH_URL),
      import(FIREBASE_STORE_URL),
    ]);
    const app = appModule.getApps()[0];
    if (!app) return false;
    cloud.auth = authModule.getAuth(app);
    cloud.onAuth = authModule.onAuthStateChanged;
    cloud.db = storeModule.getFirestore(app);
    cloud.store = storeModule;
    cloud.ready = true;
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * `signedInUser` - Async Function 🔐
 *
 * @returns { Promise<object | null> } - the signed-in Google user (waits up to 4 s for the session to come back)
 */
async function signedInUser() {
  if (!(await loadFirebase())) return null;
  if (cloud.auth.currentUser) return cloud.auth.currentUser;
  return new Promise((resolve) => {
    let stop = () => {};
    const timeout = setTimeout(() => {
      stop();
      resolve(null);
    }, 4000);
    stop = cloud.onAuth(cloud.auth, (user) => {
      if (!user) return;
      clearTimeout(timeout);
      setTimeout(() => stop(), 0);
      resolve(user);
    });
  });
}

/**
 * `playerName` - Function 🤵
 *
 * @param { object } user - a Firebase user
 * @returns { string } - their first name (Google name), short and plain
 */
function playerName(user) {
  const name = String((user && user.displayName) || '').trim() || translate('Serveur', 'Waiter');
  return name.split(/\s+/)[0].slice(0, 30);
}

/**
 * `isSafeUid` - Function 🛡️
 *
 * @param { any } value - a value from the network
 * @returns { boolean } - true when it looks like a Firebase uid
 */
function isSafeUid(value) {
  return typeof value === 'string' && /^[A-Za-z0-9]{1,128}$/.test(value);
}

/**
 * `cleanRemote` - Function 🧼
 *
 * Checks every value of a `sim/{code}` document before it's used or shown (types, sizes, known ids).
 *
 * @param { any } data - the document's data
 * @returns { object | null } - a safe game { host, count, bookings, rangs, waiters, tables, requests, startMs, createdMs }, or null
 */
function cleanRemote(data) {
  if (!data || typeof data !== 'object' || !isSafeUid(data.host)) return null;
  let bookings = [];
  let rangs = {};
  try {
    bookings = JSON.parse(typeof data.bk === 'string' && data.bk.length < 30000 ? data.bk : '[]');
    rangs = JSON.parse(typeof data.rg === 'string' && data.rg.length < 2000 ? data.rg : '{}');
    // ⏩ the host's speed rides in `rg` (key `sp`, ignored by the rang check below)
  } catch (error) {
    return null;
  }
  const seen = new Set();
  bookings = (Array.isArray(bookings) ? bookings : [])
    .slice(0, 10)
    .map(cleanBooking)
    .filter((booking) => booking && !seen.has(booking.table) && seen.add(booking.table));
  if (!bookings.length) return null;
  const count = clamp(Math.round(Number(data.n) || 1), 1, 4);
  const safeRangs = {};
  floorTables().forEach((table) => {
    const rang = Number(rangs && rangs[table.id]);
    safeRangs[table.id] = Number.isInteger(rang) && rang >= 0 && rang < count ? rang : 0;
  });
  const waiters = [];
  Object.keys(data.wt && typeof data.wt === 'object' ? data.wt : {})
    .slice(0, 4)
    .forEach((uid) => {
      const value = data.wt[uid];
      const rang = Number(value && value.i);
      if (!isSafeUid(uid) || !Number.isInteger(rang) || rang < 0 || rang > 3) return;
      waiters.push({ id: uid, name: String((value && value.n) || '?').slice(0, 30), rang });
    });
  const tables = {};
  bookings.forEach((booking) => {
    const value = data.tb && data.tb[booking.table];
    if (!value || typeof value !== 'object') return;
    const byWaiter = {};
    Object.keys(value.by && typeof value.by === 'object' ? value.by : {})
      .slice(0, 4)
      .forEach((uid) => {
        if (isSafeUid(uid)) byWaiter[uid] = clamp(Math.round(Number(value.by[uid]) || 0), -999, 999);
      });
    tables[booking.table] = {
      o: isSafeUid(value.o) ? value.o : '',
      c: /^[0-3]{0,16}$/.test(value.c || '') ? value.c || '' : '',
      p: clamp(Math.round(Number(value.p) || 0), -999, 999),
      pa: clamp(Number(value.pa) || 0, 0, 100),
      w: clamp(Number(value.w) || booking.time, SERVICE_START, HARD_END + 60),
      x: value.x ? 1 : 0,
      by: byWaiter,
      // 🙋 interruption answers, 🍸 drink scores, ❓ questions (guest digit + id + step letter): short checked text
      i: /^[0-3]{0,3}$/.test(value.i || '') ? value.i || '' : '',
      d: /^[0-3]{0,6}$/.test(value.d || '') ? value.d || '' : '',
      q: /^([0-9][a-z]{2}[a-p]){0,12}$/.test(value.q || '') ? value.q || '' : '',
    };
  });
  const requests = {};
  Object.keys(data.rq && typeof data.rq === 'object' ? data.rq : {}).forEach((tableId) => {
    const value = data.rq[tableId];
    if (!seen.has(tableId) || !value || !isSafeUid(value.f) || !isSafeUid(value.t)) return;
    requests[tableId] = {
      f: value.f,
      t: value.t,
      n: String(value.n || '?').slice(0, 30),
      r: value.r ? 1 : 0,
    };
  });
  /**
   * `millis` - Function ⏱️
   *
   * @param { any } value - a Firestore timestamp (or anything)
   * @returns { number } - its milliseconds (0 when it isn't one)
   */
  const millis = (value) => (value && typeof value.toMillis === 'function' ? value.toMillis() : 0);
  return {
    host: data.host,
    count,
    bookings,
    rangs: safeRangs,
    waiters,
    tables,
    requests,
    startMs: millis(data.st),
    createdMs: millis(data.at),
    speed: cleanSpeed(rangs && rangs.sp),
    // 📡 open or « sur code », ended by the host, the id of its « Parties en cours » entry
    open: data.pub !== false,
    ended: data.en === true,
    listId: typeof data.li === 'string' && /^[A-Za-z0-9]{16,32}$/.test(data.li) ? data.li : '',
  };
}

/**
 * `gameRef` - Function 🗃️
 *
 * @param { string } code - a 4-digit game code
 * @returns { object } - the Firestore reference of `sim/{code}`
 */
function gameRef(code) {
  return cloud.store.doc(cloud.db, 'sim', code);
}

/**
 * `listRef` - Function 🗃️
 *
 * @param { string } listId - the random id of a « Parties en cours » entry
 * @returns { object } - the Firestore reference of `simlist/{listId}`
 */
function listRef(listId) {
  return cloud.store.doc(cloud.db, 'simlist', listId);
}

/**
 * `randomListId` - Function 🎲
 *
 * @returns { string } - 20 random letters & digits (crypto when there is one): the entry's id, unrelated to the code
 */
function randomListId() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(20);
  if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
  else bytes.forEach((unused, index) => (bytes[index] = randomInt(0, 255)));
  return Array.from(bytes, (byte) => letters[byte % letters.length]).join('');
}

/**
 * `updateListEntry` - Function 📡
 *
 * The host's small writes to the public entry (waiters joined, started, clock & tables done, ended).
 *
 * @param { object } fields - the fields to change (w, s, k, d, en)
 * @returns { void }
 */
function updateListEntry(fields) {
  if (!game || game.mode !== 'online' || game.me !== game.host || !game.listId || !cloud.ready) return;
  cloud.store.updateDoc(listRef(game.listId), fields).catch(() => {});
}

/**
 * `doneCount` - Function 🧮
 *
 * @returns { number } - the tables whose guests have left (served or not)
 */
function doneCount() {
  return game ? game.bookings.filter((booking) => isDone(booking.table)).length : 0;
}

/**
 * `publishSummary` - Function 📡
 *
 * The host's public summary (clock & tables done), at most once per service minute.
 *
 * @param { number } now - the service clock
 * @returns { void }
 */
function publishSummary(now) {
  if (!game || game.mode !== 'online' || game.me !== game.host || game.ended) return;
  const minute = Math.floor(now);
  if (minute === game.listMinute) return;
  game.listMinute = minute;
  updateListEntry({ k: minute, d: doneCount() });
}

/**
 * `writeRemote` - Function ✍️
 *
 * @param { object } fields - the field paths to update (small writes only)
 * @returns { void } - the update is sent in the background (a failure shows a toast)
 */
function writeRemote(fields) {
  if (!game || game.mode !== 'online' || !cloud.ready) return;
  cloud.store.updateDoc(gameRef(game.code), fields).catch(() => {
    showToast('alert', translate('Connexion perdue, réessayez.', 'Connection lost, try again.'));
  });
}

/**
 * `onlineError` - Function 🚫
 *
 * @param { any } error - a Firebase error
 * @returns { string } - a message for the waiter
 */
function onlineError(error) {
  const code = String((error && error.code) || error || '');
  if (/permission/.test(code))
    return translate(
      "Réservé à l'équipe approuvée. Demandez l'accès dans Profil.",
      'For the approved team only. Ask for access in Profile.',
    );
  if (/signin/.test(code))
    return translate(
      'Connectez-vous avec Google dans Profil pour jouer en ligne.',
      'Sign in with Google in Profile to play online.',
    );
  return translate(
    'Impossible de joindre la partie en ligne. Le mode solo marche hors ligne.',
    "Couldn't reach the online game. Solo mode works offline.",
  );
}

/**
 * `createOnlineGame` - Async Function 🌐
 *
 * The host's game: a free 4-digit code, the bookings, the rangs and the host as the first waiter.
 *
 * @returns { Promise<void> }
 */
async function createOnlineGame() {
  const run = page.run;
  const user = await signedInUser();
  if (!user)
    return showDialog({
      icon: 'user',
      title: translate('Connexion', 'Sign in'),
      text: onlineError('signin'),
    });
  try {
    let code = '';
    for (let attempt = 0; attempt < 6 && !code; attempt++) {
      const candidate = String(randomInt(1000, 9999));
      const snapshot = await cloud.store.getDoc(gameRef(candidate));
      const existing = snapshot.exists() ? cleanRemote(snapshot.data()) : null;
      if (!existing || Date.now() - existing.createdMs > GAME_TTL_MS) code = candidate;
    }
    if (!code) throw new Error('busy');
    // 📡 the public entry of « Parties en cours »: a random id (never the code), the code only for an open game
    const listId = randomListId();
    const expires = cloud.store.Timestamp.fromMillis(Date.now() + GAME_TTL_MS);
    await cloud.store.setDoc(gameRef(code), {
      v: 1,
      host: user.uid,
      n: page.waiterCount,
      bk: JSON.stringify(page.bookings),
      rg: JSON.stringify(Object.assign({}, page.rangs, { sp: cleanSpeed(page.speed) })),
      wt: { [user.uid]: { n: playerName(user), i: 0 } },
      tb: {},
      rq: {},
      st: null,
      at: cloud.store.serverTimestamp(),
      pub: page.openGame !== false,
      en: false,
      exp: expires,
      li: listId,
    });
    await cloud.store
      .setDoc(listRef(listId), {
        h: user.uid,
        hn: playerName(user),
        c: page.openGame !== false ? code : '',
        n: page.waiterCount,
        w: 1,
        s: false,
        k: SERVICE_START,
        d: 0,
        t: page.bookings.length,
        en: false,
        exp: expires,
        at: cloud.store.serverTimestamp(),
      })
      .catch(() => {});
    // 🔑 my game on this phone: I come back to it without the code (even « sur code »)
    rememberGame(listId, code, Date.now() + GAME_TTL_MS, true);
    if (run !== page.run) return;
    startGame({
      mode: 'online',
      code,
      host: user.uid,
      me: user.uid,
      waiters: [{ id: user.uid, name: playerName(user), rang: 0 }],
      rangs: page.rangs,
      bookings: page.bookings,
      tables: {},
      speed: cleanSpeed(page.speed),
      listId,
    });
    subscribeGame(code);
    history.replaceState({ ltfSim: 'lobby' }, '');
    render('lobby');
  } catch (error) {
    showDialog({ icon: 'alert', title: translate('En ligne', 'Online'), text: onlineError(error) });
  }
}

/**
 * `joinOnlineGame` - Async Function 🔑
 *
 * Joins a game with its code: takes the first free rang (or comes back to my own).
 *
 * @param { string } code - the 4-digit code
 * @returns { Promise<void> }
 */
async function joinOnlineGame(code) {
  if (!/^[0-9]{4}$/.test(code)) return;
  if (!(await leaveRunningGame(code))) return;
  const user = await signedInUser();
  if (!user)
    return showDialog({
      icon: 'user',
      title: translate('Connexion', 'Sign in'),
      text: onlineError('signin'),
    });
  try {
    const snapshot = await cloud.store.getDoc(gameRef(code));
    const remote = snapshot.exists() ? cleanRemote(snapshot.data()) : null;
    if (!remote || Date.now() - remote.createdMs > GAME_TTL_MS)
      return showDialog({
        icon: 'key',
        title: translate('Code inconnu', 'Unknown code'),
        text: translate('Aucune partie en cours avec ce code.', 'No game is running with this code.'),
      });
    let mine = remote.waiters.find((waiter) => waiter.id === user.uid);
    if (!mine) {
      const taken = remote.waiters.map((waiter) => waiter.rang);
      const free = [0, 1, 2, 3].filter((rang) => rang < remote.count && !taken.includes(rang));
      if (!free.length)
        return showDialog({
          icon: 'users',
          title: translate('Partie complète', 'Game full'),
          text: translate('Tous les rangs sont déjà pris.', 'Every rang is already taken.'),
        });
      mine = { id: user.uid, name: playerName(user), rang: free[0] };
      await cloud.store.updateDoc(gameRef(code), { ['wt.' + user.uid]: { n: mine.name, i: mine.rang } });
      remote.waiters.push(mine);
    }
    startGame({
      mode: 'online',
      code,
      host: remote.host,
      me: user.uid,
      waiters: remote.waiters,
      rangs: remote.rangs,
      bookings: remote.bookings,
      tables: remote.tables,
      requests: remote.requests,
      startMs: remote.startMs,
      speed: remote.speed,
      listId: remote.listId,
      ended: remote.ended,
    });
    page.joinedAsGuest = remote.host !== user.uid;
    // 👑 the host comes back: already a waiter (no second entry), the lobby expects the game's waiter count
    if (remote.host === user.uid) page.waiterCount = remote.count;
    // 🔑 remembered on this phone (to come back in a tap, and for the notification after a reload)
    if (remote.listId)
      rememberGame(remote.listId, code, remote.createdMs + GAME_TTL_MS, remote.host === user.uid);
    subscribeGame(code);
    history.pushState({ ltfSim: 'lobby' }, '');
    render(remote.startMs ? 'service' : 'lobby');
  } catch (error) {
    showDialog({ icon: 'alert', title: translate('En ligne', 'Online'), text: onlineError(error) });
  }
}

/**
 * `subscribeGame` - Function 👂
 *
 * Listens to `sim/{code}` (onSnapshot): waiters, tables, requests and the start time, shared by everyone.
 *
 * @param { string } code - the game code
 * @returns { void }
 */
function subscribeGame(code) {
  stopListening();
  cloud.unsubscribe = cloud.store.onSnapshot(
    gameRef(code),
    (snapshot) => {
      if (!game || game.code !== code) return;
      const remote = snapshot.exists() ? cleanRemote(snapshot.data({ serverTimestamps: 'estimate' })) : null;
      if (!remote) {
        showToast('alert', translate('La partie a été fermée.', 'The game was closed.'));
        return;
      }
      applyRemote(remote);
    },
    () => showToast('alert', onlineError('permission')),
  );
}

/**
 * `stopListening` - Function 🔇
 *
 * @returns { void } - stops listening to the online game
 */
function stopListening() {
  if (cloud.unsubscribe) cloud.unsubscribe();
  cloud.unsubscribe = null;
}

/**
 * `applyRemote` - Function 🔄
 *
 * Merges the shared game into this phone's: tells me when a table was taken from me, when my request was answered,
 * and moves everyone from the lobby to the service when the host starts.
 *
 * @param { object } remote - a cleaned game (see cleanRemote)
 * @returns { void }
 */
function applyRemote(remote) {
  Object.keys(remote.tables).forEach((tableId) => {
    const before = game.tables[tableId];
    const after = remote.tables[tableId];
    if (before && before.o === game.me && after.o !== game.me)
      showToast(
        'swap',
        translate(
          `${waiterNameIn(remote, after.o)} a pris la ${tableId}.`,
          `${waiterNameIn(remote, after.o)} took ${tableId}.`,
        ),
      );
    if (before && before.o !== game.me && after.o === game.me && game.requests[tableId])
      showToast(
        'check',
        translate(`Demande acceptée : la ${tableId} est à vous.`, `Request accepted: ${tableId} is yours.`),
      );
  });
  Object.keys(remote.requests).forEach((tableId) => {
    const request = remote.requests[tableId];
    if (request.f === game.me && request.r) {
      showToast('close', translate(`Demande refusée pour la ${tableId}.`, `Request refused for ${tableId}.`));
      writeRemote({ ['rq.' + tableId]: cloud.store.deleteField() });
    }
  });
  const wasStarted = !!game.startMs;
  // 📡 the host keeps « Parties en cours » up to date when someone joins
  if (game.me === game.host && remote.waiters.length !== game.waiters.length)
    updateListEntry({ w: remote.waiters.length });
  if (remote.ended && !game.ended) game.ended = true;
  game.waiters = remote.waiters;
  game.tables = remote.tables;
  game.requests = remote.requests;
  game.startMs = remote.startMs;
  if (!wasStarted && game.startMs && page.view === 'lobby') {
    history.replaceState({ ltfSim: 'service' }, '');
    return render('service');
  }
  refreshLive();
}

/**
 * `waiterNameIn` - Function 🤵
 *
 * @param { object } remote - a cleaned game
 * @param { string } id - a waiter id
 * @returns { string } - the waiter's name in that game
 */
function waiterNameIn(remote, id) {
  const waiter = remote.waiters.find((entry) => entry.id === id);
  return waiter ? waiter.name : translate('Quelqu’un', 'Someone');
}

/**
 * `startOnlineGame` - Function ▶️
 *
 * The host starts the clock for everyone (server time) and gives each table to the waiter of its rang.
 *
 * @returns { void }
 */
function startOnlineGame() {
  if (!game || game.mode !== 'online' || game.me !== game.host || game.startMs) return;
  const tables = {};
  game.bookings.forEach(
    (booking) => (tables[booking.table] = newEntry(booking, ownerForRang(game.rangs[booking.table]))),
  );
  game.tables = tables;
  game.startMs = Date.now();
  writeRemote({ tb: tables, st: cloud.store.serverTimestamp() });
  updateListEntry({ s: true });
  history.replaceState({ ltfSim: 'service' }, '');
  render('service');
}

/**
 * `stealTable` - Function 🔁
 *
 * @param { string } tableId - a table of another rang
 * @returns { void } - the table becomes mine (online: one field write)
 */
function stealTable(tableId) {
  const entry = entryOf(tableId);
  if (game.mode === 'online') {
    game.tables[tableId] = Object.assign({}, entry, { o: game.me });
    writeRemote({ ['tb.' + tableId + '.o']: game.me });
  } else commitTable(tableId, Object.assign({}, entry, { o: game.me }));
}

/**
 * `askTable` - Function 🙋
 *
 * @param { string } tableId - a table of another rang
 * @returns { void } - sends « demander la permission » to its owner
 */
function askTable(tableId) {
  const entry = entryOf(tableId);
  const request = { f: game.me, t: entry.o, n: waiterName(game.me), r: 0 };
  game.requests[tableId] = request;
  writeRemote({ ['rq.' + tableId]: request });
  showToast(
    'hand',
    translate(`Demande envoyée à ${waiterName(entry.o)}.`, `Request sent to ${waiterName(entry.o)}.`),
  );
}

/**
 * `answerRequest` - Function ✅
 *
 * @param { string } tableId - the table asked for
 * @param { boolean } accept - true to give it, false to refuse
 * @returns { void }
 */
function answerRequest(tableId, accept) {
  const request = game.requests[tableId];
  if (!request || request.t !== game.me) return;
  if (accept) {
    game.tables[tableId] = Object.assign({}, entryOf(tableId), { o: request.f });
    delete game.requests[tableId];
    writeRemote({ ['tb.' + tableId + '.o']: request.f, ['rq.' + tableId]: cloud.store.deleteField() });
  } else {
    game.requests[tableId] = Object.assign({}, request, { r: 1 });
    writeRemote({ ['rq.' + tableId]: game.requests[tableId] });
  }
  refreshLive();
}

// ===== PARTIES EN COURS 📡 ===== //
// The team's live online games, from `simlist/{id}` (one public entry per game, written by its host):
// - the entry's id is random, never the game code; an open game shows its code, a « sur code » one doesn't
// - the query is where('exp', '>', now) + limit(20); the rules allow a list only with that limit (provable)
// - ended games (en) and expired ones are filtered here; joining an open game uses the code from its entry,
//   a « sur code » game still needs the 4-digit code typed in

/**
 * `openGamesDrawer` - Async Function 📡
 *
 * Opens the « Parties en cours » bottom sheet and listens to the live list (onSnapshot on the query).
 *
 * @param { object } [selected] - a clean list entry to open straight away (a tap on the live card)
 * @param { boolean } [hostNote] - true to explain why the host still needs the code (another phone)
 * @returns { Promise<void> }
 */
async function openGamesDrawer(selected, hostNote) {
  closeDrawer();
  const holder = document.getElementById('simPage');
  if (!holder) return;
  const drawer = document.createElement('div');
  drawer.className = 'simdrawer';
  drawer.id = 'simDrawer';
  drawer.dataset.act = 'closedrawer';
  holder.appendChild(drawer);
  page.games = selected ? [selected] : null;
  page.drawerGame = selected ? selected.id : '';
  page.hostNote = !!hostNote;
  page.gamesError = '';
  renderDrawer();
  const run = page.run;
  const user = await signedInUser();
  if (run !== page.run || !document.getElementById('simDrawer')) return;
  if (!user) {
    page.gamesError = onlineError('signin');
    return renderDrawer();
  }
  try {
    const store = cloud.store;
    const listQuery = store.query(
      store.collection(cloud.db, 'simlist'),
      store.where('exp', '>', store.Timestamp.now()),
      store.limit(LIST_LIMIT),
    );
    cloud.listUnsubscribe = store.onSnapshot(
      listQuery,
      (snapshot) => {
        const games = [];
        snapshot.forEach((item) => {
          const entry = cleanListEntry(item.id, item.data());
          if (entry && !entry.ended && entry.expMs > Date.now()) games.push(entry);
        });
        // 📌 the game opened from the live card stays on screen until the list has it
        const opened = (page.games || []).find((entry) => entry.id === page.drawerGame);
        if (opened && !games.some((entry) => entry.id === opened.id)) games.push(opened);
        page.games = games.sort((left, right) => right.expMs - left.expMs);
        renderDrawer();
      },
      (error) => {
        page.gamesError = onlineError(error);
        renderDrawer();
      },
    );
  } catch (error) {
    page.gamesError = onlineError(error);
    renderDrawer();
  }
}

/**
 * `renderDrawer` - Function 🖼️
 *
 * @returns { void } - draws the list (or one game's details) inside the bottom sheet (views in sim-list.js)
 */
function renderDrawer() {
  const drawer = document.getElementById('simDrawer');
  if (!drawer) return;
  drawer.innerHTML = drawerHtml({
    games: page.games,
    selectedId: page.drawerGame,
    error: page.gamesError,
    hostNote: page.hostNote,
  });
}

/**
 * `joinFromDrawer` - Function 🔑
 *
 * @param { boolean } withCode - true when the waiter typed the code (« sur code »)
 * @returns { void } - joins the selected game (the code from its entry, or the typed one)
 */
function joinFromDrawer(withCode) {
  const entry = (page.games || []).find((item) => item.id === page.drawerGame);
  if (!entry) return;
  const field = document.getElementById('simListCode');
  const code = withCode ? String((field && field.value) || '').replace(/\D/g, '') : entry.code;
  if (!/^[0-9]{4}$/.test(code)) {
    if (field) field.classList.add('simbad');
    return;
  }
  closeDrawer();
  joinOnlineGame(code);
}

/**
 * `tapListedGame` - Async Function 🎯
 *
 * A game tapped in « Parties en cours » (or on the live card). The host, or anyone who played it on this phone,
 * comes back straight away with the code remembered here (`ltf_sim_mine_v1`), even for a « sur code » game; the
 * host on another phone gets the code through `findHostedCode` when the rules allow it, else the code field with
 * a note. Everyone else sees the game's details (« Rejoindre », or the code field).
 *
 * @param { object } entry - a clean list entry
 * @returns { Promise<void> }
 */
async function tapListedGame(entry) {
  if (!entry) return;
  const user = await signedInUser();
  const isHost = !!user && entry.host === user.uid;
  const remembered = mineCode(entry.id);
  let code = remembered || (isHost ? entry.code : '');
  if (!code && isHost) code = await findHostedCode(entry.id, user.uid);
  if (code) {
    closeDrawer();
    return joinOnlineGame(code);
  }
  if (!document.getElementById('simDrawer')) return openGamesDrawer(entry, isHost);
  page.drawerGame = entry.id;
  page.hostNote = isHost;
  renderDrawer();
}

/**
 * `findHostedCode` - Async Function 🔎
 *
 * The host on another phone: the code of my own game, by its list id (query `sim` where host == me and li == id,
 * limit 1). Needs the rule « allow list » of /workspace/work/rules_sim_v3.txt; without it the query is refused and
 * the code field is shown instead (with a note).
 *
 * @param { string } listId - the game's « Parties en cours » id
 * @param { string } uid - my uid
 * @returns { Promise<string> } - the 4-digit code ('' when it can't be found)
 */
async function findHostedCode(listId, uid) {
  if (!cloud.ready || typeof cloud.store.getDocs !== 'function') return '';
  try {
    const store = cloud.store;
    const snapshot = await store.getDocs(
      store.query(
        store.collection(cloud.db, 'sim'),
        store.where('host', '==', uid),
        store.where('li', '==', listId),
        store.limit(1),
      ),
    );
    let code = '';
    snapshot.forEach((item) => {
      if (/^[0-9]{4}$/.test(item.id)) code = item.id;
    });
    if (code) rememberGame(listId, code, Date.now() + GAME_TTL_MS, true);
    return code;
  } catch (error) {
    return '';
  }
}

/**
 * `leaveRunningGame` - Async Function 🚪
 *
 * Before joining or resuming another game: asks to leave the one on screen (in-page dialog). A solo game stays
 * saved (« Reprendre » later), an online one is marked as left.
 *
 * @param { string } code - the code about to be joined ('' for a solo game)
 * @returns { Promise<boolean> } - true when the way is clear
 */
async function leaveRunningGame(code) {
  if (!game) return true;
  if (code && game.code === code) return true;
  if (game.ended || !game.startMs) {
    stopGame();
    return true;
  }
  const yes = await showDialog({
    icon: 'door',
    title: translate('Quitter la partie en cours ?', 'Leave the current game?'),
    text:
      game.mode === 'solo'
        ? translate(
            'Elle reste enregistrée : « Reprendre la partie » plus tard.',
            'It stays saved: « Resume » later.',
          )
        : translate('Vous pourrez revenir avec le même code.', 'You can come back with the same code.'),
    buttons: [
      { label: translate('Rester', 'Stay'), value: false },
      { label: translate('Quitter', 'Leave'), value: true, kind: 'danger' },
    ],
  });
  if (!yes || !game) return !!yes;
  if (game.mode === 'solo') saveSolo(true);
  else if (game.listId) markLeft(game.listId);
  stopGame();
  return true;
}

/**
 * `ensurePageOpen` - Async Function 📚
 *
 * @returns { Promise<void> } - opens the chapter page when it isn't on screen (from any tab of the app)
 */
async function ensurePageOpen() {
  if (page.isOpen && document.getElementById('simPage')) return;
  await openPage();
}

/**
 * `openListedGame` - Async Function 🛎️
 *
 * The live card's tap on one game: the chapter page, then the direct rejoin or the game's details.
 *
 * @param { object } entry - a clean list entry
 * @returns { Promise<void> }
 */
async function openListedGame(entry) {
  if (game && game.listId === entry.id && page.isOpen) return;
  await ensurePageOpen();
  return tapListedGame(entry);
}

/**
 * `openDrawerFromCard` - Async Function 📡
 *
 * @returns { Promise<void> } - the live card's tap with several games: the chapter page & « Parties en cours »
 */
async function openDrawerFromCard() {
  await ensurePageOpen();
  return openGamesDrawer();
}

/**
 * `playingState` - Function 🎮
 *
 * @returns { { solo: boolean, listId: string } | null } - the game on screen (for the live card & notification)
 */
function playingState() {
  if (!page.isOpen || !game) return null;
  return { solo: game.mode === 'solo', listId: game.listId || '' };
}

// ===== SAVED SOLO GAME 💾 ===== //
// A solo game lives in this page's memory; it's also saved to localStorage (`ltf_sim_solo_v1`) at the start, after
// every change (at most every 2 s) and once a service minute, and right away when the app goes to the background.
// After a reload: « Reprendre la partie » (chapter page & live card), or straight back from the notification.
// The save is the shape of an online game doc (so `cleanRemote` checks it again) + the clock anchor.

/**
 * `soloSnapshot` - Function 📸
 *
 * @returns { object } - the solo game to save: { v, at, st, am, ac, sp, me, xp, seen, doc, sum }
 */
function soloSnapshot() {
  const waiters = {};
  game.waiters.forEach((waiter) => (waiters[waiter.id] = { n: waiter.name, i: waiter.rang }));
  return {
    v: 1,
    at: Date.now(),
    st: game.startMs,
    am: game.anchorMs || game.startMs,
    ac: game.anchorClock || SERVICE_START,
    sp: cleanSpeed(game.speed),
    me: game.me,
    xp: game.earned,
    seen: Object.keys(game.seen).filter((tableId) => game.seen[tableId]),
    doc: {
      v: 1,
      host: 'w0',
      n: game.waiters.length,
      bk: JSON.stringify(game.bookings),
      rg: JSON.stringify(game.rangs),
      wt: waiters,
      tb: game.tables,
    },
    // 🔔 what sim-live.js needs for the notification without rebuilding the game
    sum: { d: doneCount(), t: game.bookings.length, times: game.bookings.map((booking) => booking.time) },
  };
}

/**
 * `saveSolo` - Function 💾
 *
 * @param { boolean } force - true to save now (start, background, leaving)
 * @returns { void } - saves the solo game: after a change (at most every 2 s) or once a minute
 */
function saveSolo(force) {
  if (!game || game.mode !== 'solo' || !game.startMs || game.ended) return;
  const now = Date.now();
  const since = now - page.soloSavedAt;
  if (!force && (since < 2000 || (!page.soloDirty && since < 60000))) return;
  try {
    localStorage.setItem(SOLO_KEY, JSON.stringify(soloSnapshot()));
    page.soloSavedAt = now;
    page.soloDirty = false;
  } catch (error) {
    // 🤷 a full storage: the game simply can't be resumed after a reload
  }
}

/**
 * `readSoloSave` - Function 📖
 *
 * @returns { object | null } - the saved solo game (raw, checked by restoreSoloGame), null when there's none
 */
function readSoloSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(SOLO_KEY) || 'null');
    return saved && typeof saved === 'object' ? saved : null;
  } catch (error) {
    return null;
  }
}

/**
 * `restoreSoloGame` - Function ♻️
 *
 * Checks every saved value (the doc through `cleanRemote`, the clock, the waiters, the owners) and rebuilds the
 * game (steps, guests & interruptions come back from the bookings' seeds).
 *
 * @param { any } saved - the saved solo game
 * @returns { boolean } - true when the game is back in memory
 */
function restoreSoloGame(saved) {
  const now = Date.now();
  if (!saved || saved.v !== 1 || !saved.doc || typeof saved.doc !== 'object') return false;
  const startMs = Number(saved.st);
  const anchorMs = Number(saved.am);
  const anchorClock = Number(saved.ac);
  if (![startMs, anchorMs, anchorClock].every(Number.isFinite)) return false;
  if (startMs > now + 60000 || now - startMs >= GAME_TTL_MS || anchorMs < startMs || anchorMs > now + 60000)
    return false;
  if (anchorClock < SERVICE_START || anchorClock > HARD_END) return false;
  /**
   * `stamp` - Function ⏱️
   *
   * @param { number } millis - a time in ms
   * @returns { object } - a timestamp-like value (what cleanRemote reads)
   */
  const stamp = (millis) => ({ toMillis: () => millis });
  const remote = cleanRemote(
    Object.assign({}, saved.doc, { host: 'w0', rq: {}, st: stamp(startMs), at: stamp(startMs) }),
  );
  if (!remote || !remote.waiters.length) return false;
  const waiters = remote.waiters.slice().sort((left, right) => left.rang - right.rang);
  const ids = waiters.map((waiter) => waiter.id);
  if (!ids.every((id) => /^w[0-3]$/.test(id)) || !ids.includes('w0')) return false;
  if (
    !remote.bookings.every(
      (booking) => remote.tables[booking.table] && ids.includes(remote.tables[booking.table].o),
    )
  )
    return false;
  startGame({
    mode: 'solo',
    me: ids.includes(saved.me) ? saved.me : 'w0',
    host: 'w0',
    waiters,
    rangs: remote.rangs,
    bookings: remote.bookings,
    tables: remote.tables,
    speed: cleanSpeed(saved.sp),
    startMs,
    anchorMs,
    anchorClock,
    earned: clamp(Math.round(Number(saved.xp) || 0), 0, 100000),
  });
  (Array.isArray(saved.seen) ? saved.seen : []).forEach((tableId) => {
    if (bookingOf(tableId)) game.seen[tableId] = true;
  });
  // ⚙️ the setup matches the game (Back after the game lands on a coherent setup)
  page.online = false;
  page.joinedAsGuest = false;
  page.waiterCount = waiters.length;
  page.rangs = remote.rangs;
  page.bookings = remote.bookings;
  page.speed = game.speed;
  waiters.forEach((waiter) => (page.names[waiter.rang] = waiter.name));
  page.soloSavedAt = Date.now();
  page.soloDirty = false;
  return true;
}

/**
 * `resumeSolo` - Async Function ▶️
 *
 * « Reprendre la partie »: the chapter page (if needed), the data (the Rust build has no window.LTF), then the saved
 * game straight into the service. A broken save is dropped.
 *
 * @returns { Promise<void> }
 */
async function resumeSolo() {
  addStyles();
  if (game && game.mode === 'solo' && game.startMs && !game.ended && page.isOpen) return render('service');
  if (!(await leaveRunningGame(''))) return;
  if (!page.isOpen) {
    page.isOpen = true;
    page.quitting = false;
    history.pushState({ ltfSim: 'page' }, '');
    render('page');
  }
  // 📦 the floor plan & the menu first: cleanRemote & the steps need them
  page.dataReady = await ensureData();
  if (!page.dataReady)
    return showDialog({
      icon: 'alert',
      title: translate('Simulation', 'Simulation'),
      text: translate(
        'Le menu et le plan de salle ne sont pas encore chargés. Vérifiez la connexion et réessayez.',
        'The menu and the floor plan are not loaded yet. Check the connection and try again.',
      ),
    });
  if (!restoreSoloGame(readSoloSave())) {
    clearSolo();
    render('page');
    return showToast(
      'alert',
      translate('Cette partie ne peut pas être reprise.', "This game can't be resumed."),
    );
  }
  history.pushState({ ltfSim: 'service' }, '');
  render('service');
  updateNotification(true);
  liveChanged();
}

// ===== DIALOGS & TOASTS 💬 ===== //

/**
 * `showDialog` - Function 🗨️
 *
 * The app's own themed dialog (the chat's .cdlg look), never window.confirm / alert / prompt.
 *
 * @param { object } options - { icon, title, text, input: true for the 4-digit code field, buttons: [{ label, value, kind }] }
 * @returns { Promise<any> } - the value of the tapped button (with the typed code when there's a field), null when dismissed
 */
function showDialog(options) {
  return new Promise((resolve) => {
    const buttons = options.buttons || [{ label: 'OK', value: true }];
    const overlay = document.createElement('div');
    overlay.className = 'cdlg simdlg';
    overlay.innerHTML =
      `<div class="cdlgbox" role="dialog" aria-modal="true"><div class="cdlgic simdlgic">${icon(options.icon || 'star', 26)}</div>` +
      `<h3>${escapeHtml(options.title || '')}</h3><p class="cdlgtx">${escapeHtml(options.text || '')}</p>` +
      (options.input
        ? `<input class="simcode" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="code">`
        : '') +
      `<div class="cdlgbt">` +
      buttons
        .map(
          (button, index) =>
            `<button class="btn ${button.kind || (index === buttons.length - 1 ? '' : 'sec')}" data-index="${index}">${escapeHtml(button.label)}</button>`,
        )
        .join('') +
      `</div></div>`;
    // 👋 close & answer
    /**
     * `close` - Function 👋
     *
     * @param { any } value - the answer
     * @returns { void } - removes the dialog and resolves the promise
     */
    const close = (value) => {
      overlay.remove();
      resolve(value);
    };
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) return close(null);
      const button = event.target.closest('[data-index]');
      if (!button) return;
      const value = buttons[Number(button.dataset.index)].value;
      const field = overlay.querySelector('.simcode');
      close(field ? { value, code: field.value.replace(/\D/g, '') } : value);
    });
    document.body.appendChild(overlay);
    const field = overlay.querySelector('.simcode');
    if (field) {
      field.addEventListener('input', () => (field.value = field.value.replace(/\D/g, '').slice(0, 4)));
      setTimeout(() => field.focus(), 50);
    }
  });
}

/**
 * `showToast` - Function 🔔
 *
 * @param { string } iconName - an icon of ICON_PATHS
 * @param { string } text - the message
 * @returns { void } - shows a short message at the top (tap to close)
 */
function showToast(iconName, text) {
  if (!page.isOpen) return;
  const old = document.getElementById('simToast');
  if (old) old.remove();
  clearTimeout(page.toastTimer);
  const toast = document.createElement('div');
  toast.id = 'simToast';
  toast.className = 'simtoast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `${icon(iconName, 22)}<div class="simgrow">${escapeHtml(text)}</div>`;
  toast.addEventListener('click', () => toast.remove());
  document.body.appendChild(toast);
  page.toastTimer = setTimeout(() => toast.remove(), 3500);
}

// ===== VIEWS 🖼️ ===== //

/**
 * `appRoot` - Function 🖼️
 *
 * @returns { HTMLElement } - the app's main view (#app)
 */
function appRoot() {
  return document.getElementById('app');
}

/**
 * `showTabBar` - Function 🧭
 *
 * @param { boolean } visible - show (chapter page) or hide (in game) the bottom tab bar
 * @returns { void }
 */
function showTabBar(visible) {
  const tabBar = document.getElementById('tabbar');
  if (tabBar) tabBar.style.display = visible ? '' : 'none';
  document.body.classList.toggle('notabs', !visible);
}

/**
 * `barHtml` - Function 🔝
 *
 * @param { string } title - the bar's title
 * @param { string } [right] - extra HTML on the right (the clock, a button)
 * @returns { string } - the top bar with its back button
 */
function barHtml(title, right) {
  return (
    `<header class="simbar"><button class="simiconbtn" data-go="back" aria-label="${translate('Retour', 'Back')}">` +
    `${icon('back', 24)}</button><div class="simtitle">${escapeHtml(title)}</div>${right || ''}</header>`
  );
}

/**
 * `clockHtml` - Function 🕰️
 *
 * @returns { string } - the service clock pill
 */
function clockHtml() {
  return `<span class="simclock" id="simClock">${icon('clock', 16)}<span>${clockText(serviceNow())}</span></span>`;
}

/**
 * `speedHtml` - Function ⏩
 *
 * @returns { string } - solo: the speed button (taps cycle ×1 → ×2 → ×5 → ×10) & « next arrival »; online: the speed
 */
function speedHtml() {
  if (!game) return '';
  const label = `×${game.speed || 1}`;
  if (game.mode !== 'solo') return `<span class="simspeed">${label}</span>`;
  return (
    `<button class="simspeed" data-act="speed" aria-label="${translate('Vitesse', 'Speed')}">${label}</button>` +
    `<button class="simiconbtn" data-act="skip" aria-label="${translate('Prochaine arrivée', 'Next arrival')}">${icon('skip', 22)}</button>`
  );
}

/**
 * `planSvg` - Function 🗺️
 *
 * The real floor plan (LTF.tables & counters, same geometry as the app's plan), coloured by rang or by status.
 *
 * @param { string } mode - 'setup' (every table in its rang's colour) or 'service' (tonight's tables & their status)
 * @returns { string } - the SVG
 */
function planSvg(mode) {
  const now = serviceNow();
  const size = 5.2;
  let svg =
    `<svg class="simplan" viewBox="-3 -6 106 72" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="plan">` +
    `<rect x="-2" y="-2" width="104" height="66" rx="2" class="simroom"/>` +
    `<line x1="0" y1="-1" x2="100" y2="-1" class="simwin"/>` +
    `<text x="50" y="-3" class="simlabel">${translate('Baies vitrées · Vieux-Port', 'Bay windows · Vieux-Port')}</text>`;
  (menuData().counters || []).forEach((counter) => {
    svg +=
      `<rect x="${counter.x1}" y="${counter.y}" width="${counter.x2 - counter.x1}" height="3" class="simctr"/>` +
      `<text x="${(counter.x1 + counter.x2) / 2}" y="${counter.y + 6.5}" class="simlabel">${escapeHtml(counter.label)}</text>`;
  });
  floorTables().forEach((table) => {
    let classes = 'simtable';
    let style = '';
    if (mode === 'setup') {
      const colour = WAITER_COLOURS[page.rangs[table.id] || 0];
      style = `stroke:${colour};fill:${colour};fill-opacity:.28`;
    } else {
      const booking = bookingOf(table.id);
      if (!booking) {
        classes += ' simfree';
        style = 'stroke:var(--line)';
      } else {
        const entry = entryOf(table.id);
        classes += ' simst-' + statusOf(table.id, now);
        if (entry.o === game.me) classes += ' simmine';
        if (entry.o === game.me && needsWaiter(table.id, now)) classes += ' simpulse';
        style = `stroke:${waiterColour(entry.o)}`;
      }
    }
    const attributes = `class="${classes}" style="${style}" data-table="${table.id}"`;
    svg +=
      table.sh === 'round'
        ? `<circle cx="${table.x}" cy="${table.y}" r="${size * 0.65}" ${attributes}/>`
        : table.sh === 'long'
          ? `<rect x="${table.x - 2.5}" y="${table.y - 8}" width="5" height="12" rx="1" ${attributes}/>`
          : `<rect x="${table.x - size / 2}" y="${table.y - size / 2}" width="${size}" height="${size}" rx="1" ${attributes}/>`;
    svg += `<text x="${table.x}" y="${table.y + 0.9}" class="simtid">${table.id}</text>`;
  });
  return svg + '</svg>';
}

/**
 * `renderPage` - Function 📚
 *
 * The chapter page: what the game is, solo / create / join, and how it works.
 *
 * @returns { void }
 */
function renderPage() {
  showTabBar(true);
  const best = readBest();
  const modes = [
    [
      'solo',
      'user',
      translate('Partie solo', 'Solo game'),
      translate('1 à 4 serveurs sur ce téléphone, hors ligne', '1 to 4 waiters on this phone, offline'),
      best ? translate('Record', 'Best') + ' ' + best : '',
    ],
    [
      'host',
      'users',
      translate('Créer une partie en ligne', 'Create an online game'),
      translate("Un code à 4 chiffres pour l'équipe", 'A 4-digit code for the team'),
      '',
    ],
    [
      'join',
      'key',
      translate('Rejoindre', 'Join'),
      translate("Entrez le code de l'hôte", "Enter the host's code"),
      '',
    ],
    [
      'games',
      'live',
      translate('Parties en cours', 'Live games'),
      translate("Les parties de l'équipe, en direct", "The team's games, live"),
      '',
    ],
  ];
  const tips = [
    [
      'clock',
      translate(
        'En temps réel de 19:00 à 22:30 environ, ou accéléré (×2, ×5, ×10).',
        'Real time from 19:00 to about 22:30, or sped up (×2, ×5, ×10).',
      ),
    ],
    [
      'chat',
      translate(
        'Touchez une table arrivée pour parler aux clients, de l’accueil au départ.',
        'Tap an arrived table to talk to the guests, from welcome to goodbye.',
      ),
    ],
    [
      'alert',
      translate(
        'Allergies : proposer un plat avec leur allergène coûte cher.',
        'Allergies: suggesting a dish with their allergen costs a lot.',
      ),
    ],
    [
      'star',
      translate(
        'Points par réponse, bonus de rapidité, et la patience des clients.',
        'Points per answer, a speed bonus, and the guests’ patience.',
      ),
    ],
  ];
  appRoot().innerHTML =
    `<div id="simPage">${barHtml('')}<div class="pad"><div class="kick2">${translate('Chapitre', 'Chapter')}</div>` +
    `<h1 class="ptitle">${translate('Simulation de service', 'Service simulation')}</h1>` +
    `<div class="muted">${translate('Un dîner aux Trois Forts, en accéléré', 'A dinner service at Les Trois Forts, sped up')}</div>` +
    `<p class="simintro">${translate(
      'Réservations du soir, briefing, arrivées, commandes, allergies, vins, desserts et addition : jouez tout le service, seul ou à plusieurs.',
      "Tonight's bookings, briefing, arrivals, orders, allergies, wines, desserts and the bill: play the whole service, alone or as a team.",
    )}</p>` +
    resumeHtml() +
    `<div class="sh">${translate('Jouer', 'Play')}</div>` +
    modes
      .map(
        ([view, iconName, name, subtitle, record]) =>
          `<button class="li tall" data-go="${view}"><div class="av simav">${icon(iconName, 22)}</div>` +
          `<div class="tx"><div class="n">${name}</div><div class="muted">${subtitle}</div></div><div class="rt">` +
          (record ? `<span class="muted sm">${escapeHtml(record)}</span>` : '') +
          `<span class="muted simchev">›</span></div></button>`,
      )
      .join('') +
    `<div class="sh">${translate('Comment ça marche', 'How it works')}</div>` +
    tips
      .map(
        ([iconName, text]) =>
          `<div class="simattn">${icon(iconName, 20)}<div>${escapeHtml(text)}</div></div>`,
      )
      .join('') +
    `</div></div>`;
}

/**
 * `resumeHtml` - Function ▶️
 *
 * @returns { string } - « Reprendre la partie » when a solo game was saved (after a reload), with its status
 */
function resumeHtml() {
  const summary = game ? null : readSoloSummary();
  if (!summary) return '';
  return (
    `<div class="simbanner simresume">${icon('play', 20)}<div class="simgrow"><b>${translate('Partie solo en cours', 'Solo game in progress')}</b><br>` +
    `${translate('Service', 'Service')} ${clockText(summary.clock)} · ${summary.done}/${summary.total} tables</div>` +
    `<button class="simsmallbtn" data-act="resume">${translate('Reprendre la partie', 'Resume the game')}</button></div>`
  );
}

/**
 * `renderSetup` - Function ⚙️
 *
 * The setup: how many waiters, each one's rang (auto split by position, or tap tables to move them).
 *
 * @returns { void }
 */
function renderSetup() {
  showTabBar(false);
  const counts = {};
  floorTables().forEach(
    (table) => (counts[page.rangs[table.id] || 0] = (counts[page.rangs[table.id] || 0] || 0) + 1),
  );
  const waiters = [];
  for (let index = 0; index < page.waiterCount; index++) {
    const label = page.online
      ? index === 0
        ? translate('Vous (hôte)', 'You (host)')
        : translate(`Serveur ${index + 1} (à rejoindre)`, `Waiter ${index + 1} (to join)`)
      : '';
    waiters.push(
      `<div class="simwaiter${page.brush === index ? ' simon' : ''}" data-brush="${index}" role="button" tabindex="0">` +
        `<span class="simdot" style="background:${WAITER_COLOURS[index]}"></span>` +
        (page.online
          ? `<span class="simname simgrow">${escapeHtml(label)}</span>`
          : `<input class="simgrow" data-name="${index}" maxlength="20" value="${escapeHtml(page.names[index])}" aria-label="${translate('Nom', 'Name')}">`) +
        `<small>${counts[index] || 0} ${translate('tables', 'tables')}</small></div>`,
    );
  }
  appRoot().innerHTML =
    `<div id="simPage">${barHtml(page.online ? translate('Partie en ligne', 'Online game') : translate('Préparer le service', 'Set up the service'))}` +
    `<div class="pad"><div class="simsec">${icon('users', 20)}${translate('Nombre de serveurs', 'Number of waiters')}</div>` +
    `<div class="simseg">` +
    [1, 2, 3, 4]
      .map(
        (count) =>
          `<button class="simsegbtn${page.waiterCount === count ? ' simon' : ''}" data-count="${count}">${count}</button>`,
      )
      .join('') +
    `</div><div class="simsec">${icon('clock', 20)}${translate('Vitesse du service', 'Service speed')}</div>` +
    `<div class="simseg">` +
    SPEEDS.map(
      (speed) =>
        `<button class="simsegbtn${page.speed === speed ? ' simon' : ''}" data-speed="${speed}">×${speed}</button>`,
    ).join('') +
    `</div><p class="simhint">${
      page.speed === 1
        ? translate(
            '×1 = temps réel : 1 minute de service = 1 vraie minute.',
            '×1 = real time: 1 service minute = 1 real minute.',
          )
        : translate(
            `×${page.speed} : 1 vraie minute = ${page.speed} minutes de service.`,
            `×${page.speed}: 1 real minute = ${page.speed} service minutes.`,
          )
    }</p>` +
    (page.online
      ? `<div class="simsec">${icon(page.openGame !== false ? 'live' : 'lock', 20)}${translate('Visibilité', 'Visibility')}</div>` +
        `<div class="simseg simseg2"><button class="simsegbtn${page.openGame !== false ? ' simon' : ''}" data-open="1">${translate('Partie ouverte', 'Open game')}</button>` +
        `<button class="simsegbtn${page.openGame === false ? ' simon' : ''}" data-open="0">${translate('Sur code', 'Code only')}</button></div>` +
        `<p class="simhint">${
          page.openGame !== false
            ? translate(
                "L'équipe la voit dans « Parties en cours » et la rejoint sans code.",
                'The team sees it in « Live games » and joins without a code.',
              )
            : translate(
                'Listée sans son code : il faut le code à 4 chiffres pour la rejoindre.',
                'Listed without its code: the 4-digit code is needed to join.',
              )
        }</p>`
      : '') +
    `<div class="simsec">${icon('plate', 20)}<span class="simgrow">${translate('Les rangs', 'The rangs')}</span>` +
    (page.waiterCount > 1
      ? `<button class="simsmallbtn simsec2" data-act="auto">${translate('Répartition auto', 'Auto split')}</button>`
      : '') +
    `</div><div class="simwaiters">${waiters.join('')}</div>` +
    `<p class="simhint">${
      page.waiterCount === 1
        ? translate(
            'Vous avez toute la salle et toutes les commandes.',
            'You own the whole room and every order.',
          )
        : translate(
            'Choisissez un serveur, puis touchez les tables pour changer son rang.',
            'Pick a waiter, then tap tables to move them into their rang.',
          )
    }</p><div class="simcard">${planSvg('setup')}</div></div>` +
    `<div class="simfoot"><button class="btn" data-act="generate">${icon('dice', 20)}${translate('Générer le service', 'Generate the service')}</button></div></div>`;
}

/**
 * `sheetHtml` - Function 📋
 *
 * @param { Array<object> } bookings - tonight's bookings
 * @returns { string } - the reservation sheet: time, name, covers, table, notes
 */
function sheetHtml(bookings) {
  return (
    `<div class="simsheet"><div class="simth">${translate('Heure', 'Time')}</div><div class="simth">${translate('Nom', 'Name')}</div>` +
    `<div class="simth simnum">${translate('Cv', 'Cv')}</div><div class="simth simnum">${translate('Table', 'Table')}</div>` +
    `<div class="simth">${translate('Notes', 'Notes')}</div>` +
    bookings
      .map(
        (booking) =>
          `<div>${clockText(booking.time)}</div><div><b>${escapeHtml(booking.last.toUpperCase())}</b> ${escapeHtml(booking.first)}</div>` +
          `<div class="simnum">${booking.covers}</div><div class="simnum">${booking.table}</div>` +
          `<div class="simnote">${bookingNotes(booking)
            .map((note) => escapeHtml(pick(note.text)))
            .join(' · ')}</div>`,
      )
      .join('') +
    `</div>`
  );
}

/**
 * `attentionHtml` - Function ⚠️
 *
 * @param { Array<object> } bookings - tonight's bookings
 * @returns { string } - the « points d'attention »: birthdays, allergies, the big table, hotel guests, the first arrivals
 */
function attentionHtml(bookings) {
  const points = [];
  /**
   * `who` - Function 🏷️
   *
   * @param { object } booking - a booking
   * @returns { string } - « T12 (Rossi) »
   */
  const who = (booking) => `${booking.table} (${booking.last})`;
  const birthdays = bookings.filter((booking) => booking.occasion === 'birthday');
  points.push([
    'cake',
    birthdays.length
      ? translate('Anniversaires : ', 'Birthdays: ') +
        birthdays.map(who).join(', ') +
        translate(' : bougie sur le dessert.', ': candle on the dessert.')
      : translate('Aucun anniversaire annoncé ce soir.', 'No birthday announced tonight.'),
  ]);
  bookings.forEach((booking) =>
    booking.allergies.forEach((allergy) => {
      const entry = allergyOf(allergy.id);
      points.push([
        'alert',
        `${who(booking)} : ` +
          translate(
            `${entry.intolerance ? 'intolérance' : 'allergie'} ${entry.noun}${booking.covers > 1 ? (allergy.who === 'friend' ? ' (un invité)' : ' (le client)') : ''}, prévenir la cuisine.`,
            `${entry.intolerance ? 'intolerance' : 'allergy'}: ${entry.en}${booking.covers > 1 ? (allergy.who === 'friend' ? ' (a guest)' : ' (the host)') : ''}, tell the kitchen.`,
          ),
      ]);
    }),
  );
  bookings
    .filter((booking) => booking.veg)
    .forEach((booking) =>
      points.push(['leaf', `${who(booking)} : ` + translate('végétarien.', 'vegetarian.')]),
    );
  bookings
    .filter((booking) => booking.covers >= 8)
    .forEach((booking) =>
      points.push([
        'users',
        translate(
          `Grande table ${booking.table} : ${booking.covers} couverts à ${clockText(booking.time)}.`,
          `Large party at ${booking.table}: ${booking.covers} covers at ${clockText(booking.time)}.`,
        ),
      ]),
    );
  const hotel = bookings.filter((booking) => booking.hotel);
  if (hotel.length)
    points.push([
      'bed',
      translate("Clients de l'hôtel : ", 'Hotel guests: ') +
        hotel.map(who).join(', ') +
        translate(' (proposer la chambre à l’addition).', ' (offer to charge the room).'),
    ]);
  const first = bookings[0];
  if (first)
    points.push([
      'clock',
      translate('Premières arrivées à ', 'First arrivals at ') +
        clockText(first.time) +
        ' : ' +
        bookings
          .filter((booking) => booking.time === first.time)
          .map(who)
          .join(', '),
    ]);
  return points
    .map(
      ([iconName, text]) => `<div class="simattn">${icon(iconName, 20)}<div>${escapeHtml(text)}</div></div>`,
    )
    .join('');
}

/**
 * `renderBrief` - Function 📋
 *
 * The briefing: the reservation sheet, the points d'attention, each waiter's booked tables, then Start.
 *
 * @returns { void }
 */
function renderBrief() {
  showTabBar(false);
  const bookings = page.bookings;
  const covers = bookings.reduce((sum, booking) => sum + booking.covers, 0);
  let rangsHtml = '';
  if (page.waiterCount > 1)
    rangsHtml =
      `<div class="simsec">${icon('plate', 20)}${translate('Les rangs', 'The rangs')}</div>` +
      Array.from({ length: page.waiterCount }, (unused, index) => {
        const tables = bookings
          .filter((booking) => (page.rangs[booking.table] || 0) === index)
          .map((booking) => booking.table);
        const name = page.online
          ? index === 0
            ? translate('Vous', 'You')
            : translate('Serveur ', 'Waiter ') + (index + 1)
          : page.names[index];
        return (
          `<div class="simattn"><span class="simdot" style="width:12px;height:12px;border-radius:6px;flex:none;margin-top:4px;background:${WAITER_COLOURS[index]}"></span>` +
          `<div><b>${escapeHtml(name)}</b> · ${tables.length ? tables.join(', ') : translate('aucune table réservée', 'no booked table')}</div></div>`
        );
      }).join('');
  appRoot().innerHTML =
    `<div id="simPage">${barHtml(translate('Briefing', 'Briefing'))}<div class="pad">` +
    `<div class="kick2">${translate('Ce soir', 'Tonight')}</div><h1 class="ptitle">${translate('Feuille de réservations', 'Reservation sheet')}</h1>` +
    `<div class="muted">${bookings.length} ${translate('réservations', 'bookings')} · ${covers} ${translate('couverts', 'covers')}</div>` +
    `<div class="mt">${sheetHtml(bookings)}</div>` +
    `<div class="simsec">${icon('alert', 20)}${translate("Points d'attention", 'Points to watch')}</div>${attentionHtml(bookings)}` +
    rangsHtml +
    `</div><div class="simfoot"><button class="btn sec" data-act="regen">${icon('shuffle', 20)}${translate('Autre soirée', 'Another night')}</button>` +
    `<button class="btn" data-act="start">${icon('play', 20)}${page.online ? translate('Créer la partie', 'Create the game') : translate('Commencer', 'Start')}</button></div></div>`;
}

/**
 * `renderLobby` - Function 🌐
 *
 * The online lobby: the code to share, who joined (and their rang), the sheet, and Start for the host.
 *
 * @returns { void }
 */
function renderLobby() {
  showTabBar(false);
  const isHost = game.me === game.host;
  const expected = Math.max(game.waiters.length, isHost ? page.waiterCount : game.waiters.length);
  appRoot().innerHTML =
    `<div id="simPage">${barHtml(translate('Partie en ligne', 'Online game'))}<div class="pad">` +
    `<div class="simcard" style="text-align:center"><div class="muted">${translate('Code de la partie', 'Game code')}</div>` +
    `<div class="simbigcode">${escapeHtml(game.code)}</div><div class="simhint">${translate(
      "Donnez ce code à l'équipe : Simulation de service › Rejoindre.",
      'Give this code to the team: Service simulation › Join.',
    )}</div></div>` +
    `<div class="simsec">${icon('users', 20)}${translate('Serveurs', 'Waiters')} (${game.waiters.length}/${expected})</div><div class="simplayers">` +
    game.waiters
      .slice()
      .sort((left, right) => left.rang - right.rang)
      .map(
        (waiter) =>
          `<div class="simscore"><span class="simdot" style="width:14px;height:14px;border-radius:7px;background:${WAITER_COLOURS[waiter.rang]}"></span>` +
          `<b>${escapeHtml(waiter.name)}${waiter.id === game.me ? translate(' (vous)', ' (you)') : ''}</b>` +
          `<span class="muted sm">${translate('Rang', 'Rang')} ${waiter.rang + 1}</span></div>`,
      )
      .join('') +
    `</div><div class="simsec">${icon('clock', 20)}${translate('Ce soir', 'Tonight')}</div>${sheetHtml(game.bookings)}</div>` +
    `<div class="simfoot">${
      isHost
        ? `<button class="btn" data-act="go">${icon('play', 20)}${translate('Lancer le service', 'Start the service')}</button>`
        : `<div class="simwait simgrow">${icon('clock', 20)}${translate("En attente de l'hôte…", 'Waiting for the host…')}</div>`
    }</div></div>`;
}

/**
 * `requestBanners` - Function 🙋
 *
 * @returns { string } - the « demander la permission » requests waiting for my answer
 */
function requestBanners() {
  if (!game || game.mode !== 'online') return '';
  return Object.keys(game.requests)
    .filter((tableId) => game.requests[tableId].t === game.me && !game.requests[tableId].r)
    .map(
      (tableId) =>
        `<div class="simbanner">${icon('hand', 20)}<div class="simgrow">${escapeHtml(
          translate(
            `${game.requests[tableId].n} demande la ${tableId}.`,
            `${game.requests[tableId].n} asks for ${tableId}.`,
          ),
        )}</div><button class="simsmallbtn simsec2" data-refuse="${tableId}">${translate('Refuser', 'Refuse')}</button>` +
        `<button class="simsmallbtn" data-accept="${tableId}">${translate('Accepter', 'Accept')}</button></div>`,
    )
    .join('');
}

/**
 * `tableRowHtml` - Function 📋
 *
 * @param { object } booking - a booking
 * @param { number } now - the service clock
 * @returns { string } - its row in the service list (table, guest, status, patience, the wait's little scene)
 */
function tableRowHtml(booking, now) {
  const entry = entryOf(booking.table);
  const status = statusOf(booking.table, now);
  const patience = patienceOf(booking.table, now);
  const mine = entry.o === game.me;
  const waiting = needsWaiter(booking.table, now);
  const locked = !isDone(booking.table) && now >= booking.time && now < entry.w;
  const lastStep = game.steps[booking.table][entry.c.length - 1];
  return (
    `<button class="simrow${mine ? ' simmine' : ''}${mine && waiting ? ' simnow' : ''}" data-table="${booking.table}">` +
    `<span class="simtag" style="border-color:${waiterColour(entry.o)}">${booking.table}</span>` +
    `<span><b>${escapeHtml(pick(guestTitle(booking)))} · ${booking.covers}</b>` +
    `<span class="simsub">${clockText(booking.time)} · ${escapeHtml(waiterName(entry.o))}${entry.p ? ' · ' + entry.p + ' pts' : ''}</span>` +
    (status !== 'waiting' && status !== 'gone'
      ? `<span class="simpat${patience < 35 ? ' simlow' : ''}"><i style="width:${patience}%"></i></span>`
      : '') +
    `</span><span class="simrowend">` +
    (locked && lastStep ? sceneHtml(sceneOf(lastStep.key), true) : '') +
    `<span><span class="simstatus simst-${status}">${statusLabel(status)}</span>` +
    (locked ? `<span class="simlock">${icon('clock', 13)}${minutesLeft(entry.w, now)}</span>` : '') +
    `</span></span></button>`
  );
}

/**
 * `minutesLeft` - Function ⏳
 *
 * @param { number } until - a service time (minutes after midnight)
 * @param { number } now - the service clock
 * @returns { string } - « 6 min » (service minutes, rounded up; « 1 min » at the very end)
 */
function minutesLeft(until, now) {
  return Math.max(1, Math.ceil(until - now)) + ' min';
}

/**
 * `liveHtml` - Function 🕰️
 *
 * @returns { string } - the live part of the service view: requests & plan (top), then the list of tables
 */
function liveHtml() {
  const now = serviceNow();
  return (
    `<div id="simLiveTop">${liveTopHtml(now)}</div><div class="simlist" id="simList">` +
    game.bookings.map((booking) => tableRowHtml(booking, now)).join('') +
    `</div>`
  );
}

/**
 * `liveTopHtml` - Function 🗺️
 *
 * @param { number } now - the service clock
 * @returns { string } - the requests, the « service over » banner and the plan with its hint
 */
function liveTopHtml(now) {
  const mineWaiting = game.bookings.filter(
    (booking) => entryOf(booking.table).o === game.me && needsWaiter(booking.table, now),
  );
  return (
    requestBanners() +
    (game.ended
      ? `<div class="simbanner">${icon('flag', 20)}<div class="simgrow">${translate('Service terminé.', 'Service over.')}</div></div>`
      : '') +
    `<div class="simcard">${planSvg('service')}<div class="simhint">${
      mineWaiting.length
        ? translate(
            `${mineWaiting.length} table(s) vous attendent.`,
            `${mineWaiting.length} table(s) waiting for you.`,
          )
        : translate('Touchez une table pour la servir.', 'Tap a table to serve it.')
    }</div></div>`
  );
}

/**
 * `renderService` - Function 🕰️
 *
 * The service: the clock, who I am (solo with several waiters), the plan and every table's status.
 *
 * @returns { void }
 */
function renderService() {
  showTabBar(false);
  const chooser =
    game.mode === 'solo' && game.waiters.length > 1
      ? `<div class="simme" role="tablist">` +
        game.waiters
          .map(
            (waiter) =>
              `<button class="simmechip${waiter.id === game.me ? ' simon' : ''}" data-me="${waiter.id}">` +
              `<span class="simdot" style="background:${WAITER_COLOURS[waiter.rang]}"></span>${escapeHtml(waiter.name)}</button>`,
          )
          .join('') +
        `</div>`
      : '';
  appRoot().innerHTML = `<div id="simPage">${barHtml(
    translate('Service', 'Service') + (game.code ? ' · ' + game.code : ''),
    clockHtml() +
      speedHtml() +
      `<button class="simiconbtn" data-act="end" aria-label="${translate('Terminer', 'End')}">${icon('flag', 22)}</button>`,
  )}<div class="pad">${chooser}<div id="simLive">${liveHtml()}</div></div></div>`;
  // 🔔 the ongoing notification, from the start of the service (asked once, in-page first)
  if (game.startMs && !game.ended) askNotify();
}

/**
 * `waitText` - Function ⏳
 *
 * @param { string } key - the key of the step just played
 * @returns { {fr: string, en: string} } - what happens while the next step is locked
 */
function waitText(key) {
  const base = key.split('|')[0];
  const texts = {
    seating: both('Vous les accompagnez à la table…', 'You walk them to the table…'),
    water: both("Vous apportez l'eau…", 'You bring the water…'),
    // 🍸 the waiter makes the drinks at Les Trois Forts, not the bar
    aperitif: both('Vous préparez les boissons…', 'You prepare the drinks…'),
    menu: both('Les clients regardent la carte…', 'The guests read the menu…'),
    wine: both(
      'Vous servez le vin, la cuisine prépare les plats…',
      'You pour the wine, the kitchen prepares the dishes…',
    ),
    mains: both('Les clients savourent leur plat…', 'The guests enjoy their main course…'),
    dessert: both(
      'Le dessert est servi, les clients se régalent…',
      'Dessert is served, the guests enjoy it…',
    ),
    coffee: both(
      'Vous préparez le café, les clients le dégustent…',
      'You make the coffee, the guests enjoy it…',
    ),
    bill: both('Les clients règlent…', 'The guests are paying…'),
  };
  return texts[base] || both('Un instant…', 'One moment…');
}

/**
 * `gradeLabel` - Function 🏷️
 *
 * @param { string } grade - best, ok, wrong or danger
 * @returns { string } - the feedback's title
 */
function gradeLabel(grade) {
  return {
    best: translate('Parfait', 'Perfect'),
    ok: translate('Correct', 'Okay'),
    wrong: translate('Raté', 'Missed'),
    danger: translate('Danger', 'Danger'),
  }[grade];
}

/**
 * `chatHtml` - Function 💬
 *
 * Rebuilds the conversation from the table's state (answers, interruptions, drinks, questions), so it's the same
 * on every phone of an online game.
 *
 * @param { string } tableId - a table id
 * @returns { string } - the chat bubbles so far (the current step's are drawn by actionHtml)
 */
function chatHtml(tableId) {
  const entry = entryOf(tableId);
  const steps = game.steps[tableId];
  const asked = questionsAsked(entry);
  let html = '';
  for (let index = 0; index < entry.c.length; index++) {
    const step = steps[index];
    const picked = step.choices[Number(entry.c[index])];
    if (!picked) continue;
    html += questionsHtml(tableId, asked, index);
    if (step.note) html += `<div class="simsys">${escapeHtml(pick(step.note))}</div>`;
    if (step.guest) html += guestBubble(tableId, 0, step.guest);
    html += interruptsHtml(tableId, index);
    html +=
      `<div class="simsay simmine2">${escapeHtml(pick(picked.text))}</div>` +
      feedbackHtml(picked.grade, picked.feedback);
    html += drinksHtml(tableId, index);
  }
  return html + questionsHtml(tableId, asked, entry.c.length);
}

/**
 * `guestBubble` - Function 💬
 *
 * @param { string } tableId - a table id
 * @param { number } guestIndex - who speaks (0 = the booker)
 * @param { {fr: string, en: string} } text - what they say
 * @returns { string } - a guest's chat bubble with their name
 */
function guestBubble(tableId, guestIndex, text) {
  const guest = game.guests[tableId][guestIndex] || game.guests[tableId][0];
  return (
    `<div class="simsay simguest" data-from="${guest.index}"><small>${avatarSvg(guest.kind, 13)}${escapeHtml(pick(guest.name))}</small>` +
    `${escapeHtml(pick(text))}</div>`
  );
}

/**
 * `feedbackHtml` - Function 🏷️
 *
 * @param { string } grade - best, ok, wrong or danger
 * @param { {fr: string, en: string} } feedback - the explanation
 * @param { string } [extra] - something to add after it (points)
 * @returns { string } - the feedback bubble under the waiter's answer
 */
function feedbackHtml(grade, feedback, extra) {
  return (
    `<div class="simfb simg-${grade}"><b>${icon(grade === 'best' || grade === 'ok' ? 'check' : 'alert', 13)}${gradeLabel(grade)}</b>` +
    `${escapeHtml(pick(feedback))}${extra ? ' ' + escapeHtml(extra) : ''}</div>`
  );
}

/**
 * `interruptsHtml` - Function 🙋
 *
 * @param { string } tableId - a table id
 * @param { number } stepIndex - a step
 * @returns { string } - the interruptions already answered at that step (the guest's question, the answer, feedback)
 */
function interruptsHtml(tableId, stepIndex) {
  const entry = entryOf(tableId);
  return (game.steps[tableId].interrupts || [])
    .slice(0, (entry.i || '').length)
    .map((interrupt, index) => ({ interrupt, picked: interrupt.choices[Number(entry.i[index])] }))
    .filter((item) => item.interrupt.at === stepIndex && item.picked)
    .map(
      (item) =>
        `<div class="simsys">${icon('hand', 14)}${translate('Un invité vous interrompt', 'A guest interrupts you')}</div>` +
        guestBubble(tableId, item.interrupt.guest, item.interrupt.line) +
        `<div class="simsay simmine2">${escapeHtml(pick(item.picked.text))}</div>` +
        feedbackHtml(item.picked.grade, item.picked.feedback),
    )
    .join('');
}

/**
 * `drinksHtml` - Function 🍸
 *
 * @param { string } tableId - a table id
 * @param { number } stepIndex - a step
 * @returns { string } - the drinks already served after that step (the order, the score and the right answer)
 */
function drinksHtml(tableId, stepIndex) {
  const entry = entryOf(tableId);
  return (game.steps[tableId].drinks || [])
    .slice(0, (entry.d || '').length)
    .map((drink, index) => ({ drink, digit: Number(entry.d[index]) }))
    .filter((item) => item.drink.at === stepIndex)
    .map(
      (item) =>
        (item.drink.task.order ? guestBubble(tableId, 0, item.drink.task.order) : '') +
        `<div class="simsay simmine2">${icon('glass', 14)} ${escapeHtml(pick(item.drink.task.title))}</div>` +
        feedbackHtml(gradeOfDigit(item.digit), answerText(item.drink.task), item.digit + '/3'),
    )
    .join('');
}

/**
 * `questionsHtml` - Function ❓
 *
 * @param { string } tableId - a table id
 * @param { Array<object> } asked - the questions asked (see questionsAsked)
 * @param { number } stepIndex - the step they were asked at
 * @returns { string } - each question (waiter), the guest's reply (in their name) and its small score
 */
function questionsHtml(tableId, asked, stepIndex) {
  const booking = bookingOf(tableId);
  const steps = game.steps[tableId];
  const orderIndex = steps.findIndex((step) => step.key.split('|')[0] === 'order');
  return asked
    .map((question, index) => ({ question, before: asked.slice(0, index) }))
    .filter((item) => item.question.at === stepIndex)
    .map((item) => {
      const guest = game.guests[tableId][item.question.guest] || game.guests[tableId][0];
      const reply = askQuestion({
        booking,
        meta: steps.meta,
        guest,
        id: item.question.id,
        nextKey: steps[stepIndex] ? steps[stepIndex].key : '',
        nextIndex: stepIndex,
        orderIndex,
        asked: item.before,
      });
      return (
        `<div class="simsay simmine2">${escapeHtml(pick(guest.name))}, ${escapeHtml(lowerFirst(pick(questionText(item.question.id))))}</div>` +
        guestBubble(tableId, guest.index, reply.line) +
        `<div class="simfb simg-${reply.grade === 'best' ? 'best' : 'ok'}">${icon('question', 13)} ${escapeHtml(pick(reply.feedback))}` +
        `${reply.points ? ' +' + reply.points + ' pts' : ''}</div>`
      );
    })
    .join('');
}

/**
 * `lowerFirst` - Function 🔡
 *
 * @param { string } text - a question
 * @returns { string } - the same with a small first letter (« Madame Rossi, avez-vous… »)
 */
function lowerFirst(text) {
  return text ? text[0].toLowerCase() + text.slice(1) : '';
}

/**
 * `tableSignature` - Function 🔏
 *
 * @param { string } tableId - a table id
 * @returns { string } - what changes the table view (answers, interruptions, drinks, questions, lock, owner, arrival,
 *   end): redraw only when it moves
 */
function tableSignature(tableId) {
  const now = serviceNow();
  const entry = entryOf(tableId);
  return [
    entry.c,
    entry.i,
    entry.d,
    entry.q,
    entry.o,
    entry.x,
    needsWaiter(tableId, now),
    now >= bookingOf(tableId).time,
    game.ended,
    !!game.requests[tableId],
  ].join('|');
}

/**
 * `actionHtml` - Function 🎯
 *
 * @param { string } tableId - a table id
 * @returns { string } - the bottom of the chat: a drink to make, an interruption, the choices, a wait (with its
 *   little 3D scene & countdown), or « this table is someone else's »
 */
function actionHtml(tableId) {
  const now = serviceNow();
  const booking = bookingOf(tableId);
  const entry = entryOf(tableId);
  const steps = game.steps[tableId];
  const step = steps[entry.c.length];
  const drink = pendingDrink(tableId);
  let html = '';
  if (game.ended)
    html += `<div class="simbanner">${icon('flag', 20)}<div class="simgrow">${translate('Service terminé.', 'Service over.')}</div><button class="simsmallbtn" data-go="back">${translate('Voir les scores', 'See the scores')}</button></div>`;
  if (entry.x)
    return (
      html +
      `<div class="simsys">${icon('door', 16)}${translate('Personne ne les a accueillis : les clients sont partis.', 'Nobody welcomed them: the guests left.')}</div>`
    );
  if (!step && !drink)
    return (
      html +
      `<div class="simsys">${icon('check', 16)}${translate('Table terminée', 'Table done')} · ${entry.p} pts</div>`
    );
  if (now < booking.time)
    return (
      html +
      `<div class="simwait">${icon('clock', 20)}${translate('Arrivée prévue à ', 'Expected at ')}${clockText(booking.time)}</div>`
    );
  if (now < entry.w)
    return (
      html +
      `<div class="simwait simwaitscene">${sceneHtml(sceneOf(steps[entry.c.length - 1].key), false)}` +
      `<div class="simgrow">${escapeHtml(pick(waitText(steps[entry.c.length - 1].key)))}` +
      `<br><b id="simCountdown">${translate('Prêt dans ', 'Ready in ')}${minutesLeft(entry.w, now)}</b>` +
      `<span class="simsub"> · ${clockText(entry.w)}</span></div></div>`
    );
  if (drink) {
    // 🍸 the drink ordered at the last step: the waiter makes it now
    html += drink.task.order ? guestBubble(tableId, 0, drink.task.order) : '';
    if (entry.o !== game.me) return html + otherRangHtml(tableId);
    return (
      html +
      drinkHtml(drink.task, game.picks[tableId + '|' + (entry.d || '').length] || {}, icon('glass', 18))
    );
  }
  html += step.note ? `<div class="simsys">${escapeHtml(pick(step.note))}</div>` : '';
  html += step.guest ? guestBubble(tableId, 0, step.guest) : '';
  html += interruptsHtml(tableId, entry.c.length);
  if (entry.o !== game.me) return html + otherRangHtml(tableId);
  const interrupt = pendingInterrupt(tableId);
  if (interrupt)
    return (
      html +
      `<div class="simsys">${icon('hand', 14)}${translate('Un invité vous interrompt', 'A guest interrupts you')}</div>` +
      guestBubble(tableId, interrupt.guest, interrupt.line) +
      `<div class="simchoices">` +
      interrupt.choices
        .map(
          (option, index) =>
            `<button class="simopt" data-interrupt="${index}"><span class="simletter">${'ABCD'[index]}</span><span>${escapeHtml(pick(option.text))}</span></button>`,
        )
        .join('') +
      `</div>`
    );
  return (
    html +
    `<div class="simchoices">` +
    step.choices
      .map(
        (option, index) =>
          `<button class="simopt" data-choice="${index}"><span class="simletter">${'ABCD'[index]}</span><span>${escapeHtml(pick(option.text))}</span></button>`,
      )
      .join('') +
    `</div>`
  );
}

/**
 * `otherRangHtml` - Function 🔁
 *
 * @param { string } tableId - a table of another waiter
 * @returns { string } - « Rang de Léa » with « Jouer Léa » (solo) or « Demander » (online) and « Prendre la table »
 */
function otherRangHtml(tableId) {
  const entry = entryOf(tableId);
  const asked = game.requests[tableId] && game.requests[tableId].f === game.me;
  return (
    `<div class="simbanner">${icon('swap', 20)}<div class="simgrow">${escapeHtml(
      translate(`Rang de ${waiterName(entry.o)}.`, `${waiterName(entry.o)}'s rang.`),
    )}</div></div><div class="simactions">` +
    (game.mode === 'solo'
      ? `<button class="btn sec" data-act="switch">${icon('user', 18)}${escapeHtml(translate('Jouer ', 'Play as ') + waiterName(entry.o))}</button>`
      : `<button class="btn sec" data-act="ask"${asked ? ' disabled' : ''}>${icon('hand', 18)}${asked ? translate('Demandé', 'Asked') : translate('Demander', 'Ask')}</button>`) +
    `<button class="btn" data-act="steal">${icon('swap', 18)}${translate('Prendre la table', 'Take the table')}</button></div>`
  );
}

/**
 * `renderTable` - Function 💬
 *
 * The table dialogue: the call header (the guests, who speaks, mute, « réécouter », « Questions »), the notes,
 * patience & points, the chat so far and what to do next. The guests' new lines are spoken (see speakCurrent).
 *
 * @returns { void }
 */
function renderTable() {
  showTabBar(false);
  const tableId = page.tableId;
  const booking = bookingOf(tableId);
  const entry = entryOf(tableId);
  const patience = patienceOf(tableId, serviceNow());
  page.tableShown = tableSignature(tableId);
  const pills =
    `<span class="simpill">${icon('users', 14)}${booking.covers} ${translate('couv.', 'covers')}</span>` +
    `<span class="simpill">${icon('clock', 14)}${clockText(booking.time)}</span>` +
    bookingNotes(booking)
      .map(
        (note) =>
          `<span class="simpill${note.warn ? ' simwarn' : ''}">${icon(note.icon, 14)}${escapeHtml(pick(note.text))}</span>`,
      )
      .join('') +
    `<span class="simpill">${icon('star', 14)}<span id="simPts">${entry.p}</span> pts</span>`;
  // 👍 the call bar is fixed at the bottom (thumb reach); the content gets room for it; ⬆️ back to the top
  appRoot().innerHTML =
    `<div id="simPage" class="simtablepage">${barHtml(`${tableId} · ${pick(guestTitle(booking))}`, clockHtml())}<div class="pad">` +
    `<div class="siminfo">${pills}</div>` +
    `<div class="simpat${patience < 35 ? ' simlow' : ''}" id="simPatience" title="${translate('Patience', 'Patience')}"><i style="width:${patience}%"></i></div>` +
    `<div class="simchat" id="simChat">${chatHtml(tableId)}${actionHtml(tableId)}</div></div>` +
    callHtml(tableId) +
    `<button class="simtopfab" id="simTop" data-act="top" aria-label="${translate('Revenir en haut', 'Back to top')}">${icon('up', 22)}</button></div>`;
  speakCurrent(tableId, false);
  updateTopFab();
}

/**
 * `prefersReducedMotion` - Function 🐢
 *
 * @returns { boolean } - true when the phone asks for less motion
 */
function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * `updateTopFab` - Function ⬆️
 *
 * @returns { void } - shows the « back to top » button once the table dialogue is scrolled far down (600 px, or
 *   1.5 screens on a small one), hides it near the top (it fades in & out)
 */
function updateTopFab() {
  const button = document.getElementById('simTop');
  if (!button) return;
  const scrolled = window.scrollY || window.pageYOffset || 0;
  const threshold = Math.min(600, (window.innerHeight || 800) * 1.5);
  button.classList.toggle('simshow', page.view === 'table' && scrolled > threshold);
}

/**
 * `scrollToTop` - Function ⬆️
 *
 * @returns { void } - smooth scroll to the top of the table dialogue (instant with reduced motion)
 */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/**
 * `callHtml` - Function 📞
 *
 * @param { string } tableId - a table id
 * @returns { string } - the call bar, fixed at the bottom of the table view: every guest's avatar (the speaker gets
 *   a pulsing ring), mute/unmute, « réécouter » and « Questions »
 */
function callHtml(tableId) {
  const muted = isMuted();
  const canAsk =
    entryOf(tableId).o === game.me &&
    serviceNow() >= bookingOf(tableId).time &&
    !isDone(tableId) &&
    !game.ended;
  return (
    `<div class="simcall simcallbar"><div class="simavatars">` +
    game.guests[tableId]
      .map(
        (guest) =>
          `<span class="simguestav simk-${guest.kind}" data-guest="${guest.index}" title="${escapeHtml(pick(guest.name))}">` +
          `${avatarSvg(guest.kind, 22)}<small>${escapeHtml(pick(guest.name).split(' (')[0])}</small></span>`,
      )
      .join('') +
    `</div><div class="simcallbtns">` +
    (voiceAvailable()
      ? `<button class="simiconbtn${muted ? ' simoff' : ''}" data-act="mute" aria-label="${muted ? translate('Activer le son', 'Unmute') : translate('Couper le son', 'Mute')}">${icon(muted ? 'mute' : 'speaker', 20)}</button>` +
        `<button class="simiconbtn" data-act="replay" aria-label="${translate('Réécouter', 'Listen again')}">${icon('replay', 20)}</button>`
      : '') +
    (canAsk
      ? `<button class="simsmallbtn simsec2" data-act="questions">${icon('question', 16)}${translate('Questions', 'Questions')}</button>`
      : '') +
    `</div></div>`
  );
}

/**
 * `renderEnd` - Function 🏁
 *
 * The end of the service: my points, each waiter's score, each table's score, and the XP earned.
 *
 * @returns { void }
 */
function renderEnd() {
  showTabBar(false);
  stopListening();
  clearInterval(page.timer);
  const totals = waiterTotals();
  const mine = (totals.find((total) => total.id === game.me) || { points: 0 }).points;
  const allPoints = totals.reduce((sum, total) => sum + total.points, 0);
  // 🎓 the end of a service pays XP once (daily anti-farm through LTFrecord)
  if (!game.endAwarded) {
    game.endAwarded = true;
    award('end|' + game.mode, Math.min(50, Math.max(0, Math.round(mine / 20))));
    game.record = game.mode === 'solo' && saveBest(allPoints);
  }
  const maxPoints = game.bookings.reduce(
    (sum, booking) =>
      sum +
      game.steps[booking.table].length * 13 +
      20 +
      (game.steps[booking.table].interrupts || []).length * INTERRUPT_POINTS.best +
      (game.steps[booking.table].drinks || []).length * DRINK_POINTS.best,
    0,
  );
  const ratio = maxPoints ? allPoints / maxPoints : 0;
  appRoot().innerHTML =
    `<div id="simPage">${barHtml(translate('Fin du service', 'End of service'))}<div class="pad">` +
    `<div class="simresult"><div class="simbigic">${icon(ratio >= 0.6 ? 'star' : 'flag', 38)}</div>` +
    `<h1 class="ptitle">${game.mode === 'solo' ? allPoints : mine} pts</h1><div class="muted">${
      ratio >= 0.75
        ? translate('Un service digne d’un cinq étoiles !', 'A five-star service!')
        : ratio >= 0.5
          ? translate('Beau service, encore un peu de rythme.', 'Nice service, a bit more pace.')
          : translate('On recommence : le prochain sera meilleur.', 'Again: the next one will be better.')
    }</div>` +
    (game.record ? `<div class="simxp">${translate('Nouveau record !', 'New best!')}</div> ` : '') +
    (game.earned > 0 ? `<div class="simxp">+${game.earned} XP</div>` : '') +
    `</div><div class="simsec">${icon('users', 20)}${translate('Par serveur', 'Per waiter')}</div>` +
    totals
      .map(
        (total, index) =>
          `<div class="simscore"><span class="simrank">${index + 1}</span><b>${escapeHtml(total.name)}${total.id === game.me && game.mode === 'online' ? translate(' (vous)', ' (you)') : ''}</b>` +
          `<span class="simpts">${total.points} pts</span></div>`,
      )
      .join('') +
    `<div class="simsec">${icon('plate', 20)}${translate('Par table', 'Per table')}</div>` +
    game.bookings
      .map((booking) => {
        const entry = entryOf(booking.table);
        const state = entry.x
          ? translate('partis sans accueil', 'left unwelcomed')
          : isDone(booking.table)
            ? translate('servis', 'served') +
              ' · ' +
              translate('patience ', 'patience ') +
              Math.round(entry.pa) +
              ' %'
            : translate('pas terminée', 'not finished');
        return (
          `<div class="simscore"><span class="simrank">${booking.table}</span><span><b>${escapeHtml(pick(guestTitle(booking)))} · ${booking.covers}</b>` +
          `<span class="muted sm">${escapeHtml(waiterName(entry.o))} · ${escapeHtml(state)}</span></span><span class="simpts">${entry.p} pts</span></div>`
        );
      })
      .join('') +
    `</div><div class="simfoot"><button class="btn" data-go="back">${translate('Terminer', 'Done')}</button></div></div>`;
}

// ===== THE LOOP & NAVIGATION 🔁 ===== //

// the views of the page, by name 🗺️
const VIEWS = {
  page: renderPage,
  setup: renderSetup,
  brief: renderBrief,
  lobby: renderLobby,
  service: renderService,
  table: renderTable,
  end: renderEnd,
};

/**
 * `render` - Function 🖼️
 *
 * @param { string } view - a view of the page
 * @returns { void } - draws it (and runs the clock while a game is on screen); leaving the table stops the voices
 */
function render(view) {
  page.run++;
  clearInterval(page.timer);
  if (view !== 'table') stopSpeaking();
  closeDrawer();
  page.view = VIEWS[view] ? view : 'page';
  VIEWS[page.view]();
  if (['service', 'table', 'lobby'].includes(page.view)) page.timer = setInterval(tick, 1000);
  if (page.view === 'table') scrollToBottom();
  else window.scrollTo(0, 0);
}

/**
 * `scrollToBottom` - Function ⬇️
 *
 * @returns { void } - shows the latest message of the table dialogue
 */
function scrollToBottom() {
  const height = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
  window.scrollTo(0, height);
}

// the markup each live element was last drawn with (so an unchanged row isn't replaced) 🧩
const shownHtml = new WeakMap();

/**
 * `refreshLive` - Function 🔄
 *
 * Updates what moves without redrawing the whole page: the clock, the plan, each changed row of the list (so the
 * little scenes keep turning), the table dialogue and its countdown.
 *
 * @returns { void }
 */
function refreshLive() {
  if (!page.isOpen || !game) return;
  const now = serviceNow();
  const clock = document.querySelector('#simClock span');
  if (clock) clock.textContent = clockText(now);
  if (page.view === 'service') {
    const top = document.getElementById('simLiveTop');
    const list = document.getElementById('simList');
    if (!top || !list) {
      const live = document.getElementById('simLive');
      if (live) live.innerHTML = liveHtml();
      return;
    }
    const topHtml = liveTopHtml(now);
    if (shownHtml.get(top) !== topHtml) {
      top.innerHTML = topHtml;
      shownHtml.set(top, topHtml);
    }
    // 🧩 only the rows that changed are replaced
    game.bookings.forEach((booking) => {
      const rowHtml = tableRowHtml(booking, now);
      const row = list.querySelector(`[data-table="${booking.table}"]`);
      if (row && shownHtml.get(row) === rowHtml) return;
      const holder = document.createElement('div');
      holder.innerHTML = rowHtml;
      const fresh = holder.firstElementChild;
      shownHtml.set(fresh, rowHtml);
      if (row) row.replaceWith(fresh);
      else list.appendChild(fresh);
    });
  } else if (page.view === 'table') {
    if (tableSignature(page.tableId) !== page.tableShown) {
      renderTable();
      scrollToBottom();
      return;
    }
    const patience = patienceOf(page.tableId, now);
    const bar = document.getElementById('simPatience');
    if (bar) {
      bar.classList.toggle('simlow', patience < 35);
      bar.firstElementChild.style.width = patience + '%';
    }
    const countdown = document.getElementById('simCountdown');
    if (countdown)
      countdown.textContent =
        translate('Prêt dans ', 'Ready in ') + minutesLeft(entryOf(page.tableId).w, now);
  } else if (page.view === 'lobby') renderLobby();
}

/**
 * `announceArrivals` - Function 🔔
 *
 * @param { number } now - the service clock
 * @returns { void } - a toast & a light vibration when guests arrive (online: only for my own tables)
 */
function announceArrivals(now) {
  const arrived = game.bookings.filter((booking) => now >= booking.time && !game.seen[booking.table]);
  if (!arrived.length) return;
  arrived.forEach((booking) => (game.seen[booking.table] = true));
  page.soloDirty = true;
  const mine = arrived.filter((booking) => game.mode === 'solo' || entryOf(booking.table).o === game.me);
  if (!mine.length) return;
  if (navigator.vibrate) navigator.vibrate(30);
  showToast(
    'door',
    mine.length === 1
      ? translate(
          `Arrivée : ${mine[0].table} · ${pick(guestTitle(mine[0]))}, ${mine[0].covers} couv.`,
          `Arrival: ${mine[0].table} · ${pick(guestTitle(mine[0]))}, ${mine[0].covers} covers`,
        )
      : translate(`${mine.length} tables arrivent : `, `${mine.length} tables arriving: `) +
          mine.map((booking) => booking.table).join(', '),
  );
}

/**
 * `tick` - Function 🕰️
 *
 * Every real second while a game is on screen: arrivals, guests leaving, the end of the service, the redraw, the
 * ongoing notification and (host of an online game) the public summary once per service minute.
 *
 * @returns { void }
 */
function tick() {
  if (!page.isOpen || !game) return clearInterval(page.timer);
  if (!game.startMs) return;
  const now = serviceNow();
  announceArrivals(now);
  checkLeaves(now);
  if (!game.ended && gameOver(now)) game.ended = true;
  if (game.ended && page.view === 'service') return finishGame();
  refreshLive();
  updateNotification(false);
  publishSummary(now);
  saveSolo(false);
}

/**
 * `finishGame` - Function 🏁
 *
 * @returns { void } - shows the end screen in place of the service (Back then leaves the game); the host of an
 *   online game marks it ended (`en`) so it leaves « Parties en cours »
 */
function finishGame() {
  if (!game) return;
  game.ended = true;
  closeNotification();
  // 💾 a finished game can't be resumed: the solo save & my online game's code go
  if (game.mode === 'solo') clearSolo();
  else if (game.listId) forgetGame(game.listId);
  if (game.mode === 'online' && game.me === game.host && !game.endWritten) {
    game.endWritten = true;
    writeRemote({ en: true });
    updateListEntry({ en: true, d: doneCount(), k: Math.floor(serviceNow()) });
  }
  history.replaceState({ ltfSim: 'end' }, '');
  render('end');
}

/**
 * `stopGame` - Function ⏹️
 *
 * @returns { void } - stops the clock, the voices and the notification, stops listening online and forgets the game
 */
function stopGame() {
  clearInterval(page.timer);
  stopListening();
  stopSpeaking();
  closeNotification();
  game = null;
  // 🛎️ the live card & the notification of a saved game come back (sim-live.js)
  liveChanged();
}

/**
 * `afterGameView` - Function 🧭
 *
 * @returns { string } - where Back lands after a game: the setup (solo, host) or the chapter page (a joiner)
 */
function afterGameView() {
  return page.joinedAsGuest ? 'page' : 'setup';
}

/**
 * `openSetup` - Function ⚙️
 *
 * @param { boolean } online - true for an online game (the host's setup)
 * @returns { Promise<void> }
 */
async function openSetup(online) {
  page.online = online;
  page.joinedAsGuest = false;
  // 📦 the floor plan must be there before the rangs are split
  if (!page.dataReady) page.dataReady = await ensureData();
  if (!Object.keys(page.rangs).length) page.rangs = autoRangs(page.waiterCount);
  history.pushState({ ltfSim: 'setup' }, '');
  render('setup');
}

/**
 * `startSolo` - Function ▶️
 *
 * @returns { void } - starts a solo game with the setup's waiters, rangs & bookings (the clock starts now)
 */
function startSolo() {
  const waiters = [];
  for (let index = 0; index < page.waiterCount; index++)
    waiters.push({ id: 'w' + index, name: page.names[index] || 'Serveur ' + (index + 1), rang: index });
  startGame({
    mode: 'solo',
    me: 'w0',
    host: 'w0',
    waiters,
    rangs: page.rangs,
    bookings: page.bookings,
    tables: {},
    speed: cleanSpeed(page.speed),
  });
  game.bookings.forEach(
    (booking) =>
      (game.tables[booking.table] = newEntry(booking, ownerForRang(page.rangs[booking.table] || 0))),
  );
  game.startMs = Date.now();
  saveSolo(true);
  history.replaceState({ ltfSim: 'service' }, '');
  render('service');
  liveChanged();
}

/**
 * `askJoin` - Async Function 🔑
 *
 * @returns { Promise<void> } - asks for the 4-digit code (in-page dialog), then joins
 */
async function askJoin() {
  const answer = await showDialog({
    icon: 'key',
    title: translate('Rejoindre une partie', 'Join a game'),
    text: translate("Entrez le code à 4 chiffres de l'hôte.", "Enter the host's 4-digit code."),
    input: true,
    buttons: [
      { label: translate('Annuler', 'Cancel'), value: false },
      { label: translate('Rejoindre', 'Join'), value: true },
    ],
  });
  if (answer && answer.value && /^[0-9]{4}$/.test(answer.code)) joinOnlineGame(answer.code);
}

/**
 * `askEnd` - Async Function 🏁
 *
 * @returns { Promise<void> } - « Terminer le service ? » then the end screen
 */
async function askEnd() {
  const yes = await showDialog({
    icon: 'flag',
    title: translate('Terminer le service ?', 'End the service?'),
    text: translate(
      'Les tables en cours restent à leur score actuel.',
      'Tables in progress keep their current score.',
    ),
    buttons: [
      { label: translate('Continuer', 'Keep going'), value: false },
      { label: translate('Terminer', 'End'), value: true, kind: 'danger' },
    ],
  });
  if (yes && game && page.view === 'service') finishGame();
}

/**
 * `askQuit` - Async Function 🚪
 *
 * @returns { Promise<void> } - « Quitter la partie ? » (Back during a game); yes goes back one more step
 */
async function askQuit() {
  const yes = await showDialog({
    icon: 'door',
    title: translate('Quitter la partie ?', 'Leave the game?'),
    text:
      game && game.mode === 'online'
        ? translate('Vous pourrez revenir avec le même code.', 'You can come back with the same code.')
        : translate('Le service en cours sera perdu.', 'The current service will be lost.'),
    buttons: [
      { label: translate('Rester', 'Stay'), value: false },
      { label: translate('Quitter', 'Leave'), value: true, kind: 'danger' },
    ],
  });
  if (!yes || !page.isOpen) return;
  page.quitting = true;
  history.back();
}

/**
 * `openTable` - Function 💬
 *
 * @param { string } tableId - a table with a booking tonight
 * @returns { void } - opens its dialogue (Back returns to the service); the guests' current lines are spoken
 */
function openTable(tableId) {
  if (!bookingOf(tableId)) return;
  page.tableId = tableId;
  page.spokenKey = '';
  history.pushState({ ltfSim: 'table' }, '');
  render('table');
}

// ===== VOICES 📞 ===== //

/**
 * `currentLines` - Function 🗣️
 *
 * @param { string } tableId - a table id
 * @param { boolean } again - true for « réécouter » (the step's line even after an interruption was answered)
 * @returns { Array<{guest: number, text: object}> } - what the guests say now (never the waiter's lines)
 */
function currentLines(tableId, again) {
  const now = serviceNow();
  const entry = entryOf(tableId);
  const steps = game.steps[tableId];
  const step = steps[entry.c.length];
  const lines = [];
  const drink = pendingDrink(tableId);
  const live = !entry.x && now >= bookingOf(tableId).time && now >= entry.w;
  if (live && drink && drink.task.order) lines.push({ guest: 0, text: drink.task.order });
  else if (live && !drink && step) {
    const answeredHere = (steps.interrupts || [])
      .slice(0, (entry.i || '').length)
      .some((interrupt) => interrupt.at === entry.c.length);
    if (step.guest && (again || !answeredHere)) lines.push({ guest: 0, text: step.guest });
    const interrupt = pendingInterrupt(tableId);
    if (interrupt) lines.push({ guest: interrupt.guest, text: interrupt.line });
  }
  // 🔁 « réécouter » with nothing new: the last line a guest said in the steps so far
  if (!lines.length && again)
    for (let index = Math.min(entry.c.length, steps.length) - 1; index >= 0; index--)
      if (steps[index].guest) {
        lines.push({ guest: 0, text: steps[index].guest });
        break;
      }
  return lines;
}

/**
 * `speakCurrent` - Function 📞
 *
 * Speaks the table's new guest lines once (a redraw never repeats them), or again for « réécouter ».
 *
 * @param { string } tableId - a table id
 * @param { boolean } again - true to say them again
 * @returns { void }
 */
function speakCurrent(tableId, again) {
  const entry = entryOf(tableId);
  const key = [tableId, entry.c, entry.i, entry.d].join('|');
  if (!again && key === page.spokenKey) return;
  page.spokenKey = key;
  speakFor(tableId, currentLines(tableId, again));
}

/**
 * `speakFor` - Function 🗣️
 *
 * @param { string } tableId - a table id
 * @param { Array<{guest: number, text: object}> } lines - what each guest says
 * @returns { void } - queues them in each guest's voice, the speaker's avatar ringing while they talk
 */
function speakFor(tableId, lines) {
  if (!lines.length) return;
  const guests = game.guests[tableId];
  /**
   * `ring` - Function 💫
   *
   * @param { object } line - the line said
   * @param { boolean } on - true while the guest talks
   * @returns { void } - toggles the pulsing ring on their avatar
   */
  const ring = (line, on) => {
    const avatar = document.querySelector(`.simguestav[data-guest="${line.guest}"]`);
    if (avatar) avatar.classList.toggle('simtalk', on);
  };
  speakLines(
    lines.map((line) => {
      const guest = guests[line.guest] || guests[0];
      return { guest: guest.index, kind: guest.kind, slot: guest.slot, text: pick(line.text) };
    }),
    {
      lang: isEnglish() ? 'en' : 'fr',
      replace: true,
      onStart: (line) => ring(line, true),
      onDone: (line) => ring(line, false),
    },
  );
}

// ===== QUESTIONS SHEET ❓ ===== //

/**
 * `openQuestions` - Function ❓
 *
 * @returns { void } - opens the « Questions » sheet of the table on screen: choose the guest, then the question
 */
function openQuestions() {
  if (!game || page.view !== 'table') return;
  if (!game.guests[page.tableId][page.questionGuest || 0]) page.questionGuest = 0;
  closeDrawer();
  const holder = document.getElementById('simPage');
  if (!holder) return;
  const sheet = document.createElement('div');
  sheet.className = 'simdrawer';
  sheet.id = 'simDrawer';
  sheet.dataset.act = 'closedrawer';
  sheet.innerHTML = questionsSheetHtml();
  holder.appendChild(sheet);
}

/**
 * `questionsSheetHtml` - Function ❓
 *
 * @returns { string } - the sheet: one chip per guest (the booker by name), then the questions for now first
 */
function questionsSheetHtml() {
  const tableId = page.tableId;
  const context = questionContext(tableId);
  const chosen = page.questionGuest || 0;
  return (
    `<div class="simdrawerbox" role="dialog" aria-modal="true"><div class="simdrawerhead">${icon('question', 22)}` +
    `<b class="simgrow">${translate('Poser une question', 'Ask a question')}</b>` +
    `<button class="simiconbtn" data-act="closedrawer" aria-label="${translate('Fermer', 'Close')}">${icon('close', 20)}</button></div>` +
    `<div class="simdrinklabel">${translate('À qui ?', 'To whom?')}</div><div class="simchips">` +
    game.guests[tableId]
      .map(
        (guest) =>
          `<button class="simchip${guest.index === chosen ? ' simon' : ''}" data-qguest="${guest.index}">${avatarSvg(guest.kind, 14)}${escapeHtml(pick(guest.name))}</button>`,
      )
      .join('') +
    `</div><div class="simdrinklabel">${translate('Quelle question ?', 'Which question?')}</div><div class="simchoices">` +
    questionsFor(context.nextKey)
      .map(
        (question) =>
          `<button class="simopt" data-ask="${question.id}">${icon(question.now ? 'clock' : 'question', 16)}` +
          `<span>${escapeHtml(pick(question.text))}</span></button>`,
      )
      .join('') +
    `</div></div>`
  );
}

/**
 * `closeDrawer` - Function 👋
 *
 * @returns { void } - closes the bottom sheet (questions or « Parties en cours ») and stops listening to the list
 */
function closeDrawer() {
  const drawer = document.getElementById('simDrawer');
  if (drawer) drawer.remove();
  if (cloud.listUnsubscribe) cloud.listUnsubscribe();
  cloud.listUnsubscribe = null;
  page.drawerGame = '';
  page.hostNote = false;
}

// ===== THE ONGOING NOTIFICATION 🔔 ===== //
// ⚠️ It only updates while the page is alive: Chrome throttles (and may freeze) background timers, so a phone in
// a pocket may show a clock that is a few minutes behind until the app is opened again.

/**
 * `notifyReady` - Function 🔔
 *
 * @returns { boolean } - true when this browser can show a service-worker notification
 */
function notifyReady() {
  return typeof Notification !== 'undefined' && !!navigator.serviceWorker;
}

/**
 * `askNotify` - Function 🔔
 *
 * At the start of a game: a small in-page explanation first (never window.confirm), then the browser's own
 * question, only while the permission is still undecided.
 *
 * @returns { Promise<void> }
 */
async function askNotify() {
  if (!notifyReady() || !game) return;
  if (Notification.permission === 'granted') return updateNotification(true);
  if (Notification.permission !== 'default' || page.notifyAsked) return;
  page.notifyAsked = true;
  const yes = await showDialog({
    icon: 'bell',
    title: translate('Suivre le service', 'Follow the service'),
    text: translate(
      "Une notification discrète garde l'heure du service, le prochain événement et les tables qui vous attendent, jusqu'à la fin de la partie.",
      'A quiet notification keeps the service clock, the next event and the tables waiting for you, until the game ends.',
    ),
    buttons: [
      { label: translate('Plus tard', 'Later'), value: false },
      { label: translate('Activer', 'Turn on'), value: true },
    ],
  });
  if (!yes) return;
  try {
    await Notification.requestPermission();
  } catch (error) {
    return;
  }
  updateNotification(true);
}

/**
 * `nextStepLabel` - Function 🏷️
 *
 * @param { string } key - the key of the step that unlocks next
 * @returns { string } - « plats », « dessert », « addition »… in the app's language
 */
function nextStepLabel(key) {
  const labels = {
    welcome: ['arrivée', 'arrival'],
    seating: ['installation', 'seating'],
    water: ['eau', 'water'],
    aperitif: ['apéritif', 'aperitif'],
    menu: ['carte', 'menu'],
    allergy: ['commande', 'order'],
    order: ['commande', 'order'],
    wine: ['vin', 'wine'],
    mains: ['plats', 'mains'],
    birthday: ['anniversaire', 'birthday'],
    anniversary: ['anniversaire', 'anniversary'],
    business: ['client', 'guest'],
    dessert: ['dessert', 'dessert'],
    coffee: ['café', 'coffee'],
    bill: ['addition', 'bill'],
    goodbye: ['départ', 'goodbye'],
  }[String(key || '').split('|')[0]] || ['suite', 'next step'];
  return translate(labels[0], labels[1]);
}

/**
 * `notificationText` - Function 🔔
 *
 * @returns { {title: string, body: string} } - the clock, the next event (an arrival or a step that unlocks) and
 *   how many tables need me
 */
function notificationText() {
  const now = serviceNow();
  const mine = game.bookings.filter(
    (booking) => game.mode === 'solo' || entryOf(booking.table).o === game.me,
  );
  let next = null;
  mine.forEach((booking) => {
    if (isDone(booking.table)) return;
    const entry = entryOf(booking.table);
    const at = now < booking.time ? booking.time : entry.w;
    if (at <= now) return;
    const label =
      now < booking.time
        ? nextStepLabel('welcome')
        : nextStepLabel((game.steps[booking.table][entry.c.length] || {}).key);
    if (!next || at < next.at)
      next = { at, text: `${booking.table} · ${label} ${translate('dans', 'in')} ${minutesLeft(at, now)}` };
  });
  const waiting = mine.filter((booking) => needsWaiter(booking.table, now)).length;
  return {
    title: translate('Service · ', 'Service · ') + clockText(now) + (game.code ? ' · ' + game.code : ''),
    body:
      (next ? next.text : translate('Aucun événement à venir', 'Nothing coming up')) +
      ' · ' +
      (waiting
        ? translate(`${waiting} table(s) vous attendent`, `${waiting} table(s) need you`)
        : translate('aucune table en attente', 'no table waiting')),
  };
}

/**
 * `updateNotification` - Function 🔔
 *
 * Shows or replaces the ongoing notification (tag 'ltf-sim', silent, no re-alert): called every second by the
 * clock, it only redraws when its text changed (each service minute, or a table changed).
 *
 * @param { boolean } force - true to show it even when the text didn't change
 * @returns { void }
 */
function updateNotification(force) {
  if (!notifyReady() || Notification.permission !== 'granted' || !game || !game.startMs || game.ended) return;
  const text = notificationText();
  const signature = text.title + '|' + text.body;
  if (!force && signature === game.notified) return;
  game.notified = signature;
  navigator.serviceWorker.ready
    .then((registration) =>
      registration.showNotification(text.title, {
        tag: NOTIFY_TAG,
        renotify: false,
        silent: true,
        requireInteraction: true,
        body: text.body,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        data: { url: '/#sim' },
      }),
    )
    .catch(() => {});
}

/**
 * `closeNotification` - Function 🔕
 *
 * @returns { void } - closes the ongoing notification (end, quit, leaving the page)
 */
function closeNotification() {
  if (!notifyReady()) return;
  navigator.serviceWorker.ready
    .then((registration) => registration.getNotifications({ tag: NOTIFY_TAG }))
    .then((notifications) => (notifications || []).forEach((notification) => notification.close()))
    .catch(() => {});
}

// ===== THE PAGE 📚 ===== //

/**
 * `openPage` - Function 📚
 *
 * Opens the Simulation de service chapter page in place of the home screen (Back comes home).
 *
 * @returns { Promise<void> }
 */
async function openPage() {
  addStyles();
  page.isOpen = true;
  page.quitting = false;
  history.pushState({ ltfSim: 'page' }, '');
  render('page');
  // 📦 the Rust app has no window.LTF: load the menu & the floor plan before any game is generated
  page.dataReady = await ensureData();
}

/**
 * `leavePage` - Function 👋
 *
 * @returns { void } - back to the home screen
 */
function leavePage() {
  stopGame();
  page.isOpen = false;
  const toast = document.getElementById('simToast');
  if (toast) toast.remove();
  if (typeof window.LTFgo === 'function') window.LTFgo('hub');
}

/**
 * `handleClick` - Function 👆
 *
 * Every tap on the chapter page: navigation, setup, briefing, service, table dialogue, requests.
 *
 * @param { MouseEvent } event - the click
 * @returns { void }
 */
function handleClick(event) {
  if (!page.isOpen || !event.target.closest('#simPage')) return;
  /**
   * `target` - Function 🎯
   *
   * @param { string } selector - a CSS selector
   * @returns { Element | null } - the tapped element matching it (or its closest parent that does)
   */
  const target = (selector) => event.target.closest(selector);
  const go = target('[data-go]');
  if (go) {
    if (go.dataset.go === 'back') return history.back();
    if (go.dataset.go === 'solo') return openSetup(false);
    if (go.dataset.go === 'host') return openSetup(true);
    if (go.dataset.go === 'join') return askJoin();
    if (go.dataset.go === 'games') return openGamesDrawer();
  }
  // 👋 the bottom sheet's backdrop (or its close button)
  const closer = target('[data-act="closedrawer"]');
  if (closer && (closer.id !== 'simDrawer' || event.target === closer)) return closeDrawer();
  if (target('#simDrawer') && handleDrawerClick(target)) return;
  const openButton = target('[data-open]');
  if (openButton) {
    page.openGame = openButton.dataset.open === '1';
    return renderSetup();
  }
  const interruptButton = target('[data-interrupt]');
  if (interruptButton && game) {
    if (answerInterrupt(page.tableId, Number(interruptButton.dataset.interrupt))) {
      renderTable();
      scrollToBottom();
    }
    return;
  }
  const drinkChip = target('[data-dpick]');
  if (drinkChip && game) return pickDrinkChip(drinkChip);
  const count = target('[data-count]');
  if (count) {
    page.waiterCount = clamp(Number(count.dataset.count), 1, 4);
    page.rangs = autoRangs(page.waiterCount);
    page.brush = 0;
    return renderSetup();
  }
  if (target('[data-name]')) return;
  const speedButton = target('[data-speed]');
  if (speedButton) {
    page.speed = cleanSpeed(speedButton.dataset.speed);
    return renderSetup();
  }
  const brush = target('[data-brush]');
  if (brush) {
    page.brush = Number(brush.dataset.brush);
    return renderSetup();
  }
  const accept = target('[data-accept]');
  if (accept) return answerRequest(accept.dataset.accept, true);
  const refuse = target('[data-refuse]');
  if (refuse) return answerRequest(refuse.dataset.refuse, false);
  const choiceButton = target('[data-choice]');
  if (choiceButton && game) {
    if (answerStep(page.tableId, Number(choiceButton.dataset.choice))) {
      renderTable();
      scrollToBottom();
    }
    return;
  }
  const me = target('[data-me]');
  if (me && game) {
    game.me = me.dataset.me;
    page.soloDirty = true;
    return renderService();
  }
  const table = target('[data-table]');
  if (table) {
    if (page.view === 'setup' && page.waiterCount > 1) {
      page.rangs[table.dataset.table] = page.brush;
      return renderSetup();
    }
    if (page.view === 'service') return openTable(table.dataset.table);
  }
  const action = target('[data-act]');
  if (!action) return;
  const name = action.dataset.act;
  if (name === 'auto') {
    page.rangs = autoRangs(page.waiterCount);
    return renderSetup();
  }
  if (name === 'generate' || name === 'regen') {
    page.bookings = generateBookings();
    if (!page.bookings.length) {
      // 📦 no floor plan or menu yet (still loading, or offline on the first visit): try once more
      ensureData().then((ready) => {
        page.dataReady = ready;
        if (!ready)
          return showDialog({
            icon: 'alert',
            title: translate('Simulation', 'Simulation'),
            text: translate(
              'Le menu et le plan de salle ne sont pas encore chargés. Vérifiez la connexion et réessayez.',
              'The menu and the floor plan are not loaded yet. Check the connection and try again.',
            ),
          });
        page.bookings = generateBookings();
        if (name === 'generate') history.pushState({ ltfSim: 'brief' }, '');
        render('brief');
      });
      return;
    }
    if (name === 'generate') history.pushState({ ltfSim: 'brief' }, '');
    return render('brief');
  }
  if (name === 'start') return page.online ? createOnlineGame() : startSolo();
  if (name === 'resume') return resumeSolo();
  if (name === 'top') return scrollToTop();
  if (name === 'go') return startOnlineGame();
  if (name === 'end') return askEnd();
  if (name === 'speed' && game) {
    // ⏩ the next speed (back to ×1 after ×10)
    setSpeed(SPEEDS[(SPEEDS.indexOf(game.speed || 1) + 1) % SPEEDS.length]);
    showToast('clock', translate(`Vitesse ×${game.speed}`, `Speed ×${game.speed}`));
    return renderService();
  }
  if (name === 'skip' && game) {
    if (!skipToNextArrival()) showToast('clock', translate('Plus aucune arrivée', 'No more arrivals'));
    return tick();
  }
  if (!game) return;
  if (name === 'steal') {
    stealTable(page.tableId);
    return renderTable();
  }
  if (name === 'ask') {
    askTable(page.tableId);
    return renderTable();
  }
  if (name === 'switch') {
    game.me = entryOf(page.tableId).o;
    page.soloDirty = true;
    return renderTable();
  }
  if (name === 'serve') {
    if (serveDrink(page.tableId)) {
      renderTable();
      scrollToBottom();
    }
    return;
  }
  if (name === 'mute') {
    setMuted(!isMuted());
    return renderTable();
  }
  if (name === 'replay') {
    // 🔁 « réécouter » turns the sound back on
    if (isMuted()) {
      setMuted(false);
      renderTable();
    }
    return speakCurrent(page.tableId, true);
  }
  if (name === 'questions') return openQuestions();
}

/**
 * `handleDrawerClick` - Function 👆
 *
 * @param { Function } target - the click's `closest` helper
 * @returns { boolean } - true when the tap was for the bottom sheet (questions or « Parties en cours »)
 */
function handleDrawerClick(target) {
  const guestChip = target('[data-qguest]');
  if (guestChip) {
    page.questionGuest = Number(guestChip.dataset.qguest);
    const drawer = document.getElementById('simDrawer');
    if (drawer) drawer.innerHTML = questionsSheetHtml();
    return true;
  }
  const ask = target('[data-ask]');
  if (ask && game) {
    const guest = page.questionGuest || 0;
    const reply = askGuest(page.tableId, guest, ask.dataset.ask);
    closeDrawer();
    if (reply) {
      renderTable();
      scrollToBottom();
      speakFor(page.tableId, [{ guest, text: reply.line }]);
    }
    return true;
  }
  const gameRow = target('[data-game]');
  if (gameRow) {
    // 👑 my own game (or one I played here): straight back in, no code
    tapListedGame((page.games || []).find((entry) => entry.id === gameRow.dataset.game));
    return true;
  }
  const action = target('[data-act]');
  if (!action) return false;
  if (action.dataset.act === 'gamelist') {
    page.drawerGame = '';
    page.hostNote = false;
    renderDrawer();
    return true;
  }
  if (action.dataset.act === 'joinlisted' || action.dataset.act === 'joincode') {
    joinFromDrawer(action.dataset.act === 'joincode');
    return true;
  }
  return false;
}

/**
 * `pickDrinkChip` - Function 🍸
 *
 * @param { HTMLElement } chip - the chip tapped (data-dpick = "group:index")
 * @returns { void } - toggles it in place (no redraw: the chat keeps its scroll)
 */
function pickDrinkChip(chip) {
  const drink = pendingDrink(page.tableId);
  if (!drink) return;
  const [groupId, index] = chip.dataset.dpick.split(':');
  const key = page.tableId + '|' + (entryOf(page.tableId).d || '').length;
  game.picks[key] = game.picks[key] || {};
  const selected = togglePick(drink.task, game.picks[key], groupId, Number(index));
  document.querySelectorAll(`[data-dpick^="${groupId}:"]`).forEach((other) => {
    other.classList.toggle('simon', selected.includes(Number(other.dataset.dpick.split(':')[1])));
  });
}

// 👆 the page's taps
document.addEventListener('click', handleClick);

// ✍️ the waiters' names (solo setup)
document.addEventListener('input', (event) => {
  const field = event.target.closest && event.target.closest('#simPage [data-name]');
  if (!field) return;
  page.names[Number(field.dataset.name)] =
    field.value.replace(/[<>]/g, '').slice(0, 20) || 'Serveur ' + (Number(field.dataset.name) + 1);
});

// 🔙 Back while the page is open: table → service, a game asks before leaving, the page goes home
addEventListener(
  'popstate',
  (event) => {
    if (!page.isOpen) return;
    event.stopImmediatePropagation();
    document.querySelectorAll('.simdlg').forEach((dialog) => dialog.remove());
    if (page.quitting) {
      page.quitting = false;
      // 🚪 quit: a solo game is gone, an online one is left (its code stays, the notification doesn't come back)
      if (game && game.mode === 'solo') clearSolo();
      else if (game && game.listId) markLeft(game.listId);
      stopGame();
      return render(afterGameView());
    }
    const view = page.view;
    if (view === 'table') return game && game.ended ? finishGame() : render('service');
    if (view === 'service' || view === 'lobby') {
      history.pushState({ ltfSim: view }, '');
      return askQuit();
    }
    if (view === 'end') {
      stopGame();
      return render(afterGameView());
    }
    if (view === 'brief') return render('setup');
    if (view === 'setup') return render('page');
    leavePage();
  },
  true,
);

// 👀 another tab of the app took over #app: the page is closed
new MutationObserver(() => {
  if (page.isOpen && !document.getElementById('simPage')) {
    stopGame();
    page.isOpen = false;
  }
}).observe(document.body, { childList: true, subtree: true });

// ===== HOME 🏠 ===== //

/**
 * `addChapterRow` - Function 🏠
 *
 * Adds the « Simulation de service » row to the chapters on the home screen (right after « Mise en place »).
 *
 * @returns { void }
 */
function addChapterRow() {
  if (document.getElementById('simRow')) return;
  const heading = Array.from(document.querySelectorAll('#app .sh')).find((element) =>
    /^(Chapitres|Chapters)$/.test(element.textContent.trim()),
  );
  const firstChapter = heading && heading.nextElementSibling;
  if (!firstChapter || !firstChapter.classList.contains('li')) return;
  addStyles();
  const row = document.createElement('button');
  row.id = 'simRow';
  row.className = 'li';
  row.innerHTML =
    `<div class="av simrowic">🛎️</div><div class="tx"><div class="n">${translate('Simulation de service', 'Service simulation')}</div>` +
    `<div class="muted">${translate('Un dîner en accéléré, seul ou en équipe', 'A dinner service sped up, alone or as a team')}</div></div>` +
    `<div class="muted" style="font-size:22px;padding:0 6px">›</div>`;
  row.addEventListener('click', () => openPage());
  const setupRow = document.getElementById('setRow');
  if (setupRow && setupRow.parentNode === firstChapter.parentNode) setupRow.after(row);
  else firstChapter.parentNode.insertBefore(row, firstChapter);
}

/**
 * `openOnBoot` - Function 📲
 *
 * Opened from the game's notification (`?sim=1` or `#sim`): once the home screen is drawn, a saved solo game is
 * resumed, else my active online game is rejoined (code remembered on this phone), else the chapter page opens.
 *
 * @returns { void }
 */
function openOnBoot() {
  if (!page.openOnBoot || page.isOpen || !document.getElementById('simRow')) return;
  page.openOnBoot = false;
  // 💾 a saved solo game comes straight back; else my online game (rejoined with its remembered code)
  if (readSoloSummary()) return resumeSolo();
  const online = activeMine();
  if (online) return openPage().then(() => joinOnlineGame(online.code));
  openPage();
}

/**
 * `readBootLink` - Function 🔗
 *
 * @returns { void } - remembers a `?sim=1` / `#sim` link and cleans the address (the app's router keeps its own hash)
 */
function readBootLink() {
  const fromQuery = new URLSearchParams(location.search).get('sim') === '1';
  const fromHash = location.hash === '#sim';
  if (!fromQuery && !fromHash) return;
  page.openOnBoot = true;
  history.replaceState(history.state, '', location.pathname + (fromHash ? '' : location.hash));
}

// 👀 watch for the home screen (both builds redraw `#app`)
readBootLink();
new MutationObserver(() => {
  addChapterRow();
  openOnBoot();
}).observe(document.body, { childList: true, subtree: true });
addChapterRow();
openOnBoot();

// 📲 the game's notification was tapped while the app was open (message from the service worker)
if (navigator.serviceWorker && typeof navigator.serviceWorker.addEventListener === 'function')
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'open-sim') return;
    // 🔔 show the notification again at the next tick (in case the system closed it)
    if (game) game.notified = '';
    if (page.isOpen) return;
    page.openOnBoot = true;
    openOnBoot();
  });

// 👋 leaving the page (closing the tab, navigating away): the voices stop, the solo game is saved
// (the notification stays: the game is saved, sim-live.js shows it again after a reload)
addEventListener('pagehide', () => {
  stopSpeaking();
  saveSolo(true);
});

// 💾 the app goes to the background: save the solo game now
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveSolo(true);
});

// ⬆️ the « back to top » button of the table dialogue follows the scroll
addEventListener('scroll', updateTopFab, { passive: true });

// 🌍 open it from anywhere (e.g. a link or the console)
window.LTFopenSim = openPage;

// 🛎️ the live card on every page & the notification after a reload (sim-live.js)
useLiveKit({
  translate,
  escapeHtml,
  clockText,
  cleanListEntry,
  api: {
    playing: playingState,
    openListed: openListedGame,
    openDrawer: openDrawerFromCard,
    resumeSolo,
  },
});
