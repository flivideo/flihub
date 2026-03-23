// B044: Tests for sync status endpoint
// Uses supertest + vitest mocks — no real git calls

import { vi, describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// --- Mock child_process ---
const mockExecFile = vi.fn().mockReturnValue({ stdout: '', stderr: '' });
vi.mock('child_process', async () => {
  const { promisify } = await import('util');

  const execFileFn = (...args: unknown[]) => {
    const cb = args[args.length - 1];
    if (typeof cb === 'function') {
      try {
        const result = mockExecFile(...args.slice(0, -1));
        (cb as Function)(null, result?.stdout ?? '', result?.stderr ?? '');
      } catch (err) {
        (cb as Function)(err, '', '');
      }
    }
  };

  (execFileFn as any)[promisify.custom] = (...args: unknown[]) => {
    try {
      const result = mockExecFile(...args);
      return Promise.resolve({ stdout: result?.stdout ?? '', stderr: result?.stderr ?? '' });
    } catch (err) {
      return Promise.reject(err);
    }
  };

  return {
    execFile: execFileFn,
    exec: vi.fn(),
    execSync: vi.fn(),
  };
});

// --- Mock pathUtils ---
vi.mock('../utils/pathUtils.js', () => ({
  expandPath: vi.fn((p: string) => p.replace('~', '/Users/test')),
}));

// Imports must come AFTER vi.mock() declarations
import { createSyncRoutes, buildCommitMessage } from '../routes/sync.js';
import type { Config } from '../../../shared/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    watchDirectory: '~/ecamm',
    projectDirectory: '~/dev/video-projects/v-appydave/b17-test',
    fileExtensions: ['.mov', '.mp4'],
    availableTags: [],
    commonNames: [],
    imageSourceDirectory: '~/Downloads',
    projectsRootDirectory: '~/dev/video-projects/v-appydave',
    ...overrides,
  } as Config;
}

function buildApp(config: Partial<Config> = {}) {
  const mockConfig = makeConfig(config);
  const app = express();
  app.use(express.json());
  app.use('/api/sync', createSyncRoutes(() => mockConfig));
  return app;
}

