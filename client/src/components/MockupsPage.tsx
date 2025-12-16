import { useState } from 'react'
import { useConfig } from '../hooks/useApi'

/**
 * MockupsPage - Visual exploration of Claude Code integration UI concepts
 *
 * Shows four different approaches for displaying API tips:
 * 1. Slide-out panel
 * 2. Modal
 * 3. Footer bar
 * 4. Dedicated tab content
 */

// Sample tips data that would come from the skill
const TIPS_DATA = {
  transcripts: {
    icon: '📖',
    title: 'Read Transcripts',
    hints: [
      { label: 'Full project', phrase: 'Get all transcripts' },
      { label: 'By chapter', phrase: 'Chapter 5 transcript' },
      { label: 'Single segment', phrase: 'Show 01-1-intro' },
    ],
  },
  inbox: {
    icon: '📥',
    title: 'Read from Inbox',
    hints: [
      { label: 'List files', phrase: "What's in the inbox?" },
      { label: 'Read file', phrase: 'Read appydave-story' },
    ],
  },
  write: {
    icon: '📤',
    title: 'Write to Inbox',
    hints: [
      { label: 'Save notes', phrase: 'Save notes to inbox' },
      { label: 'To dataset', phrase: 'Write to dataset folder' },
    ],
  },
  projects: {
    icon: '📊',
    title: 'Project Info',
    hints: [
      { label: 'List', phrase: 'List my projects' },
      { label: 'Details', phrase: 'Get project details' },
      { label: 'Path', phrase: "What's the path?" },
    ],
  },
  recordings: {
    icon: '🎬',
    title: 'Recordings',
    hints: [
      { label: 'List', phrase: 'List recordings' },
      { label: 'By chapter', phrase: 'Chapter 10 recordings' },
    ],
  },
  export: {
    icon: '📦',
    title: 'Export for LLM',
    hints: [
      { label: 'Export', phrase: 'Export project data' },
      { label: 'Context', phrase: 'Get context for AI' },
    ],
  },
}

