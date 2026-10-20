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
