# Documentation Sprawl & Drift Audit

**Repo**: `/Users/davidcruwys/dev/ad/flivideo/flihub`
**Audit date**: 2026-08-26
**Scope**: all `*.md` under `docs/` plus root `CLAUDE.md`, `CONTEXT.md`, `README.md`, `RELEASES.md`
**Method**: filesystem inventory + `git log` per file + direct comparison of load-bearing docs against `server/src`, `client/src`, `shared/`
**Excluded from counts**: `docs/rebuild-2026/**` (15 files) — that is this audit effort's own output, written today by sibling agents.

---

## 0. Headline

The documentation is not stale in the ordinary sense. **It stopped being maintained at a specific, identifiable moment and then kept growing anyway.**

The reference layer — `docs/architecture/*` — was written 2025-12-18, five days after the repo's first commit (`8fa159f`, 2025-12-13), and has never had a content edit since. Its only later commit is `8d0d5f8` (2026-02-13), a repo-wide Prettier reformat that touched 268 files. Everything the project did after that — 27 autonomous campaigns between 2026-03-16 and 2026-04-14, +67 HTTP routes, +14 socket events, an entire Relay/Sync subsystem, a Storage subsystem — went into **new campaign folders**, never back into the reference docs.

The result is a corpus where **46% of the files (108 of 236) are process exhaust from campaigns**, and the six documents an agent or a human would actually open first are all wrong.

| Metric | Value |
|---|---|
| Markdown files (excl. this audit) | **236** |
| Total lines | **75,198** |
| Files with exactly 1 commit (written once, never revised) | **101** (43%) |
| `docs/planning/` — campaign machinery | **108 files / 23,379 lines** (46% of files, 31% of lines) |
| Campaigns with an `IMPLEMENTATION_PLAN.md` | **27**, all started 2026-03-16 → 2026-04-14 |
| Real HTTP routes vs documented vs shipped in-app registry | **156 / 71 / 34** |
| Real socket events vs `socket-protocol.md` vs `architecture.md` | **27 / 20 / 13** |
| Competing backlogs (disjoint ID namespaces) | **4** (`FR-`/`NFR-`, `B0xx`, `REF-x`, plus `docs/refactoring-backlog.md`) |
| Broken internal `.md` links | **18** (7 of them in the root `README.md`) |
| Docs carrying any machine-readable frontmatter | **4 of 236** |
| CI checks that could catch doc/code drift | **0** (`.github/workflows/ci.yml` runs lint, format, build, test) |

---

## 1. Inventory & classification

```
bucket                   files   lines  written-once  untracked
prd-spec                    85   28,105          13          0
campaign-scaffolding        82   13,686          73          1
planning-oneshot            26    9,082          10          0
docs-root                   19    6,030           5          3
architecture-ref             8    4,474           0          0
analysis                     4    3,990           0          0
guide                        4    1,095           0          0
archive                      3    7,273           0          0
testing                      2      904           0          0
uat / operations / dev-tools 3      559           0          0
TOTAL                      236   75,198         101          4
```

Bucket definitions and what each actually is:

**`prd-spec` — `docs/prd/` (85 md + 1 stray `flihub-screenshots.zip`)**
The healthiest part of the corpus. Only **7 PRDs are unreferenced** by `backlog.md` / `changelog.md` / `archive/*`: `chapter-joiner-FR.md`, `future-bulk-operations.md`, `recording-namer-poc.md`, `recording-namer-report.md`, `fr-148-project-list-redesign.md`, `flihub-baku-spec.md`, `flihub-v2-requirements.md`. Two naming conventions coexist — pre-numbering specs (`recording-namer-FR.md`, `chapter-recordings-spec.md`, `move-to-safe-spec.md`, 15 of them) and the `fr-NNN-*.md` convention that replaced them — with no migration and no note saying the old ones are historical.

**`campaign-scaffolding` — `docs/planning/<campaign>/` (82 files)**
27 campaign folders, each an `AGENTS.md` + `IMPLEMENTATION_PLAN.md` (+ usually `assessment.md`). **73 of 82 have exactly one commit.** These are write-once agent briefing packets, not documents.

**`planning-oneshot` — `docs/planning/*.md` (26 files)**
Handovers and PO session logs: six `po-session-2026-01-06-*.md` files from a single day, `developer-handover-fr-141.md`, `developer-handover-nfr-141.md`, `fr-136-export-drawer-handoff.md`, `tool-scope-behavior-handover.md`, `requirements-*.md` × 5. All one-shot, all pointing at a moment that has passed.

**`docs-root` (19 files)**
A mixed drawer: two live indexes (`backlog.md` 30 commits, `changelog.md` 21 commits), and 17 files that are one-shot artefacts of a single day — `fr30-implementation-complete.md`, `handover-jan.md`, `handover-refactoring-to-po.md`, `handover-2026-04-08.md`, `brief-dual-transcription-progress.md`, `quality-tooling-action-plan.md`, `current-state.md`, `implementation-notes.md`, `chatgpt-brainstorm-agent.md`.

