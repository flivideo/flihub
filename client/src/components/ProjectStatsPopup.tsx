import React, { useState } from 'react'
import { useFinalMedia, useChapters, useVerifyChapter, useSetChapterOverride } from '../hooks/useApi'
import { formatRelativeTime, formatDate, formatFileSize } from '../utils/formatting'
import type { ProjectStats, ChapterMatch, ChapterMatchCandidate, ChapterVerifyRequest } from '../../../shared/types'
import { TranscriptSyncModal } from './TranscriptSyncModal'

interface Props {
  project: ProjectStats
  onClose: () => void
}

// Status icon for chapter match
function ChapterStatusIcon({ status }: { status: ChapterMatch['status'] }) {
  switch (status) {
    case 'matched':
      return <span className="text-green-600">✅</span>
    case 'low_confidence':
      return <span className="text-yellow-500">⚠️</span>
    case 'not_found':
      return <span className="text-red-400">❌</span>
  }
}

// Stat row component for consistency
function StatRow({ label, value, valueClass = 'text-gray-700' }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  )
}

// Section header component
function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{children}</div>
}

// Match method badge
function MatchMethodBadge({ method }: { method: ChapterMatchCandidate['matchMethod'] }) {
  const colors = {
    phrase: 'bg-green-100 text-green-700',
    partial: 'bg-yellow-100 text-yellow-700',
    keyword: 'bg-orange-100 text-orange-700',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[method]}`}>
      {method}
    </span>
  )
}

// Help AI Modal for user-assisted verification
function HelpAIModal({
  chapter,
  onSubmit,
  onClose,
  isLoading,
}: {
  chapter: ChapterMatch
  onSubmit: (hint: string) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [hint, setHint] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-4 w-[500px] max-w-[90vw]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Help AI Fix Chapter {chapter.chapter}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div className="mb-3">
          <div className="text-sm text-gray-600 mb-2">
            <strong>{chapter.displayName}</strong>
            {chapter.timestamp && <span className="ml-2 text-gray-400">Current: {chapter.timestamp}</span>}
          </div>

          {chapter.transcriptSnippet && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-2">
              <div className="text-[10px] text-gray-400 uppercase mb-1">Transcript Start</div>
              {chapter.transcriptSnippet}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What happened with this chapter?
          </label>
          <textarea
            value={hint}
            onChange={e => setHint(e.target.value)}
            placeholder='e.g., "First 15 seconds were cut", "Starts around 53:04", "Chapter was merged with the previous one"'
            className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(hint)}
            disabled={isLoading || !hint.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Fix with AI'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Manual timestamp entry modal
function ManualEntryModal({
  chapter,
  onSubmit,
  onSkip,
  onClose,
}: {
  chapter: ChapterMatch
  onSubmit: (timestamp: string, reason?: string) => void
  onSkip: (reason?: string) => void
  onClose: () => void
}) {
  const [timestamp, setTimestamp] = useState(chapter.timestamp || '')
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-4 w-[400px] max-w-[90vw]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Set Timestamp for Chapter {chapter.chapter}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div className="text-sm text-gray-600 mb-3">
          <strong>{chapter.displayName}</strong>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
          <input
            type="text"
            value={timestamp}
            onChange={e => setTimestamp(e.target.value)}
            placeholder="MM:SS or H:MM:SS"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g., Manually verified, content was cut"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => onSkip(reason || 'Skipped by user')}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-800"
          >
            Skip Chapter
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(timestamp, reason)}
              disabled={!timestamp.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProjectStatsPopup({ project, onClose }: Props) {
  const [showChapters, setShowChapters] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null)
  const [helpAIChapter, setHelpAIChapter] = useState<ChapterMatch | null>(null)
  const [manualEntryChapter, setManualEntryChapter] = useState<ChapterMatch | null>(null)
  const [verifyingChapter, setVerifyingChapter] = useState<number | null>(null)
  const [verifyResult, setVerifyResult] = useState<{ chapter: number; message: string; success: boolean } | null>(null)
  const [showTranscriptSync, setShowTranscriptSync] = useState(false)

  const { data: finalMedia, isLoading: loadingFinalMedia } = useFinalMedia(project.code)
  const { data: chaptersData, isLoading: loadingChapters, refetch: refetchChapters } = useChapters(
    showChapters ? project.code : null
  )
  const verifyChapter = useVerifyChapter(project.code)
  const setOverride = useSetChapterOverride(project.code)

  // Copy chapters to clipboard
  const handleCopyChapters = async () => {
    if (!chaptersData?.formatted) return

    try {
      await navigator.clipboard.writeText(chaptersData.formatted)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Toggle chapters view
  const handleToggleChapters = () => {
    setShowChapters(!showChapters)
    if (!showChapters && !chaptersData) {
      refetchChapters()
    }
  }

  // Verify chapter with LLM (automatic)
  const handleVerifyChapter = async (ch: ChapterMatch) => {
    setVerifyingChapter(ch.chapter)
    setVerifyResult(null)

    const request: ChapterVerifyRequest = {
      chapter: ch.chapter,
      name: ch.name,
      transcriptSnippet: ch.transcriptSnippet || '',
      currentMatch: ch.timestamp ? {
        timestamp: ch.timestamp,
        confidence: ch.confidence,
        matchedText: ch.matchedText || '',
      } : undefined,
      alternatives: ch.alternatives,
    }

    try {
      const result = await verifyChapter.mutateAsync(request)
      if (result.success && result.recommendation.timestamp) {
        // Apply the recommendation as an override
        await setOverride.mutateAsync({
          chapter: ch.chapter,
          name: ch.name,
          action: result.recommendation.action === 'skip' ? 'skip' : 'override',
          timestamp: result.recommendation.timestamp,
          reason: `AI: ${result.recommendation.reasoning}`,
        })
        setVerifyResult({
          chapter: ch.chapter,
          message: `AI recommends ${result.recommendation.timestamp}: ${result.recommendation.reasoning}`,
          success: true,
        })
        refetchChapters()
      } else {
        setVerifyResult({
          chapter: ch.chapter,
          message: result.error || 'Could not verify',
          success: false,
        })
      }
    } catch (error) {
      setVerifyResult({
        chapter: ch.chapter,
        message: 'Verification failed',
        success: false,
      })
    } finally {
      setVerifyingChapter(null)
    }
  }

  // User-assisted LLM verification
  const handleHelpAISubmit = async (hint: string) => {
    if (!helpAIChapter) return

    setVerifyingChapter(helpAIChapter.chapter)

    const request: ChapterVerifyRequest = {
      chapter: helpAIChapter.chapter,
      name: helpAIChapter.name,
      transcriptSnippet: helpAIChapter.transcriptSnippet || '',
      currentMatch: helpAIChapter.timestamp ? {
        timestamp: helpAIChapter.timestamp,
        confidence: helpAIChapter.confidence,
        matchedText: helpAIChapter.matchedText || '',
      } : undefined,
      alternatives: helpAIChapter.alternatives,
      userHint: hint,
    }

    try {
      const result = await verifyChapter.mutateAsync(request)
      if (result.success && result.recommendation.timestamp) {
        await setOverride.mutateAsync({
          chapter: helpAIChapter.chapter,
          name: helpAIChapter.name,
          action: result.recommendation.action === 'skip' ? 'skip' : 'override',
          timestamp: result.recommendation.timestamp,
          reason: `AI (user hint: ${hint}): ${result.recommendation.reasoning}`,
        })
        setVerifyResult({
          chapter: helpAIChapter.chapter,
          message: `Fixed to ${result.recommendation.timestamp}`,
          success: true,
        })
        refetchChapters()
      }
    } catch (error) {
      setVerifyResult({
        chapter: helpAIChapter.chapter,
        message: 'Verification failed',
        success: false,
      })
    } finally {
      setVerifyingChapter(null)
      setHelpAIChapter(null)
    }
  }

  // Manual timestamp entry
  const handleManualEntry = async (timestamp: string, reason?: string) => {
    if (!manualEntryChapter) return

    await setOverride.mutateAsync({
      chapter: manualEntryChapter.chapter,
      name: manualEntryChapter.name,
      action: 'override',
      timestamp,
      reason: reason || 'Manual entry',
    })
    refetchChapters()
    setManualEntryChapter(null)
  }

  // Skip chapter
  const handleSkipChapter = async (reason?: string) => {
    if (!manualEntryChapter) return

    await setOverride.mutateAsync({
      chapter: manualEntryChapter.chapter,
      name: manualEntryChapter.name,
      action: 'skip',
      reason: reason || 'Skipped',
    })
    refetchChapters()
    setManualEntryChapter(null)
  }

  // Use alternative timestamp
  const handleUseAlternative = async (ch: ChapterMatch, alt: ChapterMatchCandidate) => {
    await setOverride.mutateAsync({
      chapter: ch.chapter,
      name: ch.name,
      action: 'override',
      timestamp: alt.timestamp,
      reason: `Selected alternative (${alt.confidence}% ${alt.matchMethod})`,
    })
    refetchChapters()
  }

  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-5"
      style={{ top: '100%', right: 0, marginTop: '4px', width: '720px' }}
    >
      {/* Help AI Modal */}
      {helpAIChapter && (
        <HelpAIModal
          chapter={helpAIChapter}
          onSubmit={handleHelpAISubmit}
          onClose={() => setHelpAIChapter(null)}
          isLoading={verifyingChapter === helpAIChapter.chapter}
        />
      )}

      {/* Manual Entry Modal */}
      {manualEntryChapter && (
        <ManualEntryModal
          chapter={manualEntryChapter}
          onSubmit={handleManualEntry}
          onSkip={handleSkipChapter}
          onClose={() => setManualEntryChapter(null)}
        />
      )}

      {/* FR-48: Transcript Sync Modal */}
      {showTranscriptSync && (
        <TranscriptSyncModal
          projectCode={project.code}
          projectPath={project.path}
          onClose={() => setShowTranscriptSync(false)}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-lg text-blue-600">{project.code}</span>
          <span className="text-sm text-gray-400">
            Created {formatDate(project.createdAt)} · Last edit {formatRelativeTime(project.lastModified)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none px-2"
        >
          &times;
        </button>
      </div>

      {/* Two-column grid for Files, Assets, Final Media */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Files Section - FR-111: recordingsCount/safeCount removed */}
        <div className="space-y-1">
          <SectionHeader>Files</SectionHeader>
          <StatRow label="Total" value={project.totalFiles} />
          <StatRow label="Chapters" value={project.chapterCount} />
        </div>

        {/* Assets Section - FR-48: Enhanced transcript sync display */}
        <div className="space-y-1">
          <SectionHeader>Assets</SectionHeader>
          <StatRow label="Images" value={project.imageCount} />
          <StatRow label="Thumbs" value={project.thumbCount} />
          {/* FR-48: Enhanced transcript sync status */}
          <div className="text-sm pt-1 border-t border-gray-100 mt-1">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Transcripts</div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">✓ Matched:</span>
              <span className="text-gray-700">{project.transcriptSync.matched}</span>
            </div>
            {project.transcriptSync.missingCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-yellow-600">⚠️ Missing:</span>
                <span className="text-yellow-600">{project.transcriptSync.missingCount}</span>
              </div>
            )}
            {project.transcriptSync.orphanedCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-orange-500">🗑️ Orphaned:</span>
                <span className="text-orange-500">{project.transcriptSync.orphanedCount}</span>
              </div>
            )}
            {(project.transcriptSync.missingCount > 0 || project.transcriptSync.orphanedCount > 0) && (
              <button
                onClick={() => setShowTranscriptSync(true)}
                className="mt-2 w-full text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
              >
                View Details
              </button>
            )}
          </div>
        </div>

        {/* Final Media Section */}
        <div className="space-y-1">
          <SectionHeader>Final Media</SectionHeader>
          {loadingFinalMedia ? (
            <div className="text-sm text-gray-400">Loading...</div>
          ) : (
            <>
              <StatRow
                label="Video"
                value={
                  finalMedia?.video ? (
                    <span className="text-green-600">
                      ✅ {formatFileSize(finalMedia.video.size)}
                      {finalMedia.video.version && (
                        <span className="text-gray-400 ml-1">v{finalMedia.video.version}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )
                }
              />
              <StatRow
                label="SRT"
                value={
                  finalMedia?.srt ? (
                    <span className="text-green-600 text-xs whitespace-nowrap" title={finalMedia.srt.filename}>
                      ✅ {finalMedia.srt.filename.length > 25
                        ? finalMedia.srt.filename.slice(0, 22) + '...'
                        : finalMedia.srt.filename}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )
                }
              />
              {finalMedia?.video && (
                <div className="text-xs text-gray-400 mt-1">📁 {finalMedia.video.location}</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Additional Segments (if any) */}
      {finalMedia?.additionalSegments && finalMedia.additionalSegments.length > 0 && (
        <div className="mb-4 pb-3 border-b border-gray-100">
          <SectionHeader>Additional Segments</SectionHeader>
          <div className="flex flex-wrap gap-2 mt-1">
            {finalMedia.additionalSegments.map((seg, i) => (
              <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                {seg.filename} {seg.hasSrt && '📝'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* FR-34: Chapter Timestamps */}
      {finalMedia?.srt && (
        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <SectionHeader>Chapters</SectionHeader>
              {chaptersData?.stats && (
                <span className="text-xs text-gray-400">
                  ({chaptersData.stats.chaptersFound}/{chaptersData.stats.chaptersTotal} matched in {chaptersData.stats.elapsedMs}ms)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleToggleChapters}
                className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                title={showChapters ? 'Hide chapters' : 'Show chapters'}
              >
                {showChapters ? '▲ Hide' : '▼ Show'}
              </button>
              {chaptersData?.formatted && (
                <button
                  onClick={handleCopyChapters}
                  className={`text-xs px-3 py-1 rounded ${
                    copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                  }`}
                  title="Copy chapter timestamps for YouTube"
                >
                  {copied ? '✓ Copied!' : '📋 Copy for YouTube'}
                </button>
              )}
            </div>
          </div>

          {showChapters && (
            <div className="mt-2">
              {loadingChapters ? (
                <div className="text-sm text-gray-400 py-4 text-center">Extracting chapters...</div>
              ) : chaptersData?.error ? (
                <div className="text-sm text-red-500 py-2">{chaptersData.error}</div>
              ) : chaptersData?.chapters && chaptersData.chapters.length > 0 ? (
                (() => {
                  // Sort chapters by timestamp for display (like YouTube)
                  const sortedChapters = [...chaptersData.chapters]
                    .filter(ch => ch.status !== 'not_found' && ch.timestampSeconds !== undefined)
                    .sort((a, b) => (a.timestampSeconds || 0) - (b.timestampSeconds || 0))

                  // Add not_found chapters at the end
                  const notFoundChapters = chaptersData.chapters.filter(ch => ch.status === 'not_found')
                  const allChapters = [...sortedChapters, ...notFoundChapters]

                  // Detect out-of-order chapters
                  // A chapter is out-of-order if it JUMPS FORWARD too much from the previous chapter
                  // (meaning it was placed earlier in the video than it should be)
                  //
                  // Examples:
                  // - Sequence: 1, 2, 40, 3, 4... → ch40 is out of order (jumped from 2 to 40)
                  // - Sequence: 8, 9, 19, 10... → ch19 is out of order (jumped from 9 to 19)
                  // - Sequence: 3, 4, 6, 7... → ch6 is fine (small gap of 2 is ok)
                  const outOfOrderMap = new Map<number, { outOfOrder: boolean; reason?: string }>()
                  const MAX_ALLOWED_GAP = 5 // Gaps larger than this are flagged

                  for (let i = 0; i < sortedChapters.length; i++) {
                    const ch = sortedChapters[i]
                    const prev = i > 0 ? sortedChapters[i - 1] : null

                    if (!prev) {
                      // First chapter - flag if it's unexpectedly high (like starting with ch40)
                      if (ch.chapter > MAX_ALLOWED_GAP) {
                        outOfOrderMap.set(ch.chapter, {
                          outOfOrder: true,
                          reason: `Starts at ch${ch.chapter} instead of ch1`
                        })
                      } else {
                        outOfOrderMap.set(ch.chapter, { outOfOrder: false })
                      }
                    } else {
                      const gap = ch.chapter - prev.chapter
                      if (gap > MAX_ALLOWED_GAP) {
                        // Big forward jump - this chapter is out of order
                        outOfOrderMap.set(ch.chapter, {
                          outOfOrder: true,
                          reason: `Jumped from ch${prev.chapter} to ch${ch.chapter}`
                        })
                      } else {
                        outOfOrderMap.set(ch.chapter, { outOfOrder: false })
                      }
                    }
                  }

                  const checkOutOfOrder = (ch: ChapterMatch): { outOfOrder: boolean; reason?: string } => {
                    if (ch.status === 'not_found') return { outOfOrder: false }
                    return outOfOrderMap.get(ch.chapter) || { outOfOrder: false }
                  }

                  // Check if chapter needs verification (< 90% or has issues)
                  const needsVerification = (ch: ChapterMatch, outOfOrder: boolean) => {
                    return ch.confidence < 90 || ch.status === 'low_confidence' || ch.status === 'not_found' || outOfOrder
                  }

                  return (
                    <div className="max-h-80 overflow-y-auto border border-gray-100 rounded">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left py-1 px-2 text-gray-500 font-medium w-8">#</th>
                            <th className="text-left py-1 px-2 text-gray-500 font-medium w-6"></th>
                            <th className="text-left py-1 px-2 text-gray-500 font-medium w-16">Time</th>
                            <th className="text-left py-1 px-2 text-gray-500 font-medium">Chapter</th>
                            <th className="text-right py-1 px-2 text-gray-500 font-medium w-12">Conf</th>
                            <th className="text-center py-1 px-2 text-gray-500 font-medium w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allChapters.map((ch) => {
                            const { outOfOrder, reason: outOfOrderReason } = checkOutOfOrder(ch)
                            const isExpanded = expandedChapter === ch.chapter
                            const hasAlternatives = ch.alternatives && ch.alternatives.length > 0
                            const hasDetails = ch.matchedText || ch.transcriptSnippet || hasAlternatives
                            const showVerify = needsVerification(ch, outOfOrder)
                            const isVerifying = verifyingChapter === ch.chapter
                            const result = verifyResult?.chapter === ch.chapter ? verifyResult : null

                            return (
                              <React.Fragment key={`${ch.chapter}-${ch.name}`}>
                                <tr
                                  className={`border-t border-gray-50 ${
                                    ch.status === 'not_found' ? 'bg-red-50' :
                                    ch.status === 'low_confidence' ? 'bg-yellow-50' :
                                    outOfOrder ? 'bg-pink-50' : ''
                                  }`}
                                  title={
                                    ch.status === 'low_confidence' ? `Low confidence match: ${ch.confidence}%` :
                                    outOfOrder ? `Out of order: ${outOfOrderReason || 'unexpected position'}` : undefined
                                  }
                                >
                                  <td className={`py-1 px-2 font-mono ${outOfOrder ? 'text-pink-600 font-semibold' : 'text-gray-400'}`}>
                                    {ch.chapter}
                                    {outOfOrder && <span className="ml-1">⚡</span>}
                                  </td>
                                  <td className="py-1 px-2">
                                    <ChapterStatusIcon status={ch.status} />
                                  </td>
                                  <td className="py-1 px-2 font-mono text-gray-600">
                                    {ch.timestamp || '???'}
                                  </td>
                                  <td
                                    className={`py-1 px-2 ${ch.status === 'not_found' ? 'text-gray-400' : 'text-gray-700'} ${hasDetails ? 'cursor-pointer hover:text-blue-600' : ''}`}
                                    onClick={() => hasDetails && setExpandedChapter(isExpanded ? null : ch.chapter)}
                                  >
                                    {ch.displayName}
                                    {hasAlternatives && (
                                      <span className="ml-2 text-[10px] text-blue-500">
                                        +{ch.alternatives!.length} alt
                                      </span>
                                    )}
                                    {hasDetails && <span className="ml-1 text-gray-400">{isExpanded ? '▲' : '▼'}</span>}
                                  </td>
                                  <td className="py-1 px-2 text-right">
                                    {/* 3-state confidence badge: CONFIDENT (>=80), REVIEW (50-79), UNCERTAIN (<50) */}
                                    {ch.status === 'not_found' ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                                        —
                                      </span>
                                    ) : ch.confidence >= 80 ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700" title={ch.matchReason || `${ch.confidence}% confidence`}>
                                        ✓
                                      </span>
                                    ) : ch.confidence >= 50 ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700" title={ch.matchReason || `${ch.confidence}% - needs review`}>
                                        ?
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700" title={ch.matchReason || `${ch.confidence}% - uncertain match`}>
                                        ✗
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1 px-2 text-center">
                                    {isVerifying ? (
                                      <span className="text-gray-400 animate-pulse">...</span>
                                    ) : result ? (
                                      <span className={result.success ? 'text-green-600' : 'text-red-500'}>
                                        {result.success ? '✓' : '✗'}
                                      </span>
                                    ) : showVerify ? (
                                      <div className="flex gap-1 justify-center">
                                        <button
                                          onClick={() => handleVerifyChapter(ch)}
                                          className="text-[10px] px-1.5 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded"
                                          title="AI Verify"
                                        >
                                          🤖
                                        </button>
                                        <button
                                          onClick={() => setHelpAIChapter(ch)}
                                          className="text-[10px] px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                                          title="Help AI"
                                        >
                                          💬
                                        </button>
                                        <button
                                          onClick={() => setManualEntryChapter(ch)}
                                          className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                                          title="Manual Entry"
                                        >
                                          ✏️
                                        </button>
                                      </div>
                                    ) : null}
                                  </td>
                                </tr>

                                {/* Expanded details row */}
                                {isExpanded && hasDetails && (
                                  <tr key={`${ch.chapter}-${ch.name}-details`} className="bg-gray-50">
                                    <td colSpan={6} className="px-3 py-2">
                                      <div className="space-y-2">
                                        {/* Match reason - human readable explanation */}
                                        {ch.matchReason && (
                                          <div className="text-xs text-gray-600 italic bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                            {ch.matchReason}
                                          </div>
                                        )}
                                        {/* Matched vs Transcript comparison */}
                                        {(ch.matchedText || ch.transcriptSnippet) && (
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <div className="text-[10px] text-gray-400 uppercase mb-1">Matched SRT Text</div>
                                              <div className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 max-h-16 overflow-y-auto">
                                                {ch.matchedText || <span className="text-gray-400 italic">No match</span>}
                                              </div>
                                            </div>
                                            <div>
                                              <div className="text-[10px] text-gray-400 uppercase mb-1">Transcript Start</div>
                                              <div className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 max-h-16 overflow-y-auto">
                                                {ch.transcriptSnippet || <span className="text-gray-400 italic">No transcript</span>}
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Alternatives with "Use" buttons */}
                                        {hasAlternatives && (
                                          <div>
                                            <div className="text-[10px] text-gray-400 uppercase mb-1">Alternative Matches (click to use)</div>
                                            <div className="space-y-1">
                                              {ch.alternatives!.map((alt, i) => (
                                                <div
                                                  key={i}
                                                  className="flex items-center gap-2 text-xs bg-white p-2 rounded border border-gray-200 hover:border-blue-300 cursor-pointer"
                                                  onClick={() => handleUseAlternative(ch, alt)}
                                                  title="Click to use this timestamp"
                                                >
                                                  <span className="font-mono text-gray-600 w-16">{alt.timestamp}</span>
                                                  <span className={`font-mono w-10 text-right ${
                                                    alt.confidence >= 80 ? 'text-green-600' :
                                                    alt.confidence >= 60 ? 'text-yellow-600' :
                                                    'text-red-500'
                                                  }`}>
                                                    {alt.confidence}%
                                                  </span>
                                                  <MatchMethodBadge method={alt.matchMethod} />
                                                  <span className="text-gray-500 truncate flex-1" title={alt.matchedText}>
                                                    {alt.matchedText}
                                                  </span>
                                                  <span className="text-blue-500 text-[10px]">Use →</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })()
              ) : (
                <div className="text-sm text-gray-400 py-4 text-center">No chapters found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
