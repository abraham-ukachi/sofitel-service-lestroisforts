# AGENTS.md — Les Trois Forts Service Academy 🤖

> Read this first if you are an AI agent (or a new human) picking up this repo.

This repo is the published build of **Les Trois Forts — Service Academy**, a training PWA for the service team of
Les Trois Forts (Sofitel Marseille Vieux-Port). It is live at https://sofitel-service-lestroisforts.vercel.app.

The knowledge we gathered while building it (Oct–Nov 2026, versions 0.1 → 0.79) is packed into **skills** in
[`skills/`](./skills). Each skill is a folder with a `SKILL.md` (YAML front matter `name` + `description`, then the
instructions). Load the ones that match your task:

| Skill | Load it when you… |
|:------|:------------------|
| [`ltf-project-overview`](./skills/ltf-project-overview/SKILL.md) | start anything: architecture, file map, chapters, storage keys, hard rules |
| [`ltf-build-test-release`](./skills/ltf-build-test-release/SKILL.md) | build, test, bump a version, deploy to Vercel, push to GitHub, verify live |
| [`ltf-code-style`](./skills/ltf-code-style/SKILL.md) | write or review any code (house style is enforced by a checker) |
| [`ltf-content-updates`](./skills/ltf-content-updates/SKILL.md) | add or change menus, wines, cheeses, photos, the daily briefing, guest phrases |
| [`ltf-firebase-and-security`](./skills/ltf-firebase-and-security/SKILL.md) | touch sign-in, Firestore, rules, chat, push, the dashboard, CSP |
| [`ltf-simulation`](./skills/ltf-simulation/SKILL.md) | work on « Simulation de service » (the service game, solo + online) |
| [`ltf-lessons-learned`](./skills/ltf-lessons-learned/SKILL.md) | before shipping: the traps that already cost us a release |

The same skills work for any similar "staff training PWA" project: the overview and lessons skills explain the
patterns (dual JS/Rust build, live content overrides, one-line rules publishing, jsdom stubs) in general terms.

## Golden rules (short version)

1. 🙈 **Privacy**: never put guest names, phones, emails, companies, staff names or account numbers in the app,
   a commit or an issue. Simulation guests are fictional.
2. 🇫🇷 **French menus are the truth.** Never invent a dish, price, grape or allergen. Allergens are indicative.
3. 🧪 **Tests and the style checker at 0** before every push. A fix counts only after a live check; a phone check
   comes from the owner, never from you.
4. 🔖 **Every release** bumps `APP_VERSION`, both service-worker caches, the CHANGELOG and the About timeline.
5. 📜 **Proprietary licence** (since 0.50.0): every file keeps the `@license Proprietary - All Rights Reserved`
   header. Viewing only; do not copy this code into another product without the owner's written permission.
