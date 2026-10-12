import type { FileInfo } from '../../../shared/types';

/**
 * Incoming takes are listed oldest first, by FILE NAME.
 *
 * Recorders stamp the recording time into the name ("Ecamm Recording on 2026-10-12 at 09.18.09.mov",
 * "DJI_20260925141931_0244_D.MP4"), so name order is recording order. Arrival order is not: a take that
 * is renamed and then brought back (undo) re-enters the watcher as a new file and used to land at the
 * bottom of the list. David, 2026-10-12: "they lose the order on the screen, though they don't lose the
 * order in the file names".
 */
const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function compareIncoming(a: FileInfo, b: FileInfo): number {
  return nameCollator.compare(a.filename, b.filename) || a.path.localeCompare(b.path);
}

export function insertIncoming(files: FileInfo[], file: FileInfo): FileInfo[] {
  return [...files, file].sort(compareIncoming);
}
