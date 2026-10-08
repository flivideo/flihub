import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRecordings, useRename, useTrashFile } from '../hooks/useApi';
import { useSegmentOp } from '../hooks/useSegmentsApi';
import type { FileInfo, RenameRequest } from '../../../shared/types';
import type { NamingState } from '../App';
import { formatFileSize, formatDuration, formatRelativeTime } from '../utils/formatting';
import { buildPreviewFilename } from '../utils/naming';
import { describeLanding, landingOptions, parseLandsAs } from '../utils/segmentLanding';
import { IncomingVideoModal } from './IncomingVideoModal';
import { describeSoundHoles } from './shared/SoundHoles';

interface FileCardProps {
  file: FileInfo;
  namingState: NamingState;
  onRenamed: () => void;
  onDiscarded: () => void;
  takeRank?: 'best' | 'good' | null; // FR-8: Best take (green), good take (yellow), or neither
}

export function FileCard({ file, namingState, onRenamed, onDiscarded, takeRank }: FileCardProps) {
  const { chapter, sequence, name, tags, customTag } = namingState;

  const renameMutation = useRename();
  const trashMutation = useTrashFile();
  const segmentOp = useSegmentOp();

  // CT-0107 R1: "Lands as" — next (today's behaviour), replace NN-S or insert before NN-S. The server numbers.
  const { data: recordingsData } = useRecordings();
  const options = landingOptions(
    (recordingsData?.recordings ?? []).map((r) => r.filename),
    chapter,
    sequence
  );
  const [landing, setLanding] = useState('next');
  const landingValue = options.some((o) => o.value === landing) ? landing : 'next';
  const landsAs = parseLandsAs(landingValue);

  // FR-106: State for video preview modal
  const [showPreview, setShowPreview] = useState(false);

  // FR-46: Periodic refresh for relative time display
  const [, setTick] = useState(0);
  useEffect(() => {
    // Refresh every 10 seconds for recent files
    const interval = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRename = async () => {
    if (!chapter || !name) {
      toast.error('Chapter and name are required');
      return;
    }

    // Validate chapter format
    if (!/^\d{2}$/.test(chapter)) {
      toast.error('Chapter must be 2 digits (01-99)');
      return;
    }

    // Validate sequence if provided
    if (sequence && !/^\d+$/.test(sequence)) {
      toast.error('Sequence must be a number (1, 2, 3, ...)');
      return;
    }

    // FR-21: Include custom tag in the tags array for the API
    const allTags = customTag ? [...tags, customTag] : tags;

    if (landsAs.mode !== 'next') {
      const result = await segmentOp.mutateAsync(
        landsAs.mode === 'replace'
          ? {
              mode: 'replace',
              chapter,
              segment: landsAs.segment,
              source: file.path,
              name,
              tags: allTags,
            }
          : {
              mode: 'insert',
              chapter,
              before: landsAs.segment,
              source: file.path,
              name,
              tags: allTags,
            }
      );
      if (result.success) {
        toast.success(`Done: ${result.op?.summary ?? 'segment change landed'}`);
        setLanding('next');
        onRenamed();
      } else {
        // A refusal changes nothing; say which and why (FliHub: a refusal never looks like success).
        toast.error(
          result.refused ? `Not done — ${result.reason}` : result.reason || 'Segment change failed'
        );
      }
      return;
    }

    const request: RenameRequest = {
      originalPath: file.path,
      chapter,
      sequence: sequence || null,
      name,
      tags: allTags,
    };

    try {
      const result = await renameMutation.mutateAsync(request);
      if (result.success) {
        toast.success(`Renamed to: ${result.newPath.split('/').pop()}`);
        onRenamed();
      } else {
        toast.error(result.error || 'Rename failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rename failed');
    }
  };

  // FR-161: promote to b-roll — name only, no chapter; transcription does not fire
  const handleBroll = async () => {
    const name = namingState.name.trim();
    if (!name) {
      toast.error('Enter a name first (no chapter needed for b-roll)');
      return;
    }
    try {
      const result = await renameMutation.mutateAsync({
        originalPath: file.path,
        chapter: '',
        sequence: null,
        name,
        tags: [],
        destination: 'b-roll',
      } as RenameRequest);
      if (result.success) {
        toast.success(`Moved to b-roll: ${result.newPath.split('/').pop()}`);
        onRenamed();
      } else {
        toast.error(result.error || 'B-roll move failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'B-roll move failed');
    }
  };

  // FR-5: Discard moves to .trash/ directory
  const handleDiscard = async () => {
    try {
      const result = await trashMutation.mutateAsync(file.path);
      if (result.success) {
        toast.info('File moved to trash');
        onDiscarded();
      } else {
        toast.error(result.error || 'Failed to trash file');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to trash file');
    }
  };

  const isLoading = renameMutation.isPending || trashMutation.isPending || segmentOp.isPending;

  // FR-8: Dynamic styling based on take rank (best = green, good = yellow)
  const cardClasses =
    takeRank === 'best'
      ? 'bg-green-50 rounded-lg border-2 border-green-400 p-4 shadow-sm'
      : takeRank === 'good'
        ? 'bg-yellow-50 rounded-lg border-2 border-yellow-400 p-4 shadow-sm'
        : 'bg-surface rounded-lg border border-warm p-4 shadow-sm';

  const aspectMismatch = file.aspectCheck?.status === 'mismatch';
  const soundHoles = file.soundHoles?.status === 'holes' ? file.soundHoles : null;

  return (
    <div className={`${cardClasses} ${aspectMismatch ? 'ring-2 ring-red-500' : ''}`}>
      {aspectMismatch && (
        <p
          data-testid="filecard-aspect-warning"
          className="mb-2 rounded bg-red-100 px-2 py-1 text-sm font-semibold text-red-800"
        >
          ⚠ Wrong aspect — {file.aspectCheck!.message}
        </p>
      )}
      {soundHoles && (
        <p
          data-testid="filecard-sound-holes"
          className="mb-2 whitespace-pre-line rounded bg-fuchsia-100 px-2 py-1 text-sm font-semibold text-fuchsia-800"
          title={describeSoundHoles(soundHoles)}
        >
          🔇 {soundHoles.message}
        </p>
      )}
      {/* Original filename and metadata */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-warm-muted truncate" title={file.filename}>
            {file.filename}
          </p>
          <div className="flex items-center gap-2">
            {/* NFR-7: Duration badge */}
            <span className="text-xs text-warm-secondary font-mono">
              {formatDuration(file.duration)}
            </span>
            {/* FR-8: File size badge */}
            <span
              className={`text-xs px-2 py-0.5 rounded font-medium ${
                takeRank === 'best'
                  ? 'bg-green-200 text-green-800'
                  : takeRank === 'good'
                    ? 'bg-yellow-200 text-yellow-800'
                    : 'bg-surface-muted text-warm-secondary'
              }`}
            >
              {formatFileSize(file.size)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* FR-46: Relative time with full timestamp on hover */}
          <p className="text-xs text-warm-muted" title={new Date(file.timestamp).toLocaleString()}>
            {formatRelativeTime(file.timestamp)}
          </p>
          {takeRank === 'best' && (
            <span className="text-xs text-green-600 font-medium">★ Best take</span>
          )}
          {takeRank === 'good' && (
            <span className="text-xs text-yellow-600 font-medium">★ Good take</span>
          )}
        </div>
      </div>

      {/* Preview and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-warm-secondary">
          <label
            className="flex items-center gap-1"
            title="Where this take lands in the chapter (CT-0107)"
          >
            Lands as
            <select
              data-testid="filecard-lands-as"
              value={landingValue}
              onChange={(e) => setLanding(e.target.value)}
              disabled={isLoading}
              className="rounded border border-warm bg-surface px-1 py-0.5 text-sm"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <span data-testid="filecard-landing" className="font-mono text-blue-600">
            {describeLanding(
              landsAs,
              chapter,
              buildPreviewFilename(chapter, sequence, name, tags, customTag)
            )}
          </span>
        </div>

        <div className="flex gap-2">
          {/* FR-106: Preview button */}
          <button
            onClick={() => setShowPreview(true)}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm text-warm-secondary hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
            title="Preview video"
          >
            ▶
          </button>
          <button
            onClick={handleDiscard}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
          >
            {trashMutation.isPending ? 'Trashing...' : 'Discard'}
          </button>
          <button
            onClick={handleBroll}
            disabled={isLoading || !name}
            title="Move to b-roll/ — chapter-less; no transcription (FR-161)"
            className="px-3 py-1.5 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            B-roll
          </button>
          <button
            onClick={handleRename}
            disabled={isLoading || !chapter || !name}
            className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {renameMutation.isPending || segmentOp.isPending
              ? 'Renaming...'
              : landsAs.mode === 'replace'
                ? 'Replace'
                : landsAs.mode === 'insert'
                  ? 'Insert'
                  : 'Rename'}
          </button>
        </div>
      </div>

      {/* FR-106: Video preview modal */}
      {showPreview && <IncomingVideoModal file={file} onClose={() => setShowPreview(false)} />}
    </div>
  );
}
