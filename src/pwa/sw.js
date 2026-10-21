/*
 * @license MIT
 * ~~~~~~~~~~~~
 * sofitel-service-lestroisforts
 * ~~~~~~~~~~~~
 * Copyright (c) 2026 Abraham Ukachi. The Les Trois Forts Project.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
const CACHE = 'ltf-v49';
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
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

// 🔗 fetch: network first (and refresh the cache), else the cache, else index.html
self.addEventListener('fetch', (event) => {
  // only GET requests are cached
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // keep a copy for offline use
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((match) => match || caches.match('index.html'))),
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
