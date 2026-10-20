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
 * @name: Les Trois Forts - Welcome
 * @file: pwa/welcome.js
 * @type: JavaScript
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script src="welcome.js" defer
 *    -|> shown once on the first launch, replay it from the Profil tab
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 👋 Welcome screen: five swipeable slides that introduce the app to a first-time waiter.
// Shared by the JS and the Rust builds (it only needs `window.LTFbriefPlan` for the floor plan).

(function () {
  'use strict';

  // the key that remembers the welcome was seen 🗝️
  const SEEN_KEY = 'ltf_welcome_v1';

  /**
   * `isEnglish` - Function 🌍
   *
   * @returns { boolean } - true when the app is set to English
   */
  function isEnglish() {
    try {
      return JSON.parse(localStorage.getItem('ltf_v1') || '{}').lang === 'en';
    } catch (error) {
      return false;
    }
  }

  /**
   * `translate` - Function 🔤
   *
   * @param { string } french - the French text
   * @param { string } english - the English text
   * @returns { string } - the text in the app language
   */
  function translate(french, english) {
    return isEnglish() ? english : french;
  }

  /**
   * `chip` - Function 🏷️
   *
   * @param { string } label - the chip text
   * @param { string } kind - the chip style ('alg', 'gold' or 'mute')
   * @returns { string } - the chip markup
   */
  function chip(label, kind) {
    return `<span class="wlc-chip ${kind}">${label}</span>`;
  }

  /**
   * `planMarkup` - Function 🗺️
   *
   * The real floor plan with today's reserved tables in gold (from the app itself).
   *
   * @returns { string } - the floor plan `<svg>`, or nothing when the app is not ready
   */
  function planMarkup() {
    try {
      return window.LTFbriefPlan ? window.LTFbriefPlan() : '';
    } catch (error) {
      return '';
    }
  }

  /**
   * `slides` - Function 🎞️
   *
   * @returns { Array<{ kicker: string, title: string, body: string, art: string }> } - the five slides
   */
  function slides() {
    return [
      {
        kicker: 'Les Trois Forts · Sofitel Vieux-Port',
        title: translate("Bienvenue à l'Académie", 'Welcome to the Academy'),
        body: translate(
          'Votre coach de poche pour connaître la carte des Trois Forts sur le bout des doigts, en français et en anglais.',
          'Your pocket coach to know the Les Trois Forts menu inside out, in French and in English.',
        ),
        art:
          `<img class="wlc-photo" src="hero.jpg" alt="">` +
          `<div class="wlc-shade"></div>` +
          `<div class="wlc-brand"><span class="wlc-rule"></span><b>LES TROIS FORTS</b><i>SERVICE ACADEMY</i></div>`,
      },
      {
        kicker: translate('La Carte', 'The Menu'),
        title: translate('La carte, plat par plat', 'The menu, dish by dish'),
        body: translate(
          "Chaque plat, vin et cocktail avec sa photo, ses allergènes, l'accord mets-vins et la prononciation des cépages.",
          'Every dish, wine and cocktail with its photo, allergens, wine pairing and how to pronounce the grapes.',
        ),
        art:
          `<img class="wlc-photo" src="img/d-hiver-saint-jacques-agrumes.jpg" alt="">` +
          `<div class="wlc-card"><b>Noix de Saint-Jacques aux agrumes</b><div class="wlc-chips">` +
          chip(translate('Mollusques', 'Molluscs'), 'alg') +
          chip('Gluten', 'alg') +
          chip(translate('Lait', 'Milk'), 'alg') +
          chip('+3', 'mute') +
          `</div></div>`,
      },
      {
        kicker: translate('Formation', 'Training'),
        title: translate('Apprenez en jouant', 'Learn by playing'),
        body: translate(
          'Quiz, flashcards, chrono et examen final. Vos erreurs reviennent jusqu’à ce que vous les maîtrisiez.',
          'Quizzes, flashcards, time trials and a final exam. Your mistakes come back until you master them.',
        ),
        art:
          `<img class="wlc-photo" src="img/d-hiver-mont-blanc.jpg" alt="">` +
          `<div class="wlc-card wlc-row"><div class="wlc-ring"><span>72%</span></div><div>` +
          `<b>Quiz · Flashcards</b><div class="wlc-muted">${translate('Chrono 60 s · Combo x3', '60 s trial · Combo x3')}</div>` +
          `<div class="wlc-chips">${chip(translate('Certificat à 80 %', 'Certificate at 80%'), 'gold')}</div>` +
          `</div></div>`,
      },
      {
        kicker: 'Briefing',
        title: translate('Prêt pour le service', 'Ready for service'),
        body: translate(
          'Le menu dégustation du jour, les tables réservées sur le plan et le retour de pêche, avant chaque service.',
          "The day's tasting menu, the reserved tables on the plan and the catch of the day, before every service.",
        ),
        art:
          `<div class="wlc-plan"><b class="wlc-plan-title">${translate('Briefing du jour', "Today's briefing")}</b>` +
          `<div class="wlc-muted">${translate('Tables réservées en or', 'Reserved tables in gold')}</div>` +
          `<div class="wlc-plan-box">${planMarkup()}</div></div>`,
      },
      {
        kicker: translate('Scan · Chat · Profil', 'Scan · Chat · Profile'),
        title: translate("L'équipe, toujours connectée", 'The team, always connected'),
        body: translate(
          "Scannez un plat ou une bouteille, discutez avec l'équipe et retrouvez votre progression partout avec Google.",
          'Scan a dish or a bottle, chat with the team and keep your progress everywhere with Google.',
        ),
        art:
          `<img class="wlc-photo" src="img/k-bellini-provencal.jpg" alt="">` +
          `<div class="wlc-frame"></div>` +
          `<div class="wlc-scan">${chip('Bellini provençal · 96 %', 'gold')}</div>` +
          `<div class="wlc-bubble">${translate('Table 24 : 2 Bellini svp !', 'Table 24: 2 Bellinis please!')}</div>`,
      },
    ];
  }

  /**
   * `addStyles` - Function 🎨
   *
   * Adds the welcome styles once (always navy & gold, whatever the app theme).
   *
   * @returns { void }
   */
  function addStyles() {
    if (document.getElementById('wlcStyles')) return;
    const style = document.createElement('style');
    style.id = 'wlcStyles';
    style.textContent = `
#wlc { position: fixed; inset: 0; z-index: 9999; background: #0d1a2e; color: #f0ece2;
  display: flex; flex-direction: column; transition: opacity 0.35s ease; }
#wlc.out { opacity: 0; pointer-events: none; }
#wlc .wlc-track { flex: 1; display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
  scrollbar-width: none; overscroll-behavior: contain; }
#wlc .wlc-track::-webkit-scrollbar { display: none; }
#wlc .wlc-slide { flex: 0 0 100%; scroll-snap-align: start; display: flex; flex-direction: column; }
#wlc .wlc-art { position: relative; height: 56%; overflow: hidden; background: #0d1a2e; }
#wlc .wlc-art::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 45%;
  background: linear-gradient(to bottom, rgba(13, 26, 46, 0), #0d1a2e); pointer-events: none; }
#wlc .wlc-art::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 110px; z-index: 1;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0)); pointer-events: none; }
#wlc .wlc-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
#wlc .wlc-shade { position: absolute; inset: 0; background: rgba(8, 16, 30, 0.45); }
#wlc .wlc-brand { position: absolute; left: 0; right: 0; top: 38%; text-align: center; z-index: 2; }
#wlc .wlc-brand b { display: block; font: 700 30px Georgia, serif; letter-spacing: 1px; }
#wlc .wlc-brand i { display: block; font-style: normal; font-weight: 700; font-size: 13px; color: #e8c873;
  letter-spacing: 2px; margin-top: 8px; }
#wlc .wlc-rule { display: block; width: 80px; height: 2px; background: #e8c873; margin: 0 auto 12px; }
#wlc .wlc-card { position: absolute; left: 22px; right: 22px; bottom: 56px; z-index: 2; padding: 12px 16px;
  border-radius: 18px; background: rgba(13, 26, 46, 0.9); border: 1px solid #22385a; }
#wlc .wlc-card b { font-size: 15px; }
#wlc .wlc-row { display: flex; gap: 16px; align-items: center; }
#wlc .wlc-muted { color: #a9b7cc; font-size: 13px; margin-top: 3px; }
#wlc .wlc-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
#wlc .wlc-chip { padding: 6px 12px; border-radius: 15px; font-size: 12px; font-weight: 700; }
#wlc .wlc-chip.alg { background: #3a2129; color: #ff9b90; }
#wlc .wlc-chip.gold { background: #3c3419; color: #e8c873; }
#wlc .wlc-chip.mute { background: #13233d; color: #a9b7cc; }
#wlc .wlc-ring { flex: 0 0 72px; height: 72px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(#e8c873 0 72%, #22385a 72% 100%); }
#wlc .wlc-ring span { width: 58px; height: 58px; border-radius: 50%; background: #0d1a2e; display: grid;
  place-items: center; font-weight: 700; }
#wlc .wlc-plan { position: absolute; inset: 0; padding: 96px 12px 0; z-index: 2; }
#wlc .wlc-plan-title { display: block; font: 700 22px Georgia, serif; padding-left: 14px; }
#wlc .wlc-plan .wlc-muted { padding-left: 14px; }
#wlc .wlc-plan-box { margin-top: 14px; }
#wlc .wlc-plan-box svg { width: 100%; height: auto; display: block; pointer-events: none; }
#wlc .wlc-frame { position: absolute; left: 70px; right: 70px; top: 120px; bottom: 170px; z-index: 2;
  background:
    linear-gradient(#e8c873, #e8c873) left top / 34px 5px, linear-gradient(#e8c873, #e8c873) left top / 5px 34px,
    linear-gradient(#e8c873, #e8c873) right top / 34px 5px, linear-gradient(#e8c873, #e8c873) right top / 5px 34px,
    linear-gradient(#e8c873, #e8c873) left bottom / 34px 5px, linear-gradient(#e8c873, #e8c873) left bottom / 5px 34px,
    linear-gradient(#e8c873, #e8c873) right bottom / 34px 5px, linear-gradient(#e8c873, #e8c873) right bottom / 5px 34px;
  background-repeat: no-repeat; }
#wlc .wlc-scan { position: absolute; left: 70px; bottom: 128px; z-index: 2; }
#wlc .wlc-bubble { position: absolute; right: 22px; bottom: 70px; z-index: 2; padding: 12px 16px;
  border-radius: 20px; background: rgba(106, 79, 176, 0.92); color: #fff; font-weight: 700; font-size: 14px; }
#wlc .wlc-text { padding: 6px 28px 0; }
#wlc .wlc-kicker { color: #e8c873; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
#wlc .wlc-title { font: 700 29px/1.2 Georgia, serif; margin: 10px 0 10px; }
#wlc .wlc-body { color: #a9b7cc; font-size: 16px; line-height: 1.45; margin: 0; }
#wlc .wlc-top { position: absolute; left: 0; right: 0; top: calc(env(safe-area-inset-top) + 18px); z-index: 3;
  display: flex; justify-content: space-between; align-items: center; padding: 0 18px 0 22px; pointer-events: none; }
#wlc .wlc-count { font-size: 13px; font-weight: 700; color: rgba(255, 255, 255, 0.8); }
#wlc .wlc-skip { pointer-events: auto; padding: 7px 16px; border-radius: 16px; font-weight: 700; font-size: 14px;
  color: #f0ece2; background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.25); }
#wlc .wlc-skip[hidden] { display: none; }
#wlc .wlc-foot { padding: 0 28px calc(env(safe-area-inset-bottom) + 24px); }
#wlc .wlc-dots { display: flex; gap: 7px; margin-bottom: 26px; }
#wlc .wlc-dot { width: 8px; height: 8px; border-radius: 4px; background: #22385a; transition: all 0.25s ease; }
#wlc .wlc-dot.on { width: 26px; background: #e8c873; }
#wlc .wlc-next { width: 100%; height: 54px; border: 0; border-radius: 27px; background: #e8c873; color: #0f1d33;
  font-size: 17px; font-weight: 700; }
`;
    document.head.appendChild(style);
  }

  /**
   * `close` - Function 👋
   *
   * Remembers the welcome was seen & fades it out.
   *
   * @param { HTMLElement } overlay - the welcome element
   * @returns { void }
   */
  function close(overlay) {
    localStorage.setItem(SEEN_KEY, String(Date.now()));
    overlay.classList.add('out');
    setTimeout(() => overlay.remove(), 400);
  }

  /**
   * `openWelcome` - Function 🎬
   *
   * Opens the five welcome slides (swipe, Passer / Skip, Suivant / Next, Commencer / Start).
   *
   * @returns { void }
   */
  function openWelcome() {
    if (document.getElementById('wlc')) return;
    addStyles();
    const list = slides();
    const overlay = document.createElement('div');
    overlay.id = 'wlc';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', translate('Bienvenue', 'Welcome'));
    overlay.innerHTML =
      `<div class="wlc-top"><span class="wlc-count">1 / ${list.length}</span>` +
      `<button class="wlc-skip">${translate('Passer', 'Skip')}</button></div>` +
      `<div class="wlc-track">` +
      list
        .map(
          (slide) =>
            `<section class="wlc-slide"><div class="wlc-art">${slide.art}</div><div class="wlc-text">` +
            `<div class="wlc-kicker">${slide.kicker}</div><h2 class="wlc-title">${slide.title}</h2>` +
            `<p class="wlc-body">${slide.body}</p></div></section>`,
        )
        .join('') +
      `</div><div class="wlc-foot"><div class="wlc-dots">` +
      list.map(() => '<span class="wlc-dot"></span>').join('') +
      `</div><button class="wlc-next"></button></div>`;
    document.body.appendChild(overlay);

    const track = overlay.querySelector('.wlc-track');
    const dots = overlay.querySelectorAll('.wlc-dot');
    const next = overlay.querySelector('.wlc-next');
    const skip = overlay.querySelector('.wlc-skip');
    const count = overlay.querySelector('.wlc-count');
    let current = 0;

    // 🔄 refresh the dots, the counter & the buttons for the current slide
    const refresh = () => {
      const last = current === list.length - 1;
      dots.forEach((dot, position) => dot.classList.toggle('on', position === current));
      count.textContent = `${current + 1} / ${list.length}`;
      next.textContent = last ? translate('Commencer', 'Get started') : translate('Suivant', 'Next');
      skip.hidden = last;
    };

    // 👆 follow the swipe
    track.addEventListener(
      'scroll',
      () => {
        const position = Math.round(track.scrollLeft / track.clientWidth);
        if (position !== current) {
          current = position;
          refresh();
        }
      },
      { passive: true },
    );
    // ➡️ next slide, or start the app on the last one
    next.addEventListener('click', () => {
      if (current === list.length - 1) return close(overlay);
      track.scrollTo({ left: (current + 1) * track.clientWidth, behavior: 'smooth' });
    });
    // ⏭️ skip
    skip.addEventListener('click', () => close(overlay));
    refresh();
  }

  /**
   * `addReplayButton` - Function 🔁
   *
   * Adds a "Revoir l'introduction" button above the reset button of the Profil tab.
   *
   * @returns { void }
   */
  function addReplayButton() {
    const resetButton = document.getElementById('rst');
    if (!resetButton || document.getElementById('wlcReplay')) return;
    const replay = document.createElement('button');
    replay.id = 'wlcReplay';
    replay.className = 'btn sec wide';
    replay.style.marginBottom = '10px';
    replay.textContent = '👋 ' + translate("Revoir l'introduction", 'Replay the introduction');
    replay.addEventListener('click', openWelcome);
    resetButton.parentNode.insertBefore(replay, resetButton);
  }

  /**
   * `start` - Function 🚀
   *
   * Shows the welcome on the first launch (once the app has drawn) & watches for the Profil tab.
   *
   * @returns { void }
   */
  function start() {
    new MutationObserver(addReplayButton).observe(document.body, { childList: true, subtree: true });
    if (localStorage.getItem(SEEN_KEY)) return;
    let tries = 0;
    // wait for the app (JS or wasm) to expose the floor plan, at most ~3 s ⏳
    const waitForApp = () => {
      if (window.LTFbriefPlan || tries++ > 30) return openWelcome();
      setTimeout(waitForApp, 100);
    };
    waitForApp();
  }

  // 🌍 replay it from anywhere (e.g. the console)
  window.LTFwelcome = openWelcome;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
