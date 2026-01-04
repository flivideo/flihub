# Brainstorming Notes

Capture ideas, observations, and half-formed requirements here. When something crystallizes into a clear requirement, promote it to `backlog.md` as an FR/NFR.

---

## Active Brainstorms

### Word-Level Transcript Features (Future Vision)

**Date:** 2025-12-15

**Source:** David brainstorming session

**Status:** Exploring - Prerequisites being built (FR-74 through FR-77)

---

#### The Vision

Move from segment-level granularity to **word-level granularity** for transcripts. This enables powerful new workflows:

| Feature | Description |
|---------|-------------|
| **Word-level asset placement** | Tell Jan "overlay this image at word 33 of 02-4-setup" |
| **Phrase → image prompt** | Select text in transcript, generate image prompt from selection |
| **Re-record markers** | Mark specific phrase as "needs re-recording" |
| **Editor notes at word level** | "Add transition here", "Emphasize this word" |

---

#### Prerequisites Being Built

These features require timing data at the word level:

1. **FR-74**: Generate SRT files during transcription (timing data)
2. **FR-75**: Highlight words in transcript as video plays (segment level)
3. **FR-76**: Generate chapter SRT with proper offsets
4. **FR-77**: Highlight words for chapter videos

---

#### Future Capabilities (Not Yet Scoped)

Once FR-74-77 are complete, these become possible:

**Word selection UI:**
- Click/drag to select words in transcript panel
- Selection shows start/end timestamps
- Right-click menu: "Create image prompt", "Mark for re-record", "Add editor note"

**Asset placement refinement:**
- Currently: Image assigned to segment (e.g., 02-4-setup)
- Future: Image assigned to word position (e.g., 02-4-setup @ word 33 / 00:01:15)

**Export for editor:**
- Generate editor brief with word-level timestamps
- "At 01:15, overlay image X"
- "At 02:30, this section needs polish"

---

#### Open Questions

1. How to persist word-level annotations? (JSON file per segment? Central manifest?)
2. Should word selection be on Watch page, Transcripts page, or both?
3. How to visualize word-level assets in the UI?

---

### Stage Triggers & Automation (Future Vision)

**Date:** 2025-12-15

**Source:** FR-80 discussion with David

**Status:** Exploring - Basic stage model in FR-80, automation is future

---

#### The Vision

Certain project stages could trigger automatic actions. This creates a more intelligent workflow where FliHub helps manage the production pipeline.

---

#### Potential Stage Triggers

| Stage Transition | Potential Trigger |
|-----------------|-------------------|
| `planning` → `recording` | **Auto:** First recording file added to project |
| `recording` → `first-edit` | Manual (user decides when recording is done) |
| `first-edit` → `second-edit` | **Potential:** S3 upload to share with Jan |
| `second-edit` → `review` | **Potential:** Notification from DAM that Jan uploaded |
| `review` → `ready-to-publish` | Manual (user signs off) |
| `ready-to-publish` → `published` | Manual (user confirms published) |
| `published` → `archived` | **Potential:** Move to NAS via DAM |

---

#### Integration Points

**DAM Integration (Future):**
- Moving to `second-edit` could trigger S3 upload
- Moving to `archived` could trigger NAS transfer
- Receiving files from Jan could auto-advance to `review`

**Notification System (Future):**
- Stage changes could notify via webhook, email, or in-app
- "Jan has uploaded, project X ready for review"

---

#### Implementation Notes

Keep triggers configurable:
```json
{
  "stageTriggers": {
    "recording": {
      "auto": true,
      "trigger": "first-recording-added"
    },
    "second-edit": {
      "onEnter": ["s3-upload"]
    },
    "archived": {
      "onEnter": ["nas-transfer"]
    }
  }
}
```

---

#### Open Questions

1. Should triggers be opt-in per project or global setting?
2. What happens if a trigger fails? (S3 upload fails)
3. Should there be a "pending" sub-state while triggers run?
4. How to handle manual override if auto-trigger is wrong?

---

### Claude Code Integration Tips UI

**Date:** 2025-12-14

**Source:** David brainstorming session

**Status:** Exploring

---

#### The Idea

Add a tips/shortcuts panel to FliHub that shows how to interact with it from Claude Code via the FliHub skill. This would be a slide-out panel or tips card that documents the skill commands directly in the UI.

---

#### Why This Is Useful

- Users may not know FliHub has a Claude Code skill
- Skill documentation lives in `~/.claude/skills/flihub/` - not discoverable from the UI
- Copy-paste examples would speed up integration
- Shows the "API-first" philosophy of FliHub

---

#### What It Could Show

| Category | Examples |
|----------|----------|
| **Health** | `curl localhost:5101/api/system/health` |
| **Read inbox** | List inbox, read specific file |
| **Write to inbox** | POST with subfolder, filename, content |
| **Get transcripts** | With/without content |
| **Export for LLM** | `?format=text` for readable output |
| **Resolve project** | Partial code to full code/path |

---

#### UI Options

1. **Slide-out panel** - Button in header that opens a side panel
2. **Tips card/modal** - "?" button that opens a modal with tips
3. **Footer bar** - Persistent small bar with quick commands
4. **Dedicated tab** - "API" or "Integration" tab

---

#### Content Source

The content should mirror what's in the FliHub skill (`~/.claude/skills/flihub/`):
- Could be hand-written HTML
- Or dynamically generated from skill markdown files
- Or served via API endpoint that reads the skill files

---

#### Open Questions

1. Where should the UI element live? (header, tab, modal?)
2. Should it be context-aware? (show inbox commands when on Inbox tab)
3. Should commands include the current project code as placeholder?
4. Should there be a "copy to clipboard" button for each command?

---

