// W3 open contract (C3): a launch or API context that could not resolve is refused out loud — FliHub has no log
// file, so without this strip the refusal would look exactly like "opened on the last project".
import type { ContextRefusal } from '../../../shared/types';

interface ContextRefusedBannerProps {
  refused: ContextRefusal;
  onDismiss: () => void;
}

export function ContextRefusedBanner({ refused, onDismiss }: ContextRefusedBannerProps) {
  return (
    <div role="alert" className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
          <span className="font-medium text-amber-900">Could not open the requested project.</span>{' '}
          <span className="text-amber-800">{refused.reason}</span>{' '}
          <span className="text-amber-700">FliHub stayed where it was — pick a brand and project.</span>
          {refused.candidates && refused.candidates.length > 0 && (
            <div className="mt-1 text-amber-800">
              Did you mean: <span className="font-mono">{refused.candidates.join(', ')}</span>
            </div>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-amber-700 hover:text-amber-900"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
