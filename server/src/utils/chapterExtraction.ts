/**
 * FR-34: Chapter Timestamp Extraction
 *
 * Extracts YouTube chapter timestamps by matching chapter names from recordings
 * to the final SRT file.
 *
 * Algorithm (Option A - Algorithmic):
 * 1. Parse SRT into timestamped segments
 * 2. Get chapter list from recording-transcripts folder
 * 3. Extract first N words from each chapter's transcript
 * 4. Search SRT for matching text, return timestamp + confidence
 * 5. Format for YouTube (MM:SS Title)
 */

import path from 'path'
import fs from 'fs-extra'
import { glob } from 'glob'
import { getProjectPaths } from '../../../shared/paths.js'
import { statSafe, readFileSafe } from './filesystem.js'
import type { ChapterMatch, ChaptersResponse, ChapterMatchStatus, ChapterMatchCandidate } from '../../../shared/types.js'
// Phase 3: Text similarity algorithms for better matching
// Using Trigram, SorensenDice (Dice coefficient), and Jaro for combined scoring
import StringComparisons from 'string-comparisons'
const { Trigram, SorensenDice, Jaro } = StringComparisons

// SRT segment after parsing
interface SrtSegment {
  index: number
  startSeconds: number
  endSeconds: number
  startTimestamp: string  // Original format "00:00:02,500"
  text: string
}

// Chapter info from transcripts folder
interface ChapterInfo {
  chapter: number
  sequence: number       // Add sequence to distinguish multiple files per chapter
  name: string
  transcriptPath: string
  fileIndex: number      // Order within same chapter (0, 1, 2...)
}

/**
 * Parse SRT timestamp to seconds
 * Format: "00:02:34,500" -> 154.5
 */
function parseSrtTimestamp(timestamp: string): number {
  const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/)
  if (!match) return 0

  const [, hours, minutes, seconds, millis] = match
  return (
    parseInt(hours, 10) * 3600 +
    parseInt(minutes, 10) * 60 +
    parseInt(seconds, 10) +
    parseInt(millis, 10) / 1000
  )
}

/**
 * Format seconds to YouTube chapter format
 * Under 1 hour: MM:SS
 * Over 1 hour: H:MM:SS
 */
function formatYouTubeTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Parse SRT file into segments
 */
async function parseSrt(srtPath: string): Promise<SrtSegment[]> {
  const content = await fs.readFile(srtPath, 'utf-8')
  const segments: SrtSegment[] = []

  // Split by double newlines (segment separator)
  const blocks = content.split(/\n\n+/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    // Line 1: Index
    const index = parseInt(lines[0], 10)
    if (isNaN(index)) continue

    // Line 2: Timestamps (00:00:02,500 --> 00:00:05,200)
    const timestampMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/)
    if (!timestampMatch) continue

    const [, startTs, endTs] = timestampMatch

    // Lines 3+: Text
    const text = lines.slice(2).join(' ').trim()

    segments.push({
      index,
      startSeconds: parseSrtTimestamp(startTs),
      endSeconds: parseSrtTimestamp(endTs),
      startTimestamp: startTs,
      text,
    })
  }

  return segments
}

/**
 * Get chapter info from recording-transcripts folder
 * Parses filenames like "01-1-intro.txt" to extract chapter and name
 * Skips empty transcript files to ensure we get usable content
 *
 * IMPORTANT: Groups by (chapter, name) and returns only the FIRST file for each group.
 * This means:
 * - Multiple takes of the same chapter (01-1-intro.txt, 01-2-intro.txt) → ONE entry
 * - Different chapters with same number (16-1-create-custom-agent.txt, 16-1-develop.1.3.txt) → TWO entries
 */
