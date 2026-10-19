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
 * @name: Les Trois Forts - MobileNet float16 Quantizer
 * @file: rust/tools/scan/q16.js
 * @type: JavaScript (Node.js)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> cd <model dir> && node q16.js   (m/ -> mh/)
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🗜️ Converts the MobileNet v2 weights (m/, 4 float32 shards) to float16 (mh/, 1 shard): half the size, same accuracy.
// usage: cd <folder with m/> && node q16.js

// import fs & read the model manifest 📜
const fs = require('fs');
const model = JSON.parse(fs.readFileSync('m/model.json'));
// all the float32 weights, in order 📦
const data = Buffer.concat(
  [1, 2, 3, 4].map((shardNumber) => fs.readFileSync(`m/group1-shard${shardNumber}of4.bin`)),
);
// a float32 <-> uint32 view, to read the bits of a float
const f32 = new Float32Array(1),
  u32 = new Uint32Array(f32.buffer);

/**
 * `toHalf` - Function 🔢
 *
 * Converts a float32 to its IEEE 754 half-precision bits (round to nearest).
 *
 * @param { number } value - the float32 value
 * @returns { number } - the float16 bits
 */
function toHalf(value) {
  f32[0] = value;
  const bits = u32[0];
  const sign = (bits >>> 16) & 0x8000;
  let exponent = ((bits >>> 23) & 0xff) - 127 + 15;
  let mantissa = bits & 0x7fffff;
  if (exponent <= 0) {
    if (exponent < -10) return sign;
    mantissa |= 0x800000;
    const shift = 14 - exponent;
    let half = mantissa >>> shift;
    if ((mantissa >>> (shift - 1)) & 1) half++;
    return sign | half;
  }
  if (exponent >= 31) return sign | 0x7c00;
  let half = sign | (exponent << 10) | (mantissa >>> 13);
  if (mantissa & 0x1000) half++;
  return half;
}

// the read offset, the float16 parts & the new weight specs
let off = 0;
const parts = [];
const newWeights = [];
// every weight of the manifest: read its float32 values, write them as float16 🔁
for (const group of model.weightsManifest)
  for (const weight of group.weights) {
    const elementCount = weight.shape.reduce((product, dimension) => product * dimension, 1);
    const floats = new Float32Array(
      data.buffer.slice(data.byteOffset + off, data.byteOffset + off + elementCount * 4),
    );
    off += elementCount * 4;
    const halfBuffer = Buffer.alloc(elementCount * 2);
    for (let index = 0; index < elementCount; index++)
      halfBuffer.writeUInt16LE(toHalf(floats[index]), index * 2);
    parts.push(halfBuffer);
    newWeights.push({ ...weight, quantization: { dtype: 'float16', original_dtype: 'float32' } });
  }
// write mh/ (one shard + the updated manifest) ✅
fs.mkdirSync('mh', { recursive: true });
const shardBuffer = Buffer.concat(parts);
fs.writeFileSync('mh/group1-shard1of1.bin', shardBuffer);
model.weightsManifest = [{ paths: ['group1-shard1of1.bin'], weights: newWeights }];
fs.writeFileSync('mh/model.json', JSON.stringify(model));
console.log(shardBuffer.length);
