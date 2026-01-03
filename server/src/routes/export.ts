/**
 * FR-122: Export API Routes
 * FR-126: Edit Folder Manifest & Cleanup
 *
 * Copy recordings to edit folders for Gling AI processing
 * Track copied files with manifest for safe cleanup/restore
 */

import express from 'express'
import path from 'path'
import fs from 'fs/promises'
import type { Config, EditFolderKey } from '../../../shared/types.js'
import { expandPath } from '../utils/pathUtils.js'
import { getProjectPaths } from '../../../shared/paths.js'
import { createManifest, getManifestStatus, cleanEditFolder, restoreEditFolder } from '../utils/editManifest.js'
import { readProjectState, writeProjectState, getEditManifest, setEditManifest } from '../utils/projectState.js'

export function createExportRoutes(getConfig: () => Config) {
  const router = express.Router()

  /**
   * POST /api/export/copy-to-gling
   * Copy selected recordings to edit-1st folder
   * FR-126: Creates manifest for tracking copied files
   *
   * Request body:
   * {
   *   files: string[]  // Array of filenames to copy
   * }
   *
   * Response:
   * {
   *   success: boolean
   *   copied: string[]   // Successfully copied files
   *   errors?: string[]  // Errors if any
   * }
   */
  router.post('/copy-to-gling', async (req, res) => {
    try {
      const config = getConfig()

      if (!config.projectDirectory) {
        return res.json({ success: false, error: 'No project selected' })
      }

      const { files } = req.body as { files: string[] }

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.json({ success: false, error: 'No files specified' })
      }

      const projectPath = expandPath(config.projectDirectory)
      const paths = getProjectPaths(projectPath)
      const editFirstPath = path.join(projectPath, 'edit-1st')

      // Create edit-1st folder if it doesn't exist
      await fs.mkdir(editFirstPath, { recursive: true })

      const copied: string[] = []
      const errors: string[] = []
      const copiedPaths: string[] = []

      // Copy each file
      for (const filename of files) {
        try {
          const sourcePath = path.join(paths.recordings, filename)
          const destPath = path.join(editFirstPath, filename)

          // Check if source exists
          const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false)
          if (!sourceExists) {
            errors.push(`File not found: ${filename}`)
            continue
          }

          // Copy file
          await fs.copyFile(sourcePath, destPath)
          copied.push(filename)
          copiedPaths.push(sourcePath)
        } catch (err) {
          errors.push(`Failed to copy ${filename}: ${String(err)}`)
        }
      }

      // FR-126: Create manifest for successfully copied files
      if (copied.length > 0) {
        try {
          const manifest = await createManifest(copiedPaths, paths.recordings)
          const state = await readProjectState(projectPath)
          const updatedState = setEditManifest(state, 'edit-1st', manifest)
          await writeProjectState(projectPath, updatedState)
        } catch (err) {
          console.error('[FR-126] Failed to create manifest:', err)
          // Don't fail the whole operation if manifest creation fails
        }
      }

      if (errors.length > 0) {
        return res.json({
          success: copied.length > 0,
          copied,
          errors,
          error: `Copied ${copied.length} of ${files.length} files. ${errors.length} errors occurred.`
        })
      }

      res.json({
        success: true,
        copied,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error),
      })
    }
  })

  /**
   * GET /api/export/manifest-status/:folder
   * FR-126: Check manifest status for an edit folder
   *
   * Response: ManifestStatusResponse
   */
  router.get('/manifest-status/:folder', async (req, res) => {
    try {
      const config = getConfig()

      if (!config.projectDirectory) {
        return res.json({ success: false, error: 'No project selected' })
      }

      const folder = req.params.folder as EditFolderKey

      // Validate folder
      if (!['edit-1st', 'edit-2nd', 'edit-final'].includes(folder)) {
        return res.json({ success: false, error: 'Invalid folder name' })
      }

      const projectPath = expandPath(config.projectDirectory)
      const paths = getProjectPaths(projectPath)
      const editFolderPath = path.join(projectPath, folder)

      // Read manifest from state
      const state = await readProjectState(projectPath)
      const manifest = getEditManifest(state, folder)

      // Get status
      const detail = await getManifestStatus(manifest, editFolderPath, paths.recordings)

      res.json({
        success: true,
        folder,
        detail,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        folder: req.params.folder as EditFolderKey,
        error: String(error),
      })
    }
  })

  /**
   * POST /api/export/clean-edit-folder
   * FR-126: Delete source files from edit folder (preserves Gling outputs)
   *
   * Request body:
   * {
   *   folder: EditFolderKey  // 'edit-1st' | 'edit-2nd' | 'edit-final'
   * }
   *
   * Response: CleanEditFolderResponse
   */
  router.post('/clean-edit-folder', async (req, res) => {
    try {
      const config = getConfig()

      if (!config.projectDirectory) {
        return res.json({ success: false, error: 'No project selected' })
      }

      const { folder } = req.body as { folder: EditFolderKey }

      // Validate folder
      if (!['edit-1st', 'edit-2nd', 'edit-final'].includes(folder)) {
        return res.json({ success: false, error: 'Invalid folder name' })
      }

      const projectPath = expandPath(config.projectDirectory)
      const editFolderPath = path.join(projectPath, folder)

      // Read manifest from state
      const state = await readProjectState(projectPath)
      const manifest = getEditManifest(state, folder)

      if (!manifest || manifest.files.length === 0) {
        return res.json({
          success: false,
          folder,
          error: 'No manifest found for this folder',
        })
      }

      // Clean folder
      const { deleted, spaceSaved, preserved } = await cleanEditFolder(manifest, editFolderPath)

      res.json({
        success: true,
        folder,
        deleted,
        deletedCount: deleted.length,
        spaceSaved,
        preserved,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        folder: req.body.folder as EditFolderKey,
        error: String(error),
      })
    }
  })

  /**
   * POST /api/export/restore-edit-folder
   * FR-126: Restore source files from recordings to edit folder
   *
   * Request body:
   * {
   *   folder: EditFolderKey  // 'edit-1st' | 'edit-2nd' | 'edit-final'
   * }
   *
   * Response: RestoreEditFolderResponse
   */
  router.post('/restore-edit-folder', async (req, res) => {
    try {
      const config = getConfig()

      if (!config.projectDirectory) {
        return res.json({ success: false, error: 'No project selected' })
      }

      const { folder } = req.body as { folder: EditFolderKey }

      // Validate folder
      if (!['edit-1st', 'edit-2nd', 'edit-final'].includes(folder)) {
        return res.json({ success: false, error: 'Invalid folder name' })
      }

      const projectPath = expandPath(config.projectDirectory)
      const paths = getProjectPaths(projectPath)
      const editFolderPath = path.join(projectPath, folder)

      // Read manifest from state
      const state = await readProjectState(projectPath)
      const manifest = getEditManifest(state, folder)

      if (!manifest || manifest.files.length === 0) {
        return res.json({
          success: false,
          folder,
          error: 'No manifest found for this folder',
        })
      }

      // Restore files
      const { restored, warnings } = await restoreEditFolder(
        manifest,
        editFolderPath,
        paths.recordings
      )

      res.json({
        success: true,
        folder,
        restored,
        restoredCount: restored.length,
        warnings: warnings.length > 0 ? warnings : undefined,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        folder: req.body.folder as EditFolderKey,
        error: String(error),
      })
    }
  })

  return router
}
