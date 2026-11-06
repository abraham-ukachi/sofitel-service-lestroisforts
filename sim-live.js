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
 * @name: Les Trois Forts - Simulation de service, live card & notification on every page
 * @file: pwa/sim-live.js
 * @type: JavaScript (module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script type="module" src="sim-live.js" (sim.js imports it too: one module, one run)
 *   2+|> (sim.js) import { useLiveKit, liveChanged, rememberGame, mineCode } from './sim-live.js';
 *    -|> useLiveKit({ translate, escapeHtml, icon, clockText, cleanListEntry, api }) starts the card
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 📡 The simulation, seen from every page of the app:
// - 🛎️ a floating card at the top (over every tab) while the team has live online games (`simlist`, exp > now,
//   not ended) or while a solo game of mine can be resumed; a colourful « ping », the newest game's status,
//   one chip per game when there are several; tap = the game (or « Parties en cours »), × hides that set of games
//   for the session (sessionStorage) until a new game appears
// - 🔑 my games on this phone (localStorage `ltf_sim_mine_v1`: list id → code, expiry, host?, left?), written when I
//   create or join a game, pruned once expired or ended: the host (and anyone who played it here) comes back
//   without typing the code, even to a « sur code » game
// - 🔔 the ongoing `ltf-sim` notification after a reload or a reopened app (sim.js owns it while a game is on
//   screen): a saved solo game (`ltf_sim_solo_v1`, written by sim.js) or my active online game (the `sim/{code}`
//   doc read once, the list entry live); never asks for the permission, only shows when it's already granted
// Firebase: nothing new is downloaded, the app (cloud.js / chat.js) already loads the same SDK modules at boot; the
// list is only listened to when someone is signed in, and stops when signed out or after a minute in the background.

// ===== CONSTANTS 🧰 ===== //

// the Firebase JS SDK modules (the same URLs cloud.js & chat.js import, so the browser reuses them) 🔥
const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
const FIREBASE_AUTH_URL = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
const FIREBASE_STORE_URL = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
// my games on this phone (list id → code…) & the saved solo game (written by sim.js) 💾
export const MINE_KEY = 'ltf_sim_mine_v1';
export const SOLO_KEY = 'ltf_sim_solo_v1';
// the games I hid with the × (this session only) 🙈
const HIDE_KEY = 'ltf_simlive_hide_v1';
// the rules allow a list of `simlist` only with limit(20) or less 🛡️
const LIST_LIMIT = 20;
// a game lives 6 hours 🕕
export const GAME_TTL_MS = 6 * 60 * 60 * 1000;
// the service clock: 19:00 → 23:30 at the latest, 1 real minute = 1 service minute × speed 🕰️
const SERVICE_START = 19 * 60;
const HARD_END = 23 * 60 + 30;
const REAL_MS_PER_MINUTE = 60000;
// wait after the page load before touching Firebase (the app's own boot goes first) ⏳
const BOOT_DELAY_MS = 1500;
// stop listening after this long in the background 💤
const HIDDEN_STOP_MS = 60000;
// how often the card & the notification are refreshed while the page is visible 🔄
const REFRESH_MS = 30000;
// re-read a game doc (start time, bookings) at most this often 🗃️
const GAME_DOC_MAX_AGE_MS = 5 * 60000;
// the ongoing notification's tag (the same one sim.js uses) 🔔
const NOTIFY_TAG = 'ltf-sim';
// a list entry id & a game code 🔢
const LIST_ID_PATTERN = /^[A-Za-z0-9]{16,32}$/;
const CODE_PATTERN = /^[0-9]{4}$/;

// ===== STATE 🌱 ===== //

// the helpers & the actions lent by sim.js (see `useLiveKit`) 🧰
let kit = null;

// the live state: Firebase handles, the signed-in user, the list, timers & what the notification shows 📡
const live = {
  booted: false,
  firebase: null,
  user: null,
  deniedUid: '',
  unsubscribe: null,
  entries: [],
  hiddenTimer: 0,
  refreshTimer: 0,
  notified: '',
  gameDocs: {},
};

// ===== HELPERS 🧰 ===== //

/**
 * `readJson` - Function 📖
 *
 * @param { Storage } storage - localStorage or sessionStorage
 * @param { string } key - the key
 * @param { any } fallback - the value when it's missing or broken
 * @returns { any } - the parsed value
 */
function readJson(storage, key, fallback) {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    return value == null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

/**
 * `writeJson` - Function ✍️
 *
 * @param { Storage } storage - localStorage or sessionStorage
 * @param { string } key - the key
 * @param { any } value - the value (stored as JSON)
 * @returns { void }
 */
function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // 🤷 private mode or a full storage: the card simply forgets
  }
}

