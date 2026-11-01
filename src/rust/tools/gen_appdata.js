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
 * @name: Les Trois Forts - App Tables Generator
 * @file: rust/tools/gen_appdata.js
 * @type: JavaScript (Node.js)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> node tools/gen_appdata.js ../pwa ltf/data
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🎨 Extracts the literal tables embedded in pwa/app.js (icons, the fixed "facts" quiz) into JSON,
// so the Rust app uses exactly the same strings. usage: node tools/gen_appdata.js [pwa] [out]
// ⚠️ It reads app.js as TEXT: `const IC = {` ... `};` and `const factQs = EN ? [` ... `factQs.forEach`.

// import the Node.js modules we need (files & paths) 🧰
const fs = require('fs'),
  path = require('path');
// the pwa/ folder & the output folder (rust/ltf/data by default) 📁
const pwaDir = process.argv[2] || path.join(__dirname, '../../pwa'),
  outDir = process.argv[3] || path.join(__dirname, '../ltf/data');
// the app source `appSource` 📜 (`appSource` & `factsSource` keep their short names: `eval` below shares this scope)
const appSource = fs.readFileSync(path.join(pwaDir, 'app.js'), 'utf8');

/**
 * `slice` - Function ✂️
 *
 * @param { string } startText - where the table starts
 * @param { string } endText - the first text after it that ends the table
 * @returns { string } - the source between the two (throws when not found)
 */
const slice = (startText, endText) => {
  const startIndex = appSource.indexOf(startText);
  const endIndex = appSource.indexOf(endText, startIndex);
  if (startIndex < 0 || endIndex < 0) throw Error('not found ' + startText);
  return appSource.slice(startIndex, endIndex);
};

// 🎨 the icons table { name: '<path .../>' }
const icons = eval('(' + slice('const IC = {', '};').replace('const IC = ', '') + '})');
// 📌 the fixed facts: `EN ? [english] : [french]` -> two arrays
let factsSource = slice('const factQs = EN ? [', 'factQs.forEach');
factsSource = factsSource.replace('const factQs = EN ? ', '').trim().replace(/;$/, '');
const [en, fr] = factsSource
  .split(/\]\s*:\s*\[\n/)
  .map((part, index) => (index === 0 ? part + ']' : '[' + part));
const facts = { en: eval(en), fr: eval(fr) };
// write the JSON files 🗂️
fs.writeFileSync(path.join(outDir, 'icons.json'), JSON.stringify(icons));
fs.writeFileSync(path.join(outDir, 'factqs.json'), JSON.stringify(facts));
// ✅ report
console.log(Object.keys(icons).length, 'icons', facts.en.length, facts.fr.length, 'facts');
