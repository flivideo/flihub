// FR-102: Edit Prep Page
import { useEditPrep, useCreateEditFolders } from '../hooks/useEditApi'
import { useOpenFolder } from '../hooks/useApi'
import { toast } from 'sonner'

interface EditPrepPageProps {
  onClose: () => void
}

export function EditPrepPage({ onClose }: EditPrepPageProps) {
  const { data, isLoading } = useEditPrep()
  const createFolders = useCreateEditFolders()
  const openFolder = useOpenFolder()

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${bytes} B`
  }

  const handleCopyFilename = async () => {
    if (!data?.glingFilename) return
    try {
      await navigator.clipboard.writeText(data.glingFilename)
      toast.success('Filename copied')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleCopyDictionary = async () => {
    if (!data?.glingDictionary?.length) return
    try {
      await navigator.clipboard.writeText(data.glingDictionary.join('\n'))
      toast.success('Dictionary copied')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleOpenRecordings = () => {
    openFolder.mutate({ folderKey: 'recordings' })
  }

  const handleCreateFolders = () => {
    createFolders.mutate()
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <span className="text-gray-500">Loading...</span>
        </div>
      </div>
    )
  }

  if (!data?.success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <p className="text-red-500">{data?.error || 'No project selected'}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Prep</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Project */}
          <div className="text-sm text-gray-500">
            PROJECT: <span className="font-medium text-gray-900">{data.project.fullCode}</span>
          </div>

          {/* Gling Filename */}
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Gling Filename</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 font-mono text-sm text-gray-800">
                {data.glingFilename}
              </div>
              <button
                onClick={handleCopyFilename}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Use this as the export filename in Gling</p>
          </div>

          {/* Dictionary Words */}
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Dictionary Words</h3>
            <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 max-h-24 overflow-y-auto">
              {data.glingDictionary.length > 0
                ? data.glingDictionary.join(', ')
                : <span className="text-gray-400">(none configured)</span>}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCopyDictionary}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!data.glingDictionary.length}
              >
                Copy All
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Paste into Gling's custom dictionary for better transcription</p>
          </div>

          {/* Recordings */}
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Recordings ({data.recordings.length} files, {formatSize(data.recordingsTotal)})
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded max-h-40 overflow-y-auto">
              {data.recordings.length === 0 ? (
                <div className="px-3 py-2 text-gray-400 text-sm">(no recordings)</div>
              ) : (
                data.recordings.map(r => (
                  <div key={r.name} className="flex justify-between px-3 py-1.5 text-sm border-b border-gray-100 last:border-0">
                    <span className="font-mono text-gray-700">{r.name}</span>
                    <span className="text-gray-400">{formatSize(r.size)}</span>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={handleOpenRecordings}
              className="mt-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            >
              Open in Finder
            </button>
            <p className="text-xs text-gray-400 mt-1">Drag these into Gling in order</p>
          </div>

          {/* Edit Folders */}
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Edit Folders</h3>
            <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 space-y-1">
              {data.editFolders.folders.map(f => (
                <div key={f.name} className="flex items-center gap-2 text-sm">
                  <span className={f.exists ? 'text-green-500' : 'text-gray-300'}>{f.exists ? '✓' : '○'}</span>
                  <span className={f.exists ? 'text-gray-700' : 'text-gray-400'}>{f.name}/</span>
                  <span className="text-xs text-gray-400">
                    {f.name === 'edit-1st' && '← Gling exports'}
                    {f.name === 'edit-2nd' && '← Jan\'s edits'}
                    {f.name === 'edit-final' && '← Final publish'}
                  </span>
                </div>
              ))}
            </div>
            {!data.editFolders.allExist && (
              <button
                onClick={handleCreateFolders}
                className="mt-2 px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                disabled={createFolders.isPending}
              >
                {createFolders.isPending ? 'Creating...' : 'Create All Folders'}
              </button>
            )}
            {data.editFolders.allExist && (
              <p className="mt-2 text-xs text-green-600">All edit folders ready</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
