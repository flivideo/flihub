/**
 * MicCheck store tests.
 *
 * The properties worth protecting are the honesty ones: a summary must never invent
 * a number it did not measure, `not_measured` must name what was skipped and why,
 * and room tone must never be averaged into the speech statistics.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  startSession,
  appendTick,
  finishSession,
  getActiveSession,
  summarise,
  buildNotMeasured,
  readSession,
  listSessions,
  __resetActiveSession,
  MAX_TICKS,
} from '../utils/micCheckStore.js';
import type { MicCheckTick, MicCheckSession } from '../../../shared/types.js';

let dir: string;

const DEVICE = { label: 'HyperX QuadCast', sampleRate: 48000, channelCount: 2, sampleSize: 16 };

function tick(over: Partial<MicCheckTick> = {}): MicCheckTick {
  return {
    t: 0,
    shortTermLufs: -23,
    samplePeakDbfs: -12,
    clipCount: 0,
    nearClipCount: 0,
    windowFull: true,
    hasSpeech: true,
    ...over,
  };
}

beforeEach(async () => {
  __resetActiveSession();
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'miccheck-'));
});

afterEach(async () => {
  __resetActiveSession();
  await fs.rm(dir, { recursive: true, force: true });
});

describe('session lifecycle', () => {
  it('starts a session and exposes it as active', () => {
    const session = startSession({ device: DEVICE });
    expect(session.sessionId).toBeTruthy();
    expect(getActiveSession()?.sessionId).toBe(session.sessionId);
    expect(session.finishedAt).toBeNull();
  });

  it('accepts ticks for the live session', () => {
    const session = startSession({ device: DEVICE });
    expect(appendTick(session.sessionId, tick({ t: 1000 }))).toBe(true);
    expect(getActiveSession()?.series).toHaveLength(1);
  });

  it('rejects ticks for a stale session id', () => {
    startSession({ device: DEVICE });
    expect(appendTick('not-the-live-one', tick())).toBe(false);
  });

  it('rejects ticks after the session is finished', async () => {
    const session = startSession({ device: DEVICE });
    appendTick(session.sessionId, tick());
    await finishSession({ sessionId: session.sessionId }, dir);
    expect(appendTick(session.sessionId, tick())).toBe(false);
    expect(getActiveSession()).toBeNull();
  });

  it('writes the report to disk and can read it back', async () => {
    const session = startSession({ device: DEVICE, projectCode: 'd01-test' });
    appendTick(session.sessionId, tick({ t: 1000 }));
    const finished = await finishSession({ sessionId: session.sessionId }, dir);

    expect(finished).not.toBeNull();
    const onDisk = await readSession(session.sessionId, dir);
    expect(onDisk?.sessionId).toBe(session.sessionId);
    expect(onDisk?.projectCode).toBe('d01-test');
    expect(onDisk?.finishedAt).toBeTruthy();
  });

  it('refuses to finish an id that is not the live run', async () => {
    startSession({ device: DEVICE });
    expect(await finishSession({ sessionId: 'wrong-id' }, dir)).toBeNull();
  });

  it('caps the retained series and flags the truncation', async () => {
    const session = startSession({ device: DEVICE });
    for (let i = 0; i < MAX_TICKS + 10; i++) appendTick(session.sessionId, tick({ t: i * 1000 }));
    expect(getActiveSession()?.series).toHaveLength(MAX_TICKS);

    const finished = await finishSession({ sessionId: session.sessionId }, dir);
    expect(finished?.not_measured.some((n) => n.metric === 'series.completeness')).toBe(true);
  });
});

describe('summarise', () => {
  it('computes min, max, mean and drift over gradeable ticks', () => {
    const summary = summarise([
      tick({ t: 1000, shortTermLufs: -20 }),
      tick({ t: 2000, shortTermLufs: -30 }),
      tick({ t: 3000, shortTermLufs: -25 }),
    ]);
    expect(summary.shortTermLufs).toEqual({ min: -30, max: -20, mean: -25 });
    expect(summary.driftLu).toBe(10);
    expect(summary.measurableTickCount).toBe(3);
  });

  it('EXCLUDES room tone from the loudness statistics', () => {
    // Averaging silence into the mean would report a quieter session than was
    // ever actually spoken, and would make a good take look like a bad one.
    const summary = summarise([
      tick({ t: 1000, shortTermLufs: -23, hasSpeech: true }),
      tick({ t: 2000, shortTermLufs: -61, hasSpeech: false }),
      tick({ t: 3000, shortTermLufs: -23, hasSpeech: true }),
    ]);
    expect(summary.shortTermLufs?.mean).toBe(-23);
    expect(summary.measurableTickCount).toBe(2);
    expect(summary.tickCount).toBe(3);
  });

  it('excludes ticks whose 3 s window had not filled', () => {
    const summary = summarise([
      tick({ t: 1000, shortTermLufs: -40, windowFull: false }),
      tick({ t: 2000, shortTermLufs: -23, windowFull: true }),
    ]);
    expect(summary.shortTermLufs?.mean).toBe(-23);
  });

  it('returns NULL loudness when nothing was gradeable — never 0', () => {
    const summary = summarise([tick({ shortTermLufs: null, hasSpeech: false, windowFull: false })]);
    expect(summary.shortTermLufs).toBeNull();
    expect(summary.driftLu).toBeNull();
    expect(summary.measurableTickCount).toBe(0);
  });

  it('returns null session peak when no peak was ever observed', () => {
    expect(summarise([tick({ samplePeakDbfs: null })]).sessionPeakDbfs).toBeNull();
  });

  it('takes clip counts from the final tick, since they are cumulative', () => {
    const summary = summarise([
      tick({ t: 1000, clipCount: 0, nearClipCount: 1 }),
      tick({ t: 2000, clipCount: 2, nearClipCount: 5 }),
    ]);
    expect(summary.clipCount).toBe(2);
    expect(summary.nearClipCount).toBe(5);
  });

  it('distinguishes a steady session from a drifting one', () => {
    const steady = summarise([
      tick({ t: 1000, shortTermLufs: -23 }),
      tick({ t: 2000, shortTermLufs: -23.4 }),
    ]);
    const drifting = summarise([
      tick({ t: 1000, shortTermLufs: -23 }),
      tick({ t: 2000, shortTermLufs: -35 }),
    ]);
    expect(steady.driftLu).toBeLessThan(1);
    expect(drifting.driftLu).toBeGreaterThan(10);
  });

  it('handles an empty series without throwing', () => {
    const summary = summarise([]);
    expect(summary.tickCount).toBe(0);
    expect(summary.shortTermLufs).toBeNull();
    expect(summary.durationMs).toBe(0);
  });
});

describe('not_measured — the grey-never-becomes-green rule as data', () => {
  const base = (over: Partial<MicCheckSession> = {}): MicCheckSession => ({
    sessionId: 'x',
    startedAt: '',
    finishedAt: null,
    projectCode: null,
    workletVersion: '1.0.0',
    device: DEVICE,
    constraints: null,
    probe: null,
    summary: summarise([tick()]),
    series: [],
    not_measured: [],
    ...over,
  });

  it('names every Phase 2+ metric that was not measured', () => {
    const metrics = buildNotMeasured(base()).map((n) => n.metric);
    for (const expected of ['truePeakDbtp', 'snrDb', 'spectrum', 'proximityIndex', 'polarPattern']) {
      expect(metrics).toContain(expected);
    }
  });

  it('gives a reason for every entry', () => {
    for (const entry of buildNotMeasured(base())) {
      expect(entry.reason.length).toBeGreaterThan(10);
    }
  });

  it('flags the processing probe when it was never run', () => {
    const entry = buildNotMeasured(base()).find((n) => n.metric === 'systemProcessingProbe');
    expect(entry).toBeTruthy();
    expect(entry!.reason).toMatch(/cannot see below Chrome/);
  });

  it('does NOT flag the probe when it was run', () => {
    const withProbe = base({
      probe: {
        verdict: 'clean',
        findings: [],
        capturedLevelDbfs: -30,
        levelDriftDb: 0.5,
        deepestNotchDb: -3,
      },
    });
    expect(buildNotMeasured(withProbe).some((n) => n.metric === 'systemProcessingProbe')).toBe(false);
  });

  it('flags loudness as unmeasured when only room tone was captured', () => {
    const roomToneOnly = base({ summary: summarise([tick({ hasSpeech: false })]) });
    const entry = buildNotMeasured(roomToneOnly).find((n) => n.metric === 'shortTermLufs');
    expect(entry).toBeTruthy();
    expect(entry!.reason).toMatch(/only room tone/i);
  });

  it('distinguishes "no samples at all" from "room tone only"', () => {
    const noSamples = base({ summary: summarise([]) });
    const entry = buildNotMeasured(noSamples).find((n) => n.metric === 'shortTermLufs');
    expect(entry!.reason).toMatch(/No samples/i);
  });

  it('always warns that peak is sample peak, not true peak', () => {
    const entry = buildNotMeasured(base()).find((n) => n.metric === 'truePeakDbtp');
    expect(entry!.reason).toMatch(/optimistic/);
  });
});

describe('listSessions', () => {
  it('returns an empty list when the directory does not exist', async () => {
    expect(await listSessions(path.join(dir, 'nope'))).toEqual([]);
  });

  it('lists finished sessions newest first', async () => {
    for (const code of ['a', 'b']) {
      const s = startSession({ device: DEVICE, projectCode: code });
      appendTick(s.sessionId, tick());
      await finishSession({ sessionId: s.sessionId }, dir);
      await new Promise((r) => setTimeout(r, 5));
    }
    const list = await listSessions(dir);
    expect(list).toHaveLength(2);
    expect(list[0].startedAt >= list[1].startedAt).toBe(true);
    expect(list[0].deviceLabel).toBe('HyperX QuadCast');
  });

  it('skips a corrupt report instead of hiding every other one', async () => {
    const s = startSession({ device: DEVICE });
    appendTick(s.sessionId, tick());
    await finishSession({ sessionId: s.sessionId }, dir);
    await fs.writeFile(path.join(dir, 'broken.json'), '{ not json', 'utf8');

    const list = await listSessions(dir);
    expect(list).toHaveLength(1);
  });
});

describe('readSession path safety', () => {
  it('refuses a traversal attempt in the session id', async () => {
    expect(await readSession('../../../etc/passwd', dir)).toBeNull();
  });

  it('returns null for an unknown but well-formed id', async () => {
    expect(await readSession('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', dir)).toBeNull();
  });
});
