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
 * @name: Les Trois Forts - Test (load.js)
 * @file: rust/tests/load.js
 * @type: JavaScript (Node.js + jsdom)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> NODE_PATH=/tmp/jt/node_modules node rust/tests/load.js
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// Shared jsdom loader for the old JS app (pwa/) and the Rust/wasm app (rust/dist/).
// Needs jsdom@24 (npm i jsdom@24 in the folder you run from, e.g. /tmp/jt; set NODE_PATH or run from there).
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const util = require('util');
const ROOT = path.join(__dirname, '..', '..');
const PWA = path.join(ROOT, 'pwa') + '/',
  DIST = path.join(ROOT, 'rust', 'dist') + '/';
let wasmModule = null;
function mulberry(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let state = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    state = (state + Math.imul(state ^ (state >>> 7), 61 | state)) ^ state;
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}
// opts: {seed, now (ms), storage (string for ltf_v1), idb (an IDBFactory, e.g. fake-indexeddb)}
function load(kind, opts) {
  opts = opts || {};
  const root = kind === 'rs' ? DIST : PWA;
  let html = fs
    .readFileSync(root + 'index.html', 'utf8')
    .replace(/<script>if\('serviceWorker'[^<]*<\/script>/, '');
  if (kind === 'rs') {
    if (!wasmModule) wasmModule = new WebAssembly.Module(fs.readFileSync(DIST + 'ltf_bg.wasm'));
    const glue = fs.readFileSync(DIST + 'ltf.js', 'utf8');
    html = html.replace(
      /<script src="ltf.js"><\/script><script>wasm_bindgen\([^<]*\);<\/script>/,
      () => '<script>' + glue + '</script><script>wasm_bindgen.initSync({module:window.__WASM});</script>',
    );
    if (!html.includes('initSync')) throw Error('bootstrap not found in dist/index.html');
  } else {
    html = html.replace(
      /<script src="([^"]+)"><\/script>/g,
      (whole, src) => '<script>' + fs.readFileSync(root + src, 'utf8') + '</script>',
    );
  }
  const errs = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: opts.url || 'https://x.test/',
    beforeParse(window) {
      window.matchMedia = () => ({ matches: false, addEventListener() {} });
      window.scrollTo = () => {};
      window.HTMLCanvasElement.prototype.getContext = () => ({
        clearRect() {},
        save() {},
        translate() {},
        rotate() {},
        fillRect() {},
        restore() {},
        drawImage() {},
      });
      window.addEventListener('error', (event) => errs.push(event.message));
      window.console.error = (...args) => errs.push(args.join(' '));
      window.WebAssembly = WebAssembly;
      window.__WASM = wasmModule;
      window.TextDecoder = util.TextDecoder;
      window.TextEncoder = util.TextEncoder;
      if (opts.session) {
        for (const key in opts.session) window.sessionStorage.setItem(key, opts.session[key]);
      }
      if (opts.idb) {
        window.indexedDB = opts.idb;
      }
      if (opts.storage !== undefined) window.localStorage.setItem('ltf_v1', opts.storage);
      if (opts.seed !== undefined) {
        const random = mulberry(opts.seed);
        window.Math.random = random;
      }
      if (opts.now !== undefined) {
        const RealDate = window.Date,
          fixedNow = opts.now;
        const FakeDate = function (...args) {
          return args.length ? new RealDate(...args) : new RealDate(fixedNow);
        };
        FakeDate.now = () => fixedNow;
        FakeDate.UTC = RealDate.UTC;
        FakeDate.parse = RealDate.parse;
        FakeDate.prototype = RealDate.prototype;
        window.Date = FakeDate;
      }
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errs };
}
module.exports = { load, PWA, DIST };
