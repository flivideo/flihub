/**
 * Centralized path derivation for project directories
 *
 * All paths are derived from a single projectDirectory config value.
 * This replaces the previous pattern of pointing to recordings/ and
 * going up (..) to reach other directories.
 */

import path from 'path';

/**
 * Project folder layout (David's ruling 2026-09-22), owned by @flivideo/core (D14).
 * - `hub`: FliHub's folders live under `<project>/hub/`: `hub/recordings/` + `hub/transcripts/`.
 * - `legacy`: top-level `recordings/` + `recording-transcripts/`. Every project that exists today.
 * Nothing is migrated. Detection is fli-core's `projectLayoutSync` (v0.5.0, option A, David
 * 2026-09-23): `hub/recordings/` → hub; any top-level `recordings/`, `recording-transcripts/` or
 * `transcripts/` → legacy; anything else (new/empty/missing) → hub. FliHub keeps no copy of the rule.
 */
import fs from 'fs';
import {
  HUB_FOLDER,
  LAYOUT_DIRS,
  hasSetsSync,
  listSetsSync,
  projectLayoutSync,
  recordingLocation,
  setPaths,
  transcriptLocation,
  SET_ID,
  type ProjectLayout,
} from '@flivideo/core';

export { HUB_FOLDER, LAYOUT_DIRS };
export type { ProjectLayout };

/**
 * The project folder a recording lives in, from the recording's path. Handles every layout
 * (legacy, hub, hub/sets/<set>) and the `-safe/` / `-chapters/` subfolders. Returns null when the
 * path is not inside a recordings folder, so a caller never guesses (the old
 * `indexOf('recordings')` returned `<project>/hub`). The rule is fli-core's `recordingLocation`.
 */
export function projectDirFromRecordingPath(videoPath: string): string | null {
  return recordingLocation(videoPath)?.projectDir ?? null;
}

/**
 * Recording sets (fli-core v0.38.0). A project with `hub/sets/` keeps its takes per set; FliHub
 * works on one set at a time, the ACTIVE set, remembered per project in `hub/.flihub-active-set.json`.
 * A project without sets has no active set (null) and every path is what it was before sets.
 */
export const ACTIVE_SET_FILE = '.flihub-active-set.json';

export function activeSetFilePath(projectDir: string): string {
  return path.join(projectDir, HUB_FOLDER, ACTIVE_SET_FILE);
}

/**
 * The set FliHub is working in for this project: the remembered one if it is still a set, else the
 * first set in order. Null for a project without sets (or with an empty `hub/sets/`). Never throws.
 */
export function activeSetSync(projectDir: string): string | null {
  if (!hasSetsSync(projectDir)) return null;
  const ids = listSetsSync(projectDir)
    .map((s) => s.id)
    .filter((id): id is string => id !== null);
  if (ids.length === 0) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(activeSetFilePath(projectDir), 'utf-8')) as { set?: unknown };
    if (typeof raw.set === 'string' && ids.includes(raw.set)) return raw.set;
  } catch {
    // missing or unreadable: fall through to the first set
  }
  return ids[0] ?? null;
}

/** Remember the active set. Throws when the project has no such set. */
export function writeActiveSetSync(projectDir: string, setId: string): void {
  const ids = listSetsSync(projectDir).map((s) => s.id);
  if (!SET_ID.test(setId) || !ids.includes(setId)) throw new Error(`no such set: ${setId}`);
  const file = activeSetFilePath(projectDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ set: setId }, null, 2) + '\n', 'utf-8');
}

/**
 * One ProjectPaths per set, in set order. A project without sets → exactly `[getProjectPaths(dir)]`,
 * so a caller that sums over this list gives the same numbers as before sets. For project-level
 * views (project list counts, last-modified) that must see every set, not just the active one.
 */
export function allSetPaths(projectDirectory: string): ProjectPaths[] {
  if (!hasSetsSync(projectDirectory)) return [getProjectPaths(projectDirectory, undefined, null)];
  const ids = listSetsSync(projectDirectory)
    .map((s) => s.id)
    .filter((id): id is string => id !== null);
  return ids.map((id) => getProjectPaths(projectDirectory, 'hub', id));
}

/**
 * Paths for the set a recording is IN (not the active set): a take's transcripts, state and
 * trash steps follow the take, so a job that finishes after a set switch still lands beside it.
 * Null when the path is not inside a recordings folder.
 */
export function pathsForRecording(recordingPath: string): ProjectPaths | null {
  const loc = recordingLocation(recordingPath);
  if (!loc) return null;
  return getProjectPaths(loc.projectDir, undefined, loc.set);
}

/** The same for a transcript file. */
export function pathsForTranscript(transcriptPath: string): ProjectPaths | null {
  const loc = transcriptLocation(transcriptPath);
  if (!loc) return null;
  return getProjectPaths(loc.projectDir, undefined, loc.set);
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
  stateFile: string; // .flihub-state.json (in a set project: hub/sets/<set>/.flihub-state.json)
  chapterOverrides: string; // .chapter-overrides.json (in a set project: hub/sets/<set>/.chapter-overrides.json)
  /** Recording sets: the set these recordings/transcripts/state paths are for; null without sets. */
  set: string | null;
}

/**
 * Get all project-related paths from the project directory
 * @param projectDirectory - The project root directory (expanded, no ~)
 * @param set - Recording sets: which set's recordings/transcripts/state. `undefined` (the
 *   default) = the project's active set; `null` = no set. In a project without sets both mean the
 *   pre-sets paths, unchanged. Every other path (assets, trash, inbox, final…) is project-level.
 */
export function getProjectPaths(
  projectDirectory: string,
  layout: ProjectLayout = projectLayoutSync(projectDirectory),
  set: string | null | undefined = undefined
): ProjectPaths {
  const setId = set === undefined ? activeSetSync(projectDirectory) : set;
  const dirs = LAYOUT_DIRS[layout];
  const inSet = setId === null ? null : setPaths(projectDirectory, setId);
  const recordings = inSet ? inSet.recordings : path.join(projectDirectory, dirs.recordings);
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
    transcripts: inSet ? inSet.transcripts : path.join(projectDirectory, dirs.transcripts),
    final: path.join(projectDirectory, 'final'),
    s3Staging: path.join(projectDirectory, 's3-staging'),
    // FR-59: Inbox folders
    inbox: path.join(projectDirectory, 'inbox'),
    inboxRaw: path.join(projectDirectory, 'inbox', 'raw'),
    inboxDataset: path.join(projectDirectory, 'inbox', 'dataset'),
    inboxPresentation: path.join(projectDirectory, 'inbox', 'presentation'),
    // FR-111: Per-project state file
    stateFile: path.join(inSet ? inSet.dir : projectDirectory, '.flihub-state.json'),
    chapterOverrides: path.join(inSet ? inSet.dir : projectDirectory, '.chapter-overrides.json'),
    set: setId,
  };
}

/**
 * Migrate old targetDirectory (pointing to recordings/) to projectDirectory
 * Strips trailing /recordings from the path
 */
export function migrateTargetToProject(targetDirectory: string): string {
  return targetDirectory.replace(/\/recordings\/?$/, '');
}
