export interface FileInfo {
    path: string;
    filename: string;
    timestamp: string;
    size: number;
    duration?: number;
}
export interface CommonName {
    name: string;
    autoSequence?: boolean;
    suggestTags?: string[];
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
    projectStages?: ProjectStage[];
    chapterRecordings?: ChapterRecordingConfig;
    shadowResolution?: number;
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
export type ProjectStage = 'planning' | 'recording' | 'first-edit' | 'second-edit' | 'review' | 'ready-to-publish' | 'published' | 'archived';
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
    recordingsCount: number;
    safeCount: number;
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
    shadowCount: number;
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
    folder: 'recordings' | 'safe';
    isShadow?: boolean;
    hasShadow?: boolean;
    shadowSize?: number | null;
}
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
    'transcripts:changed': () => void;
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
    folder: 'recordings' | 'safe';
    size: number;
    duration: number | null;
    hasTranscript: boolean;
    isShadow?: boolean;
    hasShadow?: boolean;
    shadowSize?: number | null;
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
}
