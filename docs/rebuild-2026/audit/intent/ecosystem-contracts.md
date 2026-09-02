---
purpose: What the rest of David's ecosystem expects FliHub to BE. Integration contracts, live vs designed, and what a rewrite would break.
created: 2026-08-26
scope: Evidence gathering only — no code changes. Part of the FliHub rebuild-2026 intent audit.
method: Read the 4 named high-signal sources, then swept 388 markdown files outside the repo that mention FliHub, then verified every claimed endpoint against the real routes in server/src/routes/.
---

# FliHub — Ecosystem Contracts

**Headline:** FliHub is already a service. Six independent systems call it over HTTP on `:5101` today,
and FliHub itself is an HTTP client of two more. But nobody wrote the contract down in a place that
holds — the de-facto public API (`~/dev/ad/appydave-plugins/flivideo/skills/flihub/SKILL.md`) has **five live falsehoods** in it,
the repo's own `docs/architecture/api-reference.md` documents two endpoint families that no longer
exist and omits seven that do, and the one consumer doc with the richest endpoint table
(`flilaunch/docs/data-sources/flihub.md`) points at a skill that was archived on 2026-08-02.

**Evidence-class key** used throughout: **(a) SAID** = David or a doc David authored states an
intent · **(b) COMPLAINED** = a stated friction/failure · **(c) INFERRED** = my read of the artefacts,
labelled as such.

---

## 1. Who actually consumes FliHub today

### 1.1 Live HTTP consumers (verified in source code, not just docs)

| # | Consumer | Interface | Exact calls | Verified where |
|---|---|---|---|---|
| 1 | **FliGen** (Day 9 "Prompt Intake") | HTTP REST | `GET /api/system/health`<br>`GET /api/query/projects/:code/transcripts?chapter=N&segments=1,2,3&include=content` | `/Users/davidcruwys/dev/ad/flivideo/fligen/server/src/tools/flihub/client.ts` — `FLIHUB_BASE_URL = process.env.FLIHUB_BASE_URL \|\| 'http://localhost:5101'`; UI at `client/src/components/tools/Day9PromptIntake.tsx` |
| 2 | **FliVoice** (voice agent + client tools) | HTTP REST | server: `GET /api/query/projects`, `/api/query/projects/:code/transcripts`, `/api/query/projects/:code/recordings`, `GET /health` ⚠️<br>client: `GET /api/query/projects`, `/api/query/projects/:code/transcripts`, `GET /api/system/health` | `/Users/davidcruwys/dev/ad/flivideo/flivoice/server/src/tools/flihub/integration.ts`; `client/src/tools/clientTools.ts`; `client/src/hooks/useHealthCheck.ts` |
| 3 | **The `flihub` agent skill** (any Claude session, machine-wide) | HTTP REST via curl | 13 documented endpoints — full table in §2.1 | `/Users/davidcruwys/dev/ad/appydave-plugins/flivideo/skills/flihub/SKILL.md` + 11 sibling `*-command.md` files |
| 4 | **Brand Dave commands** (`/gather`, `/solo-deck`, `/scene-deck`, `/current-deck`) | HTTP REST via curl | `GET /api/query/projects`, `/api/query/projects/:code`, `/api/query/projects/:code/recordings`, `?recent=10`, and `POST /api/projects/:code/inbox/write` | `/Users/davidcruwys/dev/ad/appydave-plugins/brand-dave/commands/{gather,solo-deck,scene-deck,current-deck}.md` |
| 5 | **FliLaunch** (YouTube launch optimizer) | HTTP REST via curl in workflow docs | `GET /api/projects/stats` (health check + BI feed), `/api/projects/:code/transcript-sync`, plus 6 more it *believes* it can call | `/Users/davidcruwys/dev/ad/flivideo/flilaunch/docs/data-sources/flihub.md`, `CLAUDE.md`, `HANDOVER.md` |
| 6 | **FliHub's own client** (React, `:5100`) | HTTP + Socket.io | 39 endpoints via `shared/apiRegistry.ts`; ~10 socket events | `client/`, `shared/apiRegistry.ts` |

### 1.2 Live *outbound* calls — FliHub as a client of others

This is the direction most people miss. FliHub does not only serve; it pushes.

| Target | Call | Where |
|---|---|---|
| **AWB / POEM WUI** (`localhost:5041`, overridable via `config.poemWuiUrl`) | `POST {poemWuiUrl}/api/workflow/intake` with `{workflowId: 'youtube-launch-optimizer', store: {projectFolder, transcript, fliHubChapters, srtContent, brandConfig}}` | `server/src/routes/poem-wui.ts:91` |
| **YLO** — YouTube Launch Optimizer on Supabase | `POST {YLO_INBOX_URL}` (default `https://bcvqgfcupsagpzloulee.supabase.co/functions/v1/inbox`) with `Authorization: Bearer ${YLO_BEARER_TOKEN}` | `server/src/routes/poem-wui.ts:154` — shipped 2026-04-12, four days before the last commit |
| **AWB state file** | reads/writes `.awb.json` at the project root (`savedAt`, `currentStepId`); `POST /api/poem-wui/resume` loads it back into AWB and opens the browser | `server/src/routes/poem-wui.ts` |

