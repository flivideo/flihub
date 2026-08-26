---
title: Narration Guide — using FliHub today
created: 2026-08-26
source: B475 ("I'm going to use it today and I'm going to talk about it as I use it")
purpose: Make the live-usage half of the audit produce usable signal, not scattered commentary
---

# Narration Guide — what to notice while you use FliHub today

B475 has two input streams: the deep audit (running now, ~27 agents) and **you, using the app and
narrating**. This is the second one's prompt sheet.

You don't need to work through it in order. It's here so that when something annoys you, there's a
place to hang the annoyance — and so the audit knows which questions only you can answer.

**The one instruction that matters:** when something irritates you, say *why you expected otherwise*.
"This is clunky" is a bug report. "I expected the take I just recorded to already be transcribed,
because I want the agent to tell me which one was good" is a North Star.

---

## Part 1 — Confirm or kill the core sentence

From your own 19 Aug recording, correcting an agent that got it wrong:

> "Ecamm is definitely capture. I run it, I drive it personally from a foot pedal. So I start and I
> stop. The moment I stop it goes into a folder and **that's the moment that FliHub kicks in.
> It captures it and puts it into a queue of videos... I might not like that video so I'll record
> another one and another one. And this is what FliHub does really well — it captures all that, then
> when I'm ready I pick one of them and I say promote it, it becomes the project video.**"
>
> "normally this is a **watcher application**. It watches the Ecamm folder and it routes, and then
> other tabs in that application do different things."

Candidate North Star sentence, derived from that:

> **FliHub watches the folder, routes each take into the video's queue, holds every attempt,
> and you promote one. Everything else is a tab.**

**While you use it, answer:** is that true, and is it enough? Specifically —
- Does the watch → queue → promote loop actually feel like the spine of the app, or does it feel like
  one tab among nine?
- Which of the other eight tabs would you genuinely miss tomorrow if it vanished?
- Which do you not remember building?

That last question is the whole "dead ends" strand of B475. Say the names out loud as you pass them.

---

## Part 2 — Things I found that you can see for yourself

These are verified against the running app. Each is a two-minute check. Your reaction to them is
worth more than my write-up of them.

### 2.1 The Shelved and Arch filter chips match nothing, ever

Projects tab → click **Shelved**, then **Arch**. Both return zero.

Not a bug. `server/config.json` has 14 projects marked `shelved` and 1 `archived` — **every one of
them points at a folder that no longer exists**, because shelving a project means *moving it* to
`v-appydave/archived/`. A moved project stops being scanned, so its stage can never be read back.

47% of your stage map (17 of 36 entries) is inert for this reason.

**Question for you:** when you shelve something, what do you actually want to happen? Should it stay
visible-but-greyed, or genuinely leave? Right now the app was built for the first and you do the
second. Either is fine — but the app has to pick one.

### 2.2 The header count is lying by three

Projects tab header says **"62 of 62"**. Both APIs and the disk say **65**.

Three projects are dropped client-side, and the "X of Y" reports the filtered number as *both*
numbers — so the display whose job is to tell you what you're not seeing, isn't.

⚠️ `ProjectListToolbar.tsx` and `projectFilters.ts` are uncommitted in your tree right now, so this
might be your in-progress work rather than shipped behaviour. **If you know what you changed there,
say so** — it saves me un-picking it.

### 2.3 The take-quality colours

You described the current heuristic on 19 Aug:

> "when I record four or five takes, some of them are grey, some of them are green and one of them is
> yellow... this is deterministic, meaning it reads things like — I'm going to give a probability score
> that something is good if it's the last one, the latest. I'm going to get rid of stuff that's just
> short. I'm going to look at the length of them."

And what you want instead:

> "if we got the transcript on each recording... you ever notice me say 'fuck it'? That's signal that
> something is not quite right, and if you've got the transcript the agent can see that signal and go
> 'well that's probably a bad take' and tag it straight away."

