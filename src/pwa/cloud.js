/*
 * @license MIT
 * ~~~~~~~~~~~~
 * sofitel-service-lestroisforts
 * ~~~~~~~~~~~~
 * Copyright (c) 2026 Abraham Ukachi. The Les Trois Forts Project.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @project: sofitel-service-lestroisforts
 * @name: Les Trois Forts - Google Sign-In & Cloud Sync
 * @file: pwa/cloud.js
 * @type: JavaScript (ES module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script type="module" src="cloud.js"
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🔐 Google sign-in + ☁️ cloud sync of the progress & settings (localStorage `ltf_v1`) via Firebase (Spark plan, free).
// The Firestore doc `users/{uid}` = { s: <ltf_v1 JSON string>, ts: ms, name, email }. Photos stay on the phone 📱.
// No Rust change needed: this ES module injects its own "Compte" card into the Profil screen 🧩.

// import `initializeApp` from the Firebase JS SDK (app) 🔥
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
// import the Google auth helpers from the Firebase JS SDK (auth) 🔐
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
// import the Firestore helpers from the Firebase JS SDK (firestore) 🗃️
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===== FIREBASE 🔥 ===== //

// the public web config of the `les-trois-forts` Firebase project (safe to ship: access is guarded by the Firestore rules 🛡️)
const firebaseConfig = {
  apiKey: 'AIzaSyDOkFXbEGOS1i-k2TcU9eSrlOubGWaN-Q0',
  authDomain: 'les-trois-forts.firebaseapp.com',
  projectId: 'les-trois-forts',
  storageBucket: 'les-trois-forts.firebasestorage.app',
  messagingSenderId: '416441759360',
  appId: '1:416441759360:web:61f9c52cfdd966af3ed865',
};
// the localStorage keys: the app's progress 🎓 & our own sync meta (uid + last synced ts) 🏷️
const PROGRESS_KEY = 'ltf_v1',
  SYNC_META_KEY = 'ltf_sync';
// the Firebase app, its auth & its Firestore database 🚀
const firebaseApp = initializeApp(firebaseConfig),
  auth = getAuth(firebaseApp),
  firestore = getFirestore(firebaseApp);

// ===== LABELS 🏷️ ===== //

// the card labels, by language (the index is also used as the `status` code: 3 = synced, 4 = syncing, 6 = failed, 7 = offline)
const LABELS = {
  fr: [
    'Compte',
    'Se connecter avec Google',
    'Sauvegardez votre progression et vos réglages en ligne et retrouvez-les sur tous vos appareils.',
    'Synchronisé',
    'Synchronisation…',
    'Se déconnecter',
    'Connexion impossible',
    'Hors ligne : la synchro reprendra plus tard',
  ],
  en: [
    'Account',
    'Sign in with Google',
    'Save your progress and settings online and get them back on any device.',
    'Synced',
    'Syncing…',
    'Sign out',
    'Sign-in failed',
    'Offline: sync will resume later',
  ],
};

// ===== HELPERS 🧰 ===== //

/**
 * `currentLanguage` - Function 🌍
 *
 * Reads the language the waiter picked in the app (`fr` unless the saved progress says `en`).
 *
 * @returns { 'fr' | 'en' } - the current language
 */
const currentLanguage = () => {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}').lang === 'en' ? 'en' : 'fr';
  } catch (error) {
    return 'fr';
  }
};

/**
 * `escapeHtml` - Function 🛡️
 *
 * Escapes `&`, `<`, `>` and `"` so a Google name / email / photo URL can't inject HTML.
 *
 * @param { any } value - the text to escape (`null` & `undefined` become '')
 * @returns { string } - the escaped text
 */
