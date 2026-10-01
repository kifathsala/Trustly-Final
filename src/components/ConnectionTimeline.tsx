import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, limit, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TimelineActivity } from '../types';
import { Activity, Camera, Target, Calendar, StickyNote, ShieldCheck, MessageSquare, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface ConnectionTimelineProps {
  connectionId: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'MEMORY_CREATED': return Camera;
    case 'GOAL_CREATED': return Target;
    case 'IMPORTANT_DATE_ADDED': return Calendar;
    case 'SHARED_NOTE_CREATED': return StickyNote;
    case 'BOUNDARY_CREATED': return ShieldCheck;
    case 'CHECKIN_SHARED': return Activity;
    case 'CONVERSATION_STARTER_SHARED': return MessageSquare;
    default: return Sparkles;
  }
};

export const ConnectionTimeline: React.FC<ConnectionTimelineProps> = ({ connectionId }) => {
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);

  useEffect(() => {
    if (!connectionId) return;

    const q = query(
      collection(db, 'couples', connectionId, 'activity'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const newActivities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TimelineActivity));
      setActivities(newActivities);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setLoading(false);
    });

    return () => unsub();
  }, [connectionId]);

  if (loading) return <div className="p-4 text-center"><Loader2 className="animate-spin w-6 h-6 mx-auto text-violet-400" /></div>;

  if (activities.length === 0) return (
    <div className="p-8 text-center glass-card rounded-3xl border border-white/10">
      <h3 className="text-sm font-bold text-white">Your shared timeline is empty.</h3>
      <p className="text-xs text-zinc-400 mt-2">Shared memories, goals, and moments will appear here.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {activities.map((act) => {
        const Icon = getActivityIcon(act.type);
        return (
          <div key={act.id} className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{act.title}</h4>
              <p className="text-xs text-zinc-400">{act.description}</p>
              <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                {new Date(act.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
