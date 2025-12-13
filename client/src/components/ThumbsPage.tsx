import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  useZipFiles,
  useZipContents,
  useThumbs,
  useImportFromZip,
  useReorderThumbs,
  useDeleteThumb,
  useDeleteZip,
  type ZipInfo,
  type ZipImagePreview,
  type ThumbInfo,
} from '../hooks/useThumbsApi'
import { QUERY_KEYS } from '../constants/queryKeys'
import { useThumbsSocket } from '../hooks/useSocket'
import { OpenFolderButton } from './shared'
import { API_URL } from '../config'
import { formatFileSize } from '../utils/formatting'

// Thumbnail size options (reused pattern from AssetsPage)
type ThumbnailSize = 'S' | 'M' | 'L' | 'XL'

const THUMBNAIL_SIZES: Record<ThumbnailSize, { width: string; label: string }> = {
  S: { width: '80px', label: 'S' },
  M: { width: '120px', label: 'M' },
  L: { width: '180px', label: 'L' },
  XL: { width: '240px', label: 'XL' },
}

// Preview data for Shift+Hover
interface PreviewData {
  src: string
  name: string
  x: number
  y: number
}

export function ThumbsPage() {
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>('M')
  const [selectedZip, setSelectedZip] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)

  // NFR-5: Subscribe to socket events for ZIP file changes only
  // (thumbs folder changes per project, so socket watching is unreliable)
  useThumbsSocket()

  const queryClient = useQueryClient()

  // Queries
  const { data: zipsData, isLoading: zipsLoading } = useZipFiles()
  const { data: zipContentsData, isLoading: contentsLoading } = useZipContents(selectedZip)
  const { data: thumbsData, isLoading: thumbsLoading } = useThumbs()

  // Mutations
  const importMutation = useImportFromZip()
  const reorderMutation = useReorderThumbs()
  const deleteMutation = useDeleteThumb()
  const deleteZipMutation = useDeleteZip()

  const zips = zipsData?.zips || []
  const zipImages = zipContentsData?.images || []
  const thumbs = thumbsData?.thumbs || []

  // Handle ZIP selection
  const handlePreviewZip = useCallback((filename: string) => {
    setSelectedZip(filename)
    setSelectedImages([])
  }, [])

  // Handle image selection (max 3)
  const handleImageToggle = useCallback((imageName: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(imageName)) {
        return prev.filter((n) => n !== imageName)
      }
      if (prev.length >= 3) {
        toast.warning('Maximum 3 thumbnails allowed')
        return prev
      }
      return [...prev, imageName]
    })
  }, [])

  // Import selected images
  const handleImport = useCallback(async () => {
    if (!selectedZip || selectedImages.length === 0) return

    try {
      await importMutation.mutateAsync({
        zipFilename: selectedZip,
        selectedImages,
      })
      toast.success(`Imported ${selectedImages.length} thumbnail(s)`)
      setSelectedZip(null)
      setSelectedImages([])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed')
    }
  }, [selectedZip, selectedImages, importMutation])

  // Delete a thumbnail
  const handleDelete = useCallback(async (filename: string) => {
    try {
      await deleteMutation.mutateAsync(filename)
      toast.success('Thumbnail deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    }
  }, [deleteMutation])

  // Delete a ZIP file from Downloads
  const handleDeleteZip = useCallback(async (filename: string) => {
    try {
      await deleteZipMutation.mutateAsync(filename)
      toast.success('ZIP file deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    }
  }, [deleteZipMutation])

  // Drag and drop reordering
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(async (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    // Reorder the array
    const newOrder = [...thumbs]
    const [dragged] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(dropIndex, 0, dragged)

    try {
      await reorderMutation.mutateAsync(newOrder.map((t) => t.filename))
      toast.success('Thumbnails reordered')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reorder failed')
    }

    setDraggedIndex(null)
  }, [draggedIndex, thumbs, reorderMutation])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
  }, [])

  // Shift+Hover preview handlers
  const handlePreviewEnter = useCallback((e: React.MouseEvent, src: string, name: string) => {
    if (e.shiftKey) {
      setPreviewData({ src, name, x: e.clientX, y: e.clientY })
    }
  }, [])

  const handlePreviewLeave = useCallback(() => {
    setPreviewData(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* Size Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Size:</span>
        <div className="flex gap-1">
          {(Object.keys(THUMBNAIL_SIZES) as ThumbnailSize[]).map((size) => (
            <button
              key={size}
              onClick={() => setThumbnailSize(size)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                thumbnailSize === size
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.thumbs })
            queryClient.refetchQueries({ queryKey: QUERY_KEYS.thumbs })
          }}
          className="ml-auto px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Refresh Thumbs
        </button>
      </div>

      {/* Current Thumbnails */}
      <section className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            Current Thumbnails ({thumbs.length}/3)
          </h3>
          <OpenFolderButton folder="thumbs" />
        </div>

        {thumbsLoading ? (
          <p className="text-sm text-gray-500">Loading thumbnails...</p>
        ) : thumbs.length === 0 ? (
          <p className="text-sm text-gray-500">No thumbnails yet. Import from a ZIP file below.</p>
        ) : (
          <div className="space-y-2">
            {thumbs.map((thumb: ThumbInfo, index: number) => (
              <div
                key={thumb.filename}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-2 rounded border transition-colors cursor-move ${
                  draggedIndex === index
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="text-gray-400 text-sm w-6">☰</span>
                <img
                  src={`${API_URL}/api/thumbs/image/${encodeURIComponent(thumb.filename)}?t=${encodeURIComponent(thumb.timestamp)}`}
                  alt={thumb.filename}
                  style={{ width: THUMBNAIL_SIZES[thumbnailSize].width }}
                  className="rounded object-cover cursor-pointer"
                  onMouseEnter={(e) => handlePreviewEnter(
                    e,
                    `${API_URL}/api/thumbs/image/${encodeURIComponent(thumb.filename)}?t=${encodeURIComponent(thumb.timestamp)}`,
                    thumb.filename
                  )}
                  onMouseLeave={handlePreviewLeave}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{thumb.filename}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(thumb.size)}</p>
                </div>
                <button
                  onClick={() => handleDelete(thumb.filename)}
                  disabled={deleteMutation.isPending}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Delete thumbnail"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ZIP Files Section */}
      <section className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            Import from ZIP ({zips.length} available)
          </h3>
          <OpenFolderButton folder="downloads" />
        </div>

        {zipsLoading ? (
          <p className="text-sm text-gray-500">Scanning Downloads folder...</p>
        ) : zips.length === 0 ? (
          <p className="text-sm text-gray-500">
            No ZIP files with images found in ~/Downloads
          </p>
        ) : (
          <div className="space-y-2">
            {zips.map((zip: ZipInfo) => (
              <div
                key={zip.filename}
                className="flex items-center justify-between p-2 rounded border border-gray-200 hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{zip.filename}</p>
                  <p className="text-xs text-gray-500">
                    {zip.imageCount} images &middot; {formatFileSize(zip.size)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePreviewZip(zip.filename)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    Preview →
                  </button>
                  <button
                    onClick={() => handleDeleteZip(zip.filename)}
                    disabled={deleteZipMutation.isPending}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Delete ZIP file"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ZIP Preview Modal */}
      {selectedZip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Select Thumbnails</h3>
                <p className="text-sm text-gray-500">{selectedZip} &middot; Select up to 3 images</p>
              </div>
              <button
                onClick={() => {
                  setSelectedZip(null)
                  setSelectedImages([])
                }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {contentsLoading ? (
                <p className="text-sm text-gray-500">Loading images...</p>
              ) : zipImages.length === 0 ? (
                <p className="text-sm text-gray-500">No images found in ZIP</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {zipImages.map((image: ZipImagePreview) => {
                    const isSelected = selectedImages.includes(image.name)
                    const selectionIndex = selectedImages.indexOf(image.name)
                    return (
                      <div
                        key={image.name}
                        onClick={() => handleImageToggle(image.name)}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={image.dataUrl}
                          alt={image.name}
                          className="w-full aspect-video object-cover"
                          onMouseEnter={(e) => handlePreviewEnter(e, image.dataUrl, image.name)}
                          onMouseLeave={handlePreviewLeave}
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {selectionIndex + 1}
                          </div>
                        )}
                        <div className="p-2 bg-white">
                          <p className="text-xs text-gray-700 truncate">{image.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(image.size)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedImages.length} of 3 selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedZip(null)
                    setSelectedImages([])
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedImages.length === 0 || importMutation.isPending}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importMutation.isPending ? 'Importing...' : `Import ${selectedImages.length} Selected`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift+Hover Preview Overlay */}
      {previewData && createPortal(
        <div
          className="fixed pointer-events-none z-[100]"
          style={{
            left: Math.min(previewData.x + 16, window.innerWidth - 520),
            top: Math.min(previewData.y - 150, window.innerHeight - 350),
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl border border-gray-300 overflow-hidden">
            <img
              src={previewData.src}
              alt={previewData.name}
              className="max-w-[500px] max-h-[300px] object-contain"
            />
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-700 truncate">{previewData.name}</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
