/**
 * FR-111: Per-Project State File Utilities
 *
 * Manages reading/writing of .flihub-state.json files for per-project state.
 * State includes per-recording flags like 'safe' (hidden from active view).
 *
 * Default behavior:
 * - Missing state file returns empty state: { version: 1, recordings: {} }
 * - Corrupt JSON logs warning and returns empty state
 * - Recording not in state treated as { safe: false } (active by default)
 */

import fs from 'fs-extra';
import type { AspectCheck, ProjectShips, ProjectState, RecordingState } from '../../../shared/types.js';
import { getProjectPaths } from '../../../shared/paths.js';
import { expandPath } from './pathUtils.js';

/**
 * Create an empty project state object
 */
export function createEmptyState(): ProjectState {
  return {
    version: 1,
    recordings: {},
  };
}

/**
 * Read project state from disk
 * Returns empty state if file doesn't exist or is corrupt
 */
export async function readProjectState(projectDir: string): Promise<ProjectState> {
  const expandedDir = expandPath(projectDir);
  const paths = getProjectPaths(expandedDir);
  const stateFilePath = paths.stateFile;

  try {
    const exists = await fs.pathExists(stateFilePath);
    if (!exists) {
      return createEmptyState();
    }

    const content = await fs.readFile(stateFilePath, 'utf-8');
    const state = JSON.parse(content) as ProjectState;

    // Validate version
    if (state.version !== 1) {
      console.warn(`[FR-111] Unknown state file version: ${state.version}, treating as empty`);
      return createEmptyState();
    }

    // Ensure recordings object exists
    if (!state.recordings || typeof state.recordings !== 'object') {
      console.warn('[FR-111] State file missing recordings object, treating as empty');
      return createEmptyState();
    }

    return state;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.warn(
        `[FR-111] Corrupt state file at ${stateFilePath}, treating as empty:`,
        error.message
      );
    } else {
      console.error(`[FR-111] Error reading state file:`, error);
    }
    return createEmptyState();
  }
}

/**
 * Write project state to disk
 * Creates parent directories if needed
 */
export async function writeProjectState(projectDir: string, state: ProjectState): Promise<void> {
  const expandedDir = expandPath(projectDir);
  const paths = getProjectPaths(expandedDir);
  const stateFilePath = paths.stateFile;

  // Ensure version is set, preserve all fields
  const stateToWrite: ProjectState = {
    version: 1,
    recordings: state.recordings || {},
    // FR-118: Preserve project dictionary if present
    ...(state.glingDictionary && state.glingDictionary.length > 0
      ? { glingDictionary: state.glingDictionary }
      : {}),
    // FR-126: Preserve edit manifest if present
    ...(state.editManifest ? { editManifest: state.editManifest } : {}),
    // FR-157: Preserve project + chapter titles if present
    ...(state.title ? { title: state.title } : {}),
    ...(state.chapters && Object.keys(state.chapters).length > 0
      ? { chapters: state.chapters }
      : {}),
    // FR-168: render grain, SPARSE — only 'per-chapter' is persisted. 'per-project' is the
    // default and costs zero bytes, so an undeclared project and a project declared as the
    // default stay distinguishable on disk (see resolveShips / shipsDeclared).
    // ⚠️ This object is an ALLOWLIST: a field not listed here is dropped with NO error.
    // That bit FR-157. If you add a field to ProjectState, add it here and add a
    // round-trip test (see test/projectStateShips.test.ts).
    ...(state.ships === 'per-chapter' ? { ships: state.ships } : {}),
  };

  const tmpPath = stateFilePath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(stateToWrite, null, 2), 'utf-8');
  await fs.rename(tmpPath, stateFilePath);
}

/**
 * Check if a recording is marked as safe (hidden from active view)
 */
export function isRecordingSafe(state: ProjectState, filename: string): boolean {
  const recordingState = state.recordings[filename];
  return recordingState?.safe === true;
}

/**
 * Set the safe flag for a recording
 * Returns the updated state (does not persist to disk)
 */
export function setRecordingSafe(
  state: ProjectState,
  filename: string,
  safe: boolean
): ProjectState {
  const newState: ProjectState = {
    ...state,
    recordings: {
      ...state.recordings,
      [filename]: {
        ...state.recordings[filename],
        safe,
      },
    },
  };

  // Remove entry if all flags are default/false and no annotation
  const recordingState = newState.recordings[filename];
  if (
    !recordingState.safe &&
    !recordingState.parked &&
    !recordingState.stage &&
    !recordingState.annotation &&
    !recordingState.aspectWarning // keep an aspect warning (dismissed or not) — it is history
  ) {
    delete newState.recordings[filename];
  }

  return newState;
}

