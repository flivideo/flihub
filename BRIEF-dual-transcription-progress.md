# Brief: Dual Transcription System with Progress Tracking

**Date:** 2026-01-03
**Context:** FliHub transcription improvements
**Target:** Requirements specification development

---

## Current State

### Transcription Performance Analysis
- **Analyzed:** 891 transcriptions from Dec 16, 2025 to Jan 3, 2026
- **Current Performance:** Local Whisper transcription takes ~1.36x video duration (clean average)
  - 30s video → ~41s transcription
  - 60s video → ~82s transcription
  - 5min video → ~7min transcription
- **Reliability:** 95% confidence interval: 0.71x to 2.01x video duration
- **Performance Degradation:** 42% slowdown observed over time (likely system resource contention)

### Existing Tooling
- **Analysis Tool:** `analyze-transcription.js` (throwaway, not in package.json or README)
- **Telemetry:** `server/transcription-telemetry.jsonl` (891 entries, needs archiving)
- **Summary Stats:** `server/transcription-performance-summary.json` (generated)

---

## Requirements Overview

### 1. Progress Bar System with Time Remaining

**Goal:** Provide real-time transcription progress feedback to users

**Current Gap:**
- No progress indication during transcription
- Users don't know how long transcription will take
- No way to estimate time remaining

**Desired Behavior:**
- Display progress bar when transcription starts
- Show estimated time remaining based on historical performance data
- Update progress in real-time (if possible from Whisper API)
- Use statistical model: Expected time = 1.36 × video_duration ± 0.32

**Technical Considerations:**
- Progress updates via Socket.io events
- Frontend component integration
- Fallback to estimated completion if real-time progress unavailable
- Handle outliers gracefully (very short videos have higher variance)

---

### 2. Dual Transcription System (Local Whisper + Groq API)

**Goal:** Run parallel transcription using both local Whisper and Groq API to compare speed and accuracy

#### 2.1 Groq Integration Research

**Source Project:** `/Users/davidcruwys/dev/tools/ito`

**Key Findings:**
- **SDK:** `groq-sdk: ^0.26.0`
- **API Key:** Requires `GROQ_API_KEY` in environment variables
- **Model:** `whisper-large-v3` (primary), `distil-whisper-large-v3-en` (optimized)
- **Audio Format:** 16kHz mono WAV optimal
- **Response Format:** `verbose_json` includes segments with `no_speech_prob` quality metric
- **Vocabulary Hints:** Supports custom vocabulary (224 token budget)
- **Performance:** Typically 1-2s for short audio (faster than local Whisper)

**Implementation Pattern (from ITO):**
```typescript
const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
const transcription = await groqClient.audio.transcriptions.create({
  file: await toFile(audioBuffer, `audio.wav`),
  model: 'whisper-large-v3',
  prompt: createTranscriptionPrompt(vocabulary),
  response_format: 'verbose_json'
})
return transcription.text.trim()
```

**Critical Files to Reference:**
- `/Users/davidcruwys/dev/tools/ito/server/src/clients/groqClient.ts` - Complete implementation
- `/Users/davidcruwys/dev/tools/ito/server/src/clients/groqClient.test.ts` - Test patterns
- `/Users/davidcruwys/dev/tools/ito/David/transcribe-once.ts` - Standalone example
- `/Users/davidcruwys/dev/tools/ito/server/src/prompts/transcription.ts` - Vocabulary prompt system

#### 2.2 Dual Transcription Behavior

**Execution Strategy:**
- Run both transcriptions in parallel (local Whisper + Groq)
- Local Whisper = **source of truth** (always used)
- Groq = **experimental comparison** (logged for analysis)
- Save both transcripts separately:
  - `{filename}.txt` - Local Whisper (primary)
  - `{filename}.groq.txt` - Groq API (experimental)

**Error Handling:**
- If Groq fails → Continue with local Whisper only (no blocking)
- If local Whisper fails → System failure (current behavior)
- Log all Groq errors for debugging

**Configuration:**
- `GROQ_API_KEY` environment variable (optional, system works without it)
- Config option to enable/disable dual transcription
- Groq model selection (default: `whisper-large-v3`)

---

### 3. Enhanced Telemetry System

**Goal:** Track both performance metrics AND accuracy comparison between providers

#### 3.1 Telemetry Data Structure

**Current Fields (keep):**
- `startTimestamp`, `endTimestamp`
- `project`, `filename`, `path`
- `videoDurationSec`, `transcriptionDurationSec`, `ratio`
- `fileSizeBytes`, `model`, `success`

**New Fields (add):**

