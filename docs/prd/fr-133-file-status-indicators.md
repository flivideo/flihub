# FR-133: File Status Indicators

**Status:** Pending
**Added:** 2026-01-04
**Implemented:** -
**Dependencies:** FR-130 (delete+regenerate pattern), FR-132 (dual transcription with Groq)

---

## User Story

As a user in the Manage panel, I want to see at a glance which derivative files exist for each recording (shadows, transcripts, chapter videos, manifest entries) with warnings for stale or low-quality files, so I can identify file management issues without checking multiple locations.

---

## Problem

**Current state:**
- Derivative file existence is scattered across multiple tabs
- No visibility into whether shadows/transcripts exist without checking other panels
- No warning when transcripts/shadows are stale (older than recording)
- No warning when Groq transcription accuracy is low (<97%)
- Users can't tell if a recording has all expected derivative files

**Impact:**
- Time wasted checking multiple locations
- Missing derivative files go unnoticed
- Stale files (outdated after re-recording) cause confusion
- Low-quality Groq transcripts aren't flagged

---

## Solution

Add **hybrid badge/hover status indicators** to the Manage panel only:

### Badge System

**Visual design:**
```
01-1-intro.mov ✓ [7]
01-2-setup.mov ⚠️ [5]
01-3-demo.mov ✗ [0]
```

**Three-state badge:**
- `✓` Green checkmark: All expected files present, no warnings
- `⚠️` Yellow warning: Files present but has warnings (stale, low accuracy)
- `✗` Red X: No derivative files

**Count badge:** `[N]` shows total derivative files (hover for breakdown)

---

### Hover Tooltip Breakdown

**Example tooltip for `01-1-intro.mov ✓ [7]`:**
```
Derivative Files (7):
✓ Shadow (.txt)
✓ Shadow in -safe (.txt)
✓ Whisper transcript (.txt)
✓ Whisper SRT (.srt)
✓ Groq transcript (98.5% accuracy)
✓ Chapter video (01-intro.mov)
✓ Manifest entry (edit-01/manifest.json)
```

**Example tooltip for `01-2-setup.mov ⚠️ [5]`:**
```
Derivative Files (5):
✓ Shadow (.txt)
✓ Shadow in -safe (.txt)
⚠️ Whisper transcript (STALE - 3 days old)
✓ Whisper SRT (.srt)
⚠️ Groq transcript (94.2% accuracy - LOW)
✗ Chapter video (not found)
✓ Manifest entry (edit-01/manifest.json)
```

---

### Tracked Derivative Files

| File Type | Path Pattern | Warning Conditions |
|-----------|--------------|-------------------|
| Shadow (main) | `recording-shadows/{base}.txt` | Older than recording (stale) |
| Shadow (safe) | `recording-shadows/-safe/{base}.txt` | Older than recording (stale) |
| Whisper transcript | `recording-transcripts/{base}.txt` | Older than recording (stale) |
| Whisper SRT | `recording-transcripts/{base}.srt` | Older than recording (stale) |
| Groq transcript | `recording-transcripts/{base}.groq.txt` | Accuracy < 97% (from metadata) |
| Chapter video | `recordings/-chapters/{chapter}-{label}.mov` | - |
| Manifest entry | `edit-{folder}/manifest.json` | Contains this filename |

**Note:** Groq accuracy requires FR-132 (dual transcription) to be implemented and storing accuracy metadata.

---

### Warning Logic

**Stale file detection:**
```typescript
function isStale(recordingPath: string, derivativePath: string): boolean {
  const recordingStat = fs.statSync(recordingPath)
  const derivativeStat = fs.statSync(derivativePath)

  // Derivative is stale if it's older than the recording
  return derivativeStat.mtimeMs < recordingStat.mtimeMs
}
```

**Groq accuracy warning:**
```typescript
// Read from {base}.groq.json metadata (FR-132)
interface GroqMetadata {
  accuracy: number // 0.0 to 1.0
  comparedTo: 'whisper' // Which transcript used for comparison
  timestamp: string
}

function hasLowAccuracy(groqMetadataPath: string): boolean {
  const metadata: GroqMetadata = JSON.parse(fs.readFileSync(groqMetadataPath, 'utf-8'))
  return metadata.accuracy < 0.97
}
```

---

## Acceptance Criteria

### Core Functionality

**1. Badge Display (Manage Panel Only)**
- [ ] Each recording row shows status badge (✓, ⚠️, or ✗)
- [ ] Badge shows count of derivative files `[N]`
- [ ] Badge color matches status (green/yellow/red)
- [ ] NOT shown in Recordings panel (Manage panel only)

**2. Status Calculation**
- [ ] ✓ Green: All expected files present, no warnings
- [ ] ⚠️ Yellow: Has warnings (stale files OR low Groq accuracy)
- [ ] ✗ Red: Zero derivative files exist

**3. Hover Tooltip**
- [ ] Hover on badge shows detailed breakdown
- [ ] Lists all 7 derivative file types
- [ ] Shows ✓ for present, ✗ for missing
- [ ] Shows ⚠️ with reason for warnings
- [ ] Stale files show age: "STALE - 3 days old"
- [ ] Low Groq accuracy shows percentage: "94.2% accuracy - LOW"

**4. Stale File Detection**
- [ ] Compare file modification times (mtime)
- [ ] Mark derivative as stale if older than recording
- [ ] Show "STALE - X days old" in tooltip
- [ ] Apply to: shadows, Whisper transcripts, Whisper SRT

**5. Groq Accuracy Warning**
- [ ] Read accuracy from `{base}.groq.json` (FR-132 metadata)
- [ ] Show warning if accuracy < 97%
- [ ] Display actual percentage in tooltip
- [ ] Gracefully handle missing metadata (no Groq transcript = no warning)

