# Next Round Brief — B064 Hold UI Debug

**Written**: 2026-04-08 (end of session, near context limit)
**Status**: Campaign complete, but SSD Hold UI shows wrong state

---

## The Problem

SSD Hold section in ProjectDetailDrawer shows "SSD not available" when T7 IS connected.

## What We Know Works

The API is correct. This curl returns valid data:
```bash
curl http://localhost:5101/api/projects/c37-agent-team-claude-bbmad/hold/status
# → { "location": "local-only", "relayBlocked": true, "ssdMounted": true }
```

`ssdMounted: true` — the fix to `checkSsdMounted` (checking 2 levels up to `/Volumes/T7`) works.

## Suspected Root Cause

**The code validation regex is too strict.** In `server/src/routes/hold.ts`, all 6 handlers have:

```typescript
if (!code || /[/\\.]/.test(code)) {  // ← THE DOT IS THE PROBLEM
```

This rejects ANY project code containing a dot. Project codes like `b75-vibe-code-whisper-ai-opus-4.5` have dots and get a 400 response. When React Query gets a 400, `holdStatus.data` is undefined — the UI falls through to some unexpected state.

**Fix**: Remove the dot from the regex, only reject path separators and `..`:
```typescript
if (!code || /[/\\]/.test(code) || code.includes('..')) {
```

Apply this fix to ALL 6 route handlers in `server/src/routes/hold.ts`.

## Diagnosis Steps (run first to confirm)

```bash
# 1. Test a project code that has a dot in it
curl http://localhost:5101/api/projects/b75-vibe-code-whisper-ai-opus-4.5/hold/status
# If returns 400 "Invalid project code" → confirmed bug

# 2. Test a code without dots
curl http://localhost:5101/api/projects/c37-agent-team-claude-bbmad/hold/status
# Should return ssdMounted: true
```

## Files to Fix

- `server/src/routes/hold.ts` — all 6 route handlers, change regex (6 occurrences)
- `server/src/test/holdRoutes.test.ts` — update the path traversal test to use `..` not `.`

## After Fix

1. Run `npm run build -w server`
2. Restart server (`overmind restart server` or `./start.sh`)
3. Open drawer on a project with a dot in its code — should now show correct SSD Hold state

## Current Campaign State

- B064 is code-complete (8/8 work units)
- All patches from delivery review applied
- 1006 server tests pass
- This is a one-bug blocker from shipping
- Once fixed → commit everything → update BACKLOG.md → done

## BACKLOG Update Needed

Add B064 to Done table in `docs/planning/BACKLOG.md`:
```
| B064 | Archive Offload (archive-offload) — SSD hold/restore with T7, relay-block guard, 5-gate safety chain, HoldDeleteModal, drawer section, ProjectsPanel badge. 8/8 complete. +1006 server tests. | 2026-04-08 |
```
