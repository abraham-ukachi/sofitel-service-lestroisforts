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
 * @name: Les Trois Forts - Test (zoom.js)
 * @file: rust/tests/zoom.js
 * @type: JavaScript (Node.js + jsdom)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> NODE_PATH=/tmp/jt/node_modules node rust/tests/zoom.js
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// Photo viewer gestures (double tap, wheel, pinch, pan, swipe-down close), JS vs Rust.
const { load } = require('./load.js');
function gest(kind) {
  const page = load(kind, { seed: 5 });
  const window = page.w,
    document = window.document;
  const log = [];
  window.Element.prototype.setPointerCapture = function () {};
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: 400, height: 600, right: 400, bottom: 600 };
  };
  Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', {
    get() {
      return 400;
    },
  });
  Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', {
    get() {
      return 300;
    },
  });
  const pointer = (type, id, clientX, clientY) => {
    const event = new window.MouseEvent(type, { bubbles: true, clientX: clientX, clientY: clientY });
    Object.defineProperty(event, 'pointerId', { value: id });
    document.querySelector('.zs').dispatchEvent(event);
  };
  const state = () => {
    const image = document.querySelector('.zoomv img');
    log.push(
      image
        ? image.style.transform +
            '|' +
            image.style.transition +
            '|' +
            document.querySelector('.zoomv').style.background
        : 'closed',
    );
  };
  window.LTFgo('carte');
  document.querySelector('.thumb.zoomable').click();
  log.push(document.querySelector('.zoomv').outerHTML.length);
  pointer('pointerdown', 1, 100, 100);
  pointer('pointerup', 1, 100, 100);
  pointer('pointerdown', 1, 100, 100);
  pointer('pointerup', 1, 100, 100);
  state(); // double tap -> 2.5x
  const wheel = new window.WheelEvent('wheel', { deltaY: -10, bubbles: true, cancelable: true });
  document.querySelector('.zs').dispatchEvent(wheel);
  state();
  pointer('pointerdown', 1, 200, 200);
  pointer('pointermove', 1, 230, 180);
  state();
  pointer('pointerup', 1, 230, 180);
  state(); // pan
  pointer('pointerdown', 1, 100, 300);
  pointer('pointerdown', 2, 300, 300);
  pointer('pointermove', 2, 380, 300);
  state();
  pointer('pointerup', 2, 380, 300);
  pointer('pointerup', 1, 100, 300);
  state(); // pinch
  pointer('pointerdown', 1, 100, 100);
  pointer('pointerup', 1, 100, 100);
  pointer('pointerdown', 1, 100, 100);
  pointer('pointerup', 1, 100, 100);
  state(); // double tap -> reset
  pointer('pointerdown', 1, 100, 100);
  pointer('pointermove', 1, 100, 200);
  state();
  pointer('pointerup', 1, 100, 260);
  state(); // swipe down -> close
  return { log, errs: page.errs };
}
const jsGesture = gest('js'),
  rsGesture = gest('rs');
jsGesture.log.forEach((line, index) =>
  console.log(line === rsGesture.log[index] ? 'same' : 'DIFF', 'js:', line, ' rs:', rsGesture.log[index]),
);
console.log('errors', jsGesture.errs.length, rsGesture.errs.length, rsGesture.errs.slice(0, 3));
