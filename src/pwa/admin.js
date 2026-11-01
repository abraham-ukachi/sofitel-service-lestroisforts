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
 * @name: Les Trois Forts - Owner Dashboard
 * @file: pwa/admin.js
 * @type: JavaScript (ES module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script type="module" src="admin.js"
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🛠️ Owner dashboard: everything behind the scenes of the app, for the owner's Google account only.
// - 🗄️ Firestore storage: every collection read & weighed with Firestore's own document-size rules,
//   against the 1 GiB of the free Spark plan (chat photos included)
// - 👥 the team, the access requests & every account that ever signed in
// - 💬 the chat (messages, photos, GIFs, who talks the most), 🏆 the leaderboard, 🔔 the push devices
// - 🚀 the live deployment (Vercel `/api/admin`, checked with the owner's Firebase token) & this phone
// 🔐 Three locks: the button only shows for the owner, the Firestore rules (`isOwner()` = verified
// owner email) refuse everybody else, and `/api/admin` verifies the Google signature of the token.

// import the Firebase app helpers (reuse the app `cloud.js` already created) 🔥
import { getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
// import the auth helpers 🔐
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
// import the Firestore helpers 🗃️
import {
  getFirestore,
  collection,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
// import the hands-on tabs (manage, content, announcement) 🎛️
import { renderManage, renderContent, renderAnnounce } from './admin-edit.js';

// ===== FIREBASE 🔥 ===== //

// the Firebase app made by cloud.js (loaded first), its auth & its Firestore database 🚀
const firebaseApp = getApps()[0],
  auth = getAuth(firebaseApp),
  firestore = getFirestore(firebaseApp);

// ===== CONSTANTS 🧰 ===== //

// the owner of the app: the only account that sees the dashboard (the rules check the same) 👑
const OWNER_EMAIL = 'abrahamukachi@gmail.com';
// the free Firestore storage of the Spark plan (1 GiB) 🗄️
const STORAGE_LIMIT = 1024 * 1024 * 1024;
// the daily free reads & writes of the Spark plan 📊
const DAILY_READS = 50000;
const DAILY_WRITES = 20000;
// the collections of the app, with what they hold (FR / EN) 📚
const COLLECTIONS = [
  ['users', 'Progression synchronisée', 'Synced progress'],
  ['team', 'Équipe approuvée', 'Approved team'],
  ['requests', "Demandes d'accès", 'Access requests'],
  ['chat', 'Messages du chat', 'Chat messages'],
  ['board', 'Classement', 'Leaderboard'],
  ['push', 'Appareils notifiés', 'Push devices'],
  ['pushlog', 'Journal des notifications', 'Push log'],
];
// the localStorage key of the app's progress (for the language) 🎓
const PROGRESS_KEY = 'ltf_v1';

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
 * @param { any } value - the text to escape (`&`, `<`, `>`, `"` and `'`)
 * @returns { string } - the escaped text
 */
const escapeHtml = (value) =>
  String(value === undefined || value === null ? '' : value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

/**
 * `formatBytes` - Function 📏
 *
 * @param { number } bytes - a size
 * @returns { string } - the size for humans ("12.4 KB", "1.2 MB")
 */
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = Math.max(0, bytes || 0),
    unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return (unitIndex ? size.toFixed(size < 10 ? 2 : 1) : String(Math.round(size))) + ' ' + units[unitIndex];
}

/**
 * `utf8Size` - Function 🔤
 *
 * @param { string } text - a text
 * @returns { number } - its size in UTF-8 bytes
 */
const utf8Size = (text) => new TextEncoder().encode(String(text)).length;

/**
 * `valueSize` - Function ⚖️
 *
 * The storage size of one Firestore value (Firestore's documented rules: string = UTF-8 + 1,
 * number & timestamp = 8, boolean & null = 1, map = its keys + 1 and values, array = its values).
 *
 * @param { any } value - a value read from Firestore
 * @returns { number } - its size in bytes
 */
function valueSize(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return 1;
  if (typeof value === 'number') return 8;
  if (typeof value === 'string') return utf8Size(value) + 1;
  // ⏱️ a Firestore Timestamp
  if (typeof value.toMillis === 'function') return 8;
  // 📍 a GeoPoint
  if (typeof value.latitude === 'number' && typeof value.longitude === 'number') return 16;
  // 🔗 a document reference
  if (typeof value.path === 'string' && value.firestore) return utf8Size(value.path) + 16;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + valueSize(item), 0);
  if (typeof value === 'object') return fieldsSize(value);
  return 8;
}

/**
 * `fieldsSize` - Function ⚖️
 *
 * @param { object } fields - the fields of a document (or of a map)
 * @returns { number } - their size: every key (UTF-8 + 1) and every value
 */
function fieldsSize(fields) {
  return Object.entries(fields).reduce((sum, [key, value]) => sum + utf8Size(key) + 1 + valueSize(value), 0);
}

/**
 * `documentSize` - Function 📄
 *
 * @param { string } collectionId - the collection
 * @param { string } documentId - the document id
 * @param { object } data - the document's fields
 * @returns { number } - its stored size: its name (each path part + 1, + 16) + its fields + 32
 */
const documentSize = (collectionId, documentId, data) =>
  utf8Size(collectionId) + 1 + utf8Size(documentId) + 1 + 16 + fieldsSize(data) + 32;

/**
 * `toDate` - Function 📅
 *
 * @param { any } value - a Firestore Timestamp, a number of ms or nothing
 * @returns { Date | null } - the date, or null
 */
function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(typeof value === 'number' ? value : String(value));
  return isNaN(date) ? null : date;
}

/**
 * `whenText` - Function 🕰️
 *
 * @param { Date | null } date - a date
 * @returns { string } - "il y a 5 min", "hier", "12 oct." ... ('–' without a date)
 */
function whenText(date) {
  if (!date) return '–';
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return translate("à l'instant", 'just now');
  if (minutes < 60) return translate('il y a ' + minutes + ' min', minutes + ' min ago');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return translate('il y a ' + hours + ' h', hours + ' h ago');
  const days = Math.round(hours / 24);
  if (days < 7) return translate('il y a ' + days + ' j', days + ' d ago');
  return date.toLocaleDateString(translate('fr-FR', 'en-GB'), { day: 'numeric', month: 'short' });
}

/**
 * `isOwner` - Function 👑
 *
 * @param { object | null } signedInUser - the Firebase user
 * @returns { boolean } - true for the owner's verified Google account only
 */
const isOwner = (signedInUser) =>
  !!signedInUser && signedInUser.email === OWNER_EMAIL && signedInUser.emailVerified === true;

// ===== STATE 📦 ===== //

// the signed-in Google user (or null) 👤
let user = null;
// the open dashboard (or null) 📺
let overlay = null;
// true while the dashboard loads 🔄
let loading = false;
// the open tab ('overview' | 'manage' | 'content' | 'announce') 🗂️
let currentTab = 'overview';
// the tabs of the dashboard (id, FR, EN) 📑
const TABS = [
  ['overview', '📊 Aperçu', '📊 Overview'],
  ['manage', '👥 Gérer', '👥 Manage'],
  ['content', '📝 Contenu', '📝 Content'],
  ['announce', '📣 Annonce', '📣 Announce'],
];

// ===== GATHER THE NUMBERS 📥 ===== //

/**
 * `readCollection` - Async Function 📥
 *
 * @param { string } collectionId - a collection
 * @returns { Promise<{ id: string, docs: Array, bytes: number, error: string }> } - its docs & their size
 */
async function readCollection(collectionId) {
  try {
    const snapshot = await getDocs(collection(firestore, collectionId));
    const docs = snapshot.docs.map((documentSnapshot) => {
      const data = documentSnapshot.data();
      return {
        id: documentSnapshot.id,
        data: data,
        bytes: documentSize(collectionId, documentSnapshot.id, data),
      };
    });
    return {
      id: collectionId,
      docs: docs,
      bytes: docs.reduce((sum, item) => sum + item.bytes, 0),
      error: '',
    };
  } catch (error) {
    return { id: collectionId, docs: [], bytes: 0, error: String((error && error.code) || error) };
  }
}

/**
 * `readServer` - Async Function 🚀
 *
 * @returns { Promise<object | null> } - the live deployment info from `/api/admin` (owner token only)
 */
async function readServer() {
  try {
    const token = await user.getIdToken();
    const answer = await fetch('/api/admin', { headers: { Authorization: 'Bearer ' + token } });
    return answer.ok ? await answer.json() : { error: 'HTTP ' + answer.status };
  } catch (error) {
    return { error: String(error) };
  }
}

/**
 * `readDevice` - Async Function 📱
 *
 * @returns { Promise<object> } - this phone's storage: quota, usage, caches & local keys
 */
async function readDevice() {
  const device = { usage: 0, quota: 0, persisted: false, caches: [], localBytes: 0 };
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      device.usage = estimate.usage || 0;
      device.quota = estimate.quota || 0;
    }
    if (navigator.storage && navigator.storage.persisted)
      device.persisted = await navigator.storage.persisted();
  } catch (error) {}
  try {
    if (window.caches) device.caches = await caches.keys();
  } catch (error) {}
  // 💾 the size of localStorage (keys + values, UTF-16 = 2 bytes a character)
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    device.localBytes += 2 * (key.length + (localStorage.getItem(key) || '').length);
  }
  return device;
}

