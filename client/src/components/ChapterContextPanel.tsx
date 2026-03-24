import { useMemo } from 'react';
import { toast } from 'sonner';
import type { RecordingFile } from '../../../shared/types';
import { extractTagsFromName } from '../../../shared/naming';

interface ChapterContextPanelProps {
  recordings: RecordingFile[];
}

interface ChapterSummary {
  number: string;
  name: string;
}

// Extract unique chapters with their display names
function extractChapters(recordings: RecordingFile[]): ChapterSummary[] {
  const chapterMap = new Map<string, string>();

  for (const recording of recordings) {
    if (!chapterMap.has(recording.chapter)) {
      // Get the name from sequence 1, or first file for this chapter
      const { name } = extractTagsFromName(recording.name);
      chapterMap.set(recording.chapter, name);
    } else if (recording.sequence === '1') {
      // Prefer sequence 1's name if we find it later
      const { name } = extractTagsFromName(recording.name);
      chapterMap.set(recording.chapter, name);
    }
  }

  // Convert to array and sort by chapter number
  return Array.from(chapterMap.entries())
    .map(([number, name]) => ({ number, name }))
    .sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
}

// Calculate next chapter number
function getNextChapter(chapters: ChapterSummary[]): string {
  if (chapters.length === 0) return '01';
  const maxChapter = Math.max(...chapters.map((c) => parseInt(c.number, 10)));
  return String(Math.min(99, maxChapter + 1)).padStart(2, '0');
}

export function ChapterContextPanel({ recordings }: ChapterContextPanelProps) {
  const chapters = useMemo(() => extractChapters(recordings), [recordings]);
  const nextChapter = useMemo(() => getNextChapter(chapters), [chapters]);

  const handleCopy = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      toast.success(`Copied: ${name}`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Don't render if no recordings
  if (recordings.length === 0) {
    return null;
  }

  return (
    <div className="w-48">
      <div className="bg-surface rounded-lg border border-warm shadow-sm">
        {/* Header */}
        <div className="px-3 py-2 border-b border-warm">
          <h3 className="text-xs font-semibold text-warm-muted uppercase tracking-wide">Chapters</h3>
        </div>

        {/* Chapter list */}
        <div className="max-h-64 overflow-y-auto">
          {chapters.map((chapter) => (
            <div
              key={chapter.number}
              className="flex items-center justify-between px-3 py-1.5 hover:bg-surface-hover group"
            >
              <span className="text-sm text-warm-secondary truncate">
                <span className="font-mono text-warm-muted">{chapter.number}</span>{' '}
                <span>{chapter.name}</span>
              </span>
              <button
                onClick={() => handleCopy(chapter.name)}
                className="p-1 text-warm-faint hover:text-warm-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                title={`Copy "${chapter.name}"`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Next chapter indicator */}
        <div className="px-3 py-2 border-t border-warm bg-surface-muted rounded-b-lg">
          <span className="text-xs text-warm-muted">
            Next: <span className="font-mono font-medium text-warm-secondary">{nextChapter}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
