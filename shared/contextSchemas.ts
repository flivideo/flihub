/**
 * W3 open contract — the door-3 API shapes as zod (review F6). Lives in shared/ (review R2: shared never imports from
 * server/), which declares zod + @flivideo/core itself. shared/types.ts re-exports the inferred types; the server route
 * validates with the schemas; the client imports types only, so nothing reaches its bundle.
 */
import { z } from 'zod';
import { VideoFolderName } from '@flivideo/core';

const NonEmpty = z.string().min(1);

export const OpenContextArgSchema = z.enum(['brand', 'project', 'video']);
export type OpenContextArg = z.infer<typeof OpenContextArgSchema>;

/** POST /api/context body. Every field optional here: a missing one is answered 400 { missing } by the controller. */
export const ContextBodySchema = z.object({ brand: NonEmpty, project: NonEmpty, video: VideoFolderName }).partial();
export type ContextBody = z.infer<typeof ContextBodySchema>;

export const HubContextSchema = z.strictObject({
  brand: NonEmpty, // brands.json key
  root: NonEmpty, // the brand root on this machine (= projectsRootDirectory)
  project: NonEmpty, // project folder name (= activeProject)
  projectDir: NonEmpty, // absolute project folder
  projectId: z.string().nullable(), // fli.studio.json id, or null when the folder is not a member yet
  membership: z.enum(['member', 'folder']), // member = valid fli.studio.json; folder = plain FliHub folder
  video: VideoFolderName.optional(), // <NN>-<name>, carried not validated beyond its shape
});
export type HubContext = z.infer<typeof HubContextSchema>;

/**
 * The SHARED refusal vocabulary for every Fli app's open contract (Swagger decision 4, flistudio 179cb5c): FliStudio
 * switches on these across FliHub, FliCut, FliCast and Teletubby, so no app adds its own. FliHub never emits
 * `not-a-project` (it accepts plain folders, W3 brief §2A) nor `video-not-found` (the video is carried, not checked,
 * brief §2B). A body that is not even the right shape (e.g. `brand: 5`) is a malformed request outside the vocabulary:
 * 400 `{ error, issues }` with no code.
 */
export const REFUSAL_CODES = [
  'missing',
  'unknown-brand',
  'no-brand-root',
  'registry-unreadable',
  'project-not-found',
  'project-ambiguous',
  'not-a-project',
  'video-invalid',
  'video-not-found',
] as const;

export const ContextRefusalSchema = z.strictObject({
  code: z.enum(REFUSAL_CODES),
  reason: z.string(),
  candidates: z.array(z.string()).optional(),
});
export type ContextRefusal = z.infer<typeof ContextRefusalSchema>;

export const OpenContextStateSchema = z.strictObject({
  context: HubContextSchema.nullable(),
  missing: z.array(OpenContextArgSchema), // each missing argument is a picker (R25)
  refused: ContextRefusalSchema.optional(), // the last launch that could not resolve (C3)
});
export type OpenContextState = z.infer<typeof OpenContextStateSchema>;
