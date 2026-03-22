// B038: relay collaboration
import { useState } from 'react';
import { useRelayStatus, useRelayPreview, useRelayPush, useRelayCollect, useRelayVersions, useRelayPromote } from '../../hooks/useRelayApi';
import { useEnvironment } from '../../hooks/useConfigApi';
import { RelayBrowser } from './RelayBrowser';
import type { RelaySubfolder } from '../../../../shared/types';

interface RelayDiff {
  new: string[];
  updated: string[];
  deleted: string[];
}

export function RelayTool() {
  const { data: env } = useEnvironment();
  const role = env?.machineRole || 'recorder';
  const isRecorder = role === 'recorder';
  const isEditor = role === 'editor';

  const { data: status, isLoading: statusLoading } = useRelayStatus();
  const preview = useRelayPreview();
  const push = useRelayPush();
  const collect = useRelayCollect();
  const [diff, setDiff] = useState<RelayDiff | null>(null);
  const [subfolder, setSubfolder] = useState<RelaySubfolder>('recordings');
  const versions = useRelayVersions();
  const promote = useRelayPromote();
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const handlePreview = async () => {
    const result = await preview.mutateAsync(subfolder);
    if (result.success && result.diff) {
      setDiff(result.diff);
    }
  };

  const isConfigured = status?.configured && status?.enabled;

  return (
    <div className="space-y-6">
      {/* Relay Folder Browser */}
      <section>
        <SectionHeader title="Relay Folder" />
        <RelayBrowser />
      </section>

      {/* Status Section */}
      <section>
        <SectionHeader title="Relay Status" />
        {statusLoading ? (
          <div className="text-sm text-gray-500">Loading relay status...</div>
        ) : !status?.configured ? (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
            Relay not configured — add <span className="font-mono">relayDirectory</span> to config.json
          </div>
        ) : !status?.enabled ? (
          <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">
            Relay is configured but not enabled.
          </div>
        ) : (
          <div className="text-sm bg-green-50 border border-green-200 rounded p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-green-600">&#10003;</span>
              <span className="text-gray-700 font-medium">Relay configured and enabled</span>
            </div>
            {status.relayDirectory && (
              <div className="text-xs text-gray-500 font-mono truncate">{status.relayDirectory}</div>
            )}
          </div>
        )}
      </section>

      {/* Subfolder Selector */}
      {isConfigured && (
        <section>
          <SectionHeader title="Subfolder" />
          <select
            value={subfolder}
            onChange={(e) => { setSubfolder(e.target.value as RelaySubfolder); setDiff(null); }}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
          >
            <option value="recordings">Recordings</option>
            <option value="edit-1st">Edit 1st (Gling)</option>
            <option value="edit-2nd">Edit 2nd (Final)</option>
          </select>
        </section>
      )}

      {/* Preview Section */}
      <section>
        <SectionHeader title="Preview" />
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreview}
              disabled={!isConfigured || preview.isPending}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {preview.isPending ? 'Previewing...' : 'Preview'}
            </button>
            <span className="text-xs text-gray-400">
              Check which files will be synced for {subfolder}
            </span>
          </div>

          {diff && (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              <DiffSection label="New" files={diff.new} color="green" />
              <DiffSection label="Updated" files={diff.updated} color="blue" />
              <DiffSection label="Deleted" files={diff.deleted} color="red" />
              {diff.new.length === 0 && diff.updated.length === 0 && diff.deleted.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">No changes to push</div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Push Section — show when role matches subfolder direction */}
      {((isRecorder && subfolder === 'recordings') ||
        (isEditor && (subfolder === 'edit-1st' || subfolder === 'edit-2nd'))) && (
      <section>
        <SectionHeader title={`Push ${subfolder}`} />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => push.mutate(subfolder)}
              disabled={!isConfigured || push.isPending || diff === null}
              className="px-3 py-1.5 text-sm bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {push.isPending ? 'Pushing...' : `Push ${subfolder}`}
            </button>
            {diff === null && (
              <span className="text-xs text-gray-400">Run Preview first</span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Push {subfolder} to relay for your collaborator.
          </p>
        </div>
      </section>
      )}

      {/* Collect Section — show when role matches subfolder direction */}
      {((isRecorder && (subfolder === 'edit-1st' || subfolder === 'edit-2nd')) ||
        (isEditor && subfolder === 'recordings')) && (
      <section>
        <SectionHeader title={`Collect ${subfolder}`} />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => collect.mutate(subfolder)}
              disabled={!isConfigured || collect.isPending}
              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {collect.isPending ? 'Collecting...' : `Collect ${subfolder}`}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Collect {subfolder} from relay into the project.
          </p>
        </div>
      </section>
      )}

      {/* Promote to Final — recorder only */}
      {isRecorder && (
      <section>
        <SectionHeader title="Promote to Final" />
        <div className="space-y-3">
          {versions.isLoading ? (
            <div className="text-sm text-gray-500">Loading versions...</div>
          ) : !versions.data?.success || !versions.data?.versions?.length ? (
            <div className="text-sm text-gray-500">No files in edit-2nd/ yet.</div>
          ) : (
            <>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                {versions.data.versions.map((v: { filename: string; size: number; modified: string }) => (
                  <button
                    key={v.filename}
                    onClick={() => setSelectedVersion(v.filename)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                      selectedVersion === v.filename ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <span className="font-mono text-xs truncate">{v.filename}</span>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">
                      {(v.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectedVersion && promote.mutate(selectedVersion)}
                  disabled={!selectedVersion || promote.isPending}
                  className="px-3 py-1.5 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {promote.isPending ? 'Promoting...' : 'Promote to Final'}
                </button>
                {selectedVersion && (
                  <span className="text-xs text-gray-500 truncate">
                    {selectedVersion} → final/
                  </span>
                )}
              </div>
            </>
          )}
          <p className="text-xs text-gray-500">
            Select an approved version from edit-2nd/ to promote to final/.
          </p>
        </div>
      </section>
      )}
    </div>
  );
}

// ─── Helper Components ───

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-px bg-gray-300 w-8" />
      <span className="text-sm font-semibold text-gray-700">{title}</span>
      <div className="h-px bg-gray-300 flex-1" />
    </div>
  );
}

interface DiffSectionProps {
  label: string;
  files: string[];
  color: 'green' | 'blue' | 'red';
}

function DiffSection({ label, files, color }: DiffSectionProps) {
  if (files.length === 0) return null;

  const colorClasses = {
    green: 'text-green-700 bg-green-50',
    blue: 'text-blue-700 bg-blue-50',
    red: 'text-red-700 bg-red-50',
  };

  return (
    <div className={`px-3 py-2 ${colorClasses[color]}`}>
      <div className="text-xs font-semibold uppercase mb-1">
        {label} ({files.length})
      </div>
      <div className="space-y-0.5 max-h-24 overflow-y-auto">
        {files.map((f) => (
          <div key={f} className="text-xs font-mono truncate">
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}
