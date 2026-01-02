/**
 * Project Code Resolver
 *
 * Resolves short project codes to full project codes.
 * Example: "c10" -> "c10-poem-epic-3"
 */

import path from 'path';
import fs from 'fs-extra';
import { expandPath } from './pathUtils.js';

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

/**
 * Get all valid project folders
 */
async function getProjectFolders(): Promise<string[]> {
  const projectsDir = expandPath(PROJECTS_ROOT);

  if (!await fs.pathExists(projectsDir)) {
    return [];
  }

  const entries = await fs.readdir(projectsDir, { withFileTypes: true });
  return entries
    .filter(e =>
      e.isDirectory() &&
      !e.name.startsWith('.') &&
      !e.name.startsWith('-') &&
      e.name !== 'archived'
    )
    .map(e => e.name);
}

/**
 * Resolve a project code (short or full) to the full project code and path
 *
 * @param codeInput - Short code (e.g., "c10") or full code (e.g., "c10-poem-epic-3")
 * @returns Object with full code and path, or null if not found
 *
 * @example
 * // Short code resolution
 * await resolveProjectCode("c10")
 * // -> { code: "c10-poem-epic-3", path: "/path/to/c10-poem-epic-3" }
 *
 * // Full code passthrough
 * await resolveProjectCode("c10-poem-epic-3")
 * // -> { code: "c10-poem-epic-3", path: "/path/to/c10-poem-epic-3" }
 */
export async function resolveProjectCode(codeInput: string): Promise<{ code: string; path: string } | null> {
  const projectsDir = expandPath(PROJECTS_ROOT);
  const folders = await getProjectFolders();

  // First check if it's already a full code (exact match)
  if (folders.includes(codeInput)) {
    return {
      code: codeInput,
      path: path.join(projectsDir, codeInput)
    };
  }

  // Try prefix match (short code resolution)
  const matches = folders.filter(code => code.startsWith(codeInput)).sort();

  if (matches.length === 0) {
    return null;
  }

  // Return first match (alphabetically)
  const code = matches[0];
  return {
    code,
    path: path.join(projectsDir, code)
  };
}

/**
 * Resolve project code or throw 404 error
 * Convenience function for Express route handlers
 */
export async function resolveProjectCodeOrFail(codeInput: string): Promise<{ code: string; path: string }> {
  const result = await resolveProjectCode(codeInput);

  if (!result) {
    throw new Error(`Project not found: ${codeInput}`);
  }

  return result;
}
