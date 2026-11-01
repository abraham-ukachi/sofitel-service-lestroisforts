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
 * @name: Les Trois Forts - Test (compare.js)
 * @file: rust/tests/compare.js
 * @type: JavaScript (Node.js + jsdom)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> NODE_PATH=/tmp/jt/node_modules node rust/tests/compare.js
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// Renders the same screens in the old JS app and the Rust app and diffs the HTML.
// Both get the same seeded Math.random, so even quiz/shuffle screens are compared 1:1.
// Run: cd /tmp/jt && NODE_PATH=/tmp/jt/node_modules node <path>/rust/tests/compare.js
const { load } = require('./load.js');
const STEPS = [
  ['hub', (window) => {}],
  ['chapter dej', (window) => window.LTFgo('chapter', 'dej')],
  ['chapter cock', (window) => window.LTFgo('chapter', 'cock')],
  ['chapter plan', (window) => window.LTFgo('chapter', 'plan')],
  [
    'study cock',
    (window) => {
      window.LTFgo('chapter', 'cock');
      window.LTFgo('study');
    },
  ],
  [
    'study flip+yes',
    (window) => {
      window.document.querySelector('#flip').click();
      window.document.querySelector('#yes').click();
    },
  ],
  [
    'quiz cock',
    (window) => {
      window.LTFgo('chapter', 'cock');
      window.LTFgo('quiz');
    },
  ],
  [
    'quiz answer',
    (window) => {
      window.document.querySelector('.opt').click();
    },
  ],
  [
    'quiz next',
    (window) => {
      window.document.querySelector('#nx').click();
    },
  ],
  [
    'quiz to end',
    (window) => {
      const document = window.document;
      for (let attempt = 0; attempt < 12; attempt++) {
        const option = document.querySelector('.opt:not(:disabled)');
        if (!option) break;
        option.click();
        const nextButton = document.querySelector('#nx');
        if (nextButton) nextButton.click();
      }
    },
  ],
  [
    'bar',
    (window) => {
      window.LTFgo('chapter', 'cock');
      window.LTFgo('bar');
    },
  ],
  [
    'bar serve',
    (window) => {
      const document = window.document;
      document.querySelector('#sh .chip').click();
      document.querySelector('#gl .chip').click();
      document.querySelector('#serve').click();
    },
  ],
  [
    'planFind',
    (window) => {
      window.LTFgo('chapter', 'plan');
      window.LTFgo('planFind');
    },
  ],
  [
    'planFind tap',
    (window) => {
      window.document
        .querySelector('svg [data-id]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    },
  ],
  [
    'plan quiz',
    (window) => {
      window.LTFgo('chapter', 'plan');
      window.LTFgo('quiz');
    },
  ],
  [
    'chrono vins',
    (window) => {
      window.LTFgo('chapter', 'vins');
      window.LTFgo('chrono');
    },
  ],
  [
    'chrono answer',
    (window) => {
      window.document.querySelector('.opt').click();
    },
  ],
  ['carte', (window) => window.LTFgo('carte')],
  ['carte vins', (window) => window.LTFcat('vins')],
  [
    'carte search',
    (window) => {
      const searchInput = window.document.querySelector('#srch');
      searchInput.value = 'bolo';
      searchInput.oninput();
    },
  ],
  [
    'carte search accents',
    (window) => {
      window.LTFcat('all');
      const searchInput = window.document.querySelector('#srch');
      searchInput.value = 'CREME';
      searchInput.oninput();
    },
  ],
  [
    'carte search oe ligature',
    (window) => {
      const searchInput = window.document.querySelector('#srch');
      searchInput.value = 'boeuf';
      searchInput.oninput();
    },
  ],
  [
    'carte all',
    (window) => {
      const searchInput = window.document.querySelector('#srch');
      searchInput.value = '';
      searchInput.oninput();
    },
  ],
  ['carte main', (window) => window.LTFcourse('main')],
  ['carte app', (window) => window.LTFcourse('app')],
  ['carte cheese', (window) => window.LTFcourse('cheese')],
  ['carte dess', (window) => window.LTFcourse('dess')],
  ['course help', (window) => window.LTFcourseHelp()],
  [
    'carte all2',
    (window) => {
      window.LTFcourse('all');
      window.LTFcat('facts');
    },
  ],
  ['carte cat all', (window) => window.LTFcat('all')],
  ['info first', (window) => window.document.querySelector('.li.menu').click()],
  [
    'zoom',
    (window) => {
      window.LTFcloseSheet && 0;
      window.document.querySelector('.thumb.zoomable').click();
    },
  ],
  [
    'info all items',
    (window) => {
      let out = '';
      window.LTFitems().forEach((item) => {
        if (item.info) {
          window.LTFinfo(item.id);
          out += window.document.querySelector('#sheet').innerHTML;
        }
      });
      window.__out = out;
    },
  ],
  ['revise', (window) => window.LTFgo('revise')],
  ['review', (window) => window.LTFgo('review')],
  ['exam', (window) => window.LTFgo('exam')],
  ['settings', (window) => window.LTFgo('settings')],
  ['theme black', (window) => window.LTFtheme('black')],
  ['reset dlg', (window) => window.document.querySelector('#rst').click()],
  [
    'popstate',
    (window) => {
      window.LTFgo('chapter', 'dej');
      window.LTFgo('quiz');
      window.dispatchEvent(new window.PopStateEvent('popstate'));
    },
  ],
  [
    'say',
    (window) => {
      const said = [];
      window.speechSynthesis = {
        cancel() {},
        speak(utterance) {
          said.push(utterance.lang + ':' + utterance.text);
        },
        getVoices() {
          return [
            { lang: 'fr-FR', name: 'x' },
            { lang: 'it_IT', name: 'Google it' },
          ];
        },
      };
      window.SpeechSynthesisUtterance = function (text) {
        this.text = text;
      };
      window.LTFitems().forEach((item) => {
        if (item.say) {
          window.LTFsay(item.id);
          window.LTFsay(item.id, 'or');
        }
      });
      window.__out = JSON.stringify(said);
    },
  ],
];
const norm = (html) => html.replace(/ltf_bg|initSync/g, '');
function snap(window) {
  const document = window.document;
  if (window.__out !== undefined) {
    const output = window.__out;
    window.__out = undefined;
    return output;
  }
  return (
    '<html data-theme=' +
    document.documentElement.dataset.theme +
    ' lang=' +
    document.documentElement.lang +
    '>' +
    document.body.className +
    '|' +
    [...document.body.children]
      .filter((child) => child.tagName !== 'SCRIPT')
      .map((child) => child.outerHTML)
      .join('\n')
  );
}
function run(label, opts) {
  const jsPage = load('js', opts),
    rsPage = load('rs', opts);
  let diffs = 0;
  for (const [stepName, action] of STEPS) {
    let errorJs = '',
      errorRs = '';
    try {
      action(jsPage.w);
    } catch (error) {
      errorJs = error.message;
    }
    try {
      action(rsPage.w);
    } catch (error) {
      errorRs = error.message;
    }
    const jsHtml = snap(jsPage.w),
      rsHtml = norm(snap(rsPage.w));
    if (jsHtml !== rsHtml || errorJs !== errorRs) {
      diffs++;
      let diffAt = 0;
      while (diffAt < jsHtml.length && jsHtml[diffAt] === rsHtml[diffAt]) diffAt++;
      console.log(
        `DIFF [${label}] ${stepName} ${errorJs}|${errorRs}\n  js: …${jsHtml.slice(Math.max(0, diffAt - 80), diffAt + 120)}\n  rs: …${rsHtml.slice(Math.max(0, diffAt - 80), diffAt + 120)}`,
      );
    }
  }
  const testJs = JSON.stringify(jsPage.w.LTFtest()),
    testRs = JSON.stringify(rsPage.w.LTFtest());
  const storageJs = jsPage.w.localStorage.getItem('ltf_v1'),
    storageRs = rsPage.w.localStorage.getItem('ltf_v1');
  const itemsJs = JSON.stringify(
      jsPage.w
        .LTFitems()
        .map((item) => [item.id, item.front, item.back, item.info, item.ikey, item.course, item.say]),
    ),
    itemsRs = JSON.stringify(
      rsPage.w
        .LTFitems()
        .map((item) => [item.id, item.front, item.back, item.info, item.ikey, item.course, item.say]),
    );
  console.log(
    `[${label}] steps ${STEPS.length} diffs ${diffs} | test js ${testJs} rs ${testRs} | items equal ${itemsJs === itemsRs} | storage equal ${storageJs === storageRs} | errors js ${jsPage.errs.length} rs ${rsPage.errs.length}`,
  );
  if (storageJs !== storageRs) console.log('  storage js', storageJs, '\n  storage rs', storageRs);
  if (rsPage.errs.length) console.log('  rs errors', rsPage.errs.slice(0, 5));
  return diffs;
}
const TEST_NOW = Date.UTC(2026, 9, 16, 8, 0, 0),
  WIN = Date.UTC(2026, 9, 20, 8, 0, 0);
let tot = 0;
tot += run('fr seed1', { seed: 1, now: TEST_NOW });
tot += run('fr seed7 winter', { seed: 7, now: WIN });
tot += run('en seed3', {
  seed: 3,
  now: TEST_NOW,
  storage: JSON.stringify({
    xp: 1234,
    m: { 'dej:0': { s: 3, c: 3, w: 0 } },
    best: { vins: 40 },
    review: ['cock:2', 'vins:5', 'plan:3'],
    streak: 4,
    last: '2026-10-15',
    sound: false,
    exam: { score: 90, date: '01/10/2026' },
    lang: 'en',
    theme: 'light',
  }),
});
tot += run('fr progress', {
  seed: 11,
  now: TEST_NOW,
  storage: JSON.stringify({
    xp: 650,
    m: {},
    best: {},
    review: ['dej:1', 'plan:0'],
    streak: 2,
    last: '2026-10-10',
    sound: true,
    exam: null,
    lang: 'fr',
  }),
});
console.log('TOTAL DIFFS', tot);

// ---- chrono to the end (fake setInterval), exam passed -> certificate ----
function body(window) {
  return [...window.document.body.children]
    .filter((child) => child.tagName !== 'SCRIPT')
    .map((child) => child.outerHTML)
    .join('\n');
}
function chronoEnd(kind) {
  const page = load(kind, { seed: 21, now: TEST_NOW });
  const window = page.w;
  let tickCallback = null;
  window.setInterval = (callback) => {
    tickCallback = callback;
    return 1;
  };
  window.LTFgo('chapter', 'dig');
  window.LTFgo('chrono');
  for (let index = 0; index < 3; index++) {
    window.document.querySelector('#co .opt').click();
  }
  for (let index = 0; index < 60; index++) tickCallback();
  return body(window) + '|' + window.localStorage.getItem('ltf_v1');
}
function examPass(kind, right) {
  const page = load(kind, { seed: 33, now: TEST_NOW });
  const window = page.w,
    document = window.document;
  window.LTFgo('exam');
  const got = [];
  for (let questionIndex = 0; questionIndex < 30; questionIndex++) {
    const optionButtons = [...document.querySelectorAll('.opt')];
    if (!optionButtons.length) break;
    (right ? optionButtons[right[questionIndex]] : optionButtons[0]).click();
    got.push(optionButtons.findIndex((option) => option.classList.contains('right')));
    document.querySelector('#nx').click();
  }
  return { got, html: body(window), st: window.localStorage.getItem('ltf_v1'), errs: page.errs };
}
const chronoJs = chronoEnd('js'),
  chronoRs = chronoEnd('rs');
console.log('chrono end equal', chronoJs === chronoRs);
if (chronoJs !== chronoRs) {
  console.log(chronoJs.slice(0, 900));
  console.log(chronoRs.slice(0, 900));
}
const learn = examPass('js');
const examJs = examPass('js', learn.got),
  examRs = examPass('rs', learn.got);
console.log(
  'exam->cert equal',
  examJs.html === examRs.html,
  '| storage equal',
  examJs.st === examRs.st,
  '| cert shown',
  examRs.html.includes('class="cert"'),
  '| errors',
  examJs.errs.length,
  examRs.errs.length,
);
