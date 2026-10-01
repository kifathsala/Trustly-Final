import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, UserCheck, HeartHandshake, Check, Loader2 } from 'lucide-react';
import { ConnectionItem, CONNECTION_TYPE_OPTIONS, ConnectionType } from '../types';
import { InitialsAvatar } from './InitialsAvatar';

interface EditConnectionModalProps {
  connection: ConnectionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (connectionId: string, customName: string, relationshipType: ConnectionType | string) => Promise<void>;
}

export const EditConnectionModal: React.FC<EditConnectionModalProps> = ({
  connection,
  isOpen,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [relationshipType, setRelationshipType] = useState<ConnectionType | string>('other');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (connection) {
      setName(connection.displayName || '');
      setRelationshipType(connection.rawConnectionType || 'other');
      setError(null);
    }
  }, [connection]);

  if (!isOpen || !connection) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Connection display name cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(connection.id, name.trim(), relationshipType);
      onClose();
    } catch (err: any) {
      console.error('Error updating connection:', err);
      setError('Failed to update connection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <InitialsAvatar
              name={connection.displayName}
              photoURL={connection.partner?.photoURL}
              size="md"
            />
            <div>
              <h2 className="text-base font-bold text-white">Edit Connection</h2>
              <p className="text-xs text-zinc-400">Personalize this relationship in your space</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Security Banner */}
        <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-start gap-2.5 text-violet-300 text-xs">
          <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Changes here affect how this connection appears in your TRUSTLY account. It does not alter your connection's private account.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
              Connection Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mom, Arun, Sarah"
              maxLength={40}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 text-sm transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
              Relationship Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONNECTION_TYPE_OPTIONS.map((opt) => {
                const isSelected = relationshipType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setRelationshipType(opt.type)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-violet-600/20 border-violet-500/60 text-white ring-1 ring-violet-500/40'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/15'
                    }`}
                  >
                    <span className="text-xs font-bold truncate">{opt.label}</span>
                    <span className="text-[10px] text-zinc-400 truncate mt-0.5">{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-300 text-xs font-semibold hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-bold shadow-lg shadow-violet-500/20 hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
