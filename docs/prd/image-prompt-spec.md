# Image Prompt Creation - Specification

## Overview

Add the ability to create image prompts directly in the Assets page. Prompts are saved as `.txt` files alongside images in `assets/images/`, using the same naming convention. This enables delegation of image generation to collaborators (e.g., Jan) who have better tooling.

---

## Problem Statement

**Current workflow (creator does everything):**
1. Write prompt mentally or in notes
2. Open DALI 3, paste prompt, generate image
3. Download image to Downloads
4. Assign image in app → `assets/images/05-3-1-demo.png`
5. DAM sync to collaborator
6. Collaborator uses image in edit

**Pain points:**
- Time-consuming for creator
- Creator's tooling (DALI 3) is less powerful than collaborator's (Higs Field, Halo)
- Collaborator is better at image generation

**Proposed workflow (delegation):**
1. Creator writes prompt in app
2. Save prompt → `assets/images/05-3-1-demo.txt`
3. DAM sync to collaborator
4. Collaborator reads prompt, generates image with better tools
5. Collaborator saves image as `assets/images/05-3-1-demo.png` (same base name)
6. Image appears alongside prompt

---

## Naming Convention

Prompts follow the same naming as images:

```
{chapter}-{seq}-{imgOrder}{variant}-{label}.txt
```

**Examples:**
```
05-3-1-demo.txt                    # Prompt for demo image
05-3-1-demo.png                    # Corresponding image (created by collaborator)
05-3-2a-workflow-diagram.txt       # Prompt with variant A
05-3-2a-workflow-diagram.png       # Corresponding image
```

---

## UI Design

### Assignment Controls (Extended)

Add "Image Prompt" text area below the existing Label field:

```
┌─────────────────────────────────────────────────────────────────┐
│  ASSIGNMENT CONTROLS                                             │
│                                                                  │
│  Chapter: [05]    Sequence: [3]    Image #: [2] (auto)          │
│                                                                  │
│  Variant:  (•) None  ( ) A  ( ) B  ( ) C                        │
│                                                                  │
│  Label: [workflow-diagram_______________]                        │
│                                                                  │
│  Preview: 05-3-2-workflow-diagram                                │
│                                                                  │
│  Image Prompt:                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ A clean diagram showing video editing workflow with      │    │
│  │ three stages: Record → Edit → Publish. Minimalist        │    │
│  │ style, blue accent color, white background.              │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                              [Save Prompt]       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Field details:**
- Multi-line text area (4-6 rows default, expandable)
- Placeholder: "Describe the image you want generated..."
- No character limit

**Save Prompt button:**
- Disabled when Image Prompt is empty
- Enabled when Image Prompt has text (and Label is filled)
- On click: saves `.txt` file to `assets/images/`

---

### Assigned Assets List (Extended)

Show both images and prompts in the assigned list:

```
ASSIGNED ASSETS                                          15 items

  05-3-1-demo.png                    📷     3.1 MB
  05-3-2-workflow-diagram.txt        📝     "A clean diagram showing..."
  05-3-2-workflow-diagram.png        📷     2.8 MB
  05-3-3-outro-graphic.txt           📝     "End screen with subscribe..."
