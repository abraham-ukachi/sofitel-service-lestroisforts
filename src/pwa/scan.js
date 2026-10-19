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
 * @name: Les Trois Forts - Photo Scan
 * @file: pwa/scan.js
 * @type: JavaScript
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script src="scan.js" defer
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 📷 Les Trois Forts — Scan: identify a dish, dessert, wine or champagne from the camera, on-device.
// 🖼️ Image match: MobileNet v2 (float16, ~7 MB) embeddings vs the reference photos (scan/emb.json) + the waiter's own photos.
// 🏷️ Label match: Tesseract OCR (French) fuzzy-matched against the app's own item names.
// 📴 Everything lives under scan/ and is cached by the service worker in a persistent cache (works offline after the first use).
(function () {
  // ===== CONSTANTS & HELPERS 🧰 ===== //

  // the folder of every scan asset 📁
  const BASE = 'scan/';
  // the files to precache for offline use (scripts, model, reference embeddings, OCR engine & French data) 📦
  const ASSETS = [
    'vendor/tensorflow/tf.js',
    'vendor/tensorflow/mobilenet.js',
    'model/model.json',
    'model/group1-shard1of1.bin',
    'emb.json',
    'vendor/tesseract/tesseract.min.js',
    'vendor/tesseract/worker.min.js',
    'vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js',
    'vendor/tesseract/core/tesseract-core-lstm.wasm.js',
    'lang/fra.traineddata.gz',
  ];

  /**
   * `isEnglish` - Function 🌍
   *
   * @returns { boolean } - true when the app is in English (`<html lang="en">`)
   */
  const isEnglish = () => document.documentElement.lang === 'en';

  /**
   * `translate` - Function 🏷️
   *
   * @param { string } fr - the French text
   * @param { string } en - the English text
   * @returns { string } - the text in the current language
   */
  const translate = (fr, en) => (isEnglish() ? en : fr);

  /**
   * `queryOne` - Function 🔎
   *
   * @param { string } selector - a CSS selector
   * @returns { Element | null } - the first matching element
   */
  const queryOne = (selector) => document.querySelector(selector);

  /**
   * `escapeHtml` - Function 🛡️
   *
   * @param { any } value - the text to escape (`null` & `undefined` become '')
   * @returns { string } - the escaped text
   */
  const escapeHtml = (value) =>
    String(value == null ? '' : value).replace(
      /[&<>"]/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char],
    );

  /**
   * `stripTags` - Function 🧹
   *
   * @param { string } html - some HTML
   * @returns { string } - its plain text (tags & `<br>` become spaces, spaces collapsed)
   */
  const stripTags = (html) =>
    String(html || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  /**
   * `normalize` - Function 🔡
   *
   * @param { string } value - any text
   * @returns { string } - lowercase, no accents, only `a-z0-9` words separated by one space
   */
  const normalize = (value) =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  // the chapter names shown under each result [fr, en] 📚
  const CHAPTER_NAMES = {
    jour: ['Service du jour', 'Today'],
    hiver: ["Carte d'hiver", 'Winter menu'],
    dej: ['Déjeuner', 'Lunch'],
    diner: ['Dîner', 'Dinner'],
    dess: ['Desserts', 'Desserts'],
    cock: ['Cocktails', 'Cocktails'],
    cafe: ['Cafés & thés', 'Coffee & tea'],
    vins: ['Vins', 'Wines'],
    champ: ['Champagnes', 'Champagnes'],
    dig: ['Digestifs', 'Digestifs'],
    from: ['Fromages', 'Cheeses'],
    acc: ['Accords', 'Pairings'],
  };
  // words that count less in a label match (they're on half the wine list) 🔉
  const LOW_WEIGHT_WORDS = new Set(
    'blanc blancs rouge rose brut et or de la le cru grand reserve'.split(' '),
  );
  // words that never count (French & English filler, menu words) 🚫
  const STOP_WORDS = new Set(
    'les des une pour avec sans sur aux par the and from with cuvee vin vins domaine chateau maison verre bouteille cl aop igp dejeuner diner dinner glass bottle half demi provence formule semaine entree plat dessert menu'.split(
      ' ',
    ),
  );

  // ===== LOADING ⏳ ===== //

  // the MobileNet model, the Tesseract worker, the reference embeddings & the loading promise 🌱
  let model = null,
    ocr = null,
    refs = null,
    loading = null;

  /**
   * `loadScript` - Function 📜
   *
   * @param { string } src - a script URL
   * @returns { Promise<void> } - resolves when the script has loaded
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const scriptElement = document.createElement('script');
      scriptElement.src = src;
      scriptElement.onload = resolve;
      scriptElement.onerror = () => reject(Error('load ' + src));
      document.head.appendChild(scriptElement);
    });
  }

  /**
   * `precache` - Async Function 📦
   *
   * Puts every scan asset in the persistent `ltf-scan-v2` cache (skips the ones already there).
   *
   * @param { (progress: number) => void } [onProgress] - called with 0..1 after each file
   * @returns { Promise<void> }
   */
  async function precache(onProgress) {
    // the files done & the cache (when the browser has one)
    let doneCount = 0;
    const cache = window.caches ? await caches.open('ltf-scan-v2') : null;
    for (const asset of ASSETS) {
      const url = BASE + asset;
      // not cached yet? fetch & store it (errors are ignored: we'll try again next time) 🔁
      try {
        if (cache && !(await cache.match(url))) {
          const response = await fetch(url);
          if (response.ok) await cache.put(url, response.clone());
        }
      } catch (error) {}
      doneCount++;
      onProgress && onProgress(doneCount / ASSETS.length);
    }
  }

  /**
   * `decodeEmbedding` - Function 🔢
   *
   * Decodes a base64 int8 embedding into a unit-length Float32Array.
   *
   * @param { string } base64 - the base64 int8 vector
   * @returns { Float32Array } - the normalized vector
   */
  function decodeEmbedding(base64) {
    const bytes = atob(base64);
    const vector = new Float32Array(bytes.length);
    let norm = 0;
    for (let index = 0; index < bytes.length; index++) {
      let byteValue = bytes.charCodeAt(index);
      if (byteValue > 127) byteValue -= 256;
      vector[index] = byteValue;
      norm += byteValue * byteValue;
    }
    norm = Math.sqrt(norm) || 1;
    for (let index = 0; index < vector.length; index++) vector[index] /= norm;
    return vector;
  }

  /**
   * `loadEngines` - Async Function 🚀
   *
   * Loads everything once (precache, reference embeddings, TensorFlow.js + MobileNet, Tesseract).
   * A failed load can be retried.
   *
   * @param { (progress: number) => void } [onProgress] - called with 0..1
   * @returns { Promise<void> }
   */
  async function loadEngines(onProgress) {
    // already loading (or loaded)? share the same promise
    if (loading) return loading;
    loading = (async () => {
      // 📦 precache = the first 60% of the bar
      await precache((fraction) => onProgress && onProgress(fraction * 0.6));
      // the reference embeddings [{ k: ikey, i: photo, e: base64 int8 }]
      const embeddingsJson = await (await fetch(BASE + 'emb.json')).json();
      refs = embeddingsJson.map((ref) => ({ k: ref.k, img: ref.i, v: decodeEmbedding(ref.e) }));
      // 🧠 TensorFlow.js + MobileNet (WebGL when possible, else CPU)
      if (!window.tf) await loadScript(BASE + 'vendor/tensorflow/tf.js');
      if (!window.mobilenet) await loadScript(BASE + 'vendor/tensorflow/mobilenet.js');
      try {
        await tf.setBackend('webgl');
      } catch (error) {
        await tf.setBackend('cpu');
      }
      model = await mobilenet.load({
        version: 2,
        alpha: 1,
        modelUrl: new URL(BASE + 'model/model.json', location.href).href,
      });
      onProgress && onProgress(0.85);
      // 🏷️ Tesseract (French); optional: the scan still works without OCR
      if (!window.Tesseract) await loadScript(BASE + 'vendor/tesseract/tesseract.min.js');
      try {
        ocr = await Tesseract.createWorker('fra', 1, {
          workerPath: new URL(BASE + 'vendor/tesseract/worker.min.js', location.href).href,
          corePath: new URL(BASE + 'vendor/tesseract/core', location.href).href,
          langPath: new URL(BASE + 'lang', location.href).href,
          gzip: true,
          workerBlobURL: false,
        });
      } catch (error) {
        ocr = null;
      }
      onProgress && onProgress(1);
    })();
    // failed? allow a retry 🔁
    loading.catch(() => {
      loading = null;
    });
    return loading;
  }

  // ===== CATALOGUE 📚 ===== //

  /**
   * `buildCatalog` - Function 📚
   *
   * Groups the app's items by photo key (one group per dish / wine, all its formats together)
   * and computes the words + IDF weights used by the label match.
   *
   * @returns { Array<object> } - the groups { k, item, list, name, sub, words, nameW, idf }
   */
  function buildCatalog() {
    // every real menu item (no facts, no table plan, no daily briefing)
    const items = (window.LTFitems ? LTFitems() : []).filter(
      (item) => !item.fact && item.info && item.ch !== 'plan' && item.ch !== 'jour',
    );
    // grouped by photo key (or id)
    const byKey = {};
    items.forEach((item) => {
      const key = item.ikey || item.id;
      (byKey[key] = byKey[key] || []).push(item);
    });
    const groups = Object.entries(byKey).map(([key, list]) => {
      // the first item of the group
      const item = list[0];
      // the name inside the key ("w:Producer|colour@appellation" -> "Producer")
      const keyName = /^[a-z]:/.test(key) ? key.slice(2).split('|')[0].split('@')[0] : '';
      // the card front (plain text)
      const front = stripTags(item.front);
      // the display name: the key name when the front doesn't already say it
      const name =
        keyName && normalize(keyName) !== normalize(front) && !normalize(front).includes(normalize(keyName))
          ? keyName
          : front;
      // the subtitle: the back, or the front when the name came from the key
      const subtitle = name === front ? stripTags(item.back) : front;
      // the name words (>= 2 letters) + the description words (>= 3 letters), no stop words / small numbers
      const nameWords = normalize(name)
        .split(' ')
        .filter((word) => word.length >= 2 && !STOP_WORDS.has(word) && !/^\d{1,3}$/.test(word));
      const words = nameWords.concat(
        normalize(subtitle + ' ' + stripTags(item.back))
          .split(' ')
          .filter((word) => word.length >= 3 && !STOP_WORDS.has(word) && !/^\d{1,3}$/.test(word)),
      );
      return {
        k: key,
        item: item,
        list,
        name,
        sub: subtitle.slice(0, 90),
        words: [...new Set(words)],
        nameW: new Set(normalize(name).split(' ')),
      };
    });
    // the document frequency of each word 📊
    const documentFrequency = {};
    groups.forEach((group) =>
      group.words.forEach((word) => (documentFrequency[word] = (documentFrequency[word] || 0) + 1)),
    );
    // IDF weight per word: x1.5 for name words, x0.4 for low-weight words ⚖️
    groups.forEach(
      (group) =>
        (group.idf = Object.fromEntries(
          group.words.map((word) => [
            word,
            Math.log(1 + groups.length / documentFrequency[word]) *
              (group.nameW.has(word) ? 1.5 : 1) *
              (LOW_WEIGHT_WORDS.has(word) ? 0.4 : 1),
          ]),
        )),
    );
    return groups;
  }

  /**
   * `levenshtein` - Function 🔤
   *
   * The edit distance of two words (returns 9 right away when the lengths differ by more than 2).
   *
   * @param { string } source - a word
   * @param { string } target - another word
   * @returns { number } - the distance
   */
  function levenshtein(source, target) {
    if (Math.abs(source.length - target.length) > 2) return 9;
    const distances = [];
    for (let row = 0; row <= source.length; row++) {
      distances[row] = [row];
    }
    for (let column = 1; column <= target.length; column++) distances[0][column] = column;
    for (let row = 1; row <= source.length; row++)
      for (let column = 1; column <= target.length; column++)
        distances[row][column] = Math.min(
          distances[row - 1][column] + 1,
          distances[row][column - 1] + 1,
          distances[row - 1][column - 1] + (source[row - 1] === target[column - 1] ? 0 : 1),
        );
    return distances[source.length][target.length];
  }

  /**
   * `textScores` - Function 🏷️
   *
   * Scores every group against the OCR text (fuzzy word match, x1.3 when 2+ words match).
   *
   * @param { Array<object> } groups - the catalog
   * @param { string } text - the text read on the label
   * @returns { Object<string, number> } - score by group key (only the groups that matched)
   */
  function textScores(groups, text) {
    // the distinct OCR tokens (>= 2 letters)
    const tokens = [
      ...new Set(
        normalize(text)
          .split(' ')
          .filter((word) => word.length >= 2),
      ),
    ];
    if (!tokens.length) return {};
    // a word is "there" when it's a token, or close to one (1 typo, 2 for long words) 🔍
    const hasWord = (word) =>
      tokens.includes(word) ||
      (word.length >= 5 &&
        tokens.some((token) => token.length >= 4 && levenshtein(token, word) <= (word.length >= 8 ? 2 : 1)));
    // sum the weights of the matched words
    const scores = {};
    groups.forEach((group) => {
      let sum = 0,
        matched = 0;
      group.words.forEach((word) => {
        if (hasWord(word)) {
          sum += group.idf[word];
          matched++;
        }
      });
      if (matched) scores[group.k] = sum * (matched >= 2 ? 1.3 : 1);
    });
    return scores;
  }

  // ===== USER PHOTOS & LEARNED SCANS 🧠 ===== //

  // the localStorage key of the learned scans { ikey: [base64 int8 embedding, ...max 3] } 🏷️
  const LEARN_KEY = 'ltf_scan_learn';

  /**
   * `readLearned` - Function 🧠
   *
   * @returns { Object<string, string[]> } - the learned embeddings by item key
   */
  function readLearned() {
    try {
      return JSON.parse(localStorage.getItem(LEARN_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  /**
   * `encodeEmbedding` - Function 🔢
   *
   * @param { Float32Array } vector - a unit embedding
   * @returns { string } - the base64 int8 version (x4, clamped)
   */
  function encodeEmbedding(vector) {
    let bytes = '';
    for (const component of vector) {
      let quantized = Math.round(Math.max(-1, Math.min(1, component * 4)) * 127);
      if (quantized < 0) quantized += 256;
      bytes += String.fromCharCode(quantized);
    }
    return btoa(bytes);
  }

  /**
   * `remember` - Function ✅
   *
   * Remembers the embedding of a scan the waiter confirmed (keeps the 3 newest per item).
   *
   * @param { string } key - the item key
   * @param { Float32Array } vector - the scan embedding
   * @returns { void }
   */
  function remember(key, vector) {
    const learned = readLearned();
    const list = (learned[key] = learned[key] || []);
    list.unshift(encodeEmbedding(vector));
    learned[key] = list.slice(0, 3);
    try {
      localStorage.setItem(LEARN_KEY, JSON.stringify(learned));
    } catch (error) {}
  }

  // the embeddings of the waiter's own photos, cached by "key:length" 🗂️
  const userEmbeddings = {};

  /**
   * `readIdbPhotos` - Function 🗃️
   *
   * Reads the waiter's own photos from IndexedDB (`ltf_photos` / store `p`, key = ikey).
   *
   * @returns { Promise<Object<string, string>> } - photo data URL by item key ({} on any error)
   */
  function readIdbPhotos() {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('ltf_photos', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('p');
        request.onsuccess = () => {
          const out = {};
          try {
            const store = request.result.transaction('p').objectStore('p');
            const cursorRequest = store.openCursor();
            cursorRequest.onsuccess = () => {
              const cursor = cursorRequest.result;
              if (cursor) {
                out[cursor.key] = cursor.value;
                cursor.continue();
              } else resolve(out);
            };
            cursorRequest.onerror = () => resolve(out);
          } catch (error) {
            resolve(out);
          }
        };
        request.onerror = () => resolve({});
      } catch (error) {
        resolve({});
      }
    });
  }

  /**
   * `loadImage` - Function 🖼️
   *
   * @param { string } src - an image URL
   * @returns { Promise<HTMLImageElement> } - the loaded image
   */
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  /**
   * `embed` - Async Function 🧠
   *
   * @param { HTMLCanvasElement | HTMLImageElement } src - the picture
   * @returns { Promise<Float32Array> } - its unit-length MobileNet embedding
   */
  async function embed(src) {
    const tensor = tf.tidy(() => {
      const features = model.infer(src, true);
      return features.div(features.norm());
    });
    const values = await tensor.data();
    tensor.dispose();
    return Float32Array.from(values);
  }

  /**
   * `userRefs` - Async Function 📸
   *
   * The extra references: the waiter's own photos + the scans they confirmed.
   *
   * @returns { Promise<Array<{ k: string, v: Float32Array, own: true }>> }
   */
  async function userRefs() {
    const photos = await readIdbPhotos();
    const out = [];
    // 📸 every own photo (embedded once, then cached)
    for (const [key, url] of Object.entries(photos)) {
      if (!url) continue;
      const signature = key + ':' + url.length;
      if (!userEmbeddings[signature]) {
        try {
          userEmbeddings[signature] = await embed(await loadImage(url));
        } catch (error) {
          continue;
        }
      }
      out.push({ k: key, v: userEmbeddings[signature], own: true });
    }
    // ✅ every learned scan
    Object.entries(readLearned()).forEach(([key, list]) =>
      list.forEach((encoded) => out.push({ k: key, v: decodeEmbedding(encoded), own: true })),
    );
    return out;
  }

  /**
   * `dot` - Function ✖️
   *
   * @param { Float32Array } vectorA - a vector
   * @param { Float32Array } vectorB - another vector (same length)
   * @returns { number } - their dot product (= cosine similarity for unit vectors)
   */
  const dot = (vectorA, vectorB) => {
    let sum = 0;
    for (let index = 0; index < vectorA.length; index++) sum += vectorA[index] * vectorB[index];
    return sum;
  };

  // ===== ANALYSIS 🔬 ===== //

  /**
   * `analyse` - Async Function 🔬
   *
   * Matches a photo against every reference (best cosine per item) and the label text,
   * then ranks the items and estimates the confidence.
   *
   * @param { HTMLCanvasElement } canvas - the photo
   * @param { (message: string) => void } status - shows a progress message
   * @returns { Promise<{ v: Float32Array, text: string, res: Array<object>, conf: number, imax: number }> }
   */
  async function analyse(canvas, status) {
    // the catalog & a key -> group map
    const groups = buildCatalog();
    const groupByKey = Object.fromEntries(groups.map((group) => [group.k, group]));
    status(translate('Analyse de la photo…', 'Analysing the photo…'));
    // the photo embedding 🧠
    const vector = await embed(canvas);
    // the references: shipped + own photos + learned scans
    const allRefs = refs.concat(await userRefs());
    // the best image similarity per item 🖼️
    const imageScores = {};
    allRefs.forEach((ref) => {
      if (!groupByKey[ref.k]) return;
      const similarity = dot(vector, ref.v);
      if (!(imageScores[ref.k] >= similarity)) imageScores[ref.k] = similarity;
    });
    // the label text (when OCR is available) 🏷️
    let text = '';
    if (ocr) {
      status(translate("Lecture de l'étiquette…", 'Reading the label…'));
      try {
        const result = await ocr.recognize(canvas);
        text = (result.data && result.data.text) || '';
      } catch (error) {}
    }
    // the label scores & the best one
    const labelScores = textScores(groups, text);
    const labelMax = Math.max(0, ...Object.values(labelScores));
    // the best image score
    const imageValues = Object.values(imageScores).sort(
      (firstScore, secondScore) => secondScore - firstScore,
    );
    const imageMax = imageValues[0] || 0;
    // final score = image + a bonus for the label (an extra +0.3 when the label clearly wins) ⚖️
    const ranked = groups
      .map((group) => {
        const imageScore = imageScores[group.k] || 0,
          labelScore = labelScores[group.k] || 0;
        const labelNormalized = labelMax ? labelScore / labelMax : 0;
        const strongLabel = labelScore >= 4 && labelNormalized === 1;
        return {
          g: group,
          i: imageScore,
          t: labelScore,
          score: imageScore + 0.35 * labelNormalized * Math.min(1, labelScore / 3) + (strongLabel ? 0.3 : 0),
        };
      })
      .sort((firstRanked, secondRanked) => secondRanked.score - firstRanked.score);
    // the confidence of the top result (0.25 -> 0, 0.75 -> 1)
    const top = ranked[0];
    const confidence = top ? Math.max(0, Math.min(1, (top.score - 0.25) / 0.5)) : 0;
    return { v: vector, text, res: ranked.slice(0, 4), conf: confidence, imax: imageMax };
  }

  // ===== UI 🎨 ===== //

  // the camera stream, the overlay & the last scan embedding (for "remember") 🎥
  let stream = null,
    overlay = null,
    lastVector = null;

  /**
   * `stopCamera` - Function 🛑
   *
   * @returns { void }
   */
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
  }

  /**
   * `closeScanner` - Function 👋
   *
   * @returns { void }
   */
  function closeScanner() {
    stopCamera();
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  /**
   * `grabFrame` - Function 🖼️
   *
   * @param { CanvasImageSource } src - the video or image
   * @param { number } width - its width
   * @param { number } height - its height
   * @returns { HTMLCanvasElement } - a copy, max 1024 px on the long side
   */
  function grabFrame(src, width, height) {
    const longSide = Math.max(width, height),
      scale = Math.min(1, 1024 / longSide);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  /**
   * `setBody` - Function 🧩
   *
   * @param { string } html - the new content of the scanner body
   * @returns { void }
   */
  function setBody(html) {
    if (overlay) overlay.querySelector('.scb').innerHTML = html;
  }

  /**
   * `openScanner` - Async Function 📷
   *
   * Opens the scanner overlay, starts the camera and loads the engines in the background.
   *
   * @returns { Promise<void> }
   */
  async function openScanner() {
    closeScanner();
    // the overlay: header + body
    overlay = document.createElement('div');
    overlay.className = 'ov scanov';
    overlay.id = 'scanOv';
    overlay.innerHTML = `<div class="sch"><b>📷 ${translate('Scanner', 'Scan')}</b><button class="btn txt" id="scX">✕ ${translate('Fermer', 'Close')}</button></div><div class="scb"></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#scX').onclick = closeScanner;
    // 👂 the overlay was removed by someone else (navigation)? stop the camera 🧹
    new MutationObserver((mutations, observer) => {
      if (!document.body.contains(overlay || document.createElement('i'))) {
        stopCamera();
        observer.disconnect();
      }
    }).observe(document.body, { childList: true });
    // 🎥 the camera
    showCamera();
    // ⏳ load in the background and show the progress
    loadEngines((fraction) => {
      const bar = queryOne('#scPrep');
      if (bar) bar.style.width = Math.round(fraction * 100) + '%';
      const label = queryOne('#scPrepT');
      if (label)
        label.textContent =
          fraction < 1
            ? translate('Préparation hors-ligne… ', 'Getting ready for offline… ') +
              Math.round(fraction * 100) +
              '%'
            : translate('Prêt, fonctionne hors-ligne ✓', 'Ready, works offline ✓');
    }).catch(() => {
      const label = queryOne('#scPrepT');
      if (label)
        label.textContent = translate(
          'Connexion nécessaire pour la première utilisation.',
          'A connection is needed the first time.',
        );
    });
  }

  /**
   * `showCamera` - Async Function 🎥
   *
   * Shows the live camera with the shutter & gallery buttons (falls back to the gallery / camera app).
   *
   * @returns { Promise<void> }
   */
  async function showCamera() {
    setBody(
      `<div class="scv"><video id="scVid" playsinline muted autoplay></video><div class="scframe"></div>` +
        `</div>
  <div class="scprep"><div class="scbar"><div id="scPrep"></div></div>` +
        `<div class="muted sm" id="scPrepT">${loading ? '' : translate('Préparation…', 'Preparing…')}` +
        `</div></div>
  <div class="scbtns"><label class="btn sec" for="scFile">🖼 ` +
        `${translate('Galerie', 'Gallery')}` +
        `</label><input id="scFile" type="file" accept="image/*" hidden>` +
        `<button class="scshot" id="scShot" aria-label="scan"></button><span style="width:90px"></span>` +
        `</div>
  <p class="muted sm" style="text-align:center">` +
        `${translate("Cadrez l'assiette, l'étiquette ou la bouteille.", 'Frame the plate, the label or the bottle.')}` +
        `</p>`,
    );
    // already loaded? say so ✅
    if (model) {
      const label = queryOne('#scPrepT');
      if (label) label.textContent = translate('Prêt, fonctionne hors-ligne ✓', 'Ready, works offline ✓');
      const bar = queryOne('#scPrep');
      if (bar) bar.style.width = '100%';
    }
    const video = queryOne('#scVid');
    // the back camera (up to 1280 px)
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      video.srcObject = stream;
    } catch (error) {
      // no camera (permission, desktop...): the file input opens the camera app instead 📱
      const viewport = overlay && overlay.querySelector('.scv');
      if (viewport)
        viewport.innerHTML =
          `<div class="scnocam">` +
          `${translate("Caméra indisponible : utilisez la galerie ou l'appareil photo.", 'Camera unavailable: use the gallery or the camera app.')}` +
          `</div>`;
      const fileInput = queryOne('#scFile');
      if (fileInput) fileInput.setAttribute('capture', 'environment');
    }
    // 📸 shutter: grab the frame (or open the picker when there's no video)
    queryOne('#scShot').onclick = () => {
      if (!stream || !video.videoWidth) {
        queryOne('#scFile').click();
        return;
      }
      const canvas = grabFrame(video, video.videoWidth, video.videoHeight);
      stopCamera();
      runScan(canvas);
    };
    // 🖼 a photo from the gallery
    queryOne('#scFile').onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      try {
        const image = await loadImage(url);
        stopCamera();
        runScan(grabFrame(image, image.naturalWidth, image.naturalHeight));
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    };
  }

  /**
   * `runScan` - Async Function 🔬
   *
   * Shows the photo, waits for the engines, analyses it and shows the results.
   *
   * @param { HTMLCanvasElement } canvas - the photo
   * @returns { Promise<void> }
   */
  async function runScan(canvas) {
    // the photo as a JPEG (shown on top of the results)
    const shot = canvas.toDataURL('image/jpeg', 0.7);
    setBody(
      `<img class="scshotimg" src="${shot}" alt=""><div class="card sm"><div class="b" id="scSt">` +
        `${translate('Préparation…', 'Preparing…')}` +
        `</div><div class="scbar"><div id="scPrep" style="width:5%"></div></div></div>`,
    );
    // the status line
    const setStatus = (message) => {
      const statusElement = queryOne('#scSt');
      if (statusElement) statusElement.textContent = message;
    };
    // ⏳ wait for the engines (❌ first use offline: offer a retry)
    try {
      await loadEngines((fraction) => {
        const bar = queryOne('#scPrep');
        if (bar) bar.style.width = Math.round(fraction * 100) + '%';
        setStatus(
          translate('Préparation hors-ligne… ', 'Getting ready for offline… ') +
            Math.round(fraction * 100) +
            '%',
        );
      });
    } catch (error) {
      setBody(
        `<img class="scshotimg" src="${shot}" alt=""><div class="card sm">` +
          `${translate('Le scanner doit être téléchargé une première fois avec une connexion.', 'The scanner needs a connection once to download.')}` +
          `</div><div class="scbtns"><button class="btn grow" id="scAgain">` +
          `${translate('Réessayer', 'Try again')}</button></div>`,
      );
      queryOne('#scAgain').onclick = showCamera;
      return;
    }
    // 🔬 analyse & show
    const result = await analyse(canvas, setStatus);
    lastVector = result.v;
    showResults(shot, result);
  }

  /**
   * `showResults` - Function 🏆
   *
   * Shows the best match ("Most likely" / "Maybe"), the other matches, the text read,
   * "Scan again" & "Search online". Tapping a result remembers it and opens its ⓘ sheet.
   *
   * @param { string } shot - the photo data URL
   * @param { object } result - the analysis result
   * @returns { void }
   */
  function showResults(shot, result) {
    // the top result & whether we're sure (confidence >= 0.55)
    const top = result.res[0];
    const sure = result.conf >= 0.55;
    // one result card (photo, name, chapter, formats, subtitle)
    const resultCard = (match, big) => {
      const group = match.g,
        item = group.item,
        photo = (refs.find((ref) => ref.k === group.k) || {}).img;
      const formats =
        group.list.length > 1 ? ' · ' + group.list.length + ' ' + translate('formats', 'formats') : '';
      return (
        `<div class="card sm row scres${big ? ' big' : ''}" data-k="${escapeHtml(group.k)}" data-id="` +
        `${escapeHtml(item.id)}">` +
        `${photo ? `<img class="thumb" src="${escapeHtml(photo)}" alt="">` : `<div class="av">🍽</div>`}` +
        `<div class="tx"><div class="n">${escapeHtml(group.name)}</div><div class="muted sm">` +
        `${escapeHtml((CHAPTER_NAMES[item.ch] || [item.ch, item.ch])[isEnglish() ? 1 : 0])}${formats}` +
        `${group.sub ? ' · ' + escapeHtml(group.sub.slice(0, 60)) : ''}` +
        `</div></div><div class="rt gold">›</div></div>`
      );
    };
    // online? offer a Google search 🌐
    const online = navigator.onLine;
    // the search query: the label words, else the top name
    const searchQuery =
      (result.text &&
        normalize(result.text)
          .split(' ')
          .filter((word) => word.length >= 4)
          .slice(0, 8)
          .join(' ')) ||
      (top ? top.g.name : '');
    setBody(`<img class="scshotimg" src="${shot}" alt="">
  <div class="sh">${sure ? translate("C'est sûrement", 'Most likely') : translate('Peut-être', 'Maybe')}</div>${top ? resultCard(top, true) : ''}
  ${
    result.res.length > 1
      ? `<div class="sh">${translate('Autres possibilités', 'Other matches')}</div>` +
        result.res
          .slice(1)
          .map((match) => resultCard(match))
          .join('')
      : ''
  }
  ${result.text && result.text.trim() ? `<details class="muted sm scocr"><summary>${translate('Texte lu', 'Text read')}</summary>${escapeHtml(result.text.trim().slice(0, 300))}</details>` : ''}
  <div class="scbtns"><button class="btn sec" id="scAgain">↺ ${translate('Rescanner', 'Scan again')}</button>${
    online
      ? `<a class="btn sec" target="_blank" rel="noopener" href="https://www.google.com/search?q=` +
        `${encodeURIComponent(searchQuery)}">🌐 ${translate('Chercher en ligne', 'Search online')}</a>`
      : ''
  }</div>
  <p class="muted sm" style="text-align:center">${translate("Touchez le bon résultat : le scanner s'en souviendra.", 'Tap the right match: the scanner will remember it.')}</p>`);
    // ↺ scan again
    queryOne('#scAgain').onclick = showCamera;
    // ✅ a result: remember it, close & open its ⓘ sheet
    overlay.querySelectorAll('.scres').forEach(
      (resultButton) =>
        (resultButton.onclick = () => {
          if (lastVector) remember(resultButton.dataset.k, lastVector);
          const id = resultButton.dataset.id;
          closeScanner();
          if (window.LTFinfo) LTFinfo(id);
        }),
    );
  }

  // ===== FLOATING BUTTON (HOME ONLY) 🔘 ===== //

  /**
   * `updateFab` - Function 🔘
   *
   * Creates the scan button once and shows it on the home screen only (moved up when the
   * "Installer l'app" button is visible).
   *
   * @returns { void }
   */
  function updateFab() {
    // the button (created on first call) 🌱
    let fabButton = document.getElementById('scanFab');
    if (!fabButton) {
      fabButton = document.createElement('button');
      fabButton.id = 'scanFab';
      fabButton.className = 'scanfab';
      fabButton.setAttribute('aria-label', 'Scanner');
      fabButton.innerHTML =
        '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>' +
        '<circle cx="12" cy="12" r="3.5"/></svg>';
      fabButton.onclick = openScanner;
      document.body.appendChild(fabButton);
    }
    // 🏠 the home screen is the one with the hero
    const app = document.getElementById('app');
    const home = !!(app && app.querySelector('.hero'));
    fabButton.style.display = home && !overlay ? 'flex' : 'none';
    // ⬆️ make room for the install button
    const installButton = document.getElementById('inst');
    fabButton.classList.toggle('up', !!(installButton && installButton.style.display === 'block'));
  }

  // 👂 follow every screen change
  new MutationObserver(updateFab).observe(document.documentElement, { childList: true, subtree: true });
  // 🌍 the public API (+ the matchers, for the tests)
  window.LTFscan = openScanner;
  window.LTFscanT = { catalog: buildCatalog, textScores };
})();