**(c) INFERRED:** the last thing David built before the four-month silence was *outbound integration*
(YLO send, 2026-04-12) and *storage/lifecycle* (Storage Panel, 2026-04-14/16). Neither is naming-a-recording
work. The app's own centre of gravity had already moved off the operator loop.

### 1.3 Filesystem-level consumers (no HTTP)

| Consumer | Contract | Evidence |
|---|---|---|
| **Jan & Mary's FliHub instances** (editor role) | The relay directory: `{relayDirectory}/{projectCode}/{recordings,edit-1st,edit-2nd}`, moved by rsync | `server/src/routes/relay.ts:12` — `RELAY_SUBFOLDERS = ['recordings','edit-1st','edit-2nd']` |
| **Syncthing / relay-register skill** | Folder ID `flihub-appydave`, typed path `~/relay/project/flihub-appydave/`, flat structure | `brains/agentic-os/relay-system.md`: *"**`project/flihub-appydave`** — First relay ever created."*; `appydave-plugins/appydave/skills/relay-register/SKILL.md` maps "flihub relay" → `--type project` |
| **`query_apps` / `llm_context` CLI tools** | `context.globs.json` at the repo root | Verified present at `/Users/davidcruwys/dev/ad/flivideo/flihub/context.globs.json`; used as the canonical example in `appydave-plugins/appydave/skills/app-query/SKILL.md` (7 of 9 examples are `query_apps flihub …`) |
| **AWB Gen 3** | `.awb.json` inside each video project folder | `server/src/routes/poem-wui.ts` `readAwbJson()` |
| **DAM (Ruby gem)** | Ansible puts `dam` on PATH *specifically so FliHub can shell out to it* | `agent-os/ansible/roles/shell/tasks/main.yml:84` — *"Allows FliHub and other tools to call `dam` without a global gem install"* |

### 1.4 Non-runtime consumers (they'd notice a rewrite, but nothing crashes)

- **AppyStack template recipes.** Three recipes cite FliHub as the *source* of their production-tested
  pattern: `add-sync` (*"Discovered in: FliHub (B044 Sync Hub)"* and *"Discovered in: FliHub (Relay System)"*),
  `local-service`, `nav-shell`. Files at `apps/appystack/template/.claude/skills/recipe/references/`.
  A rewrite that abandons the WatcherManager/Sync Hub/Relay shapes orphans that provenance.
- **The capability registry** (`brains/capability-registry/capability-inventory.md`, dated **2026-08-18** —
  eight days before this audit, and the most recent serious thinking about FliHub anywhere).
  **(a) SAID:** *"Of 37 capabilities, **6 are coordination** — and every one of them is currently provided
  by FliHub alone. That concentration is itself the finding: the arsenal has many things that transform
  an artefact and exactly one thing that moves work between them."*
  The six: *watch for arrivals · detect a finished render · name and file a deliverable · move assets
  between machines · track a project's state across tools · synchronise repos.*
- **Public teaching content.** `brand-artifacts/data-systems/collections/zero-to-app/03-4-flihub-api-widget.json`
  builds a live slide-deck widget against nine FliHub endpoints, purpose: *"showcases the bespoke tooling ROI."*
  The API is on camera.
- **`appydave:screenshot-tour` skill** names FliHub as one of two exemplar apps to tour.

---

## 2. Contract-by-contract: LIVE, DRIFTED, or NEVER BUILT

### 2.1 The `flihub` skill — the de-facto public API, audited line by line

Every endpoint in `~/dev/ad/appydave-plugins/flivideo/skills/flihub/SKILL.md` checked against `server/src/routes/`:

| Documented | Real route | Verdict |
|---|---|---|
| `GET /api/system/health` | `system.ts:346` | ✅ LIVE |
| `POST /api/projects/:code/inbox/write` | `projects.ts:726` | ⚠️ LIVE but **misdocumented** — see D1, D2, D3 |
| `GET /api/query/projects/:code/inbox` | `query/inbox.ts` | ⚠️ LIVE but **response shape wrong** — see D4 |
| `GET /api/query/projects/:code/inbox/:subfolder/:filename` | `query/inbox.ts` | ✅ LIVE |
| `GET /api/query/projects/resolve?q=b86` | `query/projects.ts:78` | ✅ LIVE |
| `GET /api/query/config` | `query/index.ts` | ⚠️ LIVE but **returns stale data** — see D5 |
| `GET /api/query/projects` | `query/projects.ts:124` | ✅ LIVE |
| `GET /api/query/projects/:code` | `query/projects.ts` | ✅ LIVE |
| `GET /api/query/projects/:code/recordings` | `query/recordings.ts` | ✅ LIVE |
| `GET /api/query/projects/:code/transcripts` | `query/transcripts.ts` | ✅ LIVE |
| `GET /api/query/projects/:code/chapters` | `query/chapters.ts` | ✅ LIVE |
| `GET /api/query/projects/:code/images` | `query/images.ts` | ✅ LIVE |
| `GET /api/query/projects/:code/export` | `query/export.ts` | ✅ LIVE |

