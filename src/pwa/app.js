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
 * @name: Les Trois Forts - App (JavaScript reference)
 * @file: pwa/app.js
 * @type: JavaScript
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script src="app.js"  (after data.js, fun.js, i18n.js, i18n_fr.js & images.js)
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🎓 Les Trois Forts — Service Academy, the original JavaScript app.
// The live app is the Rust/WASM port (rust/ltf); this file is kept as the reference the compare tests render against 🧪.
// Everything lives in one IIFE: only the `window.LTF*` functions below are public 🌍.
(function () {
  // the menu data (data.js) & the English strings (i18n.js) 📚
  const LTF = window.LTF,
    LTF_EN = window.LTF_EN || { words: {} };

  /**
   * `queryOne` - Function 🔎
   *
   * @param { string } selector - a CSS selector
   * @returns { Element | null } - the first matching element
   */
  const queryOne = (selector) => document.querySelector(selector);
  // the app root, where every screen is rendered 🧩
  const app = queryOne('#app');

  /**
   * `shuffle` - Function 🔀
   *
   * Fisher-Yates shuffle of a copy (uses `Math.random`, seeded in the tests).
   *
   * @param { Array } array - the array
   * @returns { Array } - a shuffled copy
   */
  const shuffle = (array) => {
    array = array.slice();
    for (let index = array.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
    }
    return array;
  };

  /**
   * `pick` - Function 🎲
   *
   * @param { Array } array - the array
   * @returns { any } - one random element
   */
  const pick = (array) => array[Math.floor(Math.random() * array.length)];

  /**
   * `uniq` - Function 🧹
   *
   * @param { Array } array - the array
   * @returns { Array } - the array without duplicates (first occurrence kept)
   */
  const uniq = (array) => [...new Set(array)];

  /**
   * `esc` - Function 🛡️
   *
   * @param { any } value - the text
   * @returns { string } - the text with `&`, `<`, `>` and `"` escaped
   */
  const esc = (value) =>
    String(value).replace(
      /[&<>"]/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char],
    );

  /**
   * `norm` - Function 🔡
   *
   * @param { any } value - the text
   * @returns { string } - lowercase, without accents (for the search)
   */
  const norm = (value) =>
    String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  // ===== STORAGE 💾 ===== //

  // an in-memory copy, for browsers that refuse localStorage (private mode...)
  let mem = null;

  /**
   * `load` - Function 💾
   *
   * Reads the progress `progress` from localStorage `ltf_v1` (or the default progress).
   *
   * @returns { object } - the progress { xp, m, best, review, streak, last, sound, exam, lang, theme? }
   */
  function load() {
    try {
      const saved = localStorage.getItem('ltf_v1');
      if (saved) return JSON.parse(saved);
    } catch (error) {}
    return (
      mem || {
        xp: 0,
        m: {},
        best: {},
        review: [],
        streak: 0,
        last: null,
        sound: true,
        exam: null,
        lang: 'fr',
      }
    );
  }
  // the progress, loaded once 🌱
  let progress = load();

  /**
   * `save` - Function 💾
   *
   * Writes the progress `progress` to localStorage `ltf_v1` (cloud.js picks it up from there ☁️).
   *
   * @returns { void }
   */
  function save() {
    mem = progress;
    try {
      localStorage.setItem('ltf_v1', JSON.stringify(progress));
    } catch (error) {}
  }
  // 🔥 the streak: +1 when the last visit was yesterday, back to 1 after a gap
  (function streak() {
    const today = new Date().toISOString().slice(0, 10);
    if (progress.last !== today) {
      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      progress.streak = progress.last === yesterday ? progress.streak + 1 : 1;
      progress.last = today;
      save();
    }
  })();

  // ===== LANGUAGE 🌍 ===== //

  // English? (French by default)
  const EN = progress.lang === 'en';
  // the ⓘ notes in the current language
  const INFO = !EN && window.LTF_INFO_FR ? window.LTF_INFO_FR : window.LTF_INFO || {};

  /**
   * `translate` - Function 🏷️
   *
   * @param { string } fr - the French text
   * @param { string } en - the English text
   * @returns { string } - the text in the current language
   */
  const translate = (fr, en) => (EN ? en : fr);

  /**
   * `translateWord` - Function 🇬🇧
   *
   * @param { string } word - a French word (colour, region, format...)
   * @returns { string } - its English translation in English mode, else the word itself
   */
  const translateWord = (word) => (EN && LTF_EN.words && LTF_EN.words[word]) || word;

  /**
   * `eur` - Function 💶
   *
   * @param { number | string | null } price - a price
   * @returns { string } - "12,50 €" (French) / "12.50 €" (English), or "—" when there's no price
   */
  const eur = (price) =>
    price === null || price === undefined ? '—' : String(price).replace('.', EN ? '.' : ',') + ' €';
  // the allergen warning shown on every dish ⚠️
  const ALLERGY = translate(
    'Toujours confirmer les allergènes avec la cuisine.',
    'Always confirm allergens with the kitchen.',
  );
  // <html lang> follows the app language (speech & scan read it)
  try {
    document.documentElement.lang = EN ? 'en' : 'fr';
  } catch (error) {}
  // 🌍 switch the language: save it and reload
  window.LTFlang = (language) => {
    progress.lang = language;
    save();
    try {
      location.reload();
    } catch (error) {}
  };

  // ===== SOUND 🔊 ===== //

  // the AudioContext (created on the first beep)
  let audioContext = null;

  /**
   * `beep` - Function 🔊
   *
   * Plays a short rising (right) or falling (wrong) beep, unless the sound is off.
   *
   * @param { boolean } ok - true for a right answer
   * @returns { void }
   */
  function beep(ok) {
    if (!progress.sound) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator(),
        gain = audioContext.createGain();
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.type = 'sine';
      const now = audioContext.currentTime;
      if (ok) {
        oscillator.frequency.setValueAtTime(660, now);
        oscillator.frequency.setValueAtTime(990, now + 0.08);
      } else {
        oscillator.frequency.setValueAtTime(220, now);
        oscillator.frequency.setValueAtTime(160, now + 0.1);
      }
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      oscillator.start(now);
      oscillator.stop(now + 0.26);
    } catch (error) {}
  }

  // ===== MCQ HELPER ❓ ===== //

  /**
   * `mcq` - Function ❓
   *
   * Builds a multiple-choice question: the right answer + up to 3 distinct wrong ones from the pool.
   *
   * @param { string } question - the question
   * @param { any } correct - the right answer
   * @param { Array } pool - the possible wrong answers
   * @param { string } [expl] - the explanation shown after answering
   * @param { object } [extra] - extra fields (photo, kind...)
   * @returns { object | null } - { q, options, answer, expl, ...extra }, or null without a wrong answer
   */
  function mcq(question, correct, pool, expl, extra) {
    correct = String(correct);
    const opts = shuffle(uniq(pool.map(String)).filter((option) => option !== correct && option)).slice(0, 3);
    if (opts.length < 1) return null;
    return Object.assign(
      { q: question, options: shuffle([correct, ...opts]), answer: correct, expl: expl || '' },
      extra || {},
    );
  }

  // ===== CHAPTERS 📚 ===== //

  // the chapters of the hub, in order { id, name, icon, sub }
  const CHAPTERS = [
    {
      id: 'jour',
      name: translate('Service du jour', "Today's service"),
      icon: '📋',
      sub: LTF.jour ? LTF.jour.sub[EN ? 'en' : 'fr'] : '',
    },
    {
      id: 'hiver',
      name: translate("Carte d'hiver 3F", 'Winter menu 3F'),
      icon: '❄️',
      sub: translate('Dès le 19 octobre · 14 plats + 4 desserts', 'From 19 October · 14 dishes + 4 desserts'),
    },
    {
      id: 'dej',
      name: translate('Déjeuner', 'Lunch'),
      icon: '☀️',
      sub: translate('Carte du midi & formule 49 €', 'Lunch menu & 49 € formula'),
    },
    {
      id: 'diner',
      name: translate('Dîner & Dégustation', 'Dinner & Tasting Menu'),
      icon: '🌙',
      sub: translate('Carte du soir, Menu Dégustation 89 €', 'Evening menu, 89 € Tasting Menu'),
    },
    {
      id: 'dess',
      name: translate('Desserts & Fromages', 'Desserts & Cheese'),
      icon: '🍮',
      sub: translate('Douceurs et plateau Lemarié', 'Sweets and the Lemarié cheese board'),
    },
    {
      id: 'from',
      name: translate('Plateau de fromages', 'Cheese board'),
      icon: '🧀',
      sub: translate('8 fromages, du plus doux au plus fort', '8 cheeses, mildest to strongest'),
    },
    {
      id: 'cock',
      name: translate('Cocktails & Softs', 'Cocktails & Soft drinks'),
      icon: '🍸',
      sub: translate('Signatures, fiches techniques, softs, eaux', 'Signatures, recipe cards, softs, waters'),
    },
    {
      id: 'cafe',
      name: translate('Cafés & Thés', 'Coffee & Tea'),
      icon: '☕',
      sub: 'Illy & Maison Père Blaize',
    },
    {
      id: 'vins',
      name: translate('Vins', 'Wines'),
      icon: '🍷',
      sub: translate(
        'Au verre, Provence, Méditerranée, France',
        'By the glass, Provence, Mediterranean, France',
      ),
    },
    {
      id: 'champ',
      name: 'Champagnes',
      icon: '🥂',
      sub: translate('Coupes, bruts, rosés, prestige', 'Glasses, bruts, rosés, prestige'),
    },
    { id: 'dig', name: 'Digestifs', icon: '🥃', sub: 'Ferroni, Lachanenche, Liquoristerie' },
    {
      id: 'acc',
      name: translate('Accords mets-vins', 'Wine pairing'),
      icon: '🍇',
      sub: translate("L'accord du Menu Dégustation (+55 €)", 'The Tasting Menu pairing (+55 €)'),
    },
    {
      id: 'plan',
      name: translate('Plan de salle', 'Floor plan'),
      icon: '🗺️',
      sub: translate('Numéros de tables', 'Table numbers'),
    },
  ];

  // ===== ITEMS 🗂️ ===== //

  // every flash card / question source of the app (built below, chapter by chapter)
  const items = [];

  // ===== PRONUNCIATION (DEVICE VOICES) 🗣️ ===== //

  // foreign names get their original language voice too [pattern, voice lang, label] 🌍
  const ORIG = [
    [
      /(?<![\wÀ-ÿ])(?:spritz|negroni|bellini|limoncello|amaretto|campari|aperol|prosecco|pellegrino|panna|grappa|espresso|ristretto|macchiato|cappuccino|tiramis|risotto|burrata|carpaccio|stracciatella|parmigiano|disaronno|sambuca|martini|orezza|lavazza|negroni|vermouth|amaro|averna|fernet)(?![\wÀ-ÿ])/i,
      'it-IT',
      'Italiano',
    ],
    [
      /(?<![\wÀ-ÿ])(?:mojito|margarita|tequila|mezcal|sangria|chorizo|jerez|rioja|patron|bacardi|havana)(?![\wÀ-ÿ])/i,
      'es-ES',
      'Español',
    ],
    [
      /(?<![\wÀ-ÿ])(?:gin|fever|schweppes|coca|cola|whisky|whiskey|bourbon|scotch|ginger beer|london|hendrick|tanqueray|johnnie|jameson|glenfiddich|macallan|lagavulin|talisker|earl grey|english|breakfast|darjeeling|assam|sprite|red bull|old fashioned|mule|sour|bloody|cosmopolitan|tea)(?![\wÀ-ÿ])/i,
      'en-GB',
      'English',
    ],
    [
      /(?<![\wÀ-ÿ])(?:sencha|matcha|genmaicha|yuzu|sake|hojicha|gyokuro|nikka|suntory|hibiki|yamazaki)(?![\wÀ-ÿ])/i,
      'ja-JP',
      '日本語',
    ],
    [
      /(?<![\wÀ-ÿ])(?:riesling|gewurz|gewürz|weizen|kirsch|jägermeister|jagermeister|schnaps)(?![\wÀ-ÿ])/i,
      'de-DE',
      'Deutsch',
    ],
    [/(?<![\wÀ-ÿ])(?:porto|port|vinho|madeira|caipirinha|cachaça|cachaca)(?![\wÀ-ÿ])/i, 'pt-PT', 'Português'],
    [/(?<![\wÀ-ÿ])(?:rooibos)(?![\wÀ-ÿ])/i, 'af-ZA', 'Afrikaans'],
    [/(?<![\wÀ-ÿ])(?:vodka|beluga|grey goose)(?![\wÀ-ÿ])/i, 'ru-RU', 'Русский'],
  ];

  /**
   * `nameIt` - Function 🗣️
   *
   * Fills `it.say` = { fr, en, ol, on }: the French name, its English version and,
   * for non-French names (spritz, mojito, sencha...), the original language & its label.
   *
   * @param { object } item - an item
   * @returns { void }
   */
  function nameIt(item) {
    const raw = String(item.front).split('<br>')[0];
    const spokenName = (text) =>
      String(text || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const fr = spokenName(raw);
    if (!fr) return;
    let en = (LTF_EN.dishes || {})[fr] || (LTF_EN.words || {})[fr] || '';
    if (item.ch === 'vins') {
      const sub = spokenName(String(item.front).split('<br>')[1] || '');
      const col = sub.split('·')[0].trim();
      en = fr + (col ? ', ' + ((LTF_EN.words || {})[col] || col) + ' wine' : '');
    }
    if (!en) en = fr;
    const frenchy =
      /(?<![\wÀ-ÿ])(de|du|des|la|le|les|au|aux|maison|château|noir|supérieur|provence|juillet)(?![\wÀ-ÿ])|[éèêàçùôî]/i.test(
        fr,
      );
    const originMatch = frenchy ? null : ORIG.find(([pattern]) => pattern.test(fr));
    item.say = { fr, en, ol: originMatch ? originMatch[1] : null, on: originMatch ? originMatch[2] : null };
  }
  // the device voices (they load asynchronously on some browsers)
  let VOICES = [];

  /**
   * `loadV` - Function 🗣️
   *
   * @returns { void } - refreshes `VOICES`
   */
  const loadV = () => {
    try {
      VOICES = speechSynthesis.getVoices() || [];
    } catch (error) {}
  };
  // 👂 reload the voices when the browser says they changed
  if (window.speechSynthesis) {
    loadV();
    speechSynthesis.onvoiceschanged = loadV;
  }
  // the voice names that usually sound best ✨
  const QUAL = /google|enhanced|premium|natural|neural|siri/i;

  /**
   * `voiceFor` - Function 🗣️
   *
   * Picks the best voice for a language: exact locale first, then a high quality one, a local one, any.
   *
   * @param { string } lang - e.g. 'fr-FR'
   * @returns { SpeechSynthesisVoice | null }
   */
  function voiceFor(lang) {
    const prefix = lang.slice(0, 2);
    const voices = VOICES.filter(
      (voice) => voice.lang && voice.lang.replace('_', '-').toLowerCase().startsWith(prefix),
    );
    const exact = voices.filter((voice) => voice.lang.replace('_', '-').toLowerCase() === lang.toLowerCase());
    const pool = exact.length ? exact : voices;
    return (
      pool.find((voice) => QUAL.test(voice.name)) ||
      pool.find((voice) => voice.localService) ||
      pool[0] ||
      null
    );
  }

  /**
   * `speakSeq` - Function 🔊
   *
   * Speaks a sequence of [text, lang] parts, a bit slower than normal.
   *
   * @param { Array<[string, string]> } parts - the parts to say, in order
   * @returns { void }
   */
  function speakSeq(parts) {
    if (!window.speechSynthesis) {
      toast(translate('Audio non disponible sur cet appareil', 'Audio not available on this device'));
      return;
    }
    speechSynthesis.cancel();
    loadV();
    parts.forEach(([txt, lang]) => {
      const utterance = new SpeechSynthesisUtterance(txt);
      utterance.lang = lang;
      const voice = voiceFor(lang);
      if (voice) utterance.voice = voice;
      utterance.rate = 0.88;
      speechSynthesis.speak(utterance);
    });
  }

  /**
   * `LTFsay` - Function (window) 🔊
   *
   * Says an item's name: `fr`, `en` or `or` (original) only, or all of them (app language first).
   *
   * @param { string } id - the item id
   * @param { 'fr' | 'en' | 'or' } [which] - one version only
   * @returns { void }
   */
  // tap = original (if not French) + French + English (order follows app language)
  window.LTFsay = (id, which) => {
    const item = items.find((entry) => entry.id === id);
    if (!item || !item.say) return;
    const speech = item.say;
    const frenchPart = [speech.fr, 'fr-FR'],
      ENp = [speech.en, 'en-GB'],
      originPart = speech.ol ? [speech.fr, speech.ol] : null;
    if (which === 'fr') return speakSeq([frenchPart]);
    if (which === 'en') return speakSeq([ENp]);
    if (which === 'or') return speakSeq([originPart || frenchPart]);
    const seq = EN ? [ENp, frenchPart] : [frenchPart, ENp];
    if (originPart) seq.unshift(originPart);
    speakSeq(seq);
  };
  // 🌍 the items, for the scan & the tests
  window.LTFitems = () => items;

  /**
   * `sayBtn` - Function 🔊
   *
   * @param { object } item - an item
   * @returns { string } - the small speaker button (or '')
   */
  const sayBtn = (item) =>
    item && item.say
      ? `<button class="sayb" onclick="event.stopPropagation();LTFsay('${item.id}')" aria-label="${translate('Écouter', 'Listen')}">${svgIcon('sound', 18)}</button>`
      : '';

  /**
   * `sayRow` - Function 🔊
   *
   * @param { object } item - an item
   * @returns { string } - the row of "original / Français / English" buttons of the ⓘ sheet (or '')
   */
  const sayRow = (item) =>
    !item || !item.say
      ? ''
      : `<div class="sayrow">` +
        `${item.say.ol ? `<button class="chip" onclick="LTFsay('${item.id}','or')">${svgIcon('sound', 16)} ${item.say.on}</button>` : ''}` +
        `<button class="chip" onclick="LTFsay('${item.id}','fr')">${svgIcon('sound', 16)}` +
        ` Français</button><button class="chip" onclick="LTFsay('${item.id}','en')">` +
        `${svgIcon('sound', 16)} English</button></div>`;

  /**
   * `add` - Function ➕
   *
   * Adds an item to a chapter (id = "<chapter>:<index>") and names it for the speech.
   *
   * @param { string } chapterId - the chapter id
   * @param { string } front - the card front (HTML)
   * @param { string } back - the card back (HTML)
   * @param { Array<Function> } gens - the question generators
   * @param { object } [extra] - extra fields (info, ikey, course, fact...)
   * @returns { object } - the new item
   */
  function add(chapterId, front, back, gens, extra) {
    const item = Object.assign(
      {
        id: chapterId + ':' + items.filter((item) => item.ch === chapterId).length,
        ch: chapterId,
        front,
        back,
        gens,
      },
      extra || {},
    );
    if (!item.fact && chapterId !== 'plan') nameIt(item);
    items.push(item);
    return item;
  }

  // ===== ⓘ INFO BUILDERS ℹ️ ===== //

  /**
   * `sec` - Function ℹ️
   *
   * @param { string } emoji - the section emoji
   * @param { string } title - the section title
   * @param { string } txt - the section text (HTML, already escaped)
   * @returns { string } - one section of the ⓘ sheet ('' when there's no text)
   */
  const sec = (emoji, title, txt) =>
    txt ? `<div class="isec"><div class="ih">${emoji} ${title}</div><div>${txt}</div></div>` : '';
  // the "what to tell the guest" section 💬
  const SAY = '💬',
    ttlSay = translate('À dire au client', 'What to tell the guest');

  /**
   * `infoDish` - Function 🍽
   *
   * @param { object } dish - a dish { n, en, ... }
   * @returns { string } - its ⓘ sheet: English, what to say, chef & service notes, words, allergens
   */
  function infoDish(dish) {
    const notes = (INFO.dish || {})[dish.n] || {};
    const en = dish.en || (LTF_EN.dishes || {})[dish.n] || '';
    return (
      sec('🇬🇧', translate('En anglais', 'In English'), esc(en)) +
      sec(SAY, ttlSay, esc(notes.say || '')) +
      sec('👨‍🍳', translate('Le chef (dégustation)', 'From the chef (tasting)'), esc(notes.chef || '')) +
      sec('🍽', translate('Au service', 'During service'), esc(notes.serv || '')) +
      sec('📖', translate('Mots à connaître', 'Words to know'), esc(notes.words || '')) +
      `<p class="warn">⚠ ${ALLERGY}</p>`
    );
  }
  // rich whites & big reds (for the pairing idea) 🍷
  const RICHW =
    /Meursault|Condrieu|Châteauneuf|Bandol|Beaune|Saint-Joseph|Pibarnon|Cardillone|Leoube|Minuty, Blanc/;
  const BIGR =
    /Bandol|Châteauneuf|Gigondas|Saint-Estèphe|Saint-Émilion|Crozes|Saint-Joseph|Nuits|Palette|Penedès|Sartène/;

  /**
   * `tasteSec` - Function 👅
   *
   * @param { string } tasteKey - the tasting key ("w|c@a" for wines, "c:<name>" for champagnes)
   * @returns { string } - the "On the palate" section (or '')
   */
  function tasteSec(tasteKey) {
    const taste = (LTF.taste || {})[tasteKey];
    return taste ? sec('👅', translate('En bouche', 'On the palate'), esc(EN ? taste.en : taste.fr)) : '';
  }

  /**
   * `infoWine` - Function 🍷
   *
   * @param { object } wine - a wine { w: producer, c: colour, a: appellation, r: region, v: vintage }
   * @returns { string } - its ⓘ sheet: what to say, palate, appellation, producer, pairing idea
   */
  function infoWine(wine) {
    const app = (INFO.wineApp || {})[wine.a] || '';
    const prodKey = Object.keys(INFO.wineProd || {}).find(
      (producer) => wine.w.indexOf(producer) === 0 || wine.w.indexOf(producer) >= 0,
    );
    const prod = prodKey ? INFO.wineProd[prodKey] : '';
    const colour = { Blanc: 'white', Rosé: 'rosé', Rouge: 'red' }[wine.c];
    const say = EN
      ? `A ${colour} ${wine.a} from ${translateWord(wine.r)}, ${wine.v}, by ${wine.w}.`
      : `Un ${wine.c === 'Blanc' ? 'blanc' : wine.c === 'Rosé' ? 'rosé' : 'rouge'} ${wine.a} (${wine.r}), millésime ${wine.v}, de ${wine.w}.`;
    const pairingKind =
      wine.c === 'Blanc'
        ? RICHW.test(wine.a + ' ' + wine.w)
          ? 'BlancRich'
          : 'Blanc'
        : wine.c === 'Rosé'
          ? 'Rosé'
          : BIGR.test(wine.a)
            ? 'RougeBig'
            : 'Rouge';
    return (
      sec(SAY, ttlSay, esc(say)) +
      tasteSec(`${wine.w}|${wine.c}@${wine.a}`) +
      sec('🍇', translate("L'appellation", 'The appellation'), esc(app)) +
      sec('🏡', translate('Le domaine', 'The producer'), esc(prod)) +
      sec('🍽', translate('Accord suggéré', 'Pairing idea'), esc((INFO.pairWith || {})[pairingKind] || ''))
    );
  }

  /**
   * `infoChamp` - Function 🥂
   *
   * @param { object } champagne - a champagne { n: name, t: format }
   * @returns { string } - its ⓘ sheet: what to say, palate, words to know, format
   */
  function infoChamp(champagne) {
    const houseKey = Object.keys(INFO.champagne || {}).find((house) => champagne.n.indexOf(house) >= 0);
    const terms = Object.keys(INFO.champagneTerms || {})
      .filter((term) => (champagne.n + ' ' + champagne.t).indexOf(term) >= 0)
      .map((term) => INFO.champagneTerms[term]);
    return (
      sec(SAY, ttlSay, esc(houseKey ? INFO.champagne[houseKey] : '')) +
      tasteSec('c:' + champagne.n) +
      sec('📖', translate('Mots à connaître', 'Words to know'), esc(terms.join(' '))) +
      sec('🇬🇧', translate('Format', 'Serving'), esc((LTF_EN.words || {})[champagne.t] || champagne.t))
    );
  }

  /**
   * `infoCock` - Function 🍸
   *
   * @param { object } cocktail - a cocktail { n, note? }
   * @returns { string } - its ⓘ sheet: English description, what to say, warning note
   */
  function infoCock(cocktail) {
    const english = (LTF_EN.cocktails || {})[cocktail.n] || {};
    return (
      sec('🇬🇧', translate('En anglais', 'In English'), esc(english.desc || '')) +
      sec(SAY, ttlSay, esc((INFO.cocktail || {})[cocktail.n] || '')) +
      (cocktail.note ? `<p class="warn">⚠ ${esc(EN && english.note ? english.note : cocktail.note)}</p>` : '')
    );
  }

  /**
   * `infoSoft` - Function 🥤
   *
   * @param { object } soft - a soft drink { n }
   * @returns { string } - its ⓘ sheet
   */
  function infoSoft(soft) {
    return (
      sec('🇬🇧', translate('En anglais', 'In English'), esc((LTF_EN.softs || {})[soft.n] || '')) +
      sec(SAY, ttlSay, esc((INFO.soft || {})[soft.n] || (INFO.cocktail || {})[soft.n] || ''))
    );
  }

  /**
   * `infoTea` - Function 🍵
   *
   * @param { object } tea - a tea { n }
   * @returns { string } - its ⓘ sheet
   */
  function infoTea(tea) {
    const english = (LTF_EN.teas || {})[tea.n] || [];
    return (
      sec(
        '🇬🇧',
        translate('En anglais', 'In English'),
        esc(english.length ? english[0] + ' — ' + english[1] : ''),
      ) + sec(SAY, ttlSay, esc((INFO.tea || {})[tea.n] || ''))
    );
  }

  /**
   * `infoCoffee` - Function ☕
   *
   * @param { object } coffee - a coffee { n }
   * @returns { string } - its ⓘ sheet (the tea line points to the Père Blaize teas)
   */
  function infoCoffee(coffee) {
    return (
      sec('🇬🇧', translate('En anglais', 'In English'), esc((LTF_EN.coffee || {})[coffee.n] || coffee.n)) +
      sec(
        SAY,
        ttlSay,
        esc(
          coffee.n === 'Thé / infusion'
            ? !EN && INFO.teaCoffee
              ? INFO.teaCoffee
              : "Teas and herbal teas from Maison Père Blaize, Marseille's historic herbalist (founded 1815). Eight choices — see the tea list."
            : INFO.coffee || '',
        ),
      )
    );
  }

  /**
   * `infoDig` - Function 🥃
   *
   * @param { object } digestif - a digestif { n }
   * @returns { string } - its ⓘ sheet
   */
  function infoDig(digestif) {
    return (
      sec('🇬🇧', translate('En anglais', 'In English'), esc((LTF_EN.digestifs || {})[digestif.n] || '')) +
      sec(SAY, ttlSay, esc((INFO.digestif || {})[digestif.n] || ''))
    );
  }

  /**
   * `infoPair` - Function 🍇
   *
   * @param { object } wine - a pairing wine { n, course, t, g, tk? }
   * @returns { string } - its ⓘ sheet: what to say (course of the Tasting Menu), palate, grapes
   */
  function infoPair(wine) {
    const english = (LTF_EN.pairing || {})[wine.n] || {};
    const say = EN
      ? `The ${{ Entrée: 'starter', 'Plat poisson': 'fish course', 'Plat viande': 'meat course', Dessert: 'dessert' }[wine.course]} pairing of the Tasting Menu (+55 € per person). ${english.t || ''}.`
      : `L'accord ` +
        `${{ Entrée: "de l'entrée", 'Plat poisson': 'du plat poisson', 'Plat viande': 'du plat viande', Dessert: 'du dessert' }[wine.course]}` +
        ` du Menu Dégustation (+55 € par personne). ${wine.t}.`;
    return (
      sec(SAY, ttlSay, esc(say)) +
      (wine.tk ? tasteSec(wine.tk) : '') +
      sec('🍇', translate('Cépages', 'Grapes'), esc(EN ? english.g || wine.g : wine.g))
    );
  }

  // ===== PHOTOS 📸 ===== //

  // the shipped photos { ikey: path } (images.js)
  const IMG = window.LTF_IMG || {};
  // the photo keys of the pairing wines (by pairing name) 🔗
  const PAIRKEY = {
    'Susucaru Rosato — Sicile': 'w:Frank Cornelissen, Susucaru Rosato|Rosé',
    'Indigena Blanc — Espagne': 'w:Domaine Parés Baltà, Cuvée Indigena|Blanc',
    'Octave Blanc — Grèce': 'w:Sous le Végétal, Cuvée Octave|Blanc',
    'Pero Longo Rouge — Corse': 'w:Domaine Pero Longo, Cuvée Équilibre|Rouge',
    'Indigena Rouge — Espagne': 'w:Domaine Parés Baltà, Cuvée Indigena|Rouge',
    'Câlin Polisson — Provence': 'g:Câlin Polisson',
  };

  /**
   * `firstKey` - Function 🔑
   *
   * @param { ...string } keys - candidate photo keys
   * @returns { string } - the first key that has a photo (else the first key)
   */
  const firstKey = (...keys) => keys.find((key) => key && IMG[key]) || keys[0];
  const PHOTOS = {}; // custom photos taken by the user: ikey -> dataURL
  // the placeholder photo per wine colour 🍷
  const PHDEF = { Blanc: 'img/_ph-blanc.jpg', Rosé: 'img/_ph-rose.jpg', Rouge: 'img/_ph-rouge.jpg' };

  /**
   * `photoOf` - Function 🖼️
   *
   * @param { object } item - an item
   * @returns { string | null } - its photo: the waiter's own, the shipped one, the placeholder, or null
   */
  function photoOf(item) {
    if (!item || !item.ikey) return null;
    return PHOTOS[item.ikey] || IMG[item.ikey] || item.phdef || null;
  }
  // the IndexedDB database `ltf_photos` (store `p`, key = ikey, value = data URL) 🗃️
  let idb = null;

  /**
   * `idbOpen` - Function 🗃️
   *
   * @returns { Promise<IDBDatabase | null> } - the photo database (null when unavailable)
   */
  function idbOpen() {
    return new Promise((res) => {
      try {
        if (!window.indexedDB) return res(null);
        const request = indexedDB.open('ltf_photos', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('p');
        request.onsuccess = () => {
          idb = request.result;
          res(idb);
        };
        request.onerror = () => res(null);
      } catch (error) {
        res(null);
      }
    });
  }

  /**
   * `idbAll` - Function 🗃️
   *
   * @returns { Promise<void> } - loads every own photo into `PHOTOS`
   */
  function idbAll() {
    return new Promise((res) => {
      if (!idb) return res();
      const transaction = idb.transaction('p');
      const store = transaction.objectStore('p');
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          PHOTOS[cursor.key] = cursor.value;
          cursor.continue();
        } else res();
      };
      request.onerror = () => res();
    });
  }

  /**
   * `idbPut` - Function 🗃️
   *
   * @param { string } key - the photo key (ikey)
   * @param { string | null } value - the data URL (null deletes it)
   * @returns { Promise<void> }
   */
  function idbPut(key, value) {
    return new Promise((res) => {
      if (!idb) return res();
      const transaction = idb.transaction('p', 'readwrite');
      value === null
        ? transaction.objectStore('p').delete(key)
        : transaction.objectStore('p').put(value, key);
      transaction.oncomplete = () => res();
      transaction.onerror = () => res();
    });
  }

  /**
   * `shrink` - Function 📷
   *
   * @param { File } file - a picked photo
   * @returns { Promise<string> } - a JPEG data URL, max 900 px, quality 0.8
   */
  function shrink(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const image = new Image();
        image.onload = () => {
          const MAX_SIZE = 900,
            scale = Math.min(1, MAX_SIZE / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          res(canvas.toDataURL('image/jpeg', 0.8));
        };
        image.onerror = rej;
        image.src = fr.result;
      };
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  // ===== BUILD: DISHES 🍽 ===== //

  // today (UTC) & whether the winter menu has started ❄️
  const TODAY = new Date().toISOString().slice(0, 10);
  const WINTER = TODAY >= '2026-10-19';
  // the dishes still on the menu (summer items carry an `until` date)
  const dishes = LTF.dishes.filter((dish) => !(dish.until && TODAY >= dish.until));
  // menu section -> course type 🍽
  const COURSE = {
    'Amuse-bouche': 'app',
    'Entrée dégustation': 'start',
    Poisson: 'main',
    Viande: 'main',
    'Dessert dégustation': 'dess',
    'Pour commencer': 'app',
    Entrée: 'start',
    Entrées: 'start',
    Plat: 'main',
    'De la mer': 'main',
    'De la terre': 'main',
    Fromages: 'cheese',
    Végétarien: 'main',
    Dessert: 'dess',
    Desserts: 'dess',
  };
  // the course order & labels [fr, en]
  const CORDER = ['app', 'start', 'main', 'cheese', 'dess'];
  const CLAB = {
    app: ['Pour commencer', 'Appetizer'],
    start: ['Entrée', 'Starter'],
    main: ['Plat principal', 'Main course'],
    cheese: ['Fromage', 'Cheese'],
    dess: ['Dessert', 'Dessert'],
  };

  /**
   * `cLab` - Function 🏷️
   *
   * @param { string } courseKey - a course type
   * @returns { string } - its label in the current language
   */
  const cLab = (courseKey) => (EN ? CLAB[courseKey][1] : CLAB[courseKey][0]);

  /**
   * `cBoth` - Function 🏷️
   *
   * @param { string } courseKey - a course type
   * @returns { string } - "Starter · Entrée" (both languages, current first)
   */
  const cBoth = (courseKey) =>
    EN ? CLAB[courseKey][1] + ' · ' + CLAB[courseKey][0] : CLAB[courseKey][0] + ' · ' + CLAB[courseKey][1];

  /**
   * `cSub` - Function 🐟
   *
   * @param { object } dish - a dish
   * @returns { string } - "fish" / "meat" for mains, else ''
   */
  const cSub = (dish) =>
    dish.s === 'Poisson'
      ? translate('poisson', 'fish')
      : dish.s === 'Viande'
        ? translate('viande', 'meat')
        : dish.s === 'De la mer'
          ? translate('poisson', 'fish')
          : dish.s === 'De la terre'
            ? translate('viande', 'meat')
            : '';
  // 🌍 the course type of an item (Carte filters)
  window.LTFcourseOf = (item) => item.course;
  // every menu section & the tasting menu sections
  const sections = uniq(dishes.map((dish) => dish.s));
  const DEGS = ['Amuse-bouche', 'Entrée dégustation', 'Poisson', 'Viande', 'Dessert dégustation'];
  // the service labels (when a dish is on the menu) 🕘
  const SVC = {
    g: translate('Menu Dégustation du jour', 'Tasting menu of the day'),
    h: translate("Carte d'hiver (dès le 19 octobre)", 'Winter menu (from 19 October)'),
    f: translate('Formule de la semaine (49 €)', 'Weekly formula (49 €)'),
    b: translate('Déjeuner et dîner', 'Lunch and dinner'),
    d: translate('Dîner uniquement', 'Dinner only'),
    l: translate('Déjeuner uniquement', 'Lunch only'),
  };

  /**
   * `svcBase` - Function 🕘
   *
   * @param { object } dish - a dish
   * @returns { string } - formula / lunch and dinner / dinner only / lunch only
   */
  const svcBase = (dish) =>
    dish.svc.includes('formule')
      ? SVC.f
      : dish.svc.includes('dej') && dish.svc.includes('diner')
        ? SVC.b
        : dish.svc.includes('diner')
          ? SVC.d
          : SVC.l;

  /**
   * `hPre` - Function ❄️
   *
   * @param { object } dish - a dish
   * @returns { string } - "Winter menu (from 19 October) · " before the winter launch, else ''
   */
  const hPre = (dish) => (dish.svc.includes('hiver') && !WINTER ? SVC.h + ' · ' : '');

  /**
   * `svcLabel` - Function 🕘
   *
   * @param { object } dish - a dish
   * @returns { string } - when the dish is served
   */
  const svcLabel = (dish) =>
    dish.svc.includes('deg')
      ? SVC.g
      : dish.svc.includes('hiver') && !dish.svc.includes('dej') && !dish.svc.includes('diner')
        ? SVC.h
        : hPre(dish) + svcBase(dish);

  /**
   * `unitTxt` - Function ⚖️
   *
   * @param { string } unit - a price unit
   * @returns { string } - the unit in the current language
   */
  const unitTxt = (unit) => (EN ? (unit === 'les 100 g' ? 'per 100 g' : unit) : unit);

  /**
   * `dishPrice` - Function 💶
   *
   * @param { object } dish - a dish
   * @returns { string | null } - its price with the unit (null when not priced)
   */
  const dishPrice = (dish) =>
    dish.p === null ? null : eur(dish.p) + (dish.unit ? ' ' + unitTxt(dish.unit) : '');

  /**
   * `dEn` - Function 🇬🇧
   *
   * @param { object } dish - a dish
   * @returns { string } - its English description ('' when unknown)
   */
  const dEn = (dish) => dish.en || (LTF_EN.dishes || {})[dish.n] || '';
  const dDesc = (dish) => (EN ? dEn(dish) || dish.d : dish.d); // what the "accompaniment" means in each language

  /**
   * `p2lab` - Function 🏷️
   *
   * @param { object } dish - a dish with a second price
   * @returns { string } - the label of the second price ("as a main")
   */
  const p2lab = (dish) => (EN ? 'as a main' : dish.p2label);
  // the answers of "is it served at lunch?" (winter menu) ☀️🌙
  const HIDEJ = [
    translate('Oui, midi et soir', 'Yes, lunch and dinner'),
    translate('Non, le soir uniquement', 'No, dinner only'),
  ];
  // the pictograms of the winter menu (+ labels) 🏷️
  const PICTS = ['veg', 'crab', 'shell', 'fish', 'duck', 'poultry', 'beef', 'shell+pork', ''];
  const PICTL = {
    veg: ['🌿 Feuille (végétarien)', '🌿 Leaf (vegetarian)'],
    crab: ['🦀 Crabe (crustacé)', '🦀 Crab (crustacean)'],
    shell: ['🐚 Coquillage', '🐚 Shell (shellfish)'],
    fish: ['🐟 Poisson', '🐟 Fish'],
    duck: ['🦆 Canard', '🦆 Duck'],
    poultry: ['🐓 Volaille', '🐓 Poultry'],
    beef: ['🐄 Bœuf', '🐄 Beef'],
    'shell+pork': ['🐚 + 🐖 Coquillage et porc', '🐚 + 🐖 Shellfish and pork'],
    '': ['Aucun pictogramme', 'No pictogram'],
  };

  /**
   * `pictLab` - Function 🏷️
   *
   * @param { string } pictogram - a pictogram key
   * @returns { string } - its label
   */
  const pictLab = (pictogram) => (PICTL[pictogram] || PICTL[''])[EN ? 1 : 0];
  // the allergen codes & labels (indicative only, `?` = likely) ⚠️
  const ALGK = [
    'gluten',
    'crust',
    'egg',
    'fish',
    'moll',
    'milk',
    'nuts',
    'pine',
    'celery',
    'soy',
    'sesame',
    'pork',
  ];
  const ALGL = {
    gluten: ['Gluten', 'Gluten'],
    crust: ['Crustacés', 'Crustaceans'],
    egg: ['Œuf', 'Egg'],
    fish: ['Poisson', 'Fish'],
    moll: ['Mollusques', 'Molluscs'],
    milk: ['Lait / lactose', 'Milk / lactose'],
    nuts: ['Fruits à coque', 'Tree nuts'],
    pine: ['Pignon de pin', 'Pine nuts'],
    celery: ['Céleri', 'Celery'],
    soy: ['Soja', 'Soy'],
    sesame: ['Sésame', 'Sesame'],
    pork: ['Porc', 'Pork'],
  };

  /**
   * `algLab` - Function ⚠️
   *
   * @param { string } allergenCode - an allergen code
   * @returns { string } - its label
   */
  const algLab = (allergenCode) => ALGL[allergenCode][EN ? 1 : 0];

  /**
   * `algOf` - Function ⚠️
   *
   * @param { object } dish - a dish
   * @returns { Array<{ k: string, q: boolean }> } - its allergens (q = likely)
   */
  const algOf = (dish) =>
    (dish.alg || '')
      .split(',')
      .filter(Boolean)
      .map((code) => ({ k: code.replace('?', ''), q: code.endsWith('?') }));
  // the allergen disclaimer
  const ALGNOTE = translate(
    "Indicatif, d'après la carte et la dégustation : toujours confirmer avec la carte allergènes et la cuisine.",
    'Indicative, from the menu and the tasting: always confirm with the allergen chart and the kitchen.',
  );
  // 🍽 every dish becomes one item per chapter it belongs to, with its question generators
  dishes.forEach((dish) => {
    // the chapters of the dish (tasting / desserts / formula / lunch & dinner / dinner)
    const chs = dish.svc.includes('deg')
      ? ['diner']
      : dish.s === 'Desserts' || dish.s === 'Fromages'
        ? ['dess']
        : dish.svc.includes('formule')
          ? ['dej']
          : dish.svc.includes('dej')
            ? ['dej', 'diner']
            : ['diner'];
    if (dish.svc.includes('hiver')) chs.push('hiver');
    if (dish.svc.includes('deg')) chs.push('jour');
    // one item per chapter
    chs.forEach((chapter) => {
      const gens = [];
      // 💶 the price
      if (dish.p !== null)
        gens.push(() =>
          mcq(
            translate(`Combien coûte « ${dish.n} » ?`, `How much is "${dish.n}"?`),
            dishPrice(dish),
            dishes.filter((dish) => dish.p !== null).map(dishPrice),
            `${dish.n} : ${dishPrice(dish)}${dish.p2 ? ` (${eur(dish.p2)} ${p2lab(dish)})` : ''}.`,
          ),
        );
      // 🥗 which dish comes with ...
      if (dish.d)
        gens.push(() =>
          mcq(
            EN ? `Which dish is this: "${dDesc(dish)}"?` : `Quel plat est servi avec : « ${dish.d} » ?`,
            dish.n,
            dishes.map((dish) => dish.n),
            `${dish.n} — ${dish.d}.`,
          ),
        );
      // 🥗 what comes with ...
      if (dish.d)
        gens.push(() =>
          mcq(
            translate(`Comment est accompagné(e) « ${dish.n} » ?`, `What comes with "${dish.n}"?`),
            dish.d,
            dishes.filter((dish) => dish.d).map((dish) => dish.d),
            dEn(dish),
          ),
        );
      // 📖 the menu section
      gens.push(() =>
        mcq(
          translate(
            `Dans quelle section de la carte se trouve « ${dish.n} » ?`,
            `Which section of the menu is "${dish.n}" in?`,
          ),
          translateWord(dish.s),
          (dish.svc.includes('deg')
            ? DEGS
            : dish.svc.includes('formule')
              ? ['Entrée', 'Plat', 'Dessert']
              : sections.filter((section) => !['Entrée', 'Plat', 'Dessert'].concat(DEGS).includes(section))
          ).map(translateWord),
          '',
        ),
      );
      // 🇬🇧 the English description
      if (dEn(dish))
        gens.push(() =>
          mcq(
            translate(
              `Comment présenter « ${dish.n} » à un client anglophone ?`,
              `How do you describe "${dish.n}" to an English-speaking guest?`,
            ),
            dEn(dish),
            dishes.map(dEn).filter(Boolean),
            '',
          ),
        );
      // 🍽 the course type
      if (COURSE[dish.s])
        gens.push(() =>
          mcq(
            translate(`« ${dish.n} » : c'est quoi ?`, `"${dish.n}": what kind of course is it?`),
            cBoth(COURSE[dish.s]),
            CORDER.map(cBoth),
            translate(
              'Pour commencer = petites choses à partager en attendant ; Entrée = premier plat (≠ « entrée » américaine, qui veut dire plat principal !) ; Plat = plat principal.',
              'Appetizer = small bites to share first; Starter (French "entrée") = first course (careful: in American English "entrée" means main course!); Main course = the "plat".',
            ),
          ),
        );
      // 🕘 when it's on the menu
      gens.push(() =>
        mcq(
          translate(`Quand « ${dish.n} » est-il à la carte ?`, `When is "${dish.n}" on the menu?`),
          svcLabel(dish),
          dish.svc.includes('deg')
            ? [SVC.g, SVC.f, SVC.b, SVC.d]
            : dish.svc.includes('hiver')
              ? [SVC.b, SVC.d, SVC.l, SVC.f].map((service) => hPre(dish) + service)
              : [SVC.f, SVC.b, SVC.d, SVC.l],
          '',
        ),
      );
      // ⚠️ what to warn about (allergens)
      if (
        /noisette|jambon|cochon|chorizo|thon|calamar|loup|Saint-Pierre|maigre|pêche suivant|crabe|huîtres|palourdes|Saint-Jacques|rouget|poutargue/i.test(
          dish.n + ' ' + dish.d,
        )
      )
        gens.push(() => {
          const choices = [
            translate('Fruits à coque (noisette)', 'Nuts (hazelnut)'),
            translate('Porc', 'Pork'),
            translate('Poisson / produits de la mer', 'Fish / seafood'),
            translate('Rien de tout cela', 'None of these'),
          ];
          // the right answer for this dish
          const rightAnswer = /noisette/i.test(dish.n + dish.d)
            ? choices[0]
            : /jambon|cochon/i.test(dish.n + dish.d)
              ? choices[1]
              : choices[2];
          return mcq(
            translate(
              `D'après la carte, que contient « ${dish.n} » ?`,
              `According to the menu, what does "${dish.n}" contain?`,
            ),
            rightAnswer,
            choices,
            ALLERGY,
          );
        });
      // ❄️ winter menu only: lunch too? & which pictogram?
      if (chapter === 'hiver' && !['Desserts', 'Fromages'].includes(dish.s)) {
        gens.push(() =>
          mcq(
            translate(
              `« ${dish.n} » est-il aussi sur la carte du midi ?`,
              `Is "${dish.n}" also on the lunch menu?`,
            ),
            dish.svc.includes('dej') ? HIDEJ[0] : HIDEJ[1],
            HIDEJ,
            translate(
              'Sur la fiche, les plats surlignés en jaune sont aussi à la carte du midi.',
              'On the sheet, dishes highlighted in yellow are also on the lunch menu.',
            ),
          ),
        );
        gens.push(() =>
          mcq(
            translate(
              `Quel pictogramme accompagne « ${dish.n} » sur la carte ?`,
              `Which pictogram is next to "${dish.n}" on the menu?`,
            ),
            pictLab(dish.pict || ''),
            PICTS.map(pictLab),
            translate(
              'Les pictogrammes indiquent le produit principal (pas tous les allergènes) : toujours confirmer avec la cuisine.',
              'Pictograms show the main product (not every allergen): always confirm with the kitchen.',
            ),
          ),
        );
      }
      // ❄️ winter menu only: one allergen it surely contains
      if (chapter === 'hiver') {
        const allergens = algOf(dish),
          sure = allergens.filter((allergen) => !allergen.q);
        if (sure.length)
          gens.push(() =>
            mcq(
              translate(`Quel allergène contient « ${dish.n} » ?`, `Which allergen is in "${dish.n}"?`),
              algLab(sure[0].k),
              [algLab(sure[0].k)].concat(
                ALGK.filter((allergenCode) => !allergens.some((allergen) => allergen.k === allergenCode)).map(
                  algLab,
                ),
              ),
              ALGNOTE,
            ),
          );
      }
      // the card back: course badge, description & English name
      const desc = EN
        ? dEn(dish)
          ? esc(dEn(dish)) + '<br><small>' + esc(dish.d) + '</small><br>'
          : ''
        : `${dish.d ? dish.d + '<br>' : ''}${dish.en ? '<i>' + esc(dish.en) + '</i><br>' : ''}`;
      // ➕ the item
      add(
        chapter,
        dish.n + (EN && dEn(dish) ? '' : ''),
        `${COURSE[dish.s] ? `<span class="cb cb-${COURSE[dish.s]}">${cLab(COURSE[dish.s])}${cSub(dish) ? ' · ' + cSub(dish) : ''}</span> ` : ''}` +
          `${desc}<b>${translateWord(dish.s)}</b> · ${svcLabel(dish)}` +
          `${dish.p !== null ? ' · ' + dishPrice(dish) : ''}` +
          `${dish.p2 ? ' / ' + eur(dish.p2) + ' ' + p2lab(dish) : ''}`,
        gens,
        {
          info: infoDish(dish),
          ikey: 'd:' + dish.n,
          course: COURSE[dish.s],
          csub: cSub(dish),
          as2: dish.p2 ? p2lab(dish) : '',
        },
      );
    });
  });

  // ===== BUILD: FIXED FACTS 📌 ===== //

  // the fixed facts of the dinner chapter [question, answer, wrong answers]
  // ⚠️ keep this table exactly as it is: `rust/tools/gen_appdata.js` reads it as text for the Rust port 🦀
  // prettier-ignore
  const factQs = EN ? [
 ['Price of the Tasting Menu "Voyage en Méditerranée"?','89 €',['79 €','95 €','99 €','109 €']],
 ['Price of the Tasting Menu wine pairing?','+ 55 €',['+ 45 €','+ 49 €','+ 65 €','+ 75 €']],
 ['How many courses in the Tasting Menu?','4 courses (after the amuse-bouche: starter, fish, meat, dessert)',['3 courses (starter, main, dessert)','5 courses with cheese','6 courses with cheese and pre-dessert']],
 ['When is the Tasting Menu served at lunch?','Only on weekends and public holidays',['Every day','Never','Only on Fridays']],
 ['Can just one guest at the table take the Tasting Menu?','No, it is for the whole table',['Yes, no conditions','Yes, with a 10 € supplement','Only at lunch']],
 ['Total for 2: Tasting Menu + wine pairing?','288 €',['178 €','244 €','298 €','310 €']],
 ['Price of the weekly lunch formula (starter / main / dessert)?','49 €',['39 €','45 €','55 €','59 €']],
 ['Origin of the meat stated on the menu?','France',['Spain','European Union','Italy']],
 ['Foyot sauce, served with the ribeye, is…','A béarnaise mounted with meat glaze',['A green peppercorn sauce','A maître d\'hôtel butter','A Provençal sauce vierge']],
 ['A guest asks for tap water. What do you offer?','Eau de Marseille, available on request',['Bottled water only','A free Vittel','It\'s not possible']],
 ['Menu prices are…','Net, service and taxes included',['Before tax','Service not included (+10%)','Tax included, service extra']],
 ['The "Retour de pêche suivant la Criée" is charged…','14 € per 100 g',['42 € each','14 € per portion','24 € per 100 g']]
] : [
 ['Prix du Menu Dégustation « Voyage en Méditerranée » ?','89 €',['79 €','95 €','99 €','109 €']],
 ['Prix de l\'accord mets et vins du Menu Dégustation ?','+ 55 €',['+ 45 €','+ 49 €','+ 65 €','+ 75 €']],
 ['Combien d\'étapes compte le Menu Dégustation ?','4 étapes (après l\'amuse-bouche : entrée, poisson, viande, dessert)',['3 étapes (entrée, plat, dessert)','5 étapes avec fromage','6 étapes avec fromage et pré-dessert']],
 ['Quand le Menu Dégustation est-il servi au déjeuner ?','Uniquement le week-end et les jours fériés',['Tous les jours','Jamais','Uniquement le vendredi']],
 ['Un seul convive peut-il prendre le Menu Dégustation ?','Non, il est destiné à l\'ensemble de la table',['Oui, sans condition','Oui, avec un supplément de 10 €','Seulement au déjeuner']],
 ['Total pour 2 personnes : Menu Dégustation + accord mets et vins ?','288 €',['178 €','244 €','298 €','310 €']],
 ['Prix de la formule déjeuner de la semaine (entrée / plat / dessert) ?','49 €',['39 €','45 €','55 €','59 €']],
 ['Origine des viandes indiquée sur la carte ?','France',['Espagne','Union européenne','Italie']],
 ['La sauce Foyot, servie avec l\'entrecôte, c\'est…','Une béarnaise montée avec de la glace de viande',['Une sauce au poivre vert','Un beurre maître d\'hôtel','Une sauce vierge provençale']],
 ['Un client demande de l\'eau du robinet. Que proposer ?','L\'Eau de Marseille, disponible sur demande',['Uniquement de l\'eau en bouteille','Une Vittel offerte','Ce n\'est pas possible']],
 ['Les prix de la carte sont…','Nets, service et taxes compris',['Hors taxes','Hors service (+10 %)','TTC hors service']],
 ['Le « Retour de pêche suivant la Criée » est facturé…','14 € les 100 g',['42 € la pièce','14 € la portion','24 € les 100 g']]
];
  // ➕ one fact item per question (+ the daily briefing & the winter facts from data.js)
  factQs.forEach(([question, answer, options]) =>
    add('diner', question, answer, [() => mcq(question, answer, options, '')], { fact: true }),
  );
  ((LTF.jour || {})[EN ? 'en' : 'fr'] || []).forEach(([question, answer, options, explanation]) =>
    add('jour', question, answer, [() => mcq(question, answer, options, explanation || '')], { fact: true }),
  );
  ((LTF.hq || {})[EN ? 'en' : 'fr'] || []).forEach(([question, answer, options, explanation]) =>
    add('hiver', question, answer, [() => mcq(question, answer, options, explanation || '')], { fact: true }),
  );
  // the "Did you know?" facts of the hub
  const FACTS = EN && LTF_EN.facts ? LTF_EN.facts : LTF.facts;

  // ===== BUILD: COCKTAILS & SOFTS 🍸 ===== //

  /**
   * `cocktailEn` - Function 🇬🇧
   *
   * @param { object } cocktail - a cocktail
   * @returns { object } - its English strings { desc, method, batch, note } ({} when missing)
   */
  const cocktailEn = (cocktail) => (LTF_EN.cocktails || {})[cocktail.n] || {};
  // every ingredient (for the wrong answers) & the usual doses 🧪
  const allIngr = uniq(
    LTF.cocktails.flatMap((cocktail) =>
      cocktail.recipe.map((ingredientLine) => translateWord(ingredientLine[0])),
    ),
  );
  const doses = [0.5, 1, 2, 3, 4, 6, 8, 9, 12, 14, 24, 25, 30, 35, 40].map(
    (volume) => String(volume).replace('.', EN ? '.' : ',') + ' cl',
  );

  /**
   * `dose` - Function 🧪
   *
   * @param { number } volume - a dose in cl
   * @returns { string } - "2,5 cl" (French) / "2.5 cl" (English)
   */
  const dose = (volume) => String(volume).replace('.', EN ? '.' : ',') + ' cl';

  /**
   * `recipeTxt` - Function 📝
   *
   * @param { object } cocktail - a cocktail
   * @returns { string } - "4 cl Gin, 2 cl Lemon juice, ..."
   */
  const recipeTxt = (cocktail) =>
    cocktail.recipe
      .map(
        (ingredientLine) =>
          `${typeof ingredientLine[1] === 'number' ? dose(ingredientLine[1]) + ' ' : translateWord(ingredientLine[1]) + ' '}${translateWord(ingredientLine[0])}`,
      )
      .join(', ');
  // the method, batch & note in the current language
  const cMethod = (cocktail) =>
    EN && cocktailEn(cocktail).method ? cocktailEn(cocktail).method : cocktail.method;
  const cBatch = (cocktail) =>
    EN && cocktailEn(cocktail).batch ? cocktailEn(cocktail).batch : cocktail.batch;
  const cNote = (cocktail) =>
    cocktail.note ? (EN && cocktailEn(cocktail).note ? cocktailEn(cocktail).note : cocktail.note) : '';
  // 🍸 every cocktail: ingredients, glass, price, method, garnish & each dose
  LTF.cocktails.forEach((cocktail) => {
    const gens = [
      () =>
        mcq(
          translate(`Quels ingrédients composent « ${cocktail.n} » ?`, `What goes into "${cocktail.n}"?`),
          cocktail.recipe.map((ingredientLine) => translateWord(ingredientLine[0])).join(' + '),
          LTF.cocktails.map((cocktail) =>
            cocktail.recipe.map((ingredientLine) => translateWord(ingredientLine[0])).join(' + '),
          ),
          recipeTxt(cocktail),
        ),
      () =>
        mcq(
          translate(
            `Dans quel verre sert-on « ${cocktail.n} » ?`,
            `Which glass is "${cocktail.n}" served in?`,
          ),
          translateWord(cocktail.glass),
          uniq(LTF.cocktails.map((cocktail) => translateWord(cocktail.glass))).concat([
            translate('Coupe Martini', 'Martini glass'),
            'Tumbler',
          ]),
          cMethod(cocktail),
        ),
      () =>
        mcq(
          translate(`Prix de « ${cocktail.n} » à la carte ?`, `Menu price of "${cocktail.n}"?`),
          eur(cocktail.p),
          ['7 €', '10 €', '13 €', '14 €', '22 €', '24 €', '26 €'],
          '',
        ),
      () =>
        mcq(
          translate(`Comment prépare-t-on « ${cocktail.n} » ?`, `How is "${cocktail.n}" made?`),
          cMethod(cocktail),
          LTF.cocktails.map(cMethod),
          cNote(cocktail),
        ),
    ];
    // 🍋 the garnish
    if (cocktail.garnish && cocktail.garnish !== '—')
      gens.push(() =>
        mcq(
          translate(`Garniture de « ${cocktail.n} » ?`, `Garnish for "${cocktail.n}"?`),
          translateWord(cocktail.garnish),
          uniq(LTF.cocktails.map((cocktail) => translateWord(cocktail.garnish))).filter(
            (garnish) => garnish !== '—',
          ),
          '',
        ),
      );
    // 🧪 one question per dose
    cocktail.recipe
      .filter((ingredientLine) => typeof ingredientLine[1] === 'number')
      .forEach((ingredientLine) =>
        gens.push(() =>
          mcq(
            EN
              ? `How much ${translateWord(ingredientLine[0])} in "${cocktail.n}"${cocktail.batch ? ' (batch: ' + cBatch(cocktail) + ')' : ''}?`
              : `Combien de ${ingredientLine[0]} dans « ${cocktail.n} »${cocktail.batch ? ' (préparation ' + cocktail.batch + ')' : ''} ?`,
            dose(ingredientLine[1]),
            doses,
            recipeTxt(cocktail) + (cocktail.note ? ' — ' + cNote(cocktail) : ''),
          ),
        ),
      );
    // ➕ the item
    const desc = EN ? `<i>${esc(cocktailEn(cocktail).desc || cocktail.desc)}</i><br>` : '';
    add(
      'cock',
      cocktail.n,
      `${desc}<b>${recipeTxt(cocktail)}</b>` +
        `${cocktail.batch ? '<br>' + translate('Préparation', 'Batch') + ' : ' + cBatch(cocktail) : ''}` +
        `<br>${translate('Verre', 'Glass')} : ${translateWord(cocktail.glass)} · ` +
        `${translate('Garniture', 'Garnish')} : ${translateWord(cocktail.garnish)}<br>` +
        `${esc(cMethod(cocktail))}<br>${translate('Prix', 'Price')} : ${eur(cocktail.p)}` +
        `${cocktail.note ? '<br><span class="warn">⚠ ' + esc(cNote(cocktail)) + '</span>' : ''}`,
      gens,
      { cocktail: cocktail, info: infoCock(cocktail), ikey: 'k:' + cocktail.n, phdef: 'img/_ph-soft.jpg' },
    );
  });

  /**
   * `softDescription` - Function 🥤
   *
   * @param { object } soft - a soft drink
   * @returns { string } - its description in the current language
   */
  const softDescription = (soft) => (EN && (LTF_EN.softs || {})[soft.n] ? LTF_EN.softs[soft.n] : soft.d);
  // 🥤 every soft drink: its price
  LTF.softs.forEach((soft) =>
    add(
      'cock',
      soft.n,
      `${softDescription(soft)} · ${eur(soft.p)}`,
      [
        () =>
          mcq(
            translate(
              `Prix de « ${soft.n} » (${soft.d}) ?`,
              `Price of "${soft.n}" (${softDescription(soft)})?`,
            ),
            eur(soft.p),
            LTF.softs.map((soft) => eur(soft.p)).concat(['9 €', '12 €']),
            '',
          ),
      ],
      { info: infoSoft(soft), ikey: firstKey('s:' + soft.n, 'k:' + soft.n), phdef: 'img/_ph-soft.jpg' },
    ),
  );

  // ===== BUILD: COFFEE & TEAS ☕ ===== //

  // the coffee note of the hub
  const coffeeNote = EN && LTF_EN.coffeeNote ? LTF_EN.coffeeNote : LTF.coffeeNote;

  /**
   * `cfN` - Function ☕
   *
   * @param { object } coffee - a coffee
   * @returns { string } - its name in the current language
   */
  const cfN = (coffee) => (EN && (LTF_EN.coffee || {})[coffee.n] ? LTF_EN.coffee[coffee.n] : coffee.n);
  // ☕ every coffee: its lunch & dinner prices (they differ!)
  LTF.coffee.forEach((coffee) => {
    const gens = [];
    ['dej', 'diner'].forEach((service) => {
      if (coffee[service] !== null)
        gens.push(() =>
          mcq(
            EN
              ? `At ${service === 'dej' ? 'LUNCH' : 'DINNER'}, how much is: ${cfN(coffee)}?`
              : `${service === 'dej' ? 'Au DÉJEUNER' : 'Au DÎNER'}, combien coûte : ${coffee.n} ?`,
            eur(coffee[service]),
            ['5 €', '6 €', '7 €', '8 €', '9 €'],
            translate(
              'Attention : les prix des cafés diffèrent entre la carte du déjeuner et celle du dîner.',
              'Careful: coffee prices differ between the lunch and dinner menus.',
            ),
          ),
        );
    });
    add(
      'cafe',
      cfN(coffee),
      `${translate('Déjeuner', 'Lunch')} : ${eur(coffee.dej)} · ${translate('Dîner', 'Dinner')} : ${coffee.diner === null ? '—' : eur(coffee.diner)}<br><small>${coffeeNote}</small>`,
      gens,
      { info: infoCoffee(coffee), ikey: coffee.n === 'Thé / infusion' ? 't:_tisane' : 'f:_coffee' },
    );
  });

  /**
   * `teaEn` - Function 🍵
   *
   * @param { object } tea - a tea
   * @returns { [string, string] } - its [English name, English ingredients]
   */
  const teaEn = (tea) => (LTF_EN.teas || {})[tea.n] || [tea.n, tea.i];

  /**
   * `teaInfo` - Function 🍵
   *
   * @param { object } tea - a tea
   * @returns { string } - its ingredients in the current language
   */
  const teaInfo = (tea) => (EN ? teaEn(tea)[1] : tea.i);
  // 🍵 every tea: which one contains ... & what's in it
  LTF.teas.forEach((tea) =>
    add(
      'cafe',
      tea.n,
      (EN ? '<i>' + esc(teaEn(tea)[0]) + '</i><br>' : '') + teaInfo(tea) + ' · 8 €',
      [
        () =>
          mcq(
            translate(`Quelle infusion contient : ${tea.i} ?`, `Which tea contains: ${teaInfo(tea)}?`),
            tea.n,
            LTF.teas.map((tea) => tea.n),
            'Maison Père Blaize — 8 €',
          ),
        () =>
          mcq(
            translate(`Que contient « ${tea.n} » ?`, `What is in "${tea.n}"?`),
            teaInfo(tea),
            LTF.teas.map(teaInfo),
            '',
          ),
      ],
      { info: infoTea(tea), ikey: firstKey('t:' + tea.n, 't:_tisane') },
    ),
  );

  // ===== BUILD: WINES 🍷 ===== //

  // the wine list
  const WINES = LTF.wines;

  /**
   * `wlabel` - Function 🏷️
   *
   * @param { object } wine - a wine
   * @returns { string } - "Appellation — Producer 2022 (colour)"
   */
  const wlabel = (wine) => `${wine.a} — ${wine.w} ${wine.v} (${translateWord(wine.c).toLowerCase()})`;

  /**
   * `wprice` - Function 💶
   *
   * @param { object } wine - a wine
   * @returns { string } - the glass / bottle price, or the bottle price
   */
  const wprice = (wine) =>
    wine.p2
      ? EN
        ? `${eur(wine.p)} a glass / ${eur(wine.p2)} a bottle`
        : `${eur(wine.p)} le verre / ${eur(wine.p2)} la bouteille`
      : eur(wine.p);
  // every region (for the wrong answers) 🗺️
  const regions = uniq(WINES.map((wine) => translateWord(wine.r)));
  // 🍷 every wine: region, price, vintage, colour & producer
  WINES.forEach((wine) => {
    const gens = [
      () =>
        mcq(
          translate(
            `De quelle région vient : ${wine.a}, ${wine.w} ${wine.v} ?`,
            `Which region is this from: ${wine.a}, ${wine.w} ${wine.v}?`,
          ),
          translateWord(wine.r),
          regions,
          '',
        ),
      () =>
        mcq(
          translate(
            `Prix de ${wlabel(wine)} — ${wine.f} ?`,
            `Price of ${wlabel(wine)} — ${translateWord(wine.f)}?`,
          ),
          wprice(wine),
          WINES.filter((candidate) => !!candidate.p2 === !!wine.p2).map(wprice),
          '',
        ),
      () =>
        mcq(
          translate(
            `Quel millésime pour ${wine.a}, ${wine.w} (${wine.c.toLowerCase()}, ${wine.f}) ?`,
            `Which vintage: ${wine.a}, ${wine.w} (${translateWord(wine.c).toLowerCase()}, ${translateWord(wine.f)})?`,
          ),
          String(wine.v),
          WINES.map((candidate) => String(candidate.v)),
          '',
        ),
      () =>
        mcq(
          translate(
            `Couleur de ${wine.a}, ${wine.w} ${wine.v} ?`,
            `Colour of ${wine.a}, ${wine.w} ${wine.v}?`,
          ),
          translateWord(wine.c),
          ['Blanc', 'Rosé', 'Rouge'].map(translateWord),
          '',
        ),
      // 🏡 the producer (wrong answers: producers without this appellation)
      () => {
        const bad = WINES.filter((candidate) => !(candidate.a === wine.a))
          .map((candidate) => candidate.w)
          .filter(
            (producer) => !WINES.some((wineEntry) => wineEntry.a === wine.a && wineEntry.w === producer),
          );
        return mcq(
          translate(
            `Quel domaine/maison propose le ${wine.a} ${wine.c.toLowerCase()} ${wine.v} (${wine.f}) ?`,
            `Which producer makes the ${translateWord(wine.c).toLowerCase()} ${wine.a} ${wine.v} (${translateWord(wine.f)})?`,
          ),
          wine.w,
          bad,
          '',
        );
      },
    ];
    // ➕ the item (placeholder photo by colour)
    add(
      'vins',
      `${wine.a}<br><small>${translateWord(wine.c)} · ${translateWord(wine.f)}</small>`,
      `${wine.w} ${wine.v}<br>${translateWord(wine.r)} · ${wprice(wine)}`,
      gens,
      {
        info: infoWine(wine),
        ikey: firstKey(`w:${wine.w}|${wine.c}@${wine.a}`, `w:${wine.w}|${wine.c}`),
        phdef: PHDEF[wine.c],
      },
    );
  });

  // ===== BUILD: CHAMPAGNES 🥂 ===== //

  // the champagne list
  const CHAMPAGNES = LTF.champagnes;
  // 🥂 every champagne: price & category
  CHAMPAGNES.forEach((champagne) =>
    add(
      'champ',
      `${champagne.n}<br><small>${translateWord(champagne.t)}</small>`,
      eur(champagne.p),
      [
        () =>
          mcq(
            translate(
              `Prix de ${champagne.n} — ${champagne.t} ?`,
              `Price of ${champagne.n} — ${translateWord(champagne.t)}?`,
            ),
            eur(champagne.p),
            CHAMPAGNES.map((candidate) => eur(candidate.p)),
            '',
          ),
        () =>
          mcq(
            translate(
              `Dans quelle catégorie est ${champagne.n} à ${eur(champagne.p)} ?`,
              `Which category is ${champagne.n} at ${eur(champagne.p)}?`,
            ),
            translateWord(champagne.t),
            uniq(CHAMPAGNES.map((candidate) => translateWord(candidate.t))),
            '',
          ),
      ],
      { info: infoChamp(champagne), ikey: 'c:' + champagne.n },
    ),
  );

  // ===== BUILD: DIGESTIFS 🥃 ===== //

  // the digestif list
  const DIGESTIFS = LTF.digestifs;

  /**
   * `dgD` - Function 🥃
   *
   * @param { object } digestif - a digestif
   * @returns { string } - its description in the current language
   */
  const dgD = (digestif) =>
    EN && (LTF_EN.digestifs || {})[digestif.n] ? LTF_EN.digestifs[digestif.n] : digestif.d;
  // 🥃 every digestif: producer, price & what it is
  DIGESTIFS.forEach((digestif) =>
    add(
      'dig',
      digestif.n,
      `${translateWord(digestif.h)} · ${digestif.cl} cl · ${eur(digestif.p)}${digestif.d ? '<br>' + dgD(digestif) : ''}`,
      [
        () =>
          mcq(
            translate(`Qui produit « ${digestif.n} » ?`, `Who makes "${digestif.n}"?`),
            translateWord(digestif.h),
            uniq(DIGESTIFS.map((candidate) => translateWord(candidate.h))),
            '',
          ),
        () =>
          mcq(
            translate(
              `Prix de « ${digestif.n} » (${digestif.cl} cl) ?`,
              `Price of "${digestif.n}" (${digestif.cl} cl)?`,
            ),
            eur(digestif.p),
            DIGESTIFS.map((candidate) => eur(candidate.p)).concat(['11 €', '20 €']),
            '',
          ),
        () =>
          mcq(
            translate(
              `Quelle dose sert-on pour « ${digestif.n} » ?`,
              `What measure do we pour for "${digestif.n}"?`,
            ),
            digestif.cl + ' cl',
            ['2 cl', '4 cl', '7 cl', '10 cl'],
            translate(
              'Ferroni et digestifs classiques : 4 cl · Lachanenche et Liquoristerie de Provence : 7 cl.',
              'Ferroni and classic digestifs: 4 cl · Lachanenche and Liquoristerie de Provence: 7 cl.',
            ),
          ),
      ],
      { info: infoDig(digestif), ikey: 'g:' + digestif.n, phdef: 'img/_ph-soft.jpg' },
    ),
  );

  // ===== BUILD: CHEESE BOARD 🧀 ===== //

  // the cheeses, mildest to strongest (+ the side cheese)
  const CHEESES = LTF.fromages || [];

  /**
   * `originText` - Function 🌍
   *
   * @param { { fr: string, en: string } } o - a bilingual value
   * @returns { string } - the value in the current language ('' when missing)
   */
  const originText = (origin) => (origin ? (EN ? origin.en : origin.fr) : '');
  // the places on the board (1st...8th) & "on the side"
  const QORD = EN
    ? ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
    : ['1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e'];
  const qSide = translate('À côté du plateau', 'On the side');

  /**
   * `qPlace` - Function 📍
   *
   * @param { object } cheese - a cheese
   * @param { number } index - its index on the board
   * @returns { string } - its place
   */
  const qPlace = (cheese, index) => (cheese.side ? qSide : QORD[index]);
  // the full board order & the milks 🐄🐑🐐
  const qOrder = CHEESES.map((cheese) => cheese.n).join(' → ');
  const qMilk = [translate('Vache', 'Cow'), translate('Brebis', 'Sheep'), translate('Chèvre', 'Goat')];
  // 🧀 every cheese: milk (unless uncertain), origin, place on the board & which one it is
  CHEESES.forEach((cheese, index) =>
    add(
      'from',
      cheese.n,
      `${originText(cheese.lait)} · ${originText(cheese.orig)} · ${originText(cheese.pate)}<br>${originText(cheese.d)}`,
      [
        ...(cheese.unc
          ? []
          : [
              () =>
                mcq(
                  translate(`Quel lait pour « ${cheese.n} » ?`, `Which milk is "${cheese.n}" made from?`),
                  originText(cheese.lait),
                  qMilk,
                  '',
                ),
            ]),
        () =>
          mcq(
            translate(`D'où vient « ${cheese.n} » ?`, `Where does "${cheese.n}" come from?`),
            originText(cheese.orig),
            CHEESES.map((candidate) => originText(candidate.orig)).concat([
              translate('Savoie', 'Savoie'),
              translate('Normandie', 'Normandy'),
            ]),
            '',
          ),
        () =>
          mcq(
            translate(
              `Place de « ${cheese.n} » sur le plateau (du plus doux au plus fort) ?`,
              `Where does "${cheese.n}" go on the board (mildest to strongest)?`,
            ),
            qPlace(cheese, index),
            QORD.slice(0, CHEESES.length - 1).concat([qSide]),
            qOrder,
          ),
        () =>
          mcq(
            translate(`Quel fromage : ${originText(cheese.h)} ?`, `Which cheese: ${originText(cheese.h)}?`),
            cheese.n,
            CHEESES.map((candidate) => candidate.n),
            originText(cheese.d),
          ),
      ],
      {
        info:
          sec(SAY, ttlSay, esc(originText(cheese.d))) +
          sec('📍', translate('Sur le plateau', 'On the board'), esc(qPlace(cheese, index) + ' · ' + qOrder)),
        ikey: 'q:' + cheese.n,
      },
    ),
  );

  // ===== BUILD: WINE PAIRING 🍇 ===== //

  // the pairing wines, each with its course
  const PAIRING_WINES = LTF.pairing.flatMap((pairing) =>
    pairing.wines.map((wine) => Object.assign({ course: pairing.course }, wine)),
  );

  /**
   * `pairingEn` - Function 🇬🇧
   *
   * @param { object } wine - a pairing wine
   * @returns { object } - its English strings { g, t } ({} when missing)
   */
  const pairingEn = (wine) => (LTF_EN.pairing || {})[wine.n] || {};
  // the grapes & the tasting note in the current language
  const pairingGrapes = (wine) => (EN && pairingEn(wine).g ? pairingEn(wine).g : wine.g),
    pairingTaste = (wine) => (EN && pairingEn(wine).t ? pairingEn(wine).t : wine.t);
  // 🍇 every pairing wine: course, grapes, which wine for a course, how to describe it
  PAIRING_WINES.forEach((wine) =>
    add(
      'acc',
      wine.n,
      `<b>${translateWord(wine.course)}</b><br>${pairingGrapes(wine)}<br><i>${pairingTaste(wine)}</i>`,
      [
        () =>
          mcq(
            translate(
              `Dans l'accord mets-vins, « ${wine.n} » accompagne…`,
              `In the wine pairing, "${wine.n}" goes with…`,
            ),
            translateWord(wine.course),
            LTF.pairing.map((pairing) => translateWord(pairing.course)),
            pairingTaste(wine),
          ),
        () =>
          mcq(
            translate(`Cépages / composition de « ${wine.n} » ?`, `Grapes / make-up of "${wine.n}"?`),
            pairingGrapes(wine),
            PAIRING_WINES.map(pairingGrapes),
            pairingTaste(wine),
          ),
        () => {
          const others = PAIRING_WINES.filter((candidate) => candidate.course !== wine.course).map(
            (candidate) => candidate.n,
          );
          return mcq(
            EN
              ? `Which wine can go with the ${translateWord(wine.course).toLowerCase()} of the Tasting Menu?`
              : `Quel vin peut accompagner le ${wine.course.toLowerCase()} du Menu Dégustation ?`,
            wine.n,
            others,
            pairingTaste(wine),
          );
        },
        () =>
          mcq(
            translate(
              `Comment décrire « ${wine.n} » au client ?`,
              `How do you describe "${wine.n}" to the guest?`,
            ),
            pairingTaste(wine),
            PAIRING_WINES.map(pairingTaste),
            '',
          ),
      ],
      { info: infoPair(wine), ikey: PAIRKEY[wine.n] || 'p:' + wine.n },
    ),
  );

  // ===== BUILD: TABLES 🗺️ ===== //

  // 🗺️ every table of the floor plan (questions come from the plan game)
  LTF.tables.forEach((table) =>
    add(
      'plan',
      table.id,
      `${table.sh === 'round' ? translate('Table ronde', 'Round table') : table.sh === 'long' ? translate('Grande table', 'Long table') : translate('Table carrée', 'Square table')}` +
        `${table.cap ? ' · ' + table.cap : ''}`,
      [() => ({ plan: true, table: table })],
    ),
  );

  // ===== QUESTIONS ❓ ===== //

  /**
   * `qFor` - Function ❓
   *
   * @param { object } item - an item
   * @returns { object | null } - a question from one of its generators (6 tries), with `q.item` set
   */
  function qFor(item) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const generator = pick(item.gens);
      const question = generator();
      if (question) {
        question.item = item;
        return question;
      }
    }
    return null;
  }

  /**
   * `randQ` - Function 🎲
   *
   * Picks a random question, weighted by mastery: new items x2, mastered x1, failing x3.
   *
   * @param { string } [chapterId] - a chapter id (all chapters when empty)
   * @returns { object | null } - a question
   */
  function randQ(chapterId) {
    const pool = chapterId ? items.filter((item) => item.ch === chapterId) : items;
    const weighted = pool.flatMap((item) => {
      const stats = progress.m[item.id];
      const weight = !stats ? 2 : stats.s >= 3 ? 1 : 3;
      return Array(weight).fill(item);
    });
    for (let attempt = 0; attempt < 10; attempt++) {
      const question = qFor(pick(weighted));
      if (question) return question;
    }
    return null;
  }

  // ===== PROGRESS 🎓 ===== //

  // the ranks, one every 300 XP 🏅
  const RANKS = EN
    ? ['Commis', 'Junior waiter', 'Head waiter', "Maître d'hôtel", 'Restaurant manager']
    : ['Commis', 'Demi-chef de rang', 'Chef de rang', "Maître d'hôtel", 'Directeur de salle'];

  /**
   * `rank` - Function 🏅
   *
   * @returns { string } - the current rank
   */
  const rank = () => RANKS[Math.min(RANKS.length - 1, Math.floor(progress.xp / 300))];

  /**
   * `mastery` - Function 📈
   *
   * @param { string } [chapterId] - a chapter id (all items when empty)
   * @returns { number } - the % of items answered right 3 times in a row
   */
  const mastery = (chapterId) => {
    const chapterItems = items.filter((item) => !chapterId || item.ch === chapterId);
    return Math.round(
      (100 * chapterItems.filter((item) => (progress.m[item.id] || {}).s >= 3).length) / chapterItems.length,
    );
  };

  /**
   * `record` - Function ✅
   *
   * Records an answer: right = streak +1 & XP (and out of the review list), wrong = streak reset & to review.
   *
   * @param { object } item - the item
   * @param { boolean } ok - right answer?
   * @param { number } [xp] - the XP to earn (10 by default)
   * @returns { void }
   */
  function record(item, ok, xp) {
    const stats = progress.m[item.id] || { s: 0, c: 0, w: 0 };
    if (ok) {
      stats.s++;
      stats.c++;
      progress.xp += xp || 10;
      progress.review = progress.review.filter((reviewId) => reviewId !== item.id);
    } else {
      stats.s = 0;
      stats.w++;
      if (!progress.review.includes(item.id)) progress.review.push(item.id);
    }
    progress.m[item.id] = stats;
    save();
  }

  // ===== ICONS 🎨 ===== //

  // the SVG paths of every icon (stroke icons, 24x24)
  // ⚠️ keep this table exactly as it is: `rust/tools/gen_appdata.js` reads it as text for the Rust port 🦀
  // prettier-ignore
  const IC = {
 snow:'<path d="M12 2v20M4.5 7l15 10M19.5 7l-15 10M9 4l3 2 3-2M9 20l3-2 3 2M3.5 10.5l1.2-3.4L1.5 6M20.5 10.5l-1.2-3.4 3.2-1.1M3.5 13.5l1.2 3.4-3.2 1.1M20.5 13.5l-1.2 3.4 3.2 1.1"/>',
 home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
 book:'<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
 redo:'<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
 back:'<path d="M15 5l-7 7 7 7"/>', chev:'<path d="M9 5l7 7-7 7"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 pic:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
 shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M12 8v5M12 16v.5"/>',
 clip:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
 cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
 flame:'<path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 5 0-3 0-6 0-9z"/>',
 target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
 cap:'<path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5"/>',
 timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
 cards:'<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
 quiz:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 17h.01"/>',
 glass:'<path d="M5 4h14l-7 8zM12 12v8M8 20h8"/>', check:'<path d="M5 12l5 5 9-10"/>',
 reset:'<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v5h5"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
 pin:'<path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
 cake:'<path d="M4 20h16v-7H4zM4 15c2 1.5 4-1 6 0s4 1.5 6 0 4-1 4 0M12 9v4M12 5.5v.5"/>',
 cup:'<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3"/>',
 wine:'<path d="M8 3h8l-1 6a3 3 0 0 1-6 0zM12 12v8M8 21h8"/>',
 flute:'<path d="M10 3h4l-.5 8a1.5 1.5 0 0 1-3 0zM12 13v7M9 21h6"/>',
 tumbler:'<path d="M6 5h12l-1.5 14h-9zM6.7 11h10.6"/>',
 cheese:'<path d="M3 17V11L15 5l6 6v6zM3 11h18"/><circle cx="8" cy="14.5" r="1"/><circle cx="15" cy="14" r="1.3"/>',
 grape:'<circle cx="9" cy="10" r="2.2"/><circle cx="15" cy="10" r="2.2"/><circle cx="12" cy="14" r="2.2"/><circle cx="9" cy="18" r="2.2"/><circle cx="15" cy="18" r="2.2"/><path d="M12 8V4l3-1"/>',
 map:'<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
 sound:'<path d="M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6"/>',
 palette:(
'<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.5-1.5-1.5-1.5-3S13 14 14.5 14H17a4 4 0 0 0 4-4c0-4-4-7-9-7z"/>' +
'<circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>'
),
 trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
 award:'<circle cx="12" cy="9" r="6"/><path d="M8.5 14l-1.5 7 5-3 5 3-1.5-7"/>'
};

  /**
   * `svgIcon` - Function 🎨
   *
   * @param { string } name - the icon name (a key of `IC`)
   * @param { number } [size] - the size in px (22 by default)
   * @returns { string } - the `<svg>` markup
   */
  const svgIcon = (name, size) =>
    `<svg class="i" width="${size || 22}" height="${size || 22}` +
    `" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `${IC[name] || ''}</svg>`;
  // the icon of each chapter
  const CHIC = {
    jour: 'clip',
    hiver: 'snow',
    dej: 'sun',
    diner: 'moon',
    dess: 'cake',
    cock: 'glass',
    cafe: 'cup',
    vins: 'wine',
    champ: 'flute',
    dig: 'tumbler',
    from: 'cheese',
    acc: 'grape',
    plan: 'map',
  };

  // ===== THEME 🌗 ===== //

  // the themes & the system light/dark query
  const THEMES = ['auto', 'light', 'dark', 'black'];
  const lightQuery = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;

  /**
   * `applyTheme` - Function 🌗
   *
   * Sets `<html data-theme>` (auto follows the system) and the browser bar color.
   *
   * @returns { void }
   */
  function applyTheme() {
    const theme = progress.theme || 'auto';
    const eff = theme === 'auto' ? (lightQuery && lightQuery.matches ? 'light' : 'dark') : theme;
    document.documentElement.setAttribute('data-theme', eff);
    const metaThemeColor = document.querySelector('meta[name=theme-color]');
    if (metaThemeColor)
      metaThemeColor.setAttribute(
        'content',
        eff === 'light' ? '#ffffff' : eff === 'black' ? '#000000' : '#0d1a2e',
      );
  }
  applyTheme();
  // 👂 follow the system theme (old Safari only has `addListener`)
  if (lightQuery) {
    try {
      lightQuery.addEventListener('change', applyTheme);
    } catch (error) {
      try {
        lightQuery.addListener(applyTheme);
      } catch (error) {}
    }
  }

  /**
   * `LTFtheme` - Function (window) 🌗
   *
   * @param { 'auto' | 'light' | 'dark' | 'black' } theme - the new theme
   * @returns { void }
   */
  window.LTFtheme = (theme) => {
    progress.theme = theme;
    save();
    applyTheme();
    settings();
  };

  // ===== OVERLAYS: SHEET + DIALOG 🪟 ===== //

  /**
   * `strip` - Function 🧹
   *
   * @param { string } html - some HTML
   * @returns { string } - its plain text
   */
  const strip = (html) =>
    String(html || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  /**
   * `closeOverlays` - Function 🧹
   *
   * @returns { void } - removes every sheet, dialog & viewer
   */
  function closeOverlays() {
    document.querySelectorAll('.ov').forEach((overlay) => overlay.remove());
  }

  /**
   * `sheet` - Function 🪟
   *
   * Opens the bottom sheet `#sheet` (a tap on the scrim closes it).
   *
   * @param { string } html - the sheet content
   * @param { { cls?: string } } [opts] - an extra class
   * @returns { HTMLElement } - the sheet overlay
   */
  function sheet(html, opts) {
    opts = opts || {};
    const old = queryOne('#sheet');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'sheet';
    overlay.className = 'ov scrim';
    overlay.innerHTML = `<div class="sheet${opts.cls ? ' ' + opts.cls : ''}"><div class="grab"></div><div class="sbody">${html}</div>${opts.bar ? `<div class="abar">${opts.bar}</div>` : ''}</div>`;
    overlay.onclick = (event) => {
      if (event.target === overlay) closeSheet();
    };
    document.body.appendChild(overlay);
    return overlay;
  }
  // 🌍 used by the inline onclick handlers
  window.LTFcloseSheet = closeSheet;

  /**
   * `closeSheet` - Function 👋
   *
   * @returns { void } - slides the sheet out, then removes it
   */
  function closeSheet() {
    const sheetElement = queryOne('#sheet');
    if (!sheetElement) return;
    sheetElement.classList.add('out');
    setTimeout(() => sheetElement.remove(), 180);
  }

  /**
   * `dialog` - Function 💬
   *
   * @param { string } html - the dialog content
   * @param { boolean } [dismiss] - false = a tap on the scrim doesn't close it
   * @returns { HTMLElement } - the dialog overlay `#dlg`
   */
  function dialog(html, dismiss) {
    const old = queryOne('#dlg');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'dlg';
    overlay.className = 'ov scrim center';
    overlay.innerHTML = `<div class="dialog">${html}</div>`;
    if (dismiss !== false)
      overlay.onclick = (event) => {
        if (event.target === overlay) overlay.remove();
      };
    document.body.appendChild(overlay);
    return overlay;
  }

  /**
   * `confirmDlg` - Function ❓
   *
   * @param { string } title - the title
   * @param { string } text - the question
   * @param { string } okLbl - the OK label
   * @param { Function } onOk - called on OK
   * @param { boolean } [danger] - red OK button
   * @returns { void }
   */
  function confirmDlg(title, text, okLbl, onOk, danger) {
    const dialogElement = dialog(
      `<div class="dt">${title}</div><p class="muted">${text}` +
        `</p><div class="dbtns"><button class="btn sec" id="dno">${translate('Annuler', 'Cancel')}` +
        `</button><button class="btn ${danger ? 'danger' : ''}" id="dok">${okLbl}</button></div>`,
    );
    dialogElement.querySelector('#dno').onclick = () => dialogElement.remove();
    dialogElement.querySelector('#dok').onclick = () => {
      dialogElement.remove();
      onOk();
    };
  }

  // ===== PHOTO VIEWER (PINCH / DOUBLE-TAP ZOOM, PAN) 🔍 ===== //

  /**
   * `LTFzoom` - Function (window) 🔍
   *
   * Opens an item's photo full screen: pinch / wheel zoom, double-tap, pan, swipe down to close.
   *
   * @param { string } id - the item id
   * @param { Event } [event] - the click (stopped, so the card doesn't open)
   * @returns { void }
   */
  window.LTFzoom = (id, event) => {
    if (event) event.stopPropagation();
    const item = items.find((entry) => entry.id === id);
    const src = item && photoOf(item);
    if (!src) return;
    const viewer = document.createElement('div');
    viewer.className = 'ov zoomv';
    viewer.innerHTML =
      `<div class="zt"><div class="zn">${item.front}</div><button class="zx" aria-label="close">` +
      `${svgIcon('x', 22)}</button></div><div class="zs"><img src="${src}` +
      `" alt="" draggable="false"></div><div class="zh">` +
      `${translate('Pincez ou touchez deux fois pour zoomer', 'Pinch or double-tap to zoom')}</div>`;
    document.body.appendChild(viewer);
    // the image & the stage
    const img = viewer.querySelector('img'),
      stage = viewer.querySelector('.zs');
    // the zoom, the pan, the pointers, the gesture start, the last tap & the "moved" flag 🖐️
    let scale = 1,
      offsetX = 0,
      offsetY = 0,
      pts = new Map(),
      start = null,
      lastTap = 0,
      moved = false;
    // apply the transform (animated or not)
    const apply = (anim) => {
      img.style.transition = anim ? 'transform .2s' : 'none';
      img.style.transform = `translate(${offsetX}px,${offsetY}px) scale(${scale})`;
    };
    // keep the photo inside the stage
    const clampP = () => {
      if (scale <= 1) {
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        return;
      }
      const stageRect = stage.getBoundingClientRect();
      const scaledWidth = img.offsetWidth * scale,
        scaledHeight = img.offsetHeight * scale;
      const maxX = Math.max(0, (scaledWidth - stageRect.width) / 2),
        maxY = Math.max(0, (scaledHeight - stageRect.height) / 2);
      offsetX = Math.min(maxX, Math.max(-maxX, offsetX));
      offsetY = Math.min(maxY, Math.max(-maxY, offsetY));
    };
    // ✕ closes the viewer
    const close = () => viewer.remove();
    viewer.querySelector('.zx').onclick = close;
    // 👇 a finger goes down: pan (1 finger) or pinch (2 fingers)
    stage.addEventListener('pointerdown', (event) => {
      stage.setPointerCapture(event.pointerId);
      pts.set(event.pointerId, { x: event.clientX, y: event.clientY });
      moved = false;
      if (pts.size === 2) {
        const [firstPointer, secondPointer] = [...pts.values()];
        start = {
          dist: Math.hypot(firstPointer.x - secondPointer.x, firstPointer.y - secondPointer.y),
          sc: scale,
          x: offsetX,
          y: offsetY,
          cx: (firstPointer.x + secondPointer.x) / 2,
          cy: (firstPointer.y + secondPointer.y) / 2,
        };
      } else start = { px: event.clientX, py: event.clientY, x: offsetX, y: offsetY };
    });
    stage.addEventListener('pointermove', (event) => {
      if (!pts.has(event.pointerId)) return;
      pts.set(event.pointerId, { x: event.clientX, y: event.clientY });
      // 🤏 pinch: zoom between 1x and 5x around the fingers' center
      if (pts.size === 2 && start && start.dist) {
        const [firstPointer, secondPointer] = [...pts.values()];
        scale = Math.min(
          5,
          Math.max(
            1,
            (start.sc * Math.hypot(firstPointer.x - secondPointer.x, firstPointer.y - secondPointer.y)) /
              start.dist,
          ),
        );
        const cx = (firstPointer.x + secondPointer.x) / 2,
          cy = (firstPointer.y + secondPointer.y) / 2;
        offsetX = start.x + (cx - start.cx);
        offsetY = start.y + (cy - start.cy);
        moved = true;
        apply();
        // ☝️ one finger: pan when zoomed, else follow the finger down (and fade the backdrop)
      } else if (pts.size === 1 && start && start.px !== undefined) {
        const dx = event.clientX - start.px,
          dy = event.clientY - start.py;
        if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
        if (scale > 1) {
          offsetX = start.x + dx;
          offsetY = start.y + dy;
          apply();
        } else {
          img.style.transition = 'none';
          img.style.transform = `translateY(${Math.max(0, dy)}px)`;
          viewer.style.background = `rgba(0,0,0,${Math.max(0.4, 0.94 - dy / 500)})`;
        }
      }
    });
    // 👆 a finger goes up: close (dragged down), double-tap zoom, or settle
    const up = (event) => {
      const was = pts.size;
      pts.delete(event.pointerId);
      // dragged down by more than 120 px at 1x? close 👋
      if (was === 1 && scale <= 1 && start && start.py !== undefined && event.clientY - start.py > 120) {
        return close();
      }
      // a tap: a second tap within 300 ms toggles 1x / 2.5x (on the tapped point)
      if (was === 1 && !moved) {
        const now = Date.now();
        if (now - lastTap < 300) {
          if (scale > 1) {
            scale = 1;
            offsetX = 0;
            offsetY = 0;
          } else {
            const stageRect = stage.getBoundingClientRect();
            scale = 2.5;
            offsetX = (stageRect.width / 2 - (event.clientX - stageRect.left)) * 1.5;
            offsetY = (stageRect.height / 2 - (event.clientY - stageRect.top)) * 1.5;
          }
          clampP();
          apply(true);
          lastTap = 0;
          return;
        }
        lastTap = now;
      }
      // one finger left: continue as a pan from here
      if (pts.size === 1) {
        const [remainingPointer] = [...pts.values()];
        start = { px: remainingPointer.x, py: remainingPointer.y, x: offsetX, y: offsetY };
      } else start = null;
      viewer.style.background = '';
      clampP();
      apply(true);
    };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    // 🖱️ mouse wheel zoom (desktop)
    stage.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        scale = Math.min(5, Math.max(1, scale * (event.deltaY < 0 ? 1.15 : 0.87)));
        clampP();
        apply();
      },
      { passive: false },
    );
  };

  // ===== ⓘ SHEET ℹ️ ===== //

  /**
   * `funTip` - Function 💡
   *
   * @param { object } item - an item
   * @returns { string } - its "Did you know?" section (fun.js), or ''
   */
  const funTip = (item) => {
    const tip = LTF.fun && item.ikey && LTF.fun[EN ? 'en' : 'fr'][item.ikey];
    return tip
      ? `<div class="isec"><div class="ih">💡 ${translate('Le saviez-vous ?', 'Did you know?')}</div><div>${tip}</div></div>`
      : '';
  };

  /**
   * `infoButton` - Function ℹ️
   *
   * @param { object } item - an item
   * @returns { string } - the small ⓘ button (or '')
   */
  const infoButton = (item) =>
    item && item.info
      ? `<button class="ib" onclick="event.stopPropagation();LTFinfo('${item.id}')" aria-label="info">${svgIcon('info', 20)}</button>`
      : '';

  /**
   * `LTFinfo` - Function (window) ℹ️
   *
   * Opens an item's ⓘ sheet: photo (zoomable), name + speech, details, info sections, fun tip,
   * and the "take / pick / restore photo" bar.
   *
   * @param { string } id - the item id
   * @returns { void }
   */
  window.LTFinfo = (id) => {
    const item = items.find((entry) => entry.id === id);
    if (!item || !item.info) return;
    // the photo & whether it's the waiter's own
    const photo = photoOf(item),
      mine = !!PHOTOS[item.ikey];
    const html = `${
      item.ikey && photo
        ? `<div class="hphoto"><img src="${photo}" alt="" onclick="LTFzoom('${item.id}` +
          `',event)"><span class="ptag">` +
          `${mine ? translate('Votre photo', 'Your photo') : translate("Photo d'illustration", 'Sample photo')}` +
          `</span><button class="pclose" onclick="LTFcloseSheet()">${svgIcon('x', 18)}</button></div>`
        : `<button class="pclose solo" onclick="LTFcloseSheet()">${svgIcon('x', 18)}</button>`
    }
   <div class="stitle tl2"><span>${item.front}</span>${sayBtn(item)}</div>${sayRow(item)}<div class="sdesc">${item.back}</div><div class="sinfo">${item.info}${funTip(item)}</div>`;
    // the photo bar: restore (own photo only), camera & gallery 📷
    const bar = item.ikey
      ? `${mine ? `<button class="btn sec sq" id="phrst" aria-label="reset">${svgIcon('reset', 20)}</button>` : ''}` +
        `<label class="btn sec grow">${svgIcon('pic', 20)} ${translate('Galerie', 'Gallery')}` +
        `<input type="file" accept="image/*" id="phin2" hidden></label><label class="btn grow">` +
        `${svgIcon('cam', 20)} ${translate('Caméra', 'Camera')}` +
        `<input type="file" accept="image/*" capture="environment" id="phin" hidden></label>`
      : '';
    const sheetElement = sheet(html, { bar });
    // 📷 a new photo: shrink, save in IndexedDB, reopen the sheet & refresh the carte
    ['#phin', '#phin2'].forEach((sel) => {
      const inp = sheetElement.querySelector(sel);
      if (inp)
        inp.onchange = async () => {
          const file = inp.files && inp.files[0];
          if (!file) return;
          try {
            const url = await shrink(file);
            PHOTOS[item.ikey] = url;
            await idbPut(item.ikey, url);
            toast(translate('Photo enregistrée', 'Photo saved'));
            LTFinfo(id);
            refresh();
          } catch (error) {
            toast(translate('Photo impossible à lire', 'Could not read photo'));
          }
        };
    });
    // ↺ restore the default photo (after a confirm)
    const resetButton = sheetElement.querySelector('#phrst');
    if (resetButton)
      resetButton.onclick = () =>
        confirmDlg(
          translate('Photo par défaut ?', 'Default photo?'),
          translate(
            'Votre photo sera supprimée de ce téléphone.',
            'Your photo will be removed from this phone.',
          ),
          translate('Rétablir', 'Restore'),
          async () => {
            delete PHOTOS[item.ikey];
            await idbPut(item.ikey, null);
            LTFinfo(id);
            refresh();
          },
          true,
        );
  };
  // the current screen [view, arg] 🧭
  let lastView = ['hub'];

  /**
   * `refresh` - Function 🔄
   *
   * Re-renders the carte (keeping the search) after a photo change.
   *
   * @returns { void }
   */
  function refresh() {
    const view = lastView;
    if (view[0] === 'carte') {
      const searchInput = queryOne('#srch');
      const val = searchInput ? searchInput.value : '';
      carte();
      if (queryOne('#srch')) {
        queryOne('#srch').value = val;
        queryOne('#srch').oninput();
      }
    }
  }

  // ===== NAVIGATION 🧭 ===== //

  // the tab bar [view, icon, label]
  const TABS = [
    ['hub', 'home', translate('Accueil', 'Home')],
    ['carte', 'book', translate('La Carte', 'Menu')],
    ['revise', 'redo', translate('Réviser', 'Review')],
    ['settings', 'user', translate('Profil', 'Profile')],
  ];
  // the tab of each view & the parent of each view (for Back) 🔙
  const TABOF = {
    hub: 'hub',
    chapter: 'hub',
    carte: 'carte',
    revise: 'revise',
    settings: 'settings',
    cert: 'revise',
  };
  const PARENT = {
    chapter: 'hub',
    study: 'chapter',
    quiz: 'chapter',
    chrono: 'chapter',
    bar: 'chapter',
    planFind: 'chapter',
    alg: 'chapter',
    brief: 'chapter',
    review: 'revise',
    exam: 'revise',
    cert: 'revise',
    carte: 'hub',
    revise: 'hub',
    settings: 'hub',
  };

  /**
   * `tabbar` - Function 🧭
   *
   * @param { string } where - the current view
   * @returns { void } - renders (or hides) the bottom tab bar
   */
  function tabbar(where) {
    let tabBar = queryOne('#tabbar');
    if (!tabBar) {
      tabBar = document.createElement('nav');
      tabBar.id = 'tabbar';
      document.body.appendChild(tabBar);
    }
    const cur = TABOF[where];
    tabBar.style.display = cur ? '' : 'none';
    document.body.classList.toggle('notabs', !cur);
    tabBar.innerHTML = TABS.map(
      ([view, icon, label]) =>
        `<button class="${view === cur ? 'on' : ''}" onclick="LTFgo('${view}')"><span class="pill">${svgIcon(icon, 22)}</span>${label}</button>`,
    ).join('');
  }

  /**
   * `appbar` - Function 🔝
   *
   * @param { string } title - the title
   * @param { string } [back] - the view of the back button
   * @param { string } [right] - extra HTML on the right
   * @param { boolean } [big] - large title
   * @returns { string } - the app bar HTML
   */
  function appbar(title, back, right, big) {
    return (
      `<header class="appbar${big ? ' big' : ''}">` +
      `${back ? `<button class="ibtn" onclick="LTFgo('${back}')" aria-label="back">${svgIcon('back')}</button>` : ''}` +
      `<div class="abt">${title || ''}</div>${right || ''}</header>`
    );
  }

  /**
   * `header` - Function 🔝
   *
   * @param { string } title - the title
   * @param { string } [back] - the view of the back button ('hub' by default)
   * @returns { string } - the app bar HTML
   */
  function header(title, back) {
    return appbar(title, back || 'hub');
  }

  /**
   * `flowbar` - Function 📊
   *
   * @param { number } pct - the progress (0..100)
   * @param { string } label - the counter ("3/10")
   * @param { string } [onX] - unused (kept for the same signature)
   * @returns { string } - the in-game bar: ✕, progress & counter
   */
  function flowbar(pct, label, onX) {
    return (
      `<header class="appbar flow"><button class="ibtn" id="fx" aria-label="close">${svgIcon('x')}` +
      `</button><div class="pbar"><i style="width:${pct}%"></i></div><div class="pl">${label}` +
      `</div></header>`
    );
  }

  /**
   * `bindX` - Function ✕
   *
   * @param { string } back - the view to go back to
   * @param { boolean } [ask] - confirm first ("your progress will be lost")
   * @returns { void }
   */
  function bindX(back, ask) {
    const closeButton = queryOne('#fx');
    if (closeButton)
      closeButton.onclick = () => {
        if (ask)
          confirmDlg(
            translate('Quitter ?', 'Leave?'),
            translate(
              'Votre progression dans cette partie sera perdue.',
              'Your progress in this round will be lost.',
            ),
            translate('Quitter', 'Leave'),
            () => go(back),
            true,
          );
        else go(back);
      };
  }
  // true while going back with the browser's Back (don't push a new history entry)
  let navPop = false;

  /**
   * `LTFgo` / `go` - Function (window) 🧭
   *
   * Shows a screen: stops the chrono, closes the overlays, pushes a history entry,
   * updates the tab bar and renders the view (with the little enter animation).
   *
   * @param { string } where - the view (hub, chapter, study, quiz, chrono, exam, review, revise, carte, settings, bar, planFind, cert, alg, brief)
   * @param { any } [arg] - the view argument (e.g. the chapter id)
   * @returns { void }
   */
  const go = (window.LTFgo = (where, arg) => {
    clearInterval(timer);
    closeOverlays();
    lastView = [where, arg];
    if (!navPop) {
      try {
        history.pushState({ v: where }, '');
      } catch (error) {}
    }
    navPop = false;
    tabbar(where);
    app.className = 'scr scr-' + where;
    (
      ({
        hub,
        chapter,
        study,
        quiz: () => quiz(arg, 10),
        chrono,
        exam,
        review,
        revise,
        carte,
        settings,
        bar,
        planFind,
        cert,
        alg,
        brief,
      })[where] || hub
    )(arg);
    window.scrollTo(0, 0);
    app.classList.remove('enter');
    void app.offsetWidth;
    app.classList.add('enter');
  });
  // 🔙 Back: close the open overlay first, else go to the parent view
  addEventListener('popstate', () => {
    if (document.querySelector('.ov')) {
      closeOverlays();
      try {
        history.pushState({}, '');
      } catch (error) {}
      return;
    }
    const parent = PARENT[lastView[0]];
    if (parent) {
      navPop = true;
      go(parent);
    }
  });
  // the current chapter & the chrono timer ⏱️
  let curCh = null,
    timer = null;

  /**
   * `langBtn` - Function 🌍
   *
   * @returns { string } - the FR / EN switch of the hero
   */
  const langBtn = () =>
    `<button class="hlang" onclick="LTFlang('${EN ? 'fr' : 'en'}')">${EN ? 'FR' : 'EN'}</button>`;

  /**
   * `ring` - Function 📈
   *
   * @param { number } percent - a % (0..100)
   * @param { boolean } [big] - large ring
   * @returns { string } - the progress ring
   */
  const ring = (percent, big) =>
    `<div class="ring${big ? ' big' : ''}" style="--p:${percent}"><span>${percent}%</span></div>`;

  // ===== SCREENS 📱 ===== //

  /**
   * `hub` - Function 🏠
   *
   * The home screen: hero, rank card (XP, streak, mastery), quick actions & the chapters.
   *
   * @returns { void }
   */
  function hub() {
    // the XP inside the current rank (0..299)
    const lvl = progress.xp % 300;
    app.innerHTML =
      `<div class="hero" style="background-image:url('${window.HERO || ''}')">${langBtn()}` +
      `<div class="heroin"><div class="kicker">Sofitel Marseille Vieux-Port</div><h1>Les Trois Forts</h1>` +
      `<div class="sub">Service Academy</div></div></div>
  <div class="pad">
  <div class="card rankc">` +
      `<div class="row"><div class="grow"><div class="muted">${translate('Votre rang', 'Your rank')}` +
      `</div><div class="rk">${rank()}</div></div>
   <div class="stat st1">${svgIcon('flame', 20)}` +
      `<span>${progress.streak} ${translate('j', 'd')}</span></div><div class="stat st2">` +
      `${svgIcon('target', 20)}<span>${mastery()}` +
      `%</span></div></div>
   <div class="bar"><i style="width:${lvl / 3}` +
      `%"></i></div><div class="muted sm">${progress.xp} XP · ${300 - lvl} ` +
      `${translate('XP avant le prochain rang', 'XP to the next rank')}` +
      `</div></div>
  <div class="qa"><button class="card" onclick="LTFgo('exam')">` +
      `${svgIcon('cap', 24)}<span>${translate('Examen', 'Exam')}` +
      `</span></button><button class="card" onclick="LTFgo('review')">${svgIcon('redo', 24)}<span>` +
      `${translate('Erreurs', 'Mistakes')} · ${progress.review.length}` +
      `</span></button><button class="card" onclick="LTFgo('carte')">${svgIcon('book', 24)}<span>` +
      `${translate('La Carte', 'Menu')}</span></button></div>
  <div class="sh">` +
      `${translate('Chapitres', 'Chapters')}</div>
  ` +
      `${CHAPTERS.map(
        (chapter) =>
          `<button class="li" onclick="LTFgo('chapter','${chapter.id}')"><div class="av">` +
          `${svgIcon(CHIC[chapter.id] || 'star', 22)}</div><div class="tx"><div class="n">${chapter.name}` +
          `</div><div class="muted">${chapter.sub}</div></div>${ring(mastery(chapter.id))}</button>`,
      ).join('')}` +
      `
  </div>`;
  }

  /**
   * `chapter` - Function 📚
   *
   * A chapter: its mastery ring and its game modes (study, quiz, chrono + the chapter's own games).
   *
   * @param { string } [id] - the chapter id (the current one when empty)
   * @returns { void }
   */
  function chapter(id) {
    curCh = id || curCh;
    const chapter = CHAPTERS.find((chapter) => chapter.id === curCh);
    const its = items.filter((item) => item.ch === curCh);
    const total = its.length;
    const mast = its.filter((item) => (progress.m[item.id] || {}).s >= 3).length;
    const idx = CHAPTERS.indexOf(chapter) + 1;
    // the game modes [view, icon, title, subtitle, right label]
    const modes = [
      [
        'study',
        'cards',
        translate('Étudier', 'Study'),
        translate('Cartes recto-verso avec photos', 'Flashcards with photos'),
        total + ' ' + translate('cartes', 'cards'),
      ],
    ];
    // 🗺️ the floor plan has its own games
    if (curCh === 'plan') {
      modes.push([
        'planFind',
        'pin',
        translate('Trouve la table', 'Find the table'),
        translate('Touchez la table annoncée', 'Tap the table called out'),
        '10 tables',
      ]);
      modes.push([
        'quiz',
        'quiz',
        translate('Quel numéro ?', 'Which number?'),
        translate('10 questions', '10 questions'),
        '',
      ]);
    } else
      modes.push([
        'quiz',
        'quiz',
        'Quiz',
        translate('10 questions, explications', '10 questions with explanations'),
        '',
      ]);
    modes.push([
      'chrono',
      'timer',
      'Chrono',
      translate('60 secondes, combos', '60 seconds, combos'),
      translate('Record', 'Best') + ' ' + (progress.best[curCh] || 0),
    ]);
    // 🍸 the bar game, 📋 the briefing & ❄️ the allergen table
    if (curCh === 'cock')
      modes.push([
        'bar',
        'glass',
        translate('Le Bar', 'The Bar'),
        translate('Montez le cocktail', 'Build the cocktail'),
        '',
      ]);
    if (curCh === 'jour')
      modes.push([
        'brief',
        'clip',
        translate('Briefing', 'Briefing'),
        translate('Tables, notes et retour de pêche', 'Tables, notes and catch of the day'),
        '',
      ]);
    if (curCh === 'hiver')
      modes.push([
        'alg',
        'shield',
        translate('Allergènes', 'Allergens'),
        translate("Plat par plat, d'après la dégustation", 'Dish by dish, from the tasting'),
        '',
      ]);
    // render
    app.innerHTML =
      appbar('', 'hub') +
      (`<div class="pad"><div class="kick2">${translate('Chapitre', 'Chapter')} ${idx}` +
        `</div><h1 class="ptitle">${chapter.name}</h1><div class="muted">${chapter.sub}` +
        `</div>
  <div class="card row mt">${ring(mastery(curCh), true)}<div><div class="b">${mast} / ` +
        `${total} ${translate('maîtrisés', 'mastered')}</div><div class="muted sm">` +
        `${translate('Une carte est maîtrisée après 3 bonnes réponses de suite.', 'A card is mastered after 3 correct answers in a row.')}` +
        `</div></div></div>
  <div class="sh">${translate('Modes de jeu', 'Game modes')}</div>
  ` +
        `${modes
          .map(
            ([view, icon, title, subtitle, record]) =>
              `<button class="li tall" onclick="LTFgo('${view}')"><div class="av">${svgIcon(icon, 22)}` +
              `</div><div class="tx"><div class="n">${title}</div><div class="muted">${subtitle}` +
              `</div></div><div class="rt">${record ? `<span class="muted sm">${record}</span>` : ''}` +
              `${svgIcon('chev', 18)}</div></button>`,
          )
          .join('')}` +
        `
  </div><div class="cta"><button class="btn" onclick="LTFgo('quiz')">${svgIcon('quiz', 20)} ` +
        `${translate('Lancer un quiz', 'Start a quiz')}</button></div>`);
  }

  /**
   * `brief` - Function 📋
   *
   * The daily briefing: headline, reserved tables & notes (no guest names: privacy 🛡️).
   *
   * @returns { void }
   */
  function brief() {
    const jour = LTF.jour,
      langKey = EN ? 'en' : 'fr';
    const res = jour.tables.map((table) => table[1]);
    app.innerHTML =
      appbar(translate('Briefing', 'Briefing'), 'chapter') +
      (`<div class="pad"><div class="card sm"><div class="b">${jour.head[langKey]}` +
        `</div></div><div class="sh">${translate('Plan des tables', 'Table plan')}` +
        `</div><div class="card bplan" id="bplan" data-l="${langKey}">${planSVG({ labels: true, res })}` +
        `<button class="chip gold bpfs" id="bpFull">⛶ ${translate('Plein écran', 'Full screen')}` +
        `</button></div><div class="muted sm bpleg"><span class="bpdot"></span> ` +
        `${translate('Réservée · touchez une table pour voir la réservation', 'Reserved · tap a table to see the booking')}` +
        `</div>` +
        `${jour.peche.length ? `<div class="sh">${translate('Retour de pêche', 'Catch of the day')}</div>` : ''}` +
        `${jour.peche
          .map(
            (catchOfDay) =>
              `<div class="card sm row"><div class="tx">${EN ? catchOfDay[1] : catchOfDay[0]}` +
              `</div><div class="rt"><b>${catchOfDay[2]}</b></div></div>`,
          )
          .join('')}` +
        `<div class="sh">${translate('Tables', 'Tables')}</div><div class="card sm" id="gnBox" data-l="` +
        `${langKey}"></div>` +
        `${jour.tables
          .map((table) => {
            const note = EN ? table[4] : table[3];
            return (
              `<div class="card sm rescard" data-res="${table[1]}"><div class="b">${table[0]} · ${table[1]} · ` +
              `${table[2]} p<span class="gn" data-t="${table[1]}"></span></div>` +
              `${note ? `<div class="muted sm">${note}</div>` : ''}</div>`
            );
          })
          .join('')}` +
        `</div>`);
  }

  /**
   * `alg` - Function ⚠️
   *
   * The allergen table of the winter menu, dish by dish (full = stated, dashed = likely).
   *
   * @returns { void }
   */
  function alg() {
    const winterDishes = dishes.filter((dish) => dish.svc.includes('hiver'));
    app.innerHTML =
      appbar(translate('Allergènes', 'Allergens'), 'chapter') +
      (`<div class="pad"><p class="muted sm">${ALGNOTE}</p><p class="muted sm">` +
        `${translate('Plein = annoncé par la carte ou le chef · « ? » = probable, à vérifier.', 'Solid = stated by the menu or the chef · "?" = likely, to check.')}` +
        `</p>
  ` +
        `${winterDishes
          .map((dish) => {
            const allergens = algOf(dish);
            return (
              `<div class="card sm"><div class="b">${dish.n}</div><div class="algs">` +
              `${allergens.length ? allergens.map((allergen) => `<span class="chip${allergen.q ? ' q' : ''}">${algLab(allergen.k)}${allergen.q ? ' ?' : ''}</span>`).join('') : `<span class="muted sm">${translate('Aucun allergène majeur annoncé', 'No major allergen stated')}</span>`}` +
              `</div></div>`
            );
          })
          .join('')}` +
        `</div>`);
  }

  /**
   * `study` - Function 🃏
   *
   * Flash cards of the current chapter: tap to flip, "review again" / "I know it".
   *
   * @returns { void }
   */
  function study() {
    const pool = shuffle(items.filter((item) => item.ch === curCh));
    let cardIndex = 0;
    // shows card k (or ends the deck)
    const show = () => {
      if (cardIndex >= pool.length) {
        toast(translate('Paquet terminé !', 'Deck done!'));
        return go('chapter');
      }
      const item = pool[cardIndex];
      const photo = photoOf(item);
      app.innerHTML =
        flowbar((100 * cardIndex) / pool.length, `${cardIndex + 1}/${pool.length}`) +
        (`<div class="pad">
    <div class="flip" id="flip"><div class="face front">` +
          `${item.ch === 'plan' ? planSVG({ hl: item.front, labels: false }) : `<div class="fq">${item.front}</div>${sayBtn(item)}`}` +
          `<small class="hint">${translate('Touchez pour retourner', 'Tap to flip')}` +
          `</small></div><div class="face back">${photo ? `<img class="bimg" src="${photo}" alt="">` : ''}` +
          `<div class="btxt">` +
          `${item.ch === 'plan' ? '<b>' + item.front + '</b><br>' + item.back : item.back}</div>` +
          `${
            item.info
              ? `<button class="chip gold" onclick="event.stopPropagation();LTFinfo('${item.id}')">` +
                `${svgIcon('info', 16)} ${translate('Infos client', 'Guest info')}</button>`
              : ''
          }` +
          `</div></div></div>
    <div class="abar fixed"><button class="btn sec grow" id="no">` +
          `${translate('À revoir', 'Review again')}</button><button class="btn grow ok" id="yes">` +
          `${svgIcon('check', 20)} ${translate('Je savais', 'I knew it')}</button></div>`);
      // ✕ & flip the card on tap 🔄
      bindX('chapter');
      queryOne('#flip').onclick = function () {
        this.classList.toggle('on');
      };
      // ✅ "I know it" (+2 XP) / 🔁 "review again"
      queryOne('#yes').onclick = () => {
        record(item, true, 2);
        cardIndex++;
        show();
      };
      queryOne('#no').onclick = () => {
        record(item, false);
        cardIndex++;
        show();
      };
    };
    show();
  }

  // ===== QUIZ / EXAM ENGINE ❓ ===== //

  /**
   * `planQ` - Function 🗺️
   *
   * Turns a floor plan item into "what's the number of the highlighted table?".
   *
   * @param { object } question - the plan question { table }
   * @returns { void }
   */
  const planQ = (question) => {
    const table = question.table;
    question.q = translate(
      'Quel est le numéro de la table en surbrillance ?',
      'What is the number of the highlighted table?',
    );
    question.options = shuffle([
      table.id,
      ...shuffle(
        LTF.tables.filter((otherTable) => otherTable.id !== table.id).map((otherTable) => otherTable.id),
      ).slice(0, 3),
    ]);
    question.answer = table.id;
    question.expl = '';
    question.svg = planSVG({ hl: table.id, labels: false });
  };

  /**
   * `qPhoto` - Function 🖼️
   *
   * @param { object } question - a question
   * @returns { string } - the item photo, only when the question names the item (else '')
   */
  const qPhoto = (question) => {
    const item = question.item;
    if (!item || question.svg) return '';
    const photo = photoOf(item);
    if (!photo) return '';
    const normalizedName = norm(strip(item.front));
    return normalizedName && norm(question.q).includes(normalizedName)
      ? `<img class="qimg" src="${photo}" alt="">`
      : '';
  };

  /**
   * `chName` - Function 📚
   *
   * @param { string } id - a chapter id
   * @returns { string } - its name
   */
  const chName = (id) => {
    const chapter = CHAPTERS.find((chapter) => chapter.id === id);
    return chapter ? chapter.name : '';
  };

  /**
   * `runQuiz` - Function ❓
   *
   * Plays a list of questions: answers turn green/red, a feedback sheet explains, then the next one.
   *
   * @param { string } title - the title (quiz, exam, review)
   * @param { Array<object> } questions - the questions
   * @param { string } back - the view to go back to
   * @param { (score: number, total: number, seconds: number) => void } onEnd - called at the end
   * @param { number } [xp] - XP per right answer (10 by default)
   * @returns { void }
   */
  function runQuiz(title, questions, back, onEnd, xp) {
    let questionIndex = 0,
      score = 0;
    const startTime = Date.now();
    // shows question k (or ends)
    const show = () => {
      closeOverlays();
      if (questionIndex >= questions.length)
        return onEnd(score, questions.length, Math.round((Date.now() - startTime) / 1000));
      const question = questions[questionIndex];
      if (question.plan) planQ(question);
      app.innerHTML =
        flowbar((100 * questionIndex) / questions.length, `${questionIndex + 1}/${questions.length}`) +
        (`<div class="pad">${question.svg ? `<div class="card">${question.svg}</div>` : qPhoto(question)}` +
          `<div class="muted sm">${title}${question.item ? ' · ' + chName(question.item.ch) : ''}` +
          `</div><h2 class="qq">${esc(question.q)}</h2>
    <div class="opts">` +
          `${question.options.map((option, index) => `<button class="opt" data-i="${index}"><span class="k">${'ABCDEF'[index]}</span><span>${esc(option)}</span></button>`).join('')}` +
          `</div></div>`);
      bindX(back, questionIndex > 0);
      // 👆 an answer: lock the options, show the right one, beep, record & show the feedback sheet
      app.querySelectorAll('.opt').forEach(
        (button) =>
          (button.onclick = () => {
            const ok = question.options[button.dataset.i] === question.answer;
            app.querySelectorAll('.opt').forEach((optionButton) => {
              optionButton.disabled = true;
              if (question.options[optionButton.dataset.i] === question.answer) {
                optionButton.classList.add('right');
                optionButton.querySelector('.k').innerHTML = svgIcon('check', 16);
              }
            });
            if (!ok) button.classList.add('wrong');
            if (ok) score++;
            beep(ok);
            record(question.item, ok, xp || 10);
            const feedback = document.createElement('div');
            feedback.id = 'fb';
            feedback.className = 'ov fbsheet ' + (ok ? 'okc' : 'koc');
            feedback.innerHTML =
              `<div class="fbt">${svgIcon(ok ? 'check' : 'x', 22)} ` +
              `${ok ? translate('Bonne réponse !', 'Correct!') + ` +${xp || 10} XP` : translate('Pas tout à fait', 'Not quite')}` +
              `</div><div class="fbx">` +
              `${ok ? '' : translate('Réponse', 'Answer') + ' : <b>' + esc(question.answer) + '</b>. '}` +
              `${question.expl ? esc(question.expl) : ''}</div><div class="fbb">` +
              `${question.item && question.item.info ? `<button class="btn sec sq" onclick="LTFinfo('${question.item.id}')" aria-label="info">${svgIcon('info', 20)}</button>` : ''}` +
              `<button class="btn grow" id="nx">${translate('Continuer', 'Continue')}</button></div>`;
            document.body.appendChild(feedback);
            feedback.querySelector('#nx').onclick = () => {
              questionIndex++;
              show();
            };
          }),
      );
    };
    show();
  }

  /**
   * `quiz` - Function ❓
   *
   * 10 random questions of the current chapter.
   *
   * @returns { void }
   */
  function quiz() {
    const questions = [];
    for (let index = 0; index < 10; index++) {
      const question = randQ(curCh);
      if (question) questions.push(question);
    }
    runQuiz('Quiz', questions, 'chapter', (score, total, seconds) =>
      endScreen(score, total, 'chapter', 'quiz', seconds),
    );
  }

  /**
   * `fmtT` - Function ⏱️
   *
   * @param { number } seconds - seconds
   * @returns { string } - "m:ss" ('' for 0)
   */
  const fmtT = (seconds) =>
    seconds ? Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') : '';

  /**
   * `endScreen` - Function 🏁
   *
   * The result dialog: score, mistakes, time, and play again / review mistakes / back.
   *
   * @param { number } score - the score
   * @param { number } total - the number of questions
   * @param { string } back - the view to go back to
   * @param { string } [again] - the view of "play again"
   * @param { number } [secs] - the time spent
   * @returns { void }
   */
  function endScreen(score, total, back, again, secs) {
    const pct = Math.round((100 * score) / total);
    if (pct === 100) confetti();
    const msg =
      pct >= 90
        ? translate("Digne d'un Maître d'hôtel", "Maître d'hôtel material")
        : pct >= 70
          ? translate('Très bon service', 'Great service')
          : pct >= 50
            ? translate('On y est presque', 'Almost there')
            : translate('À retravailler, courage', 'Keep at it');
    app.innerHTML = flowbar(100, `${total}/${total}`);
    bindX(back);
    const dialogElement = dialog(
      `<div class="dic">${svgIcon(pct >= 70 ? 'award' : 'cap', 40)}</div><div class="dscore">${score}` +
        ` / ${total}</div><div class="dt">${msg}</div><div class="muted">${rank()} · ${progress.xp}` +
        ` XP</div>
   <div class="dstats"><div><b>${pct}%</b><span>Score</span></div><div><b>` +
        `${total - score}</b><span>${translate('Erreurs', 'Mistakes')}</span></div>` +
        `${secs ? `<div><b>${fmtT(secs)}</b><span>${translate('Temps', 'Time')}</span></div>` : ''}` +
        `</div>
   <button class="btn" id="dag">${translate('Rejouer', 'Play again')}</button>` +
        `${total - score > 0 ? `<button class="btn sec" id="drv">${translate('Revoir mes erreurs', 'Review my mistakes')}</button>` : ''}` +
        `<button class="btn txt" id="dbk">${translate('Terminer', 'Done')}</button>`,
      false,
    );
    dialogElement.querySelector('#dag').onclick = () => go(again || back);
    const reviewButton = dialogElement.querySelector('#drv');
    if (reviewButton) reviewButton.onclick = () => go('review');
    dialogElement.querySelector('#dbk').onclick = () => go(back);
  }

  /**
   * `exam` - Function 🎓
   *
   * The final exam: 3 questions per chapter, 15 XP each; 80% or more = the certificate.
   *
   * @returns { void }
   */
  function exam() {
    const questions = [];
    CHAPTERS.forEach((chapter) => {
      for (let index = 0; index < 3; index++) {
        const question = randQ(chapter.id);
        if (question) questions.push(question);
      }
    });
    runQuiz(
      translate('Examen final', 'Final exam'),
      shuffle(questions),
      'revise',
      (score, total, seconds) => {
        const pct = Math.round((100 * score) / total);
        if (pct >= 80) {
          progress.exam = { score: pct, date: new Date().toLocaleDateString(EN ? 'en-GB' : 'fr-FR') };
          save();
          go('cert');
        } else endScreen(score, total, 'revise', 'exam', seconds);
      },
      15,
    );
  }

  /**
   * `cert` - Function 🏆
   *
   * @returns { void } - the certificate (back to Réviser when the exam isn't passed)
   */
  function cert() {
    if (!progress.exam) return revise();
    confetti();
    app.innerHTML =
      appbar(translate('Certificat', 'Certificate'), 'revise') +
      (`<div class="pad"><div class="cert">` +
        `<div class="kicker">Les Trois Forts · Sofitel Marseille Vieux-Port</div><h1>` +
        `${translate('Certifié', 'Certified')}</h1><p>` +
        `${translate("a réussi l'examen final de la Service Academy", 'passed the Service Academy final exam')}` +
        `</p><div class="score">${progress.exam.score}%</div><p>${progress.exam.date} · ${rank()}` +
        `</p></div></div>`);
  }

  /**
   * `revise` - Function 🔁
   *
   * The Réviser tab: my mistakes, the final exam, the certificate & the list to review.
   *
   * @returns { void }
   */
  function revise() {
    const its = progress.review.map((id) => items.find((item) => item.id === id)).filter(Boolean);
    app.innerHTML =
      appbar(translate('Réviser', 'Review'), null, '', true) +
      (`<div class="pad">
  <button class="card hero2" onclick="LTFgo('review')" ` +
        `${its.length ? '' : 'disabled'}><div class="av big">${svgIcon('redo', 26)}` +
        `</div><div class="tx"><div class="n">${translate('Mes erreurs', 'My mistakes')}` +
        `</div><div class="muted">` +
        `${its.length ? its.length + ' ' + translate('à revoir · quiz de 15 max', 'to review · up to 15 questions') : translate('Aucune erreur à revoir. Impeccable !', 'No mistakes to review. Flawless!')}` +
        `</div></div>${its.length ? svgIcon('chev', 18) : ''}` +
        `</button>
  <button class="card hero2" onclick="LTFgo('exam')"><div class="av big">` +
        `${svgIcon('cap', 26)}</div><div class="tx"><div class="n">` +
        `${translate('Examen final', 'Final exam')}</div><div class="muted">` +
        `${translate('3 questions par chapitre · 80 % pour le certificat', '3 questions per chapter · 80% for the certificate')}` +
        `</div></div>${svgIcon('chev', 18)}</button>
  ` +
        `${
          progress.exam
            ? `<button class="card hero2" onclick="LTFgo('cert')"><div class="av big">${svgIcon('award', 26)}` +
              `</div><div class="tx"><div class="n">${translate('Mon certificat', 'My certificate')}` +
              `</div><div class="muted">${progress.exam.score}% · ${progress.exam.date}</div></div>` +
              `${svgIcon('chev', 18)}</button>`
            : ''
        }` +
        `
  ` +
        `${
          its.length
            ? `<div class="sh">${translate('À revoir', 'To review')}</div>` +
              its
                .slice(0, 40)
                .map((item) => {
                  const photo = photoOf(item);
                  return (
                    `<div class="li" ${item.info ? `onclick="LTFinfo('${item.id}')"` : ''}>` +
                    `${photo ? `<img class="thumb" src="${photo}" loading="lazy" alt="">` : `<div class="av">${svgIcon(CHIC[item.ch] || 'star', 20)}</div>`}` +
                    `<div class="tx"><div class="n">` +
                    `${item.ch === 'plan' ? translate('Table', 'Table') + ' ' + item.front : item.front}` +
                    `</div><div class="muted sm">${chName(item.ch)}</div></div></div>`
                  );
                })
                .join('')
            : ''
        }` +
        `
  </div>`);
  }

  /**
   * `review` - Function 🔁
   *
   * A quiz of up to 15 items from the review list.
   *
   * @returns { void }
   */
  function review() {
    const its = progress.review.map((id) => items.find((item) => item.id === id)).filter(Boolean);
    if (!its.length) return go('revise');
    const questions = shuffle(its).slice(0, 15).map(qFor).filter(Boolean);
    runQuiz(translate('Révision', 'Review'), questions, 'revise', (score, total, seconds) =>
      endScreen(score, total, 'revise', 'review', seconds),
    );
  }

  /**
   * `chrono` - Function ⏱️
   *
   * 60 seconds, as many right answers as possible: 10 points x combo (up to x5).
   *
   * @returns { void }
   */
  function chrono() {
    let secondsLeft = 60,
      score = 0,
      combo = 1,
      best = progress.best[curCh] || 0;
    // the next question
    const next = () => {
      const question = randQ(curCh);
      if (!question) return;
      if (question.plan) planQ(question);
      queryOne('#cq').innerHTML =
        `${question.svg ? `<div class="card">${question.svg}</div>` : ''}<h2 class="qq">${esc(question.q)}</h2>`;
      queryOne('#co').innerHTML = question.options
        .map(
          (option, index) =>
            `<button class="opt" data-i="${index}"><span class="k">${'ABCDEF'[index]}</span><span>${esc(option)}</span></button>`,
        )
        .join('');
      // 👆 an answer: score & combo, flash, next
      app.querySelectorAll('#co .opt').forEach(
        (button) =>
          (button.onclick = () => {
            const ok = question.options[button.dataset.i] === question.answer;
            beep(ok);
            record(question.item, ok, 0);
            if (ok) {
              score += 10 * combo;
              combo = Math.min(combo + 1, 5);
              flash('okf');
            } else {
              combo = 1;
              flash('kof');
              toast(translate('Réponse', 'Answer') + ' : ' + question.answer);
            }
            queryOne('#cs').textContent = score;
            queryOne('#cc').textContent = '×' + combo;
            next();
          }),
      );
    };
    // the HUD: time, score, combo + the time bar
    app.innerHTML =
      flowbar(100, '') +
      (`<div class="pad"><div class="hud"><div>${svgIcon('timer', 18)}` +
        `<b id="ct">60</b>s</div><div>Score <b id="cs">0</b></div><div>Combo <b id="cc">×1</b></div></div>` +
        `<div id="cq"></div><div class="opts" id="co"></div></div>`);
    bindX('chapter', true);
    const progressBar = app.querySelector('.pbar i');
    next();
    // ⏱️ every second: tick, and at 0 save the XP / record and show the result
    timer = setInterval(() => {
      secondsLeft--;
      const element = queryOne('#ct');
      if (element) element.textContent = secondsLeft;
      if (progressBar) progressBar.style.width = (100 * secondsLeft) / 60 + '%';
      if (secondsLeft <= 0) {
        clearInterval(timer);
        closeOverlays();
        progress.xp += Math.round(score / 5);
        const rec = score > best;
        if (rec) {
          progress.best[curCh] = score;
        }
        save();
        if (rec) confetti();
        const dialogElement = dialog(
          `<div class="dic">${svgIcon(rec ? 'award' : 'timer', 40)}</div><div class="dscore">${score}` +
            `</div><div class="dt">` +
            `${rec ? translate('Nouveau record !', 'New record!') : translate('Record', 'Best') + ' : ' + best}` +
            `</div><div class="muted">+${Math.round(score / 5)}` +
            ` XP</div><div class="dstats"></div><button class="btn" id="dag">` +
            `${translate('Rejouer', 'Play again')}</button><button class="btn txt" id="dbk">` +
            `${translate('Terminer', 'Done')}</button>`,
          false,
        );
        dialogElement.querySelector('#dag').onclick = () => go('chrono');
        dialogElement.querySelector('#dbk').onclick = () => go('chapter');
      }
    }, 1000);
  }

  // ===== BAR: BUILD THE COCKTAIL 🍸 ===== //

  /**
   * `bar` - Function 🍸
   *
   * A random cocktail order: pick its ingredients, its glass and its garnish, then "Serve".
   *
   * @returns { void }
   */
  function bar() {
    const item = pick(items.filter((entry) => entry.cocktail));
    const cocktail = item.cocktail;
    // the ingredients needed + some others on the shelf, the glasses & the garnishes
    const need = cocktail.recipe.map((ingredientLine) => translateWord(ingredientLine[0]));
    const shelf = shuffle(
      uniq(
        need.concat(
          shuffle(allIngr.filter((ingredient) => !need.includes(ingredient))).slice(
            0,
            Math.max(4, 8 - need.length),
          ),
        ),
      ),
    );
    const glasses = uniq(LTF.cocktails.map((cocktail) => translateWord(cocktail.glass)));
    const garn = uniq(LTF.cocktails.map((cocktail) => translateWord(cocktail.garnish)));
    // the picked ingredients, glass & garnish
    let sel = new Set(),
      glass = null,
      garnish = null;
    const photo = photoOf(item);
    app.innerHTML =
      appbar(translate('Le Bar', 'The Bar'), 'chapter') +
      (`<div class="pad"><div class="card order">` +
        `${photo ? `<img class="thumb zoomable" src="${photo}" alt="" onclick="LTFzoom('${item.id}',event)">` : ''}` +
        `<div><div class="kick2">${translate('Commande', 'Order')}</div><div class="ptitle sm">` +
        `${cocktail.n}</div>` +
        `${cocktail.batch ? '<div class="muted sm">' + translate('Préparation', 'Batch') + ' ' + cBatch(cocktail) + '</div>' : ''}` +
        `</div></div>
  <div class="sh">1. ${translate('Les ingrédients', 'Ingredients')}` +
        `</div><div class="chips" id="sh">` +
        `${shelf.map((ingredient) => `<button class="chip" data-v="${esc(ingredient)}">${esc(ingredient)}</button>`).join('')}` +
        `</div>
  <div class="sh">2. ${translate('Le verre', 'Glass')}</div><div class="chips" id="gl">` +
        `${glasses.map((glass) => `<button class="chip" data-v="${esc(glass)}">${esc(glass)}</button>`).join('')}` +
        `</div>
  <div class="sh">3. ${translate('La garniture', 'Garnish')}` +
        `</div><div class="chips" id="ga">` +
        `${garn.map((garnish) => `<button class="chip" data-v="${esc(garnish)}">${esc(garnish)}</button>`).join('')}` +
        `</div></div>
  <div class="abar fixed"><button class="btn grow" id="serve">` +
        `${svgIcon('glass', 20)} ${translate('Servir', 'Serve')}</button></div>`);
    // ingredients: multiple choice (toggle)
    app.querySelectorAll('#sh .chip').forEach(
      (chip) =>
        (chip.onclick = () => {
          chip.classList.toggle('on');
          sel.has(chip.dataset.v) ? sel.delete(chip.dataset.v) : sel.add(chip.dataset.v);
        }),
    );
    // glass & garnish: single choice
    const single = (id, setter) =>
      app.querySelectorAll(id + ' .chip').forEach(
        (chip) =>
          (chip.onclick = () => {
            app.querySelectorAll(id + ' .chip').forEach((otherChip) => otherChip.classList.remove('on'));
            chip.classList.add('on');
            setter(chip.dataset.v);
          }),
      );
    single('#gl', (value) => (glass = value));
    single('#ga', (value) => (garnish = value));
    // 🍸 serve: 1 point per right part, 3/3 = perfect
    queryOne('#serve').onclick = () => {
      const okI = need.every((ingredient) => sel.has(ingredient)) && sel.size === need.length;
      const okG = glass === translateWord(cocktail.glass),
        okN = garnish === translateWord(cocktail.garnish);
      const pts = [okI, okG, okN].filter(Boolean).length;
      const ok = pts === 3;
      beep(ok);
      record(item, ok, 10 * pts);
      if (ok) confetti();
      const checkRow = (isRight, label) =>
        `<div class="ckr ${isRight ? 'y' : 'n'}">${svgIcon(isRight ? 'check' : 'x', 18)} ${label}</div>`;
      sheet(
        `<div class="stitle">${pts}/3 ${ok ? translate('· Parfait, envoyé !', '· Perfect, sent!') : ''}` +
          `</div><div class="ckrow">${checkRow(okI, translate('Ingrédients', 'Ingredients'))}` +
          `${checkRow(okG, translate('Verre', 'Glass'))}` +
          `${checkRow(okN, translate('Garniture', 'Garnish'))}</div><div class="sdesc">${item.back}</div>`,
        {
          bar:
            `${item.info ? `<button class="btn sec sq" onclick="LTFinfo('${item.id}')">${svgIcon('info', 20)}</button>` : ''}` +
            `<button class="btn sec grow" onclick="LTFgo('chapter')">${translate('Retour', 'Back')}` +
            `</button><button class="btn grow" onclick="LTFgo('bar')">${translate('Suivant', 'Next')}` +
            `</button>`,
        },
      );
    };
  }

  // ===== FLOOR PLAN 🗺️ ===== //

  /**
   * `planSVG` - Function 🗺️
   *
   * Draws the floor plan (tables, counters, labels).
   *
   * @param { { hl?: string, res?: string[], labels?: boolean, reveal?: string } } [o] - highlighted table, reserved tables, labels on/off, revealed table
   * @returns { string } - the `<svg>` markup
   */
  function planSVG(options) {
    options = options || {};
    const size = 5.2;
    let svg =
      `<svg class="plan" viewBox="-3 -6 106 72" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="-2" y="-2" width="104" height="66" rx="2" class="room"/>` +
      `<line x1="0" y1="-1" x2="100" y2="-1" class="win"/><text x="50" y="-3" class="wl">` +
      `${translate('Baies vitrées · Vieux-Port', 'Bay windows · Vieux-Port')}</text>`;
    LTF.counters.forEach(
      (counter) =>
        (svg +=
          `<rect x="${counter.x1}" y="${counter.y}" width="${counter.x2 - counter.x1}` +
          `" height="3" class="ctr"/><text x="${(counter.x1 + counter.x2) / 2}" y="${counter.y + 6.5}` +
          `" class="cl">${counter.label}</text>`),
    );
    // every table: round / long / square, highlighted / reserved, with or without its number
    LTF.tables.forEach((table) => {
      const highlighted = options.hl === table.id;
      const reserved = (options.res || []).includes(table.id);
      const cls = 'tb' + (highlighted ? ' hl' : '') + (reserved ? ' res' : '');
      const lab = options.labels !== false || options.reveal === table.id;
      const shape =
        table.sh === 'round'
          ? `<circle cx="${table.x}" cy="${table.y}" r="${size * 0.65}" class="${cls}" data-id="${table.id}"/>`
          : table.sh === 'long'
            ? `<rect x="${table.x - 2.5}" y="${table.y - 8}" width="5" height="12" rx="1" class="${cls}" data-id="${table.id}"/>`
            : `<rect x="${table.x - size / 2}" y="${table.y - size / 2}" width="${size}" height="${size}" rx="1" class="${cls}" data-id="${table.id}"/>`;
      svg +=
        shape +
        (lab
          ? `<text x="${table.x}" y="${table.y + 1.2}" class="tl${reserved ? ' rl' : ''}">${table.id}</text>`
          : '');
    });
    return svg + '</svg>';
  }

  /**
   * `planFind` - Function 📍
   *
   * "Tap table T21": 10 random tables.
   *
   * @returns { void }
   */
  function planFind() {
    let round = 0,
      score = 0;
    const order = shuffle(LTF.tables).slice(0, 10);
    const show = () => {
      closeOverlays();
      if (round >= order.length) return endScreen(score, order.length, 'chapter', 'planFind');
      const table = order[round];
      const item = items.find((entry) => entry.ch === 'plan' && entry.front === table.id);
      app.innerHTML =
        flowbar((100 * round) / order.length, `${round + 1}/${order.length}`) +
        `<div class="pad"><h2 class="qq">${translate('Touchez la table', 'Tap table')} <span class="gold">${table.id}</span></h2><div class="card" id="pc">${planSVG({ labels: false })}</div></div>`;
      bindX('chapter', round > 0);
      // 👆 a table: right or wrong, reveal the numbers & show the feedback sheet
      app.querySelectorAll('svg [data-id]').forEach(
        (element) =>
          (element.onclick = () => {
            const ok = element.dataset.id === table.id;
            beep(ok);
            record(item, ok, 10);
            if (ok) score++;
            queryOne('#pc').innerHTML = planSVG({ labels: true, hl: table.id });
            const feedback = document.createElement('div');
            feedback.className = 'ov fbsheet ' + (ok ? 'okc' : 'koc');
            feedback.innerHTML =
              `<div class="fbt">${svgIcon(ok ? 'check' : 'x', 22)} ` +
              `${ok ? translate('Exact !', 'Correct!') : translate("C'était ici", 'It was here')} · ` +
              `${table.id}</div><div class="fbb"><button class="btn grow" id="nx">` +
              `${translate('Continuer', 'Continue')}</button></div>`;
            document.body.appendChild(feedback);
            feedback.querySelector('#nx').onclick = () => {
              round++;
              show();
            };
          }),
      );
    };
    show();
  }

  // ===== LA CARTE 📖 ===== //

  // the current carte filters (chapter & course) 🏷️
  let carteCat = 'all',
    carteCourse = 'all';

  /**
   * `LTFcourse` - Function (window) 🍽
   *
   * @param { string } course - the course filter ('all', 'app', 'start', 'main', 'cheese', 'dess')
   * @returns { void } - re-renders the carte, keeping the search
   */
  window.LTFcourse = (course) => {
    carteCourse = course;
    const searchText = queryOne('#srch') ? queryOne('#srch').value : '';
    carte();
    queryOne('#srch').value = searchText;
    queryOne('#srch').oninput();
  };

  /**
   * `LTFcat` - Function (window) 📚
   *
   * @param { string } category - the chapter filter ('all', a chapter id or 'facts')
   * @returns { void } - re-renders the carte, keeping the search
   */
  window.LTFcat = (category) => {
    carteCat = category;
    const searchText = queryOne('#srch') ? queryOne('#srch').value : '';
    carte();
    queryOne('#srch').value = searchText;
    queryOne('#srch').oninput();
  };

  /**
   * `LTFcourseHelp` - Function (window) ❓
   *
   * @returns { HTMLElement } - the "appetizer, starter or main?" explainer sheet
   */
  window.LTFcourseHelp = () =>
    sheet(
      `<div class="stitle">` +
        `${translate('Pour commencer, entrée ou plat ?', 'Appetizer, starter or main?')}` +
        `</div>
 <div class="cexp"><span class="cb cb-app">${cBoth('app')}</span><p>` +
        `${translate("Petites choses à partager en début de repas, en attendant l'entrée (ex. tapenade, charcuterie, beignets). Ce n'est pas un plat complet.", 'Small bites to share at the very start, while waiting for the starter (e.g. dips, cured meats, fritters). Not a full course.')}` +
        `</p></div>
 <div class="cexp"><span class="cb cb-start">${cBoth('start')}</span><p>` +
        `${translate('Le premier vrai plat, une portion légère avant le plat principal. Attention : un client américain dit « entrée » pour le plat principal !', 'The first real course, a light plate before the main. Careful: American guests say "entrée" for the main course!')}` +
        `</p></div>
 <div class="cexp"><span class="cb cb-main">${cBoth('main')}</span><p>` +
        `${translate('Le plat principal, la plus grosse portion. À la carte : « De la mer » = poisson, « De la terre » = viande. Au déjeuner, « Plat » de la formule.', 'The main course, the biggest plate. On the menu: "De la mer" = fish, "De la terre" = meat. At lunch, the formula\'s "Plat".')}` +
        `</p></div>
 <div class="cexp"><span class="cb cb-cheese">${cBoth('cheese')}</span><p>` +
        `${translate('Après le plat, avant ou à la place du dessert.', 'After the main, before or instead of dessert.')}` +
        `</p></div>
 <div class="cexp"><span class="cb cb-dess">${cBoth('dess')}</span><p>` +
        `${translate('La fin du repas.', 'The end of the meal.')}</p></div>
 <p class="muted">` +
        `${translate('Ordre du service : Pour commencer → Entrée → Plat → Fromage → Dessert.', 'Service order: Appetizer → Starter → Main → Cheese → Dessert.')}` +
        `</p>`,
      {
        bar: `<button class="btn grow" onclick="LTFcloseSheet()">${translate('Compris', 'Got it')}</button>`,
      },
    );

  /**
   * `carte` - Function 📖
   *
   * The whole menu: search, course tabs, chapter chips and the list (grouped by course).
   *
   * @returns { void }
   */
  function carte() {
    // the chapter chips (+ "key facts")
    const cats = [['all', translate('Tout', 'All')]]
      .concat(
        CHAPTERS.filter((chapter) => chapter.id !== 'plan').map((chapter) => [chapter.id, chapter.name]),
      )
      .concat([['facts', translate('À retenir', 'Key facts')]]);
    // the search, the course tabs & the chapter chips (hidden while a course tab is on)
    app.innerHTML =
      appbar(translate('La Carte', 'The Menu'), null, '', true) +
      (`<div class="sticky"><label class="srch">${svgIcon('search', 18)}<input id="srch" placeholder="` +
        `${translate('Plat, vin, cocktail…', 'Dish, wine, cocktail…')}` +
        `" autocomplete="off"></label><div class="ctabs">` +
        `${[['all', translate('Tout', 'All')]]
          .concat(
            CORDER.map((course) => [
              course,
              course === 'app'
                ? translate('Pour commencer', 'Appetizers')
                : course === 'start'
                  ? translate('Entrées', 'Starters')
                  : course === 'main'
                    ? translate('Plats', 'Mains')
                    : course === 'cheese'
                      ? translate('Fromages', 'Cheese')
                      : translate('Desserts', 'Desserts'),
            ]),
          )
          .map(
            ([value, label]) =>
              `<button class="ctab ${value !== 'all' ? 'cb-' + value : ''} ${carteCourse === value ? 'on' : ''}" onclick="LTFcourse('${value}')">${label}</button>`,
          )
          .join('')}` +
        `<button class="ctab q" onclick="LTFcourseHelp()" aria-label="?">${svgIcon('info', 18)}` +
        `</button></div>
  ${carteCourse === 'all' ? '' : '<!--'}<div class="chips scroll">` +
        `${cats.map(([value, label]) => `<button class="chip ${carteCat === value ? 'on' : ''}" onclick="LTFcat('${value}')">${label}</button>`).join('')}` +
        `</div>${carteCourse === 'all' ? '' : '-->'}
</div><div class="pad" id="list"></div>`);
    // renders the list for the current filters & search 🔎
    const render = () => {
      const needle = norm(queryOne('#srch').value);
      // one block per chapter
      const blocks = CHAPTERS.filter(
        (chapter) =>
          chapter.id !== 'plan' &&
          (carteCourse !== 'all'
            ? ['dej', 'diner', 'dess'].includes(chapter.id)
            : carteCat === 'all' || carteCat === chapter.id),
      )
        .map((chapter) => {
          let its = items.filter(
            (item) =>
              item.ch === chapter.id &&
              !item.fact &&
              norm(item.front + ' ' + strip(item.back) + ' ' + strip(item.info)).includes(needle),
          );
          // the course filter
          if (carteCourse !== 'all') its = its.filter((item) => item.course === carteCourse);
          // 🔎 search ranking: name match > word start > anywhere
          if (needle) {
            const searchRank = (item) => {
              if (norm(item.front).includes(needle)) return 0;
              const haystack =
                ' ' +
                norm(item.front + ' ' + strip(item.back) + ' ' + strip(item.info)).replace(
                  /[^a-z0-9]+/g,
                  ' ',
                );
              return haystack.includes(' ' + needle.replace(/[^a-z0-9]+/g, ' ').trim()) ? 1 : 2;
            };
            its = its.slice().sort((firstItem, secondItem) => searchRank(firstItem) - searchRank(secondItem));
          }
          // in course order
          if (its.some((item) => item.course))
            its = its
              .slice()
              .sort(
                (firstItem, secondItem) =>
                  CORDER.indexOf(firstItem.course) - CORDER.indexOf(secondItem.course),
              );
          if (!its.length) return '';
          // a course heading before each new course
          let lastC = null;
          return (
            `<div class="sh">${chapter.name}</div>` +
            its
              .map((item) => {
                const heading =
                  item.course && item.course !== lastC
                    ? `<div class="csh cb-${item.course}"><span class="dot"></span>${cBoth(item.course)}</div>`
                    : '';
                lastC = item.course || lastC;
                const photo = photoOf(item);
                return (
                  heading +
                  (`<div class="li menu" ${item.info ? `onclick="LTFinfo('${item.id}')"` : ''}>` +
                    `${photo ? `<img class="thumb zoomable" src="${photo}" loading="lazy" alt="" onclick="LTFzoom('${item.id}',event)">` : `<div class="av">${svgIcon(CHIC[chapter.id] || 'star', 20)}</div>`}` +
                    `<div class="tx">` +
                    `${item.course ? `<span class="cb cb-${item.course}">${cLab(item.course)}${item.csub ? ' · ' + item.csub : ''}</span>` : ''}` +
                    `<div class="n">${item.front}</div><div class="muted sm clamp">` +
                    `${esc(strip(item.back).replace(/^(Pour commencer|Entrée|Plat principal|Fromage|Dessert|Appetizer|Starter|Main course|Cheese)( · (poisson|viande|fish|meat))? /, ''))}` +
                    `</div></div>${sayBtn(item)}${item.info ? `<span class="rt">${svgIcon('chev', 18)}</span>` : ''}` +
                    `</div>`)
                );
              })
              .join('')
          );
        })
        .join('');
      // the key facts (all / facts only)
      const facts =
        (carteCat === 'all' && carteCourse === 'all') || carteCat === 'facts'
          ? FACTS.filter((fact) => norm(fact).includes(needle))
          : [];
      // the list (or "no results")
      queryOne('#list').innerHTML =
        blocks +
          (facts.length
            ? `<div class="sh">${translate('À retenir', 'Key facts')}</div><div class="card">` +
              facts.map((fact) => `<p class="fact">${esc(fact)}</p>`).join('') +
              '</div>'
            : '') || `<div class="empty muted">${translate('Aucun résultat', 'No results')}</div>`;
    };
    // 👂 live search
    queryOne('#srch').oninput = render;
    render();
  }

  /**
   * `settings` - Function 👤
   *
   * The Profil tab: rank & XP, theme, language, sound, about & reset.
   *
   * @returns { void }
   */
  function settings() {
    const lvl = progress.xp % 300;
    const theme = progress.theme || 'auto';
    // a segmented control (theme, language)
    const seg = (opts, cur, callbackName) =>
      `<div class="seg">${opts.map(([value, label]) => `<button class="${value === cur ? 'on' : ''}" onclick="${callbackName}('${value}')">${label}</button>`).join('')}</div>`;
    app.innerHTML =
      appbar(translate('Profil', 'Profile'), null, '', true) +
      (`<div class="pad">
  <div class="card row"><div class="av big">${svgIcon('user', 26)}` +
        `</div><div class="grow"><div class="rk">${rank()}</div><div class="bar"><i style="width:` +
        `${lvl / 3}%"></i></div><div class="muted sm">${progress.xp} XP · ${mastery()}% ` +
        `${translate('maîtrisé', 'mastered')} · ${progress.streak} ` +
        `${translate('j de suite', 'day streak')}</div></div></div>
  <div class="sh">` +
        `${translate('Apparence', 'Appearance')}</div>
  <div class="card"><div class="lrow">` +
        `${svgIcon('palette', 20)}<span>${translate('Thème', 'Theme')}</span></div>` +
        `${seg(
          [
            ['auto', 'Auto'],
            ['light', translate('Clair', 'Light')],
            ['dark', translate('Sombre', 'Dark')],
            ['black', translate('Noir', 'Black')],
          ],
          theme,
          'LTFtheme',
        )}` +
        `
   <div class="lrow mt">${svgIcon('globe', 20)}<span>${translate('Langue', 'Language')}` +
        `</span></div>` +
        `${seg(
          [
            ['fr', 'Français'],
            ['en', 'English'],
          ],
          EN ? 'en' : 'fr',
          'LTFlang',
        )}` +
        `</div>
  <div class="card"><label class="lrow sw">${svgIcon('sound', 20)}<span class="grow">` +
        `${translate('Effets sonores', 'Sound effects')}</span><input type="checkbox" id="snd" ` +
        `${progress.sound ? 'checked' : ''}><i class="tg"></i></label></div>
  <div class="sh">` +
        `${translate('À propos', 'About')}</div>
  <div class="card sm"><p>` +
        `${translate('Contenu transcrit des cartes réelles du restaurant (octobre 2026). La formule de la semaine change chaque semaine.', "Content transcribed from the restaurant's real menus (October 2026). The weekly formula changes every week.")}` +
        `</p><p>` +
        `${translate("Photos : ouvrez une fiche puis « Caméra » ou « Galerie » pour remplacer la photo d'illustration. Vos photos restent sur ce téléphone.", 'Photos: open an item, then "Camera" or "Gallery" to replace the sample picture. Your photos stay on this phone.')}` +
        `</p><p class="warn">${ALLERGY}</p></div>
  <button class="btn danger wide" id="rst">` +
        `${svgIcon('trash', 20)} ${translate('Réinitialiser la progression', 'Reset progress')}` +
        `</button></div>`);
    // 🔊 the sound switch
    queryOne('#snd').onchange = (event) => {
      progress.sound = event.target.checked;
      save();
    };
    // 🗑 reset the progress (photos & settings are kept)
    queryOne('#rst').onclick = () =>
      confirmDlg(
        translate('Tout effacer ?', 'Erase everything?'),
        translate(
          'XP, rang, records et erreurs seront remis à zéro. Vos photos sont conservées.',
          'XP, rank, records and mistakes will be reset. Your photos are kept.',
        ),
        translate('Effacer', 'Erase'),
        () => {
          progress = {
            xp: 0,
            m: {},
            best: {},
            review: [],
            streak: 1,
            last: progress.last,
            sound: progress.sound,
            exam: null,
            lang: progress.lang,
            theme: progress.theme,
          };
          save();
          go('hub');
        },
        true,
      );
  }

  // ===== FX ✨ ===== //

  /**
   * `toast` - Function 🍞
   *
   * @param { string } text - the message
   * @returns { void } - shows it for 1.8 s
   */
  function toast(text) {
    const toastElement = document.createElement('div');
    toastElement.className = 'toast';
    toastElement.textContent = text;
    document.body.appendChild(toastElement);
    setTimeout(() => toastElement.remove(), 1800);
  }

  /**
   * `flash` - Function ⚡
   *
   * @param { string } className - the body class ('okf' / 'kof')
   * @returns { void } - flashes the screen green / red
   */
  function flash(className) {
    document.body.classList.add(className);
    setTimeout(() => document.body.classList.remove(className), 180);
  }

  /**
   * `confetti` - Function 🎉
   *
   * @returns { void } - 120 gold & white confetti for 150 frames
   */
  function confetti() {
    const canvas = document.createElement('canvas');
    canvas.className = 'conf';
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');
    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      v: 2 + Math.random() * 4,
      r: Math.random() * 6.28,
      c: pick(['#c9a24b', '#f3e9d2', '#2f5d8a', '#e8c873', '#ffffff']),
    }));
    let frame = 0;
    (function animate() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
        particle.y += particle.v;
        particle.r += 0.1;
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.r);
        context.fillStyle = particle.c;
        context.fillRect(-4, -2, 8, 4);
        context.restore();
      });
      if (++frame < 150) requestAnimationFrame(animate);
      else canvas.remove();
    })();
  }

  // ===== SELF-TEST & BOOT 🚀 ===== //

  /**
   * `LTFtest` - Function (window) 🧪
   *
   * Runs every question generator once and checks the answers & the ⓘ notes.
   *
   * @returns { { items: number, bad: number, noInfo: string[] } }
   */
  window.LTFtest = () => {
    let bad = 0;
    items.forEach((item) =>
      item.gens.forEach((generator) => {
        const question = generator();
        if (!question) {
          return;
        }
        if (question.plan) return;
        if (
          !question.options.includes(question.answer) ||
          new Set(question.options).size !== question.options.length
        ) {
          bad++;
          console.warn('bad', item.id, question);
        }
      }),
    );
    const noInfo = items
      .filter(
        (item) =>
          !item.fact &&
          item.ch !== 'plan' &&
          (!item.info || !/💬/.test(item.info) || /💬[^<]*<\/div><div><\/div>/.test(item.info)),
      )
      .map((item) => item.id);
    return { items: items.length, bad, noInfo };
  };
  // 🏠 start on the hub (replacing the first history entry)
  try {
    history.replaceState({ v: 'hub' }, '');
  } catch (error) {}
  navPop = true;
  go('hub');
  // 📸 then load the waiter's own photos
  idbOpen()
    .then(idbAll)
    .then(() => {
      if (Object.keys(PHOTOS).length && lastView[0] === 'carte') refresh();
    });
})();
