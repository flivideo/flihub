# Relay Workflow Diagrams

> How files move between David's recording machine, the Dropbox (SyncThing relay), and editor machines (Jan, Rome, etc.)

---

## 1. High-Level Flow — Recording to Published

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DAVID'S MACHINE (M4 Mini)                        │
│                           "The Recorder"                                │
│                                                                         │
│  Ecamm Live                                                             │
│      │                                                                  │
│      ▼                                                                  │
│  ~/ecamm/  ──(FliHub watches)──►  recordings/                          │
│                                    01-1-intro.mov                       │
│                                    02-1-setup.mov                       │
│                                    02-2-setup.mov                       │
│                                                                         │
│  David CAN do Gling locally ──►  edit-1st/                             │
│  (reads directly from               gling-output.mp4                   │
│   recordings/ folder)               gling-output.srt                   │
│                                                                         │
│  OR                                                                     │
│                                                                         │
│  David pushes to Dropbox ─────────────────────────────────────┐        │
│                                                                │        │
│  David collects from Dropbox ◄────────────────────────────────┼──┐     │
│      ▼                                                         │  │     │
│  edit-1st/  (Gling results from Jan)                          │  │     │
│  edit-2nd/  (Final edits from Jan, v1/v2/v3)                  │  │     │
│      ▼                                                         │  │     │
│  David reviews ──► approves ──► publish                       │  │     │
└────────────────────────────────────────────────────────────────┼──┼─────┘
                                                                 │  │
                    ┌────────────────────────────────────────────┘  │
                    │                                               │
                    ▼                                               │
┌─────────────────────────────────────────────────────────────────────────┐
│                     DROPBOX (SyncThing Relay)                           │
│                  ~/relay/flihub-appydave/                               │
│                                                                         │
│  Auto-syncs peer-to-peer between all connected machines                │
│                                                                         │
│  [project-code]/                                                        │
│      recordings/          ◄── David pushes raw recordings here         │
│      edit-1st/            ◄── Jan pushes Gling output here             │
│      edit-2nd/            ◄── Jan pushes final edits here (v1,v2,v3)   │
│                                                                         │
│  Anything written here appears on ALL connected machines               │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  JAN'S MACHINE               │  │  ROME (or other editors)     │
│                              │  │                              │
│  Dropbox lands recordings    │  │  Same structure as Jan       │
│      ▼                       │  │  (can have many editors)     │
│  recordings/                 │  │                              │
│  (copied from relay)         │  │                              │
│      ▼                       │  │                              │
│  Opens in Gling              │  │                              │
│      ▼                       │  │                              │
│  edit-1st/                   │  │                              │
│    gling-output.mp4          │  │                              │
│    gling-output.srt          │  │                              │
│      ▼                       │  │                              │
│  Edits in Camtasia/DaVinci   │  │                              │
│      ▼                       │  │                              │
│  edit-2nd/                   │  │                              │
│    final-v1.mp4  final-v1.srt│  │                              │
│    final-v2.mp4  final-v2.srt│  │                              │
│      ▼                       │  │                              │
│  Pushes to Dropbox           │  │                              │
└──────────────────────────────┘  └──────────────────────────────┘
```

---

## 2. Step-by-Step File Journey

```
STEP 1: RECORD
══════════════
David records in Ecamm Live → files land in ~/ecamm/
FliHub watches, David names them → they move to project recordings/

  David's Machine
  └── v-appydave/c32-bmad-v6-epic1-foundation/
      └── recordings/
          ├── 01-1-intro.mov
          ├── 02-1-setup.mov
          ├── 02-2-setup.mov
          └── 02-3-setup.mov


