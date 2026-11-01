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
 * @name: Les Trois Forts - Live Content, Announcement & Resets
 * @file: pwa/content.js
 * @type: JavaScript (ES module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script type="module" src="content.js"
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 📡 What the owner changes in the dashboard reaches every phone from here:
// - 📝 `content/{section}` = { data: JSON text, ts }: dishes, wines, the daily briefing... saved in
//   localStorage `ltf_content_v1` and applied on the next start (pwa/content-boot.js). A banner offers
//   to reload right away.
// - 📣 `config/announce` = { text, on, ts }: a message banner for the whole team (✕ hides it until the next one)
// - ♻️ `config/resets` = { uid: ms }: the owner reset my XP → this phone starts my progress again
// Everybody can read content & the announcement (the menu is public); only the owner can write (rules 🛡️).

// import the Firebase app helpers (reuse the app `cloud.js` already created) 🔥
import { getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
// import the auth helpers 🔐
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
// import the Firestore helpers 🗃️
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===== FIREBASE 🔥 ===== //

// the Firebase app made by cloud.js (loaded first), its auth & its Firestore database 🚀
const firebaseApp = getApps()[0],
  auth = getAuth(firebaseApp),
  firestore = getFirestore(firebaseApp);

// ===== CONSTANTS 🧰 ===== //

// the storage keys (same as content-boot.js, cloud.js & board.js) 🗝️
const CONTENT_KEY = 'ltf_content_v1',
  BAD_KEY = 'ltf_content_bad',
  ANNOUNCE_SEEN_KEY = 'ltf_announce_seen',
  RESET_SEEN_KEY = 'ltf_reset_seen',
  PROGRESS_KEY = 'ltf_v1',
  SYNC_META_KEY = 'ltf_sync',
  ACTIVITY_KEY = 'ltf_board_v1';
// the sections of the menu data that can be edited live 📚
export const CONTENT_SECTIONS = [
  'dishes',
  'jour',
  'hq',
  'wines',
  'champagnes',
  'cocktails',
  'softs',
  'coffee',
  'coffeeNote',
  'teas',
  'digestifs',
  'fromages',
  'facts',
  'pairing',
  'taste',
  'tables',
  'counters',
];

// ===== HELPERS 🧰 ===== //

/**
 * `translate` - Function 🌐
 *
 * @param { string } french - the French text
 * @param { string } english - the English text
 * @returns { string } - the text in the app's language
 */
const translate = (french, english) => {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}').lang === 'en' ? english : french;
  } catch (error) {
    return french;
  }
};

/**
 * `escapeHtml` - Function 🛡️
 *
 * @param { any } value - the text to escape
 * @returns { string } - the escaped text
 */
const escapeHtml = (value) =>
  String(value === undefined || value === null ? '' : value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

/**
 * `banner` - Function 🎗️
 *
 * Shows a banner at the top of the screen (one per id).
 *
 * @param { string } id - the banner id
 * @param { string } html - its content (already escaped)
 * @returns { HTMLElement } - the banner
 */
function banner(id, html) {
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement('div');
    element.id = id;
    element.style.cssText =
      'position:fixed;left:10px;right:10px;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:60;' +
      'background:#1d1b16;color:#fff;border:1px solid #c9a24a;border-radius:14px;padding:11px 12px;' +
      'display:flex;gap:10px;align-items:center;box-shadow:0 8px 24px rgba(0,0,0,.25);font-size:14px';
    document.body.appendChild(element);
  }
  element.innerHTML = html;
  return element;
}

// ===== 📝 LIVE CONTENT ===== //

/**
 * `readLiveContent` - Async Function 📥
 *
 * @returns { Promise<object> } - the live content in the cloud { section: value } (only valid sections)
 */
export async function readLiveContent() {
  const snapshot = await getDocs(collection(firestore, 'content')),
    content = {};
  snapshot.docs.forEach((documentSnapshot) => {
    if (!CONTENT_SECTIONS.includes(documentSnapshot.id)) return;
    try {
      content[documentSnapshot.id] = JSON.parse(documentSnapshot.data().data);
    } catch (error) {}
  });
  return content;
}

/**
 * `storeLiveContent` - Function 💾
 *
 * @param { object } content - the live content { section: value }
 * @returns { boolean } - true when it differs from what this phone already has (a reload applies it)
 */
