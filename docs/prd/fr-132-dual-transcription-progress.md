# FR-132: Dual Transcription System with Progress Tracking

**Status:** Pending
**Added:** 2026-01-03
**Implemented:** -
**Dependencies:** FR-30 (Transcription Queue), FR-130 (Regen pattern), FR-131 (Shared code architecture)

---

## User Story

As a user, I want to see transcription progress in real-time and benefit from faster cloud-based transcription while maintaining local Whisper as the source of truth, so I can work more efficiently and have confidence in transcription quality.

---

## Problem

**Current transcription gaps:**
1. **No progress visibility** - Users don't know how long transcription will take
2. **No time estimation** - Can't plan workflow around transcription completion
3. **Slow performance** - Local Whisper takes ~1.36x video duration (5min video = ~7min transcription)
4. **Performance degradation** - 42% slowdown observed over time (resource contention)
5. **No benchmarking** - Can't compare providers for speed/accuracy

**Performance baseline (891 transcriptions analyzed):**
- Average: 1.36x video duration
- Range: 0.71x to 2.01x (95% confidence)
- Example: 60s video → ~82s transcription

---

## Solution

Three-phase enhancement to transcription system:

### Phase 1: Enhanced Telemetry + Dual Transcription
- Parallel execution: Local Whisper (source of truth) + Groq API (experimental)
- Save both transcripts for comparison
- Enhanced telemetry tracking both providers

### Phase 2: Progress Bar with Time Estimation
- Real-time progress bar during transcription
- Estimated completion time based on statistical model
- Socket.io updates for live feedback

### Phase 3: Provider Comparison Dashboard (Future)
- UI showing Groq vs Whisper performance over time
- Accuracy scores and speed comparison
- Decision support for provider switching

**This FR covers Phases 1 & 2.** Phase 3 is future work.

---

## Part 1: Dual Transcription Architecture

### Execution Strategy

**Parallel execution model:**
```
                   ┌─────────────────┐
                   │ Transcribe File │
                   └────────┬────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
     ┌────────▼────────┐        ┌────────▼────────┐
     │ Local Whisper   │        │ Groq API        │
     │ (Source of Truth)│        │ (Experimental)  │
     └────────┬────────┘        └────────┬────────┘
              │                           │
     ┌────────▼────────┐        ┌────────▼────────┐
     │ Save to:        │        │ Save to:        │
     │ {file}.txt      │        │ {file}.groq.txt │
     └────────┬────────┘        └────────┬────────┘
              │                           │
              └─────────────┬─────────────┘
                            │
                   ┌────────▼────────┐
                   │ Calculate       │
                   │ Accuracy        │
                   │ Comparison      │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │ Save Telemetry  │
                   │ (both providers)│
                   └─────────────────┘
```

**Key principles:**
- Local Whisper = **always runs** (source of truth)
- Groq API = **optional** (requires `GROQ_API_KEY` env var)
- Both run **in parallel** (Promise.all)
- Groq failure **does not block** local transcription
- Both transcripts saved separately for comparison

---

### File Naming Convention

**Primary transcript (local Whisper):**
- `recording-transcripts/{filename}.txt` - Plain text
- `recording-transcripts/{filename}.srt` - SRT with timestamps

**Experimental transcript (Groq):**
- `recording-transcripts/{filename}.groq.txt` - Plain text
- `recording-transcripts/{filename}.groq.json` - Full Groq response (includes segments, no_speech_prob)

**Example:**
```
recording-transcripts/
├── 01-1-intro.txt           ← Whisper (primary)
├── 01-1-intro.srt           ← Whisper SRT
├── 01-1-intro.groq.txt      ← Groq (experimental)
└── 01-1-intro.groq.json     ← Groq full response
```

---

### Groq Integration

**Based on ITO project research** (`/Users/davidcruwys/dev/tools/ito`)

**SDK:** `groq-sdk: ^0.26.0`

**Configuration:**
```typescript
// server/src/config/groqConfig.ts
export interface GroqConfig {
  enabled: boolean              // Default: false (requires API key)
  apiKey: string | undefined    // From process.env.GROQ_API_KEY
  model: 'whisper-large-v3' | 'distil-whisper-large-v3-en'  // Default: whisper-large-v3
  responseFormat: 'verbose_json'  // Always verbose for quality metrics
  vocabularyBudget: 224         // Token limit for custom vocabulary
}

export function getGroqConfig(): GroqConfig {
  const apiKey = process.env.GROQ_API_KEY
  return {
    enabled: !!apiKey,
    apiKey,
    model: 'whisper-large-v3',
    responseFormat: 'verbose_json',
    vocabularyBudget: 224
  }
}
```