**`architecture-ref` (8 files, 4,474 lines)**
See §3. All content-frozen.

**`analysis` (4 md + `discrepancies.csv` + `discrepancies.json`)**
A single January 2026 filesystem-scanner investigation, frozen. `project-discrepancies.md` alone is 2,653 lines of scan output committed as prose.

**`archive` (3 files, 7,273 lines)**
Genuinely archival and correctly labelled. `requirements-2025-q4.md` (5,566 lines) is the only place the FR-1…FR-100 era survives.

**Untracked (4 files)** — see §6.

---

## 2. What the sprawl reveals about how the project was run

### 2.1 Twenty-seven campaigns in thirty days

Every `IMPLEMENTATION_PLAN.md` carries a `**Started**:` field. Reading them in order:

```
2026-03-16  nfr-146-test-coverage
2026-03-19  pre-feature-stabilisation, relay-collaboration-phase-1, test-coverage-gaps-2
2026-03-22  manage-page-redesign, manage-relay-refactor, manage-relay-refactor-w2
2026-03-23  manage-panel-polish, recording-editor, relay-redesign, sync-hub, tech-debt-round1
2026-03-24  b047-stabilisation, relay-kanban, relay-kanban-fixes, warm-linen-theme
2026-03-30  project-list-redesign
2026-04-07  disk-observability
2026-04-08  archive-offload, stage-and-project-actions
2026-04-12  video-controls-and-dictionary
2026-04-13  offload-cleanup-wave2, offload-manage-tool
2026-04-14  archive-tool, storage-panel
       TBD  nfr-architecture-refactor, nfr-code-quality-1
```

Five campaigns started on 2026-03-23 and four more on 2026-03-24. This is not a project with a documentation problem; it is a project whose **unit of work was the campaign**, and the campaign folder was the deliverable's container. Docs were an input to a run, not an output of it.

### 2.2 The knowledge-capture layer was built three times and used once

The campaign scaffold creates `decisions/`, `learnings/`, `patterns/` inside each campaign folder. There are **63 such folders. 62 are empty.**

The single exception is `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/planning/manage-relay-refactor/learnings/wave1-learnings.md` — and it is one of the most valuable documents in the repo, containing both a real architectural finding and a real process finding:

> **Config field triple-addition pattern**: New config fields need additions in THREE places: (a) `shared/types.ts` Config interface, (b) `configManager.ts` saveConfig allowlist, (c) `index.ts` updateConfig propagation. Missing (c) creates a silent bug where changes are saved to disk but not applied in memory until restart.

> **Agent scope creep**: Wave 1 security-fixes agent rewrote `poem-wui.ts` despite no instruction to do so.

Separately, `docs/learnings.md` (51 lines, 2 commits, last content 2026-01-02) is a *different* attempt at the same thing, containing exactly one entry. So: three mechanisms (root `learnings.md`, per-campaign `learnings/`, per-campaign `patterns/`), two entries total across eight months.

**Rebuild implication**: the scaffold created *slots* for knowledge but no *moment* at which filling them was required. Directory creation is not a capture mechanism.

### 2.3 Three campaigns shared one agent-instruction file, unedited

`docs/planning/nfr-146-test-coverage/AGENTS.md`, `docs/planning/nfr-architecture-refactor/AGENTS.md` and `docs/planning/nfr-code-quality-1/AGENTS.md` are **byte-identical** (md5 `28b36cccb475ee3103cb6f7f6c1af971`, 290 lines each). All three open with:

```
# AGENTS.md — NFR-146: Test Coverage Foundation
**Campaign**: nfr-146-test-coverage
**Purpose**: Additional context specific to writing tests in FliHub.
```

Two campaigns whose plans are about *architecture refactoring* and *code quality fixes* were handed a briefing document that describes writing tests. The scaffold was copied and the header never touched. Nothing detected this because nothing reads these files except an agent that will do what it is told.

### 2.4 A campaign deleted the previous campaign's output on the same day, and both folders still stand as peers

- `4332504` (2026-04-14) — `docs(archive): log Wave B patches applied + campaign close` — closes the `archive-tool` campaign.
- `ba8a440` (2026-04-14, same day) — `feat(storage-panel): Wave B — StoragePanel UI + sidebar wiring + ArchiveTool removal` — deletes `client/src/components/shared/ArchiveTool.tsx` (823 lines), `archiveToolUtils.ts` (84), and both their test files (486 lines). 1,393 lines removed.

Today, `docs/planning/archive-tool/` and `docs/planning/storage-panel/` sit side by side in the same directory with nothing marking the first as superseded. And `docs/planning/BACKLOG.md:14-15` still lists as **open**:

```
- [ ] B071 — Archive tool polish: extract `useBatchSelection`, replace mount nonce
      with explicit `navigationNonce`, `left-[232px]` footer layout fix, ...
- [ ] B072 — Add `DELETE /holding-only` endpoint to restore "Delete everything"
      on held-only rows ...
```

B071 is polish work against a component that no longer exists.

The commit message also notes *"Server endpoints archive-inventory / batch-* preserved for future"*. Verified: `POST /api/projects/batch-offload` and `POST /api/projects/batch-delete-local` have **zero references anywhere in `client/src`** — live routes with no caller and no doc.

**Rebuild implication**: campaign folders are peers in a flat directory with no supersession edge. There is no way for a folder to say "I replaced that one", so the reader must reconstruct the sequence from commit dates.

### 2.5 Findings were recorded diligently and consumed by nobody

`docs/planning/recording-editor/audit-architecture.md` (2026-03-24) records `RecordingsView` at 1,399 lines and recommends extraction (B054), and three separate `groupByChapter` implementations (B055). Both went into `docs/planning/BACKLOG.md` as open items. Five months later:

- `client/src/components/RecordingsView.tsx` — **1,537 lines** (grew by 138)
- `groupByChapter` defined at `client/src/components/RecordingsView.tsx:70`, again at `client/src/components/ManagePanel.tsx:51`, and a third variant `groupByChapterWithTiming` at `client/src/components/WatchPage.tsx:91`

The audit worked. The backlog worked. The loop between them was never closed, because the next campaign's `assessment.md` re-audited from the code rather than reading the previous campaign's open items.

### 2.6 The commit dates lie about content age

**Important caveat for anyone reading `git log` on this repo.** Commit `8d0d5f8` (2026-02-13, *"chore: add complete quality tooling infrastructure"*) applied Prettier to **all 268 files** — including every markdown file. So a `git log -1` date of `2026-02-13` on a doc means *"reformatted"*, not *"reviewed"*. The true content date for those files is their **first** commit.

For the architecture set, the real content dates are 2025-12-18 (api-reference, architecture, socket-protocol, patterns, architecture-comparison), 2026-01-04 (shared-code-index) and 2026-01-13 (naming-decisions, naming-rules-reference).

---

## 3. Drift: the load-bearing docs checked against the code

### 3.1 `docs/architecture/api-reference.md` — 71 documented, 156 real, 34 shipped

Real route count, `grep -c 'router.(get|post|put|patch|delete)(' server/src/routes/**`: **156**.
Endpoints named in `api-reference.md`: **71**.
Resolving full mount paths from `server/src/index.ts:218-326` and diffing:

**Documented but the code no longer has it (5, in two whole families):**

| Documented | Reality |
|---|---|
| `GET /api/first-edit/prep`, `POST /api/first-edit/create-prep-folder` | `server/src/routes/first-edit.ts` **deleted 2025-12-31** in `2b0d9d1`. Replaced by `/api/edit/prep`, `/api/edit/create-folder`, `/api/edit/create-folders` — none documented. `first-edit` survives only as a *stage name* (`shared/types.ts:442`), not an API. |
| `GET /api/s3-staging/status`, `POST /api/s3-staging/promote`, `POST /api/s3-staging/sync-prep` | `server/src/routes/s3-staging.ts` **deleted 2026-03-22** in `21f4ebe` — the commit message literally says *"retire S3"*. Still documented five months later. |

**Real but undocumented: 82 endpoints.** Entire subsystems absent from the reference:

- **Relay** (11): `/api/relay/{status,files,browse,divergence,versions,activity}`, `POST /api/relay/{collect,push,promote,preview,ensure-folders,ensure-edit-folders}`, `DELETE /api/relay/clear`
- **Sync** (4): `GET /api/sync/status`, `POST /api/sync/{push,pull,resolve}`
- **Storage / Hold / Archive** (16): `/api/projects/:code/{disk,hold/status,storage-tree,storage-activity,transcript-sync,state}`, `POST /api/projects/:code/{hold,hold/restore,hold/verify,archive,unarchive,held-archive,restore-held}`, `DELETE /api/projects/:code/{holding,local,trash}`, `GET /api/projects/{ssd-status,archive-inventory}`
- **Manage** (11): `POST /api/manage/{bulk-rename,regen-all,regen-chapters,regen-shadows,regen-transcripts,rename-chapter,split-chapter,swap-chapters,undo-rename}`, `DELETE /api/manage/{delete-shadows,delete-subfolder,delete-transcripts}`
- **POEM WUI** (6): `/api/poem-wui/{status,chapter-data,brand-config}`, `POST /api/poem-wui/{send,send-ylo,resume,brand-config}`
- **Developer** (3): `/api/developer/{config,project-state,telemetry}`
- **Edit** (3), **Video** (3), **chapter overrides** (4), **park/unpark** (2)

