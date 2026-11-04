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
 * @name: Les Trois Forts - Mise en place
 * @file: pwa/setup.js
 * @type: JavaScript (module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script type="module" src="setup.js"
 *    -|> Accueil › Chapitres › « Mise en place » opens the chapter page (tabs: Seau 1-3 · Rouges · Accueil)
 *   2+|> import { SETUP_DEFAULT, cleanSetup } from './setup.js' (the dashboard editor, admin-edit.js)
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🧊 Mise en place: a chapter row on the home screen that opens a chapter page, like the others, with
// scrollable tabs (Seau 1 · Seau 2 · Seau 3 · Rouges · Accueil). Each tab has its modes:
// - 👁️ Aperçu: the bucket bottle by bottle (photo, type, how many, a note) or the steps of service
// - 🃏 Apprendre: flashcards · ❓ Quiz: 10 questions · ⏱️ Chrono: 60 seconds with combos
// - 🧊 Range les seaux (each bottle in the right bucket) or 🔢 Dans l'ordre (the steps of service)
// - ✅ Checklist du jour (resets every day)
// The owner edits all of it in the dashboard (tab « Service »), saved in Firestore `content/setup`
// as a JSON text and cached for offline use. Shared by the JS & the Rust builds 🤝.

// import the Firebase app helpers (reuse the app `cloud.js` already created) 🔥
import { getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
// import the Firestore helpers 🗃️
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===== CONSTANTS 🧰 ===== //

// the saved progress & settings (for the language) 💾
const PROGRESS_KEY = 'ltf_v1';
// the offline copy of the live setup 🧊
const SETUP_KEY = 'ltf_setup_v1';
// today's ticks of the checklist ✅
const CHECK_KEY = 'ltf_setup_check_v1';

// the kinds of bottle: [id, emoji, FR, EN, colour] 🍾
export const BOTTLE_KINDS = [
  ['bulles', '🥂', 'Bulles', 'Bubbles', '#d8b04c'],
  ['blanc', '🥃', 'Blanc', 'White', '#e8dc9a'],
  ['rose', '🌸', 'Rosé', 'Rosé', '#f2a7b8'],
  ['rouge', '🍷', 'Rouge', 'Red', '#9b2335'],
  ['sansalcool', '🌿', 'Sans alcool', 'Alcohol-free', '#7cc58b'],
  ['soft', '🍹', 'Soft maison', 'House soft', '#f0a04b'],
  ['eau', '💧', 'Eau', 'Water', '#6fb7e6'],
];

// the setup as filmed on 2026-11-01 (the owner's videos); the dashboard version replaces it 📹
export const SETUP_DEFAULT = {
  buckets: [
    {
      icon: '🥂',
      name: { fr: 'Seau 1 · Bulles & softs', en: 'Bucket 1 · Bubbles & softs' },
      hint: {
        fr: 'Seau argent Laurent-Perrier. Tout ce qui pétille, plus les softs maison dans les bouteilles Orezza.',
        en: 'Silver Laurent-Perrier bucket. Everything that sparkles, plus the house softs in the Orezza bottles.',
      },
      img: 'img/setup-seau1.jpg',
      items: [
        {
          n: "Lueur d'Azur (mocktail)",
          kind: 'soft',
          qty: 1,
          note: { fr: 'Bouteille Orezza n° 1, jus orangé', en: 'Orezza bottle no. 1, orange juice' },
        },
        {
          n: 'Thé glacé maison',
          kind: 'soft',
          qty: 1,
          note: { fr: 'Bouteille Orezza n° 2', en: 'Orezza bottle no. 2' },
        },
        {
          n: 'Citronnade Signature',
          kind: 'soft',
          qty: 1,
          note: { fr: 'Bouteille Orezza n° 3, trouble et pâle', en: 'Orezza bottle no. 3, cloudy and pale' },
        },
        {
          n: 'Taittinger Prestige Rosé',
          kind: 'bulles',
          qty: 1,
          note: { fr: 'Champagne rosé', en: 'Rosé champagne' },
        },
        {
          n: 'Prosecco Scanavino',
          kind: 'bulles',
          qty: 1,
          note: { fr: 'Pour le Spritz de la Maison', en: 'For the house Spritz' },
        },
        {
          n: 'Pommery Apanage Brut',
          kind: 'bulles',
          qty: 1,
          note: { fr: 'Champagne brut', en: 'Brut champagne' },
        },
        { n: 'Perrier', kind: 'eau', qty: 3, note: { fr: 'Eau pétillante', en: 'Sparkling water' } },
        {
          n: 'French Bloom',
          kind: 'sansalcool',
          qty: 1,
          note: { fr: 'Pétillant blanc sans alcool', en: 'Alcohol-free sparkling white' },
        },
      ],
    },
    {
      icon: '🥃',
      name: { fr: 'Seau 2 · Blancs & rosé du verre', en: 'Bucket 2 · Whites & rosé by the glass' },
      hint: {
        fr: 'Seau doré Pommery. Les vins au verre du dîner qui se servent frais.',
        en: 'Gold Pommery bucket. The dinner wines by the glass that are served chilled.',
      },
      img: 'img/setup-seau2.jpg',
      items: [
        {
          n: 'Domaine du Paternel',
          kind: 'rose',
          qty: 2,
          note: { fr: 'Rosé de Cassis, 2 bouteilles', en: 'Rosé from Cassis, 2 bottles' },
        },
        {
          n: 'Vacqueyras (Maison Tardieu-Laurent)',
          kind: 'blanc',
          qty: 1,
          note: { fr: 'Blanc', en: 'White' },
        },
        {
          n: 'Domaine Estoublon',
          kind: 'blanc',
          qty: 1,
          note: { fr: 'Blanc des Alpilles', en: 'White from the Alpilles' },
        },
        {
          n: 'Château de Beaupré, Cuvée Collection',
          kind: 'blanc',
          qty: 1,
          note: { fr: "Blanc, Coteaux d'Aix", en: "White, Coteaux d'Aix" },
        },
      ],
    },
    {
      icon: '🍇',
      name: { fr: 'Seau 3 · Accords & extras', en: 'Bucket 3 · Pairing & extras' },
      hint: {
        fr: "Deuxième seau argent Laurent-Perrier. Les vins de l'accord mets-vins et le reste.",
        en: 'Second silver Laurent-Perrier bucket. The wine-pairing wines and the rest.',
      },
      img: 'img/setup-seau3.jpg',
      items: [
        {
          n: 'Susucaru Rosato (Frank Cornelissen)',
          kind: 'rose',
          qty: 2,
          note: { fr: "Rosé de l'accord, entrée", en: 'Pairing rosé, starter' },
        },
        {
          n: 'Sous le Végétal, Cuvée Octave',
          kind: 'blanc',
          qty: 1,
          note: { fr: 'Blanc de Samos, accord poisson', en: 'White from Samos, fish pairing' },
        },
        {
          n: 'Fruit Citron Vert',
          kind: 'soft',
          qty: 1,
          note: { fr: 'Jus pressé en Provence', en: 'Juice pressed in Provence' },
        },
        {
          n: 'Villa Dria, Jardin Secret',
          kind: 'blanc',
          qty: 2,
          note: { fr: 'Blanc, Côtes de Gascogne', en: 'White, Côtes de Gascogne' },
        },
      ],
    },
  ],
  reds: {
    icon: '🍷',
    name: { fr: 'Rouges · température ambiante', en: 'Reds · room temperature' },
    hint: {
      fr: 'Jamais dans la glace : en ligne sur le comptoir, étiquettes vers vous.',
      en: 'Never on ice: lined up on the counter, labels facing you.',
    },
    img: 'img/setup-rouges.jpg',
    items: [
      { n: 'Château Henri Bonneaud', kind: 'rouge', qty: 1, note: { fr: 'Palette', en: 'Palette' } },
      {
        n: 'Bouchard Père & Fils, Beaune du Château',
        kind: 'rouge',
        qty: 1,
        note: { fr: 'Beaune 1er Cru', en: 'Beaune 1er Cru' },
      },
      { n: 'Château Crémat', kind: 'rouge', qty: 1, note: { fr: 'Bellet', en: 'Bellet' } },
      {
        n: 'Indigena (Parés Baltà)',
        kind: 'rouge',
        qty: 1,
        note: { fr: 'Penedès, accord viande', en: 'Penedès, meat pairing' },
      },
      {
        n: 'Les Terrasses de la Courtade',
        kind: 'rouge',
        qty: 1,
        note: { fr: 'Porquerolles', en: 'Porquerolles' },
      },
      {
        n: "Château Saint-Maur, Cuvée L'Excellence",
        kind: 'rouge',
        qty: 1,
        note: { fr: 'Côtes de Provence Cru Classé', en: 'Côtes de Provence Cru Classé' },
      },
    ],
  },
  steps: [
    {
      icon: '🧥',
      title: { fr: 'Le vestiaire', en: 'The coats' },
      text: {
        fr: 'Proposez de prendre les vestes et manteaux. Rangez-les au vestiaire sur le cintre qui porte le numéro de leur table.',
        en: "Offer to take jackets and coats. Hang them in the wardrobe on the hanger with their table's number.",
      },
      say: { fr: 'Puis-je vous débarrasser de vos manteaux ?', en: 'May I take your coats?' },
    },
    {
      icon: '🪑',
      title: { fr: "L'installation", en: 'Seating' },
      text: {
        fr: 'Accompagnez-les à la table et installez la dame en premier.',
        en: 'Walk them to the table and seat the lady first.',
      },
      say: { fr: '', en: '' },
    },
    {
      icon: '📖',
      title: { fr: 'Les cartes', en: 'The menus' },
      text: {
        fr: 'Pour deux : deux cartes du dîner et une carte des boissons. Ouvrez la carte avant de la donner, toujours à la dame d’abord, puis au monsieur.',
        en: 'For two: two dinner menus and one drinks menu. Open the menu before handing it over, always to the lady first, then the gentleman.',
      },
      say: { fr: '', en: '' },
    },
    {
      icon: '🎁',
      title: { fr: 'Le Menu Dégustation', en: 'The Tasting Menu' },
      text: {
        fr: 'Présentez le Menu Dégustation, sur la page de gauche.',
        en: 'Present the Tasting Menu, on the left-hand page.',
      },
      say: {
        fr: 'Sur la gauche, vous avez notre Menu Dégustation, un menu surprise du chef.',
        en: "On the left, you have our Tasting Menu, the chef's surprise menu.",
      },
    },
    {
      icon: '🍷',
      title: { fr: 'La carte des boissons', en: 'The drinks menu' },
      text: {
        fr: 'Montrez la carte des vins et des boissons.',
        en: 'Show them the wine and drinks menu.',
      },
      say: { fr: '', en: '' },
    },
    {
      icon: '💧',
      title: { fr: "L'eau d'abord", en: 'Water first' },
      text: {
        fr: "La première question, c'est l'eau : pétillante, plate ou une carafe. Dès qu'ils répondent, apportez l'eau tout de suite.",
        en: 'The first question is water: sparkling, still or a carafe. As soon as they answer, bring the water right away.',
      },
      say: {
        fr: "Je vous apporte de l'eau ? Plutôt pétillante, plate, ou une carafe ?",
        en: 'Shall I bring you some water? Sparkling, still, or a carafe?',
      },
    },
    {
      icon: '📝',
      title: { fr: 'La commande', en: 'The order' },
      text: {
        fr: "L'eau servie, revenez prendre la commande.",
        en: 'Once the water is served, come back to take the order.',
      },
      say: { fr: '', en: '' },
    },
  ],
};

// the drawer look 🎨
const SETUP_CSS = `
.setintro{color:var(--mu);font-size:13.5px;margin:0 2px 12px;line-height:1.4}
#setPage .settabs{position:sticky;top:56px;z-index:5;background:var(--bg);padding-top:10px;margin-top:6px}
#setPage .settabs .chip.on{background:var(--gold);color:#111}
.setinfo{padding:0;overflow:hidden}
.setinfotx{padding:12px 14px 14px}
.setinfotx b{font-family:Georgia,'Times New Roman',serif;font-size:18px;color:var(--gold)}
.setpills{margin-top:8px}
.setav{font-size:21px}
.setchev{font-size:22px;margin-left:6px}
.opt.wrong{animation:setshake .3s}
@keyframes setshake{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.setgamebottle{display:flex;gap:14px;align-items:center;padding:18px 16px;border-radius:20px;background:var(--sf);margin-top:8px}
.setgamebottle .setdot{height:64px;width:12px}
.setgamebottle b{display:block;font-family:Georgia,'Times New Roman',serif;font-size:22px;margin:2px 0}
.setbins{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.setbin{position:relative;border:2px solid transparent;border-radius:18px;background:var(--sf);color:inherit;font:inherit;
  padding:0;overflow:hidden;cursor:pointer;text-align:center;font-weight:700}
.setbin img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}
.setbin span{display:block;padding:9px 6px}
.setbin.right{border-color:var(--okb)}
.setbin.wrong{border-color:var(--kob);animation:setshake .3s}
.setresult{text-align:center;padding-top:60px}
.setbig{font-size:64px}
.setbucket{border-radius:20px;background:var(--sf2);overflow:hidden;margin:0 0 14px}
.setphoto{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;background:var(--bg)}
.sethead{display:flex;align-items:center;gap:10px;padding:12px 14px 4px}
.setnum{width:34px;height:34px;border-radius:17px;background:var(--pill);color:var(--gold);display:flex;
  align-items:center;justify-content:center;font-size:18px;flex:none}
.sethead h3{margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:var(--gold)}
.sethint{color:var(--mu);font-size:13px;margin:2px 14px 8px;line-height:1.4}
.setlist{padding:0 8px 8px}
.setbottle{display:flex;align-items:center;gap:10px;padding:8px 6px;border-top:1px solid var(--line)}
.setbottle:first-child{border-top:0}
.setdot{width:10px;height:44px;border-radius:5px;flex:none}
.setbottle .grow{min-width:0}
.setbottle b{display:block;font-size:14.5px;overflow-wrap:anywhere}
.setbottle .setnote{font-size:12.5px;color:var(--mu)}
.setkind{font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:var(--pill);white-space:nowrap}
.setqty{font-weight:800;color:var(--gold);min-width:26px;text-align:right}
.setsteps{position:relative;margin:4px 0 6px;padding-left:46px}
.setsteps::before{content:'';position:absolute;left:19px;top:20px;bottom:20px;width:2px;background:var(--line)}
.setstep{position:relative;padding:0 0 18px}
.setstep .setbadge{position:absolute;left:-46px;top:0;width:40px;height:40px;border-radius:20px;background:var(--sf2);
  border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;font-size:18px}
.setstep .setidx{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);font-weight:700}
.setstep h3{margin:1px 0 4px;font-size:16.5px}
.setstep p{margin:0;line-height:1.45}
.setsay{margin-top:8px;padding:10px 12px;border-radius:14px;background:var(--pill);font-style:italic;line-height:1.4}
.setsay::before{content:'💬 ';font-style:normal}
.setprog{height:8px;border-radius:4px;background:var(--sf2);overflow:hidden;margin:0 0 6px}
.setprog i{display:block;height:100%;background:var(--gold);transition:width .25s}
.setcheck{display:flex;align-items:center;gap:12px;width:100%;padding:11px 8px;border:0;border-top:1px solid var(--line);
  background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
.setcheck .setbox{width:26px;height:26px;border-radius:8px;border:2px solid var(--mu);flex:none;display:flex;
  align-items:center;justify-content:center;font-size:15px;color:#111;transition:background .15s,border-color .15s}
.setcheck.done .setbox{background:var(--gold);border-color:var(--gold)}
.setcheck.done .grow{opacity:.5;text-decoration:line-through}
.setgroup{font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.06em;text-transform:uppercase;margin:16px 4px 4px}
.setdone{text-align:center;padding:14px;border-radius:16px;background:var(--pill);font-weight:700;margin:10px 0}
`;

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
 * `kindOf` - Function 🍾
 *
 * @param { string } id - a bottle kind id
 * @returns { Array<string> } - its [id, emoji, FR, EN, colour] (a neutral one when unknown)
 */
function kindOf(id) {
  return BOTTLE_KINDS.find((kind) => kind[0] === id) || ['', '🍾', 'Bouteille', 'Bottle', '#888888'];
}

/**
 * `addStyles` - Function 🎨
 *
 * @returns { void } - adds the drawer's styles once
 */
function addStyles() {
  if (document.getElementById('setStyle')) return;
  const style = document.createElement('style');
  style.id = 'setStyle';
  style.textContent = SETUP_CSS;
  document.head.appendChild(style);
}

// ===== DATA 📦 ===== //

/**
 * `cleanText` - Function 🧼
 *
 * @param { any } text - a `{ fr, en }` text from the network
 * @param { number } limit - the longest text kept
 * @returns { {fr: string, en: string} } - a safe text
 */
function cleanText(text, limit) {
  const source = text && typeof text === 'object' ? text : { fr: text || '' };
  return { fr: String(source.fr || '').slice(0, limit), en: String(source.en || '').slice(0, limit) };
}

/**
 * `cleanGroup` - Function 🧼
 *
 * @param { any } group - a bucket (or the reds) from the network
 * @returns { object } - a safe group { icon, name, hint, img, items }
 */
function cleanGroup(group) {
  const source = group && typeof group === 'object' ? group : {};
  return {
    icon: String(source.icon || '🧊').slice(0, 8),
    name: cleanText(source.name, 80),
    hint: cleanText(source.hint, 300),
    // only our own photos (img/…) 🖼️
    img: /^img\/[a-z0-9-]+\.(jpg|webp|png)$/.test(source.img || '') ? source.img : '',
    items: (Array.isArray(source.items) ? source.items : []).slice(0, 40).map((item) => ({
      n: String((item && item.n) || '').slice(0, 100),
      kind: kindOf(item && item.kind)[0] || 'blanc',
      qty: Math.max(0, Math.min(24, Math.round(Number(item && item.qty) || 0))),
      note: cleanText(item && item.note, 160),
    })),
  };
}

/**
 * `cleanSetup` - Function 🧼
 *
 * Shapes any setup (from Firestore or the dashboard) into the safe, expected structure.
 *
 * @param { any } setup - a setup
 * @returns { object } - { buckets, reds, steps }
 */
export function cleanSetup(setup) {
  const source = setup && typeof setup === 'object' ? setup : SETUP_DEFAULT;
  return {
    buckets: (Array.isArray(source.buckets) ? source.buckets : []).slice(0, 8).map(cleanGroup),
    reds: cleanGroup(source.reds),
    steps: (Array.isArray(source.steps) ? source.steps : []).slice(0, 30).map((step) => ({
      icon: String((step && step.icon) || '•').slice(0, 8),
      title: cleanText(step && step.title, 80),
      text: cleanText(step && step.text, 600),
      say: cleanText(step && step.say, 300),
    })),
  };
}

/**
 * `readCachedSetup` - Function 💾
 *
 * @returns { object } - the last setup seen (the built-in one when there's none)
 */
function readCachedSetup() {
  try {
    const cached = JSON.parse(localStorage.getItem(SETUP_KEY) || 'null');
    return cleanSetup(cached || SETUP_DEFAULT);
  } catch (error) {
    return cleanSetup(SETUP_DEFAULT);
  }
}

/**
 * `loadSetup` - Async Function 🧊
 *
 * Reads the setup the owner manages in the dashboard (Firestore `content/setup`).
 *
 * @returns { Promise<object> } - the setup (the offline copy, else the built-in one, on failure)
 */
async function loadSetup() {
  try {
    const app = getApps()[0];
    if (!app) return readCachedSetup();
    const snapshot = await getDoc(doc(getFirestore(app), 'content', 'setup'));
    if (!snapshot.exists()) {
      localStorage.removeItem(SETUP_KEY);
      return cleanSetup(SETUP_DEFAULT);
    }
    const setup = cleanSetup(JSON.parse(snapshot.data().data || 'null'));
    localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
    return setup;
  } catch (error) {
    return readCachedSetup();
  }
}

// ===== CHECKLIST ✅ ===== //

/**
 * `todayKey` - Function 📅
 *
 * @returns { string } - today's date (the checklist starts fresh every day)
 */
function todayKey() {
  const now = new Date();
  return now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
}

/**
 * `readTicks` - Function ✅
 *
 * @returns { object } - today's ticks { 'b0-3': true, … }
 */
function readTicks() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHECK_KEY) || '{}');
    return saved.day === todayKey() && saved.ticks ? saved.ticks : {};
  } catch (error) {
    return {};
  }
}

