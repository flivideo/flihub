# Contracts audit — adversarial verification

**Dimension:** Shared contracts (types, naming, paths, API registry)
**Repo:** `/Users/davidcruwys/dev/ad/flivideo/flihub` @ `3b3b2f1`
**Date:** 2026-08-26
**Method:** every cited `file:line` re-opened; every count re-run; both module resolvers (tsc and Vite) executed against the real configs; the parser executed against real inputs.

**Result:** 8 findings reviewed — **8 survive**, **0 refuted outright**, **5 severities corrected downward**, **2 factual claims inside surviving findings refuted**.

---

## What I could NOT establish (read this first)

- **Nothing here was checked against a running app.** All verification is static plus two resolver probes and one Node execution of `shared/naming.js`. A finding marked "latent" means the code path exists and I proved the resolution/persistence mechanism — I did **not** observe a user hitting it.
- **Usage censuses use `grep -w` on identifier names.** A type referenced only through a re-export alias, a template string, or a `keyof`-derived name would be counted as unused. Absence of a grep hit and genuine non-use look identical to this check. Where that risk is material I say so inline.
- **"Never persisted" (F3) is proved by static analysis of `saveConfig`'s allowlist, cross-checked against the live `server/config.json` on this machine only.** Another machine's config file could contain those keys on disk — but `loadConfig` → `saveConfig` would still drop them on the next write.

---

## F1 — `shared/` has no module boundary: tsc and Vite resolve the same import to different files

**Verdict: UPHELD. Severity corrected `critical` → `high`. Confidence: certain (mechanism) / the drift itself is currently latent.**

Verified by executing both resolvers against the real configs.

Vite (real `client/vite.config.ts`, `pluginContainer.resolveId`, importer `client/src/components/NamingControls.tsx`):

```
../../../shared/types      -> shared/types.js
../../../shared/naming     -> shared/naming.js
../../../shared/constants  -> shared/constants.js
../../../shared/paths      -> shared/paths.js
../../../shared/apiRegistry-> shared/apiRegistry.ts   (no .js twin)
```

TypeScript (`tsc --traceResolution --moduleResolution bundler`, same importer):

```
File '.../shared/types.ts' exists - use it as a name resolution result.
```

So the client **type-checks `types.ts` and executes `types.js`**. Confirmed cause: `shared/package.json` has only a `test` script (no `build`, no `exports`), there is no `shared/tsconfig.json`, and `.gitignore` excludes `dist/` but not the sibling `.js`/`.d.ts` output sitting next to the sources. `git ls-files shared/` shows the `.ts` + `.js` + `.d.ts` triple tracked for `types`, `naming`, `paths`, `constants`.

