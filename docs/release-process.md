# FliHub Release Process

How to create a new release for FliHub.

## Overview

FliHub uses semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR:** Breaking changes (v1.0.0 = stable after BMAD rebuild)
- **MINOR:** New features (v0.6.0 → v0.7.0)
- **PATCH:** Bug fixes only (v0.6.0 → v0.6.1)

## When to Release

**Create a MINOR release when:**
- Significant new feature(s) complete
- Logical milestone reached (e.g., "Windows support done")
- Deploying to Jan or collaborators

**Create a PATCH release when:**
- Bug fixes only, no new features
- Hot fix needed for deployed version

## Release Checklist

### 1. Ensure Code is Ready

```bash
# Check working tree is clean
git status

# Run any tests (if applicable)
npm test

# Build to verify no errors
npm run build
```

### 2. Update RELEASES.md

Add a new section at the top of `RELEASES.md`:

```markdown
## v0.X.0 - Theme Name (YYYY-MM-DD)

**Theme:** One-line description

### What's New

- **Feature Name** - Description
  - Detail 1
  - Detail 2

### Fixes

- Fix description (FR-XX)

### Learnings

- Key insight or pattern discovered
```

### 3. Update Version History Table

Add row to the summary table:

```markdown
| v0.X.0 | YYYY-MM-DD | Theme | Key Features |
```

### 4. Commit the Release Notes

```bash
git add RELEASES.md
git commit -m "docs: Release notes for v0.X.0"
```

### 5. Create the Git Tag

```bash
# Annotated tag with message
git tag -a v0.X.0 -m "v0.X.0 - Theme Name

Brief description of release:
- Feature 1
- Feature 2
- Feature 3"
```

### 6. Push (if using remote)

```bash
git push origin main
git push origin v0.X.0  # Push the tag
```

Or push all tags:
```bash
git push origin --tags
```

## Viewing Releases

```bash
# List all tags
git tag -l

# Show tag details
git show v0.6.0

# View commits between releases
git log v0.5.0..v0.6.0 --oneline

# Checkout a specific version
git checkout v0.5.0
```

## Emergency Rollback

If you need to roll back to a previous version:

```bash
# Check out the stable tag
git checkout v0.5.0

# Or create a branch from it
git checkout -b hotfix-from-v0.5.0 v0.5.0
```

## Release Notes Style Guide

### Theme Names

Use action-oriented, user-focused themes:
- "Edit Workflow" (not "Add S3 staging routes")
- "Windows/WSL Support" (not "Cross-platform fixes")
- "Shadow System" (not "Add shadow files")

### What's New vs Fixes

- **What's New:** User-facing features they can use
- **Fixes:** Bugs that were broken, now fixed

### Learnings Section

Document insights for:
- Future BMAD rebuild
- Patterns that emerged
- Decisions that proved important

## Future: Semantic Release Automation

For v1.0.0+, consider setting up [semantic-release](https://github.com/semantic-release/semantic-release):

1. Requires conventional commit format:
   - `feat:` → MINOR bump
   - `fix:` → PATCH bump
   - `BREAKING CHANGE:` → MAJOR bump

2. Auto-generates changelog from commits

3. Auto-creates GitHub releases

For now, manual releases are fine for the v0.x development phase.

## Files Modified in a Release

| File | What Changes |
|------|--------------|
| `RELEASES.md` | Add new version section |
| `package.json` | (Optional) Update version field |
| Git tag | Create annotated tag |