/**
 * `saveTicks` - Function 💾
 *
 * @param { object } ticks - today's ticks
 * @returns { void }
 */
function saveTicks(ticks) {
  localStorage.setItem(CHECK_KEY, JSON.stringify({ day: todayKey(), ticks }));
}

// ===== VIEWS 🖼️ ===== //

/**
 * `bottleHtml` - Function 🍾
 *
 * @param { object } item - a bottle { n, kind, qty, note }
 * @returns { string } - its row
 */
function bottleHtml(item) {
  const kind = kindOf(item.kind);
  return (
    `<div class="setbottle"><span class="setdot" style="background:${kind[4]}"></span>` +
    `<div class="grow"><b>${escapeHtml(item.n)}</b>` +
    (pick(item.note) ? `<span class="setnote">${escapeHtml(pick(item.note))}</span>` : '') +
    `</div><span class="setkind">${kind[1]} ${translate(kind[2], kind[3])}</span>` +
    `<span class="setqty">×${item.qty}</span></div>`
  );
}

/**
 * `groupHtml` - Function 🧊
 *
 * @param { object } group - a bucket (or the reds)
 * @param { string } badge - what the round badge shows (the bucket number or an emoji)
 * @returns { string } - its card: photo, title, hint & bottles
 */
function groupHtml(group, badge) {
  return (
    `<div class="setbucket">` +
    (group.img ? `<img class="setphoto" src="${group.img}" alt="" loading="lazy">` : '') +
    `<div class="sethead"><span class="setnum">${escapeHtml(badge)}</span><h3>${escapeHtml(pick(group.name))}</h3></div>` +
    (pick(group.hint) ? `<p class="sethint">${escapeHtml(pick(group.hint))}</p>` : '') +
    `<div class="setlist">${group.items.map(bottleHtml).join('')}</div></div>`
  );
}

