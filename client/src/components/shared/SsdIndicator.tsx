// B064: Header SSD status pill — shows T7 mount state alongside Relay/Sync indicators
// Offload UX: Now navigates to Manage→Storage instead of Projects tab
import { useSsdStatus } from '../../hooks/useHoldApi';

export function SsdIndicator({ onNavigateToStorage }: { onNavigateToStorage: () => void }) {
  const { data, isLoading } = useSsdStatus();

  // Don't render if holdingPath not configured
  if (isLoading || !data?.configured) return null;

  const mounted = data.ssdMounted;

  return (
    <button
      onClick={onNavigateToStorage}
      title={mounted ? 'T7 SSD mounted — open Storage tool' : 'T7 SSD not connected — open Storage tool'}
      className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors hover:bg-surface-hover ${mounted ? '' : 'opacity-50'}`}
    >
      <span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${mounted ? 'bg-green-600' : 'bg-warm-muted'}`} />
      <span className={`font-medium ${mounted ? 'text-warm-muted' : 'text-warm-faint'}`}>T7</span>
    </button>
  );
}
