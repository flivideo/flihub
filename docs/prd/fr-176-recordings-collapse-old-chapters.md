# FR-176: Recordings Collapses Older Chapters, So the Working Chapter Is in View

**Status**: IDEA, banked (David, 2026-10-25). Not authorised to build.
**Added**: 2026-10-25
**Seen on**: D12 (`v-appydave/d12-openrig-agent-teams`), Recordings tab, 17 files across 5 chapters.

---

## The problem

When David opens **Recordings** mid-session, the chapter he's working on is **below the fold**. On D12 he was
recording **chapter 05**. On arrival the screen showed 01, 02 and 03 fully expanded, and 04 started at the very bottom.
To reach 05 he has to scroll past 9 takes he's finished with.

Screenshots: `docs/prd/assets/fr-176/recordings-on-arrival.png` (what he sees on arrival),
`docs/prd/assets/fr-176/recordings-top.png`, `docs/prd/assets/fr-176/recordings-ch3-to-ch5.png`.

## What's wanted

**Default rule: keep the current chapter and the one before it open, and collapse everything older.**

| Chapter (working on 05) | Default |
|---|---|
| 05, the current one (highest chapter / where new takes land) | open |
| 04, the one before | open (he still compares takes there one by one) |
| 03, 02, 01 | **collapsed** to their header line (title, duration, file count, starts @) |

- **Automatic as work moves on.** When the first take of chapter 06 lands, 04 collapses on its own. By the time
  he's in 05, 03 is already closed.
- **His own choices win.** If David opens a collapsed chapter (or closes an open one) by hand, that choice sticks.
  New files arriving don't fold it back up or spring it open. The rule only governs chapters he hasn't touched.
- Collapsed headers stay fully useful: chapter number, name, duration, file count, start time, and the `…` menu.

## Open questions (David decides)

- **What "current chapter" means**: the highest chapter number, or the chapter of the most recent take? These usually
  match. They differ when he goes back to re-record an early chapter.
- **How long a manual open/close lasts**: just this visit, or saved per project.
- Whether the same rule applies on **Watch** and **Transcripts**, which list by chapter too.

## Done when (draft)

Open Recordings on a project with 5 chapters where 05 is current: 05 and 04 are expanded, 01 to 03 are one-line
headers, and the 05 rows are visible without scrolling on a normal laptop window. Opening 02 by hand, then letting a
new take land, leaves 02 open.
