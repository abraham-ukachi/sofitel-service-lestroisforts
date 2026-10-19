/**
 * @license MIT
 * ~~~~~~~~~~~~
 * sofitel-service-lestroisforts
 * ~~~~~~~~~~~~
 * Copyright (c) 2026 Abraham Ukachi. The Les Trois Forts Project.
 *
 * @project: sofitel-service-lestroisforts
 * @name: Les Trois Forts - Readability checker
 * @file: work/refactor/check_readable.js
 * @type: JavaScript (Node.js)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> NODE_PATH=/tmp/jt/node_modules node work/refactor/check_readable.js rust/dist pwa rust/tools
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🔍 Fails (exit 1) when our code has:
//   - a single-letter binding (JS via acorn + eslint-scope, Rust via a token scan, Python via `ast`, shell via regexes)
//   - a dense / minified file (average line > 200 chars, or any line > 500 chars)
// Long lines that are ONLY a base64 data URL or a ciphertext string literal are whitelisted explicitly.

'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const acorn = require('acorn');
const eslintScope = require('eslint-scope');

// 🙈 the folders / files we never check (third-party, binaries, media, generated data)
const SKIPPED_DIRECTORIES = new Set(['vendor', 'node_modules', 'img', 'say', 'lang', 'target', '.git', 'data']);
const SKIPPED_FILES = new Set(['Cargo.lock']);
const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.html', '.rs', '.py', '.sh', '.json', '.css', '.md', '.toml']);

// 📏 the line-length rule
const MAX_LINE = 500;
const MAX_AVERAGE = 200;

// ✅ whitelisted long lines: a quoted base64 data URL, or a quoted ciphertext (long base64 / hex string)
const WHITELISTED_LINE_PATTERNS = [
  /^\s*["'`]?[\w$.\-]*["'`]?\s*[:=]?\s*["'`]data:[\w/+.\-]+;base64,[A-Za-z0-9+/=]+["'`][,;]?\s*$/,
  /^\s*["'`]?[\w$.\-]*["'`]?\s*[:=]?\s*["'`][A-Za-z0-9+/=]{400,}["'`][,;]?\s*$/,
  /^\s*["'`]?[\w$.\-]*["'`]?\s*[:=]?\s*["'`][0-9a-f]{400,}["'`][,;]?\s*$/,
  // 🧠 a scan embedding record: {"k": name, "i": photo, "e": "<base64 vector>"} (data, not code)
  /^\s*\{\s*"k":\s*"[^"]*",\s*"i":\s*"[^"]*",\s*"e":\s*"[A-Za-z0-9+/=]{400,}"\s*\},?\s*$/,
];

// the problems found, one line each 📝
const problems = [];

/**
 * `listFiles` - Function 📂
 *
 * Walks a file or a folder and returns every code file in it (skipping the ignored folders).
 *
 * @param { string } target - a file or a folder
 * @returns { string[] } - the file paths
 */
