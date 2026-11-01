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
 * @name: Les Trois Forts - Data Generator
 * @file: rust/tools/gen_data.js
 * @type: JavaScript (Node.js)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> node tools/gen_data.js ../pwa ltf/data
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 📦 Converts the JS data files of pwa/ into the JSON files embedded in the wasm (`include_str!`).
// usage: node tools/gen_data.js [path/to/pwa] [out dir]

// import the Node.js modules we need (files, sandbox, paths) 🧰
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
// the pwa/ folder & the output folder (rust/ltf/data by default) 📁
const pwaDir = process.argv[2] || path.join(__dirname, '../../pwa'),
  outDir = process.argv[3] || path.join(__dirname, '../ltf/data');
// make sure the output folder exists 🌱
fs.mkdirSync(outDir, { recursive: true });
// a tiny sandbox with a `window`, where the data files run exactly like in the browser 🛡️
const ctx = { window: {} };
vm.createContext(ctx);
// run every data file, in the same order as index.html
for (const file of ['data.js', 'fun.js', 'i18n.js', 'i18n_fr.js', 'images.js', 'hero.js'])
  vm.runInContext(fs.readFileSync(path.join(pwaDir, file), 'utf8'), ctx, { filename: file });
// the globals they set -> the JSON files the Rust crate embeds 🗂️
const sandboxWindow = ctx.window,
  out = {
    'data.json': sandboxWindow.LTF,
    'en.json': sandboxWindow.LTF_EN,
    'info_en.json': sandboxWindow.LTF_INFO,
    'info_fr.json': sandboxWindow.LTF_INFO_FR,
    'images.json': sandboxWindow.LTF_IMG,
  };
// write them (a missing global is an error ❌)
for (const [fileName, value] of Object.entries(out)) {
  if (value === undefined) throw Error('missing ' + fileName);
  fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(value));
  console.log(fileName, JSON.stringify(value).length);
}
// the hero image (kept in index.html, just logged) 🖼️
console.log('HERO', sandboxWindow.HERO);
