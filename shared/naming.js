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
// ============================================
// NAMING RULES - Single source of truth
// ============================================
export const NAMING_RULES = {
    chapter: {
        pattern: /^\d{2}$/, // Strict: exactly 2 digits (for validation/creating new files)
        parsePattern: /^\d{1,2}$/, // Lenient: 1-2 digits (for reading existing files - Postel's Law)
        digits: 2,
        min: 1,
        max: 99,
        errorMessage: 'Chapter must be a 2-digit number (01-99)',
    },
    sequence: {
        pattern: /^\d+$/,
        minDigits: 1,
        min: 1,
        errorMessage: 'Sequence must be a number (1, 2, 3, ...)',
    },
    imageOrder: {
        pattern: /^\d+$/,
        minDigits: 1,
        min: 1,
        errorMessage: 'Image order must be a number (1, 2, 3, ...)',
    },
    variant: {
        pattern: /^[a-z]$/,
        options: [null, 'a', 'b', 'c'],
        errorMessage: 'Variant must be a single lowercase letter (a-z)',
    },
    label: {
        pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/,
        maxLength: 50,
        errorMessage: 'Label must be kebab-case (lowercase letters, numbers, hyphens only)',
    },
    name: {
        pattern: /^[a-z0-9.]+(-[a-z0-9.]+)*$/,
        maxLength: 50,
        errorMessage: 'Name must be kebab-case (lowercase letters, numbers, periods, hyphens only)',
    },
};
// Re-export patterns for backwards compatibility with existing code
export const PATTERNS = {
    CHAPTER: NAMING_RULES.chapter.pattern,
    SEQUENCE: NAMING_RULES.sequence.pattern,
    PROJECT_CODE: NAMING_RULES.name.pattern,
};
// ============================================
// VALIDATION FUNCTIONS
// ============================================
export function validateChapter(value) {
    if (!value)
        return NAMING_RULES.chapter.errorMessage;
    if (!NAMING_RULES.chapter.pattern.test(value)) {
        return NAMING_RULES.chapter.errorMessage;
    }
    return null;
}
export function validateSequence(value) {
    if (!value)
        return NAMING_RULES.sequence.errorMessage;
    if (!NAMING_RULES.sequence.pattern.test(value)) {
        return NAMING_RULES.sequence.errorMessage;
    }
    return null;
}
export function validateImageOrder(value) {
    if (!value)
        return NAMING_RULES.imageOrder.errorMessage;
    if (!NAMING_RULES.imageOrder.pattern.test(value)) {
        return NAMING_RULES.imageOrder.errorMessage;
    }
    return null;
}
export function validateVariant(value) {
    if (value === null)
        return null; // null is valid (no variant)
    if (!NAMING_RULES.variant.pattern.test(value)) {
        return NAMING_RULES.variant.errorMessage;
    }
    return null;
}
export function validateLabel(value) {
    if (!value || value.length === 0) {
        return 'Label is required';
    }
    if (!NAMING_RULES.label.pattern.test(value)) {
        return NAMING_RULES.label.errorMessage;
    }
    if (value.length > NAMING_RULES.label.maxLength) {
        return `Label must be ${NAMING_RULES.label.maxLength} characters or less`;
    }
    return null;
}
export function validateName(value) {
    if (!value || value.length === 0) {
        return 'Name is required';
    }
    if (!NAMING_RULES.name.pattern.test(value)) {
        return NAMING_RULES.name.errorMessage;
    }
    if (value.length > NAMING_RULES.name.maxLength) {
        return `Name must be ${NAMING_RULES.name.maxLength} characters or less`;
    }
    return null;
}
/**
 * FR-54: Strip uppercase-only words (tags) from the end of a name parts array
 * Tags are words that are entirely uppercase letters (A-Z), like CTA, TECHSTACK, API
 */
function stripTrailingTags(parts) {
    const result = [...parts];
    // Remove uppercase-only words from the end
    while (result.length > 0 && /^[A-Z]+$/.test(result[result.length - 1])) {
        result.pop();
    }
    return result;
}
/**
 * Parse a recording filename into its components
 * Format: {chapter}-{sequence}-{name}-{tags}.mov or {chapter}-{name}.mov
 * Examples: 10-5-intro.mov, 10-10-john-product-manager-CTA.mov, 1-1-demo.mov (lenient)
 *
 * @param filename - The filename to parse
 * @param options - Parse options (lenient: true accepts 1-digit chapters)
 */
