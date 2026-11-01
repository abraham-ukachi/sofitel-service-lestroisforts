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
 * @name: Les Trois Forts - Test (route.js)
 * @file: rust/tests/route.js
 * @type: JavaScript (Node.js + jsdom)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> NODE_PATH=/tmp/jt/node_modules node rust/tests/route.js
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// Refresh/deep-link test for the Rust router: URL hash + resumable sessions.
const tick = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
(async () => {
  const loader = require('./load.js');
  const results = [];
  const app = (page) => page.d.getElementById('app');
  const txt = (page) => app(page).textContent.replace(/\s+/g, ' ');
  // 1) study: advance 3 cards, "refresh" with same URL + sessionStorage
  let page = loader.load('rs', { seed: 5 });
  await tick(300);
  page.w.LTFgo('chapter', 'hiver');
  page.w.LTFgo('study');
  for (let index = 0; index < 3; index++) page.d.getElementById('yes').click();
  let url = page.w.location.href,
    session = { ltf_run: page.w.sessionStorage.getItem('ltf_run') },
    before = txt(page),
    storage = page.w.localStorage.getItem('ltf_v1');
  let reloaded = loader.load('rs', { seed: 9, url, session: session, storage: storage });
  await tick(300);
  results.push(
    ['study url', url.split('#')[1]],
    [
      'study same card',
      txt(reloaded) === before,
      reloaded.d.querySelector('.pl') && reloaded.d.querySelector('.pl').textContent,
    ],
  );
  // 2) quiz: answer 2 questions, refresh while feedback open → next question (3/10), score kept
  page = loader.load('rs', { seed: 5 });
  await tick(300);
  page.w.LTFgo('chapter', 'vins');
  page.w.LTFgo('quiz');
  for (let index = 0; index < 2; index++) {
    page.d.querySelector('.opt').click();
    page.d.getElementById('nx').click();
  }
  const question3 = txt(page);
  page.d.querySelector('.opt').click(); // feedback for q3 open
  url = page.w.location.href;
  session = { ltf_run: page.w.sessionStorage.getItem('ltf_run') };
  reloaded = loader.load('rs', { seed: 9, url, session: session });
  await tick(300);
  results.push(
    ['quiz url', url.split('#')[1]],
    ['quiz resumes at', reloaded.d.querySelector('.pl').textContent],
    ['quiz differs from q3 (advanced)', txt(reloaded) !== question3],
  );
  // refresh before answering → same question
  page = reloaded;
  const question4 = txt(page);
  url = page.w.location.href;
  session = { ltf_run: page.w.sessionStorage.getItem('ltf_run') };
  reloaded = loader.load('rs', { seed: 2, url, session: session });
  await tick(300);
  results.push(['quiz same q after refresh', txt(reloaded) === question4]);
  // 3) exam
  page = loader.load('rs', { seed: 5 });
  await tick(300);
  page.w.LTFgo('exam');
  page.d.querySelector('.opt').click();
  page.d.getElementById('nx').click();
  const examQuestion2 = txt(page);
  url = page.w.location.href;
  session = { ltf_run: page.w.sessionStorage.getItem('ltf_run') };
  reloaded = loader.load('rs', { seed: 1, url, session: session });
  await tick(300);
  results.push(
    ['exam url', url.split('#')[1]],
    ['exam same q', txt(reloaded) === examQuestion2, reloaded.d.querySelector('.pl').textContent],
  );
  // 4) plain screens deep link (no session): carte, chapter, settings; bad link → hub
  for (const hash of ['#/carte', '#/chapter/vins', '#/settings', '#/revise', '#/chapter/nope', '#/zzz']) {
    reloaded = loader.load('rs', { url: 'https://x.test/' + hash });
    await tick(300);
    results.push([hash, app(reloaded).className, reloaded.w.location.hash, reloaded.errs.length]);
  }
  // 5) quiz link without session → fresh quiz 1/10
  reloaded = loader.load('rs', { url: 'https://x.test/#/quiz/vins' });
  await tick(300);
  results.push(['fresh quiz', reloaded.d.querySelector('.pl').textContent]);
  // 6) back from restored deep link goes to chapter
  reloaded.w.history.back();
  await tick(300);
  results.push(['back ->', app(reloaded).className, reloaded.w.location.hash]);
  // 7) leaving a quiz clears the session
  reloaded.w.LTFgo('hub');
  results.push(['session cleared', reloaded.w.sessionStorage.getItem('ltf_run') === null]);
  results.forEach((row) => console.log(...row));
  process.exit(0);
})();