**Implementation pattern:**
```typescript
// server/src/utils/transcription/groqTranscription.ts
import { Groq, toFile } from 'groq-sdk'

export async function transcribeWithGroq(
  audioPath: string,
  vocabulary: string[]
): Promise<GroqTranscriptionResult> {
  const config = getGroqConfig()
  if (!config.enabled) {
    return { success: false, error: 'Groq API key not configured' }
  }

  try {
    const groqClient = new Groq({ apiKey: config.apiKey })

    // Convert to 16kHz mono WAV (Groq requirement)
    const audioBuffer = await convertToWav(audioPath)

    // Create vocabulary prompt
    const prompt = createTranscriptionPrompt(vocabulary, config.vocabularyBudget)

    const transcription = await groqClient.audio.transcriptions.create({
      file: await toFile(audioBuffer, 'audio.wav'),
      model: config.model,
      prompt,
      response_format: 'verbose_json'
    })

    return {
      success: true,
      text: transcription.text.trim(),
      segments: transcription.segments,
      duration: transcription.duration,
      language: transcription.language,
      noSpeechProb: calculateAverageNoSpeechProb(transcription.segments)
    }
  } catch (error) {
    console.error('[Groq] Transcription failed:', error)
    return {
      success: false,
      error: String(error)
    }
  }
}
```

**Audio format conversion:**
```typescript
// server/src/utils/transcription/audioConversion.ts
import ffmpeg from 'fluent-ffmpeg'

export async function convertToWav(inputPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    ffmpeg(inputPath)
      .audioFrequency(16000)  // 16kHz (Groq requirement)
      .audioChannels(1)       // Mono
      .format('wav')
      .on('error', reject)
      .pipe()
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => resolve(Buffer.concat(chunks)))
  })
}
```

---

### Vocabulary Prompt System

**Based on ITO implementation:**

```typescript
// server/src/utils/transcription/vocabularyPrompt.ts

/**
 * Creates transcription prompt with vocabulary hints
 * Groq has 224 token budget for vocabulary
 */
export function createTranscriptionPrompt(
  vocabulary: string[],
  tokenBudget: number = 224
): string {
  // Combine global + project dictionaries (from FR-118, FR-125)
  const globalDictionary = getGlobalDictionary()
  const projectDictionary = getProjectDictionary()
  const allWords = [...globalDictionary, ...projectDictionary, ...vocabulary]

  // Deduplicate and sort by priority
  const uniqueWords = Array.from(new Set(allWords))

  // Truncate to fit token budget (rough estimate: 1 word ≈ 1.5 tokens)
  const maxWords = Math.floor(tokenBudget / 1.5)
  const selectedWords = uniqueWords.slice(0, maxWords)

  return `Transcribe this audio accurately. Common terms: ${selectedWords.join(', ')}`
}
```

**Integration with existing dictionary system:**
- Reuses global dictionary from `config.json` (FR-118)
- Reuses project dictionary from `.flihub-state.json` (FR-125)
- Vocabulary prompt sent to both Whisper and Groq

---

### Dual Transcription Orchestration

**Main transcription function:**
```typescript
// server/src/utils/transcription/dualTranscription.ts

export interface DualTranscriptionResult {
  whisper: WhisperResult
  groq?: GroqResult
  accuracyComparison?: AccuracyMetrics
  speedup?: number
}

export async function transcribeWithBothProviders(
  videoPath: string,
  vocabulary: string[]
): Promise<DualTranscriptionResult> {
  const startTime = Date.now()

  // Run both in parallel
  const [whisperResult, groqResult] = await Promise.allSettled([
    transcribeWithWhisper(videoPath, vocabulary),
    transcribeWithGroq(videoPath, vocabulary)
  ])

  // Whisper is source of truth (must succeed)
  if (whisperResult.status === 'rejected') {
    throw new Error(`Whisper transcription failed: ${whisperResult.reason}`)
  }

  const whisper = whisperResult.value

  // Groq is optional (failure is non-blocking)
  const groq = groqResult.status === 'fulfilled' && groqResult.value.success
    ? groqResult.value
    : undefined

  // Calculate accuracy comparison if both succeeded
  let accuracyComparison: AccuracyMetrics | undefined
  let speedup: number | undefined

  if (groq) {
    accuracyComparison = calculateAccuracy(whisper.text, groq.text)
    speedup = whisper.durationSec / groq.durationSec
  }

  return {
    whisper,
    groq,
    accuracyComparison,
    speedup
  }
}
```

---

