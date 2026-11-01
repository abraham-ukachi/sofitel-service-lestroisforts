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
 * @name: Les Trois Forts - Test (async_boot.js)
 * @file: rust/tests/async_boot.js
 * @type: JavaScript (Node.js + jsdom)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> NODE_PATH=/tmp/jt/node_modules node rust/tests/async_boot.js
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// Loads rust/dist/index.html exactly as deployed (async bootstrap: fetch + instantiateStreaming),
// serving files from rust/dist through a fetch shim. Checks that the hub renders.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const util = require('util');
const DIST = path.join(__dirname, '..', 'dist');
let html = fs
  .readFileSync(path.join(DIST, 'index.html'), 'utf8')
  .replace(
    '<script src="ltf.js"></script>',
    '<script>' + fs.readFileSync(path.join(DIST, 'ltf.js'), 'utf8') + '</script>',
  );
const fetched = [];
const errs = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://x.test/sofitel-ltf/',
  beforeParse(window) {
    window.matchMedia = () => ({ matches: true, addEventListener() {} });
    window.scrollTo = () => {};
    window.WebAssembly = WebAssembly;
    window.TextDecoder = util.TextDecoder;
    window.TextEncoder = util.TextEncoder;
    window.Response = Response;
    window.fetch = (url) => {
      const fileName = String(url).replace(/^.*\//, '');
      fetched.push(fileName);
      return Promise.resolve(
        new Response(fs.readFileSync(path.join(DIST, fileName)), {
          headers: { 'content-type': 'application/wasm' },
        }),
      );
    };
    window.addEventListener('error', (event) => errs.push(event.message));
    window.console.error = (...args) => errs.push(args.join(' '));
  },
});
setTimeout(() => {
  const window = dom.window;
  console.log(
    'fetched',
    fetched,
    '| theme',
    window.document.documentElement.dataset.theme,
    '| hub rendered',
    !!window.document.querySelector('#app .hero'),
    '| tabbar',
    !!window.document.querySelector('#tabbar .on'),
    '| LTFtest',
    JSON.stringify(window.LTFtest && window.LTFtest()),
    '| errors',
    errs,
  );
  process.exit(0);
}, 1500);
