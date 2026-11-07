---
name: ltf-code-style
description: The owner's house code style for the Les Trois Forts repo (licence header, MOTTO banner, JSDoc everywhere, emoji comments, no single-letter names, prettier 110, CSS/UI conventions), enforced by check_readable.js. Load before writing or reviewing any code here.
---

# House code style ✍️

Code must read as if **Abraham Ukachi** wrote it (style reference: his repo `abraham-ukachi/ab-elements-app`,
read-only — never modify it). The checker `rust/tools/check_readable.js` must report **0 problem(s)** before a push.

## Every file
1. **Licence header** (copy from any `pwa/*.js`): `@license Proprietary - All Rights Reserved`, project
   `sofitel-service-lestroisforts`, `@name`, `@file`, `@type`, `@authors: Abraham Ukachi <abrahamukachi@gmail.com>`,
   "Example usage" block. Never MIT (≤0.49.0 were MIT; not any more).
2. **MOTTO banner** right after it:
   ```js
   //
   // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
   // MOTTO: We'll always do more 😜!!!
   // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
   //
   ```
3. Section banners `// ===== SECTION NAME 🧩 ===== //`, separated by two blank lines.

## Functions & comments
- **JSDoc on every function, including inner helpers and arrow callbacks you name** (`///` in Rust):
  ```js
  /**
   * `formatTime` - Function 🕘
   *
   * A sentence about what it does.
   *
   * @param { number } time - a time in ms
   * @returns { string } - "14:05"
   */
  ```
- A short lowercase comment above almost every statement or block, `// import …` above imports, trailing comments
  on object fields, emojis where they help (🍪 🌍 🔗 🧹 🌱 👂 🚀 🛡️ ✅).
- **No single-letter identifiers anywhere** — not in loops, lambdas or catch: `index`, `item`, `event`, `error`.
- **No minified code of ours.** `prettier --print-width 110 --single-quote`, no line over 500 chars. Third-party
  builds live in `scan/vendor/`.
- Never put a literal `</script>` in comments of `pwa/*.js` (tests inline them into script tags). The SW
  registration inline script in `index.html` must stay byte-identical (a test regex reads it).
- Keep `const IC = {` and `const factQs = EN ? [` in `app.js` verbatim (`// prettier-ignore`): a generator slices them.

## UI conventions
- **Class names**: prefix per feature (`sim…`, `simlive…`, `adm…`, `c…` for chat). Never `.cb`, `.back`, `.b` —
  they collide with `index.html` styles.
- Icons: simple single-colour outline SVG. No coloured emoji as UI icons (chapter-row avatars and content emojis
  such as the cheese animals or 🛎️ are owner-accepted).
- Dialogs: in-page `.cdlg` / async `confirmAction(question, {text, ok, icon, danger})`. Never
  `window.confirm/alert/prompt`.
- Grids: `minmax(0,1fr)` tracks, children `min-width:0` (nowrap text once widened a grid past the screen).
- Desktop (≥960px): the tab bar becomes a left sidebar (248px, 280px ≥1360) — every new fixed bottom bar, FAB or
  top card needs the same left offset. Respect `env(safe-area-inset-*)`.
- `prefers-reduced-motion`: stop pings/animations, scroll instantly.
- Text selection off everywhere except text fields.
- Texts the owner edits (menu, setup, quick messages) are `{fr, en}` objects.
- Escape every user/remote value before it touches `innerHTML`; validate remote docs (`clean…()` functions).

## Commits
`:gitmoji: Imperative sentence-case summary (optional details)` with shortcodes, never the emoji glyph. One commit
per area, `:bookmark: Release x.y.z` last. Author `Abraham Ukachi <abrahamukachi@gmail.com>`. Gitmoji table with
house usage is in `CONTRIBUTING.md`.
