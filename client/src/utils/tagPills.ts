// Tag pills (2026-09-25, David): each tag reads as a coloured pill beside the recording name.
// Common tags get fixed colours; any other tag gets a stable one from its letters.
const PILL = 'inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0 rounded-full';

const FIXED: Record<string, string> = {
  HOOK: 'bg-amber-100 text-amber-800',
  CTA: 'bg-emerald-100 text-emerald-800',
  SKOOL: 'bg-sky-100 text-sky-800',
};

const PALETTE = [
  'bg-purple-100 text-purple-800',
  'bg-rose-100 text-rose-800',
  'bg-indigo-100 text-indigo-800',
  'bg-teal-100 text-teal-800',
  'bg-orange-100 text-orange-800',
  'bg-lime-100 text-lime-800',
];

export function tagPillClass(tag: string): string {
  const key = tag.toUpperCase();
  let colour = FIXED[key];
  if (!colour) {
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    colour = PALETTE[h % PALETTE.length];
  }
  return `${PILL} ${colour}`;
}
