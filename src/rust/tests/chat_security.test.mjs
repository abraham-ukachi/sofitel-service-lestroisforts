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
 * @name: Les Trois Forts - Chat Security Tests
 * @file: rust/tests/chat_security.test.mjs
 * @type: JavaScript (Node test module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> node --test src/rust/tests/chat_security.test.mjs
 *    -|>
 */

// import the Node test runner, assertions, file helpers & the functions used by the chat 🧪
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  escapeHtml,
  reactionCounts,
  safeChatPhoto,
} from '../../pwa/chat-security.mjs';

// the repository root & the reactions supported by the chat UI 📁
const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url));
const ALLOWED_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏', '🔥'];

test('escapeHtml neutralizes markup and quoted-attribute characters', () => {
  const payload = 'x" onerror="alert(1)" <script>alert(\'x\')</script> &';
  const escaped = escapeHtml(payload);
  assert.equal(
    escaped,
    'x&quot; onerror=&quot;alert(1)&quot; &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp;',
  );
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('safeChatPhoto accepts only the inline raster formats used by the chat', () => {
  assert.equal(safeChatPhoto('data:image/jpeg;base64,AA=='), 'data:image/jpeg;base64,AA==');
  assert.equal(safeChatPhoto('data:image/png;base64,AA=='), 'data:image/png;base64,AA==');
  assert.equal(safeChatPhoto('data:image/webp;base64,AA=='), 'data:image/webp;base64,AA==');
});

test('safeChatPhoto rejects attribute injection, SVG, remote and malformed images', () => {
  const rejectedValues = [
    'x" onerror="alert(1)',
    'data:image/jpeg;base64,AA==" onerror="alert(1)',
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    'https://example.com/photo.jpg',
    'javascript:alert(1)',
    'data:image/jpeg;base64,not base64!',
    '',
    null,
    undefined,
  ];
  for (const value of rejectedValues) assert.equal(safeChatPhoto(value), '');
});

test('reactionCounts ignores crafted or unsupported Firestore values', () => {
  const counts = reactionCounts(
    {
      firstUser: '👍',
      secondUser: '👍',
      thirdUser: '🔥',
      attacker: '"><img src=x onerror=alert(1)>',
      unknownUser: '🚀',
    },
    ALLOWED_REACTIONS,
  );
  assert.deepEqual([...counts.entries()], [
    ['👍', 2],
    ['🔥', 1],
  ]);
  assert.deepEqual([...reactionCounts(null, ALLOWED_REACTIONS)], []);
  assert.deepEqual([...reactionCounts([], ALLOWED_REACTIONS)], []);
});

test('source and deployed chat use the validators and remain identical', () => {
  const deployedChat = readFileSync(repositoryRoot + 'chat.js', 'utf8');
  const sourceChat = readFileSync(repositoryRoot + 'src/pwa/chat.js', 'utf8');
  const deployedHelpers = readFileSync(repositoryRoot + 'chat-security.mjs', 'utf8');
  const sourceHelpers = readFileSync(repositoryRoot + 'src/pwa/chat-security.mjs', 'utf8');
  assert.equal(deployedChat, sourceChat);
  assert.equal(deployedHelpers, sourceHelpers);
  assert.match(deployedChat, /safeChatPhoto\(message\.img\)/);
  assert.match(deployedChat, /reactionCounts\(reactions, REACTIONS\)/);
  assert.doesNotMatch(deployedChat, /src=["']?\s*["']?\s*\+\s*message\.img/);
});
