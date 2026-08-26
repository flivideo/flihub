# Dead-Surface Claims — Adversarial Verification

**Dimension:** dead-surface
**Date:** 2026-08-26
**Repo:** `/Users/davidcruwys/dev/ad/flivideo/flihub` @ `3b3b2f1`
**Method:** actively tried to REFUTE each claim — hunting barrel re-exports, dynamic
`import()`, template-literal paths, the `flihub-storage-panel` worktree, tests,
`server/src/scripts/`, `Procfile`/`start.sh`, and `.md` runbooks. Two claims were
tested against the **running dev server** (`:5100`) and one against a **live `tsx`
probe**, not inferred from config.

**Score:** 6 survive intact · 1 partially refuted · 1 substantially refuted.

---

## Enabling fact that makes static analysis near-conclusive here

`grep -rn "React.lazy|import.meta.glob|await import(|lazy(" client/src server/src`
returns **16 hits, all of them either test files or two server-side
`await import('../../utils/projectState.js')` calls** (`server/src/routes/query/recordings.ts:68`,
`server/src/routes/query/export.ts:110`). **Zero** dynamic component loading exists in
`client/src`. `grep -rn "import \* as" client/src` returns **nothing**.

This matters: normally "no static reference" and "not used" look identical. Here the
only mechanisms that could hide a usage (lazy loading, glob, namespace import) are
provably absent from the client, so for **client components** a clean grep is close to
proof. For **server routes and scripts** it is not — they can be reached by HTTP or by
a human typing a command, and that is exactly where one claim below breaks.

---

## 1. Duplicate `POST /api/projects/:code/hold` — the live handler is the WRONG one

**Verdict: SURVIVES — critical / certain. Strengthened: this is not dead code, it is an active behavioural regression.**

Verified:
- `server/src/index.ts:322` `app.use('/api/projects', holdRoutes)` precedes
  `server/src/index.ts:326` `app.use('/api/projects', storageRoutes)`.
- `server/src/routes/hold.ts:93` and `server/src/routes/storage.ts:185` both declare
  `router.post('/:code/hold', …)`.
- I read every branch of `hold.ts:93-178`: it returns on **every** path and never calls
  `next()`. Express therefore never reaches `storage.ts:185`.
- Live consumer chain confirmed: `client/src/components/ManagePanel.tsx:647` renders
  `<StoragePanel>` → `StoragePanel.tsx:66` `const hold = useHoldProject()` →
  `useStorageApi.ts:77` `buildMutation('hold', …)` → `postMutation` POSTs to
  `/api/projects/${code}/hold` with **no body**.

**Tried to refute, failed:** grepped every mount of both factories — the only non-test
registrations are those two lines; no conditional mounting, no feature flag.

**Why it is worse than "unreachable code".** The two handlers are not equivalent:

| | `hold.ts:93` (reached) | `storage.ts:185` (shadowed) |
|---|---|---|
| what is copied | **whole project** via `holdProject()` | only **heavy subfolders**, two-pass |
| local delete | none | `fs.rm` after verify (`storage.ts:302-308`) |
| degraded-state guard | absent | `409` at `storage.ts:225-233` |
| illegal-state guard | absent | `400` at `storage.ts:236` |
| empty-hold guard (P9) | absent | `400` at `storage.ts:241` |
| activity log | absent | `logActivity(code,'hold',…)` `storage.ts:312` |
| returns `newState` | **no** — returns `{success,data}` | yes — `okResponse('held')` |

The client types the reply as `StorageMutationResponse` and reads `data.newState`
(`useStorageApi.ts:60-70`), a field the reached handler never emits. So the panel's
state pill cannot update from the response, and every WU1 safety guard is bypassed.

**Test blindness confirmed:** `server/src/test/holdRoutes.test.ts:64` and
`server/src/test/storageRoutes.test.ts:176` each mount their own router in isolation.
Neither suite ever builds the composed app, so both stay green while production
dispatches to the other file.

**Rebuild implication:** route composition needs one owner — a single registration
table that fails loudly on a duplicate `(method, path)`. And at least one test must
exercise the **assembled** app, not hand-mounted routers.

---

## 2. Vite loads committed `shared/*.js`; tsc checks `shared/*.ts` — MEASURED fork

**Verdict: SURVIVES — critical / certain on mechanism. Consequence today is LATENT, and one sub-claim is refuted.**

Mechanism verified three independent ways:

1. **Client, against the running dev server** (not inferred from config):
   `curl -s http://localhost:5100/src/components/NamingControls.tsx` →
   `import { DEFAULT_TAGS } from "/@fs/…/shared/types.js"`.
   `curl -s http://localhost:5100/src/utils/formatting.ts` → `…/shared/naming.js`.
   `client/vite.config.ts` (read in full) sets no `resolve.extensions`, so Vite's
   default order puts `.js` before `.ts`.
2. **Server, via a live `tsx` probe** importing `shared/types.js` by absolute path:
   ```
   stages:    ["planning","recording","first-edit","second-edit",
               "ready-to-publish","published","archived","shelved","remix"]   # 9
   labelKeys: [... "review" ... "shelved","remix"]                            # 10
   ```
   `tsx` redirects the `.js` specifier to `types.ts`.
3. **The `.js` on disk** (`shared/types.js:5-24`) holds **8** stages — with `review`,
   **without** `shelved`/`remix`.

So the same specifier yields **9 stages on the server and 8 in the browser**. That is a
real, measured fork of one symbol across the client/server seam. `git ls-files shared/`
confirms all 8 artifacts (`.ts`/`.js`/`.d.ts` × types/constants/naming/paths) are
hand-committed.

**REFUTED sub-claim — `naming.js` is not stale.** The auditor implied all four
`.js` snapshots have drifted. `git log -1 -- shared/naming.js` and
`shared/naming.ts` are **the same commit `8d0d5f8`**, and
`git rev-list --count 8d0d5f8..HEAD -- shared/naming.ts` = **0**. I diffed the export
lists (25 exports, identical names and order) and read `validateName` +
`stripTrailingTags` in both: the 514→389 line delta is **purely type annotations and
interface declarations**. `naming.js` is a faithful compile. Same for `constants` and
`paths`. Only `types.js` (25 lines, `8d0d5f8`) and `types.d.ts` (704 lines, missing 60
exported types) have actually drifted.

**Why no bug is visible today — state this honestly.** The forked symbols
`DEFAULT_PROJECT_STAGES` and `STAGE_LABELS` have **zero code consumers** (searched both
worktrees, all extensions: only their own definitions plus `.md` docs). The *only* live
value-import from `shared/types` is `DEFAULT_TAGS`
(`NamingControls.tsx:4,50`), and it is byte-identical in `.ts` and `.js`. The trap is
armed but nothing has stepped on it.

**Rebuild implication:** never commit build output beside its source. Publish `shared`
as source the bundler compiles, and if a snapshot must exist, generate it in CI so a
stale one fails the build. A `.d.ts` missing 60 types is a silent seam, not a warning.

---

## 3. Superseded features left fully wired

**Verdict: PARTIALLY REFUTED — downgrade to high / probable. One item killed; LOC claim cut from 2,748 to ~1,804.**

**KILLED — `server/src/scripts/scanProjects.ts` (944 LOC) is NOT dead.** The auditor's
test was "in no `package.json` script", which is the wrong test for an operator CLI.
It has:
- a 249-line runbook, `docs/analysis/HOW-TO-RUN-SCANNER.md:34,44,249`, giving the exact
  invocation `tsx server/src/scripts/scanProjects.ts`;
- a self-documented usage header at `scanProjects.ts:8`;
- a **committed 76 KB output artifact** it generated —
  `docs/analysis/project-discrepancies.md:2652` reads
  *"Generated by: `server/src/scripts/scanProjects.ts`"*.

This is a deliberately out-of-band diagnostic tool. It may well be *stale* (last touched
`14ff7c5`, 2026-02-13) but "unreferenced by code" ≠ "dead" for a human-invoked script.

**Confirmed zero static references** (and per the enabling fact above, near-conclusive
for client components):
- `client/src/components/ProjectStatsPopup.tsx` — 955 LOC, no reference outside itself.
- `client/src/components/shared/RegenToolbar.tsx` — 415 LOC, no reference outside
  itself. I confirmed the duplication: `RegenToolbar.tsx:140` registers
  `regen:chapters:complete`, the same listener the live `ManagePanel.tsx:182` registers.
- `client/src/components/HoldDeleteModal.tsx` — 203 LOC, referenced **only** from
  `client/src/components/__tests__/HoldDeleteModal.test.tsx` (7 refs). Born `ddaed6a`
  (2026-04-08), orphaned by `ba8a440` (2026-04-14) — six days live.
