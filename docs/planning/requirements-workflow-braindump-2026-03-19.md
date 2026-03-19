# Workflow Braindump — FliHub Future Direction

**Captured**: 2026-03-19 (David, via conversation)
**Status**: Raw capture — needs refinement before planning

---

## 1. Local Project Structure (current)

Everything is local to one project. David routes recordings by chapter/segment. Each project has:
- `recordings/` — named video files
- `recording-transcripts/` — `.txt` + `.srt`
- `recording-shadows/` — low-res derivatives (questionable — see below)
- Other assets: text + media assets **not well covered in FliHub yet**

**Shadow videos concern**: May be a legacy concept. If SyncThing/relay can sync originals quickly to Jan, shadows become unnecessary. Worth evaluating removal once relay is working.

---

## 2. Quick Project Switching

David needs to quickly switch the active project for a recording session and then return (or not). This is partially supported today (`activeProject` in config, project dropdown). Needs to be fast and non-disruptive.

---

## 3. B-Roll and Asset Generation

David wants B-roll and other asset generation based on:
- Transcripts (existing source)
- Claude Code context streams (new — separate system, but output needs to attach to the project)

Asset generation may be done by David (local agents) or by Jan. Either way, the output needs to land in the project in a structured way. The `inbox/` folder partially covers this but is not fully designed for it.

---

## 4. Multi-Brand Separation

David wants to separate two brands into separate video project roots:
- `v-appydave` — AppyDave brand videos (current)
- `v-claudinglab` — Clauding Lab brand (formerly AppyCast, AppyDaveResearch, now @claudinglab)

Implication: FliHub's `projectsRootDirectory` is currently a single path. Multi-brand means either:
- Two separate FliHub instances (one per brand root), or
- FliHub supports multiple roots with brand switching

---

## KEY CONSTRAINT — SyncThing + Git Folders Don't Mix

**SyncThing CANNOT be used on `v-appydave/` or any git-tracked project folder.** Two blockers:
1. Technical: SyncThing cannot interact with git folders
2. Pragmatic: folders are too large (no NAS, limited disk space on Macs)

**Relay folders** (`~/relay/david-jan`, `~/relay/flihub-appydave`) are **separate, temporary** file-share buckets — NOT git repos, NOT project directories. They exist only for passing files peer-to-peer. They have disk space constraints (no unlimited storage).

**What IS in git**: Images, text, state files (`.flihub-state.json`), transcripts — anything small.

**What is NOT in git**: `recordings/*.mp4`, 1st/2nd edit files — too large. These travel via S3 (existing DAM infrastructure) or relay (for temporary peer transfer).

**Jan's current view of recordings**: Shadow videos — 200px low-res derivatives committed to git. Jan can see what David has recorded (visual reference) but cannot edit from them. Shadows are a fallback, not a workflow tool.

---

## 5. Edit Workflow (current + relay evolution)

### Current S3 workflow:
1. David records → chapters/segments named in FliHub
2. David drags recordings into **Gling.AI** → merges → edits → exports
3. Export goes to **1st-edit** on S3 as `.mp4` (or `.mov`) + `.srt`
4. Jan does S3 sync → downloads 1st edit
5. Jan does **2nd-edit** in Camtasia/DaVinci — transitions, B-roll overlay etc.
6. Jan exports `v1`, `v2` etc. as `.mp4` + `.srt` → pushes to S3
7. David pulls → publishes

### Jan taking over Gling work (the actual goal)

David wants Jan to do the Gling edit — not just the 2nd edit. This means Jan needs raw recordings BEFORE the Gling step. New workflow target:

```
David records → David pushes to relay → SyncThing auto-syncs → Jan collects
→ Jan drags into Gling → Gling edit → Jan exports to relay
→ SyncThing auto-syncs → David collects → David publishes
```

Jan should ideally store files in the **same folder structure** as David:
`video-projects/v-appydave/b17-xmen/recordings/` on Jan's machine.

**Relay is bidirectional** — not David→Jan only:
- David pushes: raw recordings → relay → Jan
- Jan pushes back: 1st edit (mp4+srt), 2nd edit, text/image/broll assets → relay → David

**Disk space + cleanup** (both machines are constrained):
- After relay transfer, both sides clean up relay copies (relay = temporary staging, not archive)
- David is **canonical** for backups — he keeps final copies
- David needs files BACK from Jan: 1st/2nd edits + any text/image/broll Jan added to the project
- FliHub needs to know what's been sent/received to guide cleanup safely

### Sharing raw recordings with Jan (the real problem)

