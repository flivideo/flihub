# Naming Rules Reference

**Date:** 2026-01-06
**Source:** `shared/naming.ts` (single source of truth)
**Purpose:** Complete reference for file naming conventions and validation rules

---

## Executive Summary

**Recording filename format:**
```
{chapter}-{sequence}-{label}-{tags}.mov
```

**Example:**
```
05-3-setup-demo-CTA-SKOOL.mov
│  │ │         └─ Tags (optional, uppercase)
│  │ └─ Label (kebab-case, required)
│  └─ Sequence (1+, no leading zeros)
└─ Chapter (01-99, 2 digits)
```

---

## 1. Chapter Numbering

### Format Rules

**Strict (for creating new files):**
- Pattern: `/^\d{2}$/`
- Format: Exactly 2 digits, zero-padded
- Range: 01-99
- Examples:
  - ✅ Valid: `01`, `02`, `10`, `99`
  - ❌ Invalid: `1`, `001`, `00`, `100`

**Lenient (for reading existing files):**
- Pattern: `/^\d{1,2}$/`
- Accepts: 1-2 digits (Postel's Law: "Be liberal in what you accept")
- Examples:
  - ✅ Accepted: `1`, `5`, `01`, `05`, `99`
  - ❌ Rejected: `001`, `100`, `0`

### Validation

```typescript
function validateChapter(value: string): string | null
```

**Rules:**
- Required (cannot be empty)
- Must match pattern `/^\d{2}$/`
- Must be in range 01-99

**Error message:**
> "Chapter must be a 2-digit number (01-99)"

### Sequencing Rules

**Current behavior:** ❓ **Decision needed**

| Scenario | Allowed? | Current State | Recommendation |
|----------|----------|---------------|----------------|
| Sequential chapters (01, 02, 03) | ✅ Yes | Expected pattern | Continue |
| Chapter gaps (01, 03, 05) | ❓ Unknown | Common in projects | **Needs PO decision** |
| Non-sequential (05, 03, 07, 01) | ❓ Unknown | Technically allowed | **Should warn?** |
| Duplicate chapters | ❌ No | Impossible (filename conflict) | Enforced by filesystem |

**Questions for PO:**
1. Are chapter gaps intentional or errors?
2. Should we warn about non-sequential chapters?
3. Should we provide tools to fill gaps? (FR-140)

---

## 2. Sequence Numbering

### Format Rules

**Pattern:** `/^\d+$/`
- Format: 1 or more digits, NO zero-padding
- Range: 1 to infinity (practical limit: 999)
- Examples:
  - ✅ Valid: `1`, `2`, `10`, `123`
  - ❌ Invalid: `01`, `001`, `0`, `-1`

### Validation

```typescript
function validateSequence(value: string): string | null
```

**Rules:**
- Required (cannot be empty)
- Must match pattern `/^\d+$/`
- Must be >= 1

**Error message:**
> "Sequence must be a number (1, 2, 3, ...)"

### Sequencing Rules

**Current behavior:** ❓ **Decision needed**

| Scenario | Allowed? | Current State | Recommendation |
|----------|----------|---------------|----------------|
| Sequential within chapter (1, 2, 3) | ✅ Yes | Expected pattern | Continue |
| Sequence gaps (1, 3, 7) | ❓ Unknown | Less common | **Needs PO decision** |
| Sequence restarts at 1 per chapter | ✅ Yes | Expected pattern | Continue |
| Duplicate sequences in same chapter | ❌ No | Impossible (filename conflict) | Enforced by filesystem |
| Sequence doesn't start at 1 | ❓ Unknown | Technically allowed | **Should warn?** |

**Questions for PO:**
1. Are sequence gaps intentional or errors?
2. Should sequence always start at 1 for each chapter?
3. Should we provide auto-renumbering? (FR-138 has preserve/renumber)

---

## 3. Label Formatting

### Format Rules

**Pattern:** `/^[a-z0-9]+(-[a-z0-9]+)*$/`
- Format: Kebab-case (lowercase, numbers, hyphens)
- Characters: `a-z`, `0-9`, `-` (hyphen as separator)
- Constraints:
  - Must start with alphanumeric (not hyphen)
  - Must end with alphanumeric (not hyphen)
  - No consecutive hyphens (`--`)
  - Max length: 50 characters
- Examples:
  - ✅ Valid: `intro`, `setup-demo`, `build-server-api`, `demo2`
  - ❌ Invalid: `Intro`, `setup_demo`, `BuildServer`, `-intro`, `intro-`, `setup--demo`

### Validation

```typescript
function validateLabel(value: string): string | null
```

**Rules:**
- Required (cannot be empty)
- Must match kebab-case pattern
- Max 50 characters

**Error messages:**
- Empty: "Label is required"
- Invalid format: "Label must be kebab-case (lowercase letters, numbers, hyphens only)"
- Too long: "Label must be 50 characters or less"

### Sanitization

```typescript
function sanitizeName(name: string): string
```

**Transformations:**
- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters (keep periods for project names)
- Collapse multiple hyphens to single
- Trim leading/trailing hyphens
- Truncate to 50 characters

**Examples:**
```typescript
sanitizeName("Setup Demo")        → "setup-demo"
sanitizeName("Build_Server_API")  → "buildserverapi"
sanitizeName("  intro  ")         → "intro"
sanitizeName("setup--demo")       → "setup-demo"
```

### Label Uniqueness

**Current behavior:** ❓ **Decision needed**

| Scenario | Allowed? | Current State | Recommendation |
|----------|----------|---------------|----------------|
| Same label in same chapter | ❌ No | Impossible (with same sequence) | Enforced by filesystem |
| Same label in different chapters | ✅ Yes | Allowed | Keep (labels describe content) |
| Same label across projects | ✅ Yes | Allowed | Keep (projects are independent) |

---

## 4. Tags (CTAs)

### Format Rules

**Pattern:** `/^[A-Z]+$/`
- Format: Uppercase letters only
- Characters: `A-Z` (no numbers, no special chars)
- Position: After label, before extension
- Multiple: Allowed, hyphen-separated
- Constraints:
  - Max 5 tags (enforced in FR-138 UI)
  - Max 10 characters per tag (enforced in FR-138 UI)
- Examples:
  - ✅ Valid: `CTA`, `SKOOL`, `DEMO`, `INTRO`, `API`
  - ❌ Invalid: `cta`, `Cta`, `CTA123`, `CTA_DEMO`

### Validation

**No explicit validation function in `naming.ts`**

FR-138 enforces:
- Uppercase only (converted automatically)
- Max 10 characters per tag
- Max 5 tags total

### Tag Positioning

**In filename:**
```
{chapter}-{sequence}-{label}-{tag1}-{tag2}-{tag3}.mov
```

**Examples:**
```
05-3-setup-demo-CTA.mov              ← Single tag
05-3-setup-demo-CTA-SKOOL.mov        ← Multiple tags
05-3-setup-demo.mov                  ← No tags (optional)
```

### Tag Extraction

```typescript
function extractTagsFromName(name: string): { name: string; tags: string[] }
```

**Logic:**
- Split by hyphen
- Identify uppercase-only words as tags
- Return clean name + tags array

**Examples:**
```typescript
extractTagsFromName("intro-demo-CTA")
// → { name: "intro-demo", tags: ["CTA"] }

extractTagsFromName("setup-bmad-TECHSTACK-API")
// → { name: "setup-bmad", tags: ["TECHSTACK", "API"] }
```

### Available Tags

**Configured in `config.json`:**
```json
{
  "availableTags": ["CTA", "SKOOL", "DEMO", "INTRO", "ADVANCED"]
}
```

**Custom tags:** Allowed in FR-138, but must follow format rules

---

## 5. Complete Filename Format

### Recording Files

**Format:**
```
{chapter}-{sequence}-{label}-{tags}.mov
```

**With tags:**
```
05-3-setup-demo-CTA-SKOOL.mov
```

**Without tags:**
```
05-3-setup-demo.mov
```

**Legacy format (no sequence):**
```
05-intro.mov
```

**Parsing behavior:**
- Lenient: Accepts 1-2 digit chapters
- Tags stripped from label during parsing
- Sequence optional (legacy support)

### Building Filenames

```typescript
function buildRecordingFilename(
  chapter: string,
  sequence: string | null,
  name: string,
  tags: string[] = []
): string
```

**Logic:**
1. Start with chapter (e.g., `"05"`)
2. Add sequence if provided (e.g., `"-3"`)
3. Add sanitized name (e.g., `"-setup-demo"`)
4. Add tags if any (e.g., `"-CTA-SKOOL"`)
5. Add extension (`".mov"`)

**Examples:**
```typescript
buildRecordingFilename("05", "3", "setup demo", ["CTA", "SKOOL"])
// → "05-3-setup-demo-CTA-SKOOL.mov"

buildRecordingFilename("05", "3", "setup demo", [])
// → "05-3-setup-demo.mov"

buildRecordingFilename("05", null, "intro", [])
// → "05-intro.mov" (legacy format)
```

---

## 6. Image Asset Naming

### Format

**Pattern:**
```
{chapter}-{sequence}-{imageOrder}{variant}-{label}.{ext}
```

**Examples:**
```
05-3-1-workflow.png          ← Image 1, no variant
05-3-2a-diagram.png          ← Image 2, variant 'a'
05-3-2b-diagram-alt.png      ← Image 2, variant 'b'
```

### Rules

**Image Order:**
- Pattern: `/^\d+$/`
- Format: 1+ digits, no zero-padding
- Examples: `1`, `2`, `10`

**Variant:**
- Pattern: `/^[a-z]$/`
- Format: Single lowercase letter (a-z)
- Optional: `null` means no variant
- Options: `null`, `'a'`, `'b'`, `'c'`, etc.

**Extensions:**
- Supported: `.png`, `.jpg`, `.jpeg`, `.webp`

---

## 7. Folder Structure

### Project Directory Layout

```
project-root/
├── recordings/              # Main video recordings
│   ├── -safe/               # ⚠️ DEPRECATED (FR-111: now state-based)
│   └── -chapters/           # Generated chapter videos (FR-58)
├── recording-shadows/       # Low-res preview videos (240p .mp4)
├── recording-transcripts/   # Whisper transcription outputs
│   ├── {name}.txt           # Plain text transcript
│   ├── {name}.srt           # SubRip subtitle format
│   ├── {name}.json          # JSON format
│   ├── {name}.vtt           # WebVTT format
│   └── {name}.tsv           # Tab-separated values
├── inbox/                   # Incoming content staging
│   ├── raw/                 # Dumps, notes, links
│   ├── dataset/             # Structured data
│   └── presentation/        # HTML visual assets
├── assets/
│   ├── images/              # Assigned image assets
│   └── thumbs/              # YouTube thumbnails
├── final/                   # Final edited video + SRT
├── s3-staging/              # Files shared with editor via S3
└── .flihub-state.json       # Project state (parked, annotations, safe flags)
```

### Derivative File Relationships

**For recording:** `05-3-setup-demo-CTA.mov`

**Generates:**
```
recordings/05-3-setup-demo-CTA.mov                    ← Source
recording-shadows/05-3-setup-demo-CTA.mp4             ← Shadow (240p)
recording-transcripts/05-3-setup-demo-CTA.txt         ← Transcript (text)
recording-transcripts/05-3-setup-demo-CTA.srt         ← Transcript (srt)
recording-transcripts/05-3-setup-demo-CTA.json        ← Transcript (json)
recording-transcripts/05-3-setup-demo-CTA.vtt         ← Transcript (vtt)
recording-transcripts/05-3-setup-demo-CTA.tsv         ← Transcript (tsv)
recordings/-chapters/05-setup-demo.mov                ← Chapter video (label only, no sequence/tags)
```

**Note:** Chapter videos use `{chapter}-{label}.mov` format (no sequence, no tags)

---

## 8. State Management

### `.flihub-state.json`

**Location:** Project root

**Structure:**
```json
{
  "recordings": {
    "05-3-setup-demo-CTA.mov": {
      "parked": true,
      "annotation": "Save for SKOOL advanced module",
      "safe": false
    }
  },
  "editManifest": {
    "edit-1st": {
      "files": [
        {
          "filename": "05-3-setup-demo-CTA.mov",
          "hash": "abc123...",
          "size": 123456789,
          "timestamp": "2026-01-06T12:00:00.000Z"
        }
      ]
    }
  },
  "glingDictionary": ["Anthropic", "Claude", "Sonnet"]
}
```

**Recording States:**
- `parked`: Boolean (file marked for later use)
- `annotation`: String (reason for parking)
- `safe`: Boolean (protected from deletion - replaces -safe folder)

---

## 9. Validation Summary

### What's Enforced by Code

| Rule | Enforced? | Where | Can Violate? |
|------|-----------|-------|--------------|
| Chapter format (01-99) | ✅ Yes | UI validation | No (blocked) |
| Sequence format (1+) | ✅ Yes | UI validation | No (blocked) |
| Label kebab-case | ✅ Yes | UI validation | No (blocked) |
| Label max 50 chars | ✅ Yes | UI validation | No (blocked) |
| Tags uppercase | ✅ Yes | FR-138 UI | No (converted) |
| Tags max 5 | ✅ Yes | FR-138 UI | No (blocked) |
| Duplicate filenames | ✅ Yes | Filesystem | No (OS enforced) |
| Chapter gaps | ❌ No | Not validated | ✅ Yes (common) |
| Sequence gaps | ❌ No | Not validated | ✅ Yes (less common) |
| Sequence starts at 1 | ❌ No | Not validated | ✅ Yes (allowed) |
| Same label in chapter | ❌ No | Not validated | ✅ Yes (if different sequence) |

### What's NOT Enforced

❌ **Not checked by code (needs FR-134):**
1. Chapter gaps (01, 03, 05)
2. Sequence gaps (1, 3, 7)
3. Non-sequential chapters (05, 03, 07)
4. Sequence doesn't start at 1
5. Missing derivatives (no shadow/transcript)
6. Orphaned derivatives (shadow without source)
7. Duplicate sequences (same chapter-sequence in different files - filesystem prevents same name)
8. Invalid existing filenames (legacy files with bad format)

---

## 10. Edge Cases & Special Scenarios

### Legacy Files

**Format:** `{chapter}-{label}.mov` (no sequence)

**Parsing behavior:**
- Accepted by lenient parser
- Sequence returned as `null`
- Supported for backwards compatibility

**Example:**
```
05-intro.mov → { chapter: "05", sequence: null, name: "intro" }
```

**Recommendation:** ❓ **PO decision needed**
- Migrate to new format? (add sequence: 05-intro.mov → 05-1-intro.mov)
- Keep supporting legacy format?

### Single-Digit Chapters

**Format:** `5-3-demo.mov` (single digit chapter)

**Parsing behavior:**
- Accepted by lenient parser (`parsePattern`)
- Rejected by strict validator (`pattern`)
- Can READ existing files, cannot CREATE new files

**Recommendation:** ✅ **Keep current behavior**
- Read: Lenient (Postel's Law)
- Write: Strict (always 2 digits)

### Uppercase in Labels

**Example:** `05-3-Setup-Demo.mov`

**Current behavior:**
- Rejected by UI validation
- User cannot create

**Sanitization:**
- `sanitizeName("Setup Demo")` → `"setup-demo"`

**Recommendation:** ✅ **Keep current behavior**
- UI prevents creation
- Sanitize on input

### Special Characters

**Example:** `05-3-setup_demo!.mov`

**Current behavior:**
- Rejected by UI validation
- Underscores, exclamation marks not allowed

**Sanitization:**
- `sanitizeName("setup_demo!")` → `"setupdemo"`

**Recommendation:** ✅ **Keep current behavior**
- Kebab-case enforced
- Special chars stripped

### Very Long Labels

**Example:** `05-3-this-is-a-very-long-label-that-exceeds-the-fifty-character-maximum-limit.mov`

**Current behavior:**
- Rejected by UI validation (> 50 chars)
- Error message shown

**Sanitization:**
- `sanitizeName(longString)` → truncated to 50 chars

**Recommendation:** ✅ **Keep current behavior**
- 50 char limit reasonable
- Prevents filesystem issues

---

## 11. Open Questions for PO

### High Priority

1. **Chapter gaps:** Intentional or error?
   - If intentional: Document as allowed
   - If error: Provide gap-filling tool (FR-140)

2. **Sequence gaps:** Intentional or error?
   - If intentional: Document as allowed
   - If error: Provide renumbering tool (FR-138 has this)

3. **-safe folder:** Deprecated by FR-111?
   - If yes: Migrate existing files to state-based
   - If no: Update folder structure docs

### Medium Priority

4. **Legacy format:** Migrate or support?
   - Migrate: Batch rename tool to add sequences
   - Support: Keep lenient parser

5. **Non-sequential chapters:** Warn or allow?
   - Warn: Add to FR-134 detection
   - Allow: Document as valid

6. **Same label across chapters:** Intentional or error?
   - Likely intentional (labels describe content)
   - Document as allowed

### Low Priority

7. **Tag categories:** Should tags be categorized?
   - E.g., CTA=call-to-action, SKOOL=platform, DEMO=content-type
   - Helps with validation/autocomplete

8. **Maximum sequence number:** Should we limit?
   - Current: No limit
   - Practical: 999 seems reasonable
   - Filesystem: No technical limit

---

## 12. Recommendations

### For Discovery Plan Phase 3 (Scanner)

**Must detect:**
- ❌ Invalid chapter format (not 01-99)
- ❌ Invalid sequence format (leading zeros, non-numeric)
- ❌ Invalid label (uppercase, underscores, special chars)
- ❌ Invalid tags (lowercase, numbers, special chars)
- ❌ Unparseable filenames

**Should detect (PO decision needed):**
- ⚠️ Chapter gaps
- ⚠️ Sequence gaps
- ⚠️ Non-sequential chapters
- ⚠️ Duplicate sequences (filesystem prevents, but check across projects?)

**Could detect:**
- 🔍 Missing derivatives
- 🔍 Orphaned derivatives
- 🔍 Legacy format files

### For FR-134 (Inconsistency Detection)

**Auto-fix candidates:**
- Lowercase labels with uppercase letters
- Strip special characters from labels
- Delete orphaned shadows/transcripts
- Regenerate missing shadows (instant)

**User decision candidates:**
- Duplicate sequences (which to rename?)
- Chapter gaps (fill or keep?)
- Sequence gaps (renumber or keep?)

---

**Last updated:** 2026-01-06