**Record several takes today and deliberately fluff one.** Then narrate: did the colours help? How
often is the last-and-longest take actually the one you promote? That hit rate is the number that
justifies (or kills) the whole transcribe-at-queue-time redesign.

### 2.4 Two different page widths

Compare **Incoming** and **Projects** side by side.

Projects is full-bleed, dense, and good. Every other tab is clamped to 896px and centred, so on your
1600px screen roughly 60% of the canvas is empty.

It's one ternary in `App.tsx:725` keyed on the literal string `'projects'`.

**Question:** is the dense table the direction for everything, or is the narrow column right for the
task-focused tabs? Eight of your thirteen Mochaccino mockups were project-list variants, so the table
got all the design attention. Nothing else did.

### 2.5 The Manage tab isn't called Manage

The tab labelled **Manage** is `'export'` in the code — renamed in the UI, never in the code. It then
hosts a *second* router (`manageTool`: sync / relay / storage) that lives only in React state, so the
URL hash doesn't capture it and browser-back won't undo a tool switch.

**Try it:** open Manage → Relay, hit browser back. Note what happens, and whether you care.

---

## Part 3 — The recurring wants, to confirm or retire

Each of these you asked for more than once across the corpus. Say whether it's still live.

| # | Want | Your words | Still want it? |
|---|---|---|---|
| 1 | **Transcribe at queue time, not promote time** | *"transcription should happen the moment the video hits the queue, because there's a lot of stuff the agents could do in FliHub to decide which is the better video"* | |
| 2 | **Agent-drivable, not UI-first** | *"I never liked using a user interface. I would prefer that the control... could have been done all from Claude Code... even a paired partnership arrangement"* | |
| 3 | **One API, n unprivileged clients** | *"UI, CLI, MCP interface are equally unprivileged adapters holding no business logic"* | |
| 4 | **Assemble many short takes into one video** | *"record 20 seconds of snippets... then use something like FliHub to combine them all together"* | |
| 5 | **Trim in place** | *"if I loved that video but it's crap at the beginning... we could cut that one segment at the beginning and have a clean thing ready directly in FliHub"* | |
| 6 | **Per-take overlay suggestions** | *"a little panel over on the right of that one video that says — do you want a beat? Do you want something for hyperframes overlays?"* | |
| 7 | **Emit events other apps subscribe to** | *"Teletubby should be able to be told as an event that hey, new video hit FliHub in queue, it's been transcribed, here's the transcript"* | |
| 8 | **Keyboard control** | *"you probably need a little bit of keyboard control around going to different stuff"* | |
| 9 | **No restart to see a config change** | *"When I change a trigger word... you currently have to restart the app to see it. That kills the loop"* | |
| 10 | **Start/stop the app without burning tokens** | *"I should just be able to say 'start Teletubby'... is close a hidden-but-still-running, or a complete shutdown?"* | |

On **#8**: today's real keyboard surface is only `Escape`, `Enter`, `Shift`, arrows and space — and
almost all of it is inside modals. There is no navigation, selection, or promote shortcut anywhere.
If you remember building more than that, the audit needs to know, because the commits may disagree
with the memory.

---

## Part 4 — The scope question the rebuild turns on

You've said both of these, five days apart:

> "in FliHub we don't do hyperframes or editing, we just do joining and then we export through to Gling."

> "But there's a lot of stuff you could edit directly in FliHub... we could cut that one segment at the
> beginning and have a clean thing ready directly in FliHub."

And the surrounding suite has moved: **Van Dam / DAMMIT** takes asset management, **Hyperframes** takes
editing/overlays, **Teletubby** takes the script, **FliLaunch** took chapters/titles/thumbnails/publishing.

So the question the whole rebuild hangs on:

> **Is FliHub the take-management spine — watch, queue, transcribe, score, promote, assemble, emit —
> and nothing else? Or does it keep the tabs (assets, thumbs, inbox, relay, storage) because they're
> already built and nowhere else wants them?**

