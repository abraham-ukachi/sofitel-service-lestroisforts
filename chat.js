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
  setDoc,
  getDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===== FIREBASE 🔥 ===== //

// 🔑 the live app signs in through its own domain (Vercel proxies `/__/auth/*` to Firebase, see vercel.json),
// so Google shows our address and Safari keeps the session; any other host uses the Firebase domain 🌍
const LIVE_HOST = 'sofitel-service-lestroisforts.vercel.app';
const AUTH_DOMAIN = location.hostname === LIVE_HOST ? LIVE_HOST : 'les-trois-forts.firebaseapp.com';

// the public web config of the `les-trois-forts` Firebase project (guarded by the Firestore rules 🛡️)
const firebaseConfig = {
  apiKey: 'AIzaSyDOkFXbEGOS1i-k2TcU9eSrlOubGWaN-Q0',
  authDomain: AUTH_DOMAIN,
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

// ===== SAFETY CHECKS 🛡️ ===== //
// Every field of a chat doc comes from the database, so a crafted doc must never reach the page as HTML.

// a Firestore auto id (20 letters / digits): the only ids we put in the page 🆔
const SAFE_ID_PATTERN = /^[A-Za-z0-9]{1,40}$/;
// a real photo: a base64 JPEG / PNG / WebP data URL, nothing else 📷
const SAFE_PHOTO_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/**
 * `isSafeId` - Function 🆔
 *
 * @param { any } id - a message id
 * @returns { boolean } - true when it is a plain Firestore id (letters & digits only)
 */
const isSafeId = (id) => typeof id === 'string' && SAFE_ID_PATTERN.test(id);

/**
 * `isSafePhoto` - Function 📷
 *
 * @param { any } source - a message's `img` field
 * @returns { boolean } - true when it is a genuine base64 image data URL
 */
const isSafePhoto = (source) => typeof source === 'string' && SAFE_PHOTO_PATTERN.test(source);

/**
 * `isSafeReaction` - Function 😍
 *
 * @param { any } emoji - a reaction value
 * @returns { boolean } - true when it is a short text with no HTML characters (one emoji)
 */
const isSafeReaction = (emoji) =>
  typeof emoji === 'string' && emoji.length > 0 && emoji.length <= 16 && !/[<>&"'`=]/.test(emoji);

// ===== TEAM ACCESS 👥 ===== //

// the owner of the app: always an admin (the Firestore rules check the same verified email 🔐)
const OWNER_EMAIL = 'abrahamukachi@gmail.com';

// the localStorage key of the last message seen (ms), for the red dot 🔴
const SEEN_KEY = 'ltf_chat_seen';

// the public VAPID key of the push server (`api/notify.js` on Vercel holds the private one 🔐)
const VAPID_PUBLIC_KEY =
  'BOHVPWR9iG-S4nCjzn6k6o2hahvWKOaAaix3BxmgDW4MS6I7Fv4GIyMIECUAaE8hPCPBX1rAKSsJEHhKMeIS5_A';

// the GIPHY API key for the GIF tab (a public browser key, like the Firebase web key 🔐)
const GIPHY_KEY = 'VMCxSwYxaWBq2oevtt0lbdLWivVCoo4q';
// the only GIF addresses a bubble will show (GIPHY's media servers) 🛡️
const GIF_PATTERN = /^https:\/\/media[0-9]?\.giphy\.com\//;
// our own AI-made stickers (pwa/stickers/<slug>.webp, precached so they work offline 📴): [slug, French, English]
const STICKERS = [
  ['bell', 'Service !', 'Service bell'],
  ['bouillabaisse', 'Bouillabaisse', 'Fish soup'],
  ['champagne', 'Santé !', 'Cheers!'],
  ['cheese', 'Plateau de fromages', 'Cheese board'],
  ['chef', 'Chef', 'Chef'],
  ['cloche', 'Envoyez !', 'Plate up!'],
  ['cocktail', 'Cocktail', 'Cocktail'],
  ['espresso', 'Café', 'Espresso'],
  ['oysters', 'Huîtres', 'Oysters'],
  ['pavlova', 'Pavlova', 'Pavlova'],
  ['red-wine', 'Vin rouge', 'Red wine'],
  ['vieux-port', 'Vieux-Port', 'Old Port'],
  ['waiter', 'Bravo !', 'Well done!'],
];

/**
 * `isStickerSlug` - Function 🏷️
 *
 * @param { any } slug - a message's sticker field
 * @returns { boolean } - true when it names one of our stickers
 */
const isStickerSlug = (slug) => STICKERS.some((sticker) => sticker[0] === slug);
// the localStorage key of my recent emojis 🕘
const RECENT_KEY = 'ltf_emoji_recent';
// the emoji tabs: [icon, French name, English name], same order as `emoji.json` (+ recents first) 🗂️
const EMOJI_TABS = [
  ['🕘', 'Récents', 'Recent'],
  ['😀', 'Smileys & émotions', 'Smileys & emotion'],
  ['🧑', 'Personnes', 'People'],
  ['🐶', 'Animaux & nature', 'Animals & nature'],
  ['🍔', 'Nourriture & boissons', 'Food & drink'],
  ['✈️', 'Voyages & lieux', 'Travel & places'],
  ['⚽', 'Activités', 'Activities'],
  ['💡', 'Objets', 'Objects'],
  ['🔣', 'Symboles', 'Symbols'],
  ['🏳️', 'Drapeaux', 'Flags'],
];

// ===== CHIME 🔔 ===== //

// the shared audio context (created on the first chime, browsers want a tap first 👆)
let audioContext = null;

/**
 * `playChime` - Function 🔔
 *
 * Plays a short, soft two-note chime (synthesised with the Web Audio API, no file to download).
 * Respects the app's sound switch (`ltf_v1.sound`).
 *
 * @returns { void }
 */
function playChime() {
  try {
    // the sound switch of the Profil tab is off? stay quiet 🤫
    if (JSON.parse(localStorage.getItem('ltf_v1') || '{}').sound === false) return;
    // the chat's own sound switch (⚙️ settings) is off? quiet too
    if (!chatPref('sound')) return;
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const start = audioContext.currentTime;
    // two bell-like notes: E6 then B6, each with a quick attack & a soft decay 🎶
    [
      [1318.5, 0],
      [1975.5, 0.09],
    ].forEach(([frequency, delay]) => {
      const oscillator = audioContext.createOscillator(),
        overtone = audioContext.createOscillator(),
        gain = audioContext.createGain();
      oscillator.type = 'sine';
      overtone.type = 'sine';
      oscillator.frequency.value = frequency;
      overtone.frequency.value = frequency * 2.01;
      gain.gain.setValueAtTime(0.0001, start + delay);
      gain.gain.exponentialRampToValueAtTime(0.18, start + delay + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + 0.45);
      oscillator.connect(gain);
      overtone.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start + delay);
      overtone.start(start + delay);
      oscillator.stop(start + delay + 0.5);
      overtone.stop(start + delay + 0.5);
    });
  } catch (error) {}
}

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
  errorText = '',
  // my team access ('loading' | 'pending' | 'refused' | 'member' | 'admin') & its unsubscriber 👥
  access = 'loading',
  accessUnsubscribe = null,
  // (admins only) the access requests, the team & their unsubscribers 🛂
  accessRequests = [],
  teamMembers = [],
  adminUnsubscribers = [],
  // the emoji list (loaded on first use), the picker tab ('emoji' | 'gif') & the GIF search timer 😀
  emojiTabs = null,
  pickerTab = 'emoji',
  gifTimer = 0;

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
  // 👀 and tell the team (only while the chat is open)
  if (overlay) tellSeen();
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
  listen.loaded = false;
  if (!user || !hasChatAccess()) {
    stopServiceWatchers();
    paint();
    return;
  }
  // the team, the pinned message & the quick messages 🍽️
  startServiceWatchers();
  // the newest 150 messages, live 🔴
  unsubscribe = onSnapshot(
    query(collection(firestore, 'chat'), orderBy('ts', 'desc'), limit(150)),
    (snapshot) => {
      // oldest first, with an estimated time for our own pending messages
      // the ids we already had (none on the first snapshot) 🆔
      const knownIds = new Set(messages.map((message) => message.id)),
        isFirstSnapshot = !listen.loaded;
      listen.loaded = true;
      messages = snapshot.docs
        .map((docSnapshot) => ({ ...docSnapshot.data({ serverTimestamps: 'estimate' }), id: docSnapshot.id }))
        // 🛡️ a doc with a hand-made id never reaches the page
        .filter((message) => isSafeId(message.id))
        .reverse();
      // 🔔 a new message from a teammate while the app is open: chime
      const freshCount = isFirstSnapshot
        ? 0
        : messages.filter((message) => !knownIds.has(message.id) && message.uid !== user.uid).length;
      if (freshCount) playChime();
      // ⬇️ scrolled up in the open chat? count them for the « ↓ nouveaux » pill
      const listBody = overlay && overlay.querySelector('.cbody');
      if (freshCount && listBody && listBody.scrollHeight - listBody.scrollTop - listBody.clientHeight >= 80)
        newBelow += freshCount;
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
  // only genuine photos are shown 🛡️
  if (!isSafePhoto(src)) return;
  // the viewer overlay (same markup & classes as the app's zoom viewer)
  const viewer = document.createElement('div');
  viewer.className = 'ov zoomv';
  viewer.innerHTML =
    '<div class="zt"><div class="zn"></div><button class="zx" aria-label="close" style="font-size:22px">✕</button></div><div class="zs"><img src="' +
    escapeHtml(src) +
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
  const reactions = message.r && typeof message.r === 'object' ? message.r : {},
    counts = {};
  // only short, HTML-free reactions are counted 🛡️
  Object.values(reactions)
    .filter(isSafeReaction)
    .forEach((emoji) => (counts[emoji] = (counts[emoji] || 0) + 1));
  // the reaction chips (mine is highlighted)
  const chips = Object.keys(counts)
    .map(
      (emoji) =>
        '<button class="cr' +
        (user && reactions[user.uid] === emoji ? ' on' : '') +
        '" data-re="' +
        message.id +
        '" data-e="' +
        escapeHtml(emoji) +
        '">' +
        escapeHtml(emoji) +
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
    (!isMine && mentionsMe(message.text) ? ' cmine' : '') +
    '" data-id="' +
    message.id +
    '"><span class="cswi">↩︎</span>' +
    (isMine ? '<span class="cswd">🗑</span>' : '') +
    '<div class="cbw">' +
    '<div class="ccap" style="color:' +
    accent +
    '">' +
    avatar +
    '<span>' +
    escapeHtml(message.name || 'Staff') +
    '</span></div>' +
    '<div class="cb' +
    (isStickerSlug(message.sticker) && !message.text ? ' cbst' : '') +
    '" style="background:' +
    background +
    '">' +
    // ↩️ the quoted message
    (message.rep
      ? '<div class="cq" style="border-color:' +
        colorsOf(String(message.rep.uid || ''))[1] +
        '"><b>' +
        escapeHtml(message.rep.name) +
        '</b> ' +
        escapeHtml(message.rep.text || '📷') +
        '</div>'
      : '') +
    // 📷 the photo
    (isSafePhoto(message.img) ? '<img class="ci" src="' + escapeHtml(message.img) + '" alt="">' : '') +
    // 🏷️ our sticker
    (isStickerSlug(message.sticker)
      ? '<img class="cst" src="stickers/' + message.sticker + '.webp" alt="sticker">'
      : '') +
    // 🎞️ the GIF (GIPHY only)
    (typeof message.gif === 'string' && GIF_PATTERN.test(message.gif)
      ? '<img class="cg" src="' + escapeHtml(message.gif) + '" alt="GIF" loading="lazy">'
      : '') +
    // 🔁 handover label, 🎤 voice note, 📊 poll
    extraHtml(message) +
    // ✍️ the text (new lines kept, 1 to 3 emojis alone shown big like WhatsApp 😀), not for a poll
    (soldOutHtml(message.text) ||
      (message.text && !pollOf(message)
        ? '<div class="ct' +
          (isEmojiOnly(message.text) ? ' cbig' : '') +
          '">' +
          richText(message.text) +
          '</div>'
        : '')) +
    // 🕘 the time
    '<div class="ctm">' +
    (message.ed ? '<span class="cedited">' + translate('modifié', 'edited') + '</span> · ' : '') +
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
        (message.text ? '<button class="crp" data-copy="' + message.id + '">📋</button>' : '') +
        (canEdit(message) ? '<button class="crp" data-edit="' + message.id + '">✏️</button>' : '') +
        (isOwner() ? '<button class="crp" data-pin="' + message.id + '">📌</button>' : '') +
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
    text: (
      message.text ||
      (message.img
        ? '📷 Photo'
        : message.gif
          ? '🎞️ GIF'
          : message.sticker
            ? '🏷️ Sticker'
            : message.voice
              ? '🎤 ' + translate('Vocal', 'Voice note')
              : '')
    ).slice(0, 120),
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
    paintServiceTools();
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
  // ⏳ signed in, but not (yet) on the team: the waiting / refused screen
  if (!hasChatAccess()) {
    body.innerHTML = accessScreenHtml();
    footer.style.display = 'none';
    paintServiceTools();
    return;
  }
  // show the composer
  footer.style.display = '';
  // were we at the bottom (within 80 px)? & where exactly (to glide from there)
  const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80,
    previousTop = body.scrollTop,
    justSent = Date.now() < scrollAfterSendUntil;
  // the error line + the bubbles (or the empty state 👋)
  body.innerHTML =
    (errorText ? '<p class="warn sm" style="text-align:center">' + errorText + '</p>' : '') +
    threadBannerHtml() +
    (messages.length
      ? listHtml()
      : '<div class="cempty"><div style="font-size:44px">👋</div><p>' +
        translate(
          "Aucun message pour l'instant. Lancez la conversation !",
          'No messages yet. Start the conversation!',
        ) +
        '</p></div>');
  // 👀 who has read up to where
  paintSeenAvatars(body);
  // the first paint with messages: back where we left off (< 5 min ago), else the bottom ⬇️
  if (!paint.done && messages.length) {
    paint.done = true;
    newBelow = 0;
    if (!restoreScroll(body)) pinToBottom(body);
  } else if (atBottom || justSent) {
    // 🛝 glide to the newest message instead of jumping
    body.scrollTop = previousTop;
    glideToBottom(body);
    newBelow = 0;
  }
  // ✈️ my message flies from the composer to its place
  flyFromComposer(body);
  // 🍽️ the table thread's ✕
  const threadClose = body.querySelector('.cthread button');
  if (threadClose)
    threadClose.onclick = () => {
      tableFilter = '';
      paint.done = false;
      paint();
    };
  paint86Bar();
  paintNewBelow();
  paintTyping();
  // 🔁 the handover banner & 🧑‍🤝‍🧑 the faces in the header
  paintHandover();
  paintHeaderFaces();
  // the reply / photo preview
  const preview = overlay.querySelector('.crep');
  preview.style.display = replyTo || pendingPhoto || editingId || handoverMode ? 'flex' : 'none';
  preview.innerHTML =
    handoverMode && !editingId
      ? '<div class="grow crq" style="min-width:0;border-color:#c9a961"><b>🔁 ' +
        translate('Passation', 'Handover') +
        '</b><div class="crt muted">' +
        translate(
          'Une note pour le prochain service, épinglée 18 h',
          'A note for the next shift, on top for 18 h',
        ) +
        '</div></div><button aria-label="x">✕</button>'
      : editingId
        ? '<div class="grow crq" style="min-width:0"><b>✏️ ' +
          translate('Modifier le message', 'Edit message') +
          '</b><div class="crt muted">' +
          translate('Envoyez pour enregistrer', 'Send to save') +
          '</div></div><button aria-label="x">✕</button>'
        : (pendingPhoto ? '<img src="' + pendingPhoto + '" alt="">' : '') +
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
            : '<span class="muted">' +
              translate('Photo prête à envoyer', 'Photo ready to send') +
              '</span>') +
          '</div><button aria-label="x">✕</button>';
  // ✕ drops the reply, the photo & the edit
  preview.querySelector('button').onclick = () => {
    if (editingId) {
      overlay.querySelector('textarea').value = '';
      editingId = null;
    }
    handoverMode = false;
    replyTo = null;
    pendingPhoto = null;
    paint();
  };
  // 🍽️ the pinned banner, the quick messages & the suggestions
  paintServiceTools();
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
  // ✏️ editing one of mine? save the new text instead
  if (editingId) {
    if (text) saveEdit(text);
    return;
  }
  // nothing to send?
  if (!text && !pendingPhoto) return;
  // ✍️ not typing anymore
  tellTyping(false);
  // 🍽️ inside a table thread: the message gets the table's tag
  const threadText =
    tableFilter && text && !textNamesTable(text, tableFilter) ? '#' + tableFilter + ' ' + text : text;
  // ✈️ remember where the text left from (the bubble flies from there)
  markFlight(textarea);
  // the new doc 🗃️
  const newMessage = {
    uid: user.uid,
    name: user.displayName || 'Staff',
    pic: user.photoURL || '',
    text: threadText.slice(0, 1000),
    ts: serverTimestamp(),
  };
  if (pendingPhoto) newMessage.img = pendingPhoto;
  if (replyTo) newMessage.rep = replyTo;
  // 🔁 the note for the next shift
  if (handoverMode && text) newMessage.ho = true;
  const keptHandover = handoverMode;
  handoverMode = false;
  // clear the composer (keep a copy in case it fails) 🧹
  textarea.value = '';
  textarea.style.height = '';
  const keptPhoto = pendingPhoto,
    keptReply = replyTo;
  pendingPhoto = null;
  replyTo = null;
  selectedId = null;
  paint();
  // post it (❌ restore everything on failure)
  try {
    const added = await addDoc(collection(firestore, 'chat'), newMessage);
    // 🔔 sent: chime, then ask the push server to notify the team
    playChime();
    notifyTeam(added.id);
  } catch (error) {
    pendingPhoto = keptPhoto;
    replyTo = keptReply;
    handoverMode = keptHandover;
    textarea.value = text;
    flight = null;
    errorText = translate('Envoi impossible', 'Could not send') + errorCodeOf(error);
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

// ===== SCROLL MEMORY 📍 ===== //

// where the list was when the chat closed (restored for 5 minutes, then the chat opens at the bottom) 📍
const SCROLL_KEY = 'ltf_chat_scroll';
const SCROLL_MEMORY_MS = 5 * 60 * 1000;
// until when the list keeps sticking to the bottom while photos & GIFs load ⏳
let pinnedUntil = 0;

/**
 * `saveScroll` - Function 💾
 *
 * Remembers the first visible message & its offset (or « at the bottom ») when the chat closes.
 *
 * @returns { void }
 */
function saveScroll() {
  const body = overlay && overlay.querySelector('.cbody');
  if (!body || !paint.done) return;
  try {
    const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
    const rows = [...body.querySelectorAll('.cm[data-id]')];
    const firstVisible = rows.find((row) => row.offsetTop + row.offsetHeight > body.scrollTop);
    localStorage.setItem(
      SCROLL_KEY,
      JSON.stringify({
        at: Date.now(),
        bottom: atBottom || !firstVisible,
        id: firstVisible ? firstVisible.dataset.id : '',
        offset: firstVisible ? firstVisible.offsetTop - body.scrollTop : 0,
      }),
    );
  } catch (error) {}
}

/**
 * `restoreScroll` - Function 📍
 *
 * @param { HTMLElement } body - the message list
 * @returns { boolean } - true when the list went back to where it was (closed less than 5 min ago)
 */
function restoreScroll(body) {
  try {
    const saved = JSON.parse(localStorage.getItem(SCROLL_KEY) || 'null');
    if (!saved || saved.bottom || Date.now() - saved.at > SCROLL_MEMORY_MS) return false;
    const row = body.querySelector('.cm[data-id="' + CSS.escape(saved.id) + '"]');
    if (!row) return false;
    body.scrollTop = row.offsetTop - saved.offset;
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * `pinToBottom` - Function ⬇️
 *
 * Scrolls to the newest message and keeps it there for a moment while photos & GIFs load
 * (they make the list taller), unless the waiter starts scrolling.
 *
 * @param { HTMLElement } body - the message list
 * @returns { void }
 */
function pinToBottom(body) {
  body.scrollTop = body.scrollHeight;
  pinnedUntil = Date.now() + 3000;
  if (body.dataset.pinned) return;
  body.dataset.pinned = '1';
  // 🖼️ a picture finished loading: back to the bottom
  body.addEventListener(
    'load',
    () => {
      if (Date.now() < pinnedUntil) body.scrollTop = body.scrollHeight;
    },
    true,
  );
  // ✋ the waiter scrolls: stop sticking
  const release = () => (pinnedUntil = 0);
  body.addEventListener('touchstart', release, { passive: true });
  body.addEventListener('wheel', release, { passive: true });
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
    '</div><div class="muted sm csub">Les Trois Forts</div></div><div class="cfaces"></div><button class="cbell" hidden aria-label="notifications"></button><button class="cgear" aria-label="settings">' +
    HEADER_ICONS.gear +
    '</button></div>' +
    '<div class="cpin" hidden></div><div class="c86bar" hidden></div><div class="cho" hidden></div><div class="cbody"></div><div class="cfoot"><button class="cnew" hidden></button><div class="crep"></div>' +
    '<div class="cmsug" hidden></div><div class="cquick" hidden></div><div class="cmenu" hidden><label><input type="file" accept="image/*" capture="environment" hidden>' +
    MENU_ICONS.camera +
    '<span>' +
    translate('Appareil photo', 'Camera') +
    '</span></label><label><input type="file" accept="image/*" hidden>' +
    MENU_ICONS.photos +
    '<span>' +
    translate('Photos', 'Photos') +
    '</span></label><button data-menu="poll">' +
    MENU_ICONS.poll +
    '<span>' +
    translate('Sondage', 'Poll') +
    '</span></button><button data-menu="handover">' +
    MENU_ICONS.handover +
    '<span>' +
    translate('Passation', 'Handover') +
    '</span></button><button data-menu="eighty-six">' +
    MENU_ICONS.soldOut +
    '<span>' +
    translate('Épuisé (86)', 'Sold out (86)') +
    '</span></button></div><div class="cpill"><button class="cemo" aria-label="emoji">' +
    SMILEY_ICON +
    '</button><textarea rows="1" maxlength="1000" enterkeyhint="send" placeholder="' +
    translate('Message…', 'Message…') +
    '"></textarea><button class="cmic" aria-label="voice">' +
    MIC_ICON +
    '</button><button class="cplus" aria-label="photo">' +
    PLUS_ICON +
    '</button></div><div class="cpick" hidden></div></div>';
  addServiceStyles();
  addPresenceStyles();
  addPolishStyles();
  newBelow = 0;
  document.body.appendChild(overlay);
  // 🔙 Back (button or gesture) closes the chat
  history.pushState({ chat: 1 }, '');
  overlay.querySelector('.cx').onclick = () => history.back();
  // 🔔 the notifications switch (bell) in the header
  overlay.querySelector('.cbell').onclick = togglePush;
  refreshBell();
  // ⚙️ the chat settings drawer
  overlay.querySelector('.cgear').onclick = () => openChatSettings();
  applyChatPrefs();

  // ✍️ the composer: grows up to 120 px, Enter sends (Shift+Enter = new line)
  const textarea = overlay.querySelector('textarea');
  textarea.addEventListener('input', () => {
    textarea.style.height = '';
    textarea.style.height = Math.min(120, textarea.scrollHeight) + 'px';
  });
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && chatPref('enter')) {
      event.preventDefault();
      send();
    }
  });
  // the mobile keyboard "send" key ⌨️
  textarea.addEventListener('beforeinput', (event) => {
    if (
      chatPref('enter') &&
      (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph')
    ) {
      event.preventDefault();
      send();
    }
  });

  // 🍽️ the pinned banner, the quick messages & the @mention suggestions
  wireServiceTools(textarea);
  // ✍️ typing, long-press menu & the « ↓ nouveaux » pill
  wirePresence(textarea);
  // 🎤 the mic (only while the text box is empty), 📊 polls & 🔁 handover from the + menu
  const micButton = overlay.querySelector('.cmic');
  const syncMic = () => (micButton.hidden = !!textarea.value.trim() || !!editingId);
  textarea.addEventListener('input', syncMic);
  syncMic();
  micButton.onclick = () => startRecording();
  overlay.querySelector('[data-menu="poll"]').onclick = () => openPollDialog();
  overlay.querySelector('[data-menu="handover"]').onclick = () => startHandover();
  overlay.querySelector('[data-menu="eighty-six"]').onclick = () => openSoldOutDialog();
  // 🚫 the « épuisé » strip: ✕ puts a dish back on the menu
  overlay.querySelector('.c86bar').addEventListener('click', (event) => {
    const back = event.target.closest('[data-back]');
    if (back) sendExtra({ text: BACK_PREFIX + back.dataset.back });
  });

  // 😀 the emoji / GIF panel: the smiley opens it (keyboard down), the keyboard icon or the text box closes it
  overlay.querySelector('.cemo').onclick = (event) => {
    event.stopPropagation();
    if (overlay.querySelector('.cpick').hidden) openPicker();
    else {
      closePicker();
      textarea.focus();
    }
  };
  textarea.addEventListener('focus', closePicker);
  // remember where the caret was, so emojis go in the right place ✍️
  ['keyup', 'click', 'select', 'input'].forEach((type) =>
    textarea.addEventListener(type, () => {
      textarea.dataset.caret = String(textarea.selectionStart);
    }),
  );

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
    // 🍽️ a table chip: the floor plan
    if (target.closest('[data-table]')) {
      showTable(target.closest('[data-table]').dataset.table);
      return;
    }
    // ▶️ play a voice note
    if (target.closest('[data-play]')) {
      togglePlay(target.closest('[data-play]').dataset.play);
      return;
    }
    // 📊 vote
    if (target.closest('[data-vote]')) {
      const option = target.closest('[data-vote]');
      vote(option.dataset.vote, Number(option.dataset.choice));
      return;
    }
    // 📋 copy
    if (target.closest('[data-copy]')) {
      copyMessage(target.closest('[data-copy]').dataset.copy);
      return;
    }
    // ✏️ edit (mine, < 5 min)
    if (target.closest('[data-edit]')) {
      startEdit(target.closest('[data-edit]').dataset.edit);
      return;
    }
    // 📌 pin (owner)
    if (target.closest('[data-pin]')) {
      const id = target.closest('[data-pin]').dataset.pin;
      selectedId = null;
      paint();
      pinMessage(id);
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
      paint();
      askDelete(id);
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
      // ➡️ right = reply (any message), ⬅️ left = delete (only my own messages)
      const canDelete = swipe.cm.classList.contains('me');
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) && (dx > 0 || canDelete)) {
        swipe.on = true;
        swipe.direction = dx > 0 ? 'reply' : 'delete';
        try {
          body.setPointerCapture(event.pointerId);
        } catch (error) {}
      } else return;
    }
    // follow the finger (max 90 px either way), armed past 60 px
    const offset =
      swipe.direction === 'reply' ? Math.max(0, Math.min(90, dx)) : Math.min(0, Math.max(-90, dx));
    swipe.cm.style.transition = 'none';
    swipe.cm.style.transform = 'translateX(' + offset + 'px)';
    swipe.cm.classList.toggle('arm', offset > 60);
    swipe.cm.classList.toggle('armdel', offset < -60);
  });
  // the finger lifts: snap back, swallow the click & reply when armed 📳
  const endSwipe = () => {
    if (!swipe) return;
    const messageRow = swipe.cm,
      started = swipe.on,
      armed = messageRow.classList.contains('arm'),
      armedDelete = messageRow.classList.contains('armdel');
    swipe = null;
    if (!started) return;
    messageRow.style.transition = 'transform .2s';
    messageRow.style.transform = '';
    messageRow.classList.remove('arm', 'armdel');
    body.dataset.sw = '1';
    setTimeout(() => delete body.dataset.sw, 50);
    if (armed) {
      if (navigator.vibrate) navigator.vibrate(10);
      setReplyTo(messageRow.dataset.id);
    }
    // 🗑 swiped left far enough: ask before deleting
    if (armedDelete) {
      if (navigator.vibrate) navigator.vibrate(10);
      askDelete(messageRow.dataset.id);
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
  saveScroll();
  clearTimeout(gifTimer);
  tellTyping(false);
  overlay.remove();
  overlay = null;
  selectedId = null;
  editingId = null;
  handoverMode = false;
  if (recording) stopRecording(true);
  if (player) {
    player.audio.pause();
    player = null;
  }
  markSeen();
  updateFab();
}

// 🔙 Back while the chat is open: close the photo viewer first, else the chat (and keep the app's router out of it)
addEventListener(
  'popstate',
  (event) => {
    if (!overlay) return;
    event.stopImmediatePropagation();
    // the emoji / GIF panel is open? close it first 😀
    const picker = overlay.querySelector('.cpick');
    if (picker && !picker.hidden) {
      closePicker();
      history.pushState({ chat: 1 }, '');
      return;
    }
    const tableViewer = document.querySelector('.ctplan');
    if (tableViewer) {
      tableViewer.remove();
      history.pushState({ chat: 1 }, '');
      return;
    }
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

// ===== SERVICE TOOLS 🍽️ (quick messages, #tables, @mentions, the pinned message) ===== //

// the built-in quick messages (the owner replaces them in the dashboard › Annonce, Firestore `content/quick`).
// A `#` (table number) or a trailing `:` puts the text in the composer to finish it, any other one is sent at once ⚡
const QUICK_DEFAULT = [
  'Table # prête ✅',
  'Table # : pain 🥖',
  'Table # : eau 💧',
  'Table # : addition 🧾',
  'Table # : envoyez la suite 🍽️',
  "Besoin d'aide en salle 🙋",
  'Plus de :',
  'Je prends ma pause ☕',
];

// the service state: the team (for @mentions), the quick messages, the pinned message & the unsubscribers
let teamNames = [],
  quickMessages = QUICK_DEFAULT,
  pinnedMessage = null,
  serviceUnsubscribers = [];

// a mention: @ + a first name (letters, accents, ' and -) 📣
const MENTION_PATTERN = /@([\p{L}][\p{L}\p{M}'-]*)/gu;
// a table tag in the escaped text: #12, #T12, #B2 or #100 after a space, a bracket or the start 🍽️
const TABLE_PATTERN = /(^|[\s(>])#((?:T|B)?[0-9]{1,3})(?![0-9A-Za-z])/gi;

/**
 * `firstNameOf` - Function 🪪
 *
 * @param { string } name - a full name
 * @returns { string } - its first word, lower case (the @mention key)
 */
const firstNameOf = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();

/**
 * `tableIdOf` - Function 🍽️
 *
 * @param { string } tag - what follows the # (12, T12, b2…)
 * @returns { string } - the table id of the floor plan (T12, B2), or '' when there's no such table
 */
function tableIdOf(tag) {
  const upper = String(tag).toUpperCase();
  const id = /^[0-9]/.test(upper) ? 'T' + upper : upper;
  const tables = (window.LTF && window.LTF.tables) || [];
  return tables.some((table) => table.id === id) ? id : '';
}

/**
 * `mentionsMe` - Function 📣
 *
 * @param { string } text - a message text
 * @returns { boolean } - true when it names me with @FirstName
 */
function mentionsMe(text) {
  if (!user || !text) return false;
  const myFirstName = firstNameOf(user.displayName);
  return (
    !!myFirstName &&
    Array.from(String(text).matchAll(MENTION_PATTERN)).some((match) => match[1].toLowerCase() === myFirstName)
  );
}

/**
 * `richText` - Function ✍️
 *
 * The safe HTML of a message text: escaped first, then the team's @mentions in bold colour, the #tables as
 * gold chips (tap = the floor plan) and the new lines kept.
 *
 * @param { string } text - a message text
 * @returns { string } - the HTML
 */
function richText(text) {
  const knownNames = new Set(teamNames.map((member) => member.first));
  return escapeHtml(text)
    .replace(MENTION_PATTERN, (whole, name) =>
      knownNames.has(name.toLowerCase()) ? '<b class="cmen">' + whole + '</b>' : whole,
    )
    .replace(TABLE_PATTERN, (whole, before, tag) => {
      const tableId = tableIdOf(tag);
      return tableId
        ? before + '<button class="ctab" data-table="' + tableId + '">🍽️ ' + tableId + '</button>'
        : whole;
    })
    .replace(/\n/g, '<br>');
}

/**
 * `planHtml` - Function 🗺️
 *
 * @param { string } tableId - the table to show in gold
 * @returns { string } - the floor plan SVG (same drawing as the app's plan, from `LTF.tables`)
 */
function planHtml(tableId) {
  const data = window.LTF || {},
    size = 5.2;
  let svg =
    '<svg class="plan" viewBox="-3 -6 106 72" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="-2" y="-2" width="104" height="66" rx="2" class="room"/>' +
    '<line x1="0" y1="-1" x2="100" y2="-1" class="win"/><text x="50" y="-3" class="wl">' +
    translate('Baies vitrées · Vieux-Port', 'Bay windows · Vieux-Port') +
    '</text>';
  (data.counters || []).forEach((counter) => {
    svg +=
      '<rect x="' +
      counter.x1 +
      '" y="' +
      counter.y +
      '" width="' +
      (counter.x2 - counter.x1) +
      '" height="3" class="ctr"/><text x="' +
      (counter.x1 + counter.x2) / 2 +
      '" y="' +
      (counter.y + 6.5) +
      '" class="cl">' +
      escapeHtml(counter.label) +
      '</text>';
  });
  (data.tables || []).forEach((table) => {
    const shapeClass = 'tb' + (table.id === tableId ? ' res' : '');
    svg +=
      (table.sh === 'round'
        ? '<circle cx="' +
          table.x +
          '" cy="' +
          table.y +
          '" r="' +
          size * 0.65 +
          '" class="' +
          shapeClass +
          '"/>'
        : table.sh === 'long'
          ? '<rect x="' +
            (table.x - 2.5) +
            '" y="' +
            (table.y - 8) +
            '" width="5" height="12" rx="1" class="' +
            shapeClass +
            '"/>'
          : '<rect x="' +
            (table.x - size / 2) +
            '" y="' +
            (table.y - size / 2) +
            '" width="' +
            size +
            '" height="' +
            size +
            '" rx="1" class="' +
            shapeClass +
            '"/>') +
      '<text x="' +
      table.x +
      '" y="' +
      (table.y + 1.2) +
      '" class="tl' +
      (table.id === tableId ? ' rl' : '') +
      '">' +
      table.id +
      '</text>';
  });
  return svg + '</svg>';
}

/**
 * `showTable` - Function 🗺️
 *
 * @param { string } tableId - a table of the floor plan
 * @returns { void } - opens a card with the plan and that table in gold (tap anywhere to close)
 */
function showTable(tableId) {
  const table = ((window.LTF && window.LTF.tables) || []).find((candidate) => candidate.id === tableId);
  if (!table) return;
  const viewer = document.createElement('div');
  viewer.className = 'ctplan';
  viewer.innerHTML =
    '<div class="ctcard"><div class="ctttl">🍽️ ' +
    translate('Table ', 'Table ') +
    escapeHtml(tableId) +
    (table.cap ? ' <span class="muted sm">' + escapeHtml(table.cap) + '</span>' : '') +
    '</div>' +
    planHtml(tableId) +
    (overlay
      ? '<button class="btn ctthr" data-thread>💬 ' +
        translate('Messages de cette table', 'Messages for this table') +
        '</button>'
      : '') +
    '<div class="muted sm">' +
    translate('Touchez pour fermer', 'Tap to close') +
    '</div></div>';
  viewer.onclick = (event) => {
    viewer.remove();
    // 🍽️ open the table's thread
    if (event.target.closest('[data-thread]')) {
      tableFilter = tableId;
      paint.done = false;
      paint();
    }
  };
  document.body.appendChild(viewer);
}

/**
 * `readJson` - Function 📦
 *
 * @param { object | undefined } data - a `content/*` doc ({ data: JSON string })
 * @returns { any } - the parsed value, or null
 */
function readJson(data) {
  try {
    return data && typeof data.data === 'string' ? JSON.parse(data.data) : null;
  } catch (error) {
    return null;
  }
}

/**
 * `stopServiceWatchers` - Function 🧹
 *
 * @returns { void }
 */
function stopServiceWatchers() {
  serviceUnsubscribers.forEach((stop) => stop());
  serviceUnsubscribers = [];
  teamNames = [];
  pinnedMessage = null;
  typingPeople = [];
  seenBy = {};
}

/**
 * `startServiceWatchers` - Function 👂
 *
 * Listens to the team (names for @mentions), the pinned message & the quick messages (team members only).
 *
 * @returns { void }
 */
function startServiceWatchers() {
  stopServiceWatchers();
  if (!user || !hasChatAccess()) return;
  // ✍️ who is typing & 👀 how far everyone has read
  serviceUnsubscribers.push(...watchPresence());
  // 👥 the team: uid, name & first name
  serviceUnsubscribers.push(
    onSnapshot(
      collection(firestore, 'team'),
      (snapshot) => {
        teamNames = snapshot.docs
          .map((docSnapshot) => ({ uid: docSnapshot.id, name: String(docSnapshot.data().name || '') }))
          .filter((member) => member.name)
          .map((member) => ({ ...member, first: firstNameOf(member.name) }));
        paint();
      },
      () => {},
    ),
  );
  // 📌 the pinned message
  serviceUnsubscribers.push(
    onSnapshot(
      doc(firestore, 'content', 'pin'),
      (snapshot) => {
        const pin = readJson(snapshot.exists() ? snapshot.data() : null);
        pinnedMessage =
          pin && isSafeId(pin.id) && typeof pin.text === 'string'
            ? { id: pin.id, name: String(pin.name || ''), text: pin.text.slice(0, 200) }
            : null;
        paint();
      },
      () => {},
    ),
  );
  // ⚡ the quick messages
  serviceUnsubscribers.push(
    onSnapshot(
      doc(firestore, 'content', 'quick'),
      (snapshot) => {
        const list = readJson(snapshot.exists() ? snapshot.data() : null);
        quickMessages =
          Array.isArray(list) && list.length
            ? list
                .filter((entry) => typeof entry === 'string' && entry.trim())
                .map((entry) => entry.trim().slice(0, 80))
                .slice(0, 20)
            : QUICK_DEFAULT;
        paint();
      },
      () => {},
    ),
  );
}

/**
 * `pinMessage` - Async Function 📌
 *
 * (Owner only, like every `content/*` doc) pins a message on top of the chat, or unpins it.
 *
 * @param { string | null } id - the message to pin (null = unpin)
 * @returns { Promise<void> }
 */
async function pinMessage(id) {
  try {
    if (!id) return await deleteDoc(doc(firestore, 'content', 'pin'));
    const message = messages.find((candidate) => candidate.id === id);
    if (!message) return;
    const text = (
      message.text ||
      (message.img
        ? '📷 Photo'
        : message.gif
          ? '🎞️ GIF'
          : message.sticker
            ? '🏷️ Sticker'
            : message.voice
              ? '🎤 ' + translate('Vocal', 'Voice note')
              : '')
    ).slice(0, 200);
    await setDoc(doc(firestore, 'content', 'pin'), {
      data: JSON.stringify({ id, name: message.name || '', text }),
      ts: serverTimestamp(),
    });
  } catch (error) {
    showToast(translate('Action impossible', 'Could not do that'));
  }
}

/**
 * `jumpTo` - Function 🎯
 *
 * @param { string } id - a message id
 * @returns { void } - scrolls to that message and makes it flash
 */
function jumpTo(id) {
  const row = overlay && overlay.querySelector('.cm[data-id="' + id + '"]');
  if (!row) return showToast(translate('Message trop ancien', 'Message too old'));
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  row.classList.remove('cflash');
  void row.offsetWidth;
  row.classList.add('cflash');
}

/**
 * `paintServiceTools` - Function 🎨
 *
 * Repaints the pinned banner, the quick messages row & the @mention suggestions.
 *
 * @returns { void }
 */
function paintServiceTools() {
  if (!overlay) return;
  const isMember = !!user && hasChatAccess();
  // 📌 the pinned banner
  const pinBar = overlay.querySelector('.cpin');
  pinBar.hidden = !(isMember && pinnedMessage);
  if (!pinBar.hidden)
    pinBar.innerHTML =
      '<span class="cpini">📌</span><div class="grow" style="min-width:0"><b>' +
      escapeHtml(pinnedMessage.name || translate('Épinglé', 'Pinned')) +
      '</b><div class="cpint">' +
      escapeHtml(pinnedMessage.text) +
      '</div></div>' +
      (isOwner() ? '<button class="cunpin" aria-label="unpin">✕</button>' : '');
  // ⚡ the quick messages (only while the text box is empty)
  const quickRow = overlay.querySelector('.cquick'),
    textarea = overlay.querySelector('textarea');
  quickRow.hidden = !isMember || !!(textarea && textarea.value) || !!pendingPhoto;
  if (!quickRow.hidden && quickRow.dataset.list !== quickMessages.join('\n')) {
    quickRow.dataset.list = quickMessages.join('\n');
    quickRow.innerHTML = quickMessages
      .map((entry, index) => '<button data-quick="' + index + '">' + escapeHtml(entry) + '</button>')
      .join('');
  }
  paintMentionSuggestions();
}

/**
 * `mentionQuery` - Function 🔎
 *
 * @param { HTMLTextAreaElement } textarea - the composer
 * @returns { string | null } - the name being typed right after an @ (null when none)
 */
function mentionQuery(textarea) {
  const before = textarea.value.slice(0, textarea.selectionStart || 0);
  const match = before.match(/(?:^|\s)@([\p{L}\p{M}'-]*)$/u);
  return match ? match[1].toLowerCase() : null;
}

/**
 * `paintMentionSuggestions` - Function 📣
 *
 * @returns { void } - shows the teammates matching the @name being typed (up to 6)
 */
function paintMentionSuggestions() {
  const suggestions = overlay.querySelector('.cmsug'),
    textarea = overlay.querySelector('textarea');
  const typed = textarea && document.activeElement === textarea ? mentionQuery(textarea) : null;
  const matches =
    typed === null
      ? []
      : teamNames
          .filter((member) => (!user || member.uid !== user.uid) && member.first.startsWith(typed))
          .slice(0, 6);
  suggestions.hidden = !matches.length;
  suggestions.innerHTML = matches
    .map(
      (member) =>
        '<button data-mention="' +
        escapeHtml(member.uid) +
        '"><span class="cav" style="background:' +
        colorsOf(member.uid)[0] +
        '">' +
        escapeHtml(member.name[0] || '?') +
        '</span>' +
        escapeHtml(member.name) +
        '</button>',
    )
    .join('');
}

/**
 * `insertMention` - Function 📣
 *
 * @param { string } uid - the teammate picked in the suggestions
 * @returns { void } - replaces the @typed name with @FirstName + a space
 */
function insertMention(uid) {
  const member = teamNames.find((candidate) => candidate.uid === uid),
    textarea = overlay.querySelector('textarea');
  if (!member) return;
  const caret = textarea.selectionStart || 0;
  const before = textarea.value.slice(0, caret).replace(/@([\p{L}\p{M}'-]*)$/u, '');
  const firstName = member.name.trim().split(/\s+/)[0];
  textarea.value = before + '@' + firstName + ' ' + textarea.value.slice(caret);
  const newCaret = before.length + firstName.length + 2;
  textarea.focus();
  textarea.setSelectionRange(newCaret, newCaret);
  paintServiceTools();
}

/**
 * `useQuickMessage` - Function ⚡
 *
 * @param { number } index - the quick message tapped
 * @returns { void } - sends it, or puts it in the composer when it needs a table number (#) or an ending (:)
 */
function useQuickMessage(index) {
  const entry = quickMessages[index],
    textarea = overlay.querySelector('textarea');
  if (!entry) return;
  if (navigator.vibrate) navigator.vibrate(6);
  const hashAt = entry.indexOf('#');
  if (hashAt >= 0 || /:\s*$/.test(entry)) {
    textarea.value = hashAt >= 0 ? entry : entry.replace(/\s*$/, ' ');
    const caret = hashAt >= 0 ? hashAt + 1 : textarea.value.length;
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
    textarea.dispatchEvent(new Event('input'));
    return;
  }
  textarea.value = entry;
  send();
}

/**
 * `wireServiceTools` - Function 🔌
 *
 * @param { HTMLTextAreaElement } textarea - the composer
 * @returns { void } - the taps of the pinned banner, the quick row & the suggestions; the @ typing
 */
function wireServiceTools(textarea) {
  overlay.querySelector('.cpin').addEventListener('click', (event) => {
    if (event.target.closest('.cunpin')) return pinMessage(null);
    if (pinnedMessage) jumpTo(pinnedMessage.id);
  });
  overlay.querySelector('.cquick').addEventListener('click', (event) => {
    const button = event.target.closest('[data-quick]');
    if (button) useQuickMessage(Number(button.dataset.quick));
  });
  const suggestions = overlay.querySelector('.cmsug');
  // keep the keyboard up while picking a name ⌨️
  suggestions.addEventListener('pointerdown', (event) => event.preventDefault());
  suggestions.addEventListener('click', (event) => {
    const button = event.target.closest('[data-mention]');
    if (button) insertMention(button.dataset.mention);
  });
  ['input', 'click', 'keyup', 'focus'].forEach((type) => textarea.addEventListener(type, paintServiceTools));
  textarea.addEventListener('blur', () => setTimeout(paintServiceTools, 150));
}

/**
 * `addServiceStyles` - Function 🎨
 *
 * @returns { void } - the CSS of the service tools (once)
 */
function addServiceStyles() {
  if (document.getElementById('chatServiceCss')) return;
  const style = document.createElement('style');
  style.id = 'chatServiceCss';
  style.textContent = `
.cpin{display:flex;align-items:center;gap:10px;padding:8px 14px;background:rgba(201,169,97,.12);
  border-bottom:1px solid rgba(201,169,97,.35);cursor:pointer;font-size:13px}
.cpin[hidden],.cquick[hidden],.cmsug[hidden]{display:none}
.cpini{font-size:16px}
.cpin b{color:var(--gold,#c9a961);font-size:12px}
.cpint{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.9}
.cunpin{background:none;border:0;color:inherit;font-size:16px;padding:4px 6px;cursor:pointer}
.cquick{display:flex;gap:6px;overflow-x:auto;padding:6px 10px 2px;scrollbar-width:none}
.cquick::-webkit-scrollbar{display:none}
.cquick button{flex:none;border:1px solid rgba(201,169,97,.45);background:rgba(201,169,97,.1);color:inherit;
  border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;white-space:nowrap;cursor:pointer}
.cmsug{display:flex;flex-direction:column;margin:0 10px 6px;border-radius:14px;overflow:hidden;
  background:var(--sf,#222);box-shadow:0 6px 24px rgba(0,0,0,.35)}
.cmsug button{display:flex;align-items:center;gap:10px;background:none;border:0;color:inherit;font:inherit;
  padding:9px 12px;text-align:left;cursor:pointer}
.cmsug button+button{border-top:1px solid rgba(255,255,255,.06)}
.cmsug .cav{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:700;color:#fff}
.cmen{color:#ffd98a;font-weight:700}
.cm.cmine .cb{box-shadow:0 0 0 2px var(--gold,#c9a961)}
.ctab{display:inline-flex;align-items:center;gap:3px;border:0;border-radius:999px;padding:1px 8px;margin:0 1px;
  background:var(--gold,#c9a961);color:#111;font:inherit;font-size:.9em;font-weight:700;cursor:pointer;
  vertical-align:baseline}
.cm.cflash .cb{animation:cflash 1.4s}
@keyframes cflash{20%,60%{box-shadow:0 0 0 3px var(--gold,#c9a961)}}
.ctplan{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.6);display:flex;align-items:center;
  justify-content:center;padding:16px}
.ctcard{background:var(--sf,#1b1b1b);border-radius:20px;padding:14px;width:min(560px,100%);text-align:center}
.ctttl{font-weight:700;font-size:17px;margin-bottom:8px;text-align:left}
.ctcard .plan{width:100%;height:auto;margin-bottom:6px}
`;
  document.head.appendChild(style);
}

// ===== LIVE PRESENCE ✍️ (typing, read avatars, edit, long-press, new messages pill) ===== //

// how long a message can still be edited, how long « is typing » lasts, how often we write them ⏱️
const EDIT_WINDOW = 5 * 60000,
  TYPING_SHOWN_FOR = 6000,
  TYPING_WRITE_EVERY = 4000,
  SEEN_WRITE_EVERY = 8000,
  LONG_PRESS_DELAY = 480;

// who is typing, how far each teammate has read, the message being edited, the new messages below the
// screen & when we last wrote our typing / seen docs
let typingPeople = [],
  seenBy = {},
  editingId = null,
  newBelow = 0,
  lastTypingWrite = 0,
  lastSeenWrite = 0,
  lastSeenTime = 0,
  presenceTimer = 0;

/**
 * `millisOf` - Function ⏱️
 *
 * @param { any } value - a Firestore timestamp (or nothing)
 * @returns { number } - its time in ms (0 when missing)
 */
const millisOf = (value) => (value && typeof value.toMillis === 'function' ? value.toMillis() : 0);

/**
 * `watchPresence` - Function 👂
 *
 * Listens to `typing` (who is writing now) and `seen` (how far each teammate has read).
 * Both fail quietly when the rules refuse them.
 *
 * @returns { Array<() => void> } - the unsubscribers
 */
function watchPresence() {
  return [
    onSnapshot(
      collection(firestore, 'typing'),
      (snapshot) => {
        typingPeople = snapshot.docs
          .map((docSnapshot) => ({
            uid: docSnapshot.id,
            name: String(docSnapshot.data().name || ''),
            at: millisOf(docSnapshot.data({ serverTimestamps: 'estimate' }).at),
          }))
          .filter((person) => person.name && (!user || person.uid !== user.uid));
        paintTyping();
      },
      () => {},
    ),
    onSnapshot(
      collection(firestore, 'seen'),
      (snapshot) => {
        seenBy = {};
        snapshot.docs.forEach((docSnapshot) => {
          const data = docSnapshot.data({ serverTimestamps: 'estimate' });
          if (isSafeId(docSnapshot.id) || /^[A-Za-z0-9]{1,128}$/.test(docSnapshot.id))
            seenBy[docSnapshot.id] = {
              at: millisOf(data.at),
              name: String(data.name || ''),
              pic: typeof data.pic === 'string' ? data.pic : '',
            };
        });
        paint();
      },
      () => {},
    ),
  ];
}

/**
 * `paintTyping` - Function ✍️
 *
 * @returns { void } - « Ourya écrit… » in the header while someone typed in the last seconds
 */
function paintTyping() {
  const subtitle = overlay && overlay.querySelector('.csub');
  if (!subtitle) return;
  const now = Date.now();
  const names = typingPeople
    .filter((person) => now - person.at < TYPING_SHOWN_FOR)
    .map((person) => person.name.trim().split(/\s+/)[0]);
  subtitle.classList.toggle('ctyp', names.length > 0);
  subtitle.textContent = names.length
    ? names.length === 1
      ? translate(names[0] + ' écrit…', names[0] + ' is typing…')
      : translate(
          names.slice(0, 2).join(' et ') + ' écrivent…',
          names.slice(0, 2).join(' and ') + ' are typing…',
        )
    : 'Les Trois Forts';
}

/**
 * `tellTyping` - Function ✍️
 *
 * @param { boolean } isTyping - true while I type, false once sent (removes my doc)
 * @returns { void }
 */
function tellTyping(isTyping) {
  if (!user || !hasChatAccess()) return;
  const typingDoc = doc(firestore, 'typing', user.uid);
  if (!isTyping) {
    if (lastTypingWrite) deleteDoc(typingDoc).catch(() => {});
    lastTypingWrite = 0;
    return;
  }
  if (Date.now() - lastTypingWrite < TYPING_WRITE_EVERY) return;
  lastTypingWrite = Date.now();
  setDoc(typingDoc, { name: (user.displayName || 'Staff').slice(0, 100), at: serverTimestamp() }).catch(
    () => {},
  );
}

/**
 * `tellSeen` - Function 👀
 *
 * @returns { void } - tells the team how far I've read (the newest message time), at most every 8 s
 */
function tellSeen() {
  if (!user || !hasChatAccess() || !overlay || !messages.length) return;
  const newest = Math.max(...messages.map(timeOf));
  if (newest <= lastSeenTime) return;
  // written a moment ago? try again once the 8 s are over ⏳
  const waitFor = SEEN_WRITE_EVERY - (Date.now() - lastSeenWrite);
  if (waitFor > 0) {
    clearTimeout(tellSeen.timer);
    tellSeen.timer = setTimeout(tellSeen, waitFor + 50);
    return;
  }
  lastSeenTime = newest;
  lastSeenWrite = Date.now();
  setDoc(doc(firestore, 'seen', user.uid), {
    name: (user.displayName || 'Staff').slice(0, 100),
    pic: user.photoURL || '',
    at: serverTimestamp(),
  }).catch(() => {});
}

/**
 * `paintSeenAvatars` - Function 👀
 *
 * Puts each teammate's tiny avatar under the last message they've read (like a group chat).
 *
 * @param { HTMLElement } body - the message list
 * @returns { void }
 */
function paintSeenAvatars(body) {
  const rows = {};
  Object.entries(seenBy).forEach(([uid, reader]) => {
    if ((user && uid === user.uid) || !reader.at) return;
    const lastRead = messages.filter((message) => timeOf(message) <= reader.at + 1000).pop();
    if (lastRead) (rows[lastRead.id] = rows[lastRead.id] || []).push({ uid, ...reader });
  });
  Object.entries(rows).forEach(([id, readers]) => {
    const messageRow = body.querySelector('.cm[data-id="' + id + '"] .cbw');
    if (!messageRow) return;
    const line = document.createElement('div');
    line.className = 'cseen';
    line.innerHTML =
      readers
        .slice(0, 6)
        .map((reader) =>
          /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//.test(reader.pic)
            ? '<img src="' +
              escapeHtml(reader.pic) +
              '" referrerpolicy="no-referrer" alt="" title="' +
              escapeHtml(reader.name) +
              '">'
            : '<span style="background:' +
              colorsOf(reader.uid)[0] +
              '" title="' +
              escapeHtml(reader.name) +
              '">' +
              escapeHtml((reader.name || '?')[0]) +
              '</span>',
        )
        .join('') + (readers.length > 6 ? '<b>+' + (readers.length - 6) + '</b>' : '');
    messageRow.appendChild(line);
  });
}

/**
 * `canEdit` - Function ✏️
 *
 * @param { object } message - a chat message
 * @returns { boolean } - true for my own text message, less than 5 minutes old
 */
const canEdit = (message) =>
  !!(user && message.uid === user.uid && message.text && Date.now() - timeOf(message) < EDIT_WINDOW);

/**
 * `startEdit` - Function ✏️
 *
 * @param { string } id - my message to edit (its text goes back in the composer)
 * @returns { void }
 */
function startEdit(id) {
  const message = messages.find((candidate) => candidate.id === id);
  if (!message || !canEdit(message))
    return showToast(translate('Trop tard pour modifier', 'Too late to edit'));
  editingId = id;
  replyTo = null;
  pendingPhoto = null;
  selectedId = null;
  const textarea = overlay.querySelector('textarea');
  textarea.value = message.text;
  paint();
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  textarea.dispatchEvent(new Event('input'));
}

/**
 * `saveEdit` - Async Function ✏️
 *
 * @param { string } text - the new text
 * @returns { Promise<void> } - saves it (marked « modifié ») or puts it back on failure
 */
async function saveEdit(text) {
  const id = editingId,
    textarea = overlay.querySelector('textarea');
  editingId = null;
  textarea.value = '';
  textarea.style.height = '';
  paint();
  try {
    await updateDoc(doc(firestore, 'chat', id), { text, ed: serverTimestamp() });
  } catch (error) {
    editingId = id;
    textarea.value = text;
    showToast(translate('Modification impossible', 'Could not edit'));
    paint();
  }
}

/**
 * `copyMessage` - Function 📋
 *
 * @param { string } id - a message
 * @returns { void } - copies its text
 */
function copyMessage(id) {
  const message = messages.find((candidate) => candidate.id === id);
  selectedId = null;
  paint();
  if (!message || !message.text || !navigator.clipboard) return;
  navigator.clipboard
    .writeText(message.text)
    .then(() => showToast(translate('Copié', 'Copied')))
    .catch(() => {});
}

/**
 * `paintNewBelow` - Function ⬇️
 *
 * @returns { void } - the « ↓ 3 nouveaux » pill while new messages wait below the screen
 */
function paintNewBelow() {
  const pill = overlay && overlay.querySelector('.cnew');
  if (!pill) return;
  pill.hidden = newBelow < 1;
  pill.textContent =
    '↓ ' + newBelow + ' ' + translate(newBelow > 1 ? 'nouveaux' : 'nouveau', newBelow > 1 ? 'new' : 'new');
}

/**
 * `wirePresence` - Function 🔌
 *
 * @param { HTMLTextAreaElement } textarea - the composer
 * @returns { void } - typing, long-press, the pill & the header refresh
 */
function wirePresence(textarea) {
  const body = overlay.querySelector('.cbody');
  // ✍️ typing
  textarea.addEventListener('input', () => tellTyping(!!textarea.value.trim()));
  // ⬇️ the pill: tap = to the bottom; reaching the bottom clears it
  overlay.querySelector('.cnew').onclick = () => {
    body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
    newBelow = 0;
    paintNewBelow();
  };
  body.addEventListener('scroll', () => {
    if (newBelow && body.scrollHeight - body.scrollTop - body.clientHeight < 80) {
      newBelow = 0;
      paintNewBelow();
    }
  });
  // 👆 long-press a message: its menu (reactions, reply, copy, edit, pin, delete)
  let press = null;
  body.addEventListener('pointerdown', (event) => {
    const messageRow = event.target.closest('.cm');
    if (!messageRow || event.target.closest('button')) return;
    const startX = event.clientX,
      startY = event.clientY;
    press = {
      startX,
      startY,
      timer: setTimeout(() => {
        press = null;
        if (navigator.vibrate) navigator.vibrate(12);
        selectedId = messageRow.dataset.id;
        // swallow the click that follows the finger lifting
        body.dataset.sw = '1';
        setTimeout(() => delete body.dataset.sw, 400);
        paint();
      }, LONG_PRESS_DELAY),
    };
  });
  const cancelPress = (event) => {
    if (!press) return;
    if (
      event.type === 'pointermove' &&
      Math.hypot(event.clientX - press.startX, event.clientY - press.startY) < 10
    )
      return;
    clearTimeout(press.timer);
    press = null;
  };
  ['pointermove', 'pointerup', 'pointercancel'].forEach((type) => body.addEventListener(type, cancelPress));
  body.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.cm')) event.preventDefault();
  });
  // ⏱️ « écrit… » fades by itself, the ✏️ button too after 5 minutes
  clearInterval(presenceTimer);
  presenceTimer = setInterval(() => (overlay ? paintTyping() : clearInterval(presenceTimer)), 2000);
}

/**
 * `addPresenceStyles` - Function 🎨
 *
 * @returns { void } - the CSS of the presence tools (once)
 */
function addPresenceStyles() {
  if (document.getElementById('chatPresenceCss')) return;
  const style = document.createElement('style');
  style.id = 'chatPresenceCss';
  style.textContent = `
.csub.ctyp{color:var(--gold,#c9a961);font-style:italic;opacity:1}
.cseen{display:flex;justify-content:flex-end;gap:2px;margin-top:3px;align-items:center}
.cm:not(.me) .cseen{justify-content:flex-start}
.cseen img,.cseen span{width:15px;height:15px;border-radius:50%;object-fit:cover;font-size:9px;font-weight:700;
  color:#fff;display:inline-flex;align-items:center;justify-content:center}
.cseen b{font-size:10px;opacity:.7;margin-left:2px}
.cedited{opacity:.65;font-style:italic}
.cnew{position:absolute;right:14px;bottom:calc(100% + 10px);border:0;border-radius:999px;padding:7px 14px;
  background:var(--gold,#c9a961);color:#111;font:inherit;font-weight:700;font-size:13px;
  box-shadow:0 4px 16px rgba(0,0,0,.35);cursor:pointer;z-index:2}
.cnew[hidden]{display:none}
.cm{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
`;
  document.head.appendChild(style);
}

// ===== VISUAL POLISH ✨ (groups, day separators, header faces, animations) ===== //

// two messages of the same person less than 5 minutes apart are one group 👥
const GROUP_GAP = 5 * 60000;
// the messages already drawn once (new ones pop in) ✨
const drawnIds = new Set();

/**
 * `dayKey` - Function 📅
 *
 * @param { number } time - a time in ms
 * @returns { string } - its local day (2026-11-04)
 */
const dayKey = (time) => {
  const date = new Date(time);
  return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
};

/**
 * `dayLabel` - Function 📅
 *
 * @param { number } time - a time in ms
 * @returns { string } - « Aujourd'hui », « Hier » or « lundi 3 novembre »
 */
function dayLabel(time) {
  const today = new Date();
  if (dayKey(time) === dayKey(today.getTime())) return translate("Aujourd'hui", 'Today');
  if (dayKey(time) === dayKey(today.getTime() - 86400000)) return translate('Hier', 'Yesterday');
  const label = new Date(time).toLocaleDateString(translate('fr-FR', 'en-GB'), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * `sameGroup` - Function 👥
 *
 * @param { object } first - a message
 * @param { object } second - the next one
 * @returns { boolean } - true when the same person wrote both, on the same day, less than 5 minutes apart
 */
const sameGroup = (first, second) =>
  !!first &&
  !!second &&
  first.uid === second.uid &&
  first.ho !== true &&
  second.ho !== true &&
  dayKey(timeOf(first)) === dayKey(timeOf(second)) &&
  Math.abs(timeOf(second) - timeOf(first)) < GROUP_GAP;

/**
 * `listHtml` - Function 🧾
 *
 * Every bubble with its day separator, its place in its group (first / middle / last) & a pop-in for new ones.
 *
 * @returns { string } - the HTML of the message list
 */
function listHtml() {
  const isFirstDraw = drawnIds.size === 0;
  // 🍽️ a table thread shows only the messages that name the table
  const shown = tableFilter
    ? messages.filter((message) => textNamesTable(message.text, tableFilter))
    : messages;
  const html = shown
    .map((message, index) => {
      const previous = shown[index - 1],
        next = shown[index + 1];
      // 📅 each day is its own section, so its sticky pill leaves when the day scrolls away (no overlap)
      const separator =
        !previous || dayKey(timeOf(previous)) !== dayKey(timeOf(message))
          ? (previous ? '</section>' : '') +
            '<section class="cdg"><div class="cday"><span>' +
            dayLabel(timeOf(message)) +
            '</span></div>'
          : '';
      const classes =
        (sameGroup(previous, message) && !separator ? ' cgc' : '') +
        (sameGroup(message, next) ? ' cgn' : '') +
        (!isFirstDraw && !drawnIds.has(message.id) ? ' cpop' : '');
      // add the group classes on the bubble's root `.cm`
      return separator + bubbleHtml(message).replace('<div class="cm', '<div class="cm' + classes);
    })
    .join('');
  messages.forEach((message) => drawnIds.add(message.id));
  return html ? html + '</section>' : '';
}

/**
 * `paintHeaderFaces` - Function 🧑‍🤝‍🧑
 *
 * @returns { void } - up to 4 faces of the teammates who read the chat lately, next to the title
 */
function paintHeaderFaces() {
  const faces = overlay && overlay.querySelector('.cfaces');
  if (!faces) return;
  const readers = Object.entries(seenBy)
    .filter(([uid, reader]) => (!user || uid !== user.uid) && reader.at)
    .sort((first, second) => second[1].at - first[1].at)
    .slice(0, 4);
  const html = readers
    .map(([uid, reader]) =>
      /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//.test(reader.pic)
        ? '<img src="' + escapeHtml(reader.pic) + '" referrerpolicy="no-referrer" alt="">'
        : '<span style="background:' +
          colorsOf(uid)[0] +
          '">' +
          escapeHtml((reader.name || '?')[0]) +
          '</span>',
    )
    .join('');
  if (faces.innerHTML !== html) faces.innerHTML = html;
}

// ===== SEND FLIGHT, GLIDE, 86 & TABLE THREADS (0.74.0) ===== //

// ✈️ where the last sent message left from ({ rect, at }), & until when a paint must glide to the bottom
let flight = null,
  scrollAfterSendUntil = 0,
  // 🍽️ the table whose thread is open ('' = the whole chat)
  tableFilter = '';

// 🚫 the « 86 » texts (French, like the quick messages): a dish is out / back on the menu
const OUT_PREFIX = '🚫 86 · ',
  BACK_PREFIX = '✅ De retour · ';

/**
 * `errorCodeOf` - Function 🧾
 *
 * @param { any } error - a Firebase or DOM error
 * @returns { string } - « (its code) » to help when a waiter sends a screenshot, or ''
 */
function errorCodeOf(error) {
  const code = error && (error.code || error.name);
  return code ? ' (' + String(code).slice(0, 40) + ')' : '';
}

/**
 * `markFlight` - Function ✈️
 *
 * @param { HTMLElement | null } origin - the element the new message leaves from (text box or pill)
 * @returns { void }
 */
function markFlight(origin) {
  scrollAfterSendUntil = Date.now() + 2500;
  flight = origin ? { rect: origin.getBoundingClientRect(), at: Date.now() } : null;
}

/**
 * `glideToBottom` - Function 🛝
 *
 * @param { HTMLElement } body - the message list
 * @returns { void } - a smooth scroll to the newest message (a jump when motion is reduced)
 */
function glideToBottom(body) {
  const reduced =
    !chatPref('motion') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  body.scrollTo({ top: body.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
}

/**
 * `flyFromComposer` - Function ✈️
 *
 * My new bubble starts where the text box was and lands at its place in the list while the list glides
 * down (a FLIP with the Web Animations API). Used once per sent message.
 *
 * @param { HTMLElement } body - the message list
 * @returns { void }
 */
function flyFromComposer(body) {
  if (!flight || Date.now() - flight.at > 4000) return;
  if (!chatPref('motion')) return (flight = null);
  const row = [...body.querySelectorAll('.cm.me.cpop')].pop();
  if (!row) return;
  const bubble = row.querySelector('.cb'),
    from = flight.rect;
  flight = null;
  if (!bubble || !bubble.animate) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  row.classList.remove('cpop');
  row.classList.add('cfly');
  const to = bubble.getBoundingClientRect();
  // right edges meet (my bubbles sit on the right), the tops meet
  const shiftX = from.right - to.right,
    shiftY = from.top - to.top,
    scaleX = Math.min(1.6, Math.max(0.6, from.width / Math.max(1, to.width)));
  const animation = bubble.animate(
    [
      {
        transform: 'translate(' + shiftX + 'px,' + shiftY + 'px) scale(' + scaleX + ',.92)',
        transformOrigin: 'right bottom',
        opacity: 0.55,
      },
      { transform: 'none', transformOrigin: 'right bottom', opacity: 1 },
    ],
    { duration: 340, easing: 'cubic-bezier(.2,.85,.25,1)' },
  );
  animation.onfinish = () => row.classList.remove('cfly');
}

/**
 * `textNamesTable` - Function 🍽️
 *
 * @param { string } text - a message text
 * @param { string } tableId - a floor plan id (T12, B2)
 * @returns { boolean } - true when the text tags that table (#12, #T12…)
 */
function textNamesTable(text, tableId) {
  if (!text || !tableId) return false;
  return Array.from(String(text).matchAll(TABLE_PATTERN)).some((match) => tableIdOf(match[2]) === tableId);
}

/**
 * `threadBannerHtml` - Function 🍽️
 *
 * @returns { string } - the « Table T12 · 4 messages ✕ » bar of an open table thread, or ''
 */
function threadBannerHtml() {
  if (!tableFilter) return '';
  const count = messages.filter((message) => textNamesTable(message.text, tableFilter)).length;
  return (
    '<div class="cthread">🍽️ <b>' +
    translate('Table ', 'Table ') +
    escapeHtml(tableFilter) +
    '</b><span class="muted">· ' +
    count +
    ' message' +
    (count > 1 ? 's' : '') +
    '</span><button aria-label="close">✕</button></div>'
  );
}

/**
 * `soldOutHtml` - Function 🚫
 *
 * @param { string } text - a message text
 * @returns { string } - the « 86 » card of a dish out / back on the menu, or '' for any other text
 */
function soldOutHtml(text) {
  const value = String(text || '');
  const isOut = value.startsWith(OUT_PREFIX),
    isBack = value.startsWith(BACK_PREFIX);
  if (!isOut && !isBack) return '';
  const dish = value.slice((isOut ? OUT_PREFIX : BACK_PREFIX).length);
  return (
    '<div class="c86 ' +
    (isOut ? 'out' : 'back') +
    '"><b>' +
    (isOut ? '86' : '✓') +
    '</b><div><span>' +
    escapeHtml(dish) +
    '</span><small>' +
    (isOut
      ? translate('Épuisé, ne plus le proposer', 'Sold out, stop offering it')
      : translate('De retour à la carte', 'Back on the menu')) +
    '</small></div></div>'
  );
}

/**
 * `soldOutToday` - Function 🚫
 *
 * @returns { string[] } - the dishes still « 86 » today (an « out » not followed by a « back »)
 */
function soldOutToday() {
  const today = dayKey(Date.now()),
    out = new Map();
  messages.forEach((message) => {
    const value = String(message.text || '');
    if (dayKey(timeOf(message)) !== today) return;
    if (value.startsWith(OUT_PREFIX))
      out.set(value.slice(OUT_PREFIX.length).toLowerCase(), value.slice(OUT_PREFIX.length));
    else if (value.startsWith(BACK_PREFIX)) out.delete(value.slice(BACK_PREFIX.length).toLowerCase());
  });
  return [...out.values()];
}

/**
 * `paint86Bar` - Function 🚫
 *
 * @returns { void } - the red strip under the header with today's sold-out dishes (✕ = back on the menu)
 */
function paint86Bar() {
  const bar = overlay && overlay.querySelector('.c86bar');
  if (!bar) return;
  const dishes = user && hasChatAccess() && chatPref('strip') ? soldOutToday() : [];
  bar.hidden = !dishes.length;
  const html = dishes.length
    ? '<b>86</b>' +
      dishes
        .map(
          (dish) =>
            '<button data-back="' +
            escapeHtml(dish) +
            '" title="' +
            translate('Remettre à la carte', 'Back on the menu') +
            '">' +
            escapeHtml(dish) +
            '<i>✕</i></button>',
        )
        .join('')
    : '';
  if (bar.innerHTML !== html) bar.innerHTML = html;
}

/**
 * `openSoldOutDialog` - Function 🚫
 *
 * A dialog to say a dish is out: search the menu's dishes (or type any name), tap to send « 86 ».
 *
 * @returns { void }
 */
function openSoldOutDialog() {
  overlay.querySelector('.cmenu').hidden = true;
  const names = [
    ...new Set(((window.LTF && window.LTF.dishes) || []).map((dish) => dish.n).filter(Boolean)),
  ].sort((first, second) => first.localeCompare(second, 'fr'));
  const dialog = document.createElement('div');
  dialog.className = 'cpolldlg c86dlg';
  dialog.innerHTML =
    '<div class="cpollbox">' +
    dialogHeadHtml(
      MENU_ICONS.soldOut,
      translate('Plat épuisé · 86', 'Sold out · 86'),
      translate("Toute l'équipe arrête de le proposer", 'The whole team stops offering it'),
    ) +
    '<div class="csearch">' +
    HEADER_ICONS.search +
    '<input class="cfield" maxlength="80" data-search placeholder="' +
    translate('Chercher ou écrire un plat', 'Search or type a dish') +
    '"></div><div class="c86list"></div><div class="cdbar"><button class="cdbtn sec" data-cancel>' +
    translate('Annuler', 'Cancel') +
    '</button></div></div>';
  overlay.appendChild(dialog);
  const search = dialog.querySelector('[data-search]'),
    list = dialog.querySelector('.c86list');
  // the matching dishes (+ the typed name when it's not one of them) 🔎
  const paintList = () => {
    const query = search.value.trim(),
      folded = query.toLowerCase();
    const matches = names.filter((name) => name.toLowerCase().includes(folded)).slice(0, 40);
    const typed = query && !matches.some((name) => name.toLowerCase() === folded) ? [query.slice(0, 80)] : [];
    const rowHtml = (name, isTyped) =>
      '<button data-dish="' +
      escapeHtml(name) +
      '">' +
      MENU_ICONS.soldOut +
      '<span>' +
      (isTyped ? translate('Envoyer « ', 'Send « ') + escapeHtml(name) + ' »' : escapeHtml(name)) +
      '</span></button>';
    list.innerHTML =
      typed.map((name) => rowHtml(name, true)).join('') +
        matches.map((name) => rowHtml(name, false)).join('') ||
      '<p class="muted sm" style="text-align:center;margin:14px 0">' +
        translate('Aucun plat', 'No dish') +
        '</p>';
  };
  paintList();
  search.addEventListener('input', paintList);
  search.focus();
  dialog.onclick = (event) => {
    const dish = event.target.closest('[data-dish]');
    if (event.target === dialog || event.target.closest('[data-cancel]') || event.target.closest('.cdx'))
      closeDialog(dialog);
    else if (dish) {
      closeDialog(dialog);
      sendExtra({ text: OUT_PREFIX + dish.dataset.dish });
    }
  };
}

// ===== CHAT SETTINGS ⚙️ & DIALOG PARTS (0.75.0) ===== //

// the chat settings of this phone: key & defaults 💾
const PREFS_KEY = 'ltf_chat_prefs',
  DEFAULT_PREFS = { sound: true, enter: true, size: 'm', motion: true, strip: true };

/**
 * `chatPrefs` - Function 💾
 *
 * @returns { object } - this phone's chat settings (defaults for anything never set)
 */
function chatPrefs() {
  try {
    return Object.assign({}, DEFAULT_PREFS, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'));
  } catch (error) {
    return Object.assign({}, DEFAULT_PREFS);
  }
}

/**
 * `chatPref` - Function 💾
 *
 * @param { string } name - a setting (sound, enter, size, motion, strip)
 * @returns { any } - its value
 */
function chatPref(name) {
  return chatPrefs()[name];
}

/**
 * `setChatPref` - Function 💾
 *
 * @param { string } name - a setting
 * @param { any } value - its new value
 * @returns { void } - saved, then applied to the open chat
 */
function setChatPref(name, value) {
  const prefs = chatPrefs();
  prefs[name] = value;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    // private mode: just for this visit 🤷
  }
  applyChatPrefs();
  if (name === 'strip') paint86Bar();
}

/**
 * `applyChatPrefs` - Function 🎛️
 *
 * @returns { void } - the text size & motion classes on the open chat
 */
function applyChatPrefs() {
  if (!overlay) return;
  const size = chatPref('size');
  overlay.classList.toggle('cfs-s', size === 's');
  overlay.classList.toggle('cfs-l', size === 'l');
  overlay.classList.toggle('cnomo', !chatPref('motion'));
}

/**
 * `dialogHeadHtml` - Function 🧩
 *
 * @param { string } icon - an outline SVG
 * @param { string } title - the dialog title
 * @param { string } subtitle - one short line under it
 * @returns { string } - the head of a chat dialog (icon, title, subtitle, ✕)
 */
function dialogHeadHtml(icon, title, subtitle) {
  return (
    '<div class="cdh"><span class="cdhi">' +
    icon +
    '</span><div class="grow" style="min-width:0"><b>' +
    title +
    '</b><small>' +
    subtitle +
    '</small></div><button class="cdx" aria-label="close">✕</button></div>'
  );
}

/**
 * `closeDialog` - Function 👋
 *
 * @param { HTMLElement } dialog - a chat dialog (.cpolldlg)
 * @returns { void } - slides it away, then removes it
 */
function closeDialog(dialog) {
  if (dialog.classList.contains('out')) return;
  dialog.classList.add('out');
  setTimeout(() => dialog.remove(), 200);
}

/**
 * `switchRowHtml` - Function 🎚️
 *
 * @param { string } name - the setting (or 'push' for the notifications)
 * @param { string } title - the row title
 * @param { string } hint - one short line under it
 * @param { boolean } isOn - the switch state
 * @returns { string } - a settings row with a switch
 */
function switchRowHtml(name, title, hint, isOn) {
  return (
    '<label class="csetr"><span class="grow"><b>' +
    title +
    '</b><small>' +
    hint +
    '</small></span><input type="checkbox" data-pref="' +
    name +
    '"' +
    (isOn ? ' checked' : '') +
    '><i class="csw"></i></label>'
  );
}

/**
 * `openChatSettings` - Async Function ⚙️
 *
 * The chat settings drawer, sliding in from the right: notifications, sound, Enter key, text size,
 * animations & the 86 strip. Everything is saved on this phone only.
 *
 * @returns { Promise<void> }
 */
async function openChatSettings() {
  if (!overlay || overlay.querySelector('.cset')) return;
  const prefs = chatPrefs();
  const pushOn =
    pushSupported() && user && Notification.permission === 'granted' && !!(await currentSubscription());
  const sizes = [
    ['s', translate('Petit', 'Small')],
    ['m', translate('Normal', 'Normal')],
    ['l', translate('Grand', 'Large')],
  ];
  const drawer = document.createElement('div');
  drawer.className = 'cset';
  drawer.innerHTML =
    '<div class="csetp" role="dialog" aria-label="settings"><div class="csethd"><button class="csetx" aria-label="back">' +
    HEADER_ICONS.back +
    '</button><b>' +
    translate('Réglages du chat', 'Chat settings') +
    '</b></div><div class="csetbd">' +
    '<div class="csetg">' +
    translate('Alertes', 'Alerts') +
    '</div><div class="csetc">' +
    (pushSupported() && user
      ? switchRowHtml(
          'push',
          translate('Notifications', 'Notifications'),
          translate('Sur ce téléphone, même app fermée', 'On this phone, even with the app closed'),
          pushOn,
        )
      : '') +
    switchRowHtml(
      'sound',
      translate('Son', 'Sound'),
      translate('Un petit carillon à chaque message', 'A little chime for each message'),
      prefs.sound,
    ) +
    switchRowHtml(
      'strip',
      translate('Bandeau « 86 »', '« 86 » strip'),
      translate('Les plats épuisés du jour en haut', "Today's sold-out dishes at the top"),
      prefs.strip,
    ) +
    '</div><div class="csetg">' +
    translate('Écriture', 'Typing') +
    '</div><div class="csetc">' +
    switchRowHtml(
      'enter',
      translate('Entrée pour envoyer', 'Enter to send'),
      translate('Désactivé : Entrée fait un retour à la ligne', 'Off: Enter adds a new line'),
      prefs.enter,
    ) +
    '</div><div class="csetg">' +
    translate('Affichage', 'Display') +
    '</div><div class="csetc"><div class="csetr"><span class="grow"><b>' +
    translate('Taille du texte', 'Text size') +
    '</b><small>' +
    translate('Dans les bulles', 'In the bubbles') +
    '</small></span></div><div class="cseg">' +
    sizes
      .map(
        ([value, label]) =>
          '<button data-size="' +
          value +
          '"' +
          (prefs.size === value ? ' class="on"' : '') +
          ' style="font-size:' +
          { s: 13, m: 15, l: 17 }[value] +
          'px">' +
          label +
          '</button>',
      )
      .join('') +
    '</div>' +
    switchRowHtml(
      'motion',
      translate('Animations', 'Animations'),
      translate("L'envoi qui s'envole, le défilement doux", 'The flying send, the smooth scroll'),
      prefs.motion,
    ) +
    '</div><p class="muted sm csetft">' +
    translate('Ces réglages restent sur ce téléphone.', 'These settings stay on this phone.') +
    '</p></div></div>';
  overlay.appendChild(drawer);
  requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add('on')));
  // 👋 close: the back arrow or a tap on the dimmed side
  const close = () => {
    drawer.classList.remove('on');
    setTimeout(() => drawer.remove(), 280);
  };
  drawer.addEventListener('click', (event) => {
    if (event.target === drawer || event.target.closest('.csetx')) return close();
    const size = event.target.closest('[data-size]');
    if (size) {
      drawer
        .querySelectorAll('[data-size]')
        .forEach((button) => button.classList.toggle('on', button === size));
      setChatPref('size', size.dataset.size);
    }
  });
  // 🎚️ the switches
  drawer.addEventListener('change', async (event) => {
    const input = event.target.closest('[data-pref]');
    if (!input) return;
    if (input.dataset.pref !== 'push') return setChatPref(input.dataset.pref, input.checked);
    // 🔔 notifications: the same switch as the bell, then show the real state
    await togglePush();
    await refreshBell();
    input.checked = Notification.permission === 'granted' && !!(await currentSubscription());
  });
}

/**
 * `addPolishStyles` - Function 🎨
 *
 * @returns { void } - the CSS of the polish & of Phase 3 (once, after the other chat styles so it wins)
 */
function addPolishStyles() {
  if (document.getElementById('chatPolishCss')) return;
  const style = document.createElement('style');
  style.id = 'chatPolishCss';
  style.textContent = `
.chatov{background:radial-gradient(120% 60% at 50% 0%,rgba(201,169,97,.07),transparent 60%),var(--bg)}
.chatov .sch{position:relative;z-index:3;background:color-mix(in srgb,var(--bg) 78%,transparent);
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.06)}
.cfaces{display:flex;flex-direction:row-reverse;margin-right:2px}
.cfaces img,.cfaces span{width:26px;height:26px;border-radius:50%;object-fit:cover;border:2px solid var(--bg);
  margin-left:-8px;font-size:11px;font-weight:700;color:#fff;display:inline-flex;align-items:center;justify-content:center}
.cbody{gap:12px;padding:14px 12px 18px;scroll-behavior:auto}
.cbody{overscroll-behavior:contain}
.cdg{display:flex;flex-direction:column;gap:12px}
.cday{position:sticky;top:6px;z-index:2;display:flex;justify-content:center;margin:6px 0 2px;pointer-events:none}
.cday span{font-size:11.5px;font-weight:700;letter-spacing:.02em;padding:4px 12px;border-radius:999px;
  background:color-mix(in srgb,var(--bar,#14203a) 88%,transparent);-webkit-backdrop-filter:blur(8px);
  backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.08);color:var(--mu)}
.cm.cgc{margin-top:-9px}
.cm.cgc .ccap{display:none}
.cm.cgn .cav{visibility:hidden}
.cb{box-shadow:0 1px 2px rgba(0,0,0,.25);border-radius:18px;padding:8px 12px 6px;line-height:1.38}
.cm:not(.me) .cb{border-top-left-radius:6px}
.cm.me .cb{border-top-right-radius:6px}
.cm.cgc:not(.me) .cb{border-top-left-radius:6px}
.cm.cgn:not(.me) .cb{border-bottom-left-radius:6px}
.cm.cgc.me .cb{border-top-right-radius:6px}
.cm.cgn.me .cb{border-bottom-right-radius:6px}
.cm:not(.cgc):not(.me) .cb{border-top-left-radius:4px}
.ctm{font-size:10px;opacity:.55;margin-top:3px;font-variant-numeric:tabular-nums}
.cm.cpop .cb{animation:cpop .28s cubic-bezier(.2,.9,.3,1.25)}
.cm.cfly .cb{animation:none;will-change:transform}
.c86bar{display:flex;gap:6px;align-items:center;overflow-x:auto;padding:6px 12px;scrollbar-width:none;
  border-bottom:1px solid rgba(255,255,255,.06);background:color-mix(in srgb,#b3261e 10%,var(--bg))}
.c86bar[hidden]{display:none}
.c86bar>b{flex:none;font-size:11px;letter-spacing:.06em;color:#ff8a80}
.c86bar button{flex:none;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 6px 0 11px;border-radius:999px;
  border:1px solid rgba(255,138,128,.35);background:transparent;color:var(--tx,#fff);font:inherit;font-size:12.5px}
.c86bar button i{font-style:normal;opacity:.6;font-size:11px;padding:0 4px}
.c86{display:flex;align-items:center;gap:10px;padding:4px 2px}
.c86 b{flex:none;display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:26px;border-radius:8px;
  border:1.5px solid currentColor;font-size:13px;letter-spacing:.04em}
.c86.out b{color:#ff8a80}
.c86.back b{color:#81c995}
.c86 span{font-weight:600}
.c86 small{display:block;font-size:11px;opacity:.65;font-weight:400}
.cthread{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:8px;margin:-6px 0 0;padding:8px 8px 8px 14px;
  border-radius:14px;background:color-mix(in srgb,var(--gold,#c9a961) 16%,var(--bg));border:1px solid rgba(201,169,97,.35);font-size:13px}
.cthread b{color:var(--gold,#c9a961)}
.cthread button{margin-left:auto;width:30px;height:30px;border-radius:50%;border:0;background:rgba(255,255,255,.08);color:inherit}
.ctthr{margin:10px 0 6px}
.c86dlg .c86list{display:flex;flex-direction:column;max-height:46vh;overflow:auto;margin:2px -6px;
  border-radius:16px;background:rgba(255,255,255,.03)}
.c86dlg .c86list button{display:flex;align-items:center;gap:12px;text-align:left;min-height:48px;padding:0 14px;border:0;
  background:transparent;color:inherit;font:inherit;font-size:15px;cursor:pointer}
.c86dlg .c86list button + button{border-top:1px solid rgba(255,255,255,.05)}
.c86dlg .c86list button svg{flex:none;width:18px;height:18px;color:#ff8a80}
.c86dlg .c86list button:active,.c86dlg .c86list button:hover{background:rgba(255,255,255,.07)}
@keyframes cpop{from{transform:scale(.86) translateY(8px);opacity:0}to{transform:none;opacity:1}}
.cact{animation:cslide .18s ease-out}
@keyframes cslide{from{transform:translateY(-4px);opacity:0}to{transform:none;opacity:1}}
/* 💬 the composer: a soft filled pill, no outline, icons in one muted colour */
.cpill{background:rgba(255,255,255,.07);border:0;border-radius:22px;padding:3px 4px 3px 3px;
  box-shadow:inset 0 0 0 .5px rgba(255,255,255,.06);transition:background .2s,box-shadow .2s}
.cpill:focus-within{background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 .5px rgba(255,255,255,.1)}
.cpill textarea::placeholder{color:var(--mu);opacity:.8}
.cfoot{border-top:0;background:color-mix(in srgb,var(--bg) 82%,transparent);
  -webkit-backdrop-filter:blur(18px) saturate(1.4);backdrop-filter:blur(18px) saturate(1.4)}
.cmic,.cplus,.cemo{color:var(--mu);transition:color .15s,transform .15s}
.cmic:active,.cplus:active,.cemo:active{transform:scale(.88);color:var(--tx,#fff)}
.cplus{font-size:0}
.crecs{display:flex;align-items:center;justify-content:center}
.cmic{width:40px;height:40px;border:0;padding:0;background:transparent;
  cursor:pointer;flex:none;display:flex;align-items:center;justify-content:center}
.cmic[hidden]{display:none}
.crec{position:absolute;inset:0;display:flex;align-items:center;gap:10px;padding:0 6px;border-radius:24px;
  background:var(--bar,#14203a);z-index:2}
.cmicic{color:var(--gold,#c9a961);display:flex;justify-content:center}
.cmicic svg{width:34px;height:34px}
.cmicsteps{text-align:left;margin:4px 0 14px;padding-left:20px;font-size:13px;line-height:1.45;color:var(--mu)}
.cmicsteps li{margin:4px 0}
.cmenu{min-width:212px;padding:6px;border-radius:18px;border:0;
  background:color-mix(in srgb,var(--bar,#14203a) 88%,#000 12%);
  box-shadow:0 12px 32px rgba(0,0,0,.5),inset 0 0 0 .5px rgba(255,255,255,.08)}
.cmenu label,.cmenu button{display:flex;align-items:center;gap:14px;width:100%;height:48px;padding:0 14px;
  box-sizing:border-box;border:0;border-radius:12px;background:transparent;color:inherit;font:inherit;
  font-size:15px;text-align:left;cursor:pointer;margin:0}
.cmenu label + label{border-top:0}
.cmenu label:active,.cmenu button:active,.cmenu label:hover,.cmenu button:hover{background:rgba(255,255,255,.07)}
.cmenu svg{flex:none;color:var(--mu)}
.crecdot{width:10px;height:10px;border-radius:50%;background:#e5484d;animation:crec 1s infinite}
@keyframes crec{50%{opacity:.25}}
.crect{font-weight:700;font-variant-numeric:tabular-nums}
.crecx,.crecs{width:36px;height:36px;border:0;border-radius:50%;cursor:pointer;font-size:16px;flex:none}
.crecx{background:transparent;color:var(--mu)}
.crecs{background:var(--gold,#c9a961);color:#111}
.cvoice{display:flex;align-items:center;gap:10px;min-width:190px;padding:2px 0}
.cvplay{width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.18);color:#fff;
  cursor:pointer;flex:none;font-size:13px}
.cvbar{flex:1;height:4px;border-radius:4px;background:rgba(255,255,255,.22);overflow:hidden}
.cvbar i{display:block;height:100%;background:#fff;width:0;transition:width .2s linear}
.cvdur{font-size:12px;opacity:.8;font-variant-numeric:tabular-nums}
.cpoll{min-width:220px;display:flex;flex-direction:column;gap:6px}
.cpollq{font-weight:700;margin-bottom:2px}
.cpollo{position:relative;overflow:hidden;display:flex;align-items:center;gap:8px;text-align:left;border:1px solid
  rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff;border-radius:10px;padding:8px 10px;
  font:inherit;cursor:pointer}
.cpollo i{position:absolute;inset:0 auto 0 0;background:rgba(255,255,255,.14);transition:width .3s}
.cpollo span{position:relative;flex:1}
.cpollo b{position:relative;font-size:12px;opacity:.85}
.cpollo.on{border-color:var(--gold,#c9a961)}
.cpollo.on i{background:rgba(201,169,97,.35)}
.cpollt{font-size:11px;opacity:.65}
.cfoot{position:relative;z-index:8}
.cmenu{z-index:9}
.cpolldlg{position:absolute;inset:0;z-index:30;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;
  justify-content:center;animation:fade .18s}
.cpolldlg.out{opacity:0;transition:opacity .2s}
.cpolldlg.out .cpollbox{transform:translateY(40px);transition:transform .2s}
.cpollbox{width:min(520px,100%);box-sizing:border-box;max-height:90%;overflow:auto;
  background:color-mix(in srgb,var(--bar,#14203a) 55%,var(--bg));border-radius:26px 26px 0 0;
  padding:10px 18px calc(18px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px;
  box-shadow:0 -10px 40px rgba(0,0,0,.45);animation:csheet .32s cubic-bezier(.2,.85,.25,1)}
.cpollbox::before{content:'';align-self:center;width:38px;height:4px;border-radius:2px;background:rgba(255,255,255,.18);margin-bottom:4px}
@keyframes csheet{from{transform:translateY(100%)}}
@media (min-width:700px){.cpolldlg{align-items:center}.cpollbox{border-radius:24px}.cpollbox::before{display:none}}
.cdh{display:flex;align-items:center;gap:12px;margin-bottom:4px}
.cdhi{width:42px;height:42px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;
  color:var(--gold,#c9a961);background:rgba(201,169,97,.12)}
.cdh b{display:block;font-size:17px}
.cdh small{display:block;font-size:12.5px;color:var(--mu)}
.cdx{width:34px;height:34px;flex:none;border:0;border-radius:50%;background:rgba(255,255,255,.07);color:var(--mu);
  font-size:13px;cursor:pointer}
.clbl{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);margin:6px 2px -2px}
.cfield{width:100%;box-sizing:border-box;height:50px;padding:0 16px;border-radius:14px;border:1.5px solid transparent;
  background:rgba(255,255,255,.06);color:var(--tx,#fff);font:inherit;font-size:16px;outline:none;
  transition:border-color .15s,background .15s}
.cfield::placeholder{color:var(--mu);opacity:.8}
.cfield:focus{border-color:var(--gold,#c9a961);background:rgba(255,255,255,.09)}
.cpollopts{display:flex;flex-direction:column;gap:8px}
.cpo{display:flex;align-items:center;gap:8px}
.cpon{width:26px;height:26px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:800;color:#111;background:var(--gold,#c9a961)}
.cpox{width:34px;height:34px;flex:none;border:0;border-radius:50%;background:transparent;color:var(--mu);cursor:pointer}
.cpollopts.cmin .cpox{visibility:hidden}
.cpadd{height:46px;border-radius:14px;border:1.5px dashed rgba(255,255,255,.18);background:transparent;
  color:var(--gold,#c9a961);font:inherit;font-weight:700;cursor:pointer}
.cpadd[hidden]{display:none}
.cdbar{display:flex;gap:10px;margin-top:8px}
.cdbtn{flex:1;height:50px;border-radius:25px;border:0;background:var(--gold,#c9a961);color:#111;font:inherit;
  font-weight:800;font-size:15px;cursor:pointer}
.cdbtn.sec{background:rgba(255,255,255,.08);color:var(--tx,#fff);font-weight:700}
.cdbtn:active,.cpadd:active{transform:scale(.97)}
.csearch{position:relative}
.csearch svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--mu);pointer-events:none}
.csearch .cfield{padding-left:46px}
.chatov .cbell,.chatov .cgear{width:40px;height:40px;flex:none;border:0;border-radius:50%;padding:0;background:transparent;
  color:var(--mu);opacity:1;box-shadow:none;display:flex;align-items:center;justify-content:center;cursor:pointer}
.chatov .cbell[hidden]{display:none}
.chatov .cbell.on{color:var(--tx,#fff);box-shadow:none}
.chatov .cbell:active,.chatov .cgear:active{background:rgba(255,255,255,.08)}
.chatov.cfs-s .ct{font-size:13.5px}
.chatov.cfs-l .ct{font-size:17.5px}
.chatov.cnomo .cm.cpop .cb{animation:none}
.cset{position:absolute;inset:0;z-index:40;background:rgba(0,0,0,0);transition:background .28s}
.cset.on{background:rgba(0,0,0,.45)}
.csetp{position:absolute;top:0;right:0;bottom:0;width:min(380px,88%);display:flex;flex-direction:column;
  background:var(--bg);box-shadow:-12px 0 40px rgba(0,0,0,.4);transform:translateX(100%);
  transition:transform .3s cubic-bezier(.2,.85,.25,1)}
.cset.on .csetp{transform:none}
.csethd{display:flex;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top)) 12px 10px}
.csethd b{font-size:17px}
.csetx{width:40px;height:40px;border:0;border-radius:50%;background:transparent;color:inherit;display:flex;
  align-items:center;justify-content:center;cursor:pointer}
.csetbd{flex:1;overflow:auto;padding:0 14px calc(18px + env(safe-area-inset-bottom))}
.csetg{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);margin:16px 6px 8px}
.csetc{border-radius:18px;background:rgba(255,255,255,.05);overflow:hidden}
.csetr{display:flex;align-items:center;gap:12px;padding:13px 14px;cursor:pointer}
.csetr + .csetr{border-top:1px solid rgba(255,255,255,.06)}
.csetr b{display:block;font-size:15px;font-weight:600}
.csetr small{display:block;font-size:12.5px;color:var(--mu);margin-top:2px}
.csetr input{position:absolute;opacity:0;pointer-events:none}
.csw{position:relative;width:46px;height:28px;flex:none;border-radius:14px;background:rgba(255,255,255,.16);transition:background .2s}
.csw::after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;
  box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .2s cubic-bezier(.2,.85,.25,1)}
.csetr input:checked + .csw{background:var(--gold,#c9a961)}
.csetr input:checked + .csw::after{transform:translateX(18px)}
.csetr input:focus-visible + .csw{outline:2px solid var(--gold,#c9a961);outline-offset:2px}
.cseg{display:flex;gap:6px;padding:0 14px 14px}
.cseg button{flex:1;height:40px;border-radius:12px;border:0;background:rgba(255,255,255,.07);color:inherit;font:inherit;cursor:pointer}
.cseg button.on{background:var(--gold,#c9a961);color:#111;font-weight:700}
.csetft{text-align:center;margin:16px 0 0}
@media (prefers-reduced-motion:reduce){.csetp,.cpollbox{transition:none;animation:none}}
.cholbl{font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#f3d58a;margin-bottom:3px}
.cm .cb:has(.cholbl){outline:1.5px solid rgba(201,169,97,.7)}
.cho{display:flex;gap:10px;align-items:center;padding:8px 14px;border-bottom:1px solid rgba(255,255,255,.06);
  background:rgba(201,169,97,.08);cursor:pointer}
.cho[hidden]{display:none}
@media (prefers-reduced-motion:reduce){.cm.cpop .cb,.cact{animation:none}}
`;
  document.head.appendChild(style);
}

// ===== VOICE NOTES, POLLS & SHIFT HANDOVER 🎤📊🔁 ===== //

// a voice note: at most 30 s, sent inline as a small data URL (no Storage on the free plan) 🎤
const VOICE_MAX_SECONDS = 30,
  VOICE_MAX_LENGTH = 700000,
  VOICE_PATTERN = /^data:audio\/(webm|mp4|ogg|aac|mpeg)(;codecs=[a-z0-9.]+)?;base64,[A-Za-z0-9+/=]+$/;
// a handover stays on top for 18 hours (one evening → the next lunch) 🔁
const HANDOVER_HOURS = 18;
// a poll: 2 to 6 options of at most 80 characters 📊
const POLL_MIN = 2,
  POLL_MAX = 6;

// the recorder while recording, the playing note & the handover mode of the composer
let recording = null,
  player = null,
  handoverMode = false;

/**
 * `isSafeVoice` - Function 🛡️
 *
 * @param { any } source - a voice note
 * @returns { boolean } - true for a base64 audio data URL of a sane size
 */
const isSafeVoice = (source) =>
  typeof source === 'string' && source.length < VOICE_MAX_LENGTH && VOICE_PATTERN.test(source);

/**
 * `formatSeconds` - Function ⏱️
 *
 * @param { number } seconds - a duration
 * @returns { string } - 0:07
 */
const formatSeconds = (seconds) => {
  const whole = Math.max(0, Math.round(seconds || 0));
  return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
};

/**
 * `pollOf` - Function 📊
 *
 * @param { object } message - a chat message
 * @returns { {question: string, options: Array<string>} | null } - its clean poll (null when none)
 */
function pollOf(message) {
  const poll = message.poll;
  if (!poll || typeof poll !== 'object' || !Array.isArray(poll.o)) return null;
  const options = poll.o.slice(0, POLL_MAX).map((option) => String(option).slice(0, 80));
  return options.length >= POLL_MIN ? { question: String(poll.q || '').slice(0, 200), options } : null;
}

/**
 * `extraHtml` - Function 🧩
 *
 * The parts of a bubble that belong to Phase 3: the handover label, the voice player, the poll card.
 *
 * @param { object } message - a chat message
 * @returns { string } - their HTML (empty when none)
 */
function extraHtml(message) {
  let html = '';
  if (message.ho === true) html += '<div class="cholbl">🔁 ' + translate('Passation', 'Handover') + '</div>';
  if (isSafeVoice(message.voice)) {
    const isPlaying = player && player.id === message.id;
    html +=
      '<div class="cvoice' +
      (isPlaying ? ' on' : '') +
      '"><button class="cvplay" data-play="' +
      message.id +
      '" aria-label="play">' +
      (isPlaying && !player.audio.paused ? '❚❚' : '▶') +
      '</button><div class="cvbar"><i style="width:' +
      (isPlaying ? player.progress : 0) +
      '%"></i></div>' +
      '<span class="cvdur">' +
      formatSeconds(Number(message.dur) || 0) +
      '</span></div>';
  }
  const poll = pollOf(message);
  if (poll) {
    const votes = message.v && typeof message.v === 'object' ? message.v : {},
      counts = poll.options.map(() => 0);
    Object.values(votes).forEach((choice) => {
      if (Number.isInteger(choice) && choice >= 0 && choice < counts.length) counts[choice]++;
    });
    const total = counts.reduce((sum, count) => sum + count, 0),
      mine = user ? votes[user.uid] : undefined;
    html +=
      '<div class="cpoll"><div class="cpollq">📊 ' +
      escapeHtml(poll.question) +
      '</div>' +
      poll.options
        .map(
          (option, index) =>
            '<button class="cpollo' +
            (mine === index ? ' on' : '') +
            '" data-vote="' +
            message.id +
            '" data-choice="' +
            index +
            '"><i style="width:' +
            (total ? (100 * counts[index]) / total : 0) +
            '%"></i><span>' +
            escapeHtml(option) +
            '</span><b>' +
            counts[index] +
            '</b></button>',
        )
        .join('') +
      '<div class="cpollt">' +
      total +
      ' ' +
      translate(total > 1 ? 'votes' : 'vote', total > 1 ? 'votes' : 'vote') +
      '</div></div>';
  }
  return html;
}

/**
 * `vote` - Async Function 📊
 *
 * @param { string } id - the poll message
 * @param { number } choice - the option (the same again removes my vote)
 * @returns { Promise<void> }
 */
async function vote(id, choice) {
  const message = messages.find((candidate) => candidate.id === id);
  if (!message || !user || !pollOf(message)) return;
  const current = (message.v || {})[user.uid];
  if (navigator.vibrate) navigator.vibrate(8);
  try {
    await updateDoc(doc(firestore, 'chat', id), {
      ['v.' + user.uid]: current === choice ? deleteField() : choice,
    });
  } catch (error) {
    showToast(translate('Vote impossible', 'Could not vote'));
  }
}

/**
 * `togglePlay` - Function ▶️
 *
 * @param { string } id - a voice message (one note plays at a time)
 * @returns { void }
 */
function togglePlay(id) {
  const message = messages.find((candidate) => candidate.id === id);
  if (!message || !isSafeVoice(message.voice)) return;
  if (player && player.id === id) {
    if (player.audio.paused) player.audio.play().catch(() => {});
    else player.audio.pause();
    return paintPlayer();
  }
  if (player) player.audio.pause();
  const audio = new Audio(message.voice);
  player = { id, audio, progress: 0 };
  audio.ontimeupdate = () => {
    const length = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Number(message.dur) || 1;
    player.progress = Math.min(100, (100 * audio.currentTime) / length);
    paintPlayer();
  };
  audio.onended = () => {
    player.progress = 0;
    paintPlayer();
    player = null;
  };
  audio.onpause = paintPlayer;
  audio.play().catch(() => showToast(translate('Lecture impossible', 'Could not play')));
  paintPlayer();
}

/**
 * `paintPlayer` - Function ▶️
 *
 * @returns { void } - updates every voice bubble (button & progress) without repainting the list
 */
function paintPlayer() {
  if (!overlay) return;
  overlay.querySelectorAll('[data-play]').forEach((button) => {
    const isCurrent = player && player.id === button.dataset.play,
      bar = button.parentNode.querySelector('.cvbar i');
    button.textContent = isCurrent && !player.audio.paused ? '❚❚' : '▶';
    button.parentNode.classList.toggle('on', !!isCurrent);
    if (bar) bar.style.width = (isCurrent ? player.progress : 0) + '%';
  });
}

/**
 * `voiceMimeType` - Function 🎙️
 *
 * @returns { string } - the first audio format this browser records (Android: webm/opus, iPhone: mp4)
 */
function voiceMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return (
    ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'].find((type) =>
      MediaRecorder.isTypeSupported(type),
    ) || ''
  );
}

/**
 * `startRecording` - Async Function 🎙️
 *
 * Asks for the microphone, then records up to 30 s while the recording bar replaces the composer.
 *
 * @returns { Promise<void> }
 */
async function startRecording() {
  if (recording || !user) return;
  if (!navigator.mediaDevices || typeof MediaRecorder === 'undefined')
    return showToast(translate('Micro non disponible', 'Microphone not available'));
  // 🔐 not allowed yet? our own dialog first: its button opens the phone's « Autoriser » popup
  // (« denied » from the Permissions API can be stale in installed apps: we still try, the real
  // getUserMedia error below decides whether the unblock dialog shows)
  const permission = await micPermission();
  if (permission === 'prompt' && !confirmedMic) return showMicDialog('prompt');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    const name = (error && error.name) || '';
    // blocked (now or before): explain how to unblock it 🔓
    if (name === 'NotAllowedError' || name === 'SecurityError') return showMicDialog('denied');
    if (name === 'NotFoundError') return showToast(translate('Aucun micro trouvé', 'No microphone found'));
    if (name === 'NotReadableError')
      return showToast(
        translate('Le micro est utilisé par une autre app', 'The microphone is busy in another app'),
      );
    return showToast(
      translate('Micro indisponible', 'Microphone unavailable') + (name ? ' (' + name + ')' : ''),
    );
  }
  const mimeType = voiceMimeType();
  let recorder;
  try {
    recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 24000 } : undefined);
  } catch (error) {
    // 🔁 this phone refuses our format: let it pick its own
    recorder = new MediaRecorder(stream);
  }
  const chunks = [];
  recording = { recorder, stream, chunks, startedAt: Date.now(), cancelled: false, timer: 0 };
  recorder.ondataavailable = (event) => event.data && event.data.size && chunks.push(event.data);
  recorder.onstop = () => finishRecording();
  recorder.onerror = (event) => {
    showToast(translate('Erreur du micro', 'Microphone error') + errorCodeOf(event && event.error));
    stopRecording(true);
  };
  // a chunk every second, so a note is never empty 🧩
  recorder.start(1000);
  if (navigator.vibrate) navigator.vibrate(15);
  paintRecording();
  recording.timer = setInterval(() => {
    if (!recording) return;
    if ((Date.now() - recording.startedAt) / 1000 >= VOICE_MAX_SECONDS) stopRecording(false);
    else paintRecording();
  }, 250);
}

// true once the waiter tapped « Autoriser » in our dialog (the phone's popup comes next) ✅
let confirmedMic = false;

/**
 * `micPermission` - Async Function 🔐
 *
 * @returns { Promise<'granted' | 'prompt' | 'denied' | 'unknown'> } - the microphone permission
 */
async function micPermission() {
  try {
    if (!navigator.permissions || !navigator.permissions.query) return 'unknown';
    const status = await navigator.permissions.query({ name: 'microphone' });
    return status.state;
  } catch (error) {
    // Firefox & older Safari can't tell: just ask 🤷
    return 'unknown';
  }
}

/**
 * `showMicDialog` - Function 🎤
 *
 * « prompt »: a short explanation + « Autoriser », whose tap opens the phone's own permission popup.
 * « denied »: the phone never shows that popup again by itself (browser rule), so: how to unblock it.
 *
 * @param { 'prompt' | 'denied' } mode - which dialog
 * @returns { void }
 */
function showMicDialog(mode) {
  if (document.querySelector('.cdlg')) return;
  const isDenied = mode === 'denied';
  const dialog = document.createElement('div');
  dialog.className = 'cdlg';
  dialog.innerHTML =
    '<div class="cdlgbox" role="dialog" aria-modal="true"><div class="cdlgic cmicic">' +
    MIC_ICON +
    '</div><h3>' +
    (isDenied
      ? translate('Le micro est bloqué', 'The microphone is blocked')
      : translate('Autoriser le micro ?', 'Allow the microphone?')) +
    '</h3><p class="cdlgtx">' +
    (isDenied
      ? translate(
          'Le téléphone ne redemande pas tout seul. Débloquez-le une fois :',
          "The phone won't ask again by itself. Unblock it once:",
        )
      : translate(
          "Pour envoyer des vocaux à l'équipe. Le téléphone va vous demander, une seule fois.",
          'To send voice notes to the team. Your phone will ask you, just once.',
        )) +
    '</p>' +
    (isDenied
      ? '<ol class="cmicsteps"><li>' +
        translate(
          "Touchez le cadenas à gauche de l'adresse (dans l'app installée : ⋮ puis ⓘ)",
          'Tap the lock left of the address (in the installed app: ⋮ then ⓘ)',
        ) +
        '</li><li>' +
        translate('Autorisations → Micro → Autoriser', 'Permissions → Microphone → Allow') +
        '</li><li>' +
        translate(
          'Toujours bloqué ? Réglages du téléphone → Applis → Chrome → Autorisations → Micro',
          'Still blocked? Phone Settings → Apps → Chrome → Permissions → Microphone',
        ) +
        '</li></ol>'
      : '') +
    '<div class="cdlgbt"><button class="btn sec" data-act="cancel">' +
    translate('Plus tard', 'Later') +
    '</button><button class="btn" data-act="allow">' +
    (isDenied ? translate("C'est fait", 'Done') : translate('Autoriser', 'Allow')) +
    '</button></div></div>';
  // close (with a short fade) 👋
  const closeDialog = () => {
    dialog.classList.add('out');
    setTimeout(() => dialog.remove(), 160);
  };
  dialog.addEventListener('click', (event) => {
    const action = event.target.closest('[data-act]');
    if (event.target === dialog || (action && action.dataset.act === 'cancel')) closeDialog();
    else if (action && action.dataset.act === 'allow') {
      // 👆 this tap is the gesture the phone wants before showing its popup
      confirmedMic = true;
      dialog.remove();
      startRecording();
    }
  });
  document.body.appendChild(dialog);
}

/**
 * `stopRecording` - Function ⏹️
 *
 * @param { boolean } cancel - true drops the note, false sends it
 * @returns { void }
 */
function stopRecording(cancel) {
  if (!recording) return;
  recording.cancelled = cancel;
  clearInterval(recording.timer);
  if (recording.recorder.state !== 'inactive') recording.recorder.stop();
  else finishRecording();
}

/**
 * `finishRecording` - Function 📤
 *
 * Frees the microphone, then turns the note into a data URL and sends it (unless cancelled or too big).
 *
 * @returns { void }
 */
function finishRecording() {
  const done = recording;
  recording = null;
  if (!done) return;
  done.stream.getTracks().forEach((track) => track.stop());
  paintRecording();
  const seconds = Math.min(VOICE_MAX_SECONDS, Math.max(1, Math.round((Date.now() - done.startedAt) / 1000)));
  if (done.cancelled) return;
  if (!done.chunks.length)
    return showToast(translate('Vocal vide, réessayez', 'Empty voice note, try again'));
  const blob = new Blob(done.chunks, { type: done.recorder.mimeType || done.chunks[0].type || 'audio/webm' });
  const reader = new FileReader();
  reader.onload = () => {
    // some browsers write « audio/webm;codecs=opus » with capitals or spaces: keep the strict form 🛡️
    const dataUrl = String(reader.result).replace(/^data:([^;,]+)(;[^,]*)?;base64,/, (all, type, codec) => {
      const cleanCodec = (codec || '')
        .toLowerCase()
        .replace(/\s/g, '')
        .match(/;codecs=[a-z0-9.]+/);
      return 'data:' + type.toLowerCase() + (cleanCodec ? cleanCodec[0] : '') + ';base64,';
    });
    if (!isSafeVoice(dataUrl)) return showToast(translate('Vocal trop long', 'Voice note too long'));
    sendExtra({ voice: dataUrl, dur: seconds });
  };
  reader.readAsDataURL(blob);
}

/**
 * `paintRecording` - Function 🔴
 *
 * @returns { void } - the recording bar (red dot, time, ✕ cancel, ➤ send) over the composer
 */
function paintRecording() {
  if (!overlay) return;
  let bar = overlay.querySelector('.crec');
  if (!recording) {
    if (bar) bar.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'crec';
    bar.innerHTML =
      '<button class="crecx" aria-label="cancel">✕</button><span class="crecdot"></span><span class="crect"></span>' +
      '<span class="grow muted sm">' +
      translate('Enregistrement… 30 s max', 'Recording… 30 s max') +
      '</span><button class="crecs" aria-label="send">' +
      SEND_ICON +
      '</button>';
    bar.querySelector('.crecx').onclick = () => stopRecording(true);
    bar.querySelector('.crecs').onclick = () => stopRecording(false);
    overlay.querySelector('.cpill').appendChild(bar);
  }
  bar.querySelector('.crect').textContent = formatSeconds((Date.now() - recording.startedAt) / 1000);
}

/**
 * `sendExtra` - Async Function 📤
 *
 * Posts a voice note or a poll (same doc shape as `send`, plus its own fields).
 *
 * @param { object } extra - { voice, dur } or { text, poll }
 * @returns { Promise<void> }
 */
async function sendExtra(extra) {
  if (!user) return;
  const newMessage = Object.assign(
    {
      uid: user.uid,
      name: user.displayName || 'Staff',
      pic: user.photoURL || '',
      text: '',
      ts: serverTimestamp(),
    },
    extra,
  );
  if (replyTo) newMessage.rep = replyTo;
  replyTo = null;
  markFlight(overlay && overlay.querySelector('.cpill'));
  paint();
  try {
    const added = await addDoc(collection(firestore, 'chat'), newMessage);
    playChime();
    notifyTeam(added.id);
  } catch (error) {
    flight = null;
    errorText = translate('Envoi impossible', 'Could not send') + errorCodeOf(error);
    paint();
  }
}

/**
 * `openPollDialog` - Function 📊
 *
 * A small dialog: the question, 2 to 6 options, « Envoyer ».
 *
 * @returns { void }
 */
function openPollDialog() {
  overlay.querySelector('.cmenu').hidden = true;
  const dialog = document.createElement('div');
  dialog.className = 'cpolldlg';
  // one option row: its number, the field & a ✕ (shown from the 3rd option)
  const optionInput = (index) =>
    '<div class="cpo"><span class="cpon">' +
    (index + 1) +
    '</span><input class="cfield" maxlength="80" data-opt="' +
    index +
    '" placeholder="' +
    translate('Option ', 'Option ') +
    (index + 1) +
    '"><button class="cpox" data-remove aria-label="remove">✕</button></div>';
  dialog.innerHTML =
    '<div class="cpollbox">' +
    dialogHeadHtml(
      MENU_ICONS.poll,
      translate('Nouveau sondage', 'New poll'),
      translate("L'équipe vote d'un tap", 'The team votes with one tap'),
    ) +
    '<label class="clbl">' +
    translate('Question', 'Question') +
    '</label><input class="cfield" maxlength="200" data-q placeholder="' +
    translate('Ex. Qui prend le brunch dimanche ?', 'E.g. Who takes Sunday brunch?') +
    '"><label class="clbl">' +
    translate('Options', 'Options') +
    '</label><div class="cpollopts">' +
    optionInput(0) +
    optionInput(1) +
    '</div>' +
    '<button class="cpadd" data-add>+ ' +
    translate('Ajouter une option', 'Add an option') +
    '</button>' +
    '<div class="cdbar"><button class="cdbtn sec" data-cancel>' +
    translate('Annuler', 'Cancel') +
    '</button><button class="cdbtn" data-send>' +
    translate('Envoyer', 'Send') +
    '</button></div></div>';
  overlay.appendChild(dialog);
  dialog.querySelector('[data-q]').focus();
  const list = dialog.querySelector('.cpollopts');
  // renumber the rows & hide « Ajouter » at the max 🔢
  const renumber = () => {
    [...list.children].forEach((row, index) => {
      row.querySelector('.cpon').textContent = index + 1;
      row.querySelector('input').placeholder = translate('Option ', 'Option ') + (index + 1);
    });
    list.classList.toggle('cmin', list.children.length <= POLL_MIN);
    dialog.querySelector('[data-add]').hidden = list.children.length >= POLL_MAX;
  };
  renumber();
  dialog.querySelector('[data-add]').onclick = () => {
    if (list.children.length >= POLL_MAX) return;
    list.insertAdjacentHTML('beforeend', optionInput(list.children.length));
    renumber();
    list.lastElementChild.querySelector('input').focus();
  };
  list.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove]');
    if (!remove || list.children.length <= POLL_MIN) return;
    remove.parentNode.remove();
    renumber();
  });
  dialog.querySelector('[data-cancel]').onclick = () => closeDialog(dialog);
  dialog.querySelector('.cdx').onclick = () => closeDialog(dialog);
  dialog.onclick = (event) => event.target === dialog && closeDialog(dialog);
  dialog.querySelector('[data-send]').onclick = () => {
    const question = dialog.querySelector('[data-q]').value.trim().slice(0, 200),
      options = [...dialog.querySelectorAll('[data-opt]')]
        .map((input) => input.value.trim().slice(0, 80))
        .filter(Boolean);
    if (!question || options.length < POLL_MIN)
      return showToast(translate('Une question et 2 options minimum', 'A question and at least 2 options'));
    dialog.remove();
    sendExtra({ text: '📊 ' + question, poll: { q: question, o: options } });
  };
}

/**
 * `startHandover` - Function 🔁
 *
 * Puts the composer in handover mode: the next message is the note for the next shift.
 *
 * @returns { void }
 */
function startHandover() {
  overlay.querySelector('.cmenu').hidden = true;
  handoverMode = true;
  editingId = null;
  paint();
  overlay.querySelector('textarea').focus();
}

/**
 * `latestHandover` - Function 🔁
 *
 * @returns { object | null } - the newest handover of the last 18 hours (null when none)
 */
function latestHandover() {
  const since = Date.now() - HANDOVER_HOURS * 3600000;
  return (
    messages.filter((message) => message.ho === true && message.text && timeOf(message) >= since).pop() ||
    null
  );
}

/**
 * `paintHandover` - Function 🔁
 *
 * @returns { void } - the handover banner under the pinned one (tap = jump to it)
 */
function paintHandover() {
  const banner = overlay && overlay.querySelector('.cho');
  if (!banner) return;
  const handover = latestHandover();
  banner.hidden = !handover;
  if (!handover) return;
  const key = handover.id + (handover.ed ? '+' : '');
  if (banner.dataset.key === key) return;
  banner.dataset.key = key;
  banner.innerHTML =
    '<span class="cpini">🔁</span><div class="grow" style="min-width:0"><b>' +
    translate('Passation', 'Handover') +
    ' · ' +
    escapeHtml((handover.name || '').split(' ')[0]) +
    ' · ' +
    formatTime(timeOf(handover)) +
    '</b><div class="cpint">' +
    escapeHtml(handover.text) +
    '</div></div>';
  banner.onclick = () => jumpTo(handover.id);
}

// ===== EMOJI & GIF PANEL 😀 ===== //

// the outline smiley of the composer (like WhatsApp) & the keyboard icon shown while the panel is open
const SMILEY_ICON =
  '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' +
  '<circle cx="12" cy="12" r="9.2"/><path d="M8 14.2c1 1.4 2.3 2.1 4 2.1s3-.7 4-2.1"/>' +
  '<circle cx="9" cy="9.8" r=".6" fill="currentColor"/><circle cx="15" cy="9.8" r=".6" fill="currentColor"/></svg>';
// ➕ the attach menu's icons: plain outlines in one colour 📷🖼️📊🔁
const MENU_SVG_START =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const MENU_ICONS = {
  camera:
    MENU_SVG_START +
    '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11' +
    'A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.5"/></svg>',
  photos:
    MENU_SVG_START +
    '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.6"/>' +
    '<path d="m4 17 4.6-4.6a1.5 1.5 0 0 1 2.1 0L16 17.6M14 15.5l1.8-1.8a1.5 1.5 0 0 1 2.1 0L20 15.8"/></svg>',
  poll: MENU_SVG_START + '<path d="M5 20V11M12 20V4M19 20v-6"/></svg>',
  handover: MENU_SVG_START + '<path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5"/></svg>',
  soldOut: MENU_SVG_START + '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/></svg>',
};

// the header & dialog icons: simple outline, one colour 🖊️
const HEADER_ICONS = {
  bell:
    MENU_SVG_START +
    '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
  bellOff:
    MENU_SVG_START +
    '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/><path d="m3.5 3.5 17 17"/></svg>',
  gear:
    MENU_SVG_START +
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a' +
    '1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.' +
    '8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.' +
    '7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0' +
    ' 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1' +
    '.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  search: MENU_SVG_START + '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/></svg>',
  back: MENU_SVG_START + '<path d="M15 5l-7 7 7 7"/></svg>',
};

// 🎤 a plain outline microphone (one colour, follows the text colour)
const MIC_ICON =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="9" y="3" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>';
// ➕ the attach button (photos, poll, handover)
const PLUS_ICON =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" ' +
  'stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
// ➤ send (voice note)
const SEND_ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">' +
  '<path d="M4.4 19.6 21 12 4.4 4.4l.02 5.9L15 12 4.42 13.7z"/></svg>';
const KEYBOARD_ICON =
  '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' +
  '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M9.3 10h.01M12.6 10h.01M15.9 10h.01M18 10h.01M6.5 14h11"/></svg>';

/**
 * `isEmojiOnly` - Function 😀
 *
 * @param { string } text - a message text
 * @returns { boolean } - true for 1 to 3 emojis and nothing else (shown big in the bubble)
 */
function isEmojiOnly(text) {
  const trimmed = String(text || '').replace(/\s/g, '');
  if (
    !trimmed ||
    trimmed.length > 40 ||
    !/^[\p{Extended_Pictographic}\p{Emoji_Component}\u200d\ufe0f]+$/u.test(trimmed)
  )
    return false;
  return splitGraphemes(trimmed).length <= 3;
}

/**
 * `splitGraphemes` - Function ✂️
 *
 * @param { string } text - any text
 * @returns { string[] } - its visible characters (a family emoji or a flag stays one piece)
 */
function splitGraphemes(text) {
  if (window.Intl && Intl.Segmenter)
    return [...new Intl.Segmenter().segment(text)].map((piece) => piece.segment);
  return Array.from(text);
}

/**
 * `loadEmojis` - Async Function 📥
 *
 * Loads `emoji.json` once (built by rust/tools/gen_emoji.js from emojibase, English + French search words).
 *
 * @returns { Promise<Array> } - one list of [emoji, search words] per tab
 */
async function loadEmojis() {
  if (!emojiTabs) emojiTabs = await (await fetch('emoji.json')).json();
  return emojiTabs;
}

/**
 * `recentEmojis` - Function 🕘
 *
 * @returns { string[] } - my last 32 emojis, newest first
 */
const recentEmojis = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch (error) {
    return [];
  }
};

/**
 * `openPicker` - Function 😀
 *
 * Opens the emoji / GIF panel at the bottom (in place of the phone keyboard).
 *
 * @returns { void }
 */
function openPicker() {
  const picker = overlay && overlay.querySelector('.cpick');
  if (!picker) return;
  // keyboard down, panel up ⬆️
  overlay.querySelector('textarea').blur();
  overlay.querySelector('.cmenu').hidden = true;
  picker.hidden = false;
  overlay.querySelector('.cemo').innerHTML = KEYBOARD_ICON;
  paintPicker();
}

/**
 * `closePicker` - Function 👋
 *
 * @returns { void }
 */
function closePicker() {
  const picker = overlay && overlay.querySelector('.cpick');
  if (!picker || picker.hidden) return;
  picker.hidden = true;
  overlay.querySelector('.cemo').innerHTML = SMILEY_ICON;
}

/**
 * `paintPicker` - Function 🎨
 *
 * Draws the panel: the search box, the content (emoji sections or GIF grid) and the bottom bar
 * (Emoji / GIF tabs, the emoji section shortcuts and the delete key ⌫).
 *
 * @returns { void }
 */
function paintPicker() {
  const picker = overlay.querySelector('.cpick'),
    isEmoji = pickerTab === 'emoji',
    isSticker = pickerTab === 'sticker';
  picker.innerHTML =
    '<div class="cpsearch"><span>🔎</span><input type="search" enterkeyhint="search" placeholder="' +
    (isEmoji
      ? translate('Rechercher un emoji', 'Search emoji')
      : isSticker
        ? translate('Rechercher un sticker', 'Search stickers')
        : translate('Rechercher des GIF', 'Search GIFs')) +
    '"></div><div class="cpbody"></div><div class="cpbar"><div class="cptabs">' +
    [
      ['emoji', '😀'],
      ['gif', 'GIF'],
      ['sticker', '🏷️'],
    ]
      .map(
        (tab) =>
          '<button data-tab="' +
          tab[0] +
          '"' +
          (pickerTab === tab[0] ? ' class="on"' : '') +
          '>' +
          tab[1] +
          '</button>',
      )
      .join('') +
    '</div>' +
    (isEmoji
      ? '<div class="cpjump">' +
        EMOJI_TABS.map((tab, index) => '<button data-jump="' + index + '">' + tab[0] + '</button>').join('') +
        '</div><button class="cpdel" aria-label="delete">⌫</button>'
      : isSticker
        ? '<span class="cptenor">Les Trois Forts</span>'
        : '<span class="cptenor">GIPHY</span>') +
    '</div>';
  const search = picker.querySelector('input');
  // the search box (no keyboard-closing of the panel: it's inside it) 🔎
  search.oninput = () =>
    isEmoji ? paintEmojis(search.value) : isSticker ? paintStickers(search.value) : searchGifs(search.value);
  // 🗂️ Emoji / GIF tabs
  picker.querySelectorAll('[data-tab]').forEach(
    (button) =>
      (button.onclick = () => {
        pickerTab = button.dataset.tab;
        paintPicker();
      }),
  );
  if (isEmoji) {
    // ⏭️ jump to a section
    picker.querySelectorAll('[data-jump]').forEach(
      (button) =>
        (button.onclick = () => {
          search.value = '';
          paintEmojis('');
          const section = picker.querySelector('#cpsec' + button.dataset.jump);
          if (section) picker.querySelector('.cpbody').scrollTop = section.offsetTop - 4;
        }),
    );
    // ⌫ delete the character before the caret (hold-free, one emoji at a time)
    picker.querySelector('.cpdel').onclick = deleteBeforeCaret;
    paintEmojis('');
  } else if (isSticker) paintStickers('');
  else searchGifs('');
  // 👆 taps in the content: an emoji goes in the text, a GIF is sent right away
  picker.querySelector('.cpbody').onclick = (event) => {
    const emojiButton = event.target.closest('[data-emoji]'),
      gifButton = event.target.closest('[data-gif]'),
      stickerButton = event.target.closest('[data-sticker]');
    if (emojiButton) insertEmoji(emojiButton.dataset.emoji);
    if (gifButton) sendMedia({ gif: gifButton.dataset.gif });
    if (stickerButton) sendMedia({ sticker: stickerButton.dataset.sticker });
  };
}

/**
 * `paintEmojis` - Async Function 😀
 *
 * Fills the panel with the emoji sections, or with the matches of a search (English or French words).
 *
 * @param { string } searchText - the search box text ('' = every section)
 * @returns { Promise<void> }
 */
async function paintEmojis(searchText) {
  const content = overlay && overlay.querySelector('.cpbody');
  if (!content) return;
  let tabs = [];
  try {
    tabs = await loadEmojis();
  } catch (error) {
    content.innerHTML =
      '<p class="cpmsg">' + translate('Emojis indisponibles', 'Emojis unavailable') + '</p>';
    return;
  }
  // the panel may have changed while loading
  if (pickerTab !== 'emoji' || !overlay) return;
  const button = (emoji) => '<button data-emoji="' + emoji + '">' + emoji + '</button>';
  const words = searchText.trim().toLowerCase();
  // 🔎 a search: every emoji whose words contain all the typed words
  if (words) {
    const parts = words.split(/\s+/);
    const matches = tabs
      .flat()
      .filter((item) => parts.every((part) => item[1].includes(part)))
      .slice(0, 160);
    content.innerHTML = matches.length
      ? '<div class="cpgrid">' + matches.map((item) => button(item[0])).join('') + '</div>'
      : '<p class="cpmsg">' + translate('Aucun emoji trouvé', 'No emoji found') + '</p>';
    return;
  }
  // 🗂️ every section, recents first
  const recents = recentEmojis();
  content.innerHTML = [recents, ...tabs.map((tab) => tab.map((item) => item[0]))]
    .map((list, index) =>
      list.length || index === 0
        ? '<div class="cpsec" id="cpsec' +
          index +
          '">' +
          translate(EMOJI_TABS[index][1], EMOJI_TABS[index][2]) +
          '</div><div class="cpgrid">' +
          (list.length
            ? list.map(button).join('')
            : '<p class="cpmsg">' +
              translate('Vos emojis récents ici', 'Your recent emojis show here') +
              '</p>') +
          '</div>'
        : '',
    )
    .join('');
}

/**
 * `insertEmoji` - Function ✍️
 *
 * Puts an emoji at the caret of the text box (keyboard stays down) and remembers it in the recents.
 *
 * @param { string } emoji - the tapped emoji
 * @returns { void }
 */
function insertEmoji(emoji) {
  const textarea = overlay.querySelector('textarea');
  const caret = Math.min(+(textarea.dataset.caret || textarea.value.length), textarea.value.length);
  if (textarea.value.length + emoji.length > 1000) return;
  textarea.value = textarea.value.slice(0, caret) + emoji + textarea.value.slice(caret);
  textarea.dataset.caret = String(caret + emoji.length);
  textarea.dispatchEvent(new Event('input'));
  textarea.dataset.caret = String(caret + emoji.length);
  // 🕘 newest first, no duplicates, 32 max
  const recents = [emoji, ...recentEmojis().filter((recent) => recent !== emoji)].slice(0, 32);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
}

/**
 * `deleteBeforeCaret` - Function ⌫
 *
 * Deletes the character (a whole emoji, even a family or a flag) before the caret.
 *
 * @returns { void }
 */
function deleteBeforeCaret() {
  const textarea = overlay.querySelector('textarea');
  const caret = Math.min(+(textarea.dataset.caret || textarea.value.length), textarea.value.length);
  if (!caret) return;
  const pieces = splitGraphemes(textarea.value.slice(0, caret));
  const removed = (pieces.pop() || '').length;
  textarea.value = textarea.value.slice(0, caret - removed) + textarea.value.slice(caret);
  textarea.dispatchEvent(new Event('input'));
  textarea.dataset.caret = String(caret - removed);
}

/**
 * `searchGifs` - Function 🎞️
 *
 * Shows GIPHY's trending GIFs, or the results of a search (waits 400 ms after the last key).
 *
 * @param { string } searchText - the search box text ('' = trending)
 * @returns { void }
 */
function searchGifs(searchText) {
  clearTimeout(gifTimer);
  gifTimer = setTimeout(
    async () => {
      const content = overlay && overlay.querySelector('.cpbody');
      if (!content || pickerTab !== 'gif') return;
      // no GIPHY key yet? say so instead of failing 🔑
      if (!/^[A-Za-z0-9]{20,}$/.test(GIPHY_KEY)) {
        content.innerHTML =
          '<p class="cpmsg">' + translate('GIF bientôt disponibles', 'GIFs coming soon') + '</p>';
        return;
      }
      // the GIPHY request: trending or search, safe content (pg-13) 🛡️
      const words = searchText.trim();
      const url =
        'https://api.giphy.com/v1/gifs/' +
        (words ? 'search?q=' + encodeURIComponent(words) + '&' : 'trending?') +
        'api_key=' +
        GIPHY_KEY +
        '&limit=40&rating=pg-13&lang=' +
        (isEnglish() ? 'en' : 'fr');
      try {
        const results = (await (await fetch(url)).json()).data || [];
        if (pickerTab !== 'gif' || !overlay) return;
        // the small animated previews (fixed width 200 px), GIPHY addresses only
        const gifs = results
          .map((result) => result.images && result.images.fixed_width)
          .filter((media) => media && GIF_PATTERN.test(String(media.url)))
          .map((media) => ({ url: String(media.url).split('?')[0] }));
        content.innerHTML = gifs.length
          ? '<div class="cpgifs">' +
            gifs
              .map(
                (media) =>
                  '<button data-gif="' +
                  escapeHtml(media.url) +
                  '"><img src="' +
                  escapeHtml(media.url) +
                  '" alt="GIF" loading="lazy"></button>',
              )
              .join('') +
            '</div>'
          : '<p class="cpmsg">' + translate('Aucun GIF trouvé', 'No GIF found') + '</p>';
      } catch (error) {
        content.innerHTML = '<p class="cpmsg">' + translate('GIF indisponibles', 'GIFs unavailable') + '</p>';
      }
    },
    searchText ? 400 : 0,
  );
}

/**
 * `paintStickers` - Function 🏷️
 *
 * Fills the panel with our stickers (or the ones whose name matches the search).
 *
 * @param { string } searchText - the search box text ('' = all)
 * @returns { void }
 */
function paintStickers(searchText) {
  const content = overlay && overlay.querySelector('.cpbody');
  if (!content) return;
  const words = searchText.trim().toLowerCase();
  const matches = STICKERS.filter((sticker) => !words || sticker.join(' ').toLowerCase().includes(words));
  content.innerHTML = matches.length
    ? '<div class="cpstk">' +
      matches
        .map(
          (sticker) =>
            '<button data-sticker="' +
            sticker[0] +
            '" title="' +
            escapeHtml(translate(sticker[1], sticker[2])) +
            '"><img src="stickers/' +
            sticker[0] +
            '.webp" alt=""></button>',
        )
        .join('') +
      '</div>'
    : '<p class="cpmsg">' + translate('Aucun sticker trouvé', 'No sticker found') + '</p>';
}

/**
 * `sendMedia` - Async Function 🎞️
 *
 * Posts a GIF or a sticker right away (with the reply, if any), then chimes and notifies the team.
 *
 * @param { { gif?: string, sticker?: string } } media - a GIPHY address or one of our sticker slugs
 * @returns { Promise<void> }
 */
async function sendMedia(media) {
  if (!user) return;
  if (media.gif && !GIF_PATTERN.test(media.gif)) return;
  if (media.sticker && !isStickerSlug(media.sticker)) return;
  const newMessage = {
    uid: user.uid,
    name: user.displayName || 'Staff',
    pic: user.photoURL || '',
    text: '',
    ts: serverTimestamp(),
  };
  if (media.gif) newMessage.gif = media.gif;
  if (media.sticker) newMessage.sticker = media.sticker;
  if (replyTo) newMessage.rep = replyTo;
  replyTo = null;
  closePicker();
  paint.done = false;
  paint();
  try {
    const added = await addDoc(collection(firestore, 'chat'), newMessage);
    playChime();
    notifyTeam(added.id);
  } catch (error) {
    errorText = translate('Envoi impossible', 'Could not send');
    paint();
  }
}

// ===== DELETE DIALOG 🗑 ===== //

/**
 * `askDelete` - Function 🗑
 *
 * Shows our own confirm dialog (in the app's theme, not the system one) before deleting one of my messages.
 *
 * @param { string } id - the message id
 * @returns { void }
 */
function askDelete(id) {
  const message = messages.find((candidate) => candidate.id === id);
  // only my own messages can be deleted (Firestore rules 🛡️)
  if (!message || !user || message.uid !== user.uid || document.querySelector('.cdlg')) return;
  // a short preview of the message 👀
  const preview = message.text ? message.text.slice(0, 120) : message.img ? '📷 Photo' : '';
  const dialog = document.createElement('div');
  dialog.className = 'cdlg';
  dialog.innerHTML =
    '<div class="cdlgbox" role="dialog" aria-modal="true"><div class="cdlgic">🗑</div><h3>' +
    translate('Supprimer ce message ?', 'Delete this message?') +
    '</h3><p class="cdlgtx">' +
    translate("Il sera supprimé pour toute l'équipe.", 'It will be deleted for the whole team.') +
    '</p>' +
    (preview ? '<p class="cdlgpv">' + escapeHtml(preview) + '</p>' : '') +
    '<div class="cdlgbt"><button class="btn sec" data-act="cancel">' +
    translate('Annuler', 'Cancel') +
    '</button><button class="btn danger" data-act="delete">' +
    translate('Supprimer', 'Delete') +
    '</button></div></div>';
  // close (with a short fade) 👋
  const closeDialog = () => {
    dialog.classList.add('out');
    setTimeout(() => dialog.remove(), 160);
  };
  dialog.addEventListener('click', (event) => {
    const action = event.target.closest('[data-act]');
    // a tap on the dark backdrop or "Cancel" closes, "Delete" deletes 🗑
    if (event.target === dialog || (action && action.dataset.act === 'cancel')) closeDialog();
    else if (action && action.dataset.act === 'delete') {
      deleteDoc(doc(firestore, 'chat', id)).catch(() => {});
      closeDialog();
    }
  });
  document.body.appendChild(dialog);
}

// ===== PUSH NOTIFICATIONS 📲 ===== //

/**
 * `pushSupported` - Function 📲
 *
 * @returns { boolean } - true when this browser can receive web push (on iPhone: only once added to the home screen)
 */
const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/**
 * `base64ToBytes` - Function 🔢
 *
 * @param { string } base64 - a URL-safe base64 string (the VAPID key)
 * @returns { Uint8Array } - its bytes
 */
const base64ToBytes = (base64) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

/**
 * `deviceKey` - Function 🆔
 *
 * @param { string } endpoint - the push endpoint of this device
 * @returns { string } - a short stable key for it (field name in `push/{uid}.devices`)
 */
const deviceKey = (endpoint) => {
  let hash = 0;
  for (const char of endpoint) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return 'd' + hash.toString(36);
};

/**
 * `currentSubscription` - Async Function 📲
 *
 * @returns { Promise<PushSubscription|null> } - this device's push subscription, if any
 */
async function currentSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * `refreshBell` - Async Function 🔔
 *
 * Shows the bell in the chat header: 🔔 when this phone gets notifications, 🔕 when not.
 *
 * @returns { Promise<void> }
 */
async function refreshBell() {
  const bell = overlay && overlay.querySelector('.cbell');
  if (!bell) return;
  // no push here, or signed out? no bell
  if (!pushSupported() || !user) {
    bell.hidden = true;
    return;
  }
  const isOn = Notification.permission === 'granted' && !!(await currentSubscription());
  bell.hidden = false;
  bell.innerHTML = isOn ? HEADER_ICONS.bell : HEADER_ICONS.bellOff;
  bell.classList.toggle('on', isOn);
}

/**
 * `togglePush` - Async Function 🔔
 *
 * Turns the chat notifications on (permission + push subscription saved in Firestore `push/{uid}`)
 * or off (unsubscribes this phone) for this device.
 *
 * @returns { Promise<void> }
 */
async function togglePush() {
  if (!pushSupported() || !user) return;
  try {
    const existing = await currentSubscription();
    // 🔕 on → off
    if (existing && Notification.permission === 'granted') {
      await setDoc(
        doc(firestore, 'push', user.uid),
        { devices: { [deviceKey(existing.endpoint)]: deleteField() } },
        { merge: true },
      );
      await existing.unsubscribe();
      showToast(translate('Notifications désactivées', 'Notifications turned off'));
    } else {
      // 🔔 off → on: ask the permission (needs this tap 👆)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast(
          translate(
            'Autorisez les notifications dans les réglages du téléphone',
            'Allow notifications in the phone settings',
          ),
        );
      } else {
        const registration = await navigator.serviceWorker.ready;
        const subscription =
          existing ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64ToBytes(VAPID_PUBLIC_KEY),
          }));
        const json = subscription.toJSON();
        // save this device (endpoint + keys) under my uid 🗃️
        await setDoc(
          doc(firestore, 'push', user.uid),
          {
            devices: {
              [deviceKey(json.endpoint)]: {
                endpoint: json.endpoint,
                p256dh: json.keys.p256dh,
                auth: json.keys.auth,
                lang: isEnglish() ? 'en' : 'fr',
                ts: Date.now(),
              },
            },
          },
          { merge: true },
        );
        showToast(translate('Notifications activées 🔔', 'Notifications on 🔔'));
      }
    }
  } catch (error) {
    showToast(translate('Notifications indisponibles', 'Notifications unavailable'));
  }
  refreshBell();
}

