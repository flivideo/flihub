# FliHub Voice Corpus — Era 3: April → August 2026 ("after the code stopped")

**Scope**: Plaud + OMI wearable transcripts, `2026-04-01` → `2026-08-26`.
**Corpus**: `/Users/davidcruwys/dev/raw-intake/plaud/` and `/Users/davidcruwys/dev/raw-intake/omi/`.
**Files read**: 13 that name FliHub directly + 9 adjacent-concept files (Teletubby, Ecamm, hyperframes,
Gling, micro-app launch) that carry FliHub intent without naming it. 22 total.
**Why this era matters**: the last FliHub commit lands 16 Apr 2026. Everything after it is intent with
no implementation pressure on it — what David *wants* the thing to be, said out loud, unpolluted by
what the codebase already does.

---

## Transcription health warning (read this before trusting any quote)

These are speech-to-text transcripts from a Plaud/OMI wearable in a room with fans, a second speaker
(Jan, on a video call, Philippines line) and a lot of app names the recogniser has never heard.
Recurring manglings I confirmed by cross-reference:

| Mangled as | Almost certainly |
|---|---|
| `FlyHub`, `fly hub`, `flyhub`, `fli hub` | **FliHub** |
| `Glean`, `Glyn`, `Bling`, `green g li in g dot ai` | **Gling.ai** (the video-cutting SaaS) |
| `jacquard`, `jack-out`, `flockard`, `jump jump jump` | **Jaccard** (similarity score) |
| `Captcha` (in "Captcha is definitely Ecamm Live") | **capture** |
| `Potbox API`, `V-box API`, `inbox API` | unresolved — likely **Ecamm/Dropbox** or FliHub's inbox |
| `Kibernesis`, `carbonaski`, `carbon ASCII` | **Kybernesis** |
| `Van Dam`, `Dammit`, `DAMMIT` | David's own jokey names — **not** ASR errors |
| `beach sheet` | **beat sheet** |
| `type of frames`, `Piper frames`, `hyper frames` | **Hyperframes** |
| `talent` | genuinely his word — he adopts it deliberately mid-conversation |

Where a passage stays ambiguous after cross-reference, I say so inline rather than guess.

---

## Chronological walk

### 1 Apr 2026 — FliHub gets a one-line definition, in passing
*Source: `omi/2026-04-01-1324-david-refines-relay-folder-naming-conventions.md`*

The conversation is about relay-folder naming, not FliHub. But David drops the cleanest short
definition in the corpus while sorting apps from projects from people:

> "FliHub is a very special internal project in which FliHub is my video editing platform, appydave
> happens to be one of the brands that we would use with it. We haven't got the others set up at all.
> And it's so that I can share video files between Jan and myself. David was a test of kind of an
> internal person to person system."

Two things are load-bearing here. **(a)** He calls it a *platform*, and *brand-scoped* — AppyDave is
one tenant, others are anticipated and unbuilt. **(b)** The relay/sync layer exists **for Jan**, and
he classes it as a *test* of a person-to-person system, not as FliHub's purpose.

Same day he says FliHub was the *first* thing he tested agent-to-app communication on:

> "paper clip is no good. Paper clip is where we've one of the areas we've tested it, but it's not
> even the first area We've tested with FliHub ahead of anything."

And, in the companion file, a naming confusion that never gets resolved:

> "when it comes to putting the folders as an actual label because I had a confusion between, well,
> is FliHub or is it FliHub?"
> — `omi/2026-04-01-1446-discussing-relay-setup-and-folder-labeling.md`

(ASR has flattened both spellings to the same token; the real question was almost certainly
`flihub` vs `fli-hub` vs `FliHub` as a folder label. **Inference**, flagged.)

### 11 Apr 2026 — FliLaunch is carved *out* of FliHub, and FliHub's player is the prior art
*Source: `omi/2026-04-11-0921-youtube-launch-optimizer-application-requirements.md`*

Five days before the last commit, David specs the YouTube Launch Optimizer (FliLaunch). The
significant thing for this audit is *what he points at as the reference implementation*:

> "if you ever looked at the FliHub video, general tool, we have this wonderful and you can go and
> look up that application. Got this wonderful video playback capability with transcript and
> highlighted keywords. Well, we almost want the same sort of thing. But we will have the full video
> this time. It's an even better experience than what we get in FliHub."

This is the **only unambiguously affectionate thing he says about any existing FliHub screen in the
entire era**. The transcript-synced player with highlighted keywords is the one feature he cites as
worth copying. It's also, in the same breath, the thing FliLaunch is going to do *better* — the
chapter-validation loop (click a chapter → jump 10s before the timestamp → nudge ±30s) is explicitly
the FliHub player plus full video.

