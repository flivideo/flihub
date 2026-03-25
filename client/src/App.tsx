import { useState, useCallback, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { useSocket, useRecordingsSocket, useDeveloperSocket, useRelaySocket } from './hooks/useSocket';
import {
  useConfig,
  useSuggestedNaming,
  useTrashFile,
  useProjects,
  useUpdateConfig,
  useRefetchSuggestedNaming,
  useRecentRenames,
  useUndoRename,
  useRecordings,
} from './hooks/useApi';
import { useBestTake } from './hooks/useBestTake';
import { discardFiles } from './utils/fileActions';
import { collapsePath } from './utils/formatting';
import { FileCard } from './components/FileCard';
import { ConfigPanel } from './components/ConfigPanel';
import { ProjectsPanel } from './components/ProjectsPanel';
import { NamingControls } from './components/NamingControls';
import { DiscardModal } from './components/DiscardModal';
import { RecordingsView } from './components/RecordingsView';
import { AssetsPage } from './components/AssetsPage';
import { ThumbsPage } from './components/ThumbsPage';
import { TranscriptionsPage } from './components/TranscriptionsPage';
import { InboxPage } from './components/InboxPage';
import { MockupsPage } from './components/MockupsPage';
import { WatchPage } from './components/WatchPage';
// FR-141: S3StagingPage removed - consolidated into ExportS3Tool in Manage panel
import { ManagePanel } from './components/ManagePanel';
// B045: PoemWuiPage moved into ManagePanel as AWB tool
import { ChapterContextPanel } from './components/ChapterContextPanel';
import { ConnectionIndicator } from './components/ConnectionIndicator';
import { OpenFolderButton, SyncIndicator, RelayIndicator } from './components/shared';
import { HeaderDropdown } from './components/HeaderDropdown';
import { RecentlyNamedStrip } from './components/RecentlyNamedStrip';
import { useOpenFolder } from './hooks/useOpenFolder';
import ApiExplorer from './components/ApiExplorer';
import DeveloperDrawer from './components/DeveloperDrawer';
import type { FileInfo } from '../../shared/types';

type ViewTab =
  | 'incoming'
  | 'recordings'
  | 'watch'
  | 'transcriptions'
  | 'inbox'
  | 'assets'
  | 'thumbs'
  | 'export'
  | 'projects'
  | 'config'
  | 'mockups'
  | 'api-explorer';

const VALID_TABS: ViewTab[] = [
  'incoming',
  'recordings',
  'watch',
  'transcriptions',
  'inbox',
  'assets',
  'thumbs',
  'export',
  'projects',
  'config',
  'mockups',
  'api-explorer',
];

// FR-116: Config section focus targets
export type ConfigFocusSection = 'common-names' | null;

// Get initial tab from URL hash
function getTabFromHash(): ViewTab {
  const hash = window.location.hash.slice(1); // remove #
  if (VALID_TABS.includes(hash as ViewTab)) {
    return hash as ViewTab;
  }
  return 'incoming';
}

export interface NamingState {
  chapter: string;
  sequence: string;
  name: string;
  tags: string[];
  customTag: string; // FR-21: One-off custom tag input
}

const DEFAULT_NAMING_STATE: NamingState = {
  chapter: '01',
  sequence: '1',
  name: 'intro',
  tags: [],
  customTag: '',
};

function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>(getTabFromHash);

  // Sync tab changes to URL hash
  const changeTab = useCallback((tab: ViewTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [renamedFilePath, setRenamedFilePath] = useState<string | null>(null);
  // FR-43: Project switcher dropdown state
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  // FR-141: S3 Staging modal removed - consolidated into Manage panel
  // FR-116: Config section focus (for quick navigation from other pages)
  const [configFocusSection, setConfigFocusSection] = useState<ConfigFocusSection>(null);
  // FR-127: Developer drawer state
  const [isDevDrawerOpen, setIsDevDrawerOpen] = useState(false);
  // B044: Manage tool navigation (for SyncIndicator click-through)
  const [manageTool, setManageTool] = useState<string | null>(null);

  const { files, connected, isReconnecting, removeFile } = useSocket();
  const { data: config } = useConfig();
  const trashMutation = useTrashFile();

  // FR-43: Project switching hooks
  const { data: projectsData } = useProjects();
  const updateConfig = useUpdateConfig();
  const refetchSuggestedNaming = useRefetchSuggestedNaming();

  // FR-50: Recent renames for undo functionality
  const { data: recentRenames, refetch: refetchRecentRenames } = useRecentRenames();
  const undoRenameMutation = useUndoRename();

  // FR-69: Open project folder in Finder
  const { mutate: openFolder } = useOpenFolder();

  // FR-4: Get suggested naming based on existing files
  const { data: suggestedNaming } = useSuggestedNaming();
  // FR-112: Get recordings to calculate highest chapter
  const { data: recordingsData } = useRecordings();
  // FR-115: Real-time updates for recordings (invalidates cache on socket event)
  useRecordingsSocket();
  useRelaySocket();  // B046: relay change notifications
  // FR-127: Real-time updates for developer tools (invalidates cache on socket event)
  useDeveloperSocket();
  // NFR-6: Track project directory changes
  const previousProjectDir = useRef<string | undefined>(undefined);

  // Shared naming state (FR-1: defaults to 01, 1, intro)
  const [namingState, setNamingState] = useState<NamingState>(DEFAULT_NAMING_STATE);
  // FR-112: Track New Chapter clicks for glow detection
  const [newChapterClickCount, setNewChapterClickCount] = useState(0);

  // FR-4: Apply suggested naming when project directory changes or on initial load
  // NFR-6: Renamed from targetDirectory to projectDirectory
  useEffect(() => {
    if (suggestedNaming) {
      const isInitialLoad = previousProjectDir.current === undefined;
      const projectDirChanged = previousProjectDir.current !== config?.projectDirectory;

      if (isInitialLoad || projectDirChanged) {
        setNamingState({
          chapter: suggestedNaming.chapter,
          sequence: suggestedNaming.sequence,
          name: suggestedNaming.name,
          tags: [],
          customTag: '',
        });

        if (!isInitialLoad && projectDirChanged && suggestedNaming.existingFiles.length > 0) {
          toast.info(
            `Found ${suggestedNaming.existingFiles.length} existing files, updated naming`
          );
        }
      }

      previousProjectDir.current = config?.projectDirectory;
    }
  }, [
    suggestedNaming,
    config?.projectDirectory,
    config?.activeProject,
    config?.projectsRootDirectory,
  ]);

  // FR-2: Increment sequence after successful rename
  // FR-16: Show discard modal if other files remain
  // FR-54: Custom tag now persists after rename (user must clear manually)
  const handleRenamed = useCallback(
    (filePath: string) => {
      removeFile(filePath);
      setNamingState((prev) => {
        return {
          ...prev,
          sequence: String(parseInt(prev.sequence || '0', 10) + 1),
        };
      });

      // FR-16: Check if other files remain (files state hasn't updated yet, so subtract 1)
      const remainingCount = files.length - 1;
      if (remainingCount > 0) {
        setRenamedFilePath(filePath);
        setShowDiscardModal(true);
      }
    },
    [removeFile, files.length]
  );

  // FR-16: Discard remaining files after rename (excludes just-renamed file)
  const handleDiscardRemaining = useCallback(async () => {
    setShowDiscardModal(false);
    const remainingFiles = files.filter((f) => f.path !== renamedFilePath);
    const filePaths = remainingFiles.map((f) => f.path);

    const result = await discardFiles(filePaths, trashMutation, removeFile);
    toast.info(`Moved ${result.successCount} file(s) to trash`);
    setRenamedFilePath(null);
  }, [files, renamedFilePath, trashMutation, removeFile]);

  // Discard all files (for "Discard All" button)
  const handleDiscardAll = useCallback(async () => {
    const filePaths = files.map((f) => f.path);
    const result = await discardFiles(filePaths, trashMutation, removeFile);
    toast.info(`Moved ${result.successCount} file(s) to trash`);
  }, [files, trashMutation, removeFile]);

  const handleCancelDiscard = useCallback(() => {
    setShowDiscardModal(false);
    setRenamedFilePath(null);
  }, []);

  // FR-43: Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false);
      }
    };
    if (showProjectDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProjectDropdown]);

  // FR-43: Get pinned projects for dropdown
  const pinnedProjects = projectsData?.projects?.filter((p) => p.priority === 'pinned') || [];
  // FR-93: Use activeProject for cross-platform support (split('/') doesn't work on Windows backslash paths)
  const currentProjectCode =
    config?.activeProject || config?.projectDirectory?.split(/[/\\]/).pop() || '';

  // FR-43: Switch to a different project
  // FR-93: Use regex split for cross-platform path support
  const handleSwitchProject = useCallback(
    async (projectPath: string) => {
      try {
        await updateConfig.mutateAsync({ projectDirectory: projectPath });
        refetchSuggestedNaming();
        setShowProjectDropdown(false);
        toast.success(`Switched to ${projectPath.split(/[/\\]/).pop()}`);
      } catch (_err) {
        toast.error('Failed to switch project');
      }
    },
    [updateConfig, refetchSuggestedNaming]
  );

  // FR-50: Undo a recent rename
  const handleUndoRename = useCallback(
    async (id: string) => {
      try {
        const result = await undoRenameMutation.mutateAsync(id);
        if (result.success) {
          toast.success(`Undone: ${result.originalName}`);
          refetchRecentRenames();
        } else {
          toast.error(result.error || 'Failed to undo rename');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to undo rename');
      }
    },
    [undoRenameMutation, refetchRecentRenames]
  );

  // FR-51: Copy project info for calendar
  // FR-93: Use currentProjectCode for cross-platform support
  // FR-101: Format as "b85 > Clauding 01" (not "b85 - clauding-01")
  const handleCopyCalendar = useCallback(async () => {
    if (!currentProjectCode) return;

    // Extract code (e.g., "b76") and name (e.g., "vibe-code-auto-chapters")
    const parts = currentProjectCode.split('-');
    const code = parts[0]; // e.g., "b76"
    const nameParts = parts.slice(1);
    // Take first 3-4 segments if name is very long
    const shortName = nameParts.length > 4 ? nameParts.slice(0, 4).join('-') : nameParts.join('-');

    // Convert kebab-case to Title Case
    const titleName = shortName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const text = `${code} > ${titleName}`;

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, [currentProjectCode]);

  // FR-116: Navigate to Config tab with focus on a specific section
  const handleNavigateToConfig = useCallback(
    (section: ConfigFocusSection) => {
      setConfigFocusSection(section);
      changeTab('config');
    },
    [changeTab]
  );

  // FR-3: New Chapter button
  // FR-112: Calculate next chapter from highest recorded chapter (idempotent)
  // Preserve the name from previous chapter - user can change if needed
  const handleNewChapter = useCallback(() => {
    // FR-112: Increment click counter for glow detection in NamingControls
    setNewChapterClickCount((c) => c + 1);
    setNamingState((prev) => {
      // FR-112: Calculate highest recorded chapter from project recordings
      const recordings = recordingsData?.recordings || [];
      const chapters = recordings
        .map((r) => parseInt(r.chapter || '0', 10))
        .filter((ch) => !isNaN(ch) && ch > 0);
      const highestRecordedChapter = chapters.length > 0 ? Math.max(...chapters) : 0;
      const nextChapter = String(Math.min(99, highestRecordedChapter + 1)).padStart(2, '0');

      const newState = {
        chapter: nextChapter,
        sequence: '1',
        name: prev.name || 'intro', // Preserve previous name, default to 'intro'
        tags: [],
        customTag: '',
      };
      return newState;
    });
  }, [recordingsData]);

  // Update individual naming fields
  const updateNaming = useCallback((field: keyof NamingState, value: string | string[]) => {
    setNamingState((prev) => ({ ...prev, [field]: value }));
  }, []);

  // FR-8: Best take detection (extracted to hook)
  const { bestTakePath, goodTakePath } = useBestTake(files);

  // FR-16: Calculate remaining files for modal (exclude the one just renamed)
  const remainingFilesCount = renamedFilePath
    ? files.filter((f) => f.path !== renamedFilePath).length
    : files.length;

  return (
    <div className="min-h-screen bg-page">
      <Toaster position="top-right" richColors />

      {/* FR-16: Discard remaining files modal */}
      {showDiscardModal && (
        <DiscardModal
          remainingCount={remainingFilesCount}
          onConfirm={handleDiscardRemaining}
          onCancel={handleCancelDiscard}
        />
      )}

      {/* FR-127: Developer drawer */}
      <DeveloperDrawer isOpen={isDevDrawerOpen} onClose={() => setIsDevDrawerOpen(false)} />

      {/* FR-37: Two-row header with breadcrumb and navigation */}
      <header className="bg-warm-header shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          {/* Top row: Title › Project name ▾ ... ⚙ */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xl font-semibold text-warm-primary flex-shrink-0">FliHub</h1>
              {config?.activeProject && (
                <>
                  <span className="text-warm-muted flex-shrink-0">›</span>
                  {/* FR-43: Project switcher dropdown */}
                  <div className="relative flex items-center gap-1" ref={projectDropdownRef}>
                    <button
                      onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                      className="flex items-center gap-1 text-lg font-medium text-blue-600 hover:text-blue-800 truncate transition-colors"
                      title={config.projectDirectory}
                    >
                      {/* FR-93: Use currentProjectCode for cross-platform support */}
                      <span className="truncate">{currentProjectCode}</span>
                      {pinnedProjects.length > 0 && (
                        <span className="text-warm-muted flex-shrink-0">▾</span>
                      )}
                    </button>
                    {/* FR-69: Project Actions dropdown */}
                    <HeaderDropdown
                      trigger={<span className="text-lg font-medium">···</span>}
                      items={[
                        {
                          label: 'Copy for calendar',
                          icon: '📋',
                          onClick: handleCopyCalendar,
                        },
                        {
                          label: 'Copy full path',
                          icon: <span className="text-xs font-mono">&gt;_</span>,
                          onClick: async () => {
                            if (config?.projectDirectory) {
                              try {
                                await navigator.clipboard.writeText(config.projectDirectory);
                                toast.success('Path copied');
                              } catch {
                                toast.error('Failed to copy');
                              }
                            }
                          },
                        },
                        {
                          label: 'Open in Finder',
                          icon: '📂',
                          onClick: () => openFolder('project'),
                          dividerBefore: true,
                        },
                      ]}
                    />

                    {/* FR-43: Dropdown menu */}
                    {showProjectDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-surface border border-warm rounded-lg shadow-lg z-50 min-w-[280px] max-w-[400px]">
                        {pinnedProjects.length > 0 ? (
                          <>
                            <div className="py-1">
                              {pinnedProjects.map((project) => (
                                <button
                                  key={project.code}
                                  onClick={() => handleSwitchProject(project.path)}
                                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-surface-hover transition-colors ${
                                    project.code === currentProjectCode ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  <span className="text-warm-muted flex-shrink-0">⭐</span>
                                  <span className="truncate flex-grow">{project.code}</span>
                                  {project.code === currentProjectCode && (
                                    <span className="text-blue-600 flex-shrink-0">✓</span>
                                  )}
                                </button>
                              ))}
                            </div>
                            <div className="border-t border-warm">
                              <button
                                onClick={() => {
                                  setShowProjectDropdown(false);
                                  changeTab('projects');
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-warm-secondary hover:bg-surface-hover transition-colors"
                              >
                                All projects...
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setShowProjectDropdown(false);
                              changeTab('projects');
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-warm-secondary hover:bg-surface-hover transition-colors"
                          >
                            All projects...
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* B044: Persistent sync indicators */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <SyncIndicator onNavigateToSync={() => {
                changeTab('export');
                setManageTool('sync');
              }} />
              <RelayIndicator onNavigateToRelay={() => {
                changeTab('export');
                setManageTool('relay');
              }} />
              <div className="w-px h-5 bg-warm-divider" />
            </div>
            {/* FR-69: Settings dropdown */}
            <HeaderDropdown
              trigger={
                <svg
                  className={`w-5 h-5 ${activeTab === 'config' || activeTab === 'mockups' || activeTab === 'api-explorer' ? 'text-blue-600' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              }
              align="right"
              items={[
                {
                  label: 'Configuration',
                  icon: <span className="text-warm-secondary">⚙️</span>,
                  onClick: () => changeTab('config'),
                },
                {
                  label: 'Mockups',
                  icon: <span className="text-purple-500">🎨</span>,
                  onClick: () => changeTab('mockups'),
                },
                {
                  label: 'API Explorer',
                  icon: <span className="text-green-600">🔌</span>,
                  onClick: () => changeTab('api-explorer'),
                },
                {
                  label: 'Developer Tools',
                  icon: <span className="text-blue-600">🔍</span>,
                  onClick: () => setIsDevDrawerOpen(true),
                },
                {
                  label: 'GitHub',
                  icon: <span className="text-warm-secondary">🔗</span>,
                  onClick: () => window.open('https://github.com/flivideo/flihub', '_blank'),
                  dividerBefore: true,
                },
                {
                  label: 'Video Projects',
                  icon: <span className="text-warm-secondary">🎬</span>,
                  onClick: () =>
                    window.open('https://github.com/appydave-video-projects/v-appydave', '_blank'),
                },
              ]}
            />
          </div>

          {/* Bottom row: Navigation (FR-69: Config and Mockups moved to Settings dropdown) */}
          <nav className="flex gap-4 pb-3 border-t border-warm pt-2">
            <button
              onClick={() => changeTab('incoming')}
              className={`text-sm transition-colors ${
                activeTab === 'incoming'
                  ? 'text-blue-600 font-medium'
                  : 'text-warm-muted hover:text-warm-secondary'
              }`}
            >
              Incoming
              {files.length > 0 && (
                <span className="ml-1.5 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                  {files.length}
                </span>
              )}
            </button>
            <button
              onClick={() => changeTab('recordings')}
              className={`text-sm transition-colors ${
                activeTab === 'recordings'
                  ? 'text-blue-600 font-medium'
                  : 'text-warm-muted hover:text-warm-secondary'
              }`}
            >
              Recordings
            </button>
            <button
              onClick={() => changeTab('watch')}
              className={`text-sm transition-colors ${
                activeTab === 'watch'
                  ? 'text-blue-600 font-medium'
                  : 'text-warm-muted hover:text-warm-secondary'
              }`}
            >
              Watch
            </button>
            <button
              onClick={() => changeTab('transcriptions')}
              className={`text-sm transition-colors ${
                activeTab === 'transcriptions'
                  ? 'text-blue-600 font-medium'
                  : 'text-warm-muted hover:text-warm-secondary'
              }`}
            >
              Transcripts
            </button>
            <button
              onClick={() => changeTab('inbox')}
              className={`text-sm transition-colors ${
                activeTab === 'inbox'
                  ? 'text-blue-600 font-medium'
                  : 'text-warm-muted hover:text-warm-secondary'
              }`}
            >
              Inbox
            </button>
            <button
              onClick={() => changeTab('assets')}
              className={`text-sm transition-colors ${
                activeTab === 'assets'
                  ? 'text-blue-600 font-medium'
                  : 'text-warm-muted hover:text-warm-secondary'
              }`}
            >
              Assets
            </button>
            <button
              onClick={() => changeTab('thumbs')}
              className={`text-sm transition-colors ${
                activeTab === 'thumbs'
                  ? 'text-blue-600 font-medium'
                  : 'text-warm-muted hover:text-warm-secondary'
              }`}
            >
              Thumbs
            </button>
            <button
              onClick={() => changeTab('export')}
              className={`text-sm transition-colors ${
                activeTab === 'export'
                  ? 'text-blue-600 font-medium'
                  : 'text-warm-muted hover:text-warm-secondary'
              }`}
              title="Bulk operations, export to Gling, file regeneration, edit folder management"
            >
              Manage
            </button>
            <button
              onClick={() => changeTab('projects')}
              className={`text-sm transition-colors ${
                activeTab === 'projects'
                  ? 'text-blue-600 font-medium'
                  : 'text-warm-muted hover:text-warm-secondary'
              }`}
            >
              Projects
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Incoming Tab */}
        {activeTab === 'incoming' && (
          <>
            {/* Naming Controls - shared state with New Chapter button */}
            <NamingControls
              namingState={namingState}
              updateNaming={updateNaming}
              onNewChapter={handleNewChapter}
              availableTags={config?.availableTags}
              commonNames={config?.commonNames}
              newChapterClickCount={newChapterClickCount}
              onAddCommonName={() => handleNavigateToConfig('common-names')}
            />

            {/* Incoming Files */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-medium text-warm-secondary">Incoming Files</h2>
                  <OpenFolderButton folder="ecamm" />
                </div>
                {files.length > 0 && (
                  <button
                    onClick={handleDiscardAll}
                    className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                  >
                    Discard All
                  </button>
                )}
              </div>

              {files.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-lg border border-warm">
                  <p className="text-warm-muted">No pending files</p>
                  <p className="text-sm text-warm-muted mt-1">Watching for new .mov files...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {files.map((file: FileInfo) => (
                    <FileCard
                      key={file.path}
                      file={file}
                      namingState={namingState}
                      onRenamed={() => handleRenamed(file.path)}
                      onDiscarded={() => removeFile(file.path)}
                      takeRank={
                        files.length > 1
                          ? file.path === bestTakePath
                            ? 'best'
                            : file.path === goodTakePath
                              ? 'good'
                              : null
                          : null
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Recently Named — playable card strip with undo */}
            {recentRenames?.renames && (
              <RecentlyNamedStrip
                renames={recentRenames.renames}
                projectCode={config?.activeProject || ''}
                onUndo={handleUndoRename}
                undoPending={undoRenameMutation.isPending}
              />
            )}
          </>
        )}

        {/* Recordings Tab */}
        {activeTab === 'recordings' && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-medium text-warm-secondary">Project Recordings</h2>
              <OpenFolderButton folder="recordings" label="Recordings" />
              <OpenFolderButton folder="safe" label="Safe" />
            </div>
            <RecordingsView />
          </section>
        )}

        {/* FR-70: Watch Tab - Video playback */}
        {activeTab === 'watch' && (
          <section>
            <WatchPage />
          </section>
        )}

        {/* Transcriptions Tab */}
        {activeTab === 'transcriptions' && (
          <section>
            <TranscriptionsPage />
          </section>
        )}

        {/* Inbox Tab - FR-59 */}
        {activeTab === 'inbox' && (
          <section>
            <InboxPage />
          </section>
        )}

        {/* Assets Tab */}
        {activeTab === 'assets' && (
          <section>
            <h2 className="text-lg font-medium text-warm-secondary mb-4">Image Assets</h2>
            <AssetsPage />
          </section>
        )}

        {/* Thumbs Tab */}
        {activeTab === 'thumbs' && (
          <section>
            <h2 className="text-lg font-medium text-warm-secondary mb-4">YouTube Thumbnails</h2>
            <ThumbsPage />
          </section>
        )}

        {/* FR-131: Manage Tab (formerly Export) */}
        {activeTab === 'export' && (
          <section>
            <ManagePanel initialTool={manageTool} onToolActivated={() => setManageTool(null)} />
          </section>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <section>
            <ProjectsPanel onNavigateToTab={changeTab} />
          </section>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <section>
            <h2 className="text-lg font-medium text-warm-secondary mb-4">Configuration</h2>
            <ConfigPanel
              focusSection={configFocusSection}
              onFocusSectionHandled={() => setConfigFocusSection(null)}
            />
          </section>
        )}

        {/* Mockups Tab - UI concept exploration */}
        {activeTab === 'mockups' && (
          <section>
            <MockupsPage />
          </section>
        )}

        {/* API Explorer Tab - FR-119 */}
        {activeTab === 'api-explorer' && (
          <section>
            <h2 className="text-lg font-medium text-warm-secondary mb-4">API Explorer</h2>
            <ApiExplorer currentProject={currentProjectCode} />
          </section>
        )}

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-warm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-warm-muted">
              Project:{' '}
              {config?.projectDirectory ? collapsePath(config.projectDirectory) : 'Loading...'}
            </p>
            <ConnectionIndicator isConnected={connected} isReconnecting={isReconnecting} />
          </div>
        </footer>
      </main>

      {/* FR-115: Floating Chapter Context Panel - only on Incoming tab */}
      {/* Positioned just outside the max-w-4xl (56rem/896px) centered content */}
      {activeTab === 'incoming' && (
        <div className="fixed left-[calc(50%+29rem)] top-32 z-40">
          <ChapterContextPanel recordings={recordingsData?.recordings || []} />
        </div>
      )}
    </div>
  );
}

export default App;