/**
 * `showToast` - Function 🍞
 *
 * @param { string } text - a short message shown for 2.5 s at the top of the chat
 * @returns { void }
 */
function showToast(text) {
  if (!overlay) return;
  const toast = document.createElement('div');
  toast.className = 'ctoast';
  toast.textContent = text;
  overlay.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

/**
 * `notifyTeam` - Async Function 📣
 *
 * Asks the push server (`/api/notify` on Vercel) to notify every other teammate of a new message.
 * The server reads the message itself from Firestore with my token, so nobody can fake one 🛡️.
 *
 * @param { string } id - the id of the message I just posted
 * @returns { Promise<void> }
 */
async function notifyTeam(id) {
  try {
    const token = await user.getIdToken();
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ id }),
    });
    // ⚠️ keep a trace when the push server refused (the message itself is already posted)
    if (!response.ok) console.warn('[chat] notify failed', response.status);
  } catch (error) {
    console.warn('[chat] notify unreachable', error);
  }
}

// ===== TEAM ACCESS: APPROVALS 🛂 ===== //
// A Google sign-in alone is not enough to read the chat: the owner (or another admin) approves each
// waiter first. `team/{uid}` = approved ({ role: 'member' | 'admin' }), `requests/{uid}` = waiting.
// The Firestore rules enforce all of this on the server, the screens below only follow it 🔐.

