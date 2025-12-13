/**
 * Centralized path derivation for project directories
 *
 * All paths are derived from a single projectDirectory config value.
 * This replaces the previous pattern of pointing to recordings/ and
 * going up (..) to reach other directories.
 */

import path from 'path'

export interface ProjectPaths {
  project: string       // Project root (e.g., ~/dev/video-projects/v-appydave/b64-project)
  recordings: string    // recordings/
  safe: string          // recordings/-safe/
  trash: string         // -trash/
  assets: string        // assets/
  images: string        // assets/images/
  thumbs: string        // assets/thumbs/
  transcripts: string   // recording-transcripts/ (FR-30) - raw transcripts, not final edited transcript
  final: string         // final/ (FR-33) - final video and SRT after all editing
  s3Staging: string     // s3-staging/ (FR-33) - DAM exchange point with editor
}

/**
 * Get all project-related paths from the project directory
 * @param projectDirectory - The project root directory (expanded, no ~)
 */
export function getProjectPaths(projectDirectory: string): ProjectPaths {
  return {
    project: projectDirectory,
    recordings: path.join(projectDirectory, 'recordings'),
    safe: path.join(projectDirectory, 'recordings', '-safe'),
    trash: path.join(projectDirectory, '-trash'),
    assets: path.join(projectDirectory, 'assets'),
    images: path.join(projectDirectory, 'assets', 'images'),
    thumbs: path.join(projectDirectory, 'assets', 'thumbs'),
    transcripts: path.join(projectDirectory, 'recording-transcripts'),
    final: path.join(projectDirectory, 'final'),
    s3Staging: path.join(projectDirectory, 's3-staging'),
  }
}

/**
 * Migrate old targetDirectory (pointing to recordings/) to projectDirectory
 * Strips trailing /recordings from the path
 */
export function migrateTargetToProject(targetDirectory: string): string {
  return targetDirectory.replace(/\/recordings\/?$/, '')
}
