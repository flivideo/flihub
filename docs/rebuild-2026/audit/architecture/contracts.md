# Architecture Audit — Shared Contracts

**Scope:** `shared/types.ts` (1410 lines), `shared/apiRegistry.ts` (1000), `shared/naming.ts` (514),
`shared/paths.ts` (65), `shared/constants.ts` (22), and the checked-in `.d.ts` / `.js` files beside them.
**Method:** read the sources; measured with `grep`/`comm`; verified two claims by *executing* code
(the Vite resolver, and `parseRecordingFilename` itself).
**Audited at:** `main` @ `3b3b2f1`, 2026-08-26.

---

## Verdict

`shared/` is not a contract layer. It is a **type dictionary with no enforcement anywhere**, sitting next to
**stale compiled copies of itself that the client actually executes**.

Three of the four things a shared layer is supposed to guarantee are absent:

| Guarantee | Status |
|---|---|
| One definition of each concept | ✗ — folders, project codes, byte formatting, durations and the Config schema each exist 2–7 times |
| The wire is type-checked | ✗ — 245 `res.json()` calls, **zero** typed; the client *declares* response shapes by cast |
| Source is what runs | ✗ — the client's Vite build loads `shared/types.js` / `naming.js` / `constants.js`, not the `.ts` |
| Socket events are type-checked | ✓ — the one channel that actually got a contract |

The socket channel is the tell. Someone knew how to do this (`ServerToClientEvents` / `ClientToServerEvents`
are genuinely enforced on both ends, `server/src/index.ts:83`, `client/src/hooks/useSocket.ts:8`). The HTTP
channel — 156 routes, 87 distinct client URLs — got nothing. **The rebuild should copy the socket pattern
onto HTTP, not invent something new.**

---

## Finding 1 — The client type-checks `.ts` and executes stale `.js`

### The mechanism

`shared/` ships **both** the sources and their compiled output, all git-tracked:

```
$ git ls-files shared/
shared/constants.d.ts   shared/constants.js   shared/constants.ts
shared/naming.d.ts      shared/naming.js      shared/naming.ts
shared/paths.d.ts       shared/paths.js       shared/paths.ts
shared/types.d.ts       shared/types.js       shared/types.ts
shared/apiRegistry.ts        ← the only file with no .js twin
```

Added in the very first commit (`da12b86`, 2025-12-13). There is **no build step that produces them** —
`shared/package.json` has only `"test": "vitest run"`, and there is no `shared/tsconfig.json`. They are
hand-carried artifacts.

The client imports `shared` **without an extension — every one of its 76 shared imports**:

```
41 × '../../../shared/types'      11 × '../../../../../shared/types'
10 × '../../../../shared/types'    1 × '../../shared/types'
 8 × '../../../shared/naming'      3 × '../../../../shared/naming'
 1 × '../../../shared/constants'   1 × '../../../shared/apiRegistry'
```

(The server, by contrast, always writes `.js`: `'../../../shared/types.js'` × 43, etc. — 91 imports,
all explicit.)

Vite 6.4.1's default `resolve.extensions` is
`['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']`
(`node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:48471`) — **`.js` before `.ts`**.
TypeScript (`moduleResolution: "bundler"`, `noEmit: true`) resolves the same specifier to `.ts`.

I ran Vite's own resolver against the real client config rather than reasoning about it:

```js
const r = await server.pluginContainer.resolveId('../../../shared/types',
            '…/client/src/components/NamingControls.tsx');
```
```
../../../shared/types       -> /…/flihub/shared/types.js      ← compiled artifact
../../../shared/naming      -> /…/flihub/shared/naming.js     ← compiled artifact
../../../shared/constants   -> /…/flihub/shared/constants.js  ← compiled artifact
../../../shared/apiRegistry -> /…/flihub/shared/apiRegistry.ts ← source (no .js twin exists)
```

So `tsc -b` proves things about files the browser never loads.

### The artifacts are already wrong

Recompiled the four sources into a temp dir and diffed (whitespace-normalised):

