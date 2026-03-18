import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock fs-extra (used by projectState.ts)
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}))

import fsExtra from 'fs-extra'
import type { ProjectState } from '../../../shared/types.js'
import {
  createEmptyState,
  readProjectState,
  writeProjectState,
  setRecordingSafe,
  setRecordingParked,
  isRecordingSafe,
  isRecordingParked,
  getSafeRecordings,
  getParkedRecordings,
  getRecordingState,
  mergeRecordingStates,
} from '../utils/projectState.js'

const fsMock = fsExtra as unknown as {
  pathExists: ReturnType<typeof vi.fn>
  readFile: ReturnType<typeof vi.fn>
  writeFile: ReturnType<typeof vi.fn>
}

beforeEach(() => vi.clearAllMocks())

// ─── createEmptyState ────────────────────────────────────────────────────────

describe('createEmptyState', () => {
  it('returns version 1 with empty recordings', () => {
    const state = createEmptyState()
    expect(state.version).toBe(1)
    expect(state.recordings).toEqual({})
  })
})

// ─── readProjectState ────────────────────────────────────────────────────────

describe('readProjectState', () => {
  it('returns empty state when state file does not exist', async () => {
    fsMock.pathExists.mockResolvedValue(false)
    const state = await readProjectState('/some/project')
    expect(state).toEqual({ version: 1, recordings: {} })
  })

  it('returns parsed state when file exists and is valid', async () => {
    const stored: ProjectState = {
      version: 1,
      recordings: { '01-1-intro.mov': { safe: true } },
    }
    fsMock.pathExists.mockResolvedValue(true)
    fsMock.readFile.mockResolvedValue(JSON.stringify(stored))
    const state = await readProjectState('/some/project')
    expect(state.recordings['01-1-intro.mov'].safe).toBe(true)
  })

  it('returns empty state when JSON is corrupt', async () => {
    fsMock.pathExists.mockResolvedValue(true)
    fsMock.readFile.mockResolvedValue('{ not valid json }}}')
    const state = await readProjectState('/some/project')
    expect(state).toEqual({ version: 1, recordings: {} })
  })

  it('returns empty state when version is not 1', async () => {
    fsMock.pathExists.mockResolvedValue(true)
    fsMock.readFile.mockResolvedValue(JSON.stringify({ version: 99, recordings: {} }))
    const state = await readProjectState('/some/project')
    expect(state).toEqual({ version: 1, recordings: {} })
  })

  it('returns empty state when recordings field is missing', async () => {
    fsMock.pathExists.mockResolvedValue(true)
    fsMock.readFile.mockResolvedValue(JSON.stringify({ version: 1 }))
    const state = await readProjectState('/some/project')
    expect(state).toEqual({ version: 1, recordings: {} })
  })
})

// ─── writeProjectState ───────────────────────────────────────────────────────

describe('writeProjectState', () => {
  it('writes serialised JSON to the state file path', async () => {
    fsMock.writeFile.mockResolvedValue(undefined)
    const state: ProjectState = {
      version: 1,
      recordings: { '02-3-outro.mov': { safe: false } },
    }
    await writeProjectState('/some/project', state)
    expect(fsMock.writeFile).toHaveBeenCalledOnce()
    const [writtenPath, writtenContent] = fsMock.writeFile.mock.calls[0]
    expect(writtenPath).toContain('.flihub-state.json')
    const parsed = JSON.parse(writtenContent as string)
    expect(parsed.version).toBe(1)
    expect(parsed.recordings).toEqual(state.recordings)
  })

  it('preserves glingDictionary when non-empty', async () => {
    fsMock.writeFile.mockResolvedValue(undefined)
    const state: ProjectState = {
      version: 1,
      recordings: {},
      glingDictionary: ['hello', 'world'],
    }
    await writeProjectState('/some/project', state)
    const writtenContent = fsMock.writeFile.mock.calls[0][1] as string
    const parsed = JSON.parse(writtenContent)
    expect(parsed.glingDictionary).toEqual(['hello', 'world'])
  })

  it('omits glingDictionary when empty array', async () => {
    fsMock.writeFile.mockResolvedValue(undefined)
    const state: ProjectState = {
      version: 1,
      recordings: {},
      glingDictionary: [],
    }
    await writeProjectState('/some/project', state)
    const writtenContent = fsMock.writeFile.mock.calls[0][1] as string
    const parsed = JSON.parse(writtenContent)
    expect(parsed.glingDictionary).toBeUndefined()
  })
})

// ─── setRecordingSafe ────────────────────────────────────────────────────────

