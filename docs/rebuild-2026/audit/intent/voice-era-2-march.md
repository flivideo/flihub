# FliHub Voice Corpus — Era 2: March 2026 (Peak Build)

**Audit scope**: OMI wearable transcripts, `2026-03-01` → `2026-03-31`.
**Corpus**: `/Users/davidcruwys/dev/raw-intake/omi/` — 555 files in March. 51 mention FliHub by name (or a mangled variant); ~22 more mention `FliVideo` / `fly video`, which in this era is David's slip-name for the same thing.
**Plaud**: `/Users/davidcruwys/dev/raw-intake/plaud/` contains **zero** March 2026 files — its corpus starts 2026-07-05. Everything below is OMI.
**Substantive files read in full**: 24. Files with only a passing mention: noted inline and skipped.

> **Transcript quality warning.** These are Plaud/OMI wearable captures. The device picks up TV audio, shop conversation, Thai/Tagalog, and mangles proper nouns. "FliHub" survives fairly well in March, but "FliVideo" is transcribed "fly video" / "flow video", "Ecamm Live" becomes "Ecam Live" / "eCamp" / "e cam live" / "EQM life", "Ralph Wiggum" becomes "Rough Wiggum" / "Ralph Wigdon" / "Rough Wyndham" / "RAFI" / "Ralphie", "POEM" becomes "poemed void" / "PineWU" / "Pine". Where I am not sure what a phrase means, I say so instead of smoothing it.

---

## The one-line story of March

FliHub stopped being *only* the place David names and organises recordings, and became **the upstream data source for everything downstream** — a local HTTP API, a Claude skill, and a "publish" button that fires a video project's transcripts + chapters into the Agent Workflow Builder's YouTube Launch Optimizer. Almost every March conversation that names FliHub is actually about the *seam* between FliHub and something else.

---

# Part 1 — Chronological walk

## Mar 1 — Identity, stated three times, three different ways

Three separate recordings on 1 March have David explaining his own app to someone else (his new $5k/month client Lars, and to camera for a YouTube video). These are the cleanest purpose statements in the entire era, and they **do not agree with each other**.

To Lars, walking through the AppyStack architecture:

> "Now what I've used it for is FliHub. **It's video editor software.** I've got the FliDeck. So a lot of the times when I'm visualized, stuff, I'm using that. And, essentially, all they're doing is writing to the file system, visualizing here. So this is where we turn context into [—] And they actually meet you're seeing right now."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-01-1050-lars-reviews-agentic-os-mesh-and-micro-apps.md`

Same recording, the origin story of the whole stack — and it is a FliHub origin story:

> "if you were talking here and you sent the information to the server, it could write it, say, in the file system. This is really useful in agentic operating systems. But I've I I never designed it that originally. **I designed it because I wanted to save videos, and I wanted to talk to them.** Now if you also changed the file, you'd instantaneously comes back to the client."
> — same file

To camera, the weekend review:

> "this is really important if you're working in clawed harness or anything that's with the file system from an agentic point of view, this where you want to build your apps talking from this as well. So I've been it for FliHub. **It's my video editing software.** FliDeck is where I visualize a lot of stuff you might see in a BMAD."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-01-1132-user-outlines-project-theodore-agentic-os-roadmap.md`

To Lars again, an hour later:

> "Then there's the different applications that currently building. **FliHub is my video recording software.** [FliDeck] is my slide deck generation software. FliGen was a twelve little tools for generative media. Storytelling is more for movies and stuff like that. But essentially, there are so many little apps that we can build really quickly that solve bespoke sort of problem"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-01-1104-lars-plans-project-theodore-collaboration.md`

**Editing software / editor software / recording software.** Twelve days later, live-demoing to a client, he calls it a fourth thing:

> "I'm going to **my recording application**. So let's say I'm I'm recording a video here."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-13-0457-planning-moments-that-matter-workflow-and-shift-system.md`

**(inference)** This is not sloppiness so much as an app whose centre of gravity is moving. He built it to *capture and name* recordings; by March he is mostly using it to *emit* prepared context to other systems. He has no word yet for that second job.

Also 1 March, the operational reality — the app as his week's work log:

> "we need to do an audit of the stuff we've done today as well, so if you go over and look in FliHub, I've done four or five videos recently. Should be transcripts for each of them. And they're they're all done this week. And they do need to be released."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-01-0113-david-outlines-agentic-os-tasks-and-shop-kpis.md`

And FliHub's place in the suite is stated plainly — it is the first name on the micro-app list, and one of the ones that is *only* for him:

> "It's micro applications. So some of the micro applications are purely for me. **They include FliHub.**"
> — same file

> "They're not the good examples of real products, to be honest. **The real ones are going to be FliHub, FliDeck, Storyline app, FliGen.** Maybe deckhand."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-01-0534-ai-micro-apps-poem-method-and-tailscale-setup.md`

## Mar 2 — The month's actual mission is set

> "**Focus for today is to get the YouTube launch optimizer working.** In what way? I think **I need to test it from FliHub** and just see what happens when I send information through it and try and get it up and running."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-02-1052-planning-streamdeck-tools-and-youtube-launch-optimizer.md`

That single sentence is the spine of March. Nearly every FliHub complaint that follows is a complaint about this pipe.

## Mar 3 — FliHub as a RAG endpoint (the best demo of what it's *for*)

Live with Lars, David demonstrates FliHub as a locally-running HTTP service that a Claude skill queries by project code. This is the single richest passage on what FliHub actually *does* in the agentic stack:

> "Now what I'm gonna do is say, can you get me some information around four videos I did recently, c 15, c 16, c 17, c 18, and **can you use FliHub?** Now gonna see a skill. Kick in. We're also going to see a different example of rag [—] what it's going to do is retrieve. Is it gonna retrieve it from? A skill. Is going to talk to a website. **The website is running locally on my computer.**"
> "Let me just go to j FliHub. Run an NRD. It's doing a health check. It is. Okay. So I don't think I need to do anything. It's getting information. Where's it getting it from? It's getting it from here. This is the website it's running from."
> "So we're on C 15 at the moment. One two three four, four different videos I did. If I just jump up to transcripts on C 15 [—] I go up to my API and go this is what it's calling. **So if I give it a code and I send it, that's what got returned for C 15. A whole lot of data — every video in that actual main video, there's about 20 little micro videos, their transcripts, have all been taken over, they're living over here now.** So retrieval augmented generation."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-03-0555-lars-and-david-kick-off-90-day-ai-project.md`

