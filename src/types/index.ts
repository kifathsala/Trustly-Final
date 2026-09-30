export interface UserSubscription {
  plan: 'free' | 'plus';
  status: 'inactive' | 'active' | 'cancelled' | 'past_due';
  provider: 'razorpay' | 'stripe' | null;
  customerId: string | null;
  subscriptionId: string | null;
  currentPeriodEnd: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  relationshipStatus?: string;
  relationshipType?: string;
  birthday?: string;
  timezone?: string;
  coupleId?: string | null;
  onboardingCompleted?: boolean;
  onboardingFocus?: string[];
  onboardingGoals?: string[];
  focusAreas?: string[];
  role?: string;
  isAdmin?: boolean;
  subscription?: UserSubscription;
  createdAt: string;
  updatedAt?: string;
}

export interface CoupleSpace {
  id: string;
  name?: string;
  inviteCode: string;
  creatorId: string;
  createdBy?: string;
  creatorName?: string;
  memberIds: string[];
  status: 'waiting' | 'connected' | 'active' | 'disconnected';
  relationshipType?: string;
  anniversary?: string;
  createdAt: string;
  updatedAt?: string;
}

export type RelationshipFeeling = 
  | 'Very connected' 
  | 'Good' 
  | 'Okay' 
  | 'A little distant' 
  | 'Something is on my mind';

export interface UserCheckIn {
  id?: string;
  userId: string;
  coupleId?: string | null;
  feeling: RelationshipFeeling;
  feelingEmoji: string;
  areas: string[];
  reflection?: string; // Private by default, strictly never shared to partner
  shareWithPartner: boolean;
  sharedSummary?: string | null; // Sanitized neutral reflection for partner
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt?: string;
}

export interface SharedCheckInSummary {
  id: string;
  coupleId: string;
  userId: string;
  userDisplayName?: string;
  feeling: RelationshipFeeling;
  feelingEmoji: string;
  areas: string[];
  sharedSummary: string;
  date: string;
  createdAt: string;
}

export interface DailyCheckIn {
  id?: string;
  userId: string;
  coupleId?: string;
  connectionScore: number; // 1 to 5
  betterResponse?: string;
  isShared: boolean;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface TrustCheckAnswers {
  feltHeard: number; // 1-5
  feltConnected: number; // 1-5
  discussDifficult: number; // 1-5
  boundariesRespected: number; // 1-5
  wishUnderstood: string;
  transparencySatisfied: number; // 1-5
}

export interface TrustCheckDoc {
  id?: string;
  userId: string;
  coupleId?: string;
  answers: TrustCheckAnswers;
  isSharedWithPartner: boolean;
  summaryFeedback?: string;
  createdAt: string;
}

export interface BoundaryItem {
  id?: string;
  coupleId: string;
  creatorId?: string;
  createdBy: string;
  creatorName?: string;
  category: 'Communication' | 'Privacy' | 'Social Media' | 'Friendships' | 'Personal Space' | 'Time Together' | 'Money' | 'Finances' | 'Other';
  title: string;
  description: string;
  status: 'pending' | 'discussing' | 'agreed' | 'declined';
  agreedBy?: string;
  agreedByName?: string;
  agreedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface JournalEntry {
  id?: string;
  userId: string;
  coupleId?: string;
  feeling: string;
  bothering: string;
  communicate: string;
  isShared: boolean;
  createdAt: string;
}

export interface SharedMemory {
  id?: string;
  coupleId: string;
  creatorId?: string;
  createdBy: string;
  creatorName?: string;
  title: string;
  date: string;
  description: string;
  photoURL?: string;
  tag?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CoupleGoal {
  id?: string;
  coupleId: string;
  creatorId?: string;
  createdBy: string;
  creatorName?: string;
  title: string;
  category: 'Travel' | 'Savings' | 'Health' | 'Learning' | 'Quality Time' | 'Personal Growth' | 'Other' | string;
  description?: string;
  targetDate?: string;
  progress: number; // 0 to 100
  isCompleted: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ImportantDate {
  id?: string;
  coupleId: string;
  creatorId?: string;
  createdBy: string;
  creatorName?: string;
  title: string;
  date: string;
  reminder?: string;
  reminderDays?: number;
  category: 'Anniversary' | 'Birthday' | 'First Meeting' | 'Custom Date' | 'Milestone' | 'Other';
  createdAt: string;
  updatedAt?: string;
}

export interface SharedNote {
  id?: string;
  coupleId: string;
  creatorId?: string;
  createdBy: string;
  creatorName?: string;
  title: string;
  content: string;
  color?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'checkin' | 'trustcheck' | 'boundary' | 'memory' | 'date' | 'system';
  read: boolean;
  createdAt: string;
}
