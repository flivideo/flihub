# Adversarial verification — Client data layer, hooks, realtime

Reviewer: skeptic pass. Every number below was re-measured against the working tree
(branch `main`, dirty tree as of 2026-08-26). Nothing was taken on the first auditor's word.

**Outcome: 8 findings reviewed — 8 survive, 0 fully refuted.**
Corrections applied to 6 of them (severity, counts, or an over-reaching sub-claim).
The evidence discipline in the original audit was unusually good: 3 of the 8 findings had
*every single number exact*. Where I refuted, it was scope/severity/measurement, not substance.

---

## 1. Two live generations of "hold" — UPHELD, escalated

**Verdict: UPHELD. critical / certain** (auditor said *probable* — it is certain, and the
consequence is worse than described).

Verified:
- `server/src/routes/hold.ts:93` — `router.post('/:code/hold', ...)`
- `server/src/routes/storage.ts:185` — `router.post('/:code/hold', ...)`
- `server/src/index.ts:322` — `app.use('/api/projects', holdRoutes)`
- `server/src/index.ts:326` — `app.use('/api/projects', storageRoutes)`

I read the whole `hold.ts` handler (lines 93–177). It terminates on every path (`res.json` /
`res.status().json()` + `return`) and never calls `next()`. Express matches the first mounted
router that has a matching route. **`storage.ts:185` is dead code.**

**Escalation the first auditor missed.** This is not merely two coexisting generations — the
*new* UI drives the *old* engine:
- `client/src/components/shared/StoragePanel.tsx:27,66` imports `useHoldProject` from `useStorageApi`
- `client/src/hooks/useStorageApi.ts:77` → `buildMutation('hold', 'Held heavy files to T7')`
- `useStorageApi.ts:40-43` POSTs to `/api/projects/:code/hold` with **no body**

So pressing **Hold** in StoragePanel runs B064's `holdProject(projectDir, holdingRoot)` — a
whole-project rsync — not WU1's transactional two-pass heavy-subfolder hold documented at
`storage.ts:175-183`. The toast says "Held heavy files to T7". It did not hold heavy files;
it held everything. The response envelope also differs (`{success, data: HoldOperationResult}`
from hold.ts vs the `StorageMutationResponse` `{success, newState?}` the client is typed against),
so `data.newState` is `undefined` and the panel's state machine gets nothing back.

Two same-named client hooks confirmed:
- `client/src/hooks/useHoldApi.ts:31` — `export function useHoldProject()`
- `client/src/hooks/useStorageApi.ts:77` — `export const useHoldProject = ...`

Provenance confirmed by `git log --diff-filter=A`:
- `hold.ts` added `ddaed6a` 2026-04-08 (B064)
- `storage.ts` added `a3db182` 2026-04-14 (storage-panel WU1)

Two status models confirmed: `ProjectsPanel.tsx:127` reads `useHoldStatus(code)` →
`holdStatus.location` (`shared/types.ts:282-290`); StoragePanel reads `storageTree`.

**Could not establish:** whether the shadowing was ever noticed. `server/src/test/storageRoutes.test.ts`
exists and presumably exercises the storage handler directly (unit-level), which would pass while
the mounted app never reaches it — absence of a failing test here looks identical to correctness.

---

## 2. Realtime is not a layer — UPHELD, severity downgraded

**Verdict: UPHELD. high / certain** (auditor said *critical*; downgraded — see below).

Verified exactly:
- `client/src/hooks/useSocket.ts` is **315 lines** ✓
- 14 subscription sites in components ✓ (App.tsx 183/204/205/207, RecordingsView 523/526,
  InboxPage 68, ManagePanel 132, ChapterRecordingModal 30, AssetsPage 119, ThumbsPage 50,
  ProjectsPanel 548/550, WatchPage 242)
- Tab-scoped mounts ✓ — `useTranscriptsSocket` and `useProjectsSocket` mount ONLY at
  `ProjectsPanel.tsx:548,550`; `useThumbsSocket` ONLY at `ThumbsPage.tsx:50`; `useAssetsSocket`
  ONLY at `AssetsPage.tsx:119`; `useInboxSocket` ONLY at `InboxPage.tsx:68`
