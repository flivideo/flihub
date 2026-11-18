import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import {
  DescribeDocument,
  JSONRPC_CODES,
  LIFECYCLE_CAPABILITIES,
  SystemStatus,
  defineCapability,
  defineFailureCodes,
  describeApp,
} from '@flivideo/core';

/**
 * FliHub's door, slice 1 (C4-07/08): FliHub describes itself and says how it is, through fli-core's shared door, so it
 * shows on FliStudio's map and in `fli apps`. Two read-only verbs, `system.describe` and `system.status`, on
 * `POST /api/rpc`, and the same document at `GET /api/describe`. Nothing else about FliHub changes: its REST routes
 * stay the way in for everything it does. Its other verbs (recordings, takes, sets) are not described yet.
 */

export const APP = 'flihub';

export const FAILURE_CODES = defineFailureCodes({
  'invalid-input': JSONRPC_CODES.invalidParams,
  'unknown-capability': JSONRPC_CODES.methodNotFound,
  internal: JSONRPC_CODES.internalError,
});

export const CAPABILITIES = {
  'system.describe': defineCapability({
    kind: 'query',
    description:
      'FliHub describes itself (describe/1): who it is, what it is for, the commands it declares on this door, the ' +
      'data files and settings. The same document as GET /api/describe.',
    input: z.object({}),
    output: DescribeDocument,
    sideEffects: 'read-only',
    idempotent: true,
    confirmationRequired: false,
    failureModes: [],
  }),
  'system.status': LIFECYCLE_CAPABILITIES['system.status'],
};

const here = path.dirname(fileURLToPath(import.meta.url));

/** FliHub's version: the server package's. */
export function flihubVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'package.json'), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** The short git sha of this checkout, or null when it is not one. */
export function gitSha(): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: here, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

export interface DoorIdentity {
  gitSha: string | null;
  startedAt: string;
  port: number;
}

export function flihubDescribe(identity: DoorIdentity): DescribeDocument {
  const version = flihubVersion();
  return describeApp({
    app: {
      name: APP,
      version,
      gitSha: identity.gitSha,
      machine: os.hostname().replace(/\.local$/, ''),
      purpose:
        'The recording hub: watches where recordings land, names and files each take into the right chapter of a video ' +
        'project, keeps the transcripts beside them, and hands finished footage on to FliCut and FliStudio.',
      startedAt: identity.startedAt,
    },
    parts: [
      {
        kind: 'core',
        capabilities: CAPABILITIES,
        facts: {
          key: 'flihub',
          name: 'FliHub',
          purpose:
            'Receives recordings, files them into video projects, and shows each project’s state. Slice 1 of its door ' +
            'describes the app itself; everything else FliHub does is still reached through its REST routes under /api.',
          version,
          owner: 'flivideo',
          dataFiles: [
            { path: 'server/config.json', access: 'read-write', purpose: 'The watch folder, the active brand root and project, and the tags.' },
            { path: 'server/.launch-context.json', access: 'read-write', purpose: 'Which launch already set the open project, so a restart keeps later picks.' },
            { path: '~/.config/appydave/brands.json', access: 'read', purpose: 'The brand registry: where each brand’s video projects live.' },
            { path: '<project>/fli.studio.json', access: 'read', purpose: 'The project’s identity (id, brand, code, name).' },
          ],
          events: [{ name: 'context:changed', channel: 'socket.io', purpose: 'The open brand / project changed.' }],
          settings: [
            { name: 'PORT', where: 'environment (server/.env)', purpose: 'The server port. Default 5101, loopback only.' },
            { name: 'FLIHUB_SERVER_PORT / FLIHUB_CLIENT_PORT', where: 'environment (scripts/app.sh)', purpose: 'Ports app.sh waits on: server 5101, screen 5100.' },
          ],
          docs: [{ label: 'Describe document', href: '/api/describe' }],
        },
      },
    ],
  });
}

/** `system.status`. FliHub holds no work a quit would lose that it tracks here yet, so `busy` is empty. */
export function flihubStatus(
  identity: DoorIdentity,
  context: { brand: string; project: string } | null,
): SystemStatus {
  return SystemStatus.parse({
    app: APP,
    version: flihubVersion(),
    pid: process.pid,
    startedAt: identity.startedAt,
    context,
    busy: [],
  });
}
