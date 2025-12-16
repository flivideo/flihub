// Shared types between client and server

export interface FileInfo {
  path: string;
  filename: string;
  timestamp: string;
  size: number;      // File size in bytes
  duration?: number; // Video duration in seconds (if available)
}

// NFR-3: Common name configuration with optional rules
export interface CommonName {
  name: string;              // Display name and value (e.g., "intro")
  autoSequence?: boolean;    // Reset sequence to 1 when selected (default: false)
  suggestTags?: string[];    // Auto-suggest these tags when selected
}

export interface Config {
  watchDirectory: string;
  // FR-89 Part 5: Split projectDirectory into root + active project
  // Old field (deprecated, migrated on load):
  projectDirectory: string;  // NFR-6: Renamed from targetDirectory - points to project root
  // New fields:
  projectsRootDirectory?: string;  // FR-89: Root directory containing all projects (e.g., ~/dev/video-projects/v-appydave)
  activeProject?: string;          // FR-89: Currently selected project folder name (e.g., b67)
  fileExtensions: string[];
  availableTags: string[];   // NFR-2: Configurable tags
  commonNames: CommonName[]; // NFR-3: Quick-select common names
  imageSourceDirectory: string; // FR-17: Source for incoming images (default: ~/Downloads)
  projectPriorities?: Record<string, 'pinned'>; // FR-32: Pinned projects (absent = normal)
  projectStageOverrides?: Record<string, ProjectStage>; // FR-80: Manual stage overrides (absent = auto-detect)
  projectStages?: ProjectStage[]; // FR-80: Configurable stage list (defaults to DEFAULT_PROJECT_STAGES)
  chapterRecordings?: ChapterRecordingConfig;  // FR-58: Chapter recording settings
  shadowResolution?: number;  // FR-89 Part 6: Shadow video resolution (default: 240)
}

export interface RenameRequest {
  originalPath: string;
  chapter: string;
  sequence: string | null;
  name: string;
  tags: string[];
}

export interface RenameResponse {
  success: boolean;
  oldPath: string;
  newPath: string;
  error?: string;
}

// Default tags (used when config doesn't specify any)
export const DEFAULT_TAGS = ['cta', 'endcards'] as const;

// FR-4: Suggested naming based on existing files in target directory
export interface SuggestedNaming {
  chapter: string;
  sequence: string;
  name: string;
  existingFiles: string[];
}

// FR-10: Project info for project list panel
export interface ProjectInfo {
  code: string;           // e.g., "b72-opus-awesome"
  path: string;           // Full path to project folder
  fileCount: number;      // Number of .mov files in recordings/
  lastModified: string;   // ISO timestamp of most recent file
}

// FR-32: Extended project stats for improved project list
export type ProjectPriority = 'pinned' | 'normal';

// FR-80: New 8-stage workflow model (config-driven)
export type ProjectStage =
  | 'planning'
  | 'recording'
  | 'first-edit'
  | 'second-edit'
  | 'review'
  | 'ready-to-publish'
  | 'published'
  | 'archived';

// FR-80: Stage override includes 'auto' for auto-detection
export type ProjectStageOverride = ProjectStage | 'auto';

// FR-80: Default stages if not configured
export const DEFAULT_PROJECT_STAGES: ProjectStage[] = [
  'planning',
  'recording',
  'first-edit',
  'second-edit',
  'review',
  'ready-to-publish',
  'published',
  'archived',
];

// FR-80: Stage display labels for UI
export const STAGE_LABELS: Record<ProjectStage, string> = {
  'planning': 'Plan',
  'recording': 'REC',
  'first-edit': '1st Edit',
  'second-edit': '2nd Edit',
  'review': 'Review',
  'ready-to-publish': 'Ready',
  'published': 'Published',
  'archived': 'Archived',
};

// FR-48: Transcript sync status for validation & diagnostics
export interface TranscriptSyncStatus {
  matched: number;              // Recordings with matching transcript
  missingTranscripts: string[]; // Recording filenames without transcript
  orphanedTranscripts: string[]; // Transcript filenames without recording
}

// FR-48: Detailed transcript sync response
export interface TranscriptSyncResponse {
  success: boolean;
  matched: string[];            // Filenames that match (recording with transcript)
  missingTranscripts: string[]; // Recordings without transcript
  orphanedTranscripts: string[]; // Transcripts without recording
}

export interface ProjectStats {
  code: string;
  path: string;

  // Priority
  priority: ProjectPriority;

