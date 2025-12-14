/**
 * Centralized path derivation for project directories
 *
 * All paths are derived from a single projectDirectory config value.
 * This replaces the previous pattern of pointing to recordings/ and
 * going up (..) to reach other directories.
 */
export interface ProjectPaths {
    project: string;
    recordings: string;
    safe: string;
    chapters: string;
    trash: string;
    assets: string;
    images: string;
    thumbs: string;
    transcripts: string;
    final: string;
    s3Staging: string;
    inbox: string;
    inboxRaw: string;
    inboxDataset: string;
    inboxPresentation: string;
}
/**
 * Get all project-related paths from the project directory
 * @param projectDirectory - The project root directory (expanded, no ~)
 */
export declare function getProjectPaths(projectDirectory: string): ProjectPaths;
/**
 * Migrate old targetDirectory (pointing to recordings/) to projectDirectory
 * Strips trailing /recordings from the path
 */
export declare function migrateTargetToProject(targetDirectory: string): string;
