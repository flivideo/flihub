import { useState, useMemo, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useIncomingImages, useProjectImages, useNextImageOrder, useAssignImage, useDeleteIncomingImage, useRefetchIncomingImages, useSavePrompt, useLoadPrompt, useDeletePrompt, useDeleteAssignedImage, useClipboardAssign, useClipboardToIncoming } from '../hooks/useAssetApi'
import { ClipboardPasteModal } from './ClipboardPasteModal'
import { useConfig, useSuggestedNaming, useRecordings } from '../hooks/useApi'
import { useShiftHover } from '../hooks/useShiftHover'
import { useAssetsSocket } from '../hooks/useSocket'
import { formatFileSize, collapsePath, formatTime } from '../utils/formatting'
import { OpenFolderButton } from './shared'
import { validateLabel, buildImageFilename } from '../../../shared/naming'
import { ImagePreviewOverlay } from './ImagePreviewOverlay'
import { API_URL } from '../config'
import type { ImageInfo, PromptAsset, ImageAsset } from '../../../shared/types'
import type { TextPreview } from '../hooks/useShiftHover'

type VariantOption = null | 'a' | 'b' | 'c'

// Paired asset: image and/or prompt with the same base filename
interface PairedAsset {
  baseFilename: string  // e.g., "10-6-1a-bigpicture" (without extension)
  image: ImageAsset | null
  prompt: PromptAsset | null
  // Derived from image or prompt
  chapter: string
  sequence: string
  imageOrder: string
  variant: string | null
  label: string
}

// FR-23: Thumbnail size options
type ThumbnailSize = 'S' | 'M' | 'L' | 'XL'

