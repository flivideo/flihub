/**
 * FR-111 Phase 3: Safe Folder Migration
 *
 * Migrates from physical `-safe/` folder architecture to state-based flags.
 * Files are moved back to `recordings/`, state file tracks which are "safe".
 *
 * Migration runs automatically on server startup if `-safe/` folder exists.
 */

import fs from 'fs-extra'
import path from 'path'
import { getProjectPaths } from '../../../shared/paths.js'
import { expandPath } from './pathUtils.js'
import { readProjectState, writeProjectState, setRecordingSafe } from './projectState.js'
import type { ProjectState } from '../../../shared/types.js'

export interface MigrationResult {
  migrated: number
  shadowsMigrated: number
  errors: string[]
  skipped: string[]
}

/**
 * Check if a project needs migration (has -safe folder with files)
 */
export async function needsMigration(projectDir: string): Promise<boolean> {
  const expandedDir = expandPath(projectDir)
  const paths = getProjectPaths(expandedDir)

  // Check if recordings/-safe/ exists and has files
  if (!await fs.pathExists(paths.safe)) {
    return false
  }

  const entries = await fs.readdir(paths.safe)
  const movFiles = entries.filter(f => f.endsWith('.mov'))
  return movFiles.length > 0
}

/**
 * Migrate -safe folder to state-based architecture
 *
 * What it does:
 * 1. Check if recordings/-safe/ exists
 * 2. If exists, read all .mov files
 * 3. Move each file back to recordings/
 * 4. Update state file to mark each as safe: true
 * 5. Move shadow files from recording-shadows/-safe/ to recording-shadows/
 * 6. Delete empty -safe folders
 */
export async function migrateSafeFolder(projectDir: string): Promise<MigrationResult> {
  const expandedDir = expandPath(projectDir)
  const paths = getProjectPaths(expandedDir)
  const shadowDir = path.join(expandedDir, 'recording-shadows')
  const shadowSafeDir = path.join(shadowDir, '-safe')

  const result: MigrationResult = {
    migrated: 0,
    shadowsMigrated: 0,
    errors: [],
    skipped: [],
  }

  // Check if safe folder exists
  if (!await fs.pathExists(paths.safe)) {
    console.log('[FR-111] No -safe folder found, skipping migration')
    return result
  }

  // Read current state (or create empty)
  let state = await readProjectState(projectDir)

  // Get list of .mov files in -safe folder
  const safeEntries = await fs.readdir(paths.safe)
  const movFiles = safeEntries.filter(f => f.endsWith('.mov'))

  if (movFiles.length === 0) {
    console.log('[FR-111] -safe folder is empty, cleaning up')
    await cleanupEmptyFolders(paths.safe, shadowSafeDir)
    return result
  }

  console.log(`[FR-111] Migrating ${movFiles.length} files from -safe folder...`)

  // Keep backup of state for potential rollback
  const stateBackup = JSON.parse(JSON.stringify(state))
  const movedFiles: { src: string; dest: string }[] = []

  try {
    // Move each file back to recordings/
    for (const filename of movFiles) {
      const srcPath = path.join(paths.safe, filename)
      const destPath = path.join(paths.recordings, filename)

      // Check if file already exists in recordings/
      if (await fs.pathExists(destPath)) {
        result.skipped.push(filename)
        result.errors.push(`${filename}: already exists in recordings/, skipped`)
        // Still mark as safe in state since both copies exist
        state = setRecordingSafe(state, filename, true)
        continue
      }

      try {
        // Move file
        await fs.move(srcPath, destPath)
        movedFiles.push({ src: srcPath, dest: destPath })

        // Mark as safe in state
        state = setRecordingSafe(state, filename, true)
        result.migrated++

        console.log(`[FR-111] Migrated: ${filename}`)
      } catch (err) {
        result.errors.push(`${filename}: ${err instanceof Error ? err.message : 'move failed'}`)
      }
    }

    // Move shadow files if they exist
    if (await fs.pathExists(shadowSafeDir)) {
      const shadowEntries = await fs.readdir(shadowSafeDir)
      const shadowFiles = shadowEntries.filter(f => f.endsWith('.mp4'))

      for (const filename of shadowFiles) {
        const srcPath = path.join(shadowSafeDir, filename)
        const destPath = path.join(shadowDir, filename)

        // Check if shadow already exists
        if (await fs.pathExists(destPath)) {
          result.errors.push(`Shadow ${filename}: already exists, skipped`)
          continue
        }

        try {
          await fs.move(srcPath, destPath)
          result.shadowsMigrated++
          console.log(`[FR-111] Migrated shadow: ${filename}`)
        } catch (err) {
          result.errors.push(`Shadow ${filename}: ${err instanceof Error ? err.message : 'move failed'}`)
        }
      }
    }

    // Write updated state file
    await writeProjectState(projectDir, state)
    console.log('[FR-111] State file updated with safe flags')

    // Clean up empty folders
    await cleanupEmptyFolders(paths.safe, shadowSafeDir)

  } catch (err) {
    // Rollback on critical failure
    console.error('[FR-111] Migration failed, attempting rollback:', err)

    // Move files back
    for (const { src, dest } of movedFiles) {
      try {
        await fs.move(dest, src)
      } catch (rollbackErr) {
        console.error(`[FR-111] Rollback failed for ${dest}:`, rollbackErr)
      }
    }

    // Restore state backup
    try {
      await writeProjectState(projectDir, stateBackup)
    } catch (stateErr) {
      console.error('[FR-111] State rollback failed:', stateErr)
    }

    result.errors.push(`Migration failed: ${err instanceof Error ? err.message : 'unknown error'}`)
  }

  return result
}

/**
 * Clean up empty -safe folders
 */
async function cleanupEmptyFolders(safePath: string, shadowSafePath: string): Promise<void> {
  // Remove recordings/-safe/ if empty
  if (await fs.pathExists(safePath)) {
    const entries = await fs.readdir(safePath)
    if (entries.length === 0) {
      await fs.rmdir(safePath)
      console.log('[FR-111] Removed empty recordings/-safe/ folder')
    }
  }

  // Remove recording-shadows/-safe/ if empty
  if (await fs.pathExists(shadowSafePath)) {
    const entries = await fs.readdir(shadowSafePath)
    if (entries.length === 0) {
      await fs.rmdir(shadowSafePath)
      console.log('[FR-111] Removed empty recording-shadows/-safe/ folder')
    }
  }
}

/**
 * Get migration status for a project (for debugging/UI)
 */
export async function getMigrationStatus(projectDir: string): Promise<{
  needsMigration: boolean
  safeFileCount: number
  stateFileExists: boolean
  stateRecordingCount: number
}> {
  const expandedDir = expandPath(projectDir)
  const paths = getProjectPaths(expandedDir)

  let safeFileCount = 0
  if (await fs.pathExists(paths.safe)) {
    const entries = await fs.readdir(paths.safe)
    safeFileCount = entries.filter(f => f.endsWith('.mov')).length
  }

  const state = await readProjectState(projectDir)
  const stateFileExists = await fs.pathExists(paths.stateFile)

  return {
    needsMigration: safeFileCount > 0,
    safeFileCount,
    stateFileExists,
    stateRecordingCount: Object.keys(state.recordings).length,
  }
}