async function getChaptersFromTranscripts(transcriptsDir: string): Promise<ChapterInfo[]> {
  if (!await fs.pathExists(transcriptsDir)) {
    return []
  }

  const files = await fs.readdir(transcriptsDir)

  // Pattern: {chapter}-{sequence}-{name}.txt
  const pattern = /^(\d{2})-(\d+)-(.+)\.txt$/

  // Sort files to ensure consistent ordering (by chapter, then sequence, then name)
  const sortedFiles = files.sort()

  // Group by (chapter, name) - keep only FIRST file for each unique chapter+name combo
  const chapterNameMap = new Map<string, ChapterInfo>()

  for (const file of sortedFiles) {
    // Skip combined chapter files
    if (file.endsWith('-chapter.txt')) continue

    const match = file.match(pattern)
    if (!match) continue

    const [, chapterStr, sequenceStr, name] = match
    const chapter = parseInt(chapterStr, 10)
    const sequence = parseInt(sequenceStr, 10)

    const filePath = path.join(transcriptsDir, file)

    // Check if file has content (skip empty files)
    const stat = await statSafe(filePath)
    if (!stat || stat.size === 0) continue  // Skip missing or empty files

    // Key is chapter + name (e.g., "16:create-custom-agent")
    const key = `${chapter}:${name}`

    // Only keep first file for each chapter+name combo
    if (!chapterNameMap.has(key)) {
      chapterNameMap.set(key, {
        chapter,
        sequence,
        name,
        transcriptPath: filePath,
        fileIndex: 0,
      })
    }
  }

  // Convert to array and sort by chapter number, then by name
  return Array.from(chapterNameMap.values()).sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter
    return a.name.localeCompare(b.name)
  })
}

/**
 * Convert kebab-case name to display name
 * "setup-bmad" -> "Setting up BMAD"
 * "intro" -> "Intro"
 */
function toDisplayName(name: string): string {
  // Split by hyphens
  const words = name.split('-')

  // Capitalize each word
  const capitalized = words.map((word, index) => {
    // Check if word is an acronym (all uppercase or known acronyms)
    if (word.toUpperCase() === word && word.length <= 5) {
      return word.toUpperCase()
    }
    if (['bmad', 'sdk', 'api', 'ai', 'prd', 'pm', 'ui', 'ux'].includes(word.toLowerCase())) {
      return word.toUpperCase()
    }
    // Regular word - capitalize first letter
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  })

  return capitalized.join(' ')
}

/**
 * Normalize text for comparison
 * - Lowercase
 * - Remove punctuation
 * - Collapse whitespace
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')  // Remove punctuation
    .replace(/\s+/g, ' ')     // Collapse whitespace
    .trim()
}

/**
 * Extract first N words from text
 */
function getFirstWords(text: string, n: number): string {
  const normalized = normalizeText(text)
  const words = normalized.split(' ')
  return words.slice(0, n).join(' ')
}

// Phase 3: Similarity score threshold for rejecting poor matches
const SIMILARITY_THRESHOLD = 0.6  // Reject matches below this score

/**
 * Calculate combined similarity score using Trigram, SorensenDice, and Jaro
 * Returns a score between 0 and 1
 */
function calculateSimilarity(text1: string, text2: string): {
  combined: number
  trigram: number
  jaro: number
  dice: number
} {
  // Handle edge cases
  if (!text1 || !text2) return { combined: 0, trigram: 0, jaro: 0, dice: 0 }
  if (text1 === text2) return { combined: 1, trigram: 1, jaro: 1, dice: 1 }

  // Calculate individual scores (all return 0-1)
  const trigram = Trigram.similarity(text1, text2)
  const dice = SorensenDice.similarity(text1, text2)
  const jaro = Jaro.similarity(text1, text2)

  // Combined score: weighted average (Trigram is most reliable for text)
  const combined = (trigram * 0.4) + (jaro * 0.3) + (dice * 0.3)

  return { combined, trigram, jaro, dice }
}

// Match result with detailed info for confidence calculation
interface MatchResult {
  segmentIndex: number
  matchType: 'exact_phrase' | 'partial_words' | 'similarity'  // Added 'similarity' type
  wordCount: number        // Number of words in matched phrase
  wordsSkipped: number     // How many opening words were skipped
  similarityScore?: number // Phase 3: similarity score (0-1)
  similarityMethod?: string // Phase 3: which algorithms contributed most
}

/**
 * Generate human-readable match reason for UI display
 */
function generateMatchReason(match: MatchResult): string {
  if (match.matchType === 'exact_phrase') {
    const skipText = match.wordsSkipped > 0 ? ` (skipped ${match.wordsSkipped} opening words)` : ''
    return `Matched ${match.wordCount}-word phrase${skipText}`
  } else if (match.matchType === 'similarity') {
    const score = match.similarityScore ? Math.round(match.similarityScore * 100) : 0
    const method = match.similarityMethod || 'combined'
    return `Similarity match: ${score}% (${method})`
  } else {
    return `Partial match: ${match.wordCount} words found`
  }
}

