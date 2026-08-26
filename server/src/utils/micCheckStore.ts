/**
 * MicCheck session store.
 *
 * STORAGE LOCATION DECISION: **global**, at `~/.flihub/miccheck/<sessionId>.json`.
 *
 * Reasoning, and why not project-scoped:
 *   1. MicCheck measures the HARDWARE and the ROOM, not a video project. The same
 *      gain setting and the same fans serve every project recorded in that room, so
 *      filing the measurement under one project misfiles it.
 *   2. It must work with no project selected. Mic calibration happens *before* you
 *      decide what you are recording, and FliHub tolerates an empty activeProject.
 *   3. Trend across sessions ("is the room getting worse?") needs one place to look,
 *      not a scatter of per-project folders to union.
 *   4. Precedent: `~/.flihub/storage-activity.jsonl` already lives here for the same
 *      kind of reason — it must outlive the folder it describes.
 *
 * The trade-off is that a report does not automatically travel with a take. That is
 * covered by recording `projectCode` as a field, so attaching a report to a take
 * later is a lookup rather than a migration.
 *
 * The store path is injectable so tests never touch the real user home.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import type {
  MicCheckSession,
  MicCheckTick,
  MicCheckEvent,
  MicCheckSummary,
  MicCheckNotMeasured,
  MicCheckSessionListEntry,
  MicCheckDevice,
} from '../../../shared/types.js';

export function defaultMicCheckDir(): string {
  return path.join(os.homedir(), '.flihub', 'miccheck');
}

/**
 * Hard cap on retained ticks. At the intended 1 Hz this is ~2 hours; a session that
 * runs longer keeps the most recent window and says so in `not_measured` rather than
 * growing without bound or silently dropping the oldest data.
 */
export const MAX_TICKS = 7200;

/** Only one run can be live at a time — there is one microphone and one operator. */
let activeSession: MicCheckSession | null = null;
let seriesTruncated = false;

export function getActiveSession(): MicCheckSession | null {
  return activeSession;
}

export interface StartSessionInput {
  device: MicCheckDevice;
  projectCode?: string | null;
  workletVersion?: string | null;
  constraints?: MicCheckSession['constraints'];
}

