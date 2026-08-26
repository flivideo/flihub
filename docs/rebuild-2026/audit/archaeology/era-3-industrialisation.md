# Era 3 — Industrialisation (2026-02-13 → 2026-03-19)

**Commit range:** `df9be0c3..1588f7bb` — 34 commits
**Boundary before:** `df9be0c` *chore: partial ESLint 9 and Prettier setup* (2026-02-13)
**Boundary after:** `1588f7bb` *chore: Ralphy baseline — AGENTS.md updated, BACKLOG.md reconciled, next-round-brief added* (2026-03-19)
**Audit method:** every commit message + body read; `--stat` read for all 34; full diffs read for 18; deletions and reverts enumerated with `--diff-filter=D`; every claim about *current* state re-verified against `HEAD` or a live command.

---

## Headline

**FliHub bought a full industrial toolchain in a single day, and then spent the rest of the era discovering that almost none of it was load-bearing** — the CI went red on the very next feature commit and has never gone green again (78 consecutive failures, verified via `gh run list`), the structured logger has exactly one importer six months later, the "professional testing infrastructure" never executed the one test file that mattered, and the API registry froze at 22% of the real surface. What *did* survive is the thing nobody framed as the point: the pressure to make code testable produced the first real seams in the codebase — `configManager`, `srtUtils`, `s3Utils`, `poemWuiUtils`, and the six-way split of `useApi.ts`. The era ends by inventing the machinery (AGENTS.md + BACKLOG.md + IMPLEMENTATION_PLAN.md + assessment.md) that all of era 4+ runs on.

One-line summary: **the tooling was ceremonial; the refactoring it accidentally forced was the real deliverable.**

---

## Timeline narrative

### Act I — Tooling Day (2026-02-13, 11 commits in ~8 hours)

Eleven of the era's 34 commits land on a single day. In order:

| # | SHA | What |
|---|---|---|
| 1 | `d2e9653` | Vitest configs for client + server. The first test in FliHub's history is `expect(true).toBe(true)` (`client/src/test/App.test.tsx`). |
| 2 | `8d0d5f8` | **The big one.** ESLint 9 flat config, Prettier + reformat of all 268 files, Vitest, Zod env validation (`server/src/config/env.ts`), Pino logger (`server/src/config/logger.ts`), GitHub Actions CI. `268 files changed, 18198 insertions(+), 13432 deletions(-)`. |
| 3 | `394c33f` | Make CI green — **by downgrading rules.** `@typescript-eslint/no-unused-vars` `error` → `warn`; `no-empty-object-type` → `off`; five React rules pinned to `warn`. Commit body states plainly: *"0 errors, 151 warnings"*. Also adds the `queryString()` Express-5 param coercion helper. |
| 4 | `14ff7c5` | 156 → 20 warnings across 50+ files. |
| 5 | `8797509` | **The TDD demo.** Creates `shared/naming.test.ts` — *"14 tests for naming utilities (7 passing, 7 need API adjustments)"*. Body says: *"Milestone: FliHub now has professional testing infrastructure!"* Pushed to a throwaway branch `test/verify-ci-2026-02-13`, which still exists on `origin` today. |
| 6 | `7b9b8f4` | Formats docs "for CI". Also *adds* `server/test-env.js`. |
| 7 | `f3e7653` | Pino integration — into `server/src/index.ts` and nowhere else. |
| 8 | `d04f600` | `VERIFICATION-COMPLETE.md` (+249 lines). |
| 9 | `194ff2d` | Deletes `server/test-env.js` (added 4 commits earlier the same day). |
| 10 | `61282d2` | **Deletes 873 lines of verification documentation** written hours earlier: `TOOLING-FIX-PLAN.md`, `TOOLING-VERIFICATION-SUMMARY.md`, `VERIFICATION-COMPLETE.md`, `VERIFICATION-PLAN.md`, `docs/TDD-DEMO-RESULTS.md`. |
| 11 | `0de5b6e` | Moves root `AGENTS.md` → `docs/agents.md`, `HANDOVER-JAN.md` → `docs/handover-jan.md`. |

The day ends green. **It is the last green day in the repository's history.**

### Act II — The Export/S3 whipsaw (2026-02-16 → 2026-02-25, 6 commits)

- `99b281f` (Feb 16, FR-141) — consolidates the Export tab and the S3 Staging modal into one 982-line `ExportS3Tool.tsx` drawer.
- `9f428c0` (Feb 16) — cleanup: **deletes** `S3StagingPage.tsx` (661 lines), `shared/ExportPanel.tsx` (613 lines), `server/src/routes/export.ts` (305 lines). 1,579 lines of working UI+route removed.
- `999283f` (Feb 16, **authored by Jan**) — the only non-David commit in the era. Fixes WSL open-folder feedback and makes the DAM S3 download run under `bash -lc` so rbenv/gem PATH resolves.
- `ffeefb3` (Feb 16) — View/Open buttons in the S3 sections; clipboard fallback when `open` fails.
- `bc78182` (Feb 19, FR-142) — **splits `ExportS3Tool` back into two tools**, `GlingEditTool.tsx` + `S3StagingTool.tsx`. Three days after consolidating. The FR-142 PRD says it out loud: *"the resulting drawer mixes two distinct workflows."*
- `c0454fd`, `d29f4a1` (Feb 25) — two more S3 fixes: DAM returns *text*, not JSON, so upload state always read "Not uploaded"; the S3 console "View" URL was built from `v-{brand}` instead of the real bucket.

### Act III — The quiet drift (2026-02-26 → 2026-03-14, 8 commits)

Commit hygiene collapses exactly where the tooling era declared it fixed:

- `429acc3` — message: **`update flihub`**. Contents: a whole new subsystem — `PoemWuiPage.tsx`, `usePoemWuiApi.ts`, `server/src/routes/poem-wui.ts`, `fr-144-workflow-intake.md`. 703 insertions.
- `0bd4b73` — message: **`updates before migration`**. Persists `poemWuiUrl` / `brandConfigPath` into config.
- `54a4e2e` — transcription swaps `openai-whisper` → `mlx-whisper`. One file, hardcoded interpreter path replaced with a hardcoded binary path.
- `1806857` — message: **`clear db`**. Actually commits `server/brand-config.json` (78 lines of AppyDave brand/social/CTA data) into the repo.
- `43051b2`, `f85194e`, `e7dc4dd`, `f86fed4` — the dev-runtime scramble: `strictPort` + `concurrently --kill-others`, then a switch to **Overmind + Procfile**, then `cd "$(dirname "$0")"` in `start.sh`, then `PORT=5101` pinned in the Procfile because *"Overmind uses tmux, which carries env vars from whenever the tmux daemon was first started."*
- `5cb06bf`, `b84cf1c` — AWB Resume; `b84cf1c` immediately un-does the payload reshaping introduced by `5cb06bf` ("send raw `.awb.json` verbatim") and removes a spurious `exec('open ...')`.

### Act IV — Project Heal and the three-campaign burst (2026-03-16 → 2026-03-19, 5 commits)

- `a5a0504` (Mar 16) — FR-144/FR-145 batch. Notable for what it *didn't* build: *"FR-145: **Verified** Escape key closes video preview modals (already implemented)"*, *"FR-139: **Verified** Folders button already removed"*, *"Confirmed R-1/R-4/P-3/C-1/C-2/C-3/C-4 **already implemented**."*
- `9a40655` (Mar 16) — the NFR-146 audit lands the era's most important sentence: **`shared/naming.test.ts` is orphaned (never run by `npm test`) + 7 failing.**
- `2ac653c` (Mar 16) — **Project Heal.** First `docs/planning/BACKLOG.md` (B-ids) + `docs/planning/AGENTS.md` (280 lines of operational baseline).
- `0b483b0` (Mar 16) — the NFR-146 campaign plan: 15 work units, 8 waves.
- `fe228dd` (Mar 18) — **the era's real architectural commit.** 50 files, `5006 insertions(+), 1215 deletions(-)`, and a **one-line commit message**. It contains the completed output of *three* campaigns (nfr-146-test-coverage, nfr-code-quality-1, nfr-architecture-refactor).
- `1588f7bb` (Mar 19) — Ralphy baseline; `next-round-brief.md` written for a session that hasn't started yet. Era 4 begins.

---

## Feature ledger

| Feature | Area | Req ID | Evidence | KB/Vis? |
|---|---|---|---|---|
| Vitest test harness (client + server) | tooling | — | `d2e9653` | |
| ESLint 9 flat config + Prettier + repo-wide reformat | tooling | — | `8d0d5f8` | |
| GitHub Actions CI (lint → format:check → build → test) | tooling | — | `8d0d5f8` (`.github/workflows/ci.yml`) | |
| Zod env validation (`server/src/config/env.ts`) | config | — | `8d0d5f8` | |
| Pino structured logging (`server/src/config/logger.ts`) | tooling | — | `8d0d5f8`, `f3e7653` | |
| `queryString()` Express-5 param coercion helper | server | — | `394c33f` (`server/src/utils/pathUtils.ts`) | |
| Unified Export/S3 drawer (`ExportS3Tool`, 982 lines) | export/S3 | FR-141 | `99b281f` | |
| S3 status false-positive fix + `expandPath` on s3-staging routes | export/S3 | FR-141 | `99b281f` | |
| WSL open-folder feedback: return `windowsPath`, show in toast | system | — | `999283f` (Jan) | |
| DAM run under login shell (`bash -lc`) for rbenv PATH | export/S3 | — | `999283f` | |
| S3 View (console) + Open Folder buttons on PREP and POST | export/S3 | — | `ffeefb3` | **vis** (status buttons) |
| Clipboard fallback when `open` fails (all open actions) | system | — | `ffeefb3` | |
| Split into `GlingEditTool` + `S3StagingTool` | export/S3 | FR-142 | `bc78182` | |
| Hidden-file filter so `.DS_Store` stops triggering legacy detection | export/S3 | FR-142 | `bc78182` | |
| DAM text-output parsing for `s3-status` (`S3 files: N`) | export/S3 | — | `c0454fd` | **vis** (upload badge) |
| SRT clipboard copy button | transcripts | FR-143 | `c0454fd` | **kb/vis** (copy action) |
| S3 console URL built from real bucket/region/prefix (`brands.json`) | export/S3 | — | `d29f4a1` | |
| POEM WUI / AWB intake page + routes | poem-wui | FR-144 | `429acc3` | |
| Persist `poemWuiUrl` / `brandConfigPath` in config | config | FR-144 | `0bd4b73` | |
| `server/brand-config.json` committed (brand/social/CTA payload) | config | — | `1806857` | |
| mlx-whisper on Apple Silicon (`whisper-large-v3-turbo`) | transcripts | — | `54a4e2e` | |
| `strictPort: true` + `concurrently --kill-others` | dev-infra | — | `43051b2` | |
| Overmind + Procfile process management; `start.sh` port pre-check | dev-infra | — | `f85194e` | |
| `start.sh` auto-opens browser after 4s; `cd "$(dirname "$0")"` | dev-infra | — | `f85194e`, `e7dc4dd` | |
| `PORT=5101` pinned in Procfile (tmux env inheritance) | dev-infra | — | `f86fed4` | |
| AWB `.awb.json` status row + "Resume in AWB →" button | poem-wui | — | `5cb06bf` | **kb/vis** (hover tooltip shows full path; disabled-state tooltips) |
| `GET /api/poem-wui/chapter-data` JSON chapter payload | poem-wui | — | `5cb06bf` | |
| Chapter Copy button moved footer → header (always visible) | chapters | — | `5cb06bf` | **vis** |
| Recordings stats bar split into 3 rows (Stats / Filters / Actions) | recordings | — | `5cb06bf` | **vis** |
| `"Transcribe 2"` → `"Transcribe (2 pending)"`; shadows own stat token | recordings | — | `5cb06bf` | **vis** |
| Raw `.awb.json` posted verbatim on resume | poem-wui | — | `b84cf1c` | |
| "Send to POEM WUI" button in S3 Staging POST section | poem-wui | FR-144 | `a5a0504` | |
| AWB port corrected 3001 → 5041 everywhere | poem-wui | FR-144 | `a5a0504` | |
| Escape closes video preview modals (**verified, not built**) | recordings | FR-145 | `a5a0504` | **kb** |
| Preview filename `text-lg`; subtle lowercase safe/parked filter toggles | recordings | I-2 / R-5 | `a5a0504` | **vis** |
| `docs/planning/BACKLOG.md` — canonical B-id register | governance | — | `2ac653c` | |
| `docs/planning/AGENTS.md` — agent operational baseline | governance | — | `2ac653c` | |
| 298 → 331 real tests; shared wired into `npm test`; `paths.test.ts` | testing | NFR-146 / B017 | `fe228dd` | |
| `useApi.ts` split into 6 domain hooks (795 → 28-line barrel) | client arch | NFR-arch | `fe228dd` | |
| `configManager.ts` extracted from `index.ts` (−136 lines) | server arch | NFR-arch / B013 | `fe228dd` | |
| `srtUtils.ts`, `s3Utils.ts`, `poemWuiUtils.ts` extracted from routes | server arch | NFR-arch / NFR-cq1 | `fe228dd` | |
| `isPathWithinProject()` path-traversal guard on `srt-text` | security | NFR-cq1 | `fe228dd` | |
| `fs-extra` standardised as the single server I/O mock target | server arch | NFR-arch | `fe228dd` | |
| Coverage thresholds added to all three vitest configs | testing | NFR-cq1 | `fe228dd` | (**inert — see Dead Ends**) |
| `next-round-brief.md` — auto-detected campaign handoff | governance | — | `1588f7bb` | |