The core gap: Jan receives 1st-edit (already Gling-processed) via S3, but **never gets raw recordings**. If Jan could do the Gling edit himself, David saves that step.

To share raw recordings, something must copy them OUT of `v-appydave/b17/recordings/` to a transfer location Jan can access. Three options:

| Option | Mechanism | Pros | Cons |
|--------|-----------|------|------|
| A | S3 via DAM | Already working, reliable | David must manually push; Jan must pull |
| B | Relay folder (SyncThing) | P2P, fast when both online | Fragile, disk space limited, can't touch git folders |
| C | Relay folder → S3 as fallback | Best of both | Complex, two systems |

**Jan's git sync**: Jan does `git pull/push` for small files (text, images, state, transcripts). NOT for recordings or edits. Git sync button = sync the non-heavy project state, not video files.

**1st/2nd edit naming** (TBC): David thinks they might be called "pre-edit" and "post-edit". Currently S3 synced via DAM.

---

## 6. Asset Generation — Distributed Authorship

Assets may be generated by:
- David + local agents (on David's machine)
- Jan (on Jan's machine)
- Either from transcripts or Claude Code context streams

These all need to end up attached to the correct project in FliHub. The relay/sync mechanism needs to handle asset files (images, text, prompts) not just video files.

---

## Brand + Sync Convention (confirmed)

- Each brand has: own `v-[brand]` folder, own S3 bucket, own relay folder
- All follow convention: `video-projects/v-[brandname]/`
- e.g., `v-appydave`, `v-claudinglab`
- Relay folders follow same naming: `~/relay/flihub-appydave`, `~/relay/flihub-claudinglab`
- One brand active at a time in FliHub — but config holds list of known brands
- Git sync = all projects in the active brand root (one repo per brand root)
- SyncThing: automatic but needs a **trigger** — both send (David) and receive (Jan) need FliHub UI

## Clarified Design Decisions (2026-03-19)

**Jan's FliHub (answered)**: Jan runs the same FliHub app for now. Long-term direction: either a separate editor app or a profile/persona system (YouTuber profile vs Editor profile showing simplified/different UI areas). Gling is permanently moving to Jan — David no longer has time for it.

**Relay auto-place — 3-phase build plan (answered)**:
- Phase 1: Manual button — "Collect from relay" / "Push to relay" buttons in FliHub UI
- Phase 2: Watcher + auto-pulse — watcher detects new relay files, auto-triggers the button
- Phase 3: Full automation — no manual step needed

**Cleanup (answered)**: Manual, at user discretion. Happens after the video is published. FliHub does not automate cleanup. No need to track "safe to delete" state — user decides.

---

## Relay Path Convention (confirmed — same/same mirroring)

```
v-appydave/b17-xmen/recordings/1-1-intro.mp4
    → ~/relay/flihub-appydave/b17-xmen/recordings/1-1-intro.mp4

v-appydave/b17-xmen/edit-1st/video.mp4
    → ~/relay/flihub-appydave/b17-xmen/edit-1st/video.mp4
```

Same relative path on both sides. Applies to: recordings, 1st edit, 2nd edit, assets.

**Copies are diff-aware** — not a full replace. FliHub must detect and handle:
- New file added (`4-2-outro-bts.mp4` → copy across)
- File replaced (`1-3-intro.mp4` updated → overwrite)
- File deleted (`3-2-content.mp4` removed → delete from relay)

This applies in both directions (David→relay and Jan→relay→David).

---

## Open Questions (remaining)

1. **Shadow videos**: Keep — Jan's only view of unshared recordings. Remove only once relay Phase 2+ is stable.
2. **Relay vs S3 for edits**: Relay for raw recordings (confirmed). For 1st/2nd edits — does relay replace S3 or run alongside? S3 is more reliable; relay is faster when both online.
3. **Asset inbox for Claude Code context streams**: How do AI-generated assets (B-roll prompts, text) reach a project? `inbox/` exists but isn't fully designed for this.
4. **Git commit message**: Auto timestamp ("FliHub sync 2026-03-19 14:32") or user-provided?
5. **v-claudinglab sync**: Same patterns as v-appydave (own relay folder `flihub-claudinglab`, own S3 bucket). When Jan starts on claudinglab — separate relay, separate git repo.

---

## Architectural Implications

- `projectsRootDirectory` needs to become multi-brand aware (or FliHub runs as two instances)
- `inbox/` needs richer structure to handle asset types from multiple sources
- Relay watcher needs to handle video files AND asset files
- Shadow video removal would simplify `WatcherManager` and `ProjectPaths`
- Jan's v-appydave sync = git repo at v-appydave root (not per-project) — confirmed
