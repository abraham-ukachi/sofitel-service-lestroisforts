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
 * @name: Les Trois Forts - Owner Dashboard Controls
 * @file: pwa/admin-edit.js
 * @type: JavaScript (ES module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) imported by admin.js
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🎛️ The hands-on part of the owner dashboard:
// - 👥 Gérer: approve / refuse / delete access requests, make admin / member, remove a teammate,
//   reset a waiter's XP, delete chat messages & photos, leaderboard entries and push devices
// - 📝 Contenu: edit, add & delete dishes, wines, cheeses, cocktails, fact cards, the daily briefing...
//   saved live in Firestore `content/{section}` (every phone takes it on its next start, see content.js)
// - 📣 Annonce: a message banner for the whole team
// Every write is checked again by the Firestore rules (owner only 🛡️); every value shown is escaped.

// import the Firebase app helpers (reuse the app `cloud.js` already created) 🔥
import { getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
// import the Firestore helpers 🗃️
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
// import the live content helpers 📝
import { CONTENT_SECTIONS, readLiveContent, storeLiveContent } from './content.js';
// import the round avatars of the dashboard 🧑
import { avatarHtml } from './admin.js';
// import the built-in Mise en place & its cleaner 🧊
import { SETUP_DEFAULT, cleanSetup, BOTTLE_KINDS } from './setup.js';

// ===== FIREBASE 🔥 ===== //

// the Firestore database of the app 🗃️
const firestore = getFirestore(getApps()[0]);

// ===== CONSTANTS 🧰 ===== //

// the owner's email (never removed, never demoted) 👑
const OWNER_EMAIL = 'abrahamukachi@gmail.com';
// the largest section Firestore can hold in one document (a bit under 1 MiB) 📏
const MAX_SECTION_BYTES = 900000;
// the sections, their names (FR / EN) & the field that names one entry 📚
const SECTION_NAMES = {
  dishes: ['Plats', 'Dishes', 'n'],
  jour: ['Briefing du jour', 'Daily briefing', ''],
  hq: ['Fiches carte d’hiver', 'Winter fact cards', ''],
  wines: ['Vins', 'Wines', 'w'],
  champagnes: ['Champagnes', 'Champagnes', 'n'],
  cocktails: ['Cocktails', 'Cocktails', 'n'],
  softs: ['Softs', 'Soft drinks', 'n'],
  coffee: ['Cafés', 'Coffees', 'n'],
  coffeeNote: ['Note café', 'Coffee note', ''],
  teas: ['Thés', 'Teas', 'n'],
  digestifs: ['Digestifs', 'Digestifs', 'n'],
  fromages: ['Fromages', 'Cheeses', 'n'],
  facts: ['Fiches maison', 'House facts', 'n'],
  pairing: ['Accords', 'Pairings', 'n'],
  taste: ['Profils de dégustation', 'Tasting profiles', ''],
  tables: ['Tables du plan', 'Floor plan tables', 'id'],
  counters: ['Comptoirs du plan', 'Floor plan counters', 'id'],
};
// friendly names of the short data keys 🏷️
const FIELD_NAMES = {
  n: ['Nom', 'Name'],
  d: ['Description', 'Description'],
  desc: ['Description', 'Description'],
  s: ['Catégorie', 'Category'],
  p: ['Prix (€)', 'Price (€)'],
  svc: ['Services', 'Services'],
  alg: ['Allergènes', 'Allergens'],
  pict: ['Pictogrammes', 'Pictograms'],
  until: ['Jusqu’au (AAAA-MM-JJ)', 'Until (YYYY-MM-DD)'],
  c: ['Couleur', 'Colour'],
  r: ['Région', 'Region'],
  a: ['Appellation', 'Appellation'],
  w: ['Vin', 'Wine'],
  v: ['Millésime', 'Vintage'],
  f: ['Format', 'Format'],
  tk: ['Profil de dégustation', 'Tasting profile'],
  glass: ['Verre', 'Glass'],
  garnish: ['Garniture', 'Garnish'],
  method: ['Méthode', 'Method'],
  note: ['Note', 'Note'],
  recipe: ['Recette (JSON)', 'Recipe (JSON)'],
  lait: ['Lait', 'Milk'],
  orig: ['Origine', 'Origin'],
  pate: ['Pâte', 'Paste'],
  h: ['Goût', 'Taste'],
};

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
    return JSON.parse(localStorage.getItem('ltf_v1') || '{}').lang === 'en' ? english : french;
  } catch (error) {
    return french;
  }
};

/**
 * `escapeHtml` - Function 🛡️
 *
 * @param { any } value - the text to escape
 * @returns { string } - the escaped text
 */
const escapeHtml = (value) =>
  String(value === undefined || value === null ? '' : value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

/**
 * `toast` - Function 🍞
 *
 * @param { string } text - a short message (plain text)
 * @returns { void }
 */
function toast(text) {
  const element = document.createElement('div');
  element.textContent = text;
  element.style.cssText =
    'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:80;background:#1d1b16;color:#fff;' +
    'padding:10px 16px;border-radius:12px;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:90vw';
  document.body.appendChild(element);
  setTimeout(() => element.remove(), 2600);
}

/**
 * `confirmAction` - Function ❓
 *
 * Asks with the app's own dialog (`.cdlg`, the same as the chat's delete dialog), never the system one.
 *
 * @param { string } question - what's about to happen
 * @param { object } [options] - `{ text, ok, icon, danger }`: a detail line, the OK label, the emoji, red OK
 * @returns { Promise<boolean> } - true when the owner confirms
 */
function confirmAction(question, options = {}) {
  const { text = '', ok = translate('Confirmer', 'Confirm'), icon = '⚠️', danger = true } = options;
  return new Promise((resolve) => {
    // one dialog at a time
    const previous = document.querySelector('.cdlg.admdlg');
    if (previous) previous.remove();
    const dialog = document.createElement('div');
    dialog.className = 'cdlg admdlg';
    // above the dashboard and its entry sheets 🔝
    dialog.style.zIndex = '90';
    dialog.innerHTML =
      '<div class="cdlgbox" role="dialog" aria-modal="true"><div class="cdlgic">' +
      icon +
      '</div><h3>' +
      escapeHtml(question) +
      '</h3>' +
      (text ? '<p class="cdlgtx">' + escapeHtml(text) + '</p>' : '') +
      '<div class="cdlgbt"><button class="btn sec" data-dlg="no">' +
      translate('Annuler', 'Cancel') +
      '</button><button class="btn' +
      (danger ? ' danger' : '') +
      '" data-dlg="yes">' +
      escapeHtml(ok) +
      '</button></div></div>';
    // close (with a short fade) and answer 👋
    const close = (answer) => {
      dialog.classList.add('out');
      document.removeEventListener('keydown', onKey, true);
      setTimeout(() => dialog.remove(), 160);
      resolve(answer);
    };
    // ⌨️ Escape = cancel, Enter = confirm (desktop)
    const onKey = (event) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        close(event.key === 'Enter');
      }
    };
    dialog.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-dlg]');
      // a tap on the dark backdrop or "Annuler" cancels
      if (event.target === dialog) close(false);
      else if (choice) close(choice.dataset.dlg === 'yes');
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(dialog);
    dialog.querySelector('[data-dlg="yes"]').focus();
  });
}

/**
 * `startDragSort` - Function ✋
 *
 * Drags a row by its grip (`.crGrip`): the row follows the finger, the rows it passes slide out of the
 * way (the swap effect), and the drop calls back with the old & new positions.
 *
 * @param { PointerEvent } event - the pointerdown
 * @param { string } rowSelector - what a row is (its siblings in the same list are the other rows)
 * @param { (from: number, target: number) => void } onDrop - called on release (from === target: no move)
 * @returns { void }
 */
