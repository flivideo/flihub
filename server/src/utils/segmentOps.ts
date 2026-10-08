/**
 * CT-0107: one guarded operation for changing the shape of a chapter after segments are already in recordings
 * (validated requirement: flivideo docs/briefs/flihub-segment-editing-requirement-2026-10-07.md).
 *
 * A segment number is a POSITION in the filename (`06-2-<slug>.mov`). Replace, insert, reorder and delete-and-close-up
 * are modes of one operation (R2–R5) that:
 *   1. plans every file it will touch — the recording, its transcripts (5 exts), FliTools engine copies and the
 *      image assets keyed `NN-S-…` — before touching any;
 *   2. refuses the WHOLE operation with a plain reason when any affected take is being transcribed, is referenced by a
 *      FliCut cut or the FliStudio cut draft, or a destination is already taken (R8);
 *   3. trashes, then renames two-phase (every file to a temp name first, then to its final name), so a swap or a shift
 *      can never meet itself and no half-renumbered chapter can exist; a failure rolls back what already moved;
 *   4. journals every move to `.flihub-segment-journal.json` in the project, so undo replays it in reverse — restoring
 *      from `-trash/` — even after a server restart (R9).
 *
 * FliCut / FliStudio following a renumber is out of scope: a referenced take refuses instead.
 */
import fs from 'fs-extra';
import path from 'path';
import { randomBytes } from 'crypto';
import { getProjectPaths, type ProjectPaths } from '../../../shared/paths.js';
import { NAMING_RULES, sanitizeName } from '../../../shared/naming.js';
import type { ProjectState, RecordingState, TranscriptionJob } from '../../../shared/types.js';
import { readProjectState, setRecordingPlaceholder, writeProjectState } from './projectState.js';
import { checkTranscriptionQueue } from './renameRecording.js';
import { ENGINE_COPIES_DIR, engineCopiesFor } from './transcriptFiles.js';

export const JOURNAL_FILE = '.flihub-segment-journal.json';
const TRANSCRIPT_EXTENSIONS = ['.txt', '.srt', '.json', '.vtt', '.tsv'];
const RECORDING = /^(\d{2})-(\d+)-(.+)\.(mov|mp4)$/i;
/** Files that may point at a take by path (assessment §1, "What gets orphaned"). */
const CUT_FILE = /^fli\.cut\..+\.json$|^fli\.studio\.cut-draft\.json$/;

export type SegmentOpInput =
  | {
      mode: 'replace';
      chapter: string;
      segment: number;
      source: string;
      name?: string;
      tags?: string[];
    }
  | {
      mode: 'insert';
      chapter: string;
      before: number;
      source: string;
      name: string;
      tags?: string[];
    }
  | { mode: 'reorder'; chapter: string; segment: number; direction: 'up' | 'down' }
  | { mode: 'delete'; chapter: string; segment: number };

export type BlockerKind =
  | 'invalid'
  | 'not-found'
  | 'ambiguous'
  | 'transcribing'
  | 'referenced'
  | 'collision'
  | 'nothing-to-undo';

export interface Blocker {
  kind: BlockerKind;
  /** The take or file it is about, when there is one. */
  file?: string;
  detail: string;
}

/** The whole operation was refused; nothing on disk changed. */
export class SegmentOpRefused extends Error {
  constructor(readonly blockers: Blocker[]) {
    super(blockers.map((b) => b.detail).join(' '));
    this.name = 'SegmentOpRefused';
  }
}

/** One file move, absolute paths, in the order it ran. */
export interface Step {
  from: string;
  to: string;
}

export interface JournalEntry {
  id: string;
  at: string;
  op: SegmentOpInput;
  /** One line a person can read: "replaced 06-1-old.mov with 06-1-new.mov". */
  summary: string;
  steps: Step[];
  /** Recording renames applied to `.flihub-state.json` (old filename → new filename). */
  renamed: Array<{ from: string; to: string }>;
  /** State entries dropped because their take went to the trash, with their place; undo puts them back there. */
  removed: Array<{ filename: string; entry: RecordingState; index: number }>;
  /** The promoted take, if any (undo sends it back to where it came from). */
  promoted: { source: string; filename: string } | null;
  /** Folders this op created; undo removes them again when empty. */
  createdDirs: string[];
  /** Written before the first move and cleared once the state is updated: a crash in between still leaves the moves. */
  pending?: boolean;
  undoneAt?: string;
}

