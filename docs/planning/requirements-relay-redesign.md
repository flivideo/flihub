# Requirements Brief — Relay Collaboration Redesign

**Written**: 2026-03-23
**Author**: David (stakeholder) + Claude (facilitator)
**Status**: Requirements — ready for planning

---

## Problem Statement

The Relay Collaboration page is infrastructure-oriented (subfolders, rsync preview, push/collect) when it should be workflow-oriented. Users don't think in terms of "select subfolder → preview → push." They think: "Send Jan my recordings" and "Oh, Jan sent back a first edit."

### Specific Pain Points

1. **Subfolder dropdown is a leaky abstraction** — The relay browser above already shows recordings/edit-1st/edit-2nd per project. Making the user manually pick a subfolder to operate on is like asking them to think about rsync internals.

2. **Wrong project context** — When David is on project c31, the relay page shows relay data for a *different* project (the active project in the header). But the relay browser table shows *all* projects. This mismatch is confusing: "I'm looking at c32's relay data while I'm on c31's project."

3. **No project-level integration** — The Projects tab (70 projects) has no relay indicators. David can't tell from the project list which projects have relay activity waiting.

4. **No contextual awareness** — When on a project, relay should show *that project's* collaboration state. The current page shows a global relay browser + actions scoped to one project, but nothing connects them visually.

5. **No notifications** — Socket events (`relay:recordings-available`, `relay:edit-received`) are defined in types but never emitted. No toast messages. No way to know something changed without navigating to the relay page.

6. **No setup guidance** — New collaborators (Jan, Roamy) don't know how to configure SyncThing, set relay directory, or set machineRole. David himself isn't sure of the full setup steps.

7. **Missing activity awareness** — When Jan pushes a first edit, David only discovers it by navigating to relay and looking. There's no timestamp, no "2 hours ago Jan pushed…", no change detection.

---

## The Two Perspectives

Relay has two distinct contexts that the current UI conflates:

### 1. Project Relay — "What's happening with THIS project?"

When David is working on a specific video project, he needs:
- What recordings can I send Jan?
- Has Jan sent anything back? When?
- Is there a final version ready to promote?

This should be scoped to the active project automatically. No dropdown needed.

### 2. Relay Dashboard — "What's happening across ALL projects?"

When David wants an overview:
- Which projects have relay activity?
- Which ones have new files since I last checked?
- Quick-jump to a project's relay

This could live on the Projects tab, the Manage sidebar, or both.

---

## User Stories — David (Recorder/Creator)

### Sending recordings to Jan
1. David finishes recording a video
2. Navigates to Manage → Relay (or sees it on the project page)
3. Sees: "5 recordings ready to send to editor" (auto-detected, no subfolder selection)
4. Clicks "Send Recordings" → preview shows what will sync → confirms
5. Toast: "5 recordings pushed to relay for c32-bmad-v6-epic1-foundation"

### Discovering Jan sent a first edit
6. David is on the Watch tab (or any tab)
7. Toast notification: "Jan pushed a first edit for c32" (requires relay watcher + socket events)
8. OR: David sees a badge on the Projects list next to c32: amber dot = first edit available
9. David navigates to the project → Manage → Relay
10. Sees: "First edit received — 1 file, 45 MB, 2 hours ago"
11. Clicks "Pull into project" → recordings appear in project's edit-1st/

### Reviewing and giving feedback
12. David reviews the edit, commits feedback via Git
13. Runs Git Sync (already works)

### Discovering Jan revised or sent final
14. David sees indication (toast or badge) that edit-2nd has a new file
15. Navigates to relay, sees: "Final version — v1.mp4, 120 MB, 30 min ago"
16. Clicks "Promote to Final" → file moves to project's final/ folder

### At-a-glance project awareness
17. David opens the Projects tab
18. Sees relay indicators per project: which ones have pending recordings to push, which have incoming edits to collect
19. Can click a project to jump directly to its relay view

---

## User Stories — Jan (Editor)

### Discovering new recordings
1. Jan opens FliHub (on his machine, machineRole: editor)
2. Toast: "David pushed 3 recordings for c32"
3. OR: Jan sees badge on project list
4. Navigates to project → Manage → Relay
5. Sees: "3 new recordings from creator — 2.1 GB"
6. Clicks "Pull recordings" → files sync into local project/recordings/

### Sending first edit back
7. Jan runs Gling AI, produces edited clips in edit-1st/
8. Navigates to Relay
9. Sees: "First edit ready to send — 4 files, 890 MB"
10. Clicks "Send first edit" → pushes to relay
11. Toast: "First edit pushed for c32"

### Sending final version
12. Jan does final cut in DaVinci/Camtasia → saves to edit-2nd/
13. Navigates to Relay → "Final version ready to send — 1 file"
14. Clicks "Send" → pushes to relay

---

