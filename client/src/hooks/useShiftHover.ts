import { useState, useEffect, useCallback } from 'react'

interface ImagePreview {
  type: 'image'
  url: string
  filename: string
  size: number
  timestamp: string
}

interface TextPreview {
  type: 'text'
  content: string
  filename: string
}

type PreviewContent = ImagePreview | TextPreview | null

interface PreviewState {
  content: PreviewContent
  position: { x: number; y: number }
}

// Legacy type for backwards compatibility
type LegacyImageData = {
  url: string
  filename: string
  size: number
  timestamp: string
} | null

interface UseShiftHoverReturn {
  shiftHeld: boolean
  preview: PreviewState
  /** @deprecated Use handlePreviewEnter instead */
  handleMouseEnter: (image: LegacyImageData, e: React.MouseEvent) => void
  handlePreviewEnter: (content: PreviewContent, e: React.MouseEvent) => void
  handleMouseMove: (e: React.MouseEvent) => void
  handleMouseLeave: () => void
}

/**
 * Hook for implementing Shift+Hover preview functionality.
 * Supports both image and text previews.
 *
 * Usage:
 * 1. Use shiftHeld to conditionally show preview-related UI cues
 * 2. Attach handlePreviewEnter/handleMouseMove/handleMouseLeave to elements
 * 3. Render PreviewOverlay with the preview state
 */
export function useShiftHover(): UseShiftHoverReturn {
  const [shiftHeld, setShiftHeld] = useState(false)
  const [preview, setPreview] = useState<PreviewState>({
    content: null,
    position: { x: 0, y: 0 },
  })

  // Track Shift key state globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftHeld(false)
        // Clear preview when Shift is released
        setPreview(prev => ({ ...prev, content: null }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Handle mouse entering an element with preview content
  const handlePreviewEnter = useCallback(
    (content: PreviewContent, e: React.MouseEvent) => {
      if (shiftHeld && content) {
        setPreview({
          content,
          position: { x: e.clientX, y: e.clientY },
        })
      }
    },
    [shiftHeld]
  )

  // Legacy handler for backwards compatibility - converts to new format
  const handleMouseEnter = useCallback(
    (image: LegacyImageData, e: React.MouseEvent) => {
      if (shiftHeld && image) {
        const imageContent: ImagePreview = {
          type: 'image',
          ...image,
        }
        setPreview({
          content: imageContent,
          position: { x: e.clientX, y: e.clientY },
        })
      }
    },
    [shiftHeld]
  )

  // Handle mouse moving over an element
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (shiftHeld && preview.content) {
        setPreview(prev => ({
          ...prev,
          position: { x: e.clientX, y: e.clientY },
        }))
      }
    },
    [shiftHeld, preview.content]
  )

  // Handle mouse leaving an element
  const handleMouseLeave = useCallback(() => {
    setPreview(prev => ({ ...prev, content: null }))
  }, [])

  return {
    shiftHeld,
    preview,
    handleMouseEnter,
    handlePreviewEnter,
    handleMouseMove,
    handleMouseLeave,
  }
}

// Export types for use in other components
export type { ImagePreview, TextPreview, PreviewContent, PreviewState }
