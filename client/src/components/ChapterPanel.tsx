// FR-56: Chapter Navigation Panel - Fixed sidebar showing chapter table of contents
import { toast } from 'sonner';
import { formatDuration } from '../utils/formatting';
import { API_URL } from '../config';

interface ChapterInfo {
  chapterKey: string;
  title: string; // display-ready (FR-157: persisted title, else title-cased slug)
  startTime: number;
  fileCount: number;
}

interface ChapterPanelProps {
  chapters: ChapterInfo[];
  currentChapter: string | null;
  onChapterClick: (chapterKey: string) => void;
}

export function ChapterPanel({ chapters, currentChapter, onChapterClick }: ChapterPanelProps) {
  // Copy structured chapter data JSON for POEM consumption
  const handleCopyChapters = async () => {
    try {
      const res = await fetch(`${API_URL}/api/poem-wui/chapter-data`);
      const data = await res.json() as { success: boolean; chapters?: unknown[]; error?: string };
      if (!data.success) throw new Error(data.error || 'Failed to load chapter data');
      await navigator.clipboard.writeText(JSON.stringify(data.chapters, null, 2));
      toast.success('Copied chapter data for POEM');
    } catch {
      toast.error('Failed to copy chapter data');
    }
  };

  if (chapters.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface rounded-l-lg border border-r-0 border-warm shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-warm flex items-center justify-between">
        <h3 className="text-sm font-semibold text-warm-secondary uppercase tracking-wide">
          Chapters ({chapters.length})
        </h3>
        <button
          onClick={handleCopyChapters}
          className="px-2 py-1 text-xs text-warm-muted hover:text-warm-secondary hover:bg-surface-hover rounded transition-colors flex items-center gap-1"
          title="Copy chapter data for POEM"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy
        </button>
      </div>

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-1">
          {chapters.map((chapter) => {
            const isActive = chapter.chapterKey === currentChapter;
            const title = chapter.title;

            return (
              <button
                key={chapter.chapterKey}
                onClick={() => onChapterClick(chapter.chapterKey)}
                className={`w-full px-4 py-2 text-left flex items-start gap-2 transition-colors ${
                  isActive
                    ? 'bg-blue-50 border-l-2 border-blue-500'
                    : 'hover:bg-surface-hover border-l-2 border-transparent'
                }`}
              >
                <span
                  className={`font-mono text-xs flex-shrink-0 pt-0.5 w-5 ${
                    isActive ? 'text-blue-400' : 'text-warm-faint'
                  }`}
                >
                  {chapter.chapterKey}
                </span>
                <span
                  className={`font-mono text-xs flex-shrink-0 pt-0.5 w-14 text-right ${
                    isActive ? 'text-blue-600' : 'text-warm-muted'
                  }`}
                >
                  {formatDuration(chapter.startTime, 'youtube')}
                </span>
                <span
                  className={`text-sm leading-tight ${
                    isActive ? 'text-blue-700 font-medium' : 'text-warm-secondary'
                  }`}
                >
                  {title || `Chapter ${chapter.chapterKey}`}
                </span>
                {isActive && <span className="text-blue-500 ml-auto flex-shrink-0">◀</span>}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
