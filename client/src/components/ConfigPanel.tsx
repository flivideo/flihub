import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { ConfigFocusSection } from '../App'
import type { CommonName, ChapterFilter } from '../../../shared/types'
import { toast } from 'sonner'
import { useConfig, useUpdateConfig, useRefetchSuggestedNaming, useChapterRecordingConfig, useUpdateChapterRecordingConfig, useShadowStatus, useGenerateShadows, useGenerateAllShadows, useWatchers, useEnvironment } from '../hooks/useApi'
import { collapsePath } from '../utils/formatting'
import { OpenFolderButton, LoadingSpinner, PageContainer } from './shared'
import { API_URL } from '../config'

// FR-89 Part 2: Path existence status type
type PathExistsStatus = 'unknown' | 'checking' | 'exists' | 'not-found'

// FR-89 Part 4: Sanitize path input - strip quotes and whitespace
function sanitizePath(path: string): { sanitized: string; hadQuotes: boolean } {
  const trimmed = path.trim()
  // Check for surrounding quotes (single or double)
  const quoteMatch = trimmed.match(/^["'](.*)["']$/)
  if (quoteMatch) {
    return { sanitized: quoteMatch[1], hadQuotes: true }
  }
  return { sanitized: trimmed, hadQuotes: false }
}

// FR-89 Part 1: Cross-platform path validation
// Accepts: ~ (Unix home), / (Unix absolute), C:\ (Windows drive), \\ (UNC/network)
function validatePath(path: string): string | null {
  if (!path.trim()) return 'Path is required'
  // Cross-platform regex: Unix home, Unix absolute, Windows drive letter, UNC path
  const crossPlatformPathRegex = /^(~|\/|[A-Za-z]:\\|\\\\)/
  if (!crossPlatformPathRegex.test(path)) {
    return 'Path must start with ~, /, C:\\, or \\\\'
  }
  return null
}

// FR-96: Detect if path format doesn't match the expected environment
function detectPathMismatch(path: string, expectedFormat: 'windows' | 'linux'): {
  mismatch: boolean;
  message: string;
  suggestedPath: string | null;
} {
  if (!path.trim()) return { mismatch: false, message: '', suggestedPath: null }

  const isWindowsPath = /^[A-Za-z]:\\/.test(path) || /^\\\\/.test(path)
  const isLinuxPath = /^(~|\/(?!mnt\/))/.test(path)
  const isMntPath = /^\/mnt\/[a-z]\//.test(path)

  if (expectedFormat === 'linux') {
    // In WSL/Linux, warn on Windows-style paths
    if (isWindowsPath) {
      // Try to convert C:\Users\... to /mnt/c/Users/...
      const windowsMatch = path.match(/^([A-Za-z]):\\(.*)$/)
      if (windowsMatch) {
        const drive = windowsMatch[1].toLowerCase()
        const rest = windowsMatch[2].replace(/\\/g, '/')
        return {
          mismatch: true,
          message: 'Windows path format, but running in WSL/Linux',
          suggestedPath: `/mnt/${drive}/${rest}`,
        }
      }
      // UNC path like \\wsl$\Ubuntu\home\...
      const uncMatch = path.match(/^\\\\wsl\$\\[^\\]+\\(.*)$/)
      if (uncMatch) {
        const rest = uncMatch[1].replace(/\\/g, '/')
        return {
          mismatch: true,
          message: 'Windows UNC path, but running in WSL/Linux',
          suggestedPath: `/${rest}`,
        }
      }
      return { mismatch: true, message: 'Windows path format, but running in WSL/Linux', suggestedPath: null }
    }
  } else {
    // In Windows, warn on Linux-style paths
    if (isLinuxPath || isMntPath) {
      return {
        mismatch: true,
        message: 'Linux path format, but running in Windows',
        suggestedPath: null,  // Can't easily convert back
      }
    }
  }

  return { mismatch: false, message: '', suggestedPath: null }
}

// FR-96: Environment info box component
function EnvironmentInfoBox({
  platform,
  isWSL,
  guidance,
  collapsed,
  onToggle,
}: {
  platform: 'win32' | 'linux' | 'darwin';
  isWSL: boolean;
  guidance: { nativeFiles: string; windowsFiles: string; wslFiles: string };
  collapsed: boolean;
  onToggle: () => void;
}) {
  // Environment display config
  const envConfig = isWSL
    ? { icon: '🐧', label: 'WSL (Ubuntu on Windows)', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' }
    : platform === 'darwin'
    ? { icon: '🍎', label: 'macOS', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
    : platform === 'win32'
    ? { icon: '🪟', label: 'Windows', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' }
    : { icon: '🐧', label: 'Linux', bgColor: 'bg-green-50', borderColor: 'border-green-200' }

  return (
    <div className={`rounded-lg border ${envConfig.borderColor} ${envConfig.bgColor} mb-4`}>
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
        onClick={onToggle}
      >
        <span className="text-sm font-medium">
          {envConfig.icon} {envConfig.label}
        </span>
        <button className="text-xs text-gray-500 hover:text-gray-700">
          {collapsed ? '[Show ▼]' : '[Hide ▲]'}
        </button>
      </div>
      {!collapsed && (
        <div className="px-3 pb-3 text-xs text-gray-600">
          <p className="font-medium mb-1">Use {isWSL || platform !== 'win32' ? 'Linux' : 'Windows'} path formats:</p>
          <ul className="space-y-0.5 text-gray-500">
            {isWSL ? (
              <>
                <li>• WSL files: <code className="bg-white px-1 rounded">{guidance.nativeFiles}</code></li>
                <li>• Windows files: <code className="bg-white px-1 rounded">{guidance.windowsFiles}</code></li>
              </>
            ) : platform === 'darwin' ? (
              <li>• Files: <code className="bg-white px-1 rounded">{guidance.nativeFiles}</code></li>
            ) : platform === 'win32' ? (
              <>
                <li>• Windows files: <code className="bg-white px-1 rounded">{guidance.windowsFiles}</code></li>
                <li>• WSL files: <code className="bg-white px-1 rounded">{guidance.wslFiles}</code></li>
              </>
            ) : (
              <li>• Files: <code className="bg-white px-1 rounded">{guidance.nativeFiles}</code></li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// FR-96: Path mismatch warning component
function PathMismatchWarning({
  message,
  suggestedPath,
  onUseSuggested,
}: {
  message: string;
  suggestedPath: string | null;
  onUseSuggested: () => void;
}) {
  return (
    <div className="mt-1 text-xs">
      <p className="text-amber-600">
        <span className="mr-1">⚠️</span>
        {message}
      </p>
      {suggestedPath && (
        <p className="text-gray-500 mt-0.5">
          Suggested: <code className="bg-gray-100 px-1 rounded">{suggestedPath}</code>
          <button
            onClick={onUseSuggested}
            className="ml-2 text-blue-600 hover:text-blue-700 underline"
          >
            Use suggested path
          </button>
        </p>
      )}
    </div>
  )
}

// FR-89 Part 2: Path existence indicator component
function PathExistsIndicator({ status, description }: { status: PathExistsStatus; description: string }) {
  switch (status) {
    case 'checking':
      return <p className="text-xs text-gray-400 mt-1">Checking path...</p>
    case 'exists':
      return (
        <p className="text-xs text-green-600 mt-1">
          <span className="inline-block mr-1">✓</span>
          {description}
        </p>
      )
    case 'not-found':
      return (
        <p className="text-xs text-amber-600 mt-1">
          <span className="inline-block mr-1">⚠</span>
          Path not found
        </p>
      )
    default:
      return <p className="text-xs text-gray-400 mt-1">{description}</p>
  }
}

interface ConfigPanelProps {
  focusSection?: ConfigFocusSection
  onFocusSectionHandled?: () => void
}

export function ConfigPanel({ focusSection, onFocusSectionHandled }: ConfigPanelProps) {
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

  // FR-90: File watchers
  const { data: watchersData } = useWatchers()
  const [showWatchers, setShowWatchers] = useState(false)

  // FR-96: Environment detection
  const { data: envData } = useEnvironment()
  const [envCollapsed, setEnvCollapsed] = useState(false)

  const [watchDirectory, setWatchDirectory] = useState('')
  // FR-89 Part 5: Split into root + active project
  const [projectsRootDirectory, setProjectsRootDirectory] = useState('')
  const [activeProject, setActiveProject] = useState('')
  const [imageSourceDirectory, setImageSourceDirectory] = useState('')
  // FR-102: Gling dictionary words (global)
  const [glingDictionary, setGlingDictionary] = useState('')
  // FR-116/FR-73: Common names editing with chapter filters
  const [commonNames, setCommonNames] = useState<CommonName[]>([])
  const [newCommonName, setNewCommonName] = useState('')
  const commonNamesInputRef = useRef<HTMLInputElement>(null)
  const commonNamesSectionRef = useRef<HTMLDivElement>(null)

  // FR-89 Part 2: Path existence status for each directory field
  const [watchDirExists, setWatchDirExists] = useState<PathExistsStatus>('unknown')
  const [rootDirExists, setRootDirExists] = useState<PathExistsStatus>('unknown')
  const [imageDirExists, setImageDirExists] = useState<PathExistsStatus>('unknown')

  // FR-89 Part 2: Check path existence via API
  const checkPathExists = useCallback(async (
    path: string,
    setStatus: React.Dispatch<React.SetStateAction<PathExistsStatus>>
  ) => {
    if (!path.trim()) {
      setStatus('unknown')
      return
    }
    // Don't check if validation fails
    if (validatePath(path)) {
      setStatus('unknown')
      return
    }
    setStatus('checking')
    try {
      const response = await fetch(`${API_URL}/api/system/path-exists?path=${encodeURIComponent(path)}`)
      const data = await response.json()
      setStatus(data.exists ? 'exists' : 'not-found')
    } catch {
      setStatus('unknown')
    }
  }, [])

  // FR-76: Chapter recording defaults
  const [includeTitleSlides, setIncludeTitleSlides] = useState(false)
  const [slideDuration, setSlideDuration] = useState(1.0)
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p')
  const [autoGenerate, setAutoGenerate] = useState(false)

  // FR-89 Part 6: Shadow resolution (240p, 180p, 160p)
  const [shadowResolution, setShadowResolution] = useState<number>(240)

  // C-1: Initialize with collapsed paths (using ~)
  // FR-89 Part 5: Initialize split project directory fields
  // FR-89 Part 2: Also check path existence on initial load
  useEffect(() => {
    if (config) {
      const watchPath = collapsePath(config.watchDirectory)
      const rootPath = collapsePath(config.projectsRootDirectory || '')
      const imagePath = collapsePath(config.imageSourceDirectory)

      setWatchDirectory(watchPath)
      setProjectsRootDirectory(rootPath)
      setActiveProject(config.activeProject || '')
      setImageSourceDirectory(imagePath)

      // FR-102: Initialize Gling dictionary (one word per line)
      setGlingDictionary((config.glingDictionary || []).join('\n'))

      // FR-116/FR-73: Initialize common names (full objects with filters)
      setCommonNames(config.commonNames || [])

      // FR-89 Part 6: Initialize shadow resolution
      setShadowResolution(config.shadowResolution || 240)

      // Check existence on load
      checkPathExists(watchPath, setWatchDirExists)
      checkPathExists(rootPath, setRootDirExists)
      checkPathExists(imagePath, setImageDirExists)
    }
  }, [config, checkPathExists])

  // FR-76: Initialize chapter recording config
  useEffect(() => {
    if (chapterConfig?.config) {
      setIncludeTitleSlides(chapterConfig.config.includeTitleSlides ?? false)
      setSlideDuration(chapterConfig.config.slideDuration ?? 1.0)
      setResolution(chapterConfig.config.resolution ?? '720p')
      setAutoGenerate(chapterConfig.config.autoGenerate ?? false)
    }
  }, [chapterConfig])

  // FR-116: Handle focus on mount when navigating from another page
  useEffect(() => {
    if (focusSection === 'common-names' && commonNamesSectionRef.current && commonNamesInputRef.current) {
      // Small delay to ensure DOM is ready after tab switch
      setTimeout(() => {
        commonNamesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        commonNamesInputRef.current?.focus()
        onFocusSectionHandled?.()
      }, 100)
    }
  }, [focusSection, onFocusSectionHandled])

  // C-2/C-3: Track if form has changes
  // FR-89 Part 5: Using split project directory fields
  const hasChanges = useMemo(() => {
    if (!config) return false
    const pathsChanged = collapsePath(config.watchDirectory) !== watchDirectory ||
           collapsePath(config.projectsRootDirectory || '') !== projectsRootDirectory ||
           (config.activeProject || '') !== activeProject ||
           collapsePath(config.imageSourceDirectory) !== imageSourceDirectory

    // FR-102: Check Gling dictionary changes
    const currentDict = (config.glingDictionary || []).join('\n')
    const dictChanged = currentDict !== glingDictionary

    // FR-76: Check chapter config changes
    const chapterChanged = chapterConfig?.config && (
      (chapterConfig.config.includeTitleSlides ?? false) !== includeTitleSlides ||
      chapterConfig.config.slideDuration !== slideDuration ||
      chapterConfig.config.resolution !== resolution ||
      chapterConfig.config.autoGenerate !== autoGenerate
    )

    // FR-89 Part 6: Check shadow resolution changes
    const shadowChanged = (config.shadowResolution || 240) !== shadowResolution

    // FR-116/FR-73: Check common names changes (full objects with filters)
    const commonNamesChanged = JSON.stringify(config.commonNames || []) !== JSON.stringify(commonNames)

    return pathsChanged || dictChanged || chapterChanged || shadowChanged || commonNamesChanged
  }, [config, watchDirectory, projectsRootDirectory, activeProject, imageSourceDirectory, glingDictionary, chapterConfig, includeTitleSlides, slideDuration, resolution, autoGenerate, shadowResolution, commonNames])

  // C-4: Validation
  // FR-89 Part 5: Validate root directory (activeProject is just a folder name, no validation needed)
  const watchError = validatePath(watchDirectory)
  const rootError = validatePath(projectsRootDirectory)
  const imageSourceError = validatePath(imageSourceDirectory)
  const hasErrors = !!(watchError || rootError || imageSourceError)

  const handleSave = async () => {
    if (hasErrors) {
      toast.error('Please fix validation errors')
      return
    }

    // FR-89 Part 4: Sanitize paths before saving
    const watchSanitized = sanitizePath(watchDirectory)
    const rootSanitized = sanitizePath(projectsRootDirectory)
    const imageSanitized = sanitizePath(imageSourceDirectory)

    // Update state if sanitization changed values
    if (watchSanitized.sanitized !== watchDirectory) setWatchDirectory(watchSanitized.sanitized)
    if (rootSanitized.sanitized !== projectsRootDirectory) setProjectsRootDirectory(rootSanitized.sanitized)
    if (imageSanitized.sanitized !== imageSourceDirectory) setImageSourceDirectory(imageSanitized.sanitized)

    // Show toast if quotes were stripped
    const quotesStripped = watchSanitized.hadQuotes || rootSanitized.hadQuotes || imageSanitized.hadQuotes
    if (quotesStripped) {
      toast.info('Quotes removed from path')
    }

    try {
      // FR-102: Parse Gling dictionary (one word per line, filter empty)
      const dictWords = glingDictionary
        .split('\n')
        .map(w => w.trim())
        .filter(w => w.length > 0)

      // FR-116: Build common names array (preserve existing autoSequence/suggestTags if name exists)
      const existingCommonNames = config?.commonNames || []
      const updatedCommonNames = commonNames.map(name => {
        const existing = existingCommonNames.find(cn => cn.name === name)
        return existing || { name }
      })

      // FR-89 Part 5: Send split project directory fields
      // FR-89 Part 6: Include shadow resolution
      // FR-102: Include Gling dictionary
      // FR-116: Include common names
      await updateConfig.mutateAsync({
        watchDirectory: watchSanitized.sanitized,
        projectsRootDirectory: rootSanitized.sanitized,
        activeProject: activeProject.trim(),
        imageSourceDirectory: imageSanitized.sanitized,
        shadowResolution,
        glingDictionary: dictWords,
        commonNames: updatedCommonNames,
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

  // FR-118/FR-73: Auto-save common names (full objects)
  const saveCommonNames = async (names: CommonName[]) => {
    try {
      await updateConfig.mutateAsync({ commonNames: names })
    } catch {
      toast.error('Failed to save common names')
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

  // FR-96: Compute path mismatches
  const watchMismatch = envData ? detectPathMismatch(watchDirectory, envData.pathFormat) : { mismatch: false, message: '', suggestedPath: null }
  const rootMismatch = envData ? detectPathMismatch(projectsRootDirectory, envData.pathFormat) : { mismatch: false, message: '', suggestedPath: null }
  const imageMismatch = envData ? detectPathMismatch(imageSourceDirectory, envData.pathFormat) : { mismatch: false, message: '', suggestedPath: null }

  return (
    <PageContainer>
      <div className="space-y-4">
        {/* FR-96: Environment info box */}
        {envData && (
          <EnvironmentInfoBox
            platform={envData.platform}
            isWSL={envData.isWSL}
            guidance={envData.guidance}
            collapsed={envCollapsed}
            onToggle={() => setEnvCollapsed(!envCollapsed)}
          />
        )}

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Ecamm Watch Directory
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={watchDirectory}
              onChange={(e) => {
                setWatchDirectory(e.target.value)
                setWatchDirExists('unknown')  // Reset status on change
              }}
              onBlur={() => checkPathExists(watchDirectory, setWatchDirExists)}
              className={`flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                watchError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="~/ecamm"
            />
            <OpenFolderButton folder="ecamm" />
          </div>
          {watchError ? (
            <p className="text-xs text-red-500 mt-1">{watchError}</p>
          ) : watchMismatch.mismatch ? (
            <PathMismatchWarning
              message={watchMismatch.message}
              suggestedPath={watchMismatch.suggestedPath}
              onUseSuggested={() => watchMismatch.suggestedPath && setWatchDirectory(watchMismatch.suggestedPath)}
            />
          ) : (
            <PathExistsIndicator status={watchDirExists} description="Directory where Ecamm Live saves recordings" />
          )}
        </div>

        {/* FR-89 Part 5: Split into Projects Root + Active Project */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Projects Root Directory
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={projectsRootDirectory}
              onChange={(e) => {
                setProjectsRootDirectory(e.target.value)
                setRootDirExists('unknown')  // Reset status on change
              }}
              onBlur={() => checkPathExists(projectsRootDirectory, setRootDirExists)}
              className={`flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                rootError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="~/dev/video-projects/v-appydave"
            />
            <OpenFolderButton folder="project" />
          </div>
          {rootError ? (
            <p className="text-xs text-red-500 mt-1">{rootError}</p>
          ) : rootMismatch.mismatch ? (
            <PathMismatchWarning
              message={rootMismatch.message}
              suggestedPath={rootMismatch.suggestedPath}
              onUseSuggested={() => rootMismatch.suggestedPath && setProjectsRootDirectory(rootMismatch.suggestedPath)}
            />
          ) : (
            <PathExistsIndicator status={rootDirExists} description="Directory containing all project folders" />
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Active Project
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={activeProject}
              readOnly
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-600 cursor-not-allowed"
              placeholder="(none selected)"
            />
            <OpenFolderButton folder="project" />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Select from Projects panel to change active project
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Image Watch Directory
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={imageSourceDirectory}
              onChange={(e) => {
                setImageSourceDirectory(e.target.value)
                setImageDirExists('unknown')  // Reset status on change
              }}
              onBlur={() => checkPathExists(imageSourceDirectory, setImageDirExists)}
              className={`flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                imageSourceError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="~/Downloads"
            />
            <OpenFolderButton folder="downloads" />
          </div>
          {imageSourceError ? (
            <p className="text-xs text-red-500 mt-1">{imageSourceError}</p>
          ) : imageMismatch.mismatch ? (
            <PathMismatchWarning
              message={imageMismatch.message}
              suggestedPath={imageMismatch.suggestedPath}
              onUseSuggested={() => imageMismatch.suggestedPath && setImageSourceDirectory(imageMismatch.suggestedPath)}
            />
          ) : (
            <PathExistsIndicator status={imageDirExists} description="Directory to scan for incoming images (Assets page)" />
          )}
        </div>

        {/* FR-102: Gling Dictionary (Global) */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Global Dictionary Words
          </label>
          <textarea
            value={glingDictionary}
            onChange={(e) => setGlingDictionary(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            placeholder="AppyDave&#10;BMAD&#10;FliVideo"
          />
          <p className="text-xs text-gray-400 mt-1">
            Brand-wide words for Gling transcription (one per line). Applies to all projects.
          </p>
        </div>

        {/* FR-116/FR-73: Common Names with Chapter Filters (auto-saves) */}
        <div ref={commonNamesSectionRef} id="common-names">
          <label className="block text-sm text-gray-600 mb-2">
            Common Names
          </label>
          {/* FR-73: Common name rows with chapter filters */}
          <div className="space-y-2 mb-3">
            {commonNames.map((cn, idx) => {
              // Determine current filter preset
              const filter = cn.chapterFilter
              const isAll = !filter || filter === 'all'
              const isEarly = typeof filter === 'object' && filter.max === 4 && !filter.min
              const isLate = typeof filter === 'object' && filter.min === 10 && !filter.max
              const isCustom = typeof filter === 'object' && !isEarly && !isLate

              const currentPreset = isAll ? 'all' : isEarly ? 'early' : isLate ? 'late' : 'custom'
              const customMin = isCustom && typeof filter === 'object' ? filter.min : undefined
              const customMax = isCustom && typeof filter === 'object' ? filter.max : undefined

              const updateFilter = (preset: string, min?: number, max?: number) => {
                let newFilter: 'all' | ChapterFilter | undefined
                if (preset === 'all') newFilter = undefined  // Default, no need to store
                else if (preset === 'early') newFilter = { max: 4 }
                else if (preset === 'late') newFilter = { min: 10 }
                else if (preset === 'custom') {
                  newFilter = {}
                  if (min !== undefined) newFilter.min = min
                  if (max !== undefined) newFilter.max = max
                }

                const updated = commonNames.map((c, i) =>
                  i === idx ? { ...c, chapterFilter: newFilter } : c
                )
                setCommonNames(updated)
                saveCommonNames(updated)
              }

              const moveUp = () => {
                if (idx === 0) return
                const updated = [...commonNames]
                ;[updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]]
                setCommonNames(updated)
                saveCommonNames(updated)
              }

              const moveDown = () => {
                if (idx === commonNames.length - 1) return
                const updated = [...commonNames]
                ;[updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]]
                setCommonNames(updated)
                saveCommonNames(updated)
              }

              return (
                <div key={idx} className="flex items-center gap-2 py-1 px-2 bg-gray-50 rounded border border-gray-200">
                  {/* Reorder buttons */}
                  <div className="flex flex-col -my-1">
                    <button
                      onClick={moveUp}
                      disabled={idx === 0}
                      className={`text-xs leading-none ${idx === 0 ? 'text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={moveDown}
                      disabled={idx === commonNames.length - 1}
                      className={`text-xs leading-none ${idx === commonNames.length - 1 ? 'text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Name */}
                  <span className="font-mono text-sm text-gray-700 w-24">{cn.name}</span>

                  {/* Chapter filter dropdown */}
                  <select
                    value={currentPreset}
                    onChange={(e) => updateFilter(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All chapters</option>
                    <option value="early">Early (1-4)</option>
                    <option value="late">Late (10+)</option>
                    <option value="custom">Custom...</option>
                  </select>

                  {/* Custom range inputs */}
                  {currentPreset === 'custom' && (
                    <div className="flex items-center gap-1 text-xs">
                      <input
                        type="number"
                        placeholder="min"
                        value={customMin ?? ''}
                        onChange={(e) => updateFilter('custom', e.target.value ? parseInt(e.target.value) : undefined, customMax)}
                        className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center"
                        min={1}
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="number"
                        placeholder="max"
                        value={customMax ?? ''}
                        onChange={(e) => updateFilter('custom', customMin, e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center"
                        min={1}
                      />
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => {
                      const updated = commonNames.filter((_, i) => i !== idx)
                      setCommonNames(updated)
                      saveCommonNames(updated)
                    }}
                    className="ml-auto text-gray-400 hover:text-red-500 transition-colors text-sm"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
          {/* Add new common name input */}
          <div className="flex gap-2">
            <input
              ref={commonNamesInputRef}
              type="text"
              value={newCommonName}
              onChange={(e) => setNewCommonName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCommonName.trim()) {
                  e.preventDefault()
                  if (!commonNames.find(cn => cn.name === newCommonName.trim())) {
                    const updated = [...commonNames, { name: newCommonName.trim() }]
                    setCommonNames(updated)
                    saveCommonNames(updated)
                  }
                  setNewCommonName('')
                }
              }}
              placeholder="Add new name..."
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => {
                if (newCommonName.trim() && !commonNames.find(cn => cn.name === newCommonName.trim())) {
                  const updated = [...commonNames, { name: newCommonName.trim() }]
                  setCommonNames(updated)
                  saveCommonNames(updated)
                  setNewCommonName('')
                  commonNamesInputRef.current?.focus()
                }
              }}
              disabled={!newCommonName.trim()}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Filter which chapters each name appears in. Auto-saves on change.
          </p>
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

          {/* FR-89 Part 6: Shadow Resolution Selection */}
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-2">
              Default Shadow Resolution
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shadowResolution"
                  value={240}
                  checked={shadowResolution === 240}
                  onChange={() => setShadowResolution(240)}
                  className="text-purple-500"
                />
                <span className="text-sm">240p</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shadowResolution"
                  value={180}
                  checked={shadowResolution === 180}
                  onChange={() => setShadowResolution(180)}
                  className="text-purple-500"
                />
                <span className="text-sm">180p</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shadowResolution"
                  value={160}
                  checked={shadowResolution === 160}
                  onChange={() => setShadowResolution(160)}
                  className="text-purple-500"
                />
                <span className="text-sm">160p</span>
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Lower = smaller files, less detail
            </p>
          </div>

          {/* Watch Directory Status */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            {shadowStatus?.watchDirectory ? (
              shadowStatus.watchDirectory.exists ? (
                <div className="flex items-center gap-2">
                  <span className="text-green-500">🟢</span>
                  <span className="text-sm text-gray-700">
                    Ecamm: <code className="text-xs bg-gray-200 px-1 rounded">{collapsePath(shadowStatus.watchDirectory.path)}</code>
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

            {/* FR-90: All Active Watchers */}
            {watchersData?.watchers && watchersData.watchers.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={() => setShowWatchers(!showWatchers)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  <span className={`transform transition-transform ${showWatchers ? 'rotate-90' : ''}`}>▶</span>
                  <span>{watchersData.watchers.length} active watchers</span>
                </button>
                {showWatchers && (
                  <div className="mt-2 space-y-1.5 text-xs">
                    {watchersData.watchers.map((watcher, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">●</span>
                        <div>
                          <span className="font-medium text-gray-600">{watcher.name}</span>
                          <div className="text-gray-400">
                            {Array.isArray(watcher.pattern)
                              ? watcher.pattern.map((p, i) => (
                                  <div key={i}>{collapsePath(p)}</div>
                                ))
                              : collapsePath(watcher.pattern)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