Don't answer it from the armchair. Answer it at the end of the day, from which tabs you actually
touched.

---

## Part 5 — Capture format

However you narrate is fine — Plaud, a note, straight into a Claude session. But if you can hit these
four beats each time something annoys you, it converts straight into a requirement:

1. **What I was trying to do**
2. **What I expected**
3. **What happened**
4. **What I did instead** ← the workaround is the most valuable of the four, because it's the feature
   you've already designed without noticing

The audit reports land in `docs/rebuild-2026/audit/`. The North Star gets written from both halves —
this one and yours.

---

## Part 6 — Questions the audit can't answer without you

These came out of the product-surface agent, which read all 12 tab surfaces, 13 modals and 8 modal-shaped
things. Each one is a genuine fork in the rebuild that only usage can settle.

**The big one first:**

> **11. Is Incoming a *place you go*, or a *state the app should drop you into* when a file lands?**

Everything about the spine (§Part 1) depends on this answer. If it's a state, the whole watch → queue →
promote loop should be the app's default surface, not tab #1 of nine.

**The rest, roughly in order of how much they'd change the build:**

1. **Keyboard** — while working, catch yourself reaching for a key that does nothing. Which key, on which
   screen? *That list is the rebuild's keyboard spec.* Confirmed by exhaustive grep: there is no global
   shortcut, no tab-navigation key, no j/k list movement, no command palette anywhere in the app.
2. **Project switcher** — the dropdown shows pinned projects only. How often do you hit "All projects…"?
   Should the switcher just *be* the Projects table?
3. **The four hover-only panels** (Recordings: Chapters / Help / DAM; Watch: Chapters→Segments) — do you
   find them on purpose, or discover them by accident when the mouse strays? Do you ever want them *pinned*?
4. **Header pills (Sync / Relay / T7)** — do you read them, or click straight through? Would you rather they
   **acted** than navigated?
5. **Assets and Thumbs** — untouched since the March theme pass. Do you still use them, or has the workflow
   moved to Van Dam? Note whether you open them at all today.
6. **Mockups + API Explorer** — ever opened, or leftovers? If you do use API Explorer, check whether the
   endpoint you wanted was even listed — it's a February snapshot and **106 of ~141 routes are missing**.
7. **Manage tool switching** — you can't bookmark or link a tool. Does that cost you? Also watch for clicking
   an already-active sidebar tool dumping you back to the Regen list (`ManagePanel.tsx:562`).
8. **Regen progress** — start a Regen All, then navigate away. Can you tell what's happening? Do you want a
   persistent job panel?
9. **`review` stage** — defined in the type but has no filter pill. Real stage, or should it die?
10. **Transcripts tab** — does the progress bar ever just... not appear? It silently returns `null` on a path
    mismatch, which looks identical to "nothing to show". Two failure modes, one appearance.
11. **Shift+hover on Assets** — do you use it, or did you forget it exists?
12. **`ProjectStatsPopup`** — 955 lines, dead since 2026-03-30. Was there anything in the old popup that the
    new `ProjectDrawer` doesn't show? Worth one look before it's deleted for good.

---

## Part 7 — One more thing to try deliberately

Type a recording name containing a version number — say **`opus 4.5 awesome`** — and watch the big blue
filename preview.

It will show you `01-1-opus-45-awesome.mov`. The file that actually gets written is
`01-1-opus-4.5-awesome.mov`. The preview and the writer use two different sanitisers
(`client/src/utils/naming.ts:4` vs `shared/naming.ts:327`) that disagree on periods, hyphen runs, trimming
and length.

You've told me before that rename tools "feel untrustworthy". This may be why — 8 of your 65 project codes
contain periods, all of them names like `opus-4.5`, `ito.ai`, `opus-4.6`. Every one of those showed you the
wrong answer before you committed.

Confirm it with your own eyes. If it lands the way I think it will, that's the single clearest example in
the whole audit of an architectural flaw producing a *feeling* rather than an error.
