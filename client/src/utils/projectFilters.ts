// FR-148: Pure filter logic extracted from ProjectsPanel for testability
import type { ProjectStats } from '../../../shared/types';
import { daysAgo } from './formatting';

/** Extract human-readable name from project code (e.g., "A01-my-project" → "my-project") */
export function extractProjectName(code: string): string {
  const match = code.match(/^[a-zA-Z]\d{2}-(.+)$/);
  return match ? match[1] : '';
}

export interface FilterOptions {
  searchQuery: string;
  activeStages: Set<string>;
  activePreset: string;
  now?: number; // injectable timestamp for testing date-dependent filters
}

/** Filter projects by search, stage, and preset. Pure function — no side effects. */
export function filterProjects(projects: ProjectStats[], options: FilterOptions): ProjectStats[] {
  const { searchQuery, activeStages, activePreset, now = Date.now() } = options;
  let result = projects;

  // Search filter — matches code and extracted name
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        extractProjectName(p.code).toLowerCase().includes(q)
    );
  }

  // Stage filter (if any stages selected)
  if (activeStages.size > 0) {
    result = result.filter((p) => activeStages.has(p.stage));
  }

  // Preset filter
  if (activePreset === 'needs-attention') {
    result = result.filter((p) => p.totalFiles > 0 && p.transcriptPercent === 0);
  } else if (activePreset === 'dead') {
    result = result.filter((p) => {
      const daysSince = daysAgo(p.lastModified, now);
      return p.totalFiles <= 2 && daysSince > 30;
    });
  } else if (activePreset === 'ready-to-edit') {
    result = result.filter(
      (p) => p.totalFiles > 0 && p.transcriptPercent === 100 && !p.hasFinal
    );
  } else if (activePreset === 'ready-to-launch-optimise') {
    result = result.filter((p) => {
      const isCandidate =
        p.hasFinal || p.stage === 'second-edit' || p.stage === 'ready-to-publish';
      const isShipped =
        p.stage === 'published' || p.stage === 'archived' || p.stage === 'shelved';
      return isCandidate && !isShipped;
    });
  }

  return result;
}
