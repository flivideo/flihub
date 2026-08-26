# Era 1 — Genesis (2025-12-13 → 2025-12-18)

**Range audited:** `da12b868` (root) … `e3b98570` — 35 commits, 6 calendar days, one author (David Cruwys), 33 of 35 co-authored by Claude Opus 4.5.

**Method note:** the range given in the brief (`da12b868~1..e3b98570`) does not resolve because `da12b868` is the root commit. Everything below was read from `git log --reverse e3b98570`, which is exactly the same set.

---

## Headline

**Genesis was not the start of FliHub — it was the moment a two-week, ~16,000-line prototype was frozen into git in one commit, and the five days that followed proved every one of its foundational bets at once.** The core model chosen here is *the filesystem is the database and the filename is the primary key*. Everything in eras 2–6 is a consequence of that: no `Project` entity, no `Recording` entity, no ids, no migrations, no tests, and a UI whose only job is to keep re-deriving truth by re-scanning folders.

---

## Timeline narrative

### Day 0 — Dec 13, 19:54 — `da12b868` "Initial commit"

92 files, 22,962 insertions. This is **not** a scaffold; it is a finished app. `RELEASES.md` (written four days later, `4221c49b`) reconstructs what was inside it — seven pre-git versions built Nov 28 → Dec 12:

| Pre-git version | Theme | What it established |
|---|---|---|
| v0.1.0 (Nov 28–29) | Incoming → Recordings | Watch folder, `{chapter}-{sequence}-{name}-{tags}.mov`, good-take algorithm, `-trash/` |
| v0.2.0 (Nov 29) | Projects | b-code project folders, click-to-switch |
| v0.3.0 (Nov 29–30) | Recordings View | Chapter grouping, `-safe/` folder ("don't delete — move to safe") |
| v0.4.0 (Nov 30 – Dec 1) | Assets | `{chapter}-{seq}-{imgOrder}{variant}-{label}.{ext}`, Shift+Hover preview, `.txt` prompts |
| v0.5.0 (Dec 1) | Thumbnails | ZIP import, drag-to-reorder with auto-rename |
| v0.6.0 (Dec 3–5) | Transcription | Whisper queue, `recording-transcripts/` |
| v0.7.0 (Dec 6–7) | Query API | Read-only `/api/query/*` + `?format=text` ASCII for LLM/CLI consumption |

Measured at the commit: `server/src` 7,243 LOC / 20 files; `client/src` 7,977 LOC / 41 files; `shared/` 4 modules. Zero tests. Zero lint config. Zero requirement documents.

The commit already contains the app's hardest problem, solved the hard way: `server/src/utils/chapterExtraction.ts` is **779 lines** of trigram/Sørensen-Dice/Jaro fuzzy text matching that tries to locate each recording's opening words inside the *final edited* SRT so YouTube chapter timestamps can be recovered (`da12b868:server/src/utils/chapterExtraction.ts:1-24`). When that fails, `server/src/utils/llmVerification.ts` calls Claude to adjudicate (`da12b868:server/src/utils/llmVerification.ts:1-17`). This exists because FliHub hands raw segments to an external editor (Gling, then Jan) and gets a finished video back with **no identity carried across the boundary** — so the app has to *guess the mapping back*.

### Day 1 — Dec 14 — five feature commits and three refactors in seven hours

`8829f2f9` FR-59 Inbox, `8e241837` FR-64 file viewer + first shared modal, `14c64bda` rename "Recording Namer" → **FliHub**, `4108f9e0` FR-58 chapter concatenation (ffmpeg) + Mockups tab + `/po` `/dev` agent commands.

Then, in 84 minutes, three refactor commits: `81fda055` (NFR-65, extract tag parsing), `e9c2df4e` (NFR-66/67, hoist 15 response types to `shared/types.ts`, add `filesystem.ts` + `responses.ts`, replace "~25 silent catch {} blocks"), `e2ef9d01` (NFR-68, **split `query.ts` — 1,352 lines — into 8 modules** one day after it entered git).

`e2ef9d01` also lands FR-70 Watch Page and FR-69 header dropdowns. `server/src/routes/video.ts` is created with `const PROJECTS_ROOT = '~/dev/video-projects/v-appydave'` at module scope — the tenth copy of that literal.

### Day 2 — Dec 15 — the stage model, and the day two decisions were reversed