/**
 * `gather` - Async Function 📊
 *
 * @returns { Promise<object> } - every collection, the server & this phone, read at the same time
 */
async function gather() {
  const [collections, server, device] = await Promise.all([
    Promise.all(COLLECTIONS.map(([collectionId]) => readCollection(collectionId))),
    readServer(),
    readDevice(),
  ]);
  const byId = {};
  collections.forEach((item) => (byId[item.id] = item));
  return { collections: collections, byId: byId, server: server, device: device, at: new Date() };
}

// ===== DRAW 🎨 ===== //

/**
 * `cardHtml` - Function 🗂️
 *
 * @param { string } title - the card title (with its emoji)
 * @param { string } body - the card content (HTML, already escaped)
 * @returns { string } - one dashboard card
 */
const cardHtml = (title, body) =>
  '<div class="card" style="margin:0 0 12px"><div style="font-weight:800;margin-bottom:8px">' +
  title +
  '</div>' +
  body +
  '</div>';

/**
 * `tileHtml` - Function 🔢
 *
 * @param { string } label - what the number is
 * @param { string } value - the number (already escaped)
 * @returns { string } - one tile of a stats grid
 */
const tileHtml = (label, value) =>
  '<div style="background:rgba(127,127,127,.08);border-radius:12px;padding:9px 11px"><div style="font-weight:800;font-size:17px">' +
  value +
  '</div><div class="muted sm">' +
  label +
  '</div></div>';

