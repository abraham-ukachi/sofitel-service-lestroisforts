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
 * @name: Les Trois Forts - Team Leaderboard
 * @file: pwa/board.js
 * @type: JavaScript (ES module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script type="module" src="board.js"
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🏆 Team leaderboard: who's the best of the approved team, this month and since the start.
// Doc `board/{uid}` = { name, pic, xp, base, month, streak, mastered, right, wrong, exam, days, modes, ts }
// - xp       : all-time XP (the app's progress `ltf_v1`)
// - month    : the month of the last update ("2026-11")
// - base     : the XP at the start of that month, so this month's XP = xp - base
// - days     : the XP earned per day, last 30 days { "2026-11-01": 120 } 📈
// - modes    : the XP earned per activity { quiz: 300, study: 40, ... } (counted since v0.53.0)
// Only approved teammates (`team/{uid}`) can read or write it (see rust/web/firestore.rules 🛡️).

// import the Firebase app helpers (reuse the app `cloud.js` already created) 🔥
import { getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
// import the auth helpers 🔐
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
// import the Firestore helpers 🗃️
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===== FIREBASE 🔥 ===== //

// the Firebase app made by cloud.js (loaded first), its auth & its Firestore database 🚀
const firebaseApp = getApps()[0],
  auth = getAuth(firebaseApp),
  firestore = getFirestore(firebaseApp);

// ===== CONSTANTS & HELPERS 🧰 ===== //

// the localStorage key of the app's progress 🎓
const PROGRESS_KEY = 'ltf_v1';
// the medals of the podium 🥇🥈🥉
const MEDALS = ['🥇', '🥈', '🥉'];
// the localStorage key of my XP history (per day & per activity) 📈
const ACTIVITY_KEY = 'ltf_board_v1';
// the activities we count, by app screen (`.scr-<view>`), with their French & English names 🎮
const ACTIVITIES = {
  quiz: ['Quiz', 'Quiz'],
  study: ['Flashcards', 'Flashcards'],
  chrono: ['Chrono', 'Time trial'],
  exam: ['Examen', 'Exam'],
  review: ['Erreurs', 'Mistakes'],
  revise: ['Révisions', 'Revision'],
  games: ['Autres jeux', 'Other games'],
};
// the biggest XP jump one save can bring (bigger = a cloud restore, not a game) 🛑
const MAX_XP_PER_SAVE = 400;
// how many days of history we keep & how many the chart shows 🗓️
const DAYS_KEPT = 30;
const DAYS_SHOWN = 14;
// a Google profile photo address (the only pictures we put in the page) 🖼️
const SAFE_PICTURE_PATTERN = /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\/[^"<> ]*$/;

/**
 * `readProgress` - Function 🎓
 *
 * @returns { object } - the app's progress { xp, streak, m, lang, ... } (empty object when unreadable)
 */
const readProgress = () => {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') || {};
  } catch (error) {
    return {};
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
const translate = (fr, en) => (readProgress().lang === 'en' ? en : fr);

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

/**
 * `wholeNumber` - Function 🔢
 *
 * @param { any } value - a number from the database or the progress
 * @returns { number } - the value as a whole number >= 0 (0 when it isn't a number)
 */
const wholeNumber = (value) => (Number.isFinite(+value) && +value > 0 ? Math.floor(+value) : 0);

/**
 * `currentMonth` - Function 📅
 *
 * @returns { string } - this month on the phone's clock, like "2026-11"
 */
const currentMonth = () => {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
};

/**
 * `dayKey` - Function 📅
 *
 * @param { Date } [date] - a day (today when empty)
 * @returns { string } - that day on the phone's clock, like "2026-11-01"
 */
const dayKey = (date) => {
  const day = date || new Date();
  return (
    day.getFullYear() +
    '-' +
    String(day.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(day.getDate()).padStart(2, '0')
  );
};

/**
 * `lastDays` - Function 🗓️
 *
 * @param { number } count - how many days
 * @returns { Array<Date> } - the last `count` days, oldest first, today last
 */
const lastDays = (count) =>
  Array.from({ length: count }, (unused, index) => {
    const day = new Date();
    day.setHours(12, 0, 0, 0);
    day.setDate(day.getDate() - (count - 1 - index));
    return day;
  });

/**
 * `monthName` - Function 🗓️
 *
 * @returns { string } - this month's name in the app's language ("novembre", "November")
 */
const monthName = () =>
  new Date().toLocaleDateString(readProgress().lang === 'en' ? 'en-GB' : 'fr-FR', { month: 'long' });

// ===== STATE 📦 ===== //

// the signed-in Google user (or null) 👤
let user = null;
// true once Firestore let us read the board (= approved teammate) ✅
let isTeamMember = false;
// the board docs { uid, name, pic, xp, base, month, streak, mastered } 🏆
let boardEntries = [];
// the uids of the approved team (to hide people who were removed) 👥
let teamUids = null;
// the Firestore listeners to stop on sign-out 🔌
let unsubscribers = [];
// the open leaderboard screen (or null) & its tab ('month' | 'all') 📺
let overlay = null;
let currentTab = 'month';
// the debounce timer of the board upload ⏱️
let publishTimer = null;
// the teammate drawer (or null), and true while we close it ourselves through history 🪟
let drawer = null;
let ignoreNextPop = false;
// my XP at the last progress save (to count what each save brings) 🔢
let lastKnownXp = wholeNumber(readProgress().xp);

// ===== PUBLISH MY SCORE ⬆️ ===== //

/**
 * `masteredCount` - Function 🎯
 *
 * @param { object } progress - the app's progress
 * @returns { number } - how many cards are mastered (answered right 3 times in a row or more)
 */
function masteredCount(progress) {
  return Object.values(progress.m || {}).filter((stats) => stats && stats.s >= 3).length;
}

/**
 * `answerTotals` - Function ✅
 *
 * @param { object } progress - the app's progress
 * @returns { { right: number, wrong: number } } - every right & wrong answer so far
 */
function answerTotals(progress) {
  return Object.values(progress.m || {}).reduce(
    (totals, stats) => ({
      right: totals.right + wholeNumber(stats && stats.c),
      wrong: totals.wrong + wholeNumber(stats && stats.w),
    }),
    { right: 0, wrong: 0 },
  );
}

/**
 * `cleanCounts` - Function 🧹
 *
 * @param { any } counts - a { key: number } map from the phone or the database
 * @param { RegExp | object } allowed - a key pattern, or an object whose keys are allowed
 * @returns { object } - only the allowed keys, with whole numbers
 */
function cleanCounts(counts, allowed) {
  const cleaned = {};
  Object.entries(counts && typeof counts === 'object' ? counts : {}).forEach(([key, value]) => {
    const isAllowed = allowed instanceof RegExp ? allowed.test(key) : Object.hasOwn(allowed, key);
    if (isAllowed && wholeNumber(value)) cleaned[key] = wholeNumber(value);
  });
  return cleaned;
}

// a day key like "2026-11-01" 📅
const DAY_PATTERN = /^20[0-9]{2}-[01][0-9]-[0-3][0-9]$/;

/**
 * `readActivity` - Function 📈
 *
 * @returns { { days: object, modes: object } } - my XP per day (last 30 days) & per activity
 */
function readActivity() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '{}') || {};
  } catch (error) {}
  // keep only the last 30 days 🧹
  const oldestKept = dayKey(lastDays(DAYS_KEPT)[0]);
  const days = cleanCounts(saved.days, DAY_PATTERN);
  Object.keys(days).forEach((key) => key < oldestKept && delete days[key]);
  return { days: days, modes: cleanCounts(saved.modes, ACTIVITIES) };
}

/**
 * `writeActivity` - Function 💾
 *
 * @param { { days: object, modes: object } } activity - my XP history
 * @returns { void }
 */
function writeActivity(activity) {
  previousSetItem.call(localStorage, ACTIVITY_KEY, JSON.stringify(activity));
}

/**
 * `currentActivity` - Function 🎮
 *
 * @returns { string } - the activity on screen right now (from the app's `.scr-<view>` class)
 */
function currentActivity() {
  const screen = document.querySelector('.scr');
  const match = screen && /\bscr-([a-z]+)/.exec(screen.className);
  return match && Object.hasOwn(ACTIVITIES, match[1]) ? match[1] : 'games';
}

/**
 * `countXp` - Function ➕
 *
 * Adds the XP a progress save brought to today & to the activity on screen.
 *
 * @param { string } progressJson - the progress the app just saved
 * @returns { void }
 */
function countXp(progressJson) {
  let experience = lastKnownXp;
  try {
    experience = wholeNumber(JSON.parse(progressJson || '{}').xp);
  } catch (error) {}
  const gained = experience - lastKnownXp;
  lastKnownXp = experience;
  // nothing won, or a cloud restore (a big jump)? nothing to count
  if (gained <= 0 || gained > MAX_XP_PER_SAVE) return;
  const activity = readActivity(),
    today = dayKey(),
    mode = currentActivity();
  activity.days[today] = (activity.days[today] || 0) + gained;
  activity.modes[mode] = (activity.modes[mode] || 0) + gained;
  writeActivity(activity);
}

/**
 * `mergeCounts` - Function 🔀
 *
 * @param { object } local - the counts of this phone
 * @param { object } remote - the counts saved online (another phone)
 * @returns { object } - the biggest count of both, key by key
 */
function mergeCounts(local, remote) {
  const merged = { ...remote };
  Object.entries(local).forEach(([key, value]) => (merged[key] = Math.max(value, merged[key] || 0)));
  return merged;
}

/**
 * `publish` - Async Function ⬆️
 *
 * Writes my XP, streak & mastered cards to `board/{uid}`. A new month starts from my XP of the
 * last update (`base`), so this month's XP only counts what I earned this month.
 *
 * @returns { Promise<void> }
 */
async function publish() {
  // not signed in? nothing to share
  if (!user) return;
  const progress = readProgress(),
    experience = wholeNumber(progress.xp),
    month = currentMonth(),
    boardRef = doc(firestore, 'board', user.uid);
  try {
    // my previous entry (if any) 🗂️
    const previousSnapshot = await getDoc(boardRef);
    const previous = previousSnapshot.exists() ? previousSnapshot.data() : null;
    // the XP at the start of this month: same month = keep it, new month = my last known XP, first time = 0
    let base = previous
      ? previous.month === month
        ? wholeNumber(previous.base)
        : wholeNumber(previous.xp)
      : 0;
    // the progress was reset on this phone? never go below zero
    base = Math.min(base, experience);
    // my XP history, merged with the online copy (signed in on another phone too?) 🔀
    const localActivity = readActivity();
    const activity = {
      days: mergeCounts(localActivity.days, previous ? cleanCounts(previous.days, DAY_PATTERN) : {}),
      modes: mergeCounts(localActivity.modes, previous ? cleanCounts(previous.modes, ACTIVITIES) : {}),
    };
    const oldestKept = dayKey(lastDays(DAYS_KEPT)[0]);
    Object.keys(activity.days).forEach((key) => key < oldestKept && delete activity.days[key]);
    writeActivity(activity);
    const totals = answerTotals(progress);
    const entry = {
      name: (user.displayName || 'Staff').slice(0, 60),
      pic: SAFE_PICTURE_PATTERN.test(user.photoURL || '') ? user.photoURL : '',
      xp: experience,
      base: base,
      month: month,
      streak: wholeNumber(progress.streak),
      mastered: masteredCount(progress),
      right: totals.right,
      wrong: totals.wrong,
      exam: Math.min(100, wholeNumber(progress.exam && progress.exam.score)),
      days: activity.days,
      modes: activity.modes,
    };
    // nothing changed? don't write again 🧹
    if (previous) {
      const { ts, ...previousEntry } = previous;
      const sameEntry = Object.keys(entry).every(
        (key) => JSON.stringify(entry[key]) === JSON.stringify(previousEntry[key]),
      );
      if (sameEntry && Object.keys(previousEntry).length === Object.keys(entry).length) return;
    }
    await setDoc(boardRef, { ...entry, ts: serverTimestamp() });
  } catch (error) {
    // not on the team (yet) or offline: try again next time 📴
  }
}

/**
 * `schedulePublish` - Function ⏱️
 *
 * Uploads my score 4 s after the last progress save (so a quiz doesn't write 20 times).
 *
 * @returns { void }
 */
function schedulePublish() {
  clearTimeout(publishTimer);
  publishTimer = setTimeout(publish, 4000);
}

// 👂 the app saves its progress: schedule an upload (chained after cloud.js's own hook)
const previousSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function (key, value) {
  // always do the real write first
  previousSetItem.call(this, key, value);
  if (this !== localStorage || key !== PROGRESS_KEY) return;
  // ➕ count what this save brought (per day & activity), then share it
  countXp(value);
  if (user) schedulePublish();
};

// 🙈 the app goes to the background: send the pending score right away
addEventListener('visibilitychange', () => {
  if (document.hidden && publishTimer) {
    clearTimeout(publishTimer);
    publishTimer = null;
    publish();
  }
});

// ===== READ THE BOARD 📥 ===== //

/**
 * `listen` - Function 👂
 *
 * Follows the board and the team (members only: Firestore refuses everybody else).
 *
 * @returns { void }
 */
function listen() {
  unsubscribers.forEach((stop) => stop());
  unsubscribers = [];
  boardEntries = [];
  teamUids = null;
  isTeamMember = false;
  refreshHomeButton();
  if (!user) return;
  // 🏆 every score
  unsubscribers.push(
    onSnapshot(
      collection(firestore, 'board'),
      (snapshot) => {
        isTeamMember = true;
        boardEntries = snapshot.docs.map((docSnapshot) => ({ ...docSnapshot.data(), uid: docSnapshot.id }));
        repaint();
      },
      () => {
        // 🚫 not approved (yet): no leaderboard, ask again in a minute (an admin may approve me meanwhile)
        isTeamMember = false;
        repaint();
        setTimeout(() => user && !isTeamMember && listen(), 60000);
      },
    ),
  );
  // 👥 the team (someone removed from the team leaves the board too)
  unsubscribers.push(
    onSnapshot(
      collection(firestore, 'team'),
      (snapshot) => {
        teamUids = new Set(snapshot.docs.map((docSnapshot) => docSnapshot.id));
        repaint();
      },
      () => {},
    ),
  );
}

/**
 * `rankedEntries` - Function 🏅
 *
 * @param { string } tab - 'month' (this month's XP) or 'all' (all-time XP)
 * @returns { Array<object> } - the teammates sorted best first, each with its `score`
 */
function rankedEntries(tab) {
  const month = currentMonth();
  return boardEntries
    .filter((entry) => !teamUids || teamUids.has(entry.uid) || (user && entry.uid === user.uid))
    .map((entry) => ({
      ...entry,
      score:
        tab === 'all'
          ? wholeNumber(entry.xp)
          : entry.month === month
            ? Math.max(0, wholeNumber(entry.xp) - wholeNumber(entry.base))
            : 0,
    }))
    .sort(
      (first, second) =>
        second.score - first.score ||
        wholeNumber(second.xp) - wholeNumber(first.xp) ||
        String(first.name).localeCompare(String(second.name)),
    );
}

/**
 * `myPosition` - Function 📍
 *
 * @param { string } tab - 'month' or 'all'
 * @returns { number } - my place (1 = first), or 0 when I'm not on the board yet
 */
function myPosition(tab) {
  if (!user) return 0;
  return rankedEntries(tab).findIndex((entry) => entry.uid === user.uid) + 1;
}

// ===== THE HOME BUTTON 🏠 ===== //

/**
 * `refreshHomeButton` - Function 🏆
 *
 * Puts the "Classement de l'équipe" row right under the rank card of the home screen (teammates only).
 *
 * @returns { void }
 */
function refreshHomeButton() {
  const rankCard = document.querySelector('.rankc');
  let button = document.getElementById('boardBtn');
  // not on the home screen, or not on the team? no button
  if (!rankCard || !isTeamMember) {
    if (button) button.remove();
    return;
  }
  if (!button) {
    button = document.createElement('button');
    button.id = 'boardBtn';
    button.className = 'li';
    button.onclick = openBoard;
    rankCard.after(button);
  }
  const position = myPosition('month');
  const html =
    '<div class="av" style="font-size:24px">🏆</div><div class="tx"><div class="n">' +
    translate("Classement de l'équipe", 'Team leaderboard') +
    '</div><div class="muted">' +
    (position
      ? translate(
          'Vous êtes #' + position + ' en ' + monthName(),
          "You're #" + position + ' in ' + monthName(),
        )
      : translate('Qui est le meilleur ce mois-ci ?', "Who's the best this month?")) +
    '</div></div><div class="muted" style="font-size:20px">›</div>';
  // only touch the DOM when something changes (the MutationObserver below watches the page) 🧹
  if (button.innerHTML !== html) button.innerHTML = html;
}

// ===== THE LEADERBOARD SCREEN 📺 ===== //

/**
 * `avatarHtml` - Function 👤
 *
 * @param { object } entry - a board entry
 * @param { number } size - the avatar size in px
 * @returns { string } - the Google photo, or the first letter of the name
 */
function avatarHtml(entry, size) {
  return SAFE_PICTURE_PATTERN.test(entry.pic || '')
    ? '<img src="' +
        escapeHtml(entry.pic) +
        '" referrerpolicy="no-referrer" alt="" style="width:' +
        size +
        'px;height:' +
        size +
        'px;border-radius:50%;object-fit:cover;flex:none">'
    : '<div class="av" style="width:' +
        size +
        'px;height:' +
        size +
        'px;border-radius:50%;flex:none">' +
        escapeHtml(String(entry.name || '?')[0]) +
        '</div>';
}

/**
 * `podiumHtml` - Function 🥇
 *
 * @param { Array<object> } ranked - the sorted teammates
 * @returns { string } - the top 3 as a podium (2nd, 1st, 3rd)
 */
function podiumHtml(ranked) {
  const top = ranked.slice(0, 3);
  if (!top.length) return '';
  // the podium order: 2nd on the left, 1st in the middle (higher), 3rd on the right
  const order = [1, 0, 2].filter((index) => top[index]);
  return (
    '<div style="display:flex;justify-content:center;align-items:flex-end;gap:10px;margin:8px 0 18px">' +
    order
      .map((index) => {
        const entry = top[index],
          isFirst = index === 0;
        return (
          '<div style="flex:1;max-width:120px;text-align:center">' +
          '<div style="display:flex;justify-content:center;margin-bottom:6px">' +
          avatarHtml(entry, isFirst ? 64 : 50) +
          '</div><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          escapeHtml(String(entry.name || 'Staff').split(' ')[0]) +
          '</div><div class="muted sm">' +
          entry.score +
          ' XP</div><div class="card" style="margin:6px 0 0;padding:' +
          (isFirst ? '22px' : '12px') +
          ' 0;font-size:26px">' +
          MEDALS[index] +
          '</div></div>'
        );
      })
      .join('') +
    '</div>'
  );
}

/**
 * `rowHtml` - Function 📋
 *
 * @param { object } entry - a ranked teammate
 * @param { number } position - its place (1 = first)
 * @returns { string } - one row of the list: place, photo, name, streak & mastered cards, XP
 */
function rowHtml(entry, position) {
  const isMe = user && entry.uid === user.uid;
  return (
    '<button class="li" data-person="' +
    escapeHtml(entry.uid) +
    '" style="text-align:left' +
    (isMe ? ';outline:2px solid var(--gold)' : '') +
    '"><div style="width:26px;text-align:center;font-weight:800">' +
    (MEDALS[position - 1] || position) +
    '</div>' +
    avatarHtml(entry, 40) +
    '<div class="tx"><div class="n">' +
    escapeHtml(entry.name || 'Staff') +
    (isMe ? ' · ' + translate('vous', 'you') : '') +
    '</div><div class="muted sm">🔥 ' +
    wholeNumber(entry.streak) +
    ' ' +
    translate('j', 'd') +
    ' · 🎯 ' +
    wholeNumber(entry.mastered) +
    ' ' +
    translate('maîtrisées', 'mastered') +
    '</div></div><div style="font-weight:800;color:var(--gold)">' +
    entry.score +
    ' XP</div></button>'
  );
}

/**
 * `boardHtml` - Function 🏆
 *
 * @returns { string } - the body of the leaderboard screen for the current tab
 */
function boardHtml() {
  const ranked = rankedEntries(currentTab);
  const tabsHtml =
    '<div class="chips" style="justify-content:center;margin-bottom:6px">' +
    '<button class="chip' +
    (currentTab === 'month' ? ' on' : '') +
    '" data-tab="month">' +
    translate('Ce mois', 'This month') +
    '</button><button class="chip' +
    (currentTab === 'all' ? ' on' : '') +
    '" data-tab="all">' +
    translate('Depuis toujours', 'All-time') +
    '</button></div>';
  const subtitle =
    '<p class="muted sm" style="text-align:center;margin:0 0 6px">' +
    (currentTab === 'month'
      ? translate(
          'XP gagnés en ' + monthName() + ' · remise à zéro le 1er du mois',
          'XP earned in ' + monthName() + ' · resets on the 1st',
        )
      : translate('Tous les XP depuis le début', 'Every XP since the start')) +
    '</p>';
  if (!ranked.length)
    return (
      tabsHtml +
      '<div class="cempty"><div style="font-size:44px">🏆</div><p>' +
      translate(
        "Personne au classement pour l'instant. Faites un quiz pour ouvrir le bal !",
        'Nobody on the board yet. Play a quiz to get it started!',
      ) +
      '</p></div>'
    );
  return (
    tabsHtml +
    subtitle +
    podiumHtml(ranked) +
    ranked.map((entry, index) => rowHtml(entry, index + 1)).join('') +
    '<p class="muted sm" style="text-align:center;margin:14px 0 4px">' +
    translate(
      'Touchez un nom pour voir comment il a gagné ses XP.',
      'Tap a name to see how they earned their XP.',
    ) +
    '</p>'
  );
}

/**
 * `openBoard` - Function 📺
 *
 * Opens the full-screen leaderboard (same look as the team chat), Back closes it.
 *
 * @returns { void }
 */
function openBoard() {
  // already open?
  if (overlay) return;
  // send my latest score first, so I see my real place ⬆️
  publish();
  overlay = document.createElement('div');
  overlay.className = 'chatov';
  overlay.innerHTML =
    '<div class="sch"><button class="cx" aria-label="close">←</button><div class="grow"><div style="font-weight:700">' +
    translate("Classement de l'équipe", 'Team leaderboard') +
    '</div><div class="muted sm">Les Trois Forts</div></div></div>' +
    '<div class="cbody" style="display:block;padding:14px"></div>';
  document.body.appendChild(overlay);
  // 🔙 Back (button or gesture) closes it
  history.pushState({ board: 1 }, '');
  overlay.querySelector('.cx').onclick = () => history.back();
  // 👆 the tabs
  overlay.querySelector('.cbody').addEventListener('click', (event) => {
    // 👤 a teammate: open their drawer
    const personButton = event.target.closest('[data-person]');
    if (personButton) return openPerson(personButton.dataset.person);
    const tabButton = event.target.closest('[data-tab]');
    if (!tabButton) return;
    currentTab = tabButton.dataset.tab === 'all' ? 'all' : 'month';
    repaint();
  });
  repaint();
}

// 🔙 Back while the leaderboard is open: close it (and keep the app's router out of it)
addEventListener(
  'popstate',
  (event) => {
    // nothing of ours is open? the app's router handles it
    if (!overlay && !drawer && !ignoreNextPop) return;
    event.stopImmediatePropagation();
    // we went back ourselves (the drawer was swiped away)? nothing else to close
    if (ignoreNextPop) {
      ignoreNextPop = false;
      return;
    }
    // the teammate drawer is open? close it first, the leaderboard (if open) stays
    if (drawer) {
      closeDrawer();
      return;
    }
    overlay.remove();
    overlay = null;
  },
  true,
);

/**
 * `repaint` - Function 🎨
 *
 * Refreshes the open leaderboard (if any) and the home button.
 *
 * @returns { void }
 */
function repaint() {
  if (overlay) {
    // left the team while it was open? close it
    if (!isTeamMember) {
      history.back();
      return;
    }
    overlay.querySelector('.cbody').innerHTML = boardHtml();
    // the open drawer follows the live data too
    const entry = drawer && boardEntries.find((candidate) => candidate.uid === drawer.dataset.uid);
    if (entry) drawer.querySelector('.sbody').innerHTML = personHtml(entry);
  }
  refreshHomeButton();
}

// ===== THE TEAMMATE DRAWER 🪟 ===== //

/**
 * `chartHtml` - Function 📊
 *
 * @param { object } days - the XP per day { "2026-11-01": 120 }
 * @returns { string } - an SVG bar chart of the last 14 days (today in gold, the best day labelled)
 */
function chartHtml(days) {
  const shownDays = lastDays(DAYS_SHOWN),
    values = shownDays.map((day) => wholeNumber(days[dayKey(day)])),
    best = Math.max(...values),
    width = 320,
    height = 150,
    chartTop = 22,
    chartBottom = 124,
    slot = width / DAYS_SHOWN,
    barWidth = slot * 0.62,
    locale = readProgress().lang === 'en' ? 'en-GB' : 'fr-FR';
  const bars = values
    .map((value, index) => {
      const barHeight = best ? Math.max(value ? 4 : 0, ((chartBottom - chartTop) * value) / best) : 0,
        left = index * slot + (slot - barWidth) / 2,
        isToday = index === DAYS_SHOWN - 1,
        dayLetter = shownDays[index].toLocaleDateString(locale, { weekday: 'narrow' });
      return (
        // the empty track, then the bar
        '<rect x="' +
        left.toFixed(1) +
        '" y="' +
        chartTop +
        '" width="' +
        barWidth.toFixed(1) +
        '" height="' +
        (chartBottom - chartTop) +
        '" rx="5" fill="currentColor" opacity="0.07"/>' +
        (barHeight
          ? '<rect x="' +
            left.toFixed(1) +
            '" y="' +
            (chartBottom - barHeight).toFixed(1) +
            '" width="' +
            barWidth.toFixed(1) +
            '" height="' +
            barHeight.toFixed(1) +
            '" rx="5" fill="var(--gold)" opacity="' +
            (isToday ? '1' : '0.62') +
            '"/>'
          : '') +
        // the best day gets its value on top 🏅
        (value && value === best
          ? '<text x="' +
            (left + barWidth / 2).toFixed(1) +
            '" y="' +
            (chartBottom - barHeight - 6).toFixed(1) +
            '" text-anchor="middle" font-size="11" font-weight="700" fill="var(--gold)">' +
            value +
            '</text>'
          : '') +
        '<text x="' +
        (left + barWidth / 2).toFixed(1) +
        '" y="142" text-anchor="middle" font-size="10" fill="currentColor" opacity="' +
        (isToday ? '1' : '0.55') +
        '">' +
        escapeHtml(dayLetter) +
        '</text>'
      );
    })
    .join('');
  return (
    '<svg viewBox="0 0 ' +
    width +
    ' ' +
    height +
    '" width="100%" role="img" aria-label="XP">' +
    bars +
    '</svg>'
  );
}

/**
 * `statHtml` - Function 🔢
 *
 * @param { string } label - what the number is
 * @param { string } value - the number (already formatted)
 * @returns { string } - one tile of the stats grid
 */
function statHtml(label, value) {
  return (
    '<div class="card" style="margin:0;padding:10px 12px"><div style="font-weight:800;font-size:18px">' +
    value +
    '</div><div class="muted sm">' +
    label +
    '</div></div>'
  );
}

/**
 * `sourcesHtml` - Function 🎮
 *
 * @param { object } entry - a board entry
 * @returns { string } - where the XP came from, one bar per activity (+ the XP from before the tracking)
 */
function sourcesHtml(entry) {
  const modes = cleanCounts(entry.modes, ACTIVITIES),
    total = wholeNumber(entry.xp),
    tracked = Object.values(modes).reduce((sum, value) => sum + value, 0),
    english = readProgress().lang === 'en';
  const rows = Object.entries(modes)
    .sort((first, second) => second[1] - first[1])
    .map(([key, value]) => [ACTIVITIES[key][english ? 1 : 0], value]);
  // the XP earned before v0.53.0 (no details for those) 🕰️
  if (total > tracked) rows.push([translate('Avant le suivi', 'Before tracking'), total - tracked]);
  if (!rows.length) return '<p class="muted sm">' + translate('Pas encore de XP.', 'No XP yet.') + '</p>';
  return rows
    .map(
      ([label, value]) =>
        '<div style="margin:10px 0"><div class="row" style="justify-content:space-between"><span>' +
        escapeHtml(label) +
        '</span><b>' +
        value +
        ' XP · ' +
        Math.round((100 * value) / Math.max(1, total, tracked)) +
        ' %</b></div><div class="bar" style="margin-top:6px"><i style="width:' +
        Math.round((100 * value) / Math.max(1, total, tracked)) +
        '%"></i></div></div>',
    )
    .join('');
}

/**
 * `personHtml` - Function 👤
 *
 * @param { object } entry - a board entry
 * @returns { string } - the drawer body: who, the 14-day chart, the stats & where the XP came from
 */
function personHtml(entry) {
  const allTime = rankedEntries('all'),
    allTimePosition = allTime.findIndex((candidate) => candidate.uid === entry.uid) + 1,
    month = currentMonth(),
    monthXp = entry.month === month ? Math.max(0, wholeNumber(entry.xp) - wholeNumber(entry.base)) : 0,
    right = wholeNumber(entry.right),
    answered = right + wholeNumber(entry.wrong),
    days = cleanCounts(entry.days, DAY_PATTERN),
    twoWeeks = lastDays(DAYS_SHOWN).reduce((sum, day) => sum + wholeNumber(days[dayKey(day)]), 0),
    isMe = user && entry.uid === user.uid;
  return (
    // 👤 who
    '<div class="row" style="gap:12px;margin:4px 0 14px">' +
    avatarHtml(entry, 54) +
    '<div class="grow" style="min-width:0"><div style="font-weight:800;font-size:19px">' +
    escapeHtml(entry.name || 'Staff') +
    (isMe ? ' · ' + translate('vous', 'you') : '') +
    '</div><div class="muted">' +
    (allTimePosition
      ? (MEDALS[allTimePosition - 1] || '#' + allTimePosition) +
        ' ' +
        translate('au classement général', 'all-time')
      : escapeHtml(rankName()) + ' · ' + translate('pas encore au classement', 'not on the board yet')) +
    '</div></div><div style="font-weight:800;font-size:20px;color:var(--gold)">' +
    wholeNumber(entry.xp) +
    ' XP</div></div>' +
    // 📊 the last 14 days
    '<div class="card" style="margin:0 0 12px;padding:12px 12px 6px"><div class="row" style="justify-content:space-between">' +
    '<b>' +
    translate('14 derniers jours', 'Last 14 days') +
    '</b><span class="muted sm">+' +
    twoWeeks +
    ' XP</span></div>' +
    chartHtml(days) +
    '</div>' +
    // 🔢 the stats
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">' +
    statHtml(translate('XP en ', 'XP in ') + escapeHtml(monthName()), '+' + monthXp) +
    statHtml(translate('Série de jours', 'Day streak'), '🔥 ' + wholeNumber(entry.streak)) +
    statHtml(translate('Cartes maîtrisées', 'Cards mastered'), '🎯 ' + wholeNumber(entry.mastered)) +
    statHtml(
      translate('Bonnes réponses', 'Right answers'),
      answered ? Math.round((100 * right) / answered) + ' %' : '–',
    ) +
    statHtml(translate('Réponses données', 'Answers given'), String(answered)) +
    statHtml(
      translate('Examen final', 'Final exam'),
      wholeNumber(entry.exam) ? wholeNumber(entry.exam) + ' %' : '–',
    ) +
    '</div>' +
    // 🎮 where the XP came from
    '<div class="sh" style="margin-top:0">' +
    translate("D'où viennent les XP", 'Where the XP comes from') +
    '</div>' +
    sourcesHtml(entry) +
    '<p class="muted sm" style="margin:14px 0 6px">' +
    translate(
      'Chaque bonne réponse rapporte des XP : 10 en quiz, 2 en flashcards, plus les bonus des jeux.',
      'Every right answer earns XP: 10 in quizzes, 2 in flashcards, plus the game bonuses.',
    ) +
    '</p>'
  );
}

/**
 * `openPerson` - Function 🪟
 *
 * Slides up the drawer of one teammate (swipe down, tap outside or Back closes it).
 *
 * @param { string } uid - the teammate's uid (or `MY_ID` for my own, freshest stats)
 * @returns { void }
 */
function openPerson(uid) {
  const entry = uid === MY_ID ? myEntry() : boardEntries.find((candidate) => candidate.uid === uid);
  if (!entry || drawer) return;
  // the app's bottom-sheet look (`.ov.scrim` + `.sheet` = swipe down to close for free 👇), above the leaderboard
  drawer = document.createElement('div');
  drawer.className = 'ov scrim';
  drawer.id = 'boardSheet';
  drawer.style.zIndex = '60';
  drawer.innerHTML = '<div class="sheet"><div class="grab"></div><div class="sbody"></div></div>';
  drawer.querySelector('.sbody').innerHTML = personHtml(entry);
  drawer.dataset.uid = uid;
  // 👆 a tap on the dimmed background closes it
  drawer.addEventListener('click', (event) => event.target === drawer && history.back());
  document.body.appendChild(drawer);
  history.pushState({ boardPerson: 1 }, '');
}

/**
 * `closeDrawer` - Function 👋
 *
 * Slides the teammate drawer down and removes it.
 *
 * @returns { void }
 */
function closeDrawer() {
  if (!drawer) return;
  const closing = drawer;
  drawer = null;
  closing.classList.add('out');
  setTimeout(() => closing.remove(), 180);
}

// 👇 the drawer was swiped away (the app's sheet script removed it): drop its history step too
new MutationObserver(() => {
  if (drawer && !document.body.contains(drawer)) {
    drawer = null;
    ignoreNextPop = true;
    history.back();
  }
}).observe(document.body, { childList: true });

// ===== MY OWN DRAWER 🙋 ===== //

// the id of my own drawer, opened from the rank card (works signed out too) 🔑
const MY_ID = '__me__';

// the ranks, one every 300 XP (same list as the app's `RANKS`) 🏅
const RANK_NAMES = [
  ['Commis', 'Commis'],
  ['Demi-chef de rang', 'Junior waiter'],
  ['Chef de rang', 'Head waiter'],
  ["Maître d'hôtel", "Maître d'hôtel"],
  ['Directeur de salle', 'Restaurant manager'],
];

/**
 * `rankName` - Function 🏅
 *
 * @returns { string } - my current rank, from my local XP
 */
function rankName() {
  const names = RANK_NAMES[Math.min(RANK_NAMES.length - 1, Math.floor(wholeNumber(readProgress().xp) / 300))];
  return translate(names[0], names[1]);
}

/**
 * `myEntry` - Function 🙋
 *
 * My stats as a board entry, straight from this phone (so they're always up to date), with my
 * online entry's month start (`base`) when I'm on the board.
 *
 * @returns { object } - a board entry (uid = my uid when signed in)
 */
function myEntry() {
  const progress = readProgress(),
    totals = answerTotals(progress),
    online = user ? boardEntries.find((candidate) => candidate.uid === user.uid) : null,
    activity = readActivity(),
    month = currentMonth();
  return {
    uid: user ? user.uid : MY_ID,
    name: user ? user.displayName || 'Staff' : translate('Vous', 'You'),
    pic: user && SAFE_PICTURE_PATTERN.test(user.photoURL || '') ? user.photoURL : '',
    xp: wholeNumber(progress.xp),
    base: online && online.month === month ? wholeNumber(online.base) : 0,
    month: month,
    streak: wholeNumber(progress.streak),
    mastered: masteredCount(progress),
    right: totals.right,
    wrong: totals.wrong,
    exam: Math.min(100, wholeNumber(progress.exam && progress.exam.score)),
    days: mergeCounts(activity.days, online ? cleanCounts(online.days, DAY_PATTERN) : {}),
    modes: mergeCounts(activity.modes, online ? cleanCounts(online.modes, ACTIVITIES) : {}),
  };
}

/**
 * `isRankCard` - Function 🔎
 *
 * @param { Element } card - a card
 * @returns { boolean } - true for the rank card of Accueil (`.rankc`) or Profil (avatar + rank + bar)
 */
const isRankCard = (card) =>
  card.classList.contains('rankc') ||
  Boolean(card.querySelector(':scope > .av.big') && card.querySelector('.rk'));

// 👆 a tap on my rank card (Accueil or Profil): slide up my own drawer, like a teammate's in the leaderboard
document.addEventListener('click', (event) => {
  const card = event.target.closest('.rankc, .card.row');
  if (!card || !isRankCard(card) || event.target.closest('button, a, input')) return;
  openPerson(MY_ID);
});

// 👉 make it look tappable
const rankCardStyle = document.createElement('style');
rankCardStyle.textContent =
  '.rankc,.card.row:has(> .av.big){cursor:pointer;transition:transform .12s}' +
  '.rankc:active,.card.row:has(> .av.big):active{transform:scale(.985)}';
document.head.appendChild(rankCardStyle);

// ===== BOOT 🚀 ===== //

// 👂 the app re-renders the home screen: put the button back under the rank card
new MutationObserver(() => {
  if (isTeamMember && document.querySelector('.rankc') && !document.getElementById('boardBtn'))
    refreshHomeButton();
}).observe(document.documentElement, { childList: true, subtree: true });

// 👤 signed in / out: follow the board & share my score
onAuthStateChanged(auth, (signedInUser) => {
  user = signedInUser;
  listen();
  if (user) schedulePublish();
});
