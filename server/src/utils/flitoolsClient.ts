/**
 * B584 (David, 2026-09-27): FliTools (:7161) is the suite's only transcriber; FliHub is a caller.
 * Contract: flitools docs/architecture.md → "Callers: FliHub and FliCut".
 *
 * submit (wait:false) → poll GET /api/jobs/:id every ~2 s → done | failed. FliTools saves
 * <project>/hub/transcripts/X.{json,srt,txt} (.txt last). The queue there is in memory, so
 * job-not-found after a FliTools restart means "submit again" (a finished transcript comes back
 * at once from its cache).
 */
export interface TranscriptHealth {
  suspect: boolean;
  reasons: string[];
  retried?: boolean;
}

export interface FlitoolsJobView {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  pct?: number;
  phase?: string;
  health?: TranscriptHealth;
  error?: unknown;
  result?: {
    transcript?: { engine?: { name?: string; model?: string }; health?: TranscriptHealth };
    reused?: null | 'cache' | 'beside';
    files?: { json: string; srt: string; txt: string } | null; // non-null only when all three are on disk
    saveError?: string;
    trashed?: string[]; // force_save: FliHub's old whisper files moved to <project>/-trash/<date>-pre-flitools/
  };
}

export type FlitoolsFailure = 'unavailable' | 'refused' | 'job-not-found' | 'failed' | 'not-saved';

export class FlitoolsError extends Error {
  constructor(
    message: string,
    public readonly failure: FlitoolsFailure,
  ) {
    super(message);
    this.name = 'FlitoolsError';
  }
}

export interface FlitoolsClient {
  baseUrl: string;
  submit(path: string, opts?: { force?: boolean; forceSave?: boolean; language?: string }): Promise<FlitoolsJobView>;
  job(id: string): Promise<FlitoolsJobView>;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const describe = (err: unknown): string => {
  if (!err) return 'unknown error';
  if (typeof err === 'string') return err;
  const e = err as { failureMode?: string; message?: string };
  return [e.failureMode, e.message].filter(Boolean).join(': ') || JSON.stringify(err);
};

export function createFlitoolsClient(
  opts: { baseUrl?: string; fetchImpl?: FetchLike } = {},
): FlitoolsClient {
  const baseUrl = opts.baseUrl ?? process.env.FLITOOLS_URL ?? 'http://127.0.0.1:7161';
  const fetchImpl: FetchLike = opts.fetchImpl ?? ((url, init) => fetch(url, init));

  async function call(method: 'GET' | 'POST', pathname: string, body?: unknown) {
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}${pathname}`, {
        method,
        headers: { 'content-type': 'application/json', 'x-fli-principal': 'agent:flihub' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      throw new FlitoolsError(
        `FliTools is not reachable at ${baseUrl} (${err instanceof Error ? err.message : String(err)})`,
        'unavailable',
      );
    }
    const json = (await res.json().catch(() => null)) as
      | { ok: true; value: FlitoolsJobView }
      | { ok: false; error?: { failureMode?: string; message?: string } }
      | null;
    return { status: res.status, json };
  }

  return {
    baseUrl,
    async submit(path, o = {}) {
      // language always explicit (FliTools treats omitted as 'en'); the caller picks it from the
      // project (transcriptionLanguageFor) — 'auto' only when the project declares several
      const body: Record<string, unknown> = { path, wait: false, language: o.language ?? 'en' };
      if (o.force) body.force = true;
      if (o.forceSave) body.force_save = true;
      const { status, json } = await call('POST', '/api/transcribe', body);
      if (json?.ok) return json.value;
      throw new FlitoolsError(`FliTools refused the job (${status}): ${describe(json?.ok === false ? json.error : json)}`, 'refused');
    },
    async job(id) {
      const { status, json } = await call('GET', `/api/jobs/${encodeURIComponent(id)}`);
      if (json?.ok) return json.value;
      if (status === 404 || /not-found/.test(json?.ok === false ? (json.error?.failureMode ?? '') : '')) {
        throw new FlitoolsError(`FliTools has no job ${id}`, 'job-not-found');
      }
      throw new FlitoolsError(`FliTools job ${id} unreadable (${status}): ${describe(json?.ok === false ? json.error : json)}`, 'refused');
    },
  };
}

export interface RunOptions {
  force?: boolean;
  forceSave?: boolean;
  language?: string;
  pollMs?: number;
  onProgress?: (view: FlitoolsJobView) => void;
  isAborted?: () => boolean;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Submit and poll until the job is done. Resolves with the finished view (health included).
 * Rejects with a FlitoolsError: unavailable / refused / failed / not-saved (a transcript FliHub
 * can't see on disk is a failure for FliHub, never a silent success — FR-159).
 */
export async function runFlitoolsJob(
  client: FlitoolsClient,
  videoPath: string,
  o: RunOptions = {},
): Promise<FlitoolsJobView> {
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const pollMs = o.pollMs ?? 2000;
  let view = await client.submit(videoPath, { force: o.force, forceSave: o.forceSave, language: o.language });
  let resubmitted = false;

  while (view.status !== 'done') {
    if (view.status === 'failed') {
      throw new FlitoolsError(`FliTools failed: ${describe(view.error)}`, 'failed');
    }
    if (o.isAborted?.()) throw new FlitoolsError('aborted (FliHub shutting down)', 'failed');
    await sleep(pollMs);
    try {
      view = await client.job(view.id);
    } catch (err) {
      if (err instanceof FlitoolsError && err.failure === 'job-not-found' && !resubmitted) {
        resubmitted = true; // FliTools restarted and forgot its queue — submit again
        view = await client.submit(videoPath, { force: o.force, forceSave: o.forceSave, language: o.language });
        continue;
      }
      throw err;
    }
    o.onProgress?.(view);
  }

  if (view.result?.saveError || !view.result?.files) {
    throw new FlitoolsError(
      `FliTools transcribed but did not save the files: ${view.result?.saveError ?? 'no files returned'}`,
      'not-saved',
    );
  }
  return view;
}