export function parseRecordingFilename(filename, options = { lenient: true }) {
    // Remove extension
    const base = filename.replace(/\.mov$/i, '');
    const parts = base.split('-');
    if (parts.length < 2)
        return null;
    const chapter = parts[0];
    const chapterPattern = options.lenient
        ? NAMING_RULES.chapter.parsePattern
        : NAMING_RULES.chapter.pattern;
    if (!chapterPattern.test(chapter))
        return null;
    // Check if second part is a sequence (one or more digits)
    if (NAMING_RULES.sequence.pattern.test(parts[1])) {
        // FR-54: Strip uppercase-only words (tags) from the end of the name
        const nameParts = stripTrailingTags(parts.slice(2));
        return {
            chapter,
            sequence: parts[1],
            name: nameParts.join('-') || '',
        };
    }
    // No sequence - rest is name
    // FR-54: Strip uppercase-only words (tags) from the end of the name
    const nameParts = stripTrailingTags(parts.slice(1));
    return {
        chapter,
        sequence: null,
        name: nameParts.join('-'),
    };
}
/**
 * Parse an image asset filename into its components
 * Format: {chapter}-{seq}-{imgOrder}{variant}-{label}.{ext}
 * Examples: 05-3-1-demo.png, 10-10-2a-workflow.png, 5-3-1-demo.png (lenient)
 *
 * @param filename - The filename to parse
 * @param options - Parse options (lenient: true accepts 1-digit chapters)
 */
export function parseImageFilename(filename, options = { lenient: true }) {
    // Get extension and base
    const extMatch = filename.match(/\.(png|jpg|jpeg|webp)$/i);
    if (!extMatch)
        return null;
    const base = filename.slice(0, -extMatch[0].length);
    // Pattern: {chapter:1-2 digits (lenient) or 2 digits (strict)}-{sequence}-{imageOrder}{variant}-{label}
    const chapterPattern = options.lenient ? '(\\d{1,2})' : '(\\d{2})';
    const regex = new RegExp(`^${chapterPattern}-(\\d+)-(\\d+)([a-z])?-(.+)$`);
    const match = base.match(regex);
    if (!match)
        return null;
    return {
        chapter: match[1],
        sequence: match[2],
        imageOrder: match[3],
        variant: match[4] || null,
        label: match[5],
    };
}
/**
 * FR-22: Parse a prompt filename into its components
 * Format: {chapter}-{seq}-{imgOrder}{variant}-{label}.txt
 * Examples: 05-3-1-demo.txt, 10-10-2a-workflow.txt, 5-3-1-demo.txt (lenient)
 *
 * @param filename - The filename to parse
 * @param options - Parse options (lenient: true accepts 1-digit chapters)
 */
export function parsePromptFilename(filename, options = { lenient: true }) {
    // Must be .txt file
    if (!filename.endsWith('.txt'))
        return null;
    const base = filename.slice(0, -4); // Remove .txt
    // Pattern: {chapter:1-2 digits (lenient) or 2 digits (strict)}-{sequence}-{imageOrder}{variant}-{label}
    const chapterPattern = options.lenient ? '(\\d{1,2})' : '(\\d{2})';
    const regex = new RegExp(`^${chapterPattern}-(\\d+)-(\\d+)([a-z])?-(.+)$`);
    const match = base.match(regex);
    if (!match)
        return null;
    return {
        chapter: match[1],
        sequence: match[2],
        imageOrder: match[3],
        variant: match[4] || null,
        label: match[5],
    };
}
// ============================================
// FILENAME BUILDING FUNCTIONS
// ============================================
/**
 * Sanitize a name to kebab-case
 */
export function sanitizeName(name) {
    return name
        .toLowerCase()
        .replace(/\s+/g, '-') // spaces to hyphens
        .replace(/[^a-z0-9.-]/g, '') // remove special chars (keep periods)
        .replace(/-+/g, '-') // multiple hyphens to single
        .replace(/^-|-$/g, '') // trim leading/trailing hyphens
        .slice(0, NAMING_RULES.name.maxLength);
}
/**
 * Build a recording filename from components
 */
export function buildRecordingFilename(chapter, sequence, name, tags = []) {
    const parts = [chapter];
    if (sequence) {
        parts.push(sequence);
    }
    parts.push(sanitizeName(name));
    parts.push(...tags);
    return parts.join('-') + '.mov';
}
/**
 * Build an image asset filename from components
 */
