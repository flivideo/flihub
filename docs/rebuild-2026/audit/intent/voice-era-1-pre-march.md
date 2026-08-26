# FliHub Voice-Intent Audit — Era 1: Genesis to end of February 2026

**Scope**: David's wearable-transcript corpus, `/Users/davidcruwys/dev/raw-intake/omi/` and
`/Users/davidcruwys/dev/raw-intake/plaud/`, filtered to Dec 2025 – Feb 2026.
**Purpose**: recover what FliHub was FOR, what David repeatedly asked for, what he complained
about, and how the intent moved — as input to a deliberate rewrite.
**Method**: full-corpus grep for `flihub|fly hub|fli hub|flee hub`, then every hit read; plus
concept greps (`ecamm`, `s3 staging`, `first edit`, `srt`, `transcript`, `chapter`, `video project`,
`take`, `relay`, `thumbnail`) for sessions where he reasons about FliHub's domain without naming it.
**Files matched by name**: 36. **Files that carry real FliHub substance**: 9.
**Files read in full or in substantial context**: 24.

---

## 0. Two findings that govern how you read everything below

### 0.1 The genesis of FliHub is NOT in the voice corpus. At all.

FliHub's first commit is **2025-12-13** ("Initial commit - FliHub video recording workflow app").
The December burst runs 13 Dec → 7 Jan and lands roughly 57 commits — the Inbox, chapter
recordings, the Watch page, transcript sync, chapter SRT, the 8-stage project list, shadow
recordings, First Edit Prep, S3 Staging, the API Explorer, the Developer Tools drawer, chapter
renaming. That is the app's entire skeleton.

**The OMI corpus's earliest file is `2026-01-09-1153-user-unboxes-omi-device-and-shares-background.md`.**
The Plaud corpus's earliest file is `2026-07-05-1708-how-to-use-plaud.md`.

So the whole founding period — every design decision behind the naming convention, the chapter
model, the stage system, the folder layout — happened **before David was wearing a recorder**.
There is no voice evidence for it, and there never will be. Era-1 voice evidence begins about
four weeks *after* the app already worked, and it is thin.

**What this means for the rewrite**: do not treat the era-1 voice record as the design brief. It
is not. It is a set of *post-hoc usage observations* on an app that was already built. The founding
intent has to be recovered from the December/January commit stream and the `docs/prd/` FR specs,
not from here. What voice adds in era 1 is something the commits cannot give you: **why he built it
at all**, stated out loud to an audience, in February.

### 0.2 The OMI transcription substitutes "FliHub" for unintelligible speech. Constantly.

This is severe and it corrupts naive grepping. Of 36 era-1 files matching the FliHub pattern, roughly
**two thirds are false positives** — the speech-to-text (and in places the haiku extraction layer on
top of it) inserts "FliHub" as a filler token where it could not resolve a word.

Verbatim examples, all from the era-1 corpus, none of which are about FliHub:

- `**[10]** Matt also works with this photo rub FliHub.` — background TV dialogue at a wedding
  (`omi/2026-02-12-0950-david-leads-live-discussion-on-agentic-ai-systems.md`)
- `**[2]** Detective FliHub. Detective Todd.` and `**[12]** FliHub. We're proud of our work.` —
  a TV drama playing in the room (`omi/2026-01-16-1124-planning-rust-tool-for-mac-function-key-voice-input.md`)
- `**[5]** But it didn't pan out how FliHub landed.` and `**[5]** Right. And it's like, what?
  FliHub at McDonald's.` — someone else's VC/PromptPay war story
  (`omi/2026-01-11-1147-informal-discussion-on-vc-strategy-and-ai.md`)
- `**[1]** I just need to buy myself one of the hardware devices of FliHub.` — this is a **Stream
  Deck / macro keyboard**, not FliHub. The extraction layer then hallucinated it up into the
  frontmatter: `extraction_summary: "Team plans a low-cost hardware device (FliHub)..."` and an
  action item `'Buy the FliHub hardware device'`
  (`omi/2026-01-19-0905-team-plans-low-cost-app-building-device-launch.md`)
- `**[1]** ... maybe Whisper FliHub or something like that` — he is saying **Whisper Flow**; he
  corrects himself two lines later: `**[1]** I would say whisper flow.`
  (`omi/2026-01-13-0457-support-signal-dev-setup-with-claude-code.md`)

David himself names the problem, in the corpus, on 2026-02-10:

> `**[3]** So firstly, when I taught to you and I use the term FliHub, My translation tool which is
> Whisper Flow, I think.`
> — `omi/2026-02-10-0359-reviewing-tools-agents-and-audio-gear.md`

and again, exasperated, when a voice agent mis-hears the app name:

> `**[3]** I want you to list projects from FliHub.`
> `**[3]** How could you misunderstand that? Like, at same words except you've got a slight letter change.`
> — `omi/2026-02-10-0225-debugging-mac-input-device-and-dev-environment.md`

**Consequence for eras 2 and 3**: any FliHub mention-count taken from grep alone is inflated,
possibly by 2–3×. The stated "136 files mention FliHub" across the whole corpus should be treated
as an upper bound, not a count. Every quote in this report was read in surrounding context and
judged to be genuinely about the app; the ones I could not vouch for are listed above as noise.

---

## 1. Chronological walk

### 2025-12-13 → 2026-01-08 — silence (the app is built)

No voice coverage. See §0.1.

### 2026-01-10 — video-project folder structure is already a *convention* question

The first era-1 signal isn't about FliHub's UI, it's about the shape of a video project on disk —
and whether that shape is owned anywhere.

> `**[1]** Also, where do we keep the rules on how Folders for video projects to get. Have we got it
> at a higher level somewhere? Like, how are we doing it for happy days? I know happy days uses fly
> hard, it's a different thing, but we're really more interested in the story line. App setup. I
> believe, I'm not sure whether that's in the storyline app folder somewhere on our system. Or
> whether it's a higher level of the video projects.`
> — `omi/2026-01-10-0003-repository-structure-and-setup-questions.md`

*(Transcription note: "fly hard" is almost certainly FliHub. "happy days" is a project/brand.)*

**Reading (inferred)**: barely four weeks in, the project-folder convention is already spread
across FliHub, Storyline, and per-brand ad-hoc setups, and David does not know which system owns
it. That is a structural complaint about the *suite*, not about FliHub — and it is the same
complaint that ends up producing the relay layer later.

### 2026-01-11 — the clearest early statement of what FliHub is, and where it sits

Two sessions the same night. The first (`0122`) is about start scripts, and en route he enumerates
the family:

> `**[1]** Image four talks about four different applications that I tend to run. They've probably all
> got similar start up sequence It's FliGen, FliDeck, FliHub, and Storyline app.`
> — `omi/2026-01-11-0122-designing-a-flexible-app-startup-command-system.md`

The second (`0255`) is a Loom-style demo, and it contains the era's single best **purpose statement**:

> `**[1]** So right here, we're on FliHub that's one of my applications that I use for recording my videos.`
>
> `**[1]** We would just start typing in dev and we get the video dev And FliHvideo is, a main system
> for me. It's an umbrella in which I've got FliGen, FliHub, FliDeck, and Storyline.`
>
> `**[6]** And their last here is FliHub.`
> `**[1]** This is where I do video recording, and I can watch the watch the different videos that I'm
> doing.`
> — `omi/2026-01-11-0255-demo-of-vibe-coded-app-startup-workflow.md`

**Answering the adjacency question directly**: in era 1, **FliHub is NOT the hub of the suite.**
The umbrella is **FliVideo**; FliHub is one of four peers under it (FliGen, FliHub, FliDeck,
Storyline), each on its own port — FliHub on 5100/5101, others on 5300 and 5400. The name is
misleading about its role at this point in time.

The same session carries the era's only **visualisation** want, and it is stated as a *general*
principle rather than a FliHub feature:

> `**[1]** ...one of the ways that you can solve the problem is having visualization techniques around
> the data ... When I'm whether I'm when I'm working in my poem sort of environment or my FliDeck
> sort of environment, I am doing things that are turning context into visualizations. They're not
> something I've released anyone. It's still a work in progress`
>
> `**[1]** ...we've got integration tests or terminal tests, and they're clickable. So you don't have
> to go and figure out where it is in the text document. You just click on it and paste it in
> somewhere, whatever you need to do.`
> — `omi/2026-01-11-0255-demo-of-vibe-coded-app-startup-workflow.md`

**Reading (inferred, but strongly)**: "turning context into visualizations" + "clickable, so you
don't have to go and figure out where it is in the text document" is the *ancestor* of every
FliHub panel. The design principle is not "show me a chart" — it is **make the thing on screen the
thing you act on, so no one has to go hunt for it elsewhere.** He assigns this to FliDeck/POEM in
January; the FliHub UI is built on the same instinct.

### 2026-01-12 — FliHub is the reference architecture

Planning a Stream Deck web app, FliHub is cited not as a product but as a **pattern to copy**:

> `**[1]** So this is the basic idea of the application. What I'm wondering and and it could be done
> with Socket IO. In fact, if you go and have a look at FliHub or FliGen, you can really see how we
> model that sort of stuff.`
>
> `**[1]** We've I've given you all the data. So you got data that data, by the way, if it changes,
> should automatically reflect on the front end. So we need a file watch on it.`
> — `omi/2026-01-12-1533-planning-a-retro-style-stream-deck-web-app.md`

