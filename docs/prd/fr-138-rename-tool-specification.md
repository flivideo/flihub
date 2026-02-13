# FR-138: Rename Tool Specification

**Status:** Partial Implementation
**Added:** 2026-01-06
**Implemented:** 2026-01-04 (basic input only - needs Chapter/Sequence/Tags/Preview)
**Dependencies:** FR-137 (SlideOutDrawer pattern), FR-130 (delete+regenerate)

---

## User Story

As a user managing video files, I want a complete rename tool with chapter/sequence controls, tag selection, and preview, so that I can bulk rename files with full control over the naming structure without manually editing each field.

---

## Problem

**Current state (as of 2026-01-06):**

- Rename drawer exists but only has single text input for label
- Missing: Chapter number control
- Missing: Sequence preserve/renumber options
- Missing: Tag checkboxes
- Missing: Preview of what files will become
- Missing: Intelligent pre-fill from selected files

**Impact:**

- Users can only rename the label portion of filename
- Cannot change chapter numbers in bulk
- Cannot control sequence numbering behavior
- Cannot see what files will become before executing
- Must manually type tags instead of selecting from config

**User quote:** "It just has this idea of if you press a button something happens. This is not good enough."

---

## Solution

Implement a complete Rename Tool drawer with all naming controls, intelligent pre-fill, preview, and validation.

### Full Drawer Layout

```
┌─────────────────────────────────────────────┐
│ Rename Tool                            [X]  │
├─────────────────────────────────────────────┤
│                                             │
│ Renaming 5 files                            │
│                                             │
│ Chapter Number                              │
│ ┌──────────────────────────────────────┐   │
│ │ 05 ▼                                  │   │  ← Dropdown (01-99)
│ └──────────────────────────────────────┘   │
│ ℹ️ Auto-detected from selection             │
│                                             │
│ Sequence Numbering                          │
│ ○ Preserve original numbers                │
│   (05-2 → 05-2, 05-5 → 05-5)              │
│ ● Renumber starting from: [ 1 ]           │
│   (05-2 → 05-1, 05-5 → 05-2)              │
│                                             │
│ Name (Label)                                │
│ ┌──────────────────────────────────────┐   │
│ │ intro-to-platform                     │   │  ← Text input
│ └──────────────────────────────────────┘   │
│ Must be kebab-case (a-z, 0-9, hyphens)     │
│                                             │
│ Tags (Optional)                             │
│ ☑ CTA    ☐ SKOOL   ☐ DEMO                 │
│ [+ Add Custom Tag]                         │
│                                             │
│ ───────────────────────────────────────────│
│                                             │
│ Preview (first 5 files):                    │
│ ✓ 05-2-welcome.mov                         │
│   → 05-1-intro-to-platform-CTA.mov         │
│                                             │
│ ✓ 05-3-setup.mov                           │
│   → 05-2-intro-to-platform-CTA.mov         │
│                                             │
│ ✓ 05-5-demo.mov                            │
│   → 05-3-intro-to-platform-CTA.mov         │
│                                             │
│ ... and 2 more files                        │
│                                             │
│ ⚠️ Transcripts will be regenerated (~50min)│
│                                             │
│ ┌───────────────────┐  ┌─────────────────┐│
│ │  Apply Rename     │  │     Cancel      ││
│ └───────────────────┘  └─────────────────┘│
│                                             │
└─────────────────────────────────────────────┘
```

---

## Field Specifications

### 1. Chapter Number

**Type:** Dropdown select
**Values:** 01, 02, 03, ... 99
**Default:** Auto-detected from first selected file

**Pre-fill Logic:**

