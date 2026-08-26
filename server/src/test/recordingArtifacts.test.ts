/**
 * FR-156: Recording artifact discovery + trash moves.
 *
 * The point of these tests is that the confirmation warning and the actual move
 * are driven by the same discovery function — if discovery under-reports, the
 * user is warned about fewer files than get moved.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { findRecordingArtifacts, moveArtifactToTrash } from '../utils/recordingArtifacts.js';

let projectDir: string;

async function writeFile(relative: string, content: string): Promise<void> {
  const full = path.join(projectDir, relative);
  await fs.ensureDir(path.dirname(full));
  await fs.writeFile(full, content);
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-fr156-'));
});

afterEach(async () => {
  await fs.remove(projectDir);
});

describe('findRecordingArtifacts', () => {
  it('finds the recording, shadow and all three transcripts', async () => {
    await writeFile('recordings/01-1-intro.mov', 'mov');
    await writeFile('recording-shadows/01-1-intro.mp4', 'shadow');
    await writeFile('recording-transcripts/01-1-intro.json', '{}');
    await writeFile('recording-transcripts/01-1-intro.srt', 'srt');
    await writeFile('recording-transcripts/01-1-intro.txt', 'txt');

    const artifacts = await findRecordingArtifacts(projectDir, '01-1-intro.mov');

    expect(artifacts).toHaveLength(5);
    expect(artifacts.map((a) => a.kind)).toEqual([
      'recording',
      'shadow',
      'transcript',
      'transcript',
      'transcript',
    ]);
    // Recording is first so the warning can lead with it
    expect(artifacts[0].filename).toBe('01-1-intro.mov');
  });

  it('returns only what exists — an untranscribed take yields just the recording', async () => {
    await writeFile('recordings/02-1-demo.mov', 'mov');

    const artifacts = await findRecordingArtifacts(projectDir, '02-1-demo.mov');

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].kind).toBe('recording');
  });

  it('finds sidecars even when the recording itself is already gone', async () => {
    await writeFile('recording-transcripts/03-1-orphan.srt', 'srt');

    const artifacts = await findRecordingArtifacts(projectDir, '03-1-orphan.mov');

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].kind).toBe('transcript');
  });

  it('returns nothing when the recording does not exist at all', async () => {
    const artifacts = await findRecordingArtifacts(projectDir, '99-9-missing.mov');
    expect(artifacts).toEqual([]);
  });

  it('does not match a different recording that shares a filename prefix', async () => {
    await writeFile('recordings/01-1-intro.mov', 'mov');
    await writeFile('recording-transcripts/01-1-intro-extended.srt', 'other');

    const artifacts = await findRecordingArtifacts(projectDir, '01-1-intro.mov');

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].filename).toBe('01-1-intro.mov');
  });

  it('reports real byte sizes so the warning can total them', async () => {
    await writeFile('recordings/01-1-intro.mov', 'abcdefghij'); // 10 bytes

    const [artifact] = await findRecordingArtifacts(projectDir, '01-1-intro.mov');

    expect(artifact.size).toBe(10);
  });
});

describe('moveArtifactToTrash', () => {
  it('moves the file into -trash and removes the source', async () => {
    await writeFile('recordings/01-1-intro.mov', 'mov');
    const [artifact] = await findRecordingArtifacts(projectDir, '01-1-intro.mov');
    const trashDir = path.join(projectDir, '-trash');

    const destination = await moveArtifactToTrash(trashDir, artifact);

    expect(destination).toBe(path.join(trashDir, '01-1-intro.mov'));
    expect(await fs.pathExists(destination)).toBe(true);
    expect(await fs.pathExists(artifact.path)).toBe(false);
  });

  it('suffixes on collision rather than overwriting an earlier trashed take', async () => {
    const trashDir = path.join(projectDir, '-trash');
    await writeFile('-trash/01-1-intro.mov', 'FIRST');
    await writeFile('recordings/01-1-intro.mov', 'SECOND');

    const [artifact] = await findRecordingArtifacts(projectDir, '01-1-intro.mov');
    const destination = await moveArtifactToTrash(trashDir, artifact);

    expect(destination).toBe(path.join(trashDir, '01-1-intro-1.mov'));
    // The earlier copy must survive untouched
    expect(await fs.readFile(path.join(trashDir, '01-1-intro.mov'), 'utf8')).toBe('FIRST');
    expect(await fs.readFile(destination, 'utf8')).toBe('SECOND');
  });

  it('keeps counting up when several collisions stack', async () => {
    const trashDir = path.join(projectDir, '-trash');
    await writeFile('-trash/01-1-intro.mov', 'a');
    await writeFile('-trash/01-1-intro-1.mov', 'b');
    await writeFile('recordings/01-1-intro.mov', 'c');

    const [artifact] = await findRecordingArtifacts(projectDir, '01-1-intro.mov');
    const destination = await moveArtifactToTrash(trashDir, artifact);

    expect(destination).toBe(path.join(trashDir, '01-1-intro-2.mov'));
  });

  it('creates -trash when it does not exist yet', async () => {
    await writeFile('recordings/01-1-intro.mov', 'mov');
    const [artifact] = await findRecordingArtifacts(projectDir, '01-1-intro.mov');
    const trashDir = path.join(projectDir, '-trash');
    expect(await fs.pathExists(trashDir)).toBe(false);

    await moveArtifactToTrash(trashDir, artifact);

    expect(await fs.pathExists(trashDir)).toBe(true);
  });

  it('moves a full artifact set without name clashes between extensions', async () => {
    await writeFile('recordings/01-1-intro.mov', 'mov');
    await writeFile('recording-shadows/01-1-intro.mp4', 'shadow');
    await writeFile('recording-transcripts/01-1-intro.srt', 'srt');
    const trashDir = path.join(projectDir, '-trash');

    const artifacts = await findRecordingArtifacts(projectDir, '01-1-intro.mov');
    for (const artifact of artifacts) {
      await moveArtifactToTrash(trashDir, artifact);
    }

    expect((await fs.readdir(trashDir)).sort()).toEqual([
      '01-1-intro.mov',
      '01-1-intro.mp4',
      '01-1-intro.srt',
    ]);
  });
});
