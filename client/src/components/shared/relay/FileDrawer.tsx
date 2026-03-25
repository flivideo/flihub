import { useMemo } from 'react';
import type { RelaySubfolder, RelayFileInfo } from '../../../../../shared/types';
import { useRelayFiles } from '../../../hooks/useRelayApi';
import type { SyncDirection } from './types';
import { formatSize, formatRelativeTime, defaultIsPush } from './types';

// ─── Chapter Group ───

function ChapterGroup({ chapter, files }: { chapter: string; files: RelayFileInfo[] }) {
  return (
    <>
      {/* Chapter header row */}
      <tr className="bg-surface-muted">
        <td colSpan={3} className="px-4 py-1 text-xs font-semibold text-warm-secondary">
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
  onClose: () => void;
}

export function FileDrawer({ subfolder, label, isCreator, direction, onClose }: FileDrawerProps) {
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
              </tr>
            </thead>
            <tbody className="divide-y divide-warm">
              {Array.from(grouped.entries()).map(([chapter, chapterFiles]) => (
                <ChapterGroup key={chapter} chapter={chapter} files={chapterFiles} />
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
    </div>
  );
}
