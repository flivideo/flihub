# FliHub Troubleshooting Guide

Common issues and their solutions.

## Quick Diagnostics

Run these commands to check your environment:

```bash
# Check versions
node --version        # Should be >= 18
npm --version
ffmpeg -version
whisper --version

# Check server is running
curl http://localhost:5101/api/system/health

# Check port usage
lsof -i :5101         # Mac/Linux
netstat -ano | findstr :5101  # Windows

# View config
cat server/config.json
```

---

## Server Issues

### Server Won't Start (Port in Use)

**Symptoms:**
- `EADDRINUSE: address already in use :::5101`
- Previous instance still holding port

**Solution:**
```bash
# Kill process on port
lsof -ti:5101 | xargs kill -9
sleep 0.5
npm run dev

# Windows
netstat -ano | findstr :5101
taskkill /PID <PID> /F
```

The server includes automatic port cleanup, but may fail after crashes.

### Server Crashes During Transcription

**Symptoms:**
- Server crashes when editing code while transcription running
- Orphaned Whisper processes

**Solution:**
1. Wait for transcription to complete before editing code
2. Kill orphaned processes:
   ```bash
   ps aux | grep whisper
   kill -9 <PID>
   ```

**Prevention:** Nodemon ignores `transcription-telemetry.json` to prevent restart loops.

### Server Slow/Unresponsive

**Causes:**
- Too many files in project (1000+)
- Large transcription model
- Memory leaks from crashes

**Solutions:**
- Archive completed projects to separate location
- Use smaller Whisper model: `WHISPER_MODEL = 'small'` in transcriptions.ts
- Restart server periodically

---

## Configuration Issues

### Invalid JSON in config.json

**Symptoms:**
- Server starts with defaults
- Config changes don't persist

**Solution:**
Validate JSON syntax. Common errors:
- Trailing commas
- Missing quotes
- Unescaped backslashes

```json
{
  "watchDirectory": "~/Movies/Ecamm Live/",
  "projectsRootDirectory": "~/dev/video-projects/v-appydave",
  "activeProject": "b72-project"
}
```

### Path Not Found Warnings

**Symptoms:**
- Projects list empty
- Recording files not detected
- "Path not found" in Config panel

**Solutions:**

1. **Verify paths exist:**
   ```bash
   ls -la ~/dev/video-projects/v-appydave
   ```

2. **Use correct path format:**
   - Mac/Linux: `/Users/name/...`
   - Windows: `C:\Users\name\...` or `C:/Users/name/...`
   - WSL: `/home/name/...` (never `\\wsl$\...`)

3. **Check tilde expansion:**
   ```bash
   node -e "console.log(require('os').homedir())"
   ```

### Old Config Format

**Symptoms:**
- `targetDirectory` or `projectDirectory` errors

**Solution:**
Server auto-migrates, but manually update if needed:
```json
{
  "projectsRootDirectory": "~/dev/video-projects/v-appydave",
  "activeProject": "b72-project"
}
```

---

## Transcription Issues

### All Transcriptions Fail

**Symptoms:**
- Error: `unrecognized arguments: srt json`
- Whisper exits with non-zero code

**Causes & Solutions:**

1. **Whisper not installed:**
   ```bash
   pip install openai-whisper
   whisper --version
   ```

2. **Wrong Python path:**
   Check `WHISPER_PYTHON` in `transcriptions.ts`:
   ```typescript
   WHISPER_PYTHON = '~/.pyenv/versions/3.11.12/bin/python'
   ```

3. **Permission issues:**
   ```bash
   chmod 755 ~/.pyenv/versions/3.11.12/bin/python
   chmod 644 /path/to/video.mov
   ```

### Transcript Not Found

**Symptoms:**
- Video exists but "no transcript" shown
- Transcript count mismatch

**Cause:** Filename mismatch

**Solution:** Transcript filename must match video exactly:
- Video: `10-5-intro-CTA.mov`
- Transcript: `10-5-intro-CTA.txt` (not `10-5-intro.txt`)

### Queue Lost After Crash

**Symptom:** Pending transcriptions disappear

