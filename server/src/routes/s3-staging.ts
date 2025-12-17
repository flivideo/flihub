// FR-103: S3 Staging Page API
import express from 'express'
import path from 'path'
import fs from 'fs/promises'
import type { Config } from '../../../shared/types.js'

export function createS3StagingRoutes(getConfig: () => Config) {
  const router = express.Router()

  // GET /api/s3-staging/status
  router.get('/status', async (req, res) => {
    try {
      const config = getConfig()
      if (!config.projectDirectory) {
        return res.json({ success: false, error: 'No project selected' })
      }

      const projectCode = path.basename(config.projectDirectory)

      // Helper to list files in a directory
      const listFiles = async (dir: string) => {
        try {
          const files = await fs.readdir(dir)
          return Promise.all(
            files
              .filter(f => !f.startsWith('.'))
              .map(async f => {
                const stat = await fs.stat(path.join(dir, f))
                return { name: f, size: stat.size }
              })
          )
        } catch {
          return []
        }
      }

      // Check folder existence
      const folderExists = async (dir: string) => {
        try {
          const stat = await fs.stat(dir)
          return stat.isDirectory()
        } catch {
          return false
        }
      }

      // Paths
      const prepSourcePath = path.join(config.projectDirectory, 'edits', 'prep')
      const prepStagingPath = path.join(config.projectDirectory, 's3-staging', 'prep')
      const postStagingPath = path.join(config.projectDirectory, 's3-staging', 'post')
      const publishPath = path.join(config.projectDirectory, 'edits', 'publish')

      // Gather data
      const [prepSource, prepStaging, postStaging, publishFiles] = await Promise.all([
        listFiles(prepSourcePath),
        listFiles(prepStagingPath),
        listFiles(postStagingPath),
        listFiles(publishPath)
      ])

      // Check which prep files are synced to staging
      const prepStagingNames = new Set(prepStaging.map(f => f.name))
      const prepSourceWithSync = prepSource.map(f => ({
        ...f,
        synced: prepStagingNames.has(f.name)
      }))

      // Group post files by version and check for missing SRTs
      const postVideos = postStaging.filter(f => /\.(mp4|mov)$/i.test(f.name))
      const postSrts = new Set(postStaging.filter(f => /\.srt$/i.test(f.name)).map(f => f.name))

      const postWithSrt = postVideos.map(v => {
        const srtName = v.name.replace(/\.(mp4|mov)$/i, '.srt')
        return {
          ...v,
          hasSrt: postSrts.has(srtName),
          srtName
        }
      })

      const warnings = postWithSrt
        .filter(v => !v.hasSrt)
        .map(v => ({ type: 'missing_srt', file: v.name }))

      res.json({
        success: true,
        project: projectCode,
        prep: {
          source: {
            path: 'edits/prep/',
            exists: await folderExists(prepSourcePath),
            files: prepSourceWithSync
          },
          staging: {
            path: 's3-staging/prep/',
            exists: await folderExists(prepStagingPath),
            files: prepStaging
          }
        },
        post: {
          staging: {
            path: 's3-staging/post/',
            exists: await folderExists(postStagingPath),
            files: postWithSrt
          },
          warnings
        },
        publish: {
          path: 'edits/publish/',
          exists: await folderExists(publishPath),
          files: publishFiles
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) })
    }
  })

  // POST /api/s3-staging/sync-prep - Copy from edits/prep to s3-staging/prep
  router.post('/sync-prep', async (req, res) => {
    try {
      const config = getConfig()
      if (!config.projectDirectory) {
        return res.json({ success: false, error: 'No project selected' })
      }

      const sourcePath = path.join(config.projectDirectory, 'edits', 'prep')
      const destPath = path.join(config.projectDirectory, 's3-staging', 'prep')

      // Create destination if needed
      await fs.mkdir(destPath, { recursive: true })

      // Copy files
      const files = await fs.readdir(sourcePath)
      let copied = 0
      let totalSize = 0

      for (const file of files) {
        if (file.startsWith('.')) continue
        const src = path.join(sourcePath, file)
        const dest = path.join(destPath, file)
        await fs.copyFile(src, dest)
        const stat = await fs.stat(dest)
        copied++
        totalSize += stat.size
      }

      res.json({ success: true, copied, totalSize })
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) })
    }
  })

  // POST /api/s3-staging/promote - Promote post version to publish
  router.post('/promote', async (req, res) => {
    try {
      const config = getConfig()
      const { version } = req.body // e.g., "v1"

      if (!config.projectDirectory) {
        return res.json({ success: false, error: 'No project selected' })
      }

      const postPath = path.join(config.projectDirectory, 's3-staging', 'post')
      const publishPath = path.join(config.projectDirectory, 'edits', 'publish')

      // Create publish folder if needed
      await fs.mkdir(publishPath, { recursive: true })

      // Find files matching the version
      const files = await fs.readdir(postPath)
      const versionPattern = new RegExp(`-${version}\\.(mp4|mov|srt)$`, 'i')
      const filesToCopy = files.filter(f => versionPattern.test(f))

      if (filesToCopy.length === 0) {
        return res.json({ success: false, error: `No files found for ${version}` })
      }

      const copied: { from: string; to: string }[] = []

      for (const file of filesToCopy) {
        const src = path.join(postPath, file)
        // Remove version suffix: b85-clauding-01-v1.mp4 -> b85-clauding-01.mp4
        const destName = file.replace(`-${version}`, '')
        const dest = path.join(publishPath, destName)
        await fs.copyFile(src, dest)
        copied.push({ from: `s3-staging/post/${file}`, to: `edits/publish/${destName}` })
      }

      res.json({ success: true, files: copied })
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) })
    }
  })

  return router
}
