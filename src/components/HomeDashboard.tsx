import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useActiveConnection } from '../context/ActiveConnectionContext';
import { 
  collection, 
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
  CoupleSpace,
  UserProfile,
  ConnectionItem,
  CONNECTION_TYPE_OPTIONS 
} from '../types';
import { DailyCheckInModal } from './DailyCheckInModal';
import { ConversationStartersModal } from './ConversationStartersModal';
import { CoupleGoalsModal } from './CoupleGoalsModal';
import { ConnectionSwitcher } from './ConnectionSwitcher';
import { InitialsAvatar } from './InitialsAvatar';
import { calculateDateDetails } from '../lib/dates';
import { 
  Users, 
  Plus, 
  Search, 
  X, 
  Activity, 
  MessageSquare, 
  Target, 
  Calendar, 
  Camera, 
  StickyNote, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Bell, 
  ArrowRight, 
  ChevronRight, 
  Loader2, 
  BookOpen, 
  SlidersHorizontal,
  ExternalLink,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';

interface HomeDashboardProps {
  onNavigateTab: (tab: any) => void;
  onOpenPairing?: (mode?: 'create' | 'join' | 'options') => void;
  onOpenCoachWithTopic?: (topic: string) => void;
}

interface SharedActivityItem {
  id: string;
  connectionId: string;
  connectionName: string;
  relationshipType: string;
  type: 'memory' | 'goal' | 'date' | 'checkin' | 'note';
  title: string;
  timestamp: string;
}

interface SearchResultItem {
  id: string;
  type: 'connection' | 'memory' | 'goal' | 'date' | 'note' | 'checkin';
  title: string;
  subtitle: string;
  connectionId?: string;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ 
  onNavigateTab, 
  onOpenPairing, 
  onOpenCoachWithTopic 
}) => {
  const { currentUser, userProfile } = useAuth();
  const { 
    connections, 
    activeConnections, 
    activeConnection, 
    activeConnectionId, 
    setActiveConnectionId, 
    loading: connectionsLoading 
  } = useActiveConnection();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Connection Filter on Home
  const [connectionFilter, setConnectionFilter] = useState<string>('all');

  // Modals
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInInitialTab, setCheckInInitialTab] = useState<'checkin' | 'history'>('checkin');
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goalsInitialMode, setGoalsInitialMode] = useState<'list' | 'create'>('list');

  // Factual Private Space Counts
  const [privateCheckInCount, setPrivateCheckInCount] = useState<number>(0);
  const [privateJournalCount, setPrivateJournalCount] = useState<number>(0);
  const [privateBoundariesCount, setPrivateBoundariesCount] = useState<number>(0);
  const [aiCoachConversationsCount, setAiCoachConversationsCount] = useState<number>(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);

  // Factual Connection Metrics & Shared Activity
  const [connectionMetrics, setConnectionMetrics] = useState<Record<string, { memories: number; goals: number; checkIns: number; dates: number }>>({});
  const [recentSharedActivities, setRecentSharedActivities] = useState<SharedActivityItem[]>([]);
  const [upcomingDates, setUpcomingDates] = useState<Array<{ id: string; title: string; diffDays: number; connectionName: string; formattedDate: string; isToday: boolean }>>([]);
  const [pendingInvites, setPendingInvites] = useState<ConnectionItem[]>([]);

  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // 1. Fetch Private Counts for the Authenticated User (STRICT OWNER ISOLATION)
  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchPrivateCounts = async () => {
      try {
        // A. Private check-ins
        const checkInsSnap = await getDocs(
          query(collection(db, 'users', currentUser.uid, 'checkIns'), limit(50))
        ).catch(() => null);
        if (checkInsSnap) {
          setPrivateCheckInCount(checkInsSnap.size);
        }

        // B. Private Journal Entries
        const journalSnap = await getDocs(
          query(collection(db, 'journalEntries'), where('userId', '==', currentUser.uid), limit(50))
        ).catch(() => null);
        if (journalSnap) {
          setPrivateJournalCount(journalSnap.size);
        }

        // C. AI Coach Conversations
        const aiSnap = await getDocs(
          query(collection(db, 'users', currentUser.uid, 'aiConversations'), limit(50))
        ).catch(() => null);
        if (aiSnap) {
          setAiCoachConversationsCount(aiSnap.size);
        }

        // D. Boundaries
        const boundariesSnap = await getDocs(
          query(collection(db, 'boundaries'), where('createdBy', '==', currentUser.uid), limit(50))
        ).catch(() => null);
        if (boundariesSnap) {
          setPrivateBoundariesCount(boundariesSnap.size);
        }

        // E. Notifications Unread
        const notifSnap = await getDocs(
          query(collection(db, 'users', currentUser.uid, 'notifications'), where('isRead', '==', false), limit(20))
        ).catch(() => null);
        if (notifSnap) {
          setUnreadNotificationCount(notifSnap.size);
        }
      } catch (err) {
        console.warn('Notice fetching private space metrics:', err);
      }
    };

    fetchPrivateCounts();
  }, [currentUser?.uid]);

  // 2. Fetch factual connection metrics, upcoming dates, and recent shared activities across active connections
  useEffect(() => {
    if (!currentUser?.uid || activeConnections.length === 0) {
      setLoadingDashboard(false);
      setRecentSharedActivities([]);
      setUpcomingDates([]);
      setPendingInvites([]);
      return;
    }

    setLoadingDashboard(true);
    setDashboardError(null);

    const loadSharedData = async () => {
      try {
        const metricsMap: Record<string, { memories: number; goals: number; checkIns: number; dates: number }> = {};
        const activities: SharedActivityItem[] = [];
        const datesList: Array<{ id: string; title: string; diffDays: number; connectionName: string; formattedDate: string; isToday: boolean }> = [];
        const pendingList: ConnectionItem[] = [];

        for (const conn of activeConnections) {
          if (conn.status === 'waiting') {
            pendingList.push(conn);
          }

          metricsMap[conn.id] = { memories: 0, goals: 0, checkIns: 0, dates: 0 };

          // A. Fetch recent memories
          try {
            const memSnap = await getDocs(
              query(collection(db, 'couples', conn.id, 'memories'), limit(5))
            );
            metricsMap[conn.id].memories = memSnap.size;
            memSnap.docs.forEach((doc) => {
              const data = doc.data();
              if (data.createdAt) {
                activities.push({
                  id: doc.id,
                  connectionId: conn.id,
                  connectionName: conn.displayName,
                  relationshipType: conn.relationshipType,
                  type: 'memory',
                  title: data.title ? `Memory: ${data.title}` : 'Shared a new memory',
                  timestamp: data.createdAt
                });
              }
            });
          } catch (e) {
            // ignore permission errors on subcollection
          }

          // B. Fetch goals
          try {
            const goalsSnap = await getDocs(
              query(collection(db, 'couples', conn.id, 'goals'), limit(5))
            );
            metricsMap[conn.id].goals = goalsSnap.size;
            goalsSnap.docs.forEach((doc) => {
              const data = doc.data();
              if (data.createdAt) {
                activities.push({
                  id: doc.id,
                  connectionId: conn.id,
                  connectionName: conn.displayName,
                  relationshipType: conn.relationshipType,
                  type: 'goal',
                  title: data.title ? `Goal: ${data.title}` : 'Shared goal created',
                  timestamp: data.createdAt
                });
              }
            });
          } catch (e) {
            // ignore
          }

          // C. Fetch Important Dates
          try {
            const datesSnap = await getDocs(
              query(collection(db, 'couples', conn.id, 'importantDates'), limit(5))
            );
            metricsMap[conn.id].dates = datesSnap.size;
            datesSnap.docs.forEach((doc) => {
              const data = doc.data() as ImportantDate;
              if (data.date) {
                const dateDetail = calculateDateDetails(data.date);
                if (dateDetail.diffDays >= 0 && dateDetail.diffDays <= 14) {
                  datesList.push({
                    id: doc.id,
                    title: data.title || 'Important Date',
                    diffDays: dateDetail.diffDays,
                    connectionName: conn.displayName,
                    formattedDate: dateDetail.formattedDate,
                    isToday: dateDetail.isToday
                  });
                }
              }
            });
          } catch (e) {
            // ignore
          }

          // D. Fetch Shared Check-Ins
          try {
            const checkInsSnap = await getDocs(
              query(collection(db, 'couples', conn.id, 'sharedCheckIns'), limit(5))
            );
            metricsMap[conn.id].checkIns = checkInsSnap.size;
            checkInsSnap.docs.forEach((doc) => {
              const data = doc.data();
              if (data.createdAt) {
                activities.push({
                  id: doc.id,
                  connectionId: conn.id,
                  connectionName: conn.displayName,
                  relationshipType: conn.relationshipType,
                  type: 'checkin',
                  title: data.feeling ? `Shared check-in: Feeling ${data.feeling}` : 'Check-in shared',
                  timestamp: data.createdAt
                });
              }
            });
          } catch (e) {
            // ignore
          }
        }

        // Sort activities chronologically (newest first)
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Sort upcoming dates (closest first)
        datesList.sort((a, b) => a.diffDays - b.diffDays);

        setConnectionMetrics(metricsMap);
        setRecentSharedActivities(activities.slice(0, 6));
        setUpcomingDates(datesList);
        setPendingInvites(pendingList);
      } catch (err: any) {
        console.error('Error loading dashboard shared metrics:', err);
        setDashboardError('Unable to load some shared activity.');
      } finally {
        setLoadingDashboard(false);
      }
    };

    loadSharedData();
  }, [currentUser?.uid, activeConnections]);

  // 3. Global Private Search across user's connections and shared items
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const q = searchQuery.toLowerCase().trim();
    const results: SearchResultItem[] = [];

    // A. Search connections
    activeConnections.forEach((conn) => {
      if (
        conn.displayName.toLowerCase().includes(q) ||
        conn.relationshipType.toLowerCase().includes(q)
      ) {
        results.push({
          id: `conn-${conn.id}`,
          type: 'connection',
          title: conn.displayName,
          subtitle: `Connection · ${conn.relationshipType}`,
          connectionId: conn.id
        });
      }
    });

    // B. Search loaded activities/dates
    recentSharedActivities.forEach((act) => {
      if (act.title.toLowerCase().includes(q) || act.connectionName.toLowerCase().includes(q)) {
        results.push({
          id: `act-${act.id}`,
          type: act.type,
          title: act.title,
          subtitle: `Shared with ${act.connectionName}`,
          connectionId: act.connectionId
        });
      }
    });

    upcomingDates.forEach((d) => {
      if (d.title.toLowerCase().includes(q) || d.connectionName.toLowerCase().includes(q)) {
        results.push({
          id: `date-${d.id}`,
          type: 'date',
          title: d.title,
          subtitle: `${d.connectionName} · ${d.formattedDate}`
        });
      }
    });

    setSearchResults(results);
    setIsSearching(false);
  }, [searchQuery, activeConnections, recentSharedActivities, upcomingDates]);

  // 4. Filter categories for connections (only categories that actually have active connections)
  const existingCategories = useMemo(() => {
    const types = new Set(activeConnections.map((c) => c.rawConnectionType));
    return CONNECTION_TYPE_OPTIONS.filter((opt) => types.has(opt.type));
  }, [activeConnections]);

  const filteredConnections = useMemo(() => {
    if (connectionFilter === 'all') return activeConnections;
    return activeConnections.filter((c) => c.rawConnectionType === connectionFilter);
  }, [activeConnections, connectionFilter]);

  const handleOpenConnection = async (connId: string) => {
    await setActiveConnectionId(connId);
    onNavigateTab('couple');
  };

  const formatActivityTime = (isoString?: string) => {
    if (!isoString) return 'Recently';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'memory': return <Camera className="w-4 h-4 text-pink-400" />;
      case 'goal': return <Target className="w-4 h-4 text-violet-400" />;
      case 'date': return <Calendar className="w-4 h-4 text-purple-400" />;
      case 'checkin': return <Activity className="w-4 h-4 text-rose-400" />;
      case 'note': return <StickyNote className="w-4 h-4 text-amber-400" />;
      default: return <Sparkles className="w-4 h-4 text-zinc-400" />;
    }
  };

  const greetingName = userProfile?.displayName || currentUser?.displayName || 'there';

  return (
    <div className="w-full space-y-6 pb-28 animate-fadeIn">
      {/* 1. Header & Privacy Indicator */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Good to see you, {greetingName}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
            Your private space for the relationships that matter.
          </p>
        </div>

        {/* Zero-Trust Privacy Pill */}
        <button
          onClick={() => onNavigateTab('privacy')}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-2xl bg-zinc-900/90 border border-white/10 hover:border-emerald-500/40 text-left transition-all cursor-pointer shadow-sm group flex items-center gap-2"
          title="Privacy Center"
        >
          <div className="w-6 h-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-white group-hover:text-emerald-300 transition-colors">
              Private by default
            </span>
            <span className="block text-[9px] text-zinc-500">
              Shared only when you choose
            </span>
          </div>
        </button>
      </div>

      {/* 2. Global Search ("Search TRUSTLY") */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TRUSTLY (connections, memories, goals, dates)..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-white placeholder:text-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-violet-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic Search Results Dropdown */}
        {searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-white/15 rounded-3xl p-3 shadow-2xl z-30 space-y-2 animate-scaleUp">
            <div className="flex items-center justify-between px-2 pb-1 border-b border-white/5 text-[11px] text-zinc-400">
              <span>Results ({searchResults.length})</span>
              <span className="text-[10px] text-zinc-500">Only your accessible data</span>
            </div>

            {searchResults.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400">
                No matching connections or shared items found.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {searchResults.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => {
                      setSearchQuery('');
                      if (res.connectionId) {
                        handleOpenConnection(res.connectionId);
                      } else {
                        onNavigateTab('connections');
                      }
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-zinc-900 text-left flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="p-1.5 rounded-lg bg-zinc-900 border border-white/5">
                        {getActivityIcon(res.type)}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                          {res.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {res.subtitle}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Main Dashboard Responsive Layout (Desktop 2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN (lg: 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section: Today */}
          <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">Today</h2>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* Factual Today Items */}
            {upcomingDates.length > 0 || pendingInvites.length > 0 || unreadNotificationCount > 0 ? (
              <div className="space-y-2">
                {/* Upcoming date notice */}
                {upcomingDates.slice(0, 2).map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-white">{d.title}</span>
                        <span className="text-zinc-400 text-[11px] block truncate">
                          {d.connectionName} · {d.isToday ? 'Happening Today' : `In ${d.diffDays} days (${d.formattedDate})`}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-extrabold shrink-0">
                      {d.isToday ? 'Today' : `${d.diffDays}d`}
                    </span>
                  </div>
                ))}

                {/* Pending invitation alert */}
                {pendingInvites.slice(0, 1).map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => onNavigateTab('connections')}
                    className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-amber-500/15 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-white">{inv.displayName}</span>
                        <span className="text-amber-300/80 text-[11px] block">
                          Invitation waiting for connection to join
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold shrink-0">
                      Review
                    </span>
                  </div>
                ))}

                {/* Unread notification banner */}
                {unreadNotificationCount > 0 && (
                  <div
                    onClick={() => onNavigateTab('connections')}
                    className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-rose-500/15 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Bell className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="font-semibold text-zinc-200 truncate">
                        You have {unreadNotificationCount} unread notification{unreadNotificationCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  </div>
                )}
              </div>
            ) : (
              /* Factual Empty Today Notice */
              <div className="py-4 px-3 rounded-2xl bg-zinc-900/40 border border-white/5 flex items-center gap-3 text-xs text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Nothing needs your attention today.</span>
              </div>
            )}
          </div>

          {/* Section: Your Connections */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">Your Connections</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold">
                  {activeConnections.length}
                </span>
              </div>

              {activeConnections.length > 0 && (
                <button
                  onClick={() => onNavigateTab('connections')}
                  className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Connection Filter Chips (if multiple categories exist) */}
            {existingCategories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => setConnectionFilter('all')}
                  className={`py-1 px-2.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                    connectionFilter === 'all'
                      ? 'bg-violet-600/20 border-violet-500/50 text-white'
                      : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All ({activeConnections.length})
                </button>
                {existingCategories.map((cat) => {
                  const count = activeConnections.filter((c) => c.rawConnectionType === cat.type).length;
                  return (
                    <button
                      key={cat.type}
                      onClick={() => setConnectionFilter(cat.type)}
                      className={`py-1 px-2.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                        connectionFilter === cat.type
                          ? 'bg-violet-600/20 border-violet-500/50 text-white'
                          : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Connections Grid / Empty State */}
            {connectionsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="h-36 rounded-3xl bg-zinc-900/60 border border-white/5 animate-pulse" />
                <div className="h-36 rounded-3xl bg-zinc-900/60 border border-white/5 animate-pulse" />
              </div>
            ) : filteredConnections.length === 0 ? (
              /* Empty Connections State */
              <div className="glass-card rounded-3xl p-7 border border-white/10 text-center space-y-3.5 animate-scaleUp">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-pink-600/20 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Build your first connection.</h3>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                    Create a private space for someone who matters to you.
                  </p>
                </div>
                <div className="pt-1 flex justify-center gap-2">
                  <button
                    onClick={() => (onOpenPairing ? onOpenPairing('options') : onNavigateTab('connections'))}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-bold shadow-lg shadow-violet-500/20 hover:opacity-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Connection</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredConnections.map((conn) => {
                  const isCurrentActive = activeConnectionId === conn.id;
                  const metrics = connectionMetrics[conn.id] || { memories: 0, goals: 0, checkIns: 0, dates: 0 };
                  
                  // Construct factual activity string
                  const summaryParts: string[] = [];
                  if (metrics.memories > 0) summaryParts.push(`${metrics.memories} memory${metrics.memories > 1 ? 'ies' : ''}`);
                  if (metrics.goals > 0) summaryParts.push(`${metrics.goals} goal${metrics.goals > 1 ? 's' : ''}`);
                  if (metrics.checkIns > 0) summaryParts.push(`${metrics.checkIns} check-in${metrics.checkIns > 1 ? 's' : ''}`);
                  const activitySummary = summaryParts.length > 0 ? summaryParts.join(' · ') : 'No shared activity yet';

                  return (
                    <div
                      key={conn.id}
                      className={`glass-card rounded-3xl p-4 border transition-all flex flex-col justify-between group shadow-lg ${
                        isCurrentActive
                          ? 'border-violet-500/50 bg-violet-500/[0.05] ring-1 ring-violet-500/30'
                          : 'border-white/10 hover:border-white/20 bg-zinc-900/60'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <InitialsAvatar
                              name={conn.displayName}
                              photoURL={conn.partner?.photoURL}
                              size="md"
                            />
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-white truncate">
                                {conn.displayName}
                              </h3>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-semibold inline-block mt-0.5">
                                {conn.relationshipType}
                              </span>
                            </div>
                          </div>

                          {conn.status === 'waiting' ? (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold shrink-0">
                              Pending
                            </span>
                          ) : (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold shrink-0">
                              Connected
                            </span>
                          )}
                        </div>

                        {/* Factual Activity Summary */}
                        <p className="text-[11px] text-zinc-400 truncate">
                          {activitySummary}
                        </p>
                      </div>

                      <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-end">
                        <button
                          onClick={() => handleOpenConnection(conn.id)}
                          className="py-1.5 px-3 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-white text-xs font-semibold border border-violet-500/30 flex items-center gap-1 transition-all cursor-pointer group-hover:border-violet-500/60"
                        >
                          <span>Open Connection</span>
                          <ChevronRight className="w-3 h-3 text-violet-300 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Recent Shared Activity */}
          <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">Recent Shared Activity</h2>
              </div>
              <span className="text-[10px] text-zinc-500">
                Shared spaces only
              </span>
            </div>

            {loadingDashboard ? (
              <div className="space-y-2">
                <div className="h-12 rounded-2xl bg-zinc-900/60 border border-white/5 animate-pulse" />
                <div className="h-12 rounded-2xl bg-zinc-900/60 border border-white/5 animate-pulse" />
              </div>
            ) : recentSharedActivities.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400">
                No shared activity yet. Moments you share with your connections will appear here.
              </div>
            ) : (
              <div className="space-y-2">
                {recentSharedActivities.map((act) => (
                  <div
                    key={`${act.type}-${act.id}`}
                    onClick={() => handleOpenConnection(act.connectionId)}
                    className="p-3 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-zinc-950 border border-white/10 shrink-0">
                        {getActivityIcon(act.type)}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-white group-hover:text-violet-300 transition-colors block truncate">
                          {act.title}
                        </span>
                        <span className="text-[10px] text-zinc-400 block truncate">
                          {act.connectionName} ({act.relationshipType})
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                      {formatActivityTime(act.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (lg: 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section: Your Private Space */}
          <div className="glass-card rounded-3xl p-5 border border-violet-500/20 bg-gradient-to-b from-violet-950/20 to-zinc-950/40 space-y-4 shadow-xl">
            <div className="border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">Your Private Space</h2>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Things only you can see. Never shared with any connection.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Card 1: Private Check-Ins */}
              <button
                onClick={() => {
                  setCheckInInitialTab('history');
                  setShowCheckInModal(true);
                }}
                className="p-3.5 rounded-2xl bg-zinc-900/70 border border-white/5 hover:border-violet-500/40 text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[90px]"
              >
                <div className="flex items-center justify-between text-zinc-400">
                  <Activity className="w-4 h-4 text-rose-400" />
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">
                    {privateCheckInCount > 0 ? privateCheckInCount : '0'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                    Private Check-Ins
                  </h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                    {privateCheckInCount > 0 ? `${privateCheckInCount} reflections` : 'Nothing here yet'}
                  </p>
                </div>
              </button>

              {/* Card 2: AI Coach */}
              <button
                onClick={() => onNavigateTab('coach')}
                className="p-3.5 rounded-2xl bg-zinc-900/70 border border-white/5 hover:border-violet-500/40 text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[90px]"
              >
                <div className="flex items-center justify-between text-zinc-400">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">
                    {aiCoachConversationsCount > 0 ? aiCoachConversationsCount : 'Active'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                    AI Coach
                  </h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                    {aiCoachConversationsCount > 0 ? `${aiCoachConversationsCount} conversations` : 'Start coaching'}
                  </p>
                </div>
              </button>

              {/* Card 3: Private Reflections / Journal */}
              <button
                onClick={() => onNavigateTab('journal')}
                className="p-3.5 rounded-2xl bg-zinc-900/70 border border-white/5 hover:border-violet-500/40 text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[90px]"
              >
                <div className="flex items-center justify-between text-zinc-400">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">
                    {privateJournalCount > 0 ? privateJournalCount : '0'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                    Private Reflections
                  </h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                    {privateJournalCount > 0 ? `${privateJournalCount} entries` : 'Nothing here yet'}
                  </p>
                </div>
              </button>

              {/* Card 4: Personal Boundaries */}
              <button
                onClick={() => onNavigateTab('boundaries')}
                className="p-3.5 rounded-2xl bg-zinc-900/70 border border-white/5 hover:border-violet-500/40 text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[90px]"
              >
                <div className="flex items-center justify-between text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">
                    {privateBoundariesCount > 0 ? privateBoundariesCount : '0'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                    Personal Notes
                  </h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                    {privateBoundariesCount > 0 ? `${privateBoundariesCount} boundaries` : 'Nothing here yet'}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Section: Quick Actions */}
          <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">Quick Actions</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => (onOpenPairing ? onOpenPairing('options') : onNavigateTab('connections'))}
                className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-violet-500/30 text-left flex items-center gap-2.5 cursor-pointer transition-all group"
              >
                <Plus className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                  Add Connection
                </span>
              </button>

              <button
                onClick={() => {
                  setCheckInInitialTab('checkin');
                  setShowCheckInModal(true);
                }}
                className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-violet-500/30 text-left flex items-center gap-2.5 cursor-pointer transition-all group"
              >
                <Activity className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                  Check In
                </span>
              </button>

              <button
                onClick={() => setShowConversationModal(true)}
                className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-violet-500/30 text-left flex items-center gap-2.5 cursor-pointer transition-all group"
              >
                <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                  Conversation
                </span>
              </button>

              <button
                onClick={() => {
                  if (activeConnectionId) {
                    onNavigateTab('couple');
                  } else {
                    onNavigateTab('connections');
                  }
                }}
                className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-violet-500/30 text-left flex items-center gap-2.5 cursor-pointer transition-all group"
              >
                <Camera className="w-4 h-4 text-pink-400 shrink-0" />
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                  Add Memory
                </span>
              </button>

              <button
                onClick={() => {
                  setGoalsInitialMode('create');
                  setShowGoalsModal(true);
                }}
                className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-violet-500/30 text-left flex items-center gap-2.5 cursor-pointer transition-all group"
              >
                <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                  Create Goal
                </span>
              </button>

              <button
                onClick={() => {
                  if (activeConnectionId) {
                    onNavigateTab('couple');
                  } else {
                    onNavigateTab('connections');
                  }
                }}
                className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-violet-500/30 text-left flex items-center gap-2.5 cursor-pointer transition-all group"
              >
                <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                  Important Date
                </span>
              </button>
            </div>
          </div>

          {/* Privacy Reassurance Banner */}
          <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/5 space-y-2 text-xs text-zinc-400">
            <div className="flex items-center gap-2 text-white font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Strict Data Separation</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              TRUSTLY never mixes private reflections with shared spaces. Each connection operates in its own isolated container.
            </p>
          </div>
        </div>
      </div>

      {/* Daily Check-In Modal */}
      <DailyCheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        initialTab={checkInInitialTab}
        onOpenCoachWithTopic={onOpenCoachWithTopic}
      />

      {/* Conversation Starters Modal */}
      <ConversationStartersModal
        isOpen={showConversationModal}
        onClose={() => setShowConversationModal(false)}
        onOpenCoachWithTopic={onOpenCoachWithTopic}
      />

      {/* Couple Goals Modal */}
      <CoupleGoalsModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        initialMode={goalsInitialMode}
      />
    </div>
  );
};