Note also what leaves FliHub here: chapters, YouTube titles, thumbnails, descriptions, publishing.
He tells the agent to audit "capabilities already present in the current YAML workflow system,
FliHub, and FliGen thumbnail generator". **Inference**: April is the month FliHub stops being
"everything a video needs" and becomes a stage in a pipeline.

---

### **[16 Apr 2026 — last commit. Silence in the code. Not in the corpus.]**

---

### 13 / 29 Jun 2026 — FliVideo as a *product grouping*, and the micro-app registry problem
*Sources: `omi/2026-06-13-0615-...`, `omi/2026-06-29-1137-...`*

Only passing mentions, but they set up an August theme. On naming levels:

> "Naming levels: **individual names** (Lexi = an agent), **concept** (librarian = a concept…),
> **product grouping** (flivideo)."
> — `plaud/2026-07-20-1212_thread_appydave-plugins-marketplace-namespacing.md`

And on hosting the whole micro-app fleet:

> "when you think about it, micro-applications. And the reason you want to keep a registry is where
> are they on the computer, but also where the… ports are so if you started one what port would it
> run on… I've got these apps that I want to build and I want to turn them into extensions… Based on
> stuff I've already done, like Angelai, happy radar. Fly video, storyline out."
> — `omi/2026-06-29-1137-building-app-extensions-recipes-and-a-monetization-strategy.md`

FliVideo/FliHub is now one row in a fleet table, alongside AngelEye and AppyRadar.

### 4 Jul 2026 — kill the Gling dependency (complaint #1 of the era)
*Source: `omi/2026-07-04-1240-researching-open-source-ai-video-editing-alternatives.md`*

> "in the next couple of dates I'm about to get charged money for green g li in g dot ai and I
> haven't been using Bling for a few months so I don't really want to re start the subscription
> especially Usually if there is an open source project out there that I can edit videos with using
> a gintick sort of structure."

and the scope limit that matters for the rewrite:

> "I'm really, it's only just about cutting videos. I don't really do much more than cutting, mainly
> because I'm going to move into hyperframes for the actual video editing… enhancement aspect"

He also names the knowledge home: "could have been documented into the brain as **video as code**".

### 11 Jul 2026 — FliHub should be able to *drive* other apps
*Source: `plaud/2026-07-11-1627-07-11-turning-gling-ai-into-a-programmable-tool-in.md`*

Same Gling frustration, different attack. The complaint is a UI complaint, and it is the single most
transferable sentence in the era:

> "I never liked using Glean because I never liked using a user interface I would prefer that the
> control of the user interface would have been better off dealt with if I could have done it all
> from Claude code or a lot from Claude code like it even a paired partnership arrangement would
> have been a great experience"

> "copying and pasting this stuff is a pain in the arse you forget to do it"

And then the want, stated as a FliHub capability:

> "the third point would be I should be able to from my FlyHub application where I might record a
> video I should be able to have it open up Glyn with a little bit of direction from me… all sorts
> of other controls would be able to build on it and the automations just to make my life as a video
> editor easier that would be the main goal"

**(a) SAID**: FliHub should hand off *into* the editor, not just export files at it.
**(b) COMPLAINED**: GUIs he can't drive from an agent are a tax.

### 11 Aug 2026 — the snippet-assembly want, and "vibe directing"
*Source: `plaud/2026-08-11-1205-2026-08-11-120508.md`* (team call with Jan and Mary)

FliHub is named once, teaching Jan how to record a demo:

> "if you could have recorded it as 20 seconds of snippets and then go to another area and record
> another 20 seconds of snippets and then use something like fly hub to combine them all together
> yet yeah it would save a lot of time for you you can make it look beautiful because he can can
> have a nice scene around it"

This is the **first appearance in the era of FliHub-as-assembler** — many short takes → one video —
and it is offered to a *collaborator*, not to himself. It recurs on 16 Aug and 19 Aug.

The rest of the call is the architectural idea he later formalises. On the Image Drip UI:

> "all the fields are horrible to use… the whole user experience needs a heck of a lot of cleanup and
> improvement I also think it needs to work from the idea that **they all move as one piece**"
> "you can't just move them one at a time and it's a very complex wordy screen"

and the pattern:

> "**Vibe directing is really just an application that does things by a human, Give it some API calls
> to automate it and then give it a little chat bot the ability to talk to those API's and then they
> can do it on your behalf.**"

**Inference**: this is the shape he will demand of the FliHub rewrite eight days later — it becomes
"one API, n unprivileged clients" on 19 Aug.

