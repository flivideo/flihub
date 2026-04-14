// TODO: Gate sidebar tools by machineRole in a future wave
// (e.g., hide Record group for editors, show editor-specific tools)

/**
 * ToolsSidebar - Vertical tool palette for Manage Panel
 *
 * B041: Pure navigation sidebar — each tool click swaps center content.
 * Regen actions are now inline in the center content, not sidebar buttons.
 */

import type { ActiveTool } from '../ManagePanel';

interface ToolsSidebarProps {
  activeTool: ActiveTool;
  onToolClick: (tool: ActiveTool) => void;
}

export function ToolsSidebar({
  activeTool,
  onToolClick,
}: ToolsSidebarProps) {
  return (
    <div className="h-full bg-surface-muted border-r border-warm p-4 flex flex-col gap-6">
      {/* Record group */}
      <div>
        <div className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-3 px-2">
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
        <div className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-3 px-2">
          Edit
        </div>
        <div className="flex flex-col gap-1">
          <ToolButton
            label="Gling / Edit"
            active={activeTool === 'gling-edit'}
            onClick={() => onToolClick('gling-edit')}
            tooltip="Gling preparation & edit folders"
          />
          <ToolButton
            label="AWB"
            active={activeTool === 'awb'}
            onClick={() => onToolClick('awb')}
            tooltip="Send transcript to AWB YouTube Launch Optimizer"
          />
        </div>
      </div>

      {/* Collaborate group */}
      <div>
        <div className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-3 px-2">
          Collaborate
        </div>
        <div className="flex flex-col gap-1">
          <ToolButton
            label="Relay"
            active={activeTool === 'relay'}
            onClick={() => onToolClick('relay')}
            tooltip="Push recordings to relay folder / collect edits back"
          />
          <ToolButton
            label="Sync"
            active={activeTool === 'sync'}
            onClick={() => onToolClick('sync')}
            tooltip="Git sync for app code and video project"
          />
        </div>
      </div>

      {/* Storage group */}
      <div>
        <div className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-3 px-2">
          Storage
        </div>
        <div className="flex flex-col gap-1">
          <ToolButton
            label="SSD Status"
            active={activeTool === 'storage'}
            onClick={() => onToolClick('storage')}
            tooltip="Per-project SSD status — opens Archive for actions"
          />
          <ToolButton
            label="Archive"
            active={activeTool === 'archive'}
            onClick={() => onToolClick('archive')}
            tooltip="Unified archive / offload / restore for all projects"
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
            ? 'bg-transparent text-warm-faint cursor-not-allowed border-transparent'
            : active
              ? 'bg-surface-muted text-blue-600 border-blue-600'
              : 'bg-transparent text-warm-secondary hover:bg-surface-hover hover:text-warm-primary border-transparent hover:border-warm-strong'
        }
      `}
    >
      {label}
    </button>
  );
}