*Caveat:* my mount-path resolver could not statically follow two indirections (the `transcriptionRoutes` variable at `server/src/index.ts:218` and the seven sub-routers mounted inside `server/src/routes/query/index.ts:55-61`). I verified those 16 endpoints exist by reading the files directly, so they are **not** part of the "documented but missing" set. The 5 genuinely-missing endpoints above were each confirmed absent by `grep` and by locating their deletion commit.

### 3.2 There is a *fourth* API source of truth, and it ships inside the product

`shared/apiRegistry.ts` (1,000 lines) declares `API_ENDPOINTS: ApiEndpoint[]` with **34 entries**. It powers the in-app **API Explorer** tab (`client/src/components/ApiExplorer.tsx` — the only consumer; `grep -rn "apiRegistry|API_ENDPOINTS" server/src` returns nothing).

So FliHub ships an API browser to its user that shows **34 of its 156 endpoints (22%)**, and the markdown reference shows 71. Three numbers, none of them right, and the wrongest one is the one in the running app.

The missing seam is stark: **routes are registered by calling `router.get(...)`, and the registry is a hand-written array that nothing checks against them.** A registry that *declared* routes (and from which `router` handlers were mounted) would have made drift structurally impossible. Instead the registry is a parallel document that happens to be written in TypeScript.

`shared/apiRegistry.ts` last commit: `2026-02-13`, and that commit is *"fix: resolve ESLint warnings"* — i.e. its last *content* change is earlier still.

### 3.3 `docs/architecture/socket-protocol.md` — 20 documented, 27 real, 2 documented-but-dead

Real server emits, from `server/src/WatcherManager.ts:114-217` (8 watcher-config events) plus every `io.emit(...)` literal in `server/src/`:

```
thumbs:zip-added  assets:incoming-changed  assets:assigned-changed  recordings:changed
projects:changed  inbox:changed  transcripts:changed  thumbs:changed  relay:changed
file:new  file:deleted
transcription:{started,progress,complete,error,queued}
regen:shadows:{progress,complete}   regen:chapters:{progress,complete}
regen:all:{started,progress,complete,error}
chapters:{generating,generated,complete}
```
= **27 events.**

**Documented in `socket-protocol.md` but never emitted by any server code: 2.**

| Event | Where it is asserted to exist | Where it actually is |
|---|---|---|
| `file:renamed` | `docs/architecture/socket-protocol.md`; `docs/architecture/architecture.md:~105`; **typed** in `shared/types.ts:694`; **subscribed** at `client/src/hooks/useSocket.ts:59` | No `io.emit('file:renamed')` anywhere in `server/src` |
| `file:error` | same four places (`shared/types.ts:695`, `client/src/hooks/useSocket.ts:70`) | No emitter |

This is the most instructive drift in the repo, because **the type system agreed with the documentation and both were wrong.** `ServerToClientEvents` in `shared/types.ts` is a *declaration* of intent, not a derivation from emitters, so a dead event stays type-correct forever and the client keeps a live `socket.on` handler that can never fire. Renaming a recording today produces `recordings:changed` (`server/src/routes/index.ts:755,813`), not `file:renamed`.

**Undocumented but real: 9** — the whole Relay and Manage/regen surface (`relay:changed`, `regen:shadows:*`, `regen:chapters:*`, `regen:all:*`).

**Emitted but nobody listens (server→void), 4** — `chapters:generating`, `chapters:generated`, `regen:all:started`, `regen:all:error`. Confirmed by diffing the emit list against every `.on('...')` in `client/src`. Drift runs in both directions.

`docs/architecture/architecture.md` documents an even smaller set (13 events) and omits all `transcription:*`, all `regen:*`, and `relay:changed`.

### 3.4 `docs/architecture/architecture.md` — the dependency table and the tree are both from a different app

Documented "Backend" stack vs `server/package.json`:

| In the doc | Reality |
|---|---|
| Express 5.1.0, Socket.io 4.8.1, Chokidar 3.6.0 — correct | ✅ |
| — | **`pino` + `pino-http` + `pino-pretty` absent.** Structured logging is a cross-cutting concern (`server/src/config/logger.ts`) and the architecture doc has never heard of it. |
| — | **`zod` absent** — used for env validation (`server/src/config/env.ts`) and it is the app's only schema/validation layer. |
| — | `glob`, `string-comparisons` absent |
| Client table lists 7 deps | **`@monaco-editor/react` absent** — the client embeds a code editor |
| External services: "WhisperAI" | Reality is **MLX Whisper on Apple Silicon**: `server/src/routes/transcriptions.ts:125` defaults `whisperBinary` to `~/.pyenv/shims/mlx_whisper`, model `mlx-community/whisper-large-v3-turbo`. Not the same thing, and the difference is load-bearing (it is why this app is Apple-Silicon-only). |

The monorepo tree in the doc shows `server/src/{index.ts, routes/, utils/, middleware/, WatcherManager.ts}`. Reality adds `server/src/{config/, scripts/, test/, types/, watcher.ts}`, `server/src/routes/{query/, shared/}`, and `server/src/utils/{manage/, shared/}` — 30 entries in `utils/` alone. Client tree omits `client/src/{config.ts, utils/, test/}`.