describe('setRecordingSafe', () => {
  it('sets safe to true on a new entry', () => {
    const state = createEmptyState()
    const next = setRecordingSafe(state, '01-1-intro.mov', true)
    expect(next.recordings['01-1-intro.mov'].safe).toBe(true)
  })

  it('sets safe to false on an existing entry that has no other flags — prunes the entry', () => {
    const state: ProjectState = {
      version: 1,
      recordings: { '01-1-intro.mov': { safe: true } },
    }
    const next = setRecordingSafe(state, '01-1-intro.mov', false)
    // Entry pruned: all flags are default/false and no annotation or stage
    expect(next.recordings['01-1-intro.mov']).toBeUndefined()
  })

  it('does NOT prune when other flags are still set (parked remains)', () => {
    const state: ProjectState = {
      version: 1,
      recordings: { '01-1-intro.mov': { safe: true, parked: true } },
    }
    const next = setRecordingSafe(state, '01-1-intro.mov', false)
    // parked is still true so the entry must survive
    expect(next.recordings['01-1-intro.mov']).toBeDefined()
    expect(next.recordings['01-1-intro.mov'].safe).toBe(false)
    expect(next.recordings['01-1-intro.mov'].parked).toBe(true)
  })

  it('does NOT prune when annotation is set', () => {
    const state: ProjectState = {
      version: 1,
      recordings: { '01-1-intro.mov': { safe: true, annotation: 'keep for reference' } },
    }
    const next = setRecordingSafe(state, '01-1-intro.mov', false)
    expect(next.recordings['01-1-intro.mov']).toBeDefined()
    expect(next.recordings['01-1-intro.mov'].annotation).toBe('keep for reference')
  })

  it('does NOT prune when stage is set', () => {
    const state: ProjectState = {
      version: 1,
      recordings: { '01-1-intro.mov': { safe: true, stage: 'review' } },
    }
    const next = setRecordingSafe(state, '01-1-intro.mov', false)
    expect(next.recordings['01-1-intro.mov']).toBeDefined()
    expect(next.recordings['01-1-intro.mov'].stage).toBe('review')
  })

  it('does not mutate the original state', () => {
    const state = createEmptyState()
    setRecordingSafe(state, '01-1-intro.mov', true)
    expect(state.recordings['01-1-intro.mov']).toBeUndefined()
  })

  it('preserves other recordings when modifying one', () => {
    const state: ProjectState = {
      version: 1,
      recordings: {
        '01-1-intro.mov': { safe: false },
        '02-1-outro.mov': { safe: true },
      },
    }
    const next = setRecordingSafe(state, '01-1-intro.mov', true)
    expect(next.recordings['02-1-outro.mov'].safe).toBe(true)
  })
})

// ─── setRecordingParked ──────────────────────────────────────────────────────

describe('setRecordingParked', () => {
  it('sets parked to true on a new entry', () => {
    const state = createEmptyState()
    const next = setRecordingParked(state, '03-2-segment.mov', true)
    expect(next.recordings['03-2-segment.mov'].parked).toBe(true)
  })

  it('sets parked to false on an entry with no other flags — prunes the entry', () => {
    const state: ProjectState = {
      version: 1,
      recordings: { '03-2-segment.mov': { parked: true } },
    }
    const next = setRecordingParked(state, '03-2-segment.mov', false)
    expect(next.recordings['03-2-segment.mov']).toBeUndefined()
  })

  it('does NOT prune when safe is still true', () => {
    const state: ProjectState = {
      version: 1,
      recordings: { '03-2-segment.mov': { parked: true, safe: true } },
    }
    const next = setRecordingParked(state, '03-2-segment.mov', false)
    expect(next.recordings['03-2-segment.mov']).toBeDefined()
    expect(next.recordings['03-2-segment.mov'].safe).toBe(true)
  })

  it('does NOT prune when annotation is set', () => {
    const state: ProjectState = {
      version: 1,
      recordings: { '03-2-segment.mov': { parked: true, annotation: 'too technical' } },
    }
    const next = setRecordingParked(state, '03-2-segment.mov', false)
    expect(next.recordings['03-2-segment.mov']).toBeDefined()
    expect(next.recordings['03-2-segment.mov'].annotation).toBe('too technical')
  })

  it('does not mutate the original state', () => {
    const state = createEmptyState()
    setRecordingParked(state, '03-2-segment.mov', true)
    expect(state.recordings['03-2-segment.mov']).toBeUndefined()
  })

  it('preserves other recordings when modifying one', () => {
    const state: ProjectState = {
      version: 1,
      recordings: {
        '03-2-segment.mov': { parked: true },
        '04-1-cta.mov': { safe: true },
      },
    }
    const next = setRecordingParked(state, '03-2-segment.mov', false)
    expect(next.recordings['04-1-cta.mov'].safe).toBe(true)
  })
})

// ─── isRecordingSafe / isRecordingParked ──────────────────────────────────────

