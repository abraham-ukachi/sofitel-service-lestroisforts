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
 * @name: Les Trois Forts - Team Chat
 * @file: pwa/chat.js
 * @type: JavaScript (ES module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script type="module" src="chat.js"
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 💬 Team chat: public messages + photos for the signed-in staff (Firestore collection `chat`).
// Doc: { uid, name, pic, text, img (JPEG data URL, <= ~700 KB), ts, rep: { id, name, text }, r: { <uid>: emoji } }
// Photos live inline in the doc (Firebase Storage needs the paid Blaze plan 💸).

// import the Firebase app helpers (reuse the app `cloud.js` already created, if any) 🔥
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
// import the Google auth helpers 🔐
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
// import the Firestore helpers (live query, add / update / delete, server time) 🗃️
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===== FIREBASE 🔥 ===== //

// the public web config of the `les-trois-forts` Firebase project (guarded by the Firestore rules 🛡️)
const firebaseConfig = {
  apiKey: 'AIzaSyDOkFXbEGOS1i-k2TcU9eSrlOubGWaN-Q0',
  authDomain: 'les-trois-forts.firebaseapp.com',
  projectId: 'les-trois-forts',
  storageBucket: 'les-trois-forts.firebasestorage.app',
  messagingSenderId: '416441759360',
  appId: '1:416441759360:web:61f9c52cfdd966af3ed865',
};
// the Firebase app (shared with cloud.js), its auth & its Firestore database 🚀
const firebaseApp = getApps()[0] || initializeApp(firebaseConfig),
  auth = getAuth(firebaseApp),
  firestore = getFirestore(firebaseApp);

// ===== CONSTANTS & HELPERS 🧰 ===== //

// the quick reactions (one emoji per user and message) 😍
const REACTIONS = ['👍', '❤️', '😂', '😮', '🙏', '🔥'];

/**
 * `isEnglish` - Function 🌍
 *
 * @returns { boolean } - true when the waiter picked English in the app
 */
const isEnglish = () => {
  try {
    return JSON.parse(localStorage.getItem('ltf_v1') || '{}').lang === 'en';
  } catch (error) {
    return false;
  }
};

/**
 * `translate` - Function 🏷️
 *
 * Picks the French or the English text (same helper as in the app).
 *
 * @param { string } fr - the French text
 * @param { string } en - the English text
 * @returns { string } - the text in the current language
 */
const translate = (fr, en) => (isEnglish() ? en : fr);

/**
 * `escapeHtml` - Function 🛡️
 *
 * @param { any } value - the text to escape (`&`, `<`, `>`, `"` and `'`)
 * @returns { string } - the escaped text
 */
const escapeHtml = (value) =>
  String(value || '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

// the localStorage key of the last message seen (ms), for the red dot 🔴
const SEEN_KEY = 'ltf_chat_seen';

// ===== STATE 🌱 ===== //

// the user, the messages, the snapshot unsubscriber, the overlay, the reply target, the pending photo,
// the selected message (action bar) & the error line
let user = null,
  messages = [],
  unsubscribe = null,
  overlay = null,
  replyTo = null,
  pendingPhoto = null,
  selectedId = null,
  errorText = '';

/**
 * `timeOf` - Function ⏱️
 *
 * @param { object } message - a chat message
 * @returns { number } - its time in ms (now, while the server timestamp is still pending)
 */
const timeOf = (message) => (message.ts && message.ts.toMillis ? message.ts.toMillis() : Date.now());

/**
 * `formatTime` - Function 🕘
 *
 * @param { number } time - a time in ms
 * @returns { string } - "14:05" today, else "18 oct. 14:05"
 */
const formatTime = (time) => {
  // the message date & now
  const date = new Date(time),
    now = new Date();
  // the hour, in the waiter's locale
  const hour = date.toLocaleTimeString(isEnglish() ? 'en-GB' : 'fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  // today? just the hour, else the day + the hour 📅
  return date.toDateString() === now.toDateString()
    ? hour
    : date.toLocaleDateString(isEnglish() ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short' }) +
        ' ' +
        hour;
};

/**
 * `hasUnread` - Function 🔴
 *
 * @returns { boolean } - true when someone else posted after the last message seen
 */
const hasUnread = () => {
  const seen = +localStorage.getItem(SEEN_KEY) || 0;
  return user && messages.some((message) => message.uid !== user.uid && timeOf(message) > seen);
};

/**
 * `markSeen` - Function ✅
 *
 * Remembers the time of the newest message as seen.
 *
 * @returns { void }
 */
const markSeen = () => {
  if (messages.length) localStorage.setItem(SEEN_KEY, String(Math.max(...messages.map(timeOf))));
};

// ===== LIVE QUERY 👂 ===== //

/**
 * `listen` - Function 👂
 *
 * (Re)subscribes to the 150 newest messages of the signed-in user (nothing when signed out).
 *
 * @returns { void }
 */
function listen() {
  // stop the previous subscription 🧹
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  // start empty; signed out? just paint the sign-in screen
  messages = [];
  if (!user) {
    paint();
    return;
  }
  // the newest 150 messages, live 🔴
  unsubscribe = onSnapshot(
    query(collection(firestore, 'chat'), orderBy('ts', 'desc'), limit(150)),
    (snapshot) => {
      // oldest first, with an estimated time for our own pending messages
      messages = snapshot.docs
        .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data({ serverTimestamps: 'estimate' }) }))
        .reverse();
      errorText = '';
      // chat open? it's seen; repaint + refresh the button
      if (overlay) markSeen();
      paint();
      updateFab();
    },
    () => {
      errorText = translate('Chat indisponible pour le moment', 'Chat unavailable right now');
      paint();
    },
  );
}

// ===== PHOTO 📷 ===== //

/**
 * `shrinkPhoto` - Function 📷
 *
 * Shrinks a photo to a <= 1280 px JPEG so it fits in one Firestore doc
 * (up to 6 tries, 20% smaller and a bit more compressed each time).
 *
 * @param { File } file - the picked photo
 * @returns { Promise<string> } - the JPEG data URL (rejects when still too big or unreadable)
 */
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    // a temporary URL for the file & the image to draw
    const url = URL.createObjectURL(file),
      image = new Image();
    image.onload = () => {
      // the max side, the JPEG quality & the result
      let maxSide = 1280,
        quality = 0.78,
        out = '';
      for (let attempt = 0; attempt < 6; attempt++) {
        // the scale (never upscale) & a fresh canvas 🖼️
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height)),
          canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        // draw the photo, scaled
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        // small enough? done ✅, else shrink & compress more
        out = canvas.toDataURL('image/jpeg', quality);
        if (out.length < 700000) break;
        maxSide *= 0.8;
        quality -= 0.06;
      }
      // free the URL 🧹 and resolve (or reject when it's still over ~900 KB)
      URL.revokeObjectURL(url);
      out.length < 900000 ? resolve(out) : reject();
    };
    // unreadable file ❌
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject();
    };
    // load it
    image.src = url;
  });
}