| file | differing lines vs. a fresh compile |
|---|---|
| `paths.js` / `paths.d.ts` | 0 |
| `constants.js` / `constants.d.ts` | 0 |
| `naming.js` | 72 — **all cosmetic** (`npm run format` reformatted the checked-in output; semantics identical) |
| `types.js` | **6 — semantic** |
| `types.d.ts` | **464 — semantic** |

`shared/types.js` is missing FR-149 entirely:

```diff
  export const DEFAULT_PROJECT_STAGES = [
    'planning', 'recording', 'first-edit', 'second-edit',
- 'review',
    'ready-to-publish', 'published', 'archived',
+ 'shelved',   // FR-149
+ 'remix',     // FR-149
  ];
```

`shared/types.d.ts` declares **88** exported types; `types.ts` has **148**. The 60 missing are entire
subsystems: `MachineRole`, all 23 `Relay*`, all 9 `Sync*`, all 11 `Storage*`, `Archive*`, `Hold*`,
`EditVersion`, `DiskThreshold*`, `SplitChapter*`, `UndoRenameResponse`.

**No visible bug today** — the only runtime value the client imports from `types` is `DEFAULT_TAGS`
(`client/src/components/NamingControls.tsx:4`), which happens to be unchanged. That is luck, not design.
The first time a component imports `DEFAULT_PROJECT_STAGES` or `STAGE_LABELS`, the UI will render the
2026-03 stage vocabulary while the server persists the 2026-04 one, **and `tsc` will pass**.

### The same missing boundary breaks the server build

`server/tsconfig.json` has `rootDir` commented out with the note *"Commented out to allow imports from
../shared/"*. Consequence: `tsc` infers the repo root, and output lands at `server/dist/server/src/index.js`
plus `server/dist/shared/`. But `server/package.json` declares `"start": "node dist/index.js"` — a path
that does not exist:

```
$ find server/dist -name index.js -maxdepth 4
server/dist/server/src/index.js
```

Nobody noticed because `npm start` is never used; dev runs `tsx src/index.ts`. Also, `server/nodemon.json`
watches `["src"]` only — **editing `shared/*.ts` does not restart the server.**

### Rebuild implication

Make `shared` a real workspace package with `exports`, its own `tsconfig`, a build step, and `dist/`
gitignored — or make it source-only (no `.js`/`.d.ts` ever, `resolve.alias` in Vite, `.ts` extensions in
imports). Either is fine. The current state — source and output in the same directory, one for the
type-checker and one for the bundler — is the worst of both and cannot be defended.

---

## Finding 2 — There is no wire contract; the client invents one

```
res.json(   calls in server/src :  245
res.json<T>( typed calls        :    0
Response<T> express generics    :    0
zod schemas outside env.ts      :    0   (zod ^4.3.6 is a dependency; used only in server/src/config/env.ts)
```

Every server response is an untyped object literal. `server/src/routes/relay.ts` imports the *domain* types
(`RelayProjectInfo`, `RelaySubfolder`, …) but **not one of the 14 `Relay*Response` types** — those are
imported only by `client/src/hooks/useRelayApi.ts`, where the shape is asserted into existence:

```ts
// client/src/hooks/useRelayApi.ts:55-60
queryFn: async (): Promise<RelayStatusResponse> => {
  …
  const data: RelayStatusResponse = await res.json();   // a cast, not a check
```

meanwhile the producer is:

```ts
// server/src/routes/relay.ts:104-106
router.get('/status', async (req, res) => {
  res.json({ … });     //  no type relationship to RelayStatusResponse whatsoever
```

Counting who actually *uses* each of the 145 exported interfaces/types in `types.ts`:

| | count | share |
|---|---|---|
| referenced in **both** `client/src` and `server/src` | 68 | 47% |
| **client only** (40) — mostly `*Response` shapes the server never sees | 40 | 28% |
| **server only** | 29 | 20% |
| **neither** (dead) | 8 | 6% |

