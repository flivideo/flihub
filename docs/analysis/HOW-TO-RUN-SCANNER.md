# How to Run the Project Scanner

**Script:** `server/src/scripts/scanProjects.ts`
**Purpose:** Scan all 45 projects for discrepancies and generate reports

---

## Prerequisites

1. **Node.js and tsx installed**
   ```bash
   npm install -g tsx  # If not already installed
   ```

2. **Projects accessible on filesystem**
   - Default path: `~/dev/video-projects/v-appydave`
   - Or set custom path (see below)

3. **Output directory exists** (created automatically)
   - `docs/analysis/` folder

---

## Running the Scanner

### Option 1: Default Projects Path

```bash
# From project root
cd /Users/davidcruwys/dev/ad/flivideo/flihub

# Run scanner
tsx server/src/scripts/scanProjects.ts
```

### Option 2: Custom Projects Path

```bash
# Set environment variable
export PROJECTS_ROOT=/path/to/your/video-projects

# Run scanner
tsx server/src/scripts/scanProjects.ts
```

---

## What the Scanner Does

### Phase 1: Project Discovery
- Reads all directories in `PROJECTS_ROOT`
- Filters out hidden directories (starting with `.`)
- Sorts projects alphabetically

### Phase 2: File Scanning
For each project:
1. Read all `.mov` and `.mp4` files in `recordings/` folder
2. Parse filenames (chapter, sequence, label, tags)
3. Check for naming violations
4. Check for structural issues
5. Check for derivative mismatches
6. Check for state inconsistencies

### Phase 3: Report Generation
Generates 3 output files:
1. **JSON:** `docs/analysis/discrepancies.json` (machine-readable)
2. **CSV:** `docs/analysis/discrepancies.csv` (spreadsheet)
3. **Markdown:** `docs/analysis/project-discrepancies.md` (human-readable)

---

## Expected Output

### Console Output

```
============================================================
Project Discrepancy Scanner
============================================================

Projects root: /Users/davidcruwys/dev/video-projects/v-appydave

Scanning 45 projects...
  Scanning b01-project-alpha...
    Found 3 issues
  Scanning b02-project-beta...
  Scanning b03-project-gamma...
    Found 1 issue
  ...

============================================================
SUMMARY
============================================================
Projects scanned: 45
Projects with issues: 12
Total issues: 47

By Type:
  naming: 8
  structural: 32
  derivative: 5
  state: 2

By Severity:
  error: 3
  warning: 15
  info: 29

Exporting results...
Exported JSON: docs/analysis/discrepancies.json
Exported CSV: docs/analysis/discrepancies.csv
Exported Markdown: docs/analysis/project-discrepancies.md

============================================================
DONE
============================================================
```

### Generated Files

**1. `discrepancies.json`**
```json
{
  "summary": {
    "scanDate": "2026-01-06T12:00:00.000Z",
    "projectsScanned": 45,
    "projectsWithIssues": 12,
    "totalIssues": 47,
    "byType": {
      "naming": 8,
      "structural": 32,
      "derivative": 5,
      "state": 2
    },
    "bySeverity": {
      "error": 3,
      "warning": 15,
      "info": 29
    }
  },
  "results": [
    {
      "projectCode": "b01-project-alpha",
      "projectPath": "/path/to/b01-project-alpha",
      "fileCount": 15,
      "discrepancies": [
        {
          "projectCode": "b01-project-alpha",
          "projectPath": "/path/to/b01-project-alpha",
          "type": "structural",
          "severity": "info",
          "issue": "Chapter gaps detected",
          "details": "Missing chapters: 02, 04",
          "suggestion": "Gaps may be intentional..."
        }
      ]
    }
  ]
}
```

**2. `discrepancies.csv`**
```csv
"Project Code","Project Path","Type","Severity","Issue","File","Details","Suggestion"
"b01-project-alpha","/path/to/b01","structural","info","Chapter gaps detected","","Missing chapters: 02, 04","..."
"b02-project-beta","/path/to/b02","naming","error","Invalid label format","05-3-Setup-Demo.mov","Label contains uppercase","..."
```

**3. `project-discrepancies.md`**
```markdown
# Project Discrepancy Report

**Scan Date:** 2026-01-06 12:00:00
**Projects Scanned:** 45
**Projects with Issues:** 12
**Total Issues Found:** 47

## Summary by Type

| Type | Count | Projects Affected |
|------|-------|-------------------|
| Naming | 8 | 5 |
| Structural | 32 | 10 |
...

## Projects with Issues

### b01-project-alpha (3 issues)

**Path:** `/path/to/b01-project-alpha`
**Files:** 15

**Structural Issues:**

🔍 **Chapter gaps detected**
  - Details: Missing chapters: 02, 04
  - Suggestion: Gaps may be intentional...
```

---

## Customizing Scanner Behavior

### Adjusting PO Decisions

Edit `DECISIONS` object in `scanProjects.ts`:

```typescript
const DECISIONS = {
  chapterGaps: 'info',           // 'error' | 'warning' | 'info'
  sequenceGaps: 'info',          // 'error' | 'warning' | 'info'
  nonSequentialChapters: 'warning',
  sequenceMustStartAt1: false,   // true = check, false = skip
  sameLabelInChapter: false,
  safeFolderDeprecated: false,
  legacyFormatWarning: 'info',
  missingDerivatives: 'info',
  orphanedDerivatives: 'warning',
};
```

**After PO makes decisions** (Phase 2), update these values to match.

---

## Troubleshooting

### Error: Projects root not found

```
ERROR: Projects root not found: /Users/davidcruwys/dev/video-projects/v-appydave
```

**Solution:** Set correct path
```bash
export PROJECTS_ROOT=/actual/path/to/video-projects
tsx server/src/scripts/scanProjects.ts
```

### Error: Permission denied

```
Error reading projects root: EACCES: permission denied
```

**Solution:** Check folder permissions
```bash
ls -la ~/dev/video-projects/v-appydave
```

### Error: Module not found

```
Error: Cannot find module '@types/fs-extra'
```

**Solution:** Install dependencies
```bash
npm install
```

---

## Next Steps After Scanning

1. **Review Markdown report** (`project-discrepancies.md`)
   - Understand common patterns
   - Identify critical issues

2. **Analyze with spreadsheet** (`discrepancies.csv`)
   - Import into Excel/Google Sheets
   - Filter by severity/type
   - Create pivot tables

3. **Process JSON data** (`discrepancies.json`)
   - Use for programmatic analysis
   - Generate custom reports
   - Feed into Phase 4 analysis

4. **Proceed to Phase 4** (Pattern Analysis)
   - Use scanner results to identify common patterns
   - Create impact assessment
   - Prioritize fixes

---

## Estimated Runtime

- **Small projects** (< 20 files): < 1 second per project
- **Medium projects** (20-100 files): 1-3 seconds per project
- **Large projects** (> 100 files): 3-10 seconds per project

**Total for 45 projects:** ~1-3 minutes

---

## Re-Running the Scanner

Scanner can be run multiple times:
- After fixing issues (to verify fixes)
- After implementing new features (to detect new issues)
- After adding new projects (to scan new content)

**Output files are overwritten** each time.

---

**Last updated:** 2026-01-06
