# NFR-87: Starred Projects Visual Update

**Status:** Implemented
**Added:** 2025-12-16
**Implemented:** 2025-12-16

---

## User Story

As a user, I want pinned projects displayed with a star icon instead of a pin icon for a cleaner visual.

## Problem

The "pinned projects" section uses a pin icon (📌). We want to visually rebrand this as "starred projects" with a star icon (⭐) without changing the underlying code.

## Solution

Visual-only change:
- Change the visual icon from 📌 to ⭐
- Update any UI labels from "Pinned" to "Starred" (display only)
- **Do NOT rename** code variables, config keys, or data structures

## Scope

**Change:**
- Icon: 📌 → ⭐
- UI text: "Pinned" → "Starred" (if displayed anywhere)

**Do NOT change:**
- `pinnedProjects` array in config
- Any variable names, function names, or type definitions
- API endpoints or data structures

## Acceptance Criteria

- [x] Star icon (⭐) shown instead of pin icon
- [x] Any visible "Pinned" text changed to "Starred"
- [x] No code refactoring - internal names remain `pinned`

## Technical Notes

The feature can be referred to as either "Pinned projects" or "Starred projects" in documentation.

## Additional Change

Sort order updated: Projects now display in natural code order (b40, b41, b42...). Stars mark interest but don't float projects to the top.

## Completion Notes

Implemented 2025-12-16. Visual icon and text updated. Internal code names unchanged.