interface Journal {
  version: 1;
  entries: JournalEntry[];
}

export interface SegmentOpDeps {
  activeJob: TranscriptionJob | null;
  queue: TranscriptionJob[];
  /** Where takes are sent in from (the watch folder); a source outside it is refused. */
  inboxDir?: string;
  now?: () => Date;
}

interface Take {
  filename: string;
  chapter: string;
  segment: number;
  /** Everything after `NN-S-`, extension included: `intro-CTA.mov`. */
  rest: string;
}

const base = (filename: string) => filename.replace(/\.(mov|mp4)$/i, '');
const withSegment = (t: Take, segment: number) => `${t.chapter}-${segment}-${t.rest}`;
const label = (chapter: string, segment: number) => `${chapter}-${segment}`;

// ── Reading the chapter ────────────────────────────────────────────────────────────────────────────────────────────────

async function chapterTakes(paths: ProjectPaths, chapter: string): Promise<Take[]> {
  const names = await fs.readdir(paths.recordings).catch(() => [] as string[]);
  return names
    .map((filename) => ({ filename, m: RECORDING.exec(filename) }))
    .filter(
      (x): x is { filename: string; m: RegExpExecArray } => x.m !== null && x.m[1] === chapter
    )
    .map(({ filename, m }) => ({
      filename,
      chapter,
      segment: Number(m[2]),
      rest: `${m[3]}.${m[4]}`,
    }))
    .sort((a, b) => a.segment - b.segment || a.filename.localeCompare(b.filename));
}

/** Every file that belongs to a take, as [absolute path, name relative to its folder] pairs that exist on disk. */
async function artifactsOf(paths: ProjectPaths, t: Take): Promise<string[]> {
  const b = base(t.filename);
  const candidates = [
    path.join(paths.recordings, t.filename),
    ...TRANSCRIPT_EXTENSIONS.map((ext) => path.join(paths.transcripts, `${b}${ext}`)),
    ...(await engineCopiesFor(paths.transcripts, b)).map((f) =>
      path.join(paths.transcripts, ENGINE_COPIES_DIR, f)
    ),
  ];
  // Image assets and their prompts: {chapter}-{seq}-{imgOrder}{variant}-{label}.{ext}
  const prefix = `${t.chapter}-${t.segment}-`;
  const images = await fs.readdir(paths.images).catch(() => [] as string[]);
  for (const f of images) {
    if (f.startsWith(prefix) && /^\d/.test(f.slice(prefix.length)))
      candidates.push(path.join(paths.images, f));
  }
  const found: string[] = [];
  for (const c of candidates) {
    if ((await fs.stat(c).catch(() => null))?.isFile()) found.push(c);
  }
  return found;
}

/** The same artifact under the take's new segment number. */
function renamedArtifact(paths: ProjectPaths, file: string, from: Take, segment: number): string {
  const dir = path.dirname(file);
  const name = path.basename(file);
  if (dir === paths.images) {
    return path.join(
      dir,
      `${from.chapter}-${segment}-${name.slice(`${from.chapter}-${from.segment}-`.length)}`
    );
  }
  const oldBase = base(from.filename);
  return path.join(dir, base(withSegment(from, segment)) + name.slice(oldBase.length));
}

/** Project-relative and absolute paths of every take a FliCut cut or the FliStudio cut draft mentions, by file. */
async function cutReferences(
  project: string
): Promise<Array<{ cut: string; strings: Set<string> }>> {
  const names = await fs.readdir(project).catch(() => [] as string[]);
  const out: Array<{ cut: string; strings: Set<string> }> = [];
  for (const cut of names.filter((n) => CUT_FILE.test(n))) {
    const strings = new Set<string>();
    try {
      const walk = (v: unknown): void => {
        if (typeof v === 'string') strings.add(v);
        else if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === 'object') Object.values(v).forEach(walk);
      };
      walk(JSON.parse(await fs.readFile(path.join(project, cut), 'utf8')));
    } catch {
      // An unreadable cut can't be proved safe: treat it as referencing everything.
      strings.add('*');
    }
    out.push({ cut, strings });
  }
  return out;
}

function referencedBy(
  cuts: Array<{ cut: string; strings: Set<string> }>,
  paths: ProjectPaths,
  filename: string
): string | null {
  const abs = path.join(paths.recordings, filename);
  const rel = path.relative(paths.project, abs).split(path.sep).join('/');
  for (const { cut, strings } of cuts) {
    if (strings.has('*') || strings.has(abs) || strings.has(rel)) return cut;
    for (const s of strings) if (s.endsWith(`/${filename}`) || s === filename) return cut;
  }
  return null;
}