/**
 * Calculate confidence score based on match quality
 *
 * Scoring philosophy:
 * - 100%: Certain - long exact phrase match
 * - 90%:  Very confident - good phrase match or high similarity
 * - 80%:  Confident - some minor concerns
 * - 70%:  Review recommended - notable concerns
 * - <60%: Likely needs correction - partial match or multiple issues
 *
 * Penalties:
 * - Partial word match (not phrase): Base 50 instead of 100
 * - Short phrase (< 7 words): -10
 * - Skipped opening words: -5 per word (max -15)
 *
 * Phase 3: Similarity-based scoring
 * - Similarity score maps directly: 0.9 → 90%, 0.7 → 70%
 * - High similarity (>0.85) can reach 90%+
 *
 * Out-of-order penalty (-20) applied in extractChapters
 */
function calculateConfidence(match: MatchResult): number {
  // Phase 3: Similarity-based matching
  if (match.matchType === 'similarity' && match.similarityScore !== undefined) {
    // Map similarity score (0-1) to confidence (0-100)
    // Score of 0.9 → 90%, 0.7 → 70%, etc.
    return Math.round(match.similarityScore * 100)
  }

  // Partial word matching starts much lower - it's fundamentally uncertain
  if (match.matchType === 'partial_words') {
    return 50  // Base 50 for partial matches
  }

  // Exact phrase match starts at 100
  let confidence = 100

  // Short phrases are less reliable
  if (match.wordCount < 5) {
    confidence -= 15  // Very short phrase
  } else if (match.wordCount < 7) {
    confidence -= 10  // Short phrase
  }

  // Penalty for skipping opening words (content may have been trimmed)
  if (match.wordsSkipped > 0) {
    confidence -= Math.min(match.wordsSkipped * 5, 15)
  }

  return confidence
}

/**
 * Find best match for chapter text in SRT segments
 * Returns the segment index, confidence score, and match details
 *
 * Note: Searches entire SRT (no startFromIndex) because video editing
 * can reorder chapters - chapter 14's content might appear before chapter 13
 * in the final video.
 *
 * @param excludeSegments - Set of segment indices to exclude (for resolving duplicates)
 * @param skipFirstWords - Number of words to skip from start (for resolving duplicates)
 */
function findMatchInSrt(
  chapterText: string,
  segments: SrtSegment[],
  excludeSegments: Set<number> = new Set(),
  skipFirstWords: number = 0
): { segmentIndex: number; confidence: number; matchResult: MatchResult } | null {
  const normalized = normalizeText(chapterText)
  const allWords = normalized.split(' ')

  // Try starting from different word positions (0, 1, 2) to handle
  // cases where first word or two were trimmed in editing
  // When resolving duplicates, start from skipFirstWords position
  const startPositions = skipFirstWords > 0
    ? [skipFirstWords, skipFirstWords + 5, skipFirstWords + 10]
    : [0, 1, 2]

  for (const startWord of startPositions) {
    const searchWords = allWords.slice(startWord)
    if (searchWords.length < 3) continue

    // Try different word counts (10, 7, 5, 3) - prefer longer matches first
    for (const wordCount of [10, 7, 5, 3]) {
      const searchPhrase = searchWords.slice(0, Math.min(wordCount, searchWords.length)).join(' ')
      if (searchPhrase.length < 10) continue  // Skip very short phrases

      // Search entire SRT (excluding already-used segments)
      for (let i = 0; i < segments.length; i++) {
        if (excludeSegments.has(i)) continue

        const segmentText = normalizeText(segments[i].text)

        // Check for exact phrase match
        if (segmentText.includes(searchPhrase)) {
          const match: MatchResult = {
            segmentIndex: i,
            matchType: 'exact_phrase',
            wordCount,
            wordsSkipped: startWord,
          }
          return { segmentIndex: i, confidence: calculateConfidence(match), matchResult: match }
        }
      }
    }
  }

  // Phase 3: Similarity-based matching as fallback
  // Uses Trigram + LCS + Dice algorithms from string-comparisons library
  const searchText = normalizeText(allWords.slice(skipFirstWords, skipFirstWords + 20).join(' '))

  let bestMatch: { segmentIndex: number; score: number; method: string } | null = null

  for (let i = 0; i < segments.length; i++) {
    if (excludeSegments.has(i)) continue

    const segmentText = normalizeText(segments[i].text)

    // Calculate similarity using combined algorithms
    const similarity = calculateSimilarity(searchText, segmentText)

    // Apply threshold gate: reject matches below 0.6
    if (similarity.combined >= SIMILARITY_THRESHOLD) {
      // Determine which algorithm contributed most for the match reason
      let method = 'trigram+jaro+dice'
      if (similarity.trigram > similarity.jaro && similarity.trigram > similarity.dice) {
        method = 'trigram'
      } else if (similarity.jaro > similarity.trigram && similarity.jaro > similarity.dice) {
        method = 'jaro'
      } else if (similarity.dice > similarity.trigram && similarity.dice > similarity.jaro) {
        method = 'dice'
      }

      // Keep the best match
      if (!bestMatch || similarity.combined > bestMatch.score) {
        bestMatch = { segmentIndex: i, score: similarity.combined, method }
      }
    }
  }

  if (bestMatch) {
    const match: MatchResult = {
      segmentIndex: bestMatch.segmentIndex,
      matchType: 'similarity',
      wordCount: searchText.split(' ').length,
      wordsSkipped: skipFirstWords,
      similarityScore: bestMatch.score,
      similarityMethod: bestMatch.method,
    }
    return { segmentIndex: bestMatch.segmentIndex, confidence: calculateConfidence(match), matchResult: match }
  }

  return null
}

