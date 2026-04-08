// FR-148: Project detail drawer — matches Mochaccino mockup design
import { useEffect, useCallback, useState } from 'react';
import { useOpenFolder } from '../hooks/useOpenFolder';
import { STAGE_DISPLAY } from './ProjectListToolbar';
import { copyProjectTranscript } from '../utils/clipboard';
import { daysAgo, formatDate } from '../utils/formatting';
import { useProjectDisk, useDeleteTrash } from '../hooks/useProjectDiskApi';
import type { ProjectStats } from '../../../shared/types';
// B064: Hold/restore hooks and modal
import {
  useHoldStatus,
  useHoldProject,
  useVerifyHolding,
  useDeleteLocal,
  useRestoreFromHolding,
  useDeleteHolding,
} from '../hooks/useHoldApi';
import { HoldDeleteModal } from './HoldDeleteModal';
import { formatBytes as formatBytesUtil } from '../utils/formatBytes';

// B062: Local formatBytes — TODO: consolidate with client/src/utils/formatBytes.ts later
function formatBytes(bytes: number): string {
  if (bytes < 1024) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// B062: Relative time helper for calculatedAt display
function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface ProjectDrawerProps {
  project: ProjectStats | null;
  onClose: () => void;
}

function daysAgoLabel(dateStr: string | null): string {
  const d = daysAgo(dateStr);
  if (d === Infinity) return 'unknown';
  if (d === 0) return 'today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
}

// FR-148: Health assessment logic
export function getHealthAssessment(project: ProjectStats): string {
  const { stage, totalFiles, transcriptPercent, lastModified } = project;
  const daysSince = daysAgo(lastModified);

  if (stage === 'planning' && totalFiles === 0) {
    return 'Project is in planning stage';
  }
  if (totalFiles <= 2 && daysSince > 30) {
    return 'This project appears inactive (no activity in 30+ days)';
  }
  if (transcriptPercent === 100 && stage === 'recording') {
    return 'Ready to edit — all recordings transcribed';
  }
  if (transcriptPercent > 0 && transcriptPercent < 100) {
    const missing = project.transcriptSync.missingCount;
    return missing > 0
      ? `Transcripts ${transcriptPercent}% complete — ${missing} recordings need transcription`
      : `Transcripts ${transcriptPercent}% complete`;
  }
  if (totalFiles > 0 && transcriptPercent === 0) {
    return 'Needs attention — recordings exist but no transcripts';
  }
  return STAGE_DISPLAY[stage]?.description ?? '';
}

export function ProjectDrawer({ project, onClose }: ProjectDrawerProps) {
  const openFolder = useOpenFolder();
  const isOpen = project !== null;

  // B062: Disk usage data for this project
  const { data: diskResult, isFetching: diskFetching, refetch: refetchDisk } = useProjectDisk(
    project?.code ?? null
  );
  const diskData = diskResult?.data;

  // B062 Wave 2: Trash delete confirmation modal
  const [showTrashConfirm, setShowTrashConfirm] = useState(false);
  const { mutate: deleteTrash, isPending: deletingTrash } = useDeleteTrash(project?.code ?? null);

  // B064: Hold modal state — tracks which target is being deleted
  const [holdModal, setHoldModal] = useState<{ open: boolean; target: 'local' | 'holding' }>({
    open: false,
    target: 'local',
  });

  // B064: Hold hooks
  const holdStatus = useHoldStatus(project?.code ?? null);
  const holdProject = useHoldProject();
  const verifyHolding = useVerifyHolding();
  const deleteLocal = useDeleteLocal();
  const restoreFromHolding = useRestoreFromHolding();
  const deleteHolding = useDeleteHolding();

  // B064: Inline dry-run result message
  const [dryRunMessage, setDryRunMessage] = useState<string | null>(null);

  // B064: Auto-trigger verify when location is 'both' and no verification exists yet
  useEffect(() => {
    if (
      holdStatus.data?.location === 'both' &&
      !holdStatus.data.verification &&
      !verifyHolding.isPending
    ) {
      verifyHolding.mutate({ code: project?.code ?? '' });
    }
  }, [holdStatus.data?.location, holdStatus.data?.verification]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!project) return null;

  const stage = STAGE_DISPLAY[project.stage] ?? {
    label: project.stage,
    bg: '',
    text: 'text-warm-muted',
    description: '',
  };

  const checklist = [
    { label: 'Has recordings', ok: project.totalFiles > 0 },
    { label: 'Has transcripts', ok: project.transcriptPercent > 0 },
    { label: 'Has chapters', ok: project.hasChapters },
    { label: 'Has final video', ok: project.hasFinal },
  ];

  const stats = [
    { value: project.totalFiles, label: 'Recordings' },
    { value: project.chapterCount, label: 'Chapters' },
    { value: `${project.transcriptPercent}%`, label: 'Transcripts' },
    { value: project.imageCount, label: 'Images' },
    { value: project.thumbCount, label: 'Thumbs' },
    { value: project.shadowCount, label: 'Shadows' },
  ];

  return (
    <div
      data-testid="drawer-panel"
      className="absolute top-0 right-0 h-full z-10 bg-surface border-l border-warm-strong overflow-y-auto transition-transform duration-300 ease-in-out"
      style={{
        width: '40%',
        minWidth: '360px',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-warm">
        <h2 className="flex items-center gap-2.5">
          <span className="text-lg font-bold text-warm-primary">{project.code}</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${stage.bg} ${stage.text}`}
          >
            {stage.label}
          </span>
        </h2>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md border border-warm bg-surface-muted flex items-center justify-center text-warm-muted hover:bg-warm hover:text-warm-primary transition-colors text-base leading-none"
          aria-label="Close drawer"
        >
          &times;
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Project name */}
        <div className="text-[15px] font-semibold text-warm-primary">
          {project.code.replace(/^[a-zA-Z]\d{2}-?/, '')}
        </div>

        {/* Stats grid */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-warm-faint mb-1.5">Stats</div>
          <div className="grid grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-surface-muted border border-warm rounded-lg px-2.5 py-2 text-center"
              >
                <div className="text-xl font-bold text-warm-primary leading-tight">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-wide text-warm-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress checklist */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-warm-faint mb-1.5">Progress Checklist</div>
          <div className="flex flex-col gap-1">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-2 py-1 text-[13px]">
                <span
                  className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                    item.ok
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-50 text-red-500'
                  }`}
                >
                  {item.ok ? '\u2713' : '\u2715'}
                </span>
                <span className={item.ok ? 'text-warm-secondary' : 'text-warm-muted'}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Health assessment */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-warm-faint mb-1.5">Health Assessment</div>
          <div className="bg-surface-muted border border-warm rounded-lg px-3.5 py-3 text-[13px] leading-relaxed text-warm-secondary">
            {getHealthAssessment(project)}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-warm-faint mb-1.5">Quick Actions</div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                openFolder.mutate({ folder: 'recordings', projectCode: project.code })
              }
              className="flex-1 py-1.5 px-3 text-xs font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors text-center"
            >
              Open in Finder
            </button>
            <button
              onClick={() => copyProjectTranscript(project.code)}
              className="flex-1 py-1.5 px-3 text-xs font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors text-center"
            >
              Copy Transcript
            </button>
          </div>
        </div>

        {/* B062: Disk Usage section — left border separates it visually without font changes */}
        <div className="border-l-2 border-warm-strong pl-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wide text-warm-faint">Disk Usage</h4>
            <button
              onClick={() => refetchDisk()}
              className="text-xs text-warm-muted hover:text-warm-secondary"
              title="Refresh disk usage"
            >↻</button>
          </div>

          {diskFetching && !diskData ? (
            <p className="text-xs text-warm-muted">Calculating...</p>
          ) : !diskData ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-warm-muted">Not yet calculated</p>
              <button
                onClick={() => refetchDisk()}
                className="self-start py-1 px-2.5 text-xs font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors"
              >
                Calculate
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {/* B062 Wave 2: Recordings row with folder-open button */}
              <div className="flex items-center justify-between py-0.5 text-[12px]">
                <span className="text-warm-muted">Recordings</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-warm-secondary tabular-nums">{formatBytes(diskData.rec)}</span>
                  <button
                    onClick={() => openFolder.mutate({ folder: 'recordings', projectCode: project.code })}
                    className="text-[10px] text-warm-faint hover:text-warm-muted transition-colors flex-shrink-0"
                    title="Open in Finder: recordings"
                  >📂</button>
                </div>
              </div>

              {/* B062 Wave 2: recTopFiles breakdown below Recordings row */}
              {diskData.detail?.recTopFiles && diskData.detail.recTopFiles.length > 0 && (
                <div className="pl-3 flex flex-col gap-0.5 border-l border-warm ml-1">
                  {diskData.detail.recTopFiles.map((f) => (
                    <div key={f.name} className="flex items-center justify-between text-[11px]">
                      <span className="text-warm-faint truncate flex-1 mr-2">↳ {f.name}</span>
                      <span className="text-warm-muted tabular-nums flex-shrink-0">{formatBytes(f.size)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* B062 Wave 2: Shadows row with folder-open button */}
              <div className="flex items-center justify-between py-0.5 text-[12px]">
                <span className="text-warm-muted">Shadows</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-warm-secondary tabular-nums">{formatBytes(diskData.shadows)}</span>
                  <button
                    onClick={() => openFolder.mutate({ folder: 'shadows', projectCode: project.code })}
                    className="text-[10px] text-warm-faint hover:text-warm-muted transition-colors flex-shrink-0"
                    title="Open in Finder: recording-shadows"
                  >📂</button>
                </div>
              </div>

              {/* B062 Wave 2: Other row with folder-open button (opens project root) */}
              <div className="flex items-center justify-between py-0.5 text-[12px]">
                <span className="text-warm-muted">Other</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-warm-secondary tabular-nums">{formatBytes(diskData.other)}</span>
                  <button
                    onClick={() => openFolder.mutate({ folder: 'project', projectCode: project.code })}
                    className="text-[10px] text-warm-faint hover:text-warm-muted transition-colors flex-shrink-0"
                    title="Open in Finder: project root"
                  >📂</button>
                </div>
              </div>

              {/* B062 Wave 2: Other subfolder breakdown */}
              {diskData.detail?.other && Object.keys(diskData.detail.other).length > 0 && (
                <div className="pl-3 flex flex-col gap-0.5 border-l border-warm ml-1">
                  {Object.entries(diskData.detail.other)
                    .sort(([, a], [, b]) => b - a)
                    .map(([name, size]) => (
                      <div key={name} className="flex items-center justify-between text-[11px]">
                        <span className="text-warm-faint">↳ {name}</span>
                        <span className="text-warm-muted tabular-nums">{formatBytes(size)}</span>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* B062 Wave 2: Relay rows — folder-open disabled (relay path not available in drawer) */}
              {/* TODO: Pass relay base path as prop or derive from config to enable Finder open for relay rows */}
              <div className="flex items-center justify-between py-0.5 text-[12px]">
                <span className="text-warm-muted">Relay: Recordings</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-warm-secondary tabular-nums">{formatBytes(diskData.rRec)}</span>
                  <button
                    disabled
                    className="text-[10px] text-warm-faint opacity-40 flex-shrink-0 cursor-not-allowed"
                    title="Relay path not available"
                  >📂</button>
                </div>
              </div>

              <div className="flex items-center justify-between py-0.5 text-[12px]">
                <span className="text-warm-muted">Relay: 1st Edit</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-warm-secondary tabular-nums">{formatBytes(diskData.r1st)}</span>
                  <button
                    disabled
                    className="text-[10px] text-warm-faint opacity-40 flex-shrink-0 cursor-not-allowed"
                    title="Relay path not available"
                  >📂</button>
                </div>
              </div>

              <div className="flex items-center justify-between py-0.5 text-[12px]">
                <span className="text-warm-muted">Relay: 2nd Edit</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-warm-secondary tabular-nums">{formatBytes(diskData.r2nd)}</span>
                  <button
                    disabled
                    className="text-[10px] text-warm-faint opacity-40 flex-shrink-0 cursor-not-allowed"
                    title="Relay path not available"
                  >📂</button>
                </div>
              </div>

              {/* B062 Wave 2: Trash row with delete button */}
              <div className="flex items-center justify-between py-0.5 text-[12px]">
                <span className="text-warm-muted">Trash</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-warm-secondary tabular-nums">{formatBytes(diskData.trash)}</span>
                  {diskData.trash > 0 && (
                    <button
                      onClick={() => setShowTrashConfirm(true)}
                      className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                      title="Delete trash files"
                    >✕</button>
                  )}
                </div>
              </div>
              <div className="border-t border-warm mt-1 pt-1 flex items-center justify-between text-[12px]">
                <span className="font-semibold text-warm-secondary">Total</span>
                <span
                  className={`font-bold tabular-nums ${
                    diskData.total > 10 * 1024 * 1024 * 1024
                      ? 'text-red-600'
                      : diskData.total > 5 * 1024 * 1024 * 1024
                      ? 'text-amber-600'
                      : 'text-warm-primary'
                  }`}
                >
                  {formatBytes(diskData.total)}
                </span>
              </div>
              {diskData.calculatedAt && (
                <p className="text-xs text-warm-faint mt-1">
                  Calculated {formatRelativeTime(diskData.calculatedAt)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* B064: SSD Hold section */}
        <div className="border-l-2 border-warm-strong pl-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wide text-warm-faint">SSD Offload</h4>
          </div>

          {/* B064: State 1 — Loading */}
          {holdStatus.isFetching && !holdStatus.data && (
            <p className="text-xs text-warm-muted animate-pulse">Loading...</p>
          )}

          {/* B064: State 2 — ssd-not-configured */}
          {holdStatus.data && holdStatus.data.location === 'unknown' && (
            <p className="text-xs text-warm-muted">SSD offload not configured</p>
          )}

          {/* B064: State 3 — relay-blocked */}
          {holdStatus.data && holdStatus.data.relayBlocked && holdStatus.data.location !== 'unknown' && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-amber-700 font-medium">⚠ Relay active — clear relay before offloading</p>
              <p className="text-[11px] text-amber-600">{formatBytesUtil(holdStatus.data.relayBytes)} in relay subfolders</p>
            </div>
          )}

          {/* B064: State 4 — ssd-not-mounted */}
          {holdStatus.data &&
            !holdStatus.data.relayBlocked &&
            holdStatus.data.location !== 'unknown' &&
            !holdStatus.data.ssdMounted && (
            <p className="text-xs text-warm-muted">SSD not connected</p>
          )}

          {/* B064: State 5 — local-only */}
          {holdStatus.data &&
            !holdStatus.data.relayBlocked &&
            holdStatus.data.location !== 'unknown' &&
            holdStatus.data.ssdMounted &&
            holdStatus.data.location === 'local-only' && (
            <div className="flex flex-col gap-2">
              <p className="text-[12px] text-warm-secondary">Location: Local only</p>
              {dryRunMessage && (
                <p className="text-[11px] text-warm-muted bg-surface-muted border border-warm rounded px-2 py-1">{dryRunMessage}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDryRunMessage(null);
                    holdProject.mutate({ code: project.code, dryRun: false });
                  }}
                  disabled={holdProject.isPending}
                  className="flex-1 py-1.5 px-3 text-xs font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors disabled:opacity-50"
                >
                  {holdProject.isPending ? 'Offloading...' : 'Offload to SSD'}
                </button>
                <button
                  onClick={() => {
                    holdProject.mutate(
                      { code: project.code, dryRun: true },
                      {
                        onSuccess: (result) => {
                          const r = result as unknown as { localBytes?: number; holdingPath?: string };
                          if (r.localBytes != null) {
                            setDryRunMessage(`Would copy ${formatBytesUtil(r.localBytes)} to ${r.holdingPath ?? 'SSD'}`);
                          } else {
                            setDryRunMessage('Preview complete — no size info returned');
                          }
                        },
                      }
                    );
                  }}
                  disabled={holdProject.isPending}
                  className="flex-1 py-1.5 px-3 text-xs font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors disabled:opacity-50"
                >
                  Preview
                </button>
              </div>
            </div>
          )}

          {/* B064: States 6 + 7 + 8 — both (offload incomplete) */}
          {holdStatus.data &&
            !holdStatus.data.relayBlocked &&
            holdStatus.data.location !== 'unknown' &&
            holdStatus.data.ssdMounted &&
            holdStatus.data.location === 'both' && (() => {
            const hs = holdStatus.data!;
            const ver = hs.verification;

            // B064: State 6 — verifying (no verification result yet); mutate triggered by useEffect above
            if (!ver) {
              return (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-amber-700 font-medium">⚠ Offload incomplete — space not freed yet</p>
                  <p className="text-xs text-warm-muted flex items-center gap-1">
                    <span className="inline-block w-3 h-3 border-2 border-warm-muted border-t-transparent rounded-full animate-spin" />
                    Verifying files...
                  </p>
                </div>
              );
            }

            // B064: State 7 — both, verified match
            if (ver.match) {
              return (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-amber-700 font-medium">⚠ Offload incomplete — space not freed yet</p>
                  <p className="text-[11px] text-warm-secondary">
                    SSD copy: {ver.holdingFiles} files, {formatBytesUtil(ver.holdingBytes)} ✓ matches local
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setHoldModal({ open: true, target: 'local' })}
                      className="w-full py-1.5 px-3 text-xs font-medium rounded-md border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                    >
                      Free {formatBytesUtil(ver.localBytes)} — Delete Local
                    </button>
                    <button
                      onClick={() => setHoldModal({ open: true, target: 'holding' })}
                      className="w-full py-1.5 px-3 text-xs font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors"
                    >
                      Cancel — Remove SSD copy
                    </button>
                  </div>
                </div>
              );
            }

            // B064: State 8 — both, verified mismatch
            return (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-red-700 font-medium">✗ Files don't match — cannot delete local</p>
                <p className="text-[11px] text-warm-muted">
                  Local: {ver.localFiles} files &nbsp;|&nbsp; SSD: {ver.holdingFiles} files
                </p>
                <button
                  onClick={() => holdProject.mutate({ code: project.code, dryRun: false })}
                  disabled={holdProject.isPending}
                  className="w-full py-1.5 px-3 text-xs font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors disabled:opacity-50"
                >
                  Re-run rsync
                </button>
                <p className="text-[11px] text-warm-muted">To cancel: restore from SSD first, or re-run offload to fix the mismatch.</p>
              </div>
            );
          })()}

          {/* B064: State 9 — holding-only */}
          {holdStatus.data &&
            !holdStatus.data.relayBlocked &&
            holdStatus.data.location !== 'unknown' &&
            holdStatus.data.ssdMounted &&
            holdStatus.data.location === 'holding-only' && (
            <div className="flex flex-col gap-2">
              <p className="text-[12px] text-warm-secondary">Location: SSD only (local deleted)</p>
              {holdStatus.data.heldAt && (
                <p className="text-[11px] text-warm-muted">Held: {formatDate(holdStatus.data.heldAt)}</p>
              )}
              <button
                onClick={() => restoreFromHolding.mutate({ code: project.code })}
                disabled={restoreFromHolding.isPending}
                className="w-full py-1.5 px-3 text-xs font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors disabled:opacity-50"
              >
                {restoreFromHolding.isPending ? 'Restoring...' : 'Restore from SSD'}
              </button>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex justify-between text-[11px] text-warm-faint">
          <span>Last modified: {formatDate(project.lastModified)}</span>
          <span>{daysAgoLabel(project.lastModified)}</span>
        </div>
      </div>

      {/* B064: HoldDeleteModal — wired for delete-local and delete-holding */}
      {holdStatus.data && holdStatus.data.verification && (
        <HoldDeleteModal
          isOpen={holdModal.open}
          onClose={() => setHoldModal((s) => ({ ...s, open: false }))}
          onConfirm={() => {
            if (holdModal.target === 'local') {
              deleteLocal.mutate(
                { code: project.code },
                { onSuccess: () => setHoldModal((s) => ({ ...s, open: false })) }
              );
            } else {
              deleteHolding.mutate(
                { code: project.code },
                { onSuccess: () => setHoldModal((s) => ({ ...s, open: false })) }
              );
            }
          }}
          target={holdModal.target}
          projectCode={project.code}
          folderName={
            holdModal.target === 'local'
              ? project.code
              : (holdStatus.data.holdingPath?.split('/').pop() ?? project.code)
          }
          bytesFreed={
            holdModal.target === 'local'
              ? holdStatus.data.verification.localBytes
              : holdStatus.data.verification.holdingBytes
          }
          targetPath={
            holdModal.target === 'local'
              ? (project.path ?? project.code)
              : (holdStatus.data.holdingPath ?? '')
          }
          verification={holdStatus.data.verification}
          isLoading={deleteLocal.isPending || deleteHolding.isPending}
          errorMessage={
            deleteLocal.error
              ? (deleteLocal.error instanceof Error ? deleteLocal.error.message : 'Delete failed')
              : deleteHolding.error
              ? (deleteHolding.error instanceof Error ? deleteHolding.error.message : 'Delete failed')
              : null
          }
        />
      )}

      {/* B062 Wave 2: Trash delete confirmation modal */}
      {showTrashConfirm && diskData && project && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface border border-warm rounded-xl shadow-xl w-[480px] max-h-[70vh] flex flex-col p-5 gap-3">
            <h3 className="text-sm font-semibold text-warm-primary">Delete Trash Files</h3>

            {/* Path + Open Finder */}
            <div className="flex items-center gap-2 bg-surface-muted rounded-md px-3 py-2">
              <span className="text-[11px] text-warm-muted font-mono flex-1 break-all">
                {project.path}/-trash/
              </span>
              <button
                onClick={() => openFolder.mutate({ folder: 'trash', projectCode: project.code })}
                className="text-[10px] text-warm-muted hover:text-warm-secondary flex-shrink-0"
                title="Open in Finder"
              >📂</button>
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto border border-warm rounded-md divide-y divide-warm">
              {diskData.detail?.trashFiles && diskData.detail.trashFiles.length > 0 ? (
                diskData.detail.trashFiles.map((f) => (
                  <div key={f.name} className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                    <span className="text-warm-secondary truncate flex-1 mr-2">{f.name}</span>
                    <span className="text-warm-muted tabular-nums flex-shrink-0">{formatBytes(f.size)}</span>
                  </div>
                ))
              ) : (
                <p className="px-3 py-2 text-[11px] text-warm-muted">No files listed (data may be stale — refresh disk usage first)</p>
              )}
            </div>

            {/* Total + actions */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-warm-muted">
                Total: <span className="font-medium text-warm-secondary">{formatBytes(diskData.trash)}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTrashConfirm(false)}
                  className="px-3 py-1.5 text-xs rounded-md border border-warm text-warm-secondary hover:bg-surface-muted"
                >Cancel</button>
                <button
                  onClick={() => { deleteTrash(); setShowTrashConfirm(false); }}
                  disabled={deletingTrash}
                  className="px-3 py-1.5 text-xs rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                >
                  Delete {diskData.detail?.trashFiles?.length ?? '?'} files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
