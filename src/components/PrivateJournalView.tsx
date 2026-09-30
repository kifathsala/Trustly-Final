import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { JournalEntry } from '../types';
import { 
  Lock, 
  Plus, 
  Trash2, 
  ShieldCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';

export const PrivateJournalView: React.FC = () => {
  const { userProfile, coupleSpace } = useAuth();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [feeling, setFeeling] = useState('');
  const [bothering, setBothering] = useState('');
  const [communicate, setCommunicate] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) return;
    loadJournal();
  }, [userProfile]);

  const loadJournal = async () => {
    if (!userProfile) return;
    try {
      // STRICT OWNER-ONLY: Never query partner's private reflections
      const q = query(
        collection(db, 'journalEntries'),
        where('userId', '==', userProfile.uid)
      );
      const snap = await getDocs(q);
      const myData = snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
      myData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setEntries(myData);
    } catch (e) {
      console.warn("Journal load notice:", e);
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !feeling.trim()) return;

    setLoading(true);
    try {
      const newEntry: JournalEntry = {
        userId: userProfile.uid,
        coupleId: coupleSpace?.id || undefined,
        feeling: feeling.trim(),
        bothering: bothering.trim(),
        communicate: communicate.trim(),
        isShared: false,
        createdAt: new Date().toISOString()
      };

      const ref = await addDoc(collection(db, 'journalEntries'), newEntry);
      setEntries([{ id: ref.id, ...newEntry }, ...entries]);

      // Reset form
      setFeeling('');
      setBothering('');
      setCommunicate('');
      setIsCreating(false);
    } catch (err) {
      console.error("Save journal error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'journalEntries', id));
      setEntries(entries.filter(e => e.id !== id));
    } catch (err) {
      console.error("Delete journal error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-28 animate-fadeIn">
      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium mb-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Strictly Owner-Only</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Private Journal</h1>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Entry</span>
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed -mt-3">
        Process your private thoughts without fear. Entries are strictly private to your account. Your partner cannot read or access this journal.
      </p>

      {/* New Entry Form */}
      {isCreating && (
        <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Private Reflection</h3>
            </div>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveEntry} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                How am I feeling? *
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. A bit overwhelmed and vulnerable today..."
                value={feeling}
                onChange={(e) => setFeeling(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                What's on my mind or bothering me? (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. When plans changed last minute, I felt less prioritized..."
                value={bothering}
                onChange={(e) => setBothering(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                What would I like to express or communicate? (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. I’d love to have clear communication when schedules shift so I can adjust..."
                value={communicate}
                onChange={(e) => setCommunicate(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center gap-2 text-[11px] text-zinc-400">
              <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Only your account can view or delete this reflection.</span>
            </div>

            <button
              type="submit"
              disabled={loading || !feeling.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-medium text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Private Entry'}
            </button>
          </form>
        </div>
      )}

      {/* Entries Display */}
      <div className="space-y-4">
        {entries.length === 0 && !isCreating ? (
          <div className="glass-card rounded-3xl p-8 text-center border border-white/5">
            <span className="text-2xl mb-2 block">📖</span>
            <h4 className="text-sm font-semibold text-zinc-200 mb-1">No journal reflections yet.</h4>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-4">
              Use this safe space to write out your thoughts before speaking them out loud.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-200 border border-white/10 cursor-pointer"
            >
              Write First Reflection
            </button>
          </div>
        ) : (
          entries.map((item) => (
            <div key={item.id} className="glass-card rounded-3xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 flex items-center gap-1 border border-white/5">
                    <Lock className="w-2.5 h-2.5 text-rose-400" /> Only You
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">How I'm Feeling</span>
                  <p className="text-zinc-100 font-medium leading-relaxed">{item.feeling}</p>
                </div>
                {item.bothering && (
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">What's on My Mind</span>
                    <p className="text-zinc-300 leading-relaxed">{item.bothering}</p>
                  </div>
                )}
                {item.communicate && (
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Words to Share</span>
                    <p className="text-rose-300 font-medium bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 leading-relaxed">
                      {item.communicate}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