### 3.5 `docs/architecture/patterns.md` — two documented "Never" rules, both broken at scale

> **Never** construct paths manually with `path.join()` or `path.dirname()`. — `patterns.md` §1

`grep -rn 'path.join(' server/src` excluding tests: **345 occurrences across 47 files.** `getProjectPaths` is used 103 times, so the pattern *exists* — it just never became the only way. Sample: `server/src/routes/storage.ts:86,89,203,204` builds relay/holding paths by hand.

> **Never** use inline query key arrays like `['assets', 'images']`. — `patterns.md` §2

`grep -rn 'queryKey: \[' client/src` excluding tests: **23 occurrences** alongside 173 `QUERY_KEYS.` uses. Sample: `client/src/components/TranscriptionsPage.tsx:36` (`['project-transcripts', activeProject]`), `client/src/hooks/useProjectsApi.ts:254` (`['projectState', projectCode]`), `client/src/hooks/useProjectDictionary.ts:12`, `client/src/hooks/usePoemWuiApi.ts:43`.

The doc is titled `# NFR-6: Codebase Patterns` and opens *"patterns established during the NFR-6 refactor"* — it is a record of a one-time refactor's intent, presented as a standing convention. Nothing enforces it: `.github/workflows/ci.yml` runs `lint`, `format:check`, `build`, `test`, and there is no lint rule for either prohibition.

### 3.6 `CONTEXT.md` — the only self-describing doc, and still two campaigns behind

`CONTEXT.md` is the best-engineered document in the repo. It is the **only** file with a provenance block: `generated: 2026-04-08`, `generator: system-context`, a 32-entry `sources:` list, and `regenerate: "Run /system-context in the repo root"`. It knows what it is made of and how to remake itself.

It is still wrong, because it was generated on **2026-04-08** and the last two campaigns landed on **2026-04-14**:

- `grep -c "StoragePanel\|storage-tree\|storage-activity\|held-archive" CONTEXT.md` → **0**. The Storage subsystem (`client/src/components/shared/StoragePanel.tsx` + 4 sub-components in `client/src/components/shared/storage/`, plus 16 server endpoints) is entirely absent.
- `grep -c -i "ArchiveTool" CONTEXT.md` → 0 (correct today, by accident — it was generated before ArchiveTool shipped *and* before it was deleted).

**Rebuild implication**: this is the right shape and the wrong cadence. A generated context doc with a `regenerate:` instruction is only true if regeneration is wired to a trigger. It was manual, so it froze on the day someone last ran it.

### 3.7 `docs/backlog.md` — accurate index, blind to half the work

30 commits, last 2026-04-12. Its FR table is genuinely maintained: FR-149 through FR-153 all carry correct statuses I could verify (FR-149 stage changes → `shared/types.ts:444-445` has `shelved` and `remix`; FR-150 marked *"Deferred (MLX path fix applied instead)"* → matches `transcriptions.ts:125`).

But `grep -n "planning/BACKLOG\|B0[0-9][0-9]" docs/backlog.md` returns **nothing**. The FR backlog has never once mentioned a B-number or linked the campaign backlog, while `docs/planning/BACKLOG.md` references `FR-` 66 times. The reference is strictly one-way: the campaign layer knows about the product layer; the product layer does not know the campaign layer exists.

### 3.8 A live stage vocabulary that exists in three incompatible versions

| Source | Stages |
|---|---|
| `shared/types.ts:439-448` (canonical union) | `planning, recording, first-edit, second-edit, review, ready-to-publish, published, archived, shelved, remix` (10) |
| `docs/architecture/api-reference.md:341` | `planning, recording, first-edit, second-edit, review, ready-to-publish, published, archived, auto` — missing `shelved`/`remix` (FR-149, 2026-04-08) |
| **Live response** of `GET /api/query/config`, hardcoded at `server/src/routes/query/index.ts:44` | `['none', 'recording', 'editing', 'done']` |

The third one is the interesting failure. It is not documentation drift — it is *code* drift, an endpoint whose entire job is to tell an LLM client what the valid stages are, returning a four-value vocabulary that matches neither the type union nor the doc and that no other part of the system uses. It has been wrong long enough that the doc which describes it is also wrong in a different way. Whatever the "Query API for LLM consumers" contract was meant to be, nothing holds it.

---

## 4. Duplicate and competing sources of truth

### 4.1 Four backlogs, four ID namespaces, no reconciliation