**Five live falsehoods in the skill.** Each is a real bug an agent hits at runtime:

- **D1 — "or any custom folder" is false.** `SKILL.md`: *"Subfolders: raw, dataset, presentation (or any
  custom folder)"*. `write-command.md` goes further with a worked example: *"# Custom subfolder (created
  if doesn't exist) … `{"subfolder": "scripts", …}`"*. The server **hard-rejects** it:
  `projects.ts:730` — `const validSubfolders = ['raw','dataset','presentation'];` → HTTP 400
  `Invalid subfolder. Use one of: raw, dataset, presentation`. Any agent following the documented example fails.
- **D2 — the write response shape is wrong.** Skill documents `{success, message, path: "inbox/raw/notes.txt"}`.
  Server returns `{success, path: <ABSOLUTE path>, subfolder, filename}` — no `message`, and `path` is absolute.
- **D3 — write does not accept short codes; read does.** `query/inbox.ts` and every other query route call
  `resolveProjectCode()` (FR-119), so `b86` resolves. The write route does `path.join(projectsDir, code)`
  raw (`projects.ts:749`) — `b86` 404s. The read/write asymmetry is undocumented anywhere.
- **D4 — inbox list response shape is wrong.** `read-command.md` documents `{success, subfolders:[…]}`.
  Server returns `{success, inbox: {totalFiles, subfolders:[…]}}`. An agent doing `.subfolders` gets `undefined`.
- **D5 — `/api/query/config` reports a stage vocabulary that no longer exists.** It returns
  `stages: ['none','recording','editing','done']` (hardcoded, `query/index.ts`). The real model since FR-80/FR-149
  is `planning · recording · first-edit · second-edit · ready-to-publish · published · archived · shelved · remix`
  (`shared/types.ts:439`). Consequence: the skill's own documented filters `?stage=editing` and `?stage=done`
  match **zero projects** — `query/projects.ts:212` does an exact `p.stage === stage` compare against the *new*
  values. `?stage=recording` works by coincidence; the other two are silently empty. This is the worst kind
  of failure: no error, just nothing.

### 2.2 Brand Dave commands — one broken URL, one dead pointer

- **Broken URL.** `appydave-plugins/brand-dave/commands/current-deck.md:76` instructs:
  `curl -s "http://localhost:5101/api/projects/resolve?q=b83"`. There is **no** `/api/projects/resolve` route
  (`projects.ts` has no `/resolve`). The real path is `/api/query/projects/resolve`. Verified by grep across
  `projects.ts` and `index.ts`.
- **Dead pointer.** `solo-deck.md:190`, `scene-deck.md:19,199` and `current-deck.md:9,72` all say
  *"Video mode: Use FliHub (see `skills/flihub-integration.md`)"*. That skill was **archived on 2026-08-02**
  (commit `ff02351` in `appydave-plugins`). The commands were not updated. **(a) SAID** — David's own commit
  message states the rationale: *"flihub-integration — duplicate of ~/dev/ad/appydave-plugins/flivideo/skills/flihub/, which covers the
  same surface and is less stale. Removes a discovery collision, not capability."*
  **(c) INFERRED:** the dedup was correct, but "less stale" was generous — §2.1 shows the survivor carries five
  errors, and three commands now point at nothing.
- Same command file also prints an example table with `| b85-... | editing | appydave |` — the retired stage label again.

### 2.3 FliLaunch — the largest endpoint table, half of it aimed at the wrong prefix

`flivideo/flilaunch/docs/data-sources/flihub.md` is the richest external description of FliHub's API.
It is also the most drifted. Its frontmatter reads `canonical_skill: brand-dave:flihub-integration`
and it points to `~/.claude/plugins/cache/appydave-plugins/brand-dave/1.10.0/skills/flihub-integration/SKILL.md` —
**archived**, and a version-pinned cache path that will not survive a plugin update either.

