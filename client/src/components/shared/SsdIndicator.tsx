// B064: Header SSD status pill — shows T7 mount state alongside Relay/Sync indicators
import { useSsdStatus } from '../../hooks/useHoldApi';

export function SsdIndicator({ onNavigateToProjects }: { onNavigateToProjects: () => void }) {
  const { data, isLoading } = useSsdStatus();

  // Don't render if holdingPath not configured
  if (isLoading || !data?.configured) return null;

  const mounted = data.ssdMounted;

  return (
    <button
      onClick={onNavigateToProjects}
      title={mounted ? 'T7 SSD mounted — hold/restore available' : 'T7 SSD not connected'}
      className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors hover:bg-surface-hover ${mounted ? '' : 'opacity-50'}`}
    >
      <span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${mounted ? 'bg-green-600' : 'bg-warm-muted'}`} />
      <span className={`font-medium ${mounted ? 'text-warm-muted' : 'text-warm-faint'}`}>T7</span>
    </button>
  );
}