function startDragSort(event, rowSelector, onDrop) {
  const grip = event.target.closest('.crGrip');
  const row = grip && grip.closest(rowSelector);
  if (!row) return;
  event.preventDefault();
  const rows = Array.from(row.parentElement.children).filter((element) => element.matches(rowSelector)),
    from = rows.indexOf(row),
    step = (rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : 0) || row.offsetHeight || 56,
    startY = event.clientY,
    minimum = -from * step,
    maximum = (rows.length - 1 - from) * step;
  let target = from;
  row.classList.add('crDrag');
  if (grip.setPointerCapture) grip.setPointerCapture(event.pointerId);
  if (navigator.vibrate) navigator.vibrate(8);

  // 👉 follow the finger, shift the rows it passes over
  const onMove = (moveEvent) => {
    const offset = Math.max(minimum, Math.min(maximum, moveEvent.clientY - startY));
    row.style.transform = `translateY(${offset}px) scale(1.02)`;
    target = Math.max(0, Math.min(rows.length - 1, from + Math.round(offset / step)));
    rows.forEach((other, position) => {
      if (other === row) return;
      let shift = 0;
      if (from < target && position > from && position <= target) shift = -step;
      if (from > target && position < from && position >= target) shift = step;
      other.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  };

  // 🫳 drop: clean up and tell the caller
  const onUp = () => {
    grip.removeEventListener('pointermove', onMove);
    grip.removeEventListener('pointerup', onUp);
    grip.removeEventListener('pointercancel', onUp);
    rows.forEach((other) => (other.style.transform = ''));
    row.classList.remove('crDrag');
    onDrop(from, target);
  };
  grip.addEventListener('pointermove', onMove);
  grip.addEventListener('pointerup', onUp);
  grip.addEventListener('pointercancel', onUp);
}

/**
 * `runAction` - Async Function ⚙️
 *
 * Runs a write, shows ✅ or the Firestore error, then refreshes the dashboard.
 *
 * @param { Function } action - the async write
 * @param { string } doneText - the message when it worked
 * @param { Function } onDone - called after a success (redraw)
 * @returns { Promise<void> }
 */
async function runAction(action, doneText, onDone) {
  try {
    await action();
    toast('✅ ' + doneText);
    if (onDone) onDone();
  } catch (error) {
    toast('⚠️ ' + String((error && error.code) || error));
  }
}

/**
 * `buttonHtml` - Function 🔘
 *
 * @param { string } action - the action name (data-act)
 * @param { string } id - the target id (data-id)
 * @param { string } label - the button label (already escaped)
 * @param { boolean } [danger] - red button?
 * @returns { string } - a small round icon button (the label's first word), its words as the tooltip
 */
const buttonHtml = (action, id, label, danger) => {
  // the first word is the icon, the rest names the action (tooltip & screen readers) 🏷️
  const [icon, ...words] = String(label).split(' '),
    title = words.join(' ');
  return (
    '<button class="admicon' +
    (danger ? ' danger' : action === 'approve' ? ' ok' : '') +
    '" data-act="' +
    action +
    '" data-id="' +
    escapeHtml(id) +
    '" title="' +
    title +
    '" aria-label="' +
    title +
    '"><span>' +
    icon +
    '</span></button>'
  );
};

/**
 * `rowHtml` - Function ➖
 *
 * @param { string } title - the row title (already escaped)
 * @param { string } subtitle - the row subtitle (already escaped)
 * @param { string } buttons - the row buttons
 * @param { object } [person] - who the row is about ({ name, email, pic }), drawn as a round avatar
 * @returns { string } - one managed row
 */
const rowHtml = (title, subtitle, buttons, person) =>
  '<div class="admline">' +
  (person ? avatarHtml(person.name || person.email, person.pic) : '') +
  '<div class="admtext"><div class="admtitle">' +
  title +
  '</div>' +
  (subtitle ? '<div class="muted sm admclip">' + subtitle + '</div>' : '') +
  '</div><div class="admacts">' +
  buttons +
  '</div></div>';

/**
 * `cardHtml` - Function 🗂️
 *
 * @param { string } title - the card title
 * @param { string } body - the card content
 * @param { number } [count] - a number shown as a pill on the right of the title
 * @returns { string } - one card
 */
const cardHtml = (title, body, count) =>
  '<div class="card" style="margin:0 0 12px"><div class="admcardtitle">' +
  title +
  (count === undefined ? '' : '<span class="admcount">' + count + '</span>') +
  '</div>' +
  body +
  '</div>';

/**
 * `messageWhen` - Function 🕰️
 *
 * @param { any } stamp - a Firestore Timestamp (or nothing)
 * @returns { string } - "1 nov., 07:40"
 */
function messageWhen(stamp) {
  const date = stamp && typeof stamp.toDate === 'function' ? stamp.toDate() : null;
  return date
    ? date.toLocaleString(translate('fr-FR', 'en-GB'), {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
}

// ===== 👥 GÉRER ===== //

/**
 * `renderManage` - Function 👥
 *
 * Draws the management tab (requests, team, accounts, chat, leaderboard, push) and wires its buttons.
 *
 * @param { HTMLElement } body - where to draw
 * @param { object } data - the numbers gathered by admin.js ({ byId: { users, team, ... } })
 * @param { object } user - the owner's Firebase user
 * @param { Function } reload - reads everything again & redraws
 * @returns { void }
 */
export function renderManage(body, data, user, reload) {
  const team = data.byId.team.docs,
    requests = data.byId.requests.docs,
    accounts = data.byId.users.docs,
    messages = data.byId.chat.docs
      .slice()
      .sort(
        (first, second) =>
          ((second.data.ts && second.data.ts.toMillis()) || 0) -
          ((first.data.ts && first.data.ts.toMillis()) || 0),
      ),
    board = data.byId.board.docs,
    devices = data.byId.push.docs;
  const nameOf = (uid) => {
    const known = team.find((entry) => entry.id === uid) || accounts.find((entry) => entry.id === uid);
    return known ? known.data.name || known.data.email || uid : uid;
  };

  // 🛂 access requests
  const requestRows = requests
    .map((request) =>
      rowHtml(
        escapeHtml(request.data.name || 'Staff') +
          (request.data.refused ? ' · ⛔ ' + translate('refusée', 'refused') : ''),
        escapeHtml(request.data.email || ''),
        buttonHtml('approve', request.id, '✅ ' + translate('Accepter', 'Approve')) +
          (request.data.refused
            ? ''
            : buttonHtml('refuse', request.id, '⛔ ' + translate('Refuser', 'Refuse'))) +
          buttonHtml('deleteRequest', request.id, '🗑️ ' + translate('Supprimer', 'Delete'), true),
        request.data,
      ),
    )
    .join('');
  // 👥 the team
  const teamRows = team
    .map((member) => {
      const isTheOwner = member.data.email === OWNER_EMAIL;
      return rowHtml(
        escapeHtml(member.data.name || 'Staff') +
          ' · ' +
          (member.data.role === 'admin' ? '👑 admin' : translate('membre', 'member')),
        escapeHtml(member.data.email || ''),
        isTheOwner
          ? '<span class="muted sm">' + translate('Propriétaire', 'Owner') + '</span>'
          : buttonHtml(
              'role',
              member.id,
              member.data.role === 'admin'
                ? '⬇️ ' + translate('Rendre membre', 'Make member')
                : '👑 ' + translate('Rendre admin', 'Make admin'),
            ) + buttonHtml('removeMember', member.id, '🚫 ' + translate('Retirer', 'Remove'), true),
        member.data,
      );
    })
    .join('');
  // 🎓 every account (XP reset)
  const accountRows = accounts
    .map((account) => {
      let accountXp = 0;
      try {
        accountXp = JSON.parse(account.data.s || '{}').xp || 0;
      } catch (error) {}
      return rowHtml(
        escapeHtml(account.data.name || account.data.email || 'Staff') + ' · ' + accountXp + ' XP',
        escapeHtml(account.data.email || ''),
        buttonHtml('resetXp', account.id, '♻️ ' + translate('Remettre à zéro', 'Reset XP'), true),
        account.data,
      );
    })
    .join('');
  // 💬 the chat (newest first, the 60 last)
  const messageRows = messages
    .slice(0, 60)
    .map((message) =>
      rowHtml(
        escapeHtml(message.data.name || 'Staff') +
          ' <span class="muted sm">' +
          escapeHtml(messageWhen(message.data.ts)) +
          '</span>',
        (message.data.img ? '📷 ' : '') +
          (message.data.gif ? 'GIF ' : '') +
          (message.data.sticker ? '🏷️ ' : '') +
          escapeHtml(String(message.data.text || '').slice(0, 140)),
        buttonHtml('deleteMessage', message.id, '🗑️ ' + translate('Supprimer', 'Delete'), true),
        message.data,
      ),
    )
    .join('');
  const photoCount = messages.filter((message) => message.data.img).length;
  // 🏆 the leaderboard
  const boardRows = board
    .map((entry) =>
      rowHtml(
        escapeHtml(entry.data.name || 'Staff') + ' · ' + (entry.data.xp || 0) + ' XP',
        '',
        buttonHtml(
          'deleteBoard',
          entry.id,
          '🗑️ ' + translate('Retirer du classement', 'Remove from board'),
          true,
        ),
        entry.data,
      ),
    )
    .join('');
  // 🔔 the push devices
  const deviceRows = devices
    .map((device) =>
      rowHtml(
        escapeHtml(nameOf(device.id)),
        '',
        buttonHtml(
          'deletePush',
          device.id,
          '🔕 ' + translate('Couper les notifications', 'Remove device'),
          true,
        ),
      ),
    )
    .join('');
  const none = '<p class="muted sm">' + translate('Rien pour l’instant.', 'Nothing yet.') + '</p>';

  body.innerHTML =
    '<div class="admsticky">' +
    searchBarHtml(
      'admPeople',
      '',
      translate('Chercher une personne, un message…', 'Search a person, a message…'),
    ) +
    '</div><div class="admcols">' +
    cardHtml('🛂 ' + translate('Demandes d’accès', 'Access requests'), requestRows || none, requests.length) +
    cardHtml('👥 ' + translate('Équipe', 'Team'), teamRows || none, team.length) +
    cardHtml('🎓 ' + translate('Comptes & XP', 'Accounts & XP'), accountRows || none, accounts.length) +
    cardHtml(
      '💬 Chat',
      (photoCount
        ? '<button class="btn sec admwide" data-act="deletePhotos" data-id="all" style="margin:0 0 6px;color:#e5484d">🖼️ ' +
          translate('Supprimer les photos de plus de 30 jours', 'Delete photos older than 30 days') +
          '</button>'
        : '') + (messageRows || none),
    ) +
    cardHtml('🏆 ' + translate('Classement', 'Leaderboard'), boardRows || none, board.length) +
    cardHtml('🔔 ' + translate('Appareils notifiés', 'Push devices'), deviceRows || none, devices.length) +
    '</div>';

  // 🔍 the filter: hides the rows (and the cards) that don't match
  const peopleInput = body.querySelector('#admPeople');
  peopleInput.oninput = () =>
    body.querySelectorAll('.card').forEach((card) => {
      const rows = card.querySelectorAll('.admline');
      let shown = 0;
      rows.forEach((row) => {
        const visible = matchesQuery(plainText(row.textContent), peopleInput.value);
        row.style.display = visible ? '' : 'none';
        if (visible) shown++;
      });
      card.style.display = !peopleInput.value.trim() || shown ? '' : 'none';
    });

  // 👆 one listener for every button
  body.onclick = async (event) => {
    const button = event.target.closest('[data-act]');
    if (!button) return;
    const action = button.dataset.act,
      targetId = button.dataset.id;
    const request = requests.find((entry) => entry.id === targetId),
      member = team.find((entry) => entry.id === targetId);
    switch (action) {
      case 'approve':
        if (!request) return;
        runAction(
          async () => {
            await setDoc(doc(firestore, 'team', targetId), {
              name: String(request.data.name || 'Staff').slice(0, 100),
              email: String(request.data.email || '').slice(0, 200),
              pic: String(request.data.pic || ''),
              role: 'member',
              by: user.uid,
              ts: serverTimestamp(),
            });
            await deleteDoc(doc(firestore, 'requests', targetId));
          },
          translate('Accès accordé', 'Access granted'),
          reload,
        );
        break;
      case 'refuse':
        runAction(
          () => updateDoc(doc(firestore, 'requests', targetId), { refused: true }),
          translate('Refusée', 'Refused'),
          reload,
        );
        break;
      case 'deleteRequest':
        runAction(
          () => deleteDoc(doc(firestore, 'requests', targetId)),
          translate('Supprimée', 'Deleted'),
          reload,
        );
        break;
      case 'role':
        if (!member) return;
        runAction(
          () =>
            setDoc(doc(firestore, 'team', targetId), {
              name: String(member.data.name || 'Staff').slice(0, 100),
              email: String(member.data.email || '').slice(0, 200),
              pic: String(member.data.pic || ''),
              role: member.data.role === 'admin' ? 'member' : 'admin',
              by: user.uid,
              ts: serverTimestamp(),
            }),
          translate('Rôle changé', 'Role changed'),
          reload,
        );
        break;
      case 'removeMember':
        if (
          !member ||
          !(await confirmAction(translate('Retirer ', 'Remove ') + (member.data.name || '') + ' ?', {
            icon: '👋',
            ok: translate('Retirer', 'Remove'),
          }))
        )
          return;
        runAction(
          () => deleteDoc(doc(firestore, 'team', targetId)),
          translate('Retiré de l’équipe', 'Removed from the team'),
          reload,
        );
        break;
      case 'resetXp':
        if (
          !(await confirmAction(
            translate('Remettre l’XP et la progression de ', 'Reset the XP and progress of ') +
              nameOf(targetId) +
              ' ?',
            { icon: '🔄', ok: translate('Remettre à zéro', 'Reset') },
          ))
        )
          return;
        runAction(
          async () => {
            await setDoc(doc(firestore, 'config', 'resets'), { [targetId]: Date.now() }, { merge: true });
            await deleteDoc(doc(firestore, 'users', targetId));
            await deleteDoc(doc(firestore, 'board', targetId));
          },
          translate('Remis à zéro (au prochain lancement de son app)', 'Reset (on their next app start)'),
          reload,
        );
        break;
      case 'deleteMessage':
        if (
          !(await confirmAction(translate('Supprimer ce message ?', 'Delete this message?'), {
            icon: '🗑️',
            ok: translate('Supprimer', 'Delete'),
          }))
        )
          return;
        runAction(
          () => deleteDoc(doc(firestore, 'chat', targetId)),
          translate('Message supprimé', 'Message deleted'),
          reload,
        );
        break;
      case 'deletePhotos': {
        const monthAgo = Date.now() - 30 * 86400000,
          old = messages.filter(
            (message) => message.data.img && message.data.ts && message.data.ts.toMillis() < monthAgo,
          );
        if (!old.length)
          return toast(translate('Aucune photo de plus de 30 jours', 'No photo older than 30 days'));
        if (
          !(await confirmAction(translate('Supprimer ', 'Delete ') + old.length + ' photo(s) ?', {
            icon: '🖼️',
            ok: translate('Supprimer', 'Delete'),
          }))
        )
          return;
        runAction(
          () => Promise.all(old.map((message) => deleteDoc(doc(firestore, 'chat', message.id)))),
          old.length + ' photo(s) ' + translate('supprimée(s)', 'deleted'),
          reload,
        );
        break;
      }
      case 'deleteBoard':
        if (
          !(await confirmAction(translate('Retirer du classement ?', 'Remove from the leaderboard?'), {
            icon: '🏆',
            ok: translate('Retirer', 'Remove'),
          }))
        )
          return;
        runAction(
          () => deleteDoc(doc(firestore, 'board', targetId)),
          translate('Retiré du classement', 'Removed'),
          reload,
        );
        break;
      case 'deletePush':
        runAction(
          () => deleteDoc(doc(firestore, 'push', targetId)),
          translate('Notifications coupées', 'Device removed'),
          reload,
        );
        break;
    }
  };
}

// ===== 📣 ANNONCE ===== //

/**
 * `renderAnnounce` - Async Function 📣
 *
 * Draws the announcement editor (text, on / off) and saves it to `config/announce`.
 *
 * @param { HTMLElement } body - where to draw
 * @returns { Promise<void> }
 */
export async function renderAnnounce(body) {
  let current = { text: '', on: false },
    quickList = null;
  try {
    const snapshot = await getDoc(doc(firestore, 'config', 'announce'));
    if (snapshot.exists()) current = snapshot.data();
  } catch (error) {}
  // ⚡ the chat's quick messages (`content/quick`, a JSON list of texts; none = the built-in list of chat.js)
  try {
    const snapshot = await getDoc(doc(firestore, 'content', 'quick'));
    if (snapshot.exists()) quickList = JSON.parse(snapshot.data().data);
  } catch (error) {}
  body.innerHTML =
    '<div class="admcols">' +
    cardHtml(
      '📣 ' + translate('Annonce à toute l’équipe', 'Announcement to the whole team'),
      '<textarea id="annText" class="admfield" maxlength="500" rows="5" placeholder="' +
        translate(
          'Ex. : briefing à 18 h 30, tenue d’hiver ce soir…',
          'E.g. briefing at 6:30 pm, winter outfit tonight…',
        ) +
        '">' +
        escapeHtml(current.text || '') +
        '</textarea><div class="admmeta"><span>' +
        translate('Visible par toute l’équipe', 'Seen by the whole team') +
        '</span><span id="annCount"></span></div>' +
        '<label class="admswitch"><input type="checkbox" id="annOn"' +
        (current.on ? ' checked' : '') +
        '><span class="admknob"></span><span class="grow"><b>' +
        translate('Afficher sur toutes les apps', 'Show on every phone') +
        '</b><span class="muted sm" style="display:block">' +
        translate('Désactivez pour retirer le bandeau', 'Turn off to remove the banner') +
        '</span></span></label><button class="btn admwide" id="annSave">🚀 ' +
        translate('Publier', 'Publish') +
        '</button>',
    ) +
    cardHtml(
      '👀 ' + translate('Aperçu', 'Preview'),
      '<div class="admpreview" id="annPreview"><span>📣</span><span class="grow" id="annPreviewText"></span></div>' +
        '<p class="muted sm" style="margin-bottom:0">' +
        translate(
          'Le bandeau s’affiche en haut de l’app au prochain lancement. Chaque nouvelle publication réapparaît, même si l’ancienne a été fermée.',
          'The banner shows at the top of the app on its next start. Each new publish shows again, even if the last one was closed.',
        ) +
        '</p>',
    ) +
    cardHtml(
      '⚡ ' + translate('Messages rapides du chat', 'Chat quick messages'),
      '<textarea id="quickText" class="admfield" rows="8" placeholder="Table # prête ✅">' +
        escapeHtml(Array.isArray(quickList) ? quickList.join('\n') : '') +
        '</textarea><p class="muted sm">' +
        translate(
          'Un message par ligne (20 max). Avec # (numéro de table) ou terminé par « : », il s’ouvre dans la zone de texte pour le compléter ; sinon il part d’un seul geste. Vide = la liste intégrée.',
          'One message per line (20 max). With # (table number) or ending with “:”, it opens in the text box to finish it; otherwise it is sent in one tap. Empty = the built-in list.',
        ) +
        '</p><button class="btn admwide" id="quickSave">🚀 ' +
        translate('Publier', 'Publish') +
        '</button>',
    ) +
    '</div>';
  // ⚡ publish the quick messages (empty = back to the built-in list)
  body.querySelector('#quickSave').onclick = () => {
    const lines = body
      .querySelector('#quickText')
      .value.split('\n')
      .map((line) => line.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 20);
    runAction(
      () =>
        lines.length
          ? setDoc(doc(firestore, 'content', 'quick'), { data: JSON.stringify(lines), ts: serverTimestamp() })
          : deleteDoc(doc(firestore, 'content', 'quick')),
      translate('Messages rapides publiés', 'Quick messages published'),
    );
  };
  const textInput = body.querySelector('#annText'),
    switchInput = body.querySelector('#annOn');
  // 👀 keeps the preview & the counter in step with what's typed
  const updatePreview = () => {
    body.querySelector('#annPreviewText').textContent =
      textInput.value.trim() || translate('Votre message ici…', 'Your message here…');
    body.querySelector('#annPreview').classList.toggle('off', !switchInput.checked);
    body.querySelector('#annCount').textContent = textInput.value.length + ' / 500';
  };
  textInput.oninput = updatePreview;
  switchInput.onchange = updatePreview;
  updatePreview();
  body.querySelector('#annSave').onclick = () =>
    runAction(
      () =>
        setDoc(doc(firestore, 'config', 'announce'), {
          text: textInput.value.trim().slice(0, 500),
          on: switchInput.checked,
          ts: serverTimestamp(),
        }),
      translate('Annonce publiée', 'Announcement published'),
    );
}

// ===== 🎬 CRÉDITS ===== //

/**
 * `renderCredits` - Async Function 🎬
 *
 * Draws the credits editor (one row per person: drag to reorder, name & role, delete, add) and saves the list to
 * `content/credits` (a JSON text, read by the About drawer of every phone, see about.js).
 *
 * @param { HTMLElement } body - where to draw
 * @returns { Promise<void> }
 */
export async function renderCredits(body) {
  let people = [];
  try {
    const snapshot = await getDoc(doc(firestore, 'content', 'credits'));
    if (snapshot.exists()) people = JSON.parse(snapshot.data().data || '[]');
  } catch (error) {}
  if (!Array.isArray(people)) people = [];

  // ✍️ keeps what was typed before a redraw
  const readRows = () =>
    Array.from(body.querySelectorAll('.crRow')).map((row) => ({
      name: row.querySelector('.crName').value.trim().slice(0, 80),
      role: row.querySelector('.crRole').value.trim().slice(0, 80),
    }));

  // 🖼️ draws the rows (grip · avatar · name & role · delete)
  const draw = () => {
    const rows = people
      .map(
        (person, index) =>
          `<div class="crRow admcredit" data-index="${index}">` +
          `<span class="crGrip" title="${translate('Glisser pour déplacer', 'Drag to move')}" aria-label="drag">⠿</span>` +
          `${avatarHtml(person.name || '?')}<div class="admtext">` +
          `<input class="crName crInput" maxlength="80" placeholder="${translate('Nom', 'Name')}" value="${escapeHtml(person.name)}">` +
          `<input class="crRole crInput" maxlength="80" placeholder="${translate('Rôle (ex. Chef de rang)', 'Role (e.g. Head waiter)')}" value="${escapeHtml(person.role)}">` +
          `</div><button class="crDel" data-cr="del" data-index="${index}" title="${translate('Supprimer', 'Delete')}" aria-label="delete">✕</button></div>`,
      )
      .join('');
    body.innerHTML =
      cardHtml(
        '🎬 ' + translate('Crédits de l’app', 'App credits'),
        (rows
          ? `<p class="crHint">${translate('Maintenez ⠿ et glissez pour changer l’ordre.', 'Hold ⠿ and drag to reorder.')}</p><div class="crList">${rows}</div>`
          : `<p class="admempty">${translate('Personne pour l’instant.', 'Nobody yet.')}</p>`) +
          `<button class="admdashed" data-cr="add">＋ ${translate('Ajouter une personne', 'Add a person')}</button>`,
        people.length,
      ) +
      `<button class="btn admwide${isDirty ? ' crDirty' : ''}" data-cr="save">🚀 ${translate('Publier', 'Publish')}</button>` +
      `<p class="muted sm" style="text-align:center">${translate(
        'Ils défilent dans Profil › À propos › Crédits, sur toutes les apps (visible par tous).',
        'They roll in Profil › About › Credits on every phone (visible to everyone).',
      )}</p>`;
  };

  // ✏️ something changed and isn't published yet: the Publish button glows
  let isDirty = false;
  const markDirty = () => {
    isDirty = true;
    const saveButton = body.querySelector('[data-cr="save"]');
    if (saveButton) saveButton.classList.add('crDirty');
  };
  body.oninput = (event) => event.target.closest('.crInput') && markDirty();

  // ✋ drag a row by its grip ⠿: the others slide out of the way, drop = new position
  body.onpointerdown = (event) =>
    startDragSort(event, '.crRow', (from, target) => {
      people = readRows();
      if (target !== from) {
        people.splice(target, 0, people.splice(from, 1)[0]);
        isDirty = true;
      }
      draw();
    });

  body.onclick = async (event) => {
    const button = event.target.closest('[data-cr]');
    if (!button) return;
    people = readRows();
    const index = Number(button.dataset.index);
    if (button.dataset.cr === 'add') {
      people.push({ name: '', role: '' });
      isDirty = true;
    } else if (button.dataset.cr === 'del') {
      const person = people[index];
      // an empty row goes without asking
      if (
        person.name &&
        !(await confirmAction(
          translate('Retirer ', 'Remove ') + person.name + translate(' des crédits ?', ' from the credits?'),
          {
            icon: '🎬',
            ok: translate('Retirer', 'Remove'),
          },
        ))
      )
        return;
      people.splice(index, 1);
      isDirty = true;
    } else if (button.dataset.cr === 'save') {
      const clean = people.filter((person) => person.name).slice(0, 200);
      return runAction(
        () =>
          setDoc(doc(firestore, 'content', 'credits'), {
            data: JSON.stringify(clean),
            ts: serverTimestamp(),
          }),
        translate('Crédits publiés', 'Credits published'),
      ).then(() => {
        isDirty = false;
        button.classList.remove('crDirty');
      });
    }
    draw();
    if (button.dataset.cr === 'add') {
      const names = body.querySelectorAll('.crName');
      if (names.length) names[names.length - 1].focus();
    }
  };
  draw();
}

// ===== 🧊 MISE EN PLACE ===== //

/**
 * `setupPathGet` - Function 🧭
 *
 * @param { object } root - the working setup
 * @param { string } path - a dotted path like `buckets.0.items.2.n`
 * @returns { any } - the value at that path
 */
const setupPathGet = (root, path) =>
  path.split('.').reduce((value, key) => (value == null ? value : value[key]), root);

/**
 * `setupPathSet` - Function ✍️
 *
 * @param { object } root - the working setup
 * @param { string } path - a dotted path like `steps.3.title.fr`
 * @param { any } value - the new value
 * @returns { void }
 */
function setupPathSet(root, path, value) {
  const keys = path.split('.'),
    last = keys.pop();
  const parent = keys.reduce((node, key) => node[key], root);
  if (parent) parent[last] = value;
}

/**
 * `renderSetup` - Async Function 🧊
 *
 * Draws the Mise en place editor: the buckets & the reds (bottles: name, type, how many, note), the steps of
 * service, a FR / EN switch for the texts, drag ⠿ to reorder, and Publish to `content/setup` (read by the
 * « Mise en place » chapter of every phone, see setup.js).
 *
 * @param { HTMLElement } body - where to draw
 * @returns { Promise<void> }
 */
export async function renderSetup(body) {
  let working = cleanSetup(SETUP_DEFAULT),
    isLive = false;
  try {
    const snapshot = await getDoc(doc(firestore, 'content', 'setup'));
    if (snapshot.exists()) {
      working = cleanSetup(JSON.parse(snapshot.data().data || 'null'));
      isLive = true;
    }
  } catch (error) {}
  let part = 'buckets',
    language = 'fr',
    isDirty = false;

  // 🧩 a text input bound to a path of the working setup
  const inputHtml = (path, placeholder, className, multiline) => {
    const value = escapeHtml(setupPathGet(working, path) || '');
    return multiline
      ? `<textarea class="admfield setin ${className || ''}" rows="2" data-path="${path}" placeholder="${escapeHtml(placeholder)}">${value}</textarea>`
      : `<input class="admfield setin ${className || ''}" data-path="${path}" placeholder="${escapeHtml(placeholder)}" value="${value}">`;
  };

  // 🍾 one bottle row: grip · name / note / type & quantity · delete
  const bottleRowHtml = (groupPath, item, index) =>
    `<div class="setrow" data-group="${groupPath}"><span class="crGrip" title="${translate('Glisser pour déplacer', 'Drag to move')}">⠿</span>` +
    `<div class="admtext">${inputHtml(groupPath + '.items.' + index + '.n', translate('Nom de la bouteille', 'Bottle name'), 'setname')}` +
    `${inputHtml(groupPath + '.items.' + index + '.note.' + language, translate('Note (ex. bouteille Orezza n° 1)', 'Note (e.g. Orezza bottle no. 1)'), 'setsmall')}` +
    `<div class="setmeta"><select class="admfield setin setkindsel" data-path="${groupPath}.items.${index}.kind">` +
    BOTTLE_KINDS.map(
      ([id, emoji, french, english]) =>
        `<option value="${id}"${item.kind === id ? ' selected' : ''}>${emoji} ${translate(french, english)}</option>`,
    ).join('') +
    `</select><label class="setqtylabel">×<input class="admfield setin setqtyin" type="number" min="0" max="24" inputmode="numeric" data-path="${groupPath}.items.${index}.qty" value="${item.qty}"></label></div></div>` +
    `<button class="crDel" data-st="delItem" data-group="${groupPath}" data-index="${index}" title="${translate('Supprimer', 'Delete')}">✕</button></div>`;

  // 🧊 one group card (a bucket or the reds)
  const groupCardHtml = (group, groupPath, title, removable) =>
    cardHtml(
      title,
      `<div class="setgrouphead">${inputHtml(groupPath + '.icon', '🧊', 'seticon')}` +
        `${inputHtml(groupPath + '.name.' + language, translate('Nom du seau', 'Bucket name'), 'setname')}</div>` +
        inputHtml(
          groupPath + '.hint.' + language,
          translate('Comment le reconnaître, ce qu’il contient', 'How to spot it, what goes in'),
          '',
          true,
        ) +
        `<div class="setrows">${group.items.map((item, index) => bottleRowHtml(groupPath, item, index)).join('')}</div>` +
        `<button class="admdashed" data-st="addItem" data-group="${groupPath}">＋ ${translate('Ajouter une bouteille', 'Add a bottle')}</button>` +
        (removable
          ? `<button class="setremove" data-st="delBucket" data-index="${groupPath.split('.')[1]}">🗑️ ${translate('Supprimer ce seau', 'Delete this bucket')}</button>`
          : ''),
      group.items.reduce((sum, item) => sum + item.qty, 0),
    );

  // 🤵 one step row: grip · icon · title / text / phrase · delete
  const stepRowHtml = (step, index) =>
    `<div class="setrow setsteprow" data-group="steps"><span class="crGrip" title="${translate('Glisser pour déplacer', 'Drag to move')}">⠿</span>` +
    `<span class="setstepnum">${index + 1}</span>${inputHtml('steps.' + index + '.icon', '•', 'seticon')}` +
    `<div class="admtext">${inputHtml('steps.' + index + '.title.' + language, translate('Titre', 'Title'), 'setname')}` +
    inputHtml(
      'steps.' + index + '.text.' + language,
      translate('Ce que fait le serveur', 'What the waiter does'),
      '',
      true,
    ) +
    inputHtml(
      'steps.' + index + '.say.' + language,
      translate('💬 Phrase à dire (facultatif)', '💬 What to say (optional)'),
      'setsmall',
    ) +
    `</div><button class="crDel" data-st="delStep" data-index="${index}" title="${translate('Supprimer', 'Delete')}">✕</button></div>`;

  // 🖼️ draws the editor
  const draw = () => {
    const parts = [
      ['buckets', '🧊 ' + translate('Seaux', 'Buckets')],
      ['reds', '🍷 ' + translate('Rouges', 'Reds')],
      ['steps', '🤵 ' + translate('Le service', 'Service')],
    ];
    let content = '';
    if (part === 'buckets')
      content =
        working.buckets
          .map((bucket, index) =>
            groupCardHtml(bucket, 'buckets.' + index, translate('Seau ', 'Bucket ') + (index + 1), true),
          )
          .join('') +
        `<button class="admdashed" data-st="addBucket">＋ ${translate('Ajouter un seau', 'Add a bucket')}</button>`;
    else if (part === 'reds')
      content = groupCardHtml(working.reds, 'reds', '🍷 ' + translate('Rouges', 'Reds'), false);
    else
      content = cardHtml(
        '🤵 ' + translate('Étapes du service', 'Steps of service'),
        `<p class="crHint">${translate('Maintenez ⠿ et glissez pour changer l’ordre.', 'Hold ⠿ and drag to reorder.')}</p>` +
          `<div class="setrows">${working.steps.map(stepRowHtml).join('')}</div>` +
          `<button class="admdashed" data-st="addStep">＋ ${translate('Ajouter une étape', 'Add a step')}</button>`,
        working.steps.length,
      );
    body.innerHTML =
      `<div class="setbar"><div class="setseg">` +
      parts
        .map(
          ([id, label]) =>
            `<button class="${part === id ? 'on' : ''}" data-st="part" data-part="${id}">${label}</button>`,
        )
        .join('') +
      `</div><div class="setseg setlang">` +
      ['fr', 'en']
        .map(
          (code) =>
            `<button class="${language === code ? 'on' : ''}" data-st="lang" data-lang="${code}">${code.toUpperCase()}</button>`,
        )
        .join('') +
      `</div></div><p class="muted sm" style="margin:0 4px 10px">${translate(
        `Textes en ${language === 'fr' ? 'français' : 'anglais'}. ${isLive ? 'Version en ligne.' : 'Version d’origine (vidéos du 1er nov.).'}`,
        `${language === 'fr' ? 'French' : 'English'} texts. ${isLive ? 'Live version.' : 'Built-in version (videos of 1 Nov).'}`,
      )}</p>` +
      content +
      `<button class="btn admwide${isDirty ? ' crDirty' : ''}" data-st="save">🚀 ${translate('Publier', 'Publish')}</button>` +
      (isLive
        ? `<button class="setremove" data-st="restore">↩️ ${translate('Revenir à la version d’origine', 'Back to the built-in version')}</button>`
        : '') +
      `<p class="muted sm" style="text-align:center">${translate(
        'Visible dans Accueil › Chapitres › Mise en place, sur toutes les apps.',
        'Shown in Home › Chapters › Setup on every phone.',
      )}</p>`;
  };

  // ✏️ remember a change, the Publish button glows
  const markDirty = () => {
    isDirty = true;
    const saveButton = body.querySelector('[data-st="save"]');
    if (saveButton) saveButton.classList.add('crDirty');
  };

  // ⌨️ typing writes straight into the working setup
  body.oninput = body.onchange = (event) => {
    const field = event.target.closest('[data-path]');
    if (!field) return;
    const value =
      field.type === 'number' ? Math.max(0, Math.min(24, Math.round(Number(field.value) || 0))) : field.value;
    setupPathSet(working, field.dataset.path, value);
    markDirty();
  };

  // ✋ drag bottles & steps by their grip
  body.onpointerdown = (event) => {
    const row = event.target.closest('.setrow');
    if (!row) return;
    startDragSort(event, '.setrow', (from, target) => {
      const list = setupPathGet(
        working,
        row.dataset.group === 'steps' ? 'steps' : row.dataset.group + '.items',
      );
      if (target !== from) {
        list.splice(target, 0, list.splice(from, 1)[0]);
        markDirty();
      }
      draw();
    });
  };

  // 👆 every button
  body.onclick = async (event) => {
    const button = event.target.closest('[data-st]');
    if (!button) return;
    const index = Number(button.dataset.index);
    switch (button.dataset.st) {
      case 'part':
        part = button.dataset.part;
        break;
      case 'lang':
        language = button.dataset.lang;
        break;
      case 'addItem': {
        const items = setupPathGet(working, button.dataset.group + '.items');
        items.push({ n: '', kind: part === 'reds' ? 'rouge' : 'blanc', qty: 1, note: { fr: '', en: '' } });
        markDirty();
        draw();
        const names = body.querySelectorAll(`[data-path^="${button.dataset.group}.items."].setname`);
        if (names.length) names[names.length - 1].focus();
        return;
      }
      case 'delItem': {
        const items = setupPathGet(working, button.dataset.group + '.items');
        if (
          items[index].n &&
          !(await confirmAction(translate('Retirer ', 'Remove ') + items[index].n + ' ?', {
            icon: '🍾',
            ok: translate('Retirer', 'Remove'),
          }))
        )
          return;
        items.splice(index, 1);
        markDirty();
        break;
      }
      case 'addBucket':
        working.buckets.push({
          icon: '🧊',
          name: { fr: 'Seau ' + (working.buckets.length + 1), en: 'Bucket ' + (working.buckets.length + 1) },
          hint: { fr: '', en: '' },
          img: '',
          items: [],
        });
        markDirty();
        break;
      case 'delBucket':
        if (
          !(await confirmAction(translate('Supprimer ce seau ?', 'Delete this bucket?'), {
            text: translate('Ses bouteilles seront retirées aussi.', 'Its bottles go too.'),
            icon: '🧊',
            ok: translate('Supprimer', 'Delete'),
          }))
        )
          return;
        working.buckets.splice(index, 1);
        markDirty();
        break;
      case 'addStep':
        working.steps.push({
          icon: '•',
          title: { fr: '', en: '' },
          text: { fr: '', en: '' },
          say: { fr: '', en: '' },
        });
        markDirty();
        draw();
        {
          const titles = body.querySelectorAll('.setsteprow .setname');
          if (titles.length) titles[titles.length - 1].focus();
        }
        return;
      case 'delStep':
        if (
          !(await confirmAction(translate('Supprimer cette étape ?', 'Delete this step?'), {
            icon: '🤵',
            ok: translate('Supprimer', 'Delete'),
          }))
        )
          return;
        working.steps.splice(index, 1);
        markDirty();
        break;
      case 'save': {
        const clean = cleanSetup(working);
        return runAction(
          () =>
            setDoc(doc(firestore, 'content', 'setup'), {
              data: JSON.stringify(clean),
              ts: serverTimestamp(),
            }),
          translate('Mise en place publiée', 'Setup published'),
          () => {
            isDirty = false;
            isLive = true;
            draw();
          },
        );
      }
      case 'restore':
        if (
          !(await confirmAction(
            translate('Revenir à la version d’origine ?', 'Go back to the built-in version?'),
            {
              text: translate(
                'Toutes les apps reprendront la version des vidéos.',
                'Every phone goes back to the version from the videos.',
              ),
              icon: '↩️',
              ok: translate('Rétablir', 'Restore'),
            },
          ))
        )
          return;
        return runAction(
          () => deleteDoc(doc(firestore, 'content', 'setup')),
          translate('Version d’origine rétablie', 'Built-in version restored'),
          () => {
            working = cleanSetup(SETUP_DEFAULT);
            isDirty = false;
            isLive = false;
            draw();
          },
        );
    }
    draw();
  };
  draw();
}

// ===== 📝 CONTENU ===== //

// the state of the content editor: the built-in data, the live content & the section being edited 📦
let builtInData = null;
let liveContent = {};
let workingSection = '';
let workingValue = null;

/**
 * `loadBuiltInData` - Async Function 📦
 *
 * @returns { Promise<object> } - the built-in menu data (`window.LTF`, loading the readable data.js when the
 *   Rust app runs without it)
 */
function loadBuiltInData() {
  if (builtInData) return Promise.resolve(builtInData);
  if (window.LTF && window.LTF.dishes) {
    builtInData = window.LTF;
    return Promise.resolve(builtInData);
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'src/pwa/data.js';
    script.onload = () => {
      builtInData = window.LTF || {};
      resolve(builtInData);
    };
    script.onerror = () => reject(new Error('data.js'));
    document.head.appendChild(script);
  });
}

/**
 * `copyOf` - Function 📋
 *
 * @param { any } value - a JSON value
 * @returns { any } - a deep copy
 */
const copyOf = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));

/**
 * `entrySubtitle` - Function 📝
 *
 * @param { any } entry - one entry of a list section
 * @returns { string } - its short description (plain text), in the app's language when it's FR/EN 🌍
 */
function entrySubtitle(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const value = entry.d || entry.desc || entry.s || entry.a || entry.h || '';
  if (value && typeof value === 'object' && !Array.isArray(value))
    return String(translate(value.fr || value.en || '', value.en || value.fr || ''));
  return Array.isArray(value) ? value.join(', ') : String(value);
}

/**
 * `entryLabel` - Function 🏷️
 *
 * @param { any } entry - one entry of a list section
 * @param { string } nameField - the field that names it
 * @param { number } index - its position
 * @returns { string } - its name (plain text)
 */
function entryLabel(entry, nameField, index) {
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    const name = entry[nameField] || entry.n || entry.w || entry.id;
    if (name) return typeof name === 'object' ? name.fr || name.en || JSON.stringify(name) : String(name);
  }
  return '#' + (index + 1) + ' ' + JSON.stringify(entry).slice(0, 60);
}

