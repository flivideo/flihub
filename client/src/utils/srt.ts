/**
 * FR-75: SRT Parsing Utilities for Transcript Sync
 *
 * Parse SRT subtitle files and distribute timing across words.
 */

/**
 * A single SRT entry (phrase with timing)
 */
export interface SrtEntry {
  index: number
  startTime: number  // seconds
  endTime: number    // seconds
  text: string
}

/**
 * A word with computed timing (for word-level highlighting)
 */
export interface TimedWord {
  word: string
  startTime: number
  endTime: number
  entryIndex: number  // Which SRT entry this word belongs to
}

/**
 * Parse SRT timestamp string to seconds
 * Format: HH:MM:SS,mmm or HH:MM:SS.mmm
 */
export function parseSrtTimestamp(timestamp: string): number {
  // Handle both comma and period as millisecond separator
  const normalized = timestamp.replace(',', '.')
  const parts = normalized.split(':')

  if (parts.length !== 3) return 0

  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  const secondsParts = parts[2].split('.')
  const seconds = parseInt(secondsParts[0], 10) || 0
  const milliseconds = parseInt(secondsParts[1] || '0', 10) || 0

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

/**
 * Parse SRT content into entries
 */
export function parseSrt(content: string): SrtEntry[] {
  const entries: SrtEntry[] = []
  const blocks = content.trim().split(/\n\n+/)

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 3) continue

    // First line: index number
    const index = parseInt(lines[0], 10)
    if (isNaN(index)) continue

    // Second line: timestamp range
    const timestampLine = lines[1]
    const timestampMatch = timestampLine.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/)
    if (!timestampMatch) continue

    const startTime = parseSrtTimestamp(timestampMatch[1])
    const endTime = parseSrtTimestamp(timestampMatch[2])

    // Remaining lines: text content
    const text = lines.slice(2).join(' ')

    entries.push({ index, startTime, endTime, text })
  }

  return entries
}

/**
 * Convert SRT entries to timed words by distributing timing evenly
 */
export function srtToTimedWords(entries: SrtEntry[]): TimedWord[] {
  const words: TimedWord[] = []

  for (const entry of entries) {
    const entryWords = entry.text.split(/\s+/).filter(Boolean)
    if (entryWords.length === 0) continue

    const duration = entry.endTime - entry.startTime
    const wordDuration = duration / entryWords.length

    entryWords.forEach((word, i) => {
      words.push({
        word,
        startTime: entry.startTime + i * wordDuration,
        endTime: entry.startTime + (i + 1) * wordDuration,
        entryIndex: entry.index,
      })
    })
  }

  return words
}

/**
 * Find the current SRT entry at a given time
 */
export function findCurrentEntry(entries: SrtEntry[], currentTime: number): SrtEntry | null {
  return entries.find(e => currentTime >= e.startTime && currentTime < e.endTime) || null
}

/**
 * Find the current word at a given time
 */
export function findCurrentWord(words: TimedWord[], currentTime: number): TimedWord | null {
  return words.find(w => currentTime >= w.startTime && currentTime < w.endTime) || null
}

/**
 * Get all text combined from SRT entries
 */
export function getSrtFullText(entries: SrtEntry[]): string {
  return entries.map(e => e.text).join(' ')
}
