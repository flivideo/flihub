# FR-149: Stage System Changes — Shelved, Remix, Drop Rev

**Date:** 2026-04-08  
**Status:** Pending

---

## Background

The current stage dropdown has 9 options: Auto, Plan, REC, 1st, 2nd, Rev, Ready, Pub, Arch.

Two problems:
1. "Rev" (review) is rarely used and adds noise — most videos go straight from 2nd edit to Ready
2. There's no stage for videos that are permanently abandoned (never published) or being repurposed into new content

## Changes

### Remove "Rev" from default pipeline

Remove `review` / "Rev" from the default stage list. The pipeline becomes:

```
Auto → Plan → REC → 1st → 2nd → Ready → Pub → Arch
```

`review` can remain as a valid `ProjectStage` type value (so existing data isn't broken) but it should not appear in the dropdown by default.

### Add "Shelved" stage

For videos that are permanently abandoned — recorded but never going to be published in current form.

| Property | Value |
|----------|-------|
| Stage key | `shelved` |
| Display label | `Shelved` |
| Color | Muted red (`#9B2335` or similar desaturated red — conveys "stopped" without being alarming) |
| T7 folder | `youtube-FAILS` (existing folder, no rename needed) |
| Offload behaviour | Same rsync flow as `hold` offload, but targeting `youtube-FAILS` instead of `youtube-HOLDING` |

**Use case:** B59 n8n-digital-ocean — video that died before publishing. Needs to leave local disk and go to T7, but is NOT a published archive.

**Note:** Setting a project to `shelved` does NOT automatically offload it. The stage change is manual, the offload is a separate action (same pattern as the existing hold/offload flow).

### Add "Remix" stage

For videos that are being deconstructed and rebuilt into new content (e.g. combined into a long-form compilation video).

| Property | Value |
|----------|-------|
| Stage key | `remix` |
| Display label | `Remix` |
| Color | Warm rose/coral (`#E8547A` or similar — distinct from all current pipeline colors, conveys transformation) |
| Offload behaviour | None — stage change only. Disk management handled separately when ready. |

**Use case:** B68 and B69 — good standalone videos being combined into a multi-hour long-form release.

---

## Updated Stage Order in Dropdown

```
Auto, Plan, REC, 1st, 2nd, Ready, Pub, Arch, Shelved, Remix
```

Shelved and Remix appear at the bottom, visually separated from the main pipeline (can use a divider or subtle grouping).

---

## Files to Change

| File | Change |
|------|--------|
| `shared/types.ts` | Add `'shelved'` and `'remix'` to `ProjectStage` union. Remove `'review'` from `DEFAULT_PROJECT_STAGES` array (keep in type). |
| `shared/types.ts` | Add entries for `shelved` and `remix` in `STAGE_LABELS`, `STAGE_COLORS` (or equivalent constants). Remove `review` entry from color/label maps if present. |
| `client/src/components/ProjectsPanel.tsx` (or wherever stage dropdown renders) | Ensure new stages appear. Add visual separator before Shelved/Remix. |

---

## Acceptance Criteria

- [ ] Stage dropdown shows: Auto, Plan, REC, 1st, 2nd, Ready, Pub, Arch, Shelved, Remix
- [ ] "Rev" no longer appears in dropdown
- [ ] Projects previously set to "Rev" still display correctly (graceful fallback)
- [ ] Shelved pill renders in muted red
- [ ] Remix pill renders in rose/coral, visually distinct from all other stages
- [ ] Stage filter pills on Projects page include Shelved and Remix
- [ ] B59 can be set to Shelved; B68/B69 can be set to Remix
