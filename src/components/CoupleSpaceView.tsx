import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  SharedMemory, 
  CoupleGoal, 
  ImportantDate, 
  SharedNote, 
  BoundaryItem 
} from '../types';
import { sendPartnerNotification } from '../lib/notifications';
import { 
  Heart, 
  Target, 
  Calendar, 
  StickyNote, 
  Shield, 
  Plus, 
  Users, 
  Check, 
  X, 
  Sparkles, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Camera, 
  Info,
  CalendarHeart,
  TrendingUp,
  Share2,
  Lock,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { CouplePairing } from './CouplePairing';

export const CoupleSpaceView: React.FC = () => {
  const { userProfile, partnerProfile, coupleSpace } = useAuth();

  const [activeTab, setActiveTab] = useState<'memories' | 'goals' | 'dates' | 'notes' | 'boundaries'>('memories');
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Real-time state collections
  const [memories, setMemories] = useState<SharedMemory[]>([]);
  const [goals, setGoals] = useState<CoupleGoal[]>([]);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [boundaries, setBoundaries] = useState<BoundaryItem[]>([]);

  // Modals state
  const [activeModal, setActiveModal] = useState<'memory' | 'goal' | 'date' | 'note' | 'boundary' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Memory
  const [memTitle, setMemTitle] = useState('');
  const [memDesc, setMemDesc] = useState('');
  const [memDate, setMemDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [memPhotoURL, setMemPhotoURL] = useState('');
  const [memConsentChecked, setMemConsentChecked] = useState(false);

  // Form states for Goal
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState<string>('Quality Time');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalProgress, setGoalProgress] = useState<number>(0);

  // Form states for Date
  const [dateTitle, setDateTitle] = useState('');
  const [dateValue, setDateValue] = useState(() => new Date().toISOString().split('T')[0]);
  const [dateCategory, setDateCategory] = useState<'Anniversary' | 'Birthday' | 'First Meeting' | 'Custom Date'>('Anniversary');
  const [dateReminder, setDateReminder] = useState<string>('On the day');

  // Form states for Note
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Form states for Boundary
  const [boundaryTitle, setBoundaryTitle] = useState('');
  const [boundaryDesc, setBoundaryDesc] = useState('');
  const [boundaryCategory, setBoundaryCategory] = useState<BoundaryItem['category']>('Communication');

  // Editing state for notes
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // REAL-TIME FIRESTORE LISTENERS
  useEffect(() => {
    if (!coupleSpace?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const coupleId = coupleSpace.id;

    // 1. Memories listener
    const memRef = collection(db, 'couples', coupleId, 'memories');
    const unsubMem = onSnapshot(memRef, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as SharedMemory));
      // Sort chronologically (newest date first)
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMemories(items);
      setLoading(false);
    }, (err) => {
      console.warn("Memories listener warning:", err);
      setLoading(false);
    });

    // 2. Goals listener
    const goalsRef = collection(db, 'couples', coupleId, 'goals');
    const unsubGoals = onSnapshot(goalsRef, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as CoupleGoal));
      // Sort incomplete first, then newly updated
      items.sort((a, b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1));
      setGoals(items);
    }, (err) => console.warn("Goals listener warning:", err));

    // 3. Important Dates listener
    const datesRef = collection(db, 'couples', coupleId, 'importantDates');
    const unsubDates = onSnapshot(datesRef, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ImportantDate));
      // Sort upcoming dates closest to today first
      const today = new Date().setHours(0,0,0,0);
      items.sort((a, b) => {
        const diffA = new Date(a.date).getTime() - today;
        const diffB = new Date(b.date).getTime() - today;
        if (diffA >= 0 && diffB >= 0) return diffA - diffB; // Both future: nearest first
        if (diffA >= 0) return -1; // A is future, B is past
        if (diffB >= 0) return 1;  // B is future, A is past
        return diffB - diffA;      // Both past: most recent first
      });
      setImportantDates(items);
    }, (err) => console.warn("Dates listener warning:", err));

    // 4. Shared Notes listener
    const notesRef = collection(db, 'couples', coupleId, 'sharedNotes');
    const unsubNotes = onSnapshot(notesRef, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as SharedNote));
      items.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      setSharedNotes(items);
    }, (err) => console.warn("Notes listener warning:", err));

    // 5. Boundaries listener
    const boundariesRef = collection(db, 'couples', coupleId, 'boundaries');
    const unsubBoundaries = onSnapshot(boundariesRef, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as BoundaryItem));
      // Sort pending and discussing first
      items.sort((a, b) => {
        const score = (s: string) => (s === 'pending' ? 0 : s === 'discussing' ? 1 : 2);
        return score(a.status) - score(b.status);
      });
      setBoundaries(items);
    }, (err) => console.warn("Boundaries listener warning:", err));

    return () => {
      unsubMem();
      unsubGoals();
      unsubDates();
      unsubNotes();
      unsubBoundaries();
    };
  }, [coupleSpace?.id]);

  // PHOTO UPLOAD HANDLER (Local base64 preview & persist)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      setErrorBanner("Please choose an image under 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setMemPhotoURL(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // 1. ADD MEMORY
  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleSpace || !userProfile || !memTitle.trim() || !memConsentChecked) return;

    setIsSubmitting(true);
    setErrorBanner(null);
    try {
      const newMemory: Omit<SharedMemory, 'id'> = {
        coupleId: coupleSpace.id,
        createdBy: userProfile.uid,
        creatorName: userProfile.displayName || 'Partner',
        title: memTitle.trim(),
        description: memDesc.trim(),
        date: memDate,
        photoURL: memPhotoURL || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add to couple subcollection
      await addDoc(collection(db, 'couples', coupleSpace.id, 'memories'), newMemory);

      // Notify partner
      if (partnerProfile) {
        await sendPartnerNotification(
          partnerProfile.uid,
          "New Shared Memory ❤️",
          `${userProfile.displayName || 'Your partner'} added "${memTitle.trim()}" to memories.`,
          'memory'
        );
      }

      setMemTitle('');
      setMemDesc('');
      setMemPhotoURL('');
      setMemConsentChecked(false);
      setActiveModal(null);
    } catch (err: any) {
      console.error("Save memory error:", err);
      setErrorBanner(err.message || "Failed to save memory. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMemory = async (memoryId?: string, createdBy?: string) => {
    if (!memoryId || !coupleSpace || !userProfile) return;
    if (createdBy !== userProfile.uid) {
      setErrorBanner("Only the creator of this memory can delete it.");
      return;
    }
    if (!window.confirm("Remove this memory from your shared space?")) return;

    try {
      await deleteDoc(doc(db, 'couples', coupleSpace.id, 'memories', memoryId));
    } catch (err: any) {
      console.error("Delete memory error:", err);
      setErrorBanner("Failed to delete memory.");
    }
  };

  // 2. CREATE GOAL
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleSpace || !userProfile || !goalTitle.trim()) return;

    setIsSubmitting(true);
    setErrorBanner(null);
    try {
      const newGoal: Omit<CoupleGoal, 'id'> = {
        coupleId: coupleSpace.id,
        createdBy: userProfile.uid,
        creatorName: userProfile.displayName || 'Partner',
        title: goalTitle.trim(),
        category: goalCategory,
        description: goalDesc.trim() || undefined,
        targetDate: goalTargetDate || undefined,
        progress: Number(goalProgress) || 0,
        isCompleted: Number(goalProgress) >= 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'couples', coupleSpace.id, 'goals'), newGoal);

      if (partnerProfile) {
        await sendPartnerNotification(
          partnerProfile.uid,
          "New Couple Goal 🎯",
          `${userProfile.displayName || 'Your partner'} created a goal: "${goalTitle.trim()}".`,
          'goal'
        );
      }

      setGoalTitle('');
      setGoalDesc('');
      setGoalTargetDate('');
      setGoalProgress(0);
      setActiveModal(null);
    } catch (err: any) {
      console.error("Save goal error:", err);
      setErrorBanner(err.message || "Failed to save goal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // UPDATE GOAL PROGRESS
  const handleUpdateGoalProgress = async (goal: CoupleGoal, newProgress: number) => {
    if (!goal.id || !coupleSpace) return;
    const clamped = Math.max(0, Math.min(100, newProgress));
    const completed = clamped >= 100;

    try {
      await updateDoc(doc(db, 'couples', coupleSpace.id, 'goals', goal.id), {
        progress: clamped,
        isCompleted: completed,
        updatedAt: new Date().toISOString()
      });

      if (partnerProfile && (completed || Math.abs(clamped - goal.progress) >= 20)) {
        await sendPartnerNotification(
          partnerProfile.uid,
          completed ? "Goal Completed! 🎉" : "Goal Progress Updated",
          `${userProfile?.displayName || 'Your partner'} updated "${goal.title}" to ${clamped}%.`,
          'goal_progress'
        );
      }
    } catch (err) {
      console.error("Update goal progress error:", err);
    }
  };

  // 3. IMPORTANT DATES
  const handleSaveDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleSpace || !userProfile || !dateTitle.trim() || !dateValue) return;

    setIsSubmitting(true);
    setErrorBanner(null);
    try {
      const newDate: Omit<ImportantDate, 'id'> = {
        coupleId: coupleSpace.id,
        createdBy: userProfile.uid,
        creatorName: userProfile.displayName || 'Partner',
        title: dateTitle.trim(),
        date: dateValue,
        category: dateCategory,
        reminder: dateReminder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'couples', coupleSpace.id, 'importantDates'), newDate);

      if (partnerProfile) {
        await sendPartnerNotification(
          partnerProfile.uid,
          "Important Date Added 📅",
          `${userProfile.displayName || 'Your partner'} added "${dateTitle.trim()}" on ${dateValue}.`,
          'date'
        );
      }

      setDateTitle('');
      setActiveModal(null);
    } catch (err: any) {
      console.error("Save date error:", err);
      setErrorBanner(err.message || "Failed to save important date.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. SHARED NOTES
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleSpace || !userProfile || !noteTitle.trim() || !noteContent.trim()) return;

    setIsSubmitting(true);
    setErrorBanner(null);
    try {
      if (editingNoteId) {
        await updateDoc(doc(db, 'couples', coupleSpace.id, 'sharedNotes', editingNoteId), {
          title: noteTitle.trim(),
          content: noteContent.trim(),
          updatedAt: new Date().toISOString()
        });
      } else {
        const newNote: Omit<SharedNote, 'id'> = {
          coupleId: coupleSpace.id,
          createdBy: userProfile.uid,
          creatorName: userProfile.displayName || 'Partner',
          title: noteTitle.trim(),
          content: noteContent.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'couples', coupleSpace.id, 'sharedNotes'), newNote);
      }

      setNoteTitle('');
      setNoteContent('');
      setEditingNoteId(null);
      setActiveModal(null);
    } catch (err: any) {
      console.error("Save note error:", err);
      setErrorBanner("Failed to save note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. BOUNDARY PROPOSAL & WORKFLOW
  const handleSaveBoundary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleSpace || !userProfile || !boundaryTitle.trim() || !boundaryDesc.trim()) return;

    setIsSubmitting(true);
    setErrorBanner(null);
    try {
      const newBoundary: Omit<BoundaryItem, 'id'> = {
        coupleId: coupleSpace.id,
        createdBy: userProfile.uid,
        creatorName: userProfile.displayName || 'Partner',
        title: boundaryTitle.trim(),
        description: boundaryDesc.trim(),
        category: boundaryCategory,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'couples', coupleSpace.id, 'boundaries'), newBoundary);

      if (partnerProfile) {
        await sendPartnerNotification(
          partnerProfile.uid,
          "New Boundary Proposed 🤝",
          `${userProfile.displayName || 'Your partner'} proposed a boundary: "${boundaryTitle.trim()}".`,
          'boundary_proposed'
        );
      }

      setBoundaryTitle('');
      setBoundaryDesc('');
      setActiveModal(null);
    } catch (err: any) {
      console.error("Save boundary error:", err);
      setErrorBanner("Failed to propose boundary.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Boundary partner actions: Agree, Discuss, Decline
  const handleBoundaryAction = async (boundary: BoundaryItem, action: 'agree' | 'discuss' | 'decline') => {
    if (!boundary.id || !coupleSpace || !userProfile) return;

    // Strict rule: You cannot agree on your own proposed boundary!
    if (action === 'agree' && boundary.createdBy === userProfile.uid) {
      setErrorBanner("Your partner must be the one to accept this boundary.");
      return;
    }

    try {
      const updateData: Partial<BoundaryItem> = {
        updatedAt: new Date().toISOString()
      };

      if (action === 'agree') {
        updateData.status = 'agreed';
        updateData.agreedBy = userProfile.uid;
        updateData.agreedByName = userProfile.displayName || 'Partner';
        updateData.agreedAt = new Date().toISOString();
      } else if (action === 'discuss') {
        updateData.status = 'discussing';
      } else {
        updateData.status = 'declined';
      }

      await updateDoc(doc(db, 'couples', coupleSpace.id, 'boundaries', boundary.id), updateData);

      if (partnerProfile) {
        const actionText = action === 'agree' ? 'agreed to' : action === 'discuss' ? 'requested to discuss' : 'declined';
        await sendPartnerNotification(
          boundary.createdBy === userProfile.uid ? partnerProfile.uid : boundary.createdBy,
          action === 'agree' ? "Boundary Agreed 🤝" : "Boundary Update",
          `${userProfile.displayName || 'Your partner'} ${actionText} the boundary "${boundary.title}".`,
          action === 'agree' ? 'boundary_agreed' : 'boundary_discussing'
        );
      }
    } catch (err: any) {
      console.error("Boundary action error:", err);
      setErrorBanner("Could not update boundary status.");
    }
  };

  // Helpers
  const formatDaysRemaining = (targetDate: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(targetDate);
    target.setHours(0,0,0,0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { text: 'Today! 🎉', isUpcoming: true, isToday: true };
    if (diffDays === 1) return { text: 'Tomorrow', isUpcoming: true, isToday: false };
    if (diffDays > 1 && diffDays <= 30) return { text: `In ${diffDays} days`, isUpcoming: true, isToday: false };
    if (diffDays > 30) return { text: `In ${Math.round(diffDays / 30)} months`, isUpcoming: true, isToday: false };
    return { text: `${Math.abs(diffDays)} days ago`, isUpcoming: false, isToday: false };
  };

  // NOT CONNECTED / NO COUPLE STATE
  if (!coupleSpace) {
    if (showPairingModal) {
      return <CouplePairing onSuccess={() => setShowPairingModal(false)} onCancel={() => setShowPairingModal(false)} />;
    }

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 max-w-sm mx-auto animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 shadow-xl shadow-rose-500/10">
          <Users className="w-8 h-8" />
        </div>
        
        <h2 className="text-xl font-bold text-white mb-2">
          Your Couple Space is waiting.
        </h2>
        
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Create a private space and invite your partner to start building memories, goals, and healthy communication.
        </p>

        <div className="w-full space-y-3">
          <button
            onClick={() => setShowPairingModal(true)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-sm shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer ring-1 ring-white/20 transition-all"
          >
            Create Couple Space
          </button>

          <button
            onClick={() => setShowPairingModal(true)}
            className="w-full py-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-medium text-xs border border-white/10 hover:border-white/20 cursor-pointer transition-all"
          >
            Join with Code
          </button>
        </div>
      </div>
    );
  }

  // WAITING FOR PARTNER STATE (When creator created space, but partner has not entered code yet)
  if (coupleSpace.status === 'waiting' || (coupleSpace.memberIds && coupleSpace.memberIds.length === 1)) {
    return (
      <div className="space-y-6 pb-24 max-w-md mx-auto animate-fadeIn">
        <div className="pt-2">
          <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
            Invitation Active
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {coupleSpace.name || 'Our Couple Space'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Waiting for your partner to join.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-amber-500/30 bg-amber-500/[0.04] text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <Heart className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Invite your partner</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Share this code with the person you want to connect with.
            </p>
          </div>

          <div className="py-3 px-5 rounded-2xl bg-zinc-950/80 border border-white/10 inline-block shadow-inner">
            <span className="font-mono text-3xl font-bold tracking-widest text-amber-300">
              {coupleSpace.inviteCode}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-amber-300 font-medium pt-2 border-t border-amber-500/15">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span>Waiting for your partner…</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 text-center">
          <p className="text-xs text-zinc-400">
            Once your partner connects, your shared memories, joint goals, and boundaries will unlock here in real-time.
          </p>
        </div>
      </div>
    );
  }

  // SKELETON LOADING STATE
  if (loading) {
    return (
      <div className="space-y-6 pb-24 max-w-md mx-auto animate-pulse">
        <div className="pt-2 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-44 bg-white/10 rounded-xl" />
            <div className="h-3 w-32 bg-white/5 rounded-full" />
          </div>
          <div className="h-9 w-24 bg-white/10 rounded-xl" />
        </div>
        <div className="h-28 bg-white/5 rounded-3xl" />
        <div className="h-12 bg-white/5 rounded-2xl" />
        <div className="space-y-3">
          <div className="h-32 bg-white/5 rounded-3xl" />
          <div className="h-32 bg-white/5 rounded-3xl" />
        </div>
      </div>
    );
  }

  // =========================================================================
  // REAL COUPLE SPACE DASHBOARD (When connected)
  // =========================================================================
  return (
    <div className="space-y-6 pb-28 max-w-md mx-auto">
      {/* 1. Header */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {coupleSpace.name || 'Couple Space'}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Your space, together.
          </p>
        </div>

        {/* Global Action: Add to current tab */}
        <button
          onClick={() => {
            setErrorBanner(null);
            if (activeTab === 'memories') setActiveModal('memory');
            else if (activeTab === 'goals') setActiveModal('goal');
            else if (activeTab === 'dates') setActiveModal('date');
            else if (activeTab === 'notes') {
              setEditingNoteId(null);
              setNoteTitle('');
              setNoteContent('');
              setActiveModal('note');
            } else if (activeTab === 'boundaries') setActiveModal('boundary');
          }}
          className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:opacity-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeTab === 'memories' ? 'Add Memory' : 
             activeTab === 'goals' ? 'New Goal' : 
             activeTab === 'dates' ? 'Add Date' : 
             activeTab === 'notes' ? 'New Note' : 'Propose'}
          </span>
        </button>
      </div>

      {/* Error banner */}
      {errorBanner && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="p-1 text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Couple Connection & Privacy Banner */}
      <div className="glass-card rounded-3xl p-5 border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Shared with your connected partner</span>
          </span>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1">
            <span>Connected</span>
            <span className="text-rose-500 text-[10px]">❤️</span>
          </span>
        </div>

        {/* Real Profile Photos or Initials */}
        <div className="flex items-center justify-center gap-4 py-2">
          {/* User Node */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-2 border-rose-500/50 overflow-hidden bg-zinc-900 flex items-center justify-center text-white font-bold text-base shadow-md">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
            <span className="text-[10px] text-zinc-300 font-semibold mt-1.5 truncate max-w-[70px]">
              {userProfile?.displayName || 'You'}
            </span>
          </div>

          {/* Connected Bridge */}
          <div className="flex-1 max-w-[100px] relative flex items-center justify-center">
            <div className="w-full h-[1.5px] bg-gradient-to-r from-rose-500/50 via-purple-500/50 to-indigo-500/50" />
            <div className="absolute w-5 h-5 rounded-full bg-zinc-950 border border-rose-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.3)]">
              <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
            </div>
          </div>

          {/* Partner Node */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-500/50 overflow-hidden bg-zinc-900 flex items-center justify-center text-white font-bold text-base shadow-md">
              {partnerProfile?.photoURL ? (
                <img src={partnerProfile.photoURL} alt={partnerProfile.displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{partnerProfile?.displayName?.charAt(0).toUpperCase() || 'P'}</span>
              )}
            </div>
            <span className="text-[10px] text-zinc-300 font-semibold mt-1.5 truncate max-w-[70px]">
              {partnerProfile?.displayName || 'Partner'}
            </span>
          </div>
        </div>
      </div>

      {/* Feature Navigation Tabs (5 Features) */}
      <div className="grid grid-cols-5 gap-1.5 p-1 rounded-2xl bg-zinc-950/80 border border-white/5">
        {[
          { id: 'memories', label: 'Memories', icon: Heart },
          { id: 'goals', label: 'Goals', icon: Target },
          { id: 'dates', label: 'Dates', icon: Calendar },
          { id: 'notes', label: 'Notes', icon: StickyNote },
          { id: 'boundaries', label: 'Boundaries', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 rounded-xl text-[11px] font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                isActive 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* 2. SECTION: MEMORIES */}
      {/* ===================================================================== */}
      {activeTab === 'memories' && (
        <div className="space-y-4 animate-fadeIn">
          <div>
            <h3 className="text-base font-bold text-white">Memories</h3>
            <p className="text-xs text-zinc-400">
              Keep the moments you choose to share.
            </p>
          </div>

          {memories.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-3">
                <Heart className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                Your first memory is waiting.
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-5 leading-relaxed">
                Save a quiet milestone, an unforgettable trip, or a special date together.
              </p>
              <button
                onClick={() => {
                  setErrorBanner(null);
                  setActiveModal('memory');
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
              >
                Add Memory
              </button>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-rose-500/50 before:via-purple-500/30 before:to-transparent">
              {memories.map((m) => {
                const isCreator = m.createdBy === userProfile?.uid;
                return (
                  <div key={m.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-[30px] top-1.5 w-5 h-5 rounded-full bg-zinc-950 border-2 border-rose-500 flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.4)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    </div>

                    <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-3 hover:border-white/20 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-rose-300 font-medium block">
                            {new Date(m.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-0.5">{m.title}</h4>
                        </div>
                        {isCreator && (
                          <button
                            onClick={() => handleDeleteMemory(m.id, m.createdBy)}
                            className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors opacity-70 group-hover:opacity-100"
                            title="Delete memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {m.photoURL && (
                        <div className="rounded-xl overflow-hidden max-h-56 bg-zinc-950 border border-white/10">
                          <img src={m.photoURL} alt={m.title} className="w-full h-full object-cover" />
                        </div>
                      )}

                      {m.description && (
                        <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                          {m.description}
                        </p>
                      )}

                      <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-400 border-t border-white/5">
                        <span>Created by {m.creatorName || (isCreator ? 'You' : 'Partner')}</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Shared
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. SECTION: OUR GOALS */}
      {/* ===================================================================== */}
      {activeTab === 'goals' && (
        <div className="space-y-4 animate-fadeIn">
          <div>
            <h3 className="text-base font-bold text-white">Our Goals</h3>
            <p className="text-xs text-zinc-400">
              Something meaningful to work toward together.
            </p>
          </div>

          {goals.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-3">
                <Target className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                What would you like to build together?
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-5 leading-relaxed">
                Set travel targets, savings goals, communication habits, or health milestones.
              </p>
              <button
                onClick={() => {
                  setErrorBanner(null);
                  setActiveModal('goal');
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-rose-600 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
              >
                Create Goal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((g) => {
                const isCompleted = g.isCompleted || (g.progress >= 100);
                return (
                  <div key={g.id} className="glass-card rounded-2xl p-4 border border-white/10 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-medium">
                            {g.category}
                          </span>
                          {g.targetDate && (
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {g.targetDate}
                            </span>
                          )}
                        </div>
                        <h4 className={`text-sm font-bold mt-1 ${isCompleted ? 'line-through text-zinc-400' : 'text-white'}`}>
                          {g.title}
                        </h4>
                      </div>

                      <span className={`text-xs font-mono font-bold px-2 py-1 rounded-lg ${
                        isCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {g.progress}%
                      </span>
                    </div>

                    {g.description && (
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {g.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-white/5">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-rose-500 to-indigo-500'
                        }`}
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>

                    {/* Interactive Progress Controls (Both partners can update!) */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateGoalProgress(g, Math.max(0, g.progress - 10))}
                          className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-white/5 cursor-pointer"
                        >
                          -10%
                        </button>
                        <button
                          onClick={() => handleUpdateGoalProgress(g, Math.min(100, g.progress + 10))}
                          className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-white/5 cursor-pointer"
                        >
                          +10%
                        </button>
                      </div>

                      <button
                        onClick={() => handleUpdateGoalProgress(g, isCompleted ? 0 : 100)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                          isCompleted 
                            ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' 
                            : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                        }`}
                      >
                        {isCompleted ? 'Mark Incomplete' : 'Mark 100% Done'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. SECTION: IMPORTANT DATES */}
      {/* ===================================================================== */}
      {activeTab === 'dates' && (
        <div className="space-y-4 animate-fadeIn">
          <div>
            <h3 className="text-base font-bold text-white">Important Dates</h3>
            <p className="text-xs text-zinc-400">
              Add the dates that matter.
            </p>
          </div>

          {importantDates.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mx-auto flex items-center justify-center mb-3">
                <CalendarHeart className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                No important dates yet.
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-5 leading-relaxed">
                Never miss an anniversary, birthday, or relationship milestone again.
              </p>
              <button
                onClick={() => {
                  setErrorBanner(null);
                  setActiveModal('date');
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-rose-600 text-white font-semibold text-xs shadow-md shadow-purple-600/20 active:scale-95 transition-all cursor-pointer"
              >
                Add Date
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {importantDates.map((d) => {
                const countdown = formatDaysRemaining(d.date);
                return (
                  <div key={d.id} className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold ${
                        countdown.isToday ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' : 'bg-white/5 text-zinc-300'
                      }`}>
                        {d.category === 'Anniversary' ? '💍' : d.category === 'Birthday' ? '🎂' : d.category === 'First Meeting' ? '✨' : '📅'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{d.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                          <span>{d.date}</span>
                          <span>•</span>
                          <span className="text-zinc-500">{d.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block ${
                        countdown.isToday 
                          ? 'bg-rose-500 text-white font-bold' 
                          : countdown.isUpcoming 
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' 
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {countdown.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. SECTION: SHARED NOTES */}
      {/* ===================================================================== */}
      {activeTab === 'notes' && (
        <div className="space-y-4 animate-fadeIn">
          <div>
            <h3 className="text-base font-bold text-white">Shared Notes</h3>
            <p className="text-xs text-zinc-400">
              A simple private space for notes both partners intentionally share.
            </p>
          </div>

          {sharedNotes.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-3">
                <StickyNote className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                Create something you'll both remember.
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-5 leading-relaxed">
                Shared trip ideas, grocery wishlists, gift thoughts, or sweet appreciation notes.
              </p>
              <button
                onClick={() => {
                  setErrorBanner(null);
                  setEditingNoteId(null);
                  setNoteTitle('');
                  setNoteContent('');
                  setActiveModal('note');
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-semibold text-xs shadow-md shadow-amber-600/20 active:scale-95 transition-all cursor-pointer"
              >
                Write Shared Note
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sharedNotes.map((n) => {
                const formattedTime = new Date(n.updatedAt || n.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <div key={n.id} className="glass-card rounded-2xl p-4 border border-white/10 space-y-2 hover:border-white/20 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-white">{n.title}</h4>
                      <button
                        onClick={() => {
                          setEditingNoteId(n.id || null);
                          setNoteTitle(n.title);
                          setNoteContent(n.content);
                          setActiveModal('note');
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-white"
                        title="Edit note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {n.content}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[10px] text-zinc-500 border-t border-white/5">
                      <span>Last updated: {formattedTime}</span>
                      <span>By {n.creatorName || 'Partner'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. SECTION: BOUNDARIES */}
      {/* ===================================================================== */}
      {activeTab === 'boundaries' && (
        <div className="space-y-4 animate-fadeIn">
          <div>
            <h3 className="text-base font-bold text-white">Our Boundaries</h3>
            <p className="text-xs text-zinc-400">
              Talk about what matters to both of you.
            </p>
          </div>

          {boundaries.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 mx-auto flex items-center justify-center mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                Healthy relationships make space for honest conversations.
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-5 leading-relaxed">
                Propose expectations around communication, social media, personal space, or money. Both partners negotiate and explicitly agree.
              </p>
              <button
                onClick={() => {
                  setErrorBanner(null);
                  setActiveModal('boundary');
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
              >
                Propose Boundary
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {boundaries.map((b) => {
                const isProposer = b.createdBy === userProfile?.uid;
                const isAgreed = b.status === 'agreed';
                const isDiscussing = b.status === 'discussing';
                const isPending = b.status === 'pending';

                return (
                  <div key={b.id} className="glass-card rounded-2xl p-4 border border-white/10 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-medium">
                          {b.category}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5">{b.title}</h4>
                      </div>

                      {/* Status Badge */}
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${
                        isAgreed 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : isDiscussing 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {b.description}
                    </p>

                    {/* Metadata & Actions */}
                    <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                      <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                        <span>
                          Proposed by <strong>{b.creatorName || (isProposer ? 'You' : 'Partner')}</strong>
                        </span>
                        {isAgreed && (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Agreed by {b.agreedByName || 'Partner'}
                          </span>
                        )}
                      </div>

                      {/* PARTNER ACTION BUTTONS (Only partner can agree/discuss/decline) */}
                      {!isProposer && !isAgreed && (
                        <div className="pt-1 flex items-center gap-2">
                          <button
                            onClick={() => handleBoundaryAction(b, 'agree')}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                          >
                            Agree
                          </button>
                          <button
                            onClick={() => handleBoundaryAction(b, 'discuss')}
                            className="flex-1 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                          >
                            Discuss
                          </button>
                          <button
                            onClick={() => handleBoundaryAction(b, 'decline')}
                            className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium border border-white/5 transition-all cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {isProposer && !isAgreed && (
                        <div className="p-2 rounded-xl bg-white/5 text-[11px] text-zinc-400 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Waiting for your partner to review and agree.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD MEMORY */}
      {/* ===================================================================== */}
      {activeModal === 'memory' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Add Memory</h3>
                <p className="text-[11px] text-zinc-400">Keep the moments you choose to share.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMemory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Memory Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midnight coffee in Kyoto"
                  value={memTitle}
                  onChange={(e) => setMemTitle(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">What happened?</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Tell the story or what made this moment special..."
                  value={memDesc}
                  onChange={(e) => setMemDesc(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={memDate}
                  onChange={(e) => setMemDate(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Optional Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full text-[11px] text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                />
                {memPhotoURL && (
                  <div className="mt-2 relative rounded-xl overflow-hidden max-h-36 border border-white/10">
                    <img src={memPhotoURL} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setMemPhotoURL('')}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Explicit Consent Requirement */}
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={memConsentChecked}
                    onChange={(e) => setMemConsentChecked(e.target.checked)}
                    className="mt-0.5 rounded text-rose-500 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className="text-xs text-rose-200 font-medium leading-relaxed">
                    This memory will be visible to your connected partner.
                  </span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-medium border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !memTitle.trim() || !memConsentChecked}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-xs font-semibold shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Memory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: CREATE GOAL */}
      {/* ===================================================================== */}
      {activeModal === 'goal' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Create Couple Goal</h3>
                <p className="text-[11px] text-zinc-400">Something meaningful to work toward together.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Save $3,000 for Greece Trip"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Category</label>
                <select
                  value={goalCategory}
                  onChange={(e) => setGoalCategory(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Travel">Travel</option>
                  <option value="Savings">Savings</option>
                  <option value="Health">Health</option>
                  <option value="Learning">Learning</option>
                  <option value="Quality Time">Quality Time</option>
                  <option value="Personal Growth">Personal Growth</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Why this matters to both of us..."
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Target Date</label>
                <input
                  type="date"
                  value={goalTargetDate}
                  onChange={(e) => setGoalTargetDate(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-300">Initial Progress</label>
                  <span className="text-xs font-mono font-bold text-indigo-300">{goalProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={goalProgress}
                  onChange={(e) => setGoalProgress(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-medium border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !goalTitle.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-rose-600 text-white text-xs font-semibold shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Create Goal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: ADD IMPORTANT DATE */}
      {/* ===================================================================== */}
      {activeModal === 'date' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Add Important Date</h3>
                <p className="text-[11px] text-zinc-400">Never miss the moments that matter.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. First Date Anniversary"
                  value={dateTitle}
                  onChange={(e) => setDateTitle(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Category</label>
                <select
                  value={dateCategory}
                  onChange={(e) => setDateCategory(e.target.value as any)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Anniversary">Anniversary</option>
                  <option value="Birthday">Birthday</option>
                  <option value="First Meeting">First Meeting</option>
                  <option value="Custom Date">Custom Date</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Optional Reminder</label>
                <select
                  value={dateReminder}
                  onChange={(e) => setDateReminder(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="On the day">On the day</option>
                  <option value="1 day before">1 day before</option>
                  <option value="3 days before">3 days before</option>
                  <option value="1 week before">1 week before</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-medium border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !dateTitle.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-rose-600 text-white text-xs font-semibold shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Add Date</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: SHARED NOTE */}
      {/* ===================================================================== */}
      {activeModal === 'note' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingNoteId ? 'Edit Shared Note' : 'Write Shared Note'}
                </h3>
                <p className="text-[11px] text-zinc-400">Shared privately with both partners.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend grocery wishlist, Summer trip ideas"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write items, ideas, or sweet reminders..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-medium border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !noteTitle.trim() || !noteContent.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white text-xs font-semibold shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{editingNoteId ? 'Update Note' : 'Save Note'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 5: PROPOSE BOUNDARY */}
      {/* ===================================================================== */}
      {activeModal === 'boundary' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Propose Boundary</h3>
                <p className="text-[11px] text-zinc-400">Talk about what matters to both of you.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBoundary} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Boundary Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Let's discuss major purchases before buying"
                  value={boundaryTitle}
                  onChange={(e) => setBoundaryTitle(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Category</label>
                <select
                  value={boundaryCategory}
                  onChange={(e) => setBoundaryCategory(e.target.value as any)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="Communication">Communication</option>
                  <option value="Privacy">Privacy</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Friendships">Friendships</option>
                  <option value="Personal Space">Personal Space</option>
                  <option value="Time Together">Time Together</option>
                  <option value="Money">Money</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Description & Context</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this feels healthy and important for your peace of mind..."
                  value={boundaryDesc}
                  onChange={(e) => setBoundaryDesc(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-200 text-xs leading-relaxed">
                <p>
                  <strong>Note:</strong> Proposing a boundary does not automatically make it agreed. Your partner will review, discuss, and explicitly agree.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-medium border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !boundaryTitle.trim() || !boundaryDesc.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white text-xs font-semibold shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Propose Boundary</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