#### UI Mockup: Slide-Out Panel

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  FliHub                              b86-claudemas-01-jump ▼  [📋] [>_] [?]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Recordings] [Inbox] [Assets] [Thumbs] [Projects]                           │
│                                                                              │
│  ┌────────────────────────────────────────┐  ┌─────────────────────────────┐ │
│  │                                        │  │  💡 Claude Code Tips    [✕] │ │
│  │                                        │  ├─────────────────────────────┤ │
│  │         Main Content Area              │  │                             │ │
│  │                                        │  │  "How do I..."              │ │
│  │                                        │  │                             │ │
│  │                                        │  │  ┌─────────────────────────┐│ │
│  │                                        │  │  │ 📖 Read Transcripts    ││ │
│  │                                        │  │  ├─────────────────────────┤│ │
│  │                                        │  │  │ Full project:          ││ │
│  │                                        │  │  │ "Get all transcripts"  ││ │
│  │                                        │  │  │                        ││ │
│  │                                        │  │  │ By chapter:            ││ │
│  │                                        │  │  │ "Chapter 5 transcript" ││ │
│  │                                        │  │  │                        ││ │
│  │                                        │  │  │ Single segment:        ││ │
│  │                                        │  │  │ "Show 01-1-intro"      ││ │
│  │                                        │  │  └─────────────────────────┘│ │
│  │                                        │  │                             │ │
│  │                                        │  │  ┌─────────────────────────┐│ │
│  │                                        │  │  │ 📥 Read from Inbox     ││ │
│  │                                        │  │  ├─────────────────────────┤│ │
│  │                                        │  │  │ List files:            ││ │
│  │                                        │  │  │ "What's in the inbox?" ││ │
│  │                                        │  │  │                        ││ │
│  │                                        │  │  │ Read file:             ││ │
│  │                                        │  │  │ "Read appydave-story"  ││ │
│  │                                        │  │  └─────────────────────────┘│ │
│  │                                        │  │                             │ │
│  │                                        │  │  ┌─────────────────────────┐│ │
│  │                                        │  │  │ 📤 Write to Inbox      ││ │
│  │                                        │  │  ├─────────────────────────┤│ │
│  │                                        │  │  │ "Save notes to inbox"  ││ │
│  │                                        │  │  │ "Write to dataset"     ││ │
│  │                                        │  │  └─────────────────────────┘│ │
│  │                                        │  │                             │ │
│  │                                        │  │  ┌─────────────────────────┐│ │
│  │                                        │  │  │ 📊 Project Info        ││ │
│  │                                        │  │  ├─────────────────────────┤│ │
│  │                                        │  │  │ "List my projects"     ││ │
│  │                                        │  │  │ "Get project details"  ││ │
│  │                                        │  │  │ "What's the path?"     ││ │
│  │                                        │  │  └─────────────────────────┘│ │
│  │                                        │  │                             │ │
│  │                                        │  │  ┌─────────────────────────┐│ │
│  │                                        │  │  │ 🎬 Recordings          ││ │
│  │                                        │  │  ├─────────────────────────┤│ │
│  │                                        │  │  │ "List recordings"      ││ │
│  │                                        │  │  │ "Chapter 10 recordings"││ │
│  │                                        │  │  └─────────────────────────┘│ │
│  │                                        │  │                             │ │
│  │                                        │  │  ┌─────────────────────────┐│ │
│  │                                        │  │  │ 📦 Export for LLM      ││ │
│  │                                        │  │  ├─────────────────────────┤│ │
│  │                                        │  │  │ "Export project data"  ││ │
│  │                                        │  │  │ "Get context for AI"   ││ │
│  │                                        │  │  └─────────────────────────┘│ │
│  │                                        │  │                             │ │
│  └────────────────────────────────────────┘  └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

#### UI Mockup: Expanded Card with curl Command

When user clicks/expands a card:

```
┌─────────────────────────────────────────────────────────────┐
│ 📖 Read Transcripts                                     [−] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Ask Claude Code:                                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ "Get the full transcript for b86-claudemas-01-jump"    ││
│  │                                                   [📋] ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Or use curl directly:                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ curl -s "http://localhost:5101/api/query/projects/     ││
│  │   b86-claudemas-01-jump/transcripts?include=content"   ││
│  │   | jq                                           [📋] ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ───────────────────────────────────────────────────────── │
│                                                             │
│  Other options:                                             │
│                                                             │
│  By chapter:                                                │
│  "Get chapter 5 transcript"                          [📋]  │
│  ?chapter=5&include=content                                 │
│                                                             │
│  Single segment:                                            │
│  "Show me 01-1-intro transcript"                     [📋]  │
│  /transcripts/01-1-intro                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### Alternative: Context-Aware Footer Bar

Shows relevant commands based on current tab:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [Recordings] [Inbox] [Assets] [Thumbs] [Projects]                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         Main Content (Inbox Tab)                             │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  💡 Claude Code: "List inbox" | "Read [file]" | "Write to inbox"      [?]   │
└──────────────────────────────────────────────────────────────────────────────┘
```

When on Recordings tab:
```
├──────────────────────────────────────────────────────────────────────────────┤
│  💡 Claude Code: "Get transcripts" | "Chapter 5 recordings" | "Export"  [?] │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

#### Key Design Decisions

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Trigger | `[?]` button in header | Simple, discoverable |
| Position | Right slide-out panel | Doesn't obscure main content |
| Content | Collapsible cards by category | Scannable, not overwhelming |
| Project code | Auto-populated from current project | Copy-paste ready |
| Copy buttons | On each command | Essential for usability |
| Context-aware | Optional footer showing current tab hints | Nice-to-have |

---

### Resource Management System (Phase 1 Complete)

**Date:** 2025-12-14

**Source:** David brainstorming session

**Status:** Phase 1 implemented (FR-59, FR-60, FR-61). Phase 2 (Resources in Assets) still pending UX revamp.

---

#### The Problem

When preparing a video, David gathers research material:
- Browser tabs pile up with useful links
- Claude Code session transcripts capture important context
- Data extractions and visual assets get created in Brand David brain
- No way to associate these with specific video projects

Currently this material either:
- Lives in Brand David `presentation-assets/` and `data-systems/collections/`
- Gets dumped into ad-hoc folders like `b86-claudemas-01-jump/resources/`
- Has no visibility in FliHub/Recording Namer

---

#### Critical Architecture Understanding

**Two Separate Systems - Never Unified**

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│     BRAND DAVID TERMINAL    │     │      FLIHUB TERMINAL        │
│     (Documentation work)    │     │      (Video work)           │
├─────────────────────────────┤     ├─────────────────────────────┤
│ • /gather command           │     │ • Recording Namer UI        │
│ • /solo-deck command        │     │ • Resources tab (NEW)       │
│ • /slide-deck command       │     │ • flihub skill (query/write)│
│ • /video command (context)  │     │ • Promotion workflow        │
│                             │     │                             │
│ Writes files to filesystem ─┼────►│ Reads/manages those files   │
│                             │     │                             │
└─────────────────────────────┘     └─────────────────────────────┘
         PRODUCER                            CONSUMER
```

