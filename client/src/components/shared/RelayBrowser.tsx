import { useRelayBrowse } from '../../hooks/useRelayApi';
import type { RelayProjectInfo } from '../../../../shared/types';

function formatSize(bytes: number): string {
  if (bytes === 0) return '\u2014';
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
    return <span className="text-gray-300">{'\u2014'}</span>;
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
        <span className="text-gray-400 text-xs ml-1">({formatSize(totalSize)})</span>
      </span>
    </span>
  );
}

export function RelayBrowser() {
  const { data, isLoading } = useRelayBrowse();

  if (isLoading) {
    return <div className="text-sm text-gray-500 py-2">Scanning relay folder...</div>;
  }

  if (!data?.success) {
    return null; // relay not configured — RelayTool handles that messaging
  }

  const projects: RelayProjectInfo[] = data.projects || [];

  if (projects.length === 0) {
    return (
      <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">
        Relay folder is empty — no projects found.
      </div>
    );
  }

  const totalRecordings = projects.reduce((sum, p) => sum + p.subfolders.recordings.fileCount, 0);
  const totalEdit1st = projects.reduce((sum, p) => sum + p.subfolders['edit-1st'].fileCount, 0);
  const totalEdit2nd = projects.reduce((sum, p) => sum + p.subfolders['edit-2nd'].fileCount, 0);

  return (
    <div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <th className="px-3 py-2">Project</th>
              <th className="px-3 py-2">Recordings</th>
              <th className="px-3 py-2">Edit 1st</th>
              <th className="px-3 py-2">Edit 2nd</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map((project) => (
              <tr key={project.projectCode} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs font-medium text-gray-700">
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
            <tr className="bg-gray-50 text-xs text-gray-500 font-medium">
              <td className="px-3 py-2">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </td>
              <td className="px-3 py-2">
                {totalRecordings > 0 ? `${totalRecordings} files` : '\u2014'}
              </td>
              <td className="px-3 py-2">
                {totalEdit1st > 0 ? `${totalEdit1st} files` : '\u2014'}
              </td>
              <td className="px-3 py-2">
                {totalEdit2nd > 0 ? `${totalEdit2nd} files` : '\u2014'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
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