// ===== PHOTO VIEWER 🔍 ===== //

/**
 * `viewPhoto` - Function 🔍
 *
 * Opens a full-screen photo viewer: pinch / wheel to zoom, double-tap to zoom in or out,
 * drag to pan, drag down to close.
 *
 * @param { string } src - the photo URL (data URL)
 * @returns { void }
 */
function viewPhoto(src) {
  // the viewer overlay (same markup & classes as the app's zoom viewer)
  const viewer = document.createElement('div');
  viewer.className = 'ov zoomv';
  viewer.innerHTML =
    '<div class="zt"><div class="zn"></div><button class="zx" aria-label="close" style="font-size:22px">✕</button></div><div class="zs"><img src="' +
    src +
    '" alt="" draggable="false"></div><div class="zh">' +
    translate('Pincez ou touchez deux fois pour zoomer', 'Pinch or double-tap to zoom') +
    '</div>';
  // show it, then grab the image & the stage
  document.body.appendChild(viewer);
  const img = viewer.querySelector('img'),
    stage = viewer.querySelector('.zs');
  // the zoom, the pan, the active pointers, the gesture start, the last tap & the "moved" flag 🖐️
  let scale = 1,
    offsetX = 0,
    offsetY = 0,
    pointers = new Map(),
    start = null,
    lastTap = 0,
    moved = false;
  // apply the transform (animated or not)
  const apply = (animated) => {
    img.style.transition = animated ? 'transform .2s' : 'none';
    img.style.transform = `translate(${offsetX}px,${offsetY}px) scale(${scale})`;
  };
  // keep the photo inside the stage (and reset at 1x)
  const clampPan = () => {
    if (scale <= 1) {
      scale = 1;
      offsetX = 0;
      offsetY = 0;
      return;
    }
    const rect = stage.getBoundingClientRect();
    const maxX = Math.max(0, (img.offsetWidth * scale - rect.width) / 2),
      maxY = Math.max(0, (img.offsetHeight * scale - rect.height) / 2);
    offsetX = Math.min(maxX, Math.max(-maxX, offsetX));
    offsetY = Math.min(maxY, Math.max(-maxY, offsetY));
  };
  // ✕ closes the viewer
  const closeViewer = () => viewer.remove();
  viewer.querySelector('.zx').onclick = closeViewer;

  // 👇 a finger goes down: start a pan (1 finger) or a pinch (2 fingers)
  stage.addEventListener('pointerdown', (event) => {
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved = false;
    if (pointers.size === 2) {
      const [firstPointer, secondPointer] = [...pointers.values()];
      start = {
        dist: Math.hypot(firstPointer.x - secondPointer.x, firstPointer.y - secondPointer.y),
        sc: scale,
        x: offsetX,
        y: offsetY,
        cx: (firstPointer.x + secondPointer.x) / 2,
        cy: (firstPointer.y + secondPointer.y) / 2,
      };
    } else start = { px: event.clientX, py: event.clientY, x: offsetX, y: offsetY };
  });

  // 👉 a finger moves: pinch-zoom, pan, or drag down to close
  stage.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    // 🤏 pinch: zoom between 1x and 5x around the fingers' center
    if (pointers.size === 2 && start && start.dist) {
      const [firstPointer, secondPointer] = [...pointers.values()];
      scale = Math.min(
        5,
        Math.max(
          1,
          (start.sc * Math.hypot(firstPointer.x - secondPointer.x, firstPointer.y - secondPointer.y)) /
            start.dist,
        ),
      );
      offsetX = start.x + ((firstPointer.x + secondPointer.x) / 2 - start.cx);
      offsetY = start.y + ((firstPointer.y + secondPointer.y) / 2 - start.cy);
      moved = true;
      apply();
    }
    // ☝️ one finger: pan when zoomed, else follow the finger down (and fade the backdrop)
    else if (pointers.size === 1 && start && start.px !== undefined) {
      const dx = event.clientX - start.px,
        dy = event.clientY - start.py;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      if (scale > 1) {
        offsetX = start.x + dx;
        offsetY = start.y + dy;
        apply();
      } else {
        img.style.transition = 'none';
        img.style.transform = `translateY(${Math.max(0, dy)}px)`;
        viewer.style.background = `rgba(0,0,0,${Math.max(0.4, 0.94 - dy / 500)})`;
      }
    }
  });

  // 👆 a finger goes up: close (dragged down), double-tap zoom, or settle
  const onPointerUp = (event) => {
    const pointerCount = pointers.size;
    pointers.delete(event.pointerId);
    // dragged down by more than 120 px at 1x? close 👋
    if (pointerCount === 1 && scale <= 1 && start && start.py !== undefined && event.clientY - start.py > 120)
      return closeViewer();
    // a tap: second tap within 300 ms toggles 1x / 2.5x (zooming on the tapped point)
    if (pointerCount === 1 && !moved) {
      const now = Date.now();
      if (now - lastTap < 300) {
        if (scale > 1) {
          scale = 1;
          offsetX = 0;
          offsetY = 0;
        } else {
          const rect = stage.getBoundingClientRect();
          scale = 2.5;
          offsetX = (rect.width / 2 - (event.clientX - rect.left)) * 1.5;
          offsetY = (rect.height / 2 - (event.clientY - rect.top)) * 1.5;
        }
        clampPan();
        apply(true);
        lastTap = 0;
        return;
      }
      lastTap = now;
    }
    // one finger left: continue as a pan from here
    if (pointers.size === 1) {
      const [remainingPointer] = [...pointers.values()];
      start = { px: remainingPointer.x, py: remainingPointer.y, x: offsetX, y: offsetY };
    } else start = null;
    // reset the backdrop & settle inside the stage
    viewer.style.background = '';
    clampPan();
    apply(true);
  };
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', onPointerUp);

  // 🖱️ mouse wheel zoom (desktop)
  stage.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      scale = Math.min(5, Math.max(1, scale * (event.deltaY < 0 ? 1.15 : 0.87)));
      clampPan();
      apply();
    },
    { passive: false },
  );
}

