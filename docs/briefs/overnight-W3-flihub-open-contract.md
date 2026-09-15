# W3 — FliHub meets the open contract (launch args, `POST /api/context`, resolution via `@flivideo/core`)

**Purpose**: FliHub starts pointed at a brand and project from launch arguments, can be re-pointed while running
through one API call, resolves both through the shared library, and stops offering chapter previews. Roadmap W3.

**For Agents**:
- You are the W3 **builder**, session `flihub-w3`, model `claude-opus-5`, cwd `/Users/davidcruwys/dev/ad/flivideo/flihub`.
  The orchestrator (Swagger, `flistudio-orch`) reads your evidence and holds the gate.
- **FliHub is David's daily tool.** Nothing may break an existing project listing, recording flow, or route. The full
  suite (`npm test` = shared + client + server), `npm run typecheck` and `npm run lint` must stay green; no existing
  coverage threshold is lowered.
- David is asleep. Do not ask him. Decide from the documents; list decisions in your report.
- Written 2026-09-15 by Swagger from `flistudio/docs/runs/overnight-2026-09-15.md` §6 W3, roadmap §3 W3, open-contract §3–§5.

---

## 1 · Read first

1. `/Users/davidcruwys/dev/ad/flivideo/flistudio/docs/open-contract.md` — §2, **§3 + §3.1 (RULED: both doors, one
   contract test per door)**, §4 FliHub row (what exists today), §5.
2. `/Users/davidcruwys/dev/ad/flivideo/flistudio/docs/roadmap.md` — §3 row W3, §3.1 the gate, **§1.2e** (chapter previews
   deprecated), §1.2d (transcripts).
3. `/Users/davidcruwys/dev/ad/flivideo/flistudio/docs/specification.md` — §6.2 FliHub row, §11 #7, R31, A5.
4. `/Users/davidcruwys/dev/ad/flivideo/fli-core/README.md` — the library's real exports (`readBrands`,
   `resolveBrandRoot`, `listProjects`, `resolveProject`, `parseOpenArgs`, `OpenContext`, `OPEN_ENV`); `src/index.ts`
   for signatures. Install it as `"@flivideo/core": "github:flivideo/fli-core#v0.1.0"` (Swagger tags v0.1.0 before you
   start; if `npm install` says the tag is missing, stop and report `APPYNET: blocked`).
5. This repo: `start.sh` (human, overmind, ports 5100/5101), `scripts/app.sh` (agent entry, detached), `Procfile`,
   `server/src/routes/brands.ts` (`POST /api/brands/switch`), `server/src/routes/index.ts` (`POST /api/config`,
   `GET /api/config`), `server/src/routes/chapters.ts` (FR-58), `server/src/config/configManager.ts`,
   `server/vitest.config.ts` (thresholds), `docs/architecture/brand-project-model.md`.

## 2 · Build

### A · Door 2 — launch arguments and environment

- The **server** reads `--brand <key> --project <folder> [--video <NN-name>]` and `FLIVIDEO_BRAND` / `FLIVIDEO_PROJECT`
  / `FLIVIDEO_VIDEO` at startup through `parseOpenArgs` from `@flivideo/core` (argv wins). Resolution:
  `readBrands` → `resolveBrandRoot(brand, machine)` → `listProjects(root)` → `resolveProject(listing, project)`.
- Both present and resolved → the server starts with that brand active (`projectsRootDirectory` = the root, same
  effect as `POST /api/brands/switch`) and `activeProject` = the resolved folder. **Same code path as door 3** (C1):
  implement one `applyContext(ctx)` in the server and call it from startup and from the route.
- A required argument missing → start as today, on the picker (brand switcher / project list); `GET /api/context`
  reports `missing: ['project']`. **Never an error** (R25).
- Given but unresolvable or ambiguous → **refuse and say why** (C3): the server still starts on the picker, logs one
  clear line, and `GET /api/context` carries `{ refused: { reason, candidates? } }` so the UI can show it. Never fall
  back silently to the last project.
- `start.sh` and `scripts/app.sh start` accept the same flags and pass them to the server as `FLIVIDEO_*` env (overmind
  runs the Procfile, so env is the channel; put the export before `overmind start`). Keep both scripts' existing
  behaviour otherwise; do not merge them (the header in `app.sh` explains why).
