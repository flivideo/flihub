import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
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
import { migrateTargetToProject } from '../../shared/paths.js';
import { WatcherManager } from './WatcherManager.js';
import { errorHandler } from './middleware/errorHandler.js';
import type { ServerToClientEvents, ClientToServerEvents, FileInfo, Config } from '../../shared/types.js';
import type { FSWatcher } from 'chokidar';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 5101;
const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

const app = express();
const httpServer = createServer(app);

// NFR-1: Dynamic CORS - allow any localhost origin in development
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: true,  // Reflects requesting origin (safe for local dev)
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));  // FR-42: Increased limit for base64 clipboard images

// In-memory store for pending files
const pendingFiles: Map<string, FileInfo> = new Map();

// Load config from file, falling back to env vars, then defaults
// NFR-6: Includes migration from targetDirectory to projectDirectory
// FR-89 Part 5: Stores projectsRootDirectory + activeProject (derives projectDirectory)
function loadConfig(): Config {
  const defaults: Config = {
    watchDirectory: process.env.WATCH_DIR || '~/Movies/Ecamm Live/',
    projectDirectory: '/tmp/project/',  // Derived from root + active
    projectsRootDirectory: '~/dev/video-projects/v-appydave',
    activeProject: '',
    fileExtensions: ['.mov'],
    availableTags: ['CTA', 'SKOOL'],  // NFR-2: Global tags (always visible)
    commonNames: [  // NFR-3: Default common names with rules
      { name: 'intro', autoSequence: true },
      { name: 'demo' },
      { name: 'summary' },
      { name: 'outro', suggestTags: ['ENDCARD'] },  // suggestTags appear only for this name
    ],
    imageSourceDirectory: process.env.IMAGE_SOURCE_DIR || '~/Downloads',  // FR-17
    shadowResolution: 240,  // FR-89 Part 6: Default shadow resolution
  };

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = fs.readJsonSync(CONFIG_FILE);
      console.log('Loaded config from:', CONFIG_FILE);

      let needsSave = false;

      // NFR-6: Migrate old targetDirectory to projectDirectory (then split below)
      if (saved.targetDirectory && !saved.projectDirectory && !saved.projectsRootDirectory) {
        console.log('Migrating targetDirectory...');
        saved.projectDirectory = migrateTargetToProject(saved.targetDirectory);
        delete saved.targetDirectory;
        needsSave = true;
      }

      // FR-89 Part 5: Migrate old projectDirectory to projectsRootDirectory + activeProject
      if (saved.projectDirectory && !saved.projectsRootDirectory) {
        console.log('Migrating projectDirectory to split format...');
        saved.projectsRootDirectory = path.dirname(saved.projectDirectory);
        saved.activeProject = path.basename(saved.projectDirectory);
        delete saved.projectDirectory;  // Remove old field
        needsSave = true;
        console.log(`Migration complete: root=${saved.projectsRootDirectory}, active=${saved.activeProject}`);
      }

      // FR-89 Part 5: Derive projectDirectory from root + active (for backward compatibility)
      if (saved.projectsRootDirectory && saved.activeProject) {
        saved.projectDirectory = path.join(saved.projectsRootDirectory, saved.activeProject);
      } else if (saved.projectsRootDirectory) {
        saved.projectDirectory = saved.projectsRootDirectory;  // No active project yet
      }

      // Save migrated config if format changed
      if (needsSave) {
        const toSave: Record<string, unknown> = {
          watchDirectory: saved.watchDirectory || defaults.watchDirectory,
          projectsRootDirectory: saved.projectsRootDirectory,
          activeProject: saved.activeProject || '',
          availableTags: saved.availableTags || defaults.availableTags,
          commonNames: saved.commonNames || defaults.commonNames,
          imageSourceDirectory: saved.imageSourceDirectory || defaults.imageSourceDirectory,
        };
        if (saved.projectPriorities) toSave.projectPriorities = saved.projectPriorities;
        if (saved.projectStages) toSave.projectStages = saved.projectStages;
        if (saved.shadowResolution) toSave.shadowResolution = saved.shadowResolution;
        fs.writeJsonSync(CONFIG_FILE, toSave, { spaces: 2 });
        console.log('Config migration saved');
      }

      return { ...defaults, ...saved };
    }
  } catch (error) {
    console.warn('Failed to load config file, using defaults:', error);
  }

  return defaults;
}