// ===== UI 🎨 ===== //

// the bubble palette: [background, accent] pairs, one per user (picked from the uid) 🎨
const PALETTE = [
  ['#1f3d6e', '#8fb4f0'],
  ['#6a3a1c', '#f0b27a'],
  ['#1d5238', '#83d1a6'],
  ['#4a2a66', '#c7a2ec'],
  ['#14545a', '#7fd3d9'],
  ['#6b2433', '#ef9aa9'],
  ['#4d4a1a', '#d8d27a'],
  ['#3b4256', '#aab4cc'],
];

/**
 * `colorsOf` - Function 🎨
 *
 * @param { string } uid - a user id
 * @returns { [string, string] } - the [background, accent] colors of that user (stable hash)
 */
const colorsOf = (uid) => {
  let hash = 0;
  for (const char of String(uid || '')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
};

/**
 * `bubbleHtml` - Function 💬
 *
 * The HTML of one message: avatar + name, quoted reply, photo, text, time, reaction chips
 * and (when selected) the action bar (reactions, reply, delete own).
 *
 * @param { object } message - a chat message
 * @returns { string } - the bubble HTML
 */
function bubbleHtml(message) {
  // mine? & my colors
  const isMine = user && message.uid === user.uid,
    [background, accent] = colorsOf(message.uid);
  // the reactions { uid: emoji } & their counts { emoji: n }
  const reactions = message.r || {},
    counts = {};
  Object.values(reactions).forEach((emoji) => (counts[emoji] = (counts[emoji] || 0) + 1));
  // the reaction chips (mine is highlighted)
  const chips = Object.keys(counts)
    .map(
      (emoji) =>
        '<button class="cr' +
        (user && reactions[user.uid] === emoji ? ' on' : '') +
        '" data-re="' +
        message.id +
        '" data-e="' +
        emoji +
        '">' +
        emoji +
        (counts[emoji] > 1 ? ' ' + counts[emoji] : '') +
        '</button>',
    )
    .join('');
  // the avatar: Google photo or the first letter 🖼️
  const avatar = message.pic
    ? '<img class="cav" src="' + escapeHtml(message.pic) + '" referrerpolicy="no-referrer" alt="">'
    : '<span class="cav" style="background:' +
      background +
      '">' +
      escapeHtml((message.name || '?')[0]) +
      '</span>';
  // the bubble
  return (
    '<div class="cm' +
    (isMine ? ' me' : '') +
    '" data-id="' +
    message.id +
    '"><span class="cswi">↩︎</span><div class="cbw">' +
    '<div class="ccap" style="color:' +
    accent +
    '">' +
    avatar +
    '<span>' +
    escapeHtml(message.name || 'Staff') +
    '</span></div>' +
    '<div class="cb" style="background:' +
    background +
    '">' +
    // ↩️ the quoted message
    (message.rep
      ? '<div class="cq" style="border-color:' +
        colorsOf(message.rep.uid)[1] +
        '"><b>' +
        escapeHtml(message.rep.name) +
        '</b> ' +
        escapeHtml(message.rep.text || '📷') +
        '</div>'
      : '') +
    // 📷 the photo
    (message.img ? '<img class="ci" src="' + message.img + '" alt="">' : '') +
    // ✍️ the text (new lines kept)
    (message.text ? '<div class="ct">' + escapeHtml(message.text).replace(/\n/g, '<br>') + '</div>' : '') +
    // 🕘 the time
    '<div class="ctm">' +
    formatTime(timeOf(message)) +
    '</div></div>' +
    // 😍 the reaction chips
    (chips ? '<div class="crs">' + chips + '</div>' : '') +
    // the action bar of the selected message
    (selectedId === message.id
      ? '<div class="cact">' +
        REACTIONS.map(
          (emoji) => '<button data-re="' + message.id + '" data-e="' + emoji + '">' + emoji + '</button>',
        ).join('') +
        '<button class="crp" data-rp="' +
        message.id +
        '">↩︎ ' +
        translate('Répondre', 'Reply') +
        '</button>' +
        (isMine ? '<button class="crp" data-del="' + message.id + '">🗑</button>' : '') +
        '</div>'
      : '') +
    '</div></div>'
  );
}

/**
 * `setReplyTo` - Function ↩️
 *
 * Quotes a message in the composer and focuses the text box.
 *
 * @param { string } id - the message id
 * @returns { void }
 */
function setReplyTo(id) {
  const message = messages.find((candidate) => candidate.id === id);
  if (!message) return;
  replyTo = {
    id: message.id,
    uid: message.uid || '',
    name: message.name || '',
    text: (message.text || (message.img ? '📷 Photo' : '')).slice(0, 120),
  };
  selectedId = null;
  paint();
  const textarea = overlay && overlay.querySelector('textarea');
  if (textarea) textarea.focus();
}

/**
 * `paint` - Function 🎨
 *
 * Repaints the open chat: sign-in screen, messages (keeps the scroll at the bottom when it was),
 * and the reply / photo preview above the composer.
 *
 * @returns { void }
 */
function paint() {
  // chat closed? nothing to paint
  if (!overlay) return;
  // the message list & the composer
  const body = overlay.querySelector('.cbody'),
    footer = overlay.querySelector('.cfoot');
  // 🔐 signed out: the "Sign in with Google" screen
  if (!user) {
    body.innerHTML =
      '<div class="cempty"><div style="font-size:44px">💬</div><p>' +
      translate(
        "Connectez-vous avec Google pour lire et écrire dans le chat de l'équipe.",
        'Sign in with Google to read and post in the team chat.',
      ) +
      '</p><button class="btn" id="cIn" style="background:#fff;color:#1f1f1f;border:1px solid #dadce0;max-width:300px;margin:0 auto">' +
      translate('Se connecter avec Google', 'Sign in with Google') +
      '</button></div>';
    footer.style.display = 'none';
    // popup first, redirect when popups are blocked 🔀
    body.querySelector('#cIn').onclick = async () => {
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
      } catch (error) {
        if (/popup-blocked|operation-not-supported|web-storage/.test(error.code || ''))
          signInWithRedirect(auth, new GoogleAuthProvider());
      }
    };
    return;
  }
  // show the composer
  footer.style.display = '';
  // were we at the bottom (within 80 px)?
  const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
  // the error line + the bubbles (or the empty state 👋)
  body.innerHTML =
    (errorText ? '<p class="warn sm" style="text-align:center">' + errorText + '</p>' : '') +
    (messages.length
      ? messages.map(bubbleHtml).join('')
      : '<div class="cempty"><div style="font-size:44px">👋</div><p>' +
        translate(
          "Aucun message pour l'instant. Lancez la conversation !",
          'No messages yet. Start the conversation!',
        ) +
        '</p></div>');
  // stick to the bottom (always on the first paint) ⬇️
  if (atBottom || !paint.done) {
    body.scrollTop = body.scrollHeight;
    paint.done = true;
  }
  // the reply / photo preview
  const preview = overlay.querySelector('.crep');
  preview.style.display = replyTo || pendingPhoto ? 'flex' : 'none';
  preview.innerHTML =
    (pendingPhoto ? '<img src="' + pendingPhoto + '" alt="">' : '') +
    '<div class="grow crq" style="min-width:0' +
    (replyTo ? ';border-color:' + colorsOf(replyTo.uid)[1] : '') +
    '">' +
    (replyTo
      ? '<b style="color:' +
        colorsOf(replyTo.uid)[1] +
        '">↩︎ ' +
        escapeHtml(replyTo.name) +
        '</b><div class="crt">' +
        escapeHtml(replyTo.text || '📷') +
        '</div>'
      : '<span class="muted">' + translate('Photo prête à envoyer', 'Photo ready to send') + '</span>') +
    '</div><button aria-label="x">✕</button>';
  // ✕ drops the reply & the photo
  preview.querySelector('button').onclick = () => {
    replyTo = null;
    pendingPhoto = null;
    paint();
  };
}

