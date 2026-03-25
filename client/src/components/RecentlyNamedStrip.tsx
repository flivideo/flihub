/**
 * Recently Named strip — horizontal card row of the last 5 renamed recordings.
 * Shows below Incoming Files on the Incoming page, giving quick playback access
 * without switching to the Recordings tab.
 */

import { useState } from 'react';
import { API_URL } from '../config';
import { VideoPlayerModal } from './shared/VideoPlayerModal';
import { parseRecordingFilename } from '../../../shared/naming';
import type { RecentRename } from '../../../shared/types';

interface RecentlyNamedStripProps {
  renames: RecentRename[];
  projectCode: string;
  onUndo: (id: string) => void;
  undoPending: boolean;
}

function formatAge(ageSeconds: number): string {
  if (ageSeconds < 60) return 'just now';
  if (ageSeconds < 120) return '1 min ago';
  return `${Math.floor(ageSeconds / 60)} min ago`;
}

function parseDisplayInfo(newName: string) {
  const parsed = parseRecordingFilename(newName);
  if (!parsed) return { badge: '??', label: newName.replace(/\.[^.]+$/, '') };
  return {
    badge: `${parsed.chapter}-${parsed.sequence}`,
    label: parsed.name,
  };
}

export function RecentlyNamedStrip({ renames, projectCode, onUndo, undoPending }: RecentlyNamedStripProps) {
  const [previewFile, setPreviewFile] = useState<RecentRename | null>(null);

  if (renames.length === 0) return null;

  return (
    <section className="mt-6">
      <h3 className="text-sm font-medium text-warm-muted mb-2">Recently Named</h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {renames.map((rename) => {
          const { badge, label } = parseDisplayInfo(rename.newName);
          return (
            <div
              key={rename.id}
              className="flex-shrink-0 w-40 bg-surface rounded-lg border border-warm overflow-hidden hover:border-blue-300 transition-colors"
            >
              {/* Play button area */}
              <button
                onClick={() => setPreviewFile(rename)}
                className="w-full px-3 pt-3 pb-2 text-left group"
                title={`Play ${rename.newName}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-blue-500 group-hover:text-blue-600 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </span>
                  <span className="font-mono text-xs font-semibold text-warm-secondary">{badge}</span>
                </div>
                <p className="text-sm text-warm-primary truncate" title={label}>{label}</p>
                <p className="text-xs text-warm-muted mt-0.5">{formatAge(rename.age)}</p>
              </button>

              {/* Undo footer */}
              <div className="px-3 py-1.5 border-t border-warm bg-surface-muted">
                <button
                  onClick={() => onUndo(rename.id)}
                  disabled={undoPending}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                >
                  Undo
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Preview Modal */}
      {previewFile && (
        <VideoPlayerModal
          title={previewFile.newName}
          videoUrl={`${API_URL}/api/video/recordings/${encodeURIComponent(previewFile.newName)}`}
          onClose={() => setPreviewFile(null)}
          projectCode={projectCode}
          recordingName={previewFile.newName}
          showTranscript={true}
        />
      )}
    </section>
  );
}