/**
 * `stepsView` - Function 🤵
 *
 * @param { object } setup - the setup
 * @returns { string } - the steps of service as a vertical timeline
 */
function stepsView(setup) {
  return (
    `<p class="setintro">${translate(
      "De l'arrivée du client à la commande, dans l'ordre.",
      'From the guest’s arrival to the order, in order.',
    )}</p><div class="setsteps">` +
    setup.steps
      .map(
        (step, index) =>
          `<div class="setstep"><span class="setbadge">${escapeHtml(step.icon)}</span>` +
          `<div class="setidx">${translate('Étape', 'Step')} ${index + 1}</div>` +
          `<h3>${escapeHtml(pick(step.title))}</h3><p>${escapeHtml(pick(step.text))}</p>` +
          (pick(step.say) ? `<div class="setsay">${escapeHtml(pick(step.say))}</div>` : '') +
          `</div>`,
      )
      .join('') +
    `</div>`
  );
}

// ===== THE CHAPTER PAGE 📚 ===== //

// the page state: open?, the setup, the tab ('b0'… | 'reds' | 'steps'), the view, the chrono timer & the run 🌱
const page = { isOpen: false, setup: null, tab: 'b0', view: 'page', timer: 0, run: 0 };
// the best chrono scores, per tab ⏱️
const BEST_KEY = 'ltf_setup_best_v1';

