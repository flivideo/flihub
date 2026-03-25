// ─── Setup Guide ───

export function SetupGuide() {
  return (
    <details className="border border-warm rounded-lg">
      <summary className="px-4 py-2.5 text-sm font-medium text-warm-secondary cursor-pointer hover:bg-surface-hover select-none">
        Setup Help — How to configure Relay for a new collaborator
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-4 text-sm text-warm-secondary">
        {/* SyncThing install */}
        <div>
          <h4 className="font-semibold text-warm-secondary mb-2">1. Install &amp; Start SyncThing</h4>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-warm-secondary">
            <li>Install on both machines: <code className="font-mono bg-surface-muted px-1 rounded">brew install syncthing</code></li>
            <li>Start the service: <code className="font-mono bg-surface-muted px-1 rounded">brew services start syncthing</code></li>
            <li>Open the SyncThing web UI: <code className="font-mono bg-surface-muted px-1 rounded">http://localhost:8384</code></li>
            <li>Both machines need SyncThing running — repeat on the editor&#39;s machine</li>
          </ol>
        </div>

        {/* Folder setup */}
        <div>
          <h4 className="font-semibold text-warm-secondary mb-2">2. Create &amp; Share the Relay Folder</h4>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-warm-secondary">
            <li>Create relay folder: <code className="font-mono bg-surface-muted px-1 rounded">mkdir -p ~/relay/flihub-appydave</code></li>
            <li>In SyncThing UI &rarr; <strong>Add Folder</strong> &rarr; set path to <code className="font-mono bg-surface-muted px-1 rounded">~/relay/flihub-appydave</code></li>
            <li>Add a <strong>Remote Device</strong> — copy the Device ID from the editor&#39;s SyncThing UI (<strong>Actions &rarr; Show ID</strong>)</li>
            <li>Share the folder with the editor&#39;s device</li>
            <li>On the editor&#39;s machine: accept the incoming folder share in their SyncThing UI</li>
          </ol>
        </div>

        {/* Creator config */}
        <div>
          <h4 className="font-semibold text-warm-secondary mb-2">3. Configure FliHub — Recorder (David)</h4>
          <div className="text-xs text-warm-muted mb-1">Add to <code className="font-mono bg-surface-muted px-1 rounded">server/config.json</code>:</div>
          <pre className="font-mono text-xs bg-surface-muted border border-warm rounded p-2 overflow-x-auto">
{`"relayDirectory": "/Users/davidcruwys/relay/flihub-appydave",
"relayEnabled": true,
"machineRole": "recorder"`}
          </pre>
        </div>

        {/* Editor config */}
        <div>
          <h4 className="font-semibold text-warm-secondary mb-2">4. Configure FliHub — Editor (Jan)</h4>
          <div className="text-xs text-warm-muted mb-1">Add to <code className="font-mono bg-surface-muted px-1 rounded">server/config.json</code> on the editor&#39;s machine:</div>
          <pre className="font-mono text-xs bg-surface-muted border border-warm rounded p-2 overflow-x-auto">
{`"relayDirectory": "/home/jan/relay/flihub-appydave",
"relayEnabled": true,
"machineRole": "editor"`}
          </pre>
        </div>

        {/* Verify */}
        <div>
          <h4 className="font-semibold text-warm-secondary mb-2">5. Verify</h4>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-warm-secondary">
            <li>Restart FliHub server on both machines</li>
            <li>Check this page shows <span className="text-green-600 font-medium">● Relay connected</span></li>
            <li>Check SyncThing UI at <code className="font-mono bg-surface-muted px-1 rounded">http://localhost:8384</code> shows the folder as &quot;Up to Date&quot;</li>
          </ol>
        </div>
      </div>
    </details>
  );
}
