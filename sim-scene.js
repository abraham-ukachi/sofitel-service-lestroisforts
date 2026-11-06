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
 * @name: Les Trois Forts - Simulation de service, the little 3D scenes
 * @file: pwa/sim-scene.js
 * @type: JavaScript (module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (sim.js) import { sceneHtml, sceneOf, SCENE_CSS } from './sim-scene.js';
 *    -|> sceneHtml(sceneOf('wine'), false) → a pan flipping over a flame while the kitchen cooks
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🎬 Tiny pure-CSS 3D scenes shown while a table waits (no library, no WebGL, no image):
// - 🍳 pan: a pan flipping over a flame (the kitchen prepares the dishes)
// - 🛎️ cloche: a cloche lifting off a plate (mains & dessert, the guests enjoy)
// - 🥂 glass: a glass filling (water, drinks)
// - ☕ cup: a coffee cup with steam
// - 💳 card: a card terminal (the bill)
// - 🪑 table: guests around a turning round table (seating, reading the menu)
// Everything is perspective + preserve-3d + keyframes; prefers-reduced-motion stops the motion.

// ===== THE SCENES 🎬 ===== //

// the scene for the step just played (its key before the « | ») 🗺️
const SCENE_BY_KEY = {
  welcome: 'table',
  seating: 'table',
  water: 'glass',
  aperitif: 'glass',
  menu: 'table',
  allergy: 'table',
  order: 'pan',
  wine: 'pan',
  mains: 'cloche',
  birthday: 'cloche',
  anniversary: 'cloche',
  business: 'cloche',
  dessert: 'cloche',
  coffee: 'cup',
  bill: 'card',
};

// the inner markup of every scene (plain divs, styled by SCENE_CSS) 🧱
const SCENE_PARTS = {
  pan:
    '<div class="simsc-stove"><div class="simsc-flame"></div><div class="simsc-flame simsc-f2"></div></div>' +
    '<div class="simsc-pan"><div class="simsc-panbody"></div><div class="simsc-handle"></div></div>' +
    '<div class="simsc-food"></div>',
  cloche:
    '<div class="simsc-plate"><div class="simsc-dish"></div></div>' +
    '<div class="simsc-cloche"><div class="simsc-knob"></div></div>',
  glass: '<div class="simsc-glass"><div class="simsc-liquid"></div></div><div class="simsc-pour"></div>',
  cup:
    '<div class="simsc-steam"></div><div class="simsc-steam simsc-s2"></div><div class="simsc-steam simsc-s3"></div>' +
    '<div class="simsc-cup"><div class="simsc-ear"></div></div><div class="simsc-saucer"></div>',
  card:
    '<div class="simsc-term"><div class="simsc-screen"></div><div class="simsc-keys"></div></div>' +
    '<div class="simsc-card"></div>',
  table:
    '<div class="simsc-round"><div class="simsc-top"></div>' +
    '<div class="simsc-seat simsc-p1"></div><div class="simsc-seat simsc-p2"></div>' +
    '<div class="simsc-seat simsc-p3"></div><div class="simsc-seat simsc-p4"></div></div>',
};

/**
 * `sceneOf` - Function 🗺️
 *
 * @param { string } key - the key of the step just played (e.g. 'wine|Château Crémat')
 * @returns { string } - the scene to show while the next step is locked
 */
export function sceneOf(key) {
  return SCENE_BY_KEY[String(key || '').split('|')[0]] || 'table';
}

/**
 * `sceneHtml` - Function 🎬
 *
 * @param { string } scene - pan, cloche, glass, cup, card or table
 * @param { boolean } mini - true for the small version (a row of the service list)
 * @returns { string } - the scene's markup (decorative: hidden from screen readers)
 */
export function sceneHtml(scene, mini) {
  const name = SCENE_PARTS[scene] ? scene : 'table';
  return (
    `<span class="simscene${mini ? ' simscene-mini' : ''}" aria-hidden="true">` +
    `<span class="simsc-stage simsc-${name}">${SCENE_PARTS[name]}</span></span>`
  );
}

// the scenes' look: every class starts with `sim`, colours from the app's theme variables 🎨
export const SCENE_CSS = `
.simscene{display:block;width:120px;height:96px;perspective:420px;flex:none;position:relative;margin:0 auto}
.simscene-mini{width:44px;height:36px;margin:0;perspective:220px}
.simscene-mini .simsc-stage{transform:scale(.36) rotateX(18deg);transform-origin:0 0}
.simscene .simsc-stage{position:absolute;left:0;top:0;width:120px;height:96px;transform-style:preserve-3d;transform:rotateX(18deg)}
.simscene .simsc-stage div{position:absolute;transform-style:preserve-3d}
.simsc-stove{left:30px;top:70px;width:60px;height:14px;border-radius:50%;background:var(--sf3)}
.simsc-flame{left:22px;top:-12px;width:16px;height:22px;border-radius:50% 50% 45% 45%;
  background:radial-gradient(circle at 50% 70%,#ffd36b,#ff7a2f 60%,transparent 72%);animation:simscflame .5s ease-in-out infinite alternate}
.simsc-f2{left:10px;top:-6px;width:12px;height:16px;animation-delay:.2s}
.simsc-pan{left:24px;top:48px;width:56px;height:16px;transform-origin:50% 100%;animation:simscpan 1.6s ease-in-out infinite}
.simsc-panbody{left:0;top:0;width:56px;height:14px;border-radius:0 0 28px 28px;background:var(--tx2);border-top:3px solid var(--tx)}
.simsc-handle{left:52px;top:2px;width:34px;height:5px;border-radius:3px;background:var(--tx2)}
.simsc-food{left:40px;top:40px;width:22px;height:8px;border-radius:50%;background:var(--gold);animation:simscflip 1.6s ease-in-out infinite}
.simsc-plate{left:18px;top:56px;width:84px;height:26px;border-radius:50%;background:var(--sf3);box-shadow:inset 0 0 0 3px var(--line)}
.simsc-dish{left:28px;top:6px;width:28px;height:12px;border-radius:50%;background:var(--gold)}
.simsc-cloche{left:26px;top:22px;width:68px;height:42px;border-radius:40px 40px 4px 4px;
  background:linear-gradient(120deg,var(--tx),var(--tx2));transform-origin:0 100%;animation:simsccloche 2.4s ease-in-out infinite}
.simsc-knob{left:28px;top:-7px;width:12px;height:9px;border-radius:6px 6px 2px 2px;background:var(--tx)}
.simsc-glass{left:44px;top:26px;width:32px;height:58px;border:3px solid var(--tx2);border-top:0;border-radius:0 0 12px 12px;overflow:hidden;
  transform:rotateY(-12deg)}
.simsc-liquid{left:0;right:0;bottom:0;height:10%;background:var(--gold);opacity:.85;animation:simscfill 2.6s ease-in-out infinite}
.simsc-pour{left:58px;top:0;width:4px;height:30px;border-radius:2px;background:var(--gold);opacity:.8;animation:simscpour 2.6s ease-in-out infinite}
.simsc-cup{left:38px;top:46px;width:40px;height:30px;border-radius:0 0 18px 18px;background:var(--tx);transform:rotateY(14deg)}
.simsc-ear{left:36px;top:6px;width:14px;height:14px;border:4px solid var(--tx);border-radius:50%}
.simsc-saucer{left:26px;top:74px;width:66px;height:12px;border-radius:50%;background:var(--sf3)}
.simsc-steam{left:48px;top:20px;width:6px;height:22px;border-radius:3px;background:var(--mu);opacity:0;animation:simscsteam 2.2s ease-in infinite}
.simsc-s2{left:58px;animation-delay:.7s}
.simsc-s3{left:68px;animation-delay:1.4s}
.simsc-term{left:40px;top:22px;width:40px;height:62px;border-radius:8px;background:var(--tx2);transform:rotateY(-18deg) rotateX(8deg)}
.simsc-screen{left:6px;top:6px;width:28px;height:16px;border-radius:3px;background:var(--okb);animation:simscblink 1.2s steps(2) infinite}
.simsc-keys{left:7px;top:28px;width:26px;height:26px;border-radius:3px;
  background:repeating-linear-gradient(90deg,var(--sf3) 0 6px,transparent 6px 10px),repeating-linear-gradient(0deg,var(--sf3) 0 6px,transparent 6px 10px)}
.simsc-card{left:30px;top:6px;width:36px;height:22px;border-radius:4px;background:var(--gold);animation:simsccard 2.4s ease-in-out infinite}
.simsc-round{left:20px;top:18px;width:80px;height:80px;transform:rotateX(62deg);animation:simscspin 9s linear infinite}
.simsc-top{left:14px;top:14px;width:52px;height:52px;border-radius:50%;background:var(--sf3);box-shadow:inset 0 0 0 3px var(--gold)}
.simsc-seat{width:16px;height:16px;border-radius:50%;background:var(--tx2);transform:rotateX(-62deg) translateZ(8px)}
.simsc-p1{left:32px;top:-4px}.simsc-p2{left:68px;top:32px}.simsc-p3{left:32px;top:68px}.simsc-p4{left:-4px;top:32px}
@keyframes simscflame{to{transform:scaleY(1.25) translateY(-3px)}}
@keyframes simscpan{0%,100%{transform:rotateZ(0)}40%{transform:rotateZ(-10deg)}55%{transform:rotateZ(6deg)}}
@keyframes simscflip{0%,30%{transform:translateY(0) rotateX(0)}50%{transform:translateY(-30px) rotateX(180deg)}70%,100%{transform:translateY(0) rotateX(360deg)}}
@keyframes simsccloche{0%,25%{transform:rotateX(0) translateY(0)}55%,80%{transform:rotateX(-38deg) translateY(-18px)}100%{transform:rotateX(0)}}
@keyframes simscfill{0%{height:8%}70%,90%{height:82%}100%{height:8%}}
@keyframes simscpour{0%,70%{opacity:.8}80%,100%{opacity:0}}
@keyframes simscsteam{0%{opacity:0;transform:translateY(8px) scaleY(.6)}40%{opacity:.6}100%{opacity:0;transform:translateY(-22px) scaleY(1.3) rotateZ(8deg)}}
@keyframes simscblink{50%{opacity:.4}}
@keyframes simsccard{0%,20%{transform:translateY(-6px) rotateX(0)}50%,70%{transform:translateY(16px) rotateX(-20deg)}100%{transform:translateY(-6px)}}
@keyframes simscspin{to{transform:rotateX(62deg) rotateZ(360deg)}}
@media (prefers-reduced-motion: reduce){.simscene *{animation:none!important}}
`;
