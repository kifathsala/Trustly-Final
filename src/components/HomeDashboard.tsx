import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  limit,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  UserCheckIn, 
  SharedCheckInSummary, 
  SharedConversationStarter, 
  CoupleGoal, 
  SharedMemory,
  ImportantDate,
  BirthdayMessage,
  CoupleSpace,
  UserProfile,
  CONNECTION_TYPE_OPTIONS 
} from '../types';
import { DailyCheckInModal } from './DailyCheckInModal';
import { ConversationStartersModal } from './ConversationStartersModal';
import { CoupleGoalsModal } from './CoupleGoalsModal';
import { ConnectionSwitcher } from './ConnectionSwitcher';
import { isBirthdayToday } from '../lib/birthday';
import { generateBirthdayMessageCoach } from '../lib/gemini';
import { calculateDateDetails, getDateTypeDetails } from '../lib/dates';
import { 
  Heart, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  Lock, 
  ArrowRight, 
  MessageSquare, 
  Users, 
  Bell, 
  X,
  Target,
  Plus,
  Loader2,
  Check,
  ChevronRight,
  Clock,
  Calendar,
  Camera,
  Layers,
  Zap
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

interface UserConnectionData {
  space: CoupleSpace;
  partner: UserProfile | null;
}

interface ActivityItem {
  id: string;
  type: 'memory' | 'goal' | 'date' | 'checkin' | 'conversation';
  title: string;
  subtitle: string;
  dateStr: string;
  icon: string;
  space: CoupleSpace;
}

interface UpcomingDateItem {
  id: string;
  title: string;
  type: string;
  emoji: string;
  connectionContext: string;
  countdownText: string;
  formattedDate: string;
  diffDays: number;
  isToday: boolean;
  isTomorrow: boolean;
  space: CoupleSpace;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ 
  onNavigateTab, 
  onOpenPairing, 
  onOpenCoachWithTopic 
}) => {
  const { currentUser, userProfile, partnerProfile, coupleSpace, setCoupleSpace } = useAuth();
  const { isPlus } = useSubscription();

  // Loading states
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [userConnections, setUserConnections] = useState<UserConnectionData[]>([]);

  // Check-in states
  const [todayCheckedIn, setTodayCheckedIn] = useState<boolean>(false);
  const [todayUserCheckIn, setTodayUserCheckIn] = useState<UserCheckIn | null>(null);
  const [partnerSharedSummary, setPartnerSharedSummary] = useState<SharedCheckInSummary | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [checkInModalInitialTab, setCheckInModalInitialTab] = useState<'checkin' | 'history'>('checkin');

  // Conversation Starters state
  const [showConversationModal, setShowConversationModal] = useState<boolean>(false);
  const [partnerSharedConversation, setPartnerSharedConversation] = useState<SharedConversationStarter | null>(null);

  // Goals state
  const [showGoalsModal, setShowGoalsModal] = useState<boolean>(false);
  const [goalsModalInitialMode, setGoalsModalInitialMode] = useState<'list' | 'create'>('list');

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);

  // Birthday state
  const isUserBirthday = isBirthdayToday(userProfile?.dateOfBirth || userProfile?.birthday);
  const isPartnerBirthday = Boolean(
    partnerProfile?.shareBirthday && 
    isBirthdayToday(partnerProfile?.dateOfBirth || partnerProfile?.birthday)
  );
  const [receivedBirthdayMessages, setReceivedBirthdayMessages] = useState<BirthdayMessage[]>([]);
  const [showBirthdayComposer, setShowBirthdayComposer] = useState<boolean>(false);
  const [birthdayDraft, setBirthdayDraft] = useState<string>('');
  const [coachNotes, setCoachNotes] = useState<string>('');
  const [selectedTone, setSelectedTone] = useState<'heartfelt' | 'playful' | 'deeply_romantic' | 'grateful'>('heartfelt');
  const [isGeneratingCoachMsg, setIsGeneratingCoachMsg] = useState<boolean>(false);

  // Recent Activity Feed state
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [upcomingDates, setUpcomingDates] = useState<UpcomingDateItem[]>([]);

  const todayDateStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!userProfile || !currentUser) return;
    loadDashboardData();
  }, [userProfile?.uid, partnerProfile?.uid, coupleSpace?.id]);

  const getGreetingByTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadDashboardData = async () => {
    if (!currentUser) return;
    setLoadingData(true);
    try {
      // 1. Fetch user's connections
      const qConn = query(collection(db, 'couples'), where('memberIds', 'array-contains', currentUser.uid));
      const connSnap = await getDocs(qConn);
      const connList: UserConnectionData[] = [];

      for (const spaceDoc of connSnap.docs) {
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
            console.warn("Notice loading connection profile:", e);
          }
        }

        connList.push({ space, partner: partnerData });
      }
      setUserConnections(connList);

      // 2. Check today's private check-in
      const todayRef = doc(db, 'users', currentUser.uid, 'checkIns', todayDateStr);
      const todaySnap = await getDoc(todayRef);
      if (todaySnap.exists()) {
        const data = todaySnap.data() as UserCheckIn;
        setTodayUserCheckIn(data);
        setTodayCheckedIn(true);
      } else {
        setTodayUserCheckIn(null);
        setTodayCheckedIn(false);
      }

      // 3. Check partner's shared check-in summary today if in space
      if (partnerProfile && coupleSpace?.id) {
        const partnerSummaryRef = doc(db, 'couples', coupleSpace.id, 'sharedCheckIns', `${todayDateStr}_${partnerProfile.uid}`);
        const partnerSummarySnap = await getDoc(partnerSummaryRef);
        if (partnerSummarySnap.exists()) {
          setPartnerSharedSummary(partnerSummarySnap.data() as SharedCheckInSummary);
        } else {
          setPartnerSharedSummary(null);
        }
      }

      // 4. Fetch notifications count
      try {
        const notifRef = collection(db, 'notifications', currentUser.uid, 'items');
        const notifSnap = await getDocs(notifRef);
        setNotifications(notifSnap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)));
      } catch {
        setNotifications([]);
      }

      // 5. Load real recent activity if user has active connections
      if (connList.length > 0) {
        await loadRealRecentActivity(connList);
      } else {
        setRecentActivities([]);
      }

    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadRealRecentActivity = async (connectionsList: UserConnectionData[]) => {
    const activities: ActivityItem[] = [];
    const allUpcomingDates: UpcomingDateItem[] = [];

    for (const conn of connectionsList) {
      const space = conn.space;
      const partnerName = conn.partner?.displayName || space.creatorName || 'Connection';
      const label = getConnectionTypeBadge(space.connectionType).label;
      const prefix = `${partnerName} · ${label}`;

      try {
        // a. Shared Memories
        const memSnap = await getDocs(query(collection(db, 'couples', space.id, 'memories'), limit(3)));
        memSnap.docs.forEach(d => {
          const data = d.data() as SharedMemory;
          activities.push({
            id: d.id,
            type: 'memory',
            title: `${prefix} - ${data.title || 'Shared Memory'}`,
            subtitle: data.description ? `"${data.description.slice(0, 40)}${data.description.length > 40 ? '...' : ''}"` : 'Added a new memory to space',
            dateStr: data.date || (data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Recently'),
            icon: '📸',
            space: space
          });
        });

        // b. Goals
        const goalSnap = await getDocs(query(collection(db, 'couples', space.id, 'goals'), limit(3)));
        goalSnap.docs.forEach(d => {
          const data = d.data() as CoupleGoal;
          activities.push({
            id: d.id,
            type: 'goal',
            title: `${prefix} - ${data.title || 'Shared Goal'}`,
            subtitle: data.status === 'completed' ? 'Goal marked as completed! 🎉' : 'Active goal in progress',
            dateStr: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Recently',
            icon: '🎯',
            space: space
          });
        });

        // c. Important Dates
        const dateSnap = await getDocs(query(collection(db, 'couples', space.id, 'importantDates'), limit(5)));
        dateSnap.docs.forEach(d => {
          const data = d.data() as ImportantDate;
          const dateDetails = calculateDateDetails(data.date, data.repeatYearly);
          const typeDetails = getDateTypeDetails(data.type || data.category);

          activities.push({
            id: d.id,
            type: 'date',
            title: `${prefix} - ${data.title || 'Important Date'}`,
            subtitle: `${typeDetails.label} · ${dateDetails.countdownText}`,
            dateStr: data.date,
            icon: typeDetails.emoji,
            space: space
          });

          if (dateDetails.diffDays >= 0) {
            allUpcomingDates.push({
              id: d.id,
              title: data.title || 'Important Date',
              type: typeDetails.label,
              emoji: typeDetails.emoji,
              connectionContext: prefix,
              countdownText: dateDetails.countdownText,
              formattedDate: dateDetails.formattedDate,
              diffDays: dateDetails.diffDays,
              isToday: dateDetails.isToday,
              isTomorrow: dateDetails.isTomorrow,
              space: space
            });
          }
        });
      } catch (e) {
        console.warn(`Notice loading recent activity for space ${space.id}:`, e);
      }
    }

    allUpcomingDates.sort((a, b) => a.diffDays - b.diffDays);
    setUpcomingDates(allUpcomingDates.slice(0, 4));
    setRecentActivities(activities.slice(0, 5));
  };

  const getConnectionTypeBadge = (typeStr?: string) => {
    const matched = CONNECTION_TYPE_OPTIONS.find(
      opt => opt.type === typeStr || opt.label.toLowerCase() === (typeStr || '').toLowerCase()
    );
    if (matched) {
      return { label: matched.label, emoji: matched.emoji };
    }
    return { label: 'Partner / Lover', emoji: '❤️' };
  };

  const handleSelectConnectionCard = (conn: UserConnectionData) => {
    setCoupleSpace(conn.space);
    onNavigateTab('couple');
  };

  const handleGenerateCoachBirthdayMessage = async () => {
    if (!partnerProfile) return;
    setIsGeneratingCoachMsg(true);
    try {
      const generated = await generateBirthdayMessageCoach(
        partnerProfile.displayName || 'Partner',
        coachNotes,
        selectedTone
      );
      setBirthdayDraft(generated);
    } catch (err) {
      console.warn("Coach generator error:", err);
    } finally {
      setIsGeneratingCoachMsg(false);
    }
  };

  if (loadingData) {
    return (
      <div className="w-full space-y-6 pb-24 animate-pulse">
        <div className="flex items-center justify-between pt-2">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-white/10 rounded-full" />
            <div className="h-7 w-48 bg-white/10 rounded-xl" />
            <div className="h-3 w-56 bg-white/5 rounded-full" />
          </div>
          <div className="h-10 w-28 bg-white/10 rounded-full" />
        </div>
        <div className="h-32 rounded-3xl bg-zinc-900/60 border border-white/5" />
        <div className="h-36 rounded-3xl bg-zinc-900/60 border border-white/5" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="h-20 rounded-2xl bg-zinc-900/60 border border-white/5" />
          <div className="h-20 rounded-2xl bg-zinc-900/60 border border-white/5" />
          <div className="h-20 rounded-2xl bg-zinc-900/60 border border-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-28 animate-fadeIn">
      {/* ========================================================= */}
      {/* 1. HEADER */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {/* Abstract TRUSTLY Connection Icon */}
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 p-[1.5px] shadow-md shadow-rose-500/20">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center text-white">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              </div>
            </div>
            <span className="font-mono text-xs font-bold tracking-wider uppercase text-rose-300">
              TRUSTLY
            </span>
          </div>

          <span className="text-xs text-zinc-400 font-medium block">
            {getGreetingByTime()}
          </span>

          <h1 className="text-2xl font-extrabold tracking-tight text-white mt-0.5">
            Welcome back, {userProfile?.displayName || currentUser?.email?.split('@')[0] || 'Friend'} 👋
          </h1>

          <p className="text-xs text-zinc-400 mt-1 leading-snug">
            Make space for the relationships that matter.
          </p>
        </div>

        {/* Switcher & Notification Bell */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <ConnectionSwitcher onOpenPairing={(mode) => onOpenPairing ? onOpenPairing(mode) : onNavigateTab('connections')} />

          <button
            onClick={() => setShowNotificationsModal(true)}
            className="p-2.5 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-rose-500/30 text-zinc-300 hover:text-white transition-all relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center shadow-md">
                {notifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BIRTHDAY BANNER (IF APPLICABLE) */}
      {/* ========================================================= */}
      {isUserBirthday && (
        <div className="glass-card rounded-3xl p-5 border border-rose-500/30 bg-gradient-to-r from-rose-500/15 via-purple-500/10 to-amber-500/15 shadow-xl relative overflow-hidden animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-xl flex items-center justify-center shrink-0">
              🎉
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Happy Birthday! 🎂✨</h3>
              <p className="text-xs text-zinc-300 mt-0.5">
                Today is your special day. Wishing you warmth and joy.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MY CONNECTIONS SECTION */}
      {/* ========================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            <span>My Connections</span>
          </h2>

          <button
            onClick={() => onOpenPairing ? onOpenPairing('options') : onNavigateTab('connections')}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Connection</span>
          </button>
        </div>

        {userConnections.length === 0 ? (
          /* Empty Connections State */
          <div className="glass-card rounded-3xl p-6 border border-white/10 text-center space-y-3 bg-zinc-900/60">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">No connections yet.</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Choose someone important to you and create your first private connection.
              </p>
            </div>
            <button
              onClick={() => onOpenPairing ? onOpenPairing('options') : onNavigateTab('connections')}
              className="py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white font-semibold text-xs shadow-md shadow-rose-600/20 hover:opacity-95 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Connection</span>
            </button>
          </div>
        ) : (
          /* List of Real User Connections */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {userConnections.map((conn) => {
              const badge = getConnectionTypeBadge(conn.space.connectionType);
              const partnerName = conn.partner?.displayName || conn.space.creatorName || 'Connection';
              const isSelected = coupleSpace?.id === conn.space.id;
              const isConnected = conn.space.status === 'connected' || (conn.space.memberIds && conn.space.memberIds.length >= 2);

              return (
                <div
                  key={conn.space.id}
                  onClick={() => handleSelectConnectionCard(conn)}
                  className={`glass-card rounded-3xl p-4 border transition-all cursor-pointer relative overflow-hidden group shadow-lg ${
                    isSelected
                      ? 'border-rose-500/50 bg-rose-500/[0.06] ring-1 ring-rose-500/30'
                      : 'border-white/10 hover:border-white/20 bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-2xl border border-white/15 bg-zinc-950 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0 shadow-md">
                        {conn.partner?.photoURL ? (
                          <img src={conn.partner.photoURL} alt={partnerName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{partnerName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-white truncate max-w-[140px]">
                            {partnerName}
                          </h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-200 font-medium inline-flex items-center gap-1">
                            <span>{badge.emoji}</span>
                            <span>{badge.label}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          {isConnected ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Connection Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Pending Invitation</span>
                            </span>
                          )}

                          <span className="text-zinc-600">•</span>

                          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400">
                            <Lock className="w-3 h-3 text-zinc-500" />
                            <span>Private</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-400 group-hover:text-white transition-colors">
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. TODAY SECTION */}
      {/* ========================================================= */}
      <div className="glass-card rounded-3xl p-5 border border-white/10 bg-zinc-900/60 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              <span>Today</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              How are your connections feeling today?
            </p>
          </div>

          {todayCheckedIn && (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Check-in Complete</span>
            </span>
          )}
        </div>

        {/* Real Daily Check-in Card */}
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium">Your Daily Reflection</span>
            <span className="text-zinc-500 font-mono text-[10px]">{todayDateStr}</span>
          </div>

          {todayCheckedIn && todayUserCheckIn ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">{todayUserCheckIn.feelingEmoji || '✨'}</span>
              <div>
                <div className="text-xs font-bold text-white">Feeling {todayUserCheckIn.feeling}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  {todayUserCheckIn.shareWithPartner ? 'Shared with connection space' : 'Saved privately in your journal'}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 leading-relaxed">
              Take 60 seconds to reflect on your current mood and boundaries.
            </p>
          )}

          <button
            onClick={() => {
              setCheckInModalInitialTab('checkin');
              setShowCheckInModal(true);
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white font-semibold text-xs shadow-md shadow-rose-600/20 hover:opacity-95 active:scale-[0.985] cursor-pointer flex items-center justify-center gap-2 ring-1 ring-white/20 transition-all"
          >
            <span>{todayCheckedIn ? 'Update Daily Check-in' : 'Daily Check-in'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Partner Shared Summary (if available today) */}
        {partnerSharedSummary && partnerProfile && (
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-300 flex items-center gap-1.5">
                <span>{partnerSharedSummary.feelingEmoji || '🤝'}</span>
                <span>{partnerProfile.displayName || 'Connection'} shared today:</span>
              </span>
              <span className="text-[10px] text-purple-300/70 font-mono">Shared Pulse</span>
            </div>
            <p className="text-zinc-200 text-xs italic leading-relaxed">
              "{partnerSharedSummary.sharedSummary}"
            </p>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. QUICK ACTIONS GRID */}
      {/* ========================================================= */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Quick Actions</span>
        </h2>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {/* Action 1: Start a Conversation */}
          <button
            onClick={() => setShowConversationModal(true)}
            className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-rose-500/40 text-left transition-all group flex flex-col justify-between cursor-pointer active:scale-95 shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-white group-hover:text-rose-300 transition-colors">
                Start a Conversation
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Gentle starters
              </p>
            </div>
          </button>

          {/* Action 2: Shared Goal */}
          <button
            onClick={() => {
              setGoalsModalInitialMode('create');
              setShowGoalsModal(true);
            }}
            className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-violet-500/40 text-left transition-all group flex flex-col justify-between cursor-pointer active:scale-95 shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-3">
              <Target className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-white group-hover:text-violet-300 transition-colors">
                Shared Goal
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Build habits together
              </p>
            </div>
          </button>

          {/* Action 3: Add Memory */}
          <button
            onClick={() => onNavigateTab('couple')}
            className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-indigo-500/40 text-left transition-all group flex flex-col justify-between cursor-pointer active:scale-95 shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <Camera className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-white group-hover:text-indigo-300 transition-colors">
                Add Memory
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Save special moments
              </p>
            </div>
          </button>

          {/* Action 4: Important Date */}
          <button
            onClick={() => onNavigateTab('couple')}
            className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-emerald-500/40 text-left transition-all group flex flex-col justify-between cursor-pointer active:scale-95 shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors">
                Important Date
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Birthdays & milestones
              </p>
            </div>
          </button>

          {/* Action 5: TRUSTLY Coach */}
          <button
            onClick={() => onNavigateTab('coach')}
            className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-amber-500/40 text-left transition-all group flex flex-col justify-between cursor-pointer active:scale-95 shadow-md col-span-2 sm:col-span-1"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors">
                TRUSTLY Coach
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                AI communication advisor
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4.5. UPCOMING DATES ACROSS ALL CONNECTIONS */}
      {/* ========================================================= */}
      {upcomingDates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>Upcoming</span>
            </h2>
          </div>

          <div className="space-y-2">
            {upcomingDates.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.space) {
                    setCoupleSpace(item.space);
                  }
                  onNavigateTab('couple');
                }}
                className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-purple-500/30 transition-all flex items-center justify-between cursor-pointer group shadow-sm text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{item.emoji}</span>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-purple-300 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {item.connectionContext}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    item.isToday
                      ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                      : item.isTomorrow
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  }`}>
                    {item.countdownText}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. RECENT ACTIVITY */}
      {/* ========================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Recent Activity</span>
          </h2>

          {coupleSpace?.id && (
            <button
              onClick={() => onNavigateTab('couple')}
              className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>View Space</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentActivities.length === 0 ? (
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-white/5 text-center text-xs text-zinc-400">
            Nothing new yet.
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                onClick={() => {
                  if (act.space) {
                    setCoupleSpace(act.space);
                  }
                  onNavigateTab('couple');
                }}
                className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-white/15 transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{act.icon}</span>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-rose-300 transition-colors">
                      {act.title}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {act.subtitle}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-zinc-500">
                  {act.dateStr}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 6. PRIVACY CARD */}
      {/* ========================================================= */}
      <div className="glass-card rounded-3xl p-5 border border-emerald-500/30 bg-emerald-500/[0.04] space-y-3 relative overflow-hidden shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Private by Default</span>
          </div>

          <button
            onClick={() => onNavigateTab('privacy')}
            className="text-xs font-semibold text-emerald-300 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <span>Privacy Center →</span>
          </button>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Your personal reflections and private conversations stay yours unless you choose to share them.
        </p>

        <div className="pt-1 border-t border-emerald-500/10 flex items-center justify-between text-[10px] text-zinc-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Firebase Security Rule Enforced</span>
          </span>
          <span>Zero Secret Monitoring</span>
        </div>
      </div>

      {/* MODALS */}
      <DailyCheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        initialTab={checkInModalInitialTab}
        onOpenCoachWithTopic={onOpenCoachWithTopic}
      />

      <ConversationStartersModal
        isOpen={showConversationModal}
        onClose={() => setShowConversationModal(false)}
        onOpenCoachWithTopic={onOpenCoachWithTopic}
      />

      <CoupleGoalsModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        initialMode={goalsModalInitialMode}
      />

      {/* NOTIFICATIONS MODAL */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-rose-400" />
                <span>Notifications</span>
              </h3>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                No notifications right now.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 rounded-2xl bg-zinc-900 border border-white/5 text-xs space-y-1">
                    <div className="font-semibold text-white">{n.title}</div>
                    <div className="text-zinc-300 text-[11px]">{n.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