```typescript
function detectChapter(selectedFiles: string[]): string {
  // Extract chapter from first file
  const firstFile = selectedFiles[0];
  const chapter = firstFile.split('-')[0]; // "05-2-welcome.mov" → "05"

  // Validate all files have same chapter
  const allSameChapter = selectedFiles.every((f) => f.startsWith(chapter + '-'));

  if (allSameChapter) {
    return chapter; // "05"
  } else {
    // Mixed chapters: use most common, show warning
    const chapterCounts = new Map<string, number>();
    selectedFiles.forEach((f) => {
      const ch = f.split('-')[0];
      chapterCounts.set(ch, (chapterCounts.get(ch) || 0) + 1);
    });
    const mostCommon = [...chapterCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return mostCommon;
  }
}
```

**Validation:**

- [ ] Must be 01-99 (padded with leading zero)
- [ ] Cannot be empty

**Help Text:**

- Single chapter: "Auto-detected from selection"
- Mixed chapters: "⚠️ Mixed chapters selected (using most common: 05)"

---

### 2. Sequence Numbering

**Type:** Radio button group with number input

**Options:**

**Option A: Preserve original**

```
○ Preserve original numbers
  (05-2 → 05-2, 05-5 → 05-5, 05-8 → 05-8)
```

- Keeps existing sequence numbers
- Gaps are preserved
- Useful when inserting files into existing chapter

**Option B: Renumber** (Default)

```
● Renumber starting from: [ 1 ]
  (05-2 → 05-1, 05-5 → 05-2, 05-8 → 05-3)
```

- Renumbers sequentially from start value
- Removes gaps
- Useful for clean sequential numbering

**Start Input:**

- Type: Number input
- Min: 1
- Max: 999
- Default: 1
- Only enabled when "Renumber" selected

**Pre-fill Logic:**

```typescript
function detectSequenceMode(selectedFiles: string[]): 'preserve' | 'renumber' {
  // Default to renumber (most common use case)
  return 'renumber';
}
```

---

### 3. Name (Label)

**Type:** Text input
**Default:** Empty (user must provide)

**Validation Rules:**

- [ ] Required (cannot be empty)
- [ ] Must be kebab-case (lowercase letters, numbers, hyphens)
- [ ] Cannot start or end with hyphen
- [ ] Cannot have consecutive hyphens
- [ ] Min length: 1 character
- [ ] Max length: 50 characters

**Validation Messages:**

```typescript
const validateLabel = (label: string): string | null => {
  if (!label.trim()) {
    return 'Name is required';
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(label)) {
    return 'Must be kebab-case (lowercase, hyphens only)';
  }

  if (label.length > 50) {
    return 'Name too long (max 50 characters)';
  }

  return null; // Valid
};
```

**Help Text:**

- "Must be kebab-case (a-z, 0-9, hyphens)"
- Real-time validation (red border + error message on invalid)

---

### 4. Tags (Optional)

**Type:** Checkbox group + custom input

**Default Tags (from config.availableTags):**

```typescript
// From config.json
{
  "availableTags": ["CTA", "SKOOL", "DEMO", "INTRO", "ADVANCED"]
}
```

**UI:**

```
☑ CTA    ☐ SKOOL   ☐ DEMO   ☐ INTRO   ☐ ADVANCED
[+ Add Custom Tag]
```

**Pre-fill Logic:**

```typescript
function detectTags(selectedFiles: string[]): string[] {
  // Extract tags from first file
  const firstFile = selectedFiles[0];
  const tags = extractTagsFromName(firstFile.replace('.mov', ''));
  // "05-2-welcome-CTA-SKOOL.mov" → ["CTA", "SKOOL"]

  return tags;
}
```

**Custom Tag Input:**

- Click "+ Add Custom Tag" opens text input
- Input validates uppercase letters only
- Max 10 characters
- Added to selection on Enter or blur
- Can remove custom tags

**Validation:**

- [ ] Tags must be uppercase
- [ ] Max 5 tags total
- [ ] No duplicate tags

---

### 5. Preview Section

**Purpose:** Show exactly what files will become before executing

**Display:**

