// B068: shared speed control for VideoPlayerModal and WatchPage (both render it through VideoControlsBar).
// Speed STEP 3: the control itself is fli-core's shared <SpeedControl> (3 visible, chevrons step like J / L).
// This file is only FliHub's skin: the label, the Warm Linen variables (index.css `.fli-speed`) and the testid.

import { SpeedControl as FliSpeedControl } from '@flivideo/core/ui';
import '@flivideo/core/ui/speed.css';

export interface SpeedControlProps {
  value: number;
  onChange: (speed: number) => void;
  disabled?: boolean;
}

export function SpeedControl({ value, onChange, disabled }: SpeedControlProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-warm-muted font-medium">Speed:</span>
      <FliSpeedControl value={value} onChange={onChange} disabled={disabled} data-testid="playback-speed" />
    </div>
  );
}
