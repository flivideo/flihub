# FR-153: Storage Workflow Redesign — Hold, Archive, Restore

**Date:** 2026-04-09  
**Status:** Pending  
**Source:** UX audit after user feedback ("archive, offload, and restore are a mess")

---

## Background

The current storage workflow has three problems:
1. **Missing features** — no way to archive a finished project to `youtube-PUBLISHED` or a failed project to `youtube-FAILS`. Only `youtube-HOLDING` is wired up.
2. **Broken UX** — the offload flow is a hidden 3-step process with confusing button labels and a completion step styled like a danger warning.
3. **No visibility** — the Disk table shows GB numbers but has no column showing which projects are on the SSD, held, or archived.

---

## Mental Model (source of truth for all naming)

Three states. Everything else is a transition.

```
Active  ──── Hold ────►  Held  ──── Archive ────►  Archived
        ◄─── Restore ───
```

| State | Meaning | Location |
|-------|---------|----------|
| **Active** | Being worked on (or waiting) | Local disk |
| **Held** | Temporarily off local to free space — can restore | T7 / youtube-HOLDING |
| **Archived** | Permanently done — Published or Failed | T7 / youtube-PUBLISHED or youtube-FAILS |

---

## Changes Required

### 1. Unified Terminology Pass

Replace all inconsistent naming everywhere (UI labels, config fields, section headers):

| Old | New |
|-----|-----|
| "SSD Offload" (section header) | "Storage Location" |
| "Offload to SSD" (button) | "Hold Project" |
| "Free X GB — Delete Local" (button) | Removed (absorbed into Hold action) |
| "Cancel — Remove SSD copy" | "Cancel Hold" |
| "Restore from SSD" | "Restore to Local" |
| "Re-run rsync" | "Retry Hold" |
| "Location: SSD only (local deleted)" | "Held on T7" |
| "Location: Local only" | "On Local Disk" |
| "SSD not connected" | "T7 not connected" |
| `holdingPath` in config | Keep internally, never show raw folder name in UI |

---

### 2. Hold Project — Single Atomic Action

Replace the current two-step (copy then separate delete) with one committed action:

**Trigger:** User clicks "Hold Project" button  
**Flow:**
1. Show confirmation modal with clear explanation (see wireframe below)
2. On confirm: copy files → verify file count matches → delete local — all in sequence
3. On success: section shows "Held on T7" with "Restore to Local" button
4. On failure at any step: surface error with specific step that failed, keep local copy intact

The intermediate "Offload incomplete — space not freed yet" state should only appear as an **error recovery** state, not the normal flow. If the user has an existing incomplete hold from before this change, show:  
> "Hold incomplete — local files still present. [Verify & Complete] or [Cancel Hold]"

**Confirmation modal wireframe:**
```
┌─────────────────────────────────────────────────────┐
│  Hold Project: c36-archon-bmad                      │
│                                                     │
│  This will:                                         │
│  1. Copy 1.5 GB → /Volumes/T7/youtube-HOLDING       │
│  2. Verify all 16 files copied correctly            │
│  3. Delete local copy to free disk space            │
│                                                     │
│  You can restore at any time while T7 is connected. │
│                                                     │
│  [ Cancel ]        [ Hold Project — Free 1.5 GB ]   │
└─────────────────────────────────────────────────────┘
```

---

### 3. Archive Actions — Wire Up PUBLISHED and FAILS

Add `publishedPath` and `failsPath` to `config.json` (alongside existing `holdingPath`).

Add two new storage actions in the drawer's Storage Location section:

**"Archive as Published"** — for finished videos  
- Rsyncs project from local (or HOLDING) → `youtube-PUBLISHED/appydave/`
- Deletes local copy and HOLDING copy if present
- Permanent — no restore
- Auto-sets project stage to `published`

