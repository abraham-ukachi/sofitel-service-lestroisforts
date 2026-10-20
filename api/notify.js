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
 * @name: Les Trois Forts - Chat Push Server
 * @file: api/notify.js
 * @type: JavaScript (Vercel Node.js serverless function)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> POST /api/notify  { id }  (Authorization: Bearer <Firebase ID token>)
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 📣 Chat push server: when a waiter posts in the team chat, the app calls this function with the new
// message id. It reads the message & the teammates' push subscriptions from Firestore *with the sender's
// own Firebase token* (so the Firestore rules still apply 🛡️), then sends a web push to every other device.
// The private VAPID key lives only in the Vercel environment (`VAPID_PRIVATE_KEY`), never in the repo 🔐.

// import the web push helper (VAPID signing + payload encryption) 📦
const webPush = require('web-push');

// the Firestore REST root of the `les-trois-forts` project 🗃️
const FIRESTORE =
  'https://firestore.googleapis.com/v1/projects/les-trois-forts/databases/(default)/documents';

// the public VAPID key (same as `VAPID_PUBLIC_KEY` in chat.js) & the contact of the push sender
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BOHVPWR9iG-S4nCjzn6k6o2hahvWKOaAaix3BxmgDW4MS6I7Fv4GIyMIECUAaE8hPCPBX1rAKSsJEHhKMeIS5_A';
const VAPID_SUBJECT = 'mailto:abrahamukachi@gmail.com';

/**
 * `readFirestore` - Async Function 📖
 *
 * @param { string } path - a document or collection path (e.g. `chat/abc`, `push?pageSize=300`)
 * @param { string } token - the caller's Firebase ID token
 * @returns { Promise<object|null> } - the REST JSON, or null when Firestore refused it
 */
async function readFirestore(path, token) {
  const response = await fetch(FIRESTORE + '/' + path, { headers: { Authorization: 'Bearer ' + token } });
  return response.ok ? response.json() : null;
}

/**
 * `uidOfToken` - Function 🆔
 *
 * Reads the user id inside a Firebase ID token (the token itself is checked by Firestore on every read).
 *
 * @param { string } token - the Firebase ID token
 * @returns { string } - its `user_id` (empty when unreadable)
 */
function uidOfToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload.user_id || payload.sub || '';
  } catch (error) {
    return '';
  }
}

/**
 * `stringOf` - Function 🔤
 *
 * @param { object } fields - Firestore REST fields
 * @param { string } name - a field name
 * @returns { string } - the field as text (empty when missing)
 */
const stringOf = (fields, name) => (fields && fields[name] && fields[name].stringValue) || '';

/**
 * `handler` - Async Function 🚀
 *
 * The Vercel entry point: POST { id } with the sender's Firebase token, answers { sent, failed }.
 *
 * @param { object } request - the Node.js request (Vercel parses the JSON body)
 * @param { object } response - the Node.js response
 * @returns { Promise<void> }
 */
module.exports = async function handler(request, response) {
  // only POST 📮
  if (request.method !== 'POST') return response.status(405).json({ error: 'POST only' });
  // the sender's token & the message id
  const token = String(request.headers.authorization || '').replace(/^Bearer\s+/i, ''),
    messageId = String((request.body && request.body.id) || '').replace(/[^A-Za-z0-9]/g, '');
  if (!token || !messageId || !process.env.VAPID_PRIVATE_KEY)
    return response.status(400).json({ error: 'missing token, id or server key' });

  // 📖 the message, read from Firestore with the sender's token (refused when the token is bad)
  const message = await readFirestore('chat/' + messageId, token);
  if (!message) return response.status(403).json({ error: 'message not readable' });
  const fields = message.fields || {},
    senderUid = stringOf(fields, 'uid');
  // only the author may announce their own message, and only a fresh one (no replays) ⏱️
  const age = Date.now() - Date.parse((fields.ts && fields.ts.timestampValue) || 0);
  if (senderUid !== uidOfToken(token) || !(age < 120000))
    return response.status(403).json({ error: 'not your message, or too old' });

  // ✉️ the notification: the sender's name & the text (or "📷 Photo"), cut to 140 chars
  const text = stringOf(fields, 'text'),
    hasPhoto = !!stringOf(fields, 'img'),
    hasGif = !!stringOf(fields, 'gif'),
    hasSticker = !!stringOf(fields, 'sticker');
  const payload = JSON.stringify({
    title: stringOf(fields, 'name') || 'Les Trois Forts',
    body: (text || (hasPhoto ? '📷 Photo' : hasGif ? '🎞️ GIF' : hasSticker ? '🏷️ Sticker' : '')).slice(
      0,
      140,
    ),
    tag: 'ltf-chat',
  });

  // 📲 every teammate's devices (`push/{uid}.devices`), except the sender's
  const pushDocs = (await readFirestore('push?pageSize=300', token)) || {};
  const devices = [];
  (pushDocs.documents || []).forEach((pushDoc) => {
    const ownerUid = pushDoc.name.split('/').pop();
    if (ownerUid === senderUid) return;
    const deviceMap = (pushDoc.fields && pushDoc.fields.devices && pushDoc.fields.devices.mapValue) || {};
    Object.values(deviceMap.fields || {}).forEach((device) => {
      const deviceFields = (device.mapValue && device.mapValue.fields) || {};
      const endpoint = stringOf(deviceFields, 'endpoint');
      if (endpoint)
        devices.push({
          endpoint,
          keys: { p256dh: stringOf(deviceFields, 'p256dh'), auth: stringOf(deviceFields, 'auth') },
        });
    });
  });

  // 🚀 send them all (expired devices simply fail, they get replaced when the waiter turns the bell on again)
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const results = await Promise.allSettled(
    devices.map((subscription) =>
      webPush.sendNotification(subscription, payload, { TTL: 3600, urgency: 'high' }),
    ),
  );
  const sent = results.filter((result) => result.status === 'fulfilled').length;
  response.status(200).json({ sent, failed: results.length - sent });
};
