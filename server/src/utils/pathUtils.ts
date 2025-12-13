import path from 'path'
import os from 'os'

/**
 * Expand ~ to home directory in file paths
 */
export function expandPath(filePath: string): string {
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1))
  }
  return filePath
}
