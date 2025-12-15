import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useProjectStats, useUpdateProjectPriority, useUpdateProjectStage, useConfig, useUpdateConfig, useRefetchSuggestedNaming, useCreateProject, useFinalMedia } from '../hooks/useApi'
import { useProjectsSocket } from '../hooks/useSocket'
import { LoadingSpinner, ErrorMessage, PageContainer } from './shared'
import { ProjectStatsPopup } from './ProjectStatsPopup'
import { formatFileSize } from '../utils/formatting'
import type { ProjectStats, ProjectPriority, ProjectStage, ProjectStageOverride } from '../../../shared/types'

// FR-80: Stage constants (defined locally to avoid Vite import issues with shared runtime values)
const DEFAULT_PROJECT_STAGES: ProjectStage[] = [
  'planning',
  'recording',
  'first-edit',
  'second-edit',
  'review',
  'ready-to-publish',
  'published',
  'archived',
]

// FR-80: Tab type for navigation callback
type ViewTab = 'incoming' | 'recordings' | 'watch' | 'transcriptions' | 'inbox' | 'assets' | 'thumbs' | 'projects' | 'config' | 'mockups'

interface ProjectsPanelProps {
  onNavigateToTab?: (tab: ViewTab) => void
}

// Valid project code pattern: letter + 2 digits + optional suffix (e.g., b71, b72-awesome)
const PROJECT_CODE_PATTERN = /^[a-zA-Z]\d{2}(-|$)/

// Priority display config
const PRIORITY_DISPLAY: Record<ProjectPriority, { icon: string; title: string }> = {
  pinned: { icon: '📌', title: 'Pinned (click to unpin)' },
  normal: { icon: '', title: 'Click to pin' },
}

// Simple toggle: normal ↔ pinned
function getNextPriority(current: ProjectPriority): ProjectPriority {
  return current === 'pinned' ? 'normal' : 'pinned'
}

// FR-80: Stage cycle using configurable stages
// Click = forward, Shift+Click = backward
// At the end, 'auto' resets to auto-detection
function getNextStage(current: ProjectStage, backward: boolean = false): ProjectStageOverride {
  const stages = DEFAULT_PROJECT_STAGES
  const currentIndex = stages.indexOf(current)

  if (backward) {
    // Going backward: if at start or not found, reset to auto
    if (currentIndex <= 0) return 'auto'
    return stages[currentIndex - 1]
  }

  // Going forward: if at end or not found, reset to auto
  if (currentIndex === -1 || currentIndex >= stages.length - 1) return 'auto'
  return stages[currentIndex + 1]
}

