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
 * @name: Les Trois Forts - About
 * @file: pwa/about.js
 * @type: JavaScript (module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script type="module" src="about.js"
 *    -|> Profil › « À propos de l'app » opens the About drawer (Infos · Parcours · Crédits)
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// ℹ️ About drawer: the « À propos » card of the Profil tab becomes a tappable row that slides up a drawer
// with three chips:
// - ℹ️ Infos: the big app logo, what the app is, the developer (Abraham Ukachi) + GitHub & X links
// - 🧭 Parcours: a vertical timeline of the app's journey, from the first HTML game to today
// - 🎬 Crédits: rolling movie-style credits of the people the owner adds in the dashboard
//   (Firestore `content/credits`, a JSON list of { name, role }, cached for offline use)
// Shared by the JS & the Rust builds (it only watches the Profil markup they both draw 🤝).

// import the Firebase app helpers (reuse the app `cloud.js` already created) 🔥
import { getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
// import the Firestore helpers 🗃️
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===== CONSTANTS 🧰 ===== //

// the saved progress & settings (for the language) 💾
const PROGRESS_KEY = 'ltf_v1';
// the offline copy of the credits 🎬
const CREDITS_KEY = 'ltf_credits_v1';
// the developer's social networks 🌐
const GITHUB_URL = 'https://github.com/abraham-ukachi';
const X_URL = 'https://x.com/abrahamukachi';

// the GitHub mark (24 × 24) 🐙
const GITHUB_PATH =
  'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04' +
  '-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084' +
  '-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605' +
  '-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005' +
  '-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645' +
  ' 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81' +
  ' 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627' +
  '-5.373-12-12-12';
// the X logo (24 × 24) ✖️
const X_PATH =
  'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594' +
  'l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z';

// the journey so far: [date, version, major?, FR, EN] (newest first) 🧭
const TIMELINE = [
  [
    '2026-11-03',
    '0.63.1',
    false,
    'Correctif : le chat du tableau de bord tient dans l’écran',
    'Fix: the dashboard chat fits the screen',
  ],
  [
    '2026-11-03',
    '0.63',
    false,
    'Tableau de bord : boutons-icônes, Annonce avec aperçu, Crédits revus',
    'Dashboard: icon buttons, Notice preview, new Credits editor',
  ],
  [
    '2026-11-03',
    '0.62',
    false,
    'Tableau de bord plus clair : chiffres clés, graphique XP, avatars',
    'Clearer dashboard: key stats, XP chart, avatars',
  ],
  [
    '2026-11-02',
    '0.61',
    false,
    'Page « À propos » : infos, parcours & crédits',
    'About drawer: info, journey & credits',
  ],
  [
    '2026-11-02',
    '0.60',
    true,
    'Version ordinateur (barre latérale) & SEO Google',
    'Laptop & desktop layout, Google SEO',
  ],
  [
    '2026-11-01',
    '0.59',
    false,
    'Scan plus précis, recherche tolérante aux fautes',
    'Sharper scan, typo-tolerant search',
  ],
  [
    '2026-11-01',
    '0.58',
    false,
    'Badges « Rupture » sur les vins épuisés',
    '« Rupture » badges on sold-out wines',
  ],
  ['2026-11-01', '0.57', false, 'Chapitre Menu Dégustation à part', 'Tasting menu gets its own chapter'],
  [
    '2026-11-01',
    '0.56',
    true,
    'La carte se modifie en direct, sans mise à jour',
    'Live menu editing, no redeploy',
  ],
  ['2026-11-01', '0.54', true, 'Tableau de bord du propriétaire', 'Owner dashboard'],
  ['2026-11-01', '0.52', false, 'Classement de l’équipe', 'Team leaderboard'],
  [
    '2026-11-01',
    '0.50',
    true,
    'Sécurité : chat réservé à l’équipe validée',
    'Security: chat for approved team only',
  ],
  [
    '2026-10-21',
    '0.49',
    false,
    'Phrases « À dire au client » plus naturelles',
    'More natural « What to tell the guest » lines',
  ],
  [
    '2026-10-20',
    '0.48',
    false,
    'Emojis, GIFs & stickers dans le chat',
    'Emojis, GIFs & stickers in the chat',
  ],
  ['2026-10-20', '0.47', false, 'Notifications push du chat', 'Chat push notifications'],
  ['2026-10-20', '0.46', true, 'Écran de bienvenue', 'Welcome screen'],
  ['2026-10-19', '0.43', true, 'Nouvelle adresse sur Vercel', 'New home on Vercel'],
  ['2026-10-19', '0.40', false, 'Échelle de force des fromages', 'Cheese strength scale'],
  ['2026-10-19', '0.39', true, 'Chat de l’équipe', 'Team chat'],
  ['2026-10-18', '0.30', true, 'Scan photo des plats & bouteilles', 'Photo scan of dishes & bottles'],
  ['2026-10-18', '0.29', false, 'Plan des tables du briefing', 'Briefing table plan'],
  ['2026-10-18', '0.25', true, 'Connexion Google & synchro cloud', 'Google sign-in & cloud sync'],
  ['2026-10-17', '0.20', false, 'Briefing du jour', 'Daily briefing'],
  ['2026-10-17', '0.18', false, 'Carte d’hiver & allergènes', 'Winter menu & allergens'],
  [
    '2026-10-16',
    '0.12',
    true,
    'Réécriture complète en Rust (WebAssembly)',
    'Full rewrite in Rust (WebAssembly)',
  ],
  ['2026-10-15', '0.11', true, 'Devient une vraie app (PWA), FR / EN', 'Becomes a real app (PWA), FR / EN'],
  [
    '2026-10-15',
    '0.1',
    true,
    'Naissance : un petit jeu HTML d’entraînement',
    'Born: a small HTML training game',
  ],
];

// the look of the drawer 🎨
const ABOUT_CSS = `
.abtrow{display:flex;align-items:center;gap:12px;width:100%;font-weight:600}
.abtrow .abtic{width:38px;height:38px;border-radius:12px;background:var(--pill);color:var(--gold);display:flex;
  align-items:center;justify-content:center;font-size:19px;flex:none}
.abtrow .abtsub{display:block;font-weight:400;font-size:12.5px;color:var(--mu);margin-top:2px}
.abtrow .abtgo{color:var(--mu);font-size:22px;line-height:1}
.abtsheet .sbody{padding-top:4px}
.abtchips{display:flex;gap:6px;justify-content:center;margin:0 0 12px;padding:6px 0;position:sticky;top:0;
  z-index:2;background:var(--bar)}
.abthead{text-align:center;padding:6px 0 4px}
.abtlogo{width:112px;height:112px;border-radius:28px;box-shadow:0 10px 30px rgba(0,0,0,.35);display:block;
  margin:0 auto 14px}
.abtname{font-family:Georgia,'Times New Roman',serif;font-size:23px;margin:0}
.abtver{color:var(--mu);font-size:12.5px;margin-top:4px}
.abtdev{display:flex;align-items:center;gap:12px}
.abtdev .grow b{display:block;font-size:16px}
.abtsoc{display:flex;gap:8px}
.abtsoc a{width:42px;height:42px;border-radius:21px;background:var(--sf2);color:var(--tx);display:flex;
  align-items:center;justify-content:center;text-decoration:none}
.abtsoc a:active{transform:scale(.94)}
.abttl{position:relative;margin:4px 0 6px;padding-left:22px}
.abttl::before{content:'';position:absolute;left:6px;top:6px;bottom:6px;width:2px;background:var(--line)}
.abtev{position:relative;padding:0 0 16px}
.abtev::before{content:'';position:absolute;left:-20px;top:4px;width:10px;height:10px;border-radius:5px;
  background:var(--bg);border:2px solid var(--mu)}
.abtev.major::before{left:-22px;top:2px;width:14px;height:14px;border-radius:7px;background:var(--gold);
  border-color:var(--gold);box-shadow:0 0 0 4px var(--pill)}
.abtev .abtwhen{font-size:11.5px;color:var(--mu)}
.abtev .abtwhen b{color:var(--gold);font-weight:700;margin-right:6px}
.abtev .abtwhat{margin-top:2px;line-height:1.35}
.abtev.major .abtwhat{font-weight:700}
.abtroll{position:relative;height:56vh;max-height:440px;overflow:hidden;border-radius:18px;background:var(--bg);
  -webkit-mask-image:linear-gradient(transparent,#000 14%,#000 86%,transparent);
  mask-image:linear-gradient(transparent,#000 14%,#000 86%,transparent)}
.abtroll .abtreel{position:absolute;left:0;right:0;top:0;text-align:center;animation:abtroll linear infinite}
.abtroll:active .abtreel{animation-play-state:paused}
.abtcr{padding:12px 16px}
.abtcr .abtrole{font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold)}
.abtcr .abtwho{font-family:Georgia,'Times New Roman',serif;font-size:19px;margin-top:3px}
.abtcrtitle{font-family:Georgia,'Times New Roman',serif;font-size:22px;color:var(--gold);padding:24px 16px 8px}
@keyframes abtroll{from{transform:translateY(var(--abt-from))}to{transform:translateY(var(--abt-to))}}
@media (prefers-reduced-motion:reduce){.abtroll{overflow:auto}.abtroll .abtreel{position:static;animation:none}}
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
 * `brandIcon` - Function 🏷️
 *
 * @param { string } path - an SVG path (24 × 24 view box)
 * @returns { string } - the icon's SVG
 */
function brandIcon(path) {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;
}

/**
 * `formatDate` - Function 📅
 *
 * @param { string } isoDate - a date like 2026-10-15
 * @returns { string } - the date written for people (15 oct. 2026 / Oct 15, 2026)
 */
function formatDate(isoDate) {
  const date = new Date(isoDate + 'T12:00:00');
  return date.toLocaleDateString(isEnglish() ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * `addStyles` - Function 🎨
 *
 * @returns { void } - adds the drawer's styles once
 */
function addStyles() {
  if (document.getElementById('abtStyle')) return;
  const style = document.createElement('style');
  style.id = 'abtStyle';
  style.textContent = ABOUT_CSS;
  document.head.appendChild(style);
}

// ===== CREDITS 🎬 ===== //

/**
 * `readCachedCredits` - Function 💾
 *
 * @returns { Array<{name: string, role: string}> } - the last credits seen (offline copy)
 */
function readCachedCredits() {
  try {
    const list = JSON.parse(localStorage.getItem(CREDITS_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch (error) {
    return [];
  }
}

/**
 * `loadCredits` - Async Function 🎬
 *
 * Reads the credits the owner manages in the dashboard (Firestore `content/credits`).
 *
 * @returns { Promise<Array<{name: string, role: string}>> } - the credits (the offline copy on failure)
 */
async function loadCredits() {
  try {
    const app = getApps()[0];
    if (!app) return readCachedCredits();
    const snapshot = await getDoc(doc(getFirestore(app), 'content', 'credits'));
    const list = snapshot.exists() ? JSON.parse(snapshot.data().data || '[]') : [];
    const clean = (Array.isArray(list) ? list : [])
      .filter((person) => person && person.name)
      .map((person) => ({
        name: String(person.name).slice(0, 80),
        role: String(person.role || '').slice(0, 80),
      }));
    localStorage.setItem(CREDITS_KEY, JSON.stringify(clean));
    return clean;
  } catch (error) {
    return readCachedCredits();
  }
}

// ===== VIEWS 🖼️ ===== //

/**
 * `infoView` - Function ℹ️
 *
 * @param { string } notesHtml - the app's own « À propos » notes (content, photos, allergens)
 * @returns { string } - the Infos view HTML
 */
function infoView(notesHtml) {
  const version = window.LTF_APP_VERSION || '';
  return (
    `<div class="abthead"><img class="abtlogo" src="icon-512.png" alt="Les Trois Forts" width="112" height="112">` +
    `<h2 class="abtname">Les Trois Forts</h2><div class="gold">Service Academy</div>` +
    `<div class="abtver">${translate('Version', 'Version')} ${escapeHtml(version)}</div></div>` +
    `<div class="card mt"><p style="margin-top:0">` +
    translate(
      'L’app d’entraînement des serveurs du restaurant Les Trois Forts, au 7ᵉ étage du Sofitel Marseille Vieux-Port : la carte, les vins, les accords, le briefing du jour, des quiz et un scan photo, pour servir avec assurance dès le premier service.',
      'The training app for the waiters of Les Trois Forts, on the 7th floor of the Sofitel Marseille Vieux-Port: the menu, the wines, the pairings, the daily briefing, quizzes and a photo scan, to serve with confidence from the very first shift.',
    ) +
    `</p><div class="muted sm">${notesHtml || ''}</div></div>` +
    `<div class="card abtdev"><div class="grow"><span class="muted sm">` +
    `${translate('Conçue & développée par', 'Designed & developed by')}</span><b>Abraham Ukachi</b>` +
    `<span class="muted sm">${translate('Serveur aux Trois Forts & développeur', 'Waiter at Les Trois Forts & developer')}</span></div>` +
    `<div class="abtsoc"><a href="${GITHUB_URL}" target="_blank" rel="noopener" aria-label="GitHub">` +
    `${brandIcon(GITHUB_PATH)}</a><a href="${X_URL}" target="_blank" rel="noopener" aria-label="X">` +
    `${brandIcon(X_PATH)}</a></div></div>` +
    `<p class="muted sm" style="text-align:center">© 2026 Abraham Ukachi. ${translate('Tous droits réservés.', 'All rights reserved.')}</p>`
  );
}

/**
 * `journeyView` - Function 🧭
 *
 * @returns { string } - the Parcours view HTML (a vertical timeline, newest first)
 */
function journeyView() {
  const events = TIMELINE.map(
    ([date, version, major, french, english]) =>
      `<div class="abtev${major ? ' major' : ''}"><div class="abtwhen"><b>v${version}</b>${formatDate(date)}</div>` +
      `<div class="abtwhat">${escapeHtml(translate(french, english))}</div></div>`,
  ).join('');
  return `<p class="muted sm" style="margin-top:0">${translate(
    'De l’idée à aujourd’hui. Les grandes étapes sont en or.',
    'From the first idea to today. Major milestones are in gold.',
  )}</p><div class="abttl">${events}</div>`;
}

/**
 * `creditsView` - Function 🎬
 *
 * @param { Array<{name: string, role: string}> | null } credits - the credits (null while loading)
 * @returns { string } - the Crédits view HTML (rolling from the bottom to the top)
 */
function creditsView(credits) {
  if (!credits)
    return `<p class="muted" style="text-align:center">${translate('Chargement…', 'Loading…')}</p>`;
  const people = [
    { name: 'Abraham Ukachi', role: translate('Création & développement', 'Created & developed by') },
  ]
    .concat(credits)
    .map(
      (person) =>
        `<div class="abtcr"><div class="abtrole">${escapeHtml(person.role)}</div>` +
        `<div class="abtwho">${escapeHtml(person.name)}</div></div>`,
    )
    .join('');
  return (
    `<div class="abtroll" id="abtRoll"><div class="abtreel" id="abtReel">` +
    `<div class="abtcrtitle">Les Trois Forts</div>${people}` +
    `<div class="abtcr muted sm">${translate('Merci à toute l’équipe 💛', 'Thank you to the whole team 💛')}</div>` +
    `</div></div><p class="muted sm" style="text-align:center">${translate(
      'Touchez pour mettre en pause',
      'Touch to pause',
    )}</p>`
  );
}

/**
 * `startRoll` - Function 🎞️
 *
 * Sets the credits' roll: from just below the box to just above it, at a steady reading speed.
 *
 * @param { HTMLElement } sheetBody - the drawer's body
 * @returns { void }
 */
function startRoll(sheetBody) {
  const roll = sheetBody.querySelector('#abtRoll'),
    reel = sheetBody.querySelector('#abtReel');
  if (!roll || !reel) return;
  const distance = roll.clientHeight + reel.offsetHeight;
  reel.style.setProperty('--abt-from', roll.clientHeight + 'px');
  reel.style.setProperty('--abt-to', -reel.offsetHeight + 'px');
  // ~40 px per second 🐢
  reel.style.animationDuration = Math.max(8, distance / 40) + 's';
}

// ===== DRAWER 🪟 ===== //

/**
 * `openAbout` - Function ℹ️
 *
 * Slides up the About drawer (Infos · Parcours · Crédits).
 *
 * @param { string } notesHtml - the app's own « À propos » notes
 * @returns { void }
 */
function openAbout(notesHtml) {
  addStyles();
  const old = document.getElementById('abtSheet');
  if (old) old.remove();
  const tabs = [
    ['info', 'ℹ️ ' + translate('Infos', 'Info')],
    ['journey', '🧭 ' + translate('Parcours', 'Journey')],
    ['credits', '🎬 ' + translate('Crédits', 'Credits')],
  ];
  const overlay = document.createElement('div');
  overlay.id = 'abtSheet';
  overlay.className = 'ov scrim';
  overlay.innerHTML =
    `<div class="sheet abtsheet" role="dialog" aria-label="${translate('À propos', 'About')}"><div class="grab"></div>` +
    `<div class="sbody"><div class="abtchips">` +
    tabs.map(([id, label]) => `<button class="chip" data-abt="${id}">${label}</button>`).join('') +
    `</div><div id="abtView"></div></div></div>`;
  const view = overlay.querySelector('#abtView');
  let credits = null;

  // 🔀 shows one of the three views
  const show = (tab) => {
    overlay
      .querySelectorAll('[data-abt]')
      .forEach((chip) => chip.classList.toggle('on', chip.dataset.abt === tab));
    if (tab === 'info') view.innerHTML = infoView(notesHtml);
    else if (tab === 'journey') view.innerHTML = journeyView();
    else {
      view.innerHTML = creditsView(credits);
      startRoll(view);
      if (!credits)
        loadCredits().then((list) => {
          credits = list;
          if (overlay.querySelector('[data-abt="credits"].on')) show('credits');
        });
    }
  };
  overlay.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-abt]');
    if (chip) return show(chip.dataset.abt);
    // 👋 a tap on the scrim closes the drawer
    if (event.target === overlay) {
      overlay.classList.add('out');
      setTimeout(() => overlay.remove(), 180);
    }
  });
  document.body.appendChild(overlay);
  show('info');
}

// ===== PROFIL 👤 ===== //

/**
 * `upgradeProfile` - Function 👤
 *
 * Turns the « À propos » card of the Profil tab into one tappable row that opens the drawer.
 *
 * @returns { void }
 */
function upgradeProfile() {
  if (document.getElementById('abtRow')) return;
  const heading = Array.from(document.querySelectorAll('#app .sh')).find((element) =>
    /^(À propos|About)$/.test(element.textContent.trim()),
  );
  const card = heading && heading.nextElementSibling;
  if (!card || !card.classList.contains('card')) return;
  addStyles();
  const notesHtml = card.innerHTML;
  const row = document.createElement('button');
  row.id = 'abtRow';
  row.className = 'card abtrow';
  row.innerHTML =
    `<span class="abtic">ℹ️</span><span class="grow">${translate('À propos de l’app', 'About the app')}` +
    `<span class="abtsub">${translate('Infos, parcours & crédits', 'Info, journey & credits')}</span></span>` +
    `<span class="abtgo">›</span>`;
  row.addEventListener('click', () => openAbout(notesHtml));
  card.style.display = 'none';
  card.parentNode.insertBefore(row, card);
}

// 👀 watch for the Profil tab (both builds redraw `#app`)
new MutationObserver(upgradeProfile).observe(document.body, { childList: true, subtree: true });
upgradeProfile();

// 🌍 open it from anywhere (e.g. the console)
window.LTFabout = () => openAbout('');