// Save config to file
// FR-89 Part 5: Saves projectsRootDirectory + activeProject (not projectDirectory)
function saveConfig(config: Config): void {
  try {
    const toSave: Record<string, unknown> = {
      watchDirectory: config.watchDirectory,
      // FR-89 Part 5: Save split format
      projectsRootDirectory: config.projectsRootDirectory,
      activeProject: config.activeProject || '',
      availableTags: config.availableTags,   // NFR-2: Persist tags
      commonNames: config.commonNames,        // NFR-3: Persist common names
      imageSourceDirectory: config.imageSourceDirectory,  // FR-17: Persist image source
    };
    // FR-32: Only save projectPriorities if it has values
    if (config.projectPriorities && Object.keys(config.projectPriorities).length > 0) {
      toSave.projectPriorities = config.projectPriorities;
    }
    // FR-32: Only save projectStages if it has values
    if (config.projectStages && Object.keys(config.projectStages).length > 0) {
      toSave.projectStages = config.projectStages;
    }
    // FR-89 Part 6: Save shadow resolution if set
    if (config.shadowResolution) {
      toSave.shadowResolution = config.shadowResolution;
    }
    fs.writeJsonSync(CONFIG_FILE, toSave, { spaces: 2 });
    console.log('Config saved to:', CONFIG_FILE);
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

// Current configuration
const currentConfig: Config = loadConfig();

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
  const watchDirChanged = newConfig.watchDirectory && newConfig.watchDirectory !== currentConfig.watchDirectory;

  if (newConfig.watchDirectory) currentConfig.watchDirectory = newConfig.watchDirectory;
  if (newConfig.imageSourceDirectory) currentConfig.imageSourceDirectory = newConfig.imageSourceDirectory;

  // FR-89 Part 5: Handle split project directory fields
  if (newConfig.projectsRootDirectory !== undefined) {
    currentConfig.projectsRootDirectory = newConfig.projectsRootDirectory;
  }
  if (newConfig.activeProject !== undefined) {
    currentConfig.activeProject = newConfig.activeProject;
  }

  // FR-89 Part 5: Derive projectDirectory from root + active (for backward compatibility)
  if (currentConfig.projectsRootDirectory && currentConfig.activeProject) {
    currentConfig.projectDirectory = path.join(currentConfig.projectsRootDirectory, currentConfig.activeProject);
  } else if (currentConfig.projectsRootDirectory) {
    currentConfig.projectDirectory = currentConfig.projectsRootDirectory;
  }

  // FR-89 Part 6: Handle shadow resolution
  if (newConfig.shadowResolution !== undefined) currentConfig.shadowResolution = newConfig.shadowResolution;

  // Persist config to file
  saveConfig(currentConfig);

  // Restart ecamm watcher if watch directory changed
  if (watchDirChanged) {
    startWatcher(currentConfig.watchDirectory);
  }

  // NFR-6: Let WatcherManager handle config-dependent watchers
  watcherManager.updateFromConfig(oldConfig, currentConfig);

  return currentConfig;
}

// FR-30: Setup transcription routes (must be before main routes to get queueTranscription)
const { router: transcriptionRoutes, queueTranscription } = createTranscriptionRoutes(
  () => currentConfig,
  io
);
app.use('/api/transcriptions', transcriptionRoutes);

// Setup routes with config update callback and transcription queue function
const routes = createRoutes(pendingFiles, currentConfig, updateConfig, queueTranscription);
app.use('/api', routes);

// FR-17: Setup asset routes for image management
const assetRoutes = createAssetRoutes(currentConfig);
app.use('/api/assets', assetRoutes);

// FR-27: Setup thumbnail routes for YouTube thumbnail management
const thumbRoutes = createThumbRoutes(currentConfig);
app.use('/api/thumbs', thumbRoutes);

// FR-29: Setup system routes for folder operations
// FR-90: Pass watcherManager to system routes
const systemRoutes = createSystemRoutes(currentConfig, watcherManager);
app.use('/api/system', systemRoutes);

// FR-32: Setup project routes for stats and priority management
const projectRoutes = createProjectRoutes(
  () => currentConfig,
  (config: Config) => {
    Object.assign(currentConfig, config);
    saveConfig(currentConfig);
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
    saveConfig(currentConfig);
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

// NFR-6: Global error handler (must be after routes)
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current pending files to newly connected client
  pendingFiles.forEach((file) => {
    socket.emit('file:new', file);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export for use in routes
export { io, pendingFiles };

// Start initial watchers
startWatcher(currentConfig.watchDirectory);
// NFR-6: Initialize all watchers via WatcherManager
watcherManager.initAll(currentConfig);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Watching directory: ${currentConfig.watchDirectory}`);
  console.log(`Project directory: ${currentConfig.projectDirectory}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (watcher) watcher.close();
  // NFR-6: Close all watchers via WatcherManager
  watcherManager.closeAll();
  // Close all socket connections
  io.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  // Force exit after 2 seconds if something hangs
  setTimeout(() => {
    console.log('Force exit');
    process.exit(0);
  }, 2000);
});
