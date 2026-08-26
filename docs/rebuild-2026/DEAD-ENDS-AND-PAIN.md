---
title: Dead Ends, Pivots and Pain Signals
created: 2026-08-26
source: 6 commit-archaeology agents over all 203 commits (2025-12-13 → 2026-04-16)
purpose: B475 — "you'll probably see the dead ends, the stuff that we went out and built and never really used"
---

# Dead Ends, Pivots and Pain Signals

Every row below was read out of the actual commits. Fate values are the agent's verdict:
`deleted` · `reverted` · `superseded` · `still-present-but-unused` · `cancelled` · `unknown`.

`still-present-but-unused` is the expensive category — that code is still in the tree, still being
carried through refactors, still costing review attention, and doing nothing.

## Totals

| | count |
|---|---|
| Features shipped across all eras | **230** |
| Dead ends | **64** |
| Pivots (design direction changed) | **46** |
| Pain signals (same area fixed repeatedly) | **65** |

### Dead ends by fate

| fate | count |
|---|---|
| still-present-but-unused | 23 |
| deleted | 14 |
| superseded | 9 |
| unknown | 4 |
| reverted | 2 |
| deleted / superseded | 1 |
| cancelled | 1 |
| cancelled/withdrawn | 1 |
| deleted / superseded by inline editing o | 1 |
| deleted, residue permanent | 1 |
| superseded by a single relay:changed eve | 1 |
| repudiated in UI, still-present-but-unus | 1 |
| reverted in UI; dead code lingered one f | 1 |
| partially reverted | 1 |
| still-present-but-unreachable | 1 |
| superseded but not removed | 1 |
| consumed anyway | 1 |

---

## era-1-genesis (2025-12-13 → 2025-12-18, da12b868..e3b98570, 35 commits)

> Genesis wasn't a start — it was a finished ~16k-line prototype dropped into git in one commit, whose founding bet (the filesystem is the database and the filename is the primary key, with one global "active project" path string) was stress-tested to failure within five days by Windows collaboration, shadow files and the edit handoff.

### Dead ends

| what | fate | why it probably failed |
|---|---|---|
| FR-78: a transcript counts as "complete" only if BOTH .txt and .srt exist | reverted | "Is this recording transcribed?" had no owner — it was re-derived independently in 20 places (verified count at e3b98570), so a rule change in one module immediately contradicted the numbers shown elsewhere |
| DEFAULT_PROJECT_STAGES / STAGE_LABELS duplicated into ProjectsPanel.tsx on a stated Vite limitation | superseded | The recorded root cause is contradicted by same-tree evidence; the real cause was never written down. UNCERTAIN: I did not reproduce the original error, so a real failure with a different cause (HMR cache, or the types.ts/types.js/types.d.ts triple in one folder) cannot be ruled out |
| AppError + asyncHandler error-handling convention | still-present-but-unused | A convention with no enforcing mechanism. CAVEAT: errorHandler IS registered (e3b98570:server/src/index.ts:343) and Express 5 forwards rejected promises, so it is not strictly unreachable — but nothing throws AppError, so error-shape consistency is copy-paste discipline, not mechanism |
| S3 Staging page and route (FR-103) — the era's climax feature | deleted | Superseded by the Relay system; the folder-and-sync model of editor handoff was replaced wholesale |
| First Edit Prep page (FR-101/102) under its original name | superseded | The concept survived; "first" edit turned out to be one of several edit passes, so the name was wrong within two weeks |
| docs/architecture-comparison.md — the only doc that named FliHub's socket/multi-project design choice out loud | deleted | Swept up in a docs reorganisation; the analysis had no home in the new backlog/PRD structure |
| .claude/handovers/fr-70-video-watch-page.md and fr-83-shadow-recording-system.md — the only written specs for the Watch Page and Shadow System | deleted | Treated as transient work orders rather than design records; nothing else in the repo documented those subsystems |
| server/config.json and server/transcription-telemetry.json tracked in git | deleted | Runtime state stored inside the deployable — it was both user-specific and constantly rewritten, which also drove the nodemon restart loops |
| Video size toggle 'XL' option | deleted | Per-component localStorage with no schema or migration meant removing an enum value stranded existing users on an invalid setting |
| Shadow files as lightweight .txt placeholders | superseded | Killed before it shipped because Whisper needs audio and the Watch page needs playback; the commit message and release notes both still describe the abandoned design |

### Pivots

- **"Recording Namer" — a single-purpose rename tool** → **FliHub — a project hub**  
  trigger: Inbox, chapter recordings and the Watch page made "namer" the wrong noun  
  `14c64bda (2025-12-14 19:45), FR-62`
- **4-stage lifecycle: none / recording / editing / done** → **8-stage: planning → recording → first-edit → second-edit → review → ready-to-publish → published → archived**  
  trigger: FR-80 formalised the real production pipeline; migration mapped edit/editing→first-edit, done→published  
  `9fb53c13 (shared/types.ts ProjectStage union + DEFAULT_PROJECT_STAGES)`
- **Single-machine, David-only, macOS** → **Two-machine collaboration with Jan on Windows/WSL**  
  trigger: Jan onboarded ~2025-12-15  
  `FR-83/84 (0d71b486), 9 path/environment commits on 2025-12-16, /jan agent (cb4567db)`
- **Shadows as .txt placeholders** → **Shadows as 240p H.264/AAC transcoded video**  
  trigger: Whisper needs audio; the Watch page needs real playback; chapter generation needs frames  
  `0d71b486:server/src/utils/shadowFiles.ts:1-14 ("Benefits over text shadows")`
- **config.projectDirectory — one absolute path** → **projectsRootDirectory + activeProject**  
  trigger: An absolute path per user broke on Windows/WSL and made the header show a project when none was selected  
  `FR-89 9455f49d (with migration in server/src/index.ts); follow-on fixes a3683d8e (FR-93) and 9bba398e`
- **FliHub's job ends when recordings are named** → **FliHub owns the whole post-production handoff (prep → staging → post → publish)**  
  trigger: The Gling + Jan editing workflow needed a staging surface  
  `FR-101/102/103 b8088b88`
- **Transcript "complete" = TXT and SRT** → **Transcript "complete" = TXT**  
  trigger: FR-78 broke the progress percentages in the project list  
  `360c432b (12:33) → 8a47d090 (16:53), same day`
- **Ad-hoc/verbal requirements** → **A /po agent writing self-contained handover documents to a /dev agent**  
  trigger: Context limits splitting conversations across sessions  
  `4108f9e0 adds .claude/commands/po.md (285 lines); ae0edd45 rewrites it (+91 lines) demanding copy-pasteable, self-contained handovers`

### Pain signals

