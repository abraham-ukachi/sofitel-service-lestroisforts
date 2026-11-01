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
 * @name: Les Trois Forts - Test (t_rs.js)
 * @file: rust/tests/t_rs.js
 * @type: JavaScript (Node.js + jsdom)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> NODE_PATH=/tmp/jt/node_modules node rust/tests/t_rs.js
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// Port of redesign/t.js for the Rust/wasm build (rust/dist). Run: cd /tmp/jt && node <path>/rust/tests/t_rs.js [js|rs]
const { load } = require('./load.js');
const kind = process.argv[2] || 'rs';
const { w: window, d: document, errs } = load(kind);
const step = (name, action) => {
  try {
    action();
    console.log('ok', name, document.querySelector('#app').textContent.slice(0, 70).replace(/\s+/g, ' '));
  } catch (error) {
    console.log('FAIL', name, error.message);
  }
};
step('hub', () => {});
step('chapter', () => window.LTFgo('chapter', 'cock'));
step('study', () => {
  window.LTFgo('study');
  document.querySelector('#flip').click();
  document.querySelector('#yes').click();
});
step('quiz', () => {
  window.LTFgo('quiz');
  document.querySelector('.opt').click();
  document.querySelector('#nx').click();
});
step('quizEnd', () => {
  for (let attempt = 0; attempt < 12; attempt++) {
    const option = document.querySelector('.opt:not(:disabled)');
    if (!option) break;
    option.click();
    const nextButton = document.querySelector('#nx');
    if (nextButton) nextButton.click();
  }
  if (!document.querySelector('#dlg')) throw Error('no dialog');
});
step('bar', () => {
  window.LTFgo('bar');
  document.querySelector('#serve').click();
  if (!document.querySelector('#sheet')) throw Error('no sheet');
});
step('plan', () => {
  window.LTFgo('chapter', 'plan');
  window.LTFgo('planFind');
  document.querySelector('svg [data-id]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
});
step('chrono', () => {
  window.LTFgo('chapter', 'vins');
  window.LTFgo('chrono');
  document.querySelector('.opt').click();
});
step('carte', () => {
  window.LTFgo('carte');
  window.LTFcat('vins');
  const searchInput = document.querySelector('#srch');
  searchInput.value = 'bolo';
  searchInput.oninput();
  window.LTFcat('all');
});
step('info', () => {
  const row = document.querySelector('.li.menu');
  row.click();
  if (!document.querySelector('#sheet .abar')) throw Error('no bar');
});
step('revise', () => window.LTFgo('revise'));
step('review', () => window.LTFgo('review'));
step('exam', () => window.LTFgo('exam'));
step('settings', () => {
  window.LTFgo('settings');
  window.LTFtheme('black');
  if (document.documentElement.dataset.theme !== 'black') throw Error('theme');
  window.LTFtheme('light');
  document.querySelector('#rst').click();
  document.querySelector('#dno').click();
});
step('popstate', () => {
  window.LTFgo('chapter', 'dej');
  window.LTFgo('quiz');
  window.dispatchEvent(new window.PopStateEvent('popstate'));
});
console.log('test', JSON.stringify(window.LTFtest()).slice(0, 80));
console.log('errors', errs.slice(0, 5));
const speechWindow = window;
const said = [];
speechWindow.speechSynthesis = {
  cancel() {},
  speak(utterance) {
    said.push(utterance.lang + ':' + utterance.text);
  },
  getVoices() {
    return [];
  },
};
speechWindow.SpeechSynthesisUtterance = function (text) {
  this.text = text;
};
const examples = ['Aperol Spritz', 'Orezza', 'Bandol']
  .map((name) => speechWindow.eval(`LTFitems().find(i=>i.say&&i.say.fr.includes(${JSON.stringify(name)}))`))
  .filter(Boolean);
examples.forEach((item) => {
  speechWindow.LTFsay(item.id);
});
console.log('said', said.slice(0, 9));
console.log(
  'noSay',
  speechWindow.eval("LTFitems().filter(i=>!i.fact&&i.ch!=='plan'&&!i.say).length"),
  'orig',
  speechWindow.eval("LTFitems().filter(i=>i.say&&i.say.ol).map(i=>i.say.fr+'>'+i.say.ol).join(' | ')"),
);
try {
  speechWindow.LTFgo('carte');
  document.querySelector('.thumb.zoomable').click();
  console.log('zoom', !!document.querySelector('.zoomv img'));
  document.querySelector('.zx').click();
  console.log('closed', !document.querySelector('.zoomv'));
} catch (error) {
  console.log('ZFAIL', error.message);
}
try {
  speechWindow.LTFgo('carte');
  speechWindow.LTFcourse('main');
  console.log(
    'mains',
    document.querySelectorAll('#list .li').length,
    document.querySelector('#list').textContent.slice(0, 120),
  );
  speechWindow.LTFcourse('app');
  console.log('apps', document.querySelectorAll('#list .li').length);
  speechWindow.LTFcourseHelp();
  console.log('help', !!document.querySelector('.cexp'));
  speechWindow.LTFcourse('all');
} catch (error) {
  console.log('CFAIL', error.message);
}
console.log('errors(final)', errs.length, errs.slice(0, 5));
