// B062 Wave 2: Generic safe-delete utility — reusable for all folder deletions
// (trash, relay subfolders, etc.). Each caller passes its own SafeDeleteRule.
import { readdir, stat, unlink } from 'fs/promises';
import fsExtra from 'fs-extra';
import path from 'path';
import { isPathWithinProject } from './s3Utils.js';

export interface SafeDeleteRule {
  rootDir: string;        // resolved absolute path — target must be within this
  allowedSuffix: string;  // target path's last segment must equal this (e.g. '-trash')
  description: string;    // human-readable label for error messages (e.g. 'project trash folder')
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

  // All checks passed — list files, delete them, return list
  try {
    const entries = await readdir(targetPath, { withFileTypes: true });
    const files = entries.filter(e => e.isFile());
    const fileList = await Promise.all(
      files.map(async (e) => {
        const filePath = path.join(targetPath, e.name);
        const fileStat = await stat(filePath);
        return { name: e.name, size: fileStat.size, filePath };
      })
    );

    // Delete all files
    await Promise.all(fileList.map(({ filePath }) => unlink(filePath)));

    return {
      success: true,
      deleted: fileList.map(({ name, size }) => ({ name, size })),
    };
  } catch (err) {
    return { success: false, deleted: [], error: String(err) };
  }
}