| area | signal | fixes |
|---|---|---|
| cross-platform paths | 9 commits in 48 hours on path/environment handling, and FR-93's cross-platform split fix reached 2 of 16 call sites | 9 |
| transcripts | "What is a transcript?" answered 4 different ways in 26 hours, because the predicate is re-derived longhand in 20 places | 4 |
| code duplication | 4 dedicated de-duplication commits in 5 days, and the newest routes written 3 days later use none of the helpers they produced | 4 |
| server ops / dev loop | The server writes its own runtime state into its own watched source tree; 4 stabilisation commits and a kill -9 at boot that still ships 8 months later | 4 |
| config / projects root | "Where do projects live?" hardcoded as a personal path literal in 12 server modules; the commit titled "Fix hardcoded project path" fixed 2 of them | 2 |
| config persistence | saveConfig maintains a hand-written whitelist of fields, so every new config value risks silent non-persistence | 1 |
| UI state | 17 ad-hoc localStorage call sites with no shared store, schema or versioning — removing one enum value required a hand-written validator | 1 |
| quality gates | Zero tests and zero lint/format config for the entire era — and for two months after | — |
| requirements traceability | 874 FR/NFR citations across 98 distinct ids, and not one resolves to a document in the repo | — |
| interaction primitives | The shared Shift+Hover hook was bypassed by an inline re-implementation in the same initial commit, and shipped with a @deprecated legacy path already in it | — |

---

## Era 2 — Expansion (2025-12-18 → 2026-02-13), range e3b98570..df9be0c3, 34 commits

> FliHub became a workbench — 19 FRs in 20 days — and locked in the two decisions everything downstream had to live with (per-recording state in a per-project JSON keyed by filename; "current project" as an ambient global), while producing the project's largest crop of dead ends and 3.9x more documentation than code, with zero tests.

### Dead ends