### Accuracy Calculation

**Comparison methods:**

**1. Word-Level Accuracy (Primary method):**
```typescript
// server/src/utils/transcription/accuracyCalculation.ts

export interface AccuracyMetrics {
  method: 'word-overlap'
  similarityPercent: number
  characterDifferences: number
  wordDifferences: number
  transcriptLengthWhisper: number
  transcriptLengthGroq: number
}

export function calculateAccuracy(
  whisperText: string,
  groqText: string
): AccuracyMetrics {
  // Normalize text (lowercase, trim, remove extra spaces)
  const normalizeText = (text: string) =>
    text.toLowerCase().trim().replace(/\s+/g, ' ')

  const whisperNorm = normalizeText(whisperText)
  const groqNorm = normalizeText(groqText)

  // Word-level tokenization
  const whisperWords = whisperNorm.split(' ')
  const groqWords = groqNorm.split(' ')

  // Calculate word-level Levenshtein distance
  const wordDistance = levenshteinDistance(whisperWords, groqWords)
  const maxLength = Math.max(whisperWords.length, groqWords.length)
  const similarityPercent = 100 - (wordDistance / maxLength * 100)

  // Character-level differences (for reference)
  const charDistance = levenshteinDistance(
    whisperNorm.split(''),
    groqNorm.split('')
  )

  return {
    method: 'word-overlap',
    similarityPercent: Math.round(similarityPercent * 100) / 100,
    characterDifferences: charDistance,
    wordDifferences: wordDistance,
    transcriptLengthWhisper: whisperWords.length,
    transcriptLengthGroq: groqWords.length
  }
}

/**
 * Levenshtein distance implementation
 * Calculates edit distance between two arrays (words or characters)
 */
function levenshteinDistance<T>(a: T[], b: T[]): number {
  const matrix: number[][] = []

  // Initialize first row and column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}
```

**Assumption:** Local Whisper = 100% accurate (baseline for comparison)

**Target accuracy threshold:** 97-99% similarity

---

## Part 2: Enhanced Telemetry System

### Telemetry Schema

**Enhanced JSONL format:**
```typescript
// shared/types.ts - Add to existing types

export interface TranscriptionTelemetry {
  // Existing fields (keep)
  startTimestamp: string        // ISO 8601
  endTimestamp: string          // ISO 8601
  project: string               // Project code
  filename: string              // Recording filename
  path: string                  // Full path to video
  videoDurationSec: number      // Video length
  transcriptionDurationSec: number  // Total time (both providers)
  ratio: number                 // transcriptionDuration / videoDuration
  fileSizeBytes: number         // Video file size
  model: string                 // Primary model used
  success: boolean              // Overall success

  // NEW: Provider-specific timing
  providers: {
    whisper: {
      durationSec: number       // Whisper transcription time
      success: boolean          // Whisper success
      model: string             // Whisper model (medium, large, etc.)
      accuracy: 100             // Assumed 100% (source of truth)
    }
    groq?: {
      durationSec: number       // Groq transcription time
      success: boolean          // Groq success
      model: string             // Groq model (whisper-large-v3, etc.)
      accuracy: number          // Calculated similarity (0-100)
      noSpeechProb: number      // Average no_speech_prob from segments
      error?: string            // Error message if failed
    }
  }

  // NEW: Accuracy comparison
  accuracyComparison?: {
    method: 'word-overlap'
    similarityPercent: number
    characterDifferences: number
    wordDifferences: number
    transcriptLengthWhisper: number
    transcriptLengthGroq: number
  }

  // NEW: Performance comparison
  speedup?: number              // How many times faster Groq was (whisper / groq)
  speedupRatio?: number         // Percentage of Whisper time (groq / whisper)
}
```

**Example telemetry entry:**
```json
{
  "startTimestamp": "2026-01-03T14:30:00.000Z",
  "endTimestamp": "2026-01-03T14:31:22.500Z",
  "project": "c04-12-days-of-claudmas-09",
  "filename": "01-1-intro.mov",
  "path": "/path/to/recordings/01-1-intro.mov",
  "videoDurationSec": 60.5,
  "transcriptionDurationSec": 82.5,
  "ratio": 1.36,
  "fileSizeBytes": 245000000,
  "model": "whisper-medium",
  "success": true,
  "providers": {
    "whisper": {
      "durationSec": 82.5,
      "success": true,
      "model": "medium",
      "accuracy": 100
    },
    "groq": {
      "durationSec": 2.1,
      "success": true,
      "model": "whisper-large-v3",
      "accuracy": 98.5,
      "noSpeechProb": 0.12
    }
  },
  "accuracyComparison": {
    "method": "word-overlap",
    "similarityPercent": 98.5,
    "characterDifferences": 23,
    "wordDifferences": 5,
    "transcriptLengthWhisper": 257,
    "transcriptLengthGroq": 252
  },
  "speedup": 39.3,
  "speedupRatio": 0.025
}
```

