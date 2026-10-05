// B062 Wave 2: Generic safe-delete utility — reusable for all folder deletions
// (trash, relay subfolders, etc.). Each caller passes its own SafeDeleteRule.
import { lstat, readdir, rm, stat, unlink } from 'fs/promises';
import fsExtra from 'fs-extra';
import path from 'path';
import { isPathWithinProject } from './s3Utils.js';

export interface SafeDeleteRule {
  rootDir: string;        // resolved absolute path — target must be within this
  allowedSuffix: string;  // target path's last segment must equal this (e.g. '-trash')
  description: string;    // human-readable label for error messages (e.g. 'project trash folder')
  // Also remove subfolders (and links) inside the target, as FliStudio's project.empty-trash does (David 2026-10-05).
  // The target must then be a real folder, never a link; a link inside is unlinked, never followed.
  includeSubfolders?: boolean;
}

export interface SafeDeleteResult {
  success: boolean;
  deleted: Array<{ name: string; size: number }>;  // files actually deleted
  error?: string;
}

export async function safeDelete(targetPath: string, rule: SafeDeleteRule): Promise<SafeDeleteResult> {
  // Step 1: rootDir must be non-empty
  if (!rule.rootDir || rule.rootDir.trim() === '') {
    return { success: false, deleted: [], error: 'Root directory is not configured' };
  }

  // Step 2: rootDir must exist on disk
  const rootExists = await fsExtra.pathExists(rule.rootDir);
  if (!rootExists) {
    return { success: false, deleted: [], error: `Root directory does not exist: ${rule.rootDir}` };
  }

  // Step 3: targetPath must be non-empty
  if (!targetPath || targetPath.trim() === '') {
    return { success: false, deleted: [], error: 'Target path is empty' };
  }

  // Step 4: targetPath must exist on disk
  const targetExists = await fsExtra.pathExists(targetPath);
  if (!targetExists) {
    return { success: false, deleted: [], error: `Target path does not exist: ${targetPath}` };
  }

  // Step 5: targetPath must be strictly within rootDir
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(rule.rootDir);
  if (!isPathWithinProject(resolvedTarget, resolvedRoot)) {
    return { success: false, deleted: [], error: `Target path is outside the allowed root: ${resolvedTarget}` };
  }

  // Step 6: last segment of targetPath must match allowedSuffix
  const targetBasename = path.basename(resolvedTarget);
  if (targetBasename !== rule.allowedSuffix) {
    return { success: false, deleted: [], error: `Target folder '${targetBasename}' does not match allowed suffix '${rule.allowedSuffix}'` };
  }

  const deep = rule.includeSubfolders === true;
  // Step 7 (includeSubfolders): the target must be a real folder — a link to elsewhere is refused, nothing deleted
  if (deep && !(await lstat(targetPath)).isDirectory()) {
    return { success: false, deleted: [], error: `The ${rule.description} is not a real folder: ${resolvedTarget}` };
  }

  // All checks passed — list files, delete them, return list
  try {
    const entries = await readdir(targetPath, { withFileTypes: true });
    const files = entries.filter(e => e.isFile() || (deep && e.isSymbolicLink()));
    const fileList = await Promise.all(
      files.map(async (e) => {
        const filePath = path.join(targetPath, e.name);
        const fileStat = deep ? await lstat(filePath) : await stat(filePath);
        return { name: e.name, size: fileStat.size, filePath };
      })
    );
    const folders = deep ? entries.filter(e => e.isDirectory()) : [];
    const nested = (
      await Promise.all(folders.map(e => filesUnder(path.join(targetPath, e.name), e.name)))
    ).flat();

    // Delete all files, then each subfolder as itself (rm never follows a link inside it)
    await Promise.all(fileList.map(({ filePath }) => unlink(filePath)));
    for (const e of folders) await rm(path.join(targetPath, e.name), { recursive: true, force: true });

    return {
      success: true,
      deleted: [...fileList.map(({ name, size }) => ({ name, size })), ...nested],
    };
  } catch (err) {
    return { success: false, deleted: [], error: String(err) };
  }
}

/** Every file (and link, by its own size) under `dir`, named relative to the target (`old/deeper/c.mov`). */
export async function filesUnder(dir: string, rel: string): Promise<Array<{ name: string; size: number }>> {
  const out: Array<{ name: string; size: number }> = [];
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const name = `${rel}/${e.name}`;
    if (e.isDirectory()) out.push(...(await filesUnder(full, name)));
    else out.push({ name, size: await lstat(full).then(st => st.size, () => 0) });
  }
  return out;
}
