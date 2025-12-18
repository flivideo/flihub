# Implementation Notes

This document captures implementation details, decisions, and learnings discovered during development. It's separate from the backlog (what to do) and specs (how to do it) - this is "what we learned while doing it".

---

## Format

Each entry should include:
- **Date**
- **Related FR/NFR**
- **What was discovered**
- **Resolution or open question**

---

## Notes

### 2025-11-29: Global vs Suggested Tags Distinction

**Related:** NFR-2, NFR-3

**Discovery:** Initial implementation put all tags in `availableTags` including ENDCARD. But tags have two different behaviors:

1. **Global tags** (CTA, SKOOL) - Apply to any segment, always visible
2. **Suggested tags** (ENDCARD) - Context-specific, only shown for certain common names

**Resolution:**
- `availableTags` should only contain truly global tags: `["CTA", "SKOOL"]`
- Context-specific tags go in `suggestTags` on the relevant commonName: `{ "name": "outro", "suggestTags": ["ENDCARD"] }`

---

### 2025-11-29: Good Take Algorithm v1 Failure

**Related:** FR-8

**Discovery:** Linear weighting (40% size, 60% recency) fails when baseline + junk files exist. Small recent junk files (1.2 MB) beat large baseline (40.5 MB).

**Resolution:** Needs rework. See `docs/recording-namer/good-take-algorithm.md` for full analysis and test cases.

---

### 2025-11-29: Trash Folder Naming

**Related:** FR-5

**Issue:** `.trash/` is hidden in Finder (macOS hides dot-prefixed folders by default). User needs to see these folders without pressing Cmd+Shift+.

**Resolution:** Rename from `.trash` to `-trash` for consistency with `-safe` pattern.

```
project/
├── -trash/       <- discarded files (visible in Finder)
├── -safe/        <- processed files (visible in Finder)
├── recordings/   <- active files
└── assets/
```

**Migration needed:**
- `/Users/davidcruwys/dev/video-projects/v-appydave/b71-bmad-poem/.trash` → `-trash`
- `/Users/davidcruwys/dev/video-projects/v-appydave/b72-opus-4.5-awesome/.trash` → `-trash`
- Delete: `/Users/davidcruwys/dev/video-projects/v-appydave/b72-opus-4.5-awesome/recordings/.trash` (incorrect location)

---
