# AGENTS.md — video-controls-and-dictionary

**Project**: FliHub — video recording workflow management tool
**Campaign**: video-controls-and-dictionary (B068 + B069 + B070 + B036 partial)
**Inherited from**: docs/planning/AGENTS.md (2026-04-07)
**Last updated**: 2026-04-12

---

## Project Overview

FliHub is a TypeScript monorepo that watches Ecamm Live recordings, provides a web UI for naming/organising video files, and manages project assets for a solo YouTube creator workflow. It runs locally on macOS (Apple Silicon). No cloud deployment, no multi-user support, no authentication.

---

## Build & Run Commands

```bash
npm run build -w shared    # ALWAYS run after changing shared/
npm run build -w server    # TypeScript check
npm run build -w client    # tsc -b && vite build
npm test                   # all three workspaces
lsof -i :5101 | grep LISTEN  # check server running
```

---

## Directory Structure (campaign-relevant)

```
client/src/
├── components/
│   ├── WatchPage.tsx                  # Full-screen review — speed/size/play controls to be extracted
│   ├── RecordingVideoModal.tsx        # 35-line wrapper → VideoPlayerModal (add dictionaryProps)
│   ├── IncomingVideoModal.tsx         # Incoming file preview → VideoPlayerModal (add dictionaryProps)
│   ├── RecordingsView.tsx             # File list — pass onPrevious/onNext/position to RecordingVideoModal
│   └── shared/
│       ├── VideoPlayerModal.tsx       # Core player modal — add Size/Autoplay/AutoNext/Prev/Next/dictionaryProps
│       ├── SizeToggle.tsx             # Already exists — WatchPage must import this (currently doesn't)
│       ├── SpeedControl.tsx           # CREATE — extracted speed button group
│       ├── PlayPauseButton.tsx        # CREATE — extracted play/pause button
│       └── DictionaryQuickAdd.tsx     # CREATE — inline word capture widget
├── hooks/
│   ├── useVideoPlayback.ts            # WatchPage must adopt this hook (currently reimplements it)
│   ├── useConfigApi.ts                # Global dictionary save (already implemented)
│   └── useProjectDictionary.ts       # CREATE — React Query hook for project state dictionary
server/src/routes/
└── transcriptions.ts                  # WU-A3: read whisperModel + whisperLanguage from config
shared/
└── types.ts                           # Add whisperModel?, whisperLanguage? to Config interface
```

---

## Architecture Docs Registry

| Doc | Path | Relevant For |
|-----|------|-------------|
| Shared types | `shared/types.ts` | Config interface, DictionaryQuickAddProps |
| useVideoPlayback hook | `client/src/hooks/useVideoPlayback.ts` | WU-A2 — WatchPage adoption |
| SizeToggle component | `client/src/components/shared/SizeToggle.tsx` | WU-A2, WU-B1 — existing component |
| VideoPlayerModal | `client/src/components/shared/VideoPlayerModal.tsx` | WU-A1, WU-B1, WU-B3 — central player |
| WatchPage | `client/src/components/WatchPage.tsx` | WU-A1, WU-A2 — source of extract |
| Transcriptions route | `server/src/routes/transcriptions.ts` | WU-A3 — whisperModel/language |
| Config template | `server/config.template.json` | WU-A3 — add new config fields |
| Project state route | `server/src/routes/state.ts` | WU-B2 — project dictionary PATCH endpoint |
| useConfigApi | `client/src/hooks/useConfigApi.ts` | WU-B2 — global dictionary update |

---

## Done-When Definitions

### WU-A1 — Extract SpeedControl + PlayPauseButton

- `client/src/components/shared/SpeedControl.tsx` exists and is exported
- Props: `interface SpeedControlProps { presets: number[]; value: number; onChange: (speed: number) => void; }`
- `client/src/components/shared/PlayPauseButton.tsx` exists and is exported
- Props: `interface PlayPauseButtonProps { isPlaying: boolean; onClick: () => void; }`
- `VideoPlayerModal.tsx` imports both from shared — no local speed/play JSX remains
- `WatchPage.tsx` imports both from shared — no local speed/play JSX remains (speed section lines 860-875, play/pause section)
- `npm run build -w client` passes
- `npm test` passes — no regressions
- Behaviour: Watch page and Recordings modal play/pause and speed work identically to before

### WU-A2 — Wire WatchPage to SizeToggle + useVideoPlayback

- `WatchPage.tsx` imports `SizeToggle` from `./shared/SizeToggle` — inline size button JSX (lines 880-895) removed
- `WatchPage.tsx` uses `useVideoPlayback` hook for play/pause state, speed state, and Space keydown — local equivalents removed
- `npm run build -w client` passes
- `npm test` passes
- Behaviour: Watch page size toggle and playback controls work identically to before

### WU-A3 — B036: whisperModel + whisperLanguage from config

