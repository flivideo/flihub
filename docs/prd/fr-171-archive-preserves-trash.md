# FR-171 — Archive Destroys `-trash/`: the Only Verb That Erases Recoverable Files Everywhere

**Status: Pending — write-up only (2026-09-06), not authorised to build.**
**Class: data-safety finding**, surfaced during the D02 freeze investigation (2026-09-06,
incident closed — nothing was lost, but the mechanism is real).

## The mechanism

Archive copies the whole project folder to `publishedPath` with
`HOLD_EXCLUDES = ['-trash/', 's3-staging/', '.DS_Store', '._*']`
(`server/src/utils/holdUtils.ts:11`), verifies, then deletes the local folder. `-trash/` is
excluded from the copy AND deleted with the folder — so archiving a project **permanently
erases its trash everywhere**, with no warning that this differs from every other verb.

Contrast the rest of the model, where trash is deliberately safe:
- FR-156 delete moves TO `-trash/` (recoverable by design).
- Empty-trash is explicit, button-only, safeDelete-guarded — there is no timer.
- Hold moves only heavy subfolders; `-trash/` stays local, intact.
- FR-152 project delete at least demands the typed confirmation code.

Archive quietly combines "don't copy it" with "delete the local", which is stronger than
empty-trash (that at least says the word "trash") — and the D01 case shows the stakes: six
mis-filed recording takes sat in a trash that one Archive click would have erased with no
prompt mentioning them.

## Live example (why this is not theoretical)

2026-09-04: D02's first six takes were recorded while d01 was still the active project,
discarded into `d01/-trash/` (151 MB). For two days those files were the only copies of that
footage. Archiving d01 in that window would have destroyed them silently.

## Fix shape (when approved — pick one, David's call)

1. **Copy trash too** — drop `-trash/` from the archive exclude list only (hold keeps it);
   trash travels to PUBLISHED with the project. Simplest; costs T7 bytes for junk.
2. **Warn + count** — before archive, if `-trash/` is non-empty, the confirm dialog states
   "N files (X MB) in -trash will be permanently erased" (the FR-156 honest-preview pattern).
3. **Both** — warn, with a keep-trash checkbox.

Related line for the same pass: the archive confirm currently says nothing about trash at
all — whatever is chosen, the dialog copy must name the trash outcome explicitly
(refusal-that-looks-like-success family, CLAUDE.md Operating Rules).

## Companion observation (recorded here so it isn't lost)

`.flihub-state.json` is tracked in the v-appydave repo but essentially never committed by
FliHub's own flows — during the freeze investigation, the only commit ever touching D02's
state file had committed it BARE while the on-disk file carried titles + dictionary. So for
state-file content, **absence-in-git and loss are indistinguishable**: state that is never
committed cannot be recovered or even proven to have existed. If the state file is to be a
durable record (titles, flags, future `ships` field per FR-168), something must commit it —
or its unrecoverability should be an acknowledged property.
