# FliHub Setup for Jan - WSL2 Environment

## What Was Fixed

We resolved all 25 TypeScript build errors that were preventing the server from compiling. The fixes are now committed to the `main` branch (commit `f3506fd`).

### Changes Made:

1. **TypeScript Configuration** - Removed `rootDir` restriction in `server/tsconfig.json` to allow imports from the sibling `shared/` directory
2. **Type Safety** - Fixed null handling and type mismatches in `server/src/routes/manage.ts`
3. **Type Declarations** - Added missing TypeScript definitions for the `string-comparisons` package
4. **Import Cleanup** - Consolidated and corrected import statements

**Result**: Server now builds successfully with zero TypeScript errors.

---

## Getting FliHub Running on Your WSL2 System

### Step 1: Pull Latest Changes

```bash
cd /home/jan/dev/flivideo/flihub
git pull origin main
```

This will pull commit `f3506fd` with all the TypeScript fixes.

### Step 2: Install Dependencies

```bash
npm install
```

This installs all packages for the monorepo (server, client, and shared workspaces).

### Step 3: Verify the Build

```bash
npm run build
```

**Expected output:**

- Server builds cleanly (no errors)
- Client may show some warnings about unused variables (non-blocking)

If you see "Server build completed successfully", you're good to go!

### Step 4: Configure the Application

Create or verify `server/config.json` exists with your paths:

```json
{
  "watchDirectory": "/path/to/your/ecamm/recordings",
  "projectDirectory": "/path/to/your/video/project",
  "availableTags": ["CTA", "SKOOL", "DEMO"],
  "commonNames": [
    { "name": "intro", "autoSequence": true },
    { "name": "outro", "autoSequence": true }
  ],
  "imageSourceDirectory": "/path/to/images"
}
```

**Important**: Use Linux paths (WSL2 format), not Windows paths.

Example WSL2 paths:

- Windows: `C:\Users\Jan\Videos` → WSL2: `/mnt/c/Users/Jan/Videos`
- Or use native WSL paths: `/home/jan/videos`

### Step 5: Run the Application

```bash
npm run dev
```

This starts:

- **Server** (Express + Socket.io) on `http://localhost:5101`
- **Client** (React + Vite) on `http://localhost:5173` (or another port if 5173 is taken)

**Access the app**: Open your browser to `http://localhost:5173`

---

## Verification Checklist

✅ **Build succeeds**: `npm run build` completes without server errors
✅ **Server starts**: You see "Server listening on port 5101"
✅ **Client starts**: Vite dev server shows the local URL
✅ **Browser loads**: React app appears at localhost:5173
✅ **File watching works**: Server detects new files in `watchDirectory`

---

## Troubleshooting Common WSL2 Issues

### Issue: "Cannot find module" errors

**Solution**: Run `npm install` again to ensure all dependencies are installed.

### Issue: Permission denied on file watching

**Solution**: Ensure your `watchDirectory` and `projectDirectory` have proper permissions:

```bash
chmod -R 755 /path/to/your/directories
```

### Issue: Port already in use

**Solution**:

- Check what's using the port: `lsof -i :5101` or `lsof -i :5173`
- Kill the process: `kill -9 <PID>`
- Or change ports in `server/src/index.ts` (5101) and `vite.config.ts` (5173)

### Issue: File watcher not detecting changes

**Solution**: WSL2 has limitations with Windows filesystem watching. Keep your project files in native WSL filesystem (`/home/jan/...`) rather than `/mnt/c/...` for best performance.

### Issue: "ENOSPC: System limit for number of file watchers reached"

**Solution**: Increase the inotify watch limit:

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Architecture Overview (For Context)

FliHub is a TypeScript monorepo with 3 workspaces:

```
flihub/
├── server/          # Express + Socket.io backend (TypeScript)
│   ├── src/
│   │   ├── index.ts       # Main server entry
│   │   ├── routes/        # API endpoints
│   │   └── utils/         # Helper functions
│   └── config.json        # Your local config (not in git)
├── client/          # React 19 + Vite + TailwindCSS v4
│   └── src/
│       ├── App.tsx        # Main React app
│       ├── components/    # UI components
│       └── hooks/         # React hooks (Socket.io, API)
└── shared/          # Shared TypeScript types/utils
    ├── types.ts     # Interface definitions
    ├── naming.ts    # Filename parsing/validation
    └── paths.ts     # Path utilities
```

**Key Concepts:**

- **Recordings**: Named as `{chapter}-{sequence}-{name}-{tags}.mov`
  - Example: `10-5-intro-CTA.mov`
- **Real-time updates**: Socket.io events notify client of file changes
- **File watching**: Chokidar watches directories and emits events

---

## Development Commands

| Command                   | Description                                 |
| ------------------------- | ------------------------------------------- |
| `npm run dev`             | Start both server and client in dev mode    |
| `npm run dev -w server`   | Start only the server                       |
| `npm run dev -w client`   | Start only the client                       |
| `npm run build`           | Build both server and client for production |
| `npm run build -w server` | Build only the server                       |
| `npm test`                | Run tests (if configured)                   |

---

## What's Next?

After you get it running, you can:

1. **Test the UI**: Navigate through the tabs (Recordings, Assets, Manage)
2. **Test file watching**: Drop a `.mov` file in your `watchDirectory` and see if it appears
3. **Test renaming**: Use the UI to rename recordings
4. **Check Socket.io**: Open browser dev tools → Network → WS to see WebSocket events

---

## Getting Help

If you hit issues:

1. **Check logs**: Server logs appear in the terminal where you ran `npm run dev`
2. **Check browser console**: Client errors appear in browser dev tools (F12)
3. **Verify config**: Ensure `server/config.json` paths exist and are accessible
4. **Check Node version**: Requires Node.js 18+ (`node --version`)

---

## Summary

The TypeScript build errors are **fixed and committed**. You should be able to:

1. Pull the latest code
2. Run `npm install`
3. Run `npm run build` (succeeds)
4. Run `npm run dev` (starts the app)
5. Open `http://localhost:5173` in your browser

Everything is ready to go! 🚀

---

**Last Updated**: 2026-01-13
**Commit**: f3506fd (fix: resolve 25 TypeScript build errors in server compilation)