- `shared/types.ts` `Config` interface has: `whisperModel?: string; // B036` and `whisperLanguage?: string; // B036`
- `server/config.template.json` has example entries for both fields
- `server/src/routes/transcriptions.ts` reads: `config.whisperModel || 'mlx-community/whisper-large-v3-turbo'` and `config.whisperLanguage || 'en'`
- Both values logged at transcription start: `console.log(\`Model: ${whisperModel}, Language: ${whisperLanguage}\`)`
- `npm run build -w shared && npm run build -w server` passes
- `npm test` passes

### WU-B1 — B069: VideoPlayerModal parity controls

- `VideoPlayerModal` accepts new optional props: `onPrevious?: () => void`, `onNext?: () => void`, `position?: { current: number; total: number }`
- When `onPrevious`/`onNext` provided: ← → buttons render in controls bar left section; `(n/total)` counter renders next to filename/title
- ← disabled when `position.current === 1`; → disabled when `position.current === position.total`
- Keyboard: left arrow → `onPrevious()`, right arrow → `onNext()` (only when modal is open/focused)
- Size toggle (N/L) added — uses `SizeToggle` from shared; persisted to `localStorage` key `flihub:modal:videoSize`; default `'normal'`
- Autoplay toggle added — `localStorage` key `flihub:modal:autoplay`; default `false`
- Auto Next toggle added — `localStorage` key `flihub:modal:autonext`; on `video onEnded` event, calls `onNext()` if Auto Next on and `onNext` provided
- `RecordingsView.tsx` passes `onPrevious`, `onNext`, `position` to `RecordingVideoModal`, which passes through to `VideoPlayerModal`
- `RecordingVideoModal.tsx` updated props interface to pass through navigation props
- `npm run build -w client` passes; `npm test` passes
- Behaviour: Recordings modal has working prev/next navigation, size toggle, autoplay, auto-next

### WU-B2 — B070: DictionaryQuickAdd component + hook

**Component** `shared/DictionaryQuickAdd.tsx`:
```tsx
interface DictionaryQuickAddProps {
  globalWords: string[];
  projectWords: string[];
  projectCode: string | null;
  onAddGlobal: (word: string) => Promise<void>;
  onAddProject: (word: string) => Promise<void>;
}
```
- Renders: compact text input (placeholder `+ word...`, ~120px wide, `text-xs`) + `[Global]` + `[Project]` pill buttons
- Both buttons `disabled` + `opacity-50 cursor-not-allowed` when input empty or only whitespace
- `Project` button disabled + `title="No active project"` tooltip when `projectCode` is null
- `trim()` input before checking/posting
- Duplicate check: if word exists in `globalWords` (case-insensitive) when clicking Global → amber toast `"Word" is already in Global dictionary`, no POST
- Same for `projectWords` when clicking Project
- On success: toast `"Word" added to Global dictionary` (or Project), field clears
- Component owns input state only — network calls are handled by props

**Hook** `hooks/useProjectDictionary.ts`:
- `useProjectDictionary(projectCode: string | null)` — React Query
- `queryKey: ['project-dictionary', projectCode]`
- Disabled (`enabled: false`) when `projectCode` is null
- Fetches `GET /api/projects/${projectCode}/state` → returns `state.glingDictionary ?? []`
- `useAddGlobalDictionaryWord(word)` mutation — POST to `/api/config` with full updated `glingDictionary` array; invalidates `['config']` query key on success
- `useAddProjectDictionaryWord(projectCode, word)` mutation — PATCH to `/api/projects/${projectCode}/state/dictionary` with full updated array; invalidates `['project-dictionary', projectCode]` on success

- `npm run build -w client` passes; `npm test` passes

### WU-B3 — B070: Wire DictionaryQuickAdd into modals

- `VideoPlayerModal` accepts new optional prop: `dictionaryProps?: DictionaryQuickAddProps`
- When `dictionaryProps` present: renders `<DictionaryQuickAdd>` in controls bar right section, after speed buttons, separated by `|` divider
- When absent: nothing renders — backward compatible
- `RecordingVideoModal.tsx` passes `dictionaryProps` to `VideoPlayerModal`:
  - `globalWords`: from `useConfig().data?.glingDictionary ?? []`
  - `projectWords`: from `useProjectDictionary(projectCode)` result
  - `projectCode`: from `useConfig().data?.activeProject ?? null`
  - `onAddGlobal`: calls `useAddGlobalDictionaryWord` mutation
  - `onAddProject`: calls `useAddProjectDictionaryWord` mutation
- `IncomingVideoModal.tsx` passes same `dictionaryProps` (same wiring)
- Transcripts page: unchanged — no `dictionaryProps` added there
- `npm run build -w client` passes; `npm test` passes
- Behaviour: opening a recording or incoming modal shows `+ word... [Global] [Project]` in the controls bar

