/**
 * SlideOutDrawer - Slide-out configuration panel (like Watch page)
 *
 * FR-136: Tool-oriented design
 * Slides in from right when complex tool is activated
 */

import { ReactNode } from 'react';

interface SlideOutDrawerProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: string; // Optional width, defaults to w-[380px]
}

export function SlideOutDrawer({
  isOpen,
  title,
  children,
  onClose,
  width = 'w-[380px]',
}: SlideOutDrawerProps) {
  return (
    <div
      className={`
        fixed top-32 right-0 bottom-0 ${width}
        bg-white border-l-2 border-blue-500
        shadow-xl
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        z-50
      `}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
