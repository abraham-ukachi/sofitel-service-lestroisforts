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
 * @name: Les Trois Forts - Swipe between tabs
 * @file: pwa/swipe.js
 * @type: JavaScript
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script src="swipe.js"
 *    -|> swipe left on the About drawer: Infos → Parcours → Crédits
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 👉 Swipe between tabs & chips everywhere in the app (JS & Rust builds alike: it only reads the DOM).
// A horizontal swipe to the left opens the next tab, to the right the previous one (About drawer,
// Carte courses & categories, Mise en place tabs, leaderboard months, the owner dashboard tabs...).
// It taps the tab for you, so each page keeps its own logic, then slides the new content in.

(() => {
  'use strict';

  // ===== WHAT COUNTS AS TABS 🗂️ ===== //

  // tab bars & chip rows that switch a view (not quiz answers, not settings toggles) 🗂️
  const GROUP_SELECTOR = [
    '.abtchips',
    '.settabs',
    '.ctabs',
    '.chips.scroll',
    '.admtabs',
    '[role="tablist"]',
    '.chips',
  ].join(',');

  // where a swipe never switches tabs: typing, maps & photos, the team chat (swipe = reply), the scanner,
  // the welcome slides and anything that scrolls sideways by itself ✋
  const IGNORE_SELECTOR =
    'input, textarea, select, [contenteditable], canvas, video, audio, .zs, .tb, .scanov, #wlc, [data-noswipe]';

  // the gesture: at least 60 px sideways, clearly more sideways than down, in under 0.7 s 📏
  const MIN_DISTANCE = 60;
  const DIRECTION_RATIO = 1.6;
  const MAX_DURATION_MS = 700;

  // ===== HELPERS 🧰 ===== //

  /**
   * `isVisible` - Function 👀
   *
   * @param { Element } element - any element
   * @returns { boolean } - true when it's on screen (not hidden, not inside a commented-out block)
   */
  function isVisible(element) {
    return (
      !!element && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden'
    );
  }

  /**
   * `tabItems` - Function 🔘
   *
   * @param { Element } group - a tab bar or chip row
   * @returns { Array<HTMLElement> } - its visible tabs (help « ? » buttons left out)
   */
  function tabItems(group) {
    return [...group.children].filter(
      (child) =>
        (child.tagName === 'BUTTON' || child.getAttribute('role') === 'tab' || child.dataset.tab) &&
        !child.classList.contains('q') &&
        child.getAttribute('aria-label') !== '?' &&
        isVisible(child),
    );
  }

  /**
   * `isActive` - Function ✅
   *
   * @param { HTMLElement } item - one tab
   * @returns { boolean } - true for the open tab
   */
  function isActive(item) {
    return item.classList.contains('on') || item.getAttribute('aria-selected') === 'true';
  }

  /**
   * `isTabGroup` - Function 🗂️
   *
   * A plain `.chips` row only counts when its chips say they're tabs (`data-tab`), so quiz answers
   * and filters are never changed by a swipe.
   *
   * @param { Element } group - a candidate
   * @returns { boolean } - true for a real tab bar with exactly one open tab
   */
  function isTabGroup(group) {
    if (!isVisible(group)) return false;
    const items = tabItems(group);
    if (items.length < 2 || items.filter(isActive).length !== 1) return false;
    const isPlainChips =
      group.classList.contains('chips') &&
      !group.classList.contains('scroll') &&
      !group.classList.contains('settabs') &&
      group.getAttribute('role') !== 'tablist';
    return !isPlainChips || items.every((item) => item.dataset.tab);
  }

  /**
   * `scrollsSideways` - Function ↔️
   *
   * @param { Element } start - where the finger went down
   * @returns { boolean } - true when something under the finger scrolls horizontally (a chip row, a gallery)
   */
  function scrollsSideways(start) {
    for (let element = start; element && element !== document.body; element = element.parentElement) {
      if (element.scrollWidth > element.clientWidth + 4) {
        const overflowX = getComputedStyle(element).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') return true;
      }
    }
    return false;
  }

  /**
   * `scopeOf` - Function 🧭
   *
   * @param { Element } target - where the finger went down
   * @returns { Element | null } - the drawer, page or overlay the swipe belongs to (null = ignore it)
   */
  function scopeOf(target) {
    const chatOverlay = target.closest('.chatov');
    // the team chat: a sideways swipe replies to a message 💬
    if (chatOverlay && chatOverlay.querySelector('.cpill')) return null;
    return target.closest('.ov, .chatov, #setPage') || document.getElementById('app');
  }

  /**
   * `pickGroups` - Function 🎯
   *
   * @param { Element } scope - the drawer or page
   * @param { number } touchY - where the finger went down (vertical)
   * @returns { Array<Element> } - the tab bars to try, the closest one above the finger first
   */
  function pickGroups(scope, touchY) {
    const groups = [...new Set(scope.querySelectorAll(GROUP_SELECTOR))].filter(isTabGroup);
    // only the groups of this scope (not those of a drawer nested inside it)
    const own = groups.filter((group) => scopeOf(group) === scope || scope.id === 'app');
    const above = own.filter((group) => group.getBoundingClientRect().top <= touchY);
    const below = own.filter((group) => group.getBoundingClientRect().top > touchY);
    return [...above.reverse(), ...below];
  }

  /**
   * `slideIn` - Function 🎞️
   *
   * Slides the new view in from the side the finger came from.
   *
   * @param { Element } scope - the drawer or page
   * @param { number } direction - 1 = next (comes from the right), -1 = previous
   * @returns { void }
   */
  function slideIn(scope, direction) {
    requestAnimationFrame(() => {
      const fresh = scope.isConnected ? scope : document.getElementById('app');
      const content =
        (fresh && (fresh.querySelector('#abtView, #list, .setbody, .admbody, .sbody') || fresh)) || null;
      if (!content || !content.animate) return;
      content.animate(
        [
          { transform: `translateX(${direction * 28}px)`, opacity: 0.35 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
    });
  }

  /**
   * `switchTab` - Function 🔀
   *
   * @param { Element } target - where the finger went down
   * @param { number } touchY - its vertical position
   * @param { number } direction - 1 = next tab, -1 = previous tab
   * @returns { boolean } - true when a tab changed
   */
  function switchTab(target, touchY, direction) {
    const scope = scopeOf(target);
    if (!scope) return false;
    for (const group of pickGroups(scope, touchY)) {
      const items = tabItems(group);
      const nextItem = items[items.findIndex(isActive) + direction];
      if (!nextItem) continue;
      nextItem.click();
      // keep the new tab in view in a scrolling chip row
      if (nextItem.isConnected && nextItem.scrollIntoView)
        nextItem.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      if (navigator.vibrate) navigator.vibrate(8);
      slideIn(scope, direction);
      return true;
    }
    return false;
  }

  // ===== THE GESTURE 👆 ===== //

  // the finger that went down (or null) 👆
  let gesture = null;

  addEventListener(
    'touchstart',
    (event) => {
      const target = event.target;
      if (
        event.touches.length !== 1 ||
        !target.closest ||
        target.closest(IGNORE_SELECTOR) ||
        scrollsSideways(target)
      ) {
        gesture = null;
        return;
      }
      const touch = event.touches[0];
      gesture = { target, x: touch.clientX, y: touch.clientY, startedAt: Date.now() };
    },
    { passive: true, capture: true },
  );

  addEventListener(
    'touchend',
    (event) => {
      if (!gesture) return;
      const touch = event.changedTouches[0],
        deltaX = touch.clientX - gesture.x,
        deltaY = touch.clientY - gesture.y,
        started = gesture;
      gesture = null;
      if (
        Math.abs(deltaX) < MIN_DISTANCE ||
        Math.abs(deltaX) < Math.abs(deltaY) * DIRECTION_RATIO ||
        Date.now() - started.startedAt > MAX_DURATION_MS
      )
        return;
      // ⬅️ swipe left = next tab, ➡️ swipe right = previous tab
      switchTab(started.target, started.y, deltaX < 0 ? 1 : -1);
    },
    { passive: true, capture: true },
  );

  addEventListener('touchcancel', () => (gesture = null), { passive: true, capture: true });

  // 🧪 for tests & other scripts
  window.LTFswipeTab = switchTab;
})();