| File | Namespace | Commits | Last | Nature |
|---|---|---|---|---|
| `docs/backlog.md` | `FR-nnn`, `NFR-nnn` | 30 | 2026-04-12 | PO-authored product requirements, indexes `docs/prd/` |
| `docs/planning/BACKLOG.md` | `B0nn` | 30 | 2026-04-14 | Campaign-authored bugs/tasks, `- [ ]` checkboxes |
| `docs/refactoring-backlog.md` | `REF-n` | 2 | 2026-02-13 (Prettier) | Dead since first commit |
| `docs/archive/requirements-2025-q4.md` | `FR-nnn` (historical) | 2 | 2026-02-13 | Correctly archival |

`docs/refactoring-backlog.md` deserves a note for a different reason: its header reads **`**Generated:** 2024-12-14`** — a full year before this repository's first commit (2025-12-13). The date is fabricated. It is a small thing, but it is direct evidence that dates inside these documents cannot be trusted as evidence; only `git log` can, and only after accounting for §2.6.

### 4.2 `docs/agents.md` vs `docs/planning/AGENTS.md` vs `CLAUDE.md`

- `CLAUDE.md` (226 lines, 11 commits, last 2026-04-07) — live, and the version that carries the machine-inventory table.
- `docs/agents.md` (172 lines, **1 commit**, 2026-02-13) — a fork of `CLAUDE.md` for Codex, differing only in the first line (`# AGENTS.md` / *"guidance to Codex agents"*) and by omitting the `CONTEXT.md` pointer and the entire "Dev Server Management" section. 118 lines are shared verbatim. It was copied once and abandoned; a Codex agent reading it today would not know about `CONTEXT.md`, would not know the Overmind/`start.sh` launch procedure, and would not know the port-check rule.
- `docs/planning/AGENTS.md` (436 lines, 8 commits, last 2026-04-07) — the *actual* living agent baseline, explicitly self-describing: *"Self-contained — an agent receives this file + a work unit prompt and nothing else."*

Three files answering "what should an agent know", maintained at three different rates, with no pointer between the stale two and the live one.

### 4.3 Three version-history streams, one of them dead for eight months

| Stream | Coverage | Last content |
|---|---|---|
| `RELEASES.md` (438 lines) | v0.8.0 → **v0.13.0 (2025-12-17)** | 2026-02-13 (Prettier only) |
| `docs/changelog.md` (1,361 lines) | to **B065, 2026-04-08** | 2026-04-08 |
| `docs/archive/changelog-2025-q4.md` (1,678 lines) | pre-2026 | archival, correct |

`git tag` returns exactly **6 tags** — `v0.8.0` … `v0.13.0`, all from December 2025. Versioning was abandoned four months into the project while the changelog carried on for another four. `RELEASES.md` still announces itself as *"User-facing release history documenting the complete development journey"* and *"Future v1.0.0 = Stable release (likely after BMAD rebuild)"*.

Note also that `docs/changelog.md` changed *shape* mid-life: it opens with a `## Quick Summary - 2026-01-06` listing ~100 FR numbers in one paragraph, then switches to per-campaign narrative sections (`## B065 — Archive Offload + Disk Observability Polish (2026-04-08)`). Two different documents in one file.

### 4.4 `docs/README.md` describes a `docs/` folder that no longer exists

`docs/README.md` (102 lines, last content 2025-12-18) contains an ASCII tree of the documentation structure. It lists `prd/`, `architecture/`, `guides/`, `uat/`, `archive/`, `backlog.md`, `changelog.md`, `README.md`.

It does not mention `planning/` — **46% of the corpus, 108 files, 23,379 lines.** It also says `prd/` contains *"30+ spec files"*; there are 85. The index of the documentation is unaware of half the documentation.

### 4.5 Broken links, concentrated at the front door

18 broken internal `.md` links out of 117. Seven are in the root **`README.md`** — the first file any new reader or agent opens:

```
README.md -> docs/architecture.md        (actually docs/architecture/architecture.md)
README.md -> docs/api-reference.md       (actually docs/architecture/api-reference.md)
README.md -> docs/socket-protocol.md     (actually docs/architecture/socket-protocol.md)
README.md -> docs/patterns.md            (actually docs/architecture/patterns.md)
README.md -> docs/troubleshooting.md     (actually docs/guides/troubleshooting.md)
README.md -> docs/cross-platform-setup.md   (×2)
```

A flat `docs/` was reorganised into subfolders and the README was never repointed. Three more are in `docs/architecture/architecture.md` (same cause), three in `docs/prd/recording-namer-poc.md` pointing at `../stage-2-recording/*` (a sibling repo layout that does not exist here), and three PRDs (`fr-133`, `fr-134`, `fr-135`) all point at `../../planning/fr-131-phase-2-implementation-plan.md` — one `../` too many; the file is at `docs/planning/fr-131-phase-2-implementation-plan.md`.

---

## 5. The structural gap underneath all of it

Every finding above reduces to one missing thing: **there is no metadata layer, so nothing can ever be retired.**

