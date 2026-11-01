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

const tick = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
(async () => {
  const loader = require('./load.js');
  const out = {};
  for (const kind of ['js', 'rs']) {
    for (const lang of ['fr', 'en']) {
      const page = loader.load(kind, { seed: 3, lang });
      await tick(1500);
      const window = page.w;
      window.LTFgo('chapter', 'jour');
      const chapterHtml = window.document.getElementById('app').innerHTML;
      window.LTFgo('brief');
      out[kind + lang] = [
        chapterHtml,
        window.document.getElementById('app').innerHTML,
        page.errs.length,
        window.LTFtest && JSON.stringify(window.LTFtest()),
      ];
    }
  }
  for (const lang of ['fr', 'en'])
    console.log(
      lang,
      'chapter eq',
      out['js' + lang][0] === out['rs' + lang][0],
      'alg eq',
      out['js' + lang][1] === out['rs' + lang][1],
      'errs',
      out['js' + lang][2],
      out['rs' + lang][2],
      out['rs' + lang][3],
    );
  console.log(out.rsfr[1].slice(0, 900));
  process.exit(0);
})();