And the hand-off, in one sentence:

> "here it is [—] an application. This is for a incident management system for Australian health practitioners. And this is a YouTube launch optimizer. And **the good thing is I can go into my FliHub and just send it and it just pops in here. It's now gone from one application to another application.**"
> — same file

Note the shape he describes: **a project code → ~20 micro-recordings → their transcripts, as one payload.** That is the FliHub data model as he understands it out loud.

Same day, the first serious design session on the FliHub→AWB seam. He assigns roles to three agents (himself as orchestrator, "vDave"+Alex on YAML/schema, another on HTML/front-end) and names his own project codes:

> "we're going to work on four different FliHub videos. They all have the code. C sixteen c fifteen, C17, and C18. The news of FliHub skill, to get an idea of the transcript. And what we're going to do is we're going to use a transcript through a run of the proof of concept workflow engine."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-03-0321-flihub-workflow-engine-ux-and-json-input-improvements.md`

The first statement of **the data-loss bug that will recur all month**:

> "The first thing I notice is that the data hits the YouTube launch optimizer. And I can press load from paste. That's not a poor workflow. That's okay. **Where it becomes problematic is if I'm already in the workflow somewhere. This doesn't seem to register.** Now it may be hitting the endpoint. I'm not sure, but what doesn't happen is that we don't go back to the beginning and see the data ready to load. And so **I've often got a go to the workflow engine hit refresh, then I've lost the data. Then I've gotta go back to FliVideo, press send again. Then I've gotta go to load from paste before it starts.**"
> — same file

And the payload-shape complaint — raw JSON strings where he wants structure:

> "the mapping is such that the data comes through as JSON. And it doesn't necessarily make a good data experience because **it would be ideal if the primary CTA for instance, was two fields in an object, and the fold CTA the same, and the affiliates was an array of name and URLs, and the social links was array or maybe an object**"
> "I'm curious how the size is calculated. Like, why does primary CTA and fold CTA, which are text areas, have one size, about four lines, and affiliates is much bigger? Yeah. Why is that?"
> "rather than an input box as text area, it could be Jason input [—] **as kind of, like, JSON editors rather than text areas. But under the hood, it can still just be a string**"
> — same file

But the pipe itself he already loves:

> "I really love the new [—] new data loaded from FliHub where we start workflow to apply. That's actually [a] better workflow for me."
> — same file *(speech-to-text mangled; the sense is that loading FliHub data as a new-workflow start is an improvement)*

Also 3 March — the "did you even wire the indicator?" blow-up. This is complaint #1 of the era and the first of at least three repeats:

> "my expectation is that when I'm on one of the wizard steps, if I was to send something from FliHub I should [see] some sort of visual indicator that new data has arrived. Do you want to start again? **I am not seeing that. And this is the second or third time I've asked you to develop it. And you're not doing it, which means you're debugging and you're testing processes are flawed.**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-03-0444-team-reviews-studio-app-and-dev-workflow.md`

Repeat, same day, different window:

> "sometimes it's just not working for me right now [—] **I send data with FliHub, and I'm not seeing a banner pop up. And I am on the YouTube launch optimizer.**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-03-1110-user-plans-projects-and-evaluates-monitor-options.md`

And a quiet but important architectural remark about where FliHub's outputs should land:

> "Really, **it depends [—] file locations and naming kind depends on the workflow, which is unfortunate for a generic tool.** I don't know whether we need to go into hard code paths temporarily. [—] If you look at the FliHub stuff, the data probably should be saved into this location for now."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-03-1307-discussing-file-workflow-and-canva-access.md`

## Mar 4–5 — Ecamm control, the pedal, and settings

Two one-liners on FliHub itself:

> "Get you to [check] FliHub personalization and vocab settings. And, please, have a look into the MC integration."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-04-0157-review-flihub-settings-and-mc-integration.md` *(2 segments, no further context — "MC" is probably MCP, mangled)*

> "Tell me a little bit more about the **FliHub brain config shape mismatch**. Is that really true?"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-04-0330-technical-tasks-and-open-questions-review.md`

> "Do we need to make changes to FliHub? To get this working?"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-05-0313-question-about-updating-flihub.md` *(single segment — no substance, logged and moved on)*

The bigger 4–5 March thread is **Ecamm Live control**, which is FliHub's upstream. He wants the record trigger itself automated:

> "I believe either e cam live or the new deckhand application has information about talking directly to Ecam Live through the HTTP server. [—] Apparently, we've documented something like 14 API endpoints. I'm assuming that's seven reads, seven writes"
> "I want you to [—] create a simple skill inside of the brain [—] **it's a self evolving skill because we're testing at the moment. We don't even know what it can do.** [—] it should also have the capability to read the P list file [as] XML and reverse engineer it back to a plist file. But if it did that, it would need some sort of **backup rewind** sort of capability."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-04-0708-planning-ecamm-live-integration-skill.md`

The pedal want, stated concretely — **the only genuine hardware-key/hotkey want of the era that touches the record loop**:

> "I need to set up my StreamDeck pedal. I need to press play to start recording. That'll do with the left hand button. And then I think I stop it with the same button. So I think it's a multi action in StreamDeck. [—] Then on the right hand button, I want the ability to pause and resume. [—] and it also has to, when you stop it, there's something I've gotta do around **waiting for the e cam live video recording to finish**."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-05-0017-planning-ecam-live-automation-and-video-content.md`

It did not work:

> "I'm pressing the button. I'm seeing it go from a play button to a second action, which is a recording button. So you would think it's recording. **But I don't see record on Ecam Live.** But then when I press it again, it puts a great tick over. It says recording, **but it only records for two seconds and then it stops.**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-05-0101-debugging-ecamm-live-recording-and-pedal-setup.md`

And the ambition behind it — Ecamm as an API, so *anything* can drive the record button:

> "before we implement this deckhand to talk to Ecam Live to push buttons for us [—] and it will also be reading configuration information from Ecam Live. [—] **Because it is a web application, [it] can have an API.** Because if you're going to use a skill [that talks] directly to e cam live, [that] would be nicer"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-05-0017-planning-ecam-live-automation-and-video-content.md`

He also frames FliHub as *content*, not just tool — an unreleased flagship video:

> "That'll segue into [a] big long video on **building FliHub**. Which I haven't released but I should do soon."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-04-2331-planning-ai-and-appystack-tutorial-videos.md`

