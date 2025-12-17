// FR-103: S3 Staging Page API
// FR-104: S3 Staging Migration Tool
import express from 'express'
import path from 'path'
import fs from 'fs/promises'
import type { Config } from '../../../shared/types.js'

// FR-104: Migration types
interface MigrationActions {
  delete: string[]
  toPrep: Array<{ from: string; to: string }>
  toPost: Array<{ from: string; to: string }>
  conflicts: Array<{ file: string; reason: string }>
}

// FR-104: Categorize files for migration
function categorizeMigrationFiles(files: string[], projectName: string): MigrationActions {
  const actions: MigrationActions = {
    delete: [],
    toPrep: [],
    toPost: [],
    conflicts: [],
  }

  // Track versions we've seen to detect conflicts
  const seenVersions = new Set<string>()

  for (const file of files) {
    // Junk files - delete
    if (file === '.DS_Store' || file.endsWith('.Zone.Identifier')) {
      actions.delete.push(file)
      continue
    }

    // Final files go to post/ with version rename
    // Pattern: *-final*.mp4 or *-final*.srt
    const finalMatch = file.match(/^(.+)-final(-v(\d+))?\.(mp4|srt|mov)$/i)
    if (finalMatch) {
      const baseName = projectName || finalMatch[1]
      const version = finalMatch[3] || '1' // Default to v1 if no version
      const ext = finalMatch[4]
      const targetName = `${baseName}-v${version}.${ext}`

      // Check for conflicts
      if (seenVersions.has(targetName)) {
        actions.conflicts.push({ file, reason: `Would overwrite existing v${version}` })
      } else {
        seenVersions.add(targetName)
        actions.toPost.push({ from: file, to: `post/${targetName}` })
      }
      continue
    }

    // Everything else goes to prep/
    if (/\.(mp4|srt|mov)$/i.test(file)) {
      actions.toPrep.push({ from: file, to: `prep/${file}` })
    }
  }

  return actions
}

// FR-104: Execute migration
async function executeMigration(stagingDir: string, actions: MigrationActions): Promise<void> {
  // Create subfolders
  await fs.mkdir(path.join(stagingDir, 'prep'), { recursive: true })
  await fs.mkdir(path.join(stagingDir, 'post'), { recursive: true })

  // Delete junk files
  for (const file of actions.delete) {
    await fs.rm(path.join(stagingDir, file), { force: true })
  }

  // Move to prep/
  for (const { from, to } of actions.toPrep) {
    const srcPath = path.join(stagingDir, from)
    const destPath = path.join(stagingDir, to)
    // Check if destination exists to avoid overwrite
    try {
      await fs.access(destPath)
      // File exists, skip
    } catch {
      await fs.rename(srcPath, destPath)
    }
  }

  // Move to post/
  for (const { from, to } of actions.toPost) {
    const srcPath = path.join(stagingDir, from)
    const destPath = path.join(stagingDir, to)
    // Check if destination exists to avoid overwrite
    try {
      await fs.access(destPath)
      // File exists, skip
    } catch {
      await fs.rename(srcPath, destPath)
    }
  }
}

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

      // FR-104: Detect flat files in s3-staging root (legacy structure)
      const stagingDir = path.join(config.projectDirectory, 's3-staging')
      let flatFiles: string[] = []
      try {
        const stagingEntries = await fs.readdir(stagingDir, { withFileTypes: true })
        flatFiles = stagingEntries.filter(e => e.isFile()).map(e => e.name)
      } catch {
        // s3-staging folder doesn't exist
      }

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
        },
        // FR-104: Migration info
        migration: {
          hasLegacyFiles: flatFiles.length > 0,
          flatFileCount: flatFiles.length
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

  // FR-104: POST /api/s3-staging/migrate - Migrate flat s3-staging to prep/ + post/ structure
  router.post('/migrate', async (req, res) => {
    try {
      const { dryRun = true } = req.body
      const config = getConfig()

      if (!config.projectDirectory) {
        return res.status(400).json({ success: false, error: 'No project selected' })
      }

      const stagingDir = path.join(config.projectDirectory, 's3-staging')

      // Check if staging folder exists
      try {
        const stat = await fs.stat(stagingDir)
        if (!stat.isDirectory()) {
          return res.status(400).json({ success: false, error: 's3-staging is not a directory' })
        }
      } catch {
        return res.status(400).json({ success: false, error: 's3-staging folder does not exist' })
      }

      // Get files in root of s3-staging (not in subfolders)
      const entries = await fs.readdir(stagingDir, { withFileTypes: true })
      const flatFiles = entries.filter(e => e.isFile()).map(e => e.name)

      if (flatFiles.length === 0) {
        return res.json({
          success: true,
          message: 'No flat files to migrate',
          dryRun,
          actions: { delete: [], toPrep: [], toPost: [], conflicts: [] }
        })
      }

      // Categorize files
      const projectName = config.activeProject || ''
      const actions = categorizeMigrationFiles(flatFiles, projectName)

      if (!dryRun) {
        await executeMigration(stagingDir, actions)
      }

      res.json({ success: true, dryRun, actions })
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) })
    }
  })

  return router
}