| FliLaunch's claimed endpoint | Reality |
|---|---|
| `GET /api/projects/stats` | ✅ LIVE (`projects.ts:101`). Returns exactly the fields claimed — `transcriptSync`, `chapterCount`, `stage`, `hasFinal`, `shadowCount`, `imageCount`, `thumbCount`, `hasInbox`, `createdAt`, `lastModified`. This is the real BI surface and FliLaunch's session-open health check. |
| `GET /api/projects/{code}/transcript-sync` | ✅ LIVE (`projects.ts:241`) |
| `POST /api/projects/{code}/inbox/write` | ✅ LIVE (with D1–D3 caveats) |
| `GET /api/projects/{code}/chapters?format=text` | ⚠️ Route LIVE (`projects.ts:306`) but **`?format=text` is not implemented there** — the param is ignored and JSON comes back. The YouTube-ready text is inside the JSON as `formatted`. |
| `GET /api/projects/{code}/transcripts?include=content` | ❌ **404** — no such route under `/api/projects`. Only `/api/query/projects/…/transcripts` exists. |
| `GET /api/projects/{code}/recordings?missing-transcripts=true` | ❌ **404** — only under `/api/query/…` |
| `GET /api/projects/{code}/export?format=text` | ❌ **404** — only under `/api/query/…` |

**(c) INFERRED:** two API generations coexist — the older operator-facing `/api/projects/*` and the newer
LLM-facing `/api/query/*` (NFR-68, Dec 2025) — and external docs mix them freely because nothing enforces
the boundary. **Rebuild implication: pick one prefix and make the other a documented alias, or the
next generation of docs will drift the same way.**

### 2.4 The Brand Dave inbox design — PARTLY SHIPPED, and nobody updated the design doc

`brains/brand-dave/flihub-integration-design.md` (dated 2026-06-28 in frontmatter, content older) still says
**"Status: Design phase - waiting on FliHub inbox implementation"** with an unchecked Phase 1 checklist.
Against the real code:

| Phase 1 item | Real status |
|---|---|
| FliHub creates inbox folder structure | ✅ SHIPPED — FR-59, `inbox/{raw,dataset,presentation}` in `shared/paths.ts`, plus a dedicated chokidar watcher |
| FliHub skill renamed to `flihub`, gains `write` | ✅ SHIPPED — `~/dev/ad/appydave-plugins/flivideo/skills/flihub/` with `write-command.md` |
| FliHub adds `promote` command (`inbox/* → resources/`) | ❌ **NEVER BUILT.** No route matches. The only `promote` in the codebase is `POST /api/relay/promote` (`relay.ts:537`), which copies `edit-2nd/ → final/` — a completely different concept. There is no `resources/` directory anywhere in FliHub's vocabulary. |
| FliHub documents the API contract | ⚠️ Partial — `docs/architecture/api-reference.md` exists but is stale (§2.6) |

**The design doc's five open questions, answered by the code (nobody wrote these answers down):**

1. *Health check endpoint?* → Yes: `GET /api/system/health` (the doc guessed `/api/health`, which does not exist).
2. *Write response?* → `{success, path (absolute), subfolder, filename}`.
3. *Overwrite behaviour?* → Silent overwrite. `fs.writeFile` with no existence check (`projects.ts:773`).
4. *Promote behaviour?* → Undefined; feature does not exist.
5. *Custom subfolders?* → **No.** Hard-rejected (D1).

**Phase 2 (Brand Dave side) is also unbuilt** — `gather.md` still documents plain `curl` reads and
`solo-deck`/`scene-deck` still delegate to the archived skill. The filesystem fallback the design specified
is, in practice, the *only* path for those two.

### 2.5 The triage proposal — the loudest architectural signal, and it is uncommitted

Three **uncommitted** files in `docs/`, dated 2026-05-10/11 — a **month after the last commit**. They are the
clearest statement anywhere of where FliHub was heading.

**The decision (a) SAID**, from `docs/triage-handoff-from-flilaunch.md`, co-designed live with Nick Frith:

> **"Triage is not an ALS workflow.** It belongs in FliHub. […] Cleaner contract: FliHub becomes the single
> source of pre-calculated truth; ALS workflows consume that truth, never re-derive it.
> Side effect: ALS workflows stop needing direct filesystem access for project state. They call one endpoint,
> get a deterministic snapshot, branch on it."

**The complaint (b) that motivates it** — `stage` lies:

> **"`stage` […] is manually set. It drifts from reality"** — with three receipts: `b65` had an empty `final/`;
> `b71` said `first-edit` but `hasFinal:true`; *"14 projects sit in `stage:published` but the linkage to
> YouTube is title-fuzzy at best."*

**The proposal:** `GET /api/projects/:code/triage` (single) + `GET /api/projects/triage` (bulk), returning
`completion{recording,first_edit,final,published}` · `structure{chapter_count,has_intro,has_outro,chapters[]}` ·
`transcripts{total,percent,missing,orphaned}` · `media{has_final,final_is_empty,thumb_count,image_count}` ·
`publication{youtube_url,youtube_id,matched_via}` · `flags[]` · `last_modified`.
Drift flags `stage_lags_data` / `stage_overshoots_data` encode the doctrine: **stage is intent, completion is fact.**
Gap analysis puts it at **~40 LOC** because `getChapterList()` already exists.