**Key principles:**
- Brand David and FliHub are separate terminals, separate agents
- They never run together in the same folder
- Data passes between them via filesystem (clean handoff)
- FliHub doesn't need to know HOW Brand David works
- FliHub just provides ingestion points (accepts writes)

**What FliHub needs to do:**
1. Accept incoming files (written by Brand David or manually)
2. Organize them in inbox/ subfolders
3. Display them in a Resources tab
4. Allow promotion from inbox/ → resources/
5. Allow tagging to chapter/segment

**What FliHub does NOT need to do:**
- Know about Brand David's /gather, /solo-deck, /slide-deck commands
- Implement Brand David's routing logic
- Document Brand David's workflows

---

#### Proposed Folder Structure

```
project/
├── inbox/                  # PROJECT ROOT - staging area for incoming content
│   ├── raw/                # Dumps: CC transcripts, links, notes
│   ├── dataset/            # Structured data extractions
│   └── presentation/       # HTML visual assets
│
└── assets/                 # PROJECT ROOT - all finalized assets
    ├── images/             # Existing (includes .txt prompts)
    ├── thumbs/             # Existing
    └── resources/          # NEW - cleaned/finalized resources
```

**Key decisions:**
- `inbox/` is at project root (sibling to assets/, recordings/, etc.)
- `resources/` is under assets/ (sibling to images/, thumbs/)
- This positions resources as another asset type, which they are
- `inbox/` replaces the ad-hoc `assets/context/` usage (migration needed for b83, b85)

**Labeling requirement:**
- Files in `assets/resources/` must be labeled/named appropriately (like images/thumbs)
- Labeled resources can be aligned to parts of the video
- Inbox is for raw/unlabeled content; resources is for finalized content

**Prompts location (existing):**
- Text prompts (`.txt`) live in `assets/images/` alongside their paired images
- Same naming convention: `10-6-1a-bigpicture.png` + `10-6-1a-bigpicture.txt`
- This is working - no change needed

**Why this structure:**
- Resources ARE assets - just less structured than images/prompts
- Inbox provides a known path for external systems (Brand David, etc.)
- Unlike images (from Downloads) or recordings (from Ecamm Live), resources have no fixed source
- Subfolders in inbox/ allow categorization of incoming content
- Subfolder names are flexible/extensible - FliHub discovers them dynamically

---

#### Key Concepts

| Concept | Description |
|---------|-------------|
| **Assets** | All visual/content items for a video: images, prompts, resources |
| **Resources** | A type of asset - less structured than images (datasets, HTML, markdown, etc.) |
| **Inbox** | Per-project staging area for incoming content from external systems |
| **Routing** | Which inbox subfolder content goes into (raw, dataset, presentation, etc.) |
| **Tagging** | Associating an asset with Chapter or Chapter+Segment (optional for resources) |

**Routing clarification:** Routing is WITHIN the video project (to inbox subfolders), not routing to different projects/brands. The project is already determined by the `/video` command context.

**No "promote" workflow initially:** External systems can write directly to `inbox/` OR to `assets/resources/`. Moving files between them is an edge case - don't build this yet. Keep it simple.

---

#### Asset Types Comparison

Resources are a TYPE of asset, alongside images and prompts:

| Asset Type | Folder | Source | Structure Level | Tagging |
|------------|--------|--------|-----------------|---------|
| **Images** | `assets/images/` | Downloads folder | High (chapter-segment-order-variant-label) | Required |
| **Prompts** | `assets/images/` | Generated in app | High (matches image naming) | Required |
| **Resources** | `assets/resources/` | inbox/ or direct | Low (flexible formats) | Optional |

**Inbox vs Direct:**
- Images come from a known source (Downloads) - no inbox needed
- Recordings come from a known source (Ecamm Live) - no inbox needed
- Resources have NO fixed source - inbox provides a known path for external systems

**Important:** Assets page IS used - it handles images and prompts. It has UX friction but is NOT being deprecated. Resources will eventually be shown in the Assets page alongside images/prompts.

**Tagging consideration:** Currently images require chapter+segment. But Jan (editor) might want flexibility - assign to chapter only and decide placement. This is a future Assets page enhancement, not specific to Resources.

---

#### FliHub Skill Update ✅ IMPLEMENTED (FR-60)

**Implemented 2025-12-14:**
- Skill renamed: `querying-flihub` → `flihub`
- Location: `~/.claude/skills/flihub/`
- Added `health` command
- Added `write` command for inbox
- Added `resolve` command for project lookup (FR-61)

---

#### API-First Pattern (for Brand David)

Brand David agents should prefer FliHub API over direct filesystem writes:

```
1. Check FliHub health: curl localhost:5101/api/health
2. If running → POST to FliHub write endpoint (fast, controlled)
3. If down → fallback to filesystem write + warn user
```

**Why API-first:**
- Speed: HTTP POST vs LLM orchestrating file writes
- Control: FliHub can validate, transform, route intelligently
- Consistency: One system owns the inbox logic

This is guidance for Brand David agents - FliHub just needs to provide the endpoints.

---

#### FliHub API Requirements ✅ PHASE 1 COMPLETE

**Implemented:**
- ✅ `GET /api/system/health` - health check
- ✅ `GET /api/query/projects/resolve?q=b86` - project resolution (FR-61)
- ✅ `GET /api/query/projects` - now includes `brand` and `path` fields (FR-61)
- ✅ `POST /api/projects/:code/inbox/write` - write to inbox (FR-59)
- ✅ `GET /api/query/projects/:code/inbox` - list inbox contents (FR-59)

**Still pending (Phase 2):**
- `POST /api/projects/:code/resources/write` - write directly to assets/resources/
- `GET /api/query/projects/:code/assets/resources` - list resources
- `DELETE /api/projects/:code/inbox/:subfolder/:filename` - delete from inbox

---

#### UI Requirements (Phased Approach)

**Phase 1: Inbox Tab ✅ IMPLEMENTED (FR-59)**
- ✅ New "Inbox" tab in FliHub navigation
- ✅ Grouped list view showing inbox/ contents by subfolder
- ✅ File info: filename, size, date
- ✅ Open in Finder button
- ✅ WebSocket live updates

**Phase 2: Resources in Assets Page (PENDING)**
1. Resources (`assets/resources/`) appear in Assets page alongside images/prompts
2. Assets page evolves to show: "What assets do we have?"
   - Images
   - Text prompts
   - Resources (presentations, datasets, markdown, etc.)
