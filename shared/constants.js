/**
 * Shared constants for FliHub
 */
// File size thresholds
export const FILE_SIZE = {
    /** Threshold for substantial files (5MB) - files smaller than this are likely junk takes */
    SUBSTANTIAL_BYTES: 5 * 1024 * 1024,
    KB: 1024,
    MB: 1024 * 1024,
};
// Watcher configuration
export const WATCHER = {
    /** Wait time after last file change before considering write complete (ms) */
    STABILITY_THRESHOLD_MS: 2000,
    /** How often to check file stability (ms) */
    POLL_INTERVAL_MS: 100,
};
// Re-export PATTERNS from naming.ts for backwards compatibility
export { PATTERNS } from './naming.js';
