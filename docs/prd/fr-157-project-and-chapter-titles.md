# FR-157: Project and Chapter YouTube Titles

**Status:** ✓ Implemented (2026-08-30)

## Problem

A project had five YouTube titles and nowhere to put them. There was no `title` field at
project level, and chapters are derived from `NN-` filename prefixes (named only when a final
SRT exists) — no chapter record to hang a title on.

## Solution

Both titles live in the existing per-project sidecar `.flihub-state.json` (FR-111). No new
convention.

```json
{ "version": 1, "recordings": {},
  "title": "Agents That Actually Hold Together",
  "chapters": { "03": { "title": "Your AI Agent Forgets You Every Morning" } } }
```

## API

| Method | Path | Body |
|---|---|---|
| `PUT` | `/api/projects/:code/title` | `{ "title": "…" }` — `""` clears |
| `PUT` | `/api/projects/:code/chapters/:n/title` | `{ "title": "…" }` — `n` is `3` or `03`; `""` clears |
| `GET` | `/api/query/projects/:code` | now includes `title` (and a `Title:` line in `?format=text`) |
| `GET` | `/api/query/projects/:code/chapters` | each chapter carries `title`; `displayName` uses it when set |

## Notes

- `writeProjectState` is an allowlist — the new fields had to be added there explicitly or
  they would have been dropped on the next write.
- Chapter titles are keyed by 2-digit chapter, independent of the filename name segment, so a
  mangled filename (see d01 chapter 03) does not affect the title.
- `.chapter-overrides.json` (FR-34) was deliberately not reused: it is an array of timestamp
  actions keyed by `chapter+name`, the wrong shape for a title.
- **Consumers converged (2026-08-30, same day):** three code paths derive chapters independently
  from filenames — the Recordings view (client-side grouping + cumulative raw-take timestamps), the
  chapters query API (final-SRT timestamps), and the POEM `chapter-data` payload. Names now all
  come from one server helper (`getChapterTitles` / `getChapterTitle` over `.flihub-state.json`):
  `/api/recordings` returns `chapterTitles`, the CHAPTERS panel and chapter group headers prefer it
  over the title-cased slug, and the POEM payload carries `title` next to `chapterName` (kept —
  POEM keys on it). **Timestamps were deliberately not merged**: the UI's are cumulative raw take
  durations, the API's are final-cut positions — different quantities.
- **UI (2026-08-30, third pass):** *name* and *title* are two concepts and both stay visible.
  Chapter headings and the CHAPTERS panel show the **name** (title-cased dash notation you typed)
  as primary; the **YouTube title** is a muted second line, click-to-edit in place (Enter saves,
  Esc/blur cancels, empty clears). Project title is an editable line beside "Project Recordings"
  (`/api/recordings` now returns `project { code, title }`). Shared widget:
  `client/src/components/shared/InlineTitle.tsx`.
