import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { env } from './config/env.js';
import { log } from './config/logger.js';
import { createWatcher } from './watcher.js';
import { createRoutes } from './routes/index.js';
import { createAssetRoutes } from './routes/assets.js';
import { createThumbRoutes } from './routes/thumbs.js';
import { createSystemRoutes } from './routes/system.js';
import { createTranscriptionRoutes } from './routes/transcriptions.js';
import { createProjectRoutes } from './routes/projects.js';
import { createQueryRoutes } from './routes/query/index.js';
import { createChapterRoutes } from './routes/chapters.js';
import { createVideoRoutes } from './routes/video.js';
import { createShadowsRouter } from './routes/shadows.js';
import { createEditRoutes } from './routes/edit.js';
import { createManageRoutes } from './routes/manage.js';
import { createPoemWuiRoutes } from './routes/poem-wui.js';
import { createStateRoutes } from './routes/state.js';
import { createDeveloperRoutes } from './routes/developer.js';
import { createRelayRoutes } from './routes/relay.js';
import { createSyncRoutes } from './routes/sync.js';
import { createHoldRoutes } from './routes/hold.js'; // B064: archive-offload hold routes
import { createStorageRoutes } from './routes/storage.js'; // storage-panel WU1: per-project Hold + Archive verbs
import { createMicCheckRoutes } from './routes/miccheck.js'; // MicCheck: live monitoring session API
import { migrateSafeFolder, needsMigration } from './utils/safeMigration.js';
import { loadConfig, saveConfig } from './config/configManager.js';
import { WatcherManager } from './WatcherManager.js';
import { errorHandler } from './middleware/errorHandler.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  FileInfo,
  Config,
} from '../../shared/types.js';
import type { FSWatcher } from 'chokidar';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = env.PORT;
const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