/**
 * `gridHtml` - Function 🔲
 *
 * @param { Array<string> } tiles - the tiles
 * @returns { string } - a 2-column grid of tiles
 */
const gridHtml = (tiles) =>
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + tiles.join('') + '</div>';

/**
 * `lineHtml` - Function ➖
 *
 * @param { string } left - the left text (already escaped)
 * @param { string } right - the right text (already escaped)
 * @returns { string } - one "label ........ value" line
 */
const lineHtml = (left, right) =>
  '<div class="row" style="justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid rgba(127,127,127,.12)"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">' +
  left +
  '</span><b style="flex:none">' +
  right +
  '</b></div>';

/**
 * `meterHtml` - Function 📶
 *
 * @param { number } used - the part used
 * @param { number } limit - the whole
 * @returns { string } - a progress bar (gold, red past 80 %)
 */
function meterHtml(used, limit) {
  const percent = Math.min(100, (100 * used) / Math.max(1, limit));
  return (
    '<div class="bar" style="margin:8px 0 4px"><i style="width:' +
    Math.max(percent, used ? 0.6 : 0).toFixed(2) +
    '%' +
    (percent > 80 ? ';background:#e5484d' : '') +
    '"></i></div>'
  );
}

/**
 * `storageHtml` - Function 🗄️
 *
 * @param { object } data - the gathered numbers
 * @returns { string } - the Firestore storage card: total vs 1 GiB, then each collection
 */
