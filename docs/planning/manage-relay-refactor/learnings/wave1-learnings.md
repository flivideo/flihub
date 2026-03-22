# Wave 1 Learnings — manage-relay-refactor

## Application Learnings

1. **Config field triple-addition pattern**: New config fields need additions in THREE places: (a) `shared/types.ts` Config interface, (b) `configManager.ts` saveConfig allowlist, (c) `index.ts` updateConfig propagation. Missing (c) creates a silent bug where changes are saved to disk but not applied in memory until restart.

2. **rsync parser robustness**: Extracting filename after first space (`line.indexOf(' ')`) is robust across rsync versions. The old `line.slice(12)` was dependent on the exact width of itemize-changes flags (which varies between rsync versions and invocation methods like `bash -lc`).

3. **execFile for user-supplied paths is mandatory**: `execFile('rsync', [...args])` avoids shell interpretation. `promisify(execFile)` works cleanly for async/await. `mkdir -p` can be replaced with `fs.ensureDir()`.

## Loop Meta-Learnings

1. **Agent scope creep**: Wave 1 security-fixes agent rewrote `poem-wui.ts` despite no instruction to do so. Fix: include explicit "DO NOT MODIFY" list in AGENTS.md for files outside scope.

2. **Shared file parallel editing works with clear prompt boundaries**: Two agents touched relay.ts (guards + security). No conflicts because prompts specified exactly which sections each owned.

3. **Post-campaign audit caught a BLOCKER**: `updateConfig` propagation gap would have silently broken Wave 2 features. The mandatory audit pause is justified.
