# Server Stability Issues

Track server stability problems, root causes, and fixes applied.

---

## Issue Categories

| Category | Description |
|----------|-------------|
| Child Process Management | Spawned subprocesses (Whisper, ffmpeg) lifecycle issues |
| Port Conflicts | EADDRINUSE errors, orphaned processes holding ports |
| Graceful Shutdown | Clean termination of server and child processes |
| File Watchers | Nodemon restarts, chokidar issues |
| Resource Leaks | Memory, file handles, connections |

---

## Issues Log

### 2025-12-16: Child Process Crash on Nodemon Restart

**Symptom:** Server crashes with `EADDRINUSE: address already in use :::5101` during active transcription.

**Root Cause:** Multiple compounding issues:

| Issue | Description |
|-------|-------------|
| No SIGTERM handler | Nodemon sends SIGTERM, code only handled SIGINT |
| Orphaned Whisper process | Active transcription not killed on shutdown |
| No port cleanup | Server crashes if port already in use |
| Nodemon watches too much | Telemetry file changes triggered restarts |

**Trigger:** Code edit to `telemetry.ts` while transcription was running caused nodemon to restart. Old server didn't clean up properly, new server couldn't bind to port.

**Fixes Applied:**

1. **Added `killActiveProcess()` export** - `transcriptions.ts`
   - Terminates active Whisper process on shutdown
   - Clears transcription queue

2. **Added SIGTERM handler** - `index.ts`
   - Unified `gracefulShutdown()` function handles both SIGINT and SIGTERM
   - Calls `killActiveProcess()` before closing server

3. **Port cleanup on startup** - `index.ts`
   - Runs `lsof` to find processes on port 5101
   - Kills them before attempting to bind

4. **Expanded nodemon ignore list** - `server/package.json`
   - Now ignores: `config.json`, `transcription-telemetry.json`, `*.log`

**Files Changed:**
- `server/src/routes/transcriptions.ts`
- `server/src/index.ts`
- `server/package.json`

**Status:** Fixed

---

### 2025-12-16: Whisper Invalid Arguments

**Symptom:** All transcriptions fail with `unrecognized arguments: srt json`

**Root Cause:** FR-98 incorrectly assumed Whisper accepts multiple `--output_format` values. It only accepts one: `txt`, `srt`, `json`, `vtt`, `tsv`, or `all`.

**Bad code:**
```
'--output_format', 'txt', 'srt', 'json'
```

**Fix:** Changed to `--output_format all` then delete unwanted `.vtt` and `.tsv` files after completion.

**Files Changed:**
- `server/src/routes/transcriptions.ts`

**Status:** Fixed

---

### 2025-12-16: Crash After "transcripts change detected" (INVESTIGATING)

**Symptom:** Server crashes immediately after logging "transcripts change detected". No error message visible.

**Pattern:**
```
transcripts change detected
[nodemon] app crashed
```

**Investigation So Far:**

| Checked | Finding |
|---------|---------|
| WatcherManager debounce/emit code | Looks correct, added try-catch |
| Socket event types | 'transcripts:changed' properly defined |
| Transcription completion flow | Normal - cleanup, telemetry async |
| videoDuration utility | Handles errors, won't throw |
| telemetry utility | Has try-catch, won't throw |
| nodemon ignore patterns | Telemetry file already ignored |

**Potential Causes:**

1. **Timing coincidence** - Crash may be from something else, watcher log is just timing
2. **Unhandled async error** - Something in async chain not properly caught
3. **Race condition** - Multiple events firing at same time

**Diagnostic Changes Applied:**

1. **Added try-catch around watcher emit** - `WatcherManager.ts`
   - Logs success after emit
   - Catches and logs any emit errors

2. **Added global error handlers** - `index.ts`
   - `uncaughtException` handler with full stack trace
   - `unhandledRejection` handler for promise errors

**Files Changed:**
- `server/src/WatcherManager.ts`
- `server/src/index.ts`

**Status:** Under Investigation - diagnostic logging added

**Next Steps:**
- Run transcription again to capture actual error
- Check if "event emitted successfully" logs before crash
- Examine full error output with new handlers

---

## Prevention Checklist

### Before Making Server Changes

- [ ] Check if any long-running processes are active (transcription, shadow generation)
- [ ] Test changes on a branch if touching critical paths
- [ ] Verify nodemon ignore patterns if adding new generated files

### Child Process Best Practices

- [ ] Always store process reference for cleanup
- [ ] Handle both SIGINT and SIGTERM
- [ ] Kill child processes before server closes
- [ ] Set reasonable timeouts for force-kill

### Port Management

- [ ] Use port cleanup on startup for dev environment
- [ ] Log port conflicts clearly
- [ ] Consider retry logic for transient failures

---

## Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Transcription queue not persisted | Lost on crash | Manual re-queue via UI |
| Single transcription at a time | Slow for many files | By design (CPU intensive) |
| No ffmpeg process tracking | Shadow gen could orphan | Future: add similar cleanup |

---

## Related Documentation

- `video-transcription-spec.md` - Original transcription feature spec
- `backlog.md` - Feature requirements
- `changelog.md` - Implementation history
