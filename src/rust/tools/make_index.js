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
 * @name: Les Trois Forts - Index Builder
 * @file: rust/tools/make_index.js
 * @type: JavaScript (Node.js)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> node tools/make_index.js ../pwa dist
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🏗️ Builds dist/index.html from pwa/index.html: identical markup/CSS, only the script tags change
// (the JS app files are replaced by the wasm-bindgen glue + a one-line bootstrap).

// import the Node.js modules we need (files & paths) 🧰
const fs = require('fs'),
  path = require('path');
// the pwa/ folder & the dist/ folder 📁
const pwaDir = process.argv[2],
  distDir = process.argv[3];
// the source page
let html = fs.readFileSync(path.join(pwaDir, 'index.html'), 'utf8');
// the JS app scripts (this exact line must stay in pwa/index.html) ...
const OLD =
  '<script src="hero.js"></script><script src="data.js"></script><script src="fun.js"></script><script src="i18n.js"></script><script src="i18n_fr.js"></script><script src="images.js"></script><script src="app.js"></script>';
// ... become the wasm-bindgen glue + the bootstrap 🦀
const NEW = '<script src="ltf.js"></script><script>wasm_bindgen({module_or_path:\'ltf_bg.wasm\'});</script>';
// not found? stop here ❌
if (!html.includes(OLD)) throw Error('script block not found in pwa/index.html');
// swap & write ✅
html = html.replace(OLD, NEW);
fs.writeFileSync(path.join(distDir, 'index.html'), html);
console.log('index.html', html.length);
