// storage-panel WU2: State pill shown in the StoragePanel header.
// Warm linen tokens; colour hints the verb-set available below.
import type { StorageState } from '../../../../../shared/types';

interface Props {
  state: StorageState;
}

const STATE_LABEL: Record<StorageState, string> = {
  active: 'Active',
  held: 'Held',
  archived: 'Archived',
};

// Tailwind colour pairs — kept in-line (not extracted to a map) so search for
// `bg-green-` finds them in code review.
function pillClasses(state: StorageState): string {
  switch (state) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'held':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'archived':
      return 'bg-slate-200 text-slate-700 border-slate-300';
  }
}

function dotClasses(state: StorageState): string {
  switch (state) {
    case 'active':
      return 'bg-green-600';
    case 'held':
      return 'bg-amber-600';
    case 'archived':
      return 'bg-slate-500';
  }
}

export function StorageStateHeader({ state }: Props) {
  return (
    <span
      data-testid="storage-state-pill"
      data-state={state}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${pillClasses(state)}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotClasses(state)}`} />
      {STATE_LABEL[state]}
    </span>
  );
}
