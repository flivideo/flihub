import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

// ---------------------------------------------------------------------------
// Mock fs-extra before importing the module under test
// ---------------------------------------------------------------------------
vi.mock('fs-extra', () => ({
  default: {
    existsSync: vi.fn(),
    readJsonSync: vi.fn(),
    writeJsonSync: vi.fn(),
  },
}));

// Mock shared paths utility
vi.mock('../../../shared/paths.js', () => ({
  migrateTargetToProject: vi.fn((dir: string) => dir.replace('/target/', '/projects/')),
}));

import fs from 'fs-extra';
import { loadConfig, saveConfig, getDefaultConfig } from '../config/configManager.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TEST_CONFIG_PATH = '/tmp/test-config.json';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getDefaultConfig
// ---------------------------------------------------------------------------
describe('getDefaultConfig', () => {
  it('returns an object with all required fields', () => {
    const defaults = getDefaultConfig();
    expect(defaults).toMatchObject({
      projectDirectory: '/tmp/project/',
      fileExtensions: ['.mov'],
      availableTags: ['CTA', 'SKOOL'],
    });
    expect(Array.isArray(defaults.commonNames)).toBe(true);
    expect(defaults.commonNames.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// loadConfig — missing file → returns defaults
// ---------------------------------------------------------------------------
describe('loadConfig — missing file', () => {
  it('returns default config when file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const config = loadConfig(TEST_CONFIG_PATH);

    expect(config.fileExtensions).toEqual(['.mov']);
    expect(config.availableTags).toEqual(['CTA', 'SKOOL']);
    expect(config.shadowResolution).toBe(240);
    // Ensure fs.readJsonSync was never called
    expect(fs.readJsonSync).not.toHaveBeenCalled();
  });

  it('returns defaults when readJsonSync throws', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readJsonSync).mockImplementation(() => {
      throw new SyntaxError('Unexpected token');
    });

    const config = loadConfig(TEST_CONFIG_PATH);

    expect(config.fileExtensions).toEqual(['.mov']);
    expect(config.availableTags).toEqual(['CTA', 'SKOOL']);
  });
});

// ---------------------------------------------------------------------------
// loadConfig — valid JSON → parses and returns merged config
// ---------------------------------------------------------------------------
describe('loadConfig — valid JSON', () => {
  it('merges saved values over defaults', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readJsonSync).mockReturnValue({
      watchDirectory: '~/Movies/MyRecordings/',
      projectsRootDirectory: '~/dev/video-projects',
      activeProject: 'my-project',
      fileExtensions: ['.mov', '.mp4'],
      availableTags: ['CTA', 'SKOOL', 'CUSTOM'],
      commonNames: [{ name: 'intro', autoSequence: true }],
      imageSourceDirectory: '~/Desktop',
      shadowResolution: 480,
    });

    const config = loadConfig(TEST_CONFIG_PATH);

    expect(config.watchDirectory).toBe('~/Movies/MyRecordings/');
    expect(config.projectsRootDirectory).toBe('~/dev/video-projects');
    expect(config.activeProject).toBe('my-project');
    // projectDirectory should be derived from root + active
    expect(config.projectDirectory).toBe(
      path.join('~/dev/video-projects', 'my-project')
    );
    expect(config.fileExtensions).toEqual(['.mov', '.mp4']);
    expect(config.shadowResolution).toBe(480);
    expect(config.availableTags).toContain('CUSTOM');
  });

  it('derives projectDirectory from projectsRootDirectory when no activeProject', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readJsonSync).mockReturnValue({
      watchDirectory: '~/Movies/Ecamm Live/',
      projectsRootDirectory: '~/dev/video-projects',
      activeProject: '',
      fileExtensions: ['.mov'],
      availableTags: ['CTA'],
      commonNames: [],
      imageSourceDirectory: '~/Downloads',
    });

    const config = loadConfig(TEST_CONFIG_PATH);

    // When no activeProject, projectDirectory falls back to projectsRootDirectory
    expect(config.projectDirectory).toBe('~/dev/video-projects');
  });
});

