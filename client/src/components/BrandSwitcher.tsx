// Brand dropdown in the header: FliHub › [brand ▾] › project.
// Selecting a brand repoints the server at that brand's root (published/holding
// paths move with it) and refreshes the entire UI.
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useBrands, useSwitchBrand } from '../hooks/useBrandsApi';

export function BrandSwitcher({ onSwitched }: { onSwitched?: () => void }) {
  const { data } = useBrands();
  const switchBrand = useSwitchBrand();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!data?.brands?.length) return null;
  const active = data.brands.find((b) => b.active);

  const handleSelect = async (key: string) => {
    setOpen(false);
    if (key === active?.key) return;
    try {
      const result = await switchBrand.mutateAsync(key);
      if (result.success && result.brand) {
        toast.success(`Switched to ${result.brand.name}`);
        onSwitched?.();
      } else {
        toast.error(result.error || 'Failed to switch brand');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to switch brand');
    }
  };

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={switchBrand.isPending}
        className="flex items-center gap-1 text-lg font-medium text-warm-secondary hover:text-warm-primary transition-colors disabled:opacity-50"
        title={active ? `Brand: ${active.name} (${active.root})` : 'Select brand'}
      >
        <span>{active?.name ?? 'Brand'}</span>
        <span className="text-warm-muted text-sm">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-warm rounded-lg shadow-lg z-50 min-w-[220px] py-1">
          {data.brands.map((b) => (
            <button
              key={b.key}
              onClick={() => handleSelect(b.key)}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-surface-hover transition-colors ${
                b.active ? 'bg-blue-50' : ''
              }`}
              title={b.root}
            >
              <span className="truncate flex-grow">{b.name}</span>
              {b.source === 'disk' && (
                <span className="text-xs text-warm-faint flex-shrink-0" title="Folder exists but has no brands.json entry">
                  unregistered
                </span>
              )}
              {b.active && <span className="text-blue-600 flex-shrink-0">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
