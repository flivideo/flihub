# AGENTS.md — Stage & Project Actions

**Project**: FliHub — video recording workflow management tool
**Campaign**: stage-and-project-actions
**Profile**: Development
**Inherits**: docs/planning/project-list-redesign/AGENTS.md
**Last updated**: 2026-04-08

---

## Campaign Context

Four focused additions to the Projects panel and server config:

1. **stage-types** — Add `shelved` and `remix` stages to the pipeline. Remove `review` from the default stage list. FR-149.
2. **whisper-config** — Move hardcoded Whisper binary/model/language out of `transcriptions.ts` into `config.json`. B036.
3. **transcribe-all-slideout** — Add a "Transcribe All" button to the project detail drawer. FR-151.
4. **safe-delete** — Safe project deletion with relay check + confirmation modal. FR-152.

---

## Build & Run Commands

```bash
npm run build -w shared    # ALWAYS after changing shared/types.ts
npm run build -w server    # After server changes
npm run build -w client    # tsc -b && vite build
npm test                   # All workspaces — must exit 0
lsof -i :5101 | grep LISTEN  # Check if server already running
```

---

## Directory Structure (campaign-relevant)

```
shared/
└── types.ts                          # ProjectStage union, DEFAULT_PROJECT_STAGES, STAGE_LABELS, Config interface

server/
├── config.template.json              # Add whisper defaults here
├── src/routes/
│   ├── transcriptions.ts             # Replace WHISPER_BINARY/MODEL/LANGUAGE constants with config reads
│   └── projects.ts                   # Add DELETE endpoint here (safe-delete)

client/src/
├── components/
│   ├── ProjectsPanel.tsx             # STAGE_DISPLAY constant lives here — add shelved + remix, remove review
│   └── ProjectDrawer.tsx             # Transcribe All button (Quick Actions) + Danger Zone (safe-delete)
└── hooks/
    └── useTranscriptionsApi.ts       # May need a new hook for queue-all — check if already exists
```

---

## Stage Type Changes (stage-types work unit)

### Current state in shared/types.ts

```typescript
export type ProjectStage =
  | 'planning' | 'recording' | 'first-edit' | 'second-edit'
  | 'review' | 'ready-to-publish' | 'published' | 'archived';

export const DEFAULT_PROJECT_STAGES: ProjectStage[] = [
  'planning', 'recording', 'first-edit', 'second-edit',
  'review', 'ready-to-publish', 'published', 'archived',
];
```

### Required changes

**shared/types.ts:**
- Add `'shelved'` and `'remix'` to the `ProjectStage` union
- Keep `'review'` in the union (backward compat for existing data)
- Remove `'review'` from `DEFAULT_PROJECT_STAGES`
- Add `shelved` and `remix` to `STAGE_LABELS`
- New DEFAULT_PROJECT_STAGES order: `planning, recording, first-edit, second-edit, ready-to-publish, published, archived, shelved, remix`

**client/src/components/ProjectsPanel.tsx — STAGE_DISPLAY constant:**
```typescript
// ADD these two entries:
shelved: { label: 'Shelved', bg: 'bg-red-100',  text: 'text-red-700',  description: 'Abandoned — never published' },
remix:   { label: 'Remix',   bg: 'bg-rose-100', text: 'text-rose-700', description: 'Being repackaged into new content' },
// KEEP review entry (existing projects may use it):
review:  { label: 'Rev',     bg: 'bg-orange-100', text: 'text-orange-700', description: 'Under review' },
```