/**
 * `fieldHtml` - Function ✏️
 *
 * @param { string } key - the field key
 * @param { any } value - its value
 * @returns { string } - the input that edits it (text, number, yes/no, lines, FR/EN, or JSON)
 */
function fieldHtml(key, value) {
  const names = FIELD_NAMES[key],
    label =
      '<div class="admlabel">' +
      escapeHtml(names ? translate(names[0], names[1]) : key) +
      ' <span class="admkey">(' +
      escapeHtml(key) +
      ')</span></div>';
  // closes the style attribute and adds the field class (used as  style="' + style + '" ) 🎨
  const style = '" class="admfield';
  if (typeof value === 'boolean')
    return (
      '<label class="admswitch"><input type="checkbox" data-key="' +
      escapeHtml(key) +
      '" data-kind="bool"' +
      (value ? ' checked' : '') +
      '><span class="admknob"></span><span class="grow">' +
      escapeHtml(names ? translate(names[0], names[1]) : key) +
      ' <span class="muted sm">(' +
      escapeHtml(key) +
      ')</span></span></label>'
    );
  if (typeof value === 'number' || value === null)
    return (
      label +
      '<input type="number" step="any" data-key="' +
      escapeHtml(key) +
      '" data-kind="number" value="' +
      (value === null ? '' : value) +
      '" style="' +
      style +
      '">'
    );
  if (typeof value === 'string')
    return (
      label +
      '<textarea rows="' +
      (value.length > 70 ? 3 : 1) +
      '" data-key="' +
      escapeHtml(key) +
      '" data-kind="text" style="' +
      style +
      '">' +
      escapeHtml(value) +
      '</textarea>'
    );
  if (Array.isArray(value) && value.every((item) => typeof item === 'string'))
    return (
      label +
      '<textarea rows="3" data-key="' +
      escapeHtml(key) +
      '" data-kind="lines" placeholder="' +
      translate('une valeur par ligne', 'one value per line') +
      '" style="' +
      style +
      '">' +
      escapeHtml(value.join('\n')) +
      '</textarea>'
    );
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).every((lang) => lang === 'fr' || lang === 'en')
  )
    return (
      label +
      ['fr', 'en']
        .map(
          (lang) =>
            '<textarea rows="1" data-key="' +
            escapeHtml(key) +
            '" data-kind="lang" data-lang="' +
            lang +
            '" placeholder="' +
            lang.toUpperCase() +
            '" style="margin-bottom:4px' +
            style +
            '">' +
            escapeHtml(value[lang] || '') +
            '</textarea>',
        )
        .join('')
    );
  return (
    label +
    '<textarea rows="4" data-key="' +
    escapeHtml(key) +
    '" data-kind="json" class="admfield" style="font-family:monospace;font-size:12px">' +
    escapeHtml(JSON.stringify(value, null, 1)) +
    '</textarea>'
  );
}

