# W3 review — FliHub open contract (launch args, `POST /api/context`, library resolution, chapter previews)

**Purpose**: The independent review pass roadmap §3.1 requires before the W3 gate. You review; you fix nothing.

**For Agents**:
- You are the W3 **reviewer**, session `flihub-w3-review`, model `claude-opus-5`, cwd `/Users/davidcruwys/dev/ad/flivideo/flihub`.
  The builder (`flihub-w3`) is a separate session; the orchestrator (Swagger, `flistudio-orch`) routes the fixes.
- **Edit nothing except your findings file. Do not commit. Do not start the app** (`start.sh` kills ports 5100/5101).
- David is asleep; do not ask him. FliHub is his daily tool: a regression in an existing route or listing is BLOCKING.

## 1 · Inputs

- Builder brief `docs/briefs/overnight-W3-flihub-open-contract.md` (binding rulings), the builder's commits
  (`git log --oneline <brief commit>..HEAD`, diff them), and the contract:
  `/Users/davidcruwys/dev/ad/flivideo/flistudio/docs/open-contract.md` §3, §3.1, §4, §5 (C1–C4);
  `roadmap.md` §1.2d, §1.2e, §3 W3, §3.1; `specification.md` §6.2, §10, §11 #7, R25, R31;
  `/Users/davidcruwys/dev/ad/flivideo/fli-core/README.md` (the library's real surface at `v0.1.0`).

## 2 · Method (`agent-skills:code-review-and-quality`)

1. **C1 one path**: startup (door 2) and `POST /api/context` (door 3) call the same helper; show the call sites.
2. **Door 2**: `parseOpenArgs`/`resolveOpenContext` from `@flivideo/core` (pinned `github:flivideo/fli-core#v0.1.0`
   in `package.json`, no `file:`); argv over env; `start.sh` and `scripts/app.sh` pass the flags as `FLIVIDEO_*` env
   (read both scripts; `bash -n` them); missing → picker state, **never** an error; unresolvable → `refused` with a
   reason, and **no silent fallback** to the previous project (C3) — find the test that proves it.
3. **Door 3**: 200/400/404/409 shapes as the brief states; socket events emitted so open UIs refresh (C4);
   `POST /api/brands/switch` and `POST /api/config` unchanged in behaviour.
4. **Chapter previews**: the creating route answers 410, the UI affordance is gone, reading `recordings/-chapters/`
   still works, nothing deleted.
5. **Transcripts** (if done): one write site, all read sites accept both names; if skipped, the deferral names the
   non-trivial file:line.
6. **Contract tests**: five present (`server/src/test/openContract.test.ts` or equivalent), each real; fixtures in temp
   dirs; **no test reads `/Users/davidcruwys/dev/video-projects` or the real `~/.config/appydave`** — grep for both.
   `server/vitest.config.ts` thresholds not lowered (diff it).
7. **Regression sweep**: `npm test` (all three workspaces), `npm run typecheck`, `npm run lint` — run them yourself and
   paste tails. Read the diff of every touched existing file for behaviour changes outside the brief.
8. Architecture: zod for the new API shapes; no deep imports past `@flivideo/core`'s public surface.

## 3 · Output

`/Users/davidcruwys/dev/ad/flivideo/flihub/docs/reviews/overnight-W3.md`, same shape as fli-core's
`docs/reviews/overnight-W1.md` (verdict, findings with file:line + fix, conformance table per door, checks run,
what was not established). BLOCKING = a door that does not meet C1–C4, a refusal that does not bite, an isolation
escape, a regression in existing behaviour, or a lowered threshold. End: `APPYNET: done — <verdict, n blocking, m minor>`.
