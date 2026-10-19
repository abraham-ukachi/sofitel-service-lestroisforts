// Team chat: public messages + photos for signed-in staff (Firestore collection 'chat').
// Doc: {uid, name, pic, text, img (JPEG data URL, <=~700 KB), ts, rep:{id,name,text}, r:{<uid>: emoji}}
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, deleteDoc, deleteField, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const CFG = { apiKey: "AIzaSyDOkFXbEGOS1i-k2TcU9eSrlOubGWaN-Q0", authDomain: "les-trois-forts.firebaseapp.com", projectId: "les-trois-forts", storageBucket: "les-trois-forts.firebasestorage.app", messagingSenderId: "416441759360", appId: "1:416441759360:web:61f9c52cfdd966af3ed865" };
const app = getApps()[0] || initializeApp(CFG), auth = getAuth(app), db = getFirestore(app);
const EMO = ['👍', '❤️', '😂', '😮', '🙏', '🔥'];
const EN = () => { try { return JSON.parse(localStorage.getItem('ltf_v1') || '{}').lang === 'en'; } catch (e) { return false; } };
const T = (fr, en) => EN() ? en : fr;
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SEEN = 'ltf_chat_seen';
let user = null, msgs = [], unsub = null, ov = null, rep = null, pend = null, sel = null, err = '';

const ms = m => m.ts && m.ts.toMillis ? m.ts.toMillis() : Date.now();
const hhmm = t => { const d = new Date(t), n = new Date(); const h = d.toLocaleTimeString(EN() ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit' }); return d.toDateString() === n.toDateString() ? h : d.toLocaleDateString(EN() ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short' }) + ' ' + h; };
const unread = () => { const s = +localStorage.getItem(SEEN) || 0; return user && msgs.some(m => m.uid !== user.uid && ms(m) > s); };
const markSeen = () => { if (msgs.length) localStorage.setItem(SEEN, String(Math.max(...msgs.map(ms)))); };

function listen() {
  if (unsub) { unsub(); unsub = null; }
  msgs = []; if (!user) { paint(); return; }
  unsub = onSnapshot(query(collection(db, 'chat'), orderBy('ts', 'desc'), limit(150)), s => {
    msgs = s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })).reverse(); err = '';
    if (ov) markSeen(); paint(); fab();
  }, () => { err = T('Chat indisponible pour le moment', 'Chat unavailable right now'); paint(); });
}

// ---------- photo: shrink to <= 1280 px JPEG so it fits in one Firestore doc ----------
function shrink(file) {
  return new Promise((ok, no) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      let max = 1280, q = .78, out = '';
      for (let i = 0; i < 6; i++) {
        const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        out = c.toDataURL('image/jpeg', q); if (out.length < 700000) break; max *= .8; q -= .06;
      }
      URL.revokeObjectURL(url); out.length < 900000 ? ok(out) : no();
    };
    im.onerror = () => { URL.revokeObjectURL(url); no(); };
    im.src = url;
  });
}

