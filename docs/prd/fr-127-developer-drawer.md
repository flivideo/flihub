# FR-127: Developer Drawer (Data Files Viewer)

**Status:** Pending
**Added:** 2026-01-02
**Implemented:** -
**Dependencies:** None

---

## User Story

As a developer, I want to view internal data files (.flihub-state.json, config.json, telemetry) in a slide-out drawer so I can debug issues, verify manifest creation, and understand application state without opening files in an external editor.

---

## Problem

**Current state:**
- Users cannot see internal data files without opening them in Finder/VSCode
- Debugging requires switching between FliHub and file system
- Verifying manifest creation (FR-126) requires manual file inspection
- Understanding project state requires reading raw JSON files
- Transcription telemetry is invisible (locked in JSONL files)

**Pain points:**
1. **Hidden state** - No visibility into `.flihub-state.json` from within FliHub
2. **Manual hunting** - Must navigate file system to find config.json, telemetry files
3. **Context switching** - Leave app to debug, break workflow
4. **FR-126 debugging** - Can't verify editManifest creation without external tools
5. **Telemetry blindness** - Performance data inaccessible

---

## Solution

Add **"🔍 Developer Tools"** to the Cog menu that opens a **400px slide-out drawer** from the right side with:

### Core Features

1. **Tree Navigation**
   - Project Scope (per-project files)
   - Global Scope (app-wide files)
   - Collapsible sections

2. **JSON Viewer**
   - Syntax-highlighted JSON display
   - Line numbers
   - Formatted with indentation
   - Read-only (viewing only, not editing)

3. **Quick Actions**
   - Copy JSON to clipboard
   - Open in default editor
   - Refresh file contents

4. **UX Polish**
   - Overlay dims main UI while drawer is open
   - Escape key closes drawer
   - Clicking overlay closes drawer
   - Smooth slide-in/out transitions

### Files to Visualize

**Project Scope (per-project):**
1. **`.flihub-state.json`**
   - recordings state (safe, parked, stage, annotations)
   - glingDictionary (project-specific words)
   - editManifest (FR-126 manifest tracking)
   - Current project only

**Global Scope (app-wide):**
2. **`config.json`**
   - watchDirectory, projectDirectory
   - availableTags, commonNames
   - glingDictionary (global)
   - shadowResolution
   - All configuration settings

3. **`transcription-telemetry.jsonl`**
   - Performance metrics per transcription
   - Can show summary stats OR raw JSONL
   - Helps debug transcription issues

---

## UI Design

### Drawer Layout

```
┌─────────────────────────────────────────┐
│  🔍 Developer Tools              [X]    │  ← Header
├─────────────────────────────────────────┤
│                                         │
│  ▼ Project Scope                        │  ← Tree Navigation
│    📄 .flihub-state.json         👁     │
│  ▼ Global Scope                         │
│    📄 config.json                👁     │
│    📄 transcription-telemetry... 👁     │
│                                         │
├─────────────────────────────────────────┤
│  {                                      │  ← JSON Viewer
│    "version": 1,                        │  (Selected file)
│    "recordings": {                      │
│      "01-1-intro.mov": {                │
│        "parked": true,                  │
│        "annotation": "Too technical"    │
│      }                                  │
│    },                                   │
│    "editManifest": {                    │
│      "edit-1st": {                      │
│        "lastCopied": "2026-01-02...",   │
│        "files": [...]                   │
│      }                                  │
│    }                                    │
│  }                                      │
│                                         │
├─────────────────────────────────────────┤
│  [Copy JSON] [Open in Editor] [Refresh]│  ← Action Bar
└─────────────────────────────────────────┘
```

**Dimensions:**
- Width: 400px (fixed)
- Height: 100vh (full viewport height)
- Position: Fixed right edge, z-index above main UI
- Overlay: Semi-transparent black (40% opacity) covering main UI

### Visual States

**Collapsed (default):**
- Drawer off-screen (right: -400px)
- No overlay

**Open:**
- Drawer slides in (right: 0px)
- Overlay appears with fade-in
- Main UI dims but remains visible

**File Selected:**
- Tree item highlighted
- JSON viewer shows formatted content
- Action bar enabled

**No File Selected:**
- JSON viewer shows "Select a file to view"
- Action bar disabled (gray out buttons)

### Syntax Highlighting