function storageHtml(data) {
  const total = data.collections.reduce((sum, item) => sum + item.bytes, 0),
    documentCount = data.collections.reduce((sum, item) => sum + item.docs.length, 0),
    percent = (100 * total) / STORAGE_LIMIT;
  const rows = data.collections
    .slice()
    .sort((first, second) => second.bytes - first.bytes)
    .map((item) => {
      const names = COLLECTIONS.find(([collectionId]) => collectionId === item.id);
      return lineHtml(
        escapeHtml(item.id) +
          ' <span class="muted sm">' +
          escapeHtml(translate(names[1], names[2])) +
          ' · ' +
          item.docs.length +
          ' doc' +
          (item.docs.length > 1 ? 's' : '') +
          '</span>' +
          (item.error
            ? ' <span style="color:#e5484d" class="sm">⚠️ ' + escapeHtml(item.error) + '</span>'
            : ''),
        formatBytes(item.bytes),
      );
    })
    .join('');
  return cardHtml(
    '🗄️ ' + translate('Stockage Firestore', 'Firestore storage'),
    '<div class="row" style="justify-content:space-between;align-items:baseline"><span style="font-size:24px;font-weight:800">' +
      formatBytes(total) +
      '</span><span class="muted">/ 1 GiB · ' +
      (percent < 0.01 && total ? '< 0.01' : percent.toFixed(2)) +
      ' %</span></div>' +
      meterHtml(total, STORAGE_LIMIT) +
      '<div class="muted sm" style="margin-bottom:6px">' +
      documentCount +
      ' documents · ' +
      formatBytes(Math.max(0, STORAGE_LIMIT - total)) +
      ' ' +
      translate('libres', 'free') +
      '</div>' +
      rows +
      '<p class="muted sm" style="margin:8px 0 0">' +
      translate(
        'Calculé en direct avec les règles de taille de Firestore (sans les index, qui ajoutent un peu). Quotas gratuits : 50 000 lectures et 20 000 écritures par jour.',
        "Measured live with Firestore's size rules (indexes, which add a little, aren't counted). Free quotas: 50,000 reads and 20,000 writes a day.",
      ) +
      '</p>',
  );
}

/**
 * `chatHtml` - Function 💬
 *
 * @param { object } data - the gathered numbers
 * @returns { string } - the chat card: messages, photos, GIFs, stickers, the busiest people
 */
function chatHtml(data) {
  const messages = data.byId.chat.docs,
    dayAgo = Date.now() - 86400000,
    weekAgo = Date.now() - 7 * 86400000,
    photos = messages.filter((message) => message.data.img),
    photoBytes = photos.reduce((sum, message) => sum + utf8Size(message.data.img), 0),
    authors = {};
  let lastMessage = null;
  messages.forEach((message) => {
    const name = String(message.data.name || 'Staff');
    authors[name] = (authors[name] || 0) + 1;
    const date = toDate(message.data.ts);
    if (date && (!lastMessage || date > lastMessage)) lastMessage = date;
  });
  const countSince = (time) => messages.filter((message) => (toDate(message.data.ts) || 0) >= time).length;
  const busiest = Object.entries(authors)
    .sort((first, second) => second[1] - first[1])
    .slice(0, 5)
    .map(([name, count]) => lineHtml(escapeHtml(name), count + ' msg'))
    .join('');
  return cardHtml(
    '💬 Chat',
    gridHtml([
      tileHtml('Messages', String(messages.length)),
      tileHtml(translate('Dernières 24 h', 'Last 24 h'), String(countSince(dayAgo))),
      tileHtml(translate('7 derniers jours', 'Last 7 days'), String(countSince(weekAgo))),
      tileHtml(translate('Dernier message', 'Last message'), escapeHtml(whenText(lastMessage))),
      tileHtml(translate('Photos', 'Photos'), photos.length + ' · ' + formatBytes(photoBytes)),
      tileHtml(
        'GIFs · stickers',
        messages.filter((message) => message.data.gif).length +
          ' · ' +
          messages.filter((message) => message.data.sticker).length,
      ),
    ]) +
      (busiest
        ? '<div class="muted sm" style="margin:12px 0 2px">' +
          translate('Les plus bavards', 'Most active') +
          '</div>' +
          busiest
        : ''),
  );
}

/**
 * `teamHtml` - Function 👥
 *
 * @param { object } data - the gathered numbers
 * @returns { string } - the team card: members, admins, requests, every account & its last sync
 */
