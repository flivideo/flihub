/**
 * FR-111: Per-Project State API Routes
 *
 * Provides read/write access to .flihub-state.json files.
 * State includes per-recording flags like 'safe' (hidden from active view).
 *
 * Endpoints:
 * - GET /api/projects/:code/state - Read project state
 * - POST /api/projects/:code/state - Update project state
 */

import { Router, Request, Response } from 'express'
import path from 'path'
import fs from 'fs-extra'
import { expandPath } from '../utils/pathUtils.js'
import { readProjectState, writeProjectState, mergeRecordingStates } from '../utils/projectState.js'
import type { Config, ProjectStateResponse, UpdateProjectStateRequest } from '../../../shared/types.js'

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave'

export function createStateRoutes(getConfig: () => Config): Router {
  const router = Router()

  /**
   * GET /api/projects/:code/state
   * Read project state file
   *
   * Returns:
   * - { success: true, state: ProjectState }
   * - { success: false, error: string } on error
   *
   * If state file doesn't exist, returns empty state: { version: 1, recordings: {} }
   */
  router.get('/projects/:code/state', async (req: Request, res: Response) => {
    const { code } = req.params

    try {
      // Resolve project directory
      const projectsRoot = expandPath(PROJECTS_ROOT)
      const entries = await fs.readdir(projectsRoot, { withFileTypes: true })

      // Find project folder matching code
      const projectFolder = entries.find(
        (e) => e.isDirectory() && e.name.startsWith(code)
      )

      if (!projectFolder) {
        return res.status(404).json({
          success: false,
          error: `Project not found: ${code}`,
        })
      }

      const projectDir = path.join(projectsRoot, projectFolder.name)
      const state = await readProjectState(projectDir)

      res.json({
        success: true,
        state,
      } as ProjectStateResponse)
    } catch (error) {
      console.error(`[FR-111] Error reading state for ${code}:`, error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read state',
      })
    }
  })

  /**
   * POST /api/projects/:code/state
   * Update project state file
   *
   * Request body: { recordings: Record<string, RecordingState> }
   * Merges with existing state (doesn't replace entirely)
   *
   * Returns:
   * - { success: true }
   * - { success: false, error: string } on error
   */
  router.post('/projects/:code/state', async (req: Request, res: Response) => {
    const { code } = req.params
    const body = req.body as UpdateProjectStateRequest

    if (!body.recordings || typeof body.recordings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid recordings object',
      })
    }

    try {
      // Resolve project directory
      const projectsRoot = expandPath(PROJECTS_ROOT)
      const entries = await fs.readdir(projectsRoot, { withFileTypes: true })

      // Find project folder matching code
      const projectFolder = entries.find(
        (e) => e.isDirectory() && e.name.startsWith(code)
      )

      if (!projectFolder) {
        return res.status(404).json({
          success: false,
          error: `Project not found: ${code}`,
        })
      }

      const projectDir = path.join(projectsRoot, projectFolder.name)

      // Read existing state and merge
      const existingState = await readProjectState(projectDir)
      const newState = mergeRecordingStates(existingState, body.recordings)

      // Write updated state
      await writeProjectState(projectDir, newState)

      res.json({ success: true })
    } catch (error) {
      console.error(`[FR-111] Error writing state for ${code}:`, error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to write state',
      })
    }
  })

  return router
}
