# IMPLEMENTATION_PLAN.md — tech-debt-round1

**Goal**: Type relay API responses (B043), test shared/naming.ts missing functions (B032), move AWB under Manage sidebar (B045).
**Started**: 2026-03-23
**Target**: All relay hooks typed with HTTP status checks. 4 naming functions tested (~40 tests). AWB moved from top nav to Manage sidebar. `npm test` passes, `npm run build` clean.

## Summary
- Total: 3 | Complete: 3 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

- [x] relay-api-types — B043: Added 7 response type interfaces to shared/types.ts. HTTP status checks + type annotations on all 7 hooks in useRelayApi.ts.
- [x] naming-tests — B032: 42 new tests for parseImageFilename (15), buildImageFilename (7), findNextSequence (8), calculateSuggestedNaming (12). Shared tests: 38→80.
- [x] awb-to-manage — B045: Removed AWB from top nav. Added 'awb' to ActiveTool, ToolsSidebar (Edit group), ManagePanel center content. PoemWuiPage renders inline.

## In Progress

(coordinator moves items here with [~])

## Complete

(coordinator moves items here with [x], adds outcome notes)

## Failed / Needs Retry

(coordinator moves items here with [!], adds failure reason)

---

## Notes & Decisions

**Wave design**: Single wave, 3 agents in parallel (zero file overlap).
- relay-api-types: shared/types.ts + client/src/hooks/useRelayApi.ts
- naming-tests: shared/naming.test.ts
- awb-to-manage: client/src/App.tsx + client/src/components/ManagePanel.tsx + client/src/components/shared/ToolsSidebar.tsx

**awb-to-manage must also update**: shared/index.ts barrel if needed, and ensure PoemWuiPage import in ManagePanel.