/**
 * `serviceClock` - Function 🕰️
 *
 * @param { number } anchorMs - when the clock was last set (real ms)
 * @param { number } anchorClock - the service time then (minutes after midnight)
 * @param { number } speed - the clock's speed (×1, ×2, ×5, ×10)
 * @returns { number } - the service time now (never past 23:30)
 */
function serviceClock(anchorMs, anchorClock, speed) {
  return Math.min(HARD_END, anchorClock + ((Date.now() - anchorMs) / REAL_MS_PER_MINUTE) * speed);
}

/**
 * `nextArrival` - Function 🚪
 *
 * @param { Array<number> } times - the bookings' arrival times
 * @param { number } clock - the service time now
 * @returns { number } - the minutes until the next arrival (-1 when nobody else is coming)
 */
function nextArrival(times, clock) {
  const upcoming = times.filter((time) => time > clock);
  return upcoming.length ? Math.ceil(Math.min(...upcoming) - clock) : -1;
}

// ===== MY GAMES ON THIS PHONE 🔑 ===== //

/**
 * `readMine` - Function 🔑
 *
 * @returns { object } - my games { listId: { c: code, e: expires (ms), h: 1 when I host, l: 1 when I left } },
 *   expired and broken ones pruned (and the pruned map saved back)
 */
export function readMine() {
  const saved = readJson(localStorage, MINE_KEY, {});
  const mine = {};
  let pruned = false;
  Object.keys(saved && typeof saved === 'object' ? saved : {}).forEach((listId) => {
    const entry = saved[listId];
    const valid =
      LIST_ID_PATTERN.test(listId) &&
      entry &&
      CODE_PATTERN.test(entry.c) &&
      Number.isFinite(entry.e) &&
      entry.e > Date.now();
    if (valid) mine[listId] = { c: entry.c, e: entry.e, h: entry.h ? 1 : 0, l: entry.l ? 1 : 0 };
    else pruned = true;
  });
  if (pruned) writeJson(localStorage, MINE_KEY, mine);
  return mine;
}

/**
 * `rememberGame` - Function 💾
 *
 * @param { string } listId - the game's « Parties en cours » id
 * @param { string } code - its 4-digit code
 * @param { number } expiresMs - when it expires (ms)
 * @param { boolean } isHost - true when I host it
 * @returns { void } - remembered on this phone (and no longer marked as left)
 */
export function rememberGame(listId, code, expiresMs, isHost) {
  if (!LIST_ID_PATTERN.test(listId || '') || !CODE_PATTERN.test(code || '')) return;
  const mine = readMine();
  mine[listId] = { c: code, e: expiresMs, h: isHost ? 1 : 0, l: 0 };
  writeJson(localStorage, MINE_KEY, mine);
  refreshSoon();
}

/**
 * `forgetGame` - Function 🧹
 *
 * @param { string } listId - a game's « Parties en cours » id
 * @returns { void } - forgets it (it ended)
 */
export function forgetGame(listId) {
  const mine = readMine();
  if (!mine[listId]) return;
  delete mine[listId];
  writeJson(localStorage, MINE_KEY, mine);
  refreshSoon();
}

/**
 * `markLeft` - Function 🚪
 *
 * @param { string } listId - a game's « Parties en cours » id
 * @returns { void } - I left it: the code stays (to come back in a tap), the notification doesn't come back
 */
export function markLeft(listId) {
  const mine = readMine();
  if (!mine[listId]) return;
  mine[listId].l = 1;
  writeJson(localStorage, MINE_KEY, mine);
  refreshSoon();
}

/**
 * `mineCode` - Function 🔑
 *
 * @param { string } listId - a game's « Parties en cours » id
 * @returns { string } - its code when I created or joined it on this phone ('' otherwise)
 */
export function mineCode(listId) {
  const entry = readMine()[listId];
  return entry ? entry.c : '';
}

/**
 * `activeMine` - Function 🎯
 *
 * @returns { { listId: string, code: string, host: boolean } | null } - my newest game still running that I didn't
 *   leave (the one the notification follows and a notification tap rejoins)
 */