  // Counts
  recordingsCount: number;    // Files in recordings/
  safeCount: number;          // Files in recordings/-safe/
  totalFiles: number;         // recordingsCount + safeCount

  // Chapters
  chapterCount: number;       // Unique chapter numbers

  // Transcripts - FR-48: Enhanced with sync status
  transcriptCount: number;    // Individual transcripts (excludes *-chapter.txt) - now equals matched count
  transcriptPercent: number;  // (matched / totalFiles) * 100
  transcriptSync: {
    matched: number;
    missingCount: number;
    orphanedCount: number;
  };

  // Stage (auto-detected)
  stage: ProjectStage;

  // For stats popup
  createdAt: string | null;      // Folder creation time
  lastModified: string | null;   // Most recent file timestamp
  totalDuration: number | null;  // Sum of video durations in seconds (optional)
  imageCount: number;            // Files in assets/images/
  thumbCount: number;            // Files in assets/thumbs/

  // FR-80/FR-82: Content indicators with counts for tooltips
  hasInbox: boolean;             // Has files in inbox/
  hasAssets: boolean;            // Has files in assets/images/ or assets/prompts/
  hasChapters: boolean;          // Has .mov files in recordings/-chapters/
  inboxCount: number;            // FR-82: File count in inbox/ (for tooltip)
  chapterVideoCount: number;     // FR-82: .mov count in recordings/-chapters/ (for tooltip)

  // FR-83: Shadow recordings
  shadowCount: number;           // Shadow files in recording-shadows/
}

// FR-14: Recording file info for asset view
export interface RecordingFile {
  filename: string;
  path: string;
  size: number;
  timestamp: string;
  duration?: number;      // FR-36: Video duration in seconds (if available)
  chapter: string;        // Parsed from filename (e.g., "01")
  sequence: string;       // Parsed from filename (e.g., "1")
  name: string;           // Parsed from filename (e.g., "intro")
  tags: string[];         // Parsed from filename
  folder: 'recordings' | 'safe';  // Which folder it's in
  isShadow?: boolean;     // FR-83: True if shadow-only (no real recording)
  hasShadow?: boolean;    // FR-83: True if this recording has a shadow file
  shadowSize?: number | null;  // FR-95: Shadow file size in bytes (null if no shadow)
}

// FR-83: Shadow generation API responses
export interface ShadowStatusResponse {
  currentProject: {
    recordings: number;
    shadows: number;
    missing: number;
  };
  watchDirectory: {
    configured: boolean;
    exists: boolean;
    path: string;
  };
}

export interface ShadowGenerateResponse {
  success: boolean;
  created: number;
  skipped: number;
  errors?: string[];
}

export interface ShadowGenerateAllResponse {
  success: boolean;
  projects: number;
  created: number;
  skipped: number;
  errors?: string[];
}

// FR-17: Image info for incoming images from Downloads
export interface ImageInfo {
  path: string;           // Full path to image
  filename: string;       // Just the filename
  size: number;           // Size in bytes
  timestamp: string;      // ISO timestamp
  hash: string;           // MD5 hash for duplicate detection
  isDuplicate?: boolean;  // True if this is a duplicate of another image
  duplicateOf?: string;   // Path to the original if this is a duplicate
}

// FR-17: Image asset (parsed from filename in assets/images/)
export interface ImageAsset {
  path: string;
  filename: string;
  size: number;
  timestamp: string;
  chapter: string;        // 2 digits (01-99)
  sequence: string;       // 1 digit (1-9)
  imageOrder: string;     // 1 digit (1-9)
  variant: string | null; // Single letter (a-z) or null
  label: string;          // kebab-case description
  type?: 'image';         // FR-22: Optional type to distinguish from prompts
}

// FR-17: Request to assign an image
export interface AssignImageRequest {
  sourcePath: string;     // Path to image in Downloads
  chapter: string;        // 2 digits
  sequence: string;       // 1 digit
  imageOrder: string;     // 1 digit
  variant: string | null; // a-z or null
  label: string;          // kebab-case label
}

// FR-17: Response from assign image
export interface AssignImageResponse {
  success: boolean;
  oldPath: string;
  newPath: string;
  error?: string;
}

// FR-17: Response from next image order endpoint
export interface NextImageOrderResponse {
  chapter: string;
  sequence: string;
  nextImageOrder: string;
  existingCount: number;
}

