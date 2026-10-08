// D07-UAT-1 (CT-0107 R5): the Recordings Delete button. A take that is the only one at its segment number is deleted
// through the guarded segment op (mode `delete`): later segments close up, the change is journalled, and
// "Undo segment change" reverts THIS delete. FR-156's plain trash stays only where there is nothing to close up —
// another take shares the number, or the name is not a segment name — and its dialog says so.
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { formatFileSize } from '../../utils/formatting';
import {
  usePreviewTrashRecordings,
  useTrashRecordings,
  type TrashPreviewItem,
} from '../../hooks/useRecordingsApi';
import {
  useSegmentOp,
  useSegmentPreview,
  useSegmentUndo,
  type SegmentOpPreview,
} from '../../hooks/useSegmentsApi';
import { ConfirmationModal } from './ConfirmationModal';
import { reportSegmentResult } from './SegmentControls';

type Pending =
  | {
      kind: 'segment';
      filename: string;
      chapter: string;
      segment: number;
      preview: SegmentOpPreview;
    }
  | { kind: 'trash'; items: TrashPreviewItem[]; shared: boolean };

/** `{ chapter, segment }` when the take is the only one at its number (so deleting it leaves a gap to close). */
export function closeUpTarget(
  filename: string,
  chapterFilenames: string[]
): { chapter: string; segment: number } | null {
  const m = /^(\d{2})-(\d+)-.+\.(mov|mp4)$/i.exec(filename);
  if (!m) return null;
  const prefix = `${m[1]}-${m[2]}-`;
  const atNumber = chapterFilenames.filter((f) => f.startsWith(prefix)).length;
  return atNumber === 1 ? { chapter: m[1], segment: Number(m[2]) } : null;
}

/**
 * The Delete flow: `requestDelete(filename, allFilenames)` asks the server what would happen, then `dialog` shows it
 * for confirmation. `allFilenames` is every recording in the project (safe and parked included).
 */
