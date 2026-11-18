// A Cap export lands in the watch folder (Angela's: ~/dev/video-projects/_incoming) exactly like an Ecamm take
// (Cap build, decision (a), 2026-11-18). FliStudio's `cap.export` writes `.<name>.mp4.part`, then renames it to
// `<project>-cap-<time>.mp4`. The watcher must ignore the working file and every `.cap` package, and report the
// finished MP4 once, whole. Every file here is a fake in a temp folder, never David's or Angela's real inbox.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createWatcher } from '../watcher.js';
import type { FileInfo } from '../../../shared/types.js';

let inbox: string;
let seen: FileInfo[];
let watcher: ReturnType<typeof createWatcher> | null;

const until = async (ok: () => boolean, ms = 12_000) => {
  const end = Date.now() + ms;
  while (!ok() && Date.now() < end) await new Promise((r) => setTimeout(r, 100));
};
const ready = (w: NonNullable<typeof watcher>) =>
  new Promise<void>((r) => w.on('ready', () => r()));

beforeEach(() => {
  inbox = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-incoming-'));
  seen = [];
  watcher = null;
});
afterEach(async () => {
  await watcher?.close();
  fs.rmSync(inbox, { recursive: true, force: true });
});

describe('Cap export in the FliHub watch folder', () => {
  it('lists the finished MP4 once; ignores the .part working file and .cap packages', async () => {
    watcher = createWatcher(inbox, (f) => seen.push(f));
    await ready(watcher);

    // What cap.export does: a working file FliHub does not watch, a rename when whole.
    const part = path.join(inbox, '.a01-xmen-cap-2026-11-18-140509.mp4.part');
    fs.writeFileSync(part, Buffer.alloc(4096, 1));
    // A raw Cap package dropped here by hand is a folder of tracks, never a take.
    fs.mkdirSync(path.join(inbox, 'Display 2026-11-18.cap', 'content'), { recursive: true });
    fs.writeFileSync(path.join(inbox, 'Display 2026-11-18.cap', 'content', 'segment-0.mp4'), 'raw');
    await new Promise((r) => setTimeout(r, 600));
    expect(seen).toEqual([]);

    const final = path.join(inbox, 'a01-xmen-cap-2026-11-18-140509.mp4');
    fs.renameSync(part, final);
    await until(() => seen.length > 0);
    await new Promise((r) => setTimeout(r, 400));

    expect(seen.map((f) => f.filename)).toEqual(['a01-xmen-cap-2026-11-18-140509.mp4']);
    expect(seen[0]!.size).toBe(4096);
  });
});
