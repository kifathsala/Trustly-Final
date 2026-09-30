import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm glass-card rounded-2xl p-3.5 border border-amber-500/40 bg-zinc-950/95 text-amber-200 text-xs shadow-2xl animate-fadeIn flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <WifiOff className="w-4 h-4" />
        </div>
        <div>
          <h5 className="font-bold text-white">You're offline</h5>
          <p className="text-[11px] text-zinc-400">Some TRUSTLY features require an active internet connection.</p>
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] flex items-center gap-1 shrink-0 transition-all cursor-pointer"
      >
        <RefreshCw className="w-3 h-3" />
        <span>Try Again</span>
      </button>
    </div>
  );
};