### 14 Aug 2026 (09:26) — "the next few applications I make… are really just redoing FlyHub"
*Source: `plaud/2026-08-14-0926-2026-08-14-092618.md` (~2h 11m, team call)*

Watching Hyperframes auto-edit Joy's nail-salon videos, he sees the beat sheet and immediately maps
it onto FliHub:

> "imagine if we took van dam which is the idea of dropping a roll and b roll and tag it all
> appropriately and then we take it to the next level of fly fly hub fly video right and it says
> okay here's the stuff we can get here's a beach sheet generated let's build a video off it"

Then the direction statement:

> "**I think the next few applications I make over the next couple of months are really just redoing
> FlyHub, redoing this joy footage, calling it Van Dam, using agents wherever possible and making it
> so that you and Mary can use them and because it's all automation.**"

Note who the users are: *"making it so that you and Mary can use them."* The remote-editor concern
survives the four-month silence.

Jan's reply names the asset-reuse want:

> "we just gonna have any asset management and just in one place so We don't have to regenerate
> everything… not from scratch"

And David places FliHub as the *renderer* end of a chain:

> "it all gets stored into van dam some of it gets… created in image strip gets stored in van dam…
> it gets used in hyper frames generation right which might be fly hub fly video might be something
> else don't know"

**Direction change**: FliHub stops being the place assets live (that becomes Van Dam / DAMMIT) and
starts being the place a video is *assembled*.

### 14 Aug 2026 (12:52) — origin story + the clearest historical purpose statement
*Source: `plaud/2026-08-14-1252-2026-08-14-125226.md` (business direction call, Kybernesis)*

> "that movie trailer, Abbey Dave and the 555 Manifesto, came about from a manifesto that I built in
> ChatGPT three years ago that said, could you create five channels and build, create videos on
> autopilot across five niches?… I thought the answer is automating YouTube. That's where the answer
> is. **So over that period of time I created FlyHub which is my Ecamm automation tool** and I
> created Storyline app which was what we used for that movie."

That is the historical North Star in one clause: **FliHub is the Ecamm automation tool**, born of a
goal to put video production on autopilot.

He also settles, in this call, that video automation is his *niche* — the reason a rewrite is worth
doing at all:

> "if I get back into videography as an application development using agents, I can then touch on all
> these areas that agents can do well"
> "The problem, I don't build tools consistently, I do it in a very haphazard fashion."

That last line is **(b) a complaint about himself**, and it is arguably the reason four months of
silence happened.

### 16 Aug 2026 — record-in-segments, and the "script sheet"
*Source: `plaud/2026-08-16-0652-2026-08-16-065230.md`*

> "**I'm going to record my video using FlyHub, FlyVideo, and I'm going to have all these little
> partial segments of different areas that I'm talking about in the video.**"

And the upstream artifact he wants generated *before* recording:

> "the script is just a bunch of words you're going to say then the **script sheet** should also have
> all those different visual elements… so that when I do talk to them… I already got the data ahead
> of time I can generate a visualisation edit for that particular video"

> "The reason these little infrastructures in the script are really important is that we can then use
> hyperframes to generate video edits on top of each of these snippets"

**Inference**: the segment boundary is not an editing convenience, it's the *join* between script,
recording and overlay generation. One paragraph = one take = one overlay target.

### 19 Aug 2026 (07:13) — Teletubby is born; FliHub is named as its recording half
*Source: `plaud/2026-08-19-0713-2026-08-19-071329.md`*

The three-column teleprompter concept, and the reason it needs FliHub:

> "should I be able to see the main points of the topic in our column yes should I be able to see the
> sub points in a column yes should I be able to see the paragraph of the transcript that I'm looking
> at yes in another column because I think what will happen when I do my recordings is that I might
> pause between paragraphs… **that's where FlyHub comes in because each paragraph or section that you
> talk about might be recorded and then stopped and so yeah there's individual video recordings
> created and then they all get combined together at the end**"

The naming and the honest reason for the project:

> "I want to name this project **Teletubby** because… I wanted to be a open source teleprompter system…
> but my biggest problem is because **my memory is going I can't hold recited sentences in my head**
> and that's why I need this tool to be honest"

And the want that will land back on FliHub four hours later:

> "what the reality of my life… is that I fuck up all the time and there's got to be learnings within
> those fuck ups… the AI needs to learn from that and say David you waffle here"

### 19 Aug 2026 (07:38) — **the definitive purpose statement**, and take-scoring
*Source: `plaud/2026-08-19-0738-2026-08-19-073856.md` (~1h 17m, with Jan; two Claude sessions + a chaperone running)*