// ── Journal ────────────────────────────────────────────────────────────────────────────────────────────────────────────

const journalPath = (project: string) => path.join(project, JOURNAL_FILE);

export async function readJournal(project: string): Promise<Journal> {
  try {
    const j = JSON.parse(await fs.readFile(journalPath(project), 'utf8')) as Journal;
    if (j.version === 1 && Array.isArray(j.entries)) return j;
  } catch {
    // Missing or unreadable: no history.
  }
  return { version: 1, entries: [] };
}

async function writeJournal(project: string, journal: Journal): Promise<void> {
  const file = journalPath(project);
  const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(journal, null, 2)}\n`);
  await fs.rename(tmp, file);
}

// ── Planning ───────────────────────────────────────────────────────────────────────────────────────────────────────────

interface Plan {
  summary: string;
  /** Takes whose files go to the trash. */
  trash: Take[];
  /** Takes that change segment number. */
  moves: Array<{ take: Take; segment: number }>;
  /** The inbox take promoted into the chapter. */
  promote: { source: string; filename: string } | null;
}

function validName(name: string | undefined): string | null {
  if (!name) return null;
  const clean = sanitizeName(name);
  return NAMING_RULES.name.pattern.test(clean) ? clean : null;
}

function planOf(op: SegmentOpInput, takes: Take[]): { plan?: Plan; blockers: Blocker[] } {
  const blockers: Blocker[] = [];
  const bySegment = (n: number) => takes.filter((t) => t.segment === n);
  const one = (n: number): Take | null => {
    const found = bySegment(n);
    if (found.length === 0) {
      blockers.push({ kind: 'not-found', detail: `There is no segment ${label(op.chapter, n)}.` });
      return null;
    }
    if (found.length > 1) {
      blockers.push({
        kind: 'ambiguous',
        file: found.map((t) => t.filename).join(', '),
        detail: `Segment ${label(op.chapter, n)} has ${found.length} recordings (${found.map((t) => t.filename).join(', ')}); delete the extra one first.`,
      });
      return null;
    }
    return found[0];
  };
  const tags = (list: string[] | undefined) =>
    (list ?? []).filter(Boolean).map((t) => t.toUpperCase());
  const promoted = (segment: number, name: string, tagList: string[]) =>
    `${op.chapter}-${segment}-${[name, ...tagList].join('-')}.mov`;
  const after = (n: number) => takes.filter((t) => t.segment > n);
  const atOrAfter = (n: number) => takes.filter((t) => t.segment >= n);
  const unique = (list: Take[]) => {
    for (const s of new Set(list.map((t) => t.segment))) one(s);
  };

  switch (op.mode) {
    case 'replace': {
      const old = one(op.segment);
      if (!old) return { blockers };
      const name = op.name === undefined ? null : validName(op.name);
      if (op.name !== undefined && !name) {
        return { blockers: [{ kind: 'invalid', detail: NAMING_RULES.name.errorMessage }] };
      }
      const filename = name
        ? promoted(op.segment, name, tags(op.tags))
        : `${op.chapter}-${op.segment}-${old.rest.replace(/\.(mov|mp4)$/i, '.mov')}`;
      return {
        plan: {
          summary: `replaced ${old.filename} with ${filename}`,
          trash: [old],
          moves: [],
          promote: { source: op.source, filename },
        },
        blockers,
      };
    }
    case 'insert': {
      const name = validName(op.name);
      if (!name) return { blockers: [{ kind: 'invalid', detail: NAMING_RULES.name.errorMessage }] };
      one(op.before);
      const shifted = atOrAfter(op.before);
      unique(shifted);
      const filename = promoted(op.before, name, tags(op.tags));
      return {
        plan: {
          summary: `inserted ${filename}; ${shifted.length} later segment(s) moved up one`,
          trash: [],
          moves: shifted.map((t) => ({ take: t, segment: t.segment + 1 })),
          promote: { source: op.source, filename },
        },
        blockers,
      };
    }
    case 'reorder': {
      const moving = one(op.segment);
      if (!moving) return { blockers };
      const neighbours = takes.filter((t) =>
        op.direction === 'up' ? t.segment < op.segment : t.segment > op.segment
      );
      if (neighbours.length === 0) {
        return {
          blockers: [
            {
              kind: 'invalid',
              file: moving.filename,
              detail: `${label(op.chapter, op.segment)} is already the ${op.direction === 'up' ? 'first' : 'last'} segment.`,
            },
          ],
        };
      }
      const otherSegment =
        op.direction === 'up'
          ? Math.max(...neighbours.map((t) => t.segment))
          : Math.min(...neighbours.map((t) => t.segment));
      const other = one(otherSegment);
      if (!other) return { blockers };
      return {
        plan: {
          summary: `moved ${moving.filename} ${op.direction} (swapped with ${other.filename})`,
          trash: [],
          moves: [
            { take: moving, segment: otherSegment },
            { take: other, segment: op.segment },
          ],
          promote: null,
        },
        blockers,
      };
    }
    case 'delete': {
      const gone = one(op.segment);
      if (!gone) return { blockers };
      const later = after(op.segment);
      unique(later);
      return {
        plan: {
          summary: `deleted ${gone.filename}; ${later.length} later segment(s) closed up`,
          trash: [gone],
          moves: later.map((t) => ({ take: t, segment: t.segment - 1 })),
          promote: null,
        },
        blockers,
      };
    }
  }
}

function checkInput(op: SegmentOpInput): Blocker[] {
  const out: Blocker[] = [];
  if (!op || typeof op !== 'object') return [{ kind: 'invalid', detail: 'No operation given.' }];
  if (!['replace', 'insert', 'reorder', 'delete'].includes(op.mode)) {
    return [{ kind: 'invalid', detail: 'mode must be replace, insert, reorder or delete.' }];
  }
  if (typeof op.chapter !== 'string' || !NAMING_RULES.chapter.pattern.test(op.chapter)) {
    out.push({ kind: 'invalid', detail: 'chapter must be two digits, e.g. "06".' });
  }
  const n = op.mode === 'insert' ? op.before : op.segment;
  if (!Number.isInteger(n) || n < 1)
    out.push({ kind: 'invalid', detail: 'segment must be a whole number ≥ 1.' });
  if (op.mode === 'reorder' && op.direction !== 'up' && op.direction !== 'down') {
    out.push({ kind: 'invalid', detail: 'direction must be up or down.' });
  }
  if (
    (op.mode === 'replace' || op.mode === 'insert') &&
    (typeof op.source !== 'string' || !path.isAbsolute(op.source))
  ) {
    out.push({
      kind: 'invalid',
      detail: 'source must be the absolute path of the take to send in.',
    });
  }
  return out;
}

// ── Running ────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A trash destination that is free now and not claimed by another step of this op (`-1`, `-2` on collision). */
async function trashDestination(
  trashDir: string,
  file: string,
  claimed: Set<string>
): Promise<string> {
  const name = path.basename(file);
  const ext = path.extname(name);
  const stem = path.basename(name, ext);
  let candidate = path.join(trashDir, name);
  for (let n = 1; claimed.has(candidate) || (await fs.pathExists(candidate)); n++) {
    candidate = path.join(trashDir, `${stem}-${n}${ext}`);
  }
  claimed.add(candidate);
  return candidate;
}

/** Put moved files back, newest first; answers the ones that could not go back. */
async function rollBack(done: Step[]): Promise<string[]> {
  const stuck: string[] = [];
  for (const s of [...done].reverse()) {
    try {
      await fs.move(s.to, s.from, { overwrite: false });
    } catch (e) {
      console.error(`[segment-op] rollback could not move ${s.to} back to ${s.from}:`, e);
      stuck.push(`${s.to} (belongs at ${s.from})`);
    }
  }
  return stuck;
}

/** Thrown when an operation stopped part-way; the message says whether everything went back. */
export class SegmentOpFailed extends Error {
  constructor(cause: unknown, stuck: string[]) {
    const why = cause instanceof Error ? cause.message : String(cause);
    super(
      stuck.length === 0
        ? `Nothing was changed: ${why} (every file was put back).`
        : `Stopped part-way: ${why}. These files could not be put back: ${stuck.join('; ')}.`
    );
    this.name = 'SegmentOpFailed';
  }
}

/** Run the steps in order; on any failure put back what already moved, then throw SegmentOpFailed. */
async function runSteps(steps: Step[]): Promise<void> {
  const done: Step[] = [];
  try {
    for (const s of steps) {
      await fs.ensureDir(path.dirname(s.to));
      await fs.move(s.from, s.to, { overwrite: false });
      done.push(s);
    }
  } catch (error) {
    throw new SegmentOpFailed(error, await rollBack(done));
  }
}

/** One operation (or undo) at a time per project: a double-click must not interleave two renumbers. */
const running = new Map<string, Promise<unknown>>();
function serialized<T>(project: string, work: () => Promise<T>): Promise<T> {
  const key = path.resolve(project);
  const next = (running.get(key) ?? Promise.resolve()).catch(() => undefined).then(work);
  running.set(key, next);
  return next.finally(() => {
    if (running.get(key) === next) running.delete(key);
  });
}

/** Rename recording keys in one pass (a swap must not clobber), dropping trashed takes; answers what was dropped. */
function remapState(
  state: ProjectState,
  renamed: Map<string, string>,
  dropped: Set<string>
): { state: ProjectState; removed: JournalEntry['removed'] } {
  const recordings: ProjectState['recordings'] = {};
  const removed: JournalEntry['removed'] = [];
  Object.entries(state.recordings ?? {}).forEach(([filename, entry], index) => {
    if (dropped.has(filename)) removed.push({ filename, entry, index });
    else recordings[renamed.get(filename) ?? filename] = entry;
  });
  let editManifest = state.editManifest;
  if (editManifest) {
    editManifest = { ...editManifest };
    for (const folder of ['edit-1st', 'edit-2nd', 'edit-final'] as const) {
      const m = editManifest[folder];
      if (m) {
        editManifest[folder] = {
          ...m,
          files: m.files.map((f) => ({ ...f, filename: renamed.get(f.filename) ?? f.filename })),
        };
      }
    }
  }
  return { state: { ...state, recordings, ...(editManifest ? { editManifest } : {}) }, removed };
}

async function guardTakes(
  paths: ProjectPaths,
  filenames: string[],
  deps: SegmentOpDeps
): Promise<Blocker[]> {
  const blockers: Blocker[] = [];
  const cuts = await cutReferences(paths.project);
  for (const filename of filenames) {
    if (checkTranscriptionQueue(filename, deps.activeJob, deps.queue)) {
      blockers.push({
        kind: 'transcribing',
        file: filename,
        detail: `${filename} is being transcribed; wait for it to finish.`,
      });
    }
    const cut = referencedBy(cuts, paths, filename);
    if (cut) {
      blockers.push({
        kind: 'referenced',
        file: filename,
        detail: `${filename} is used by ${cut}; changing it would make that cut play the wrong take.`,
      });
    }
  }
  return blockers;
}

/** Apply one guarded segment operation to the project. Throws SegmentOpRefused when anything blocks it. */
export function applySegmentOp(
  projectDir: string,
  op: SegmentOpInput,
  deps: SegmentOpDeps
): Promise<JournalEntry> {
  return serialized(projectDir, () => apply(projectDir, op, deps));
}

async function apply(
  projectDir: string,
  op: SegmentOpInput,
  deps: SegmentOpDeps
): Promise<JournalEntry> {
  const invalid = checkInput(op);
  if (invalid.length) throw new SegmentOpRefused(invalid);

  const paths = getProjectPaths(projectDir);
  const takes = await chapterTakes(paths, op.chapter);
  const { plan, blockers } = planOf(op, takes);
  if (!plan || blockers.length) throw new SegmentOpRefused(blockers);

  if (plan.promote) {
    const src = plan.promote.source;
    if (!(await fs.stat(src).catch(() => null))?.isFile()) {
      blockers.push({
        kind: 'not-found',
        file: src,
        detail: `The take to send in is not there: ${src}.`,
      });
    } else if (
      deps.inboxDir &&
      path.relative(path.resolve(deps.inboxDir), path.resolve(src)).startsWith('..')
    ) {
      blockers.push({
        kind: 'invalid',
        file: src,
        detail: `Takes are sent in from the inbox (${deps.inboxDir}); ${src} is outside it.`,
      });
    } else if (path.dirname(path.resolve(src)) === path.resolve(paths.recordings)) {
      blockers.push({
        kind: 'invalid',
        file: src,
        detail: 'The take to send in is already a recording.',
      });
    }
  }
  blockers.push(
    ...(await guardTakes(
      paths,
      [...plan.trash, ...plan.moves.map((m) => m.take)].map((t) => t.filename),
      deps
    ))
  );

  const id = `seg_${randomBytes(5).toString('hex')}`;
  const claimed = new Set<string>();
  const trashSteps: Step[] = [];
  for (const t of plan.trash) {
    for (const file of await artifactsOf(paths, t)) {
      trashSteps.push({ from: file, to: await trashDestination(paths.trash, file, claimed) });
    }
  }
  const moving: Array<{ from: string; to: string; tmp: string }> = [];
  for (const { take, segment } of plan.moves) {
    for (const file of await artifactsOf(paths, take)) {
      const to = renamedArtifact(paths, file, take, segment);
      moving.push({
        from: file,
        to,
        tmp: path.join(path.dirname(file), `.${id}-${path.basename(file)}`),
      });
    }
  }
  const promoteStep = plan.promote
    ? { from: plan.promote.source, to: path.join(paths.recordings, plan.promote.filename) }
    : null;

  // A destination is taken unless the file there is itself leaving in this op.
  const leaving = new Set([...trashSteps.map((s) => s.from), ...moving.map((m) => m.from)]);
  for (const to of [...moving.map((m) => m.to), ...(promoteStep ? [promoteStep.to] : [])]) {
    if ((await fs.pathExists(to)) && !leaving.has(to)) {
      blockers.push({
        kind: 'collision',
        file: path.basename(to),
        detail: `${path.basename(to)} already exists and is not part of this change.`,
      });
    }
  }
  if (blockers.length) throw new SegmentOpRefused(blockers);

  const createdDirs: string[] = [];
  for (const dir of [paths.trash, paths.recordings]) {
    if (
      !(await fs.pathExists(dir)) &&
      (dir === paths.recordings ? promoteStep : trashSteps.length)
    ) {
      createdDirs.push(dir);
    }
  }

  const steps: Step[] = [
    ...trashSteps,
    ...moving.map((m) => ({ from: m.from, to: m.tmp })),
    ...moving.map((m) => ({ from: m.tmp, to: m.to })),
    ...(promoteStep ? [promoteStep] : []),
  ];
  const renamed = new Map(plan.moves.map((m) => [m.take.filename, withSegment(m.take, m.segment)]));
  const entry: JournalEntry = {
    id,
    at: (deps.now?.() ?? new Date()).toISOString(),
    op,
    summary: plan.summary,
    steps,
    renamed: [...renamed].map(([from, to]) => ({ from, to })),
    removed: [],
    promoted: plan.promote,
    createdDirs,
    pending: true,
  };
  // The journal holds the moves BEFORE the first one, so even a crash mid-way leaves a record to undo from.
  const journal = await readJournal(projectDir);
  journal.entries.push(entry);
  await writeJournal(projectDir, journal);
  const forget = async () => {
    journal.entries = journal.entries.filter((e) => e.id !== id);
    await writeJournal(projectDir, journal);
  };

  try {
    await runSteps(steps);
  } catch (error) {
    await forget();
    throw error;
  }

  try {
    const state = await readProjectState(projectDir);
    const remapped = remapState(state, renamed, new Set(plan.trash.map((t) => t.filename)));
    await writeProjectState(projectDir, remapped.state);
    entry.removed = remapped.removed;
  } catch (error) {
    // The files moved but their state could not follow: put the files back rather than leave them half-done.
    const stuck = await rollBack(steps);
    if (stuck.length === 0) await forget();
    throw new SegmentOpFailed(error, stuck);
  }
  delete entry.pending;
  // The op has landed; the entry is already on disk (pending, with every step), so undo still works if this fails.
  await writeJournal(projectDir, journal).catch((e) =>
    console.error(`[segment-op] ${id} landed but its journal entry is still marked pending:`, e)
  );
  return entry;
}

/**
 * Undo the latest operation not yet undone (`id`, when given, must be that one): its steps replay in reverse, the
 * promoted take goes back to where it came from (any transcript made for it since goes to the trash), trashed files
 * come back from `-trash/`, and the state renames reverse. Guarded like the operation itself.
 */
export function undoSegmentOp(
  projectDir: string,
  deps: SegmentOpDeps,
  id?: string
): Promise<JournalEntry> {
  return serialized(projectDir, () => undo(projectDir, deps, id));
}

async function undo(projectDir: string, deps: SegmentOpDeps, id?: string): Promise<JournalEntry> {
  const paths = getProjectPaths(projectDir);
  const journal = await readJournal(projectDir);
  const entry = [...journal.entries].reverse().find((e) => !e.undoneAt);
  if (!entry)
    throw new SegmentOpRefused([
      { kind: 'nothing-to-undo', detail: 'There is no segment change to undo.' },
    ]);
  if (id && id !== entry.id) {
    throw new SegmentOpRefused([
      { kind: 'invalid', detail: `Only the latest change can be undone (${entry.summary}).` },
    ]);
  }

  const reverse: Step[] = [...entry.steps].reverse().map((s) => ({ from: s.to, to: s.from }));
  const blockers = await guardTakes(
    paths,
    [...entry.renamed.map((r) => r.to), ...(entry.promoted ? [entry.promoted.filename] : [])],
    deps
  );
  // Transcripts made for the promoted take since the op belong to a take that is leaving: trash them first.
  const extra: Step[] = [];
  if (entry.promoted) {
    const take = RECORDING.exec(entry.promoted.filename);
    if (take) {
      const t: Take = {
        filename: entry.promoted.filename,
        chapter: take[1],
        segment: Number(take[2]),
        rest: `${take[3]}.${take[4]}`,
      };
      const claimed = new Set<string>();
      for (const file of await artifactsOf(paths, t)) {
        if (path.dirname(file) === paths.recordings || path.dirname(file) === paths.images)
          continue;
        extra.push({ from: file, to: await trashDestination(paths.trash, file, claimed) });
      }
    }
  }
  // Simulate the replay: each file must be where the op left it (or put there by an earlier undo step), and each
  // destination free (or freed by an earlier undo step).
  const freed = new Set<string>();
  const produced = new Set<string>();
  for (const s of [...extra, ...reverse]) {
    const there = produced.has(s.from) || (!freed.has(s.from) && (await fs.pathExists(s.from)));
    if (!there) {
      blockers.push({
        kind: 'not-found',
        file: path.basename(s.from),
        detail: `${path.basename(s.from)} has moved since; undo it by hand.`,
      });
    }
    const taken = produced.has(s.to) || (!freed.has(s.to) && (await fs.pathExists(s.to)));
    if (taken) {
      blockers.push({
        kind: 'collision',
        file: path.basename(s.to),
        detail: `${path.basename(s.to)} is back in the way; move it first.`,
      });
    }
    produced.delete(s.from);
    freed.add(s.from);
    produced.add(s.to);
    freed.delete(s.to);
  }
  if (blockers.length) throw new SegmentOpRefused(blockers);

  await runSteps([...extra, ...reverse]);

  const back = new Map(entry.renamed.map((r) => [r.to, r.from]));
  const state = await readProjectState(projectDir);
  const restored = remapState(state, back, new Set()).state;
  // Put each dropped entry back in its old place, so the state file reads as it did.
  const rows = Object.entries(restored.recordings);
  for (const r of [...entry.removed].sort((a, b) => a.index - b.index)) {
    rows.splice(Math.min(r.index, rows.length), 0, [r.filename, r.entry]);
  }
  await writeProjectState(projectDir, { ...restored, recordings: Object.fromEntries(rows) });

  for (const dir of [...entry.createdDirs].reverse()) {
    if ((await fs.readdir(dir).catch(() => ['?'])).length === 0) await fs.remove(dir);
  }

  entry.undoneAt = (deps.now?.() ?? new Date()).toISOString();
  await writeJournal(projectDir, journal);
  return entry;
}

/**
 * R7: mark (or unmark) a segment as a placeholder to re-record. State only; the filename never changes. Shares the
 * per-project lock, so it cannot interleave with an operation's state write.
 */
export function setPlaceholder(
  projectDir: string,
  filename: string,
  placeholder: boolean
): Promise<void> {
  return serialized(projectDir, async () => {
    const paths = getProjectPaths(projectDir);
    if (path.basename(filename) !== filename || !RECORDING.test(filename)) {
      throw new SegmentOpRefused([
        { kind: 'invalid', file: filename, detail: `${filename} is not a recording name.` },
      ]);
    }
    if (!(await fs.pathExists(path.join(paths.recordings, filename)))) {
      throw new SegmentOpRefused([
        { kind: 'not-found', file: filename, detail: `There is no recording ${filename}.` },
      ]);
    }
    const state = await readProjectState(projectDir);
    await writeProjectState(projectDir, setRecordingPlaceholder(state, filename, placeholder));
  });
}
