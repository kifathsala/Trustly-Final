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
import { CoupleSpace, UserProfile, CONNECTION_TYPE_OPTIONS } from '../types';
import { 
  Users, 
  Plus, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Heart, 
  Loader2, 
  ShieldCheck,
  ChevronRight,
  UserCheck
} from 'lucide-react';

interface MyConnectionsViewProps {
  onOpenSpace: (coupleId: string) => void;
  onOpenPairing: (mode?: 'create' | 'join' | 'options') => void;
}

interface ConnectionCardData {
  space: CoupleSpace;
  partner: UserProfile | null;
}

export const MyConnectionsView: React.FC<MyConnectionsViewProps> = ({
  onOpenSpace,
  onOpenPairing
}) => {
  const { currentUser, userProfile, coupleSpace, setCoupleSpace } = useAuth();
  const [connections, setConnections] = useState<ConnectionCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    loadUserConnections();
  }, [currentUser, coupleSpace?.id]);

  const loadUserConnections = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'couples'), where('memberIds', 'array-contains', currentUser.uid));
      const snap = await getDocs(q);

      const items: ConnectionCardData[] = [];
      for (const spaceDoc of snap.docs) {
        const space = { id: spaceDoc.id, ...spaceDoc.data() } as CoupleSpace;
        
        // Find partner ID in memberIds
        const partnerId = space.memberIds?.find(id => id !== currentUser.uid);
        let partnerProfileData: UserProfile | null = null;

        if (partnerId) {
          try {
            const pSnap = await getDoc(doc(db, 'users', partnerId));
            if (pSnap.exists()) {
              partnerProfileData = { uid: pSnap.id, ...pSnap.data() } as UserProfile;
            }
          } catch (e) {
            console.warn("Notice fetching partner profile for card:", e);
          }
        }

        items.push({
          space,
          partner: partnerProfileData
        });
      }

      setConnections(items);
    } catch (err) {
      console.error("Error loading user connections:", err);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeDetails = (typeStr?: string) => {
    const matched = CONNECTION_TYPE_OPTIONS.find(opt => opt.type === typeStr || opt.label.toLowerCase() === (typeStr || '').toLowerCase());
    if (matched) {
      return { label: matched.label, emoji: matched.emoji };
    }
    return { label: 'Partner / Lover', emoji: '❤️' };
  };

  const handleSelectConnection = (conn: ConnectionCardData) => {
    setCoupleSpace(conn.space);
    onOpenSpace(conn.space.id);
  };

  return (
    <div className="space-y-6 pb-28 max-w-md mx-auto animate-fadeIn">
      {/* Top Header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Private Connections</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Connections</h1>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            The relationships that matter to you. Private by default, shared by choice.
          </p>
        </div>

        <button
          onClick={() => onOpenPairing('options')}
          className="p-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-600 text-white shadow-lg shadow-rose-500/20 hover:opacity-95 cursor-pointer shrink-0"
          title="Add Connection"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3 pt-2">
          <div className="h-28 rounded-3xl bg-zinc-900/60 border border-white/5 animate-pulse" />
          <div className="h-28 rounded-3xl bg-zinc-900/60 border border-white/5 animate-pulse" />
        </div>
      ) : connections.length === 0 ? (
        /* Empty State */
        <div className="glass-card rounded-3xl p-8 border border-white/10 text-center space-y-4 my-4 animate-scaleUp">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500/20 via-purple-600/20 to-indigo-600/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-xl">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-1">No connections yet</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              TRUSTLY helps you build clearer, healthier communication with the people who matter in your life.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onOpenPairing('options')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white font-semibold text-xs sm:text-sm shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer flex items-center justify-center gap-2 ring-1 ring-white/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create or Join Connection</span>
            </button>
          </div>
        </div>
      ) : (
        /* Connections List */
        <div className="space-y-3.5 pt-1">
          {connections.map((conn) => {
            const isCurrentActive = coupleSpace?.id === conn.space.id;
            const badge = getBadgeDetails(conn.space.connectionType);
            const partnerDisplayName = conn.partner?.displayName || conn.space.creatorName || 'Connection Partner';
            const isConnected = conn.space.status === 'connected' || (conn.space.memberIds && conn.space.memberIds.length >= 2);

            return (
              <div
                key={conn.space.id}
                className={`glass-card rounded-3xl p-5 border transition-all relative overflow-hidden group shadow-xl ${
                  isCurrentActive 
                    ? 'border-rose-500/50 bg-rose-500/[0.06] ring-1 ring-rose-500/30' 
                    : 'border-white/10 hover:border-white/20 bg-zinc-900/60'
                }`}
              >
                {/* Active space indicator */}
                {isCurrentActive && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-l from-rose-500 to-rose-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-bl-xl shadow-md">
                    Current Space
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {/* Person Avatar */}
                    <div className="w-12 h-12 rounded-2xl border border-white/15 bg-zinc-950 flex items-center justify-center text-white font-bold text-base overflow-hidden shrink-0 shadow-md">
                      {conn.partner?.photoURL ? (
                        <img src={conn.partner.photoURL} alt={partnerDisplayName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{partnerDisplayName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-white truncate max-w-[160px]">
                          {partnerDisplayName}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-200 font-semibold inline-flex items-center gap-1">
                          <span>{badge.emoji}</span>
                          <span>{badge.label}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        {isConnected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Connection Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Pending Invitation</span>
                          </span>
                        )}

                        <span className="text-zinc-600">•</span>

                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                          <Lock className="w-3 h-3 text-zinc-500" />
                          <span>Private</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                    {conn.space.name || 'Private Space'}
                  </span>

                  <button
                    onClick={() => handleSelectConnection(conn)}
                    className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-violet-500/20 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer group-hover:border-rose-500/40"
                  >
                    <span>Open Space</span>
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security Reassurance */}
      <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex items-center gap-2.5 text-zinc-400 text-xs">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Each connection is strictly isolated. Private journals and personal AI chats remain private to you alone.</span>
      </div>
    </div>
  );
};