/**
 * Find ALL potential matches for chapter text in SRT segments
 * Returns up to maxCandidates matches sorted by confidence
 * Used for verification UI where user can see alternatives
 */
function findAllMatchesInSrt(
  chapterText: string,
  segments: SrtSegment[],
  maxCandidates: number = 5
): ChapterMatchCandidate[] {
  const normalized = normalizeText(chapterText)
  const allWords = normalized.split(' ')
  const candidates: ChapterMatchCandidate[] = []
  const seenSegments = new Set<number>()  // Avoid duplicate segment entries

  // Try starting from different word positions (0, 1, 2)
  for (const startWord of [0, 1, 2]) {
    const searchWords = allWords.slice(startWord)
    if (searchWords.length < 3) continue

    // Try different word counts (10, 7, 5, 3) - prefer longer matches first
    for (const wordCount of [10, 7, 5, 3]) {
      const searchPhrase = searchWords.slice(0, Math.min(wordCount, searchWords.length)).join(' ')
      if (searchPhrase.length < 10) continue

      // Search entire SRT
      for (let i = 0; i < segments.length; i++) {
        if (seenSegments.has(i)) continue

        const segment = segments[i]
        const segmentText = normalizeText(segment.text)

        if (segmentText.includes(searchPhrase)) {
          seenSegments.add(i)
          const match: MatchResult = {
            segmentIndex: i,
            matchType: 'exact_phrase',
            wordCount,
            wordsSkipped: startWord,
          }
          candidates.push({
            timestamp: formatYouTubeTimestamp(segment.startSeconds),
            timestampSeconds: segment.startSeconds,
            confidence: calculateConfidence(match),
            matchedText: segment.text.slice(0, 100),  // First 100 chars
            matchMethod: 'phrase',
          })
        }
      }
    }
  }

  // Phase 3: Similarity-based matching for additional alternatives
  const searchText = normalizeText(allWords.slice(0, 20).join(' '))

  for (let i = 0; i < segments.length; i++) {
    if (seenSegments.has(i)) continue

    const segment = segments[i]
    const segmentText = normalizeText(segment.text)

    // Calculate similarity using combined algorithms
    const similarity = calculateSimilarity(searchText, segmentText)

    // Apply threshold gate: only include matches above 0.6
    if (similarity.combined >= SIMILARITY_THRESHOLD) {
      seenSegments.add(i)

      // Determine dominant algorithm for display
      let method = 'trigram+jaro+dice'
      if (similarity.trigram > similarity.jaro && similarity.trigram > similarity.dice) {
        method = 'trigram'
      } else if (similarity.jaro > similarity.trigram && similarity.jaro > similarity.dice) {
        method = 'jaro'
      } else if (similarity.dice > similarity.trigram && similarity.dice > similarity.jaro) {
        method = 'dice'
      }

      const match: MatchResult = {
        segmentIndex: i,
        matchType: 'similarity',
        wordCount: searchText.split(' ').length,
        wordsSkipped: 0,
        similarityScore: similarity.combined,
        similarityMethod: method,
      }
      candidates.push({
        timestamp: formatYouTubeTimestamp(segment.startSeconds),
        timestampSeconds: segment.startSeconds,
        confidence: calculateConfidence(match),
        matchedText: segment.text.slice(0, 100),
        matchMethod: 'keyword',  // Use 'keyword' for similarity matches (maps to existing UI)
      })
    }
  }

  // Sort by confidence (descending) and return top N
  return candidates
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxCandidates)
}

