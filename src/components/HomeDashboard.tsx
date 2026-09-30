import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  limit,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DailyCheckIn } from '../types';
import { 
  Heart, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  Send, 
  Lock, 
  ArrowRight, 
  MessageSquare, 
  Users, 
  Compass, 
  Bell, 
  X,
  Crown
} from 'lucide-react';

interface HomeDashboardProps {
  onNavigateTab: (tab: any) => void;
  onOpenPairing?: (mode?: 'create' | 'join' | 'options') => void;
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt?: string;
  read?: boolean;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigateTab, onOpenPairing }) => {
  const { currentUser, userProfile, partnerProfile, coupleSpace } = useAuth();
  const { isPlus, openPricingModal } = useSubscription();
  
  const [selectedScore, setSelectedScore] = useState<number>(4);
  const [betterText, setBetterText] = useState<string>('');
  const [shareWithPartner, setShareWithPartner] = useState<boolean>(true);
  const [todayCheckedIn, setTodayCheckedIn] = useState<boolean>(false);
  const [loadingCheckIn, setLoadingCheckIn] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [recentCheckIns, setRecentCheckIns] = useState<DailyCheckIn[]>([]);
  const [partnerCheckIn, setPartnerCheckIn] = useState<DailyCheckIn | null>(null);

  // Real notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false);

  const todayDateStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!userProfile) return;
    loadCheckIns();
    loadNotifications();
  }, [userProfile, partnerProfile, coupleSpace]);

  const loadNotifications = async () => {
    if (!userProfile) return;
    setLoadingNotifications(true);
    try {
      const notifRef = collection(db, 'notifications', userProfile.uid, 'items');
      const snap = await getDocs(notifRef);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      setNotifications(items);
    } catch (e) {
      // In case subcollection doesn't exist yet, notifications list defaults to empty
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const loadCheckIns = async () => {
    if (!userProfile) return;
    setLoadingData(true);
    try {
      // Load user's checkin for today
      const userCheckInRef = collection(db, 'checkIns');
      const q = query(
        userCheckInRef, 
        where('userId', '==', userProfile.uid),
        where('date', '==', todayDateStr),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setTodayCheckedIn(true);
        const data = snap.docs[0].data() as DailyCheckIn;
        setSelectedScore(data.connectionScore);
        setBetterText(data.betterResponse || '');
      } else {
        setTodayCheckedIn(false);
      }

      // Load user's past check-ins (real records only)
      const pastQ = query(
        collection(db, 'checkIns'),
        where('userId', '==', userProfile.uid),
        limit(14)
      );
      const pastSnap = await getDocs(pastQ);
      const pastList = pastSnap.docs.map(d => ({ id: d.id, ...d.data() } as DailyCheckIn));
      setRecentCheckIns(pastList);

      // If in couple, check if partner shared today
      if (partnerProfile && coupleSpace) {
        const partnerQ = query(
          collection(db, 'checkIns'),
          where('userId', '==', partnerProfile.uid),
          where('date', '==', todayDateStr),
          where('isShared', '==', true),
          limit(1)
        );
        const pSnap = await getDocs(partnerQ);
        if (!pSnap.empty) {
          setPartnerCheckIn(pSnap.docs[0].data() as DailyCheckIn);
        } else {
          setPartnerCheckIn(null);
        }
      }
    } catch (e) {
      console.warn("Notice loading check-ins:", e);
    } finally {
      setLoadingData(false);
    }
  };

  const submitTodayCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setLoadingCheckIn(true);
    try {
      const checkInId = `${userProfile.uid}_${todayDateStr}`;
      const newCheckIn: DailyCheckIn = {
        userId: userProfile.uid,
        coupleId: coupleSpace?.id || undefined,
        connectionScore: selectedScore,
        betterResponse: betterText.trim() || undefined,
        isShared: shareWithPartner,
        date: todayDateStr,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'checkIns', checkInId), newCheckIn);
      setTodayCheckedIn(true);
      await loadCheckIns();
    } catch (err) {
      console.error("Check-in submit error:", err);
    } finally {
      setLoadingCheckIn(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // CALCULATE REAL METRICS ONLY - ZERO RANDOM, ZERO HARDCODED NUMBERS
  const totalRealCheckIns = recentCheckIns.length;
  const hasEnoughPulseData = totalRealCheckIns >= 3;

  // Real calculation from actual recorded checkIns
  const avgScore = hasEnoughPulseData
    ? recentCheckIns.reduce((acc, c) => acc + (c.connectionScore || 3), 0) / totalRealCheckIns
    : 0;

  const realConnectionPct = hasEnoughPulseData ? Math.min(100, Math.round((avgScore / 5) * 100)) : 0;
  const realConsistencyPct = hasEnoughPulseData ? Math.min(100, Math.round((totalRealCheckIns / 7) * 100)) : 0;

  // SKELETON LOADING STATE: Never display fake data while loading
  if (loadingData) {
    return (
      <div className="space-y-6 pb-24 animate-pulse">
        {/* Top Header Skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div className="space-y-2">
            <div className="h-3 w-20 bg-white/10 rounded-full" />
            <div className="h-7 w-36 bg-white/10 rounded-xl" />
          </div>
          <div className="h-8 w-32 bg-white/10 rounded-full" />
        </div>

        {/* Pulse Skeleton */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-white/10 rounded" />
                <div className="h-2.5 w-44 bg-white/5 rounded" />
              </div>
            </div>
          </div>
          <div className="py-6 px-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col items-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-white/10" />
            <div className="h-4 w-48 bg-white/10 rounded" />
            <div className="h-3 w-64 bg-white/5 rounded" />
          </div>
        </div>

        {/* Check-in Skeleton */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="h-4 w-28 bg-white/10 rounded" />
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-white/5" />
            ))}
          </div>
          <div className="h-10 rounded-xl bg-white/5" />
          <div className="h-12 rounded-2xl bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
            {getGreeting()}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>{userProfile?.displayName || currentUser?.email?.split('@')[0] || 'User'}</span>
            <span className="inline-block animate-pulse">✨</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Real Notification Bell */}
          <button
            onClick={() => setShowNotificationsModal(true)}
            className="p-2 rounded-full glass-panel border border-white/10 hover:border-rose-500/30 text-zinc-300 hover:text-white transition-all relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center shadow-md">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Couple Connection Badge */}
          <div 
            onClick={() => onOpenPairing ? onOpenPairing('options') : onNavigateTab('couple')}
            className="cursor-pointer glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 hover:border-rose-500/30 transition-all"
          >
            {partnerProfile ? (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-xs font-medium text-zinc-200">
                  Connected with {partnerProfile.displayName || 'Partner'}
                </span>
              </>
            ) : coupleSpace && (coupleSpace.status === 'waiting' || (coupleSpace.memberIds && coupleSpace.memberIds.length === 1)) ? (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-medium text-amber-300">Waiting for partner</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-xs font-medium text-zinc-400">No partner connected yet</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 1. CREATE COUPLE SPACE CARD (When user has no couple) */}
      {!userProfile?.coupleId && (
        <div className="glass-card rounded-3xl p-6 border border-white/10 relative overflow-hidden shadow-2xl animate-fadeIn">
          <div className="flex items-center gap-3.5 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-purple-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Your Couple Space is waiting.
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Create a private space and invite your partner.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={() => onOpenPairing ? onOpenPairing('create') : onNavigateTab('couple')}
              className="py-3.5 px-3 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Create Couple Space</span>
            </button>
            <button
              onClick={() => onOpenPairing ? onOpenPairing('join') : onNavigateTab('couple')}
              className="py-3.5 px-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 font-medium text-xs border border-white/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Join with Code</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. WAITING FOR PARTNER CARD (When couple is created but waiting) */}
      {userProfile?.coupleId && coupleSpace && (coupleSpace.status === 'waiting' || (coupleSpace.memberIds && coupleSpace.memberIds.length === 1)) && (
        <div 
          onClick={() => onOpenPairing ? onOpenPairing('options') : onNavigateTab('couple')}
          className="glass-card rounded-3xl p-5 border border-amber-500/30 bg-amber-500/[0.04] cursor-pointer hover:border-amber-500/50 transition-all animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-center">
                <Heart className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                  {coupleSpace.name || 'Your Couple Space'}
                </span>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Waiting for your partner…</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-xs font-bold text-amber-300 bg-black/40 px-2.5 py-1 rounded-lg border border-amber-500/20 block">
                {coupleSpace.inviteCode}
              </span>
              <span className="text-[9px] text-zinc-400 mt-1 block">Tap to share</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. COUPLE DASHBOARD (Connected Couple Visualization) */}
      {userProfile?.coupleId && coupleSpace && (coupleSpace.status === 'connected' || (coupleSpace.memberIds && coupleSpace.memberIds.length >= 2)) && (
        <div className="glass-card rounded-3xl p-5 border border-white/10 relative overflow-hidden shadow-2xl animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold">
                {coupleSpace.name}
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>You're connected.</span>
                <span className="text-rose-500 text-xs">❤️</span>
              </h3>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
              Connected
            </span>
          </div>

          {/* Two-Node Profile Visualization */}
          <div className="flex items-center justify-center gap-4 py-2">
            {/* User Node */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border-2 border-rose-500/50 overflow-hidden bg-zinc-900 flex items-center justify-center text-white font-bold text-base shadow-md">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
              <span className="text-[10px] text-zinc-300 font-semibold mt-1.5 truncate max-w-[70px]">
                {userProfile?.displayName || 'You'}
              </span>
            </div>

            {/* Bridge */}
            <div className="flex-1 max-w-[100px] relative flex items-center justify-center">
              <div className="w-full h-[1.5px] bg-gradient-to-r from-rose-500/50 via-purple-500/50 to-indigo-500/50" />
              <div className="absolute w-5 h-5 rounded-full bg-zinc-950 border border-rose-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
              </div>
            </div>

            {/* Partner Node */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500/50 overflow-hidden bg-zinc-900 flex items-center justify-center text-white font-bold text-base shadow-md">
                {partnerProfile?.photoURL ? (
                  <img src={partnerProfile.photoURL} alt={partnerProfile.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{partnerProfile?.displayName?.charAt(0).toUpperCase() || 'P'}</span>
                )}
              </div>
              <span className="text-[10px] text-zinc-300 font-semibold mt-1.5 truncate max-w-[70px]">
                {partnerProfile?.displayName || 'Partner'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Card: Relationship Pulse (Uses Real Data Only) */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-44 h-44 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center shadow-md">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Relationship Pulse</h3>
                <span className="text-[11px] text-zinc-400 block">
                  {hasEnoughPulseData ? 'Based on your real submitted check-ins.' : 'Requires active check-ins to compute.'}
                </span>
              </div>
            </div>

            {hasEnoughPulseData && (
              <div className="text-right">
                <span className="text-xs font-semibold text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                  {totalRealCheckIns} Check-ins Logged
                </span>
              </div>
            )}
          </div>

          {/* If there isn't enough real shared data: Proper empty state */}
          {!hasEnoughPulseData ? (
            <div className="py-6 px-4 text-center rounded-2xl bg-zinc-950/60 border border-white/5 my-2">
              <Compass className="w-8 h-8 text-rose-400/80 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                Your Relationship Pulse will appear after you complete your first shared check-ins.
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-4 leading-relaxed">
                TRUSTLY never invents fake scores. Once you and your partner log 3 real reflections, your pulse metrics will emerge naturally.
              </p>
              <span className="text-[11px] text-zinc-500 font-mono">
                {totalRealCheckIns} / 3 check-ins recorded
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>Connection</span>
                  <span className="font-semibold text-rose-300">{realConnectionPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-700" 
                    style={{ width: `${realConnectionPct}%` }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>Consistency</span>
                  <span className="font-semibold text-blue-300">{realConsistencyPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-700" 
                    style={{ width: `${realConsistencyPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 text-[11px] text-zinc-400 text-center flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-zinc-400" />
            <span>Not a diagnostic tool. Voluntary signals designed to guide positive dialogue.</span>
          </div>
        </div>
      </div>

      {/* Today's Check-in Card */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 relative shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Today's Check-in</span>
              {todayCheckedIn && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Take 30 seconds to reflect on your connection today.
            </p>
          </div>
          <span className="text-[11px] text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
            {todayDateStr}
          </span>
        </div>

        <form onSubmit={submitTodayCheckIn} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              How connected do you feel today?
            </label>

            {/* 1 - 5 scale buttons */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { score: 1, label: 'Distant' },
                { score: 2, label: 'Quiet' },
                { score: 3, label: 'Okay' },
                { score: 4, label: 'Close' },
                { score: 5, label: 'Connected' },
              ].map((item) => {
                const isSelected = selectedScore === item.score;
                return (
                  <button
                    type="button"
                    key={item.score}
                    onClick={() => setSelectedScore(item.score)}
                    className={`py-3 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/25 scale-[1.03]' 
                        : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 border border-white/5'
                    }`}
                  >
                    <span className="text-base font-bold">{item.score}</span>
                    <span className="text-[9px] mt-0.5 truncate max-w-full px-0.5 opacity-85">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              What would make today better? <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Taking a walk together without our phones..."
              value={betterText}
              onChange={(e) => setBetterText(e.target.value)}
              className="w-full bg-zinc-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Privacy & sharing control */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/50 border border-white/5">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs text-zinc-300">Share with partner</span>
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
            disabled={loadingCheckIn}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-medium text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loadingCheckIn ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{todayCheckedIn ? 'Update Today\'s Check-in' : 'Submit Today\'s Check-in'}</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Partner's shared checkin if available */}
      {partnerProfile && partnerCheckIn && (
        <div className="glass-card rounded-3xl p-5 border border-purple-500/20 bg-purple-950/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
              <span>❤️</span>
              <span>{partnerProfile.displayName}'s Check-in Today</span>
            </span>
            <span className="text-xs font-bold text-white bg-purple-500/20 px-2 py-0.5 rounded-md">
              Level {partnerCheckIn.connectionScore}/5
            </span>
          </div>
          {partnerCheckIn.betterResponse ? (
            <p className="text-xs text-zinc-300 italic bg-zinc-950/60 p-3 rounded-xl border border-white/5">
              "{partnerCheckIn.betterResponse}"
            </p>
          ) : (
            <p className="text-xs text-zinc-400">
              {partnerProfile.displayName} checked in feeling connected today.
            </p>
          )}
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 gap-3.5">
        <button
          onClick={() => onNavigateTab('trust')}
          className="p-4 rounded-3xl bg-zinc-900/70 border border-white/10 hover:border-rose-500/30 text-left transition-all group flex flex-col justify-between cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-2">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white group-hover:text-rose-300">Trust Check</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">Answer privately & compare safely</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('coach')}
          className="p-4 rounded-3xl bg-zinc-900/70 border border-white/10 hover:border-indigo-500/30 text-left transition-all group flex flex-col justify-between cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300">AI Coach</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">Communicate clearly & gently</p>
          </div>
        </button>
      </div>

      {/* TRUSTLY Plus Discovery Card (for Free users) */}
      {!isPlus && (
        <div 
          onClick={() => openPricingModal('dashboard_banner')}
          className="glass-card rounded-3xl p-4.5 border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-purple-500/10 flex items-center justify-between cursor-pointer shadow-lg hover:border-amber-500/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-white">TRUSTLY Plus</h4>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  ₹199/MO
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">Go deeper together. Advanced Coach & relationship insights.</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
        </div>
      )}

      {/* Things Worth Talking About Quick Banner */}
      <div 
        onClick={() => onNavigateTab('trust')}
        className="cursor-pointer glass-panel p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-300 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">Things Worth Talking About</h4>
            <p className="text-[10px] text-zinc-400">Notice distance or changes? Start a healthy conversation.</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-zinc-400" />
      </div>

      {/* Real Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121216] border border-white/10 rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Notifications</h3>
              </div>
              <button 
                onClick={() => setShowNotificationsModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingNotifications ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                <span className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin inline-block mb-2" />
                <p>Checking updates...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400 space-y-2">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
                  <Bell className="w-5 h-5 opacity-60" />
                </div>
                <p className="font-semibold text-zinc-300">No new notifications.</p>
                <p className="text-[11px] text-zinc-400">When your partner shares reflections or completes check-ins, updates will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl bg-zinc-950/70 border border-white/5 text-xs">
                    <h5 className="font-semibold text-white">{n.title}</h5>
                    <p className="text-zinc-300 text-[11px] mt-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowNotificationsModal(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-white/5"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
