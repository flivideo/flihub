/**
 * FR-131: Manage Panel (formerly Export Panel)
 *
 * Power tools for bulk operations and file management:
 * - Bulk rename operations (selected files + chapter-level)
 * - Export to Gling AI (FR-122/124/125/126)
 * - Edit folder management
 * - Visual style matching RecordingsView
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useRecordings, useConfig, useGitSync } from '../hooks/useApi';
import { useRecordingsSocket, getSocket } from '../hooks/useSocket';
import { formatFileSize, formatChapterTitle } from '../utils/formatting';
import {
  LoadingSpinner,
  ErrorMessage,
  ToolsSidebar,
  SlideOutDrawer,
  ConfirmationModal,
  GlingEditTool,
  S3StagingTool,
  RelayTool,
  RenamePanel,
  ChapterListPanel,
} from './shared';
import { extractTagsFromName } from '../../../shared/naming';
import type { RecordingFile } from '../../../shared/types';

interface ChapterGroup {
  chapterKey: string;
  title: string;
  files: RecordingFile[];
  totalSize: number;
}

// Extract display name from first file in chapter
function getChapterDisplayName(files: RecordingFile[]): string {
  const firstFile = files.find((f) => f.sequence === '1') || files[0];
  if (!firstFile) return '';
  const { name } = extractTagsFromName(firstFile.name);
  return name;
}

// Group recordings by chapter
function groupByChapter(recordings: RecordingFile[]): ChapterGroup[] {
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

export function ManagePanel() {
  const { data, isLoading, error } = useRecordings();
  const { data: config } = useConfig();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showParked, setShowParked] = useState(false); // FR-122: Default to hidden

  // B038: relay collaboration — git pull-only sync
  const gitSync = useGitSync();

  // FR-138: Bulk rename (removed - now handled in RenamePanel)
  // const [bulkRenameLabel, setBulkRenameLabel] = useState('')
  // const [isRenaming, setIsRenaming] = useState(false)

  // FR-136: Tool-oriented design (FR-139: removed 'folders', FR-140: added 'renumber', FR-142: split export-s3 into gling-edit + s3-staging, B038: added relay)
  const [activeTool, setActiveTool] = useState<'rename' | 'gling-edit' | 's3-staging' | 'renumber' | 'relay' | null>(null);

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    title: string;
    message: string;
    files?: string[];
    warning?: string;
    variant?: 'primary' | 'danger' | 'warning';
    chapterSettings?: {
      resolution: '720p' | '1080p';
      includeTitleSlides: boolean;
      slideDuration: number;
    };
    onConfirm: () => void;
  } | null>(null);

  // Chapter settings state for editing in modal
  const [modalChapterSettings, setModalChapterSettings] = useState<{
    resolution: '720p' | '1080p';
    includeTitleSlides: boolean;
    slideDuration: number;
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

  // FR-131: No auto-selection - user must manually select files

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

  // FR-138: Bulk rename - now handled in RenamePanel component
  // (handleBulkRename removed)

  // FR-136: Tool handlers
  const handleSimpleToolClick = (
    tool: 'regen-shadows' | 'regen-transcripts' | 'regen-chapters' | 'regen-all' | 'git-sync'
  ) => {
    // B038: relay collaboration — git pull-only sync
    if (tool === 'git-sync') {
      gitSync.mutate();
      return;
    }

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
          : type === 'chapters'
            ? 'chapter videos'
            : 'all derivative files';

    // Build warning message and chapter settings
    let warning: string | undefined;
    let initialChapterSettings:
      | { resolution: '720p' | '1080p'; includeTitleSlides: boolean; slideDuration: number }
      | undefined;

    if (type === 'chapters' || type === 'all') {
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

      setModalChapterSettings(initialChapterSettings);

      if (type === 'chapters') {
        warning = 'This may take 30-60 seconds per chapter.';
      } else {
        warning =
          'This will run all three operations sequentially:\n1. Regenerate shadows\n2. Queue transcriptions\n3. Regenerate chapter videos\n\nThis may take a long time.';
      }
    }

    // Show confirmation modal
    setConfirmationModal({
      title: `Regenerate ${typeLabel}`,
      message: `Regenerate ${typeLabel} for ${scope}?`,
      files: selectedFilesArray.length > 0 ? selectedFilesArray : undefined,
      warning,
      variant: type === 'all' ? 'warning' : 'primary',
      chapterSettings: initialChapterSettings,
      onConfirm: async () => {
        setConfirmationModal(null);

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
          const endpoint = `/api/manage/${tool}`;

          // Build request body with optional chapter settings
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const requestBody: any = { files: targetFiles };
          if ((type === 'chapters' || type === 'all') && modalChapterSettings) {
            requestBody.chapterSettings = modalChapterSettings;
          }

          const response = await fetch(`http://localhost:5101${endpoint}`, {
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

          // For shadows, chapters, and all - Socket.io events will handle progress/completion
        } catch (err) {
          console.error(`[Regen ${type}] Error:`, err);
          toast.error(
            `Failed to regenerate ${type}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      },
    });
  };

  const handleComplexToolClick = (tool: 'rename' | 'gling-edit' | 's3-staging' | 'renumber' | 'relay') => {
    setActiveTool(activeTool === tool ? null : tool);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading recordings..." />;
  }

  if (error) {
    return <ErrorMessage message="Error loading recordings" />;
  }

  if (!data?.recordings || data.recordings.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No recordings found</p>
        <p className="text-sm text-gray-400 mt-1">
          Recordings will appear here after you rename incoming files
        </p>
      </div>
    );
  }

  // Count files by parked status
  const totalFiles = data.recordings.length;
  const parkedFiles = data.recordings.filter((r) => r.isParked).length;
  const activeFiles = totalFiles - parkedFiles;

  return (
    <div className="relative">
      {/* FR-136: Center Content - 896px centered */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats and filter toggle - matching RecordingsView style */}
        <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
          <span className="text-gray-700 font-medium">
            {selectedCount} of {filteredRecordings.length} selected
            <span className="font-normal text-gray-400 ml-1">({formatFileSize(selectedSize)})</span>
            <span className="font-normal text-gray-400 ml-1">
              | {activeFiles} active, {parkedFiles} parked
            </span>
          </span>
          <span className="text-gray-300">|</span>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
            <input
              type="checkbox"
              checked={showParked}
              onChange={(e) => setShowParked(e.target.checked)}
              className="w-3 h-3 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
            />
            Show Parked
          </label>
          <span className="text-gray-300">|</span>
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
              className="text-xs text-gray-600 hover:text-gray-700 px-2 py-0.5 hover:bg-gray-50 rounded transition-colors"
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* FR-136: Bulk Rename moved to slide-out drawer */}

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
                  <div className="h-px bg-gray-300 flex-1" />
                  <span className="text-sm font-semibold px-2 text-gray-700">
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
                      className="text-xs text-gray-500 hover:text-blue-600 px-2 py-0.5 hover:bg-blue-50 rounded transition-colors"
                    >
                      ☐ Deselect{' '}
                      <span className="text-blue-600 font-medium">{chapterData.chapterKey}</span>
                    </button>
                  ) : allSelected ? (
                    <button
                      onClick={() => deselectAllInChapter(chapterData)}
                      className="text-xs text-blue-600 hover:text-gray-500 px-2 py-0.5 hover:bg-gray-50 rounded transition-colors"
                    >
                      ☑ Deselect <span className="font-medium">{chapterData.chapterKey}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => selectAllInChapter(chapterData)}
                      className="text-xs text-gray-500 hover:text-blue-600 px-2 py-0.5 hover:bg-blue-50 rounded transition-colors"
                    >
                      ☐ Select{' '}
                      <span className="text-blue-600 font-medium">{chapterData.chapterKey}</span>
                    </button>
                  )}
                  <div className="h-px bg-gray-300 flex-1" />
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
                      rowClasses = 'bg-pink-50 border-pink-200 text-gray-500';
                      textClasses = 'text-gray-500';
                    } else if (isSelected) {
                      rowClasses = 'bg-blue-50 border-blue-200';
                      textClasses = 'text-gray-700';
                    } else {
                      rowClasses = 'bg-gray-50 border-gray-200';
                      textClasses = 'text-gray-500';
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
                            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
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
                        <span className="text-sm text-gray-400 ml-4">
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
      </div>

      {/* FR-136: Left Sidebar - Fixed in left margin */}
      <div className="fixed left-8 top-32 bottom-8 w-[200px] z-30">
        <ToolsSidebar
          selectedFiles={Array.from(selectedFiles)}
          totalFiles={filteredRecordings.length}
          activeTool={activeTool}
          onSimpleToolClick={handleSimpleToolClick}
          onComplexToolClick={handleComplexToolClick}
          isGitSyncPending={gitSync.isPending}
        />
      </div>

      {/* FR-138: Rename Tool - Full-featured rename drawer */}
      <SlideOutDrawer
        isOpen={activeTool === 'rename'}
        title="Rename Tool"
        onClose={() => setActiveTool(null)}
        width="w-[480px]"
      >
        <RenamePanel
          selectedFiles={Array.from(selectedFiles)}
          onClose={() => setActiveTool(null)}
          onSuccess={() => {
            // Clear selection after successful rename
            setSelectedFiles(new Set());
          }}
        />
      </SlideOutDrawer>

      <SlideOutDrawer
        isOpen={activeTool === 'gling-edit'}
        title="Gling / Edit Prep"
        onClose={() => setActiveTool(null)}
        width="w-[560px]"
      >
        <GlingEditTool />
      </SlideOutDrawer>

      <SlideOutDrawer
        isOpen={activeTool === 's3-staging'}
        title="S3 Staging"
        onClose={() => setActiveTool(null)}
        width="w-[560px]"
      >
        <S3StagingTool />
      </SlideOutDrawer>

      {/* B038: relay collaboration */}
      <SlideOutDrawer
        isOpen={activeTool === 'relay'}
        title="Relay Collaboration"
        onClose={() => setActiveTool(null)}
        width="w-[480px]"
      >
        <RelayTool />
      </SlideOutDrawer>

      <SlideOutDrawer
        isOpen={activeTool === 'renumber'}
        title="Chapter Management"
        onClose={() => setActiveTool(null)}
        width="w-[480px]"
      >
        <ChapterListPanel
          recordings={data.recordings.map((r) => r.filename)}
          onClose={() => setActiveTool(null)}
        />
      </SlideOutDrawer>

      {/* Confirmation Modal */}
      {confirmationModal && (
        <ConfirmationModal
          title={confirmationModal.title}
          message={confirmationModal.message}
          files={confirmationModal.files}
          warning={confirmationModal.warning}
          variant={confirmationModal.variant}
          chapterSettings={modalChapterSettings ?? undefined}
          onChapterSettingsChange={modalChapterSettings ? setModalChapterSettings : undefined}
          onConfirm={confirmationModal.onConfirm}
          onCancel={() => setConfirmationModal(null)}
        />
      )}
    </div>
  );
}
