import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export type NotificationType = 
  | 'memory' 
  | 'goal' 
  | 'goal_progress' 
  | 'date' 
  | 'boundary_proposed' 
  | 'boundary_agreed' 
  | 'boundary_discussing' 
  | 'checkin' 
  | 'note';

export const sendPartnerNotification = async (
  partnerUid: string,
  title: string,
  message: string,
  type: NotificationType
): Promise<void> => {
  if (!partnerUid) return;
  try {
    const notifRef = collection(db, 'notifications', partnerUid, 'items');
    await addDoc(notifRef, {
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Could not dispatch partner in-app notification:", err);
  }
};
