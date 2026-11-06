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
import { renderManage, renderContent, renderAnnounce, renderCredits, renderSetup } from './admin-edit.js';

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
  ['typing', 'En train d’écrire (chat)', 'Typing now (chat)'],
  ['seen', 'Lu jusqu’à (chat)', 'Read up to (chat)'],
  ['sim', 'Simulation de service (parties en ligne)', 'Service simulation (online games)'],
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
// the open tab ('overview' | 'manage' | 'content' | 'announce' | 'setup' | 'credits') 🗂️
let currentTab = 'overview';
// the tabs of the dashboard (id, FR, EN) 📑
const TABS = [
  ['overview', '📊', 'Aperçu', 'Overview'],
  ['manage', '👥', 'Équipe', 'Team'],
  ['content', '📝', 'Carte', 'Menu'],
  ['announce', '📣', 'Annonce', 'Notice'],
  ['setup', '🧊', 'Service', 'Service'],
  ['credits', '🎬', 'Crédits', 'Credits'],
];

// the dashboard look: compact segmented tabs, search bars, tiles, rows & the publish bar 🎨
const DASHBOARD_CSS = `
.admtabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;margin:8px 14px 0;padding:4px;
  border-radius:14px;background:rgba(127,127,127,.12);flex:none}
.admtab{display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 2px;border:0;border-radius:10px;
  background:none;color:inherit;font:inherit;font-size:11.5px;font-weight:600;opacity:.65;cursor:pointer;min-width:0}
.admtab .ic{display:flex;align-items:center;justify-content:center;height:22px;font-size:17px;line-height:1}
.admtab.on{background:var(--gold,#c9a45c);color:#111;opacity:1;box-shadow:0 1px 4px rgba(0,0,0,.25)}
.admsticky{position:sticky;top:-14px;z-index:2;margin:-14px -14px 10px;padding:12px 14px 8px;
  background:var(--bg,#0e0e10);display:flex;flex-direction:column;gap:8px}
.admsearch{display:flex;align-items:center;gap:8px;padding:0 12px;border-radius:12px;
  background:rgba(127,127,127,.14);font-size:15px}
.admsearch input{flex:1;min-width:0;border:0;background:none;color:inherit;font:inherit;padding:11px 0;outline:none}
.admgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.admtile{position:relative;text-align:left;padding:12px;border:0;border-radius:14px;background:rgba(127,127,127,.1);
  color:inherit;font:inherit;cursor:pointer;min-width:0}
.admtile .n{font-weight:700;margin-top:4px;overflow-wrap:anywhere}
.admtileicon{font-size:24px}
.admchip{position:absolute;top:8px;right:8px;font-size:10.5px;padding:2px 7px;border-radius:99px;
  background:var(--gold,#c9a45c);color:#111;font-weight:700}
.admrow{display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid rgba(127,127,127,.12);cursor:pointer}
.admrow:last-child{border-bottom:0}
.admrow .n{font-weight:700;overflow-wrap:anywhere}
.admclip{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.admicon{flex:none;display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;
  border:0;border-radius:11px;background:rgba(127,127,127,.14);color:inherit;font:inherit;font-size:16px;line-height:1;
  cursor:pointer;transition:transform .12s,background .15s}
.admicon:active{transform:scale(.92)}
.admicon>*{pointer-events:none}
.admicon.ok{background:rgba(70,167,88,.18)}
.admicon.danger{background:rgba(229,72,77,.14)}
.admicon.gold{background:var(--gold,#c9a45c);color:#111;font-weight:800}
.admicon.danger{color:#e5484d}
.admbar{position:sticky;bottom:-14px;z-index:2;display:flex;align-items:center;gap:8px;margin:12px -14px -14px;
  padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:var(--bg,#0e0e10);
  border-top:1px solid rgba(127,127,127,.18)}
.admbar.dirty .grow{color:var(--gold,#c9a45c);opacity:1}
.admbar button[disabled]{opacity:.4}
.admempty{text-align:center;opacity:.6;padding:24px 0}
.admov .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;text-align:center}
.admline{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(127,127,127,.12)}
.admline:last-child{border-bottom:0}
.admline .admtext{flex:1;min-width:0}
.admline .admtitle{font-weight:700;overflow-wrap:anywhere}
.admacts{display:flex;align-items:center;gap:6px;flex:none}
.admcardtitle{display:flex;align-items:center;gap:8px;font-weight:800;margin-bottom:6px}
.admcount{margin-left:auto;font-size:12px;font-weight:700;padding:2px 9px;border-radius:99px;background:rgba(127,127,127,.16)}
.admfield{display:block;width:100%;box-sizing:border-box;border:1px solid rgba(127,127,127,.25);border-radius:12px;
  background:rgba(127,127,127,.08);color:inherit;font:inherit;padding:10px 12px;outline:none;resize:vertical}
.admfield:focus{border-color:var(--gold,#c9a45c);box-shadow:0 0 0 3px rgba(201,164,92,.18)}
.admlabel{font-size:12.5px;font-weight:600;opacity:.7;margin:12px 0 5px}
.admlabel .admkey{opacity:.55;font-weight:400}
.admswitch{display:flex;align-items:center;gap:12px;cursor:pointer;padding:10px 0}
.admswitch input{position:absolute;opacity:0;pointer-events:none}
.admswitch .admknob{flex:none;position:relative;width:46px;height:28px;border-radius:14px;background:rgba(127,127,127,.35);
  transition:background .2s}
.admswitch .admknob::after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;
  background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .2s}
.admswitch input:checked+.admknob{background:var(--gold,#c9a45c)}
.admswitch input:checked+.admknob::after{transform:translateX(18px)}
.admwide{width:100%;margin-top:8px}
.admdashed{width:100%;padding:12px;border:1.5px dashed rgba(127,127,127,.4);border-radius:14px;background:none;color:inherit;
  font:inherit;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;margin:6px 0}
.admpreview{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:14px;
  background:linear-gradient(135deg,var(--gold,#c9a45c),#a8843f);color:#111;font-weight:600;white-space:pre-wrap;
  overflow-wrap:anywhere;transition:opacity .2s}
.admpreview.off{opacity:.4;filter:grayscale(1)}
.admmeta{display:flex;justify-content:space-between;font-size:12px;opacity:.6;margin-top:6px}
.crHint{font-size:12px;opacity:.55;margin:0 2px 6px}
.crList{position:relative}
.admcredit{position:relative;display:flex;align-items:center;gap:12px;padding:10px 6px;border-radius:14px;
  transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
.admcredit+.admcredit{box-shadow:inset 0 1px 0 rgba(127,127,127,.12)}
.admcredit .admtext{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.crGrip{flex:none;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;font-size:18px;line-height:1;
  opacity:.35;padding:8px 2px;margin:-8px 0}
.crGrip:hover{opacity:.8}
.crInput{display:block;width:100%;box-sizing:border-box;border:0;border-radius:8px;background:none;color:inherit;font:inherit;
  padding:3px 6px;margin-left:-6px;outline:none;transition:background .15s}
.crInput:hover{background:rgba(127,127,127,.08)}
.crInput:focus{background:rgba(127,127,127,.12);box-shadow:0 0 0 2px rgba(201,164,92,.45)}
.crName{font-weight:700;font-size:15px}
.crRole{font-size:13px;opacity:.65}
.crDel{flex:none;width:30px;height:30px;border-radius:50%;border:0;background:none;color:inherit;font-size:14px;opacity:.35;
  cursor:pointer;transition:opacity .15s,background .15s,color .15s}
.crDel:hover,.crDel:focus-visible{opacity:1;color:#e5484d;background:rgba(229,72,77,.12)}
.admsort{gap:10px}
.admsort.crDrag{position:relative;transition:box-shadow .18s ease,background .18s ease;z-index:3;
  background:var(--sf2,#2a2a2a);box-shadow:0 12px 30px rgba(0,0,0,.35)}
.admcredit.crDrag{transition:box-shadow .18s ease,background .18s ease;z-index:3;background:var(--sf2,#2a2a2a);
  box-shadow:0 12px 30px rgba(0,0,0,.35)}
.admcredit.crDrag .crGrip{cursor:grabbing;opacity:.9}
.setbar{display:flex;gap:8px;align-items:center;margin:0 0 6px;flex-wrap:wrap}
.setseg{display:flex;gap:3px;padding:3px;border-radius:12px;background:rgba(127,127,127,.12);flex:1;min-width:0}
.setseg.setlang{flex:none}
.setseg button{flex:1;min-width:0;border:0;border-radius:9px;background:none;color:inherit;font:inherit;font-size:13px;
  font-weight:600;padding:7px 8px;opacity:.7;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.setseg button.on{background:var(--gold,#c9a45c);color:#111;opacity:1}
.setgrouphead{display:flex;gap:8px;margin-bottom:8px}
.setgrouphead .setname{flex:1;min-width:0;font-weight:700}
.seticon{width:46px!important;flex:none;text-align:center;padding:8px 4px!important}
.setrows{margin:8px 0 4px}
.setrow{position:relative;display:flex;align-items:center;gap:8px;padding:8px 4px;border-radius:14px;
  transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
.setrow+.setrow{box-shadow:inset 0 1px 0 rgba(127,127,127,.12)}
.setrow .admtext{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.setrow .admfield{padding:7px 9px}
.setrow .setname{font-weight:700}
.setrow .setsmall{font-size:13px}
.setmeta{display:flex;gap:8px;align-items:center}
.setkindsel{flex:1;min-width:0;font-size:13px}
.setqtylabel{display:flex;align-items:center;gap:4px;font-weight:700;opacity:.8;flex:none}
.setqtyin{width:58px!important;text-align:center}
.setrow .crGrip,.setrow .crDel{align-self:flex-start;margin-top:6px}
.setsteprow{align-items:flex-start}
.setstepnum{flex:none;width:22px;height:22px;border-radius:11px;background:var(--gold,#c9a45c);color:#111;font-size:12px;
  font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:9px}
.setrow.crDrag{transition:box-shadow .18s ease,background .18s ease;z-index:3;background:var(--sf2,#2a2a2a);
  box-shadow:0 12px 30px rgba(0,0,0,.35)}
.setremove{display:block;margin:8px auto 0;border:0;background:none;color:#e5484d;font:inherit;font-size:13px;
  font-weight:600;cursor:pointer;opacity:.8}
.crDirty{box-shadow:0 0 0 3px rgba(201,164,92,.35)}
.admcols{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-items:start}
.admcols>*{min-width:0}
.admcols>.card{margin:0!important}
.admkpis{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px}
.admkpi{position:relative;text-align:left;padding:14px;border:0;border-radius:18px;color:inherit;font:inherit;
  background:linear-gradient(145deg,rgba(127,127,127,.16),rgba(127,127,127,.06));overflow:hidden;min-width:0}
.admkpi .admkpiicon{position:absolute;right:10px;top:8px;font-size:26px;opacity:.85}
.admkpi .admkpivalue{font-size:28px;font-weight:800;line-height:1.1;margin-top:14px}
.admkpi .admkpilabel{font-size:12.5px;opacity:.7;margin-top:2px}
.admkpi.alert{background:linear-gradient(145deg,var(--gold,#c9a45c),#a8843f);color:#111;cursor:pointer}
.admkpi.alert .admkpilabel{opacity:.85}
.admstat{background:rgba(127,127,127,.08);border-radius:12px;padding:10px 12px;min-width:0}
.admstat .admstatvalue{font-weight:800;font-size:18px}
.admchart{display:flex;align-items:flex-end;gap:4px;height:120px;margin:10px 0 4px}
.admchart .admcol{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}
.admchart .admcolbar{width:100%;max-width:26px;border-radius:6px 6px 2px 2px;background:var(--gold,#c9a45c);min-height:3px}
.admchart .admcol.today .admcolbar{box-shadow:0 0 0 2px rgba(255,255,255,.35)}
.admchart .admcolday{font-size:10px;opacity:.6;margin-top:4px}
.admpodium{display:flex;flex-direction:column;gap:2px}
.admperson{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(127,127,127,.12)}
.admperson:last-child{border-bottom:0}
.admperson .grow{min-width:0}
.admperson .admmedal{font-size:20px;width:26px;text-align:center}
.admavatar{flex:none;width:36px;height:36px;border-radius:50%;object-fit:cover;display:inline-flex;align-items:center;
  justify-content:center;font-weight:800;font-size:14px;color:#fff}
@media (min-width:960px){
  .admov .admtabs{width:100%;max-width:720px;align-self:center;box-sizing:border-box}
  .admov .cbody{padding-left:max(14px,calc((100% - 1180px)/2))!important;
    padding-right:max(14px,calc((100% - 1180px)/2))!important}
  .admcols{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  .admkpis{grid-template-columns:repeat(4,1fr)}
}
`;

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
  '<div class="admstat"><div class="admstatvalue">' +
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

