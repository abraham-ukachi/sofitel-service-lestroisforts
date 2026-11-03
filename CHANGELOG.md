# Changelog

All notable changes to this project will be documented in this file. Versions follow the service-worker cache (`ltf-vNN` → `0.NN.0`), see [CONTRIBUTING.md](./CONTRIBUTING.md#git-commit-messages) for the commit guidelines.

### 0.65.0 (2026-11-03)

* :lipstick: Dashboard confirmations use the app's own dialog (icon, title, Annuler / red action, Escape & Enter) instead of the system `confirm()`
* :bug: Carte editor: FR/EN descriptions (cheeses) no longer show "[object Object]" as row subtitles
* :sparkles: Credits: minimal rows (grip, avatar, inline name & role, ✕), drag by ⠿ to reorder with the rows sliding out of the way; ↑ button removed; Publish glows when there are unpublished changes

### 0.64.0 (2026-11-03)

* :sparkles: Tap the rank card (Accueil or Profil) to slide up your own stats drawer, the same one as a teammate's in the leaderboard (14-day chart, month XP, streak, mastery, answers, exam, XP sources). Works signed out too, from this phone's progress

### 0.63.1 (2026-11-03)

* :bug: Dashboard: long chat messages no longer widen the Équipe columns past the screen (icon buttons visible again)

### 0.63.0 (2026-11-03)

* :lipstick: Dashboard Équipe: every action (accept, refuse, admin, remove, reset XP, delete…) is a round icon button on the right of its row, vertically centred, with a tooltip; each card shows its count
* :lipstick: Dashboard Annonce: live preview of the banner, a 500-character counter and an on / off switch
* :lipstick: Dashboard Crédits: avatar rows with stacked name & role fields, ↑ / 🗑️ icon buttons and a dashed « Ajouter » button
* :lipstick: Dashboard Carte: styled fields, switches for yes / no fields; every dashboard icon is centred

### 0.62.0 (2026-11-03)

* :lipstick: Dashboard overview: four big stat cards (a gold « Demandes à valider » card opens the Équipe tab), a 14-day team XP bar chart with the week-on-week trend, and the top 3 with their photos
* :lipstick: Dashboard: round avatars (Google photo or coloured initials) on every person row, and a two-column layout on laptop & desktop

### 0.61.1 (2026-11-02)

* :bug: About drawer: the Infos / Parcours / Crédits chips stay pinned at the top while the timeline scrolls

### 0.61.0 (2026-11-02)

* :sparkles: About drawer (`about.js`): Profil › « À propos de l'app » slides up a drawer with three chips: Infos (big logo, what the app is, the developer Abraham Ukachi with GitHub & X links), Parcours (a vertical timeline of the journey since 0.1.0, major milestones in gold) and Crédits (movie-style credits rolling from the bottom to the top, touch to pause)
* :sparkles: Dashboard: new « Crédits » tab to add, reorder & delete the people in the credits (Firestore `content/credits`, cached for offline use)

### 0.60.0 (2026-11-02)

* :lipstick: Laptop & desktop: from 960 px the tab bar becomes a left sidebar, the content column is wider, sheets open as centred dialogs, and the scan / chat buttons, toasts & install button sit bottom-right
* :lipstick: Mouse & keyboard: hover feedback, themed thin scrollbars and a gold focus ring for keyboard users
* :mag: SEO: meta description, canonical link, robots meta, Open Graph & Twitter cards (hero image), JSON-LD `WebApplication` structured data, a `<noscript>` fallback with a real `<h1>`
* :mag: New `robots.txt` & `sitemap.xml`; the manifest no longer locks the app to portrait

### 0.59.0 (2026-11-01)

* :zap: Scan ranks the right dish / bottle first much more often: the photo is also read through two centred zooms (75 % & 55 %), so table, hands & background count less (simulated off-centre shots: top-1 72 % → 96 %)
* :zap: Scan: the label text weighs more, and the waiter's own photos & confirmed scans get a small head start
* :bento: Scan references rebuilt with the 4 dishes of the 31 Oct tasting menu (scan cache `ltf-scan-v4`)
* :sparkles: Typo-tolerant search: « Pidarnon » finds Château Pibarnon (1 typo, 2 for long words, also while typing), only when nothing matches exactly
* :lipstick: Dashboard redesign: compact segmented tabs, one search bar across the whole menu (tap a result to edit it), section tiles, tap-to-edit rows, a filter in every section, a sticky « Publier » bar that shows unpublished changes, and a search in Équipe
* :bento: Service-worker cache `ltf-v59-rs`

### 0.58.0 (2026-11-01)

* :sparkles: Red « Rupture » badge on out-of-stock wines in La Carte + a « Ruptures » list in the Briefing (Château Pibarnon blanc, Château Cruzeau Saint-Émilion Grand Cru, sheet of 31 Oct 2026)
* :bento: Service-worker cache `ltf-v58-rs`

### 0.57.0 (2026-11-01)

* :sparkles: New chapter « Menu Dégustation » 🎁: the surprise menu that changes every day, apart from the fixed dinner carte (the chapter « Dîner » is now the evening menu only)
* :memo: Tasting menu of Saturday 31 Oct 2026: tartare de maigre (aguachile), ravioles de Saint-Jacques, turbot & chou-fleur, suprême de volaille vadouvan, sablé amande vanille-rose & pamplemousse
* :memo: Retour de pêche of the sheet in the daily briefing
* :sparkles: Carte search highlights the matching letters 🖍️ (accent-insensitive)
* :bug: Search: « boeuf » now finds « bœuf » (œ / æ ligatures)
* :pencil2: Faux-filet de bœuf maturé: aged 2 months (not 1)
* :bento: New dish photos & service-worker cache `ltf-v57-rs`

### 0.56.0 (2026-11-01)

* :sparkles: Owner dashboard tabs: Aperçu, Gérer, Contenu, Annonce
* :sparkles: Gérer: approve / refuse / delete access requests, make admin or member, remove a teammate, reset a waiter's XP, delete chat messages & old photos, leaderboard entries and push devices
* :sparkles: Contenu: edit, add, reorder & delete dishes, wines, champagnes, cocktails, cheeses, fact cards, the daily briefing... live (`content/{section}`), applied on every phone's next start, one tap back to the built-in version
* :sparkles: Annonce: a message banner for the whole team (`config/announce`)
* :shield: `content-boot.js` crash guard: live content that stops the app from starting is set aside automatically
* :lock: Firestore rules: owner-only writes for `content`, `config`, and deleting accounts & push devices
* :bento: Bump the service-worker cache to `ltf-v56-rs`

### 0.55.0 (2026-11-01)

* :lock: Fair XP: the same card pays 100 % → 50 % → 25 % → 0 of its XP for its 1st, 2nd, 3rd and later right answers of the day (`xd` in the progress, synced), so replaying one easy round can't farm XP
* :lock: Chrono end bonus only pays the points above your record (replaying below it gives no bonus)
* :lipstick: The quiz feedback shows the XP really earned
* :bento: Bump the service-worker cache to `ltf-v55-rs`

### 0.54.0 (2026-11-01)

* :sparkles: Owner dashboard (Profil › Tableau de bord, owner's verified Google account only): live Firestore storage measured with Firestore's size rules against the 1 GiB Spark limit, per collection; team, access requests & every account with its last sync; chat activity, photos & GIF weight; leaderboard & learning totals; push devices; the live deployment; this phone's storage & caches
* :lock: `api/admin.js`: a Vercel function that verifies the Firebase ID token's Google RS256 signature, project, dates and owner email before answering the deployment info
* :lock: Firestore rules: the owner can read `users` and `pushlog` (for the dashboard)
* :bug: Quiz, exam & chrono never ask the same item twice in a round (until the whole chapter was asked) nor the same question with the same answer
* :bug: Answer choices that read the same (case, accents, spaces, punctuation) are never shown together, and never next to the right answer
* :bento: Bump the service-worker cache to `ltf-v54-rs`

### 0.53.0 (2026-11-01)

* :sparkles: Tap a teammate on the leaderboard: a bottom drawer slides up with a 14-day XP bar chart, their month XP, streak, mastered cards, right-answer rate, answers given, final exam, and where the XP came from (quiz, flashcards, chrono, exam, mistakes, revision, other games)
* :chart_with_upwards_trend: Count the XP of every save per day (last 30 days) and per activity (from the screen on display) in `ltf_board_v1`, synced to `board/{uid}` and merged across phones; XP from before this version shows as "Avant le suivi"
* :lock: Firestore rules: `board/{uid}` also accepts `right`, `wrong`, `exam` (0-100), `days` (<= 31) and `modes` (<= 7); every value is whitelisted and escaped again when shown
* :bento: Bump the service-worker cache to `ltf-v53-rs`

### 0.52.0 (2026-11-01)

* :trophy: Add a team leaderboard (`board.js`): a "Classement de l'équipe" row under the rank card on the home screen opens a podium + ranking with two tabs, this month (resets on the 1st) and all-time, showing each teammate's XP, streak and mastered cards
* :sparkles: Add a sixth welcome slide "Qui est le meilleur ?" introducing the leaderboard podium
* :lock: Firestore rules for `board/{uid}`: approved teammates read, each one writes only their own whole-number score with a server time
* :bento: Bump the service-worker cache to `ltf-v52-rs`

### 0.51.0 (2026-11-01)

* :lock: Sign in with Google through the app's own address: Vercel proxies `/__/auth/*` to Firebase and `authDomain` is the live host, so Google names `sofitel-service-lestroisforts.vercel.app` and Safari/iPhone keeps the sign-in (other hosts still use `les-trois-forts.firebaseapp.com`)
* :lock: Keep the security headers off the proxied sign-in pages and allow them in `frame-src 'self'`
* :bug: Service worker: never cache the `/__/` sign-in pages
* :bento: Bump the service-worker cache to `ltf-v51-rs`

### 0.50.0 (2026-11-01)

* :lock: Lock the team chat to approved members: a Google sign-in now sends an access request, an admin approves or refuses it in Profil > Équipe (approve all, remove, make admin), the owner is always admin, admins get a push for each new request
* :lock: Version the Firestore security rules (`rust/web/firestore.rules`): team-only reads, every chat field validated, server timestamps, one reaction per user, admins can moderate
* :lock: Escape and validate every chat value before it reaches the page (photo data URLs, reactions, message ids, reply colours) so a crafted database entry can't inject HTML
* :lock: Add security headers on Vercel: Content-Security-Policy, `frame-ancestors 'none'` + `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`
* :lock: Harden the push server (`api/notify.js`): one notification per message (`pushlog`), per-user rate limit, timeouts, error logs, approved teammates only
* :bug: Service worker: fall back to `index.html` for page navigations only, cache successful answers only (inside `waitUntil`), never cache `/api/`, version the scanner cache (`ltf-scan-v4`)
* :page_facing_up: Change the license from MIT to a proprietary All Rights Reserved license (LICENSE, every file header, README, CONTRIBUTING, package.json `UNLICENSED`)
* :bento: Bump the service-worker cache to `ltf-v50-rs`

### 0.49.0 (2026-10-21)

* :speech_balloon: Rewrite every "What to tell the guest" line (dishes, cocktails, softs, teas, coffee, digestifs, champagnes, cheeses) in French and English so it sounds like a waiter talking at the table, easy to learn by heart
* :speech_balloon: Make the wine and pairing-wine lines spoken too ("C'est un rouge de Provence, appellation Bandol..."), with the right French "de / du / d'" for each region
* :bento: Bump the service-worker cache to `ltf-v49-rs`

### 0.48.0 (2026-10-20)

* :lipstick: Show the chat's + as a plain centered sign (no circle behind it)
* :sparkles: Add a WhatsApp-like emoji panel: smiley button left in the composer, sections, recents, English & French search, a ⌫ delete key (`emoji.json` from emojibase, built by `rust/tools/gen_emoji.js`)
* :sparkles: Add a GIF tab (GIPHY trending + search) and a Stickers tab with 13 AI-made Les Trois Forts stickers that work offline (`stickers/*.webp`, precached)
* :lipstick: Show 1 to 3 emojis alone big in the bubble, and use the phone's colour emoji font everywhere
* :bento: Bump the service-worker cache to `ltf-v48-rs`

### 0.47.0 (2026-10-20)

* :lipstick: Center the labels of the welcome screen buttons (Passer, Suivant, Commencer)
* :sparkles: Show the app version (V0.47) as a small faded caption at the bottom of the Profil tab
* :sparkles: Play a short chime when a chat message is sent or arrives (Web Audio, follows the sound switch)
* :sparkles: Swipe one of your messages to the left to delete it, with our own themed confirm dialog (no system pop-up)
* :sparkles: Add chat push notifications: 🔔 bell in the chat header, subscriptions in Firestore `push/{uid}`, sent by the new Vercel function `api/notify.js` (web-push, VAPID key in the Vercel env)
* :bento: Bump the service-worker cache to `ltf-v47-rs`

### 0.46.0 (2026-10-20)

* :sparkles: Add a welcome screen for first-time waiters: 5 swipeable slides (Académie, Carte, Formation, Briefing, Équipe) with Passer / Suivant / Commencer, in French & English (`welcome.js`)
* :sparkles: Show the real floor plan with today's reserved tables on the Briefing slide (`window.LTFbriefPlan`, JS & Rust)
* :sparkles: Add a "Revoir l'introduction" button in the Profil tab
* :bento: Bump the service-worker cache to `ltf-v46-rs`

### 0.45.0 (2026-10-20)

* :recycle: Rename every single-letter variable to a readable name (JS app, inline scripts, Rust crate, build tools, tests & scripts), behaviour 100% identical
* :art: Format the code & the menu data files (prettier, no line over 500 chars, one value per line)
* :truck: Move the third-party scan libraries to `scan/vendor/` (unminified TensorFlow.js 4.22.0 & MobileNet 2.1.1, Tesseract.js 5.1.1 as published)
* :wrench: Rename wasm-bindgen's one-letter names in `ltf.js` from `build.sh` (`tools/readable_glue.js`)
* :white_check_mark: Add `tools/check_readable.js`: no single-letter identifiers, no minified code of ours
* :truck: Publish the data files & `index.html` in `src/pwa/` (the full JS reference app)
* :bento: Bump the caches to `ltf-v45-rs` & `ltf-scan-v2`

### 0.44.0 (2026-10-19)

* :recycle: Refactor the whole codebase in the Ab style: MIT license headers, JSDoc / doc comments & comments everywhere, readable formatting, descriptive names (behaviour 100% identical, JS vs Rust parity kept)
* :bulb: Comment every inline helper of `index.html` (table plan, crew code, swipe-down sheets, grapes, cheese scale, bar icons, winter badges) & the stylesheet sections
* :memo: Add the README, CONTRIBUTING & CHANGELOG
* :page_facing_up: Add the MIT LICENSE
* :truck: Publish the readable sources in `src/` (JavaScript, Rust crate, build tools)
* :wrench: Copy the docs, `vercel.json` & `src/` into `dist/` from `build.sh`
* :bento: Bump the service-worker cache to `ltf-v44-rs`

### 0.43.0 (2026-10-19)

* :rocket: Move the hosting to Vercel (static, no build) at `sofitel-service-lestroisforts.vercel.app`, with `no-cache` for `index.html` & `sw.js` and `application/wasm` for the wasm
* :lock: Authorize the Vercel domain for Google sign-in
* :truck: Redirect the old GitHub Pages address to Vercel (its service worker clears its caches & unregisters)

### 0.41.0 (2026-10-19)

* :card_file_box: Order the cheese board by researched intensity, mildest to strongest

### 0.40.0 (2026-10-19)

* :sparkles: Add the cheese strength scale under the "Plateau de fromages" heading of La Carte (strength, milk & taste per cheese)

### 0.39.0 (2026-10-19)

* :sparkles: Add the team chat: messages, photos, replies (swipe right), reactions, delete own messages & an unread dot, for signed-in team members (Firestore `chat`)
* :lock: Lock the chat down with Firestore rules (read if signed in, write / react / delete only your own)

### 0.38.0 (2026-10-19)

* :sparkles: Show the palate & the grapes (with audio) of the pairing wines
* :zap: Rank the carte search: name match > word start > anywhere (JS & Rust)
* :lipstick: Make the photo of the bar order zoomable

### 0.37.0 (2026-10-19)

* :lipstick: Add the bar game icons (glasses, bottles, citrus, garnishes)

### 0.35.0 (2026-10-19)

* :card_file_box: Add the grapes of the Saint-Maur « M » 50 cl wines

### 0.30.0 (2026-10-18)

* :sparkles: Add the photo scan: MobileNet v2 (float16) image match + Tesseract French OCR, on-device & offline, learns from the waiter's taps & own photos

### 0.29.0 (2026-10-18)

* :sparkles: Add the briefing table plan: reserved tables in gold, tap a table for its booking sheet, full screen view

### 0.28.0 (2026-10-18)

* :sparkles: Add the "En bouche" palate notes of every wine & champagne, researched from the producers' sheets

### 0.26.0 (2026-10-18)

* :sparkles: Add the URL router (`#/<view>/<chapter>`), deep links & refresh-safe study decks, quizzes, exams & reviews
* :white_check_mark: Test the router (`route.js`)

### 0.25.0 (2026-10-18)

* :sparkles: Add Google sign-in & the cloud sync of the progress (Firebase, Firestore `users/{uid}`)
* :card_file_box: Add the winter staff sheet: chef & service notes (cutlery per dish), allergens & 17 new fact cards
* :bento: Add 8 real photos of the winter dishes

### 0.24.0 (2026-10-17)

* :sparkles: Add the cheese board chapter (`from`): milk, origin & place on the board

### 0.21.0 (2026-10-17)

* :sparkles: Add the "Did you know?" fun tips
* :bento: Give every item a photo (AI-generated where no real photo exists yet)

### 0.20.0 (2026-10-17)

* :sparkles: Add the daily briefing chapter (`jour`)
* :lock: Keep the guest names out of the app: encrypted `names.js` (AES-GCM, PBKDF2-SHA256), unlocked with the team code

### 0.18.0 (2026-10-17)

* :sparkles: Add the winter menu chapter (`hiver`): pictograms, lunch yes/no & the allergen table (indicative only)
* :sparkles: Let the waiter take their own photos of the tasting dishes
* :card_file_box: Add the chef & service notes and the fact cards

### 0.12.0 (2026-10-16)

* :boom: Rewrite the whole app in Rust, compiled to WebAssembly (same HTML, same saved progress, same photos)
* :white_check_mark: Compare the JS & Rust apps step by step in jsdom (seeded, byte for byte)
* :sparkles: Add the winter menu (from 19 October) & the tasting menu of the day

### 0.11.0 (2026-10-15)

* :sparkles: Turn the game into a PWA: English mode + ⓘ notes, photos, themes (Auto / Clair / Sombre / Noir), tab bar & sheets
* :loud_sound: Add the pronunciation (Web Speech) & the photo zoom viewer
* :sparkles: Add the course types & the course tabs of La Carte

### 0.1.0 (2026-10-15)

* :tada: Begin the project: a single-file HTML training game
