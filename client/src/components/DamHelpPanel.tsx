// DAM (Digital Asset Management) help panel - slide-out guide for archiving and storage
export function DamHelpPanel() {
  return (
    <div className="bg-surface rounded-l-lg border border-r-0 border-warm shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-warm">
        <h3 className="text-sm font-semibold text-warm-secondary uppercase tracking-wide">
          DAM &amp; Archiving
        </h3>
        <p className="text-xs text-warm-muted mt-1">Digital Asset Management &amp; backup</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-sm">

        {/* What is DAM */}
        <div>
          <h4 className="text-xs font-semibold text-warm-secondary uppercase tracking-wide mb-1.5">
            What is DAM?
          </h4>
          <p className="text-xs text-warm-muted">
            The <code className="text-xs bg-surface-hover px-1 py-0.5 rounded font-mono">dam</code> CLI
            (in <strong>appydave-tools</strong>) manages the storage lifecycle of your video projects —
            archiving to external drives, S3 uploads for editors, and cleanup after publishing.
          </p>
        </div>

        {/* Storage tiers */}
        <div>
          <h4 className="text-xs font-semibold text-warm-secondary uppercase tracking-wide mb-1.5">
            Storage Tiers
          </h4>
          <div className="space-y-1.5 text-xs text-warm-muted">
            <div className="flex items-start gap-2">
              <span className="font-mono text-warm-faint w-16 flex-shrink-0 text-right">Local</span>
              <span>Working storage on SSD — active projects</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-warm-faint w-16 flex-shrink-0 text-right">S3</span>
              <span>Hot storage — 90-day collaboration staging for editors</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-warm-faint w-16 flex-shrink-0 text-right">T7 SSD</span>
              <span>External drive — medium-term archive ({'\u2009'}/Volumes/T7)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-warm-faint w-16 flex-shrink-0 text-right">Glacier</span>
              <span>Cold archive — long-term backup (~$0.004/GB)</span>
            </div>
          </div>
        </div>

        {/* Common commands */}
        <div>
          <h4 className="text-xs font-semibold text-warm-secondary uppercase tracking-wide mb-1.5">
            Common Commands
          </h4>
          <div className="space-y-2 text-xs">
            <CommandBlock
              command="dam archive appydave <project>"
              description="Copy project to T7 external drive"
            />
            <CommandBlock
              command="dam archive appydave <project> --force"
              description="Archive to T7, then delete local copy"
            />
            <CommandBlock
              command="dam ssd-status"
              description="Check which external drives are mounted"
            />
            <CommandBlock
              command="dam s3-up appydave <project>"
              description="Upload s3-staging/ files to S3 for editor"
            />
            <CommandBlock
              command="dam s3-cleanup-remote appydave <project> --force"
              description="Delete S3 files after project is published"
            />
          </div>
        </div>

        {/* Workflow */}
        <div>
          <h4 className="text-xs font-semibold text-warm-secondary uppercase tracking-wide mb-1.5">
            Project Lifecycle
          </h4>
          <div className="text-xs text-warm-muted space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-green-600 font-mono">1</span>
              <span>Record in FliHub</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-600 font-mono">2</span>
              <span><code className="bg-surface-hover px-1 rounded font-mono">dam s3-up</code> → editor downloads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-600 font-mono">3</span>
              <span>Editor uploads final → publish to YouTube</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-600 font-mono">4</span>
              <span><code className="bg-surface-hover px-1 rounded font-mono">dam archive</code> → T7 backup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-600 font-mono">5</span>
              <span><code className="bg-surface-hover px-1 rounded font-mono">dam s3-cleanup-remote</code> → free S3</span>
            </div>
          </div>
        </div>

        {/* Safety tip */}
        <div className="border-t border-warm pt-3">
          <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Before Big Operations
          </h4>
          <p className="text-[11px] text-warm-muted">
            Before splitting or renumbering chapters, run{' '}
            <code className="bg-surface-hover px-1 rounded font-mono">dam archive appydave &lt;project&gt;</code>{' '}
            to back up the current state to T7. All commands support{' '}
            <code className="bg-surface-hover px-1 rounded font-mono">--dry-run</code> to preview first.
          </p>
        </div>

      </div>
    </div>
  );
}

function CommandBlock({ command, description }: { command: string; description: string }) {
  return (
    <div>
      <code className="block bg-surface-hover px-2 py-1 rounded font-mono text-[11px] text-warm-secondary">
        {command}
      </code>
      <p className="text-warm-muted mt-0.5 text-[11px]">{description}</p>
    </div>
  );
}