- **4 of 236 files carry frontmatter** — the three untracked `triage-*.md` and `docs/planning/requirements-disk-observability.md`. No `status:`, no `supersedes:`, no `owner:`, no `applies-to-version:` anywhere else.
- Consequently there is no way to mark `docs/planning/archive-tool/` as superseded by `storage-panel`, no way to mark `api-reference.md` as `status: stale`, no way for a reader to distinguish `docs/current-state.md` (a snapshot of December 2025) from `docs/backlog.md` (live).
- And no automation could tell the difference either: **`.github/workflows/ci.yml` has no doc-related step**, and no test in `server/src/test/` or `client/src/test/` references `api-reference`, `socket-protocol`, or `apiRegistry`.

The corpus is append-only by construction. That is why it reached 236 files: **nothing was ever deleted because nothing could ever be proven dead.**

### What "built differently" means here

1. **Derive the reference layer; do not write it.** `api-reference.md`, `socket-protocol.md` and the `shared/apiRegistry.ts` array are three hand-maintained projections of facts the code already knows. A route table that both mounts the handlers *and* emits the docs, and an event registry that both types and emits, would have made §3.1–3.3 impossible. The evidence that hand-maintenance fails here is not an opinion — it is 122 undocumented endpoints and a shipped API Explorer at 22% coverage.
2. **`ServerToClientEvents` in `shared/types.ts` must be derived from emitters, not declared alongside them.** `file:renamed` stayed type-correct, documented, and subscribed for eight months while being dead.
3. **Campaign folders need a supersession edge and a close gate.** A flat directory of 27 peers with no "replaced-by" link forces every future reader to reconstruct sequence from `git log`. A campaign close that cannot complete without either filling `learnings/` or explicitly declaring "no learnings" would have produced more than one file in 63 slots.
4. **One backlog, or an explicit federation contract.** Four ID namespaces with a one-way reference is how B071 came to be open against deleted code.
5. **Frontmatter on every doc, and a CI step that fails on a stale one.** Even just `status:` + `verified-against-commit:` would let a reader trust or discard a file in one line, and would let a script find the 101 write-once files that nobody has looked at since the day they were generated.

---

## 6. Untracked files — the newest knowledge is the least safe

Four `.md` files are not in git:

| File | Lines | mtime | Note |
|---|---|---|---|
| `docs/triage-handoff-from-flilaunch.md` | 142 | 2026-05-11 | `status: design — to be implemented in FliHub later` |
| `docs/triage-answers-to-flihub-questions.md` | 146 | 2026-05-11 | Answers to seven questions FliHub raised about the handoff |
| `docs/triage-bulk-analysis-candidates-from-flilaunch.md` | 45 | 2026-05-11 | Six candidate videos for a workflow design session |
| `docs/planning/relay-kanban/AGENTS.md` | — | — | Campaign scaffold that missed its commit |

The last commit in this repository is `3b3b2f1`, **2026-04-16**. These triage docs are dated **2026-05-10/11** — they are the *only* forward-looking design work produced after the codebase went quiet, they define a proposed cross-app API surface between FliLaunch and FliHub, and they are the only three files in the corpus that carry a proper `purpose:` / `created:` / `source:` / `status:` frontmatter block. They are also the only ones that could be lost by a `git clean`.

---

## 7. What to migrate

### 7.1 Keep — carries knowledge the code does not

| Path | Why |
|---|---|
| `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/prd/flihub-v2-requirements.md` (1,004 lines) | Purpose-built for exactly this rebuild: *"Complete functional requirements for rebuilding FliHub in any tech stack… Audience: Developer unfamiliar with the current codebase."* 17 feature sections, real-time events, naming conventions, plus §9 *v2 Improvements* and §10 *Out of Scope*. **Caveat**: written 2026-04-12, so it predates StoragePanel entirely (`grep StoragePanel` → 0) and the ArchiveTool deletion. Needs a delta pass against `ba8a440`/`3b3b2f1`, not a rewrite. |
| `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/prd/flihub-baku-spec.md` (1,419 lines) | The same content shaped as an executable build prompt, with the AppyDave design tokens inline and the "filesystem IS the database" mental model stated explicitly. **Caveat**: its tab list is already wrong — it names `Manage` where `client/src/App.tsx:44-55` has `export`, and omits `mockups`. Same delta pass required. |
| `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/planning/manage-relay-refactor/learnings/wave1-learnings.md` | The only filled learnings slot in 63. Contains the config-triple-addition trap and the agent-scope-creep meta-learning. Tiny, high signal. |
| `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/architecture/naming-decisions.md` (785 lines) + `naming-rules-reference.md` (692) | The naming convention is FliHub's actual domain model — the filename *is* the record. These capture the reasoning and the edge cases, which `shared/naming.ts` cannot. Written 2026-01-13; the convention itself has not changed. |
| `/Users/davidcruwys/dev/ad/flivideo/flihub/CONTEXT.md` | Right shape (provenance block + `regenerate:` instruction), wrong cadence. Migrate the *pattern* and regenerate the content. |
| `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/planning/AGENTS.md` (436 lines) | The real, maintained agent baseline. Explicitly self-contained by design. Supersedes both `docs/agents.md` and much of `CLAUDE.md`. |
| `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/planning/recording-editor/audit-{architecture,code-quality,test-quality}.md` (709 lines) | Three-lens audit of the most complex component. B054/B055 are still true today — these are a live defect list, not history. |
| `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/triage-handoff-from-flilaunch.md` + `docs/triage-answers-to-flihub-questions.md` | Newest design thinking in the repo (2026-05-11), defines a cross-app contract, **and is untracked**. Commit or copy before anything else. |
| `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/learnings.md` | 51 lines, one entry — but that entry (two duplicate `recordings` endpoints in different route files) is a real architectural smell that still exists. |
| `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/archive/requirements-2025-q4.md` | Only surviving record of FR-1…FR-100. Archive as-is; do not migrate into the new backlog. |
| `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/planning/BACKLOG.md` | Only after reconciling: B071 targets deleted code, B072 targets a UI that no longer exists. The B054–B058 items are still valid. |

