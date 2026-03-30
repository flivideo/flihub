# FR-148: Project List Redesign — Table + Drawer

**Status:** Planned
**Added:** 2026-03-30
**Mockup:** `.mochaccino/designs/project-list-a-table-drawer/index.html`
**Builds on:** FR-80 (stage model), NFR-81 (performance), NFR-87 (starred projects)

---

## User Story

As a creator managing 50+ video projects, I want a filterable table with a detail drawer so I can quickly scan project status and drill into any project without leaving the list.

## Problem

The current project list (FR-80) shows basic indicators and stages but lacks:

1. **Filtering** — no way to narrow the list by stage, search term, or smart presets
2. **At-a-glance metrics** — transcript %, final video status, relay status not visible in the table
3. **Detail on demand** — clicking a project navigates away; no way to inspect without losing list context
4. **Smart presets** — no quick filters for common workflows (dead projects, needs attention, ready to edit)

## Solution

Replace the current project list with a filterable table + right-side detail drawer.

---

## Part 1: Table Columns

| Column | Width | Content | Source |
|--------|-------|---------|--------|
| Star | 32px | Favourite toggle (FR-87) | Existing |
| Code | 64px | Project identifier (e.g., b05) | Existing |
| Name | flex | Descriptive project name | Existing |
| Stage | 56px | Stage badge with colour | Existing (FR-80) |
| Files | 48px | Recording count | Existing |
| Trans% | 64px | Transcript completion % with visual bar | **New** |
| Final | 48px | Checkmark if final video exists | **New** |
| Relay | 48px | Relay status indicator | **New** |
| Modified | 80px | Last modification date | Existing |

### Row styling

- Subtle background tint per stage (e.g., REC rows get pale green)
- Selected row: blue left border + light blue background
- Hover: subtle highlight

---

## Part 2: Toolbar & Filtering

### Search
- Text input filters by project code or name
- Real-time filtering as user types

### Stage pills
- One pill per stage (Plan, REC, 1st, 2nd, Rev, Ready, Pub, Arch)
- Multi-select toggle — click to include/exclude stages
- Visual feedback: active pills are filled, inactive are outline

### Smart presets
| Preset | Filter logic |
|--------|-------------|
| All | No filter applied |
| Needs Attention | files > 0 AND transcript% = 0 |
| Dead | files <= 2 AND modified > 30 days ago |
| Ready to Edit | transcript% = 100 AND stage = recording |

### Result count
- Shows "X of Y projects" reflecting current filter state

---

## Part 3: Detail Drawer

Slides in from the right (~40% width) when a row is clicked. Closes via X button or clicking outside.

### Drawer sections

1. **Header** — Project code + stage badge + close button

2. **Stats grid** (3-column layout):
   - Recordings count
   - Chapters count
   - Transcript %
   - Images count
   - Thumbnails count
   - Shadows count

3. **Progress checklist** — colour-coded checkmarks:
   - Has recordings
   - Has transcripts
   - Has chapters
   - Has final video
   - Has relay

4. **Health assessment** — dynamic text describing project status:
   - Planning stage: "Project is in planning"
   - Dead project: warning about inactivity
   - Ready to edit: highlight readiness
   - Transcript gaps: note incomplete transcripts

5. **Quick actions**:
   - Open in Finder
   - Copy Transcript

6. **Metadata** — last modified date + "X days ago"

---

## Part 4: Stage Abbreviations

Map existing 8-stage model to compact display labels:

| Stage value | Display | Colour |
|------------|---------|--------|
| planning | Plan | Pale tan |
| recording | REC | Pale green |
| first-edit | 1st | Pale blue |
| second-edit | 2nd | Pale purple |
| review | Rev | Pale pink |
| ready-to-publish | Ready | Light green |
| published | Pub | Mint green |
| archived | Arch | Pale grey |

---

## Acceptance Criteria

### Table
- [ ] Table displays all 9 columns (star, code, name, stage, files, trans%, final, relay, modified)
- [ ] Rows show subtle stage-tinted backgrounds
- [ ] Selected row visually distinct (blue border + highlight)
- [ ] Sticky table header on scroll

### Filtering
- [ ] Search input filters by code and name in real-time
- [ ] Stage pills toggle stages in/out (multi-select)
- [ ] Smart presets filter correctly: All, Needs Attention, Dead, Ready to Edit
- [ ] Result count updates to reflect active filters
- [ ] Filters combine (search + stage + preset)

### Drawer
- [ ] Clicking a row opens drawer with project detail
- [ ] Drawer shows stats grid, progress checklist, health assessment
- [ ] Quick actions work: Open in Finder, Copy Transcript
- [ ] Close button and click-outside dismiss drawer
- [ ] Drawer does not obscure table (table stays scrollable)

### Data
- [ ] Trans% calculated from transcript files vs recording files
- [ ] Final status derived from `final/` directory content
- [ ] Relay status derived from relay configuration/presence
- [ ] Health assessment text generated dynamically from project data

---

## Technical Notes

### Backend changes

- **GET /api/projects** needs to return additional fields:
  - `transcriptPercent` — ratio of transcript files to recording files
  - `hasFinal` — boolean, files exist in `final/`
  - `hasRelay` — boolean, project has relay configuration
  - `chapterCount` — count of files in `recordings/-chapters/`
  - `shadowCount` — count of files in `recording-shadows/`
  - `imageCount` — count of files in `assets/images/`
  - `thumbCount` — count of files in `assets/thumbs/`

### Frontend changes

- Replace `ProjectsPanel.tsx` list rendering with new table component
- New `ProjectDrawer` component for detail panel
- New toolbar with search, stage pills, preset buttons
- Filter state management (search query + active stages + active preset)

### Performance

- NFR-81 applies: target < 500ms load with 50+ projects
- Consider memoising filter results
- Drawer content can load on demand (not preloaded for all projects)

---

## Out of Scope

- Stage editing from the drawer (keep existing dropdown in table)
- DAM/S3 integration (see `enhanced-project-view-spec.md`)
- Drag-and-drop reordering
- Kanban/board view (mockup C explored this; not selected)
- Inline expand (mockup D explored this; not selected)

---

## Design Decision

**Chosen: Table + Drawer (Mockup A)** over alternatives:
- **B (Hover card)** — too subtle, easy to dismiss accidentally
- **C (Table + Kanban toggle)** — board view adds complexity without clear value for this use case
- **D (Inline expand)** — limits detail space, pushes rows down awkwardly

The drawer provides generous detail space while keeping the full table visible and scrollable.

---

## Part 5: Post-Launch Feedback Loop

This FR is **not a build-and-close requirement**. The mockup was designed with synthetic data — once implemented with real projects, expect the design to evolve.

### Process

1. **Ship v1** — implement the spec above against real project data
2. **Use it** — the creator works with it in daily workflow for at least a few sessions
3. **Collect friction** — note what's missing, what's noisy, what columns matter less than expected, what the drawer should show that it doesn't
4. **Feedback round** — review findings and discuss changes, new capabilities, or simplifications
5. **Iterate** — update this spec and ship v2

### What to watch for

- Are the smart presets actually useful, or do you need different ones?
- Is Trans% the right metric, or is something else more telling?
- Does the drawer show enough to act on, or do you still need to navigate away?
- Which quick actions are missing? (e.g., change stage, open in editor, jump to relay)
- Does the health assessment text feel accurate with real data?
- Are there columns that feel like clutter once you see 70+ real rows?
- How does filtering behave with your actual stage distribution?

### Goal

The project list is the main navigation surface for FliHub. Getting it right matters more than shipping it fast. Plan for at least one feedback iteration before considering this FR complete.
