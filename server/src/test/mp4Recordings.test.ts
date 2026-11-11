// .mp4 takes are first-class recordings (2026-11-11). The watcher accepted .mp4, but listing,
// counting, numbering, transcripts and every rename path assumed .mov: a mixed folder showed half
// its takes, and a rename turned `x.mp4` into a file NAMED `.mov` (or `x.mp4.mov`).
// Every test runs on a TEMP project and asserts on the disk, not only on the response.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRoutes } from '../routes/index.js';
import { createManageRoutes } from '../routes/manage.js';
import { createProjectRoutes } from '../routes/projects.js';
import { createTranscriptionRoutes } from '../routes/transcriptions.js';
import { createSegmentRoutes } from '../routes/segments.js';
import { createQueryRoutes } from '../routes/query/index.js';
import { countRecordingFiles, getTranscriptSyncStatus, listRecordingFiles } from '../utils/scanning.js';
import { groupRecordingsByChapter } from '../utils/chapterRecording.js';
import { needsMigration } from '../utils/safeMigration.js';
import { getProjectPaths, type ProjectPaths } from '../../../shared/paths.js';
import type { Config, FileInfo } from '../../../shared/types.js';
import type { FlitoolsClient, FlitoolsJobView } from '../utils/flitoolsClient.js';

const MOV = ['01-1-intro.mov', '01-2-setup.mov', '01-3-demo.mov'];
const MP4 = ['01-4-walkthrough.mp4', '01-5-recap.mp4', '01-6-outro.mp4'];
const MIXED = [...MOV, ...MP4];

let root: string;
let project: string;
let inbox: string;
let paths: ProjectPaths;
let config: Config;

/** Write a file; `ageMs` back-dates it so a transcript written later counts as fresh. */
function write(file: string, content = path.basename(file), ageMs = 0) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  if (ageMs) {
    const t = new Date(Date.now() - ageMs);
    fs.utimesSync(file, t, t);
  }
}

/** A transcript set (.txt last, newest) for a take's base name. */
function transcript(base: string) {
  for (const ext of ['.srt', '.json', '.txt']) write(path.join(paths.transcripts, `${base}${ext}`));
}

const recordingsOnDisk = () => fs.readdirSync(paths.recordings).filter((f) => !f.startsWith('.')).sort();
const transcriptsOnDisk = () =>
  fs.existsSync(paths.transcripts) ? fs.readdirSync(paths.transcripts).filter((f) => f.includes('.')).sort() : [];

/** No builder may ever produce a stacked or swapped extension. */
function expectNoCorruptNames(names: string[]) {
  for (const n of names) expect(n).not.toMatch(/\.(mov|mp4)\.(mov|mp4|txt|srt|json)$/i);
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'mp4-recordings-'));
  project = path.join(root, 'p01-test');
  inbox = path.join(root, 'inbox');
  fs.mkdirSync(path.join(project, 'recordings'), { recursive: true });
  fs.mkdirSync(inbox, { recursive: true });
  paths = getProjectPaths(project);
  config = {
    watchDirectory: inbox,
    projectDirectory: project,
    projectsRootDirectory: root,
    fileExtensions: ['.mov', '.mp4'],
    availableTags: ['CTA'],
    commonNames: [],
    imageSourceDirectory: inbox,
  } as unknown as Config;
  for (const f of MIXED) write(path.join(paths.recordings, f), f, 600_000);
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

function mainApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', createRoutes(new Map<string, FileInfo>(), config, (c) => Object.assign(config, c)));
  return app;
}

