/**
 * W3 open contract — the door-3 API shapes as zod (review F6). shared/types.ts re-exports the inferred types, so the
 * client and server compile against the same definitions the route validates with.
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

export const ContextRefusalSchema = z.strictObject({
  code: z.enum([
    'video-invalid',
    'brands-unreadable',
    'unknown-brand',
    'no-brand-root',
    'project-not-found',
    'project-ambiguous',
    'brand-root-unreadable',
  ]),
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
