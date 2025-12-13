import chokidar from 'chokidar';
import path from 'path';
import os from 'os';
import type { FSWatcher } from 'chokidar';
import type { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, Config } from '../../shared/types.js';
import { expandPath } from './utils/pathUtils.js';
import { getProjectPaths } from '../../shared/paths.js';

/**
 * WatcherManager centralizes all file system watchers.
 *
 * NFR-6: Simplifies watcher management by encapsulating:
 * - Watcher lifecycle (start/stop/restart)
 * - Debounced socket emissions
 * - Graceful cleanup
 */

interface WatcherConfig {
  name: string;
  pattern: string | string[];
  event: keyof ServerToClientEvents;
  debounceMs?: number;
  depth?: number;
  ignored?: RegExp;
  watchEvents?: ('add' | 'unlink' | 'change' | 'addDir' | 'unlinkDir')[];
}

export class WatcherManager {
  private watchers: Map<string, FSWatcher> = new Map();
  private debounceTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private io: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  /**
   * Start a watcher with the given configuration
   */
  private startWatcher(config: WatcherConfig): void {
    // Stop existing watcher if any
    this.stopWatcher(config.name);

    console.log(`Setting up ${config.name} watcher for: ${config.pattern}`);

    const watcher = chokidar.watch(config.pattern, {
      persistent: true,
      ignoreInitial: true,
      depth: config.depth ?? 0,
      ignored: config.ignored,
    });

    const emitChange = () => {
      const existingTimeout = this.debounceTimeouts.get(config.name);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeout = setTimeout(() => {
        console.log(`${config.name} change detected`);
        // @ts-expect-error - dynamic event emission
        this.io.emit(config.event);
      }, config.debounceMs ?? 200);

      this.debounceTimeouts.set(config.name, timeout);
    };

    // Subscribe to specified events (defaults to add/unlink)
    const events = config.watchEvents ?? ['add', 'unlink'];
    for (const event of events) {
      watcher.on(event, emitChange);
    }

    watcher.on('error', (error: Error) => {
      console.log(`${config.name} watcher note:`, error.message);
    });

    watcher.on('ready', () => {
      console.log(`${config.name} watcher ready`);
    });

    this.watchers.set(config.name, watcher);
  }

  /**
   * Stop a specific watcher
   */
  private stopWatcher(name: string): void {
    const watcher = this.watchers.get(name);
    if (watcher) {
      watcher.close();
      this.watchers.delete(name);
    }

    const timeout = this.debounceTimeouts.get(name);
    if (timeout) {
      clearTimeout(timeout);
      this.debounceTimeouts.delete(name);
    }
  }

  /**
   * Start ZIP watcher for Downloads folder
   */
  startZipWatcher(): void {
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    this.startWatcher({
      name: 'zip',
      pattern: path.join(downloadsPath, '*.zip'),
      event: 'thumbs:zip-added',
    });
  }

  /**
   * Start incoming images watcher
   */
  startIncomingImagesWatcher(sourceDir: string): void {
    const expandedSource = expandPath(sourceDir);
    this.startWatcher({
      name: 'incoming-images',
      pattern: path.join(expandedSource, '*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}'),
      event: 'assets:incoming-changed',
    });
  }

  /**
   * Start assigned images watcher
   */
  startAssignedImagesWatcher(projectDir: string): void {
    const paths = getProjectPaths(expandPath(projectDir));
    this.startWatcher({
      name: 'assigned-images',
      pattern: paths.images,
      event: 'assets:assigned-changed',
      watchEvents: ['add', 'unlink', 'change'],
    });
  }

  /**
   * Start recordings watcher (recordings/ and safe/ folders)
   */
  startRecordingsWatcher(projectDir: string): void {
    const paths = getProjectPaths(expandPath(projectDir));
    this.startWatcher({
      name: 'recordings',
      pattern: [paths.recordings, paths.safe],
      event: 'recordings:changed',
      watchEvents: ['add', 'unlink', 'change'],
    });
  }

  /**
   * Start projects watcher (parent directory of current project)
   */
  startProjectsWatcher(projectDir: string): void {
    const expandedProject = expandPath(projectDir);
    const projectsRoot = path.dirname(expandedProject);
    this.startWatcher({
      name: 'projects',
      pattern: projectsRoot,
      event: 'projects:changed',
      debounceMs: 500,
      depth: 1,
      ignored: /(^|[\/\\])\../,
      watchEvents: ['addDir', 'unlinkDir'],
    });
  }

  /**
   * Update watchers based on config changes
   */
  updateFromConfig(oldConfig: Config | null, newConfig: Config): void {
    // Restart project-specific watchers if project directory changed
    if (!oldConfig || oldConfig.projectDirectory !== newConfig.projectDirectory) {
      this.startAssignedImagesWatcher(newConfig.projectDirectory);
      this.startRecordingsWatcher(newConfig.projectDirectory);
      this.startProjectsWatcher(newConfig.projectDirectory);
    }

    // Restart incoming images watcher if source directory changed
    if (!oldConfig || oldConfig.imageSourceDirectory !== newConfig.imageSourceDirectory) {
      this.startIncomingImagesWatcher(newConfig.imageSourceDirectory);
    }
  }

  /**
   * Initialize all watchers from config
   */
  initAll(config: Config): void {
    this.startZipWatcher();
    this.startIncomingImagesWatcher(config.imageSourceDirectory);
    this.startAssignedImagesWatcher(config.projectDirectory);
    this.startRecordingsWatcher(config.projectDirectory);
    this.startProjectsWatcher(config.projectDirectory);
  }

  /**
   * Close all watchers (for graceful shutdown)
   */
  closeAll(): void {
    for (const [name] of this.watchers) {
      this.stopWatcher(name);
    }
    console.log('All watchers closed');
  }
}
