/**
 * FR-127: Developer Tools Routes
 *
 * Provides read-only access to internal data files for debugging and verification.
 * All routes are prefixed with /api/developer/.
 *
 * ## Endpoints
 *
 * - GET /api/developer/project-state - Returns .flihub-state.json for active project
 * - GET /api/developer/config - Returns config.json
 * - GET /api/developer/telemetry - Returns transcription-telemetry.jsonl
 *
 * ## Use Cases
 *
 * - Verify FR-126 editManifest creation after "Prepare for Gling"
 * - Debug project state (safe, parked, annotations)
 * - Inspect configuration changes
 * - Review transcription performance metrics
 *
 * ## Security
 *
 * - Read-only: No write operations
 * - Local files only: Only reads from server-managed paths
 * - No arbitrary paths: File paths are derived from config, not user input
 */

import { Router, Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { expandPath } from '../utils/pathUtils.js';
import { getProjectPaths } from '../../../shared/paths.js';
import type { Config } from '../../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, '..', '..', 'config.json');
const TELEMETRY_FILE = path.join(__dirname, '..', '..', 'transcription-telemetry.jsonl');

export function createDeveloperRoutes(config: Config): Router {
  const router = Router();

  /**
   * GET /api/developer/project-state
   *
   * Returns .flihub-state.json for the currently active project.
   *
   * Response: {
   *   success: true,
   *   content: { version: 1, recordings: {...}, editManifest: {...}, glingDictionary: [...] },
   *   filePath: '/path/to/project/.flihub-state.json',
   *   size: 1234,
   *   lastModified: '2026-01-02T10:30:00.000Z'
   * }
   */
  router.get('/project-state', async (req: Request, res: Response) => {
    try {
      const projectDir = expandPath(config.projectDirectory);
      const paths = getProjectPaths(projectDir);
      const stateFilePath = paths.stateFile;

      // Check if file exists
      const exists = await fs.pathExists(stateFilePath);
      if (!exists) {
        // Return empty state (matches readProjectState behavior)
        return res.json({
          success: true,
          content: { version: 1, recordings: {} },
          filePath: stateFilePath,
          size: 0,
          lastModified: new Date().toISOString(),
          note: 'State file does not exist yet (will be created on first state change)',
        });
      }

      // Read file
      const content = await fs.readFile(stateFilePath, 'utf-8');
      const stats = await fs.stat(stateFilePath);

      res.json({
        success: true,
        content: JSON.parse(content),
        filePath: stateFilePath,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      });
    } catch (error) {
      console.error('[Developer] Error reading project state:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/developer/config
   *
   * Returns config.json with all application settings.
   *
   * Response: {
   *   success: true,
   *   content: { watchDirectory: '...', projectDirectory: '...', ... },
   *   filePath: '/path/to/server/config.json',
   *   size: 5678,
   *   lastModified: '2026-01-02T09:15:00.000Z'
   * }
   */
  router.get('/config', async (req: Request, res: Response) => {
    try {
      const exists = await fs.pathExists(CONFIG_FILE);
      if (!exists) {
        return res.status(404).json({
          success: false,
          error: 'Config file not found',
        });
      }

      const content = await fs.readFile(CONFIG_FILE, 'utf-8');
      const stats = await fs.stat(CONFIG_FILE);

      res.json({
        success: true,
        content: JSON.parse(content),
        filePath: CONFIG_FILE,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      });
    } catch (error) {
      console.error('[Developer] Error reading config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/developer/telemetry
   *
   * Returns transcription-telemetry.jsonl (raw JSONL content as string).
   *
   * Note: Returns raw JSONL as string (one JSON object per line).
   * Client can parse lines individually or display as-is.
   *
   * Response: {
   *   success: true,
   *   content: '{"startTimestamp":"...","endTimestamp":"...",...}\n{"startTimestamp":"...",...}\n',
   *   filePath: '/path/to/server/transcription-telemetry.jsonl',
   *   size: 12345,
   *   lastModified: '2026-01-02T11:45:00.000Z',
   *   lineCount: 42
   * }
   */
  router.get('/telemetry', async (req: Request, res: Response) => {
    try {
      const exists = await fs.pathExists(TELEMETRY_FILE);
      if (!exists) {
        return res.json({
          success: true,
          content: '',
          filePath: TELEMETRY_FILE,
          size: 0,
          lastModified: new Date().toISOString(),
          lineCount: 0,
          note: 'Telemetry file does not exist yet (will be created on first transcription)',
        });
      }

      const content = await fs.readFile(TELEMETRY_FILE, 'utf-8');
      const stats = await fs.stat(TELEMETRY_FILE);
      const lines = content.trim().split('\n').filter((line) => line.trim());

      res.json({
        success: true,
        content: content,
        filePath: TELEMETRY_FILE,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        lineCount: lines.length,
      });
    } catch (error) {
      console.error('[Developer] Error reading telemetry:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
