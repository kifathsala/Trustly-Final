export type ConnectionType = 
  | 'partner'
  | 'parent'
  | 'family'
  | 'best_friend'
  | 'friend'
  | 'crush'
  | 'other';

export interface ConnectionTypeOption {
  type: ConnectionType;
  label: string;
  emoji: string;
  description: string;
}

export const CONNECTION_TYPE_OPTIONS: ConnectionTypeOption[] = [
  { type: 'partner', label: 'Partner / Lover', emoji: '❤️', description: 'Romantic partner, spouse, or lover' },
  { type: 'parent', label: 'Parent', emoji: '👨‍👩‍👦', description: 'Mom, dad, or parental figure' },
  { type: 'family', label: 'Family Member', emoji: '👨‍👩‍👧', description: 'Sibling, relative, or child' },
  { type: 'best_friend', label: 'Best Friend', emoji: '🧑‍🤝‍🧑', description: 'Closest friend and confidant' },
  { type: 'friend', label: 'Friend', emoji: '🤝', description: 'Good friend or peer' },
  { type: 'crush', label: 'Crush', emoji: '💭', description: 'Someone you are interested in' },
  { type: 'other', label: 'Other', emoji: '👥', description: 'Any meaningful relationship' },
];

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
  connectionType?: ConnectionType | string;
  birthday?: string;
  dateOfBirth?: string; // YYYY-MM-DD (private by default)
  shareBirthday?: boolean; // false by default
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

export interface BirthdayMessage {
  id?: string;
  coupleId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  message: string;
  birthdayDate: string; // YYYY-MM-DD or MM-DD
  createdAt: string;
  read?: boolean;
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
  connectionType?: ConnectionType | string;
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

export type ConversationTopicCategory = 
  | 'Communication'
  | 'Quality Time'
  | 'Affection'
  | 'Trust'
  | 'Money'
  | 'Family'
  | 'Future'
  | 'Personal Feelings'
  | 'Something Else';

export interface ConversationStarterContent {
  feeling: string;
  discuss: string;
  starter: string;
}

export interface ConversationStarterDoc {
  id?: string;
  userId: string;
  coupleId?: string | null;
  category: ConversationTopicCategory;
  originalReflection?: string;
  content: ConversationStarterContent;
  status: 'private' | 'shared';
  createdAt: string;
  updatedAt?: string;
}

export interface SharedConversationStarter {
  id: string;
  coupleId: string;
  userId: string;
  userDisplayName?: string;
  category: ConversationTopicCategory;
  content: ConversationStarterContent;
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
  category: 'Communication' | 'Privacy' | 'Social Life' | 'Time Together' | 'Money' | 'Family' | 'Online/Social Media' | 'Personal Space' | 'Other' | string;
  title: string;
  description?: string;
  details?: string;
  handling?: string;
  status: 'pending' | 'discussing' | 'agreed' | 'review' | 'declined';
  agreements?: Record<string, boolean>;
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
  date?: string;
  description: string;
  imageUrl?: string;
  photoURL?: string;
  tag?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CoupleGoalCategory = 
  | 'Quality Time'
  | 'Communication'
  | 'Health & Wellness'
  | 'Travel'
  | 'Finance'
  | 'Personal Growth'
  | 'Future Plans'
  | 'Something Else';

export interface CoupleGoal {
  id?: string;
  coupleId: string;
  creatorId?: string;
  createdBy: string;
  creatorName?: string;
  title: string;
  category: CoupleGoalCategory | string;
  description?: string;
  deadline?: string | null;
  targetDate?: string;
  status?: 'active' | 'completed';
  isCompleted?: boolean;
  progress: number;
  completedAt?: string | null;
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
  description?: string;
  repeatYearly?: boolean;
  reminder?: string;
  reminderDays?: number;
  category?: 'Anniversary' | 'Birthday' | 'First Meeting' | 'Custom Date' | 'Milestone' | 'Special Day' | 'Trip' | 'Other';
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