## Design Concept: Workflow Lanes (Not Subfolders)

Replace the subfolder dropdown with a visual pipeline that adapts to the user's role:

### David's View (Recorder)
```
RECORDINGS           FIRST EDIT           FINAL
─────────────        ─────────────        ─────────────
5 files ready        Empty                No versions yet
to send
                     ← Collect            ← Collect
[Send to editor]                          [Promote]
```

### Jan's View (Editor)
```
RECORDINGS           FIRST EDIT           FINAL
─────────────        ─────────────        ─────────────
3 new from David     4 files ready        1 file ready
                     to send              to send
[Pull into project]  [Send to creator]    [Send to creator]
```

Each lane shows:
- **Count and size** of files in that stage
- **Direction arrow** (push → or ← collect) based on role
- **"New" badge** when files changed since last action
- **Timestamp** of last change ("2 hours ago")

The user never selects a subfolder. The system presents the right action for each stage.

---

## Design Concept: Projects Tab Integration

Add a "Relay" column to the Projects list table:

```
Project                  Stage   Ch  Files  Relay
───────────────────────  ─────   ──  ─────  ──────
c32-bmad-v6-epic1...     REC     6    16   ● 3 new recordings
b71-bmad-poem            1st    16   121   ● first edit ready
b72-opus-4.5-awesome     REC     6    20   —
```

Or simpler: colored dots matching the relay stages (blue/amber/green) with hover for details.

Clicking a project with relay activity could navigate directly to that project's Manage → Relay view.

---

## Design Concept: Notifications

### Toast messages (cross-screen)
When relay folder changes are detected (via watcher):
- "New recordings pushed for {project}" — when recordings/ subfolder changes
- "First edit received for {project}" — when edit-1st/ changes
- "Final version available for {project}" — when edit-2nd/ changes

### Socket events (already defined, need implementation)
```typescript
'relay:recordings-available': { projectCode, count }
'relay:edit-received': { projectCode, filename }
'relay:sync-status': { status, message }
```

### Watcher needed
A file watcher on the relay directory (similar to WatcherManager for the project directory) that emits socket events when SyncThing updates files.

---

## Design Concept: Setup Guide

When relay is not configured, or when the user clicks a "Setup Help" link, show a collapsible guide:

### For David (Creator)
1. **Install SyncThing** on this machine and Jan's machine
2. **Create relay folder**: `mkdir -p ~/relay/flihub-appydave`
3. **Share in SyncThing**: Add the relay folder and share it with Jan's machine
4. **Set config**: Add `"relayDirectory": "~/relay/flihub-appydave"` and `"relayEnabled": true` to `server/config.json`
5. **Set role**: Add `"machineRole": "creator"` (or `"recorder"`) to config
6. **Verify**: Relay Status should show green checkmark

### For Jan (Editor)
1. **Accept SyncThing share** from David
2. **Set config**: Add the relay path, enable, and set `"machineRole": "editor"`
3. **Verify**: Relay Status should show green checkmark

This guide replaces the current bare "Relay not configured" error message.

---

## Scope Decisions

### In scope for this redesign
- [ ] Replace subfolder dropdown with workflow lanes
- [ ] Scope relay actions to active project
- [ ] Add relay indicators to Projects list
- [ ] Add setup guide panel
- [ ] Implement relay watcher + socket events
- [ ] Add toast notifications for relay changes
- [ ] Show timestamps / "last changed" on relay stages
- [ ] Show "new since last action" badges

### Out of scope (future)
- Automated SyncThing configuration
- In-app video preview of received edits
- Feedback/comment system within relay
- Version history browser (beyond what edit-2nd provides)
- B044 (app auto-update) — separate campaign

### Open questions
1. Should relay be accessible from the project page directly (not just Manage → Relay)?
2. Should the relay dashboard be a separate tab, or embedded in the Projects tab?
3. Should Git Sync be integrated into the relay workflow (auto-sync after push/collect)?
4. How should "new" badges clear? On collect? On view? On explicit dismiss?

---

## Success Criteria

1. David never needs to select a subfolder
2. David can tell from the Projects list which projects have relay activity
3. When Jan pushes a first edit, David gets a notification without navigating to relay
4. A new collaborator can set up relay using only the in-app guide
5. Relay page shows *this project's* relay state, not a global view with disconnected actions
6. The workflow direction (push vs collect) is obvious from the UI — no mental mapping of "which subfolder do I push vs collect?"

---

## Reference

- Current implementation: `client/src/components/shared/RelayTool.tsx`, `RelayBrowser.tsx`
- Server routes: `server/src/routes/relay.ts` (7 endpoints, all working)
- Socket events defined: `shared/types.ts` (not yet emitted)
- Architectural gaps: relay watcher not implemented, socket events not connected
- Prior relay campaigns: B038, B039, B040 (all shipped)
