import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CoupleSpace, UserProfile } from '../types';
import { getConnectionLabel, getConnectionEmoji } from '../lib/connection';
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

interface SwitcherItem {
  space: CoupleSpace;
  partner: UserProfile | null;
}

export const ConnectionSwitcher: React.FC<ConnectionSwitcherProps> = ({ onOpenPairing }) => {
  const { currentUser, coupleSpace, setCoupleSpace } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [allConnections, setAllConnections] = useState<SwitcherItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    loadConnections();
  }, [currentUser?.uid, coupleSpace?.id]);

  const loadConnections = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'couples'), where('memberIds', 'array-contains', currentUser.uid));
      const snap = await getDocs(q);

      const items: SwitcherItem[] = [];
      for (const spaceDoc of snap.docs) {
        const space = { id: spaceDoc.id, ...spaceDoc.data() } as CoupleSpace;
        const partnerId = space.memberIds?.find(id => id !== currentUser.uid);
        let partnerData: UserProfile | null = null;

        if (partnerId) {
          try {
            const pSnap = await getDoc(doc(db, 'users', partnerId));
            if (pSnap.exists()) {
              partnerData = { uid: pSnap.id, ...pSnap.data() } as UserProfile;
            }
          } catch (e) {
            console.warn("Notice fetching partner profile for switcher:", e);
          }
        }

        items.push({ space, partner: partnerData });
      }

      setAllConnections(items);
    } catch (e) {
      console.warn("Error loading switcher connections:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSpace = (item: SwitcherItem) => {
    setCoupleSpace(item.space);
    setIsOpen(false);
  };

  const currentEmoji = getConnectionEmoji(coupleSpace?.connectionType);
  const currentLabel = getConnectionLabel(coupleSpace?.connectionType);

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-white/10 hover:border-white/20 text-white text-xs font-semibold flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
      >
        <span className="text-sm">{currentEmoji}</span>
        <span className="truncate max-w-[120px]">
          {coupleSpace?.name || currentLabel}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Switcher Dropdown Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Switch Connection</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of connections */}
            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {allConnections.map((item) => {
                const isCurrent = coupleSpace?.id === item.space.id;
                const partnerName = item.partner?.displayName || item.space.creatorName || 'Connection';
                const emoji = getConnectionEmoji(item.space.connectionType);
                const label = getConnectionLabel(item.space.connectionType);
                const isConnected = item.space.status === 'connected' || (item.space.memberIds && item.space.memberIds.length >= 2);

                return (
                  <button
                    key={item.space.id}
                    onClick={() => handleSelectSpace(item)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-rose-500/15 border-rose-500/40 text-white'
                        : 'bg-zinc-900/60 border-white/5 hover:border-white/15 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl border border-white/10 bg-zinc-950 flex items-center justify-center text-sm font-bold">
                        <span>{emoji}</span>
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-1.5">
                          <span>{partnerName}</span>
                          <span className="text-[10px] text-zinc-400 font-medium">({label})</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
                          {isConnected ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isCurrent && <Check className="w-4 h-4 text-rose-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* CTA: Add New Connection */}
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenPairing('options');
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-600 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Connection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