| what | fate | why it probably failed |
|---|---|---|
| FR-126 Edit Folder Manifest — editManifest.ts (251 lines), 4 endpoints in routes/export.ts, EditManifest types, FolderManifestStatus UI, 3 hooks | still-present-but-unused (route deleted, util orphaned, inva | It solved a disk-space problem that was later solved structurally by the archive/offload + StoragePanel work, and it required a filename-keyed manifest to be hand-synced through every rename — exactly the invariant the filename-as-primary-key decision makes expensive. |
| FR-119 API Explorer / shared/apiRegistry.ts — 973 lines, 36 hand-written endpoint definitions | still-present-but-unused (renders a stale 2026-01 snapshot o | A hand-written parallel description of the routers with nothing — no test, no build step, no lint rule — forcing the two to agree. |
| Four design-system explorations — client/public/mocks/design-{1,2,3,4}, 15,087 lines, 20 interactive HTML screens | superseded | Four complete alternatives generated in one sitting, with no decision criteria, no winner recorded in the commit, and no path from standalone HTML to the Tailwind/React app. Producing four options is a way of not deciding. |
| FR-132 Dual Transcription System with Progress Tracking + ETA progress bar | deleted (brief), never built (feature) | Telemetry was collected and analysed but there was no consumer surface; the measurement work produced a document instead of a UI. |
| FR-105 S3 / DAM integration — s3-staging.ts (275 lines) + S3StagingPage.tsx | deleted / superseded | Coupled FliHub to an external Ruby CLI being installed, and to a 'brand' concept that existed only as a v-* substring of the project path (extractBrand). |
| FR-139 Folders Tool — specced, PRD written, button removed before use | cancelled (ledger disagrees with itself) | A tool slot was placed in the sidebar before anyone had defined what it did. UNCERTAIN: '✓ Implemented' may mean 'the removal decision was implemented' — I found nothing resolving this either way. |
| NFR-141 Lenient Tag Parser — specced and handed over from a bad measurement, then withdrawn | cancelled/withdrawn | A 948-line scanner with no tests produced 1,805 false positives; a requirement, a handover and a day of analysis were built on an unvalidated number. |
| scanProjects.ts — 948-line project scanner, run once | still-present-but-unused | A one-shot analysis script committed as if it were product code; never wired to the app or scheduled. |
| SlideOutDrawer — FR-137's documented 'pattern', now with zero consumers | still-present-but-unused | The drawer-based tool UX it served was itself replaced by inline editing (B047, 690f619). |
| FR-140 ChapterListPanel and FR-138 RenamePanel — the era's two flagship tool drawers | deleted / superseded by inline editing on the Recordings pag | Editing in a separate drawer, away from the list of files being edited, did not feel trustworthy — the later design edits where the data is visible. |
| Root-level session artefacts: AGENTS.md (159 lines), HANDOVER-JAN.md (204 lines), BRIEF-dual-transcription-progress.md (290 lines) | deleted | Session-scoped documents committed to the repo root as though they were project documents. |
| RecordingState.stage — a speculative per-recording field | still-present-but-unused | Added speculatively in the same commit that created the state file; never had a use case. |

### Pivots

- **Protected takes live in a physical recordings/-safe/ folder** → **isSafe boolean in .flihub-state.json; every file stays in recordings/**  
  trigger: Filesystem-as-state forced every scan, rename, shadow and stats operation to branch across two directories  
  `95db6ac (FR-111); server/src/utils/safeMigration.ts (228 lines, runs at boot from server/src/index.ts:352); shared/types.ts diff drops safeCount and collapses folder: 'recordings'|'safe' to folder: 'recordings'`
- **Rename = move the recording and all its derivatives** → **Rename = DELETE every derivative, rename the source, migrate the state key, then regenerate**  
  trigger: Rename kept silently corrupting derived files — wrong shadow extension (.txt vs .mp4), only 2 of 5 Whisper formats deleted, and code still assuming physical -safe/ paths five weeks after FR-111 removed them  
  `fdc6aac (FR-130), server/src/utils/renameRecording.ts (277 lines); commit body enumerates all three as 'critical bugs found during implementation'`
- **Page-per-function (EditPrepPage, Export page)** → **One Manage page + vertical tool sidebar + slide-out drawers**  
  trigger: FR-131 Phase 2's 1,115-line implementation plan was abandoned mid-flight  
  `7f1b996 deletes EditPrepPage.tsx; 5ba69b1 creates ToolsSidebar/SlideOutDrawer/SelectionBadge/RegenToolbar; 3809e30 body states 'FR-131 Phase 2 - Superseded by FR-136 tool-oriented approach'`
- **Form-based chapter move with cascade renumbering** → **Visual vertical chapter list, click the number to edit, auto-swap on collision**  
  trigger: Owner quote embedded in the commit: 'If I was just looking at a list of chapters...'  
  `699385b (FR-140), ChapterListPanel.tsx`
- **Everything auto-selected by default** → **Nothing selected by default; empty selection implicitly means ALL files**  
  trigger: FR-131: 'Removed auto-selection (now 0 selected by default)'  
  `fa81286; SelectionBadge.tsx:26 renders 'All files (26)'; RegenToolbar.tsx:158 `selectedFiles.length > 0 ? selectedFiles : undefined``
- **Click-to-cycle project stage** → **Dropdown with 8 stages, coloured dots, checkmark, explicit Auto reset**  
  trigger: Cycling is undiscoverable and not reversible  
  `95db6ac (FR-110)`
- **Dedicated tool drawers for rename and chapter operations (era 2's central UI bet)** → **Inline editing on the Recordings page where the data is visible**  
  trigger: Post-era, but it invalidates the FR-136/137/138/140 architecture wholesale  
  `690f619 (2026-03-23) deletes both RenamePanel.tsx and ChapterListPanel.tsx in one commit`
- **Ship features daily, document afterwards** → **Reach for guardrails — dependency bump, ESLint 9 flat config, Prettier, then tests**  
  trigger: 30-day stall (2026-01-13 → 2026-02-12) after a 17,831-line documentation dump  
  `81f3937, df9be0c3 ('partial ESLint 9 and Prettier setup'), then first test files in 8797509/fe228dd`

### Pain signals

| area | signal | fixes |
|---|---|---|
| config persistence | Adding a Config field requires editing three separate hand-written enumerations; miss one and the field silently fails to persist. saveConfig's allowlist now carries per-field comments tagged FR-32, FR-89, FR-108, FR-110, FR-144, B038, B039, B064 and storage-panel — at least nine separate 'my field didn't save' patches. Era 2 contributed two (FR-108 glingDictionary, FR-110 projectStageOverrides). | 9 |
| keyboard handling | Five separate document-level Escape listeners were introduced in this era with no shared hook extracted. Today 13 files each roll their own, and client/src/hooks/ contains 25 hooks, none of them a keyboard hook. | 5 |
| rename | Rename is the join point of recording + shadow + 5 transcript formats + chapter video + chapter SRT + state key + manifest, and every one of those is a hardcoded string list. FR-130's own commit body enumerates three critical bugs found while implementing it. | 3 |
| project state persistence | Identical allowlist anti-pattern rediscovered independently in the state file: writeProjectState rebuilds the object from a literal field list with conditional spreads, tagged '// FR-118: Preserve project dictionary' and '// FR-126: Preserve edit manifest' — each comment marks an occasion where a new top-level field was silently dropped on write. | 2 |
| cross-project safety / ambient current project | The same bug class was fixed at both ends of the era, seven weeks apart, and the root cause is still untouched. FR-109 fixed transcript WRITES going to the active project instead of the job's project; 225053c fixed transcript READS (hasTranscriptFile) doing the same. Both fixes recover the project by string-splitting the video path on the literal segment 'recordings'. | 2 |
| video preview components | A whole component was cloned rather than shared, admitted in the commit body, and the bill came due eleven weeks later. Three overlapping video Range endpoints still exist. | 2 |
| server build | 25 TypeScript errors had accumulated in server/ — the server had not compiled cleanly for an unknown stretch while features shipped daily on tsx/dev-mode. The fix was to comment out rootDir rather than fix the workspace boundary; the commented line is still in the file today. | 1 |
| component sprawl | The panels era 2 consolidated into became the dumping grounds. FR-125's merge of EditPrep into ConfigPanel is the direct ancestor of today's five-tab 1,594-line ConfigPanel. routes/manage.ts went 0 → 1,202 lines in ten days with no tests. | — |
| documentation / process | Docs outgrew code 3.9:1 (+49,810 doc lines vs +12,786 app-code lines) and by 2026-01-12 had to be hidden from the tool that produced them to stop a JSON parser crash — followed immediately by a 30-day development stall. | — |
| requirement ledger integrity | The docs repeatedly disagree with the code. dc713fb declares FR-114/118/120/121/122/124 complete five hours BEFORE the related code commits land; backlog.md:33 marks FR-139 '✓ Implemented' for a feature whose button was removed; fdc6aac claims '240 lines of testable functions' and 'Testing verified' in a repo with zero test files; FR-129 has no PRD and no commit at all. | — |
| commit history accuracy | FR-140's commit claims four deletions that never happened. Verified: neither ChapterMovePanel nor chapterCascade.ts ever existed in any tree, and no move-chapter endpoint appears anywhere in history. The 696 lines actually removed were the Gling/export UI duplicated into shared/ExportPanel.tsx one commit earlier. | — |
| testing | Zero automated tests across the whole era. 34 commits, +12,786 lines of app code, a hand-rolled 3-phase chapter swap, and a rename that irreversibly deletes derived files — all shipped untested. ConfirmationModal was the substitute safety mechanism. | — |

---

## Era 3 — Industrialisation (2026-02-13 → 2026-03-19), commits df9be0c3..1588f7bb, 34 commits

> FliHub bought a full industrial toolchain in one day — CI, lint, format, tests, Zod, Pino — and almost none of it turned out to be load-bearing (CI went red on the very next feature commit and has failed 78 times since), while the one thing nobody framed as the point, the pressure to make code testable, produced the codebase's first real seams.

### Dead ends

| what | fate | why it probably failed |
|---|---|---|
| GitHub Actions CI — green for exactly one day, then 78 consecutive failures | still-present-but-unused | The gate that breaks first is format:check — running ./node_modules/.bin/prettier --check 'client/src/components/*.tsx' on main today reports 28 non-conforming files. CI runs on push to main in a project whose model is 'default to main, no PRs', so a red run is a notification, not a stop. The era's own docs/planning/AGENTS.md 'Quality Gates (non-negotiable)' list omits lint and format entirely. CAVEAT: I counted and dated the 78 failures and verified format:check fails today; I did not open each run's log, so other steps may also fail. |
| Pino structured logging — installed, integrated into one file, never adopted | still-present-but-unused | Adopting a logger requires touching every existing call site; nothing forced it, so the default (console.log) kept winning and the count grew by 32. |
| shared/naming.test.ts — the TDD demo that npm test never ran | superseded | Classic absence-looks-like-success: a green `npm test` was indistinguishable from a `npm test` that collected nothing. Nothing asserted a minimum test count or failed on zero-collected. |
| Coverage thresholds — added by a work unit, structurally inert | still-present-but-unused | Current coverage (shared 56%, server 57%) sits comfortably above the declared floors, so a working config and a dead config produce identical output — nobody could tell. */vitest.config.ts has not been touched since fe228dd. Follow-up B022 ('tighten thresholds') was written into next-round-brief.md and never actioned. |
| ExportS3Tool.tsx — a 982-line component with a 3-day lifespan | superseded | The FR-142 PRD says it: the drawer mixed two distinct pipeline stages (local Gling/edit prep vs remote S3 collaboration). The consolidation was a UI reaction to UAT friction with no stage model underneath it. |
| S3StagingTool.tsx / the entire S3 staging pipeline | deleted | The S3+DAM channel was replaced by git-based relay. Only GlingEditTool.tsx from the FR-142 split survives to HEAD. |
| 873 lines of verification documentation written and deleted the same day | deleted | Ceremonial documentation — writing about having done the work as part of doing the work. Every disposable doc from this era has VERIFICATION or COMPLETE in its filename; every durable one describes behaviour an agent would otherwise rediscover. |
| shared/apiRegistry.ts — a 1000-line API 'contract' that froze in this era | still-present-but-unused | A hand-maintained catalogue with no mechanical link to the routes it describes will always drift. CAVEAT: 34 vs 156 counts different units (registry entries vs handler registrations across mounted routers) — it establishes an order-of-magnitude gap, not an exact drift count. |
| Zod env validation — two importers, six direct process.env readers | still-present-but-unused | Same as Pino — nothing forbade the direct path, so the direct path stayed. |
| The green 'safe' recording row — a state visualisation removed | superseded | State colour was an inline if/else chain of hardcoded Tailwind classes in a render loop — there was no named 'state → visual token' concept, so one state's colour could be dropped without anything noticing the scheme had become inconsistent. RecordingsView.tsx at HEAD no longer contains rowClasses at all. |
| origin/test/verify-ci-2026-02-13 — orphaned remote branch | still-present-but-unused |  |
| Specification debt — PRDs written for features with no demand | still-present-but-unused |  |
| Follow-up test items B020/B022/B023 — proposed at era close, never done | still-present-but-unused |  |

### Pivots

- **Two separate export surfaces — Export tab + S3 Staging modal** → **One unified ExportS3Tool drawer in the Manage sidebar**  
  trigger: UAT friction — commit body: 'Fixes real user pain points from UAT testing'  
  `99b281f575d969986234c053d880ebedcf088d55 + 9f428c0add8435306982b640f42a0311957ab566 (1,579 lines deleted)`
- **One unified Export/S3 drawer** → **Two focused tools: GlingEditTool + S3StagingTool**  
  trigger: Three days of use revealed the drawer mixed two pipeline stages. FR-142 PRD: 'A user doing Gling prep doesn't need to see S3 controls, and a user managing S3 transfers doesn't need dictionary editing.'  
  `bc781821f47318b71e1dc477a9df24a0ec7299c3, docs/prd/fr-142-split-export-s3-tool.md`
- **openai-whisper via pyenv Python 3.11 (-m whisper)** → **mlx-whisper binary with mlx-community/whisper-large-v3-turbo**  
  trigger: Apple Silicon Neural Engine + the hardcoded Python 3.11.12 path no longer existed  
  `54a4e2e37bf50e56e8a3ba4a196e53cfe06e3e71`
- **npm run dev via concurrently** → **Overmind + Procfile (tmux-backed, survives terminal close)**  
  trigger: Wanting a persistent dev server plus repeated port-collision pain  
  `f85194e5eaad73a7a4acfb02279e46d8f466af05 (Procfile created), 43051b2b96ed48dc56e04e16cd425099db532bce`
- **Trusting shell/tmux env for the server port** → **PORT=5101 pinned literally in the Procfile**  
  trigger: The Overmind switch immediately introduced env inheritance from a long-lived tmux daemon — 'If PORT was set from another app's session, this server would start on that stale port'  
  `f86fed45669541b7d7def9bee066f70f6884c434`
- **Reshaping the AWB payload server-side ({workflowId, store, currentStepId, autoStart})** → **Forwarding the raw .awb.json verbatim**  
  trigger: Reshaping dropped fields AWB needed for resume  
  `b84cf1c6773cc919137e38a2290746db1ab311ac (reverts part of 5cb06bf)`
- **docs/backlog.md with FR-nnn / NFR-nnn ids** → **docs/planning/BACKLOG.md with B0nn ids**  
  trigger: 'Project Heal' — first Ralphy consolidation of ~45 shipped features, 14 planning docs and a full test audit into one canonical register  
  `2ac653c9960cbcc45da37fba6f3a7312e3beb7c4`
- **Human-written PRD → implement → commit** → **Campaign folder (AGENTS.md + IMPLEMENTATION_PLAN.md + assessment.md) → parallel agent waves → one squashed commit**  
  trigger: Ralphy adoption; NFR-146 test coverage is the first campaign (15 work units, 8 waves)  
  `0b483b08799f415bdb46660c1cd567a8da0c6ab1 → fe228dd436c09b27a59b91d54f45316c0b1d4467 → 1588f7bba1fcff82ddc23d3d9d6140b9ee85cf37`
- **Features drive refactoring** → **Testability drives refactoring**  
  trigger: The NFR-146 audit found 30+ critical pure functions untested, several of them not even exported: 'parseSrtTimestamp, formatYouTubeTimestamp, calculateConfidence all needed export added'  
  `9a40655d3df526cd91b558ba4ec23464defbe6cf → fe228dd436c09b27a59b91d54f45316c0b1d4467, docs/planning/nfr-146-test-coverage/assessment.md`

### Pain signals

| area | signal | fixes |
|---|---|---|
| CI / quality gates | CI green for exactly one day then 78 consecutive red runs over six months — nobody was ever forced to look | 78 |
| Agent context | The per-campaign AGENTS.md pattern seeded here forked 28 ways — each campaign copies the ~290-line baseline, edits it, abandons it, with no propagation of corrections | 28 |
| Backlog ↔ code drift | One commit reports ten backlog items as already-implemented rather than built — FR-145, FR-139, and R-1/R-4/P-3/C-1/C-2/C-3/C-4. The backlog had stopped modelling the system | 10 |
| Export / S3 / DAM | 8 of the 12 all-time commits to server/src/routes/s3-staging.ts happened inside this 34-day era — two-thirds of that file's entire history | 8 |
| Config sprawl | Five config locations by era end: server/config.json (gitignored), server/brand-config.json (committed), external brands.json, Zod env.ts, and module-level consts in route files. AGENTS.md gotcha #4 admits the cost: 'If a Ralphy wave modifies config.json, it will not appear in the diff.' | 5 |
| DAM CLI contract | Four distinct classes of bug from shelling out to a Ruby CLI and parsing its text output — PATH not resolvable, output is text not JSON, wrong bucket name in the console URL, .DS_Store mistaken for a legacy flat file | 4 |
| Dev-server startup / ports | 4 commits in 5 days (Mar 10–14). All four all-time commits to start.sh/Procfile other than their creation fall inside this era | 4 |
| Commit hygiene | Immediately after installing semantic-commit tooling: 'update flihub' (703 insertions, whole new POEM-WUI subsystem), 'updates before migration', 'clear db' (commits a brand config file) — and the era's largest refactor has a one-line message with no body | 4 |
| ESLint | Three commits in one day to get the linter to pass — 156 issues, then rules downgraded error→warn, then 136 fixed. The gate moved to meet the code | 3 |
| SRT resolution / transcript discovery | The rule 's3-staging/post → final → recording-transcripts' plus the stripSrt parser were written three separate times in four weeks — and the commit claiming to 'remove a duplicate route identified via code quality audit' duplicated the scan order again in the same diff | 3 |
| API response shape | { success } vs { ok } never reconciled — documented in AGENTS.md as an anti-pattern to work around rather than fix: 'poem-wui routes use { ok }, everything else uses { success }. Stay consistent within a file.' | — |

---

## era-4-ralphy-campaigns (2026-03-19 → 2026-03-23, 1588f7bb..1b06f68f, 34 commits)

> A whole collaboration subsystem (relay) was invented, shipped, redesigned and re-redesigned in 72 hours — four route generations and three UI paradigms — with every relay concept (paths, folder names, machine role, sync direction) invented inside a route file or a React component instead of in shared/, and the campaign apparatus producing more prose (+6,104 doc lines) than code (+5,659).

### Dead ends

| what | fate | why it probably failed |
|---|---|---|
| S3 Staging subsystem — S3StagingTool.tsx (679), useS3StagingApi.ts (332), routes/s3-staging.ts (744) | deleted, residue permanent | Relay replaced it as the transfer mechanism. But the CONCEPT was never removed: shared/paths.ts still declares s3Staging as a first-class ProjectPath today, server/src/utils/s3Utils.ts (83 lines) still exists, and 's3-staging' is still hardcoded in holdUtils/storageRoutes exclusion lists. The era's own architectural review predicted exactly this coupling. |
| Three B038 relay socket events: relay:recordings-available, relay:edit-received, relay:sync-status | superseded by a single relay:changed event | The three signatures appear verbatim in docs/planning/architectural-review-relay-2026-03-19.md under 'New Socket.io events needed'. The contract was copied from a design doc into shared/types.ts before any consumer existed. TypeScript compiles a fully-specified system that does nothing. |
| RelayBrowser.tsx — 123-line per-project × per-subfolder table with colour dots, size formatter, totals footer and legend | still-present-but-unused (dead code, carried through two lat | Pivot 3: infrastructure-oriented browsing ('what is in the relay folder') lost to workflow-oriented lanes ('what is the handoff state'). The browser answered a question David wasn't asking. |
| SlideOutDrawer pattern for Manage tools | repudiated in UI, still-present-but-unused in the tree | Widening a drawer twice in one day was the tell — the content was a page, not a panel. David's feedback F003: 'Tools bolted onto a page that was never designed to hold them.' |
| Regen Chapters button + its unreachable handler branches | reverted in UI; dead code lingered one full campaign | The chapter-video system was always described as temporary. The dead branches were flagged by the campaign's own audit as 'should have been caught during B042'. |
| Activity feed richness — RelayActivityEvent.fileCount / totalSize | unknown — shipped empty in this era; today relay.ts populate | The type was written by one agent (types work unit) and the call sites by another (routes work unit); nothing forced them to meet. |
| The `bash -lc` shell pattern — prescribed by the era's own architectural review | reverted | The review validated the pattern by citing precedent in a subsystem that was about to be deleted. Copy-from-existing-code is only as good as the code copied. |

### Pivots

- **Recordings and edits move through S3 via the DAM CLI (s3-staging/, S3StagingTool, 744-line route)** → **A machine-global ~/relay/flihub-appydave/ folder replicated peer-to-peer by SyncThing; FliHub only rsyncs into and out of it. S3 deleted entirely.**  
  trigger: The braindump constraint: 'SyncThing CANNOT be used on v-appydave/ or any git-tracked project folder' + 'folders are too large (no NAS)'. Plus the real goal — getting RAW recordings to Jan so he can do the Gling edit, which S3 never carried. Note the whiplash: the Mar 19 architectural review said 'relay is an alternative… S3 continues to be used for the second-edit workflow'; S3 was deleted 3 days later.  
  `ec0b16a (requirements-workflow-braindump-2026-03-19.md), dce171b (relay built), 21f4ebe (S3 deleted, −1,755 lines)`
- **Fixed 'Manage & Export' shell with a permanent recordings list in the centre; tools open in 300px → 600px → 700px slide-out drawers** → **Sidebar is pure navigation; the selected tool owns the whole centre; the heading is contextual; ChapterListPanel de-modalised and inline**  
  trigger: David's own feedback, verbatim in docs/planning/flihub-feedback.md — F002: "'Manage & Export' heading shown regardless of which tool is active… generic noise"; F003: "Tools bolted onto a page that was never designed to hold them."  
  `18b09ca (feedback file born), 1b436e2 (all 4 drawers removed), 80f97f8 (assessment: drawers 'a dead end for this project')`
- **Relay UI as a folder browser — subfolder dropdown, global per-project table. Mental model: the relay filesystem.** → **Three lane cards named after pipeline stages (Recordings → First Edit → Final) with direction labels ('YOU → EDITOR'), role-appropriate verbs, expandable chapter-grouped file drawers and an activity feed. Mental model: the handoff.**  
  trigger: Stated in the commit message — 'Replace infrastructure-oriented relay UI (subfolder dropdown, global browser) with workflow-oriented design'. The Mochaccino mockup gave the agent a visual target; the assessment credits it explicitly.  
  `99aef7d — RelayTool.tsx 260 → 535 lines; casualty: RelayBrowser.tsx orphaned within ~18 hours`
- **AWB / POEM WUI as a first-class top-level tab in App.tsx (FR-144)** → **A tool inside the Manage sidebar; ViewTab's 'poem-wui' member and the PoemWuiPage import deleted**  
  trigger: Feedback F005. Part of a consistent era-wide direction: fewer top-level surfaces, more tools funnelled through Manage (S3 Staging retired, Regen Chapters removed, AWB demoted) — which is exactly what made Manage the pressure point F003 complained about.  
  `c0e291e (client/src/App.tsx)`
- **One 'Git Sync' button under Actions running git pull --rebase on the project repo** → **Sync Hub (B044) — two channels (app code + video project), push AND pull, dirty/behind/conflict state, persistent header indicators on every page, conflict-resolution UI**  
  trigger: Feedback F004: 'Jan and Roamy need to go to terminal and run git pull to get FliHub code updates… No notification that a new version is available.' The collaboration feature exposed that the collaborators couldn't get the app that runs the collaboration feature.  
  `e0ca7ab (731-line mockup), 34f034d (brief), 1b06f68 (marked complete); implementation ba19b14 lands 36 seconds later, outside this range`

### Pain signals

| area | signal | fixes |
|---|---|---|
| campaign bookkeeping (docs/planning) | docs/planning/next-round-brief.md touched by 16 of 34 commits and created+deleted 5 times — one filename repeatedly consumed and regenerated. BACKLOG.md touched 15 times. More commits on two markdown files than on any source file. Commit type split confirms it: 12 chore + 5 docs = 17 of 34 are process, only 8 are feat. | 16 |
| RelayTool.tsx | 8 commits and 4 distinct designs in 3 days. Line count: 170 (dce171b) → 260 (18b09ca) → 535 (99aef7d) → 245 today after later decomposition into client/src/components/shared/relay/. | 8 |
| Manage page (ManagePanel.tsx + ToolsSidebar.tsx) | ManagePanel.tsx touched by 8 of 34 commits, ToolsSidebar.tsx by 7 — roughly a quarter of the era each. ManagePanel oscillated 643 → 633 → 649 → 636 → 639 lines while its internal paradigm changed twice (drawers → tool-owned pages). 677 lines today. | 8 |
| machineRole / role vocabulary | Five fixes in 90 minutes on the same two words, all on RelayTool.tsx, ending by abandoning the enum: 16:33 guide says machineRole 'creator' → 16:37 'no, the value is recorder' → 16:41 give up, isCreator = role !== 'editor' → 16:45 push buttons wrongly disabled when relay empty → 16:48 a docs-only fix: commit restating all of it. Root cause: the concept has two names — shared/types.ts:4 says 'recorder'/'editor', while the requirements brief, the UI label and CLAUDE.md all say 'creator'. STILL UNRESOLVED TODAY: type says recorder, config.json says recorder, SyncTool.tsx:110 compares role !== 'editor', SyncTool.tsx:183 renders the label 'Creator', CLAUDE.md documents creator with 'recorder (legacy alias)'. A two-value enum with three spellings that is never compared by equality. | 5 |
| post-campaign hotfix tails | Every one of the three big relay campaigns was closed as 'complete' and then immediately needed fixes. B038 → 21f4ebe calls its rsync parsing broken and its shell usage a security vulnerability. B040 → 60ec36d fixes a stale diff surviving a push. B046 → five hotfixes in 90 minutes. The pattern: campaigns were graded by their own agents against their own AGENTS.md, and the gap only surfaced when David ran the app — commit 64e5f1c is literally titled '… — tested in browser'. | 3 |
| test counts as a health metric | Claimed progression 390 → 447 → 504→552 → 842 → 941; the 447→504 jump is unexplained by any commit in range. The relay-redesign assessment states it outright: 'AGENTS.md said 925 tests but actual count was 587 at start, 941 after campaign. Prior campaign's count included different test runner invocations.' The number every campaign used as its headline health metric was measuring different things in different campaigns. | 1 |
| duplicate formatters | The relay-redesign assessment's suggestion #5 was 'Extract formatSize/formatRelativeTime to shared utility (duplicated across components)'. Today there are still FOUR formatSize definitions (DeveloperDrawer.tsx, RelayBrowser.tsx, shared/relay/types.ts, server/src/utils/formatters.ts) and formatRelativeTime appears across 9 client files. Written down, never drained. | 1 |

---

## era-5-relay-and-manage (2026-03-23 → 2026-03-25, 1b06f68f..ed908f8b, 34 commits)

> FliHub grew a second, incompatible sync system (git-based Sync Hub alongside rsync-based Relay) and then spent the rest of the era discovering the two do not know each other exists — ending with a spec (FR-147) that names the flaw out loud and explicitly declines to fix it.

### Dead ends

| what | fate | why it probably failed |
|---|---|---|
| selectionMode state + showCheckbox prop — an explicit selection mode that hid checkboxes until activated | deleted | Lived 105 minutes. An explicit mode was invented to solve visual clutter that a stateless progressive-disclosure affordance (opacity-15 → group-hover:opacity-60 → solid when checked) solved with no state at all. Modes are the expensive answer to clutter. |
| Collapsible accordion layout for the Configuration page (set-once sections collapsed, daily-use open, sticky save bar) | superseded | Lived 17 minutes. The accordion encoded a frequency judgement ('set-once vs daily-use') as per-section layout policy; tabs reduced the same judgement to one default tab choice (Recording Names). |
| POST /api/relay/ensure-edit-folders — endpoint hardcoded to create only edit-1st/ and edit-2nd/ | still-present-but-unused (aliased) | Deprecated 66 minutes after birth. It hardcoded two of three subfolders, so the 'Create Folders' button on the Recordings lane created the wrong folders — observed live on Jan's editor machine and filed as F007. The backward-compat alias is ceremony: client and server ship in one repo with no external consumer. |
| Auto-create edit folders on collect (fs.mkdir recursive inside the collect handler) | partially reverted — project-level guard added at relay.ts:3 | Declared a data-loss bug 17 hours after shipping. The guard was added at one call site (collect) and not at the other two, so the hole FR-147 exists to close is still reachable via ensure-folders. NOTE: narrow in practice — getRelayPaths resolves to the active project, which normally exists; I did not construct a failing case. |
| SyncState 'conflict' — a fully-styled channel state (purple dot, '!' badge, 'merge conflicts' tooltip, purple status bar) that the server never emits | still-present-but-unreachable | Conflicts are real but travel through a different channel — the /pull response's conflicts[] array — so the concept got two representations and the state-machine one was never wired. |
| RelayIndicator's 'backward compatible fallback' three-dot renderer in ProjectsPanel | still-present-but-unused (~35 lines) | Compatibility shim between two halves of a single deployable — the same instinct that produced the ensure-edit-folders alias. |
| useRelayBrowse() call inside RelayTool — a 30-second polling loop feeding nothing | still-present-but-unused | Residue of the Kanban rewrite (39ed310) which replaced browse-derived stats with divergence-derived ones but left the hook call in place. Two polls of one endpoint, one dead. |
| machineRole as the primary axis controlling relay push/collect direction | superseded but not removed | Half-pivot. Role remains a config field, a Config UI dropdown and a header badge, but no longer decides anything observable except in the synced no-op case. Also: direction==='both' renders 'Sync Needed' while handleAction still falls through to a one-way role default. |
| docs/planning/requirements-relay-redesign.md — a requirements brief committed already stale | consumed anyway — the relay-kanban campaign that followed re | The spec described a state of the world that was already a day out of date when it was committed, and nothing in the process reconciled it against the code before it drove a campaign. |
| .claude/worktrees/agent-* gitlinks committed into the repo by the parallel-agent machinery | deleted | The agent-orchestration substrate leaked into the product repo. Notable because 'git add -A' is also the product's own push mechanism (sync.ts:183). |

### Pivots

- **Rename by describing — select files in a Manage panel, fill a form, apply** → **Rename where you see it — click a filename segment directly on the Recordings row**  
  trigger: Commit body: 'Edit where you see the problem — no more navigating to a separate panel.' Backed by the memory note that rename tools felt untrustworthy.  
  `690f619 — deletes RenamePanel.tsx (509 lines), ChapterListPanel.tsx (227), RenameLabelModal.tsx (206); removes Rename and Renumber buttons from ToolsSidebar.tsx; adds EditableFileRow (387) + BatchToolbar (321)`
- **Role decides direction — machineRole drives push vs collect per lane (recordings=creator pushes, edits=editor pushes)** → **Divergence decides direction — the actual filesystem state drives the button**  
  trigger: Commit body: 'sometimes the creator does the Gling edit and needs to send edit-1st files to the editor. Server was already bidirectional.'  
  `2569b00 — getActionLabel(lane, isCreator) → getActionLabel(direction, isCreator); isPushAction → defaultIsPush fallback; FileDrawer source now direction-derived`
- **Three vertical lane cards (themselves rebuilt at B046 the previous day)** → **Four horizontal Kanban lanes with colour-coded divergence borders**  
  trigger: David's recorded preference for horizontal Kanban over dashboards/timelines  
  `39ed310 — RelayTool.tsx rewrite (+318/-140); LANES gains a 'final' key with no relay subfolder (LaneKey = RelaySubfolder | 'final'); edit-2nd relabelled from 'Final' to '2nd Edit'`
- **Plain presence dots — 'there is something in relay'** → **Directional mini-badges — 'there are 2 files coming toward you'**  
  trigger: Presence does not tell the user which way to press  
  `e96eec2 — SYNC_BADGE_CONFIG with ↑n / ↓n / ✓ icons; subfolderTooltipLine() building 'REC: 3 local, 5 relay — 2 incoming'`
- **Red badge for relay-only files** → **Amber badge with ↓N for relay-only files**  
  trigger: F009, filed from real use on Jan's editor machine: 'On an editor's machine, this is the normal starting state — recordings exist in relay, haven't been collected yet. Red implies something is broken.'  
  `cf6af61; rule captured in docs/planning/relay-kanban-fixes/assessment.md: 'Red = error in David's mental model — amber for action needed, red only for actual problems'`
- **Bright/white UI** → **Warm linen palette**  
  trigger: The white UI reflected off David's face during recording and shifted the video's colour profile  
  `fb99b1b — 12 @theme tokens in client/src/index.css, 40+ components, ~500 class replacements. The only theme decision in the repo driven by a camera rather than taste.`
- **Silently create whatever directories a collect needs** → **Refuse the collect and tell the user to sync the git repo first**  
  trigger: Ghost project directories appeared on the editor's machine, outside git control  
  `944acf2 (03-24 19:04) adds auto-create → ed908f8b (03-25 11:52) FR-147 blocks it; 17 hours`
- **Localhost-only single-user tool** → **Tailnet-reachable multi-machine app**  
  trigger: David and Jan on different continents needed the same UI  
  `fcb1ba2 — vite.config.ts 'host: true', client/src/config.ts derives API_URL from window.location.hostname, six hardcoded localhost:5101 references removed`
- **Accordion config — frequency encoded in per-section collapse policy** → **Tabbed config — frequency encoded in one default tab**  
  trigger: 17 minutes of use  
  `72d71a3 (17:44) → a20d2ec (18:01)`

### Pain signals

| area | signal | fixes |
|---|---|---|
| relay sync semantics | Six consecutive commits over 30 hours all answering one question: what does 'in sync' mean and which way should the user press. The repeat count IS the finding — there was never a single owner of the answer. | 6 |
| filename parsing / naming module | Three parsers for one filename format, two of them called back-to-back in one function, because parseRecordingFilename is lossy (discards tags). B050/B051/B052/B053 are one architectural bug reported four times. | 4 |
| design system / status colour | The theme campaign deliberately exempted status colour ('What NOT to Replace: keep all colored semantic indicators — bg-blue-*, bg-red-*, bg-green-*, bg-yellow-*'), which is the exact subject matter of this era. Result: three colour vocabularies coexist and already disagree. | 3 |
| agent orchestration contract | Prose anti-patterns in AGENTS.md do not bind agents — stated twice in the owner's own assessment. Every parallel wave that touched one file produced conflicts, and every wave shipped at least one duplicate concept. | 3 |
| relay comparison model | Two definitions of 'synced' shipped by two parallel agents 60 seconds apart, neither comparing content. deriveSyncStatus returns 'synced' when relayCount === localCount; /divergence returns 'synced' when filename sets match. A file edited on one side reads as synced under both. | 2 |
| cache invalidation as the only cross-system coordination | 111 invalidateQueries calls across 17 client files; every new query key must be hand-retrofitted into every mutation and socket handler that could stale it, by memory. relayDivergence was created at 39ed310 and retrofitted into invalidation lists twice. | 2 |
| data freshness | Poll and push coexist with no decision: 13 refetchInterval timers at era end (5 in useRelayApi alone) for a relay directory that chokidar already watches and that already emits relay:changed. Half the inputs to divergence are watched, half are polled — WatcherManager.initAll never watches local edit-1st/edit-2nd. | 2 |
| test quality / CI | Audits, not the suite, catch the real bugs. A test asserted the wrong endpoint entirely and was green; all four B047 stabilisation bugs came from a post-hoc 3-lens audit. | 2 |
| config | Adding one config field requires five edit sites, and missing the fifth silently deletes the user's value. | 1 |
| shared types boundary | The client and server FolderKey unions had already drifted before anyone looked — the client could not name three folders the server could open. Nothing failed at build time because they were independent declarations in a monorepo that has a shared/ workspace specifically to prevent this. | 1 |
| test metrics | The project's headline quality metric does not reconcile: commit messages and assessments report 1,042 → 1,060 → '980 baseline' → 888 → 900 within six hours, with the drop glossed in an assessment as 'test restructuring'. | 1 |
| requirements process | Four parallel issue vocabularies with no cross-references. FR-147 is the ONLY FR raised in the entire era; everything else is a B or an F — the requirements system and the work that actually happened had drifted onto separate rails. | 1 |

---

## era-6 storage-and-stall (2026-03-25 → 2026-04-16, commits ed908f8b..3b3b2f16)

> FliHub built its storage subsystem three times in eight days, deleted two of the three UIs on the same afternoon, and — four days before the repo went quiet — committed a complete "rebuild in any tech stack" v2 spec plus a one-shot Baku build prompt for itself: the stall was a decision, not a blockage.

### Dead ends

| what | fate | why it probably failed |
|---|---|---|
| ArchiveTool.tsx — 823-line multi-project filterable archive table with batch offload/delete, filter tabs and aggregate footer | deleted | It was the multi-project answer to a single-project question. c1da2bfe's plan states: 'Per-active-project — same chrome as Relay tool. No multi-project list.' The 'filterable table primary' preference was real but belonged to the Projects page, not to a per-project verb surface. |
| StorageTool.tsx — 509-line per-project offload tool in the Manage sidebar; the deliverable of the offload-manage-tool campaign | deleted | Right shape, one campaign too early. archive-tool overrode it with a multi-project table, then storage-panel returned to StorageTool's original shape under a new name — a full round trip in 11 hours. |
| ProjectDrawer 'SSD Hold' section — 254 lines with nine distinct UI states | deleted | David's verbatim complaint recorded in docs/planning/requirements-offload-ux.md: 'I don't know where to find anything for doing the archives... There's no unified approach.' A nine-state machine at the bottom of the sixth section of a drawer. |
| archive-inventory + batch-offload + batch-delete-local endpoints and their tests | still-present-but-unused | Kept on the rationale 'Cheap to keep, expensive to rebuild' (storage-panel IMPLEMENTATION_PLAN.md) for Projects-page filter chips that were never built. ~740 lines of server surface plus a client test defending a dead cache key. |
| Six rejected round-1 project-list mockups | unknown | Design-round elimination. NOTE EXPLICITLY: a design deleted pre-commit and a design that never existed leave identical traces in this repo; only the commit message attests they existed. |
| MockupsPage design registry drift — 2 on-disk designs unreachable from the app | still-present-but-unused | The registry is a hardcoded TypeScript array beside a filesystem directory; nothing enforces agreement. |
| Shift+Click 'pin-to-compare up to 3 projects side-by-side' | unknown | Explored in mockups, silently dropped from the FR-148 spec — the PRD's Out of Scope section does not mention it either way. |
| Hover card as a data-display pattern — rejected, while three hover help rails shipped days earlier | still-present-but-unused | Nobody reconciled the two rulings — 'what hover means in this app' was never decided as a concept. |
| FR-150 Groq transcription | unknown | Written during the PRD dump on 2026-04-12; the repo went quiet four days later. Never started. |
| FR-153 storage workflow redesign | superseded | Superseded within two days by a campaign plan that used a different ID namespace (campaign folder, no B number). |
| B071 and B072 — backlog follow-ups filed against a tool deleted nine hours later | still-present-but-unused | The backlog was reconciled at campaign close and never again — BACKLOG.md still says 'Last reconciled: archive-tool campaign close (2026-04-14)' and marks the deleted tool complete. |
| The FliLaunch triage endpoint and the ready-to-launch-optimise preset — the last work on the repo, never committed | still-present-but-unused | The ask was a re-modelling of the domain (server-derived completion truth vs manually-set stage), not a feature; it landed after the v2 rebuild spec already existed, so investing it in v1 had no payoff. |

### Pivots

- **SSD storage UI buried in ProjectDrawer (9 states, 6th section down)** → **Dedicated per-project Storage tool in the Manage sidebar (StoragePanel)**  
  trigger: David verbatim in docs/planning/requirements-offload-ux.md: 'I don't know where to find anything for doing the archives. I don't know how to put stuff on hold. I don't know how to restore. I don't know how to delete locally. There's no unified approach.'  
  `ddaed6af → 8f29c31d (StorageTool) → 7b271fd1 (ArchiveTool) → ba8a4404 (StoragePanel); four homes in six days`
- **Multi-project filterable archive table with batch operations (ArchiveTool)** → **Single per-active-project Storage panel, hierarchical tree as the main content (StoragePanel)**  
  trigger: Nine hours of living with the multi-project table. Consistency with the existing Relay tool pattern beat the abstract 'filterable table primary' preference.  
  `c1da2bfe docs/planning/storage-panel/IMPLEMENTATION_PLAN.md: 'Supersedes: archive-tool campaign (kept the data layer + endpoints, replacing the UI shape)' and 'Per-active-project — same chrome as Relay tool. No multi-project list.'`
- **'Hold' as one verb (whole-project copy to T7)** → **'Hold' (reversible, heavy subfolders only) and 'Archive' (near-permanent, whole folder) as two distinct verbs with three mutually-exclusive states**  
  trigger: The original 'hold' conflated two operations with different reversibility and scope. The conflation was only noticed after two UIs had shipped on top of it.  
  `54248500 renames Hold→Offload; c1da2bfe locks vocabulary: 'Naming locked in: Storage (tool), Hold, Archive, Restore, Unarchive. State labels: Active / Held / Archived'; a3db182e implements HEAVY_SUBFOLDERS`
- **rsync -a of the entire project directory with zero exclusions** → **Heavy-subfolder allowlist + holdExcludeArgs() on every rsync (excludes -trash/, s3-staging/, .DS_Store, ._*)**  
  trigger: Real T7 space consumed by trash, S3 transit staging and duplicate finals.  
  `docs/planning/offload-manage-tool/assessment.md 'Current: rsync -a projectDir/ holdingPath/ — copies everything with no exclusions' with a table of what shouldn't be copied; implemented a3db182e; verifier taught the same exclusions in 3b3b2f16`
- **Verification on file count AND total bytes** → **Count only → back to count+bytes → count+bytes with rsync-exclusion filtering on both sides**  
  trigger: The safety gate authorising deletion of raw footage could not be made to agree with itself across three attempts.  
  `ddaed6af (count+bytes) → 45deeef9 ('byte totals differ across filesystems due to .DS_Store churn and resource fork handling') → a3db182e P4 (new verifyDirsMatch, count+bytes) → 3b3b2f16 (matchesExcludePattern on both sides)`
- **FliHub as a self-contained tool driven by David's own usage** → **FliHub as the ecosystem's source of pre-calculated project truth, consumed by other apps**  
  trigger: FliLaunch/ALS needed FliHub's filesystem knowledge and immediately hit the fact that FliHub's stage is a manual label that drifts from reality ('b71 had stage:first-edit but hasFinal:true').  
  `56f0dedf adds POST /api/poem-wui/send-ylo (transcript+chapters → Supabase inbox); docs/triage-handoff-from-flilaunch.md (2026-05-10): 'Triage is not an ALS workflow. It belongs in FliHub... FliHub becomes the single source of pre-calculated truth; ALS workflows consume that truth, never re-derive it.'`
- **Improve FliHub v1 incrementally, campaign by campaign** → **Rebuild FliHub from scratch in any tech stack**  
  trigger: Not stated in the repo. What is verifiable: the decision is dated four days before the final commit, and the same commit contains the full screenshot-tour artifacts you produce when documenting a system for replacement rather than maintenance.  
  `a039d8ad (2026-04-12) commits docs/prd/flihub-v2-requirements.md (1004 lines: 'Complete functional requirements for rebuilding FliHub in any tech stack. Audience: Developer unfamiliar with the current codebase') and docs/prd/flihub-baku-spec.md (1419 lines: 'Paste this section directly into Baku to kick off the build'), plus a 3.8MB screenshot ZIP and a 17-shot screenshot tour`

### Pain signals

| area | signal | fixes |
|---|---|---|
| delivery review process | 30 numbered post-implementation patches across the era, several structural rather than polish — transactionality on a destructive operation, a no-op SSD probe, and a multi-step destructive workflow orchestrated from the browser were all discovered in review, after the code was written | 30 |
| destructive-delete verification (verifyHoldingMatch / verifyDirsMatch) | The gate authorising deletion of raw footage was rewritten four times, ending with a hand-rolled rsync-glob matcher so the verifier and the copier would agree; the last rewrite is the final commit in the repo | 4 |
| SsdIndicator (23-line header dot) | Rewired four times in six days — every rewire answers the same question, 'where does clicking this dot take you', because the storage tool kept moving | 4 |
| commit messages / change ledger | Messages stopped describing their diffs: a 'fix: apply patches P1-P8' commit is +2732/-510 and introduces an 823-line component; a 'feat: add Brand tab' commit is 64 files carrying FR-149/151/152, five PRDs, a 1419-line build spec and a 3.8MB ZIP; a campaign-close commit re-narrates fixes it does not touch | 4 |
| storage subsystem (hold/offload/archive) | Three complete UIs built, two deleted; 18 of the era's 32 commits touch storage; 1,332 lines of UI + 486 lines of tests written and deleted within the era | 3 |
| ProjectListToolbar / project-count and disk-totals placement | Micro-layout thrash: the project count moved three times in eight hours and the disk totals row moved out of the toolbar entirely; the toolbar had no layout model so every new element re-litigated the row | 3 |
| API response envelopes | No envelope contract: 96 res.json({success…}), 14 res.json({ok…}), ~100 bare shapes ({projects},{images},{chapters},{renames}) across server/src/routes; produced at least two shipped unwrap bugs in this era and a known-deferred 281-format problem | 2 |
| byte formatting utilities | Consolidated 5 copies → 1 on 2026-03-25, back to 4 implementations within 13 days; the B062 assessment predicted the regression in writing and nothing prevented it | 2 |
| shared video infrastructure adoption | The shared useVideoPlayback hook was built and the Space handler was hand-copied into WatchPage in the SAME commit; WatchPage did not adopt the hook until 20 days later | 2 |
| shared constants / workspace boundary | DEFAULT_DISK_THRESHOLDS duplicated across client and server with a 'keep in sync' comment instead of using the shared/ workspace that exists for exactly this | 1 |
| client test coverage | 236 client tests vs 1,230 server tests, while 100% of the churn, deletion and re-shaping happened on the client; the video-controls campaign shipped six work units and added zero tests ('1036 tests pass' after every WU) | 1 |
| backlog / requirement IDs | Two backlogs with two ID namespaces, and CLAUDE.md points at the stale one; IDs collided (B062 used twice); the last real campaign has no ID at all; BACKLOG.md still marks a deleted tool complete with two open follow-ups against deleted code | 1 |
| planning artifact volume | docs/ grew +7,850 lines in 22 days against +17,337 lines of code; 8 campaign folders created in this era, 2 of which document code that no longer exists | 1 |

---