3. Filtering/grouping by asset type

**Blocked by:** Assets page needs UX revamp first (see Assets/Resources UX Revamp brainstorm)

---

#### Open Questions for PO

1. **Subfolder naming:** Are `raw`, `dataset`, `presentation` the right default names? Or fully flexible from start?

2. **Inbox discovery:** Should FliHub create default subfolders, or only show what exists?

3. **Migration:** What happens to existing `assets/context/` folders in b83, b85? Rename to `inbox/`?

4. **File types:** Any restrictions on what can be a resource? Or accept anything?

5. **Preview:** Should Inbox tab preview files (HTML, images, text)? Or just list them?

6. **Phase 1 scope:** Is Inbox tab enough for MVP? Or do we need resources in Assets page immediately?

---

#### Instructions for Brand David (Separate Concern)

FliHub provides this simple contract for external systems:

```
To write to a video project from Brand David:

1. Run /video {project-code} to set target context
2. Write files to either:
   - {project}/inbox/{subfolder}/ - for staging/work-in-progress
   - {project}/assets/resources/ - for finalized resources
3. Subfolder options: raw, dataset, presentation, or any custom name
4. Files will appear in FliHub's Inbox tab (Phase 1) or Assets page (Phase 2)
```

Brand David implements its own /gather, /solo-deck, /slide-deck commands. FliHub doesn't need to know the details - it just receives the output.

---

### Recordings Page UX Overhaul (Mostly Complete)

**Date:** 2025-12-12

**Source:** ChatGPT brainstorming + follow-up discussion

**Status:** FR-55 and FR-56 implemented 2025-12-13. FR-57 candidate (Chapter Row Simplification) remains in brainstorming.

---

#### Promoted to Requirements

| Idea | Promoted To | Date | Status |
|------|-------------|------|--------|
| Video-Level Transcript Export | FR-55 | 2025-12-12 | ✅ Implemented 2025-12-13 |
| Chapter Navigation Panel | FR-56 | 2025-12-12 | ✅ Implemented 2025-12-13 |

---

#### Still Exploring: Chapter Row Simplification (FR-58 candidate)

**Note:** FR-57 was assigned to ffprobe parallelization (performance fix). This would be FR-58 if promoted.

**Current chapter header row:**
```
01 Intro (4 files · 52s) @ 00:00 ✏️  → Safe All  📋 All  Combine
```

**Problems identified:**
- Icons (✏️, 📋) not self-explanatory
- `→ Safe All` label confusing
- `📋 All` + `Combine` rarely used (error recovery only)
- Mixed visual styles

**Potential changes:**
- Move timestamp to chapter panel (now that FR-56 exists)
- Replace icons with text labels
- De-emphasize `📋 All` and `Combine` (smaller, greyed out?)
- Better label for `Safe All`

**Parked for now** - see how FR-55/FR-56 change the page before simplifying the rows.

---

### Assets/Resources UX Revamp (Exploring)

**Date:** 2025-12-14

**Context:** During inbox/resources folder structure discussion, identified that Assets page is too complex to add more features.

**Status:** Exploring - Need UX thinking before adding `assets/resources/` folder support.

---

#### Current State

Assets page handles:
- Images from Downloads (incoming)
- Assigned images (paired with prompts)
- Thumbnail generation

**Problem:** Adding `resources/` would pile more onto an already complex page.

---

#### Open Questions

1. Should resources be a sub-section of Assets page?
2. Or a separate tab entirely?
3. What's the workflow for "promoting" from inbox → resources?
4. Do resources need the same chapter/sequence labeling as images?

---

#### Relates To

- FR-59 (Inbox Tab) - inbox is the staging area
- AssetsPage Refactor (below) - the underlying complexity issue
- Phase 2 of FR-59 explicitly defers resources until this is resolved

---

### AssetsPage Refactor (Parked)

**Date:** 2025-12-13

**Context:** Developer audit identified AssetsPage.tsx as too large (1355 lines, 20+ state variables).

**Status:** Parked - Too complex to tackle without dedicated testing time. Page works but is hard to maintain.

---

#### Current State

`client/src/components/AssetsPage.tsx`:
- 1355 lines
- 20+ state variables scattered throughout
- Handles: assignment, clipboard paste, paired display, localStorage, navigation

---

#### Proposed Refactor

Break into 4-5 smaller components:

| Component | Responsibility |
|-----------|----------------|
| `AssignmentControls.tsx` | Chapter/sequence selection, naming inputs |
| `IncomingImagesGrid.tsx` | Display incoming images from Downloads |
| `AssignedAssetsList.tsx` | Display assigned images grouped by chapter |
| `PairedAssetRow.tsx` | Image + prompt pairing display |
| `AssetClipboardHandler.tsx` | Clipboard paste logic (could be a hook) |

---

#### Why Parked

1. Page currently works - not broken, just messy
2. Refactoring risks introducing bugs
3. Would need dedicated testing session to verify nothing broke
4. Other FRs have higher user-facing value

---

#### When to Revisit

- When adding new features to Assets page
- When bugs appear that are hard to debug due to complexity
- When there's a quiet period with time for maintenance

---

### Technical Debt: In-Memory Transcription Queue

**Date:** 2025-12-13

**Noted:** `server/src/routes/transcriptions.ts:12-16` has global mutable state for the transcription queue. Lost on server restart.

**Impact:** Low - transcription jobs are short-lived, restart is rare during active use.

**Not urgent** - just documenting for future reference.

---

### Per-Project State Architecture (Parked)

**Date:** 2025-12-13

**Context:** During FR-57 (performance fix) discussion, we explored whether FliHub should have per-project configuration/state files.

**Status:** Parked - chose stateless parallelization for FR-57 instead of caching. This discussion is preserved for future reference when/if per-project state becomes necessary.

---

#### Current State: FliHub is Stateless

**Discovery:** Despite code existing for `.chapter-overrides.json` (FR-34), no per-project config files actually exist anywhere in `/video-projects/`. FliHub loads everything on-demand from the filesystem.

**Global config only:** `server/config.json` stores:
- `pinnedProjects` (array of project codes)
- `projectStages` (object mapping code → stage)
- `watchDirectory`, `projectDirectory`, etc.

---

#### Why We Didn't Introduce Per-Project State

