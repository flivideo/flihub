// B038: relay collaboration
import express from 'express';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import type { Config, RelaySubfolder, RelayProjectInfo } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';

const execFileAsync = promisify(execFile);

export const RELAY_SUBFOLDERS: RelaySubfolder[] = ['recordings', 'edit-1st', 'edit-2nd'];

const RSYNC_EXCLUDES = [
  '.DS_Store', '._*',
  '.gitkeep',
  '.stfolder', '.stignore', '.stversions',
  '.Spotlight-V100', '.Trashes',
  'Thumbs.db',
];

export function rsyncExcludeArgs(): string[] {
  return RSYNC_EXCLUDES.flatMap(pattern => ['--exclude', pattern]);
}

interface RelayPaths {
  projectDir: string;
  projectCode: string;
  relayProjectDir: string;
}

export function getRelayPaths(config: Config): RelayPaths | { error: string } {
  if (!config.relayEnabled || !config.relayDirectory || !config.projectDirectory) {
    return { error: 'Relay not enabled or not configured' };
  }
  const projectDir = expandPath(config.projectDirectory);
  const projectCode = path.basename(projectDir);
  if (!projectCode || projectCode.includes('..')) {
    return { error: 'Invalid project directory' };
  }
  const relayProjectDir = path.join(expandPath(config.relayDirectory), projectCode);
  return { projectDir, projectCode, relayProjectDir };
}

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

  // GET /api/relay/browse — scan relay directory for per-project breakdown
  router.get('/browse', async (req, res) => {
    try {
      const config = getConfig();
      if (!config.relayEnabled || !config.relayDirectory) {
        return res.json({ success: false, error: 'Relay not enabled or not configured' });
      }
      const relayDir = expandPath(config.relayDirectory);
      const subfolderNames = RELAY_SUBFOLDERS;

      let entries: { name: string; isDirectory: () => boolean }[];
      try {
        entries = await fs.readdir(relayDir, { withFileTypes: true });
      } catch {
        return res.json({ success: true, projects: [], relayDirectory: config.relayDirectory });
      }

      const projects: RelayProjectInfo[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const projectPath = path.join(relayDir, entry.name);
        const subfolders: Record<string, { fileCount: number; totalSize: number }> = {};

        for (const sub of subfolderNames) {
          const subPath = path.join(projectPath, sub);
          try {
            const files = await fs.readdir(subPath);
            let fileCount = 0;
            let totalSize = 0;
            for (const f of files) {
              if (f.startsWith('.')) continue;
              try {
                const stat = await fs.stat(path.join(subPath, f));
                if (stat.isFile()) {
                  fileCount++;
                  totalSize += stat.size;
                }
              } catch {
                // skip files we can't stat
              }
            }
            subfolders[sub] = { fileCount, totalSize };
          } catch {
            subfolders[sub] = { fileCount: 0, totalSize: 0 };
          }
        }

        projects.push({
          projectCode: entry.name,
          subfolders: subfolders as RelayProjectInfo['subfolders'],
        });
      }

      res.json({ success: true, projects, relayDirectory: config.relayDirectory });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // POST /api/relay/preview — rsync dry-run, returns structured diff
  router.post('/preview', async (req, res) => {
    try {
      const config = getConfig();
      const paths = getRelayPaths(config);
      if ('error' in paths) return res.json({ success: false, error: paths.error });

      const subfolder: RelaySubfolder = req.body?.subfolder || 'recordings';
      if (!RELAY_SUBFOLDERS.includes(subfolder)) {
        return res.json({ success: false, error: `Invalid subfolder: ${subfolder}` });
      }

      const { projectDir, relayProjectDir } = paths;
      const sourceDir = path.join(projectDir, subfolder) + '/';
      const destDir = path.join(relayProjectDir, subfolder) + '/';

      const { stdout } = await execFileAsync('rsync', [
        '-av', '--dry-run', '--itemize-changes',
        ...rsyncExcludeArgs(),
        sourceDir, destDir
      ], { timeout: 60000 });

      const diff = parseRsyncDiff(stdout);
      res.json({ success: true, diff, subfolder });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // POST /api/relay/push — rsync subfolder to relay folder
  router.post('/push', async (req, res) => {
    try {
      const config = getConfig();
      const paths = getRelayPaths(config);
      if ('error' in paths) return res.json({ success: false, error: paths.error });

      const subfolder: RelaySubfolder = req.body?.subfolder || 'recordings';
      if (!RELAY_SUBFOLDERS.includes(subfolder)) {
        return res.json({ success: false, error: `Invalid subfolder: ${subfolder}` });
      }

      const { projectDir, relayProjectDir } = paths;
      const sourceDir = path.join(projectDir, subfolder) + '/';
      const destDir = path.join(relayProjectDir, subfolder) + '/';

      await fs.ensureDir(destDir);

      const { stdout } = await execFileAsync('rsync', [
        '-av',
        ...rsyncExcludeArgs(),
        sourceDir, destDir
      ], { timeout: 300000 });
      res.json({ success: true, output: stdout, subfolder });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // POST /api/relay/collect — copy subfolder from relay back into project
  router.post('/collect', async (req, res) => {
    try {
      const config = getConfig();
      const paths = getRelayPaths(config);
      if ('error' in paths) return res.json({ success: false, error: paths.error });

      const subfolder: RelaySubfolder = req.body?.subfolder || 'recordings';
      if (!RELAY_SUBFOLDERS.includes(subfolder)) {
        return res.json({ success: false, error: `Invalid subfolder: ${subfolder}` });
      }

      const { projectDir, relayProjectDir } = paths;
      const sourceDir = path.join(relayProjectDir, subfolder) + '/';
      const destDir = path.join(projectDir, subfolder) + '/';

      await fs.ensureDir(destDir);

      const { stdout } = await execFileAsync('rsync', [
        '-av',
        ...rsyncExcludeArgs(),
        sourceDir, destDir
      ], { timeout: 300000 });
      res.json({ success: true, output: stdout, subfolder });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // GET /api/relay/versions — list files in local project edit-2nd/
  router.get('/versions', async (req, res) => {
    try {
      const config = getConfig();
      const paths = getRelayPaths(config);
      if ('error' in paths) return res.json({ success: false, error: paths.error });

      const editDir = path.join(paths.projectDir, 'edit-2nd');
      try {
        const files = await fs.readdir(editDir);
        const versions: { filename: string; size: number; modified: string }[] = [];
        for (const f of files) {
          if (f.startsWith('.')) continue;
          try {
            const stat = await fs.stat(path.join(editDir, f));
            if (stat.isFile()) {
              versions.push({ filename: f, size: stat.size, modified: stat.mtime.toISOString() });
            }
          } catch {
            // skip files we can't stat
          }
        }
        // Sort by modified date, newest first
        versions.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
        res.json({ success: true, versions });
      } catch {
        // edit-2nd doesn't exist yet — return empty
        res.json({ success: true, versions: [] });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // POST /api/relay/promote — copy selected file from edit-2nd/ to final/
  router.post('/promote', async (req, res) => {
    try {
      const config = getConfig();
      const paths = getRelayPaths(config);
      if ('error' in paths) return res.json({ success: false, error: paths.error });

      const { filename } = req.body || {};
      if (!filename || typeof filename !== 'string') {
        return res.json({ success: false, error: 'filename is required' });
      }
      // Validate no path traversal
      if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
        return res.json({ success: false, error: 'Invalid filename' });
      }

      const source = path.join(paths.projectDir, 'edit-2nd', filename);
      // Check source exists
      const exists = await fs.pathExists(source);
      if (!exists) {
        return res.json({ success: false, error: `File not found: ${filename}` });
      }

      const destDir = path.join(paths.projectDir, 'final');
      await fs.ensureDir(destDir);
      await fs.copy(source, path.join(destDir, filename));
      res.json({ success: true, promoted: filename });
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
