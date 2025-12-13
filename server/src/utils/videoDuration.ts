import { exec } from 'child_process';

/**
 * NFR-7: Get video duration using ffprobe
 * Returns duration in seconds, or null if ffprobe is unavailable or file is unreadable
 */
export function getVideoDuration(filePath: string): Promise<number | null> {
  return new Promise((resolve) => {
    exec(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
      (error, stdout) => {
        if (error) {
          // ffprobe not installed or file not readable
          return resolve(null);
        }
        const seconds = parseFloat(stdout.trim());
        resolve(isNaN(seconds) ? null : seconds);
      }
    );
  });
}