function listFiles(target) {
  if (!fs.existsSync(target)) return [];
  const stats = fs.statSync(target);
  if (stats.isFile()) return [target];
  const files = [];
  for (const entry of fs.readdirSync(target).sort()) {
    const fullPath = path.join(target, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry)) files.push(...listFiles(fullPath));
    } else if (CODE_EXTENSIONS.has(path.extname(entry)) && !SKIPPED_FILES.has(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * `isWasmBindgenGlue` - Function 🔗
 *
 * Tells whether a file is the wasm-bindgen glue (`ltf.js`), which build.sh post-processes.
 *
 * @param { string } filePath - the file path
 * @returns { boolean } - true for the glue
 */
function isWasmBindgenGlue(filePath) {
  return path.basename(filePath) === 'ltf.js';
}

/**
 * `scriptsOf` - Function 📜
 *
 * Returns the JavaScript programs of a file (the file itself, or the inline `<script>`s of an HTML page).
 *
 * @param { string } filePath - the file path
 * @param { string } source - the file content
 * @returns { Array<{code: string, offset: number, module: boolean}> } - the programs
 */
function scriptsOf(filePath, source) {
  if (!filePath.endsWith('.html')) {
    return [{ code: source, offset: 0, module: /^\s*(import|export)\s/m.test(source) }];
  }
  const scripts = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = scriptPattern.exec(source))) {
    if (/\bsrc=/.test(match[1])) continue;
    scripts.push({
      code: match[2],
      offset: match.index + match[0].indexOf('>') + 1,
      module: /type=["']?module/.test(match[1]),
    });
  }
  return scripts;
}

/**
 * `lineOf` - Function 🔢
 *
 * @param { string } source - the file content
 * @param { number } position - a character offset
 * @returns { number } - the 1-based line number
 */
function lineOf(source, position) {
  return source.slice(0, position).split('\n').length;
}

/**
 * `checkJavaScript` - Function 🟨
 *
 * Reports every single-letter binding (variables, functions, params, classes, catch params) & label.
 *
 * @param { string } filePath - the file path
 * @param { string } source - the file content
 */
function checkJavaScript(filePath, source) {
  for (const script of scriptsOf(filePath, source)) {
    let program;
    const sourceType = script.module ? 'module' : 'script';
    try {
      program = acorn.parse(script.code, {
        ecmaVersion: 'latest',
        sourceType,
        allowHashBang: true,
        allowReturnOutsideFunction: true,
        ranges: true,
      });
    } catch (error) {
      problems.push(`${filePath}:${lineOf(source, script.offset)}: JS parse error: ${error.message}`);
      continue;
    }
    const scopeManager = eslintScope.analyze(program, { ecmaVersion: 2022, sourceType, optimistic: true });
    for (const scope of scopeManager.scopes) {
      for (const variable of scope.variables) {
        if (!/^[A-Za-z]$/.test(variable.name) || !variable.defs.length) continue;
        const identifier = variable.identifiers[0];
        const line = lineOf(source, script.offset + identifier.start);
        problems.push(`${filePath}:${line}: single-letter JS binding \`${variable.name}\``);
      }
    }
    // 🏷️ labels (`a: for (...)`) are identifiers too
    const visit = (node) => {
      if (!node || typeof node.type !== 'string') return;
      if (node.type === 'LabeledStatement' && node.label.name.length === 1) {
        problems.push(`${filePath}:${lineOf(source, script.offset + node.start)}: single-letter label \`${node.label.name}\``);
      }
      for (const key of Object.keys(node)) {
        const child = node[key];
        if (Array.isArray(child)) child.forEach(visit);
        else if (child && typeof child.type === 'string') visit(child);
      }
    };
    visit(program);
  }
}

/**
 * `stripRust` - Function 🦀
 *
 * Blanks the comments, strings (normal, byte & raw), char literals & lifetimes of Rust code,
 * keeping the newlines so line numbers stay right.
 *
 * @param { string } source - the Rust code
 * @returns { string } - the code with only tokens left
 */
function stripRust(source) {
  let output = '';
  let index = 0;
  const blank = (text) => text.replace(/[^\n]/g, ' ');
  while (index < source.length) {
    const rest = source.slice(index);
    let match;
    if (rest.startsWith('//')) {
      const end = rest.indexOf('\n');
      const chunk = end < 0 ? rest : rest.slice(0, end);
      output += blank(chunk);
      index += chunk.length;
    } else if (rest.startsWith('/*')) {
      let depth = 0;
      let cursor = 0;
      do {
        if (rest.startsWith('/*', cursor)) {
          depth++;
          cursor += 2;
        } else if (rest.startsWith('*/', cursor)) {
          depth--;
          cursor += 2;
        } else cursor++;
      } while (depth > 0 && cursor < rest.length);
      output += blank(rest.slice(0, cursor));
      index += cursor;
    } else if ((match = /^b?r(#*)"/.exec(rest))) {
      const closing = '"' + match[1];
      const end = rest.indexOf(closing, match[0].length);
      const chunk = rest.slice(0, end + closing.length);
      output += blank(chunk);
      index += chunk.length;
    } else if ((match = /^b?"(?:\\[\s\S]|[^"\\])*"/.exec(rest))) {
      output += blank(match[0]);
      index += match[0].length;
    } else if ((match = /^b?'(?:\\(?:x[0-9a-fA-F]{2}|u\{[0-9a-fA-F]+\}|.)|[^\\'])'/.exec(rest))) {
      output += blank(match[0]);
      index += match[0].length;
    } else if ((match = /^'[A-Za-z_]\w*/.exec(rest))) {
      // a lifetime ('a / 'static) or a loop label
      output += blank(match[0]);
      index += match[0].length;
    } else if ((match = /^[A-Za-z_]\w*/.exec(rest))) {
      output += match[0];
      index += match[0].length;
    } else if ((match = /^\d[\w.]*/.exec(rest))) {
      // a number literal (1u8, 0x1f, 1e3...)
      output += blank(match[0]);
      index += match[0].length;
    } else {
      output += source[index];
      index++;
    }
  }
  return output;
}

/**
 * `checkRust` - Function 🦀
 *
 * Reports every single-letter identifier token (`_` alone, the wildcard, is allowed), lifetimes included.
 *
 * @param { string } filePath - the file path
 * @param { string } source - the Rust code
 */
function checkRust(filePath, source) {
  const tokens = stripRust(source);
  tokens.split('\n').forEach((lineText, lineIndex) => {
    for (const match of lineText.matchAll(/(?<![\w$])[A-Za-z](?![\w$])/g)) {
      problems.push(`${filePath}:${lineIndex + 1}: single-letter Rust identifier \`${match[0]}\``);
    }
  });
  // 🔁 single-letter lifetimes / labels ('a)
  source.split('\n').forEach((lineText, lineIndex) => {
    const code = lineText.replace(/\/\/.*$/, '').replace(/"(?:\\.|[^"\\])*"/g, '""');
    for (const match of code.matchAll(/'[A-Za-z](?![\w'])/g)) {
      problems.push(`${filePath}:${lineIndex + 1}: single-letter Rust lifetime/label \`${match[0]}\``);
    }
  });
}

