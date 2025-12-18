# Move to Safe - Specification

## Overview

Move completed recordings to a `-safe` folder within the recordings directory, allowing the content creator to focus on the current chapter while keeping finished work accessible.

---

## Mental Model

| Location | Meaning | When to use |
|----------|---------|-------------|
| `recordings/` | "Working on it" | Active recording session, current chapter |
| `recordings/-safe/` | "Done for now" | Completed chapters, out of the way but accessible |

**Key insight:** This is NOT archive. This is staging within an active session. The creator may need to reference or restore these files while still recording the video.

---

## User Workflow

**Typical scenario:**

```
1. Creator records Chapter 01 (intro)
   └── 01-1-intro.mov appears in recordings/

2. Creator records Chapter 02 (demo) - multiple takes
   └── 02-1-demo.mov, 02-2-demo.mov, etc. appear
   └── Chapter 01 is now cluttering the view

3. Creator moves Chapter 01 to safe
   └── 01-1-intro.mov → recordings/-safe/
   └── View now shows only Chapter 02

4. Creator continues with Chapter 03, 04...
   └── Moves completed chapters to safe as they finish

5. All recording done
   └── recordings/ has current chapter
   └── recordings/-safe/ has all completed chapters
```

---

## UI Design

### Recordings View - File Row

Current:
```
02-1-demo.mov   162.0 MB   10:37
```

With safe action:
```
02-1-demo.mov   162.0 MB   10:37   [→ Safe]
```

**Button styling:**
- Small, subtle button (not primary color)
- Icon + text or just icon with tooltip
- Appears on hover, or always visible (TBD based on visual noise)

---

### Recordings View - Chapter Heading

Current:
```
02 Demo
```

With safe action:
```
02 Demo  (4 files)   [→ Safe All]
```

**Behavior:**
- Shows file count for the chapter
- "Safe All" moves all files in that chapter to `-safe/`
- Button only appears for chapters with files in `recordings/` (not already safe)

---

### Safe Files Display (when "Show safe" toggle is ON)

```
02 Demo  (4 files)   [→ Safe All]
  02-1-demo.mov      162.0 MB   10:37   [→ Safe]
  02-2-demo.mov       94.1 MB   10:45   [→ Safe]

01 Intro  (1 file)   [in safe]
  01-1-intro.mov      32.2 MB   10:21   [← Restore]  (muted styling)
```

**Visual distinction for safe files:**
- Muted/grayed text or background
- "in safe" label on chapter heading instead of action button
- `[← Restore]` action instead of `[→ Safe]`

---

## Interaction Details

### Single File → Safe

1. User clicks `[→ Safe]` on a file row
2. File moves from `recordings/` to `recordings/-safe/`
3. Toast: "Moved 02-1-demo.mov to safe"
4. File disappears from active list (or moves to safe section if toggle is on)
5. No confirmation modal needed (action is easily reversible)

### Chapter → Safe All

1. User clicks `[→ Safe All]` on chapter heading
2. All files in that chapter move to `recordings/-safe/`
3. Toast: "Moved 4 files to safe"
4. Chapter disappears from active list (or shows as safe if toggle is on)

### Restore from Safe

1. User has "Show safe" toggle ON
2. User clicks `[← Restore]` on a safe file
3. File moves from `recordings/-safe/` back to `recordings/`
4. Toast: "Restored 01-1-intro.mov"
5. File appears in active list

---

## API Design

### POST /api/recordings/safe

Move file(s) to safe folder.

**Request:**
```json
{
  "files": ["02-1-demo.mov", "02-2-demo.mov"]
}
```

Or for chapter-based:
```json
{
  "chapter": "02"
}
```

**Response:**
```json
{
  "success": true,
  "moved": ["02-1-demo.mov", "02-2-demo.mov"],
  "count": 2
}
```

### POST /api/recordings/restore

Restore file(s) from safe folder.

**Request:**
```json
{
  "files": ["01-1-intro.mov"]
}
```

**Response:**
```json
{
  "success": true,
  "restored": ["01-1-intro.mov"],
  "count": 1
}
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| `-safe/` folder doesn't exist | Create it automatically on first move |
| File already exists in `-safe/` | Overwrite with warning toast, or append suffix? (TBD) |
| Move last file in chapter | Chapter heading disappears from active view |
| Restore when file exists in recordings/ | Error toast: "File already exists in recordings" |

---

## Implementation Notes

### Backend

1. Add routes in `server/src/routes/recordings.ts` (or new file)
2. Use `fs.rename()` for atomic move within same filesystem
3. Create `-safe/` directory if it doesn't exist
4. Return list of successfully moved files

### Frontend

1. Add `[→ Safe]` button to file row component
2. Add `[→ Safe All]` button to chapter heading component
3. Add `[← Restore]` button for safe files
4. Use existing toast system for feedback
5. Invalidate recordings query after move/restore

### Hooks

```typescript
// New mutations
useMoveToSafe()      // POST /api/recordings/safe
useRestoreFromSafe() // POST /api/recordings/restore
```

---

## Open Questions

1. **Bulk chapter restore?** - Should there be "Restore All" on safe chapter headings?
   - Probably yes for symmetry, but lower priority

2. **Confirmation for Safe All?** - Should moving an entire chapter prompt confirmation?
   - Probably no - it's easily reversible and matches existing patterns (no confirm for single file)

3. **Button visibility** - Always visible or appear on hover?
   - Start with always visible, can refine based on visual noise

---

## Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│  Recordings                        [Show safe ○] [Headings ●]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  02 Demo  (4 files)                              [→ Safe All]   │
│  ├─ 02-1-demo.mov     162.0 MB   10:37          [→ Safe]       │
│  ├─ 02-2-demo.mov      94.1 MB   10:45          [→ Safe]       │
│  ├─ 02-3-demo.mov      23.8 MB   10:46          [→ Safe]       │
│  └─ 02-4-demo.mov      20.9 MB   10:49          [→ Safe]       │
│                                                                  │
│  01 Intro  (1 file)                              [→ Safe All]   │
│  └─ 01-1-intro.mov     32.2 MB   10:21          [→ Safe]       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

After moving Chapter 01 to safe (with "Show safe" ON):

```
┌─────────────────────────────────────────────────────────────────┐
│  Recordings                        [Show safe ●] [Headings ●]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  02 Demo  (4 files)                              [→ Safe All]   │
│  ├─ 02-1-demo.mov     162.0 MB   10:37          [→ Safe]       │
│  ├─ 02-2-demo.mov      94.1 MB   10:45          [→ Safe]       │
│  ├─ 02-3-demo.mov      23.8 MB   10:46          [→ Safe]       │
│  └─ 02-4-demo.mov      20.9 MB   10:49          [→ Safe]       │
│                                                                  │
│  ─────────────────────── safe ───────────────────────────────   │
│                                                                  │
│  01 Intro  (1 file)                                   [in safe] │
│  └─ 01-1-intro.mov     32.2 MB   10:21          [← Restore]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