export function activeMine() {
  const mine = readMine();
  const ids = Object.keys(mine)
    .filter((listId) => !mine[listId].l)
    .sort((left, right) => mine[right].e - mine[left].e);
  return ids.length ? { listId: ids[0], code: mine[ids[0]].c, host: !!mine[ids[0]].h } : null;
}

// ===== THE SAVED SOLO GAME 💾 ===== //

/**
 * `readSoloSummary` - Function 💾
 *
 * A light look at the solo game sim.js saved (sim.js checks every value again before resuming it).
 *
 * @returns { { clock: number, done: number, total: number, next: number } | null } - the service time now, the
 *   tables done, the tables, the minutes to the next arrival; null when there's none, it's too old or it's over
 *   (a broken or finished save is dropped)
 */
export function readSoloSummary() {
  const saved = readJson(localStorage, SOLO_KEY, null);
  if (!saved) return null;
  const summary = saved.sum || {};
  const numbers = [saved.st, saved.am, saved.ac, saved.sp, summary.d, summary.t];
  const shapeOk =
    saved.v === 1 &&
    numbers.every((value) => Number.isFinite(value)) &&
    Array.isArray(summary.times) &&
    summary.times.every((time) => Number.isFinite(time)) &&
    summary.t > 0 &&
    saved.sp > 0 &&
    saved.sp <= 10;
  const fresh = shapeOk && saved.st <= Date.now() + 60000 && Date.now() - saved.st < GAME_TTL_MS;
  const clock = fresh ? serviceClock(saved.am, saved.ac, saved.sp) : HARD_END;
  if (!fresh || clock >= HARD_END || summary.d >= summary.t) {
    clearSolo();
    return null;
  }
  return { clock, done: summary.d, total: summary.t, next: nextArrival(summary.times, clock) };
}

/**
 * `clearSolo` - Function 🧹
 *
 * @returns { void } - drops the saved solo game (ended, quit, broken or too old)
 */
export function clearSolo() {
  try {
    localStorage.removeItem(SOLO_KEY);
  } catch (error) {
    // 🤷 nothing to drop
  }
  refreshSoon();
}

// ===== THE NOTIFICATION 🔔 ===== //

/**
 * `notifyAllowed` - Function 🔔
 *
 * @returns { boolean } - true when a service-worker notification may be shown (permission already granted: this
 *   module never asks)
 */
function notifyAllowed() {
  return (
    typeof Notification !== 'undefined' && Notification.permission === 'granted' && !!navigator.serviceWorker
  );
}

/**
 * `showNotification` - Function 🔔
 *
 * @param { {title: string, body: string} } text - what to show
 * @returns { void } - shows or replaces the `ltf-sim` notification (silent, only when the text changed)
 */
function showNotification(text) {
  if (!notifyAllowed()) return;
  const signature = text.title + '|' + text.body;
  if (signature === live.notified) return;
  live.notified = signature;
  navigator.serviceWorker.ready
    .then((registration) =>
      registration.showNotification(text.title, {
        tag: NOTIFY_TAG,
        renotify: false,
        silent: true,
        requireInteraction: true,
        body: text.body,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        data: { url: '/#sim' },
      }),
    )
    .catch(() => {});
}

/**
 * `closeNotification` - Function 🔕
 *
 * @returns { void } - closes the notification this module showed (the game ended, expired or was quit)
 */
function closeNotification() {
  if (!live.notified) return;
  live.notified = '';
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.ready
    .then((registration) => registration.getNotifications({ tag: NOTIFY_TAG }))
    .then((notifications) => (notifications || []).forEach((notification) => notification.close()))
    .catch(() => {});
}

/**
 * `soloText` - Function 🔔
 *
 * @param { object } summary - see readSoloSummary
 * @returns { {title: string, body: string} } - « Service · 20:40 » / « Prochaine arrivée dans 6 min · 3/8 tables »
 */
function soloText(summary) {
  return {
    title: kit.translate('Service · ', 'Service · ') + kit.clockText(summary.clock),
    body:
      arrivalText(summary.next) +
      ' · ' +
      kit.translate(
        `${summary.done}/${summary.total} tables terminées`,
        `${summary.done}/${summary.total} tables done`,
      ),
  };
}

