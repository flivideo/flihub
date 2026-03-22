// B038: relay collaboration
import express from 'express';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import type { Config } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';

const execFileAsync = promisify(execFile);

export function createRelayRoutes(getConfig: () => Config) {
  const router = express.Router();

  // GET /api/relay/status — is relay configured and enabled?
  router.get('/status', async (req, res) => {
    const config = getConfig();
    res.json({
      success: true,
      configured: !!config.relayDirectory,
      enabled: !!config.relayEnabled,
      relayDirectory: config.relayDirectory || null,
    });
  });

  // POST /api/relay/preview — rsync dry-run, returns structured diff
  router.post('/preview', async (req, res) => {
    try {
      const config = getConfig();
      if (!config.relayEnabled || !config.relayDirectory || !config.projectDirectory) {
        return res.json({ success: false, error: 'Relay not enabled or not configured' });
      }
      const projectDir = expandPath(config.projectDirectory);
      const projectCode = path.basename(projectDir);
      if (!projectCode || projectCode.includes('..')) {
        return res.json({ success: false, error: 'Invalid project directory' });
      }
      const relayProjectDir = path.join(expandPath(config.relayDirectory), projectCode);
      const recordingsDir = path.join(projectDir, 'recordings') + '/';
      const relayRecordingsDir = path.join(relayProjectDir, 'recordings') + '/';

      const { stdout } = await execFileAsync('rsync', [
        '-av', '--dry-run', '--itemize-changes',
        '--exclude', '.DS_Store',
        '--exclude', '._*',
        recordingsDir, relayRecordingsDir
      ], { timeout: 60000 });

      const diff = parseRsyncDiff(stdout);
      res.json({ success: true, diff });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // POST /api/relay/push — rsync recordings to relay folder
  router.post('/push', async (req, res) => {
    try {
      const config = getConfig();
      if (!config.relayEnabled || !config.relayDirectory || !config.projectDirectory) {
        return res.json({ success: false, error: 'Relay not enabled or not configured' });
      }
      const projectDir = expandPath(config.projectDirectory);
      const projectCode = path.basename(projectDir);
      if (!projectCode || projectCode.includes('..')) {
        return res.json({ success: false, error: 'Invalid project directory' });
      }
      const relayProjectDir = path.join(expandPath(config.relayDirectory), projectCode);
      const recordingsDir = path.join(projectDir, 'recordings') + '/';
      const relayRecordingsDir = path.join(relayProjectDir, 'recordings') + '/';

      // ensure relay directory exists
      await fs.ensureDir(relayRecordingsDir);

      const { stdout } = await execFileAsync('rsync', [
        '-av',
        '--exclude', '.DS_Store',
        '--exclude', '._*',
        recordingsDir, relayRecordingsDir
      ], { timeout: 300000 });
      res.json({ success: true, output: stdout });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // POST /api/relay/collect — copy edits from relay back into project
  router.post('/collect', async (req, res) => {
    try {
      const config = getConfig();
      if (!config.relayEnabled || !config.relayDirectory || !config.projectDirectory) {
        return res.json({ success: false, error: 'Relay not enabled or not configured' });
      }
      const projectDir = expandPath(config.projectDirectory);
      const projectCode = path.basename(projectDir);
      if (!projectCode || projectCode.includes('..')) {
        return res.json({ success: false, error: 'Invalid project directory' });
      }
      const relayProjectDir = path.join(expandPath(config.relayDirectory), projectCode);
      const relayFinalDir = path.join(relayProjectDir, 'final') + '/';
      const projectFinalDir = path.join(projectDir, 'final') + '/';

      await fs.ensureDir(projectFinalDir);

      const { stdout } = await execFileAsync('rsync', [
        '-av',
        '--exclude', '.DS_Store',
        '--exclude', '._*',
        relayFinalDir, projectFinalDir
      ], { timeout: 300000 });
      res.json({ success: true, output: stdout });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  return router;
}

// Parse rsync --itemize-changes output into structured diff
export function parseRsyncDiff(stdout: string): { new: string[]; updated: string[]; deleted: string[] } {
  const lines = stdout.split('\n').filter(l => l.trim());
  const result: { new: string[]; updated: string[]; deleted: string[] } = { new: [], updated: [], deleted: [] };

  for (const line of lines) {
    if (line.startsWith('*deleting')) {
      result.deleted.push(line.replace(/^\*deleting\s+/, ''));
    } else if (line.startsWith('>f')) {
      const spaceIndex = line.indexOf(' ');
      if (spaceIndex === -1) continue;
      const filename = line.slice(spaceIndex).trim();
      if (!filename) continue;

      if (line.startsWith('>f+++')) {
        result.new.push(filename);
      } else {
        result.updated.push(filename);
      }
    }
  }

  return result;
}
