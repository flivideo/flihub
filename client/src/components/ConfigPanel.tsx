import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useConfig, useUpdateConfig, useRefetchSuggestedNaming } from '../hooks/useApi'
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

  const [watchDirectory, setWatchDirectory] = useState('')
  // NFR-6: Renamed from targetDirectory to projectDirectory
  const [projectDirectory, setProjectDirectory] = useState('')
  const [imageSourceDirectory, setImageSourceDirectory] = useState('')

  // C-1: Initialize with collapsed paths (using ~)
  // NFR-6: Using projectDirectory instead of targetDirectory
  useEffect(() => {
    if (config) {
      setWatchDirectory(collapsePath(config.watchDirectory))
      setProjectDirectory(collapsePath(config.projectDirectory))
      setImageSourceDirectory(collapsePath(config.imageSourceDirectory))
    }
  }, [config])

  // C-2/C-3: Track if form has changes
  // NFR-6: Using projectDirectory instead of targetDirectory
  const hasChanges = useMemo(() => {
    if (!config) return false
    return collapsePath(config.watchDirectory) !== watchDirectory ||
           collapsePath(config.projectDirectory) !== projectDirectory ||
           collapsePath(config.imageSourceDirectory) !== imageSourceDirectory
  }, [config, watchDirectory, projectDirectory, imageSourceDirectory])

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
      // FR-4: Refetch suggested naming when project directory changes
      refetchSuggestedNaming()
      toast.success('Configuration saved')
    } catch (error) {
      toast.error('Failed to save configuration')
    }
  }

  if (isLoading) {
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
