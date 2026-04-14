# Requirements: Offload UX Redesign

**Date**: 2026-04-13
**Stakeholder**: David (creator machine only)
**Source**: UX audit of archive-offload system (B064/B065)

---

## Problem Statement

The archive/offload system (hold to T7, restore, delete) works mechanically but is undiscoverable. All actions are buried in a drawer section (ProjectDrawer → SSD Offload, below 5 other sections). David's words: "I don't know where to find anything for doing the archives. I don't know how to put stuff on hold. I don't know how to restore. I don't know how to delete locally. There's no unified approach."

The T7 header pill shows mount status but clicking it just opens the Projects tab unfiltered — a dead end. Table row badges ("T7", "T7 ⚠") are informational only with no actions.

## Who

David only. Creator machine. He controls all backup decisions.

## Primary Jobs

1. **Free up space** — "I have a full disk, I need to offload projects to the T7 SSD"
2. **Find and restore** — "I need a project back from the T7"

Free-up-space is the primary scenario. Restore is secondary but must be easy when needed.

## Requirements

### R1: Dedicated Manage tool for offload/restore

Add a new tool to the Manage page sidebar — something like "Storage" or "SSD Offload". When selected, it owns the center content area (same pattern as Rename, Relay, etc.).

This becomes the **single home** for all backup/restore operations on the active project:
- See current location status (local / T7 / both)
- Offload to T7
- Restore from T7
- Delete local copy (after verified offload)
- Delete T7 copy (cancel offload)
- Preview (dry run) before offload

### R2: Clear status — where is this project?

The tool should immediately show:
- Where the project lives right now (local only / on T7 / both copies exist)
- Whether the T7 SSD is connected
- Disk usage context — how much space this project uses locally, how much would be freed

No 9-state complexity. Three user-facing states:
1. **Local only** → can offload
2. **On T7 only** → can restore
3. **Both copies** → mid-transfer, can finish (delete local) or cancel (delete T7 copy)

Blocked states (relay active, SSD not mounted) show as disabled actions with inline reason text — not separate UI states.

### R3: T7 header pill becomes useful

When clicked, the T7 pill should navigate to the Manage page with the offload tool selected — not dump the user on an unfiltered Projects tab.

### R4: Restore gets lightweight confirmation

Currently "Restore from SSD" fires immediately with no confirmation. It should have a simple confirm step (not typed-code level — just "Restore project-code from T7? This will copy X GB to local." with Confirm/Cancel).

### R5: Existing drawer section — simplify or remove

Once the Manage tool exists, the ProjectDrawer's SSD Offload section becomes redundant. Options:
- Remove it entirely (Manage tool is the home)
- Keep a minimal "status + link" — show location badge + "Manage in Storage tool →" link

Preference: remove it. One home, not two.

## Out of Scope (for now)

- Batch offload (multiple projects at once) — get single-project right first
- "What's on my T7?" overview across all projects — future enhancement
- Editor machine support (Jan/Mary) — David only

## Success Criteria

- David can find and use offload/restore without remembering where it lives
- All storage actions accessible from one Manage tool
- No more drawer spelunking
- T7 pill click leads somewhere useful

## Design Constraints

- Warm linen theme (existing tokens)
- Manage page pattern: sidebar nav left, tool content center
- Existing API hooks are fine (useHoldApi.ts) — this is a UI reorganization, not a backend change
