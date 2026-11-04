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
 * @name: Les Trois Forts - Scan Embeddings Generator
 * @file: rust/tools/scan/emb.js
 * @type: JavaScript (Node.js)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> NODE_PATH=/workspace/work/sg/node_modules node emb.js ../../../pwa /workspace/work/sg/models/vision_model_q4.onnx
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🧠 Builds the reference embeddings of the photo scan (pwa/scan/emb.json): one SigLIP 2 vector per photo
// of images.js, the same way the app does it (squeezed to 224 x 224, -1..1, pooled output, outliers clamped).
// Needs onnxruntime-node & sharp (npm, in NODE_PATH) and the 4-bit SigLIP 2 vision model the app downloads:
// https://huggingface.co/onnx-community/siglip2-base-patch16-224-ONNX (onnx/vision_model_q4.onnx).
// Run it again whenever a dish / wine photo changes.
// usage: node emb.js <pwa folder> <vision_model_q4.onnx>

// import the Node.js modules we need (files, paths, the ONNX runtime & the image library) 🧰
const fs = require('fs'),
  path = require('path'),
  ort = require('onnxruntime-node'),
  sharp = require('sharp');

// the model's input size & the outlier clamp (same numbers as pwa/scan.js) 📏
const INPUT_SIZE = 224;
const CLAMP = 0.25;

/**
 * `readImages` - Function 📚
 *
 * @param { string } pwaFolder - the pwa/ folder
 * @returns { Array<{ key: string, file: string }> } - every photo of images.js
 */
function readImages(pwaFolder) {
  const source = fs.readFileSync(path.join(pwaFolder, 'images.js'), 'utf8');
  const out = [];
  // 'key': 'img/…' or "key with an apostrophe": 'img/…'
  for (const match of source.matchAll(/^\s*(?:'([^']+)'|"([^"]+)"):\s*'(img\/[^']+)'/gm))
    out.push({ key: match[1] || match[2], file: match[3] });
  return out;
}

/**
 * `toPixels` - Async Function 🖼️
 *
 * @param { string } file - a photo
 * @returns { Promise<ort.Tensor> } - the 1 x 3 x 224 x 224 input (-1..1, channel first)
 */
async function toPixels(file) {
  const rgb = await sharp(file)
    .removeAlpha()
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'fill', kernel: 'linear' })
    .raw()
    .toBuffer();
  const planeSize = INPUT_SIZE * INPUT_SIZE;
  const pixels = new Float32Array(3 * planeSize);
  for (let pixel = 0; pixel < planeSize; pixel++)
    for (let channel = 0; channel < 3; channel++)
      pixels[channel * planeSize + pixel] = rgb[pixel * 3 + channel] / 127.5 - 1;
  return new ort.Tensor('float32', pixels, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

/**
 * `unit` - Function 📐
 *
 * @param { Float32Array } vector - any vector
 * @returns { Float32Array } - the same direction, length 1
 */
function unit(vector) {
  let norm = 0;
  for (const component of vector) norm += component * component;
  norm = Math.sqrt(norm) || 1;
  return vector.map((component) => component / norm);
}

/**
 * `encode` - Function 🔢
 *
 * @param { Float32Array } vector - a unit embedding
 * @returns { string } - base64 int8 (x4, clamped), the format pwa/scan.js decodes
 */
function encode(vector) {
  const bytes = Buffer.alloc(vector.length);
  vector.forEach((component, index) =>
    bytes.writeInt8(Math.round(Math.max(-1, Math.min(1, component * 4)) * 127), index),
  );
  return bytes.toString('base64');
}

(async () => {
  // the folders & the model 🧠
  const pwaFolder = process.argv[2] || '../../../pwa';
  const session = await ort.InferenceSession.create(process.argv[3], { intraOpNumThreads: 2 });
  const lines = [];
  const startTime = Date.now();
  for (const photo of readImages(pwaFolder)) {
    const file = path.join(pwaFolder, photo.file);
    if (!fs.existsSync(file)) continue;
    // embed, clamp the outlier dimensions, length 1 again ✂️
    const outputs = await session.run({ pixel_values: await toPixels(file) });
    const clamped = unit(Float32Array.from(outputs.pooler_output.data)).map((component) =>
      Math.max(-CLAMP, Math.min(CLAMP, component)),
    );
    lines.push(JSON.stringify({ k: photo.key, i: photo.file, e: encode(unit(clamped)) }));
  }
  // one entry per line (readable diffs) ✅
  fs.writeFileSync(path.join(pwaFolder, 'scan/emb.json'), '[\n  ' + lines.join(',\n  ') + '\n]\n');
  console.log('done', lines.length, (Date.now() - startTime) / 1000, 's');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