/**
 * `readForm` - Function 📤
 *
 * @param { HTMLElement } form - the entry form
 * @param { object } entry - the entry before editing
 * @returns { object } - the edited entry (throws on invalid JSON)
 */
function readForm(form, entry) {
  const edited = copyOf(entry);
  form.querySelectorAll('[data-key]').forEach((input) => {
    const key = input.dataset.key;
    switch (input.dataset.kind) {
      case 'bool':
        edited[key] = input.checked;
        break;
      case 'number':
        edited[key] = input.value.trim() === '' ? null : Number(input.value);
        break;
      case 'text':
        edited[key] = input.value;
        break;
      case 'lines':
        edited[key] = input.value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
        break;
      case 'lang':
        edited[key] = Object.assign(typeof edited[key] === 'object' && edited[key] ? edited[key] : {}, {
          [input.dataset.lang]: input.value,
        });
        break;
      case 'json':
        try {
          edited[key] = JSON.parse(input.value);
        } catch (error) {
          throw new Error(
            translate('JSON invalide dans « ', 'Invalid JSON in "') + key + translate(' »', '"'),
          );
        }
        break;
    }
  });
  return edited;
}

/**
 * `blankLike` - Function 🆕
 *
 * @param { object } model - an existing entry
 * @returns { object } - an empty entry with the same fields (texts empty, numbers null, lists empty)
 */
