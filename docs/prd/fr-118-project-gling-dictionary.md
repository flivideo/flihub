# FR-118: Project-Specific Gling Dictionary

**Status:** Pending
**Added:** 2025-12-31
**Implemented:** -
**Origin:** Developer suggestion during FR-116 implementation

---

## User Story

As a user, I want project-specific dictionary words so transcription accuracy improves for project-unique terminology without polluting the global dictionary.

## Problem

Current state:
- Single "Gling Dictionary Words" textarea in Config
- Words apply globally to all projects
- Examples in global: AppyDave, BMAD, FliVideo

Some dictionary words are brand-wide (AppyDave, BMAD), but others are project-specific:
- "Claudemas" only relevant for b86
- "Theodore" only for a future project
- Technical terms specific to a video topic

No way to separate these currently - global dictionary gets cluttered with one-off terms.

## Solution

Split into two dictionaries that merge at transcription time:

### 1. Global Dictionary (existing)
- Brand names: AppyDave, BMAD, FliVideo
- Common tech terms: Claude, Anthropic
- Persists in `server/config.json`
- Editable in Config panel (current behavior)

### 2. Project Dictionary (new)
- Project-specific terms
- Storage options:
  - **Option A:** In `.flihub-state.json` (FR-111 infrastructure exists)
  - **Option B:** New file: `{project}/gling-dictionary.txt`
- Merged with global when generating First Edit Prep

### Merge Behavior
When generating First Edit Prep dictionary:
```
final_dictionary = global_words + project_words
```

Duplicates removed, alphabetically sorted.

## UI Options

1. **Config panel extension** - Add "Project Dictionary" textarea below global one
2. **First Edit Prep modal** - Small expandable section for project words
3. **Projects panel** - Per-project config accessible from project row

**Recommendation:** Option 1 (Config panel) is simplest and consistent with current pattern.

## Acceptance Criteria

- [ ] Project dictionary stored per-project
- [ ] Project dictionary editable in UI
- [ ] Global + project dictionaries merged for First Edit Prep
- [ ] Empty project dictionary doesn't affect behavior
- [ ] Clear indication which dictionary is being edited

## Technical Notes

- `.flihub-state.json` already exists per-project (FR-111)
- Adding `glingDictionary: string[]` to ProjectState type is straightforward
- Config panel already has project context via `projectDirectory`

## Scope

**Size:** Small
**Dependencies:** None (FR-111 infrastructure already in place)

## Completion Notes

_To be filled by developer._
