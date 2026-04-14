// B068: Extracted shared speed preset button group
// Used by VideoPlayerModal and WatchPage

export interface SpeedControlProps {
  presets: number[];
  value: number;
  onChange: (speed: number) => void;
}

export function SpeedControl({ presets, value, onChange }: SpeedControlProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-warm-muted font-medium">Speed:</span>
      <div className="flex gap-1">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              value === preset
                ? 'bg-blue-600 text-white font-medium'
                : 'bg-surface-muted text-warm-secondary hover:bg-surface-hover'
            }`}
          >
            {preset}x
          </button>
        ))}
      </div>
    </div>
  );
}