```

**Visual indicators:**
- 📷 or image icon for `.png/.jpg/.webp`
- 📝 or text icon for `.txt`
- For prompts: show first ~50 chars of content (truncated)

---

### Editing Existing Prompts

**Click on a prompt row:**
1. Loads the prompt content into the Image Prompt text area
2. Populates Chapter, Sequence, Image #, Variant, Label from filename
3. Save Prompt button becomes "Update Prompt"
4. Allows editing and re-saving

**Cancel editing:**
- Click elsewhere or clear the text area
- Returns to "create new" mode

---

## Interaction Flow

### Creating a New Prompt

```
1. User sets Chapter (05), Sequence (3)
2. Image # auto-calculates (e.g., 2)
3. User enters Label: "workflow-diagram"
4. Preview shows: 05-3-2-workflow-diagram
5. User types prompt in Image Prompt text area
6. [Save Prompt] button enables
7. User clicks [Save Prompt]
8. File created: assets/images/05-3-2-workflow-diagram.txt
9. Toast: "Saved prompt as 05-3-2-workflow-diagram.txt"
10. Image Prompt field clears
11. Image # auto-increments to 3
```

### Editing an Existing Prompt

```
1. User clicks on "05-3-2-workflow-diagram.txt" in Assigned Assets
2. Controls populate: Chapter=05, Seq=3, Image#=2, Label=workflow-diagram
3. Image Prompt text area fills with file content
4. Button shows "Update Prompt"
5. User edits the text
6. User clicks [Update Prompt]
7. File overwritten
8. Toast: "Updated 05-3-2-workflow-diagram.txt"
9. Controls clear, return to create mode
```

---

## API Design

### POST /api/assets/prompt

Create or update a prompt file.

**Request:**
```json
{
  "chapter": "05",
  "sequence": "3",
  "imageOrder": "2",
  "variant": null,
  "label": "workflow-diagram",
  "content": "A clean diagram showing video editing workflow..."
}
```

**Response:**
```json
{
  "success": true,
  "path": "/path/to/project/assets/images/05-3-2-workflow-diagram.txt",
  "filename": "05-3-2-workflow-diagram.txt",
  "created": true  // or false if updated
}
```

### GET /api/assets/prompt/:filename

Read a prompt file's content for editing.

**Response:**
```json
{
  "filename": "05-3-2-workflow-diagram.txt",
  "content": "A clean diagram showing video editing workflow...",
  "chapter": "05",
  "sequence": "3",
  "imageOrder": "2",
  "variant": null,
  "label": "workflow-diagram"
}
```

---

## File Format

The `.txt` file contains only the prompt text (plain text, no metadata header).

```
A clean diagram showing video editing workflow with three stages:
Record → Edit → Publish. Minimalist style, blue accent color,
white background. Icons for each stage. Professional look suitable
for YouTube tutorial video.
```

**Rationale:** Keep it simple. Metadata is encoded in the filename. Plain text is easy for collaborators to read in any tool.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Save with no Label | Button disabled, Label is required |
| Save with no Prompt text | Button disabled |
| File already exists | Overwrite with confirmation toast |
| `assets/images/` doesn't exist | Create directory automatically |
| Invalid characters in Label | Sanitize (same as image labels) |

---

## Future Enhancements (Out of Scope)

1. **Import prompts from external location** - Load `.txt` files from a configurable directory (e.g., output from POEM system)
2. **Paired view** - Group prompts and images by base filename, show status (prompt only, image only, both)
3. **Backfill prompts** - AI-powered: describe existing images to generate prompts retroactively
4. **Prompt templates** - Common prompt structures that can be reused

---

## Implementation Notes

### Backend

1. Add routes in `server/src/routes/assets.ts`:
   - `POST /api/assets/prompt` - Create/update prompt
   - `GET /api/assets/prompt/:filename` - Read prompt content

2. Extend `GET /api/assets/images` to include `.txt` files:
   - Add `type: 'image' | 'prompt'` to response items
   - For prompts, include truncated content preview

### Frontend

1. **AssetsPage.tsx:**
   - Add "Image Prompt" text area below Label field
   - Add "Save Prompt" button (disabled when empty)
   - Track editing state (creating vs editing existing)

2. **Hooks:**
   - `useSavePrompt()` - mutation for POST /api/assets/prompt
   - `useLoadPrompt(filename)` - query for GET /api/assets/prompt/:filename
   - Extend `useProjectImages()` to include prompts

3. **Assigned Assets list:**
   - Show both images and prompts
   - Different icon/indicator for each type
   - Click prompt → load for editing

---

## Mockup - Full Assets Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Assets                               [Incoming] [Recordings]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ASSIGNMENT CONTROLS                                             │
│                                                                  │
│  Chapter: [05]    Sequence: [3]    Image #: [2] (auto)          │
│                                                                  │
│  Variant:  (•) None  ( ) A  ( ) B  ( ) C                        │
│                                                                  │
│  Label: [workflow-diagram_______________]                        │
│                                                                  │
│  Preview: 05-3-2-workflow-diagram                                │
│                                                                  │
│  Image Prompt:                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │                                                          │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                              [Save Prompt]       │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  INCOMING IMAGES (~/Downloads)                       [Refresh]   │
│                                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                           │
│  │ img  │ │ img  │ │ img  │ │ img  │                           │
│  │ 3.1MB│ │ 2.9MB│ │ 3.0MB│ │ 2.8MB│                           │
│  │[Asgn]│ │[Asgn]│ │[Asgn]│ │[Asgn]│                           │
│  └──────┘ └──────┘ └──────┘ └──────┘                           │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ASSIGNED ASSETS (assets/images/)                     12 items   │
│                                                                  │
│  📷 05-3-1-demo.png                              3.1 MB          │
│  📝 05-3-2-workflow-diagram.txt       "A clean diagram..."      │
│  📷 05-3-2-workflow-diagram.png                  2.8 MB          │
│  📝 05-3-3-outro-graphic.txt          "End screen with..."      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
