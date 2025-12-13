import { createPortal } from 'react-dom'
import { formatFileSize } from '../utils/formatting'
import type { PreviewContent } from '../hooks/useShiftHover'

// Legacy interface for backwards compatibility
interface LegacyPreviewImage {
  url: string
  filename: string
  size: number
  timestamp: string
}

interface ImagePreviewOverlayProps {
  image?: LegacyPreviewImage | null
  content?: PreviewContent
  position: { x: number; y: number }
}

const PREVIEW_WIDTH = 600
const PREVIEW_PADDING = 20

/**
 * Preview overlay that appears when Shift+hovering over thumbnails or prompt badges.
 * Supports both image and text previews.
 * Uses a portal to render at document root to avoid z-index issues.
 */
export function ImagePreviewOverlay({ image, content, position }: ImagePreviewOverlayProps) {
  // Support both legacy image prop and new content prop
  const previewContent = content ?? (image ? { type: 'image' as const, ...image } : null)

  if (!previewContent) return null

  // Calculate position, clamped to stay within viewport
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Start with cursor position, offset slightly
  let left = position.x + PREVIEW_PADDING
  let top = position.y + PREVIEW_PADDING

  // Clamp horizontal position
  if (left + PREVIEW_WIDTH > viewportWidth - PREVIEW_PADDING) {
    // Show on left side of cursor instead
    left = position.x - PREVIEW_WIDTH - PREVIEW_PADDING
  }
  if (left < PREVIEW_PADDING) {
    left = PREVIEW_PADDING
  }

  // Estimate preview height based on content type
  const estimatedHeight = previewContent.type === 'image'
    ? PREVIEW_WIDTH * 0.5625 + 80 // 16:9 aspect + info
    : 300 // Text preview

  // Clamp vertical position
  if (top + estimatedHeight > viewportHeight - PREVIEW_PADDING) {
    top = viewportHeight - estimatedHeight - PREVIEW_PADDING
  }
  if (top < PREVIEW_PADDING) {
    top = PREVIEW_PADDING
  }

  const overlay = (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${PREVIEW_WIDTH}px`,
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        {previewContent.type === 'image' ? (
          <>
            {/* Large image */}
            <div className="aspect-video bg-gray-100">
              <img
                src={previewContent.url}
                alt={previewContent.filename}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Info panel */}
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <div className="font-mono text-sm text-gray-800 truncate">
                {previewContent.filename}
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                <span>{formatFileSize(previewContent.size)}</span>
                <span>{new Date(previewContent.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Text content - ~20 visible lines, scrollable if longer */}
            <div className="p-4 min-h-48 max-h-[500px] overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                {previewContent.content}
              </pre>
            </div>

            {/* Info panel with filename and size */}
            <div className="p-3 bg-purple-50 border-t border-purple-200 flex justify-between items-center">
              <div className="font-mono text-sm text-purple-800 truncate">
                {previewContent.filename}
              </div>
              <div className="text-xs text-purple-600">
                {previewContent.content.length} chars
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
