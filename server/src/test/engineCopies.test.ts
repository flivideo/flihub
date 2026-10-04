// 2026-10-04 (David's transcript naming ruling): FliTools keeps per-engine copies in
// <transcripts>/engines/<base>.<engine>.<ext>. FliHub reads only the plain <base>.* files, but undo,
// rename and trash must carry the engine copies with the take, or they stay behind under a freed
// name. Nothing in FliHub may count engines/ as recordings or orphaned transcripts.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { getProjectPaths } from '../../../shared/paths.js';
import { engineCopiesFor, trashTranscriptsFor } from '../utils/transcriptFiles.js';
import { renameDerivableFiles } from '../utils/renameRecording.js';
import { findRecordingArtifacts, moveArtifactToTrash } from '../utils/recordingArtifacts.js';
import { getTranscriptSyncStatus } from '../utils/scanning.js';

let project: string;
let paths: ReturnType<typeof getProjectPaths>;

const write = (dir: string, name: string) => {
  fs.ensureDirSync(dir);
  fs.writeFileSync(path.join(dir, name), name);
};
const engines = () => path.join(paths.transcripts, 'engines');
const ls = (dir: string) => (fs.existsSync(dir) ? fs.readdirSync(dir).sort() : []);

beforeEach(() => {
  project = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'engine-copies-')), 'd01-test');
  fs.ensureDirSync(path.join(project, 'recordings'));
  paths = getProjectPaths(project);
  write(paths.recordings, '01-1-intro.mov');
  write(paths.recordings, '01-1-intro-HOOK.mov');
  for (const ext of ['json', 'srt', 'txt']) {
    write(paths.transcripts, `01-1-intro.${ext}`);
    write(engines(), `01-1-intro.groq.${ext}`);
    write(engines(), `01-1-intro.crisper.${ext}`);
    write(paths.transcripts, `01-1-intro-HOOK.${ext}`);
    write(engines(), `01-1-intro-HOOK.groq.${ext}`);
  }
});

afterEach(() => fs.removeSync(path.dirname(project)));

describe('engineCopiesFor', () => {
  it("finds only this take's copies, not a longer name that starts the same", async () => {
    const copies = (await engineCopiesFor(paths.transcripts, '01-1-intro')).sort();
    expect(copies).toEqual([
      '01-1-intro.crisper.json', '01-1-intro.crisper.srt', '01-1-intro.crisper.txt',
      '01-1-intro.groq.json', '01-1-intro.groq.srt', '01-1-intro.groq.txt',
    ]);
  });

  it('returns [] when there is no engines/ folder', async () => {
    fs.removeSync(engines());
    expect(await engineCopiesFor(paths.transcripts, '01-1-intro')).toEqual([]);
  });
});

describe('undo (trashTranscriptsFor)', () => {
  it('trashes the plain transcripts and the engine copies, leaving the other take alone', async () => {
    const moved = await trashTranscriptsFor(path.join(paths.recordings, '01-1-intro.mov'));
    expect(moved).toHaveLength(9);
    expect(ls(paths.trash)).toContain('01-1-intro.groq.json');
    expect(ls(paths.trash)).toContain('01-1-intro.crisper.srt');
    expect(ls(engines())).toEqual(['01-1-intro-HOOK.groq.json', '01-1-intro-HOOK.groq.srt', '01-1-intro-HOOK.groq.txt']);
  });

  it('suffixes an engine copy that collides with one already in -trash', async () => {
    write(paths.trash, '01-1-intro.groq.json');
    await trashTranscriptsFor(path.join(paths.recordings, '01-1-intro.mov'));
    expect(ls(paths.trash)).toContain('01-1-intro.groq-1.json');
  });
});

describe('rename (renameDerivableFiles)', () => {
  it('renames the engine copies with the take', async () => {
    await renameDerivableFiles('01-1-intro.mov', '01-2-welcome.mov', paths);
    expect(ls(engines())).toEqual([
      '01-1-intro-HOOK.groq.json', '01-1-intro-HOOK.groq.srt', '01-1-intro-HOOK.groq.txt',
      '01-2-welcome.crisper.json', '01-2-welcome.crisper.srt', '01-2-welcome.crisper.txt',
      '01-2-welcome.groq.json', '01-2-welcome.groq.srt', '01-2-welcome.groq.txt',
    ]);
    expect(ls(paths.transcripts)).toContain('01-2-welcome.txt');
  });
});

describe('trash recording (findRecordingArtifacts)', () => {
  it('lists the engine copies so the warning and the move cover them', async () => {
    const artifacts = await findRecordingArtifacts(project, '01-1-intro.mov');
    expect(artifacts).toHaveLength(10); // .mov + 3 plain + 6 engine copies
    expect(artifacts.map((a) => a.label)).toContain('Transcript copy (groq.json)');

    for (const a of artifacts) await moveArtifactToTrash(paths.trash, a);
    expect(ls(engines())).toEqual(['01-1-intro-HOOK.groq.json', '01-1-intro-HOOK.groq.srt', '01-1-intro-HOOK.groq.txt']);
    expect(ls(paths.trash)).toContain('01-1-intro.crisper.txt');
  });
});

describe('engines/ is not a recording or an orphan', () => {
  it('transcript sync counts only the plain files', async () => {
    write(engines(), '09-9-gone.groq.txt'); // a copy whose take no longer exists
    const sync = await getTranscriptSyncStatus(paths.recordings, paths.transcripts);
    expect(sync.matched).toBe(2);
    expect(sync.missingTranscripts).toEqual([]);
    expect(sync.orphanedTranscripts).toEqual([]);
  });
});