/**
 * `arrivalText` - Function 🚪
 *
 * @param { number } minutes - minutes to the next arrival (-1 when none)
 * @returns { string } - « Prochaine arrivée dans 6 min » or « Plus aucune arrivée »
 */
function arrivalText(minutes) {
  if (minutes < 0) return kit.translate('Plus aucune arrivée', 'No more arrivals');
  return kit.translate(`Prochaine arrivée dans ${minutes} min`, `Next arrival in ${minutes} min`);
}

/**
 * `onlineText` - Function 🔔
 *
 * @param { object } mine - my active game (see activeMine)
 * @param { object | null } info - its doc (start, speed, arrival times), when it could be read
 * @param { object | null } entry - its live list entry, when listed
 * @returns { {title: string, body: string} } - the clock (from the doc, else the host's last summary), the next
 *   arrival and the tables done when known, otherwise the status only
 */
function onlineText(mine, info, entry) {
  const started = (info && info.startMs > 0) || (entry && entry.started);
  if (!started)
    return {
      title: kit.translate("Salle d'attente · ", 'Lobby · ') + mine.code,
      body: kit.translate("En attente du lancement par l'hôte", 'Waiting for the host to start'),
    };
  const clock =
    info && info.startMs ? serviceClock(info.startMs, SERVICE_START, info.speed) : entry ? entry.clock : -1;
  const parts = [];
  if (info && info.startMs) parts.push(arrivalText(nextArrival(info.times, clock)));
  if (entry && entry.total)
    parts.push(
      kit.translate(
        `${entry.done}/${entry.total} tables terminées`,
        `${entry.done}/${entry.total} tables done`,
      ),
    );
  return {
    title:
      kit.translate('Service · ', 'Service · ') +
      (clock >= 0 ? kit.clockText(clock) + ' · ' : '') +
      mine.code,
    body: parts.length ? parts.join(' · ') : kit.translate('Service en cours', 'Service in progress'),
  };
}

/**
 * `readGameDoc` - Async Function 🗃️
 *
 * @param { string } code - a game code
 * @returns { Promise<object | null> } - { startMs, speed, times, ended, expired } from `sim/{code}` (read at most
 *   every 5 minutes), or null when it can't be read
 */
async function readGameDoc(code) {
  const cached = live.gameDocs[code];
  if (cached && Date.now() - cached.readAt < GAME_DOC_MAX_AGE_MS) return cached.info;
  if (!live.firebase || !live.user) return null;
  try {
    const store = live.firebase.store;
    const snapshot = await store.getDoc(store.doc(live.firebase.db, 'sim', code));
    const info = snapshot.exists() ? gameInfoOf(snapshot.data()) : { ended: true, expired: true };
    live.gameDocs[code] = { readAt: Date.now(), info };
    return info;
  } catch (error) {
    return null;
  }
}

/**
 * `gameInfoOf` - Function 🧼
 *
 * @param { any } data - a `sim/{code}` document (from the network)
 * @returns { object } - only what the notification needs, checked: start (ms), speed, arrival times, ended, expired
 */
function gameInfoOf(data) {
  /**
   * `millisOf` - Function ⏱️
   *
   * @param { any } value - a Firestore timestamp (or anything)
   * @returns { number } - its milliseconds (0 when it isn't one)
   */
  const millisOf = (value) => (value && typeof value.toMillis === 'function' ? value.toMillis() : 0);
  let times = [];
  let speed = 1;
  try {
    const bookings = JSON.parse(typeof data.bk === 'string' && data.bk.length < 30000 ? data.bk : '[]');
    times = (Array.isArray(bookings) ? bookings : [])
      .slice(0, 10)
      .map((booking) => Number(booking && booking.time))
      .filter((time) => Number.isInteger(time) && time >= SERVICE_START && time <= HARD_END);
    const rangs = JSON.parse(typeof data.rg === 'string' && data.rg.length < 2000 ? data.rg : '{}');
    speed = [1, 2, 5, 10].includes(Number(rangs && rangs.sp)) ? Number(rangs.sp) : 1;
  } catch (error) {
    times = [];
  }
  const createdMs = millisOf(data.at);
  return {
    startMs: millisOf(data.st),
    speed,
    times,
    ended: data.en === true,
    expired: !createdMs || Date.now() - createdMs > GAME_TTL_MS,
  };
}

