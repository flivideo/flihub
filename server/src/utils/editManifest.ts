/**
 * FR-126: Edit Folder Manifest & Cleanup
 *
 * Utilities for tracking files copied to edit folders, enabling safe deletion
 * of source files while maintaining ability to restore for re-editing.
 */

import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import type {
  EditManifestFile,
  EditFolderManifest,
  EditFolderKey,
  ManifestStatus,
  ManifestStatusDetail,
  ManifestFileStatus,
} from '../../../shared/types.js';

/**
 * Calculate SHA-256 hash of first 1MB of a file
 * Used to detect if source file has changed since copy
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  const CHUNK_SIZE = 1024 * 1024; // 1MB

  // Use fs.promises for proper FileHandle typing
  const fileHandle = await fs.promises.open(filePath, 'r');
  const buffer = Buffer.alloc(CHUNK_SIZE);

  try {
    const { bytesRead } = await fileHandle.read(buffer, 0, CHUNK_SIZE, 0);
    const hash = crypto.createHash('sha256');
    hash.update(buffer.slice(0, bytesRead));
    return 'sha256:' + hash.digest('hex');
  } finally {
    await fileHandle.close();
  }
}

/**
 * Create manifest from a list of files
 * Calculates hashes and captures metadata
 */
export async function createManifest(
  filePaths: string[],
  recordingsDir: string
): Promise<EditFolderManifest> {
  const files: EditManifestFile[] = [];
  const now = new Date().toISOString();

  for (const filePath of filePaths) {
    const filename = path.basename(filePath);
    const sourceSize = (await fs.stat(filePath)).size;
    const sourceHash = await calculateFileHash(filePath);

    files.push({
      filename,
      sourceHash,
      copiedAt: now,
      sourceSize,
    });
  }

  return {
    lastCopied: now,
    files,
  };
}

/**
 * Get status of a manifest by checking if source files exist and match hashes
 */
export async function getManifestStatus(
  manifest: EditFolderManifest | undefined,
  editFolderPath: string,
  recordingsDir: string
): Promise<ManifestStatusDetail> {
  // No manifest exists yet
  if (!manifest || manifest.files.length === 0) {
    return {
      status: 'no-manifest',
      manifestedFiles: 0,
      presentFiles: 0,
      missingFiles: 0,
      changedFiles: 0,
      totalSize: 0,
    };
  }

  const fileDetails: ManifestFileStatus[] = [];
  let presentFiles = 0;
  let missingFiles = 0;
  let changedFiles = 0;
  let totalSize = 0;

  // Check each file in the manifest
  for (const manifestFile of manifest.files) {
    const editFilePath = path.join(editFolderPath, manifestFile.filename);
    const recordingFilePath = path.join(recordingsDir, manifestFile.filename);

    // Check if file exists in edit folder
    const existsInEdit = await fs.pathExists(editFilePath);

    // Check if source exists in recordings folder
    const existsInRecordings = await fs.pathExists(recordingFilePath);

    if (!existsInRecordings) {
      // Source file is missing (deleted or moved)
      fileDetails.push({
        filename: manifestFile.filename,
        status: 'missing',
      });
      missingFiles++;
    } else {
      // Source exists - check if hash matches
      const currentHash = await calculateFileHash(recordingFilePath);
      const stat = await fs.stat(recordingFilePath);
      totalSize += stat.size;

      if (currentHash !== manifestFile.sourceHash) {
        // Hash changed - file was modified
        fileDetails.push({
          filename: manifestFile.filename,
          status: 'changed',
          currentHash,
          sourceSize: stat.size,
        });
        changedFiles++;
      } else {
        // Hash matches - file is unchanged
        fileDetails.push({
          filename: manifestFile.filename,
          status: 'present',
          sourceSize: stat.size,
        });
        presentFiles++;
      }
    }
  }

  // Determine overall status
  let status: ManifestStatus;

  if (missingFiles > 0) {
    status = 'missing';
  } else if (changedFiles > 0) {
    status = 'changed';
  } else {
    // All files present and unchanged - check if they're in edit folder
    const allInEditFolder = await Promise.all(
      manifest.files.map((f: EditManifestFile) => fs.pathExists(path.join(editFolderPath, f.filename)))
    );

    if (allInEditFolder.every((exists: boolean) => !exists)) {
      status = 'cleaned';
    } else {
      status = 'present';
    }
  }

  return {
    status,
    manifestedFiles: manifest.files.length,
    presentFiles,
    missingFiles,
    changedFiles,
    totalSize,
    fileDetails,
  };
}

/**
 * Clean edit folder - delete source files that are in manifest
 * Preserves Gling outputs and other files not in manifest
 */
export async function cleanEditFolder(
  manifest: EditFolderManifest,
  editFolderPath: string
): Promise<{ deleted: string[]; spaceSaved: number; preserved: string[] }> {
  const deleted: string[] = [];
  const preserved: string[] = [];
  let spaceSaved = 0;

  // Get all files in edit folder
  const allFiles = await fs.readdir(editFolderPath);

  // Build set of manifest filenames for quick lookup
  const manifestFilenames = new Set(manifest.files.map((f: EditManifestFile) => f.filename));

  for (const filename of allFiles) {
    const filePath = path.join(editFolderPath, filename);
    const stat = await fs.stat(filePath);

    // Skip directories
    if (stat.isDirectory()) {
      continue;
    }

    if (manifestFilenames.has(filename)) {
      // File is in manifest - delete it
      await fs.remove(filePath);
      deleted.push(filename);
      spaceSaved += stat.size;
    } else {
      // File is NOT in manifest - preserve it (likely Gling output)
      preserved.push(filename);
    }
  }

  return { deleted, spaceSaved, preserved };
}

/**
 * Restore edit folder - copy files from recordings back to edit folder
 * Validates hashes and warns if files have changed
 */
export async function restoreEditFolder(
  manifest: EditFolderManifest,
  editFolderPath: string,
  recordingsDir: string
): Promise<{ restored: string[]; warnings: string[] }> {
  const restored: string[] = [];
  const warnings: string[] = [];

  // Ensure edit folder exists
  await fs.ensureDir(editFolderPath);

  for (const manifestFile of manifest.files) {
    const sourcePath = path.join(recordingsDir, manifestFile.filename);
    const destPath = path.join(editFolderPath, manifestFile.filename);

    // Check if source exists
    if (!await fs.pathExists(sourcePath)) {
      warnings.push(`Source file missing: ${manifestFile.filename}`);
      continue;
    }

    // Check if hash matches
    const currentHash = await calculateFileHash(sourcePath);
    if (currentHash !== manifestFile.sourceHash) {
      warnings.push(`File changed since copy: ${manifestFile.filename} (hash mismatch)`);
    }

    // Copy file
    await fs.copy(sourcePath, destPath, { overwrite: true });
    restored.push(manifestFile.filename);
  }

  return { restored, warnings };
}
