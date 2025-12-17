// FR-102: First Edit Prep Page API
import express from 'express'
import path from 'path'
import fs from 'fs/promises'
import type { Config } from '../../../shared/types.js'

export function createFirstEditRoutes(getConfig: () => Config) {
  const router = express.Router()

  // GET /api/first-edit/prep - Get first edit prep data
  router.get('/prep', async (req, res) => {
    try {
      const config = getConfig()

      if (!config.projectDirectory) {
        return res.json({ success: false, error: 'No project selected' })
      }

      // Extract project code from path
      const projectCode = path.basename(config.projectDirectory)
      const parts = projectCode.split('-')
      const code = parts[0]
      const name = parts.slice(1).join('-')

      // Get recordings
      const recordingsPath = path.join(config.projectDirectory, 'recordings')
      let recordings: { name: string; size: number }[] = []
      let recordingsTotal = 0

      try {
        const files = await fs.readdir(recordingsPath)
        const stats = await Promise.all(
          files
            .filter(f => /\.(mov|mp4)$/i.test(f) && !f.startsWith('.') && !f.startsWith('-'))
            .map(async f => {
              const stat = await fs.stat(path.join(recordingsPath, f))
              return { name: f, size: stat.size }
            })
        )
        recordings = stats.sort((a, b) => a.name.localeCompare(b.name))
        recordingsTotal = recordings.reduce((sum, r) => sum + r.size, 0)
      } catch {
        // No recordings folder
      }

      // Check prep folder
      const prepPath = path.join(config.projectDirectory, 'edits', 'prep')
      let prepExists = false
      let prepFiles: { name: string; size: number }[] = []

      try {
        const stat = await fs.stat(prepPath)
        prepExists = stat.isDirectory()
        if (prepExists) {
          const files = await fs.readdir(prepPath)
          prepFiles = await Promise.all(
            files
              .filter(f => !f.startsWith('.'))
              .map(async f => {
                const s = await fs.stat(path.join(prepPath, f))
                return { name: f, size: s.size }
              })
          )
        }
      } catch {
        // Folder doesn't exist
      }

      res.json({
        success: true,
        project: {
          code,
          name,
          fullCode: projectCode
        },
        glingFilename: projectCode,
        glingDictionary: config.glingDictionary || [],
        recordings,
        recordingsTotal,
        prepFolder: {
          exists: prepExists,
          path: 'edits/prep/',
          files: prepFiles
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) })
    }
  })

  // POST /api/first-edit/create-prep-folder - Create edits/prep folder
  router.post('/create-prep-folder', async (req, res) => {
    try {
      const config = getConfig()

      if (!config.projectDirectory) {
        return res.json({ success: false, error: 'No project selected' })
      }

      const prepPath = path.join(config.projectDirectory, 'edits', 'prep')
      await fs.mkdir(prepPath, { recursive: true })

      res.json({ success: true, path: 'edits/prep/' })
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) })
    }
  })

  return router
}