**Stage filter pills on Projects page**: Add Shelved and Remix pills. They should appear after Arch in the pill row. Review pill can be removed from the default pill set (it won't appear unless a project has that stage).

---

## Whisper Config (whisper-config work unit)

### Current state (hardcoded constants in transcriptions.ts)

```typescript
const WHISPER_BINARY = '~/.pyenv/shims/mlx_whisper';
const WHISPER_MODEL = 'mlx-community/whisper-large-v3-turbo';
const WHISPER_LANGUAGE = 'en';
```

### Required changes

**shared/types.ts — add to Config interface:**
```typescript
whisperBinary?: string;   // B036: Path to mlx_whisper binary (default: ~/.pyenv/shims/mlx_whisper)
whisperModel?: string;    // B036: Whisper model (default: mlx-community/whisper-large-v3-turbo)
whisperLanguage?: string; // B036: Transcription language (default: en)
```

**server/config.template.json — add defaults:**
```json
"whisperBinary": "~/.pyenv/shims/mlx_whisper",
"whisperModel": "mlx-community/whisper-large-v3-turbo",
"whisperLanguage": "en"
```

**server/src/routes/transcriptions.ts — replace constants:**
```typescript
// Remove the three const declarations at top of file
// In processNextJob(), replace:
const whisperBinary = expandPath(WHISPER_BINARY);
// With:
const config = getConfig();
const whisperBinary = expandPath(config.whisperBinary || '~/.pyenv/shims/mlx_whisper');
const whisperModel = config.whisperModel || 'mlx-community/whisper-large-v3-turbo';
const whisperLanguage = config.whisperLanguage || 'en';
// Then use whisperModel and whisperLanguage in the spawn args instead of WHISPER_MODEL/WHISPER_LANGUAGE
```

Note: `transcriptions.ts` receives `getConfig` as a function parameter — use that, don't import config directly.

---

## Transcribe All Slideout (transcribe-all-slideout work unit)

### Target component: ProjectDrawer.tsx

The Quick Actions section currently has: `Open in Finder` | `Copy Transcript`

Add `Transcribe All` as a third button, conditionally rendered:
- Show when: `project.totalFiles > 0 && project.transcriptPercent < 100`
- On click: POST to `/api/transcriptions/queue-all` with `{ scope: 'project', projectPath: project.path }`
- After click: show brief inline feedback "Queued N files" (or just a toast/success state)
- Button text while pending: "Queuing..." (loading state)

**Check if a hook already exists** for `queue-all` in `useTranscriptionsApi.ts` before creating one.

The endpoint `POST /api/transcriptions/queue-all` already exists in transcriptions.ts — the button just needs to call it.

---

## Safe Delete (safe-delete work unit)

### Server: new DELETE endpoint

Add to `server/src/routes/projects.ts`:

```
DELETE /api/projects/:code
Body: { confirmationCode: string }
```

**Guard chain (all must pass before delete):**
1. Project directory exists
2. `confirmationCode === code` (exact match)
3. Relay directory for this project is empty or doesn't exist

**On success:**
- `fs.remove(projectDir)` — removes entire local directory
- Emit `projects:changed` via Socket.io
- Return `{ success: true, deleted: projectDir }`

**On failure:** Return 400 with clear error message (don't 500).

### Client: Danger Zone in ProjectDrawer.tsx

Add a new section at the bottom of the drawer, visually separated with a red-tinted border:

```
DANGER ZONE
[Delete Project button — muted red, not alarming]
```

On click → opens a confirmation modal:
- Shows project code + name in large text
- Shows file count and disk size (already in drawer stats)
- Input: "Type the project code to confirm"
- Delete button: disabled until input matches project code exactly
- Clear "This cannot be undone" warning
- On confirm: calls DELETE endpoint, closes drawer, shows toast

**Use existing modal pattern** from the codebase (check HoldDeleteModal for reference — it has a similar confirmation-code pattern).

---

## Warm Linen Theme Rules (inherited — mandatory)

| Instead of | Use |
|-----------|-----|
| `bg-white` | `bg-surface` |
| `bg-gray-100` | `bg-page` or `bg-surface-muted` |
| `text-gray-900` | `text-warm-primary` |
| `text-gray-600` | `text-warm-secondary` |
| `text-gray-500` | `text-warm-muted` |
| `border-gray-200` | `border-warm` |
| `hover:bg-gray-50` | `hover:bg-surface-hover` |

Exception: keep semantic colors (`bg-red-100`, `bg-rose-100`, `text-red-700`) for Shelved, Remix, and Danger Zone.

---

## Success Criteria

Before marking any work unit complete:

- [ ] `npm run build -w shared` passes (if shared/types.ts changed)
- [ ] `npm run build -w server` passes (if server files changed)
- [ ] `npm run build -w client` passes
- [ ] `npm test` exits 0 — all tests pass
- [ ] No new `any` types
- [ ] FR/B annotation on new code (`// FR-149:`, `// B036:`, `// FR-151:`, `// FR-152:`)
- [ ] Warm linen palette — no `bg-white` or `text-gray-*` in new UI code
- [ ] New UI interactions have at least one test

---

## Anti-Patterns to Avoid

- **Do not remove `review` from the ProjectStage union** — only remove from DEFAULT_PROJECT_STAGES. Existing projects with stage='review' must still render.
- **Do not hardcode whisper defaults in transcriptions.ts** — fallback values are fine, but config must be the primary source.
- **Do not import config directly in transcriptions.ts** — it receives `getConfig` as a function parameter; use that.
- **Do not add a new hook to `useApi.ts`** — it's a barrel re-export. Add to domain hook file.
- **Do not use `bg-white` or `text-gray-*`** in new components.
- **Do not bypass HoldDeleteModal patterns** for the safe-delete modal — look at it first for the confirmation-code UX pattern.
- **Do not make safe-delete delete T7 holding copy** — local directory only.

---

## Quality Gates

1. `npm run build -w shared` clean (if types changed)
2. `npm run build -w server` clean
3. `npm run build -w client` clean
4. `npm test` passes (baseline ~1006 tests)
5. No new `any` types
6. Warm linen palette in all new UI

---

## Learnings (inherited from project-list-redesign)

- Agent compiled shared/ with CommonJS output breaking Vite — always build with `npm run build -w shared`, never `tsc` directly
- STAGE_DISPLAY constant lives in ProjectsPanel.tsx (not shared/types.ts) — check before looking elsewhere
- HoldDeleteModal has a working confirmation-code pattern — reference it for safe-delete modal
- `useApi.ts` is a barrel file — never add hooks directly to it
