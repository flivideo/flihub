/**
 * FR-142: Gling / Edit Prep Tool
 *
 * Split from ExportS3Tool (FR-141). Local editing workflow:
 * - Gling Preparation (Copy Folder Path + Open in Finder)
 * - Gling Info (filename + dictionaries)
 * - Edit Folders (create, open)
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
} from '../../hooks/useEditApi';
import { API_URL } from '../../config';

export function GlingEditTool() {
  const { data: config } = useConfig();
  const { data: editPrepData } = useEditPrep();
  const createFolders = useCreateEditFolders();
  const createFolder = useCreateEditFolder();
  const updateProjectDictionary = useUpdateProjectDictionary();
  const updateGlobalDictionary = useUpdateGlobalDictionary();

  const [globalDictionary, setGlobalDictionary] = useState('');
  const [projectDictionary, setProjectDictionary] = useState('');
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingProject, setSavingProject] = useState(false);

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

  // ─── Gling Preparation Handlers ───

  const handleCopyFolderPath = async () => {
    try {
      const response = await fetch(`${API_URL}/api/manage/recordings-folder-path`);
      const data = await response.json();
      if (data.success) {
        await navigator.clipboard.writeText(data.path);
        toast.success('Recordings folder path copied to clipboard');
      } else {
        toast.error(data.error || 'Failed to get folder path');
      }
    } catch {
      toast.error('Failed to copy folder path');
    }
  };

  const handleOpenRecordingsFolder = async () => {
    try {
      const response = await fetchApi<{ success: boolean; error?: string }>(
        '/api/system/open-folder',
        {
          method: 'POST',
          body: JSON.stringify({ folder: 'recordings' }),
        }
      );
      if (!response.success) {
        toast.error(response.error || 'Failed to open folder');
      }
    } catch {
      toast.error('Failed to open folder');
    }
  };

  // ─── Dictionary Handlers ───

  const handleSaveGlobal = () => {
    if (!editPrepData?.globalDictionary) return;
    const currentWords = globalDictionary
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    const originalWords = editPrepData.globalDictionary;
    if (JSON.stringify(currentWords) === JSON.stringify(originalWords)) return;

    setSavingGlobal(true);
    const startTime = Date.now();
    updateGlobalDictionary.mutate(currentWords, {
      onSuccess: () => {
        const elapsed = Date.now() - startTime;
        setTimeout(() => setSavingGlobal(false), Math.max(0, 500 - elapsed));
      },
      onError: () => {
        toast.error('Failed to save global dictionary');
        setSavingGlobal(false);
      },
    });
  };

  const handleSaveProject = () => {
    const activeProject = config?.activeProject;
    if (!activeProject || !editPrepData?.projectDictionary) return;
    const currentWords = projectDictionary
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    const originalWords = editPrepData.projectDictionary;
    if (JSON.stringify(currentWords) === JSON.stringify(originalWords)) return;

    setSavingProject(true);
    const startTime = Date.now();
    updateProjectDictionary.mutate(
      { projectCode: activeProject, words: currentWords },
      {
        onSuccess: () => {
          const elapsed = Date.now() - startTime;
          setTimeout(() => setSavingProject(false), Math.max(0, 500 - elapsed));
        },
        onError: () => {
          toast.error('Failed to save project dictionary');
          setSavingProject(false);
        },
      }
    );
  };

  const handleCopyFilename = async () => {
    if (!editPrepData?.glingFilename) return;
    try {
      await navigator.clipboard.writeText(editPrepData.glingFilename);
      toast.success('Filename copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

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

  const handleCopyCombined = async () => {
    if (!editPrepData?.glingDictionary?.length) return;
    try {
      await navigator.clipboard.writeText(editPrepData.glingDictionary.join('\n'));
      toast.success(`Copied ${editPrepData.glingDictionary.length} words (combined)`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // ─── Edit Folder Handlers ───

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
    } catch {
      toast.error('Failed to open folder');
    }
  };

  const handleCreateFolders = () => createFolders.mutate();
  const handleCreateFolder = (folderName: string) => createFolder.mutate(folderName);

  return (
    <div className="space-y-6">
      {/* ─── GLING PREPARATION ─── */}
      <section>
        <SectionHeader title="Gling Preparation" />
        <div className="space-y-3">
          <div className="text-sm text-warm-secondary">
            <span className="font-medium">Recordings Folder:</span>
            <div className="font-mono text-xs text-warm-muted mt-1 break-all">
              {config?.projectDirectory ? `${config.projectDirectory}/recordings/` : 'No project selected'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyFolderPath}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>📋</span> Copy Folder Path
            </button>
            <button
              onClick={handleOpenRecordingsFolder}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <span>📂</span> Open in Finder
            </button>
          </div>
          <div className="text-xs text-warm-muted bg-blue-50 border border-blue-200 rounded p-2">
            Tip: Drag files from Finder into Gling, then export edited files to edit-1st
          </div>
        </div>
      </section>

      {/* ─── GLING INFO ─── */}
      {editPrepData?.success && (
        <section>
          <SectionHeader title="Gling Info" />
          <div className="space-y-3">
            {/* Filename */}
            <div>
              <label className="text-xs font-medium text-warm-muted uppercase tracking-wide">
                Export Filename
              </label>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-surface-muted border border-warm rounded px-3 py-2 font-mono text-sm text-warm-primary">
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

            {/* Dictionary */}
            <div>
              <label className="text-xs font-medium text-warm-muted uppercase tracking-wide mb-2 block">
                Dictionary
              </label>

              {/* Global */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-warm-secondary">
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
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-warm-strong rounded bg-surface font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add global dictionary words (one per line)..."
                />
              </div>

              {/* Project */}
              <div className="space-y-2 border-t border-warm pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-warm-secondary">
                      Project: {projectDictionary.split('\n').filter((w) => w.trim()).length} words
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
                  className="w-full px-3 py-2 text-sm border border-warm-strong rounded bg-surface font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add project dictionary words (one per line)..."
                />
              </div>

              {/* Combined */}
              <div className="space-y-2 border-t border-warm-strong pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-warm-secondary font-medium">
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
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-warm-strong rounded bg-surface-muted font-mono resize-none focus:outline-none"
                  placeholder="No dictionary words..."
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── EDIT FOLDERS ─── */}
      {editPrepData?.success && (
        <section>
          <SectionHeader title="Edit Folders" />
          <div className="space-y-3">
            {editPrepData.editFolders.folders.map((folder) => {
              const exists = folder.exists;
              return (
                <div key={folder.name}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={exists ? 'text-green-500' : 'text-warm-faint'}>
                        {exists ? '✓' : '○'}
                      </span>
                      <span
                        className={exists ? 'text-warm-secondary font-mono' : 'text-warm-muted font-mono'}
                      >
                        {folder.name}/
                      </span>
                      <span className="text-xs text-warm-muted">
                        {folder.name === 'edit-1st' && '← Gling exports'}
                        {folder.name === 'edit-2nd' && "← Jan's edits"}
                        {folder.name === 'edit-final' && '← Final publish'}
                      </span>
                    </div>
                    {exists ? (
                      <button
                        onClick={() => handleOpenFolder(folder.name)}
                        className="px-3 py-1 text-xs text-warm-secondary hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
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
                </div>
              );
            })}

            {!editPrepData.editFolders.allExist && (
              <button
                onClick={handleCreateFolders}
                disabled={createFolders.isPending}
                className="mt-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {createFolders.isPending ? 'Creating...' : 'Create All Folders'}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Helper Components ───

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-px bg-warm-divider w-8" />
      <span className="text-sm font-semibold text-warm-secondary">{title}</span>
      <div className="h-px bg-warm-divider flex-1" />
    </div>
  );
}
