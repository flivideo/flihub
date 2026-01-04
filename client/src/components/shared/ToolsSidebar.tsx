/**
 * ToolsSidebar - Vertical tool palette for Manage Panel
 *
 * FR-136: Tool-oriented design
 * - Simple Tools: Instant actions (regen operations)
 * - Complex Tools: Opens slide-out config drawer (rename, export, folders)
 */

interface ToolsSidebarProps {
  selectedFiles: string[];
  totalFiles: number;
  activeTool: string | null;
  onSimpleToolClick: (tool: 'regen-shadows' | 'regen-transcripts' | 'regen-chapters' | 'regen-all') => void;
  onComplexToolClick: (tool: 'rename' | 'export' | 'folders') => void;
}

export function ToolsSidebar({
  selectedFiles,
  totalFiles,
  activeTool,
  onSimpleToolClick,
  onComplexToolClick
}: ToolsSidebarProps) {
  const disabled = totalFiles === 0;

  return (
    <div className="h-full bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-6">
      {/* Simple Tools Section */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
          Simple Tools
        </div>
        <div className="flex flex-col gap-1">
          <ToolButton
            icon="⚡"
            label="Regen Shadows"
            disabled={disabled}
            active={false}
            onClick={() => onSimpleToolClick('regen-shadows')}
            tooltip={disabled ? "No files" : (selectedFiles.length > 0
              ? `Regenerate shadows for ${selectedFiles.length} selected`
              : `Regenerate shadows for all ${totalFiles}`)}
          />
          <ToolButton
            icon="⚡"
            label="Regen Transcripts"
            disabled={disabled}
            active={false}
            onClick={() => onSimpleToolClick('regen-transcripts')}
            tooltip={disabled ? "No files" : (selectedFiles.length > 0
              ? `Queue ${selectedFiles.length} for transcription`
              : `Queue all ${totalFiles} for transcription`)}
          />
          <ToolButton
            icon="⚡"
            label="Regen Chapters"
            disabled={disabled}
            active={false}
            onClick={() => onSimpleToolClick('regen-chapters')}
            tooltip={disabled ? "No chapters" : (selectedFiles.length > 0
              ? `Regen chapters from ${selectedFiles.length} selected`
              : `Regenerate all chapter videos`)}
          />
          <ToolButton
            icon="⚡"
            label="Regen All"
            disabled={disabled}
            active={false}
            onClick={() => onSimpleToolClick('regen-all')}
            tooltip={disabled ? "No files" : (selectedFiles.length > 0
              ? `Regen all for ${selectedFiles.length} selected`
              : `Regenerate all derivative files`)}
          />
        </div>
      </div>

      {/* Complex Tools Section */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
          Complex Tools
        </div>
        <div className="flex flex-col gap-1">
          <ToolButton
            icon="⚙"
            label="Rename"
            disabled={selectedFiles.length === 0}
            active={activeTool === 'rename'}
            onClick={() => onComplexToolClick('rename')}
            tooltip={selectedFiles.length === 0
              ? "Select files to rename"
              : `Rename ${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'}`}
          />
          <ToolButton
            icon="⚙"
            label="Export"
            disabled={selectedFiles.length === 0}
            active={activeTool === 'export'}
            onClick={() => onComplexToolClick('export')}
            tooltip={selectedFiles.length === 0
              ? "Select files to export"
              : `Export ${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'}`}
          />
          <ToolButton
            icon="⚙"
            label="Folders"
            disabled={false}
            active={activeTool === 'folders'}
            onClick={() => onComplexToolClick('folders')}
            tooltip="Manage edit folders"
          />
        </div>
      </div>
    </div>
  );
}

interface ToolButtonProps {
  icon: string;
  label: string;
  disabled: boolean;
  active: boolean;
  onClick: () => void;
  tooltip: string;
}

function ToolButton({ icon, label, disabled, active, onClick, tooltip }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`
        relative px-3 py-2 rounded-md text-left text-sm font-medium
        transition-all duration-200
        ${disabled
          ? 'bg-transparent text-gray-300 cursor-not-allowed'
          : active
            ? 'bg-gray-100 text-blue-600 border-l-2 border-blue-600 pl-4'
            : 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:pl-4'
        }
      `}
    >
      <span className="opacity-50 mr-2">{icon}</span>
      {label}
    </button>
  );
}
