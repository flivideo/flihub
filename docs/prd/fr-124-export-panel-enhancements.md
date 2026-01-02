# FR-124: Export Panel Enhancements

**Status:** ✓ Complete
**Added:** 2026-01-02
**Implemented:** 2026-01-02
**Dependencies:** FR-122

---

## User Story

As a video creator, I want the Export panel to handle folder creation and show Gling prep info, so I don't need to navigate to a separate EditPrep modal.

---

## Problem

1. **Folder doesn't exist error** - "Open Folder" button in Export fails when `edit-1st` doesn't exist
2. **EditPrep is awkward** - Useful info scattered across modal that's hard to find
3. **No folder creation** - User has to go elsewhere to create edit folders

---

## Solution

### Part 1: Smart Open/Create Button

Dynamic button that detects folder existence:
- When folder exists: Shows "📂 Open Folder"
- When folder missing: Shows "📂 Create Folder" (green)

### Part 2: Edit Folders Section

```
── Edit Folders ─────────────────────────────────
✓ edit-1st    ← Gling exports     [Open]
○ edit-2nd    ← Jan's edits       [Create]
○ edit-final  ← Final publish     [Create]

                         [Create All Folders]
```

### Part 3: Gling Prep Info (Collapsible)

```
▼ Gling Prep Info ────────────────────────────────

Gling Filename
b87-poem-epic-3                           [Copy]

Dictionary Words (12)
Claude, Gling, Anthropic, ...             [Copy]
```

---

## Acceptance Criteria

- [x] "Open Folder" shows "Create" when folder doesn't exist (no error)
- [x] Can create individual edit folders from Export panel
- [x] Can create all folders at once
- [x] Folder existence indicators (✓/○)
- [x] Gling filename displayed with copy button
- [x] Dictionary words with copy button
- [x] Collapsible Gling Prep section

---

## Completion Notes

**Implemented:** 2026-01-02

### Files Modified

**Server:**
- `server/src/routes/edit.ts` - Added single folder creation endpoint

**Client:**
- `client/src/components/ExportPanel.tsx` - Main UI enhancements
- `client/src/hooks/useEditApi.ts` - Added single folder mutation hook

### API Endpoints

**New:**
- `POST /api/edit/create-folder` - Creates a single folder
  - Request: `{ folder: "edit-1st" | "edit-2nd" | "edit-final" }`
  - Validates folder names for security

**Reused:**
- `GET /api/edit/prep` - Fetches folder status and Gling info
- `POST /api/edit/create-folders` - Creates all three folders

### Features Built

1. **Smart Open/Create Button**
   - Detects folder existence
   - Green "Create" when missing, gray "Open" when exists
   - Updates immediately after creation

2. **Edit Folders Section**
   - Status indicators (✓ green, ○ gray)
   - Individual Create/Open buttons per folder
   - "Create All Folders" button (hidden when all exist)

3. **Gling Prep Info Section**
   - Collapsible (▼/▶)
   - Gling filename with copy
   - Dictionary words with count and copy
   - Shows "(none configured)" when empty