/**
 * `checkPython` - Function 🐍
 *
 * Reports every single-letter Python binding (names, args, functions, classes, imports as, except as).
 *
 * @param { string } filePath - the file path
 */
function checkPython(filePath) {
  const script = [
    'import ast, sys',
    'tree = ast.parse(open(sys.argv[1], encoding="utf-8").read())',
    'for node in ast.walk(tree):',
    '    names = []',
    '    if isinstance(node, ast.Name) and isinstance(node.ctx, (ast.Store, ast.Del)): names.append(node.id)',
    '    elif isinstance(node, ast.arg): names.append(node.arg)',
    '    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)): names.append(node.name)',
    '    elif isinstance(node, ast.alias): names.append(node.asname or node.name.split(".")[0])',
    '    elif isinstance(node, ast.ExceptHandler) and node.name: names.append(node.name)',
    '    for name in names:',
    '        if len(name) == 1 and name.isalpha(): print(f"{getattr(node, \'lineno\', 0)}\\t{name}")',
  ].join('\n');
  const result = childProcess.spawnSync('python3', ['-c', script, filePath], { encoding: 'utf8' });
  if (result.status !== 0) {
    problems.push(`${filePath}: python parse error: ${result.stderr.trim().split('\n').pop()}`);
    return;
  }
  for (const row of result.stdout.split('\n').filter(Boolean)) {
    const [line, name] = row.split('\t');
    problems.push(`${filePath}:${line}: single-letter Python binding \`${name}\``);
  }
}

/**
 * `checkShell` - Function 🐚
 *
 * Reports single-letter shell variables (assignments, `for x in`, `read x`, `$x` / `${x}` uses),
 * ignoring comments, the positional / special parameters ($1, $@, $?...) & heredoc bodies of other languages
 * are checked as text too (a heredoc that holds JS should be a real file instead).
 *
 * @param { string } filePath - the file path
 * @param { string } source - the shell script
 */
function checkShell(filePath, source) {
  source.split('\n').forEach((lineText, lineIndex) => {
    if (/^\s*#/.test(lineText)) return;
    const code = lineText.replace(/'[^']*'/g, "''").replace(/\s#.*$/, '');
    const patterns = [
      /(?:^|[\s;&|(])([A-Za-z])=/g,
      /\bfor\s+([A-Za-z])\s+in\b/g,
      /\bread\s+(?:-\w+\s+)*([A-Za-z])\b/g,
      /\$\{?([A-Za-z])(?![\w])/g,
    ];
    for (const pattern of patterns) {
      for (const match of code.matchAll(pattern)) {
        problems.push(`${filePath}:${lineIndex + 1}: single-letter shell variable \`${match[1]}\``);
      }
    }
  });
}

/**
 * `checkLineLengths` - Function 📏
 *
 * Fails a dense file: an average line over 200 chars, or any (non-whitelisted) line over 500 chars.
 *
 * @param { string } filePath - the file path
 * @param { string } source - the file content
 */
function checkLineLengths(filePath, source) {
  const lines = source.split('\n');
  const countedLines = lines.filter((lineText) => !WHITELISTED_LINE_PATTERNS.some((pattern) => pattern.test(lineText)));
  lines.forEach((lineText, lineIndex) => {
    if (lineText.length <= MAX_LINE) return;
    if (WHITELISTED_LINE_PATTERNS.some((pattern) => pattern.test(lineText))) return;
    problems.push(`${filePath}:${lineIndex + 1}: line of ${lineText.length} chars (max ${MAX_LINE})`);
  });
  if (countedLines.length) {
    const average = countedLines.reduce((sum, lineText) => sum + lineText.length, 0) / countedLines.length;
    if (average > MAX_AVERAGE) {
      problems.push(`${filePath}: average line of ${Math.round(average)} chars (max ${MAX_AVERAGE})`);
    }
  }
}

// 🚀 run over every file / folder given on the command line
const targets = process.argv.slice(2);
let fileCount = 0;
for (const target of targets) {
  for (const filePath of listFiles(target)) {
    fileCount++;
    const source = fs.readFileSync(filePath, 'utf8');
    const extension = path.extname(filePath);
    checkLineLengths(filePath, source);
    if (extension === '.js' || extension === '.mjs' || extension === '.html') {
      checkJavaScript(filePath, source);
      if (isWasmBindgenGlue(filePath) && !source.includes('LTF readable glue')) {
        problems.push(`${filePath}: wasm-bindgen glue was not post-processed by build.sh`);
      }
    } else if (extension === '.rs') checkRust(filePath, source);
    else if (extension === '.py') checkPython(filePath);
    else if (extension === '.sh') checkShell(filePath, source);
  }
}

// 📣 the report
for (const problem of problems) console.log(problem);
console.log(`check_readable: ${fileCount} files, ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