function blankLike(model) {
  const blank = {};
  Object.keys(model || { n: '' }).forEach((key) => {
    const value = model ? model[key] : '';
    if (typeof value === 'string') blank[key] = '';
    else if (typeof value === 'number' || value === null) blank[key] = null;
    else if (typeof value === 'boolean') blank[key] = false;
    else if (Array.isArray(value)) blank[key] = [];
    else if (value && typeof value === 'object')
      blank[key] = Object.keys(value).every((lang) => lang === 'fr' || lang === 'en')
        ? { fr: '', en: '' }
        : {};
  });
  return blank;
}

/**
 * `publishSection` - Async Function 🚀
 *
 * Saves the working section to `content/{section}`, applies it on this phone & offers a reload.
 *
 * @param { Function } redraw - redraws the content tab
 * @returns { Promise<void> }
 */
async function publishSection(redraw) {
  const text = JSON.stringify(workingValue);
  if (new TextEncoder().encode(text).length > MAX_SECTION_BYTES)
    return toast('⚠️ ' + translate('Section trop grande', 'Section too large'));
  await runAction(
    async () => {
      await setDoc(doc(firestore, 'content', workingSection), { data: text, ts: serverTimestamp() });
      liveContent[workingSection] = copyOf(workingValue);
      storeLiveContent(liveContent);
    },
    translate('Publié · rechargez pour voir', 'Published · reload to see it'),
    redraw,
  );
}

