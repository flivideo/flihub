/**
 * The language FliHub asks FliTools for (B584, orch ruling option 1, 2026-09-27). It comes from
 * the project's fli.studio.json `languages` (fli-core readIdentity): exactly one → that code;
 * several → 'auto'; none, or no valid identity → 'en', today's behaviour. 'auto' guesses from
 * the first ~30 s, and short takes (a count-in, a product name) get misread — so a declared
 * language always wins.
 */
import { readIdentity } from '@flivideo/core';
import { projectDirFromRecordingPath } from '../../../shared/paths.js';

export async function transcriptionLanguageFor(videoPath: string): Promise<string> {
  const projectDir = projectDirFromRecordingPath(videoPath);
  if (!projectDir) return 'en';
  try {
    const identity = await readIdentity(projectDir);
    const languages = identity?.kind === 'valid' ? identity.value.languages ?? [] : [];
    if (languages.length === 1) return languages[0];
    if (languages.length > 1) return 'auto';
  } catch {
    // unreadable identity → the default below
  }
  return 'en';
}
