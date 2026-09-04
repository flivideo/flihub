export type MachineRole = 'recorder' | 'editor';
export type RelaySubfolder = 'recordings' | 'edit-1st' | 'edit-2nd';
export interface RelayChangeEvent {
    projectCode: string;
    subfolder: RelaySubfolder;
    action: 'add' | 'unlink';
    filename: string;
    timestamp: string;
}
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
export interface RelayLocalSubfolderInfo {
    fileCount: number;
}
export type RelaySyncStatus = 'synced' | 'ahead' | 'behind' | 'diverged' | 'local-only' | 'relay-only';
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
    projectExists: boolean;
}
export interface RelayBrowseResult {
    projects: RelayProjectInfo[];
    relayDirectory: string;
}
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
    diff: {
        new: string[];
        updated: string[];
        deleted: string[];
    };
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
    missingProject?: string;
}
export interface RelayVersionsResponse {
    success: boolean;
    versions?: {
        filename: string;
        size: number;
        modified: string;
    }[];
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
export interface EditVersion {
    filename: string;
    size: number;
    modified: string;
}
export interface RelayFileInfo {
    filename: string;
    size: number;
    modified: string;
    chapter: string;
}
export interface RelayFilesResponse {
    success: boolean;
    files?: RelayFileInfo[];
    subfolder?: RelaySubfolder;
    error?: string;
}
export type SyncDirection = 'synced' | 'outgoing' | 'incoming' | 'both';
export interface RelayDivergenceInfo {
    subfolder: RelaySubfolder;
    local: {
        fileCount: number;
        totalSize: number;
        files: string[];
    };
    relay: {
        fileCount: number;
        totalSize: number;
        files: string[];
    };
    localOnly: string[];
    relayOnly: string[];
    direction: SyncDirection;
    folderExists: boolean;
}
export interface RelayDivergenceResponse {
    success: boolean;
    projectCode?: string;
    subfolders?: RelayDivergenceInfo[];
    error?: string;
}
export interface RelayEnhancedBrowseResponse {
    success: boolean;
    projects: RelayProjectSyncInfo[];
    relayDirectory: string;
}
export interface FileInfo {
    path: string;
    filename: string;
    timestamp: string;
    size: number;
    duration?: number;
}
export interface ChapterFilter {
    min?: number;
    max?: number;
}
export interface CommonName {
    name: string;
    autoSequence?: boolean;
    suggestTags?: string[];
    chapterFilter?: 'all' | ChapterFilter;
}
export interface Config {
    watchDirectory: string;
    projectDirectory: string;
    projectsRootDirectory?: string;
    activeProject?: string;
    fileExtensions: string[];
    availableTags: string[];
    commonNames: CommonName[];
    imageSourceDirectory: string;
    projectPriorities?: Record<string, 'pinned'>;
    projectStageOverrides?: Record<string, ProjectStage>;
    projectCodeHighWater?: Record<string, string>;
    projectStages?: ProjectStage[];
    chapterRecordings?: ChapterRecordingConfig;
    glingDictionary?: string[];
    poemWuiUrl?: string;
    brandConfigPath?: string;
    relayDirectory?: string;
    relayEnabled?: boolean;
    machineRole?: MachineRole;
    diskThresholds?: DiskThresholds;
    holdingPath?: string;
    publishedPath?: string;
    whisperBinary?: string;
    whisperModel?: string;
    whisperLanguage?: string;
}
export interface DiskSizeData {
    rec: number;
    trash: number;
    other: number;
    rRec: number;
    r1st: number;
    r2nd: number;
    total: number;
    calculatedAt: string;
    heldAt?: string;
    holdingPath?: string;
    detail?: {
        other: Record<string, number>;
        recTopFiles: Array<{
            name: string;
            size: number;
        }>;
        trashFiles: Array<{
            name: string;
            size: number;
        }>;
    };
}
export interface DiskThresholdConfig {
    faint: string | null;
    amber: string | null;
    red: string | null;
}
export interface DiskThresholds {
    stagePenaltyMultiplier: number;
    columns: {
        trash: DiskThresholdConfig;
        rec: DiskThresholdConfig;
        other: DiskThresholdConfig;
        rRec: DiskThresholdConfig;
        r1st: DiskThresholdConfig;
        r2nd: DiskThresholdConfig;
        total: DiskThresholdConfig;
    };
}
export type DiskThresholdLevel = 'faint' | 'amber' | 'red' | null;
export type HoldLocation = 'local-only' | 'holding-only' | 'both' | 'unknown';
export interface HoldVerification {
    localFiles: number;
    holdingFiles: number;
    localBytes: number;
    holdingBytes: number;
    match: boolean;
}
export interface HoldStatus {
    location: HoldLocation;
    holdingPath?: string;
    heldAt?: string;
    relayBlocked: boolean;
    relayBytes: number;
    ssdMounted: boolean;
    verification?: HoldVerification;
}
export type ArchiveState = 'local' | 'held-local' | 'held-only';
export interface ArchiveRow {
    projectCode: string;
    projectPath: string;
    localBytes: number;
    heldBytes: number;
    held: boolean;
    state: ArchiveState;
    lastTouched: string | null;
    degraded?: boolean;
    error?: string;
}
export interface ArchiveInventoryResponse {
    rows: ArchiveRow[];
}
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
    heavyTotal: number;
    lightTotal: number;
    heldTotal: number;
    archivedTotal: number;
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
export interface StorageMutationResponse {
    success: boolean;
    error?: string;
    newState?: StorageState;
}
export type StorageActivityAction = 'hold' | 'restore-held' | 'archive' | 'unarchive' | 'held-archive';
export interface StorageActivityEntry {
    projectCode: string;
    action: StorageActivityAction;
    sizeBytes: number;
    timestamp: string;
}
export interface StorageActivityResponse {
    success: boolean;
    entries: StorageActivityEntry[];
    error?: string;
}
export interface HoldOperationResult {
    success: boolean;
    message: string;
    holdingPath?: string;
    verification?: HoldVerification;
    error?: string;
}
export interface RenameRequest {
    destination?: 'recordings' | 'b-roll';
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
export declare const DEFAULT_TAGS: readonly ["cta", "endcards"];
export interface SuggestedNaming {
    chapter: string;
    sequence: string;
    name: string;
    existingFiles: string[];
}
export interface ProjectInfo {
    code: string;
    path: string;
    fileCount: number;
    lastModified: string;
}
export type ProjectPriority = 'pinned' | 'normal';
export type ProjectStage = 'planning' | 'recording' | 'first-edit' | 'second-edit' | 'review' | 'ready-to-publish' | 'published' | 'archived' | 'shelved' | 'remix';
export type ProjectStageOverride = ProjectStage | 'auto';
export declare const DEFAULT_PROJECT_STAGES: ProjectStage[];
export declare const STAGE_LABELS: Record<ProjectStage, string>;
export interface TranscriptSyncStatus {
    matched: number;
    missingTranscripts: string[];
    orphanedTranscripts: string[];
}
export interface TranscriptSyncResponse {
    success: boolean;
    matched: string[];
    missingTranscripts: string[];
    orphanedTranscripts: string[];
}
export interface ProjectStats {
    code: string;
    path: string;
    priority: ProjectPriority;
    totalFiles: number;
    chapterCount: number;
    transcriptCount: number;
    transcriptPercent: number;
    transcriptSync: {
        matched: number;
        missingCount: number;
        orphanedCount: number;
    };
    stage: ProjectStage;
    createdAt: string | null;
    lastModified: string | null;
    totalDuration: number | null;
    imageCount: number;
    thumbCount: number;
    hasInbox: boolean;
    hasAssets: boolean;
    hasChapters: boolean;
    inboxCount: number;
    chapterVideoCount: number;
    hasFinal: boolean;
}
export interface RecordingFile {
    filename: string;
    path: string;
    size: number;
    timestamp: string;
    duration?: number;
    chapter: string;
    sequence: string;
    name: string;
    tags: string[];
    folder: 'recordings';
    isSafe: boolean;
    isParked: boolean;
    annotation?: string;
}
export interface ImageInfo {
    path: string;
    filename: string;
    size: number;
    timestamp: string;
    hash: string;
    isDuplicate?: boolean;
    duplicateOf?: string;
}
export interface ImageAsset {
    path: string;
    filename: string;
    size: number;
    timestamp: string;
    chapter: string;
    sequence: string;
    imageOrder: string;
    variant: string | null;
    label: string;
    type?: 'image';
}
export interface AssignImageRequest {
    sourcePath: string;
    chapter: string;
    sequence: string;
    imageOrder: string;
    variant: string | null;
    label: string;
}
export interface AssignImageResponse {
    success: boolean;
    oldPath: string;
    newPath: string;
    error?: string;
}
export interface NextImageOrderResponse {
    chapter: string;
    sequence: string;
    nextImageOrder: string;
    existingCount: number;
}
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
    content?: string;
    contentPreview?: string;
}
export interface SavePromptRequest {
    chapter: string;
    sequence: string;
    imageOrder: string;
    variant: string | null;
    label: string;
    content: string;
}
export interface SavePromptResponse {
    success: boolean;
    path: string;
    filename: string;
    created: boolean;
    deleted?: boolean;
    error?: string;
}
export interface LoadPromptResponse {
    filename: string;
    content: string;
    chapter: string;
    sequence: string;
    imageOrder: string;
    variant: string | null;
    label: string;
}
export interface ServerToClientEvents {
    'file:new': (file: FileInfo) => void;
    'file:deleted': (data: {
        path: string;
    }) => void;
    'file:renamed': (data: {
        oldPath: string;
        newPath: string;
    }) => void;
    'file:error': (data: {
        path: string;
        error: string;
    }) => void;
    'thumbs:changed': () => void;
    'thumbs:zip-added': () => void;
    'assets:incoming-changed': () => void;
    'assets:assigned-changed': () => void;
    'recordings:changed': () => void;
    'projects:changed': () => void;
    'inbox:changed': () => void;
    'relay:changed': (data: RelayChangeEvent) => void;
    'transcripts:changed': () => void;
    'miccheck:started': (data: {
        sessionId: string;
    }) => void;
    'miccheck:tick': (data: {
        sessionId: string;
        tick: MicCheckTick;
    }) => void;
    'miccheck:finished': (data: {
        sessionId: string;
    }) => void;
    'chapters:generating': (data: {
        chapter: string;
        total: number;
        current: number;
    }) => void;
    'chapters:generated': (data: {
        chapter: string;
        outputFile: string;
        srtFile?: string;
    }) => void;
    'chapters:complete': (data: {
        generated: string[];
        errors?: string[];
    }) => void;
    'transcription:queued': (job: {
        jobId: string;
        videoPath: string;
        position: number;
    }) => void;
    'transcription:started': (job: {
        jobId: string;
        videoPath: string;
    }) => void;
    'transcription:progress': (data: {
        jobId: string;
        text: string;
    }) => void;
    'transcription:complete': (job: {
        jobId: string;
        videoPath: string;
        transcriptPath: string;
    }) => void;
    'transcription:error': (job: {
        jobId: string;
        videoPath: string;
        error: string;
    }) => void;
    'regen:chapters:progress': (data: {
        current: number;
        total: number;
        chapter: string;
    }) => void;
    'regen:chapters:complete': (data: {
        completed: number;
        failed: number;
        errors?: Array<{
            chapter: string;
            error: string;
        }>;
    }) => void;
    'regen:all:started': () => void;
    'regen:all:progress': (data: {
        step: 'transcripts' | 'chapters';
        current: number;
        total: number;
    }) => void;
    'regen:all:complete': (data: {
        transcripts: any;
        chapters: any;
    }) => void;
    'regen:all:error': (data: {
        error: string;
    }) => void;
}
export interface ClientToServerEvents {
}
export type TranscriptionStatus = 'none' | 'queued' | 'transcribing' | 'complete' | 'error';
export interface TranscriptionJob {
    jobId: string;
    videoPath: string;
    videoFilename: string;
    status: TranscriptionStatus;
    duration?: number;
    size?: number;
    queuedAt?: string;
    startedAt?: string;
    completedAt?: string;
    error?: string;
    streamedText?: string;
}
export interface TranscriptionsResponse {
    active: TranscriptionJob | null;
    queue: TranscriptionJob[];
    recent: TranscriptionJob[];
}
export interface TranscriptionStatusResponse {
    filename: string;
    status: TranscriptionStatus;
    transcriptPath?: string;
}
export interface TranscriptContentResponse {
    filename: string;
    content: string;
}
export interface FileContentResponse {
    success: boolean;
    filename: string;
    content: string;
    mimeType: string;
    error?: string;
}
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
export type ChapterMatchStatus = 'matched' | 'low_confidence' | 'not_found';
export interface ChapterMatchCandidate {
    timestamp: string;
    timestampSeconds: number;
    confidence: number;
    matchedText: string;
    matchMethod: 'phrase' | 'partial' | 'keyword';
}
export interface ChapterMatch {
    chapter: number;
    name: string;
    displayName: string;
    timestamp?: string;
    timestampSeconds?: number;
    confidence: number;
    status: ChapterMatchStatus;
    matchedText?: string;
    transcriptSnippet?: string;
    alternatives?: ChapterMatchCandidate[];
    matchReason?: string;
}
export interface ChaptersResponse {
    success: boolean;
    chapters: ChapterMatch[];
    formatted: string;
    error?: string;
    stats?: {
        elapsedMs: number;
        srtSegments: number;
        chaptersFound: number;
        chaptersTotal: number;
    };
}
export interface ChapterVerifyRequest {
    chapter: number;
    name: string;
    transcriptSnippet: string;
    currentMatch?: {
        timestamp: string;
        confidence: number;
        matchedText: string;
    };
    alternatives?: ChapterMatchCandidate[];
    userHint?: string;
}
export interface ChapterVerifyResponse {
    success: boolean;
    chapter: number;
    name: string;
    recommendation: {
        action: 'use_current' | 'use_alternative' | 'manual_timestamp' | 'skip';
        timestamp?: string;
        timestampSeconds?: number;
        confidence: number;
        reasoning: string;
    };
    error?: string;
}
export interface ChapterOverride {
    chapter: number;
    name: string;
    action: 'override' | 'skip';
    timestamp?: string;
    timestampSeconds?: number;
    reason?: string;
    createdAt: string;
}
export interface SetChapterOverrideRequest {
    chapter: number;
    name: string;
    action: 'override' | 'skip';
    timestamp?: string;
    reason?: string;
}
export interface SetChapterOverrideResponse {
    success: boolean;
    override: ChapterOverride;
    error?: string;
}
export interface ChapterRecordingConfig {
    slideDuration: number;
    resolution: '720p' | '1080p';
    autoGenerate: boolean;
    includeTitleSlides?: boolean;
}
export interface ChapterRecordingRequest {
    chapter?: string;
    slideDuration?: number;
    resolution?: string;
}
export interface ChapterRecordingResponse {
    success: boolean;
    generated: string[];
    errors?: string[];
    error?: string;
}
export interface ChapterGenerationProgress {
    chapter: string;
    status: 'pending' | 'generating' | 'complete' | 'error';
    outputFile?: string;
    error?: string;
}
export interface QueryProjectSummary {
    code: string;
    brand: string;
    path: string;
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
    hasInbox: boolean;
    hasAssets: boolean;
    hasChapters: boolean;
}
export interface QueryProjectDetail {
    code: string;
    path: string;
    title?: string;
    stage: ProjectStage;
    priority: ProjectPriority;
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
        video?: {
            filename: string;
            size: number;
        };
        srt?: {
            filename: string;
        };
    } | null;
    createdAt: string | null;
    lastModified: string | null;
}
export interface QueryRecording {
    filename: string;
    chapter: string;
    sequence: string;
    name: string;
    tags: string[];
    folder: 'recordings';
    isSafe: boolean;
    isParked: boolean;
    annotation?: string;
    size: number;
    duration: number | null;
    hasTranscript: boolean;
}
export interface QueryTranscript {
    filename: string;
    chapter: string;
    sequence: string;
    name: string;
    size: number;
    preview?: string;
    content?: string;
}
export interface QueryChapter {
    chapter: number;
    name: string;
    displayName: string;
    title?: string;
    timestamp: string | null;
    timestampSeconds: number | null;
    recordingCount: number;
    hasTranscript: boolean;
}
export interface QueryImage {
    filename: string;
    chapter: string;
    sequence: string;
    imageOrder: string;
    variant: string | null;
    label: string;
    size: number;
}
export interface SafeResponse {
    success: boolean;
    moved?: string[];
    count?: number;
    errors?: string[];
    error?: string;
}
export interface RestoreResponse {
    success: boolean;
    restored?: string[];
    count?: number;
    errors?: string[];
    error?: string;
}
export interface ParkResponse {
    success: boolean;
    parked?: string[];
    count?: number;
    errors?: string[];
    error?: string;
}
export interface UnparkResponse {
    success: boolean;
    unparked?: string[];
    count?: number;
    errors?: string[];
    error?: string;
}
export interface RenameChapterResponse {
    success: boolean;
    renamedFiles: string[];
    error?: string;
}
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
export interface RecentRename {
    id: string;
    originalName: string;
    newName: string;
    timestamp: number;
    age: number;
}
export interface InboxFile {
    filename: string;
    size: number;
    modifiedAt: string;
}
export interface InboxSubfolder {
    name: string;
    path: string;
    fileCount: number;
    files: InboxFile[];
}
export interface InboxResponse {
    success: boolean;
    inbox: {
        totalFiles: number;
        subfolders: InboxSubfolder[];
    };
}
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
export interface EnvironmentResponse {
    platform: 'win32' | 'linux' | 'darwin';
    isWSL: boolean;
    pathFormat: 'windows' | 'linux';
    guidance: {
        nativeFiles: string;
        windowsFiles: string;
        wslFiles: string;
    };
    machineRole: MachineRole;
}
export interface RecordingState {
    safe?: boolean;
    parked?: boolean;
    annotation?: string;
    stage?: string;
}
export interface ChapterState {
    title?: string;
}
export interface ProjectState {
    version: 1;
    recordings: Record<string, RecordingState>;
    title?: string;
    chapters?: Record<string, ChapterState>;
    glingDictionary?: string[];
    editManifest?: EditManifest;
}
export interface ProjectStateResponse {
    success: boolean;
    state: ProjectState;
    error?: string;
}
export interface UpdateProjectStateRequest {
    recordings: Record<string, RecordingState>;
}
export interface EditManifestFile {
    filename: string;
    sourceHash: string;
    copiedAt: string;
    sourceSize: number;
}
export interface EditFolderManifest {
    lastCopied: string | null;
    files: EditManifestFile[];
}
export interface EditManifest {
    'edit-1st': EditFolderManifest;
    'edit-2nd': EditFolderManifest;
    'edit-final': EditFolderManifest;
}
export type FolderKey = 'ecamm' | 'downloads' | 'recordings' | 'safe' | 'trash' | 'images' | 'thumbs' | 'transcripts' | 'project' | 'final' | 's3Staging' | 's3Prep' | 's3Post' | 'inbox' | 'chapters' | 'relay' | 'edit-1st' | 'edit-2nd' | 'edit-final';
export type EditFolderKey = 'edit-1st' | 'edit-2nd' | 'edit-final';
export interface ManifestFileStatus {
    filename: string;
    status: 'present' | 'missing' | 'changed';
    sourceSize?: number;
    currentHash?: string;
}
export type ManifestStatus = 'present' | 'cleaned' | 'changed' | 'missing' | 'no-manifest';
export interface ManifestStatusDetail {
    status: ManifestStatus;
    manifestedFiles: number;
    presentFiles: number;
    missingFiles: number;
    changedFiles: number;
    totalSize: number;
    fileDetails?: ManifestFileStatus[];
}
export interface ManifestStatusResponse {
    success: boolean;
    folder: EditFolderKey;
    detail: ManifestStatusDetail;
    error?: string;
}
export interface CleanEditFolderResponse {
    success: boolean;
    folder: EditFolderKey;
    deleted: string[];
    deletedCount: number;
    spaceSaved: number;
    preserved: string[];
    error?: string;
}
export interface RestoreEditFolderResponse {
    success: boolean;
    folder: EditFolderKey;
    restored: string[];
    restoredCount: number;
    warnings?: string[];
    error?: string;
}
export interface RelayActivityEvent {
    id: string;
    projectCode: string;
    subfolder: RelaySubfolder;
    action: 'push' | 'collect' | 'promote' | 'clear' | 'file-detected';
    description: string;
    timestamp: string;
    fileCount?: number;
    totalSize?: number;
}
export interface RelayActivityResponse {
    success: boolean;
    events?: RelayActivityEvent[];
    error?: string;
}
export interface SplitChapterRequest {
    chapter: string;
    splitAtSequence: number;
}
export interface SplitChapterResponse {
    success: boolean;
    sourceChapter: string;
    newChapter: string;
    filesMoved: number;
    cascadedChapters: number;
    undoMapping: Array<{
        oldFilename: string;
        newFilename: string;
    }>;
    error?: string;
}
export type SyncState = 'clean' | 'dirty' | 'behind' | 'ahead' | 'diverged' | 'conflict' | 'unknown';
export interface SyncChannelStatus {
    channel: string;
    state: SyncState;
    localHash: string;
    remoteHash: string;
    dirtyCount: number;
    behindCount: number;
    aheadCount: number;
    lastFetch: string;
    dirtyFiles?: string[];
    error?: string;
}
export interface SyncStatusResponse {
    success: boolean;
    appCode?: SyncChannelStatus;
    videoProject?: SyncChannelStatus;
    error?: string;
}
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
export interface UndoRenameResponse {
    success: boolean;
    filesReverted: number;
    error?: string;
}
/**
 * One rolling sample, posted ~1 Hz. The worklet emits ~23 Hz; posting at that rate
 * would be 23x the traffic for no extra insight, since the underlying window is 3 s.
 *
 * Nulls are load-bearing: a metric that is not yet measurable is null, never 0 and
 * never a plausible-looking number. -Infinity does not survive JSON, so silence
 * arrives here as null with `windowFull` saying whether the window had even filled.
 */