**6. Performance**
- [ ] Status calculation cached (don't stat files on every render)
- [ ] Invalidate cache when files change (file watcher events)
- [ ] Tooltip content lazy-loaded on first hover

---

## Technical Notes

### File Structure

```typescript
interface FileStatus {
  recordingFilename: string
  badge: 'green' | 'yellow' | 'red'
  count: number
  derivatives: DerivativeStatus[]
}

interface DerivativeStatus {
  type: 'shadow' | 'shadow-safe' | 'whisper-txt' | 'whisper-srt' | 'groq-txt' | 'chapter-video' | 'manifest'
  exists: boolean
  path?: string
  warning?: {
    type: 'stale' | 'low-accuracy'
    message: string
    severity: 'warning' | 'error'
  }
}
```

### API Endpoint

**New endpoint:** `GET /api/query/projects/:code/file-status`

```typescript
// Returns status for all recordings in project
{
  "b86-claudemas-01-jump": {
    "01-1-intro.mov": {
      "badge": "green",
      "count": 7,
      "derivatives": [ ... ]
    },
    "01-2-setup.mov": {
      "badge": "yellow",
      "count": 5,
      "derivatives": [ ... ]
    }
  }
}
```

**WebSocket event:** `file-status:changed` when recordings/derivatives change

---

### Groq Accuracy Metadata (FR-132 Integration)

**File:** `recording-transcripts/{base}.groq.json`

```json
{
  "accuracy": 0.942,
  "comparedTo": "whisper",
  "timestamp": "2026-01-04T10:30:00Z",
  "method": "levenshtein-word-level"
}
```

**Graceful degradation:** If FR-132 not implemented or metadata missing, skip Groq accuracy warning.

---

### Caching Strategy

```typescript
// Cache file status results
const statusCache = new Map<string, { status: FileStatus, expires: number }>()

// Invalidate on file changes
socket.on('file:new', (filename) => statusCache.delete(filename))
socket.on('file:deleted', (filename) => statusCache.delete(filename))
socket.on('file:renamed', ({ oldName, newName }) => {
  statusCache.delete(oldName)
  statusCache.delete(newName)
})
```

---

## UI Design

### Manage Panel Row

```
┌────────────────────────────────────────────────────────────┐
│  Chapter 01: Introduction                                  │
├────────────────────────────────────────────────────────────┤
│  ☑ 01-1-intro.mov          ✓ [7]    [Rename] [Chapter...] │
│  ☐ 01-2-setup.mov          ⚠️ [5]    [Rename] [Chapter...] │
│  ☐ 01-3-demo.mov           ✗ [0]    [Rename] [Chapter...] │
└────────────────────────────────────────────────────────────┘
```

**Hover on `⚠️ [5]` badge:**
```
┌──────────────────────────────────────────┐
│ Derivative Files (5):                    │
│ ✓ Shadow (.txt)                          │
│ ✓ Shadow in -safe (.txt)                 │
│ ⚠️ Whisper transcript (STALE - 3 days old)│
│ ✓ Whisper SRT (.srt)                     │
│ ⚠️ Groq transcript (94.2% accuracy - LOW) │
│ ✗ Chapter video (not found)              │
│ ✓ Manifest entry (edit-01/manifest.json) │
└──────────────────────────────────────────┘
```

---

## Testing

**Test scenarios:**

1. **All files present, no warnings:**
   - Expect: ✓ green badge [7]
   - Tooltip shows all ✓

2. **Stale transcript (re-recorded after transcription):**
   - Touch recording to make it newer: `touch 01-1-intro.mov`
   - Expect: ⚠️ yellow badge
   - Tooltip shows "STALE - X days old"

3. **Low Groq accuracy (< 97%):**
   - Create `01-1-intro.groq.json` with accuracy: 0.94
   - Expect: ⚠️ yellow badge
   - Tooltip shows "94.0% accuracy - LOW"

4. **No derivative files:**
   - Fresh recording, no shadows/transcripts created yet
   - Expect: ✗ red badge [0]
   - Tooltip shows all ✗

5. **Missing Groq metadata (graceful degradation):**
   - No `.groq.json` file
   - Expect: No error, skip Groq accuracy check

6. **Performance test:**
   - 50+ recordings with derivatives
   - Status calculation < 100ms
   - No UI lag on hover

---

## Implementation Notes

### Phase 1: Core Status
- Implement status calculation (green/yellow/red)
- Add badge to Manage panel rows
- Count derivative files

### Phase 2: Tooltip Details
- Build tooltip component
- List all derivative types
- Show ✓/✗/⚠️ for each

### Phase 3: Warnings
- Stale file detection (mtime comparison)
- Groq accuracy warning (if FR-132 implemented)

### Phase 4: Caching & Performance
- Cache status results
- WebSocket invalidation
- Lazy-load tooltip content

---

## Dependencies

**Required:**
- FR-130: Uses delete+regenerate pattern (same derivative file types)

**Optional:**
- FR-132: Groq accuracy warning requires dual transcription metadata
  - If not implemented: Skip Groq accuracy check, only show 6 derivative types

---

## Effort Estimate

**Total:** 5-8 days

- Status calculation logic: 1 day
- API endpoint & caching: 1 day
- UI badge component: 1 day
- Tooltip component: 1-2 days
- Stale detection: 0.5 day
- Groq accuracy warning: 0.5 day
- Testing & polish: 1-2 days

---

## Related

- FR-130: Simplify Rename Logic (shares derivative file types)
- FR-131: Manage Panel with Bulk Rename (where this UI lives)
- FR-132: Dual Transcription Progress (provides Groq accuracy metadata)
- FR-134: Inconsistency Detection (uses similar warning system)