**Keyboard / drag / hover / visualisation items specifically:** the era is thin here. Nothing keyboard-driven was *built* — FR-145 (Escape closes modal) was a spec written for behaviour that already existed. No drag/drop at all. Hover work is limited to `title=` tooltips on the AWB tab (`5cb06bf`) and Tailwind `hover:` states. Visualisation work is the recordings stats bar re-layout (`5cb06bf`) and — going the other way — the **removal** of the green "safe" row background (see Dead Ends).

---

## Dead ends

### 1. CI — green for one day, red for six months

This is the single hardest fact in the era.

`gh run list --repo flivideo/flihub` returns 85 runs total: **7 successes, 78 failures.** Every one of the 7 successes is dated **2026-02-13** — Tooling Day itself. The chronological sequence is:

```
2026-02-13 09:46  failure  8d0d5f8  chore: add complete quality tooling infrastructure
2026-02-13 10:41  success  394c33f  fix: resolve ESLint, Prettier, and TypeScript build errors
...
2026-02-13 14:34  success  0de5b6e  chore: fix naming conventions           ← LAST GREEN BUILD EVER
2026-02-16 12:32  failure  9f428c0  chore(FR-141): cleanup obsolete files   ← red from here on
...
2026-08-18 12:23  failure  32136555402                                       ← still red
```

**Fate:** still present, still running, still failing. `.github/workflows/ci.yml` has been committed exactly once (`8d0d5f8`) and never edited since.

**Why it failed:** the gate that breaks first is `format:check`. Running `./node_modules/.bin/prettier --check "client/src/components/*.tsx"` on `main` today reports **28 files** with style issues. Nothing in the workflow, in `CLAUDE.md`, or in the era's own `docs/planning/AGENTS.md` "Quality Gates" list mentions lint or format — the AGENTS.md gates are build-server, build-client, `npm test`, no new `any`, smoke test. **The team's operational contract and the CI contract diverged on day one and nobody reconciled them.**

*What this check does NOT establish:* the 78 failures are counted, not diagnosed. I verified the `format:check` step would fail today; I did not open each failed run's log, so other steps may also be failing.

### 2. Pino structured logging — one importer, six months on

`8d0d5f8` installs Pino and creates `server/src/config/logger.ts`; `f3e7653` integrates it — into `server/src/index.ts` and no other file, with a body claiming *"Ready for use throughout server codebase."*

At `1588f7bb`: 1 file imports `config/logger`; 323 `console.*` lines in `server/src/**/*.ts`.
At `HEAD` (2026-08): **1 file imports `config/logger`; 355 `console.*` lines.** Inside `index.ts` itself — the only importer — there are 3 `log.*` calls and 18 `console.*` calls.

**Fate:** still present, unused. Zero adoption, and the console count *grew* by 32.

### 3. Zod env validation — two importers

`server/src/config/env.ts` is imported by `server/src/index.ts` and `server/src/routes/poem-wui.ts`. Six other server files read `process.env` directly. **Fate:** still present, marginally used.

### 4. `shared/naming.test.ts` — the TDD demo that never ran

Added `8797509` on Tooling Day, knowingly with 7 failing assertions (*"7 passing, 7 need API adjustments"*), in the same commit that declared *"professional testing infrastructure."* But `package.json` at `8d0d5f8` had:

```json
"test": "npm test -w client && npm test -w server"
```

