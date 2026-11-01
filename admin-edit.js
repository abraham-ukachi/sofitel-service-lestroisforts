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
 * @param { string } question - what's about to happen
 * @returns { boolean } - true when the owner confirms
 */
const confirmAction = (question) => window.confirm(question);

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
 * @returns { string } - a small action button
 */
const buttonHtml = (action, id, label, danger) =>
  '<button class="btn sec" data-act="' +
  action +
  '" data-id="' +
  escapeHtml(id) +
  '" style="padding:6px 10px;font-size:13px;min-height:0' +
  (danger ? ';color:#e5484d' : '') +
  '">' +
  label +
  '</button>';

/**
 * `rowHtml` - Function ➖
 *
 * @param { string } title - the row title (already escaped)
 * @param { string } subtitle - the row subtitle (already escaped)
 * @param { string } buttons - the row buttons
 * @returns { string } - one managed row
 */
const rowHtml = (title, subtitle, buttons) =>
  '<div class="admline" style="padding:9px 0;border-bottom:1px solid rgba(127,127,127,.12)"><div style="font-weight:700;overflow-wrap:anywhere">' +
  title +
  '</div>' +
  (subtitle ? '<div class="muted sm" style="overflow-wrap:anywhere">' + subtitle + '</div>' : '') +
  '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">' +
  buttons +
  '</div></div>';

/**
 * `cardHtml` - Function 🗂️
 *
 * @param { string } title - the card title
 * @param { string } body - the card content
 * @returns { string } - one card
 */
