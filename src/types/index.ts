import { CONNECTION_IMAGES } from '../config/images';

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
  emoji?: string;
  iconName?: string;
  description: string;
  image?: string;
}

export const CONNECTION_TYPE_OPTIONS: ConnectionTypeOption[] = [
  { type: 'partner', label: 'Partner / Lover', description: 'Romantic partner, spouse, or lover', image: CONNECTION_IMAGES.partner },
  { type: 'parent', label: 'Parent', description: 'Mom, dad, or parental figure', image: CONNECTION_IMAGES.parent },
  { type: 'family', label: 'Family Member', description: 'Sibling, relative, or child', image: CONNECTION_IMAGES.family },
  { type: 'best_friend', label: 'Best Friend', description: 'Closest friend and confidant', image: CONNECTION_IMAGES.best_friend },
  { type: 'friend', label: 'Friend', description: 'Good friend or peer', image: CONNECTION_IMAGES.friend },
  { type: 'crush', label: 'Crush', description: 'Someone you are interested in', image: CONNECTION_IMAGES.crush },
  { type: 'other', label: 'Other', description: 'Any meaningful relationship', image: CONNECTION_IMAGES.other },
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

export interface ProfilePrivacySettings {
  shareDisplayName?: boolean;
  sharePhoto?: boolean;
  shareBio?: boolean;
  shareBirthday?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  bio?: string;
  photoURL?: string;
  profilePrivacy?: ProfilePrivacySettings;
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
  notificationPreferences?: any;
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
  status: 'waiting' | 'connected' | 'active' | 'disconnected' | 'archived';
  relationshipType?: string;
  connectionType?: ConnectionType | string;
  anniversary?: string;
  archivedBy?: string[];
  customNames?: Record<string, string>;
  customRelationshipTypes?: Record<string, string>;
  lastActivityAt?: string;
  lastActivityDesc?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TimelineActivity {
  id: string;
  type: string;
  actorId: string;
  relatedId?: string;
  title: string;
  description?: string;
  createdAt: string;
  connectionId: string;
}

export interface ConnectionItem {
  id: string;
  space: CoupleSpace;
  partner: UserProfile | null;
  partnerId?: string;
  displayName: string;
  relationshipType: string;
  rawConnectionType: string;
  status: 'waiting' | 'connected' | 'archived';
  isArchived: boolean;
  lastActivityAt?: string | null;
  lastActivityDesc?: string | null;
  createdAt: string;
}

export type RelationshipFeeling = 
  | 'Appreciated'
  | 'Connected'
  | 'Good'
  | 'Neutral'
  | 'Distant'
  | 'Worried'
  | 'Frustrated'
  | 'Unsure'
  | 'Very connected' 
  | 'Okay' 
  | 'A little distant' 
  | 'Something is on my mind';

export type ConnectionFeeling = RelationshipFeeling;

export type CheckInArea = 
  | 'Communication'
  | 'Trust'
  | 'Support'
  | 'Quality Time'
  | 'Appreciation'
  | 'Boundaries'
  | 'Family'
  | 'Stress'
  | 'Something Else';

export interface ConnectionCheckIn {
  id?: string;
  connectionId: string;
  coupleId?: string; // alias for backward compatibility
  userId: string;
  createdBy?: string;
  creatorName?: string;
  feeling: string;
  feelingEmoji?: string;
  areas: string[];
  privateReflection?: string;
  reflection?: string; // alias
  isShared?: boolean;
  sharedNote?: string;
  createdAt: string;
  updatedAt?: string;
  date?: string;
}

export interface SharedConnectionCheckIn {
  id?: string;
  connectionId: string;
  coupleId?: string;
  createdBy: string;
  userId?: string;
  creatorName?: string;
  feeling: string;
  feelingEmoji?: string;
  areas: string[];
  sharedNote?: string;
  createdAt: string;
  date?: string;
}

export interface UserCheckIn {
  id?: string;
  userId: string;
  coupleId?: string | null;
  connectionId?: string | null;
  feeling: string | RelationshipFeeling;
  feelingEmoji?: string;
  areas: string[];
  reflection?: string; // Private by default, strictly never shared to partner
  privateReflection?: string;
  shareWithPartner?: boolean;
  isShared?: boolean;
  sharedSummary?: string | null; // Sanitized neutral reflection for partner
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt?: string;
}

export interface SharedCheckInSummary {
  id: string;
  coupleId: string;
  connectionId?: string;
  userId: string;
  userDisplayName?: string;
  creatorName?: string;
  feeling: string | RelationshipFeeling;
  feelingEmoji?: string;
  areas: string[];
  sharedSummary?: string;
  sharedNote?: string;
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

export type BoundaryCategory = 
  | 'Communication'
  | 'Privacy'
  | 'Time'
  | 'Personal Space'
  | 'Family'
  | 'Social Media'
  | 'Money'
  | 'Plans'
  | 'Other';

export type BoundaryStatus = 'discussion' | 'agreed' | 'review';

export interface BoundaryAgreementHistoryItem {
  action: 'created' | 'agreed' | 'discussion_requested' | 'review_requested' | 'updated';
  userId: string;
  userName: string;
  timestamp: string;
  note?: string;
}

export interface BoundaryItem {
  id?: string;
  coupleId: string;
  creatorId?: string;
  createdBy: string;
  creatorName?: string;
  category: BoundaryCategory | string;
  title: string;
  description: string;
  details?: string;
  handling?: string;
  status: BoundaryStatus | string;
  agreedBy?: string[]; // UIDs of members who explicitly agreed
  agreedByNames?: Record<string, string>;
  agreedAt?: string;
  discussionNote?: string;
  discussionRequestedBy?: string;
  discussionRequestedByName?: string;
  discussionRequestedAt?: string;
  history?: BoundaryAgreementHistoryItem[];
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
  connectionId?: string;
  creatorId?: string;
  createdBy: string;
  creatorName?: string;
  title: string;
  date?: string;
  memoryDate?: string;
  description?: string;
  imageUrl?: string;
  photoURL?: string;
  storagePath?: string;
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

export type ImportantDateType = 
  | 'Birthday' 
  | 'Anniversary' 
  | 'Family Event' 
  | 'Friendship' 
  | 'Milestone' 
  | 'Custom';

export interface ImportantDate {
  id?: string;
  coupleId: string;
  creatorId?: string;
  createdBy: string;
  creatorName?: string;
  title: string;
  date: string;
  type?: ImportantDateType | string;
  category?: string;
  description?: string;
  notes?: string;
  repeatYearly?: boolean;
  reminder?: 'none' | '1_day' | '3_days' | '7_days' | string;
  reminderDays?: number;
  createdAt: string;
  updatedAt?: string;
}

export type SharedNoteCategory = 'General' | 'Plans' | 'Tasks' | 'Ideas' | 'Important' | 'Other';

export interface SharedNote {
  id?: string;
  coupleId: string;
  creatorId?: string;
  createdBy: string;
  creatorName?: string;
  title: string;
  content: string;
  category?: SharedNoteCategory | string;
  color?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'checkin' | 'trustcheck' | 'boundary' | 'memory' | 'date' | 'system';
  read: boolean;
  createdAt: string;
}
