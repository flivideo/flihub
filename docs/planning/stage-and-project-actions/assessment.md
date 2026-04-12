# Campaign Assessment — stage-and-project-actions

**Completed:** 2026-04-08  
**Profile:** Development  
**Tests:** 1018 passing → 1018 passing (net +12 new tests)  
**Delivery Review:** CONDITIONAL PASS → patches applied → **PASS**

---

## What Was Built

| Work Unit | FR | Outcome |
|-----------|-----|---------|
| stage-types | FR-149 | Shelved + Remix stages added, Rev removed from defaults |
| whisper-config | B036 | Whisper binary/model/language externalized to config.json |
| transcribe-all-slideout | FR-151 | Transcribe All button in project drawer Quick Actions |
| safe-delete | FR-152 | DELETE endpoint + ProjectDeleteModal + Danger Zone |

---

## Delivery Review Results

**6 dimensions run in parallel. Verdict before patches: CONDITIONAL PASS.**  
**4 bugs fixed from delivery review. Verdict after patches: PASS.**

### Bugs Fixed During Review

| Finding | Severity | Fix Applied |
|---------|----------|-------------|
| DVR-BH-001 | HIGH | `shelved` + `remix` added to `validStages` in PUT `/stage` handler — FR-149 was silently broken at the API layer |
| DVR-EC-001 | HIGH | Active-project guard added to DELETE endpoint — deleting the active project would have broken file watchers |
| DVR-EC-003 | HIGH | Drawer Escape handler gated on `!showDeleteModal` — Escape during confirmation no longer collapses the drawer |
| DVR-EC-004 | HIGH | Modal Escape handler gated on `!isLoading` — Escape during in-flight delete no longer closes modal |
| DVR-AA-001/BH-003 | MEDIUM | `diskBytes` prop wired from `ProjectDrawer.diskData.total` → `ProjectDeleteModal` — disk size now shown in confirmation |

---

## Deferred Items (Next Campaign Candidates)

These were flagged by delivery review but deferred — all are valid follow-ups:

| ID | Finding | Priority |
|----|---------|----------|
| DVR-AA-002 | T7 backup warning in delete modal — requires new data source | Medium |
| DVR-AA-003 | Pre-modal relay check (currently post-modal server error) | Low |
| DVR-AA-004 | Active transcription guard in DELETE endpoint | Low |
| DVR-BH-005 | `review` stage is a "ghost" — settable via API but invisible in UI | Low |
| DVR-BH-006 | Transcribe All uses active project config, not drawer's project path | Medium |
| DVR-UT-005 | `ProjectDeleteModal` has zero test coverage | Medium |
| DVR-UT-001/002 | Server: fs.remove 500-path + socket emit not tested | Low |
| DVR-EC-006 | Per-project cache not fully invalidated after delete | Low |
| DVR-CQ-002 | `projectName` regex duplicated (modal + drawer) — canonical util exists | Low |
| DVR-CQ-003 | Local `formatBytes` vs imported util — pre-existing TODO | Low |
| DVR-AR-001 | DELETE endpoint skips `resolveProjectCode` (UI always sends full code, so low real risk) | Low |

---

## What Worked Well

- **Wave A parallel execution** (stage-types + whisper-config) completed cleanly with zero conflicts
- **Wave B sequential** (transcribe-all then safe-delete both editing ProjectDrawer.tsx) was the right call — no merge pain
- **Test fixes in the same wave** — 6 stale test label failures from B065 rename found and fixed proactively
- **Whisper binary fix** restored b66 transcription (25/25 files) before the campaign started
- `holdUtils.test.ts` safety-chain coverage was praised as exemplary by the UT reviewer
- `HoldDeleteModal` pattern compliance in `ProjectDeleteModal` was strong (praised by AR reviewer)

## What Didn't Work Well

- **validStages whitelist** — the most critical miss. New stages were type-safe but API-blocked. This pattern (hardcoded validation list separate from the type system) is the root cause and should be derived from shared constants in a future cleanup.
- **diskLabel hardcoded** — shipping a destructive-action confirmation with a permanent `—` for a labeled disk-size field is a trust issue. Should have been caught before delivery review.
- **Missing active-project guard** — a safety gap on a destructive filesystem operation. The relay check was present but the active-project check was not.
- **ProjectDeleteModal test gap** — a new component for a destructive action shipped with zero tests. Next time: mirror `HoldDeleteModal`'s test structure on the same wave.

---

## Suggestions for Next Campaign

1. **Derive `validStages` from shared constants** — `DEFAULT_PROJECT_STAGES` in `shared/types.ts` should be the single source of truth, imported server-side rather than re-declared in the route handler
2. **Transcribe All project-path fix** (DVR-BH-006) — pass `projectPath` explicitly to `POST /api/transcriptions/queue-all` so queuing works for non-active projects
3. **ProjectDeleteModal tests** — high-value, low-effort: copy `HoldDeleteModal.test.tsx` structure
4. **T7 backup awareness** — FR-152 deferred AC: check for T7 holding copy existence and surface as warning in delete modal