> "we should do a FliHub video based purely on what I did for the Ecam Live competition that I didn't get through on."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-05-0017-planning-ecam-live-automation-and-video-content.md`

## Mar 9 — The transcript-send bug

The clearest single FliHub *defect* report in the corpus:

> "What I noticed is it's picking up `01Dash1IntroDotSRT`. **What it was meant to send was transcript, not SRT.** [—] But **what it should be sending is all of them concatenated together.** So [if] I show you what the reporting looks like, you'll see that there's a lot more videos that have a lot more transcripts. **And this is a bug.**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-09-0957-debugging-awb-transcript-sending-bug.md`

Same file — the naming cleanup, "POEM Void" → AWB:

> "I get you to have a look at the **send to poem void button** and the poem void button at the top. Firstly, wherever those two terms are used, can we change it to AWB?"
> — same file

And a data-never-arrives complaint (the file is badly polluted with TV audio, but David's own lines are clear):

> "I've been seeing FliHub's **consistently not return data**. Now this is probably more an Alex configuration issue. But what's going on with the analyze statistics? [—] What is going on with the analyzed statistics that **it's always empty?**"
> "Also, when that dialogue pops up, **why doesn't the escape allow it to close down again?**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-09-1426-mixed-media-clips-and-ux-tooling-discussion.md`

Mar 9 also has David explicitly naming FliHub's publish button as the *pattern to copy* for a completely different product (SupportSignal):

> "That's a good question on dispatch. So of the best thing to do is **go have a look at FliHub. Where I recently did a publish button.** It's called poemed void, I think. But publish button sends data from video over to AWB using the YouTube launch [optimizer] workflow. **I feel like while we're still testing concepts out, I want the same where we just send [incident] data over**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-09-0847-uat-coverage-workflow-ux-and-next-wave-planning.md`

**(inference)** FliHub's send-to-workflow button became, in David's head, a reusable architectural pattern — not a FliHub feature. That is a promotion.

## Mar 10 — "What the hell is going on in this repository?"

The gap-analysis request. This is David, about to *use* the app in anger, asking for the state of the world:

> "do we have any outstanding tasks on FliHub? [—] Do we have a list of tasks to work on? Do we have a backlog? Do we have a check of where things are at and where we're code that's been done but still listed as to do."
> "Can you just look through the whole codebase, look through all the documentation we might have around this, and come up with [—] challenges, issues, gap analysis"
> "I wanna create a scratch pad [—] **I'm definitely not looking for you to make changes.** I'm just looking for you [to] consolidate a bunch of notes and ideas from me. **The reason being is I'm gonna be using FliHub a bit and I just wanna get a list of challenges I've got with the system.**"
> "So **what the hell is going on in this repository?** [—] It started off with initial on 5173, and then I killed that. And then it's now three zero zero one."
> "**Where is the knowledge of what you're doing other than this conversation being kept?**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-10-1204-flihub-repository-review-and-gap-analysis-request.md`

Then, the **single most important complaint in this era** — the manual chaptering process:

> "The big problem is that before you even do an SRT [—] I wouldn't work on the SRT directly. I'd work on the transcript because you cut down a lot of tokens [—] Here are the chapter headings. **I've copied them directly from FliHub.** I believe they may have also included the line that it starts at in text, so that's good. Means, in theory, you should be able to find the text in the main transcript."
> "obviously, for a chapter to be practical, you need the SRT numbering. Need the time stamp."
> "**I currently do option a after the fact. And it's so damn slow. If you get a one hour video, this literally takes two hours to do because you gotta watch the video. It's just so fucking horrible. I hate this whole process. Which is why it's so important that we get it right.**"
> "I don't think I'm giving you individual text SRT folders [—] Because firstly, **they're probably all set to zero starting points because they were created on a per video basis. And two, they're not accurate reflection of the edited part of the video anyway.**"
> "I don't think we should ever use the abridgment [—] **We should only use a real transcript. It's the only thing that you can accurately match to.**"
> "the only thing that might be an improvement [—] I might be able to get the time stamp and chapter name [to] also include **the first 50 words from the transcript**. Would that improve [things]? Because now you'd have the words you can search with. I could even give it to you in a JSON document if that was better too."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-10-1340-improving-video-chaptering-workflow-from-transcripts.md`

The matching schema debate, same afternoon:

> "you're right in that the **folder names as an authoritative structure** [are] really useful. Where I think things fall apart is that **we don't always have SRT files** [—] an SRT file only makes sense if you've got the edited SRT file."
> "I found when I was doing this two years ago that **the large language model couldn't determine between the SRT data, the timestamp and the actual text**, which I ended up getting rid of."
> "My goal is that if you put in a folder name from FliVideo, then the text that you're comparing against probably comes [from] the first segment of the video in fly video for that chapter. But [—] I don't know whether it's always 100% accurate. **Quite often, what happens is I cross chapter boundaries — I might start early or keep going.** That's a bit of a problem."
> "**we are building an MVP that actually works**, and it has really good screens for us anyway."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-10-1331-team-debates-transcript-handling-for-mvp.md`

And the folder-name → chapter-number/chapter-name split, which is a direct FliHub data-model request:

> "Is this a correct format for the data? **This is what I got from FliHub right now.** [—] Well, really, it should have been **folder number and folder name as separate fields**, really. This folder number, by the way, **it's really chapter number**. And folder name, which is split off from the number, becomes the folder name."
> "Also **if chapter number is missing, what should we do?**"
> "Just so you know that the chapter number six being missing was **an error on my part at time of video creation** too."
> "what do you think our JSON document should look like, and **do I need to update FliHub to make it look this way?**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-10-1524-user-reviews-app-data-model-and-testing.md`

Also here, a testing principle he states as a rule:

> "**The UAT should reflect what the application can do. It's not a future reflection.**"
> "I wanna make sure we haven't got any gaps in our user acceptance testing. **It's almost something we want to do at the end of every [Ralph] loop**, by the way."
> — same file

Handover to the FliHub side, spelled out:

> "the only way for us to give you the chapter values is to give the transcripts that were recorded [—] the recording that the chapter name is in. **This is still different to the final video editing.** So can you just think that through before you come to a full conclusion."
> "Can you then write up a little bit of a brief [for] fly video — just as a handover, not as a file. I'll take it over to the [Fli]video [side] **so that it can also format the data the way you'd like to receive it.**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-10-1357-team-aligns-fly-video-fixes-and-handover.md`

## Mar 11 — Resume, DX/UX toggles, and "what front end designer even thinks of this"

The longest FliHub-named session of the month. Note the resume bug — the data-loss complaint from 3 March, now with a diagnosis:

> "It's also a bug that I can tell from receiving information from FliHub. When it's being sent in [—] we have two [ways] of sending data. We can send it as a new record, which takes us to the starting page. And it loads it into the chat box, and then you can just click through. That seems to work okay."
> "**But the whole idea of a resumption is that you go to a very specific point in the workflow. You don't start from the beginning.** And even if that wasn't the case, the current [case] doesn't seem to know what position I'm up to when I load from paste anyway."
> "I think I got to step four. I hit resume. I clicked jump, but I think I went back to step three. Is there a logical reason for this?"
> "Are the fixes on your side, or are there any fixes on FliHub as well? [—] **Why would they be stripping anything? Isn't the idea that you want the AWB Jason verbatim, or do you want it verbatim with a little bit of shape or envelope packaging around it?**"
> "We had a fix that we've gotta do on our side, on the FliHub side, in regards to resuming in AWB."
> "I don't know whether you can test this, to be honest, because **you can't [drive] FliHub and agent workflow[, ] but I can tell you that it's not working.**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-11-1233-user-reviews-flihub-workflow-ux-and-bugs.md`

The DX/UX highlighter regression — a **visualisation want**, precisely specified:

> "you know how there's a DX and UX button? **Those buttons are there to highlight the cells or the visual components that are rendered for the developer versus the end user.** But when you click the U[X] button, it also changes the state and you don't see the develop[er] panel at all."
> "You deleted the ability to see the visual highlighter. **The only thing that those two are meant to turn on and off is a toggle for the visual highlighters. One for what are essentially pilot controls and one for engineer controls.** This was so that I could see when you were placing different controls that you weren't putting them into the wrong area. **Now when I click the UX button, nothing happens.**"
> — same file

The data-view critique — three views, none good:

> "the data with the plus one — **I find that an incredibly confusing badge, the plus one.** [—] I find the whole idea of **data handover** a little bit confusing. Maybe it's the terminology."
> "When I'm on the data view [—] and I see a bunch of text boxes like this, **very difficult to scroll because unless you're right on an edge, you can't scroll the main window because scrolling actually scrolls the text areas themselves.**"
> "**I'm just curious what front end designer even thinks of this visualization the way it is.**"
> "That was on the nested area. Now I'm on the flat area [—] **I don't find this very useful the way it is. I'm not sure what it's trying to solve for us.** And I find that all the displays — **the table one's probably the best**, but I think it could use some improvement as well."
> "maybe you can use an MCP [—] the MCP playwright — and see, make changes and then check them out. [—] Probably load data directly from the data file I told you about earlier so that you got good data to work with."
> — same file

Same critique restated on Mar 6, which makes it a **recurring** want, not a one-off:

> "everything is wide and [—] it's not that a visualization strategy."
> "I've also given you flat, which again, not that practical. It's not bad. But I don't know that I'd ever use it."
> "[you] end up giving you a table, which I think is probably the best of all of them [—] but I think all three of them either should be consolidated into two, not three. Because **I feel like nested and flat don't really add much value. I don't feel like three different views are useful yet** [—] And **I don't think any of them really solve the problems I'm addressing all that well.**"
> "as far as modal dialogues go, **all the way to the edge makes it [so] you don't know that you've gone into a modal dialogue.** Now I do like the fact that we use up most of the real estate, but all of the real estate isn't that useful."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-06-0740-workflows-ui-feedback-and-outreach-strategy-discussion.md`

Mar 11 also books the **AppyStack upgrade** for the whole Fli suite:

> "So they all need to get an AppyStack upgrade, and that is **FliHub, FliDeck, and FliGen**."
> "There's a mention in there about the FliHub apps, FliHub, FliGen, FliDeck. I think any work you're about to do right now [—] should also include at least a simple investigation of them, **not because we need them to upgrade, but there might have been useful stuff there.**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-11-0435-dave-and-angela-align-ux-with-data-schema-constraints.md`

And a two-hour test run he could not see into:

> "**What I want is a fucking answer to the question of why it took two hours to do something that** [—] **and there's that you never give me any [progress]. I don't know whether you're progressing. All I know is that I see compaction. I see things crash. I don't have any faith that it's working even if it is working.**"
> "Then why don't I see the actual screens? If you're actually testing it properly, I'd see it. **It's not meant to be an e2e. It's meant to be UAT.**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-11-1038-debugging-slow-uat-and-playwright-test-runs.md`

## Mar 12 — The chapter/SRT schema argument, in full

This is the densest FliHub-schema day of the era. Four recordings inside 90 minutes.

Interrogating the schema he himself commissioned:

> "what do you know about the button that's available on FliHub to get recordings [—] the chapter information? **What's the format of the data that it grabs?**"
> "In particular, **FliHub chapters and SRT content.** What do you know about it from both a schema [and] a data shape point of view?"
> "You're looking in the wrong area. You're meant to be looking at the **agent workflow builder YouTube launch optimizer YAML** and files."
> "**Why did we come up with this schema and SRT content for gathering inputs?** So how many fields do we have? I can't quite tell what names they [are]."
> "what's there for formats, and which prompt are they then related to? **Which prompt is using them?** And what do you know about the prompt [—] to [know it] is gonna be a successful prompt [if] it had these data?"
> "**And what are the field names if I was sending it to agent workflow builder?**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-12-1406-reviewing-flihub-chapter-and-srt-data-schema.md`

The field-name / contract question — and a naming instruction:

> "**In fact, don't call it FliHub [—] just call it video.** How does the agent workflow builder know what field names to put things into? Is it coming from the YAML document [—] Is it coming from the Schema? Where does it come from?"
> "in particular, I'm looking at **the SRT content and the FliHub chapters**. What field names would I need to use as keys to send the data to this system — the intake or the ingestion system?"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-12-1414-clarifying-field-names-for-agent-workflow-ingestion.md`

**(inference)** "Don't call it FliHub, just call it video" is a small but real direction signal: he wants the *contract* between apps to be domain-named (`video`), not vendor-named. The producer should be swappable.

The display question — an explicit invitation to invent a visualisation:

> "**How do you think FliHub chapters should be displayed? Do you think it should be a text area, or do you think it should be something even more fancy?** And if yes, what?"
> "This was information from Alex. Does this mean anything to you? And is it different or better to what you're thinking?"
> "I'm gonna tell agent workflow builder about what you said. What's the absolute path to the YAML and schema related to this page."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-12-1448-planning-flihub-chapters-display-and-schema-updates.md`

Transcript-tool UX, including the copy-button ask he has already made and had ignored:

> "I'm prepared for the content, there are three substeps and three prompts. **Notice how you can go through the different prompts [in the] modal dialogue, but you can't in the developer screen.**"
> "**It isn't clean. No. It isn't fucking set up. I asked this three times. Look at this shit.**"
> "Are we looking at the transcript accuracy checker when you say that **it's in Markdown, not JSON**? Because if that's the case, I'm okay with it. Markdown — **I actually like it.**"
> "**I'd like to see any comparisons listed in side by side tables.**"
> "and, no, don't remove the original transcript. That was a mistake on my behalf. [—] **the abridgment is always compared to the original document.**"
> "**Have you heard me ask you to add a copy button near a pen or on a modal dialogue in this conversation? [—] Yes. I want you to implement them now.**"
> "Just want to come up with a format that's easy for me to read and easy for me to figure out **whether there are problems in a document, in a transcript**."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-12-1456-refining-transcript-tools-and-chapter-schema-ux.md`

The transcript-modal sizing and clipboard wants, stated plainly:

> "On the first one, **is there any reason why the transcript can't show higher — like, why can't it be nearly as high as the modal dialogue? And can we get a little copy button so that we can copy it to the clipboard?**"
> "it'd be nice if that edit pencil icon had next to it a clipboard icon as well."
> "I know when we originally had developer experience and user experience highlighters working, **they used to work a little bit more accurately than they do now**"
> "Also, do you have any way of checking the incoming data? **Like, why wasn't the SRT content filled in, and what field name should we have used for the SRT content?**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-12-1423-user-reviews-transcript-ui-and-dx-controls.md`

Hover parity + colour-coded interpolation — a **visualisation want**:

> "notice with the outputs, **I can hover over them and see data, but I can't do that for inputs.** Which would be nice."
> "would the front end designer have an opinion on where **concepts like interpolate values could be color coded, so that you could visually see them compared to the inputs?**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-12-1535-improving-frontend-usability-for-inputs-and-outputs.md`

And the same day, the **assets/inbox deep dive + the bidirectional-with-Jan plan** — the seed of the relay:

> "Then I want you to do [a] deep [dive] on a concept in FliHub. **[I] want you to look at the assets and inboxes. I want you to explain them both to me. What problems do they both serve?**"
> "let's say I'm recording a video on Claude code [—] I wanna be able to either store complex structures for Nano Banana, or I wanna store the images themselves. And the reason I might wanna do the complex structures — and potentially prompts go with them — [is] that I might want to give this to Jan to do on my behalf. **So that I don't have to do it.**"
> "I also want to explore the idea that **when I am recording videos, and especially if I add stuff to the inbox or the assets, that we can automatically be pushing commits fairly regularly so that Jan can just be doing pulls on it.** I could ask him — hey, I've got this, can you do a pull, can you get me a new image, can you send it back to me? **So it's bidirectional. That's actually challenging because of the situation of Git conflicts as well.**"
> "**I found the s3 layer no good because it's a staging area, and then you lose it once it's gone. It gets deleted, so it's not a really good technique. I feel it has to be option a** [i.e. Git]."
> "The way I do it over in the Signal Studio is that **we get a highlighted message up in the top right hand corner telling us that either the target or the source has changed. If the target's changed, I bring down Jan's information. If the source has changed, I can push up my information.**"
> "**Jan is using FliHub as well. He has access to FliHub.** [We're] both looking at the same file system through GitHub."
> "the video files, they are ignored [in git]. So that's okay."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-12-0159-clarifying-uat-e2e-and-nano-banana-observability.md`

And a small workspace observation that says something about how he *uses* the suite:

> "Sometimes the tab actually brings together multiple things. So [for] instance, **FliHub, FliDeck, and FliGen [and] storyline app — I often run them all in one tab even though they're independent applications**, but they all happen to be appy stack style of applications."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-12-0721-david-plans-angel-eye-workspaces-and-system-sync.md`

## Mar 13 — The demo, and "the config screen doesn't know there are two systems"

Live demo to Angela, showing the pipe end-to-end:

> "I'm going to my recording application. So let's say I'm recording a video here. And [I] just go over to AWB and I've got inputs. [—] What we do is we send it to AWB. That's what we will be doing really soon. I've sent it, and now **this application just got: hey, just received new data from FliHub.** In the future, that'll say, hey, just received new data from [Signal] Studio."
> "**it's saving data in real time as we do stuff. And this is important because we can have [it] going directly back into Signal Studio.**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-13-0457-planning-moments-that-matter-workflow-and-shift-system.md`

Later the same morning, the multi-tenancy realisation:

> "when we look at incident registry, it's probably important to understand that **workflows can be for different applications.** So new incident intake and moments that matter are for Signal Studio, **whereas YouTube launch optimizer is a different application. It's coming from FliHub.**"
> "it was getting unwieldy — it probably needs improvement. **It doesn't have any concept that there are two systems, one called Signal Studio and one called FliHub. Doesn't have any idea that FliHub would generally be using YouTube launch optimizer** [—] There's big problems with the API integration."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-13-0722-awb-integration-and-ui-cleanup-for-signal-studio.md`

And the startup problem — FliHub as one of several always-on local apps:

> "I've got apps that I run all the time. **FliHub, FliGen** — and they're not so much FliGen, I haven't yet made that a practical application. **FliDeck. [Deck]hand maybe. Thumb[rack] probably.** And various other applications are going to kick in very soon. **And what I need is much better start up capability.**"
> "I just need to [be able to] run [a] skill and say, **I need a new application running. And it's gotta deal with the port [conflicts]. The fact that it should probably, unless you're developing it, probably only have one instance at a time. Have the ability to just start it, have it pop up in a browser**, all those sorts of things."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-13-0244-planning-better-app-startup-workflow.md`

*(This is the direct answer to the 10 March "it started off on 5173, then I killed that, and now it's 3001" complaint.)*

## Mar 16 — Relay is named, and S3 is killed

Working with Jan over a screenshare:

> "this is [the] software that we're looking at now [—] called **SyncThing** [—] It will instantaneously and automatically transfer files, kind of like Dropbox, between two computers on a network. You just put the file into the folder. It does it. **So you know this shite we've been doing with the s3 buckets with FliHub? It'll be a much different process — including I could send you all the videos. And that's why I wanted it.**"
> "I product [—] **What would be a really good name for that folder if it's between two people on the network?** [—] it's about synchroniz[ing] in a staging sort of system or a temporary or a temporal point of view. What would you call this folder? It's gonna be hanging off the root. We already have `dev` for development."
> "**Relay. Relay. Let's go with Relay.**"
> "Let me just explain the relay mechanism. So David will share with Jan and vice versa. And when I say share, **think of it as a common pool — like we both had access to the same hard drive.** David will share with Jan. David will share with Mary. Mary will share with Jan. Jan will share with Mary."
> "If this works — yeah, it has a problem, [—] because **if you delete a file, you delete it off my machine.**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-16-0727-team-experiments-with-syncthing-and-ansible-setup.md`

This is the death of S3 staging as FliHub's collaborator-delivery mechanism, and the birth of the Relay folder. It is stated as a FliHub problem being solved by a non-FliHub tool.

## Mar 18–20 — Ambient

> "Two things for us to be working on tomorrow while I'm on the bus if possible. Will be **FliHub and the Fruit Juice menus.**"
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-18-1402-planning-work-on-juice-menus-tomorrow.md` *(passing mention — a reminder to Jan, no substance)*

> "I'll be doing is looking at this fly video changes [—] **fly[hub] FliHub changes.** [—] He did a sync[thing] peer to peer dropbox. Wanted to do it back on the main computer, not on the MacBook. **We need to build the code and send the files from the m4 mini through to the [remote machine].** So that's something that we've got to talk about. But I don't know when we're doing that one either."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-20-0936-appydave-website-revamp-and-content-strategy.md`

## Mar 31 — Relay hardens into a skill

FliHub is not named, but this is the relay's follow-through and matters to the rebuild:

> "**the Relay folder** [—] is then made up of subfolders that actually represent the **private peer to peer Dropbox sort of systems**. So when you're registering something, [you're] really registering a new peer to peer [—] there's the location. And then it's about discover[y] as to which people [are] needed or which machines."
> "**whatever skill you create, they will have access to the same skills. So it's kind of like a skill that operates both sides of the folder syncing structure.**"
> "we don't store Relay folders into the `repos.jsonl`. Though I'm starting to get the impression that I probably need to have some sort of similar process in the future."
> — `/Users/davidcruwys/dev/raw-intake/omi/2026-03-31-0745-designing-json-structures-for-syncthing-skills.md`

---

# Part 2 — Themes

## A. What FliHub IS (said, not inferred)

| Phrasing | Date | File |
|---|---|---|
| "It's video editor software" | Mar 1 | `2026-03-01-1050-lars-reviews-agentic-os-mesh-and-micro-apps.md` |
| "It's my video editing software" | Mar 1 | `2026-03-01-1132-user-outlines-project-theodore-agentic-os-roadmap.md` |
| "FliHub is my video recording software" | Mar 1 | `2026-03-01-1104-lars-plans-project-theodore-collaboration.md` |
| "my recording application" | Mar 13 | `2026-03-13-0457-planning-moments-that-matter-workflow-and-shift-system.md` |
| "some of the micro applications are purely for me. They include FliHub" | Mar 1 | `2026-03-01-0113-david-outlines-agentic-os-tasks-and-shop-kpis.md` |
| "I designed it because I wanted to save videos, and I wanted to talk to them" | Mar 1 | `2026-03-01-1050-…` |

The last line is the deepest one in the era. Not *manage* videos. **Save them, and talk to them.** Everything March adds — the API, the skill, the publish button, the chapter payload — is "talk to them" growing teeth.

## B. Wants (what he asked for)

**Recurring across the era (asked more than once):**

1. **A visible "new data has arrived" indicator when FliHub sends into a workflow.** Mar 3 (×2, one of them explicitly "the second or third time I've asked"), Mar 13 (working, demoed). Recurrence is the point.
2. **Resume-at-position, not restart-at-zero, when FliHub data lands mid-workflow.** Mar 3, Mar 10, Mar 11.
3. **Send *transcripts*, concatenated, not per-file SRT.** Mar 9 (bug), Mar 10 (schema), Mar 12 (field names).
4. **Chapter data with timestamp + chapter name + anchoring text.** Mar 10 ("first 50 words"), Mar 10 (folder-number/folder-name split → chapter number/name), Mar 12 (schema interrogation ×3).
5. **Fewer, better data views — "the table one's probably the best".** Mar 6, Mar 11.
6. **A copy-to-clipboard button on transcript/modal views.** Mar 12 (×2, explicitly "I asked this three times").
7. **AppyStack upgrade for FliHub/FliDeck/FliGen.** Mar 11.

**Keyboard / hardware-control wants (flagged separately as requested):**

- **StreamDeck pedal drives Ecamm record start/stop/pause/resume** — left button = record toggle (multi-action, with a wait for the recording to finalise), right button = pause/resume. `2026-03-05-0017-planning-ecam-live-automation-and-video-content.md`. Attempted and broken on `2026-03-05-0101-debugging-ecamm-live-recording-and-pedal-setup.md` ("it only records for two seconds and then it stops").
- **Escape closes modals.** Asked twice in the era: `2026-03-04-0400-prototype-workflow-ux-improvements-and-feature-ideas.md` ("I can't press escape to close it") and `2026-03-09-1426-mixed-media-clips-and-ux-tooling-discussion.md` ("why doesn't the escape allow it to close down again?").
- **Ecamm Live driven by API/skill rather than by hand** — the record trigger as a programmable surface. `2026-03-04-0708-planning-ecamm-live-integration-skill.md`, `2026-03-05-0017-…`.
- ⚠️ Most March keyboard talk is **not** FliHub: a hotkey to launch his `scc` screen-capture CLI without opening a terminal (`2026-03-06-0740-…`), and a `Cmd+Shift+D` hijack by WhisperFlow (`2026-03-17-0301-…`). Logged so a rebuild doesn't over-read them.

**Visualisation wants (flagged separately as requested):**

- **DX/UX highlighter toggles** — two buttons that *only* outline which on-screen controls are "pilot" (end-user) vs "engineer" (developer) surfaces, without changing app state. He built this deliberately as a QA lens and it regressed. `2026-03-11-1233-user-reviews-flihub-workflow-ux-and-bugs.md`, `2026-03-12-1423-user-reviews-transcript-ui-and-dx-controls.md`.
- **"How should FliHub chapters be displayed? A text area, or something even more fancy?"** — an open invitation, never resolved in this era. `2026-03-12-1448-planning-flihub-chapters-display-and-schema-updates.md`.
- **Side-by-side comparison tables** for transcript-vs-abridgment accuracy checks; Markdown output preferred over JSON. `2026-03-12-1456-…`.
- **Hover parity** — outputs reveal data on hover, inputs must too. **Colour-coded interpolated values** so they read differently from literal inputs. `2026-03-12-1535-…`.
- **JSON editor components instead of plain textareas**, downgrading gracefully to a textarea with a "this is JSON" visual hint until the component exists. `2026-03-03-0321-…`.
- **Horizontal/vertical orientation toggle** for step/station workflow diagrams; left/right arrows at *both* top and bottom; a taller, cleaner progression bar with thinner borders. `2026-03-04-0400-prototype-workflow-ux-improvements-and-feature-ideas.md`. *(AWB, not FliHub — but it is the clearest statement of his diagram taste in the era.)*
- **Consolidate three data views to two.** "Nested and flat don't really add much value." `2026-03-06-0740-…`, `2026-03-11-1233-…`.

**One-off but significant:**

- Chapter data emitted as JSON, with the first ~50 words of each chapter's real transcript as a search anchor (`2026-03-10-1340-…`).
- Auto-commit on inbox/asset changes so Jan can pull without being asked (`2026-03-12-0159-…`).
- A one-command app launcher that handles port conflicts and single-instance, and pops the browser (`2026-03-13-0244-…`).
- A durable scratch-pad / backlog document inside the repo, so knowledge doesn't live only in a chat window (`2026-03-10-1204-…`).
- "Don't call it FliHub — just call it `video`" — domain-named contracts (`2026-03-12-1414-…`).

## C. Complaints (friction, verbatim-anchored)

**The big one — manual chaptering.** The most emotionally loaded FliHub-adjacent complaint in the whole era:

> "it's so damn slow. If you get a one hour video, this literally takes two hours to do because you gotta watch the video. It's just so fucking horrible. I hate this whole process."
> `2026-03-10-1340-improving-video-chaptering-workflow-from-transcripts.md`

**Data loss on send.** "I've often got a go to the workflow engine hit refresh, then I've lost the data. Then I've gotta go back to FliVideo, press send again." (Mar 3) → still wrong on Mar 11 ("I got to step four. I hit resume. I clicked jump, but I think I went back to step three").

**Asked three times, still not done.** Two separate instances in nine days: the arrival indicator ("this is the second or third time I've asked you to develop it", Mar 3) and the copy button ("I asked this three times. Look at this shit.", Mar 12). Both are *small* UI affordances. **(inference)** the pattern is that low-glamour affordances get dropped by whoever is implementing, and he notices every time.

**SRT is structurally unreliable.** Per-video SRTs start at zero, don't reflect the edit, and (from two years of prior experience) LLMs can't cleanly separate timestamp from text. `2026-03-10-1331-…`, `2026-03-10-1340-…`.

**Chapter boundaries don't match recording boundaries.** "Quite often, what happens is I cross chapter boundaries — I might start early or keep going." `2026-03-10-1331-…`.

**S3 staging is the wrong delivery mechanism.** Said twice, four days apart: "I found the s3 layer no good because it's a staging area, and then you lose it once it's gone" (Mar 12) and "you know this shite we've been doing with the s3 buckets with FliHub?" (Mar 16). **This is a recurring, resolved-by-replacement complaint** — the Relay exists because of it.

**Nobody knows what state the repo is in.** "So what the hell is going on in this repository?… It started off with initial on 5173, and then I killed that. And then it's now 3001." / "Where is the knowledge of what you're doing other than this conversation being kept?" `2026-03-10-1204-…`.

**Scroll traps in textarea-heavy views.** "unless you're right on an edge, you can't scroll the main window because scrolling actually scrolls the text areas themselves." `2026-03-11-1233-…`.

**Full-bleed modals read as pages.** "all the way to the edge makes it [so] you don't know that you've gone into a modal dialogue." `2026-03-06-0740-…`.

**Opaque long-running work.** "you never give me any [progress]. I don't know whether you're progressing… I don't have any faith that it's working even if it is working." `2026-03-11-1038-…`.

## D. Direction changes

1. **FliHub becomes a producer, not just an organiser.** The publish/send button, the local HTTP API, and the `flihub` Claude skill turn it into the upstream of the AWB YouTube Launch Optimizer. Mar 2 sets the mission; Mar 3 demos it working; the rest of the month is schema and reliability. (`2026-03-02-1052-…`, `2026-03-03-0555-…`)

2. **Chapters are promoted from a naming convention to a first-class exported entity** with a schema, field names, and a consuming prompt. The folder-number/folder-name convention is re-read as chapter-number/chapter-name, and the question "what if chapter number is missing?" becomes a real product question. (`2026-03-10-1524-…`, `2026-03-12-1406-…`)

3. **Collaborator delivery moves S3 → Git → SyncThing/Relay.** Mar 12 he says it "has to be option a" (Git, with a Signal-Studio-style push/pull notification banner). Mar 16 he sees SyncThing and switches again, naming the folder Relay on the spot. (`2026-03-12-0159-…`, `2026-03-16-0727-…`)

4. **The send-to-workflow button gets abstracted into a pattern** and immediately cloned into SupportSignal for incident dispatch. FliHub becomes a *reference implementation*. (`2026-03-09-0847-…`)

5. **Multi-tenancy arrives on the downstream side.** AWB must know that workflows belong to different source applications — FliHub owns YouTube Launch Optimizer; Signal Studio owns New Incident and Moments That Matter. (`2026-03-13-0722-…`)

6. **FliHub is queued for an AppyStack platform upgrade** alongside FliDeck and FliGen — the first hint that the current codebase is considered legacy. (`2026-03-11-0435-…`)

7. **FliHub becomes multi-user.** "Jan is using FliHub as well. He has access to FliHub." (`2026-03-12-0159-…`)

## E. Adjacent apps — is FliHub the hub?

**In March 2026, FliHub is *not* framed as the hub of a suite.** It is framed as *one micro-app among four*, all built on AppyStack, all writing to the local filesystem — and it happens to be the one he uses most and the one that got real first.

> "the micro apps that I wanna build, I've got four at the moment: FliHub, FliDeck, FliGen, Storyline, and I've got a bunch more coming — [they] are all going to be built on appy stack."
> `2026-03-01-1132-…`

| App | Relationship implied | Source |
|---|---|---|
| **AWB / Agent Workflow Builder** | The dominant relationship of the era. FliHub is AWB's **upstream data producer**; AWB owns the workflow, YAML, schemas, prompts. Half of every "FliHub" conversation in March is really about this seam. | `2026-03-03-0321-…`, `2026-03-12-1414-…`, `2026-03-13-0722-…` |
| **YouTube Launch Optimizer / FliLaunch (as an AWB workflow)** | FliHub's *sole* downstream workflow in this era — "FliHub would generally be using YouTube launch optimizer". It lives inside AWB, not as its own app yet. | `2026-03-02-1052-…`, `2026-03-13-0722-…` |
| **FliDeck** | Sibling. "my slide deck generation software" / "where I visualize a lot of stuff you might see in a BMAD". Run in the same terminal tab as FliHub. Same AppyStack upgrade batch. | `2026-03-01-1104-…`, `2026-03-12-0721-…`, `2026-03-11-0435-…` |
| **FliGen** | Sibling, admittedly not yet real: "not so much FliGen. I haven't yet made that a practical application." Twelve generative-media tools; more reusable/productisable than FliHub. | `2026-03-13-0244-…`, `2026-03-01-0113-…` |
| **Storyline** | Sibling. "more for movies and stuff like that." | `2026-03-01-1104-…` |
| **Ecamm Live** | **Upstream of FliHub** and the era's biggest integration push — reverse-engineer its HTTP API + plist config, drive it from a StreamDeck pedal and a Claude skill. FliHub watches what Ecamm produces. | `2026-03-04-0708-…`, `2026-03-05-0017-…`, `2026-03-09-0203-…` |
| **DeckHand** | The Ecamm/StreamDeck control layer — a sibling app that would *trigger* the recordings FliHub then catches. | `2026-03-05-0017-…`, `2026-03-10-1453-…` |
| **Signal Studio / SupportSignal** | Not in the video suite, but the **architectural donor**: its Git push/pull notification banner is what David wants for FliHub↔Jan, and its incident dispatch copies FliHub's publish button. | `2026-03-12-0159-…`, `2026-03-09-0847-…` |
| **ThumbRack** | Named as one of the apps he "probably" runs all the time, and in the AppyStack upgrade conversation. No FliHub relationship stated. | `2026-03-13-0244-…`, `2026-03-11-0435-…` |
| **Nano Banana** | Image generation, delegated to Jan. FliHub's `assets`/`inbox` folders are the proposed hand-off surface — David drops structured JSON + prompts, Jan generates, images come back into the project. | `2026-03-12-0159-…` |
| **SyncThing / Relay** | The transport that replaces S3 for shipping FliHub video projects to Jan and Mary. Named on Mar 16. | `2026-03-16-0727-…`, `2026-03-31-0745-…` |
| **AppyStack** | The platform. FliHub is its origin story ("I designed it because I wanted to save videos") *and* on its upgrade backlog. | `2026-03-01-1050-…`, `2026-03-11-0435-…` |
| **POEM** | Appears only as mangled residue of the old button name ("send to poem void"), renamed to AWB on Mar 9. | `2026-03-09-0957-…` |
| **AngelEye** | Discussed in March (session/workspace observability) but **not** connected to FliHub, other than an observation that FliHub/FliDeck/FliGen/Storyline share one terminal tab. | `2026-03-12-0721-…` |
| **FliBrief, FliVoice, Teletubby, Hyperframes** | **Not present in the March corpus.** ("AppyVoice" is named once as a bad placeholder name for a future voice app — `2026-03-01-0113-…`.) |

**Verdict on "hub":** in March, the hub of the ecosystem is the **AppyStack + local filesystem + Claude harness**, not FliHub. FliHub is the *first citizen* — the app that proved the pattern and the one that feeds the others. **(inference)** The rebuild's naming pressure ("FliHub" implies centrality) is not what the March voice supports; the March voice supports "the video project's source of truth, with an API".

---

# Part 3 — What a rebuild should take from this era

1. **The North Star sentence is already written**: *"I designed it because I wanted to save videos, and I wanted to talk to them."* Capture, then converse.
2. **Chaptering is the pain worth spending the rebuild on.** Two hours per one-hour video, done by watching. Everything else in March is plumbing by comparison.
3. **The export contract is the product surface.** Field names, formats, and which prompt consumes them are things David personally interrogates. Version it, name it `video` (not `flihub`), and make it introspectable from inside the app.
4. **Transcripts beat SRTs** for chapter derivation — SRTs are zeroed, unedited, and confuse models. Emit chapter = `{number, name, timestamp, first ~50 words of real transcript}`.
5. **Small affordances are load-bearing**: arrival banners, copy buttons, escape-to-close, hover parity, non-trapping scroll. He asks three times and remembers.
6. **The DX/UX highlighter toggle is a genuine David invention** and should survive the rebuild as a first-class dev lens, not a debug flag.
7. **Delivery to Jan/Mary is Relay (SyncThing), not S3.** With a Signal-Studio-style "source/target has changed" banner in the top-right.
8. **One-command start, port-managed, single-instance, browser pops.** He said it flat out on Mar 13 and had complained about it on Mar 10.

---

*Report generated 2026-08-26 from OMI transcripts. All quotes verbatim from the cited files, with `[bracketed]` insertions only where speech-to-text dropped a word and the sense is unambiguous. No quote has been composited from two places.*
