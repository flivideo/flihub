# Quick Status

Provide a quick status summary of the FliHub project without exploring the codebase.

## Instructions

Read the following files and provide a concise summary:

1. **Read** `/Users/davidcruwys/dev/ad/flivideo/fli-brief/docs/flihub/backlog.md` (just the requirements table at the top)
2. **Read** `/Users/davidcruwys/dev/ad/flivideo/fli-brief/docs/flihub/changelog.md` (just the Quick Summary section)
3. **Read** `/Users/davidcruwys/dev/ad/flivideo/fli-brief/docs/flihub/brainstorming-notes.md` (just the Promoted to Requirements section)

## Output Format

```
## FliHub Status

### Recently Completed
- [List last 3-5 completed FRs from changelog]

### In Progress / Pending with Developer
- [Any FRs marked as in-progress or recently handed over]

### Backlog Highlights
- [2-3 pending FRs that are ready for development]

### Active Brainstorms
- [List any ideas being actively explored]

### Next Actions
- [What should happen next based on the current state]
```

## Notes

- Keep it brief - this is a status check, not a deep dive
- Don't explore the codebase - just read the doc files
- If you need more detail, suggest running `/po` or `/dev` for a full session
