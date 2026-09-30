import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { JournalEntry } from '../types';
import { 
  Lock, 
  Plus, 
  Share2, 
  Trash2, 
  BookHeart, 
  Check, 
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';

export const PrivateJournalView: React.FC = () => {
  const { userProfile, partnerProfile, coupleSpace } = useAuth();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [partnerSharedEntries, setPartnerSharedEntries] = useState<JournalEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'my_journal' | 'partner_shared'>('my_journal');

  // Form states
  const [feeling, setFeeling] = useState('');
  const [bothering, setBothering] = useState('');
  const [communicate, setCommunicate] = useState('');
  const [shareWithPartner, setShareWithPartner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    loadJournal();
  }, [userProfile]);

  const loadJournal = async () => {
    if (!userProfile) return;
    try {
      // 1. My private entries
      const q = query(
        collection(db, 'journalEntries'),
        where('userId', '==', userProfile.uid)
      );
      const snap = await getDocs(q);
      const myData = snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
      setEntries(myData);

      // 2. Partner voluntarily shared entries
      if (partnerProfile) {
        const pQ = query(
          collection(db, 'journalEntries'),
          where('userId', '==', partnerProfile.uid),
          where('isShared', '==', true)
        );
        const pSnap = await getDocs(pQ);
        const partnerData = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
        setPartnerSharedEntries(partnerData);
      }
    } catch (e) {
      console.warn("Journal load notice:", e);
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setLoading(true);
    try {
      const newEntry: JournalEntry = {
        userId: userProfile.uid,
        coupleId: coupleSpace?.id || undefined,
        feeling: feeling.trim(),
        bothering: bothering.trim(),
        communicate: communicate.trim(),
        isShared: shareWithPartner,
        createdAt: new Date().toISOString()
      };

      const ref = await addDoc(collection(db, 'journalEntries'), newEntry);
      setEntries([{ id: ref.id, ...newEntry }, ...entries]);

      // Reset form
      setFeeling('');
      setBothering('');
      setCommunicate('');
      setShareWithPartner(false);
      setIsCreating(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'journalEntries', id));
      setEntries(entries.filter(e => e.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium mb-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Encrypted Self-Reflection</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Private Journal</h1>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Entry</span>
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed -mt-3">
        Process your private thoughts without fear. Entries are private by default. Only share when you explicitly decide.
      </p>

      {/* Tabs if partner has shared entries */}
      {partnerProfile && partnerSharedEntries.length > 0 && (
        <div className="flex rounded-2xl bg-zinc-950/70 p-1 border border-white/5">
          <button
            onClick={() => setActiveTab('my_journal')}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'my_journal' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-zinc-400'
            }`}
          >
            My Journal ({entries.length})
          </button>
          <button
            onClick={() => setActiveTab('partner_shared')}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'partner_shared' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-zinc-400'
            }`}
          >
            Shared by {partnerProfile.displayName} ({partnerSharedEntries.length})
          </button>
        </div>
      )}

      {/* New Entry Form */}
      {isCreating && (
        <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white">Reflect & Clarify</h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveEntry} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                How am I feeling?
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. A bit overwhelmed and vulnerable today..."
                value={feeling}
                onChange={(e) => setFeeling(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                What's bothering me?
              </label>
              <textarea
                rows={2}
                placeholder="e.g. When plans changed last minute, I felt less prioritized..."
                value={bothering}
                onChange={(e) => setBothering(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                What do I want to communicate?
              </label>
              <textarea
                rows={2}
                placeholder="e.g. I’d love to have clear communication when schedules shift so I can adjust..."
                value={communicate}
                onChange={(e) => setCommunicate(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            {/* Explicit Share Toggle */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-rose-400" />
                <div>
                  <span className="text-xs font-semibold text-zinc-200 block">Share with partner</span>
                  <span className="text-[10px] text-zinc-400">Private by default. Your partner cannot access your private journal.</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareWithPartner}
                  onChange={(e) => setShareWithPartner(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !feeling.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-medium text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all"
            >
              {loading ? 'Saving...' : 'Save Journal Entry'}
            </button>
          </form>
        </div>
      )}

      {/* Entries Display */}
      {activeTab === 'my_journal' ? (
        <div className="space-y-4">
          {entries.length === 0 && !isCreating ? (
            <div className="glass-card rounded-3xl p-8 text-center border border-white/5">
              <span className="text-2xl mb-2 block">📖</span>
              <h4 className="text-sm font-semibold text-zinc-200 mb-1">Your Journal is empty</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-4">
                Use this safe space to write out your thoughts before speaking them out loud.
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-200 border border-white/10"
              >
                Write First Reflection
              </button>
            </div>
          ) : (
            entries.map((item) => (
              <div key={item.id} className="glass-card rounded-3xl p-5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-400">
                      {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {item.isShared ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Shared with Partner
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Only You
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-rose-400"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">How I'm Feeling</span>
                    <p className="text-zinc-100 font-medium">{item.feeling}</p>
                  </div>
                  {item.bothering && (
                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">What's Bothering Me</span>
                      <p className="text-zinc-300">{item.bothering}</p>
                    </div>
                  )}
                  {item.communicate && (
                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">What I Want to Communicate</span>
                      <p className="text-rose-300/90 font-medium bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                        {item.communicate}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {partnerSharedEntries.map((item) => (
            <div key={item.id} className="glass-card rounded-3xl p-5 border border-purple-500/20 bg-purple-950/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-300 font-semibold">
                  From {partnerProfile?.displayName}
                </span>
                <span className="text-zinc-400 text-[11px]">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase">How they feel</span>
                  <p className="text-white">{item.feeling}</p>
                </div>
                {item.communicate && (
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase">What they'd like to share</span>
                    <p className="text-purple-200">{item.communicate}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