/**
 * `send` - Async Function 🚀
 *
 * Posts the composer text (max 1000 chars), the pending photo and the reply.
 * Clears the composer right away and restores it when sending fails.
 *
 * @returns { Promise<void> }
 */
async function send() {
  // the text box & its trimmed text
  const textarea = overlay.querySelector('textarea'),
    text = textarea.value.trim().slice(0, 1000);
  // nothing to send?
  if (!text && !pendingPhoto) return;
  // the new doc 🗃️
  const newMessage = {
    uid: user.uid,
    name: user.displayName || 'Staff',
    pic: user.photoURL || '',
    text,
    ts: serverTimestamp(),
  };
  if (pendingPhoto) newMessage.img = pendingPhoto;
  if (replyTo) newMessage.rep = replyTo;
  // clear the composer (keep a copy in case it fails) 🧹
  textarea.value = '';
  textarea.style.height = '';
  const keptPhoto = pendingPhoto,
    keptReply = replyTo;
  pendingPhoto = null;
  replyTo = null;
  selectedId = null;
  paint.done = false;
  paint();
  // post it (❌ restore everything on failure)
  try {
    await addDoc(collection(firestore, 'chat'), newMessage);
  } catch (error) {
    pendingPhoto = keptPhoto;
    replyTo = keptReply;
    textarea.value = text;
    errorText = translate('Envoi impossible', 'Could not send');
    paint();
  }
}