// FR-80: Stage display config with colors for 8-stage workflow
const STAGE_DISPLAY: Record<ProjectStage, { label: string; bg: string; text: string }> = {
  'planning': { label: 'Plan', bg: 'bg-purple-100', text: 'text-purple-700' },
  'recording': { label: 'REC', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'first-edit': { label: '1st', bg: 'bg-blue-100', text: 'text-blue-700' },
  'second-edit': { label: '2nd', bg: 'bg-blue-200', text: 'text-blue-800' },
  'review': { label: 'Rev', bg: 'bg-orange-100', text: 'text-orange-700' },
  'ready-to-publish': { label: 'Ready', bg: 'bg-green-100', text: 'text-green-700' },
  'published': { label: 'Pub', bg: 'bg-green-200', text: 'text-green-800' },
  'archived': { label: 'Arch', bg: 'bg-gray-100', text: 'text-gray-600' },
}


// FR-33: Final media cell component - fetches and displays final video status
function FinalMediaCell({ code }: { code: string }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const { data, isLoading } = useFinalMedia(code)

  if (isLoading) {
    return <span className="text-gray-300">...</span>
  }

  const hasVideo = !!data?.video
  const hasSrt = !!data?.srt

  if (!hasVideo && !hasSrt) {
    return <span className="text-gray-300">-</span>
  }

  // Show status: ✅ both, 🎬 video only, 📝 srt only
  const icon = hasVideo && hasSrt ? '✅' : hasVideo ? '🎬' : '📝'

  return (
    <span
      className="cursor-help relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {icon}
      {showTooltip && (
        <div className="absolute z-50 bottom-full right-0 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className={hasVideo ? 'text-green-400' : 'text-gray-500'}>Video:</span>
            <span>{hasVideo ? formatFileSize(data.video!.size) : 'missing'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={hasSrt ? 'text-green-400' : 'text-gray-500'}>SRT:</span>
            <span>{hasSrt ? 'ready' : 'missing'}</span>
          </div>
          {data.video?.location && (
            <div className="text-gray-400 text-[10px] mt-1 border-t border-gray-700 pt-1">
              {data.video.location}
            </div>
          )}
        </div>
      )}
    </span>
  )
}

// FR-48: Transcript percentage cell with color-coding and instant tooltip
function TranscriptPercentCell({ project }: { project: ProjectStats }) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (project.totalFiles === 0) {
    return <span className="text-gray-400">-</span>
  }

  const { transcriptPercent, transcriptSync } = project
  const { matched, missingCount, orphanedCount } = transcriptSync

  // Determine color based on sync status
  let colorClass: string
  let displayText: string

  if (transcriptPercent === 100 && orphanedCount === 0) {
    colorClass = 'text-green-600'
    displayText = '100%'
  } else if (transcriptPercent === 100 && orphanedCount > 0) {
    colorClass = 'text-orange-500'
    displayText = '100% ⚠️'
  } else if (transcriptPercent >= 50) {
    colorClass = 'text-yellow-600'
    displayText = `${transcriptPercent}%`
  } else if (transcriptPercent > 0) {
    colorClass = 'text-red-500'
    displayText = `${transcriptPercent}%`
  } else {
    colorClass = 'text-gray-400'
    displayText = '0%'
  }

  return (
    <span
      className={`${colorClass} cursor-help relative`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {displayText}
      {showTooltip && (
        <div className="absolute z-50 bottom-full right-0 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
          <div>{matched} matched</div>
          {missingCount > 0 && <div className="text-yellow-300">{missingCount} missing</div>}
          {orphanedCount > 0 && <div className="text-orange-300">{orphanedCount} orphaned</div>}
        </div>
      )}
    </span>
  )
}

export function ProjectsPanel({ onNavigateToTab }: ProjectsPanelProps) {
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectCode, setNewProjectCode] = useState('')
  const [statsPopupProject, setStatsPopupProject] = useState<ProjectStats | null>(null)

  const { data, isLoading, error } = useProjectStats()
  const { data: config } = useConfig()
  const updateConfig = useUpdateConfig()
  const refetchSuggestedNaming = useRefetchSuggestedNaming()
  const createProject = useCreateProject()
  const updatePriority = useUpdateProjectPriority()
  const updateStage = useUpdateProjectStage()

  // NFR-5: Subscribe to real-time project changes via socket
  useProjectsSocket()

  // FR-11: Switch to a project by updating project directory
  const handleSelectProject = async (projectPath: string, projectCode: string) => {
    try {
      await updateConfig.mutateAsync({
        projectDirectory: projectPath,
      })
      refetchSuggestedNaming()
      toast.success(`Switched to project: ${projectCode}`)
    } catch (err) {
      toast.error('Failed to switch project')
    }
  }

  // Check if a project is currently selected
  const isProjectSelected = (projectPath: string) => {
    if (!config?.projectDirectory) return false
    return config.projectDirectory === projectPath ||
           config.projectDirectory === `${projectPath}/`
  }

  // FR-32: Handle priority click (cycle through priorities)
  const handlePriorityClick = async (e: React.MouseEvent, project: ProjectStats) => {
    e.stopPropagation() // Don't trigger row click
    const nextPriority = getNextPriority(project.priority)
    try {
      await updatePriority.mutateAsync({ code: project.code, priority: nextPriority })
    } catch (err) {
      toast.error('Failed to update priority')
    }
  }

  // FR-32: Handle info button click
  const handleInfoClick = (e: React.MouseEvent, project: ProjectStats) => {
    e.stopPropagation() // Don't trigger row click
    setStatsPopupProject(statsPopupProject?.code === project.code ? null : project)
  }

  // FR-32: Handle stage click (cycle through stages)
  // Click = forward, Shift+Click = backward
  const handleStageClick = async (e: React.MouseEvent, project: ProjectStats) => {
    e.stopPropagation() // Don't trigger row click
    const backward = e.shiftKey
    const nextStage = getNextStage(project.stage, backward)
    try {
      await updateStage.mutateAsync({ code: project.code, stage: nextStage })
    } catch (err) {
      toast.error('Failed to update stage')
    }
  }

  // FR-12: Create a new project and switch to it
  const handleCreateProject = async () => {
    if (!newProjectCode.trim()) {
      toast.error('Project code is required')
      return
    }

    try {
      const result = await createProject.mutateAsync(newProjectCode.trim())
      if (result.success && result.project) {
        toast.success(`Created project: ${result.project.code}`)
        // Auto-switch to the new project
        await handleSelectProject(result.project.path, result.project.code)
        setNewProjectCode('')
        setShowNewProject(false)
      } else {
        toast.error(result.error || 'Failed to create project')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project')
    }
  }

  // Split projects into valid and invalid (issues)
  // Data already comes sorted from server (priority then lastModified)
  const { projects, issueProjects } = useMemo(() => {
    const allProjects = data?.projects || []
    const valid: ProjectStats[] = []
    const issues: ProjectStats[] = []

    for (const p of allProjects) {
      if (PROJECT_CODE_PATTERN.test(p.code)) {
        valid.push(p)
      } else {
        issues.push(p)
      }
    }

    return { projects: valid, issueProjects: issues }
  }, [data?.projects])

  if (isLoading) {
    return <LoadingSpinner message="Loading projects..." />
  }

  if (error) {
    return <ErrorMessage message="Error loading projects" />
  }

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-gray-900">
          AppyDave Projects
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({projects.length} projects)
          </span>
        </h3>
      </div>

      {data?.error && (
        <p className="text-sm text-yellow-600 mb-3">{data.error}</p>
      )}

      {projects.length === 0 ? (
        <p className="text-gray-500 text-sm">No projects found</p>
      ) : (
        <div>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="pb-2 font-medium w-8" title="Priority"></th>
                <th className="pb-2 font-medium">Project</th>
                <th className="pb-2 font-medium text-center w-14" title="Stage">Stage</th>
                {/* FR-80: Content indicators */}
                <th className="pb-2 font-medium text-center w-20" title="Content">📥 🖼 🎬</th>
                <th className="pb-2 font-medium text-right w-10" title="Chapters">Ch</th>
                <th className="pb-2 font-medium text-right w-12" title="Total Files">Files</th>
                <th className="pb-2 font-medium text-right w-10" title="Transcript %">📄</th>
                <th className="pb-2 font-medium text-center w-8" title="Final Video">✅</th>
                <th className="pb-2 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((project) => {
                const isSelected = isProjectSelected(project.path)
                // Handle legacy 'active' priority by treating as 'normal'
                const effectivePriority: ProjectPriority = project.priority === 'pinned' ? 'pinned' : 'normal'
                const priorityConfig = PRIORITY_DISPLAY[effectivePriority]

                return (
                  <tr
                    key={project.code}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-blue-50'
                        : ''
                    }`}
                  >
                    {/* Priority */}
                    <td className="py-2">
                      <button
                        onClick={(e) => handlePriorityClick(e, project)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
                        title={priorityConfig.title}
                      >
                        {priorityConfig.icon || <span className="text-gray-300">○</span>}
                      </button>
                    </td>

                    {/* FR-44: Project Code - only this is clickable to switch projects */}
                    <td className="py-2">
                      <button
                        onClick={() => handleSelectProject(project.path, project.code)}
                        className={`font-mono text-left hover:underline transition-colors ${
                          isSelected ? 'text-blue-700 font-semibold' : 'text-blue-600 hover:text-blue-800'
                        }`}
                      >
                        {isSelected && '▸ '}{project.code}
                      </button>
                    </td>

                    {/* Stage (clickable to cycle) */}
                    <td className="py-2 text-center">
                      <button
                        onClick={(e) => handleStageClick(e, project)}
                        className={`text-xs font-medium px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                          STAGE_DISPLAY[project.stage]?.bg || ''
                        } ${STAGE_DISPLAY[project.stage]?.text || 'text-gray-400'}`}
                        title="Click: next stage | Shift+Click: previous stage"
                      >
                        {STAGE_DISPLAY[project.stage]?.label || project.stage}
                      </button>
                    </td>

                    {/* FR-80: Content indicators - clickable to navigate to tab */}
                    <td className="py-2 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectProject(project.path, project.code)
                            onNavigateToTab?.('inbox')
                          }}
                          className={`text-sm hover:scale-110 transition-transform ${
                            project.hasInbox ? 'opacity-100' : 'opacity-30'
                          }`}
                          title={project.hasInbox ? 'Has inbox files - click to view' : 'No inbox files'}
                        >
                          📥
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectProject(project.path, project.code)
                            onNavigateToTab?.('assets')
                          }}
                          className={`text-sm hover:scale-110 transition-transform ${
                            project.hasAssets ? 'opacity-100' : 'opacity-30'
                          }`}
                          title={project.hasAssets ? 'Has assets - click to view' : 'No assets'}
                        >
                          🖼
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectProject(project.path, project.code)
                            onNavigateToTab?.('recordings')
                          }}
                          className={`text-sm hover:scale-110 transition-transform ${
                            project.hasChapters ? 'opacity-100' : 'opacity-30'
                          }`}
                          title={project.hasChapters ? 'Has chapter videos - click to view' : 'No chapter videos'}
                        >
                          🎬
                        </button>
                      </div>
                    </td>

                    {/* Chapters */}
                    <td className="py-2 text-right text-gray-600">
                      {project.chapterCount > 0 ? project.chapterCount : '-'}
                    </td>

                    {/* Total Files */}
                    <td className="py-2 text-right text-gray-600">
                      {project.totalFiles > 0 ? project.totalFiles : '-'}
                    </td>

                    {/* FR-48: Transcript % with sync status */}
                    <td className="py-2 text-right">
                      <TranscriptPercentCell project={project} />
                    </td>

                    {/* FR-33: Final Video */}
                    <td className="py-2 text-center">
                      <FinalMediaCell code={project.code} />
                    </td>

                    {/* Info Button */}
                    <td className="py-2 relative">
                      <button
                        onClick={(e) => handleInfoClick(e, project)}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                        title="View project stats"
                      >
                        ⓘ
                      </button>
                      {statsPopupProject?.code === project.code && (
                        <ProjectStatsPopup
                          project={project}
                          onClose={() => setStatsPopupProject(null)}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FR-12: New Project Form - at bottom of table */}
      {showNewProject ? (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newProjectCode}
              onChange={(e) => setNewProjectCode(e.target.value.toLowerCase())}
              placeholder="b73-project-name"
              className="flex-1 px-3 py-1.5 text-sm font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              autoFocus
            />
            <button
              onClick={handleCreateProject}
              disabled={createProject.isPending}
              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {createProject.isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => { setShowNewProject(false); setNewProjectCode('') }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Use kebab-case (e.g., b73-my-new-video)</p>
        </div>
      ) : (
        <button
          onClick={() => setShowNewProject(true)}
          className="mt-3 text-sm text-green-600 hover:text-green-700"
        >
          + Add new project...
        </button>
      )}

      {/* Bug fix: Show projects with invalid naming in Issues section */}
      {issueProjects.length > 0 && (
        <div className="mt-6 pt-4 border-t-2 border-gray-300">
          <h4 className="font-medium text-gray-600 mb-3">
            Issues
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({issueProjects.length} projects with invalid naming)
            </span>
          </h4>
          <div className="space-y-1 text-sm">
            {issueProjects.map((project) => (
              <div
                key={project.code}
                className="flex items-center gap-2 px-2 py-1.5 rounded"
              >
                <span className="text-yellow-600">⚠️</span>
                {/* FR-44: Only project code is clickable */}
                <button
                  onClick={() => handleSelectProject(project.path, project.code)}
                  className="font-mono text-gray-600 hover:text-blue-600 hover:underline transition-colors"
                >
                  {project.code}
                </button>
                <span className="text-xs text-gray-400">
                  (expected: letter + 2 digits, e.g., b73-name)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  )
}