— no `-w shared`. And `shared/package.json` at that point had no `test` script at all. So `npm test` reported **green** while the only real test file in the repo was never executed and was 50% failing.

**33 days later** the NFR-146 audit (`9a40655`) found it. `fe228dd` fixed both halves (`"test": "npm test -w shared && npm test -w client && npm test -w server"`).

**This is the era's cleanest example of "absence and success look identical."** A passing `npm test` was indistinguishable from a `npm test` that ran nothing.

### 5. Coverage thresholds — added, and inert

The `add-coverage-thresholds` work unit in `nfr-code-quality-1` reports: *"Measured actual coverage, set thresholds 5pts below floor. shared: lines 27/fn 20/br 18. server: lines 16/fn 20/br 18. client: lines 28/fn 15/br 25. All passing."*

But the block was placed at the **top level** of `defineConfig`, outside `test:` — `shared/vitest.config.ts:9`, `server/vitest.config.ts:9`, `client/vitest.config.ts:13`. Vitest reads coverage config from `test.coverage`, not from a root `coverage` key.

**Verified empirically.** The committed config declares `reporter: ['text', 'lcov']`. Running `vitest run --coverage` in `server/` produced `coverage/clover.xml`, `coverage/coverage-final.json` and `coverage/index.html` — the **Vitest default reporter set** (`text, html, clover, json`) — and **no `lcov.info`**. The declared reporters were not applied, therefore the block is not read, therefore the thresholds do not run. (Cross-check: `vitest run --coverage --coverage.thresholds.lines=99` on the CLI *does* fail the run, so the threshold mechanism itself works — it is only the config placement that is wrong.)

**Fate:** still present, still misplaced. `*/vitest.config.ts` has not been touched since `fe228dd` (2026-03-18). Backlog item **B022** ("run vitest --coverage, document real baselines, tighten thresholds") was written into `next-round-brief.md` on 2026-03-19 and never actioned.

### 6. `shared/*.js` and `*.d.ts` — a committed build output that tests actually test

`.gitignore` ignores `dist/` and `build/`, but `shared/` compiles **in place**: `shared/naming.js`, `shared/naming.d.ts`, `shared/types.js`, `shared/types.d.ts`, `shared/paths.js`, `shared/constants.js` are all tracked. `start.sh` runs `npm run build -w shared` before launching; `docs/planning/AGENTS.md` lists *"`npm run build -w shared` is easy to forget"* as Known Gotcha #2.

Era 3 made this worse in a specific way: when it wired `shared` into `npm test`, the resulting tests **resolve against the compiled `.js`, not the `.ts` source.** Running `vitest run --coverage` in `shared/` produces a coverage table listing `naming.js` and `paths.js` — no `.ts` entries. So the shared unit tests validate a checked-in build artifact that must be manually regenerated. Edit `naming.ts`, forget to rebuild, and the tests pass against the previous version.

**Fate:** still present at `HEAD`. (Currently benign for `naming` — `naming.ts` and `naming.js` were both last committed in `8d0d5f8` and are in sync. `types.ts` is 43,936 bytes and `types.js` is 626 bytes, but that is expected since type declarations erase.)

### 7. `shared/apiRegistry.ts` — a contract that froze in this era

A 1,000-line hand-maintained catalogue of API endpoints. It is imported by exactly one file: `client/src/components/ApiExplorer.tsx`. The server does not use it to define, validate, or type routes.

- Endpoints described in the registry: **34**
- `router.<verb>(` registrations in `server/src/routes/` at `HEAD`: **156**
- Last commit touching `shared/apiRegistry.ts`: **`14ff7c5`, 2026-02-13** — and that was a *lint* fix, not a content update.

**Fate:** still present, stale since this era. *Caveat:* 34 and 156 count different units (registry entries vs. handler registrations across mounted routers), so this establishes an order-of-magnitude gap, not an exact drift figure.

### 8. 873 lines of verification documentation, written and deleted the same day

`TOOLING-FIX-PLAN.md` (152), `TOOLING-VERIFICATION-SUMMARY.md` (241), `VERIFICATION-COMPLETE.md` (249), `VERIFICATION-PLAN.md` (152), `docs/TDD-DEMO-RESULTS.md` (79) — all created between `394c33f` and `d04f600`, all deleted by `61282d2` hours later. `server/test-env.js` was likewise added (`7b9b8f4`) and deleted (`194ff2d`) within the same afternoon.

**Fate:** deleted. Pure ceremony — documentation *about* having done the work, produced as part of doing the work.

### 9. `ExportS3Tool.tsx` — a 982-line component with a 3-day lifespan

Created `99b281f` (Feb 16), renamed away `bc78182` (Feb 19). To build it, `9f428c0` first deleted `S3StagingPage.tsx` (661), `shared/ExportPanel.tsx` (613) and `server/src/routes/export.ts` (305).

**Fate:** superseded twice. `S3StagingTool.tsx` (the FR-142 successor) was itself deleted on 2026-03-22 in `21f4ebe` — *"manage-relay-refactor wave 1 — B039 (…retire S3…)"* — three days after this era closed, replaced by the Relay/Sync tools. Only `GlingEditTool.tsx` from the FR-142 split survives to `HEAD`.

**Net effect of the whole Export/S3 arc:** ~1,579 lines deleted → 982 lines written → split into 419+410 → the S3 half deleted 31 days later. The *pipeline stage* (hand files to a remote editor) survived; every UI built for it in this era did not.

### 10. `nfr-architecture-refactor` and `nfr-code-quality-1` — planned as separate campaigns, delivered as one anonymous commit

Both campaigns have full `AGENTS.md` (290 lines each) + `IMPLEMENTATION_PLAN.md` + `assessment.md` under `docs/planning/`. Both plans show **every work unit marked `[x]` complete**. But `git log` for those directories shows only two commits ever: `0b483b0` (plan) and `fe228dd` (execution).

