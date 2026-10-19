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
# @name: Les Trois Forts - Toolchain Setup
# @file: rust/setup_toolchain.sh
# @type: Shell (Bash)
# @authors: Abraham Ukachi <abrahamukachi@gmail.com>
#
# Example usage:
#   1+|> bash rust/setup_toolchain.sh
#    -|> 
#
#


#
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# MOTTO: We'll always do more 😜!!!
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
#


# 🧰 Reinstalls the sandbox toolchain (home + /tmp are wiped on restart): Rust + wasm32 target,
# wasm-bindgen 0.2.129, zig (as the C linker), binaryen (wasm-opt) and the test deps (jsdom, fake-indexeddb).
# Usage: bash rust/setup_toolchain.sh   (~3 min; on a normal machine with gcc/clang you only need rustup + wasm-bindgen)

# stop on the first error, work from ~
set -e; cd ~
# 🦀 rustup (minimal profile), unless cargo is already there
[ -x ~/.cargo/bin/cargo ] || (curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --no-modify-path >/tmp/rustup.log 2>&1)
# stable + the wasm32 target 🎯
export PATH=~/.cargo/bin:$PATH; rustup default stable >/dev/null 2>&1; rustup target add wasm32-unknown-unknown >/dev/null 2>&1
# the env file build.sh sources
echo 'export PATH=$HOME/.cargo/bin:$PATH' > ~/.cargo/env
# 🔗 wasm-bindgen CLI (prebuilt, aarch64 musl), pinned to the crate version
[ -x ~/.cargo/bin/wasm-bindgen ] || { curl -sL https://github.com/wasm-bindgen/wasm-bindgen/releases/download/0.2.129/wasm-bindgen-0.2.129-aarch64-unknown-linux-musl.tar.gz | tar xz -C /tmp && cp /tmp/wasm-bindgen-0.2.129-aarch64-unknown-linux-musl/wasm-bindgen ~/.cargo/bin/; }
# ⚡ zig 0.14.1 (no C compiler in the sandbox: zig cc links the host build scripts & proc-macros)
if [ ! -x ~/zig/zig ]; then mkdir -p ~/zig; curl -sL https://ziglang.org/download/0.14.1/zig-aarch64-linux-0.14.1.tar.xz -o /tmp/zig.tar.xz; python3 -c "import tarfile; tarfile.open('/tmp/zig.tar.xz').extractall('/tmp/zx')"; mv /tmp/zx/zig-aarch64-linux-0.14.1/* ~/zig/; fi
# 🗜️ binaryen version_133 (wasm-opt)
[ -x ~/binaryen/bin/wasm-opt ] || { curl -sL https://github.com/WebAssembly/binaryen/releases/download/version_133/binaryen-version_133-aarch64-linux.tar.gz | tar xz -C ~ && mv ~/binaryen-version_133 ~/binaryen; }
# 🔧 the `zcc` linker wrapper: drops --fix-cortex-a53-843419 and maps -lgcc_s to -lunwind
mkdir -p ~/bin; cat > ~/bin/zcc <<'ZCC'
#!/bin/bash
# 🔧 zcc: `zig cc` as the host linker (drops --fix-cortex-a53-843419, maps -lgcc_s to -lunwind)
linker_args=()
for argument in "$@"; do
  case "$argument" in
    *--fix-cortex-a53-843419*)
      cleaned="${argument//,--fix-cortex-a53-843419/}"
      [ "$cleaned" = "-Wl" ] || [ "$cleaned" = "--fix-cortex-a53-843419" ] || linker_args+=("$cleaned");;
    -lgcc_s) linker_args+=(-lunwind);;
    *) linker_args+=("$argument");;
  esac
done
exec ~/zig/zig cc -target aarch64-linux-gnu.2.36 "${linker_args[@]}"
ZCC
# make it executable & tell cargo to use it for the host target
chmod +x ~/bin/zcc; printf '[target.aarch64-unknown-linux-gnu]\nlinker = "/home/sandbox/bin/zcc"\n' > ~/.cargo/config.toml
# 🧪 the test deps (jsdom + fake-indexeddb)
[ -d /tmp/jt/node_modules/jsdom ] || { mkdir -p /tmp/jt && cd /tmp/jt && npm init -y >/dev/null && npm i jsdom@24 fake-indexeddb@6 acorn acorn-walk eslint-scope prettier >/dev/null 2>&1; }
# ✅ versions
cargo --version; wasm-bindgen --version; ~/zig/zig version