The 40 client-only names include `RelayStatusResponse`, `RelayBrowseResponse`, `RelayPushResponse`,
`SyncStatusResponse`, `ManifestStatusResponse`, `CleanEditFolderResponse`, `SafeResponse`, `ParkResponse`,
`InboxResponse`… Each one is a **hypothesis about the server, written in the client, checked by nobody.**

And the envelope was never abstracted:

```
interfaces hand-writing 'success: boolean' : 44
interfaces hand-writing 'error?: string'   : 41
a generic ApiResponse<T> / Result<T>       :  0
```

Error signalling is split two ways: 205 single-line `res.status(N).json({ success: false …})` vs 30
`res.json({ success: false …})` at HTTP 200 (both are lower bounds — multi-line calls are not counted).
The client hedges accordingly: 35 `res.ok` checks and 150 `.success` checks.

*Contrast — sockets.* `ServerToClientEvents` (24 events, `shared/types.ts:691`) is parameterised into
`Server<ClientToServerEvents, ServerToClientEvents>` on the server and `Socket<ServerToClientEvents,
ClientToServerEvents>` on the client. Payloads are checked at both ends, and `WatcherManager` even types
its dynamic emit as `event: keyof ServerToClientEvents` (`server/src/WatcherManager.ts:22`). **This is the
pattern the HTTP layer never got.**

### Rebuild implication

One `ApiResult<T>` envelope. Route handlers typed as producers of a named response type (`RequestHandler<…,
XResponse>`) or, better, a shared contract object per endpoint (path + params + response) that *both* sides
import — server for its handler signature, client for its fetch wrapper. If a runtime guarantee is wanted,
zod is already installed; parse at the client boundary so a drifted server fails loudly instead of rendering
`undefined`.

---

## Finding 3 — The `Config` schema exists in seven hand-maintained places, and silently eats data

`Config` (`shared/types.ts:190`, **25 fields**) is re-listed, by hand, in:

1. `shared/types.ts` — the interface (25 fields)
2. `server/src/config/configManager.ts:24` `getDefaultConfig()` (9 fields)
3. `server/src/config/configManager.ts:86` — the migration allowlist inside `loadConfig` (6 fields)
4. `server/src/config/configManager.ts:124` `saveConfig()` allowlist (**18 fields**)
5. `server/src/index.ts:154` `updateConfig()` — field-by-field copies (13 fields)
6. `server/src/routes/index.ts:119` `POST /api/config` destructure (13 fields)
7. `server/config.template.json` (12 keys) — the documented setup path

Nothing cross-checks them. `loadConfig` ends with `return { ...defaults, ...saved }` where `saved` came from
`fs.readJsonSync` — an `any` laundered into `Config` by the return annotation. No validation, despite zod
being a dependency.

**Seven `Config` fields can never be written to disk** (computed by diffing the interface against every
`toSave.*` assignment in `saveConfig`):

```
chapterRecordings  diskThresholds  fileExtensions
whisperBinary  whisperLanguage  whisperModel
projectDirectory   ← legitimately derived; the other six are not
```

This produces a *closed loop of silent loss*:

- `server/config.template.json` — the file the setup docs tell you to copy — **ships**
  `whisperBinary`, `whisperModel`, `whisperLanguage`.
- `loadConfig` reads them fine.
- The first time anything calls `saveConfig` — e.g. changing a directory in the UI, which goes
  `POST /api/config` → `updateConfig` (`server/src/index.ts:201`) → `saveConfigToFile` — the allowlist
  rewrites `config.json` **without them**.
- `server/src/routes/transcriptions.ts:125-127` then silently falls back to hardcoded defaults.

Worse, `PUT /api/chapters/config` writes a field that is *structurally unsaveable*:

```ts
// server/src/routes/chapters.ts:79-80
config.chapterRecordings = newChapterConfig;
saveConfig(config);              // saveConfig has no `chapterRecordings` branch
```
```ts
// server/src/routes/chapters.ts:48-51
function getChapterConfig(): ChapterRecordingConfig {
  return getConfig().chapterRecordings || DEFAULT_CHAPTER_CONFIG;
}
```

The endpoint returns `{success: true}` and the setting survives exactly until restart.

