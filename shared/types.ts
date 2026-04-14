// Shared types between client and server

// B039: machine role — determines which UI capabilities are visible
export type MachineRole = 'recorder' | 'editor';

// Relay subfolder types for push/collect/preview operations
export type RelaySubfolder = 'recordings' | 'edit-1st' | 'edit-2nd';

// Relay change event for real-time socket notifications
export interface RelayChangeEvent {
  projectCode: string;
  subfolder: RelaySubfolder;
  action: 'add' | 'unlink';
  filename: string;
  timestamp: string; // ISO date
}

// Relay folder browser types
export interface RelaySubfolderInfo {
  fileCount: number;
  totalSize: number;
}

export interface RelayProjectInfo {
  projectCode: string;
  subfolders: {
    recordings: RelaySubfolderInfo;
    'edit-1st': RelaySubfolderInfo;
    'edit-2nd': RelaySubfolderInfo;
  };
}

// enhanced-browse: Local subfolder file counts for sync status comparison
export interface RelayLocalSubfolderInfo {
  fileCount: number;
}

// enhanced-browse: Sync status per subfolder — derived from comparing relay vs local file counts
export type RelaySyncStatus = 'synced' | 'ahead' | 'behind' | 'diverged' | 'local-only' | 'relay-only';

// enhanced-browse: Extended project info with local file counts and sync status (returned when ?detailed=true)
export interface RelayProjectSyncInfo extends RelayProjectInfo {
  localSubfolders: {
    recordings: RelayLocalSubfolderInfo;
    'edit-1st': RelayLocalSubfolderInfo;
    'edit-2nd': RelayLocalSubfolderInfo;
  };
  syncStatus: {
    recordings: RelaySyncStatus;
    'edit-1st': RelaySyncStatus;
    'edit-2nd': RelaySyncStatus;
  };
  // FR-147: Whether the project directory exists locally in projectsRootDirectory
  projectExists: boolean;
}

export interface RelayBrowseResult {
  projects: RelayProjectInfo[];
  relayDirectory: string;
}

// B043: Relay API response types
export interface RelayStatusResponse {
  success: boolean;
  configured: boolean;
  enabled: boolean;
  relayDirectory?: string | null;
}

export interface RelayBrowseResponse {
  success: boolean;
  projects: RelayProjectInfo[];
  relayDirectory: string;
}

export interface RelayPreviewResponse {
  success: boolean;
  diff: { new: string[]; updated: string[]; deleted: string[] };
  subfolder: string;
  error?: string;
}

export interface RelayPushResponse {
  success: boolean;
  output?: string;
  subfolder?: string;
  error?: string;
}

export interface RelayCollectResponse {
  success: boolean;
  output?: string;
  subfolder?: string;
  error?: string;
  // FR-147: returned when collect is blocked because project doesn't exist locally
  missingProject?: string;
}

export interface RelayVersionsResponse {
  success: boolean;
  versions?: { filename: string; size: number; modified: string }[];
  error?: string;
}

export interface RelayPromoteResponse {
  success: boolean;
  promoted?: string;
  error?: string;
}

export interface RelayClearResponse {
  success: boolean;
  deleted?: number;
  subfolder?: string;
  error?: string;
}

// Promote-to-final: version file in edit-2nd/
export interface EditVersion {
  filename: string;
  size: number;
  modified: string; // ISO date string
}

// Relay per-file detail for file drawers
export interface RelayFileInfo {
  filename: string;
  size: number;
  modified: string; // ISO date
  chapter: string;  // extracted from filename, e.g. "01" from "01-1-intro.mov"
}

export interface RelayFilesResponse {
  success: boolean;
  files?: RelayFileInfo[];
  subfolder?: RelaySubfolder;
  error?: string;
}

// Canonical sync direction type — used by relay divergence and UI components
export type SyncDirection = 'synced' | 'outgoing' | 'incoming' | 'both';

// B047: Divergence detection — compare local vs relay per subfolder
export interface RelayDivergenceInfo {
  subfolder: RelaySubfolder;
  local: { fileCount: number; totalSize: number; files: string[] };
  relay: { fileCount: number; totalSize: number; files: string[] };
  localOnly: string[];    // files in local but not in relay (outgoing)
  relayOnly: string[];    // files in relay but not in local (incoming)
  direction: SyncDirection; // overall sync direction
  folderExists: boolean;  // whether the local folder exists
}

