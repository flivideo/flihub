// FR-102: Edit Prep Page API
import express from 'express'
import path from 'path'
import fs from 'fs/promises'
import type { Config } from '../../../shared/types.js'
import { expandPath } from '../utils/pathUtils.js'

export function createEditRoutes(getConfig: () => Config) {
  const router = express.Router()

  // GET /api/edit/prep - Get edit prep data
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
      const recordingsPath = path.join(expandPath(config.projectDirectory), 'recordings')
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

      // Check edit folders
      const projectPath = expandPath(config.projectDirectory)
      const editFolders = ['edit-1st', 'edit-2nd', 'edit-final']
      const editFolderStatus: { name: string; exists: boolean }[] = []

      for (const folder of editFolders) {
        const folderPath = path.join(projectPath, folder)
        let exists = false
        try {
          const stat = await fs.stat(folderPath)
          exists = stat.isDirectory()
        } catch {
          // Folder doesn't exist
        }
        editFolderStatus.push({ name: folder, exists })
      }

      const allExist = editFolderStatus.every(f => f.exists)

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
        editFolders: {
          allExist,
          folders: editFolderStatus
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) })
    }
  })

  // POST /api/edit/create-folders - Create all edit folders
  router.post('/create-folders', async (req, res) => {
    try {
      const config = getConfig()

      if (!config.projectDirectory) {
        return res.json({ success: false, error: 'No project selected' })
      }

      const projectPath = expandPath(config.projectDirectory)
      const editFolders = ['edit-1st', 'edit-2nd', 'edit-final']

      for (const folder of editFolders) {
        await fs.mkdir(path.join(projectPath, folder), { recursive: true })
      }

      res.json({ success: true, folders: editFolders })
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) })
    }
  })

  return router
}
