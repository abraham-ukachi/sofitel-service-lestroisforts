<h1 align="center">📦 vendor/ — Third-party scan libraries</h1>

<p align="center">
  <em>The engines behind the 📷 photo scan of <strong>Les Trois Forts — Service Academy</strong>.</em>
</p>

> [!IMPORTANT]
> Nothing in this folder is our code. These are the official builds published by their authors,
> kept here **untouched** so the scan works offline once the app is installed (PWA) 📴.
> They are excluded from our readability checker (`work/refactor/check_readable.sh`).

> [!NOTE]
> Where the publisher ships a readable (unminified) build, we use it.
> Tesseract.js only publishes minified bundles, so those stay as they are.

## 📚 Libraries

| Library | Version | Files | Build | License | Source |
|---|---|---|---|---|---|
| TensorFlow.js | 4.22.0 | `tensorflow/tf.js` | ✅ unminified (`dist/tf.es2017.js`) | Apache-2.0 | [jsdelivr](https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.es2017.js) · [GitHub](https://github.com/tensorflow/tfjs) |
| MobileNet (tfjs-models) | 2.1.1 | `tensorflow/mobilenet.js` | ✅ unminified (`dist/mobilenet.js`) | Apache-2.0 | [jsdelivr](https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.js) · [GitHub](https://github.com/tensorflow/tfjs-models) |
| Tesseract.js | 5.1.1 | `tesseract/tesseract.min.js`, `tesseract/worker.min.js` | ⚠️ minified only | Apache-2.0 | [npm](https://www.npmjs.com/package/tesseract.js/v/5.1.1) · [GitHub](https://github.com/naptha/tesseract.js) |
| Tesseract.js-core | 5.1.1 | `tesseract/core/*.wasm.js` | ⚠️ Emscripten output | Apache-2.0 | [npm](https://www.npmjs.com/package/tesseract.js-core/v/5.1.1) · [GitHub](https://github.com/naptha/tesseract.js-core) |

## 🔗 Who loads what

- `../../scan.js` loads `tensorflow/tf.js` + `tensorflow/mobilenet.js` for the dish photo match 🍽️,
  and `tesseract/tesseract.min.js` (with its worker & core) to read the menu text 📝.
- The service worker keeps all of them in the persistent `ltf-scan-v2` cache 🗄️.

## 🔄 Updating

1. Download the new version from jsdelivr (prefer the unminified `dist/` build when there is one).
2. Replace the file here, update the table above, and bump the scan cache name in `scan.js` and `sw.js`.

---

> [!TIP]
> **MOTTO:** We'll always do more 😜!!!
