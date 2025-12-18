# FR-93: Project Name Shows Full Path on Windows

**Status:** Pending
**Added:** 2025-12-16
**Implemented:** -

---

## User Story

As a Windows user, I want the project dropdown to show just the project code, not the full WSL path.

## Problem

On Windows with WSL paths, the project dropdown shows the full path instead of just the project code.

**David sees (Mac):**
```
b71-bmad-poem
```

**Jan sees (Windows/WSL):**
```
\\wsl$\Ubuntu\home\jan\dev\video-projects\v-appydave\b59-n8n-digital-ocean
```

## Context

- FliHub runs on Windows: `C:\Users\rjanr\flivideo\flihub`
- Video projects are on WSL: `\\wsl$\Ubuntu\home\jan\dev\video-projects\v-appydave`
- The path watching/file operations work correctly
- Only the UI display is wrong

## Jan's Config (for reference)

```json
{
  "projectsRootDirectory": "\\\\wsl$\\\\Ubuntu\\\\home\\\\jan\\\\dev\\\\video-projects\\\\v-appydave",
  "activeProject": "b59-n8n-digital-ocean"  // ← Correct value exists!
}
```

## Solution

The UI is deriving the project name from the full path instead of using `config.activeProject` directly.

**Fix Approach:**
1. Find where the project dropdown gets its display value
2. Change from deriving via `path.basename(fullPath)` to using `config.activeProject` directly
3. The config already has the correct value - just use it

## Acceptance Criteria

- [ ] Project dropdown shows only project code on Windows with WSL paths
- [ ] Works for both `C:\...` paths and `\\wsl$\...` paths

## Technical Notes

The config already stores `activeProject` as just the folder name. The fix is to use this value directly in the UI rather than parsing it from the full path.

## Completion Notes

_To be filled by developer._
