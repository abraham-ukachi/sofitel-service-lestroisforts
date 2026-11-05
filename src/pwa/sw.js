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
 * @name: Les Trois Forts - Service Worker (JavaScript build)
 * @file: pwa/sw.js
 * @type: JavaScript (Service Worker)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> navigator.serviceWorker.register('sw.js');
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🛡️ The service worker of the original JavaScript build (kept as the reference of the Rust port):
// network first, cache as a fallback (📴 offline).

// the cache of this version 🏷️
const CACHE = 'ltf-v95';
// the scanner cache (big model files, kept across app versions): bump it when pwa/scan/ changes 📷
const SCAN_CACHE = 'ltf-scan-v5';
// the app shell, precached on install 📦
const ASSETS = [
  './',
  'index.html',
  'app.js',
  'data.js',
  'i18n.js',
  'i18n_fr.js',
  'images.js',
  'hero.js',
  'hero.jpg',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'welcome.js',
  'about.js',
  'swipe.js',
  'setup.js',
  'img/setup-table.jpg',
  'img/setup-seau1.jpg',
  'img/setup-seau2.jpg',
  'img/setup-seau3.jpg',
  'img/setup-rouges.jpg',
  'emoji.json',
  'stickers/bell.webp',
  'stickers/bouillabaisse.webp',
  'stickers/champagne.webp',
  'stickers/cheese.webp',
  'stickers/chef.webp',
  'stickers/cloche.webp',
  'stickers/cocktail.webp',
  'stickers/espresso.webp',
  'stickers/oysters.webp',
  'stickers/pavlova.webp',
  'stickers/red-wine.webp',
  'stickers/vieux-port.webp',
  'stickers/waiter.webp',
];

// 📥 install: precache the shell & take over right away
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// ✅ activate: delete every other cache 🧹
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE && key !== SCAN_CACHE).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// 🔗 fetch: same-origin GET requests only (Firebase, Google & co. go straight to the network)
self.addEventListener('fetch', (event) => {
  // not a GET, or another origin? let the browser handle it
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  // the push server & any other API never get cached 🚫
  // the push API & the Google sign-in pages (`/__/auth/`, proxied to Firebase) always go to the network 🔑
  const pathname = new URL(event.request.url).pathname;
  if (pathname.startsWith('/api/') || pathname.startsWith('/__/')) return;
  // 🧩 the scanner's model parts: straight to the network (scan.js stores the joined model itself)
  if (pathname.startsWith('/models/')) return;
  // 📷 scan assets: cache first (ignoring the query), then the network (and keep a good copy)
  if (new URL(event.request.url).pathname.includes('/scan/')) {
    event.respondWith(
      caches.open(SCAN_CACHE).then((cache) =>
        cache.match(event.request, { ignoreSearch: true }).then(
          (match) =>
            match ||
            fetch(event.request).then((response) => {
              if (response.ok) event.waitUntil(cache.put(event.request, response.clone()));
              return response;
            }),
        ),
      ),
    );
    return;
  }
  // 🌐 everything else: network first (and refresh the cache with good answers only), else the cache,
  // else (pages only) the app shell `index.html`
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // keep a copy of a complete, successful answer for offline use (finished before the worker sleeps)
        if (response.ok && response.status === 200) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then(
            (match) =>
              match || (event.request.mode === 'navigate' ? caches.match('index.html') : Response.error()),
          ),
      ),
  );
});

// ===== PUSH NOTIFICATIONS 📲 ===== //

// 📩 push: a teammate posted in the team chat (sent by `api/notify.js`), show it unless the app is on screen
self.addEventListener('push', (event) => {
  // the payload { title, body, tag } (plain text as a fallback)
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // the app is open & visible? the chat chimes there, no notification needed 🔔
      if (windows.some((client) => client.visibilityState === 'visible')) return;
      return self.registration.showNotification(payload.title || 'Les Trois Forts', {
        body: payload.body || '',
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: payload.tag || 'ltf-chat',
        renotify: true,
        data: { url: './?chat=1' },
      });
    }),
  );
});

// 👆 notification tapped: focus the app & open the chat (or start the app on the chat)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // an app window is already open: bring it up and ask it to open the chat 💬
      const openWindow = windows[0];
      if (openWindow) {
        openWindow.postMessage({ type: 'open-chat' });
        return openWindow.focus();
      }
      return self.clients.openWindow((event.notification.data && event.notification.data.url) || './?chat=1');
    }),
  );
});
