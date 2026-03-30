# AGENTS.md — Project List Redesign (FR-148)

**Project**: FliHub — video recording workflow management tool
**Campaign**: project-list-redesign (FR-148)
**Profile**: Development
**Inherits**: docs/planning/AGENTS.md (baseline)
**Last updated**: 2026-03-30

---

## Campaign Context

Replace the current project list table with a filterable table + right-side detail drawer. The mockup is at `.mochaccino/designs/project-list-a-table-drawer/index.html`. The PRD is at `docs/prd/fr-148-project-list-redesign.md`.

**This is a frontend-heavy campaign.** The data layer (ProjectStats) already has most fields. The main work is UI restructure + new components.

---

## Build & Run Commands

```bash
npm install
npm run build -w shared    # ALWAYS after changing shared/types.ts
npm run build -w server    # After server changes
npm run build -w client    # tsc -b && vite build
npm test                   # All workspaces — must exit 0
npm run dev                # Start dev server (check ports first)
lsof -i :5101 | grep LISTEN  # Check if server already running
```

---

## Directory Structure (campaign-relevant files)

```
client/src/
├── components/
│   ├── ProjectsPanel.tsx          # MAIN FILE — current project list (refactor target)
│   ├── ProjectStatsPopup.tsx      # Stats popup (being replaced by drawer)
│   ├── ProjectListToolbar.tsx     # NEW — search, stage pills, presets
│   ├── ProjectDrawer.tsx          # NEW — detail drawer
│   └── shared/                    # Reusable components (PageContainer, LoadingSpinner, etc.)
├── hooks/
│   ├── useApi.ts                  # BARREL re-export only — don't add hooks here
│   ├── useProjectsApi.ts          # useProjects, useUpdateProjectPriority, useUpdateProjectStage, useCreateProject
│   ├── useRelayApi.ts             # useEnhancedRelayBrowse (provides relay data)
│   ├── useOpenFolder.ts           # useOpenFolder hook (for "Open in Finder" actions)
│   └── useDelayedHover.ts         # useDelayedHover(enterDelay, leaveDelay)
├── utils/
│   └── formatting.ts              # formatFileSize and other formatters
├── config.ts                      # API_URL export
└── constants/
    └── queryKeys.ts               # QUERY_KEYS for React Query

shared/
├── types.ts                       # ProjectStats, ProjectStage, etc.
└── naming.ts                      # Filename parsing (don't bypass)

server/src/
├── routes/projects.ts             # GET /api/projects/stats, PUT priority/stage
└── utils/scanning.ts              # getProjectStatsRaw — project stat calculation
```

---

## Existing Data Model — What's Already Available

`ProjectStats` in `shared/types.ts` (lines 299-340) already provides:

| Field | Type | Available? |
|-------|------|-----------|
| code | string | Yes |
| priority | 'pinned' \| 'normal' | Yes |
| totalFiles | number | Yes |
| chapterCount | number | Yes |
| transcriptPercent | number | Yes |
| transcriptSync | object | Yes |
| stage | ProjectStage | Yes |
| lastModified | string \| null | Yes |
| imageCount | number | Yes |
| thumbCount | number | Yes |
| shadowCount | number | Yes |
| hasInbox, hasAssets, hasChapters | boolean | Yes |
| inboxCount, chapterVideoCount | number | Yes |
| **hasFinal** | boolean | **MISSING — add in backend-stats work unit** |
| **hasRelay** | boolean | **MISSING — derive from relay browse data** |

Relay data comes from a separate hook (`useEnhancedRelayBrowse`) — not part of ProjectStats. The relay lookup map is built in ProjectsPanel via `useMemo`.

---

## Existing Components to Reuse

These are inline components in `ProjectsPanel.tsx` — reuse them, don't rebuild:

- **StageCell** — dropdown selector for stage changes. Keep in table.
- **TranscriptPercentCell** — color-coded transcript % with tooltip. Keep in table.
- **FinalMediaCell** — final video/SRT status with tooltip. Keep in table.
- **RelayIndicator** — kanban mini-badges for relay sync. Keep in table.
- **TranscriptCopyButton** — copies combined transcript to clipboard. Reuse logic in drawer.
- **STAGE_DISPLAY** — stage label/color config. Reuse for stage pills and row tinting.
- **STAGE_ORDER** — ordered array of stage keys. Reuse for stage pill rendering.

