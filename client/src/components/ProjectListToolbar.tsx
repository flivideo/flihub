// FR-148: Project list toolbar — matches Mochaccino mockup
export { STAGE_DISPLAY, STAGE_ORDER } from '../constants/stages';
import { STAGE_DISPLAY, STAGE_ORDER } from '../constants/stages';

const PRESETS = [
  { key: 'all', label: 'All' },
  { key: 'needs-attention', label: 'Needs Attention' },
  { key: 'dead', label: 'Dead' },
  { key: 'ready-to-edit', label: 'Ready to Edit' },
] as const;

export interface ProjectListToolbarProps {
  totalCount: number;
  filteredCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeStages: Set<string>;
  onStageToggle: (stage: string) => void;
  activePreset: string;
  onPresetChange: (preset: string) => void;
  // B062: Disk toggle
  diskColumnsEnabled?: boolean;
  onDiskToggle?: () => void;
  diskScanPending?: boolean;
}

export function ProjectListToolbar({
  totalCount,
  filteredCount,
  searchQuery,
  onSearchChange,
  activeStages,
  onStageToggle,
  activePreset,
  onPresetChange,
  diskColumnsEnabled = false,
  onDiskToggle,
  diskScanPending = false,
}: ProjectListToolbarProps) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 bg-surface border-b border-warm">
      {/* Row 1: Search + stage pills + preset buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search input */}
        <input
          type="text"
          placeholder="Filter by code or name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-[240px] rounded-md border border-warm bg-surface-muted px-2.5 py-1 text-[13px] text-warm-primary placeholder:text-warm-faint focus:border-blue-400 focus:outline-none"
        />

        {/* Stage pills */}
        <div className="flex items-center gap-1">
          {STAGE_ORDER.map((stage) => {
            const config = STAGE_DISPLAY[stage];
            const isActive = activeStages.has(stage);
            return (
              <button
                key={stage}
                type="button"
                onClick={() => onStageToggle(stage)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors select-none ${
                  isActive
                    ? 'bg-blue-500 text-white border border-blue-500'
                    : 'border border-warm text-warm-muted hover:border-warm-strong'
                }`}
                title={config.description}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Smart presets — pushed right */}
        <div className="flex items-center gap-1 ml-auto">
          {PRESETS.map((preset) => {
            const isActive = activePreset === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => onPresetChange(preset.key)}
                className={`rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-colors select-none ${
                  isActive
                    ? 'bg-[#2a2018] text-surface border border-[#2a2018]'
                    : 'border border-warm text-warm-secondary hover:bg-surface-muted hover:border-warm-strong'
                }`}
              >
                {preset.label}
              </button>
            );
          })}

          {/* B062: Disk toggle — separator + toggle button after presets */}
          {onDiskToggle && (
            <>
              <span className="w-px h-4 bg-border-warm mx-1 self-center" />
              <button
                type="button"
                onClick={onDiskToggle}
                title="Show disk usage columns"
                className={`rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-colors select-none ${
                  diskColumnsEnabled
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'border border-warm text-warm-secondary hover:bg-surface-muted hover:border-warm-strong'
                }`}
              >
                {diskScanPending ? '⟳ Disk' : 'Disk'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Result count */}
      <div className="text-[11px] text-warm-faint">
        {filteredCount} of {totalCount} projects
      </div>
    </div>
  );
}