function teamHtml(data) {
  const team = data.byId.team.docs,
    requests = data.byId.requests.docs,
    accounts = data.byId.users.docs,
    pending = requests.filter((request) => !request.data.refused),
    weekAgo = Date.now() - 7 * 86400000;
  const accountRows = accounts
    .slice()
    .sort((first, second) => (toDate(second.data.ts) || 0) - (toDate(first.data.ts) || 0))
    .map((account) => {
      const member = team.find((teammate) => teammate.id === account.id);
      return lineHtml(
        escapeHtml(account.data.name || account.data.email || 'Staff') +
          ' <span class="muted sm">' +
          (member
            ? member.data.role === 'admin'
              ? '👑 admin'
              : '✅ ' + translate('équipe', 'team')
            : '⏳') +
          '</span>',
        escapeHtml(whenText(toDate(account.data.ts))),
      );
    })
    .join('');
  return cardHtml(
    '👥 ' + translate('Équipe & comptes', 'Team & accounts'),
    gridHtml([
      tileHtml(translate('Membres', 'Members'), String(team.length)),
      tileHtml('Admins', String(team.filter((teammate) => teammate.data.role === 'admin').length)),
      tileHtml(translate('Demandes en attente', 'Pending requests'), String(pending.length)),
      tileHtml(translate('Demandes refusées', 'Refused requests'), String(requests.length - pending.length)),
      tileHtml(translate('Comptes Google', 'Google accounts'), String(accounts.length)),
      tileHtml(
        translate('Actifs (7 j)', 'Active (7 d)'),
        String(accounts.filter((account) => (toDate(account.data.ts) || 0) >= weekAgo).length),
      ),
    ]) +
      (accountRows
        ? '<div class="muted sm" style="margin:12px 0 2px">' +
          translate('Dernière synchro par compte', 'Last sync per account') +
          '</div>' +
          accountRows
        : ''),
  );
}

/**
 * `boardHtml` - Function 🏆
 *
 * @param { object } data - the gathered numbers
 * @returns { string } - the leaderboard card: XP of the team, this month, the last 7 days
 */
