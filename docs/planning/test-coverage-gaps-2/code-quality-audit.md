# Code Quality Audit — test-coverage-gaps-2

## Production Changes Reviewed

- `server/src/utils/chapterExtraction.ts` — `export` keyword added to three previously private functions:
  - `normalizeText(text: string): string`
  - `calculateSimilarity(text1: string, text2: string): { combined, trigram, jaro, dice }`
  - `findMatchInSrt(chapterText, segments, excludeSegments, skipFirstWords): ... | null`

---

## Grade: A

The production change is minimal and correct. Adding `export` to pure functions carries no risk beyond surfacing them in the public module API.

---

## Findings

### MINOR — `findMatchInSrt` exposes the internal `SrtSegment` interface indirectly

**Severity**: MINOR

`findMatchInSrt` accepts `segments: SrtSegment[]` as its second parameter, but `SrtSegment` is a file-private `interface` (not exported). Callers outside the file cannot type-annotate the `segments` parameter without casting or using `Parameters<typeof findMatchInSrt>[1]`. This does not prevent correct use — TypeScript will infer structurally — but it is an incomplete export surface. If test files need to construct `SrtSegment[]` objects directly, they must either use object literals that satisfy the shape or extract the type via `Parameters`.

**Fix**: Export `SrtSegment` alongside the functions, or define it in `shared/types.ts` if it needs to be shared more broadly. A simple `export interface SrtSegment { ... }` at line 31 is sufficient.

---

### MINOR — `MatchResult` interface is exported but inconsistently documented with `// Phase 3` inline comments

**Severity**: MINOR

`MatchResult` (line 264) is already exported. The `// Phase 3:` inline comments scattered through `calculateSimilarity` and `findMatchInSrt` reference a planning phase that is now complete. These are harmless but add noise for future maintainers who have no context for the phasing.

**Fix**: Low priority. Remove or consolidate the phase comments in a later housekeeping pass.

---

### MINOR — `findMatchInSrt` has O(n * m * k) nested search loops with no early exit on high-confidence match

**Severity**: MINOR (performance, not correctness)

The exact-phrase search block iterates over `startPositions` (3) × `wordCounts` (4) × `segments` (n). A 10-word exact match in segment 0 still continues iterating all remaining word-count combinations before the outer `startWord` loop exits, because the `return` exits only from the innermost `for (let i ...)` block — wait, actually looking again: `return` inside `if (segmentText.includes(searchPhrase))` exits the entire function immediately. The logic is correct. This is a non-issue.

*(Self-corrected: no action needed.)*

---

### INFORMATIONAL — `SIMILARITY_THRESHOLD` constant (line 233) is module-private but governs exported behaviour

**Severity**: INFORMATIONAL

`SIMILARITY_THRESHOLD = 0.6` is used inside the now-exported `findMatchInSrt`. Callers cannot inspect or override the threshold without reading source. This is intentional design for a single-user tool but worth noting if the threshold ever needs to be tunable (e.g., per-project config).

**Fix**: No action required now. If configurability is needed, thread it through `Config` in `shared/types.ts`.

---

### INFORMATIONAL — No FR annotation on the three newly exported functions

**Severity**: INFORMATIONAL

Per AGENTS.md convention (Key Convention #4): "Every piece of code introduced by a requirement gets a comment: `// FR-XXX: description`." The export additions were made to enable testing (NFR-146 / test-coverage-gaps-2 campaign), but no annotation was added to document why these functions are public.

**Fix**: Add a comment such as `// NFR-146: exported for unit testing` above each of the three export statements. One line each.

---

## Verdict

The production code change is clean and safe to build on. Adding `export` to three pure, stateless functions introduces no side effects and no internal state exposure. All three functions are deterministic (given the same inputs, produce the same output) and have no I/O or module-level mutation.

The one actionable finding (MINOR: `SrtSegment` not exported) could cause awkward type gymnastics in future tests that need to construct `SrtSegment[]` fixtures. It is worth a one-line fix in the next quality pass but is not a blocker.

The B038 relay collaboration campaign (rsync-based file sharing) is unaffected — `chapterExtraction.ts` is not in the relay path. Test suite health is sound.
