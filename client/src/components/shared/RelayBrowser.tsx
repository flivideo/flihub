import { useRelayBrowse } from '../../hooks/useRelayApi';
import type { RelayProjectInfo } from '../../../../shared/types';

function formatSize(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function SubfolderCell({ fileCount, totalSize, type }: {
  fileCount: number;
  totalSize: number;
  type: 'recordings' | 'edit-1st' | 'edit-2nd';
}) {
  if (fileCount === 0) {
    return <span className="text-warm-faint">{'—'}</span>;
  }

  const dotColors = {
    'recordings': 'bg-blue-500',
    'edit-1st': 'bg-amber-500',
    'edit-2nd': 'bg-emerald-500',
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`w-2 h-2 rounded-full ${dotColors[type]} shrink-0`} />
      <span>
        {fileCount}
        <span className="text-warm-muted text-xs ml-1">({formatSize(totalSize)})</span>
      </span>
    </span>
  );
}

export function RelayBrowser() {
  const { data, isLoading } = useRelayBrowse();

  if (isLoading) {
    return <div className="text-sm text-warm-muted py-2">Scanning relay folder...</div>;
  }

  if (!data?.success) {
    return null; // relay not configured — RelayTool handles that messaging
  }

  const projects: RelayProjectInfo[] = data.projects || [];

  if (projects.length === 0) {
    return (
      <div className="text-sm text-warm-muted bg-surface-muted border border-warm rounded p-3">
        Relay folder is empty — no projects found.
      </div>
    );
  }

  const totalRecordings = projects.reduce((sum, p) => sum + p.subfolders.recordings.fileCount, 0);
  const totalEdit1st = projects.reduce((sum, p) => sum + p.subfolders['edit-1st'].fileCount, 0);
  const totalEdit2nd = projects.reduce((sum, p) => sum + p.subfolders['edit-2nd'].fileCount, 0);

  return (
    <div>
      <div className="border border-warm rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-muted text-left text-xs font-medium text-warm-muted uppercase">
              <th className="px-3 py-2">Project</th>
              <th className="px-3 py-2">Recordings</th>
              <th className="px-3 py-2">Edit 1st</th>
              <th className="px-3 py-2">Edit 2nd</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm">
            {projects.map((project) => (
              <tr key={project.projectCode} className="hover:bg-surface-hover">
                <td className="px-3 py-2 font-mono text-xs font-medium text-warm-secondary">
                  {project.projectCode}
                </td>
                <td className="px-3 py-2">
                  <SubfolderCell {...project.subfolders.recordings} type="recordings" />
                </td>
                <td className="px-3 py-2">
                  <SubfolderCell {...project.subfolders['edit-1st']} type="edit-1st" />
                </td>
                <td className="px-3 py-2">
                  <SubfolderCell {...project.subfolders['edit-2nd']} type="edit-2nd" />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-muted text-xs text-warm-muted font-medium">
              <td className="px-3 py-2">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </td>
              <td className="px-3 py-2">
                {totalRecordings > 0 ? `${totalRecordings} files` : '—'}
              </td>
              <td className="px-3 py-2">
                {totalEdit1st > 0 ? `${totalEdit1st} files` : '—'}
              </td>
              <td className="px-3 py-2">
                {totalEdit2nd > 0 ? `${totalEdit2nd} files` : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-warm-muted">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> Recordings
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Edit 1st
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Edit 2nd
        </span>
      </div>
    </div>
  );
}