export function storeLiveContent(content) {
  const text = Object.keys(content).length ? JSON.stringify(content) : '';
  const current = localStorage.getItem(CONTENT_KEY) || '';
  // 🛟 the content that crashed this phone last time: don't take it again
  if (text && text === localStorage.getItem(BAD_KEY)) return false;
  if (text === current) return false;
  if (text) localStorage.setItem(CONTENT_KEY, text);
  else localStorage.removeItem(CONTENT_KEY);
  return true;
}

/**
 * `syncLiveContent` - Async Function 🔄
 *
 * Downloads the live content and offers a reload when it changed.
 *
 * @returns { Promise<void> }
 */
async function syncLiveContent() {
  try {
    if (!storeLiveContent(await readLiveContent())) return;
    const element = banner(
      'ltfContentBanner',
      '<span style="font-size:20px">📥</span><span style="flex:1">' +
        translate('Le contenu de la carte a été mis à jour.', 'The menu content was updated.') +
        '</span><button class="btn sm" id="ltfContentReload" style="padding:7px 12px">' +
        translate('Recharger', 'Reload') +
        '</button>',
    );
    element.querySelector('#ltfContentReload').onclick = () => location.reload();
  } catch (error) {
    // offline: the content saved on this phone stays 📴
  }
}

// ===== 📣 ANNOUNCEMENT ===== //

/**
 * `showAnnouncement` - Async Function 📣
 *
 * Shows the owner's message to the team, until ✕ (then until the next message).
 *
 * @returns { Promise<void> }
 */
async function showAnnouncement() {
  try {
    const snapshot = await getDoc(doc(firestore, 'config', 'announce'));
    if (!snapshot.exists()) return;
    const announcement = snapshot.data(),
      stamp = String(announcement.ts || '');
    if (!announcement.on || !announcement.text || localStorage.getItem(ANNOUNCE_SEEN_KEY) === stamp) return;
    const element = banner(
      'ltfAnnounce',
      '<span style="font-size:20px">📣</span><span style="flex:1;white-space:pre-wrap">' +
        escapeHtml(announcement.text) +
        '</span><button aria-label="close" id="ltfAnnounceClose" style="background:none;border:0;color:#fff;font-size:20px">✕</button>',
    );
    element.querySelector('#ltfAnnounceClose').onclick = () => {
      localStorage.setItem(ANNOUNCE_SEEN_KEY, stamp);
      element.remove();
    };
  } catch (error) {}
}

// ===== ♻️ XP RESET ===== //

/**
 * `applyReset` - Async Function ♻️
 *
 * When the owner reset my XP after my last check: start my progress again (language, theme & sound
 * stay), upload it as the newest cloud copy, then reload.
 *
 * @param { object } signedInUser - the Firebase user
 * @returns { Promise<void> }
 */
async function applyReset(signedInUser) {
  try {
    const snapshot = await getDoc(doc(firestore, 'config', 'resets'));
    if (!snapshot.exists()) return;
    const resetAt = Number(snapshot.data()[signedInUser.uid] || 0);
    if (!resetAt || resetAt <= Number(localStorage.getItem(RESET_SEEN_KEY) || 0)) return;
    // ☁️ progress already restarted on another phone after the reset? keep it (cloud.js takes it)
    const cloudCopy = await getDoc(doc(firestore, 'users', signedInUser.uid));
    if (cloudCopy.exists() && Number(cloudCopy.data().ts || 0) > resetAt) {
      localStorage.setItem(RESET_SEEN_KEY, String(resetAt));
      return;
    }
    let old = {};
    try {
      old = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    } catch (error) {}
    const fresh = {
      xp: 0,
      m: {},
      best: {},
      review: [],
      streak: 0,
      last: null,
      sound: old.sound !== false,
      exam: null,
      lang: old.lang || 'fr',
    };
    if (old.theme) fresh.theme = old.theme;
    const text = JSON.stringify(fresh),
      now = Date.now();
    localStorage.setItem(PROGRESS_KEY, text);
    localStorage.removeItem(ACTIVITY_KEY);
    localStorage.setItem(RESET_SEEN_KEY, String(resetAt));
    localStorage.setItem(SYNC_META_KEY, JSON.stringify({ uid: signedInUser.uid, ts: now }));
    await setDoc(doc(firestore, 'users', signedInUser.uid), {
      s: text,
      ts: now,
      name: signedInUser.displayName || '',
      email: signedInUser.email || '',
    });
    location.reload();
  } catch (error) {}
}

// ===== BOOT 🚀 ===== //

// 📝📣 for everybody, signed in or not
syncLiveContent();
showAnnouncement();
// ♻️ for my account
onAuthStateChanged(auth, (signedInUser) => {
  if (signedInUser) applyReset(signedInUser);
});
