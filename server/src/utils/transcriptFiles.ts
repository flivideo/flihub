/**
 * Which transcript belongs to which take (2026-09-25, David, live on d01).
 *
 * Transcripts are matched to recordings by base name, and names get reused: an Undo frees
 * 01-2-intro-HOOK, and the next take promoted under that name found the undone take's
 * transcript and skipped transcription. So a transcript counts only when it is at least as new
 * as its recording, and Undo moves the undone take's transcripts to the project's -trash.
 *
 * FliTools also keeps per-engine copies in <transcripts>/engines/<base>.<engine>.<ext> (2026-10-04).
 * FliHub reads only the plain <base>.* files, but every move of a take (undo, rename, trash)
 * carries the engine copies too, so none stay behind under a freed name.
 */
import fs from 'fs-extra';
import path from 'path';
import { getProjectPaths, projectDirFromRecordingPath } from '../../../shared/paths.js';
import type { TranscriptHealth } from '../../../shared/types.js';

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

/** Subfolder of the transcripts folder where FliTools keeps per-engine copies. */
export const ENGINE_COPIES_DIR = 'engines';

/**
 * Filenames in `<transcriptsDir>/engines/` that are engine copies of `base`: `<base>.<engine>.<ext>`.
 * The dot after the base keeps 01-1-intro from claiming 01-1-intro-HOOK's copies.
 */
export async function engineCopiesFor(transcriptsDir: string, base: string): Promise<string[]> {
  const dir = path.join(transcriptsDir, ENGINE_COPIES_DIR);
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const prefix = `${base}.`;
  return files.filter((f) => f.startsWith(prefix) && /^[^.]+\.[^.]+$/.test(f.slice(prefix.length)));
}

/** `dir/name`, or `dir/<stem>-<n><ext>` for the first n that is free. */
async function freeTarget(dir: string, name: string): Promise<string> {
  const ext = path.extname(name);
  const stem = path.basename(name, ext);
  let target = path.join(dir, name);
  for (let n = 1; await fs.pathExists(target); n++) {
    target = path.join(dir, `${stem}-${n}${ext}`);
  }
  return target;
}

/**
 * Move every `<base>.*` transcript of this recording, and its engine copies, into the project's
 * -trash. Returns the trash paths.
 */
export async function trashTranscriptsFor(recordingPath: string): Promise<string[]> {
  const projectDir = projectDirFromRecordingPath(recordingPath);
  if (!projectDir) return [];
  const paths = getProjectPaths(projectDir);
  if (!(await fs.pathExists(paths.transcripts))) return [];

  const base = path.basename(recordingPath, path.extname(recordingPath));
  const mine = (await fs.readdir(paths.transcripts)).filter(
    (f) => path.basename(f, path.extname(f)) === base
  );
  const copies = await engineCopiesFor(paths.transcripts, base);
  const moved: string[] = [];
  if (mine.length === 0 && copies.length === 0) return moved;
  await fs.ensureDir(paths.trash);
  for (const f of mine) {
    const target = await freeTarget(paths.trash, f);
    await fs.move(path.join(paths.transcripts, f), target);
    moved.push(target);
  }
  for (const f of copies) {
    const target = await freeTarget(paths.trash, f);
    await fs.move(path.join(paths.transcripts, ENGINE_COPIES_DIR, f), target);
    moved.push(target);
  }
  return moved;
}

/**
 * FliTools' health verdict for a transcript (B584): the .json is any flitools.transcript/<n>
 * version with a `health` block. null for FliHub's old whisper output or an unreadable file.
 * Carries the time-order check (wordsBackInTime) and the chunk-overlap repair (overlapRepaired) when present.
 */
export function readTranscriptHealth(jsonPath: string): TranscriptHealth | null {
  return readTranscriptInfo(jsonPath)?.health ?? null;
}

/** The health verdict plus which pass is on disk (1 = fast Whisper, 2 = high-quality verbatim), for the redo control. */
export function readTranscriptInfo(
  jsonPath: string
): { health: TranscriptHealth | null; pass?: 1 | 2; engine?: string; createdAt?: string } | null {
  try {
    const doc = fs.readJsonSync(jsonPath) as {
      schema?: string;
      pass?: number;
      verbatim?: boolean;
      createdAt?: string;
      engine?: { name?: string };
      health?: TranscriptHealth;
    };
    if (typeof doc?.schema !== 'string' || !doc.schema.startsWith('flitools.transcript/')) return null;
    const h = doc.health;
    const health: TranscriptHealth | null = h
      ? {
          suspect: h.suspect === true,
          reasons: h.reasons ?? [],
          ...(h.wordsBackInTime?.length ? { wordsBackInTime: h.wordsBackInTime } : {}),
          ...(h.overlapRepaired?.length ? { overlapRepaired: h.overlapRepaired } : {}),
        }
      : null;
    const pass = doc.pass === 2 || doc.verbatim === true ? 2 : 1;
    return { health, pass, ...(doc.engine?.name ? { engine: doc.engine.name } : {}), ...(doc.createdAt ? { createdAt: doc.createdAt } : {}) };
  } catch {
    return null;
  }
}
