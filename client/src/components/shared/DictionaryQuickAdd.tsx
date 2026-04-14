// B070: Inline word capture widget for adding words to Global or Project dictionary
import { useState } from 'react';
import { toast } from 'sonner';

export interface DictionaryQuickAddProps {
  globalWords: string[];
  projectWords: string[];
  projectCode: string | null;
  onAddGlobal: (word: string) => Promise<void>;
  onAddProject: (word: string) => Promise<void>;
}

function WordListTooltip({ words, label }: { words: string[]; label: string }) {
  const sorted = [...words].sort((a, b) => a.localeCompare(b));
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 bg-surface border border-warm rounded shadow-lg p-2 pointer-events-none">
      <p className="text-xs text-warm-muted font-medium mb-1">{label}</p>
      {sorted.length === 0 ? (
        <p className="text-xs text-warm-faint italic">No words yet</p>
      ) : (
        <p className="text-xs text-warm-secondary leading-relaxed">
          {sorted.join(', ')}
        </p>
      )}
    </div>
  );
}

export function DictionaryQuickAdd({
  globalWords,
  projectWords,
  projectCode,
  onAddGlobal,
  onAddProject,
}: DictionaryQuickAddProps) {
  const [input, setInput] = useState('');
  const [hovering, setHovering] = useState<'global' | 'project' | null>(null);

  const trimmed = input.trim();
  const isEmpty = trimmed.length === 0;

  async function handleAddGlobal() {
    if (isEmpty) return;
    const isDuplicate = globalWords.some(
      (w) => w.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      toast.warning(`"${trimmed}" is already in Global dictionary`);
      return;
    }
    await onAddGlobal(trimmed);
    toast.success(`"${trimmed}" added to Global dictionary`);
    setInput('');
  }

  async function handleAddProject() {
    if (isEmpty || !projectCode) return;
    const isDuplicate = projectWords.some(
      (w) => w.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      toast.warning(`"${trimmed}" is already in Project dictionary`);
      return;
    }
    await onAddProject(trimmed);
    toast.success(`"${trimmed}" added to Project dictionary`);
    setInput('');
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAddGlobal();
        }}
        placeholder="+ word..."
        className="w-[140px] text-xs px-2 py-1 rounded bg-surface-muted border border-warm text-warm-primary placeholder:text-warm-faint focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {/* Global button with hover word list */}
      <div
        className="relative"
        onMouseEnter={() => setHovering('global')}
        onMouseLeave={() => setHovering(null)}
      >
        {hovering === 'global' && (
          <WordListTooltip words={globalWords} label="Global dictionary" />
        )}
        <button
          onClick={handleAddGlobal}
          disabled={isEmpty}
          className="text-xs px-2 py-1 rounded bg-surface-muted text-warm-secondary hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Global
        </button>
      </div>

      {/* Project button with hover word list */}
      <div
        className="relative"
        onMouseEnter={() => setHovering('project')}
        onMouseLeave={() => setHovering(null)}
      >
        {hovering === 'project' && (
          <WordListTooltip
            words={projectWords}
            label={projectCode ? `Project: ${projectCode}` : 'No active project'}
          />
        )}
        <button
          onClick={handleAddProject}
          disabled={isEmpty || !projectCode}
          className="text-xs px-2 py-1 rounded bg-surface-muted text-warm-secondary hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Project
        </button>
      </div>
    </div>
  );
}
