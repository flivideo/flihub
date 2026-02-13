# Assets Page - UI Mockup

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Recording Namer                          [Incoming] [Assets] [Config]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ASSIGNMENT CONTROLS                                                  │   │
│  │                                                                      │   │
│  │  Chapter: [ 05 ]    Sequence: [ 3 ]    Image #: [ 2 ] (auto)        │   │
│  │                                                                      │   │
│  │  Variant:  (•) None  ( ) A  ( ) B  ( ) C                            │   │
│  │                                                                      │   │
│  │  Label: [ workflow-diagram_____________ ]                            │   │
│  │                                                                      │   │
│  │  Preview: 05-3-2-workflow-diagram.png                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ INCOMING IMAGES (~/Downloads)                            [Refresh]  │   │
│  │                                                                      │   │
│  │  ⚠️ 1 duplicate hidden                                              │   │
│  │                                                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │          │ │          │ │          │ │          │ │          │  │   │
│  │  │  [img]   │ │  [img]   │ │  [img]   │ │  [img]   │ │  [img]   │  │   │
│  │  │          │ │          │ │          │ │          │ │          │  │   │
│  │  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤  │   │
│  │  │ 3.1 MB   │ │ 3.0 MB   │ │ 2.7 MB   │ │ 2.9 MB   │ │ 3.1 MB   │  │   │
│  │  │ 09:22:59 │ │ 09:23:35 │ │ 09:31:17 │ │ 09:31:54 │ │ 09:32:19 │  │   │
│  │  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤  │   │
│  │  │ [Assign] │ │ [Assign] │ │ [Assign] │ │ [Assign] │ │ [Assign] │  │   │
│  │  │ [Delete] │ │ [Delete] │ │ [Delete] │ │ [Delete] │ │ [Delete] │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  │                                                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │          │ │          │ │          │ │          │ │          │  │   │
│  │  │  [img]   │ │  [img]   │ │  [img]   │ │  [img]   │ │  [img]   │  │   │
│  │  │          │ │          │ │          │ │          │ │          │  │   │
│  │  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤  │   │
│  │  │ 2.9 MB   │ │ 3.0 MB   │ │ 3.2 MB   │ │ 3.0 MB   │ │ 3.2 MB   │  │   │
│  │  │ 09:32:25 │ │ 09:32:36 │ │ 09:33:28 │ │ 09:33:36 │ │ 09:33:41 │  │   │
│  │  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤  │   │
│  │  │ [Assign] │ │ [Assign] │ │ [Assign] │ │ [Assign] │ │ [Assign] │  │   │
│  │  │ [Delete] │ │ [Delete] │ │ [Delete] │ │ [Delete] │ │ [Delete] │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ASSIGNED IMAGES (assets/images/)                         12 images  │   │
│  │                                                                      │   │
│  │  05-1-1-intro-title.png                                             │   │
│  │  05-2-1-setup-overview.png                                          │   │
│  │  05-3-1-workflow-start.png                                          │   │
│  │  ...                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### Header Navigation

```
[Incoming] [Assets] [Config]
    │         │        │
    │         │        └── Current config panel (existing)
    │         └── NEW: Assets page (this design)
    └── Current incoming videos page (existing)
```

Active tab highlighted with underline or background color.

---

### Assignment Controls Panel

```
┌─────────────────────────────────────────────────────────────────────┐
│ ASSIGNMENT CONTROLS                                                  │
│                                                                      │
│  Chapter      Sequence     Image #                                   │
│  ┌─────┐      ┌─────┐      ┌─────┐                                  │
│  │ 05  │      │  3  │      │  2  │  (auto-calculated)               │
│  └─────┘      └─────┘      └─────┘                                  │
│                                                                      │
│  Variant                                                             │
│  (•) None   ( ) A   ( ) B   ( ) C                                   │
│                                                                      │
│  Label                                                               │
│  ┌────────────────────────────────────────┐                         │
│  │ workflow-diagram                        │                         │
│  └────────────────────────────────────────┘                         │
│  (kebab-case only)                                                   │
│                                                                      │
│  Will save as: 05-3-2-workflow-diagram.png                          │
│                ─────────────────────────────                         │
│                      (live preview)                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Behavior:**

- Chapter/Sequence pre-filled from current naming state
- Image # auto-calculated based on existing files
- When variant selected: `05-3-2a-workflow-diagram.png`
- Label validated for kebab-case (lowercase, hyphens only)

---

### Image Card (Incoming)

```
┌────────────────┐
│                │
│   [thumbnail]  │  ← Actual image preview (scaled)
│                │
│    128 x 128   │
│                │
├────────────────┤
│ 3.1 MB         │  ← File size
│ 09:22:59       │  ← Time downloaded
├────────────────┤
│   [ Assign ]   │  ← Primary action (uses current controls)
│   [ Delete ]   │  ← Move to trash / remove
└────────────────┘
```

**States:**

- Default: White background
- Hover: Light blue border
- Selected (for bulk?): Blue background (future)
- Duplicate: Grayed out with "Duplicate" badge

---

### Image Card (with Preview Modal - Future)

```
Click thumbnail → Opens larger preview

