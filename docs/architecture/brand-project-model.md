# Brand & Project Listing — the Model as Actually Built

**Written 2026-09-04 from code, not PRD intent**, for the conversation David asked for:
*"Do we have to support multiple brands in the way we do project listings, the way we've done
it inside FliHub? … talk to FliCut about implementing it properly."* And beyond FliCut:
*"Really, we should be hosting projects in FliStudio, an application yet to be written."*
This is the model those apps inherit. Every claim carries a file:line.

Companions: [project-codes.md](project-codes.md) (code grammar, series, resolution),
[edit-folders.md](edit-folders.md) (what FliHub reads: `final/` only).

---

## 0 · The one architectural fact everything else follows from

**FliHub is a single-current-brand application.** There is exactly one live brand at a time —
the brand IS `config.projectsRootDirectory` — and every API answers relative to it. You
cannot ask FliHub about Kybernesis's projects while AppyDave is active; you switch, globally,
for every client of the server at once. The only cross-brand artifact anywhere is the
registry file `~/.config/appydave/brands.json` (which FliHub reads and never writes —
`server/src/utils/brands.ts:4`).

David's wanted picture — *"switch from Kybernesis to AppyDave and see all the projects of
AppyDave, all in a menu"* — is exactly what shipped (FR-162), with that constraint: the menu
switches the whole app, not a view.

## 1 · How brand switching actually works (FR-162)

**Where brands are defined.** Two sources, merged by `listBrands()`
(`server/src/utils/brands.ts:56-101`):

1. `~/.config/appydave/brands.json` → `brands.{key}.locations.video_projects` is the brand's
   root; `locations.ssd_backup` is its published path. An entry without `video_projects` is
   unswitchable and skipped (`brands.ts:63`).
2. **Unregistered disk roots**: any `v-*` sibling of the current root's parent directory
   (`brands.ts:78-95`). This is how kybernesis was selectable before it had a registry entry.
   Without a registry entry the `v-` prefix is the only marker; a brand folder without it is
   invisible until registered.

**What a brand maps to on disk.** `root` (= `projectsRootDirectory`), `publishedPath`
(brands.json `ssd_backup`, else derived `/Volumes/T7/youtube-PUBLISHED/{key}`), `holdingPath`
(always derived `/Volumes/T7/youtube-HOLDING/{key}` — brands.json has no holding field yet;
`brands.ts:35-40`).

