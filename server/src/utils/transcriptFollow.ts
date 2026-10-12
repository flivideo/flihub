/**
 * The transcription job follows the take (2026-10-12, D08 06-1-outro / 06-2-outro-SKOOL).
 *
 * A take can be renamed while its transcription is still in flight: queued or running in FliHub's
 * own queue (pass 1), or as FliTools' background edit-grade upgrade (pass 2), which carries the
 * recording path it was queued with. Renaming only moved the transcript files that existed at that
 * moment, so the job then landed under the OLD name (a duplicate or an orphan), or FliTools found
 * the old path gone and skipped pass 2 entirely.
 *
 * Every take rename is recorded here (renameRecording calls recordTakeRename). A result for a path
 * that has since been renamed is mapped through these records to the take's CURRENT path:
 * `currentPathOf` follows the chain in order (A→B, then B→A for an undo, comes back to A), and
 * `relocateTranscripts` moves what FliTools wrote under the old name onto the current one — only
 * files whose json names the same content (sha256), so another take that now holds the old name
 * is never touched.
 */
import fs from 'fs-extra';
import path from 'path';
import { getProjectPaths, projectDirFromRecordingPath } from '../../../shared/paths.js';
import { ENGINE_COPIES_DIR, engineCopiesFor } from './transcriptFiles.js';

export interface TakeRename {
  from: string; // absolute recording path before
  to: string; // absolute recording path after
  at: number; // ms epoch
}

const MAX_RENAMES = 500;
const KEEP_MS = 7 * 24 * 60 * 60 * 1000; // a pass 2 can wait hours for the worker; a week is plenty

let renames: TakeRename[] = [];
type Listener = (rename: TakeRename) => void;
const listeners = new Set<Listener>();

/** Same take regardless of .mov/.mp4: compare folder + base name. */
export function takeKey(videoPath: string): string {
  const abs = path.resolve(videoPath);
  return path.join(path.dirname(abs), path.basename(abs, path.extname(abs)));
}

export function onTakeRenamed(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function recordTakeRename(from: string, to: string, at = Date.now()): void {
  const rename = { from: path.resolve(from), to: path.resolve(to), at };
  renames.push(rename);
  const cutoff = at - KEEP_MS;
  renames = renames.filter((r) => r.at >= cutoff).slice(-MAX_RENAMES);
  for (const fn of listeners) {
    try {
      fn(rename);
    } catch (err) {
      console.error('[follow] rename listener failed:', err);
    }
  }
}

/** Where the take that was at `videoPath` at time `since` is now (itself when never renamed). */
export function currentPathOf(videoPath: string, since: number): string {
  let current = path.resolve(videoPath);
  for (const r of renames) {
    if (r.at < since) continue;
    if (takeKey(r.from) === takeKey(current)) current = r.to;
  }
  return current;
}

export function getTakeRenames(): TakeRename[] {
  return [...renames];
}

/** Restore persisted records (server restart) or clear them (tests). */
export function setTakeRenames(list: TakeRename[]): void {
  renames = [...list].sort((a, b) => a.at - b.at).slice(-MAX_RENAMES);
}

export function transcriptsDirOf(videoPath: string): string {
  const projectDir = projectDirFromRecordingPath(videoPath);
  return projectDir
    ? getProjectPaths(projectDir).transcripts
    : path.join(path.dirname(path.dirname(videoPath)), 'transcripts');
}

async function shaOf(jsonFile: string): Promise<string | null> {
  try {
    const t = JSON.parse(await fs.readFile(jsonFile, 'utf8')) as { source?: { sha256?: string } };
    return t.source?.sha256 ?? null;
  } catch {
    return null;
  }
}

const PLAIN_EXTS = ['.json', '.srt', '.txt', '.vtt', '.tsv'];

/**
 * Move the transcript FliTools saved under `fromVideo`'s name onto `toVideo`'s name (plain files
 * and engines/ copies), overwriting what is there: the result is newer than anything the rename
 * carried over. With `sha`, only files whose json is for that content move. Returns the targets.
 */
export async function relocateTranscripts(
  fromVideo: string,
  toVideo: string,
  sha?: string | null
): Promise<string[]> {
  const fromDir = transcriptsDirOf(fromVideo);
  const toDir = transcriptsDirOf(toVideo);
  const fromBase = path.basename(fromVideo, path.extname(fromVideo));
  const toBase = path.basename(toVideo, path.extname(toVideo));
  if (fromDir === toDir && fromBase === toBase) return [];
  const moved: string[] = [];
  const move = async (from: string, to: string) => {
    if (!(await fs.pathExists(from))) return;
    await fs.move(from, to, { overwrite: true });
    moved.push(to);
  };

  const plainJson = path.join(fromDir, `${fromBase}.json`);
  if (!sha || (await shaOf(plainJson)) === sha) {
    for (const ext of PLAIN_EXTS) {
      await move(path.join(fromDir, `${fromBase}${ext}`), path.join(toDir, `${toBase}${ext}`));
    }
  }

  // engines/<base>.<engine>.<ext>: move each engine's set when its own json is for this content
  const copies = await engineCopiesFor(fromDir, fromBase);
  const engines = new Set(copies.map((f) => f.slice(fromBase.length + 1).split('.')[0]));
  for (const engine of engines) {
    const json = path.join(fromDir, ENGINE_COPIES_DIR, `${fromBase}.${engine}.json`);
    if (sha && (await shaOf(json)) !== sha) continue;
    await fs.ensureDir(path.join(toDir, ENGINE_COPIES_DIR));
    for (const f of copies.filter((c) => c.startsWith(`${fromBase}.${engine}.`))) {
      await move(
        path.join(fromDir, ENGINE_COPIES_DIR, f),
        path.join(toDir, ENGINE_COPIES_DIR, toBase + f.slice(fromBase.length))
      );
    }
  }
  if (moved.length) {
    console.log(`[follow] ${fromBase} → ${toBase}: moved ${moved.length} transcript file(s) to the take's current name`);
  }
  return moved;
}

/** True when the take's plain transcript is FliTools' edit-grade (pass 2) one. */
export async function hasEditGradeTranscript(videoPath: string): Promise<boolean> {
  const base = path.basename(videoPath, path.extname(videoPath));
  try {
    const t = JSON.parse(
      await fs.readFile(path.join(transcriptsDirOf(videoPath), `${base}.json`), 'utf8')
    ) as { verbatim?: boolean };
    return t.verbatim === true;
  } catch {
    return false;
  }
}