So three campaigns' worth of waves — 15 + 9 + 6 = 30 work units — collapsed into **one commit whose entire message is `feat(flihub): test coverage refactor — new hooks, config manager, test suite expansion`**.

**Fate:** the work landed and survives. The *history* of it did not. From `fe228dd` onward, `git log` stops being the record of change; `IMPLEMENTATION_PLAN.md` becomes the real changelog.

### 11. The green "safe" row — a state visualisation that was removed

`a5a0504` (UX item R-2):

```diff
-  // FR-111: Safe files (green background)
-  rowClasses = 'bg-green-50 border-green-200 text-gray-500';
+  // R-2: Safe files — no badge, rely on ← Restore button to signal status
+  rowClasses = 'bg-gray-50 border-gray-200';
```

A file state (`isSafe`) lost its distinct colour and now renders in the same grey family as an ordinary row; the only remaining signal is a small `← Restore` button. Meanwhile `isParked` kept pink and chapter rows kept purple. **Fate:** superseded — `RecordingsView.tsx` at `HEAD` no longer contains `rowClasses` at all; the component was rewritten later.

### 12. `test/verify-ci-2026-02-13` — an orphaned remote branch

`refs/remotes/origin/test/verify-ci-2026-02-13` still points at `8797509`. Created to prove CI ran, never deleted.

### 13. Specification debt: PRDs for features nobody wanted

`docs/planning/BACKLOG.md` at `2ac653c` defers three items with the identical reason **"PRD ready, no user demand"** — B014 (FR-135 Chapter Tools: Move/Swap/Undo), B015 (FR-134 Inconsistency Detection), B016 (FR-133 File Status Indicators). Two more are rejected outright, one because it *"was cancelled after discovering scanner bugs"* (NFR-141) and one as *"marked Future with no roadmap"* (B006).

At the era's close there were **76 PRD files** in `docs/prd/` for ~45 shipped features. Documentation churn in this era (`docs/`: 141 files, +13,075 / −4,977) is roughly the same size as source churn (`client/src` + `server/src` + `shared`: 161 files, +15,513 / −10,491).

### 14. Follow-ups that never happened

`next-round-brief.md` (`1588f7bb`) proposed B020 (React hook tests), B022 (real coverage baselines), B023 (replace the placeholder server test). Five months later at `HEAD`:

- `server/src/test/sample.test.ts` still contains `const value = 1 + 1; expect(value).toBe(2);`
- Exactly one hook test file exists: `client/src/test/useInvalidateProjectStorage.test.tsx`
- The vitest configs are untouched since `fe228dd`

---

## Pivots

| From | To | Trigger | Evidence |
|---|---|---|---|
| Two separate export surfaces (Export tab + S3 modal) | One unified `ExportS3Tool` drawer | UAT pain — *"Fixes real user pain points from UAT testing"* | `99b281f` |
| One unified drawer | Two focused tools (`GlingEditTool`, `S3StagingTool`) | Realising the drawer mixed **local edit prep** with **remote collaboration** — two pipeline stages, not one | `bc78182`, `docs/prd/fr-142-split-export-s3-tool.md` |
| `openai-whisper` via pyenv Python 3.11 | `mlx-whisper` binary, `whisper-large-v3-turbo` | Apple Silicon Neural Engine; the old Python path no longer existed | `54a4e2e` |
| `npm run dev` via `concurrently` | Overmind + `Procfile` (tmux-backed, survives terminal close) | Wanting a persistent dev server; port-collision pain | `f85194e`, `43051b2` |
| Trusting tmux/shell env for ports | Pinning `PORT=5101` in the Procfile | The Overmind switch immediately introduced env inheritance from a long-lived tmux daemon | `f86fed4` |
| Reshaping the AWB payload server-side | Forwarding raw `.awb.json` verbatim | Reshaping dropped fields AWB needed for resume | `b84cf1c` |
| `docs/backlog.md` with `FR-nnn` / `NFR-nnn` ids | `docs/planning/BACKLOG.md` with `B0nn` ids | "Project Heal" consolidation of ~45 shipped features into one canonical register | `2ac653c` |
| Human-written PRD → implement | Campaign folder (`AGENTS.md` + `IMPLEMENTATION_PLAN.md` + `assessment.md`) → parallel agent waves | Ralphy adoption; the NFR-146 test-coverage campaign is the first instance | `0b483b0`, `fe228dd`, `1588f7bb` |
| Features drive refactoring | **Testability** drives refactoring | The NFR-146 audit found 30+ critical pure functions untested and unexported; extracting them to test them created the seams | `9a40655` → `fe228dd` |

---

## Pain signals

