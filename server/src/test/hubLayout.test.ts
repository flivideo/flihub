// Hub layout (David, 2026-09-22): server consumers read hub/recordings + hub/transcripts on a hub
// project and the top-level folders on a legacy one. Real temp dirs; no project data touched.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getProjectStatsRaw } from '../utils/projectStats.js';
import { calculateProjectDiskSize } from '../utils/diskUtils.js';
import type { Config } from '../../../shared/types.js';

let tmp: string;
const write = (rel: string, bytes = 10) => {
  const p = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, Buffer.alloc(bytes, 1));
};
const config = { projectStageOverrides: {} } as unknown as Config;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-server-'));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('project stats read the layout', () => {
  it('hub project: counts hub/recordings and matches hub/transcripts', async () => {
    write('hub/recordings/01-1-intro.mov');
    write('hub/recordings/01-2-more.mov');
    write('hub/transcripts/01-1-intro.txt');
    const raw = await getProjectStatsRaw(tmp, 'h1', config);
    expect(raw.totalFiles).toBe(2);
    expect(raw.transcriptSync.matched).toBe(1);
    expect(raw.transcriptSync.missingTranscripts).toEqual(['01-2-more']);
  });

  it('legacy project with a stray hub/: still reads top-level recordings/', async () => {
    write('recordings/01-1-intro.mov');
    write('recording-transcripts/01-1-intro.txt');
    fs.mkdirSync(path.join(tmp, 'hub'));
    const raw = await getProjectStatsRaw(tmp, 'l1', config);
    expect(raw.totalFiles).toBe(1);
    expect(raw.transcriptSync.matched).toBe(1);
  });
});

describe('disk size reads the layout', () => {
  it('hub project: rec = hub/recordings, and hub/ is itemized without double-counting it', async () => {
    write('hub/recordings/01-1-intro.mov', 1000);
    write('hub/transcripts/01-1-intro.txt', 50);
    const d = await calculateProjectDiskSize(tmp);
    expect(d.rec).toBe(1000);
    expect(d.other).toBe(50);
    expect(d.detail?.other).toEqual({ hub: 50 });
    expect(d.detail?.recTopFiles.map((f) => f.name)).toEqual(['01-1-intro.mov']);
  });

  it('legacy project: rec = recordings/', async () => {
    write('recordings/01-1-intro.mov', 700);
    const d = await calculateProjectDiskSize(tmp);
    expect(d.rec).toBe(700);
    expect(d.detail?.other).toEqual({});
  });
});
