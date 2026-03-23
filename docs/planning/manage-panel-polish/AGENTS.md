# AGENTS.md — manage-panel-polish

**Project**: FliHub — video recording workflow management tool
**Campaign**: manage-panel-polish (bug fixes + test coverage for Manage panel)
**Stack**: TypeScript monorepo — React 19 + Vite + TailwindCSS v4 (client only — no server changes)
**Last updated**: 2026-03-23
**Inherits from**: `docs/planning/manage-page-redesign/AGENTS.md`

---

## Project Overview

FliHub is a TypeScript monorepo for managing video recording workflows. The previous campaign (B041 manage-page-redesign) restructured the Manage tab from a generic shell with drawers to context-sensitive tool pages. This campaign fixes bugs found in the code quality audit and adds the first component-level test coverage.

---

## Build & Run Commands

```bash
npm install                        # Install all workspace dependencies
npm run build -w shared            # ALWAYS run after changing shared/types.ts
npm run build -w client            # tsc -b && vite build
npm test                           # runs shared → server → client (678 tests currently passing)

lsof -i :5101 | grep LISTEN        # Check if server is running
```

**Never start the dev server in an agent** — it's a long-running process. Build and test only.

---

## Directory Structure

```
flihub/
├── client/src/
│   ├── components/
│   │   ├── ManagePanel.tsx          # MODIFY (bugfix-cleanup) — fix closure, dead code, types
│   │   └── shared/
│   │       ├── ToolsSidebar.tsx      # MODIFY (bugfix-cleanup) — fix activeTool prop type
│   │       ├── ChapterListPanel.tsx  # MODIFY (pure-function-tests) — extract useMemo to functions
│   │       ├── ConfirmationModal.tsx # READ ONLY — understand onConfirm/onChapterSettingsChange flow
│   │       └── (other shared/)      # DO NOT MODIFY
│   ├── test/
│   │   ├── App.test.tsx             # READ — reference for component test patterns
│   │   ├── clientFormatting.test.ts # READ — reference for pure function test patterns
│   │   ├── clientNaming.test.ts     # READ — reference for pure function test patterns
│   │   ├── managePanelUtils.test.ts # CREATE (pure-function-tests)
│   │   ├── chapterListUtils.test.ts # CREATE (pure-function-tests)
│   │   └── ToolsSidebar.test.tsx    # CREATE (component-render-tests)
│   └── hooks/                       # DO NOT MODIFY
├── server/                          # DO NOT MODIFY
└── shared/                          # DO NOT MODIFY
```

---

## DO NOT MODIFY (Explicit Scope Boundaries)