describe('isRecordingSafe', () => {
  it('returns true when safe is true', () => {
    const state: ProjectState = { version: 1, recordings: { 'a.mov': { safe: true } } }
    expect(isRecordingSafe(state, 'a.mov')).toBe(true)
  })

  it('returns false when safe is false', () => {
    const state: ProjectState = { version: 1, recordings: { 'a.mov': { safe: false } } }
    expect(isRecordingSafe(state, 'a.mov')).toBe(false)
  })

  it('returns false when recording is not in state', () => {
    const state = createEmptyState()
    expect(isRecordingSafe(state, 'missing.mov')).toBe(false)
  })
})

describe('isRecordingParked', () => {
  it('returns true when parked is true', () => {
    const state: ProjectState = { version: 1, recordings: { 'a.mov': { parked: true } } }
    expect(isRecordingParked(state, 'a.mov')).toBe(true)
  })

  it('returns false when parked is false', () => {
    const state: ProjectState = { version: 1, recordings: { 'a.mov': { parked: false } } }
    expect(isRecordingParked(state, 'a.mov')).toBe(false)
  })

  it('returns false when recording is not in state', () => {
    const state = createEmptyState()
    expect(isRecordingParked(state, 'missing.mov')).toBe(false)
  })
})

// ─── getSafeRecordings / getParkedRecordings ──────────────────────────────────

describe('getSafeRecordings', () => {
  it('returns only filenames where safe is true', () => {
    const state: ProjectState = {
      version: 1,
      recordings: {
        'a.mov': { safe: true },
        'b.mov': { safe: false },
        'c.mov': { parked: true },
      },
    }
    expect(getSafeRecordings(state)).toEqual(['a.mov'])
  })

  it('returns empty array when no recordings are safe', () => {
    expect(getSafeRecordings(createEmptyState())).toEqual([])
  })
})

describe('getParkedRecordings', () => {
  it('returns only filenames where parked is true', () => {
    const state: ProjectState = {
      version: 1,
      recordings: {
        'a.mov': { safe: true },
        'b.mov': { parked: true },
        'c.mov': { parked: false },
      },
    }
    expect(getParkedRecordings(state)).toEqual(['b.mov'])
  })

  it('returns empty array when no recordings are parked', () => {
    expect(getParkedRecordings(createEmptyState())).toEqual([])
  })
})

// ─── getRecordingState ────────────────────────────────────────────────────────

describe('getRecordingState', () => {
  it('returns the recording entry when it exists', () => {
    const state: ProjectState = {
      version: 1,
      recordings: { 'a.mov': { safe: true, parked: false } },
    }
    expect(getRecordingState(state, 'a.mov')).toEqual({ safe: true, parked: false })
  })

  it('returns empty object when recording is not in state', () => {
    expect(getRecordingState(createEmptyState(), 'missing.mov')).toEqual({})
  })
})

// ─── mergeRecordingStates ─────────────────────────────────────────────────────

describe('mergeRecordingStates', () => {
  it('adds new recording entries from updates', () => {
    const state = createEmptyState()
    const next = mergeRecordingStates(state, { 'new.mov': { safe: true } })
    expect(next.recordings['new.mov'].safe).toBe(true)
  })

  it('merges update fields onto existing entry, preserving untouched fields', () => {
    const state: ProjectState = {
      version: 1,
      recordings: { 'a.mov': { safe: true, annotation: 'original note' } },
    }
    const next = mergeRecordingStates(state, { 'a.mov': { parked: true } })
    // Existing field preserved
    expect(next.recordings['a.mov'].annotation).toBe('original note')
    // New field applied
    expect(next.recordings['a.mov'].parked).toBe(true)
    // Untouched field preserved
    expect(next.recordings['a.mov'].safe).toBe(true)
  })

  it('overwrites an existing field when the same key is in the update', () => {
    const state: ProjectState = {
      version: 1,
      recordings: { 'a.mov': { safe: true } },
    }
    const next = mergeRecordingStates(state, { 'a.mov': { safe: false } })
    expect(next.recordings['a.mov'].safe).toBe(false)
  })

  it('preserves recordings not mentioned in updates', () => {
    const state: ProjectState = {
      version: 1,
      recordings: {
        'a.mov': { safe: true },
        'b.mov': { parked: true },
      },
    }
    const next = mergeRecordingStates(state, { 'a.mov': { annotation: 'hello' } })
    expect(next.recordings['b.mov'].parked).toBe(true)
  })

  it('does not mutate the original state', () => {
    const state = createEmptyState()
    mergeRecordingStates(state, { 'x.mov': { safe: true } })
    expect(state.recordings['x.mov']).toBeUndefined()
  })

  it('preserves top-level state fields (e.g. glingDictionary)', () => {
    const state: ProjectState = {
      version: 1,
      recordings: {},
      glingDictionary: ['word1'],
    }
    const next = mergeRecordingStates(state, { 'a.mov': { safe: true } })
    expect(next.glingDictionary).toEqual(['word1'])
  })
})
