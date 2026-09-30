import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, CoupleSpace } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  coupleSpace: CoupleSpace | null;
  partnerProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  createCouple: (spaceName: string, relationshipType?: string) => Promise<CoupleSpace>;
  validateInviteCode: (code: string) => Promise<{ couple: CoupleSpace; creatorName: string }>;
  confirmJoinCouple: (coupleId: string) => Promise<CoupleSpace>;
  joinCouple: (inviteCode: string) => Promise<boolean>;
  disconnectCouple: () => Promise<void>;
  refreshCoupleData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [coupleSpace, setCoupleSpace] = useState<CoupleSpace | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAIL = "mdumarkiffayaumarkiffaya@gmail.com";
  const isAdmin = Boolean(
    currentUser?.email === ADMIN_EMAIL ||
    userProfile?.isAdmin ||
    userProfile?.role === 'admin'
  );

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          await user.getIdToken();
        } catch {
          // ignore
        }
        await syncUserProfile(user);
      } else {
        setUserProfile(null);
        setCoupleSpace(null);
        setPartnerProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to profile updates & couple space real-time
  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      setCoupleSpace(null);
      setPartnerProfile(null);
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unSubUser = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const uData = snap.data() as UserProfile;
        setUserProfile(uData);
      }
      setLoading(false);
    }, (err) => {
      console.warn("User profile listener warning:", err);
      setLoading(false);
    });

    return () => unSubUser();
  }, [currentUser]);

  // Reactive listener to couple document in real-time
  useEffect(() => {
    if (!userProfile?.coupleId) {
      setCoupleSpace(null);
      setPartnerProfile(null);
      return;
    }

    let unSubPartner: (() => void) | null = null;

    const coupleDocRef = doc(db, 'couples', userProfile.coupleId);
    const unSubCouple = onSnapshot(coupleDocRef, (cSnap) => {
      if (cSnap.exists()) {
        const cData = { id: cSnap.id, ...cSnap.data() } as CoupleSpace;
        setCoupleSpace(cData);

        // Listen to partner profile in real-time if member exists
        const partnerId = cData.memberIds?.find(id => id !== currentUser?.uid);
        if (partnerId) {
          if (unSubPartner) unSubPartner();
          const partnerDocRef = doc(db, 'users', partnerId);
          unSubPartner = onSnapshot(partnerDocRef, (pSnap) => {
            if (pSnap.exists()) {
              setPartnerProfile(pSnap.data() as UserProfile);
            } else {
              setPartnerProfile(null);
            }
          }, (pErr) => {
            console.warn("Partner snapshot error:", pErr);
            setPartnerProfile(null);
          });
        } else {
          if (unSubPartner) unSubPartner();
          setPartnerProfile(null);
        }
      } else {
        if (unSubPartner) unSubPartner();
        setCoupleSpace(null);
        setPartnerProfile(null);
      }
    }, (err) => {
      console.warn("Couple listener error:", err);
    });

    return () => {
      unSubCouple();
      if (unSubPartner) unSubPartner();
    };
  }, [userProfile?.coupleId, currentUser?.uid]);

  const syncUserProfile = async (user: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);

      const isUserAdmin = Boolean(
        user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      );

      if (!snap.exists()) {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL || '',
          relationshipStatus: 'Dating',
          relationshipType: 'Dating',
          coupleId: null,
          onboardingCompleted: false,
          role: isUserAdmin ? 'admin' : 'member',
          isAdmin: isUserAdmin,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(userRef, newProfile);
        } catch (setErr) {
          console.warn("Notice saving initial profile:", setErr);
        }
        if (isUserAdmin) {
          try {
            await setDoc(doc(db, 'admins', user.uid), {
              uid: user.uid,
              email: user.email,
              assignedAt: new Date().toISOString()
            });
          } catch (adminErr) {
            console.warn("Notice syncing admin metadata:", adminErr);
          }
        }
        setUserProfile(newProfile);
      } else {
        const data = snap.data() as UserProfile;
        const updates: Partial<UserProfile> = {};

        // Only update fields if they have actually changed
        if (user.photoURL && user.photoURL !== data.photoURL) {
          updates.photoURL = user.photoURL;
        }
        if (user.displayName && user.displayName !== data.displayName) {
          updates.displayName = user.displayName;
        }
        if (user.email && user.email !== data.email) {
          updates.email = user.email;
        }
        if (isUserAdmin && (!data.isAdmin || data.role !== 'admin')) {
          updates.isAdmin = true;
          updates.role = 'admin';
          try {
            await setDoc(doc(db, 'admins', user.uid), {
              uid: user.uid,
              email: user.email,
              assignedAt: new Date().toISOString()
            });
          } catch (adminErr) {
            console.warn("Notice syncing admin metadata:", adminErr);
          }
        }

        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date().toISOString();
          try {
            await updateDoc(userRef, updates);
            Object.assign(data, updates);
          } catch (updateErr) {
            console.warn("Notice updating profile fields:", updateErr);
          }
        }
        setUserProfile(data);
      }
    } catch (e) {
      console.warn("Notice syncing profile:", e);
      // Fallback: set minimal local profile so UI is always responsive
      if (!userProfile) {
        setUserProfile({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL || '',
          relationshipStatus: 'Dating',
          relationshipType: 'Dating',
          coupleId: null,
          onboardingCompleted: true,
          role: user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'member',
          isAdmin: user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
          createdAt: new Date().toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      // Map Firebase auth errors to readable messages
      let message = "Google Sign In failed. Please try again.";
      if (err.code === 'auth/popup-closed-by-user') {
        message = "Sign in was cancelled (window was closed).";
      } else if (err.code === 'auth/popup-blocked') {
        message = "The sign-in popup was blocked by your browser. Please allow popups for this site.";
      } else if (err.code === 'auth/unauthorized-domain') {
        message = "This domain is not authorized in your Firebase console. Please add this domain to Firebase Authentication > Settings > Authorized domains.";
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        message = "An account already exists with the same email using a different sign-in method.";
      } else if (err.code === 'auth/cancelled-popup-request') {
        message = "Another sign in popup is already active.";
      } else if (err.message) {
        message = err.message;
      }
      const customErr = new Error(message);
      (customErr as any).code = err.code;
      throw customErr;
    }
  };

  const signUpEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: name });
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || email,
        displayName: name,
        relationshipStatus: 'Dating',
        coupleId: null,
        onboardingCompleted: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      setUserProfile(newProfile);
      try {
        await sendEmailVerification(cred.user);
      } catch (e) {
        console.warn("Verification email notice:", e);
      }
    }
  };

  const loginEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await fbSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const resendVerification = async () => {
    if (currentUser) {
      await sendEmailVerification(currentUser);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const ref = doc(db, 'users', currentUser.uid);
    const updatedData = { ...data, updatedAt: new Date().toISOString() };
    await setDoc(ref, updatedData, { merge: true });

    // Sync Firebase Auth profile if displayName or photoURL changed
    if (data.displayName || data.photoURL) {
      try {
        await updateProfile(currentUser, {
          displayName: data.displayName ?? currentUser.displayName,
          photoURL: data.photoURL ?? currentUser.photoURL
        });
      } catch (authErr) {
        console.warn("Notice updating Auth profile:", authErr);
      }
    }

    setUserProfile(prev => prev ? { ...prev, ...updatedData } : {
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: data.displayName || currentUser.displayName || 'User',
      photoURL: data.photoURL || currentUser.photoURL || '',
      relationshipStatus: data.relationshipStatus || 'Dating',
      relationshipType: data.relationshipType || 'Dating',
      coupleId: data.coupleId || null,
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      ...updatedData
    });
  };

  const createCouple = async (spaceName: string, relationshipType?: string): Promise<CoupleSpace> => {
    if (!currentUser) throw new Error("Must be logged in to create a couple space.");

    const trimmedName = spaceName.trim();
    if (!trimmedName) {
      throw new Error("Please give your couple space a name.");
    }
    if (trimmedName.length > 50) {
      throw new Error("Couple space name should be 50 characters or fewer.");
    }

    // Secure collision-resistant cryptographically strong code generation
    let inviteCode = '';
    let isUnique = false;
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous 0,O,1,I

    const getRandomChar = () => {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return chars.charAt(array[0] % chars.length);
    };

    for (let attempt = 0; attempt < 5; attempt++) {
      let codePart = '';
      for (let i = 0; i < 5; i++) {
        codePart += getRandomChar();
      }
      const candidate = `TRUST-${codePart}`;
      const existingQuery = query(collection(db, 'couples'), where('inviteCode', '==', candidate));
      const existingSnap = await getDocs(existingQuery);
      if (existingSnap.empty) {
        inviteCode = candidate;
        isUnique = true;
        break;
      }
    }

    if (!isUnique) {
      let fallbackPart = '';
      for (let i = 0; i < 6; i++) {
        fallbackPart += getRandomChar();
      }
      inviteCode = `TRUST-${fallbackPart}`;
    }

    const newCoupleRef = doc(collection(db, 'couples'));
    const resolvedType = relationshipType || userProfile?.relationshipType || 'Dating';
    const newCouple: CoupleSpace = {
      id: newCoupleRef.id,
      name: trimmedName,
      inviteCode,
      creatorId: currentUser.uid,
      createdBy: currentUser.uid,
      creatorName: userProfile?.displayName || currentUser.displayName || 'Partner',
      memberIds: [currentUser.uid],
      status: 'waiting',
      relationshipType: resolvedType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(newCoupleRef, newCouple);
    await updateUserProfile({ 
      coupleId: newCoupleRef.id, 
      relationshipStatus: resolvedType,
      relationshipType: resolvedType
    });
    setCoupleSpace(newCouple);
    return newCouple;
  };

  const validateInviteCode = async (code: string): Promise<{ couple: CoupleSpace; creatorName: string }> => {
    if (!currentUser) throw new Error("Must be logged in.");

    let cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCode.startsWith('TRUST-') && cleanCode.length >= 4 && cleanCode.length <= 7) {
      cleanCode = `TRUST-${cleanCode}`;
    }

    if (!cleanCode) {
      throw new Error("Please enter an invitation code.");
    }

    const q = query(collection(db, 'couples'), where('inviteCode', '==', cleanCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("Invitation not found. Check the code and try again.");
    }

    const coupleDoc = snap.docs[0];
    const data = { id: coupleDoc.id, ...coupleDoc.data() } as CoupleSpace;

    if (data.memberIds?.includes(currentUser.uid)) {
      throw new Error("You're already connected to this Couple Space.");
    }

    if (data.status === 'connected' || (data.memberIds && data.memberIds.length >= 2)) {
      throw new Error("This Couple Space is already connected.");
    }

    // Retrieve creator real display name
    let creatorDisplayName = data.creatorName || 'Partner';
    try {
      const creatorId = data.createdBy || data.creatorId;
      if (creatorId) {
        const creatorSnap = await getDoc(doc(db, 'users', creatorId));
        if (creatorSnap.exists()) {
          const profile = creatorSnap.data() as UserProfile;
          if (profile.displayName) {
            creatorDisplayName = profile.displayName;
          }
        }
      }
    } catch {
      // Gracefully fall back to saved creatorName
    }

    return {
      couple: data,
      creatorName: creatorDisplayName
    };
  };

  const confirmJoinCouple = async (coupleId: string): Promise<CoupleSpace> => {
    if (!currentUser) throw new Error("Must be logged in.");

    const coupleRef = doc(db, 'couples', coupleId);
    const snap = await getDoc(coupleRef);
    if (!snap.exists()) {
      throw new Error("This Couple Space no longer exists.");
    }

    const data = { id: snap.id, ...snap.data() } as CoupleSpace;
    if (data.memberIds?.includes(currentUser.uid)) {
      await updateUserProfile({ coupleId });
      setCoupleSpace(data);
      return data;
    }

    if (data.status === 'connected' || (data.memberIds && data.memberIds.length >= 2)) {
      throw new Error("This Couple Space is already connected.");
    }

    const creatorUid = data.createdBy || data.creatorId;
    const updatedMembers = [creatorUid, currentUser.uid];

    await updateDoc(coupleRef, {
      memberIds: updatedMembers,
      status: 'connected',
      updatedAt: new Date().toISOString()
    });

    await updateUserProfile({
      coupleId,
      relationshipStatus: data.relationshipType || 'In a relationship',
      relationshipType: data.relationshipType || 'In a relationship',
      updatedAt: new Date().toISOString()
    });

    const updatedCouple: CoupleSpace = {
      ...data,
      memberIds: updatedMembers,
      status: 'connected'
    };
    setCoupleSpace(updatedCouple);
    return updatedCouple;
  };

  const joinCouple = async (code: string): Promise<boolean> => {
    const { couple } = await validateInviteCode(code);
    await confirmJoinCouple(couple.id);
    return true;
  };

  const disconnectCouple = async () => {
    if (!currentUser || !coupleSpace) return;
    
    // Remove self from memberIds or mark disconnected if alone
    const remainingMembers = coupleSpace.memberIds.filter(id => id !== currentUser.uid);
    if (remainingMembers.length === 0) {
      await updateDoc(doc(db, 'couples', coupleSpace.id), {
        status: 'disconnected',
        memberIds: []
      });
    } else {
      await updateDoc(doc(db, 'couples', coupleSpace.id), {
        memberIds: remainingMembers
      });
    }

    await updateUserProfile({ coupleId: null });
    setCoupleSpace(null);
    setPartnerProfile(null);
  };

  const refreshCoupleData = async () => {
    if (!userProfile?.coupleId) return;
    const coupleSnap = await getDoc(doc(db, 'couples', userProfile.coupleId));
    if (coupleSnap.exists()) {
      setCoupleSpace({ id: coupleSnap.id, ...coupleSnap.data() } as CoupleSpace);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      coupleSpace,
      partnerProfile,
      loading,
      isAdmin,
      signInWithGoogle,
      signUpEmail,
      loginEmail,
      logout,
      resetPassword,
      resendVerification,
      updateUserProfile,
      createCouple,
      validateInviteCode,
      confirmJoinCouple,
      joinCouple,
      disconnectCouple,
      refreshCoupleData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
