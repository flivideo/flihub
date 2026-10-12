import { describe, it, expect } from 'vitest';
import { insertIncoming } from '../incomingOrder';
import type { FileInfo } from '../../../../shared/types';

const take = (filename: string, timestamp = '2026-10-12T00:00:00Z'): FileInfo => ({
  path: `/ecamm/${filename}`,
  filename,
  timestamp,
  size: 1,
});

describe('insertIncoming', () => {
  it('keeps name order when a take comes back after a rename (newer mtime, arrives last)', () => {
    let files: FileInfo[] = [];
    for (const n of ['09.19.05', '09.19.52', '09.20.19']) {
      files = insertIncoming(files, take(`Ecamm Recording on 2026-10-12 at ${n}.mov`));
    }
    files = insertIncoming(files, take('Ecamm Recording on 2026-10-12 at 09.18.09.mov', '2026-10-12T09:40:00Z'));
    expect(files.map((f) => f.filename.slice(-12))).toEqual([
      '09.18.09.mov',
      '09.19.05.mov',
      '09.19.52.mov',
      '09.20.19.mov',
    ]);
  });

  it('orders numbers numerically', () => {
    const files = [take('take 10.mov'), take('take 9.mov')].reduce<FileInfo[]>(insertIncoming, []);
    expect(files.map((f) => f.filename)).toEqual(['take 9.mov', 'take 10.mov']);
  });
});
