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
  onSimpleToolClick: (
    tool: 'regen-shadows' | 'regen-transcripts' | 'regen-chapters' | 'regen-all' | 'git-sync'
  ) => void;
  onComplexToolClick: (tool: 'rename' | 'gling-edit' | 's3-staging' | 'renumber' | 'relay') => void;
  isGitSyncPending?: boolean;
}

export function ToolsSidebar({
  selectedFiles,
  totalFiles,
  activeTool,
  onSimpleToolClick,
  onComplexToolClick,
  isGitSyncPending = false,
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
            label="Regen Shadows"
            disabled={disabled}
            active={false}
            onClick={() => onSimpleToolClick('regen-shadows')}
            tooltip={
              disabled
                ? 'No files'
                : selectedFiles.length > 0
                  ? `Regenerate shadows for ${selectedFiles.length} selected`
                  : `Regenerate shadows for all ${totalFiles}`
            }
          />
          <ToolButton
            label="Regen Transcripts"
            disabled={disabled}
            active={false}
            onClick={() => onSimpleToolClick('regen-transcripts')}
            tooltip={
              disabled
                ? 'No files'
                : selectedFiles.length > 0
                  ? `Queue ${selectedFiles.length} for transcription`
                  : `Queue all ${totalFiles} for transcription`
            }
          />
          <ToolButton
            label="Regen Chapters"
            disabled={disabled}
            active={false}
            onClick={() => onSimpleToolClick('regen-chapters')}
            tooltip={
              disabled
                ? 'No chapters'
                : selectedFiles.length > 0
                  ? `Regen chapters from ${selectedFiles.length} selected`
                  : `Regenerate all chapter videos`
            }
          />
          <ToolButton
            label="Regen All"
            disabled={disabled}
            active={false}
            onClick={() => onSimpleToolClick('regen-all')}
            tooltip={
              disabled
                ? 'No files'
                : selectedFiles.length > 0
                  ? `Regen all for ${selectedFiles.length} selected`
                  : `Regenerate all derivative files`
            }
          />
          {/* B038: relay collaboration — git pull-only sync */}
          <ToolButton
            label={isGitSyncPending ? 'Syncing...' : 'Git Sync'}
            disabled={isGitSyncPending}
            active={false}
            onClick={() => onSimpleToolClick('git-sync')}
            tooltip={isGitSyncPending ? 'Git sync in progress...' : 'Pull latest project state (git pull --rebase)'}
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
            label="Rename"
            disabled={selectedFiles.length === 0}
            active={activeTool === 'rename'}
            onClick={() => onComplexToolClick('rename')}
            tooltip={
              selectedFiles.length === 0
                ? 'Select files to rename'
                : `Rename ${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'}`
            }
          />
          <ToolButton
            label="Gling / Edit"
            disabled={false}
            active={activeTool === 'gling-edit'}
            onClick={() => onComplexToolClick('gling-edit')}
            tooltip="Gling preparation & edit folders"
          />
          <ToolButton
            label="S3 Staging"
            disabled={false}
            active={activeTool === 's3-staging'}
            onClick={() => onComplexToolClick('s3-staging')}
            tooltip="S3 file transfer & collaboration"
          />
          <ToolButton
            label="Renumber"
            disabled={disabled}
            active={activeTool === 'renumber'}
            onClick={() => onComplexToolClick('renumber')}
            tooltip={disabled ? 'No files' : 'Move chapters with automatic cascade'}
          />
          {/* B038: relay collaboration */}
          <ToolButton
            label="Relay"
            disabled={false}
            active={activeTool === 'relay'}
            onClick={() => onComplexToolClick('relay')}
            tooltip="Push recordings to relay folder / collect edits back"
          />
        </div>
      </div>
    </div>
  );
}

interface ToolButtonProps {
  label: string;
  disabled: boolean;
  active: boolean;
  onClick: () => void;
  tooltip: string;
}

function ToolButton({ label, disabled, active, onClick, tooltip }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`
        relative px-3 py-2 rounded-md text-left text-sm font-medium
        transition-all duration-200 border-l-2
        ${
          disabled
            ? 'bg-transparent text-gray-300 cursor-not-allowed border-transparent'
            : active
              ? 'bg-gray-100 text-blue-600 border-blue-600'
              : 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-transparent hover:border-gray-300'
        }
      `}
    >
      {label}
    </button>
  );
}