An agent had written a concept doc claiming FliHub does capture. David corrects it, and in correcting
it produces the single best description of FliHub in the entire corpus:

> "I just want to give clarity around FlyHub. You're right that it doesn't own Captcha [capture], but
> you're still wrong conceptually. **So Captcha is definitely Ecamm Live. Why? Because firstly it can
> record videos, it can also hook into a stream deck so we can change scenes. I run it, I drive it
> personally from a foot pedal. So I start and I stop. The moment I stop it goes into a folder and
> that's the moment that FlyHub kicks in. It captures it and puts it into a queue of videos when
> there's none. It creates one in the queue. And I might not like that video so I'll record another
> one and another one and another one. and this is what FlyHub does really well It captures all that
> then when I ready I pick one of them and I say promote it it becomes the the project video… it goes
> into a specific subfolder and file name and that's it.**"

> "normally this is a **watcher application**. It watches the EKM [Ecamm] folder and it routes and
> then other tabs in that application do different things."

The session's own summary, banked as a correction:

> "Ecamm captures foot pedal stream depth [deck]. **FlyHub watches the folder, routes each take into
> the video's queue, holds every attempt, and you promote one.**"

That is the North Star sentence. Everything else in FliHub is a tab.

Meanwhile, the take-scoring work is being done *outside* FliHub, on 45 recorded takes, with Jaccard
similarity used as a read-vs-improvise detector:

> "clip 98 had a one every distinct word… he read it the improvised though is between 13 and 19…
> about 15% of the combined vocabulary was shared same topic different words he was talking not
> reading **that gap is what made it a usable mode detector**"

> "if you've got a transcript and you speak something and you've got a point five says well what did
> you just say you want it to be 0.9 or higher because you go well that's pretty much the transcript
> just in your own words"

And the finding that surprised him (cadence, not vocabulary):

> "**I speak in 11 word things and he writes in seven word things** oh my gosh so I read it's a cadence
> issue"

The rewrite is announced explicitly, as a suite:

> "**We're going to rebuild FlyHub, we're going to build Teletubby We're going to build something to
> work with Hyperframes, but it's probably going to be called Van Dam**… We're going to create Dammit
> and Dammit is going to be digital asset management to the cloud… these little applications we're
> going to build… we're just going to order [auto?] automate our video pipeline"

Also in this session, the architecture rule he wants enforced — read out of the `drivable` skill and
endorsed:

> "External control surface one API, n clients so many clients, user interface, command line
> interface model context protocol interface are **equally unprivileged adapters holding no business
> logic**… **the capability living in the user interface process is not extendably reachable so script
> editing can't be a button that also contains the logic**"
> "**an agent can call a destructive [action] 50 times in three seconds and safety is not optional
> that's directly why you flagged versioning**"

And the capability inventory that mentions FliHub's neighbours — this passage is ASR-mangled and I
will not over-read it:

> "this is where I've built a service oriented architecture listing 36 capabilities… we got really
> good transcription that can use both grok and MLX… **It's measured where FlyHub is, it's got the
> denoising, that's the deep filter. Diarisation, SNR and VAD**… Beat mechanics is how should the
> videos look when they're edited, cut. We got audio editor video use. Okay flyhub duplicate is the
> shape Reported 22 files as there are 26 yet still blocking the oracle"

The last sentence is unrecoverable; I flag it and move on. The recoverable claim is that transcription
(MLX ~5× realtime local, Groq ~20×), denoise (DeepFilterNet 3), diarisation, SNR and VAD all now exist
as capabilities *around* FliHub that FliHub does not yet use.

### 19 Aug 2026 (09:32) — the pipeline map, and the take-scoring want landing on FliHub
*Source: `plaud/2026-08-19-0932-2026-08-19-093226.md`*

Jan opens by reciting the pipeline back — this is **the content pipeline map**, in a collaborator's
words, unchallenged by David:

> "and then we're gonna have the script or the wording and then after that is gonna be the teletubby…
> then after the teletubby you're gonna record in eCAMP [Ecamm] and **then the flyhub collects all the
> takes and we're gonna select or we're gonna choose on that or promote them or that take** and then
> we're gonna transcribe it or… the audio cleanup if we needed and then we're gonna have the analysis
> of it or some feedback about it about the take and after that we can do the video editing with
> hyperframes"

David then makes the two biggest concrete asks of the era.

**(1) Transcribe at queue time, not at promote time — so an agent can score the take.**

