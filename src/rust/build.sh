#!/bin/bash
# 
# @license MIT
# ~~~~~~~~~~~~
# sofitel-service-lestroisforts
# ~~~~~~~~~~~~
# Copyright (c) 2026 Abraham Ukachi. The Les Trois Forts Project.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the 'Software'), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
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
# the rust/ folder, the pwa/ sources, repository root & the output folder 📁
RUST_DIR=$(pwd); PWA=$RUST_DIR/../pwa; DIST=$RUST_DIR/dist; REPO_ROOT=$(cd "$RUST_DIR/../.." && pwd)

# `copy_asset` - Function 📦
# Copies a source asset, falling back to the checked-in deployable copy at repository root.
# This keeps the public src/pwa + src/rust snapshot sufficient for a clean build.
copy_asset() {
  local name=$1
  local source=$PWA/$name
  [ -e "$source" ] || source=$REPO_ROOT/$name
  if [ ! -e "$source" ]; then echo "missing build asset: $name" >&2; return 1; fi
  cp -r "$source" "$DIST/$name"
}
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
for asset in names.js cloud.js chat.js chat-security.mjs emoji.json scan.js welcome.js manifest.json hero.jpg icon-192.png icon-512.png apple-touch-icon.png; do
  copy_asset "$asset"
done
for asset in img scan say stickers; do
  copy_asset "$asset"
done

# 6. 📝 the public repo files: docs, Firebase rules & the Vercel config (static, no build)
cp "$REPO_ROOT/README.md" "$REPO_ROOT/LICENSE" "$DIST/"
for document in CONTRIBUTING.md CHANGELOG.md vercel.json; do
  source=web/$document
  [ -f "$source" ] || source=$REPO_ROOT/$document
  cp "$source" "$DIST/"
done
cp "$REPO_ROOT/firestore.rules" "$REPO_ROOT/firebase.json" "$REPO_ROOT/SECURITY.md" "$DIST/"
# the chat push server (Vercel function), its dependency & the reproducible npm scripts 📲
mkdir -p "$DIST/api" && cp web/api/notify.js "$DIST/api/" && cp web/package.json "$DIST/"
cp "$REPO_ROOT/package-lock.json" "$DIST/"

# 7. 🧩 the readable sources, so the public repo shows the code (plain static files, never loaded by the app)
mkdir -p "$DIST/src/pwa" "$DIST/src/rust/ltf/src" "$DIST/src/rust/tools/scan" "$DIST/src/rust/web" "$DIST/src/rust/tests"
cp "$PWA"/{index.html,app.js,chat.js,chat-security.mjs,cloud.js,scan.js,welcome.js,sw.js,data.js,i18n.js,i18n_fr.js,fun.js,images.js,hero.js} "$DIST/src/pwa/"
cp ltf/Cargo.toml ltf/Cargo.lock "$DIST/src/rust/ltf/"
cp ltf/src/*.rs "$DIST/src/rust/ltf/src/"
cp tools/*.js tools/*.py "$DIST/src/rust/tools/"
cp tools/scan/*.js "$DIST/src/rust/tools/scan/"
cp web/sw.js "$DIST/src/rust/web/"
mkdir -p "$DIST/src/rust/web/api" && cp web/api/notify.js "$DIST/src/rust/web/api/" && cp web/package.json "$DIST/src/rust/web/"
cp build.sh setup_toolchain.sh "$DIST/src/rust/"
cp tests/*.test.mjs "$DIST/src/rust/tests/"

# ✅ report
ls -la "$DIST"; echo "wasm: $(stat -c %s "$DIST/ltf_bg.wasm") bytes, gzip: $(gzip -9c "$DIST/ltf_bg.wasm" | wc -c) bytes"

