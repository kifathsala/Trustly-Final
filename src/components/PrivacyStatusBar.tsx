import React from 'react';
import { Lock, ArrowRight, Shield } from 'lucide-react';

interface PrivacyStatusBarProps {
  onOpenPrivacy?: () => void;
  className?: string;
}

export const PrivacyStatusBar: React.FC<PrivacyStatusBarProps> = ({
  onOpenPrivacy,
  className = ''
}) => {
  return (
    <button
      onClick={onOpenPrivacy}
      className={`w-full p-4 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.08] via-zinc-900/60 to-emerald-500/[0.04] text-left flex items-center justify-between gap-4 transition-all duration-200 hover:border-emerald-500/40 cursor-pointer shadow-md group ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
          <Lock className="w-4.5 h-4.5" />
        </div>
        <div>
          <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <span>Private by default</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-zinc-400 font-normal">Encrypted & Isolated</span>
          </div>
          <p className="text-[11px] text-zinc-300 mt-0.5">
            Shared only when you explicitly choose. Your private reflections remain strictly yours.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors shrink-0">
        <span className="hidden sm:inline">Privacy Center</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
};