export interface RelayDivergenceResponse {
  success: boolean;
  projectCode?: string;
  subfolders?: RelayDivergenceInfo[];
  error?: string;
}

// B050: Enhanced browse response for kanban badges
export interface RelayEnhancedBrowseResponse {
  success: boolean;
  projects: RelayProjectSyncInfo[];
  relayDirectory: string;
}

export interface FileInfo {
  path: string;
  filename: string;
  timestamp: string;
  size: number; // File size in bytes
  duration?: number; // Video duration in seconds (if available)
}

// FR-73: Chapter filter for common names
export interface ChapterFilter {
  min?: number; // Show if chapter >= min
  max?: number; // Show if chapter <= max
}

// NFR-3: Common name configuration with optional rules
export interface CommonName {
  name: string; // Display name and value (e.g., "intro")
  autoSequence?: boolean; // Reset sequence to 1 when selected (default: false)
  suggestTags?: string[]; // Auto-suggest these tags when selected
  chapterFilter?: 'all' | ChapterFilter; // FR-73: Chapter visibility filter (default: 'all')
}

export interface Config {
  watchDirectory: string;
  // FR-89 Part 5: Split projectDirectory into root + active project
  // Old field (deprecated, migrated on load):
  projectDirectory: string; // NFR-6: Renamed from targetDirectory - points to project root
  // New fields:
  projectsRootDirectory?: string; // FR-89: Root directory containing all projects (e.g., ~/dev/video-projects/v-appydave)
  activeProject?: string; // FR-89: Currently selected project folder name (e.g., b67)
  fileExtensions: string[];
  availableTags: string[]; // NFR-2: Configurable tags
  commonNames: CommonName[]; // NFR-3: Quick-select common names
  imageSourceDirectory: string; // FR-17: Source for incoming images (default: ~/Downloads)
  projectPriorities?: Record<string, 'pinned'>; // FR-32: Pinned projects (absent = normal)
  projectStageOverrides?: Record<string, ProjectStage>; // FR-80: Manual stage overrides (absent = auto-detect)
  projectStages?: ProjectStage[]; // FR-80: Configurable stage list (defaults to DEFAULT_PROJECT_STAGES)
  chapterRecordings?: ChapterRecordingConfig; // FR-58: Chapter recording settings
  shadowResolution?: number; // FR-89 Part 6: Shadow video resolution (default: 240)
  glingDictionary?: string[]; // FR-102: Custom dictionary words for Gling transcription
  poemWuiUrl?: string; // FR-144: AWB server URL (default: http://localhost:5041)
  brandConfigPath?: string; // FR-144: Path to brand-config.json for YouTube Launch Optimizer
  // B038: relay collaboration
  relayDirectory?: string; // ~/Relay/FliHub-appydave — machine-specific, gitignored
  relayEnabled?: boolean; // Feature gate — false/undefined until configured
  machineRole?: MachineRole; // B039: Machine role — recorder shows archive/promote/cleanup, editor hides them
  diskThresholds?: DiskThresholds;  // B062: Pain thresholds for disk observability columns
  holdingPath?: string;             // B064: External holding drive path (e.g. /Volumes/T7/youtube-HOLDING/appydave)
  publishedPath?: string;           // storage-panel WU1: External published archive path (e.g. /Volumes/T7/youtube-PUBLISHED/appydave). Flat — no range buckets.
  whisperBinary?: string;   // B036: Path to mlx_whisper binary (default: ~/.pyenv/shims/mlx_whisper)
  whisperModel?: string;    // B036: Whisper model (default: mlx-community/whisper-large-v3-turbo)
  whisperLanguage?: string; // B036: Transcription language (default: en)
}

// B062: Disk space observability — per-project size breakdown
export interface DiskSizeData {
  rec: number;        // bytes — recordings/ folder
  trash: number;      // bytes — -trash/ folder
  shadows: number;    // bytes — recording-shadows/ folder
  other: number;      // bytes — everything else in project dir
  rRec: number;       // bytes — relay/{project}/recordings/
  r1st: number;       // bytes — relay/{project}/edit-1st/
  r2nd: number;       // bytes — relay/{project}/edit-2nd/
  total: number;      // bytes — sum of all above
  calculatedAt: string; // ISO timestamp
  // B064: Hold/offload tracking fields
  heldAt?: string;               // B064: ISO timestamp when last offloaded to HOLDING SSD
  holdingPath?: string;          // B064: Full flat path in youtube-HOLDING
  // B062 Wave 2: Pre-computed detail (populated during scan-all)
  detail?: {
    other: Record<string, number>;                         // subfolder name → bytes (e.g. { "final": 38000000, "assets": 1000000 })
    recTopFiles: Array<{ name: string; size: number }>;    // top 5 recordings by size
    trashFiles: Array<{ name: string; size: number }>;     // all trash files (used in confirm modal)
  }
}

