# AGENTS.md — tech-debt-round1

**Project**: FliHub — video recording workflow management tool
**Campaign**: tech-debt-round1 (B043 relay types + B032 naming tests + B045 AWB→Manage)
**Stack**: TypeScript monorepo — React 19 + Vite + TailwindCSS v4 (client) + Express (server)
**Last updated**: 2026-03-23
**Inherits from**: `docs/planning/manage-panel-polish/AGENTS.md`

---

## Project Overview

FliHub is a TypeScript monorepo for managing video recording workflows. This campaign addresses three independent items: typing relay API hooks, testing untested naming functions, and moving AWB from a top-level nav tab into the Manage sidebar.

---

## Build & Run Commands

```bash
npm install                        # Install all workspace dependencies
npm run build -w shared            # ALWAYS run after changing shared/types.ts or shared/naming.ts
npm run build -w client            # tsc -b && vite build
npm test                           # runs shared → server → client
```

**Never start the dev server in an agent** — it's a long-running process. Build and test only.

---

## Work Unit Details

### 1. relay-api-types (B043)

**Purpose**: Add TypeScript response types for all relay API endpoints and HTTP status checking in client hooks.

**Files to modify**:
- `shared/types.ts` — add response type interfaces
- `client/src/hooks/useRelayApi.ts` — add type annotations + HTTP status checks

**Step 1: Add response types to shared/types.ts**

Add these interfaces (read `server/src/routes/relay.ts` to confirm exact shapes):

```typescript
export interface RelayStatusResponse {
  success: boolean;
  configured: boolean;
  enabled: boolean;
  relayDirectory?: string | null;
}

export interface RelayBrowseResponse {
  success: boolean;
  projects: RelayProjectInfo[];
  relayDirectory: string;
}

export interface RelayPreviewResponse {
  success: boolean;
  diff: { new: string[]; updated: string[]; deleted: string[] };
  subfolder: string;
  error?: string;
}

export interface RelayPushResponse {
  success: boolean;
  output?: string;
  subfolder?: string;
  error?: string;
}

export interface RelayCollectResponse {
  success: boolean;
  output?: string;
  subfolder?: string;
  error?: string;
}

export interface RelayVersionsResponse {
  success: boolean;
  versions?: { filename: string; size: number; modified: string }[];
  error?: string;
}

export interface RelayPromoteResponse {
  success: boolean;
  promoted?: string;
  error?: string;
}
```

**IMPORTANT**: Read `server/src/routes/relay.ts` first to verify these shapes match what the server actually returns. The types above are from reconnaissance — verify before writing.

Also check if `RelayProjectInfo` already exists in shared/types.ts — it likely does.

**Step 2: Add HTTP status checks + type annotations to useRelayApi.ts**

For every fetch call, add:
```typescript
const res = await fetch(...);
if (!res.ok) {
  throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
}
const data: RelayStatusResponse = await res.json();
```

Apply to all 7 hooks: useRelayBrowse, useRelayStatus, useRelayPreview, useRelayPush, useRelayCollect, useRelayVersions, useRelayPromote.

**Step 3**: Run `npm run build -w shared && npm run build -w client && npm test`

**DO NOT MODIFY**: server/src/routes/relay.ts, any component files, any other hooks

---

### 2. naming-tests (B032)

**Purpose**: Test 4 untested functions in shared/naming.ts.

**Files to modify**:
- `shared/naming.test.ts` — add new describe blocks

**DO NOT MODIFY**: shared/naming.ts (just read it and test the existing functions)

**Functions to test** (read `shared/naming.ts` first to understand exact signatures and behavior):

1. **parseImageFilename(filename, options?)** → `ParsedImageAsset | null`
   - Parses image filenames like `05-3-2a-workflow.png`
   - Test: valid with/without variant, supported extensions (.png/.jpg/.jpeg/.webp), invalid extensions, lenient vs strict chapter parsing, malformed inputs, null returns
   - ~12-15 tests

