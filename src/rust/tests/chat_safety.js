/**
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
 * @name: Les Trois Forts - Chat safety regression test
 * @file: rust/tests/chat_safety.js
 * @type: JavaScript (Node.js)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> node rust/tests/chat_safety.js pwa/chat.js
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🛡️ Makes sure a crafted chat doc can never reach the page as HTML: loads the safety helpers of chat.js
// (escapeHtml, isSafeId, isSafePhoto, isSafeReaction) and feeds them good and evil values.

const fileSystem = require('fs');

// the chat module source & the helper definitions we test 📄
const source = fileSystem.readFileSync(process.argv[2] || 'pwa/chat.js', 'utf8');
const helperNames = [
  'escapeHtml',
  'SAFE_ID_PATTERN',
  'SAFE_PHOTO_PATTERN',
  'isSafeId',
  'isSafePhoto',
  'isSafeReaction',
];

/**
 * `definitionOf` - Function 🔍
 *
 * @param { string } name - a top-level `const` of chat.js
 * @returns { string } - its whole definition (up to the closing `;` of the statement)
 */
function definitionOf(name) {
  const start = source.indexOf('const ' + name + ' =');
  if (start < 0) throw new Error('missing helper ' + name);
  const end = source.indexOf(';\n', start);
  return source.slice(start, end + 1);
}

// 🧪 the helpers, rebuilt in a sandbox function
const helpers = new Function(
  helperNames.map(definitionOf).join('\n') + '\nreturn { ' + helperNames.join(', ') + ' };',
)();

// the checks: [description, result] ✅
const checks = [
  ['escapes a quote attack', !helpers.escapeHtml('"><img onerror=alert(1)>').includes('"')],
  ['accepts an auto id', helpers.isSafeId('Ab12Cd34Ef56Gh78Ij90')],
  ['refuses an id with a quote', !helpers.isSafeId('abc" onclick="x')],
  ['accepts a JPEG data URL', helpers.isSafePhoto('data:image/jpeg;base64,/9j/4AAQSkZJRg==')],
  ['refuses a broken-out photo', !helpers.isSafePhoto('data:image/jpeg;base64,AAAA" onerror="alert(1)')],
  ['refuses a javascript: photo', !helpers.isSafePhoto('javascript:alert(1)')],
  ['refuses an svg photo', !helpers.isSafePhoto('data:image/svg+xml;base64,PHN2Zz4=')],
  ['accepts an emoji reaction', helpers.isSafeReaction('❤️')],
  ['refuses an HTML reaction', !helpers.isSafeReaction('<img src=x onerror=alert(1)>')],
  ['refuses a long reaction', !helpers.isSafeReaction('😀'.repeat(20))],
];

// 📣 the report
const failures = checks.filter((check) => !check[1]);
checks.forEach((check) => console.log((check[1] ? '✅ ' : '❌ ') + check[0]));
console.log('chat_safety: ' + (checks.length - failures.length) + '/' + checks.length + ' passed');
process.exit(failures.length ? 1 : 0);
