// Aspect warning (David, 2026-09-23): a take that doesn't match the aspect the project was set up
// for must be unmissable at ingest — so David can re-record immediately — and stay flagged on the
// recording row until he dismisses it. Report only: nothing is blocked or moved.
import type { FileInfo, AspectCheck } from '../../../../shared/types';
import { useDismissAspectWarning } from '../../hooks/useRecordingsApi';

/** Incoming: one big red block naming every pending take that doesn't match. */
export function AspectWarningBanner({ files }: { files: FileInfo[] }) {
  const bad = files.filter((f) => f.aspectCheck?.status === 'mismatch');
  if (bad.length === 0) return null;
  return (
    <div
      role="alert"
      data-testid="aspect-warning-banner"
      className="mb-4 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-red-800"
    >
      <p className="text-base font-bold">
        ⚠ {bad.length === 1 ? 'This take does' : `${bad.length} takes do`} not match the project&apos;s aspect — re-record now
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {bad.map((f) => (
          <li key={f.path}>
            <span className="font-mono font-medium">{f.filename}</span>: {f.aspectCheck!.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Recordings row: a chip that stays until dismissed. */
export function AspectWarningChip({ filename, warning }: { filename: string; warning: AspectCheck }) {
  const dismiss = useDismissAspectWarning();
  return (
    <span
      data-testid="aspect-warning-chip"
      className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700"
      title={warning.message}
    >
      ⚠ Aspect
      <button
        type="button"
        aria-label={`Dismiss aspect warning for ${filename}`}
        title="Dismiss this warning"
        onClick={(e) => {
          e.stopPropagation();
          dismiss.mutate([filename]);
        }}
        disabled={dismiss.isPending}
        className="ml-0.5 rounded px-0.5 text-red-500 hover:bg-red-200 hover:text-red-800"
      >
        ✕
      </button>
    </span>
  );
}