export function useRecordingDelete(): {
  requestDelete: (filename: string, allFilenames: string[]) => void;
  dialog: ReactNode;
} {
  const segmentPreview = useSegmentPreview();
  const segmentOp = useSegmentOp();
  const previewTrash = usePreviewTrashRecordings();
  const trashRecordings = useTrashRecordings();
  const [pending, setPending] = useState<Pending | null>(null);

  const requestDelete = async (filename: string, allFilenames: string[]) => {
    const target = closeUpTarget(filename, allFilenames);
    if (target) {
      const result = await segmentPreview.mutateAsync({ mode: 'delete', ...target });
      if (!result.success) {
        reportSegmentResult(result, '');
        return;
      }
      if (!result.preview) {
        toast.error('The server sent no preview, so nothing was deleted.');
        return;
      }
      setPending({ kind: 'segment', filename, ...target, preview: result.preview });
      return;
    }
    previewTrash.mutate([filename], {
      onSuccess: (data) => {
        if (!data.items || data.items.length === 0) {
          toast.error(data.errors?.[0] || 'Nothing found on disk to delete');
          return;
        }
        setPending({ kind: 'trash', items: data.items, shared: /^\d{2}-\d+-/.test(filename) });
      },
      onError: (err) => toast.error(err.message || 'Failed to inspect recording'),
    });
  };

  const confirmSegment = async (p: Extract<Pending, { kind: 'segment' }>) => {
    setPending(null);
    const result = await segmentOp.mutateAsync({
      mode: 'delete',
      chapter: p.chapter,
      segment: p.segment,
    });
    reportSegmentResult(
      result,
      p.preview.renamed.length > 0
        ? `Deleted ${p.filename}; ${p.preview.renamed.length} later segment${p.preview.renamed.length === 1 ? '' : 's'} moved up. Undo segment change puts it back.`
        : `Deleted ${p.filename}. Undo segment change puts it back.`
    );
  };

  const confirmTrash = (items: TrashPreviewItem[]) => {
    setPending(null);
    trashRecordings.mutate(
      items.map((i) => i.filename),
      {
        onSuccess: (data) => {
          if (data.success) {
            toast.success(
              `Moved ${data.artifactCount} file${data.artifactCount === 1 ? '' : 's'} to -trash`
            );
          } else {
            toast.error(data.errors?.[0] || data.error || 'Failed to delete');
          }
        },
        onError: (err) => toast.error(err.message || 'Failed to delete'),
      }
    );
  };

  let dialog: ReactNode = null;
  if (pending?.kind === 'segment') {
    const { chapter, segment, preview } = pending;
    const { trashed, renamed } = preview;
    dialog = (
      <ConfirmationModal
        title={`Delete ${chapter}-${segment} and close up?`}
        message={
          `${trashed.length} file${trashed.length === 1 ? '' : 's'} will be moved to -trash/ (the recording and everything keyed to it).` +
          (renamed.length > 0
            ? `\n\nThe later segment${renamed.length === 1 ? ' moves' : 's move'} up to close the gap:\n` +
              renamed.map((r) => `${r.from} → ${r.to}`).join('\n')
            : '\n\nIt is the last segment, so nothing is renumbered.')
        }
        filesLabel="Will be moved to -trash/:"
        files={trashed}
        maxFilesShown={8}
        warning="↶ Undo segment change puts the files back and the numbers as they were (it survives a restart)."
        variant="danger"
        confirmText="Delete and close up"
        onConfirm={() => confirmSegment(pending)}
        onCancel={() => setPending(null)}
      />
    );
  } else if (pending?.kind === 'trash') {
    const { items, shared } = pending;
    const artifacts = items.flatMap((i) => i.artifacts);
    const totalBytes = items.reduce((sum, i) => sum + i.totalBytes, 0);
    const extras = artifacts.filter((a) => a.kind !== 'recording').length;
    dialog = (
      <ConfirmationModal
        title={items.length === 1 ? 'Delete this recording?' : `Delete ${items.length} recordings?`}
        message={
          `${artifacts.length} file${artifacts.length === 1 ? '' : 's'} (${formatFileSize(totalBytes)}) will be moved to -trash/.` +
          (extras > 0
            ? `\n\nThat includes ${extras} linked file${extras === 1 ? '' : 's'} — the transcripts are deleted with the recording so nothing is orphaned.`
            : '') +
          (shared
            ? '\n\nAnother take shares this segment number, so nothing is renumbered.'
            : '\n\nThis is not a segment name, so nothing is renumbered.')
        }
        filesLabel="Will be moved to -trash/:"
        files={artifacts.map((a) => `${a.label} — ${a.filename}`)}
        maxFilesShown={8}
        warning={
          'These files leave the project immediately. They stay recoverable in -trash/ until you empty it from the Project drawer, which deletes them for good. Undo segment change does not bring this one back.' +
          (artifacts.some((a) => a.kind === 'transcript')
            ? '\nThis take has been transcribed — that transcript will need regenerating if you restore it.'
            : '')
        }
        variant="danger"
        confirmText="Move to -trash"
        onConfirm={() => confirmTrash(items)}
        onCancel={() => setPending(null)}
      />
    );
  }

  return { requestDelete, dialog };
}

/** CT-0107 R9: undo the last segment change, from the journal on disk. */
export function SegmentUndoButton() {
  const segmentUndo = useSegmentUndo();
  return (
    <button
      type="button"
      onClick={async () =>
        reportSegmentResult(await segmentUndo.mutateAsync({}), 'Undid the last segment change')
      }
      disabled={segmentUndo.isPending}
      title="Undo the last replace / insert / reorder / delete-and-close-up (kept on disk, survives a restart)"
      className="ml-auto text-warm-muted hover:text-blue-600 disabled:opacity-50"
    >
      ↶ Undo segment change
    </button>
  );
}