- A project resolves **only by `fli.studio.json` membership** through the library. Most real FliHub projects have no
  `fli.studio.json` yet (adoption is FliStudio's job, W7). So: when `resolveProject` says `not-a-project` for a folder
  that exists in the brand root, **accept it as a plain folder** for FliHub's purposes (FliHub's own listing is by
  folder today) and report `context.membership: 'folder'` vs `'member'`. Document this in the README section.

### B · Door 3 — `POST /api/context` and `GET /api/context`

- `POST /api/context { brand, project, video? }` → runs the same `applyContext`; `200 { context }` with the resolved
  brand key, root, project folder, `projectId` (or `null` when not a member), `video?`; `400 { missing: [...] }` for a
  missing field; `404` unknown brand / project; `409 { candidates }` when ambiguous (R31). Emits the same socket events
  `brands/switch` and `config` emit today, so open UIs refresh (C4).
- `GET /api/context` → the current context (or `missing` / `refused` as above). `video` is carried, not validated
  beyond `parseVideoFolder`.
- Keep `POST /api/brands/switch` and `POST /api/config` working unchanged; they may delegate to the same helper.

### C · Chapter previews deprecated (§1.2e)

- Remove the UI affordance that offers stitching a chapter preview; the FR-58 route(s) that *create* previews answer
  `410 Gone` with a one-line message pointing at roadmap §1.2e. Reading/listing existing `recordings/-chapters/` folders
  stays (they are legacy; do not delete anything). Update or remove the tests that exercised creation.

### D · Transcripts folder (§1.2d) — only if cheap

Do this **only if** all three hold: one write site for transcript files; every read site can take both
`transcripts/` and `recording-transcripts/`; the full suite stays green with no new fixture rewrites. Then new
transcripts go to `transcripts/`, reads accept both. Otherwise **skip it** and say so under *Deferred* with the
file:line of what made it non-trivial. Never move existing files.

### E · Contract tests — one per door (open-contract §3.1)

In `server/src/test/openContract.test.ts` (fixture brand root in a temp dir with one `fli.studio.json` member and
one plain folder; `HOME` and the brands file injected — **never** the real `~/.config/appydave` or
`/Users/davidcruwys/dev/video-projects`):

1. **Launch args → context**: start the app's context from `['--brand','x','--project','a01-xmen']` → `GET /api/context` reports it.
2. **API → the same context**: `POST /api/context` with the same values → identical `GET /api/context` body (deep-equal to test 1).
3. **Missing → picker**: no args → `GET /api/context` has `missing: ['brand','project']` and the server is up (health 200).
4. **Refusal bites**: unknown brand → 404; two matching projects → 409 with candidates; `--project` on a brand with no
   such folder → `refused` and no silent fallback (assert `activeProject` unchanged).
5. **Env door**: `FLIVIDEO_BRAND`/`FLIVIDEO_PROJECT` alone set the context; argv overrides env.

Use supertest / an in-process app on an ephemeral port, the way the existing server tests do. Keep
`server/vitest.config.ts` thresholds as they are or higher.

## 3 · Hard rules

- **Do not run `start.sh` or `scripts/app.sh` during the build** — `start.sh` kills whatever is on 5100/5101, and
  that could be David's running FliHub. Check `lsof -nP -iTCP:5100 -sTCP:LISTEN` first and report what you saw. Verify
  the scripts by reading them and by a dry `bash -n`; the runtime check is Swagger's after the gate.
- Tests never touch the live estate or the real config. No migration, no renames, no deletes in any project.
- `@flivideo/core` only through the pinned tag; no `file:` path, no copied source.
- Do not lower any threshold. Do not change `brands.json`. No new runtime dependencies beyond `@flivideo/core`.
- Commit in small conventional commits to `main`; push after each green slice. Commit this brief first.

## 4 · Done — your final report (raw data)

1. `git log --oneline <start>..HEAD`.
2. Tails of `npm test` (all three workspaces, with the server coverage table), `npm run typecheck`, `npm run lint`.
3. The five contract-test names and their pass lines.
4. `curl`-style examples of `GET /api/context` output in the three states (from the tests' captured bodies is fine).
5. **Deferred** (transcripts folder if skipped, with reason), **Decisions**, **anything this brief got wrong**.
6. One line: `APPYNET: done — <doors landed, tests, coverage>` or `APPYNET: blocked — <why>`.
