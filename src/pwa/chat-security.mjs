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
 * @name: Les Trois Forts - Team Chat Security
 * @file: pwa/chat-security.mjs
 * @type: JavaScript (ES module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> import { escapeHtml, safeChatPhoto } from './chat-security.mjs';
 *    -|>
 *
 */

// 🛡️ Small, dependency-free validators shared by the browser chat and the Node regression tests.

/**
 * `escapeHtml` - Function 🛡️
 *
 * Escapes every character that can change HTML text or a quoted attribute.
 *
 * @param { any } value - the untrusted value (`null` & `undefined` become '')
 * @returns { string } - escaped HTML text
 */
export const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

/**
 * `safeChatPhoto` - Function 📷
 *
 * Accepts only the inline JPEG, PNG or WebP data URLs used by the chat. Remote URLs,
 * SVG, markup and attribute-breaking input are rejected instead of being rendered.
 *
 * @param { any } value - the Firestore `img` value or a locally shrunk photo
 * @returns { string } - the validated data URL, or an empty string
 */
export function safeChatPhoto(value) {
  const photo = String(value || '');
  return photo.length < 900000 && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)
    ? photo
    : '';
}

/**
 * `reactionCounts` - Function 😍
 *
 * Counts only reactions supported by the app. Unknown Firestore values never reach HTML.
 *
 * @param { any } reactions - the Firestore reaction map, keyed by user id
 * @param { string[] } allowedReactions - the reactions supported by the user interface
 * @returns { Map<string, number> } - emoji -> number of reactions
 */
export function reactionCounts(reactions, allowedReactions) {
  const counts = new Map();
  const values = reactions && typeof reactions === 'object' && !Array.isArray(reactions) ? Object.values(reactions) : [];
  for (const emoji of values) {
    if (!allowedReactions.includes(emoji)) continue;
    counts.set(emoji, (counts.get(emoji) || 0) + 1);
  }
  return counts;
}
