# Requirements Brief — Manage Page Refactor + Relay Collaboration

**Captured**: 2026-03-22
**Stakeholder**: David Cruwys
**Mode**: Ralphy Requirements

---

## Problem Statement

The Manage & Export page is the operational hub of FliHub — where David manages recordings, prepares for editing, collaborates with editors (Jan, Rome), and moves content through the production pipeline. But the current UI doesn't serve any of these jobs well:

1. **Slide-out panels are too narrow** (~300px) — content is cramped, paths truncated, dictionary fields barely readable
2. **The centre content never changes** — the recordings list is always visible, even when irrelevant (e.g. when using Relay or S3 Staging)
3. **The tool sidebar is an unordered menu** — doesn't reflect the actual workflow sequence (record → name → Gling → push → collect → promote → publish)
4. **Relay is inadequate** — no folder browser, no visibility into what's in the relay, no machine role awareness, broken rsync parsing, security vulnerabilities
5. **S3 Staging is largely obsolete** — replaced by relay for file transfer; clutters the interface
6. **No visual indicators** — can't see at a glance what stage a project is at, what's been sent, what's come back

## Who Is This For

**David (Recorder)** — records on M4 Mini, pushes recordings to editors, reviews edits, promotes to final, archives, publishes. Has full control: archive, promote, relay cleanup.

**Jan / Rome / future editors (Editors)** — receive recordings via relay, do Gling edits (edit-1st), do final edits in Camtasia/DaVinci (edit-2nd), push results back. No destructive controls in FliHub.

## Machine Roles

Each machine declares its role in `config.json` (gitignored, machine-specific):

```json
{
  "machineRole": "recorder"
}
```

- **`recorder`** — one machine only. Has archive, promote, relay cleanup buttons. This is where recordings originate.
- **`editor`** — many machines. Has ingest, push-edits buttons. No destructive operations.

FliHub shows/hides capabilities based on this role.

---

## The Workflow (What the UI Must Support)

### David's Flow (Recorder)

```
1. RECORD     — Ecamm Live → ~/ecamm/ → FliHub names files → recordings/
2. PUSH       — Push recordings to relay (Dropbox/SyncThing)
3. WAIT       — Jan receives recordings, does Gling, does edits
4. COLLECT    — Collect edit-1st (Gling output) from relay
5. REVIEW     — Watch/check Gling output (optional)
6. COLLECT    — Collect edit-2nd (final edits, versioned v1/v2/v3) from relay
7. REVIEW     — Watch edit-2nd versions, request changes if needed
8. PROMOTE    — Approve a version from edit-2nd → final/
9. ARCHIVE    — Back up recordings/ and final/ (only these two)
10. CLEANUP   — Clear relay when ready (independent of archive)
11. PUBLISH   — Upload to YouTube etc.
```

### Jan's Flow (Editor)

```
1. INGEST     — Pull recordings from relay → local recordings/
2. GLING      — Open recordings in Gling → export video + SRT to edit-1st/
3. PUSH       — Push edit-1st to relay (goes back to David)
4. EDIT       — Import Gling output into Camtasia/DaVinci → edit → export to edit-2nd/
5. PUSH       — Push edit-2nd to relay (versioned: v1, v2, v3)
6. ITERATE    — David reviews, requests changes → Jan revises → new version
```

---

## Relay Folder Structure

The relay folder (`~/relay/flihub-appydave/`) mirrors projects with subfolders:

```
~/relay/flihub-appydave/
├── c32-bmad-v6-epic1-foundation/
│   ├── recordings/     ← David pushes raw recordings here
│   ├── edit-1st/       ← Jan pushes Gling output here (video + SRT)
│   └── edit-2nd/       ← Jan pushes final edits here (v1, v2, v3)
├── b81-dam-command-line/
│   ├── recordings/
│   ├── edit-1st/
│   └── edit-2nd/
└── ...
```

**SyncThing** auto-syncs this folder peer-to-peer between all connected machines. FliHub copies files to/from the relay folder; SyncThing handles the network transport.

**Ignore patterns** (`.stignore`): `.DS_Store`, `._*`, `.Spotlight-V100`, `.Trashes`, `Thumbs.db`

---

## What the Relay UI Must Show

### Folder Browser (NEW — does not exist today)

The relay tool must show what's actually in the relay folder:

- **Per-project view**: which projects have content in the relay
- **Per-subfolder breakdown**: recordings (count, total size), edit-1st (files present?), edit-2nd (versions present?)
- **File-level detail**: individual files with sizes, timestamps
- **Direction indicators**: what was pushed by David vs what arrived from editors