// B062: Per-column threshold config
export interface DiskThresholdConfig {
  faint: string | null;  // e.g. "300MB", "2GB", "0" — null = no threshold
  amber: string | null;
  red: string | null;
}

// B062: Full threshold config stored in config.json
export interface DiskThresholds {
  stagePenaltyMultiplier: number;  // 0.5 = halve thresholds for published/archived
  columns: {
    trash:   DiskThresholdConfig;
    rec:     DiskThresholdConfig;
    shadows: DiskThresholdConfig;
    other:   DiskThresholdConfig;
    rRec:    DiskThresholdConfig;
    r1st:    DiskThresholdConfig;
    r2nd:    DiskThresholdConfig;
    total:   DiskThresholdConfig;
  };
}

// B062: Threshold severity level for colour coding
export type DiskThresholdLevel = 'faint' | 'amber' | 'red' | null;

// B064: Location states — 'both' is always transitional, never a final resting state
export type HoldLocation = 'local-only' | 'holding-only' | 'both' | 'unknown';

// B064: File comparison result — run before any delete operation
export interface HoldVerification {
  localFiles: number;
  holdingFiles: number;
  localBytes: number;
  holdingBytes: number;
  match: boolean;  // true only if both counts AND sizes match exactly
}

// B064: Full hold status for a project
export interface HoldStatus {
  location: HoldLocation;
  holdingPath?: string;          // Full path in youtube-HOLDING if copy exists
  heldAt?: string;               // ISO timestamp of last rsync to HOLDING
  relayBlocked: boolean;         // true if relay has files — hard block on offload
  relayBytes: number;            // rRec + r1st + r2nd bytes (0 if no relay)
  ssdMounted: boolean;           // Is /Volumes/T7 (or holdingPath parent) accessible?
  verification?: HoldVerification; // Only populated when location === 'both'
}

// WU1: Archive inventory — unified row per project for the Archive tool
// State derivation:
//   - localBytes > 0 && !held → 'local'
//   - localBytes > 0 && held  → 'held-local'
//   - localBytes === 0 && held → 'held-only'
export type ArchiveState = 'local' | 'held-local' | 'held-only';

export interface ArchiveRow {
  projectCode: string;
  projectPath: string;
  localBytes: number;
  heldBytes: number;
  held: boolean;
  state: ArchiveState;
  lastTouched: string | null;
  // WU1 Patch 4: set to true when per-project aggregation threw; `error` holds
  // the message. Wave B destructive actions will gate on !row.degraded so a
  // partial read of a project's state never leads to accidental deletion.
  degraded?: boolean;
  error?: string;
}

export interface ArchiveInventoryResponse {
  rows: ArchiveRow[];
}

// ---------------------------------------------------------------------------
// storage-panel WU1: Storage tree — per-project hierarchical view of disk usage
// across Local / HOLDING / PUBLISHED with Heavy/Light classification.
// ---------------------------------------------------------------------------

export type StorageState = 'active' | 'held' | 'archived';
export type StorageClassification = 'heavy' | 'light';
export type StorageLocation = 'local' | 'holding' | 'published';

export interface StorageTreeNode {
  name: string;
  path: string;
  sizeBytes: number;
  classification: StorageClassification;
  location: StorageLocation;
  children?: StorageTreeNode[];
}

export interface StorageTreeSizes {
  localTotal: number;
  heavyTotal: number;   // Heavy subfolders currently on local
  lightTotal: number;   // Light files currently on local
  heldTotal: number;    // Bytes in HOLDING
  archivedTotal: number; // Bytes in PUBLISHED
}

export interface StorageTreePaths {
  local: string;
  holding: string | null;
  published: string | null;
}

export interface StorageTreeResponse {
  state: StorageState;
  nodes: StorageTreeNode[];
  sizes: StorageTreeSizes;
  paths: StorageTreePaths;
  relayBlocked: boolean;
  relayBytes: number;
  ssdMounted: boolean;
  degraded?: boolean;
  error?: string;
}