export function buildImageFilename(chapter, sequence, imageOrder, variant, label, extension = '.png') {
    const variantSuffix = variant || '';
    return `${chapter}-${sequence}-${imageOrder}${variantSuffix}-${label}${extension}`;
}
// ============================================
// NUMERIC UTILITIES
// ============================================
/**
 * Parse chapter string to number
 */
export function parseChapterNum(chapter) {
    return parseInt(chapter, 10);
}
/**
 * Parse sequence string to number
 */
export function parseSequenceNum(sequence) {
    return parseInt(sequence, 10);
}
/**
 * Format a number as a 2-digit chapter string
 */
export function formatChapter(num) {
    return String(Math.max(1, Math.min(99, num))).padStart(2, '0');
}
/**
 * Format a number as a sequence string
 */
export function formatSequence(num) {
    return String(Math.max(1, num));
}
// ============================================
// SORTING COMPARATORS
// ============================================
/**
 * Compare two items by chapter and sequence (numeric sorting)
 */
export function compareChapterSequence(a, b) {
    const chapterCompare = parseChapterNum(a.chapter) - parseChapterNum(b.chapter);
    if (chapterCompare !== 0)
        return chapterCompare;
    return parseSequenceNum(a.sequence) - parseSequenceNum(b.sequence);
}
/**
 * Compare two recordings by chapter, sequence, then timestamp
 */
export function compareRecordings(a, b) {
    const csCompare = compareChapterSequence(a, b);
    if (csCompare !== 0)
        return csCompare;
    return a.timestamp.localeCompare(b.timestamp);
}
/**
 * Compare two image assets by chapter, sequence, imageOrder, then variant
 */
export function compareImageAssets(a, b) {
    const chapterCompare = parseChapterNum(a.chapter) - parseChapterNum(b.chapter);
    if (chapterCompare !== 0)
        return chapterCompare;
    const seqCompare = parseSequenceNum(a.sequence) - parseSequenceNum(b.sequence);
    if (seqCompare !== 0)
        return seqCompare;
    const orderCompare = parseInt(a.imageOrder, 10) - parseInt(b.imageOrder, 10);
    if (orderCompare !== 0)
        return orderCompare;
    // Sort variants: null first, then a, b, c...
    if (a.variant === null && b.variant !== null)
        return -1;
    if (a.variant !== null && b.variant === null)
        return 1;
    return (a.variant || '').localeCompare(b.variant || '');
}
// ============================================
// CALCULATION UTILITIES
// ============================================
/**
 * Find the next sequence number for a given chapter
 */
export function findNextSequence(items, chapter) {
    const itemsInChapter = items.filter(i => i.chapter === chapter);
    if (itemsInChapter.length === 0)
        return '1';
    const maxSeq = Math.max(...itemsInChapter.map(i => parseSequenceNum(i.sequence)));
    return String(maxSeq + 1);
}
/**
 * Find the max image order for a chapter-sequence, or 0 if none exist
 */
export function findMaxImageOrder(items, chapter, sequence) {
    const matching = items.filter(i => i.chapter === chapter && i.sequence === sequence);
    if (matching.length === 0)
        return 0;
    return Math.max(...matching.map(i => parseInt(i.imageOrder, 10)));
}
/**
 * Calculate suggested naming based on existing recordings
 */
export function calculateSuggestedNaming(existingFiles) {
    const parsed = existingFiles
        .map(f => parseRecordingFilename(f))
        .filter((p) => p !== null && p.sequence !== null);
    if (parsed.length === 0) {
        return { chapter: '01', sequence: '1', name: 'intro' };
    }
    // Find highest chapter
    const maxChapter = Math.max(...parsed.map(p => parseChapterNum(p.chapter)));
    const filesInMaxChapter = parsed.filter(p => parseChapterNum(p.chapter) === maxChapter);
    // Find highest sequence in that chapter
    const maxSeq = Math.max(...filesInMaxChapter.map(p => parseSequenceNum(p.sequence || '0')));
    // Get name from last file for context
    const lastName = filesInMaxChapter[filesInMaxChapter.length - 1]?.name || '';
    return {
        chapter: formatChapter(maxChapter),
        sequence: String(maxSeq + 1),
        name: lastName,
    };
}
