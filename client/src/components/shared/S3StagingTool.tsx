/**
 * FR-142: S3 Staging Tool
 *
 * Split from ExportS3Tool (FR-141). Remote collaboration workflow:
 * - PREP (Your First Edit → Jan) — source files, sync, upload
 * - POST (Jan's Edits → You) — download, file list, SRT status, publish
 * - Cleanup — local and S3 cleanup
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { API_URL } from '../../config';
import {
  useS3StagingStatus,
  useSyncPrep,
  usePromoteToPublish,
  useMigrate,
  useS3Status,
  useDamCommand,
  useCleanLocal,
  useLocalSize,
  usePublishToPoem,
  type MigrationActions,
} from '../../hooks/useS3StagingApi';
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

export function S3StagingTool() {
  const { data: s3Data, isLoading: s3Loading, refetch: refetchS3 } = useS3StagingStatus();
  const syncPrep = useSyncPrep();
  const promoteToPublish = usePromoteToPublish();
  const migrate = useMigrate();
  const { data: s3Status, refetch: refetchS3Status } = useS3Status();
  const damCommand = useDamCommand();
  const cleanLocal = useCleanLocal();
  const { data: localSize } = useLocalSize();
  const publishToPoem = usePublishToPoem();
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [showCleanConfirm, setShowCleanConfirm] = useState<'local' | 's3' | null>(null);
  const [showMigrationPreview, setShowMigrationPreview] = useState(false);
  const [migrationPreview, setMigrationPreview] = useState<MigrationActions | null>(null);

  const isDamBusy = damCommand.isPending || cleanLocal.isPending;

  // ─── S3 Handlers ───

  const handleViewS3 = () => {
    if (s3Data?.project && s3Status?.aws) {
      const { bucket, region, s3Prefix } = s3Status.aws;
      const prefix = encodeURIComponent(`${s3Prefix}${s3Data.project}/`);
      const url = `https://${region}.console.aws.amazon.com/s3/buckets/${bucket}?region=${region}&prefix=${prefix}&tab=objects`;
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
                  showSrtClipboard
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
                  showSrtClipboard
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
                      disabled={!s3Status?.aws}
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
                      disabled={!s3Status?.aws}
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

            {/* FR-144: POEM WUI Publish Section */}
            {s3Data?.publishReady !== undefined && (
              <div className="border border-purple-200 rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Send to POEM WUI</h4>
                <div className="flex items-center justify-between">
                  <div className="text-sm space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={s3Data.publishReady?.transcriptFound ? 'text-green-600' : 'text-gray-400'}>
                        {s3Data.publishReady?.transcriptFound ? '✓' : '○'}
                      </span>
                      <span className="text-gray-600">
                        Transcript: {s3Data.publishReady?.transcriptFile ?? 'not found'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={s3Data.publishReady?.srtFound ? 'text-green-600' : 'text-gray-400'}>
                        {s3Data.publishReady?.srtFound ? '✓' : '○'}
                      </span>
                      <span className="text-gray-600">
                        SRT: {s3Data.publishReady?.srtFile ?? 'not found'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => publishToPoem.mutate()}
                    disabled={!s3Data.publishReady?.transcriptFound || publishToPoem.isPending}
                    className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {publishToPoem.isPending ? 'Sending...' : 'Send to POEM WUI →'}
                  </button>
                </div>
              </div>
            )}

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
  files: Array<{ name: string; size: number; path?: string; synced?: boolean; hasSrt?: boolean }>;
  emptyText: string;
  noFilesText: string;
  showSync?: boolean;
  showCheck?: boolean;
  showSrt?: boolean;
  showSrtClipboard?: boolean;
}

// FR-143: Copy SRT plain text to clipboard
async function copySrtToClipboard(filePath: string) {
  const res = await fetch(`${API_URL}/api/s3-staging/srt-text?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }
  const text = await res.text();
  await navigator.clipboard.writeText(text);
}

function FileList({ exists, files, emptyText, noFilesText, showSync, showCheck, showSrt, showSrtClipboard }: FileListProps) {
  const [copyingFile, setCopyingFile] = useState<string | null>(null);

  const handleCopySrt = async (file: { name: string; path?: string }) => {
    if (!file.path) {
      toast.error('File path not available');
      return;
    }
    setCopyingFile(file.name);
    try {
      await copySrtToClipboard(file.path);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed');
    } finally {
      setCopyingFile(null);
    }
  };

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
            <span className="font-mono text-gray-700 flex items-center gap-1">
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
              {showSrtClipboard && f.name.endsWith('.srt') && (
                <button
                  onClick={() => handleCopySrt(f)}
                  disabled={copyingFile === f.name}
                  title="Copy transcript text"
                  className="ml-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  {copyingFile === f.name ? '...' : '📋'}
                </button>
              )}
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
