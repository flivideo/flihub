# Mental Model — FliHub Storage Architecture

**Captured**: 2026-04-08
**Context**: Pre-planning document for the archive offload campaign (B064). Captures the mental model that emerged from the disk observability campaign (B062) and the relay collaboration work.

---

## The Four Storage Locations

FliHub projects live across four distinct storage locations. Each has a different role, performance profile, and lifecycle signal.

```
┌────────────────────────────────────────────────────────────────┐
│  LOCAL NVMe (fast, limited ~1TB)                               │
│  ~/dev/video-projects/v-appydave/                              │
│  ├── b72-some-project/     ← active, flat = working            │
│  └── b65-another/         ← active                            │
├────────────────────────────────────────────────────────────────┤
│  RELAY (collaboration staging, NAS or shared mount)            │
│  ~/Relay/FliHub-appydave/                                      │
│  ├── b72-some-project/                                         │
│  │   ├── recordings/       ← pushed by Creator for Editor      │
│  │   ├── edit-1st/         ← returned by Editor                │
│  │   └── edit-2nd/         ← second-pass edits                 │
├────────────────────────────────────────────────────────────────┤
│  SSD T7 — HOLDING (temporary offload, flat structure)          │
│  /Volumes/T7/youtube-HOLDING/appydave/                         │
│  ├── b72-some-project/     ← parked, will come back            │
│  └── b65-another/         ← sibling flat, same as local        │
├────────────────────────────────────────────────────────────────┤
│  SSD T7 — PUBLISHED (permanent archive, grouped structure)     │
│  /Volumes/T7/youtube-PUBLISHED/appydave/                       │
│  ├── b00-b49/              ← range buckets signal "done"       │
│  │   └── b14-old-project/                                      │
│  └── b50-b99/                                                  │
│      └── b65-finished-video/                                   │
└────────────────────────────────────────────────────────────────┘
```

---

## The Semantic Signal in the Folder Structure

The distinction between HOLDING and PUBLISHED is not just organisational — **the folder structure itself encodes meaning**:

| SSD Root | Structure | Signal |
|----------|-----------|--------|
| `youtube-HOLDING` | Flat siblings | "Parked temporarily — active project, disk pressure only" |
| `youtube-PUBLISHED` | Range-bucketed groups (b00-b49 etc.) | "Done — finished video, this project is complete" |

When you browse the SSD:
- Flat folder at root level → offloaded for space, will return to local
- Folder inside a `b50-b99/` subfolder → published video, lifecycle complete

The range bucket groups were introduced to keep a human-browsable folder from growing to 200+ items. But they carry an implicit "done" meaning because that's when projects historically moved there. **FliHub honours that convention rather than muddying it.**

---

## Who Owns What

| Location | Managed by | Operation |
|----------|-----------|-----------|
| Local NVMe | FliHub | Read/write, active workflow |
| Relay | FliHub | Push/collect/promote |
| HOLDING SSD | FliHub (B064) | Offload / restore |
| PUBLISHED SSD | DAM (`dam archive`) | Permanent archive, range-bucketed |
| S3 | DAM (`dam s3-up/down`) | Cloud collaboration |

FliHub does not touch `youtube-PUBLISHED`. That remains DAM's domain. B064 introduces `youtube-HOLDING` as a new FliHub-managed location.

---

## The Relay System — What It Means for Offload

### What Relay Is

Relay is a bidirectional collaboration pipeline between the Creator machine (Mac Mini M4) and Editor machines (Jan's Mac Mini in Philippines, Mary's Mac Mini). Files flow both ways:

- **Creator → Editor**: Recordings pushed to relay for Jan to edit
- **Editor → Creator**: Edits returned via relay for Creator to review/promote

The relay directory lives at `config.relayDirectory` (typically `~/Relay/FliHub-appydave/`), with one subfolder per project.

### Why Relay Blocks Offload