- **12:33** `360c432b` FR-74–78: dual TXT+SRT Whisper output, word-level transcript sync highlighting, chapter SRT with cumulative timing offsets. FR-78 rules that a transcript is "complete" only if **both** `.txt` and `.srt` exist (`360c432b:server/src/utils/scanning.ts` +`completeTranscripts`).
- **16:05** `9fb53c13` FR-80: the 8-stage project workflow replaces the old 4 stages, `DEFAULT_PROJECT_STAGES` + `STAGE_LABELS` added to `shared/types.ts`.
- **16:06** — **one minute later** — `4bc6130a` "Fix FR-80: Move stage constants to local definition. *Vite has issues importing runtime values from shared/types.ts.*" The constants are copy-pasted into `ProjectsPanel.tsx`.
- **16:53** `8a47d090` FR-82: "**Fix: Count .txt files as valid transcripts (was requiring both .txt AND .srt)**" — FR-78 is reverted **4 hours 20 minutes** after it shipped.
- **19:28** `0d71b486` FR-83 Shadow Recording System — 388 lines of ffmpeg 240p transcoding, a parallel `recording-shadows/` tree, unified scanning that merges real + shadow files, and three-state ghost indicators.
- **21:18** `23fb6cab` FR-88 rewrites the shadow merge ("shadows scanned first, real files overwrite") and **deletes both `.claude/handovers/` design documents**.

### Day 3 — Dec 16 — the Windows day: 15 commits, most of them path fixes

Jan (WSL/Windows collaborator) is now using the app. FR-89 (`9455f49d`) splits `projectDirectory` into `projectsRootDirectory` + `activeProject`, adds Windows/UNC validation, strips quotes from pasted paths. Then FR-89 part 2 (`b7762ff8`), FR-93 (`a3683d8e`), FR-97 (`7c2048ad`), FR-96 environment detection (`ec890181`), `50cc2fb8`, FR-106 WSL `wslpath -w` (`e7e221fa`), `9bba398e`. Interleaved: FR-92 "Transcribe All **regression** fix", FR-94/FR-98 Whisper output cleanup (twice), FR-99 telemetry, `a786bb62` (a compile fix shipped 35 minutes after the commit that broke it).

`cb4567db` adds `cleanupPort()` — the server now runs `lsof -ti:5101 | kill -9` **on its own startup** to clear orphans left by nodemon restart loops.

### Day 4 — Dec 17 — the edit workflow

`b8088b88` FR-101/102/103: First Edit Prep page (Gling filename + dictionary to clipboard) and S3 Staging page (PREP / POST / PUBLISH). Two new server route modules, two new client pages, a new `edits/prep`, `edits/publish` folder concept. Telemetry migrates JSON → JSONL. Then `bddf922a` / `4221c49b` invent the versioning system and back-fill 13 releases.

### Day 5 — Dec 18 — `e3b98570` "update documentation"

2,851 lines of docs in one commit: `api-reference.md` (899), `socket-protocol.md` (595), `architecture.md` (373), `troubleshooting.md` (396), `architecture-comparison.md` (541). The era ends by finally writing down what was built.

---

## Feature ledger

