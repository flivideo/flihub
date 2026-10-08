/**
 * CT-0107 R1: where an inbox take lands — the next segment (today's behaviour), in place of a segment, or in front of
 * one. The server owns all numbering; this only lists the choices and describes them.
 */

export type LandsAs =
  | { mode: 'next' }
  | { mode: 'replace'; segment: number }
  | { mode: 'insert'; segment: number };

export interface LandingOption {
  /** Stable value for a <select>: `next`, `replace:2`, `insert:2`. */
  value: string;
  label: string;
  landsAs: LandsAs;
}

/** The chapter's segment numbers on disk, ascending and unique, from recording filenames. */
export function segmentsInChapter(filenames: string[], chapter: string): number[] {
  const out = new Set<number>();
  for (const f of filenames) {
    const m = /^(\d{2})-(\d+)-/.exec(f);
    if (m && m[1] === chapter) out.add(Number(m[2]));
  }
  return [...out].sort((a, b) => a - b);
}

export function landingOptions(
  filenames: string[],
  chapter: string,
  nextSequence: string
): LandingOption[] {
  const segments = segmentsInChapter(filenames, chapter);
  return [
    { value: 'next', label: `next (${chapter}-${nextSequence || '?'})`, landsAs: { mode: 'next' } },
    ...segments.map((s) => ({
      value: `replace:${s}`,
      label: `replace ${chapter}-${s}`,
      landsAs: { mode: 'replace', segment: s } as LandsAs,
    })),
    ...segments.map((s) => ({
      value: `insert:${s}`,
      label: `insert before ${chapter}-${s}`,
      landsAs: { mode: 'insert', segment: s } as LandsAs,
    })),
  ];
}

export function parseLandsAs(value: string): LandsAs {
  const [mode, n] = value.split(':');
  const segment = Number(n);
  if ((mode === 'replace' || mode === 'insert') && Number.isInteger(segment) && segment > 0) {
    return { mode, segment };
  }
  return { mode: 'next' };
}

/** One line for the card: what will happen to the chapter. */
export function describeLanding(landsAs: LandsAs, chapter: string, preview: string): string {
  switch (landsAs.mode) {
    case 'next':
      return preview;
    case 'replace':
      return `${chapter}-${landsAs.segment} (the current ${chapter}-${landsAs.segment} goes to the trash)`;
    case 'insert':
      return `${chapter}-${landsAs.segment} (${chapter}-${landsAs.segment} onward move up one)`;
  }
}