---

### Telemetry Management

**Rotation strategy:**
```typescript
// server/src/utils/transcription/telemetryRotation.ts

export interface TelemetryConfig {
  maxEntries: 500               // Rotate when exceeded (configurable)
  archiveDirectory: 'server/archive/'
  keepRecentEntries: 100        // Keep last 100 in main file
}

export async function rotateTelemetryIfNeeded(): Promise<void> {
  const telemetryPath = 'server/transcription-telemetry.jsonl'
  const entries = await readJsonlFile(telemetryPath)

  if (entries.length <= config.maxEntries) {
    return  // No rotation needed
  }

  // Archive old entries
  const toArchive = entries.slice(0, -config.keepRecentEntries)
  const toKeep = entries.slice(-config.keepRecentEntries)

  const archiveName = generateArchiveName(toArchive)  // e.g., "2025-12-16-to-2026-01-03"
  const archivePath = path.join(config.archiveDirectory, `transcription-telemetry-${archiveName}.jsonl.gz`)

  // Compress and save archive
  await compressAndSave(toArchive, archivePath)

  // Keep recent entries in main file
  await writeJsonlFile(telemetryPath, toKeep)

  console.log(`[Telemetry] Archived ${toArchive.length} entries to ${archivePath}`)
}

function generateArchiveName(entries: TranscriptionTelemetry[]): string {
  const first = new Date(entries[0].startTimestamp)
  const last = new Date(entries[entries.length - 1].startTimestamp)
  return `${formatDate(first)}-to-${formatDate(last)}`
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]  // YYYY-MM-DD
}
```

**Initial archive:**
- Current 891 entries → Archive as `transcription-telemetry-2025-12-16-to-2026-01-03.jsonl.gz`
- Keep last 100 entries in `transcription-telemetry.jsonl`
- Generate summary stats before archiving

---

## Part 3: Progress Bar System

### Statistical Model

**Based on 891 transcription analysis:**
- **Mean ratio:** 1.36 (transcription time / video duration)
- **95% CI:** 0.71x to 2.01x
- **Standard deviation:** ~0.32

**Estimation formula:**
```typescript
function estimateTranscriptionTime(videoDurationSec: number): {
  estimatedSec: number
  minSec: number
  maxSec: number
} {
  const mean = 1.36
  const stdDev = 0.32

  return {
    estimatedSec: videoDurationSec * mean,
    minSec: videoDurationSec * (mean - stdDev),
    maxSec: videoDurationSec * (mean + stdDev)
  }
}
```

**Example:**
- 60s video:
  - Estimated: 82s (1.36 min)
  - Range: 43s to 121s (0.71 min to 2.01 min)

---

### Progress Bar UI

**Location:** Transcriptions tab (existing)

**Design:**
```
Transcriptions (3 active, 2 queued)
┌─────────────────────────────────────────────────────────────┐
│ 📝 01-1-intro.mov                                 [Cancel]  │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 45%   │   │
│ └───────────────────────────────────────────────────────┘   │
│ Whisper: ~37s remaining | Groq: ✅ Complete (2.1s)         │
│                                                             │
│ 📝 02-3-demo.mov                                  [Cancel]  │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 25%   │   │
│ └───────────────────────────────────────────────────────┘   │
│ Whisper: ~2m 15s remaining | Groq: ~3s remaining           │
└─────────────────────────────────────────────────────────────┘

Completed (89)
┌─────────────────────────────────────────────────────────────┐
│ ✅ 03-1-outro.mov - 1.2min (Groq: 2.1s, 98.5% accurate)    │
│ ✅ 04-2-cta.mov - 45s (Groq: 1.8s, 99.1% accurate)         │
└─────────────────────────────────────────────────────────────┘
```

**Progress calculation:**
```typescript
// client/src/components/TranscriptionProgressBar.tsx

interface TranscriptionProgress {
  filename: string
  videoDuration: number
  startTime: number
  whisper: {
    estimatedDuration: number
    currentProgress: number  // 0-100
    remainingSec: number
    complete: boolean
  }
  groq?: {
    estimatedDuration: number
    currentProgress: number
    remainingSec: number
    complete: boolean
  }
}

function calculateProgress(
  startTime: number,
  estimatedDuration: number
): { progress: number; remainingSec: number } {
  const elapsedSec = (Date.now() - startTime) / 1000
  const progress = Math.min((elapsedSec / estimatedDuration) * 100, 99)  // Never show 100% until complete
  const remainingSec = Math.max(estimatedDuration - elapsedSec, 0)

  return { progress, remainingSec }
}
```

