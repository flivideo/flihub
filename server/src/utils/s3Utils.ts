// Utility functions extracted from s3-staging route for testability
// FR-103: S3 Staging Page API
// FR-104: S3 Staging Migration Tool
// FR-105: S3 DAM Integration
import path from 'path';

// FR-104: Migration types
export interface MigrationActions {
  delete: string[];
  toPrep: Array<{ from: string; to: string }>;
  toPost: Array<{ from: string; to: string }>;
  conflicts: Array<{ file: string; reason: string }>;
}

// FR-105: Extract brand from project path
// e.g., /video-projects/v-appydave/b85-clauding-01/ -> appydave
export function extractBrand(projectPath: string): string {
  const parts = projectPath.split(path.sep);
  // Find the v-* directory
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].startsWith('v-')) {
      return parts[i].slice(2);
    }
  }
  return 'appydave'; // default fallback
}

// FR-104: Categorize files for migration
export function categorizeMigrationFiles(files: string[], projectName: string): MigrationActions {
  const actions: MigrationActions = {
    delete: [],
    toPrep: [],
    toPost: [],
    conflicts: [],
  };

  // Track versions we've seen to detect conflicts
  const seenVersions = new Set<string>();

  for (const file of files) {
    // Junk files - delete
    if (file === '.DS_Store' || file.endsWith('.Zone.Identifier')) {
      actions.delete.push(file);
      continue;
    }

    // Final files go to post/ with version rename
    // Pattern: *-final*.mp4 or *-final*.srt
    const finalMatch = file.match(/^(.+)-final(-v(\d+))?\.(mp4|srt|mov)$/i);
    if (finalMatch) {
      const baseName = projectName || finalMatch[1];
      const version = finalMatch[3] || '1'; // Default to v1 if no version
      const ext = finalMatch[4];
      const targetName = `${baseName}-v${version}.${ext}`;

      // Check for conflicts
      if (seenVersions.has(targetName)) {
        actions.conflicts.push({ file, reason: `Would overwrite existing v${version}` });
      } else {
        seenVersions.add(targetName);
        actions.toPost.push({ from: file, to: `post/${targetName}` });
      }
      continue;
    }

    // Everything else goes to prep/
    if (/\.(mp4|srt|mov)$/i.test(file)) {
      actions.toPrep.push({ from: file, to: `prep/${file}` });
    }
  }

  return actions;
}

/**
 * Returns true when `filePath` is inside `projectRoot` (non-traversal check).
 * Exported for unit-testing.
 */
export function isPathWithinProject(filePath: string, projectRoot: string): boolean {
  const resolved = path.resolve(filePath);
  const root = projectRoot.endsWith(path.sep) ? projectRoot : projectRoot + path.sep;
  return resolved === projectRoot || resolved.startsWith(root);
}
