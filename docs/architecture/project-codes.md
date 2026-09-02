# Project codes — the actual contract (verified against code, 2026-09-02)

Written because the convention was being described from memory to other tools (Teletubby).
Every claim here is checked against this repo's code or the projects folder on disk.

## The grammar the CODE enforces (weak)

- A project's identity is **one string: the folder name** under `projectsRootDirectory`
  (e.g. `d01-kybernesis-12-videos`). There is no separately stored code vs display name.
- Validation on create (`POST /api/projects`, `server/src/routes/index.ts`):
  `NAMING_RULES.name.pattern` = `/^[a-z0-9.]+(-[a-z0-9.]+)*$/`, max 50 — **plain kebab-case.
  The letter+number series is NOT enforced anywhere in code.** The route comment says
  "typically starts with b followed by number" — convention, not grammar.
- Short-code resolution (FR-119, `server/src/utils/projectResolver.ts`): any API `:code`
  accepts a prefix; `d01` → first alphabetical folder starting with `d01`. That is the only
  place a "code" has machine meaning, and it is startsWith, not a parse.

## The convention HUMANS follow (strong, with exceptions)

- `{series letter}{2-digit number}-{kebab-name}` — a00–z99, ~100 slots per letter.
- Series observed on disk: archived buckets `-01-25`, `a01-a49`, `a50-a99`, `b00-b49`,
  `b50-b99`; live projects `b65…b99`, `c01…c37` (with gaps — numbers are not dense),
  and the d-series.
- **The d-series started at `d01`, not `d00`** — `d01-kybernesis-12-videos` is the only
  d project (as of 2026-09-02). David wondered which; disk answers.
- Exceptions exist and are tolerated: `x01-test`, `v38-ruflo-enhances-t3-code`, plus
  non-project folders (`poem`, `tools`, `catalog`, `archived`) in the same root. Any consumer
  must filter, not assume every folder is a series project.

## Rename vs move — what FliHub actually has

- **Project rename does NOT exist.** No route, no client path renames a project folder or a
  "display name". (Recordings rename per-file; FR-157 added project/chapter *YouTube titles*
  in `.flihub-state.json` — a title is metadata, not identity.) David's recollection that
  "renaming should rename the folder but doesn't always happen" describes an unbuilt feature,
  not flaky behaviour.
- **If FliHub ever builds rename or move, the pattern already exists — match it.** Teletubby
  implemented these semantics first (2026-09-02, from this contract): `project` identity is
  the FliHub folder name verbatim and immutable; rename changes *title only* (the FR-157
  layer); `null→value` is an attach; `value→different` is refused as "that's a move, not a
  rename". A FliHub implementation must mirror that, not invent a second shape.
- **"Moving projects" is solved only in the STORAGE sense** (`server/src/routes/storage.ts`):
  `hold` / `restore-held` (evacuate heavy subfolders to HOLDING), `archive` / `unarchive`
  (whole folder to/from PUBLISHED root). Identity never changes. A code-change "move"
  (`c37-x` → `d02-x`) does not exist anywhere.

## Machine-readable surfaces another tool can use today

- `GET :5101/api/query/projects` — list (code, stage, priority, stats); `?format=text`.
- `GET :5101/api/query/projects/:code` — accepts prefix codes; returns `title` when set.
- `POST :5101/api/projects` `{ code }` — creates folder + `recordings/`; 409 if exists;
  validates kebab-case only.
- Requires FliHub's server (5101) to be running. `v-appydave/projects.json` is a
  DAM-generated S3 manifest (`dam s3-scan`), not read by the FliHub server — do not treat it
  as the registry.

## Deferred by David (documented, NOT tasks)

- A **shared project-naming library** between FliHub and Teletubby ("a problem for future
  days"). The seam, when it comes: the grammar above + prefix resolution, extracted from
  `shared/naming.ts` / `projectResolver.ts`.
- **Teletubby starting a FliHub project directly** — the API for it already exists
  (`POST /api/projects`); the deferral is the Teletubby-side verb, not a FliHub gap.
- One shape fact a script tool should know: in `d01`, a "chapter" IS a YouTube short
  (FR-157's cut project-shape flag); the long-form-with-chapters pattern resumes with the
  next projects.