describe('a mixed folder (3 .mov + 3 .mp4) is six recordings', () => {
  it('GET /api/recordings lists all 6, with their own extensions', async () => {
    const res = await request(mainApp()).get('/api/recordings').expect(200);
    const names = (res.body.recordings as { filename: string }[]).map((r) => r.filename).sort();
    expect(names).toEqual([...MIXED].sort());
  });

  it('the query API lists all 6 (recordings and export)', async () => {
    const app = express();
    app.use('/api/query', createQueryRoutes(() => config));
    const rec = await request(app).get('/api/query/projects/p01-test/recordings').expect(200);
    expect((rec.body.recordings as { filename: string }[]).map((r) => r.filename).sort()).toEqual([...MIXED].sort());
    const exp = await request(app).get('/api/query/projects/p01-test/export?include=recordings').expect(200);
    expect((exp.body.recordings as { filename: string }[]).map((r) => r.filename).sort()).toEqual([...MIXED].sort());
  });

  it('counts 6 (project stats / query counter) and lists 6', async () => {
    expect(await countRecordingFiles(paths.recordings)).toBe(6);
    expect((await listRecordingFiles(paths.recordings)).sort()).toEqual([...MIXED].sort());
  });

  it('the next number after six takes is 7', async () => {
    const res = await request(mainApp()).get('/api/suggested-naming').expect(200);
    expect(res.body).toMatchObject({ chapter: '01', sequence: '7' });
    expect(res.body.existingFiles).toHaveLength(6);
  });

  it('groups all 6 into chapter 01 for the chapter tools', async () => {
    const chapters = await groupRecordingsByChapter(paths.recordings);
    expect(chapters.get('01')?.segments.map((s) => s.filename).sort()).toEqual([...MIXED].sort());
  });

  it('marks safe by chapter: the .mp4 takes are included', async () => {
    const res = await request(mainApp()).post('/api/recordings/safe').send({ chapter: '01' }).expect(200);
    expect(res.body.moved.sort()).toEqual([...MIXED].sort());
  });

  it('parks by chapter: the .mp4 takes are included', async () => {
    const res = await request(mainApp()).post('/api/recordings/park').send({ chapter: '01' }).expect(200);
    expect(res.body.parked.sort()).toEqual([...MIXED].sort());
  });
});

describe('transcripts of .mp4 takes match their take', () => {
  beforeEach(() => {
    transcript('01-1-intro');
    transcript('01-4-walkthrough');
  });

  it('getTranscriptSyncStatus: no orphans, the .mp4 transcript is matched, the rest are missing', async () => {
    const s = await getTranscriptSyncStatus(paths.recordings, paths.transcripts);
    expect(s.orphanedTranscripts).toEqual([]);
    expect(s.matched).toBe(2);
    expect(s.missingTranscripts.sort()).toEqual(['01-2-setup', '01-3-demo', '01-5-recap', '01-6-outro']);
  });

  it('GET /api/projects/:code/transcript-sync: no orphans, and it reports the real filename of each take', async () => {
    const app = express();
    app.use('/api/projects', createProjectRoutes(() => config, () => undefined));
    const res = await request(app).get('/api/projects/p01-test/transcript-sync').expect(200);
    expect(res.body.orphanedTranscripts).toEqual([]);
    expect(res.body.matched.sort()).toEqual(['01-1-intro', '01-4-walkthrough']);
    expect(res.body.recordingFilenames['01-5-recap']).toBe('01-5-recap.mp4');
    expect(res.body.recordingFilenames['01-2-setup']).toBe('01-2-setup.mov');
  });
});

describe('transcription queue sees .mp4 takes', () => {
  /** FliTools stand-in: writes <base>.txt next to the take's project, like the real save. */
  function fakeFlitools() {
    const submitted: string[] = [];
    const client: FlitoolsClient = {
      baseUrl: 'http://fake-flitools',
      async submit(videoPath) {
        submitted.push(path.basename(videoPath));
        const base = path.basename(videoPath, path.extname(videoPath));
        const txt = path.join(paths.transcripts, `${base}.txt`);
        write(txt, 'words');
        return { id: 'j1', status: 'done', pct: 100, result: { reused: null, files: { txt }, trashed: [] } } as unknown as FlitoolsJobView;
      },
      async job() {
        throw new Error('not polled');
      },
    };
    return { client, submitted };
  }
  const transcriptionApp = (client: FlitoolsClient) => {
    const app = express();
    app.use(express.json());
    const io = { emit: () => undefined } as never;
    const routes = createTranscriptionRoutes(() => config, io, client, { sleep: async () => undefined });
    app.use('/api/transcriptions', routes.router);
    return app;
  };

  it('pending-count counts all 6 takes and the 5 without a transcript', async () => {
    transcript('01-4-walkthrough');
    const res = await request(transcriptionApp(fakeFlitools().client)).get('/api/transcriptions/pending-count').expect(200);
    expect(res.body).toEqual({ pendingCount: 5, totalCount: 6 });
  });

  it('queue-all queues the .mp4 takes too, by their real filename', async () => {
    transcript('01-1-intro');
    const { client, submitted } = fakeFlitools();
    const res = await request(transcriptionApp(client))
      .post('/api/transcriptions/queue-all')
      .send({ scope: 'project' })
      .expect(200);
    expect(res.body.queued.sort()).toEqual(['01-2-setup.mov', '01-3-demo.mov', ...MP4].sort());
    expect(res.body.skipped).toEqual(['01-1-intro.mov']);
    for (let i = 0; i < 50 && submitted.length < 5; i++) await new Promise((r) => setTimeout(r, 10));
    expect(submitted.sort()).toEqual(['01-2-setup.mov', '01-3-demo.mov', ...MP4].sort());
  });

  it('a stale transcript of an .mp4 take (older than the take) is not reported complete', async () => {
    transcript('01-5-recap');
    const t = new Date(Date.now() - 3_600_000); // transcript older than the take
    for (const ext of ['.txt', '.srt', '.json']) fs.utimesSync(path.join(paths.transcripts, `01-5-recap${ext}`), t, t);
    const res = await request(transcriptionApp(fakeFlitools().client))
      .get('/api/transcriptions/status/01-5-recap.mp4')
      .expect(200);
    expect(res.body.status).toBe('none');
    expect(res.body.transcriptPath ?? null).toBeNull();
  });
});

