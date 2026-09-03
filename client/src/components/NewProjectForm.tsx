/**
 * FR-163: New Project form — code pre-filled (read-only until unlocked), free-text
 * description with live kebab conversion, exact-folder-name preview, warn-not-block length.
 */
import { useEffect, useRef, useState } from 'react';
import { useNextProjectCode } from '../hooks/useProjectsApi';
import {
  descriptionToKebab,
  MANUAL_CODE_PATTERN,
  NAME_LENGTH_GUIDELINE,
} from '../utils/projectName';

interface NewProjectFormProps {
  existingNames: string[]; // full folder names in the live root
  pending: boolean;
  onCreate: (fullName: string) => void;
  onCancel: () => void;
}

function parseManual(code: string): { letter: string; num: number } | null {
  const m = code.match(/^([a-z])(\d{2})$/);
  return m ? { letter: m[1], num: parseInt(m[2], 10) } : null;
}

export function NewProjectForm({ existingNames, pending, onCreate, onCancel }: NewProjectFormProps) {
  const { data: nextData, isLoading } = useNextProjectCode(true);
  const [description, setDescription] = useState('');
  const [manualCode, setManualCode] = useState<string | null>(null); // null = locked to computed
  const descRef = useRef<HTMLInputElement>(null);

  // AC 15: a brand switch changes the root — recompute, never carry the old code over
  const root = nextData?.root;
  useEffect(() => {
    setManualCode(null);
  }, [root]);

  useEffect(() => {
    descRef.current?.focus();
  }, []);

  const state = nextData?.state ?? 'ok';
  const computed = nextData?.next ?? '';
  // D6/D4: unreadable or exhausted → empty, unlocked field with the reason
  const mustBeManual = state === 'unreadable' || state === 'exhausted';
  const unlocked = mustBeManual || manualCode !== null;
  const code = manualCode !== null ? manualCode : mustBeManual ? '' : computed;

  const kebab = descriptionToKebab(description);
  const fullName = code && kebab ? `${code}-${kebab}` : '';

  const manualParsed = parseManual(code);
  const codeInvalid = unlocked && code !== '' && !manualParsed;
  const computedParsed = parseManual(computed);
  const belowNext =
    manualCode !== null &&
    manualParsed &&
    computedParsed &&
    (manualParsed.letter < computedParsed.letter ||
      (manualParsed.letter === computedParsed.letter && manualParsed.num < computedParsed.num));
  const collision = fullName !== '' && existingNames.includes(fullName);
  const overLength = fullName.length > NAME_LENGTH_GUIDELINE;

  const createDisabled =
    pending || isLoading || !kebab || code === '' || codeInvalid || collision;

  const submit = () => {
    if (!createDisabled) onCreate(fullName);
  };

  return (
    <div className="p-3 bg-surface-muted rounded-lg border border-warm">
      <div className="flex gap-2 items-start">
        {/* Code field — read-only until unlocked (§4.2) */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={code}
            readOnly={!unlocked}
            onChange={(e) => setManualCode(e.target.value.toLowerCase().trim())}
            placeholder={mustBeManual ? 'code' : ''}
            className={`w-16 px-2 py-1.5 text-sm font-mono border rounded focus:outline-none ${
              codeInvalid || collision
                ? 'border-red-400 text-red-700 bg-red-50'
                : unlocked
                  ? 'border-blue-300 bg-surface focus:ring-2 focus:ring-blue-500'
                  : 'border-warm bg-surface-hover text-warm-muted'
            }`}
            title={unlocked ? 'Project code (letter + two digits)' : 'Computed next code — click the pencil to override'}
          />
          {!mustBeManual &&
            (unlocked ? (
              <button
                onClick={() => setManualCode(null)}
                className="text-warm-muted hover:text-warm-secondary text-sm"
                title={`Reset to computed code (${computed})`}
              >
                ↺
              </button>
            ) : (
              <button
                onClick={() => setManualCode(computed)}
                className="text-warm-muted hover:text-warm-secondary text-sm"
                title="Override the code manually"
              >
                ✏️
              </button>
            ))}
        </div>

        {/* Description — free text, converted live (§4.3) */}
        <input
          ref={descRef}
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (free text — converted below)"
          className="flex-1 px-3 py-1.5 text-sm border border-warm-strong rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button
          onClick={submit}
          disabled={createDisabled}
          className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {pending ? 'Creating...' : 'Create'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-warm-secondary hover:bg-surface-hover rounded transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Live preview of the exact folder name (§4.3) */}
      <div className="mt-2 flex items-center gap-3">
        <span className={`font-mono text-sm ${fullName ? (collision || codeInvalid ? 'text-red-600' : overLength ? 'text-red-600' : 'text-blue-600') : 'text-warm-faint'}`}>
          {fullName || (code ? `${code}-` : '')}
          {!kebab && <span className="italic"> Add a description</span>}
        </span>
        {fullName && (
          <span className={`text-xs font-mono ${overLength ? 'text-red-600' : 'text-warm-muted'}`}>
            {fullName.length} / {NAME_LENGTH_GUIDELINE}
          </span>
        )}
      </div>

      {/* Refusals and warnings — visible, per CLAUDE.md operating rules (§4.5) */}
      {state === 'empty' && !manualCode && (
        <p className="text-xs text-warm-muted mt-1">First project in this root.</p>
      )}
      {mustBeManual && (
        <p className="text-xs text-yellow-700 mt-1">{nextData?.reason}</p>
      )}
      {codeInvalid && (
        <p className="text-xs text-red-600 mt-1">Code must be a letter and two digits (e.g. d03)</p>
      )}
      {collision && (
        <p className="text-xs text-red-600 mt-1">Project {fullName} already exists</p>
      )}
      {!collision && !codeInvalid && belowNext && (
        <p className="text-xs text-amber-600 mt-1">
          {code} is below the next code ({computed}) — this reuses a retired code.
        </p>
      )}
      {overLength && (
        <p className="text-xs text-red-600 mt-1">
          Name is {fullName.length} characters — over the {NAME_LENGTH_GUIDELINE}-character
          guideline. It will still be created.
        </p>
      )}
    </div>
  );
}