/**
 * `shuffle` - Function 🔀
 *
 * @param { Array<any> } list - any list
 * @returns { Array<any> } - a shuffled copy
 */
function shuffle(list) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

/**
 * `groups` - Function 🧊
 *
 * @returns { Array<{id: string, short: string, group: object}> } - the buckets + the reds, with a short name
 */
function groups() {
  return page.setup.buckets
    .map((bucket, index) => ({
      id: 'b' + index,
      short: translate('Seau ', 'Bucket ') + (index + 1),
      group: bucket,
    }))
    .concat([
      { id: 'reds', short: translate('Rouges (comptoir)', 'Reds (counter)'), group: page.setup.reds },
    ]);
}

/**
 * `currentGroup` - Function 🧊
 *
 * @returns { object | null } - the bucket (or the reds) of the open tab, null on the steps tab
 */
function currentGroup() {
  return groups().find((entry) => entry.id === page.tab) || null;
}

/**
 * `readBest` - Function 🏆
 *
 * @param { string } key - a chrono key (the tab)
 * @returns { number } - the best score
 */
function readBest(key) {
  try {
    return Number(JSON.parse(localStorage.getItem(BEST_KEY) || '{}')[key]) || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * `saveBest` - Function 🏆
 *
 * @param { string } key - a chrono key (the tab)
 * @param { number } score - a new score (kept when it beats the old one)
 * @returns { boolean } - true when it's a new record
 */
function saveBest(key, score) {
  if (score <= readBest(key)) return false;
  let best = {};
  try {
    best = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
  } catch (error) {}
  best[key] = score;
  localStorage.setItem(BEST_KEY, JSON.stringify(best));
  return true;
}

/**
 * `stillRunning` - Function ⏹️
 *
 * @param { number } run - the run a delayed step belongs to
 * @returns { boolean } - true when that game is still on screen
 */
function stillRunning(run) {
  return page.isOpen && run === page.run;
}

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
 * @param { boolean } visible - show (chapter page) or hide (games) the bottom tab bar
 * @returns { void }
 */
function showTabBar(visible) {
  const tabBar = document.getElementById('tabbar');
  if (tabBar) tabBar.style.display = visible ? '' : 'none';
  document.body.classList.toggle('notabs', !visible);
}

/**
 * `closeExtras` - Function 🧹
 *
 * @returns { void } - removes the answer sheet & stops the chrono
 */
function closeExtras() {
  clearInterval(page.timer);
  const feedback = document.getElementById('setFb');
  if (feedback) feedback.remove();
}

/**
 * `flowBar` - Function 🔝
 *
 * @param { number } percent - the progress (0 → 100)
 * @param { string } label - the label on the right (3/10, 42 s…)
 * @returns { string } - the in-game bar (✕ + progress), like the other chapters
 */
function flowBar(percent, label) {
  return (
    `<header class="appbar flow"><button class="ibtn" data-go="back" aria-label="close">✕</button>` +
    `<div class="pbar"><i style="width:${percent}%"></i></div><div class="pl">${escapeHtml(label)}</div></header>`
  );
}

// ===== QUESTIONS ❓ ===== //

/**
 * `optionsWith` - Function 🎲
 *
 * @param { string } answer - the right answer
 * @param { Array<string> } pool - the other possible answers
 * @returns { Array<string> } - up to 4 shuffled options, the answer included
 */
function optionsWith(answer, pool) {
  const others = shuffle(Array.from(new Set(pool.filter((option) => option && option !== answer)))).slice(
    0,
    3,
  );
  return shuffle([answer].concat(others));
}

/**
 * `questionsFor` - Function ❓
 *
 * Builds every question of the open tab: where each bottle goes, how many, what it is, which bottle a note
 * describes; on the steps tab: the order of service, what to do and what to say.
 *
 * @returns { Array<{q: string, options: Array<string>, answer: string, expl: string}> } - the questions
 */
function questionsFor() {
  const questions = [];
  if (page.tab === 'steps') {
    const steps = page.setup.steps.filter((step) => pick(step.title));
    const titles = steps.map((step) => pick(step.title));
    steps.forEach((step, index) => {
      const title = pick(step.title);
      questions.push({
        q: translate(`Quelle est l'étape n° ${index + 1} ?`, `What is step ${index + 1}?`),
        options: optionsWith(title, titles),
        answer: title,
        expl: pick(step.text),
      });
      if (index < steps.length - 1)
        questions.push({
          q: translate(`Après « ${title} », on fait quoi ?`, `After “${title}”, what comes next?`),
          options: optionsWith(pick(steps[index + 1].title), titles),
          answer: pick(steps[index + 1].title),
          expl: pick(steps[index + 1].text),
        });
      if (pick(step.say))
        questions.push({
          q: translate(
            `À quelle étape dit-on : « ${pick(step.say)} » ?`,
            `At which step do you say: “${pick(step.say)}”?`,
          ),
          options: optionsWith(title, titles),
          answer: title,
          expl: pick(step.text),
        });
      if (pick(step.text))
        questions.push({
          q: translate(
            `Étape « ${title} » : que fait le serveur ?`,
            `Step “${title}”: what does the waiter do?`,
          ),
          options: optionsWith(
            pick(step.text),
            steps.map((other) => pick(other.text)),
          ),
          answer: pick(step.text),
          expl: pick(step.say),
        });
    });
    return questions;
  }
  const all = groups();
  const current = currentGroup();
  if (!current) return questions;
  const names = current.group.items.map((item) => item.n);
  current.group.items
    .filter((item) => item.n)
    .forEach((item) => {
      const kind = kindOf(item.kind);
      questions.push({
        q: translate(`Où va « ${item.n} » ?`, `Where does “${item.n}” go?`),
        options: optionsWith(
          current.short,
          all.map((entry) => entry.short),
        ),
        answer: current.short,
        expl: pick(current.group.name) + (pick(current.group.hint) ? '. ' + pick(current.group.hint) : ''),
      });
      questions.push({
        q: translate(`Combien de « ${item.n} » ?`, `How many “${item.n}”?`),
        options: optionsWith(
          String(item.qty),
          [item.qty - 1, item.qty + 1, item.qty + 2, item.qty + 3].filter((count) => count > 0).map(String),
        ),
        answer: String(item.qty),
        expl: translate(`×${item.qty} dans le seau.`, `×${item.qty} in the bucket.`),
      });
      questions.push({
        q: translate(`« ${item.n} », c'est…`, `“${item.n}” is…`),
        options: optionsWith(
          translate(kind[2], kind[3]),
          BOTTLE_KINDS.map((other) => translate(other[2], other[3])),
        ),
        answer: translate(kind[2], kind[3]),
        expl: pick(item.note),
      });
      if (pick(item.note) && names.length > 1)
        questions.push({
          q: translate(`Quelle bouteille : « ${pick(item.note)} » ?`, `Which bottle: “${pick(item.note)}”?`),
          options: optionsWith(item.n, names),
          answer: item.n,
          expl: current.short,
        });
    });
  return questions.filter((question) => question.options.length > 1);
}

// ===== VIEWS OF THE PAGE 📄 ===== //

/**
 * `tabsHtml` - Function 🗂️
 *
 * @returns { string } - the horizontal, scrollable tabs (buckets, reds, steps)
 */
function tabsHtml() {
  const tabs = groups()
    .map((entry) => [
      entry.id,
      (entry.id === 'reds' ? '🍷 ' : entry.group.icon + ' ') + entry.short.split(' (')[0],
    ])
    .concat([['steps', '🤵 ' + translate('Accueil', 'Service')]]);
  return (
    `<div class="chips scroll settabs" role="tablist">` +
    tabs
      .map(
        ([id, label]) =>
          `<button class="chip${page.tab === id ? ' on' : ''}" role="tab" data-tab="${id}">${escapeHtml(label)}</button>`,
      )
      .join('') +
    `</div>`
  );
}

/**
 * `renderPage` - Function 📚
 *
 * The chapter page: title, the tabs, the open tab's card & its modes (overview, learn, quiz, chrono, game).
 *
 * @returns { void }
 */
function renderPage() {
  closeExtras();
  showTabBar(true);
  const current = currentGroup();
  const isSteps = page.tab === 'steps';
  const count = isSteps ? page.setup.steps.length : current.group.items.length;
  const bottles = isSteps ? 0 : current.group.items.reduce((sum, item) => sum + item.qty, 0);
  const title = isSteps ? translate('Accueil du client', 'Welcoming guests') : pick(current.group.name);
  const hint = isSteps
    ? translate("De l'arrivée à la commande, étape par étape.", 'From arrival to the order, step by step.')
    : pick(current.group.hint);
  const modes = [
    [
      'overview',
      '👁️',
      translate('Aperçu', 'Overview'),
      translate('Tout voir d’un coup d’œil', 'See it all at a glance'),
      '',
    ],
    [
      'study',
      '🃏',
      translate('Apprendre', 'Learn'),
      translate('Cartes recto-verso', 'Flashcards'),
      count + ' ' + translate('cartes', 'cards'),
    ],
    ['quiz', '❓', 'Quiz', translate('10 questions, explications', '10 questions with explanations'), ''],
    [
      'chrono',
      '⏱️',
      'Chrono',
      translate('60 secondes, combos', '60 seconds, combos'),
      translate('Record', 'Best') + ' ' + readBest(page.tab),
    ],
    isSteps
      ? [
          'order',
          '🔢',
          translate('Dans l’ordre', 'In order'),
          translate('Remettez les étapes en ordre', 'Put the steps back in order'),
          '',
        ]
      : [
          'sort',
          '🧊',
          translate('Range les seaux', 'Fill the buckets'),
          translate('Chaque bouteille dans le bon seau', 'Each bottle in the right bucket'),
          '',
        ],
  ];
  if (!isSteps)
    modes.push([
      'check',
      '✅',
      translate('Checklist du jour', 'Today’s checklist'),
      translate('Cochez en remplissant le seau', 'Tick while filling the bucket'),
      '',
    ]);
  appRoot().innerHTML =
    `<div id="setPage"><header class="appbar"><button class="ibtn" data-go="back" aria-label="back">←</button>` +
    `<div class="abt"></div></header><div class="pad"><div class="kick2">${translate('Chapitre', 'Chapter')}</div>` +
    `<h1 class="ptitle">${translate('Mise en place', 'Setup')}</h1><div class="muted">` +
    `${translate('Les 3 seaux, les rouges & l’accueil du client', 'The 3 buckets, the reds & welcoming guests')}</div></div>` +
    tabsHtml() +
    `<div class="pad"><div class="card setinfo">` +
    (!isSteps && current.group.img ? `<img class="setphoto" src="${current.group.img}" alt="">` : '') +
    `<div class="setinfotx"><b>${escapeHtml(title)}</b><div class="muted sm">${escapeHtml(hint)}</div>` +
    `<div class="setpills"><span class="setkind">${isSteps ? count + ' ' + translate('étapes', 'steps') : count + ' ' + translate('références', 'items') + ' · ' + bottles + ' ' + translate('bouteilles', 'bottles')}</span></div></div></div>` +
    `<div class="sh">${translate('Modes de jeu', 'Game modes')}</div>` +
    modes
      .map(
        ([view, icon, name, subtitle, record]) =>
          `<button class="li tall" data-go="${view}"><div class="av setav">${icon}</div><div class="tx"><div class="n">${name}</div>` +
          `<div class="muted">${subtitle}</div></div><div class="rt">${record ? `<span class="muted sm">${escapeHtml(record)}</span>` : ''}` +
          `<span class="muted setchev">›</span></div></button>`,
      )
      .join('') +
    `<div style="height:90px"></div></div><div class="cta"><button class="btn" data-go="quiz">❓ ` +
    `${translate('Lancer un quiz', 'Start a quiz')}</button></div></div>`;
  const activeTab = appRoot().querySelector('.settabs .on');
  if (activeTab && activeTab.scrollIntoView) activeTab.scrollIntoView({ inline: 'center', block: 'nearest' });
}

/**
 * `renderOverview` - Function 👁️
 *
 * @returns { void } - the open tab, all at once (the bucket card or the steps timeline)
 */
function renderOverview() {
  showTabBar(true);
  const current = currentGroup();
  appRoot().innerHTML =
    `<div id="setPage"><header class="appbar"><button class="ibtn" data-go="back" aria-label="back">←</button>` +
    `<div class="abt">${translate('Aperçu', 'Overview')}</div></header><div class="pad">` +
    (current
      ? groupHtml(current.group, current.id === 'reds' ? '🍷' : current.id.slice(1) * 1 + 1)
      : stepsView(page.setup)) +
    `<div style="height:40px"></div></div></div>`;
}

/**
 * `renderCheck` - Function ✅
 *
 * @returns { void } - the checklist of the open bucket
 */
function renderCheck() {
  showTabBar(true);
  const current = currentGroup();
  const ticks = readTicks();
  const done = current.group.items.filter((item, index) => ticks[current.id + '-' + index]).length;
  const total = current.group.items.length;
  appRoot().innerHTML =
    `<div id="setPage"><header class="appbar"><button class="ibtn" data-go="back" aria-label="back">←</button>` +
    `<div class="abt">${escapeHtml(current.short)}</div></header><div class="pad">` +
    `<p class="setintro">${translate(
      `${done} / ${total} prêtes. Cochez chaque bouteille quand elle est en place (remis à zéro chaque jour).`,
      `${done} / ${total} ready. Tick each bottle once it's in place (resets every day).`,
    )}</p><div class="setprog"><i style="width:${total ? (100 * done) / total : 0}%"></i></div>` +
    (total && done === total
      ? `<div class="setdone">🎉 ${translate('Seau prêt !', 'Bucket ready!')}</div>`
      : '') +
    current.group.items
      .map((item, index) => {
        const id = current.id + '-' + index;
        return (
          `<button class="setcheck${ticks[id] ? ' done' : ''}" data-tick="${id}"><span class="setbox">` +
          `${ticks[id] ? '✓' : ''}</span><span class="grow">${escapeHtml(item.n)}</span>` +
          `<span class="setqty">×${item.qty}</span></button>`
        );
      })
      .join('') +
    `</div></div>`;
}

/**
 * `renderStudy` - Function 🃏
 *
 * Flashcards: a bottle (where does it go?) or a step number (what happens?), tap to flip.
 *
 * @returns { void }
 */
function renderStudy() {
  showTabBar(false);
  const current = currentGroup();
  const cards = current
    ? current.group.items.map((item) => ({
        front: escapeHtml(item.n),
        ask: translate('Où va-t-elle ? Combien ?', 'Where does it go? How many?'),
        back:
          `<b>${escapeHtml(current.short)}</b><br>${escapeHtml(pick(current.group.name))}<br><br>` +
          `${kindOf(item.kind)[1]} ${translate(kindOf(item.kind)[2], kindOf(item.kind)[3])} · ×${item.qty}` +
          (pick(item.note) ? `<br><span class="muted">${escapeHtml(pick(item.note))}</span>` : ''),
      }))
    : page.setup.steps.map((step, index) => ({
        front: `${escapeHtml(step.icon)}<br>${translate('Étape', 'Step')} ${index + 1}`,
        ask: translate('Que fait-on ?', 'What do you do?'),
        back:
          `<b>${escapeHtml(pick(step.title))}</b><br>${escapeHtml(pick(step.text))}` +
          (pick(step.say) ? `<div class="setsay">${escapeHtml(pick(step.say))}</div>` : ''),
      }));
  const deck = current ? shuffle(cards) : cards;
  let cardIndex = 0,
    known = 0;
  // 🃏 one card (or the end)
  const show = () => {
    if (cardIndex >= deck.length) return renderResult('🃏', known, deck.length, '');
    const card = deck[cardIndex];
    appRoot().innerHTML =
      `<div id="setPage">${flowBar((100 * cardIndex) / deck.length, `${cardIndex + 1}/${deck.length}`)}<div class="pad">` +
      `<div class="flip" id="setFlip"><div class="face front"><div class="fq">${card.front}</div>` +
      `<div class="muted" style="margin-top:12px">${escapeHtml(card.ask)}</div>` +
      `<small class="hint">${translate('Touchez pour retourner', 'Tap to flip')}</small></div>` +
      `<div class="face back"><div class="btxt">${card.back}</div></div></div></div>` +
      `<div class="abar fixed"><button class="btn sec grow" data-card="no">${translate('À revoir', 'Review again')}</button>` +
      `<button class="btn grow ok" data-card="yes">✓ ${translate('Je savais', 'I knew it')}</button></div></div>`;
    appRoot().querySelector('#setFlip').onclick = function () {
      this.classList.toggle('on');
    };
    appRoot()
      .querySelectorAll('[data-card]')
      .forEach(
        (button) =>
          (button.onclick = () => {
            if (button.dataset.card === 'yes') known++;
            cardIndex++;
            show();
          }),
      );
  };
  show();
}

/**
 * `askQuestion` - Function ❓
 *
 * Draws one question; an answer turns green / red and slides up the explanation sheet.
 *
 * @param { object } question - { q, options, answer, expl }
 * @param { string } barHtml - the top bar
 * @param { (ok: boolean) => void } onAnswer - called right after the tap
 * @param { () => void } [onNext] - called by « Continuer » (no sheet when missing: chrono)
 * @returns { void }
 */
function askQuestion(question, barHtml, onAnswer, onNext) {
  appRoot().innerHTML =
    `<div id="setPage">${barHtml}<div class="pad"><div class="muted sm">${translate('Mise en place', 'Setup')}</div>` +
    `<h2 class="qq">${escapeHtml(question.q)}</h2><div class="opts">` +
    question.options
      .map(
        (option, index) =>
          `<button class="opt" data-option="${index}"><span class="k">${'ABCD'[index]}</span><span>${escapeHtml(option)}</span></button>`,
      )
      .join('') +
    `</div></div></div>`;
  appRoot()
    .querySelectorAll('[data-option]')
    .forEach(
      (button) =>
        (button.onclick = () => {
          const ok = question.options[button.dataset.option] === question.answer;
          appRoot()
            .querySelectorAll('[data-option]')
            .forEach((other) => {
              other.disabled = true;
              if (question.options[other.dataset.option] === question.answer) other.classList.add('right');
            });
          if (!ok) button.classList.add('wrong');
          if (navigator.vibrate) navigator.vibrate(ok ? 8 : [20, 40, 20]);
          onAnswer(ok);
          if (!onNext) return;
          const feedback = document.createElement('div');
          feedback.id = 'setFb';
          feedback.className = 'fbsheet ' + (ok ? 'okc' : 'koc');
          feedback.innerHTML =
            `<div class="fbt">${ok ? '✓ ' + translate('Bonne réponse !', 'Correct!') : '✕ ' + translate('Pas tout à fait', 'Not quite')}</div>` +
            `<div class="fbx">${ok ? '' : translate('Réponse', 'Answer') + ' : <b>' + escapeHtml(question.answer) + '</b>. '}` +
            `${escapeHtml(question.expl || '')}</div><div class="fbb"><button class="btn grow">${translate('Continuer', 'Continue')}</button></div>`;
          document.body.appendChild(feedback);
          feedback.querySelector('button').onclick = () => {
            feedback.remove();
            onNext();
          };
        }),
    );
}

/**
 * `renderQuiz` - Function ❓
 *
 * @returns { void } - 10 questions of the open tab, with explanations
 */
function renderQuiz() {
  showTabBar(false);
  const questions = shuffle(questionsFor()).slice(0, 10);
  let questionIndex = 0,
    score = 0;
  // ❓ the next question (or the score)
  const next = () => {
    if (questionIndex >= questions.length) return renderResult('❓', score, questions.length, '');
    askQuestion(
      questions[questionIndex],
      flowBar((100 * questionIndex) / questions.length, `${questionIndex + 1}/${questions.length}`),
      (ok) => ok && score++,
      () => {
        questionIndex++;
        next();
      },
    );
  };
  next();
}

/**
 * `renderChrono` - Function ⏱️
 *
 * @returns { void } - 60 seconds of questions, a combo doubles the points after 3 right answers in a row
 */
function renderChrono() {
  showTabBar(false);
  const pool = questionsFor();
  const run = page.run;
  const endTime = Date.now() + 60000;
  let score = 0,
    combo = 0,
    questionIndex = 0,
    order = shuffle(pool);
  // ⏱️ the bar with the seconds left
  const bar = () => {
    const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    return flowBar((100 * left) / 60, `${left} s · ${score}`);
  };
  // 🏁 time's up
  const finish = () => {
    if (!stillRunning(run)) return;
    // the game is over: no other step may draw (or finish twice) ⏹️
    page.run++;
    clearInterval(page.timer);
    const isRecord = saveBest(page.tab, score);
    renderResult('⏱️', score, 0, isRecord ? '🏆 ' + translate('Nouveau record !', 'New record!') : '');
  };
  // ❓ the next question, right away
  const next = () => {
    if (!stillRunning(run)) return;
    if (Date.now() >= endTime) return finish();
    if (questionIndex >= order.length) {
      order = shuffle(pool);
      questionIndex = 0;
    }
    askQuestion(order[questionIndex++], bar(), (ok) => {
      combo = ok ? combo + 1 : 0;
      if (ok) score += combo >= 3 ? 2 : 1;
      setTimeout(next, ok ? 350 : 900);
    });
  };
  clearInterval(page.timer);
  page.timer = setInterval(() => {
    if (!stillRunning(run)) return clearInterval(page.timer);
    if (Date.now() >= endTime) return finish();
    const label = appRoot().querySelector('.flow .pl'),
      fill = appRoot().querySelector('.flow .pbar i');
    const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    if (label) label.textContent = `${left} s · ${score}`;
    if (fill) fill.style.width = (100 * left) / 60 + '%';
  }, 250);
  if (!pool.length) return finish();
  next();
}

/**
 * `renderSort` - Function 🧊
 *
 * The bucket game: every bottle (all buckets & the reds) shows up one by one, tap where it goes.
 *
 * @returns { void }
 */
function renderSort() {
  showTabBar(false);
  const all = groups();
  const bottles = shuffle(
    all.flatMap((entry) => entry.group.items.filter((item) => item.n).map((item) => ({ item, entry }))),
  );
  const run = page.run;
  let bottleIndex = 0,
    score = 0;
  // 🍾 the next bottle (or the score)
  const next = () => {
    if (!stillRunning(run)) return;
    if (bottleIndex >= bottles.length) return renderResult('🧊', score, bottles.length, '');
    const { item, entry } = bottles[bottleIndex];
    const kind = kindOf(item.kind);
    appRoot().innerHTML =
      `<div id="setPage">${flowBar((100 * bottleIndex) / bottles.length, `${bottleIndex + 1}/${bottles.length}`)}` +
      `<div class="pad"><div class="setgamebottle"><span class="setdot" style="background:${kind[4]}"></span><div>` +
      `<div class="muted sm">${kind[1]} ${translate(kind[2], kind[3])} · ×${item.qty}</div><b>${escapeHtml(item.n)}</b>` +
      (pick(item.note) ? `<div class="muted sm">${escapeHtml(pick(item.note))}</div>` : '') +
      `</div></div><div class="sh">${translate('Dans quel seau ?', 'Which bucket?')}</div><div class="setbins">` +
      all
        .map(
          (other) =>
            `<button class="setbin" data-bin="${other.id}">${other.group.img ? `<img src="${other.group.img}" alt="">` : ''}` +
            `<span>${escapeHtml(other.short)}</span></button>`,
        )
        .join('') +
      `</div></div></div>`;
    appRoot()
      .querySelectorAll('[data-bin]')
      .forEach(
        (button) =>
          (button.onclick = () => {
            const ok = button.dataset.bin === entry.id;
            appRoot()
              .querySelectorAll('[data-bin]')
              .forEach((other) => {
                other.disabled = true;
                if (other.dataset.bin === entry.id) other.classList.add('right');
              });
            if (!ok) button.classList.add('wrong');
            if (ok) score++;
            if (navigator.vibrate) navigator.vibrate(ok ? 8 : [20, 40, 20]);
            bottleIndex++;
            setTimeout(next, ok ? 450 : 1200);
          }),
      );
  };
  next();
}

/**
 * `renderOrder` - Function 🔢
 *
 * The steps game: the steps are shuffled, tap them in the order of service.
 *
 * @returns { void }
 */
function renderOrder() {
  showTabBar(false);
  const steps = page.setup.steps.map((step, index) => ({ step, index }));
  const shuffled = shuffle(steps);
  let nextIndex = 0,
    mistakes = 0;
  appRoot().innerHTML =
    `<div id="setPage">${flowBar(0, `0/${steps.length}`)}<div class="pad"><h2 class="qq">` +
    `${translate('Touchez les étapes dans l’ordre du service', 'Tap the steps in the order of service')}</h2><div class="opts">` +
    shuffled
      .map(
        ({ step, index }) =>
          `<button class="opt" data-step="${index}"><span class="k">${escapeHtml(step.icon)}</span><span>${escapeHtml(pick(step.title))}</span></button>`,
      )
      .join('') +
    `</div></div></div>`;
  appRoot()
    .querySelectorAll('[data-step]')
    .forEach(
      (button) =>
        (button.onclick = () => {
          if (Number(button.dataset.step) === nextIndex) {
            nextIndex++;
            button.disabled = true;
            button.classList.add('right');
            button.querySelector('.k').textContent = String(nextIndex);
            const fill = appRoot().querySelector('.flow .pbar i'),
              label = appRoot().querySelector('.flow .pl');
            if (fill) fill.style.width = (100 * nextIndex) / steps.length + '%';
            if (label) label.textContent = `${nextIndex}/${steps.length}`;
            if (nextIndex >= steps.length)
              setTimeout(
                () => renderResult('🔢', Math.max(0, steps.length - mistakes), steps.length, ''),
                600,
              );
          } else {
            mistakes++;
            button.classList.add('wrong');
            if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
            setTimeout(() => button.classList.remove('wrong'), 500);
          }
        }),
    );
}

/**
 * `renderResult` - Function 🏁
 *
 * @param { string } icon - the game's emoji
 * @param { number } score - the score
 * @param { number } total - out of (0 = points, the chrono)
 * @param { string } extra - an extra line (new record…)
 * @returns { void }
 */
function renderResult(icon, score, total, extra) {
  closeExtras();
  showTabBar(false);
  const ratio = total ? score / total : 1;
  appRoot().innerHTML =
    `<div id="setPage"><div class="pad setresult"><div class="setbig">${icon}</div>` +
    `<h1 class="ptitle">${total ? `${score} / ${total}` : `${score} pts`}</h1><div class="muted">` +
    `${ratio >= 0.9 ? translate('Parfait, vous êtes prêt pour le service !', 'Perfect, you’re ready for service!') : ratio >= 0.6 ? translate('Bien joué, encore un tour ?', 'Well done, one more round?') : translate('On recommence, ça va rentrer !', 'Let’s go again, it’ll stick!')}` +
    `</div>${extra ? `<div class="setdone">${escapeHtml(extra)}</div>` : ''}</div>` +
    `<div class="abar fixed"><button class="btn sec grow" data-go="back">${translate('Terminer', 'Done')}</button>` +
    `<button class="btn grow" data-go="${page.view}">↻ ${translate('Rejouer', 'Play again')}</button></div></div>`;
}

// the views of the page, by name 🗺️
const VIEWS = {
  page: renderPage,
  overview: renderOverview,
  check: renderCheck,
  study: renderStudy,
  quiz: renderQuiz,
  chrono: renderChrono,
  sort: renderSort,
  order: renderOrder,
};

/**
 * `render` - Function 🖼️
 *
 * @param { string } view - a view of the page
 * @returns { void }
 */
function render(view) {
  closeExtras();
  // a new run: delayed steps of the previous game stop here ⏹️
  page.run++;
  page.view = VIEWS[view] ? view : 'page';
  VIEWS[page.view]();
  window.scrollTo(0, 0);
}

/**
 * `openPage` - Function 📚
 *
 * Opens the Mise en place chapter page in place of the home screen (Back comes home).
 *
 * @returns { void }
 */
function openPage() {
  addStyles();
  page.setup = readCachedSetup();
  page.isOpen = true;
  history.pushState({ ltfSetup: 'page' }, '');
  render('page');
  // 🔄 the owner's latest version (redraw only the chapter page or the overview)
  loadSetup().then((latest) => {
    page.setup = latest;
    if (page.isOpen && (page.view === 'page' || page.view === 'overview')) render(page.view);
  });
}

/**
 * `leavePage` - Function 👋
 *
 * @returns { void } - back to the home screen
 */
function leavePage() {
  closeExtras();
  page.isOpen = false;
  if (typeof window.LTFgo === 'function') window.LTFgo('hub');
}

// 👆 the page's taps: tabs, modes, back, ticks
document.addEventListener('click', (event) => {
  if (!page.isOpen || !event.target.closest('#setPage')) return;
  const tab = event.target.closest('[data-tab]');
  if (tab) {
    page.tab = tab.dataset.tab;
    return render('page');
  }
  const tick = event.target.closest('[data-tick]');
  if (tick) {
    const ticks = readTicks();
    ticks[tick.dataset.tick] = !ticks[tick.dataset.tick];
    saveTicks(ticks);
    if (navigator.vibrate) navigator.vibrate(6);
    const scroll = window.scrollY;
    render('check');
    window.scrollTo(0, scroll);
    return;
  }
  const go = event.target.closest('[data-go]');
  if (!go) return;
  if (go.dataset.go === 'back') return history.back();
  // a game from the chapter page: one history step, so Back returns to the page
  if (page.view === 'page') history.pushState({ ltfSetup: go.dataset.go }, '');
  render(go.dataset.go);
});

// 🔙 Back while the page is open: a game goes back to the chapter page, the page goes home
addEventListener(
  'popstate',
  (event) => {
    if (!page.isOpen) return;
    event.stopImmediatePropagation();
    if (page.view !== 'page') render('page');
    else leavePage();
  },
  true,
);

// 👀 another tab of the app took over #app: the page is closed
new MutationObserver(() => {
  if (page.isOpen && !document.getElementById('setPage')) {
    closeExtras();
    page.isOpen = false;
  }
}).observe(document.body, { childList: true, subtree: true });

// ===== HOME 🏠 ===== //

/**
 * `addChapterRow` - Function 🏠
 *
 * Adds the « Mise en place » row at the top of the chapters on the home screen.
 *
 * @returns { void }
 */
function addChapterRow() {
  if (document.getElementById('setRow')) return;
  const heading = Array.from(document.querySelectorAll('#app .sh')).find((element) =>
    /^(Chapitres|Chapters)$/.test(element.textContent.trim()),
  );
  const firstChapter = heading && heading.nextElementSibling;
  if (!firstChapter || !firstChapter.classList.contains('li')) return;
  addStyles();
  const row = document.createElement('button');
  row.id = 'setRow';
  row.className = 'li';
  row.innerHTML =
    `<div class="av" style="font-size:21px">🧊</div><div class="tx"><div class="n">${translate('Mise en place', 'Setup')}</div>` +
    `<div class="muted">${translate('Les 3 seaux, les rouges & l’accueil du client', 'The 3 buckets, the reds & welcoming guests')}</div></div>` +
    `<div class="muted" style="font-size:22px;padding:0 6px">›</div>`;
  row.addEventListener('click', () => openPage());
  firstChapter.parentNode.insertBefore(row, firstChapter);
}

// 👀 watch for the home screen (both builds redraw `#app`)
new MutationObserver(addChapterRow).observe(document.body, { childList: true, subtree: true });
addChapterRow();

// 🌍 open it from anywhere (e.g. a link or the console)
window.LTFopenSetup = openPage;
