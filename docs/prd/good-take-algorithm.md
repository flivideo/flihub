# Good Take Detection Algorithm

## Purpose

Automatically identify the "best take" and "good take" from multiple recordings in the incoming files list, so the content creator can quickly focus on the right file.

---

## Current Implementation (v1)

**Location:** `client/src/App.tsx` - `useMemo` for `bestTakePath` and `goodTakePath`

### Algorithm

```
score = (normalizedSize × 0.4) + (normalizedRecency × 0.6)
```

- `normalizedSize`: (fileSize - minSize) / (maxSize - minSize) → 0 to 1
- `normalizedRecency`: (timestamp - minTimestamp) / (maxTimestamp - minTimestamp) → 0 to 1

### Display Rules

| Rank  | Color     | Condition                                               |
| ----- | --------- | ------------------------------------------------------- |
| Best  | 🟢 Green  | Highest score                                           |
| Good  | 🟡 Yellow | 2nd highest, IF score ≥ 0.4 AND score ≥ bestScore × 0.5 |
| Other | ⬜ White  | Everything else                                         |

### Edge Cases

- 0 files → no highlights
- 1 file → green only
- 2+ files → green always, yellow conditional

---

## Problem Case #1: Small Recent Files Beat Large Earlier Files

**Date:** 2025-11-29

**Raw Data:**

```
Ecamm Live Recording on 2025-11-29 at 09.17.22.mov
  Size: 40.5 MB
  Timestamp: 29/11/2025, 11:33:39

Ecamm Live Recording on 2025-11-29 at 14.00.34.mov
  Size: 1.2 MB
  Timestamp: 29/11/2025, 14:00:40

Ecamm Live Recording on 2025-11-29 at 14.00.40.mov
  Size: 1.2 MB
  Timestamp: 29/11/2025, 14:00:47
```

**Scenario:**
| File | Size | Timestamp | Expected | Actual |
|------|------|-----------|----------|--------|
| ...09.17.22.mov | 40.5 MB | 11:33:39 | 🟢 Best (or 🟡 Baseline) | ⬜ None |
| ...14.00.34.mov | 1.2 MB | 14:00:40 | ⬜ Junk | 🟡 Good |
| ...14.00.40.mov | 1.2 MB | 14:00:47 | ⬜ Junk | 🟢 Best |

**Analysis:**

- The 40.5 MB file is clearly the real recording (or at minimum, the baseline)
- The 1.2 MB files are tiny test recordings (6 seconds apart)
- Current algorithm: 60% recency weighting causes small recent files to win
- Size difference is 40x, but recency overcomes it

**Key Insight:** Even if we're still waiting for the "best" take, the 40.5 MB file should be highlighted as the current best/baseline. The algorithm should recognize that we haven't recorded something better yet - just junk.

**User's Typical Pattern:**

1. Record a "baseline" video (good but not great) - often first/largest
2. Continue recording attempts until getting a great take
3. Great take is usually later AND reasonably large
4. Junk takes are small (aborted recordings)
5. Sometimes the best take hasn't happened yet - baseline IS the current best

**Expected Color Distribution (top to bottom by time, oldest first):**

- 🟡 Yellow/Orange: Baseline (first substantial file, fallback option)
- ⬜ White: Middle attempts / junk
- 🟢 Green: Best take (large AND late) - OR baseline if nothing better exists

**The Baseline Concept:**

The "baseline" is the first substantial recording - it's the fallback if later attempts don't work out. It should always be highlighted (yellow/orange) unless:

1. A later file is both large AND recent (then baseline becomes yellow, later becomes green)
2. The baseline is the only substantial file (then it's green - it's the best we have)

**State Machine:**

```
Single substantial file     → Green (it's the best/only real take)
Baseline + junk only        → Baseline = Green (still the best)
Baseline + better take      → Baseline = Yellow, Better = Green
Multiple substantial files  → Latest large = Green, First large = Yellow
```

---

## Potential Solutions

### Option 1: Flip the Weights

```
score = (normalizedSize × 0.6) + (normalizedRecency × 0.4)
```

**Pros:** Simple change
**Cons:** May not handle edge cases, still linear combination

### Option 2: Minimum Size Threshold

```
if (fileSize < THRESHOLD_MB) excludeFromBestTake = true
```

**Pros:** Filters obvious junk
**Cons:** What's the right threshold? Varies by content type

### Option 3: Size Ratio Dominance

```
if (largestFile.size > secondLargest.size × RATIO) {
  largestFile = bestTake // regardless of recency
}
```

**Pros:** Handles extreme size differences
**Cons:** Doesn't help when sizes are similar

### Option 4: Exponential Moving Average (EMA/EWMA)

Formula from trading/statistics:

```
EMA_t = α × value_t + (1 - α) × EMA_(t-1)
```

Where α (alpha) is the smoothing factor (0 < α ≤ 1)

- Higher α = more weight to recent values
- Lower α = more weight to historical values

**Adaptation for our use:**

- Could weight recency using exponential decay
- Recent files get bonus, but it decays rather than being linear
- Handles the "session" concept naturally

### Option 5: Session-Based Grouping

```
if (timeBetweenFiles > SESSION_GAP_MINUTES) {
  // Treat as separate recording sessions
  // Best take calculated within each session
}
```