/**
 * `restoreSection` - Async Function ↩️
 *
 * Deletes the live version of the working section: every phone goes back to the built-in one.
 *
 * @param { Function } redraw - redraws the content tab
 * @returns { Promise<void> }
 */
async function restoreSection(redraw) {
  if (
    !(await confirmAction(translate('Revenir à la version d’origine ?', 'Go back to the built-in version?'), {
      text: translate(
        'Toutes les apps reprendront le contenu d’origine.',
        'Every phone goes back to the built-in content.',
      ),
      icon: '↩️',
      ok: translate('Rétablir', 'Restore'),
    }))
  )
    return;
  await runAction(
    async () => {
      await deleteDoc(doc(firestore, 'content', workingSection));
      delete liveContent[workingSection];
      storeLiveContent(liveContent);
      workingValue = copyOf(builtInData[workingSection]);
    },
    translate('Version d’origine rétablie', 'Built-in version restored'),
    redraw,
  );
}

/**
 * `renderContent` - Async Function 📝
 *
 * Draws the content editor: the sections, then one section's entries (edit / add / delete / move),
 * or a JSON editor for the sections that aren't lists.
 *
 * @param { HTMLElement } body - where to draw
 * @returns { Promise<void> }
 */
export async function renderContent(body) {
  body.innerHTML =
    '<p class="muted" style="text-align:center;margin-top:30px">' +
    translate('Chargement…', 'Loading…') +
    '</p>';
  try {
    await loadBuiltInData();
    liveContent = await readLiveContent();
  } catch (error) {
    body.innerHTML = '<p class="muted">⚠️ ' + escapeHtml(String(error)) + '</p>';
    return;
  }
  const redraw = () => drawContent(body);
  drawContent(body, redraw);
}

