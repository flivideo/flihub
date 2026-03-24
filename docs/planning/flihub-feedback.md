# FliHub Feedback

**Last updated**: 2026-03-24

---

## Overall Impressions

The Manage page was redesigned in B041 (manage-page-redesign). "Manage & Export" heading replaced with contextual headings per tool. Each tool now owns the center content area. Drawers eliminated. Sidebar simplified to pure navigation.

Relay Kanban campaign (B060) added divergence detection, auto-folder creation, and a 4-lane Kanban UI to the relay workflow. Project-level sync badges show at-a-glance sync status per subfolder.

Relay Kanban Fixes campaign (B061) resolved 6 UX blockers from visual QA on Jan's editor machine: collect-without-folder, badge colors, header indicator. Open-folder buttons added to Sync and Relay tools.

---

## Open Items

### F013 — Changed file list is a dead end — can't see full name, copy, or open folder
**Type**: ux
**Priority**: high
**Where**: Sync tool — Video Project changed files list
**What I saw**: A deleted transcript shows as `17-cowork-second-brain-productivity-plugin/...` with a red D badge. The filename is truncated and there is no way to: (1) see the full filename (no hover tooltip), (2) copy the filename or path to clipboard, (3) open the containing folder in Finder. I'm stuck — I can see something changed but can't investigate what it is.
**What I expected**: At minimum a hover tooltip showing the full path. Ideally: click to copy full path, and a folder-open icon to jump to the directory in Finder. The changed file list should be actionable, not just informational.

### F011 — Projects page shows no relay badges for most projects
**Type**: ux
**Priority**: low
**Where**: Projects page
**What I saw**: Only c17 shows relay badges. All other projects show dashes with no relay information. On Jan's machine (first screenshot), no badges appeared at all because his relay was empty.
**What I expected**: This may be correct behaviour (only projects with relay data get badges), but it's worth considering whether projects with no relay presence should show a subtle "not in relay" indicator vs showing nothing.

---

## Resolved

| ID | Title | Resolution | Round |
|----|-------|-----------|-------|
| F001 | Remove "Regen Chapters" from sidebar | Removed button + narrowed type union. Server route preserved for Regen All. | Pre-campaign quick fix (B042) |
| F002 | "Manage & Export" heading is meaningless noise | Replaced with contextual heading per tool (`toolHeadings` map in ManagePanel.tsx). Relay shows "Relay Collaboration", Rename shows "Rename Recordings", etc. | manage-page-redesign (B041) |
| F003 | Manage page needs full design review | Full redesign: drawers removed, each tool owns center content, sidebar is pure navigation, file list only for tools that need it. | manage-page-redesign (B041) |
| F004 | App auto-update for collaborators (Jan/Roamy) | B044 Sync Hub. App Code channel shows behind-count in header pill + pull button with restart instructions. Editors see "Pull & Restart" banner when behind. | sync-hub (B044) |
| F005 | Move AWB from top nav into Manage sidebar | AWB removed from top nav (ViewTab, VALID_TABS, tab button). Added as Manage tool (ActiveTool, ToolsSidebar Edit group, PoemWuiPage center content). | tech-debt-round1 (B045) |
| F006 | Collect blocked when local folder doesn't exist | Server `POST /collect` now calls `fs.ensureDir` before rsync. KanbanLane shows collect button even when folder missing + relay has files. | relay-kanban-fixes (B061) |
| F007 | "Create Folders" button creates wrong folders | `POST /ensure-edit-folders` expanded to `POST /ensure-folders` — creates all 3 subfolders (recordings + edit-1st + edit-2nd). Old endpoint kept as backward-compat alias. | relay-kanban-fixes (B061) |
| F008 | No proactive notification when relay files arrive | RelayIndicator pill added to header next to SyncIndicator. Shows aggregate relay sync status (green/amber/blue/red) with per-subfolder tooltip. Click navigates to Relay tool. | relay-kanban-fixes (B061) |
| F009 | Red "REC !" badge is alarming for normal workflow state | `relay-only` badge changed from red/! to amber/↓ with count. Tooltip shows "N to collect". | relay-kanban-fixes (B061) |
| F010 | Recordings lane doesn't show what's available in relay | KanbanLane now shows relay file count and size even when local folder is missing. | relay-kanban-fixes (B061) |
| F012 | 2nd Edit lane shows "Send to Creator" when empty and synced | Push button now disabled when `localCount === 0`. Applies to all lanes. | relay-kanban-fixes (B061) |
