/**
 * FR-99: Transcription Telemetry Logging
 *
 * Collects timing data for transcriptions to enable future duration predictions.
 * Phase 1: Data collection only, no UI.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Telemetry file stored alongside config.json in server/
const TELEMETRY_FILE = path.join(__dirname, '..', '..', 'transcription-telemetry.json');

export interface TranscriptionLogEntry {
  timestamp: string;           // ISO timestamp when transcription completed
  filename: string;            // e.g., "01-1-intro.mov"
  videoDurationSec: number;    // Length of video in seconds
  transcriptionDurationSec: number;  // Time Whisper took to transcribe
  fileSizeBytes: number;       // Video file size
}

interface TelemetryData {
  entries: TranscriptionLogEntry[];
}

/**
 * Read telemetry data from file
 * Returns empty entries array if file doesn't exist
 */
export async function readTelemetry(): Promise<TelemetryData> {
  try {
    if (await fs.pathExists(TELEMETRY_FILE)) {
      const data = await fs.readJson(TELEMETRY_FILE);
      return data as TelemetryData;
    }
  } catch (err) {
    console.error('Error reading telemetry file:', err);
  }
  return { entries: [] };
}

/**
 * Append a new telemetry entry and write back to file
 */
export async function appendTelemetryEntry(entry: TranscriptionLogEntry): Promise<void> {
  try {
    const data = await readTelemetry();
    data.entries.push(entry);
    await fs.writeJson(TELEMETRY_FILE, data, { spaces: 2 });
    console.log(`Telemetry logged: ${entry.filename} - ${entry.transcriptionDurationSec.toFixed(1)}s for ${entry.videoDurationSec.toFixed(1)}s video`);
  } catch (err) {
    console.error('Error writing telemetry:', err);
  }
}
