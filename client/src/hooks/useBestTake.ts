import { useMemo } from 'react'
import type { FileInfo } from '../../../shared/types'
import { FILE_SIZE } from '../../../shared/constants'

interface BestTakeResult {
  bestTakePath: string | null
  goodTakePath: string | null
}

/**
 * FR-8: Baseline-aware algorithm for best/good take detection
 * Substantial files (>5MB) are real takes; smaller files are likely junk
 */
export function useBestTake(files: FileInfo[]): BestTakeResult {
  return useMemo(() => {
    if (files.length === 0) return { bestTakePath: null, goodTakePath: null }
    if (files.length === 1) return { bestTakePath: files[0].path, goodTakePath: null }

    // Sort files by timestamp (oldest first)
    const sortedByTime = [...files].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    // Separate substantial files from junk
    const substantialFiles = sortedByTime.filter(
      f => (f.size || 0) >= FILE_SIZE.SUBSTANTIAL_BYTES
    )
    const allJunk = substantialFiles.length === 0

    // Edge case: all files are junk - pick largest as "best"
    if (allJunk) {
      const largest = [...files].sort((a, b) => (b.size || 0) - (a.size || 0))[0]
      return { bestTakePath: largest.path, goodTakePath: null }
    }

    // Baseline = first substantial file (oldest)
    const baseline = substantialFiles[0]

    // If only one substantial file, it's the best
    if (substantialFiles.length === 1) {
      return { bestTakePath: baseline.path, goodTakePath: null }
    }

    // Multiple substantial files: later ones are likely better takes
    // Best = most recent substantial file, Good = baseline (first substantial)
    const bestTake = substantialFiles[substantialFiles.length - 1]

    return {
      bestTakePath: bestTake.path,
      goodTakePath: baseline.path,
    }
  }, [files])
}
