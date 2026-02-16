/**
 * FR-141: Export & S3 Workflow Overhaul
 *
 * Consolidated Export + S3 tool drawer for Manage Panel.
 * Combines features from ExportPanel.tsx and S3StagingPage.tsx:
 * - Gling Preparation (Copy Folder Path + Open in Finder)
 * - Gling Info (filename + dictionaries)
 * - Edit Folders (create, open)
 * - S3 Staging (PREP upload, POST download, CLEANUP)
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
import {
  useS3StagingStatus,
  useSyncPrep,
  usePromoteToPublish,
  useMigrate,
  useS3Status,
  useDamCommand,
  useCleanLocal,
  useLocalSize,
  type MigrationActions,
} from '../../hooks/useS3StagingApi';
import { API_URL } from '../../config';
import { OpenFolderButton } from './OpenFolderButton';

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const extractVersion = (filename: string): string | null => {
  const match = filename.match(/-v(\d+)\.(mp4|mov|srt)$/i);
  return match ? `v${match[1]}` : null;
};

export function ExportS3Tool() {
  const { data: config } = useConfig();
  const { data: editPrepData } = useEditPrep();
  const createFolders = useCreateEditFolders();
  const createFolder = useCreateEditFolder();
  const updateProjectDictionary = useUpdateProjectDictionary();
  const updateGlobalDictionary = useUpdateGlobalDictionary();

  // Gling Info state
  const [globalDictionary, setGlobalDictionary] = useState('');
  const [projectDictionary, setProjectDictionary] = useState('');
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingProject, setSavingProject] = useState(false);

  // S3 Staging state
  const { data: s3Data, isLoading: s3Loading, refetch: refetchS3 } = useS3StagingStatus();
  const syncPrep = useSyncPrep();
  const promoteToPublish = usePromoteToPublish();
  const migrate = useMigrate();
  const { data: s3Status, refetch: refetchS3Status } = useS3Status();
  const damCommand = useDamCommand();
  const cleanLocal = useCleanLocal();
  const { data: localSize } = useLocalSize();
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [showCleanConfirm, setShowCleanConfirm] = useState<'local' | 's3' | null>(null);
  const [showMigrationPreview, setShowMigrationPreview] = useState(false);
  const [migrationPreview, setMigrationPreview] = useState<MigrationActions | null>(null);

  const isDamBusy = damCommand.isPending || cleanLocal.isPending;

  // Initialize dictionary state from API data
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

  // ─── S3 Handlers ───

  const handleViewS3 = () => {
    if (s3Data?.project && s3Status?.brand) {
      const url = `https://s3.console.aws.amazon.com/s3/buckets/v-${s3Status.brand}/${s3Data.project}/`;
      window.open(url, '_blank');
    }
  };

  const handleUpload = () => {
    damCommand.mutate('upload', {
      onSuccess: () => {
        refetchS3Status();
        refetchS3();
      },
    });
  };

  const handleDownload = () => {
    damCommand.mutate('download', {
      onSuccess: () => {
        refetchS3Status();
        refetchS3();
      },
    });
  };

  const handleCleanLocal = () => {
    setShowCleanConfirm(null);
    cleanLocal.mutate(undefined, {
      onSuccess: () => refetchS3(),
    });
  };

  const handleCleanS3 = () => {
    setShowCleanConfirm(null);
    damCommand.mutate('cleanup-s3', {
      onSuccess: () => refetchS3Status(),
    });
  };

  const handlePreviewMigration = async () => {
    const result = await migrate.mutateAsync(true);
    if (result.success && result.actions) {
      setMigrationPreview(result.actions);
      setShowMigrationPreview(true);
    }
  };

  const handleRunMigration = async () => {
    setShowMigrationPreview(false);
    const result = await migrate.mutateAsync(false);
    if (result.success) {
      setMigrationPreview(null);
      refetchS3();
    }
  };

  const handlePromote = () => {
    if (selectedVersion) {
      promoteToPublish.mutate(selectedVersion);
    }
  };

  // Build version map from post files
  const versions = new Map<
    string,
    { video: { name: string; size: number; hasSrt?: boolean } | null; hasSrt: boolean }
  >();
  if (s3Data?.post?.staging?.files) {
    for (const file of s3Data.post.staging.files) {
      const version = extractVersion(file.name);
      if (version) {
        const existing = versions.get(version) || { video: null, hasSrt: false };
        existing.video = file;
        existing.hasSrt = file.hasSrt || false;
        versions.set(version, existing);
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── GLING PREPARATION ─── */}
      <section>
        <SectionHeader title="Gling Preparation" />
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Recordings Folder:</span>
            <div className="font-mono text-xs text-gray-500 mt-1 break-all">
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
          <div className="text-xs text-gray-400 bg-blue-50 border border-blue-200 rounded p-2">
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
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Export Filename
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

            {/* Dictionary */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                Dictionary
              </label>

              {/* Global */}
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
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add global dictionary words (one per line)..."
                />
              </div>

              {/* Project */}
              <div className="space-y-2 border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add project dictionary words (one per line)..."
                />
              </div>

              {/* Combined */}
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
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-50 font-mono resize-none focus:outline-none"
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

      {/* ─── S3 STAGING ─── */}
      <section>
        <SectionHeader title="S3 Staging" />

        {s3Loading ? (
          <div className="text-sm text-gray-500">Loading S3 status...</div>
        ) : !s3Data?.success ? (
          <div className="text-sm text-red-500">{s3Data?.error || 'No project selected'}</div>
        ) : (
          <div className="space-y-4">
            {/* FR-104: Legacy migration warning */}
            {s3Data.migration?.hasLegacyFiles && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="text-amber-500">⚠️</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-800 text-sm">Legacy Structure Detected</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      {s3Data.migration.flatFileCount} file(s) in flat s3-staging/ structure.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handlePreviewMigration}
                        disabled={migrate.isPending}
                        className="px-3 py-1 text-xs bg-amber-100 text-amber-800 rounded hover:bg-amber-200 disabled:opacity-50"
                      >
                        {migrate.isPending ? 'Loading...' : 'Preview'}
                      </button>
                      <button
                        onClick={handleRunMigration}
                        disabled={migrate.isPending}
                        className="px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                      >
                        Run Migration
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PREP Section */}
            <div className="border border-gray-200 rounded-lg p-3 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">
                PREP <span className="font-normal text-gray-500">(Your First Edit → Jan)</span>
              </h4>

              {/* Source files */}
              <div>
                <div className="text-xs text-gray-400 mb-1">Source: {s3Data.prep.source.path}</div>
                <FileList
                  exists={s3Data.prep.source.exists}
                  files={s3Data.prep.source.files}
                  emptyText="(folder does not exist)"
                  noFilesText="(no files)"
                  showSync
                />
              </div>

              {/* Staging files */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-400">Staging: {s3Data.prep.staging.path}</div>
                  <button
                    onClick={() => syncPrep.mutate()}
                    disabled={
                      syncPrep.isPending ||
                      !s3Data.prep.source.exists ||
                      s3Data.prep.source.files.length === 0
                    }
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncPrep.isPending ? 'Syncing...' : 'Sync from Source'}
                  </button>
                </div>
                <FileList
                  exists={s3Data.prep.staging.exists}
                  files={s3Data.prep.staging.files}
                  emptyText="(folder does not exist)"
                  noFilesText="(no files - click Sync to copy)"
                  showCheck
                />
              </div>

              {/* S3 Status for PREP */}
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">S3:</span>
                    {s3Status?.prep.error ? (
                      <span className="text-red-600 text-sm">✕ {s3Status.prep.error}</span>
                    ) : s3Status?.prep.uploaded ? (
                      <span className="text-green-600 text-sm">✓ Uploaded</span>
                    ) : (
                      <span className="text-gray-500 text-sm">○ Not uploaded</span>
                    )}
                    {s3Status?.prep.fileCount ? (
                      <span className="text-xs text-gray-400">
                        {s3Status.prep.fileCount} files
                        {s3Status.prep.lastSync &&
                          ` · ${new Date(s3Status.prep.lastSync).toLocaleDateString()}`}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpload}
                      disabled={isDamBusy || s3Data.prep.staging.files.length === 0}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {damCommand.isPending && damCommand.variables === 'upload'
                        ? 'Uploading...'
                        : 'Upload to S3'}
                    </button>
                    <button
                      onClick={handleViewS3}
                      disabled={!s3Status?.brand}
                      className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      View
                    </button>
                    <OpenFolderButton folder="s3Prep" />
                  </div>
                </div>
              </div>
            </div>

            {/* POST Section */}
            <div className="border border-gray-200 rounded-lg p-3 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">
                POST <span className="font-normal text-gray-500">(Jan&apos;s Edits → You)</span>
              </h4>

              {/* S3 Status for POST */}
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">S3:</span>
                      {s3Status?.post.newFilesAvailable && s3Status.post.newFilesAvailable > 0 ? (
                        <span className="text-blue-600 text-sm font-medium">
                          {s3Status.post.newFilesAvailable} new file(s) available
                        </span>
                      ) : s3Status?.post.fileCount && s3Status.post.fileCount > 0 ? (
                        <span className="text-green-600 text-sm">✓ All downloaded</span>
                      ) : (
                        <span className="text-gray-500 text-sm">No files from Jan</span>
                      )}
                    </div>
                    {s3Status?.post.newFiles && s3Status.post.newFiles.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1 font-mono truncate">
                        {s3Status.post.newFiles.join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownload}
                      disabled={isDamBusy}
                      className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {damCommand.isPending && damCommand.variables === 'download'
                        ? 'Downloading...'
                        : 'Download from S3'}
                    </button>
                    <button
                      onClick={handleViewS3}
                      disabled={!s3Status?.brand}
                      className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      View
                    </button>
                    <OpenFolderButton folder="s3Post" />
                  </div>
                </div>
              </div>

              {/* Local post files */}
              <div>
                <div className="text-xs text-gray-400 mb-1">Local: {s3Data.post.staging.path}</div>
                <FileList
                  exists={s3Data.post.staging.exists}
                  files={s3Data.post.staging.files}
                  emptyText="(folder does not exist)"
                  noFilesText="(no files from Jan yet)"
                  showSrt
                />
              </div>

              {s3Data.post.warnings.length > 0 && (
                <div className="text-xs text-amber-600">
                  {s3Data.post.warnings.map((w, i) => (
                    <div key={i}>⚠️ {w.file} has no matching SRT file</div>
                  ))}
                </div>
              )}

              {/* PUBLISH - Version promotion */}
              {versions.size > 0 && (
                <div className="border-t border-gray-200 pt-3">
                  <h5 className="text-xs font-semibold text-gray-600 uppercase mb-2">Publish</h5>
                  <div className="bg-gray-50 border border-gray-200 rounded mb-2">
                    {Array.from(versions.entries()).map(([version, info]) => (
                      <label
                        key={version}
                        className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-0"
                      >
                        <input
                          type="radio"
                          name="version"
                          value={version}
                          checked={selectedVersion === version}
                          onChange={() => setSelectedVersion(version)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          {version}
                          {info.video && (
                            <span className="text-gray-400 ml-2">
                              ({formatSize(info.video.size)}
                              {info.hasSrt ? ' + SRT' : ', no SRT'})
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePromote}
                      disabled={!selectedVersion || promoteToPublish.isPending}
                      className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {promoteToPublish.isPending ? 'Promoting...' : 'Promote to Publish'}
                    </button>
                    {selectedVersion && (
                      <span className="text-xs text-gray-400">
                        Copies {selectedVersion} to publish, removing version suffix
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Destination: {s3Data.publish.path}
                  </div>
                </div>
              )}
            </div>

            {/* CLEANUP Section */}
            <div className="border border-gray-200 rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Cleanup</h4>

              <div className="flex items-center justify-between bg-gray-50 rounded p-2">
                <div className="text-sm">
                  <span className="text-gray-700">Local s3-staging:</span>
                  <span className="text-gray-500 ml-2">
                    {localSize?.totalSize ? formatSize(localSize.totalSize) : 'calculating...'}
                  </span>
                </div>
                <button
                  onClick={() => setShowCleanConfirm('local')}
                  disabled={isDamBusy || !localSize?.totalSize}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cleanLocal.isPending ? 'Cleaning...' : 'Clean Local'}
                </button>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded p-2">
                <div className="text-sm">
                  <span className="text-gray-700">S3 bucket:</span>
                  <span className="text-gray-500 ml-2">
                    {s3Status?.prep.totalSize || s3Status?.post.totalSize
                      ? formatSize((s3Status.prep.totalSize || 0) + (s3Status.post.totalSize || 0))
                      : 'unknown'}
                  </span>
                </div>
                <button
                  onClick={() => setShowCleanConfirm('s3')}
                  disabled={isDamBusy}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {damCommand.isPending && damCommand.variables === 'cleanup-s3'
                    ? 'Cleaning...'
                    : 'Clean S3'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Clean confirmation modal */}
      {showCleanConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="font-medium text-gray-900 mb-3">
              {showCleanConfirm === 'local' ? 'Clean Local Staging?' : 'Clean S3 Bucket?'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {showCleanConfirm === 'local'
                ? 'This will delete all files in s3-staging/prep/ and s3-staging/post/. This cannot be undone.'
                : `This will delete all S3 files for ${s3Data?.project}. This cannot be undone.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCleanConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={showCleanConfirm === 'local' ? handleCleanLocal : handleCleanS3}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Migration preview modal */}
      {showMigrationPreview && migrationPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-medium text-gray-900">Migration Preview</h3>
              <button
                onClick={() => setShowMigrationPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4 text-sm font-mono space-y-4">
              {migrationPreview.delete.length > 0 && (
                <div>
                  <div className="text-red-600 font-medium font-sans">
                    DELETE ({migrationPreview.delete.length}):
                  </div>
                  {migrationPreview.delete.map((f) => (
                    <div key={f} className="ml-4 text-gray-600">{f}</div>
                  ))}
                </div>
              )}
              {migrationPreview.toPrep.length > 0 && (
                <div>
                  <div className="text-blue-600 font-medium font-sans">
                    MOVE TO prep/ ({migrationPreview.toPrep.length}):
                  </div>
                  {migrationPreview.toPrep.map(({ from, to }) => (
                    <div key={from} className="ml-4 text-gray-600">{from} → {to}</div>
                  ))}
                </div>
              )}
              {migrationPreview.toPost.length > 0 && (
                <div>
                  <div className="text-green-600 font-medium font-sans">
                    MOVE TO post/ ({migrationPreview.toPost.length}):
                  </div>
                  {migrationPreview.toPost.map(({ from, to }) => (
                    <div key={from} className="ml-4 text-gray-600">{from} → {to}</div>
                  ))}
                </div>
              )}
              {migrationPreview.conflicts.length > 0 && (
                <div>
                  <div className="text-orange-600 font-medium font-sans">
                    CONFLICTS ({migrationPreview.conflicts.length}):
                  </div>
                  {migrationPreview.conflicts.map(({ file, reason }) => (
                    <div key={file} className="ml-4 text-gray-600">{file} - {reason}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowMigrationPreview(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRunMigration}
                disabled={migrate.isPending}
                className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {migrate.isPending ? 'Migrating...' : 'Run Migration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ───

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-px bg-gray-300 w-8" />
      <span className="text-sm font-semibold text-gray-700">{title}</span>
      <div className="h-px bg-gray-300 flex-1" />
    </div>
  );
}

interface FileListProps {
  exists: boolean;
  files: Array<{ name: string; size: number; synced?: boolean; hasSrt?: boolean }>;
  emptyText: string;
  noFilesText: string;
  showSync?: boolean;
  showCheck?: boolean;
  showSrt?: boolean;
}

function FileList({ exists, files, emptyText, noFilesText, showSync, showCheck, showSrt }: FileListProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded max-h-32 overflow-y-auto">
      {!exists ? (
        <div className="px-3 py-2 text-gray-400 text-sm">{emptyText}</div>
      ) : files.length === 0 ? (
        <div className="px-3 py-2 text-gray-400 text-sm">{noFilesText}</div>
      ) : (
        files.map((f) => (
          <div
            key={f.name}
            className="flex justify-between px-3 py-1.5 text-sm border-b border-gray-100 last:border-0"
          >
            <span className="font-mono text-gray-700">
              {showSync && f.synced && <span className="text-green-600 mr-1">✓</span>}
              {showCheck && <span className="text-green-600 mr-1">✓</span>}
              {showSrt && (
                f.hasSrt ? (
                  <span className="text-green-600 mr-1">✓</span>
                ) : (
                  <span className="text-amber-500 mr-1">⚠</span>
                )
              )}
              {f.name}
            </span>
            <span className="text-gray-400">
              {formatSize(f.size)}
              {showSrt && (
                <span className="ml-2 text-xs">
                  {f.hasSrt ? (
                    <span className="text-green-600">has SRT</span>
                  ) : (
                    <span className="text-amber-500">NO SRT</span>
                  )}
                </span>
              )}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