> "**transcription does not happen until you place the video you like into the fly hub project that's
> going to change because firstly I think transcription should happen the moment the video hits the
> queue because there's a lot of stuff the agents could do in fly hub to decide which is the better
> video**"

> "currently we use deterministic decisions to decide what the best video is… have you ever noticed
> Jan that when I record four or five takes but some of them are gray some of them are green and one
> of them is green and one of them is yellow… **this is deterministic meaning it reads things like I'm
> going to give a probability score that something is good if it's the last one the latest I'm gonna
> get rid of stuff that's just short right I'm gonna look at the length of them**"

> "**but if we got the transcript on each recording… you ever notice me say fuck it… that's signal
> that something is not quite right and if you've got the transcript the agent can see that signal and
> go well that's probably a bad take and tag it straight away**"

This is a **direct complaint about the existing colour-coding heuristic** (length + recency) and a
direct replacement design (transcript-derived signal + Jaccard fidelity against the script).

**(2) Teletubby ↔ FliHub as an event bus, not an embed.**

> "**Teletubby shouldn't be storing the videos because that's fly hubs job but Teletubby should be able
> to read and be told as an event that hey new video hit fly hub in queue it's been transcribed by
> FlyHub here's the transcript** you can now compare what was just recorded with what the transcript
> is… and this is where the what we call it the flockard [Jaccard] score… it could over time learn the
> frustration yeah he just keeps falling over this same word… I will suggest that we change this word"

> "**the Teletubby application can receive events from Flyhub but the Teletubby agent can decide what
> to do with those events**"

**(3) Inline trimming and per-take overlay suggestions inside FliHub.** This is new scope, and he
argues himself into it live:

> "**in FlyHub we don't do hyperframes or editing we just do joining and then we export through to
> Glean. But there's a lot of stuff you could edit directly in FlyHub.**"

> "I go well that's shit because of the way I started it right but… If I loved that video but it's
> crap at the beginning, can I say no, I want to publish it so it becomes 3-1-overview… and then I
> have some agents that can look at individual videos and suggest, do you just want to clean this up
> while you're here? **We could cut that one segment at the beginning and have a clean thing ready
> directly in Flyhub.**"

> "**we could have a little panel over on the right of that one video that says, do you want a beat?
> Do you want something for hyperframes overlays? And you go, yeah, I do… They give me three different
> sorts**"

And the closing architectural framing:

> "there's a **full pipeline of different applications and agents that the applications need to talk to
> each other in the pipeline, but the agents fit with inside the application or with inside the scene**"

> "**we're going to rebuild fly hub from ground up anyway**"

The rest of the session is Teletubby's North Star interview, but two rulings transfer directly to
FliHub. On who decides: **"the talent"** —

> "I've got to be careful that we're writing this for the North Star… **the talent gets the choice**"

On the recurring keyboard/layout want:

> "you need to be able to get to them and **you probably need a little bit of keyboard control around
> going to different stuff**"

> "**this is also an area where the placement of the teleprompter application itself needs to be
> flexible… the layout is subordinate to where the camera is**"

### 20 Aug 2026 — the agent roster forms around the apps
*Sources: `plaud/2026-08-20-0752-...`, `plaud/2026-08-20-0954-...`*

> "Kyber Studio is now sitting with Challenge DV and Brandy. And what I want to bring in is Teletubby
> and Vicky I think. So **Teletubby will be our transcript agent. Vicky will be our video editor.**"

> "This would be so cool if we could just have conversations with Teletubby. That's the idea right Go
> to Teletubby and talk to this one and **it just controls it**"

And a small, sharp UI complaint that generalises to every app he builds:

> "**When I change a trigger word on your advice you currently have to restart the app to see it. That
> kills the loop**"

### 21 Aug 2026 — live overlays during recording (the "no post-production" dream)
*Source: `plaud/2026-08-21-0911-2026-08-21-091101.md`*

> "I took the bare hands stuff… put it into the **alpha channel** on Ecamm Live so it just works…
> it's just ProRes 4444… I realized **you could do the same thing with hyperframe and hyperframe does
> better graphics for telling a story**… It's not post. If you're doing a live video. You can do it
> with hyperframes"

> "I can sit right next to my camera so it looks like my eyes are looking straight at the camera but
> it's just like that far away from it… it's like a teleprompter but it's **driven by my hand** and so
> I can see that we can firstly **do real time videos to a transcript and as you're talking have
> hyperframes or bare hands showing visually on the screen**"

**Direction change (candidate)**: some of what FliHub currently does *after* recording, he now wants
to happen *during* recording, in Ecamm's alpha channel.

### 22 Aug 2026 — agents are top-level, not sub-agents
*Source: `plaud/2026-08-22-0708-2026-08-22-070833.md`*