// storage-panel WU1: Shape returned by all mutation endpoints
// (hold / restore-held / archive / unarchive).
// storage-panel P5: envelope renamed `ok` → `success` for consistency with
// the rest of the FliHub API. `newState` remains top-level (not wrapped in
// `data`) so Wave-B client code can read it alongside `success` / `error`
// without reaching through an envelope.
export interface StorageMutationResponse {
  success: boolean;
  error?: string;
  newState?: StorageState;
}

// storage-panel WU5: One entry per successful storage mutation. JSONL-persisted
// in `~/.flihub/storage-activity.jsonl` (global across projects so archived
// projects with no local folder still have a breadcrumb trail).
export type StorageActivityAction = 'hold' | 'restore-held' | 'archive' | 'unarchive' | 'held-archive';

export interface StorageActivityEntry {
  projectCode: string;
  action: StorageActivityAction;
  sizeBytes: number;
  timestamp: string; // ISO 8601
}

export interface StorageActivityResponse {
  success: boolean;
  entries: StorageActivityEntry[];
  error?: string;
}

// B064: Result of any hold operation (rsync, delete, verify)
export interface HoldOperationResult {
  success: boolean;
  message: string;
  holdingPath?: string;
  verification?: HoldVerification;
  error?: string;
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
  code: string; // e.g., "b72-opus-awesome"
  path: string; // Full path to project folder
  fileCount: number; // Number of .mov files in recordings/
  lastModified: string; // ISO timestamp of most recent file
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
  | 'archived'
  | 'shelved' // FR-149: Abandoned — never published
  | 'remix'; // FR-149: Being repackaged into new content

// FR-80: Stage override includes 'auto' for auto-detection
export type ProjectStageOverride = ProjectStage | 'auto';

// FR-80: Default stages if not configured
// FR-149: 'review' removed from default list (kept in union for backward compat); 'shelved' and 'remix' added
export const DEFAULT_PROJECT_STAGES: ProjectStage[] = [
  'planning',
  'recording',
  'first-edit',
  'second-edit',
  'ready-to-publish',
  'published',
  'archived',
  'shelved', // FR-149: Abandoned — never published
  'remix',   // FR-149: Being repackaged into new content
];

// FR-80: Stage display labels for UI
export const STAGE_LABELS: Record<ProjectStage, string> = {
  planning: 'Plan',
  recording: 'REC',
  'first-edit': '1st Edit',
  'second-edit': '2nd Edit',
  review: 'Review',
  'ready-to-publish': 'Ready',
  published: 'Published',
  archived: 'Archived',
  shelved: 'Shelved', // FR-149: Abandoned — never published
  remix: 'Remix',     // FR-149: Being repackaged into new content
};

// FR-48: Transcript sync status for validation & diagnostics
export interface TranscriptSyncStatus {
  matched: number; // Recordings with matching transcript
  missingTranscripts: string[]; // Recording filenames without transcript
  orphanedTranscripts: string[]; // Transcript filenames without recording
}

// FR-48: Detailed transcript sync response
export interface TranscriptSyncResponse {
  success: boolean;
  matched: string[]; // Filenames that match (recording with transcript)
  missingTranscripts: string[]; // Recordings without transcript
  orphanedTranscripts: string[]; // Transcripts without recording
}

export interface ProjectStats {
  code: string;
  path: string;

  // Priority
  priority: ProjectPriority;

  // Counts (FR-111: recordingsCount and safeCount removed, safe status is per-file)
  totalFiles: number; // All files in recordings/

  // Chapters
  chapterCount: number; // Unique chapter numbers

  // Transcripts - FR-48: Enhanced with sync status
  transcriptCount: number; // Individual transcripts (excludes *-chapter.txt) - now equals matched count
  transcriptPercent: number; // (matched / totalFiles) * 100
  transcriptSync: {
    matched: number;
    missingCount: number;
    orphanedCount: number;
  };

  // Stage (auto-detected)
  stage: ProjectStage;

  // For stats popup
  createdAt: string | null; // Folder creation time
  lastModified: string | null; // Most recent file timestamp
  totalDuration: number | null; // Sum of video durations in seconds (optional)
  imageCount: number; // Files in assets/images/
  thumbCount: number; // Files in assets/thumbs/

  // FR-80/FR-82: Content indicators with counts for tooltips
  hasInbox: boolean; // Has files in inbox/
  hasAssets: boolean; // Has files in assets/images/ or assets/prompts/
  hasChapters: boolean; // Has .mov files in recordings/-chapters/
  inboxCount: number; // FR-82: File count in inbox/ (for tooltip)
  chapterVideoCount: number; // FR-82: .mov count in recordings/-chapters/ (for tooltip)

