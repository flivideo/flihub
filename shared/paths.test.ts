import { describe, it, expect } from 'vitest';
import { getProjectPaths, migrateTargetToProject } from './paths';

describe('paths utilities', () => {
  describe('getProjectPaths', () => {
    const base = '/home/user/projects/my-video';
    const paths = getProjectPaths(base);

    it('should return the project root as-is', () => {
      expect(paths.project).toBe(base);
    });

    it('should resolve recordings/ correctly', () => {
      expect(paths.recordings).toBe(`${base}/recordings`);
    });

    it('should resolve recordings/-safe/ correctly', () => {
      expect(paths.safe).toBe(`${base}/recordings/-safe`);
    });

    it('should resolve recordings/-chapters/ correctly', () => {
      expect(paths.chapters).toBe(`${base}/recordings/-chapters`);
    });

    it('should resolve -trash/ correctly', () => {
      expect(paths.trash).toBe(`${base}/-trash`);
    });

    it('should resolve assets/ correctly', () => {
      expect(paths.assets).toBe(`${base}/assets`);
    });

    it('should resolve assets/images/ correctly', () => {
      expect(paths.images).toBe(`${base}/assets/images`);
    });

    it('should resolve assets/thumbs/ correctly', () => {
      expect(paths.thumbs).toBe(`${base}/assets/thumbs`);
    });

    it('should resolve recording-transcripts/ correctly', () => {
      expect(paths.transcripts).toBe(`${base}/recording-transcripts`);
    });

    it('should resolve final/ correctly', () => {
      expect(paths.final).toBe(`${base}/final`);
    });

    it('should resolve s3-staging/ correctly', () => {
      expect(paths.s3Staging).toBe(`${base}/s3-staging`);
    });

    it('should resolve inbox/ correctly', () => {
      expect(paths.inbox).toBe(`${base}/inbox`);
    });

    it('should resolve inbox/raw/ correctly', () => {
      expect(paths.inboxRaw).toBe(`${base}/inbox/raw`);
    });

    it('should resolve inbox/dataset/ correctly', () => {
      expect(paths.inboxDataset).toBe(`${base}/inbox/dataset`);
    });

    it('should resolve inbox/presentation/ correctly', () => {
      expect(paths.inboxPresentation).toBe(`${base}/inbox/presentation`);
    });

    it('should resolve .flihub-state.json correctly', () => {
      expect(paths.stateFile).toBe(`${base}/.flihub-state.json`);
    });

    it('should return all expected keys', () => {
      const expectedKeys = [
        'project',
        'recordings',
        'safe',
        'chapters',
        'trash',
        'assets',
        'images',
        'thumbs',
        'transcripts',
        'final',
        's3Staging',
        'inbox',
        'inboxRaw',
        'inboxDataset',
        'inboxPresentation',
        'stateFile',
      ];
      for (const key of expectedKeys) {
        expect(paths).toHaveProperty(key);
      }
    });

    it('should work with a deeply nested project directory', () => {
      const deep = '/a/b/c/d/my-project';
      const p = getProjectPaths(deep);
      expect(p.project).toBe(deep);
      expect(p.recordings).toBe(`${deep}/recordings`);
      expect(p.images).toBe(`${deep}/assets/images`);
    });
  });

  describe('migrateTargetToProject', () => {
    it('should strip a trailing /recordings segment', () => {
      expect(migrateTargetToProject('/home/user/projects/my-video/recordings')).toBe(
        '/home/user/projects/my-video'
      );
    });

    it('should strip /recordings/ with a trailing slash', () => {
      expect(migrateTargetToProject('/home/user/projects/my-video/recordings/')).toBe(
        '/home/user/projects/my-video'
      );
    });

    it('should return the path unchanged when it does not end with /recordings', () => {
      expect(migrateTargetToProject('/home/user/projects/my-video')).toBe(
        '/home/user/projects/my-video'
      );
    });

    it('should not strip /recordings when it appears mid-path', () => {
      expect(
        migrateTargetToProject('/home/user/recordings/my-video')
      ).toBe('/home/user/recordings/my-video');
    });

    it('should handle a bare /recordings path', () => {
      expect(migrateTargetToProject('/recordings')).toBe('');
    });

    it('should handle a path that is just /recordings/', () => {
      expect(migrateTargetToProject('/recordings/')).toBe('');
    });
  });
});
