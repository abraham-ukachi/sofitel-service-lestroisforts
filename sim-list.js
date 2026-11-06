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
 * @name: Les Trois Forts - Simulation de service, « Parties en cours »
 * @file: pwa/sim-list.js
 * @type: JavaScript (module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (sim.js) import { useListKit, cleanListEntry, drawerHtml } from './sim-list.js';
 *    -|> drawerHtml({ games, selectedId: '', error: '' }) → the live games in the bottom sheet
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 📡 « Parties en cours »: the views of the team's live online games (from `simlist/{id}`, one public entry per
// game written by its host). sim.js listens to the query and draws these views in its bottom sheet:
// - 📋 the list: host, code (open game) or a lock (« sur code »), waiters & free rangs, lobby or in service with
//   the clock and the tables done
// - 🔎 one game's details: « Rejoindre » without a code (open game), or the 4-digit code field (« sur code »)
// The helpers (translate, escapeHtml, icon…) come from sim.js through `useListKit`.

// ===== HELPERS 🧰 ===== //

// the helpers lent by sim.js (translate, escapeHtml, icon, clockText, clamp, isSafeUid, SERVICE_START) 🧰
let kit = null;

/**
 * `useListKit` - Function 🧰
 *
 * @param { object } helpers - sim.js's helpers (translate, escapeHtml, icon, clockText, clamp, isSafeUid, SERVICE_START)
 * @returns { void }
 */
export function useListKit(helpers) {
  kit = helpers;
}

// ===== THE VIEWS 📡 ===== //

/**
 * `cleanListEntry` - Function 🧼
 *
 * @param { string } id - the entry's document id
 * @param { any } data - its data (from the network)
 * @returns { object | null } - a safe entry { id, host, name, code, count, joined, started, clock, done, total, ended, expMs }
 */
export function cleanListEntry(id, data) {
  if (!data || typeof data !== 'object' || !/^[A-Za-z0-9]{16,32}$/.test(id) || !kit.isSafeUid(data.h))
    return null;
  const expMs = data.exp && typeof data.exp.toMillis === 'function' ? data.exp.toMillis() : 0;
  return {
    id,
    host: data.h,
    name: String(data.hn || '?').slice(0, 30),
    code: typeof data.c === 'string' && /^[0-9]{4}$/.test(data.c) ? data.c : '',
    count: kit.clamp(Math.round(Number(data.n) || 1), 1, 4),
    joined: kit.clamp(Math.round(Number(data.w) || 0), 0, 4),
    started: data.s === true,
    clock: kit.clamp(Number(data.k) || kit.SERVICE_START, 0, 1440),
    done: kit.clamp(Math.round(Number(data.d) || 0), 0, 10),
    total: kit.clamp(Math.round(Number(data.t) || 0), 0, 10),
    ended: data.en === true,
    expMs,
  };
}

/**
 * `gameStateText` - Function 🚦
 *
 * @param { object } entry - a clean list entry
 * @returns { string } - « Salle d'attente » or « En service · 20:15 · 3/7 tables »
 */
function gameStateText(entry) {
  if (!entry.started) return kit.translate("Salle d'attente", 'Lobby');
  return (
    kit.translate('En service · ', 'In service · ') +
    kit.clockText(entry.clock) +
    ` · ${entry.done}/${entry.total} ` +
    kit.translate('tables', 'tables')
  );
}

/**
 * `gameWaitersText` - Function 🤵
 *
 * @param { object } entry - a clean list entry
 * @returns { string } - « 2/3 serveurs · 1 rang libre »
 */
function gameWaitersText(entry) {
  const free = Math.max(0, entry.count - entry.joined);
  return (
    `${entry.joined}/${entry.count} ` +
    kit.translate('serveurs', 'waiters') +
    ' · ' +
    (free
      ? kit.translate(`${free} rang(s) libre(s)`, `${free} free rang(s)`)
      : kit.translate('complet', 'full'))
  );
}

/**
 * `drawerHtml` - Function 🖼️
 *
 * @param { {games: Array<object> | null, selectedId: string, error: string} } state - the list (null while loading),
 *   the game opened ('' for the list) and an error to show
 * @returns { string } - the bottom sheet: the list of live games, or one game's details
 */
export function drawerHtml(state) {
  const selected = state.selectedId && (state.games || []).find((entry) => entry.id === state.selectedId);
  let body = '';
  if (state.error)
    body = `<div class="simwait">${kit.icon('alert', 20)}<div class="simgrow">${kit.escapeHtml(state.error)}</div></div>`;
  else if (!state.games)
    body = `<div class="simwait">${kit.icon('clock', 20)}${kit.translate('Chargement…', 'Loading…')}</div>`;
  else if (selected) body = gameDetailsHtml(selected);
  else if (!state.games.length)
    body = `<div class="simwait">${kit.icon('live', 20)}<div class="simgrow">${kit.translate("Aucune partie en cours. Créez-en une pour l'équipe !", 'No game running. Create one for the team!')}</div></div>`;
  else
    body =
      `<div class="simlist">` +
      state.games
        .map(
          (entry) =>
            `<button class="simrow simgame" data-game="${entry.id}"><span class="simtag">${entry.code ? kit.escapeHtml(entry.code) : kit.icon('lock', 18)}</span>` +
            `<span><b>${kit.escapeHtml(entry.name)}</b><span class="simsub">${kit.escapeHtml(gameWaitersText(entry))}</span></span>` +
            `<span class="simstatus${entry.started ? ' simst-mains' : ''}">${kit.escapeHtml(gameStateText(entry))}</span></button>`,
        )
        .join('') +
      `</div>`;
  return (
    `<div class="simdrawerbox" role="dialog" aria-modal="true"><div class="simdrawerhead">${kit.icon(selected ? 'users' : 'live', 22)}` +
    `<b class="simgrow">${selected ? kit.translate('Partie de ', 'Game by ') + kit.escapeHtml(selected.name) : kit.translate('Parties en cours', 'Live games')}</b>` +
    (selected
      ? `<button class="simiconbtn" data-act="gamelist" aria-label="${kit.translate('Retour', 'Back')}">${kit.icon('back', 20)}</button>`
      : '') +
    `<button class="simiconbtn" data-act="closedrawer" aria-label="${kit.translate('Fermer', 'Close')}">${kit.icon('close', 20)}</button></div>${body}</div>`
  );
}

/**
 * `gameDetailsHtml` - Function 🔎
 *
 * @param { object } entry - a clean list entry
 * @returns { string } - the game's details, then « Rejoindre » (open game) or the code field (« sur code »)
 */
export function gameDetailsHtml(entry) {
  const full = entry.joined >= entry.count;
  return (
    `<div class="simattn">${kit.icon('user', 20)}<div>${kit.translate('Hôte : ', 'Host: ')}<b>${kit.escapeHtml(entry.name)}</b></div></div>` +
    `<div class="simattn">${kit.icon('users', 20)}<div>${kit.escapeHtml(gameWaitersText(entry))}</div></div>` +
    `<div class="simattn">${kit.icon('clock', 20)}<div>${kit.escapeHtml(gameStateText(entry))}</div></div>` +
    `<div class="simattn">${kit.icon(entry.code ? 'key' : 'lock', 20)}<div>${
      entry.code
        ? kit.translate('Partie ouverte · code ', 'Open game · code ') + kit.escapeHtml(entry.code)
        : kit.translate("Sur code : demandez le code à l'hôte.", 'Code only: ask the host for the code.')
    }</div></div>` +
    (full
      ? `<div class="simwait">${kit.icon('users', 20)}${kit.translate('Tous les rangs sont pris.', 'Every rang is taken.')}</div>`
      : entry.code
        ? `<button class="btn simwide" data-act="joinlisted">${kit.icon('play', 20)}${kit.translate('Rejoindre', 'Join')}</button>`
        : `<input class="simcode" id="simListCode" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="code">` +
          `<button class="btn simwide" data-act="joincode">${kit.icon('key', 20)}${kit.translate('Rejoindre avec le code', 'Join with the code')}</button>`)
  );
}