// ===== CONTENT SEARCH 🔍 ===== //

// the icon of every section (for the tiles & the search results) 🎨
const SECTION_ICONS = {
  dishes: '🍽️',
  jour: '📋',
  hq: '❄️',
  wines: '🍷',
  champagnes: '🥂',
  cocktails: '🍸',
  softs: '🥤',
  coffee: '☕',
  coffeeNote: '📝',
  teas: '🫖',
  digestifs: '🥃',
  fromages: '🧀',
  facts: '🏛️',
  pairing: '🤝',
  taste: '👅',
  tables: '🪑',
  counters: '🍸',
};
// what the waiter typed in the search bars (kept while moving around) 🔍
let contentQuery = '';
let sectionQuery = '';

/**
 * `plainText` - Function 🔤
 *
 * @param { any } value - any text
 * @returns { string } - lowercase, no accents, œ → oe (for the searches)
 */
const plainText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * `entryText` - Function 📄
 *
 * @param { any } entry - one entry (any JSON)
 * @returns { string } - every text & number inside it, searchable
 */
function entryText(entry) {
  if (entry === null || entry === undefined) return '';
  if (typeof entry !== 'object') return plainText(entry);
  return Object.values(entry).map(entryText).join(' ');
}

/**
 * `matchesQuery` - Function ✅
 *
 * @param { string } text - the searchable text of an entry
 * @param { string } query - what was typed
 * @returns { boolean } - true when every typed word is in the text
 */
const matchesQuery = (text, query) =>
  plainText(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));

/**
 * `sectionValue` - Function 📦
 *
 * @param { string } section - a content section
 * @returns { any } - its live version, else its built-in one
 */
const sectionValue = (section) =>
  liveContent[section] !== undefined ? liveContent[section] : builtInData[section];

/**
 * `isListSection` - Function 📋
 *
 * @param { any } value - a section value
 * @returns { boolean } - true for a list of objects (edited entry by entry)
 */
const isListSection = (value) =>
  Array.isArray(value) && value.every((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));

/**
 * `entryRowHtml` - Function ➖
 *
 * One tappable entry row (tap = edit), with a ⠿ grip to drag it (like the credits) and a 🗑️ button.
 *
 * @param { string } title - the row title (plain text)
 * @param { string } subtitle - the row subtitle (plain text)
 * @param { string } attributes - the data-* attributes of the row
 * @param { boolean } withTools - show the ⠿ grip & 🗑️
 * @param { number } index - the entry position (for the tools)
 * @param { boolean } canDrag - show the ⠿ grip (not while the list is filtered)
 * @returns { string } - the row
 */
const entryRowHtml = (title, subtitle, attributes, withTools, index, canDrag) =>
  '<div class="admrow' +
  (withTools ? ' admsort' : '') +
  '" ' +
  attributes +
  '>' +
  (withTools && canDrag
    ? '<span class="crGrip" title="' +
      translate('Glisser pour déplacer', 'Drag to move') +
      '" aria-label="drag">⠿</span>'
    : '') +
  '<div class="grow" style="min-width:0"><div class="n">' +
  escapeHtml(title) +
  '</div>' +
  (subtitle ? '<div class="muted sm admclip">' + escapeHtml(subtitle) + '</div>' : '') +
  '</div>' +
  (withTools
    ? '<button class="admicon danger" data-do="remove" data-index="' +
      index +
      '" aria-label="delete">🗑️</button>'
    : '<div class="muted">›</div>') +
  '</div>';

/**
 * `searchBarHtml` - Function 🔍
 *
 * @param { string } id - the input id
 * @param { string } value - the current query
 * @param { string } placeholder - the hint
 * @returns { string } - a rounded search field (with a ✕ to clear it)
 */
const searchBarHtml = (id, value, placeholder) =>
  '<label class="admsearch">🔍<input id="' +
  id +
  '" type="search" autocomplete="off" value="' +
  escapeHtml(value) +
  '" placeholder="' +
  escapeHtml(placeholder) +
  '"></label>';

/**
 * `globalResultsHtml` - Function 🔎
 *
 * Searches every section at once (names, descriptions, prices, any text inside).
 *
 * @returns { string } - the results (max 60), or the section tiles when nothing is typed
 */
function globalResultsHtml() {
  const sections = CONTENT_SECTIONS.filter((section) => builtInData[section] !== undefined);
  // 🧱 nothing typed: the section tiles
  if (!contentQuery.trim())
    return (
      '<div class="admgrid">' +
      sections
        .map((section) => {
          const names = SECTION_NAMES[section] || [section, section],
            value = sectionValue(section);
          return (
            '<button class="admtile" data-section="' +
            section +
            '"><div class="admtileicon">' +
            (SECTION_ICONS[section] || '📄') +
            '</div><div class="n">' +
            escapeHtml(translate(names[0], names[1])) +
            '</div><div class="muted sm">' +
            (Array.isArray(value)
              ? value.length + translate(' éléments', ' items')
              : translate('fiche', 'sheet')) +
            '</div>' +
            (liveContent[section] !== undefined
              ? '<span class="admchip">✏️ ' + translate('en direct', 'live') + '</span>'
              : '') +
            '</button>'
          );
        })
        .join('') +
      '</div>'
    );
  // 🔎 something typed: every matching entry, all sections together
  const results = [];
  sections.forEach((section) => {
    const value = sectionValue(section),
      names = SECTION_NAMES[section] || [section, section, 'n'];
    if (isListSection(value))
      value.forEach((entry, index) => {
        if (matchesQuery(entryText(entry), contentQuery)) results.push({ section, index, entry, names });
      });
    else if (matchesQuery(entryText(value), contentQuery))
      results.push({ section, index: -1, entry: null, names });
  });
  if (!results.length)
    return (
      '<p class="admempty">' +
      translate('Aucun résultat pour « ', 'No result for "') +
      escapeHtml(contentQuery) +
      translate(' »', '"') +
      '</p>'
    );
  return (
    '<p class="muted sm" style="margin:2px 4px 8px">' +
    results.length +
    translate(' résultat(s)', ' result(s)') +
    (results.length > 60 ? translate(' · 60 premiers', ' · first 60') : '') +
    '</p><div class="card" style="padding:4px 12px;margin:0">' +
    results
      .slice(0, 60)
      .map((result) =>
        entryRowHtml(
          result.entry
            ? entryLabel(result.entry, result.names[2], result.index)
            : translate(result.names[0], result.names[1]),
          (SECTION_ICONS[result.section] || '📄') +
            ' ' +
            translate(result.names[0], result.names[1]) +
            (result.entry ? ' · ' + entrySubtitle(result.entry) : ''),
          'data-section="' + result.section + '" data-open="' + result.index + '"',
          false,
          result.index,
        ),
      )
      .join('') +
    '</div>'
  );
}

/**
 * `sectionRowsHtml` - Function 📋
 *
 * @param { Array<object> } entries - the working entries
 * @param { string } nameField - the field that names an entry
 * @returns { string } - the rows that match the section filter
 */
function sectionRowsHtml(entries, nameField) {
  const rows = entries
    .map((entry, index) => ({ entry, index }))
    .filter((row) => !sectionQuery.trim() || matchesQuery(entryText(row.entry), sectionQuery));
  if (!rows.length) return '<p class="admempty">' + translate('Aucun élément', 'No item') + '</p>';
  // ⠿ dragging only makes sense on the whole list (not on search results)
  const canDrag = !sectionQuery.trim() && rows.length > 1;
  return (
    (canDrag
      ? `<p class="crHint">${translate('Maintenez ⠿ et glissez pour changer l’ordre.', 'Hold ⠿ and drag to reorder.')}</p>`
      : '') +
    rows
      .map((row) =>
        entryRowHtml(
          entryLabel(row.entry, nameField, row.index),
          entrySubtitle(row.entry),
          'data-do="edit" data-index="' + row.index + '"',
          true,
          row.index,
          canDrag,
        ),
      )
      .join('')
  );
}

/**
 * `drawContent` - Function 🎨
 *
 * @param { HTMLElement } body - where to draw
 * @returns { void }
 */