// Attempt to kill any process using our port (handles orphaned processes after crash)
function cleanupPort(port: number | string): void {
  try {
    // Find process IDs using the port
    const result = execSync(`lsof -ti:${port} 2>/dev/null || true`, { encoding: 'utf-8' });
    const pids = result.trim().split('\n').filter(Boolean);

    if (pids.length > 0) {
      console.log(`Found existing processes on port ${port}: ${pids.join(', ')}`);
      // Kill them
      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid} 2>/dev/null || true`);
          console.log(`Killed process ${pid}`);
        } catch {
          // Process may have already exited
        }
      }
      // Brief pause to let port release
      execSync('sleep 0.5');
    }
  } catch {
    // lsof might not be available on all systems, continue anyway
  }
}

// Clean up port before starting
cleanupPort(PORT);

const app = express();
const httpServer = createServer(app);

// NFR-1: Dynamic CORS - allow any localhost origin in development
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: true, // Reflects requesting origin (safe for local dev)
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // FR-42: Increased limit for base64 clipboard images

// In-memory store for pending files
const pendingFiles: Map<string, FileInfo> = new Map();

// Load config — delegates to configManager with the resolved CONFIG_FILE path
// NFR-6: Includes migration from targetDirectory to projectDirectory
// FR-89 Part 5: Stores projectsRootDirectory + activeProject (derives projectDirectory)
function loadConfigFromFile(): Config {
  return loadConfig(CONFIG_FILE);
}

// Save config — delegates to configManager with the resolved CONFIG_FILE path
// FR-89 Part 5: Saves projectsRootDirectory + activeProject (not projectDirectory)
function saveConfigToFile(config: Config): void {
  saveConfig(CONFIG_FILE, config);
}

// Current configuration
const currentConfig: Config = loadConfigFromFile();

// Current ecamm watcher instance (separate from WatcherManager as it has special handling)
let watcher: FSWatcher | null = null;

// NFR-6: Centralized watcher management for real-time updates
const watcherManager = new WatcherManager(io);

// Function to handle new file detection
function onNewFile(file: FileInfo) {
  console.log('New file detected:', file.filename);
  pendingFiles.set(file.path, file);
  io.emit('file:new', file);
}

// FR-4: Function to handle file deletion from disk
function onFileDeleted(filePath: string) {
  if (pendingFiles.has(filePath)) {
    pendingFiles.delete(filePath);
    io.emit('file:deleted', { path: filePath });
    console.log('File removed from pending (deleted from disk):', filePath);
  }
}

// Function to start/restart the watcher
function startWatcher(watchDir: string): void {
  // Close existing watcher if any
  if (watcher) {
    console.log('Stopping previous watcher...');
    watcher.close();
  }

  // Clear pending files when watch directory changes
  pendingFiles.clear();

  // Create new watcher with delete callback
  watcher = createWatcher(watchDir, onNewFile, onFileDeleted);
  console.log(`Watcher started for: ${watchDir}`);
}

// Function to update config and restart watchers if needed
// NFR-6: Uses WatcherManager for centralized watcher management
// FR-89 Part 5: Handles projectsRootDirectory + activeProject
function updateConfig(newConfig: Partial<Config>): Config {
  const oldConfig = { ...currentConfig };
  const watchDirChanged =
    newConfig.watchDirectory && newConfig.watchDirectory !== currentConfig.watchDirectory;

  if (newConfig.watchDirectory) currentConfig.watchDirectory = newConfig.watchDirectory;
  if (newConfig.imageSourceDirectory)
    currentConfig.imageSourceDirectory = newConfig.imageSourceDirectory;

  // FR-89 Part 5: Handle split project directory fields
  if (newConfig.projectsRootDirectory !== undefined) {
    currentConfig.projectsRootDirectory = newConfig.projectsRootDirectory;
  }
  if (newConfig.activeProject !== undefined) {
    currentConfig.activeProject = newConfig.activeProject;
  }

  // FR-89 Part 5: Derive projectDirectory from root + active (for backward compatibility)
  if (currentConfig.projectsRootDirectory && currentConfig.activeProject) {
    currentConfig.projectDirectory = path.join(
      currentConfig.projectsRootDirectory,
      currentConfig.activeProject
    );
  } else if (currentConfig.projectsRootDirectory) {
    currentConfig.projectDirectory = currentConfig.projectsRootDirectory;
  }

  // FR-89 Part 6: Handle shadow resolution
  if (newConfig.shadowResolution !== undefined)
    currentConfig.shadowResolution = newConfig.shadowResolution;

  // FR-108: Handle Gling dictionary
  if (newConfig.glingDictionary !== undefined)
    currentConfig.glingDictionary = newConfig.glingDictionary;

  // FR-116: Handle common names
  if (newConfig.commonNames !== undefined) currentConfig.commonNames = newConfig.commonNames;

  // B039: Handle relay + machine role fields
  if (newConfig.relayEnabled !== undefined) currentConfig.relayEnabled = newConfig.relayEnabled;
  if (newConfig.relayDirectory !== undefined) currentConfig.relayDirectory = newConfig.relayDirectory;
  if (newConfig.machineRole !== undefined) currentConfig.machineRole = newConfig.machineRole;

  // storage-panel: Handle T7 holding + published paths
  if (newConfig.holdingPath !== undefined) currentConfig.holdingPath = newConfig.holdingPath;
  if (newConfig.publishedPath !== undefined) currentConfig.publishedPath = newConfig.publishedPath;

  // Persist config to file
  saveConfigToFile(currentConfig);

  // Restart ecamm watcher if watch directory changed
  if (watchDirChanged) {
    startWatcher(currentConfig.watchDirectory);
  }

  // NFR-6: Let WatcherManager handle config-dependent watchers
  watcherManager.updateFromConfig(oldConfig, currentConfig);

  return currentConfig;
}

// FR-30: Setup transcription routes (must be before main routes to get queueTranscription)
// FR-130: Also get queue getters for rename conflict detection
const {
  router: transcriptionRoutes,
  queueTranscription,
  killActiveProcess,
  getActiveJob,
  getQueue,
} = createTranscriptionRoutes(() => currentConfig, io);
app.use('/api/transcriptions', transcriptionRoutes);

// Setup routes with config update callback and transcription queue function
// FR-130: Also pass queue getters for rename conflict detection
// Socket.IO for real-time state updates (park/unpark)
const routes = createRoutes(
  pendingFiles,
  currentConfig,
  updateConfig,
  queueTranscription,
  getActiveJob,
  getQueue,
  io
);
app.use('/api', routes);

// FR-17: Setup asset routes for image management
const assetRoutes = createAssetRoutes(() => currentConfig);
app.use('/api/assets', assetRoutes);

// FR-27: Setup thumbnail routes for YouTube thumbnail management
const thumbRoutes = createThumbRoutes(() => currentConfig);
app.use('/api/thumbs', thumbRoutes);

// FR-29: Setup system routes for folder operations
// FR-90: Pass watcherManager to system routes
const systemRoutes = createSystemRoutes(() => currentConfig, watcherManager);
app.use('/api/system', systemRoutes);

// FR-32: Setup project routes for stats and priority management
const projectRoutes = createProjectRoutes(
  () => currentConfig,
  (config: Config) => {
    Object.assign(currentConfig, config);
    saveConfigToFile(currentConfig);
  }
);
app.use('/api/projects', projectRoutes);

// NFR-8: Setup query routes for external data access (LLM context, tools)
const queryRoutes = createQueryRoutes(() => currentConfig);
app.use('/api/query', queryRoutes);

// FR-58: Setup chapter recording routes
const chapterRoutes = createChapterRoutes(
  () => currentConfig,
  (config: Config) => {
    Object.assign(currentConfig, config);
    saveConfigToFile(currentConfig);
  },
  io
);
app.use('/api/chapters', chapterRoutes);

// FR-70: Setup video streaming routes
const videoRoutes = createVideoRoutes(() => currentConfig);
app.use('/api/video', videoRoutes);

// FR-83: Setup shadow recording routes
const shadowRoutes = createShadowsRouter(() => currentConfig);
app.use('/api/shadows', shadowRoutes);

// FR-102: Setup edit prep routes
const editRoutes = createEditRoutes(() => currentConfig);
app.use('/api/edit', editRoutes);

// FR-131: Setup manage panel routes (bulk operations + Phase 2 regen)
const manageRoutes = createManageRoutes(
  () => currentConfig,
  io,
  queueTranscription,
  getActiveJob,
  getQueue
);
app.use('/api/manage', manageRoutes);

// FR-144: Setup POEM WUI routes
const poemWuiRoutes = createPoemWuiRoutes(() => currentConfig);
app.use('/api/poem-wui', poemWuiRoutes);

// FR-111: Setup project state routes (FR-123: pass io for socket events)
const stateRoutes = createStateRoutes(() => currentConfig, io);
app.use('/api', stateRoutes);

// FR-127: Setup developer tools routes
const developerRoutes = createDeveloperRoutes(currentConfig);
app.use('/api/developer', developerRoutes);

// B038: Setup relay collaboration routes
const relayRoutes = createRelayRoutes(() => currentConfig);
app.use('/api/relay', relayRoutes);

// B044: Setup sync hub routes
const syncRoutes = createSyncRoutes(() => currentConfig);
app.use('/api/sync', syncRoutes);

// B064: Setup hold/offload routes — archive projects to/from T7 SSD
const holdRoutes = createHoldRoutes(() => currentConfig);
app.use('/api/projects', holdRoutes);

// storage-panel WU1: Setup storage routes — per-project Hold + Archive verbs
const storageRoutes = createStorageRoutes(() => currentConfig);
app.use('/api/projects', storageRoutes);

// MicCheck: write side of the microphone-monitoring API.
// Reads live under /api/query/miccheck/* (the namespace the flihub skill reaches).
const micCheckRoutes = createMicCheckRoutes(() => currentConfig, io);
app.use('/api/miccheck', micCheckRoutes);

// NFR-6: Global error handler (must be after routes)
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  log.info('Client connected', { socketId: socket.id });

  // Send current pending files to newly connected client
  pendingFiles.forEach((file) => {
    socket.emit('file:new', file);
  });

  socket.on('disconnect', () => {
    log.info('Client disconnected', { socketId: socket.id });
  });
});

// Export for use in routes
export { io, pendingFiles };

// FR-111: Run safe folder migration on startup (async, non-blocking)
(async () => {
  if (currentConfig.projectDirectory) {
    try {
      if (await needsMigration(currentConfig.projectDirectory)) {
        console.log('[FR-111] Starting safe folder migration...');
        const result = await migrateSafeFolder(currentConfig.projectDirectory);
        console.log(
          `[FR-111] Migration complete: ${result.migrated} files, ${result.shadowsMigrated} shadows`
        );
        if (result.errors.length > 0) {
          console.warn('[FR-111] Migration warnings:', result.errors);
        }
      }
    } catch (err) {
      console.error('[FR-111] Migration error (non-fatal):', err);
    }
  }
})();

// Start initial watchers
startWatcher(currentConfig.watchDirectory);
// NFR-6: Initialize all watchers via WatcherManager
watcherManager.initAll(currentConfig);

// Start server
httpServer.listen(PORT, () => {
  log.info('FliHub server started', {
    port: PORT,
    nodeEnv: env.NODE_ENV,
    watchDirectory: currentConfig.watchDirectory,
    projectDirectory: currentConfig.projectDirectory,
  });
});

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down...`);

  // Kill any active Whisper transcription process
  killActiveProcess();

  if (watcher) watcher.close();
  // NFR-6: Close all watchers via WatcherManager
  watcherManager.closeAll();
  console.log('All watchers closed');

  // Close all socket connections
  io.close();

  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force exit after 3 seconds if something hangs
  setTimeout(() => {
    console.log('Force exit');
    process.exit(0);
  }, 3000);
}

// Handle both SIGINT (Ctrl+C) and SIGTERM (nodemon restart)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Global error handlers to catch crashes and log them
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  console.error('Stack:', err.stack);
  // Don't exit - let nodemon handle restart
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
});