/**
 * Get the state for a specific recording
 * Returns empty state if recording is not in state file
 */
export function getRecordingState(state: ProjectState, filename: string): RecordingState {
  return state.recordings[filename] || {};
}

/**
 * Merge new recording states into existing state
 * Only updates specified recordings, preserves others
 * FR-123: Deep merge each recording to preserve all fields
 */
export function mergeRecordingStates(
  state: ProjectState,
  updates: Record<string, RecordingState>
): ProjectState {
  const mergedRecordings = { ...state.recordings };

  // Deep merge each recording state
  for (const [filename, update] of Object.entries(updates)) {
    mergedRecordings[filename] = {
      ...mergedRecordings[filename], // Preserve existing fields
      ...update, // Apply updates
    };
  }

  return {
    ...state,
    recordings: mergedRecordings,
  };
}

/**
 * Get list of safe recordings from state
 */
export function getSafeRecordings(state: ProjectState): string[] {
  return (Object.entries(state.recordings) as [string, RecordingState][])
    .filter(([_, recordingState]) => recordingState.safe === true)
    .map(([filename]) => filename);
}

/**
 * Get list of active (non-safe) recordings
 * Note: This only filters recordings that ARE in the state file
 * Recordings not in the state file are considered active by default
 */
export function getActiveRecordingsFromState(state: ProjectState): string[] {
  return (Object.entries(state.recordings) as [string, RecordingState][])
    .filter(([_, recordingState]) => recordingState.safe !== true)
    .map(([filename]) => filename);
}

/**
 * FR-120: Check if a recording is marked as parked (excluded from this edit)
 */
export function isRecordingParked(state: ProjectState, filename: string): boolean {
  const recordingState = state.recordings[filename];
  return recordingState?.parked === true;
}

/**
 * FR-120: Set the parked flag for a recording
 * Returns the updated state (does not persist to disk)
 */
export function setRecordingParked(
  state: ProjectState,
  filename: string,
  parked: boolean
): ProjectState {
  const newState: ProjectState = {
    ...state,
    recordings: {
      ...state.recordings,
      [filename]: {
        ...state.recordings[filename],
        parked,
      },
    },
  };

  // Remove entry if all flags are default/false and no annotation
  const recordingState = newState.recordings[filename];
  if (
    !recordingState.safe &&
    !recordingState.parked &&
    !recordingState.stage &&
    !recordingState.annotation &&
    !recordingState.aspectWarning // keep an aspect warning (dismissed or not) — it is history
  ) {
    delete newState.recordings[filename];
  }

  return newState;
}

/**
 * FR-120: Get list of parked recordings from state
 */
export function getParkedRecordings(state: ProjectState): string[] {
  return (Object.entries(state.recordings) as [string, RecordingState][])
    .filter(([_, recordingState]) => recordingState.parked === true)
    .map(([filename]) => filename);
}

/**
 * FR-123: Get annotation for a recording (if any)
 */
export function getRecordingAnnotation(state: ProjectState, filename: string): string | undefined {
  const recordingState = state.recordings[filename];
  return recordingState?.annotation;
}

/**
 * FR-118: Update project dictionary
 * Returns the updated state (does not persist to disk)
 */
export function setProjectDictionary(state: ProjectState, words: string[]): ProjectState {
  return {
    ...state,
    glingDictionary: words.length > 0 ? words : undefined,
  };
}

/**
 * FR-126: Get edit manifest for a specific folder
 * Returns undefined if no manifest exists
 */
export function getEditManifest(
  state: ProjectState,
  folder: 'edit-1st' | 'edit-2nd' | 'edit-final'
): import('../../../shared/types.js').EditFolderManifest | undefined {
  return state.editManifest?.[folder];
}

/**
 * FR-126: Set/update edit manifest for a specific folder
 * Returns the updated state (does not persist to disk)
 */
export function setEditManifest(
  state: ProjectState,
  folder: 'edit-1st' | 'edit-2nd' | 'edit-final',
  manifest: import('../../../shared/types.js').EditFolderManifest
): ProjectState {
  return {
    ...state,
    editManifest: {
      'edit-1st': { lastCopied: null, files: [] },
      'edit-2nd': { lastCopied: null, files: [] },
      'edit-final': { lastCopied: null, files: [] },
      ...state.editManifest,
      [folder]: manifest,
    },
  };
}

