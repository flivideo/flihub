# Generate Context for ChatGPT

Generate a complete context document for the ChatGPT Brainstorm Agent.

## Instructions

1. **Read the static template:**
   - `/Users/davidcruwys/dev/ad/flivideo/fli-brief/docs/flihub/chatgpt-brainstorm-agent.md`

2. **Read dynamic sources:**
   - `/Users/davidcruwys/dev/ad/flivideo/fli-brief/docs/flihub/changelog.md` - Extract Quick Summary section
   - `/Users/davidcruwys/dev/ad/flivideo/fli-brief/docs/flihub/backlog.md` - Extract Requirements table (pending items only)
   - `/Users/davidcruwys/dev/ad/flivideo/fli-brief/docs/flihub/brainstorming-notes.md` - Extract Active Brainstorms section

3. **Generate the complete document:**

Output the following combined document for the user to copy to ChatGPT:

```
# FliHub - ChatGPT Brainstorm Agent Context

**Generated:** [today's date]

---

[Include the FULL content of chatgpt-brainstorm-agent.md]

---

## CURRENT STATE (Live Data)

### Implemented Features

[From changelog.md Quick Summary - list all completed FRs]

### Pending Features

[From backlog.md - list items with "Pending" status]
Format: "- FR-XX: [description] (Added: [date])"

### Active Brainstorms

[From brainstorming-notes.md - summarize each Active Brainstorm section]
Format each as:
"**[Topic Name]** - [1-2 sentence summary of what's being explored]"

### Recent Changes (Last 7 Days)

[From changelog.md Per-Item History - list changes from the last 7 days]

---

## Ready for ChatGPT

Copy everything above this line and paste it into your ChatGPT conversation.
The brainstorm agent will have full context about FliHub.
```

## Notes

- Include ALL of the static template content (don't summarize it)
- For pending features, only include items that say "Pending" (not "Implemented")
- For recent changes, focus on the last 7 days of activity
- Output should be ready to copy-paste directly to ChatGPT
- This replaces the need to manually update the context document
