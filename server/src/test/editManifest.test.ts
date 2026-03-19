import { vi, describe, it, expect, beforeEach } from 'vitest'
import crypto from 'crypto'

// Mock fs-extra (all server I/O uses fs-extra)
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    remove: vi.fn(),
    copy: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
    ensureDir: vi.fn(),
    // fs.promises.open is used by calculateFileHash via the fs-extra default import
    promises: {
      open: vi.fn(),
    },
  },
}))

import fsExtra from 'fs-extra'
import type { EditFolderManifest } from '../../../shared/types.js'
import {
  getManifestStatus,
  cleanEditFolder,
  restoreEditFolder,
  createManifest,
  calculateFileHash,
} from '../utils/editManifest.js'

// Type helper so we can call .mockResolvedValue etc without casting everywhere
const fsMock = fsExtra as unknown as {
  pathExists: ReturnType<typeof vi.fn>
  readFile: ReturnType<typeof vi.fn>
  writeFile: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  copy: ReturnType<typeof vi.fn>
  stat: ReturnType<typeof vi.fn>
  readdir: ReturnType<typeof vi.fn>
  ensureDir: ReturnType<typeof vi.fn>
  promises: {
    open: ReturnType<typeof vi.fn>
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a fake FileHandle that returns a known buffer when read.
 * calculateFileHash calls: fileHandle.read(buffer, 0, CHUNK_SIZE, 0)
 *                     then: fileHandle.close()
 */
function makeFileHandle(content: Buffer | string): object {
  const buf = typeof content === 'string' ? Buffer.from(content) : content
  return {
    read: vi.fn().mockImplementation(
      (outBuffer: Buffer, offset: number, _length: number, _position: number) => {
        buf.copy(outBuffer, offset)
        return Promise.resolve({ bytesRead: buf.length })
      }
    ),
    close: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Compute the expected SHA-256 hash the same way calculateFileHash does.
 */
function expectedHash(content: Buffer | string): string {
  const buf = typeof content === 'string' ? Buffer.from(content) : content
  return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex')
}

function makeManifest(files: { filename: string; sourceHash: string; sourceSize?: number }[]): EditFolderManifest {
  return {
    lastCopied: new Date().toISOString(),
    files: files.map(f => ({
      filename: f.filename,
      sourceHash: f.sourceHash,
      copiedAt: new Date().toISOString(),
      sourceSize: f.sourceSize ?? 1024,
    })),
  }
}

beforeEach(() => vi.clearAllMocks())

// ─── calculateFileHash ────────────────────────────────────────────────────────
// Tested separately so we know the helper works before using it in higher-level tests.

describe('calculateFileHash', () => {
  it('returns a sha256: prefixed hex string', async () => {
    const content = Buffer.from('hello world')
    fsMock.promises.open.mockResolvedValue(makeFileHandle(content))

    const hash = await calculateFileHash('/some/file.mov')

    expect(hash).toBe(expectedHash(content))
    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/)
  })

  it('produces different hashes for different content', async () => {
    const handleA = makeFileHandle(Buffer.from('content A'))
    const handleB = makeFileHandle(Buffer.from('content B'))

    fsMock.promises.open
      .mockResolvedValueOnce(handleA)
      .mockResolvedValueOnce(handleB)

    const hashA = await calculateFileHash('/a.mov')
    const hashB = await calculateFileHash('/b.mov')

    expect(hashA).not.toBe(hashB)
  })
})

// ─── getManifestStatus ────────────────────────────────────────────────────────

describe('getManifestStatus', () => {
  it("returns 'no-manifest' when manifest is undefined", async () => {
    const result = await getManifestStatus(undefined, '/edit', '/recordings')
    expect(result.status).toBe('no-manifest')
    expect(result.manifestedFiles).toBe(0)
  })

  it("returns 'no-manifest' when manifest has no files", async () => {
    const empty: EditFolderManifest = { lastCopied: null, files: [] }
    const result = await getManifestStatus(empty, '/edit', '/recordings')
    expect(result.status).toBe('no-manifest')
  })

  it("returns 'missing' when a manifested file does not exist in recordings", async () => {
    const content = Buffer.from('original content')
    const hash = expectedHash(content)
    const manifest = makeManifest([{ filename: '01-1-intro.mov', sourceHash: hash }])

    // Source file does not exist
    fsMock.pathExists.mockResolvedValue(false)

    const result = await getManifestStatus(manifest, '/edit', '/recordings')
    expect(result.status).toBe('missing')
    expect(result.missingFiles).toBe(1)
    expect(result.presentFiles).toBe(0)
  })

  it("returns 'changed' when a file's hash differs from the manifest", async () => {
    const originalContent = Buffer.from('original')
    const modifiedContent = Buffer.from('modified — different content')
    const originalHash = expectedHash(originalContent)

    const manifest = makeManifest([{ filename: '01-1-intro.mov', sourceHash: originalHash }])

    // File exists in recordings
    fsMock.pathExists.mockResolvedValue(true)
    // calculateFileHash reads the current file — returns modified content
    fsMock.promises.open.mockResolvedValue(makeFileHandle(modifiedContent))
    fsMock.stat.mockResolvedValue({ size: modifiedContent.length })

    const result = await getManifestStatus(manifest, '/edit', '/recordings')
    expect(result.status).toBe('changed')
    expect(result.changedFiles).toBe(1)
  })

  it("returns 'present' when all files exist and hashes match and files are in edit folder", async () => {
    const content = Buffer.from('same content')
    const hash = expectedHash(content)
    const manifest = makeManifest([{ filename: '01-1-intro.mov', sourceHash: hash }])

    // Source exists in recordings
    fsMock.pathExists
      .mockResolvedValueOnce(true)  // recordings check
      .mockResolvedValueOnce(true)  // edit folder check
    fsMock.promises.open.mockResolvedValue(makeFileHandle(content))
    fsMock.stat.mockResolvedValue({ size: content.length })

    const result = await getManifestStatus(manifest, '/edit', '/recordings')
    expect(result.status).toBe('present')
    expect(result.presentFiles).toBe(1)
    expect(result.changedFiles).toBe(0)
    expect(result.missingFiles).toBe(0)
  })

  it("returns 'cleaned' when all hashes match but no files are in edit folder", async () => {
    const content = Buffer.from('same content')
    const hash = expectedHash(content)
    const manifest = makeManifest([{ filename: '01-1-intro.mov', sourceHash: hash }])

    // Source exists in recordings
    fsMock.pathExists
      .mockResolvedValueOnce(true)   // recordings check
      .mockResolvedValueOnce(false)  // edit folder check — file already cleaned
    fsMock.promises.open.mockResolvedValue(makeFileHandle(content))
    fsMock.stat.mockResolvedValue({ size: content.length })

    const result = await getManifestStatus(manifest, '/edit', '/recordings')
    expect(result.status).toBe('cleaned')
  })

  it('reports correct counts for multiple files, some missing', async () => {
    const content = Buffer.from('good file')
    const hash = expectedHash(content)

    const manifest = makeManifest([
      { filename: '01-1-intro.mov', sourceHash: hash },
      { filename: '01-2-body.mov', sourceHash: 'sha256:nonexistent' },
    ])

    fsMock.pathExists
      .mockResolvedValueOnce(true)   // first file exists in recordings
      .mockResolvedValueOnce(false)  // second file missing in recordings
      .mockResolvedValueOnce(true)   // first file in edit folder
    fsMock.promises.open.mockResolvedValue(makeFileHandle(content))
    fsMock.stat.mockResolvedValue({ size: content.length })

    const result = await getManifestStatus(manifest, '/edit', '/recordings')
    expect(result.manifestedFiles).toBe(2)
    expect(result.missingFiles).toBe(1)
    // One file was missing so overall status should be 'missing'
    expect(result.status).toBe('missing')
  })
})

// ─── cleanEditFolder ──────────────────────────────────────────────────────────

describe('cleanEditFolder', () => {
  it('deletes files that are in the manifest', async () => {
    const manifest = makeManifest([{ filename: '01-1-intro.mov', sourceHash: 'sha256:abc' }])

    fsMock.readdir.mockResolvedValue(['01-1-intro.mov'])
    fsMock.stat.mockResolvedValue({ size: 2048, isDirectory: () => false })
    fsMock.remove.mockResolvedValue(undefined)

    const result = await cleanEditFolder(manifest, '/edit')

    expect(fsMock.remove).toHaveBeenCalledWith('/edit/01-1-intro.mov')
    expect(result.deleted).toEqual(['01-1-intro.mov'])
    expect(result.spaceSaved).toBe(2048)
  })

  // SAFETY-CRITICAL: Non-manifested files (e.g. Gling outputs) must NEVER be deleted
  it('does NOT delete files that are NOT in the manifest', async () => {
    const manifest = makeManifest([{ filename: '01-1-intro.mov', sourceHash: 'sha256:abc' }])

    fsMock.readdir.mockResolvedValue([
      '01-1-intro.mov',     // in manifest — should be deleted
      'gling-output.mov',   // NOT in manifest — must be preserved
      'project.glingproj',  // NOT in manifest — must be preserved
    ])
    fsMock.stat
      .mockResolvedValueOnce({ size: 2048, isDirectory: () => false })   // intro.mov
      .mockResolvedValueOnce({ size: 512,  isDirectory: () => false })   // gling-output.mov
      .mockResolvedValueOnce({ size: 256,  isDirectory: () => false })   // project.glingproj
    fsMock.remove.mockResolvedValue(undefined)

    const result = await cleanEditFolder(manifest, '/edit')

    // Only the manifested file is deleted
    expect(fsMock.remove).toHaveBeenCalledTimes(1)
    expect(fsMock.remove).toHaveBeenCalledWith('/edit/01-1-intro.mov')

    // Non-manifested files appear in preserved list
    expect(result.preserved).toContain('gling-output.mov')
    expect(result.preserved).toContain('project.glingproj')

    // Deleted list contains only the manifested file
    expect(result.deleted).toEqual(['01-1-intro.mov'])
  })

  it('skips directories even if they share a name with a manifested file', async () => {
    const manifest = makeManifest([{ filename: 'subfolder', sourceHash: 'sha256:abc' }])

    fsMock.readdir.mockResolvedValue(['subfolder'])
    fsMock.stat.mockResolvedValue({ size: 0, isDirectory: () => true })
    fsMock.remove.mockResolvedValue(undefined)

    const result = await cleanEditFolder(manifest, '/edit')

    expect(fsMock.remove).not.toHaveBeenCalled()
    expect(result.deleted).toHaveLength(0)
  })

  it('returns empty deleted list when edit folder is empty', async () => {
    const manifest = makeManifest([{ filename: '01-1-intro.mov', sourceHash: 'sha256:abc' }])

    fsMock.readdir.mockResolvedValue([])

    const result = await cleanEditFolder(manifest, '/edit')

    expect(result.deleted).toHaveLength(0)
    expect(result.spaceSaved).toBe(0)
    expect(result.preserved).toHaveLength(0)
  })

  it('accumulates spaceSaved across multiple deleted files', async () => {
    const manifest = makeManifest([
      { filename: '01-1-intro.mov', sourceHash: 'sha256:aaa' },
      { filename: '01-2-body.mov', sourceHash: 'sha256:bbb' },
    ])

    fsMock.readdir.mockResolvedValue(['01-1-intro.mov', '01-2-body.mov'])
    fsMock.stat
      .mockResolvedValueOnce({ size: 1000, isDirectory: () => false })
      .mockResolvedValueOnce({ size: 2000, isDirectory: () => false })
    fsMock.remove.mockResolvedValue(undefined)

    const result = await cleanEditFolder(manifest, '/edit')

    expect(result.deleted).toHaveLength(2)
    expect(result.spaceSaved).toBe(3000)
  })
})

// ─── restoreEditFolder ────────────────────────────────────────────────────────

describe('restoreEditFolder', () => {
  it('copies manifested files from recordings to edit folder', async () => {
    const content = Buffer.from('video content')
    const hash = expectedHash(content)
    const manifest = makeManifest([{ filename: '01-1-intro.mov', sourceHash: hash }])

    fsMock.ensureDir.mockResolvedValue(undefined)
    fsMock.pathExists.mockResolvedValue(true)
    fsMock.promises.open.mockResolvedValue(makeFileHandle(content))
    fsMock.copy.mockResolvedValue(undefined)

    const result = await restoreEditFolder(manifest, '/edit', '/recordings')

    expect(fsMock.copy).toHaveBeenCalledWith(
      '/recordings/01-1-intro.mov',
      '/edit/01-1-intro.mov',
      { overwrite: true }
    )
    expect(result.restored).toEqual(['01-1-intro.mov'])
    expect(result.warnings).toHaveLength(0)
  })

  it('adds a warning when the source file is missing and skips copy', async () => {
    const manifest = makeManifest([{ filename: '01-1-intro.mov', sourceHash: 'sha256:abc' }])

    fsMock.ensureDir.mockResolvedValue(undefined)
    fsMock.pathExists.mockResolvedValue(false)  // source missing

    const result = await restoreEditFolder(manifest, '/edit', '/recordings')

    expect(fsMock.copy).not.toHaveBeenCalled()
    expect(result.restored).toHaveLength(0)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('01-1-intro.mov')
  })

  it('adds a warning when the source file hash has changed but still copies it', async () => {
    const originalContent = Buffer.from('original')
    const modifiedContent = Buffer.from('modified — hash will not match')
    const originalHash = expectedHash(originalContent)

    const manifest = makeManifest([{ filename: '01-1-intro.mov', sourceHash: originalHash }])

    fsMock.ensureDir.mockResolvedValue(undefined)
    fsMock.pathExists.mockResolvedValue(true)
    // calculateFileHash reads modified content — hash mismatch
    fsMock.promises.open.mockResolvedValue(makeFileHandle(modifiedContent))
    fsMock.copy.mockResolvedValue(undefined)

    const result = await restoreEditFolder(manifest, '/edit', '/recordings')

    // Still copied despite mismatch
    expect(fsMock.copy).toHaveBeenCalledOnce()
    expect(result.restored).toEqual(['01-1-intro.mov'])
    // Warning issued about the mismatch
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('hash mismatch')
  })

  it('restores multiple files and reports each one', async () => {
    const content = Buffer.from('data')
    const hash = expectedHash(content)
    const manifest = makeManifest([
      { filename: '01-1-intro.mov', sourceHash: hash },
      { filename: '01-2-body.mov', sourceHash: hash },
    ])

    fsMock.ensureDir.mockResolvedValue(undefined)
    fsMock.pathExists.mockResolvedValue(true)
    fsMock.promises.open
      .mockResolvedValueOnce(makeFileHandle(content))
      .mockResolvedValueOnce(makeFileHandle(content))
    fsMock.copy.mockResolvedValue(undefined)

    const result = await restoreEditFolder(manifest, '/edit', '/recordings')

    expect(result.restored).toHaveLength(2)
    expect(result.warnings).toHaveLength(0)
  })

  it('calls ensureDir to guarantee the edit folder exists', async () => {
    const manifest: EditFolderManifest = { lastCopied: null, files: [] }

    fsMock.ensureDir.mockResolvedValue(undefined)

    await restoreEditFolder(manifest, '/edit', '/recordings')

    expect(fsMock.ensureDir).toHaveBeenCalledWith('/edit')
  })
})

// ─── createManifest ───────────────────────────────────────────────────────────

describe('createManifest', () => {
  it('returns a manifest with one entry per file path', async () => {
    const content = Buffer.from('file content')

    fsMock.stat.mockResolvedValue({ size: content.length })
    fsMock.promises.open.mockResolvedValue(makeFileHandle(content))

    const manifest = await createManifest(['/recordings/01-1-intro.mov'], '/recordings')

    expect(manifest.files).toHaveLength(1)
  })

  it('each entry has filename (basename only), sourceHash, copiedAt, sourceSize', async () => {
    const content = Buffer.from('video bytes')
    const hash = expectedHash(content)

    fsMock.stat.mockResolvedValue({ size: content.length })
    fsMock.promises.open.mockResolvedValue(makeFileHandle(content))

    const manifest = await createManifest(['/recordings/01-1-intro.mov'], '/recordings')
    const entry = manifest.files[0]

    expect(entry.filename).toBe('01-1-intro.mov')
    expect(entry.sourceHash).toBe(hash)
    expect(entry.sourceSize).toBe(content.length)
    expect(typeof entry.copiedAt).toBe('string')
    // copiedAt is an ISO timestamp
    expect(() => new Date(entry.copiedAt)).not.toThrow()
  })

  it('returns an empty files array when given an empty list', async () => {
    const manifest = await createManifest([], '/recordings')
    expect(manifest.files).toHaveLength(0)
    expect(manifest.lastCopied).toBeTruthy()
  })

  it('creates entries for multiple files', async () => {
    const content = Buffer.from('data')

    fsMock.stat.mockResolvedValue({ size: content.length })
    fsMock.promises.open.mockResolvedValue(makeFileHandle(content))

    const manifest = await createManifest(
      ['/recordings/01-1-intro.mov', '/recordings/01-2-body.mov'],
      '/recordings'
    )

    expect(manifest.files).toHaveLength(2)
    expect(manifest.files.map(f => f.filename)).toEqual([
      '01-1-intro.mov',
      '01-2-body.mov',
    ])
  })

  it('sets lastCopied to a recent ISO timestamp', async () => {
    const before = Date.now()
    const manifest = await createManifest([], '/recordings')
    const after = Date.now()

    const ts = new Date(manifest.lastCopied!).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })
})