/**
 * `react` - Async Function 😍
 *
 * Toggles my reaction on a message (same emoji again removes it).
 *
 * @param { string } id - the message id
 * @param { string } emoji - the reaction
 * @returns { Promise<void> }
 */
async function react(id, emoji) {
  const message = messages.find((candidate) => candidate.id === id);
  if (!message || !user) return;
  // my current reaction
  const current = (message.r || {})[user.uid];
  // only `r.<my uid>` may be written (Firestore rules 🛡️)
  try {
    await updateDoc(doc(firestore, 'chat', id), {
      ['r.' + user.uid]: current === emoji ? deleteField() : emoji,
    });
  } catch (error) {}
}

/**
 * `openChat` - Function 💬
 *
 * Opens the full-screen chat (pushes a history entry so Back closes it) and wires
 * the composer, the photo menu, taps on bubbles and the swipe-to-reply gesture.
 *
 * @returns { void }
 */
function openChat() {
  // already open?
  if (overlay) return;
  // the overlay: header, message list, reply preview, photo menu & composer pill
  overlay = document.createElement('div');
  overlay.className = 'chatov';
  overlay.innerHTML =
    '<div class="sch"><button class="cx" aria-label="close">←</button><div class="grow"><div style="font-weight:700">' +
    translate("Chat de l'équipe", 'Team chat') +
    '</div><div class="muted sm">Les Trois Forts</div></div></div>' +
    '<div class="cbody"></div><div class="cfoot"><div class="crep"></div><div class="cmenu" hidden><label><input type="file" accept="image/*" capture="environment" hidden>📷 ' +
    translate('Appareil photo', 'Camera') +
    '</label><label><input type="file" accept="image/*" hidden>🖼️ ' +
    translate('Photos', 'Photos') +
    '</label></div><div class="cpill"><textarea rows="1" maxlength="1000" enterkeyhint="send" placeholder="' +
    translate('Message…', 'Message…') +
    '"></textarea><button class="cplus" aria-label="photo">+</button></div></div>';
  document.body.appendChild(overlay);
  // 🔙 Back (button or gesture) closes the chat
  history.pushState({ chat: 1 }, '');
  overlay.querySelector('.cx').onclick = () => history.back();

  // ✍️ the composer: grows up to 120 px, Enter sends (Shift+Enter = new line)
  const textarea = overlay.querySelector('textarea');
  textarea.addEventListener('input', () => {
    textarea.style.height = '';
    textarea.style.height = Math.min(120, textarea.scrollHeight) + 'px';
  });
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      send();
    }
  });
  // the mobile keyboard "send" key ⌨️
  textarea.addEventListener('beforeinput', (event) => {
    if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph') {
      event.preventDefault();
      send();
    }
  });

  // ➕ the photo menu (camera / gallery), closed by any tap outside
  const menu = overlay.querySelector('.cmenu');
  overlay.querySelector('.cplus').onclick = (event) => {
    event.stopPropagation();
    menu.hidden = !menu.hidden;
  };
  overlay.addEventListener('click', (event) => {
    if (!menu.hidden && !event.target.closest('.cmenu')) menu.hidden = true;
  });
  // 📷 a photo was picked: shrink it and show the preview
  overlay.querySelectorAll('.cmenu input[type=file]').forEach(
    (input) =>
      (input.onchange = async (event) => {
        menu.hidden = true;
        const file = event.target.files[0];
        event.target.value = '';
        if (!file || !/^image\//.test(file.type)) return;
        try {
          pendingPhoto = await shrinkPhoto(file);
          paint();
          textarea.focus();
        } catch (error) {
          errorText = translate('Photo illisible', 'Could not read photo');
          paint();
        }
      }),
  );

  // 👆 taps in the message list (ignored right after a swipe)
  overlay.querySelector('.cbody').addEventListener('click', (event) => {
    const target = event.target;
    if (overlay.querySelector('.cbody').dataset.sw) return;
    // 😍 a reaction
    if (target.closest('[data-re]')) {
      const button = target.closest('[data-re]');
      selectedId = null;
      react(button.dataset.re, button.dataset.e);
      paint();
      return;
    }
    // ↩️ reply
    if (target.closest('[data-rp]')) {
      setReplyTo(target.closest('[data-rp]').dataset.rp);
      return;
    }
    // 🗑 delete (own messages only, after a confirm)
    if (target.closest('[data-del]')) {
      const id = target.closest('[data-del]').dataset.del;
      selectedId = null;
      if (confirm(translate('Supprimer ce message ?', 'Delete this message?')))
        deleteDoc(doc(firestore, 'chat', id)).catch(() => {});
      paint();
      return;
    }
    // 🔍 a photo
    if (target.classList.contains('ci')) {
      viewPhoto(target.src);
      return;
    }
    // a bubble: toggle its action bar
    const bubble = target.closest('.cb');
    const messageRow = target.closest('.cm');
    selectedId = bubble && messageRow && selectedId !== messageRow.dataset.id ? messageRow.dataset.id : null;
    paint();
  });

  // 👉 swipe a message to the right to reply (like WhatsApp)
  const body = overlay.querySelector('.cbody');
  let swipe = null;
  body.addEventListener('pointerdown', (event) => {
    const messageRow = event.target.closest('.cm');
    if (!messageRow || event.target.closest('button')) return;
    swipe = { cm: messageRow, x: event.clientX, y: event.clientY, on: false };
  });
  body.addEventListener('pointermove', (event) => {
    if (!swipe) return;
    const dx = event.clientX - swipe.x,
      dy = event.clientY - swipe.y;
    // not started yet: vertical = scrolling (give up), horizontal > 10 px = swipe 🏁
    if (!swipe.on) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        swipe = null;
        return;
      }
      if (dx > 10 && dx > Math.abs(dy)) {
        swipe.on = true;
        try {
          body.setPointerCapture(event.pointerId);
        } catch (error) {}
      } else return;
    }
    // follow the finger (max 90 px), armed past 60 px
    const offset = Math.max(0, Math.min(90, dx));
    swipe.cm.style.transition = 'none';
    swipe.cm.style.transform = 'translateX(' + offset + 'px)';
    swipe.cm.classList.toggle('arm', offset > 60);
  });
  // the finger lifts: snap back, swallow the click & reply when armed 📳
  const endSwipe = () => {
    if (!swipe) return;
    const messageRow = swipe.cm,
      started = swipe.on,
      armed = messageRow.classList.contains('arm');
    swipe = null;
    if (!started) return;
    messageRow.style.transition = 'transform .2s';
    messageRow.style.transform = '';
    messageRow.classList.remove('arm');
    body.dataset.sw = '1';
    setTimeout(() => delete body.dataset.sw, 50);
    if (armed) {
      if (navigator.vibrate) navigator.vibrate(10);
      setReplyTo(messageRow.dataset.id);
    }
  };
  body.addEventListener('pointerup', endSwipe);
  body.addEventListener('pointercancel', endSwipe);

  // everything is seen now ✅; first paint
  markSeen();
  paint.done = false;
  paint();
  updateFab();
}

