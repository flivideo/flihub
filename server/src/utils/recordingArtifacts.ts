/**
 * FR-156: Discover every file that belongs to a recording.
 *
 * Renaming a take fans it out across three folders — the .mov itself, a low-res
 * shadow (FR-83) and a transcript set (FR-30). Deleting only the .mov leaves
 * orphans behind, so both the confirmation warning and the trash operation are
 * driven from this one function: what the user is warned about is exactly what
 * gets moved.
 */

import fs from 'fs-extra';
import path from 'path';
import { getProjectPaths } from '../../../shared/paths.js';

export type ArtifactKind = 'recording' | 'shadow' | 'transcript';

export interface RecordingArtifact {
  kind: ArtifactKind;
  /** Human-facing label for the confirmation dialog, e.g. "Transcript (.srt)" */
  label: string;
  /** Absolute path on disk */
  path: string;
  /** Basename, used as the destination name inside -trash/ */
  filename: string;
  size: number;
}

/** Transcript sidecars written by the transcription pipeline (FR-30). */
const TRANSCRIPT_EXTENSIONS = ['.json', '.srt', '.txt'] as const;

/** Shadow files are always .mp4 regardless of the source container (FR-83). */
const SHADOW_EXTENSION = '.mp4';

const SHADOWS_DIRNAME = 'recording-shadows';

/**
 * List the artifacts that exist on disk for a single recording.
 *
 * Only files that are actually present are returned — a take that was never
 * transcribed simply yields fewer entries. The recording itself is always first
 * when present, so callers can lead the warning with it.
 */
export async function findRecordingArtifacts(
  projectDirectory: string,
  filename: string
): Promise<RecordingArtifact[]> {
  const paths = getProjectPaths(projectDirectory);
  const base = path.basename(filename, path.extname(filename));

  const candidates: Array<Omit<RecordingArtifact, 'size'>> = [
    {
      kind: 'recording',
      label: 'Recording',
      path: path.join(paths.recordings, filename),
      filename,
    },
    {
      kind: 'shadow',
      label: 'Shadow (240p preview)',
      path: path.join(paths.project, SHADOWS_DIRNAME, `${base}${SHADOW_EXTENSION}`),
      filename: `${base}${SHADOW_EXTENSION}`,
    },
    ...TRANSCRIPT_EXTENSIONS.map((ext) => ({
      kind: 'transcript' as const,
      label: `Transcript (${ext})`,
      path: path.join(paths.transcripts, `${base}${ext}`),
      filename: `${base}${ext}`,
    })),
  ];

  const found: RecordingArtifact[] = [];
  for (const candidate of candidates) {
    try {
      const stats = await fs.stat(candidate.path);
      if (stats.isFile()) {
        found.push({ ...candidate, size: stats.size });
      }
    } catch {
      // Not present — nothing to trash for this artifact
    }
  }

  return found;
}

/**
 * Move an artifact into -trash/, suffixing on collision so an earlier trashed
 * take of the same name is never overwritten.
 */
export async function moveArtifactToTrash(
  trashDir: string,
  artifact: RecordingArtifact
): Promise<string> {
  await fs.ensureDir(trashDir);

  const ext = path.extname(artifact.filename);
  const base = path.basename(artifact.filename, ext);

  let destination = path.join(trashDir, artifact.filename);
  let counter = 1;
  while (await fs.pathExists(destination)) {
    destination = path.join(trashDir, `${base}-${counter}${ext}`);
    counter++;
  }

  await fs.move(artifact.path, destination);
  return destination;
}