**Cause:** Queue is in-memory only

**Solution:** Re-queue from Transcriptions UI after restart

---

## Shadow File Issues

### Shadows Not Generating

**Symptoms:**
- "Shadow not available locally" for all files
- Shadow count shows 0

**Causes & Solutions:**

1. **FFmpeg not installed:**
   ```bash
   ffmpeg -version
   # Install: brew install ffmpeg (Mac)
   ```

2. **Source files not found:**
   ```bash
   ls project/recordings/*.mov
   ```

3. **Directory doesn't exist:**
   ```bash
   mkdir -p project/recording-shadows
   ```

4. **Invalid resolution:**
   Valid values: 144, 240, 360, 480, 720
   ```json
   {
     "shadowResolution": 240
   }
   ```

---

## Socket.io / Real-Time Issues

### UI Not Updating

**Symptoms:**
- Changes not reflected until page refresh
- Stale data displayed

**Solutions:**

1. **Check connection:**
   - Look for green indicator in UI
   - Browser console: Network → WS → check Socket.io connection

2. **Verify server running:**
   ```bash
   curl http://localhost:5101/api/system/health
   ```

3. **Check CORS:**
   Server uses `cors: { origin: true }` - should work for localhost

4. **Restart server:**
   Sometimes watchers get stuck after config changes

### Too Many File Descriptors (WSL)

**Symptom:** `EMFILE: too many open files`

**Solution:**
```bash
ulimit -n 8192
```

Or add to `/etc/security/limits.conf`:
```
* soft nofile 8192
* hard nofile 8192
```

---

## Video Playback Issues

### "Video Not Available Locally"

**Cause:** Working with shadow files (expected behavior)

**Explanation:** Shadow files are `.txt` placeholders, not playable videos. This is correct for collaborators without source files.

### Video Duration Shows 0

**Cause:** FFmpeg not installed or can't read file

**Solution:**
```bash
ffmpeg -version
ffprobe /path/to/video.mov
```

### CORS Errors in Browser

**Symptom:** Video fails to load with CORS error

**Solution:** Server sets proper headers. Clear browser cache or try incognito mode.

---

## Build Issues

### TypeScript Compilation Errors

**Solutions:**

1. **Check Node version:**
   ```bash
   node --version  # >= 18 required
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Rebuild:**
   ```bash
   npm run build
   ```

### Module Not Found

**Cause:** Workspace dependencies not linked

**Solution:**
```bash
npm install  # From root directory
```

---

## Platform-Specific Issues

### Mac

Usually works out of box. Check:
- Python permissions: `chmod 755 ~/.pyenv/...`
- Ecamm Live folder exists: `~/Movies/Ecamm Live/`

### Windows (Native)

- Use forward slashes in paths: `C:/Users/...`
- Long paths (>260 chars) may fail - use shorter paths
- Run terminal as Administrator if permission issues

### WSL

Most common issues:

1. **Wrong path format:**
   - Use: `/home/user/...` or `/mnt/c/...`
   - Never: `\\wsl$\Ubuntu\...`

2. **Always run from WSL terminal:**
   - Not PowerShell or CMD
   - Not Windows Terminal with WSL tab

3. **See:** `docs/wsl-development-guide.md`

---

## Getting Help

When reporting issues, include:

1. **Environment:**
   ```bash
   node --version
   npm --version
   ffmpeg -version
   uname -a  # or systeminfo on Windows
   ```

2. **Configuration:**
   ```bash
   cat server/config.json
   ```
   (Redact sensitive paths)

3. **Error message:** Full text from console

4. **Steps to reproduce:** What you were doing

5. **Platform:** Mac/Windows/Linux/WSL

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE` | Port 5101 in use | Kill existing process |
| `ENOENT` | File/directory not found | Check path exists |
| `EACCES` | Permission denied | `chmod` or run as admin |
| `EMFILE` | Too many open files | Increase `ulimit` |
| `unrecognized arguments` | Wrong Whisper args | Update transcriptions.ts |
| `CORS error` | Cross-origin blocked | Check server CORS config |
| `Cannot find module` | Missing dependency | `npm install` |