- `client/src/components/shared/RelayBrowser.tsx` — 119 LOC, no reference.
- `SlideOutDrawer.tsx` (61) and `PageHeader.tsx` (15) — reachable **only** via the
  barrel `client/src/components/shared/index.ts:10` and `:4`. I enumerated all 12
  importers of that barrel; **neither symbol appears in any named-import list**, and
  there are no `import * as` consumers. Barrel re-export without a consumer.
- `client/src/utils/chapterUtils.ts` — 36 LOC, referenced only by
  `client/src/test/chapterListUtils.test.ts:2`.
- 4 hooks in `client/src/hooks/useHoldApi.ts` (`useVerifyHolding:48`,
  `useDeleteLocal:63`, `useRestoreFromHolding:84`, `useDeleteHolding:100`) — I grepped
  each by name across all of `client/src`: **0 external references each**.

**Could not establish:** the 7 backing routes in `server/src/routes/hold.ts`
(`:185,:220,:293,:357,:436,:510,:589`) have no client caller, but FliHub exposes an
external HTTP surface (see #7) and an operator can curl any of them. "No client caller"
is not "unreachable" for a server route. I did not check server access logs.

**Rebuild implication:** removal must be part of the definition-of-done for a
replacement. `eslint.config.js` has no unused-export rule and `noUnusedLocals` is
`false`, so an orphaned module is indistinguishable from a live one to every tool in
the repo — add a `knip`-style unused-export gate, and keep human-invoked scripts in a
declared `scripts` block so "unreferenced" becomes meaningful.

---

## 4. Socket contract: 2 orphan listeners, 4 orphan emissions

**Verdict: SURVIVES — high / certain.**

- **Listeners with no emitter:** `client/src/hooks/useSocket.ts:59` `file:renamed` and
  `:70` `file:error`. Both declared at `shared/types.ts:694-695`. `grep -rn
  "file:renamed|file:error" server/src` returns **only** the `shared/types.ts` and
  `shared/types.d.ts` declarations — **zero** occurrences in `server/src`.
- **Emissions with no listener:** `server/src/routes/chapters.ts:178`
  `chapters:generating`, `:189` `chapters:generated`; `server/src/routes/manage.ts:693`
  `regen:all:started`, `:728` `regen:all:error`. I dumped every `socket.on('…')` in the
  client (27 distinct names) — none of the four appears.
- The failure mode is real: `ManagePanel.tsx:179-192` subscribes to
  `regen:all:progress` and `regen:all:complete` but **not** `:error`, so a failed
  Regenerate All reports on a channel nobody hears and the progress toast just stops.

**Auditor's own self-corrections independently verified — both were right to
withdraw.** `WatcherManager.ts:62` `this.io.emit(config.event)` fires indirectly over
the table at `:114-217` (`thumbs:zip-added`, `assets:*`, `recordings:changed`,
`projects:changed`, `inbox:changed`, `transcripts:changed`, `thumbs:changed`) — a
literal grep for those emissions finds nothing, which is exactly the
absence-looks-like-presence trap. I also checked `chapters:complete` (not on the
auditor's list): it **is** emitted at `chapters.ts:209` and heard at `useSocket.ts:231`
— correctly not flagged.

**Rebuild implication:** derive the event contract, don't declare it. A declared event
typechecks both a listener whose producer was never written and a producer whose
listener was deleted. Emitters should be generated from, or checked against, a registry
that fails when either half is missing.

---

## 5. "Project stage" defined in three places

**Verdict: SUBSTANTIALLY REFUTED — downgrade to medium / uncertain. The cited evidence is factually wrong; what remains is a restatement of #2.**

**The load-bearing evidence is false.** The claim states *"`shared/types.ts:439`
`ProjectStage` and `:456` `DEFAULT_PROJECT_STAGES` define 8 stages with no
shelved/remix."* I read those lines:
- `shared/types.ts:439-449` — the `ProjectStage` union has **10** members, explicitly
  including `'shelved'` and `'remix'`, each with an `// FR-149` comment.
- `shared/types.ts:456-466` — `DEFAULT_PROJECT_STAGES` has **9** entries, including
  `shelved` and `remix`.

The 8-member version the auditor described exists at **`shared/types.d.ts:63-71`** and
**`shared/types.js:5-14`** — the stale committed snapshots. The auditor read the
generated artifacts and attributed them to the source. That is the same trap as #2, and
here it produced a wrong finding.

**What the three live `.ts` sites actually say:**

| site | members | `review`? | `shelved`/`remix`? |
|---|---|---|---|
| `shared/types.ts:439` union | 10 | yes | yes |
| `shared/types.ts:456` `DEFAULT_PROJECT_STAGES` | 9 | no | yes |
| `client/src/constants/stages.ts` `STAGE_DISPLAY` | 10 | yes | yes |
| `client/src/constants/stages.ts` `STAGE_ORDER` | 9 | no | yes |
| `server/src/routes/projects.ts:193` `validStages` | 11 | yes | yes + `'auto'` |

FR-149 updated **all three** live sites, not "two of the three". The only membership
differences are (a) `review` deliberately dropped from the two *pipeline* lists while
kept in the *type* and *display* map, and (b) `'auto'` in the validator. Both are
documented design decisions, not drift — `CONTEXT.md:109` and `CONTEXT.md:121` record
the rationale and the backward-compat intent.

**What genuinely survives:** `DEFAULT_PROJECT_STAGES` and `STAGE_LABELS` in
`shared/types.ts` have **zero code consumers** — I searched both worktrees across
`.ts/.tsx/.js/.json/.md`; every hit is either their own definition, the stale
`.js`/`.d.ts`, or documentation. The client re-implemented the concept in
`client/src/constants/stages.ts` and the shared originals were never retired. Also real,
and already noted in the repo's own docs
(`docs/planning/stage-and-project-actions/assessment.md:78`): the server validator
re-declares the list instead of importing it.

**Could not establish:** whether the orphaned shared constants are kept deliberately
for an external/API consumer. Nothing says so, but nothing rules it out.

**Rebuild implication:** one stage list, derived — union, labels, order and validator
all generated from a single ordered table, with the validator importing it rather than
re-typing it. Merge this item into #2 rather than tracking it separately.

---

## 6. `config.template.json` is a sample, not a schema

**Verdict: SURVIVES — upgrade to medium / certain (machine-diffed the two JSON files).**

`python3` set-diff of `server/config.template.json` against the live
`server/config.json`:

- Template has 12 keys.
- **In live config, absent from template (7):** `glingDictionary`, `machineRole`,
  `poemWuiUrl`, `projectPriorities`, `projectStageOverrides`, `relayDirectory`,
  `relayEnabled` — exactly the auditor's list.
- **In template, absent from live config (3):** `whisperBinary`, `whisperLanguage`,
  `whisperModel` — advertised but unused.
- **In neither file** yet declared in `Config`: `projectStages`, `chapterRecordings`,
  `brandConfigPath`, `diskThresholds` (`shared/types.ts:204,205,209,215`).

The Relay subsystem — `relayDirectory` + `relayEnabled`, the thing a new machine must be
configured for across five machines — is entirely missing from the file a new machine is
set up from. Since every added key is optional and every consumer defaults, a missing
key is indistinguishable from a deliberately-off one.

**Strengthened beyond the original claim:** `fileExtensions` is a **required**
(non-optional) field of `interface Config` at `shared/types.ts:198`, appears in **no**
config file, and is read at exactly one non-test site — its own hardcoded default
`['.mov']` at `server/src/config/configManager.ts:30`. **Nothing consumes it.** The
actual extension policy is hardcoded in at least 10 places: `server/src/watcher.ts:15`
(`'*.mov'` glob), `utils/projectStats.ts:149`, `utils/scanning.ts:20,58,129,184`,
`utils/chapterRecording.ts:532`, `utils/safeMigration.ts:36,75,216`. A config key that
looks like the extension policy but is inert is worse than no key.

**Rebuild implication:** make the template the schema — validate config against a Zod
schema at boot (`zod` is already a server dependency) and fail loudly on unknown or
missing keys. Delete required-but-unread fields.

---

## 7. `apiRegistry.ts` documents ~22% of the route surface

**Verdict: SURVIVES — medium / certain.**

- `shared/apiRegistry.ts` — sole importer is `client/src/components/ApiExplorer.tsx:8`.
  The explorer is live: `client/src/App.tsx:39` imports it, `:895` renders it.
- Registry entries: 35 `method:` occurrences (one is the `method:` field on the entry
  type itself, so **34 entries** — the auditor's count is right).
- Real route registrations across `server/src/routes`: **156**
  (`grep -rhoE "router\.(get|post|put|delete|patch)\(" | wc -l`).
- Coverage ≈ 22%.

**Note on the denominator:** 156 is *registrations*, and #1 proves at least one
`(method, path)` pair is registered twice, so the count of distinct reachable endpoints
is at most 155. This does not change the conclusion.

**The auditor's real insight holds and is the valuable part:** FliHub has **two**
API consumer classes — this React client, and external agents/CLI hitting `/api/query`
— and only one is described anywhere. `server/src/utils/reporters.ts` exists solely to
render query routes as ASCII and is imported only from `routes/query/*`; the contract is
specified in `docs/prd/project-data-query-spec.md`. This is why "no client caller" is
ambiguous rather than damning, and it is precisely the ambiguity that broke claim #3's
route sub-items.

**Rebuild implication:** generate the registry from the router table rather than hand-
maintaining it, and tag each route with its intended consumer (`internal-ui` vs
`external-api`) so an unused route is an assertion, not a guess.

---

## 8. All branches merged; tracked screenshot/mockup debris

**Verdict: SURVIVES — medium / certain, with two numeric corrections.**

Merge status — `git rev-list --count main..<branch>` = **0 for all 7** non-main
branches (`worktree-agent-a00111bf`, `-a49fa9be`, `-a678329a`, `-a8a8d1bd`,
`-acdaede0`, `test/verify-ci-2026-02-13`, `storage-panel`). `git worktree list` confirms
`flihub-storage-panel` sits on `ba8a440` while main is `3b3b2f1` — **strictly behind**,
holding nothing unmerged. `git branch -r` shows `origin` still carries
`test/verify-ci-2026-02-13`.

Tracked debris, re-measured:
- `.screenshots/` — 85 tracked files, **19 MB** by `du -ch` on the working tree (the
  claim said 24 MB; different measurement basis — I report what I measured). **Not** in
  `.gitignore`.
- `.mochaccino/` — 15 tracked files, **not** in `.gitignore`.
- `client/public/mocks/` — **26** tracked files (claim said 27).
- `.playwright-mcp/` — **1** tracked file, and `.playwright-mcp/` **is** the last line
  of `.gitignore`. This is the reactive-ignore pattern caught in the act: the rule was
  added only after a file had already been committed, and ignoring a path does not
  untrack what is already in it.
- `.auto-claude/`, `coverage/`, `.worktrees/` are correctly ignored.

**The non-obvious half is the important half, and it is confirmed.**
`client/public/mochaccino` is a **symlink** → `../../.mochaccino`
(`ls -la client/public/` shows `lrwxr-xr-x … mochaccino -> ../../.mochaccino`), and
`MockupsPage.tsx` — a live tab (`App.tsx:28` imports, `:887` renders) — links to
`/mochaccino/index.html` (`:101`) and `/mochaccino/designs/${d.slug}/index.html`
(`:136,:196,:256`). So `.mochaccino/` is **not** debris: a design-tooling directory is a
runtime dependency of the shipped app, reached through a symlink out of `public/`.
Ignoring it would break a live tab.

**Rebuild implication:** decide up front what is source, what is generated, and what is
scratch, and put scratch outside the repo root. Never let a tool's output directory
become a runtime dependency by symlink — if the app serves it, it is an asset and
belongs in `public/` for real.

---

## Summary

| # | Claim | Verdict | Confidence |
|---|---|---|---|
| 1 | duplicate `/hold` route | survives, strengthened to active regression | critical / certain |
| 2 | Vite `.js` vs tsc `.ts` fork | survives, fork measured; `naming.js` sub-claim refuted | critical / certain (latent impact) |
| 3 | superseded features left wired | partially refuted — `scanProjects.ts` killed | high / probable |
| 4 | socket contract halves | survives intact | high / certain |
| 5 | three divergent stage lists | substantially refuted — evidence read the wrong file | medium / uncertain |
| 6 | `config.template.json` drift | survives, upgraded + strengthened | medium / certain |
| 7 | `apiRegistry` 22% coverage | survives intact | medium / certain |
| 8 | merged branches + tracked debris | survives, two numbers corrected | medium / certain |

**The meta-lesson across all eight.** Three of these claims turned on reading a
*generated* file and believing it was the *source* (#2 correctly, #5 incorrectly), or on
applying a client-shaped reachability test to a server-shaped artifact (#3's
`scanProjects.ts`). The repo commits build output next to source and has two API
consumer classes with only one documented — so "unreferenced" is ambiguous by
construction. Fixing that ambiguity (generate snapshots in CI, declare every route's
consumer, register scripts) is worth more at rebuild time than deleting any single file
listed here.
