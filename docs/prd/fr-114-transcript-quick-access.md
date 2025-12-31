# FR-114: Projects Page - Transcript Quick Access

**Added:** 2025-12-30
**Status:** Pending
**Scope:** Medium (UI + new API endpoints)

---

## User Story

As a content creator preparing AI context or video descriptions, I want to quickly copy project transcripts to my clipboard so I can use them in external tools without navigating through multiple screens.

---

## Problem

Currently, accessing a project's combined transcript requires:
1. Selecting the project
2. Navigating to Recordings tab
3. Finding the transcript button
4. Opening the modal
5. Copying the content

For multi-project workflows (e.g., creating a video series summary), this is tedious and slow.

---

## Solution

Add transcript quick-access features directly to the Projects panel:

### Phase 1: Single Project Copy
- Add a small clipboard icon next to each project row
- Click copies the project's combined transcript to clipboard
- Toast confirmation: "Transcript copied (12,345 chars)"

### Phase 2: Multi-Select Infrastructure
- Add selection checkboxes to project rows
- "Select All" / "Clear" buttons in header
- Selected count indicator

### Phase 3: Multi-Select Transcript Concatenation
- When multiple projects selected, enable "Copy All Transcripts" action
- Concatenates transcripts with project headers as separators
- Format:
  ```
  === b85-project-name ===

  [transcript content]

  === b86-another-project ===

  [transcript content]
  ```

---

## UI Mockup

### Single Project Row (Phase 1)
```
┌─────────────────────────────────────────────────────────────────────┐
│ ⭐ │ b85-project │ REC │ 24 │ 100% │ 📋 │ ...                      │
└─────────────────────────────────────────────────────────────────────┘
                                        ↑
                                   Copy transcript button
```

### Multi-Select Mode (Phase 2-3)
```
┌─────────────────────────────────────────────────────────────────────┐
│ [Select All] [Clear]                           3 selected  [📋 Copy]│
├─────────────────────────────────────────────────────────────────────┤
│ ☑ │ ⭐ │ b85-project │ REC │ 24 │ 100% │ 📋 │                       │
│ ☐ │    │ b84-project │ EDIT│ 18 │ 100% │ 📋 │                       │
│ ☑ │ ⭐ │ b83-project │ DONE│ 32 │ 100% │ 📋 │                       │
│ ☑ │    │ b82-project │ REC │ 12 │  75% │ 📋 │                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technical Notes

### New API Endpoint
- `GET /api/query/projects/:code/transcript/text` - Returns plain text transcript
- Reuses existing combined transcript logic from `/api/transcriptions/:projectCode/combined`

### Client Changes
- `ProjectsPanel.tsx` - Add copy button per row, multi-select state
- New hook: `useCopyTranscript` - Handles clipboard copy with toast

### Multi-Select State
```typescript
interface MultiSelectState {
  enabled: boolean;
  selectedCodes: Set<string>;
}
```

---

## Acceptance Criteria

### Phase 1
- [ ] Single-click copy button on each project row
- [ ] Toast shows confirmation with character count
- [ ] Button disabled if project has no transcripts (0%)
- [ ] Copy icon uses same style as existing clipboard buttons

### Phase 2
- [ ] Checkbox appears on each row when multi-select enabled
- [ ] Select All/Clear buttons functional
- [ ] Selected count shows in header

### Phase 3
- [ ] "Copy All Transcripts" concatenates selected projects
- [ ] Clear separator headers between projects
- [ ] Projects ordered by code (ascending)

---

## Future Considerations

Multi-select infrastructure enables future bulk operations:
- Bulk stage changes
- Bulk export to JSON
- Bulk transcript regeneration

---

## Completion Notes

_To be filled in by developer after implementation._
