import React from 'react';
import { useActiveConnection } from '../context/ActiveConnectionContext';
import { InitialsAvatar } from './InitialsAvatar';
import { Plus, CheckCircle2, Clock } from 'lucide-react';

interface ConnectionSelectorBarProps {
  onOpenPairing: (mode?: 'create' | 'join' | 'options') => void;
  className?: string;
}

export const ConnectionSelectorBar: React.FC<ConnectionSelectorBarProps> = ({
  onOpenPairing,
  className = ''
}) => {
  const { 
    activeConnections, 
    activeConnectionId, 
    setActiveConnectionId, 
    loading 
  } = useActiveConnection();

  if (loading && activeConnections.length === 0) {
    return (
      <div className={`w-full py-2 flex items-center gap-3 overflow-x-auto no-scrollbar ${className}`}>
        <div className="h-14 w-44 rounded-2xl bg-zinc-900/60 border border-white/5 animate-pulse" />
        <div className="h-14 w-44 rounded-2xl bg-zinc-900/60 border border-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 px-0.5">
        {activeConnections.map((item) => {
          const isSelected = activeConnectionId === item.id;
          const partnerName = item.displayName;
          const relationshipType = item.relationshipType;
          const isPending = item.status === 'waiting';

          return (
            <button
              key={item.id}
              onClick={() => setActiveConnectionId(item.id)}
              className={`group flex items-center gap-3 p-2.5 pr-4 rounded-2xl border text-left transition-all duration-200 shrink-0 cursor-pointer min-w-[170px] max-w-[220px] ${
                isSelected
                  ? 'bg-violet-600/20 border-violet-500/60 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/40 text-white'
                  : 'bg-zinc-900/60 border-white/5 hover:border-white/20 hover:bg-zinc-900 text-zinc-300'
              }`}
            >
              <div className="relative shrink-0">
                <InitialsAvatar
                  name={partnerName}
                  photoURL={item.partner?.photoURL}
                  size="sm"
                />
                {isSelected && (
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-violet-500 border-2 border-zinc-950 flex items-center justify-center">
                    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate leading-tight ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                  {partnerName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-zinc-400 truncate">
                    {relationshipType}
                  </span>
                  {isPending && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {/* Add Connection Button */}
        <button
          onClick={() => onOpenPairing('options')}
          className="flex items-center gap-2 py-3 px-4 rounded-2xl border border-dashed border-white/15 bg-zinc-900/30 hover:bg-zinc-900/70 hover:border-violet-500/40 text-zinc-400 hover:text-white transition-all text-xs font-semibold shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-violet-400" />
          <span>Add Connection</span>
        </button>
      </div>
    </div>
  );
};