| Feature | Area | Req id | Evidence | Kbd/Visual |
|---|---|---|---|---|
| Watch folder → rename to `{chapter}-{seq}-{name}-{TAGS}.mov` | recordings | FR-1..21 (pre-git) | `da12b868:shared/naming.ts` | |
| Good-take / best-take suggestion | recordings | pre-git | `da12b868:client/src/hooks/useBestTake.ts` | ✔ heuristic badge |
| `-safe/` quarantine + `-trash/` | recordings | pre-git | `da12b868:shared/paths.ts:30-36` | |
| Shift+Hover large image preview (shared hook) | assets | pre-git | `da12b868:client/src/hooks/useShiftHover.ts:61-72` | ✔ hover |
| Thumbnail drag-to-reorder w/ auto-rename | thumbs | pre-git | `da12b868:client/src/components/ThumbsPage.tsx:145-158` | ✔ drag/drop |
| Thumbnail size toggle S/M/L/XL, persisted | thumbs | pre-git | `da12b868:client/src/components/ThumbsPage.tsx:175+` | ✔ |
| Transcription progress bar + status chips | transcripts | FR-52 | `da12b868:client/src/components/TranscriptionProgressBar.tsx:47-70` | ✔ progress bar |
| Chapter-match confidence icons + method badges | chapters | FR-34 | `da12b868:client/src/components/ProjectStatsPopup.tsx:12-50` | ✔ badges |
| Fuzzy chapter→SRT timestamp extraction | chapters | FR-34 | `da12b868:server/src/utils/chapterExtraction.ts` (779 LOC) | |
| LLM chapter verification (Anthropic SDK) | chapters | FR-34 | `da12b868:server/src/utils/llmVerification.ts` | |
| Read-only Query API + `?format=text` ASCII reports | query | FR-53 (pre-git) | `da12b868:server/src/utils/reporters.ts` | ✔ ASCII stats |
| Click-to-cycle project stage, **Shift+Click = backward** | projects | FR-32 | `da12b868:client/src/components/ProjectsPanel.tsx:206-218` | ✔ keyboard modifier |
| Inbox tab (raw/dataset/presentation) + live watcher | inbox | FR-59 | `8829f2f9` | |
| Inbox file viewer + shared `FileViewerModal` | inbox | FR-64 | `8e241837` | |
| Rename to **FliHub**; `>_` copy-path button | config | FR-62/63 | `14c64bda` | |
| Chapter recordings (ffmpeg concat per chapter) | chapters | FR-58 | `4108f9e0:server/src/utils/chapterRecording.ts` | ✔ `chapters:generating` progress socket |
| Mockups tab (HTML design explorations) | ui | — | `4108f9e0:client/src/components/MockupsPage.tsx` | |
| `/po`, `/dev`, `brainstorming-agent`, `context-for-chatgpt` commands | process | — | `4108f9e0:.claude/commands/` | |
| Header dropdown menus (project actions / settings cog) | ui | FR-69 | `e2ef9d01:client/src/components/HeaderDropdown.tsx` | ✔ click-outside + Escape |
| Watch page: HTML5 player + chapter panel + Range streaming | watch | FR-70 | `e2ef9d01:client/src/components/WatchPage.tsx`, `routes/video.ts` | |
| Query route split into 8 modules | query | NFR-68 | `e2ef9d01` (query.ts −1,216) | |
| Dual TXT+SRT Whisper output | transcripts | FR-74 | `360c432b` | |
| Word / phrase / none transcript-sync highlighting, click-to-seek, auto-scroll | transcripts | FR-75/77 | `360c432b:client/src/components/TranscriptSyncPanel.tsx:141-230` | ✔ visual sync + localStorage |
| Chapter SRT with cumulative timing offsets | chapters | FR-76 | `360c432b` | |
| 8-stage project workflow + auto-trigger planning→recording | stages | FR-80 | `9fb53c13` | ✔ stage badges |
| Project-list content indicators (inbox/assets/chapters) | projects | FR-80/82 | `9fb53c13`, `8a47d090` | ✔ icons + rich tooltips |
| Shadow recordings — 240p mp4 mirror tree | shadows | FR-83 | `0d71b486:server/src/utils/shadowFiles.ts` | ✔ 📹/📹👻/👻 three-state |
| Cross-platform setup guide | docs | FR-84 | `0d71b486:docs/cross-platform-setup.md` | |
| GitHub / Video-Projects links in cog menu | ui | FR-87 | `23fb6cab` | |
| Shadow fallback in recordings + Watch page | shadows | FR-88 | `23fb6cab`, `9455f49d` | ✔ ghost icon |
| `projectsRootDirectory` + `activeProject` config split; path validation ✓/⚠ | config | FR-89 | `9455f49d` | ✔ inline validity indicators |
| Configurable shadow resolution (240/180/160p) | shadows | FR-89 | `9455f49d` | |
| Active watchers list in Config panel | config | FR-90 | `5777a80c:server/src/WatcherManager.ts` `getWatcherInfo()` | ✔ green status dots |
| Video size toggle N/L (XL removed) | watch | FR-91 | `5777a80c` | ✔ |
| `config.json` → gitignore + `config.template.json` | config | — | `ffe906c4` | |
| `hasTranscriptFile()` + pending count ("Transcribe 3") | transcripts | FR-92 | `b7762ff8` | ✔ count badge |
| Recording/shadow size totals in header, shadow size tooltip | recordings | FR-95 | `a8fbc9bc` | ✔ stats |
| TXT/SRT toggle in transcript viewer | transcripts | FR-94 | `a8fbc9bc` | ✔ |
| Starred projects (📌 → ⭐), natural sort | projects | NFR-87 | `a8fbc9bc` | ✔ |
| Whisper output restricted to txt/srt/json; vtt/tsv deleted | transcripts | FR-98 | `ec890181`, `cb4567db` | |
| Transcription telemetry (duration, ratio, size) | telemetry | FR-99 | `ec890181:server/src/utils/telemetry.ts` | |
| Environment detection (macOS/Linux/WSL) + path-format warnings | config | FR-96 | `ec890181` | ✔ 🍎🐧🪟 |
| `/jan` collaborator agent | process | — | `cb4567db:.claude/commands/jan.md` | |
| Watch page prev/next segment **buttons** (no key bindings) | watch | FR-100 | `cb4567db:client/src/components/WatchPage.tsx` | ✔ nav (buttons only) |
| Port cleanup on boot + global error handlers + graceful shutdown | ops | — | `cb4567db:server/src/index.ts` `cleanupPort()` | |
| WSL `wslpath -w` translation for `explorer.exe` | ops | FR-106 | `e7e221fa` | |
| Success toasts for folder/file open | ui | — | `9bb950fa` | |
| First Edit Prep page (Gling filename + dictionary clipboard) | edit | FR-101/102 | `b8088b88:client/src/components/FirstEditPrepPage.tsx` | |
| S3 Staging page (PREP/POST/PUBLISH) | edit | FR-103 | `b8088b88:server/src/routes/s3-staging.ts` | |
| Telemetry JSON → JSONL | telemetry | FR-99 | `b8088b88` | |
| RELEASES.md + release process, 13 back-filled versions, git tags | docs | — | `bddf922a`, `4221c49b` | |
| api-reference / socket-protocol / architecture / troubleshooting docs | docs | — | `e3b98570` | |

