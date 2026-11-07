---
name: ltf-project-overview
description: Architecture and map of the Les Trois Forts Service Academy PWA (Rust/wasm + shared JS modules, Firebase, Vercel). Load first for any work on this repo, or as a model for a similar restaurant / staff-training PWA.
---

# Les Trois Forts — Service Academy: project overview 🗺️

## What it is
A pocket training app for the floor team of Les Trois Forts (Sofitel Marseille Vieux-Port). Every dish, wine,
champagne, cocktail, coffee, tea, digestif and cheese is a flash card (photo, « À dire au client » line, EN version,
pronunciation, allergens). Game modes: study deck, quiz, 60 s chrono, bar game (build the cocktail), floor-plan game,
exam with certificate, Mise en place, Simulation de service. Plus: daily briefing, team chat, scanner, leaderboard,
owner dashboard, live content editing. French UI first, English second. Installable, offline after first load.

- Live: https://sofitel-service-lestroisforts.vercel.app (Vercel, static + 2 serverless functions in `api/`).
- Source mirror: this public GitHub repo. It holds the **contents of `rust/dist`** (the build output); the readable
  sources are under `src/`. Vercel is NOT git-linked: deploys are API uploads (see `ltf-build-test-release`).
- Owner: Abraham Ukachi, a server on the team. Users: approved team members (Google sign-in).

## Two layouts — don't mix them up
| Dev workspace | In this repo | What |
|:--|:--|:--|
| `pwa/` | `src/pwa/` (+ built copies at root) | shared page `index.html`, JS modules, data, assets |
| `rust/ltf/src/*.rs` | `src/rust/ltf/src/` | the Rust crate (the app that runs live) |
| `rust/tools/` | `src/rust/tools/` | data generators, index maker, style checker, scan embeddings |
| `rust/web/` | `src/rust/web/` + root | `sw.js`, `vercel.json`, `firestore.rules`, `api/`, docs, these skills |
| `rust/tests/` | `src/rust/tests/` | jsdom tests (`run_all.sh`) |
| `rust/dist/` | repo root | what is deployed |

## Architecture
- **Core app = Rust → WebAssembly** (`ltf.js` + `ltf_bg.wasm`, wasm-bindgen 0.2.129). Crate files: `lib.rs`
  (exports, `window.LTFrecord`), `state.rs` (progress/XP), `build.rs` (renders screens, `apply_live_content`),
  `ui.rs` (router, events), `media.rs`, `util.rs`.
- **`pwa/app.js` = the original JS app**, kept as the reference: `tests/compare.js` renders both with a seed and
  demands 0 diffs. Change behaviour in both, or neither.
- **Shared ES modules** (loaded by `index.html` in both builds, no Rust change needed): `cloud.js` (Google login +
  progress sync), `chat.js`, `board.js` (leaderboard), `admin.js` + `admin-edit.js` (owner dashboard),
  `content.js` + `content-boot.js` (live content), `about.js`, `setup.js` (Mise en place), `sim*.js` (simulation),
  `scan.js` (scanner), `swipe.js`, `welcome.js` (welcome slides + `APP_VERSION`).
- **The Rust build has no `window.LTF`.** Modules that need menu data must load it themselves (see
  `ensureData()` in `sim.js`). Test modules without `window.LTF` preloaded.
- **Data**: `data.js` (`window.LTF`: dishes with `svc`/`alg`/`pict`, `hq` fact cards, `jour` briefing, `fromages`,
  `taste`, `fetes`…), `i18n.js` (EN + ⓘ notes) and `i18n_fr.js` (FR notes, same keys), `fun.js`, `images.js`
  (`window.LTF_IMG`), `names.js` (encrypted, see privacy). `tools/gen_data.js` turns them into JSON for the crate.
- **Live content**: Firestore `content/{section}` = `{data: JSON string, ts}` edited in the dashboard; downloaded at
  start into `localStorage ltf_content_v1`, merged before the app boots. **A live override beats `data.js`**: after
  editing data, check whether an override exists or your change won't show.
- **Router**: URL hash `#/<view>[/<chapter>]`; in-progress decks/quizzes resume from `sessionStorage ltf_run`.
- **Service worker** `sw.js`: precache list `ASSETS`, cache name `CACHE` (`ltf-vNN` JS / `ltf-vNN-rs` Rust); bump it
  every release. Skips `/api/`, `/__/`, `/models/`, cross-origin. Scanner model cache is separate and persistent.

## Chapters (ids)
`jour` briefing · `hiver` winter carte · `dej` lunch · `diner` dinner · `deg` daily tasting menu · `dess` desserts ·
`from` cheese board · `cock` cocktails & softs · `cafe` · `vins` · `champ` · `dig` digestifs · `acc` pairings ·
`plan` floor plan · `fetes` festive menus (dated) · Mise en place (`setup.js`) · Simulation (`sim.js`).

## Stable names other code depends on
Never rename: `window.LTF*` functions, DOM ids/classes, storage keys (`ltf_v1`, `ltf_sync`, `ltf_run`,
`ltf_chat_seen`, `ltf_photos` IndexedDB, `ltf_content_v1`, `ltf_sim_*`, `ltf_setup_*`), Firestore fields, cache names.

## Hard rules
- 🙈 No guest/staff personal data anywhere public. Briefing names only via encrypted `names.js`
  (`tools/enc_names.py`); the unlock code is never written in the repo.
- 🇫🇷 French cards are the truth; English is a translation. Allergens are indicative until an official card exists.
- Say **« rang »** (a waiter's section), never "range".
- Dialogs are in-page (`.cdlg` style / `confirmAction`); never `window.confirm/alert/prompt`.
- Icons are single-colour outline SVG; no coloured emoji as UI icons (content emojis are fine).
- Third-party images: record source, author, licence in `images.js` + `img_src/map.tsv`; AI images marked `generated`.
- Proprietary licence header on every file.

## Where history lives
`CHANGELOG.md` (per release), `about.js` `TIMELINE` (in-app), and the dev workspace `PROJECT_NOTES.md`.
