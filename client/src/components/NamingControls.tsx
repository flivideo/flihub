import { useRef, useState, useEffect } from 'react'
import type { NamingState } from '../App'
import type { CommonName } from '../../../shared/types'
import { DEFAULT_TAGS } from '../../../shared/types'
import { buildPreviewFilename } from '../utils/naming'

interface NamingControlsProps {
  namingState: NamingState
  updateNaming: (field: keyof NamingState, value: string | string[]) => void
  onNewChapter: () => void
  availableTags?: string[]    // NFR-2: Tags from config
  commonNames?: CommonName[]  // NFR-3/FR-13: Common names from config
  newChapterClickCount?: number  // FR-112: Track clicks for glow detection
  onAddCommonName?: () => void  // FR-116: Navigate to config to add common name
}

export function NamingControls({ namingState, updateNaming, onNewChapter, availableTags, commonNames, newChapterClickCount = 0, onAddCommonName }: NamingControlsProps) {
  const { chapter, sequence, name, tags, customTag } = namingState
  // NFR-2: Global tags (always visible)
  const globalTags = availableTags ?? [...DEFAULT_TAGS]

  // NFR-2 fix: Find suggestTags for the currently active common name
  const activeCommonName = commonNames?.find(cn => cn.name === name)
  const suggestedTags = activeCommonName?.suggestTags ?? []

  // FR-107: Name input auto-focus and glow when New Chapter clicked
  const nameInputRef = useRef<HTMLInputElement>(null)
  // FR-112: Refs for chapter and sequence inputs
  const chapterInputRef = useRef<HTMLInputElement>(null)
  const sequenceInputRef = useRef<HTMLInputElement>(null)

  // FR-107: Blue glow for name field
  const [showNameGlow, setShowNameGlow] = useState(false)
  // FR-112: Green glow for chapter/seq on productive click
  const [showChapterGlowGreen, setShowChapterGlowGreen] = useState(false)
  // FR-112: Red glow for chapter/seq on idempotent click
  const [showChapterGlowRed, setShowChapterGlowRed] = useState(false)

  // FR-112: Track previous state for detecting changes and showing previous filename
  const prevChapterRef = useRef<string>(chapter)
  const prevClickCountRef = useRef<number>(newChapterClickCount)
  const [previousFilename, setPreviousFilename] = useState<string | null>(null)
  // Store previous naming state before click
  const prevNamingStateRef = useRef<{ chapter: string; sequence: string; name: string; tags: string[]; customTag: string } | null>(null)

  // FR-112: Detect New Chapter clicks and show appropriate glow
  useEffect(() => {
    // Skip initial mount
    if (prevClickCountRef.current === 0 && newChapterClickCount === 0) {
      prevClickCountRef.current = newChapterClickCount
      prevChapterRef.current = chapter
      return
    }

    // Detect if click count increased (New Chapter was clicked)
    if (newChapterClickCount > prevClickCountRef.current) {
      const chapterChanged = prevChapterRef.current !== chapter

      // Always show blue glow on name field when New Chapter clicked
      setShowNameGlow(true)
      nameInputRef.current?.focus()

      if (chapterChanged) {
        // Productive click: green glow on chapter/seq
        setShowChapterGlowRed(false)  // Ensure red is off
        setShowChapterGlowGreen(true)

        // Build previous filename from the state before the click
        if (prevNamingStateRef.current) {
          const prev = prevNamingStateRef.current
          setPreviousFilename(buildPreviewFilename(prev.chapter, prev.sequence, prev.name, prev.tags, prev.customTag))
        }

        const timer = setTimeout(() => {
          setShowChapterGlowGreen(false)
          setShowNameGlow(false)
          setPreviousFilename(null)
        }, 1500)

        prevClickCountRef.current = newChapterClickCount
        prevChapterRef.current = chapter
        return () => clearTimeout(timer)
      } else {
        // Idempotent click: red glow on chapter/seq
        setShowChapterGlowGreen(false)  // Ensure green is off
        setShowChapterGlowRed(true)

        const timer = setTimeout(() => {
          setShowChapterGlowRed(false)
          setShowNameGlow(false)
        }, 500)

        prevClickCountRef.current = newChapterClickCount
        return () => clearTimeout(timer)
      }
    }

    // Update refs when chapter changes without a click (e.g., manual typing)
    prevChapterRef.current = chapter
  }, [chapter, newChapterClickCount])

  // FR-112: Capture naming state before each render for previous filename tracking
  useEffect(() => {
    prevNamingStateRef.current = { chapter, sequence, name, tags: [...tags], customTag }
  })

  const toggleTag = (tag: string) => {
    const newTags = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag]
    updateNaming('tags', newTags)
  }

  // FR-21/FR-54: Sanitize custom tag input (spaces/commas → dashes, strip invalid chars, uppercase)
  // Note: Only trim leading dashes, keep trailing so user can type TAG1-TAG2
  const sanitizeCustomTag = (value: string): string => {
    return value
      .toUpperCase()
      .replace(/[\s,]+/g, '-')      // spaces and commas to dashes
      .replace(/[^A-Z0-9-]/g, '')   // strip invalid chars
      .replace(/-+/g, '-')          // multiple dashes to single
      .replace(/^-/, '')            // trim leading dash only
  }

  // FR-13: Apply common name with rules
  const applyCommonName = (commonName: CommonName) => {
    updateNaming('name', commonName.name)

    // Apply autoSequence rule: reset to 1
    if (commonName.autoSequence) {
      updateNaming('sequence', '1')
    }

    // Note: suggestTags just makes tags available, doesn't auto-select them
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Naming Template</h3>
        <button
          onClick={onNewChapter}
          className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          New Chapter
        </button>
      </div>

      <div className="grid grid-cols-12 gap-3 mb-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Chapter</label>
          <input
            ref={chapterInputRef}
            type="text"
            value={chapter}
            onChange={(e) => updateNaming('chapter', e.target.value.slice(0, 2))}
            placeholder="01"
            maxLength={2}
            className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              showChapterGlowGreen ? 'animate-glow-pulse-green' : ''
            } ${showChapterGlowRed ? 'animate-glow-pulse-red' : ''}`}
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Seq</label>
          <input
            ref={sequenceInputRef}
            type="text"
            value={sequence}
            onChange={(e) => updateNaming('sequence', e.target.value.slice(0, 3))}
            placeholder="1"
            maxLength={3}
            className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              showChapterGlowGreen ? 'animate-glow-pulse-green' : ''
            } ${showChapterGlowRed ? 'animate-glow-pulse-red' : ''}`}
          />
        </div>

        <div className="col-span-5">
          <label className="block text-xs text-gray-600 mb-1">Name</label>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => updateNaming('name', e.target.value)}
            placeholder="intro"
            className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              showNameGlow ? 'animate-glow-pulse' : ''
            }`}
          />
          {/* FR-13: Common names quick-select pills - gray outline style */}
          {commonNames && commonNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
              {commonNames.map((cn) => (
                <button
                  key={cn.name}
                  onClick={() => applyCommonName(cn)}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    name === cn.name
                      ? 'border-gray-500 bg-gray-500 text-white'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                  title={cn.autoSequence ? 'Resets sequence to 1' : undefined}
                >
                  {cn.name}
                </button>
              ))}
              {/* FR-116: Quick config access button */}
              {onAddCommonName && (
                <button
                  onClick={onAddCommonName}
                  className="px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  title="Add common name"
                >
                  ⚙+
                </button>
              )}
            </div>
          )}
        </div>

        <div className="col-span-3">
          <label className="block text-xs text-gray-600 mb-1">Tags</label>
          <div className="flex flex-wrap gap-1">
            {/* Global tags (always visible) */}
            {globalTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  tags.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
            {/* Suggested tags (only visible for active common name) */}
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  tags.includes(tag)
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
                title="Suggested for this segment"
              >
                {tag}
              </button>
            ))}
            {/* FR-21/FR-54: Custom tag input with clear button */}
            <div className="flex items-center gap-0.5">
              <input
                type="text"
                value={customTag}
                onChange={(e) => updateNaming('customTag', sanitizeCustomTag(e.target.value))}
                placeholder="TAG"
                className="w-24 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                title="Custom tag(s) - use dash to separate multiple (e.g., TAG1-TAG2)"
              />
              {customTag && (
                <button
                  onClick={() => updateNaming('customTag', '')}
                  className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear custom tag"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FR-112: Preview filename with optional previous filename */}
      <div className="flex justify-end items-center gap-3">
        {previousFilename && (
          <>
            <span className="font-mono text-base text-gray-400">{previousFilename}</span>
            <span className="text-gray-300">→</span>
          </>
        )}
        <span className="font-mono text-base text-blue-600">{buildPreviewFilename(chapter, sequence, name, tags, customTag)}</span>
      </div>
    </div>
  )
}
