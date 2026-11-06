#!/bin/bash
# 
# @license Proprietary - All Rights Reserved
# ~~~~~~~~~~~~
# sofitel-service-lestroisforts
# ~~~~~~~~~~~~
# Copyright (c) 2026 Abraham Ukachi. The Les Trois Forts Project. All rights reserved.
#
# This source code is proprietary and confidential. It is shown publicly for
# viewing only. No permission is granted to copy, modify, merge, publish,
# distribute, sublicense, sell, host or deploy this software, in whole or in
# part, or to use it to build another product or service, without the prior
# written permission of the copyright holder. See the LICENSE file for the
# full terms.
#
# THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND.
#
# @project: sofitel-service-lestroisforts
# @name: Les Trois Forts - Build
# @file: rust/build.sh
# @type: Shell (Bash)
# @authors: Abraham Ukachi <abrahamukachi@gmail.com>
#
# Example usage:
#   1+|> cd rust && ./build.sh
#    -|> 
#
#


#
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# MOTTO: We'll always do more 😜!!!
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
#


# 🦀 Builds the Rust/WebAssembly PWA into rust/dist/ (the folder published to GitHub & Vercel).
# Usage: ./build.sh
# Env overrides: CARGO_TARGET_DIR (default /tmp/ltf-target), WASM_BINDGEN, WASM_OPT.

# stop on the first error, unset variable or failed pipe 🛑
set -euo pipefail
# always run from rust/
cd "$(dirname "$0")"
# the rust/ folder, the pwa/ sources & the output folder 📁
RUST_DIR=$(pwd); PWA=$RUST_DIR/../pwa; DIST=$RUST_DIR/dist
# the Rust toolchain (rustup / cargo) 🦀
. ~/.cargo/env
# keep the build artefacts out of the project
export CARGO_TARGET_DIR=${CARGO_TARGET_DIR:-/tmp/ltf-target}
# wasm-bindgen (must match the crate pin 0.2.129) & wasm-opt (optional) 🔧
WASM_BINDGEN_BIN=${WASM_BINDGEN:-wasm-bindgen}; WASM_OPT_BIN=${WASM_OPT:-$(command -v wasm-opt || echo ~/binaryen/bin/wasm-opt)}

# 1. 📦 data: JS data files -> JSON embedded with include_str!
node tools/gen_data.js "$PWA" ltf/data
node tools/gen_appdata.js "$PWA" ltf/data

# 2. 🏗️ compile
(cd ltf && cargo build --release --target wasm32-unknown-unknown)

# 3. 🔗 glue (a fresh dist/)
rm -rf "$DIST"; mkdir -p "$DIST"
"$WASM_BINDGEN_BIN" --target no-modules --no-typescript --out-dir "$DIST" --out-name ltf "$CARGO_TARGET_DIR/wasm32-unknown-unknown/release/ltf.wasm"
# 🧩 readable glue: rename wasm-bindgen's one-letter variables (no single-letter names in our repo)
NODE_PATH=${NODE_PATH:-/tmp/jt/node_modules} node tools/readable_glue.js "$DIST/ltf.js"

# 4. 🗜️ size
if [ -x "$WASM_OPT_BIN" ]; then "$WASM_OPT_BIN" -Oz --enable-bulk-memory --enable-nontrapping-float-to-int --enable-sign-ext --enable-reference-types --enable-multivalue --enable-mutable-globals "$DIST/ltf_bg.wasm" -o "$DIST/ltf_bg.wasm"; else echo "wasm-opt not found, skipping"; fi

# 5. 📄 static files (index.html, service worker, scripts, icons, photos, scan engine, grape audio)
node tools/make_index.js "$PWA" "$DIST"
cp web/sw.js "$DIST/"
cp "$PWA"/{names.js,cloud.js,chat.js,board.js,admin.js,admin-edit.js,about.js,setup.js,sim.js,sim-voice.js,sim-drinks.js,sim-scene.js,sim-talk.js,sim-list.js,sim-live.js,swipe.js,content.js,content-boot.js,emoji.json,scan.js,welcome.js,manifest.json,hero.jpg,icon-192.png,icon-512.png,apple-touch-icon.png,robots.txt,sitemap.xml} "$DIST/"
cp -r "$PWA/img" "$DIST/img"
cp -r "$PWA/scan" "$DIST/scan"
cp -r "$PWA/say" "$DIST/say"
cp -r "$PWA/stickers" "$DIST/stickers"

# 6. 📝 the public repo files: README, LICENSE, CONTRIBUTING, CHANGELOG & the Vercel config (static, no build)
cp "$RUST_DIR/../README.md" "$RUST_DIR/../LICENSE" "$DIST/"
cp web/CONTRIBUTING.md web/CHANGELOG.md web/vercel.json "$DIST/"
# the chat push server (Vercel function) & its one dependency (web-push) 📲
mkdir -p "$DIST/api" && cp web/api/notify.js web/api/admin.js "$DIST/api/" && cp web/package.json "$DIST/"

# 7. 🧩 the readable sources, so the public repo shows the code (plain static files, never loaded by the app)
mkdir -p "$DIST/src/pwa" "$DIST/src/rust/ltf/src" "$DIST/src/rust/tools/scan" "$DIST/src/rust/web"
cp "$PWA"/{index.html,app.js,chat.js,board.js,admin.js,admin-edit.js,about.js,setup.js,sim.js,sim-voice.js,sim-drinks.js,sim-scene.js,sim-talk.js,sim-list.js,sim-live.js,swipe.js,content.js,content-boot.js,cloud.js,scan.js,welcome.js,sw.js,data.js,i18n.js,i18n_fr.js,fun.js,images.js,hero.js} "$DIST/src/pwa/"
cp ltf/Cargo.toml ltf/Cargo.lock "$DIST/src/rust/ltf/"
cp ltf/src/*.rs "$DIST/src/rust/ltf/src/"
cp tools/*.js tools/*.py "$DIST/src/rust/tools/"
cp tools/scan/*.js "$DIST/src/rust/tools/scan/"
cp web/sw.js web/vercel.json web/firestore.rules "$DIST/src/rust/web/"
mkdir -p "$DIST/src/rust/web/api" && cp web/api/notify.js web/api/admin.js "$DIST/src/rust/web/api/" && cp web/package.json "$DIST/src/rust/web/"
cp build.sh setup_toolchain.sh "$DIST/src/rust/"
# the tests too, so a clean checkout can run them 🧪
mkdir -p "$DIST/src/rust/tests" && cp tests/*.js tests/run_all.sh "$DIST/src/rust/tests/"

# ✅ report
ls -la "$DIST"; echo "wasm: $(stat -c %s "$DIST/ltf_bg.wasm") bytes, gzip: $(gzip -9c "$DIST/ltf_bg.wasm" | wc -c) bytes"