// FR-22: Prompt asset (parsed from filename in assets/images/)
export interface PromptAsset {
  path: string;
  filename: string;
  size: number;
  timestamp: string;
  chapter: string;
  sequence: string;
  imageOrder: string;
  variant: string | null;
  label: string;
  type: 'prompt';
  content?: string;         // Full prompt text (for Shift+Hover preview)
  contentPreview?: string;  // First ~50 chars of content (for inline display)
}

// FR-22: Request to save a prompt
export interface SavePromptRequest {
  chapter: string;
  sequence: string;
  imageOrder: string;
  variant: string | null;
  label: string;
  content: string;
}

// FR-22: Response from save prompt
export interface SavePromptResponse {
  success: boolean;
  path: string;
  filename: string;
  created: boolean;  // true if new file, false if updated
  deleted?: boolean; // FR-38: true if file was deleted (empty content)
  error?: string;
}

// FR-22: Response from load prompt
export interface LoadPromptResponse {
  filename: string;
  content: string;
  chapter: string;
  sequence: string;
  imageOrder: string;
  variant: string | null;
  label: string;
}

// Socket.io event types
export interface ServerToClientEvents {
  'file:new': (file: FileInfo) => void;
  'file:deleted': (data: { path: string }) => void;  // FR-4: file deleted from disk
  'file:renamed': (data: { oldPath: string; newPath: string }) => void;
  'file:error': (data: { path: string; error: string }) => void;
  // NFR-5: Real-time updates
  'thumbs:changed': () => void;           // Thumb imported/deleted/reordered
  'thumbs:zip-added': () => void;         // New ZIP detected in Downloads
  'assets:incoming-changed': () => void;  // New/deleted image in source directory
  'assets:assigned-changed': () => void;  // Image assigned/deleted in assets/images
  'recordings:changed': () => void;       // Recording renamed/moved/deleted
  'projects:changed': () => void;         // Project folder changed
  'inbox:changed': () => void;            // FR-59: Inbox file added/removed
  'transcripts:changed': () => void;      // NFR-85: Transcript added/removed/changed
  // FR-58: Chapter recording events
  'chapters:generating': (data: { chapter: string; total: number; current: number }) => void;
  'chapters:generated': (data: { chapter: string; outputFile: string; srtFile?: string }) => void;  // FR-76: srtFile added
  'chapters:complete': (data: { generated: string[]; errors?: string[] }) => void;
  // FR-30: Transcription events
  'transcription:queued': (job: { jobId: string; videoPath: string; position: number }) => void;
  'transcription:started': (job: { jobId: string; videoPath: string }) => void;
  'transcription:progress': (data: { jobId: string; text: string }) => void;
  'transcription:complete': (job: { jobId: string; videoPath: string; transcriptPath: string }) => void;
  'transcription:error': (job: { jobId: string; videoPath: string; error: string }) => void;
}

export interface ClientToServerEvents {
  // Currently no client-to-server events needed
}

// FR-30: Transcription job status
export type TranscriptionStatus = 'none' | 'queued' | 'transcribing' | 'complete' | 'error';

// FR-30: Transcription job info
export interface TranscriptionJob {
  jobId: string;
  videoPath: string;
  videoFilename: string;
  status: TranscriptionStatus;
  duration?: number;      // FR-36: Video duration in seconds
  size?: number;          // FR-36: File size in bytes
  queuedAt?: string;      // ISO timestamp
  startedAt?: string;     // ISO timestamp
  completedAt?: string;   // ISO timestamp
  error?: string;         // Error message if failed
  streamedText?: string;  // Accumulated text during transcription
}

// FR-30: API response for transcription status
export interface TranscriptionsResponse {
  active: TranscriptionJob | null;
  queue: TranscriptionJob[];
  recent: TranscriptionJob[];  // Last 5 completed/failed
}

// FR-30: Single file transcription status
export interface TranscriptionStatusResponse {
  filename: string;
  status: TranscriptionStatus;
  transcriptPath?: string;  // Path to .txt file if complete
}

// FR-30: Transcript content response
export interface TranscriptContentResponse {
  filename: string;
  content: string;
}

// FR-64: Generic file content response (for inbox file viewer)
export interface FileContentResponse {
  success: boolean;
  filename: string;
  content: string;
  mimeType: string;
  error?: string;
}

// FR-33: Final video and SRT detection
export type FinalMediaLocation = 'final' | 's3-staging' | 'root';

export interface FinalVideoInfo {
  path: string;
  filename: string;
  size: number;
  version?: number;
  location: FinalMediaLocation;
}

