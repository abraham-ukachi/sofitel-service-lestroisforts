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
      if (
        !isFirstSnapshot &&
        messages.some((message) => !knownIds.has(message.id) && message.uid !== user.uid)
      )
        playChime();
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
    // ✍️ the text (new lines kept, 1 to 3 emojis alone shown big like WhatsApp 😀)
    (message.text
      ? '<div class="ct' +
        (isEmojiOnly(message.text) ? ' cbig' : '') +
        '">' +
        richText(message.text) +
        '</div>'
      : '') +
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
      (message.img ? '📷 Photo' : message.gif ? '🎞️ GIF' : message.sticker ? '🏷️ Sticker' : '')
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
    const added = await addDoc(collection(firestore, 'chat'), newMessage);
    // 🔔 sent: chime, then ask the push server to notify the team
    playChime();
    notifyTeam(added.id);
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
    '</div><div class="muted sm">Les Trois Forts</div></div><button class="cbell" hidden aria-label="notifications"></button></div>' +
    '<div class="cpin" hidden></div><div class="cbody"></div><div class="cfoot"><div class="crep"></div>' +
    '<div class="cmsug" hidden></div><div class="cquick" hidden></div><div class="cmenu" hidden><label><input type="file" accept="image/*" capture="environment" hidden>📷 ' +
    translate('Appareil photo', 'Camera') +
    '</label><label><input type="file" accept="image/*" hidden>🖼️ ' +
    translate('Photos', 'Photos') +
    '</label></div><div class="cpill"><button class="cemo" aria-label="emoji">' +
    SMILEY_ICON +
    '</button><textarea rows="1" maxlength="1000" enterkeyhint="send" placeholder="' +
    translate('Message…', 'Message…') +
    '"></textarea><button class="cplus" aria-label="photo">+</button></div><div class="cpick" hidden></div></div>';
  addServiceStyles();
  document.body.appendChild(overlay);
  // 🔙 Back (button or gesture) closes the chat
  history.pushState({ chat: 1 }, '');
  overlay.querySelector('.cx').onclick = () => history.back();
  // 🔔 the notifications switch (bell) in the header
  overlay.querySelector('.cbell').onclick = togglePush;
  refreshBell();

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

  // 🍽️ the pinned banner, the quick messages & the @mention suggestions
  wireServiceTools(textarea);

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
  clearTimeout(gifTimer);
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
    '<div class="muted sm">' +
    translate('Touchez pour fermer', 'Tap to close') +
    '</div></div>';
  viewer.onclick = () => viewer.remove();
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
      (message.img ? '📷 Photo' : message.gif ? '🎞️ GIF' : message.sticker ? '🏷️ Sticker' : '')
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

// ===== EMOJI & GIF PANEL 😀 ===== //

// the outline smiley of the composer (like WhatsApp) & the keyboard icon shown while the panel is open
const SMILEY_ICON =
  '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' +
  '<circle cx="12" cy="12" r="9.2"/><path d="M8 14.2c1 1.4 2.3 2.1 4 2.1s3-.7 4-2.1"/>' +
  '<circle cx="9" cy="9.8" r=".6" fill="currentColor"/><circle cx="15" cy="9.8" r=".6" fill="currentColor"/></svg>';
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
  bell.textContent = isOn ? '🔔' : '🔕';
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