  // FR-83: Shadow recordings
  shadowCount: number; // Shadow files in recording-shadows/

  // FR-148: Has files in final/ directory
  hasFinal: boolean;
}

// FR-14: Recording file info for asset view
export interface RecordingFile {
  filename: string;
  path: string;
  size: number;
  timestamp: string;
  duration?: number; // FR-36: Video duration in seconds (if available)
  chapter: string; // Parsed from filename (e.g., "01")
  sequence: string; // Parsed from filename (e.g., "1")
  name: string; // Parsed from filename (e.g., "intro")
  tags: string[]; // Parsed from filename
  folder: 'recordings'; // FR-111: Always 'recordings' now (safe uses isSafe flag)
  isSafe: boolean; // FR-111: True if hidden from active view (from state file)
  isParked: boolean; // FR-120: True if parked (excluded from this edit)
  annotation?: string; // FR-123: Optional note explaining why parked
  isShadow?: boolean; // FR-83: True if shadow-only (no real recording)
  hasShadow?: boolean; // FR-83: True if this recording has a shadow file
  shadowSize?: number | null; // FR-95: Shadow file size in bytes (null if no shadow)
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
  path: string; // Full path to image
  filename: string; // Just the filename
  size: number; // Size in bytes
  timestamp: string; // ISO timestamp
  hash: string; // MD5 hash for duplicate detection
  isDuplicate?: boolean; // True if this is a duplicate of another image
  duplicateOf?: string; // Path to the original if this is a duplicate
}

// FR-17: Image asset (parsed from filename in assets/images/)
export interface ImageAsset {
  path: string;
  filename: string;
  size: number;
  timestamp: string;
  chapter: string; // 2 digits (01-99)
  sequence: string; // 1 digit (1-9)
  imageOrder: string; // 1 digit (1-9)
  variant: string | null; // Single letter (a-z) or null
  label: string; // kebab-case description
  type?: 'image'; // FR-22: Optional type to distinguish from prompts
}

// FR-17: Request to assign an image
export interface AssignImageRequest {
  sourcePath: string; // Path to image in Downloads
  chapter: string; // 2 digits
  sequence: string; // 1 digit
  imageOrder: string; // 1 digit
  variant: string | null; // a-z or null
  label: string; // kebab-case label
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
  content?: string; // Full prompt text (for Shift+Hover preview)
  contentPreview?: string; // First ~50 chars of content (for inline display)
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
  created: boolean; // true if new file, false if updated
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
  'file:deleted': (data: { path: string }) => void; // FR-4: file deleted from disk
  'file:renamed': (data: { oldPath: string; newPath: string }) => void;
  'file:error': (data: { path: string; error: string }) => void;
  // NFR-5: Real-time updates
  'thumbs:changed': () => void; // Thumb imported/deleted/reordered
  'thumbs:zip-added': () => void; // New ZIP detected in Downloads
  'assets:incoming-changed': () => void; // New/deleted image in source directory
  'assets:assigned-changed': () => void; // Image assigned/deleted in assets/images
  'recordings:changed': () => void; // Recording renamed/moved/deleted
  'projects:changed': () => void; // Project folder changed
  'inbox:changed': () => void; // FR-59: Inbox file added/removed
  // B038: relay collaboration
  'relay:changed': (data: RelayChangeEvent) => void;
  'transcripts:changed': () => void; // NFR-85: Transcript added/removed/changed
  // FR-58: Chapter recording events
  'chapters:generating': (data: { chapter: string; total: number; current: number }) => void;
  'chapters:generated': (data: { chapter: string; outputFile: string; srtFile?: string }) => void; // FR-76: srtFile added
  'chapters:complete': (data: { generated: string[]; errors?: string[] }) => void;
  // FR-30: Transcription events
  'transcription:queued': (job: { jobId: string; videoPath: string; position: number }) => void;
  'transcription:started': (job: { jobId: string; videoPath: string }) => void;
  'transcription:progress': (data: { jobId: string; text: string }) => void;
  'transcription:complete': (job: {
    jobId: string;
    videoPath: string;
    transcriptPath: string;
  }) => void;
  'transcription:error': (job: { jobId: string; videoPath: string; error: string }) => void;
  // FR-131 Phase 2: Regeneration events
  'regen:shadows:progress': (data: { current: number; total: number; filename: string }) => void;
  'regen:shadows:complete': (data: {
    completed: number;
    failed: number;
    errors?: Array<{ file: string; error: string }>;
  }) => void;
  'regen:chapters:progress': (data: { current: number; total: number; chapter: string }) => void;
  'regen:chapters:complete': (data: {
    completed: number;
    failed: number;
    errors?: Array<{ chapter: string; error: string }>;
  }) => void;
  'regen:all:started': () => void;
  'regen:all:progress': (data: {
    step: 'shadows' | 'transcripts' | 'chapters';
    current: number;
    total: number;
  }) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'regen:all:complete': (data: { shadows: any; transcripts: any; chapters: any }) => void;
  'regen:all:error': (data: { error: string }) => void;
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
  duration?: number; // FR-36: Video duration in seconds
  size?: number; // FR-36: File size in bytes
  queuedAt?: string; // ISO timestamp
  startedAt?: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
  error?: string; // Error message if failed
  streamedText?: string; // Accumulated text during transcription
}

// FR-30: API response for transcription status
export interface TranscriptionsResponse {
  active: TranscriptionJob | null;
  queue: TranscriptionJob[];
  recent: TranscriptionJob[]; // Last 5 completed/failed
}

// FR-30: Single file transcription status
export interface TranscriptionStatusResponse {
  filename: string;
  status: TranscriptionStatus;
  transcriptPath?: string; // Path to .txt file if complete
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
  timestamp: string; // "02:34" format
  timestampSeconds: number; // 154 (seconds from start)
  confidence: number; // 0-100
  matchedText: string; // SRT text that was matched (for verification)
  matchMethod: 'phrase' | 'partial' | 'keyword'; // How it was matched
}

export interface ChapterMatch {
  chapter: number; // 1, 2, 3...
  name: string; // "intro", "setup-bmad"
  displayName: string; // "Intro", "Setting up BMAD"
  timestamp?: string; // "02:34" or null if not found
  timestampSeconds?: number; // 154 (seconds from start)
  confidence: number; // 0-100
  status: ChapterMatchStatus;
  // New fields for verification UI
  matchedText?: string; // SRT text that was matched
  transcriptSnippet?: string; // First ~100 chars of transcript for comparison
  alternatives?: ChapterMatchCandidate[]; // Other potential matches
  matchReason?: string; // Human-readable reason, e.g., "Matched 7 words at position 0"
}

export interface ChaptersResponse {
  success: boolean;
  chapters: ChapterMatch[];
  formatted: string; // Ready-to-copy YouTube format
  error?: string;
  stats?: {
    elapsedMs: number; // Time taken in milliseconds
    srtSegments: number; // Number of SRT segments parsed
    chaptersFound: number; // Chapters successfully matched
    chaptersTotal: number; // Total chapters processed
  };
}

// FR-34 Enhancement: LLM-based chapter verification

// Request to verify a chapter timestamp using LLM
export interface ChapterVerifyRequest {
  chapter: number;
  name: string;
  transcriptSnippet: string; // First ~200 chars of transcript
  currentMatch?: {
    // Current algorithmic match (if any)
    timestamp: string;
    confidence: number;
    matchedText: string;
  };
  alternatives?: ChapterMatchCandidate[]; // Other potential matches
  userHint?: string; // User-provided context (e.g., "first 15s were cut")
}

// LLM's verification response
export interface ChapterVerifyResponse {
  success: boolean;
  chapter: number;
  name: string;
  recommendation: {
    action: 'use_current' | 'use_alternative' | 'manual_timestamp' | 'skip';
    timestamp?: string; // Recommended timestamp
    timestampSeconds?: number;
    confidence: number; // LLM's confidence in recommendation
    reasoning: string; // Explanation for the user
  };
  error?: string;
}

// Manual override for a chapter (stored in project config)
export interface ChapterOverride {
  chapter: number;
  name: string;
  action: 'override' | 'skip'; // 'override' = use custom timestamp, 'skip' = exclude from output
  timestamp?: string; // Manual timestamp (if action is 'override')
  timestampSeconds?: number;
  reason?: string; // User's note (e.g., "chapter was cut from final video")
  createdAt: string; // ISO timestamp
}

// Request to set a chapter override
export interface SetChapterOverrideRequest {
  chapter: number;
  name: string;
  action: 'override' | 'skip';
  timestamp?: string; // Required if action is 'override'
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
  slideDuration: number; // Seconds to show title slide (e.g., 1.0)
  resolution: '720p' | '1080p'; // Output resolution
  autoGenerate: boolean; // Auto-generate on new chapter
  includeTitleSlides?: boolean; // FR-76: Include purple title slides (default: false)
}

// FR-58: Chapter Recording Request
export interface ChapterRecordingRequest {
  chapter?: string; // Specific chapter to generate, or all if omitted
  slideDuration?: number; // Override config slide duration
  resolution?: string; // Override config resolution
}

// FR-58: Chapter Recording Response
export interface ChapterRecordingResponse {
  success: boolean;
  generated: string[]; // List of generated files
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
  brand: string; // FR-61: Brand derived from v-appydave -> appydave
  path: string; // FR-61: Full project path
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
  // FR-111: safe removed (safe status is per-file in state)
  stats: {
    recordings: number;
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
  folder: 'recordings'; // FR-111: Always 'recordings' now
  isSafe: boolean; // FR-111: True if hidden from active view
  isParked: boolean; // FR-120: True if parked (excluded from this edit)
  annotation?: string; // FR-123: Optional note explaining why parked
  size: number;
  duration: number | null;
  hasTranscript: boolean;
  isShadow?: boolean; // FR-83: True if shadow-only (no real recording)
  hasShadow?: boolean; // FR-83: True if this recording has a shadow file
  shadowSize?: number | null; // FR-95: Shadow file size in bytes (null if no shadow)
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

// FR-120: Park recording response
export interface ParkResponse {
  success: boolean;
  parked?: string[];
  count?: number;
  errors?: string[];
  error?: string;
}

// FR-120: Unpark recording response
export interface UnparkResponse {
  success: boolean;
  unparked?: string[];
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

// FR-96: Environment detection for cross-platform path guidance
export interface EnvironmentResponse {
  platform: 'win32' | 'linux' | 'darwin';
  isWSL: boolean;
  pathFormat: 'windows' | 'linux';
  guidance: {
    nativeFiles: string; // e.g., '/home/jan/...' or 'C:\\...'
    windowsFiles: string; // e.g., '/mnt/c/...' or 'C:\\...'
    wslFiles: string; // e.g., '/home/jan/...' or '\\\\wsl$\\...'
  };
  machineRole: MachineRole; // B039: machine role for role-based UI visibility
}

// ============================================
// FR-111: Per-Project State File
// ============================================

// State for a single recording
export interface RecordingState {
  safe?: boolean; // True = hidden from active view
  parked?: boolean; // FR-120: True = excluded from this edit (good content, not for this video)
  annotation?: string; // FR-123: Optional note explaining why parked (e.g., "Too technical for YouTube")
  stage?: string; // Future: per-recording stage (recording, first-edit, review, etc.)
}

// Full project state file schema
export interface ProjectState {
  version: 1;
  recordings: Record<string, RecordingState>; // Keyed by filename (e.g., "01-1-intro.mov")
  glingDictionary?: string[]; // FR-118: Project-specific dictionary words
  editManifest?: EditManifest; // FR-126: Edit folder manifest tracking
}

// API response for reading project state
export interface ProjectStateResponse {
  success: boolean;
  state: ProjectState;
  error?: string;
}

// API request for updating project state
export interface UpdateProjectStateRequest {
  recordings: Record<string, RecordingState>;
}

// ============================================
// FR-126: Edit Folder Manifest & Cleanup
// ============================================

// Single file entry in manifest
export interface EditManifestFile {
  filename: string; // e.g., "01-1-intro.mov"
  sourceHash: string; // SHA-256 hash of first 1MB from recordings/
  copiedAt: string; // ISO timestamp when copied
  sourceSize: number; // File size in bytes
}

// Manifest for one edit folder
export interface EditFolderManifest {
  lastCopied: string | null; // ISO timestamp of most recent copy operation
  files: EditManifestFile[]; // Files tracked in this folder
}

// All edit folder manifests
export interface EditManifest {
  'edit-1st': EditFolderManifest;
  'edit-2nd': EditFolderManifest;
  'edit-final': EditFolderManifest;
}

// Canonical folder key type — used by both client and server for open-folder
export type FolderKey =
  | 'ecamm'
  | 'downloads'
  | 'recordings'
  | 'safe'
  | 'trash'
  | 'images'
  | 'thumbs'
  | 'transcripts'
  | 'project'
  | 'final'
  | 's3Staging'
  | 's3Prep'
  | 's3Post'
  | 'inbox'
  | 'shadows'
  | 'chapters'
  | 'relay'
  | 'edit-1st'
  | 'edit-2nd'
  | 'edit-final';

// Edit folder key type
export type EditFolderKey = 'edit-1st' | 'edit-2nd' | 'edit-final';

// Manifest validation status for each file
export interface ManifestFileStatus {
  filename: string;
  status: 'present' | 'missing' | 'changed'; // present = exists and hash matches, missing = doesn't exist, changed = exists but hash mismatch
  sourceSize?: number; // Size if present
  currentHash?: string; // Current hash if present
}

// Overall status for a folder's manifest
export type ManifestStatus = 'present' | 'cleaned' | 'changed' | 'missing' | 'no-manifest';

export interface ManifestStatusDetail {
  status: ManifestStatus;
  manifestedFiles: number; // Total files in manifest
  presentFiles: number; // Files that exist in edit folder
  missingFiles: number; // Files deleted from edit folder
  changedFiles: number; // Files with hash mismatch
  totalSize: number; // Total size of all manifested files (from recordings/)
  fileDetails?: ManifestFileStatus[]; // Per-file status (for warnings)
}

// API response for manifest status check
export interface ManifestStatusResponse {
  success: boolean;
  folder: EditFolderKey;
  detail: ManifestStatusDetail;
  error?: string;
}

// API response for clean operation
export interface CleanEditFolderResponse {
  success: boolean;
  folder: EditFolderKey;
  deleted: string[]; // Files deleted from edit folder
  deletedCount: number;
  spaceSaved: number; // Bytes freed
  preserved: string[]; // Files in folder that were NOT deleted (not in manifest)
  error?: string;
}

// API response for restore operation
export interface RestoreEditFolderResponse {
  success: boolean;
  folder: EditFolderKey;
  restored: string[]; // Files copied back
  restoredCount: number;
  warnings?: string[]; // Hash mismatch warnings
  error?: string;
}

// Relay activity event for activity feed
export interface RelayActivityEvent {
  id: string;           // unique id (timestamp + random)
  projectCode: string;
  subfolder: RelaySubfolder;
  action: 'push' | 'collect' | 'promote' | 'clear' | 'file-detected';
  description: string;  // "You pushed 15 recordings (338 MB)"
  timestamp: string;    // ISO date
  fileCount?: number;
  totalSize?: number;
}

export interface RelayActivityResponse {
  success: boolean;
  events?: RelayActivityEvent[];
  error?: string;
}

// B047: Recording Editor — split chapter types
export interface SplitChapterRequest {
  chapter: string;          // source chapter, e.g. "04"
  splitAtSequence: number;  // files with seq >= this move to new chapter
}

export interface SplitChapterResponse {
  success: boolean;
  sourceChapter: string;
  newChapter: string;
  filesMoved: number;
  cascadedChapters: number;
  undoMapping: Array<{ oldFilename: string; newFilename: string }>;
  error?: string;
}

// B044: Sync Hub — git sync status types
export type SyncState = 'clean' | 'dirty' | 'behind' | 'ahead' | 'diverged' | 'conflict' | 'unknown';

export interface SyncChannelStatus {
  channel: string;
  state: SyncState;
  localHash: string;
  remoteHash: string;
  dirtyCount: number;
  behindCount: number;
  aheadCount: number;
  lastFetch: string; // ISO date
  dirtyFiles?: string[];
  error?: string;
}

export interface SyncStatusResponse {
  success: boolean;
  appCode?: SyncChannelStatus;
  videoProject?: SyncChannelStatus;
  error?: string;
}

// B044: Sync Hub — push/pull/resolve action types

export interface SyncPushResponse {
  success: boolean;
  commitHash?: string;
  commitMessage?: string;
  filesCommitted?: number;
  output?: string;
  error?: string;
}

export interface SyncConflictFile {
  path: string;
  status: 'both-modified' | 'deleted-by-them' | 'deleted-by-us' | 'added-by-both';
}

export interface SyncPullResponse {
  success: boolean;
  output?: string;
  behindCount?: number;
  conflicts?: SyncConflictFile[];
  restartInstructions?: string;
  error?: string;
}

export interface SyncResolveRequest {
  channel: 'app-code' | 'video-project';
  file: string;
  resolution: 'keep-mine' | 'keep-theirs';
}

export interface SyncResolveResponse {
  success: boolean;
  remainingConflicts?: number;
  error?: string;
}

// B047: Recording Editor — undo types
export interface UndoRenameResponse {
  success: boolean;
  filesReverted: number;
  error?: string;
}
