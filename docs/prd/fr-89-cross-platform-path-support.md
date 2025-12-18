# FR-89: Cross-Platform Path Support

**Status:** Pending (Parts 1b, 2 implemented - awaiting UAT)
**Added:** 2025-12-16
**Implemented:** -

---

## User Story

As a Windows/WSL user, I want FliHub to properly handle my file paths so I can use the application without path-related errors.

## Problem

Jan (Windows user) encountered multiple issues with path handling in the Config panel. This FR addresses all cross-platform compatibility issues.

---

## Part 1: Path Validation

**Problem:** Current validation "Path must start with ~ or /" rejects valid Windows paths.

**Valid paths to accept:**

| Platform | Example |
|----------|---------|
| Unix | `/Users/david/dev/...` |
| Unix (home) | `~/dev/...` |
| Windows | `C:\Users\jan\dev\...` |
| Windows UNC | `\\wsl$\Ubuntu\home\jan\dev\...` |
| WSL from Windows | `//wsl$/Ubuntu/home/jan/dev/...` |

**Validation regex:**
```
^(~|/|[A-Za-z]:\\|\\\\)
```
- Starts with `~` (Unix home) - **Mac/Linux only**
- Starts with `/` (Unix absolute)
- Starts with drive letter like `C:\` (Windows)
- Starts with `\\` (UNC/network path)

**Important:** Tilde (`~`) does NOT work on Windows. Node.js doesn't expand it - it's a shell feature. Windows users must use full paths.

---

## Part 1b: Tilde Expansion (Mac/Linux only)

**Status:** ✅ Already implemented

**Problem:** If user enters `~/dev/video-projects`, Node.js won't expand it.

**Requirements:**
- Server-side: Replace `~` with `os.homedir()` before any filesystem operations
- Only applies on Mac/Linux (Windows users won't use tilde)
- Example: `~/dev/...` → `/Users/david/dev/...`

---

## Part 2: Path Existence Indicators

**Status:** ✅ Implemented (Awaiting UAT)

**Problem:** Only shadow section shows "Path not found" warning. All path fields need this.

**Bug reported (2025-12-16):** Jan reports paths not going green on Windows. His paths:
- `C:\Users\rjanr\Downloads` - standard Windows
- `\\wsl$\Ubuntu\home\jan\dev\video-projects\v-appydave` - WSL UNC path

**Requirements:**
- Each directory field shows status indicator:
  - ✅ Green checkmark if path exists
  - ⚠️ Yellow warning with "Path not found" if doesn't exist
- Check happens on blur (not every keystroke)
- Server endpoint: `GET /api/system/path-exists?path=...`

**Fix (2025-12-16):** Replaced `fs.pathExists()` with `fs.stat()` + try/catch for better Windows UNC path support.

**Needs Jan to UAT on Windows after pulling.**

**Affected fields:**
1. Ecamm Watch Directory
2. Projects Root Directory (see Part 5)
3. Image Watch Directory

---

## Part 3: Cross-Platform Folder Picker

**Problem:** Folder 📁 buttons open Finder, need to work on Windows.

**Requirements:**
- Detect OS server-side
- Mac: `open -R <path>` (Finder)
- Windows: `explorer <path>` (Explorer)
- Linux: `xdg-open <path>`

**Centralization audit needed:** Ensure all "open folder" functionality uses a single `openInFileExplorer(path)` function. Current locations to check:
- Config panel folder buttons
- Project actions menu "Open in Finder"
- Any recording/asset context menus

**Server endpoint:** `POST /api/system/open-folder` (existing, needs Windows support)

---

## Part 4: Input Sanitization

**Problem:** Jan pasted `"\\wsl$\..."` with quotes (common copy-paste error).

**Requirements:**
- Strip leading/trailing quotes on save
- Strip leading/trailing whitespace
- Show brief toast/warning if quotes were stripped: "Quotes removed from path"

---

## Part 5: Root Directory Architecture

**Problem:** `projectDirectory` holds full path. When switching projects, entire path changes. The "root" is implicit.

**Current config:**
```json
{
  "projectDirectory": "/Users/david/dev/video-projects/v-appydave/b67"
}
```

**New config:**
```json
{
  "projectsRootDirectory": "/Users/david/dev/video-projects/v-appydave",
  "activeProject": "b67"
}
```

**Benefits:**
- Root path configured once (OS-specific part)
- Project selection is just the folder name
- Cleaner mental model
- Project list already scans a root - this makes it explicit

**UI changes:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Projects Root Directory                                    [📁] │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ /Users/david/dev/video-projects/v-appydave                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ✅ Path exists • 47 projects found                              │
│                                                                   │
│  Active Project                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ b67                                                     [▼] │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  Or select from Projects panel                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Migration:**
- On startup, if old `projectDirectory` exists and new fields don't:
  - Split: `projectsRootDirectory` = dirname, `activeProject` = basename
  - Write new fields, remove old field
- Server derives full path: `path.join(projectsRootDirectory, activeProject)`

**Backward compatibility:**
- Migration happens automatically on first load
- No manual user action required

---

## Part 6: Shadow Resolution Config

**Problem:** Shadow videos hardcoded at 240p. Want to test lower resolutions (160p) for smaller files.

**New config field:**
```json
{
  "shadowResolution": 240
}
```

**UI addition to Shadow Recordings section:**
```
Default Shadow Resolution
(○) 240p  (○) 180p  (○) 160p
Lower = smaller files, less detail
```

**FFmpeg change:** Currently uses `-vf scale=-2:240`. Change to `-vf scale=-2:{shadowResolution}`.

---

## Part 7: Documentation Update

Update `docs/guides/cross-platform-setup.md` with:

1. **Path format section:**
   - Windows: Use forward slashes or escaped backslashes
   - No quotes around paths
   - Examples for native Windows, WSL, network paths

2. **Configuration after root directory change:**
   - Explain the two-field model (root + project)
   - How to set up for different base paths

---

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/ConfigPanel.tsx` | Validation, existence indicators, new fields UI |
| `server/src/index.ts` | Config migration, path validation, open-folder Windows support |
| `server/src/routes/system.ts` | New `/path-exists` endpoint (if not exists) |
| `shared/constants.ts` or `shared/validation.ts` | Cross-platform path regex |
| `docs/guides/cross-platform-setup.md` | Path format documentation |

## Acceptance Criteria

- [ ] Windows paths accepted (drive letters, UNC)
- [ ] All 3 path fields show existence status
- [ ] Folder buttons open correct file explorer per OS
- [ ] Quotes stripped from pasted paths
- [ ] Config shows Projects Root + Active Project (not full projectDirectory)
- [ ] Old projectDirectory auto-migrates on first load
- [ ] Shadow resolution configurable (240/180/160)
- [ ] Cross-platform setup guide updated

## Completion Notes

_To be filled by developer._
