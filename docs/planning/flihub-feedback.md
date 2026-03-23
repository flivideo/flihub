# FliHub Feedback

**Last updated**: 2026-03-23

---

## Overall Impressions

The Manage page was redesigned in B041 (manage-page-redesign). "Manage & Export" heading replaced with contextual headings per tool. Each tool now owns the center content area. Drawers eliminated. Sidebar simplified to pure navigation.

---

## Open Items

### ~~F004 — App auto-update for collaborators (Jan/Roamy)~~ → RESOLVED
**Resolution**: B044 Sync Hub. App Code channel shows behind-count in header pill + pull button with restart instructions. Editors see "Pull & Restart" banner when behind. Campaign: sync-hub.

---

## Resolved

| ID | Title | Resolution | Round |
|----|-------|-----------|-------|
| F001 | Remove "Regen Chapters" from sidebar | Removed button + narrowed type union. Server route preserved for Regen All. | Pre-campaign quick fix (B042) |
| F002 | "Manage & Export" heading is meaningless noise | Replaced with contextual heading per tool (`toolHeadings` map in ManagePanel.tsx). Relay shows "Relay Collaboration", Rename shows "Rename Recordings", etc. | manage-page-redesign (B041) |
| F003 | Manage page needs full design review | Full redesign: drawers removed, each tool owns center content, sidebar is pure navigation, file list only for tools that need it. | manage-page-redesign (B041) |
| F005 | Move AWB from top nav into Manage sidebar | AWB removed from top nav (ViewTab, VALID_TABS, tab button). Added as Manage tool (ActiveTool, ToolsSidebar Edit group, PoemWuiPage center content). | tech-debt-round1 (B045) |
