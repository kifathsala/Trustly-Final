import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  limit,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DailyCheckIn, UserCheckIn, SharedCheckInSummary, SharedConversationStarter, CoupleGoal } from '../types';
import { DailyCheckInModal } from './DailyCheckInModal';
import { ConversationStartersModal } from './ConversationStartersModal';
import { CoupleGoalsModal } from './CoupleGoalsModal';
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
  Crown,
  History,
  Share2,
  Trophy,
  Target,
  Plus
} from 'lucide-react';

interface HomeDashboardProps {
  onNavigateTab: (tab: any) => void;
  onOpenPairing?: (mode?: 'create' | 'join' | 'options') => void;
  onOpenCoachWithTopic?: (topic: string) => void;
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt?: string;
  read?: boolean;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigateTab, onOpenPairing, onOpenCoachWithTopic }) => {
  const { currentUser, userProfile, partnerProfile, coupleSpace } = useAuth();
  const { isPlus, openPricingModal } = useSubscription();
  
  const [todayCheckedIn, setTodayCheckedIn] = useState<boolean>(false);
  const [todayUserCheckIn, setTodayUserCheckIn] = useState<UserCheckIn | null>(null);
  const [partnerSharedSummary, setPartnerSharedSummary] = useState<SharedCheckInSummary | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [recentCheckIns, setRecentCheckIns] = useState<UserCheckIn[]>([]);
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [checkInModalInitialTab, setCheckInModalInitialTab] = useState<'checkin' | 'history'>('checkin');

  // Things Worth Talking About state
  const [showConversationModal, setShowConversationModal] = useState<boolean>(false);
  const [conversationModalInitialTab, setConversationModalInitialTab] = useState<'create' | 'history'>('create');
  const [savedStartersCount, setSavedStartersCount] = useState<number>(0);
  const [partnerSharedConversation, setPartnerSharedConversation] = useState<SharedConversationStarter | null>(null);

  // Couple Goals state
  const [showGoalsModal, setShowGoalsModal] = useState<boolean>(false);
  const [goalsModalInitialMode, setGoalsModalInitialMode] = useState<'list' | 'create'>('list');
  const [goalsModalInitialTab, setGoalsModalInitialTab] = useState<'active' | 'milestones'>('active');
  const [coupleGoals, setCoupleGoals] = useState<CoupleGoal[]>([]);

  // Real notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false);

  const todayDateStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!userProfile) return;
    loadCheckIns();
    loadConversationStarters();
    loadNotifications();
  }, [userProfile, partnerProfile, coupleSpace]);

  // Real-time listener on couple goals
  useEffect(() => {
    if (!coupleSpace?.id) {
      setCoupleGoals([]);
      return;
    }

    const goalsCol = collection(db, 'couples', coupleSpace.id, 'goals');
    const unsub = onSnapshot(goalsCol, (snapshot) => {
      const items = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as CoupleGoal));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCoupleGoals(items);
    }, (err) => {
      console.warn("Couple goals listener notice:", err);
    });

    return () => unsub();
  }, [coupleSpace?.id]);

  const loadConversationStarters = async () => {
    if (!userProfile) return;
    try {
      // Load user's saved starters count
      const myStartersSnap = await getDocs(collection(db, 'users', userProfile.uid, 'conversationStarters'));
      setSavedStartersCount(myStartersSnap.size);

      // If in couple, check for any shared conversation starter from partner
      if (partnerProfile && coupleSpace?.id) {
        const sharedQ = query(collection(db, 'couples', coupleSpace.id, 'sharedConversations'), limit(5));
        const sharedSnap = await getDocs(sharedQ);
        const partnerItems = sharedSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as SharedConversationStarter))
          .filter(d => d.userId !== userProfile.uid);
        
        if (partnerItems.length > 0) {
          partnerItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setPartnerSharedConversation(partnerItems[0]);
        } else {
          setPartnerSharedConversation(null);
        }
      } else {
        setPartnerSharedConversation(null);
      }
    } catch (e) {
      console.warn("Notice loading conversation starters:", e);
    }
  };

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
      // 1. Load user's checkin for today from private collection
      const todayRef = doc(db, 'users', userProfile.uid, 'checkIns', todayDateStr);
      const todaySnap = await getDoc(todayRef);
      if (todaySnap.exists()) {
        const data = todaySnap.data() as UserCheckIn;
        setTodayUserCheckIn(data);
        setTodayCheckedIn(true);
      } else {
        setTodayUserCheckIn(null);
        setTodayCheckedIn(false);
      }

      // 2. Load user's past check-ins (real records only)
      const pastSnap = await getDocs(collection(db, 'users', userProfile.uid, 'checkIns'));
      const pastList = pastSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserCheckIn));
      pastList.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
      setRecentCheckIns(pastList);

      // 3. If in couple, check if partner shared summary today
      if (partnerProfile && coupleSpace?.id) {
        const partnerSummaryRef = doc(db, 'couples', coupleSpace.id, 'sharedCheckIns', todayDateStr);
        const partnerSummarySnap = await getDoc(partnerSummaryRef);
        if (partnerSummarySnap.exists()) {
          const pData = partnerSummarySnap.data() as SharedCheckInSummary;
          if (pData.userId !== userProfile.uid) {
            setPartnerSharedSummary(pData);
          } else {
            setPartnerSharedSummary(null);
          }
        } else {
          setPartnerSharedSummary(null);
        }
      } else {
        setPartnerSharedSummary(null);
      }
    } catch (e) {
      console.warn("Notice loading check-ins:", e);
    } finally {
      setLoadingData(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getFeelingScore = (feeling: string) => {
    switch (feeling) {
      case 'Very connected': return 5;
      case 'Good': return 4;
      case 'Okay': return 3;
      case 'Something is on my mind': return 2.5;
      case 'A little distant': return 2;
      default: return 3;
    }
  };

  // CALCULATE REAL METRICS ONLY - ZERO RANDOM, ZERO HARDCODED NUMBERS
  const totalRealCheckIns = recentCheckIns.length;
  const hasEnoughPulseData = totalRealCheckIns >= 3;

  // Real calculation from actual recorded checkIns
  const avgScore = hasEnoughPulseData
    ? recentCheckIns.reduce((acc, c) => acc + getFeelingScore(c.feeling), 0) / totalRealCheckIns
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

      {/* DAILY RELATIONSHIP CHECK-IN ENTRY POINT */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative">
          {!todayUserCheckIn ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  <span>Daily Relationship Check-In</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  {todayDateStr}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
                How are you feeling about your relationship today?
              </h3>
              <p className="text-xs text-zinc-400 mt-1 mb-5 leading-relaxed">
                A calm 30–60 second private reflection to notice your feelings and nurture mutual rhythm.
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCheckInModalInitialTab('checkin');
                    setShowCheckInModal(true);
                  }}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer ring-1 ring-white/20"
                >
                  <span>Start Check-In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCheckInModalInitialTab('history');
                    setShowCheckInModal(true);
                  }}
                  className="py-3.5 px-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-medium text-xs border border-white/10 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                  title="Past Check-ins"
                >
                  <History className="w-4 h-4" />
                  <span>History</span>
                </button>
              </div>
            </>
          ) : (
            /* Today's Check-in Complete Card */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{todayUserCheckIn.feelingEmoji || '❤️'}</span>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 block">
                      Today's Check-In Complete 💗
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {todayUserCheckIn.feeling}
                    </h3>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {todayUserCheckIn.shareWithPartner ? (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <Share2 className="w-2.5 h-2.5" /> Summary Shared
                    </span>
                  ) : (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-zinc-800 text-zinc-400 flex items-center gap-1 border border-white/5">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  )}
                </div>
              </div>

              {todayUserCheckIn.areas && todayUserCheckIn.areas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {todayUserCheckIn.areas.map(a => (
                    <span key={a} className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-zinc-900 text-zinc-300 border border-white/5">
                      {a}
                    </span>
                  ))}
                </div>
              )}

              {todayUserCheckIn.sharedSummary && (
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200 leading-relaxed">
                  <span className="text-purple-400 font-semibold block text-[10px] mb-0.5">Shared with partner:</span>
                  "{todayUserCheckIn.sharedSummary}"
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed for today
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckInModalInitialTab('checkin');
                      setShowCheckInModal(true);
                    }}
                    className="text-xs font-semibold text-rose-300 hover:text-rose-200 underline cursor-pointer"
                  >
                    Update
                  </button>
                  <span className="text-zinc-600">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckInModalInitialTab('history');
                      setShowCheckInModal(true);
                    }}
                    className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    View History
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Partner's Shared Reflection Card (When available from partner) */}
      {partnerProfile && partnerSharedSummary && (
        <div className="glass-card rounded-3xl p-5 border border-purple-500/30 bg-purple-950/15 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <span>💌</span>
              <span>Partner Reflection from {partnerProfile.displayName}</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {partnerSharedSummary.date}
            </span>
          </div>
          <p className="text-xs text-purple-100 font-medium leading-relaxed bg-black/30 p-3 rounded-2xl border border-purple-500/20">
            "{partnerSharedSummary.sharedSummary}"
          </p>
          {partnerSharedSummary.areas && partnerSharedSummary.areas.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {partnerSharedSummary.areas.map(a => (
                <span key={a} className="text-[9px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Partner's Shared Conversation Starter (When available from partner) */}
      {partnerProfile && partnerSharedConversation && (
        <div className="glass-card rounded-3xl p-5 border border-indigo-500/30 bg-indigo-950/15 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <span>💬</span>
              <span>Conversation Topic from {partnerProfile.displayName}</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
              {partnerSharedConversation.category}
            </span>
          </div>
          <p className="text-xs text-indigo-100 font-medium leading-relaxed bg-black/30 p-3 rounded-2xl border border-indigo-500/20">
            "{partnerSharedConversation.content.starter}"
          </p>
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-zinc-400">
              Open to talk through with warmth
            </span>
            {onOpenCoachWithTopic && (
              <button
                type="button"
                onClick={() => {
                  const prompt = `My partner ${partnerProfile.displayName} shared this conversation topic: "${partnerSharedConversation.content.starter}". How can I respond with curiosity, warmth, and emotional openness?`;
                  onOpenCoachWithTopic(prompt);
                }}
                className="text-xs font-semibold text-violet-300 hover:text-violet-200 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Talk to Coach</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* THINGS WORTH TALKING ABOUT CARD */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-36 h-36 bg-violet-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Things Worth Talking About</span>
            </div>
            {savedStartersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setConversationModalInitialTab('history');
                  setShowConversationModal(true);
                }}
                className="text-[11px] font-mono text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20 hover:bg-violet-500/20 transition-colors cursor-pointer"
              >
                {savedStartersCount} Saved
              </button>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
              Turn what's on your mind into a conversation.
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Transform sensitive relationship concerns into calm, respectful conversation starters.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setConversationModalInitialTab('create');
                setShowConversationModal(true);
              }}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-rose-600 text-white font-semibold text-xs shadow-lg shadow-purple-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer ring-1 ring-white/20"
            >
              <span>Start a Conversation</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setConversationModalInitialTab('history');
                setShowConversationModal(true);
              }}
              className="py-3.5 px-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-medium text-xs border border-white/10 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
              title="Your Conversation Starters"
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>
          </div>
        </div>
      </div>

      {/* YOUR GOALS CARD (For connected couples) */}
      {coupleSpace?.id && (
        <div className="glass-card rounded-3xl p-6 border border-white/10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative space-y-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
                <Target className="w-3.5 h-3.5 text-rose-400" />
                <span>Your Goals</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGoalsModalInitialTab('active');
                    setGoalsModalInitialMode('list');
                    setShowGoalsModal(true);
                  }}
                  className="text-[11px] font-mono text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  {coupleGoals.filter(g => g.status !== 'completed').length} Active
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGoalsModalInitialTab('milestones');
                    setGoalsModalInitialMode('list');
                    setShowGoalsModal(true);
                  }}
                  className="text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trophy className="w-3 h-3 text-purple-400" />
                  <span>{coupleGoals.filter(g => g.status === 'completed').length} Milestones</span>
                </button>
              </div>
            </div>

            {coupleGoals.length === 0 ? (
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
                    No shared goals yet.
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Choose something you'd like to work toward together.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setGoalsModalInitialMode('create');
                    setShowGoalsModal(true);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer ring-1 ring-white/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Goal</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
                    Build something together.
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Meaningful goals and shared milestones crafted with love.
                  </p>
                </div>

                {/* Latest Active Goal Preview */}
                {(() => {
                  const latestActive = coupleGoals.find(g => g.status !== 'completed');
                  if (!latestActive) return null;
                  return (
                    <div 
                      onClick={() => {
                        setGoalsModalInitialTab('active');
                        setGoalsModalInitialMode('list');
                        setShowGoalsModal(true);
                      }}
                      className="p-3 rounded-2xl bg-zinc-900/70 border border-white/5 hover:border-white/15 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                            {latestActive.category}
                          </span>
                          {latestActive.deadline && (
                            <span className="text-[10px] font-mono text-zinc-500">
                              • Due {latestActive.deadline}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white">
                          {latestActive.title}
                        </h4>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
                    </div>
                  );
                })()}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setGoalsModalInitialMode('create');
                      setShowGoalsModal(true);
                    }}
                    className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create a Goal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGoalsModalInitialMode('list');
                      setShowGoalsModal(true);
                    }}
                    className="py-3 px-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-medium text-xs border border-white/10 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>View All</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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

      {/* Daily Relationship Check-In Modal */}
      <DailyCheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        initialTab={checkInModalInitialTab}
        onOpenCoachWithTopic={onOpenCoachWithTopic}
        onCheckInCompleted={loadCheckIns}
      />

      {/* Things Worth Talking About Modal */}
      <ConversationStartersModal
        isOpen={showConversationModal}
        onClose={() => {
          setShowConversationModal(false);
          loadConversationStarters();
        }}
        initialTab={conversationModalInitialTab}
        onOpenCoachWithTopic={onOpenCoachWithTopic}
      />

      {/* Couple Goals & Shared Milestones Modal */}
      <CoupleGoalsModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        initialMode={goalsModalInitialMode}
        initialTab={goalsModalInitialTab}
      />
    </div>
  );
};