If a project has files in any relay subfolder (`recordings/`, `edit-1st/`, `edit-2nd/`), it means active collaboration is happening. Offloading that project off the local machine would:
- Remove local context that FliHub needs to compute divergence
- Break the `promote` workflow (edit-2nd → final/ requires local project directory)
- Confuse Jan/Mary who expect the project to be accessible

**Rule: A project with any relay files cannot be offloaded until relay is cleared.**

Detection: relay presence is captured in `DiskSizeData.rRec + r1st + r2nd > 0`, or by checking the relay directory directly.

### The Flows That Cannot be Confused

1. **Relay** (Creator ↔ Editor): Bidirectional, temporary staging, requires local project presence
2. **HOLDING offload** (FliHub): Creator-only, moves project to SSD holding area
3. **PUBLISHED archive** (DAM): Creator-only, moves finished project to grouped SSD area
4. **S3** (DAM): Cloud collaboration, separate from both SSD locations

---

## Config Keys

Two SSD config keys in `config.json`:

```json
"archivePath": "/Volumes/T7/youtube-PUBLISHED/appydave",
"holdingPath": "/Volumes/T7/youtube-HOLDING/appydave"
```

- `archivePath` — already wired in B062, used by DAM, range-bucketed destination
- `holdingPath` — new in B064, flat destination for temporary offload

FliHub B064 reads `holdingPath`. The `archivePath` field remains in config for DAM cross-reference but FliHub does not write to it.

---

## The Range Folder Pattern (DAM — PUBLISHED only)

The range-bucket pattern applies only to `youtube-PUBLISHED`:

```
project code → range bucket → SSD path
b72         → b50-b99      → /Volumes/T7/youtube-PUBLISHED/appydave/b50-b99/b72-project-name/
b14         → b00-b49      → /Volumes/T7/youtube-PUBLISHED/appydave/b00-b49/b14-project-name/
```

Formula: `rangeStart = Math.floor(numericPart / 50) * 50` → `"${letter}${pad(rangeStart)}-${letter}${pad(rangeStart+49)}"`

`youtube-HOLDING` uses no range folders — projects sit flat, same structure as local:

```
/Volumes/T7/youtube-HOLDING/appydave/b72-project-name/   ← direct sibling
```

---

## What the Offload Operation Does

### Hold on SSD (copy — safe default)
1. Check SSD is mounted (`holdingPath` accessible)
2. Check relay has no files (hard block if rRec + r1st + r2nd > 0)
3. Destination: `holdingPath + "/" + projectFolderName` (flat — no range subfolder)
4. `rsync -a src/ dest/` — preserves all metadata, resumes if interrupted
5. Update disk cache with `heldAt` + `holdingPath` fields
6. Optionally update project stage override to 'on-hold' (future stage addition)

### Delete Local (separate step, explicit confirmation)
- Only offered after a successful hold copy
- Shows the disk space that will be freed
- Requires typing the project code to confirm
- FliHub server refuses if `holdingPath` copy does not exist

### Restore
1. Check SSD is mounted
2. `rsync -a holdingPath/projectFolder/ localDir/` back to flat local position
3. Clear `heldAt`/`holdingPath` from disk cache
4. Project reappears in active list

---

## What FliHub Excludes from Offload Consideration

- Projects with relay active → hard block
- Projects currently being recorded (stage = 'recording') → warn but allow override
- The relay directory itself → relay is not offloaded through FliHub
- `s3-staging/` contents → S3 is managed by DAM

---

## Disk Pressure Context (from B062)

The disk observability work (B062) gave us per-project disk breakdowns. This is the direct motivator for offload: once you can see which projects are consuming the most space, you want to act on it.

The most common offload candidates:
- Large `rec` column, no relay activity → safe to park on HOLDING
- `stage: 'published'` → strong candidate for permanent DAM archive instead
- Zero `rRec + r1st + r2nd` → relay clear, offload unblocked

The ProjectsPanel disk columns (B062) + SSD offload (B064) form a two-step workflow: observe disk usage → act on it.
