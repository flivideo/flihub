// FR-103: S3 Staging Page
import { useState } from 'react'
import { useS3StagingStatus, useSyncPrep, usePromoteToPublish } from '../hooks/useS3StagingApi'

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
  const { data, isLoading } = useS3StagingStatus()
  const syncPrep = useSyncPrep()
  const promoteToPublish = usePromoteToPublish()
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)

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
          </div>

          {/* POST Section */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              POST <span className="font-normal text-gray-500">(Jan's Edits → You)</span>
            </h3>

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
        </div>
      </div>
    </div>
  )
}
