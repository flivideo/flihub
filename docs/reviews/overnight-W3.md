# W3 review — FliHub open contract (aa99f71)

Verdict: FINDINGS (1 blocking, 9 minor)

Reviewer: session `flihub-w3-review`, `claude-opus-5`, 2026-09-15. Method: `agent-skills:code-review-and-quality`
(five axes). Scope: the builder's commits `a896f5d..aa99f71` (after the review brief `c69b559`), every changed
file's diff read, plus behaviour probes run in scratch temp dirs (never the live estate). Nothing in the repo was
edited except this file; nothing committed; the app was not started (5100/5101 had no listener at review time).

**Summary for Swagger.** The work is good: both doors land on one `applyContext`, 15 new tests are real, the
suite is green, typecheck is green, the pin is correct, isolation holds and no existing route changed behaviour
beyond the brief. The one blocker is small:

- `--project a01` / `POST /api/context {project:'a01'}` silently picks the `fli.studio.json` member when a
  **plain folder with the same code** exists. FliHub counts plain folders as projects, so R31 says refuse. Not
  reachable on the M4 today (0 members); it becomes reachable the first time FliStudio (W7) adopts one of two
  same-code folders.

The minors are hygiene and two script paths that drop a context without saying so. Lint is red, but it was red
with the identical 20 errors before W3 (F10), which needs a gate ruling.

---

## Findings

### F1 · A code reference resolves to the member and ignores a plain folder with the same code (R31) — BLOCKING

`server/src/utils/openContext.ts:120-121` (`case 'found'` taken as final) + `@flivideo/core` `resolveProject`, which
matches a code against **members only** (W1 P6, correct for the library).

- **What is wrong**: FliHub accepts plain folders as projects (`membership: 'folder'`, brief §2A). Resolution
  still uses the library's members-only code match, so a code shared by one member and one plain folder is not
  treated as ambiguous. Probe against the pinned `dist/` (temp brand root with `a01-xmen` member, `a01-old`,
  `b02-one`, `b02-two`, `c03-solo` plain):
  ```
  a01        found a01-xmen          ← FliHub opens a01-xmen; a01-old is never mentioned
  b02        not-found               ← two FliHub projects share b02; answered 404, not 409
  c03        not-found               ← one FliHub project has c03; answered 404
  ```
- **Why it matters**: R31: "Resolution MUST be unambiguous or refuse". Open-contract §2: "an ambiguous match is
  **refused**". A launch with `--project a01` would open the wrong project with no refusal, which is on the
  review brief's BLOCKING list ("a refusal that does not bite"). Contract test 4 only covers two *members* sharing a
  code (`openContract.test.ts:161-163`), so it does not catch this.
- **Reachability**: 0 `fli.studio.json` files and no duplicate codes on the M4 `[measured, shape-only]`. Roamy's
  larger estate was not measured. W7 adoption creates the mixed case.
- **Fix** (about 15 lines, in `resolve()`, after `listProjects`):
  1. If `args.project` is an exact folder name or a member `id`, keep today's path (`found` / `not-a-project`).
  2. Otherwise treat it as a code. Build
     `matches = members.items.filter(m => m.identity.code === ref)` ∪
     `otherFolders.items.filter(f => f.parsed?.code === ref)` (both only when `state === 'scanned'`; `unscanned`
     keeps the 503).
  3. Zero matches → 404 `project-not-found`. One → resolved (member or folder). Two or more → 409
     `project-ambiguous` with all folder names as `candidates`.
  4. Tests in `openContract.test.ts › edges`:
     - `a01` with member `a01-xmen` + plain `a01-old` → 409 with both candidates, `activeProject` unchanged, via
       door 3 **and** door 2 (`refused`)
     - two plain `b02-*` → 409
     - one plain `c03-solo` by code → 200 `membership: 'folder'`

  The case in the last bullet is my recommendation. The brief did not rule on it, and today's 404 is safe, so
  Swagger may keep 404 instead.

### F2 · Door 1 (brand switcher) and doors 2/3 use different brand-root rules; C1 holds only where they coincide — MINOR

`server/src/utils/brands.ts:77` (`root = entry.locations.video_projects`, raw) and `:87`, `:108` (`active: root ===
currentRoot`) against `server/src/utils/openContext.ts:108`, `:156` (`resolveBrandRoot`: A5 rewrite + `~/.fli`
override).

- **What is wrong**: when A5 rewrites the path (a registry holding `/Users/davidcruwys/…` on Jan's or Mary's Mac)
  or a `machine.json` override exists, the two doors disagree. Probe (temp `HOME`, registry root
  `/Users/otheruser/dev/video-projects/v-x`, folder at `$HOME/dev/video-projects/v-x/a01-demo`):
  ```
  door3: applied | root <tmp>/home/dev/video-projects/v-x
  GET /api/brands after door3: active = x | switcher root /Users/otheruser/dev/video-projects/v-x
  GET /api/context after brand switch + pick: {"context":null,"missing":["brand","project"]}
  ```
  `active = x` in the probe is the on-disk merge (`utils/brands.ts:91-113`), so the switcher lists **two** `X` entries.