export type MicCheckMode = 'room' | 'speaking';
export interface MicCheckTick {
    /** Milliseconds since session start. */
    t: number;
    /**
     * DECLARED — which screen the operator pressed. Authoritative, never inferred.
     * Inferring the mode means a wrong inference yields a confidently wrong reading.
     */
    mode: MicCheckMode;
    shortTermLufs: number | null;
    samplePeakDbfs: number | null;
    clipCount: number;
    nearClipCount: number;
    /** False until a full 3 s short-term window has been observed. */
    windowFull: boolean;
    /**
     * MEASURED — does THIS tick contain speech (level vs the floor)?
     *
     * Distinct from `mode`, and both are needed. Inside SPEAKING it gates the loudness
     * stats, so pauses between sentences do not drag the average down. Inside ROOM it is
     * an ERROR SIGNAL: speech during a room capture means the reference is contaminated
     * and every later delta would be measured against a lie.
     *
     * It must never decide the mode. `mode` records intent; this records behaviour, and
     * the interesting case is when they disagree.
     */
    speechDetected: boolean;
}
export type MicCheckEventKind = 'level-step' | 'clip' | 'near-clip-run' | 'level-instability' | 'room-contaminated';
/**
 * A timestamped observation. Persisted because it CANNOT be re-derived later: a level
 * step is defined over 500 ms and the stored series is 1 Hz, so the resolution needed to
 * find it is already gone by the time anything reaches disk.
 *
 * Trajectory is deliberately NOT here — direction and sparkline are a rendering of the
 * series, and storing a rendering beside its source creates two truths free to drift.
 */
