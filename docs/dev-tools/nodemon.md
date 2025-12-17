# Nodemon Configuration

Development file watcher that auto-restarts the server when source files change.

---

## What is Nodemon?

[Nodemon](https://nodemon.io/) monitors your source files and automatically restarts the Node.js server when changes are detected. This eliminates the need to manually stop/start during development.

## Configuration

FliHub uses a `nodemon.json` config file in `server/`:

```json
{
  "watch": ["src"],
  "ext": "ts",
  "ignore": ["*.json", "*.log", "*.data", "node_modules"],
  "exec": "tsx src/index.ts"
}
```

| Setting | Value | Purpose |
|---------|-------|---------|
| `watch` | `["src"]` | Only watch the source code directory |
| `ext` | `ts` | Only watch TypeScript files |
| `ignore` | `["*.json", ...]` | Ignore generated/config files |
| `exec` | `tsx src/index.ts` | Command to run the server |

## Why This Configuration?

### Problem: Runtime-Generated Files

The server writes files during operation:
- `config.json` - User configuration
- `transcription-telemetry.json` - Transcription metrics

**Default nodemon behavior** watches `.json` files (assuming they're config). When the server writes these files, nodemon restarts, causing crashes mid-operation.

### Solution: Explicit Watch Scope

By setting `"watch": ["src"]`, nodemon only monitors the source directory. Generated files in `server/` root don't trigger restarts.

## Best Practices

### DO

- Keep generated files **outside** `src/`
- Use explicit `watch` paths rather than relying on ignore patterns
- Put nodemon config in `nodemon.json` (more reliable than CLI flags)

### DON'T

- Write `.json` files inside `src/` at runtime
- Rely solely on `--ignore` CLI flags (can be flaky)
- Watch `.json` extension when your app writes JSON files

## File Locations

| File | Location | Watched? |
|------|----------|----------|
| Source code | `server/src/**/*.ts` | Yes |
| Config | `server/config.json` | No |
| Telemetry | `server/transcription-telemetry.json` | No |
| Package | `server/package.json` | No |

## Troubleshooting

### Server keeps restarting unexpectedly

1. Check what triggered the restart - nodemon logs the file
2. Ensure generated files aren't in `src/`
3. Verify `nodemon.json` is being read (check startup logs)

### Changes not triggering restart

1. Verify file is in `src/` directory
2. Verify file has `.ts` extension
3. Check nodemon is running (not the production `start` script)

## Related

- [Server Stability Issues](../operations/server-stability-issues.md) - Crash investigation and fixes
- [Patterns](../patterns.md) - Code patterns and conventions
