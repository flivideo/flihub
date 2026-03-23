// TODO: Gate sidebar tools by machineRole in a future wave
// (e.g., hide Record group for editors, show editor-specific tools)

/**
 * ToolsSidebar - Vertical tool palette for Manage Panel
 *
 * B041: Pure navigation sidebar — each tool click swaps center content.
 * Regen actions are now inline in the center content, not sidebar buttons.
 * Git Sync is a separate action (not a tool page).
 */

import type { ActiveTool } from '../ManagePanel';

interface ToolsSidebarProps {
  activeTool: ActiveTool;
  onToolClick: (tool: ActiveTool) => void;
  onGitSync: () => void;
  isGitSyncPending?: boolean;
}

export function ToolsSidebar({
  activeTool,
  onToolClick,
  onGitSync,
  isGitSyncPending = false,
}: ToolsSidebarProps) {
  return (
    <div className="h-full bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-6">
      {/* Record group */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
          Record
        </div>
        <div className="flex flex-col gap-1">
          <ToolButton
            label="Regen"
            active={activeTool === 'regen'}
            onClick={() => onToolClick('regen')}
            tooltip="Regenerate shadows, transcripts, and chapters"
          />
        </div>
      </div>

      {/* Edit group */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
          Edit
        </div>
        <div className="flex flex-col gap-1">
          <ToolButton
            label="Rename"
            active={activeTool === 'rename'}
            onClick={() => onToolClick('rename')}
            tooltip="Rename selected recordings"
          />
          <ToolButton
            label="Gling / Edit"
            active={activeTool === 'gling-edit'}
            onClick={() => onToolClick('gling-edit')}
            tooltip="Gling preparation & edit folders"
          />
          <ToolButton
            label="Renumber"
            active={activeTool === 'renumber'}
            onClick={() => onToolClick('renumber')}
            tooltip="Move chapters with automatic cascade"
          />
        </div>
      </div>

      {/* Collaborate group */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
          Collaborate
        </div>
        <div className="flex flex-col gap-1">
          <ToolButton
            label="Relay"
            active={activeTool === 'relay'}
            onClick={() => onToolClick('relay')}
            tooltip="Push recordings to relay folder / collect edits back"
          />
        </div>
      </div>

      {/* Actions group — visually separated */}
      <div className="border-t border-gray-200 pt-4 mt-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
          Actions
        </div>
        <div className="flex flex-col gap-1">
          <ToolButton
            label={isGitSyncPending ? 'Syncing...' : 'Git Sync'}
            disabled={isGitSyncPending}
            active={false}
            onClick={onGitSync}
            tooltip={isGitSyncPending ? 'Git sync in progress...' : 'Pull latest project state (git pull --rebase)'}
          />
        </div>
      </div>
    </div>
  );
}

interface ToolButtonProps {
  label: string;
  disabled?: boolean;
  active: boolean;
  onClick: () => void;
  tooltip: string;
}

function ToolButton({ label, disabled = false, active, onClick, tooltip }: ToolButtonProps) {
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