// ---------- full-screen photo viewer (pinch / double-tap / drag down to close) ----------
function view(src) {
  const d = document.createElement('div'); d.className = 'ov zoomv';
  d.innerHTML = '<div class="zt"><div class="zn"></div><button class="zx" aria-label="close" style="font-size:22px">✕</button></div><div class="zs"><img src="' + src + '" alt="" draggable="false"></div><div class="zh">' + T('Pincez ou touchez deux fois pour zoomer', 'Pinch or double-tap to zoom') + '</div>';
  document.body.appendChild(d); const img = d.querySelector('img'), st = d.querySelector('.zs');
  let sc = 1, x = 0, y = 0, pts = new Map(), start = null, lastTap = 0, moved = false;
  const apply = a => { img.style.transition = a ? 'transform .2s' : 'none'; img.style.transform = `translate(${x}px,${y}px) scale(${sc})`; };
  const clampP = () => { if (sc <= 1) { sc = 1; x = 0; y = 0; return; } const r = st.getBoundingClientRect(); const mx = Math.max(0, (img.offsetWidth * sc - r.width) / 2), my = Math.max(0, (img.offsetHeight * sc - r.height) / 2); x = Math.min(mx, Math.max(-mx, x)); y = Math.min(my, Math.max(-my, y)); };
  const close = () => d.remove(); d.querySelector('.zx').onclick = close;
  st.addEventListener('pointerdown', e => { st.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; start = { dist: Math.hypot(a.x - b.x, a.y - b.y), sc, x, y, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; } else start = { px: e.clientX, py: e.clientY, x, y }; });
  st.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && start && start.dist) { const [a, b] = [...pts.values()]; sc = Math.min(5, Math.max(1, start.sc * Math.hypot(a.x - b.x, a.y - b.y) / start.dist)); x = start.x + ((a.x + b.x) / 2 - start.cx); y = start.y + ((a.y + b.y) / 2 - start.cy); moved = true; apply(); }
    else if (pts.size === 1 && start && start.px !== undefined) { const dx = e.clientX - start.px, dy = e.clientY - start.py; if (Math.abs(dx) + Math.abs(dy) > 6) moved = true; if (sc > 1) { x = start.x + dx; y = start.y + dy; apply(); } else { img.style.transition = 'none'; img.style.transform = `translateY(${Math.max(0, dy)}px)`; d.style.background = `rgba(0,0,0,${Math.max(.4, .94 - dy / 500)})`; } } });
  const up = e => { const was = pts.size; pts.delete(e.pointerId);
    if (was === 1 && sc <= 1 && start && start.py !== undefined && e.clientY - start.py > 120) return close();
    if (was === 1 && !moved) { const now = Date.now(); if (now - lastTap < 300) { if (sc > 1) { sc = 1; x = 0; y = 0; } else { const r = st.getBoundingClientRect(); sc = 2.5; x = (r.width / 2 - (e.clientX - r.left)) * 1.5; y = (r.height / 2 - (e.clientY - r.top)) * 1.5; } clampP(); apply(true); lastTap = 0; return; } lastTap = now; }
    if (pts.size === 1) { const [a] = [...pts.values()]; start = { px: a.x, py: a.y, x, y }; } else start = null;
    d.style.background = ''; clampP(); apply(true); };
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  st.addEventListener('wheel', e => { e.preventDefault(); sc = Math.min(5, Math.max(1, sc * (e.deltaY < 0 ? 1.15 : .87))); clampP(); apply(); }, { passive: false });
}