const THUMBNAIL_SIZES: Record<ThumbnailSize, { width: string; gridCols: string; textAreaHeight: string }> = {
  S: { width: '120px', gridCols: 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8', textAreaHeight: 'max-h-10' },   // ~40px, ~2 lines
  M: { width: '180px', gridCols: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5', textAreaHeight: 'max-h-28' },   // ~112px, ~6 lines
  L: { width: '25vw', gridCols: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4', textAreaHeight: 'max-h-52' },    // ~208px, ~12 lines
  XL: { width: '35vw', gridCols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3', textAreaHeight: 'max-h-64' },   // ~256px, ~15 lines
}

const INCOMING_SIZE_STORAGE_KEY = 'incomingThumbnailSize'
const ASSIGNED_SIZE_STORAGE_KEY = 'assignedThumbnailSize'
const ASSIGNMENT_STATE_STORAGE_KEY = 'assetsAssignmentState'

interface AssignmentState {
  chapter: string
  sequence: string
  variant: VariantOption
  label: string
}

// FR-39: Convert text to kebab-case
function toKebabCase(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove invalid chars (keep spaces and existing dashes)
    .replace(/\s+/g, '-')          // Replace spaces with dashes
    .replace(/-+/g, '-')           // Collapse multiple dashes
    .replace(/^-|-$/g, '')         // Trim leading/trailing dashes
}

// Build preview filename using shared utility
function buildPreviewFilename(
  chapter: string,
  sequence: string,
  imageOrder: string,
  variant: string | null,
  label: string
): string {
  if (!chapter || !sequence || !label) return ''
  return buildImageFilename(chapter, sequence, imageOrder, variant, label, '.png')
}

export function AssetsPage() {
  const { data: config } = useConfig()
  const { data: suggestedNaming } = useSuggestedNaming()
  const { data: incomingData, isLoading: incomingLoading, error: incomingError } = useIncomingImages()
  const { data: projectData, isLoading: projectLoading } = useProjectImages()
  const { data: recordingsData } = useRecordings()
  const refetchIncoming = useRefetchIncomingImages()
  const assignMutation = useAssignImage()
  const deleteMutation = useDeleteIncomingImage()
  const savePromptMutation = useSavePrompt()
  const deletePromptMutation = useDeletePrompt()
  const deleteAssignedImageMutation = useDeleteAssignedImage()
  const clipboardAssignMutation = useClipboardAssign()
  const clipboardToIncomingMutation = useClipboardToIncoming()

  // FR-42: Clipboard paste state
  const [clipboardImageData, setClipboardImageData] = useState<string | null>(null)

  // NFR-5: Subscribe to socket events for real-time updates
  useAssetsSocket()

  // FR-20: Shift+Hover image preview
  const { shiftHeld, preview, handleMouseEnter, handlePreviewEnter, handleMouseMove, handleMouseLeave } = useShiftHover()

  // FR-22: Prompt editing state
  const [promptText, setPromptText] = useState('')
  const [editingPromptFilename, setEditingPromptFilename] = useState<string | null>(null)
  const { data: loadedPrompt } = useLoadPrompt(editingPromptFilename)

  // FR-39: Assignment controls state with localStorage persistence
  const [assignment, setAssignment] = useState<AssignmentState>(() => {
    // Try to restore from localStorage first
    const stored = localStorage.getItem(ASSIGNMENT_STATE_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return {
          chapter: parsed.chapter || '01',
          sequence: parsed.sequence || '1',
          variant: parsed.variant || null,
          label: parsed.label || '',
        }
      } catch {
        // Invalid JSON, use defaults
      }
    }
    return {
      chapter: '01',
      sequence: '1',
      variant: null,
      label: '',
    }
  })

  // Track if we've initialized from suggested naming
  const [initialized, setInitialized] = useState(() => {
    // If we restored from localStorage, consider it initialized
    return !!localStorage.getItem(ASSIGNMENT_STATE_STORAGE_KEY)
  })

  // FR-39: Save assignment state to localStorage on change
  useEffect(() => {
    localStorage.setItem(ASSIGNMENT_STATE_STORAGE_KEY, JSON.stringify(assignment))
  }, [assignment])

  // Initialize chapter/sequence from the last video created (only if not restored from localStorage)
  // suggestedNaming returns the NEXT values, so we subtract 1 from sequence to get current
  useEffect(() => {
    if (suggestedNaming && !initialized) {
      const nextSeq = parseInt(suggestedNaming.sequence, 10)
      const currentSeq = nextSeq > 1 ? nextSeq - 1 : 1
      setAssignment(prev => ({
        ...prev,
        chapter: suggestedNaming.chapter,
        sequence: String(currentSeq),
      }))
      setInitialized(true)
    }
  }, [suggestedNaming, initialized])

  // FR-22: Populate form when editing an existing prompt
  useEffect(() => {
    if (loadedPrompt) {
      setPromptText(loadedPrompt.content)
      setAssignment({
        chapter: loadedPrompt.chapter,
        sequence: loadedPrompt.sequence,
        variant: loadedPrompt.variant as VariantOption,
        label: loadedPrompt.label,
      })
    }
  }, [loadedPrompt])

  // Track which images are expanded for showing duplicates
  const [showDuplicates, setShowDuplicates] = useState(false)

  // FR-23: Thumbnail size state with localStorage persistence (separate for each section)
  const [incomingSize, setIncomingSize] = useState<ThumbnailSize>(() => {
    const stored = localStorage.getItem(INCOMING_SIZE_STORAGE_KEY)
    if (stored && ['S', 'M', 'L', 'XL'].includes(stored)) {
      return stored as ThumbnailSize
    }
    return 'L' // Default
  })

  const [assignedSize, setAssignedSize] = useState<ThumbnailSize>(() => {
    const stored = localStorage.getItem(ASSIGNED_SIZE_STORAGE_KEY)
    if (stored && ['S', 'M', 'L', 'XL'].includes(stored)) {
      return stored as ThumbnailSize
    }
    return 'L' // Default
  })

  const handleIncomingSizeChange = (size: ThumbnailSize) => {
    setIncomingSize(size)
    localStorage.setItem(INCOMING_SIZE_STORAGE_KEY, size)
  }

  const handleAssignedSizeChange = (size: ThumbnailSize) => {
    setAssignedSize(size)
    localStorage.setItem(ASSIGNED_SIZE_STORAGE_KEY, size)
  }

  // Build a map of chapters to their sequences from recordings data
  const chapterMap = useMemo(() => {
    const map = new Map<string, string[]>()
    if (!recordingsData?.recordings) return map

    for (const rec of recordingsData.recordings) {
      if (!map.has(rec.chapter)) {
        map.set(rec.chapter, [])
      }
      const sequences = map.get(rec.chapter)!
      if (!sequences.includes(rec.sequence)) {
        sequences.push(rec.sequence)
      }
    }

    // Sort sequences within each chapter
    for (const [chapter, sequences] of map) {
      map.set(chapter, sequences.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)))
    }

    return map
  }, [recordingsData?.recordings])

  // Get sorted list of chapters
  const sortedChapters = useMemo(() => {
    return Array.from(chapterMap.keys()).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
  }, [chapterMap])

  // Navigation: go to previous chapter's first sequence
  const goToPrevChapter = () => {
    const currentIdx = sortedChapters.indexOf(assignment.chapter)
    if (currentIdx > 0) {
      const prevChapter = sortedChapters[currentIdx - 1]
      const sequences = chapterMap.get(prevChapter) || ['1']
      setAssignment(prev => ({ ...prev, chapter: prevChapter, sequence: sequences[0] }))
    }
  }

  // Navigation: go to next chapter's first sequence
  const goToNextChapter = () => {
    const currentIdx = sortedChapters.indexOf(assignment.chapter)
    if (currentIdx < sortedChapters.length - 1) {
      const nextChapter = sortedChapters[currentIdx + 1]
      const sequences = chapterMap.get(nextChapter) || ['1']
      setAssignment(prev => ({ ...prev, chapter: nextChapter, sequence: sequences[0] }))
    }
  }

  // Navigation: go to previous sequence, or previous chapter's last sequence
  const goToPrevSequence = () => {
    const sequences = chapterMap.get(assignment.chapter) || []
    const currentIdx = sequences.indexOf(assignment.sequence)

    if (currentIdx > 0) {
      // Go to previous sequence in same chapter
      setAssignment(prev => ({ ...prev, sequence: sequences[currentIdx - 1] }))
    } else {
      // Go to previous chapter's last sequence
      const chapterIdx = sortedChapters.indexOf(assignment.chapter)
      if (chapterIdx > 0) {
        const prevChapter = sortedChapters[chapterIdx - 1]
        const prevSequences = chapterMap.get(prevChapter) || ['1']
        setAssignment(prev => ({
          ...prev,
          chapter: prevChapter,
          sequence: prevSequences[prevSequences.length - 1]
        }))
      }
    }
  }

  // Navigation: go to next sequence, or next chapter's first sequence
  const goToNextSequence = () => {
    const sequences = chapterMap.get(assignment.chapter) || []
    const currentIdx = sequences.indexOf(assignment.sequence)

    if (currentIdx < sequences.length - 1) {
      // Go to next sequence in same chapter
      setAssignment(prev => ({ ...prev, sequence: sequences[currentIdx + 1] }))
    } else {
      // Go to next chapter's first sequence
      const chapterIdx = sortedChapters.indexOf(assignment.chapter)
      if (chapterIdx < sortedChapters.length - 1) {
        const nextChapter = sortedChapters[chapterIdx + 1]
        const nextSequences = chapterMap.get(nextChapter) || ['1']
        setAssignment(prev => ({
          ...prev,
          chapter: nextChapter,
          sequence: nextSequences[0]
        }))
      }
    }
  }

  // Windowed view of recordings - show fixed number centered on current selection
  const VISIBLE_COUNT = 9
  const windowedRecordings = useMemo(() => {
    const recordings = recordingsData?.recordings || []
    if (recordings.length === 0) return { items: [], currentIndex: -1 }

    // Find the index of the first matching recording
    const currentIndex = recordings.findIndex(
      rec => rec.chapter === assignment.chapter && rec.sequence === assignment.sequence
    )

    if (currentIndex === -1) {
      // No match - show first VISIBLE_COUNT items
      return { items: recordings.slice(0, VISIBLE_COUNT), currentIndex: -1 }
    }

    // Calculate window to center current item
    const halfWindow = Math.floor(VISIBLE_COUNT / 2)
    let start = currentIndex - halfWindow
    let end = start + VISIBLE_COUNT

    // Adjust if we're near the edges
    if (start < 0) {
      start = 0
      end = Math.min(VISIBLE_COUNT, recordings.length)
    } else if (end > recordings.length) {
      end = recordings.length
      start = Math.max(0, end - VISIBLE_COUNT)
    }

    return {
      items: recordings.slice(start, end),
      currentIndex: currentIndex - start // Index within the window
    }
  }, [recordingsData?.recordings, assignment.chapter, assignment.sequence])

  // Get next image order based on current chapter/sequence
  const { data: nextOrderData } = useNextImageOrder(assignment.chapter, assignment.sequence)

  // Calculate image# based on variant:
  // - Server returns nextImageOrder (max + 1)
  // - If variant is set (a/b/c) -> use current max (nextImageOrder - 1), it's a variant of that image
  // - If no variant -> use nextImageOrder (it's a new image)
  const currentImageOrder = useMemo(() => {
    const nextOrder = parseInt(nextOrderData?.nextImageOrder || '1', 10)
    if (assignment.variant && nextOrder > 1) {
      return String(nextOrder - 1)  // Variant of current image
    }
    return String(nextOrder)  // New image
  }, [nextOrderData?.nextImageOrder, assignment.variant])

  // Filter incoming images (hide duplicates unless toggled)
  const visibleImages = useMemo(() => {
    if (!incomingData?.images) return []
    if (showDuplicates) return incomingData.images
    return incomingData.images.filter(img => !img.isDuplicate)
  }, [incomingData?.images, showDuplicates])

  const duplicateCount = incomingData?.duplicates?.length || 0

  // Label validation
  const labelError = assignment.label ? validateLabel(assignment.label) : null

  // Preview filename
  const previewFilename = buildPreviewFilename(
    assignment.chapter,
    assignment.sequence,
    currentImageOrder,
    assignment.variant,
    assignment.label
  )

  // Handle assign image
  const handleAssign = async (image: ImageInfo) => {
    if (labelError || !assignment.label) {
      toast.error('Please enter a valid label')
      return
    }

    try {
      const result = await assignMutation.mutateAsync({
        sourcePath: image.path,
        chapter: assignment.chapter,
        sequence: assignment.sequence,
        imageOrder: currentImageOrder,
        variant: assignment.variant,
        label: assignment.label,
      })

      if (result.success) {
        const filename = result.newPath.split('/').pop()
        toast.success(`Assigned as ${filename}`)

        // If using variant, advance to next variant
        if (assignment.variant) {
          const nextVariant = assignment.variant === 'a' ? 'b' :
                             assignment.variant === 'b' ? 'c' : null
          if (nextVariant) {
            setAssignment(prev => ({ ...prev, variant: nextVariant }))
          } else {
            // Reset variant after c
            setAssignment(prev => ({ ...prev, variant: null }))
          }
        }
      } else {
        toast.error(result.error || 'Failed to assign image')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign image')
    }
  }

  // Handle delete image
  const handleDelete = async (image: ImageInfo) => {
    try {
      await deleteMutation.mutateAsync(image.path)
      toast.success('Image deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete image')
    }
  }

  // FR-22: Handle save prompt
  // FR-38: Empty content triggers deletion (Option A)
  const handleSavePrompt = async () => {
    if (labelError || !assignment.label) {
      toast.error('Please enter a valid label')
      return
    }

    try {
      const result = await savePromptMutation.mutateAsync({
        chapter: assignment.chapter,
        sequence: assignment.sequence,
        imageOrder: currentImageOrder,
        variant: assignment.variant,
        label: assignment.label,
        content: promptText.trim(),  // Can be empty for deletion
      })

      if (result.success) {
        if (result.deleted) {
          toast.success('Prompt deleted')
        } else {
          const action = result.created ? 'Saved' : 'Updated'
          toast.success(`${action} prompt as ${result.filename}`)
        }
        // Clear prompt and editing state
        setPromptText('')
        setEditingPromptFilename(null)
      } else {
        toast.error(result.error || 'Failed to save prompt')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save prompt')
    }
  }

  // FR-38: Handle delete prompt directly (Option B)
  const handleDeletePrompt = async (filename: string) => {
    try {
      const result = await deletePromptMutation.mutateAsync(filename)
      if (result.success && result.deleted) {
        toast.success('Prompt deleted')
        // Clear editing state if we were editing this prompt
        if (editingPromptFilename === filename) {
          setPromptText('')
          setEditingPromptFilename(null)
        }
      } else if (result.success) {
        toast.info('Prompt not found')
      } else {
        toast.error(result.error || 'Failed to delete prompt')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete prompt')
    }
  }

  // FR-49: Handle delete assigned image
  const handleDeleteAssignedImage = async (filename: string) => {
    try {
      const result = await deleteAssignedImageMutation.mutateAsync(filename)
      if (result.success && result.deleted) {
        toast.success('Image deleted')
      } else if (result.success) {
        toast.info('Image not found')
      } else {
        toast.error(result.error || 'Failed to delete image')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete image')
    }
  }

  // FR-22: Handle clicking a prompt to edit it
  const handleEditPrompt = (prompt: PromptAsset) => {
    setEditingPromptFilename(prompt.filename)
  }

  // FR-22: Cancel editing and clear form
  const handleCancelEdit = () => {
    setEditingPromptFilename(null)
    setPromptText('')
  }

  // FR-40: Grab transcript for current chapter/sequence
  const handleGrabTranscript = async () => {
    // Find the first recording matching current chapter/sequence
    const matching = recordingsData?.recordings?.find(
      rec => rec.chapter === assignment.chapter && rec.sequence === assignment.sequence
    )

    if (!matching) {
      toast.error(`No recording found for ${assignment.chapter}-${assignment.sequence}`)
      return
    }

    try {
      // Fetch the transcript using the recording filename
      const res = await fetch(`${API_URL}/api/transcriptions/transcript/${encodeURIComponent(matching.filename)}`)

      if (!res.ok) {
        if (res.status === 404) {
          toast.error(`No transcript found for ${assignment.chapter}-${assignment.sequence}`)
        } else {
          toast.error('Failed to fetch transcript')
        }
        return
      }

      const data = await res.json()

      // Fill prompt with transcript content
      setPromptText(data.content)

      // Auto-fill label with "use-transcript" if empty
      if (!assignment.label) {
        setAssignment(prev => ({ ...prev, label: 'use-transcript' }))
      }

      toast.success('Transcript loaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch transcript')
    }
  }

  // Populate ALL controls from a paired asset (assignment fields + prompt)
  const handlePopulateFromPairedAsset = (pair: PairedAsset) => {
    // Set assignment controls
    setAssignment({
      chapter: pair.chapter,
      sequence: pair.sequence,
      variant: pair.variant as VariantOption,
      label: pair.label,
    })

    // Load prompt if it exists, otherwise clear the prompt area
    if (pair.prompt) {
      setEditingPromptFilename(pair.prompt.filename)
    } else {
      setEditingPromptFilename(null)
      setPromptText('')
    }

    toast.success(`Controls set to ${pair.chapter}-${pair.sequence}${pair.variant ? `-${pair.variant}` : ''} "${pair.label}"`)
  }

  // Update assignment from input
  const updateAssignment = (field: keyof AssignmentState, value: string | VariantOption) => {
    setAssignment(prev => ({ ...prev, [field]: value }))
  }

  // FR-42: Handle paste event for clipboard images
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    // Ignore if modal is already open or if we're in an input field
    if (clipboardImageData) return
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue

        // Convert to base64 data URL
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          setClipboardImageData(dataUrl)
        }
        reader.readAsDataURL(blob)
        return
      }
    }

    // No image in clipboard - only show toast if it looks like a paste attempt
    // (don't show toast for text paste)
  }, [clipboardImageData])

  // FR-42: Add/remove paste event listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  // FR-42: Handle clipboard assign
  const handleClipboardAssign = async () => {
    if (!clipboardImageData) return
    if (!assignment.label) {
      toast.error('Please enter a label first')
      return
    }

    try {
      const result = await clipboardAssignMutation.mutateAsync({
        imageData: clipboardImageData,
        chapter: assignment.chapter,
        sequence: assignment.sequence,
        imageOrder: currentImageOrder,
        variant: assignment.variant,
        label: assignment.label,
      })

      if (result.success) {
        toast.success(`Image assigned as ${result.filename}`)
        setClipboardImageData(null)
      } else {
        toast.error(result.error || 'Failed to assign image')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign image')
    }
  }

  // FR-42: Handle clipboard save to incoming
  const handleClipboardToIncoming = async () => {
    if (!clipboardImageData) return

    try {
      const result = await clipboardToIncomingMutation.mutateAsync(clipboardImageData)

      if (result.success) {
        toast.success(`Image saved to incoming: ${result.filename}`)
        setClipboardImageData(null)
      } else {
        toast.error(result.error || 'Failed to save image')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save image')
    }
  }

  return (
    <div className="space-y-6">
      {/* Assignment Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Assignment Controls</h3>

        <div className="grid grid-cols-3 gap-4">
          {/* Row 1: Chapter, Sequence, Preview (row-span-3) */}
          {/* Chapter */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Chapter</label>
            <div className="flex">
              <button
                onClick={goToPrevChapter}
                className="px-2.5 py-2 text-gray-600 hover:bg-gray-100 border border-r-0 border-gray-300 rounded-l transition-colors"
              >
                −
              </button>
              <input
                type="text"
                value={assignment.chapter}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 2)
                  updateAssignment('chapter', val.padStart(2, '0'))
                }}
                className="w-full px-3 py-2 text-sm font-mono text-center border-y border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="01"
              />
              <button
                onClick={goToNextChapter}
                className="px-2.5 py-2 text-gray-600 hover:bg-gray-100 border border-l-0 border-gray-300 rounded-r transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Sequence */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Sequence</label>
            <div className="flex">
              <button
                onClick={goToPrevSequence}
                className="px-2.5 py-2 text-gray-600 hover:bg-gray-100 border border-r-0 border-gray-300 rounded-l transition-colors"
              >
                −
              </button>
              <input
                type="text"
                value={assignment.sequence}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  updateAssignment('sequence', val || '1')
                }}
                className="w-full px-3 py-2 text-sm font-mono text-center border-y border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
              />
              <button
                onClick={goToNextSequence}
                className="px-2.5 py-2 text-gray-600 hover:bg-gray-100 border border-l-0 border-gray-300 rounded-r transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Recordings panel spanning 3 rows - windowed view */}
          <div className="row-span-3 border-l border-gray-100 pl-4">
            {/* Nav toolbar - full width */}
            <div className="flex items-center justify-center gap-1 text-sm bg-gray-50 border border-gray-200 rounded-lg p-1 mb-2">
              <button onClick={goToPrevChapter} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 font-medium">−</button>
              <span className="w-8 text-center text-gray-700 font-mono">{assignment.chapter}</span>
              <button onClick={goToNextChapter} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 font-medium">+</button>
              <div className="w-px h-5 bg-gray-300 mx-1"></div>
              <button onClick={goToPrevSequence} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 font-medium">−</button>
              <span className="w-6 text-center text-gray-700 font-mono">{assignment.sequence}</span>
              <button onClick={goToNextSequence} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 font-medium">+</button>
            </div>
            <div className="space-y-1">
              {windowedRecordings.items.map((rec, idx) => {
                const isCurrent = idx === windowedRecordings.currentIndex
                return (
                  <div
                    key={rec.path}
                    onClick={() => setAssignment(prev => ({ ...prev, chapter: rec.chapter, sequence: rec.sequence }))}
                    className={`px-2 py-1 rounded text-xs font-mono truncate cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    title={rec.filename}
                  >
                    {rec.filename.replace('.mov', '')}
                  </div>
                )
              })}
              {windowedRecordings.items.length === 0 && (
                <div className="text-xs text-gray-400 italic">No recordings</div>
              )}
            </div>
          </div>

          {/* Row 2: Variant, Image # */}
          {/* Variant */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Variant</label>
            <div className="flex">
              <button
                onClick={() => {
                  const variants: VariantOption[] = [null, 'a', 'b', 'c']
                  const currentIndex = variants.indexOf(assignment.variant)
                  const prevIndex = currentIndex > 0 ? currentIndex - 1 : variants.length - 1
                  updateAssignment('variant', variants[prevIndex])
                }}
                className="px-2.5 py-2 text-gray-600 hover:bg-gray-100 border border-r-0 border-gray-300 rounded-l transition-colors"
              >
                −
              </button>
              <div className="w-full px-3 py-2 text-sm font-mono text-center border-y border-gray-300 bg-white">
                {assignment.variant === null ? 'None' : assignment.variant.toUpperCase()}
              </div>
              <button
                onClick={() => {
                  const variants: VariantOption[] = [null, 'a', 'b', 'c']
                  const currentIndex = variants.indexOf(assignment.variant)
                  const nextIndex = currentIndex < variants.length - 1 ? currentIndex + 1 : 0
                  updateAssignment('variant', variants[nextIndex])
                }}
                className="px-2.5 py-2 text-gray-600 hover:bg-gray-100 border border-l-0 border-gray-300 rounded-r transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Image Order (auto) */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Image #</label>
            <input
              type="text"
              value={currentImageOrder}
              disabled
              className="w-full px-3 py-2 text-sm font-mono text-center border border-gray-200 rounded bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">Auto-calculated</p>
          </div>

          {/* Row 3: Label spanning 2 columns */}
          {/* FR-39: Auto-kebab-case on blur and paste */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Label</label>
            <input
              type="text"
              value={assignment.label}
              onChange={(e) => {
                // Allow typing with spaces - will be converted on blur
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, '')
                updateAssignment('label', val)
              }}
              onBlur={(e) => {
                // Convert to kebab-case on blur
                const kebab = toKebabCase(e.target.value)
                if (kebab !== assignment.label) {
                  updateAssignment('label', kebab)
                }
              }}
              onPaste={(e) => {
                // Intercept paste and convert to kebab-case
                e.preventDefault()
                const pasted = e.clipboardData.getData('text')
                const kebab = toKebabCase(pasted)
                updateAssignment('label', kebab)
              }}
              className={`w-full px-3 py-2 text-sm font-mono border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                labelError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="workflow-diagram (or paste/type with spaces)"
            />
            {labelError && <p className="text-xs text-red-500 mt-1">{labelError}</p>}
          </div>
        </div>

        {/* Preview filename */}
        {previewFilename && (
          <div className="mt-4 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono text-gray-700">
            {previewFilename}
          </div>
        )}

        {/* FR-22: Image Prompt section */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-gray-600">
              Image Prompt
              {editingPromptFilename && (
                <span className="ml-2 text-xs text-blue-600">(editing: {editingPromptFilename})</span>
              )}
            </label>
            {editingPromptFilename && (
              <button
                onClick={handleCancelEdit}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel edit
              </button>
            )}
          </div>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="Describe the image you want generated..."
          />
          <div className="flex justify-between items-center mt-2">
            {/* FR-40: Grab Transcript button */}
            <button
              onClick={handleGrabTranscript}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex items-center gap-1"
              title={`Load transcript for ${assignment.chapter}-${assignment.sequence}`}
            >
              <span>📄</span>
              <span>Grab Transcript</span>
            </button>

            <button
              onClick={handleSavePrompt}
              disabled={!assignment.label || !!labelError || savePromptMutation.isPending || (!promptText.trim() && !editingPromptFilename)}
              className={`px-4 py-2 text-sm rounded transition-colors ${
                assignment.label && !labelError && (promptText.trim() || editingPromptFilename)
                  ? !promptText.trim() && editingPromptFilename
                    ? 'bg-red-500 text-white hover:bg-red-600'  // Delete mode
                    : 'bg-purple-500 text-white hover:bg-purple-600'  // Save/Update mode
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {savePromptMutation.isPending
                ? 'Saving...'
                : !promptText.trim() && editingPromptFilename
                  ? 'Delete Prompt'
                  : editingPromptFilename
                    ? 'Update Prompt'
                    : 'Save Prompt'
              }
            </button>
          </div>
        </div>
      </div>

      {/* Incoming Images - breaks out to full viewport width */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">
                Incoming Images
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({config?.imageSourceDirectory ? collapsePath(config.imageSourceDirectory) : '~/Downloads'})
                </span>
              </h3>
              <OpenFolderButton folder="downloads" />
            </div>
            <div className="flex items-center gap-3">
              {/* FR-23: Thumbnail size toggle */}
              <div className="flex items-center gap-1">
                {(['S', 'M', 'L', 'XL'] as ThumbnailSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => handleIncomingSizeChange(size)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      incomingSize === size
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-500 hover:bg-gray-100 border border-gray-200'
                    }`}
                    title={`${size === 'S' ? 'Small' : size === 'M' ? 'Medium' : size === 'L' ? 'Large' : 'Extra Large'} thumbnails`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <button
                onClick={() => refetchIncoming()}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Duplicate warning */}
          {duplicateCount > 0 && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm">
              <span className="text-amber-600">
                {duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''} {showDuplicates ? 'shown' : 'hidden'}
              </span>
              <button
                onClick={() => setShowDuplicates(!showDuplicates)}
                className="text-amber-700 hover:text-amber-900 underline"
              >
                {showDuplicates ? 'Hide' : 'Show'}
              </button>
            </div>
          )}

          {incomingLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading images...</p>
            </div>
          ) : incomingError ? (
            <div className="text-center py-12">
              <p className="text-red-500">Error loading images</p>
            </div>
          ) : visibleImages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No images found in Downloads</p>
              <p className="text-sm text-gray-400 mt-1">
                Images will appear here when you save from ChatGPT, Midjourney, or other tools
              </p>
            </div>
          ) : (
            <div className={`grid ${THUMBNAIL_SIZES[incomingSize].gridCols} gap-4`}>
              {visibleImages.map((image) => (
                <ImageCard
                  key={image.path}
                  image={image}
                  onAssign={() => handleAssign(image)}
                  onDelete={() => handleDelete(image)}
                  isAssigning={assignMutation.isPending}
                  isDeleting={deleteMutation.isPending}
                  canAssign={!!assignment.label && !labelError}
                  shiftHeld={shiftHeld}
                  onPreviewEnter={handleMouseEnter}
                  onPreviewMove={handleMouseMove}
                  onPreviewLeave={handleMouseLeave}
                  thumbnailSize={incomingSize}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assigned Assets - full width like Incoming Images */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">
                Assigned Assets
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({projectData?.images?.length || 0} images, {projectData?.prompts?.length || 0} prompts)
                </span>
              </h3>
              <OpenFolderButton folder="images" />
            </div>
            {/* FR-23: Thumbnail size toggle for assigned assets */}
            <div className="flex items-center gap-1">
              {(['S', 'M', 'L', 'XL'] as ThumbnailSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => handleAssignedSizeChange(size)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    assignedSize === size
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-500 hover:bg-gray-100 border border-gray-200'
                  }`}
                  title={`${size === 'S' ? 'Small' : size === 'M' ? 'Medium' : size === 'L' ? 'Large' : 'Extra Large'} thumbnails`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {projectLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : (!projectData?.images || projectData.images.length === 0) && (!projectData?.prompts || projectData.prompts.length === 0) ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No assets assigned to this project yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(() => {
                // Group images and prompts by base filename (without extension)
                const pairedAssets = new Map<string, PairedAsset>()

                // Process images
                for (const image of projectData?.images || []) {
                  const baseFilename = image.filename.replace(/\.(png|jpg|jpeg|webp)$/i, '')
                  pairedAssets.set(baseFilename, {
                    baseFilename,
                    image,
                    prompt: null,
                    chapter: image.chapter,
                    sequence: image.sequence,
                    imageOrder: image.imageOrder,
                    variant: image.variant,
                    label: image.label,
                  })
                }

                // Process prompts - pair with existing images or create standalone
                for (const prompt of projectData?.prompts || []) {
                  const baseFilename = prompt.filename.replace(/\.txt$/i, '')
                  const existing = pairedAssets.get(baseFilename)
                  if (existing) {
                    existing.prompt = prompt
                  } else {
                    // Prompt-only asset
                    pairedAssets.set(baseFilename, {
                      baseFilename,
                      image: null,
                      prompt,
                      chapter: prompt.chapter,
                      sequence: prompt.sequence,
                      imageOrder: prompt.imageOrder,
                      variant: prompt.variant,
                      label: prompt.label,
                    })
                  }
                }

                // Convert to array and sort
                const sortedPairs = Array.from(pairedAssets.values()).sort((a, b) => {
                  const chapterDiff = parseInt(a.chapter, 10) - parseInt(b.chapter, 10)
                  if (chapterDiff !== 0) return chapterDiff

                  const seqDiff = parseInt(a.sequence, 10) - parseInt(b.sequence, 10)
                  if (seqDiff !== 0) return seqDiff

                  const orderDiff = parseInt(a.imageOrder, 10) - parseInt(b.imageOrder, 10)
                  if (orderDiff !== 0) return orderDiff

                  const aVariant = a.variant || ''
                  const bVariant = b.variant || ''
                  return aVariant.localeCompare(bVariant)
                })

                // Track chapter-sequence groups for alternating colors
                const seenGroups = new Map<string, number>()
                let groupIndex = 0

                return sortedPairs.map((pair) => {
                  const groupKey = `${pair.chapter}-${pair.sequence}`

                  if (!seenGroups.has(groupKey)) {
                    seenGroups.set(groupKey, groupIndex++)
                  }
                  const isEvenGroup = (seenGroups.get(groupKey)! % 2) === 0

                  const hasImage = pair.image !== null
                  const hasPrompt = pair.prompt !== null
                  const imageUrl = hasImage
                    ? `${API_URL}/api/assets/image/${encodeURIComponent(pair.image!.path)}`
                    : null

                  const imagePreviewData = hasImage ? {
                    url: imageUrl!,
                    filename: pair.image!.filename,
                    size: pair.image!.size,
                    timestamp: pair.image!.timestamp,
                  } : null

                  // Text preview for prompt Shift+Hover - uses full content, not truncated preview
                  const textPreviewData: TextPreview | null = hasPrompt ? {
                    type: 'text',
                    content: pair.prompt!.content || pair.prompt!.contentPreview || 'Empty prompt',
                    filename: pair.prompt!.filename,
                  } : null

                  return (
                    <div
                      key={pair.baseFilename}
                      onClick={() => handlePopulateFromPairedAsset(pair)}
                      className={`flex items-center gap-4 px-3 py-2 rounded text-sm border-l-4 cursor-pointer hover:opacity-80 ${
                        isEvenGroup
                          ? 'border-l-blue-400 bg-blue-50'
                          : 'border-l-amber-400 bg-amber-50'
                      }`}
                    >
                      {/* Thumbnail or placeholder */}
                      {hasImage ? (
                        <div
                          className={`aspect-video flex-shrink-0 bg-gray-200 rounded overflow-hidden ${shiftHeld ? 'cursor-zoom-in' : ''}`}
                          style={{ width: THUMBNAIL_SIZES[assignedSize].width }}
                          onMouseEnter={(e) => handleMouseEnter(imagePreviewData, e)}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                        >
                          <img
                            src={imageUrl!}
                            alt={pair.image!.filename}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div
                          className="aspect-video flex-shrink-0 bg-gray-100 rounded flex items-center justify-center text-2xl text-gray-400"
                          style={{ width: THUMBNAIL_SIZES[assignedSize].width }}
                        >
                          📝
                        </div>
                      )}

                      {/* Video link - find matching recording filename */}
                      <span className="w-48 flex-shrink-0 font-mono text-gray-600 text-xs truncate">
                        {recordingsData?.recordings?.find(
                          rec => rec.chapter === pair.chapter && rec.sequence === pair.sequence
                        )?.filename.replace('.mov', '') || `${pair.chapter}-${pair.sequence}`}
                      </span>

                      {/* Filename with extension and variant badge */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono text-gray-700 text-xs">
                          {hasImage ? pair.image!.filename : `${pair.baseFilename}.txt`}
                        </span>

                        {/* Variant badge - colored: A=green, B=yellow, C=blue */}
                        {pair.variant && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            pair.variant === 'a' ? 'bg-green-100 text-green-700' :
                            pair.variant === 'b' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {pair.variant.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Prompt area - multi-line textarea style, Shift+Hover shows full preview */}
                      {hasPrompt ? (
                        <div
                          className={`flex-grow min-w-0 px-2 py-1.5 border rounded text-xs ${THUMBNAIL_SIZES[assignedSize].textAreaHeight} overflow-y-auto ${
                            shiftHeld
                              ? 'bg-purple-50 border-purple-300 text-purple-700 cursor-help'
                              : 'bg-white border-purple-200 text-gray-600'
                          }`}
                          onMouseEnter={(e) => handlePreviewEnter(textPreviewData, e)}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                          title="Shift+hover to preview full prompt"
                        >
                          <pre className="whitespace-pre-wrap font-sans text-xs leading-snug m-0">
                            {pair.prompt!.content || pair.prompt!.contentPreview || 'Empty prompt'}
                          </pre>
                        </div>
                      ) : (
                        <div className="flex-grow" />
                      )}

                      {/* FR-38: Delete prompt button (Option B) */}
                      {hasPrompt && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()  // Prevent row click
                            handleDeletePrompt(pair.prompt!.filename)
                          }}
                          disabled={deletePromptMutation.isPending}
                          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete prompt"
                        >
                          🗑️
                        </button>
                      )}

                      {/* FR-49: Delete image button */}
                      {hasImage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()  // Prevent row click
                            handleDeleteAssignedImage(pair.image!.filename)
                          }}
                          disabled={deleteAssignedImageMutation.isPending}
                          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete image"
                        >
                          🗑️
                        </button>
                      )}

                      {/* File size */}
                      <span className="text-gray-400 flex-shrink-0">
                        {hasImage ? formatFileSize(pair.image!.size) : '-'}
                      </span>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>
      </div>

      {/* FR-20: Shift+Hover preview overlay (supports image and text) */}
      <ImagePreviewOverlay content={preview.content} position={preview.position} />

      {/* FR-42: Clipboard Paste Modal */}
      {clipboardImageData && (
        <ClipboardPasteModal
          imageData={clipboardImageData}
          previewFilename={previewFilename}
          onAssign={handleClipboardAssign}
          onSaveToIncoming={handleClipboardToIncoming}
          onCancel={() => setClipboardImageData(null)}
          isAssigning={clipboardAssignMutation.isPending}
          isSavingToIncoming={clipboardToIncomingMutation.isPending}
        />
      )}
    </div>
  )
}

// Image card component
interface ImageCardProps {
  image: ImageInfo
  onAssign: () => void
  onDelete: () => void
  isAssigning: boolean
  isDeleting: boolean
  canAssign: boolean
  shiftHeld: boolean
  onPreviewEnter: (image: { url: string; filename: string; size: number; timestamp: string }, e: React.MouseEvent) => void
  onPreviewMove: (e: React.MouseEvent) => void
  onPreviewLeave: () => void
  thumbnailSize: ThumbnailSize
}

function ImageCard({ image, onAssign, onDelete, isAssigning, isDeleting, canAssign, shiftHeld, onPreviewEnter, onPreviewMove, onPreviewLeave, thumbnailSize }: ImageCardProps) {
  const isSmall = thumbnailSize === 'S'
  const imageUrl = `${API_URL}/api/assets/image/${encodeURIComponent(image.path)}`

  const previewData = {
    url: imageUrl,
    filename: image.filename,
    size: image.size,
    timestamp: image.timestamp,
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${
      image.isDuplicate ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
    }`}>
      {/* Thumbnail */}
      <div
        className={`aspect-video bg-gray-100 relative ${shiftHeld ? 'cursor-zoom-in' : ''}`}
        onMouseEnter={(e) => onPreviewEnter(previewData, e)}
        onMouseMove={onPreviewMove}
        onMouseLeave={onPreviewLeave}
      >
        <img
          src={imageUrl}
          alt={image.filename}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info - hide on small size */}
      {!isSmall && (
        <div className="p-2 text-xs text-gray-500">
          {image.isDuplicate ? (
            <div className="text-amber-600 font-medium">Duplicate</div>
          ) : (
            <>
              <div>{formatFileSize(image.size)}</div>
              <div>{formatTime(image.timestamp)}</div>
            </>
          )}
        </div>
      )}

      {/* Actions - compact on small size */}
      <div className={`${isSmall ? 'p-1' : 'p-2 pt-0'} space-y-1`}>
        {!image.isDuplicate && (
          <button
            onClick={onAssign}
            disabled={isAssigning || !canAssign}
            className={`w-full px-2 ${isSmall ? 'py-1 text-[10px]' : 'py-1.5 text-xs'} rounded transition-colors ${
              canAssign
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isAssigning ? '...' : 'Assign'}
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className={`w-full px-2 ${isSmall ? 'py-1 text-[10px]' : 'py-1.5 text-xs'} text-red-600 hover:bg-red-50 rounded transition-colors`}
        >
          {isDeleting ? '...' : 'Del'}
        </button>
      </div>
    </div>
  )
}
