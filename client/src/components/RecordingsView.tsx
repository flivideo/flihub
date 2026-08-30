import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useRecordings,
  useMoveToSafe,
  useRestoreFromSafe,
  useParkRecording,
  useUnparkRecording,
  useTranscribeAll,
  useGenerateChapterRecordings,
  usePendingTranscriptionCount,
  useRenameRecording,
  useSetChapterTitle,
  usePreviewTrashRecordings,
  useTrashRecordings,
  type TrashPreviewItem,
} from '../hooks/useApi';
import { useRecordingsSocket, useChapterRecordingSocket } from '../hooks/useSocket';
import { QUERY_KEYS } from '../constants/queryKeys';
import { TranscriptModal } from './TranscriptModal';
import { InlineTitle } from './shared/InlineTitle';
import { VideoTranscriptModal } from './VideoTranscriptModal';
// FR-131: RenameLabelModal removed - bulk rename moved to Manage panel
import { ChapterPanel } from './ChapterPanel';
import { ChapterHelpPanel } from './ChapterHelpPanel';
import { DamHelpPanel } from './DamHelpPanel';
import { ChapterRecordingModal } from './ChapterRecordingModal';
import { RecordingVideoModal } from './RecordingVideoModal';
import { EditableFileRow } from './shared/EditableFileRow';
import { BatchToolbar } from './shared/BatchToolbar';
import { PreviewPanel } from './shared/PreviewPanel';
import type { PreviewChange } from './shared/PreviewPanel';
import { SplitMarker } from './shared/SplitMarker';
import { UndoToast } from './shared/UndoToast';
import { useBulkRename, useSplitChapter, useBatchUndoRename } from '../hooks/useEditingApi';
import type { RecordingFile, TranscriptionStatusResponse } from '../../../shared/types';
import { extractTagsFromName, buildRecordingFilename, formatChapter, parseRecordingFilename } from '../../../shared/naming';
import {
  formatFileSize,
  formatDuration,
  formatChapterTitle,
  formatTimestamp,
} from '../utils/formatting';
import { LoadingSpinner, ErrorMessage } from './shared';
import { ConfirmationModal } from './shared/ConfirmationModal'; // FR-156
import { API_URL } from '../config';

// FR-41: Group info with active/safe/parked file counts and total duration
interface ChapterGroup {
  files: RecordingFile[];
  activeCount: number;
  safeCount: number;
  parkedCount: number; // FR-120: Count of parked files
  totalDuration: number; // Sum of all file durations in seconds
}

// FR-41: Extended group info with cumulative timing
interface ChapterGroupWithTiming extends ChapterGroup {
  chapterKey: string;
  startTime: number; // Cumulative start time in seconds
}

// FR-35: Extract display name from first file in chapter, stripping tags
function getChapterDisplayName(files: RecordingFile[]): string {
  // Find sequence 1 file, or fall back to first file
  const firstFile = files.find((f) => f.sequence === '1') || files[0];
  if (!firstFile) return '';

  // NFR-65: Use shared utility to strip tags from name
  const { name } = extractTagsFromName(firstFile.name);
  return name;
}

// FR-35: Group recordings by chapter NUMBER only (not number + name)
function groupByChapter(recordings: RecordingFile[]): Map<string, ChapterGroup> {
  const groups = new Map<string, ChapterGroup>();

  for (const recording of recordings) {
    // Key by chapter number only
    const key = recording.chapter;
    if (!groups.has(key)) {
      groups.set(key, {
        files: [],
        activeCount: 0,
        safeCount: 0,
        parkedCount: 0,
        totalDuration: 0,
      });
    }
    const group = groups.get(key)!;
    group.files.push(recording);
    // FR-41: Sum up durations (skip if undefined)
    if (recording.duration != null) {
      group.totalDuration += recording.duration;
    }
    // FR-111/FR-120: Count safe, parked, and active files
    if (recording.isSafe) {
      group.safeCount++;
    } else if (recording.isParked) {
      group.parkedCount++;
    } else {
      group.activeCount++;
    }
  }

  return groups;
}

// FR-41: Calculate cumulative start times for each chapter
function addCumulativeTiming(groups: Map<string, ChapterGroup>): ChapterGroupWithTiming[] {
  const result: ChapterGroupWithTiming[] = [];
  let cumulative = 0;

  for (const [chapterKey, group] of groups.entries()) {
    result.push({
      ...group,
      chapterKey,
      startTime: cumulative,
    });
    cumulative += group.totalDuration;
  }

  return result;
}

// FR-30: Transcription status badge for recording rows
// Enhancement A: Shows manual Transcribe button for recordings without transcripts
function TranscriptionBadge({
  filename,
  filePath,
  onViewTranscript,
}: {
  filename: string;
  filePath: string;
  onViewTranscript: (filename: string) => void;
}) {
  const queryClient = useQueryClient();

  const { data } = useQuery<TranscriptionStatusResponse>({
    queryKey: QUERY_KEYS.transcriptionStatus(filename),
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/transcriptions/status/${encodeURIComponent(filename)}`
      );
      return res.json();
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Only poll when transcription is in progress; stop when complete or absent
      return (status === 'queued' || status === 'transcribing') ? 10000 : false;
    },
  });

  // Enhancement A: Mutation to manually queue transcription
  const queueMutation = useMutation({
    mutationFn: async (videoPath: string) => {
      const res = await fetch(`${API_URL}/api/transcriptions/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to queue transcription');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Transcription queued');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcriptionStatus(filename) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcriptions });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (!data) return null;

  switch (data.status) {
    case 'queued':
      return (
        <span
          className="text-xs text-amber-700 px-1.5 py-0.5 bg-amber-50 rounded font-medium"
          title="Queued for transcription"
        >
          T
        </span>
      );
    case 'transcribing':
      return (
        <span
          className="text-xs text-amber-700 px-1.5 py-0.5 bg-amber-50 rounded font-medium animate-pulse"
          title="Transcribing..."
        >
          T
        </span>
      );
    case 'complete':
      return (
        <button
          onClick={() => onViewTranscript(filename)}
          className="text-xs text-green-700 hover:text-green-800 px-1.5 py-0.5 bg-green-50 hover:bg-green-100 rounded font-medium transition-colors"
          title="View transcript"
        >
          T
        </button>
      );
    case 'error':
      return (
        <button
          onClick={() => queueMutation.mutate(filePath)}
          disabled={queueMutation.isPending}
          className="text-xs text-red-700 hover:text-red-800 px-1.5 py-0.5 bg-red-50 hover:bg-red-100 rounded font-medium transition-colors cursor-pointer disabled:opacity-50"
          title="Retry transcription"
        >
          T
        </button>
      );
    case 'none':
      return (
        <button
          onClick={() => queueMutation.mutate(filePath)}
          disabled={queueMutation.isPending}
          className="text-xs text-warm-muted hover:text-warm-secondary px-1.5 py-0.5 bg-surface-muted hover:bg-surface-hover rounded font-medium transition-colors cursor-pointer disabled:opacity-50"
          title="Start transcription"
        >
          T
        </button>
      );
    default:
      return null;
  }
}

