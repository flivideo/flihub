/**
 * FR-122: Export API Routes
 *
 * Copy recordings to edit-1st folder for Gling AI processing
 */

import express from 'express'
import path from 'path'
import fs from 'fs/promises'
import type { Config } from '../../../shared/types.js'
import { expandPath } from '../utils/pathUtils.js'
import { getProjectPaths } from '../../../shared/paths.js'

export function createExportRoutes(getConfig: () => Config) {
  const router = express.Router()

  /**
   * POST /api/export/copy-to-gling
   * Copy selected recordings to edit-1st folder
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
        } catch (err) {
          errors.push(`Failed to copy ${filename}: ${String(err)}`)
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

  return router
}
