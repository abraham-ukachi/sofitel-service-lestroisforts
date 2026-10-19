<p align="center">
  <!-- Les Trois Forts - App Icon -->
  <a href="https://sofitel-service-lestroisforts.vercel.app" target="_blank">
    <img src="./icon-192.png" alt="Les Trois Forts - Service Academy - App Icon" width="64" height="64" />
  </a>
</p>


<p align="center" style="width:512px; margin:0 auto;">
  <b>Les Trois Forts — Service Academy</b> is a pocket training app for the service team of <b>Les Trois Forts</b> (Sofitel Marseille Vieux-Port), written in Rust and compiled to WebAssembly.
</p>

<p align="center" style="margin-top:12px;">
    <a href="https://sofitel-service-lestroisforts.vercel.app" target="_blank"><b>Open the Service Academy &rarr;</b></a>
</p>




# Contributing to `sofitel-service-lestroisforts`

👍🎉 First off, with ❤️ from the author ([Abraham Ukachi](https://github.com/abraham-ukachi)), thanks for taking the time to contribute! 🎉👍


The following is a set of guidelines for contributing to the **Service Academy**, which is currently deployed with [vercel](https://vercel.com) at [sofitel-service-lestroisforts.vercel.app](https://sofitel-service-lestroisforts.vercel.app). These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

> IMPORTANT: The menu content is transcribed from the restaurant's real cards. **Never invent** a dish, a price, a grape or an allergen: when something isn't on the card or the staff sheet, leave it out and add it to the [TODOs](./README.md#todos).


### Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Privacy first 🛡️](#privacy-first-)
3. [Getting Started 🚀](#getting-started-)
    - [Requirements](#requirements)
    - [Build](#build)
    - [Updating the menu](#updating-the-menu)
4. [Project Structure 📁](#project-structure-)
5. [Styleguides](#styleguides)
    - [Git Commit Messages](#git-commit-messages)
    - [Gitmoji used in this repo](#gitmoji-used-in-this-repo)
    - [JavaScript, Rust & CSS Styleguide](#javascript-rust--css-styleguide)
6. [Testing 🧪](#testing-)
7. [Releasing a version 🔖](#releasing-a-version-)
8. [Reporting Bugs & Requesting Features 🐛](#reporting-bugs--requesting-features-)
9. [License](#license)
10. [Contact](#contact)


## Code of Conduct

Everyone participating in this project is expected to uphold a certain code - i.e. make participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation. Be kind, be patient, and assume good intent ;)


## Privacy first 🛡️

This app is used on a real restaurant floor, so:

* 🙈 **Never commit guest data**: no guest names, phone numbers, emails or booking details in clear text, in the code, the data files, an issue or a commit message. The briefing names only ship encrypted (`names.js`, made with `src/rust/tools/enc_names.py`).
* 🔑 **Never commit a secret**: no team code, token or API key. The Firebase web config is public by design; everything else stays out of the repo.
* 📸 **Photos** of guests or of the team never go into `img/`.


---


## Getting Started 🚀

### Requirements

| Tool | Version | Why |
|:-----|:--------|:----|
| Rust | stable + `wasm32-unknown-unknown` | the app |
| `wasm-bindgen` CLI | **0.2.129** | must match the crate pin |
| binaryen (`wasm-opt`) | version_133 (optional) | a smaller wasm |
| Node.js | >= 18 | data conversion & tests |
| jsdom / fake-indexeddb | 24 / 6 | tests |

> NOTE: `bash rust/setup_toolchain.sh` installs all of it in a fresh sandbox (aarch64, no C compiler: zig is used as the linker).


### Build

```bash
cd rust && ./build.sh        # -> rust/dist/
```

`build.sh` converts the menu data (`pwa/*.js`) to JSON, compiles the crate, runs `wasm-bindgen` & `wasm-opt`, then copies the static files, the docs and the readable sources (`src/`) into `rust/dist/`, the folder that is published.


### Updating the menu

1. Edit `pwa/data.js` (menu), `pwa/i18n.js` (English + ⓘ notes), `pwa/i18n_fr.js` (French ⓘ notes, same keys) and `pwa/images.js` + `pwa/img/` (photos).
2. Rename an image file when you replace it (the service worker & the browsers cache it).
3. Regenerate `pwa/scan/emb.json` (`src/rust/tools/scan/emb.js`) when dish or wine photos change.
4. Run `./build.sh` and the [tests](#testing-).
5. Bump `CACHE` in `rust/web/sw.js` (`ltf-vNN-rs`) so the phones pick up the new build.


## Project Structure 📁

```sh
.
├── pwa/                     # the JavaScript app (reference) + the shared page, data & assets
│   ├── index.html           # app shell, CSS & inline helpers (shared by both builds)
│   ├── app.js               # the original app (the tests compare the Rust port against it)
│   ├── chat.js cloud.js scan.js
│   └── data.js i18n.js i18n_fr.js fun.js images.js names.js
├── rust/
│   ├── ltf/                 # the Cargo crate (src/lib.rs, state.rs, build.rs, ui.rs, media.rs, util.rs)
│   ├── tools/               # gen_data.js, gen_appdata.js, make_index.js, enc_names.py, scan/
│   ├── web/                 # sw.js, vercel.json, CONTRIBUTING.md, CHANGELOG.md
│   ├── tests/               # jsdom tests (run_all.sh)
│   ├── build.sh
│   └── dist/                # the build output = this public repo
├── README.md
└── LICENSE
```


## Styleguides

### Git Commit Messages

* Use present tense, imperative mood ("Add feature" not "Added feature")
* Use sentence case after the emoji ("Add the cheese strength scale", not "add the cheese strength scale")
* Keep the first line short (aim for 72 characters or less)
* Start the commit message with a [gitmoji](https://gitmoji.dev) **shortcode** (`:memo:`, not 📝): every emoji in the history is a shortcode
* Put extra details in parentheses at the end of the subject when they help: `:recycle: Refactor the team chat (comments & JSDoc everywhere)`
* Several emojis are fine when a commit really does several things: `:memo: :fire: Update README.md`
* The release commit follows the same format: `:bookmark: Release x.y.z`

The format:

```
<:gitmoji:> [<:gitmoji:> ...] <Imperative summary> [(details)]
```

Examples:

```
:sparkles: Add the briefing table plan (reserved tables in gold, full screen)
:bug: Keep the search when a course tab is tapped
:card_file_box: Order the cheese board by intensity
:bento: Add the winter dish photos
:bookmark: Release 0.44.0
```


### Gitmoji used in this repo

| Emoji | Shortcode | Meaning ([gitmoji.dev](https://gitmoji.dev)) | How it's used here |
|:------|:----------|:----------------------------------------------|:-------------------|
| ✨ | `:sparkles:` | Introduce new features. | A new chapter, game mode, screen or helper. |
| 🐛 | `:bug:` | Fix a bug. | Anything that renders or behaves wrong. |
| ♻️ | `:recycle:` | Refactor code. | Same behaviour, cleaner code (the compare tests must stay at 0 diffs). |
| 💡 | `:bulb:` | Add or update comments in source code. | License headers, JSDoc / doc comments, inline comments. |
| 💄 | `:lipstick:` | Add or update the UI and style files. | CSS, icons drawn in code, layout. |
| 🍱 | `:bento:` | Add or update assets. | Photos (`img/`), audio (`say/`), scan models, cache bumps of the assets. |
| 🗃️ | `:card_file_box:` | Perform database related changes. | Menu content in `data.js` / `i18n*.js` (the app's "database"). |
| 🌐 | `:globe_with_meridians:` | Internationalization and localization. | English strings & French ⓘ notes. |
| 🔒 | `:lock:` | Fix security or privacy issues. | Firestore rules, encrypted names, anything about guest data. |
| 🔧 | `:wrench:` | Add or update configuration files. | `build.sh`, `Cargo.toml`, `vercel.json`, `manifest.json`. |
| ✅ | `:white_check_mark:` | Add, update, or pass tests. | `rust/tests/`. |
| 📝 | `:memo:` | Add or update documentation. | README, CONTRIBUTING, CHANGELOG. |
| 📄 | `:page_facing_up:` | Add or update license. | `LICENSE`. |
| 🚚 | `:truck:` | Move or rename resources. | Moved files, new hosting paths. |
| 🚀 | `:rocket:` | Deploy stuff. | Hosting changes. |
| 🔖 | `:bookmark:` | Release / Version tags. | `:bookmark: Release x.y.z`. |

> NOTE: If you need another one, pick it from [gitmoji.dev](https://gitmoji.dev) and use its official meaning. There are no house meanings.


### JavaScript, Rust & CSS Styleguide

* **Behaviour first**: the Rust port must render exactly the same HTML as `pwa/app.js`. Change both, or neither (the compare tests will tell you).
* **Never rename what the outside sees**: `window.LTF*` functions, DOM ids & classes, `localStorage` / `sessionStorage` / IndexedDB keys (`ltf_v1`, `ltf_sync`, `ltf_run`, `ltf_code`, `ltf_chat_seen`, `ltf_scan_learn`, `ltf_photos`), Firestore fields, cache names & URLs.
* **Keep the two tables of `app.js` as they are** (`const IC = {` and `const factQs = EN ? [`): `tools/gen_appdata.js` reads them as text.
* **Comment everything**: a short lowercase comment above almost every statement or block, `// import ...` above each import, trailing comments on fields, section banners (`// ===== SECTION 🧩 ===== //`) separated by two blank lines, and emojis where they help 🍪 🌍 🔗 🧹 🌱 👂 🚀 🛡️ ✅.
* **Document every function** with a JSDoc block (or `///` in Rust) in this shape:

```js
/**
 * `formatTime` - Function 🕘
 *
 * A sentence about what it does.
 *
 * @param { number } time - a time in ms
 * @returns { string } - "14:05" today, else "18 oct. 14:05"
 */
```

* **Descriptive names** everywhere (`timeOf`, `escapeHtml`, `openScanner`): **no single-letter identifiers at all**, not even in tiny lambdas or loops (`index`, `item`, `event`, `error`...).
* **No minified code of ours**: readable formatting (prettier, `--print-width 110 --single-quote`), no line over 500 chars. Third-party builds live in `scan/vendor/` (unminified when the publisher ships one).
* **Check it before you commit** 🔍:

```bash
NODE_PATH=/tmp/jt/node_modules node rust/tools/check_readable.js rust/dist pwa rust/ltf/src rust/tools rust/tests tools
# check_readable: NN files, 0 problem(s) ✅
```
* **CSS**: the theme variables only (`var(--gold)`, `var(--sf)`...), never a new hard-coded color for something themable; one comment per section.
* **New source files start with the license header** of the project:

```js
/*
* @license MIT
* ~~~~~~~~~~~~
* sofitel-service-lestroisforts
* ~~~~~~~~~~~~
* Copyright (c) 2026 Abraham Ukachi. The Les Trois Forts Project.
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* ...(the rest of the MIT license text, as in any source file)...
*
* @project: sofitel-service-lestroisforts
* @name: Les Trois Forts - Team Chat
* @file: pwa/chat.js
* @type: JavaScript (ES module)
* @authors: Abraham Ukachi <abrahamukachi@gmail.com>
*
* Example usage:
*   1+|> <script type="module" src="chat.js"></script>
*    -|>
*
*/


/*
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
* MOTTO: We'll always do more 😜!!!
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
*/
```

> NOTE: Rust files use the same `/* */` block, shell & Python files the same layout with `#`, HTML files with `<!-- -->`.


## Testing 🧪

Every pull request must:

1. build with `cd rust && ./build.sh`,
2. pass `NODE_PATH=/tmp/jt/node_modules bash rust/tests/run_all.sh` with **`errors(final) 0`** and **`TOTAL DIFFS 0`**,
3. be checked by hand on a phone (installed PWA) in **light & dark**, in **French & English**, for every screen it touches.

| No. | Test | What it checks |
|:----|:-----|:---------------|
| 1 | *`t_rs.js`* | Every screen of the Rust app |
| 2 | *`compare.js`* | JS vs Rust, byte for byte (40 steps × 4 runs) |
| 3 | *`photos.js`* | IndexedDB photos & upload |
| 4 | *`zoom.js`* | Photo viewer gestures |
| 5 | *`async_boot.js`* | The deployed index.html |
| 6 | *`route.js`* | Router & resumed sessions |


## Releasing a version 🔖

1. Bump `CACHE` in `rust/web/sw.js` to `ltf-vNN-rs`.
2. Add the `0.NN.0` section to [CHANGELOG.md](./CHANGELOG.md) with gitmoji bullets.
3. Build, test, deploy `rust/dist` and commit `:bookmark: Release 0.NN.0`.


## Reporting Bugs & Requesting Features 🐛

Open an issue in [abraham-ukachi/sofitel-service-lestroisforts/issues](https://github.com/abraham-ukachi/sofitel-service-lestroisforts/issues). A good bug report has:

| No. | What | Example |
|:----|:-----|:--------|
| 1 | A clear title | *"The bar game shows the wrong glass for the Bellini"* |
| 2 | Steps to reproduce | the chapter, the screen, the taps |
| 3 | Expected vs. actual behavior | a screenshot (light / dark) helps a lot |
| 4 | Versions | the cache version (`ltf-vNN-rs`, in `sw.js`), your phone & browser |

> WARNING: Never paste a guest name, a booking, a team code or a token in an issue.


---


## License

This **`sofitel-service-lestroisforts`** project is [MIT Licensed](./LICENSE) ;)

By contributing, you agree that your contributions will be licensed under the same license.


## Contact

| Name | Abraham Ukachi |
|:-----|:---------------|
| GitHub | [@abraham-ukachi](https://github.com/abraham-ukachi) |
| Website | [abraham-ukachi.vercel.app](https://abraham-ukachi.vercel.app) |


---

<p align="center">
  Made with ❤️ by <a href="https://github.com/abraham-ukachi" target="_blank">Abraham Ukachi</a>
  <br />
  <i>We'll always do <b>more</b> 😜</i>
</p>
