// FR-56: Chapter Navigation Panel - Fixed sidebar showing chapter table of contents
import { toast } from 'sonner'
import { formatDuration, formatChapterTitle } from '../utils/formatting'

interface ChapterInfo {
  chapterKey: string
  title: string
  startTime: number
  fileCount: number
}

interface ChapterPanelProps {
  chapters: ChapterInfo[]
  currentChapter: string | null
  onChapterClick: (chapterKey: string) => void
}

export function ChapterPanel({ chapters, currentChapter, onChapterClick }: ChapterPanelProps) {
  // Copy YouTube-format chapter list to clipboard
  const handleCopyChapters = async () => {
    const lines = chapters.map(ch => {
      const timestamp = formatDuration(ch.startTime, 'youtube')
      const title = formatChapterTitle(ch.title)
      return `${timestamp} ${title}`
    })
    const text = lines.join('\n')

    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied chapter list')
    } catch {
      toast.error('Failed to copy')
    }
  }

  if (chapters.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-l-lg border border-r-0 border-gray-200 shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Chapters ({chapters.length})
        </h3>
      </div>

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-1">
          {chapters.map((chapter) => {
            const isActive = chapter.chapterKey === currentChapter
            const title = formatChapterTitle(chapter.title)

            return (
              <button
                key={chapter.chapterKey}
                onClick={() => onChapterClick(chapter.chapterKey)}
                className={`w-full px-4 py-2 text-left flex items-start gap-2 transition-colors ${
                  isActive
                    ? 'bg-blue-50 border-l-2 border-blue-500'
                    : 'hover:bg-gray-50 border-l-2 border-transparent'
                }`}
              >
                <span className={`font-mono text-xs flex-shrink-0 pt-0.5 w-5 ${
                  isActive ? 'text-blue-400' : 'text-gray-300'
                }`}>
                  {chapter.chapterKey}
                </span>
                <span className={`font-mono text-xs flex-shrink-0 pt-0.5 w-14 text-right ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {formatDuration(chapter.startTime, 'youtube')}
                </span>
                <span className={`text-sm leading-tight ${
                  isActive ? 'text-blue-700 font-medium' : 'text-gray-700'
                }`}>
                  {title || `Chapter ${chapter.chapterKey}`}
                </span>
                {isActive && (
                  <span className="text-blue-500 ml-auto flex-shrink-0">◀</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer with Copy button */}
      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <button
          onClick={handleCopyChapters}
          className="w-full px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex items-center justify-center gap-1.5"
          title="Copy YouTube-format chapter list"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy for YouTube
        </button>
      </div>
    </div>
  )
}
