// FR-103: S3 Staging Page
// FR-104: S3 Staging Migration Tool
// FR-105: S3 DAM Integration
import { useState } from 'react'
import { useS3StagingStatus, useSyncPrep, usePromoteToPublish, useMigrate, MigrationActions, useS3Status, useDamCommand, useCleanLocal, useLocalSize } from '../hooks/useS3StagingApi'

interface S3StagingPageProps {
  onClose: () => void
}

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

// Extract version from filename like "b85-clauding-01-v1.mp4" -> "v1"
const extractVersion = (filename: string): string | null => {
  const match = filename.match(/-v(\d+)\.(mp4|mov|srt)$/i)
  return match ? `v${match[1]}` : null
}

export function S3StagingPage({ onClose }: S3StagingPageProps) {
  const { data, isLoading, refetch } = useS3StagingStatus()
  const syncPrep = useSyncPrep()
  const promoteToPublish = usePromoteToPublish()
  const migrate = useMigrate()
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  // FR-104: Migration state
  const [showMigrationPreview, setShowMigrationPreview] = useState(false)
  const [migrationPreview, setMigrationPreview] = useState<MigrationActions | null>(null)

  // FR-105: S3 DAM integration
  const { data: s3Status, refetch: refetchS3Status } = useS3Status()
  const damCommand = useDamCommand()
  const cleanLocal = useCleanLocal()
  const { data: localSize } = useLocalSize()
  const [showCleanConfirm, setShowCleanConfirm] = useState<'local' | 's3' | null>(null)

  // FR-105: Check if any DAM operation is in progress
  const isDamBusy = damCommand.isPending || cleanLocal.isPending

  // FR-105: Open S3 console in browser
  const handleViewS3 = () => {
    if (data?.project && s3Status?.brand) {
      const url = `https://s3.console.aws.amazon.com/s3/buckets/v-${s3Status.brand}/${data.project}/`
      window.open(url, '_blank')
    }
  }

  // FR-105: Handle DAM upload
  const handleUpload = () => {
    damCommand.mutate('upload', {
      onSuccess: () => {
        refetchS3Status()
        refetch()
      }
    })
  }

  // FR-105: Handle DAM download
  const handleDownload = () => {
    damCommand.mutate('download', {
      onSuccess: () => {
        refetchS3Status()
        refetch()
      }
    })
  }

  // FR-105: Handle clean local
  const handleCleanLocal = () => {
    setShowCleanConfirm(null)
    cleanLocal.mutate(undefined, {
      onSuccess: () => {
        refetch()
      }
    })
  }

  // FR-105: Handle clean S3
  const handleCleanS3 = () => {
    setShowCleanConfirm(null)
    damCommand.mutate('cleanup-s3', {
      onSuccess: () => {
        refetchS3Status()
      }
    })
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <span className="text-gray-500">Loading...</span>
        </div>
      </div>
    )
  }

  if (!data?.success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <p className="text-red-500">{data?.error || 'No project selected'}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  // Get unique versions from post files
  const versions = new Map<string, { video: typeof data.post.staging.files[0] | null; hasSrt: boolean }>()
  for (const file of data.post.staging.files) {
    const version = extractVersion(file.name)
    if (version) {
      const existing = versions.get(version) || { video: null, hasSrt: false }
      existing.video = file
      existing.hasSrt = file.hasSrt || false
      versions.set(version, existing)
    }
  }

  const handlePromote = () => {
    if (selectedVersion) {
      promoteToPublish.mutate(selectedVersion)
    }
  }

  // FR-104: Migration handlers
  const handlePreviewMigration = async () => {
    const result = await migrate.mutateAsync(true)
    if (result.success && result.actions) {
      setMigrationPreview(result.actions)
      setShowMigrationPreview(true)
    }
  }

  const handleRunMigration = async () => {
    setShowMigrationPreview(false)
    const result = await migrate.mutateAsync(false)
    if (result.success) {
      setMigrationPreview(null)
      refetch()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">S3 Staging</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Project */}
          <div className="text-sm text-gray-500">
            PROJECT: <span className="font-medium text-gray-900">{data.project}</span>
          </div>

          {/* FR-104: Legacy structure warning */}
          {data.migration?.hasLegacyFiles && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-amber-500 text-xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="font-medium text-amber-800">Legacy Structure Detected</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    This project has {data.migration.flatFileCount} file(s) in flat s3-staging/ structure.
                    Migrate to prep/ + post/ subfolders?
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handlePreviewMigration}
                      disabled={migrate.isPending}
                      className="px-3 py-1.5 text-sm bg-amber-100 text-amber-800 rounded hover:bg-amber-200 disabled:opacity-50"
                    >
                      {migrate.isPending ? 'Loading...' : 'Preview Migration'}
                    </button>
                    <button
                      onClick={handleRunMigration}
                      disabled={migrate.isPending}
                      className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                    >
                      Run Migration
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PREP Section */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              PREP <span className="font-normal text-gray-500">(Your First Edit → Jan)</span>
            </h3>

            {/* Source */}
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">Source: {data.prep.source.path}</div>
              <div className="bg-gray-50 border border-gray-200 rounded max-h-32 overflow-y-auto">
                {!data.prep.source.exists ? (
                  <div className="px-3 py-2 text-gray-400 text-sm">(folder does not exist)</div>
                ) : data.prep.source.files.length === 0 ? (
                  <div className="px-3 py-2 text-gray-400 text-sm">(no files)</div>
                ) : (
                  data.prep.source.files.map((f) => (
                    <div
                      key={f.name}
                      className="flex justify-between px-3 py-1.5 text-sm border-b border-gray-100 last:border-0"
                    >
                      <span className="font-mono text-gray-700">
                        {f.synced && <span className="text-green-600 mr-1">✓</span>}
                        {f.name}
                      </span>
                      <span className="text-gray-400">{formatSize(f.size)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Staging */}
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-gray-400">Staging: {data.prep.staging.path}</div>
              <button
                onClick={() => syncPrep.mutate()}
                disabled={syncPrep.isPending || !data.prep.source.exists || data.prep.source.files.length === 0}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncPrep.isPending ? 'Syncing...' : 'Sync from Source'}
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded max-h-32 overflow-y-auto">
              {!data.prep.staging.exists ? (
                <div className="px-3 py-2 text-gray-400 text-sm">(folder does not exist)</div>
              ) : data.prep.staging.files.length === 0 ? (
                <div className="px-3 py-2 text-gray-400 text-sm">(no files - click Sync to copy)</div>
              ) : (
                data.prep.staging.files.map((f) => (
                  <div
                    key={f.name}
                    className="flex justify-between px-3 py-1.5 text-sm border-b border-gray-100 last:border-0"
                  >
                    <span className="font-mono text-gray-700">
                      <span className="text-green-600 mr-1">✓</span>
                      {f.name}
                    </span>
                    <span className="text-gray-400">{formatSize(f.size)}</span>
                  </div>
                ))
              )}
            </div>

            {/* FR-105: S3 Status for PREP */}
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
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
                      {s3Status.prep.lastSync && ` • Last sync: ${new Date(s3Status.prep.lastSync).toLocaleDateString()}`}
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpload}
                    disabled={isDamBusy || data.prep.staging.files.length === 0}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {damCommand.isPending && damCommand.variables === 'upload' ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Uploading...
                      </>
                    ) : (
                      'Upload to S3'
                    )}
                  </button>
                  <button
                    onClick={handleViewS3}
                    disabled={!s3Status?.brand}
                    className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* POST Section */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              POST <span className="font-normal text-gray-500">(Jan's Edits → You)</span>
            </h3>

            {/* FR-105: S3 Status for POST */}
            <div className="mb-3 bg-green-50 border border-green-200 rounded p-3">
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
                <button
                  onClick={handleDownload}
                  disabled={isDamBusy}
                  className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {damCommand.isPending && damCommand.variables === 'download' ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Downloading...
                    </>
                  ) : (
                    'Download from S3'
                  )}
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-400 mb-1">Local: {data.post.staging.path}</div>
            <div className="bg-gray-50 border border-gray-200 rounded max-h-40 overflow-y-auto">
              {!data.post.staging.exists ? (
                <div className="px-3 py-2 text-gray-400 text-sm">(folder does not exist)</div>
              ) : data.post.staging.files.length === 0 ? (
                <div className="px-3 py-2 text-gray-400 text-sm">(no files from Jan yet)</div>
              ) : (
                data.post.staging.files.map((f) => (
                  <div
                    key={f.name}
                    className="flex justify-between px-3 py-1.5 text-sm border-b border-gray-100 last:border-0"
                  >
                    <span className="font-mono text-gray-700">
                      {f.hasSrt ? (
                        <span className="text-green-600 mr-1">✓</span>
                      ) : (
                        <span className="text-amber-500 mr-1">⚠</span>
                      )}
                      {f.name}
                    </span>
                    <span className="text-gray-400">
                      {formatSize(f.size)}
                      <span className="ml-2 text-xs">
                        {f.hasSrt ? (
                          <span className="text-green-600">has SRT</span>
                        ) : (
                          <span className="text-amber-500">NO SRT</span>
                        )}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Warnings */}
            {data.post.warnings.length > 0 && (
              <div className="mt-2 text-xs text-amber-600">
                {data.post.warnings.map((w, i) => (
                  <div key={i}>⚠️ {w.file} has no matching SRT file</div>
                ))}
              </div>
            )}
          </div>

          {/* PUBLISH Section */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">PUBLISH</h3>

            {/* Version Selection */}
            {versions.size > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-400 mb-2">Select version to promote:</div>
                <div className="bg-gray-50 border border-gray-200 rounded">
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
                      {!info.hasSrt && <span className="ml-2 text-xs text-amber-500">⚠</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Destination */}
            <div className="text-xs text-gray-400 mb-2">Destination: {data.publish.path}</div>
            <div className="bg-gray-50 border border-gray-200 rounded max-h-24 overflow-y-auto mb-3">
              {!data.publish.exists ? (
                <div className="px-3 py-2 text-gray-400 text-sm">(folder will be created)</div>
              ) : data.publish.files.length === 0 ? (
                <div className="px-3 py-2 text-gray-400 text-sm">(empty)</div>
              ) : (
                data.publish.files.map((f) => (
                  <div
                    key={f.name}
                    className="flex justify-between px-3 py-1.5 text-sm border-b border-gray-100 last:border-0"
                  >
                    <span className="font-mono text-gray-700">{f.name}</span>
                    <span className="text-gray-400">{formatSize(f.size)}</span>
                  </div>
                ))
              )}
            </div>

            {/* Promote Button */}
            <button
              onClick={handlePromote}
              disabled={!selectedVersion || promoteToPublish.isPending}
              className="px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {promoteToPublish.isPending ? 'Promoting...' : 'Promote to Publish'}
            </button>
            {selectedVersion && (
              <p className="text-xs text-gray-400 mt-1">
                Will copy {selectedVersion} files to publish folder, removing version suffix
              </p>
            )}
          </div>

          {/* FR-105: CLEANUP Section */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">CLEANUP</h3>

            <div className="space-y-2">
              {/* Local cleanup */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded p-3">
                <div>
                  <span className="text-sm text-gray-700">Local s3-staging:</span>
                  <span className="text-sm text-gray-500 ml-2">
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

              {/* S3 cleanup */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded p-3">
                <div>
                  <span className="text-sm text-gray-700">S3 bucket:</span>
                  <span className="text-sm text-gray-500 ml-2">
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
                  {damCommand.isPending && damCommand.variables === 'cleanup-s3' ? 'Cleaning...' : 'Clean S3'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FR-105: Clean confirmation modal */}
      {showCleanConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="font-medium text-gray-900 mb-3">
              {showCleanConfirm === 'local' ? 'Clean Local Staging?' : 'Clean S3 Bucket?'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {showCleanConfirm === 'local'
                ? 'This will delete all files in s3-staging/prep/ and s3-staging/post/. This cannot be undone.'
                : `This will delete all S3 files for ${data?.project}. This cannot be undone.`}
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

      {/* FR-104: Migration preview modal */}
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
                  <div className="text-red-600 font-medium font-sans">DELETE ({migrationPreview.delete.length}):</div>
                  {migrationPreview.delete.map((f) => (
                    <div key={f} className="ml-4 text-gray-600">{f}</div>
                  ))}
                </div>
              )}
              {migrationPreview.toPrep.length > 0 && (
                <div>
                  <div className="text-blue-600 font-medium font-sans">MOVE TO prep/ ({migrationPreview.toPrep.length}):</div>
                  {migrationPreview.toPrep.map(({ from, to }) => (
                    <div key={from} className="ml-4 text-gray-600">{from} → {to}</div>
                  ))}
                </div>
              )}
              {migrationPreview.toPost.length > 0 && (
                <div>
                  <div className="text-green-600 font-medium font-sans">MOVE TO post/ ({migrationPreview.toPost.length}):</div>
                  {migrationPreview.toPost.map(({ from, to }) => (
                    <div key={from} className="ml-4 text-gray-600">{from} → {to}</div>
                  ))}
                </div>
              )}
              {migrationPreview.conflicts.length > 0 && (
                <div>
                  <div className="text-orange-600 font-medium font-sans">CONFLICTS ({migrationPreview.conflicts.length}):</div>
                  {migrationPreview.conflicts.map(({ file, reason }) => (
                    <div key={file} className="ml-4 text-gray-600">{file} - {reason}</div>
                  ))}
                </div>
              )}
              {migrationPreview.delete.length === 0 &&
                migrationPreview.toPrep.length === 0 &&
                migrationPreview.toPost.length === 0 &&
                migrationPreview.conflicts.length === 0 && (
                <div className="text-gray-500 font-sans">No files to migrate.</div>
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
  )
}
