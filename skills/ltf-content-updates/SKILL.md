---
name: ltf-content-updates
description: How to turn the restaurant's real menus, staff sheets, photos and videos into Service Academy content (dishes, wines, cheeses, daily briefing, tasting menu, festive menus, Mise en place, guest phrases, images, scan embeddings) without inventing anything. Load when the owner sends a new card, sheet, photo or video.
---

# Updating content 🍽️

## Ground rules
- **The French card is the truth.** English is a translation. If the EN half of a sheet disagrees (it once listed
  bluefin tuna and pork belly), follow the FR half.
- **Never invent** a dish, price, grape, producer detail or allergen. Unknown → leave it out and add a TODO (README
  "TODOs" / open items). Researched facts (tasting notes, grapes) need a source; mark generic/inferred ones.
- Allergens (`alg` codes, `?` = likely) are **indicative**; say so, replace with the official card when it exists.
- Anything you guessed (allergens on a new menu, client lines) is flagged "owner must review" in your report.
- 🙈 Never put guest names/phones/emails/companies or staff names in data. Bookings in the briefing = table,
  time, covers, notes only.

## Where things go
| Content | File / key |
|:--|:--|
| Dishes, drinks, wines, `hq` fact cards | `data.js` (`window.LTF`), `svc` = chapter, `until:"YYYY-MM-DD"` to retire |
| EN text + ⓘ notes (`say` / `chef` / `serv` / `words`) | `i18n.js` (EN) + `i18n_fr.js` (FR) — **same keys** |
| Daily briefing | `LTF.jour` (tables ids → gold on plan, notes, catch of the day `peche`; ⭕ for items circled on paper) |
| Daily tasting menu | dishes with `svc 'deg'` + `LTF.degSub` = the sheet's date. Replace with each new sheet |
| Festive menus | `LTF.fetes` / `LTF.fq` (dated chapter, `until` after the season) |
| Cheese board | `LTF.fromages` ordered by **researched taste intensity** (not plating order). Also update the strength scale table in `index.html` and the cheese card `BOARD` |
| Wine palate | `LTF.taste` keyed `w|colour@appellation` or `c:<name>`; pairing wines carry `tk` |
| Grape pronunciation | dictionary `G` in `index.html` + an mp3 in `say/<slug>.mp3` (neural TTS, native language) |
| Winter badge | hardcoded set `W` of winter dish names in `index.html` |
| Mise en place | `SETUP_DEFAULT` in `setup.js`, live in Firestore `content/setup` (dashboard « Service ») |
| Fun tips | `fun.js` |

## « À dire au client » lines
Spoken and memorisable, the way a waiter really talks: « C'est un… », short, one image of the dish; technical words
are fine. Wine/pairing lines come from templates in `app.js` + `build.rs` — change both.

## Photos
- `img/`, ~520px wide; key in `images.js` (`d:<dish>`, `w:<producer>|<colour>@<appellation>`, `c:`, `k:`, `q:<cheese>`…)
  and a row in `img_src/map.tsv` (key, path/url, source).
- **New filename when replacing** a photo (SW and browsers cache by URL).
- Third-party: source, author, licence (e.g. CC BY-SA from Wikimedia Commons). AI-generated: mark `generated`
  (`d-gen-*`) and tell the owner they are generated.
- Photos change → regenerate scanner embeddings `scan/emb.json` with `tools/scan/emb.js` (SigLIP 2 q4 via
  onnxruntime-node + sharp). Stale embeddings = scanner misses the new photo.

## Videos & voice from the owner
Transcribe with faster-whisper, pull frames for photos, keep quantities "as filmed" (not par levels), and save a
verified transcription in the dev workspace `knowledge/NN-*.md` before coding it in.

## After editing
1. Rebuild (data is embedded in the wasm → full build). 2. Check for a **live override** in Firestore
`content/<section>` — it beats `data.js`. 3. Tests at 0. 4. Release per `ltf-build-test-release`.
