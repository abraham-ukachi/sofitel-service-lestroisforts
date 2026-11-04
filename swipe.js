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
   * `groupKey` - Function 🔑
   *
   * @param { Element } group - a tab bar or chip row
   * @returns { string } - its class list as a selector, to find the same bar again after a re-render
   */
  function groupKey(group) {
    return group.className
      ? '.' + group.className.trim().split(/\s+/).join('.')
      : group.getAttribute('role') === 'tablist'
        ? '[role="tablist"]'
        : '';
  }

  /**
   * `keepPlace` - Function 📌
   *
   * A tab tap may redraw the whole screen (scroll to the top + the little enter animation). For a
   * swipe that feels like a reload, so this puts the page back where it was, with no animation,
   * and leaves the chip row where the finger left it.
   *
   * @param { number } scrollY - the page scroll before the switch
   * @param { string } key - the tab bar's selector
   * @param { number } rowScroll - the chip row's sideways scroll before the switch
   * @returns { void }
   */
  function keepPlace(scrollY, key, rowScroll) {
    const app = document.getElementById('app');
    if (app && app.classList.contains('enter')) {
      app.classList.remove('enter');
      if (app.getAnimations) app.getAnimations().forEach((animation) => animation.cancel());
    }
    let group = null;
    try {
      group = key ? document.querySelector(key) : null;
    } catch (error) {}
    if (Math.abs(window.scrollY - scrollY) > 1) {
      // never leave the tab bar above the screen ☝️
      const barTop = group ? group.getBoundingClientRect().top + window.scrollY - 8 : scrollY;
      window.scrollTo(0, Math.max(0, Math.min(scrollY, barTop)));
    }
    if (!group) return;
    group.scrollLeft = rowScroll;
    const active = tabItems(group).find(isActive);
    if (active && active.scrollIntoView)
      active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }

  // ===== THE SLIDE 🎞️ ===== //

  // how long a page takes to slide across ⏱️
  const SLIDE_MS = 280;
  const SLIDE_EASING = 'cubic-bezier(.25,.8,.25,1)';

  /**
   * `contentAfter` - Function 📄
   *
   * The « page » of a tab bar = everything that comes after it, up to the drawer or screen.
   *
   * @param { Element } group - a tab bar
   * @returns { Array<HTMLElement> } - the elements under it
   */
  function contentAfter(group) {
    const stop = group.closest('.sheet, .ov, #app') || document.body;
    let node = group;
    while (node && node !== stop) {
      const followers = [];
      for (let sibling = node.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
        if (sibling.tagName !== 'SCRIPT' && sibling.tagName !== 'STYLE' && !sibling.classList.contains('cta'))
          followers.push(sibling);
      }
      if (followers.length) return followers;
      node = node.parentElement;
    }
    return [];
  }

  /**
   * `snapshot` - Function 📸
   *
   * Copies the current page into a fixed layer, so it can slide away after the tab redraws it.
   *
   * @param { Array<HTMLElement> } elements - the page under the tab bar
   * @returns { HTMLElement | null } - the layer (not attached yet), or null
   */
  function snapshot(elements) {
    const visible = elements.filter((element) => element.getClientRects().length);
    if (!visible.length) return null;
    const first = visible[0].getBoundingClientRect();
    const parentBox = visible[0].parentElement.getBoundingClientRect();
    const top = Math.max(0, first.top);
    const layer = document.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText =
      `position:fixed;left:${parentBox.left}px;top:${top}px;width:${parentBox.width}px;` +
      `height:${Math.max(0, innerHeight - top)}px;overflow:hidden;pointer-events:none;z-index:5;`;
    const inner = document.createElement('div');
    inner.style.cssText = `position:absolute;left:${first.left - parentBox.left}px;right:0;top:${first.top - top}px;`;
    visible.forEach((element) => {
      const copy = element.cloneNode(true);
      copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'));
      inner.appendChild(copy);
    });
    layer.appendChild(inner);
    return layer;
  }

  /**
   * `slidePages` - Function 🎞️
   *
   * The old page leaves on one side while the new one comes in from the other, as if the tabs
   * were pages lying next to each other.
   *
   * @param { HTMLElement | null } oldLayer - the snapshot of the old page
   * @param { Element | null } group - the tab bar (after the redraw)
   * @param { number } direction - 1 = next (new page comes from the right), -1 = previous
   * @returns { void }
   */
  function slidePages(oldLayer, group, direction) {
    const reduced = !!window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fresh = group ? contentAfter(group) : [];
    if (reduced || !oldLayer || !fresh.length || !document.body.animate) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflowX;
    root.style.overflowX = 'clip';
    document.body.appendChild(oldLayer);
    const timing = { duration: SLIDE_MS, easing: SLIDE_EASING };
    oldLayer.firstChild.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(${-direction * 100}%)` }],
      timing,
    );
    let finished = null;
    fresh.forEach((element) => {
      finished = element.animate(
        [{ transform: `translateX(${direction * 100}%)` }, { transform: 'translateX(0)' }],
        timing,
      );
    });
    const cleanUp = () => {
      oldLayer.remove();
      root.style.overflowX = previousOverflow;
    };
    if (finished) finished.onfinish = finished.oncancel = cleanUp;
    setTimeout(cleanUp, SLIDE_MS + 120);
  }

  // ===== TAP OR SWIPE ON A TAB 🔀 ===== //

  // what the page looked like just before a tab was pressed (or null) 📸
  let pending = null;

  /**
   * `onTabPress` - Function 👇 (capture)
   *
   * Before the tab's own handler runs: remember the place and take the snapshot.
   *
   * @param { MouseEvent } event - the click
   * @returns { void }
   */
  function onTabPress(event) {
    pending = null;
    const target = event.target;
    if (!target.closest || target.closest(IGNORE_SELECTOR)) return;
    const group = target.closest(GROUP_SELECTOR);
    if (!group || !isTabGroup(group)) return;
    const items = tabItems(group);
    const pressed = items.find((item) => item.contains(target));
    const from = items.findIndex(isActive);
    const to = items.indexOf(pressed);
    if (!pressed || to === from || from < 0) return;
    pending = {
      direction: to > from ? 1 : -1,
      scrollY: window.scrollY,
      key: groupKey(group),
      group,
      rowScroll: group.scrollLeft,
      layer: snapshot(contentAfter(group)),
    };
  }

  /**
   * `onTabPressed` - Function ✅ (bubble)
   *
   * After the tab's handler redrew the page: put the page back in place and slide.
   *
   * @returns { void }
   */
  function onTabPressed() {
    const press = pending;
    pending = null;
    if (!press) return;
    keepPlace(press.scrollY, press.key, press.rowScroll);
    let group = press.group.isConnected ? press.group : null;
    if (!group) {
      try {
        group = press.key ? document.querySelector(press.key) : null;
      } catch (error) {}
    }
    slidePages(press.layer, group, press.direction);
  }

  addEventListener('click', onTabPress, true);
  addEventListener('click', onTabPressed, false);

  /**
   * `switchTab` - Function 🔀
   *
   * Selects the next or previous tab, exactly like a tap on it (same slide).
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