/**
 * `isOwner` - Function 👑
 *
 * @returns { boolean } - true when the signed-in Google account is the owner's (verified email)
 */
const isOwner = () => !!(user && user.emailVerified && user.email === OWNER_EMAIL);

/**
 * `hasChatAccess` - Function 🔑
 *
 * @returns { boolean } - true when I'm an approved member (or an admin) of the team
 */
const hasChatAccess = () => access === 'member' || access === 'admin';

/**
 * `stopAccessWatchers` - Function 🧹
 *
 * Stops my access watcher and the admin watchers (requests & team lists).
 *
 * @returns { void }
 */
function stopAccessWatchers() {
  if (accessUnsubscribe) accessUnsubscribe();
  accessUnsubscribe = null;
  adminUnsubscribers.forEach((stop) => stop());
  adminUnsubscribers = [];
  accessRequests = [];
  teamMembers = [];
}

/**
 * `setAccess` - Function 🔄
 *
 * Saves my new access level and refreshes everything that depends on it.
 *
 * @param { string } newAccess - 'loading' | 'pending' | 'refused' | 'member' | 'admin'
 * @returns { void }
 */
function setAccess(newAccess) {
  const hadAccess = hasChatAccess(),
    wasAdmin = access === 'admin';
  access = newAccess;
  // 👂 the chat itself: start / stop listening when the access opens or closes
  if (hadAccess !== hasChatAccess()) listen();
  // 🛂 the admin lists
  if (wasAdmin !== (access === 'admin')) watchAdminLists();
  paint();
  updateFab();
  renderTeamCard();
}

