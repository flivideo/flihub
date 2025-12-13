/**
 * Shared constants for FliHub
 */
export declare const FILE_SIZE: {
    /** Threshold for substantial files (5MB) - files smaller than this are likely junk takes */
    readonly SUBSTANTIAL_BYTES: number;
    readonly KB: 1024;
    readonly MB: number;
};
export declare const WATCHER: {
    /** Wait time after last file change before considering write complete (ms) */
    readonly STABILITY_THRESHOLD_MS: 2000;
    /** How often to check file stability (ms) */
    readonly POLL_INTERVAL_MS: 100;
};
export { PATTERNS } from './naming.js';
