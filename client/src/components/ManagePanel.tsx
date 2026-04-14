/**
 * FR-131: Manage Panel (formerly Export Panel)
 *
 * Power tools for bulk operations and file management:
 * - Bulk rename operations (selected files + chapter-level)
 * - Export to Gling AI (FR-122/124/125/126)
 * - Edit folder management
 * - Visual style matching RecordingsView
 *
 * B041: Tool pages — each tool owns center content, no slide-out drawers.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { API_URL } from '../config';
import { useRecordings, useConfig } from '../hooks/useApi';
import { useRecordingsSocket, getSocket } from '../hooks/useSocket';
import { formatFileSize, formatChapterTitle } from '../utils/formatting';
import {
  LoadingSpinner,
  ErrorMessage,
  ToolsSidebar,
  ConfirmationModal,
  GlingEditTool,
  RelayTool,
  SyncTool,
  StorageTool,
  ArchiveTool,
} from './shared';
import type { ChapterSettings } from './shared';
import type { ArchiveFilter } from './shared/archiveToolUtils';
import { extractTagsFromName } from '../../../shared/naming';
import { PoemWuiPage } from './PoemWuiPage';
import type { RecordingFile } from '../../../shared/types';

export interface ChapterGroup {
  chapterKey: string;
  title: string;
  files: RecordingFile[];
  totalSize: number;
}

// Extract display name from first file in chapter
export function getChapterDisplayName(files: RecordingFile[]): string {
  const firstFile = files.find((f) => f.sequence === '1') || files[0];
  if (!firstFile) return '';
  const { name } = extractTagsFromName(firstFile.name);
  return name;
}

// Group recordings by chapter
export function groupByChapter(recordings: RecordingFile[]): ChapterGroup[] {
  const groups = new Map<string, { files: RecordingFile[]; totalSize: number }>();

  for (const recording of recordings) {
    const key = recording.chapter;
    if (!groups.has(key)) {
      groups.set(key, { files: [], totalSize: 0 });
    }
    const group = groups.get(key)!;
    group.files.push(recording);
    group.totalSize += recording.size || 0;
  }

  const result: ChapterGroup[] = [];
  for (const [chapterKey, group] of groups.entries()) {
    // Sort files by sequence within chapter
    group.files.sort((a, b) => parseInt(a.sequence) - parseInt(b.sequence));

    result.push({
      chapterKey,
      title: getChapterDisplayName(group.files),
      files: group.files,
      totalSize: group.totalSize,
    });
  }

  // Sort chapters numerically
  return result.sort((a, b) => parseInt(a.chapterKey) - parseInt(b.chapterKey));
}

// B041: Contextual headings per tool
const toolHeadings: Record<string, string> = {
  regen: 'Recordings',
  'gling-edit': 'Gling / Edit Prep',
  relay: 'Relay Collaboration',
  sync: 'Sync',
  awb: 'AWB',
  storage: 'Storage',
  archive: 'Archive',
};

export type ActiveTool = 'regen' | 'gling-edit' | 'relay' | 'awb' | 'sync' | 'storage' | 'archive';

export interface ManagePanelProps {
  initialTool?: string | null;
  onToolActivated?: () => void;
  // WU4: Deep-link params forwarded to ArchiveTool. Change the `initialTool`
  // ref along with these (App.tsx always sets a fresh object) so the effect
  // below re-applies even when tool === 'archive' already.
  initialArchiveFilter?: ArchiveFilter;
  initialArchiveSearch?: string;
}

export function ManagePanel({
  initialTool,
  onToolActivated,
  initialArchiveFilter,
  initialArchiveSearch,
}: ManagePanelProps = {}) {
  const { data, isLoading, error } = useRecordings();
  const { data: config } = useConfig();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showParked, setShowParked] = useState(false); // FR-122: Default to hidden

  // B041: Tool-oriented design — each tool owns center content, default to regen
  const [activeTool, setActiveTool] = useState<ActiveTool>('regen');

  // WU4: Local override for Archive deep-link params — set when the Storage
  // tool escape-hatch or internal navigation wants to push a filter/search
  // without roundtripping through App.tsx props.
  const [localArchiveFilter, setLocalArchiveFilter] = useState<ArchiveFilter | undefined>(undefined);
  const [localArchiveSearch, setLocalArchiveSearch] = useState<string | undefined>(undefined);
  // Bumping this key re-mounts ArchiveTool so it re-reads `initial*` props
  // even when the user is already on the Archive tool and clicks a new badge.
  const [archiveMountKey, setArchiveMountKey] = useState(0);

  // B044: Allow parent to navigate to a specific tool (e.g. from SyncIndicator).
  // WU4: also forwards Archive filter/search params and bumps the remount key
  // so a fresh badge click re-applies even when already on Archive.
  useEffect(() => {
    if (initialTool) {
      setActiveTool(initialTool as ActiveTool);
      // Clear local overrides — parent-provided props take precedence this cycle.
      setLocalArchiveFilter(undefined);
      setLocalArchiveSearch(undefined);
      setArchiveMountKey((k) => k + 1);
      onToolActivated?.();
    }
    // Intentionally depend on the full param tuple — App.tsx sends a fresh
    // value each navigation so this re-fires even when tool === activeTool.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTool, initialArchiveFilter, initialArchiveSearch]);

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    title: string;
    message: string;
    files?: string[];
    warning?: string;
    variant?: 'primary' | 'danger' | 'warning';
    chapterSettings?: ChapterSettings;
    onChapterSettingsChange?: (settings: ChapterSettings) => void;
    onConfirm: (chapterSettings?: ChapterSettings) => void;
  } | null>(null);

  // Subscribe to real-time updates
  useRecordingsSocket();

  // Socket.io listeners for regen progress
  useEffect(() => {
    const socket = getSocket();

    const handleShadowsProgress = (data: { current: number; total: number; filename: string }) => {
      toast.loading(`Shadows: ${data.current}/${data.total} - ${data.filename}`, {
        id: 'shadows-progress',
      });
    };

    const handleShadowsComplete = (data: { completed: number; failed: number }) => {
      toast.dismiss('shadows-progress');
      if (data.failed > 0) {
        toast.warning(`Shadows: ${data.completed} done, ${data.failed} failed`);
      } else {
        toast.success(`Shadows: ${data.completed} regenerated`);
      }
    };

    const handleChaptersProgress = (data: { current: number; total: number; chapter: string }) => {
      toast.loading(`Chapters: ${data.current}/${data.total} - Chapter ${data.chapter}`, {
        id: 'chapters-progress',
      });
    };

    const handleChaptersComplete = (data: { completed: number; failed: number }) => {
      toast.dismiss('chapters-progress');
      if (data.failed > 0) {
        toast.warning(`Chapters: ${data.completed} done, ${data.failed} failed`);
      } else {
        toast.success(`Chapters: ${data.completed} regenerated`);
      }
    };

    const handleAllProgress = (data: { step: string; current: number; total: number }) => {
      toast.loading(`Regen All: Step ${data.current}/${data.total} (${data.step})`, {
        id: 'all-progress',
      });
    };

    const handleAllComplete = () => {
      toast.dismiss('all-progress');
      toast.success('All derivative files regenerated');
    };

    socket.on('regen:shadows:progress', handleShadowsProgress);
    socket.on('regen:shadows:complete', handleShadowsComplete);
    socket.on('regen:chapters:progress', handleChaptersProgress);
    socket.on('regen:chapters:complete', handleChaptersComplete);
    socket.on('regen:all:progress', handleAllProgress);
    socket.on('regen:all:complete', handleAllComplete);

    return () => {
      socket.off('regen:shadows:progress', handleShadowsProgress);
      socket.off('regen:shadows:complete', handleShadowsComplete);
      socket.off('regen:chapters:progress', handleChaptersProgress);
      socket.off('regen:chapters:complete', handleChaptersComplete);
      socket.off('regen:all:progress', handleAllProgress);
      socket.off('regen:all:complete', handleAllComplete);
    };
  }, []);

  // Filter recordings based on showParked toggle
  const filteredRecordings = useMemo(() => {
    if (!data?.recordings) return [];
    return data.recordings.filter((r) => {
      if (!showParked && r.isParked) return false;
      return true;
    });
  }, [data?.recordings, showParked]);

  // Group recordings by chapter
  const chapters = useMemo(() => {
    return groupByChapter(filteredRecordings);
  }, [filteredRecordings]);

  // Calculate totals for selected files
  const { selectedCount, selectedSize } = useMemo(() => {
    const recordings = data?.recordings || [];
    let count = 0;
    let size = 0;
    for (const file of recordings) {
      if (selectedFiles.has(file.filename)) {
        count++;
        size += file.size || 0;
      }
    }
    return { selectedCount: count, selectedSize: size };
  }, [data?.recordings, selectedFiles]);

  // Select all files
  const selectAll = useCallback(() => {
    const recordings = data?.recordings || [];
    const allFiles = recordings
      .filter((r) => (!showParked ? !r.isParked : true))
      .map((r) => r.filename);
    setSelectedFiles(new Set(allFiles));
  }, [data?.recordings, showParked]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  // Toggle individual file
  const toggleFile = useCallback((filename: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  }, []);

  // Select all files in a chapter
  const selectAllInChapter = useCallback((chapter: ChapterGroup) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      for (const file of chapter.files) {
        next.add(file.filename);
      }
      return next;
    });
  }, []);

  // Deselect all files in a chapter
  const deselectAllInChapter = useCallback((chapter: ChapterGroup) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      for (const file of chapter.files) {
        next.delete(file.filename);
      }
      return next;
    });
  }, []);

  // Delete transcripts or shadows — selection-aware (selected files only, or all if none selected)
  const handleDeleteClick = (target: 'transcripts' | 'shadows') => {
    const label = target === 'transcripts' ? 'transcripts' : 'shadow files';
    const selectedFilesArray = Array.from(selectedFiles);
    const targetFiles = selectedFilesArray.length > 0 ? selectedFilesArray : undefined;
    const scope = targetFiles
      ? `${targetFiles.length} selected file${targetFiles.length === 1 ? '' : 's'}`
      : `all ${data?.recordings?.length || 0} files`;

    setConfirmationModal({
      title: `Delete ${label}`,
      message: `Delete ${label} for ${scope}?`,
      warning: 'This cannot be undone. Files will need to be regenerated from scratch.',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmationModal(null);
        try {
          const response = await fetch(`${API_URL}/api/manage/delete-${target}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: targetFiles }),
          });
          const result = await response.json();
          if (!result.success) throw new Error(result.error || 'Delete failed');
          toast.success(`Deleted ${result.deleted} ${label}`);
        } catch (err) {
          toast.error(`Failed to delete ${label}: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    });
  };

  // B041: Regen action handler (inline buttons trigger confirmation modal)
  const handleRegenClick = (
    tool: 'regen-shadows' | 'regen-transcripts' | 'regen-all'
  ) => {
    const selectedFilesArray = Array.from(selectedFiles);

    // Determine scope
    const targetFiles = selectedFilesArray.length > 0 ? selectedFilesArray : undefined;
    const scope =
      selectedFilesArray.length > 0
        ? `${selectedFilesArray.length} selected file${selectedFilesArray.length === 1 ? '' : 's'}`
        : `all ${data?.recordings?.length || 0} files`;

    // Determine type and labels
    const type = tool.replace('regen-', '');
    const typeLabel =
      type === 'shadows'
        ? 'shadows'
        : type === 'transcripts'
          ? 'transcripts'
          : 'all derivative files';

    // Build warning message and chapter settings
    let warning: string | undefined;
    let initialChapterSettings: ChapterSettings | undefined;
    let onChapterSettingsChange: ((settings: ChapterSettings) => void) | undefined;

    if (type === 'all') {
      // Initialize chapter settings from config
      const chapterConfig = config?.chapterRecordings || {
        resolution: '720p' as '720p' | '1080p',
        includeTitleSlides: false,
        slideDuration: 1.0,
      };

      initialChapterSettings = {
        resolution: chapterConfig.resolution as '720p' | '1080p',
        includeTitleSlides: chapterConfig.includeTitleSlides ?? false,
        slideDuration: chapterConfig.slideDuration ?? 1.0,
      };

      onChapterSettingsChange = (settings: ChapterSettings) => {
        // Re-render modal with updated settings
        setConfirmationModal((prev) =>
          prev ? { ...prev, chapterSettings: settings } : prev
        );
      };

      warning =
        'This will run all three operations sequentially:\n1. Regenerate shadows\n2. Queue transcriptions\n3. Regenerate chapter videos\n\nThis may take a long time.';
    }

    // Show confirmation modal
    setConfirmationModal({
      title: `Regenerate ${typeLabel}`,
      message: `Regenerate ${typeLabel} for ${scope}?`,
      files: selectedFilesArray.length > 0 ? selectedFilesArray : undefined,
      warning,
      variant: type === 'all' ? 'warning' : 'primary',
      chapterSettings: initialChapterSettings,
      onChapterSettingsChange,
      onConfirm: async (confirmedSettings?: ChapterSettings) => {
        setConfirmationModal(null);

        // Show start toast
        const toastLabel =
          type === 'shadows'
            ? 'Shadow Files'
            : type === 'transcripts'
              ? 'Transcripts'
              : 'All Files';
        toast.info(`Regenerating ${toastLabel}...`);

        try {
          const endpoint = `/api/manage/${tool}`;

          // Build request body with optional chapter settings
          const requestBody: { files?: string[]; chapterSettings?: ChapterSettings } = { files: targetFiles };
          if (type === 'all' && confirmedSettings) {
            requestBody.chapterSettings = confirmedSettings;
          }

          const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Regeneration failed');
          }

          // For transcripts, show immediate completion (no Socket.io events)
          if (type === 'transcripts') {
            const queued = result.queued || 0;
            toast.success(`Queued ${queued} file${queued !== 1 ? 's' : ''} for transcription`);
          }

          // For shadows and all - Socket.io events will handle progress/completion
        } catch (err) {
          console.error(`[Regen ${type}] Error:`, err);
          toast.error(
            `Failed to regenerate ${type}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      },
    });
  };

  // B041: Tool navigation — clicking same tool returns to regen (default)
  const handleToolClick = (tool: ActiveTool) => {
    setActiveTool(activeTool === tool ? 'regen' : tool);
  };

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

  // Count files by parked status
  const totalFiles = data.recordings.length;
  const parkedFiles = data.recordings.filter((r) => r.isParked).length;
  const activeFiles = totalFiles - parkedFiles;

  // B041: Determine if the active tool needs the file list
  const needsFileList = activeTool === 'regen';

  return (
    <div className="relative">
      {/* B041: Center Content — tool-specific views */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* B041: Contextual heading per tool — relay has its own project-scoped heading */}
        {activeTool !== 'relay' && activeTool !== 'sync' && (
          <h2 className="text-lg font-medium text-warm-secondary mb-4">
            {toolHeadings[activeTool]}
          </h2>
        )}

        {needsFileList ? (
          <>
            {/* B041: Regen inline toolbar — only when regen is active */}
            {activeTool === 'regen' && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <button
                  onClick={() => handleRegenClick('regen-shadows')}
                  className="px-3 py-1.5 text-sm font-medium text-warm-secondary bg-surface border border-warm-strong rounded-md hover:bg-surface-hover hover:text-warm-primary transition-colors"
                >
                  Regen Shadows
                </button>
                <button
                  onClick={() => handleRegenClick('regen-transcripts')}
                  className="px-3 py-1.5 text-sm font-medium text-warm-secondary bg-surface border border-warm-strong rounded-md hover:bg-surface-hover hover:text-warm-primary transition-colors"
                >
                  Regen Transcripts
                </button>
                <button
                  onClick={() => handleRegenClick('regen-all')}
                  className="px-3 py-1.5 text-sm font-medium text-orange-600 bg-surface border border-orange-300 rounded-md hover:bg-orange-50 hover:text-orange-700 transition-colors"
                >
                  Regen All
                </button>
                <span className="text-warm-faint select-none">|</span>
                <button
                  onClick={() => handleDeleteClick('transcripts')}
                  className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:underline transition-colors"
                >
                  {selectedFiles.size > 0 ? `Delete Transcripts (${selectedFiles.size})` : 'Delete Transcripts'}
                </button>
                <button
                  onClick={() => handleDeleteClick('shadows')}
                  className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:underline transition-colors"
                >
                  {selectedFiles.size > 0 ? `Delete Shadows (${selectedFiles.size})` : 'Delete Shadows'}
                </button>
              </div>
            )}

            {/* Stats and filter toggle - matching RecordingsView style */}
            <div className="flex items-center gap-3 mb-3 text-xs text-warm-muted">
              <span className="text-warm-secondary font-medium">
                {selectedCount} of {filteredRecordings.length} selected
                <span className="font-normal text-warm-muted ml-1">({formatFileSize(selectedSize)})</span>
                <span className="font-normal text-warm-muted ml-1">
                  | {activeFiles} active, {parkedFiles} parked
                </span>
              </span>
              <span className="text-warm-faint">|</span>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-warm-secondary">
                <input
                  type="checkbox"
                  checked={showParked}
                  onChange={(e) => setShowParked(e.target.checked)}
                  className="w-3 h-3 rounded border-warm-strong text-pink-500 focus:ring-pink-500"
                />
                Show Parked
              </label>
              <span className="text-warm-faint">|</span>
              {selectedCount === 0 ? (
                <button
                  onClick={selectAll}
                  className="text-xs text-blue-600 hover:text-blue-700 px-2 py-0.5 hover:bg-blue-50 rounded transition-colors"
                >
                  Select All
                </button>
              ) : (
                <button
                  onClick={clearSelection}
                  className="text-xs text-warm-secondary hover:text-warm-secondary px-2 py-0.5 hover:bg-surface-hover rounded transition-colors"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Recordings list - matching RecordingsView style */}
            <div className="space-y-6">
              {chapters.map((chapterData) => {
                const selectedInChapter = chapterData.files.filter((f) =>
                  selectedFiles.has(f.filename)
                ).length;
                const allSelected = selectedInChapter === chapterData.files.length;
                const someSelected = selectedInChapter > 0 && !allSelected;

                return (
                  <div key={chapterData.chapterKey}>
                    {/* Chapter separator - matching RecordingsView */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px bg-warm-strong flex-1" />
                      <span className="text-sm font-semibold px-2 text-warm-secondary">
                        {chapterData.chapterKey} {formatChapterTitle(chapterData.title)}
                        <span className="font-normal text-xs ml-2">
                          ({chapterData.files.length} file{chapterData.files.length !== 1 ? 's' : ''} ·{' '}
                          {formatFileSize(chapterData.totalSize)})
                        </span>
                      </span>
                      {/* Chapter-level select/deselect */}
                      {someSelected ? (
                        <button
                          onClick={() => deselectAllInChapter(chapterData)}
                          className="text-xs text-warm-muted hover:text-blue-600 px-2 py-0.5 hover:bg-blue-50 rounded transition-colors"
                        >
                          ☐ Deselect{' '}
                          <span className="text-blue-600 font-medium">{chapterData.chapterKey}</span>
                        </button>
                      ) : allSelected ? (
                        <button
                          onClick={() => deselectAllInChapter(chapterData)}
                          className="text-xs text-blue-600 hover:text-warm-muted px-2 py-0.5 hover:bg-surface-hover rounded transition-colors"
                        >
                          ☑ Deselect <span className="font-medium">{chapterData.chapterKey}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => selectAllInChapter(chapterData)}
                          className="text-xs text-warm-muted hover:text-blue-600 px-2 py-0.5 hover:bg-blue-50 rounded transition-colors"
                        >
                          ☐ Select{' '}
                          <span className="text-blue-600 font-medium">{chapterData.chapterKey}</span>
                        </button>
                      )}
                      <div className="h-px bg-warm-strong flex-1" />
                    </div>

                    {/* Files in this chapter - matching RecordingsView */}
                    <div className="space-y-1">
                      {chapterData.files.map((file) => {
                        const isSelected = selectedFiles.has(file.filename);
                        const isParked = file.isParked;

                        // Determine row styling - matching RecordingsView
                        let rowClasses: string;
                        let textClasses: string;

                        if (isParked) {
                          rowClasses = 'bg-pink-50 border-pink-200 text-warm-muted';
                          textClasses = 'text-warm-muted';
                        } else if (isSelected) {
                          rowClasses = 'bg-blue-50 border-blue-200';
                          textClasses = 'text-warm-secondary';
                        } else {
                          rowClasses = 'bg-surface-muted border-warm';
                          textClasses = 'text-warm-muted';
                        }

                        return (
                          <label
                            key={file.filename}
                            className={`flex items-center justify-between px-4 py-2 rounded-lg border cursor-pointer hover:border-blue-300 transition-colors ${rowClasses}`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleFile(file.filename)}
                                className="w-4 h-4 rounded border-warm-strong text-blue-500 focus:ring-blue-500"
                              />
                              <span className={`font-mono text-sm ${textClasses}`}>
                                {file.filename}
                              </span>
                              {isParked && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-pink-200 text-pink-800 rounded">
                                  PARKED
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-warm-muted ml-4">
                              {formatFileSize(file.size || 0)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* B041: Standalone tools — full-width, no file list */}
            {activeTool === 'relay' && <RelayTool />}
            {activeTool === 'sync' && <SyncTool />}
            {activeTool === 'gling-edit' && <GlingEditTool />}
            {activeTool === 'awb' && <PoemWuiPage />}
            {activeTool === 'storage' && (
              <StorageTool
                projectCode={config?.activeProject || ''}
                onNavigateToArchive={(projectCode) => {
                  // WU5: Storage-tool "Manage in Archive" escape hatch.
                  // Set the local search override first, then flip activeTool so
                  // ArchiveTool mounts with the correct initialSearch prop.
                  setLocalArchiveSearch(projectCode);
                  setLocalArchiveFilter(undefined);
                  setArchiveMountKey((k) => k + 1);
                  setActiveTool('archive');
                }}
              />
            )}
            {activeTool === 'archive' && (
              <ArchiveTool
                key={archiveMountKey}
                initialFilter={localArchiveFilter ?? initialArchiveFilter}
                initialSearch={localArchiveSearch ?? initialArchiveSearch}
              />
            )}
          </>
        )}
      </div>

      {/* B041: Left Sidebar - Fixed in left margin, pure navigation */}
      <div className="fixed left-8 top-32 bottom-8 w-[200px] z-30">
        <ToolsSidebar
          activeTool={activeTool}
          onToolClick={handleToolClick}
        />
      </div>

      {/* Confirmation Modal */}
      {confirmationModal && (
        <ConfirmationModal
          title={confirmationModal.title}
          message={confirmationModal.message}
          files={confirmationModal.files}
          warning={confirmationModal.warning}
          variant={confirmationModal.variant}
          chapterSettings={confirmationModal.chapterSettings}
          onChapterSettingsChange={confirmationModal.onChapterSettingsChange}
          onConfirm={confirmationModal.onConfirm}
          onCancel={() => setConfirmationModal(null)}
        />
      )}
    </div>
  );
}