/**
 * `watchAccess` - Function 👂
 *
 * Follows my own `team/{uid}` doc: approved → member / admin; not there → I ask for access
 * (the owner's account makes itself admin on its first sign-in 👑).
 *
 * @returns { void }
 */
function watchAccess() {
  stopAccessWatchers();
  access = 'loading';
  renderTeamCard();
  if (!user) return;
  accessUnsubscribe = onSnapshot(
    doc(firestore, 'team', user.uid),
    async (snapshot) => {
      // ✅ approved
      if (snapshot.exists()) {
        setAccess(snapshot.data().role === 'admin' ? 'admin' : 'member');
        return;
      }
      // 👑 the owner: add myself as the first admin
      if (isOwner()) {
        try {
          await setDoc(doc(firestore, 'team', user.uid), memberFields(userCard(), 'admin'));
        } catch (error) {
          setAccess('pending');
        }
        return;
      }
      // ⏳ everybody else: ask once, then wait (or see the refusal)
      await askForAccess();
    },
    () => setAccess('pending'),
  );
}

/**
 * `userCard` - Function 🪪
 *
 * @returns { { uid: string, name: string, email: string, pic: string } } - who I am, for a request
 */
const userCard = () => ({
  uid: user.uid,
  name: (user.displayName || 'Staff').slice(0, 100),
  email: user.email || '',
  pic: (user.photoURL || '').slice(0, 500),
});