// ===== OVERVIEW HERO ✨ ===== //

// the avatar colours (one per person, from their name) 🎨
const AVATAR_COLORS = [
  '#7c5cbf',
  '#2f7d6d',
  '#b5523b',
  '#3a6ea5',
  '#a0577a',
  '#6b7d2f',
  '#b07a1f',
  '#4b5d8a',
];

/**
 * `avatarHtml` - Function 🧑
 *
 * @param { string } name - the person's name
 * @param { string } [picture] - their Google photo address (optional)
 * @returns { string } - a round avatar: the photo, or the initials on a colour of their own
 */
export function avatarHtml(name, picture) {
  const label = String(name || 'Staff');
  if (picture && /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//.test(picture))
    return (
      '<img class="admavatar" src="' +
      escapeHtml(picture) +
      '" alt="" referrerpolicy="no-referrer" loading="lazy">'
    );
  const initials = label
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
  const hash = Array.from(label).reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 7);
  return (
    '<span class="admavatar" style="background:' +
    AVATAR_COLORS[hash % AVATAR_COLORS.length] +
    '">' +
    escapeHtml(initials || '?') +
    '</span>'
  );
}

/**
 * `dayKey` - Function 📅
 *
 * @param { Date } date - a day
 * @returns { string } - its key in the leaderboard (`YYYY-MM-DD`, local time)
 */
