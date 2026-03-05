// FR-144: POEM WUI workflow intake
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import type { Config } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';

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

// Find first SRT file: s3-staging/post/ → final/ → recording-transcripts/
async function findSrt(projectDir: string): Promise<{ filePath: string; dir: string; name: string } | null> {
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
        return { filePath: path.join(dir, files[0]), dir, name: files[0] };
      }
    } catch { /* dir not found */ }
  }
  return null;
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

      const srtInfo = await findSrt(projectDir);
      const brandConfig = await loadBrandConfig(config.brandConfigPath);

      if (!srtInfo) {
        return res.json({
          success: true,
          projectFolder,
          transcriptFound: false,
          srtFile: null,
          transcript: null,
          brandConfigFound: brandConfig.found,
          brandConfigPath: brandConfig.path,
        });
      }

      const srtRaw = await fs.readFile(srtInfo.filePath, 'utf-8');
      const transcript = stripSrt(srtRaw);

      res.json({
        success: true,
        projectFolder,
        transcriptFound: true,
        srtFile: srtInfo.name,
        transcript,
        srtRaw,
        brandConfigFound: brandConfig.found,
        brandConfigPath: brandConfig.path,
        brandConfig: brandConfig.data,
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

      const srtInfo = await findSrt(projectDir);
      if (!srtInfo) {
        return res.json({ ok: false, error: 'No SRT file found to use as transcript' });
      }

      const raw = await fs.readFile(srtInfo.filePath, 'utf-8');
      const transcript = stripSrt(raw);

      const brandConfig = await loadBrandConfig(config.brandConfigPath);

      const payload = {
        workflowId: 'youtube-launch-optimizer',
        store: {
          projectFolder,
          transcript,
          chapterFolderNames: [],
          srt: raw,
          brandConfig: brandConfig.data,
        },
      };

      console.log(`[POEM WUI] Sending to ${poemWuiUrl}/api/workflow/intake`);

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
        return res.json({ ok: false, error: `POEM WUI not reachable — is it running on port ${port}?` });
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

  return router;
}