/**
 * `refreshNotification` - Async Function 🔔
 *
 * After a reload (or with the app reopened): keeps the `ltf-sim` notification of a game I'm part of. sim.js owns
 * it while a game is on screen; otherwise the saved solo game comes first, then my newest online game.
 *
 * @returns { Promise<void> }
 */
async function refreshNotification() {
  if (!kit) return;
  if (kit.api.playing()) {
    // 🎮 a game is on screen: sim.js draws it now (and closes it at the end), forget what was shown here
    live.notified = '';
    return;
  }
  const solo = readSoloSummary();
  if (solo) return showNotification(soloText(solo));
  const mine = activeMine();
  if (!mine) return closeNotification();
  const entry = live.entries.find((item) => item.id === mine.listId) || null;
  if (entry && entry.ended) {
    forgetGame(mine.listId);
    return closeNotification();
  }
  const info = await readGameDoc(mine.code);
  if (info && (info.ended || info.expired)) {
    forgetGame(mine.listId);
    return closeNotification();
  }
  // 🕰️ the service is over (23:30) once the clock can be worked out
  if (info && info.startMs && serviceClock(info.startMs, SERVICE_START, info.speed) >= HARD_END) {
    forgetGame(mine.listId);
    return closeNotification();
  }
  if (!info && !entry) return;
  if (kit.api.playing()) return;
  showNotification(onlineText(mine, info, entry));
}

// ===== THE CARD 🛎️ ===== //

/**
 * `cardItems` - Function 🧾
 *
 * @returns { Array<object> } - what the card shows: my saved solo game (to resume), then the team's live games,
 *   newest first, without the game I'm playing now
 */
function cardItems() {
  const playing = kit.api.playing();
  const items = [];
  const solo = playing && playing.solo ? null : readSoloSummary();
  if (solo) items.push({ id: 'solo', solo: true, summary: solo });
  live.entries
    .filter((entry) => !entry.ended && entry.expMs > Date.now())
    .filter((entry) => !(playing && playing.listId && playing.listId === entry.id))
    .sort((left, right) => right.expMs - left.expMs)
    .forEach((entry) => items.push({ id: entry.id, solo: false, entry }));
  return items;
}

/**
 * `itemStatus` - Function 🚦
 *
 * @param { object } item - a card item
 * @returns { string } - « Partie de Léa — en service 20:40 · 3/8 tables » (or my solo game's status)
 */
function itemStatus(item) {
  if (item.solo)
    return (
      kit.translate('Votre partie solo — en service ', 'Your solo game — in service ') +
      kit.clockText(item.summary.clock) +
      ` · ${item.summary.done}/${item.summary.total} tables · ` +
      kit.translate('Reprendre', 'Resume')
    );
  const entry = item.entry;
  const state = entry.started
    ? kit.translate('en service ', 'in service ') +
      kit.clockText(entry.clock) +
      ` · ${entry.done}/${entry.total} tables`
    : kit.translate("en salle d'attente", 'in the lobby');
  return kit.translate('Partie de ', 'Game by ') + entry.name + ' — ' + state;
}

/**
 * `chipLabel` - Function 🏷️
 *
 * @param { object } item - a card item
 * @returns { string } - a short label for its chip: « Léa · 20:40 · 3/8 » / « Léa · salle d'attente »
 */
function chipLabel(item) {
  if (item.solo) return kit.translate('Solo · ', 'Solo · ') + kit.clockText(item.summary.clock);
  const entry = item.entry;
  return (
    entry.name +
    ' · ' +
    (entry.started
      ? kit.clockText(entry.clock) + ` · ${entry.done}/${entry.total}`
      : kit.translate("salle d'attente", 'lobby'))
  );
}

/**
 * `hiddenIds` - Function 🙈
 *
 * @returns { Array<string> } - the games hidden with the × in this session
 */
function hiddenIds() {
  const saved = readJson(sessionStorage, HIDE_KEY, []);
  return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : [];
}

/**
 * `cardHtml` - Function 🖼️
 *
 * @param { Array<object> } items - the card items (see cardItems)
 * @returns { string } - the ping, the count & the newest game's status, « +N », the × and (several games) chips
 */