/**
 * `memberFields` - Function 🧾
 *
 * @param { { name: string, email: string, pic: string } } person - the person to add
 * @param { string } role - 'member' or 'admin'
 * @returns { object } - the `team/{uid}` doc
 */
const memberFields = (person, role) => ({
  name: String(person.name || 'Staff').slice(0, 100),
  email: String(person.email || ''),
  pic: String(person.pic || '').slice(0, 500),
  role,
  by: user.uid,
  ts: serverTimestamp(),
});

/**
 * `askForAccess` - Async Function 🙋
 *
 * Creates my `requests/{uid}` doc (once) and pings the admins; shows "waiting" or "refused".
 *
 * @returns { Promise<void> }
 */
async function askForAccess() {
  try {
    const existing = await getDoc(doc(firestore, 'requests', user.uid));
    // 🚫 an admin already said no
    if (existing.exists() && existing.data().refused) {
      setAccess('refused');
      return;
    }
    setAccess('pending');
    if (existing.exists()) return;
    // 📝 my request (name, email & photo for the admin's list)
    const card = userCard();
    await setDoc(doc(firestore, 'requests', user.uid), {
      name: card.name,
      email: card.email,
      pic: card.pic,
      ts: serverTimestamp(),
    });
    // 📣 tell the admins (push notification)
    const token = await user.getIdToken();
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ request: true }),
    }).catch(() => {});
  } catch (error) {
    setAccess('pending');
  }
}

