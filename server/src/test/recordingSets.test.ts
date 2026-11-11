// Recording sets (fli-core v0.38.0): one project holds several sets of takes,
// hub/sets/<set>/{recordings,transcripts}/, and FliHub works in one ACTIVE set at a time.
// Two fixtures, both TEMP folders (never the real video-projects tree):
//   - a legacy project (top-level recordings/) — must behave exactly as before sets;
//   - a two-set project whose sets both hold `01-1-intro` (one .mov, one .mp4).
// Every test asserts on the disk, not only on the response.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRoutes } from '../routes/index.js';
import { createManageRoutes } from '../routes/manage.js';
import { createProjectRoutes } from '../routes/projects.js';
import { createSegmentRoutes } from '../routes/segments.js';
import { createSetRoutes, NOT_A_SET_PROJECT } from '../routes/sets.js';
import { createStateRoutes } from '../routes/state.js';
import { createVideoRoutes } from '../routes/video.js';
import { getProjectStatsRaw } from '../utils/projectStats.js';
import { readProjectState, setRecordingParked, writeProjectState } from '../utils/projectState.js';
import { trashTranscriptsFor } from '../utils/transcriptFiles.js';
import { getStorageTree, heavySubfoldersFor } from '../utils/storageTree.js';
import {
  activeSetSync,
  allSetPaths,
  getProjectPaths,
  pathsForRecording,
  projectDirFromRecordingPath,
  writeActiveSetSync,
} from '../../../shared/paths.js';
import type { Config, FileInfo } from '../../../shared/types.js';

let root: string;
let inbox: string;
let legacy: string;
let sets: string;
let config: Config;
let emitted: string[];

function write(file: string, content = path.basename(file), ageMs = 600_000) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  if (ageMs) {
    const t = new Date(Date.now() - ageMs);
    fs.utimesSync(file, t, t);
  }
}
const ls = (dir: string) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => !f.startsWith('.')).sort() : []);
const setRec = (set: string) => path.join(sets, 'hub', 'sets', set, 'recordings');
const setTx = (set: string) => path.join(sets, 'hub', 'sets', set, 'transcripts');

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'recording-sets-'));
  inbox = path.join(root, 'inbox');
  fs.mkdirSync(inbox, { recursive: true });

  legacy = path.join(root, 'p01-legacy');
  for (const f of ['01-1-intro.mov', '01-2-setup.mov', '02-1-demo.mp4'])
    write(path.join(legacy, 'recordings', f));
  write(path.join(legacy, 'recording-transcripts', '01-1-intro.txt'), 'x', 0);
  fs.writeFileSync(
    path.join(legacy, '.flihub-state.json'),
    JSON.stringify({ version: 1, recordings: { '01-2-setup.mov': { parked: true } } })
  );

  sets = path.join(root, 'p02-sets');
  write(
    path.join(sets, 'hub', 'sets.json'),
    JSON.stringify({
      sets: [
        { id: 'demo', title: 'Demo', role: 'part' },
        { id: 'story', title: 'Story', role: 'part' },
      ],
    }),
    0
  );
  write(path.join(setRec('demo'), '01-1-intro.mov'), 'DEMO');
  write(path.join(setRec('demo'), '01-2-setup.mov'), 'DEMO2');
  write(path.join(setRec('story'), '01-1-intro.mp4'), 'STORY');
  write(path.join(setRec('story'), '02-1-hook.mov'), 'STORY2');
  write(path.join(setTx('story'), '01-1-intro.txt'), 'story words', 0);

  emitted = [];
  config = {
    watchDirectory: inbox,
    projectDirectory: sets,
    projectsRootDirectory: root,
    fileExtensions: ['.mov', '.mp4'],
    availableTags: ['CTA'],
    commonNames: [],
    imageSourceDirectory: inbox,
  } as unknown as Config;
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const io = { emit: (e: string) => emitted.push(e) } as never;
function app(restarted: string[] = []) {
  const a = express();
  a.use(express.json());
  a.use('/api/sets', createSetRoutes(() => config, io, (d) => restarted.push(d)));
  a.use('/api/video', createVideoRoutes(() => config));
  a.use('/api/manage', createManageRoutes(() => config, io, undefined, () => null, () => []));
  a.use('/api/segments', createSegmentRoutes(() => config, undefined, () => undefined, () => null, () => []));
  a.use('/api/projects', createProjectRoutes(() => config, (c) => Object.assign(config, c)));
  a.use('/api', createStateRoutes(() => config, io));
  a.use('/api', createRoutes(new Map<string, FileInfo>(), config, (c) => Object.assign(config, c)));
  return a;
}
const recordingNames = async (a: express.Express) =>
  ((await request(a).get('/api/recordings').expect(200)).body.recordings as { filename: string }[])
    .map((r) => r.filename)
    .sort();

