// Hub layout (David, 2026-09-22): FliHub's folders move under <project>/hub/ for NEW projects.
// Existing projects stay legacy and are never migrated — both layouts are read forever.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { detectProjectLayout, getProjectPaths, projectDirFromRecordingPath } from './paths';

let tmp: string;
const mk = (...parts: string[]) => fs.mkdirSync(path.join(tmp, ...parts), { recursive: true });

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-layout-'));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('detectProjectLayout', () => {
  it('legacy: top-level recordings/, no hub/', () => {
    mk('recordings');
    expect(detectProjectLayout(tmp)).toBe('legacy');
  });

  it('legacy: an empty folder (every project created today)', () => {
    expect(detectProjectLayout(tmp)).toBe('legacy');
  });

  it('legacy: a missing folder never throws', () => {
    expect(detectProjectLayout(path.join(tmp, 'nope'))).toBe('legacy');
  });

  it('hub: hub/recordings/ exists', () => {
    mk('hub', 'recordings');
    expect(detectProjectLayout(tmp)).toBe('hub');
  });

  it('hub: hub/recordings/ wins even when top-level recordings/ also exists', () => {
    mk('hub', 'recordings');
    mk('recordings');
    expect(detectProjectLayout(tmp)).toBe('hub');
  });

  it('legacy: a STRAY hub/ (no hub/recordings) never hides top-level recordings/', () => {
    mk('recordings');
    mk('hub');
    expect(detectProjectLayout(tmp)).toBe('legacy');
  });

  it('hub: hub/ with only transcripts (a held hub project) stays hub', () => {
    mk('hub', 'transcripts');
    expect(detectProjectLayout(tmp)).toBe('hub');
  });

  it('legacy: a FILE named hub is not a layout marker', () => {
    fs.writeFileSync(path.join(tmp, 'hub'), 'x');
    expect(detectProjectLayout(tmp)).toBe('legacy');
  });
});

describe('getProjectPaths by layout', () => {
  it('hub layout puts recordings, -safe, -chapters and transcripts under hub/', () => {
    mk('hub', 'recordings');
    const p = getProjectPaths(tmp);
    expect(p.layout).toBe('hub');
    expect(p.recordings).toBe(path.join(tmp, 'hub', 'recordings'));
    expect(p.safe).toBe(path.join(tmp, 'hub', 'recordings', '-safe'));
    expect(p.chapters).toBe(path.join(tmp, 'hub', 'recordings', '-chapters'));
    expect(p.transcripts).toBe(path.join(tmp, 'hub', 'transcripts'));
    // Everything else is unchanged by the layout
    expect(p.final).toBe(path.join(tmp, 'final'));
    expect(p.trash).toBe(path.join(tmp, '-trash'));
    expect(p.stateFile).toBe(path.join(tmp, '.flihub-state.json'));
  });

  it('legacy layout keeps recordings/ and recording-transcripts/ at the top', () => {
    mk('recordings');
    const p = getProjectPaths(tmp);
    expect(p.layout).toBe('legacy');
    expect(p.recordings).toBe(path.join(tmp, 'recordings'));
    expect(p.transcripts).toBe(path.join(tmp, 'recording-transcripts'));
  });

  it('an explicit layout overrides detection', () => {
    mk('hub', 'recordings');
    expect(getProjectPaths(tmp, 'legacy').recordings).toBe(path.join(tmp, 'recordings'));
  });
});

describe('projectDirFromRecordingPath', () => {
  const proj = '/v/v-appydave/d03-thing';

  it('legacy recording', () => {
    expect(projectDirFromRecordingPath(`${proj}/recordings/01-1-intro.mov`)).toBe(proj);
  });

  it('hub recording resolves to the project, not <project>/hub', () => {
    expect(projectDirFromRecordingPath(`${proj}/hub/recordings/01-1-intro.mov`)).toBe(proj);
  });

  it('-safe and -chapters subfolders, both layouts', () => {
    expect(projectDirFromRecordingPath(`${proj}/recordings/-safe/01-1-intro.mov`)).toBe(proj);
    expect(projectDirFromRecordingPath(`${proj}/hub/recordings/-chapters/01-intro.mov`)).toBe(proj);
  });

  it('a project folder that is itself named "recordings" is not confused (last match wins)', () => {
    expect(projectDirFromRecordingPath('/v/recordings/recordings/01-1-a.mov')).toBe('/v/recordings');
  });

  it('returns null outside a recordings folder — the caller never guesses', () => {
    expect(projectDirFromRecordingPath(`${proj}/b-roll/clip.mov`)).toBeNull();
    expect(projectDirFromRecordingPath('/tmp/watch/raw.mov')).toBeNull();
  });
});
