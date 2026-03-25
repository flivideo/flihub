# FR-147: Relay Project Awareness — Two-Pool Split

**Status:** Implemented
**Added:** 2026-03-25
**Priority:** HIGH — prevents silent data loss and editor confusion
**Campaign:** Relay reliability

---

## Problem

The three sync systems (App Code, Video Project, Relay) operate independently with no dependency awareness. When a creator pushes new recordings to relay across multiple projects, the editor may not have the corresponding project folders locally (they come from the Video Project git repo).

**Current failure mode:**
1. Creator records in new projects (e.g., c30–c33)
2. Creator pushes recordings to relay
3. Editor sees "16 to pull" in relay badge — no per-project breakdown
4. Editor hasn't pulled video-project repo, so c30–c33 folders don't exist
5. Relay `collect` endpoint calls `fs.ensureDir()` — silently auto-creates folders outside git control
6. Editor ends up with ghost project directories that aren't tracked in git

This also applies in reverse: when Editor pushes edits back and Creator hasn't synced a project the Editor created.

## Solution: Two Relay Pools

On the receiving side (whichever direction), split relay items into two pools:

### Ready Pool
- Project exists locally in `projectsRootDirectory`
- Safe to collect — files have a valid home
- Normal Kanban display with collect actions

### Blocked Pool
- Project does **not** exist locally
- Cannot collect until video-project repo is synced
- Shows clear messaging: "Sync Video Project first"
- Provides one-click action to trigger video-project pull
- After pull completes, automatically re-evaluates and moves items to Ready pool

## Technical Design

### Server Changes (`server/src/routes/relay.ts`)

**1. Add project existence check to browse/divergence endpoints:**

In `GET /api/relay/browse?detailed=true` and `GET /api/relay/divergence`:
- For each relay project code, check if `{projectsRootDirectory}/{projectCode}/` exists locally
- Return `projectExists: boolean` per relay project entry

**2. Block collect for missing projects:**

In `POST /api/relay/collect`:
- Before executing rsync, verify target project directory exists in `projectsRootDirectory`
- If not, return `{ success: false, error: 'Project not found locally. Sync Video Project first.', missingProject: projectCode }`
- Remove the `fs.ensureDir()` auto-create behaviour for project-level directories (subfolder creation within an existing project is still fine)

### Client Changes (`client/src/components/shared/RelayTool.tsx`)

**3. Split Kanban into two sections:**

- **Ready to sync** — projects where `projectExists: true`. Normal Kanban lanes with push/collect actions.
- **Waiting for project sync** — projects where `projectExists: false`. Greyed-out cards with:
  - Project code and file count summary
  - "This project doesn't exist locally yet"
  - "Sync Video Project" button → triggers `useSyncPull('video-project')`

**4. Auto-refresh after video-project pull:**

When the video-project pull succeeds:
- Invalidate relay queries (`QUERY_KEYS.relayDivergence`, `QUERY_KEYS.relayBrowse`)
- Blocked items automatically re-evaluate and move to Ready pool
- Toast: "Project synced — X relay items now ready to collect"

### Header Badge Update

**5. Badge breakdown:**

Currently: `Relay 16 to push` (single number)

Proposed: Keep single badge but add tooltip breakdown:
- "12 ready, 4 waiting for project sync"
- Or use two sub-badges if space permits

## Direction Awareness

Relay is **bidirectional**:
- Creator→Editor: recordings, gling edits
- Editor→Creator: edit-2nd, final edits

The `projectExists` check is direction-agnostic — it applies to whichever side is receiving. The existing bidirectional relay logic (commit `2569b00`) determines push/pull direction from divergence data; this feature layers on top.

## Dependencies

- Relies on `projectsRootDirectory` being configured (already required for Video Project sync)
- Relies on relay browse/divergence endpoints already scanning by project code (they do)

## Out of Scope

- Multi-project batch collect (separate enhancement)
- Automatic video-project pull when relay items are blocked (user should explicitly trigger)
- Relay-to-sync orchestration (keeping systems independent with awareness, not coupling)

## Acceptance Criteria

1. Relay browse/divergence responses include `projectExists` per project
2. Collect endpoint rejects requests for non-existent projects with clear error
3. Relay Kanban splits into Ready and Blocked sections
4. Blocked section offers one-click video-project sync
5. After sync, blocked items auto-move to Ready
6. Works in both directions (Creator receiving and Editor receiving)
7. No silent auto-creation of project directories outside git control
