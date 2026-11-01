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
 * @name: Les Trois Forts - Owner Dashboard Server
 * @file: api/admin.js
 * @type: JavaScript (Vercel Node.js serverless function)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> GET /api/admin  (Authorization: Bearer <the owner's Firebase ID token>)
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🛠️ Owner dashboard server: answers the live deployment info (deployment, commit, region, Node.js,
// push key present) to the owner of the app only.
// 🔐 The caller's Firebase ID token is checked here for real: its RS256 signature against Google's
// public certificates, its project (audience & issuer), its dates, and a verified owner email.
// Anybody else gets a 401 / 403 and nothing else. No secret is ever sent back.

// import the signature checker of Node.js 🔏
const crypto = require('crypto');

// the Firebase project & the owner of the app 👑
const PROJECT_ID = 'les-trois-forts';
const OWNER_EMAIL = 'abrahamukachi@gmail.com';
// the public certificates that sign every Firebase ID token 📜
const CERTIFICATES_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
// ⏱️ the time limit of the certificate download (ms) & the clock tolerance (s)
const CALL_TIMEOUT = 8000;
const CLOCK_SKEW = 60;

// the downloaded certificates & when they expire (cached per server instance) 🗃️
let certificates = null;
let certificatesExpireAt = 0;

/**
 * `base64UrlDecode` - Function 🔤
 *
 * @param { string } text - a base64url text (a part of a JWT)
 * @returns { Buffer } - its bytes
 */
function base64UrlDecode(text) {
  return Buffer.from(String(text).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/**
 * `loadCertificates` - Async Function 📜
 *
 * @returns { Promise<object> } - Google's token certificates { keyId: PEM }, cached as Google says
 */
async function loadCertificates() {
  if (certificates && Date.now() < certificatesExpireAt) return certificates;
  const answer = await fetch(CERTIFICATES_URL, { signal: AbortSignal.timeout(CALL_TIMEOUT) });
  if (!answer.ok) throw new Error('certificates ' + answer.status);
  certificates = await answer.json();
  // 🗓️ keep them as long as their Cache-Control max-age allows (1 hour by default)
  const maxAge = /max-age=(\d+)/.exec(answer.headers.get('cache-control') || '');
  certificatesExpireAt = Date.now() + 1000 * (maxAge ? Number(maxAge[1]) : 3600);
  return certificates;
}

/**
 * `verifyToken` - Async Function 🔐
 *
 * @param { string } token - a Firebase ID token (JWT)
 * @returns { Promise<object | null> } - its payload when it is genuine & still valid, else null
 */
async function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  let header, payload;
  try {
    header = JSON.parse(base64UrlDecode(parts[0]).toString('utf8'));
    payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf8'));
  } catch (error) {
    return null;
  }
  // 🧾 the right algorithm & a known key
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
  const certificate = (await loadCertificates())[header.kid];
  if (!certificate) return null;
  // 🔏 the signature
  const isSigned = crypto.verify(
    'RSA-SHA256',
    Buffer.from(parts[0] + '.' + parts[1]),
    certificate,
    base64UrlDecode(parts[2]),
  );
  if (!isSigned) return null;
  // 🎯 our project, still valid, a real user
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== PROJECT_ID) return null;
  if (payload.iss !== 'https://securetoken.google.com/' + PROJECT_ID) return null;
  if (!(payload.exp > now - CLOCK_SKEW) || !(payload.iat < now + CLOCK_SKEW)) return null;
  if (!(payload.auth_time < now + CLOCK_SKEW)) return null;
  if (typeof payload.sub !== 'string' || !payload.sub) return null;
  return payload;
}

/**
 * The Vercel entry point: GET with the owner's Firebase token; answers the live deployment info.
 *
 * @param { object } request - the Node.js request
 * @param { object } response - the Node.js response
 * @returns { Promise<void> }
 */
module.exports = async function handler(request, response) {
  // 🙈 never cached anywhere
  response.setHeader('Cache-Control', 'no-store');
  // only GET 📮
  if (request.method !== 'GET') return response.status(405).json({ error: 'GET only' });
  const token = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  let payload = null;
  try {
    payload = await verifyToken(token);
  } catch (error) {
    console.error('[admin]', error);
    return response.status(503).json({ error: 'cannot check the token' });
  }
  if (!payload) return response.status(401).json({ error: 'sign in first' });
  // 👑 the owner only
  if (payload.email !== OWNER_EMAIL || payload.email_verified !== true)
    return response.status(403).json({ error: 'owner only' });
  response.status(200).json({
    deployment: process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || '',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || '',
    environment: process.env.VERCEL_ENV || '',
    region: process.env.VERCEL_REGION || process.env.AWS_REGION || '',
    node: process.version,
    push: !!process.env.VAPID_PRIVATE_KEY,
    time: Date.now(),
  });
};