describe('a legacy project is unchanged by sets', () => {
  beforeEach(() => {
    config.projectDirectory = legacy;
  });

  it('paths are the pre-sets paths, with no set', () => {
    const p = getProjectPaths(legacy);
    expect(p.set).toBeNull();
    expect(p.recordings).toBe(path.join(legacy, 'recordings'));
    expect(p.transcripts).toBe(path.join(legacy, 'recording-transcripts'));
    expect(p.stateFile).toBe(path.join(legacy, '.flihub-state.json'));
    expect(p.chapterOverrides).toBe(path.join(legacy, '.chapter-overrides.json'));
    expect(activeSetSync(legacy)).toBeNull();
    expect(allSetPaths(legacy)).toEqual([getProjectPaths(legacy)]);
  });

  it('lists, counts and reads state exactly as before', async () => {
    expect(await recordingNames(app())).toEqual(['01-1-intro.mov', '01-2-setup.mov', '02-1-demo.mp4']);
    const stats = await getProjectStatsRaw(legacy, 'p01', config);
    expect(stats.totalFiles).toBe(3);
    expect(stats.chapterCount).toBe(2);
    expect(stats.transcriptSync).toEqual({
      matched: 1,
      missingTranscripts: ['01-2-setup', '02-1-demo'],
      orphanedTranscripts: [],
    });
    expect((await readProjectState(legacy)).recordings['01-2-setup.mov']?.parked).toBe(true);
  });

  it('title, ships and dictionary stay in the one project file, beside the recording keys', async () => {
    const a = app();
    await request(a).put('/api/projects/p01/title').send({ title: 'Legacy Video' }).expect(200);
    await request(a).patch('/api/projects/p01/state/dictionary').send({ words: ['word'] }).expect(200);
    const onDisk = JSON.parse(fs.readFileSync(path.join(legacy, '.flihub-state.json'), 'utf8'));
    expect(onDisk).toMatchObject({ title: 'Legacy Video', glingDictionary: ['word'] });
    expect(onDisk.recordings['01-2-setup.mov']).toEqual({ parked: true });
  });

  it('GET /api/sets says no sets; New set and switching are refused with the FliStudio line, and nothing is written', async () => {
    const a = app();
    expect((await request(a).get('/api/sets').expect(200)).body).toEqual({
      success: true,
      hasSets: false,
      active: null,
      sets: [],
    });
    const add = await request(a).post('/api/sets').send({ id: 'demo' }).expect(409);
    expect(add.body).toMatchObject({ success: false, reason: 'not-a-set-project', error: NOT_A_SET_PROJECT });
    await request(a).post('/api/sets/active').send({ set: 'demo' }).expect(409);
    expect(fs.existsSync(path.join(legacy, 'hub'))).toBe(false);
  });

  it('a new take still lands in recordings/ with the old numbering', async () => {
    const src = path.join(inbox, 'take.mov');
    write(src, 'NEW', 0);
    const next = (await request(app()).get('/api/suggested-naming').expect(200)).body;
    expect(next).toMatchObject({ chapter: '02', sequence: '2' });
    await request(app())
      .post('/api/rename')
      .send({ originalPath: src, chapter: '02', sequence: '2', name: 'more', tags: [] })
      .expect(200);
    expect(ls(path.join(legacy, 'recordings'))).toContain('02-2-more.mov');
  });
});

