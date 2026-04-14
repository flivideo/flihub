// WU2: Pure helpers for ArchiveTool — extracted so they can be unit-tested
// without rendering the whole component tree.

import type { ArchiveRow, ArchiveState } from '../../../../shared/types';

export type ArchiveFilter = 'all' | 'local' | 'held' | 'reclaimable';

/**
 * Filter predicates from IMPLEMENTATION_PLAN.md (Filter Model table):
 *   All         → no filter
 *   Local only  → !held && localBytes > 0
 *   On T7       → held
 *   Reclaimable → held && localBytes > 0
 */
export function matchesArchiveFilter(row: ArchiveRow, filter: ArchiveFilter): boolean {
  // Degraded rows surface in every tab so the user can always see — and act
  // on — broken state. Without this, a degraded row with 0 bytes could hide
  // outside the "all" tab and silently disappear from the UI.
  if (row.degraded) return true;
  switch (filter) {
    case 'all':
      return true;
    case 'local':
      return !row.held && row.localBytes > 0;
    case 'held':
      return row.held;
    case 'reclaimable':
      return row.held && row.localBytes > 0;
  }
}

export function filterArchiveRows(rows: ArchiveRow[], filter: ArchiveFilter): ArchiveRow[] {
  return rows.filter((r) => matchesArchiveFilter(r, filter));
}

export interface ArchiveFilterCounts {
  all: number;
  local: number;
  held: number;
  reclaimable: number;
}

export function countArchiveFilters(rows: ArchiveRow[]): ArchiveFilterCounts {
  return {
    all: rows.length,
    local: rows.filter((r) => matchesArchiveFilter(r, 'local')).length,
    held: rows.filter((r) => matchesArchiveFilter(r, 'held')).length,
    reclaimable: rows.filter((r) => matchesArchiveFilter(r, 'reclaimable')).length,
  };
}

// WU2: Action slot descriptors — the component maps these to buttons. Keeping
// the mapping pure makes it testable independent of toasts / modals / mutations.
export type ActionId =
  | 'offload'
  | 'delete-local'
  | 'delete-local-primary'
  | 'clear-t7'
  | 'restore'
  | 'delete-everything';

export function actionsForState(state: ArchiveState): ActionId[] {
  switch (state) {
    case 'local':
      return ['offload', 'delete-local'];
    case 'held-local':
      return ['delete-local-primary', 'clear-t7'];
    case 'held-only':
      return ['restore', 'delete-everything'];
  }
}

// WU2: Sum of localBytes from reclaimable rows (held-local state) — shown in
// the sticky footer as "Local reclaimable".
export function sumReclaimableLocalBytes(rows: ArchiveRow[]): number {
  return rows
    .filter((r) => r.state === 'held-local')
    .reduce((sum, r) => sum + r.localBytes, 0);
}

// WU2: Sum of heldBytes across every held row — footer "T7 used".
export function sumHeldBytes(rows: ArchiveRow[]): number {
  return rows.filter((r) => r.held).reduce((sum, r) => sum + r.heldBytes, 0);
}