```typescript
{
  // Provider-specific timing
  "providers": {
    "whisper": {
      "durationSec": 82.5,
      "success": true,
      "model": "medium",
      "accuracy": 100  // Assumed source of truth
    },
    "groq": {
      "durationSec": 2.1,
      "success": true,
      "model": "whisper-large-v3",
      "accuracy": 98.5,  // Calculated similarity
      "noSpeechProb": 0.12  // From verbose_json
    }
  },

  // Accuracy metrics
  "accuracyComparison": {
    "method": "levenshtein" | "word-overlap" | "semantic",
    "similarityPercent": 98.5,
    "characterDifferences": 23,
    "wordDifferences": 5,
    "transcriptLengthWhisper": 1542,
    "transcriptLengthGroq": 1519
  },

  // Performance comparison
  "speedup": 39.3,  // Groq was 39x faster (82.5 / 2.1)
  "speedupRatio": 0.025  // Groq took 2.5% of Whisper time
}
```

#### 3.2 Accuracy Calculation

**Assumption:** Local Whisper = 100% accurate (baseline)

**Comparison Methods:**
1. **Levenshtein Distance** (character-level similarity)
   - Calculate edit distance between transcripts
   - Convert to percentage: `100 - (distance / max_length × 100)`

2. **Word-Level Overlap** (preferred for transcription)
   - Tokenize both transcripts into words
   - Calculate word-level accuracy (insertions/deletions/substitutions)

3. **Semantic Similarity** (future enhancement)
   - Consider meaning equivalence (e.g., "can't" vs "cannot")

**Target Accuracy Threshold:** 97-99% (within a couple percentage points)

#### 3.3 Telemetry Management

**Archive Current Data:**
- Keep last 100 entries in `transcription-telemetry.jsonl`
- Archive older entries:
  - Move to `server/archive/transcription-telemetry-2025-12-16-to-2026-01-03.jsonl.gz`
  - Compress with gzip
  - Create new summary stats before archiving

**Ongoing Telemetry:**
- Append-only JSONL format (current behavior)
- Automatic rotation when > 500 entries (configurable)
- Maintain rolling summary stats

---

## Success Metrics

### Progress Bar System
- Users can see estimated completion time within 5 seconds of starting transcription
- Estimation accuracy within ±20% of actual completion time for 80% of transcriptions
- Real-time progress updates (if technically feasible)

### Dual Transcription
- Groq transcription successfully completes for >95% of files
- Speed comparison data collected for all successful dual transcriptions
- System gracefully degrades to local-only if Groq unavailable

### Accuracy Tracking
- Similarity scores calculated for all dual transcriptions
- Telemetry includes both performance and accuracy metrics
- Can identify patterns: Does Groq accuracy vary by video length, content type, etc.?

### Data Goals
- Collect 100+ dual transcription samples
- Determine if Groq is "good enough" (>97% accurate)
- Quantify speed improvement (hypothesis: 10-50x faster)
- Decide whether to switch primary provider or offer user choice

---

## Technical Constraints

1. **Groq API Key:** Must be optional (system works without it)
2. **API Costs:** Groq transcription has API costs (need usage tracking)
3. **Audio Format:** Groq requires WAV conversion (16kHz mono)
4. **No Blocking:** Groq failures must not block local transcription
5. **Privacy:** Consider data being sent to external API vs local processing

---

## Questions for Requirements

1. **Progress Bar UX:**
   - Where should progress bar appear? (Watch tab? Toast notification?)
   - Show both providers' progress separately or combined?
   - What happens if one provider finishes much faster than the other?

2. **Groq Provider Control:**
   - Should users enable/disable Groq per-transcription or globally?
   - Should we allow switching primary provider based on telemetry results?
   - How to handle API quota limits?

3. **Accuracy Comparison:**
   - Which similarity algorithm to use? (Levenshtein vs word-level)
   - Should we show accuracy scores in UI or just telemetry?
   - What accuracy threshold triggers a warning?

4. **Telemetry UI:**
   - Should users see performance comparison stats in UI?
   - Dashboard showing "Groq vs Whisper" over time?
   - Export telemetry data for external analysis?

5. **Migration Path:**
   - If Groq proves faster and accurate, switch primary provider?
   - Offer user choice of provider?
   - Keep both for redundancy/fallback?

---

## Related Files

**Current Implementation:**
- `server/src/routes/transcription.ts` - Transcription endpoint (if exists)
- `server/src/utils/whisper.ts` - Local Whisper integration (if exists)
- `server/transcription-telemetry.jsonl` - Current telemetry data

**Research Resources:**
- `/Users/davidcruwys/dev/tools/ito/server/src/clients/groqClient.ts` - Groq implementation reference
- `server/transcription-performance-summary.json` - Statistical baseline

**Generated Tools (throwaway):**
- `analyze-transcription.js` - Performance analysis script (not committed)

---

## Next Steps for Requirements Person

1. **Review this brief** and research findings
2. **Explore ITO project** for Groq implementation patterns
3. **Create detailed FR** covering:
   - Progress bar system design
   - Dual transcription architecture
   - Enhanced telemetry schema
   - UI/UX considerations
4. **Define acceptance criteria** for each component
5. **Consider phasing:**
   - Phase 1: Enhanced telemetry + Groq integration
   - Phase 2: Progress bar with time estimation
   - Phase 3: Provider selection UI and accuracy dashboard

---

**Prepared by:** Analysis conversation (2026-01-03)
**For:** Product Owner / Requirements specification
