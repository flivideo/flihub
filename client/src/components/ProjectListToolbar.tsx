// FR-148: Project list toolbar
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
}: ProjectListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-surface border-b border-warm">
      {/* Search input */}
      <input
        type="text"
        placeholder="Search projects..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="rounded border border-warm bg-surface-muted px-2 py-1 text-sm text-warm-primary placeholder:text-warm-muted focus:border-border-warm-strong focus:outline-none"
      />

      {/* Stage pills */}
      <div className="flex flex-wrap items-center gap-1">
        {STAGE_ORDER.map((stage) => {
          const config = STAGE_DISPLAY[stage];
          const isActive = activeStages.has(stage);
          return (
            <button
              key={stage}
              type="button"
              onClick={() => onStageToggle(stage)}
              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                isActive
                  ? `${config.bg} ${config.text}`
                  : 'border border-warm text-warm-muted hover:border-border-warm-strong'
              }`}
              title={config.description}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Smart presets */}
      <div className="flex items-center gap-1">
        {PRESETS.map((preset) => {
          const isActive = activePreset === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onPresetChange(preset.key)}
              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'border border-warm text-warm-muted hover:border-border-warm-strong hover:text-warm-secondary'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Result count */}
      <span className="ml-auto text-xs text-warm-muted">
        {filteredCount} of {totalCount} projects
      </span>
    </div>
  );
}
