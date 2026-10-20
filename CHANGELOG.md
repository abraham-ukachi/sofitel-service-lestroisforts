# Changelog

All notable changes to this project will be documented in this file. Versions follow the service-worker cache (`ltf-vNN` → `0.NN.0`), see [CONTRIBUTING.md](./CONTRIBUTING.md#git-commit-messages) for the commit guidelines.

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