**What happens at switch time** (`server/src/routes/brands.ts:38-68`): one `updateConfig`
call sets `projectsRootDirectory` to the brand root, sets `activeProject: ''` ("never leave
the old brand's project dangling"), and moves `publishedPath` + `holdingPath` WITH the root
so T7 paths can never desynchronise from the brand. Then `projects:changed` +
`recordings:changed` are emitted and every connected client refetches. `updateConfig`
(`server/src/index.ts:155-217`) re-derives `projectDirectory` and calls
`watcherManager.updateFromConfig`, which restarts all six project-scoped watchers because
`projectDirectory` changed (`server/src/WatcherManager.ts:293-302`). The client side
(`client/src/hooks/useBrandsApi.ts`) invalidates the entire query cache.

**The `activeProject:''` edge.** With no active project, `projectDirectory` falls back to
the root itself (`index.ts:178-180`), so project-scoped endpoints briefly treat the BRAND
ROOT as a project (e.g. `/api/recordings` looks for `<root>/recordings/` — absent, so empty
list). Benign no-ops today, but a client that acts before the user picks a project is acting
on a phantom project whose path is the root.

## 2 · How project listing works

**Discovery** (`server/src/routes/projects.ts:99-135` `/api/projects/stats`, and the same
scan in `server/src/routes/query/projects.ts:63-70`): `readdir` of `projectsRootDirectory`,
**one level deep only**, keeping directories that don't start with `.` or `-` and aren't
`archived`. No recursion; a project is exactly a top-level folder. **Identity is the folder
name** — there is no id, no manifest key; rename the folder and it is a different project
(stage overrides, priorities, and the FR-163 mark all key off the name or its code prefix).

**Sort**: `code.localeCompare` — plain lexicographic on folder name
(`projects.ts:129`). Pins (FR-32/NFR-87) mark interest but don't re-sort.

**Stage**: 10-value union; auto-detect assigns only `planning`/`recording`
(`server/src/utils/projectStats.ts:158-166`); everything else is a manual override stored in
**global** `server/config.json` → `projectStageOverrides[code]` (`projects.ts:224`).

**Brand on the wire**: `/api/query/projects` derives a `brand` field from the root's
directory name (`v-appydave` → `appydave`, `query/projects.ts:107,184`) — display-only,
derived, not stored anywhere.

**FR-163 auto-filled codes** ([fr-163 PRD](../prd/fr-163-auto-filled-project-codes.md)):
`GET /projects/next-code` computes max(scan, stored mark)+1 where the scan covers the live
root (one level) plus `archived/` and `publishedPath` **two levels each** (bucket folders
like `b50-b99/` are containers, not codes — `server/src/utils/nextProjectCode.ts`,
`collectTwoLevels`). The mark never decreases; create raises it.

### Per-brand or global code sequence? **Per-brand. Ruled and supported.**

The high-water mark is `projectCodeHighWater: Record<root, code>` — **keyed by the brand
root path** (`shared/types.ts`, merge at `server/src/index.ts:194-200`), and the scan only
ever reads the current root + its archived/published. So AppyDave sits at d01/d02 while
Kybernesis independently starts at a01 (ruled 2026-09-04: empty brand pre-fills `a01`).
Nothing assumes a global sequence. **Consequence for consumers: a code alone does not
identify a project — `(brand, code)` does.** Both brands can and will have an `a01`.

⚠️ One fragility: the mark is keyed by the root's literal PATH STRING. Move a brand's root
(this happened once already — the T7 root move that invalidated the first shadow count) and
the mark doesn't follow; the new path starts a fresh key and falls back to scan-only until
re-seeded.

## 3 · Brand-aware vs silently global

The switch moves exactly three config fields (root, published, holding) and restarts
watchers. Everything else in `server/config.json` is **one global pool**. Per item, with
mechanism:

| Surface | Brand-aware? | Mechanism / consequence |
|---|---|---|
| `projectsRootDirectory`, `publishedPath`, `holdingPath` | ✅ travels | set atomically at switch (`brands.ts` router) |
| Project-scoped watchers (recordings, transcripts, inbox, thumbs, images, projects) | ✅ restart | `WatcherManager.updateFromConfig:293-302` on projectDirectory change |
| `projectCodeHighWater` | ✅ per-brand | keyed by root path |
| Per-project state (`.flihub-state.json`: titles, flags, per-project dictionary) | ✅ travels | lives inside the project folder |
| **`projectStageOverrides[code]`** | ❌ **global, code-keyed** | `projects.ts:224`, stored in the single config.json. Codes repeat across brands → Kybernesis's future `a01` inherits/overwrites any stage override AppyDave's `a01`-era projects ever had. Same for **`projectPriorities[code]`** (`projects.ts:169`). This is the sharpest cross-brand leak. |
| **`watchDirectory` (Ecamm)** | ❌ global | one watch folder feeds whichever brand is active; a promote after a switch files the recording into the OTHER brand's active project. The recording lane doesn't know brands exist. |
| **`glingDictionary` → Whisper initial prompt** | ❌ global | `transcriptions.ts:128-130`. One vocabulary for all brands; the per-project dictionary in the state file is NOT fed to ASR (relevant to FR-169's dictionary gap). |
| `commonNames`, `availableTags` | ❌ global | one naming vocabulary across brands |
| `imageSourceDirectory` | ❌ global | incoming images lane is brand-blind |
| Relay (`relayDirectory`, `relayEnabled`) | ❌ global **by design** | "relay is machine-global, not per-project — do NOT restart on projectDirectory changes" (`WatcherManager.ts:310`) |
| `machineRole`, Whisper binary/model/language | ❌ global | genuinely machine-level; correct as global |
| Transcription queue (in-flight) | ~ path-anchored | jobs carry absolute paths and derive output dirs from the video path (FR-109, `transcriptions.ts:118-120`), so in-flight work finishes correctly against the OLD brand after a switch. Queue-all/pending-count read the CURRENT projectDirectory at call time. |

**The pattern**: anything keyed by project code or stored flat in config.json is global;
anything living inside the project folder travels. The state file (FR-111) is the
brand-safe store; config.json is the brand-blind one. A FliStudio should treat that as the
rule: **project truth in the project folder, machine truth in machine config, and nothing
keyed by bare code.**

## 4 · The contract another app needs (FliCut today, FliStudio eventually)

To render "brand → projects → stages" a consumer needs:

1. **Brand registry**: `~/.config/appydave/brands.json` — readable directly (it's the
   canonical cross-app file, FliHub itself never writes it), or via `GET /api/brands`
   (list + `activeKey`). The disk-merge of unregistered `v-*` roots exists ONLY inside
   FliHub — a consumer reading brands.json alone won't see unregistered brands.
2. **Projects under a brand**: `GET /api/query/projects` (code, brand, stage, title,
   counts) or `GET /api/projects/stats` — **but only for the currently active brand.**
   There is no `?brand=` parameter anywhere; the root is server state.
3. **Within a project**: `GET /api/recordings`, `/api/query/*` reporters, the state file.

**So: the contract half-exists.** Everything a consumer needs is served — for one brand at a
time. What would have to be invented for the wanted picture in another app:

- **brand-parameterised queries** (`/api/query/projects?brand=kybernesis`) or, cleaner, the
  FliStudio inversion: the HOSTING app owns brands.json + the scan (both are trivial:
  registry read + one-level readdir + the §2 filters) and FliHub becomes one lens over it;
- **`(brand, code)` as the project identity** in anything stored outside the project folder
  (fixes the §3 stage/priority leak at the same time);
- the **`ships` field** (FR-168, ruled) so a consumer knows how many deliverables a project
  produces without inferring it.

FliCut implementing "the FliHub way" therefore means: read brands.json for the menu,
one-level-scan the chosen root with the dot/dash/`archived` filters, treat folder name as
identity, `(brand, code)` as the key — and NOT copying the global code-keyed override
pattern, which is the part of the FliHub way that is a defect.

## 5 · Multiple cuts per project — the flagged tension (not solved here)

David floated: *"the cuts — you can have more than one cut set up per project, I guess."*

From FliHub's side nothing PREVENTS it: FliHub never reads `first-edit/` at all
([edit-folders.md](edit-folders.md) — `final/` is the only edit folder it consumes), so any
number of cut files can sit there. The strain is in the ruled naming: the convention has
**no version/variant suffix**, and the overwrite stance is uniquePath-style refusal rather
than versioning. That is coherent for exactly one cut per shipped video — d01
(ships per-chapter, 12 videos) gets 12 first-edit files, d02 (ships per-project) gets 1 —
and the expected COUNT comes from FR-168's `ships` field. It starts to strain the moment two
ALTERNATIVE cuts of the same deliverable exist: they would collide on the same name with no
discriminator, and nothing in the model says which one `final/` descends from. Decision
needed from David before anyone builds multi-cut: a variant discriminator in the filename,
or cuts as first-class records (a FliStudio-shaped answer), or a ruling that alternatives
live outside the project convention.

---

*Fence note: this document is research only — no brand code changed. Written by flihub-dev
2026-09-04 on agent-a-day-orch's relay of David's request.*
