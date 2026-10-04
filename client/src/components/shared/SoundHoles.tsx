// Sound holes (D01 editing pass, item 5, 2026-10-04): stretches where a take's audio drops to digital
// zero mid-speech and chops words (likely the Krisp virtual mic in Ecamm). David wants to see this per
// take BEFORE editing. Report only — FliHub never touches the audio.
import type { SoundHoleCheck } from '../../../../shared/types';

const fmt = (s: number) => s.toFixed(2);

/** "12.30–12.97 s (0.67 s, −100 dB, chops a word end)" — one line per hole, for the tooltip. */
export function describeSoundHoles(check: SoundHoleCheck): string {
  if (check.status !== 'holes') return check.message;
  const cuts = { 'word-end': 'chops a word end', 'word-start': 'chops a word start', both: 'inside a word' } as const;
  const lines = check.holes.map(
    (h) => `${fmt(h.start)}–${fmt(h.end)} s (${fmt(h.duration)} s, ${h.floorDb} dB, ${cuts[h.cuts]})`,
  );
  return `${check.message}\n\n${lines.join('\n')}`;
}

/**
 * Recordings row. Clean takes show nothing; an unchecked take says "checking" and an unreadable one
 * says so — neither may look like clean.
 */
export function SoundHoleChip({ check }: { check: SoundHoleCheck | undefined }) {
  if (!check) {
    return (
      <span
        data-testid="sound-holes-chip"
        data-status="pending"
        className="inline-flex items-center rounded bg-warm-subtle px-1.5 py-0.5 text-[11px] text-warm-muted"
        title="Checking this take's audio for sound holes…"
      >
        ♪ checking
      </span>
    );
  }
  if (check.status === 'ok') return null;
  if (check.status === 'unknown') {
    return (
      <span
        data-testid="sound-holes-chip"
        data-status="unknown"
        className="inline-flex items-center rounded bg-warm-subtle px-1.5 py-0.5 text-[11px] text-warm-muted"
        title={check.message}
      >
        ♪ not checked
      </span>
    );
  }
  const n = check.holes.length;
  return (
    <span
      data-testid="sound-holes-chip"
      data-status="holes"
      className="inline-flex items-center gap-1 rounded bg-fuchsia-100 px-1.5 py-0.5 text-[11px] font-semibold text-fuchsia-800"
      title={describeSoundHoles(check)}
    >
      🔇 {n} sound hole{n === 1 ? '' : 's'}
    </span>
  );
}
