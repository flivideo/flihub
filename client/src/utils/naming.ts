import { parseRecordingFilename, recordingExtension } from '../../../shared/naming';

/**
 * Build a preview filename from naming components.
 * `sourceFilename` is the file being named: its container (.mov/.mp4) is kept. Without one
 * (the global naming bar) the preview shows `.mov`.
 */
export function buildPreviewFilename(
  chapter: string,
  sequence: string | null,
  name: string,
  tags: string[],
  customTag?: string,
  sourceFilename?: string
): string {
  if (!chapter || !name) return '...';
  const parts = [chapter];
  if (sequence) parts.push(sequence);
  parts.push(
    name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  );
  parts.push(...tags);
  // FR-21: Include custom tag if provided
  if (customTag) parts.push(customTag);
  return parts.join('-') + recordingExtension(sourceFilename);
}

/**
 * The transcript key for a recording: its full base name, TAGS INCLUDED (2026-09-25).
 * Transcripts are written as <base>.srt; rebuilding the name from parsed parts drops the tags
 * (01-1-intro-HOOK.mov → 01-1-intro) and the SRT lookup 404s. Null when not a recording name.
 */
export function segmentNameOf(recordingName: string | null | undefined): string | null {
  if (!recordingName || !parseRecordingFilename(recordingName)) return null;
  return recordingName.replace(/\.(mov|mp4)$/i, '');
}
