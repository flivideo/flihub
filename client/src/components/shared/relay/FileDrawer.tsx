import { useState, useMemo } from 'react';
import type { RelaySubfolder, RelayFileInfo } from '../../../../../shared/types';
import { useRelayFiles } from '../../../hooks/useRelayApi';
import { API_URL } from '../../../config';
import { VideoPlayerModal } from '../VideoPlayerModal';
import type { SyncDirection } from './types';
import { formatSize, formatRelativeTime, defaultIsPush } from './types';

// Video file extensions that can be played
const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.webm', '.mkv', '.avi'];

function isVideoFile(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return VIDEO_EXTENSIONS.includes(ext);
}

// ─── Chapter Group ───

interface ChapterGroupProps {
  chapter: string;
  files: RelayFileInfo[];
  onPlay: (file: RelayFileInfo) => void;
}

function ChapterGroup({ chapter, files, onPlay }: ChapterGroupProps) {
  return (
    <>
      {/* Chapter header row */}
      <tr className="bg-surface-muted">
        <td colSpan={4} className="px-4 py-1 text-xs font-semibold text-warm-secondary">
          Chapter {chapter}
        </td>
      </tr>
      {/* File rows */}
      {files.map((file) => (
        <tr key={file.filename} className="hover:bg-surface-hover">
          <td className="px-4 py-1.5 font-mono text-xs text-warm-secondary truncate max-w-[300px]">
            {file.filename}
          </td>
          <td className="px-4 py-1.5 text-xs text-warm-muted text-right">
            {formatSize(file.size)}
          </td>
          <td className="px-4 py-1.5 text-xs text-warm-muted text-right">
            {formatRelativeTime(file.modified)}
          </td>
          <td className="px-2 py-1.5 text-center w-10">
            {isVideoFile(file.filename) && (
              <button
                onClick={() => onPlay(file)}
                className="text-blue-500 hover:text-blue-600 transition-colors"
                title={`Play ${file.filename}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </button>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── File Drawer ───

export interface FileDrawerProps {
  subfolder: RelaySubfolder;
  label: string;
  isCreator: boolean;
  direction: SyncDirection;
  projectCode: string;
  onClose: () => void;
}

export function FileDrawer({ subfolder, label, isCreator, direction, projectCode, onClose }: FileDrawerProps) {
  const [previewFile, setPreviewFile] = useState<RelayFileInfo | null>(null);

  // Show files from the side that has content based on actual divergence direction
  const source = direction === 'outgoing' ? 'project'
    : direction === 'incoming' ? 'relay'
    : defaultIsPush(subfolder, isCreator) ? 'project' : 'relay';
  const { data, isLoading } = useRelayFiles(subfolder, source);

  const files = data?.files || [];

  // Group files by chapter
  const grouped = useMemo(() => {
    const map = new Map<string, RelayFileInfo[]>();
    for (const file of files) {
      const key = file.chapter;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(file);
    }
    return map;
  }, [files]);

  const totalChapters = grouped.size;
  const totalFiles = files.length;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // Build video URL from project code and subfolder, respecting source
  const getVideoUrl = (filename: string) => {
    const base = `${API_URL}/api/video/${projectCode}/${subfolder}/${encodeURIComponent(filename)}`;
    return source === 'relay' ? `${base}?source=relay` : base;
  };

  return (
    <div className="bg-surface border border-warm rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-muted border-b border-warm">
        <span className="text-sm font-semibold text-warm-secondary">
          {label} — {totalFiles} {totalFiles === 1 ? 'file' : 'files'}
        </span>
        <button
          onClick={onClose}
          className="text-warm-muted hover:text-warm-secondary text-sm px-1"
          title="Close"
        >
          &#10005;
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="px-4 py-3 text-sm text-warm-muted">Loading files...</div>
      ) : files.length === 0 ? (
        <div className="px-4 py-3 text-sm text-warm-muted">No files found</div>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium text-warm-muted uppercase bg-surface-muted sticky top-0">
              <tr>
                <th className="px-4 py-1.5">File</th>
                <th className="px-4 py-1.5 text-right w-20">Size</th>
                <th className="px-4 py-1.5 text-right w-32">Modified</th>
                <th className="px-2 py-1.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm">
              {Array.from(grouped.entries()).map(([chapter, chapterFiles]) => (
                <ChapterGroup
                  key={chapter}
                  chapter={chapter}
                  files={chapterFiles}
                  onPlay={setPreviewFile}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {files.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-surface-muted border-t border-warm text-xs text-warm-muted">
          <span>{totalChapters} {totalChapters === 1 ? 'chapter' : 'chapters'} · {totalFiles} {totalFiles === 1 ? 'file' : 'files'}</span>
          <span>{formatSize(totalSize)}</span>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewFile && (() => {
        // Check for companion .srt file in the file list
        const baseName = previewFile.filename.replace(/\.[^.]+$/, '');
        const srtFile = files.find(f => f.filename === `${baseName}.srt`);
        const srtUrl = srtFile ? getVideoUrl(srtFile.filename) : null;
        return (
          <VideoPlayerModal
            title={previewFile.filename}
            videoUrl={getVideoUrl(previewFile.filename)}
            onClose={() => setPreviewFile(null)}
            size={previewFile.size}
            projectCode={projectCode}
            recordingName={previewFile.filename}
            showTranscript={true}
            srtUrl={srtUrl}
          />
        );
      })()}
    </div>
  );
}
