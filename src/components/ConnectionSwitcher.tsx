import React, { useState } from 'react';
import { useActiveConnection } from '../context/ActiveConnectionContext';
import { InitialsAvatar } from './InitialsAvatar';
import { 
  ChevronDown, 
  Plus, 
  Check, 
  Users, 
  X, 
  Lock, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

interface ConnectionSwitcherProps {
  onOpenPairing: (mode?: 'create' | 'join' | 'options') => void;
}

export const ConnectionSwitcher: React.FC<ConnectionSwitcherProps> = ({ onOpenPairing }) => {
  const { 
    activeConnections, 
    activeConnection, 
    activeConnectionId, 
    setActiveConnectionId, 
    loading 
  } = useActiveConnection();
  
  const [isOpen, setIsOpen] = useState(false);

  const currentDisplayName = activeConnection?.displayName || 'Select Connection';
  const currentRelationshipLabel = activeConnection?.relationshipType || 'Connection';

  return (
    <>
      {/* Switcher Pill Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-900 border border-white/10 hover:border-violet-500/40 text-left transition-all cursor-pointer shadow-md group"
      >
        <InitialsAvatar
          name={currentDisplayName}
          photoURL={activeConnection?.partner?.photoURL}
          size="xs"
        />

        <div className="flex flex-col text-left">
          <span className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors truncate max-w-[120px] sm:max-w-[150px]">
            {currentDisplayName}
          </span>
          <span className="text-[10px] text-zinc-400 -mt-0.5">
            {currentRelationshipLabel}
          </span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors ml-0.5" />
      </button>

      {/* Switcher Modal / Dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div 
            className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">Switch Connection</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of active connections */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {loading && activeConnections.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs font-mono">
                  Loading connections...
                </div>
              ) : activeConnections.length === 0 ? (
                <div className="py-6 text-center text-zinc-400 text-xs">
                  No connections found.
                </div>
              ) : (
                activeConnections.map((conn) => {
                  const isSelected = activeConnectionId === conn.id;
                  const isPending = conn.status === 'waiting';

                  return (
                    <button
                      key={conn.id}
                      onClick={async () => {
                        await setActiveConnectionId(conn.id);
                        setIsOpen(false);
                      }}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-violet-600/20 border-violet-500/50 text-white ring-1 ring-violet-500/30'
                          : 'bg-zinc-900/60 border-white/5 hover:border-white/15 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <InitialsAvatar
                          name={conn.displayName}
                          photoURL={conn.partner?.photoURL}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-white">
                            {conn.displayName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-zinc-400">
                              {conn.relationshipType}
                            </span>
                            {isPending ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                                Pending
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shrink-0 ml-2 shadow-md">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Add New Connection Option */}
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenPairing('options');
                }}
                className="w-full py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-violet-300 hover:text-white font-semibold text-xs border border-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-violet-400" />
                <span>Add Another Connection</span>
              </button>
            </div>

            {/* Privacy note */}
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 justify-center">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Isolated zero-trust relationship spaces</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
