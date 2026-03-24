/**
 * FR-131 Phase 2: Regeneration Toolbar
 *
 * Collapsible toolbar with 4 buttons to regenerate derivative files:
 * - Regen Shadows (fast ~1ms per file)
 * - Regen Transcripts (slow ~5-10 min per file, queued)
 * - Regen Chapters (expensive ~30-60s per chapter)
 * - Regen All (runs all three sequentially)
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getSocket } from '../../hooks/useSocket';
import { SelectionBadge } from './SelectionBadge';

export interface RegenProgress {
  type: 'shadows' | 'transcripts' | 'chapters' | 'all';
  current: number;
  total: number;
  currentItem?: string; // e.g., "Chapter 05"
  status: 'running' | 'complete' | 'error';
}

interface RegenToolbarProps {
  projectCode: string;
  selectedFiles: string[]; // FR-136: Array of selected filenames
  totalFiles: number; // FR-136: Total count for badge
  onRegenComplete?: (type: 'shadows' | 'transcripts' | 'chapters' | 'all') => void;
}

export function RegenToolbar({
  projectCode: _projectCode,
  selectedFiles,
  totalFiles,
  onRegenComplete,
}: RegenToolbarProps) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('flihub:regenToolbarOpen');
    return saved === null ? true : saved === 'true';
  });
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [progress, setProgress] = useState<RegenProgress | null>(null);

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem('flihub:regenToolbarOpen', String(isOpen));
  }, [isOpen]);

  // Listen to Socket.io events for progress updates
  useEffect(() => {
    const socket = getSocket();
    console.log('[RegenToolbar] useEffect: Setting up socket listeners');

    const handleShadowsProgress = (data: { current: number; total: number; filename: string }) => {
      console.log(`[Frontend] Regen progress: ${data.current}/${data.total} - ${data.filename}`);
      setProgress({
        type: 'shadows',
        current: data.current,
        total: data.total,
        currentItem: `Processing ${data.filename}`,
        status: 'running',
      });
    };

    const handleChaptersProgress = (data: { current: number; total: number; chapter: string }) => {
      setProgress({
        type: 'chapters',
        current: data.current,
        total: data.total,
        currentItem: `Chapter ${data.chapter}`,
        status: 'running',
      });
    };

    const handleChaptersComplete = (data: { completed: number; failed: number }) => {
      setProgress({
        type: 'chapters',
        current: data.completed,
        total: data.completed + data.failed,
        status: 'complete',
      });
      setIsRegenerating(false);
      onRegenComplete?.('chapters');
    };

    const handleAllProgress = (data: { step: string; current: number; total: number }) => {
      setProgress({
        type: 'all',
        current: data.current,
        total: data.total,
        currentItem: `Step ${data.current}: ${data.step}`,
        status: 'running',
      });
    };

    const handleAllComplete = () => {
      setProgress((prev) => (prev ? { ...prev, status: 'complete' } : null));
      setIsRegenerating(false);
      onRegenComplete?.('all');
    };

    const handleShadowsComplete = (data: { completed: number; failed: number }) => {
      const completed = data.completed || 0;
      const failed = data.failed || 0;
      const total = completed + failed;

      setProgress({
        type: 'shadows',
        current: completed,
        total: total,
        currentItem: `Regenerated ${completed} shadow file${completed !== 1 ? 's' : ''}`,
        status: 'complete',
      });

      // Show completion toast
      if (failed > 0) {
        toast.warning(`Regenerated ${completed}/${total} shadow files (${failed} failed)`, {
          duration: 5000,
        });
      } else {
        toast.success(`Regenerated ${completed} shadow file${completed !== 1 ? 's' : ''}`, {
          duration: 3000,
        });
      }

      // Keep completion state visible for 3 seconds
      setTimeout(() => {
        setIsRegenerating(false);
        setProgress(null);
      }, 3000);

      onRegenComplete?.('shadows');
    };

    console.log('[RegenToolbar] Registering socket listeners...');
    socket.on('regen:shadows:progress', handleShadowsProgress);
    socket.on('regen:shadows:complete', handleShadowsComplete);
    socket.on('regen:chapters:progress', handleChaptersProgress);
    socket.on('regen:chapters:complete', handleChaptersComplete);
    socket.on('regen:all:progress', handleAllProgress);
    socket.on('regen:all:complete', handleAllComplete);
    console.log('[RegenToolbar] Socket listeners registered successfully');

    return () => {
      console.log('[RegenToolbar] Cleaning up socket listeners');
      socket.off('regen:shadows:progress', handleShadowsProgress);
      socket.off('regen:shadows:complete', handleShadowsComplete);
      socket.off('regen:chapters:progress', handleChaptersProgress);
      socket.off('regen:chapters:complete', handleChaptersComplete);
      socket.off('regen:all:progress', handleAllProgress);
      socket.off('regen:all:complete', handleAllComplete);
    };
  }, [onRegenComplete]);

  const handleRegen = async (type: 'shadows' | 'transcripts' | 'chapters' | 'all') => {
    // FR-136: Determine scope (selected files or all files)
    const targetFiles = selectedFiles.length > 0 ? selectedFiles : undefined;
    const scope =
      selectedFiles.length > 0
        ? `${selectedFiles.length} selected file${selectedFiles.length === 1 ? '' : 's'}`
        : `all ${totalFiles} files`;

    // FR-136: Build file list preview (max 3 files, then "... and X more")
    let fileListPreview = '';
    if (selectedFiles.length > 0) {
      if (selectedFiles.length <= 3) {
        fileListPreview = selectedFiles.map((f) => `• ${f}`).join('\n');
      } else {
        fileListPreview = `• ${selectedFiles.slice(0, 3).join('\n• ')}\n... and ${selectedFiles.length - 3} more`;
      }
    }

    // FR-136: Confirmation dialogs showing explicit scope
    const typeLabel =
      type === 'shadows'
        ? 'shadows'
        : type === 'transcripts'
          ? 'transcripts'
          : type === 'chapters'
            ? 'chapter videos'
            : 'all derivative files';

    let confirmMessage = `Regenerate ${typeLabel} for ${scope}?`;

    if (fileListPreview) {
      confirmMessage += `\n\nThis will regenerate:\n${fileListPreview}`;
    }

    if (type === 'chapters') {
      confirmMessage += `\n\nThis may take 30-60 seconds per chapter.`;
    } else if (type === 'all') {
      confirmMessage +=
        `\n\nThis will:\n` +
        `1. Regenerate shadows\n` +
        `2. Queue transcriptions\n` +
        `3. Regenerate chapter videos\n\n` +
        `This may take a long time.`;
    }

    confirmMessage += `\n\nContinue?`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setIsRegenerating(true);
    setProgress({
      type,
      current: 0,
      total: 0,
      currentItem: `Starting ${type} regeneration...`,
      status: 'running',
    });

    // Show start toast
    const toastLabel =
      type === 'shadows'
        ? 'Shadow Files'
        : type === 'transcripts'
          ? 'Transcripts'
          : type === 'chapters'
            ? 'Chapter Videos'
            : 'All Files';
    toast.info(`Regenerating ${toastLabel}...`);

    try {
      const endpoint = `/api/manage/regen-${type}`;
      const response = await fetch(`http://localhost:5101${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: targetFiles }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Regeneration failed');
      }

      // For shadows - Socket.io events handle progress, just show final toast
      if (type === 'shadows') {
        // Progress updates come via Socket.io, completion handled by handleShadowsComplete
        // Just wait for the socket event
      } else if (type === 'transcripts') {
        const queued = result.queued || 0;
        const total = result.total || 0;

        setProgress({
          type,
          current: queued,
          total: total,
          currentItem: `Queued ${queued} file${queued !== 1 ? 's' : ''} for transcription`,
          status: 'complete',
        });

        // Show completion toast
        toast.success(`Queued ${queued} file${queued !== 1 ? 's' : ''} for transcription`, {
          duration: 3000,
        });

        // Keep completion state visible for 3 seconds
        setTimeout(() => {
          setIsRegenerating(false);
          setProgress(null);
        }, 3000);

        onRegenComplete?.(type);
      }
      // For chapters and all, Socket.io events will handle progress
    } catch (err) {
      setProgress((prev) => (prev ? { ...prev, status: 'error' } : null));
      setIsRegenerating(false);
      console.error(`[Regen ${type}] Error:`, err);
      toast.error(
        `Failed to regenerate ${type}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  return (
    <div className="border rounded-lg mb-4 bg-surface">
      {/* Collapsible header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-px bg-warm-divider w-8" />
          <span className="text-sm font-semibold text-warm-secondary">Regeneration Tools</span>
          <div className="h-px bg-warm-divider flex-1" />
        </div>
        <span className="text-warm-muted">{isOpen ? '▼' : '▶'}</span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {/* FR-136: Selection scope badge */}
          <div className="flex items-center justify-between">
            <SelectionBadge selectedCount={selectedFiles.length} totalCount={totalFiles} />
          </div>

          {/* Button row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRegen('shadows')}
              disabled={isRegenerating || totalFiles === 0}
              className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              title={
                totalFiles === 0
                  ? 'No files to regenerate'
                  : selectedFiles.length > 0
                    ? `Regenerate shadows for ${selectedFiles.length} selected file${selectedFiles.length === 1 ? '' : 's'}`
                    : `Regenerate shadows for all ${totalFiles} files`
              }
            >
              ↻ Regen Shadows
            </button>
            <button
              onClick={() => handleRegen('transcripts')}
              disabled={isRegenerating || totalFiles === 0}
              className="px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              title={
                totalFiles === 0
                  ? 'No files to transcribe'
                  : selectedFiles.length > 0
                    ? `Queue transcription for ${selectedFiles.length} selected file${selectedFiles.length === 1 ? '' : 's'}`
                    : `Queue transcription for all ${totalFiles} files`
              }
            >
              ↻ Regen Transcripts
            </button>
            <button
              onClick={() => handleRegen('chapters')}
              disabled={isRegenerating || totalFiles === 0}
              className="px-3 py-2 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              title={
                totalFiles === 0
                  ? 'No chapters to regenerate'
                  : selectedFiles.length > 0
                    ? `Regenerate chapters from ${selectedFiles.length} selected file${selectedFiles.length === 1 ? '' : 's'}`
                    : `Regenerate all chapter videos`
              }
            >
              ↻ Regen Chapters
            </button>
            <button
              onClick={() => handleRegen('all')}
              disabled={isRegenerating || totalFiles === 0}
              className="px-3 py-2 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              title={
                totalFiles === 0
                  ? 'No files to regenerate'
                  : selectedFiles.length > 0
                    ? `Regenerate all derivative files for ${selectedFiles.length} selected file${selectedFiles.length === 1 ? '' : 's'}`
                    : `Regenerate all derivative files (shadows → transcripts → chapters)`
              }
            >
              ↻ Regen All
            </button>
          </div>

          {/* Progress indicator */}
          {progress && <RegenProgressDisplay progress={progress} />}

          {/* Help text */}
          <p className="text-xs text-warm-muted">
            Regeneration tools delete and recreate derivative files. Shadows are fast (~1 minute),
            transcripts are queued (5-10 min/file), chapters are slow (~30-60s each).
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Progress display component
 */
function RegenProgressDisplay({ progress }: { progress: RegenProgress }) {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const isRunning = progress.status === 'running';
  const isComplete = progress.status === 'complete';
  const isError = progress.status === 'error';

  return (
    <div
      className={`p-3 border rounded ${
        isComplete
          ? 'bg-green-50 border-green-200'
          : isError
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-surface-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isComplete ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-blue-500'
            } ${isRunning && progress.total === 0 ? 'animate-pulse' : ''}`}
            style={{ width: progress.total === 0 ? '100%' : `${Math.min(100, percentage)}%` }}
          />
        </div>
        {progress.total > 0 && (
          <span className="text-sm text-warm-secondary font-medium min-w-[60px] text-right">
            {progress.current}/{progress.total}
          </span>
        )}
      </div>
      {progress.currentItem && <p className="text-xs text-warm-secondary mt-2">{progress.currentItem}</p>}
      {isComplete && <p className="text-xs text-green-600 font-medium mt-1">✓ Complete</p>}
      {isError && <p className="text-xs text-red-600 font-medium mt-1">✗ Error</p>}
    </div>
  );
}
