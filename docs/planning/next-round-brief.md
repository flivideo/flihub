# Next Round Brief — FliHub

**Written**: 2026-03-19
**Status**: Auto-detected by Ralphy on session start

---

## Context

Three NFR campaigns completed on 2026-03-16:
- nfr-146-test-coverage: 3 placeholders → 331 real tests
- nfr-code-quality-1: srtUtils, path traversal, isPathWithinProject
- nfr-architecture-refactor: configManager, s3Utils, poemWuiUtils, useApi barrel

The codebase now has a trustworthy test baseline. The next wave should either:
1. Build on the test infrastructure (hook tests, coverage report, E2E), or
2. Tackle B001 (Dual Transcription System, the highest-priority feature)

---

## Suggested Next Campaign Options

### Option A — Test Infrastructure Round 2 (NFR)
Low-risk, builds on existing momentum.

Suggested work units:
- B022: Run vitest --coverage, document real baselines, tighten thresholds
- B023: Replace sample.test.ts placeholder with a real server smoke test
- B020: React hook tests for useSocket.ts + domain useApi hooks

### Option B — Dual Transcription System (FR-132)
Highest-priority feature in backlog. Has a full PRD.
PRD: `docs/prd/fr-132-dual-transcription-progress.md`
Recommend running test suite before starting — verify 331 tests still pass.

### Option C — Server Refactoring NFRs
Bundle B010 + B011 + B012 (query routes, error handling, response types) as a single cleanup wave.
All have PRDs. Low complexity individually, high value as a bundle.

---

## Pre-Campaign Recommendation

Before planning whichever option is chosen, run:
```bash
npm test        # verify 331 tests still pass
npm run build   # verify TypeScript clean
```

Also consider: `appydave:architectural-review` to catch structural concerns before building on top of them.
