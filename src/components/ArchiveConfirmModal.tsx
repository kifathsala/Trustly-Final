import React, { useState } from 'react';
import { Archive, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { ConnectionItem } from '../types';
import { InitialsAvatar } from './InitialsAvatar';

interface ArchiveConfirmModalProps {
  connection: ConnectionItem | null;
  isOpen: boolean;
  isRestoring?: boolean;
  onClose: () => void;
  onConfirm: (connectionId: string) => Promise<void>;
}

export const ArchiveConfirmModal: React.FC<ArchiveConfirmModalProps> = ({
  connection,
  isOpen,
  isRestoring = false,
  onClose,
  onConfirm
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !connection) return null;

  const handleAction = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(connection.id);
      onClose();
    } catch (err: any) {
      console.error('Error during archive/restore:', err);
      setError('Could not complete request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300">
              {isRestoring ? <RefreshCw className="w-5 h-5 text-emerald-400" /> : <Archive className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isRestoring ? 'Restore Connection?' : 'Archive this connection?'}
              </h2>
              <p className="text-xs text-zinc-400">
                {connection.displayName} · {connection.relationshipType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2">
          <p className="text-xs text-zinc-300 leading-relaxed">
            {isRestoring
              ? "Restoring this connection will return it to your active connection list immediately with all existing history intact."
              : "Archived connections won't appear in your active connection list. All historical shared memories, notes, and goals remain safely preserved."}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-300 text-xs font-semibold hover:text-white transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAction}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isRestoring
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{isRestoring ? 'Restore Connection' : 'Archive Connection'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
