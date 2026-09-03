/**
 * FR-163 §4.3: convert a free-text description to the kebab name segment.
 * Deliberately NOT sanitizeName(): handles accents (NFD strip), '&' → 'and',
 * and NEVER clamps length (§4.4 — the clamp is what mangled d01 ch03).
 */
export function descriptionToKebab(input: string): string {
  return input
    .replace(/&/g, ' and ') // before punctuation stripping, so it survives
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining marks (Café → Cafe)
    .toLowerCase()
    .replace(/[^a-z0-9.\s-]/g, '') // drop punctuation/emoji; keep dots, digits
    .replace(/[\s_]+/g, '-') // whitespace → single hyphen
    .replace(/-+/g, '-') // collapse repeats
    .replace(/^[-.]+|[-.]+$/g, ''); // trim leading/trailing separators
}

/** FR-163 §4.2: a manually entered code must be letter + two digits. */
export const MANUAL_CODE_PATTERN = /^[a-z]\d{2}$/;

/** Full-name length guideline (shared/naming.ts maxLength; warn, never block — §4.4). */
export const NAME_LENGTH_GUIDELINE = 50;
