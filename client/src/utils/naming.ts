/**
 * Build a preview filename from naming components
 */
export function buildPreviewFilename(
  chapter: string,
  sequence: string | null,
  name: string,
  tags: string[],
  customTag?: string
): string {
  if (!chapter || !name) return '...'
  const parts = [chapter]
  if (sequence) parts.push(sequence)
  parts.push(name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
  parts.push(...tags)
  // FR-21: Include custom tag if provided
  if (customTag) parts.push(customTag)
  return parts.join('-') + '.mov'
}
