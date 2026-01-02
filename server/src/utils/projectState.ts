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

import fs from 'fs-extra'
import path from 'path'
import type { ProjectState, RecordingState } from '../../../shared/types.js'
import { getProjectPaths } from '../../../shared/paths.js'
import { expandPath } from './pathUtils.js'

const STATE_FILE_NAME = '.flihub-state.json'

/**
 * Create an empty project state object
 */
export function createEmptyState(): ProjectState {
  return {
    version: 1,
    recordings: {},
  }
}

/**
 * Read project state from disk
 * Returns empty state if file doesn't exist or is corrupt
 */
export async function readProjectState(projectDir: string): Promise<ProjectState> {
  const expandedDir = expandPath(projectDir)
  const paths = getProjectPaths(expandedDir)
  const stateFilePath = paths.stateFile

  try {
    const exists = await fs.pathExists(stateFilePath)
    if (!exists) {
      return createEmptyState()
    }

    const content = await fs.readFile(stateFilePath, 'utf-8')
    const state = JSON.parse(content) as ProjectState

    // Validate version
    if (state.version !== 1) {
      console.warn(`[FR-111] Unknown state file version: ${state.version}, treating as empty`)
      return createEmptyState()
    }

    // Ensure recordings object exists
    if (!state.recordings || typeof state.recordings !== 'object') {
      console.warn('[FR-111] State file missing recordings object, treating as empty')
      return createEmptyState()
    }

    return state
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.warn(`[FR-111] Corrupt state file at ${stateFilePath}, treating as empty:`, error.message)
    } else {
      console.error(`[FR-111] Error reading state file:`, error)
    }
    return createEmptyState()
  }
}

/**
 * Write project state to disk
 * Creates parent directories if needed
 */
export async function writeProjectState(projectDir: string, state: ProjectState): Promise<void> {
  const expandedDir = expandPath(projectDir)
  const paths = getProjectPaths(expandedDir)
  const stateFilePath = paths.stateFile

  // Ensure version is set, preserve all fields
  const stateToWrite: ProjectState = {
    version: 1,
    recordings: state.recordings || {},
    // FR-118: Preserve project dictionary if present
    ...(state.glingDictionary && state.glingDictionary.length > 0
      ? { glingDictionary: state.glingDictionary }
      : {}),
  }

  await fs.writeFile(stateFilePath, JSON.stringify(stateToWrite, null, 2), 'utf-8')
}

/**
 * Check if a recording is marked as safe (hidden from active view)
 */
export function isRecordingSafe(state: ProjectState, filename: string): boolean {
  const recordingState = state.recordings[filename]
  return recordingState?.safe === true
}

/**
 * Set the safe flag for a recording
 * Returns the updated state (does not persist to disk)
 */
export function setRecordingSafe(state: ProjectState, filename: string, safe: boolean): ProjectState {
  const newState: ProjectState = {
    ...state,
    recordings: {
      ...state.recordings,
      [filename]: {
        ...state.recordings[filename],
        safe,
      },
    },
  }

  // Remove entry if all flags are default/false
  const recordingState = newState.recordings[filename]
  if (!recordingState.safe && !recordingState.parked && !recordingState.stage) {
    delete newState.recordings[filename]
  }

  return newState
}

/**
 * Get the state for a specific recording
 * Returns empty state if recording is not in state file
 */
export function getRecordingState(state: ProjectState, filename: string): RecordingState {
  return state.recordings[filename] || {}
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
  const mergedRecordings = { ...state.recordings }

  // Deep merge each recording state
  for (const [filename, update] of Object.entries(updates)) {
    mergedRecordings[filename] = {
      ...mergedRecordings[filename],  // Preserve existing fields
      ...update,                       // Apply updates
    }
  }

  return {
    ...state,
    recordings: mergedRecordings,
  }
}

/**
 * Get list of safe recordings from state
 */
export function getSafeRecordings(state: ProjectState): string[] {
  return (Object.entries(state.recordings) as [string, RecordingState][])
    .filter(([_, recordingState]) => recordingState.safe === true)
    .map(([filename]) => filename)
}

/**
 * Get list of active (non-safe) recordings
 * Note: This only filters recordings that ARE in the state file
 * Recordings not in the state file are considered active by default
 */
export function getActiveRecordingsFromState(state: ProjectState): string[] {
  return (Object.entries(state.recordings) as [string, RecordingState][])
    .filter(([_, recordingState]) => recordingState.safe !== true)
    .map(([filename]) => filename)
}

/**
 * FR-120: Check if a recording is marked as parked (excluded from this edit)
 */
export function isRecordingParked(state: ProjectState, filename: string): boolean {
  const recordingState = state.recordings[filename]
  return recordingState?.parked === true
}

/**
 * FR-120: Set the parked flag for a recording
 * Returns the updated state (does not persist to disk)
 */
export function setRecordingParked(state: ProjectState, filename: string, parked: boolean): ProjectState {
  const newState: ProjectState = {
    ...state,
    recordings: {
      ...state.recordings,
      [filename]: {
        ...state.recordings[filename],
        parked,
      },
    },
  }

  // Remove entry if all flags are default/false
  const recordingState = newState.recordings[filename]
  if (!recordingState.safe && !recordingState.parked && !recordingState.stage) {
    delete newState.recordings[filename]
  }

  return newState
}

/**
 * FR-120: Get list of parked recordings from state
 */
export function getParkedRecordings(state: ProjectState): string[] {
  return (Object.entries(state.recordings) as [string, RecordingState][])
    .filter(([_, recordingState]) => recordingState.parked === true)
    .map(([filename]) => filename)
}

/**
 * FR-123: Get annotation for a recording (if any)
 */
export function getRecordingAnnotation(state: ProjectState, filename: string): string | undefined {
  const recordingState = state.recordings[filename]
  return recordingState?.annotation
}

/**
 * FR-118: Update project dictionary
 * Returns the updated state (does not persist to disk)
 */
export function setProjectDictionary(state: ProjectState, words: string[]): ProjectState {
  return {
    ...state,
    glingDictionary: words.length > 0 ? words : undefined,
  }
}