function boardHtml(data) {
  const entries = data.byId.board.docs.map((entry) => entry.data),
    now = new Date(),
    month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'),
    totalXp = entries.reduce((sum, entry) => sum + (+entry.xp || 0), 0),
    monthXp = entries.reduce(
      (sum, entry) => sum + (entry.month === month ? Math.max(0, (+entry.xp || 0) - (+entry.base || 0)) : 0),
      0,
    ),
    weekKeys = Array.from({ length: 7 }, (unused, index) => {
      const day = new Date();
      day.setDate(day.getDate() - index);
      return (
        day.getFullYear() +
        '-' +
        String(day.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(day.getDate()).padStart(2, '0')
      );
    }),
    weekXp = entries.reduce(
      (sum, entry) => sum + weekKeys.reduce((daySum, key) => daySum + (+(entry.days || {})[key] || 0), 0),
      0,
    ),
    right = entries.reduce((sum, entry) => sum + (+entry.right || 0), 0),
    answered = right + entries.reduce((sum, entry) => sum + (+entry.wrong || 0), 0);
  return cardHtml(
    '🏆 ' + translate('Classement & apprentissage', 'Leaderboard & learning'),
    gridHtml([
      tileHtml(translate('Joueurs', 'Players'), String(entries.length)),
      tileHtml(translate('XP de l’équipe', 'Team XP'), String(totalXp)),
      tileHtml(translate('XP ce mois', 'XP this month'), String(monthXp)),
      tileHtml(translate('XP (7 j)', 'XP (7 d)'), String(weekXp)),
      tileHtml(translate('Réponses données', 'Answers given'), String(answered)),
      tileHtml(
        translate('Bonnes réponses', 'Right answers'),
        answered ? Math.round((100 * right) / answered) + ' %' : '–',
      ),
    ]),
  );
}

/**
 * `serverHtml` - Function 🚀
 *
 * @param { object } data - the gathered numbers
 * @returns { string } - the app & server card: version, live deployment, push devices
 */
function serverHtml(data) {
  const server = data.server || {},
    pushDevices = data.byId.push.docs.reduce(
      (sum, device) => sum + (Array.isArray(device.data.subs) ? device.data.subs.length : 1),
      0,
    );
  const lines = [
    lineHtml(translate("Version de l'app", 'App version'), 'v' + escapeHtml(window.LTF_APP_VERSION || '?')),
    lineHtml(
      translate('Statut du serveur', 'Server status'),
      server.error ? '⚠️ ' + escapeHtml(server.error) : '✅ OK',
    ),
  ];
  if (!server.error) {
    lines.push(
      lineHtml(
        translate('Déploiement', 'Deployment'),
        escapeHtml(String(server.deployment || '–').slice(0, 24)),
      ),
      lineHtml('Commit', escapeHtml(String(server.commit || '–').slice(0, 7))),
      lineHtml(translate('Région', 'Region'), escapeHtml(server.region || '–')),
      lineHtml('Node.js', escapeHtml(server.node || '–')),
      lineHtml(translate('Notifications push', 'Push notifications'), server.push ? '✅' : '⚠️'),
      lineHtml(translate('Heure du serveur', 'Server time'), escapeHtml(whenText(toDate(server.time)))),
    );
  }
  lines.push(
    lineHtml(
      translate('Comptes avec notifications', 'Accounts with push'),
      String(data.byId.push.docs.length),
    ),
    lineHtml(translate('Appareils notifiés', 'Push devices'), String(pushDevices)),
    lineHtml(translate('Notifications envoyées', 'Pushes sent'), String(data.byId.pushlog.docs.length)),
  );
  return cardHtml('🚀 ' + translate('App & serveur', 'App & server'), lines.join(''));
}

/**
 * `deviceHtml` - Function 📱
 *
 * @param { object } data - the gathered numbers
 * @returns { string } - this phone's card: storage used / allowed, caches, offline data
 */
function deviceHtml(data) {
  const device = data.device;
  return cardHtml(
    '📱 ' + translate('Ce téléphone', 'This phone'),
    (device.quota
      ? '<div class="row" style="justify-content:space-between"><b>' +
        formatBytes(device.usage) +
        '</b><span class="muted">/ ' +
        formatBytes(device.quota) +
        '</span></div>' +
        meterHtml(device.usage, device.quota)
      : '') +
      lineHtml(translate('Données locales', 'Local data'), formatBytes(device.localBytes)) +
      lineHtml(
        translate('Stockage protégé', 'Persistent storage'),
        device.persisted ? '✅' : translate('non', 'no'),
      ) +
      lineHtml(translate('Caches hors-ligne', 'Offline caches'), escapeHtml(device.caches.join(', ') || '–')),
  );
}

/**
 * `dashboardHtml` - Function 🛠️
 *
 * @param { object } data - the gathered numbers
 * @returns { string } - the whole dashboard
 */
function dashboardHtml(data) {
  return (
    storageHtml(data) +
    teamHtml(data) +
    chatHtml(data) +
    boardHtml(data) +
    serverHtml(data) +
    deviceHtml(data) +
    '<p class="muted sm" style="text-align:center;margin:4px 0 20px">' +
    translate('Mis à jour ', 'Updated ') +
    escapeHtml(data.at.toLocaleTimeString(translate('fr-FR', 'en-GB'))) +
    ' · ' +
    translate(
      'quotas Google exacts : console Firebase › Utilisation',
      'exact Google quotas: Firebase console › Usage',
    ) +
    '</p>'
  );
}

// ===== THE DASHBOARD SCREEN 📺 ===== //

/**
 * `refresh` - Async Function 🔄
 *
 * Reads everything again and redraws the dashboard.
 *
 * @returns { Promise<void> }
 */
async function refresh() {
  if (!overlay || loading || !isOwner(user)) return;
  loading = true;
  const body = overlay.querySelector('.cbody'),
    button = overlay.querySelector('#admRefresh');
  if (button) button.style.opacity = '0.4';
  if (!body.dataset.ready)
    body.innerHTML =
      '<p class="muted" style="text-align:center;margin-top:40px">' +
      translate('Chargement…', 'Loading…') +
      '</p>';
  try {
    // 📝📣 the content & announcement tabs read their own data
    if (currentTab === 'content') await renderContent(body);
    else if (currentTab === 'announce') await renderAnnounce(body);
    else {
      const data = await gather();
      // closed meanwhile? nothing to draw
      if (!overlay) return;
      if (currentTab === 'manage') renderManage(body, data, user, reloadSoon);
      else {
        body.onclick = null;
        body.innerHTML = dashboardHtml(data);
      }
    }
    body.dataset.ready = '1';
  } catch (error) {
    body.innerHTML = '<p class="muted">⚠️ ' + escapeHtml(String(error)) + '</p>';
  } finally {
    loading = false;
    if (button) button.style.opacity = '';
  }
}

/**
 * `reloadSoon` - Function 🔄
 *
 * Reads everything again right after a change (waits for a refresh already running).
 *
 * @returns { void }
 */
function reloadSoon() {
  if (loading) setTimeout(reloadSoon, 300);
  else refresh();
}

/**
 * `showTab` - Function 📑
 *
 * @param { string } tab - the tab to open
 * @returns { void }
 */
function showTab(tab) {
  currentTab = tab;
  overlay.querySelectorAll('[data-tab]').forEach((button) => {
    button.className = button.dataset.tab === tab ? 'btn' : 'btn sec';
  });
  const body = overlay.querySelector('.cbody');
  delete body.dataset.ready;
  body.onclick = null;
  body.scrollTop = 0;
  reloadSoon();
}

/**
 * `openDashboard` - Function 🛠️
 *
 * Opens the full-screen owner dashboard (Back or ← closes it).
 *
 * @returns { void }
 */
function openDashboard() {
  // only the owner, only once
  if (overlay || !isOwner(user)) return;
  overlay = document.createElement('div');
  overlay.className = 'chatov';
  overlay.innerHTML =
    '<div class="sch"><button class="cx" aria-label="close">←</button><div class="grow"><div style="font-weight:700">' +
    translate('Tableau de bord', 'Dashboard') +
    '</div><div class="muted sm">' +
    translate('Coulisses de l’app · vous seul', 'Behind the scenes · only you') +
    '</div></div><button class="cx" id="admRefresh" aria-label="refresh">↻</button></div>' +
    '<div class="row" style="gap:6px;padding:8px 14px 0;overflow-x:auto;flex:none">' +
    TABS.map(
      ([tab, french, english]) =>
        '<button data-tab="' +
        tab +
        '" class="' +
        (tab === currentTab ? 'btn' : 'btn sec') +
        '" style="padding:7px 12px;font-size:13px;min-height:0;flex:none">' +
        translate(french, english) +
        '</button>',
    ).join('') +
    '</div>' +
    '<div class="cbody" style="display:block;padding:14px"></div>';
  document.body.appendChild(overlay);
  overlay
    .querySelectorAll('[data-tab]')
    .forEach((button) => (button.onclick = () => showTab(button.dataset.tab)));
  history.pushState({ admin: 1 }, '');
  overlay.querySelector('.cx').addEventListener('click', () => history.back());
  overlay.querySelector('#admRefresh').addEventListener('click', refresh);
  refresh();
}

/**
 * `closeDashboard` - Function 👋
 *
 * @returns { void }
 */
function closeDashboard() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
}