---

## Dead ends

### 1. FR-78 "a transcript needs both .txt and .srt" — **lifespan 4h 20m**
Shipped 12-15 12:33 (`360c432b:server/src/utils/scanning.ts`, `completeTranscripts = txtFiles ∩ srtFiles`), reverted 12-15 16:53 (`8a47d090`, "Fix: Count .txt files as valid transcripts"). Re-decided twice more: FR-92 (`b7762ff8`, new `hasTranscriptFile()` checking `.txt` only) and FR-94 (`a8fbc9bc`, "Standardize transcript checks to use `.txt` only"). **Four rulings on one definition in 26 hours.** Root cause: "is this recording transcribed?" had no owner — it was re-derived independently in every module that needed it (20 sites at era end, see Pain Signals).

### 2. `DEFAULT_PROJECT_STAGES` duplicated into the client on a misdiagnosis — **lifespan 1 minute to create, months to live with**
`4bc6130a` (12-15 16:06) copies the stage constants into `ProjectsPanel.tsx` with the reason *"Vite has issues importing runtime values from shared/types.ts."* **That reason is contradicted by the same tree**: at that exact commit, `client/src/components/NamingControls.tsx:3` imports the runtime value `DEFAULT_TAGS` from `'../../../shared/types'` and works (`git show 4bc6130a:client/src/components/NamingControls.tsx`). *Uncertain:* I did not reproduce the original error, so a real but differently-caused failure (HMR cache, the `types.ts` / `types.js` / `types.d.ts` triple in one folder) cannot be ruled out — but the recorded cause is wrong, and the wrong cause is what got frozen into the code. **Fate:** superseded — no client file defines `DEFAULT_PROJECT_STAGES` at HEAD.

### 3. `AppError` / `asyncHandler` — **built day 0, never used, still never used**
`da12b868:server/src/middleware/errorHandler.ts` defines both; `da12b868:docs/patterns.md` §5 mandates both. Adoption count outside that one file: **0 at `da12b868`, 0 at `e3b98570`, 0 at HEAD.** 89 route handlers at era end, 156 at HEAD, every one hand-rolling `try/catch` + `res.json({ success: false, error })`. *Caveat:* `errorHandler` **is** registered (`e3b98570:server/src/index.ts:343`) and Express 5 forwards rejected promises, so it is not strictly unreachable — but nothing throws `AppError`, so the consistent error shape is maintained by copy-paste, not by mechanism. **Fate:** still-present-but-unused.

### 4. First Edit Prep + S3 Staging (FR-101/102/103) — the era's finale, later deleted
- `FirstEditPrepPage.tsx` / `first-edit.ts` → renamed to `EditPrepPage` / `edit.ts` on 2025-12-31 (`2b0d9d1`), so the *concept* survived under a new name.
- `S3StagingPage.tsx` / `s3-staging.ts` → **deleted 2026-03-22** (`21f4ebe`, "manage-relay-refactor wave 1 — B039 … **retire S3**"). Three months of life; replaced by the Relay system.
- Residue at HEAD: `s3Staging` is still a field in `ProjectPaths` (`shared/paths.ts`), still referenced by `finalMedia.ts:135` and `system.ts:304-306`.

### 5. `docs/architecture-comparison.md` — **lifespan one commit**
Created in `e3b98570` (541 lines, Storyline-vs-FliHub), deleted the same day by the next commit `8fa159f`. It is the only document in the era that names the design choice out loud: *"FliHub: Direct Event Broadcasting — single project, direct events `io.emit('recordings:changed')`"* vs Storyline's room-based multi-project sockets, with a decision table saying rooms win on "Multi-project support ✅ / ❌". FliHub chose direct. That analysis was deleted within hours of being written.

### 6. `.claude/handovers/` — the design record, deleted on purpose
`fr-70-video-watch-page.md` (165 lines) and `fr-83-shadow-recording-system.md` (208 lines) created 12-14/12-15, both deleted by `23fb6cab` under "Cleanup: Removed old handover docs". These were the *only* written specs for the Watch Page and the Shadow System.