// Tip card component used across mockups
function TipCard({
  icon,
  title,
  hints,
  expanded = false,
  projectCode = 'b86-demo',
  onCopy,
}: {
  icon: string
  title: string
  hints: { label: string; phrase: string }[]
  expanded?: boolean
  projectCode?: string
  onCopy?: (text: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(expanded)

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium text-gray-700">
          <span>{icon}</span>
          <span>{title}</span>
        </span>
        <span className="text-gray-400">{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
          {hints.map((hint, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-500">{hint.label}: </span>
                <span className="text-blue-600">"{hint.phrase}"</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCopy?.(`${hint.phrase} for ${projectCode}`)
                }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Copy"
              >
                📋
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Mockup container with label
function MockupContainer({
  number,
  title,
  description,
  children
}: {
  number: number
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          {number}. {title}
        </h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export function MockupsPage() {
  const { data: config } = useConfig()
  const projectCode = config?.projectDirectory?.split('/').pop() || 'b86-demo'
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Claude Code Integration - UI Concepts</h1>
        <p className="text-gray-600">Compare four approaches for showing API tips in FliHub</p>
        {copiedText && (
          <div className="mt-2 inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            Copied: "{copiedText}"
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Mockup 1: Slide-out Panel */}
        <MockupContainer
          number={1}
          title="Slide-out Panel"
          description="[?] button in header opens right panel"
        >
          <div className="flex h-80">
            {/* Main content area */}
            <div className="flex-1 bg-gray-100 p-4 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="text-lg">Main Content Area</p>
                <p className="text-sm">(Recordings, Assets, etc.)</p>
              </div>
            </div>

            {/* Slide-out panel */}
            <div className="w-64 border-l border-gray-200 bg-white p-3 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-700 flex items-center gap-1">
                  <span>💡</span> Claude Code Tips
                </h4>
                <button className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <p className="text-xs text-gray-500 mb-3">"How do I..."</p>
              <div className="space-y-2">
                {Object.values(TIPS_DATA).slice(0, 4).map((tip, i) => (
                  <TipCard
                    key={i}
                    {...tip}
                    projectCode={projectCode}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            </div>
          </div>
        </MockupContainer>

        {/* Mockup 2: Modal */}
        <MockupContainer
          number={2}
          title="Modal Dialog"
          description="[?] button opens centered modal overlay"
        >
          <div className="relative h-80 bg-gray-100">
            {/* Dimmed background */}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center p-4">
              {/* Modal */}
              <div className="bg-white rounded-lg shadow-xl w-full max-w-sm max-h-64 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <h4 className="font-medium text-gray-700 flex items-center gap-1">
                    <span>💡</span> Claude Code Tips
                  </h4>
                  <button className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div className="p-3 space-y-2 overflow-y-auto max-h-48">
                  {Object.values(TIPS_DATA).slice(0, 3).map((tip, i) => (
                    <TipCard
                      key={i}
                      {...tip}
                      projectCode={projectCode}
                      onCopy={handleCopy}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </MockupContainer>

        {/* Mockup 3: Footer Bar */}
        <MockupContainer
          number={3}
          title="Footer Bar"
          description="Always visible, context-aware hints"
        >
          <div className="flex flex-col h-80">
            {/* Tab bar simulation */}
            <div className="flex gap-4 px-4 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-sm text-blue-600 font-medium">Recordings</span>
              <span className="text-sm text-gray-500">Inbox</span>
              <span className="text-sm text-gray-500">Assets</span>
            </div>

            {/* Main content */}
            <div className="flex-1 bg-gray-100 p-4 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="text-lg">Main Content Area</p>
                <p className="text-sm">Recordings tab active</p>
              </div>
            </div>

            {/* Footer bar */}
            <div className="px-4 py-2 bg-gray-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-1 text-sm">
                <span className="text-yellow-400">💡</span>
                <span className="text-gray-400">Claude Code:</span>
                <button
                  onClick={() => handleCopy(`Get transcripts for ${projectCode}`)}
                  className="text-blue-300 hover:text-blue-200 hover:underline"
                >
                  "Get transcripts"
                </button>
                <span className="text-gray-500">|</span>
                <button
                  onClick={() => handleCopy(`Chapter 5 recordings for ${projectCode}`)}
                  className="text-blue-300 hover:text-blue-200 hover:underline"
                >
                  "Chapter 5"
                </button>
                <span className="text-gray-500">|</span>
                <button
                  onClick={() => handleCopy(`Export ${projectCode} for AI`)}
                  className="text-blue-300 hover:text-blue-200 hover:underline"
                >
                  "Export"
                </button>
              </div>
              <button className="text-gray-400 hover:text-white text-sm">
                [?] More
              </button>
            </div>
          </div>
        </MockupContainer>

        {/* Mockup 4: Dedicated Tab */}
        <MockupContainer
          number={4}
          title="Dedicated Tab"
          description="Full page of tips as its own tab"
        >
          <div className="flex flex-col h-80">
            {/* Tab bar simulation */}
            <div className="flex gap-4 px-4 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-sm text-gray-500">Recordings</span>
              <span className="text-sm text-gray-500">Inbox</span>
              <span className="text-sm text-blue-600 font-medium">API Help</span>
            </div>

            {/* Full page content */}
            <div className="flex-1 p-4 overflow-y-auto">
              <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <span>💡</span> Claude Code Integration
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Ask Claude Code these questions to interact with {projectCode}:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(TIPS_DATA).map((tip, i) => (
                  <TipCard
                    key={i}
                    {...tip}
                    expanded={i === 0}
                    projectCode={projectCode}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            </div>
          </div>
        </MockupContainer>
      </div>

      {/* Expanded Card Example */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Expanded Card Detail</h2>
        <p className="text-gray-600 mb-4">When a card is expanded, show both natural language and curl command:</p>

        <div className="max-w-md border border-gray-200 rounded-lg bg-white overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium text-gray-700">
              <span>📖</span>
              <span>Read Transcripts</span>
            </span>
            <span className="text-gray-400">−</span>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Ask Claude Code:</p>
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-3 py-2">
                <code className="text-sm text-blue-700">
                  "Get the full transcript for {projectCode}"
                </code>
                <button
                  onClick={() => handleCopy(`Get the full transcript for ${projectCode}`)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  📋
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Or use curl directly:</p>
              <div className="flex items-center justify-between bg-gray-100 border border-gray-300 rounded px-3 py-2">
                <code className="text-xs text-gray-700 break-all">
                  curl -s "http://localhost:5101/api/query/projects/{projectCode}/transcripts?include=content" | jq
                </code>
                <button
                  onClick={() => handleCopy(`curl -s "http://localhost:5101/api/query/projects/${projectCode}/transcripts?include=content" | jq`)}
                  className="text-gray-500 hover:text-gray-700 flex-shrink-0 ml-2"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <p className="text-sm text-gray-500 mb-2">Other options:</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-600">By chapter: </span>
                    <span className="text-blue-600">"Get chapter 5 transcript"</span>
                  </div>
                  <button
                    onClick={() => handleCopy(`Get chapter 5 transcript for ${projectCode}`)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    📋
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-600">Single segment: </span>
                    <span className="text-blue-600">"Show 01-1-intro transcript"</span>
                  </div>
                  <button
                    onClick={() => handleCopy(`Show 01-1-intro transcript for ${projectCode}`)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold text-green-800 mb-2">Recommendation: Footer Bar (#3)</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• Always visible - no hunting for help</li>
          <li>• Context-aware - shows relevant commands per tab</li>
          <li>• Minimal screen space</li>
          <li>• Simple to implement</li>
          <li>• [?] expands to full panel if needed</li>
        </ul>
      </div>

      {/* FR-96: Environment Detection Mockups */}
      <div className="mt-16 pt-8 border-t-2 border-gray-300">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">FR-96: Environment Detection & Path Guidance</h1>
          <p className="text-gray-600">Help Windows+WSL users use correct path formats</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Environment Info Box (Option B) */}
          <MockupContainer
            number={1}
            title="Config Panel Info Box"
            description="Collapsible info section at top of Config panel"
          >
            <div className="p-4 space-y-4">
              {/* Environment info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 font-medium text-blue-800">
                    <span className="text-xl">🐧</span>
                    <span>WSL (Ubuntu on Windows)</span>
                  </span>
                  <button className="text-blue-500 hover:text-blue-700 text-sm">Hide ▲</button>
                </div>
                <div className="text-sm text-blue-700 space-y-1">
                  <p className="font-medium">Use Linux path formats:</p>
                  <ul className="ml-4 space-y-0.5">
                    <li>• WSL files: <code className="bg-blue-100 px-1 rounded">/home/jan/...</code></li>
                    <li>• Windows files: <code className="bg-blue-100 px-1 rounded">/mnt/c/Users/...</code></li>
                  </ul>
                </div>
                <div className="mt-2 text-right">
                  <button className="text-blue-600 hover:text-blue-800 text-sm underline">View docs →</button>
                </div>
              </div>

              {/* Sample path field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Projects Root Directory
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value="/home/jan/dev/video-projects/v-appydave"
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                  />
                  <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">📁</button>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  <span className="inline-block mr-1">✓</span>
                  Path exists
                </p>
              </div>
            </div>
          </MockupContainer>

          {/* Path Mismatch Warning (Option C) */}
          <MockupContainer
            number={2}
            title="Inline Path Mismatch Warning"
            description="Real-time warning when path format doesn't match environment"
          >
            <div className="p-4 space-y-4">
              {/* Compact environment indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>🐧</span>
                <span>Running in WSL - use Linux paths</span>
              </div>

              {/* Path field with warning */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Downloads Directory
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value="C:\Users\jan\Downloads"
                    readOnly
                    className="flex-1 px-3 py-2 border border-amber-400 rounded-md bg-amber-50 text-sm"
                  />
                  <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">📁</button>
                </div>
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                  <p className="text-amber-800 font-medium">
                    ⚠️ Windows path format, but running in WSL
                  </p>
                  <p className="text-amber-700 mt-1">
                    Suggested: <code className="bg-amber-100 px-1 rounded">/mnt/c/Users/jan/Downloads</code>
                  </p>
                  <button className="mt-2 px-3 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700">
                    Use suggested path
                  </button>
                </div>
              </div>
            </div>
          </MockupContainer>

          {/* macOS Environment */}
          <MockupContainer
            number={3}
            title="macOS Environment"
            description="Simple indicator for Mac users (no path confusion)"
          >
            <div className="p-4 space-y-4">
              {/* Environment info box - Mac */}
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                <span className="flex items-center gap-2 text-gray-700">
                  <span className="text-xl">🍎</span>
                  <span className="font-medium">macOS</span>
                  <span className="text-gray-500 text-sm">- Unix paths</span>
                </span>
              </div>

              {/* Sample path field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Projects Root Directory
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value="~/dev/video-projects/v-appydave"
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                  />
                  <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">📁</button>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  <span className="inline-block mr-1">✓</span>
                  Path exists
                </p>
              </div>
            </div>
          </MockupContainer>

          {/* Native Windows Environment */}
          <MockupContainer
            number={4}
            title="Native Windows Environment"
            description="When running FliHub directly on Windows (not WSL)"
          >
            <div className="p-4 space-y-4">
              {/* Environment info box - Windows */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 font-medium text-blue-800">
                    <span className="text-xl">🪟</span>
                    <span>Windows</span>
                  </span>
                </div>
                <div className="text-sm text-blue-700 space-y-1">
                  <p className="font-medium">Use Windows path formats:</p>
                  <ul className="ml-4 space-y-0.5">
                    <li>• Windows files: <code className="bg-blue-100 px-1 rounded">C:\Users\...</code></li>
                    <li>• WSL files: <code className="bg-blue-100 px-1 rounded">\\wsl$\Ubuntu\...</code></li>
                  </ul>
                </div>
              </div>

              {/* Path field with UNC path */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Projects Root Directory (in WSL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value="\\wsl$\Ubuntu\home\jan\dev\video-projects"
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-mono text-xs"
                  />
                  <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">📁</button>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  <span className="inline-block mr-1">✓</span>
                  Path exists
                </p>
              </div>
            </div>
          </MockupContainer>
        </div>

        {/* FR-96 Recommendation */}
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Recommendation: Options B + C Combined</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• <strong>Info box</strong> at top of Config - educates user proactively</li>
            <li>• <strong>Inline warnings</strong> - catches mistakes with actionable suggestions</li>
            <li>• Environment detection via <code className="bg-green-100 px-1 rounded">GET /api/system/environment</code></li>
            <li>• WSL detected by checking <code className="bg-green-100 px-1 rounded">process.env.WSL_DISTRO_NAME</code></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
