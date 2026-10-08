// CT-0107 R6: send several inbox takes in as consecutive segments, in the order they were picked.
import { toast } from 'sonner';
import { useSegmentOp } from '../hooks/useSegmentsApi';

interface SendSeveralBarProps {
  /** Paths of the picked inbox takes, in pick order. */
  picked: string[];
  chapter: string;
  name: string;
  tags: string[];
  onSent: (paths: string[]) => void;
  onClear: () => void;
}

export function SendSeveralBar({
  picked,
  chapter,
  name,
  tags,
  onSent,
  onClear,
}: SendSeveralBarProps) {
  const op = useSegmentOp();
  if (picked.length < 2) return null;

  const send = async () => {
    if (!/^\d{2}$/.test(chapter) || !name) {
      toast.error('Set a two-digit chapter and a name first');
      return;
    }
    const result = await op.mutateAsync({ mode: 'send', chapter, sources: picked, name, tags });
    if (result.success) {
      toast.success(`Sent: ${result.op?.promoted.join(', ') ?? `${picked.length} takes`}`);
      onSent(picked);
    } else {
      toast.error(result.refused ? `Not done — ${result.reason}` : result.reason || 'Send failed');
    }
  };

  return (
    <div
      data-testid="send-several-bar"
      className="mb-3 flex items-center justify-between rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm"
    >
      <span>
        {picked.length} takes picked — they land as the next segments of chapter {chapter || '?'},
        in the order picked.
      </span>
      <span className="flex gap-2">
        <button
          type="button"
          onClick={onClear}
          className="px-2 text-warm-secondary hover:text-warm-primary"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={send}
          disabled={op.isPending}
          className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {op.isPending ? 'Sending…' : `Send ${picked.length} as segments`}
        </button>
      </span>
    </div>
  );
}