### 7. `server/config.json` and `server/transcription-telemetry.json` committed as source
`config.json` — with David's absolute paths and a hand-maintained `projectPriorities` map — was tracked from day 0 and removed on 12-16 (`ffe906c4`). Telemetry data was committed on 12-16 (`50cc2fb8`, 90 lines of runtime job records) and deleted on 12-17 (`b8088b88`) when the format changed to JSONL.

### 8. Video size toggle `XL`
Added pre-git, removed by FR-91 (`5777a80c`) because "L/XL smaller than N" — and the commit had to add **localStorage validation for the removed `xl` value**, because per-component `localStorage` had no versioning or migration path.

### 9. Shadow files as `.txt` placeholders
`0d71b486`'s own commit message says *"Add shadow files (**.txt placeholders**) in recording-shadows/"* and `RELEASES.md` v0.11.0 records the learning *"Text shadows before video shadows: start simple, video shadows (240p) can come later."* The code in the same commit already produces 240p H.264 MP4 and its header explicitly lists *"Benefits over text shadows"* (`0d71b486:server/src/utils/shadowFiles.ts:1-14`). The `.txt` design was killed before it shipped; the commit message and the release notes both still describe it.

---

## Pivots

| From | To | Trigger | Evidence |
|---|---|---|---|
| "Recording Namer" — a single-purpose rename tool | **FliHub** — a project hub | Inbox + chapters + Watch made "namer" wrong | `14c64bda` (12-14 19:45), FR-62 |
| 4-stage lifecycle `none / recording / editing / done` | 8-stage `planning → recording → first-edit → second-edit → review → ready-to-publish → published → archived` | FR-80 formalises the real production pipeline | `9fb53c13:shared/types.ts` (`ProjectStage` union) |
| Single-machine, David-only, macOS | Two-machine collaboration with Jan on Windows/WSL | Jan onboarded ~12-15 | FR-83/84 (`0d71b486`), then 9 path commits on 12-16, `/jan` agent (`cb4567db`) |
| Shadows as text placeholders | Shadows as 240p transcoded video | Whisper needs audio; Watch page needs playback | `0d71b486:server/src/utils/shadowFiles.ts:1-14` |
| `projectDirectory` (one absolute path) | `projectsRootDirectory` + `activeProject` (root + code) | Path-per-user broke on Windows | FR-89 `9455f49d`, migration in `server/src/index.ts` |
| FliHub ends at "recordings are named" | FliHub owns the whole post-production handoff | Gling + Jan workflow needed staging | FR-101/102/103 `b8088b88` |
| Transcript "complete" = TXT **and** SRT | Transcript "complete" = TXT | FR-78 broke the progress numbers | `360c432b` → `8a47d090` |
| Verbal/ad-hoc requirements | `/po` agent writes handover docs to a `/dev` agent | `4108f9e0` adds `po.md` (285 lines); `ae0edd45` doubles it | `.claude/commands/po.md` |

---

## Pain signals

### A. "Where do projects live?" — the same literal in **10 modules** at era end (fix count: 1 partial)
`const PROJECTS_ROOT = '~/dev/video-projects/v-appydave'` — David's personal folder — appears as a module-scope literal in **12 server files** at `0d71b486`. FR-89 (`9455f49d`) added `projectsRootDirectory` to config to make it per-user. FR-97 (`7c2048ad`), titled *"Fix hardcoded project path in shadow generation"*, removed exactly **2 of 12** copies (`shadows.ts`, `system.ts`). At `e3b98570` **10 remain**: `projects.ts`, `transcriptions.ts`, `video.ts`, and all seven `query/*.ts` modules. There was no accessor, so each fix could only ever be local.

### B. Path handling across platforms — **9 commits in 48 hours**, and one fix applied to 1 of 8 sites
`9455f49d` (FR-89), `b7762ff8` (FR-89 pt2, `pathExists`→`stat`+catch for UNC), `a3683d8e` (FR-93), `7c2048ad` (FR-97), `ec890181` (FR-96), `50cc2fb8`, `e7e221fa` (FR-106 `wslpath`), `9bb950fa`, `9bba398e` — plus FR-113 in era 2 (`2b0d9d1`). FR-93's actual fix was to change `.split('/')` to the cross-platform `.split(/[/\\]/)` — and it changed **only `client/src/App.tsx`** (17 lines, one file). At `e3b98570` there are **16 sites** deriving a project code or filename from a path string; **only 2** (`App.tsx:219,228`) use the cross-platform split. `InboxPage.tsx:51`, `MockupsPage.tsx:154`, `ProjectsPanel.tsx:317`, `WatchPage.tsx:199`, `useSocket.ts:61,71`, `AssetsPage.tsx:371`, `FileCard.tsx:73`, `query/projects.ts:107,184`, `system.ts:339` all still hardcode `/`.

