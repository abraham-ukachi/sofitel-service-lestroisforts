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
# @name: Les Trois Forts - Test Runner
# @file: rust/tests/run_all.sh
# @type: Shell (Bash)
# @authors: Abraham Ukachi <abrahamukachi@gmail.com>
#
# Example usage:
#   1+|> NODE_PATH=/tmp/jt/node_modules bash rust/tests/run_all.sh
#    -|> 
#
#


#
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# MOTTO: We'll always do more 😜!!!
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
#


# 🧪 Runs every check against pwa/ (old JS) and rust/dist/ (Rust/wasm). Needs node + jsdom@24 + fake-indexeddb@6.
# One-time: mkdir -p /tmp/jt && cd /tmp/jt && npm init -y && npm i jsdom@24 fake-indexeddb@6

# stop on the first failing test 🛑
set -e
# this folder & the node modules 📁
TESTS_DIR=$(cd "$(dirname "$0")" && pwd)
export NODE_PATH=${NODE_PATH:-/tmp/jt/node_modules}
# 🧭 every screen of the Rust app
echo "== t_rs.js (port of redesign/t.js) =="; node "$TESTS_DIR/t_rs.js" rs
# 🔍 JS vs Rust, rendered HTML, seeded
echo "== compare.js (JS vs Rust rendered HTML, seeded) =="; node "$TESTS_DIR/compare.js"
# 📸 IndexedDB compatibility + upload
echo "== photos.js (IndexedDB compatibility + upload) =="; node "$TESTS_DIR/photos.js"
# 🤏 photo viewer gestures
echo "== zoom.js (photo viewer gestures) =="; node "$TESTS_DIR/zoom.js"
# 🚀 the deployed index.html, async wasm load
echo "== async_boot.js (deployed index.html, async wasm load) =="; node "$TESTS_DIR/async_boot.js"
# 🔗 the URL router & resumable sessions
node "$TESTS_DIR/route.js"
# 🛡️ chat safety: crafted database values never reach the page as HTML
echo "== chat_safety.js (chat escaping & validation) =="; node "$TESTS_DIR/chat_safety.js" "$TESTS_DIR/../../pwa/chat.js"
echo "== content.js (live content from the owner dashboard, JS & Rust) =="; node "$TESTS_DIR/content.js"
