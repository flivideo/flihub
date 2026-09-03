# FR-162: Brand switcher — dropdown in the header

**Status:** ✓ Implemented (2026-09-03). Direction from David: select a brand from a dropdown,
whole UI refreshes to that brand's projects (tested tonight with AppyDave / Kybernesis /
Beauty & Joy).

## What shipped

- `GET /api/brands` + `POST /api/brands/switch {key}` (`server/src/routes/brands.ts`).
- Source: `~/.config/appydave/brands.json` (canonical; FliHub reads it now, never writes it)
  **merged with** unregistered on-disk `v-*` siblings of the current root, marked
  `source: 'disk'` and shown as *unregistered* in the menu.
- A switch sets `projectsRootDirectory`, clears `activeProject` (never dangle the old
  brand's project), and **moves the T7 paths with the root**: `publishedPath` =
  brands.json `ssd_backup` (else derived `/Volumes/T7/youtube-PUBLISHED/<key>`),
  `holdingPath` = derived `/Volumes/T7/youtube-HOLDING/<key>` (brands.json has no holding
  field yet — David's file to extend). This implements the derive-don't-gate answer to the
  T7 desync hazard for the switch path.
- Client: `BrandSwitcher` in the header (`FliHub › [brand ▾] › project`), full react-query
  invalidation on switch, jumps to the Projects tab. Server emits `projects:changed` +
  `recordings:changed` so other open windows refresh too.
- `kybernesis` added to brands.json (David's go, 2026-09-03).

## Known behaviour, not a defect of the switcher

A project whose folder fails `^[letter]\d\d-` (e.g. `v-kybernesis/phase-1`) is bucketed by
the Projects panel as *invalid naming* (FR-148 `PROJECT_CODE_PATTERN`) and does not appear in
the main table. Properly-coded projects (verified live with a disposable `a00-…`) list
instantly.

## Not built (awaiting David)

Project-code auto-suggestion on create (next `{letter}{NN}` per brand) — answerable, see the
2026-09-03 session; codes remain typed today.
