// Recording sets (fli-core v0.38.0): the set strip under the tabs, the "All sets" overview, and New set.
// The strip shows only on Incoming, Recordings, Watch and Transcripts, and only for a project that has
// sets (hub/sets/). A project without sets looks exactly as before.
import { useState } from 'react';
import { toast } from 'sonner';
import type { RecordingSetSummary } from '../../../shared/types';
import { useCreateSet, useRecordingSets, useSetActiveSet } from '../hooks/useSetsApi';
import { formatDuration } from '../utils/formatting';

/** Shown on a project without sets wherever New set would be (David: no migration in FliHub). */
export const NOT_A_SET_PROJECT = 'Moving this project into sets comes from FliStudio';

function dotColour(s: RecordingSetSummary): string {
  if (s.takes === 0) return '#a8a29e';
  return s.transcribed === s.takes ? '#16a34a' : '#d97706';
}

function RoleBadge({ role }: { role: RecordingSetSummary['role'] }) {
  return role === 'video' ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 whitespace-nowrap">Own video</span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">Part of final</span>
  );
}

function NewSetForm({ onDone }: { onDone: () => void }) {
  const create = useCreateSet();
  const [title, setTitle] = useState('');
  const id = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const submit = async () => {
    if (!id) return;
    try {
      const res = await create.mutateAsync({ id, title: title.trim() });
      if (!res.success) toast.error(res.error ?? 'Set not created');
      else {
        toast.success(`Set "${id}" created`);
        onDone();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Set not created');
    }
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') onDone();
        }}
        placeholder="Set name"
        className="text-xs px-2 py-1 rounded border border-warm bg-surface w-36"
      />
      {id && <code className="text-xs text-warm-muted">hub/sets/{id}/</code>}
      <button onClick={submit} disabled={!id || create.isPending} className="text-xs text-blue-600 disabled:opacity-40">
        Create
      </button>
      <button onClick={onDone} className="text-xs text-warm-muted">
        Cancel
      </button>
    </span>
  );
}

/** "All sets" is a client view: it never changes which set new takes go into. */
export function SetStrip({ showAll, onShowAll }: { showAll: boolean; onShowAll: (all: boolean) => void }) {
  const { data } = useRecordingSets();
  const setActive = useSetActiveSet();
  const [adding, setAdding] = useState(false);
  if (!data?.hasSets) return null;

  const choose = async (id: string) => {
    onShowAll(false);
    if (id === data.active) return;
    try {
      const res = await setActive.mutateAsync(id);
      if (!res.success) toast.error(res.error ?? 'Set not switched');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Set not switched');
    }
  };

  const pill = 'text-xs rounded-full px-3 py-1 border whitespace-nowrap transition-colors';
  const on = 'bg-white border-blue-600 ring-1 ring-inset ring-blue-600 text-warm-primary';
  const off = 'bg-surface border-warm text-warm-secondary hover:bg-surface-hover';

  return (
    <div data-testid="set-strip" className="border-b border-warm bg-surface-muted">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs text-warm-muted mr-1">Sets</span>
        <button className={`${pill} ${showAll ? on : off}`} onClick={() => onShowAll(true)}>
          All sets<span className="ml-1.5 text-warm-muted">{data.sets.length}</span>
        </button>
        {data.sets.map((s) => {
          const active = s.id === data.active;
          return (
            <button
              key={s.id}
              data-set={s.id}
              className={`${pill} ${active && !showAll ? on : off}`}
              onClick={() => choose(s.id)}
              title={`${s.title} — hub/sets/${s.id}/${active ? ' (new takes go here)' : ''}`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: dotColour(s) }} />
              {s.title}
              <span className="ml-1.5 text-warm-muted">
                {s.takes ? `${s.takes} · ${formatDuration(s.durationSec)}` : 'empty'}
              </span>
              {active && showAll && <span className="ml-2 text-red-600">● recording here</span>}
            </button>
          );
        })}
        {adding ? (
          <NewSetForm onDone={() => setAdding(false)} />
        ) : (
          <button className={`${pill} border-dashed border-warm text-blue-600 bg-transparent`} onClick={() => setAdding(true)}>
            + New set
          </button>
        )}
      </div>
    </div>
  );
}

