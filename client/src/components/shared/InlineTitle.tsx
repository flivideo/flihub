// FR-157: Click-to-edit single-line title (project / chapter YouTube titles).
// Edit where the data is visible: click the text, Enter saves, Esc/blur cancels, '' clears.
import { useEffect, useRef, useState } from 'react';

interface InlineTitleProps {
  value: string | null | undefined;
  placeholder: string;
  onSave: (value: string) => Promise<unknown> | unknown;
  className?: string;
  inputClassName?: string;
  title?: string; // tooltip
}

export function InlineTitle({ value, placeholder, onSave, className = '', inputClassName = '', title }: InlineTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const start = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(value ?? '');
    setEditing(true);
  };
  const cancel = () => setEditing(false);
  const commit = async () => {
    const next = draft.trim();
    setEditing(false);
    if (next === (value ?? '')) return;
    await onSave(next);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); void commit(); }
          if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        }}
        onBlur={cancel}
        maxLength={200}
        className={`px-1 py-0 border border-blue-300 rounded bg-surface focus:outline-none focus:ring-1 focus:ring-blue-400 ${inputClassName}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      title={title ?? 'Click to edit'}
      className={`text-left hover:underline decoration-dotted underline-offset-2 ${value ? '' : 'text-warm-faint italic'} ${className}`}
    >
      {value || placeholder}
    </button>
  );
}