function drawContent(body) {
  const redraw = () => drawContent(body);
  // 📚 no section open: one search bar for everything + the section tiles
  if (!workingSection) {
    body.innerHTML =
      '<div class="admsticky">' +
      searchBarHtml(
        'admFind',
        contentQuery,
        translate('Chercher un plat, un vin, un prix…', 'Search a dish, a wine, a price…'),
      ) +
      '</div><div id="admFound">' +
      globalResultsHtml() +
      '</div><p class="muted sm" style="margin:14px 4px">' +
      translate(
        'Modifiez la carte sans redéployer : chaque téléphone prend la nouvelle version à son prochain lancement. Renommer un plat peut détacher sa photo et ses notes.',
        'Edit the menu without a redeploy: every phone takes the new version on its next start. Renaming a dish can detach its photo and notes.',
      ) +
      '</p>';
    const findInput = body.querySelector('#admFind');
    findInput.oninput = () => {
      contentQuery = findInput.value;
      body.querySelector('#admFound').innerHTML = globalResultsHtml();
    };
    body.onclick = (event) => {
      const button = event.target.closest('[data-section]');
      if (!button) return;
      workingSection = button.dataset.section;
      workingValue = copyOf(sectionValue(workingSection));
      sectionQuery = '';
      redraw();
      // 🔎 a search result: straight to its form
      const openIndex = button.dataset.open === undefined ? -1 : Number(button.dataset.open);
      if (openIndex >= 0) openEntry(body, openIndex, redraw, false);
    };
    return;
  }

  const names = SECTION_NAMES[workingSection] || [workingSection, workingSection, 'n'],
    isLive = liveContent[workingSection] !== undefined,
    // ✏️ changes that aren't published yet?
    isDirty = JSON.stringify(workingValue) !== JSON.stringify(sectionValue(workingSection)),
    isList = isListSection(workingValue);
  const header =
    '<div class="admsticky"><div class="row" style="gap:8px"><button class="admicon" data-do="back" aria-label="back">←</button>' +
    '<div class="grow" style="min-width:0"><div style="font-weight:800">' +
    (SECTION_ICONS[workingSection] || '📄') +
    ' ' +
    escapeHtml(translate(names[0], names[1])) +
    '</div><div class="muted sm">' +
    (isList ? workingValue.length + translate(' éléments', ' items') : 'JSON') +
    (isLive ? ' · ✏️ ' + translate('en direct', 'live') : '') +
    '</div></div>' +
    (isList ? '<button class="admicon gold" data-do="add" aria-label="add">＋</button>' : '') +
    '</div>' +
    (isList
      ? searchBarHtml('admFilter', sectionQuery, translate('Filtrer cette section…', 'Filter this section…'))
      : '') +
    '</div>';
  // 🚀 the bottom bar: publish (highlighted when something changed) & restore
  const footer =
    '<div class="admbar' +
    (isDirty ? ' dirty' : '') +
    '"><div class="grow muted sm">' +
    (isDirty
      ? '● ' + translate('Modifications non publiées', 'Unpublished changes')
      : translate('À jour', 'Up to date')) +
    '</div>' +
    (isLive
      ? '<button class="btn sec" data-do="restore" style="min-height:0;padding:8px 12px">↩️ ' +
        translate('Origine', 'Built-in') +
        '</button>'
      : '') +
    '<button class="btn" data-do="publish" style="min-height:0;padding:8px 14px"' +
    (isDirty || !isList ? '' : ' disabled') +
    '>🚀 ' +
    translate('Publier', 'Publish') +
    '</button></div>';

  if (isList) {
    // 📋 a list section: its entries (tap one to edit it)
    body.innerHTML =
      header +
      '<div class="card" style="padding:4px 12px;margin:10px 0 0" id="admRows">' +
      sectionRowsHtml(workingValue, names[2]) +
      '</div>' +
      footer;
    const filterInput = body.querySelector('#admFilter');
    filterInput.oninput = () => {
      sectionQuery = filterInput.value;
      body.querySelector('#admRows').innerHTML = sectionRowsHtml(workingValue, names[2]);
    };
  } else {
    // 🧾 any other section: a JSON editor
    body.innerHTML =
      header +
      cardHtml(
        'JSON',
        '<textarea id="jsonEdit" rows="18" style="width:100%;box-sizing:border-box;border-radius:10px;padding:8px;font-family:monospace;font-size:12px">' +
          escapeHtml(JSON.stringify(workingValue, null, 1)) +
          '</textarea>',
      ) +
      footer;
  }

  // ✋ drag a row by its grip ⠿ (like the credits): the others slide out of the way, drop = new position
  body.onpointerdown = (event) =>
    Array.isArray(workingValue) &&
    startDragSort(event, '.admsort', (from, target) => {
      if (target !== from) {
        workingValue.splice(target, 0, workingValue.splice(from, 1)[0]);
        redraw();
      }
    });

  body.onclick = async (event) => {
    // a tap on the grip is not a tap on the row
    if (event.target.closest('.crGrip')) return;
    const button = event.target.closest('[data-do]');
    if (!button) return;
    const index = Number(button.dataset.index);
    switch (button.dataset.do) {
      case 'back':
        if (
          isDirty &&
          !(await confirmAction(translate('Quitter sans publier ?', 'Leave without publishing?'), {
            text: translate('Vos modifications seront perdues.', 'Your changes will be lost.'),
            icon: '📝',
            ok: translate('Quitter', 'Leave'),
          }))
        )
          return;
        workingSection = '';
        workingValue = null;
        redraw();
        break;
      case 'publish': {
        const editor = body.querySelector('#jsonEdit');
        if (editor) {
          try {
            const parsed = JSON.parse(editor.value);
            if (
              typeof parsed !== typeof builtInData[workingSection] ||
              Array.isArray(parsed) !== Array.isArray(builtInData[workingSection])
            )
              throw new Error(translate('Type différent de l’original', 'Different type from the original'));
            workingValue = parsed;
          } catch (error) {
            return toast('⚠️ ' + error.message);
          }
        }
        publishSection(redraw);
        break;
      }
      case 'restore':
        restoreSection(redraw);
        break;
      case 'add':
        workingValue.push(blankLike(workingValue[0]));
        openEntry(body, workingValue.length - 1, redraw, true);
        break;
      case 'edit':
        openEntry(body, index, redraw, false);
        break;
      case 'remove':
        if (
          await confirmAction(
            translate('Supprimer « ', 'Delete "') +
              entryLabel(workingValue[index], names[2], index) +
              translate(' » ?', '"?'),
            { icon: '🗑️', ok: translate('Supprimer', 'Delete') },
          )
        ) {
          workingValue.splice(index, 1);
          redraw();
        }
        break;
    }
  };
}

/**
 * `openEntry` - Function ✏️
 *
 * Shows the form of one entry; OK keeps the change in the section (Publish sends it live).
 *
 * @param { HTMLElement } body - where to draw
 * @param { number } index - the entry position
 * @param { Function } redraw - redraws the section
 * @param { boolean } isNew - a just-added entry (Cancel removes it)
 * @returns { void }
 */
function openEntry(body, index, redraw, isNew) {
  const entry = workingValue[index],
    extraKey =
      '<div class="row" style="gap:6px;margin-top:12px"><input id="newKey" placeholder="' +
      translate('nouveau champ', 'new field') +
      '" class="admfield" style="flex:1"><button class="admicon gold" data-form="addKey" aria-label="add"><span>＋</span></button></div>';
  body.innerHTML = cardHtml(
    '✏️ ' + escapeHtml(entryLabel(entry, (SECTION_NAMES[workingSection] || [])[2], index)),
    '<div id="entryForm">' +
      Object.keys(entry)
        .map((key) => fieldHtml(key, entry[key]))
        .join('') +
      '</div>' +
      extraKey +
      '<div class="row" style="gap:8px;margin-top:14px"><button class="btn sec grow" data-form="cancel">' +
      translate('Annuler', 'Cancel') +
      '</button><button class="btn grow" data-form="ok">OK</button></div>' +
      '<p class="muted sm">' +
      translate(
        'Puis « Publier » pour l’envoyer à toute l’équipe.',
        'Then "Publish" to send it to the whole team.',
      ) +
      '</p>',
  );
  body.onclick = (event) => {
    const button = event.target.closest('[data-form]');
    if (!button) return;
    const form = body.querySelector('#entryForm');
    switch (button.dataset.form) {
      case 'cancel':
        if (isNew) workingValue.splice(index, 1);
        redraw();
        break;
      case 'ok':
        try {
          workingValue[index] = readForm(form, entry);
          redraw();
        } catch (error) {
          toast('⚠️ ' + error.message);
        }
        break;
      case 'addKey': {
        const key = body.querySelector('#newKey').value.trim();
        if (!/^[A-Za-z][A-Za-z0-9_]{0,30}$/.test(key) || key in entry)
          return toast('⚠️ ' + translate('Nom de champ invalide', 'Invalid field name'));
        try {
          workingValue[index] = readForm(form, entry);
        } catch (error) {
          return toast('⚠️ ' + error.message);
        }
        workingValue[index][key] = '';
        openEntry(body, index, redraw, isNew);
        break;
      }
    }
  };
}