describe('renaming an .mp4 keeps it an .mp4', () => {
  it('POST /api/rename (inline rename) keeps .mp4 and carries its transcripts', async () => {
    transcript('01-5-recap');
    await request(mainApp())
      .post('/api/rename')
      .send({ originalPath: path.join(paths.recordings, '01-5-recap.mp4'), chapter: '01', sequence: '5', name: 'summary', tags: [] })
      .expect(200);
    expect(recordingsOnDisk()).toContain('01-5-summary.mp4');
    expect(recordingsOnDisk()).not.toContain('01-5-summary.mov');
    expect(transcriptsOnDisk()).toContain('01-5-summary.txt');
    expectNoCorruptNames([...recordingsOnDisk(), ...transcriptsOnDisk()]);
  });

  it('POST /api/rename (promote from the inbox) keeps .mp4', async () => {
    const src = path.join(inbox, 'processed take.mp4');
    write(src);
    await request(mainApp())
      .post('/api/rename')
      .send({ originalPath: src, chapter: '02', sequence: '1', name: 'demo', tags: ['CTA'] })
      .expect(200);
    expect(recordingsOnDisk()).toContain('02-1-demo-CTA.mp4');
  });

  it('refuses a rename onto the same take name in the other container (shared transcripts)', async () => {
    const res = await request(mainApp())
      .post('/api/rename')
      .send({ originalPath: path.join(paths.recordings, '01-3-demo.mov'), chapter: '01', sequence: '4', name: 'walkthrough', tags: [] })
      .expect(409);
    expect(res.body.error).toContain('01-4-walkthrough.mp4');
    expect(recordingsOnDisk()).toEqual([...MIXED].sort());
  });

  it('chapter label rename (/recordings/rename-chapter) keeps each take its own extension', async () => {
    fs.renameSync(path.join(paths.recordings, '01-6-outro.mp4'), path.join(paths.recordings, '01-6-demo.mp4'));
    await request(mainApp())
      .post('/api/recordings/rename-chapter')
      .send({ chapter: '01', currentLabel: 'demo', newLabel: 'showcase' })
      .expect(200);
    expect(recordingsOnDisk()).toEqual(expect.arrayContaining(['01-3-showcase.mov', '01-6-showcase.mp4']));
    expectNoCorruptNames(recordingsOnDisk());
  });
});

