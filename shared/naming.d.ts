/**
 * Centralized naming utilities for chapter, sequence, and asset naming
 *
 * This module is the single source of truth for:
 * - Validation rules and patterns
 * - Filename parsing (recordings and images)
 * - Filename building
 * - Sorting comparators
 * - Numeric conversions and formatting
 */
export declare const NAMING_RULES: {
    readonly chapter: {
        readonly pattern: RegExp;
        readonly parsePattern: RegExp;
        readonly digits: 2;
        readonly min: 1;
        readonly max: 99;
        readonly errorMessage: "Chapter must be a 2-digit number (01-99)";
    };
    readonly sequence: {
        readonly pattern: RegExp;
        readonly minDigits: 1;
        readonly min: 1;
        readonly errorMessage: "Sequence must be a number (1, 2, 3, ...)";
    };
    readonly imageOrder: {
        readonly pattern: RegExp;
        readonly minDigits: 1;
        readonly min: 1;
        readonly errorMessage: "Image order must be a number (1, 2, 3, ...)";
    };
    readonly variant: {
        readonly pattern: RegExp;
        readonly options: readonly [null, "a", "b", "c"];
        readonly errorMessage: "Variant must be a single lowercase letter (a-z)";
    };
    readonly label: {
        readonly pattern: RegExp;
        readonly maxLength: 50;
        readonly errorMessage: "Label must be kebab-case (lowercase letters, numbers, hyphens only)";
    };
    readonly name: {
        readonly pattern: RegExp;
        readonly maxLength: 50;
        readonly errorMessage: "Name must be kebab-case (lowercase letters, numbers, periods, hyphens only)";
    };
};
export declare const PATTERNS: {
    readonly CHAPTER: RegExp;
    readonly SEQUENCE: RegExp;
    readonly PROJECT_CODE: RegExp;
};
export declare function validateChapter(value: string): string | null;
export declare function validateSequence(value: string): string | null;
export declare function validateImageOrder(value: string): string | null;
export declare function validateVariant(value: string | null): string | null;
export declare function validateLabel(value: string): string | null;
export declare function validateName(value: string): string | null;
export interface ParsedRecording {
    chapter: string;
    sequence: string | null;
    name: string;
}
export interface ParsedImageAsset {
    chapter: string;
    sequence: string;
    imageOrder: string;
    variant: string | null;
    label: string;
}
/**
 * Options for parsing functions
 */
export interface ParseOptions {
    /**
     * When true, accepts 1-2 digit chapters (for reading legacy files).
     * When false, requires exactly 2 digits (strict validation).
     *
     * Postel's Law: "Be strict in what you create, lenient in what you accept."
     * New files always use 2-digit chapters, but we accept 1-digit for backwards compatibility.
     */
    lenient?: boolean;
}
/**
 * Parse a recording filename into its components
 * Format: {chapter}-{sequence}-{name}-{tags}.mov or {chapter}-{name}.mov
 * Examples: 10-5-intro.mov, 10-10-john-product-manager-CTA.mov, 1-1-demo.mov (lenient)
 *
 * @param filename - The filename to parse
 * @param options - Parse options (lenient: true accepts 1-digit chapters)
 */
export declare function parseRecordingFilename(filename: string, options?: ParseOptions): ParsedRecording | null;
/**
 * Parse an image asset filename into its components
 * Format: {chapter}-{seq}-{imgOrder}{variant}-{label}.{ext}
 * Examples: 05-3-1-demo.png, 10-10-2a-workflow.png, 5-3-1-demo.png (lenient)
 *
 * @param filename - The filename to parse
 * @param options - Parse options (lenient: true accepts 1-digit chapters)
 */
export declare function parseImageFilename(filename: string, options?: ParseOptions): ParsedImageAsset | null;
/**
 * FR-22: Parse a prompt filename into its components
 * Format: {chapter}-{seq}-{imgOrder}{variant}-{label}.txt
 * Examples: 05-3-1-demo.txt, 10-10-2a-workflow.txt, 5-3-1-demo.txt (lenient)
 *
 * @param filename - The filename to parse
 * @param options - Parse options (lenient: true accepts 1-digit chapters)
 */
export declare function parsePromptFilename(filename: string, options?: ParseOptions): ParsedImageAsset | null;
/**
 * Sanitize a name to kebab-case
 */
export declare function sanitizeName(name: string): string;
/**
 * Build a recording filename from components
 */
export declare function buildRecordingFilename(chapter: string, sequence: string | null, name: string, tags?: string[]): string;
/**
 * Build an image asset filename from components
 */
export declare function buildImageFilename(chapter: string, sequence: string, imageOrder: string, variant: string | null, label: string, extension?: string): string;
/**
 * Parse chapter string to number
 */
export declare function parseChapterNum(chapter: string): number;
/**
 * Parse sequence string to number
 */
export declare function parseSequenceNum(sequence: string): number;
/**
 * Format a number as a 2-digit chapter string
 */
export declare function formatChapter(num: number): string;
/**
 * Format a number as a sequence string
 */
export declare function formatSequence(num: number): string;
/**
 * Compare two items by chapter and sequence (numeric sorting)
 */
export declare function compareChapterSequence(a: {
    chapter: string;
    sequence: string;
}, b: {
    chapter: string;
    sequence: string;
}): number;
/**
 * Compare two recordings by chapter, sequence, then timestamp
 */
export declare function compareRecordings(a: {
    chapter: string;
    sequence: string;
    timestamp: string;
}, b: {
    chapter: string;
    sequence: string;
    timestamp: string;
}): number;
/**
 * Compare two image assets by chapter, sequence, imageOrder, then variant
 */
export declare function compareImageAssets(a: {
    chapter: string;
    sequence: string;
    imageOrder: string;
    variant: string | null;
}, b: {
    chapter: string;
    sequence: string;
    imageOrder: string;
    variant: string | null;
}): number;
/**
 * Find the next sequence number for a given chapter
 */
export declare function findNextSequence(items: {
    chapter: string;
    sequence: string;
}[], chapter: string): string;
/**
 * Find the max image order for a chapter-sequence, or 0 if none exist
 */
export declare function findMaxImageOrder(items: {
    chapter: string;
    sequence: string;
    imageOrder: string;
}[], chapter: string, sequence: string): number;
/**
 * Calculate suggested naming based on existing recordings
 */
export declare function calculateSuggestedNaming(existingFiles: string[]): {
    chapter: string;
    sequence: string;
    name: string;
};