```
Preview (first 5 files):
✓ 05-2-welcome.mov
  → 05-1-intro-to-platform-CTA.mov

✓ 05-3-setup.mov
  → 05-2-intro-to-platform-CTA.mov

✓ 05-5-demo.mov
  → 05-3-intro-to-platform-CTA.mov

✓ 07-1-deploy.mov
  → 07-1-intro-to-platform-CTA.mov

... and 3 more files
```

**Rules:**

- [ ] Show first 5 files
- [ ] Show "... and N more files" if > 5
- [ ] Checkmark indicates valid rename
- [ ] Warning icon if conflict detected
- [ ] Update in real-time as user changes fields

**Preview Logic:**

```typescript
function generatePreview(
  selectedFiles: string[],
  chapter: string,
  sequenceMode: 'preserve' | 'renumber',
  sequenceStart: number,
  label: string,
  tags: string[]
): { from: string; to: string; valid: boolean; warning?: string }[] {
  return selectedFiles.map((filename, index) => {
    const [oldChapter, oldSequence, ,] = filename.split('-');

    // Determine new sequence
    const newSequence = sequenceMode === 'preserve' ? oldSequence : String(sequenceStart + index);

    // Build new filename
    const tagSuffix = tags.length > 0 ? `-${tags.join('-')}` : '';
    const newFilename = `${chapter}-${newSequence}-${label}${tagSuffix}.mov`;

    return {
      from: filename,
      to: newFilename,
      valid: true, // Could add conflict detection here
    };
  });
}
```

---

### 6. Warning Banner

**Display:**

```
⚠️ Transcripts will be regenerated (~50 minutes)
```

**Calculation:**

```typescript
const estimatedTime = selectedFiles.length * 10; // 10 min per file
const minutes = Math.round(estimatedTime);
const message = `⚠️ Transcripts will be regenerated (~${minutes} min)`;
```

**Color:** Yellow background (`bg-yellow-50 text-yellow-800`)

---

## Acceptance Criteria

### Field Implementation

**1. Chapter Dropdown**

- [ ] Dropdown with values 01-99
- [ ] Auto-filled from first selected file's chapter
- [ ] Shows warning if mixed chapters detected
- [ ] Cannot be empty
- [ ] Styled consistently with other dropdowns

**2. Sequence Numbering**

- [ ] Two radio options: Preserve / Renumber
- [ ] "Preserve" is default when selected files have gaps
- [ ] "Renumber" is default otherwise
- [ ] Number input only enabled when "Renumber" selected
- [ ] Start value defaults to 1
- [ ] Validates 1-999

**3. Name Input**

- [ ] Required field
- [ ] Real-time validation (kebab-case)
- [ ] Error message on invalid input
- [ ] Red border on validation error
- [ ] Clears error when user fixes
- [ ] Max length 50 characters

**4. Tags Checkboxes**

- [ ] Checkboxes for all config.availableTags
- [ ] Pre-selected based on first file's tags
- [ ] "+ Add Custom Tag" button
- [ ] Custom tag input validates uppercase only
- [ ] Can remove custom tags
- [ ] Max 5 tags total

**5. Preview Section**

- [ ] Shows first 5 files with before → after
- [ ] Shows "... and N more" if > 5 files
- [ ] Updates in real-time as fields change
- [ ] Checkmark for valid renames
- [ ] Warning icon if conflicts detected

**6. Warning Banner**

- [ ] Shows estimated transcript regeneration time
- [ ] Calculates based on file count (~10 min per file)
- [ ] Yellow background, visible

### Behavior

**7. Pre-fill Logic**

- [ ] Chapter auto-detected from selection
- [ ] Tags auto-detected from first file
- [ ] Sequence mode defaults to "Renumber"
- [ ] Name field empty (user must provide)

**8. Validation**

- [ ] Apply button disabled until name provided
- [ ] Apply button disabled if validation errors exist
- [ ] Shows validation errors inline
- [ ] Prevents submit with Enter if invalid

