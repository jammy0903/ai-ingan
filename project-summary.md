# Project Summary — AI인간 (aingan)

> First read for any new session. A fast, accurate mental model of this project for Claude Code.
> Authoritative design detail lives in `CLAUDE.md`; this file is the quick-orientation layer.

## What it is
**AI인간 (aingan)** — a watercolor-style, emotional **idle (incremental) game**. A discarded scrap robot (**AI**) walks an endless road, meets people, learns emotions one by one, and finally becomes **human** (인간). The whole arc is literally "AI → 인간". Tone: gentle, moving; the robot's *naive redefinition of emotions* (reading feelings as "errors/malfunctions") is the core narrative weapon.

- **Genre**: idle/incremental + active tap. No realtime multiplayer / netcode (low risk).
- **Goal**: standalone revenue game (Play Store via PWA→TWA wrap). Viral + ads/IAP.
- **Deploy domain**: `aingan.click` (static host + custom domain). Supabase for save/auth.
- **Hard taboo**: never gate the next emotion/story line behind an ad or paywall.

## Core loop (one paragraph)
Single currency = **걸음 (steps)**: +1/sec idle, plus **tap to accelerate** (cells-style feel; no long-press/hold). Spend steps to traverse edges on a **cells-style organic graph** of nodes (person / sense / branch / fog "empty circle" previews). Reaching a **person node** = a meeting → unlocks an emotion (4-fold reward: permanent step-rate ↑, watercolor color bleed, robot's diary entry, next-node preview). Revisiting a known node = **reunion** = level-up (steps/sec ↑ + deeper dialogue). Prestige (회차 여행) resets progress for permanent meta-currency **마음의 깊이** and deeper dialogue tiers. Collect **emotions 27 + body 11 in parallel** → reunite with creator **샘 알트머스크** at the end → twist: *the collecting itself already made you human.*

- Emotions = **Cowen & Keltner (2017), 27 human emotions** (implemented 27/27), organized as `root → 4 categories → emotions` 3-tier graph, plus visual-only assoc/oppo edges (`REL_EDGES`).
- Onboarding: 3-panel awakening modal → name the robot → on-road animated scene where Sam (drawn as人, Altman×Musk SVG) gives the quest via speech bubbles → robot explains rules → walking begins.

## Tech & file layout
- **Pure client-side static site** + Supabase (save/ranking). PWA, offline-capable. **No build, no bundler.**
- `index.html` — the **entire game**, single file, inline CSS+JS, global variables (no module system). ~2000+ lines.
- `sw.js` — service worker. `CACHE="aingan-vN"`. navigate(index.html)=**network-first**; all other assets=**cache-first**.
- `manifest.json`, `icon-{192,512}.png`, `icon.svg` — PWA. App display title 「강철의 인간술사」 (parody, IP risk acknowledged by user).
- `mockup/tone-c-watercolor.html` — confirmed art tone. `mockup/tone-a-pixar.html` — rejected ref.
- `privacy.html`, `delete-account.html` — legal docs (kept consistent with save policy).
- `plan.md` — lightweight refactor plan. `CLAUDE.md` — full design canon + working rules (§0). `git-rule.md` — git rules.

## Run locally
- `python3 -m http.server 8000` → `localhost:8000` (full Google login / cloud save). Hot reload: `npx live-server`.
- **No hot reload by default** — edit then manual F5. Verify syntax with `node --check` on the extracted inline script.

## Conventions / style
- Match existing code: global vars, inline `<script>`, Korean comments, no frameworks, no over-engineering.
- State object `S` holds game state; `snapshot()`/`applyState()` are the save seam. `SAVE_VERSION` + `migrate()` handle schema upgrades. `SAVE_KEY="aingan_save_v1"` (localStorage key name — fixed, don't rename).
- Story font = Gaegu (개구체).

## ⚠️ Gotchas (read before editing)
1. **Save policy is intentional design.** Browse mode (logged-out) saves **nothing — not even localStorage** (drives login). `saveState()` has `if(!authUser) return;` — **do not remove.** Only logged-in users get localStorage mirror + Supabase sync. Persistent session = auto-login stays; re-login shows Google account picker (`prompt:select_account`).
2. **SW stale-JS trap.** Any non-navigate asset (incl. future `data.js`/`balance.js`) is **cache-first** → edits serve stale until you **bump `CACHE="aingan-vN"`** in `sw.js`.
3. **Graph layout is fragile.** `computeRadialLayout()` auto-generates node positions from node-id string hash + tree leaf order — **0 hardcoded coords, but regenerating NODES from data shuffles the whole layout.** Do NOT data-drive graph generation. `REL_EDGES`/`TIER` are hand-curated.
4. **Onboarding re-show races.** Browse users re-seeing onboarding after refresh is *normal* (no save). But guard against it re-appearing mid-progress: `hasProgress()` gates `startIntro`/`startSamScene`; `dismissOnboarding()` clears it when a late async cloud save arrives.

## Current state & direction
- MVP core loop works: walk + tap + step accrual, cells-style parallel graph, meeting/reunion modals, onboarding, save + Google login, ending cinematic, PWA. Core design is locked (`CLAUDE.md` §6).
- **Active refactor (lightweight strangler, see `plan.md` + memory):** ① save versioning ✅ (branch `save-versioning`) → ② extract `data.js` → ③ extract `balance.js` → ④ document SW version-bump rule. ②③ use **global `<script src>` (NOT ES modules)** exposing `window.PEOPLE` etc., loaded before inline logic. Engine/view stay in index.html.
- **Rule:** refactor first, verify, commit — *then* features. Never both at once. (See `CLAUDE.md` §0, `git-rule.md`.)
