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

## ⚠️ Must-Fix Before Major Feature (from 3-lens audit 2026-03-19)

Three structural fixes recommended before any new major feature. Est. 1–2 days total.

- **B024** — Replace hardcoded PROJECTS_ROOT in 7+ files with `getConfig().projectsRootDirectory`
- **B025** — Make `writeProjectState` atomic (write to .tmp, then fs.rename) — 3-line change
- **B026** — Normalize config access — all route factories use `() => getConfig()` getter; remove `Object.assign` bypass
- **B027** — Add chapter 99 existence check before swap-chapters

These are a natural campaign: `pre-feature-stabilisation` — 4 targeted fixes, no new features, all have clear done-when criteria.

---

## Suggested Next Campaign Options

### Option A — Pre-Feature Stabilisation (RECOMMENDED FIRST)
4 structural fixes from the 3-lens audit. Low-risk, unblocks everything else safely.
Work units: B024, B025, B026, B027

### Option B — Test Coverage Gaps (high regression risk)
Address the critical untested paths found in test-quality audit.
Work units: B028 (rename orchestration), B029 (extractChapters), B030 (client srt.ts), B031 (editManifest)

### Option C — Dual Transcription System (FR-132)
Highest-priority feature in backlog. Has a full PRD.
**Do B024+B026 first** — this feature touches config and multi-project logic.

### Option D — Server Refactoring NFRs
Bundle B010 + B011 + B012 (query routes, error handling, response types).
All have PRDs. Low complexity individually, high value as a bundle.

---

## Pre-Campaign Checklist

```bash
npm test        # verify 331 tests still pass
npm run build   # verify TypeScript clean
```