export function startSession(input: StartSessionInput): MicCheckSession {
  activeSession = {
    sessionId: randomUUID(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    projectCode: input.projectCode ?? null,
    workletVersion: input.workletVersion ?? null,
    device: input.device,
    constraints: input.constraints ?? null,
    probe: null,
    summary: null,
    series: [],
    events: [],
    roomReferenceLufs: null,
    not_measured: [],
  };
  seriesTruncated = false;
  return activeSession;
}

/** Returns false when the id does not match the live run — a stale client posting on. */
export function appendTick(sessionId: string, tick: MicCheckTick): boolean {
  if (!activeSession || activeSession.sessionId !== sessionId) return false;
  activeSession.series.push(tick);
  if (activeSession.series.length > MAX_TICKS) {
    activeSession.series.shift();
    seriesTruncated = true;
  }
  return true;
}

/** Record a timestamped observation on the live run. */
export function appendEvent(sessionId: string, event: MicCheckEvent): boolean {
  if (!activeSession || activeSession.sessionId !== sessionId) return false;
  activeSession.events.push(event);
  return true;
}

/** Store the ROOM-mode noise floor every later comparison is relative to. */
export function setRoomReference(sessionId: string, lufs: number | null): boolean {
  if (!activeSession || activeSession.sessionId !== sessionId) return false;
  activeSession.roomReferenceLufs = lufs;
  return true;
}

/**
 * Derive the summary from the series rather than trusting a client-supplied one.
 * Only ticks that were actually gradeable (window full AND speech present) feed the
 * loudness statistics — averaging room tone into the mean would drag it down and
 * report a quieter session than was ever spoken.
 */
export function summarise(series: MicCheckTick[]): MicCheckSummary {
  // Only SPEAKING ticks that actually contained speech are gradeable. Room-mode ticks are
  // measuring the enemy, not the voice; including them reports a quieter session than was
  // ever spoken.
  const gradeable = series.filter(
    (t) =>
      t.mode === 'speaking' &&
      t.windowFull &&
      t.speechDetected &&
      typeof t.shortTermLufs === 'number'
  );

  const lufsValues = gradeable.map((t) => t.shortTermLufs as number);
  const peaks = series
    .map((t) => t.samplePeakDbfs)
    .filter((v): v is number => typeof v === 'number');

  const loudness =
    lufsValues.length > 0
      ? {
          min: Math.min(...lufsValues),
          max: Math.max(...lufsValues),
          mean: lufsValues.reduce((s, v) => s + v, 0) / lufsValues.length,
        }
      : null;

  return {
    durationMs: series.length > 0 ? series[series.length - 1].t : 0,
    tickCount: series.length,
    measurableTickCount: gradeable.length,
    shortTermLufs: loudness,
    driftLu: loudness ? loudness.max - loudness.min : null,
    sessionPeakDbfs: peaks.length > 0 ? Math.max(...peaks) : null,
    clipCount: series.length > 0 ? series[series.length - 1].clipCount : 0,
    nearClipCount: series.length > 0 ? series[series.length - 1].nearClipCount : 0,
  };
}

/**
 * Everything Phase 1 does not measure, named explicitly with the reason.
 * Consumers must be able to distinguish "fine" from "never looked".
 */
export function buildNotMeasured(session: MicCheckSession): MicCheckNotMeasured[] {
  const entries: MicCheckNotMeasured[] = [
    {
      metric: 'truePeakDbtp',
      reason:
        'Phase 1 measures SAMPLE peak. True peak needs 4x oversampling (BS.1770-5 Annex 2); ' +
        'sample peak reads up to ~3 dB low on inter-sample peaks, so the figure is optimistic.',
    },
    {
      metric: 'snrDb',
      reason:
        'Signal-to-noise ratio (how far the voice sits above the fans) needs speech/pause ' +
        'gating to find a silent moment to measure against. Not implemented until Phase 2.',
    },
    {
      metric: 'integratedLufs',
      reason:
        'Gated whole-programme loudness is not computed. Phase 1 measures the 3 s short-term ' +
        'window only, because that is the meter you can set a knob by.',
    },
    {
      metric: 'plr',
      reason:
        'Peak-to-loudness ratio (how wide the dynamics are) requires integrated loudness, ' +
        'which Phase 1 does not compute. This is the number that explains why peaks mislead.',
    },
    {
      metric: 'spectrum',
      reason:
        'The frequency breakdown, and the stored room-tone reference it is compared against, ' +
        'are Phase 2. Without them the fan noise cannot be shown as a shape, only as a level.',
    },
    {
      metric: 'proximityIndex',
      reason:
        'How bass-heavy the voice is from mic distance (low-frequency vs speech-band energy). ' +
        'Needs per-band analysis — Phase 2.',
    },
    {
      metric: 'sibilanceIndex',
      reason:
        'How harsh the S sounds are (5-10 kHz vs speech-band energy). Needs per-band analysis ' +
        'and a speaker-adjustable band — Phase 2.',
    },
    {
      metric: 'popEvents',
      reason:
        'Plosive "pop" blasts from breath hitting the capsule. Needs low-frequency transient ' +
        'detection during speech — Phase 2.',
    },
    {
      metric: 'polarPattern',
      reason:
        'Which direction the mic is listening (cardioid / omni / bidirectional / stereo). ' +
        'Needs L/R correlation analysis, and correlation alone cannot separate three of the ' +
        'four modes — Phase 3.',
    },
  ];

  if (!session.probe) {
    entries.push({
      metric: 'systemProcessingProbe',
      reason:
        'The probe was not run. getSettings() cannot see below Chrome, so without it ' +
        '"no OS-level processing" and "processing Chrome cannot detect" are indistinguishable.',
    });
  }

  const summary = session.summary;
  if (summary && summary.measurableTickCount === 0) {
    entries.push({
      metric: 'shortTermLufs',
      reason:
        summary.tickCount === 0
          ? 'No samples were received during this session.'
          : 'No tick reached a full 3 s window with speech present — only room tone was captured.',
    });
  }

  if (session.roomReferenceLufs === null) {
    entries.push({
      metric: 'roomReference',
      reason:
        'ROOM mode was never captured, so there is no noise-floor reference. Any figure ' +
        'expressed as a change "vs the room" is therefore absent, not zero.',
    });
  }

  if (session.events.some((e) => e.kind === 'room-contaminated')) {
    entries.push({
      metric: 'roomReference.trustworthy',
      reason:
        'Speech was detected during the ROOM capture, so the reference describes a voice ' +
        'plus the room rather than the room alone. Treat comparisons against it as suspect.',
    });
  }

  if (seriesTruncated) {
    entries.push({
      metric: 'series.completeness',
      reason: `Session exceeded ${MAX_TICKS} ticks; the series holds the most recent ${MAX_TICKS} samples only.`,
    });
  }

  return entries;
}

export interface FinishSessionInput {
  sessionId: string;
  probe?: MicCheckSession['probe'];
  constraints?: MicCheckSession['constraints'];
  /** Extra caller-supplied not-measured entries, merged with the derived ones. */
  notMeasured?: MicCheckNotMeasured[];
}

/** Finalises the live run, writes it to disk, and clears the active slot. */
export async function finishSession(
  input: FinishSessionInput,
  dir: string = defaultMicCheckDir()
): Promise<MicCheckSession | null> {
  if (!activeSession || activeSession.sessionId !== input.sessionId) return null;

  const session = activeSession;
  session.finishedAt = new Date().toISOString();
  if (input.probe) session.probe = input.probe;
  if (input.constraints) session.constraints = input.constraints;
  session.summary = summarise(session.series);
  session.not_measured = [...buildNotMeasured(session), ...(input.notMeasured ?? [])];

  await writeSession(session, dir);

  activeSession = null;
  seriesTruncated = false;
  return session;
}

export async function writeSession(
  session: MicCheckSession,
  dir: string = defaultMicCheckDir()
): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${session.sessionId}.json`);
  await fs.writeFile(file, JSON.stringify(session, null, 2), 'utf8');
}

export async function readSession(
  sessionId: string,
  dir: string = defaultMicCheckDir()
): Promise<MicCheckSession | null> {
  // Guard against traversal — sessionId reaches here straight off the URL.
  if (!/^[0-9a-fA-F-]{8,64}$/.test(sessionId)) return null;
  try {
    const raw = await fs.readFile(path.join(dir, `${sessionId}.json`), 'utf8');
    return JSON.parse(raw) as MicCheckSession;
  } catch {
    return null;
  }
}

export async function listSessions(
  dir: string = defaultMicCheckDir(),
  limit = 50
): Promise<MicCheckSessionListEntry[]> {
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }

  const entries: MicCheckSessionListEntry[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(dir, name), 'utf8');
      const s = JSON.parse(raw) as MicCheckSession;
      entries.push({
        sessionId: s.sessionId,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        projectCode: s.projectCode,
        deviceLabel: s.device?.label ?? 'unknown',
        summary: s.summary,
        probeVerdict: s.probe?.verdict ?? null,
      });
    } catch {
      // A corrupt report must not hide every other report.
      continue;
    }
  }

  entries.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return entries.slice(0, limit);
}

/** Test seam — drop any live run between cases. */
export function __resetActiveSession(): void {
  activeSession = null;
  seriesTruncated = false;
}