> "we got Teletubby agent we should be working with… I'm testing this other idea… which is **agent to
> micro app communication**"

> "We've got another agent that could be on the list called **Vicki. She's the video editor. She's
> essentially going to be working with the video as code and video editing as code brains** to help
> with the creation of video content this is… overlays and video editing"

> "**None of them are sub-agents really. These are all top-level agents. They have real roles in the
> organization**"

### 25 Aug 2026 — how do you even start one of these apps?
*Source: `plaud/2026-08-25-0806-2026-08-25-080609.md`*

Not FliHub-specific, but it's the fleet-level friction FliHub sits inside:

> "**I wanted to start up Teletubby so what do I do I personally would go to the directory where it is
> then I go into Claude mainly because I don't know how to start it and I just asked for to start it
> but now I run into a problem because I've started it within Claude I've wasted a lot of tokens it's
> been really slow. I should just be able to say start Teletubby** and the start should either be a
> cold start if it's not running or it should be a activate if it is running"

> "**how do we close down Teletubby? Yeah, this is part of the problem I end up with these
> applications.** Like what is a close, is close a hidden but still running or is it a complete
> shutdown"

### 26 Aug 2026 (07:11) — B475: the brief that launched this audit
*Source: `plaud/2026-08-26-0711-2026-08-26-071136.md`*

> "Let's have a conversation about FlyHub. FlyHub, I'm going to use it today and I'm going to talk
> about it as I use it. So we're going to absorb a lot of context from that. **But the goal is that
> we're going to rewrite it.**"

> "**to rebuild something you have to understand the problems you're going into when you build it**"

The instruction that defines this audit's shape:

> "**When you go through all the commits a lot of the stuff that you're going to be looking for is all
> the little keyboard controls and enhancements and the visualizations and the different stuff I
> wanted to work get the application doing. You'll probably see the dead-edge, the stuff that we went
> out and built and never really used it wasn't that effective or useful.**"

> "you can look for bugs if they matter but it's more architectural flaws and bugs because… **it's
> gonna reveal that the bugs don't matter but the architectural flaws do matter**"

> "I'd love a deep understanding of this application **from visual design to code architecture to what
> problems does it solve, to how we're going to build a North Star for it**. And part of it will come
> from deep dive investigation, so part of it will just come through from me using it and telling you
> about the problem. Or telling you about the experience"

He also frames the rewrite as *content*:

> "we'll probably do it over many sessions. Because I'll probably do it as a video build out… when I
> do videos around the sessions, they are section by section so I'll [want] a video for each area"

> "I need a lot of design documents… **visual design documents so that we can do slash design or we
> could do Claude design so we can build out what we think this application is going to be**"

---

## Themes

### A. The North Star sentence exists, verbatim, and it is short

> "Ecamm captures. FliHub watches the folder, routes each take into the video's queue, holds every
> attempt, and you promote one." (19 Aug, paraphrased back to him and banked as a correction)

Everything else — transcripts, chapters, images, thumbnails, inbox, relay — is a *tab*. He said this
himself: **"normally this is a watcher application… and then other tabs in that application do
different things."** The rewrite's hardest editorial decision will be which tabs survive that
sentence.

### B. The recurring want, said four separate times: **many takes → one video**
- 11 Aug: "record it as 20 seconds of snippets… use something like fly hub to combine them all together"
- 16 Aug: "all these little partial segments of different areas that I'm talking about"
- 19 Aug 07:13: "each paragraph or section… recorded and then stopped… they all get combined together at the end"
- 19 Aug 07:38: "I'll record another one and another one and another one… I pick one of them and I say promote it"

This is the *only* want he restates in four different conversations to two different audiences. It
is the app.

### C. The recurring complaint: **deterministic take-picking is guessing**
The colour coding (grey/green/yellow) he describes as "deterministic meaning it reads things like…
if it's the last one… get rid of stuff that's just short… look at the length." He does not say it's
broken. He says it's *blind* — it has no idea what was said. The fix he specifies is concrete and
cheap: transcribe on arrival in the queue, not on promotion, then let signal (swearing, restarts,
Jaccard fidelity against the script) do the scoring.

**Cross-era note for whoever assembles the three reports**: this is the same complaint family as the
"rename tools feel untrustworthy" thread in the project memory — *the app decides something about my
file and I can't see why*. If eras 1 and 2 carry it too, it is the highest-value finding in the audit.

### D. The recurring complaint: **UIs I can't drive from an agent are a tax**
- 11 Jul on Gling: "I never liked using a user interface I would prefer that the control of the user
  interface would have been better off dealt with if I could have done it all from Claude code"