---

### Socket.io Events

**New events:**
```typescript
// shared/types.ts - Socket events

export interface TranscriptionStartEvent {
  filename: string
  videoDuration: number
  estimatedWhisperDuration: number
  estimatedGroqDuration?: number  // If Groq enabled
}

export interface TranscriptionProgressEvent {
  filename: string
  provider: 'whisper' | 'groq'
  progress: number  // 0-100 (if available from provider)
  elapsedSec: number
  remainingSec: number
}

export interface TranscriptionCompleteEvent {
  filename: string
  provider: 'whisper' | 'groq'
  actualDuration: number
  accuracy?: number  // For Groq only
}

export interface TranscriptionErrorEvent {
  filename: string
  provider: 'whisper' | 'groq'
  error: string
}
```

**Server emits:**
```typescript
// server/src/utils/transcription/dualTranscription.ts

// On start
io.emit('transcription:start', {
  filename,
  videoDuration,
  estimatedWhisperDuration: videoDuration * 1.36,
  estimatedGroqDuration: 2.5  // Average from ITO research
})

// During transcription (if real-time progress available)
io.emit('transcription:progress', {
  filename,
  provider: 'whisper',
  progress: 45,
  elapsedSec: 37,
  remainingSec: 45
})

// On completion
io.emit('transcription:complete', {
  filename,
  provider: 'whisper',
  actualDuration: 82.5
})

io.emit('transcription:complete', {
  filename,
  provider: 'groq',
  actualDuration: 2.1,
  accuracy: 98.5
})
```

**Note:** Real-time progress from Whisper may not be available (depends on Whisper API). If not available, use estimated progress based on elapsed time.

---

## Integration with FR-130/131 (Shared Code Architecture)

### Shared Code Organization

**From FR-131:** Shared utilities should live in `/shared/` folders.

**Transcription utilities placement:**

```
server/src/utils/
├── shared/                          # Shared across features
│   ├── projectState.ts              # State file operations
│   ├── renameRecording.ts           # FR-130 rename logic
│   └── index.ts
│
└── transcription/                   # Transcription-specific (NEW)
    ├── dualTranscription.ts         # Orchestrates both providers
    ├── whisperTranscription.ts      # Local Whisper integration
    ├── groqTranscription.ts         # Groq API integration
    ├── audioConversion.ts           # WAV format conversion
    ├── vocabularyPrompt.ts          # Vocabulary prompt system
    ├── accuracyCalculation.ts       # Accuracy comparison
    ├── telemetryRotation.ts         # Telemetry management
    └── index.ts                     # Export barrel

client/src/components/
├── TranscriptionsPage.tsx           # Existing transcriptions tab
└── shared/
    ├── TranscriptionProgressBar.tsx # NEW: Progress bar component
    └── index.ts
```