**"Archive as Failed"** — for shelved/abandoned videos  
- Rsyncs project from local (or HOLDING) → `youtube-FAILS/appydave/`
- Deletes local copy and HOLDING copy if present
- Permanent — no restore
- Auto-sets project stage to `shelved`

Both require a confirmation modal explaining the action is permanent.

**Stage-aware suggestions** — show the most relevant action prominently based on project stage:

| Stage | Primary action | Secondary action |
|-------|---------------|-----------------|
| `published` | Archive as Published | Hold Project |
| `shelved` | Archive as Failed | Hold Project |
| `recording`, `first-edit`, `second-edit`, `ready-to-publish` | Hold Project | — |
| `planning` | — | — |

---

### 4. SSD Status Column in Disk Table

Add a `STORAGE` column to the Disk table view (between MODIFIED and TOTAL, or after TOTAL):

| Value | Display |
|-------|---------|
| Active (local) | — (no decoration, default) |
| Held on T7 | `● Held` (amber dot + text) |
| Archived (published) | `✓ Published` (green check) |
| Archived (failed) | `✗ Failed` (muted red) |

Column should be sortable so David can scan "what's on the SSD" in one click.

---

### 5. Relay Blocker — Add Navigation Shortcut

When relay files are blocking a hold, show a direct navigation link:

```
⚠ Relay active — 1.1 GB in relay subfolders
Recordings: 392 MB  |  1st Edit: 469 MB  |  2nd Edit: 314 MB

[ Go to Relay → ]
```

"Go to Relay" navigates to Manage → Relay for the current project.

---

### 6. T7 Header Button — Summary Popover

When T7 is connected, clicking the header pill shows a summary popover instead of navigating to Projects:

```
T7 — Connected
──────────────────────────────
Held        1 project   1.5 GB
Published   94 projects
Failed      3 projects

[ View Held Projects ]
```

"View Held Projects" applies a filter to the Projects Disk view showing only held/archived projects.

---

## Files to Change

| File | Change |
|------|--------|
| `server/config.json` + `config.template.json` | Add `publishedPath`, `failsPath` |
| `shared/types.ts` | Add config fields, add `StorageLocation` type with `'active' \| 'held' \| 'published' \| 'failed'` |
| `server/src/routes/hold.ts` | Refactor hold to atomic operation, add archive-to-published and archive-to-failed endpoints |
| `client/src/components/ProjectDrawer.tsx` | Redesign Storage Location section with new flow, stage-aware suggestions |
| `client/src/components/ProjectsPanel.tsx` | Add STORAGE column to Disk view |
| `client/src/App.tsx` | T7 button → popover with summary |
| New: `client/src/hooks/useArchiveApi.ts` | Hooks for archive-to-published, archive-to-failed |

---

## Acceptance Criteria

- [ ] Section is labelled "Storage Location" (not "SSD Offload")
- [ ] "Hold Project" is a single action — copy + verify + delete local in one flow with confirmation modal
- [ ] "Archive as Published" rsyncs to `youtube-PUBLISHED`, auto-sets stage to `published`, is permanent
- [ ] "Archive as Failed" rsyncs to `youtube-FAILS`, auto-sets stage to `shelved`, is permanent
- [ ] Stage-aware: Pub projects see "Archive as Published" first, Shelved projects see "Archive as Failed" first
- [ ] Disk table has a STORAGE column showing Active / Held / Published / Failed per project
- [ ] Relay blocker shows "Go to Relay →" navigation button with per-subfolder byte counts
- [ ] T7 header button shows summary popover with counts per destination, not a full page nav
- [ ] No UI text says "hold", "offload", "SSD offload", or "holding" — all replaced per terminology table
- [ ] Incomplete hold state (legacy) surfaces as error recovery, not normal flow

---

## Out of Scope

- Restore from PUBLISHED (permanent archive stays permanent — if you need the files, do it manually in Finder)
- Multi-project batch hold/archive
- Progress bar for large transfers (can be a follow-up)
