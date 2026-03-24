/**
 * FR-69: Reusable header dropdown menu component
 */
import { useState, useRef, useEffect, ReactNode } from 'react';

export interface DropdownItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  dividerBefore?: boolean;
}

interface HeaderDropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export function HeaderDropdown({ trigger, items, align = 'left' }: HeaderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-warm-muted hover:text-warm-secondary hover:bg-surface-hover rounded transition-colors"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-1 bg-surface border border-warm rounded-lg shadow-lg z-50 min-w-[200px] py-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item, index) => (
            <div key={index}>
              {item.dividerBefore && <div className="border-t border-warm my-1" />}
              <button
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-warm-secondary hover:bg-surface-hover flex items-center gap-2 transition-colors"
              >
                <span className="w-5 text-center flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
