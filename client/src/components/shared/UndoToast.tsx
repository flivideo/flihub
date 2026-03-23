/**
 * B047: UndoToast — floating bar at bottom after batch operations.
 *
 * Shows a message with an Undo button and countdown timer.
 * When the timer expires, onExpire is called to dismiss the toast.
 */

import { useState, useEffect, useRef } from 'react';

export interface UndoToastProps {
  message: string;
  onUndo: () => void;
  durationMs?: number;
  onExpire: () => void;
}

export function UndoToast({
  message,
  onUndo,
  durationMs = 30000,
  onExpire,
}: UndoToastProps) {
  const [timeLeft, setTimeLeft] = useState(Math.ceil(durationMs / 1000));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onExpire]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white rounded-xl px-5 py-3 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="text-sm">{message}</span>

      <div className="flex items-center gap-3 ml-auto">
        <button
          onClick={onUndo}
          className="bg-white/20 hover:bg-white/30 text-white rounded-md px-3 py-1 text-sm font-medium transition-colors"
        >
          Undo
        </button>
        <span className="text-gray-400 text-xs tabular-nums">{timeLeft}s</span>
      </div>
    </div>
  );
}