┌─────────────────────────────────────────┐
│                    ╳                    │
│                                         │
│         [ Full size preview ]           │
│                                         │
│                                         │
│  ChatGPT Image Nov 29, 2025, 09_22...   │
│  3.1 MB · 1024 × 1024                   │
│                                         │
│        [ Assign ]  [ Delete ]           │
└─────────────────────────────────────────┘
```

---

### Duplicate Warning

```
⚠️ 1 duplicate hidden  [Show duplicates]
```

Click to expand and show duplicates with badge:

```
┌────────────────┐
│                │
│   [thumbnail]  │
│                │
├────────────────┤
│  ⚠️ DUPLICATE  │  ← Badge instead of size
│  of 09:33:48   │  ← Reference to original
├────────────────┤
│   [ Delete ]   │  ← Only delete, no assign
└────────────────┘
```

---

### Assigned Images List (Collapsed by default)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ASSIGNED IMAGES (assets/images/)                  12 images  [▼]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────┐ 05-1-1-intro-title.png              1.2 MB    Nov 29 09:30 │
│  │img │                                                             │
│  └────┘                                                             │
│                                                                      │
│  ┌────┐ 05-2-1-setup-overview.png           2.1 MB    Nov 29 09:45 │
│  │img │                                                             │
│  └────┘                                                             │
│                                                                      │
│  ┌────┐ 05-3-1-workflow-start.png           3.1 MB    Nov 29 10:00 │
│  │img │                                                             │
│  └────┘                                                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Interaction Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Set       │     │   Click     │     │   Image     │
│   Chapter,  │ ──▶ │   Assign    │ ──▶ │   Moved &   │
│   Seq,      │     │   on card   │     │   Renamed   │
│   Label     │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Image #    │
                                        │  auto-      │
                                        │  increments │
                                        └─────────────┘
```

1. User sets chapter (05), sequence (3), label (workflow-diagram)
2. Image # shows "2" (auto-calculated: one image already exists for 05-3)
3. User clicks [Assign] on an image card
4. Image moves from Downloads to `assets/images/05-3-2-workflow-diagram.png`
5. Toast: "Assigned as 05-3-2-workflow-diagram.png"
6. Image # auto-updates to "3" for next assignment
7. User can change label and assign next image

---

## Variant Flow (A/B alternatives)

```
Assigning two versions of same diagram:

1. Set: Chapter=05, Seq=3, Image#=2, Variant=A, Label=comparison-chart
   → Assign first image
   → Saves as: 05-3-2a-comparison-chart.png

2. Keep same settings, click Assign on second image
   → Variant auto-advances to B
   → Saves as: 05-3-2b-comparison-chart.png

3. Change variant back to "None" for non-variants
   → Image# advances to 3
   → Next save: 05-3-3-something-else.png
```

---

## Color Scheme (consistent with existing app)

| Element                 | Color                                 |
| ----------------------- | ------------------------------------- |
| Background              | `#f9fafb` (gray-50)                   |
| Cards                   | `#ffffff` white with `#e5e7eb` border |
| Primary button (Assign) | `#3b82f6` blue-500                    |
| Danger button (Delete)  | `#ef4444` red-500                     |
| Duplicate badge         | `#f59e0b` amber-500                   |
| Success toast           | `#22c55e` green-500                   |

---

## Responsive Considerations

**Desktop (>1024px):** 5 images per row
**Tablet (768-1024px):** 4 images per row
**Mobile (<768px):** 2 images per row, stacked controls

---

## Empty States

**No incoming images:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ INCOMING IMAGES (~/Downloads)                            [Refresh]  │
│                                                                      │
│                    📁                                                │
│                                                                      │
│            No images found in Downloads                              │
│                                                                      │
│     Images will appear here when you save from                       │
│     ChatGPT, Midjourney, or other tools                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**No assigned images:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ ASSIGNED IMAGES (assets/images/)                          0 images  │
│                                                                      │
│         No images assigned to this project yet                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```
