// FR-140: Visual Chapter Management with Click-to-Rename
import { useState, useMemo } from 'react';
import { parseRecordingFilename } from '../../../../shared/naming';

interface ChapterListPanelProps {
  recordings: string[];
  onClose: () => void;
}

export function ChapterListPanel({ recordings, onClose }: ChapterListPanelProps) {
  const [editingChapter, setEditingChapter] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Extract chapters from recordings
  const chapters = useMemo(() => {
    const chapterMap = new Map<number, number>();

    recordings.forEach((filename) => {
      const parsed = parseRecordingFilename(filename);
      if (parsed) {
        const chapterNum = parseInt(parsed.chapter, 10);
        chapterMap.set(chapterNum, (chapterMap.get(chapterNum) || 0) + 1);
      }
    });

    return Array.from(chapterMap.entries())
      .map(([number, fileCount]) => ({ number, fileCount }))
      .sort((a, b) => a.number - b.number);
  }, [recordings]);

  // Detect gaps (missing chapter numbers)
  const gaps = useMemo(() => {
    const gapNumbers: number[] = [];
    for (let i = 0; i < chapters.length - 1; i++) {
      const current = chapters[i].number;
      const next = chapters[i + 1].number;

      // If next chapter is more than 1 away, we have gaps
      if (next - current > 1) {
        for (let gap = current + 1; gap < next; gap++) {
          gapNumbers.push(gap);
        }
      }
    }
    return gapNumbers;
  }, [chapters]);

  // Handle chapter rename
  const handleRename = async (oldChapter: number, newChapter: number) => {
    if (oldChapter === newChapter) {
      setEditingChapter(null);
      return;
    }

    setIsRenaming(true);

    try {
      // Check if collision (target chapter exists)
      const collision = chapters.find((ch) => ch.number === newChapter);

      if (collision) {
        // SWAP: oldChapter ↔ newChapter
        const response = await fetch('/api/manage/swap-chapters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapter1: String(oldChapter).padStart(2, '0'),
            chapter2: String(newChapter).padStart(2, '0'),
          }),
        });

        const result = await response.json();

        if (result.success) {
          console.log(`[FR-140] Swapped chapters ${oldChapter} ↔ ${newChapter}`);
          // Trigger re-fetch via parent (recordings will update via Socket.io)
          window.location.reload(); // Simple approach - Socket.io will handle in production
        } else {
          alert(`Failed to swap chapters: ${result.error}`);
        }
      } else {
        // RENAME: oldChapter → newChapter
        const response = await fetch('/api/manage/rename-chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldChapter: String(oldChapter).padStart(2, '0'),
            newChapter: String(newChapter).padStart(2, '0'),
          }),
        });

        const result = await response.json();

        if (result.success) {
          console.log(
            `[FR-140] Renamed chapter ${oldChapter} → ${newChapter} (${result.filesRenamed} files)`
          );
          // Trigger re-fetch via parent
          window.location.reload();
        } else {
          alert(`Failed to rename chapter: ${result.error}`);
        }
      }
    } catch (err) {
      console.error('[FR-140] Rename error:', err);
      alert('Failed to rename chapter');
    } finally {
      setIsRenaming(false);
      setEditingChapter(null);
    }
  };

  // Start editing a chapter
  const startEditing = (chapter: number) => {
    setEditingChapter(chapter);
    setEditValue(String(chapter).padStart(2, '0'));
  };

  // Save edited chapter
  const saveEdit = () => {
    if (editingChapter === null) return;

    const newChapter = parseInt(editValue, 10);

    if (isNaN(newChapter) || newChapter < 1 || newChapter > 99) {
      alert('Chapter number must be between 01 and 99');
      return;
    }

    handleRename(editingChapter, newChapter);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingChapter(null);
    setEditValue('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Chapter Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            disabled={isRenaming}
          >
            ×
          </button>
        </div>

        {/* Chapter List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {chapters.map((chapter, index) => {
            const isEditing = editingChapter === chapter.number;
            const previousChapter = index > 0 ? chapters[index - 1].number : 0;
            const hasGap = chapter.number - previousChapter > 1;

            return (
              <div key={chapter.number}>
                {/* Gap Indicator */}
                {hasGap &&
                  gaps.map((gap) => {
                    if (gap > previousChapter && gap < chapter.number) {
                      return (
                        <div
                          key={gap}
                          className="text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded mb-2"
                        >
                          ⚠️ Gap at {String(gap).padStart(2, '0')}
                        </div>
                      );
                    }
                    return null;
                  })}

                {/* Chapter Panel */}
                <div className="border border-gray-200 rounded-lg p-3 bg-white hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>

                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-sm text-gray-600">Chapter</span>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          maxLength={2}
                          autoFocus
                          className="w-14 px-2 py-1 border border-blue-500 rounded text-center font-mono"
                          disabled={isRenaming}
                        />
                        <span className="text-sm text-gray-500">
                          ({chapter.fileCount} {chapter.fileCount === 1 ? 'file' : 'files'})
                        </span>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-2">
                        <button
                          onClick={() => startEditing(chapter.number)}
                          className="px-2 py-1 hover:bg-blue-50 rounded font-mono font-semibold text-blue-600 hover:text-blue-700"
                          disabled={isRenaming}
                        >
                          Chapter {String(chapter.number).padStart(2, '0')}
                        </button>
                        <span className="text-sm text-gray-500">
                          ({chapter.fileCount} {chapter.fileCount === 1 ? 'file' : 'files'})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {chapters.length === 0 && (
            <div className="text-center text-gray-400 py-8">No chapters found</div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <p className="text-sm text-gray-600">
            Click any chapter number to rename it. Auto-swaps if target exists.
          </p>
        </div>
      </div>
    </div>
  );
}
