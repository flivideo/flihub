# FR-162: Auto-filled project codes on New Project

**Status:** Specified 2026-09-03, awaiting David. Not implemented.
**Trigger:** Pressing **New Project** should pre-fill the next code. Today the whole folder
name — code *and* description — is typed by hand into one box.

---

## 1 · Current behaviour (every claim carries file:line)

### 1.1 The form is ONE free-text field, not two

- `client/src/components/ProjectsPanel.tsx:515` — a single state var `newProjectCode`
  holds the **entire folder name** (code + description together).
- `ProjectsPanel.tsx:958-989` — the form is one `<input>` (`:963`), a Create button
  (`:970-976`), a Cancel button, and a hint `"Use kebab-case (e.g., b73-my-new-video)"`
  (`:987`). The `onChange` does one transform: `.toLowerCase()` (`:964`). Nothing else is
  normalised — a space, an apostrophe or an accent is passed through to the API verbatim
  and fails validation there.
- Placeholder text `"b73-project-name"` (`:966`) is the **only** hint of the series scheme.
- `ProjectsPanel.tsx:994` — the collapsed affordance, `+ Add new project...`.

**Verdict: one field. There is no separate project-code field today.**

### 1.2 There is NO "next code" computation anywhere

Searched `client/src`, `server/src`, `shared` for `nextCode` / `suggestCode` /
`highestCode` / `nextProject` — **zero hits**. The code is 100% typed by hand.
`ProjectsPanel.tsx:48` defines `PROJECT_CODE_PATTERN = /^[a-zA-Z]\d{2}(-|$)/`, but it is
used in exactly one place — `:626`, splitting the *display* list into valid rows vs an
"Issues" section. It never touches creation.

### 1.3 The create path, end to end

| Step | Location |
|---|---|
| Submit handler | `ProjectsPanel.tsx:595-613` (`handleCreateProject`) |
| Mutation | `client/src/hooks/useProjectsApi.ts:22-34` (`useCreateProject`) → `POST /api/projects` `{ code }` |
| Transport | `client/src/hooks/useApi.ts:7-21` (`fetchApi`) — **throws** on any non-2xx, carrying the server's `error` string |
| Route | `server/src/routes/index.ts:349-401` |
| Grammar | `shared/naming.ts:47-51` (`NAMING_RULES.name`) |

### 1.4 Validation actually applied on create

- `server/src/routes/index.ts:355-358` — empty code → `400 "Project code is required"`.
- `server/src/routes/index.ts:359-365` — **pattern only**:
  `NAMING_RULES.name.pattern = /^[a-z0-9.]+(-[a-z0-9.]+)*$/` (`shared/naming.ts:48`).
  Lowercase kebab-case, periods allowed. **The letter+2-digit series is not enforced
  anywhere in code** — the route's own comment calls it a convention.
- `server/src/routes/index.ts:371-379` — folder exists → `409 "Project <code> already exists"`.
- `server/src/routes/index.ts:382` — `fs.ensureDir(<project>/recordings)`; that is the whole
  creation. No `.flihub-state.json`, no other subfolders.

### 1.5 The length limit: declared, not applied on this path

- `shared/naming.ts:49` — `NAMING_RULES.name.maxLength: 50`.
- `shared/naming.ts:110-121` — `validateName()` **does** enforce it (`:117`).
- `server/src/routes/index.ts:359` — the create route tests `pattern` and **never calls
  `validateName`**. A 60-character project name is accepted by the API today.
- Contrast: `sanitizeName()` silently `.slice(0, 50)`s recording *names*
  (`shared/naming.ts:327-335`, clamp at `:334`).

**So: today it is neither a block nor a warning on this path — it is nothing.**
Matches archaeology finding #8 (`docs/rebuild-2026/requirements-archaeology-2026-09.md`),
marked **DEFECT** in both directions. Do not re-litigate.

**Origin of `50`: `unknown`.** `git log -S "maxLength: 50" -- shared/naming.ts` returns a
single commit — `da12b86 Initial commit`. No rationale is recorded in any doc or comment.
No filesystem limit motivates it (macOS/APFS allows 255 bytes per component).

