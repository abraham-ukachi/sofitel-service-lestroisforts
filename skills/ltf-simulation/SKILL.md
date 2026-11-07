---
name: ltf-simulation
description: Architecture of « Simulation de service » (sim.js and its modules): solo and online games, fictional bookings, dialogue scoring, drinks, voices, interruptions, questions, 3D waits, notification, live card, resume after reload, Firestore sim/simlist. Load before changing the simulation.
---

# Simulation de service 🛎️

A service game: the waiter runs a full dinner (19:00 → 23:30 cap) with fictional tables, from greeting to bill.

## Files (all JS, shared by both builds)
| Module | Role |
|:--|:--|
| `sim.js` (~6k lines) | core: setup, bookings, clock, dialogue, scoring, online sync, notification, solo save |
| `sim-voice.js` | Web Speech voices per guest, avatars, mute (`ltf_sim_mute_v1`) |
| `sim-drinks.js` | the waiter makes each drink (cocktail like the Bar game, wine, champagne, water, coffee) → score 0–3 |
| `sim-scene.js` | pure-CSS 3D waiting scenes (« Prêt dans N min ») |
| `sim-talk.js` | interruptions + « Questions » sheet |
| `sim-list.js` | « Parties en cours » list/drawer |
| `sim-live.js` | floating live-games card on every page (loaded by `index.html` and imported by `sim.js` → one instance) |

Modules receive helpers through `use…Kit()` from `sim.js`; they **never read `window.LTF`**. `sim.js` calls
`ensureData()` (loads `src/pwa/data.js` + i18n) because the Rust build has no `window.LTF` — a missing call once
produced 0 bookings.

## Game model
- 1–4 waiters, **rangs** split by table x position, tap to move tables. 5–10 bookings from a seed; `party` = m/f/c
  per guest (no child at a business meal); birthdays and allergies random.
- Dialogue 13–14 steps per table, multiple choice built from `LTF` (dinner carte, `alg`, wines). Scoring best +10,
  ok +4, wrong 0, danger −5; questions +2/+7 (allergy asked before ordering), 0 for bad timing or alcohol to a child.
- Clock speeds `[1, 2, 5, 10]` (×1 = real time). A table whose next step unlocks after 23:30 can't finish.
- XP via `window.LTFrecord('sim_…')` (shared anti-farm). Best solo `ltf_sim_best_v1`.

## Online
- `sim/{code}` (4 digits, 6 h, optional `pub`, `en`, `exp`, `li`) + `simlist/{random id}` (`h hn c n w s k d t en exp
  at`; `c` empty for private games). Host updates the summary at most once per service minute.
- Table entries use short validated fields (`i` interruptions, `d` drinks, `q` questions) — every remote doc
  passes `cleanRemote()`. All phones must run the same version (seeded features must match).
- Host map `ltf_sim_mine_v1` {listId: {c, e, h, l}} lets the host/players of this phone rejoin with no code.
  On another phone, the host finds the code via `where host==me, li==id, limit 1` (needs the v3 rule).

## Persistence & notification
- Solo save `ltf_sim_solo_v1` (throttled, re-validated on load, dropped if broken) → « Reprendre la partie ».
- Ongoing notification tag `ltf-sim` (silent, no renotify), only after an in-page explanation; restored on boot
  **only if permission is already granted** (never prompt on boot). Tap → `./?sim=1#sim` (the `#/` router drops a
  bare `#sim`); both service workers handle `open-sim`. It only updates while the page is alive.
- Live card `#simliveCard`: `onSnapshot` on `simlist` (`exp > now`, `limit 20`), signed-in only, stops on
  sign-out/permission-denied/60 s hidden; hides the game on screen; × remembered in sessionStorage.

## Table view
Call bar (avatars, mute, réécouter, Questions) fixed at the bottom (safe area, desktop offset); `#simTop`
scroll-to-top FAB after min(600px, 1.5 screens).

## Tests (dev workspace `work/simtest/`, jsdom + Firebase stub `stub.mjs` that enforces the simlist rules)
`run.mjs` (JS build) and `run_rust.mjs` (**no `window.LTF`**, speech stubbed) must both end `errors: 0`;
`reload.mjs` runs reload stages in separate processes. Each takes >2 min: background, one after the other.

## Known limits (tell the owner)
Few gendered voices on Chrome Android, some engines ignore pitch, iOS may block speech without a tap; sticky
notifications ignored on most phones; iOS needs home-screen install; online clock depends on each phone's clock.
