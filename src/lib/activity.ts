import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const addActivityEvent = async (connectionId: string, activity: {
  type: string;
  actorId: string;
  relatedId?: string;
  title: string;
  description?: string;
}) => {
  try {
    await addDoc(collection(db, 'couples', connectionId, 'activity'), {
      ...activity,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding activity event:', error);
  }
};