const escapeHtml = (value) =>
  String(value || '').replace(
    /[&<>"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char],
  );

// ===== STATE 🌱 ===== //

// the signed-in Google user, the status code (index of LABELS), the login lock & the debounced upload timer ⏱️
let user = null,
  status = '',
  busy = false,
  timer = null;
// the original `Storage.prototype.setItem` (we wrap it below, so our own writes use this one 👂)
const rawSetItem = Storage.prototype.setItem;

/**
 * `readSyncMeta` - Function 🏷️
 *
 * @returns { { uid?: string, ts?: number } } - the sync meta of this device (or {})
 */
const readSyncMeta = () => {
  try {
    return JSON.parse(localStorage.getItem(SYNC_META_KEY) || '{}');
  } catch (error) {
    return {};
  }
};

/**
 * `writeSyncMeta` - Function 🏷️
 *
 * @param { { uid: string, ts: number } } syncMeta - the uid & timestamp of the last sync
 * @returns { void }
 */
const writeSyncMeta = (syncMeta) => rawSetItem.call(localStorage, SYNC_META_KEY, JSON.stringify(syncMeta));

/**
 * `xpOf` - Function 🎓
 *
 * @param { string } progressJson - a `ltf_v1` JSON string
 * @returns { number } - its XP (0 when unreadable)
 */
const xpOf = (progressJson) => {
  try {
    return +JSON.parse(progressJson || '{}').xp || 0;
  } catch (error) {
    return 0;
  }
};

// ===== SYNC ☁️ ===== //

/**
 * `push` - Async Function ⬆️
 *
 * Uploads the local progress to `users/{uid}` and remembers when it was synced.
 *
 * @returns { Promise<void> }
 */
async function push() {
  // nobody signed in? nothing to do
  if (!user) return;
  // the local progress & the upload time
  const progressJson = localStorage.getItem(PROGRESS_KEY) || '{}',
    timestamp = Date.now();
  // show "Syncing…" 🔄
  status = 4;
  render();
  try {
    // write the doc { s, ts, name, email } 🗃️
    await setDoc(doc(firestore, 'users', user.uid), {
      s: progressJson,
      ts: timestamp,
      name: user.displayName || '',
      email: user.email || '',
    });
    // remember this sync & show "Synced" ✅
    writeSyncMeta({ uid: user.uid, ts: timestamp });
    status = 3;
  } catch (error) {
    status = 7;
  } // 📴 offline: we'll try again later
  // refresh the card
  render();
}

// 👂 Any progress save by the app schedules an upload (debounced 2.5 s).
Storage.prototype.setItem = function (key, value) {
  // always do the real write first
  rawSetItem.call(this, key, value);
  // our progress key + someone signed in? (re)start the timer ⏱️
  if (this === localStorage && key === PROGRESS_KEY && user) {
    clearTimeout(timer);
    timer = setTimeout(push, 2500);
  }
};

// 🙈 the app goes to the background: flush the pending upload right away
addEventListener('visibilitychange', () => {
  if (document.hidden && timer) {
    clearTimeout(timer);
    timer = null;
    push();
  }
});

/**
 * `adopt` - Function ⬇️
 *
 * Replaces the local progress with the cloud copy, then reloads the app.
 *
 * @param { { s: string, ts: number } } cloudDoc - the `users/{uid}` doc
 * @returns { void }
 */
function adopt(cloudDoc) {
  rawSetItem.call(localStorage, PROGRESS_KEY, cloudDoc.s);
  writeSyncMeta({ uid: user.uid, ts: cloudDoc.ts });
  location.reload();
}

/**
 * `sync` - Async Function 🔄
 *
 * Compares the cloud copy with the local one and decides who wins:
 * first sign-in on a device keeps the higher XP, later the newer cloud `ts` wins.
 *
 * @returns { Promise<void> }
 */
async function sync() {
  // show "Syncing…"
  status = 4;
  render();
  // the cloud snapshot
  let snapshot;
  // read `users/{uid}` (📴 offline? show it and stop)
  try {
    snapshot = await getDoc(doc(firestore, 'users', user.uid));
  } catch (error) {
    status = 7;
    render();
    return;
  }
  // the local progress & this device's sync meta
  const local = localStorage.getItem(PROGRESS_KEY),
    syncMeta = readSyncMeta();
  // nothing in the cloud yet? upload ours 🌱
  if (!snapshot.exists()) return push();
  // the cloud doc
  const cloudDoc = snapshot.data();
  if (syncMeta.uid !== user.uid) {
    // first sign-in on this device: keep the furthest progress
    if (!local || xpOf(cloudDoc.s) >= xpOf(local)) return adopt(cloudDoc);
    return push();
  }
  if (cloudDoc.ts > (syncMeta.ts || 0) && cloudDoc.s !== local) return adopt(cloudDoc); // changed on another device
  if (cloudDoc.s !== local) return push(); // changed here while offline
  // already in sync ✅
  status = 3;
  render();
}

// ===== SIGN IN 🔐 ===== //

/**
 * `login` - Async Function 🔐
 *
 * Opens the Google popup (falls back to a redirect when popups are blocked / unsupported).
 *
 * @returns { Promise<void> }
 */
async function login() {
  // one login at a time 🔒
  if (busy) return;
  busy = true;
  // try the popup first
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error) {
    // popup blocked (iOS standalone, in-app browsers...)? use a full-page redirect instead 🔀
    if (/popup-blocked|operation-not-supported|web-storage/.test(error.code || '')) {
      try {
        await signInWithRedirect(auth, new GoogleAuthProvider());
      } catch (redirectError) {
        status = 6;
      }
    }
    // a real failure (not just the user closing the popup) ❌
    else if (!/popup-closed|cancelled-popup/.test(error.code || '')) status = 6;
  }
  // unlock & refresh the card
  busy = false;
  render();
}

