/**
 * Centralized path derivation for project directories
 *
 * All paths are derived from a single projectDirectory config value.
 * This replaces the previous pattern of pointing to recordings/ and
 * going up (..) to reach other directories.
 */
import path from 'path';
/**
 * Get all project-related paths from the project directory
 * @param projectDirectory - The project root directory (expanded, no ~)
 */
export function getProjectPaths(projectDirectory) {
    return {
        project: projectDirectory,
        recordings: path.join(projectDirectory, 'recordings'),
        safe: path.join(projectDirectory, 'recordings', '-safe'),
        chapters: path.join(projectDirectory, 'recordings', '-chapters'), // FR-58
        trash: path.join(projectDirectory, '-trash'),
        assets: path.join(projectDirectory, 'assets'),
        images: path.join(projectDirectory, 'assets', 'images'),
        thumbs: path.join(projectDirectory, 'assets', 'thumbs'),
        transcripts: path.join(projectDirectory, 'recording-transcripts'),
        final: path.join(projectDirectory, 'final'),
        s3Staging: path.join(projectDirectory, 's3-staging'),
        // FR-59: Inbox folders
        inbox: path.join(projectDirectory, 'inbox'),
        inboxRaw: path.join(projectDirectory, 'inbox', 'raw'),
        inboxDataset: path.join(projectDirectory, 'inbox', 'dataset'),
        inboxPresentation: path.join(projectDirectory, 'inbox', 'presentation'),
        // FR-111: Per-project state file
        stateFile: path.join(projectDirectory, '.flihub-state.json'),
    };
}
/**
 * Migrate old targetDirectory (pointing to recordings/) to projectDirectory
 * Strips trailing /recordings from the path
 */
export function migrateTargetToProject(targetDirectory) {
    return targetDirectory.replace(/\/recordings\/?$/, '');
}