1. **Git conflicts** - When team members (David, Jan) share projects via GitHub, per-project JSON files will cause merge conflicts
2. **Simpler solution existed** - Parallelizing ffprobe calls solved the performance problem without state
3. **Not needed yet** - No compelling use case that requires per-project state

---

#### Future Use Cases (If We Ever Need It)

| Use Case | What Would Be Stored |
|----------|---------------------|
| Duration caching | `{ "01-1-intro.mov": 154.2, ... }` |
| Chapter overrides | Timestamp corrections (code exists, unused) |
| Project metadata | Stage, pinned status, notes, editor assignment |
| Export history | When was this last exported? To whom? |
| Transcription state | Which files have been transcribed? |

---

#### Schema Ideas (For Future Reference)

If we ever introduce per-project state, consider:

```json
{
  "$schema": "flihub-project-v1",
  "projectCode": "b71-bmad-poem",

  "metadata": {
    "stage": "recording",
    "pinned": false,
    "createdAt": "2025-12-01T...",
    "lastOpenedAt": "2025-12-13T..."
  },

  "cache": {
    "durations": { ... },
    "cachedAt": "2025-12-13T..."
  },

  "chapterOverrides": [ ... ]
}
```

**File location options:**
- `project-folder/.flihub.json` (hidden)
- `project-folder/flihub-project.json` (visible)
- `project-folder/.flihub/config.json` (hidden folder)

---

#### Git Conflict Mitigation Ideas

If per-project state becomes necessary:
1. **Gitignore it** - Each user has their own local state (loses portability)
2. **Separate "user" vs "shared" sections** - Only shared section committed
3. **Use .local suffix** - `.flihub.json` committed, `.flihub.local.json` gitignored
4. **Server-side storage** - Store in a database instead of files (adds complexity)

---

#### Decision Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2025-12-13 | Stay stateless for now | Parallelization solves FR-57, git conflicts are real concern |

---

### FR-34 Quality & UX Improvements (Chapter Extraction)

**Date:** 2025-12-05

**Context:** FR-34 (Chapter Timestamp Extraction) was implemented but has significant quality and UX issues discovered during testing with b64.

---

#### Issues Discovered

**1. False Positive Matches**

The current algorithm matches on common phrases that appear multiple times in a 2-hour video:

| Transcript (chapter 30) | Matched SRT | Problem |
|------------------------|-------------|---------|
| "So that brings us to the end and what we've been able to do is **build this complete application**" | "agent so that brings us to the end of epic 2 and what we can now do is we can **add products**" | Completely different content! |

The algorithm matched on "brings us to the end" and "what we can" - common phrases that aren't distinctive.

**2. Alternatives at Wildly Different Timestamps**

Screenshot showed alternatives at:
- 2:01:09 (90% confidence)
- 1:23:51 (80% confidence)

These are 37 minutes apart - clearly not "alternatives" for the same chapter. Real alternatives should be nearby (seconds apart, not hours).

**3. Lightning Bolt Icons Wrong**

Chapters 29 and 30 showed lightning bolts (out-of-order warning), but the actual sequence was 27, 28, 29, 30. Only chapter 41 should have been flagged (it appeared after chapter 30).

**4. Confidence Percentages Don't Tell a Story**

- What does 79% vs 85% mean?
- Why was this match chosen?
- Current UI shows number but hides the decision factors

---

#### Root Cause: Naive Algorithm

**Current approach (what was implemented):**
- Word-by-word substring matching
- No established text similarity algorithms
- No weighting for rare vs common words
- No semantic understanding

**What's available (established solutions):**

