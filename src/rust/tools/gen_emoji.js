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
 * @name: Les Trois Forts - Emoji Data Generator
 * @file: rust/tools/gen_emoji.js
 * @type: JavaScript (Node.js script)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> NODE_PATH=<dir with emojibase-data> node rust/tools/gen_emoji.js pwa/emoji.json
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 😀 Builds `pwa/emoji.json` for the chat's emoji panel from the open `emojibase-data` package (MIT):
// [ [ [emoji, "english + french search words"], ... ] per tab ], skin tones left out,
// and only emojis up to Unicode Emoji 14 so they show on older phones too 📱.

// import the file helper 📁
const fs = require('fs');
// the English & French emoji lists (labels + tags)
const englishEmojis = require('emojibase-data/en/data.json'),
  frenchEmojis = require('emojibase-data/fr/data.json');

// the emojibase groups shown as tabs, in order (2 = skin tone components, skipped) 🗂️
const TAB_GROUPS = [0, 1, 3, 4, 5, 6, 7, 8, 9];
// the newest Emoji version we keep 🔢
const MAX_VERSION = 14;

/**
 * `searchWordsOf` - Function 🔎
 *
 * @param { object } emoji - an emojibase entry
 * @returns { string } - its label & tags, lowercased
 */
const searchWordsOf = (emoji) => [emoji.label || '', ...(emoji.tags || [])].join(' ').toLowerCase();

// the French entries by hexcode 🇫🇷
const frenchByHexcode = new Map(frenchEmojis.map((emoji) => [emoji.hexcode, emoji]));
// one list per tab
const tabs = TAB_GROUPS.map(() => []);
englishEmojis.forEach((emoji) => {
  const tabIndex = TAB_GROUPS.indexOf(emoji.group);
  if (tabIndex < 0 || emoji.version > MAX_VERSION) return;
  const french = frenchByHexcode.get(emoji.hexcode) || {};
  tabs[tabIndex].push({
    order: emoji.order,
    entry: [emoji.emoji, searchWordsOf(emoji) + ' ' + searchWordsOf(french)],
  });
});
// sorted like the phone keyboards, then written out ✍️
const output = tabs.map((tab) =>
  tab.sort((first, second) => first.order - second.order).map((item) => item.entry),
);
// one emoji per line, so the file stays readable (& diff-friendly) 📖
const readableJson =
  '[\n' +
  output
    .map((section) => '  [\n' + section.map((entry) => '    ' + JSON.stringify(entry)).join(',\n') + '\n  ]')
    .join(',\n') +
  '\n]\n';
fs.writeFileSync(process.argv[2] || 'emoji.json', readableJson);
console.log('emoji tabs:', output.map((tab) => tab.length).join(' '));
