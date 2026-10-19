// Google sign-in + cloud sync of progress/settings (localStorage 'ltf_v1') via Firebase (Spark, free).
// Firestore doc users/{uid} = {s: <ltf_v1 JSON string>, ts: ms, name, email}. Photos stay on the phone.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const CFG = { apiKey: "AIzaSyDOkFXbEGOS1i-k2TcU9eSrlOubGWaN-Q0", authDomain: "les-trois-forts.firebaseapp.com", projectId: "les-trois-forts", storageBucket: "les-trois-forts.firebasestorage.app", messagingSenderId: "416441759360", appId: "1:416441759360:web:61f9c52cfdd966af3ed865" };
const KEY = 'ltf_v1', META = 'ltf_sync';
const app = initializeApp(CFG), auth = getAuth(app), db = getFirestore(app);
const L = {
  fr: ['Compte', 'Se connecter avec Google', 'Sauvegardez votre progression et vos réglages en ligne et retrouvez-les sur tous vos appareils.', 'Synchronisé', 'Synchronisation…', 'Se déconnecter', 'Connexion impossible', 'Hors ligne : la synchro reprendra plus tard'],
  en: ['Account', 'Sign in with Google', 'Save your progress and settings online and get them back on any device.', 'Synced', 'Syncing…', 'Sign out', 'Sign-in failed', 'Offline: sync will resume later']
};
const lang = () => { try { return (JSON.parse(localStorage.getItem(KEY) || '{}').lang) === 'en' ? 'en' : 'fr'; } catch (e) { return 'fr'; } };
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let user = null, status = '', busy = false, timer = null;
const rawSet = Storage.prototype.setItem;
const meta = () => { try { return JSON.parse(localStorage.getItem(META) || '{}'); } catch (e) { return {}; } };
const setMeta = m => rawSet.call(localStorage, META, JSON.stringify(m));
const xpOf = txt => { try { return +(JSON.parse(txt || '{}').xp) || 0; } catch (e) { return 0; } };

async function push() {
  if (!user) return;
  const s = localStorage.getItem(KEY) || '{}', ts = Date.now();
  status = 4; render();
  try {
    await setDoc(doc(db, 'users', user.uid), { s, ts, name: user.displayName || '', email: user.email || '' });
    setMeta({ uid: user.uid, ts }); status = 3;
  } catch (e) { status = 7; }
  render();
}
// Any progress save by the app schedules an upload.
Storage.prototype.setItem = function (k, v) {
  rawSet.call(this, k, v);
  if (this === localStorage && k === KEY && user) { clearTimeout(timer); timer = setTimeout(push, 2500); }
};
addEventListener('visibilitychange', () => { if (document.hidden && timer) { clearTimeout(timer); timer = null; push(); } });

function adopt(d) { rawSet.call(localStorage, KEY, d.s); setMeta({ uid: user.uid, ts: d.ts }); location.reload(); }

async function sync() {
  status = 4; render();
  let snap;
  try { snap = await getDoc(doc(db, 'users', user.uid)); } catch (e) { status = 7; render(); return; }
  const local = localStorage.getItem(KEY), m = meta();
  if (!snap.exists()) return push();
  const d = snap.data();
  if (m.uid !== user.uid) {           // first sign-in on this device: keep the furthest progress
    if (!local || xpOf(d.s) >= xpOf(local)) return adopt(d);
    return push();
  }
  if (d.ts > (m.ts || 0) && d.s !== local) return adopt(d);   // changed on another device
  if (d.s !== local) return push();                            // changed here while offline
  status = 3; render();
}

async function login() {
  if (busy) return; busy = true;
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (e) {
    if (/popup-blocked|operation-not-supported|web-storage/.test(e.code || '')) { try { await signInWithRedirect(auth, new GoogleAuthProvider()); } catch (x) { status = 6; } }
    else if (!/popup-closed|cancelled-popup/.test(e.code || '')) status = 6;
  }
  busy = false; render();
}

function card() {
  const l = L[lang()];
  const g = '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  if (!user) return '<div class="sh">' + l[0] + '</div><div class="card"><p class="muted sm" style="margin:0 0 12px">' + l[2] + '</p>' +
    '<button class="btn" id="gIn" style="background:#fff;color:#1f1f1f;border:1px solid #dadce0">' + g + '<span>' + l[1] + '</span></button>' +
    (status === 6 ? '<p class="warn sm" style="margin:10px 0 0">' + l[6] + '</p>' : '') + '</div>';
  const pic = user.photoURL ? '<img src="' + esc(user.photoURL) + '" referrerpolicy="no-referrer" style="width:46px;height:46px;border-radius:50%;flex:none" alt="">' : '<div class="av">' + esc((user.displayName || '?')[0]) + '</div>';
  const st = status ? (status === 3 ? '✓ ' : '') + l[status] : '';
  return '<div class="sh">' + l[0] + '</div><div class="card"><div class="row" style="gap:12px">' + pic +
    '<div class="grow" style="min-width:0"><div style="font-weight:700">' + esc(user.displayName) + '</div><div class="muted sm" style="overflow:hidden;text-overflow:ellipsis">' + esc(user.email) + '</div>' +
    '<div class="muted sm" id="gSt">' + st + '</div></div></div><button class="btn sec" id="gOut" style="margin-top:12px">' + l[5] + '</button></div>';
}
function render() {
  const rst = document.getElementById('rst'); if (!rst) return;
  const pad = rst.parentElement; let box = document.getElementById('gAcc');
  if (!box) { box = document.createElement('div'); box.id = 'gAcc'; const sh = pad.querySelector('.sh'); pad.insertBefore(box, sh || rst); }
  const h = card(); if (box.dataset.h === h) return; box.dataset.h = h; box.innerHTML = h;
  const i = box.querySelector('#gIn'); if (i) i.onclick = login;
  const o = box.querySelector('#gOut'); if (o) o.onclick = async () => { if (timer) { clearTimeout(timer); timer = null; await push(); } await signOut(auth); status = ''; render(); };
}
new MutationObserver(() => { if (document.getElementById('rst') && !document.getElementById('gAcc')) render(); }).observe(document.documentElement, { childList: true, subtree: true });
getRedirectResult(auth).catch(() => { status = 6; render(); });
onAuthStateChanged(auth, u => { user = u; render(); if (u) sync(); });