**Reading**: the FliHub *architecture* — Express + Socket.IO + chokidar file-watch, "if the data
changes it reflects on the front end" — is by January already David's house pattern, exported to
other apps. This recurs a month later (see 2026-02-12, §"So it looks very similar to FliHub").

### 2026-01-15 — FliHub in front of an audience, for the first time

The Vibe Coding Harness kickoff. FliHub is one of the five apps he has Claude Code introspect live:

> `**[1]** I have showed them They they are tools that solve really problems for me. Right? I've got
> applications. ... And I can build these. ... I've got my video recording software. I got all sorts
> of stuff.`
>
> `**[1]** Just do you know about five of my applications. Right? That was VibeDeck, FliHub, FliHub,
> FliGen, FliDeck, and whatever the other one was.`
> — `omi/2026-01-15-1112-david-hosts-vibe-coding-harness-kickoff.md`

Nothing new about FliHub's function, but note the framing: **"tools that solve real problems for
me"**. This is the seed of the "bespoke by design" position he states outright in February.

### 2026-01-19 — a naming/repo pull toward FliVideo

> `**[1]** I've given you a folder that might be a better location for this application. It could be
> called ... The quick fox.`
>
> `**[1]** And it could start joining the FliHub video ecosystem. But if it did that, we would need to
> put it into a Git repository. Now all of the FliHub video systems all live in a repository area anyway.`
>
> `**[1]** But maybe we don't. That here. Maybe we just gotta get the name of the code changed around a
> little bit. So that it's not voice agent and it suddenly FliHub video and then moved over to that
> location.`
> — `omi/2026-01-19-0430-planning-flihub-video-app-repository-migration.md`

