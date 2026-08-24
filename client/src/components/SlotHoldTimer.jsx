import React, { useState, useEffect } from 'react';
import { Timer, AlertCircle, RefreshCw } from 'lucide-react';

export default function SlotHoldTimer({ initialSeconds = 300, onExpire, onCancel }) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onExpire]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;

  const isUrgent = secondsLeft < 60;

  return (
    <div
      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all animate-pulse-subtle ${
        isUrgent
          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${isUrgent ? 'bg-rose-200 dark:bg-rose-900' : 'bg-amber-200 dark:bg-amber-900'}`}>
          <Timer className="w-4 h-4 animate-spin-slow" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider">
            Slot Reserved (Lock Active)
          </div>
          <div className="text-xs opacity-90">
            Held exclusively for you to prevent double-booking.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-lg font-bold font-mono px-3 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border shadow-sm">
          {formattedTime}
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs underline font-medium opacity-80 hover:opacity-100 transition-opacity"
          >
            Release
          </button>
        )}
      </div>
    </div>
  );
}
