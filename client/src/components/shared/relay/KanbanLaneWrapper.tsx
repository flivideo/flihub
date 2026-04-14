import type { RelaySubfolder, RelayDivergenceInfo } from '../../../../../shared/types';
import type { LaneConfig, SyncDirection } from './types';
import { getActionLabel, defaultIsPush } from './types';
import { KanbanLane } from './KanbanLane';

// ─── Kanban Lane Wrapper — derives direction-aware props ───

export interface KanbanLaneWrapperProps {
  lane: LaneConfig;
  divergence?: RelayDivergenceInfo;
  isCreator: boolean;
  onAction: (lane: RelaySubfolder, direction: SyncDirection) => void;
  isPending: boolean;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onEnsureFolders: () => void;
  onClear?: (subfolder: RelaySubfolder) => void;
}

export function KanbanLaneWrapper({
  lane, divergence, isCreator, onAction, isPending, isDrawerOpen, onToggleDrawer, onEnsureFolders, onClear,
}: KanbanLaneWrapperProps) {
  const direction: SyncDirection = divergence?.direction ?? 'synced';
  const isPush = direction === 'outgoing' || (direction === 'synced' && defaultIsPush(lane.subfolder!, isCreator));

  return (
    <KanbanLane
      lane={lane}
      divergence={divergence}
      actionLabel={getActionLabel(direction, isCreator)}
      onAction={() => onAction(lane.subfolder!, direction)}
      isPending={isPending}
      isPush={isPush}
      isDrawerOpen={isDrawerOpen}
      onToggleDrawer={onToggleDrawer}
      onEnsureFolders={onEnsureFolders}
      onClear={onClear ? () => onClear(lane.subfolder!) : undefined}
    />
  );
}