STEP 2: PUSH TO DROPBOX
════════════════════════
David clicks "Push Recordings" in FliHub → rsync to relay folder
SyncThing auto-syncs to all connected machines

  David's Machine                          Dropbox (SyncThing)
  recordings/ ──── rsync ────────────►     ~/relay/flihub-appydave/
      01-1-intro.mov                         c32-bmad-v6-epic1-foundation/
      02-1-setup.mov                           recordings/
      02-2-setup.mov                             01-1-intro.mov
      02-3-setup.mov                             02-1-setup.mov
                                                 02-2-setup.mov
                                                 02-3-setup.mov

                                                    │
                                            SyncThing auto-sync
                                                    │
                                                    ▼

                                           Jan's Machine
                                             ~/relay/flihub-appydave/
                                               c32-bmad-v6-epic1-foundation/
                                                 recordings/
                                                   01-1-intro.mov
                                                   02-1-setup.mov
                                                   ...


STEP 3: JAN INGESTS RECORDINGS
══════════════════════════════
Jan's FliHub copies from relay → his local recordings/ folder
(recordings/ is NOT in git — this is the only way to get them there)

  Jan's Machine
  ~/relay/.../recordings/  ──── copy ────►  ~/dev/video-projects/v-appydave/
                                              c32-bmad-v6-epic1-foundation/
                                                recordings/
                                                  01-1-intro.mov
                                                  02-1-setup.mov
                                                  ...


STEP 4: GLING (First Edit)
═══════════════════════════
Jan opens recordings in Gling → edits → exports video + SRT

  Jan's Machine
  recordings/  ──── Gling reads ────►  Gling app
      01-1-intro.mov                      │
      02-1-setup.mov                      │ edit & export
      ...                                 ▼
                                       edit-1st/
                                         gling-output.mp4
                                         gling-output.srt


STEP 5: GLING RESULTS → DROPBOX → DAVID
════════════════════════════════════════
Jan pushes edit-1st/ to relay → SyncThing syncs → David collects

  Jan's Machine                          Dropbox                           David's Machine
  edit-1st/  ──── push ────►  .../edit-1st/  ──── SyncThing ────►  relay arrives
    gling-output.mp4            gling-output.mp4                        │
    gling-output.srt            gling-output.srt                   "Collect Edits"
                                                                        │
                                                                        ▼
                                                                   edit-1st/
                                                                     gling-output.mp4
                                                                     gling-output.srt

  David can watch/review the Gling output (optional)


STEP 6: JAN EDITS (Second Edit)
═══════════════════════════════
Jan takes Gling output → edits in Camtasia/DaVinci → versioned output

  Jan's Machine
  edit-1st/  ──── import to editor ────►  Camtasia / DaVinci Resolve
    gling-output.mp4                          │
    gling-output.srt                          │ edit, refine, iterate
                                              ▼
                                           edit-2nd/
                                             final-v1.mp4    final-v1.srt
                                             final-v2.mp4    final-v2.srt  (if revisions needed)
                                             final-v3.mp4    final-v3.srt


STEP 7: FINAL EDITS → DROPBOX → DAVID
═════════════════════════════════════
Same flow: push to relay → SyncThing → David collects into edit-2nd/

  Jan's Machine                          Dropbox                           David's Machine
  edit-2nd/  ──── push ────►  .../edit-2nd/  ──── SyncThing ────►    edit-2nd/
    final-v1.mp4                final-v1.mp4                           final-v1.mp4
    final-v1.srt                final-v1.srt                           final-v1.srt
    final-v2.mp4                ...                                    ...


STEP 8: REVIEW & PUBLISH
════════════════════════
David reviews edit-2nd/ versions → approves → publishes

  David's Machine
  edit-2nd/
    final-v1.mp4  ◄── David watches, requests changes if needed
    final-v2.mp4  ◄── Jan iterates, new versions appear via Dropbox
    final-v3.mp4  ◄── David approves this one
        │
        ▼
    PUBLISH (YouTube, etc.)


STEP 9: PROMOTE TO FINAL
════════════════════════
David approves a version from edit-2nd/ → promotes it to final/
Promotion = "this is done" — signals archive-worthy status

  David's Machine
  edit-2nd/
    final-v1.mp4
    final-v2.mp4
    final-v3.mp4  ◄── David approves this one
        │
        ▼  PROMOTE
    final/
      final-v3.mp4   ◄── the approved version
      final-v3.srt