/** One row per set: takes and length (mock, 10 Nov). Clicking a set opens it and makes it active. */
export function AllSetsOverview({ onOpen }: { onOpen: () => void }) {
  const { data } = useRecordingSets();
  const setActive = useSetActiveSet();
  if (!data?.hasSets) return null;
  const open = async (id: string) => {
    try {
      if (id !== data.active) {
        const res = await setActive.mutateAsync(id);
        if (!res.success) {
          toast.error(res.error ?? 'Set not switched');
          return;
        }
      }
      onOpen();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Set not switched');
    }
  };
  const total = data.sets.reduce((a, s) => a + s.durationSec, 0);
  return (
    <section data-testid="all-sets">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-lg font-medium text-warm-secondary">Project Recordings</h2>
        <span className="text-sm text-warm-muted">All sets: one row per set</span>
      </div>
      <table className="w-full text-sm border border-warm rounded-lg overflow-hidden bg-surface">
        <thead className="bg-surface-muted text-xs text-warm-muted">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Set</th>
            <th className="text-right px-3 py-2 font-medium">Takes</th>
            <th className="text-right px-3 py-2 font-medium">Chapters</th>
            <th className="text-right px-3 py-2 font-medium">Length</th>
            <th className="text-right px-3 py-2 font-medium">Transcribed</th>
            <th className="text-left px-3 py-2 font-medium">Becomes</th>
          </tr>
        </thead>
        <tbody>
          {data.sets.map((s) => (
            <tr key={s.id} className="border-t border-warm">
              <td className="px-3 py-2">
                <button className="text-blue-600 hover:underline" onClick={() => open(s.id)}>
                  {s.title}
                </button>
                {s.id === data.active && <span className="ml-2 text-xs text-red-600">● recording here</span>}
                <div className="text-xs text-warm-muted font-mono">hub/sets/{s.id}/</div>
                {!s.listed && <div className="text-xs text-amber-700">Not in sets.json — shown by folder name</div>}
              </td>
              <td className="px-3 py-2 text-right">{s.takes}</td>
              <td className="px-3 py-2 text-right">{s.chapters}</td>
              <td className="px-3 py-2 text-right font-mono">{s.takes ? formatDuration(s.durationSec) : '–'}</td>
              <td className="px-3 py-2 text-right">
                {s.takes ? `${s.transcribed}/${s.takes}` : '–'}
              </td>
              <td className="px-3 py-2">
                <RoleBadge role={s.role} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-right text-sm text-warm-muted mt-3">Total: {formatDuration(total)}</div>
    </section>
  );
}

/** The line above a set's takes: which set this is and where its files live. */
export function ActiveSetLine() {
  const { data } = useRecordingSets();
  if (!data?.hasSets || !data.active) return null;
  const s = data.sets.find((x) => x.id === data.active);
  if (!s) return null;
  return (
    <div data-testid="active-set-line" className="text-sm text-warm-secondary mb-3 flex items-center gap-2 flex-wrap">
      <span>
        Set <b>{s.title}</b>
      </span>
      <span className="text-warm-muted">·</span>
      <RoleBadge role={s.role} />
      <span className="text-warm-muted">·</span>
      <span className="text-warm-muted">
        folder <code>hub/sets/{s.id}/</code>
      </span>
    </div>
  );
}

/** Incoming: which set a new take is named into. */
export function IncomingSetLine() {
  const { data } = useRecordingSets();
  if (!data?.hasSets || !data.active) return null;
  const s = data.sets.find((x) => x.id === data.active);
  return (
    <div data-testid="incoming-set-line" className="text-sm text-warm-secondary mb-3">
      New takes go into set <b>{s?.title ?? data.active}</b> →{' '}
      <code className="text-xs">hub/sets/{data.active}/recordings/</code>
    </div>
  );
}

/** New set on a project without sets: shown, disabled, with the reason. */
export function NewSetDisabled() {
  const { data } = useRecordingSets();
  if (!data || data.hasSets || !data.success) return null;
  return (
    <span className="inline-flex items-center gap-1.5" title={NOT_A_SET_PROJECT}>
      <button disabled className="text-xs rounded-full px-3 py-1 border border-dashed border-warm text-warm-muted opacity-50 cursor-not-allowed">
        + New set
      </button>
      <span className="text-xs text-warm-muted">{NOT_A_SET_PROJECT}</span>
    </span>
  );
}