**Disk evidence that 50 is not a real ceiling:** of 97 conforming project folders under
`v-appydave` (live + `archived/**`), **2 already exceed 50 characters** —
`a05-ad-chatgpt-for-converting-code-styles-factory-data-example` (62) and
`a18-ac-take-my-awesome-script-cut-it-in-half-keep-it-awesome` (60). They are legitimate
projects. This is the evidence for warn-not-block.

### 1.6 Where the project list comes from at creation time

- The panel's list is `useProjects()` → `GET /api/projects/stats`
  (`useProjectsApi.ts:38-43`).
- `server/src/routes/projects.ts:101-137` — **live filesystem scan, no cache**:
  `fs.readdir(projectsRootDirectory, { withFileTypes: true })` (`:112`), filtered at
  `:114-120` to directories, excluding `.`-prefixed, `-`-prefixed (`-trash`, `-safe`) and
  the literal `archived`. Missing directory → `{ projects: [], error: 'Projects directory
  not found' }` (`:107-110`) — **HTTP 200 with an empty list**.
- Identical filter duplicated in `server/src/utils/projectResolver.ts:15-32`. The
  duplication is itself flagged as a drift risk (archaeology #3).
- Sort: `stats.sort((a, b) => a.code.localeCompare(b.code))` (`projects.ts:131`) — lexical
  on the **whole folder name**, for display only.

**Consequence, and it is load-bearing: the scan CANNOT see archived or moved projects.**
Verified on disk 2026-09-03:

| Where codes live | Visible to `/stats`? |
|---|---|
| `~/dev/video-projects/v-appydave/` — `d01-…`, `d02-…` | ✅ yes |
| `~/dev/video-projects/v-appydave/archived/{-01-25,a01-a49,a50-a99,b00-b49,b50-b99}/` — 92 projects | ❌ no (`archived` excluded, and they are nested one level deeper than the scan) |
| `/Volumes/T7/youtube-PUBLISHED/appydave/` — incl. `b59-n8n-digital-ocean`, `c36-archon-bmad` | ❌ no (different volume; **unreadable when T7 is unmounted**) |

The `b65…b99` and `c01…c37` series that `docs/architecture/project-codes.md` recorded as
*live* on 2026-09-02 are no longer in the live root. **A scan of the live root alone would
today compute the next code from `d02` — correct by luck, not by design.**

### 1.7 A second root complicates "first code"

`server/config.json:3` currently points `projectsRootDirectory` at
`/Users/davidcruwys/dev/video-projects/v-kybernesis`, which contains `phase-1` and
`README.md` — **zero conforming project codes**. The empty-root case is not hypothetical;
it is the live configuration as of writing. Roots are per-brand (`v-aitldr`, `v-voz`,
`v-supportsignal`, …), so the series is **per-root**, not global.

### 1.8 Refusal visibility — today's create path is already honest

`fetchApi` throws on non-2xx (`useApi.ts:15-18`), the throw is caught at
`ProjectsPanel.tsx:610-612` and toasted with the server's message. A 409 collision shows
*"Project X already exists"*. The success toast at `:604` fires only inside
`if (result.success && result.project)`.

**This is not a defect to fix — it is a property to preserve.** FR-162 adds an auto-fill
step that can itself decline (unreadable root, collision on a computed code); those new
failure modes must be surfaced with the same honesty. See §4.5.

---

## 2 · The scheme, and the rulings the code forces

**The scheme (from David):** `a00` → `a99`, then roll to `b00` → `b99`, and onward through
the alphabet. Projects get deleted, so the sequence has gaps. **Gaps are normal and permanent.**

### D1 — Next code = highest + 1, never the first gap ⭐

**Ruling: the next code is (highest code ever issued) + 1. Gaps are never filled. A deleted
code is never reissued.**

**Why this is stated first and in bold:** the obvious implementation — "find the lowest
unused code" — is wrong, and it is what a developer will write unless told not to. Existing
codes appear in filenames, docs, YouTube descriptions, S3 keys and the DAM manifest
(`v-appydave/projects.json`). Reissuing `b73` after the original `b73` was deleted creates
two different projects with one identity, and nothing in FliHub would detect it —
`resolveProjectCode` is a first-alphabetical `startsWith` match
(`projectResolver.ts:65-77`), so it would silently resolve to whichever sorts first.
Archaeology #4 already records that **codes are not unique — only full folder names are**
(marked DEFECT by consequence). Gap-filling would make that worse on purpose.

### D2 — A high-water mark is required; a scan alone is not sufficient

**Ruling: `next = max(scan_max, stored_high_water_mark) + 1`, persisted per root, and the
stored mark is never decreased.**

Reasoning — a pure scan violates D1 in three ways proven above:

1. **Deleting the highest project lowers the scan max.** Delete `d02` and a scan-only
   implementation reissues `d02`. D1 forbids exactly this.
2. **Archiving moves projects out of scan range** (§1.6): `archived/**` is excluded by name
   and nested a level deeper; `youtube-PUBLISHED` is on another volume.
3. **T7 can be unmounted.** A next-code that changes depending on whether a USB drive is
   plugged in is not a next-code.

The stored mark makes the calculation monotonic regardless. Storage: one string per root in
`server/config.json` (e.g. `projectCodeHighWater: { "<root path>": "d02" }`). Config is
where FliHub already keeps per-root state (stage overrides, priorities), so this matches the
existing shape — while noting archaeology #4's held recommendation to move keyed-by-code
state into per-project files. That held recommendation is about **per-project** state; a
high-water mark is **per-root** and belongs in config either way.

**Seeding:** on first run for a root, the mark is seeded from the widest scan available —
live root **plus** `archived/*/` (one extra level, local, always readable) **plus**
`publishedPath` **when it is reachable**. Unreachable sources are skipped, never guessed at.
The seed is written once; later runs take the max of the mark and the live scan.

### D3 — Ordering is letter-then-number, and the compare must be on the code only

**Ruling: parse each folder name to `(letter, number)` with `/^([a-z])(\d{2})-/` and order by
letter first, then numeric value. Never compare whole folder names.**

Verified: **no existing code does this.** The only ordering in the create-adjacent path is
`stats.sort((a, b) => a.code.localeCompare(b.code))` (`projects.ts:131`), which is lexical
on the entire folder name. It happens to order `a97` before `b03` correctly — with a fixed
2-digit zero-padded number, lexical and letter-then-number agree — but it is wrong as a
*max-finder* because the string continues past the code: `b03-aardvark` vs `b03-zebra`
sorts by description, and any non-conforming folder participates in the comparison.
Compare the parsed `(letter, number)` pair; ignore everything after the third character.

Corollary the implementation must respect: `b03 > a97` because `b > a`. Do not use a naive
`parseInt` on the digits alone.

### D4 — Rollover at `x99` → `(x+1)00`; `Z99` is out of scope

**Ruling: after `a99` the next code is `b00`; the pattern continues through the alphabet.
At `z99` there is no successor — this is explicitly OUT OF SCOPE and no handling is
required.**

Reasoning: `z99` is ~2,600 projects away. Reaching it would take decades at David's rate
(97 projects across the a–d series to date). Building exhaustion handling now is speculative
work on a case that will never fire. **However**, the calculation must not *silently* produce
garbage: if the highest code is `z99`, auto-fill returns no suggestion, leaves the code field
empty and unlocked, and shows *"Code series exhausted at z99 — enter a code manually."*
That is three lines of code and it obeys §4.5 (a refusal that looks like success is a
defect) rather than pre-filling `{00` or wrapping to `a00`.

### D5 — Non-conforming folders are ignored, not tolerated into the maximum

**Ruling: a folder is a candidate for the maximum only if it matches `/^([a-z])(\d{2})(-|$)/`.
Everything else is skipped silently — no error, no effect on the result.**

The live root legitimately contains non-projects: `catalog`, `docs`, `poem`, `tools`,
`README.md`, `projects.json`, `HANDOVER*.md` (observed in `v-appydave`, 2026-09-03), plus
`phase-1` in `v-kybernesis`. `docs/architecture/project-codes.md` additionally records
tolerated exceptions `x01-test` and `v38-ruflo-enhances-t3-code`.

⚠️ **Known consequence, ruled deliberately:** those exceptions *do* match the pattern, so if
either is present in a scanned root the computed next code becomes `x02` / `v39`, skipping
the whole c/d series. **Accepted.** The auto-fill is a suggestion in an overridable field
(§4.2), the wrong value is visible before the user presses Create, and hard-coding a
"real series" allowlist would be a second grammar — archaeology #5 records that FliHub
already has two disagreeing project-name grammars, marked DEFECT. Adding a third is worse
than a rare wrong pre-fill. Neither exception is present in the current roots (checked
2026-09-03).

### D6 — Empty root, unreadable root

| Condition | Behaviour |
|---|---|
| Root readable, **zero** conforming folders, no stored mark | Pre-fill **`a00`** and unlock the field (see note below) |
| Root **missing or unreadable** (`fs.pathExists` false, or readdir throws) | **No pre-fill.** Code field is empty, unlocked, and shows *"Could not read the projects directory — enter a code manually."* Create is still allowed; the server will fail honestly if the directory really is gone. **Never** silently fall back to `a00`, because "empty" and "unreadable" would then look identical — the exact ambiguity archaeology #9 names as a rebuild requirement. |

**⚠️ Decision made on David's behalf, flag for ruling.** `a00` follows the stated scheme
(`a00`→`a99`) and is consistent with D4's rollover (`a99`→`b00`). **But every series
actually observed on disk starts at `01`, not `00`:** lowest live codes are `a01`, `b01`,
`d01`, and `docs/architecture/project-codes.md` records specifically that *"the d-series
started at `d01`, not `d00`"*. `b00-b49` and `-01-25` are archive **bucket** names, not
projects. If David wants the first code of a fresh root to be `a01`, this is a one-word
change and the rest of the spec is unaffected. The empty-root case is live right now
(`v-kybernesis`, §1.7), so this will fire on the next brand root.

---

## 3 · Scope of the calculation — summary table

| Source | In the max? | Why |
|---|---|---|
| Live `projectsRootDirectory` | ✅ | The existing scan (`projects.ts:112-120`) |
| `<root>/archived/*/` (one level into each bucket) | ✅ | Local, always readable; holds 92 of 97 known codes |
| `publishedPath` (`config.json:138`) | ✅ **when reachable** | Holds `c36`, `b59`; skipped without error when T7 is unmounted |
| `holdingPath` | ❌ | Hold evacuates *subfolders*; the project folder stays in the live root (`storageTree.ts` HEAVY_SUBFOLDERS) — already counted |
| Stored high-water mark | ✅ | The floor, per D2 |
| Other brand roots (`v-aitldr`, `v-voz`, …) | ❌ | Series is per-root (§1.7) |
| `.`-prefixed, `-`-prefixed folders; files | ❌ | Existing exclusions (`projects.ts:114-120`) |

---

## 4 · The requirement

### 4.1 Pre-fill on open

Pressing **+ Add new project...** opens the form with the project code **already filled in**
with the computed next code. The only field the human is required to touch is the
description. Enter from the description field creates the project.

### 4.2 The code is its own field, read-only by default

- Two fields, visually distinct: a narrow **read-only** code field (monospace, muted /
  disabled styling) and the normal description input, which takes focus on open.
- **Override affordance: an explicit unlock.** A small lock/pencil control beside the code
  field. Clicking it makes the field editable and marks the code as manually set; a reset
  control restores the computed value. **It is not an always-editable box** — the whole
  point is that the code is normally not the human's problem, and an editable-looking field
  invites edits that are almost always wrong.
- Validation on a **manually entered** code:
  - Must match `/^[a-z]\d{2}$/`. Anything else → red field + *"Code must be a letter and two
    digits (e.g. d03)"*, Create disabled.
  - **May be lower than the computed next code** (backfilling a gap by hand is allowed —
    D1 governs the *automatic* value, not the human's deliberate choice) but shows an
    amber note: *"d01 is below the next code (d03) — this reuses a retired code."*
    Create is still allowed.
  - **Collision** — the resulting folder name already exists in the live root: red field,
    *"Project d02-foo already exists"*, **Create disabled**. This is the client-side mirror
    of the server's 409 (`index.ts:371-379`); the server check stays as the authority.
  - A manually entered code that is **higher** than the computed next code raises the stored
    high-water mark on successful creation (D2: the mark never decreases).

### 4.3 The description field converts free text

Accepts either canonical `lowercase-hyphenated` form or free text, and converts. Conversion
rules, stated concretely (`sanitizeName`, `shared/naming.ts:327-335`, is the closest existing
helper and gets three of these right — it does **not** handle accents and it clamps length,
which §4.4 forbids here; specify the rules, do not simply reuse it):

| Input | Rule | Example |
|---|---|---|
| Uppercase | lowercased | `Agent Workflow` → `agent-workflow` |
| Whitespace (spaces, tabs, newlines) | → single `-` | `a  b` → `a-b` |
| `&` | → `and` (before punctuation stripping, so it survives) | `Rise & Fall` → `rise-and-fall` |
| Accented / non-ASCII letters | Unicode NFD-decomposed, combining marks stripped | `Café Niño` → `cafe-nino` |
| Other punctuation (`'`, `"`, `!`, `?`, `,`, `:`, `(`, `)`, `/`, `_`, emoji, …) | removed | `Don't Panic!` → `dont-panic` |
| `.` (period) | **kept** — `NAMING_RULES.name.pattern` allows it (`naming.ts:48`) and real projects use it (`b70-ito.ai…`) | `ito.ai review` → `ito.ai-review` |
| Digits | kept | `Top 10` → `top-10` |
| Repeated separators | collapsed to one `-` | `a -- b` → `a-b` |
| Leading / trailing separators | trimmed | `-a-b-` → `a-b` |
| Length | **not truncated here** — see §4.4 | |

⚠️ **Note for implementation:** `archiveInventory.ts`'s `isValidProjectDirName`
(`/^[a-z0-9][a-z0-9-]+$/i`) rejects periods, so a dotted name is invisible to the archive
scanner. That is archaeology finding #5, marked **DEFECT**, with "dot-grammar
reconciliation" already in the held-recommendations queue. FR-162 follows the **create**
grammar (dots allowed) and does not resolve the conflict.

**When conversion is shown: LIVE, as the user types.** The point of splitting the fields is
a live preview of the final folder name — `d03-agent-workflow` — rendered under the two
inputs in the same monospace as the code field. The user sees the exact folder that will be
created before pressing Create; that is what makes the read-only code field safe. The
description input itself keeps what the user typed (so backspacing mid-word is not fought);
the preview shows the converted form. On submit, the previewed string is what is sent.

**Empty description:** Create disabled, preview shows the code alone in muted text with
*"Add a description"*. Do not create a bare `d03` folder — every project on disk has a
description segment.

### 4.4 Length is a warning, not a block

- Limit: **50** — `NAMING_RULES.name.maxLength` (`shared/naming.ts:49`).
- **Origin: `unknown`** (§1.5). Present in the initial commit, no recorded rationale, no
  filesystem constraint behind it. Recorded as `unknown` rather than given an invented
  justification. If David wants a different number, it is one constant.
- Behaviour: a live character count against the limit sits beside the preview
  (`43 / 50`). At or over the limit the count and the preview turn red and a warning reads
  *"Name is 57 characters — over the 50-character guideline. It will still be created."*
- **Creation proceeds.** Two existing projects already exceed 50 (§1.5) and are fine.
- The count measures the **full folder name** (`d03-…`), matching what the server validates.
- **The server must not start enforcing it.** `validateName` (`naming.ts:110-121`) blocks
  over-length; the create route deliberately does not call it (`index.ts:359`). Wiring it in
  would turn this warning into a block. Leave the route testing `pattern` only.
- **Never silently truncate.** `sanitizeName` clamps at 50 (`naming.ts:334`) — that
  behaviour produced the mangled `d01` chapter-03 filename (archaeology #8). The
  description-conversion in §4.3 must not carry the clamp.

### 4.5 Refusals must be visible — applied to this flow

Per `CLAUDE.md` → Operating Rules: *a refusal that looks like success is a defect.*
Every path where FR-162 declines or no-ops:

| Situation | Response must say | UI must show | Toast |
|---|---|---|---|
| Auto-fill cannot read the root | which — missing vs unreadable, distinctly | empty **unlocked** code field + reason inline (D6) | none on open |
| Auto-fill finds no conforming codes (root genuinely empty) | that it is empty, not that it failed | `a00` pre-filled + *"first project in this root"* | none |
| Series exhausted at `z99` | exhaustion, explicitly | empty unlocked field + *"Code series exhausted at z99"* | none |
| Collision on Create (server 409, `index.ts:371-379`) | the existing folder name | red code field | **error** — *"Project d02-foo already exists"*. Never a success toast. |
| Manual code fails format | which rule failed | red field, Create disabled | none (inline is enough) |
| `fs.ensureDir` fails — unwritable directory, full disk (`index.ts:382`, caught `:393-399`) | the real error string | — | **error** carrying the server message |
| Create succeeds | — | form closes, project selected | success — *"Created project: d03-foo"* (existing `ProjectsPanel.tsx:604`) |

The existing throw-and-toast chain (`useApi.ts:15-18` → `ProjectsPanel.tsx:610-612`) already
satisfies the bottom half of this table. **The requirement is to preserve it, not rebuild
it** — in particular, do not "improve" the mutation by swallowing the throw into a
`{ success: false }` return that a caller might not check.

---

## 5 · Acceptance criteria (observable UI behaviour)

Given `projectsRootDirectory` contains `d01-kybernesis-12-videos` and `d02-cutty-audio-cleanup`:

1. Click **+ Add new project...** → the form opens with the code field showing **`d03`**,
   read-only and visually muted; the cursor is in the description field.
2. Type `Agent Workflow Builder` → the preview under the fields reads
   **`d03-agent-workflow-builder`** and updates on every keystroke; the counter reads
   `28 / 50` in normal colour.
3. Type `Don't Panic — Café #2!` → the preview reads **`d03-dont-panic-cafe-2`**.
4. Type a description making the full name 57 characters → the counter reads `57 / 50` in
   red, a warning appears saying it will still be created, and **Create remains enabled**.
   Pressing Create makes the folder; the success toast names the full 57-character folder.
5. Press **Create** with the description empty → Create is disabled; nothing is sent.
6. Click the lock beside the code field → the field becomes editable. Type `d99` → accepted,
   preview updates to `d99-…`. Type `dd3` → red field, *"Code must be a letter and two
   digits"*, Create disabled. Click reset → the field returns to `d03` and re-locks.
7. Unlock and type `d02`, description `cutty-audio-cleanup` → red field,
   *"Project d02-cutty-audio-cleanup already exists"*, Create disabled. Forcing the request
   returns 409 and shows an **error** toast, never a success toast.
8. Unlock and type `d01` with a new description → amber note *"d01 is below the next code
   (d03) — this reuses a retired code."*; Create is **enabled**.
9. Delete `d02-cutty-audio-cleanup` (FR-152) and reopen the form → the code is still
   **`d03`**, not `d02`. *(This is D1+D2 and it is the criterion most likely to fail.)*
10. Rename the live root to a directory holding only `README.md` → the form opens with
    **`a00`**, unlocked, noting it is the first project in this root.
11. Point the root at a path that does not exist → the form opens with an **empty, unlocked**
    code field and *"Could not read the projects directory"* — **not** `a00`.
12. With `a97-…` and `b03-…` both present, the next code is **`b04`**, not `a98`.
13. With `a99-…` the highest, the next code is **`b00`**.
14. A root containing `catalog`, `docs`, `poem`, `tools`, `phase-1` and `d02-x` yields
    **`d03`**; none of the non-conforming folders produce an error or affect the result.

---

## 6 · Out of scope

- **Renaming existing projects.** No rename exists in FliHub
  (`docs/architecture/project-codes.md` — no route, no client path). FR-162 does not add one.
  If rename is ever built, it must mirror the Teletubby semantics already defined there.
- **Backfilling or repairing codes for existing folders.** The `x01-test` / `v38-…`
  exceptions, the 2 over-length names, and the `archived/**` buckets stay exactly as they are.
- **`z99` exhaustion handling** beyond the "decline visibly" behaviour in D4. No wrap, no
  two-letter series, no migration.
- **The dot-grammar conflict** between `NAMING_RULES.name.pattern` and
  `archiveInventory.ts`'s `isValidProjectDirName` (archaeology #5) — already queued as
  "dot-grammar reconciliation".
- **Making codes globally unique** across roots (archaeology #4). The high-water mark is
  per-root and does not address code bleed between brands.
- **Moving stage/priority state out of global config** (archaeology #4's held
  recommendation). FR-162 adds one per-root key to config and takes no position on that.
- **Creating anything beyond `recordings/`** at project creation. Unchanged from
  `index.ts:382`.

---

## 7 · Open for David

1. **First code of an empty root: `a00` or `a01`?** Specified as `a00` per the stated
   scheme; every observed series on disk starts at `01`. Fires on the next brand root —
   `v-kybernesis` is empty of codes today (§1.7, D6).
2. **The 50-character limit — keep 50, or set a real number?** Its origin is `unknown`;
   two legitimate projects already exceed it. Warn-not-block works at any value.
