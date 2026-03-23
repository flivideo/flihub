# Assessment: tech-debt-round1

**Campaign**: tech-debt-round1
**Date**: 2026-03-23
**Results**: 3 complete, 0 failed

## Results Summary

| Work Unit | ID | Outcome |
|-----------|-----|---------|
| relay-api-types | B043 | 7 response type interfaces added to shared/types.ts. HTTP status checks + type annotations on all 7 hooks in useRelayApi.ts. |
| naming-tests | B032 | 42 new tests: parseImageFilename (15), buildImageFilename (7), findNextSequence (8), calculateSuggestedNaming (12). Shared tests: 38 → 80. |
| awb-to-manage | B045 | AWB removed from top nav (ViewTab union, VALID_TABS, tab button, rendering section). Added as tool in Manage sidebar (ActiveTool type, ToolsSidebar Edit group, ManagePanel center content via PoemWuiPage). |

**Test count**: 925 total (80 shared + 167 client + 678 server)
**Build**: clean (`npm run build -w client` + `npm test` pass)

## What Worked Well

1. **Single-wave parallel execution** — all 3 work units had zero file overlap, ran as parallel agents with no conflicts
2. **AGENTS.md inheritance** — inherited from manage-panel-polish; agents had rich context about the codebase, patterns, and quality gates
3. **Clean scope** — each work unit was small and well-defined; no scope creep, no discovery surprises
4. **42 naming tests** — covered all 4 untested functions with edge cases; caught real parsing behaviors that weren't obvious from the code

## What Didn't Work

1. **shared workspace has no build script** — `npm run build -w shared` fails. Agents and coordinator kept trying it. AGENTS.md should note: "shared has no build step; just run `npm run build -w client` and `npm test`"
2. **Quality audit skipped** — campaign was a cleanup/typing campaign with no new logic; user declined audit on the prior similar campaign, so skipped here too. Acceptable for this scope.

## Key Learnings — Application

- **Relay response types now match server shapes** — verified by reading `server/src/routes/relay.ts` before writing types. RelayProjectInfo already existed in shared/types.ts.
- **AWB migration pattern** — standalone tools (AWB, Relay) render as center content with no file list; PoemWuiPage is self-contained and just needs importing
- **parseImageFilename** has lenient mode (default) that accepts bare sequences and strict mode for full chapter-sequence parsing — 15 tests now document this

## Key Learnings — Ralph Loop

- **3-unit single-wave** is the sweet spot for cleanup campaigns — no wave coordination needed, agents complete independently
- **AGENTS.md "Build & Run Commands" section** needs a note about shared having no build script — this tripped up agents twice across two campaigns

## Promote to Main KDD?

- shared workspace build note (no build script) — add to AGENTS.md permanently
- AWB standalone tool pattern — already documented by the code itself

## Suggestions for Next Campaign

- **B044 (app auto-update)** is the highest-priority open item — collaborators need version notifications
- **Structural debt** (B033-B037) remains — lower priority but accumulating
- **Jan's machineRole** still needs setting (machine was offline during this session)
- Consider: ManagePanel is now 650+ lines with 6 tools — may benefit from extracting tool rendering into sub-components
