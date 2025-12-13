/**
 * FR-33: Final Video & SRT Detection
 *
 * Detects final video and SRT files for a project by scanning folders
 * in priority order: final/ → s3-staging/ → project root
 *
 * Also detects additional Gling export segments.
 */

import path from 'path'
import fs from 'fs-extra'
import { glob } from 'glob'
import { getProjectPaths } from '../../../shared/paths.js'

// Location types for final media
export type FinalMediaLocation = 'final' | 's3-staging' | 'root'

// Response types
export interface FinalVideoInfo {
  path: string
  filename: string
  size: number
  version?: number
  location: FinalMediaLocation
}

export interface FinalSrtInfo {
  path: string
  filename: string
  size: number
  location: FinalMediaLocation
}

export interface AdditionalSegment {
  filename: string
  size: number
  hasSrt: boolean
}

export interface FinalMediaResponse {
  success: boolean
  video?: FinalVideoInfo
  srt?: FinalSrtInfo
  additionalSegments?: AdditionalSegment[]
}

/**
 * Extract version number from filename
 * e.g., "b64-final-v3.mp4" → 3
 *       "b64-final.mp4" → undefined
 */
function extractVersion(filename: string): number | undefined {
  const match = filename.match(/-v(\d+)\.[^.]+$/)
  return match ? parseInt(match[1], 10) : undefined
}

/**
 * Find the latest version among multiple video files
 */
function findLatestVersion(files: string[]): { path: string; version?: number } | null {
  if (files.length === 0) return null

  // Extract versions and sort
  const withVersions = files.map(f => ({
    path: f,
    version: extractVersion(path.basename(f)),
  }))

  // Sort by version (undefined = 0, then highest number)
  withVersions.sort((a, b) => {
    const vA = a.version ?? 0
    const vB = b.version ?? 0
    return vB - vA  // Descending
  })

  return withVersions[0]
}

/**
 * Check if a file looks like an additional segment (not the main project video)
 * Main video patterns: {code}.mp4, {code}-final*.mp4
 * Segments: {descriptive-name}.mp4, {code}-outro.mp4, etc.
 */
function isAdditionalSegment(filename: string, projectCode: string): boolean {
  const base = path.basename(filename, path.extname(filename))

  // Main video patterns to exclude
  const mainPatterns = [
    new RegExp(`^${projectCode}$`),              // b64.mp4
    new RegExp(`^${projectCode}-final`),          // b64-final.mp4, b64-final-v1.mp4
    new RegExp(`^${projectCode}-[^-]+$`),         // b64-bmad-claude-sdk.mp4 (code-suffix)
  ]

  // Check if it's a main video
  for (const pattern of mainPatterns) {
    if (pattern.test(base)) return false
  }

  // Explicitly recognize segment patterns
  const segmentPatterns = [
    /outro$/i,
    /talking-head/i,
    /demonstration/i,
    /segment/i,
  ]

  for (const pattern of segmentPatterns) {
    if (pattern.test(base)) return true
  }

  // If starts with project code but has extra parts, might be segment
  if (base.startsWith(projectCode + '-')) {
    // Count dashes - main videos have fewer segments
    const dashes = (base.match(/-/g) || []).length
    if (dashes >= 2) return true
  }

  return false
}

/**
 * Detect final video and SRT for a project
 *
 * Priority order:
 * 1. final/{project-code}*.mp4
 * 2. s3-staging/{code}-final-v*.mp4 (latest version)
 * 3. s3-staging/{code}.mp4
 * 4. {project-root}/{code}*.mp4
 */
export async function detectFinalMedia(
  projectPath: string,
  projectCode: string
): Promise<FinalMediaResponse> {
  const paths = getProjectPaths(projectPath)

  // Define search locations in priority order
  const locations: { path: string; location: FinalMediaLocation }[] = [
    { path: paths.final, location: 'final' },
    { path: paths.s3Staging, location: 's3-staging' },
    { path: projectPath, location: 'root' },
  ]

  let foundVideo: FinalVideoInfo | undefined
  let foundSrt: FinalSrtInfo | undefined
  const additionalSegments: AdditionalSegment[] = []

  for (const loc of locations) {
    if (!await fs.pathExists(loc.path)) continue

    // Look for video files matching project code
    const videoPattern = path.join(loc.path, `${projectCode}*.mp4`)
    const srtPattern = path.join(loc.path, `${projectCode}*.srt`)

    const videos = await glob(videoPattern)
    const srts = await glob(srtPattern)

    if (videos.length > 0 && !foundVideo) {
      // Filter out additional segments for main video detection
      const mainVideos = videos.filter((v: string) => !isAdditionalSegment(v, projectCode))

      // For s3-staging, prefer -final-v* versions
      let targetVideos = mainVideos
      if (loc.location === 's3-staging') {
        const finalVersions = mainVideos.filter((v: string) => path.basename(v).includes('-final'))
        if (finalVersions.length > 0) {
          targetVideos = finalVersions
        }
      }

      const latest = findLatestVersion(targetVideos)
      if (latest) {
        const stats = await fs.stat(latest.path)
        foundVideo = {
          path: latest.path,
          filename: path.basename(latest.path),
          size: stats.size,
          version: latest.version,
          location: loc.location,
        }
      }
    }

    // Look for matching SRT
    if (srts.length > 0 && !foundSrt) {
      // Try to find SRT matching the video filename
      const videoBasename = foundVideo ? path.basename(foundVideo.filename, '.mp4') : projectCode
      const matchingSrt = srts.find((s: string) => {
        const srtBase = path.basename(s, '.srt')
        return srtBase === videoBasename || srtBase.startsWith(projectCode)
      })

      const srtPath = matchingSrt || srts[0]
      const stats = await fs.stat(srtPath)
      foundSrt = {
        path: srtPath,
        filename: path.basename(srtPath),
        size: stats.size,
        location: loc.location,
      }
    }

    // Collect additional segments from s3-staging
    if (loc.location === 's3-staging') {
      const allMp4s = await glob(path.join(loc.path, '*.mp4'))
      for (const mp4 of allMp4s) {
        const filename = path.basename(mp4)
        if (isAdditionalSegment(mp4, projectCode)) {
          const stats = await fs.stat(mp4)
          const srtPath = mp4.replace(/\.mp4$/, '.srt')
          const hasSrt = await fs.pathExists(srtPath)
          additionalSegments.push({
            filename,
            size: stats.size,
            hasSrt,
          })
        }
      }
    }

    // If we found a video in this location, stop searching lower priority locations
    if (foundVideo) break
  }

  return {
    success: true,
    video: foundVideo,
    srt: foundSrt,
    additionalSegments: additionalSegments.length > 0 ? additionalSegments : undefined,
  }
}
