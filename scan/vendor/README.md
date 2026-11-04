<h1 align="center">📦 vendor/ — Third-party scan libraries</h1>

<p align="center">
  <em>The engines behind the 📷 photo scan of <strong>Les Trois Forts — Service Academy</strong>.</em>
</p>

> [!IMPORTANT]
> Nothing in this folder is our code. These are the official builds published by their authors,
> kept here **untouched** so the scan works offline once the app is installed (PWA) 📴.
> They are excluded from our readability checker (`rust/tools/check_readable.js`).

> [!NOTE]
> Where the publisher ships a readable (unminified) build, we use it.
> Tesseract.js only publishes minified bundles, so those stay as they are.

## 📚 Libraries

| Library | Version | Files | Build | License | Source |
|---|---|---|---|---|---|
| ONNX Runtime Web | 1.22.0 | `onnxruntime/ort.webgpu.js`, `onnxruntime/ort-wasm-simd-threaded.jsep.{mjs,wasm}` | ✅ unminified JS (`dist/ort.webgpu.js`) + Emscripten output | MIT | [npm](https://www.npmjs.com/package/onnxruntime-web/v/1.22.0) · [GitHub](https://github.com/microsoft/onnxruntime) |
| Tesseract.js | 5.1.1 | `tesseract/tesseract.min.js`, `tesseract/worker.min.js` | ⚠️ minified only | Apache-2.0 | [npm](https://www.npmjs.com/package/tesseract.js/v/5.1.1) · [GitHub](https://github.com/naptha/tesseract.js) |
| Tesseract.js-core | 5.1.1 | `tesseract/core/*.wasm.js` | ⚠️ Emscripten output | Apache-2.0 | [npm](https://www.npmjs.com/package/tesseract.js-core/v/5.1.1) · [GitHub](https://github.com/naptha/tesseract.js-core) |

## 🧠 The model (not in this folder)

SigLIP 2 vision encoder, base patch16 224, 4-bit: `onnx/vision_model_q4.onnx` of
[onnx-community/siglip2-base-patch16-224-ONNX](https://huggingface.co/onnx-community/siglip2-base-patch16-224-ONNX)
(Apache-2.0), pinned to revision `ba1f3b0843f24bc5417d38e19c37b287d719b2f4`. It is ~63 MB, so `../../scan.js`
downloads it once from Hugging Face and keeps it in the scan cache.

## 🔗 Who loads what

- `../../scan.js` loads `onnxruntime/ort.webgpu.js` (WebGPU, else WebAssembly) to run SigLIP 2 for the photo match 🍽️,
  and `tesseract/tesseract.min.js` (with its worker & core) to read the label text 📝.
- The service worker keeps them in the persistent `ltf-scan-v5` cache 🗄️.

## 🔄 Updating

1. Download the new version from npm (prefer the unminified `dist/` build when there is one).
2. Replace the file here, update the table above, and bump the scan cache name in `scan.js` and `sw.js`.
3. A new model (or revision) means new reference embeddings: run `rust/tools/scan/emb.js` again.

---

> [!TIP]
> **MOTTO:** We'll always do more 😜!!!