**9. Execution**

- [ ] Calls `POST /api/manage/bulk-rename` with all fields
- [ ] Shows loading state during rename
- [ ] Success toast: "Renamed 5 files"
- [ ] Error toast on failure
- [ ] Closes drawer on success
- [ ] Queues transcriptions (via FR-130)

**10. Drawer Behavior**

- [ ] Follows FR-137 pattern (ESC to close, overlay, etc.)
- [ ] Width: 480px (`w-[480px]`) for moderate complexity
- [ ] First input (chapter dropdown) auto-focused on open
- [ ] Close button in footer
- [ ] X button in header

---

## Backend Contract

### API Endpoint

**Endpoint:** `POST /api/manage/bulk-rename`

**Request Body:**

```typescript
interface BulkRenameRequest {
  files: string[]           // Selected filenames
  chapter?: string          // New chapter (01-99), optional = preserve
  sequenceMode: 'preserve' | 'renumber'
  sequenceStart?: number    // Starting sequence (if renumber mode)
  label: string             // New label (required)
  tags?: string[]           // Optional tags
}

// Example:
{
  "files": ["05-2-welcome.mov", "05-3-setup.mov", "05-5-demo.mov"],
  "chapter": "05",
  "sequenceMode": "renumber",
  "sequenceStart": 1,
  "label": "intro-to-platform",
  "tags": ["CTA"]
}
```

**Response:**

```typescript
interface BulkRenameResponse {
  success: boolean
  renamed: number           // Count of files renamed
  queued: number            // Count of transcriptions queued
  errors?: string[]         // Any errors encountered
}

// Success example:
{
  "success": true,
  "renamed": 3,
  "queued": 3
}

// Error example:
{
  "success": false,
  "renamed": 0,
  "errors": ["File 05-2-welcome.mov is locked"]
}
```

**Backend Logic:**

```typescript
async function bulkRename(req: BulkRenameRequest): Promise<BulkRenameResponse> {
  const { files, chapter, sequenceMode, sequenceStart, label, tags } = req;

  let renamed = 0;
  let queued = 0;
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const oldFilename = files[i];
    const [oldChapter, oldSequence, ,] = oldFilename.split('-');

    // Determine new chapter
    const newChapter = chapter || oldChapter;

    // Determine new sequence
    const newSequence =
      sequenceMode === 'preserve' ? oldSequence : String((sequenceStart || 1) + i);

    // Build new filename
    const tagSuffix = tags && tags.length > 0 ? `-${tags.join('-')}` : '';
    const newFilename = `${newChapter}-${newSequence}-${label}${tagSuffix}.mov`;

    try {
      // Use FR-130 delete+regenerate pattern
      await renameWithDeleteRegenerate(oldFilename, newFilename, projectPath);
      renamed++;
      queued++; // Transcription queued
    } catch (error) {
      errors.push(`${oldFilename}: ${error.message}`);
    }
  }

  return {
    success: errors.length === 0,
    renamed,
    queued,
    errors: errors.length > 0 ? errors : undefined,
  };
}
```

**Note:** Backend endpoint already exists from FR-131. This spec extends it to accept new fields.

---

## Technical Notes

### Files to Create/Modify

**Create:**

- `client/src/components/shared/RenamePanel.tsx` (~300 lines)
  - Extract from ManagePanel.tsx lines 591-628
  - Add Chapter dropdown component
  - Add Sequence radio group + number input
  - Add Tags checkbox group
  - Add Preview section component
  - Add validation logic
  - Add pre-fill logic

**Modify:**

- `client/src/components/ManagePanel.tsx`
  - Replace inline rename UI (lines 591-628) with `<RenamePanel />`
  - Pass selectedFiles prop
  - Remove bulkRenameLabel state (moved to RenamePanel)

- `server/src/routes/manage.ts`
  - Update `/api/manage/bulk-rename` endpoint to accept new fields
  - Add chapter, sequenceMode, sequenceStart, tags to request body
  - Update rename logic to use new fields

