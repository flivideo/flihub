import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import type { FileInfo } from '../../shared/types.js';
import { expandPath } from './utils/pathUtils.js';
import { WATCHER } from '../../shared/constants.js';
import { getVideoDuration } from './utils/videoDuration.js';

export function createWatcher(
  watchDir: string,
  onNewFile: (file: FileInfo) => void,
  onFileDeleted?: (filePath: string) => void
): chokidar.FSWatcher {
  const expandedPath = expandPath(watchDir);
  const watchPattern = path.join(expandedPath, '*.mov');

  console.log(`Setting up watcher for: ${watchPattern}`);

  const watcher = chokidar.watch(watchPattern, {
    persistent: true,
    ignoreInitial: false, // Process existing files on startup
    awaitWriteFinish: {
      stabilityThreshold: WATCHER.STABILITY_THRESHOLD_MS,
      pollInterval: WATCHER.POLL_INTERVAL_MS,
    },
  });

  watcher.on('add', async (filePath: string) => {
    const filename = path.basename(filePath);

    // Get file stats (size and modification time)
    let size = 0;
    let mtime = new Date();
    try {
      const stats = fs.statSync(filePath);
      size = stats.size;
      mtime = stats.mtime;  // Use actual file modification time
    } catch (err) {
      console.warn('Could not get file stats:', err);
    }

    // NFR-7: Get video duration using ffprobe
    const duration = await getVideoDuration(filePath);

    const file: FileInfo = {
      path: filePath,
      filename,
      timestamp: mtime.toISOString(),
      size,
      duration: duration ?? undefined,
    };
    onNewFile(file);
  });

  // FR-4: Detect when files are deleted from disk
  watcher.on('unlink', (filePath: string) => {
    console.log('File deleted from disk:', path.basename(filePath));
    if (onFileDeleted) {
      onFileDeleted(filePath);
    }
  });

  watcher.on('error', (error: Error) => {
    console.error('Watcher error:', error);
  });

  watcher.on('ready', () => {
    console.log('File watcher ready');
  });

  return watcher;
}