### C. "What is a transcript?" — **20 independent re-derivations**, 4 rulings
`f.endsWith('.txt') && !f.endsWith('-chapter.txt')` is written out longhand in 20 places at `e3b98570` (`routes/index.ts:836,864`, `projects.ts:219`, `query/chapters.ts:59`, `query/export.ts:100,157,209`, `query/recordings.ts:68`, `query/transcripts.ts:55,138,149`, `utils/chapterExtraction.ts:144`, `utils/scanning.ts:29`, …). Several of them round-trip through `.replace('.txt', '.mov')` to re-parse the name — which silently assumes every recording is `.mov`, in a codebase that had introduced `.mp4` shadows five days earlier.

### D. Duplication outruns extraction — **4 dedupe commits in 5 days**
`81fda055` NFR-65 (tag extraction × 4 sites), `e9c2df4e` NFR-66/67 (15 response types + ~25 silent catches), `2ce974320` NFR-79 (`toKebabCase` × 2), `e2ef9d01` NFR-68 (1,352-line file → 8). And it did not hold: `b8088b88`'s brand-new `first-edit.ts` and `s3-staging.ts`, written 3 days after NFR-67, use **none** of `getProjectPaths`, `readDirSafe`, `statSafe`, `expandPath`, or `sendErrorResponse` — they hand-roll all of it (`b8088b88:server/src/routes/s3-staging.ts:20-45`, `first-edit.ts:20-45`).

### E. The server writes runtime state into its own source tree — **4 stabilisation commits**
`CONFIG_FILE = path.join(__dirname, '..', 'config.json')` (`da12b868:server/src/index.ts:29`, unchanged at HEAD line 48) and `transcription-telemetry.json(l)` both live inside `server/`, which nodemon watches. Consequences, in order:
1. `4108f9e0` — `nodemon --ignore config.json` "to prevent restart loops"
2. `cb4567db` — nodemon ignores telemetry files, **plus** `cleanupPort()` running `lsof -ti | kill -9` at boot, **plus** global error handlers "to prevent silent crashes"
3. `50cc2fb8` — a full `nodemon.json` ignoring `*.json`, `*.log`, `*.data`
4. `b8088b88` — `docs/operations/server-stability-issues.md` (169 lines) + `docs/dev-tools/nodemon.md` (85 lines)

`cleanupPort()` is still in `server/src/index.ts:51-77` today.

