import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  deleteDoc, 
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PrivacyBadge } from './PrivacyBadge';
import { ProfilePrivacySettings, CONNECTION_TYPE_OPTIONS } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  Users, 
  Share2, 
  Download, 
  Trash2, 
  Unlink, 
  Check, 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  Sparkles, 
  Heart, 
  LogOut,
  ChevronRight,
  Info,
  Calendar,
  KeyRound,
  Bell,
  Brain,
  Eye,
  EyeOff,
  User,
  Settings,
  Shield,
  HelpCircle
} from 'lucide-react';

interface SharedItemRecord {
  id: string;
  type: 'checkin' | 'memory' | 'goal' | 'note' | 'date' | 'boundary';
  title: string;
  collectionName: string;
  docPath: string;
  sharedWith: string;
}

interface PrivacyCenterViewProps {
  onBack?: () => void;
}

export const PrivacyCenterView: React.FC<PrivacyCenterViewProps> = ({ onBack }) => {
  const { 
    currentUser, 
    userProfile, 
    partnerProfile, 
    coupleSpace, 
    disconnectCouple, 
    logout, 
    updateUserProfile 
  } = useAuth();

  // Status & Notice State
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Active Connections List (supports current space or multi-connections)
  const [activeConnections, setActiveConnections] = useState<any[]>([]);

  // Modals
  const [itemToStopShare, setItemToStopShare] = useState<SharedItemRecord | null>(null);
  const [showRemoveConnectionModal, setShowRemoveConnectionModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Reusable Sharing Confirmation Demo/Audit Modal (Section 7)
  const [sharingConfirmationDemo, setSharingConfirmationDemo] = useState<{
    isOpen: boolean;
    what: string;
    who: string;
  } | null>(null);

  // Real Shared Items
  const [sharedItems, setSharedItems] = useState<SharedItemRecord[]>([]);

  // Profile Visibility Settings
  const initialPrivacy = userProfile?.profilePrivacy || {};
  const [profilePrivacy, setProfilePrivacy] = useState<ProfilePrivacySettings>({
    shareDisplayName: initialPrivacy.shareDisplayName ?? true,
    sharePhoto: initialPrivacy.sharePhoto ?? true,
    shareBio: initialPrivacy.shareBio ?? false,
    shareBirthday: initialPrivacy.shareBirthday ?? Boolean(userProfile?.shareBirthday ?? false)
  });

  // Birthday Sharing Toggle State (default OFF per spec)
  const [shareBirthday, setShareBirthday] = useState<boolean>(
    Boolean(userProfile?.shareBirthday || userProfile?.profilePrivacy?.shareBirthday)
  );

  // Real Data Counts
  const [dataCounts, setDataCounts] = useState({
    journals: 0,
    privateCheckIns: 0,
    aiConversations: 0,
    sharedMemories: 0,
    sharedGoals: 0,
    sharedNotes: 0,
    sharedCheckIns: 0,
    importantDates: 0,
    boundaries: 0
  });

  useEffect(() => {
    if (!currentUser) return;
    loadPrivacyCenterData();
  }, [currentUser?.uid, coupleSpace?.id]);

  useEffect(() => {
    if (userProfile) {
      const p = userProfile.profilePrivacy || {};
      setProfilePrivacy({
        shareDisplayName: p.shareDisplayName ?? true,
        sharePhoto: p.sharePhoto ?? true,
        shareBio: p.shareBio ?? false,
        shareBirthday: p.shareBirthday ?? Boolean(userProfile.shareBirthday ?? false)
      });
      setShareBirthday(Boolean(userProfile.shareBirthday || p.shareBirthday));
    }
  }, [userProfile]);

  const loadPrivacyCenterData = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    try {
      // 1. Private Data Counts
      const jSnap = await getDocs(query(collection(db, 'journalEntries'), where('userId', '==', currentUser.uid)));
      
      let privateCheckInCount = 0;
      try {
        const cSnap = await getDocs(collection(db, 'users', currentUser.uid, 'checkIns'));
        privateCheckInCount = cSnap.size;
      } catch {
        privateCheckInCount = 0;
      }

      let aiCount = 0;
      try {
        const aiSnap = await getDocs(collection(db, 'users', currentUser.uid, 'aiConversations'));
        aiCount = aiSnap.size;
      } catch {
        aiCount = 0;
      }

      // 2. Active Connections
      const activeShared: SharedItemRecord[] = [];
      const connectionsList: any[] = [];

      if (coupleSpace?.id) {
        const connectionName = partnerProfile?.displayName || coupleSpace?.creatorName || 'Connection Member';
        connectionsList.push({
          id: coupleSpace.id,
          name: connectionName,
          type: coupleSpace.connectionType || 'partner',
          partner: partnerProfile
        });

        // Query shared check-ins
        try {
          const sharedCheckInSnap = await getDocs(collection(db, 'couples', coupleSpace.id, 'sharedCheckIns'));
          sharedCheckInSnap.docs.forEach(d => {
            const data = d.data();
            if (data.userId === currentUser.uid || data.createdBy === currentUser.uid) {
              activeShared.push({
                id: d.id,
                type: 'checkin',
                title: `Check-in Pulse: ${data.feeling || 'Reflection'}`,
                collectionName: 'sharedCheckIns',
                docPath: `couples/${coupleSpace.id}/sharedCheckIns/${d.id}`,
                sharedWith: connectionName
              });
            }
          });
        } catch {}

        // Query shared memories
        try {
          const memSnap = await getDocs(collection(db, 'couples', coupleSpace.id, 'memories'));
          memSnap.docs.forEach(d => {
            const data = d.data();
            if (data.createdBy === currentUser.uid) {
              activeShared.push({
                id: d.id,
                type: 'memory',
                title: data.title || 'Shared Memory',
                collectionName: 'memories',
                docPath: `couples/${coupleSpace.id}/memories/${d.id}`,
                sharedWith: connectionName
              });
            }
          });
        } catch {}

        // Query shared goals
        try {
          const goalSnap = await getDocs(collection(db, 'couples', coupleSpace.id, 'goals'));
          goalSnap.docs.forEach(d => {
            const data = d.data();
            if (data.createdBy === currentUser.uid) {
              activeShared.push({
                id: d.id,
                type: 'goal',
                title: data.title || 'Shared Goal',
                collectionName: 'goals',
                docPath: `couples/${coupleSpace.id}/goals/${d.id}`,
                sharedWith: connectionName
              });
            }
          });
        } catch {}

        // Query shared notes
        try {
          const noteSnap = await getDocs(collection(db, 'couples', coupleSpace.id, 'sharedNotes'));
          noteSnap.docs.forEach(d => {
            const data = d.data();
            if (data.createdBy === currentUser.uid) {
              activeShared.push({
                id: d.id,
                type: 'note',
                title: data.title || 'Shared Note',
                collectionName: 'sharedNotes',
                docPath: `couples/${coupleSpace.id}/sharedNotes/${d.id}`,
                sharedWith: connectionName
              });
            }
          });
        } catch {}

        // Query important dates
        try {
          const dateSnap = await getDocs(collection(db, 'couples', coupleSpace.id, 'importantDates'));
          dateSnap.docs.forEach(d => {
            const data = d.data();
            if (data.createdBy === currentUser.uid) {
              activeShared.push({
                id: d.id,
                type: 'date',
                title: data.title || 'Important Date',
                collectionName: 'importantDates',
                docPath: `couples/${coupleSpace.id}/importantDates/${d.id}`,
                sharedWith: connectionName
              });
            }
          });
        } catch {}
      }

      setActiveConnections(connectionsList);
      setSharedItems(activeShared);
      setDataCounts({
        journals: jSnap.size,
        privateCheckIns: privateCheckInCount,
        aiConversations: aiCount,
        sharedMemories: activeShared.filter(i => i.type === 'memory').length,
        sharedGoals: activeShared.filter(i => i.type === 'goal').length,
        sharedNotes: activeShared.filter(i => i.type === 'note').length,
        sharedCheckIns: activeShared.filter(i => i.type === 'checkin').length,
        importantDates: activeShared.filter(i => i.type === 'date').length,
        boundaries: activeShared.filter(i => i.type === 'boundary').length
      });

    } catch (e) {
      console.warn("Error loading privacy center data:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Profile Visibility Toggle Handler
  const handleToggleProfileVisibility = async (field: keyof ProfilePrivacySettings) => {
    if (!currentUser) return;
    const nextVal = !profilePrivacy[field];
    const updated = { ...profilePrivacy, [field]: nextVal };
    setProfilePrivacy(updated);

    try {
      const updates: any = {
        profilePrivacy: updated
      };
      if (field === 'shareBirthday') {
        updates.shareBirthday = nextVal;
        setShareBirthday(nextVal);
      }
      await updateUserProfile(updates);
      setActionNotice("Profile visibility preference updated.");
      setTimeout(() => setActionNotice(null), 2500);
    } catch (err) {
      setProfilePrivacy(profilePrivacy); // revert
      setErrorNotice("Failed to update profile visibility.");
    }
  };

  // Birthday Sharing Toggle Handler
  const handleToggleBirthdayShare = async () => {
    if (!currentUser) return;
    const nextVal = !shareBirthday;
    setShareBirthday(nextVal);
    const updatedPrivacy = { ...profilePrivacy, shareBirthday: nextVal };
    setProfilePrivacy(updatedPrivacy);

    try {
      await updateUserProfile({
        shareBirthday: nextVal,
        profilePrivacy: updatedPrivacy
      });
      setActionNotice(
        nextVal 
          ? "Birthday sharing enabled. Your connected people can now see your birthday." 
          : "Birthday sharing disabled. Only you can see your birthday."
      );
      setTimeout(() => setActionNotice(null), 3000);
    } catch (e) {
      setShareBirthday(!nextVal);
      setErrorNotice("Failed to update birthday privacy setting.");
    }
  };

  // Stop Sharing Confirmation
  const handleConfirmStopSharing = async () => {
    if (!itemToStopShare) return;
    setIsProcessing(true);
    setErrorNotice(null);
    try {
      await deleteDoc(doc(db, itemToStopShare.docPath));
      setActionNotice(`Stopped sharing "${itemToStopShare.title}". Access removed for connection.`);
      setItemToStopShare(null);
      await loadPrivacyCenterData();
    } catch (err: any) {
      console.error("Stop sharing error:", err);
      setErrorNotice("Could not update sharing permissions. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove Connection Confirmation
  const handleConfirmRemoveConnection = async () => {
    setIsProcessing(true);
    setErrorNotice(null);
    try {
      await disconnectCouple();
      setActionNotice("Connection removed. Access to shared connection space has been revoked.");
      setShowRemoveConnectionModal(false);
      await loadPrivacyCenterData();
    } catch (err: any) {
      console.error("Remove connection error:", err);
      setErrorNotice("Failed to remove connection. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Data Export (User's own data only)
  const handleExportData = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    setErrorNotice(null);
    try {
      const userExport: Record<string, any> = {
        exportDate: new Date().toISOString(),
        userProfile: {
          uid: currentUser.uid,
          displayName: userProfile?.displayName,
          email: currentUser.email,
          createdAt: userProfile?.createdAt,
          profilePrivacy: userProfile?.profilePrivacy,
          shareBirthday: userProfile?.shareBirthday
        }
      };

      // Personal Journals
      const jSnap = await getDocs(query(collection(db, 'journalEntries'), where('userId', '==', currentUser.uid)));
      userExport.personalJournals = jSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Personal Check-Ins
      try {
        const cSnap = await getDocs(collection(db, 'users', currentUser.uid, 'checkIns'));
        userExport.personalCheckIns = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {}

      // Personal AI conversations
      try {
        const aiSnap = await getDocs(collection(db, 'users', currentUser.uid, 'aiConversations'));
        userExport.aiConversations = aiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {}

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(userExport, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `trustly-privacy-export-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setActionNotice("Your private data export was generated successfully.");
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err) {
      setErrorNotice("Could not complete export. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Account Deletion
  const handleConfirmDeleteAccount = async () => {
    if (!currentUser || deleteConfirmationText.trim().toUpperCase() !== 'DELETE') return;
    setIsProcessing(true);
    setErrorNotice(null);

    try {
      const uid = currentUser.uid;

      // 1. Clean personal journals
      const jSnap = await getDocs(query(collection(db, 'journalEntries'), where('userId', '==', uid)));
      for (const d of jSnap.docs) await deleteDoc(d.ref);

      // 2. Clean personal check-ins
      try {
        const cSnap = await getDocs(collection(db, 'users', uid, 'checkIns'));
        for (const d of cSnap.docs) await deleteDoc(d.ref);
      } catch {}

      // 3. Disconnect space
      if (coupleSpace) {
        try { await disconnectCouple(); } catch {}
      }

      // 4. Remove user profile doc
      await deleteDoc(doc(db, 'users', uid));

      // 5. Delete Firebase Auth user
      try {
        await currentUser.delete();
      } catch {
        await logout();
      }

      setShowDeleteModal(false);
      window.location.reload();
    } catch (err: any) {
      console.error("Delete account error:", err);
      setErrorNotice(err.message || "Could not delete account. Re-authenticate and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getBadgeDetails = (typeStr?: string) => {
    const matched = CONNECTION_TYPE_OPTIONS.find(
      opt => opt.type === typeStr || opt.label.toLowerCase() === (typeStr || '').toLowerCase()
    );
    return matched ? { label: matched.label, emoji: matched.emoji } : { label: 'Connection', emoji: '🤝' };
  };

  return (
    <div className="space-y-6 pb-28 max-w-xl mx-auto animate-fadeIn px-2 sm:px-0">
      
      {/* ========================================================= */}
      {/* 1. HEADER (Section 1) */}
      {/* ========================================================= */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Settings → Privacy Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Your Privacy</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            You control what you share on TRUSTLY.
          </p>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Notifications / Feedback */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-400 hover:text-white p-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorNotice && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-rose-400 hover:text-white p-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. PRIVATE INFORMATION (Section 2) */}
      {/* ========================================================= */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-start justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-zinc-800 border border-white/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Private Information</span>
              </h2>
              <span className="text-[11px] text-emerald-400 font-semibold block mt-0.5">
                Private by default
              </span>
            </div>
          </div>
          <PrivacyBadge state="private" label="🔒 Only You" />
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          These things are visible only to you unless you explicitly choose to share them.
        </p>

        <div className="space-y-2 pt-1">
          {[
            { label: 'Private Check-Ins', count: `${dataCounts.privateCheckIns} check-in reflections`, icon: Heart },
            { label: 'Private Reflections & Personal Journal', count: `${dataCounts.journals} private entries`, icon: FileText },
            { label: 'Private AI Coach Conversations', count: 'Confidential chats', icon: Brain },
            { label: 'Personal Notes', count: 'Owner encrypted', icon: Lock },
            { label: 'Personal Account Information', count: 'Email & credentials', icon: KeyRound }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/5 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-zinc-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">{item.label}</div>
                  <div className="text-[10px] text-zinc-400">{item.count}</div>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Lock className="w-3 h-3" />
                <span>🔒 Only You</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. SHARED INFORMATION (Section 3) */}
      {/* ========================================================= */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-violet-500/20 space-y-4 shadow-xl">
        <div className="flex items-start justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-violet-500/15 border border-violet-500/30 text-violet-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Shared Information</span>
              </h2>
              <span className="text-[11px] text-violet-300 font-semibold block mt-0.5">
                Shared by your choice
              </span>
            </div>
          </div>
          <PrivacyBadge state="shared" label="👥 Connection Members" />
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Information only becomes visible to a connection when you explicitly share it.
        </p>

        {/* Categories Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
          {[
            { label: 'Shared Check-Ins', count: dataCounts.sharedCheckIns },
            { label: 'Shared Memories', count: dataCounts.sharedMemories },
            { label: 'Shared Goals', count: dataCounts.sharedGoals },
            { label: 'Shared Notes', count: dataCounts.sharedNotes },
            { label: 'Important Dates', count: dataCounts.importantDates },
            { label: 'Boundaries & Agreements', count: dataCounts.boundaries || 'Agreed' },
            { label: 'Conversation Responses', count: 'Consensual' }
          ].map((cat, idx) => (
            <div key={idx} className="p-3 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-1">
              <div className="text-[11px] font-bold text-white truncate">{cat.label}</div>
              <div className="text-[10px] text-violet-300 font-mono flex items-center justify-between">
                <span>{cat.count}</span>
                <Users className="w-3 h-3 text-violet-400" />
              </div>
            </div>
          ))}
        </div>

        {/* Individual Shared Items if any */}
        {sharedItems.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Items currently shared ({sharedItems.length})
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {sharedItems.map((item) => (
                <div key={item.id} className="p-3 rounded-2xl bg-zinc-950/80 border border-violet-500/20 flex items-center justify-between text-xs">
                  <div className="overflow-hidden mr-2">
                    <div className="font-semibold text-white truncate max-w-[200px]">{item.title}</div>
                    <div className="text-[10px] text-violet-300 mt-0.5 truncate">
                      Shared with: {item.sharedWith}
                    </div>
                  </div>

                  <button
                    onClick={() => setItemToStopShare(item)}
                    className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold border border-rose-500/20 transition-all cursor-pointer shrink-0"
                  >
                    Stop Sharing
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. PROFILE VISIBILITY (Section 4) */}
      {/* ========================================================= */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Profile Visibility</h2>
              <p className="text-[10px] text-zinc-400">Control what your connections can view on your profile</p>
            </div>
          </div>
          <PrivacyBadge state="controlled" label="⚙️ Controlled by you" />
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Choose whether selected profile information is visible to your connections or kept private.
        </p>

        <div className="divide-y divide-white/5 bg-zinc-950/60 p-3.5 rounded-2xl border border-white/5 text-xs">
          {/* Display Name */}
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Display Name</div>
              <div className="text-[10px] text-zinc-400">
                {profilePrivacy.shareDisplayName ? 'Visible to connections' : 'Private'}
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profilePrivacy.shareDisplayName}
                onChange={() => handleToggleProfileVisibility('shareDisplayName')}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600" />
            </label>
          </div>

          {/* Profile Photo */}
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Profile Photo</div>
              <div className="text-[10px] text-zinc-400">
                {profilePrivacy.sharePhoto ? 'Visible to connections' : 'Private'}
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profilePrivacy.sharePhoto}
                onChange={() => handleToggleProfileVisibility('sharePhoto')}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600" />
            </label>
          </div>

          {/* Bio (Default OFF) */}
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Bio ("About me")</div>
              <div className="text-[10px] text-zinc-400">
                {profilePrivacy.shareBio ? 'Visible to connections' : 'Private (Default OFF)'}
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profilePrivacy.shareBio}
                onChange={() => handleToggleProfileVisibility('shareBio')}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600" />
            </label>
          </div>

          {/* Birthday (Default OFF) */}
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Birthday</div>
              <div className="text-[10px] text-zinc-400">
                {profilePrivacy.shareBirthday ? 'Visible to connections' : 'Private (Default OFF)'}
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profilePrivacy.shareBirthday}
                onChange={() => handleToggleProfileVisibility('shareBirthday')}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600" />
            </label>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. BIRTHDAY PRIVACY (Section 5) */}
      {/* ========================================================= */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-rose-500/20 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center text-lg shrink-0">
              🎂
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Birthday Sharing</h2>
              <p className="text-[10px] text-zinc-400">Manage celebration and reminder visibility</p>
            </div>
          </div>
          <PrivacyBadge state="controlled" label="⚙️ Controlled by you" />
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Allow my connections to see my birthday</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {shareBirthday 
                  ? 'Your connected people can see your birthday.' 
                  : 'Only you can see your birthday.'}
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={shareBirthday}
                onChange={handleToggleBirthdayShare}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600" />
            </label>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-start gap-2 text-[10px] text-zinc-400 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
            <span>
              Uses your existing profile birthday date. Your birth year and exact age are strictly private and never exposed.
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. AI COACH PRIVACY (Section 6) */}
      {/* ========================================================= */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">AI Coach Privacy</h2>
              <span className="text-[11px] text-emerald-400 font-semibold block mt-0.5">
                🔒 Private by default
              </span>
            </div>
          </div>
          <PrivacyBadge state="private" label="🔒 Private" />
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-2.5">
          <h3 className="text-xs font-bold text-white">Your AI Coach conversations are private.</h3>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Your conversations with TRUSTLY's AI Coach are not automatically shared with your connections.
          </p>
          <div className="pt-1 flex items-center gap-2 text-[10px] text-zinc-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Never automatically published. Any sharing requires your explicit confirmation.</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 7. NOTIFICATION PRIVACY */}
      {/* ========================================================= */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Notification Privacy</h2>
              <p className="text-[10px] text-zinc-400">Strict alerts boundary</p>
            </div>
          </div>
          <PrivacyBadge state="controlled" label="⚙️ Controlled by you" />
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Notifications are sent strictly for consensual shared actions (new shared check-in, milestone date, or invitation acceptance). Personal reflections and private notes never trigger notifications.
        </p>
      </div>

      {/* ========================================================= */}
      {/* 8. SECURITY & CONNECTION ACCESS (Section 8 & 10) */}
      {/* ========================================================= */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Connection Access</h2>
              <p className="text-[10px] text-zinc-400">Factual permissions per active connection</p>
            </div>
          </div>
          <PrivacyBadge state="controlled" label="Factual" />
        </div>

        {activeConnections.length === 0 ? (
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 text-center text-xs text-zinc-400">
            No active connections. When you connect with someone, their factual access will be listed here.
          </div>
        ) : (
          <div className="space-y-4">
            {activeConnections.map((conn) => {
              const badge = getBadgeDetails(conn.type);
              return (
                <div key={conn.id} className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{conn.name}</div>
                      <span className="text-[10px] text-zinc-300 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 inline-flex items-center gap-1 mt-0.5">
                        <span>{badge.emoji}</span>
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => setShowRemoveConnectionModal(true)}
                      className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 cursor-pointer transition-all"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    {/* Can See */}
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Can see:</span>
                      </div>
                      <ul className="text-[11px] text-zinc-300 space-y-1">
                        <li>✓ Shared memories</li>
                        <li>✓ Shared goals</li>
                        <li>✓ Shared notes</li>
                        <li>✓ Shared check-ins</li>
                        <li>✓ Important dates</li>
                        <li>✓ Boundaries & agreements</li>
                      </ul>
                    </div>

                    {/* Cannot See */}
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Cannot see:</span>
                      </div>
                      <ul className="text-[11px] text-zinc-300 space-y-1">
                        <li>🔒 Private check-ins</li>
                        <li>🔒 Private reflections</li>
                        <li>🔒 Private AI conversations</li>
                        <li>🔒 Personal journal entries</li>
                        <li>🔒 Private birthday (unless toggled)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 9. DATA & ACCOUNT (Section 9) */}
      {/* ========================================================= */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-white/5 pb-3">
          <div className="w-9 h-9 rounded-2xl bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">Your Account Data</h2>
            <p className="text-[10px] text-zinc-400">Ownership, export & lifecycle management</p>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleExportData}
            disabled={isProcessing}
            className="w-full p-4 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900 border border-white/5 hover:border-white/15 flex items-center justify-between text-xs text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Download className="w-4 h-4 text-violet-400" />
              <div className="text-left">
                <span className="font-semibold block">Download My Data</span>
                <span className="text-[10px] text-zinc-400">Export your private profile, check-ins, and journals as JSON</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full p-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex items-center justify-between text-xs text-rose-300 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <div className="text-left">
                <span className="font-semibold block text-rose-300">Delete My Account</span>
                <span className="text-[10px] text-rose-400/80">Permanently delete your profile and personal data</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SHARING CONFIRMATION MODAL (Section 7) */}
      {/* ========================================================= */}
      {sharingConfirmationDemo && sharingConfirmationDemo.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121218] border border-violet-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-center animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/30 text-violet-400 flex items-center justify-center mx-auto">
              <Share2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">You're about to share this.</h3>
              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-white/5 text-left text-xs mt-3 space-y-1.5">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">What will be shared:</span>
                  <span className="text-white font-medium">{sharingConfirmationDemo.what}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Who can see it:</span>
                  <span className="text-violet-300 font-medium">{sharingConfirmationDemo.who}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setSharingConfirmationDemo(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-semibold border border-white/5 hover:text-white cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setSharingConfirmationDemo(null);
                  setActionNotice("Item shared successfully.");
                  setTimeout(() => setActionNotice(null), 2500);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-bold cursor-pointer"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STOP SHARING MODAL */}
      {itemToStopShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121218] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Stop sharing this item?</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              "{itemToStopShare.title}" will no longer be visible to <strong>{itemToStopShare.sharedWith}</strong>.
            </p>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setItemToStopShare(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-semibold border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStopSharing}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE CONNECTION CONFIRMATION */}
      {showRemoveConnectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121218] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <Unlink className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Remove this connection?</h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                This will end access to the shared connection space. Your personal reflections remain 100% private.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setShowRemoveConnectionModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-semibold border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoveConnection}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121218] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">Delete Account</h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                This permanently deletes your TRUSTLY account and associated personal data where applicable.
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] text-zinc-400">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-semibold border border-white/5 cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmDeleteAccount}
                disabled={isProcessing || deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