---

## Constraints

1. `WatchPage.tsx` and `VideoPlayerModal.tsx` — read the current file before editing. Both are large (1,259 and 161 lines). The speed button section in Watch is lines 860-875; size buttons 880-895.
2. `useVideoPlayback` hook is already used by `VideoPlayerModal` — read it before wiring Watch to it. Confirm the hook exports match what Watch needs.
3. `SizeToggle` already exists — do NOT recreate it. Import from `./shared/SizeToggle`.
4. localStorage keys must not collide with Watch page keys (`flihub:watch:videoSize`, `flihub:watch:autoplay`, etc.) — modal keys use prefix `flihub:modal:`.
5. Global dictionary save: POST to `/api/config` with the **full array** (existing words + new word). Do not send only the new word — the endpoint replaces, not appends. Pattern is already in `useConfigApi.ts`.
6. Project dictionary save: PATCH to `/api/projects/:code/state/dictionary` with **full array**. Read `useProjectDictionary` result, append new word, POST full array.
7. `DictionaryQuickAdd` must be backward compatible — `VideoPlayerModal` without `dictionaryProps` must render identically to before.
8. FR annotation: new code gets `// B068:`, `// B069:`, `// B070:`, or `// B036:` comments.

---

## Success Criteria

- [ ] `npm run build -w shared` clean
- [ ] `npm run build -w server` clean
- [ ] `npm run build -w client` clean
- [ ] `npm test` passes (all tests, zero failures)
- [ ] No new `any` types in `shared/types.ts`
- [ ] Watch page: speed, size, play/pause work identically to before (refactor only)
- [ ] Recordings modal: Size, Autoplay, AutoNext, Prev/Next present and working
- [ ] Incoming modal + Recordings modal: `+ word... [Global] [Project]` visible in controls bar
- [ ] Adding a word in either modal updates config/state immediately (query invalidation)
- [ ] No duplicate word added (client-side guard fires amber toast)

---

## Reference Patterns

### Extracting a shared component (WU-A1 pattern)

```tsx
// client/src/components/shared/SpeedControl.tsx
interface SpeedControlProps {
  presets: number[];
  value: number;
  onChange: (speed: number) => void;
}

export function SpeedControl({ presets, value, onChange }: SpeedControlProps) {
  return (
    <div className="flex items-center gap-1">
      {presets.map((preset) => (
        <button
          key={preset}
          onClick={() => onChange(preset)}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            value === preset
              ? 'bg-blue-600 text-white'
              : 'text-warm-secondary hover:bg-surface-hover'
          }`}
        >
          {preset}x
        </button>
      ))}
    </div>
  );
}
```

### New React Query hook pattern

```typescript
// client/src/hooks/useProjectDictionary.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config';

export function useProjectDictionary(projectCode: string | null) {
  return useQuery({
    queryKey: ['project-dictionary', projectCode],
    enabled: projectCode !== null,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/projects/${projectCode}/state`);
      const data = await res.json();
      return (data.state?.glingDictionary ?? []) as string[];
    },
  });
}
```

### Optional prop pattern for backward compatibility

```tsx
// VideoPlayerModal — add optional props, render conditionally
interface VideoPlayerModalProps {
  // ... existing props ...
  dictionaryProps?: DictionaryQuickAddProps;  // B070: absent = nothing renders
  onPrevious?: () => void;                    // B069: absent = no nav buttons
  onNext?: () => void;
  position?: { current: number; total: number };
}
```

---

## Anti-Patterns to Avoid

- **Do not create a new SizeToggle** — `shared/SizeToggle.tsx` exists; import it
- **Do not send only the new word to the config endpoint** — it replaces the whole array; always send existing + new
- **Do not use `flihub:watch:*` localStorage keys in the modal** — use `flihub:modal:*` to avoid collision
- **Do not add dictionary quick-add to the Transcripts page** — wrong moment in workflow (post-transcription, not during review)
- **Do not add dictionary quick-add to the Watch page** — Config panel is accessible from Watch; widget is for modal contexts only
- **Do not bypass `shared/naming.ts` for filename parsing** — applies to any file touched during this campaign

---

## Inherited Learnings (from prior campaigns)

- **`npm run build -w shared` is easy to forget** — always run after touching `shared/types.ts`
- **`vi.mock('fs-extra')` is the single server mock target** — not `fs/promises`
- **Use `execFile` not shell string interpolation for user paths**
- **`useApi.ts` is a barrel re-export** — add new hooks to domain files (`useProjectDictionary.ts`), then re-export from `useApi.ts`
- **B### annotations** — always check last used ID in BACKLOG.md before assigning new ones

---

## Quality Gates

1. `npm run build -w server` clean
2. `npm run build -w client` clean
3. `npm test` exits 0
4. No new `any` types in shared types
5. New shared utility functions have at least a smoke test