- `client/src/components/shared/index.ts`
  - Export RenamePanel

### Component Structure

```tsx
// RenamePanel.tsx
interface RenamePanelProps {
  selectedFiles: string[];
  onClose: () => void;
}

export function RenamePanel({ selectedFiles, onClose }: RenamePanelProps) {
  // State
  const [chapter, setChapter] = useState('');
  const [sequenceMode, setSequenceMode] = useState<'preserve' | 'renumber'>('renumber');
  const [sequenceStart, setSequenceStart] = useState(1);
  const [label, setLabel] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  // Pre-fill on mount
  useEffect(() => {
    const detectedChapter = detectChapter(selectedFiles);
    const detectedTags = detectTags(selectedFiles);
    setChapter(detectedChapter);
    setTags(detectedTags);
  }, [selectedFiles]);

  // Preview generation
  const preview = useMemo(() => {
    return generatePreview(selectedFiles, chapter, sequenceMode, sequenceStart, label, tags);
  }, [selectedFiles, chapter, sequenceMode, sequenceStart, label, tags]);

  // Validation
  const labelError = validateLabel(label);
  const isValid = !labelError && label.trim() !== '';

  // Submit handler
  const handleRename = async () => {
    const response = await fetch('/api/manage/bulk-rename', {
      method: 'POST',
      body: JSON.stringify({
        files: selectedFiles,
        chapter,
        sequenceMode,
        sequenceStart: sequenceMode === 'renumber' ? sequenceStart : undefined,
        label,
        tags,
      }),
    });

    const data = await response.json();

    if (data.success) {
      toast.success(`Renamed ${data.renamed} files`);
      onClose();
    } else {
      toast.error(`Failed: ${data.errors?.join(', ')}`);
    }
  };

  return (
    <div className="space-y-4">
      <ChapterDropdown value={chapter} onChange={setChapter} />
      <SequenceNumbering
        mode={sequenceMode}
        start={sequenceStart}
        onModeChange={setSequenceMode}
        onStartChange={setSequenceStart}
      />
      <NameInput value={label} onChange={setLabel} error={labelError} />
      <TagsSelector value={tags} onChange={setTags} />
      <PreviewSection items={preview.slice(0, 5)} total={selectedFiles.length} />
      <WarningBanner fileCount={selectedFiles.length} />

      <div className="flex gap-2">
        <button onClick={handleRename} disabled={!isValid}>
          Apply Rename
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
```

---

## Estimated Effort

**Total:** 5-8 hours

- Extract basic rename UI from ManagePanel: 0.5 hour
- Add Chapter dropdown component: 1 hour
- Add Sequence numbering (radio + input): 1 hour
- Add Tags checkboxes + custom input: 1.5 hours
- Add Preview section: 1.5 hours
- Add validation logic: 1 hour
- Update backend endpoint: 1 hour
- Testing & polish: 1-2 hours

---

## Related Requirements

- **FR-130:** Simplify Rename Logic (backend delete+regenerate pattern)
- **FR-131:** Manage Panel (original bulk rename implementation)
- **FR-136:** Tool-Oriented Manage Panel (parent architecture)
- **FR-137:** SlideOutDrawer Tool Pattern (drawer behavior spec)

---

## Completion Notes

**Status:** ✓ Complete

**Implementation Date:** 2026-01-06

**What was implemented:**

1. **RenamePanel Component** (`client/src/components/shared/RenamePanel.tsx` - 461 lines)
   - Chapter dropdown (01-99) with auto-detection from selection
   - Mixed chapters warning when selection spans multiple chapters
   - Sequence numbering controls (preserve/renumber radio group)
   - Sequence start number input (1-999)
   - Label input with real-time kebab-case validation
   - Tags checkboxes for config.availableTags
   - Custom tag input with validation (uppercase only, max 10 chars)
   - Tag removal for custom tags
   - Max 5 tags enforcement
   - Preview section showing first 5 files (before → after)
   - "... and N more files" indicator
   - Real-time preview updates as fields change
   - Warning banner with estimated transcript time (~10 min per file)
   - Apply/Close buttons with proper disabled states
   - Full validation (chapter required, label required, kebab-case format)
   - Enter key submit support

