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
 * @name: Les Trois Forts - Test (brief.js)
 * @file: rust/tests/brief.js
 * @type: JavaScript (Node.js + jsdom)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> NODE_PATH=/tmp/jt/node_modules node rust/tests/brief.js
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 📝 The owner's live content must reach both apps (JS & Rust): a renamed dish shows on the menu,
// and content of the wrong kind is ignored (the built-in menu stays).

const { load } = require('./load.js');

// import the built-in data to edit a copy of it 📦
global.window = global;
require('../../pwa/data.js');
const dishes = JSON.parse(JSON.stringify(global.LTF.dishes));
dishes[0].n = 'Plat de test en direct';

/**
 * `menuText` - Function 📋
 *
 * @param { string } kind - 'js' or 'rs'
 * @param { string } content - the live content saved on the phone
 * @returns { { text: string, errors: Array } } - the menu screen's text & the errors
 */
function menuText(kind, content) {
  const { w: testWindow, d: testDocument, errs } = load(kind, { content: content });
  testWindow.LTFgo('carte');
  return { text: testDocument.querySelector('#app').textContent, errors: errs };
}

['js', 'rs'].forEach((kind) => {
  const live = menuText(kind, JSON.stringify({ dishes: dishes }));
  const wrongKind = menuText(kind, JSON.stringify({ dishes: { not: 'a list' } }));
  const broken = menuText(kind, '{ not json');
  console.log(
    'content',
    kind,
    '| live dish shown',
    live.text.includes('Plat de test en direct'),
    '| wrong kind ignored',
    !wrongKind.text.includes('Plat de test en direct') && wrongKind.text.length > 200,
    '| broken ignored',
    broken.text.length > 200,
    '| errors',
    live.errors.length + wrongKind.errors.length + broken.errors.length,
  );
});