### Push & Collect (EXISTS — needs fixing)

- **Push recordings**: rsync from project recordings/ → relay recordings/
- **Collect edit-1st**: pull Gling output from relay edit-1st/ → local edit-1st/
- **Collect edit-2nd**: pull final edits from relay edit-2nd/ → local edit-2nd/
- **Preview before push/collect**: show diff (what's new, updated, deleted)

### Promote (NEW)

- David reviews versions in edit-2nd/
- Selects approved version → promotes to final/
- Promotion = "this is done, archive-worthy"

### Archive (NEW — recorder only)

- Archive recordings/ and final/ (the two things worth preserving)
- edit-1st/ and edit-2nd/ are disposable (can be regenerated)
- Archive location: TBD (backup drive? separate folder?)

### Relay Cleanup (NEW — recorder only)

- Clear relay folder for a project when David is ready
- Independent of archive — could be same day, could be days later
- WARNING: deletion propagates to all editor machines via SyncThing

### Visual Indicators (NEW)

At a glance, David needs to see:
- What stage each project is at in the pipeline
- What's sitting in the relay (and for which projects)
- What's been sent to editors / what's come back
- What's been archived vs still live
- What's in edit-1st, edit-2nd, final for each project

---

## Manage Page Layout Refactor

### Current Problems

1. **Three-column layout** (sidebar | recordings list | slide-out drawer) wastes space — the centre column shows the same recordings list regardless of which tool is active
2. **Slide-out drawers are ~300px** — too narrow for any real content
3. **"Simple Tools" vs "Complex Tools"** labels are confusing and don't reflect workflow
4. **All drawers render simultaneously** in the DOM (visible in accessibility tree)
5. **S3 Staging** occupies prime UI real estate but is largely obsolete
6. **Git Sync** is under Simple Tools but is a collaboration action

### Requirements for New Layout

1. **Wider tool panels** — tools need enough room to display content properly (file lists, paths, dictionaries, relay folder browser)
2. **Context-sensitive centre content** — the main area should change based on which tool is active. Rename needs the recordings list. Relay needs the folder browser. Gling needs the prep workflow. Not everything needs the recordings list.
3. **Workflow-ordered navigation** — tools should be ordered to reflect the production pipeline, not arbitrarily grouped as "simple" vs "complex"
4. **Role-aware** — show/hide tools based on machineRole (recorder vs editor)

### Tools Assessment

| Tool | Status | Action |
|------|--------|--------|
| Regen Shadows | Works fine | Keep as-is (one-click action) |
| Regen Transcripts | Works fine | Keep as-is |
| Regen Chapters | Works fine | Keep as-is |
| Regen All | Works fine | Keep as-is |
| Git Sync | Works, wrong location | Move to collaboration/relay area |
| Rename | Works, needs wider panel | Wider panel, keep interaction model |
| Gling / Edit | Works, needs integration | Connect to relay flow, wider panel |
| S3 Staging | Largely obsolete | Retire or demote (keep POEM WUI send) |
| Renumber | Works, inconsistent UI | Render consistently with other tools |
| Relay | Inadequate | Complete rebuild (see Relay UI section) |

---

## Known Bugs (Must Fix)

### BLOCKER — Security

1. **Shell injection in relay.ts** — uses `bash -lc "rsync ... '${path}'"` with user-editable paths. Fix: use `execFile('rsync', [...args])` directly.
2. **Shell injection in system.ts** — git-sync uses `bash -lc "cd '${repoDir}' && git pull --rebase"`. Fix: use `execFile('git', ['pull', '--rebase'], { cwd: repoDir })`.

### MAJOR — Functional

3. **rsync output parsing broken** — `bash -lc` produces different rsync itemize-changes format (7 plusses vs 10). Parser hardcodes column positions. Fix: parse filename from first space instead of slicing at position 12.
4. **Preview shows files as "UPDATED" when they're "NEW"** — consequence of bug #3.
5. **relay routes don't check `relayEnabled`** — configured-but-disabled relay still accepts operations.
6. **`projectCode` not validated** — no empty/traversal check on `path.basename(projectDirectory)`.
7. **WatcherManager relay toggle bug** — relay watcher keeps running when `relayEnabled` toggled off.
8. **Relay socket events defined but never emitted** — stubs emit `{ projectCode: '', count: 0 }`.
9. **Zero test coverage** on all relay code.
10. **`.DS_Store` passes through rsync** — relay push should exclude OS metadata files.

---

## Constraints

- **Tech stack**: React 19 + Vite + TailwindCSS v4 (client), Express + Socket.io (server). No changes to stack.
- **SyncThing is external** — FliHub doesn't control SyncThing, just copies to/from the relay folder. SyncThing handles network sync.
- **config.json is gitignored** — machine-specific settings (relayDirectory, relayEnabled, machineRole) stay out of git.
- **668 tests currently passing** — must not regress.
- **Recordings naming convention unchanged**: `{chapter}-{sequence}-{name}-{tags}.mov`

---

## Resolved Questions

### 1. Archive Location — ANSWERED

Archive goes to external T7 drive: `/Volumes/T7/youtube-PUBLISHED/appydave/`

Organised in ranges: `b00-b49/`, `b50-b99/`, etc.

Each archived project contains:
```
b59-n8n-digital-ocean/
├── recordings/              ← raw recordings (backed up)
│   ├── 01-1-intro.mov
│   ├── 04-1-create-account.mov
│   └── ...
├── assets/                  ← if any
├── b59-n8n-digital-ocean.mp4   ← the Gling/first edit output
├── b59-n8n-digital-ocean.srt   ← SRT from first edit
├── b59-n8n-digital-ocean-v1.mp4 ← Jan's final edit version
└── b59-n8n-digital-ocean-v1.srt
```

### 2. Edit Versioning Convention — ANSWERED

Jan's naming convention (from real s3-staging data):

**First edit (David's Gling output):**
- `{project-code}.mp4` + `{project-code}.srt`
- e.g. `b64-bmad-claude-sdk.mp4`, `b83-ecamm-application.mp4`

**Jan's final edits (versioned):**
- `{project-code}-final-v{N}.mp4`
- e.g. `b64-final-v1.mp4`, `b64-final-v2.mp4`, ... `b64-final-v5.mp4`
- Sometimes: `{project-code}-final.mp4` (unversioned, first attempt)
- Sometimes: `b84-v2.mp4` (abbreviated)

**Pattern**: `{project-code}-final-v{N}.mp4` is the canonical versioned format. Up to v5 observed (b64 had 5 iterations).

### 3. Page Layout — ANSWERED

**Not a new top-level tab.** The top nav is already complex enough. Keep everything on the Manage page but rethink the internal layout — the left sidebar stays, but the centre content and right panel need to be context-sensitive and wider.

### 4. Multiple Editors — ANSWERED

**One editor (Jan), but he could be on either of two machines** (Jan's machine or Rome). Not simultaneous — it's the same person on whichever machine he's using. FliHub should support multiple editor machines in config, but in practice it's one editor at a time per project.

### 5. POEM WUI / AWB Send — ANSWERED

"POEM WUI" = Agent Workflow Builder (AWB). It's a separate application. The "Send to POEM WUI" button sends transcripts to AWB — it's not related to S3 Staging, just misplaced there. Should be relocated to a sensible location (near transcripts or as a standalone action) when the Manage page is rethought.

### 6. Machine Roles Clarification — ANSWERED

This is NOT a role management system. It's simply:
- Recorder machine: shows recorder-relevant actions (push recordings, archive, cleanup, promote)
- Editor machine: hides those actions — Jan doesn't need buttons that don't apply to him

One config field (`machineRole`) controls what's visible. That's it.

### 7. Archive to T7 — DEFERRED

No archive code exists — just folder exclusion filters. Archive to external T7 drive is out of scope for this campaign. Come back to it later.

## Remaining Open Questions

1. **Editor notification** — when David pushes recordings, how should Jan be notified? Socket event? Just SyncThing doing its thing?

---

## Success Criteria

- David can push recordings and see them land in the relay with full folder visibility
- David can collect edits (edit-1st and edit-2nd) from the relay
- David can promote an approved version to final/
- David can archive recordings and finals
- David can clean up the relay when ready
- The Manage page layout gives tools enough room to be usable
- Machine role determines what buttons are visible
- No shell injection vulnerabilities
- All relay code has test coverage
- Visual indicators show project pipeline status at a glance

---

## Reference Documents

- `docs/planning/relay-workflow-diagrams.md` — file flow diagrams, folder structures, archive model
- `docs/planning/requirements-relay-collaboration.md` — original David & Jan planning transcript
- `docs/planning/relay-collaboration-phase-1/assessment.md` — security audit findings
- `docs/planning/next-round-brief.md` — fix list from last session
- `docs/planning/architectural-review-relay-2026-03-19.md` — design decisions
