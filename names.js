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
* @name: Les Trois Forts - Encrypted Guest Names
* @file: pwa/names.js
* @type: JavaScript (encrypted data, AES-GCM)
* @authors: Abraham Ukachi <abrahamukachi@gmail.com>
*
* Example usage:
*   1+|> (index.html) script src="names.js"  ->  window.LTF_NAMES (unlocked with the crew code)
*    -|>
*
*/


/*
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
* MOTTO: We'll always do more 😜!!!
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
*/


// 🔐 The guest names of the daily briefing, encrypted (made by rust/tools/enc_names.py, never edit by hand).
// The crew code script of index.html derives the key (PBKDF2-SHA256) and decrypts `c` with AES-GCM 256.
// The keys stay short on purpose (`it`, `s`, `iv`, `c`): index.html reads them by name.

window.LTF_NAMES = {
  // 🔁 the PBKDF2-SHA256 rounds
  "it": 600000,
  // 🧂 the salt (base64, 16 bytes)
  "s": "e5roCze0ojrT1OKxwMqalw==",
  // 🎲 the AES-GCM IV (base64, 12 bytes)
  "iv": "OqG1vAqKMfAzFuLM",
  // 🔒 the ciphertext + GCM tag (base64)
  "c": "JLb+qCeWVTEkTndNATGNXh6zy54nPGUolTfFABy5vxMYmU8sx/+YeswF0JZ31YiLO0bMGv3RiVvCvcx4w1QPxcnn+KiIuM7IuxlFO9mr9qUf7bRzzAKDVisPz2kUgxk++XNgwzwc3OWF3RWGbewpnucX8Eqrdce34wlH2qQxhLd7Qhh60LIw7OAhNOMUhF9r1f69PFDBC8DCSNnHjnWI1tDJpGNWSh4l73bm4dm3D7wjf3m2+dLipGh0rYFS5DoAO5jMaf/KvnQ+zZrKscyFXIzOJsUmSRxZaEY=",
};
