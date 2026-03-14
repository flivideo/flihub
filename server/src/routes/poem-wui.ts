// FR-144: POEM WUI workflow intake
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import type { Config } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';
import { getProjectPaths } from '../../../shared/paths.js';
import { readDirSafe } from '../utils/filesystem.js';

// Strip SRT formatting: same logic as FR-143 srt-text endpoint
function stripSrt(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\d+$/.test(trimmed)) continue; // sequence number
    if (/^\d{2}:\d{2}:\d{2},\d{1,3} --> \d{2}:\d{2}:\d{2},\d{1,3}$/.test(trimmed)) continue; // timestamp
    result.push(trimmed);
  }
  return result.join('\n');
}

// Bundled fallback brand config (committed to repo, works on any machine)
const BUNDLED_BRAND_CONFIG = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../brand-config.json'
);

// Map raw brand-config.json shape → WUI seed data contract shape
function mapBrandConfig(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const ctas = (r.ctas ?? {}) as Record<string, unknown>;
  const descTpl = (r.descriptionTemplate ?? {}) as Record<string, unknown>;
  return {
    primaryCta:      ctas.primaryCta ?? null,
    foldCta:         ctas.foldCta ?? null,
    affiliates:      r.affiliates ?? [],
    socialLinks:     r.socialLinks ?? {},
    legalDisclosure: descTpl.legalDisclosure ?? '',
    relatedVideos:   [],
  };
}

// Load brand config: try configured path first, then fall back to bundled file
async function loadBrandConfig(configPath: string | undefined): Promise<{ data: unknown; found: boolean; path: string | null }> {
  const candidates = configPath ? [configPath, BUNDLED_BRAND_CONFIG] : [BUNDLED_BRAND_CONFIG];
  for (const p of candidates) {
    try {
      const raw = await fs.readFile(p, 'utf-8');
      return { data: mapBrandConfig(JSON.parse(raw)), found: true, path: p };
    } catch { /* try next */ }
  }
  return { data: null, found: false, path: configPath ?? null };
}

// Read .awb.json metadata from project root
async function readAwbJson(projectDir: string): Promise<{
  exists: boolean;
  savedAt: string | null;
  currentStepId: string | null;
  sizeKb: number | null;
  fullPath: string;
}> {
  const fullPath = path.join(projectDir, '.awb.json');
  try {
    const [stat, raw] = await Promise.all([fs.stat(fullPath), fs.readFile(fullPath, 'utf-8')]);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      exists: true,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null,
      currentStepId: typeof parsed.currentStepId === 'string' ? parsed.currentStepId : null,
      sizeKb: Math.round(stat.size / 1024),
      fullPath,
    };
  } catch {
    return { exists: false, savedAt: null, currentStepId: null, sizeKb: null, fullPath };
  }
}

// Extract first ~50 words from plain text (strips SRT formatting first)
function firstWords(content: string, count = 50): string {
  const plain = stripSrt(content);
  return plain.split(/\s+/).filter(Boolean).slice(0, count).join(' ');
}

// Find first transcript (.txt preferred, .srt fallback) for a chapter prefix
async function readChapterTranscript(transcriptsDir: string, chapterPrefix: string): Promise<string | null> {
  try {
    const files = await readDirSafe(transcriptsDir);
    const prefix = `${chapterPrefix}-`;
    // .txt files only, skip -chapter.txt combined files
    const txt = files.find((f) => f.startsWith(prefix) && f.endsWith('.txt') && !f.endsWith('-chapter.txt'));
    if (txt) return fs.readFile(path.join(transcriptsDir, txt), 'utf-8');
    // fallback to .srt
    const srt = files.find((f) => f.startsWith(prefix) && f.endsWith('.srt'));
    if (srt) return fs.readFile(path.join(transcriptsDir, srt), 'utf-8');
  } catch { /* dir not found */ }
  return null;
}

// Find ALL SRT files: s3-staging/post/ → final/ → recording-transcripts/
// Uses the first directory that has any SRTs, concatenates all of them.
async function findAllSrts(projectDir: string): Promise<{
  names: string[];
  rawContent: string;
  transcript: string;
} | null> {
  const scanDirs = [
    path.join(projectDir, 's3-staging', 'post'),
    path.join(projectDir, 'final'),
    path.join(projectDir, 'recording-transcripts'),
  ];
  for (const dir of scanDirs) {
    try {
      const files = (await fs.readdir(dir))
        .filter((f) => !f.startsWith('.') && f.endsWith('.srt'))
        .sort();
      if (files.length > 0) {
        const contents = await Promise.all(
          files.map((f) => fs.readFile(path.join(dir, f), 'utf-8'))
        );
        const rawContent = contents.join('\n');
        const transcript = contents.map(stripSrt).join('\n');
        return { names: files, rawContent, transcript };
      }
    } catch { /* dir not found */ }
  }
  return null;
}

