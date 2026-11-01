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
 *   1+|> node emb.js mq images.json 0 /tmp/scan/emb_mq.json
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🧠 Builds the reference embeddings of the photo scan (scan/emb.json): one MobileNet v2 vector
// per photo of images.js. Run with Node + @tensorflow/tfjs@4, @tensorflow-models/mobilenet@2 & jpeg-js
// installed in /tmp/scanpk; the models are served from /tmp/scan on port 8124.
// usage: node emb.js <model dir: mq|...> <images.json [{key, file}]> [limit] [out.json]

// import the Node.js modules we need (a tiny static server, files, paths) 🧰
const http = require('http'),
  fs = require('fs'),
  path = require('path');
// 🌐 serve /tmp/scan so tfjs can load the model over HTTP
const ROOT = '/tmp/scan';
const server = http
  .createServer((request, response) => {
    const file = path.join(ROOT, decodeURIComponent(request.url.split('?')[0]));
    fs.readFile(file, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end();
      } else {
        response.writeHead(200);
        response.end(data);
      }
    });
  })
  .listen(8124);
// (tfjs uses the global fetch of Node 18+)
global.fetch = global.fetch;
// import TensorFlow.js, MobileNet & the JPEG decoder 🧠
const tf = require('/tmp/scanpk/node_modules/@tensorflow/tfjs');
const mobilenet = require('/tmp/scanpk/node_modules/@tensorflow-models/mobilenet');
const jpeg = require('/tmp/scanpk/node_modules/jpeg-js');
(async () => {
  // CPU backend (no GPU in Node)
  await tf.setBackend('cpu');
  // the model folder & the model 🧠
  const which = process.argv[2] || 'mq';
  const model = await mobilenet.load({
    version: 2,
    alpha: 1,
    modelUrl: `http://localhost:8124/${which}/model.json`,
  });
  // the photos to embed (optionally only the first `limit`) & the results
  const imgs = JSON.parse(fs.readFileSync(process.argv[3]));
  const limit = +process.argv[4] || imgs.length;
  const out = {};
  let startTime = Date.now();
  for (const photo of imgs.slice(0, limit)) {
    // decode the JPEG (RGB)
    const raw = jpeg.decode(fs.readFileSync(photo.file), {
      useTArray: true,
      formatAsRGBA: false,
      maxMemoryUsageInMB: 1024,
    });
    // embed it & free the tensors 🧹
    const img = tf.tensor3d(raw.data, [raw.height, raw.width, 3], 'int32');
    const embedding = model.infer(img, true);
    const values = Array.from(await embedding.data());
    img.dispose();
    embedding.dispose();
    // store the unit vector
    const norm = Math.hypot(...values);
    out[photo.key] = values.map((value) => value / norm);
  }
  // write the file & stop the server ✅
  fs.writeFileSync(process.argv[5] || `/tmp/scan/emb_${which}.json`, JSON.stringify(out));
  console.log(
    'done',
    Object.keys(out).length,
    (Date.now() - startTime) / 1000,
    's',
    Object.values(out)[0].length,
  );
  server.close();
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
