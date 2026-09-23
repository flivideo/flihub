// Aspect check (David, 2026-09-23): "FliHub, knowing that it was meant to be receiving 9:16 videos,
// [should give] a big warning … on anything that doesn't match the way the project was set up."
// Real case: Beauty & Joy a01 — Ecamm put a portrait feed into a 1920×1080 canvas (a 608×1080
// picture, 68% black). So two checks: the file's frame against the project aspect, AND the real
// picture inside any black bars (ffmpeg cropdetect). Report only — never blocks or moves a file.
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readIdentity, type ProjectAspect } from '@flivideo/core';
import type { AspectCheck, ProjectAspectValue } from '../../../shared/types.js';

const run = promisify(execFile);

// Compile-time guard: shared/types.ts ProjectAspectValue must equal fli-core's ProjectAspect.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _aspectValuesMatchFliCore: Same<ProjectAspect, ProjectAspectValue> = true;
void _aspectValuesMatchFliCore;

export interface Size {
  width: number;
  height: number;
}

const RATIO: Record<ProjectAspectValue, number> = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 };
const LABEL: Record<ProjectAspectValue, string> = {
  '16:9': '16:9 landscape',
  '9:16': '9:16 portrait',
  '1:1': '1:1 square',
};
const CANVAS: Record<ProjectAspectValue, string> = {
  '16:9': '1920×1080',
  '9:16': '1080×1920',
  '1:1': '1080×1080',
};
/** Ratios within 3% count as the same shape (1080×1920 vs 1088×1920 encoder padding). */
const RATIO_TOLERANCE = 0.03;
/** A picture covering less than 90% of the frame is boxed (pillar/letterbox), not noise. */
const BOXED_BELOW = 0.9;

const near = (a: number, b: number) => Math.abs(a - b) / b <= RATIO_TOLERANCE;
const dims = (s: Size) => `${s.width}×${s.height}`;

/** Display size of the first video stream, with a ±90° rotation applied. null when unreadable. */
export async function probeFrame(file: string): Promise<Size | null> {
  try {
    const { stdout } = await run('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height:stream_tags=rotate:stream_side_data=rotation',
      '-of', 'json',
      file,
    ]);
    const stream = JSON.parse(stdout)?.streams?.[0];
    if (!stream?.width || !stream?.height) return null;
    const sideRotation = (stream.side_data_list ?? []).find((d: { rotation?: number }) => d.rotation !== undefined)?.rotation;
    const rotation = Number(sideRotation ?? stream.tags?.rotate ?? 0);
    const quarterTurn = Math.abs(rotation) % 180 === 90;
    return quarterTurn ? { width: stream.height, height: stream.width } : { width: stream.width, height: stream.height };
  } catch {
    return null;
  }
}

/**
 * The real picture inside any black bars, via ffmpeg cropdetect at a few points in the take.
 * Takes the LARGEST crop seen, so one dark scene can't shrink the picture. null when unreadable.
 */
export async function detectPicture(file: string, durationSec?: number): Promise<Size | null> {
  const points = durationSec && durationSec > 2 ? [0.2, 0.5, 0.8].map((f) => f * durationSec) : [0];
  let best: Size | null = null;
  for (const at of points) {
    try {
      const { stderr } = await run('ffmpeg', [
        '-hide_banner', '-nostats',
        '-ss', at.toFixed(2),
        '-i', file,
        '-frames:v', '8',
        '-vf', 'cropdetect=limit=24:round=2:reset=0',
        '-f', 'null', '-',
      ]);
      const crops = [...stderr.matchAll(/crop=(\d+):(\d+):\d+:\d+/g)];
      const last = crops[crops.length - 1];
      if (!last) continue;
      const size = { width: Number(last[1]), height: Number(last[2]) };
      if (!best || size.width * size.height > best.width * best.height) best = size;
    } catch {
      // a sample point past the end, or an unreadable frame — try the next
    }
  }
  return best;
}

/** Pure: compare frame + picture against the expected aspect. */
export function classifyAspect(
  expected: ProjectAspectValue,
  frame: Size,
  picture: Size | null,
): Omit<AspectCheck, 'checkedAt'> {
  const want = RATIO[expected];
  const frameOk = near(frame.width / frame.height, want);
  const coverage = picture ? (picture.width * picture.height) / (frame.width * frame.height) : 1;
  const boxed = picture !== null && coverage < BOXED_BELOW;
  const pictureOk = boxed ? near(picture!.width / picture!.height, want) : frameOk;
  const base = { expected, frame, picture };
  const fix = `set Ecamm to a ${CANVAS[expected]} canvas`;
  const black = boxed ? ` (${Math.round((1 - coverage) * 100)}% black)` : '';

  if (frameOk && (!boxed || pictureOk)) {
    return { ...base, status: 'ok', message: `Matches ${LABEL[expected]} (${dims(frame)})` };
  }
  if (!frameOk && !boxed) {
    return { ...base, status: 'mismatch', message: `expected ${LABEL[expected]} · got ${dims(frame)} — ${fix}` };
  }
  if (!frameOk) {
    return {
      ...base,
      status: 'mismatch',
      message: `expected ${LABEL[expected]} · got ${dims(frame)} with a ${dims(picture!)} picture${black} — ${fix}`,
    };
  }
  // Frame is the right shape, but the picture inside it is not: the camera feed is wrong.
  return {
    ...base,
    status: 'mismatch',
    message: `expected ${LABEL[expected]} · the ${dims(frame)} canvas is right, but the picture inside is ${dims(picture!)}${black} — the camera/scene feed is the wrong shape`,
  };
}

export interface AspectCheckDeps {
  probeFrame: (file: string) => Promise<Size | null>;
  detectPicture: (file: string, durationSec?: number) => Promise<Size | null>;
  now: () => Date;
}

const realDeps: AspectCheckDeps = { probeFrame, detectPicture, now: () => new Date() };

/**
 * Check one take against the aspect declared in `<projectDir>/fli.studio.json`.
 * No aspect declared → `skipped` (never guessed from fli-core's 16:9 default: an undeclared
 * project must not shout). Never throws.
 */
export async function checkTakeAspect(
  file: string,
  projectDir: string,
  durationSec?: number,
  deps: AspectCheckDeps = realDeps,
): Promise<AspectCheck> {
  const checkedAt = deps.now().toISOString();
  let expected: ProjectAspectValue | undefined;
  try {
    const identity = projectDir ? await readIdentity(projectDir) : null;
    expected = identity?.kind === 'valid' ? identity.value.aspect : undefined;
  } catch {
    expected = undefined;
  }
  if (!expected) {
    return {
      status: 'skipped',
      message: 'Not checked: this project has no aspect set (fli.studio.json "aspect")',
      checkedAt,
    };
  }
  const frame = await deps.probeFrame(file);
  if (!frame) {
    return { status: 'unknown', expected, message: `Could not read the video size (ffprobe) — expected ${LABEL[expected]}`, checkedAt };
  }
  const picture = await deps.detectPicture(file, durationSec);
  return { ...classifyAspect(expected, frame, picture), checkedAt };
}