STEP 10: ARCHIVE (David's machine only)
═══════════════════════════════════════
Only two things get archived:
  recordings/  → ARCHIVE (raw source material — irreplaceable)
  final/       → ARCHIVE (approved output — the finished product)

  edit-1st/    → disposable (Gling output — can be regenerated)
  edit-2nd/    → disposable (editor iterations — only final matters)


STEP 11: RELAY CLEANUP (separate, manual, David decides)
════════════════════════════════════════════════════════
David clears the Dropbox relay when HE is ready — not tied to archive.
Could be same day, could be days later.

  WARNING: Deletion in relay auto-propagates via SyncThing
  to ALL editor machines. Only do this when editors are done.

  Dropbox (relay)
  [project]/recordings/  → DELETE (David decides when)
  [project]/edit-1st/    → DELETE
  [project]/edit-2nd/    → DELETE

  Editor machines see these deletions automatically via SyncThing.
  Editors can also manually clean their own local copies independently.
```

---

## 3. Folder Structures — Three Real Projects

### David's Machine (M4 Mini — The Recorder)

```
~/dev/video-projects/v-appydave/
│
├── c32-bmad-v6-epic1-foundation/          ◄── ACTIVE PROJECT
│   ├── recordings/                         ◄── raw from Ecamm (11 files)
│   │   ├── 01-1-intro.mov
│   │   ├── 02-1-setup.mov
│   │   ├── 02-2-setup.mov
│   │   ├── 02-3-setup.mov  ... (8 more)
│   │   └── 03-2-epic1-story1.mov
│   ├── recording-shadows/                  ◄── 240p previews (auto-generated)
│   │   ├── 01-1-intro.mp4
│   │   └── ...
│   ├── recording-transcripts/              ◄── WhisperAI output (git tracked)
│   │   ├── 01-1-intro.txt
│   │   ├── 01-1-intro.srt
│   │   └── ...
│   ├── edit-1st/                           ◄── Gling output (video + SRT)
│   ├── edit-2nd/                           ◄── Jan's final edits (v1, v2, v3)
│   ├── assets/
│   │   ├── images/
│   │   └── thumbs/
│   ├── final/                              ◄── approved for publish
│   └── -trash/
│
├── b81-dam-command-line/
│   ├── recordings/
│   │   ├── 01-1-intro.mov
│   │   ├── 02-1-scenario.mov  ... (10 files)
│   │   └── 05-2-better-stack.mov
│   ├── recording-transcripts/
│   ├── edit-1st/
│   ├── edit-2nd/
│   └── s3-staging/                         ◄── legacy (being replaced by relay)
│
└── b86-claudemas-01-jump/
    ├── recordings/
    ├── edit-1st/
    └── edit-2nd/
```

### Dropbox — SyncThing Relay (exists on ALL machines)

```
~/relay/flihub-appydave/
│
├── c32-bmad-v6-epic1-foundation/
│   ├── recordings/                         ◄── David pushes here
│   │   ├── 01-1-intro.mov
│   │   ├── 02-1-setup.mov
│   │   └── ...
│   ├── edit-1st/                           ◄── Jan pushes Gling output here
│   │   ├── gling-output.mp4
│   │   └── gling-output.srt
│   └── edit-2nd/                           ◄── Jan pushes final edits here
│       ├── final-v1.mp4
│       ├── final-v1.srt
│       └── ...
│
├── b81-dam-command-line/
│   ├── recordings/
│   ├── edit-1st/
│   └── edit-2nd/
│
└── b86-claudemas-01-jump/
    ├── recordings/
    ├── edit-1st/
    └── edit-2nd/
```

### Jan's Machine (or Rome — Editor Machine)

```
~/dev/video-projects/v-appydave/            ◄── Jan's local FliHub projects
│
├── c32-bmad-v6-epic1-foundation/
│   ├── recordings/                         ◄── PULLED from relay (not from git)
│   │   ├── 01-1-intro.mov                     Jan's FliHub copies relay → here
│   │   ├── 02-1-setup.mov                     so Gling can read them
│   │   └── ...
│   ├── recording-shadows/                  ◄── optional: 240p previews for quick review
│   ├── recording-transcripts/              ◄── from git (small files sync via git)
│   ├── edit-1st/                           ◄── Jan's Gling output lands here
│   │   ├── gling-output.mp4                   then gets pushed to relay
│   │   └── gling-output.srt
│   ├── edit-2nd/                           ◄── Jan's Camtasia/DaVinci output
│   │   ├── final-v1.mp4
│   │   ├── final-v1.srt
│   │   ├── final-v2.mp4                       versioned until David approves
│   │   └── final-v2.srt
│   └── assets/                             ◄── from git (images, thumbs)
│
└── (other projects Jan is assigned to)

~/relay/flihub-appydave/                    ◄── SAME relay folder, synced by SyncThing
    (mirror of David's relay — auto-synced)
```

---

## 4. Direction of Flow — Who Pushes What Where

```
                    RECORDINGS              GLING (edit-1st)         FINAL EDITS (edit-2nd)
                    ══════════              ════════════════         ══════════════════════

David's Machine    recordings/ ────►        ◄──── edit-1st/          ◄──── edit-2nd/
                        │          push         │   collect               │   collect
                        ▼                       │                        │
Dropbox (relay)    recordings/ ◄───►        edit-1st/ ◄───►          edit-2nd/ ◄───►
                   SyncThing auto           SyncThing auto           SyncThing auto
                        │                       ▲                        ▲
                        ▼                       │                        │
Jan's Machine      recordings/ ◄───         edit-1st/ ────►          edit-2nd/ ────►
                        ingest         push from Gling          push from editor


ARROWS SUMMARY:
  David  ──push──►  Relay  ──SyncThing──►  Jan     (recordings going OUT)
  David  ◄──collect──  Relay  ◄──SyncThing──  Jan   (edits coming BACK)
```

---

## 5. Archive & Cleanup — Three Separate Concerns

```
CONCERN 1: ARCHIVE (David's machine only)
══════════════════════════════════════════
What gets preserved long-term:

  recordings/  → ARCHIVE    (raw source — irreplaceable, always back up)
  final/       → ARCHIVE    (approved output — the finished product)
  edit-1st/    → DISPOSABLE (Gling output — can be regenerated from recordings)
  edit-2nd/    → DISPOSABLE (editor iterations — only the promoted final matters)


CONCERN 2: PROMOTION (edit-2nd → final)
═══════════════════════════════════════
When David approves a version, it moves from edit-2nd/ to final/
This promotion is the signal that the project is "done" and archive-worthy.

  edit-2nd/final-v3.mp4  ──► promote ──►  final/final-v3.mp4
  edit-2nd/final-v3.srt  ──► promote ──►  final/final-v3.srt


CONCERN 3: RELAY CLEANUP (independent, manual, David decides)
═════════════════════════════════════════════════════════════
NOT tied to archive. David clears the Dropbox when he's ready.

  Dropbox (relay)                         Editor machines
  ───────────────                         ───────────────
  [project]/recordings/  → DELETE         Editors can clean their own
  [project]/edit-1st/    → DELETE         local copies independently.
  [project]/edit-2nd/    → DELETE         SyncThing propagates relay
                                          deletions automatically.

  ⚠ WARNING: Deleting from relay propagates to ALL editor machines
  via SyncThing. Only clean relay when editors are finished.


ROLE-BASED CONTROLS:
  David (recorder):  archive, promote, relay cleanup buttons in FliHub
  Jan (editor):      NO destructive buttons — manual cleanup only
```

---

## 6. Visual Indicators — TODO

```
NEEDED: Clear visual indicators across the workflow so David can see at a glance:
  - What stage each project is at
  - What's sitting in the relay (and for which projects)
  - What's been sent to editors / what's come back
  - What's been archived vs still live
  - What's in edit-1st, edit-2nd, final for each project

This likely requires multiple screens or views within FliHub.
Rough screen mockups and indicator design needed — not yet scoped.
```
