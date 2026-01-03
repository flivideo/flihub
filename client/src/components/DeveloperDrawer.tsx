/**
 * FR-127: Developer Drawer (Redesigned)
 *
 * Slide-out drawer for viewing internal data files.
 * NO black overlay - drawer slides over content without blocking the app.
 *
 * Key features:
 * - 800px default width, resizable 300-1000px
 * - Tab-based navigation (not tree - tree sucks)
 * - Monaco Editor (VSCode's actual editor) for JSON viewing
 * - Sticky action bar always visible
 * - Dark theme for code viewing
 * - Escape key closes
 */

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import Editor from '@monaco-editor/react'
import {
  useDeveloperProjectState,
  useDeveloperConfig,
  useDeveloperTelemetry,
} from '../hooks/useApi'
import { QUERY_KEYS } from '../constants/queryKeys'

interface DeveloperDrawerProps {
  isOpen: boolean
  onClose: () => void
}

type FileTab = 'project-state' | 'config' | 'telemetry'

const TABS = [
  { key: 'project-state' as FileTab, label: '.flihub-state.json', icon: '📄' },
  { key: 'config' as FileTab, label: 'config.json', icon: '⚙️' },
  { key: 'telemetry' as FileTab, label: 'telemetry.jsonl', icon: '📊' },
]

const MIN_WIDTH = 300
const MAX_WIDTH = 1000
const DEFAULT_WIDTH = 800

export default function DeveloperDrawer({ isOpen, onClose }: DeveloperDrawerProps) {
  const [activeTab, setActiveTab] = useState<FileTab>('project-state')
  const [drawerWidth, setDrawerWidth] = useState(() => {
    const saved = localStorage.getItem('devDrawerWidth')
    return saved ? parseInt(saved) : DEFAULT_WIDTH
  })
  const [isResizing, setIsResizing] = useState(false)
  const queryClient = useQueryClient()

  // Fetch data (FR-127: Socket listener is at App level)
  const projectState = useDeveloperProjectState()
  const config = useDeveloperConfig()
  const telemetry = useDeveloperTelemetry()

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Resizing logic
  const handleMouseDown = () => setIsResizing(true)

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - e.clientX))
      setDrawerWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      localStorage.setItem('devDrawerWidth', String(drawerWidth))
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, drawerWidth])

  // Get data for active tab
  const getTabData = () => {
    switch (activeTab) {
      case 'project-state':
        return projectState.data
      case 'config':
        return config.data
      case 'telemetry':
        return telemetry.data
      default:
        return null
    }
  }

  const activeData = getTabData()

  // Format content for display
  const getDisplayContent = () => {
    if (!activeData) return ''

    if (activeTab === 'telemetry') {
      // For JSONL, just return as-is (each line is a JSON object)
      return activeData.content
    } else {
      // For JSON, format with 2-space indentation
      return JSON.stringify(activeData.content, null, 2)
    }
  }

  // Copy JSON to clipboard
  const handleCopy = () => {
    if (!activeData) return

    const content = getDisplayContent()
    navigator.clipboard.writeText(content)
    toast.success('Copied to clipboard')
  }

  // Open file in editor
  const handleOpenInEditor = async () => {
    if (!activeData) return

    try {
      const response = await fetch('http://localhost:5101/api/system/open-file-by-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: activeData.filePath }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Failed to open file')
      } else {
        toast.success('File opened in editor')
      }
    } catch (error) {
      toast.error('Failed to open file')
    }
  }

  // Refresh data
  const handleRefresh = () => {
    switch (activeTab) {
      case 'project-state':
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.developerProjectState })
        break
      case 'config':
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.developerConfig })
        break
      case 'telemetry':
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.developerTelemetry })
        break
    }
    toast.success('File refreshed')
  }

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-[#1e1e1e] shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: `${drawerWidth}px` }}
    >
      {/* Resize handle */}
      <div
        className={`absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors ${
          isResizing ? 'bg-blue-500' : 'bg-gray-700'
        }`}
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="flex-shrink-0 bg-[#252526] px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-200 font-mono">🔍 DEVELOPER TOOLS</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg leading-none"
          aria-label="Close drawer"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-[#252526] border-b border-gray-700">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-xs font-mono transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#1e1e1e] text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#2d2d30]'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* File info */}
      {activeData && (
        <div className="flex-shrink-0 bg-[#2d2d30] px-4 py-2 border-b border-gray-700 text-xs text-gray-400 font-mono">
          <div className="truncate mb-1">{activeData.filePath}</div>
          <div className="flex gap-4 text-[10px]">
            <span>Size: {formatSize(activeData.size)}</span>
            <span>Modified: {new Date(activeData.lastModified).toLocaleString()}</span>
            {activeTab === 'telemetry' && 'lineCount' in activeData && (
              <span>Lines: {(activeData as any).lineCount}</span>
            )}
          </div>
          {'note' in activeData && (activeData as any).note && (
            <div className="mt-2 text-amber-400 italic text-xs">{(activeData as any).note}</div>
          )}
        </div>
      )}

      {/* Content viewer - Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        {activeData ? (
          <Editor
            height="100%"
            language={activeTab === 'telemetry' ? 'plaintext' : 'json'}
            theme="vs-dark"
            value={getDisplayContent()}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              lineNumbers: 'on',
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
              renderLineHighlight: 'none',
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
              automaticLayout: true,
              wordWrap: 'off',
              tabSize: 2,
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 font-mono">
            <div className="text-center">
              <div className="text-4xl mb-2">📂</div>
              <div className="text-sm">Loading...</div>
            </div>
          </div>
        )}
      </div>

      {/* Action bar - sticky at bottom */}
      <div className="flex-shrink-0 bg-[#252526] px-4 py-3 border-t border-gray-700 flex gap-2">
        <button
          onClick={handleCopy}
          disabled={!activeData}
          className="px-3 py-1.5 text-xs font-mono bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Copy JSON
        </button>
        <button
          onClick={handleOpenInEditor}
          disabled={!activeData}
          className="px-3 py-1.5 text-xs font-mono border border-gray-600 text-gray-200 rounded hover:bg-[#2d2d30] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Open in Editor
        </button>
        <button
          onClick={handleRefresh}
          disabled={!activeData}
          className="px-3 py-1.5 text-xs font-mono border border-gray-600 text-gray-200 rounded hover:bg-[#2d2d30] ml-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