export interface MicCheckEvent {
    t: number;
    kind: MicCheckEventKind;
    /** Phrased as an observation, never an attributed cause. */
    label: string;
    deltaDb?: number;
}
/** The four-way constraint report: what we asked for vs what we actually got. */
export interface MicCheckConstraints {
    asked: Record<string, unknown>;
    got: Record<string, unknown>;
    capable: Record<string, unknown> | null;
    supported: Record<string, unknown>;
}
export type MicCheckProbeVerdict = 'clean' | 'suspicious' | 'inconclusive';
export interface MicCheckProbe {
    verdict: MicCheckProbeVerdict;
    findings: string[];
    capturedLevelDbfs: number;
    levelDriftDb: number;
    deepestNotchDb: number;
}
/**
 * Every metric NOT measured, and why. This is the grey-never-becomes-green rule
 * expressed as data: a consumer must be able to tell "SNR was fine" from
 * "SNR was never measured", and an absent key cannot carry that distinction.
 */
export interface MicCheckNotMeasured {
    metric: string;
    reason: string;
}
export interface MicCheckDevice {
    label: string;
    sampleRate: number | null;
    channelCount: number | null;
    sampleSize: number | null;
}
export interface MicCheckSummary {
    durationMs: number;
    tickCount: number;
    /** Ticks where the window was full AND speech was present — the only gradeable ones. */
    measurableTickCount: number;
    /** Null when no tick was ever measurable. Never silently 0. */
    shortTermLufs: {
        min: number;
        max: number;
        mean: number;
    } | null;
    /** Widest observed spread in LUFS. Large => the level drifted rather than held. */
    driftLu: number | null;
    sessionPeakDbfs: number | null;
    clipCount: number;
    nearClipCount: number;
}
export interface MicCheckSession {
    sessionId: string;
    startedAt: string;
    finishedAt: string | null;
    /** Active project at session start, if any. Lets a report attach to a take later. */
    projectCode: string | null;
    workletVersion: string | null;
    device: MicCheckDevice;
    constraints: MicCheckConstraints | null;
    probe: MicCheckProbe | null;
    summary: MicCheckSummary | null;
    series: MicCheckTick[];
    events: MicCheckEvent[];
    /** Noise floor captured during ROOM mode, in LUFS. Null when never captured. */
    roomReferenceLufs: number | null;
    not_measured: MicCheckNotMeasured[];
}
/** Listing entry — the summary fields, without the series. */
export interface MicCheckSessionListEntry {
    sessionId: string;
    startedAt: string;
    finishedAt: string | null;
    projectCode: string | null;
    deviceLabel: string;
    summary: MicCheckSummary | null;
    probeVerdict: MicCheckProbeVerdict | null;
}
/**
 * GET /api/query/miccheck/live
 *
 * Three distinct states, deliberately not collapsible:
 *   active=false                  — no run in progress
 *   active=true, measurable=false — running, but nothing gradeable yet (and why)
 *   active=true, measurable=true  — running and reading real numbers
 *
 * Returning an empty/zeroed payload for the first two would rebuild, in the API,
 * exactly the grey-vs-green confusion the UI was built to avoid.
 */
export interface MicCheckLiveResponse {
    success: boolean;
    active: boolean;
    measurable: boolean;
    /** Always populated when active=false or measurable=false. */
    reason: string | null;
    session: MicCheckSession | null;
    latest: MicCheckTick | null;
}
