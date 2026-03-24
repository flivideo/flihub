# FliHub Feedback

**Last updated**: 2026-03-24

---

## Overall Impressions

The Manage page was redesigned in B041 (manage-page-redesign). "Manage & Export" heading replaced with contextual headings per tool. Each tool now owns the center content area. Drawers eliminated. Sidebar simplified to pure navigation.

Relay Kanban campaign (B060) added divergence detection, auto-folder creation, and a 4-lane Kanban UI to the relay workflow. Project-level sync badges show at-a-glance sync status per subfolder.

---

## Open Items

### F006 — Collect blocked when local folder doesn't exist
**Type**: bug
**Priority**: high
**Where**: Relay tool — KanbanLane component
**What I saw**: On Jan's machine (editor), the Recordings lane shows "Folder missing" with a "Create Folders" button. There is no way to collect recordings from relay because the collect button ("Pull into Project") only renders when `folderExists` is true.
**What I expected**: Collect should work even when the local folder doesn't exist — create it on the fly, then pull files from relay into it. The editor shouldn't be stuck at a dead end.

### F007 — "Create Folders" button creates wrong folders for the lane it's on
**Type**: bug
**Priority**: high
**Where**: Relay tool — Recordings lane
**What I saw**: Clicking "Create Folders" on the Recordings lane calls `ensureEditFolders()` which creates `edit-1st/` and `edit-2nd/` — not `recordings/`. After clicking, Recordings still shows "Folder missing" but 2nd Edit turns green. Activity log confirms: "Created edit-2nd/ folder".
**What I expected**: Either the button should create the folder for the lane it's on (recordings), or it should be clear that it's creating all missing project folders. Currently it's misleading.

### F008 — No proactive notification when relay files arrive
**Type**: ux
**Priority**: high
**Where**: Header / global UI
**What I saw**: Jan has no way to know recordings have arrived in relay unless he navigates to the Relay tool or Projects page and inspects badges. The Sync Hub has header-level indicators ("Project 1 file changed") but relay has nothing equivalent.
**What I expected**: A header indicator, toast, or sidebar badge showing "Relay: 20 recordings incoming" — something visible from any page.

### F009 — Red "REC !" badge is alarming for normal workflow state
**Type**: ux
**Priority**: medium
**Where**: Projects page — relay sync badges
**What I saw**: `relay-only` status shows as red background with "!" icon. On an editor's machine, this is the normal starting state — recordings exist in relay, haven't been collected yet. Red implies something is broken.
**What I expected**: Amber or blue with a directional arrow (e.g. "REC ↓20") to indicate "available to collect" rather than "error". Reserve red for actual problems (conflicts, missing config).

### F010 — Recordings lane doesn't show what's available in relay
**Type**: ux
**Priority**: medium
**Where**: Relay tool — Recordings lane (when local folder missing)
**What I saw**: When `folderExists` is false, the lane only shows "Folder missing / No folder". No indication of what's waiting in relay (e.g. "20 recordings available").
**What I expected**: Even when the local folder doesn't exist, the lane should show relay file counts so the user knows there's something to collect.

### F011 — Projects page shows no relay badges for most projects
**Type**: ux
**Priority**: low
**Where**: Projects page
**What I saw**: Only c17 shows relay badges. All other projects show dashes with no relay information. On Jan's machine (first screenshot), no badges appeared at all because his relay was empty.
**What I expected**: This may be correct behaviour (only projects with relay data get badges), but it's worth considering whether projects with no relay presence should show a subtle "not in relay" indicator vs showing nothing.

### F012 — 2nd Edit lane shows "Send to Creator" when empty and synced
**Type**: ux
**Priority**: low
**Where**: Relay tool — 2nd Edit lane
**What I saw**: The 2nd Edit lane shows 0 files, "Synced", but still has an active "Send to Creator" button. Nothing to send.
**What I expected**: Button should be disabled or hidden when there are 0 files and status is synced. Same applies to other lanes in equivalent state.

---

## Resolved

| ID | Title | Resolution | Round |
|----|-------|-----------|-------|
| F001 | Remove "Regen Chapters" from sidebar | Removed button + narrowed type union. Server route preserved for Regen All. | Pre-campaign quick fix (B042) |
| F002 | "Manage & Export" heading is meaningless noise | Replaced with contextual heading per tool (`toolHeadings` map in ManagePanel.tsx). Relay shows "Relay Collaboration", Rename shows "Rename Recordings", etc. | manage-page-redesign (B041) |
| F003 | Manage page needs full design review | Full redesign: drawers removed, each tool owns center content, sidebar is pure navigation, file list only for tools that need it. | manage-page-redesign (B041) |
| F004 | App auto-update for collaborators (Jan/Roamy) | B044 Sync Hub. App Code channel shows behind-count in header pill + pull button with restart instructions. Editors see "Pull & Restart" banner when behind. | sync-hub (B044) |
| F005 | Move AWB from top nav into Manage sidebar | AWB removed from top nav (ViewTab, VALID_TABS, tab button). Added as Manage tool (ActiveTool, ToolsSidebar Edit group, PoemWuiPage center content). | tech-debt-round1 (B045) |