function cardHtml(items) {
  const count = items.length;
  const title =
    '🛎️ ' +
    (count > 1
      ? kit.translate(`${count} simulations en cours`, `${count} simulations running`)
      : kit.translate('1 simulation en cours', '1 simulation running'));
  const closeIcon =
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  return (
    `<div class="simliverow"><button class="simlivebody" data-simlive="body" aria-label="${kit.escapeHtml(title)}">` +
    `<span class="simliveping" aria-hidden="true"><i></i><i></i><i></i></span>` +
    `<span class="simlivetext"><b>${kit.escapeHtml(title)}</b>` +
    `<span class="simlivestatus" id="simliveStatus">${kit.escapeHtml(itemStatus(items[0]))}</span></span>` +
    (count > 1 ? `<span class="simlivemore">+${count - 1}</span>` : '') +
    `</button><button class="simliveclose" data-simlive="close" aria-label="${kit.translate('Masquer', 'Hide')}">${closeIcon}</button></div>` +
    (count > 1
      ? `<div class="simlivechips">` +
        items
          .map(
            (item) =>
              `<button class="simlivechip" data-simlive-game="${kit.escapeHtml(item.id)}">${kit.escapeHtml(chipLabel(item))}</button>`,
          )
          .join('') +
        `</div>`
      : '')
  );
}

/**
 * `renderCard` - Function 🖼️
 *
 * Draws (or removes) the floating card, and pushes the page down by its height (body.simlive-on, --simlive-h).
 *
 * @returns { void }
 */
function renderCard() {
  if (!kit || !document.body) return;
  addStyles();
  const items = cardItems();
  const hidden = hiddenIds();
  const visible = items.length > 0 && !items.every((item) => hidden.includes(item.id));
  let card = document.getElementById('simliveCard');
  if (!visible) {
    if (card) card.remove();
    document.body.classList.remove('simlive-on');
    return;
  }
  const html = cardHtml(items);
  if (!card) {
    card = document.createElement('div');
    card.id = 'simliveCard';
    card.className = 'simlivecard';
    card.setAttribute('role', 'region');
    card.addEventListener('click', onCardClick);
    document.body.appendChild(card);
  }
  if (card.dataset.html !== html) {
    card.innerHTML = html;
    card.dataset.html = html;
  }
  card.dataset.ids = items.map((item) => item.id).join(',');
  card.setAttribute('aria-label', kit.translate('Simulations en cours', 'Live simulations'));
  // 📏 room for the card above the content (jsdom has no layout: a sensible height then)
  const height = card.offsetHeight || (items.length > 1 ? 104 : 62);
  document.documentElement.style.setProperty('--simlive-h', height + 10 + 'px');
  document.body.classList.add('simlive-on');
}

/**
 * `onCardClick` - Function 👆
 *
 * @param { MouseEvent } event - a tap on the card
 * @returns { void } - × hides this set of games; a chip opens its game; the body opens the only game (or the list)
 */
function onCardClick(event) {
  const items = cardItems();
  if (event.target.closest('[data-simlive="close"]')) {
    writeJson(sessionStorage, HIDE_KEY, [...new Set(hiddenIds().concat(items.map((item) => item.id)))]);
    return renderCard();
  }
  const chip = event.target.closest('[data-simlive-game]');
  if (chip) return openItem(items.find((item) => item.id === chip.dataset.simliveGame));
  if (!event.target.closest('[data-simlive="body"]')) return;
  if (items.length === 1) return openItem(items[0]);
  kit.api.openDrawer();
}

/**
 * `openItem` - Function 🎯
 *
 * @param { object | undefined } item - a card item
 * @returns { void } - resumes my solo game, or opens the online game (sim.js: direct rejoin or its details)
 */
function openItem(item) {
  if (!item) return;
  if (item.solo) kit.api.resumeSolo();
  else kit.api.openListed(item.entry);
}

// ===== LISTENING 📡 ===== //

/**
 * `loadFirebase` - Async Function 🔥
 *
 * @returns { Promise<boolean> } - true when the app's Firebase app exists (created by cloud.js / chat.js) and the
 *   auth & Firestore modules are ready; nothing is created here
 */
