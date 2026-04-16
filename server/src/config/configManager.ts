import path from 'path';
import fs from 'fs-extra';
import { migrateTargetToProject } from '../../../shared/paths.js';
import type { Config, DiskThresholds } from '../../../shared/types.js';

// B062: Default pain thresholds for disk space observability
export const DEFAULT_DISK_THRESHOLDS: DiskThresholds = {
  stagePenaltyMultiplier: 0.5,
  columns: {
    trash:   { faint: '0',      amber: '300MB',  red: '1GB'   },
    rec:     { faint: '2GB',    amber: '5GB',    red: '10GB'  },
    shadows: { faint: '100MB',  amber: '300MB',  red: '500MB' },
    other:   { faint: '500MB',  amber: '1GB',    red: null    },
    rRec:    { faint: '1GB',    amber: '3GB',    red: '6GB'   },
    r1st:    { faint: '500MB',  amber: '2GB',    red: '4GB'   },
    r2nd:    { faint: '500MB',  amber: '2GB',    red: '4GB'   },
    total:   { faint: '3GB',    amber: '8GB',    red: '15GB'  },
  }
};

// Default configuration values
// NFR-6: Includes migration from targetDirectory to projectDirectory
// FR-89 Part 5: Stores projectsRootDirectory + activeProject (derives projectDirectory)
export function getDefaultConfig(): Config {
  return {
    watchDirectory: process.env.WATCH_DIR || '~/Movies/Ecamm Live/',
    projectDirectory: '/tmp/project/', // Derived from root + active
    projectsRootDirectory: '~/dev/video-projects/v-appydave',
    activeProject: '',
    fileExtensions: ['.mov'],
    availableTags: ['CTA', 'SKOOL'], // NFR-2: Global tags (always visible)
    commonNames: [
      // NFR-3: Default common names with rules
      { name: 'intro', autoSequence: true },
      { name: 'demo' },
      { name: 'summary' },
      { name: 'outro', suggestTags: ['ENDCARD'] }, // suggestTags appear only for this name
    ],
    imageSourceDirectory: process.env.IMAGE_SOURCE_DIR || '~/Downloads', // FR-17
    shadowResolution: 240, // FR-89 Part 6: Default shadow resolution
  };
}

// Load config from file, falling back to env vars, then defaults
// NFR-6: Includes migration from targetDirectory to projectDirectory
// FR-89 Part 5: Stores projectsRootDirectory + activeProject (derives projectDirectory)
export function loadConfig(configPath: string): Config {
  const defaults = getDefaultConfig();

  try {
    if (fs.existsSync(configPath)) {
      const saved = fs.readJsonSync(configPath);
      console.log('Loaded config from:', configPath);

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
        delete saved.projectDirectory; // Remove old field
        needsSave = true;
        console.log(
          `Migration complete: root=${saved.projectsRootDirectory}, active=${saved.activeProject}`
        );
      }

      // FR-89 Part 5: Derive projectDirectory from root + active (for backward compatibility)
      if (saved.projectsRootDirectory && saved.activeProject) {
        saved.projectDirectory = path.join(saved.projectsRootDirectory, saved.activeProject);
      } else if (saved.projectsRootDirectory) {
        saved.projectDirectory = saved.projectsRootDirectory; // No active project yet
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
        if (saved.relayDirectory) toSave.relayDirectory = saved.relayDirectory;
        if (saved.relayEnabled !== undefined) toSave.relayEnabled = saved.relayEnabled;
        if (saved.machineRole) toSave.machineRole = saved.machineRole;
        if (saved.holdingPath) toSave.holdingPath = saved.holdingPath; // B064
        if (saved.publishedPath) toSave.publishedPath = saved.publishedPath; // storage-panel
        fs.writeJsonSync(configPath, toSave, { spaces: 2 });
        console.log('Config migration saved');
      }

      // B062: Apply disk threshold defaults if not set in saved config
      if (!saved.diskThresholds) {
        saved.diskThresholds = DEFAULT_DISK_THRESHOLDS;
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
export function saveConfig(configPath: string, config: Config): void {
  try {
    const toSave: Record<string, unknown> = {
      watchDirectory: config.watchDirectory,
      // FR-89 Part 5: Save split format
      projectsRootDirectory: config.projectsRootDirectory,
      activeProject: config.activeProject || '',
      availableTags: config.availableTags, // NFR-2: Persist tags
      commonNames: config.commonNames, // NFR-3: Persist common names
      imageSourceDirectory: config.imageSourceDirectory, // FR-17: Persist image source
      glingDictionary: config.glingDictionary || [], // FR-108: Persist Gling dictionary
    };
    // FR-32: Only save projectPriorities if it has values
    if (config.projectPriorities && Object.keys(config.projectPriorities).length > 0) {
      toSave.projectPriorities = config.projectPriorities;
    }
    // FR-32: Only save projectStages if it has values
    if (config.projectStages && Object.keys(config.projectStages).length > 0) {
      toSave.projectStages = config.projectStages;
    }
    // FR-110: Save project stage overrides (per-project manual assignments)
    if (config.projectStageOverrides && Object.keys(config.projectStageOverrides).length > 0) {
      toSave.projectStageOverrides = config.projectStageOverrides;
    }
    // FR-89 Part 6: Save shadow resolution if set
    if (config.shadowResolution) {
      toSave.shadowResolution = config.shadowResolution;
    }
    // FR-144: Persist POEM WUI settings
    if (config.poemWuiUrl) {
      toSave.poemWuiUrl = config.poemWuiUrl;
    }
    if (config.brandConfigPath) {
      toSave.brandConfigPath = config.brandConfigPath;
    }
    // B038: relay collaboration — use !== undefined so relayEnabled: false is saveable
    if (config.relayDirectory !== undefined) toSave.relayDirectory = config.relayDirectory;
    if (config.relayEnabled !== undefined) toSave.relayEnabled = config.relayEnabled;
    // B039: machine role
    if (config.machineRole !== undefined) toSave.machineRole = config.machineRole;
    // B064: archive-offload — holding SSD path (optional, machine-specific)
    if (config.holdingPath !== undefined) toSave.holdingPath = config.holdingPath;
    if (config.publishedPath !== undefined) toSave.publishedPath = config.publishedPath;
    fs.writeJsonSync(configPath, toSave, { spaces: 2 });
    console.log('Config saved to:', configPath);
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}