| Area | Signal | Repeat count | Evidence |
|---|---|---|---|
| **CI / quality gates** | Green for one day, then **78 consecutive failures** over six months | 78 | `gh run list --repo flivideo/flihub` — 85 runs, 7 successes, all on 2026-02-13 |
| **Export / S3 / DAM** | 8 commits touched `server/src/routes/s3-staging.ts` in 34 days — out of **12 all-time**. Two-thirds of that file's entire history happened in this era. | 8 | `99b281f`, `999283f`, `bc78182`, `c0454fd`, `d29f4a1`, `a5a0504`, `fe228dd`, `8d0d5f8` |
| **DAM CLI contract** | Shelling out to a Ruby CLI and parsing its output. Failure modes hit in one month: PATH not resolvable (`bash -lc` fix), output format is text not JSON, wrong bucket name in the console URL, `.DS_Store` mistaken for a legacy flat file. | 4 distinct | `999283f`, `c0454fd`, `d29f4a1`, `bc78182` |
| **Dev-server startup** | 4 commits in 5 days (Mar 10–14): strictPort, `--kill-others`, Overmind/Procfile, `cd`+browser-open, PORT pin. **All 4 all-time commits to `start.sh`/`Procfile` other than their creation fall inside this era.** | 4 | `43051b2`, `f85194e`, `e7dc4dd`, `f86fed4` |
| **ESLint** | 3 commits in one day to get the linter to pass: 156 issues → downgrade rules → 151 warnings → fix 136 → 20 warnings. The gate moved to meet the code. | 3 | `8d0d5f8`, `394c33f`, `14ff7c5` |
| **SRT resolution order** | The rule *"look in `s3-staging/post/`, then `final/`, then `recording-transcripts/`"* was written **three separate times**: `poem-wui.ts:findSrt` (`429acc3`), inline in `s3-staging.ts` (`a5a0504`), and a third copy of `stripSrt` alongside it. `a5a0504`'s own message claims it *"removed duplicate publish-to-poem route… identified via code quality audit"* — in the same commit that duplicated the scan order again. | 3 | `429acc3`, `a5a0504`, `fe228dd` (extraction to `poemWuiUtils.ts`/`srtUtils.ts`) |
| **Backlog ↔ code drift** | One commit reports **three** items as "already implemented, verified not built" (FR-145, FR-139, and R-1/R-4/P-3/C-1/C-2/C-3/C-4). The backlog had stopped modelling the system. | 3+7 | `a5a0504` |
| **Commit hygiene** | Immediately after the era that installed semantic-commit tooling: `update flihub` (703 insertions, whole new subsystem), `updates before migration`, `clear db` (commits a brand config file). And the era's largest refactor (`fe228dd`, 50 files, +5,006) has a single-line message and no body. | 4 | `429acc3`, `0bd4b73`, `1806857`, `fe228dd` |
| **Response shape** | `{ success: … }` vs `{ ok: … }` never reconciled. `docs/planning/AGENTS.md` documents it as an anti-pattern *to work around*, not to fix: *"`poem-wui` routes use `{ ok }`, everything else uses `{ success }`. Stay consistent within a file."* At `HEAD`: 134 `success: true` vs 5 `ok: true` in `server/src/routes/`. | ongoing | `2ac653c`, `git grep` at `HEAD` |
| **Config sprawl** | The era ends with config living in: `server/config.json` (gitignored), `server/brand-config.json` (committed), `brands.json` (external), `server/src/config/env.ts` (Zod), and module-level consts in route files. AGENTS.md gotcha #4 admits the consequence: *"`server/config.json` is gitignored. If a Ralphy wave modifies config.json, it will not appear in the diff."* | 5 locations | `1806857`, `d29f4a1`, `8d0d5f8`, `2ac653c` |

---

## Architectural moments

### A1. Repo-wide Prettier reformat in one commit (`8d0d5f8`)

268 files, +18,198/−13,432. Ignoring whitespace it is still 262 files / +12,966/−8,200 — because Prettier's 100-char reflow counts as content change. Everything afterwards — every blame, every bisect, every "when did this line appear" — crosses this commit.

**Consequence, measured, and smaller than it looks:** `git blame` on `shared/naming.ts` attributes 118 of ~514 lines (~23%) to `8d0d5f8`; on `server/src/utils/renameRecording.ts`, only 13 lines. Real, but not the blame apocalypse it could have been — most hot files have been rewritten since.

**For the rebuild:** format from commit #1, or never. A mid-life reformat costs history and buys nothing the next commit couldn't have bought.

### A2. The gate was moved to fit the code, not the reverse (`394c33f`)

*"Adjust ESLint 9 rules to downgrade pre-existing code issues to warnings (0 errors, 151 warnings)."* Five React rules pinned to `warn`, including `react-hooks/exhaustive-deps`, `react-hooks/set-state-in-effect`, `react-hooks/immutability`, `react-hooks/preserve-manual-memoization`.

**Consequence:** the linter can never fail. It reports and is ignored. Combined with A3, FliHub has had a CI pipeline for six months in which **no step has ever been allowed to block a merge** — the workflow fails, and merging continues.

### A3. CI was installed without a merge gate

`.github/workflows/ci.yml` runs on `push` to `main` and on PRs. But the project's own operating model is *"Default to main. No surprise branches, PRs, or worktrees"* — so CI only ever runs **after** the push. There is no branch protection in the workflow, and the AGENTS.md "Quality Gates (non-negotiable)" list omits lint and format entirely.

**Consequence:** a red CI is a notification, not a stop. 78 red runs later, nobody has been forced to look.

**For the rebuild:** either make the gate blocking (pre-push hook, or a real PR flow) or don't install it. A permanently-red CI is worse than none — it trains everyone to ignore the one channel that would tell them something broke.

### A4. `shared/` compiles in place, and the tests test the output

`shared/package.json` declares `"main": "types.ts"`, but `shared/naming.js`, `paths.js`, `types.js` and their `.d.ts` files are committed alongside the sources, and `start.sh` runs `npm run build -w shared`. When era 3 wired `shared` into `npm test`, the tests began resolving to the compiled `.js`.

**Consequence:** three copies of the same knowledge (`.ts` source, `.js` artifact, `.d.ts` declarations), a mandatory manual rebuild step that AGENTS.md lists as a known gotcha, and a test suite whose subject is a build artifact.

**For the rebuild:** publish `shared` as source-only (one file extension, resolved by the bundler and by `tsx`/`vite-node` on the server) or as a properly-built package with `dist/` gitignored. Never both.

### A5. Testability became the refactoring force (`9a40655` → `fe228dd`)

The seams that exist in FliHub today were cut not because the design demanded them but because the functions had to be *importable and exportable* to be tested. From the NFR-146 assessment:

> *"`chapterExtraction` functions were unexported — `parseSrtTimestamp`, `formatYouTubeTimestamp`, `calculateConfidence` all needed `export` added."*
> *"`finalMedia` functions were also unexported."*

The result: `configManager.ts`, `srtUtils.ts`, `s3Utils.ts`, `poemWuiUtils.ts`, and `useApi.ts` 795 → 28-line barrel + 6 domain hooks.

**Consequence:** the boundaries are real and they still hold at `HEAD` — but they are *test-shaped*, not *domain-shaped*. `poemWuiUtils.ts` is "the parts of the poem-wui route a test could reach", not "the POEM WUI domain". Nothing in the era named a domain concept.

**For the rebuild:** cut domain seams first (Recording, Chapter, Transcript, Project, Relay), and testability comes free. Cutting seams for tests gets you testable code with no model.

### A6. The campaign apparatus was invented here, and it displaced git

`2ac653c` + `0b483b0` + `fe228dd` + `1588f7bb` establish the pattern that runs FliHub from here on:

```
docs/planning/<campaign>/
  ├── AGENTS.md              # 280-290 lines, self-contained agent context
  ├── IMPLEMENTATION_PLAN.md # waves × work units, checkbox state machine
  └── assessment.md          # post-campaign retro: what worked / didn't / learnings
```

**Consequence 1 — history moved out of git.** Three campaigns' 30 work units landed as one commit with a one-line message. `IMPLEMENTATION_PLAN.md` — which records outcome notes per work unit, test counts, and file-level detail — is now the real changelog.

**Consequence 2 — the agent context forked 28 ways.** At `HEAD` there are **28** `AGENTS.md` files. The baseline (`docs/planning/AGENTS.md`) is now 436 lines; `nfr-architecture-refactor/AGENTS.md` is 290 lines and differs from the baseline by 534 diff lines. Each campaign copies the baseline, edits it, and abandons it. There is no mechanism propagating a correction in one back to the others.

**For the rebuild:** keep the campaign artifacts — the `assessment.md` retros in this era are genuinely the highest-signal documents in the repo — but (a) commit per work unit, not per campaign, and (b) make the per-campaign AGENTS.md an *overlay* that references one canonical file rather than a fork of it.

### A7. Two backlogs, both alive

Project Heal created `docs/planning/BACKLOG.md` (B-ids) as *"canonical"*, but never retired `docs/backlog.md` (FR/NFR-ids). AGENTS.md itself labels the old one *"legacy — superseded by BACKLOG.md"* — and then both keep being edited: `docs/backlog.md` last touched 2026-04-12 (`a039d8a`), `docs/planning/BACKLOG.md` last touched 2026-04-14 (`4332504`). Post-era commit subjects still cite `FR-147` and `FR-148` alongside `B024`–`B065`.

**For the rebuild:** an id scheme migration that leaves the old register writable is a fork, not a migration.

### A8. External CLIs as untyped dependencies

The era hardened FliHub's reliance on shelling out: `mlx_whisper` (`54a4e2e`), the `dam` Ruby CLI (`999283f`, `c0454fd`), `open` (`ffeefb3`), Overmind/tmux (`f85194e`, `f86fed4`). Every one of these produced a bug in this era, and the bugs are all the same bug: **a text interface with no contract.** AGENTS.md ends up documenting them as *External Dependencies* with the note *"Tests must mock `execAsync`."*

**For the rebuild:** put every shell-out behind one adapter module per tool, with a typed result and a single parse point. Then the "DAM returns text not JSON" class of bug is one file, not one route.

### A9. FR-comments as the only traceability system

AGENTS.md convention #4: *"Every piece of code introduced by a requirement gets a comment: `// FR-144: POEM WUI workflow intake`. **This is the only traceability system (no JIRA).**"* At `HEAD` there are **1,202** such annotation lines across `client/src`, `server/src` and `shared`.

**Consequence:** the codebase carries a permanent archaeological layer that never gets cleaned. `// FR-111: Safe files (green background)` sat directly above the line that changed the colour away from green — the comment outlived the behaviour by minutes and was replaced only because that exact line was edited.

**For the rebuild:** requirement ids belong in the commit and the plan, not in the source. Source comments should say *why the code is this way*, and a superseded FR number says nothing.

---

## What a rebuild should learn from this era

1. **Install the gate on day 1 of the repo, and make it blocking.** Everything era 3 bought — ESLint, Prettier, CI, coverage thresholds — is present and inert because none of it can stop anything. The single highest-value change is not adding more tooling; it is making one gate refuse to let work through.

2. **Never let "the tests pass" and "the tests ran" be indistinguishable.** `npm test` was green for 33 days while the only real test file was unreachable. In the rebuild: assert a minimum test *count* in CI, or fail on zero-tests-collected in every workspace. The same principle killed the coverage thresholds — a config block that silently does nothing looks exactly like one that works.

3. **Cut domain seams, not test seams.** `srtUtils`, `s3Utils`, `poemWuiUtils`, `configManager` are all real improvements and they all exist because a test needed an import. Name the domains up front — Recording, Chapter, Transcript, Project, Relay, Storage — and put behaviour in them. The FliHub of era 3 had 156 route registrations and zero domain modules.

4. **One home for every business rule, enforced by there being nowhere else to put it.** "Where do I find the SRT?" was written three times in four weeks. "How do I parse a recording filename?" is protected (`shared/naming.ts`, with an explicit anti-pattern warning) and it held. The difference is that one had a named home and the other didn't.

5. **Wrap every external CLI in a typed adapter.** `dam`, `mlx_whisper`, `open`, `overmind` — four shell-outs, four classes of bug, all in one month, all "the text output changed shape / the PATH wasn't there".

6. **Config is one thing with one shape.** Era 3 left five config locations, one of them gitignored in a way that makes agent changes invisible in diffs. Pick one file, one schema, validated once, and make it committed-with-secrets-extracted rather than gitignored-wholesale.