- **Why it matters**: C1 says there is no second way of knowing the project. On the M4 and Roamy the two rules give
  the same path (all 8 registry roots are this user's home, no `machine.json` `[measured]`), so nothing breaks
  here. The divergence is door 1's existing behaviour, not a W3 regression, and on such a machine doors 2/3 are
  the correct ones. Upgrade to BLOCKING if editor machines are in W3's scope.
- **Fix**: in `listBrands`, compute each registry entry's `root` with `resolveBrandRoot(brand, machine, { home })`
  (share `machineRoots()`), add that resolved root to `seenRoots`, and compare `active` with `path.resolve`.
  `POST /api/brands/switch` then writes the same root as door 3. Test: the probe above, asserting the switch root
  equals the door-3 root and `GET /api/context` names the brand afterwards.

### F3 · A refused launch opens on the last project, and `GET /api/context` reports that project as `context` — MINOR (ruling)

`server/src/utils/openContext.ts:197-201` (config untouched on refusal) and `:182` (`refused` added beside the live
`context`); pinned by `openContract.test.ts:173` (`state.context?.project === 'b02-plain'`).

- **What is wrong**: the builder brief says two things. §2A says a refused launch "still starts **on the picker**".
  §2E test 4 says "assert `activeProject` unchanged". The builder followed test 4. The result is not silent: one
  log line, `refused` in the body, and an amber strip (`client/src/App.tsx:760`). So C3 is met in letter. But a
  launcher that reads only `context` sees a resolved project that it did not ask for.
- **Why it matters**: FliStudio (W7) is the programmatic door-2 caller.
- **Fix, recommended (a)**: keep the behaviour, since clearing `activeProject` would wipe David's persisted pick
  on a typo. Add one README line: "check `refused` before `context`; a refused launch leaves the previous project
  open". Note it in the open contract for W7.
- **Alternative (b)**: on a refused **launch** only, set `activeProject: ''`.

### F4 · Two script paths drop a given context without saying so — MINOR

`scripts/app.sh:101-108`, `:126-127`; `start.sh:23-25`; `server/src/utils/openContext.ts:240-243`.

- **What is wrong**:
  1. **Inherited env, no flags.** `FLIVIDEO_BRAND=x FLIVIDEO_PROJECT=y scripts/app.sh start` on a running app
     prints "Already running and healthy — nothing to do": no `FLIVIDEO_LAUNCH_ID` is set, so `switch_context`
     is skipped. On a cold start the server applies the env, but with no launch id it re-applies it on **every**
     nodemon or overmind restart, undoing David's later picks. Env is a first-class door-2 channel (open-contract §3)
     and the natural way FliStudio will launch.
  2. **Daemon up, server not yet healthy.** With flags, if overmind is already up, `cmd_start` waits, reports
     healthy and returns 0. The context was never applied, because overmind's processes kept their old env and no
     `switch_context` runs.
- **Fix**:
  - In both scripts, after parsing, set and export `FLIVIDEO_LAUNCH_ID` whenever `FLIVIDEO_BRAND` or
    `FLIVIDEO_PROJECT` is non-empty (flag or inherited).
  - In `app.sh cmd_start`'s `daemon_up` branch, once healthy, call `switch_context` when a launch id is set.
  - `bash -n` both scripts. A runtime check is Swagger's.

### F5 · Resolution hand-rolls the chain instead of `resolveOpenContext`; refusal codes diverge from the library — MINOR

`server/src/utils/openContext.ts:88-142`; `shared/types.ts:708-719`.

- **What is wrong**: the review brief (§2.2) names `resolveOpenContext`, which W1 F5 added so W3–W6 would not
  each invent a refusal vocabulary. FliHub returns `project-not-found`, `project-ambiguous`,
  `brand-root-unreadable` and `brands-unreadable`. The library returns `project-refused{result}`, `unknown-brand`,
  `no-brand-root`, `video-invalid` and `video-not-found`.
- **Why it matters**: the deviation has a reason. `resolveOpenContext` refuses `not-a-project`, which FliHub must
  accept, and it checks that the video folder exists, while the builder brief says "carried, not validated beyond
  `parseVideoFolder`". The builder brief (written before F5) also prescribes the explicit chain. But FliStudio will
  switch on refusal codes from four apps.
- **Fix**: keep the chain, since F1 needs the listing anyway. Add a code → library-kind table to the README
  section so W7 can map it. Or have Swagger rule a shared refusal vocabulary for W4–W6 briefs now.

### F6 · The new API shapes are hand-written interfaces, not zod — MINOR

`shared/types.ts:694-725` (`OpenContextArg`, `HubContext`, `ContextRefusal`, `OpenContextState`);
`server/src/routes/context.ts:12-31` (body parsed by hand).

- **What is wrong**: review brief §2.8 asks for zod on the new API shapes. FliHub's house style is interfaces:
  zod is a server dependency but used only in `server/src/config/env.ts`. So this matches the surrounding code
  and misses the brief.
- **Fix**: add `server/src/routes/contextSchemas.ts` with:
  - `ContextBody = z.object({ brand, project, video }).partial()`, with the strings `min(1)` and `video` reusing
    `VideoFolderName` from `@flivideo/core`
  - `HubContext`, `ContextRefusal`, `OpenContextState` as zod objects

  Export `z.infer` types, have `shared/types.ts` re-export them as `import type`, and add one test:
  `OpenContextState.parse` on each captured `GET` body in `openContract.test.ts`.

### F7 · Transcripts (§1.2d) skipped with no written deferral in the repo — MINOR

Brief §2D requires "say so under *Deferred* with the file:line". `docs/changelog.md` and the README section are
silent (the builder's own report may carry it; I cannot see that).

- **Measured, supporting the skip**:
  - one path source, `shared/paths.ts:48`, but `.transcripts` is referenced on 36 non-test lines in
    `server/src` (not every one a read site)
  - hard-coded `recording-transcripts` literals at:
    - `server/src/routes/projects.ts:254`
    - `server/src/routes/transcriptions.ts:56`
    - `server/src/utils/projectStats.ts:113`
    - `server/src/utils/poemWuiUtils.ts:83`
    - `server/src/utils/scanning.ts:105`
    - `server/src/scripts/scanProjects.ts:477`
    - the NFR-85 watcher (`server/src/WatcherManager.ts:192`)

  "Every read site accepts both" is therefore not cheap.
- **Fix**: add a *Deferred* line to the W3 changelog entry naming `shared/paths.ts:48` and the six literal sites
  above.

### F8 · Chapter-preview leftovers — MINOR

- `client/src/components/shared/ConfirmationModal.tsx:104` still renders the chapter-settings block, and
  `ChapterSettings` is still exported from `shared/index.ts`. Nothing passes it now.
- `client/src/components/RecordingsView.tsx:1631` has an orphan `{/* FR-58: Chapter Recording Modal */}`.
- `PUT /api/chapters/config` (`server/src/routes/chapters.ts:50-69`) and `ChapterRecordingConfig.autoGenerate`
  (`shared/types.ts:912`) now drive nothing. `GET /api/chapters/status` returns a constant `isGenerating: false`.

- **Fix**:
  - Remove the modal branch and its type, and the orphan comment.
  - Answer `PUT /api/chapters/config` with 410 like `generate`, or label it legacy in the route header.
  - Keep `GET /status`: it is the read path.

### F9 · Door-3 refusals from another caller pop into David's UI — MINOR (live-instrument rule)

`server/src/utils/openContext.ts:199` records `lastRefusal` for `source: 'api'` too; `client/src/App.tsx:760`
shows any `refused`.

- **What is wrong**: a FliStudio `POST /api/context` that fails has already received its 4xx and reason. The same
  refusal then shows as "Could not open the requested project" in the FliHub window David is recording with (on
  the next refetch or focus). It persists until the root or project changes.
- **Fix**: record `lastRefusal` only for `source === 'launch'` (the caller of door 3 already knows), or add
  `refused.source` and show the strip for launch refusals only. Adjust `openContract.test.ts:213-220`, which
  asserts the api-sourced banner state.

### F10 · Gate hygiene, pre-existing: `npm run lint` is red, and server coverage thresholds are not enforced — MINOR (ruling)

- **Lint**: 20 errors and 32 warnings at HEAD. The count is **identical** at `c69b559`, measured on a `git archive`
  copy linted with the repo's `node_modules`. None of the 20 errors is in a W3-touched file:
  - `StoragePanel.tsx` `rules-of-hooks` ×7
  - `react-hooks/refs` in 4 client files
  - `no-unsafe-function-type` in 3 server tests
  - `miccheck-worklet.js`

  The brief's "lint must stay green" is therefore not literally achievable by W3.
- **Coverage**: `server/vitest.config.ts:9` puts `coverage` at the top level, not under `test`, so `lines: 16 …`
  never fires. The builder already recorded this in `docs/kdd/learnings.md`. The file is unchanged, so nothing
  was lowered.
- **Ruling needed**: accept "no new lint errors; thresholds unchanged" as the W3 bar, and ticket the lint debt
  plus the config nesting separately.

---

## Conformance table

| Check (review brief §2) | Verdict | Evidence |
|---|---|---|
| **1 · C1 one path** | conforms for doors 2 + 3 | door 2: `server/src/index.ts:378` `applyLaunch(process.argv.slice(2), process.env)` → `openContext.ts:245` `applyContext(context, 'launch')`; door 3: `routes/context.ts:33` `applyContext(args, 'api')`, mounted `index.ts:353`. Door 1 root rule differs off-M4 (F2) |
| **2 · Door 2** `parseOpenArgs` from `@flivideo/core` | conforms | `openContext.ts:233`; `server/package.json:17` `github:flivideo/fli-core#v0.1.0`, lock resolves to `a4db474` (= tag `v0.1.0` in fli-core); no `file:`; only `from '@flivideo/core'` (2 files, no deep import) |
| … `resolveOpenContext` | deviates, reasoned | F5 |
| … argv over env | conforms | test `5 · env door` (argv `--project` beats `FLIVIDEO_PROJECT`) |
| … scripts pass `FLIVIDEO_*` | conforms, two silent paths | `start.sh:10-24`, `scripts/app.sh:70-86`; `bash -n` OK on both. F4 |
| … missing → picker, never an error | conforms | test `3 · missing → picker`; startup wrapped in try/catch `index.ts:377-381`; `--project` without `--brand` changes nothing (edge test) |
| … unresolvable → `refused`, no silent fallback | conforms for unknown brand, no folder and two members; **fails for mixed member + folder codes** | test `4 · refusal bites` asserts `activeProject` unchanged. F1; F3 on what "picker" means |
| **3 · Door 3** 200/400/404/409 shapes | conforms (+503 for unreadable registry or root) | tests 2, 3, 4, `reports an unreadable registry…` |
| … socket events (C4) | conforms | emits `projects:changed`, `recordings:changed` (what `brands/switch` emits, `routes/brands.ts:57-58`) + `context:changed`; test 2 asserts the order; client `useContextSocket` invalidates all queries |
| … `POST /api/brands/switch`, `POST /api/config` unchanged | conforms | `git diff --quiet c69b559..HEAD -- server/src/routes/index.ts server/src/routes/brands.ts` → unchanged |
| C2 (context per launch, not sticky) | deviates **by brief** | the brief rules "same effect as `POST /api/brands/switch`", which persists to `config.json`; flag for the open contract §4 FliHub row |
| **4 · Chapter previews** creation → 410 | conforms | `POST /api/chapters/generate`, `/api/manage/regen-chapters`, `/api/manage/regen-all` → 410 (test `chapterPreviewsGone.test.ts`, asserts nothing written, no emit) |
| … UI affordance gone | conforms | 🎬 button + modal, Config defaults, Manage *Regen All* removed; *Regen Transcripts* kept (`ManagePanel.tsx`). Leftovers F8 |
| … reading `-chapters/` works, nothing deleted | conforms | `GET /api/chapters/status` test; `WatchPage.tsx:436-443` still plays `-chapters`. The removed regen code was the only thing that deleted `-chapters` files |
| **5 · Transcripts** | skipped, correctly, but no written deferral | F7 |
| **6 · Contract tests** five present, real | conforms | `server/src/test/openContract.test.ts` `1 · launch args → context` … `5 · env door` + 6 edges. Test 2 deep-equals test 1's body |
| … temp-dir fixtures; no real estate or config | conforms | `mkdtemp` + `vi.stubEnv('HOME')` + `home` injected into every library call and `brandStoragePaths`; grep of W3 tests shows `video-projects` / `.config/appydave` only under `tmp`/`home`. Pre-existing tests (`sync`, `relay`, `configManager`) use `~/dev/video-projects` **strings**; not W3, not audited here |
| … `server/vitest.config.ts` not lowered | conforms (unchanged, but inert: F10) | `git diff c69b559..HEAD -- server/vitest.config.ts` empty |
| **7 · Regression sweep** | green except pre-existing lint | below; F10 |
| **8 · Architecture** zod for new shapes | deviates | F6 |
| … no deep imports | conforms | see row 2 |

## Checks run (commands + tails)

```
$ pwd
/Users/davidcruwys/dev/ad/flivideo/flihub

$ git log --oneline c69b559..HEAD
aa99f71 docs(kdd): stale server/dist doubles vitest runs; coverage thresholds not wired
04381e2 docs(W3): changelog entry for the open contract and chapter-preview deprecation
8ffc014 feat(W3): client refreshes on context:changed and shows a refused context
e07885d feat(W3): chapter previews deprecated (roadmap §1.2e) — creation routes 410 Gone
e4324c7 feat(W3): start.sh and scripts/app.sh take --brand/--project/--video
2a5a51e feat(W3): open contract doors 2 + 3 — launch args/env and POST /api/context share one applyContext
a896f5d chore(deps): pin @flivideo/core v0.1.0 in server; add npm run typecheck

$ lsof -nP -iTCP:5100 -sTCP:LISTEN; lsof -nP -iTCP:5101 -sTCP:LISTEN   → (no listener)

$ CI=1 npm test            (exit 0; server/dist absent, so no double run)
shared:  Test Files  2 passed (2)    Tests  80 passed (80)
client:  Test Files  22 passed (22)  Tests  326 passed (326)
server:  Test Files  29 passed (29)  Tests  696 passed | 1 skipped (697)

$ cd server && CI=1 npx vitest run --coverage
All files          |   63.98 |    58.84 |   68.34 |   64.34 |
  chapters.ts      |    62.5 |     8.33 |   44.44 |   63.33 | ...2-43,51-69,100
  context.ts       |     100 |    86.66 |     100 |     100 | 24-29
  manage.ts        |   45.42 |    31.05 |   44.44 |   46.54 | ...48-710,988-989
  openContext.ts   |   98.03 |     92.3 |   86.66 |     100 | 73-85,147,193,219
(no threshold output: thresholds are not wired, F10)

$ npm run typecheck        → server tsc --noEmit; client tsc -b (exit 0, no errors)

$ npm run lint             → exit 1: ✖ 52 problems (20 errors, 32 warnings)
$ (git archive c69b559 → scratch copy, node_modules symlinked) npx eslint .
                           → ✖ 52 problems (20 errors, 32 warnings)          (identical: F10)
# errors by file at HEAD, W3-touched files flagged: none flagged

$ bash -n start.sh && bash -n scripts/app.sh   → OK, OK

# probe: resolveProject on the pinned dist, temp brand root (F1)
a01        found a01-xmen
a01-old    not-a-project a01-old
b02        not-found
c03        not-found
c03-solo   not-a-project c03-solo
archived / a50-gone / -trash / .hidden / .. / A01-XMEN   not-found   (no traversal via the listing)

# probe: controller + listBrands under a temp HOME, registry root /Users/otheruser/… (F2)
door3: applied | root <tmp>/home/dev/video-projects/v-x
GET /api/brands after door3: active = x | switcher root /Users/otheruser/dev/video-projects/v-x
GET /api/context after brand switch + pick: {"context":null,"missing":["brand","project"]}

# live estate, shape-only, read-only (reachability of F1 / F2 on this machine)
fli.studio.json at depth 3 under ~/dev/video-projects: 0
duplicate codes per brand root: none (positive control: v-appydave lists d02, d03)
~/.fli/machine.json: absent; all 8 registry video_projects roots under /Users/davidcruwys
```

**What these checks did not establish.**

- **Scripts were not run.** It is unproven that overmind passes the exported `FLIVIDEO_*` into the Procfile's tmux
  panes, and neither the `curl` switch in `app.sh` nor the launch-id stamp surviving a real `overmind restart
  server` was exercised. Runtime check is Swagger's after the gate.
- **The real startup path was not executed.** `index.ts`'s top-level `await applyLaunch` runs before
  `watcherManager.initAll` and `listen`. Tests drive the controller and router on a mini Express app, and test 3's
  health 200 is that mini app, not the real server. Order and watcher restarts were checked by reading only
  (`WatcherManager.startWatcher` stops before starting, so the double start is harmless).
- **Nothing was seen in a browser.** The amber strip and the `context:changed` refresh were checked only by code
  and by `ContextRefusedBanner.test.tsx`.
- **F1's reachability is unknown on Roamy** (the large estate) and on Jan's and Mary's Macs; F2 was not reproduced
  on a real A5-rewritten machine.
- **The lint base comparison** used a `git archive` copy with symlinked `node_modules`. Identical counts do not
  prove an identical set of messages; the per-file error list at HEAD was checked against W3-touched files.

APPYNET: done — FINDINGS, 1 blocking, 9 minor

---

## Second pass (fix round 2)

Verdict: FINDINGS (0 blocking, 2 minor). F1–F4 and F6–F10 are fixed. **F5 is not fixed against Swagger's decision 4**
(the shared refusal vocabulary): the builder shipped the mapping-table option from the first pass, not the
vocabulary. Decision 4 was committed at 23:20 (`flistudio 179cb5c`) and the F5 fix at 23:25 (`535ee15`).

Scope: `8531392..87ce441` (the ten `fix(W3): F<n>` commits), HEAD `87ce441`. `git pull --rebase` reported "Already up
to date". Reviewer session `flihub-w3-review`, 2026-09-15. No repo file other than this one was edited; nothing
committed; the app was not started. Probes ran in-process against HEAD source (`tsx`), under a temp `HOME` in the
session scratchpad. `7c39d38` and `b381e5a` (ephemeral-port test harness, before `0d3a8d8`) are outside this scope,
but the suite below runs on them.

### Each finding

| # | Status | Proven by (test name) |
|---|---|---|
| F1 | **fixed-as-specified**. A code (`/^[a-z]\d{2}$/`) matches members ∪ plain folders. An exact folder or id keeps the library's answer, and a prefix never matches (`server/src/utils/openContext.ts:157-181`). The recommended case (one plain folder by code → 200 `folder`) was taken | `open contract — edges › F1 · a code shared by a member and a plain folder is ambiguous through both doors (R31)`; `F1 · codes match plain folders: two share one → 409, a single one resolves as a folder` (also `c0` prefix → 404) |
| F2 | **fixed-as-specified**. `listBrands` resolves registry roots through `resolveBrandRoot` with `~/.fli` machine settings and compares with `path.resolve`. A `home` option is threaded through `createBrandsRouter` (`server/src/utils/brands.ts:76-104`, `server/src/routes/brands.ts:20,27,46`) | `F2 · the brand switcher resolves a root exactly as doors 2/3 do (A5 rewrite)` (one entry, `activeKey` x, `GET /api/context` names the brand after switch + pick) |
| F3 | **fixed-as-specified**, option (a) by ruling: a README line tells callers to check `refused` before `context` (`README.md`, `09e1fe4`) | docs only; behaviour pinned by `4 · refusal bites` (`activeProject` unchanged) |
| F4 | **fixed-as-specified**. Both scripts stamp `FLIVIDEO_LAUNCH_ID` whenever `FLIVIDEO_BRAND` or `FLIVIDEO_PROJECT` is set (flag or inherited): `start.sh:26-28`, `scripts/app.sh:83-86`. `cmd_start` calls `switch_context` after waiting on an already-up daemon (`scripts/app.sh:147-150`) | no automated test (bash). `bash -n` OK on both. Swagger's report records a runtime env-only launch via `scripts/app.sh` setting context; not reproduced by me |
| F5 | **not-fixed** (against decision 4). The first-pass fix option was delivered: `LIBRARY_REFUSAL` table plus README table. The shared vocabulary was not. See R1 | `F5 · every FliHub refusal code maps to a real @flivideo/core result kind` pins the **old** codes (`brands-unreadable`, `brand-root-unreadable`) |
| F6 | **fixed-differently-but-acceptable**. Zod schemas live in `server/src/routes/contextSchemas.ts`, and `shared/types.ts:697-703` re-exports their `z.infer` types (type-only) instead of each side declaring its own. `POST` bodies go through `ContextBodySchema`, and `video` reuses `VideoFolderName` from `@flivideo/core`. The one catch is the direction of the shared → server import (R2) | `F6 · POST bodies are validated by the zod ContextBody; 200 bodies satisfy HubContext`; every contract test's `getContext` now runs `OpenContextStateSchema.parse` on the captured body |
| F7 | **fixed-as-specified**. The *Deferred* paragraph in `docs/changelog.md` names `shared/paths.ts:48`, the six literal sites, and more: the write path `transcriptions.ts:121/:204` and `renameRecording.ts` | docs only |
| F8 | **fixed-as-specified**. The chapter-settings block and `ChapterSettings` type are removed from `ConfirmationModal`, and the orphan comment is gone. `PUT /api/chapters/config` → 410, and `createChapterRoutes` no longer takes `saveConfig` (`server/src/index.ts:277`). No client caller of `PUT` remains (`git grep chapters/config`) | `chapter previews deprecated (§1.2e) › PUT /api/chapters/config → 410 Gone, the legacy settings are untouched (F8)` |
| F9 | **fixed-as-specified**: `lastRefusal` is recorded only for `source === 'launch'` (`server/src/utils/openContext.ts:239-241`) | `F9 · only a refused launch is shown; a door-3 caller keeps its refusal, and it clears once the context moves on` |
| F10 | **fixed-as-specified**, by ruling: `NFR-172` in `docs/backlog.md` with the exact debt; the W3 bar is "no new lint problems, thresholds unchanged" | lint 52 problems (20 errors), identical to `c69b559` (below) |

### R31 probe via door 3 against HEAD

Temp brand root `v-x`: member `a01-xmen`, plain `a01-old`, `b02-one`, `b02-two`, `c03-solo`; `activeProject` before
each call = `b02-one`.

```
a01                                    409 project-ambiguous ["a01-old","a01-xmen"] activeProject=b02-one
b02                                    409 project-ambiguous ["b02-one","b02-two"] activeProject=b02-one
c03                                    200 c03-solo/folder  activeProject=c03-solo
a01-old                                200 a01-old/folder  activeProject=a01-old
a01-xmen                               200 a01-xmen/member  activeProject=a01-xmen
3f1c2a4e-8b7d-4c6e-9a1f-2b3c4d5e6f70   200 a01-xmen/member  activeProject=a01-xmen
c0                                     404 project-not-found  activeProject=b02-one
z99                                    404 project-not-found  activeProject=b02-one

# door 2, same fixture: applyLaunch --brand x --project a01 → GET /api/context
{"context":{…"project":"b02-one"…,"membership":"folder"},"missing":[],
 "refused":{"code":"project-ambiguous","reason":"Project \"a01\" matches 2 projects in x; name the folder.","candidates":["a01-old","a01-xmen"]}}
```

The refusal bites through both doors, and the config is untouched.

### F2 probe against HEAD

Registry root `/Users/otheruser/dev/video-projects/v-z`; folder at `<home>/dev/video-projects/v-z/a01-demo`.

```
door3: 200 | root <home>/dev/video-projects/v-z
GET /api/brands after door3: active = z | entries ["x:disk:<home>/dev/video-projects/v-x","z:brands.json:<home>/dev/video-projects/v-z"]
switch: 200 | root <home>/dev/video-projects/v-z | same as door3: true
GET /api/context after switch + pick: {"context":{"brand":"z","root":"<home>/dev/video-projects/v-z","project":"a01-demo",…,"membership":"folder"},"missing":[]}
```

The `x:disk` row comes from the probe's own leftover `v-x` folder under the same parent. It is the existing on-disk
merge, and `z` is not duplicated. First pass: two `Z` rows, and `{"context":null,"missing":["brand","project"]}`.

### Zod schemas vs captured bodies

Every captured `GET /api/context` body was run through `OpenContextStateSchema.safeParse`: missing, resolved with
video, and refused launch all `ok`. `POST` 200 `context` → `HubContextSchema.safeParse` `true`. Inside the suite,
every `getContext` call in `openContract.test.ts` parses (16 contract tests green). The schemas are `strictObject`,
so an extra field would fail the tests.

### Refusal codes vs the shared vocabulary (decision 4)

Every code the door-3 surface can answer, captured at HEAD:

| Case | HTTP | Body `code` | Decision 4 | Match |
|---|---|---|---|---|
| a field missing | 400 | *(none)*: `{"error":"Missing: project","missing":["project"]}` | `missing` | ⚠️ no `code` field |
| unknown brand | 404 | `unknown-brand` | `unknown-brand` | ✅ |
| brand without a root | 404 | `no-brand-root` | `no-brand-root` | ✅ |
| `brands.json` absent or invalid | 503 | `brands-unreadable` | `registry-unreadable` | ❌ |
| brand root unreadable (unmounted) | 503 | `brand-root-unreadable` | *(no slot)* | ❌ |
| no such folder / code / prefix | 404 | `project-not-found` | `project-not-found` | ✅ |
| shared code | 409 | `project-ambiguous` + `candidates` | `project-ambiguous` | ✅ |
| a plain folder | 200 `membership: folder` | *(never refused)* | `not-a-project` | ✅ by W3 brief (FliHub accepts plain folders) |
| malformed video | 400 | `video-invalid` | `video-invalid` | ✅ |
| well-formed video that does not exist (`09-nope`) | **200**, video carried | *(never refused)* | `video-not-found` | ⚠️ W3 brief §2B says "carried, not validated beyond `parseVideoFolder`"; decision 4 lists the code. Needs a ruling |
| non-string field (`brand: 5`) | 400 | *(none)*: `{"error":"Invalid body","issues":[…]}` | *(no slot)* | ⚠️ outside the vocabulary |

**Not confirmed**: the codes do not use the shared vocabulary.

### New findings

#### R1 · Door-3 and launch refusals do not use decision 4's shared vocabulary — MINOR (holds the gate: an unimplemented ruling)

`server/src/routes/contextSchemas.ts:28-38` (`code` enum), `server/src/utils/openContext.ts:74-84`
(`LIBRARY_REFUSAL`) and the `refuse(...)` call sites, `server/src/routes/context.ts:26-43`, the README refusal table,
and `openContract.test.ts › F5 …` (pins the old keys).

- **What is wrong**: see the table above. Two codes are renamed or unslotted, `missing` carries no `code`, and
  `video-not-found` is never produced.
- **Why it matters**: decision 4 is "Sent to W3 and W4, written into the W5/W6 briefs". FliStudio (W7) will switch
  on one vocabulary across four apps, and FliHub is the first app to drift from it. By the review brief's BLOCKING
  list this is not blocking (no C1–C4 breach, and every refusal bites). But roadmap §3.1 "review clean" is not met
  while a ruling given to this workstream is unimplemented.
- **Fix**:
  1. `brands-unreadable` → `registry-unreadable` (503 kept).
  2. `brand-root-unreadable` → `no-brand-root`, with the unreadable path in `reason` (503 kept, so a caller can
     still tell "no root configured" from "root not mounted" by status). Or Swagger adds a slot to the vocabulary.
  3. 400 missing body: add `code: 'missing'` beside `missing: [...]`. 400 invalid body: `code: 'missing'` is
     wrong; either Swagger rules an `invalid-body` code, or it stays code-less as a malformed request outside the
     refusal vocabulary. Recommend the latter, written down.
  4. `video-not-found`: **Swagger rules**. (a) Keep carrying an unchecked video (W3 brief §2B) and document that
     FliHub never emits it. (b) Stat `<projectDir>/videos/<video>/` and answer 404 `video-not-found`.
     Recommend (a), because FliHub has no `videos/` concept today and a 404 would refuse contexts FliStudio creates
     before the folder exists.
  5. Update the `ContextRefusalSchema` enum, `LIBRARY_REFUSAL` keys, the README table, and the `F5 …` test's
     expected key list. Add assertions that the 503 registry case says `registry-unreadable` and the 400 missing
     case says `missing`.

#### R2 · `shared/types.ts` now imports types from `server/src` — MINOR (deferrable)

`shared/types.ts:697-703` → `../server/src/routes/contextSchemas.js`.

- **What is wrong**: the dependency direction is inverted: `shared` depends on `server`. It compiles, because the
  import is type-only and both `zod` and `@flivideo/core` are hoisted to the root `node_modules`. But `client` now
  type-checks `server/src/routes/contextSchemas.ts`, whose `zod` and `@flivideo/core` imports are declared in
  neither `client/package.json` nor `shared/package.json`. A non-hoisted install (or the dependency check spec §10
  asks of W7) would break the client typecheck.
- **Fix**: move `contextSchemas.ts` to `shared/contextSchemas.ts` and add `zod` + `@flivideo/core` to `shared`'s
  dependencies (the client still imports types only, so nothing reaches its bundle). Or keep it and defer in
  writing next to NFR-172.

### Regressions in touched existing files

None found.

- **`server/src/utils/brands.ts`**: on the M4 every registry root already equals its resolved root (8/8 under
  `/Users/davidcruwys`, no `~/.fli/machine.json` `[measured, first pass]`), so `GET /api/brands` and `switch`
  write the same values as before. Two things change, and both are acceptable:
  - a trailing separator in a registry path is now normalised away
  - a relative `video_projects` would resolve against the server's cwd (door 3 refuses it). No real entry is
    relative.
- **`server/src/routes/brands.ts`**: the signature gains an optional 4th arg; the only caller is `index.ts:332`
  (3 args, default `home`).
- **`server/src/routes/chapters.ts` / `index.ts:277`**: `PUT /config` → 410. `GET /config` still returns
  `config.chapterRecordings` or defaults; no client caller of either.
- **`server/src/routes/context.ts`**:
  - **Empty-string fields**: still treated as missing.
  - **Non-string field**: now 400 `Invalid body`. It was previously dropped and answered 400 `missing`: still a 400
    and still no config change (test F6).
  - **Missing project plus malformed video**: now answers `video-invalid` before `missing`. Harmless.
- **`client/.../ConfirmationModal.tsx`**: `onConfirm()` takes no argument, and every remaining caller (Manage
  panel regen and delete) passes a zero-arg callback. Client typecheck passes.
- **Scripts**: an inherited `FLIVIDEO_*` in David's shell now re-points FliHub on every `./start.sh`. That is the
  intended F4 behaviour, and worth one line to David if he ever exports those names.
- **Lint**: 52 problems (20 errors, 32 warnings), identical to `c69b559`. The only message in a W3-touched file is
  `server/src/routes/manage.ts:749` `no-unused-vars` (warning), the pre-existing `skippedCount` at base line 1239.

### Checks run (second pass)

```
$ pwd && git pull --rebase
/Users/davidcruwys/dev/ad/flivideo/flihub
Already up to date.

$ git log --oneline aa99f71..HEAD
87ce441 fix(W3): F10 ticket the pre-existing lint debt and inert coverage config (NFR-172)
5994ddb fix(W3): F9 only a refused launch reaches GET /api/context and the UI strip
8cf8435 fix(W3): F8 remove chapter-preview leftovers; PUT /api/chapters/config answers 410
0a91409 fix(W3): F7 write the transcripts-folder deferral into the changelog with file:line
33ee30a fix(W3): F6 door-3 API shapes defined once as zod
535ee15 fix(W3): F5 map FliHub refusal codes to @flivideo/core OpenContextResult kinds
2959c3f fix(W3): F4 scripts no longer drop a context silently
09e1fe4 fix(W3): F3 document that a refused launch keeps the previous project — check refused before context
749be77 fix(W3): F2 the brand switcher resolves roots like doors 2/3 (resolveBrandRoot)
8531392 fix(W3): F1 a project code matches members AND plain folders; a shared code refuses (R31)
0d3a8d8 docs: W3 review findings (flihub-w3-review, Opus) — 1 blocking, 9 minor
b381e5a fix(W3): contract tests use an ephemeral port bound to 127.0.0.1
7c39d38 fix(W3): contract-test status assertions report what actually answered

$ CI=1 npm test            (exit 0; server/dist absent)
shared:  Test Files  2 passed (2)    Tests  80 passed (80)
client:  Test Files  22 passed (22)  Tests  326 passed (326)
server:  Test Files  29 passed (29)  Tests  702 passed | 1 skipped (703)

$ npm run typecheck        → exit 0, 0 "error TS"
$ npx eslint .             → ✖ 52 problems (20 errors, 32 warnings)   (identical to c69b559)
$ bash -n start.sh && bash -n scripts/app.sh → OK

# refusal surface at HEAD (door 3, temp HOME)
missing        400 {"error":"Missing: project","missing":["project"]}
unknown brand  404 {…"code":"unknown-brand"…}
bad video      400 {…"code":"video-invalid"…}
absent video   200 {"context":{…"project":"a01-xmen",…"video":"09-nope"}}
bad type       400 {"error":"Invalid body","issues":["brand: Invalid input: expected string, received number"]}
no root        404 {…"code":"no-brand-root"…}
unreadable     503 {…"code":"brand-root-unreadable"…}
registry bad   503 {…"code":"brands-unreadable"…}
```

**What these checks did not establish.**

- **F4 was not run by me.** Swagger's report records a runtime env-only launch and a door-3 switch; I read the
  scripts and ran `bash -n` only.
- **The probes are in-process.** They ran the HEAD controller and routers in a mini Express app under `tsx`, not
  the real `index.ts` startup.
- **R2 was not reproduced.** The breakage under a non-hoisted install was reasoned, not run.
- **The F1 fix was not exercised on Roamy's estate**, where members and shared codes might exist.

APPYNET: done — second pass FINDINGS, 0 blocking, 2 minor (F1–F4, F6–F10 fixed; F5 vocabulary not adopted → R1)

---

## Swagger's gate ruling (2026-09-15 23:48)

**W3 gate: PASSED** on `c21eb09`. Reproduced by Swagger on a clean tree (`server/dist` removed): shared 81, client 326,
server 702 tests green; 16 contract tests green; typecheck 0; eslint 52 problems, identical to the pre-W3 baseline
(ruled bar: no new lint problems, thresholds unchanged — debt ticketed NFR-172). R1 verified: zero occurrences of the
old codes outside tests; R2 verified: `shared/` imports nothing from `server/`. Runtime checks at `87ce441`:
`scripts/app.sh` env-only launch set the context; an API refusal from another caller did not appear in the UI state;
door-3 switch worked; David's `server/config.json` restored byte-for-byte; app stopped. F3 kept by ruling (option a).
