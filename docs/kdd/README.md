# KDD — Knowledge-Driven Development

**Purpose**: The live knowledge base for FliHub. Every learning and recurring pattern earned while
building or operating it is captured here **as it happens**, not reconstructed later.

**For Agents**: Maintained by **Lisa** (the KDD librarian skill — `appydave:lisa`). When you learn
something non-obvious during a task, or hit a pattern the second time, capture it:

- one-off insight / gotcha / fix → append to [`learnings.md`](learnings.md)
- something that recurs (earned by happening ≥2×) → promote to [`patterns.md`](patterns.md)
- a decision with rationale → `../architecture/naming-decisions.md`, a `../planning/*-decisions.md`
  PO session note, or the relevant `../prd/*.md` — not here

Reconcile-first: before adding, check if an entry already covers it and bump/extend rather than
duplicate. Same shape as Captain's Log's KDD (`~/dev/ad/apps/captains-log/docs/kdd/`).

## Files

| File                           | What                                                           |
| ------------------------------ | -------------------------------------------------------------- |
| [`learnings.md`](learnings.md) | Append-only log of earned insights (dated, task-tagged)        |
| [`patterns.md`](patterns.md)   | Recurring patterns promoted from learnings (the reusable ones) |

History: `docs/learnings.md` (one FR-123 entry, 2026-01-02) was migrated here on 2026-08-30.
