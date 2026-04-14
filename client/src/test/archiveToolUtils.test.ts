import { describe, it, expect } from 'vitest';
import type { ArchiveRow } from '../../../shared/types';
import {
  actionsForState,
  countArchiveFilters,
  filterArchiveRows,
  matchesArchiveFilter,
  sumHeldBytes,
  sumReclaimableLocalBytes,
} from '../components/shared/archiveToolUtils';

function row(overrides: Partial<ArchiveRow>): ArchiveRow {
  return {
    projectCode: 'proj',
    projectPath: '/tmp/proj',
    localBytes: 0,
    heldBytes: 0,
    held: false,
    state: 'local',
    lastTouched: null,
    ...overrides,
  };
}

const localOnly = row({
  projectCode: 'alpha',
  localBytes: 1000,
  heldBytes: 0,
  held: false,
  state: 'local',
});
const heldLocal = row({
  projectCode: 'bravo',
  localBytes: 2000,
  heldBytes: 2000,
  held: true,
  state: 'held-local',
});
const heldOnly = row({
  projectCode: 'charlie',
  localBytes: 0,
  heldBytes: 5000,
  held: true,
  state: 'held-only',
});

describe('archiveToolUtils — filter logic', () => {
  const rows = [localOnly, heldLocal, heldOnly];

  it('matchesArchiveFilter("all") returns true for every row', () => {
    rows.forEach((r) => expect(matchesArchiveFilter(r, 'all')).toBe(true));
  });

  it('filter "local" keeps only !held && localBytes > 0', () => {
    expect(filterArchiveRows(rows, 'local').map((r) => r.projectCode)).toEqual(['alpha']);
  });

  it('filter "held" keeps any held row', () => {
    expect(filterArchiveRows(rows, 'held').map((r) => r.projectCode)).toEqual([
      'bravo',
      'charlie',
    ]);
  });

  it('filter "reclaimable" keeps held && localBytes > 0 (held-local only)', () => {
    expect(filterArchiveRows(rows, 'reclaimable').map((r) => r.projectCode)).toEqual(['bravo']);
  });

  it('counts each filter correctly', () => {
    expect(countArchiveFilters(rows)).toEqual({
      all: 3,
      local: 1,
      held: 2,
      reclaimable: 1,
    });
  });

  it('sumHeldBytes sums heldBytes across held rows', () => {
    expect(sumHeldBytes(rows)).toBe(7000);
  });

  it('sumReclaimableLocalBytes sums localBytes on held-local rows only', () => {
    expect(sumReclaimableLocalBytes(rows)).toBe(2000);
  });
});

describe('archiveToolUtils — degraded rows always visible', () => {
  const degraded = row({
    projectCode: 'delta',
    localBytes: 0,
    heldBytes: 0,
    held: false,
    state: 'local',
    degraded: true,
    error: 'stat failed',
  });

  it('matchesArchiveFilter returns true for degraded rows regardless of filter', () => {
    (['all', 'local', 'held', 'reclaimable'] as const).forEach((f) => {
      expect(matchesArchiveFilter(degraded, f)).toBe(true);
    });
  });

  it('degraded rows appear in every filter tab', () => {
    const rows = [localOnly, heldLocal, heldOnly, degraded];
    (['all', 'local', 'held', 'reclaimable'] as const).forEach((f) => {
      expect(filterArchiveRows(rows, f).map((r) => r.projectCode)).toContain('delta');
    });
  });
});

describe('archiveToolUtils — state→actions mapping', () => {
  it('local state exposes Offload + Delete local', () => {
    expect(actionsForState('local')).toEqual(['offload', 'delete-local']);
  });

  it('held-local state exposes red Delete local + Clear T7', () => {
    expect(actionsForState('held-local')).toEqual(['delete-local-primary', 'clear-t7']);
  });

  it('held-only state exposes Restore + Delete everything', () => {
    expect(actionsForState('held-only')).toEqual(['restore', 'delete-everything']);
  });
});