// Enhancement B: Chapter status response type
// Helper: combine chapter transcripts on the server (ensures combined file is fresh)
async function combineChapterTranscripts(chapter: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/transcriptions/combine-chapter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapter }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to combine transcripts');
  }
  const data = await res.json();
  return data.filename as string;
}

// Helper: fetch transcript content by filename
async function fetchTranscriptContent(filename: string): Promise<string> {
  const res = await fetch(
    `${API_URL}/api/transcriptions/transcript/${encodeURIComponent(filename)}`
  );
  if (!res.ok) throw new Error('Failed to load transcript');
  const data = await res.json();
  return data.content as string;
}

// B049: Chapter header — card style with overflow menu
function ChapterHeader({
  chapter,
  name,
  title,
  onSetTitle,
  fileCount,
  totalDuration,
  startTime,
  isAllSafe,
  hasActiveFiles,
  hasSafeFiles,
  hasParkedFiles,
  allSelectedInChapter,
  onSelectAll,
  onSafeAll,
  onRestoreAll,
  onParkAll,
  onUnparkAll,
  onTranscribeAll,
  moveToSafePending,
  restorePending,
  parkPending,
  unparkPending,
  transcribePending,
  onViewCombined,
}: {
  chapter: string;
  name: string;
  title?: string; // FR-157: persisted YouTube title (secondary, editable)
  onSetTitle?: (title: string) => Promise<unknown> | unknown; // FR-157
  fileCount: number;
  totalDuration: number;
  startTime: number;
  isAllSafe: boolean;
  hasActiveFiles: boolean;
  hasSafeFiles: boolean;
  hasParkedFiles: boolean;
  allSelectedInChapter: boolean;
  onSelectAll: () => void;
  onSafeAll: () => void;
  onRestoreAll: () => void;
  onParkAll: () => void;
  onUnparkAll: () => void;
  onTranscribeAll: () => void;
  moveToSafePending: boolean;
  restorePending: boolean;
  parkPending: boolean;
  unparkPending: boolean;
  transcribePending: boolean;
  onViewCombined: (filename: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyPending, setCopyPending] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setMenuOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setMenuOpen(false), 250);
  };

  return (
    <div className="group relative flex items-center justify-between bg-surface-muted border border-warm rounded-lg px-4 py-2.5 mb-2 mt-5">
      <div className="flex flex-col min-w-0">
        <div className="flex items-baseline gap-3">
          <span className={`text-[15px] font-semibold ${isAllSafe ? 'text-warm-muted' : 'text-warm-primary'}`}>
            {chapter} {formatChapterTitle(name)}
          </span>
          {totalDuration > 0 && (
            <span className="text-sm font-medium text-warm-secondary font-mono bg-surface px-2.5 py-0.5 rounded-full">
              {formatDuration(totalDuration, 'smart')}
            </span>
          )}
          <span className="text-xs text-warm-faint">
            {fileCount} file{fileCount !== 1 ? 's'  : ''} · starts @ {formatDuration(startTime, 'youtube')}
          </span>
        </div>
        {/* FR-157: YouTube title — secondary line, edit in place */}
        {onSetTitle && (
          <InlineTitle
            value={title}
            placeholder="+ YouTube title"
            onSave={onSetTitle}
            title="YouTube title — click to edit"
            className="text-xs text-warm-muted mt-0.5"
            inputClassName="text-xs w-96 mt-0.5"
          />
        )}
      </div>

      {/* Overflow menu trigger — opens on hover, no click needed */}
      <div
        className="relative"
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <span
          className="text-warm-faint hover:text-warm-secondary hover:bg-surface-hover px-2 py-0.5 rounded transition-all opacity-30 cursor-default select-none"
          title="Chapter actions"
        >
          ⋯
        </span>

        {menuOpen && (
          <div className="absolute right-0 top-8 bg-surface border border-warm rounded-lg shadow-lg z-20 min-w-[180px] py-1">
            <button
              onClick={() => { onSelectAll(); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-warm-secondary hover:bg-surface-hover flex items-center gap-2"
            >
              <span className="w-4 text-center text-xs">✓</span>
              {allSelectedInChapter ? 'Deselect all' : 'Select all'}
            </button>
            {hasActiveFiles && (
              <button
                onClick={() => { onSafeAll(); setMenuOpen(false); }}
                disabled={moveToSafePending}
                className="w-full text-left px-4 py-2 text-sm text-warm-secondary hover:bg-surface-hover flex items-center gap-2 disabled:opacity-50"
              >
                <span className="w-4 text-center text-xs">→</span>
                Safe all
              </button>
            )}
            {hasSafeFiles && (
              <button
                onClick={() => { onRestoreAll(); setMenuOpen(false); }}
                disabled={restorePending}
                className="w-full text-left px-4 py-2 text-sm text-warm-secondary hover:bg-surface-hover flex items-center gap-2 disabled:opacity-50"
              >
                <span className="w-4 text-center text-xs">←</span>
                Restore all
              </button>
            )}
            {hasActiveFiles && (
              <button
                onClick={() => { onParkAll(); setMenuOpen(false); }}
                disabled={parkPending}
                className="w-full text-left px-4 py-2 text-sm text-warm-secondary hover:bg-surface-hover flex items-center gap-2 disabled:opacity-50"
              >
                <span className="w-4 text-center text-xs">→</span>
                Park all
              </button>
            )}
            {hasParkedFiles && (
              <button
                onClick={() => { onUnparkAll(); setMenuOpen(false); }}
                disabled={unparkPending}
                className="w-full text-left px-4 py-2 text-sm text-warm-secondary hover:bg-surface-hover flex items-center gap-2 disabled:opacity-50"
              >
                <span className="w-4 text-center text-xs">←</span>
                Unpark all
              </button>
            )}
            <button
              onClick={() => { onTranscribeAll(); setMenuOpen(false); }}
              disabled={transcribePending}
              className="w-full text-left px-4 py-2 text-sm text-warm-secondary hover:bg-surface-hover flex items-center gap-2 disabled:opacity-50"
            >
              <span className="w-4 text-center text-xs">🎙</span>
              Transcribe all
            </button>
              <div className="border-t border-warm my-1" />
                <button
                  onClick={async () => {
                    setCopyPending(true);
                    try {
                      const filename = await combineChapterTranscripts(chapter);
                      const content = await fetchTranscriptContent(filename);
                      await navigator.clipboard.writeText(content);
                      toast.success(`Chapter ${chapter} transcript copied`);
                    } catch {
                      toast.error('Failed to copy transcript');
                    } finally {
                      setCopyPending(false);
                      setMenuOpen(false);
                    }
                  }}
                  disabled={copyPending}
                  className="w-full text-left px-4 py-2 text-sm text-warm-secondary hover:bg-surface-hover flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="w-4 text-center text-xs">📋</span>
                  {copyPending ? 'Copying...' : 'Copy transcript'}
                </button>
                <button
                  onClick={async () => {
                    try {
                      const filename = await combineChapterTranscripts(chapter);
                      onViewCombined(filename);
                    } catch {
                      toast.error('Failed to load transcript');
                    }
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-warm-secondary hover:bg-surface-hover flex items-center gap-2"
                >
                  <span className="w-4 text-center text-xs">📄</span>
                  View transcript
                </button>
          </div>
        )}
      </div>
    </div>
  );
}

// B047: Compute chapter info string for selected files
function getSelectedChapterInfo(selectedFiles: Set<string>, recordings: RecordingFile[]): string {
  const chapters = new Set<string>();
  for (const filename of selectedFiles) {
    const rec = recordings.find((r) => r.filename === filename);
    if (rec) chapters.add(rec.chapter);
  }
  const sorted = Array.from(chapters).sort();
  if (sorted.length === 0) return '';
  if (sorted.length === 1) return `Chapter ${sorted[0]}`;
  return `Chapters ${sorted.join(', ')}`;
}

// B047: Collect unique tags from selected files
function getSelectedTags(selectedFiles: Set<string>, recordings: RecordingFile[]): string[] {
  const tagSet = new Set<string>();
  for (const filename of selectedFiles) {
    const rec = recordings.find((r) => r.filename === filename);
    if (rec) {
      for (const tag of rec.tags) {
        tagSet.add(tag);
      }
    }
  }
  return Array.from(tagSet).sort();
}

export function RecordingsView() {
  const { data, isLoading, error } = useRecordings();
  const moveToSafe = useMoveToSafe();
  const restoreFromSafe = useRestoreFromSafe();
  const parkRecording = useParkRecording(); // FR-120
  const unparkRecording = useUnparkRecording(); // FR-120
  const transcribeAll = useTranscribeAll();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateChapter = useGenerateChapterRecordings();
  const renameMutation = useRenameRecording(); // B047: For inline single-file renames
  // FR-92: Get count of files pending transcription
  const { data: pendingData } = usePendingTranscriptionCount();
  const pendingCount = pendingData?.pendingCount ?? 0;
  const [showSafe, setShowSafe] = useState(true);
  const [showParked, setShowParked] = useState(true); // FR-120: Toggle for parked files
  const [viewingTranscript, setViewingTranscript] = useState<string | null>(null);
  // FR-131: Removed editingChapter state - bulk rename moved to Manage panel

  // FR-55: State for video transcript modal
  const [showVideoTranscript, setShowVideoTranscript] = useState(false);

  // FR-58: State for chapter recording modal
  const [showChapterRecording, setShowChapterRecording] = useState(false);

  // FR-128: State for recording preview modal
  const [previewRecording, setPreviewRecording] = useState<RecordingFile | null>(null);
  // B069: Track which index is open in the modal for prev/next navigation
  const [previewIndex, setPreviewIndex] = useState<number>(-1);

  // B047: Selection state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Map<string, { oldFilename: string; newFilename: string }>>(new Map());
  const [splitPoint, setSplitPoint] = useState<{ chapter: string; afterSequence: number } | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const [pendingOperation, setPendingOperation] = useState<{
    type: 'rename' | 'moveChapter' | 'addTag' | 'removeTag' | 'split';
    params: Record<string, string | string[]>;
  } | null>(null);

  // B047: Mutations for batch operations
  const bulkRenameMutation = useBulkRename();
  const splitChapterMutation = useSplitChapter();
  const undoMutation = useBatchUndoRename();

  // FR-56: Refs and state for chapter navigation panel
  const chapterRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [currentChapter, setCurrentChapter] = useState<string | null>(null);

  // NFR-5: Subscribe to real-time recordings changes via socket
  useRecordingsSocket();

  // FR-58: Listen for chapter recording completion events
  useChapterRecordingSocket();

  // Handle moving a single file to safe
  const handleMoveToSafe = (filename: string) => {
    moveToSafe.mutate(
      { files: [filename] },
      {
        onSuccess: (data) => {
          if (data.success && data.count && data.count > 0) {
            toast.success(`Moved ${filename} to safe`);
          } else if (data.errors?.length) {
            toast.error(data.errors[0]);
          }
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to move file');
        },
      }
    );
  };

  // Handle moving all files in a chapter to safe
  const handleMoveChapterToSafe = (chapter: string) => {
    moveToSafe.mutate(
      { chapter },
      {
        onSuccess: (data) => {
          if (data.success && data.count && data.count > 0) {
            toast.success(`Moved ${data.count} file${data.count > 1 ? 's' : ''} to safe`);
          } else if (data.errors?.length) {
            toast.error(data.errors[0]);
          }
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to move files');
        },
      }
    );
  };

  // Handle restoring a file from safe
  const handleRestore = (filename: string) => {
    restoreFromSafe.mutate([filename], {
      onSuccess: (data) => {
        if (data.success && data.count && data.count > 0) {
          toast.success(`Restored ${filename}`);
        } else if (data.errors?.length) {
          toast.error(data.errors[0]);
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to restore file');
      },
    });
  };

  // Handle restoring all files from safe
  const handleRestoreAll = () => {
    // FR-111: Use isSafe flag instead of folder check
    const safeFilenames = data?.recordings.filter((r) => r.isSafe).map((r) => r.filename) || [];

    if (safeFilenames.length === 0) {
      toast.info('No files in safe folder');
      return;
    }

    restoreFromSafe.mutate(safeFilenames, {
      onSuccess: (result) => {
        if (result.success && result.count && result.count > 0) {
          toast.success(`Restored ${result.count} file${result.count > 1 ? 's' : ''}`);
        } else if (result.errors?.length) {
          toast.error(result.errors[0]);
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to restore files');
      },
    });
  };

  // FR-120: Handle parking a file
  // FR-156: Delete a recording — preview artifacts, confirm, then trash
  const previewTrash = usePreviewTrashRecordings();
  const trashRecordings = useTrashRecordings();
  const [trashPreview, setTrashPreview] = useState<TrashPreviewItem[] | null>(null);

  const handleDelete = (filename: string) => {
    previewTrash.mutate([filename], {
      onSuccess: (data) => {
        if (!data.items || data.items.length === 0) {
          toast.error(data.errors?.[0] || 'Nothing found on disk to delete');
          return;
        }
        setTrashPreview(data.items);
      },
      onError: (err) => toast.error(err.message || 'Failed to inspect recording'),
    });
  };

  const confirmTrash = () => {
    const files = (trashPreview ?? []).map((i) => i.filename);
    setTrashPreview(null);
    trashRecordings.mutate(files, {
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
    });
  };

  const handlePark = (filename: string) => {
    parkRecording.mutate(
      { files: [filename] },
      {
        onSuccess: (data) => {
          if (data.success && data.count && data.count > 0) {
            toast.success(`Parked ${filename}`);
          } else if (data.errors?.length) {
            toast.error(data.errors[0]);
          }
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to park file');
        },
      }
    );
  };

  // FR-120: Handle unparking a file
  const handleUnpark = (filename: string) => {
    unparkRecording.mutate([filename], {
      onSuccess: (data) => {
        if (data.success && data.count && data.count > 0) {
          toast.success(`Unparked ${filename}`);
        } else if (data.errors?.length) {
          toast.error(data.errors[0]);
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to unpark file');
      },
    });
  };

  // FR-120: Handle parking all files in a chapter
  const handleParkChapter = (chapter: string) => {
    parkRecording.mutate(
      { chapter },
      {
        onSuccess: (data) => {
          if (data.success && data.count && data.count > 0) {
            toast.success(`Parked ${data.count} file${data.count > 1 ? 's' : ''}`);
          } else if (data.errors?.length) {
            toast.error(data.errors[0]);
          }
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to park files');
        },
      }
    );
  };

  // FR-120: Handle unparking all files in a chapter
  const handleUnparkChapter = (filenames: string[]) => {
    if (filenames.length === 0) return;

    unparkRecording.mutate(filenames, {
      onSuccess: (result) => {
        if (result.success && result.count && result.count > 0) {
          toast.success(`Unparked ${result.count} file${result.count > 1 ? 's' : ''}`);
        } else if (result.errors?.length) {
          toast.error(result.errors[0]);
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to unpark files');
      },
    });
  };

  // Handle restoring all files in a chapter from safe
  const handleRestoreChapterFromSafe = (filenames: string[]) => {
    if (filenames.length === 0) return;

    restoreFromSafe.mutate(filenames, {
      onSuccess: (result) => {
        if (result.success && result.count && result.count > 0) {
          toast.success(`Restored ${result.count} file${result.count > 1 ? 's' : ''}`);
        } else if (result.errors?.length) {
          toast.error(result.errors[0]);
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to restore files');
      },
    });
  };

  // FR-30 Enhancement: Transcribe all videos in project
  const handleTranscribeProject = () => {
    transcribeAll.mutate(
      { scope: 'project' },
      {
        onSuccess: (data) => {
          if (data.queuedCount > 0) {
            toast.success(
              `Queued ${data.queuedCount} video${data.queuedCount > 1 ? 's' : ''} for transcription`
            );
          } else {
            toast.info('All videos already have transcripts');
          }
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to queue transcriptions');
        },
      }
    );
  };

  // FR-30 Enhancement: Transcribe all videos in a chapter
  const handleTranscribeChapter = (chapter: string) => {
    transcribeAll.mutate(
      { scope: 'chapter', chapter },
      {
        onSuccess: (data) => {
          if (data.queuedCount > 0) {
            toast.success(
              `Queued ${data.queuedCount} video${data.queuedCount > 1 ? 's' : ''} for transcription`
            );
          } else {
            toast.info('All videos in chapter already have transcripts');
          }
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to queue transcriptions');
        },
      }
    );
  };

  // B047: Selection handlers
  const toggleSelect = useCallback((filename: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }, []);

  const selectAllInChapter = useCallback(
    (chapter: string) => {
      const chapterFiles = filteredRecordings.filter((r) => r.chapter === chapter);
      setSelectedFiles((prev) => {
        const next = new Set(prev);
        const allSelected = chapterFiles.every((f) => next.has(f.filename));
        if (allSelected) {
          chapterFiles.forEach((f) => next.delete(f.filename));
        } else {
          chapterFiles.forEach((f) => next.add(f.filename));
        }
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.recordings, showSafe, showParked]
  );

  const deselectAll = useCallback(() => setSelectedFiles(new Set()), []);

  // B047: Inline rename handler — single file, calls rename API directly
  const handleInlineRename = useCallback(
    (filename: string, field: 'chapter' | 'name', newValue: string) => {
      const recording = data?.recordings.find((r) => r.filename === filename);
      if (!recording) return;

      const newChapter = field === 'chapter' ? newValue : recording.chapter;
      const newName = field === 'name' ? newValue : recording.name;

      const newFilename = buildRecordingFilename(
        newChapter,
        recording.sequence,
        newName,
        recording.tags.length > 0 ? recording.tags : []
      );

      if (newFilename === recording.filename) return; // no change

      renameMutation.mutate(
        {
          originalPath: recording.path,
          chapter: newChapter,
          sequence: recording.sequence,
          name: newName,
          tags: recording.tags,
        },
        {
          onSuccess: () => toast.success(`Renamed to ${newFilename}`),
          onError: (err) => toast.error(err.message),
        }
      );
    },
    [data?.recordings, renameMutation]
  );

  // B047: Tag removal handler — single file
  const handleTagRemove = useCallback(
    (filename: string, tag: string) => {
      const recording = data?.recordings.find((r) => r.filename === filename);
      if (!recording) return;

      const newTags = recording.tags.filter((t) => t !== tag);
      const newFilename = buildRecordingFilename(
        recording.chapter,
        recording.sequence,
        recording.name,
        newTags.length > 0 ? newTags : []
      );

      if (newFilename === recording.filename) return;

      renameMutation.mutate(
        {
          originalPath: recording.path,
          chapter: recording.chapter,
          sequence: recording.sequence,
          name: recording.name,
          tags: newTags,
        },
        {
          onSuccess: () => toast.success(`Removed tag ${tag}`),
          onError: (err) => toast.error(err.message),
        }
      );
    },
    [data?.recordings, renameMutation]
  );

  // B047: Batch rename handler — sets pending changes for preview
  const handleBatchRename = useCallback(
    (newName: string) => {
      const changes = new Map<string, { oldFilename: string; newFilename: string }>();
      const selected = data?.recordings.filter((r) => selectedFiles.has(r.filename)) || [];
      for (const file of selected) {
        const newFilename = buildRecordingFilename(
          file.chapter,
          file.sequence,
          newName,
          file.tags.length > 0 ? file.tags : []
        );
        if (newFilename !== file.filename) {
          changes.set(file.filename, { oldFilename: file.filename, newFilename });
        }
      }
      setPendingChanges(changes);
      setPendingOperation({ type: 'rename', params: { label: newName } });
      if (changes.size === 0) {
        toast.info('No changes needed');
      }
    },
    [data?.recordings, selectedFiles]
  );

  // B047: Batch move-to-chapter handler
  const handleBatchMoveToChapter = useCallback(
    (chapter: string) => {
      const changes = new Map<string, { oldFilename: string; newFilename: string }>();
      const selected = data?.recordings.filter((r) => selectedFiles.has(r.filename)) || [];
      for (const file of selected) {
        const newFilename = buildRecordingFilename(
          chapter,
          file.sequence,
          file.name,
          file.tags.length > 0 ? file.tags : []
        );
        if (newFilename !== file.filename) {
          changes.set(file.filename, { oldFilename: file.filename, newFilename });
        }
      }
      setPendingChanges(changes);
      setPendingOperation({ type: 'moveChapter', params: { chapter } });
      if (changes.size === 0) {
        toast.info('No changes needed');
      }
    },
    [data?.recordings, selectedFiles]
  );

  // B047: Batch add tag handler
  const handleBatchAddTag = useCallback(
    (tag: string) => {
      const changes = new Map<string, { oldFilename: string; newFilename: string }>();
      const selected = data?.recordings.filter((r) => selectedFiles.has(r.filename)) || [];
      for (const file of selected) {
        if (file.tags.includes(tag)) continue;
        const newTags = [...file.tags, tag];
        const newFilename = buildRecordingFilename(
          file.chapter,
          file.sequence,
          file.name,
          newTags
        );
        if (newFilename !== file.filename) {
          changes.set(file.filename, { oldFilename: file.filename, newFilename });
        }
      }
      setPendingChanges(changes);
      setPendingOperation({ type: 'addTag', params: { tag } });
      if (changes.size === 0) {
        toast.info('No changes needed');
      }
    },
    [data?.recordings, selectedFiles]
  );

  // B047: Batch remove tag handler
  const handleBatchRemoveTag = useCallback(
    (tag: string) => {
      const changes = new Map<string, { oldFilename: string; newFilename: string }>();
      const selected = data?.recordings.filter((r) => selectedFiles.has(r.filename)) || [];
      for (const file of selected) {
        if (!file.tags.includes(tag)) continue;
        const newTags = file.tags.filter((t) => t !== tag);
        const newFilename = buildRecordingFilename(
          file.chapter,
          file.sequence,
          file.name,
          newTags.length > 0 ? newTags : []
        );
        if (newFilename !== file.filename) {
          changes.set(file.filename, { oldFilename: file.filename, newFilename });
        }
      }
      setPendingChanges(changes);
      setPendingOperation({ type: 'removeTag', params: { tag } });
      if (changes.size === 0) {
        toast.info('No changes needed');
      }
    },
    [data?.recordings, selectedFiles]
  );

  // B047: Split here handler (from batch toolbar)
  const handleSplitHere = useCallback(() => {
    // Use the first selected file's position as the split point
    if (selectedFiles.size === 0) return;
    const selected = data?.recordings.filter((r) => selectedFiles.has(r.filename)) || [];
    if (selected.length === 0) return;
    // Find the lowest sequence in the selection
    const sorted = [...selected].sort(
      (a, b) => parseInt(a.sequence, 10) - parseInt(b.sequence, 10)
    );
    const first = sorted[0];
    setSplitPoint({
      chapter: first.chapter,
      afterSequence: parseInt(first.sequence, 10),
    });
    toast.info(`Split point set at chapter ${first.chapter}, sequence ${first.sequence}`);
    setPendingOperation({ type: 'split', params: {} });
  }, [data?.recordings, selectedFiles]);

  // B047: Apply handler — called from PreviewPanel
  const handleApplyChanges = useCallback(async () => {
    if (pendingChanges.size === 0 && !splitPoint) return;

    if (splitPoint) {
      splitChapterMutation.mutate(
        { chapter: splitPoint.chapter, splitAtSequence: splitPoint.afterSequence },
        {
          onSuccess: (result) => {
            toast.success(`Split chapter ${splitPoint.chapter} → ${result.newChapter} (${result.filesMoved} files)`);
            setUndoMessage(`Split ch${splitPoint.chapter} → ch${splitPoint.chapter} + ch${result.newChapter}`);
            setPendingChanges(new Map());
            setSplitPoint(null);
            setSelectedFiles(new Set());
            setPendingOperation(null);
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else if (pendingOperation) {
      const selected = data?.recordings.filter((r) => selectedFiles.has(r.filename)) || [];
      if (selected.length === 0) return;

      // Determine bulk-rename params from pendingOperation
      const firstFile = selected[0];
      const firstChange = pendingChanges.values().next().value;
      if (!firstChange) return;

      // Parse the new filename using shared naming utilities (not regex)
      const parsed = parseRecordingFilename(firstChange.newFilename);
      const base = firstChange.newFilename.replace(/\.(mov|mp4)$/i, '');
      const nameAndTags = base.split('-').slice(2).join('-');
      const { name: cleanName, tags: parsedTags } = extractTagsFromName(nameAndTags);

      const newChapter = parsed ? parsed.chapter : firstFile.chapter;
      const newLabel = parsed ? cleanName : firstFile.name;
      const newTags = parsedTags;

      bulkRenameMutation.mutate(
        {
          files: selected.map((f) => f.filename),
          chapter: newChapter,
          sequenceMode: 'preserve' as const,
          label: newLabel,
          tags: newTags,
        },
        {
          onSuccess: (result) => {
            toast.success(`Renamed ${result.renamedCount} files`);
            setUndoMessage(`Renamed ${result.renamedCount} files`);
            setPendingChanges(new Map());
            setSelectedFiles(new Set());
            setPendingOperation(null);
          },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  }, [pendingChanges, splitPoint, pendingOperation, data?.recordings, selectedFiles, splitChapterMutation, bulkRenameMutation]);

  // B047: Cancel handler
  const handleCancelChanges = useCallback(() => {
    setPendingChanges(new Map());
    setSplitPoint(null);
    setPendingOperation(null);
  }, []);

  // B047: Undo handler
  const handleUndo = useCallback(() => {
    undoMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(`Reverted ${result.filesReverted} files`);
        setUndoMessage(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }, [undoMutation]);

  // B047: Compute preview changes from pendingChanges Map
  const computePreviewChanges = useCallback((): PreviewChange[] => {
    return Array.from(pendingChanges.values()).map((change) => {
      const recording = data?.recordings.find((r) => r.filename === change.oldFilename);
      return {
        oldFilename: change.oldFilename,
        newFilename: change.newFilename,
        hasShadow: recording?.hasShadow ?? false,
        transcriptCount: 5,
        needsReTranscription: false,
      };
    });
  }, [pendingChanges, data?.recordings]);

  // B047: Split here handler (from single row)
  const handleSplitHereFromRow = useCallback(
    (filename: string) => {
      const rec = data?.recordings.find((r) => r.filename === filename);
      if (rec) {
        setSplitPoint({
          chapter: rec.chapter,
          afterSequence: parseInt(rec.sequence, 10),
        });
        setPendingOperation({ type: 'split', params: {} });
        toast.info(`Split point set at chapter ${rec.chapter}, sequence ${rec.sequence}`);
      }
    },
    [data?.recordings]
  );

  // Filter recordings based on showSafe and showParked toggles
  // FR-111/FR-120: Filter by isSafe and isParked flags
  const filteredRecordings = useMemo(() => {
    if (!data?.recordings) return [];
    return data.recordings.filter((r) => {
      if (!showSafe && r.isSafe) return false;
      if (!showParked && r.isParked) return false;
      return true;
    });
  }, [data?.recordings, showSafe, showParked]);

  // FR-41: Group recordings and calculate cumulative timing
  const chaptersWithTiming = useMemo(() => {
    const groups = groupByChapter(filteredRecordings);
    return addCumulativeTiming(groups);
  }, [filteredRecordings]);

  // FR-35: Calculate total duration across all recordings
  // Note: This must be before early returns to maintain hook order
  const totalDuration = useMemo(() => {
    if (!data?.recordings) return 0;
    return data.recordings.reduce((sum, r) => sum + (r.duration ?? 0), 0);
  }, [data?.recordings]);

  // FR-56: Prepare chapter info for the panel
  // FR-157: Persisted chapter titles (secondary line under the chapter name)
  const chapterTitles = data?.chapterTitles;
  const projectCode = data?.project?.code ?? null;
  const setChapterTitle = useSetChapterTitle();
  const chapterPanelData = useMemo(() => {
    return chaptersWithTiming.map((ch) => ({
      chapterKey: ch.chapterKey,
      name: formatChapterTitle(getChapterDisplayName(ch.files)),
      title: chapterTitles?.[ch.chapterKey],
      startTime: ch.startTime,
      fileCount: ch.files.length,
    }));
  }, [chaptersWithTiming, chapterTitles]);

  // B047: Compute selected chapter info for BatchToolbar
  const selectedChapterInfo = useMemo(
    () => getSelectedChapterInfo(selectedFiles, data?.recordings || []),
    [selectedFiles, data?.recordings]
  );

  // B047: Compute selected tags for BatchToolbar
  const selectedTags = useMemo(
    () => getSelectedTags(selectedFiles, data?.recordings || []),
    [selectedFiles, data?.recordings]
  );

  // FR-56: Intersection Observer to track current chapter in viewport
  useEffect(() => {
    if (chaptersWithTiming.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first visible chapter
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const chapterKey = entry.target.getAttribute('data-chapter');
            if (chapterKey) {
              setCurrentChapter(chapterKey);
              break;
            }
          }
        }
      },
      {
        root: null, // viewport
        rootMargin: '-100px 0px -60% 0px', // trigger when chapter is in upper portion
        threshold: 0,
      }
    );

    // Observe all chapter elements
    chapterRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [chaptersWithTiming]);

  // FR-56: Handle click on chapter in panel - scroll to that chapter
  const handleChapterClick = useCallback((chapterKey: string) => {
    const element = chapterRefs.current.get(chapterKey);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Loading recordings..." />;
  }

  if (error) {
    return <ErrorMessage message="Error loading recordings" />;
  }

  if (!data?.recordings || data.recordings.length === 0) {
    return (
      <div className="text-center py-12 bg-surface rounded-lg border border-warm">
        <p className="text-warm-muted">No recordings found</p>
        <p className="text-sm text-warm-muted mt-1">
          Recordings will appear here after you rename incoming files
        </p>
      </div>
    );
  }

  // Count files by safe/parked status (FR-111/FR-120)
  const totalFiles = data.recordings.length;
  const safeFiles = data.recordings.filter((r) => r.isSafe).length;
  const parkedFiles = data.recordings.filter((r) => r.isParked).length;
  const activeFiles = totalFiles - safeFiles - parkedFiles;

  return (
    <div>
      {/* Row 1 — Stats */}
      <div className="flex items-center gap-2 mb-1 text-xs text-warm-muted flex-wrap">
        <span className="text-warm-secondary font-medium">
          {totalFiles} files
        </span>
        <span className="text-warm-muted">
          ({activeFiles} active, {safeFiles} safe, {parkedFiles} parked)
        </span>
        {/* FR-35: Total duration */}
        {totalDuration > 0 && (
          <span className="text-warm-muted">| {formatDuration(totalDuration, 'smart')}</span>
        )}
        {/* FR-95: Recording size */}
        {data?.totalRecordingsSize != null && data.totalRecordingsSize > 0 && (
          <span className="text-warm-muted">| {formatFileSize(data.totalRecordingsSize)}</span>
        )}
        {/* FR-95: Shadow size — secondary, purple */}
        {data?.totalShadowsSize != null && data.totalShadowsSize > 0 && (
          <span className="text-purple-400">· shadows: {formatFileSize(data.totalShadowsSize)}</span>
        )}
      </div>

      {/* Row 2 — Filters */}
      <div className="flex items-center gap-3 mb-1 text-xs text-warm-muted">
        <label className="flex items-center gap-1 cursor-pointer hover:text-warm-secondary">
          <input
            type="checkbox"
            checked={showSafe}
            onChange={(e) => setShowSafe(e.target.checked)}
            className="w-3 h-3 rounded border-warm-strong text-blue-500 focus:ring-blue-500"
          />
          safe
        </label>
        <label className="flex items-center gap-1 cursor-pointer hover:text-warm-secondary">
          <input
            type="checkbox"
            checked={showParked}
            onChange={(e) => setShowParked(e.target.checked)}
            className="w-3 h-3 rounded border-warm-strong text-pink-500 focus:ring-pink-500"
          />
          parked
        </label>
        {safeFiles > 0 && (
          <button
            onClick={handleRestoreAll}
            disabled={restoreFromSafe.isPending}
            className="text-green-600 hover:text-green-700 disabled:opacity-50"
            title="Restore all files from safe folder"
          >
            ← Restore All
          </button>
        )}
      </div>

      {/* Row 3 — Actions */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        <button
          onClick={handleTranscribeProject}
          disabled={transcribeAll.isPending || pendingCount === 0}
          className="text-purple-600 hover:text-purple-700 disabled:opacity-50"
          title={
            pendingCount > 0
              ? `Queue ${pendingCount} untranscribed video${pendingCount > 1 ? 's' : ''} for transcription`
              : 'All videos already have transcripts'
          }
        >
          🎙️ {pendingCount > 0 ? `Transcribe (${pendingCount} pending)` : 'All Transcribed'}
        </button>
        {/* FR-55: Video-level transcript export */}
        <span className="text-warm-faint">|</span>
        <button
          onClick={() => setShowVideoTranscript(true)}
          className="text-blue-600 hover:text-blue-700"
          title="View combined video transcript"
        >
          📄 Transcript
        </button>
        <span className="text-warm-faint">|</span>
        <button
          onClick={() => setShowChapterRecording(true)}
          className="text-purple-600 hover:text-purple-700"
          title="Create chapter preview recordings"
        >
          🎬 Chapter Recordings
        </button>
      </div>

      {/* B047: Batch toolbar — appears when files are selected */}
      {selectedFiles.size > 0 && (
        <BatchToolbar
          selectedCount={selectedFiles.size}
          selectedChapterInfo={selectedChapterInfo}
          onRename={handleBatchRename}
          onMoveToChapter={handleBatchMoveToChapter}
          onAddTag={handleBatchAddTag}
          onRemoveTag={handleBatchRemoveTag}
          onSplitHere={handleSplitHere}
          onDeselectAll={deselectAll}
          selectedTags={selectedTags}
        />
      )}

      {/* B047: Preview panel — shows pending changes before applying */}
      {(pendingChanges.size > 0 || splitPoint) && (
        <PreviewPanel
          changes={computePreviewChanges()}
          splitInfo={splitPoint ? {
            sourceChapter: splitPoint.chapter,
            newChapter: formatChapter(parseInt(splitPoint.chapter, 10) + 1),
          } : undefined}
          isApplying={bulkRenameMutation.isPending || splitChapterMutation.isPending}
          onApply={handleApplyChanges}
          onCancel={handleCancelChanges}
        />
      )}

      {/* Recordings list */}
      <div className="space-y-6">
        {chaptersWithTiming.map((chapterData) => {
          // FR-35: chapterKey is now just the chapter number
          const chapter = chapterData.chapterKey;
          // FR-35: Get display name from first file, with tags stripped
          const name = getChapterDisplayName(chapterData.files);
          const group = chapterData;
          const isAllSafe = group.activeCount === 0;
          const hasActiveFiles = group.activeCount > 0;
          // FR-111: Use isSafe flag instead of folder check
          const safeFilesInChapter = group.files.filter((f) => f.isSafe);
          const hasSafeFiles = safeFilesInChapter.length > 0;
          // FR-120: Track parked files in chapter
          const parkedFilesInChapter = group.files.filter((f) => f.isParked);
          const hasParkedFiles = parkedFilesInChapter.length > 0;

          // B047: Check if all files in chapter are selected
          const allSelectedInChapter = group.files.every((f) =>
            selectedFiles.has(f.filename)
          );

          return (
            <div
              key={chapterData.chapterKey}
              data-chapter={chapterData.chapterKey}
              ref={(el) => {
                if (el) {
                  chapterRefs.current.set(chapterData.chapterKey, el);
                } else {
                  chapterRefs.current.delete(chapterData.chapterKey);
                }
              }}
            >
              {/* Chapter header — card style with overflow menu */}
              <ChapterHeader
                chapter={chapter}
                name={name}
                title={chapterTitles?.[chapter]}
                onSetTitle={
                  projectCode
                    ? async (t: string) => {
                        try {
                          await setChapterTitle.mutateAsync({ code: projectCode, chapter, title: t });
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Failed to save title');
                        }
                      }
                    : undefined
                }
                fileCount={group.files.length}
                totalDuration={group.totalDuration}
                startTime={chapterData.startTime}
                isAllSafe={isAllSafe}
                hasActiveFiles={hasActiveFiles}
                hasSafeFiles={hasSafeFiles}
                hasParkedFiles={hasParkedFiles}
                allSelectedInChapter={allSelectedInChapter}
                onSelectAll={() => selectAllInChapter(chapter)}
                onSafeAll={() => handleMoveChapterToSafe(chapter)}
                onRestoreAll={() => handleRestoreChapterFromSafe(safeFilesInChapter.map((f) => f.filename))}
                onParkAll={() => handleParkChapter(chapter)}
                onUnparkAll={() => handleUnparkChapter(parkedFilesInChapter.map((f) => f.filename))}
                onTranscribeAll={() => handleTranscribeChapter(chapter)}
                moveToSafePending={moveToSafe.isPending}
                restorePending={restoreFromSafe.isPending}
                parkPending={parkRecording.isPending}
                unparkPending={unparkRecording.isPending}
                transcribePending={transcribeAll.isPending}
                onViewCombined={setViewingTranscript}
              />

              {/* Files in this chapter — now using EditableFileRow */}
              <div className="space-y-1">
                {group.files.map((file) => {
                  // B047: Show split marker before this file if it's at the split point
                  const showSplitMarker = splitPoint &&
                    file.chapter === splitPoint.chapter &&
                    parseInt(file.sequence, 10) === splitPoint.afterSequence;

                  // Count files after split point for the marker label
                  const filesAfterSplit = showSplitMarker
                    ? group.files.filter((f) => parseInt(f.sequence, 10) >= splitPoint.afterSequence).length
                    : 0;

                  return (
                    <React.Fragment key={file.path}>
                      {showSplitMarker && (
                        <SplitMarker
                          newChapter={formatChapter(parseInt(splitPoint.chapter, 10) + 1)}
                          fileCount={filesAfterSplit}
                          onRemove={() => {
                            setSplitPoint(null);
                            setPendingOperation(null);
                          }}
                        />
                      )}
                  <EditableFileRow
                    recording={file}
                    isSelected={selectedFiles.has(file.filename)}
                    onToggleSelect={toggleSelect}
                    onInlineRename={handleInlineRename}
                    onTagRemove={handleTagRemove}
                    onPlay={(rec) => {
                      // B069: Track index for prev/next navigation
                      const idx = filteredRecordings.findIndex((r) => r.filename === rec.filename);
                      setPreviewIndex(idx);
                      setPreviewRecording(rec);
                    }}
                    onSplitHere={handleSplitHereFromRow}
                    onPark={handlePark}
                    onSafe={handleMoveToSafe}
                    onRestore={handleRestore}
                    onUnpark={handleUnpark}
                    onDelete={handleDelete}
                    transcriptionBadge={
                      <TranscriptionBadge
                        filename={file.filename}
                        filePath={file.path}
                        onViewTranscript={setViewingTranscript}
                      />
                    }
                    pendingChange={pendingChanges.get(file.filename)}
                    disabled={!!file.isShadow}
                    formatDuration={formatDuration}
                    formatFileSize={formatFileSize}
                    formatTimestamp={formatTimestamp}
                  />
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* FR-56: Slide-out Chapter Panel - hover to expand */}
      <div className="fixed right-0 top-32 bottom-4 z-40 group">
        {/* Hover trigger tab */}
        <div className="absolute right-0 top-0 h-full flex items-start pt-8">
          <div className="bg-surface-muted border border-r-0 border-warm-strong rounded-l-lg px-1.5 py-3 cursor-pointer shadow-sm group-hover:opacity-0 transition-opacity">
            <span
              className="text-xs font-medium text-warm-secondary"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              Chapters ({chapterPanelData.length})
            </span>
          </div>
        </div>
        {/* Slide-out panel */}
        <div className="h-full w-72 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out">
          <ChapterPanel
            chapters={chapterPanelData}
            currentChapter={currentChapter}
            onChapterClick={handleChapterClick}
          />
        </div>
      </div>

      {/* Chapter Help slide-out - positioned below Chapters panel */}
      <div className="fixed right-0 top-80 bottom-4 z-40 group/help">
        {/* Hover trigger tab */}
        <div className="absolute right-0 top-0 h-full flex items-start pt-8">
          <div className="bg-surface-muted border border-r-0 border-warm-strong rounded-l-lg px-1.5 py-3 cursor-pointer shadow-sm group-hover/help:opacity-0 transition-opacity">
            <span
              className="text-xs font-medium text-warm-secondary"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              Help
            </span>
          </div>
        </div>
        {/* Slide-out panel */}
        <div className="h-full w-80 translate-x-full group-hover/help:translate-x-0 transition-transform duration-200 ease-out">
          <ChapterHelpPanel />
        </div>
      </div>

      {/* DAM & Archiving slide-out - positioned below Help panel */}
      <div className="fixed right-0 bottom-4 z-40 group/dam" style={{ top: 'calc(20rem + 8rem)' }}>
        {/* Hover trigger tab */}
        <div className="absolute right-0 top-0 h-full flex items-start pt-8">
          <div className="bg-surface-muted border border-r-0 border-warm-strong rounded-l-lg px-1.5 py-3 cursor-pointer shadow-sm group-hover/dam:opacity-0 transition-opacity">
            <span
              className="text-xs font-medium text-warm-secondary"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              DAM
            </span>
          </div>
        </div>
        {/* Slide-out panel */}
        <div className="h-full w-80 translate-x-full group-hover/dam:translate-x-0 transition-transform duration-200 ease-out">
          <DamHelpPanel />
        </div>
      </div>

      {/* FR-30: Transcript Modal */}
      {viewingTranscript && (
        <TranscriptModal filename={viewingTranscript} onClose={() => setViewingTranscript(null)} />
      )}

      {/* FR-156: Delete confirmation — lists exactly what the server found on disk */}
      {trashPreview && (() => {
        const artifacts = trashPreview.flatMap((i) => i.artifacts);
        const totalBytes = trashPreview.reduce((sum, i) => sum + i.totalBytes, 0);
        const extras = artifacts.filter((a) => a.kind !== 'recording').length;
        return (
          <ConfirmationModal
            title={trashPreview.length === 1 ? 'Delete this recording?' : `Delete ${trashPreview.length} recordings?`}
            message={
              `${artifacts.length} file${artifacts.length === 1 ? '' : 's'} (${formatFileSize(totalBytes)}) will be moved to -trash/.` +
              (extras > 0
                ? `\n\nThat includes ${extras} linked file${extras === 1 ? '' : 's'} — the transcript and shadow are deleted with the recording so nothing is orphaned.`
                : '')
            }
            filesLabel="Will be moved to -trash/:"
            files={artifacts.map((a) => `${a.label} — ${a.filename}`)}
            maxFilesShown={8}
            warning={
              'These files leave the project immediately. They stay recoverable in -trash/ until you empty it from the Project drawer, which deletes them for good.' +
              (artifacts.some((a) => a.kind === 'transcript')
                ? '\nThis take has been transcribed — that transcript will need regenerating if you restore it.'
                : '')
            }
            variant="danger"
            confirmText="Move to -trash"
            onConfirm={confirmTrash}
            onCancel={() => setTrashPreview(null)}
          />
        );
      })()}

      {/* FR-131: Rename Chapter Label Modal removed - use Manage panel */}

      {/* FR-55: Video Transcript Modal */}
      {showVideoTranscript && (
        <VideoTranscriptModal onClose={() => setShowVideoTranscript(false)} />
      )}

      {/* FR-58: Chapter Recording Modal */}
      {showChapterRecording && (
        <ChapterRecordingModal onClose={() => setShowChapterRecording(false)} />
      )}

      {/* FR-128: Recording Preview Modal */}
      {previewRecording && (
        <RecordingVideoModal
          filename={previewRecording.filename}
          duration={previewRecording.duration}
          size={previewRecording.size}
          onClose={() => { setPreviewRecording(null); setPreviewIndex(-1); }}
          onPrevious={previewIndex > 0 ? () => {
            // B069: Navigate to previous recording in filtered list
            const prev = filteredRecordings[previewIndex - 1];
            if (prev) { setPreviewIndex(previewIndex - 1); setPreviewRecording(prev); }
          } : undefined}
          onNext={previewIndex < filteredRecordings.length - 1 ? () => {
            // B069: Navigate to next recording in filtered list
            const next = filteredRecordings[previewIndex + 1];
            if (next) { setPreviewIndex(previewIndex + 1); setPreviewRecording(next); }
          } : undefined}
          position={previewIndex >= 0 ? { current: previewIndex + 1, total: filteredRecordings.length } : undefined}
        />
      )}

      {/* FR-35: Total duration footer */}
      {totalDuration > 0 && (
        <div className="mt-6 pt-4 border-t border-warm text-sm text-warm-muted text-right">
          Total: {formatDuration(totalDuration, 'smart')}
        </div>
      )}

      {/* B047: Undo toast — floating bar after batch operations */}
      {undoMessage && (
        <UndoToast
          message={`✓ ${undoMessage}`}
          onUndo={handleUndo}
          durationMs={30000}
          onExpire={() => setUndoMessage(null)}
        />
      )}
    </div>
  );
}
