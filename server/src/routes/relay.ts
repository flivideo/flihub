// B038: relay collaboration
import express from 'express';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Config } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';

const execAsync = promisify(exec);

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
      if (!config.relayDirectory || !config.projectDirectory) {
        return res.json({ success: false, error: 'Relay not configured or no active project' });
      }
      const projectDir = expandPath(config.projectDirectory);
      const projectCode = path.basename(projectDir);
      const relayProjectDir = path.join(expandPath(config.relayDirectory), projectCode);
      const recordingsDir = path.join(projectDir, 'recordings') + '/';
      const relayRecordingsDir = path.join(relayProjectDir, 'recordings') + '/';

      const cmd = `bash -lc "rsync -av --dry-run --itemize-changes '${recordingsDir}' '${relayRecordingsDir}'"`;
      const { stdout } = await execAsync(cmd, { timeout: 60000 });

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
      if (!config.relayDirectory || !config.projectDirectory) {
        return res.json({ success: false, error: 'Relay not configured or no active project' });
      }
      const projectDir = expandPath(config.projectDirectory);
      const projectCode = path.basename(projectDir);
      const relayProjectDir = path.join(expandPath(config.relayDirectory), projectCode);
      const recordingsDir = path.join(projectDir, 'recordings') + '/';
      const relayRecordingsDir = path.join(relayProjectDir, 'recordings') + '/';

      // ensure relay directory exists
      const mkdirCmd = `bash -lc "mkdir -p '${relayRecordingsDir}'"`;
      await execAsync(mkdirCmd, { timeout: 10000 });

      const cmd = `bash -lc "rsync -av '${recordingsDir}' '${relayRecordingsDir}'"`;
      const { stdout } = await execAsync(cmd, { timeout: 300000 });
      res.json({ success: true, output: stdout });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // POST /api/relay/collect — copy edits from relay back into project
  router.post('/collect', async (req, res) => {
    try {
      const config = getConfig();
      if (!config.relayDirectory || !config.projectDirectory) {
        return res.json({ success: false, error: 'Relay not configured or no active project' });
      }
      const projectDir = expandPath(config.projectDirectory);
      const projectCode = path.basename(projectDir);
      const relayProjectDir = path.join(expandPath(config.relayDirectory), projectCode);
      const relayFinalDir = path.join(relayProjectDir, 'final') + '/';
      const projectFinalDir = path.join(projectDir, 'final') + '/';

      const mkdirCmd = `bash -lc "mkdir -p '${projectFinalDir}'"`;
      await execAsync(mkdirCmd, { timeout: 10000 });

      const cmd = `bash -lc "rsync -av '${relayFinalDir}' '${projectFinalDir}'"`;
      const { stdout } = await execAsync(cmd, { timeout: 300000 });
      res.json({ success: true, output: stdout });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  return router;
}

// Parse rsync --itemize-changes output into structured diff
function parseRsyncDiff(stdout: string): { new: string[]; updated: string[]; deleted: string[] } {
  const lines = stdout.split('\n').filter(l => l.trim());
  const result: { new: string[]; updated: string[]; deleted: string[] } = { new: [], updated: [], deleted: [] };

  for (const line of lines) {
    if (line.startsWith('*deleting')) {
      result.deleted.push(line.replace('*deleting', '').trim());
    } else if (line.startsWith('>f+++++++++')) {
      result.new.push(line.slice(12).trim());
    } else if (line.match(/^>f[^+]/)) {
      result.updated.push(line.slice(12).trim());
    }
  }

  return result;
}