**The four undecided questions, verbatim-faithful from `docs/triage-answers-to-flihub-questions.md`
("none of these were resolved in conversation"):**

1. **Extend `/stats` or add a new `/triage` endpoint?** Lean: new endpoint — *"`/stats` has implicit downstream
   consumers and triage is a different abstraction (derived completion truth vs. raw counts). A new endpoint
   is free to evolve."* **Not decided.**
   *(This audit confirms `/stats` does have real downstream consumers — FliLaunch uses it as its liveness probe
   and its BI feed. The lean is correct.)*
2. **Where does the YouTube join live?** Lean: FliHub reads `~/dev/video-projects/published/<brand>/videos/*/metadata.json`
   at startup and builds an in-memory map. Source confirmed real — 183 AppyDave metadata files as of 2026-05-11.
   The gap is the **join key**: v-appydave uses project codes, the archive uses YouTube IDs; *"They don't share a key."*
   Options ranked: title fuzzy match → operator-set `youtube_id` → a `published/manifests/v-appydave.json`.
   **Not decided.**
3. **`stage` ownership — manual or auto-derived?** Lean: keep manual, surface drift flags. *"Auto-deriving would
   silently overwrite intentional 'intent' labels (operator marking `stage: ready-to-publish` before the assets
   land is a useful signal)."* **Not decided.**
4. **Brand awareness.** Single-brand today (`v-appydave`). *"The triage endpoint should be designed
   brand-agnostic from day one (path templates, no hardcoded brand prefix), but the v1 implementation can
   hardcode `v-appydave` if that ships faster."* **Not decided.**

**Two more rulings buried in the answers doc that matter more than the endpoint:**

- **The intended consumer changed mid-session.** ALS was dropped as primary. (b) COMPLAINED, verbatim:
  *"we built the bulk-analysis ALS workflow as a proof-of-concept and found ALS is **over-engineered for the
  actual workload** (12 prompts × 76 videos = simple batch, but ALS's per-record git worktree + dispatcher +
  merge-back contention added significant friction). The 12-prompt analysis itself probably belongs in a plain
  skill, not ALS."* New consumer ranking: **"1. FliHub UI (primary) — operator browses projects, sees completion
  lenses + drift flags directly. 2. Any future workflow tool […] secondary."**
- **Ordering ruling:** *"triage should land **before** FR-153 [storage redesign]"*, because storage decisions
  ("can this be archived?", "safe to delete recordings?") otherwise build on a `stage` that can lie.
  ⚠️ **This was violated.** The last three commits (2026-04-14/16) shipped the Storage Panel. The triage docs
  are dated *after* those commits, so the ruling arrived post-hoc — but a rewrite now has both, and the
  ordering advice still stands for the rebuild.

**Acceptance criteria already exist:** `docs/triage-bulk-analysis-candidates-from-flilaunch.md` names six
projects (`b71-bmad-poem`, `b81-dam-command-line`, `b76-vibe-code-auto-chapters-opus-4.5`, `b72-opus-4.5-awesome`,
`b73-vibe-code-ecamm-line-opus-4.5`, `b70-ito.ai-doubled-productivity`) that *"should all return
`completion.recording: true, completion.published: false` and zero drift flags"* — plus
`b65-guy-monroe-marketing-plan` as an extra smoke test. Free test fixtures for the rebuild.

### 2.6 The repo's own API doc is stale in both directions

`docs/architecture/api-reference.md` documents `## First Edit Prep` (`GET /api/first-edit/prep`,
`POST /api/first-edit/create-prep-folder`) and `## S3 Staging` (`GET /api/s3-staging/status`,
`POST /api/s3-staging/sync-prep`, `POST /api/s3-staging/promote`). **None of those routes exist** —
`grep` over `server/src/routes/` and `index.ts` finds no such mounts.

Conversely it omits seven mounted route families that DO exist: `/api/relay`, `/api/sync`, `/api/manage`,
`/api/poem-wui`, `/api/developer`, `/api/edit`, `/api/storage` + `/api/projects/*` hold routes. It also
omits `GET /api/query/projects/resolve` — an endpoint four external consumers call by name.

---

## 3. Is FliHub drifting from "an app David uses" toward "a service other agents call"?

**Verdict: it already drifted, but only halfway — and the half that drifted is undefended.**
Being rigorous, here is the evidence on both sides.

### Evidence FOR "it is becoming a service"

1. **A whole read-only API namespace exists for non-humans.** `shared/apiRegistry.ts` opens with
   `// Query API (Read-only, LLM-optimized)`. NFR-68 split it into seven sub-routers. Every endpoint takes
   `?format=text`, and the skill's own guidance is *"Use `?format=text` for LLM context — Formatted ASCII is
   easier to read and smaller than JSON."* You do not build an ASCII renderer for a React client.
