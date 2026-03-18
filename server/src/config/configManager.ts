import path from 'path';
import fs from 'fs-extra';
import { migrateTargetToProject } from '../../../shared/paths.js';
import type { Config } from '../../../shared/types.js';

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
        fs.writeJsonSync(configPath, toSave, { spaces: 2 });
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
    fs.writeJsonSync(configPath, toSave, { spaces: 2 });
    console.log('Config saved to:', configPath);
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}