**Live corroboration** — the actual `server/config.json` on this machine:

```
keys present: activeProject availableTags commonNames glingDictionary holdingPath
              imageSourceDirectory machineRole poemWuiUrl projectPriorities
              projectStageOverrides projectsRootDirectory publishedPath
              relayDirectory relayEnabled shadowResolution watchDirectory
whisperBinary present?      False
chapterRecordings present?  False
diskThresholds present?     False
```

Exactly the allowlist, exactly the six droppable fields absent. *Honest caveat:* this is consistent with
erasure and equally consistent with them never having been set. The **code path** is proven; the **history
of this particular file** is not.

### Rebuild implication

Declare the config schema **once** — a zod schema is the natural choice, since it gives the TS type
(`z.infer`), the parse-on-load, the defaults and the round-trip serialiser from a single declaration.
Persist by `schema.parse(config)`, never by a hand-written key list. An allowlist that must be edited
every time a field is added is a schema with a manual `if` per field, and it will fall behind — it already
has, six times.

---

## Finding 4 — The core convention is modelled *incompletely*, so everyone re-parses it

`{chapter}-{sequence}-{name}-{tags}.mov` is the app's whole value proposition. It *is* centralised —
`parseRecordingFilename` has **44 call sites across 12 files**. That part is right.

But the parse result throws away two of the four components:

```ts
// shared/naming.ts:127
export interface ParsedRecording {
  chapter: string;
  sequence: string | null;
  name: string;
}          //  ← no tags. no extension.
```

`parseRecordingFilename` calls `stripTrailingTags(…)` internally and **discards the result**. Tags are
recoverable only by calling a *second*, separate function (`extractTagsFromName`). I ran the real module:

```
$ node -e "import {parseRecordingFilename} from './shared/naming.js' …"
mov : {"chapter":"10","sequence":"5","name":"intro"}                 ← "CTA" gone, unrecoverable
mp4 : {"chapter":"10","sequence":"5","name":"intro-CTA.mp4"}         ← WRONG
MOV : {"chapter":"10","sequence":"5","name":"intro"}
```

The `.mp4` result is not a typo; `shared/naming.ts:222` does `filename.replace(/\.mov$/i, '')` and nothing
else, while `server/src/utils/projectStats.ts:149` counts `'.mp4' || '.mov'` as recordings and every shadow
file is `.mp4` (`server/src/utils/renameRecording.ts:134`). `CLAUDE.md` documents the convention as
"`.mov/.mp4`".

The test suite **codifies the flaw instead of catching it** — note the title contradicts its own assertions:

```ts
// shared/naming.test.ts:54-64
it('should handle .mp4 extension by returning null (only .mov is stripped)', () => {
  const result = parseRecordingFilename('05-3-intro.mp4');
  expect(result).not.toBeNull();          // ← not null
  expect(result?.name).toBe('intro.mp4'); // ← extension baked into the name
});
```

Because the shared parser returns less than callers need, the convention gets re-parsed by hand
**19 times** with independent regexes:

```
server/src/utils/chapterRecording.ts:503   /^(\d{2})-(\d+)-(.+)\.mov$/
server/src/utils/chapterExtraction.ts:146  /^(\d{2})-(\d+)-(.+)\.txt$/
server/src/routes/transcriptions.ts:774    /^(\d{1,2})-(\d+)-(.+)\.txt$/   ← different chapter rule again
server/src/utils/poemWuiUtils.ts:109       /^(\d{2})-\d+-([a-z][a-z0-9-]*?)(?:-[A-Z]+)*\.[a-z0-9]+$/
server/src/utils/scanning.ts:40 · renameRecording.ts:111,112,163 · relay.ts:245
query/export.ts:203,214 · query/chapters.ts:46,59 · transcriptions.ts:656
client/src/components/shared/PreviewPanel.tsx:37
```

…plus a further **16** `split('-')` re-derivations, several of which exist purely to recover the dropped
tail, e.g. the *identical* line appearing on both sides of the wire:

```ts
client/src/components/RecordingsView.tsx:990   const nameAndTags = base.split('-').slice(2).join('-');
server/src/routes/manage.ts:1587              const nameParts   = base.split('-').slice(2).join('-');
```

### The project code was never named at all

`{letter}{2 digits}-{name}` (`b64-my-project`) is a first-class concept — it appears in project folders,
relay paths and the query API. `shared/naming.ts` appears to model it:

```ts
// shared/naming.ts:55-58
export const PATTERNS = {
  CHAPTER: NAMING_RULES.chapter.pattern,
  SEQUENCE: NAMING_RULES.sequence.pattern,
  PROJECT_CODE: NAMING_RULES.name.pattern,   // ← this is just kebab-case; it does NOT encode `b64-`
};
```

`PROJECT_CODE` is an alias for the generic name pattern. It matches `hello-world` and does not require the
prefix at all. Nothing imports it. So the real rule is re-derived in four places, in three different forms:

```
client/src/utils/projectFilters.ts:7        /^[a-zA-Z]\d{2}-(.+)$/
client/src/components/ProjectDeleteModal.tsx:56  /^[a-zA-Z]\d{2}-?/
client/src/components/ProjectDrawer.tsx:169      /^[a-zA-Z]\d{2}-?/
client/src/components/ProjectsPanel.tsx:48       /^[a-zA-Z]\d{2}(-|$)/     ← a 4th, local, "PROJECT_CODE_PATTERN"
server/src/routes/edit.ts:23                     projectCode.split('-')[0] ← a 5th rule, no validation at all
```

### Rebuild implication

Model the *whole* filename as one value object — `{ chapter, sequence, name, tags[], extension }` — with
`parse` / `format` as inverse operations and a round-trip property test. Extensions come from config, not a
literal. Give `ProjectCode` the same treatment: a named type with one parser and one formatter. Rule of
thumb for the rebuild: **if a `.split('-')` or a `\d{2}` regex appears outside the naming module, the
naming module's return type is missing a field.**

---

## Finding 5 — `shared/types.ts` is a feature ledger, not a domain model

```
exported declarations           : 148   (124 interface, 21 type, 3 const)
distinct requirement IDs cited  :  53   (FR-*/NFR-*/B*)  — 149 mentions in one file
names ending in "Response"      :  53   (36% of all named types)
names ending in "Request"       :   9
section-header comment blocks   :   8
```

The file is ordered by ticket, not by concept. Markers appear in the order they were built —
`B039, FR-147, B043, FR-147, B047, B050, FR-73, NFR-3, FR-73, FR-89, NFR-6…` — so the Relay types are split
across lines 7–95 and 210–260, and `FR-147` appears twice, 40 lines apart, with unrelated things between.

By name prefix, `types.ts` is really **eight subsystems in one file**:
Relay 23 · Chapter 12 · Storage 11 · Sync 9 · Project 7 · Query 6 · Edit 5 · Manifest 4 · Hold 4.

Combined with Finding 2's usage census (53% of the names are used by only one side, or neither), the honest
description is: `shared/types.ts` is where a type goes when nobody decided where it belongs.

### Rebuild implication

Split by bounded context — `shared/recording/`, `shared/project/`, `shared/relay/`, `shared/storage/` — and
separate the **domain model** (`Recording`, `Project`, `Chapter`, `ProjectStage`) from **wire DTOs**
(`…Request`/`…Response`), which should live with their endpoint contract, not in a global bag. A type used
by one side only does not belong in `shared/` at all.

---

## Finding 6 — `apiRegistry.ts` is documentation with the *shape* of enforcement

**What it is, proven:** a 1000-line array of 34 `ApiEndpoint` literals (id, method, path, params,
`exampleResponse?: any`) plus two helpers.

**Who consumes it — the complete list:**

```
client/src/components/ApiExplorer.tsx:3-8   API_ENDPOINTS, getEndpointGroups, getEndpointById
```

That is all. Verified negatives:

- **No codegen.** No `openapi`/`swagger` tooling anywhere (only two `docs/` mentions).
- **No runtime enforcement.** No server file imports it; routes are registered by hand in
  `server/src/index.ts`.