### F. `saveConfig`'s hand-maintained field whitelist
`da12b868:server/src/index.ts:96-118` builds `toSave` by listing each field by hand. Every config feature in the era had to remember to edit it (FR-89's migration is bolted into `loadConfig` at lines 69-88). This is the direct ancestor of era-2's FR-107 "Fix config save" and FR-131 "config.json malformed commonNames".

### G. Zero tests, zero lint, for the entire era — and for two more months
No `*.test.ts`, no vitest/jest/eslint/prettier config exists at any commit in this range (`git ls-tree -r e3b98570` — nothing matches). The first test lands **2026-02-13** (`d2e9653`). Every flip-flop above (FR-78/82, FR-92 "regression fix", `a786bb62`'s `await`-in-a-non-async-function shipped and fixed 35 minutes apart) is what that absence looks like.

### H. 874 dangling requirement references
98 distinct `FR-nn` / `NFR-nn` ids are cited **874 times** across `server/src`, `client/src` and `shared/` at `e3b98570`. **Not one of them resolves to a document in the repo** — `docs/backlog.md` and `docs/prd/` do not exist until `8fa159f`, the commit immediately after this era.

---

## Architectural moments

### 1. The filename is the primary key
`shared/naming.ts` (`da12b868`) is 500 lines of parse/build/validate/compare over `{chapter}-{sequence}-{name}-{TAGS}.mov` and `{chapter}-{seq}-{imgOrder}{variant}-{label}.{ext}`. There is no id anywhere. Chapters, sequences, variants, tags, image ordering, asset↔segment linkage and sort order are all *encoded in the string*, and every consumer re-parses it.
**Consequence for everything after:** renaming a file is a schema migration. `renameShadowFile`, `moveShadowFile`, and the transcript rename in `routes/index.ts:864` all exist to keep four parallel trees (`recordings/`, `recording-shadows/`, `recording-transcripts/`, `-chapters/`) in lockstep by string surgery. Extension is baked in: `parseRecordingFilename` strips `/\.mov$/i` (`shared/naming.ts`) and `buildRecordingFilename` appends `'.mov'` — hard-coded, while shadows are `.mp4`.

### 2. `npm workspaces` declared, relative imports used
`package.json` lists `["client","server","shared"]`, but **neither `client/package.json` nor `server/package.json` depends on `shared`**, and nothing imports `'shared/...'` by package name — every consumer reaches it by `'../../../shared/types'`. **13 client files** at `da12b868`, **66 files** at HEAD. `shared/` is published as three parallel artifacts (`types.ts` + hand-committed `types.js` + `types.d.ts`) because the server tsconfig has `rootDir: ./src` and cannot compile a sibling folder.
**Consequence:** the shared layer can carry types reliably but runtime values only by convention and manual `.js` sync — which is what `4bc6130a` mistook for a Vite bug, and what forced the stage-constant duplication.

### 3. Sockets are cache-busters, not events
`WatcherManager.startWatcher` emits with **no payload** and a suppressed type error: `// @ts-expect-error - dynamic event emission` / `this.io.emit(config.event)` (`da12b868:server/src/WatcherManager.ts:60-62`). Two dialects coexist from day 0: payload-carrying (`file:new`, `transcription:*`) and payload-free (`recordings:changed`, `projects:changed`, `assets:*-changed`). 16 events at `da12b868`, 20 at `e3b98570`, ~46 at HEAD.
**Consequence:** the client can never apply a delta — every notification means "invalidate and refetch the whole folder". No optimistic updates, no ordering guarantees, and the socket contract is the one place TypeScript was explicitly told to look away.

### 4. Global broadcast, no rooms, one active project
`io.emit(...)` is unscoped; the server holds exactly one `currentConfig.projectDirectory`; `pendingFiles` is a module-level `Map` in RAM (`da12b868:server/src/index.ts:45`). FliHub's own (deleted) `architecture-comparison.md` names this explicitly as the alternative to Storyline's `socket.join('project:'+name)` and marks "Multi-project support ❌".
**Consequence:** *the app is a single-project machine with a project list bolted on top.* "Which project?" is server-global mutable state, so any browser tab, any API caller, and any watcher share one answer. Every later feature that wants to act on a non-active project (`openFolder({folder, projectCode})` in FR-83; the whole `/api/query/projects/:code/*` tree) has to route around it.

### 5. Project identity is a path string, matched by string equality
There is no `Project` type. Project code = last path segment; "am I the active project?" = `config.projectDirectory === p.path || config.projectDirectory === p.path + '/'` (`da12b868:client/src/components/TranscriptionProgressBar.tsx:17-20` — note the trailing-slash arm). Per-project state (`projectPriorities`, `projectStages`, `projectStageOverrides`) lives as maps keyed by code inside the **global server config**.
**Consequence:** FR-89's `activeProject` split, FR-93, `9bba398e` ("header showed a project name even when none was selected because `projectDirectory` always has a fallback"), and 16 ad-hoc code-derivation sites are all the same missing type. Era 2's FR-111 finally introduces `.flihub-state.json` per project (`stateFile` in `ProjectPaths` at HEAD) — that is the correction of *this* decision, made six weeks later.

### 6. `getProjectPaths()` — a flat, closed set of folder names in a shared module
`da12b868:shared/paths.ts` returns 10 fixed keys; `docs/patterns.md` §1 says ***"Never construct paths manually with `path.join()`."*** Adoption is genuinely good (79 call sites at era end, 106 at HEAD) — but the abstraction is closed: every new folder concept requires editing the shared module, and the ones that skipped it stayed skipped. `recording-shadows/` — the biggest new folder of the era — was **never added**, and is re-derived by hand at `WatcherManager.ts:151`, `storageTree.ts:23`, `renameRecording.ts:92` today. `edits/prep`, `edits/publish` (FR-102/103) never entered it either. `projectStats.ts` bypasses it with raw `path.join` in the day-0 commit — the same commit that wrote the rule.

### 7. No identity survives the edit boundary
FliHub names segments; an external editor (Gling, then Jan) produces `final/*.mp4` + `.srt`; FliHub then has to reconstruct the mapping. Its answer is 779 lines of trigram/Dice/Jaro similarity plus an LLM tiebreak (`chapterExtraction.ts`, `llmVerification.ts`). Confidence percentages, `matched / low_confidence / not_found` statuses and manual override UI (`ProjectStatsPopup.tsx`) all exist to manage the uncertainty this creates.
**This is the single most expensive structural choice in the era** — not because the matching is bad, but because the problem is self-inflicted.

### 8. Routes as closure-injected factories; no service layer
`createRoutes(pendingFiles, config, updateConfig, queueTranscription)` — dependencies passed positionally into `createXRoutes(getConfig)` factories. `server/src/` has `routes/` and `utils/` and no `services/`. Domain logic (rename, shadow generation, transcription queue, chapter concat) is either inline in a route handler or in a free function in `utils/`.
**Consequence:** business rules are reachable only through HTTP. The first tests, two months later, had to test *routes* (`server/src/test/projectDeleteRoute.test.ts` mocks five util modules to get at one behaviour).

### 9. Hash-based tab routing, with the tab union duplicated
`getTabFromHash()` + `VALID_TABS` in `App.tsx` (`e3b98570:client/src/App.tsx:28-39`); no router. The `ViewTab` union is declared **twice** at era end — `App.tsx:28` and `ProjectsPanel.tsx:26` — because FR-80 needed the type for its `onNavigateToTab` prop and importing across components was avoided. `App.tsx` grows 597 → 765 lines across the era, 922 at HEAD; tabs 10 → 12.

### 10. UI state is per-component `localStorage`, unversioned
17 `localStorage` call sites at era end across `AssetsPage`, `TranscriptSyncPanel`, `WatchPage` — each with its own key constant, no shared store, no schema, no migration. FR-91 had to hand-write a validator for a removed enum value (`'xl'`).

### 11. Requirement ids as the only design record
874 `FR-nn` citations in code, no requirements repo, and the two real handover documents deliberately deleted (`23fb6cab`). `RELEASES.md` was then written *from the specs rather than the code* — which is why v0.11.0 confidently records a `.txt` shadow design that never shipped.

---

## What a rebuild should learn from this era

1. **Give things ids before you give them names.** A `Recording` with a stable id + a *derived* display filename removes: the four-tree rename dance, the `.mov`/`.mp4` coupling, the 20 re-derivations of "is it transcribed", the fuzzy chapter matcher, and the 16 path-string parsers. This is the one change that dissolves the most findings.

2. **Make `Project` a first-class entity with per-project state on disk.** The era's single biggest recurring cost is that "the project" was a mutable global path string. Era 2's `.flihub-state.json` is the right shape — start there, not six weeks in.

3. **Decide the multi-project question on day 0.** The deleted `architecture-comparison.md` had the answer written down: rooms if multi-project, direct emit if single. FliHub chose direct emit *by default*, then spent every subsequent era working around it. Socket rooms (or any per-project channel) cost nothing up front.

4. **Emit facts, not "something changed".** `io.emit('recordings:changed')` with no payload is a refetch trigger wearing an event's clothes — and note that it required `@ts-expect-error` to write. If the type system has to be silenced to emit an event, the event shape is wrong.

5. **A shared package must be a real package.** Name it, depend on it, build it, import it by name. Three parallel artifacts (`.ts`/`.js`/`.d.ts`) in one folder plus 66 relative-path traversals is what produced the one wrong diagnosis in the era that is still visible in the code.

6. **Runtime state never lives inside the deployable.** `config.json` and telemetry inside `server/` caused nodemon restart loops → orphaned processes → a `kill -9` at boot that is still shipping. Put mutable state in a user data dir on day 0.

7. **Conventions need a mechanism, not a doc.** `docs/patterns.md` said "never `path.join`" and "use `asyncHandler`". `AppError`/`asyncHandler` adoption has been **0%** for eight months; the newest routes in the era ignored every helper written three days earlier. A lint rule, a base handler, or a single `db.recordings()` accessor would have held where prose did not.

8. **Version the contracts you publish.** `/api/query/config` has advertised `stages: ['none','recording','editing','done']` since 2025-12-14 and **still does at HEAD** (`server/src/routes/query/index.ts:43`), while the real model is now ten stages including `shelved` and `remix`. *I found no runtime consumer of that field* — only `shared/apiRegistry.ts` and docs — so nothing failed, which is precisely why it drifted for eight months. Absence of breakage is not evidence of correctness.

9. **Something has to hold the requirement.** 98 FR ids, 874 citations, zero documents, and the two real design docs deleted as "cleanup". A rebuild that re-uses FR numbers must keep the specs in-repo from commit one — otherwise the ids are decoration.

10. **Tests are what let you reverse a decision cheaply.** FR-78 was reversed in 4 hours and re-decided twice more; FR-92 was a "regression fix". None of that was detectable. The first test arrives two months and ~30,000 lines later.

11. **Keep the interaction primitives, and finish them.** The era's good ideas are the small ones: Shift+Hover preview, Shift+Click to cycle a stage backwards, drag-to-reorder with auto-rename, click-a-word-to-seek, the three-state 📹/📹👻/👻 indicator, `getWatcherInfo()` green dots. But `useShiftHover` had a `@deprecated` legacy path on day 0 and `ThumbsPage.tsx:160-165` re-implements it inline rather than using it; FR-100's prev/next never got arrow keys. Build one interaction layer, then make everything use it.

---

*Report generated from direct reading of all 35 commits in `da12b868..e3b98570`, plus HEAD-state verification of survival, adoption counts, and contract drift. Claims marked "uncertain" were not reproducible from the repository alone.*