2. **A machine-readable endpoint registry + an in-app API Explorer.** `shared/apiRegistry.ts` holds 39
   endpoints with typed parameters, groups and example responses; `client/src/components/ApiExplorer.tsx`
   renders it with auto-populated project codes and copy-as-curl (FR-119, 2026-01-02). That is a developer-portal
   feature, not an operator feature.
3. **Purpose-built affordances for callers who only know a prefix.** `GET /api/query/projects/resolve?q=b86`
   (FR-61) exists solely because agents say "b86" and the filesystem says `b86-claudemas-01-jump`. Short-code
   resolution was then retrofitted into every query route (FR-119). Both are agent ergonomics.
4. **A write endpoint whose only callers are agents.** `POST /api/projects/:code/inbox/write` (FR-59) exists
   to let Brand Dave agents deposit generated assets. **(a) SAID**, from the archived integration skill:
   *"Why FliHub Instead of File System? — FliHub is the source of truth for video projects […] No need to know
   the full file path."* And from the design doc's priority order: *"1. FliHub API (primary) - Fast, controlled,
   FliHub decides placement. 2. Filesystem (fallback) - When FliHub is down."*
5. **A skill was promoted to machine-global.** `~/dev/ad/appydave-plugins/flivideo/skills/flihub/` sits in the user's home skill dir —
   loaded in every Claude session on the machine regardless of cwd. Twelve files. It is the largest single
   description of FliHub anywhere.
6. **The registry describes it as backend-first.** `~/.config/appydave/apps.json`:
   `"notes": "Backend hub only — no client UI. Inbox API and integration hub for FliVideo suite."`
   *(⚠️ that entry is itself drifted — FliHub does have a React client, and `"ports": {"client": null}` is wrong;
   the port registry brain and the landscape brain both say 5100/5101. But the drift is directional: whoever
   wrote it thinks of FliHub as an API.)*
7. **The triage proposal states the ambition outright** — *"FliHub becomes the single source of pre-calculated
   truth"* (§2.5). That is a service charter.
8. **The capability registry treats FliHub as ecosystem plumbing**, not a workstation app —
   *"exactly one thing that moves work between them"* (§1.4).

### Evidence AGAINST — the counterweight, which is real

1. **FliHub's own `CONTEXT.md` describes an operator tool and nothing else.** Purpose: *"Manages the full
   lifecycle of video recordings for a solo content creator — from the moment Ecamm Live drops a .mov file,
   through naming and transcription, to multi-machine editor handoff and final export staging."* Its eight
   **Scope Limits** are all about what FliHub does not *do to video*. **Not one line mentions serving other
   systems, API stability, or callers.** The self-image has not caught up with the surface area.
2. **The capability registry grades every FliHub binding `reach: library`, not `rest`** — the taxonomy has a
   `rest` value and it was not used, on 2026-08-18, by the most careful recent analysis. Status on all six:
   `🟡 reachable, untested`, quality `?`.
3. **No versioning, no auth, no contract test, no OpenAPI.** `app.use(cors())` wide open; nothing pins response
   shapes; the four documented-vs-real breaks in §2.1 survived undetected precisely because nothing tests them.
4. **`/api/query/config` is hardcoded and wrong** (D5). A service that meant to be consumed would not let its
   own capability-discovery endpoint go two stage-model generations stale.
5. **The triage doc itself demoted the agent consumer**: ALS was dropped and *"FliHub UI (primary) — operator
   browses projects"* was promoted to #1 (§2.5). The most recent explicit ruling on consumer priority puts the
   **operator first**.
6. **Single-project, single-brand, config-file state.** `server/config.json` holds one `projectDirectory`,
   one `projectsRootDirectory` (`~/dev/video-projects/v-appydave`), and one `activeProject`. Several endpoints
   (`/api/poem-wui/*`, `/api/relay/*`, `/api/sync/*`, `/api/developer/*`) operate on *"the currently active project"*
   and return `{ok:false, error:'No project selected'}` otherwise. **A service does not have modal global state.**
   This is the single hardest structural fact against the service reading.

### The honest synthesis (c) INFERRED

FliHub grew a **service surface on top of a single-user modal app**, and the two halves never reconciled.
The `/api/query/*` namespace is genuinely stateless and multi-project — it takes `:code` and resolves it.
Everything else (`/api/relay`, `/api/sync`, `/api/poem-wui`, `/api/chapters`, `/api/transcriptions`,
`/api/developer`) is bound to `config.activeProject` and is only meaningful to the human sitting in front of it.

**That split is the actual architectural finding, and it is more useful to the rebuild than a yes/no answer:**

