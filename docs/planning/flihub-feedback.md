# FliHub Feedback

**Last updated**: 2026-03-22

---

## Overall Impressions

The Manage page layout and naming continues to be a pain point. "Manage & Export" as a heading is meaningless — it doesn't describe what the page does, and when a tool like Relay is active, the heading is irrelevant noise. The page needs a proper design pass, not incremental feature bolting.

---

## Open Items

### F001 — Remove "Regen Chapters" from sidebar
**Type**: feature
**Priority**: medium
**Where**: ToolsSidebar.tsx — Record group
**What I saw**: "Regen Chapters" button in the sidebar
**What I expected**: This is a temporary chapter system that's no longer useful — remove it from the sidebar

### F002 — "Manage & Export" heading is meaningless noise
**Type**: ux
**Priority**: high
**Where**: ManagePanel.tsx — page title
**What I saw**: "Manage & Export" heading shown regardless of which tool is active (Relay, Rename, etc.)
**What I expected**: The page heading should be contextual or the page concept needs rethinking entirely. When using Relay, the heading should reflect that context, not show generic noise.

### F003 — Manage page needs full design review
**Type**: ux
**Priority**: high
**Where**: ManagePanel.tsx — overall layout
**What I saw**: Tools bolted onto a page that was never designed to hold them. The three-column layout with a static recordings list in the centre doesn't serve any tool well.
**What I expected**: A properly designed page where the layout adapts to the active tool. Relay should feel like a relay page. Rename should feel like a rename page. Not everything crammed into one generic shell.

---

## Resolved

(none yet)
