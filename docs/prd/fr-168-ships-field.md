# FR-168 — `ships: per-project | per-chapter` as a Create-Time Project Field

**Status: Pending — DESIGN RULED BY DAVID (2026-09-04), implementation not yet authorised.**
This ticket is "implement the ruled field", not "consider adding one".

## The gap it closes

Render grain is modelled nowhere. `chapters["NN"].title` in `.flihub-state.json` means a
**VIDEO title** when a project ships one video per chapter (d01: 12 chapters → 12 videos) and
a **CHAPTER title** when the project ships once (d02: 6 chapters → 1 video). Identical folder
shape, opposite meaning — deliberately cut from FR-157's scope. It stopped being theoretical
on 2026-09-04 when `ylo-agent` generated D02's chapters in the wrong register because nothing
machine-readable said which kind of project it was.

## David's ruling

`ships: 'per-project' | 'per-chapter'` becomes a field chosen at project creation.

## What it answers downstream

- How FR-157 titles should be read (video titles vs chapter titles).
- How many FliCut runs a project needs.
- How many uploads FliLaunch should expect.
- How many files `final/` should end up containing.

## The fix shape (when approved)

- `shared/types.ts` ProjectState: add `ships` (remember `writeProjectState` is an
  **allowlist** — `server/src/utils/projectState.ts` must list the new field or it is
  silently dropped; this bit FR-157 already).
- `NewProjectForm.tsx` (FR-163): a two-option selector at create time.
- Surface it in `/api/query/projects` and the reporters so agents can read it.
- Decide a default for the ~97 existing projects (probably `per-project`, the historical
  norm) and whether d02 gets hand-set to `per-chapter`.

## Cross-references

- FR-157 PRD (scope-cut note): [fr-157-project-and-chapter-titles.md](fr-157-project-and-chapter-titles.md)
- FR-163 PRD (create form this lands in): [fr-163-auto-filled-project-codes.md](fr-163-auto-filled-project-codes.md)