// Build fliHubChapters array: scan recordings dirs, pull first 50 words from each chapter transcript
async function buildFliHubChapters(projectDir: string): Promise<{ folderNumber: string; chapterName: string; firstWords: string | null }[]> {
  const paths = getProjectPaths(projectDir);
  const chapterMap = new Map<string, string>();
  for (const dir of [paths.recordings, paths.safe]) {
    const files = (await readDirSafe(dir)).sort();
    for (const file of files) {
      const match = file.match(/^(\d{2})-\d+-([a-z][a-z0-9-]*?)(?:-[A-Z]+)*\.[a-z0-9]+$/);
      if (match) {
        const [, prefix, name] = match;
        if (!chapterMap.has(prefix)) chapterMap.set(prefix, name);
      }
    }
  }
  const chapterPrefixes = [...chapterMap.keys()].sort();
  return Promise.all(
    chapterPrefixes.map(async (prefix) => {
      const content = await readChapterTranscript(paths.transcripts, prefix);
      return {
        folderNumber: prefix,
        chapterName: chapterMap.get(prefix) ?? '',
        firstWords: content ? firstWords(content) : null,
      };
    })
  );
}

export function createPoemWuiRoutes(getConfig: () => Config) {
  const router = express.Router();

  // GET /api/poem-wui/status — find SRT, return stripped text + metadata
  router.get('/status', async (req, res) => {
    try {
      const config = getConfig();
      if (!config.projectDirectory) {
        return res.json({ success: false, error: 'No project selected' });
      }

      const projectDir = expandPath(config.projectDirectory);
      const projectFolder = path.basename(projectDir);

      const [srtInfo, brandConfig, awbJson, fliHubChapters] = await Promise.all([
        findAllSrts(projectDir),
        loadBrandConfig(config.brandConfigPath),
        readAwbJson(projectDir),
        buildFliHubChapters(projectDir),
      ]);

      if (!srtInfo) {
        return res.json({
          success: true,
          projectFolder,
          transcriptFound: false,
          srtFile: null,
          srtFiles: [],
          transcript: null,
          brandConfigFound: brandConfig.found,
          brandConfigPath: brandConfig.path,
          awbJson,
        });
      }

      res.json({
        success: true,
        projectFolder,
        transcriptFound: true,
        srtFile: srtInfo.names.length === 1 ? srtInfo.names[0] : `${srtInfo.names.length} files`,
        srtFiles: srtInfo.names,
        transcript: srtInfo.transcript,
        srtRaw: srtInfo.rawContent,
        brandConfigFound: brandConfig.found,
        brandConfigPath: brandConfig.path,
        brandConfig: brandConfig.data,
        fliHubChapters,
        awbJson,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // POST /api/poem-wui/send — send transcript to POEM WUI
  router.post('/send', async (req, res) => {
    try {
      const config = getConfig();
      if (!config.projectDirectory) {
        return res.json({ ok: false, error: 'No project selected' });
      }

      const projectDir = expandPath(config.projectDirectory);
      const projectFolder = path.basename(projectDir);
      const poemWuiUrl = config.poemWuiUrl || 'http://localhost:3001';

      const [srtInfo, brandConfig, fliHubChapters] = await Promise.all([
        findAllSrts(projectDir),
        loadBrandConfig(config.brandConfigPath),
        buildFliHubChapters(projectDir),
      ]);

      if (!srtInfo) {
        return res.json({ ok: false, error: 'No SRT file found to use as transcript' });
      }

      const payload = {
        workflowId: 'youtube-launch-optimizer',
        store: {
          projectFolder,
          transcript: srtInfo.transcript,
          fliHubChapters,
          srtContent: srtInfo.rawContent,
          brandConfig: brandConfig.data,
        },
      };

      console.log(`[AWB] Sending to ${poemWuiUrl}/api/workflow/intake`);

      let poemRes: Response;
      try {
        poemRes = await fetch(`${poemWuiUrl}/api/workflow/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        const portMatch = poemWuiUrl.match(/:(\d+)/);
        const port = portMatch ? portMatch[1] : '3001';
        return res.json({ ok: false, error: `AWB not reachable — is it running on port ${port}?` });
      }

      const poemBody = await poemRes.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (poemBody.ok === false) {
        return res.json({ ok: false, error: `POEM WUI returned: ${poemBody.error || 'unknown error'}` });
      }

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // POST /api/poem-wui/resume — load saved .awb.json back into AWB and open browser
  router.post('/resume', async (req, res) => {
    try {
      const config = getConfig();
      if (!config.projectDirectory) {
        return res.json({ ok: false, error: 'No project selected' });
      }

      const projectDir = expandPath(config.projectDirectory);
      const awbJsonPath = path.join(projectDir, '.awb.json');

      let awbJson: Record<string, unknown>;
      try {
        const raw = await fs.readFile(awbJsonPath, 'utf-8');
        awbJson = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return res.json({ ok: false, error: '.awb.json not found in project directory' });
      }

      const poemWuiUrl = config.poemWuiUrl || 'http://localhost:3001';

      try {
        await fetch(`${poemWuiUrl}/api/workflow/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(awbJson),
        });
      } catch {
        const portMatch = poemWuiUrl.match(/:(\d+)/);
        const port = portMatch ? portMatch[1] : '3001';
        return res.json({ ok: false, error: `AWB not reachable — is it running on port ${port}?` });
      }

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // GET /api/poem-wui/chapter-data — chapter list with firstWords from raw transcripts
  router.get('/chapter-data', async (req, res) => {
    try {
      const config = getConfig();
      if (!config.projectDirectory) {
        return res.json({ success: false, error: 'No project selected' });
      }

      const projectDir = expandPath(config.projectDirectory);
      const chapters = await buildFliHubChapters(projectDir);
      res.json({ success: true, chapters });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  return router;
}
