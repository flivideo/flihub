/**
 * FR-168: the render-grain control — does this project ship ONE video, or one per chapter?
 *
 * ⚠️ THE LABELS ARE LOAD-BEARING AND THE COUNT LINE IS NOT DECORATION.
 * "Video per project" / "Video per chapter" are David's words, but both phrases are silent
 * about WHICH SIDE MULTIPLIES — "video per chapter" reads either as "a video, per chapter"
 * (N videos) or, scanned quickly, as "a video that has chapters" (1 video). That bistability
 * flipped the terms in David's own sentence during the design discussion. The count line
 * ("produces ONE video" / "ONE VIDEO PER CHAPTER") is what disambiguates, and the filename
 * example grounds it in his actual output convention (01-name.mp4 … 10-name.mp4).
 * Do not "tidy" the count away.
 *
 * Shared by the create form and the project drawer so the two cannot drift apart.
 */
import type { ProjectShips } from '../../../../shared/types';

export const SHIPS_LABEL: Record<ProjectShips, string> = {
  'per-project': 'Video per project',
  'per-chapter': 'Video per chapter',
};

const SHIPS_HELP: Record<ProjectShips, string> = {
  'per-project': 'This project produces ONE video. Chapters are sections of it.',
  'per-chapter': 'This project produces ONE VIDEO PER CHAPTER. Chapter 03 → 03-name.mp4.',
};

const ORDER: ProjectShips[] = ['per-project', 'per-chapter'];

export function ShipsSelector({
  value,
  onChange,
  disabled = false,
  name = 'ships',
}: {
  value: ProjectShips;
  onChange: (v: ProjectShips) => void;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <div className="space-y-1">
      {ORDER.map((opt) => (
        <label
          key={opt}
          className={`flex items-start gap-2 text-xs ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
        >
          <input
            type="radio"
            name={name}
            checked={value === opt}
            disabled={disabled}
            onChange={() => onChange(opt)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium text-warm-secondary">{SHIPS_LABEL[opt]}</span>
            <span className="block text-warm-muted">{SHIPS_HELP[opt]}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