### 7.2 Do not migrate — regenerate or drop

- **`docs/architecture/{api-reference,socket-protocol,architecture,architecture-comparison,shared-code-index}.md`** (2,647 lines). Every one is wrong in ways documented above. Migrating them migrates the errors. Regenerate from code, and this time derive them.
- **`shared/apiRegistry.ts`** as a *pattern* — the in-app explorer is a good idea, but it must read a registry the routes are mounted from, not a parallel array.
- **`docs/planning/<campaign>/{AGENTS,IMPLEMENTATION_PLAN,assessment}.md`** — 82 files, 13,686 lines, 73 written once. These are execution logs. The knowledge worth keeping from them was supposed to land in `learnings/` and did once. Archive the folder wholesale under a dated `campaigns-2026/` and index it; do not carry it forward as live docs.
- **`docs/agents.md`** — a one-commit fork of `CLAUDE.md`, stale in exactly the ways that matter (no `CONTEXT.md` pointer, no dev-server rule).
- **`docs/refactoring-backlog.md`** — dead namespace, fabricated date.
- **`RELEASES.md`** — dead at v0.13.0, December 2025.
- **`docs/analysis/*`** (3,990 lines + a CSV + a JSON) — a single January scan. Keep `discrepancies.json` if the scanner is being rebuilt; the 2,653-line prose dump of its output is not knowledge.
- **The 17 one-shot root docs** — `fr30-implementation-complete.md`, `handover-*.md` (×3), `current-state.md`, `implementation-notes.md`, `brief-dual-transcription-progress.md`, `quality-tooling-action-plan.md`, `chatgpt-brainstorm-agent.md`, the six `po-session-2026-01-06-*.md`. Each is a moment, and the moment has passed.
- **`docs/prd/flihub-screenshots.zip`** — a binary in the spec folder.

### 7.3 Rough arithmetic

Of 236 files / 75,198 lines, roughly **20 files / ~9,000 lines** carry knowledge that is both true and not recoverable from the code. Call it **8% of the files and 12% of the lines.** The other 88% is either process exhaust, a wrong copy of something the code already knows, or a snapshot of a day.

---

## 8. What this audit did *not* establish

Stated explicitly, because several of these would look identical whether the thing is true or false:

- **I did not run the app.** All route, event and dependency claims come from static reading of `server/src`, `client/src`, `shared/` and `package.json`. A route can exist and be broken; an event can be emitted and never delivered.
- **My route resolver could not statically follow two indirections** (`transcriptionRoutes` at `server/src/index.ts:218`, and the seven sub-routers in `server/src/routes/query/index.ts:55-61`). I confirmed those 16 endpoints by reading the files, but the "156 real routes" figure is a `grep` count of `router.<verb>(` and may differ by a few from what Express actually mounts.
- **"Documented but absent" is proven for 5 endpoints and 2 socket events only** — each confirmed by `grep` returning nothing *and* by locating the deletion commit (`2b0d9d1`, `21f4ebe`) or by there being no emitter at all. I did not attempt to prove absence for the remaining documented items.
- **I did not read all 236 files.** Classification is by path, filename convention, git history and head-of-file inspection. Individual campaign `assessment.md` files may contain durable findings I have not seen; I sampled five.
- **"Written once" means one commit touching the file.** A file edited many times before its single commit looks identical to a file generated and committed in one shot. The 101 figure is an upper bound on "generated and abandoned", not a proof of it.
- **I did not verify that the `docs/prd/` statuses are correct**, beyond spot-checking FR-149 and FR-150 against `shared/types.ts` and `server/src/routes/transcriptions.ts`. The claim "the PRD index is the healthiest part of the corpus" rests on reference-integrity (only 7 orphans), not on status accuracy.
- **Line counts include everything** — code fences, tables, ASCII diagrams. "75,198 lines" is not 75,198 lines of prose.