/**
 * `watchAdminLists` - Function 🛂
 *
 * (Admins only) follows the waiting requests and the team, for the Profil "Équipe" card.
 *
 * @returns { void }
 */
function watchAdminLists() {
  adminUnsubscribers.forEach((stop) => stop());
  adminUnsubscribers = [];
  accessRequests = [];
  teamMembers = [];
  if (access !== 'admin') return;
  // ⏳ the waiting requests (the refused ones stay hidden)
  adminUnsubscribers.push(
    onSnapshot(collection(firestore, 'requests'), (snapshot) => {
      accessRequests = snapshot.docs
        .map((docSnapshot) => ({ ...docSnapshot.data(), uid: docSnapshot.id }))
        .filter((request) => !request.refused);
      renderTeamCard();
      updateFab();
    }),
  );
  // 👥 the team
  adminUnsubscribers.push(
    onSnapshot(collection(firestore, 'team'), (snapshot) => {
      teamMembers = snapshot.docs.map((docSnapshot) => ({ ...docSnapshot.data(), uid: docSnapshot.id }));
      renderTeamCard();
    }),
  );
}

/**
 * `approve` - Async Function ✅
 *
 * (Admins only) lets someone into the team and removes their request.
 *
 * @param { string } uid - the requester's uid
 * @returns { Promise<void> }
 */