// ============================================
// FR-157: Project + chapter titles
// ============================================

/** Normalise a chapter key to 2 digits ("3" -> "03"). Returns null if not a number. */
export function normaliseChapterKey(chapter: string | number): string | null {
  const n = typeof chapter === 'number' ? chapter : parseInt(chapter, 10);
  if (!Number.isInteger(n) || n < 1 || n > 99) return null;
  return String(n).padStart(2, '0');
}

/** Set (or clear with '') the project-level title. Returns a new state. */
export function setProjectTitle(state: ProjectState, title: string): ProjectState {
  const trimmed = title.trim();
  const next: ProjectState = { ...state };
  if (trimmed) next.title = trimmed;
  else delete next.title;
  return next;
}

/** Set (or clear with '') a chapter title. Returns a new state. */
export function setChapterTitle(
  state: ProjectState,
  chapterKey: string,
  title: string
): ProjectState {
  const trimmed = title.trim();
  const chapters = { ...(state.chapters || {}) };
  if (trimmed) {
    chapters[chapterKey] = { ...(chapters[chapterKey] || {}), title: trimmed };
  } else if (chapters[chapterKey]) {
    const { title: _drop, ...rest } = chapters[chapterKey];
    if (Object.keys(rest).length > 0) chapters[chapterKey] = rest;
    else delete chapters[chapterKey];
  }
  const next: ProjectState = { ...state };
  if (Object.keys(chapters).length > 0) next.chapters = chapters;
  else delete next.chapters;
  return next;
}

/** All chapter titles as { "03": "…" } (FR-157). */
export function getChapterTitles(state: ProjectState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, ch] of Object.entries(state.chapters || {})) {
    if (ch.title) out[key] = ch.title;
  }
  return out;
}

/** Get a chapter title, or undefined. */
export function getChapterTitle(state: ProjectState, chapterKey: string): string | undefined {
  return state.chapters?.[chapterKey]?.title;
}

/**
 * FR-168: resolve the render grain for reading. NEVER returns absent — every project ships
 * some way; none of them ships "unknown". A project with no state file at all (the common
 * case — most projects have never been written to) resolves to the default without creating
 * one, and reading must never create a file.
 *
 * `declared` is the honest half: false means nobody ever said, and a consumer that cares
 * should ask rather than trust the default.
 *
 * A hand-edited or corrupt value falls back to the default rather than propagating — disk is
 * not trusted.
 */
export function resolveShips(state: ProjectState): { ships: ProjectShips; declared: boolean } {
  const declared = state.ships === 'per-chapter' || state.ships === 'per-project';
  return { ships: declared ? (state.ships as ProjectShips) : 'per-project', declared };
}

/**
 * FR-168: set the render grain. Returns updated state (does not persist).
 * Setting the default CLEARS the key rather than storing it, keeping the sparse invariant:
 * what is on disk is only ever the override.
 */
export function setProjectShips(state: ProjectState, ships: ProjectShips): ProjectState {
  const next: ProjectState = { ...state };
  if (ships === 'per-chapter') next.ships = 'per-chapter';
  else delete next.ships;
  return next;
}

// ============================================
// Aspect warning (David, 2026-09-23): a take that did not match the project's declared aspect
// keeps its warning on the recording until David dismisses it. Dismissing keeps the record
// (dismissedAt) so the history of what was wrong is not lost.
// ============================================

export function setAspectWarning(state: ProjectState, filename: string, check: AspectCheck): ProjectState {
  return {
    ...state,
    recordings: {
      ...state.recordings,
      [filename]: { ...state.recordings[filename], aspectWarning: { ...check } },
    },
  };
}

export function dismissAspectWarning(state: ProjectState, filename: string, now: Date = new Date()): ProjectState {
  const entry = state.recordings[filename];
  if (!entry?.aspectWarning || entry.aspectWarning.dismissedAt) return state;
  return {
    ...state,
    recordings: {
      ...state.recordings,
      [filename]: { ...entry, aspectWarning: { ...entry.aspectWarning, dismissedAt: now.toISOString() } },
    },
  };
}

/** The warning to show on the row: present and not yet dismissed. */
export function getActiveAspectWarning(state: ProjectState, filename: string): AspectCheck | undefined {
  const warning = state.recordings[filename]?.aspectWarning;
  if (!warning || warning.dismissedAt) return undefined;
  const active: AspectCheck & { dismissedAt?: string } = { ...warning };
  delete active.dismissedAt;
  return active;
}