- Every cited `App.tsx` conditional-render line is **exact**: 727, 799, 811, 818, 825, 832,
  840, 848, 860 ✓
- `client/src/main.tsx:7` is `const queryClient = new QueryClient();` with no `defaultOptions` ✓
  (I printed the whole 15-line file) → `staleTime: 0` app-wide
- Duplicated handler block ✓ — the identical 6 `socket.on('regen:*')` registrations appear at
  `ManagePanel.tsx:179-192` and `shared/RegenToolbar.tsx:137-152`
- Third inline block ✓ at `TranscriptionsPage.tsx:79-83` (5 handlers, `transcription:*`)

**Corrected:** "11 named socket hooks" is **10**. `grep -c "export function use" useSocket.ts`
returns 10: `useSocket`, `useThumbsSocket`, `useAssetsSocket`, `useRecordingsSocket`,
`useProjectsSocket`, `useInboxSocket`, `useChapterRecordingSocket`, `useTranscriptsSocket`,
`useRelaySocket`, `useDeveloperSocket`. Nine of them are domain hooks + one base.

**Severity downgraded critical → high.** The auditor's own claim concedes "Nothing broke."
There is no user-visible defect here; the zero-`staleTime` default genuinely does cover it.
This is a rebuild lesson (subscribe once at the root; make invalidation a table, not a hook per
FR), not a live failure. Reserving *critical* for #1 keeps the ranking honest.

**Could not establish:** whether the app would actually show stale data if `staleTime` were
raised. That requires running it; I only traced code.

---

## 3. The hooks layer is not a boundary — UPHELD, one sub-claim corrected

**Verdict: UPHELD. high / certain.**

Every number re-measured and **exact**:
- `fetchApi` call sites: **89** (`grep -rn "fetchApi[<(]" client/src` minus the definition) ✓
- raw `await fetch(`: **56** across **25** files, **19** of them under `client/src/components/` ✓
- Per-file breakdown matches to the row: `useRelayApi.ts` 13, `useEditApi.ts` 6, `useSyncApi.ts` 4,
  `usePoemWuiApi.ts` 4, `useStorageApi.ts` 3, `RecordingsView.tsx` 4, `ManagePanel.tsx` 2,
  `TranscriptionsPage.tsx` 2, `TranscriptSyncPanel.tsx` 2, plus exactly **9** component files at 1 each ✓
- `API_URL` is imported by **19** component files ✓ — the escape hatch is real and widely taken

**Corrected: "three incompatible error contracts" is two, plus duplication.**
- `useApi.ts:8-21` — throws on `!res.ok` (React Query surfaces `isError`)
- `useStorageApi.ts:39-52` — deliberately never throws, returns `{success:false, error}` in the
  success channel; callers must branch on `data.success` (`useStorageApi.ts:65-70`)
- `RecordingsView.tsx:152-158` — **also throws on `!res.ok`**. It is a hand-copy of contract #1,
  not a third model.

Two genuinely incompatible models is still the finding: a component consuming both a storage hook
and any other hook has to handle failure two different ways for no reason the domain justifies.

---

## 4. 138 hand-written invalidations vs a helper with one consumer — UPHELD, three counts corrected

**Verdict: UPHELD. high / certain.**

Verified:
- **138** `invalidateQueries` calls ✓ across **21** files (20 production + `useInvalidateProjectStorage.test.tsx`)
- Docblock at `useInvalidateProjectStorage.ts:1-11` quoted **verbatim correctly**, including
  "Calling a bespoke list in each mutation is how we missed an invalidation last round"
- Production consumers: **exactly one** — `useStorageApi.ts:60` ✓ (the only other references are
  the test, a mock in `StoragePanel.test.tsx:47`, and two comments)
- `useHoldApi.ts` — all five mutations (`useHoldProject`, `useVerifyHolding`, `useDeleteLocal`,
  `useRestoreFromHolding`, `useDeleteHolding`) hand-write a 3-key list
  (`holdStatus`/`projectDisk`/`archiveInventory`) and **none** invalidate `storageTree` or
  `storageActivity` ✓ — so a Hold done from the old path leaves the StoragePanel tree stale
