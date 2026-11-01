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
// Doc `board/{uid}` = { name, pic, xp, base, month, streak, mastered, ts }
// - xp       : all-time XP (the app's progress `ltf_v1`)
// - month    : the month of the last update ("2026-11")
// - base     : the XP at the start of that month, so this month's XP = xp - base
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
    // nothing changed? don't write again 🧹
    if (
      previous &&
      previous.month === month &&
      wholeNumber(previous.xp) === experience &&
      wholeNumber(previous.base) === base &&
      wholeNumber(previous.streak) === wholeNumber(progress.streak) &&
      wholeNumber(previous.mastered) === masteredCount(progress) &&
      previous.name === (user.displayName || 'Staff').slice(0, 60)
    )
      return;
    await setDoc(boardRef, {
      name: (user.displayName || 'Staff').slice(0, 60),
      pic: SAFE_PICTURE_PATTERN.test(user.photoURL || '') ? user.photoURL : '',
      xp: experience,
      base: base,
      month: month,
      streak: wholeNumber(progress.streak),
      mastered: masteredCount(progress),
      ts: serverTimestamp(),
    });
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
  if (this === localStorage && key === PROGRESS_KEY && user) schedulePublish();
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
    '<div class="li" style="cursor:default' +
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
    ' XP</div></div>'
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
      'Les XP viennent des quiz, examens et jeux de l’app.',
      'XP comes from the quizzes, exams and games in the app.',
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
    if (!overlay) return;
    event.stopImmediatePropagation();
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
  }
  refreshHomeButton();
}

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
