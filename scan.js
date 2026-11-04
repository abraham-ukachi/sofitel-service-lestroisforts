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
// 🖼️ Image match: SigLIP 2 vision encoder (Google, base patch16 224, 4-bit ONNX, ~63 MB) run by ONNX Runtime Web,
//    embeddings vs the reference photos (scan/emb.json) + the waiter's own photos. Since 0.72.0 (MobileNet v2 before).
// 🎯 Live mode: while the camera is open, the frame is matched about once a second and the best guess shows on screen.
// 🏷️ Label match: Tesseract OCR (French) fuzzy-matched against the app's own item names.
// 📴 Everything lives under scan/ and is cached by the service worker in a persistent cache (works offline after the first use).
(function () {
  // ===== CONSTANTS & HELPERS 🧰 ===== //

  // the folder of every scan asset 📁
  const BASE = 'scan/';
  // the files to precache for offline use (scripts, model, reference embeddings, OCR engine & French data) 📦
  const ASSETS = [
    'vendor/onnxruntime/ort.webgpu.js',
    'vendor/onnxruntime/ort-wasm-simd-threaded.jsep.mjs',
    'vendor/onnxruntime/ort-wasm-simd-threaded.jsep.wasm',
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
    'le la de du et au en un il on ou ce sa se of in at to by le les des une pour avec sans sur aux par the and from with cuvee vin vins domaine chateau maison verre bouteille cl aop igp dejeuner diner dinner glass bottle half demi provence formule semaine entree plat dessert menu'.split(
      ' ',
    ),
  );

  // a read word counts from this Tesseract confidence (0-100) 🏷️
  const OCR_MIN_CONFIDENCE = 60;
  // the label may beat the photo by this much before the result stops being « sure » ⚖️
  const LABEL_OVERRIDE_GAP = 0.08;

  // ===== THE IMAGE MODEL 🧠 ===== //

  // the persistent scan cache (kept across app versions; bump it with sw.js when scan/ changes) 🗄️
  const SCAN_CACHE = 'ltf-scan-v5';
  // SigLIP 2 vision encoder, 4-bit, pinned to one Hugging Face revision (downloaded once, then offline) 📥
  const MODEL_URL =
    'https://huggingface.co/onnx-community/siglip2-base-patch16-224-ONNX/resolve/' +
    'ba1f3b0843f24bc5417d38e19c37b287d719b2f4/onnx/vision_model_q4.onnx';
  // its size in bytes (for the progress bar when the server doesn't say) 📏
  const MODEL_BYTES = 63267466;
  // the same model on our own domain, in 8 parts of 8 MB (mobile networks drop long downloads:
  // a small part is retried on its own, and no third-party host can be blocked) 🧩
  const MODEL_PARTS = Array.from({ length: 8 }, (unused, index) => 'models/siglip2-q4/part-' + index);
  // how many times one part is tried before giving up 🔁
  const PART_TRIES = 4;
  // everything the first download fetches, rounded (model 63 MB + engine 22 MB + label reader & photos 12 MB) 📦
  const DOWNLOAD_LABEL = '≈ 97 Mo';
  // the close button's cross (an SVG, so it sits exactly in the middle of its circle) ✕
  const CLOSE_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  // the gallery & torch buttons: plain white outline icons (no circle behind them) 🖼️🔦
  const GALLERY_ICON =
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/>' +
    '<circle cx="9" cy="10" r="1.6"/><path d="m4 17 4.6-4.6a1.5 1.5 0 0 1 2.1 0L16 17.6M14 15.5l1.8-1.8a1.5 1.5 0 0 1 2.1 0L20 15.8"/></svg>';
  const TORCH_ICON =
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h10v3.5l-2.5 4V20a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-9.5L7 6.5z"/>' +
    '<path d="M7 6.5h10M12 13.5v2"/></svg>';
  // the model's input: a 224 x 224 RGB picture 🖼️
  const INPUT_SIZE = 224;
  // the length of an embedding (refs or learned scans of another length come from the old model) 🔢
  const EMBEDDING_LENGTH = 768;
  // SigLIP has a few huge « always on » dimensions: clamping them lets the real details count ✂️
  // (synthetic test 2026-11-04: crop shots 90.6% -> 98.9% top-1)
  const OUTLIER_CLAMP = 0.25;

  // ===== LOADING ⏳ ===== //

  // the engine running the model ('webgpu' or 'wasm') ⚙️
  let engineName = '';
  // the SigLIP 2 session, the Tesseract worker, the reference embeddings & the loading promise 🌱
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
   * Puts every scan asset in the persistent `SCAN_CACHE` cache (skips the ones already there).
   *
   * @param { (progress: number) => void } [onProgress] - called with 0..1 after each file
   * @returns { Promise<void> }
   */
  async function precache(onProgress) {
    // the files done & the cache (when the browser has one)
    let doneCount = 0;
    const cache = window.caches ? await caches.open(SCAN_CACHE) : null;
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
   * `isDownloaded` - Async Function 🗄️
   *
   * @returns { Promise<boolean> } - true when the model & every scan asset are already in the scan cache
   */
  async function isDownloaded() {
    if (!window.caches) return false;
    try {
      const cache = await caches.open(SCAN_CACHE);
      if (!(await cache.match(MODEL_URL))) return false;
      for (const asset of ASSETS) if (!(await cache.match(BASE + asset))) return false;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * `escapeText` - Function 🧼
   *
   * @param { string } text - any text
   * @returns { string } - the text, safe inside HTML
   */
  function escapeText(text) {
    return String(text).replace(/[&<>"']/g, (character) => '&#' + character.charCodeAt(0) + ';');
  }

  /**
   * `describeError` - Function 🩺
   *
   * Says which step failed, in plain words, with the browser's own message (short) to help fix it.
   *
   * @param { any } error - the error thrown while loading
   * @returns { string } - « Étape : raison »
   */
  function describeError(error) {
    const message = String((error && (error.message || error)) || '').slice(0, 140);
    const step = (error && error.step) || 'load';
    const steps = {
      download: translate('Téléchargement du modèle', 'Model download'),
      storage: translate('Mémoire du téléphone', 'Phone storage'),
      engine: translate('Démarrage du moteur', 'Engine start'),
      load: translate('Chargement', 'Loading'),
    };
    return (steps[step] || steps.load) + ' : ' + message;
  }

  /**
   * `tagStep` - Function 🏷️
   *
   * @param { string } step - the loading step (download, engine…)
   * @returns { function(any): never } - rethrows the error, tagged with its step
   */
  function tagStep(step) {
    return (error) => {
      const tagged = error instanceof Error ? error : Error(String(error));
      if (!tagged.step) tagged.step = step;
      throw tagged;
    };
  }

  // the last download progress (0..1), so a reopened scanner shows where the download is ⏳
  let lastProgress = 0;

  /**
   * `paintPrep` - Function 🎨
   *
   * Shows the state of the AI scanner on the viewfinder pill: a download button the first time,
   * the progress while it downloads (or loads from the phone), « Prêt ✓ » for a moment, then nothing.
   *
   * @param { 'offer' | 'loading' | 'ready' | 'error' } state - what to show
   * @param { number | string } [detail] - the progress (0..1) while loading, the reason after an error
   * @returns { void }
   */
  function paintPrep(state, detail) {
    const fraction = typeof detail === 'number' ? detail : 0;
    const box = queryOne('#scPrepBox');
    if (!box) return;
    box.classList.remove('gone');
    if (state === 'offer' || state === 'error') {
      // ⬇️ the button (again after an error)
      box.innerHTML =
        `<button class="scdl" id="scDl">⬇️ ` +
        (state === 'error'
          ? translate('Réessayer le téléchargement', 'Retry the download')
          : `${translate('Télécharger le scanner IA', 'Download the AI scanner')} · ${DOWNLOAD_LABEL}`) +
        `</button>` +
        (state === 'error' ? `<div class="scerr">${escapeText(describeError(detail))}</div>` : '');
      box.classList.add('offer');
      queryOne('#scDl').onclick = () => startDownload();
      return;
    }
    box.classList.remove('offer');
    if (state === 'loading') {
      const percent = Math.round((fraction || 0) * 100);
      // the bar & the text (created once, then only updated)
      if (!queryOne('#scPrep'))
        box.innerHTML = `<div class="scbar"><div id="scPrep"></div></div><div id="scPrepT"></div>`;
      queryOne('#scPrep').style.width = percent + '%';
      queryOne('#scPrepT').textContent = downloading
        ? translate('Téléchargement… ', 'Downloading… ') + percent + '%'
        : translate('Chargement…', 'Loading…');
      return;
    }
    // ✅ ready: say it for a moment, then the pill goes away
    box.innerHTML = `<div id="scPrepT">${translate('Prêt, fonctionne hors-ligne ✓', 'Ready, works offline ✓')}</div>`;
    setTimeout(() => box.isConnected && box.classList.add('gone'), 1600);
  }

  // true while the first download runs (else loading means « from the phone ») 📥
  let downloading = false;

  /**
   * `startDownload` - Function ⬇️
   *
   * Downloads (or loads) the engines, showing the progress on the viewfinder, then starts the live mode.
   *
   * @returns { Promise<void> }
   */
  function startDownload() {
    if (!loading) downloading = true;
    paintPrep('loading', lastProgress);
    return loadEngines()
      .then(() => {
        downloading = false;
        paintPrep('ready');
        const video = queryOne('#scVid');
        if (stream && video && overlay && overlay.classList.contains('sclive')) startLive(video);
      })
      .catch((error) => {
        downloading = false;
        console.error('[scan]', error);
        paintPrep('error', error);
      });
  }

  /**
   * `prepareEngines` - Async Function 🚦
   *
   * On the viewfinder: nothing when the model is in memory, a silent load when it's already on the
   * phone, the progress when a download is running, else the download button.
   *
   * @returns { Promise<void> }
   */
  async function prepareEngines() {
    if (model) {
      const video = queryOne('#scVid');
      if (stream && video) startLive(video);
      return;
    }
    if (loading || (await isDownloaded())) {
      startDownload();
      return;
    }
    paintPrep('offer');
  }

  /**
   * `readModel` - Async Function 📥
   *
   * The SigLIP 2 model bytes: from the scan cache, else downloaded (with progress) and cached.
   *
   * @param { (progress: number) => void } [onProgress] - called with 0..1 while downloading
   * @returns { Promise<Uint8Array> } - the ONNX file
   */
  async function readModel(onProgress) {
    const cache = window.caches ? await caches.open(SCAN_CACHE) : null;
    // ✅ already here (works offline)
    const cached = cache && (await cache.match(MODEL_URL));
    if (cached) return new Uint8Array(await cached.arrayBuffer());
    // 🌐 our own parts first, then Hugging Face if our host fails
    let bytes;
    try {
      bytes = await downloadParts(onProgress);
    } catch (partsError) {
      console.warn('[scan] parts failed, trying Hugging Face', partsError);
      bytes = await downloadWhole(MODEL_URL, onProgress).catch(() => {
        throw partsError;
      });
    }
    if (bytes.length !== MODEL_BYTES) throw Error('incomplete (' + bytes.length + ' bytes)');
    // 🗄️ keep it for next time (a full phone just downloads it again next time)
    try {
      if (cache)
        await cache.put(
          MODEL_URL,
          new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } }),
        );
    } catch (error) {
      console.warn('[scan] model not stored', error);
    }
    return bytes;
  }

  /**
   * `downloadParts` - Async Function 🧩
   *
   * Downloads the model's parts one by one from our domain, retrying each part on its own.
   *
   * @param { function(number): void } [onProgress] - called with 0..1
   * @returns { Promise<Uint8Array> } - the whole model
   */
  async function downloadParts(onProgress) {
    const bytes = new Uint8Array(MODEL_BYTES);
    let offset = 0;
    for (const part of MODEL_PARTS) {
      let partBytes = null,
        lastError = null;
      for (let attempt = 0; attempt < PART_TRIES && !partBytes; attempt++) {
        try {
          // a short pause before each retry (1 s, 2 s, 4 s) ⏸️
          if (attempt) await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
          const response = await fetch(part, { cache: 'no-store' });
          if (!response.ok) throw Error('HTTP ' + response.status);
          partBytes = new Uint8Array(await response.arrayBuffer());
        } catch (error) {
          lastError = error;
        }
      }
      if (!partBytes) throw lastError || Error('part failed');
      if (offset + partBytes.length > MODEL_BYTES) throw Error('part too big');
      bytes.set(partBytes, offset);
      offset += partBytes.length;
      onProgress && onProgress(offset / MODEL_BYTES);
    }
    return offset === MODEL_BYTES ? bytes : bytes.subarray(0, offset);
  }

  /**
   * `downloadWhole` - Async Function 📥
   *
   * Downloads one big file chunk by chunk, to show the progress.
   *
   * @param { string } url - the file
   * @param { function(number): void } [onProgress] - called with 0..1
   * @returns { Promise<Uint8Array> } - the file
   */
  async function downloadWhole(url, onProgress) {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok || !response.body) throw Error('HTTP ' + response.status);
    const total = +response.headers.get('content-length') || MODEL_BYTES;
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onProgress && onProgress(Math.min(1, received / total));
    }
    // glue the chunks together
    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return bytes;
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
   * Loads everything once (precache, reference embeddings, ONNX Runtime + SigLIP 2, Tesseract).
   * A failed load can be retried.
   *
   * @param { (progress: number) => void } [onProgress] - called with 0..1
   * @returns { Promise<void> }
   */
  async function loadEngines(onProgressOption) {
    // every progress also goes to the viewfinder pill 🎨
    const onProgress = (fraction) => {
      lastProgress = fraction;
      if (onProgressOption) onProgressOption(fraction);
      if (fraction < 1) paintPrep('loading', fraction);
    };
    // already loading (or loaded)? share the same promise
    if (loading) return loading;
    loading = (async () => {
      // 📦 precache (engine, reference embeddings, OCR) = the first 15% of the bar
      await precache((fraction) => onProgress && onProgress(fraction * 0.15));
      // the reference embeddings [{ k: ikey, i: photo, e: base64 int8 }]
      const embeddingsJson = await (await fetch(BASE + 'emb.json')).json();
      refs = embeddingsJson
        .map((ref) => ({ k: ref.k, img: ref.i, v: decodeEmbedding(ref.e) }))
        .filter((ref) => ref.v.length === EMBEDDING_LENGTH);
      // 📥 the SigLIP 2 model = up to 85% of the bar
      const modelBytes = await readModel((fraction) => onProgress && onProgress(0.15 + fraction * 0.7)).catch(
        tagStep('download'),
      );
      // 🧠 ONNX Runtime Web: the phone's GPU (WebGPU, fast enough for live) when it has one,
      // else WebAssembly on one thread (the app isn't cross-origin isolated): a few seconds per frame
      if (!window.ort) await loadScript(BASE + 'vendor/onnxruntime/ort.webgpu.js').catch(tagStep('engine'));
      ort.env.wasm.wasmPaths = new URL(BASE + 'vendor/onnxruntime/', location.href).href;
      ort.env.wasm.numThreads = 1;
      model = null;
      if (navigator.gpu) {
        try {
          model = await ort.InferenceSession.create(modelBytes, {
            executionProviders: ['webgpu'],
            graphOptimizationLevel: 'all',
          });
          engineName = 'webgpu';
        } catch (error) {
          model = null;
        }
      }
      if (!model) {
        model = await ort.InferenceSession.create(modelBytes, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        }).catch(tagStep('engine'));
        engineName = 'wasm';
      }
      onProgress && onProgress(0.9);
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
    // the distinct OCR tokens (>= 3 letters, no stop words)
    const tokens = [
      ...new Set(
        normalize(text)
          .split(' ')
          .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)),
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
        matched = 0,
        longest = 0;
      group.words.forEach((word) => {
        if (hasWord(word)) {
          sum += group.idf[word];
          matched++;
          longest = Math.max(longest, word.length);
        }
      });
      // one short word alone is too weak to count (« brut », « rose »…): 2 words, or one of 6+ letters
      if (matched >= 2 || (matched === 1 && longest >= 6)) scores[group.k] = sum * (matched >= 2 ? 1.3 : 1);
    });
    return scores;
  }

  // ===== USER PHOTOS & LEARNED SCANS 🧠 ===== //

  // the localStorage key of the learned scans { ikey: [base64 int8 embedding, ...max 3] } 🏷️
  // (a new key since SigLIP 2: the MobileNet scans of `ltf_scan_learn` don't fit the new model)
  const LEARN_KEY = 'ltf_scan_learn_sg2';

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

  // the 224 x 224 canvas the pictures are squeezed into (reused) 🖼️
  let inputCanvas = null;

  /**
   * `embed` - Async Function 🧠
   *
   * Squeezes the picture to 224 x 224 (SigLIP resizes, it doesn't crop), turns it into
   * channel-first floats in -1..1 and runs the SigLIP 2 vision encoder.
   *
   * @param { HTMLCanvasElement | HTMLImageElement | HTMLVideoElement } src - the picture
   * @param { Array<number> } [area] - the part to use [x, y, width, height] (default: all of it)
   * @returns { Promise<Float32Array> } - its unit-length SigLIP 2 embedding (768 numbers)
   */
  function embed(src, area) {
    // 🚦 one picture at a time (the live mode & the shutter share the model & the canvas)
    const run = embedQueue.then(() => embedNow(src, area));
    embedQueue = run.catch(() => {});
    return run;
  }

  // the last embedding in progress (the queue) 🚦
  let embedQueue = Promise.resolve();

  /**
   * `embedNow` - Async Function 🧠
   *
   * The work of `embed`, without the queue.
   *
   * @param { HTMLCanvasElement | HTMLImageElement | HTMLVideoElement } src - the picture
   * @param { Array<number> } [area] - the part to use [x, y, width, height]
   * @returns { Promise<Float32Array> } - the unit-length embedding
   */
  async function embedNow(src, area) {
    if (!inputCanvas) {
      inputCanvas = document.createElement('canvas');
      inputCanvas.width = inputCanvas.height = INPUT_SIZE;
    }
    const context = inputCanvas.getContext('2d', { willReadFrequently: true });
    const sourceWidth = src.videoWidth || src.naturalWidth || src.width,
      sourceHeight = src.videoHeight || src.naturalHeight || src.height;
    const [areaX, areaY, areaWidth, areaHeight] = area || [0, 0, sourceWidth, sourceHeight];
    context.imageSmoothingQuality = 'high';
    context.drawImage(src, areaX, areaY, areaWidth, areaHeight, 0, 0, INPUT_SIZE, INPUT_SIZE);
    const rgba = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
    // RGBA (0..255, pixel after pixel) -> RGB planes (-1..1) 🔁
    const planeSize = INPUT_SIZE * INPUT_SIZE;
    const pixels = new Float32Array(3 * planeSize);
    for (let pixel = 0; pixel < planeSize; pixel++)
      for (let channel = 0; channel < 3; channel++)
        pixels[channel * planeSize + pixel] = rgba[pixel * 4 + channel] / 127.5 - 1;
    const outputs = await model.run({
      pixel_values: new ort.Tensor('float32', pixels, [1, 3, INPUT_SIZE, INPUT_SIZE]),
    });
    // the pooled image embedding: unit length, outliers clamped, unit length again
    return toUnit(
      toUnit(Float32Array.from(outputs.pooler_output.data)).map((component) =>
        Math.max(-OUTLIER_CLAMP, Math.min(OUTLIER_CLAMP, component)),
      ),
    );
  }

  /**
   * `toUnit` - Function 📐
   *
   * @param { Float32Array } vector - any vector (changed in place)
   * @returns { Float32Array } - the same vector, length 1
   */
  function toUnit(vector) {
    let norm = 0;
    for (const component of vector) norm += component * component;
    norm = Math.sqrt(norm) || 1;
    for (let index = 0; index < vector.length; index++) vector[index] /= norm;
    return vector;
  }

  /**
   * `embedViews` - Async Function 🔭
   *
   * Embeds the photo twice: whole, and a centred zoom (60%). A real photo has table,
   * hands & background around the plate or bottle; the zooms see mostly the subject itself.
   *
   * @param { HTMLCanvasElement } canvas - the photo
   * @returns { Promise<Array<Float32Array>> } - the unit vectors (whole photo first)
   */
  async function embedViews(canvas) {
    const views = [await embed(canvas)];
    for (const zoom of VIEW_ZOOMS) {
      const width = Math.round(canvas.width * zoom),
        height = Math.round(canvas.height * zoom);
      const zoomed = document.createElement('canvas');
      zoomed.width = width;
      zoomed.height = height;
      zoomed
        .getContext('2d')
        .drawImage(
          canvas,
          (canvas.width - width) / 2,
          (canvas.height - height) / 2,
          width,
          height,
          0,
          0,
          width,
          height,
        );
      views.push(await embed(zoomed));
    }
    return views;
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
      list.forEach((encoded) => {
        const vector = decodeEmbedding(encoded);
        if (vector.length === EMBEDDING_LENGTH) out.push({ k: key, v: vector, own: true });
      }),
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

  // the centred zooms embedded next to the whole photo 🔭
  const VIEW_ZOOMS = [0.6];
  // a small head start for the waiter's own photos & confirmed scans (same light, same plates) 🧠
  const OWN_BONUS = 0.04;
  // SigLIP 2 similarities: a score of SCORE_LOW means « no idea », SCORE_HIGH means « sure » 📏
  // (calibrated on synthetic shots of the reference photos, 2026-11-04)
  const SCORE_LOW = 0.6;
  const SCORE_HIGH = 0.85;
  // the lead over the runner-up below which a result is a close call ⚖️
  const CLOSE_GAP = 0.03;

  /**
   * `scoreConfidence` - Function 📶
   *
   * @param { number } score - the best score
   * @returns { number } - 0..1 (SCORE_LOW -> 0, SCORE_HIGH -> 1)
   */
  const scoreConfidence = (score) => Math.max(0, Math.min(1, (score - SCORE_LOW) / (SCORE_HIGH - SCORE_LOW)));

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
    // the photo embeddings: whole + zooms 🧠
    const views = await embedViews(canvas);
    const vector = views[0];
    // the references: shipped + own photos + learned scans
    const allRefs = refs.concat(await userRefs());
    // the best image similarity per item 🖼️
    const imageScores = {};
    allRefs.forEach((ref) => {
      if (!groupByKey[ref.k]) return;
      // the best view for this reference (+ the bonus for the waiter's own references)
      const similarity = Math.max(...views.map((view) => dot(view, ref.v))) + (ref.own ? OWN_BONUS : 0);
      if (!(imageScores[ref.k] >= similarity)) imageScores[ref.k] = similarity;
    });
    // the label text (when OCR is available) 🏷️
    let text = '';
    if (ocr) {
      status(translate("Lecture de l'étiquette…", 'Reading the label…'));
      try {
        const result = await ocr.recognize(canvas);
        // 🛡️ only the words Tesseract is fairly sure of (a plate's pattern reads as random « le », « re »…)
        const words = (result.data && result.data.words) || [];
        text = words.length
          ? words
              .filter((word) => word.confidence >= OCR_MIN_CONFIDENCE && /\p{L}{3,}/u.test(word.text || ''))
              .map((word) => word.text)
              .join(' ')
          : (result.data && result.data.text) || '';
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
    // final score = image + a bonus for the label (an extra +0.35 when the label clearly wins) ⚖️
    const ranked = groups
      .map((group) => {
        const imageScore = imageScores[group.k] || 0,
          labelScore = labelScores[group.k] || 0;
        const labelNormalized = labelMax ? labelScore / labelMax : 0;
        const strongLabel = labelScore >= 3 && labelNormalized === 1;
        return {
          g: group,
          i: imageScore,
          t: labelScore,
          score: imageScore + 0.5 * labelNormalized * Math.min(1, labelScore / 3) + (strongLabel ? 0.35 : 0),
        };
      })
      .sort((firstRanked, secondRanked) => secondRanked.score - firstRanked.score);
    // the confidence of the top result (SCORE_LOW -> 0, SCORE_HIGH -> 1)
    const top = ranked[0];
    let confidence = top ? scoreConfidence(top.score) : 0;
    // 🛡️ the label beat a clearly better-looking photo without a strong read: never « sure » then
    if (top && top.i < imageMax - LABEL_OVERRIDE_GAP && !(top.t >= 3)) confidence = Math.min(confidence, 0.5);
    // 🛡️ the top two are neck and neck: at most « Probable »
    if (ranked[1] && top.score - ranked[1].score < CLOSE_GAP) confidence = Math.min(confidence, 0.65);
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
    stopLive();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
  }

  /**
   * `addScanStyles` - Function 🎨
   *
   * The scanner's look (0.71.0): full-screen camera, gold corners, scan line, camera-style controls,
   * analysing sweep, confidence meter & a row of other matches. Injected once, after index.html's styles.
   *
   * @returns { void }
   */
  function addScanStyles() {
    if (document.getElementById('scanPolishCss')) return;
    const style = document.createElement('style');
    style.id = 'scanPolishCss';
    style.textContent = `
.scanov .sch{position:relative;z-index:3;gap:10px;padding:10px 12px;padding-top:max(10px,env(safe-area-inset-top))}
.scanov .sch b{flex:1;text-align:center;font-size:16px;letter-spacing:.02em}
.scx,.scgap{width:40px;height:40px;flex:none}
.scx{border:0;border-radius:50%;background:rgba(255,255,255,.1);color:inherit;cursor:pointer;padding:0;
  display:flex;align-items:center;justify-content:center;line-height:0;
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.scanov.sclive{background:#000;color:#fff}
.scanov.sclive .sch{position:absolute;top:0;left:0;right:0;background:linear-gradient(rgba(0,0,0,.55),transparent)}
.scanov.sclive .scb{padding:0;max-width:none;display:flex;flex-direction:column;overflow:hidden}
.scanov.sclive .scv{flex:1;max-height:none;aspect-ratio:auto;border-radius:0 0 26px 26px}
.scframe{inset:22% 12% 26%;border:0;border-radius:0;box-shadow:none}
.scframe i{position:absolute;width:34px;height:34px;border:3.5px solid var(--gold,#c9a961)}
.scframe i:nth-child(1){top:0;left:0;border-right:0;border-bottom:0;border-top-left-radius:18px}
.scframe i:nth-child(2){top:0;right:0;border-left:0;border-bottom:0;border-top-right-radius:18px}
.scframe i:nth-child(3){bottom:0;left:0;border-right:0;border-top:0;border-bottom-left-radius:18px}
.scframe i:nth-child(4){bottom:0;right:0;border-left:0;border-top:0;border-bottom-right-radius:18px}
.scline{position:absolute;left:8%;right:8%;height:2px;top:0;border-radius:2px;
  background:linear-gradient(90deg,transparent,var(--gold,#c9a961),transparent);
  box-shadow:0 0 12px var(--gold,#c9a961);animation:scline 2.4s ease-in-out infinite alternate}
@keyframes scline{to{top:100%}}
.scv .scprep{position:absolute;top:max(62px,calc(env(safe-area-inset-top) + 56px));left:50%;transform:translateX(-50%);
  margin:0;padding:6px 14px;border-radius:999px;background:rgba(0,0,0,.5);-webkit-backdrop-filter:blur(10px);
  backdrop-filter:blur(10px);font-size:12px;white-space:nowrap;display:flex;align-items:center;gap:8px;color:#fff}
.scv .scprep .scbar{width:46px;margin:0;height:3px}
.schint{position:absolute;bottom:12%;left:0;right:0;text-align:center;font-size:13px;color:#fff;
  text-shadow:0 1px 6px rgba(0,0,0,.8);padding:0 20px}
.scflash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
.scflash.on{animation:scflash .3s}
@keyframes scflash{0%{opacity:.9}100%{opacity:0}}
.sclivebar{justify-content:space-around;margin:0;padding:18px 24px;padding-bottom:max(18px,env(safe-area-inset-bottom))}
.scround{width:50px;height:50px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;
  font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.scround.on{background:#f3d58a;color:#111}
.sclivebar .scround{background:transparent;color:#fff;width:52px;height:52px}
.sclivebar .scround:active{transform:scale(.88)}
.sclivebar .scround.on{background:transparent;color:#f3d58a}
.sclivebar .scround svg{display:block}
.scshot{width:76px;height:76px;border-radius:50%;border:4px solid #fff;background:transparent;padding:4px;
  position:relative;transition:transform .12s}
.scshot::after{content:'';position:absolute;inset:5px;border-radius:50%;background:var(--gold,#c9a961)}
.scshot:active{transform:scale(.9)}
.scanal{position:relative;overflow:hidden;border-radius:20px;margin-top:4px}
.scanal .scshotimg{margin:0;max-height:46vh;filter:saturate(.85)}
.scsweep{position:absolute;inset:0;background:linear-gradient(180deg,transparent 0%,rgba(201,169,97,.35) 48%,
  rgba(243,213,138,.9) 50%,transparent 52%);background-size:100% 220%;animation:scsweep 1.6s linear infinite}
@keyframes scsweep{from{background-position:0 120%}to{background-position:0 -20%}}
.scstat{display:flex;align-items:center;gap:10px;margin:16px 2px 4px}
.scspin{width:18px;height:18px;border-radius:50%;border:2.5px solid var(--trk);border-top-color:var(--gold,#c9a961);
  animation:scspin .8s linear infinite;flex:none}
@keyframes scspin{to{transform:rotate(360deg)}}
.scverdict{display:flex;align-items:center;gap:12px;margin:6px 0 10px}
.scverdict .sh{margin:0 0 4px}
.scmini{width:58px;height:58px;border-radius:14px;object-fit:cover;flex:none;border:2px solid rgba(255,255,255,.12)}
.scmeter{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--mu)}
.scmeter i{width:16px;height:6px;border-radius:3px;background:var(--trk)}
.scmeter span{margin-left:6px}
.scmeter.l1 i:nth-child(-n+1){background:#e5a04d}
.scmeter.l2 i:nth-child(-n+2){background:var(--gold,#c9a961)}
.scmeter.l3 i:nth-child(-n+3){background:#4cc38a}
.scres.big{display:flex;flex-wrap:nowrap;align-items:center;gap:12px;padding:12px;border-radius:18px;box-shadow:0 6px 20px rgba(0,0,0,.25);animation:scup .35s ease-out}
.scres.big .thumb{width:76px;height:76px;border-radius:14px}
.scres.big .n{font-size:17px;line-height:1.25}
.scres.big .tx{flex:1;min-width:0}
.scsticky{display:flex;gap:10px}
.scsticky .btn{flex:1 1 0;min-width:0;width:auto;white-space:nowrap;text-decoration:none}
@keyframes scup{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
.scalts{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 8px;scroll-snap-type:x mandatory}
.scalt{flex:0 0 116px;scroll-snap-align:start;display:flex;flex-direction:column;gap:6px;text-align:left;
  background:var(--card,rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.08);border-radius:14px;
  padding:6px;color:inherit;font:inherit;font-size:12.5px;line-height:1.25}
.scalt img,.scaltph{width:100%;aspect-ratio:1;border-radius:10px;object-fit:cover;display:flex;
  align-items:center;justify-content:center;background:var(--trk);font-size:26px}
.scalt span:last-child{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.scsticky{position:sticky;bottom:0;margin:12px -14px 0;padding:12px 14px;
  padding-bottom:max(12px,env(safe-area-inset-bottom));background:linear-gradient(transparent,var(--bg) 30%)}
.scv .scprep{transition:opacity .4s}
.scv .scprep.gone{opacity:0;pointer-events:none}
.scv .scprep.offer{padding:4px;background:transparent;-webkit-backdrop-filter:none;backdrop-filter:none}
.scerr{margin-top:6px;max-width:78vw;font-size:11px;line-height:1.3;color:#fff;background:rgba(0,0,0,.6);
  border-radius:10px;padding:6px 10px;text-align:center}
.scdl{border:0;border-radius:999px;padding:10px 16px;background:var(--gold,#c9a961);color:#111;font:inherit;
  font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.4);white-space:nowrap}
.sclivetag{position:absolute;left:50%;bottom:7%;transform:translate(-50%,16px);opacity:0;pointer-events:none;
  display:flex;align-items:center;gap:10px;max-width:86%;padding:7px 14px 7px 7px;border-radius:18px;border:0;
  background:rgba(0,0,0,.62);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);color:#fff;
  font:inherit;text-align:left;transition:opacity .25s,transform .25s;box-shadow:0 6px 24px rgba(0,0,0,.4)}
.sclivetag.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.sclivetag img,.sclivetag .scaltph{width:44px;height:44px;border-radius:12px;object-fit:cover;flex:none;font-size:20px}
.sclt{display:flex;flex-direction:column;gap:4px;min-width:0}
.sclt b{font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sclivetag .scmeter{color:rgba(255,255,255,.75)}
.sclivetag .gold{font-size:20px;flex:none}
.schint{transition:opacity .25s}
@media (prefers-reduced-motion:reduce){.scline,.scsweep,.scspin{animation:none}}
@media (min-width:960px){.scanov.sclive .scb{max-width:720px;margin:0 auto;width:100%}.scanov.sclive .scv{border-radius:0 0 26px 26px}}
`;
    document.head.appendChild(style);
  }

  // ===== LIVE MODE 🎯 ===== //

  // at most one frame every LIVE_EVERY ms (a phone needs about a second per frame anyway) ⏱️
  const LIVE_EVERY = 700;
  // the share of the shorter side used in the middle of the frame (where the gold corners are) 🔲
  const LIVE_AREA = 0.8;
  // the live state: the timer, the references, the smoothed scores, the leader & its streak 🎯
  let liveTimer = null,
    liveRun = 0,
    liveScores = {},
    liveLeader = null,
    liveStreak = 0,
    liveVector = null;

  /**
   * `stopLive` - Function 🛑
   *
   * @returns { void }
   */
  function stopLive() {
    clearTimeout(liveTimer);
    liveTimer = null;
    liveRun++;
    liveScores = {};
    liveLeader = null;
    liveStreak = 0;
  }

  /**
   * `startLive` - Async Function 🎯
   *
   * Matches the middle of the camera frame again and again (image only, no label reading) and
   * shows the best guess on the viewfinder. Scores are smoothed over the frames so the guess
   * doesn't flicker. Tapping the guess opens the item, like a confirmed scan.
   *
   * @param { HTMLVideoElement } video - the live camera
   * @returns { Promise<void> }
   */
  async function startLive(video) {
    stopLive();
    const runId = liveRun;
    // the catalog & the references (shipped + own photos + learned scans)
    const groups = buildCatalog();
    const groupByKey = Object.fromEntries(groups.map((group) => [group.k, group]));
    const liveRefs = refs.concat(await userRefs()).filter((ref) => groupByKey[ref.k]);
    // still the same camera session?
    const stillLive = () => runId === liveRun && stream && overlay && overlay.classList.contains('sclive');
    const tick = async () => {
      if (!stillLive()) return;
      // 💤 app in the background or the video not ready yet: wait
      if (document.hidden || !video.videoWidth) {
        liveTimer = setTimeout(tick, 600);
        return;
      }
      const startedAt = Date.now();
      // the middle square of the frame 🔲
      const side = Math.min(video.videoWidth, video.videoHeight) * LIVE_AREA;
      let vector;
      try {
        vector = await embed(video, [
          (video.videoWidth - side) / 2,
          (video.videoHeight - side) / 2,
          side,
          side,
        ]);
      } catch (error) {
        liveTimer = setTimeout(tick, 1500);
        return;
      }
      if (!stillLive()) return;
      // the best similarity per item for this frame
      const frameScores = {};
      liveRefs.forEach((ref) => {
        const similarity = dot(vector, ref.v) + (ref.own ? OWN_BONUS : 0);
        if (!(frameScores[ref.k] >= similarity)) frameScores[ref.k] = similarity;
      });
      // 🌊 smoothed: half this frame, half the frames before
      Object.entries(frameScores).forEach(([key, score]) => {
        liveScores[key] = liveScores[key] == null ? score : (liveScores[key] + score) / 2;
      });
      const ranked = Object.entries(liveScores).sort((first, second) => second[1] - first[1]);
      if (ranked.length) {
        const [leaderKey, leaderScore] = ranked[0];
        const gap = ranked[1] ? leaderScore - ranked[1][1] : 1;
        liveStreak = leaderKey === liveLeader ? liveStreak + 1 : 1;
        liveLeader = leaderKey;
        liveVector = vector;
        let confidence = scoreConfidence(leaderScore);
        if (gap < CLOSE_GAP) confidence = Math.min(confidence, 0.65);
        paintLive(groupByKey[leaderKey], confidence);
      }
      liveTimer = setTimeout(tick, Math.max(60, LIVE_EVERY - (Date.now() - startedAt)));
    };
    tick();
  }

  /**
   * `paintLive` - Function 🎨
   *
   * Shows (or hides) the live guess: a pill with the photo, the name & the confidence meter.
   * It only shows once the same item has led for 2 frames and is at least « Probable ».
   *
   * @param { object } group - the leading catalog group
   * @param { number } confidence - 0..1
   * @returns { void }
   */
  function paintLive(group, confidence) {
    const viewport = overlay && overlay.querySelector('.scv');
    if (!viewport) return;
    let pill = viewport.querySelector('#scLive');
    const hint = viewport.querySelector('.schint');
    const visible = group && liveStreak >= 2 && confidence >= 0.55;
    if (!visible) {
      if (pill) pill.classList.remove('on');
      if (hint) hint.style.opacity = '';
      return;
    }
    if (!pill) {
      pill = document.createElement('button');
      pill.id = 'scLive';
      pill.className = 'sclivetag';
      viewport.appendChild(pill);
      // ✅ tapped: remember this frame, close & open the item's ⓘ sheet
      pill.onclick = () => {
        const key = pill.dataset.k,
          id = pill.dataset.id;
        if (!key) return;
        if (liveVector) remember(key, liveVector);
        closeScanner();
        if (window.LTFinfo) LTFinfo(id);
      };
    }
    const level = confidence >= 0.7 ? 3 : 2;
    const photo = (refs.find((ref) => ref.k === group.k) || {}).img;
    // only repaint when the guess or its level changed (no flicker) 🎨
    const signature = group.k + '|' + level;
    if (pill.dataset.sig !== signature) {
      pill.dataset.sig = signature;
      pill.dataset.k = group.k;
      pill.dataset.id = group.item.id;
      pill.innerHTML =
        `${photo ? `<img src="${escapeHtml(photo)}" alt="">` : `<span class="scaltph">🍽</span>`}` +
        `<span class="sclt"><b>${escapeHtml(group.name)}</b>` +
        `<span class="scmeter l${level}"><i></i><i></i><i></i><span>` +
        `${level === 3 ? translate('Très probable', 'Very likely') : translate('Probable', 'Likely')}` +
        `</span></span></span><span class="gold">›</span>`;
    }
    pill.classList.add('on');
    if (hint) hint.style.opacity = '0';
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
    overlay.innerHTML =
      `<div class="sch"><button class="scx" id="scX" aria-label="close">${CLOSE_ICON}</button>` +
      `<b>${translate('Scanner', 'Scan')}</b><span class="scgap"></span></div><div class="scb"></div>`;
    addScanStyles();
    document.body.appendChild(overlay);
    overlay.querySelector('#scX').onclick = closeScanner;
    // 👂 the overlay was removed by someone else (navigation)? stop the camera 🧹
    new MutationObserver((mutations, observer) => {
      if (!document.body.contains(overlay || document.createElement('i'))) {
        stopCamera();
        observer.disconnect();
      }
    }).observe(document.body, { childList: true });
    // 🎥 the camera (it decides about the download: button, silent load or nothing)
    showCamera();
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
      `<div class="scv"><video id="scVid" playsinline muted autoplay></video>` +
        `<div class="scframe"><i></i><i></i><i></i><i></i><span class="scline"></span></div>` +
        `<div class="scprep gone" id="scPrepBox"></div>` +
        `<div class="schint">${translate("Cadrez l'assiette, l'étiquette ou la bouteille", 'Frame the plate, the label or the bottle')}</div>` +
        `<div class="scflash"></div></div>` +
        `<div class="scbtns sclivebar"><label class="scround" for="scFile" aria-label="gallery">${GALLERY_ICON}</label>` +
        `<input id="scFile" type="file" accept="image/*" hidden>` +
        `<button class="scshot" id="scShot" aria-label="scan"></button>` +
        `<button class="scround" id="scTorch" aria-label="torch" style="visibility:hidden">${TORCH_ICON}</button></div>`,
    );
    overlay.classList.add('sclive');
    const video = queryOne('#scVid');
    // the back camera (up to 1280 px)
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      video.srcObject = stream;
      // 🔦 the flashlight, when the back camera has one (dim tables at night)
      const track = stream.getVideoTracks()[0],
        capabilities = track && track.getCapabilities ? track.getCapabilities() : {},
        torchButton = queryOne('#scTorch');
      if (capabilities.torch && torchButton) {
        torchButton.style.visibility = 'visible';
        torchButton.onclick = () => {
          const isOn = !torchButton.classList.contains('on');
          track
            .applyConstraints({ advanced: [{ torch: isOn }] })
            .then(() => torchButton.classList.toggle('on', isOn))
            .catch(() => {});
        };
      }
    } catch (error) {
      // no camera (permission, desktop...): the file input opens the camera app instead 📱
      const viewport = overlay && overlay.querySelector('.scv');
      if (viewport)
        viewport.innerHTML =
          `<div class="scnocam">` +
          `${translate("Caméra indisponible : utilisez la galerie ou l'appareil photo.", 'Camera unavailable: use the gallery or the camera app.')}` +
          `</div><div class="scprep gone" id="scPrepBox"></div>`;
      const fileInput = queryOne('#scFile');
      if (fileInput) fileInput.setAttribute('capture', 'environment');
    }
    // 🚦 the AI scanner: download button, silent load or straight to live guesses
    prepareEngines();
    // 📸 shutter: grab the frame (or open the picker when there's no video)
    queryOne('#scShot').onclick = () => {
      if (!stream || !video.videoWidth) {
        queryOne('#scFile').click();
        return;
      }
      const canvas = grabFrame(video, video.videoWidth, video.videoHeight);
      // ⚡ a flash & a little buzz, like a camera
      const flash = queryOne('.scflash');
      if (flash) flash.classList.add('on');
      if (navigator.vibrate) navigator.vibrate(12);
      stopCamera();
      setTimeout(() => runScan(canvas), 140);
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
  async function runScan(canvas, confirmed) {
    if (overlay) overlay.classList.remove('sclive');
    // the photo as a JPEG (shown on top of the results)
    const shot = canvas.toDataURL('image/jpeg', 0.7);
    // ⬇️ not downloaded yet? ask first (it's big), then scan this photo
    if (!confirmed && !model && !loading && !(await isDownloaded())) {
      setBody(
        `<img class="scshotimg" src="${shot}" alt=""><div class="card sm">` +
          `${translate('Le scanner IA doit être téléchargé une fois (de préférence en Wi-Fi), ensuite il marche hors-ligne.', 'The AI scanner needs one download (Wi-Fi is best), then it works offline.')}` +
          `</div><div class="scbtns scsticky"><button class="btn grow" id="scDlNow">⬇️ ` +
          `${translate('Télécharger', 'Download')} · ${DOWNLOAD_LABEL}</button>` +
          `<button class="btn sec" id="scAgain">${translate('Retour', 'Back')}</button></div>`,
      );
      queryOne('#scDlNow').onclick = () => {
        downloading = true;
        runScan(canvas, true);
      };
      queryOne('#scAgain').onclick = showCamera;
      return;
    }
    setBody(
      `<div class="scanal"><img class="scshotimg" src="${shot}" alt=""><span class="scsweep"></span></div>` +
        `<div class="scstat"><span class="scspin"></span><b id="scSt">${translate('Préparation…', 'Preparing…')}</b></div>` +
        `<div class="scbar"><div id="scPrep" style="width:5%"></div></div>`,
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
          (downloading
            ? translate('Téléchargement… ', 'Downloading… ')
            : translate('Chargement… ', 'Loading… ')) +
            Math.round(fraction * 100) +
            '%',
        );
      });
      downloading = false;
    } catch (error) {
      downloading = false;
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
    if (!overlay) return;
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
    // the meter: 3 bars (very sure), 2 (likely), 1 (unsure) 📶
    const level = result.conf >= 0.7 ? 3 : sure ? 2 : 1;
    const levelName = [
      translate('Incertain', 'Unsure'),
      translate('Probable', 'Likely'),
      translate('Très probable', 'Very likely'),
    ][level - 1];
    // one result card (photo, name, chapter, formats, subtitle)
    const resultCard = (match, big) => {
      if (!big) return altCard(match);
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
    // another match: a small tile in the row (photo + name) 🧩
    const altCard = (match) => {
      const group = match.g,
        photo = (refs.find((ref) => ref.k === group.k) || {}).img;
      return (
        `<button class="scres scalt" data-k="${escapeHtml(group.k)}" data-id="${escapeHtml(group.item.id)}">` +
        `${photo ? `<img src="${escapeHtml(photo)}" alt="">` : `<span class="scaltph">🍽</span>`}` +
        `<span>${escapeHtml(group.name)}</span></button>`
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
    setBody(
      `<div class="scverdict"><img class="scmini" src="${shot}" alt=""><div class="grow">` +
        `<div class="sh">${sure ? translate("C'est sûrement", 'Most likely') : translate('Peut-être', 'Maybe')}</div>` +
        `<div class="scmeter l${level}"><i></i><i></i><i></i><span>${levelName}</span></div></div></div>` +
        `${top ? resultCard(top, true) : `<div class="card sm muted">${translate('Rien de reconnu', 'Nothing recognised')}</div>`}
  ${
    result.res.length > 1
      ? `<div class="sh">${translate('Autres possibilités', 'Other matches')}</div><div class="scalts">` +
        result.res
          .slice(1)
          .map((match) => resultCard(match))
          .join('') +
        '</div>'
      : ''
  }
  ${result.text && result.text.trim() ? `<details class="muted sm scocr"><summary>${translate('Texte lu', 'Text read')}</summary>${escapeHtml(result.text.trim().slice(0, 300))}</details>` : ''}
  <p class="muted sm" style="text-align:center">${translate("Touchez le bon résultat : le scanner s'en souviendra.", 'Tap the right match: the scanner will remember it.')}</p>
  <div class="scbtns scsticky"><button class="btn grow" id="scAgain">📷 ${translate('Rescanner', 'Scan again')}</button>${
    online
      ? `<a class="btn sec" target="_blank" rel="noopener" href="https://www.google.com/search?q=` +
        `${encodeURIComponent(searchQuery)}">🌐 ${translate('En ligne', 'Online')}</a>`
      : ''
  }</div>`,
    );
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