- `QUERY_KEYS.chapterStatus` (`queryKeys.ts:29`) referenced **nowhere** outside its declaration ✓

**Corrected (three measurement errors, all minor, all in the auditor's favour to fix):**
1. Registry size is **46** keys, not 45 (`grep -c "^  [a-zA-Z]" queryKeys.ts`).
2. `nextImageOrder` is **wrongly** on the never-invalidated list. `useAssetApi.ts` invalidates
   `QUERY_KEYS.nextImageOrderPrefix` (`['assets','next-order']`) at lines 81, 122, 150, 172, 201,
   and React Query invalidation is prefix-matching, so `['assets','next-order',ch,seq]` **is**
   covered. The never-invalidated list is **9**, not 10: `prompt`, `thumbZipContents`, `transcript`,
   `combinedTranscript`, `finalMedia`, `transcriptSync`, `inboxFile`, `watchers`, `chapterStatus`.
3. Literal-array keys: **19** occurrences, not 20 — but **10** distinct key families, not 9.
   The auditor missed `invalidateQueries({ queryKey: ['hold-status'] })`, a bare-literal *prefix*
   invalidation that bypasses the `QUERY_KEYS.holdStatus(code)` factory it is meant to match.
   That one is the sharpest example of the finding: even the registry's own key gets hand-typed.

---

## 5. apiRegistry.ts documents 22% of the API, enforced by nothing — UPHELD, severity downgraded

**Verdict: UPHELD. medium / certain** (auditor said *high*).

Verified:
- `shared/apiRegistry.ts` is **1000** lines ✓
- **34** endpoints ✓ — but via `grep -c "method: '"`. The auditor's stated basis (`34 path: '` entries)
  is wrong: `path: '` returns **38** (four are `type: 'path'` parameter descriptors). Right number,
  wrong measurement.
- Server handlers: **156** `router.<verb>(` under `server/src/routes/**` ✓, and **0** direct
  `app.<verb>(` registrations — so 156 is the whole surface. 34/156 = **21.8%** ✓
- Client `/api/...` string + template literals: **91** ✓
- Importers: **exactly one** — `client/src/components/ApiExplorer.tsx:8` ✓
- No drift test: `client/src/test/` (12 files) and `server/src/**/*.test.ts` contain zero references
  to `apiRegistry` ✓
- The file's own header (`apiRegistry.ts:1-4`) reads "Metadata for **all** FliHub REST API endpoints" —
  it claims the completeness it does not have ✓

**Severity downgraded high → medium.** This misleads a developer reading ApiExplorer; it cannot
corrupt data or break a user flow. The rebuild lesson is real (generate routes from the registry,
or delete it) but it does not belong beside #1.

---

## 6. Zero optimistic updates, reads fan out per row — UPHELD, one count REFUTED

**Verdict: UPHELD. medium / certain — with the headline number corrected downward.**

**REFUTED: "90 mutations".** The real count is **72**:
`grep -rn "useMutation({" client/src` → 69, plus 3 generic-typed sites
(`usePoemWuiApi.ts:52,83,103`). The auditor's 90 appears to double-count import lines. A 25%
overcount on the finding's own headline number.

Everything else is **exact**:
- `useQuery` sites: **51** ✓ (42 `useQuery({` + 9 `useQuery<`)
- `onMutate`: **0** ✓ · `cancelQueries`: **0** ✓
- `setQueryData`: **1** ✓, at `useProjectDiskApi.ts:21`, and I confirmed it is bulk-response cache
  seeding, not an optimistic write
- `refetchInterval`: **14** ✓ · `staleTime`: **6** ✓ (6 of 51 queries)

Per-row fan-out confirmed:
- `ProjectsPanel.tsx:119` declares `HoldBadge`; `ProjectsPanel.tsx:881` renders it **inside the
  project table row**, and `ProjectsPanel.tsx:127` calls `useHoldStatus(code)` there.
- `getHoldStatus` (`server/src/utils/holdUtils.ts:250`) runs `getDirStats` over three relay
  subfolders (`holdUtils.ts:273-277`) using the recursive walker at `holdUtils.ts:47-62`.
  So each rendered row triggers a recursive filesystem walk server-side.
- `RecordingsView.tsx:135` per-recording `transcriptionStatus(filename)` query with
  `refetchInterval` returning `10000` while queued/transcribing (`RecordingsView.tsx:145`) ✓
- `useSocket.ts:247-255` (`useTranscriptsSocket`) invalidates `recordings`, `projects`,
  `transcriptions` and is indeed **blind** to `transcriptionStatus(filename)` and
  `transcript(filename)` ✓ — which is precisely why the per-row poller has to exist.

**Could not establish:** whether the per-row hold-status walk is actually slow in practice.
Cost depends on relay folder size, which I did not measure. The *structure* is confirmed;
the performance impact is not.

---

## 7. The pending-recordings queue lives outside the data layer — UPHELD

**Verdict: UPHELD. medium / certain.**

Every citation verified:
- `server/src/index.ts:95` — `const pendingFiles: Map<string, FileInfo> = new Map();` — unpersisted ✓
- `server/src/index.ts:123` — `io.emit('file:new', file)` inside `onNewFile` ✓
- `server/src/index.ts:335-338` — on `connection`, `pendingFiles.forEach(f => socket.emit('file:new', f))` ✓
- `client/src/hooks/useSocket.ts:24` — `const [files, setFiles] = useState<FileInfo[]>([])` ✓,
  mutated at :49 (`file:new`), :60 (`file:renamed`), :66 (`file:deleted`)
- `client/src/hooks/useSocket.ts:84-86` — exported `removeFile` mutating that state directly ✓
- `server/src/routes/index.ts:154-158` — `GET /api/files` exists ✓
- `grep -rn "api/files" client/src` → **0** ✓ — the reconciliation read is never taken

**Addition the first auditor stopped short of.** The reconnect replay at `index.ts:335-338` is
**additive only**, and the client's `file:new` handler dedupes by path (`useSocket.ts:47-49`)
without ever clearing `files`. There is no removal signal on reconnect. So a file removed
server-side while the socket was down stays on the client's list until a page reload. That is
the concrete failure the "no reconciliation read" claim implies, and `GET /api/files` — which
already exists and is never called — is exactly the fix that was built and not wired.

App.tsx `removeFile` consumers are at 183, 253, 268, 277, 280, 285, 287, 770 (auditor cited
183, 253, 262, 274, 284, 421, 634, 764 — several off by a few lines; substance unaffected).

---

## 8. Preview and write use different sanitisers — UPHELD and upgraded; build-artifact sub-claim narrowed

**Verdict: UPHELD. high / certain** (auditor said *medium / probable*).

The divergence is real and I traced a concrete disagreeing input.

- `client/src/utils/naming.ts:4-23` — `buildPreviewFilename` inlines
  `.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')` ✓
- `shared/naming.ts:327-335` — `sanitizeName` uses `[^a-z0-9.-]` (**keeps periods**), then
  `.replace(/-+/g,'-')`, `.replace(/^-|-$/g,'')`, `.slice(0, NAMING_RULES.name.maxLength)` ✓
- `shared/naming.ts:340` — `buildRecordingFilename` calls `sanitizeName` ✓
- The write path is server-side: `server/src/routes/index.ts:211` calls `buildRecordingFilename`;
  also `manage.ts:149,1224,1357,1383,1416,1655,1684` ✓
- The preview path is the one the user reads before confirming: `NamingControls.tsx:115,321` and
  `FileCard.tsx:146` ✓

**Concrete divergence — name `"v2.0 intro"`:**
- preview renders `01-1-v20-intro.mov` (the `.` is stripped by `[^a-z0-9-]`)
- server writes `01-1-v2.0-intro.mov` (`sanitizeName` keeps periods)

Second case — `"a -- b"`: preview → `a---b`; write → `a-b` (hyphen-run collapse).
This is why I upgraded to *certain*: it is not a theoretical drift, it is a WYSIWYG violation on
the app's single most-used screen. Upgraded to *high* on the same grounds — the rename confirmation
is FliHub's core interaction, and the preview is the only thing the user checks before committing.

**Third copy the auditor missed:** `client/src/components/AssetsPage.tsx:85` declares its *own*
local `function buildPreviewFilename(...)`, used at `AssetsPage.tsx:391`. Three implementations
of one concept, two of them client-local.

Also confirmed: `client/src/hooks/shared/` and `client/src/utils/shared/` are empty directories ✓;
`git ls-files shared/` lists `constants.js`, `naming.js`, `paths.js`, `types.js` and four `.d.ts`
alongside their `.ts` sources ✓; `git check-ignore` confirms they are tracked, not ignored ✓.
`shared/naming.ts` has **28** `^export ` statements (23 of them functions) — the auditor's "28
functions" is 28 *exports*; count right, label wrong.

**NARROWED: the "stale .js shadows the .ts" sub-claim.** I chased this and it is a real mechanism
but a *latent trap*, not a live bug — the auditor asserted the hazard without checking whether
anything crosses it.

- The mechanism is real. `client/vite.config.ts` sets no `resolve.extensions`, so Vite's default
  applies and **`.js` is tried before `.ts`**. Client code imports `'../../../shared/types'`
  extensionless (0 imports use `shared/types.js`). So a value import would resolve to the
  checked-in `shared/types.js`.
- The staleness is real and I proved it. `shared/types.js` last changed in `8d0d5f8` (2026-02-13);
  `shared/types.ts` last changed in `ba8a440` (2026-04-14). `shared/types.ts:469-480` has a
  10-entry `STAGE_LABELS` including `shelved` and `remix` (FR-149). `grep "shelved\|remix"
  shared/types.js` returns **nothing** — the tracked `.js` still has the old 8-entry map.
- **But nothing currently crosses it.** Every client import of `shared/types` is `import type`
  (erased at build) except **one**: `NamingControls.tsx:4` imports `DEFAULT_TAGS`. That constant is
  identical in both files. `STAGE_LABELS` and `DEFAULT_PROJECT_STAGES` are not value-imported in
  `client/src` at all (grep returns 0). And `shared/naming.js` is currently *in sync* with
  `shared/naming.ts` (same commit `8d0d5f8`; I verified the `[^a-z0-9.-]` regex matches at
  `naming.js:255`).
- The server is unaffected: `server/tsconfig.json` has `rootDir` commented out and imports use
  explicit `'../../shared/types.js'`, so `tsc` compiles `shared/*.ts` into `server/dist/shared/`
  and the built server never loads the tracked `.js`.

So: one loaded gun, one bullet, currently pointed away. Worth fixing (delete the artifacts, add
`shared/*.js` to `.gitignore`) but I will not let it be reported as a live defect.

---

## Summary of corrections made to the original audit

| # | Finding | Action |
|---|---|---|
| 1 | hold collision | **Escalated** probable → certain; found the live consequence (StoragePanel's Hold runs the wrong engine) |
| 2 | realtime not a layer | Severity **critical → high**; "11 socket hooks" → **10** |
| 3 | hooks not a boundary | "three error contracts" → **two** (third is a copy of the first). All 56/25/19 counts exact. |
| 4 | 138 invalidations | 45 keys → **46**; never-invalidated 10 → **9** (`nextImageOrder` *is* covered by the prefix key); literal families 9 → **10** (missed `['hold-status']`) |
| 5 | apiRegistry | Severity **high → medium**; endpoint count right but measured via the wrong grep |
| 6 | no optimistic updates | **"90 mutations" REFUTED → 72.** Every other number exact. |
| 7 | pending queue | Upheld as written; **added** the reconnect-replay-is-additive-only failure |
| 8 | two sanitisers | **Escalated** medium/probable → high/certain (traced a real divergent input, found a 3rd copy); **narrowed** the build-artifact shadowing to a latent trap after proving only 1 value import crosses it |

## What this verification does NOT establish

- Nothing here was observed at runtime. Every conclusion is a code trace. In particular #1's
  claimed behaviour (Hold moving the whole project) and #7's reconnect gap were derived by
  reading, not by running the app.
- Counts are of the working tree including uncommitted changes to `ProjectListToolbar.tsx`,
  `projectFilters.ts` and their test — none of which touch the files above.
- For #5, a registry that documents 22% of routes looks identical whether the other 78% are
  *undocumented* or *deliberately internal*. I did not classify the 122 missing routes.
