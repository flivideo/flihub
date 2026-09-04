// @vitest-environment jsdom
// FR-148: Tests for health assessment logic
import { describe, it, expect } from 'vitest';
import { getHealthAssessment } from '../ProjectDrawer';
import type { ProjectStats } from '../../../../shared/types';

function makeProject(overrides: Partial<ProjectStats> = {}): ProjectStats {
  const defaults: ProjectStats = {
    code: 'A01-test',
    path: '/projects/A01-test',
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
    hasFinal: false,
  };
  return { ...defaults, ...overrides };
}

describe('getHealthAssessment', () => {
  it('returns planning message for planning stage with 0 files', () => {
    const project = makeProject({ stage: 'planning', totalFiles: 0 });
    expect(getHealthAssessment(project)).toBe('Project is in planning stage');
  });

  it('returns inactive warning for few files and old modification date', () => {
    const project = makeProject({
      totalFiles: 1,
      lastModified: '2025-01-01', // very old
    });
    expect(getHealthAssessment(project)).toMatch(/inactive/i);
  });

  it('returns ready-to-edit when 100% transcripts and recording stage', () => {
    const project = makeProject({
      stage: 'recording',
      transcriptPercent: 100,
    });
    expect(getHealthAssessment(project)).toMatch(/ready to edit/i);
  });

  it('returns partial transcript message with missing count', () => {
    const project = makeProject({
      transcriptPercent: 60,
      transcriptSync: { matched: 3, missingCount: 2, orphanedCount: 0 },
    });
    const result = getHealthAssessment(project);
    expect(result).toContain('60%');
    expect(result).toContain('2 recordings need transcription');
  });

  it('returns partial transcript message without missing count when missingCount is 0', () => {
    const project = makeProject({
      transcriptPercent: 75,
      transcriptSync: { matched: 3, missingCount: 0, orphanedCount: 1 },
    });
    const result = getHealthAssessment(project);
    expect(result).toContain('75%');
    expect(result).not.toContain('recordings need transcription');
  });

  it('returns needs-attention for files with no transcripts', () => {
    const project = makeProject({
      totalFiles: 8,
      transcriptPercent: 0,
      transcriptSync: { matched: 0, missingCount: 8, orphanedCount: 0 },
    });
    expect(getHealthAssessment(project)).toMatch(/needs attention/i);
  });

  it('returns stage description as default fallback', () => {
    const project = makeProject({
      stage: 'published',
      totalFiles: 10,
      transcriptPercent: 100,
    });
    const result = getHealthAssessment(project);
    // published + 100% transcripts but not recording stage, so falls through to default
    expect(result).toBe('Live on YouTube');
  });
});