**Rationale:**
- Transcription code is NOT shared between Recordings/Manage (it's its own domain)
- Lives in dedicated `/transcription/` folder
- Not in `/shared/` (not used by multiple feature areas)
- Clean separation of concerns

---

### Integration with FR-130 (Regen Pattern)

**Delete+Regenerate applies to transcripts:**

When file is renamed (FR-130):
1. Delete transcripts: `{old}.txt`, `{old}.srt`, `{old}.groq.txt`, `{old}.groq.json`
2. Rename recording
3. Queue NEW transcription (dual transcription if Groq enabled)

**Code reuse:**
```typescript
// FR-130 calls this after rename
import { queueDualTranscription } from '../utils/transcription/dualTranscription'

// After successful rename
await queueDualTranscription(newPath, vocabulary)
```

**Benefits:**
- Groq transcript automatically regenerated on rename
- Consistent with FR-130 pattern (delete+regenerate)
- No special handling needed

---

### Integration with FR-131 (Regen Toolbar)

**Regen Transcripts button:**

From FR-131 Manage panel, user clicks "Regen Transcripts":
- Queues dual transcription for all recordings missing transcripts
- OR re-transcribes ALL recordings (if user chooses "Force Re-transcribe All")
- Shows which provider(s) will be used (Whisper only, or Whisper + Groq)

**UI enhancement:**
```
Regeneration Tools
┌─────────────────────────────────────────────────────────────┐
│ [↻ Regen Shadows] [↻ Regen Transcripts ▼] [↻ Regen Chapters]│
│                                                              │
│ Regen Transcripts options:                                  │
│ • Missing only (Whisper + Groq)                             │
│ • Force re-transcribe all (Whisper + Groq)                  │
│ • Whisper only (skip Groq)                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

**Required for Groq:**
```bash
# .env
GROQ_API_KEY=gsk_...  # Optional, system works without it
```

**If not set:**
- Groq transcription disabled
- Only local Whisper runs
- System continues to work normally

---

### Config.json Extensions

**New fields:**
```json
{
  "transcription": {
    "groq": {
      "enabled": true,           // Enable/disable Groq (requires API key)
      "model": "whisper-large-v3",
      "vocabularyBudget": 224
    },
    "telemetry": {
      "maxEntries": 500,
      "keepRecentEntries": 100,
      "archiveDirectory": "server/archive/"
    },
    "progress": {
      "enabled": true,
      "updateIntervalMs": 1000   // Socket.io update frequency
    }
  }
}
```

---

## Acceptance Criteria

### Must Have (Phase 1: Dual Transcription + Enhanced Telemetry)

**Dual Transcription:**
- [ ] Groq SDK installed (`groq-sdk: ^0.26.0`)
- [ ] Groq API key loaded from environment (`GROQ_API_KEY`)
- [ ] Both Whisper and Groq run in parallel (Promise.all)
- [ ] Groq failure does not block Whisper (graceful degradation)
- [ ] Whisper transcript saved to `{filename}.txt`
- [ ] Groq transcript saved to `{filename}.groq.txt`
- [ ] Groq full response saved to `{filename}.groq.json`

**Accuracy Calculation:**
- [ ] Word-level Levenshtein distance implemented
- [ ] Accuracy percentage calculated (0-100)
- [ ] Character differences tracked
- [ ] Word differences tracked

**Enhanced Telemetry:**
- [ ] Provider-specific timing tracked (whisper, groq)
- [ ] Accuracy comparison included in telemetry
- [ ] Speedup calculation (whisper / groq)
- [ ] No-speech probability tracked (from Groq verbose_json)
- [ ] Telemetry appended to JSONL file

**Telemetry Management:**
- [ ] Current 891 entries archived to `.jsonl.gz`
- [ ] Last 100 entries kept in main file
- [ ] Automatic rotation when > 500 entries
- [ ] Archive naming: `transcription-telemetry-YYYY-MM-DD-to-YYYY-MM-DD.jsonl.gz`

**Configuration:**
- [ ] `GROQ_API_KEY` environment variable support
- [ ] Config options for Groq model selection
- [ ] Config options for telemetry rotation
- [ ] System works without Groq API key (Whisper-only mode)

---

### Must Have (Phase 2: Progress Bar)

**Progress Estimation:**
- [ ] Statistical model implemented (1.36x ± 0.32)
- [ ] Estimated completion time calculated on transcription start
- [ ] Estimated time shown in UI

**Progress Bar UI:**
- [ ] Progress bar component in Transcriptions tab
- [ ] Shows percentage complete (0-100%)
- [ ] Shows time remaining (e.g., "~37s remaining")
- [ ] Updates in real-time (via Socket.io)
- [ ] Separate progress for Whisper and Groq (if Groq enabled)
- [ ] Progress bar removed on completion
- [ ] Cancel button works during transcription

**Socket.io Events:**
- [ ] `transcription:start` event on job start
- [ ] `transcription:progress` event during transcription (estimated)
- [ ] `transcription:complete` event on job completion
- [ ] `transcription:error` event on failure
- [ ] Frontend listens to events and updates UI

**Completed Transcriptions Display:**
- [ ] Show completed transcriptions with timing
- [ ] Show Groq accuracy if dual transcription used
- [ ] Show speedup factor (e.g., "Groq: 39x faster")

---

### Should Have

**Vocabulary Integration:**
- [ ] Vocabulary prompt system (from ITO)
- [ ] Combines global + project dictionaries (FR-118, FR-125)
- [ ] Truncates to fit 224 token budget
- [ ] Sent to both Whisper and Groq

**Audio Format Conversion:**
- [ ] FFmpeg conversion to 16kHz mono WAV
- [ ] Cached conversion (don't re-convert on retry)
- [ ] Cleanup temp files after transcription

**Error Handling:**
- [ ] Groq API quota limit detection
- [ ] Groq API error logging
- [ ] Retry logic for transient failures
- [ ] User-friendly error messages

---

### Nice to Have (Future: Phase 3)

**Provider Comparison Dashboard:**
- [ ] UI showing Groq vs Whisper performance over time
- [ ] Chart: Average speedup
- [ ] Chart: Accuracy distribution
- [ ] Filter by date range, project, video duration
- [ ] Export telemetry data (CSV, JSON)

**Provider Selection:**
- [ ] UI to switch primary provider (Whisper → Groq)
- [ ] Per-transcription provider choice
- [ ] Confidence-based provider selection (e.g., use Groq if accuracy > 98%)

**Advanced Accuracy:**
- [ ] Semantic similarity comparison (not just word-level)
- [ ] Accuracy threshold warnings (e.g., < 97%)
- [ ] Side-by-side transcript comparison UI

---

## Technical Notes

### Files to Create

| File | Purpose |
|------|---------|
| `server/src/utils/transcription/dualTranscription.ts` | Orchestrates both providers |
| `server/src/utils/transcription/whisperTranscription.ts` | Local Whisper wrapper |
| `server/src/utils/transcription/groqTranscription.ts` | Groq API integration |
| `server/src/utils/transcription/audioConversion.ts` | WAV conversion |
| `server/src/utils/transcription/vocabularyPrompt.ts` | Vocabulary prompt system |
| `server/src/utils/transcription/accuracyCalculation.ts` | Accuracy comparison |
| `server/src/utils/transcription/telemetryRotation.ts` | Telemetry management |
| `server/src/config/groqConfig.ts` | Groq configuration |
| `client/src/components/shared/TranscriptionProgressBar.tsx` | Progress bar UI |

---

### Files to Modify

| File | Changes |
|------|---------|
| `server/src/routes/transcription.ts` | Use dual transcription system |
| `client/src/components/TranscriptionsPage.tsx` | Add progress bar component |
| `shared/types.ts` | Add telemetry schema, Socket.io events |
| `server/package.json` | Add `groq-sdk` dependency |
| `server/.env.example` | Add `GROQ_API_KEY` example |
| `server/src/index.ts` | Register Socket.io transcription events |

---

### Dependencies to Install

```bash
# Server
npm install groq-sdk@^0.26.0

# Optional (if not already installed)
npm install fluent-ffmpeg  # Audio conversion
npm install @types/fluent-ffmpeg --save-dev
```

---

## Testing Checklist

### Dual Transcription Tests

**Groq Enabled:**
1. Set `GROQ_API_KEY` environment variable
2. Transcribe file
3. ✅ Both Whisper and Groq run in parallel
4. ✅ Two transcript files created: `{file}.txt` and `{file}.groq.txt`
5. ✅ Groq JSON response saved: `{file}.groq.json`
6. ✅ Telemetry includes both providers
7. ✅ Accuracy comparison calculated
8. ✅ Speedup calculated

**Groq Disabled:**
1. Remove `GROQ_API_KEY` environment variable
2. Transcribe file
3. ✅ Only Whisper runs
4. ✅ Only `{file}.txt` created (no Groq files)
5. ✅ Telemetry shows Whisper only
6. ✅ No errors or warnings

**Groq Failure:**
1. Set invalid `GROQ_API_KEY`
2. Transcribe file
3. ✅ Whisper succeeds
4. ✅ Groq fails gracefully (no blocking)
5. ✅ Telemetry shows Groq error
6. ✅ User sees completion (Whisper success)

---

### Progress Bar Tests

**Progress Updates:**
1. Start transcription for 60s video
2. ✅ Progress bar appears immediately
3. ✅ Shows estimated time: ~82s (1.36x)
4. ✅ Progress updates every 1 second
5. ✅ Time remaining decreases
6. ✅ Progress bar removed on completion

**Dual Provider Progress:**
1. Start transcription with Groq enabled
2. ✅ Shows Whisper progress: "~37s remaining"
3. ✅ Shows Groq progress: "✅ Complete (2.1s)" (completes much faster)
4. ✅ Both providers tracked separately

**Accuracy Display:**
1. Complete transcription with Groq
2. ✅ Completed item shows: "Groq: 2.1s, 98.5% accurate"
3. ✅ Speedup shown: "39x faster"

---

### Telemetry Tests

**Telemetry Rotation:**
1. Fill telemetry with 501 entries
2. ✅ Automatic rotation triggered
3. ✅ Old entries archived to `.jsonl.gz`
4. ✅ Last 100 entries kept in main file
5. ✅ Archive named correctly (date range)

**Telemetry Content:**
1. Complete dual transcription
2. ✅ Telemetry includes providers.whisper
3. ✅ Telemetry includes providers.groq (if enabled)
4. ✅ Telemetry includes accuracyComparison
5. ✅ Telemetry includes speedup

---

### Integration Tests (FR-130)

**Rename with Dual Transcription:**
1. Rename file with Groq enabled
2. ✅ Both transcripts deleted: `{old}.txt`, `{old}.groq.txt`, `{old}.groq.json`
3. ✅ Recording renamed
4. ✅ Dual transcription queued for new filename
5. ✅ Both providers create new transcripts

---

### Integration Tests (FR-131)

**Regen from Manage Panel:**
1. Go to Manage panel
2. Click "Regen Transcripts"
3. ✅ Shows provider options: "Missing only" / "Force re-transcribe" / "Whisper only"
4. ✅ Select "Missing only (Whisper + Groq)"
5. ✅ Dual transcription queued for missing files
6. ✅ Progress bars appear in Transcriptions tab

---

## Performance Expectations

### Groq API Performance (from ITO research)

**Typical times:**
- 30s video → ~1-2s transcription
- 60s video → ~2-3s transcription
- 5min video → ~5-10s transcription

**Speedup over local Whisper:**
- Expected: 10-50x faster
- 60s video: Whisper 82s vs Groq 2.1s = **39x faster**

### Local Whisper Performance (baseline)

**Current performance:**
- Average: 1.36x video duration
- 60s video → ~82s transcription
- 5min video → ~7min transcription

**Degradation observed:**
- 42% slowdown over time (resource contention)
- May need investigation/optimization separate from this FR

---

## Success Metrics

**Data collection goals:**
- [ ] Collect 100+ dual transcription samples (within 2 weeks)
- [ ] Determine Groq accuracy: Target >97% average
- [ ] Quantify speedup: Hypothesis 10-50x faster
- [ ] Groq success rate: Target >95%

**Decision criteria (after data collection):**
- If Groq accuracy >97% AND speedup >10x → Consider switching primary provider
- If Groq accuracy <95% → Keep local Whisper only
- If Groq inconsistent → Offer user choice

**Progress bar metrics:**
- [ ] Users see estimated time within 5 seconds of starting transcription
- [ ] Estimation accuracy within ±20% of actual for 80% of transcriptions
- [ ] Progress updates at least every 1 second

---

## Privacy & Security Considerations

**Groq API sends data to external service:**
- Audio files uploaded to Groq servers
- Transcripts processed in cloud
- User must opt-in (requires API key)
- Log API usage for cost tracking

**Local Whisper:**
- All processing on-device
- No external data transmission
- Privacy maintained

**Recommendation:**
- Document data transmission in UI
- Allow users to disable Groq per-project (privacy-sensitive content)
- Consider adding "Groq enabled" indicator in UI

---

## API Cost Tracking

**Groq API has usage limits and costs:**
- Track API calls in telemetry
- Monitor monthly usage
- Alert if approaching quota limits

**Future enhancement:**
- Cost tracking dashboard
- Per-project API usage
- Budget limits

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Groq API quota exceeded** | Medium | High | Track usage, alert near limits, fallback to Whisper |
| **Groq accuracy lower than expected** | Medium | Medium | Collect data, decide based on metrics, keep Whisper primary |
| **API costs too high** | Low | Medium | Monitor costs, allow disabling Groq, set budget alerts |
| **Real-time progress not available** | High | Low | Use estimated progress based on elapsed time (acceptable) |
| **Telemetry file grows too large** | Low | Low | Automatic rotation at 500 entries |

---

## Future Enhancements (Not in Scope)

**Provider switching:**
- Allow user to choose primary provider (Whisper or Groq)
- Automatic provider selection based on accuracy

**Advanced accuracy:**
- Semantic similarity (meaning-based comparison)
- Accuracy threshold warnings

**Dashboard:**
- Performance comparison UI (Groq vs Whisper over time)
- Cost tracking dashboard
- Export telemetry for analysis

**SRT generation from Groq:**
- Groq verbose_json includes segments with timestamps
- Could generate SRT from Groq data (in addition to Whisper SRT)

---

## Completion Criteria

**Definition of Done:**
- [ ] All Phase 1 acceptance criteria met (Dual Transcription + Telemetry)
- [ ] All Phase 2 acceptance criteria met (Progress Bar)
- [ ] All tests passing
- [ ] Telemetry rotation working
- [ ] Progress bar shows in Transcriptions tab
- [ ] Groq graceful degradation working (system works without API key)
- [ ] Documentation updated (CLAUDE.md, architecture notes)
- [ ] Initial telemetry archived (891 entries)
- [ ] Code reviewed and merged

---

**Last updated:** 2026-01-03
