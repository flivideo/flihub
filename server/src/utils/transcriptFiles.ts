/**
 * Which transcript belongs to which take (2026-09-25, David, live on d01).
 *
 * Transcripts are matched to recordings by base name, and names get reused: an Undo frees
 * 01-2-intro-HOOK, and the next take promoted under that name found the undone take's
 * transcript and skipped transcription. So a transcript counts only when it is at least as new
 * as its recording, and Undo moves the undone take's transcripts to the project's -trash.
 */
import fs from 'fs-extra';
import path from 'path';
import { getProjectPaths, projectDirFromRecordingPath } from '../../../shared/paths.js';

/** True when `transcriptPath` exists and is not older than `videoPath`. Missing video → existence only. */
export function isTranscriptFresh(transcriptPath: string, videoPath: string): boolean {
  let transcriptMtime: number;
  try {
    transcriptMtime = fs.statSync(transcriptPath).mtimeMs;
  } catch {
    return false;
  }
  try {
    return transcriptMtime >= fs.statSync(videoPath).mtimeMs;
  } catch {
    return true;
  }
}

/** Move every `<base>.*` transcript of this recording into the project's -trash. Returns the trash paths. */
export async function trashTranscriptsFor(recordingPath: string): Promise<string[]> {
  const projectDir = projectDirFromRecordingPath(recordingPath);
  if (!projectDir) return [];
  const paths = getProjectPaths(projectDir);
  if (!(await fs.pathExists(paths.transcripts))) return [];

  const base = path.basename(recordingPath, path.extname(recordingPath));
  const mine = (await fs.readdir(paths.transcripts)).filter(
    (f) => path.basename(f, path.extname(f)) === base
  );
  const moved: string[] = [];
  if (mine.length === 0) return moved;
  await fs.ensureDir(paths.trash);
  for (const f of mine) {
    const ext = path.extname(f);
    let target = path.join(paths.trash, f);
    for (let n = 1; await fs.pathExists(target); n++) {
      target = path.join(paths.trash, `${base}-${n}${ext}`);
    }
    await fs.move(path.join(paths.transcripts, f), target);
    moved.push(target);
  }
  return moved;
}
