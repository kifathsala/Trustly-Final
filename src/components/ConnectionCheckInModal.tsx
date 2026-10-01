import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ConnectionCheckIn, 
  SharedConnectionCheckIn, 
  CheckInArea 
} from '../types';
import { 
  FEELING_OPTIONS, 
  CHECKIN_AREAS, 
  getConnectionCheckInCopy, 
  getFeelingDetails,
  FeelingOption 
} from '../lib/checkIn';
import { sendNotification } from '../lib/notifications';
import { 
  X, 
  Lock, 
  Users, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Share2, 
  History, 
  Calendar, 
  Tag, 
  Trash2, 
  Loader2, 
  ArrowRight,
  Filter,
  Eye,
  Info
} from 'lucide-react';

interface ConnectionCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'new' | 'history' | 'shared';
  onCheckInSaved?: () => void;
}

export const ConnectionCheckInModal: React.FC<ConnectionCheckInModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'new',
  onCheckInSaved
}) => {
  const { currentUser, userProfile, partnerProfile, coupleSpace } = useAuth();

  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'shared'>(initialTab);
  const [selectedFeeling, setSelectedFeeling] = useState<FeelingOption>(FEELING_OPTIONS[1]); // Connected
  const [selectedAreas, setSelectedAreas] = useState<CheckInArea[]>([]);
  const [reflection, setReflection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Explicit share confirmation dialog state
  const [showShareConfirm, setShowShareConfirm] = useState(false);

  // History state
  const [privateCheckIns, setPrivateCheckIns] = useState<ConnectionCheckIn[]>([]);
  const [sharedCheckIns, setSharedCheckIns] = useState<SharedConnectionCheckIn[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<string>('All');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const connectionId = coupleSpace?.id;
  const partnerName = partnerProfile?.displayName || coupleSpace?.creatorName || 'Your Connection';
  const copy = getConnectionCheckInCopy(coupleSpace?.connectionType);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMsg(null);
      setSuccessToast(null);
      setShowShareConfirm(false);
    }
  }, [isOpen, initialTab]);

  // Real-time listener for user's private check-ins for this connection
  useEffect(() => {
    if (!currentUser || !connectionId || !isOpen) return;

    setLoadingHistory(true);
    const privateRef = collection(db, 'users', currentUser.uid, 'checkIns');
    const unsubPrivate = onSnapshot(privateRef, (snap) => {
      const items: ConnectionCheckIn[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        // Filter by connectionId or coupleId
        if (data.connectionId === connectionId || data.coupleId === connectionId) {
          items.push({
            id: docSnap.id,
            connectionId: data.connectionId || connectionId,
            userId: currentUser.uid,
            feeling: data.feeling,
            feelingEmoji: data.feelingEmoji,
            areas: data.areas || [],
            privateReflection: data.privateReflection || data.reflection || '',
            isShared: Boolean(data.isShared || data.shareWithPartner),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt
          });
        }
      });

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPrivateCheckIns(items);
      setLoadingHistory(false);
    }, (err) => {
      console.warn("Private check-ins listener notice:", err);
      setLoadingHistory(false);
    });

    // Real-time listener for shared check-ins
    const sharedRef = collection(db, 'couples', connectionId, 'sharedCheckIns');
    const unsubShared = onSnapshot(sharedRef, (snap) => {
      const items: SharedConnectionCheckIn[] = snap.docs.map(d => ({
        id: d.id,
        connectionId,
        ...d.data()
      } as SharedConnectionCheckIn));

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSharedCheckIns(items);
    }, (err) => {
      console.warn("Shared check-ins listener notice:", err);
    });

    return () => {
      unsubPrivate();
      unsubShared();
    };
  }, [currentUser, connectionId, isOpen]);

  if (!isOpen || !coupleSpace || !currentUser) return null;

  const connId = coupleSpace.id;

  const toggleArea = (area: CheckInArea) => {
    setSelectedAreas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const handleSavePrivately = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const checkInId = `checkin_${Date.now()}`;
    const nowIso = new Date().toISOString();

    try {
      // Save strictly to users/{uid}/checkIns/{checkInId}
      const privateDocRef = doc(db, 'users', currentUser.uid, 'checkIns', checkInId);
      const payload: ConnectionCheckIn = {
        id: checkInId,
        connectionId: connId,
        coupleId: connId,
        userId: currentUser.uid,
        createdBy: currentUser.uid,
        creatorName: userProfile?.displayName || 'You',
        feeling: selectedFeeling.label,
        feelingEmoji: selectedFeeling.emoji,
        areas: selectedAreas,
        privateReflection: reflection.trim(),
        reflection: reflection.trim(),
        isShared: false,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await setDoc(privateDocRef, payload);

      setSuccessToast("Check-in saved privately 🔒");
      resetForm();
      if (onCheckInSaved) onCheckInSaved();

      setTimeout(() => {
        setSuccessToast(null);
        setActiveTab('history');
      }, 1000);
    } catch (err: any) {
      console.error("Save private check-in error:", err);
      setErrorMsg(err.message || "Failed to save private check-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmShare = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setShowShareConfirm(false);

    const checkInId = `checkin_${Date.now()}`;
    const nowIso = new Date().toISOString();

    try {
      // 1. Save to users/{uid}/checkIns/{checkInId} marked as isShared: true
      const privateDocRef = doc(db, 'users', currentUser.uid, 'checkIns', checkInId);
      const privatePayload: ConnectionCheckIn = {
        id: checkInId,
        connectionId: connId,
        coupleId: connId,
        userId: currentUser.uid,
        createdBy: currentUser.uid,
        creatorName: userProfile?.displayName || 'You',
        feeling: selectedFeeling.label,
        feelingEmoji: selectedFeeling.emoji,
        areas: selectedAreas,
        privateReflection: reflection.trim(),
        reflection: reflection.trim(),
        isShared: true,
        sharedNote: reflection.trim(),
        createdAt: nowIso,
        updatedAt: nowIso
      };
      await setDoc(privateDocRef, privatePayload);

      // 2. Save explicitly to couples/{connectionId}/sharedCheckIns/{checkInId}
      const sharedDocRef = doc(collection(db, 'couples', connId, 'sharedCheckIns'), checkInId);
      const sharedPayload: SharedConnectionCheckIn = {
        id: checkInId,
        connectionId: connId,
        coupleId: connId,
        createdBy: currentUser.uid,
        userId: currentUser.uid,
        creatorName: userProfile?.displayName || 'Connection Partner',
        feeling: selectedFeeling.label,
        feelingEmoji: selectedFeeling.emoji,
        areas: selectedAreas,
        sharedNote: reflection.trim(),
        createdAt: nowIso,
        date: nowIso.split('T')[0]
      };
      await setDoc(sharedDocRef, sharedPayload);

      // 3. Mirror to connections/{connectionId}/sharedCheckIns/{checkInId}
      try {
        const mirrorDocRef = doc(collection(db, 'connections', connId, 'sharedCheckIns'), checkInId);
        await setDoc(mirrorDocRef, sharedPayload);
      } catch (mirrorErr) {
        // Non-blocking mirror
      }

      // 4. Send real-time notification to the partner
      const partnerId = coupleSpace.memberIds?.find(id => id !== currentUser.uid);
      if (partnerId) {
        sendNotification(partnerId, {
          type: 'check_in_shared',
          title: 'Connection Check-In 💬',
          body: `${userProfile?.displayName || 'Your connection'} shared how they are feeling today.`,
          connectionId: connId
        }).catch(console.warn);
      }

      setSuccessToast("Check-in shared with your connection 👥");
      resetForm();
      if (onCheckInSaved) onCheckInSaved();

      setTimeout(() => {
        setSuccessToast(null);
        setActiveTab('shared');
      }, 1000);
    } catch (err: any) {
      console.error("Save shared check-in error:", err);
      setErrorMsg(err.message || "Failed to share check-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareExistingPrivate = async (checkIn: ConnectionCheckIn) => {
    if (!checkIn.id) return;
    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      // Update private doc
      await setDoc(doc(db, 'users', currentUser.uid, 'checkIns', checkIn.id), {
        isShared: true,
        sharedNote: checkIn.privateReflection || '',
        updatedAt: nowIso
      }, { merge: true });

      // Write to shared collection
      const sharedDocRef = doc(collection(db, 'couples', connId, 'sharedCheckIns'), checkIn.id);
      const sharedPayload: SharedConnectionCheckIn = {
        id: checkIn.id,
        connectionId: connId,
        coupleId: connId,
        createdBy: currentUser.uid,
        userId: currentUser.uid,
        creatorName: userProfile?.displayName || 'Connection Partner',
        feeling: checkIn.feeling,
        feelingEmoji: checkIn.feelingEmoji || getFeelingDetails(checkIn.feeling).emoji,
        areas: checkIn.areas || [],
        sharedNote: checkIn.privateReflection || '',
        createdAt: checkIn.createdAt || nowIso,
        date: (checkIn.createdAt || nowIso).split('T')[0]
      };
      await setDoc(sharedDocRef, sharedPayload);

      // Send notification
      const partnerId = coupleSpace.memberIds?.find(id => id !== currentUser.uid);
      if (partnerId) {
        sendNotification(partnerId, {
          type: 'check_in_shared',
          title: 'Connection Check-In 💬',
          body: `${userProfile?.displayName || 'Your connection'} shared a check-in.`,
          connectionId: connId
        }).catch(console.warn);
      }

      setSuccessToast("Check-in is now shared with this connection 👥");
      setTimeout(() => setSuccessToast(null), 2500);
    } catch (err: any) {
      console.error("Share existing check-in error:", err);
      setErrorMsg("Failed to share check-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePrivate = async (checkInId: string) => {
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'checkIns', checkInId));
      setItemToDelete(null);
    } catch (err) {
      console.error("Delete check-in error:", err);
    }
  };

  const resetForm = () => {
    setSelectedFeeling(FEELING_OPTIONS[1]);
    setSelectedAreas([]);
    setReflection('');
  };

  // Filter private history
  const filteredPrivate = privateCheckIns.filter(item => {
    if (historyFilter === 'All') return true;
    if (historyFilter === 'Feelings') return Boolean(item.feeling);
    return item.areas.includes(historyFilter as CheckInArea);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0e0e13] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between bg-zinc-950/60">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-lg">{selectedFeeling.emoji}</span>
              <span>Connection Check-In</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">{copy.subtitle}</p>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex border-b border-white/5 bg-zinc-950/40 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('new')}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'new'
                ? 'border-violet-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Check In
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-violet-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>My Check-Ins</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/5 text-zinc-400">
              {privateCheckIns.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('shared')}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'shared'
                ? 'border-violet-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3 h-3 text-indigo-400" />
            <span>Shared ({sharedCheckIns.length})</span>
          </button>
        </div>

        {/* Status Toasts & Error */}
        {errorMsg && (
          <div className="m-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successToast && (
          <div className="m-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: NEW CHECK-IN FLOW */}
          {activeTab === 'new' && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Question 1: How are you feeling? */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  {copy.question}
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FEELING_OPTIONS.map((f) => {
                    const isSelected = selectedFeeling.label === f.label;
                    return (
                      <button
                        key={f.label}
                        type="button"
                        onClick={() => setSelectedFeeling(f)}
                        className={`p-3 rounded-2xl text-left transition-all border flex flex-col justify-between gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-br from-violet-600/25 to-pink-600/15 border-violet-500 ring-1 ring-violet-500/40 text-white shadow-lg'
                            : 'bg-zinc-950/60 border-white/5 hover:border-white/15 text-zinc-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{f.emoji}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-violet-400" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold">{f.label}</div>
                          <div className="text-[10px] text-zinc-400 leading-tight line-clamp-1">{f.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 2: What matters most right now? */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                    What matters most right now?
                  </label>
                  <span className="text-[10px] text-zinc-400">Multiple selection</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {CHECKIN_AREAS.map((area) => {
                    const isSelected = selectedAreas.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleArea(area)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-violet-500/20 border-violet-500 text-violet-200 shadow-sm'
                            : 'bg-zinc-950/70 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-violet-400" />}
                        <span>{area}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 3: Optional Private Reflection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Want to write something down?
                  </label>
                  <span className="text-[10px] text-zinc-500">Optional</span>
                </div>

                <textarea
                  rows={3}
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Notes, thoughts, or what you feel right now..."
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none transition-all leading-relaxed"
                />

                {/* Privacy Badge Notice */}
                <div className="p-3 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 flex items-start gap-2.5 text-[11px] text-zinc-300">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-400 block mb-0.5">Private by default 🔒</span>
                    <span className="text-zinc-400 leading-relaxed">
                      Only you can see your reflection unless you choose to share it.
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSavePrivately}
                  className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-white/10 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>Save Privately</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowShareConfirm(true)}
                  className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share With Connection</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: MY CHECK-IN HISTORY (Private) */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0 mr-1" />
                {['All', 'Feelings', 'Communication', 'Trust', 'Support', 'Boundaries', 'Other'].map(f => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                      historyFilter === f
                        ? 'bg-white/15 text-white font-semibold'
                        : 'bg-zinc-950/60 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {loadingHistory ? (
                <div className="p-8 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                  <span>Loading check-in history...</span>
                </div>
              ) : filteredPrivate.length === 0 ? (
                /* Empty state per spec */
                <div className="glass-card rounded-3xl p-8 text-center border border-white/5 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 mx-auto flex items-center justify-center text-xl">
                    🔒
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">No check-ins yet.</h4>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                      Take a moment to reflect on how this connection feels today.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="mt-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer transition-all inline-flex items-center gap-1.5"
                  >
                    <span>Check In Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPrivate.map((item) => {
                    const feelingDetail = getFeelingDetails(item.feeling);
                    const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    const formattedTime = new Date(item.createdAt).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div 
                        key={item.id}
                        className="glass-card rounded-2xl p-4 border border-white/10 space-y-3 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{feelingDetail.emoji}</span>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{feelingDetail.label}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${feelingDetail.badgeBg} ${feelingDetail.badgeBorder} ${feelingDetail.badgeText}`}>
                                  {feelingDetail.label}
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {formattedDate} • {formattedTime}
                              </span>
                            </div>
                          </div>

                          {/* Privacy badge */}
                          <div className="flex items-center gap-1.5">
                            {item.isShared ? (
                              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>👥 Shared with connection</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>🔒 Only you</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Areas */}
                        {item.areas && item.areas.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.areas.map(a => (
                              <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                                {a}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Private Reflection */}
                        {item.privateReflection && (
                          <div className="p-3 rounded-xl bg-zinc-950/70 border border-white/5 text-xs text-zinc-300 leading-relaxed italic">
                            "{item.privateReflection}"
                          </div>
                        )}

                        {/* Actions */}
                        <div className="pt-1 flex items-center justify-between text-xs border-t border-white/5">
                          {!item.isShared ? (
                            <button
                              type="button"
                              onClick={() => handleShareExistingPrivate(item)}
                              className="text-[11px] font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>Share with this connection</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-zinc-500">Shared with {partnerName}</span>
                          )}

                          <button
                            type="button"
                            onClick={() => item.id && handleDeletePrivate(item.id)}
                            className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete check-in"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHARED CHECK-INS */}
          {activeTab === 'shared' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 rounded-2xl bg-indigo-500/[0.04] border border-indigo-500/20 flex items-start gap-2 text-xs text-zinc-400">
                <Users className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Check-ins explicitly shared between you and <strong>{partnerName}</strong>. Private personal reflections are never displayed here.
                </span>
              </div>

              {sharedCheckIns.length === 0 ? (
                /* Empty state per spec */
                <div className="glass-card rounded-3xl p-8 text-center border border-white/5 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center text-xl">
                    👥
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Nothing shared yet.</h4>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                      Share a check-in when you're ready.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="mt-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer transition-all inline-flex items-center gap-1.5"
                  >
                    <span>Create a Check-In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedCheckIns.map((item) => {
                    const feelingDetail = getFeelingDetails(item.feeling || item.feelingEmoji);
                    const isMine = item.createdBy === currentUser.uid || item.userId === currentUser.uid;
                    const senderName = isMine ? 'You' : (item.creatorName || partnerName);
                    const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });

                    return (
                      <div 
                        key={item.id}
                        className="glass-card rounded-2xl p-4 border border-white/10 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{feelingDetail.emoji}</span>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{senderName}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${feelingDetail.badgeBg} ${feelingDetail.badgeBorder} ${feelingDetail.badgeText}`}>
                                  {feelingDetail.label}
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {formattedDate}
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                            <Users className="w-3 h-3" />
                            <span>Shared</span>
                          </span>
                        </div>

                        {/* Areas */}
                        {item.areas && item.areas.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.areas.map(a => (
                              <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                                {a}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Shared Note */}
                        {item.sharedNote && (
                          <div className="p-3 rounded-xl bg-zinc-950/70 border border-white/5 text-xs text-zinc-200 leading-relaxed">
                            "{item.sharedNote}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer with Privacy Assurance */}
        <div className="p-3.5 bg-zinc-950 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>TRUSTLY Privacy-First Check-In</span>
          </span>
          <button onClick={onClose} className="hover:text-zinc-300 transition-colors cursor-pointer">
            Close
          </button>
        </div>

      </div>

      {/* EXPLICIT SHARE CONFIRMATION DIALOG (per Section 4 spec) */}
      {showShareConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121218] border border-violet-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-center animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/30 text-violet-400 flex items-center justify-center mx-auto">
              <Share2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Share this reflection?</h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                Your reflection will become visible to <strong>{partnerName}</strong>.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowShareConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-semibold border border-white/5 hover:text-white cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmShare}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