```
        ┌──────────────────── FliHub today ────────────────────┐
        │                                                       │
        │  STATELESS / addressable by :code   MODAL / bound to  │
        │  → the real service                 config.activeProject
        │                                     → the real app     │
        │  /api/query/*  (7 sub-routers)      /api/relay/*        │
        │  /api/projects/stats                /api/sync/*         │
        │  /api/projects/:code/transcript-sync/api/poem-wui/*     │
        │  /api/projects/:code/inbox/write    /api/chapters/*     │
        │  /api/system/health                 /api/transcriptions/*
        │  (proposed) /api/projects/:code/triage /api/developer/* │
        │                                                       │
        │  ← 6 external consumers live here   ← only the UI here │
        └───────────────────────────────────────────────────────┘
```

**Do not over-read it as "FliHub should become a headless service."** Nothing in the evidence says that,
and the most recent ruling says the opposite (§2.5, consumer #1 is the FliHub UI). What the evidence
*does* say: **the addressable half is load-bearing for six other systems and deserves to be a first-class,
versioned, tested contract; the modal half is a legitimate single-operator app and should stop pretending
to be an API.** The rebuild's job is to make that seam explicit rather than accidental.

---

## 4. The multi-machine story, and what it demands structurally

### 4.1 The fleet

Four FliHub instances (from `CLAUDE.md`'s machine inventory, authoritative source
`~/dev/ad/agent-os/ansible/inventory/hosts.yml`):

| Machine | `machineRole` | Network | Notes |
|---|---|---|---|
| Mac Mini M4 (David) | `creator` | `.local` + Tailscale | Ecamm recordings originate here |
| MacBook Pro (Roamy) | `editor` | `.local` + Tailscale | David's field machine |
| Jan's Mac Mini (`janreyes`) | `editor` | **Tailscale ONLY** | Philippines — `.local` will not resolve |
| Mary's Mac Mini (`mary`) | `editor` | **Tailscale ONLY** | Philippines |

Mac Mini M2 (bot) does not run FliHub. Ansible does not deploy FliHub — the only FliHub mention in the whole
`agent-os/ansible/` tree is a comment about putting `dam` on PATH *for* FliHub. **(c) INFERRED: FliHub is
hand-installed per machine; there is no fleet deployment contract to preserve.**

### 4.2 Three distinct sync mechanisms — often conflated, structurally different

| # | Mechanism | Transport | Direction | Code |
|---|---|---|---|---|
| 1 | **Relay** (B038) | rsync into a shared dir (Syncthing-backed under the hood) | **bidirectional** — creator pushes `recordings/`, editors push back `edit-1st/`, `edit-2nd/` | `routes/relay.ts` |
| 2 | **Sync Hub** (B044) | git | pull + push per channel (`app-code`, `video-project`), per-repo lock, conflict resolution | `routes/sync.ts` |
| 3 | **Shadows** (FR-83) | ffmpeg-generated low-res proxies, moved over relay | creator → editor | `routes/shadows.ts`, `utils/shadowFiles.ts` |

Cross-checked against David's own memory index: *"[sync-directions] — Relay is bidirectional; App Code and
Video Project are Creator→Editor."* That contradicts the code for Sync Hub, which implements both `push` and
`pull` (`sync.ts:170,237`). **(c) INFERRED: the memory records the *intended policy*; the code implements the
*mechanism*. A rewrite should decide which is true rather than shipping both again.**

### 4.3 What the fleet demands structurally

1. **Role must gate behaviour, and today it only gates pixels.** `machineRole` is read in exactly three UI
   places (`RelayTool.tsx`, `SyncTool.tsx`, `ConfigPanel.tsx`) plus the env endpoint. There is a standing TODO:
   `client/src/components/shared/ToolsSidebar.tsx:1` — *"TODO: Gate sidebar tools by machineRole in a future wave."*
   Nothing on the **server** enforces role. An editor instance can call every creator endpoint.
   *Rebuild implication: role is a server-side capability set, not a CSS class.*
2. **The legacy alias is still load-bearing.** Default is `'recorder'` in four places (`system.ts:239`,
   `ConfigPanel.tsx:319,392,481`) while docs and `CONTEXT.md` say `creator`. Two names, one concept, no migration.
3. **Tailscale-only machines break `.local` silently.** From the capability registry:
   *"⚠️ Philippines editors (Jan, Mary) are Tailscale-only — .local hostnames silently time out."*
   **(b) COMPLAINED.** *Rebuild implication: hostname resolution needs an explicit per-machine transport
   config with a fail-fast probe, not a hostname string that hangs.*
4. **Relay has no merge.** `CONTEXT.md` Scope Limits: *"Does NOT resolve relay merge conflicts — the Sync Hub
   handles git merge conflicts for code, but relay (rsync-based) has no merge capability. `diverged` status
   requires manual intervention."* Divergence is detected (`deriveSyncStatus` → `synced|ahead|behind|diverged|
   local-only|relay-only`) and then handed to a human.
5. **Editors cannot bootstrap a project.** *"Does NOT auto-create relay project folders — if a project does not
   exist locally on an editor machine, `collect` is blocked (FR-147)."* Cross-referenced with David's memory:
   *"[relay-workflow-plan] — Relay Kanban shipped; auto-create edit folders still missing."* **(b) COMPLAINED,
   twice, months apart.** This is a known unfixed friction and a rebuild candidate.
6. **The relay folder identity is externally registered.** Syncthing folder ID `flihub-appydave` at
   `~/relay/project/flihub-appydave/`, flat (predates the typed taxonomy). The relay-system brain carries a
   **data-loss warning** for any restructure: *"Skipping step 1 causes Syncthing to treat the move as a deletion
   and propagate it to all peers. This can result in data loss on remote machines."*
   *Rebuild implication: the relay path and its flat layout are a hard external contract. Changing it requires
   pausing the share on every peer first — Jan's and Mary's machines included.*
7. **State lives in three places with different sync stories.** `server/config.json` (per-machine, includes
   `machineRole`, `projectStageOverrides`, `projectPriorities`) · `.flihub-state.json` per project (safe/parked/
   annotations/editManifest/glingDictionary — travels with the project) · the filenames themselves
   (*"the filename IS the metadata store"*). Only the middle one crosses machines.

---

## 5. Rebuild implications — ranked

1. **Freeze and version the six live external contracts before touching anything.**
   `/api/system/health` · `/api/query/projects[/…]` (the whole family) · `/api/query/projects/resolve` ·
   `/api/projects/stats` · `/api/projects/:code/transcript-sync` · `POST /api/projects/:code/inbox/write`.
   FliGen and FliVoice break at runtime; FliLaunch, Brand Dave and the skill break silently.
2. **Fix the five skill falsehoods now — they are bugs, not docs debt.** D1–D5 in §2.1. D5 (`/api/query/config`
   returning a dead stage vocabulary, making `?stage=` filters silently empty) is the most dangerous because
   it returns HTTP 200.
3. **Make the stateless/modal seam explicit** (§3 diagram). Everything addressable by `:code` is contract;
   everything bound to `config.activeProject` is app. Do not let a new endpoint straddle it.
4. **Ship triage, and use its six named projects as acceptance fixtures** (§2.5). It is ~40 LOC of composition
   over helpers that already exist, it retires `stage`-as-truth, and it is the only architectural direction
   anyone has written down since the code stopped.
5. **Decide the four parked triage questions** — new endpoint vs extend `/stats`; where the YouTube join lives
   and by what key; whether `stage` stays manual; brand-agnostic from day one. All four are still open.
6. **Either build `promote` or delete it from the design doc.** It has been "waiting on FliHub" since the design
   was written and no consumer has worked around its absence — evidence it may not be needed. Meanwhile
   `POST /api/relay/promote` squats the name with unrelated semantics.
7. **Move `machineRole` enforcement server-side** and retire the `recorder`/`creator` double-naming.
8. **Treat the relay folder layout as immutable** unless the Syncthing pause-on-every-peer ritual is executed.
9. **Publish one contract file the ecosystem can point at** — the repo's `api-reference.md` is stale in both
   directions (§2.6) and four external docs each invented their own table. `shared/apiRegistry.ts` already
   holds structured metadata for 39 endpoints; generate the doc from it and let the skill reference the
   generated artefact rather than restating it by hand. Every drift in this report is a hand-restated table.
10. **Update or retire the four external docs that now point at nothing:** the three `flihub-integration.md`
    references in Brand Dave commands, the broken `/api/projects/resolve` curl in `current-deck.md`, FliLaunch's
    `canonical_skill:` frontmatter, and the `apps.json` entry claiming FliHub has no client UI.

---

## Appendix — what this audit did NOT establish

- **No endpoint was executed.** FliHub was not running; every ✅/❌ is a *source-code* verification against
  `server/src/routes/`, not a live request. A route that exists in source could still fail at runtime.
- **No consumer was executed.** FliGen's and FliVoice's calls are read from their source. Whether either app
  currently runs, or whether that code path is ever reached, is untested here.
- **The 388-file sweep was triaged, not read exhaustively.** The vast majority (AngelEye session-analysis
  findings, AWB worktree duplicates, dark-factory archaeology) mention FliHub as a *subject of analysis*, not
  as a dependency. I chased everything that described FliHub doing something for another system or another
  system depending on FliHub. A dependency described only in a file I skipped would not appear here.
- **Absence of a consumer is not proof of absence.** Any system calling FliHub from a non-`.md`, non-TS/JS/PY/RB
  file, or from a machine other than this one (Jan's, Mary's, Roamy's), is invisible to this sweep.
- **No transcripts were read.** This report is entirely artefact-based. Direct-speech evidence here is quoted
  from committed/uncommitted markdown and commit messages David authored, not from Plaud/OMI wearable audio.
  The other workstreams in this audit cover that.