async function loadFirebase() {
  if (live.firebase) return true;
  try {
    const appModule = await import(FIREBASE_APP_URL);
    const app = appModule.getApps()[0];
    if (!app) return false;
    const [authModule, storeModule] = await Promise.all([
      import(FIREBASE_AUTH_URL),
      import(FIREBASE_STORE_URL),
    ]);
    live.firebase = {
      auth: authModule.getAuth(app),
      onAuth: authModule.onAuthStateChanged,
      db: storeModule.getFirestore(app),
      store: storeModule,
    };
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * `subscribe` - Function 👂
 *
 * Listens to the live games (where exp > now, limit 20): only signed in, with the page visible, and not after the
 * rules said no (not an approved team member) for this account.
 *
 * @returns { void }
 */
function subscribe() {
  const user = live.user;
  if (!live.firebase || !user || live.unsubscribe || document.hidden || live.deniedUid === user.uid) return;
  const store = live.firebase.store;
  try {
    const listQuery = store.query(
      store.collection(live.firebase.db, 'simlist'),
      store.where('exp', '>', store.Timestamp.now()),
      store.limit(LIST_LIMIT),
    );
    live.unsubscribe = store.onSnapshot(
      listQuery,
      (snapshot) => {
        const entries = [];
        snapshot.forEach((item) => {
          const entry = kit.cleanListEntry(item.id, item.data());
          if (entry) entries.push(entry);
        });
        live.entries = entries;
        renderCard();
        refreshNotification();
      },
      (error) => {
        // 🛡️ not a team member (or the rules changed): stop until another account signs in
        if (/permission/.test(String((error && error.code) || ''))) live.deniedUid = user.uid;
        unsubscribe();
      },
    );
  } catch (error) {
    unsubscribe();
  }
}

/**
 * `unsubscribe` - Function 🔇
 *
 * @returns { void } - stops listening and forgets the list (the card then only shows a saved solo game)
 */
function unsubscribe() {
  if (live.unsubscribe) live.unsubscribe();
  live.unsubscribe = null;
  live.entries = [];
  renderCard();
}

/**
 * `onAuthChanged` - Function 🔐
 *
 * @param { object | null } user - the signed-in Firebase user (null when signed out)
 * @returns { void } - listens for that user, or stops when signed out
 */
function onAuthChanged(user) {
  const changed = (user && user.uid) !== (live.user && live.user.uid);
  live.user = user || null;
  if (!changed) return;
  unsubscribe();
  live.gameDocs = {};
  if (user) subscribe();
  refreshNotification();
}

/**
 * `onVisibility` - Function 💤
 *
 * @returns { void } - a minute in the background stops the listener; coming back starts it again & refreshes
 */
function onVisibility() {
  clearTimeout(live.hiddenTimer);
  if (document.hidden) {
    live.hiddenTimer = setTimeout(() => {
      if (live.unsubscribe) live.unsubscribe();
      live.unsubscribe = null;
    }, HIDDEN_STOP_MS);
    return;
  }
  subscribe();
  renderCard();
  refreshNotification();
}

/**
 * `refreshSoon` - Function 🔄
 *
 * @returns { void } - redraws the card & updates the notification on the next turn (after a game changed)
 */
function refreshSoon() {
  if (!kit || !live.booted) return;
  setTimeout(() => {
    renderCard();
    refreshNotification();
  }, 0);
}

/**
 * `liveChanged` - Function 🔄
 *
 * @returns { void } - sim.js tells the card a game started, stopped or ended (hide it in play, show it after)
 */
export function liveChanged() {
  refreshSoon();
}

/**
 * `boot` - Async Function 🚀
 *
 * @returns { Promise<void> } - the card & the notification of a saved solo game first (no network), then Firebase
 *   (reused) for the team's games and my online game
 */
async function boot() {
  live.booted = true;
  renderCard();
  refreshNotification();
  clearInterval(live.refreshTimer);
  live.refreshTimer = setInterval(() => {
    if (document.hidden) return;
    renderCard();
    refreshNotification();
  }, REFRESH_MS);
  document.addEventListener('visibilitychange', onVisibility);
  if (!(await loadFirebase())) return;
  live.firebase.onAuth(live.firebase.auth, onAuthChanged);
  if (live.firebase.auth.currentUser) onAuthChanged(live.firebase.auth.currentUser);
}

// ===== STYLES 🎨 ===== //

// the card's look: fixed at the top (safe area), under dialogs & sheets (z 35), pushes the page down 🎨
const LIVE_CSS = `
.simlivecard{position:fixed;left:10px;right:10px;top:calc(6px + env(safe-area-inset-top));z-index:35;max-width:620px;margin:0 auto;
  display:flex;flex-direction:column;gap:6px;padding:6px 6px 6px 4px;border-radius:20px;background:var(--sf2,#1d2a40);color:var(--tx,#fff);
  box-shadow:0 10px 28px rgba(0,0,0,.35);animation:simlivedrop .3s ease-out}
.simliverow{display:flex;align-items:center;gap:4px;min-width:0}
.simlivebody{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:4px 6px;border:0;background:none;color:inherit;
  font:inherit;text-align:left;cursor:pointer}
.simlivetext{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.25}
.simlivetext b{font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.simlivestatus{font-size:12px;color:var(--mu,#aab);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.simlivemore{flex:none;font-size:12px;font-weight:800;padding:3px 9px;border-radius:99px;background:var(--pill,#2b3a55);color:var(--gold,#c9a24b)}
.simliveclose{flex:none;width:36px;height:36px;border-radius:18px;border:0;background:none;color:var(--mu,#aab);display:flex;
  align-items:center;justify-content:center;cursor:pointer}
.simliveping{position:relative;flex:none;width:14px;height:14px;margin:0 6px}
.simliveping i{position:absolute;inset:0;border-radius:50%}
.simliveping i:first-child{background:conic-gradient(#ff5f6d,#ffc371,#47e891,#3bb2ff,#b06bff,#ff5f6d);
  box-shadow:0 0 8px rgba(255,140,120,.7);animation:simlivehue 3s linear infinite}
.simliveping i:nth-child(2),.simliveping i:nth-child(3){border:2px solid #ff5f6d;opacity:0;animation:simlivering 2s ease-out infinite}
.simliveping i:nth-child(3){animation-delay:1s}
@keyframes simlivering{0%{transform:scale(1);opacity:.9;border-color:#ff5f6d}35%{border-color:#ffc371}
  60%{border-color:#47e891}80%{border-color:#3bb2ff}100%{transform:scale(2.8);opacity:0;border-color:#b06bff}}
@keyframes simlivehue{to{filter:hue-rotate(360deg)}}
@keyframes simlivedrop{from{transform:translateY(-16px);opacity:0}}
.simlivechips{display:flex;gap:6px;overflow-x:auto;padding:0 4px 2px 34px;scrollbar-width:none}
.simlivechips::-webkit-scrollbar{display:none}
.simlivechip{flex:none;height:30px;padding:0 12px;border-radius:15px;border:0;background:var(--sf3,#26344d);color:var(--tx,#fff);
  font:inherit;font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer}
body.simlive-on #app{padding-top:calc(env(safe-area-inset-top) + var(--simlive-h,72px))}
body.simlive-on .appbar,body.simlive-on .simbar{top:var(--simlive-h,72px)}
body.simlive-on .sticky{top:calc(64px + var(--simlive-h,72px))}
@media (min-width:960px){body:not(.notabs) .simlivecard{left:calc(248px + 24px);right:24px;max-width:732px}}
@media (prefers-reduced-motion:reduce){.simlivecard,.simliveping i{animation:none}
  .simliveping i:nth-child(2),.simliveping i:nth-child(3){display:none}}
`;

/**
 * `addStyles` - Function 🎨
 *
 * @returns { void } - adds the card's CSS once
 */
function addStyles() {
  if (document.getElementById('simliveStyle')) return;
  const style = document.createElement('style');
  style.id = 'simliveStyle';
  style.textContent = LIVE_CSS;
  document.head.appendChild(style);
}

// ===== START 🚀 ===== //

/**
 * `useLiveKit` - Function 🧰
 *
 * @param { object } helpers - sim.js's helpers (translate, escapeHtml, clockText, cleanListEntry) and its actions
 *   `api`: { playing() → { solo, listId } | null (a game on screen), openListed(entry), openDrawer(), resumeSolo() }
 * @returns { void } - starts the card & the notification once the page has loaded
 */
export function useLiveKit(helpers) {
  kit = helpers;
  if (live.booted) return;
  /**
   * `later` - Function ⏳
   *
   * @returns { void } - boots after the app's own start
   */
  const later = () => setTimeout(boot, BOOT_DELAY_MS);
  if (document.readyState === 'complete') later();
  else addEventListener('load', later, { once: true });
}

/**
 * `liveDebug` - Function 🧪
 *
 * @returns { object } - the card's state (tests only: entries, signed-in uid, listening?, notified text)
 */
export function liveDebug() {
  return {
    entries: live.entries,
    uid: live.user ? live.user.uid : '',
    listening: !!live.unsubscribe,
    notified: live.notified,
  };
}
