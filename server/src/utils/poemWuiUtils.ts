// Domain logic extracted from routes/poem-wui.ts (FR-144)
import path from 'path';
import fs from 'fs-extra';
import { getProjectPaths } from '../../../shared/paths.js';
import { readDirSafe } from './filesystem.js';
import { stripSrt } from './srtUtils.js';

// Bundled fallback brand config (committed to repo, works on any machine)
export const BUNDLED_BRAND_CONFIG = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../brand-config.json'
);

// Map raw brand-config.json shape → WUI seed data contract shape
export function mapBrandConfig(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const ctas = (r.ctas ?? {}) as Record<string, unknown>;
  const descTpl = (r.descriptionTemplate ?? {}) as Record<string, unknown>;
  return {
    primaryCta:      ctas.primaryCta ?? null,
    foldCta:         ctas.foldCta ?? null,
    affiliates:      r.affiliates ?? [],
    socialLinks:     r.socialLinks ?? {},
    legalDisclosure: descTpl.legalDisclosure ?? '',
    relatedVideos:   [],
  };
}

// Load brand config: try configured path first, then fall back to bundled file
export async function loadBrandConfig(configPath: string | undefined): Promise<{ data: unknown; found: boolean; path: string | null; error?: string }> {
  const candidates = configPath ? [configPath, BUNDLED_BRAND_CONFIG] : [BUNDLED_BRAND_CONFIG];
  for (const p of candidates) {
    try {
      const raw = await fs.readFile(p, 'utf-8');
      return { data: mapBrandConfig(JSON.parse(raw)), found: true, path: p };
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.error(`[poem-wui] Brand config at ${p} contains invalid JSON:`, err.message);
        return { data: null, found: true, path: p, error: `Brand config file is corrupt (invalid JSON): ${err.message}` };
      }
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        continue; // file not found — try next candidate
      }
      throw err; // unexpected error — surface it
    }
  }
  return { data: null, found: false, path: configPath ?? null };
}

// Extract first ~50 words from plain text (strips SRT formatting first)
export function firstWords(content: string, count = 50): string {
  const plain = stripSrt(content);
  return plain.split(/\s+/).filter(Boolean).slice(0, count).join(' ');
}

// Find first transcript (.txt preferred, .srt fallback) for a chapter prefix
async function readChapterTranscript(transcriptsDir: string, chapterPrefix: string): Promise<string | null> {
  try {
    const files = await readDirSafe(transcriptsDir);
    const prefix = `${chapterPrefix}-`;
    // .txt files only, skip -chapter.txt combined files
    const txt = files.find((f) => f.startsWith(prefix) && f.endsWith('.txt') && !f.endsWith('-chapter.txt'));
    if (txt) return fs.readFile(path.join(transcriptsDir, txt), 'utf-8');
    // fallback to .srt
    const srt = files.find((f) => f.startsWith(prefix) && f.endsWith('.srt'));
    if (srt) return fs.readFile(path.join(transcriptsDir, srt), 'utf-8');
  } catch { /* dir not found */ }
  return null;
}

// Find ALL SRT files: s3-staging/post/ → final/ → recording-transcripts/
// Uses the first directory that has any SRTs, concatenates all of them.
export async function findAllSrts(projectDir: string): Promise<{
  names: string[];
  rawContent: string;
  transcript: string;
} | null> {
  const scanDirs = [
    path.join(projectDir, 's3-staging', 'post'),
    path.join(projectDir, 'final'),
    path.join(projectDir, 'recording-transcripts'),
  ];
  for (const dir of scanDirs) {
    try {
      const files = (await fs.readdir(dir))
        .filter((f) => !f.startsWith('.') && f.endsWith('.srt'))
        .sort();
      if (files.length > 0) {
        const contents = await Promise.all(
          files.map((f) => fs.readFile(path.join(dir, f), 'utf-8'))
        );
        const rawContent = contents.join('\n');
        const transcript = contents.map(stripSrt).join('\n');
        return { names: files, rawContent, transcript };
      }
    } catch { /* dir not found */ }
  }
  return null;
}

// Build fliHubChapters array: scan recordings dirs, pull first 50 words from each chapter transcript
export async function buildFliHubChapters(projectDir: string): Promise<{ folderNumber: string; chapterName: string; firstWords: string | null }[]> {
  const paths = getProjectPaths(projectDir);
  const chapterMap = new Map<string, string>();
  for (const dir of [paths.recordings, paths.safe]) {
    const files = (await readDirSafe(dir)).sort();
    for (const file of files) {
      const match = file.match(/^(\d{2})-\d+-([a-z][a-z0-9-]*?)(?:-[A-Z]+)*\.[a-z0-9]+$/);
      if (match) {
        const [, prefix, name] = match;
        if (!chapterMap.has(prefix)) chapterMap.set(prefix, name);
      }
    }
  }
  const chapterPrefixes = [...chapterMap.keys()].sort();
  return Promise.all(
    chapterPrefixes.map(async (prefix) => {
      const content = await readChapterTranscript(paths.transcripts, prefix);
      return {
        folderNumber: prefix,
        chapterName: chapterMap.get(prefix) ?? '',
        firstWords: content ? firstWords(content) : null,
      };
    })
  );
}
