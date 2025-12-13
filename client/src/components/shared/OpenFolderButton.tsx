// FR-29: Button to open folder in Finder
import { useOpenFolder, type FolderKey } from '../../hooks/useOpenFolder'

interface OpenFolderButtonProps {
  folder: FolderKey
  label?: string  // Optional label to show next to icon
  className?: string
}

export function OpenFolderButton({ folder, label, className = '' }: OpenFolderButtonProps) {
  const { mutate: openFolder, isPending } = useOpenFolder()

  return (
    <button
      onClick={() => openFolder(folder)}
      disabled={isPending}
      className={`p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center gap-1 ${className}`}
      title="Open in Finder"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      {label && <span className="text-xs">{label}</span>}
    </button>
  )
}
