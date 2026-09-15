/**
 * W3 open contract — the ONE way FliHub is pointed at a brand + project
 * (flistudio docs/open-contract.md §3, C1–C4).
 *
 *   door 2  launch args / FLIVIDEO_* env  → applyLaunch(argv, env)  ─┐
 *   door 3  POST /api/context             → applyContext(args,'api') ─┴→ updateConfig
 *
 * Resolution goes through @flivideo/core (readBrands → resolveBrandRoot → listProjects →
 * resolveProject). Most FliHub projects have no fli.studio.json yet, so a folder the library
 * calls `not-a-project` is accepted as a plain folder (membership 'folder').
 *
 * GET /api/context is DERIVED from the live config (root + activeProject), never from a second
 * store — so a brand switch or a project pick in the UI is reflected too, and both doors
 * report byte-identical state.
 */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import {
  brandsFilePath,
  listProjects,
  parseOpenArgs,
  parseVideoFolder,
  readBrands,
  readIdentity,
  readMachineSettings,
  resolveBrandRoot,
  resolveProject,
  type Brand,
  type MachineSettings,
  type RawOpenArgs,
} from '@flivideo/core';
import type {
  Config,
  ContextRefusal,
  HubContext,
  OpenContextArg,
  OpenContextState,
} from '../../../shared/types.js';
import { brandStoragePaths } from './brands.js';
import { expandPath } from './pathUtils.js';

/** Set by start.sh / scripts/app.sh per launch, so a nodemon or overmind restart does not re-apply it. */
export const LAUNCH_ID_ENV = 'FLIVIDEO_LAUNCH_ID';

export interface ContextDeps {
  getConfig: () => Config;
  updateConfig: (patch: Partial<Config>) => Config;
  emit?: (event: 'projects:changed' | 'recordings:changed' | 'context:changed', data?: OpenContextState) => void;
  /** Home for brands.json, ~/.fli/machine.json and the A5 rewrite. Default os.homedir(). */
  home?: string;
  /** File remembering the last applied launch id. Omit to always apply. */
  launchStampPath?: string;
  log?: (line: string) => void;
}

export type ApplyResult =
  | { kind: 'applied'; state: OpenContextState }
  | { kind: 'missing'; missing: OpenContextArg[] }
  | { kind: 'refused'; status: 400 | 404 | 409 | 503; refusal: ContextRefusal };

export type LaunchResult = ApplyResult | { kind: 'already-applied'; launchId: string } | { kind: 'none' };

type Resolution =
  | { kind: 'resolved'; brand: Brand; root: string; project: string | null }
  | { kind: 'refused'; status: 400 | 404 | 409 | 503; refusal: ContextRefusal };

/** A whole project code (`a01`); a prefix is never a match (R31). */
const CODE = /^[a-z]\d{2}$/;

function ambiguous(ref: string, brandKey: string, candidates: string[]): Resolution {
  return refuse(409, {
    code: 'project-ambiguous',
    reason: `Project "${ref}" matches ${candidates.length} projects in ${brandKey}; name the folder.`,
    candidates,
  });
}

function refuse(status: 400 | 404 | 409 | 503, refusal: ContextRefusal): Resolution {
  return { kind: 'refused', status, refusal };
}

