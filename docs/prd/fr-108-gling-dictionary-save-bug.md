# FR-108: Gling Dictionary Not Saving

**Type:** Bug Fix
**Priority:** Medium
**Added:** 2025-12-25

---

## Problem

The Gling Dictionary field in the Configuration panel does not persist when the Save button is clicked. Users can type custom dictionary words (one per line) into the textarea, but these words are lost when the configuration is saved.

---

## Root Cause

The POST `/api/config` route handler in `server/src/routes/index.ts` does not extract or pass through the `glingDictionary` field from the request body to the `updateConfig()` function.

**Current code (lines 100-119):**
```typescript
router.post('/config', (req: Request, res: Response) => {
  const {
    watchDirectory,
    projectDirectory,
    projectsRootDirectory,
    activeProject,
    imageSourceDirectory,
    shadowResolution,
  } = req.body;
  const updatedConfig = updateConfig({
    watchDirectory,
    projectDirectory,
    projectsRootDirectory,
    activeProject,
    imageSourceDirectory,
    shadowResolution,
  });
  // ...
});
```

**Missing:** `glingDictionary` is not extracted from `req.body` and is not passed to `updateConfig()`.

---

## Evidence

1. **Field exists in TypeScript types** (`shared/types.ts:35`):
   ```typescript
   glingDictionary?: string[];  // FR-102: Custom dictionary words for Gling transcription
   ```

2. **UI sends the field** (`client/src/components/ConfigPanel.tsx:374-380`):
   ```typescript
   await updateConfig.mutateAsync({
     // ...other fields...
     glingDictionary: dictWords,
   })
   ```

3. **saveConfig() supports it** (`server/src/index.ts:164-192`):
   - The `saveConfig()` function does NOT explicitly include `glingDictionary` in the `toSave` object (lines 166-186)
   - This is a second bug: even if the route passed it through, `saveConfig()` would ignore it

---

## Solution

### 1. Update POST `/api/config` route

**File:** `server/src/routes/index.ts`

Add `glingDictionary` to the destructured fields and pass it to `updateConfig()`:

```typescript
router.post('/config', (req: Request, res: Response) => {
  const {
    watchDirectory,
    projectDirectory,
    projectsRootDirectory,
    activeProject,
    imageSourceDirectory,
    shadowResolution,
    glingDictionary,  // ADD THIS
  } = req.body;
  const updatedConfig = updateConfig({
    watchDirectory,
    projectDirectory,
    projectsRootDirectory,
    activeProject,
    imageSourceDirectory,
    shadowResolution,
    glingDictionary,  // ADD THIS
  });
  console.log('Config updated:', updatedConfig);
  res.json(updatedConfig);
});
```

### 2. Update `saveConfig()` function

**File:** `server/src/index.ts`

Add `glingDictionary` to the `toSave` object (around line 173):

```typescript
function saveConfig(config: Config): void {
  try {
    const toSave: Record<string, unknown> = {
      watchDirectory: config.watchDirectory,
      projectsRootDirectory: config.projectsRootDirectory,
      activeProject: config.activeProject || '',
      availableTags: config.availableTags,
      commonNames: config.commonNames,
      imageSourceDirectory: config.imageSourceDirectory,
      glingDictionary: config.glingDictionary || [],  // ADD THIS
    };
    // ... rest of function
  }
}
```

### 3. Update `updateConfig()` function

**File:** `server/src/index.ts`

Add handling for `glingDictionary` in the `updateConfig()` function (around line 243):

```typescript
function updateConfig(newConfig: Partial<Config>): Config {
  // ... existing code ...

  if (newConfig.glingDictionary !== undefined) {
    currentConfig.glingDictionary = newConfig.glingDictionary;
  }

  // ... rest of function
}
```

---

## Testing

1. Open Configuration panel
2. Enter custom words in "Gling Dictionary Words" field (e.g., "AppyDave", "BMAD", "FliVideo")
3. Click Save
4. Refresh the page
5. Verify the dictionary words are still present in the textarea
6. Check `server/config.json` - should contain `"glingDictionary": ["AppyDave", "BMAD", "FliVideo"]`

---

## Related

- **FR-102:** Feature that introduced Gling dictionary field
- **First Edit Prep:** Uses `glingDictionary` from config when calling Gling API

---

## Completion Notes

**What was done:**
- Added `glingDictionary` to POST `/api/config` route destructuring and pass-through
- Added `glingDictionary` to `saveConfig()` toSave object with fallback to empty array
- Added `glingDictionary` handling in `updateConfig()` function

**Files changed:**
- `server/src/routes/index.ts` (modified) - lines 108, 117
- `server/src/index.ts` (modified) - lines 174, 264-265

**Testing notes:**
1. Open Configuration panel
2. Enter custom words in "Gling Dictionary Words" field
3. Click Save
4. Refresh the page - words should persist
5. Check `server/config.json` - should contain `glingDictionary` array

**Status:** Complete
