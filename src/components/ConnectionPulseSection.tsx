import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SharedConnectionCheckIn, SharedMemory, CoupleGoal, ImportantDate } from '../types';
import { 
  computeFactualConnectionPulse, 
  getConnectionCheckInCopy, 
  getFeelingDetails 
} from '../lib/checkIn';
import { TrustlyImage } from './TrustlyImage';
import { 
  Activity, 
  Lock, 
  Users, 
  Calendar, 
  ArrowRight, 
  History, 
  Sparkles, 
  CheckCircle2,
  Clock,
  Tag,
  Target,
  Camera,
  CalendarHeart
} from 'lucide-react';

interface ConnectionPulseSectionProps {
  onOpenCheckIn: () => void;
  onOpenHistory: (tab?: 'history' | 'shared') => void;
  className?: string;
}

export const ConnectionPulseSection: React.FC<ConnectionPulseSectionProps> = ({
  onOpenCheckIn,
  onOpenHistory,
  className = ''
}) => {
  const { currentUser, coupleSpace, partnerProfile } = useAuth();
  const [sharedCheckIns, setSharedCheckIns] = useState<SharedConnectionCheckIn[]>([]);
  const [memoriesCount, setMemoriesCount] = useState<number>(0);
  const [activeGoalsCount, setActiveGoalsCount] = useState<number>(0);
  const [nextDateText, setNextDateText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const connectionId = coupleSpace?.id;
  const partnerName = partnerProfile?.displayName || coupleSpace?.creatorName || 'Your Connection';
  const copy = getConnectionCheckInCopy(coupleSpace?.connectionType);

  useEffect(() => {
    if (!connectionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Shared check-ins listener
    const sharedRef = collection(db, 'couples', connectionId, 'sharedCheckIns');
    const unsubCheckIns = onSnapshot(sharedRef, (snap) => {
      const items: SharedConnectionCheckIn[] = snap.docs.map(d => ({
        id: d.id,
        connectionId,
        ...d.data()
      } as SharedConnectionCheckIn));

      setSharedCheckIns(items);
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    // Real-time counts for factual summary
    const unsubMemories = onSnapshot(collection(db, 'couples', connectionId, 'memories'), (snap) => {
      setMemoriesCount(snap.docs.length);
    }, () => {});

    const unsubGoals = onSnapshot(collection(db, 'couples', connectionId, 'goals'), (snap) => {
      const active = snap.docs.filter(d => d.data().status !== 'completed' && !d.data().isCompleted && !d.data().completedAt).length;
      setActiveGoalsCount(active);
    }, () => {});

    const unsubDates = onSnapshot(collection(db, 'couples', connectionId, 'importantDates'), (snap) => {
      const dates = snap.docs.map(d => d.data() as ImportantDate);
      if (dates.length > 0) {
        // Find closest date
        const sorted = [...dates].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        const next = sorted[0];
        if (next && next.date) {
          const dObj = new Date(next.date);
          const formatted = isNaN(dObj.getTime()) ? next.date : dObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          setNextDateText(`${next.title}: ${formatted}`);
        } else {
          setNextDateText(null);
        }
      } else {
        setNextDateText(null);
      }
    }, () => {});

    return () => {
      unsubCheckIns();
      unsubMemories();
      unsubGoals();
      unsubDates();
    };
  }, [connectionId]);

  if (!coupleSpace || !currentUser) return null;

  const pulse = computeFactualConnectionPulse(
    sharedCheckIns,
    currentUser.uid,
    partnerName
  );

  const hasAnyActivity = sharedCheckIns.length > 0 || memoriesCount > 0 || activeGoalsCount > 0 || !!nextDateText;

  return (
    <div className={`glass-card rounded-3xl p-5 border border-white/10 space-y-4 bg-zinc-900/40 relative overflow-hidden shadow-xl animate-fadeIn ${className}`}>
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-violet-600/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Connection Pulse</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 font-normal">
                Factual
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">Real shared activity & reflections</p>
          </div>
        </div>

        <button
          onClick={() => onOpenHistory('shared')}
          className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
        >
          <History className="w-3.5 h-3.5" />
          <span>View History</span>
        </button>
      </div>

      {/* Factual Information Cards */}
      <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-3">
        {!hasAnyActivity ? (
          <div className="py-3 text-center space-y-1">
            <p className="text-xs font-semibold text-zinc-300">No shared activity yet.</p>
            <p className="text-[11px] text-zinc-500">Your shared moments will appear here.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                  Recent Activity
                </div>
                <div className="text-sm font-semibold text-white leading-snug">
                  {pulse.summaryMessage}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-zinc-300 font-mono block tabular-nums">
                  {pulse.totalSharedCount}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  shared check-in{pulse.totalSharedCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Factual Activity Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-white/5 text-[11px]">
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2 text-zinc-300">
                <Camera className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{memoriesCount} {memoriesCount === 1 ? 'shared memory' : 'shared memories'}</span>
              </div>

              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2 text-zinc-300">
                <Target className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span className="truncate">{activeGoalsCount} {activeGoalsCount === 1 ? 'active goal' : 'active goals'}</span>
              </div>

              {nextDateText && (
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2 text-zinc-300 col-span-2 sm:col-span-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate font-medium">{nextDateText}</span>
                </div>
              )}
            </div>

            {/* Factual Area Insight if any */}
            {pulse.areasSummaryText && (
              <div className="p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/15 flex items-center gap-2 text-xs text-violet-200">
                <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span className="leading-relaxed">{pulse.areasSummaryText}</span>
              </div>
            )}

            {/* Latest Shared Feeling details */}
            {pulse.latestSharedFeeling && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 shrink-0">
                    <TrustlyImage
                      src={pulse.latestSharedFeeling.image}
                      alt={pulse.latestSharedFeeling.label}
                      fallbackType="reaction"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-white font-medium">
                      {pulse.latestSharedBy}: {pulse.latestSharedFeeling.label}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      {pulse.lastSharedRelative} ({pulse.lastSharedDateStr})
                    </span>
                  </div>
                </div>

                {pulse.topMentionedAreas.length > 0 && (
                  <div className="flex items-center gap-1">
                    {pulse.topMentionedAreas.slice(0, 2).map(({ area }) => (
                      <span key={area} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">
                        {area}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onOpenCheckIn}
          className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-violet-600/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Check In</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onOpenHistory('history')}
          className="py-3 px-4 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900 border border-white/10 text-zinc-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>My Check-Ins</span>
        </button>
      </div>

      {/* Privacy Guarantee Footer */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>Personal reflections are private by default</span>
        </span>
        <span>Based solely on shared data</span>
      </div>
    </div>
  );
};