export function createContextController(deps: ContextDeps) {
  const home = deps.home ?? os.homedir();
  const log = deps.log ?? ((line: string) => console.log(line));

  // The video travels with the project it was given for; a different project drops it.
  let carriedVideo: { projectDir: string; video: string } | null = null;
  // A refused LAUNCH is shown until the context it refused against changes (C3: say why, never stale).
  let lastRefusal: { refusal: ContextRefusal; snapshot: string } | null = null;

  const snapshot = (config: Config) => `${config.projectsRootDirectory ?? ''}|${config.activeProject ?? ''}`;

  async function machineRoots(): Promise<Pick<MachineSettings, 'brandRoots'> | null> {
    const machine = await readMachineSettings({ home });
    return machine.kind === 'valid' ? machine.value : null;
  }

  async function resolve(args: RawOpenArgs): Promise<Resolution> {
    if (args.video !== undefined && parseVideoFolder(args.video) === null) {
      return refuse(400, {
        code: 'video-invalid',
        reason: `Video "${args.video}" is not a <NN>-<name> folder name.`,
      });
    }
    const brandKey = args.brand as string;
    const brands = await readBrands({ home });
    if (brands === null || brands.kind === 'invalid') {
      const file = brandsFilePath({ home });
      return refuse(503, {
        code: 'registry-unreadable',
        reason: brands === null ? `No brand registry at ${file}.` : `Brand registry ${file} is not valid.`,
      });
    }
    const brand = brands.value.find((b) => b.key === brandKey);
    if (!brand) {
      return refuse(404, { code: 'unknown-brand', reason: `Unknown brand "${brandKey}" (not in brands.json).` });
    }
    const root = resolveBrandRoot(brand, await machineRoots(), { home });
    if (root === null || !path.isAbsolute(root)) {
      return refuse(404, {
        code: 'no-brand-root',
        reason: `Brand "${brandKey}" has no absolute video_projects root on this machine.`,
      });
    }
    if (!args.project) return { kind: 'resolved', brand, root, project: null };

    const listing = await listProjects(root);
    const ref = args.project;
    const found = await resolveProject(listing, ref);
    if (found.kind === 'unscanned') {
      return refuse(503, {
        // Shared vocabulary has no "root not mounted" slot: no-brand-root, told apart by 503 + the path in reason.
        code: 'no-brand-root',
        reason: `Brand root ${found.path} could not be read (${found.message}).`,
      });
    }
    // An exact folder name or a member id is unambiguous by construction: the library's answer stands.
    if (found.kind === 'found' && found.matchedBy !== 'code') {
      return { kind: 'resolved', brand, root, project: found.project.folder };
    }
    if (found.kind === 'not-a-project') {
      // FliHub lists by folder today; adoption (fli.studio.json) is FliStudio's job (W7).
      return { kind: 'resolved', brand, root, project: found.folder.folder };
    }
    if (found.kind === 'ambiguous' && found.matchedBy === 'id') return ambiguous(ref, brandKey, found.candidates.map((c) => c.folder));

    // A code. The library matches codes against members only, but FliHub counts plain folders as projects too, so a
    // code is matched across both — one member and one plain folder sharing `a01` is ambiguous, not the member (R31).
    const matches = new Set<string>();
    if (CODE.test(ref) && listing.members.state === 'scanned' && listing.otherFolders.state === 'scanned') {
      for (const m of listing.members.items) {
        if (m.identity.code === ref || m.parsed?.code === ref) matches.add(m.folder);
      }
      for (const f of listing.otherFolders.items) {
        if (f.parsed?.code === ref) matches.add(f.folder);
      }
    }
    if (matches.size === 1) return { kind: 'resolved', brand, root, project: [...matches][0] };
    if (matches.size > 1) return ambiguous(ref, brandKey, [...matches].sort());
    return refuse(404, {
      code: 'project-not-found',
      reason: `No project folder "${ref}" in ${root}.`,
    });
  }

  /** The live context, derived from config. */
  async function getState(): Promise<OpenContextState> {
    const config = deps.getConfig();
    const root = config.projectsRootDirectory ? path.resolve(expandPath(config.projectsRootDirectory)) : '';
    const missing: OpenContextArg[] = [];

    let brandKey: string | null = null;
    const brands = await readBrands({ home });
    if (root && brands?.kind === 'valid') {
      const machine = await machineRoots();
      brandKey =
        brands.value.find((b) => {
          const brandRoot = resolveBrandRoot(b, machine, { home });
          return brandRoot !== null && path.resolve(brandRoot) === root;
        })?.key ?? null;
    }
    if (brandKey === null) missing.push('brand');

    const project = config.activeProject || '';
    const projectDir = root && project ? path.join(root, project) : '';
    const projectExists = projectDir !== '' && (await fs.pathExists(projectDir));
    if (!projectExists) missing.push('project');

    let context: HubContext | null = null;
    if (brandKey !== null && projectExists) {
      const identity = await readIdentity(projectDir);
      context = {
        brand: brandKey,
        root,
        project,
        projectDir,
        projectId: identity?.kind === 'valid' ? identity.value.id : null,
        membership: identity?.kind === 'valid' ? 'member' : 'folder',
      };
      if (carriedVideo?.projectDir === projectDir) context.video = carriedVideo.video;
    }

    const state: OpenContextState = { context, missing };
    if (lastRefusal && lastRefusal.snapshot === snapshot(config)) state.refused = lastRefusal.refusal;
    return state;
  }

  /**
   * applyContext — the single code path behind both doors. Door 3 must name brand AND project;
   * door 2 with only --brand switches the brand and leaves the project list as the picker (R25).
   */
  async function applyContext(args: RawOpenArgs, source: 'launch' | 'api'): Promise<ApplyResult> {
    const missing = (['brand', 'project'] as const).filter((name) => !args[name]);
    // Without a brand nothing can be resolved: stay exactly as we are, on the picker (R25).
    if (!args.brand) return { kind: 'missing', missing };
    // Door 3 names the missing field instead of guessing (open-contract §3).
    if (source === 'api' && missing.length > 0) return { kind: 'missing', missing };

    const resolution = await resolve(args);
    if (resolution.kind === 'refused') {
      // F9: only a launch refusal is kept for GET /api/context (and the UI strip). A door-3 caller already has its
      // 4xx + reason; surfacing it in the window David is recording with would be noise from someone else's call.
      if (source === 'launch') lastRefusal = { refusal: resolution.refusal, snapshot: snapshot(deps.getConfig()) };
      log(`[context] ${source} context refused: ${resolution.refusal.reason}`);
      return resolution;
    }

    const { brand, root, project } = resolution;
    const storage = await brandStoragePaths(brand.key, brandsFilePath({ home }));
    // Same effect as POST /api/brands/switch (+ POST /api/config { activeProject }).
    deps.updateConfig({
      projectsRootDirectory: root,
      activeProject: project ?? '',
      publishedPath: storage.publishedPath,
      holdingPath: storage.holdingPath,
    });
    lastRefusal = null;
    carriedVideo = project && args.video ? { projectDir: path.join(root, project), video: args.video } : null;

    const state = await getState();
    log(
      project
        ? `[context] ${source}: ${brand.key} / ${project} (${state.context?.membership ?? 'unresolved'})`
        : `[context] ${source}: ${brand.key} — no --project given; starting on the project list`
    );
    deps.emit?.('projects:changed');
    deps.emit?.('recordings:changed');
    deps.emit?.('context:changed', state);
    return { kind: 'applied', state };
  }

  /** Door 2. Applies argv/env once per launch id; a restart under the same launch keeps the user's later picks. */
  async function applyLaunch(
    argv: readonly string[],
    env: Readonly<Record<string, string | undefined>>
  ): Promise<LaunchResult> {
    const { context } = parseOpenArgs(argv, env);
    if (!context.brand && !context.project) return { kind: 'none' };
    if (!context.brand) {
      log('[context] launch: --project given without --brand; ignored, starting on the picker');
      return { kind: 'missing', missing: ['brand'] };
    }

    const launchId = env[LAUNCH_ID_ENV];
    if (launchId && deps.launchStampPath) {
      const stamp = await fs.readJson(deps.launchStampPath).catch(() => null);
      if (stamp?.launchId === launchId) return { kind: 'already-applied', launchId };
    }
    const result = await applyContext(context, 'launch');
    // Stamp only a launch that changed the config: a refused one is re-reported after a restart.
    if (result.kind === 'applied' && launchId && deps.launchStampPath) {
      await fs.writeJson(deps.launchStampPath, { launchId, appliedAt: new Date().toISOString() }).catch(() => {});
    }
    return result;
  }

  return { applyContext, applyLaunch, getState };
}

export type ContextController = ReturnType<typeof createContextController>;