**Pros:** Matches real workflow
**Cons:** More complex, need to define session boundaries

### Option 6: Hybrid Approach (Recommended)

Combine multiple signals:

1. **Size gate:** Files < 5 MB cannot be "best take" (junk filter)
2. **Size ratio:** If one file is 5x+ larger than median, strong bonus
3. **Recency within session:** Only apply recency bonus to files within 30 min of each other
4. **EMA for recency:** Exponential decay instead of linear

---

## Trading/Statistics Formulas Reference

### Exponential Moving Average (EMA)

```
EMA_today = (Price_today × α) + (EMA_yesterday × (1 - α))
α = 2 / (N + 1)  where N = number of periods
```

### Weighted Moving Average (WMA)

```
WMA = Σ(weight_i × value_i) / Σ(weight_i)
```

Weights typically: most recent = N, second = N-1, etc.

### Time-Decay Weighting

```
weight = e^(-λ × time_difference)
```

Where λ controls decay rate. Larger λ = faster decay.

---

## Test Cases to Validate

### Case 1: Baseline + Junk Only (Current Problem - 2025-11-29)

**Real data from today**

```
File A: Ecamm...09.17.22.mov  40.5 MB  11:33:39  (baseline - real recording)
File B: Ecamm...14.00.34.mov   1.2 MB  14:00:40  (junk - 6 sec test)
File C: Ecamm...14.00.40.mov   1.2 MB  14:00:47  (junk - 6 sec test)
```

**Expected:** A = 🟢 Green (baseline is still best, no better take exists)
**Current:** A = ⬜, B = 🟡, C = 🟢 (WRONG - junk files winning)

### Case 2: Baseline + Better Take Arrives

```
File A: 40 MB, 11:00 (baseline)
File B: 1 MB, 11:30 (junk)
File C: 1 MB, 11:35 (junk)
File D: 35 MB, 12:00 (better take - almost as big, more recent)
```

**Expected:** D = 🟢 Green (best), A = 🟡 Yellow (baseline/fallback), B/C = ⬜ White

### Case 3: Baseline + Multiple Improvements

```
File A: 30 MB, 10:00 (baseline)
File B: 5 MB, 10:15 (junk)
File C: 25 MB, 10:30 (decent)
File D: 28 MB, 10:45 (best - similar size to baseline but more recent)
```

**Expected:** D = 🟢 Green, A = 🟡 Yellow (baseline), C = ⬜ White (middle), B = ⬜ White (junk)

### Case 4: All Similar Size (recency should win)

```
File A: 20 MB, 10:00
File B: 22 MB, 10:15
File C: 21 MB, 10:30
```

**Expected:** C = 🟢 Green (most recent, similar size), A = 🟡 Yellow (baseline)

### Case 5: First Take is Best (decreasing quality)

```
File A: 50 MB, 10:00 (nailed it first time!)
File B: 30 MB, 10:20 (tried again, worse)
File C: 10 MB, 10:40 (gave up)
```

**Expected:** A = 🟢 Green (largest by far), B = 🟡 Yellow (fallback), C = ⬜ White

### Case 6: Single File

```
File A: 25 MB, 10:00
```

**Expected:** A = 🟢 Green (only file = best file)

### Case 7: Two Junk Files Only

```
File A: 1.5 MB, 10:00
File B: 1.2 MB, 10:01
```

**Expected:** A = 🟢 Green (slightly larger), B = ⬜ White
**Note:** Even junk needs a "best" for workflow, but no yellow needed

### Case 8: Baseline Still Recording (work in progress)

```
File A: 40 MB, 10:00 (baseline)
File B: 2 MB, 10:30 (aborted)
-- user is currently recording File C --
```

**Expected:** A = 🟢 Green (current best, waiting for better)
**Note:** This is Case 1 - baseline should be green until something better exists

---

## Implementation History

| Version | Date       | Changes                                   | Result                             |
| ------- | ---------- | ----------------------------------------- | ---------------------------------- |
| v1      | 2025-11-29 | Initial: 40% size, 60% recency            | Failed Case 1 - junk beat baseline |
| v2      | 2025-11-29 | Baseline-aware logic, <5MB junk threshold | Pending verification               |

### v2 Algorithm (commit db85daf)

```
1. Separate files into "substantial" (≥5MB) and "junk" (<5MB)
2. If no substantial files: most recent junk = green, others white
3. If substantial files exist:
   - Baseline = first substantial file (by timestamp)
   - Best take = most recent substantial file
   - If baseline == best take: green only
   - If baseline != best take: best = green, baseline = yellow
4. All junk files = white (never highlighted)
```

---

## Notes

- The creator's workflow often involves a "baseline" recording followed by improvement attempts
- Junk files are typically very small (aborted recordings)
- The "best" take is usually both reasonably large AND later in the session
- Need to handle edge case where first take is actually the best (diminishing returns)
- Consider three-tier display: Best (green), Baseline/Good (yellow/orange), Other (white)

---

## Questions to Resolve

1. What's a reasonable "junk threshold" in MB? (5 MB? 10 MB?)
2. What defines a "session"? (30 min gap? Same day?)
3. Should we show three tiers (Best/Baseline/Other) or two (Best/Good)?
4. Should baseline (first large file) always get highlighted even if not best?
