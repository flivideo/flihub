/**
 * B047: PreviewPanel — shows all pending changes before applying.
 *
 * Renders a blue-bordered panel listing old → new filenames, with badges
 * for instant renames vs re-transcription, split info, and apply/cancel buttons.
 */

export interface PreviewChange {
  oldFilename: string;
  newFilename: string;
  transcriptCount: number;
  needsReTranscription: boolean;
}

export interface PreviewPanelProps {
  changes: PreviewChange[];
  splitInfo?: { sourceChapter: string; newChapter: string };
  isApplying: boolean;
  onApply: () => void;
  onCancel: () => void;
}

export function PreviewPanel({
  changes,
  splitInfo,
  isApplying,
  onApply,
  onCancel,
}: PreviewPanelProps) {
  const instantCount = changes.filter((c) => !c.needsReTranscription).length;
  const reTranscribeCount = changes.filter((c) => c.needsReTranscription).length;

  // Group changes by source chapter (extracted from oldFilename prefix)
  const grouped = new Map<string, PreviewChange[]>();
  for (const change of changes) {
    const chapterMatch = change.oldFilename.match(/^(\d{2})-/);
    const chapter = chapterMatch ? chapterMatch[1] : '??';
    if (!grouped.has(chapter)) grouped.set(chapter, []);
    grouped.get(chapter)!.push(change);
  }

  return (
    <div className="border-2 border-blue-500 rounded-xl shadow-lg mb-4 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center gap-3 flex-wrap">
        <span className="font-semibold text-blue-900">
          Review {changes.length} change{changes.length !== 1 ? 's' : ''}
        </span>
        {instantCount > 0 && (
          <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
            {instantCount} instant rename{instantCount !== 1 ? 's' : ''}
          </span>
        )}
        {reTranscribeCount > 0 && (
          <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            {reTranscribeCount} need re-transcription
          </span>
        )}
        {splitInfo && (
          <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            Split ch{splitInfo.sourceChapter} &#8594; ch{splitInfo.sourceChapter} + ch{splitInfo.newChapter}
          </span>
        )}
      </div>

      {/* Body — scrollable */}
      <div className="max-h-[400px] overflow-y-auto px-4 py-2">
        {Array.from(grouped.entries()).map(([chapter, chapterChanges]) => (
          <div key={chapter} className="mb-3 last:mb-0">
            {/* Section header */}
            <div className="text-[10px] uppercase font-semibold tracking-wider text-warm-muted bg-surface-muted px-2 py-1 rounded mb-1">
              Chapter {chapter}
              {splitInfo && chapter === splitInfo.sourceChapter && (
                <span className="ml-1 normal-case">
                  &#8594; Chapter {splitInfo.sourceChapter} + Chapter {splitInfo.newChapter} (split + renumber)
                </span>
              )}
            </div>

            {/* Per-change rows */}
            {chapterChanges.map((change, idx) => {
              const extras: string[] = [];
              if (change.transcriptCount > 0) extras.push(`${change.transcriptCount} transcripts`);
              const note = extras.length > 0 ? `+ ${extras.join(' + ')}` : '';

              return (
                <div
                  key={change.oldFilename}
                  className={`flex items-center gap-2 px-2 py-1 text-xs font-mono rounded ${
                    idx % 2 === 0 ? 'bg-surface' : 'bg-surface-muted'
                  }`}
                >
                  {/* Status dot */}
                  <span
                    className={`flex-shrink-0 w-2 h-2 rounded-full ${
                      change.needsReTranscription ? 'bg-amber-400' : 'bg-green-400'
                    }`}
                  />

                  {/* Old filename */}
                  <span className="text-warm-muted line-through truncate max-w-[200px]">
                    {change.oldFilename}
                  </span>

                  {/* Arrow */}
                  <span className="text-warm-muted flex-shrink-0">&#8594;</span>

                  {/* New filename */}
                  <span className="text-green-700 font-bold truncate max-w-[200px]">
                    {change.newFilename}
                  </span>

                  {/* Note */}
                  {note && (
                    <span className="text-warm-muted text-[10px] flex-shrink-0">{note}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-blue-200 px-4 py-3">
        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-warm-muted mb-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            Instant: rename .mov + transcripts (no re-processing)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Re-transcribe: audio source changed (rare)
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm font-medium text-warm-secondary bg-surface-muted hover:bg-surface-hover rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            disabled={isApplying}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {isApplying ? 'Applying...' : `Apply ${changes.length} Change${changes.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
