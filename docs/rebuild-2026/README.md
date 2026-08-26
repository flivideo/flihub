---
title: FliHub Rebuild 2026 — audit index
created: 2026-08-26
origin: Captain's Log capture B475 (2026-08-26 07:11)
---

# FliHub Rebuild 2026

Everything here was produced on **2026-08-26** in response to capture **B475**, in which David set out to
rebuild FliHub over many sessions — each session doubling as a video build-out — and asked for a deep
audit first:

> "To rebuild something you have to understand the problems you're going into when you build it... you can
> look for bugs if they matter, but it's more architectural flaws than bugs — the bugs don't matter, the
> architectural flaws do matter."

---

## Read in this order

| # | Document | What it is |
|---|---|---|
| 1 | **[NORTH-STAR.md](NORTH-STAR.md)** | What FliHub is for, what it is not, and the commitments the rebuild must honour. **§1 and §2 are load-bearing; §9 needs David's rulings.** |
| 2 | **[REBUILD-ROADMAP.md](REBUILD-ROADMAP.md)** | The long-horizon plan, as a season of episodes sized to one build session = one video. |
| 3 | **[NARRATION-GUIDE.md](NARRATION-GUIDE.md)** | For using the app and narrating it — B475's second input stream. What to notice, what to test, what only David can answer. |
| 4 | **[DEAD-ENDS-AND-PAIN.md](DEAD-ENDS-AND-PAIN.md)** | 64 dead ends, 46 pivots, 65 pain signals across all 203 commits. B475's *"stuff we built and never really used."* |
| 5 | **[audit/live-app-findings.md](audit/live-app-findings.md)** | 14 findings from the **running** app, each verified against source. The most immediately checkable. |

---

## The audit corpus

### Commit archaeology — all 203 commits, 2025-12-13 → 2026-04-16
Six agents, one per era. Feature ledger, dead ends, pivots, pain signals, architectural moments.

- [era-1-genesis](audit/archaeology/era-1-genesis.md) — the founding bet: *filesystem is the database, filename is the primary key*
- [era-2-expansion](audit/archaeology/era-2-expansion.md)
- [era-3-industrialisation](audit/archaeology/era-3-industrialisation.md) — *"the tooling was ceremonial; the refactoring it accidentally forced was the real deliverable"*
- [era-4-ralphy-campaigns](audit/archaeology/era-4-ralphy-campaigns.md) — peak velocity, 92 commits in March
- [era-5-relay-and-manage](audit/archaeology/era-5-relay-and-manage.md) — *two incompatible sync systems that don't know each other exists*
- [era-6-storage-and-stall](audit/archaeology/era-6-storage-and-stall.md) — **why the repo went silent**

### Architecture — five strands, each adversarially verified
- [server-http](audit/architecture/server-http.md) · [verified](audit/architecture/server-http-verified.md)
- [server-domain](audit/architecture/server-domain.md) · [verified](audit/architecture/server-domain-verified.md)
- [client-state](audit/architecture/client-state.md)
- [client-data](audit/architecture/client-data.md) · [verified](audit/architecture/client-data-verified.md)
- [contracts](audit/architecture/contracts.md) — *"`shared/` is not a contract layer"*

### Intent — what FliHub is FOR (the half no code audit reaches)
- [voice-era-1-pre-march](audit/intent/voice-era-1-pre-march.md) — bespoke workbench, justified by throughput
- [voice-era-2-march](audit/intent/voice-era-2-march.md) — becomes the upstream data producer
- [voice-era-3-post-april](audit/intent/voice-era-3-post-april.md) — **narrows to one job.** The North Star sentence is here.
- [ecosystem-contracts](audit/intent/ecosystem-contracts.md) — *"FliHub is already a service"* — six live HTTP consumers
- [pipeline-position](audit/intent/pipeline-position.md) — *"the take vault between the camera and the editor"*

### Product & documentation
- [product/surface-inventory](audit/product/surface-inventory.md) — 12 tabs, 13 modals, ~1,770 LOC wired to nothing
- [product/design-history](audit/product/design-history.md) — two generations of design, zero design system
- [documentation/doc-sprawl-and-drift](audit/documentation/doc-sprawl-and-drift.md) — 236 files, 46% campaign exhaust
- [documentation/requirements-ledger](audit/documentation/requirements-ledger.md) — **seven ledgers, none agreed**
- [dead-surface](audit/dead-surface.md) — 2,748 dead LOC, and the shadowed route

---

## The five things to know

1. **The stall was a decision, not exhaustion.** On **2026-04-12**, four days before the last commit,
   a full rebuild spec was commissioned. Everything after that date was work on an app already
   condemned.

2. **Do not use the April specs as the build brief.** `docs/prd/flihub-v2-requirements.md` and
   `flihub-baku-spec.md` (2,423 lines) say *"replicate faithfully, don't strip features"* — the
   opposite of B475. They were generated from 50 commits when the repo had 193. **Mine them for the
   feature inventory only.**

3. **FliHub is already a service.** Six systems call it over HTTP; it calls two more outbound. The
   contract was never written down anywhere that holds.

4. **Three vague complaints turned out to have exact mechanical causes.** "Rename feels untrustworthy"
   → the preview and the writer use different sanitisers (L12). "The theme needs a consistency pass"
   → 153 elements apply a class that emits no CSS (L14). The whisper binary path keeps needing fixing
   → the config writer silently drops the key (L15/Finding 1).

5. **The keyboard layer was designed in January 2026 and never built.** `design-3 Command Palette
   Minimal` is already the spec.

---

## Method, and its limits

- **27 agents** across two workflows (discovery: 22, intent: 5), plus direct work against the running app.
- Every architecture strand was **adversarially verified** by a second agent instructed to refute it.
  That pass corrected counts downward (89→83, 86→84, 12→11) and **killed 4 sub-claims** in the server-domain
  strand alone. One of the main session's own early hypotheses — that seven socket listeners were dead —
  was refuted: six of the seven are emitted through a config-table indirection that literal grep cannot see.
- **What this audit did not do:** it did not run the test suite, did not exercise the app through the UI
  beyond read-only screenshots, and did not test the multi-machine relay against Jan's or Mary's machines.
  Claims about runtime behaviour derived from source are marked as such in each report.
- The working tree had **uncommitted changes** to `ProjectListToolbar.tsx`, `projectFilters.ts` and its
  test throughout. Findings touching those files are flagged as needing a re-check against a clean tree.