const cardHtml = (title, body) =>
  '<div class="card" style="margin:0 0 12px"><div style="font-weight:800;margin-bottom:6px">' +
  title +
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
    '</div>' +
    cardHtml('🛂 ' + translate('Demandes d’accès', 'Access requests'), requestRows || none) +
    cardHtml('👥 ' + translate('Équipe', 'Team'), teamRows || none) +
    cardHtml('🎓 ' + translate('Comptes & XP', 'Accounts & XP'), accountRows || none) +
    cardHtml(
      '💬 Chat',
      (photoCount
        ? '<button class="btn sec" data-act="deletePhotos" data-id="all" style="margin-bottom:6px;color:#e5484d">🖼️ ' +
          translate('Supprimer les photos de plus de 30 jours', 'Delete photos older than 30 days') +
          '</button>'
        : '') + (messageRows || none),
    ) +
    cardHtml('🏆 ' + translate('Classement', 'Leaderboard'), boardRows || none) +
    cardHtml('🔔 ' + translate('Appareils notifiés', 'Push devices'), deviceRows || none);

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
  body.onclick = (event) => {
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
        if (!member || !confirmAction(translate('Retirer ', 'Remove ') + (member.data.name || '') + ' ?'))
          return;
        runAction(
          () => deleteDoc(doc(firestore, 'team', targetId)),
          translate('Retiré de l’équipe', 'Removed from the team'),
          reload,
        );
        break;
      case 'resetXp':
        if (
          !confirmAction(
            translate('Remettre l’XP et la progression de ', 'Reset the XP and progress of ') +
              nameOf(targetId) +
              ' ?',
          )
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
        if (!confirmAction(translate('Supprimer ce message ?', 'Delete this message?'))) return;
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
        if (!confirmAction(translate('Supprimer ', 'Delete ') + old.length + ' photo(s) ?')) return;
        runAction(
          () => Promise.all(old.map((message) => deleteDoc(doc(firestore, 'chat', message.id)))),
          old.length + ' photo(s) ' + translate('supprimée(s)', 'deleted'),
          reload,
        );
        break;
      }
      case 'deleteBoard':
        if (!confirmAction(translate('Retirer du classement ?', 'Remove from the leaderboard?'))) return;
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
  let current = { text: '', on: false };
  try {
    const snapshot = await getDoc(doc(firestore, 'config', 'announce'));
    if (snapshot.exists()) current = snapshot.data();
  } catch (error) {}
  body.innerHTML = cardHtml(
    '📣 ' + translate('Annonce à toute l’équipe', 'Announcement to the whole team'),
    '<textarea id="annText" maxlength="500" rows="5" style="width:100%;box-sizing:border-box;border-radius:12px;padding:10px;font:inherit">' +
      escapeHtml(current.text || '') +
      '</textarea><label class="row" style="gap:8px;margin:10px 0"><input type="checkbox" id="annOn"' +
      (current.on ? ' checked' : '') +
      '> ' +
      translate('Afficher sur toutes les apps', 'Show on every phone') +
      '</label><button class="btn" id="annSave" style="width:100%">' +
      translate('Publier', 'Publish') +
      '</button><p class="muted sm">' +
      translate(
        'Un bandeau s’affiche en haut de l’app au prochain lancement. Chaque nouvelle publication réapparaît même si l’ancienne a été fermée.',
        'A banner shows at the top of the app on its next start. Each new publish shows again, even if the last one was closed.',
      ) +
      '</p>',
  );
  body.querySelector('#annSave').onclick = () =>
    runAction(
      () =>
        setDoc(doc(firestore, 'config', 'announce'), {
          text: body.querySelector('#annText').value.trim().slice(0, 500),
          on: body.querySelector('#annOn').checked,
          ts: serverTimestamp(),
        }),
      translate('Annonce publiée', 'Announcement published'),
    );
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
      '<div class="muted sm" style="margin:10px 0 3px">' +
      escapeHtml(names ? translate(names[0], names[1]) : key) +
      ' <span style="opacity:.6">(' +
      escapeHtml(key) +
      ')</span></div>';
  const style = 'width:100%;box-sizing:border-box;border-radius:10px;padding:8px;font:inherit';
  if (typeof value === 'boolean')
    return (
      label +
      '<input type="checkbox" data-key="' +
      escapeHtml(key) +
      '" data-kind="bool"' +
      (value ? ' checked' : '') +
      '>'
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
            '" style="' +
            style +
            ';margin-bottom:4px">' +
            escapeHtml(value[lang] || '') +
            '</textarea>',
        )
        .join('')
    );
  return (
    label +
    '<textarea rows="4" data-key="' +
    escapeHtml(key) +
    '" data-kind="json" style="' +
    style +
    ';font-family:monospace;font-size:12px">' +
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
  if (!confirmAction(translate('Revenir à la version d’origine ?', 'Go back to the built-in version?')))
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
 * One tappable entry row (tap = edit), with its small ↑ / 🗑️ buttons.
 *
 * @param { string } title - the row title (plain text)
 * @param { string } subtitle - the row subtitle (plain text)
 * @param { string } attributes - the data-* attributes of the row
 * @param { boolean } withTools - show ↑ & 🗑️
 * @param { number } index - the entry position (for the tools)
 * @returns { string } - the row
 */
const entryRowHtml = (title, subtitle, attributes, withTools, index) =>
  '<div class="admrow" ' +
  attributes +
  '><div class="grow" style="min-width:0"><div class="n">' +
  escapeHtml(title) +
  '</div>' +
  (subtitle ? '<div class="muted sm admclip">' + escapeHtml(subtitle) + '</div>' : '') +
  '</div>' +
  (withTools
    ? '<button class="admicon" data-do="up" data-index="' +
      index +
      '" aria-label="up">↑</button><button class="admicon danger" data-do="remove" data-index="' +
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
            (result.entry
              ? ' · ' + (result.entry.d || result.entry.desc || result.entry.s || result.entry.a || '')
              : ''),
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
  return rows
    .map((row) =>
      entryRowHtml(
        entryLabel(row.entry, nameField, row.index),
        String(row.entry.d || row.entry.desc || row.entry.s || row.entry.a || ''),
        'data-do="edit" data-index="' + row.index + '"',
        true,
        row.index,
      ),
    )
    .join('');
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

  body.onclick = (event) => {
    const button = event.target.closest('[data-do]');
    if (!button) return;
    const index = Number(button.dataset.index);
    switch (button.dataset.do) {
      case 'back':
        if (isDirty && !confirmAction(translate('Quitter sans publier ?', 'Leave without publishing?')))
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
      case 'up':
        if (index > 0) {
          const moved = workingValue.splice(index, 1)[0];
          workingValue.splice(index - 1, 0, moved);
          redraw();
        }
        break;
      case 'remove':
        if (
          confirmAction(
            translate('Supprimer « ', 'Delete "') +
              entryLabel(workingValue[index], names[2], index) +
              translate(' » ?', '"?'),
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
      '" style="flex:1;border-radius:10px;padding:8px;font:inherit"><button class="btn sec" data-form="addKey">➕</button></div>';
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