- 11 Aug on Image Drip: "all the fields are horrible to use… it's a very complex wordy screen"
- 11 Aug, the pattern: "vibe directing… give it some API calls to automate it and then give it a
  little chat bot the ability to talk to those API's"
- 19 Aug, the rule: "one API, n clients… UI, CLI, MCP are equally unprivileged adapters holding no
  business logic… **script editing can't be a button that also contains the logic**"
- 20 Aug: "when I change a trigger word… you currently have to restart the app to see it. That kills
  the loop"

For the rewrite this is not a nice-to-have: it is a **hard architectural constraint he has already
ruled on**, with a safety rider ("an agent can call a destructive [action] 50 times in three seconds
and safety is not optional — that's directly why you flagged versioning").

### E. Keyboard control and visualisations — the things B475 explicitly asks to recover
Direct hits in this era are thin, because he wasn't in the app:
- "you probably need a little bit of keyboard control around going to different stuff" (19 Aug)
- "layout is subordinate to where the camera is" — panes/zones the operator can rearrange (19 Aug)
- The one visualisation he praises: FliHub's **transcript-synced player with highlighted keywords**
  (11 Apr) — "this wonderful video playback capability"
- The visualisation he wants added: a **beat sheet you approve before rendering** — "if that was
  visualized you approve it. No actually I want a different B here" (14 Aug 12:52)
- The visualisation he wants per-take: a right-hand panel offering "do you want a beat? do you want
  something for hyperframes overlays?… give me three different sorts" (19 Aug 09:32)

**The commit-log mining pass is where the keyboard controls actually live.** This era confirms *that
he wants them back*, not *what they were*.

### F. Direction changes across the four months

| Was | Became | When / evidence |
|---|---|---|
| FliHub = "my video editing platform" that also shares files with Jan | FliHub = **Ecamm take-queue + promote**, one stage in a named pipeline | 1 Apr → 19 Aug |
| FliHub owns chapters, titles, thumbnails, description | those leave to **FliLaunch**; FliHub keeps the player pattern | 11 Apr |
| FliHub owns assets (images, thumbs) | assets leave to **Van Dam / DAMMIT**; FliHub keeps recordings | 14 Aug |
| FliHub joins clips, then exports to **Gling** for cutting | Gling dependency to be killed; **light cutting moves into FliHub**, heavy editing to **Hyperframes** | 4 Jul → 19 Aug |
| Transcription happens on promotion | transcription happens **on arrival in the queue**, to enable scoring | 19 Aug |
| FliHub is a web app you open | FliHub is one of a **fleet of micro-apps** with a registry, ports, start/stop/activate semantics | 29 Jun → 25 Aug |
| The operator is David | the operator is **"the talent"** — David, Alex (AITLDR), Angela (Kybernesis), Joy | 19 Aug |

### G. Adjacent apps — is FliHub the hub of a suite, or one app among many?

**Answer from this era: one app among many, in a suite it no longer names.** The word "hub" is doing
no work by August. FliHub sits mid-pipeline between Teletubby and Hyperframes, with Van Dam beside it
and FliLaunch after it. Agents (Teletubby, Vicky, Captain's Log) are described as *top-level*, above
the apps — so the orchestration layer is agents, not FliHub.

| App | Relationship implied | Source |
|---|---|---|
| **Ecamm Live** | Upstream. Owns capture, scenes, Stream Deck, foot pedal. "Captcha is definitely Ecamm Live" | 19 Aug 07:38 |
| **Teletubby** (new) | Upstream. Teleprompter/script. Sends David to record; receives FliHub take-events back | 19 Aug ×3, 20–22 Aug |
| **Hyperframes** | Downstream. Beat sheets, overlays, motion. "In FlyHub we don't do hyperframes or editing" | 14 Aug, 19 Aug |
| **Van Dam / DAMMIT** (new) | Beside. Video/digital asset management. Takes the asset role off FliHub | 14 Aug, 19 Aug |
| **Gling.ai** | Downstream, **being evicted**. "we just do joining and then we export through to Glean" → wants agentic cutting instead | 4 Jul, 11 Jul, 19 Aug |
| **FliLaunch** | Downstream. Chapters/titles/thumbs/description/publish. Copies FliHub's player and betters it | 11 Apr |
| **FliGen** | Referenced as the existing thumbnail generator to audit for reusable capability | 11 Apr |
| **Storyline** | Sibling from the same 555-Manifesto origin; used for the movie trailer | 14 Aug 12:52 |
| **Image Drip** (new) | Beside/upstream. Image set generation; source of UI-design lessons | 11 Aug, 14 Aug |
| **Kyber Studio / Eve** | Agent control plane the micro-apps get driven from | 20–22 Aug |
| **Captain's Log** | Where FliHub ideas get captured (B420/B421/B432/B437/B475) | 19–25 Aug |
| **Samantha / voice agent** | Adjacent; a video *about* it is to be recorded using FliHub | 16 Aug |
| **AngelEye, AppyRadar, AppyStack** | Fleet peers in the micro-app registry, no video relationship | 29 Jun |
| **POEM / ALS** | Not mentioned in this era's FliHub-relevant files |

### H. What is conspicuously *absent* from four months of thinking

Worth stating, because absence is evidence for a rewrite's scope:

- **The relay / Jan-and-Mary sync layer** is named once, on 1 Apr, and described as a *test*. It
  never returns in any August conversation, even though Jan is on nearly every call. When he does
  think about Jan and Mary in August it is *"making it so that you and Mary can use them"* — i.e.
  they should run the apps, not receive files from them.
- **Chapters, thumbnails, YouTube description, the inbox** — all absent after 11 Apr, all now
  belonging to FliLaunch or Van Dam.
- **Shadows / transcripts-for-collaborators** — absent.
- The **naming convention itself** (`{chapter}-{sequence}-{name}-{tags}.mov`) survives only as a
  passing reference — "3-1-overview" (19 Aug 09:32). He does not complain about it and does not
  defend it.

**Inference, flagged as inference**: the four-month silence may be evidence in itself. The parts of
FliHub he never thinks about while away from the keyboard are the parts to put on the chopping block
first — but confirm against era 1 and 2 before cutting anything, because "he stopped talking about
it" and "it works so well it's invisible" look identical from here.

---

## Files consulted

**Named FliHub (13)**
- `omi/2026-04-01-1324-david-refines-relay-folder-naming-conventions.md` — substantive
- `omi/2026-04-01-1446-discussing-relay-setup-and-folder-labeling.md` — brief, naming confusion
- `omi/2026-04-01-1550-david-and-lars-set-up-relay-and-plugins.md` — passing (relay folder label only)
- `omi/2026-04-11-0921-youtube-launch-optimizer-application-requirements.md` — substantive
- `plaud/2026-07-11-1627-07-11-turning-gling-ai-into-a-programmable-tool-in.md` — substantive
- `plaud/2026-08-11-1205-2026-08-11-120508.md` — one FliHub line + heavy UI/vibe-directing context
- `plaud/2026-08-14-0926-2026-08-14-092618.md` — substantive
- `plaud/2026-08-14-1252-2026-08-14-125226.md` — substantive (origin story)
- `plaud/2026-08-16-0652-2026-08-16-065230.md` — substantive
- `plaud/2026-08-19-0713-2026-08-19-071329.md` — substantive (Teletubby)
- `plaud/2026-08-19-0738-2026-08-19-073856.md` — **richest file in the era**
- `plaud/2026-08-19-0932-2026-08-19-093226.md` — **second richest** (pipeline map + take scoring)
- `plaud/2026-08-26-0711-2026-08-26-071136.md` — B475, the rewrite brief

**Adjacent concepts, no FliHub token (9)**
- `omi/2026-06-13-0615-ai-native-factory-apps-and-recipe-based-builders.md` — "fly video" passing
- `omi/2026-06-29-1137-building-app-extensions-recipes-and-a-monetization-strategy.md` — micro-app registry
- `omi/2026-07-04-1240-researching-open-source-ai-video-editing-alternatives.md` — kill Gling
- `omi/2026-08-01-1223-designing-a-data-driven-storytelling-and-automation-pipeline.md` — heavily
  garbled (multi-speaker café audio, ASR collapses into "See you next time" loops); usable only for
  the "data lake → presentation/story/remotion/hyperframe" framing. Low confidence.
- `plaud/2026-07-20-1212_thread_appydave-plugins-marketplace-namespacing.md` — "flivideo" as product grouping
- `plaud/2026-08-20-0752-2026-08-20-075258.md` — Teletubby A/B/C cadence, restart-to-see-changes complaint
- `plaud/2026-08-20-0954-2026-08-20-095434.md` — agent roster (Teletubby, Vicky)
- `plaud/2026-08-21-0911-2026-08-21-091101.md` — live alpha-channel overlays
- `plaud/2026-08-22-0708-2026-08-22-070833.md` — agents are top-level
- `plaud/2026-08-25-0806-2026-08-25-080609.md` — micro-app start/stop friction