describe('manage-panel bulk operations keep each take its extension', () => {
  const manageApp = () => {
    const app = express();
    app.use(express.json());
    const io = { emit: () => undefined } as never;
    app.use('/api/manage', createManageRoutes(() => config, io, undefined, () => null, () => []));
    return app;
  };

  it('rename-chapter 01 → 02: no .mov.mov / .mp4.mov, extensions kept', async () => {
    const res = await request(manageApp()).post('/api/manage/rename-chapter').send({ oldChapter: '01', newChapter: '02' });
    expect(res.status).toBe(200);
    expect(recordingsOnDisk()).toEqual(MIXED.map((f) => f.replace(/^01-/, '02-')).sort());
  });

  it('swap-chapters: extensions kept through the temp chapter', async () => {
    fs.renameSync(path.join(paths.recordings, '01-6-outro.mp4'), path.join(paths.recordings, '02-1-outro.mp4'));
    fs.renameSync(path.join(paths.recordings, '01-3-demo.mov'), path.join(paths.recordings, '02-2-demo.mov'));
    await request(manageApp()).post('/api/manage/swap-chapters').send({ chapter1: '01', chapter2: '02' }).expect(200);
    expect(recordingsOnDisk()).toEqual(
      ['02-1-intro.mov', '02-2-setup.mov', '02-4-walkthrough.mp4', '02-5-recap.mp4', '01-1-outro.mp4', '01-2-demo.mov'].sort()
    );
  });

  it('renumber-chapter closes gaps and keeps .mp4', async () => {
    fs.rmSync(path.join(paths.recordings, '01-2-setup.mov'));
    await request(manageApp()).post('/api/manage/renumber-chapter').send({ chapter: '01' }).expect(200);
    expect(recordingsOnDisk()).toEqual(
      ['01-1-intro.mov', '01-2-demo.mov', '01-3-walkthrough.mp4', '01-4-recap.mp4', '01-5-outro.mp4'].sort()
    );
  });

  it('bulk-rename keeps each file its own extension', async () => {
    await request(manageApp())
      .post('/api/manage/bulk-rename')
      .send({ files: ['01-3-demo.mov', '01-4-walkthrough.mp4'], label: 'tour', sequenceMode: 'preserve' })
      .expect(200);
    expect(recordingsOnDisk()).toEqual(expect.arrayContaining(['01-3-tour.mov', '01-4-tour.mp4']));
    expectNoCorruptNames(recordingsOnDisk());
  });

  it('split-chapter cascades and moves with extensions kept', async () => {
    write(path.join(paths.recordings, '02-1-next.mp4'), 'x', 600_000);
    const res = await request(manageApp()).post('/api/manage/split-chapter').send({ chapter: '01', splitAtSequence: 4 });
    expect(res.status).toBe(200);
    expect(recordingsOnDisk()).toEqual(
      ['01-1-intro.mov', '01-2-setup.mov', '01-3-demo.mov', '02-1-walkthrough.mp4', '02-2-recap.mp4', '02-3-outro.mp4', '03-1-next.mp4'].sort()
    );
  });
});

describe('segment ops (CT-0107) keep the SOURCE container', () => {
  const segApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/segments', createSegmentRoutes(() => config, undefined, () => undefined, () => null, () => []));
    return app;
  };

  it('replace with an .mp4 source (no new name) lands as .mp4 under the old name', async () => {
    write(path.join(inbox, 'take.mp4'), 'NEW');
    await request(segApp())
      .post('/api/segments/op')
      .send({ mode: 'replace', chapter: '01', segment: 2, source: path.join(inbox, 'take.mp4') })
      .expect(200);
    expect(fs.readFileSync(path.join(paths.recordings, '01-2-setup.mp4'), 'utf8')).toBe('NEW');
    expect(recordingsOnDisk()).not.toContain('01-2-setup.mov');
  });

  it('insert with an .mp4 source lands as .mp4; the shifted .mp4 takes stay .mp4', async () => {
    write(path.join(inbox, 'take.mp4'), 'NEW');
    await request(segApp())
      .post('/api/segments/op')
      .send({ mode: 'insert', chapter: '01', before: 5, source: path.join(inbox, 'take.mp4'), name: 'aside' })
      .expect(200);
    expect(recordingsOnDisk()).toEqual(
      [...MOV, '01-4-walkthrough.mp4', '01-5-aside.mp4', '01-6-recap.mp4', '01-7-outro.mp4'].sort()
    );
  });

  it('send-in of mixed sources keeps each its own container', async () => {
    write(path.join(inbox, 'a.mov'));
    write(path.join(inbox, 'b.mp4'));
    await request(segApp())
      .post('/api/segments/op')
      .send({ mode: 'send', chapter: '02', sources: [path.join(inbox, 'a.mov'), path.join(inbox, 'b.mp4')], name: 'extra' })
      .expect(200);
    expect(recordingsOnDisk()).toEqual(expect.arrayContaining(['02-1-extra.mov', '02-2-extra.mp4']));
    expectNoCorruptNames(recordingsOnDisk());
  });
});

describe('-safe migration sees .mp4', () => {
  it('a -safe folder holding only an .mp4 still needs migrating', async () => {
    write(path.join(paths.safe, '01-9-kept.mp4'));
    expect(await needsMigration(project)).toBe(true);
  });
});