/**
 * `closeChat` - Function 👋
 *
 * @returns { void }
 */
function closeChat() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
  selectedId = null;
  markSeen();
  updateFab();
}

// 🔙 Back while the chat is open: close the photo viewer first, else the chat (and keep the app's router out of it)
addEventListener(
  'popstate',
  (event) => {
    if (!overlay) return;
    event.stopImmediatePropagation();
    const zoomViewer = document.querySelector('.zoomv');
    if (zoomViewer) {
      zoomViewer.remove();
      history.pushState({ chat: 1 }, '');
      return;
    }
    closeChat();
  },
  true,
);

// ===== CHAT BUTTON 🔵 ===== //

/**
 * `updateFab` - Function 🔵
 *
 * Creates the blue chat button once, shows it only where the scan button shows (home),
 * follows its "up" position and shows the red dot when there are unread messages.
 *
 * @returns { void }
 */
function updateFab() {
  // the chat button (created on first call) 🌱
  let fabButton = document.getElementById('chatFab');
  if (!fabButton) {
    fabButton = document.createElement('button');
    fabButton.id = 'chatFab';
    fabButton.className = 'chatfab';
    fabButton.setAttribute('aria-label', 'Chat');
    fabButton.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/></svg><i></i>';
    fabButton.onclick = openChat;
    document.body.appendChild(fabButton);
  }
  // the scan button (scan.js) 📷
  const scanFab = document.getElementById('scanFab');
  // visible only when the chat is closed and the scan button is visible
  const show = !overlay && scanFab && scanFab.style.display !== 'none';
  // only touch the DOM when something changes (the MutationObserver below watches style/class) 🧹
  const display = show ? 'flex' : 'none';
  if (fabButton.style.display !== display) fabButton.style.display = display;
  const isUp = !!(scanFab && scanFab.classList.contains('up')),
    hasDot = !!hasUnread();
  if (fabButton.classList.contains('up') !== isUp) fabButton.classList.toggle('up', isUp);
  if (fabButton.classList.contains('dot') !== hasDot) fabButton.classList.toggle('dot', hasDot);
}

// ===== BOOT 🚀 ===== //

// 👂 follow every screen change of the app (and the scan button's style/class)
new MutationObserver(() => updateFab()).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'class'],
});
// 👤 signed in / out: (re)listen, repaint & refresh the button
onAuthStateChanged(auth, (signedInUser) => {
  user = signedInUser;
  listen();
  paint();
  updateFab();
});