// Helper to set up git mock responses for a specific cwd
function mockGitCommands(opts: {
  localHash?: string;
  remoteHash?: string;
  leftRight?: string;
  porcelain?: string;
  fetchError?: boolean;
  upstreamError?: boolean;
  revListError?: boolean;
  allError?: boolean;
}) {
  mockExecFile.mockImplementation((...args: unknown[]) => {
    const cmd = args[0] as string;
    const cmdArgs = args[1] as string[];

    if (opts.allError) {
      throw new Error('git failed');
    }

    if (cmd === 'git' && cmdArgs[0] === 'fetch') {
      if (opts.fetchError) throw new Error('fetch failed');
      return { stdout: '', stderr: '' };
    }
    if (cmd === 'git' && cmdArgs[0] === 'rev-parse' && cmdArgs[1] === '--short' && cmdArgs[2] === 'HEAD') {
      return { stdout: opts.localHash ?? 'abc1234\n', stderr: '' };
    }
    if (cmd === 'git' && cmdArgs[0] === 'rev-parse' && cmdArgs[2] === '@{upstream}') {
      if (opts.upstreamError) throw new Error('no upstream');
      return { stdout: (opts.remoteHash ?? 'abc1234') + '\n', stderr: '' };
    }
    if (cmd === 'git' && cmdArgs[0] === 'rev-list') {
      if (opts.revListError) throw new Error('rev-list failed');
      return { stdout: opts.leftRight ?? '0\t0\n', stderr: '' };
    }
    if (cmd === 'git' && cmdArgs[0] === 'status') {
      return { stdout: opts.porcelain ?? '', stderr: '' };
    }
    return { stdout: '', stderr: '' };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/sync/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns state=clean for a clean repo', async () => {
    const app = buildApp();
    mockGitCommands({
      localHash: 'abc1234\n',
      remoteHash: 'abc1234',
      leftRight: '0\t0\n',
      porcelain: '',
    });

    const res = await request(app).get('/api/sync/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.appCode.state).toBe('clean');
    expect(res.body.appCode.localHash).toBe('abc1234');
    expect(res.body.appCode.dirtyCount).toBe(0);
    expect(res.body.appCode.dirtyFiles).toBeUndefined();
  });

  it('returns state=dirty with dirtyFiles when repo has uncommitted changes', async () => {
    const app = buildApp();
    mockGitCommands({
      localHash: 'abc1234\n',
      remoteHash: 'abc1234',
      leftRight: '0\t0\n',
      porcelain: 'M  src/index.ts\n?? newfile.ts\n',
    });

    const res = await request(app).get('/api/sync/status');
    expect(res.body.appCode.state).toBe('dirty');
    expect(res.body.appCode.dirtyCount).toBe(2);
    expect(res.body.appCode.dirtyFiles).toEqual(['M  src/index.ts', '?? newfile.ts']);
  });

  it('returns state=behind when repo is behind upstream', async () => {
    const app = buildApp();
    mockGitCommands({
      localHash: 'abc1234\n',
      remoteHash: 'def5678',
      leftRight: '0\t3\n',
      porcelain: '',
    });

    const res = await request(app).get('/api/sync/status');
    expect(res.body.appCode.state).toBe('behind');
    expect(res.body.appCode.behindCount).toBe(3);
  });

  it('returns state=ahead when repo is ahead of upstream', async () => {
    const app = buildApp();
    mockGitCommands({
      localHash: 'abc1234\n',
      remoteHash: 'def5678',
      leftRight: '2\t0\n',
      porcelain: '',
    });

    const res = await request(app).get('/api/sync/status');
    expect(res.body.appCode.state).toBe('ahead');
    expect(res.body.appCode.aheadCount).toBe(2);
  });

  it('returns state=diverged when repo is dirty and behind', async () => {
    const app = buildApp();
    mockGitCommands({
      localHash: 'abc1234\n',
      remoteHash: 'def5678',
      leftRight: '0\t2\n',
      porcelain: ' M file.ts\n',
    });

    const res = await request(app).get('/api/sync/status');
    expect(res.body.appCode.state).toBe('diverged');
    expect(res.body.appCode.dirtyCount).toBe(1);
    expect(res.body.appCode.behindCount).toBe(2);
  });

  it('returns graceful fallback when no upstream is configured', async () => {
    const app = buildApp();
    mockGitCommands({
      localHash: 'abc1234\n',
      upstreamError: true,
      porcelain: '',
    });

    const res = await request(app).get('/api/sync/status');
    expect(res.body.success).toBe(true);
    expect(res.body.appCode.state).toBe('clean');
    expect(res.body.appCode.remoteHash).toBe('');
  });

  it('returns only appCode when video project is not configured', async () => {
    const app = buildApp({ projectsRootDirectory: undefined });
    mockGitCommands({
      localHash: 'abc1234\n',
      remoteHash: 'abc1234',
      leftRight: '0\t0\n',
      porcelain: '',
    });

    const res = await request(app).get('/api/sync/status');
    expect(res.body.success).toBe(true);
    expect(res.body.appCode).toBeDefined();
    expect(res.body.videoProject).toBeUndefined();
  });

  it('returns videoProject when projectsRootDirectory is configured', async () => {
    const app = buildApp({ projectsRootDirectory: '~/dev/video-projects/v-appydave' });
    mockGitCommands({
      localHash: 'abc1234\n',
      remoteHash: 'abc1234',
      leftRight: '0\t0\n',
      porcelain: '',
    });

    const res = await request(app).get('/api/sync/status');
    expect(res.body.success).toBe(true);
    expect(res.body.appCode).toBeDefined();
    expect(res.body.videoProject).toBeDefined();
    expect(res.body.videoProject.channel).toBe('video-project');
  });

  it('returns state=unknown with error when git fails entirely', async () => {
    const app = buildApp();
    mockGitCommands({ allError: true });

    const res = await request(app).get('/api/sync/status');
    expect(res.body.success).toBe(true);
    expect(res.body.appCode.state).toBe('unknown');
    expect(res.body.appCode.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// buildCommitMessage — unit tests
// ---------------------------------------------------------------------------

describe('buildCommitMessage', () => {
  it('lists filenames when <=5 files', () => {
    const files = ['recordings/01-1-intro.mov', 'assets/images/01-1-1a-hero.png', 'notes.txt'];
    const msg = buildCommitMessage(files);
    expect(msg).toBe('Push: 01-1-intro.mov, 01-1-1a-hero.png, notes.txt');
  });

  it('shows grouped counts when >5 files', () => {
    const files = [
      'recordings/01-1-intro.mov',
      'recordings/01-2-setup.mov',
      'recordings/01-3-demo.mp4',
      'recording-transcripts/01-1-intro.txt',
      'recording-transcripts/01-2-setup.srt',
      'recording-transcripts/01-3-demo.txt',
      'assets/images/01-1-1a-hero.png',
      'config.json',
    ];
    const msg = buildCommitMessage(files);
    expect(msg).toContain('Push: 8 files');
    expect(msg).toContain('3 recordings');
    expect(msg).toContain('3 transcripts');
    expect(msg).toContain('1 images');
    expect(msg).toContain('1 other');
  });

  it('handles empty file list', () => {
    expect(buildCommitMessage([])).toBe('Push: empty commit');
  });
});

// ---------------------------------------------------------------------------
// POST /push — push video project
// ---------------------------------------------------------------------------

describe('POST /api/sync/push', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with commit details on successful push', async () => {
    const app = buildApp();

    mockExecFile.mockImplementation((...args: unknown[]) => {
      const cmdArgs = args[1] as string[];
      if (cmdArgs[0] === 'add') return { stdout: '', stderr: '' };
      if (cmdArgs[0] === 'diff') return { stdout: 'recordings/01-1-intro.mov\nassets/hero.png\n', stderr: '' };
      if (cmdArgs[0] === 'commit') return { stdout: '', stderr: '' };
      if (cmdArgs[0] === 'rev-parse') return { stdout: 'abc1234\n', stderr: '' };
      if (cmdArgs[0] === 'push') return { stdout: 'Everything up-to-date\n', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    const res = await request(app).post('/api/sync/push');
    expect(res.body.success).toBe(true);
    expect(res.body.commitHash).toBe('abc1234');
    expect(res.body.filesCommitted).toBe(2);
    expect(res.body.commitMessage).toContain('Push:');
  });

  it('returns error when nothing to commit', async () => {
    const app = buildApp();

    mockExecFile.mockImplementation((...args: unknown[]) => {
      const cmdArgs = args[1] as string[];
      if (cmdArgs[0] === 'add') return { stdout: '', stderr: '' };
      if (cmdArgs[0] === 'diff') return { stdout: '', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    const res = await request(app).post('/api/sync/push');
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Nothing to commit');
  });

  it('returns error when no projectsRootDirectory configured', async () => {
    const app = buildApp({ projectsRootDirectory: undefined });

    const res = await request(app).post('/api/sync/push');
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('No projects root directory');
  });
});

// ---------------------------------------------------------------------------
// POST /pull — pull changes
// ---------------------------------------------------------------------------

describe('POST /api/sync/pull', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success on clean pull for video-project', async () => {
    const app = buildApp();

    mockExecFile.mockImplementation((...args: unknown[]) => {
      const cmdArgs = args[1] as string[];
      if (cmdArgs[0] === 'pull') return { stdout: 'Already up to date.\n', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    const res = await request(app)
      .post('/api/sync/pull')
      .send({ channel: 'video-project' });

    expect(res.body.success).toBe(true);
    expect(res.body.output).toContain('Already up to date');
    expect(res.body.restartInstructions).toBeUndefined();
  });

  it('includes restart instructions for app-code pull', async () => {
    const app = buildApp();

    mockExecFile.mockImplementation((...args: unknown[]) => {
      const cmdArgs = args[1] as string[];
      if (cmdArgs[0] === 'pull') return { stdout: 'Updating abc..def\n', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    const res = await request(app)
      .post('/api/sync/pull')
      .send({ channel: 'app-code' });

    expect(res.body.success).toBe(true);
    expect(res.body.restartInstructions).toContain('Restart');
  });

  it('returns conflicts on pull conflict', async () => {
    const app = buildApp();

    let callCount = 0;
    mockExecFile.mockImplementation((...args: unknown[]) => {
      const cmdArgs = args[1] as string[];
      if (cmdArgs[0] === 'pull') {
        throw new Error('CONFLICT (content): Merge conflict in file.txt');
      }
      if (cmdArgs[0] === 'diff') {
        return { stdout: 'file.txt\nother.json\n', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const res = await request(app)
      .post('/api/sync/pull')
      .send({ channel: 'video-project' });

    expect(res.body.success).toBe(false);
    expect(res.body.conflicts).toHaveLength(2);
    expect(res.body.conflicts[0].path).toBe('file.txt');
    expect(res.body.conflicts[0].status).toBe('both-modified');
  });

  it('rejects invalid channel', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/sync/pull')
      .send({ channel: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /resolve — resolve conflicts
// ---------------------------------------------------------------------------

describe('POST /api/sync/resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves with keep-mine (--ours)', async () => {
    const app = buildApp();

    mockExecFile.mockImplementation((...args: unknown[]) => {
      const cmdArgs = args[1] as string[];
      if (cmdArgs[0] === 'checkout') return { stdout: '', stderr: '' };
      if (cmdArgs[0] === 'add') return { stdout: '', stderr: '' };
      if (cmdArgs[0] === 'diff') return { stdout: 'other.json\n', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    const res = await request(app)
      .post('/api/sync/resolve')
      .send({ channel: 'video-project', file: 'file.txt', resolution: 'keep-mine' });

    expect(res.body.success).toBe(true);
    expect(res.body.remainingConflicts).toBe(1);

    // Verify --ours was used
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['checkout', '--ours', '--', 'file.txt'],
      expect.any(Object)
    );
  });

  it('resolves with keep-theirs (--theirs)', async () => {
    const app = buildApp();

    mockExecFile.mockImplementation((...args: unknown[]) => {
      const cmdArgs = args[1] as string[];
      if (cmdArgs[0] === 'checkout') return { stdout: '', stderr: '' };
      if (cmdArgs[0] === 'add') return { stdout: '', stderr: '' };
      if (cmdArgs[0] === 'diff') return { stdout: 'other.json\n', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    const res = await request(app)
      .post('/api/sync/resolve')
      .send({ channel: 'video-project', file: 'file.txt', resolution: 'keep-theirs' });

    expect(res.body.success).toBe(true);
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['checkout', '--theirs', '--', 'file.txt'],
      expect.any(Object)
    );
  });

  it('blocks path traversal with ..', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/sync/resolve')
      .send({ channel: 'video-project', file: '../../../etc/passwd', resolution: 'keep-mine' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid file path');
  });

  it('blocks absolute paths', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/sync/resolve')
      .send({ channel: 'video-project', file: '/etc/passwd', resolution: 'keep-mine' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid file path');
  });

  it('continues rebase when all conflicts resolved', async () => {
    const app = buildApp();

    mockExecFile.mockImplementation((...args: unknown[]) => {
      const cmdArgs = args[1] as string[];
      if (cmdArgs[0] === 'checkout') return { stdout: '', stderr: '' };
      if (cmdArgs[0] === 'add') return { stdout: '', stderr: '' };
      if (cmdArgs[0] === 'diff') return { stdout: '', stderr: '' };
      if (cmdArgs[0] === 'rebase') return { stdout: 'Applying: some commit\n', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    const res = await request(app)
      .post('/api/sync/resolve')
      .send({ channel: 'video-project', file: 'last-file.txt', resolution: 'keep-mine' });

    expect(res.body.success).toBe(true);
    expect(res.body.remainingConflicts).toBe(0);

    // Verify rebase --continue was called
    expect(mockExecFile).toHaveBeenCalledWith(
      'git', ['rebase', '--continue'],
      expect.objectContaining({ env: expect.objectContaining({ GIT_EDITOR: 'true' }) })
    );
  });
});
