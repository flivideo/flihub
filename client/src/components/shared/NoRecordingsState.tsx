/**
 * The empty-recordings screen, which is TWO states and must never be one.
 *
 * "No project selected" and "this project has no recordings" were rendered with
 * identical copy in three places (RecordingsView, ManagePanel, WatchPage), none of
 * which consulted `activeProject`. A brand switch clears the selection by design
 * (server/src/routes/brands.ts:52), so the very common post-switch state claimed the
 * project was empty and sent the reader hunting for missing files instead of for a
 * missing selection. Per CLAUDE.md's operating rule: those two must not be the same
 * pixels.
 *
 * Kept as one component so the three call sites cannot drift apart again.
 */
import { useConfig } from '../../hooks/useApi';
import { useBrands } from '../../hooks/useBrandsApi';

export function NoRecordingsState() {
  const { data: config } = useConfig();
  const { data: brandData } = useBrands();

  const hasProject = Boolean(config?.activeProject);

  // Prefer the brand's display name; fall back to the root's folder name so this
  // still says something useful when brands.json is unreadable.
  const activeBrand = brandData?.brands?.find((b) => b.active);
  const brandLabel =
    activeBrand?.name ||
    config?.projectsRootDirectory?.split('/').filter(Boolean).pop() ||
    null;

  if (!hasProject) {
    return (
      <div className="text-center py-12 bg-surface rounded-lg border border-warm">
        <p className="text-warm-muted">No project selected</p>
        <p className="text-sm text-warm-muted mt-1">
          Pick a project on the{' '}
          {/* An empty state must offer a way OUT of itself, not just name the exit. This
              sentence told the reader where to go and then made them find it. Tabs are
              hash-driven (App.tsx getTabFromHash + a hashchange listener), so setting the
              hash is the whole navigation — no prop threading through three components. */}
          <button
            type="button"
            onClick={() => {
              window.location.hash = 'projects';
            }}
            className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
          >
            Projects tab
          </button>{' '}
          to see its recordings
          {brandLabel ? <> — currently in <span className="font-medium text-warm-secondary">{brandLabel}</span></> : null}.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12 bg-surface rounded-lg border border-warm">
      <p className="text-warm-muted">No recordings found</p>
      <p className="text-sm text-warm-muted mt-1">
        Recordings will appear here after you rename incoming files
      </p>
    </div>
  );
}
