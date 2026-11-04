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
// It also pings the admins when someone asks to join the team (`{ request: true }`).
// Each message is announced once (`pushlog/{id}`), each caller is rate-limited, every call has a timeout ⏱️.
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

// ⏱️ the time limit of every Firestore / push call (ms) & the freshness window of a message (ms)
const CALL_TIMEOUT = 8000;
const FRESH_WINDOW = 120000;
// 🚦 the rate limit: at most RATE_LIMIT calls per caller per RATE_WINDOW (best effort, per server instance)
const RATE_LIMIT = 20;
const RATE_WINDOW = 60000;
const callsByUid = new Map();

/**
 * `isRateLimited` - Function 🚦
 *
 * @param { string } uid - the caller's uid
 * @returns { boolean } - true when the caller made too many calls in the last minute
 */
function isRateLimited(uid) {
  const now = Date.now();
  const recentCalls = (callsByUid.get(uid) || []).filter((time) => now - time < RATE_WINDOW);
  recentCalls.push(now);
  callsByUid.set(uid, recentCalls);
  return recentCalls.length > RATE_LIMIT;
}

/**
 * `callFirestore` - Async Function 📡
 *
 * @param { string } path - a path under the documents root (e.g. `chat/abc`, `push?pageSize=300`, `:runQuery`)
 * @param { string } token - the caller's Firebase ID token
 * @param { object } [options] - { method, body } for writes & queries
 * @returns { Promise<object|null> } - the REST JSON, or null when Firestore refused it (or timed out)
 */
async function callFirestore(path, token, options) {
  try {
    const settings = options || {};
    const response = await fetch(FIRESTORE + (path.startsWith(':') ? '' : '/') + path, {
      method: settings.method || 'GET',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: settings.body ? JSON.stringify(settings.body) : undefined,
      signal: AbortSignal.timeout(CALL_TIMEOUT),
    });
    return response.ok ? response.json() : null;
  } catch (error) {
    return null;
  }
}

/**
 * `claimOnce` - Async Function 🔒
 *
 * Writes `pushlog/{key}` (create only, the rules refuse a second one): the idempotency key.
 *
 * @param { string } key - the message id, or `req_<uid>` for an access request
 * @param { string } token - the caller's Firebase ID token
 * @returns { Promise<boolean> } - true the first time only
 */
async function claimOnce(key, token) {
  const created = await callFirestore('pushlog?documentId=' + encodeURIComponent(key), token, {
    method: 'POST',
    body: { fields: { at: { integerValue: String(Date.now()) } } },
  });
  return !!created;
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
 * `ageOf` - Function ⏱️
 *
 * @param { object } fields - Firestore REST fields with a `ts` timestamp
 * @returns { number } - how old the doc is (ms), Infinity when it has no time
 */
const ageOf = (fields) => {
  const time = Date.parse((fields && fields.ts && fields.ts.timestampValue) || '');
  return Number.isFinite(time) ? Date.now() - time : Infinity;
};

/**
 * `devicesOf` - Function 📲
 *
 * @param { object } pushDoc - a `push/{uid}` REST doc
 * @returns { Array<object> } - its web push subscriptions { endpoint, keys }
 */
function devicesOf(pushDoc) {
  const deviceMap =
    (pushDoc && pushDoc.fields && pushDoc.fields.devices && pushDoc.fields.devices.mapValue) || {};
  return Object.values(deviceMap.fields || {})
    .map((device) => (device.mapValue && device.mapValue.fields) || {})
    .filter((deviceFields) => stringOf(deviceFields, 'endpoint').startsWith('https://'))
    .map((deviceFields) => ({
      endpoint: stringOf(deviceFields, 'endpoint'),
      keys: { p256dh: stringOf(deviceFields, 'p256dh'), auth: stringOf(deviceFields, 'auth') },
    }));
}

/**
 * `sendAll` - Async Function 🚀
 *
 * @param { Array<object> } devices - the push subscriptions
 * @param { string } payload - the notification JSON
 * @returns { Promise<{ sent: number, failed: number }> } - how many pushes went out
 */
async function sendAll(devices, payload) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const results = await Promise.allSettled(
    devices.map((subscription) =>
      webPush.sendNotification(subscription, payload, { TTL: 3600, urgency: 'high', timeout: CALL_TIMEOUT }),
    ),
  );
  const sent = results.filter((result) => result.status === 'fulfilled').length;
  return { sent, failed: results.length - sent };
}

/**
 * `notifyAdmins` - Async Function 🛂
 *
 * Someone asked to join the team: push "new request" to every admin's devices (once per person).
 *
 * @param { string } uid - the requester's uid (from their token)
 * @param { string } token - the requester's Firebase ID token
 * @returns { Promise<{ status: number, json: object }> } - the answer to send
 */
async function notifyAdmins(uid, token) {
  // 📖 my own request (must exist and be fresh)
  const request = await callFirestore('requests/' + uid, token);
  if (!request || ageOf(request.fields) > FRESH_WINDOW)
    return { status: 403, json: { error: 'no fresh request' } };
  if (!(await claimOnce('req_' + uid, token))) return { status: 200, json: { sent: 0, duplicate: true } };
  // 🎖️ the admins (`team` docs whose role is admin, the only team docs a newcomer may read)
  const rows =
    (await callFirestore(':runQuery', token, {
      method: 'POST',
      body: {
        structuredQuery: {
          from: [{ collectionId: 'team' }],
          where: {
            fieldFilter: { field: { fieldPath: 'role' }, op: 'EQUAL', value: { stringValue: 'admin' } },
          },
          limit: 20,
        },
      },
    })) || [];
  const adminUids = rows.filter((row) => row.document).map((row) => row.document.name.split('/').pop());
  // 📲 their devices
  const pushDocs = await Promise.all(adminUids.map((adminUid) => callFirestore('push/' + adminUid, token)));
  const devices = pushDocs.flatMap(devicesOf);
  const payload = JSON.stringify({
    title: "Nouvelle demande d'accès · New access request",
    body: (stringOf(request.fields, 'name') + ' · ' + stringOf(request.fields, 'email')).slice(0, 140),
    tag: 'ltf-team',
  });
  return { status: 200, json: await sendAll(devices, payload) };
}

