# WSL Development Guide

This guide is for developers running FliHub on Windows with WSL (Windows Subsystem for Linux). It explains the recommended "WSL-first" approach that builds Linux skills transferable to Mac.

**Related:** [Cross-Platform Setup Guide](./cross-platform-setup.md) - General Windows setup

---

## The Golden Rule

> **"Everything is Linux. Windows is just a mounted drive at `/mnt/c/`."**

When running FliHub from WSL:
- WSL files use native Linux paths: `/home/jan/...`
- Windows files use the mount point: `/mnt/c/Users/jan/...`

This mental model matches how Mac works (everything Unix), making future transitions seamless.

---

## Why WSL-First?

| Factor | Native Windows | WSL (Recommended) |
|--------|----------------|-------------------|
| Video projects path | `\\wsl$\Ubuntu\home\jan\...` | `/home/jan/...` |
| Ruby/Python dev | Problematic | Native Linux |
| Matches Mac workflow | No | Yes |
| Path complexity | UNC paths, escaping | Simple Unix paths |
| Long-term value | Windows-specific | Transferable skills |

---

## Setup

### 1. Install FliHub in WSL

Clone FliHub into your WSL home directory (not on C: drive):

```bash
# In WSL terminal
cd ~
mkdir -p flivideo
cd flivideo
git clone https://github.com/appydave/flihub.git
cd flihub
npm install
```

FliHub now lives at: `/home/jan/flivideo/flihub`

### 2. Video Projects in WSL

Your video projects should also be in WSL:

```bash
# In WSL terminal
mkdir -p ~/dev/video-projects/v-appydave
```

Projects path: `/home/jan/dev/video-projects/v-appydave`

### 3. Configure Paths

Edit `server/config.json` with **Linux paths**:

```json
{
  "watchDirectory": "/mnt/c/Users/jan/Videos/obs",
  "projectsRootDirectory": "/home/jan/dev/video-projects/v-appydave",
  "activeProject": "b89-current-project",
  "imageSourceDirectory": "/mnt/c/Users/jan/Downloads",
  "shadowResolution": 240
}
```

**Path breakdown:**

| Config Field | Location | Path Format |
|--------------|----------|-------------|
| `projectsRootDirectory` | WSL filesystem | `/home/jan/...` |
| `watchDirectory` | Windows (OBS output) | `/mnt/c/Users/jan/...` |
| `imageSourceDirectory` | Windows (Downloads) | `/mnt/c/Users/jan/...` |

### 4. Run FliHub

Always start FliHub from WSL terminal:

```bash
cd ~/flivideo/flihub
npm run dev
```

Access at: http://localhost:5101

---

## Path Reference

### WSL Filesystem (Native)

Use for: Code, video projects, dev work

```
/home/jan/                    # Your WSL home (~)
/home/jan/dev/                # Development folder
/home/jan/flivideo/flihub/    # FliHub installation
```

### Windows Filesystem (Mounted)

Use for: Downloads, OBS output, Windows apps

```
/mnt/c/                       # C: drive
/mnt/c/Users/jan/             # Windows user folder
/mnt/c/Users/jan/Downloads/   # Downloads folder
/mnt/c/Users/jan/Videos/obs/  # OBS recordings
```

### Converting Paths

| From Windows | To WSL |
|--------------|--------|
| `C:\Users\jan\Downloads` | `/mnt/c/Users/jan/Downloads` |
| `D:\Videos` | `/mnt/d/Videos` |

**Pattern:** Replace `X:\` with `/mnt/x/` (lowercase), change `\` to `/`

---

## Common Mistakes

### 1. Copying Paths from Windows Explorer

**Wrong:** Pasting `C:\Users\jan\Downloads` into FliHub config

**Right:** Convert to `/mnt/c/Users/jan/Downloads`

### 2. Using UNC Paths

**Wrong:** `\\wsl$\Ubuntu\home\jan\...` (this is for Windows apps accessing WSL)

**Right:** `/home/jan/...` (native WSL path)

### 3. Running from Wrong Terminal

**Wrong:** Running `npm run dev` from PowerShell or CMD

**Right:** Running from WSL terminal (Ubuntu)

### 4. Mixing Path Formats

**Wrong:**
```json
{
  "projectsRootDirectory": "\\\\wsl$\\Ubuntu\\home\\jan\\...",
  "watchDirectory": "/mnt/c/Users/jan/Videos"
}
```

**Right:** All paths in Linux format when running from WSL.

---

## Accessing FliHub Files from Windows

If you need to access WSL files from Windows Explorer:

1. Open Windows Explorer
2. Navigate to: `\\wsl$\Ubuntu\home\jan\flivideo\flihub`

This is the **opposite direction** - Windows accessing WSL. It's fine for browsing, but FliHub itself should run from WSL.

---

## Troubleshooting

### "Path not found" in Config Panel

1. Check you're running FliHub from WSL terminal (not PowerShell)
2. Verify path format matches the running environment
3. For WSL files: `/home/...`
4. For Windows files: `/mnt/c/...`

### Projects Not Showing

Ensure `projectsRootDirectory` uses native WSL path:
```
/home/jan/dev/video-projects/v-appydave
```

Not UNC path:
```
\\wsl$\Ubuntu\home\jan\dev\video-projects\v-appydave
```

### OBS Recordings Not Detected

OBS runs on Windows, so its output folder needs the mount path:
```
/mnt/c/Users/jan/Videos/obs
```

Configure OBS to save to `C:\Users\jan\Videos\obs` (Windows path) - FliHub will see it via the mount.

---

## For AI Agents (Claude Context)

When working with FliHub on a Windows+WSL system:

1. **Detect environment first**: Check if FliHub runs from WSL or native Windows
2. **Use appropriate path format**:
   - WSL: Linux paths (`/home/...`, `/mnt/c/...`)
   - Native Windows: Windows paths (`C:\...`, `\\wsl$\...`)
3. **Never mix formats** in the same config
4. **The project root is key**: Most paths derive from this - get it right first

**Quick check:** Look at `server/config.json` - if paths start with `/`, it's WSL mode.

---

## Summary

| Running From | WSL Files | Windows Files |
|--------------|-----------|---------------|
| WSL (recommended) | `/home/jan/...` | `/mnt/c/Users/jan/...` |
| Native Windows | `\\wsl$\Ubuntu\home\jan\...` | `C:\Users\jan\...` |

**Recommendation:** Always run from WSL, always use Linux paths. Think Linux.
