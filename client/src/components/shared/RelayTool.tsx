// B038: relay collaboration
import { useState } from 'react';
import { useRelayStatus, useRelayPreview, useRelayPush, useRelayCollect } from '../../hooks/useRelayApi';

interface RelayDiff {
  new: string[];
  updated: string[];
  deleted: string[];
}

export function RelayTool() {
  const { data: status, isLoading: statusLoading } = useRelayStatus();
  const preview = useRelayPreview();
  const push = useRelayPush();
  const collect = useRelayCollect();
  const [diff, setDiff] = useState<RelayDiff | null>(null);

  const handlePreview = async () => {
    const result = await preview.mutateAsync();
    if (result.success && result.diff) {
      setDiff(result.diff);
    }
  };

  const isConfigured = status?.configured && status?.enabled;

  return (
    <div className="space-y-6">
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
              Check which recordings will be pushed to relay
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

      {/* Push Section */}
      <section>
        <SectionHeader title="Push Recordings" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => push.mutate()}
              disabled={!isConfigured || push.isPending || diff === null}
              className="px-3 py-1.5 text-sm bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {push.isPending ? 'Pushing...' : 'Push Recordings'}
            </button>
            {diff === null && (
              <span className="text-xs text-gray-400">Run Preview first</span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Copies recordings to the relay folder for your collaborator.
          </p>
        </div>
      </section>

      {/* Collect Section */}
      <section>
        <SectionHeader title="Collect Edits" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => collect.mutate()}
              disabled={!isConfigured || collect.isPending}
              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {collect.isPending ? 'Collecting...' : 'Collect Edits'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Pulls edited files back from the relay folder into the project.
          </p>
        </div>
      </section>
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
