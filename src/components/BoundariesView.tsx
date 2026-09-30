import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BoundaryItem } from '../types';
import { 
  ShieldCheck, 
  Plus, 
  Check, 
  MessageCircle, 
  Clock, 
  Trash2, 
  Sparkles,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export const BoundariesView: React.FC = () => {
  const { userProfile, partnerProfile, coupleSpace } = useAuth();

  const [boundaries, setBoundaries] = useState<BoundaryItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BoundaryItem['category']>('Communication');
  const [loading, setLoading] = useState(false);

  const categories: BoundaryItem['category'][] = [
    'Communication',
    'Social Media',
    'Privacy',
    'Time Together',
    'Personal Space',
    'Friendships',
    'Finances',
    'Other'
  ];

  useEffect(() => {
    if (!coupleSpace) return;
    loadBoundaries();
  }, [coupleSpace]);

  const loadBoundaries = async () => {
    if (!coupleSpace) return;
    try {
      const q = query(collection(db, 'boundaries'), where('coupleId', '==', coupleSpace.id));
      const snap = await getDocs(q);
      setBoundaries(snap.docs.map(d => ({ id: d.id, ...d.data() } as BoundaryItem)));
    } catch (e) {
      console.warn("Load boundaries notice:", e);
    }
  };

  const handleCreateBoundary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleSpace || !userProfile || !title.trim()) return;

    setLoading(true);
    try {
      const newBoundary: BoundaryItem = {
        coupleId: coupleSpace.id,
        createdBy: userProfile.uid,
        creatorId: userProfile.uid,
        creatorName: userProfile.displayName,
        category,
        title: title.trim(),
        description: description.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const ref = await addDoc(collection(db, 'boundaries'), newBoundary);
      setBoundaries([{ id: ref.id, ...newBoundary }, ...boundaries]);

      setTitle('');
      setDescription('');
      setIsAddOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (item: BoundaryItem, nextStatus: 'pending' | 'discussing' | 'agreed') => {
    if (!item.id) return;
    setBoundaries(boundaries.map(b => b.id === item.id ? { ...b, status: nextStatus } : b));
    await updateDoc(doc(db, 'boundaries', item.id), { status: nextStatus });
  };

  const filteredBoundaries = filterCategory === 'All' 
    ? boundaries 
    : boundaries.filter(b => b.category === filterCategory);

  const getStatusBadge = (status: BoundaryItem['status']) => {
    if (status === 'agreed') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
          <Check className="w-3 h-3" /> Agreed
        </span>
      );
    }
    if (status === 'discussing') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
          <MessageCircle className="w-3 h-3" /> Discussing
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-zinc-500/15 border border-zinc-500/30 text-zinc-400 flex items-center gap-1">
        <Clock className="w-3 h-3" /> Proposed
      </span>
    );
  };

  if (!coupleSpace) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Your Couple Space is waiting.</h2>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Invite your partner to start establishing mutual boundaries and clear expectations together.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 animate-fadeIn">
      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider text-rose-400 font-semibold">
            Mutual Respect
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Our Boundaries</h1>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Propose Boundary</span>
        </button>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed -mt-3">
        Boundaries protect relationships, not separate them. Propose, discuss openly, and voluntarily agree without pressure.
      </p>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setFilterCategory('All')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filterCategory === 'All' 
              ? 'bg-rose-600 text-white' 
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          All ({boundaries.length})
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCategory(c)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterCategory === c 
                ? 'bg-rose-600 text-white' 
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Boundaries List */}
      <div className="space-y-3.5">
        {filteredBoundaries.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center border border-white/5">
            <span className="text-2xl mb-2 block">🌿</span>
            <h4 className="text-sm font-semibold text-zinc-200 mb-1">No boundaries proposed yet</h4>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-4">
              Clear expectations build safety. Propose communication preferences, social media boundaries, or personal space needs.
            </p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-200 border border-white/10"
            >
              Propose First Boundary
            </button>
          </div>
        ) : (
          filteredBoundaries.map((b) => (
            <div key={b.id} className="glass-card rounded-3xl p-5 border border-white/10 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      {b.category}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      By {b.creatorName || (b.creatorId === userProfile?.uid ? 'You' : 'Partner')}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{b.title}</h4>
                </div>
                {getStatusBadge(b.status)}
              </div>

              {b.description && (
                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/40 p-3 rounded-xl border border-white/5">
                  {b.description}
                </p>
              )}

              {/* Status Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                {b.status !== 'agreed' && (
                  <button
                    onClick={() => updateStatus(b, 'agreed')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Agree to Boundary</span>
                  </button>
                )}
                {b.status === 'pending' && (
                  <button
                    onClick={() => updateStatus(b, 'discussing')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Discuss</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Propose Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#111116] border border-white/15 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Propose a Relationship Boundary</h3>

            <form onSubmit={handleCreateBoundary} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-zinc-900 text-white">{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phone-free bedtime after 10 PM"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Explain why this boundary helps you feel peaceful, connected, and respected..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs font-medium border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-rose-600/20"
                >
                  {loading ? 'Submitting...' : 'Propose Boundary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
