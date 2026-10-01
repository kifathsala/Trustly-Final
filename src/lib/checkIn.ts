/**
 * Connection Check-In & Pulse System Helpers
 * Factual, privacy-respecting, and connection-aware.
 * Strictly no numerical relationship scores, no hidden emotion guessing.
 */

import { ConnectionFeeling, CheckInArea, SharedConnectionCheckIn } from '../types';

export interface FeelingOption {
  label: string;
  emoji: string;
  desc: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const FEELING_OPTIONS: FeelingOption[] = [
  { 
    label: 'Appreciated', 
    emoji: '❤️', 
    desc: 'Feeling valued, seen, and cared for',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-500/30',
    badgeText: 'text-rose-300'
  },
  { 
    label: 'Connected', 
    emoji: '😊', 
    desc: 'In tune, close, and emotionally aligned',
    badgeBg: 'bg-violet-500/15',
    badgeBorder: 'border-violet-500/30',
    badgeText: 'text-violet-300'
  },
  { 
    label: 'Good', 
    emoji: '🙂', 
    desc: 'Comfortable, positive, and steady',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-300'
  },
  { 
    label: 'Neutral', 
    emoji: '😐', 
    desc: 'Day-to-day routine, neither high nor low',
    badgeBg: 'bg-zinc-800',
    badgeBorder: 'border-zinc-700',
    badgeText: 'text-zinc-300'
  },
  { 
    label: 'Distant', 
    emoji: '😔', 
    desc: 'Feeling some physical or emotional space',
    badgeBg: 'bg-blue-500/15',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-300'
  },
  { 
    label: 'Worried', 
    emoji: '😟', 
    desc: 'Concerned about something on your mind',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-300'
  },
  { 
    label: 'Frustrated', 
    emoji: '😤', 
    desc: 'Encountering friction or misunderstandings',
    badgeBg: 'bg-orange-500/15',
    badgeBorder: 'border-orange-500/30',
    badgeText: 'text-orange-300'
  },
  { 
    label: 'Unsure', 
    emoji: '💭', 
    desc: 'Processing thoughts or mixed feelings',
    badgeBg: 'bg-indigo-500/15',
    badgeBorder: 'border-indigo-500/30',
    badgeText: 'text-indigo-300'
  }
];

export const CHECKIN_AREAS: CheckInArea[] = [
  'Communication',
  'Trust',
  'Support',
  'Quality Time',
  'Appreciation',
  'Boundaries',
  'Family',
  'Stress',
  'Something Else'
];

export function getFeelingDetails(labelOrEmoji?: string): FeelingOption {
  if (!labelOrEmoji) return FEELING_OPTIONS[1]; // Connected default
  const lower = labelOrEmoji.toLowerCase().trim();
  const matched = FEELING_OPTIONS.find(f => 
    f.label.toLowerCase() === lower || 
    f.emoji === labelOrEmoji.trim() ||
    (lower.includes('connected') && f.label === 'Connected') ||
    (lower.includes('good') && f.label === 'Good') ||
    (lower.includes('okay') && f.label === 'Neutral') ||
    (lower.includes('distant') && f.label === 'Distant') ||
    (lower.includes('mind') && f.label === 'Unsure')
  );
  return matched || FEELING_OPTIONS[1];
}

export function getConnectionCheckInCopy(connectionType?: string) {
  const type = (connectionType || 'other').toLowerCase();
  
  if (type === 'friend' || type === 'best_friend') {
    return {
      subtitle: 'Take a moment to reflect on this friendship.',
      question: 'How are you feeling about this friendship today?',
      sharedLabel: 'Shared with your friend',
      connectionNoun: 'friendship'
    };
  }

  if (type === 'parent') {
    return {
      subtitle: 'Take a moment to reflect on this parent connection.',
      question: 'How are you feeling about this connection today?',
      sharedLabel: 'Shared with parent',
      connectionNoun: 'connection'
    };
  }

  if (type === 'family') {
    return {
      subtitle: 'Take a moment to reflect on this family connection.',
      question: 'How are you feeling about this family connection today?',
      sharedLabel: 'Shared with family',
      connectionNoun: 'family connection'
    };
  }

  if (type === 'crush') {
    return {
      subtitle: 'Take a moment to reflect on how you feel.',
      question: 'How are you feeling about this connection today?',
      sharedLabel: 'Shared with connection',
      connectionNoun: 'connection'
    };
  }

  if (type === 'partner') {
    return {
      subtitle: 'Take a moment to reflect on your relationship.',
      question: 'How are you feeling about this connection today?',
      sharedLabel: 'Shared with partner',
      connectionNoun: 'connection'
    };
  }

  return {
    subtitle: 'Take a moment to reflect on this connection.',
    question: 'How are you feeling about this connection today?',
    sharedLabel: 'Shared with this connection',
    connectionNoun: 'connection'
  };
}

export interface FactualConnectionPulse {
  hasSharedData: boolean;
  bothCheckedInRecently: boolean;
  summaryMessage: string;
  totalSharedCount: number;
  lastSharedDateStr: string | null;
  lastSharedRelative: string | null;
  latestSharedFeeling: FeelingOption | null;
  latestSharedBy: string | null;
  latestCheckIns: SharedConnectionCheckIn[];
  topMentionedAreas: { area: string; count: number }[];
  areasSummaryText: string | null;
}

export function computeFactualConnectionPulse(
  sharedList: SharedConnectionCheckIn[],
  currentUserId: string,
  partnerName: string
): FactualConnectionPulse {
  if (!sharedList || sharedList.length === 0) {
    return {
      hasSharedData: false,
      bothCheckedInRecently: false,
      summaryMessage: 'Share a check-in when you are ready.',
      totalSharedCount: 0,
      lastSharedDateStr: null,
      lastSharedRelative: null,
      latestSharedFeeling: null,
      latestSharedBy: null,
      latestCheckIns: [],
      topMentionedAreas: [],
      areasSummaryText: null
    };
  }

  // Sort descending by createdAt
  const sorted = [...sharedList].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.date || 0).getTime();
    const timeB = new Date(b.createdAt || b.date || 0).getTime();
    return timeB - timeA;
  });

  const latest = sorted[0];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const currentUserRecent = sorted.some(
    s => (s.createdBy === currentUserId || s.userId === currentUserId) && 
         new Date(s.createdAt || s.date || 0).getTime() > sevenDaysAgo
  );
  const partnerRecent = sorted.some(
    s => (s.createdBy !== currentUserId && s.userId !== currentUserId) && 
         new Date(s.createdAt || s.date || 0).getTime() > sevenDaysAgo
  );

  const bothCheckedInRecently = currentUserRecent && partnerRecent;

  let summaryMessage = '';
  if (bothCheckedInRecently) {
    summaryMessage = 'Both of you checked in recently.';
  } else if (currentUserRecent) {
    summaryMessage = 'You checked in recently.';
  } else if (partnerRecent) {
    summaryMessage = `${partnerName} checked in recently.`;
  } else {
    summaryMessage = `${sorted.length} check-in${sorted.length === 1 ? '' : 's'} shared in this connection.`;
  }

  // Count area frequencies
  const areaCounts: Record<string, number> = {};
  for (const item of sorted) {
    if (Array.isArray(item.areas)) {
      for (const area of item.areas) {
        if (area) {
          areaCounts[area] = (areaCounts[area] || 0) + 1;
        }
      }
    }
  }

  const topAreas = Object.entries(areaCounts)
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  let areasSummaryText: string | null = null;
  if (topAreas.length > 0) {
    if (topAreas.length === 1) {
      areasSummaryText = `${topAreas[0].area} has come up in your recent check-ins.`;
    } else if (topAreas.length === 2) {
      areasSummaryText = `${topAreas[0].area} and ${topAreas[1].area} have come up in your recent check-ins.`;
    } else {
      areasSummaryText = `${topAreas[0].area}, ${topAreas[1].area}, and ${topAreas[2].area} have come up recently.`;
    }
  }

  // Format latest date
  const latestDateObj = new Date(latest.createdAt || latest.date || Date.now());
  const diffHours = Math.round((Date.now() - latestDateObj.getTime()) / (1000 * 60 * 60));
  let relative = 'Recently';
  if (diffHours < 1) relative = 'Just now';
  else if (diffHours < 24) relative = `${diffHours}h ago`;
  else {
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) relative = 'Yesterday';
    else if (diffDays < 7) relative = `${diffDays} days ago`;
    else relative = latestDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const latestFeelingDetails = getFeelingDetails(latest.feeling || latest.feelingEmoji);
  const isMine = latest.createdBy === currentUserId || latest.userId === currentUserId;
  const latestSharedBy = isMine ? 'You' : (latest.creatorName || partnerName);

  return {
    hasSharedData: true,
    bothCheckedInRecently,
    summaryMessage,
    totalSharedCount: sorted.length,
    lastSharedDateStr: latestDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    lastSharedRelative: relative,
    latestSharedFeeling: latestFeelingDetails,
    latestSharedBy,
    latestCheckIns: sorted.slice(0, 5),
    topMentionedAreas: topAreas,
    areasSummaryText
  };
}
