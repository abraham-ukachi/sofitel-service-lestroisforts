# 
# @license MIT
# ~~~~~~~~~~~~
# sofitel-service-lestroisforts
# ~~~~~~~~~~~~
# Copyright (c) 2026 Abraham Ukachi. The Les Trois Forts Project.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the 'Software'), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
#
# @project: sofitel-service-lestroisforts
# @name: Les Trois Forts - Guest Names Encryptor
# @file: rust/tools/enc_names.py
# @type: Python
# @authors: Abraham Ukachi <abrahamukachi@gmail.com>
#
# Example usage:
#   1+|> python3 enc_names.py names.json CODE names.js
#    -|> 
#
#


#
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# MOTTO: We'll always do more 😜!!!
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
#


# 🔐 Encrypts the guest names of the daily briefing for names.js (window.LTF_NAMES),
# so they're never in clear text in the app: AES-GCM 256, key = PBKDF2-SHA256(crew code, 600 000 rounds).
# The app decrypts them in the browser (index.html "crew code" script) once the team code is typed.
# usage: python3 enc_names.py names.json CODE out.js  -> window.LTF_NAMES (AES-GCM, PBKDF2-SHA256)
# ⚠️ never commit names.json or the code: only the encrypted out.js goes into the app 🛡️

# import sys (arguments), os (random bytes), json & base64 🧰
import sys, os, json, base64
# import AES-GCM & PBKDF2 from `cryptography` 🔐
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

# the clear names file, the crew code, the output file & the PBKDF2 rounds
source_path, crew_code, output_path = sys.argv[1:4]
rounds = 600000
# a fresh random salt (16 bytes) & IV (12 bytes) for every run 🎲
salt = os.urandom(16)
iv = os.urandom(12)
# derive the 256-bit key from the code 🔑
key = PBKDF2HMAC(hashes.SHA256(), 32, salt, rounds).derive(crew_code.encode())
# encrypt the names (the GCM tag is appended to the ciphertext)
with open(source_path, 'rb') as source_file:
    ciphertext = AESGCM(key).encrypt(iv, source_file.read(), None)


def to_base64(raw_bytes):
    """Returns the base64 text of `raw_bytes` 🔤"""
    return base64.b64encode(raw_bytes).decode()


# the license header + MOTTO banner of names.js 📜
HEADER = """/*
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
"""

# the formatted `window.LTF_NAMES = { ... };` (keys unchanged: it, s, iv, c) ✍️
body = (
    'window.LTF_NAMES = {\n'
    '  // 🔁 the PBKDF2-SHA256 rounds\n'
    f'  "it": {rounds},\n'
    '  // 🧂 the salt (base64, 16 bytes)\n'
    f'  "s": {json.dumps(to_base64(salt))},\n'
    '  // 🎲 the AES-GCM IV (base64, 12 bytes)\n'
    f'  "iv": {json.dumps(to_base64(iv))},\n'
    '  // 🔒 the ciphertext + GCM tag (base64)\n'
    f'  "c": {json.dumps(to_base64(ciphertext))},\n'
    '};\n'
)

# write names.js ✅
with open(output_path, 'w', encoding='utf-8') as output_file:
    output_file.write(HEADER + '\n' + body)