// Internal result type that includes segment index for duplicate detection
interface InternalChapterResult extends ChapterMatch {
  segmentIndex?: number
  transcriptText?: string
  matchResultInternal?: MatchResult  // Keep match details for matchReason generation
}

/**
 * Main function: Extract chapters with timestamps
 */
export async function extractChapters(
  projectPath: string,
  srtPath: string
): Promise<ChaptersResponse> {
  const startTime = Date.now()
  const paths = getProjectPaths(projectPath)

  // Parse SRT
  const segments = await parseSrt(srtPath)
  if (segments.length === 0) {
    return {
      success: false,
      chapters: [],
      formatted: '',
      error: 'Could not parse SRT file',
    }
  }

  // Get chapters from transcripts
  const chapterInfos = await getChaptersFromTranscripts(paths.transcripts)
  if (chapterInfos.length === 0) {
    return {
      success: false,
      chapters: [],
      formatted: '',
      error: 'No chapter transcripts found',
    }
  }

  const results: InternalChapterResult[] = []

  // First pass: find matches for all chapters
  for (const info of chapterInfos) {
    // Read transcript for this chapter entry
    const transcriptText = await readFileSafe(info.transcriptPath)
    if (!transcriptText) {
      // Can't read transcript, mark as not found
      results.push({
        chapter: info.chapter,
        name: info.name,
        displayName: toDisplayName(info.name),
        confidence: 0,
        status: 'not_found' as ChapterMatchStatus,
      })
      continue
    }

    // Find match in SRT (searches entire SRT)
    const match = findMatchInSrt(transcriptText, segments)

    // Find all alternatives for verification UI
    const allCandidates = findAllMatchesInSrt(transcriptText, segments, 5)

    // Create transcript snippet for comparison (first ~100 chars, trimmed to word boundary)
    const transcriptSnippet = transcriptText.slice(0, 120).replace(/\s+\S*$/, '').trim()

    if (match) {
      const segment = segments[match.segmentIndex]

      // Filter alternatives to:
      // 1. Exclude the primary match (within 5 seconds)
      // 2. Only include options within 60 seconds of primary match (Phase 2 requirement)
      const alternatives = allCandidates.filter(
        c => Math.abs(c.timestampSeconds - segment.startSeconds) > 5 &&
             Math.abs(c.timestampSeconds - segment.startSeconds) <= 60
      )

      // Use the match confidence directly (penalties already applied in calculateConfidence)
      const confidence = match.confidence

      let status: ChapterMatchStatus = 'matched'
      if (confidence < 70) {
        status = 'low_confidence'
      }

      // Generate human-readable match reason
      const matchReason = generateMatchReason(match.matchResult)

      results.push({
        chapter: info.chapter,
        name: info.name,
        displayName: toDisplayName(info.name),
        timestamp: formatYouTubeTimestamp(segment.startSeconds),
        timestampSeconds: segment.startSeconds,
        confidence,
        status,
        matchedText: segment.text.slice(0, 100),
        transcriptSnippet,
        alternatives: alternatives.length > 0 ? alternatives : undefined,
        matchReason,
        segmentIndex: match.segmentIndex,
        transcriptText,
        matchResultInternal: match.matchResult,
      })
    } else {
      results.push({
        chapter: info.chapter,
        name: info.name,
        displayName: toDisplayName(info.name),
        confidence: 0,
        status: 'not_found' as ChapterMatchStatus,
        transcriptSnippet,
        alternatives: allCandidates.length > 0 ? allCandidates : undefined,
        transcriptText,
      })
    }
  }

  // Second pass: resolve duplicate timestamps
  // Group by segment index to find duplicates
  const segmentUsage = new Map<number, InternalChapterResult[]>()
  for (const r of results) {
    if (r.segmentIndex !== undefined) {
      const existing = segmentUsage.get(r.segmentIndex) || []
      existing.push(r)
      segmentUsage.set(r.segmentIndex, existing)
    }
  }

  // Find segments used by multiple chapters
  for (const [segmentIndex, chapters] of segmentUsage) {
    if (chapters.length <= 1) continue

    // Multiple chapters matched the same segment - this is a false positive
    // Keep the first chapter (lowest chapter number), re-match others
    chapters.sort((a, b) => a.chapter - b.chapter)
    const keepChapter = chapters[0]

    // Collect all segments claimed by confirmed matches
    const claimedSegments = new Set<number>()
    for (const r of results) {
      if (r.segmentIndex !== undefined && r !== keepChapter) {
        // Only claim segments for non-duplicate chapters
        const isDuplicate = chapters.slice(1).includes(r)
        if (!isDuplicate) {
          claimedSegments.add(r.segmentIndex)
        }
      }
    }
    claimedSegments.add(segmentIndex) // Claim the duplicate segment for keepChapter

    // Re-match the other chapters using deeper text (skip first 15 words)
    for (const dupChapter of chapters.slice(1)) {
      if (!dupChapter.transcriptText) continue

      // Try re-matching with exclusions and skipping common opening phrases
      const newMatch = findMatchInSrt(
        dupChapter.transcriptText,
        segments,
        claimedSegments,
        15  // Skip first 15 words to avoid common opening phrases
      )

      if (newMatch) {
        const segment = segments[newMatch.segmentIndex]
        dupChapter.timestamp = formatYouTubeTimestamp(segment.startSeconds)
        dupChapter.timestampSeconds = segment.startSeconds
        dupChapter.confidence = newMatch.confidence
        dupChapter.segmentIndex = newMatch.segmentIndex
        dupChapter.status = newMatch.confidence < 70 ? 'low_confidence' : 'matched'
        claimedSegments.add(newMatch.segmentIndex)
      } else {
        // Could not find alternative match
        dupChapter.status = 'low_confidence'
        dupChapter.confidence = Math.max(dupChapter.confidence - 30, 10)
      }
    }
  }

  // Third pass: detect out-of-order chapters and apply penalty
  // Sort results by timestamp to check if chapter order matches
  const sortedByTimestamp = [...results]
    .filter(r => r.timestampSeconds !== undefined)
    .sort((a, b) => (a.timestampSeconds || 0) - (b.timestampSeconds || 0))

  // Track the maximum chapter number seen so far (by timestamp order)
  let maxChapterSeen = 0
  for (const r of sortedByTimestamp) {
    if (r.chapter < maxChapterSeen) {
      // This chapter appears out of order (its timestamp is after a higher-numbered chapter)
      // This is a significant issue that needs review
      r.confidence = Math.max(r.confidence - 20, 10)
      if (r.confidence < 70) {
        r.status = 'low_confidence'
      }
    }
    maxChapterSeen = Math.max(maxChapterSeen, r.chapter)
  }

  // Clean up internal fields (segmentIndex, transcriptText, matchResultInternal) but keep verification fields including matchReason
  const cleanResults: ChapterMatch[] = results.map(({ segmentIndex, transcriptText, matchResultInternal, ...r }) => r)

  // Generate YouTube format (sorted by timestamp for proper YouTube ordering)
  const sortedForFormat = [...cleanResults]
    .filter(r => r.status !== 'not_found' && r.timestamp && r.timestampSeconds !== undefined)
    .sort((a, b) => (a.timestampSeconds || 0) - (b.timestampSeconds || 0))

  const formatted = sortedForFormat
    .map(r => `${r.timestamp} ${r.displayName}`)
    .join('\n')

  const elapsedMs = Date.now() - startTime
  console.log(`Chapter extraction completed in ${elapsedMs}ms (${segments.length} SRT segments, ${cleanResults.length} chapters)`)

  return {
    success: true,
    chapters: cleanResults,
    formatted,
    stats: {
      elapsedMs,
      srtSegments: segments.length,
      chaptersFound: cleanResults.filter(c => c.status !== 'not_found').length,
      chaptersTotal: cleanResults.length,
    },
  }
}

/**
 * Get chapters without SRT (just list from transcripts)
 */
export async function getChapterList(projectPath: string): Promise<ChapterInfo[]> {
  const paths = getProjectPaths(projectPath)
  return getChaptersFromTranscripts(paths.transcripts)
}