async function approve(uid) {
  const request = accessRequests.find((candidate) => candidate.uid === uid);
  if (!request) return;
  try {
    await setDoc(doc(firestore, 'team', uid), memberFields(request, 'member'));
    await deleteDoc(doc(firestore, 'requests', uid));
  } catch (error) {
    alert(translate('Validation impossible', 'Could not approve'));
  }
}

/**
 * `refuse` - Async Function 🚫
 *
 * (Admins only) refuses a request (kept as "refused" so it doesn't come back).
 *
 * @param { string } uid - the requester's uid
 * @returns { Promise<void> }
 */
async function refuse(uid) {
  try {
    await updateDoc(doc(firestore, 'requests', uid), { refused: true });
  } catch (error) {}
}

/**
 * `removeMember` - Async Function ➖
 *
 * (Admins only) removes someone from the team: they lose the chat right away.
 *
 * @param { string } uid - the member's uid
 * @returns { Promise<void> }
 */
async function removeMember(uid) {
  const member = teamMembers.find((candidate) => candidate.uid === uid);
  if (!member || member.email === OWNER_EMAIL || uid === user.uid) return;
  if (
    !confirm(
      translate('Retirer ' + member.name + " de l'équipe ?", 'Remove ' + member.name + ' from the team?'),
    )
  )
    return;
  try {
    await deleteDoc(doc(firestore, 'team', uid));
  } catch (error) {}
}