// ===== ACCOUNT CARD 🧩 ===== //

/**
 * `accountCardHtml` - Function 🧩
 *
 * The HTML of the "Compte" card: a Google button when signed out, the avatar, name, email,
 * sync status & a sign-out button when signed in.
 *
 * @returns { string } - the card HTML
 */
function accountCardHtml() {
  // the labels in the current language 🏷️
  const labels = LABELS[currentLanguage()];
  // the official multicolor Google "G" 🎨
  const googleLogo =
    '<svg width="20" height="20" viewBox="0 0 48 48">' +
    '<path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>' +
    '<path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>' +
    '<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>' +
    '<path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>' +
    '</svg>';
  // 🚪 signed out: the pitch + the "Sign in with Google" button (+ the error, if any)
  if (!user)
    return (
      '<div class="sh">' +
      labels[0] +
      '</div><div class="card"><p class="muted sm" style="margin:0 0 12px">' +
      labels[2] +
      '</p>' +
      '<button class="btn" id="gIn" style="background:#fff;color:#1f1f1f;border:1px solid #dadce0">' +
      googleLogo +
      '<span>' +
      labels[1] +
      '</span></button>' +
      (status === 6 ? '<p class="warn sm" style="margin:10px 0 0">' + labels[6] + '</p>' : '') +
      '</div>'
    );
  // 🖼️ the Google photo, or the first letter of the name in a circle
  const avatar = user.photoURL
    ? '<img src="' +
      escapeHtml(user.photoURL) +
      '" referrerpolicy="no-referrer" style="width:46px;height:46px;border-radius:50%;flex:none" alt="">'
    : '<div class="av">' + escapeHtml((user.displayName || '?')[0]) + '</div>';
  // the status line ("✓ Synced", "Syncing…", ...)
  const statusText = status ? (status === 3 ? '✓ ' : '') + labels[status] : '';
  // ✅ signed in: avatar, name, email, status & "Sign out"
  return (
    '<div class="sh">' +
    labels[0] +
    '</div><div class="card"><div class="row" style="gap:12px">' +
    avatar +
    '<div class="grow" style="min-width:0"><div style="font-weight:700">' +
    escapeHtml(user.displayName) +
    '</div><div class="muted sm" style="overflow:hidden;text-overflow:ellipsis">' +
    escapeHtml(user.email) +
    '</div>' +
    '<div class="muted sm" id="gSt">' +
    statusText +
    '</div></div></div><button class="btn sec" id="gOut" style="margin-top:12px">' +
    labels[5] +
    '</button></div>'
  );
}

/**
 * `render` - Function 🎨
 *
 * Injects (or refreshes) the `#gAcc` card above the Profil settings, right before the reset button `#rst`.
 *
 * @returns { void }
 */
function render() {
  // the reset button only exists on the Profil screen
  const resetButton = document.getElementById('rst');
  if (!resetButton) return;
  // its container & our card box
  const container = resetButton.parentElement;
  let box = document.getElementById('gAcc');
  // first time: create the box above the first section heading 🌱
  if (!box) {
    box = document.createElement('div');
    box.id = 'gAcc';
    const heading = container.querySelector('.sh');
    container.insertBefore(box, heading || resetButton);
  }
  // same HTML as before? don't touch the DOM 🧹
  const html = accountCardHtml();
  if (box.dataset.h === html) return;
  box.dataset.h = html;
  box.innerHTML = html;
  // 🔐 wire "Sign in with Google"
  const signInButton = box.querySelector('#gIn');
  if (signInButton) signInButton.onclick = login;
  // 🚪 wire "Sign out" (flush the pending upload first)
  const signOutButton = box.querySelector('#gOut');
  if (signOutButton)
    signOutButton.onclick = async () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        await push();
      }
      await signOut(auth);
      status = '';
      render();
    };
}

// ===== BOOT 🚀 ===== //

// 👂 the app re-renders its screens: put our card back whenever the Profil screen shows up
new MutationObserver(() => {
  if (document.getElementById('rst') && !document.getElementById('gAcc')) render();
}).observe(document.documentElement, { childList: true, subtree: true });
// back from a redirect sign-in that failed? show the error
getRedirectResult(auth).catch(() => {
  status = 6;
  render();
});
// 👤 signed in / out: refresh the card & sync
onAuthStateChanged(auth, (signedInUser) => {
  user = signedInUser;
  render();
  if (signedInUser) sync();
});
