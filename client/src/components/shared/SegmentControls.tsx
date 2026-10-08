// CT-0107: per-segment controls on a recording row — R7 placeholder flag, R4 move up / down.
import { toast } from 'sonner';
import type { RecordingFile } from '../../../../shared/types';
import {
  useSegmentOp,
  useSegmentPlaceholder,
  type SegmentOpResult,
} from '../../hooks/useSegmentsApi';

interface SegmentControlsProps {
  recording: RecordingFile;
  /** Every segment number in this recording's chapter on disk (not just the ones shown), ascending. */
  chapterSegments: number[];
}

/** A refusal says which and why; FliHub never lets a refusal look like success. */
export function reportSegmentResult(result: SegmentOpResult, done: string): void {
  if (result.success) toast.success(done);
  else
    toast.error(
      result.refused ? `Not done — ${result.reason}` : result.reason || 'Segment change failed'
    );
}

export function SegmentControls({ recording, chapterSegments }: SegmentControlsProps) {
  const op = useSegmentOp();
  const placeholder = useSegmentPlaceholder();
  const segment = Number(recording.sequence);
  const busy = op.isPending || placeholder.isPending;
  const first = chapterSegments.length === 0 || segment <= chapterSegments[0];
  const last =
    chapterSegments.length === 0 || segment >= chapterSegments[chapterSegments.length - 1];

  const move = async (direction: 'up' | 'down') => {
    const result = await op.mutateAsync({
      mode: 'reorder',
      chapter: recording.chapter,
      segment,
      direction,
    });
    reportSegmentResult(result, result.op?.summary ?? `Moved ${recording.filename} ${direction}`);
  };
  const toggle = async () => {
    const next = !recording.isPlaceholder;
    const result = await placeholder.mutateAsync({
      filename: recording.filename,
      placeholder: next,
    });
    reportSegmentResult(
      result,
      next
        ? `${recording.filename} marked to re-record`
        : `${recording.filename} no longer to re-record`
    );
  };

  const button =
    'px-1 text-xs text-warm-muted hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed';
  return (
    <span
      className="inline-flex items-center gap-0.5"
      data-testid={`segment-controls-${recording.filename}`}
    >
      {recording.isPlaceholder ? (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          data-testid="placeholder-badge"
          title="Placeholder: to re-record. Replacing this segment clears it. Click to unmark."
          className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-200"
        >
          to re-record
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-label={`Mark ${recording.filename} to re-record`}
          title="Mark as a placeholder to re-record (the file name never changes)"
          className={button}
        >
          ⟲
        </button>
      )}
      <button
        type="button"
        onClick={() => move('up')}
        disabled={busy || first}
        aria-label={`Move ${recording.filename} up`}
        title="Move this segment up one (swaps with the one before; transcripts follow)"
        className={button}
      >
        ▲
      </button>
      <button
        type="button"
        onClick={() => move('down')}
        disabled={busy || last}
        aria-label={`Move ${recording.filename} down`}
        title="Move this segment down one (swaps with the one after; transcripts follow)"
        className={button}
      >
        ▼
      </button>
    </span>
  );
}
