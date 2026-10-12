import type { TranscriptHealth, TranscriptionStatusResponse } from '../../../shared/types';

const secs = (x: number) => `${Math.round(x * 10) / 10}`;

/** The plain note for a chunk-overlap repair FliTools already made (not a fault; kept visible). */
export function repairNote(health?: TranscriptHealth): string | null {
  const r = health?.overlapRepaired ?? [];
  if (!r.length) return null;
  return r
    .map((o) => `repaired automatically: transcriber duplicated ${secs(o.start)}–${secs(o.end)}s; the ${o.words} repeated word${o.words === 1 ? '' : 's'} were dropped`)
    .join('; ');
}

// B584: FliTools marks a transcript `suspect` when it is still bad after its one retry (loops,
// segments past the media end, words that go back in time …). The T badge must show that, never a plain green T.
export function transcriptBadge(health?: TranscriptHealth): { suspect: boolean; className: string; title: string; label: string } {
  if (health?.suspect) {
    const repaired = repairNote(health);
    return {
      suspect: true,
      label: 'T⚠',
      className:
        'text-xs text-red-700 hover:text-red-800 px-1.5 py-0.5 bg-red-50 hover:bg-red-100 rounded font-medium transition-colors',
      title: `Suspect transcript: ${health.reasons.join('; ') || 'no reason given'}${repaired ? ` (${repaired})` : ''} — click to view; ↻ redoes it`,
    };
  }
  const repaired = repairNote(health);
  if (repaired) {
    return {
      suspect: false,
      label: 'T⚠',
      className:
        'text-xs text-amber-700 hover:text-amber-800 px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 rounded font-medium transition-colors',
      title: `Transcript OK, ${repaired}. If the cut there looks wrong, check it — click to view`,
    };
  }
  return {
    suspect: false,
    label: 'T',
    className:
      'text-xs text-green-700 hover:text-green-800 px-1.5 py-0.5 bg-green-50 hover:bg-green-100 rounded font-medium transition-colors',
    title: 'View transcript',
  };
}

/** What the transcript on disk is, in words, for the redo control's tooltip and toasts. */
export function transcriptQuality(s?: Pick<TranscriptionStatusResponse, 'pass' | 'engine' | 'pass2Pending'>): string {
  if (!s?.pass) return 'transcript';
  if (s.pass === 2) return `high-quality transcript (pass 2${s.engine ? `, ${s.engine}` : ''})`;
  return s.pass2Pending ? 'fast transcript (pass 1) — high-quality pass still running' : `fast transcript (pass 1${s.engine ? `, ${s.engine}` : ''})`;
}

/** True when a high-quality pass has just landed: it was pending, and now pass 2 is on disk with nothing pending. */
export function highQualityLanded(
  before?: Pick<TranscriptionStatusResponse, 'pass' | 'pass2Pending' | 'status'>,
  after?: Pick<TranscriptionStatusResponse, 'pass' | 'pass2Pending' | 'status'>
): boolean {
  if (!before || !after) return false;
  const wasWaiting = before.pass2Pending === true || before.status === 'queued' || before.status === 'transcribing';
  return wasWaiting && after.status === 'complete' && after.pass === 2 && !after.pass2Pending;
}