7. **Commit per work unit, even under agent orchestration.** The single most valuable artifact this era produced is `docs/planning/nfr-146-test-coverage/assessment.md` — a genuine retro naming nine concrete behavioural facts about the codebase. The least valuable is `fe228dd`'s commit message. Keep the retro; also keep the granularity.

8. **The backlog must be a model of the system, or it is a liability.** One commit in this era reported ten backlog items as already-implemented. A backlog that describes work already done, or specs features with "no user demand", costs more than it saves. Write the spec when the work starts, not when the idea occurs.

9. **Documentation that certifies work is not documentation.** 873 lines of VERIFICATION-*.md were written and deleted the same day. The durable docs from this era are the ones that describe *behaviour an agent would otherwise have to rediscover* (AGENTS.md gotchas, assessment learnings). The disposable ones all had "VERIFICATION" or "COMPLETE" in the filename.

10. **Consolidate/split cycles are a symptom of an unnamed pipeline.** FR-141 merged Export and S3; FR-142 split them 3 days later; B039 deleted the S3 half 31 days after that. The underlying model — a video moves through *record → name → transcribe → prep-for-edit → hand-to-editor → receive → publish* — was never expressed in code as stages. The UI kept being rearranged because the domain underneath it had no shape to follow.

---

## Appendix — commit index

```
d2e9653  2026-02-13  chore: add Vitest testing setup and complete ESLint/Prettier config
8d0d5f8  2026-02-13  chore: add complete quality tooling infrastructure to FliHub
394c33f  2026-02-13  fix: resolve ESLint, Prettier, and TypeScript build errors for CI readiness
14ff7c5  2026-02-13  fix: resolve ESLint warnings and verify all tooling works
8797509  2026-02-13  docs: add TDD demonstration and verification documentation
7b9b8f4  2026-02-13  chore: format documentation files for CI
f3e7653  2026-02-13  feat: integrate Pino structured logging
d04f600  2026-02-13  docs: complete verification - all 6 features verified working
194ff2d  2026-02-13  chore: remove temporary test files
61282d2  2026-02-13  chore: add type module to root package.json and remove verification docs
0de5b6e  2026-02-13  chore: fix naming conventions - move session docs to docs/ with kebab-case
99b281f  2026-02-16  feat(FR-141): consolidate Export + S3 into unified Manage tool
9f428c0  2026-02-16  chore(FR-141): cleanup obsolete files and update FR-140/141 status
999283f  2026-02-16  fix: WSL open-folder feedback and S3 download reliability            [jan]
ffeefb3  2026-02-16  feat: add View/Open buttons to S3 sections and clipboard fallback
bc78182  2026-02-19  feat(FR-142): split Export/S3 into Gling/Edit and S3 Staging tools
c0454fd  2026-02-25  fix: parse DAM text output in s3-status to correctly show upload state
d29f4a1  2026-02-25  fix: correct S3 View URL to use real bucket name, region, and prefix
429acc3  2026-02-26  update flihub
0bd4b73  2026-02-28  updates before migration
54a4e2e  2026-03-05  fix: switch transcription from openai-whisper to mlx-whisper
1806857  2026-03-05  clear db
43051b2  2026-03-10  fix(dev): add port conflict defences — strictPort + --kill-others
5cb06bf  2026-03-10  feat(awb): add Resume in AWB, chapter POEM payload, recordings stats cleanup
b84cf1c  2026-03-12  fix(awb): send raw .awb.json verbatim on resume, remove spurious browser open
f85194e  2026-03-14  chore: capture Jan collaboration brainstorm + misc dev infra updates
e7dc4dd  2026-03-14  feat(dev): fix start.sh — add cd and browser auto-open
f86fed4  2026-03-14  fix(dev): pin PORT in Procfile to prevent tmux env inheritance
a5a0504  2026-03-16  feat: FR-144 Send to AWB, FR-145 Escape modal, UX improvements batch
9a40655  2026-03-16  docs: add NFR-146 Test Coverage Foundation PRD
2ac653c  2026-03-16  chore: Project Heal — BACKLOG.md + AGENTS.md baseline
0b483b0  2026-03-16  plan: NFR-146 test coverage campaign — IMPLEMENTATION_PLAN + AGENTS.md
fe228dd  2026-03-18  feat(flihub): test coverage refactor — new hooks, config manager, test suite expansion
1588f7b  2026-03-19  chore: Ralphy baseline — AGENTS.md updated, BACKLOG.md reconciled, next-round-brief added
```

## Appendix — verification commands used for present-state claims

```bash
gh run list --limit 200 --repo flivideo/flihub --json conclusion,createdAt,headSha,displayTitle
./node_modules/.bin/prettier --check "client/src/components/*.tsx"
git grep -c "console\.\(log\|error\|warn\)" HEAD -- 'server/src/*.ts'
git grep -l "config/logger" HEAD -- server/src
cd server && ../node_modules/.bin/vitest run --coverage   # → coverage/{clover.xml,index.html}, no lcov.info
cd shared && ../node_modules/.bin/vitest run --coverage   # → reports naming.js / paths.js, not .ts
git grep -o "success: true" HEAD -- server/src/routes | wc -l   # 134
git grep -o "ok: true"      HEAD -- server/src/routes | wc -l   # 5
git grep -hoE "router\.(get|post|put|patch|delete)\(" HEAD -- server/src/routes | wc -l   # 156
grep -c "^    method:" shared/apiRegistry.ts   # 34
git ls-tree -r --name-only HEAD | grep -ci "agents.md"   # 28
```

*Generated files (`server/coverage/`, `shared/coverage/`) were removed after measurement; no source file was modified during this audit.*
