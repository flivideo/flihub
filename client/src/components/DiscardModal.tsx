interface DiscardModalProps {
  remainingCount: number
  onConfirm: () => void
  onCancel: () => void
}

export function DiscardModal({ remainingCount, onConfirm, onCancel }: DiscardModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Discard remaining files?
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {remainingCount === 1
            ? 'There is 1 file remaining. Move it to trash?'
            : `There are ${remainingCount} files remaining. Move them to trash?`}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Yes, discard
          </button>
        </div>
      </div>
    </div>
  )
}
