import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useConfig, useUpdateConfig, useRefetchSuggestedNaming, useChapterRecordingConfig, useUpdateChapterRecordingConfig, useShadowStatus, useGenerateShadows, useGenerateAllShadows } from '../hooks/useApi'
import { collapsePath } from '../utils/formatting'
import { OpenFolderButton, LoadingSpinner, PageContainer } from './shared'

// C-4: Basic path validation
function validatePath(path: string): string | null {
  if (!path.trim()) return 'Path is required'
  if (!path.startsWith('~') && !path.startsWith('/')) return 'Path must start with ~ or /'
  return null
}

export function ConfigPanel() {
  const { data: config, isLoading } = useConfig()
  const updateConfig = useUpdateConfig()
  const refetchSuggestedNaming = useRefetchSuggestedNaming()

  // FR-76: Chapter recording config
  const { data: chapterConfig, isLoading: chapterConfigLoading } = useChapterRecordingConfig()
  const updateChapterConfig = useUpdateChapterRecordingConfig()

  // FR-83: Shadow recording management
  const { data: shadowStatus, isLoading: shadowStatusLoading, refetch: refetchShadowStatus } = useShadowStatus()
  const generateShadows = useGenerateShadows()
  const generateAllShadows = useGenerateAllShadows()

  const [watchDirectory, setWatchDirectory] = useState('')
  // NFR-6: Renamed from targetDirectory to projectDirectory
  const [projectDirectory, setProjectDirectory] = useState('')
  const [imageSourceDirectory, setImageSourceDirectory] = useState('')

  // FR-76: Chapter recording defaults
  const [includeTitleSlides, setIncludeTitleSlides] = useState(false)
  const [slideDuration, setSlideDuration] = useState(1.0)
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p')
  const [autoGenerate, setAutoGenerate] = useState(false)

  // C-1: Initialize with collapsed paths (using ~)
  // NFR-6: Using projectDirectory instead of targetDirectory
  useEffect(() => {
    if (config) {
      setWatchDirectory(collapsePath(config.watchDirectory))
      setProjectDirectory(collapsePath(config.projectDirectory))
      setImageSourceDirectory(collapsePath(config.imageSourceDirectory))
    }
  }, [config])

  // FR-76: Initialize chapter recording config
  useEffect(() => {
    if (chapterConfig?.config) {
      setIncludeTitleSlides(chapterConfig.config.includeTitleSlides ?? false)
      setSlideDuration(chapterConfig.config.slideDuration ?? 1.0)
      setResolution(chapterConfig.config.resolution ?? '720p')
      setAutoGenerate(chapterConfig.config.autoGenerate ?? false)
    }
  }, [chapterConfig])

  // C-2/C-3: Track if form has changes
  // NFR-6: Using projectDirectory instead of targetDirectory
  const hasChanges = useMemo(() => {
    if (!config) return false
    const pathsChanged = collapsePath(config.watchDirectory) !== watchDirectory ||
           collapsePath(config.projectDirectory) !== projectDirectory ||
           collapsePath(config.imageSourceDirectory) !== imageSourceDirectory

    // FR-76: Check chapter config changes
    const chapterChanged = chapterConfig?.config && (
      (chapterConfig.config.includeTitleSlides ?? false) !== includeTitleSlides ||
      chapterConfig.config.slideDuration !== slideDuration ||
      chapterConfig.config.resolution !== resolution ||
      chapterConfig.config.autoGenerate !== autoGenerate
    )

    return pathsChanged || chapterChanged
  }, [config, watchDirectory, projectDirectory, imageSourceDirectory, chapterConfig, includeTitleSlides, slideDuration, resolution, autoGenerate])

  // C-4: Validation
  const watchError = validatePath(watchDirectory)
  const projectError = validatePath(projectDirectory)
  const imageSourceError = validatePath(imageSourceDirectory)
  const hasErrors = !!(watchError || projectError || imageSourceError)

  const handleSave = async () => {
    if (hasErrors) {
      toast.error('Please fix validation errors')
      return
    }

    try {
      // NFR-6: Using projectDirectory instead of targetDirectory
      await updateConfig.mutateAsync({
        watchDirectory,
        projectDirectory,
        imageSourceDirectory,
      })

      // FR-76: Save chapter recording defaults
      await updateChapterConfig.mutateAsync({
        includeTitleSlides,
        slideDuration,
        resolution,
        autoGenerate,
      })

      // FR-4: Refetch suggested naming when project directory changes
      refetchSuggestedNaming()
      // FR-83: Refetch shadow status when watch/project directory changes
      refetchShadowStatus()
      toast.success('Configuration saved')
    } catch (error) {
      toast.error('Failed to save configuration')
    }
  }

  // FR-83: Generate shadows for current project
  const handleGenerateShadows = async () => {
    try {
      const result = await generateShadows.mutateAsync()
      if (result.success) {
        toast.success(`Created ${result.created} shadow files${result.skipped > 0 ? ` (${result.skipped} skipped)` : ''}`)
        refetchShadowStatus()
      }
    } catch (error) {
      toast.error('Failed to generate shadow files')
    }
  }

  // FR-83: Generate shadows for all projects
  const handleGenerateAllShadows = async () => {
    try {
      const result = await generateAllShadows.mutateAsync()
      if (result.success) {
        toast.success(`Created ${result.created} shadow files across ${result.projects} projects`)
        refetchShadowStatus()
      }
    } catch (error) {
      toast.error('Failed to generate shadow files')
    }
  }

  if (isLoading || chapterConfigLoading) {
    return <LoadingSpinner message="Loading configuration..." />
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Ecamm Watch Directory
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={watchDirectory}
              onChange={(e) => setWatchDirectory(e.target.value)}
              className={`flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                watchError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="~/ecamm"
            />
            <OpenFolderButton folder="ecamm" />
          </div>
          {watchError ? (
            <p className="text-xs text-red-500 mt-1">{watchError}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Directory where Ecamm Live saves recordings
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Project Directory
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={projectDirectory}
              onChange={(e) => setProjectDirectory(e.target.value)}
              className={`flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                projectError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="~/dev/video-projects/v-appydave/b72-project"
            />
            <OpenFolderButton folder="project" />
          </div>
          {projectError ? (
            <p className="text-xs text-red-500 mt-1">{projectError}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Project root directory (contains recordings/, assets/, etc.)
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Image Watch Directory
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={imageSourceDirectory}
              onChange={(e) => setImageSourceDirectory(e.target.value)}
              className={`flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                imageSourceError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="~/Downloads"
            />
            <OpenFolderButton folder="downloads" />
          </div>
          {imageSourceError ? (
            <p className="text-xs text-red-500 mt-1">{imageSourceError}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Directory to scan for incoming images (Assets page)
            </p>
          )}
        </div>

        {/* FR-76: Chapter Recording Defaults */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Chapter Recording Defaults
          </h3>

          {/* Include Title Slides */}
          <div className="mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTitleSlides}
                onChange={(e) => setIncludeTitleSlides(e.target.checked)}
                className="w-4 h-4 text-purple-500 rounded"
              />
              <span className="text-sm text-gray-700">
                Include purple title slides between segments
              </span>
            </label>
          </div>

          {/* Slide Duration - only show when slides enabled */}
          {includeTitleSlides && (
            <div className="mb-3 ml-6">
              <label className="block text-sm text-gray-600 mb-1">
                Slide Duration
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={slideDuration}
                  onChange={(e) => setSlideDuration(parseFloat(e.target.value) || 1.0)}
                  min={0.5}
                  max={5}
                  step={0.5}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-gray-500">seconds</span>
              </div>
            </div>
          )}

          {/* Resolution */}
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">
              Default Resolution
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value="720p"
                  checked={resolution === '720p'}
                  onChange={() => setResolution('720p')}
                  className="text-blue-500"
                />
                <span className="text-sm">720p</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value="1080p"
                  checked={resolution === '1080p'}
                  onChange={() => setResolution('1080p')}
                  className="text-blue-500"
                />
                <span className="text-sm">1080p</span>
              </label>
            </div>
          </div>

          {/* Auto-generate */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded"
              />
              <span className="text-sm text-gray-700">
                Auto-generate when creating new chapter
              </span>
            </label>
          </div>
        </div>

        {/* FR-83: Shadow Recordings Section */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Shadow Recordings
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Shadow files allow collaborators to see project structure without the actual video files.
          </p>

          {/* Watch Directory Status */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            {shadowStatus?.watchDirectory ? (
              shadowStatus.watchDirectory.exists ? (
                <div className="flex items-center gap-2">
                  <span className="text-green-500">🟢</span>
                  <span className="text-sm text-gray-700">
                    Watching: <code className="text-xs bg-gray-200 px-1 rounded">{collapsePath(shadowStatus.watchDirectory.path)}</code>
                  </span>
                </div>
              ) : shadowStatus.watchDirectory.configured ? (
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">🟡</span>
                  <span className="text-sm text-gray-700">
                    Path not found: <code className="text-xs bg-gray-200 px-1 rounded">{collapsePath(shadowStatus.watchDirectory.path)}</code>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-red-500">🔴</span>
                  <span className="text-sm text-gray-700">Not configured - Ecamm files will not be detected</span>
                </div>
              )
            ) : shadowStatusLoading ? (
              <span className="text-sm text-gray-400">Loading status...</span>
            ) : (
              <span className="text-sm text-gray-400">Unable to load status</span>
            )}
          </div>

          {/* Current Project Status */}
          {shadowStatus?.currentProject && (
            <div className="mb-4 text-sm text-gray-600">
              Current project: <span className="font-medium">{shadowStatus.currentProject.recordings}</span> recordings,{' '}
              <span className="font-medium">{shadowStatus.currentProject.shadows}</span> shadows
              {shadowStatus.currentProject.missing > 0 && (
                <span className="text-amber-600"> ({shadowStatus.currentProject.missing} missing)</span>
              )}
            </div>
          )}

          {/* Generate Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleGenerateShadows}
              disabled={generateShadows.isPending || generateAllShadows.isPending}
              className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {generateShadows.isPending ? 'Generating...' : 'Generate Shadows'}
            </button>
            <button
              onClick={handleGenerateAllShadows}
              disabled={generateShadows.isPending || generateAllShadows.isPending}
              className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {generateAllShadows.isPending ? 'Generating...' : 'Generate All Projects'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {/* C-2: Dirty state indicator */}
          {hasChanges && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}
          {/* C-3: Disable Save when unchanged or has errors */}
          <button
            onClick={handleSave}
            disabled={updateConfig.isPending || !hasChanges || hasErrors}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              hasChanges && !hasErrors
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {updateConfig.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </PageContainer>
  )
}
