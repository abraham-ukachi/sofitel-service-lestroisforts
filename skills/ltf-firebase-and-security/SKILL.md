---
name: ltf-firebase-and-security
description: Firebase (Auth + Firestore) model, team lock, rules versioning and the safe way to publish rules through the console, plus Vercel functions, CSP and the auth-domain proxy for the Les Trois Forts app. Load for sign-in, chat, push, dashboard, live content, simulation online play or any rules change.
---

# Firebase & security 🔒

## Setup
- Firebase project `les-trois-forts`, **Spark (free)** plan: Firestore only, **no Storage** (chat photos and voice
  notes are inline data URLs, < ~950 KB per doc). Firebase JS SDK from `gstatic`, imported **lazily** by modules.
  The web config is public by design; nothing else secret goes in the repo.
- **Google sign-in runs on the app's own domain**: `vercel.json` rewrites `/__/auth/:path*` →
  `https://les-trois-forts.firebaseapp.com/__/auth/:path*`; `AUTH_DOMAIN` in `cloud.js`/`chat.js` = live host.
  If the domain changes: update the rewrite, Firebase authorized domains and the OAuth client's JS origin +
  redirect URI (`/__/auth/handler`). Security headers skip `/__/auth/` (its iframe must be frameable by self).

## Team lock
- Owner (verified `abrahamukachi@gmail.com`) is always admin. Others sign in → `requests/{uid}` + push to admins →
  approved into `team/{uid}` {role member|admin}. Chat, push, board, simulation are **member-only**.
- Rules helpers: `isOwner()`, `isMember()`; every write validates its fields (types, sizes, allowed keys,
  `ts == request.time`).

## Collections (add new ones to `COLLECTIONS` in `admin.js` so the dashboard can see/weigh them)
`users/{uid}` progress sync · `team` · `requests` · `chat` (+ `typing/{uid}`, `seen/{uid}`) · `board/{uid}` monthly XP ·
`push/{uid}` + `pushlog/{key}` (idempotent, create-only) · `content/{section}` (public read, owner write) ·
`config/announce`, `config/resets` · `sim/{code}` (online game, 4-digit code, 6 h life) · `simlist/{random id}`
(public list entry; random id so private codes aren't exposed by listing `sim`).

## Rules: versioned file + one-line console publish
- `rust/web/firestore.rules` is the formatted source of truth (copied to `src/rust/web/`).
- The console editor **corrupts multi-line pastes** (autocomplete). Publish each change as a **single-line
  insert** (e.g. a whole `match /x/{id} { allow …; }` on one line), above `match /push/{uid}` or right after the
  related block. Firestore ORs duplicate `match` blocks for the same path, so an extra one-line block is safe.
- After publishing, read the console's publish history ("Today • HH:MM") and check for red error markers. Report
  the time. The repo file may hold the formatted equivalent rather than the exact console text.
- Queries must be provable by rules: `list` needs `request.query.limit <= N` and filters the rule can see
  (e.g. `resource.data.host == request.auth.uid`). Clock arithmetic on `resource.data` can't be proven for a query.
- Test rules with a Firebase stub in jsdom (or the emulator if available). Say which one you used.

## Vercel functions (`api/`)
- `api/notify.js`: Web Push (VAPID env vars), rate limit 20/min/uid, 8 s timeouts, pushlog idempotency, members only.
- `api/admin.js`: verifies the Firebase ID token (RS256 vs Google certs, aud/iss, owner email) before answering.
- First deploy with a function: check it answers 405 on GET.

## Browser hardening
- CSP in `vercel.json` (self + gstatic, apis.google, googleapis, giphy, googleusercontent, huggingface for the
  scanner model; `wasm-unsafe-eval`). **A new external host must be added — add none without need.**
- Also XFO DENY, nosniff, Referrer-Policy, COOP same-origin-allow-popups, Permissions-Policy camera/microphone=(self).
- Escape every remote value (`escapeHtml`), whitelist ids/photos/reactions (`isSafeId`, `isSafePhoto`), validate
  every remote doc with a `clean…()` before use. Test: `tests/chat_safety.js`.
- Owner-only screens check the verified owner email client-side **and** rules enforce it server-side.
