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
 * @name: Les Trois Forts - Live Content Boot
 * @file: pwa/content-boot.js
 * @type: JavaScript (classic script, runs before the app)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script src="content-boot.js" (right before app.js / ltf.js)
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 📝 Live content: the owner edits dishes, wines, the daily briefing... in the dashboard; content.js saves
// them on every phone in localStorage `ltf_content_v1` = { section: value }. This tiny script runs BEFORE the
// app, so the app (JS `window.LTF`, or the Rust/wasm build that reads the same key) starts with them.
// 🛟 Crash guard: if the app didn't draw its tab bar after the last start with live content, that content
// is set aside (`ltf_content_bad`) and the app starts on the built-in menu instead.

(function () {
  // the storage keys 🗝️
  const CONTENT_KEY = 'ltf_content_v1',
    PENDING_KEY = 'ltf_content_pending',
    BAD_KEY = 'ltf_content_bad';
  // ⏱️ how long the app may take to draw its tab bar (ms)
  const BOOT_TIMEOUT = 25000;

  try {
    const saved = localStorage.getItem(CONTENT_KEY);
    if (!saved) return;
    // 🛟 the last start with this content never finished? set it aside
    if (localStorage.getItem(PENDING_KEY) === '1') {
      localStorage.setItem(BAD_KEY, saved);
      localStorage.removeItem(CONTENT_KEY);
      localStorage.removeItem(PENDING_KEY);
      return;
    }
    const content = JSON.parse(saved);
    // 🔀 the JS app: replace the sections in window.LTF (same kind of value only)
    if (window.LTF && content && typeof content === 'object') {
      Object.keys(content).forEach((section) => {
        const original = window.LTF[section],
          replacement = content[section];
        const sameKind =
          original !== undefined &&
          Array.isArray(original) === Array.isArray(replacement) &&
          typeof original === typeof replacement;
        if (sameKind) window.LTF[section] = replacement;
      });
    }
    // ⏳ mark this start, cleared as soon as the tab bar shows up
    localStorage.setItem(PENDING_KEY, '1');
    const startedAt = Date.now();
    const watcher = setInterval(() => {
      if (document.querySelector('.tabbar')) {
        localStorage.removeItem(PENDING_KEY);
        clearInterval(watcher);
      } else if (Date.now() - startedAt > BOOT_TIMEOUT) {
        clearInterval(watcher);
      }
    }, 400);
  } catch (error) {
    // 🧹 unreadable content: drop it, the built-in menu is always there
    localStorage.removeItem(CONTENT_KEY);
  }
})();
