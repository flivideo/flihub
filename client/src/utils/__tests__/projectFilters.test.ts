// FR-148: Tests for project filter logic
import { describe, it, expect } from 'vitest';
import { filterProjects, extractProjectName } from '../projectFilters';
import type { ProjectStats } from '../../../../shared/types';

// Minimal ProjectStats factory — only fields used by filters
function makeProject(overrides: Partial<ProjectStats> & Pick<ProjectStats, 'code'>): ProjectStats {
  const defaults: ProjectStats = {
    code: overrides.code,
    path: `/projects/${overrides.code}`,
    priority: 'normal',
    totalFiles: 5,
    chapterCount: 1,
    transcriptCount: 3,
    transcriptPercent: 60,
    transcriptSync: { matched: 3, missingCount: 2, orphanedCount: 0 },
    stage: 'recording',
    createdAt: '2026-01-01',
    lastModified: '2026-03-25',
    totalDuration: null,
    imageCount: 0,
    thumbCount: 0,
    hasInbox: false,
    hasAssets: false,
    hasChapters: false,
    inboxCount: 0,
    chapterVideoCount: 0,
    shadowCount: 0,
    hasFinal: false,
  };
  return { ...defaults, ...overrides };
}

const defaultOptions = {
  searchQuery: '',
  activeStages: new Set<string>(),
  activePreset: 'all',
};

describe('extractProjectName', () => {
  it('extracts name from standard project code', () => {
    expect(extractProjectName('A01-my-project')).toBe('my-project');
  });

  it('returns empty string for non-matching codes', () => {
    expect(extractProjectName('random')).toBe('');
    expect(extractProjectName('01-no-letter')).toBe('');
  });

  it('handles single character prefix with two digits', () => {
    expect(extractProjectName('Z99-final-cut')).toBe('final-cut');
  });
});

describe('filterProjects', () => {
  const projects = [
    makeProject({ code: 'A01-intro-video', stage: 'recording', totalFiles: 5, transcriptPercent: 60 }),
    makeProject({ code: 'B02-tutorial-setup', stage: 'first-edit', totalFiles: 10, transcriptPercent: 100 }),
    makeProject({ code: 'C03-outro-clip', stage: 'recording', totalFiles: 3, transcriptPercent: 100 }),
    makeProject({ code: 'D04-planning-only', stage: 'planning', totalFiles: 0, transcriptPercent: 0 }),
    makeProject({ code: 'E05-needs-transcripts', stage: 'recording', totalFiles: 8, transcriptPercent: 0 }),
  ];

  describe('search filter', () => {
    it('returns all projects when search is empty', () => {
      const result = filterProjects(projects, { ...defaultOptions, searchQuery: '' });
      expect(result).toHaveLength(5);
    });

    it('filters by project code', () => {
      const result = filterProjects(projects, { ...defaultOptions, searchQuery: 'B02' });
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('B02-tutorial-setup');
    });

    it('filters by extracted project name', () => {
      const result = filterProjects(projects, { ...defaultOptions, searchQuery: 'tutorial' });
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('B02-tutorial-setup');
    });

    it('is case-insensitive', () => {
      const result = filterProjects(projects, { ...defaultOptions, searchQuery: 'INTRO' });
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('A01-intro-video');
    });

    it('matches partial strings', () => {
      const result = filterProjects(projects, { ...defaultOptions, searchQuery: 'clip' });
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('C03-outro-clip');
    });
  });

  describe('stage filter', () => {
    it('returns all when no stages selected', () => {
      const result = filterProjects(projects, { ...defaultOptions, activeStages: new Set() });
      expect(result).toHaveLength(5);
    });

    it('filters to single stage', () => {
      const result = filterProjects(projects, { ...defaultOptions, activeStages: new Set(['planning']) });
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('D04-planning-only');
    });

    it('filters to multiple stages', () => {
      const result = filterProjects(projects, { ...defaultOptions, activeStages: new Set(['recording', 'first-edit']) });
      expect(result).toHaveLength(4);
    });
  });

  describe('preset: needs-attention', () => {
    it('finds projects with files but no transcripts', () => {
      const result = filterProjects(projects, { ...defaultOptions, activePreset: 'needs-attention' });
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('E05-needs-transcripts');
    });

    it('excludes projects with zero files', () => {
      const zeroFiles = [makeProject({ code: 'X01-empty', totalFiles: 0, transcriptPercent: 0 })];
      const result = filterProjects(zeroFiles, { ...defaultOptions, activePreset: 'needs-attention' });
      expect(result).toHaveLength(0);
    });
  });

  describe('preset: ready-to-edit', () => {
    it('finds recording-stage projects with 100% transcripts', () => {
      const result = filterProjects(projects, { ...defaultOptions, activePreset: 'ready-to-edit' });
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('C03-outro-clip');
    });

    it('excludes non-recording stages even with 100% transcripts', () => {
      // B02 has 100% but is in first-edit stage
      const result = filterProjects(projects, { ...defaultOptions, activePreset: 'ready-to-edit' });
      expect(result.find((p) => p.code === 'B02-tutorial-setup')).toBeUndefined();
    });
  });

  describe('preset: dead', () => {
    // Use a fixed "now" so tests are deterministic
    const NOW = new Date('2026-03-30T00:00:00Z').getTime();

    it('finds projects with few files and old modification date', () => {
      const deadProject = makeProject({
        code: 'F06-abandoned',
        totalFiles: 1,
        lastModified: '2026-01-15', // 74 days ago from NOW
      });
      const result = filterProjects([deadProject], { ...defaultOptions, activePreset: 'dead', now: NOW });
      expect(result).toHaveLength(1);
    });

    it('excludes recently modified projects', () => {
      const recentProject = makeProject({
        code: 'G07-recent',
        totalFiles: 1,
        lastModified: '2026-03-28', // 2 days ago
      });
      const result = filterProjects([recentProject], { ...defaultOptions, activePreset: 'dead', now: NOW });
      expect(result).toHaveLength(0);
    });

    it('excludes projects with many files even if old', () => {
      const bigProject = makeProject({
        code: 'H08-big-old',
        totalFiles: 10,
        lastModified: '2025-12-01',
      });
      const result = filterProjects([bigProject], { ...defaultOptions, activePreset: 'dead', now: NOW });
      expect(result).toHaveLength(0);
    });

    it('treats null lastModified as very old (dead)', () => {
      const nullDate = makeProject({
        code: 'I09-no-date',
        totalFiles: 2,
        lastModified: null,
      });
      const result = filterProjects([nullDate], { ...defaultOptions, activePreset: 'dead', now: NOW });
      expect(result).toHaveLength(1);
    });

    it('boundary: exactly 30 days is NOT dead (>30 required)', () => {
      const borderline = makeProject({
        code: 'J10-borderline',
        totalFiles: 1,
        lastModified: '2026-02-28', // exactly 30 days before 2026-03-30
      });
      const result = filterProjects([borderline], { ...defaultOptions, activePreset: 'dead', now: NOW });
      expect(result).toHaveLength(0);
    });
  });

  describe('combined filters', () => {
    it('applies search + stage together', () => {
      const result = filterProjects(projects, {
        searchQuery: 'video',
        activeStages: new Set(['recording']),
        activePreset: 'all',
      });
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('A01-intro-video');
    });

    it('applies search + preset together', () => {
      const result = filterProjects(projects, {
        searchQuery: 'E05',
        activeStages: new Set(),
        activePreset: 'needs-attention',
      });
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('E05-needs-transcripts');
    });
  });
});
