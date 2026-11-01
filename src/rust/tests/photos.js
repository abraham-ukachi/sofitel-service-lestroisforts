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
 * @name: Les Trois Forts - Test (photos.js)
 * @file: rust/tests/photos.js
 * @type: JavaScript (Node.js + jsdom)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> NODE_PATH=/tmp/jt/node_modules node rust/tests/photos.js
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// Photos survive the switch: a photo saved by the OLD JS app in IndexedDB 'ltf_photos'/'p'
// must be shown by the Rust app; "restore default photo" must delete it again.
// Needs fake-indexeddb (npm i fake-indexeddb@6 next to jsdom).
const { IDBFactory, IDBKeyRange } = require('fake-indexeddb');
const { load } = require('./load.js');
const tick = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds || 50));
const PHOTO = 'data:image/jpeg;base64,/9j/TEST';
(async () => {
  const factory = new IDBFactory();
  // 1. old app writes a user photo through its own code path (idbPut), we emulate exactly its call
  await new Promise((res) => {
    const request = factory.open('ltf_photos', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('p');
    request.onsuccess = () => {
      const transaction = request.result.transaction('p', 'readwrite');
      transaction.objectStore('p').put(PHOTO, 'd:Tataki de bœuf');
      transaction.oncomplete = () => {
        request.result.close();
        res();
      };
    };
  });
  // 2. Rust app opens the same DB (indexedDB injected before wasm init)
  const loader = require('./load.js');
  const page = loader.load('rs', { seed: 1, idb: factory });
  await tick(300);
  page.w.LTFgo('carte');
  const searchInput = page.w.document.querySelector('#srch');
  searchInput.value = 'tataki';
  searchInput.oninput();
  const img = page.w.document.querySelector('#list img.thumb');
  console.log('rust shows saved photo:', img && img.getAttribute('src') === PHOTO);
  const id = page.w.LTFitems().find((item) => item.ikey === 'd:Tataki de bœuf').id;
  page.w.LTFinfo(id);
  console.log(
    'tag:',
    page.w.document.querySelector('.ptag').textContent,
    '| reset btn:',
    !!page.w.document.querySelector('#phrst'),
  );
  page.w.document.querySelector('#phrst').click();
  page.w.document.querySelector('#dok').click();
  await tick(300);
  const left = await new Promise((res) => {
    const request = factory.open('ltf_photos', 1);
    request.onsuccess = () => {
      const countRequest = request.result.transaction('p').objectStore('p').count();
      countRequest.onsuccess = () => res(countRequest.result);
    };
  });
  console.log(
    'photos left in IDB after restore:',
    left,
    '| tag now:',
    page.w.document.querySelector('.ptag') && page.w.document.querySelector('.ptag').textContent,
  );
  console.log('errors', page.errs);
})();

// 3. Upload flow (camera/file input -> resize to max 900px -> JPEG 0.8 -> IndexedDB), JS vs Rust,
//    with a fake Image decoder and canvas encoder (jsdom has none).
async function upload(kind) {
  const factory = new IDBFactory();
  const page = require('./load.js').load(kind, { seed: 2, idb: factory });
  const window = page.w,
    document = window.document;
  window.Image = function () {
    const fakeImage = { width: 2000, height: 1000 };
    Object.defineProperty(fakeImage, 'src', {
      set(value) {
        fakeImage._src = value;
        setTimeout(() => fakeImage.onload && fakeImage.onload(), 0);
      },
    });
    return fakeImage;
  };
  window.HTMLCanvasElement.prototype.toDataURL = function (type, quality) {
    return `data:${type};q=${quality};${this.width}x${this.height}`;
  };
  await tick(200);
  const id = window.LTFitems().find((item) => item.ikey === 'd:Tataki de bœuf').id;
  window.LTFgo('carte');
  window.LTFinfo(id);
  const inp = document.querySelector('#phin');
  const file = new window.File([new Uint8Array([1, 2, 3])], 'a.jpg', { type: 'image/jpeg' });
  Object.defineProperty(inp, 'files', { value: [file] });
  inp.onchange();
  await tick(400);
  const stored = await new Promise((res) => {
    const request = factory.open('ltf_photos', 1);
    request.onsuccess = () => {
      const getRequest = request.result.transaction('p').objectStore('p').get('d:Tataki de bœuf');
      getRequest.onsuccess = () => res(getRequest.result);
    };
  });
  const toast = document.querySelector('.toast');
  return {
    stored,
    toast: toast && toast.textContent,
    tag: document.querySelector('.ptag') && document.querySelector('.ptag').textContent,
    sheet: document.querySelector('#sheet').innerHTML,
    errs: page.errs,
  };
}
(async () => {
  await tick(1200);
  const jsResult = await upload('js'),
    rsResult = await upload('rs');
  console.log(
    'upload js:',
    jsResult.stored,
    jsResult.toast,
    jsResult.tag,
    '| rs:',
    rsResult.stored,
    rsResult.toast,
    rsResult.tag,
    '| sheet equal',
    jsResult.sheet === rsResult.sheet,
    '| errors',
    jsResult.errs.length,
    rsResult.errs.length,
  );
  process.exit(0);
})();