/**
 * `toggleAdmin` - Async Function 🎖️
 *
 * (Admins only) makes a member an admin, or an admin a member again.
 *
 * @param { string } uid - the member's uid
 * @returns { Promise<void> }
 */
async function toggleAdmin(uid) {
  const member = teamMembers.find((candidate) => candidate.uid === uid);
  if (!member || member.email === OWNER_EMAIL || uid === user.uid) return;
  try {
    await updateDoc(doc(firestore, 'team', uid), { role: member.role === 'admin' ? 'member' : 'admin' });
  } catch (error) {}
}

/**
 * `accessScreenHtml` - Function ⏳
 *
 * @returns { string } - the chat screen for someone not (yet) on the team
 */
function accessScreenHtml() {
  const [icon, text] =
    access === 'refused'
      ? [
          '🚫',
          translate(
            "Votre demande d'accès au chat a été refusée. Parlez-en à votre responsable.",
            'Your request to join the chat was refused. Please talk to your manager.',
          ),
        ]
      : access === 'loading'
        ? ['💬', translate('Chargement…', 'Loading…')]
        : [
            '⏳',
            translate(
              "Demande envoyée ! Le chat s'ouvrira dès qu'un responsable aura validé votre compte.",
              'Request sent! The chat opens as soon as a manager approves your account.',
            ),
          ];
  return (
    '<div class="cempty"><div style="font-size:44px">' +
    icon +
    '</div><p>' +
    text +
    '</p><p class="muted sm">' +
    escapeHtml(user ? user.email : '') +
    '</p></div>'
  );
}

/**
 * `personRowHtml` - Function 👤
 *
 * @param { object } person - a request or a member { uid, name, email, pic, role? }
 * @param { string } buttons - the action buttons (HTML)
 * @returns { string } - one row of the "Équipe" card
 */
function personRowHtml(person, buttons) {
  const avatar = person.pic
    ? '<img src="' +
      escapeHtml(person.pic) +
      '" referrerpolicy="no-referrer" style="width:36px;height:36px;border-radius:50%;flex:none" alt="">'
    : '<div class="av" style="width:36px;height:36px">' + escapeHtml((person.name || '?')[0]) + '</div>';
  return (
    '<div class="row" style="gap:10px;margin:10px 0">' +
    avatar +
    '<div class="grow" style="min-width:0"><div style="font-weight:700">' +
    escapeHtml(person.name || 'Staff') +
    (person.role === 'admin' ? ' 🎖️' : '') +
    '</div><div class="muted sm" style="overflow:hidden;text-overflow:ellipsis">' +
    escapeHtml(person.email || '') +
    '</div></div>' +
    buttons +
    '</div>'
  );
}

/**
 * `teamCardHtml` - Function 👥
 *
 * @returns { string } - the admin's "Équipe" card: waiting requests (approve / refuse) & the team
 */
function teamCardHtml() {
  const smallButton = (action, uid, label, extra) =>
    '<button class="btn' +
    (extra || '') +
    '" data-team="' +
    action +
    '" data-uid="' +
    escapeHtml(uid) +
    '" style="width:auto;padding:6px 10px;margin:0">' +
    label +
    '</button>';
  const requestsHtml = accessRequests.length
    ? accessRequests
        .map((request) =>
          personRowHtml(
            request,
            smallButton('approve', request.uid, '✓') + smallButton('refuse', request.uid, '✕', ' sec'),
          ),
        )
        .join('') +
      (accessRequests.length > 1
        ? '<button class="btn" data-team="approve-all" style="margin-top:6px">' +
          translate('Tout valider', 'Approve all') +
          ' (' +
          accessRequests.length +
          ')</button>'
        : '')
    : '<p class="muted sm">' + translate('Aucune demande en attente.', 'No pending requests.') + '</p>';
  const membersHtml = teamMembers
    .slice()
    .sort((first, second) => String(first.name).localeCompare(String(second.name)))
    .map((member) =>
      personRowHtml(
        member,
        member.email === OWNER_EMAIL || member.uid === user.uid
          ? ''
          : smallButton('admin', member.uid, '🎖️', ' sec') + smallButton('remove', member.uid, '➖', ' sec'),
      ),
    )
    .join('');
  return (
    '<div class="sh">' +
    translate('Équipe', 'Team') +
    '</div><div class="card"><div style="font-weight:700">' +
    translate("Demandes d'accès au chat", 'Chat access requests') +
    (accessRequests.length ? ' · ' + accessRequests.length : '') +
    '</div>' +
    requestsHtml +
    '<div style="font-weight:700;margin-top:14px">' +
    translate('Membres', 'Members') +
    ' · ' +
    teamMembers.length +
    '</div>' +
    membersHtml +
    '<p class="muted sm" style="margin:8px 0 0">' +
    translate(
      '🎖️ = responsable (peut valider les demandes). ➖ retire le membre du chat.',
      '🎖️ = admin (can approve requests). ➖ removes the member from the chat.',
    ) +
    '</p></div>'
  );
}

/**
 * `renderTeamCard` - Function 🎨
 *
 * (Admins only) injects or refreshes the `#teamAdm` card on the Profil screen, right after the
 * Google account card `#gAcc` (cloud.js); removes it for everybody else.
 *
 * @returns { void }
 */
function renderTeamCard() {
  const accountCard = document.getElementById('gAcc');
  let box = document.getElementById('teamAdm');
  // not an admin, or not on Profil? no card
  if (access !== 'admin' || !accountCard) {
    if (box) box.remove();
    return;
  }
  if (!box) {
    box = document.createElement('div');
    box.id = 'teamAdm';
    accountCard.after(box);
    // 👆 the buttons (one listener for the whole card)
    box.addEventListener('click', (event) => {
      const button = event.target.closest('[data-team]');
      if (!button) return;
      const uid = button.dataset.uid;
      const actions = {
        approve: () => approve(uid),
        refuse: () => refuse(uid),
        remove: () => removeMember(uid),
        admin: () => toggleAdmin(uid),
        'approve-all': () => accessRequests.slice().forEach((request) => approve(request.uid)),
      };
      if (actions[button.dataset.team]) actions[button.dataset.team]();
    });
  }
  box.innerHTML = teamCardHtml();
}

// 👂 the app re-renders Profil: put the "Équipe" card back after the account card
new MutationObserver(() => {
  if (access === 'admin' && document.getElementById('gAcc') && !document.getElementById('teamAdm'))
    renderTeamCard();
}).observe(document.documentElement, { childList: true, subtree: true });

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
    hasDot = !!hasUnread() || (access === 'admin' && accessRequests.length > 0);
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
  watchAccess();
  listen();
  paint();
  updateFab();
  refreshBell();
});

// 📲 opened from a chat notification (`?chat=1`): open the chat right away
if (new URLSearchParams(location.search).get('chat') === '1') {
  history.replaceState(history.state, '', location.pathname + location.hash);
  setTimeout(openChat, 300);
}
// 📲 a notification was tapped while the app was already open (message from the service worker)
if ('serviceWorker' in navigator)
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'open-chat') openChat();
  });
