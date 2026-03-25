import type { RelayActivityEvent } from '../../../../../shared/types';
import { formatRelativeTime } from './types';

// ─── Activity Feed ───

export function ActivityFeed({ events }: { events?: RelayActivityEvent[] }) {
  if (!events || events.length === 0) return null;

  const getArrow = (action: RelayActivityEvent['action']): string => {
    switch (action) {
      case 'push': return '\u2191';
      case 'collect': return '\u2193';
      case 'promote': return '\u21BB';
      case 'file-detected': return '\u2193';
      default: return '\u2022';
    }
  };

  return (
    <div className="bg-surface-muted border border-warm rounded-lg px-4 py-3">
      <h3 className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-2">
        Recent Activity
      </h3>
      <div className="space-y-1">
        {events.slice(0, 8).map((event) => (
          <div key={event.id} className="flex items-start gap-2 text-xs">
            <span className="text-warm-muted w-3 text-center shrink-0 font-mono">
              {getArrow(event.action)}
            </span>
            <span className="text-warm-secondary flex-1 truncate">{event.description}</span>
            <span className="text-warm-muted shrink-0">
              {formatRelativeTime(event.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
