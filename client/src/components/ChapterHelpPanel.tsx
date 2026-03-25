// Chapter Operations Help Panel - slide-out guide for managing chapters
import { useState } from 'react';

export function ChapterHelpPanel() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded(expanded === id ? null : id);

  return (
    <div className="bg-surface rounded-l-lg border border-r-0 border-warm shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-warm">
        <h3 className="text-sm font-semibold text-warm-secondary uppercase tracking-wide">
          Chapter Tools
        </h3>
        <p className="text-xs text-warm-muted mt-1">How to reorganise your chapters</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-sm">

        {/* Scenario 1: Insert a new chapter */}
        <HelpSection
          id="insert"
          title="Insert a New Chapter"
          expanded={expanded === 'insert'}
          onToggle={() => toggle('insert')}
        >
          <p className="text-warm-secondary mb-2">
            Need to add a chapter between existing ones? Two approaches:
          </p>
          <div className="space-y-3">
            <div>
              <h5 className="font-semibold text-warm-secondary flex items-center gap-1.5">
                <span className="text-green-600">A</span> Record then Split
                <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">recommended</span>
              </h5>
              <ol className="list-decimal list-inside text-warm-muted mt-1 space-y-0.5 text-xs">
                <li>Record your new clips into the <strong>existing chapter</strong> (they get the next sequence number)</li>
                <li>Select the first new clip on this page</li>
                <li>Click <strong>"Split Here"</strong> in the batch toolbar</li>
                <li>The split creates a new chapter and <strong>cascades</strong> all later chapters forward</li>
              </ol>
              <p className="text-[11px] text-warm-faint mt-1 italic">
                Example: Add seq 3 to Ch 02 → split at seq 3 → new Ch 03 is created, old Ch 03 becomes 04, etc.
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-warm-secondary flex items-center gap-1.5">
                <span className="text-blue-600">B</span> Renumber then Record
              </h5>
              <ol className="list-decimal list-inside text-warm-muted mt-1 space-y-0.5 text-xs">
                <li>Go to <strong>Manage → Rename Chapter</strong></li>
                <li>Rename chapters from <em>highest to lowest</em> to make a gap (e.g. 04→05, then 03→04)</li>
                <li>Record new clips into the now-empty chapter number</li>
              </ol>
              <p className="text-[11px] text-warm-faint mt-1 italic">
                More manual steps, but useful when you haven't recorded yet.
              </p>
            </div>
          </div>
        </HelpSection>

        {/* Scenario 2: Move files between chapters */}
        <HelpSection
          id="move"
          title="Move Files to Another Chapter"
          expanded={expanded === 'move'}
          onToggle={() => toggle('move')}
        >
          <ol className="list-decimal list-inside text-warm-muted space-y-0.5 text-xs">
            <li>Select files using checkboxes on this page</li>
            <li>Click <strong>"Move to Ch..."</strong> in the batch toolbar</li>
            <li>Enter the target chapter number</li>
            <li>Choose sequence mode: <em>preserve</em> or <em>renumber</em></li>
          </ol>
          <p className="text-[11px] text-warm-faint mt-2 italic">
            This moves files only — it does not cascade other chapters.
          </p>
        </HelpSection>

        {/* Scenario 3: Swap chapters */}
        <HelpSection
          id="swap"
          title="Swap Two Chapters"
          expanded={expanded === 'swap'}
          onToggle={() => toggle('swap')}
        >
          <p className="text-warm-muted text-xs">
            Swaps all files between two chapters using chapter 99 as a temporary staging area.
          </p>
          <p className="text-[11px] text-amber-600 mt-1">
            API only — no UI button yet. Use the inline chapter editor on individual files as a workaround.
          </p>
          <p className="text-[11px] text-warm-faint mt-1 italic">
            Example: Swap Ch 02 ↔ Ch 03 to reorder your content.
          </p>
        </HelpSection>

        {/* Scenario 4: Rename a chapter number */}
        <HelpSection
          id="rename"
          title="Rename a Chapter Number"
          expanded={expanded === 'rename'}
          onToggle={() => toggle('rename')}
        >
          <p className="text-warm-muted text-xs">
            Changes the chapter number on all files in a chapter (e.g. Ch 03 → Ch 05). Use <strong>inline editing</strong> — click the chapter number on any file to change it, then apply to all files in the chapter.
          </p>
          <p className="text-[11px] text-warm-faint mt-1 italic">
            Does not cascade — will block if the target chapter already has files.
          </p>
        </HelpSection>

        {/* Scenario 5: Inline editing */}
        <HelpSection
          id="inline"
          title="Edit Individual Files"
          expanded={expanded === 'inline'}
          onToggle={() => toggle('inline')}
        >
          <p className="text-warm-muted text-xs">
            Click any part of a filename on this page to edit it inline:
          </p>
          <ul className="list-disc list-inside text-warm-muted text-xs mt-1 space-y-0.5">
            <li><strong>Chapter number</strong> — move a single file to a different chapter</li>
            <li><strong>Sequence number</strong> — reorder within a chapter</li>
            <li><strong>Name</strong> — change the descriptive label</li>
            <li><strong>Tags</strong> — add/remove tags (CTA, SKOOL, etc.)</li>
          </ul>
        </HelpSection>

        {/* Where things live */}
        <div className="border-t border-warm pt-3 mt-3">
          <h4 className="text-xs font-semibold text-warm-secondary uppercase tracking-wide mb-2">Where to find tools</h4>
          <div className="text-xs text-warm-muted space-y-1">
            <div className="flex items-start gap-2">
              <span className="font-mono text-warm-faint w-24 flex-shrink-0">Recordings</span>
              <span>Split, Move, Inline Edit, Tags, Batch Rename</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-warm-faint w-24 flex-shrink-0">Manage</span>
              <span>Regen Shadows/Transcripts, Relay Sync</span>
            </div>
          </div>
        </div>

        {/* Safety note */}
        <div className="border-t border-warm pt-3 mt-3">
          <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Safety
          </h4>
          <p className="text-[11px] text-warm-muted">
            All operations use <strong>rename</strong> (move), never delete. Collisions are blocked — if a target file already exists, the operation will stop with an error. An <strong>undo</strong> toast appears for 30 seconds after batch operations.
          </p>
          <p className="text-[11px] text-warm-muted mt-1.5">
            <strong>Before big operations:</strong> Run{' '}
            <code className="bg-surface-hover px-1 rounded font-mono">dam archive appydave &lt;project&gt;</code>{' '}
            in terminal to back up to the T7 drive first. See the <strong>DAM</strong> tab below for details.
          </p>
        </div>

      </div>
    </div>
  );
}

interface HelpSectionProps {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function HelpSection({ title, expanded, onToggle, children }: HelpSectionProps) {
  return (
    <div className="border border-warm rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-surface-hover transition-colors"
      >
        <span className="text-sm font-medium text-warm-secondary">{title}</span>
        <svg
          className={`w-4 h-4 text-warm-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-warm bg-surface-hover/50">
          <div className="pt-2">{children}</div>
        </div>
      )}
    </div>
  );
}
