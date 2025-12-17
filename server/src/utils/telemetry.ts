/**
 * FR-99: Transcription Telemetry Logging
 *
 * Collects timing data for transcriptions to enable future duration predictions.
 * Uses JSONL format (one JSON object per line) for efficient append-only logging.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Telemetry file stored alongside config.json in server/
// Uses .jsonl (JSON Lines) format - one entry per line, append-only
const TELEMETRY_FILE = path.join(__dirname, '..', '..', 'transcription-telemetry.jsonl');

export interface TranscriptionLogEntry {
  startTimestamp: string;      // ISO timestamp when transcription started
  endTimestamp: string;        // ISO timestamp when transcription completed
  project: string;             // Project name (e.g., "b85-clauding-01")
  filename: string;            // Just the filename (e.g., "01-1-intro.mov")
  path: string;                // Full absolute path to video
  videoDurationSec: number;    // Length of video in seconds
  transcriptionDurationSec: number;  // Time Whisper took to transcribe
  ratio: number;               // transcriptionDurationSec / videoDurationSec
  fileSizeBytes: number;       // Video file size
  model: string;               // Whisper model used (e.g., "medium")
  success: boolean;            // Whether transcription succeeded
}

/**
 * Read all telemetry entries from file
 * Returns empty array if file doesn't exist or has errors
 */
export async function readTelemetry(): Promise<TranscriptionLogEntry[]> {
  try {
    if (!await fs.pathExists(TELEMETRY_FILE)) {
      return [];
    }
    const content = await fs.readFile(TELEMETRY_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    const entries: TranscriptionLogEntry[] = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch {
        // Skip malformed lines
        console.warn('Skipping malformed telemetry line:', line.substring(0, 50));
      }
    }
    return entries;
  } catch (err) {
    console.error('Error reading telemetry file:', err);
    return [];
  }
}

/**
 * Append a new telemetry entry (single line, no file rewrite)
 */
export async function appendTelemetryEntry(entry: TranscriptionLogEntry): Promise<void> {
  try {
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(TELEMETRY_FILE, line, 'utf-8');
    console.log(`Telemetry logged: ${entry.project}/${entry.filename} - ${entry.transcriptionDurationSec.toFixed(1)}s for ${entry.videoDurationSec.toFixed(1)}s video (${entry.ratio.toFixed(2)}x)`);
  } catch (err) {
    console.error('Error writing telemetry:', err);
  }
}
