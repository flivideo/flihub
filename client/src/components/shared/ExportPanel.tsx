/**
 * FR-136: Export Tool Panel
 *
 * Extracted from ManagePanel - handles Gling prep functionality:
 * - Gling filename and dictionary display/copy
 * - Edit folder management (create, open, clean, restore)
 * - File copying and preparation for Gling AI
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  useConfig,
  fetchApi,
  useUpdateProjectDictionary,
  useUpdateGlobalDictionary,
} from '../../hooks/useApi';
import {
  useEditPrep,
  useCreateEditFolders,
  useCreateEditFolder,
  useManifestStatus,
  useCleanEditFolder,
  useRestoreEditFolder,
} from '../../hooks/useEditApi';
import { formatFileSize } from '../../utils/formatting';
import type { EditFolderKey } from '../../../../shared/types';

interface ExportPanelProps {
  selectedFiles: string[];
  selectedCount: number;
}

export function ExportPanel({ selectedFiles, selectedCount }: ExportPanelProps) {
  const { data: config } = useConfig();
  const { data: editPrepData } = useEditPrep();
  const createFolders = useCreateEditFolders();
  const createFolder = useCreateEditFolder();
  const updateProjectDictionary = useUpdateProjectDictionary();
  const updateGlobalDictionary = useUpdateGlobalDictionary();

  const [showGlingInfo, setShowGlingInfo] = useState(true);
  const [globalDictionary, setGlobalDictionary] = useState('');
  const [projectDictionary, setProjectDictionary] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingProject, setSavingProject] = useState(false);

  // Initialize local state from API data
  useEffect(() => {
    if (editPrepData?.globalDictionary) {
      setGlobalDictionary(editPrepData.globalDictionary.join('\n'));
    }
  }, [editPrepData?.globalDictionary]);

  useEffect(() => {
    if (editPrepData?.projectDictionary) {
      setProjectDictionary(editPrepData.projectDictionary.join('\n'));
    }
  }, [editPrepData?.projectDictionary]);

  // Save global dictionary when user leaves the text box
  const handleSaveGlobal = () => {
    if (!editPrepData?.globalDictionary) return;

    const currentWords = globalDictionary
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    const originalWords = editPrepData.globalDictionary;

    // Check if changed
    if (JSON.stringify(currentWords) === JSON.stringify(originalWords)) return;

    setSavingGlobal(true);
    const startTime = Date.now();

    updateGlobalDictionary.mutate(currentWords, {
      onSuccess: () => {
        // Show "Saving..." for at least 500ms so user can see it
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 500 - elapsed);
        setTimeout(() => setSavingGlobal(false), delay);
      },
      onError: () => {
        toast.error('Failed to save global dictionary');
        setSavingGlobal(false);
      },
    });
  };

  // Save project dictionary when user leaves the text box
  const handleSaveProject = () => {
    const activeProject = config?.activeProject;
    if (!activeProject || !editPrepData?.projectDictionary) return;

    const currentWords = projectDictionary
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    const originalWords = editPrepData.projectDictionary;

    // Check if changed
    if (JSON.stringify(currentWords) === JSON.stringify(originalWords)) return;

    setSavingProject(true);
    const startTime = Date.now();

    updateProjectDictionary.mutate(
      { projectCode: activeProject, words: currentWords },
      {
        onSuccess: () => {
          // Show "Saving..." for at least 500ms so user can see it
          const elapsed = Date.now() - startTime;
          const delay = Math.max(0, 500 - elapsed);
          setTimeout(() => setSavingProject(false), delay);
        },
        onError: () => {
          toast.error('Failed to save project dictionary');
          setSavingProject(false);
        },
      }
    );
  };

  // Copy file list to clipboard
  const handleCopyFileList = async () => {
    if (!config?.projectDirectory) {
      toast.error('No project directory configured');
      return;
    }

    if (selectedCount === 0) {
      toast.error('No files selected');
      return;
    }

    // Note: This should receive file paths from parent, but for now we'll show a message
    toast.info('Copy file list - implementation depends on parent providing full file data');
  };

  // Prepare for Gling - copy files to edit-1st folder
  const handlePrepareForGling = async () => {
    if (!config?.projectDirectory) {
      toast.error('No project directory configured');
      return;
    }

    if (selectedCount === 0) {
      toast.error('No files selected');
      return;
    }

    setIsCopying(true);
    try {
      const response = await fetchApi<{ success: boolean; copied: string[]; error?: string }>(
        '/api/export/copy-to-gling',
        {
          method: 'POST',
          body: JSON.stringify({
            files: selectedFiles,
          }),
        }
      );

      if (response.success) {
        toast.success(`Copied ${response.copied.length} files to edit-1st folder`);
      } else {
        toast.error(response.error || 'Failed to copy files');
      }
    } catch (_err) {
      toast.error('Failed to prepare files for Gling');
    } finally {
      setIsCopying(false);
    }
  };

  // FR-124: Copy Gling filename
  const handleCopyFilename = async () => {
    if (!editPrepData?.glingFilename) return;
    try {
      await navigator.clipboard.writeText(editPrepData.glingFilename);
      toast.success('Filename copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  // FR-125: Copy global dictionary
  const handleCopyGlobal = async () => {
    if (!globalDictionary.trim()) return;
    try {
      await navigator.clipboard.writeText(globalDictionary);
      const wordCount = globalDictionary.split('\n').filter((w) => w.trim()).length;
      toast.success(`Copied ${wordCount} global words`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // FR-125: Copy project dictionary
  const handleCopyProject = async () => {
    if (!projectDictionary.trim()) return;
    try {
      await navigator.clipboard.writeText(projectDictionary);
      const wordCount = projectDictionary.split('\n').filter((w) => w.trim()).length;
      toast.success(`Copied ${wordCount} project words`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // FR-125: Copy combined dictionary
  const handleCopyCombined = async () => {
    if (!editPrepData?.glingDictionary?.length) return;
    try {
      await navigator.clipboard.writeText(editPrepData.glingDictionary.join('\n'));
      toast.success(`Copied ${editPrepData.glingDictionary.length} words (combined)`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // FR-124: Open folder in Finder
  const handleOpenFolder = async (folder: string) => {
    try {
      const response = await fetchApi<{ success: boolean; error?: string }>(
        '/api/system/open-folder',
        {
          method: 'POST',
          body: JSON.stringify({ folder }),
        }
      );
      if (!response.success) {
        toast.error(response.error || 'Failed to open folder');
      }
    } catch (_err) {
      toast.error('Failed to open folder');
    }
  };

  // FR-124: Create all edit folders
  const handleCreateFolders = () => {
    createFolders.mutate();
  };

  // FR-124: Create a single edit folder
  const handleCreateFolder = (folderName: string) => {
    createFolder.mutate(folderName);
  };

  // FR-126: Manifest status component for a single folder
  const FolderManifestStatus = ({ folder }: { folder: EditFolderKey }) => {
    const { data: manifestData } = useManifestStatus(folder);
    const cleanFolder = useCleanEditFolder();
    const restoreFolder = useRestoreEditFolder();

    if (!manifestData?.success || manifestData.detail.status === 'no-manifest') {
      return null;
    }

    const { detail } = manifestData;
    const statusEmoji = {
      present: '🟢',
      cleaned: '🔴',
      changed: '⚠️',
      missing: '❌',
      'no-manifest': '',
    }[detail.status];

    const statusText = {
      present: `Present (${formatFileSize(detail.totalSize)})`,
      cleaned: 'Cleaned',
      changed: `Changed (${detail.changedFiles} files)`,
      missing: `Missing (${detail.missingFiles} files)`,
      'no-manifest': '',
    }[detail.status];

    const handleClean = async () => {
      const confirmed = window.confirm(
        `Delete ${detail.manifestedFiles} source files from ${folder}?\n\n` +
          `This will free up ${formatFileSize(detail.totalSize)}.\n\n` +
          `Gling outputs will be preserved.\n` +
          `You can restore these files later from recordings/.`
      );

      if (!confirmed) return;

      try {
        const result = await cleanFolder.mutateAsync(folder);
        if (result.success) {
          toast.success(
            `Cleaned ${result.deletedCount} files (${formatFileSize(result.spaceSaved)} freed)`
          );
        } else {
          toast.error(result.error || 'Failed to clean folder');
        }
      } catch {
        toast.error('Failed to clean folder');
      }
    };

    const handleRestore = async () => {
      try {
        const result = await restoreFolder.mutateAsync(folder);
        if (result.success) {
          if (result.warnings && result.warnings.length > 0) {
            toast.warning(
              `Restored ${result.restoredCount} files with ${result.warnings.length} warnings`,
              { duration: 5000 }
            );
          } else {
            toast.success(`Restored ${result.restoredCount} files`);
          }
        } else {
          toast.error(result.error || 'Failed to restore files');
        }
      } catch {
        toast.error('Failed to restore files');
      }
    };

    return (
      <div className="mt-2 pl-6 text-xs space-y-1">
        <div className="flex items-center gap-2 text-gray-600">
          <span>📋 Manifest:</span>
          <span className="font-medium">{detail.manifestedFiles} files tracked</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Source files:</span>
          <span className="font-medium">
            {statusEmoji} {statusText}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {detail.status === 'present' && (
            <button
              onClick={handleClean}
              disabled={cleanFolder.isPending}
              className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {cleanFolder.isPending ? 'Cleaning...' : 'Clean Edit Folder'}
            </button>
          )}
          {(detail.status === 'cleaned' || detail.status === 'changed') && (
            <button
              onClick={handleRestore}
              disabled={restoreFolder.isPending || (detail.status as string) === 'missing'}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {restoreFolder.isPending ? 'Restoring...' : 'Restore for Gling'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* FR-124: Gling Prep Info (collapsible) */}
      {editPrepData?.success && (
        <div className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setShowGlingInfo(!showGlingInfo)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-px bg-gray-300 w-8" />
              <span className="text-sm font-semibold text-gray-700">Gling Prep Info</span>
              <div className="h-px bg-gray-300 flex-1" />
            </div>
            <span className="text-gray-400">{showGlingInfo ? '▼' : '▶'}</span>
          </button>

          {showGlingInfo && (
            <div className="px-4 pb-4 space-y-3">
              {/* Filename */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Gling Filename
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 font-mono text-sm text-gray-800">
                    {editPrepData.glingFilename}
                  </div>
                  <button
                    onClick={handleCopyFilename}
                    className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* FR-125: Dictionary - split into Global / Project / Combined */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                  Dictionary
                </label>

                {/* Global Dictionary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        Global: {globalDictionary.split('\n').filter((w) => w.trim()).length} words
                      </span>
                      {savingGlobal && <span className="text-xs text-blue-600">Saving...</span>}
                    </div>
                    <button
                      onClick={handleCopyGlobal}
                      disabled={!globalDictionary.trim()}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <textarea
                    value={globalDictionary}
                    onChange={(e) => setGlobalDictionary(e.target.value)}
                    onBlur={handleSaveGlobal}
                    rows={5}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add global dictionary words (one per line)..."
                  />
                </div>

                {/* Project Dictionary */}
                <div className="space-y-2 border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        Project: {projectDictionary.split('\n').filter((w) => w.trim()).length}{' '}
                        words
                      </span>
                      {config?.activeProject && (
                        <span className="text-xs text-blue-600 font-mono">
                          ({config.activeProject})
                        </span>
                      )}
                      {savingProject && <span className="text-xs text-blue-600">Saving...</span>}
                    </div>
                    <button
                      onClick={handleCopyProject}
                      disabled={!projectDictionary.trim()}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <textarea
                    value={projectDictionary}
                    onChange={(e) => setProjectDictionary(e.target.value)}
                    onBlur={handleSaveProject}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add project dictionary words (one per line)..."
                  />
                </div>

                {/* Combined Dictionary */}
                <div className="space-y-2 border-t border-gray-300 pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 font-medium">
                      Combined: {editPrepData.glingDictionary?.length || 0} words
                    </span>
                    <button
                      onClick={handleCopyCombined}
                      disabled={!editPrepData.glingDictionary?.length}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Copy All
                    </button>
                  </div>
                  <textarea
                    value={editPrepData.glingDictionary?.join('\n') || ''}
                    readOnly
                    rows={5}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-50 font-mono resize-none focus:outline-none"
                    placeholder="No dictionary words..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FR-124: Edit Folders Section */}
      {editPrepData?.success && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px bg-gray-300 w-8" />
            <span className="text-sm font-semibold text-gray-700">Edit Folders</span>
            <div className="h-px bg-gray-300 flex-1" />
          </div>

          <div className="space-y-3">
            {editPrepData.editFolders.folders.map((folder) => {
              const exists = folder.exists;
              return (
                <div key={folder.name}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={exists ? 'text-green-500' : 'text-gray-300'}>
                        {exists ? '✓' : '○'}
                      </span>
                      <span
                        className={exists ? 'text-gray-700 font-mono' : 'text-gray-400 font-mono'}
                      >
                        {folder.name}/
                      </span>
                      <span className="text-xs text-gray-400">
                        {folder.name === 'edit-1st' && '← Gling exports'}
                        {folder.name === 'edit-2nd' && "← Jan's edits"}
                        {folder.name === 'edit-final' && '← Final publish'}
                      </span>
                    </div>
                    {exists ? (
                      <button
                        onClick={() => handleOpenFolder(folder.name)}
                        className="px-3 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        Open
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCreateFolder(folder.name)}
                        disabled={createFolder.isPending}
                        className="px-3 py-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                      >
                        Create
                      </button>
                    )}
                  </div>
                  {/* FR-126: Manifest status for this folder */}
                  {exists && <FolderManifestStatus folder={folder.name as EditFolderKey} />}
                </div>
              );
            })}
          </div>

          {!editPrepData.editFolders.allExist && (
            <button
              onClick={handleCreateFolders}
              disabled={createFolders.isPending}
              className="mt-3 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {createFolders.isPending ? 'Creating...' : 'Create All Folders'}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
        <button
          onClick={handleCopyFileList}
          disabled={selectedCount === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <span>📋</span>
          <span>Copy File List</span>
        </button>

        <button
          onClick={handlePrepareForGling}
          disabled={selectedCount === 0 || isCopying}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
        >
          {isCopying ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Copying...</span>
            </>
          ) : (
            <>
              <span>📁</span>
              <span>Prepare for Gling</span>
            </>
          )}
        </button>

        {/* FR-124: Smart Open/Create button for edit-1st */}
        {editPrepData?.editFolders.folders.find((f) => f.name === 'edit-1st')?.exists ? (
          <button
            onClick={() => handleOpenFolder('edit-1st')}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span>📂</span>
            <span>Open Folder</span>
          </button>
        ) : (
          <button
            onClick={handleCreateFolders}
            disabled={createFolders.isPending}
            className="px-4 py-2 text-sm text-green-700 bg-green-50 border border-green-300 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <span>📂</span>
            <span>{createFolders.isPending ? 'Creating...' : 'Create Folder'}</span>
          </button>
        )}

        <div className="flex-1" />

        <span className="text-xs text-gray-500">
          First Edit Prep: <span className="font-mono">{config?.projectDirectory}/edit-1st/</span>
        </span>
      </div>
    </div>
  );
}