*(Transcription note: "FliHub video ecosystem" / "FliHub video systems" is almost certainly
**FliVideo** — the umbrella — not FliHub. The STT collapses the two. Read this as "the FliVideo
ecosystem".)*

**Direction signal (weak)**: he is thinking about a **voice agent** app joining the FliVideo family.
This is the app that becomes the ElevenLabs voice agent that talks to FliHub in February. He
considers naming it "The Quick Fox" (his STT test phrase, "the quick brown fox", appears all over
the corpus).

### 2026-02-10 — FliHub becomes a thing other software calls, and it starts hurting

Three sessions on the same day. This is the day FliHub stops being a UI he uses and becomes an
**API surface that agents address** — and the friction is immediate.

Session `0419`, ElevenLabs tool wiring:

> `**[3]** It seems to do something totally different. It's certainly not calling through to my FliHub
> application, though when I look at the configuration here, it looks like the tool itself is
> misconfigured.`
>
> `**[3]** So what I might do is just give you all three configurations and what I'd like you to do is
> tell me, are they correct?`
> — `omi/2026-02-10-0419-user-troubleshoots-tools-links-and-11labs-setup.md`

Session `0225`, the same fight from the voice side:

> `**[3]** List some projects.`
> `**[3]** I want you to list projects from FliHub.`
> `**[3]** How could you misunderstand that? Like, at same words except you've got a slight letter change.`
> `**[2]** List them all. List them all.`
> `**[2]** Display them all here.`
> `**[3]** There's not many.`
> — `omi/2026-02-10-0225-debugging-mac-input-device-and-dev-environment.md`

**Complaint (verbatim, hard)**: the listing came back partial. "There's not many" + "List them all"
is the first appearance of a friction that recurs for the rest of the corpus: **FliHub returns a
truncated or wrong project list.**

Session `1143`, the richest single FliHub-usage transcript of the era. He is driving an assistant
against FliHub's API and against a documentation link-integrity job:

> `**[1]** Can you give me a list of projects on FliHub?`
>
> `**[2]** Can you give me a handover conversation so that we can continue this link removal in another
> removal in another folder.`
>
> `**[1]** Can I get you to give me a list of broken link please?`
> `**[2]** When you do the broken links, can you write them into the conversation?`
> `**[1]** Please don't create a separate file anywhere. Please don't just figure out a table and have
> that hidden. I just want to see the list of broken links.`
>
> `**[2]** I'd like you to list some project It seems it connected, but it didn't work. What so what is
> going on? You might need to run a background task to check the documentation of FliHub itself.`
> `**[2]** Is the endpoint scrapped? Can you test a call to the FliHub server?`
>
> `**[1]** Can you get me a list of FliHub projects? Can can you get me a list of can you get me a of
> FliHub projects?`
> `**[2]** That's fucking true.`
> `**[2]** That is cracking cool.`
> — `omi/2026-02-10-1143-david-reviews-flihub-broken-link-workflow.md`

Two things worth pulling out.

1. **"Please don't create a separate file anywhere. Please don't just figure out a table and have
   that hidden. I just want to see the list."** This is a UX law, stated angrily, about a *different*
   tool — but it is the same law as the January "clickable, so you don't have to go and figure out
   where it is in the text document" line. **Show the data where I am. Do not put it somewhere I have
   to go and find.** Two independent statements, a month apart, same principle. Treat it as a
   recurring want.
2. **The asking-three-times pattern.** He repeats "can you get me a list of FliHub projects" three
   times in one breath. Whether that is stutter or repeated failure, the *listing* is the operation
   he wants most and the one that misfires most.

### 2026-02-12 (morning) — voice → FliHub, working, and the project vocabulary in the clear

> `**[0]** Can you list my projects? Anything with the word opus would be handy from FliHub.`
> `**[5]** Found projects with OPUS b seven two`
> `**[0]** Can you list any projects I've got with the word opus?`
> `**[5]** No projects with the word OPUS were found.`
> `**[0]** That's not true. There should be plenty of them looking in the FliHub. What are the projects
> with the word opus?`
> `**[5]** Here are some projects with the word opus. B seven two, OPUS 4.5, awesome. Seven ninety
> three, vibe code, e cam line, OPUS. Point five, p 75, five code whisper opus, 4.5, p seventy six
> five code auto chapters opus. Four b eighty nine five code video player, opus 4.5, and c 14 Opus
> 4.6, Eleven Labs voice agent.`
> `**[0]** Can you give me the, transcript for b 72?`
> `**[5]** Here's the transcript for project b 72. Opus 4.5 awesome. Cloud Opus 4.5 just got released.
> And my initial reaction was, who cares? And the reason for that is I`
> `**[0]** That is fucking true.`
> — `omi/2026-02-12-0652-user-reviews-opus-projects-and-git-tasks.md`

**Complaint (verbatim, hard, recurring)**: `"That's not true. There should be plenty of them looking
in the FliHub."` — same-day-plus-two repeat of the 2026-02-10 "There's not many". **Search/filter
over the project list returns wrong or empty results.** That is now two independent occurrences in
48 hours.

**Want (implicit but unmistakable)**: the two operations he actually asks FliHub for, by voice,
every time, are (a) **list/filter projects by keyword** and (b) **give me the transcript for
project X**. Nothing else. Not rename, not stage, not thumbnails — those are things he does in the
UI. The *API* he wants is a project search and a transcript reader.

Also recovered here: his project-code vocabulary in the wild — `b72 opus-4.5-awesome`,
`b73 vibe-code-ecamm-live-opus`, `b75 vibe-code-whisper-opus-4.5`, `b76 vibe-code-auto-chapters-opus`,
`b89 vibe-code-video-player-opus-4.5`, `c14 opus-4.6-elevenlabs-voice-agent`. **FliHub's own
construction was itself filmed as a numbered FliHub project series.**

### 2026-02-12 (afternoon) — the Claude Lab session. The North Star, spoken to a room.

This is the most valuable file in era 1: `omi/2026-02-12-0950-david-leads-live-discussion-on-agentic-ai-systems.md`
(1134 segments). He demos the ElevenLabs voice agent against FliHub live, it fails, he fixes it,
it works, and then he explains **why the app exists**.

The demo, including the failure:

> `**[9]** Yeah. You, list some projects from FliHub with the word opus?`
> `**[9]** So that was interesting. Was a tool call failure that did not do what I asked to to do, what
> that tried to do.`
>
> `**[9]** ...what happened earlier is that I asked it to get me a list of projects, and it didn't. Then
> I asked it to get me a transcript from one of my, videos and it tried to open a file. And that was
> your confusion. Why did that happen? Well, it's it's misunderstood, and it didn't use the same skill.`

Then it works:

> `**[9]** Can you get a list of projects from FliHub? Now FliHub is my video application. It's it's an app`
> `**[9]** Okay. Found 54. Okay. Can you get me some project codes for any videos in FliHub that are
> talking about Opus?`
> `**[20]** BEO nine, c 14.`
> `**[9]** Can you tell me by getting the transcript what C14 was about?`
> `**[20]** Here's the transcript for project C14. Discusses the release of OPUS 4.6, extending
> applications around FliVideo. Setting up tools, building a foundation, configuring 11 labs,
> developing client server architecture.`

Then the description of the app itself — **the purpose statement**:

> `**[0]** But what what it's doing is I've got three different skills. Configured to talk to different
> systems. So two of them are talking to my FliHub system, which is over here.`
> `**[9]** This is my video project system. If go down to c 14, which is the one we're on, and we go to
> the watch, we can see all the videos I was recording around that and we can play them. And you can
> see the transcript going on down below below, like the transcript is playing through at the moment.`
> `**[9]** And that's all it was doing. It was calling through to an API that I've got in this
> application to get that information out.`

And then the *why*, which is the single most important passage in this entire era:

> `**[9]** ...this application is a pretty much of no use to anyone in this room.`
> `**[9]** This is one of the things we're going to see with the personal agentic operating system is
> that every time we need an application to solve our bespoke problem, we'll just create it. Now the
> funny thing about this application is I never released the videos. There were six of them. They
> were all done the moment OPUS 4.5 got out, and I really missed. A a trend on that. But these videos
> were all about me building this actual application, and it was such a wonderful experience for me
> to sit down and generate an application that solved a problem for me of releasing videos.`
> `**[9]** Quicker to the point that theoretically I've doubled or tripled my ability to be a youtuber.
> Because I can produce videos quicker.`
> — `omi/2026-02-12-0950-david-leads-live-discussion-on-agentic-ai-systems.md`

**That is the North Star, in his own words: FliHub exists to increase the rate at which David ships
YouTube videos. "Doubled or tripled my ability to be a youtuber."** Everything else in the app —
naming, chapters, transcripts, stages, thumbnails, relay — is instrumental to throughput. And it is
**deliberately bespoke**: "pretty much of no use to anyone in this room" is not an apology, it is
the design stance.

The same session also contains the pipeline vision, offered by an attendee and endorsed by David:

> `**[3]** ...you could maybe, like, stack things and you've done this already really well where it's,
> like, create a video, and then it does a transcript, and then it puts it here, and then it's, you
> know ... could be workflow where you do a video, and then it does the thumbnail, and it does the
> transcript, and then it does the SEO and then it does the blog post.`
> `**[9]** Yes. Yes. Yeah. And this is about tying This is where if we get to the third section of this
> session, which will be the agentic stack, I'll talk a little bit about that.`

**Reading (inferred)**: the intent is drifting from *organiser* to *pipeline*. FliHub as of Feb
2026 is a place where assets sit; the ambition being agreed to out loud is a chain where recording
→ transcript → thumbnail → SEO → blog runs as a workflow. (FliLaunch, which lands later, is
exactly the tail of that chain.)

And the friction, stated plainly:

> `**[9]** ...And then I configured quite laboriously. It's not it's not currently what I would call
> easy to do. I configured three separate tools. And those tools were designed to only operate on my
> computer. They they're not out on the Internet. They are local tools. Two of them are that other
> application called FliHub.`

**Complaint**: wiring an agent to FliHub is *laborious*. Three hand-configured tools. The app has an
API but no ergonomic front door for agents.

Finally, FliHub-as-reference-architecture recurs, a month after the January instance:

> `**[9]** ...Then I asked it to look at the architecture I have for four different applications. One of
> them is FliHub.`
> `**[9]** So it looks very similar to FliHub.`

**Recurring**: FliHub's shape is the template his other apps are generated from. Twice in era 1
(2026-01-12 and 2026-02-12). The rewrite is therefore not just a rewrite of one app — it resets
the pattern the family copies.

### 2026-02-22 — the relay architecture is conceived, out loud, before a line of it is written

Setting up Tailscale across the Mac minis:

> `**[0]** Also, I'm gonna let you know that two new computers are going to come into the network but
> they'll be in The Philippines. I'm in Thailand.`
> `**[0]** This is probably useful in the architecture document to know this, by the way.`
> `**[0]** ...The only thing that's gonna be a little bit different, is they're not gonna need Ecamm
> Live, I guess. They might do. I might put them on one of them. But I think there's a separation
> between the creator computer everything else on the network.`
> — `omi/2026-02-22-1022-user-sets-up-mac-minis-and-tailscale-network.md`

**This is the origin of `machineRole: creator | editor`**, spoken on 2026-02-22, months before the
relay layer exists in code. Note what drives it: not a feature request, a **topology fact** — the
editors are in another country, off `.local`, and they do not record.

The companion session frames the interface he wants to that topology:

> `**[0]** ...all I wanna do from my m four probe is be able to connect with the MCP. Directly to my
> MacBook mini m two ... so I can control it. Now the challenges I've got is maybe I need SSN maybe I
> need SMB, maybe I need VNC. I don't fucking know what I need, to be honest.`
> — `omi/2026-02-22-1015-user-plans-remote-control-setup-across-macs.md`

**Reading (inferred)**: the remote-editor problem enters David's head as a *machine-control* problem
(SSH/VNC/MCP), not as a *file-sync* problem. FliHub's relay layer is the answer he eventually
builds, but the question he was asking in February was broader.

### 2026-02-24 — two concrete FliHub wants, neither of which names the app

> `**[0]** De nada se SRT files that show up from time to time in our system. I've got one in first
> edit. There's another one in prep as well.`
> `**[0]** Would it be really nice? Is if you can just press a button to the side of these things, and
> get the raw text.`
> `**[0]** TXT clipboard capabilities. So raw text and not with time stamps, just raw text in the
> clipboard And for now, just on the s three staging or or no, everywhere the SRT appears.`
> `**[0]** I thought you were the product owner. Why are you doing the developer?`
> — `omi/2026-02-24-0656-user-requests-raw-text-export-from-srt-files.md`

*(Attribution: "first edit", "prep", "s three staging" are FliHub's own folder/page names — First
Edit Prep and S3 Staging shipped 2025-12-17 and 2025-12-19. This is a FliHub request even though
the app is never named. Labelled **inferred**, but with high confidence.)*

**Want (verbatim)**: a one-click **SRT → timestamp-stripped raw text → clipboard**, *everywhere an
SRT appears*, not on one page. Note the shape of the ask: not a new screen, a **button next to the
thing**, on every surface where the thing exists. Same law as §January and §Feb-10.

The same day, reviewing a data panel in a *different* app, he articulates UI preferences that read
straight onto FliHub's panel-heavy UI:

> `**[2]** But that pop out panel that we have on the newer version of the application is just too
> small, whereas this has decided to make it a full screen. That, I think, is what's good about it.`
> `**[2]** ...it's good that there are two different ways of viewing the data.`
> `**[2]** When we've got things like expand and collapse, that we can click on, they're gray. But they
> don't persist across sessions. Well, across pages.`
> `**[2]** ...you might want a global checkbox that you can configure around that. So basically, things
> that you can see such as a prompt template you might wanna be able to turn it off or turn it on. So
> there's just the ability to make certain things a little bit configurable is missing.`
> `**[2]** I feel like from time to time, you might wanna skip some panels.`
> — `omi/2026-02-24-1046-feedback-on-workflow-data-panel-ux.md`

**Wants (verbatim, but about AWB not FliHub — labelled adjacent)**: pop-outs too small, prefer full
screen; more than one view of the same data; **expand/collapse state must persist across pages and
sessions**; per-panel show/hide config; skip a step that isn't required. The persistence complaint
in particular is the kind of thing that will show up in FliHub later.

---

## 2. Themes

### 2.1 Purpose — what FliHub IS, in era 1

Three statements, escalating in ambition:

1. **A recorder's workbench.** `"one of my applications that I use for recording my videos ... This is
   where I do video recording, and I can watch the different videos that I'm doing"` (2026-01-11).
2. **A video project system with an API.** `"This is my video project system ... we can see all the
   videos I was recording around that and we can play them. And you can see the transcript going on
   down below ... calling through to an API that I've got in this application"` (2026-02-12).
3. **A throughput multiplier.** `"solved a problem for me of releasing videos. Quicker to the point
   that theoretically I've doubled or tripled my ability to be a youtuber"` (2026-02-12).

**#3 is the North Star.** #1 and #2 are descriptions of the machinery; #3 is the reason the machinery
exists. If a rewrite decision does not increase videos-shipped-per-week, era-1 David would not have
paid for it.

Attached to #3 and equally load-bearing: **`"this application is a pretty much of no use to anyone in
this room"`**. FliHub is bespoke on purpose. It is not a product, it is an instrument. Any rewrite
temptation toward generality, multi-tenancy, or "what if others used it" contradicts an explicit,
public, on-the-record design stance.

### 2.2 Wants — with recurrence flags

| Want | Recurring in era 1? | Evidence |
|---|---|---|
| **List / filter projects by keyword** (the primary API operation) | Yes — 4 sessions | 02-10 ×3, 02-12 ×2 |
| **Fetch a project's transcript on demand** | Yes — 2 sessions | 02-12 morning + afternoon |
| **Show data where I am; never in a hidden file or table I must go find** | Yes — 3 sessions, stated as a rule | 01-11 ("clickable... don't have to figure out where it is"), 02-10 ("Please don't create a separate file anywhere"), 02-24 ("press a button to the side of these things") |
| **Voice as the entry point to FliHub** | Yes — the whole Feb arc | 02-10, 02-12 ×2 |
| **SRT → raw text (no timestamps) → clipboard, on every surface** | Once, but very specific | 02-24 |
| **File-watch → live UI update, no refresh** (already built; he exports it as *the* pattern) | Yes — 2 sessions | 01-12, 02-12 |
| **Chain the pipeline: video → transcript → thumbnail → SEO → blog** | Once, endorsed | 02-12 |
| **A shared, owned convention for video-project folder structure** | Once | 01-10 |
| **Keyboard controls / shortcuts / hotkeys for FliHub** | **ABSENT in era 1** | — |
| **Visualisations of FliHub data** | **ABSENT for FliHub in era 1**; the *principle* is stated for FliDeck/POEM | 01-11 |

**On the two the audit specifically asks to recover — keyboard and visualisation:** neither is a
FliHub want in era 1. I looked for them directly (grep for `keyboard shortcut|hotkey|shortcut
key|arrow key|spacebar|shuttle` across all 406 era-1 files) and the only hits are an iTerm shortcut
complaint and Stream Deck hardware chat. **The nearest ancestor of both is the January
"clickable" principle** — `"they're clickable. So you don't have to go and figure out where it is in
the text document. You just click on it and paste it in somewhere"` — which is about *reducing the
number of moves between seeing a thing and acting on it*. If keyboard control shows up in era 2 or 3,
it is very likely the same want, escalated: the mouse became the bottleneck. Flagging this so the
era-2/3 auditors can test that hypothesis rather than treat a hotkey request as novel.

There is a heavy **keyboard-hardware** thread running through all of January (Stream Deck, VibeDeck,
the macro-keyboard hackathon, the rotary-dial retro deck) — but it is a *separate product idea*,
never once wired to FliHub. Do not let grep conflate them; §0.2 shows the transcription actively
does.

### 2.3 Complaints

| Complaint | Type | Evidence |
|---|---|---|
| **Project list/search returns wrong or incomplete results** — `"There's not many"`, `"That's not true. There should be plenty of them"` | **Recurring** (2 sessions, 48h apart) | `omi/2026-02-10-0225`, `omi/2026-02-12-0652` |
| **Tool calls into FliHub silently do the wrong thing** — `"a tool call failure that did not do what I asked"`, `"It's certainly not calling through to my FliHub application"` | **Recurring** (2 sessions) | `omi/2026-02-10-0419`, `omi/2026-02-12-0950` |
| **Wiring an agent to FliHub is laborious** — `"I configured quite laboriously. It's not currently what I would call easy to do."` | Once, but stated as a general verdict | `omi/2026-02-12-0950` |
| **Output hidden in files/tables instead of shown inline** — `"Please don't create a separate file anywhere ... I just want to see the list"` | Once for FliHub-adjacent work; the principle recurs | `omi/2026-02-10-1143` |
| **The app name breaks speech-to-text** — `"How could you misunderstand that? Like, at same words except you've got a slight letter change."` | Once, but it corrupts the entire corpus (§0.2) | `omi/2026-02-10-0225` |
| **No single owner of the video-project folder convention** | Once | `omi/2026-01-10-0003` |
| Panel/UI: pop-outs too small, collapse state doesn't persist, no per-panel config, no skip | Once (about AWB, adjacent) | `omi/2026-02-24-1046` |

**The one to carry forward into eras 2 and 3**: *the project list is wrong*. It appears twice in era
1 within two days, on the app's single most-used operation. If it reappears in March and again in
July, it is the highest-value defect in the audit. Era-2/3 auditors: grep specifically for
`"there should be"`, `"that's not true"`, `"list them all"`, `"not many"`, `"missing projects"`.

### 2.4 Direction changes

1. **Jan → Feb: from a UI David drives, to a service agents call.** In January FliHub is described
   entirely as something he opens on port 5100 and clicks. From 2026-02-10 onward, every FliHub
   mention is about calling its API — from ElevenLabs, from Claude Code, from a voice agent. The app
   grows a second consumer, and it is not a human.
2. **Feb: from organiser to pipeline.** The endorsed vision on 02-12 is a chain (video → transcript →
   thumbnail → SEO → blog), not a filing cabinet.
3. **Feb 22: from one machine to a fleet, with roles.** `"there's a separation between the creator
   computer everything else on the network"` — the creator/editor split is conceived as a *network
   topology* fact, and it precedes the relay code.
4. **Persistent, not a change: FliHub is a peer, not the hub.** The umbrella is FliVideo. This is
   stated twice (01-11, 01-19) and never contradicted in era 1. If FliHub becomes "the hub" later,
   that is a real direction change and it happens after February.

### 2.5 Adjacent apps and the shape of the suite

| App | Relationship implied in era 1 | Evidence |
|---|---|---|
| **FliVideo** | The **umbrella**. `"FliVideo is a main system for me. It's an umbrella in which I've got FliGen, FliHub, FliDeck, and Storyline."` FliHub is a child of it, not the parent. | `omi/2026-01-11-0255` |
| **FliGen** | Peer under FliVideo. `"all generative AI tools that I've done"`. Co-cited with FliHub as the Socket.IO reference pattern. | `omi/2026-01-11-0255`, `omi/2026-01-12-1533` |
| **FliDeck** | Peer. Documentation/POEM visualisation surface — `"where we can see all the documentation I've been doing around Poem"`. This is where the *visualisation* instinct lives in era 1, not in FliHub. | `omi/2026-01-11-0255` |
| **Storyline** | Peer. Named in the four-app family and cited as possibly owning the video-project folder convention. | `omi/2026-01-11-0122`, `omi/2026-01-10-0003` |
| **ElevenLabs voice agent (later "c14")** | The **new front door to FliHub**. Two of its three configured tools point at FliHub. Considered for adoption into the FliVideo repo family. | `omi/2026-02-12-0950`, `omi/2026-01-19-0430` |
| **Ecamm Live** | The **upstream source**, and a hardware antagonist — `"Ecamm Live hijacks the microphone and suddenly my voice agents don't work"`. Also the thing that defines a creator machine: editors `"are not gonna need Ecamm Live"`. | `omi/2026-01-31-0112`, `omi/2026-02-22-1022` |
| **Whisper / Whisper Flow** | Two different things, both present. Whisper = transcript engine for FliHub. Whisper Flow = his dictation tool, and the reason "FliHub" is mis-transcribed. | `omi/2026-02-10-0359`, `omi/2026-01-13-0457` |
| **POEM / BMAD** | Method layer, not app layer. Governs how he *builds* FliHub (PO/dev split, FR numbering), not what FliHub does. | `omi/2026-01-11-0255`, `omi/2026-02-12-0950` |
| **VibeDeck / Vydave / Stream Deck** | **Not a FliHub relative.** A separate hardware/macro-keyboard venture running in parallel through January. It borrows FliHub's Socket.IO architecture and nothing else. It is also the main source of grep false positives. | `omi/2026-01-12-1533`, `omi/2026-01-19-0905` |
| **Jump CLI** | Third tool alongside the two FliHub tools in the voice agent. Sibling utility. | `omi/2026-02-12-0950` |
| **AWB (Agent Workflow Builder)** | Not FliHub-related, but the source of the 02-24 data-panel UX critique that generalises to FliHub's panels. | `omi/2026-02-24-1046` |
| **Samantha / agentic OS** | The **containing ambition**. `"This is what the personal agentic operating system is for me."` FliHub is the worked example he uses to explain it. | `omi/2026-02-12-0950` |
| **FliBrief, FliVoice, FliLaunch, Teletubby, AngelEye, ALS, Hyperframes** | **Absent from era 1.** Zero era-1 voice mentions in a FliHub context. | — |

### 2.6 What the rewrite should take from era 1

- **The North Star is throughput, and it is quotable**: *"doubled or tripled my ability to be a
  youtuber."* Use it as the acceptance test.
- **Bespoke is a stance, not a compromise.** `"of no use to anyone in this room."`
- **Two consumers, not one.** By Feb 2026 FliHub is driven by a human UI *and* by agents over an
  API. The rewrite has to treat the agent-facing surface as first-class, because in era 1 it was
  bolted on and it was `"laborious"` and it `"did not do what I asked"`.
- **The two API operations he actually uses by voice are `list/filter projects` and `get transcript`.**
  Everything else was mouse work.
- **One UX law, stated three separate times in three separate contexts**: put the thing where I am,
  next to what it belongs to, one click from acting on it. Never in a separate file, a hidden table,
  or a screen I have to navigate to.
- **The project list being wrong is the era's only repeat defect.** Fix it structurally.
- **Creator/editor roles are a topology fact, not a feature.** They exist because two of the machines
  are in the Philippines and do not run Ecamm.

### 2.7 Confidence and what this audit does NOT establish

- **Coverage gap, unfixable**: no voice evidence exists for 13 Dec 2025 – 8 Jan 2026, the period in
  which FliHub was actually designed and mostly built. Every era-1 conclusion is drawn from ~7 weeks
  of *post-hoc* commentary on a finished skeleton.
- **Thin sample**: 9 substantive files. Two of them (`omi/2026-02-12-0950` and `omi/2026-02-10-1143`)
  carry the majority of the signal. If either is mis-transcribed in a way I did not catch, several
  conclusions move.
- **Silence is not absence.** "Keyboard controls absent in era 1" means *he did not say it into a
  wearable in Jan–Feb 2026*. He may well have typed it into a Claude Code session. The FR/PRD stream
  in `docs/prd/` is the place to check that, and this audit did not.
- **The false-positive rate (§0.2) is measured by reading, not by a validated classifier.** I judged
  each hit in context. A different reader might rescue one or two of the ones I discarded, or discard
  one or two I kept.
- **Absence of a want in the voice record does not mean the app lacked the feature.** FliHub had
  chapters, thumbnails, stages, shadows and S3 staging shipped by mid-December; David simply never
  discusses them out loud in this window. The rewrite must not read "not mentioned in era 1" as
  "not wanted."
