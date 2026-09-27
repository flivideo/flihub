import type { TranscriptHealth } from '../../../shared/types';

// B584: FliTools marks a transcript `suspect` when it is still bad after its one retry (loops,
// segments past the media end, …). The T badge must show that, never a plain green T.
export function transcriptBadge(health?: TranscriptHealth): { suspect: boolean; className: string; title: string; label: string } {
  if (health?.suspect) {
    return {
      suspect: true,
      label: 'T⚠',
      className:
        'text-xs text-red-700 hover:text-red-800 px-1.5 py-0.5 bg-red-50 hover:bg-red-100 rounded font-medium transition-colors',
      title: `Suspect transcript (FliTools already retried once): ${health.reasons.join('; ') || 'no reason given'} — click to view`,
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
