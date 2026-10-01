import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Activity, 
  Camera, 
  Target, 
  Calendar, 
  StickyNote, 
  ShieldCheck, 
  MessageSquare,
  Clock,
  Sparkles,
  Inbox
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'checkin' | 'memory' | 'goal' | 'date' | 'note' | 'boundary' | 'conversation';
  title: string;
  subtitle: string;
  timestamp: string | number | null;
  dateObj: Date | null;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

interface RecentActivitySectionProps {
  connectionId: string;
  partnerName: string;
  className?: string;
  onOpenItem?: (type: string) => void;
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Recently';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({
  connectionId,
  partnerName,
  className = '',
  onOpenItem
}) => {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connectionId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Track items across subcollections in real-time
    const unsubSharedCheckIns = onSnapshot(collection(db, 'couples', connectionId, 'sharedCheckIns'), (snap) => {
      updateCollectionItems('checkin', snap.docs.map(d => {
        const data = d.data();
        const date = data.createdAt ? new Date(data.createdAt) : null;
        const feeling = data.feeling || 'Reflection';
        const isMe = data.createdBy === currentUser?.uid;
        return {
          id: d.id,
          type: 'checkin' as const,
          title: isMe ? 'You shared a check-in' : `${partnerName} shared a check-in`,
          subtitle: `Feeling: ${feeling}`,
          timestamp: data.createdAt || null,
          dateObj: date,
          icon: Activity,
          iconColor: 'text-rose-400'
        };
      }));
    }, () => {});

    const unsubMemories = onSnapshot(collection(db, 'couples', connectionId, 'memories'), (snap) => {
      updateCollectionItems('memory', snap.docs.map(d => {
        const data = d.data();
        const date = data.createdAt ? new Date(data.createdAt) : null;
        return {
          id: d.id,
          type: 'memory' as const,
          title: data.title ? `Memory: ${data.title}` : 'New memory shared',
          subtitle: data.description ? data.description.slice(0, 45) + (data.description.length > 45 ? '...' : '') : 'Shared moment',
          timestamp: data.createdAt || null,
          dateObj: date,
          icon: Camera,
          iconColor: 'text-blue-400'
        };
      }));
    }, () => {});

    const unsubGoals = onSnapshot(collection(db, 'couples', connectionId, 'goals'), (snap) => {
      updateCollectionItems('goal', snap.docs.map(d => {
        const data = d.data();
        const date = data.createdAt ? new Date(data.createdAt) : null;
        return {
          id: d.id,
          type: 'goal' as const,
          title: data.title ? `Goal: ${data.title}` : 'Shared goal',
          subtitle: data.completed ? 'Goal completed' : 'Active goal',
          timestamp: data.createdAt || null,
          dateObj: date,
          icon: Target,
          iconColor: 'text-indigo-400'
        };
      }));
    }, () => {});

    const unsubNotes = onSnapshot(collection(db, 'couples', connectionId, 'notes'), (snap) => {
      updateCollectionItems('note', snap.docs.map(d => {
        const data = d.data();
        const date = data.updatedAt ? new Date(data.updatedAt) : (data.createdAt ? new Date(data.createdAt) : null);
        return {
          id: d.id,
          type: 'note' as const,
          title: data.title ? `Note: ${data.title}` : 'Shared note updated',
          subtitle: data.category || 'Shared note',
          timestamp: data.updatedAt || data.createdAt || null,
          dateObj: date,
          icon: StickyNote,
          iconColor: 'text-amber-400'
        };
      }));
    }, () => {});

    const unsubDates = onSnapshot(collection(db, 'couples', connectionId, 'importantDates'), (snap) => {
      updateCollectionItems('date', snap.docs.map(d => {
        const data = d.data();
        const date = data.createdAt ? new Date(data.createdAt) : null;
        return {
          id: d.id,
          type: 'date' as const,
          title: data.title ? `Important Date: ${data.title}` : 'Important date saved',
          subtitle: data.date ? `Date: ${data.date}` : 'Calendar reminder',
          timestamp: data.createdAt || null,
          dateObj: date,
          icon: Calendar,
          iconColor: 'text-emerald-400'
        };
      }));
    }, () => {});

    return () => {
      unsubSharedCheckIns();
      unsubMemories();
      unsubGoals();
      unsubNotes();
      unsubDates();
    };
  }, [connectionId, currentUser?.uid, partnerName]);

  const rawBuckets = React.useRef<{ [key: string]: ActivityItem[] }>({});

  const updateCollectionItems = (type: string, items: ActivityItem[]) => {
    rawBuckets.current[type] = items;
    const combined: ActivityItem[] = [];
    Object.values(rawBuckets.current).forEach(bucket => {
      combined.push(...bucket);
    });

    // Sort newest first
    combined.sort((a, b) => {
      const timeA = a.dateObj ? a.dateObj.getTime() : 0;
      const timeB = b.dateObj ? b.dateObj.getTime() : 0;
      return timeB - timeA;
    });

    setActivities(combined.slice(0, 5));
    setLoading(false);
  };

  return (
    <div className={`glass-card rounded-3xl p-5 border border-white/10 space-y-3.5 bg-zinc-900/40 ${className}`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">Recent Activity</h2>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">Shared only</span>
      </div>

      {loading ? (
        <div className="space-y-2 py-2">
          <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
        </div>
      ) : activities.length === 0 ? (
        <div className="py-6 px-4 text-center space-y-1.5 rounded-2xl bg-zinc-950/40 border border-white/5">
          <Inbox className="w-6 h-6 text-zinc-600 mx-auto" />
          <p className="text-xs font-semibold text-zinc-300">Nothing shared yet.</p>
          <p className="text-[11px] text-zinc-500">Your shared moments will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((act) => {
            const Icon = act.icon;
            return (
              <div
                key={act.id}
                onClick={() => onOpenItem && onOpenItem(act.type)}
                className="p-2.5 rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-white/15 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 ${act.iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-violet-200 transition-colors">
                      {act.title}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {act.subtitle}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-zinc-500 font-mono whitespace-nowrap shrink-0">
                  {formatRelativeTime(act.dateObj)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
