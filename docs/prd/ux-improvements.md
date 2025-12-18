# UX Improvements

UX review findings and improvements for the Recording Namer interface.

---

## Incoming Screen

| ID | Improvement | Priority |
|----|-------------|----------|
| I-1 | **Different styling for common name pills** - Blue pills for common names (intro, demo, summary, outro) look identical to tags. Make them visually distinct (gray outline, different color) or add label "Quick fill:" | |
| I-2 | **More prominent preview filename** - The preview is important feedback but gets lost. Make it larger or add subtle background highlight | |
| I-3 | **Compact "no pending files" state** - Empty state box takes too much vertical space. Make it single line with icon | |
| I-4 | **Clearer tag toggle styling** - CTA and SKOOL appear as outline buttons but not obviously toggleable checkboxes vs action buttons | |

---

## Recordings Screen

| ID | Improvement | Priority |
|----|-------------|----------|
| R-1 | **Cleaner chapter heading format** - The `[ 01 intro ]` bracket format looks like code. Use bold text with subtle line, or "01 intro" with heavier divider | |
| R-2 | **Less repetitive "safe" indicators** - When most files have "safe" badge, it's visual noise. Show differently (gray text, folder icon prefix) | |
| R-3 | **Add file actions** - Currently view-only. Add actions like open in Finder, delete. (Related to FR-15: Move to Safe) | |
| R-4 | **Add time for same-day files** - Dates formatted nicely but add time for same-day files to help identify recent takes | |
| R-5 | **Smaller/subtler toggle buttons** - "Show safe" and "Chapter headings" toggles take header space. Move to settings icon or make compact | |

---

## Projects Screen

| ID | Improvement | Priority |
|----|-------------|----------|
| P-1 | **Hide or explain "archived" row** - Appears like a project but with "-" for files/date. Either hide folders to ignore, or explain what it means | |
| P-2 | **Clearer selection indicator** - Blue highlight and "▸" work but whole row being clickable isn't obvious. Consider radio button or explicit "Select" action | |
| P-3 | **Alternative "New Project" placement** - Currently above table. Could also be row at bottom ("+ Add new project...") for discoverability | |
| P-4 | **Clickable file count → Recordings** - Clicking file count could jump directly to that project's Recordings view | |
| P-5 | **Search/filter for projects** - With 11 projects it's fine, but as list grows a simple filter input would help | |

---

## Config Screen

| ID | Improvement | Priority |
|----|-------------|----------|
| C-1 | **Consistent path display format** - Watch Directory shows `~/ecamm` but Target Directory shows full path. Should be consistent | |
| C-2 | **Saved vs dirty state indicator** - No indication when config has unsaved changes until you click Save. Show "unsaved changes" indicator | |
| C-3 | **Disable Save when unchanged** - Currently always blue/active. Should be grayed out when nothing has changed | |
| C-4 | **Path validation feedback** - No indication if you enter invalid path. Add inline validation or error states | |
| C-5 | **Surface more settings or compact layout** - Lots of whitespace. Could be more compact or surface other settings (tags, common names) currently only in JSON | |

---

## Selection Summary

| Screen | ID | Improvement | Selected |
|--------|-----|-------------|----------|
| Incoming | I-1 | Different styling for common name pills | ❌ |
| Incoming | I-2 | More prominent preview filename | ✅ |
| Incoming | I-3 | Compact "no pending files" state | ❌ |
| Incoming | I-4 | Clearer tag toggle styling | ❌ |
| Recordings | R-1 | Cleaner chapter heading format | ✅ |
| Recordings | R-2 | Less repetitive "safe" indicators | ✅ |
| Recordings | R-3 | Add file actions (future FR-15) | ✅ (ideas only) |
| Recordings | R-4 | Add time for same-day files | ✅ |
| Recordings | R-5 | Smaller/subtler toggle buttons | ✅ |
| Projects | P-1 | Handle invalid projects (Issues section) | ✅ Done |
| Projects | P-2 | Clearer selection indicator | ❌ |
| Projects | P-3 | Alternative "New Project" placement | ✅ |
| Projects | P-4 | Clickable file count → Recordings | ❌ (conflicts with row select) |
| Projects | P-5 | Search/filter for projects | ❌ |
| Config | C-1 | Consistent path display format | ✅ |
| Config | C-2 | Saved vs dirty state indicator | ✅ |
| Config | C-3 | Disable Save when unchanged | ✅ |
| Config | C-4 | Path validation feedback | ✅ |
| Config | C-5 | Surface more settings or compact layout | ❌ |

---

## Implementation Notes

### I-2: Preview Filename
- Make slightly bigger
- Move to right side of controls
- Don't need label "Preview:"

### R-1: Chapter Heading Format
- Remove square brackets
- Use Title Case: "01 POEM Planning" not "[ 01 poem-planning ]"
- Convert kebab-case to spaced words with proper capitalization

### R-2: Safe Indicators
- Remove "safe" badges entirely - not useful visual noise

### R-3: File Actions (Ideas for future)
- Open in Finder
- Move to Safe (FR-15)
- Move to Trash
- Rename
- Preview/Play

### R-4: Time for Same-Day Files
- Show time (HH:MM) for files modified today
- Show date for older files

### R-5: Toggle Buttons
- Make more compact/subtle
- Consider moving to a settings icon dropdown

### P-1: Handle Invalid Projects (UPDATED 2025-12-04)
- ~~Filter out invalid projects~~ → Show them in "Issues" section instead
- Projects not matching `[a-z][0-9]{2}-*` pattern shown below "Normal" section
- Separated by darker border (`border-gray-300` vs standard `border-gray-100`)

**Future enhancements for Issues section:**
- Warning badges on issue projects
- Tooltips explaining why project is flagged
- Rename project action (fix the naming)
- Hide/archive capability

### P-3: New Project Placement
- Move "+ New Project" button to bottom of table as a row

### C-1: Consistent Path Display
- Show tilde (~) for both Watch Directory and Target Directory
- Must ensure code still works - check where targetDirectory is used and ensure path expansion happens correctly

### C-2, C-3, C-4: Config Save State
- Show "unsaved changes" indicator when config is dirty
- Disable Save button when no changes
- Add validation feedback for invalid paths
