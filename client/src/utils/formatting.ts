import { extractTagsFromName } from '../../../shared/naming'

/**
 * NFR-10: Format file size for display
 * Handles B, KB, MB, and GB with appropriate precision
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Collapse expanded path back to using ~ for display
 * e.g., /Users/davidcruwys/dev/foo -> ~/dev/foo
 */
export function collapsePath(path: string): string {
  const homeDir = '/Users/'
  if (path.startsWith(homeDir)) {
    const afterUsers = path.slice(homeDir.length)
    const slashIndex = afterUsers.indexOf('/')
    if (slashIndex > 0) {
      return '~' + afterUsers.slice(slashIndex)
    }
  }
  return path
}

/**
 * NFR-79: Convert text to kebab-case for labels and filenames
 * Handles spaces, removes invalid characters, collapses multiple dashes
 * @param text Input text (may contain spaces, mixed case, special chars)
 * @returns kebab-case string (e.g., "My Label!" -> "my-label")
 */
export function toKebabCase(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove invalid chars (keep spaces and existing dashes)
    .replace(/\s+/g, '-')          // Replace spaces with dashes
    .replace(/-+/g, '-')           // Collapse multiple dashes
    .replace(/^-|-$/g, '')         // Trim leading/trailing dashes
}

/**
 * FR-41: Time format styles
 * - smart: Current behavior, adds 's' suffix for values under 60 (e.g., 18s, 2:34, 1:02:34)
 * - youtube: Always MM:SS or H:MM:SS, zero-padded, for chapter timestamps (e.g., 00:18, 02:34, 1:02:34)
 * - seconds: Raw number as string (e.g., 18, 154, 3754)
 */
export type TimeFormatStyle = 'smart' | 'youtube' | 'seconds'

/**
 * NFR-7 / FR-41: Format video duration for display
 * @param seconds Duration in seconds, or null/undefined
 * @param style Format style: 'smart' (default), 'youtube', or 'seconds'
 * @returns Formatted string based on style, or "-" if unavailable
 */
export function formatDuration(
  seconds: number | null | undefined,
  style: TimeFormatStyle = 'smart'
): string {
  if (seconds == null) return '-'

  const totalSeconds = Math.floor(seconds)

  // Seconds style: just the raw number
  if (style === 'seconds') {
    return String(totalSeconds)
  }

  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  // YouTube style: always zero-padded MM:SS or H:MM:SS
  if (style === 'youtube') {
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Smart style (default): add 's' suffix for short durations
  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * FR-55/FR-56: Format chapter title for display
 * Strips video codes (01, 02) and tags (TECHSTACK, CTA), converts to Title Case
 * @param name kebab-case name from recording (e.g., "poem-planning", "setup-bmad-TECHSTACK")
 * @returns Title Case string (e.g., "Poem Planning", "Setup Bmad")
 */
export function formatChapterTitle(name: string): string {
  if (!name) return ''

  // NFR-65: Use shared utility to strip tags from name
  const { name: cleanName } = extractTagsFromName(name)

  // Convert to Title Case
  return cleanName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * FR-46: Format timestamp as relative time (e.g., "5s ago", "3m ago", "2h ago")
 * Falls back to absolute format for older timestamps (≥24h)
 * @param timestamp ISO timestamp string or Date, or null
 * @returns Formatted relative time string, or "-" if null
 */
export function formatRelativeTime(timestamp: string | Date | null): string {
  if (!timestamp) return '-'
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)

  // Less than 60 seconds
  if (diffSeconds < 60) {
    return diffSeconds <= 0 ? 'just now' : `${diffSeconds}s ago`
  }

  // Less than 60 minutes
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }

  // Less than 24 hours
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  // Less than 30 days: show days ago
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) {
    return `${diffDays}d ago`
  }

  // 30+ days: show absolute date
  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * NFR-10: Format date for display (absolute date format)
 * @param timestamp ISO timestamp string or Date, or null
 * @returns Formatted date string (e.g., "15 Dec 2025"), or "-" if null
 */
export function formatDate(timestamp: string | Date | null): string {
  if (!timestamp) return '-'
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * NFR-10: Smart timestamp formatting - shows time if same day, otherwise date
 * @param timestamp ISO timestamp string or number (ms since epoch)
 * @returns Formatted time or date string
 */
export function formatTimestamp(timestamp: string | number): string {
  const date = new Date(timestamp)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString()
}

/**
 * NFR-10: Format time from timestamp (just the time portion)
 * @param timestamp ISO timestamp string
 * @returns Formatted time string (e.g., "14:30")
 */
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
