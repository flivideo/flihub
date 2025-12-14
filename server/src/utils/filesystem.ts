/**
 * NFR-67: Safe Filesystem Utilities
 *
 * Utilities for filesystem operations with consistent error handling.
 * - Expected conditions (missing dir) return empty/null silently
 * - Real errors (permissions, disk issues) are thrown/logged
 */

import fs from 'fs-extra';

/**
 * Safely read a directory, returning empty array if it doesn't exist.
 * Throws on real errors (permission denied, disk error, etc.)
 *
 * @param dirPath - Path to directory
 * @returns Array of filenames, or empty array if dir doesn't exist
 * @throws Error for real filesystem errors (not ENOENT)
 */
export async function readDirSafe(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch (err) {
    // ENOENT = directory doesn't exist - expected condition, return empty
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    // Real error - rethrow so caller can handle
    throw err;
  }
}

/**
 * Safely check if a path exists, without throwing.
 * Unlike fs.pathExists, this handles permission errors gracefully.
 *
 * @param filePath - Path to check
 * @returns true if exists and accessible, false otherwise
 */
export async function pathExistsSafe(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely read a file, returning null if it doesn't exist.
 * Throws on real errors (permission denied, disk error, etc.)
 *
 * @param filePath - Path to file
 * @returns File contents as string, or null if file doesn't exist
 * @throws Error for real filesystem errors (not ENOENT)
 */
export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Safely stat a file, returning null if it doesn't exist.
 * Throws on real errors (permission denied, disk error, etc.)
 *
 * @param filePath - Path to file
 * @returns fs.Stats object, or null if file doesn't exist
 * @throws Error for real filesystem errors (not ENOENT)
 */
export async function statSafe(filePath: string): Promise<fs.Stats | null> {
  try {
    return await fs.stat(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Safely read a directory with file types (Dirent objects).
 * Returns empty array if directory doesn't exist.
 * Throws on real errors (permission denied, disk error, etc.)
 *
 * @param dirPath - Path to directory
 * @returns Array of Dirent objects, or empty array if dir doesn't exist
 * @throws Error for real filesystem errors (not ENOENT)
 */
export async function readDirEntriesSafe(dirPath: string): Promise<fs.Dirent[]> {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}
