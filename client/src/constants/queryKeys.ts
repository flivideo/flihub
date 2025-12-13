/**
 * Centralized query keys for TanStack Query
 * Makes cache invalidation easier to manage
 */
export const QUERY_KEYS = {
  config: ['config'] as const,
  suggestedNaming: ['suggested-naming'] as const,
  projects: ['projects'] as const,
  recordings: ['recordings'] as const,
  // FR-17: Image asset management
  incomingImages: ['assets', 'incoming'] as const,
  projectImages: ['assets', 'images'] as const,
  nextImageOrder: (chapter: string, sequence: string) => ['assets', 'next-order', chapter, sequence] as const,
  nextImageOrderPrefix: ['assets', 'next-order'] as const,  // For invalidating all next-order queries
  // FR-22: Prompt management
  prompt: (filename: string) => ['assets', 'prompt', filename] as const,
  // FR-27: Thumbnail management
  thumbs: ['thumbs'] as const,
  thumbZips: ['thumbs', 'zips'] as const,
  thumbZipContents: (filename: string) => ['thumbs', 'zip', filename] as const,
  // FR-30: Transcription management
  transcriptions: ['transcriptions'] as const,
  transcriptionStatus: (filename: string) => ['transcription-status', filename] as const,
  transcript: (filename: string) => ['transcript', filename] as const,
  chapterStatus: (chapter: string) => ['chapter-status', chapter] as const,
  // FR-55: Combined video transcript
  combinedTranscript: ['combined-transcript'] as const,
  // FR-32: Project stats management
  projectStats: ['project-stats'] as const,
  // FR-33: Final media detection
  finalMedia: (code: string) => ['final-media', code] as const,
  // FR-34: Chapter timestamp extraction
  chapters: (code: string) => ['chapters', code] as const,
  // FR-34 Enhancement: Chapter overrides
  chapterOverrides: (code: string) => ['chapter-overrides', code] as const,
  // FR-48: Transcript sync validation
  transcriptSync: (code: string) => ['transcript-sync', code] as const,
  // FR-50: Recent renames for undo
  recentRenames: ['recent-renames'] as const,
} as const