- **No test.** `grep -l "apiRegistry\|API_ENDPOINTS"` across every `*.test.ts`/`*.test.tsx` in the repo
  returns nothing.

`ApiExplorer` builds a URL from the registry and `fetch`es it (`ApiExplorer.tsx:139-160`), so it is a
**manual** try-it console — the registry is its content, not its verifier. If an endpoint is renamed,
nothing fails; the Explorer just 404s when a human clicks it.

**Measured drift:**

| | |
|---|---|
| `router.<verb>('…')` registrations in `server/src/routes` | **156** |
| endpoints described in `apiRegistry.ts` | **34** (22%) |
| last commit touching `apiRegistry.ts` | `14ff7c5`, **2026-02-13** — *"fix: resolve ESLint warnings"* (a lint pass, not content) |
| commits to `shared/types.ts` since then | **28** |
| whole route files added since then | **5** — `hold.ts`, `poem-wui.ts`, `relay.ts`, `storage.ts`, `sync.ts` |

The registry documents **zero** of the Relay, Sync, Storage or Hold API.

And the drift reaches the *machine-facing* contract the registry was built to publish. `/api/query/config`
— explicitly the "LLM-optimized read-only API" — hardcodes a stage vocabulary that no longer exists:

```ts
// server/src/routes/query/index.ts:43
stages: ['none', 'recording', 'editing', 'done'],
```

`ProjectStage` (`shared/types.ts:439`) has **ten** members; only `'recording'` overlaps.
`'none'`, `'editing'` and `'done'` are not valid values of the type. *I found no runtime consumer of that
field*, which is precisely why it survived — absence of breakage is not evidence of correctness.

### Rebuild implication

A registry that is not the thing the server routes *from* is a second copy of the truth, and second copies
lose. Either derive the route table from the registry (`for (const e of API_ENDPOINTS) router[e.method](…)`),
or generate the registry from the routes, or add a single test asserting set-equality between them. Any of
the three would have failed in February. None existed.

---

## Finding 7 — `paths.ts` stopped being the single source of truth around FR-111