**Staleness re-measured (auditor's numbers narrowed):**

| file | checked-in `.js` vs recompiled `.ts` (whitespace-stripped md5) |
|---|---|
| `naming.js` | **identical** |
| `paths.js` | **identical** |
| `constants.js` | **identical** |
| `types.js` | **stale** |

Only `types.js` has drifted. `shared/types.js:5-13` still lists `'review'` in `DEFAULT_PROJECT_STAGES` and lacks `'shelved'`/`'remix'`, which `shared/types.ts:456` added under FR-149.

**Live divergence proven across the two runtimes.** `server/src/*` imports `'../../../shared/types.js'`; I ran `tsx` on a probe with that exact specifier:

```
STAGES: ["planning","recording","first-edit","second-edit","ready-to-publish","published","archived","shelved","remix"]
```

tsx maps `.js` → `.ts` (fresh); Vite maps extensionless → `.js` (stale). **Server and client hold different values for the same shared constant right now.**

**Correction to the auditor — the consequence is latent, not active.** Repo-wide grep for `DEFAULT_PROJECT_STAGES` and `STAGE_LABELS` outside `shared/` returns **zero** consumers in `client/src` or `server/src`. The only shared runtime value the client actually executes is `DEFAULT_TAGS` (`client/src/components/NamingControls.tsx:4,50`), which matches in both copies. So no user-visible bug follows today. That is why I dropped `critical` → `high`: this is a loaded landmine (the next runtime export added to `types.ts` silently does not reach the client), not a live fire.

`shared/types.d.ts` is **not** a second split brain — tsc resolves `.ts` before `.d.ts` (trace above). It is 88 exports against `types.ts`'s 148, with `grep -c Relay shared/types.d.ts` = 0: inert dead weight, not an active hazard. Corrected from the auditor's framing.

**Downstream symptoms of the same missing seam, all confirmed:**
- `server/tsconfig.json:10` — `// "rootDir": "./src",  // Commented out to allow imports from ../shared/`. Output therefore lands at `server/dist/server/src/index.js` (directory listing confirms `server/dist/server/src/index.js` exists) while `server/package.json:9` declares `"start": "node dist/index.js"` — a path that does not exist. Practical impact is low: `Procfile` runs `npm run dev -w server` (tsx), so `npm start` is never on the hot path.
- `server/nodemon.json:1` — `"watch": ["src"]`, so editing `shared/*.ts` never restarts the server.

**Rebuild implication:** make `shared` a real package — its own `tsconfig`, a `build` script, `exports` in `package.json`, output to `dist/` and gitignored. Never let compiled output share a directory with source. If a build step is unwanted, ship source-only and delete every `.js`/`.d.ts` from `shared/`.

---

## F2 — The HTTP wire contract is partial and unenforced (socket contract is not)

**Verdict: UPHELD. Severity corrected `critical` → `high`. One sub-claim REFUTED.**

Counts re-run and confirmed exactly:

| measure | value |
|---|---|
| `res.json(` in `server/src` | **245** |
| `res.json<` (generic) | **0** |
| `Response<[A-Z]` (Express generic) | **0** |
| files importing `zod` in `server/src` | **1** (`server/src/config/env.ts`) |
| `success: boolean` in `shared/types.ts` | **44** |
| `error?: string` in `shared/types.ts` | **41** |
| generic `ApiResponse<T>` / `Result<T>` | **none** |
| `res.status(N).json({ success: false` | **205** |
| `res.json({ success: false` (HTTP 200) | **30** |

Socket contract genuinely is typed — `server/src/index.ts:83` `new Server<ClientToServerEvents, ServerToClientEvents>`, `client/src/hooks/useSocket.ts:8` `Socket<ServerToClientEvents, ClientToServerEvents>`. Confirmed.

**REFUTED sub-claim:** the auditor wrote *"53 `*Response` interfaces describe the server without the server ever referencing them."* I ran the full census (Python, word-boundary regex over every `.ts`/`.tsx` in `server/src` and `client/src`):

```
total *Response types = 53
referenced in server non-test source = 23   (of those: 15 via real type annotation, 6 via `as X` only)
referenced in client = 50
referenced by neither = 1  (TranscriptContentResponse)
```

Real server-side annotations exist and do type-check: `server/src/routes/shadows.ts:43,72,134` (`const response: ShadowStatusResponse = {...}`), `server/src/routes/system.ts:234`, `server/src/routes/projects.ts:274`, `server/src/utils/chapterExtraction.ts:561`. So the compiler *can* catch drift on ~28% of endpoints. The auditor's "never" is wrong.

**What survives, and it is still the finding:** the enforcement is opportunistic, not structural. `res.json()` itself is never typed (0/245), so nothing forces a handler to declare its shape; 6 of the 23 server references use `as X`, which permits missing fields; **30 of 53 response types have no server-side reference at all** — including the one the auditor cited: `server/src/routes/relay.ts:6` imports the domain types but none of the `Relay*Response` types, and `server/src/routes/relay.ts:104-106` emits an untyped object literal while `client/src/hooks/useRelayApi.ts:10,55,60` *asserts* `const data: RelayStatusResponse = await res.json()`. Plus: zod is a dependency used only for env parsing, so no response is ever validated at runtime; and the envelope is hand-repeated 44/41 times with no generic.

**Rebuild implication:** define each endpoint once as a schema (zod or equivalent) that produces both the TS type and a runtime parser, and route through a typed `send<T>()` helper so `res.json` cannot be called with an undeclared shape. One `ApiResponse<T>` envelope with a single error convention — pick status-code-carries-failure or envelope-carries-failure, not both.

---

## F3 — `Config` is a schema expressed as a chain of `if` statements; 6 of its 25 fields can never be persisted

**Verdict: UPHELD. Severity corrected `critical` → `high`. Confidence: certain.**

`Config` at `shared/types.ts:190` — I extracted the field list programmatically: **25 fields**. I then extracted every key `saveConfig` can write (`server/src/config/configManager.ts:120-170`, literal keys plus `toSave.X =` assignments): **18 keys**.

Set difference — fields that can never reach disk:

```
chapterRecordings, diskThresholds, fileExtensions,
whisperBinary, whisperLanguage, whisperModel
(+ projectDirectory, which is deliberately derived — not a defect)
```

Exactly the six the auditor named. Confirmed.

The same field list is hand-rewritten in six places, all verified: `getDefaultConfig()` (`configManager.ts:24`, 9 fields), the migration allowlist (`configManager.ts:86-104`, 6 base + 8 conditional), `saveConfig`'s `toSave` (`configManager.ts:124-166`), `updateConfig` (`server/src/index.ts:154-199`), the `POST /api/config` destructure (`server/src/routes/index.ts:119-133`), and `server/config.template.json` (16 keys). `loadConfig` ends `return { ...defaults, ...saved }` over raw `fs.readJsonSync` output — no validation (`configManager.ts:110`).

**Sharpest confirmed consequence.** `server/src/routes/chapters.ts:78-84`:

```ts
config.chapterRecordings = newChapterConfig;
saveConfig(config);
res.json({ success: true, config: newChapterConfig });
```

`saveConfig` has no `chapterRecordings` branch, so the write is discarded; `getChapterConfig()` (`chapters.ts:48-51`) falls back to `DEFAULT_CHAPTER_CONFIG` after restart. The endpoint reports success for a change it cannot keep.

Second confirmed consequence: `server/config.template.json` — the documented setup file — ships `whisperBinary`, `whisperModel`, `whisperLanguage`, and `server/src/routes/transcriptions.ts:124-127` reads them with hardcoded fallbacks. The live `server/config.json` on this machine has exactly the 16 saveable keys and **none** of the six.

Severity dropped to `high` because the app remains functional and the losses are confined to settings, not project data.

**Rebuild implication:** declare the config schema once (zod object) and derive defaults, parse-on-load, and serialize-on-save from it. A hand-maintained persistence allowlist is a schema you must remember to update — and forgetting produces no error.

---

## F4 — `ParsedRecording` is a subset of the naming convention it parses

**Verdict: UPHELD. Severity `high`. Confidence: certain.**

`shared/naming.ts:127-131` — `ParsedRecording` is `{chapter, sequence, name}`. No `tags`, no `extension`. `stripTrailingTags()` (`naming.ts:159`) is called inside `parseRecordingFilename` and its output discarded; a separate `extractTagsFromName()` sits at `naming.ts:190`. `naming.ts:222` strips only `/\.mov$/i`.

I executed the real module (`node`, importing `shared/naming.js`, which I proved byte-equivalent to the `.ts`):

```
10-5-intro-CTA.mov  -> {"chapter":"10","sequence":"5","name":"intro"}     // CTA unrecoverable
10-5-intro-CTA.mp4  -> {"chapter":"10","sequence":"5","name":"intro-CTA.mp4"}
10-5-intro.mp4      -> {"chapter":"10","sequence":"5","name":"intro.mp4"}
05-3-demo.MOV       -> {"chapter":"05","sequence":"3","name":"demo"}
```

`.mp4` is real in this system: `server/src/utils/projectStats.ts` counts `.mp4|| .mov` as recordings and shadows are `.mp4` (`server/src/utils/renameRecording.ts:134`). The test at `shared/naming.test.ts:54-64` codifies the flaw — title says *"by returning null"*, assertions are `expect(result).not.toBeNull()` / `expect(result?.name).toBe('intro.mp4')`.

**Reimplementation re-counted.** `parseRecordingFilename` has **47** call sites (non-test) — genuinely centralised, as the auditor conceded. Alongside it, my narrower regex found **15** independent chapter/sequence regexes in non-test source (auditor said 19; my pattern is stricter, so treat 15 as a floor):

`client/src/components/shared/PreviewPanel.tsx:37`, `server/src/utils/poemWuiUtils.ts:109`, `server/src/utils/renameRecording.ts:111,112,163`, `server/src/utils/scanning.ts:40`, `server/src/utils/chapterRecording.ts:503`, `server/src/routes/transcriptions.ts:656,774`, `server/src/routes/relay.ts:245`, `server/src/routes/query/export.ts:203,214`, `server/src/utils/chapterExtraction.ts:146`, `server/src/routes/query/chapters.ts:46,59`.

Two of them encode a *different* rule: `transcriptions.ts:774` uses `^(\d{1,2})-` where the others use `^(\d{2})-`. `chapterRecording.ts:503` hardcodes `\.mov$`. Plus **16** `split('-')` re-derivations in non-test source.

The clinching duplication is confirmed verbatim on both sides of the wire:

- `client/src/components/RecordingsView.tsx:990` — `const nameAndTags = base.split('-').slice(2).join('-');`
- `server/src/routes/manage.ts:1587` — `const nameParts = base.split('-').slice(2).join('-');` preceded by the comment `// Extract tags from the raw filename (parseRecordingFilename strips them)`

The comment is the codebase admitting the return type is wrong.

**Project code never modelled — confirmed.** `shared/naming.ts:58` `PROJECT_CODE: NAMING_RULES.name.pattern` — an alias for the generic kebab-case pattern (`naming.ts:46-49`) that does not encode the `{letter}{2 digits}-` prefix at all. Repo-wide grep for `PROJECT_CODE` returns only its own definition, the `.d.ts` declaration, and an unrelated local constant. The real rule is re-derived five ways, all verified: `client/src/utils/projectFilters.ts:7` (`/^[a-zA-Z]\d{2}-(.+)$/`), `client/src/components/ProjectDeleteModal.tsx:56` (`/^[a-zA-Z]\d{2}-?/`), `client/src/components/ProjectDrawer.tsx:169` (same), `client/src/components/ProjectsPanel.tsx:48` (`PROJECT_CODE_PATTERN = /^[a-zA-Z]\d{2}(-|$)/`), `server/src/routes/edit.ts:22-24` (`projectCode.split('-')`).

**Rebuild implication:** the parsed type must be lossless — `{chapter, sequence, name, tags[], extension}` — with `format()` as its exact inverse, so no caller ever needs the raw string. Model `ProjectCode` as a first-class parsed value with one pattern, and make the extension set data, not a literal in a regex.

---

## F5 — `shared/types.ts` has no membership rule; ~54% of it is not shared

**Verdict: UPHELD with severity corrected `high` → `medium`. Part of the finding is style, not architecture.**

Measured: **1410 lines**, **148 exported declarations** (124 interfaces, 21 types, 3 consts). **149** requirement-ID mentions across **53** distinct IDs. All confirmed.

Census (word-boundary regex, every `.ts`/`.tsx` in both trees):

```
both sides   = 68
client-only  = 41
server-only  = 29
neither      = 10   (incl. the 2 unused consts)
```

Excluding the consts: 78 of 145 named types (**54%**) are referenced by only one side or neither. Auditor's 53% is right. The 8 dead types they named are all in my `neither` list.

**What I downgrade and why.** The "chronological ledger" half — marker ordering `B039, FR-147, B043, FR-147…`, Relay types split across two ranges, `FR-147` appearing twice 40 lines apart — is a **file-organisation complaint**, not a structural flaw. Reordering the file changes nothing about how the system behaves. That half is taste.

The half that survives is real: `shared/` acquired no membership test, so it became the default home for any type a feature touched. The consequence is that "shared" is not a contract surface — it is a bag — which is the same root as F1 (no boundary) and F2 (DTOs modelled as client-side types). Counting it separately risks double-counting, hence `medium`.

**Caveat:** the census cannot distinguish "unused" from "referenced through an alias or a derived name". Treat the `neither` list as candidates, not proof of dead code.

**Rebuild implication:** split into `shared/domain` (concepts both sides genuinely model — `Recording`, `Project`, `ProjectStage`, `ProjectPaths`) and `shared/api` (per-endpoint request/response schemas, generated or at least co-located with the route). A type used by one side belongs in that side's tree.

---

## F6 — `apiRegistry.ts` is a second copy of the route table with no mechanism to fail when it diverges

**Verdict: UPHELD. Severity `high`. Confidence: certain.**

Every number re-run and confirmed:

| measure | value |
|---|---|
| `shared/apiRegistry.ts` lines | **1000** |
| endpoint literals (`id: '`) | **34** |
| `router.<verb>(` in `server/src/routes` | **156** → registry covers **22%** |
| importers of `apiRegistry` / `API_ENDPOINTS` | **1** — `client/src/components/ApiExplorer.tsx:3-8` |
| server files importing it | **0** |
| test files importing it | **0** |
| openapi/swagger tooling | **0** (three `docs/` mentions only) |
| last commit touching it | `14ff7c5`, 2026-02-13, *"fix: resolve ESLint warnings and verify all tooling works"* |
| commits to `shared/types.ts` since `14ff7c5` | **28** |

`ApiExplorer` builds a URL and `fetch`es it — the registry is its *content*, not its verifier, so nothing makes the copy fail when it diverges. Five route files shipped since the last registry edit (`hold.ts`, `poem-wui.ts`, `relay.ts`, `storage.ts`, `sync.ts`) with no entries.

**The consequential half, verified.** `server/src/routes/query/index.ts:41-46` — the machine-facing config endpoint — publishes:

```ts
stages: ['none', 'recording', 'editing', 'done'],
stageFilters: ['none', 'recording', 'editing', 'done'],
```

`ProjectStage` (`shared/types.ts:439-449`) has ten members: `planning, recording, first-edit, second-edit, review, ready-to-publish, published, archived, shelved, remix`. Overlap: **`'recording'` only**. `'none'`, `'editing'`, `'done'` are not valid `ProjectStage` values. A client that trusts `/api/query/config` gets a vocabulary the rest of the system does not speak.

I did **not** verify whether any consumer actually reads `/api/query/config` — the endpoint may be dead. The type-level lie stands either way.

**Rebuild implication:** the registry must be the thing the server routes *from* (or be generated from the route table at build time). A hand-written second copy with no equality test is guaranteed to lose.

---

## F7 — `paths.ts` is incomplete rather than absent, so callers routed around it and a rival table formed inside a route handler

**Verdict: UPHELD. Severity `medium`. Confidence: certain.**

`getProjectPaths()` is genuinely adopted: **106** call sites across both trees (auditor said 103 — same order, my count includes the definition and re-exports). `ProjectPaths` (`shared/paths.ts:11-29`) has 16 keys, last addition FR-111's `stateFile`.

Hardcoded folder-name literals inside `path.join(` in non-test server source, re-counted:

```
recording-shadows 20   (never in ProjectPaths)
recordings        15   (paths.recordings exists)
-safe              5   (paths.safe exists)
-trash             5   (paths.trash exists)
recording-transcripts 5 (paths.transcripts exists)
edit-2nd           5   (never added)
assets             4
edit-1st / -chapters / final  3 each
s3-staging         2
inbox              1
```

The rival table is real — `server/src/routes/system.ts:293-314`, `const folderMap: Record<FolderKey, string>`: 11 entries delegate to `paths.*`, 7 are invented in place (`shadows`, `edit-1st`, `edit-2nd`, `edit-final`, `s3Prep`, `s3Post`, `relay`). The tell is confirmed verbatim on line 310:

```ts
chapters: path.join(paths.recordings, '-chapters'),
```

re-deriving `paths.chapters` (`shared/paths.ts:42`) which `getProjectPaths` computed three lines above at `system.ts:291`.

Four vocabularies for "a folder in a project", all confirmed:
- `ProjectPaths` keys — 16, camelCase (`shared/paths.ts:11-29`)
- `FolderKey` — 20, mixed `'edit-1st'` and `s3Staging` (`shared/types.ts:1236-1257`)
- `RelaySubfolder` — 3, `'recordings' | 'edit-1st' | 'edit-2nd'` (`shared/types.ts:7`)
- `EditFolderKey` — 3, `'edit-1st' | 'edit-2nd' | 'edit-final'` (`shared/types.ts:1259`)

`'recordings'`, `'edit-1st'`, `'edit-2nd'` each appear independently in three of the four, with no mapping between them.

**Rebuild implication:** model the project layout as one declarative folder table (key → relative path → role), and derive `ProjectPaths`, the open-in-Finder map, the relay subfolder set and the edit-folder set from it. When the layout grows, one table changes.

---

## F8 — `shared/` froze at four files, so pure cross-cutting logic forked and has already diverged

**Verdict: UPHELD. Severity `medium`. Confidence upgraded `probable` → `certain` (I read both implementations). Weakest of the eight; part of it is a lint nit.**

`shared/constants.ts` is 22 lines with two constant objects, and has exactly **two** importers repo-wide — confirmed: `client/src/hooks/useBestTake.ts:3`, `server/src/watcher.ts:6`.

Byte formatting has three implementations, all confirmed present:
- `client/src/utils/formatting.ts:7` `formatFileSize`
- `client/src/utils/formatBytes.ts:4` `formatBytes`
- `server/src/utils/formatters.ts:17` `formatSize`
- plus inline arithmetic at `client/src/components/ProjectDeleteModal.tsx:59-61`

Size *parsing* is duplicated with the duplication admitted in the code — `client/src/utils/formatBytes.ts:11`:

```ts
// B062: Parse human-readable size string to bytes (mirrors server diskUtils)
```

against `server/src/utils/diskUtils.ts:57`. Both are pure `string → number`, and they already differ in detail (the server version trims whitespace before the `'0'` check; the client version does not).

`formatDuration` exists twice and the two disagree on zero — verified by reading both:
- `server/src/utils/formatters.ts:31` — `if (seconds === null || seconds === 0) return '-';`
- `client/src/utils/formatting.ts:64` — `if (seconds == null) return '-';`

**Correction to the auditor:** they said a zero-length recording renders `0:00` in the client. With the default `style: 'smart'` it renders **`0s`** (`formatting.ts:86-88`); `'youtube'` style would give `00:00`. The divergence is real; the stated output was wrong. The client version also takes a `style` parameter the server version lacks.

**What I discount:** `1024 * 1024` appearing 15 times in non-test source while `FILE_SIZE.MB` goes unused is a lint nit, not an architectural flaw. I confirmed both numbers (15 occurrences; `FILE_SIZE` has one usage, `SUBSTANTIAL_BYTES` at `useBestTake.ts:26`) but it does not carry the finding.

**Rebuild implication:** the membership test for `shared/` must be *"is this pure and does it describe the domain?"* — not *"do both sides already import it?"*, which is circular and guarantees the folder never grows. Formatters, parsers and comparators are the first things that belong there, before types.

---

## Cross-cutting read

F1, F2, F5 and F8 are four faces of one absence: **`shared/` was created as a folder, never as a package with a boundary and a membership rule.** No build step (F1), so source and output collide; no contract enforcement (F2), so DTOs are one-sided; no membership rule (F5, F8), so it filled with one side's types and stayed empty of shared behaviour.

F3, F6 and F7 are three faces of a second absence: **every vocabulary in this system is declared more than once with nothing making the copies agree** — config fields (7 places), routes (registry vs `index.ts`), folders (4 unions + a rival map). In each case the second copy lost silently, because omission produces no error.

For the rebuild, those are two rules, not seven fixes:
1. `shared` is a package with a build, an `exports` map, and a stated membership test.
2. Every vocabulary is declared exactly once and everything else is derived from it — schema → type + validator, folder table → paths + keys, route table → registry.
