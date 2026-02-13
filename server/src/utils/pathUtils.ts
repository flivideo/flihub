import path from 'path';
import os from 'os';

/**
 * Expand ~ to home directory in file paths
 */
export function expandPath(filePath: string): string {
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

/**
 * Safely extract a string query parameter from Express req.query or req.params.
 * Express 5 types query values as string | ParsedQs | (string | ParsedQs)[] | undefined
 * and params as string | undefined. This helper normalizes any of those to a plain string.
 */
export function queryString(
  value: string | Record<string, unknown> | (string | Record<string, unknown>)[] | undefined,
  defaultValue = ''
): string {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'string') return value || defaultValue;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first || defaultValue : defaultValue;
  }
  return defaultValue;
}
