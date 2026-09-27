// B584 language (orch ruling, option 1, 2026-09-27): the language sent to FliTools comes from the
// project's fli.studio.json `languages` — exactly one → that code; several → 'auto'; none → 'en'.
// 'auto' guesses from the first ~30 s and short takes get misread, so a declared language wins.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { transcriptionLanguageFor } from '../utils/transcriptionLanguage.js';

let tmp: string;
beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lang-')); });
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

const project = (languages?: string[]) => {
  const dir = path.join(tmp, 'a01-project');
  fs.mkdirSync(path.join(dir, 'hub', 'recordings'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'hub', 'recordings', '01-1-intro.mov'), 'x');
  const identity: Record<string, unknown> = {
    schema: 1, id: '956b85b5-79d2-4035-bf2c-8182a131718b', brand: 'beauty-and-joy', code: 'a01',
    name: 'Test', createdAt: '2026-09-27T00:00:00.000Z',
  };
  if (languages) identity.languages = languages;
  fs.writeFileSync(path.join(dir, 'fli.studio.json'), JSON.stringify(identity));
  return path.join(dir, 'hub', 'recordings', '01-1-intro.mov');
};

describe('transcriptionLanguageFor', () => {
  it('exactly one declared language → that code (Thai B&J project → th)', async () => {
    expect(await transcriptionLanguageFor(project(['th']))).toBe('th');
  });
  it('several declared → auto', async () => {
    expect(await transcriptionLanguageFor(project(['en', 'th']))).toBe('auto');
  });
  it('none declared → en (today\'s behaviour)', async () => {
    expect(await transcriptionLanguageFor(project())).toBe('en');
  });
  it('no fli.studio.json / invalid one → en', async () => {
    const dir = path.join(tmp, 'plain', 'recordings');
    fs.mkdirSync(dir, { recursive: true });
    expect(await transcriptionLanguageFor(path.join(dir, '01-1-x.mov'))).toBe('en');
    const bad = project(['th']);
    fs.writeFileSync(path.join(tmp, 'a01-project', 'fli.studio.json'), '{not json');
    expect(await transcriptionLanguageFor(bad)).toBe('en');
  });
});