// ---------------------------------------------------------------------------
// loadConfig — migration: old targetDirectory → projectDirectory
// ---------------------------------------------------------------------------
describe('loadConfig — migration: targetDirectory', () => {
  it('migrates targetDirectory to projectDirectory when both projectDirectory and projectsRootDirectory are absent', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readJsonSync).mockReturnValue({
      watchDirectory: '~/Movies/Ecamm Live/',
      targetDirectory: '/old/target/recordings',
      fileExtensions: ['.mov'],
      availableTags: ['CTA'],
      commonNames: [],
      imageSourceDirectory: '~/Downloads',
    });

    const config = loadConfig(TEST_CONFIG_PATH);

    // The mock migrateTargetToProject returns dir.replace('/target/', '/projects/')
    // so '/old/target/recordings' → '/old/projects/recordings'
    // Then the FR-89 Part 5 migration fires because projectDirectory is set
    // but projectsRootDirectory is not. So:
    //   projectsRootDirectory = path.dirname('/old/projects/recordings') = '/old/projects'
    //   activeProject         = path.basename('/old/projects/recordings') = 'recordings'
    expect(config.projectsRootDirectory).toBe('/old/projects');
    expect(config.activeProject).toBe('recordings');
    // Config must be saved because migration occurred
    expect(fs.writeJsonSync).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// loadConfig — migration: old projectDirectory (no split) → split format
// ---------------------------------------------------------------------------
describe('loadConfig — migration: projectDirectory split', () => {
  it('splits projectDirectory into projectsRootDirectory + activeProject', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readJsonSync).mockReturnValue({
      watchDirectory: '~/Movies/Ecamm Live/',
      projectDirectory: '/dev/video-projects/b67',
      fileExtensions: ['.mov'],
      availableTags: ['CTA'],
      commonNames: [],
      imageSourceDirectory: '~/Downloads',
    });

    const config = loadConfig(TEST_CONFIG_PATH);

    expect(config.projectsRootDirectory).toBe('/dev/video-projects');
    expect(config.activeProject).toBe('b67');
    // projectDirectory re-derived from root + active
    expect(config.projectDirectory).toBe(path.join('/dev/video-projects', 'b67'));
    // Migration save must be triggered
    expect(fs.writeJsonSync).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// saveConfig
// ---------------------------------------------------------------------------
describe('saveConfig', () => {
  it('writes the correct shape to the config path', () => {
    const config = {
      ...getDefaultConfig(),
      watchDirectory: '~/Movies/Ecamm Live/',
      projectsRootDirectory: '~/dev/video-projects',
      activeProject: 'my-project',
      availableTags: ['CTA', 'SKOOL'],
      imageSourceDirectory: '~/Downloads',
      poemWuiUrl: 'http://localhost:5041',
      brandConfigPath: '/path/to/brand-config.json',
    };

    saveConfig(TEST_CONFIG_PATH, config);

    expect(fs.writeJsonSync).toHaveBeenCalledOnce();
    const [calledPath, savedData] = vi.mocked(fs.writeJsonSync).mock.calls[0] as [
      string,
      Record<string, unknown>,
      unknown,
    ];
    expect(calledPath).toBe(TEST_CONFIG_PATH);
    expect(savedData.watchDirectory).toBe('~/Movies/Ecamm Live/');
    expect(savedData.projectsRootDirectory).toBe('~/dev/video-projects');
    expect(savedData.activeProject).toBe('my-project');
    // projectDirectory should NOT be saved (derived field)
    expect(savedData.projectDirectory).toBeUndefined();
    expect(savedData.poemWuiUrl).toBe('http://localhost:5041');
    expect(savedData.brandConfigPath).toBe('/path/to/brand-config.json');
  });

  it('does not write projectPriorities when empty', () => {
    const config = {
      ...getDefaultConfig(),
      projectPriorities: {},
    };

    saveConfig(TEST_CONFIG_PATH, config);

    const [, savedData] = vi.mocked(fs.writeJsonSync).mock.calls[0] as [
      string,
      Record<string, unknown>,
      unknown,
    ];
    expect(savedData.projectPriorities).toBeUndefined();
  });

  it('writes projectPriorities when non-empty', () => {
    const config = {
      ...getDefaultConfig(),
      projectPriorities: { myProject: 'pinned' as const },
    };

    saveConfig(TEST_CONFIG_PATH, config);

    const [, savedData] = vi.mocked(fs.writeJsonSync).mock.calls[0] as [
      string,
      Record<string, unknown>,
      unknown,
    ];
    expect(savedData.projectPriorities).toEqual({ myProject: 'pinned' });
  });

  it('handles writeJsonSync errors gracefully', () => {
    vi.mocked(fs.writeJsonSync).mockImplementation(() => {
      throw new Error('Disk full');
    });

    const config = getDefaultConfig();
    // Should not throw
    expect(() => saveConfig(TEST_CONFIG_PATH, config)).not.toThrow();
  });
});
