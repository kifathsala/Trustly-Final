import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CoupleSpace, UserProfile, ConnectionItem, ConnectionType } from '../types';
import { getConnectionLabel } from '../lib/connection';

interface ActiveConnectionContextType {
  connections: ConnectionItem[];
  activeConnections: ConnectionItem[];
  archivedConnections: ConnectionItem[];
  activeConnection: ConnectionItem | null;
  activeConnectionId: string | null;
  activeCoupleSpace: CoupleSpace | null;
  partnerProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  setActiveConnectionId: (id: string) => Promise<void>;
  archiveConnection: (connectionId: string) => Promise<void>;
  restoreConnection: (connectionId: string) => Promise<void>;
  removeConnection: (connectionId: string) => Promise<void>;
  editConnection: (
    connectionId: string, 
    customName?: string, 
    relationshipType?: ConnectionType | string
  ) => Promise<void>;
  refreshConnections: () => Promise<void>;
}

const ActiveConnectionContext = createContext<ActiveConnectionContextType | undefined>(undefined);

export const ActiveConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, updateUserProfile, setCoupleSpace } = useAuth();
  
  const [rawSpaces, setRawSpaces] = useState<CoupleSpace[]>([]);
  const [partnerProfilesMap, setPartnerProfilesMap] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 1. Listen in real-time to user's connections (where memberIds includes currentUser.uid)
  useEffect(() => {
    if (!currentUser?.uid) {
      setRawSpaces([]);
      setPartnerProfilesMap({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const couplesCol = collection(db, 'couples');
    const memberQuery = query(couplesCol, where('memberIds', 'array-contains', currentUser.uid));

    const unsubscribe = onSnapshot(
      memberQuery,
      async (snapshot) => {
        try {
          const spaces: CoupleSpace[] = [];
          const partnerUidsToFetch: string[] = [];

          snapshot.docs.forEach((d) => {
            const data = { id: d.id, ...d.data() } as CoupleSpace;
            spaces.push(data);
            const otherMemberId = data.memberIds?.find((id) => id !== currentUser.uid);
            if (otherMemberId && !partnerProfilesMap[otherMemberId]) {
              partnerUidsToFetch.push(otherMemberId);
            }
          });

          setRawSpaces(spaces);

          // Fetch partner profiles for newly discovered partners
          if (partnerUidsToFetch.length > 0) {
            const newProfiles: Record<string, UserProfile> = {};
            await Promise.all(
              partnerUidsToFetch.map(async (uid) => {
                try {
                  const pDoc = await getDoc(doc(db, 'users', uid));
                  if (pDoc.exists()) {
                    newProfiles[uid] = { uid: pDoc.id, ...pDoc.data() } as UserProfile;
                  }
                } catch (err) {
                  console.warn('Could not fetch partner profile for:', uid, err);
                }
              })
            );
            setPartnerProfilesMap((prev) => ({ ...prev, ...newProfiles }));
          }
          setLoading(false);
        } catch (err: any) {
          console.error('Error in connections snapshot processing:', err);
          setError('Unable to load your connections.');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Connections Firestore listener error:', err);
        setError('Unable to load your connections.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 2. Build enriched ConnectionItem[]
  const connections: ConnectionItem[] = useMemo(() => {
    if (!currentUser) return [];

    return rawSpaces.map((space) => {
      const otherMemberId = space.memberIds?.find((id) => id !== currentUser.uid);
      const partner = otherMemberId ? partnerProfilesMap[otherMemberId] || null : null;

      // Check if user archived this space locally or globally
      const isArchived = Boolean(
        space.status === 'archived' ||
        (space.archivedBy && space.archivedBy.includes(currentUser.uid))
      );

      // Custom name priority: customNames[uid] > partner displayName > creatorName > "Connection"
      const customName = space.customNames?.[currentUser.uid];
      const displayName = customName || partner?.displayName || space.creatorName || 'Connection';

      // Custom relationship type priority: customRelationshipTypes[uid] > space.connectionType > space.relationshipType
      const rawRel = space.customRelationshipTypes?.[currentUser.uid] || space.connectionType || space.relationshipType || 'other';
      const relationshipType = getConnectionLabel(rawRel);

      // Status resolution
      let status: 'waiting' | 'connected' | 'archived' = 'connected';
      if (isArchived) {
        status = 'archived';
      } else if (space.status === 'waiting' || (space.memberIds && space.memberIds.length < 2)) {
        status = 'waiting';
      }

      // Real factual activity timestamp
      const lastActivityAt = space.lastActivityAt || space.updatedAt || space.createdAt || null;

      return {
        id: space.id,
        space,
        partner,
        partnerId: otherMemberId,
        displayName,
        relationshipType,
        rawConnectionType: rawRel,
        status,
        isArchived,
        lastActivityAt,
        lastActivityDesc: space.lastActivityDesc || null,
        createdAt: space.createdAt
      };
    });
  }, [rawSpaces, partnerProfilesMap, currentUser]);

  const activeConnections = useMemo(() => {
    return connections.filter((c) => !c.isArchived);
  }, [connections]);

  const archivedConnections = useMemo(() => {
    return connections.filter((c) => c.isArchived);
  }, [connections]);

  // 3. Keep activeConnection synced
  const activeConnection = useMemo(() => {
    if (!connections.length) return null;

    // 1st priority: explicit selectedId if still exists
    if (selectedId) {
      const match = connections.find((c) => c.id === selectedId);
      if (match) return match;
    }

    // 2nd priority: userProfile.coupleId
    if (userProfile?.coupleId) {
      const match = connections.find((c) => c.id === userProfile.coupleId);
      if (match) return match;
    }

    // 3rd priority: first active non-archived connection
    if (activeConnections.length > 0) {
      return activeConnections[0];
    }

    // 4th priority: any connection
    return connections[0] || null;
  }, [connections, activeConnections, selectedId, userProfile?.coupleId]);

  const activeConnectionId = activeConnection?.id || null;
  const activeCoupleSpace = activeConnection?.space || null;
  const activePartnerProfile = activeConnection?.partner || null;

  // Whenever activeConnection changes, sync with AuthContext coupleSpace
  useEffect(() => {
    if (activeCoupleSpace) {
      setCoupleSpace(activeCoupleSpace);
    }
  }, [activeCoupleSpace?.id, setCoupleSpace]);

  // 4. Action: Switch Active Connection
  const setActiveConnectionId = useCallback(async (id: string) => {
    setSelectedId(id);
    const target = connections.find((c) => c.id === id);
    if (target) {
      setCoupleSpace(target.space);
      if (currentUser?.uid) {
        try {
          await updateUserProfile({ coupleId: id });
        } catch (e) {
          console.warn('Could not persist active coupleId in profile:', e);
        }
      }
    }
  }, [connections, currentUser?.uid, setCoupleSpace, updateUserProfile]);

  // 5. Action: Archive Connection
  const archiveConnection = useCallback(async (connectionId: string) => {
    if (!currentUser?.uid) return;
    try {
      const spaceRef = doc(db, 'couples', connectionId);
      await updateDoc(spaceRef, {
        archivedBy: arrayUnion(currentUser.uid),
        updatedAt: new Date().toISOString()
      });

      // If active connection was archived, pick next available active connection
      if (activeConnectionId === connectionId) {
        const remaining = activeConnections.filter((c) => c.id !== connectionId);
        if (remaining.length > 0) {
          await setActiveConnectionId(remaining[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to archive connection:', err);
      throw err;
    }
  }, [currentUser?.uid, activeConnectionId, activeConnections, setActiveConnectionId]);

  // 6. Action: Restore Connection
  const restoreConnection = useCallback(async (connectionId: string) => {
    if (!currentUser?.uid) return;
    try {
      const spaceRef = doc(db, 'couples', connectionId);
      await updateDoc(spaceRef, {
        archivedBy: arrayRemove(currentUser.uid),
        status: 'connected',
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Failed to restore connection:', err);
      throw err;
    }
  }, [currentUser?.uid]);

  // 7. Action: Edit Connection metadata (display alias, relationship type)
  const editConnection = useCallback(async (
    connectionId: string, 
    customName?: string, 
    relationshipType?: ConnectionType | string
  ) => {
    if (!currentUser?.uid) return;
    try {
      const spaceRef = doc(db, 'couples', connectionId);
      const updates: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };

      if (customName !== undefined) {
        updates[`customNames.${currentUser.uid}`] = customName.trim();
      }

      if (relationshipType !== undefined) {
        updates[`customRelationshipTypes.${currentUser.uid}`] = relationshipType;
      }

      await updateDoc(spaceRef, updates);
    } catch (err: any) {
      console.error('Failed to update connection details:', err);
      throw err;
    }
  }, [currentUser?.uid]);

  // 8. Action: Remove Connection
  const removeConnection = useCallback(async (connectionId: string) => {
    if (!currentUser?.uid) return;
    try {
      const spaceRef = doc(db, 'couples', connectionId);
      const spaceSnap = await getDoc(spaceRef);

      if (spaceSnap.exists()) {
        const sData = spaceSnap.data() as CoupleSpace;
        const currentMembers = sData.memberIds || [];

        // If user is creator and only 1 member, or sole member left -> delete document
        if (currentMembers.length <= 1 || sData.createdBy === currentUser.uid) {
          await deleteDoc(spaceRef);
        } else {
          // If joined connection -> safely remove user from memberIds
          await updateDoc(spaceRef, {
            memberIds: arrayRemove(currentUser.uid),
            status: 'disconnected',
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Clear profile coupleId if it was the removed space
      if (userProfile?.coupleId === connectionId) {
        await updateUserProfile({ coupleId: null });
      }

      // Pick next available connection
      const remaining = activeConnections.filter((c) => c.id !== connectionId);
      if (remaining.length > 0) {
        await setActiveConnectionId(remaining[0].id);
      } else {
        setCoupleSpace(null);
      }
    } catch (err: any) {
      console.error('Failed to remove connection:', err);
      throw err;
    }
  }, [currentUser?.uid, userProfile?.coupleId, activeConnections, setActiveConnectionId, setCoupleSpace, updateUserProfile]);

  const refreshConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoading(false);
  }, []);

  const value = useMemo(() => ({
    connections,
    activeConnections,
    archivedConnections,
    activeConnection,
    activeConnectionId,
    activeCoupleSpace,
    partnerProfile: activePartnerProfile,
    loading,
    error,
    setActiveConnectionId,
    archiveConnection,
    restoreConnection,
    removeConnection,
    editConnection,
    refreshConnections
  }), [
    connections,
    activeConnections,
    archivedConnections,
    activeConnection,
    activeConnectionId,
    activeCoupleSpace,
    activePartnerProfile,
    loading,
    error,
    setActiveConnectionId,
    archiveConnection,
    restoreConnection,
    removeConnection,
    editConnection,
    refreshConnections
  ]);

  return (
    <ActiveConnectionContext.Provider value={value}>
      {children}
    </ActiveConnectionContext.Provider>
  );
};

export function useActiveConnection(): ActiveConnectionContextType {
  const context = useContext(ActiveConnectionContext);
  if (!context) {
    throw new Error('useActiveConnection must be used within an ActiveConnectionProvider');
  }
  return context;
}
