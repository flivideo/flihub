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