2. **buildImageFilename(chapter, sequence, imageOrder, variant, label, extension?)** → string
   - Builds image filename from components
   - Test: with/without variant, default/custom extension, multi-digit values
   - ~6-8 tests

3. **findNextSequence(items, chapter)** → string
   - Finds next sequence number for a chapter
   - Test: empty array, no matching chapter, single/multiple items, max+1 logic
   - ~8-10 tests

4. **calculateSuggestedNaming(existingFiles)** → `{ chapter, sequence, name }`
   - Suggests naming for new recording based on existing files
   - Test: empty array, all invalid files, single file, multiple chapters, default values
   - ~12-15 tests

**Follow existing test patterns** from the same file:
```typescript
import { describe, it, expect } from 'vitest';
```

Add new describe blocks AFTER existing ones. Do not modify existing tests.

**Step**: Run `npm run build -w shared && npm test`

---

### 3. awb-to-manage (B045)

**Purpose**: Move AWB from top-level nav tab into the Manage sidebar as a tool.

**Files to modify**:
- `client/src/App.tsx` — remove AWB tab button + poem-wui rendering section
- `client/src/components/ManagePanel.tsx` — add 'awb' to ActiveTool, import PoemWuiPage, render it as center content
- `client/src/components/shared/ToolsSidebar.tsx` — add AWB button to sidebar

**Step 1: Read the current state of all 3 files first.**

Read `client/src/App.tsx` to find:
- The AWB tab button (around line 683-692) — REMOVE this button
- The poem-wui rendering section (around line 858-862) — REMOVE this section
- The ViewTab type (line 42-55) — REMOVE 'poem-wui' from the union
- The VALID_TABS array (line 57-71) — REMOVE 'poem-wui' from the array
- The PoemWuiPage import (line 32) — REMOVE this import

**Step 2: Update ManagePanel.tsx**

Add 'awb' to the ActiveTool type:
```typescript
type ActiveTool = 'regen' | 'rename' | 'gling-edit' | 'renumber' | 'relay' | 'awb';
```

Add to toolHeadings:
```typescript
const toolHeadings: Record<string, string> = {
  // ... existing entries
  awb: 'AWB',
};
```

Import PoemWuiPage:
```typescript
import { PoemWuiPage } from './PoemWuiPage';
```

Add AWB rendering in the standalone tools section (alongside relay and gling-edit):
```tsx
{activeTool === 'awb' && <PoemWuiPage />}
```

**Step 3: Update ToolsSidebar.tsx**

Add AWB button. It fits in the Edit group (alongside Gling / Edit) or as its own group. Use the Edit group:
```tsx
<ToolButton
  label="AWB"
  active={activeTool === 'awb'}
  onClick={() => onToolClick('awb')}
  tooltip="Send transcript to AWB YouTube Launch Optimizer"
/>
```

**Step 4**: Run `npm run build -w client && npm test`

**DO NOT MODIFY**: PoemWuiPage.tsx, usePoemWuiApi.ts, server files. PoemWuiPage is already self-contained — just move where it renders.

---

## Success Criteria Checklist

Before marking any work unit complete:

- [ ] `npm run build -w shared` clean (if shared/ was changed)
- [ ] `npm run build -w client` clean
- [ ] `npm test` exits 0 — all existing tests pass + any new tests pass
- [ ] No `any` types in changed code
- [ ] No new lint warnings

---

## Anti-Patterns to Avoid

- **Do not modify server files** — relay routes are correct, we're typing the client side
- **Do not modify existing tests** — add new test blocks, don't change existing ones
- **Do not rename PoemWuiPage** — keep the component name, just move where it renders
- **Do not start the dev server** — build and test only
- **Do not add snapshot tests**

---

## Quality Gates (non-negotiable)

1. `npm run build` clean across all workspaces
2. `npm test` passes — all tests pass
3. All relay hooks have typed responses and HTTP status checks
4. AWB no longer appears in top nav
5. AWB appears in Manage sidebar and renders when clicked
