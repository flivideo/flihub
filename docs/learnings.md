# Learnings & Mistakes

This document captures significant mistakes and lessons learned during development to prevent repeating them.

---

## 2026-01-02: FR-123 - Edited Wrong File for 90 Minutes

**Incident:** Spent entire session debugging why annotation field wasn't loading, when the actual issue was editing the wrong file.

**The Mistake:**
- Client calls `/api/recordings` which is handled by `server/src/routes/index.ts:375`
- I edited `server/src/routes/query/recordings.ts` (handles `/api/projects/:code/recordings`)
- Added logging, debugging, type fixes - all in the wrong file
- Wasted ~90 minutes before discovering the mistake

**Why It Happened:**
- Assumed there was only one recordings endpoint
- Did a grep search, found `query/recordings.ts`, and started editing
- Never verified which endpoint the client actually calls
- Didn't check route mounting in server index

**The Fix:**
- 3 lines of code in the correct file (`server/src/routes/index.ts`)
- Import `getRecordingAnnotation`
- Call it for shadow and real recordings
- Add to response objects

**Lesson Learned:**
1. **ALWAYS verify which endpoint the client calls FIRST**
   - Check the client hook to see exact endpoint path
   - Trace route mounting in server to find handler
   - Don't assume - verify
2. **When logs don't appear, question your assumptions**
   - If debug logs don't show up, you're probably in the wrong place
   - Stop adding more logs and verify the code is even running
3. **Grep results can be misleading**
   - Multiple files can handle similar-sounding routes
   - `/api/recordings` ≠ `/api/projects/:code/recordings`
   - Always check route mounting structure

**Prevention:**
- Before editing ANY API endpoint, verify:
  1. What exact path does the client call?
  2. Where is that route mounted in the server?
  3. Which file handles that specific route?