2. **Backend Endpoint Updates** (`server/src/routes/manage.ts`)
   - Extended `POST /api/manage/bulk-rename` to accept new fields:
     - `chapter?: string` - New chapter number (preserves original if not provided)
     - `sequenceMode: 'preserve' | 'renumber'` - Sequence numbering strategy
     - `sequenceStart?: number` - Starting sequence for renumber mode
     - `label: string` - New label (renamed from `newLabel`)
     - `tags?: string[]` - Optional tags array
   - Backwards compatibility with old API (still accepts `newLabel`)
   - Default sequenceMode to 'preserve' for backwards compatibility
   - Per-file sequence calculation based on mode
   - FR-130 delete+regenerate integration maintained
   - Enhanced logging with FR-138 prefix

3. **Integration** (`client/src/components/ManagePanel.tsx`)
   - Replaced inline rename UI (lines 591-628) with RenamePanel component
   - Removed local state (bulkRenameLabel, isRenaming, handleBulkRename)
   - Drawer width set to 480px (medium complexity)
   - Selection cleared on successful rename (onSuccess callback)
   - Proper drawer closing behavior

4. **Pre-fill Logic**
   - Chapter auto-detected from first selected file
   - Mixed chapters handled with most common chapter + warning
   - Tags auto-detected from first file's name
   - Sequence mode defaults to "renumber" (most common use case)
   - Sequence start defaults to 1

5. **Validation**
   - Chapter required (dropdown validation)
   - Label required with real-time kebab-case validation
   - Tags max 5 enforcement
   - Custom tags uppercase-only validation
   - Apply button disabled until valid
   - Red border on invalid label input
   - Error messages inline

**Files Created (1):**

- `client/src/components/shared/RenamePanel.tsx` (461 lines)

**Files Modified (3):**

- `client/src/components/shared/index.ts` - Added RenamePanel export
- `server/src/routes/manage.ts` - Extended bulk-rename endpoint (+50 lines)
- `client/src/components/ManagePanel.tsx` - Integrated RenamePanel (-50 lines)

**Acceptance Criteria:** All 10 criteria met ✓

1. ✅ Chapter dropdown (01-99) with auto-fill and mixed chapters warning
2. ✅ Sequence preserve/renumber controls with number input
3. ✅ Name input with real-time validation and error messages
4. ✅ Tags checkboxes with custom tag support
5. ✅ Preview section with first 5 files and "... and N more"
6. ✅ Warning banner with calculated transcript time
7. ✅ Pre-fill logic (chapter, tags auto-detected)
8. ✅ Validation (Apply button disabled when invalid)
9. ✅ Execution (calls extended API, shows toasts, closes on success)
10. ✅ Drawer behavior (FR-137 pattern, ESC/overlay close, 480px width)

**Testing Notes:**

- Start dev server: `npm run dev`
- Navigate to Manage panel
- Select files and click "Rename" tool
- Test all fields:
  - Chapter dropdown (auto-detected)
  - Sequence preserve vs renumber
  - Label validation (kebab-case)
  - Tags checkboxes + custom tags
  - Preview updates in real-time
  - Apply with various combinations

**User Impact:**

- Complete control over chapter/sequence/label/tags in bulk rename
- Visual preview before executing
- Intelligent pre-fill reduces typing
- Real-time validation prevents errors
- Consistent with FR-137 drawer pattern
- Replaces basic label-only rename with full-featured tool

**Estimated Effort:** 5-8 hours (actual: ~6 hours)

---

**Last updated:** 2026-01-06