export interface FinalSrtInfo {
  path: string;
  filename: string;
  size: number;
  location: FinalMediaLocation;
}

export interface AdditionalSegment {
  filename: string;
  size: number;
  hasSrt: boolean;
}

export interface FinalMediaResponse {
  success: boolean;
  video?: FinalVideoInfo;
  srt?: FinalSrtInfo;
  additionalSegments?: AdditionalSegment[];
}

// FR-34: Chapter timestamp extraction
export type ChapterMatchStatus = 'matched' | 'low_confidence' | 'not_found';

// A single match candidate for a chapter
export interface ChapterMatchCandidate {
  timestamp: string;         // "02:34" format
  timestampSeconds: number;  // 154 (seconds from start)
  confidence: number;        // 0-100
  matchedText: string;       // SRT text that was matched (for verification)
  matchMethod: 'phrase' | 'partial' | 'keyword';  // How it was matched
}

export interface ChapterMatch {
  chapter: number;           // 1, 2, 3...
  name: string;              // "intro", "setup-bmad"
  displayName: string;       // "Intro", "Setting up BMAD"
  timestamp?: string;        // "02:34" or null if not found
  timestampSeconds?: number; // 154 (seconds from start)
  confidence: number;        // 0-100
  status: ChapterMatchStatus;
  // New fields for verification UI
  matchedText?: string;      // SRT text that was matched
  transcriptSnippet?: string; // First ~100 chars of transcript for comparison
  alternatives?: ChapterMatchCandidate[];  // Other potential matches
  matchReason?: string;      // Human-readable reason, e.g., "Matched 7 words at position 0"
}

export interface ChaptersResponse {
  success: boolean;
  chapters: ChapterMatch[];
  formatted: string;         // Ready-to-copy YouTube format
  error?: string;
  stats?: {
    elapsedMs: number;       // Time taken in milliseconds
    srtSegments: number;     // Number of SRT segments parsed
    chaptersFound: number;   // Chapters successfully matched
    chaptersTotal: number;   // Total chapters processed
  };
}

// FR-34 Enhancement: LLM-based chapter verification

// Request to verify a chapter timestamp using LLM
export interface ChapterVerifyRequest {
  chapter: number;
  name: string;
  transcriptSnippet: string;      // First ~200 chars of transcript
  currentMatch?: {                // Current algorithmic match (if any)
    timestamp: string;
    confidence: number;
    matchedText: string;
  };
  alternatives?: ChapterMatchCandidate[];  // Other potential matches
  userHint?: string;              // User-provided context (e.g., "first 15s were cut")
}

// LLM's verification response
export interface ChapterVerifyResponse {
  success: boolean;
  chapter: number;
  name: string;
  recommendation: {
    action: 'use_current' | 'use_alternative' | 'manual_timestamp' | 'skip';
    timestamp?: string;           // Recommended timestamp
    timestampSeconds?: number;
    confidence: number;           // LLM's confidence in recommendation
    reasoning: string;            // Explanation for the user
  };
  error?: string;
}

// Manual override for a chapter (stored in project config)
export interface ChapterOverride {
  chapter: number;
  name: string;
  action: 'override' | 'skip';    // 'override' = use custom timestamp, 'skip' = exclude from output
  timestamp?: string;             // Manual timestamp (if action is 'override')
  timestampSeconds?: number;
  reason?: string;                // User's note (e.g., "chapter was cut from final video")
  createdAt: string;              // ISO timestamp
}

// Request to set a chapter override
export interface SetChapterOverrideRequest {
  chapter: number;
  name: string;
  action: 'override' | 'skip';
  timestamp?: string;             // Required if action is 'override'
  reason?: string;
}

// Response from setting a chapter override
export interface SetChapterOverrideResponse {
  success: boolean;
  override: ChapterOverride;
  error?: string;
}

// FR-58: Chapter Recording Configuration
export interface ChapterRecordingConfig {
  slideDuration: number;  // Seconds to show title slide (e.g., 1.0)
  resolution: '720p' | '1080p';  // Output resolution
  autoGenerate: boolean;  // Auto-generate on new chapter
  includeTitleSlides?: boolean;  // FR-76: Include purple title slides (default: false)
}

// FR-58: Chapter Recording Request
export interface ChapterRecordingRequest {
  chapter?: string;        // Specific chapter to generate, or all if omitted
  slideDuration?: number;  // Override config slide duration
  resolution?: string;     // Override config resolution
}