- **ALL server/ files** — client-only changes
- **ALL shared/ files** — no type changes needed
- **client/src/hooks/*** — hooks stay the same
- **client/src/components/shared/RelayTool.tsx** — not in scope
- **client/src/components/shared/GlingEditTool.tsx** — not in scope
- **client/src/components/shared/RenamePanel.tsx** — not in scope
- **client/src/components/shared/ConfirmationModal.tsx** — read only (understand the modal flow)
- Any Watch/Incoming/Config/Recordings/Projects page components

---

## Work Unit Details

### 1. bugfix-cleanup (Wave 1)

**Purpose**: Fix bugs and code quality issues from B041 audit.

**Files to modify**:
- `client/src/components/ManagePanel.tsx`
- `client/src/components/shared/ToolsSidebar.tsx`

**Bug 1 — Stale closure over modalChapterSettings (MAJOR)**:

In `handleRegenClick`, the `onConfirm` callback captures `modalChapterSettings` from state at closure creation time. When the user changes chapter settings in the ConfirmationModal (resolution, title slides, duration), the callback still holds the initial value. User changes are silently ignored.

Current broken code (ManagePanel.tsx line 346):
```tsx
if ((type === 'chapters' || type === 'all') && modalChapterSettings) {
  requestBody.chapterSettings = modalChapterSettings; // ← stale closure!
}
```

**Fix approach**: Change `ConfirmationModal.onConfirm` signature to accept chapter settings as a parameter. The modal passes its current settings when the user clicks confirm.

Step 1: Update `ConfirmationModal.tsx` — change `onConfirm: () => void` to `onConfirm: (chapterSettings?: ChapterSettings) => void`. In the confirm button's onClick, pass the current chapterSettings.

**WAIT** — ConfirmationModal.tsx is marked DO NOT MODIFY. But the stale closure fix requires changing its interface. **Override**: You MAY modify ConfirmationModal.tsx ONLY to change the onConfirm signature to accept optional ChapterSettings. Do not change anything else in that file.

Step 2: In ManagePanel.tsx `handleRegenClick`, update the `onConfirm` callback to receive settings as a parameter:
```tsx
onConfirm: async (confirmedSettings?: ChapterSettings) => {
  // ...
  if ((type === 'all') && confirmedSettings) {
    requestBody.chapterSettings = confirmedSettings;
  }
  // ...
}
```

Step 3: Remove the `modalChapterSettings` state entirely — it's no longer needed since settings flow through the callback parameter.

**Bug 2 — Dead code (type === 'chapters' branches)**:

After B042 removed Regen Chapters, `handleRegenClick` only accepts `'regen-shadows' | 'regen-transcripts' | 'regen-all'`. After `.replace('regen-', '')`, type can only be `'shadows'`, `'transcripts'`, or `'all'`. The `type === 'chapters'` branches are unreachable.

Remove these dead branches:
- Line 284: `type === 'chapters' ? 'chapter videos' :` — remove this ternary branch
- Line 294: `if (type === 'chapters' || type === 'all')` → `if (type === 'all')`
- Line 310-312: `if (type === 'chapters') { warning = '...' }` — remove entirely
- Line 335: `type === 'chapters' ? 'Chapter Videos' :` — remove this ternary branch
- Line 346: `(type === 'chapters' || type === 'all')` → `type === 'all'`

**Bug 3 — Loose type on activeTool prop (ToolsSidebar.tsx)**:

Current: `activeTool: string | null`
Fix: Export `ActiveTool` type from ManagePanel.tsx (or define it in ToolsSidebar.tsx), use `activeTool: ActiveTool`

Since ManagePanel.tsx already defines `type ActiveTool = 'regen' | 'rename' | 'gling-edit' | 'renumber' | 'relay'`, export it and import it in ToolsSidebar.tsx. Remove the local `ToolType` definition in ToolsSidebar (it's identical).

**Bug 4 — `any` type on requestBody (ManagePanel.tsx:345)**:

Replace:
```tsx
const requestBody: any = { files: targetFiles };
```
With:
```tsx
const requestBody: { files?: string[]; chapterSettings?: ChapterSettings } = { files: targetFiles };
```

Where `ChapterSettings` is the type from ConfirmationModal (import it or define inline).

**Export pure functions for testability**:

Export `groupByChapter` and `getChapterDisplayName` from ManagePanel.tsx so tests can import them:
```tsx
export function getChapterDisplayName(files: RecordingFile[]): string { ... }
export function groupByChapter(recordings: RecordingFile[]): ChapterGroup[] { ... }
export type { ChapterGroup };  // export the interface too
```

**Test target**: 0 new test files (this WU fixes production code; wave 2 writes tests)

---

### 2. pure-function-tests (Wave 2)

**Purpose**: Unit test the pure functions in ManagePanel and ChapterListPanel.

**Files to create**:
- `client/src/test/managePanelUtils.test.ts`
- `client/src/test/chapterListUtils.test.ts`

**Files to modify**:
- `client/src/components/shared/ChapterListPanel.tsx` — extract useMemo logic to exported functions

**managePanelUtils.test.ts** — test `groupByChapter` and `getChapterDisplayName`:

```typescript
import { describe, it, expect } from 'vitest';
import { groupByChapter, getChapterDisplayName } from '../components/ManagePanel';
import type { RecordingFile } from '../../../shared/types';
```

Test cases for `groupByChapter`:
- Empty array returns empty
- Single file returns one chapter group
- Multiple files in same chapter grouped together, sorted by sequence
- Multiple chapters sorted numerically (not lexically: 2 before 10)
- totalSize sums correctly
- Chapter key preserved from recording

Test cases for `getChapterDisplayName`:
- Returns name from sequence-1 file (first file by convention)
- Falls back to first file if no sequence-1 exists
- Returns empty string for empty array
- Strips tags from name

**chapterListUtils.test.ts** — test extracted chapter logic from ChapterListPanel:

First, extract the two useMemo bodies from ChapterListPanel.tsx into exported functions:
```typescript
export function extractChapters(recordings: string[]): { number: number; fileCount: number }[] { ... }
export function detectGaps(chapters: { number: number }[]): number[] { ... }
```

Keep the useMemo calls in the component, but have them call these functions.

Test cases for `extractChapters`:
- Empty array returns empty
- Single recording returns one chapter
- Multiple recordings in same chapter counted correctly
- Chapters sorted numerically
- Invalid filenames (no parse result) skipped

Test cases for `detectGaps`:
- No gaps returns empty
- Single gap detected
- Multiple gaps detected
- Consecutive chapters return no gaps
- Single chapter returns no gaps

**Test target**: ~20-30 tests across both files

---

### 3. component-render-tests (Wave 2)

**Purpose**: Render tests for ToolsSidebar component.

**Files to create**:
- `client/src/test/ToolsSidebar.test.tsx`

**Reference pattern** — follow App.test.tsx style:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolsSidebar } from '../components/shared/ToolsSidebar';
```

Test cases for ToolsSidebar:
- Renders all 5 tool labels (Regen, Rename, Gling / Edit, Renumber, Relay)
- Renders Git Sync button
- Active tool gets active styling class (text-blue-600)
- Non-active tools get default styling
- Clicking a tool calls onToolClick with correct tool name
- Clicking Git Sync calls onGitSync
- Git Sync shows "Syncing..." when isGitSyncPending is true
- Git Sync button is disabled when pending
- Group headings render (Record, Edit, Collaborate, Actions)

**Test target**: ~10-15 tests

---

## Success Criteria Checklist

Before marking any work unit complete:

- [ ] `npm run build -w client` passes — TypeScript + Vite build clean
- [ ] `npm test` exits 0 — all existing tests still pass + new tests pass
- [ ] No `any` types in changed code
- [ ] No dead code branches for removed features
- [ ] Stale closure fixed — modal settings reach the API call
- [ ] Exported functions are importable from test files
- [ ] New tests are meaningful (not trivially passing)

---

## Anti-Patterns to Avoid

- **Do not modify server files** — client-only campaign
- **Do not modify shared/ types** — no type changes needed
- **Do not modify tool components** (RelayTool, GlingEditTool, RenamePanel) — not in scope
- **Do not add snapshot tests** — they're brittle and add maintenance burden
- **Do not mock React hooks in pure function tests** — test the logic directly
- **Do not start the dev server** — build and test only
- **Do not add excessive comments or JSDoc** — the code should be self-documenting
- **Do not add tests for code you haven't read** — read the function first, understand edge cases, then write tests

---

## Test Patterns (Reference)

**Pure function test** (from clientFormatting.test.ts):
```typescript
import { describe, it, expect } from 'vitest';
import { formatFileSize } from '../utils/formatting.js';

describe('formatFileSize', () => {
  it('formats bytes under 1 KB', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
  });
});
```

**Component render test** (from App.test.tsx):
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionIndicator } from '../components/ConnectionIndicator';

describe('ConnectionIndicator', () => {
  it('shows "Connected" tooltip when connected', () => {
    render(<ConnectionIndicator isConnected={true} isReconnecting={false} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
});
```

---

## Quality Gates (non-negotiable)

1. `npm run build -w client` clean — no TypeScript errors
2. `npm test` passes — all tests pass (existing + new)
3. No `any` types in changed code
4. No stale closures — callback receives fresh data

---

## Learnings (inherited from previous campaigns)

- **"DO NOT MODIFY" sections prevent scope creep** — enforced across all agents
- **Default state matters** — regen is the landing view (file list + inline regen buttons)
- **Stale closures in React callbacks stored as state are a common bug pattern** — when storing a callback in state, any state values it closes over are frozen at creation time. Fix by passing values as parameters or using refs.
- **Dead code from removed features must be cleaned up immediately** — B042 removed Regen Chapters but left dead branches in handleRegenClick
- **Export pure functions from components for testability** — functions like groupByChapter can be tested without rendering the component