| Library | Algorithms | npm |
|---------|-----------|-----|
| [string-comparisons](https://github.com/sumn2u/string-comparisons) | Trigram, Dice, Jaro-Winkler, LCS, Cosine | `npm install string-comparisons` |
| [trigram-similarity](https://www.npmjs.com/package/trigram-similarity) | Postgres pg_trgm style | `npm install trigram-similarity` |
| [string-similarity](https://www.npmjs.com/package/string-similarity) | Dice Coefficient | `npm install string-similarity` |
| [natural](https://www.npmjs.com/package/natural) | Full NLP toolkit | `npm install natural` |

**Key insight from David:** "This is not an unknown problem. You should have searched for JavaScript libraries that solve this."

---

#### Proposed Improvements (Ordered by Effort)

**Phase 1: UI Improvements (Quick Wins)**

| # | Change | Impact |
|---|--------|--------|
| 1 | Replace % with 3-state color system | High - clearer at a glance |
| 2 | Show match reason as text | High - explains decisions |
| 3 | Fix lightning bolt logic | Medium - remove false warnings |
| 4 | Filter impossible alternatives | Medium - only show nearby options |

**3-State Color System:**

| State | Color | When |
|-------|-------|------|
| CONFIDENT | Green | High-quality match, long phrase |
| REVIEW | Yellow | Acceptable match, may need verification |
| UNCERTAIN | Red | Low-quality match, likely needs correction |

**Phase 2: Algorithm Improvements (Medium Effort)**

| # | Change | Impact |
|---|--------|--------|
| 1 | Integrate `string-comparisons` library | High - established algorithms |
| 2 | Use Trigram + LCS combined scoring | High - better fuzzy matching |
| 3 | Add threshold gates (reject < 0.6) | Medium - reduce false positives |
| 4 | Weight rare words higher (TF-IDF) | Medium - common phrases don't dominate |

**Phase 3: LLM Fallback (Future)**

| # | Change | When to Use |
|---|--------|-------------|
| 1 | Auto-escalate when score < threshold | Algorithm can't distinguish |
| 2 | Semantic comparison: "Same topic?" | Content is rephrased/edited |
| 3 | Batch verify uncertain matches | User clicks "Verify All" |

---

#### Decision: Priority

David's direction:
1. **Focus on UI first** - make current results understandable
2. **Then algorithm** - replace naive matching
3. **LLM threshold exploration after** UI is usable

---

#### Related

- `chapter-extraction-spec.md` - Algorithm documentation (created 2025-12-05)
- FR-34 in backlog.md - Original requirement
- FR-35 - Fix Chapter Grouping Logic (may overlap)

---

### Pre-Project Notes / Ideas

**Date:** 2025-12-03

**Context:** Sometimes you're working on something that isn't a full project yet. Example: YouTube launch formula prompt engineering - it's real work but no project code assigned.

**Problem:**
- Can't create a project folder for something you're not ready to commit to
- Need somewhere to capture notes, ideas, progress
- Eventually might promote to a real project
- Work often spans multiple existing projects

**Emerging idea - Future/Idea codes:**
- Different pattern for ideas: `x-something` or `idea-something`?
- Distinguishes "real projects" from "ideas in development"
- Could eventually be promoted to a real `b##` code

**Open questions:**
- What prefix for idea codes? `x-`, `idea-`, `future-`?
- Do ideas need a folder structure? Or just notes?
- How do you track work that spans multiple projects?
- When does an idea "graduate" to a real project?

---

### Project Codes as First-Class Data

**Date:** 2025-12-03

**Context:** Currently project codes (b71, b72, etc.) are derived from folder names. Should probably be explicit.

**Relates to:** DAM system, project manifest

**Open questions:**
- What metadata should a project have? Code, name, brand, status, etc.
- Where is this stored? Per-project file? Central manifest?
- How does Recording Namer consume this vs DAM manage it?

---

### Research Links / Tab Collector

**Date:** 2025-12-03 | **Updated:** 2025-12-14

**Status:** Superseded by "Resource Management System" brainstorm above.

**Original Context:** When planning a video, David keeps browser tabs open for days/weeks to avoid losing useful links.

**Resolution:** This is now part of the broader Resource Management System:
- Links go into `inbox/raw/` as text files or a links.md
- When ready, promote to `resources/` with proper tagging
- See "Resource Management System" brainstorm for full design

---

### Video Sharing / Social Promotion

**Date:** 2025-12-03

**Context:** After publishing a video, David wants to share to communities like "Video Ranking Academy" Facebook group.

**What's needed:**
- Quick way to generate shareable post text
- YouTube URL
- Brief hook/description
- Maybe different formats for different platforms?

**Notes:**
- This is Stage 4 (Publishing) territory
- Recording Namer could be temporary home "until we have a better publishing area"

**Open questions:**
- What communities/platforms to share to?
- Different post formats per platform?
- Should this link to the AWB publishing workflows?

---

### Timing Reconciliation (Architectural Gap)

**Date:** 2025-12-03 | **Updated:** 2025-12-05

**Context:** Need to bridge the gap between recording-time transcripts and final edited video timing.

**Note:** FR-33 (Final Video & SRT Reference) and FR-34 (Chapter Timestamp Extraction) are now implemented, but the broader timing reconciliation problem remains for future work.

---

#### The Core Problem

| Type | Location | Timing |
|------|----------|--------|
| Recording transcripts | `recording-transcripts/*.txt` | N/A |
| Final SRT | `final/*.srt` | ✅ Correct |

**Key insight:** The ONLY source of truth for timing is the **final SRT**.

---

#### What's Implemented (FR-33, FR-34)

- ✅ Auto-detection of final video and SRT files
- ✅ Chapter timestamp extraction from final SRT
- ✅ Basic matching of chapter starts to SRT
- ✅ YouTube chapter list generation

---

#### What's Still Missing (Future)

| Feature | Status |
|---------|--------|
| Asset placement hints for editor | Not built |
| Editor brief generation | Not built |
| Full reconciled timeline | Not built |
| Complex AI-based matching | Not built |

**The flow with the gap:**
```
Recording Namer → [TIMING RECONCILIATION] → Editor Brief → Editing → [YLO] → Publishing
                         ↑
                   This is the gap
```

---

#### Two-Pass Problem (Context)

| Stage | Who | What | Output |
|-------|-----|------|--------|
| Pass 1 | David (Gling.AI) | Remove ums, bad takes, reorder | Video + SRT |
| Pass 2 | Jan (DaVinci) | Overlays, transitions, polish | Versioned videos |

Timing reconciliation might need to run twice.

---

### Jan Version Naming Convention Tool

**Date:** 2025-12-03

**Context:** Jan returns versioned videos via s3-staging. Currently naming is inconsistent and manual.

**Idea:** Tool that generates the next version name for Jan:
- Scans s3-staging for existing versions
- Determines next version number
- Generates: `b75-final-v3.mp4` (for example)
- Copy to clipboard for Jan to use

**Open questions:**
- Where does this UI live? Projects panel? Separate tool?
- Does Jan need access to Recording Namer? Or just the name copied to him?
- Should this be part of FR-33 (Final Video Reference) or separate?

---

### Installation Notes & Repo Setup

**Date:** 2025-12-03

**Context:** Recording Namer currently has no public repo or installation documentation. Jan needs to be able to install and run (at minimum) the version naming tool on his Windows machine.

**What's needed:**
1. Repository setup (standalone vs monorepo)
2. Installation documentation
3. Windows-specific notes

**Questions:**
- Does Jan need full Recording Namer, or just specific tools?
- Is a web-hosted version simpler than local install?

---

### Windows Compatibility Requirement

**Date:** 2025-12-03

**Context:** Jan works on a Windows machine. Any tools or configurations that Jan needs to use must work cross-platform.

**Impact areas:**
- Path handling (`\` vs `/`, `C:\` vs `~/`)
- Shell commands (`open` is macOS-only)
- File system case sensitivity

**Recommendation:** For now, keep Recording Namer macOS-focused. Jan-facing features could be:
1. Simple web tool that works anywhere
2. Or just a copy-to-clipboard feature David uses and sends to Jan

---

## Parked Ideas

(Move ideas here that we're not actively exploring)

---

## Archived Analysis

### Project Folder Analysis Summary (2025-12-03)

**Key findings that informed FR-33:**

| Folder | Consistency |
|--------|-------------|
| `recordings/` | ✅ All projects |
| `recordings/-safe/` | ✅ All projects |
| `recording-transcripts/` | ✅ Recent projects |
| `s3-staging/` | ⚠️ 9 of 13 projects |
| `final/` | ❌ Only 2 projects |

**Conclusion:** `final/` folder not consistently used. FR-33 implemented auto-detection logic to find final video/SRT in various locations.

**Disk space issue:** ~28 GB could be reclaimed from old versions in s3-staging after project complete.

*Full analysis archived - see git history for details.*

---

## Promoted to Requirements

| Idea | Promoted To | Date | Status |
|------|-------------|------|--------|
| Final Video & SRT Reference | FR-33 | 2025-12-03 | ✅ |
| Chapter Timestamp Extraction (Use Case 1) | FR-34 | 2025-12-03 | ⚠️ Phase 3 pending |
| Transcripts Folder Naming (`recording-transcripts/`) | FR-30 | 2025-12-03 | ✅ |
| Undo Last Rename | FR-50 | 2025-12-05 | ✅ |
| Calendar Copy Feature | FR-51 | 2025-12-05 | ✅ |
| Project Data Export for LLM Context | NFR-8 | 2025-12-06 | ✅ |
| ASCII Report Formatter for Query API | FR-53 | 2025-12-07 | ✅ |
| Video-Level Transcript Export | FR-55 | 2025-12-12 | ✅ |
| Chapter Navigation Panel | FR-56 | 2025-12-12 | ✅ |
| Inbox Tab | FR-59 | 2025-12-14 | ✅ |
| FliHub Skill Updates | FR-60 | 2025-12-14 | ✅ |
| Project Resolution Endpoint | FR-61 | 2025-12-14 | ✅ |
| Rename to FliHub | FR-62 | 2025-12-14 | ✅ |
| Terminal Quick-Open Button | FR-63 | 2025-12-14 | ✅ |
| Video Watch Page | FR-70 | 2025-12-14 | ✅ |
| Video Watch Page Enhancements | FR-71 | 2025-12-15 | Pending |
| Shadow Recording System | FR-83 | 2025-12-15 | ✅ |
| Cross-Platform Setup Guide | FR-84 | 2025-12-15 | ✅ |
| File Status Indicators | FR-133 | 2026-01-04 | Pending |
| Inconsistency Detection & Auto-Fix | FR-134 | 2026-01-04 | Pending |
| Chapter Tools (Move, Swap, Undo) | FR-135 | 2026-01-04 | Pending |

---

## Active Brainstorms

### Manage Panel Enhancement: File Status, Inconsistency Detection, Chapter Promotion

**Date:** 2026-01-03

**Source:** PO brainstorming session following FR-130/131 requirements creation

**Status:** ✅ RESOLVED - Requirements created (FR-133, FR-134, FR-135)

**Resolution Date:** 2026-01-04

**Context:** After creating FR-130 (Simplify Rename with Delete+Regenerate) and FR-131 (Manage Panel with Bulk Rename), we explored three potential enhancements for the Manage panel to provide better file management capabilities.

**Outcome:** All 21 questions answered by PO. Created three separate PRDs:
- **FR-133:** File Status Indicators (Hybrid badge/hover, Groq accuracy warnings, stale file tracking)
- **FR-134:** Inconsistency Detection & Auto-Fix (Critical issues only, confirmation dialogs)
- **FR-135:** Chapter Tools (Move, Swap, Undo with preview and atomic rollback)

---

#### Part 1: File Status Indicators

**Problem:** Users can't easily see which derivative files exist for a recording (shadows, transcripts, chapter videos, manifest entries).

**Current state:** Information is scattered across different tabs/systems.

**Proposed solutions:**

**Option A: Badge Count System**
```
01-1-intro.mov [7]
```
- Shows total derivative files as a badge number
- Expandable tooltip shows breakdown: "2 shadows, 2 transcripts, 1 chapter, 1 manifest, 1 safe"
- Pro: Compact, scannable
- Con: Doesn't show WHICH files at a glance

**Option B: Icon Grid**
```
01-1-intro.mov [S] [T] [C] [M] [🔒]
```
- Individual icons for each file type
- Hover for details
- Pro: Shows which types exist
- Con: Visual clutter if many types

**Option C: Status Icons**
```
01-1-intro.mov ✓ (all files present)
01-2-setup.mov ⚠ (missing some files)
01-3-demo.mov ✗ (no derivatives)
```
- Three-state system: Complete / Partial / None
- Pro: Simple visual health check
- Con: Doesn't show what's missing

**Option D: Hybrid**
```
01-1-intro.mov ✓ [7] (hover for breakdown)
```
- Status icon + badge count + expandable tooltip
- Best of all worlds but most complex

---

#### Part 2: Inconsistency Detection

**Problem:** Users can't easily detect problems like:
- Chapter/sequence gaps (missing 01-4)
- Chapter renumbering cascades (label says "Chapter 5" but files are 04-*)
- Out-of-order sequences
- Missing expected files

**Proposed detection types:**

**Type 1: Label Mismatch**
- User types "Chapter 5" but files are numbered 04-*
- Auto-suggest: "Did you mean to rename these to 05-*?"

**Type 2: Chapter Gaps**
- Files exist for chapters 01, 02, 04, 05 (missing 03)
- Show warning: "Gap detected at Chapter 3"
- Could be intentional (deleted content) or accidental

**Type 3: Sequence Gaps**
- Chapter 10 has: 10-1, 10-2, 10-5, 10-6 (missing 10-3, 10-4)
- Show warning or auto-suggest renumber

**Type 4: Missing Files**
- Recording exists but no transcript
- Recording exists but not in manifest (if FR-126 manifest system is active)
- Shadow missing for external collaborator project

**UI considerations:**
- Where to show these warnings? (inline in Manage panel? dedicated "Issues" section?)
- Auto-fix vs manual review?
- Can user dismiss false positives?

---

#### Part 3: Chapter Promotion (Most Complex)

**Problem:** Sometimes you record content in one chapter but realize it belongs in another chapter.

**Example scenarios:**

**Scenario 1: Simple move (no conflicts)**
```
Before:
02-1-intro.mov, 02-2-setup.mov
05-1-demo.mov

User wants to move 02-2 to chapter 05:
After:
02-1-intro.mov
05-1-demo.mov, 05-2-setup.mov  ← promoted and renumbered
```

**Scenario 2: Move with cascade (insert behavior)**
```
Before:
02-1-intro.mov, 02-2-setup.mov, 02-3-demo.mov
03-1-advanced.mov, 03-2-config.mov

User wants to move 02-3-demo to chapter 03:
Option A (insert):
02-1-intro.mov, 02-2-setup.mov
03-1-demo.mov ← inserted
03-2-advanced.mov ← cascaded from 03-1
03-3-config.mov ← cascaded from 03-2

Option B (append):
02-1-intro.mov, 02-2-setup.mov
03-1-advanced.mov
03-2-config.mov
03-3-demo.mov ← appended at end
```

**Scenario 3: Multi-file promotion**
```
User selects:
02-4-partA.mov
02-5-partB.mov
02-6-partC.mov

Promote all to chapter 07:
07-1-partA.mov
07-2-partB.mov
07-3-partC.mov
```

**Scenario 4: Out-of-order promotion**
```
User selects (non-contiguous):
02-2-setup.mov
02-5-demo.mov
02-8-recap.mov

Promote to chapter 10:
Should they become 10-1, 10-2, 10-3? (renumber)
Or preserve original sequence numbers? (10-2, 10-5, 10-8)
```

**Scenario 5: Chapter replacement**
```
Before:
03-1-old-intro.mov
03-2-old-demo.mov

User promotes 02-5-new-intro to chapter 03:

Option A (replace):
03-1-new-intro.mov ← replaces existing
(old files deleted or moved to -safe?)

Option B (merge):
03-1-old-intro.mov
03-2-old-demo.mov
03-3-new-intro.mov ← appended
```

**Scenario 6: Reorder within chapter**
```
10-1-intro.mov
10-2-setup.mov
10-3-demo.mov

User realizes 10-3-demo should come before 10-2-setup:
After:
10-1-intro.mov
10-2-demo.mov ← was 10-3
10-3-setup.mov ← was 10-2
```

**Scenario 7: Chapter split**
```
Before:
05-1-intro.mov
05-2-partA.mov
05-3-partB.mov
05-4-partC.mov
05-5-outro.mov

User realizes partB and partC should be chapter 06:
After:
05-1-intro.mov
05-2-partA.mov
05-3-outro.mov ← renumbered from 05-5
06-1-partB.mov ← promoted from 05-3
06-2-partC.mov ← promoted from 05-4
```

**Scenario 8: Cascading ripple (complex)**
```
Before:
18-1-demo.mov
19-1-config.mov
20-1-deploy.mov

User promotes 02-5-setup to chapter 19:
After:
18-1-demo.mov
19-1-setup.mov ← promoted from 02-5
20-1-config.mov ← cascaded from 19-1
21-1-deploy.mov ← cascaded from 20-1
```

**Scenario 9: Cascade with gaps**
```
Before:
10-1-intro.mov
12-1-advanced.mov (note: no chapter 11)
13-1-deploy.mov

User promotes files to chapter 11:
After:
10-1-intro.mov
11-1-promoted.mov ← new
12-1-advanced.mov (no cascade needed, gap preserved)
13-1-deploy.mov
```

**Scenario 10: Backward promotion (demotion?)**
```
Before:
20-5-outro.mov

User promotes to chapter 02:
After:
02-1-outro.mov ← demoted from 20-5
(What happens to chapters 03-20? Do they shift down?)
```

---

#### Cascading Algorithm Considerations

**When cascading is needed:**
- User promotes to chapter N
- Chapter N already has files
- User chooses "Insert" behavior
- All subsequent chapters must shift forward

**Cascade direction:**
- MUST rename in REVERSE order (highest to lowest)
- Example: Rename 20→21, then 19→20, then 18→19, etc.
- This avoids filename conflicts during rename

**Cascade with gaps:**
- If chapter 15 doesn't exist, does 16 cascade to 17 or stay at 16?
- Likely: Preserve gaps (only cascade if destination would conflict)

**Cascade limits:**
- What if there are 50 chapters? Cascade all?
- Should there be a "preview" showing what will change?
- Undo becomes critical for large cascades

**State synchronization:**
- FR-130 pattern: Delete shadows/transcripts, rename core, regenerate
- Cascade amplifies this: Could be renaming 20+ files
- Progress indication critical

---

#### User Mental Models

**Model 1: File-centric**
"I want to move this specific file to a different chapter"
- Think: File manager drag-and-drop
- Expects: File moves, derivatives regenerate

**Model 2: Content-centric**
"This content belongs in Chapter 5, not Chapter 2"
- Think: Outline/structure editing
- Expects: Logical reordering, files follow content

**Model 3: Timeline-centric**
"I recorded these out of order, need to fix the sequence"
- Think: Video editing timeline
- Expects: Visual reordering, smart renumbering

**Which model does FliHub support?**
- Currently: File-centric (rename recordings)
- Chapter promotion: Content-centric (move content between chapters)
- These can conflict - need to decide primary metaphor

---

#### Open Questions for PO (21 questions)

**File Status Indicators:**
1. Which design option (A/B/C/D) best fits the Manage panel use case?
2. Should status be shown for ALL recordings, or only when issues detected?
3. What derivative files should be tracked? (shadows, transcripts, chapters, manifest, safe, annotations, ...?)
4. Hover tooltip vs inline display vs expandable section?

**Inconsistency Detection:**
5. Which inconsistency types are most important? (Priority order?)
6. Should detection run automatically or on-demand ("Check for issues" button)?
7. Can users dismiss false positives? (e.g., "Chapter 3 gap is intentional")

**Chapter Promotion (Critical - Most Questions):**
8. What's the PRIMARY use case? (Simple move? Reorder? Cascade?)
9. Should this be a Manage panel feature, or separate "Reorganize" workflow?
10. Multi-select support? (Can user promote multiple files at once?)
11. Insert vs Append vs Replace behavior - which is default?
12. Should user choose behavior each time, or have a global preference?
13. Out-of-order selections: Renumber or preserve sequence numbers?
14. Chapter replacement: Delete old files, move to -safe, or merge?
15. Cascade preview: Show "20 files will be renamed" before executing?
16. Cascade limits: Maximum cascade depth? Or always cascade all subsequent chapters?
17. Gap preservation: Cascade through gaps or preserve them?
18. Undo: Single operation undo, or full cascade undo?

**General Architecture:**
19. Should these features be built incrementally (FR-133, FR-134, FR-135) or as one large FR?
20. File Status + Inconsistency Detection seem related - combine into one FR?
21. Chapter Promotion is complex - defer until simpler features proven?

---

#### Potential Requirements (If Promoted)

If user decides to proceed:
- **FR-133:** File Status Indicators (Option D - Hybrid)
- **FR-134:** Inconsistency Detection & Auto-Suggest
- **FR-135:** Chapter Promotion with Cascade Support

Or combined:
- **FR-133:** Manage Panel Power Tools (status + detection + promotion)

---

#### Related Work

- **FR-130:** Simplify Rename Logic (Delete+Regenerate Pattern) - foundation for promotion
- **FR-131:** Manage Panel with Bulk Rename - where these features would live
- **Future Bulk Operations:** Documents park/safe/sequence operations (deferred)

---

#### Next Steps

Awaiting PO decisions on:
1. Which features to prioritize
2. Answers to 21 questions above
3. Whether to proceed with requirements or continue exploring

---
