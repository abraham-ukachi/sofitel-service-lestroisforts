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
 *    -|> Accueil › Chapitres › « Mise en place » opens the setup drawer (Seaux · Rouges · Accueil · Check)
 *   2+|> import { SETUP_DEFAULT, cleanSetup } from './setup.js' (the dashboard editor, admin-edit.js)
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🧊 Mise en place: a chapter row on the home screen that slides up a drawer with four chips:
// - 🧊 Seaux: the three ice buckets of the bar, bottle by bottle (photo, type, how many, a note)
// - 🍷 Rouges: the red wines that stay at room temperature on the counter
// - 🤵 Accueil: the steps of service, from the coat at the door to the order
// - ✅ Check: tick every bottle while setting up (resets every day)
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
.setsheet .sbody{padding-top:4px}
.setchips{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:0 0 12px;padding:6px 0;position:sticky;
  top:0;z-index:2;background:var(--bar)}
.setintro{color:var(--mu);font-size:13.5px;margin:0 2px 12px;line-height:1.4}
.setcover{border-radius:20px;margin:0 0 14px}
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
 * `bucketsView` - Function 🧊
 *
 * @param { object } setup - the setup
 * @returns { string } - the three buckets
 */
function bucketsView(setup) {
  const total = setup.buckets.reduce(
    (sum, bucket) => sum + bucket.items.reduce((count, item) => count + item.qty, 0),
    0,
  );
  return (
    `<p class="setintro">${translate(
      `${setup.buckets.length} seaux remplis de glace, ${total} bouteilles. Mettez chaque bouteille dans son seau, étiquette vers l'extérieur.`,
      `${setup.buckets.length} buckets filled with ice, ${total} bottles. Put each bottle in its bucket, label facing out.`,
    )}</p><img class="setphoto setcover" src="img/setup-table.jpg" alt="" loading="lazy">` +
    setup.buckets.map((bucket, index) => groupHtml(bucket, String(index + 1))).join('')
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

/**
 * `checkView` - Function ✅
 *
 * @param { object } setup - the setup
 * @returns { string } - every bottle as a tick box, bucket by bucket, with a progress bar
 */
function checkView(setup) {
  const ticks = readTicks();
  const groups = setup.buckets
    .map((bucket, index) => ['b' + index, translate('Seau ', 'Bucket ') + (index + 1), bucket])
    .concat([['r', translate('Rouges', 'Reds'), setup.reds]]);
  let done = 0,
    total = 0;
  const rows = groups
    .map(([prefix, label, group]) => {
      const lines = group.items
        .map((item, index) => {
          const id = prefix + '-' + index;
          total++;
          if (ticks[id]) done++;
          return (
            `<button class="setcheck${ticks[id] ? ' done' : ''}" data-tick="${id}"><span class="setbox">` +
            `${ticks[id] ? '✓' : ''}</span><span class="grow">${escapeHtml(item.n)}</span>` +
            `<span class="setqty">×${item.qty}</span></button>`
          );
        })
        .join('');
      return `<div class="setgroup">${escapeHtml(label)} · ${escapeHtml(pick(group.name).split('·').pop().trim())}</div>${lines}`;
    })
    .join('');
  const percent = total ? Math.round((100 * done) / total) : 0;
  return (
    `<p class="setintro">${translate(
      `${done} / ${total} prêtes. Cochez chaque bouteille quand elle est en place (remis à zéro chaque jour).`,
      `${done} / ${total} ready. Tick each bottle once it's in place (resets every day).`,
    )}</p><div class="setprog"><i style="width:${percent}%"></i></div>` +
    (total && done === total
      ? `<div class="setdone">🎉 ${translate('Mise en place terminée !', 'Setup done!')}</div>`
      : '') +
    rows
  );
}

/**
 * `openSetup` - Function 🧊
 *
 * Slides up the Mise en place drawer (Seaux · Rouges · Accueil · Check).
 *
 * @param { string } [firstTab] - the chip to open on ('buckets' by default)
 * @returns { void }
 */
function openSetup(firstTab) {
  addStyles();
  const old = document.getElementById('setSheet');
  if (old) old.remove();
  const tabs = [
    ['buckets', '🧊 ' + translate('Seaux', 'Buckets')],
    ['reds', '🍷 ' + translate('Rouges', 'Reds')],
    ['steps', '🤵 ' + translate('Accueil', 'Service')],
    ['check', '✅ Check'],
  ];
  const overlay = document.createElement('div');
  overlay.id = 'setSheet';
  overlay.className = 'ov scrim';
  overlay.innerHTML =
    `<div class="sheet setsheet" role="dialog" aria-label="${translate('Mise en place', 'Setup')}"><div class="grab"></div>` +
    `<div class="sbody"><div class="setchips">` +
    tabs.map(([id, label]) => `<button class="chip" data-set="${id}">${label}</button>`).join('') +
    `</div><div id="setView"></div></div></div>`;
  const view = overlay.querySelector('#setView');
  let setup = readCachedSetup(),
    currentTab = firstTab || 'buckets';

  // 🔀 shows one of the four views
  const show = (tab) => {
    currentTab = tab;
    overlay
      .querySelectorAll('[data-set]')
      .forEach((chip) => chip.classList.toggle('on', chip.dataset.set === tab));
    if (tab === 'buckets') view.innerHTML = bucketsView(setup);
    else if (tab === 'reds') view.innerHTML = groupHtml(setup.reds, setup.reds.icon);
    else if (tab === 'steps') view.innerHTML = stepsView(setup);
    else view.innerHTML = checkView(setup);
  };
  overlay.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-set]');
    if (chip) {
      show(chip.dataset.set);
      overlay.querySelector('.sbody').scrollTop = 0;
      return;
    }
    // ✅ a tick in the checklist
    const tick = event.target.closest('[data-tick]');
    if (tick) {
      const ticks = readTicks();
      ticks[tick.dataset.tick] = !ticks[tick.dataset.tick];
      saveTicks(ticks);
      if (navigator.vibrate) navigator.vibrate(6);
      const scroll = overlay.querySelector('.sbody').scrollTop;
      show('check');
      overlay.querySelector('.sbody').scrollTop = scroll;
      return;
    }
    // 👋 a tap on the scrim closes the drawer
    if (event.target === overlay) {
      overlay.classList.add('out');
      setTimeout(() => overlay.remove(), 180);
    }
  });
  document.body.appendChild(overlay);
  show(currentTab);
  // 🔄 the owner's latest version (then redraw the open view)
  loadSetup().then((latest) => {
    setup = latest;
    if (document.body.contains(overlay)) show(currentTab);
  });
}

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
  row.addEventListener('click', () => openSetup());
  firstChapter.parentNode.insertBefore(row, firstChapter);
}

// 👀 watch for the home screen (both builds redraw `#app`)
new MutationObserver(addChapterRow).observe(document.body, { childList: true, subtree: true });
addChapterRow();

// 🌍 open it from anywhere (e.g. a link or the console)
window.LTFopenSetup = openSetup;
