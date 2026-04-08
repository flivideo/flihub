# Disk Space Analysis Brief — Mac Mini M4

**Purpose**: Self-contained brief for any Claude session. No prior context required.
**Goal**: Find where 436GB of disk space is going on David's Mac Mini M4, build a reusable provenance-chain disk scan tool, and feed findings back into FliHub.

---

## Situation

- **Machine**: Mac Mini M4 (David Cruwys, `davidcruwys` user, `mac-mini-m4.local`)
- **Disk**: 494GB internal NVMe — **96% used, ~20GB free**
- **APFS Data volume**: 436.7 GB consumed
- **Video projects** (`~/dev/video-projects/v-appydave`): ~133GB — known and accounted for
- **Gap**: ~300GB unaccounted for. The video files don't explain the shortage.

The goal is to find what's filling the remaining ~300GB.

---

## Phase 1 — Top-Level Scan

Run `du` on the key directories below. Sort descending. Look for anything unexpectedly large.

```bash
# Top-level home breakdown
du -sh ~/* ~/.[^.]* 2>/dev/null | sort -rh | head -30

# Known large suspects — check each:
du -sh ~/Library/                    # App caches, mail, photos
du -sh ~/Movies/                     # FCP, iMovie, screen recordings
du -sh ~/Downloads/                  # Accumulated junk
du -sh ~/Desktop/
du -sh ~/Documents/
du -sh ~/dev/                        # All dev projects
du -sh /Applications/                # Apps (Xcode = ~15GB+)

# System-level
du -sh /private/var/folders/ 2>/dev/null   # System caches
du -sh /private/var/vm/ 2>/dev/null        # VM swap

# Time Machine local snapshots (can consume significant space invisibly)
tmutil listlocalsnapshots /
tmutil listlocalsnapshotdates /

# APFS container summary (authoritative)
diskutil apfs list
```

---

## Phase 2 — Deep Drill on Large Directories

Once Phase 1 identifies the top offenders, drill into each:

```bash
# Example: if ~/Library is large
du -sh ~/Library/*/  2>/dev/null | sort -rh | head -20

# Xcode derived data / simulators (commonly 20-50GB)
du -sh ~/Library/Developer/Xcode/DerivedData/ 2>/dev/null
du -sh ~/Library/Developer/CoreSimulator/Devices/ 2>/dev/null

# Docker (can be massive)
du -sh ~/Library/Containers/com.docker.docker/ 2>/dev/null
du -sh ~/Library/Group\ Containers/group.com.docker/ 2>/dev/null

# npm / yarn / pnpm caches
du -sh ~/.npm/ ~/.yarn/ ~/.pnpm-store/ 2>/dev/null

# Homebrew
du -sh /opt/homebrew/ 2>/dev/null
brew cleanup --dry-run 2>/dev/null | grep "freed" | tail -5

# Ruby gems
du -sh ~/.gem/ /opt/homebrew/lib/ruby/ 2>/dev/null

# Python
du -sh ~/.pyenv/ ~/Library/Python/ 2>/dev/null

# Mail
du -sh ~/Library/Mail/ 2>/dev/null

# Photos library
du -sh ~/Pictures/ 2>/dev/null
```

---

## Phase 3 — Output Format (Provenance Chain)

The scan should produce structured JSON for ingestion into FliHub or other tools:

```json
{
  "scannedAt": "2026-04-08T00:00:00Z",
  "machine": "mac-mini-m4",
  "diskTotal": 494384795648,
  "diskFree": 19945693184,
  "diskUsed": 474439102464,
  "topLevel": [
    { "path": "~/Library", "bytes": 85000000000, "label": "App caches & data" },
    { "path": "~/dev", "bytes": 180000000000, "label": "Dev projects" }
  ],
  "categories": {
    "videoProjects": 142000000000,
    "devEnvironments": 45000000000,
    "appCaches": 30000000000,
    "dockerImages": 0,
    "xcodeArtifacts": 0,
    "other": 0
  },
  "findings": [
    "Xcode DerivedData: 22GB — safe to delete",
    "Docker volumes: not installed"
  ],
  "recommendations": []
}
```

---

## Phase 4 — FliHub Integration (future, not this session)

Once the scan utility exists:

1. **Column totals row** in the Projects Disk view — sum each column (REC, SHADOWS, RELAY, etc.) across all visible rows so David can see "76 projects = 133GB recordings total"
2. **System disk widget** on the Incoming page or header — shows `20GB free` with a warning threshold
3. **Offload suggestions** — projects above a size threshold that haven't been touched in 90+ days, flagged automatically

---

## Provenance Chain Design

The scan utility should follow the provenance pattern:

```
Raw source (du / diskutil / df output)
    ↓ parsed into
Structured scan result (JSON, schema above)
    ↓ stored at
~/.config/appydave/disk-scans/{machine}/{timestamp}.json
    ↓ consumed by
FliHub server (read on demand) → client (display)
    ↓ also readable by
Any other tool / Claude session via the JSON file
```

**Key principle**: The raw `du` output is authoritative. The JSON is a curated snapshot with a timestamp. Any tool that reads the JSON must check `scannedAt` and warn if stale (>24h).

---

## What to Deliver

1. Run Phase 1 + Phase 2 scans
2. Produce the Phase 3 JSON (fill in actual values)
3. Identify the top 3-5 reclaimable categories with estimated bytes and safe-to-delete status
4. Write a one-paragraph summary: where is the space, what's safe to clean, what needs David's decision

Do NOT implement FliHub changes — that is Phase 4 and happens in a separate session in `/Users/davidcruwys/dev/ad/flivideo/flihub/`.