describe('a two-set project', () => {
  it('lists its sets in order with takes and length; the first set is active', async () => {
    const res = (await request(app()).get('/api/sets').expect(200)).body;
    expect(res.hasSets).toBe(true);
    expect(res.active).toBe('demo');
    expect(
      res.sets.map((s: { id: string; title: string; takes: number; chapters: number; transcribed: number }) => [
        s.id,
        s.title,
        s.takes,
        s.chapters,
        s.transcribed,
      ])
    ).toEqual([
      ['demo', 'Demo', 2, 1, 0],
      ['story', 'Story', 2, 2, 1],
    ]);
    for (const s of res.sets) expect(typeof s.durationSec).toBe('number');
  });

  it('the Recordings list shows only the active set, and switches with it', async () => {
    const restarted: string[] = [];
    const a = app(restarted);
    expect(await recordingNames(a)).toEqual(['01-1-intro.mov', '01-2-setup.mov']);
    await request(a).post('/api/sets/active').send({ set: 'story' }).expect(200);
    expect(await recordingNames(a)).toEqual(['01-1-intro.mp4', '02-1-hook.mov']);
    expect(restarted).toEqual([sets]); // the watcher is re-pointed
    expect(emitted).toEqual(expect.arrayContaining(['sets:changed', 'recordings:changed', 'transcripts:changed']));
    // remembered on disk, so a restart keeps the set
    expect(activeSetSync(sets)).toBe('story');
  });

  it('switching to a set that does not exist is a 404 and changes nothing', async () => {
    const res = await request(app()).post('/api/sets/active').send({ set: 'nope' }).expect(404);
    expect(res.body.reason).toBe('no-such-set');
    expect(activeSetSync(sets)).toBe('demo');
  });

  it('two sets with the same 01-1-intro keep separate state', async () => {
    const demo = getProjectPaths(sets, undefined, 'demo');
    const story = getProjectPaths(sets, undefined, 'story');
    expect(demo.stateFile).not.toBe(story.stateFile);

    // park 01-1 in demo (by name: demo's take is .mov)
    await request(app()).post('/api/recordings/park').send({ chapter: '01' }).expect(200);
    writeActiveSetSync(sets, 'story');
    const storyState = await readProjectState(sets);
    expect(storyState.recordings['01-1-intro.mp4']).toBeUndefined();
    expect(Object.keys(storyState.recordings)).toEqual([]);
    writeActiveSetSync(sets, 'demo');
    const demoState = await readProjectState(sets);
    expect(demoState.recordings['01-1-intro.mov']?.parked).toBe(true);

    // and a state write in story never touches demo's file
    writeActiveSetSync(sets, 'story');
    await writeProjectState(sets, setRecordingParked(await readProjectState(sets), '01-1-intro.mp4', true));
    const onDisk = (f: string) => JSON.parse(fs.readFileSync(f, 'utf8')).recordings;
    expect(Object.keys(onDisk(story.stateFile))).toEqual(['01-1-intro.mp4']);
    expect(Object.keys(onDisk(demo.stateFile)).sort()).toEqual(['01-1-intro.mov', '01-2-setup.mov']);
    // no project-root state file is created for a set project
    expect(fs.existsSync(path.join(sets, '.flihub-state.json'))).toBe(false);
  });

  it('chapter overrides are per set', async () => {
    const demo = getProjectPaths(sets, undefined, 'demo');
    const story = getProjectPaths(sets, undefined, 'story');
    expect(demo.chapterOverrides).toBe(path.join(sets, 'hub', 'sets', 'demo', '.chapter-overrides.json'));
    expect(story.chapterOverrides).not.toBe(demo.chapterOverrides);
  });

  it('a new take lands in the active set with per-set numbering', async () => {
    const a = app();
    // demo: chapter 01 has 2 takes → next is 01-3
    expect((await request(a).get('/api/suggested-naming').expect(200)).body).toMatchObject({ chapter: '01', sequence: '3' });
    await request(a).post('/api/sets/active').send({ set: 'story' }).expect(200);
    // story: last take is 02-1 → next is 02-2
    expect((await request(a).get('/api/suggested-naming').expect(200)).body).toMatchObject({ chapter: '02', sequence: '2' });

    const src = path.join(inbox, 'take.mp4');
    write(src, 'NEW', 0);
    await request(a)
      .post('/api/rename')
      .send({ originalPath: src, chapter: '02', sequence: '2', name: 'beat', tags: [] })
      .expect(200);
    expect(ls(setRec('story'))).toEqual(['01-1-intro.mp4', '02-1-hook.mov', '02-2-beat.mp4']);
    expect(ls(setRec('demo'))).toEqual(['01-1-intro.mov', '01-2-setup.mov']);
    expect(fs.existsSync(path.join(sets, 'hub', 'recordings'))).toBe(false);
  });

  it('an inline rename stays inside the set and carries that set\'s transcript only', async () => {
    write(path.join(setTx('demo'), '01-1-intro.txt'), 'demo words', 0);
    await request(app()).post('/api/sets/active').send({ set: 'story' }).expect(200);
    await request(app())
      .post('/api/rename')
      .send({ originalPath: path.join(setRec('story'), '01-1-intro.mp4'), chapter: '01', sequence: '1', name: 'opening', tags: [] })
      .expect(200);
    expect(ls(setRec('story'))).toEqual(['01-1-opening.mp4', '02-1-hook.mov']);
    expect(ls(setTx('story'))).toEqual(['01-1-opening.txt']);
    // demo's same-named take and transcript are untouched
    expect(ls(setRec('demo'))).toEqual(['01-1-intro.mov', '01-2-setup.mov']);
    expect(ls(setTx('demo'))).toEqual(['01-1-intro.txt']);
  });

  it('renumber-chapter (manage) stays inside the active set', async () => {
    fs.rmSync(path.join(setRec('demo'), '01-1-intro.mov'));
    await request(app()).post('/api/manage/renumber-chapter').send({ chapter: '01' }).expect(200);
    expect(ls(setRec('demo'))).toEqual(['01-1-setup.mov']);
    expect(ls(setRec('story'))).toEqual(['01-1-intro.mp4', '02-1-hook.mov']);
  });

  it('batch undo acts in the set the batch ran in, even after a switch', async () => {
    const a = app();
    fs.rmSync(path.join(setRec('demo'), '01-1-intro.mov'));
    await request(a).post('/api/manage/renumber-chapter').send({ chapter: '01' }).expect(200);
    expect(ls(setRec('demo'))).toEqual(['01-1-setup.mov']);
    await request(a).post('/api/sets/active').send({ set: 'story' }).expect(200);
    const undo = await request(a).post('/api/manage/undo-rename').expect(200);
    expect(undo.body).toMatchObject({ success: true, filesReverted: 1 });
    expect(ls(setRec('demo'))).toEqual(['01-2-setup.mov']);
    expect(ls(setRec('story'))).toEqual(['01-1-intro.mp4', '02-1-hook.mov']);
  });

  it('a segment op (insert) renumbers inside the active set only, and journals per set', async () => {
    write(path.join(inbox, 'aside.mov'), 'NEW', 0);
    await request(app())
      .post('/api/segments/op')
      .send({ mode: 'insert', chapter: '01', before: 1, source: path.join(inbox, 'aside.mov'), name: 'aside' })
      .expect(200);
    expect(ls(setRec('demo'))).toEqual(['01-1-aside.mov', '01-2-intro.mov', '01-3-setup.mov']);
    expect(ls(setRec('story'))).toEqual(['01-1-intro.mp4', '02-1-hook.mov']);
    expect(fs.existsSync(path.join(sets, 'hub', 'sets', 'demo', '.flihub-segment-journal.json'))).toBe(true);
    expect(fs.existsSync(path.join(sets, '.flihub-segment-journal.json'))).toBe(false);
  });

  const body = (r: request.Test) =>
    r.buffer(true).parse((res, cb) => {
      let d = '';
      res.on('data', (c: Buffer) => (d += c.toString()));
      res.on('end', () => cb(null, d));
    });

  const journalOf = (set: string) => {
    const f = path.join(sets, 'hub', 'sets', set, '.flihub-segment-journal.json');
    return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')).entries as { set?: string; undoneAt?: string }[]) : [];
  };

  it('segment undo replays in the set the change ran in, even after a switch', async () => {
    const a = app();
    write(path.join(inbox, 'aside.mov'), 'NEW', 0);
    await request(a)
      .post('/api/segments/op')
      .send({ mode: 'insert', chapter: '01', before: 1, source: path.join(inbox, 'aside.mov'), name: 'aside' })
      .expect(200);
    expect(ls(setRec('demo'))).toEqual(['01-1-aside.mov', '01-2-intro.mov', '01-3-setup.mov']);
    expect(journalOf('demo')[0]?.set).toBe('demo');

    await request(a).post('/api/sets/active').send({ set: 'story' }).expect(200);
    await request(a).post('/api/segments/undo').send({}).expect(200);

    expect(ls(setRec('demo'))).toEqual(['01-1-intro.mov', '01-2-setup.mov']); // demo put back
    expect(ls(setRec('story'))).toEqual(['01-1-intro.mp4', '02-1-hook.mov']); // story untouched
    expect(fs.existsSync(path.join(inbox, 'aside.mov'))).toBe(true); // the promoted take went back to the inbox
    expect(journalOf('demo')[0]?.undoneAt).toBeTypeOf('string');
    expect(journalOf('story')).toEqual([]);
  });

  it('segment undo takes the newest change across sets first, each in its own set', async () => {
    const a = app();
    const t0 = Date.now();
    write(path.join(inbox, 'd.mov'), 'D', 0);
    await request(a)
      .post('/api/segments/op')
      .send({ mode: 'insert', chapter: '01', before: 1, source: path.join(inbox, 'd.mov'), name: 'dee' })
      .expect(200);
    while (Date.now() === t0) {
      /* make the second change's timestamp strictly later */
    }
    await request(a).post('/api/sets/active').send({ set: 'story' }).expect(200);
    write(path.join(inbox, 's.mov'), 'S', 0);
    await request(a)
      .post('/api/segments/op')
      .send({ mode: 'insert', chapter: '02', before: 1, source: path.join(inbox, 's.mov'), name: 'ess' })
      .expect(200);
    await request(a).post('/api/sets/active').send({ set: 'demo' }).expect(200);

    await request(a).post('/api/segments/undo').send({}).expect(200); // story's (newer), though demo is active
    expect(ls(setRec('story'))).toEqual(['01-1-intro.mp4', '02-1-hook.mov']);
    expect(ls(setRec('demo'))).toEqual(['01-1-dee.mov', '01-2-intro.mov', '01-3-setup.mov']);

    await request(a).post('/api/segments/undo').send({}).expect(200); // then demo's
    expect(ls(setRec('demo'))).toEqual(['01-1-intro.mov', '01-2-setup.mov']);

    const none = await request(a).post('/api/segments/undo').send({});
    expect(none.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(none.body)).toContain('nothing-to-undo');
  });

  it('title, ships and dictionary are ONE project-level copy; set files hold only recording and chapter keys', async () => {
    const a = app();
    await request(a).put('/api/projects/p02/title').send({ title: 'The Video' }).expect(200);
    await request(a).put('/api/projects/p02/ships').send({ ships: 'per-chapter' }).expect(200);
    await request(a).patch('/api/projects/p02/state/dictionary').send({ words: ['FliHub'] }).expect(200);
    await request(a).put('/api/projects/p02/chapters/01/title').send({ title: 'Demo opening' }).expect(200);
    await request(a).post('/api/recordings/park').send({ chapter: '01' }).expect(200);

    const read = (f: string) => JSON.parse(fs.readFileSync(f, 'utf8'));
    const root = read(path.join(sets, '.flihub-state.json'));
    expect(root).toMatchObject({ title: 'The Video', ships: 'per-chapter', glingDictionary: ['FliHub'] });
    expect(root.recordings).toEqual({});
    expect(root.chapters).toBeUndefined();

    const demo = read(getProjectPaths(sets, undefined, 'demo').stateFile);
    expect(Object.keys(demo).sort()).toEqual(['chapters', 'recordings', 'version']);
    expect(demo.chapters['01'].title).toBe('Demo opening');
    expect(Object.keys(demo.recordings).sort()).toEqual(['01-1-intro.mov', '01-2-setup.mov']);

    // story sees the same project fields, and none of demo's chapter or recording keys
    writeActiveSetSync(sets, 'story');
    const story = await readProjectState(sets);
    expect(story).toMatchObject({ title: 'The Video', ships: 'per-chapter', glingDictionary: ['FliHub'] });
    expect(story.chapters).toBeUndefined();
    expect(story.recordings).toEqual({});

    // changing the title from story changes the one shared copy
    await request(a).put('/api/projects/p02/title').send({ title: 'Renamed' }).expect(200);
    expect(read(path.join(sets, '.flihub-state.json')).title).toBe('Renamed');
    writeActiveSetSync(sets, 'demo');
    expect((await readProjectState(sets)).title).toBe('Renamed');
    expect(read(getProjectPaths(sets, undefined, 'demo').stateFile).title).toBeUndefined();
  });

  it('a take action in a set does not rewrite the project-level file', async () => {
    await request(app()).put('/api/projects/p02/title').send({ title: 'Keep' }).expect(200);
    const rootFile = path.join(sets, '.flihub-state.json');
    const before = fs.statSync(rootFile).mtimeMs;
    const t = new Date(Date.now() - 60_000);
    fs.utimesSync(rootFile, t, t);
    await request(app()).post('/api/recordings/park').send({ chapter: '01' }).expect(200);
    expect(fs.statSync(rootFile).mtimeMs).toBe(t.getTime());
    expect(before).toBeGreaterThan(0);
  });

  it('video URLs serve the active set, or the set named by ?set=, and 404 an unknown set', async () => {
    const a = app();
    expect((await body(request(a).get('/api/video/recordings/01-1-intro.mov')).expect(200)).body).toBe('DEMO');
    expect((await body(request(a).get('/api/video/p02-sets/recordings/01-1-intro.mp4?set=story')).expect(200)).body).toBe('STORY');
    await request(a).get('/api/video/recordings/01-1-intro.mp4').expect(404); // story's take, demo active
    await request(a).get('/api/video/recordings/01-1-intro.mov?set=nope').expect(404);
  });

  it('a background sound-hole check that finishes after a set switch lands on its own set\'s take', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => (release = r));
    const checked: string[] = [];
    const checkSound = async (file: string) => {
      checked.push(file);
      await gate;
      return { status: 'ok', checkedAt: new Date().toISOString(), holes: [] } as never;
    };
    const a = express();
    a.use(express.json());
    a.use('/api/sets', createSetRoutes(() => config, io, () => undefined));
    a.use(
      '/api',
      createRoutes(new Map<string, FileInfo>(), config, (c) => Object.assign(config, c), undefined, undefined, undefined, undefined, async () => ({ status: 'ok' }) as never, checkSound)
    );
    await request(a).get('/api/recordings').expect(200); // demo active: backfill queued for demo's takes
    await request(a).post('/api/sets/active').send({ set: 'story' }).expect(200);
    release();
    await vi.waitFor(() => {
      const f = getProjectPaths(sets, undefined, 'demo').stateFile;
      expect(fs.existsSync(f) && JSON.parse(fs.readFileSync(f, 'utf8')).recordings['01-2-setup.mov']?.soundHoles).toBeTruthy();
    });
    expect(checked.every((f) => f.startsWith(setRec('demo')))).toBe(true);
    // story's same-named 01-1-intro got nothing from demo's check
    expect(fs.existsSync(getProjectPaths(sets, undefined, 'story').stateFile)).toBe(false);
  });

  it('a take\'s paths follow its own set, not the active one', async () => {
    const take = path.join(setRec('story'), '01-1-intro.mp4');
    expect(projectDirFromRecordingPath(take)).toBe(sets);
    expect(pathsForRecording(take)?.transcripts).toBe(setTx('story'));
    // demo is active; trashing story's transcripts still finds them in story
    const moved = await trashTranscriptsFor(take);
    expect(moved).toHaveLength(1);
    expect(ls(setTx('story'))).toEqual([]);
  });

  it('project stats count every set', async () => {
    const stats = await getProjectStatsRaw(sets, 'p02', config);
    expect(stats.totalFiles).toBe(4);
    expect(stats.chapterCount).toBe(3); // demo 01 + story 01, 02
    expect(stats.transcriptSync.matched).toBe(1);
    expect(stats.transcriptSync.missingTranscripts.sort()).toEqual(['demo/01-1-intro', 'demo/01-2-setup', 'story/02-1-hook']);
  });

  it('New set creates the folders and the sets.json entry', async () => {
    const res = await request(app()).post('/api/sets').send({ id: 'outro', title: 'Outro' }).expect(200);
    expect(res.body.sets.map((s: { id: string }) => s.id)).toEqual(['demo', 'story', 'outro']);
    expect(fs.existsSync(setRec('outro'))).toBe(true);
    expect(fs.existsSync(setTx('outro'))).toBe(true);
    await request(app()).post('/api/sets').send({ id: 'outro' }).expect(409);
    await request(app()).post('/api/sets').send({ id: 'Bad Id' }).expect(400);
  });

  it('hold/restore carry every set\'s recordings; the storage tree marks them heavy', async () => {
    const heavy = await heavySubfoldersFor(sets);
    expect(heavy).toEqual(expect.arrayContaining(['hub/sets/demo/recordings', 'hub/sets/story/recordings']));
    expect(heavy).not.toContain('hub/sets/story/transcripts');

    const tree = await getStorageTree('p02-sets', { projectsRoot: root, holdingRoot: null, publishedRoot: null });
    const byName = Object.fromEntries(tree.nodes.map((n) => [n.name, n.classification]));
    expect(byName['hub/sets/demo/recordings']).toBe('heavy');
    expect(byName['hub/sets/story/recordings']).toBe('heavy');
    expect(byName['hub/sets/story/transcripts']).toBe('light');
    expect(byName['hub/sets.json']).toBe('light');
  });

  it('a project whose set recordings sit on the holding drive (none local) reads as held', async () => {
    const holdingRoot = path.join(root, 'holding');
    for (const set of ['demo', 'story']) {
      fs.cpSync(setRec(set), path.join(holdingRoot, 'p02-sets', 'hub', 'sets', set, 'recordings'), { recursive: true });
      fs.rmSync(setRec(set), { recursive: true });
    }
    // a holding-only set must be found too (restore reads the holding side)
    expect(await heavySubfoldersFor(sets, path.join(holdingRoot, 'p02-sets'))).toEqual(
      expect.arrayContaining(['hub/sets/demo/recordings', 'hub/sets/story/recordings'])
    );
    const tree = await getStorageTree('p02-sets', { projectsRoot: root, holdingRoot, publishedRoot: null });
    expect(tree.state).toBe('held');
  });
});