// 🔙 Back closes the dashboard first (before the app's own back)
addEventListener(
  'popstate',
  (event) => {
    if (!overlay) return;
    event.stopImmediatePropagation();
    closeDashboard();
  },
  true,
);

// ===== THE PROFIL BUTTON 🔘 ===== //

/**
 * `refreshProfileButton` - Function 🔘
 *
 * Adds the "Tableau de bord" button in Profil, under the account card, for the owner only.
 *
 * @returns { void }
 */
function refreshProfileButton() {
  const existing = document.getElementById('admBtn');
  if (!isOwner(user)) {
    if (existing) existing.remove();
    return;
  }
  const anchor = document.getElementById('teamAdm') || document.getElementById('gAcc');
  if (!anchor || existing) return;
  const button = document.createElement('button');
  button.id = 'admBtn';
  button.className = 'li';
  button.style.textAlign = 'left';
  button.innerHTML =
    '<div style="font-size:24px;width:40px;text-align:center">🛠️</div><div class="grow"><div class="n">' +
    translate('Tableau de bord', 'Dashboard') +
    '</div><div class="muted sm">' +
    translate('Stockage, équipe, chat, serveur · vous seul', 'Storage, team, chat, server · only you') +
    '</div></div><div class="muted">›</div>';
  button.addEventListener('click', openDashboard);
  anchor.insertAdjacentElement('afterend', button);
}

// ===== BOOT 🚀 ===== //

// 👂 the app re-renders Profil: put the button back
new MutationObserver(() => {
  if (isOwner(user) && !document.getElementById('admBtn') && document.getElementById('gAcc'))
    refreshProfileButton();
}).observe(document.documentElement, { childList: true, subtree: true });

// 👤 signed in / out: show or hide the button, close the dashboard for anybody else
onAuthStateChanged(auth, (signedInUser) => {
  user = signedInUser;
  if (!isOwner(user)) closeDashboard();
  refreshProfileButton();
});
