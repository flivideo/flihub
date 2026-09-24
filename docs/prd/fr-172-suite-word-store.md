# FR-172 — Read the Suite Word Store for the Whisper Prompt

**Status: Pending — ticket only (2026-09-24), not authorised to build.**
**Priority: LOW — for the rebuild.** FliHub is slated for rebuild (B475); do this there, or
here only if the rebuild slips and the vocabulary gap starts costing transcripts.

## Why

The suite now has one word store, owned by fli-core and written only by FliStudio. FliHub still
builds its Whisper initial prompt from its own `glingDictionary`, so a word David adds in
FliStudio never reaches FliHub's transcripts. This is the dictionary gap FR-169 flagged.

## The store (fli-core v0.11.0, tag `c5465c3`)

- `readWords({ globalFile, brandRoot, projectDir })` reads and layers three files:
  - global: `~/.config/appydave/fli.words.json`
  - brand: `v-<brand>/fli.words.json`
  - project: `<project>/fli.words.json`
- `vocabularyOf(words)` turns the result into the vocabulary list.
- FliHub's global list was already imported into `v-appydave/fli.words.json` (22 names; `sadf`
  and `ab` dropped). FliHub's own files were not touched.

Cite fli-core for the file shape and layering; don't restate it here.

## The change

1. Bump `@flivideo/core` to `v0.11.0` in `server` + `shared` (currently `v0.6.0`); check the
   lockfile resolves to `c5465c3` (see AGENT-NOTES, pin bumps).
2. In `server/src/routes/transcriptions.ts` (the `whisperInitialPrompt` built from
   `config.glingDictionary`), build the prompt from `vocabularyOf(readWords(...))` instead.
   Resolve `projectDir` and the brand root from the **job's video path**, not the active
   project (same reason as FR-109: the user can switch projects mid-queue).
3. `glingDictionary` (global config + per-project state) becomes **read-only legacy**: keep
   reading/showing it where it is shown today, stop treating it as the transcription source,
   and add no new writes.

Worth knowing: today the prompt uses only the **global** `glingDictionary`; the per-project
dictionary (FR-118) never reached Whisper. The store's project layer fixes that for free.

## Out of scope

- Any word-fixing / word-editing UI in FliHub (David). FliStudio is the only writer.
- Word-level timestamps — that is FR-169.
- Migrating or deleting FliHub's `glingDictionary` data.
- Gling export (`routes/edit.ts`) — it still merges `glingDictionary`; revisit in the rebuild.

## Done when

- A word added to any of the three `fli.words.json` layers appears in the logged
  `Initial prompt:` line for a take in that project, and FliHub writes none of those files.
- A test covers prompt construction from a temp global/brand/project store.

## Cross-references

- FR-169 (dictionary gap noted): [fr-169-word-level-timestamps.md](fr-169-word-level-timestamps.md)
- B584: transcription moving to a shared FliTools service — if that lands first, the prompt
  belongs there and this ticket shrinks to "stop sending `glingDictionary`".