function dayKey(date) {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  );
}

/**
 * `kpiHtml` - Function 🔢
 *
 * @param { string } icon - the emoji
 * @param { string } value - the big number (already escaped)
 * @param { string } label - what it is
 * @param { string } [tab] - a tab to open on tap (makes it a gold alert card)
 * @returns { string } - one big stat card
 */
function kpiHtml(icon, value, label, tab) {
  return (
    '<button class="admkpi' +
    (tab ? ' alert" data-go="' + tab : '') +
    '"' +
    (tab ? '' : ' tabindex="-1"') +
    '><span class="admkpiicon">' +
    icon +
    '</span><div class="admkpivalue">' +
    value +
    '</div><div class="admkpilabel">' +
    label +
    '</div></button>'
  );
}

/**
 * `heroHtml` - Function ✨
 *
 * @param { object } data - the gathered numbers
 * @returns { string } - the top of the overview: 4 big stats, the team XP of the last 14 days & the top 3
 */
function heroHtml(data) {
  const entries = data.byId.board.docs.map((entry) => entry.data),
    team = data.byId.team.docs,
    pending = data.byId.requests.docs.filter((request) => !request.data.refused).length,
    weekAgo = Date.now() - 7 * 86400000,
    active = data.byId.users.docs.filter((account) => (toDate(account.data.ts) || 0) >= weekAgo).length;
  // 📊 the team XP of each of the last 14 days (oldest first)
  const days = Array.from({ length: 14 }, (unused, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (13 - index));
    const key = dayKey(day);
    return {
      day: day,
      xp: entries.reduce((sum, entry) => sum + (+(entry.days || {})[key] || 0), 0),
    };
  });
  const weekXp = days.slice(7).reduce((sum, item) => sum + item.xp, 0),
    lastWeekXp = days.slice(0, 7).reduce((sum, item) => sum + item.xp, 0),
    highest = Math.max(1, ...days.map((item) => item.xp)),
    trend = lastWeekXp ? Math.round((100 * (weekXp - lastWeekXp)) / lastWeekXp) : 0;
  const bars = days
    .map(
      (item, index) =>
        '<div class="admcol' +
        (index === 13 ? ' today' : '') +
        '" title="' +
        item.xp +
        ' XP"><div class="admcolbar" style="height:' +
        Math.round((100 * item.xp) / highest) +
        '%"></div><div class="admcolday">' +
        escapeHtml(item.day.toLocaleDateString(translate('fr-FR', 'en-GB'), { weekday: 'narrow' })) +
        '</div></div>',
    )
    .join('');
  // 🥇 the top 3 by XP
  const medals = ['🥇', '🥈', '🥉'];
  const podium = entries
    .slice()
    .sort((first, second) => (+second.xp || 0) - (+first.xp || 0))
    .slice(0, 3)
    .map(
      (entry, index) =>
        '<div class="admperson"><span class="admmedal">' +
        medals[index] +
        '</span>' +
        avatarHtml(entry.name, entry.pic) +
        '<div class="grow"><div class="admclip" style="font-weight:700">' +
        escapeHtml(entry.name || 'Staff') +
        '</div><div class="muted sm">🔥 ' +
        (+entry.streak || 0) +
        ' · ' +
        (+entry.mastered || 0) +
        ' ' +
        translate('maîtrisées', 'mastered') +
        '</div></div><b>' +
        (+entry.xp || 0) +
        ' XP</b></div>',
    )
    .join('');
  return (
    '<div class="admkpis">' +
    (pending
      ? kpiHtml('🛂', String(pending), translate('Demandes à valider', 'Requests to review'), 'manage')
      : kpiHtml('👥', String(team.length), translate('Membres', 'Members'))) +
    kpiHtml('🟢', String(active), translate('Actifs cette semaine', 'Active this week')) +
    kpiHtml(
      '⚡',
      String(weekXp),
      translate('XP (7 j)', 'XP (7 d)') +
        (trend ? ' · ' + (trend > 0 ? '▲ ' : '▼ ') + Math.abs(trend) + ' %' : ''),
    ) +
    kpiHtml('🚀', 'v' + escapeHtml(window.LTF_APP_VERSION || '?'), translate('En ligne', 'Live')) +
    '</div><div class="admcols" style="margin-bottom:12px">' +
    cardHtml(
      '📈 ' + translate('XP de l’équipe · 14 jours', 'Team XP · 14 days'),
      '<div class="admchart">' + bars + '</div>',
    ) +
    cardHtml(
      '🏅 Top 3',
      podium
        ? '<div class="admpodium">' + podium + '</div>'
        : '<p class="muted sm">' + translate('Personne pour l’instant.', 'Nobody yet.') + '</p>',
    ) +
    '</div>'
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
    heroHtml(data) +
    '<div class="admcols">' +
    boardHtml(data) +
    teamHtml(data) +
    chatHtml(data) +
    storageHtml(data) +
    serverHtml(data) +
    deviceHtml(data) +
    '</div>' +
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
  // 🧹 forget the previous tab's typing & drag listeners
  body.oninput = body.onchange = body.onpointerdown = null;
  try {
    // 📝📣 the content & announcement tabs read their own data
    if (currentTab === 'content') await renderContent(body);
    else if (currentTab === 'announce') await renderAnnounce(body);
    else if (currentTab === 'credits') await renderCredits(body);
    else if (currentTab === 'setup') await renderSetup(body);
    else {
      const data = await gather();
      // closed meanwhile? nothing to draw
      if (!overlay) return;
      if (currentTab === 'manage') renderManage(body, data, user, reloadSoon);
      else {
        // 👆 a gold alert card opens its tab
        body.onclick = (event) => {
          const target = event.target.closest('[data-go]');
          if (target) showTab(target.dataset.go);
        };
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
    button.classList.toggle('on', button.dataset.tab === tab);
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
  // 🎨 the dashboard styles (once)
  if (!document.getElementById('admStyle')) {
    const style = document.createElement('style');
    style.id = 'admStyle';
    style.textContent = DASHBOARD_CSS;
    document.head.appendChild(style);
  }
  overlay = document.createElement('div');
  overlay.className = 'chatov admov';
  overlay.innerHTML =
    '<div class="sch"><button class="cx" aria-label="close">←</button><div class="grow"><div style="font-weight:700">' +
    translate('Tableau de bord', 'Dashboard') +
    '</div><div class="muted sm">' +
    translate('Coulisses de l’app · vous seul', 'Behind the scenes · only you') +
    '</div></div><button class="cx" id="admRefresh" aria-label="refresh">↻</button></div>' +
    '<div class="admtabs" role="tablist">' +
    TABS.map(
      ([tab, icon, french, english]) =>
        '<button role="tab" data-tab="' +
        tab +
        '" class="admtab' +
        (tab === currentTab ? ' on' : '') +
        '"><span class="ic">' +
        icon +
        '</span>' +
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