`getProjectPaths()` is genuinely adopted — **103 call sites**. But it froze at 16 folders (`shared/paths.ts:11-29`,
last concept added: FR-111's `stateFile`), while the project layout kept growing. Folder names are still
hardcoded into `path.join` **74 times** in non-test server code:

```
'recording-shadows' : 20      ← never added to ProjectPaths
'recordings'        : 15
'edit-2nd'          :  5      ← never added
'-safe'             :  5      ← paths.safe exists
'-trash'            :  5      ← paths.trash exists
'recording-transcripts': 5    ← paths.transcripts exists
'assets' 4 · 'final' 3 · '-chapters' 3 · 'edit-1st' 3 · 'images' 2 · 's3-staging' 2 · 'thumbs' 1 · 'inbox' 1
```

There is now a **rival path table living inside a route handler** (`server/src/routes/system.ts:293-314`),
keyed off a *different* enumeration (`FolderKey`, 20 members, `shared/types.ts:1236`):

```ts
const folderMap: Record<FolderKey, string> = {
  recordings: paths.recordings,          //  delegates
  …
  shadows:    path.join(projectPath, 'recording-shadows'),   //  invents
  'edit-1st': path.join(projectPath, 'edit-1st'),            //  invents
  s3Prep:     path.join(paths.s3Staging, 'prep'),            //  invents
  chapters:   path.join(paths.recordings, '-chapters'),      //  re-derives paths.chapters !
};
```

The `chapters` line is the giveaway: `paths.chapters` is already exactly that value
(`shared/paths.ts:42`), computed three lines earlier in the same function. The author had the abstraction in
hand and rebuilt it anyway.

Meanwhile "a folder in a project" is enumerated **four** times with four vocabularies:
`ProjectPaths` keys (16, camelCase) · `FolderKey` (20, mixed `'edit-1st'` + `s3Staging`) ·
`RelaySubfolder` (3) · `EditFolderKey` (3). `'recordings'` and `'edit-1st'`/`'edit-2nd'` appear in three of
the four, independently.

### Rebuild implication

One folder registry: an enum of folder keys → a resolver `(key, projectRoot) => string`, plus metadata each
consumer needs (heavy/light, syncable, relay-eligible). `RelaySubfolder` and `EditFolderKey` become *subsets*
of that enum, not parallel literals. Route handlers must never contain a `path.join(projectRoot, '<literal>')`.

---

## Finding 8 — `shared/` never grew past four files, so cross-cutting logic forked

`shared/constants.ts` is 22 lines with four constants and **two importers in the whole repo**
(`client/src/hooks/useBestTake.ts:3`, `server/src/watcher.ts:6`). Nothing else was ever centralised — so
formatting, the most obviously shared concern in a UI+CLI app, forked:

**Byte formatting — three implementations.** `client/src/utils/formatting.ts:7` `formatFileSize`,
`client/src/utils/formatBytes.ts:4` `formatBytes`, `server/src/utils/formatters.ts:17` `formatSize`, plus
inline arithmetic at `client/src/components/ProjectDeleteModal.tsx:60`. `1024 * 1024` appears **15 times**
in non-test source, while `FILE_SIZE.MB` sits unused in `shared/constants.ts`.

**Size parsing — duplicated, with the duplication documented in a comment:**

```ts
// client/src/utils/formatBytes.ts:11
// B062: Parse human-readable size string to bytes (mirrors server diskUtils)
export function parseSizeString(s: string | null): number { … }
```
```ts
// server/src/utils/diskUtils.ts:57
export function parseSizeString(s: string | null): number { … }
```

Both are pure string→number. Neither has a reason not to live in `shared/`.

**`formatDuration` — two implementations that already disagree.**

```ts
// server/src/utils/formatters.ts:31
if (seconds === null || seconds === 0) return '-';     //  0s → "-"
```
```ts
// client/src/utils/formatting.ts:64
if (seconds == null) return '-';                       //  0s → "0:00"
```

Same name, same domain concept, different output for a zero-length recording — one shows `-`, the other
`0:00`. The server's version also has no `style` parameter. **Verified by reading both; I did not execute
them, and I did not check whether any screen renders both side by side.**

### Rebuild implication

`shared/` should hold every pure function whose inputs and outputs are plain data — formatters, parsers,
comparators, threshold logic — not just types. The test for "does this belong in shared?" is *"is it pure?"*,
not *"do both sides import it today?"*; the latter is circular, and it is how this repo ended up with
`shared/constants.ts` containing four constants and nothing else.

---

## What this audit does NOT establish

- **Runtime behaviour of the shipped client.** I proved Vite *resolves* to `shared/types.js`; I did not
  build the client and inspect the bundle, and I did not exercise the running app. A `resolve.alias` or
  plugin could in principle re-point it — I checked `client/vite.config.ts` and there is none, but I did
  not audit plugin internals.
- **Whether the six unsaveable Config fields ever *had* values on this machine.** The code path is proven;
  their absence from the live `config.json` is consistent with erasure *and* with never being set.
- **Socket event coverage.** My emit/listen set-difference is unreliable because `WatcherManager.ts:62`
  emits `config.event` dynamically. Events I listed as "emitted but never listened" or vice versa may be
  fine; I did not chase each one.
- **Whether the 8 "used by neither side" types are truly dead.** `grep -rlw` over `client/src` and
  `server/src` only; a dynamic or re-exported reference would be missed.
- **Endpoint-level registry accuracy.** I matched registry paths by tail-segment against `router.<verb>`
  literals. 30 of 34 matched; the 4 that did not are almost certainly mount-prefix artifacts
  (`router.use('/projects/:code/export', …)`), not deletions. The 34-vs-156 coverage ratio is the solid
  number; the 4 misses are not.
- **Route counts vs. reachable endpoints.** 156 counts `router.<verb>('…')` registrations, not distinct
  public URLs (sub-routers with `:params` mean the real URL count differs).