**JSON color scheme:**
- Keys: Blue (#0066CC)
- Strings: Green (#22863A)
- Numbers: Orange (#D73A49)
- Booleans: Purple (#6F42C1)
- Null: Gray (#6A737D)
- Brackets/Braces: Black

**Line numbers:**
- Gray (#6A737D)
- Right-aligned
- 4-digit padding (e.g., "  12 ")

---

## Acceptance Criteria

### Must Have

**Navigation:**
- [ ] "🔍 Developer Tools" item in Cog menu dropdown
- [ ] Clicking menu item opens drawer from right
- [ ] Drawer is 400px wide, full viewport height
- [ ] Overlay appears behind drawer, dims main UI
- [ ] Escape key closes drawer
- [ ] Clicking overlay closes drawer
- [ ] Smooth slide-in/out transition (300ms)

**Tree Navigation:**
- [ ] Project Scope section with "▼" collapse indicator
- [ ] Global Scope section with "▼" collapse indicator
- [ ] `.flihub-state.json` listed under Project Scope
- [ ] `config.json` listed under Global Scope
- [ ] `transcription-telemetry.jsonl` listed under Global Scope
- [ ] Clicking file selects it (highlighted background)
- [ ] Selected file shows 👁 eye icon

**JSON Viewer:**
- [ ] Selected file content displayed as formatted JSON
- [ ] Syntax highlighting for keys, strings, numbers, booleans
- [ ] Line numbers displayed
- [ ] Proper indentation (2 spaces)
- [ ] Scrollable content area
- [ ] "Select a file to view" message when no file selected

**Actions:**
- [ ] "Copy JSON" button copies formatted JSON to clipboard
- [ ] "Open in Editor" button opens file in default text editor
- [ ] "Refresh" button reloads selected file content
- [ ] Toast notification on successful copy
- [ ] Action buttons disabled when no file selected

**Data Accuracy:**
- [ ] `.flihub-state.json` shows current project state
- [ ] Drawer updates when switching projects
- [ ] `config.json` shows latest configuration
- [ ] Refresh button updates displayed content

### Should Have

- [ ] File size indicator (e.g., "2.4 KB") next to each file
- [ ] Last modified timestamp next to each file
- [ ] Collapsible JSON sections (arrays, objects)
- [ ] Search within JSON (Ctrl+F)

### Nice to Have

- [ ] Telemetry summary stats (not raw JSONL)
- [ ] JSON diff mode (compare before/after states)
- [ ] Auto-refresh toggle (updates every 2 seconds)
- [ ] Export button (download JSON file)
- [ ] Copy file path button

---

## Technical Notes

### Component Structure

**New file:** `client/src/components/DeveloperDrawer.tsx`

```typescript
interface DeveloperDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function DeveloperDrawer({ isOpen, onClose }: DeveloperDrawerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['project', 'global'])
  )

  // Fetch file contents
  const projectState = useProjectState()
  const config = useConfig()
  const telemetry = useTelemetry()

  // Handle file selection
  const handleFileSelect = (file: string) => {
    setSelectedFile(file)
  }

  // Copy to clipboard
  const handleCopy = () => {
    if (!selectedFile) return
    const content = getFileContent(selectedFile)
    navigator.clipboard.writeText(JSON.stringify(content, null, 2))
    toast.success('JSON copied to clipboard')
  }

  // Open in editor
  const handleOpenInEditor = async () => {
    if (!selectedFile) return
    await fetch('/api/system/open-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: getFilePath(selectedFile) })
    })
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">🔍 Developer Tools</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {/* Tree Navigation */}
        <div className="border-b p-4 max-h-48 overflow-y-auto">
          <TreeSection
            title="Project Scope"
            files={[
              { name: '.flihub-state.json', icon: '📄' }
            ]}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
          />
          <TreeSection
            title="Global Scope"
            files={[
              { name: 'config.json', icon: '📄' },
              { name: 'transcription-telemetry.jsonl', icon: '📄' }
            ]}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
          />
        </div>

        {/* JSON Viewer */}
        <div className="flex-1 overflow-auto p-4 font-mono text-sm">
          {selectedFile ? (
            <SyntaxHighlightedJson content={getFileContent(selectedFile)} />
          ) : (
            <div className="text-gray-400 text-center mt-8">
              Select a file to view
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="border-t p-4 flex gap-2">
          <button
            onClick={handleCopy}
            disabled={!selectedFile}
            className="btn-sm bg-blue-600 text-white disabled:opacity-50"
          >
            Copy JSON
          </button>
          <button
            onClick={handleOpenInEditor}
            disabled={!selectedFile}
            className="btn-sm border border-gray-300 disabled:opacity-50"
          >
            Open in Editor
          </button>
          <button
            onClick={() => queryClient.invalidateQueries()}
            className="btn-sm border border-gray-300 ml-auto"
          >
            Refresh
          </button>
        </div>
      </div>
    </>
  )
}
```

### API Endpoints

**New endpoints:**

1. **`GET /api/developer/project-state`**
   - Returns `.flihub-state.json` for active project
   - Response: `{ success: boolean, content: object, filePath: string, size: number, lastModified: string }`

2. **`GET /api/developer/config`**
   - Returns `config.json`
   - Response: `{ success: boolean, content: object, filePath: string, size: number, lastModified: string }`

3. **`GET /api/developer/telemetry`**
   - Returns `transcription-telemetry.jsonl` (or summary)
   - Response: `{ success: boolean, content: string, filePath: string, size: number, lastModified: string }`

**Enhanced endpoint:**

4. **`POST /api/system/open-file`** (existing)
   - Add support for opening arbitrary files by absolute path
   - Used by "Open in Editor" button

### Syntax Highlighting

**Options:**

**Option A: Lightweight CSS-only**
```typescript
function SyntaxHighlightedJson({ content }: { content: object }) {
  const formatted = JSON.stringify(content, null, 2)

  return (
    <pre className="syntax-json">
      {formatted.split('\n').map((line, i) => (
        <div key={i}>
          <span className="line-number">{i + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: highlightLine(line) }} />
        </div>
      ))}
    </pre>
  )
}

function highlightLine(line: string): string {
  return line
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/: null/g, ': <span class="json-null">null</span>')
}
```

**Option B: Use react-syntax-highlighter**
```bash
npm install react-syntax-highlighter @types/react-syntax-highlighter
```

```typescript
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

function SyntaxHighlightedJson({ content }: { content: object }) {
  return (
    <SyntaxHighlighter
      language="json"
      style={vscDarkPlus}
      showLineNumbers
      wrapLines
    >
      {JSON.stringify(content, null, 2)}
    </SyntaxHighlighter>
  )
}
```

**Recommendation:** Start with Option A (lightweight), upgrade to Option B if needed.

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/DeveloperDrawer.tsx` | CREATE - Main drawer component |
| `client/src/App.tsx` | Add drawer state, menu item, keyboard handler |
| `client/src/hooks/useApi.ts` | Add hooks for developer endpoints |
| `server/src/routes/developer.ts` | CREATE - New route file |
| `server/src/index.ts` | Register developer routes |

---

## Integration with Existing Features

### FR-126 (Edit Folder Manifest)

**Use case:** Verify manifest creation after "Prepare for Gling"

**Workflow:**
1. User copies files to edit-1st via Export panel
2. Opens Developer Tools (Cog → 🔍 Developer Tools)
3. Selects `.flihub-state.json`
4. Sees `editManifest.edit-1st.files` array with hashes
5. Verifies manifest was created correctly
6. Closes drawer and continues

**Value:** Immediate visual feedback that FR-126 is working.

### Config Management

**Use case:** Verify configuration changes

**Workflow:**
1. User changes settings in Config panel
2. Opens Developer Tools
3. Selects `config.json`
4. Verifies values were saved correctly
5. Can copy JSON for sharing with support

### Transcription Debugging

**Use case:** Investigate transcription performance issues

**Workflow:**
1. User notices slow transcriptions
2. Opens Developer Tools
3. Selects `transcription-telemetry.jsonl`
4. Reviews performance metrics (duration, file size, model)
5. Identifies bottlenecks

---

## Future Enhancements

**Phase 2 Features (not in this FR):**

1. **JSON Diff Mode**
   - Compare before/after states
   - Visual diff highlighting (red/green)
   - Use case: Verify state changes after operations

2. **Auto-refresh Toggle**
   - Enable/disable auto-refresh every 2 seconds
   - Shows live state changes
   - Use case: Watch state during active development

3. **Search within JSON**
   - Ctrl+F to search keys/values
   - Highlight matches
   - Navigate between results
   - Use case: Find specific recording in large state files

4. **Export/Download**
   - Download JSON file to disk
   - Copy file path to clipboard
   - Use case: Share state files with support/other developers

5. **Telemetry Summary**
   - Parse JSONL and show summary stats
   - Avg duration, success rate, model usage
   - Chart visualization
   - Use case: Quick performance overview without parsing raw data

6. **Socket Monitor**
   - Real-time Socket.io event log
   - Shows events as they fire
   - Use case: Debug real-time updates

7. **API Request History**
   - Log of recent API calls
   - Request/response details
   - Use case: Debug API interactions

---

## Dependencies

**None** - This is a standalone feature.

**Complementary to:**
- FR-126 (Edit Folder Manifest) - Helps verify manifest creation
- FR-119 (API Explorer) - Both are developer tools
- Config panel - Alternative view of configuration

---

## Value Proposition

**Developer Experience:**
- **No context switching** - Stay in FliHub to debug
- **Immediate visibility** - See state changes instantly
- **FR-126 validation** - Verify manifest creation without terminal
- **Debugging tool** - Inspect state during development

**Support & Documentation:**
- **Copy-paste debugging** - Share state files easily
- **Verification** - Confirm configuration changes
- **Transparency** - See what the app is actually doing

**Foundation for Future:**
- **Extensible** - Add more tools to drawer (socket monitor, logs)
- **Developer-friendly** - Shows FliHub is developer-aware
- **Troubleshooting** - Essential tool for support issues

---

## Scope Estimate

| Task | Effort | Priority |
|------|--------|----------|
| Drawer component (UI) | 2-3 hours | High |
| API endpoints | 1 hour | High |
| Syntax highlighting | 1-2 hours | Medium |
| Testing & polish | 1 hour | High |

**Total:** 5-7 hours

---

## Related

- FR-119: API Documentation & Testing Page (similar developer tool)
- FR-126: Edit Folder Manifest (primary use case for validation)

---

## Completion Notes

**What was done:**
- Created 400px slide-out drawer accessible from Cog menu (⚙ → 🔍 Developer Tools)
- Implemented tree navigation with collapsible Project Scope and Global Scope sections
- Added JSON viewer with lightweight syntax highlighting (keys, strings, numbers, booleans, null)
- JSONL viewer for telemetry with per-entry parsing and formatting
- Action buttons: Copy JSON, Open in Editor, Refresh
- Escape key and overlay click to close drawer
- Real-time file info display (path, size, last modified, line count for telemetry)
- Notes displayed for non-existent files (e.g., "State file does not exist yet")

**Files created:**
- `client/src/components/DeveloperDrawer.tsx` (400 lines) - Main drawer component
- `server/src/routes/developer.ts` (195 lines) - 3 API endpoints

**Files modified:**
- `server/src/index.ts` - Registered developer routes (`/api/developer`)
- `server/src/routes/system.ts` - Added `POST /api/system/open-file-by-path` endpoint
- `client/src/App.tsx` - Added drawer state, menu item, and component render
- `client/src/hooks/useApi.ts` - Added 3 hooks: `useDeveloperProjectState`, `useDeveloperConfig`, `useDeveloperTelemetry`
- `client/src/constants/queryKeys.ts` - Added developer query keys

**API Endpoints:**
1. `GET /api/developer/project-state` - Returns `.flihub-state.json` for active project
2. `GET /api/developer/config` - Returns `config.json`
3. `GET /api/developer/telemetry` - Returns `transcription-telemetry.jsonl`
4. `POST /api/system/open-file-by-path` - Opens file by absolute path (whitelist: config.json, .flihub-state.json, transcription-telemetry.jsonl)

**Implementation details:**
- Syntax highlighting uses lightweight regex-based approach (no external library)
- File size formatting (B/KB/MB)
- JSONL parser handles malformed entries gracefully
- Security: Only whitelisted FliHub-managed files can be opened in editor
- Queries use React Query for caching and auto-refetch

**Testing notes:**
1. Open drawer: Cog menu → 🔍 Developer Tools
2. Verify drawer slides in from right with overlay
3. Test file selection: Click `.flihub-state.json`, `config.json`, `transcription-telemetry.jsonl`
4. Verify syntax highlighting for JSON content
5. Test Copy JSON button (should copy formatted JSON to clipboard)
6. Test Open in Editor button (should open file in default text editor)
7. Test Refresh button (should reload file content)
8. Test Escape key closes drawer
9. Test clicking overlay closes drawer
10. Verify collapsible sections work (Project Scope, Global Scope)
11. Check file info displays correctly (path, size, modified date, line count for telemetry)

**Status:** Complete

**Time estimate accuracy:** ~6-7 hours (within 5-7 hour estimate)

**Final implementation:**
- Switched from custom JSON viewer to **Monaco Editor** (VSCode's actual editor)
- Removed black overlay (drawer now slides over content without blocking app)
- 800px default width with resizable support (300-1000px range)
- Tab-based navigation instead of tree
- Perfect VSCode-style JSON viewing with folding, syntax highlighting, line numbers
- Sticky action bar always accessible
- Dark theme matching VSCode Dark+
