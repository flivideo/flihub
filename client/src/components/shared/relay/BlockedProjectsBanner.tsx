import type { RelayProjectSyncInfo } from '../../../../../shared/types';

// ─── FR-147: Blocked Projects Banner ───

export interface BlockedProjectsBannerProps {
  projects: RelayProjectSyncInfo[];
  onSyncVideoProject: () => void;
  isSyncing: boolean;
}

export function BlockedProjectsBanner({
  projects,
  onSyncVideoProject,
  isSyncing,
}: BlockedProjectsBannerProps) {
  const totalFiles = projects.reduce(
    (sum, p) => sum + Object.values(p.subfolders).reduce((s, v) => s + v.fileCount, 0),
    0
  );

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
            <span>&#9888;</span>
            Waiting for project sync
          </h3>
          <p className="text-xs text-amber-700 mt-1">
            {projects.length} {projects.length === 1 ? 'project has' : 'projects have'} {totalFiles} {totalFiles === 1 ? 'file' : 'files'} in
            relay, but {projects.length === 1 ? "doesn't" : "don't"} exist locally yet. Sync Video Project to unblock.
          </p>
        </div>
        <button
          onClick={onSyncVideoProject}
          disabled={isSyncing}
          className="shrink-0 px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? 'Syncing...' : 'Sync Video Project'}
        </button>
      </div>

      {/* Project list */}
      <div className="flex flex-wrap gap-2">
        {projects.map((p) => {
          const fileCount = Object.values(p.subfolders).reduce((s, v) => s + v.fileCount, 0);
          return (
            <span
              key={p.projectCode}
              className="inline-flex items-center gap-1.5 text-xs font-mono bg-amber-100 text-amber-800 rounded px-2 py-1"
            >
              {p.projectCode}
              <span className="text-amber-600">{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
