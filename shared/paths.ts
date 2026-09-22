/**
 * Centralized path derivation for project directories
 *
 * All paths are derived from a single projectDirectory config value.
 * This replaces the previous pattern of pointing to recordings/ and
 * going up (..) to reach other directories.
 */

import fs from 'fs';
import path from 'path';

/**
 * Project folder layout (David's ruling 2026-09-22).
 * - `hub`: FliHub's folders live under `<project>/hub/`: `hub/recordings/` + `hub/transcripts/`.
 * - `legacy`: top-level `recordings/` + `recording-transcripts/`. Every project that exists today.
 * Nothing is migrated. Only FliHub and FliStudio know this layout. Swap to the @flivideo/core
 * helper (v0.2.0) when it lands. Detection, in order:
 *   1. no `hub/` directory                       → legacy
 *   2. `hub/recordings/` exists                  → hub (wins even if `recordings/` also exists)
 *   3. top-level `recordings/` exists            → legacy — a STRAY `hub/` never hides real
 *      recordings (that would read as an empty project, silently)
 *   4. otherwise (empty `hub/`, or held hub project whose recordings are on T7) → hub
 */
export type ProjectLayout = 'hub' | 'legacy';

export const HUB_DIR = 'hub';

/** Folder names relative to the project root, per layout. */
export const LAYOUT_DIRS: Record<ProjectLayout, { recordings: string; transcripts: string }> = {
  hub: { recordings: 'hub/recordings', transcripts: 'hub/transcripts' },
  legacy: { recordings: 'recordings', transcripts: 'recording-transcripts' },
};

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function detectProjectLayout(projectDirectory: string): ProjectLayout {
  if (!isDirectory(path.join(projectDirectory, HUB_DIR))) return 'legacy';
  if (isDirectory(path.join(projectDirectory, LAYOUT_DIRS.hub.recordings))) return 'hub';
  if (isDirectory(path.join(projectDirectory, LAYOUT_DIRS.legacy.recordings))) return 'legacy';
  return 'hub';
}

/**
 * The project folder a recording lives in, from the recording's path. Handles both layouts and
 * the `-safe/` / `-chapters/` subfolders. Returns null when the path is not inside a recordings
 * folder, so a caller never guesses (the old `indexOf('recordings')` returned `<project>/hub`).
 */
export function projectDirFromRecordingPath(videoPath: string): string | null {
  let dir = path.dirname(videoPath);
  if (path.basename(dir).startsWith('-')) dir = path.dirname(dir); // -safe, -chapters
  if (path.basename(dir) !== 'recordings') return null;
  const parent = path.dirname(dir);
  const projectDir = path.basename(parent) === HUB_DIR ? path.dirname(parent) : parent;
  return projectDir;
}

export interface ProjectPaths {
  project: string; // Project root (e.g., ~/dev/video-projects/v-appydave/b64-project)
  layout: ProjectLayout;
  recordings: string; // recordings/ or hub/recordings/
  broll: string; // FR-161 // recordings/
  safe: string; // recordings/-safe/
  chapters: string; // recordings/-chapters/ (FR-58) - combined chapter preview videos
  trash: string; // -trash/
  assets: string; // assets/
  images: string; // assets/images/
  thumbs: string; // assets/thumbs/
  transcripts: string; // recording-transcripts/ or hub/transcripts/ (FR-30) - raw transcripts, not final edited transcript
  final: string; // final/ (FR-33) - final video and SRT after all editing
  s3Staging: string; // s3-staging/ (FR-33) - DAM exchange point with editor
  // FR-59: Inbox folders for unlabeled incoming content
  inbox: string; // inbox/
  inboxRaw: string; // inbox/raw/
  inboxDataset: string; // inbox/dataset/
  inboxPresentation: string; // inbox/presentation/
  // FR-111: Per-project state file
  stateFile: string; // .flihub-state.json
}

/**
 * Get all project-related paths from the project directory
 * @param projectDirectory - The project root directory (expanded, no ~)
 */
export function getProjectPaths(
  projectDirectory: string,
  layout: ProjectLayout = detectProjectLayout(projectDirectory)
): ProjectPaths {
  const dirs = LAYOUT_DIRS[layout];
  const recordings = path.join(projectDirectory, dirs.recordings);
  return {
    project: projectDirectory,
    layout,
    recordings,
    broll: path.join(projectDirectory, 'b-roll'), // FR-161: chapter-less source media
    safe: path.join(recordings, '-safe'),
    chapters: path.join(recordings, '-chapters'), // FR-58
    trash: path.join(projectDirectory, '-trash'),
    assets: path.join(projectDirectory, 'assets'),
    images: path.join(projectDirectory, 'assets', 'images'),
    thumbs: path.join(projectDirectory, 'assets', 'thumbs'),
    transcripts: path.join(projectDirectory, dirs.transcripts),
    final: path.join(projectDirectory, 'final'),
    s3Staging: path.join(projectDirectory, 's3-staging'),
    // FR-59: Inbox folders
    inbox: path.join(projectDirectory, 'inbox'),
    inboxRaw: path.join(projectDirectory, 'inbox', 'raw'),
    inboxDataset: path.join(projectDirectory, 'inbox', 'dataset'),
    inboxPresentation: path.join(projectDirectory, 'inbox', 'presentation'),
    // FR-111: Per-project state file
    stateFile: path.join(projectDirectory, '.flihub-state.json'),
  };
}

/**
 * Migrate old targetDirectory (pointing to recordings/) to projectDirectory
 * Strips trailing /recordings from the path
 */
export function migrateTargetToProject(targetDirectory: string): string {
  return targetDirectory.replace(/\/recordings\/?$/, '');
}
