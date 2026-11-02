/**
 * FR-177: FliHub's B-roll button registers a take with B-Roll Pilot (FliStudio) instead of
 * moving it into `b-roll/`. Contract: flistudio docs/planning/broll-pilot/spec.md §6.
 *
 * Door: POST http://127.0.0.1:<port>/api/rpc, JSON-RPC 2.0 `broll.register`, bearer token and
 * port from ~/Library/Application Support/flistudio/control.json (new token each FliStudio run).
 * The token is read per call and NEVER logged or returned.
 */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';

export type BrollRefusal =
  | 'file-not-found'
  | 'unusable-file'
  | 'project-not-found'
  | 'project-ambiguous'
  | 'invalid-input'
  | 'unavailable' // FliStudio is not running / not reachable / token rejected
  | 'failed'; // any other refusal or an answer we cannot read

export interface BrollRegisterInput {
  brand: string;
  project: string;
  file: string; // absolute path of the incoming take; never moved by the verb
  title?: string;
  tags: string[];
  takeId: string; // FliHub's own id for the take, e.g. "ecamm:2026-10-31 09-10-02"
  recordedAt?: string;
}

export interface BrollRegisterOk {
  ok: true;
  created: boolean;
  /** Where FliStudio put the copy (place: 'copy'); null when the file was already registered. */
  placed: string | null;
  /** The registered file, absolute (asset.file) — what we verify exists before clearing the take. */
  assetFile: string | null;
  assetId: string | null;
  warnings: string[];
}
export interface BrollRegisterFail {
  ok: false;
  refusal: BrollRefusal;
  message: string; // safe to show: never contains the token
}
export type BrollRegisterResult = BrollRegisterOk | BrollRegisterFail;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export const DEFAULT_CONTROL_JSON = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'flistudio',
  'control.json'
);

const NOT_RUNNING = "FliStudio isn't running — not added to B-roll";

/** What the button says for each refusal (spec §6.4). */
export function refusalMessage(refusal: BrollRefusal, serverMessage?: string): string {
  switch (refusal) {
    case 'file-not-found':
      return 'File not found — not added';
    case 'unusable-file':
      return 'Not an image or video';
    case 'project-not-found':
    case 'project-ambiguous':
      return 'Which project? Pick or open a project first (FliStudio could not resolve it)';
    case 'invalid-input':
      return serverMessage || 'B-roll refused the request';
    case 'unavailable':
      return NOT_RUNNING;
    default:
      return serverMessage ? `B-roll register failed: ${serverMessage}` : 'B-roll register failed';
  }
}

const fail = (refusal: BrollRefusal, serverMessage?: string): BrollRegisterFail => ({
  ok: false,
  refusal,
  message: refusalMessage(refusal, serverMessage),
});

export async function registerBroll(
  input: BrollRegisterInput,
  opts: { controlPath?: string; fetchImpl?: FetchLike } = {}
): Promise<BrollRegisterResult> {
  const fetchImpl: FetchLike = opts.fetchImpl ?? ((url, init) => fetch(url, init));

  let control: { port?: unknown; token?: unknown };
  try {
    control = await fs.readJson(opts.controlPath ?? DEFAULT_CONTROL_JSON);
  } catch {
    return fail('unavailable'); // no control.json = FliStudio has never run (or was cleaned up)
  }
  if (typeof control.port !== 'number' || typeof control.token !== 'string') {
    return fail('unavailable');
  }

  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'broll.register',
    params: {
      brand: input.brand,
      project: input.project,
      file: input.file,
      place: 'copy', // FliHub places, FliCast keeps (§6.2 rule 6)
      title: input.title,
      tags: input.tags,
      from: { app: 'flihub', take: input.takeId, recordedAt: input.recordedAt },
    },
  };

  let res: Response;
  try {
    res = await fetchImpl(`http://127.0.0.1:${control.port}/api/rpc`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${control.token}`,
        'x-fli-principal': 'agent:flihub',
      },
      body: JSON.stringify(body),
    });
  } catch {
    return fail('unavailable'); // control.json can outlive the process: connection refused
  }

  const json = (await res.json().catch(() => null)) as {
    result?: {
      created?: boolean;
      placed?: string;
      asset?: { id?: string; file?: string };
      warnings?: string[];
    };
    error?: { code?: unknown; message?: string; data?: { failureMode?: string } | null };
  } | null;

  if (json?.result?.asset) {
    return {
      ok: true,
      created: json.result.created !== false,
      placed: json.result.placed ?? null,
      assetFile: json.result.asset.file ?? null,
      assetId: json.result.asset.id ?? null,
      warnings: json.result.warnings ?? [],
    };
  }

  if (res.status === 401 || res.status === 403) {
    // A stale/rejected token or a fenced principal: FliStudio is up but will not take the call.
    return {
      ok: false,
      refusal: 'failed',
      message: `FliStudio refused FliHub (${res.status}) — restart FliHub's view of it or check control.json`,
    };
  }

  const mode = json?.error?.data?.failureMode ?? (typeof json?.error?.code === 'string' ? json.error.code : '');
  const known: BrollRefusal[] = [
    'file-not-found',
    'unusable-file',
    'project-not-found',
    'project-ambiguous',
    'invalid-input',
  ];
  if ((known as string[]).includes(mode)) return fail(mode as BrollRefusal, json?.error?.message);
  return fail('failed', json?.error?.message ?? `HTTP ${res.status}`);
}
