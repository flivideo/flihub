// FR-144: POEM WUI workflow intake
import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import type { Config } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';
import { findAllSrts, loadBrandConfig, buildFliHubChapters, firstWords } from '../utils/poemWuiUtils.js';

export { firstWords };

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
      const poemWuiUrl = config.poemWuiUrl || 'http://localhost:5041';

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
        const port = portMatch ? portMatch[1] : '5041';
        return res.json({ ok: false, error: `AWB not reachable — is it running on port ${port}?` });
      }

      const poemBody = await poemRes.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (poemBody.ok === false) {
        return res.json({ ok: false, error: `POEM WUI returned: ${poemBody.error || 'unknown error'}` });
      }

      const successBody: { ok: boolean; brandConfigError?: string } = { ok: true };
      if (brandConfig.error) {
        successBody.brandConfigError = brandConfig.error;
      }
      res.json(successBody);
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

      const poemWuiUrl = config.poemWuiUrl || 'http://localhost:5041';

      try {
        await fetch(`${poemWuiUrl}/api/workflow/intake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(awbJson),
        });
      } catch {
        const portMatch = poemWuiUrl.match(/:(\d+)/);
        const port = portMatch ? portMatch[1] : '5041';
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
