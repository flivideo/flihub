// B038: relay collaboration
import express from 'express';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import type { Config, RelaySubfolder, RelayProjectInfo, RelayActivityEvent, RelayFileInfo, RelayDivergenceInfo } from '../../../shared/types.js';
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

// In-memory ring buffer — last 50 events, no persistence needed
const activityLog: RelayActivityEvent[] = [];
const MAX_ACTIVITY = 50;

export function logRelayActivity(event: Omit<RelayActivityEvent, 'id'>) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  activityLog.unshift({ ...event, id });
  if (activityLog.length > MAX_ACTIVITY) activityLog.length = MAX_ACTIVITY;
}

// Exported for testing — allows clearing the activity log between tests
export function clearActivityLog() {
  activityLog.length = 0;
}

// B047: Shared helper — list non-hidden files with sizes from a directory
export async function listFiles(dirPath: string): Promise<{ filename: string; size: number }[]> {
  try {
    const entries = await fs.readdir(dirPath);
    const files: { filename: string; size: number }[] = [];
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      try {
        const stat = await fs.stat(path.join(dirPath, entry));
        if (stat.isFile()) files.push({ filename: entry, size: stat.size });
      } catch { /* skip */ }
    }
    return files;
  } catch {
    return []; // Directory doesn't exist
  }
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

  // GET /api/relay/activity — recent relay activity events
  router.get('/activity', (req, res) => {
    const projectCode = req.query.projectCode as string | undefined;
    const events = projectCode
      ? activityLog.filter(e => e.projectCode === projectCode)
      : activityLog;
    res.json({ success: true, events });
  });

  // GET /api/relay/files?subfolder=recordings&source=project|relay
  // source=project: files in local project dir (for push preview)
  // source=relay: files in relay dir (for collect preview)
  router.get('/files', async (req, res) => {
    try {
      const config = getConfig();
      const paths = getRelayPaths(config);
      if ('error' in paths) return res.json({ success: false, error: paths.error });

      const subfolder = (req.query.subfolder as string) || 'recordings';
      if (!RELAY_SUBFOLDERS.includes(subfolder as RelaySubfolder)) {
        return res.json({ success: false, error: `Invalid subfolder: ${subfolder}` });
      }

      const source = (req.query.source as string) || 'project';
      const baseDir = source === 'relay' ? paths.relayProjectDir : paths.projectDir;
      const targetDir = path.join(baseDir, subfolder);

      // B047: Use listFiles helper for base listing, then enrich with chapter/modified
      const baseFiles = await listFiles(targetDir);
      const files: RelayFileInfo[] = [];

      for (const bf of baseFiles) {
        const fullPath = path.join(targetDir, bf.filename);
        let modified = new Date().toISOString();
        try {
          const stat = await fs.stat(fullPath);
          modified = stat.mtime.toISOString();
        } catch { /* use default */ }

        // Extract chapter from naming convention: "01-1-intro.mov" → "01"
        const chapterMatch = bf.filename.match(/^(\d{2})-/);
        const chapter = chapterMatch ? chapterMatch[1] : '00';

        files.push({
          filename: bf.filename,
          size: bf.size,
          modified,
          chapter,
        });
      }

      // Sort by chapter, then filename
      files.sort((a, b) => a.chapter.localeCompare(b.chapter) || a.filename.localeCompare(b.filename));
      res.json({ success: true, files, subfolder });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // B047: GET /api/relay/divergence — compare local vs relay for active project
  router.get('/divergence', async (req, res) => {
    try {
      const config = getConfig();
      const paths = getRelayPaths(config);
      if ('error' in paths) return res.json({ success: false, error: paths.error });

      const subfolders: RelayDivergenceInfo[] = [];

      for (const subfolder of RELAY_SUBFOLDERS) {
        const localDir = path.join(paths.projectDir, subfolder);
        const relayDir = path.join(paths.relayProjectDir, subfolder);

        const localFiles = await listFiles(localDir);
        const relayFiles = await listFiles(relayDir);

        const localNames = new Set(localFiles.map(f => f.filename));
        const relayNames = new Set(relayFiles.map(f => f.filename));

        const localOnly = [...localNames].filter(n => !relayNames.has(n));
        const relayOnly = [...relayNames].filter(n => !localNames.has(n));

        let direction: RelayDivergenceInfo['direction'] = 'synced';
        if (localOnly.length > 0 && relayOnly.length > 0) direction = 'both';
        else if (localOnly.length > 0) direction = 'outgoing';
        else if (relayOnly.length > 0) direction = 'incoming';

        let folderExists = false;
        try { folderExists = (await fs.stat(localDir)).isDirectory(); } catch { /* noop */ }

        subfolders.push({
          subfolder,
          local: {
            fileCount: localFiles.length,
            totalSize: localFiles.reduce((s, f) => s + f.size, 0),
            files: localFiles.map(f => f.filename),
          },
          relay: {
            fileCount: relayFiles.length,
            totalSize: relayFiles.reduce((s, f) => s + f.size, 0),
            files: relayFiles.map(f => f.filename),
          },
          localOnly,
          relayOnly,
          direction,
          folderExists,
        });
      }

      res.json({ success: true, projectCode: paths.projectCode, subfolders });
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

      logRelayActivity({
        projectCode: paths.projectCode,
        subfolder,
        action: 'push',
        description: `Pushed ${subfolder} to relay`,
        timestamp: new Date().toISOString(),
      });

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

      logRelayActivity({
        projectCode: paths.projectCode,
        subfolder,
        action: 'collect',
        description: `Collected ${subfolder} from relay`,
        timestamp: new Date().toISOString(),
      });

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

      logRelayActivity({
        projectCode: paths.projectCode,
        subfolder: 'edit-2nd',
        action: 'promote',
        description: `Promoted ${filename} to final`,
        timestamp: new Date().toISOString(),
      });

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
