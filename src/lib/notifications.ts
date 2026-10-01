import { db } from './firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';

export interface AppNotification {
  id?: string;
  type: string;
  title: string;
  body: string;
  connectionId?: string;
  referenceId?: string;
  createdAt: string;
  readAt?: string;
  isRead: boolean;
}

export interface NotificationPreferences {
  invitations: boolean;
  sharedActivity: boolean;
  importantDates: boolean;
  goals: boolean;
  checkIns: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  invitations: true,
  sharedActivity: true,
  importantDates: true,
  goals: true,
  checkIns: true
};

/**
 * Map notification type to user preference key
 */
function getPrefKeyForType(type: string): keyof NotificationPreferences {
  switch (type) {
    case 'invitation_waiting':
    case 'connection_accepted':
      return 'invitations';
    case 'shared_memory':
    case 'shared_note':
    case 'boundary_update':
      return 'sharedActivity';
    case 'important_date':
      return 'importantDates';
    case 'shared_goal':
    case 'goal_completed':
      return 'goals';
    case 'shared_checkin':
    case 'shared_check-in':
      return 'checkIns';
    default:
      return 'sharedActivity';
  }
}

/**
 * Creates a notification securely for a target user if their preference allows it
 */
export async function sendNotification(
  userId: string,
  notification: Omit<AppNotification, 'isRead' | 'createdAt'>
): Promise<boolean> {
  try {
    if (!userId) return false;

    // Check recipient's notification preferences from their user doc
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    let prefs = { ...DEFAULT_PREFERENCES };

    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.notificationPreferences) {
        prefs = { ...prefs, ...userData.notificationPreferences };
      }
    }

    const prefKey = getPrefKeyForType(notification.type);
    if (!prefs[prefKey]) {
      console.log(`Notification of type ${notification.type} skipped because preference ${prefKey} is turned off for user ${userId}.`);
      return false; // Consent says no
    }

    // Write securely to users/{userId}/notifications/{notificationId}
    const notificationsCol = collection(db, 'users', userId, 'notifications');
    await addDoc(notificationsCol, {
      ...notification,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

/**
 * Backward compatible wrapper for CoupleSpaceView.tsx to trigger partner notification
 */
export async function sendPartnerNotification(
  partnerUid: string,
  title: string,
  body: string,
  type: string
): Promise<boolean> {
  return sendNotification(partnerUid, { type, title, body });
}
