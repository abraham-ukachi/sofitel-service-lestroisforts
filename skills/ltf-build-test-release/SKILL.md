---
name: ltf-build-test-release
description: How to build, test, version, deploy (Vercel API) and push (GitHub) the Les Trois Forts Service Academy, then verify it live. Load for any release, hotfix or "ship it" task.
---

# Build, test & release 🚀

Paths below are the **dev workspace** layout (`pwa/`, `rust/`). In this repo they live under `src/`.

## 0. Toolchain (fresh sandbox)
`command -v cargo || [ -f ~/.cargo/env ] || bash rust/setup_toolchain.sh` — installs Rust stable +
`wasm32-unknown-unknown`, wasm-bindgen CLI **0.2.129** (must match the crate), binaryen, Node deps. On aarch64 with
no C compiler it uses zig as the linker. Takes ~3 min: run it in the background. `/tmp` gets wiped between
sessions, so keep Node tools (prettier, acorn, eslint-scope, jsdom) in a persistent folder **with a
`package.json`** (`{}`), or npm installs into the wrong place.

## 1. Choose the smallest build
| Change | Do |
|:--|:--|
| Rust or `data.js`/`i18n*.js` (anything the crate embeds) | full build: `cd rust && timeout 1100 ./build.sh > build.log 2>&1` |
| `index.html` only | `cd rust && node tools/make_index.js ../pwa dist` (regenerates the Rust index) |
| A shared JS module (`chat.js`, `sim*.js`, …) | edit in `pwa/`, copy to `rust/dist/` **and** `rust/dist/src/pwa/` |

After a full build: `cp -a ../pwa/models dist/` (build.sh wipes it) and `cp web/CHANGELOG.md dist/`. Sanity-check
strings in the wasm, e.g. `grep -ac "Menus des f" dist/ltf_bg.wasm`.

**A new module/file** must be added to: `pwa/sw.js` ASSETS, `rust/web/sw.js` ASSETS, **both** copy lists in
`rust/build.sh` (root + `src/`), and `index.html` if it loads at boot.

## 2. Version bump (every release)
1. `pwa/welcome.js` → `APP_VERSION` (Profil shows it).
2. `pwa/sw.js` `CACHE` → `ltf-vNN`, `rust/web/sw.js` `CACHE` → `ltf-vNN-rs` (same NN, +1).
3. `rust/web/CHANGELOG.md` → new `### x.y.z (YYYY-MM-DD)` with gitmoji bullets.
4. `pwa/about.js` → new first line in `TIMELINE` `[date, 'x.y', major, fr, en]`.
5. Copy `sw.js` to `rust/dist/sw.js` and `rust/dist/src/rust/web/sw.js`; copy `CHANGELOG.md`, `about.js`,
   `welcome.js` to `rust/dist/` (+ `src/pwa/`).
Semver-ish: new feature → minor, fix → patch.

## 3. Format & checks
- Prettier: `prettier --print-width 110 --single-quote --write <file>` then `node --check <file>`.
- Style gate: `NODE_PATH=<tools>/node_modules node rust/tools/check_readable.js rust/dist pwa rust/tools` → must
  end `0 problem(s)`.
- Tests: `cd rust && timeout 300 bash tests/run_all.sh > tests.log 2>&1`; read `TOTAL DIFFS 0` and
  `errors(final) 0`. ("fetch is not defined" stack traces are setup noise, also in the baseline.)
- Feature smoke tests are jsdom + a Firebase stub (e.g. simulation tests: one run with the JS build, one with
  **no `window.LTF`** like the Rust build). Long runs (>2 min): start in the background, run sequentially if they
  share generated files.

## 4. Deploy (Vercel REST API, no git link)
`cd rust/dist && python3 ../../tools/vercel_deploy.py > deploy.log 2>&1` — uploads each file to `/v2/files`
(sha1 digest) then creates a production deployment (framework None, no build). Uses the Vercel token from the
secret store; never print it. **Run it in the background or with a long timeout** (a 115 s foreground cap killed
one). Check `grep -c upfail deploy.log` = 0 (note: `grep -c` exits 1 on zero matches — that is success). The alias
can take ~3 min; confirm with `api.vercel.com/v4/aliases/<host>`.

## 5. GitHub (public mirror = `rust/dist`)
```bash
git clone https://github.com/abraham-ukachi/sofitel-service-lestroisforts.git /tmp/ltfrepo && cd /tmp/ltfrepo
git config user.name "Abraham Ukachi"; git config user.email abrahamukachi@gmail.com
cp -a <workspace>/rust/dist/. .
git add <area> && git commit -m ":sparkles: Add …"   # one commit per area, gitmoji shortcodes
git add -A && git commit -m ":bookmark: Release x.y.z" && git push
```
`cp -a` never deletes: remove dropped files by hand. Files only in the repo (like `skills/`) survive.

## 6. Verify live (the only proof)
Wait ~60 s, then curl with a cache-buster:
```bash
H=https://sofitel-service-lestroisforts.vercel.app
curl -s "$H/welcome.js?x=$RANDOM" | grep -o "APP_VERSION = '[0-9.]*'"
curl -s "$H/sw.js?x=$RANDOM" | grep -o "ltf-v[0-9]*-rs"
curl -s -o /dev/null -w "%{http_code}\n" "$H/<new-module>.js?x=$RANDOM"
```
Report: version, cache, commit hash, test counts — and that it was **not checked on a phone** unless the owner
confirmed it.

## 7. Firestore rules (if the change needs them)
See `ltf-firebase-and-security`: edit `rust/web/firestore.rules` (formatted truth) and publish in the console as
**one-line inserts**.