// FR-58: Chapter Recording Response
export interface ChapterRecordingResponse {
  success: boolean;
  generated: string[];     // List of generated files
  errors?: string[];
  error?: string;
}

// FR-58: Generated chapter info for progress updates
export interface ChapterGenerationProgress {
  chapter: string;
  status: 'pending' | 'generating' | 'complete' | 'error';
  outputFile?: string;
  error?: string;
}

// ============================================
// NFR-66: Consolidated Query API Response Types
// ============================================

// Query API: Project summary (list view)
export interface QueryProjectSummary {
  code: string;
  brand: string;  // FR-61: Brand derived from v-appydave -> appydave
  path: string;   // FR-61: Full project path
  stage: ProjectStage;
  priority: ProjectPriority;
  stats: {
    recordings: number;
    chapters: number;
    transcriptPercent: number;
    images: number;
    thumbs: number;
  };
  lastModified: string | null;
  // FR-80: Content indicators
  hasInbox: boolean;
  hasAssets: boolean;
  hasChapters: boolean;
}

// Query API: Project detail (single project view)
export interface QueryProjectDetail {
  code: string;
  path: string;
  stage: ProjectStage;
  priority: ProjectPriority;
  stats: {
    recordings: number;
    safe: number;
    chapters: number;
    transcripts: {
      matched: number;
      missing: number;
      orphaned: number;
    };
    images: number;
    thumbs: number;
    totalDuration: number | null;
  };
  finalMedia: {
    video?: { filename: string; size: number };
    srt?: { filename: string };
  } | null;
  createdAt: string | null;
  lastModified: string | null;
}

// Query API: Recording info
export interface QueryRecording {
  filename: string;
  chapter: string;
  sequence: string;
  name: string;
  tags: string[];
  folder: 'recordings' | 'safe';
  size: number;
  duration: number | null;
  hasTranscript: boolean;
  isShadow?: boolean;   // FR-83: True if shadow-only (no real recording)
  hasShadow?: boolean;  // FR-83: True if this recording has a shadow file
  shadowSize?: number | null;  // FR-95: Shadow file size in bytes (null if no shadow)
}

// Query API: Transcript info
export interface QueryTranscript {
  filename: string;
  chapter: string;
  sequence: string;
  name: string;
  size: number;
  preview?: string;
  content?: string;
}

// Query API: Chapter info
export interface QueryChapter {
  chapter: number;
  name: string;
  displayName: string;
  timestamp: string | null;
  timestampSeconds: number | null;
  recordingCount: number;
  hasTranscript: boolean;
}

// Query API: Image info
export interface QueryImage {
  filename: string;
  chapter: string;
  sequence: string;
  imageOrder: string;
  variant: string | null;
  label: string;
  size: number;
}

// ============================================
// NFR-66: Consolidated Client Response Types
// ============================================

// FR-15: Move to safe response
export interface SafeResponse {
  success: boolean;
  moved?: string[];
  count?: number;
  errors?: string[];
  error?: string;
}

// FR-15: Restore from safe response
export interface RestoreResponse {
  success: boolean;
  restored?: string[];
  count?: number;
  errors?: string[];
  error?: string;
}

// FR-47: Rename chapter response
export interface RenameChapterResponse {
  success: boolean;
  renamedFiles: string[];
  error?: string;
}

// FR-30: Queue all transcriptions response
export interface QueueAllResponse {
  success: boolean;
  scope: 'project' | 'chapter';
  chapter: string | null;
  queued: string[];
  skipped: string[];
  queuedCount: number;
  skippedCount: number;
  error?: string;
}

// FR-50: Recent rename info for undo
export interface RecentRename {
  id: string;
  originalName: string;
  newName: string;
  timestamp: number;
  age: number;
}

// FR-59: Inbox file info
export interface InboxFile {
  filename: string;
  size: number;
  modifiedAt: string;
}

// FR-59: Inbox subfolder info
export interface InboxSubfolder {
  name: string;
  path: string;
  fileCount: number;
  files: InboxFile[];
}

// FR-59: Inbox response
export interface InboxResponse {
  success: boolean;
  inbox: {
    totalFiles: number;
    subfolders: InboxSubfolder[];
  };
}

// FR-58: Chapter recording status response
export interface ChapterRecordingStatusResponse {
  isGenerating: boolean;
  chapters: Array<{
    chapter: string;
    label: string;
    segmentCount: number;
    totalDuration: number;
  }>;
  existing: string[];
}
