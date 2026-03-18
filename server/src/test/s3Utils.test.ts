import { describe, it, expect } from 'vitest';
import path from 'path';
import { extractBrand, categorizeMigrationFiles, isPathWithinProject } from '../utils/s3Utils.js';

// ---------------------------------------------------------------------------
// extractBrand
// ---------------------------------------------------------------------------

describe('extractBrand', () => {
  it('extracts "appydave" from a v-appydave path', () => {
    const projectPath = path.join('/video-projects', 'v-appydave', 'b85-clauding-01');
    expect(extractBrand(projectPath)).toBe('appydave');
  });

  it('extracts "joy" from a v-joy path', () => {
    const projectPath = path.join('/video-projects', 'v-joy', 'b12-intro-01');
    expect(extractBrand(projectPath)).toBe('joy');
  });

  it('extracts from the rightmost v- segment when multiple exist', () => {
    // Scans from right-to-left, so last v- segment wins
    const projectPath = path.join('/v-outer', 'v-inner', 'project-01');
    expect(extractBrand(projectPath)).toBe('inner');
  });

  it('returns "appydave" as the default fallback when no v- segment present', () => {
    const projectPath = path.join('/video-projects', 'some-brand', 'b85-clauding-01');
    expect(extractBrand(projectPath)).toBe('appydave');
  });

  it('returns "appydave" for an empty path', () => {
    expect(extractBrand('')).toBe('appydave');
  });

  it('extracts brand from a deeply nested path', () => {
    const projectPath = path.join('/Users', 'david', 'dev', 'v-appydave', 'projects', 'b10-test');
    expect(extractBrand(projectPath)).toBe('appydave');
  });

  it('handles a path where the v- segment is the last component', () => {
    const projectPath = path.join('/video-projects', 'v-solo');
    expect(extractBrand(projectPath)).toBe('solo');
  });
});

// ---------------------------------------------------------------------------
// categorizeMigrationFiles
// ---------------------------------------------------------------------------