These are being **removed from the table** (data moves to drawer):
- **InboxIndicator** — keep the component but don't render in table
- **AssetsIndicator** — keep the component but don't render in table
- **ChaptersIndicator** — keep the component but don't render in table

---

## Stage Display Config (already exists)

```typescript
const STAGE_DISPLAY: Record<ProjectStage, { label: string; bg: string; text: string; description: string }> = {
  planning:          { label: 'Plan',  bg: 'bg-purple-100', text: 'text-purple-700', ... },
  recording:         { label: 'REC',   bg: 'bg-yellow-100', text: 'text-yellow-700', ... },
  'first-edit':      { label: '1st',   bg: 'bg-blue-100',   text: 'text-blue-700',   ... },
  'second-edit':     { label: '2nd',   bg: 'bg-blue-200',   text: 'text-blue-800',   ... },
  review:            { label: 'Rev',   bg: 'bg-orange-100', text: 'text-orange-700',  ... },
  'ready-to-publish':{ label: 'Ready', bg: 'bg-green-100',  text: 'text-green-700',  ... },
  published:         { label: 'Pub',   bg: 'bg-green-200',  text: 'text-green-800',  ... },
  archived:          { label: 'Arch',  bg: 'bg-surface-muted', text: 'text-warm-secondary', ... },
};
```

Use these colors for stage pills AND for subtle row background tinting. For row tints, use the `bg` value at ~10% opacity or a lighter variant.

---

## Warm Linen Theme Rules (mandatory)

| Instead of | Use |
|-----------|-----|
| `bg-white` | `bg-surface` |
| `bg-gray-100` / `bg-gray-50` | `bg-page` or `bg-surface-muted` |
| `text-gray-900` | `text-warm-primary` |
| `text-gray-700` / `text-gray-600` | `text-warm-secondary` |
| `text-gray-500` / `text-gray-400` | `text-warm-muted` |
| `text-gray-300` | `text-warm-faint` |
| `border-gray-200` | `border-warm` |
| `border-gray-300` | `border-warm-strong` |
| `hover:bg-gray-50` | `hover:bg-surface-hover` |

Exception: keep `bg-blue-*`, `bg-red-*`, `bg-green-*`, `bg-yellow-*` for semantic indicators.

---

## Smart Preset Filter Logic

| Preset | Condition |
|--------|-----------|
| All | No filter — show everything |
| Needs Attention | `totalFiles > 0 && transcriptPercent === 0` |
| Dead | `totalFiles <= 2 && daysSinceModified > 30` |
| Ready to Edit | `transcriptPercent === 100 && stage === 'recording'` |

For "Dead" preset: calculate days since modified from `lastModified` field. Use `Date.now() - new Date(lastModified).getTime()` / 86400000.

---

## Success Criteria

Before marking any work unit complete:

- [ ] `npm run build -w client` passes (TypeScript + Vite clean)
- [ ] `npm run build -w server` passes (if server files changed)
- [ ] `npm test` exits 0 — all tests pass
- [ ] No new `any` types
- [ ] FR-148 annotation on new code (`// FR-148: description`)
- [ ] Warm linen palette used — no `bg-white`, no `text-gray-*`
- [ ] New components have at least one test file with basic render tests

---

## Anti-Patterns to Avoid

- **Do not duplicate StageCell, TranscriptPercentCell, FinalMediaCell, RelayIndicator** — import and reuse them
- **Do not fetch final media per-row in the drawer** — use the existing `useFinalMedia` hook or the new `hasFinal` field
- **Do not add new hooks to `useApi.ts`** — it's a barrel re-export. Add to domain files.
- **Do not bypass `shared/naming.ts`** for any filename work
- **Do not use `bg-white` or `text-gray-*`** — warm linen palette only
- **Do not try to fix F011** (relay badges for projects without relay) — known issue, out of scope
- **Do not remove the new project form** at the bottom of ProjectsPanel — it stays
- **Do not remove the issue projects section** — it stays

---

## Quality Gates

1. `npm run build -w server` clean
2. `npm run build -w client` clean
3. `npm test` passes (baseline ~900 tests)
4. No new `any` types in shared/types.ts
5. All 17 acceptance criteria from FR-148 PRD checked
6. Warm linen palette — zero `bg-white` in new code