/**
 * `notifyTeam` - Async Function 💬
 *
 * A teammate posted: push it to every other approved teammate's devices (once per message).
 *
 * @param { string } uid - the sender's uid (from their token)
 * @param { string } messageId - the new message id
 * @param { string } token - the sender's Firebase ID token
 * @returns { Promise<{ status: number, json: object }> } - the answer to send
 */
async function notifyTeam(uid, messageId, token) {
  // 📖 the message, read with the sender's token (refused for strangers by the rules 🛡️)
  const message = await callFirestore('chat/' + messageId, token);
  if (!message) return { status: 403, json: { error: 'message not readable' } };
  const fields = message.fields || {};
  // only the author may announce their own message, and only a fresh one ⏱️
  if (stringOf(fields, 'uid') !== uid || ageOf(fields) > FRESH_WINDOW)
    return { status: 403, json: { error: 'not your message, or too old' } };
  // 🔒 once per message (a second call is a replay)
  if (!(await claimOnce(messageId, token))) return { status: 200, json: { sent: 0, duplicate: true } };

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

  // 👥 the approved team (a removed waiter keeps no notifications) & their devices, except mine
  const [teamDocs, pushDocs] = await Promise.all([
    callFirestore('team?pageSize=300', token),
    callFirestore('push?pageSize=300', token),
  ]);
  const teamUids = new Set(
    ((teamDocs && teamDocs.documents) || []).map((teamDoc) => teamDoc.name.split('/').pop()),
  );
  // 📣 the teammates named in the text with @FirstName get their own « mentioned you » notification
  const mentionedUids = mentionsOf(text, (teamDocs && teamDocs.documents) || [], uid);
  const mentionPayload = JSON.stringify({
    title: '📣 ' + (stringOf(fields, 'name') || 'Les Trois Forts') + ' vous a mentionné · mentioned you',
    body: text.slice(0, 140),
    tag: 'ltf-mention-' + messageId,
  });
  const teamPushDocs = ((pushDocs && pushDocs.documents) || []).filter((pushDoc) => {
    const ownerUid = pushDoc.name.split('/').pop();
    return ownerUid !== uid && teamUids.has(ownerUid);
  });
  const isMentioned = (pushDoc) => mentionedUids.has(pushDoc.name.split('/').pop());
  const [teamResult, mentionResult] = await Promise.all([
    sendAll(teamPushDocs.filter((pushDoc) => !isMentioned(pushDoc)).flatMap(devicesOf), payload),
    sendAll(teamPushDocs.filter(isMentioned).flatMap(devicesOf), mentionPayload),
  ]);
  return {
    status: 200,
    json: {
      sent: teamResult.sent + mentionResult.sent,
      failed: teamResult.failed + mentionResult.failed,
      mentioned: mentionResult.sent,
    },
  };
}

/**
 * `mentionsOf` - Function 📣
 *
 * The teammates a message names with @FirstName (same rule as the chat: the first word of their name,
 * any case, accents kept).
 *
 * @param { string } text - the message text
 * @param { Array<object> } teamDocs - the `team` docs (REST format)
 * @param { string } senderUid - the sender (never notified twice)
 * @returns { Set<string> } - the uids named in the text
 */
function mentionsOf(text, teamDocs, senderUid) {
  const named = new Set(
    Array.from(String(text || '').matchAll(/@([\p{L}][\p{L}\p{M}'-]*)/gu), (match) => match[1].toLowerCase()),
  );
  const uids = new Set();
  if (!named.size) return uids;
  teamDocs.forEach((teamDoc) => {
    const memberUid = teamDoc.name.split('/').pop();
    const firstName = stringOf(teamDoc.fields, 'name').trim().split(/\s+/)[0].toLowerCase();
    if (memberUid !== senderUid && firstName && named.has(firstName)) uids.add(memberUid);
  });
  return uids;
}

/**
 * `handler` - Async Function 🚀
 *
 * The Vercel entry point: POST { id } (a new message) or { request: true } (a new access request)
 * with the caller's Firebase token; answers { sent, failed } (or { duplicate: true }).
 *
 * @param { object } request - the Node.js request (Vercel parses the JSON body)
 * @param { object } response - the Node.js response
 * @returns { Promise<void> }
 */
module.exports = async function handler(request, response) {
  // only POST 📮
  if (request.method !== 'POST') return response.status(405).json({ error: 'POST only' });
  // the caller's token & uid, the message id
  const token = String(request.headers.authorization || '').replace(/^Bearer\s+/i, ''),
    uid = uidOfToken(token),
    body = request.body || {},
    messageId = String(body.id || '')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 40);
  if (!token || !uid || !process.env.VAPID_PRIVATE_KEY)
    return response.status(400).json({ error: 'missing token or server key' });
  // 🚦 too many calls?
  if (isRateLimited(uid)) return response.status(429).json({ error: 'too many requests' });
  try {
    const result =
      body.request === true
        ? await notifyAdmins(uid, token)
        : messageId
          ? await notifyTeam(uid, messageId, token)
          : { status: 400, json: { error: 'missing id' } };
    response.status(result.status).json(result.json);
  } catch (error) {
    console.error('[notify]', error);
    response.status(500).json({ error: 'push failed' });
  }
};