describe('categorizeMigrationFiles', () => {
  // ---- junk files ----

  it('marks .DS_Store as delete', () => {
    const result = categorizeMigrationFiles(['.DS_Store'], 'my-project');
    expect(result.delete).toContain('.DS_Store');
    expect(result.toPrep).toHaveLength(0);
    expect(result.toPost).toHaveLength(0);
  });

  it('marks a Zone.Identifier file as delete', () => {
    const result = categorizeMigrationFiles(['video.mp4.Zone.Identifier'], 'my-project');
    expect(result.delete).toContain('video.mp4.Zone.Identifier');
  });

  // ---- final files → toPost ----

  it('puts a *-final.mp4 file into toPost using the project name and default version v1', () => {
    const result = categorizeMigrationFiles(['episode-final.mp4'], 'my-project');
    expect(result.toPost).toHaveLength(1);
    expect(result.toPost[0]).toEqual({ from: 'episode-final.mp4', to: 'post/my-project-v1.mp4' });
  });

  it('puts a *-final.srt file into toPost with default version v1', () => {
    const result = categorizeMigrationFiles(['episode-final.srt'], 'my-project');
    expect(result.toPost[0]).toEqual({ from: 'episode-final.srt', to: 'post/my-project-v1.srt' });
  });

  it('puts a *-final.mov file into toPost with default version v1', () => {
    const result = categorizeMigrationFiles(['episode-final.mov'], 'my-project');
    expect(result.toPost[0]).toEqual({ from: 'episode-final.mov', to: 'post/my-project-v1.mov' });
  });

  it('preserves an explicit version number from *-final-v2.mp4', () => {
    const result = categorizeMigrationFiles(['episode-final-v2.mp4'], 'my-project');
    expect(result.toPost[0]).toEqual({ from: 'episode-final-v2.mp4', to: 'post/my-project-v2.mp4' });
  });

  it('uses the project name (not the file base name) as the target basename', () => {
    const result = categorizeMigrationFiles(['b85-clauding-final.mp4'], 'b85-clauding-01');
    expect(result.toPost[0].to).toBe('post/b85-clauding-01-v1.mp4');
  });

  it('handles final match case-insensitively (FINAL uppercase)', () => {
    const result = categorizeMigrationFiles(['episode-FINAL.mp4'], 'proj');
    expect(result.toPost).toHaveLength(1);
    expect(result.toPost[0].to).toBe('post/proj-v1.mp4');
  });

  // ---- regular media files → toPrep ----

  it('puts a plain .mp4 file into toPrep with prep/ prefix', () => {
    const result = categorizeMigrationFiles(['raw-clip.mp4'], 'my-project');
    expect(result.toPrep).toHaveLength(1);
    expect(result.toPrep[0]).toEqual({ from: 'raw-clip.mp4', to: 'prep/raw-clip.mp4' });
  });

  it('puts a plain .srt file into toPrep', () => {
    const result = categorizeMigrationFiles(['captions.srt'], 'my-project');
    expect(result.toPrep[0]).toEqual({ from: 'captions.srt', to: 'prep/captions.srt' });
  });

  it('puts a plain .mov file into toPrep', () => {
    const result = categorizeMigrationFiles(['recording.mov'], 'my-project');
    expect(result.toPrep[0]).toEqual({ from: 'recording.mov', to: 'prep/recording.mov' });
  });

  it('ignores files with unrecognised extensions (neither prep nor post)', () => {
    const result = categorizeMigrationFiles(['notes.txt', 'thumbnail.png'], 'my-project');
    expect(result.toPrep).toHaveLength(0);
    expect(result.toPost).toHaveLength(0);
    expect(result.delete).toHaveLength(0);
  });

  // ---- conflict detection ----

  it('flags a conflict when two files would produce the same versioned target', () => {
    // Both map to my-project-v1.mp4 in post/
    const files = ['a-final.mp4', 'b-final.mp4'];
    const result = categorizeMigrationFiles(files, 'my-project');
    // First file goes to toPost, second triggers conflict
    expect(result.toPost).toHaveLength(1);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].file).toBe('b-final.mp4');
    expect(result.conflicts[0].reason).toContain('v1');
  });

  it('does not flag a conflict when final files have different versions', () => {
    const files = ['a-final-v1.mp4', 'b-final-v2.mp4'];
    const result = categorizeMigrationFiles(files, 'my-project');
    expect(result.toPost).toHaveLength(2);
    expect(result.conflicts).toHaveLength(0);
  });

  // ---- mixed batch ----

  it('correctly categorizes a realistic mixed batch of files', () => {
    const files = [
      '.DS_Store',
      'raw-edit.mp4',
      'captions.srt',
      'episode-final.mp4',
      'episode-final.srt',
      'thumbnail.png',
    ];
    const result = categorizeMigrationFiles(files, 'b85-ep1');

    expect(result.delete).toEqual(['.DS_Store']);
    expect(result.toPrep).toEqual([
      { from: 'raw-edit.mp4', to: 'prep/raw-edit.mp4' },
      { from: 'captions.srt', to: 'prep/captions.srt' },
    ]);
    expect(result.toPost).toEqual([
      { from: 'episode-final.mp4', to: 'post/b85-ep1-v1.mp4' },
      { from: 'episode-final.srt', to: 'post/b85-ep1-v1.srt' },
    ]);
    expect(result.conflicts).toHaveLength(0);
  });

  // ---- empty input ----

  it('returns all empty arrays when given no files', () => {
    const result = categorizeMigrationFiles([], 'my-project');
    expect(result.delete).toHaveLength(0);
    expect(result.toPrep).toHaveLength(0);
    expect(result.toPost).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// isPathWithinProject — path traversal guard (srt-text endpoint)
// ---------------------------------------------------------------------------

describe('isPathWithinProject', () => {
  const projectRoot = '/video-projects/v-appydave/b85-clauding-01';

  it('accepts a file directly inside the project directory', () => {
    const filePath = path.join(projectRoot, 'recording-transcripts', 'episode.srt');
    expect(isPathWithinProject(filePath, projectRoot)).toBe(true);
  });

  it('accepts a deeply nested file inside the project directory', () => {
    const filePath = path.join(projectRoot, 's3-staging', 'post', 'b85-clauding-01-v1.srt');
    expect(isPathWithinProject(filePath, projectRoot)).toBe(true);
  });

  it('rejects a path traversal that escapes via ../', () => {
    const filePath = path.join(projectRoot, '..', '..', 'etc', 'passwd');
    expect(isPathWithinProject(filePath, projectRoot)).toBe(false);
  });

  it('rejects a completely unrelated absolute path', () => {
    const filePath = '/etc/passwd';
    expect(isPathWithinProject(filePath, projectRoot)).toBe(false);
  });

  it('rejects a path that is a sibling directory (prefix but not inside)', () => {
    // e.g. /video-projects/v-appydave/b85-clauding-01-evil should not match b85-clauding-01
    const filePath = '/video-projects/v-appydave/b85-clauding-01-evil/secret.srt';
    expect(isPathWithinProject(filePath, projectRoot)).toBe(false);
  });

  it('accepts the project root itself as the file path', () => {
    expect(isPathWithinProject(projectRoot, projectRoot)).toBe(true);
  });

  it('rejects a path to the home directory when project is a subdirectory', () => {
    expect(isPathWithinProject('/Users/david', projectRoot)).toBe(false);
  });
});