// ---------- UI ----------
const PAL = [['#1f3d6e', '#8fb4f0'], ['#6a3a1c', '#f0b27a'], ['#1d5238', '#83d1a6'], ['#4a2a66', '#c7a2ec'], ['#14545a', '#7fd3d9'], ['#6b2433', '#ef9aa9'], ['#4d4a1a', '#d8d27a'], ['#3b4256', '#aab4cc']];
const col = uid => { let h = 0; for (const c of String(uid || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PAL[h % PAL.length]; };
function bubble(m) {
  const me = user && m.uid === user.uid, [bg, ac] = col(m.uid);
  const r = m.r || {}, cnt = {};
  Object.values(r).forEach(e => cnt[e] = (cnt[e] || 0) + 1);
  const chips = Object.keys(cnt).map(e => '<button class="cr' + (user && r[user.uid] === e ? ' on' : '') + '" data-re="' + m.id + '" data-e="' + e + '">' + e + (cnt[e] > 1 ? ' ' + cnt[e] : '') + '</button>').join('');
  const av = m.pic ? '<img class="cav" src="' + esc(m.pic) + '" referrerpolicy="no-referrer" alt="">' : '<span class="cav" style="background:' + bg + '">' + esc((m.name || '?')[0]) + '</span>';
  return '<div class="cm' + (me ? ' me' : '') + '" data-id="' + m.id + '"><span class="cswi">↩︎</span><div class="cbw">' +
    '<div class="ccap" style="color:' + ac + '">' + av + '<span>' + esc(m.name || 'Staff') + '</span></div>' +
    '<div class="cb" style="background:' + bg + '">' +
    (m.rep ? '<div class="cq" style="border-color:' + col(m.rep.uid)[1] + '"><b>' + esc(m.rep.name) + '</b> ' + esc(m.rep.text || '📷') + '</div>' : '') +
    (m.img ? '<img class="ci" src="' + m.img + '" alt="">' : '') +
    (m.text ? '<div class="ct">' + esc(m.text).replace(/\n/g, '<br>') + '</div>' : '') +
    '<div class="ctm">' + hhmm(ms(m)) + '</div></div>' +
    (chips ? '<div class="crs">' + chips + '</div>' : '') +
    (sel === m.id ? '<div class="cact">' + EMO.map(e => '<button data-re="' + m.id + '" data-e="' + e + '">' + e + '</button>').join('') +
      '<button class="crp" data-rp="' + m.id + '">↩︎ ' + T('Répondre', 'Reply') + '</button>' + (me ? '<button class="crp" data-del="' + m.id + '">🗑</button>' : '') + '</div>' : '') +
    '</div></div>';
}
function setRep(id) { const m = msgs.find(x => x.id === id); if (!m) return; rep = { id: m.id, uid: m.uid || '', name: m.name || '', text: (m.text || (m.img ? '📷 Photo' : '')).slice(0, 120) }; sel = null; paint(); const ta = ov && ov.querySelector('textarea'); if (ta) ta.focus(); }
function paint() {
  if (!ov) return;
  const body = ov.querySelector('.cbody'), foot = ov.querySelector('.cfoot');
  if (!user) {
    body.innerHTML = '<div class="cempty"><div style="font-size:44px">💬</div><p>' + T('Connectez-vous avec Google pour lire et écrire dans le chat de l\'équipe.', 'Sign in with Google to read and post in the team chat.') + '</p><button class="btn" id="cIn" style="background:#fff;color:#1f1f1f;border:1px solid #dadce0;max-width:300px;margin:0 auto">' + T('Se connecter avec Google', 'Sign in with Google') + '</button></div>';
    foot.style.display = 'none';
    body.querySelector('#cIn').onclick = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { if (/popup-blocked|operation-not-supported|web-storage/.test(e.code || '')) signInWithRedirect(auth, new GoogleAuthProvider()); } };
    return;
  }
  foot.style.display = '';
  const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
  body.innerHTML = (err ? '<p class="warn sm" style="text-align:center">' + err + '</p>' : '') +
    (msgs.length ? msgs.map(bubble).join('') : '<div class="cempty"><div style="font-size:44px">👋</div><p>' + T('Aucun message pour l\'instant. Lancez la conversation !', 'No messages yet. Start the conversation!') + '</p></div>');
  if (atBottom || !paint.done) { body.scrollTop = body.scrollHeight; paint.done = true; }
  const rp = ov.querySelector('.crep');
  rp.style.display = rep || pend ? 'flex' : 'none';
  rp.innerHTML = (pend ? '<img src="' + pend + '" alt="">' : '') + '<div class="grow crq" style="min-width:0' + (rep ? ';border-color:' + col(rep.uid)[1] : '') + '">' + (rep ? '<b style="color:' + col(rep.uid)[1] + '">↩︎ ' + esc(rep.name) + '</b><div class="crt">' + esc(rep.text || '📷') + '</div>' : '<span class="muted">' + T('Photo prête à envoyer', 'Photo ready to send') + '</span>') + '</div><button aria-label="x">✕</button>';
  rp.querySelector('button').onclick = () => { rep = null; pend = null; paint(); };
}
async function send() {
  const ta = ov.querySelector('textarea'), text = ta.value.trim().slice(0, 1000);
  if (!text && !pend) return;
  const d = { uid: user.uid, name: user.displayName || 'Staff', pic: user.photoURL || '', text, ts: serverTimestamp() };
  if (pend) d.img = pend;
  if (rep) d.rep = rep;
  ta.value = ''; ta.style.height = ''; const keepP = pend, keepR = rep; pend = null; rep = null; sel = null; paint.done = false; paint();
  try { await addDoc(collection(db, 'chat'), d); } catch (e) { pend = keepP; rep = keepR; ta.value = text; err = T('Envoi impossible', 'Could not send'); paint(); }
}
async function react(id, e) {
  const m = msgs.find(x => x.id === id); if (!m || !user) return;
  const cur = (m.r || {})[user.uid];
  try { await updateDoc(doc(db, 'chat', id), { ['r.' + user.uid]: cur === e ? deleteField() : e }); } catch (x) { }
}
function open() {
  if (ov) return;
  ov = document.createElement('div'); ov.className = 'chatov';
  ov.innerHTML = '<div class="sch"><button class="cx" aria-label="close">←</button><div class="grow"><div style="font-weight:700">' + T('Chat de l\'équipe', 'Team chat') + '</div><div class="muted sm">Les Trois Forts</div></div></div>' +
    '<div class="cbody"></div><div class="cfoot"><div class="crep"></div><div class="cmenu" hidden><label><input type="file" accept="image/*" capture="environment" hidden>📷 ' + T('Appareil photo', 'Camera') + '</label><label><input type="file" accept="image/*" hidden>🖼️ ' + T('Photos', 'Photos') + '</label></div><div class="cpill"><textarea rows="1" maxlength="1000" enterkeyhint="send" placeholder="' + T('Message…', 'Message…') + '"></textarea><button class="cplus" aria-label="photo">+</button></div></div>';
  document.body.appendChild(ov);
  history.pushState({ chat: 1 }, '');
  ov.querySelector('.cx').onclick = () => history.back();
  const ta = ov.querySelector('textarea');
  ta.addEventListener('input', () => { ta.style.height = ''; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  ta.addEventListener('beforeinput', e => { if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') { e.preventDefault(); send(); } });
  const menu = ov.querySelector('.cmenu');
  ov.querySelector('.cplus').onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
  ov.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('.cmenu')) menu.hidden = true; });
  ov.querySelectorAll('.cmenu input[type=file]').forEach(inp => inp.onchange = async e => { menu.hidden = true; const f = e.target.files[0]; e.target.value = ''; if (!f || !/^image\//.test(f.type)) return; try { pend = await shrink(f); paint(); ta.focus(); } catch (x) { err = T('Photo illisible', 'Could not read photo'); paint(); } });
  ov.querySelector('.cbody').addEventListener('click', e => {
    const t = e.target; if (ov.querySelector('.cbody').dataset.sw) return;
    if (t.closest('[data-re]')) { const b = t.closest('[data-re]'); sel = null; react(b.dataset.re, b.dataset.e); paint(); return; }
    if (t.closest('[data-rp]')) { setRep(t.closest('[data-rp]').dataset.rp); return; }
    if (t.closest('[data-del]')) { const id = t.closest('[data-del]').dataset.del; sel = null; if (confirm(T('Supprimer ce message ?', 'Delete this message?'))) deleteDoc(doc(db, 'chat', id)).catch(() => { }); paint(); return; }
    if (t.classList.contains('ci')) { view(t.src); return; }
    const b = t.closest('.cb'); const cm = t.closest('.cm');
    sel = b && cm && sel !== cm.dataset.id ? cm.dataset.id : null; paint();
  });
  const body = ov.querySelector('.cbody'); let sw = null;
  body.addEventListener('pointerdown', e => { const cm = e.target.closest('.cm'); if (!cm || e.target.closest('button')) return; sw = { cm, x: e.clientX, y: e.clientY, on: false }; });
  body.addEventListener('pointermove', e => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (!sw.on) { if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; } if (dx > 10 && dx > Math.abs(dy)) { sw.on = true; try { body.setPointerCapture(e.pointerId); } catch (x) { } } else return; }
    const v = Math.max(0, Math.min(90, dx)); sw.cm.style.transition = 'none'; sw.cm.style.transform = 'translateX(' + v + 'px)'; sw.cm.classList.toggle('arm', v > 60); });
  const end = () => { if (!sw) return; const cm = sw.cm, on = sw.on, arm = cm.classList.contains('arm'); sw = null; if (!on) return;
    cm.style.transition = 'transform .2s'; cm.style.transform = ''; cm.classList.remove('arm'); body.dataset.sw = '1'; setTimeout(() => delete body.dataset.sw, 50);
    if (arm) { if (navigator.vibrate) navigator.vibrate(10); setRep(cm.dataset.id); } };
  body.addEventListener('pointerup', end); body.addEventListener('pointercancel', end);
  markSeen(); paint.done = false; paint(); fab();
}
function close() { if (!ov) return; ov.remove(); ov = null; sel = null; markSeen(); fab(); }
addEventListener('popstate', e => { if (!ov) return; e.stopImmediatePropagation(); const z = document.querySelector('.zoomv'); if (z) { z.remove(); history.pushState({ chat: 1 }, ''); return; } close(); }, true);

function fab() {
  let b = document.getElementById('chatFab');
  if (!b) { b = document.createElement('button'); b.id = 'chatFab'; b.className = 'chatfab'; b.setAttribute('aria-label', 'Chat'); b.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/></svg><i></i>'; b.onclick = open; document.body.appendChild(b); }
  const s = document.getElementById('scanFab');
  const show = !ov && s && s.style.display !== 'none';
  const dv = show ? 'flex' : 'none'; if (b.style.display !== dv) b.style.display = dv;
  const up = !!(s && s.classList.contains('up')), dt = !!unread();
  if (b.classList.contains('up') !== up) b.classList.toggle('up', up);
  if (b.classList.contains('dot') !== dt) b.classList.toggle('dot', dt);
}
new MutationObserver(() => fab()).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
onAuthStateChanged(auth, u => { user = u; listen(); paint(); fab(); });
