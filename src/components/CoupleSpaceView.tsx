import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, uploadMemoryImage, deleteMemoryImage } from '../lib/firebase';
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
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Edit3, 
  Camera, 
  CalendarHeart, 
  ShieldCheck, 
  Loader2, 
  Image as ImageIcon, 
  Repeat, 
  Eye, 
  AlertTriangle,
  ArrowRight,
  Trophy,
  MessageSquare,
  HelpCircle,
  RefreshCw,
  Share2,
  Link2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react';
import { getConnectionLabel } from '../lib/connection';
import { ConnectionSwitcher } from './ConnectionSwitcher';
import { ConnectionSelectorBar } from './ConnectionSelectorBar';
import { ConnectionHero } from './ConnectionHero';
import { QuickActionsGrid } from './QuickActionsGrid';
import { RecentActivitySection } from './RecentActivitySection';
import { ConversationStarterCard } from './ConversationStarterCard';
import { SharedSpaceGrid } from './SharedSpaceGrid';
import { PrivacyStatusBar } from './PrivacyStatusBar';
import { InitialsAvatar } from './InitialsAvatar';
import { CouplePairing } from './CouplePairing';
import { SharedGoals } from './SharedGoals';
import { ConversationHub } from './ConversationHub';
import { ImportantDatesView } from './ImportantDatesView';
import { SharedNotesView } from './SharedNotesView';
import { BoundariesView } from './BoundariesView';
import { ConnectionPulseSection } from './ConnectionPulseSection';
import { ConnectionCheckInModal } from './ConnectionCheckInModal';
import { validateImageFile, optimizeImageFile } from '../lib/imageOptimizer';

export interface DateCountdownResult {
  daysRemaining: number;
  label: string;
  isUpcoming: boolean;
  isToday: boolean;
  nextOccurrenceDate: Date;
  formattedDate: string;
}

export function calculateDateCountdown(dateStr: string, repeatYearly?: boolean): DateCountdownResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = (dateStr || '').split('-');
  const origYear = parts.length === 3 ? parseInt(parts[0], 10) : today.getFullYear();
  const month = parts.length >= 2 ? parseInt(parts[1], 10) - 1 : 0;
  const day = parts.length >= 3 ? parseInt(parts[2], 10) : (parts.length === 1 ? parseInt(parts[0], 10) : 1);

  let targetDate = new Date(origYear, month, day);
  targetDate.setHours(0, 0, 0, 0);

  if (repeatYearly) {
    let recurringDate = new Date(today.getFullYear(), month, day);
    recurringDate.setHours(0, 0, 0, 0);

    if (recurringDate.getTime() < today.getTime()) {
      recurringDate = new Date(today.getFullYear() + 1, month, day);
      recurringDate.setHours(0, 0, 0, 0);
    }
    targetDate = recurringDate;
  }

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[month] || '';
  const formattedDate = `${day} ${monthName}${!repeatYearly && origYear !== today.getFullYear() ? ` ${origYear}` : ''}`;

  if (diffDays === 0) {
    return { daysRemaining: 0, label: 'Today', isUpcoming: true, isToday: true, nextOccurrenceDate: targetDate, formattedDate };
  } else if (diffDays === 1) {
    return { daysRemaining: 1, label: 'Tomorrow', isUpcoming: true, isToday: false, nextOccurrenceDate: targetDate, formattedDate };
  } else if (diffDays > 1 && diffDays <= 60) {
    return { daysRemaining: diffDays, label: `${diffDays} days to go`, isUpcoming: true, isToday: false, nextOccurrenceDate: targetDate, formattedDate };
  } else if (diffDays > 60) {
    const months = Math.round(diffDays / 30);
    return { daysRemaining: diffDays, label: `In ${diffDays} days`, isUpcoming: false, isToday: false, nextOccurrenceDate: targetDate, formattedDate };
  } else {
    return { daysRemaining: diffDays, label: `${Math.abs(diffDays)} days ago`, isUpcoming: false, isToday: false, nextOccurrenceDate: targetDate, formattedDate };
  }
}

export const CoupleSpaceView: React.FC = () => {
  const { userProfile, partnerProfile, coupleSpace, disconnectCouple } = useAuth();

  const [activeTab, setActiveTab] = useState<'memories' | 'goals' | 'dates' | 'notes' | 'boundaries' | 'conversation'>('memories');
  const [subView, setSubView] = useState<'overview' | 'memories' | 'goals' | 'dates' | 'notes' | 'boundaries' | 'conversation'>('overview');
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
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
  const [activeModal, setActiveModal] = useState<'memory' | 'date' | 'note' | 'boundary' | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInModalTab, setCheckInModalTab] = useState<'new' | 'history' | 'shared'>('new');
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goalsModalMode, setGoalsModalMode] = useState<'list' | 'create'>('list');
  const [goalsModalTab, setGoalsModalTab] = useState<'active' | 'milestones'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form & View states for Memory
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [memTitle, setMemTitle] = useState('');
  const [memDesc, setMemDesc] = useState('');
  const [memDate, setMemDate] = useState('');
  const [memImageUrl, setMemImageUrl] = useState('');
  const [memImageFile, setMemImageFile] = useState<File | null>(null);
  const [memPreviewUrl, setMemPreviewUrl] = useState<string | null>(null);
  const [selectedMemoryDetail, setSelectedMemoryDetail] = useState<SharedMemory | null>(null);
  const [memoryToDelete, setMemoryToDelete] = useState<SharedMemory | null>(null);

  // Form & View states for Important Date
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [dateTitle, setDateTitle] = useState('');
  const [dateValue, setDateValue] = useState(() => new Date().toISOString().split('T')[0]);
  const [dateDesc, setDateDesc] = useState('');
  const [dateRepeatYearly, setDateRepeatYearly] = useState<boolean>(true);
  const [dateCategory, setDateCategory] = useState<'Anniversary' | 'Birthday' | 'First Meeting' | 'Custom Date' | 'Milestone' | 'Special Day' | 'Trip' | 'Other'>('Anniversary');
  const [dateToDelete, setDateToDelete] = useState<ImportantDate | null>(null);

  // Form & View states for Note
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedNoteDetail, setSelectedNoteDetail] = useState<SharedNote | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<SharedNote | null>(null);

  // Form & View states for Boundary
  const [editingBoundaryId, setEditingBoundaryId] = useState<string | null>(null);
  const [boundaryCategory, setBoundaryCategory] = useState<string>('Communication');
  const [boundaryTitle, setBoundaryTitle] = useState('');
  const [boundaryDetails, setBoundaryDetails] = useState('');
  const [boundaryHandling, setBoundaryHandling] = useState('');
  const [selectedBoundaryDetail, setSelectedBoundaryDetail] = useState<BoundaryItem | null>(null);
  const [boundaryToDelete, setBoundaryToDelete] = useState<BoundaryItem | null>(null);

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
      items.sort((a, b) => {
        const timeA = new Date(a.date || a.createdAt).getTime();
        const timeB = new Date(b.date || b.createdAt).getTime();
        return timeB - timeA;
      });
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
      items.sort((a, b) => {
        const aCompleted = a.status === 'completed' || a.isCompleted;
        const bCompleted = b.status === 'completed' || b.isCompleted;
        return aCompleted === bCompleted ? 0 : aCompleted ? 1 : -1;
      });
      setGoals(items);
    }, (err) => console.warn("Goals listener warning:", err));

    // 3. Important Dates listener
    const datesRef = collection(db, 'couples', coupleId, 'importantDates');
    const unsubDates = onSnapshot(datesRef, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ImportantDate));
      items.sort((a, b) => {
        const nextA = calculateDateCountdown(a.date, a.repeatYearly).nextOccurrenceDate.getTime();
        const nextB = calculateDateCountdown(b.date, b.repeatYearly).nextOccurrenceDate.getTime();
        return nextA - nextB;
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
      items.sort((a, b) => {
        const score = (s: string) => (s === 'pending' || s === 'review' ? 0 : s === 'discussing' ? 1 : 2);
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

  // PHOTO FILE SELECTION (Local preview, NO base64 in Firestore, safe compression)
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setErrorBanner(validation.error || "Please choose a valid JPEG, PNG, or WebP image under 5MB.");
      return;
    }

    try {
      setErrorBanner(null);
      // Client-side optimize before upload
      const optimized = await optimizeImageFile(file);
      setMemImageFile(optimized);
      const localUrl = URL.createObjectURL(optimized);
      setMemPreviewUrl(localUrl);
    } catch (err) {
      console.warn("Client-side optimization notice:", err);
      // Fallback to original file if compression somehow fails
      setMemImageFile(file);
      const localUrl = URL.createObjectURL(file);
      setMemPreviewUrl(localUrl);
    }
  };

  // 1. MEMORIES HANDLERS
  const handleOpenAddMemory = () => {
    setEditingMemoryId(null);
    setMemTitle('');
    setMemDesc('');
    setMemDate('');
    setMemImageUrl('');
    setMemImageFile(null);
    setMemPreviewUrl(null);
    setErrorBanner(null);
    setActiveModal('memory');
  };

  const handleOpenEditMemory = (mem: SharedMemory) => {
    setEditingMemoryId(mem.id || null);
    setMemTitle(mem.title);
    setMemDesc(mem.description);
    setMemDate(mem.date || '');
    setMemImageUrl(mem.imageUrl || mem.photoURL || '');
    setMemImageFile(null);
    setMemPreviewUrl(mem.imageUrl || mem.photoURL || null);
    setErrorBanner(null);
    setSelectedMemoryDetail(null);
    setActiveModal('memory');
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleSpace || !userProfile || !memTitle.trim() || !memDesc.trim()) return;

    setIsSubmitting(true);
    setErrorBanner(null);

    const memoryId = editingMemoryId || `mem_${Date.now()}`;
    let finalImageUrl = memImageUrl.trim() || undefined;

    if (memImageFile) {
      try {
        finalImageUrl = await uploadMemoryImage(coupleSpace.id, memoryId, memImageFile);
      } catch (storageErr: any) {
        console.warn("Storage upload notice:", storageErr);
        setErrorBanner("Could not upload photo to Firebase Storage. You can save without photo or enter a direct image URL.");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const memoryDocRef = doc(db, 'couples', coupleSpace.id, 'memories', memoryId);

      if (editingMemoryId) {
        await updateDoc(memoryDocRef, {
          title: memTitle.trim(),
          description: memDesc.trim(),
          date: memDate.trim() || undefined,
          imageUrl: finalImageUrl || undefined,
          photoURL: finalImageUrl || undefined,
          updatedAt: new Date().toISOString()
        });
      } else {
        const newMemory: SharedMemory = {
          id: memoryId,
          coupleId: coupleSpace.id,
          createdBy: userProfile.uid,
          creatorName: userProfile.displayName || 'Partner',
          title: memTitle.trim(),
          description: memDesc.trim(),
          date: memDate.trim() || undefined,
          imageUrl: finalImageUrl || undefined,
          photoURL: finalImageUrl || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(memoryDocRef, newMemory);

        if (partnerProfile) {
          await sendPartnerNotification(
            partnerProfile.uid,
            "New Shared Memory ❤️",
            `${userProfile.displayName || 'Your partner'} added "${memTitle.trim()}" to memories.`,
            'memory'
          );
        }
      }

      setMemTitle('');
      setMemDesc('');
      setMemDate('');
      setMemImageUrl('');
      setMemImageFile(null);
      setMemPreviewUrl(null);
      setEditingMemoryId(null);
      setActiveModal(null);
    } catch (err: any) {
      console.error("Save memory error:", err);
      setErrorBanner(err.message || "Failed to save memory. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteMemory = async () => {
    if (!memoryToDelete?.id || !coupleSpace || !userProfile) return;

    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'couples', coupleSpace.id, 'memories', memoryToDelete.id));
      if (memoryToDelete.imageUrl || memoryToDelete.photoURL) {
        await deleteMemoryImage(memoryToDelete.imageUrl || memoryToDelete.photoURL);
      }
      setMemoryToDelete(null);
      if (selectedMemoryDetail?.id === memoryToDelete.id) {
        setSelectedMemoryDetail(null);
      }
    } catch (err: any) {
      console.error("Delete memory error:", err);
      setErrorBanner("Failed to delete memory.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. IMPORTANT DATES HANDLERS
  const handleOpenAddDate = () => {
    setEditingDateId(null);
    setDateTitle('');
    setDateValue(new Date().toISOString().split('T')[0]);
    setDateDesc('');
    setDateRepeatYearly(true);
    setDateCategory('Anniversary');
    setErrorBanner(null);
    setActiveModal('date');
  };

  const handleOpenEditDate = (d: ImportantDate) => {
    setEditingDateId(d.id || null);
    setDateTitle(d.title);
    setDateValue(d.date);
    setDateDesc(d.description || '');
    setDateRepeatYearly(d.repeatYearly ?? true);
    setDateCategory((d.category as any) || 'Anniversary');
    setErrorBanner(null);
    setActiveModal('date');
  };

  const handleSaveImportantDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleSpace || !userProfile || !dateTitle.trim() || !dateValue) return;

    setIsSubmitting(true);
    setErrorBanner(null);

    const dateId = editingDateId || `date_${Date.now()}`;
    const dateDocRef = doc(db, 'couples', coupleSpace.id, 'importantDates', dateId);

    try {
      if (editingDateId) {
        await updateDoc(dateDocRef, {
          title: dateTitle.trim(),
          date: dateValue,
          description: dateDesc.trim() || undefined,
          repeatYearly: Boolean(dateRepeatYearly),
          category: dateCategory,
          updatedAt: new Date().toISOString()
        });
      } else {
        const newDate: ImportantDate = {
          id: dateId,
          coupleId: coupleSpace.id,
          createdBy: userProfile.uid,
          creatorName: userProfile.displayName || 'Partner',
          title: dateTitle.trim(),
          date: dateValue,
          description: dateDesc.trim() || undefined,
          repeatYearly: Boolean(dateRepeatYearly),
          category: dateCategory,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(dateDocRef, newDate);

        if (partnerProfile) {
          await sendPartnerNotification(
            partnerProfile.uid,
            "Important Date Added 📅",
            `${userProfile.displayName || 'Your partner'} added "${dateTitle.trim()}".`,
            'date'
          );
        }
      }

      setDateTitle('');
      setDateDesc('');
      setEditingDateId(null);
      setActiveModal(null);
    } catch (err: any) {
      console.error("Save date error:", err);
      setErrorBanner(err.message || "Failed to save important date.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteDate = async () => {
    if (!dateToDelete?.id || !coupleSpace) return;

    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'couples', coupleSpace.id, 'importantDates', dateToDelete.id));
      setDateToDelete(null);
    } catch (err: any) {
      console.error("Delete date error:", err);
      setErrorBanner("Failed to delete date.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. SHARED NOTES HANDLERS
  const handleOpenAddNote = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setErrorBanner(null);
    setActiveModal('note');
  };

  const handleOpenEditNote = (note: SharedNote) => {
    setEditingNoteId(note.id || null);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setErrorBanner(null);
    setSelectedNoteDetail(null);
    setActiveModal('note');
  };

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

        if (partnerProfile) {
          await sendPartnerNotification(
            partnerProfile.uid,
            "New Shared Note 📝",
            `${userProfile.displayName || 'Your partner'} added note "${noteTitle.trim()}".`,
            'note'
          );
        }
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

  const handleConfirmDeleteNote = async () => {
    if (!noteToDelete?.id || !coupleSpace) return;

    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'couples', coupleSpace.id, 'sharedNotes', noteToDelete.id));
      setNoteToDelete(null);
      if (selectedNoteDetail?.id === noteToDelete.id) {
        setSelectedNoteDetail(null);
      }
    } catch (err: any) {
      console.error("Delete note error:", err);
      setErrorBanner("Failed to delete note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for Category icons
  const getDateCategoryIcon = (category?: string) => {
    return '';
  };

  const getBoundaryCategoryIcon = (category?: string) => {
    return '';
  };

  // NOT CONNECTED / NO CONNECTION STATE
  if (!coupleSpace) {
    if (showPairingModal) {
      return <CouplePairing onSuccess={() => setShowPairingModal(false)} onCancel={() => setShowPairingModal(false)} />;
    }

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 max-w-sm mx-auto animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-4 shadow-xl shadow-violet-500/10">
          <Users className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
          Build your first connection.
        </h2>
        
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          TRUSTLY gives you a private space for the relationships that matter.
        </p>

        <div className="w-full space-y-3">
          <button
            onClick={() => setShowPairingModal(true)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-600 to-indigo-600 text-white font-bold text-sm shadow-[0_0_25px_rgba(168,85,247,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer transition-all"
          >
            Add Connection
          </button>
        </div>
      </div>
    );
  }

  // WAITING FOR CONNECTION STATE
  if (coupleSpace.status === 'waiting' || (coupleSpace.memberIds && coupleSpace.memberIds.length === 1)) {
    return (
      <div className="space-y-6 pb-24 max-w-md mx-auto animate-fadeIn">
        <div className="pt-2">
          <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
            Invitation Active
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {coupleSpace.name || 'Our Connection Space'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Waiting for your connection to join.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-amber-500/30 bg-amber-500/[0.04] text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Invite someone</h3>
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
            <span>Waiting for connection…</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 text-center">
          <p className="text-xs text-zinc-400">
            Once connected, your shared memories, joint goals, and boundaries will unlock here in real-time.
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
  // REAL CONNECTION SPACE DASHBOARD (When connected)
  // =========================================================================
  const connectionLabel = getConnectionLabel(coupleSpace.connectionType);
  const partnerName = partnerProfile?.displayName || coupleSpace.creatorName || 'Connection Partner';

  const handleOpenSubView = (tab: 'memories' | 'goals' | 'dates' | 'notes' | 'boundaries' | 'conversation') => {
    setActiveTab(tab);
    setSubView(tab);
  };

  const handleConfirmRemoveConnection = async () => {
    setIsSubmitting(true);
    try {
      await disconnectCouple();
      setShowRemoveConfirm(false);
      window.location.reload();
    } catch (e) {
      setErrorBanner("Failed to remove connection securely.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAction = (actionKey: 'checkin' | 'conversation' | 'goals' | 'memories' | 'dates' | 'notes' | 'coach' | 'privacy') => {
    switch (actionKey) {
      case 'checkin':
        setCheckInModalTab('new');
        setShowCheckInModal(true);
        break;
      case 'conversation':
        handleOpenSubView('conversation');
        break;
      case 'goals':
        handleOpenSubView('goals');
        break;
      case 'memories':
        handleOpenSubView('memories');
        break;
      case 'dates':
        handleOpenSubView('dates');
        break;
      case 'notes':
        handleOpenSubView('notes');
        break;
      case 'coach':
        setErrorBanner("Navigate to the Coach tab in bottom navigation for full AI communication guidance!");
        break;
      case 'privacy':
        setErrorBanner("Open the Privacy tab in the navigation bar to control granular sharing permissions.");
        break;
    }
  };

  const handleStartConversationTopic = (prompt: string) => {
    handleOpenSubView('conversation');
  };

  const connectedDateStr = coupleSpace?.createdAt 
    ? new Date(coupleSpace.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  // 1. RENDER OVERVIEW MODE
  if (subView === 'overview') {
    return (
      <div className="w-full space-y-6 pb-28 animate-fadeIn">
        {/* Connection Header */}
        <div className="pt-2 flex items-center justify-between relative border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <InitialsAvatar
              name={partnerName}
              photoURL={partnerProfile?.photoURL}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {partnerName}
                </h1>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Connected</span>
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                <span className="font-medium text-violet-300">
                  {connectionLabel}
                </span>
                {connectedDateStr && (
                  <>
                    <span aria-hidden="true" className="text-zinc-600">·</span>
                    <span className="text-[11px] text-zinc-400">Connected since {connectedDateStr}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Premium Three-Dot Menu & Switcher */}
          <div className="flex items-center gap-2">
            <ConnectionSwitcher onOpenPairing={(mode = 'options') => setShowPairingModal(true)} />
            
            <div className="relative">
              <button
                onClick={() => setShowDropdownMenu(!showDropdownMenu)}
                className="p-2.5 rounded-2xl bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer shadow-sm"
                aria-label="Connection options"
              >
                <span className="font-bold text-sm tracking-widest px-0.5">•••</span>
              </button>

              {showDropdownMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-[#111116] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 animate-fadeIn space-y-1">
                  <button
                    onClick={() => {
                      setShowDropdownMenu(false);
                      setShowDetailsModal(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
                  >
                    Connection Details
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdownMenu(false);
                      setErrorBanner("You can adjust sharing permissions for this connection in the Privacy tab.");
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
                  >
                    Privacy Settings
                  </button>
                  <div className="h-[1px] bg-white/5 my-1" />
                  <button
                    onClick={() => {
                      setShowDropdownMenu(false);
                      setShowRemoveConfirm(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                  >
                    Remove Connection
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Banner if any */}
        {errorBanner && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="p-1 text-rose-400 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Connection Switcher Horizontal Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Your Connections
            </span>
          </div>
          <ConnectionSelectorBar onOpenPairing={(mode = 'options') => setShowPairingModal(true)} />
        </div>

        {/* Balanced Responsive 2-Column Grid (Desktop) / 1-Column Stack (Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Hero, Quick Actions, Conversation Starter */}
          <div className="lg:col-span-7 space-y-6">
            <ConnectionHero 
              coupleSpace={coupleSpace} 
              partnerProfile={partnerProfile} 
            />

            <QuickActionsGrid 
              onAction={handleQuickAction} 
            />

            <ConversationStarterCard 
              onTalkAboutIt={handleStartConversationTopic} 
            />
          </div>

          {/* Right Column: Connection Pulse, Recent Activity, Shared Space */}
          <div className="lg:col-span-5 space-y-6">
            <ConnectionPulseSection
              onOpenCheckIn={() => {
                setCheckInModalTab('new');
                setShowCheckInModal(true);
              }}
              onOpenHistory={(tab) => {
                setCheckInModalTab(tab || 'history');
                setShowCheckInModal(true);
              }}
            />

            <RecentActivitySection
              connectionId={coupleSpace.id}
              partnerName={partnerName}
              onOpenItem={(type) => {
                if (type === 'checkin') {
                  setCheckInModalTab('shared');
                  setShowCheckInModal(true);
                } else if (['memories', 'goals', 'dates', 'notes', 'boundaries', 'conversation'].includes(type)) {
                  handleOpenSubView(type as any);
                }
              }}
            />

            <SharedSpaceGrid
              memories={memories}
              goals={goals}
              importantDates={importantDates}
              sharedNotes={sharedNotes}
              boundaries={boundaries}
              onOpenSubView={handleOpenSubView}
            />
          </div>
        </div>

        {/* Privacy Status Bar (Full Width) */}
        <PrivacyStatusBar 
          onOpenPrivacy={() => setErrorBanner("You can view and adjust your granular sharing controls in the Privacy Center tab.")} 
        />

        {/* Connection Details Modal */}
        {showDetailsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="text-base font-bold text-white">Connection Details</h3>
                <button onClick={() => setShowDetailsModal(false)} className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-zinc-400">Connection Space</span>
                  <span className="text-white font-semibold">{coupleSpace.name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-zinc-400">Connection ID</span>
                  <span className="text-zinc-300 font-mono text-[10px]">{coupleSpace.id}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-zinc-400">Invite Code</span>
                  <span className="text-amber-400 font-mono font-bold text-sm">{coupleSpace.inviteCode}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remove Connection Safety Confirmation */}
        {showRemoveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-sm bg-[#111116] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-white">Remove this connection?</h3>
                <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                  This will end the shared connection with <strong>{partnerName}</strong> and revoke access to its shared space. Your personal reflections remain private and fully intact.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => setShowRemoveConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-semibold border border-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRemoveConnection}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Remove Connection</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. RENDER SUB-VIEWS MODE (Memories, Goals, Dates, Notes, Boundaries)
  return (
    <div className="w-full space-y-6 pb-28 animate-fadeIn">
      {/* Back Button to Overview */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <button
          onClick={() => setSubView('overview')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 text-zinc-300 hover:text-white text-xs font-medium border border-white/10 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </button>

        {/* Global Action Button */}
        {activeTab === 'memories' && (
          <button
            onClick={() => {
              setErrorBanner(null);
              handleOpenAddMemory();
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:opacity-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Memory</span>
          </button>
        )}
      </div>

      {/* Error banner */}
      {errorBanner && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="p-1 text-rose-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. SECTION: SHARED MEMORIES */}
      {/* ===================================================================== */}
      {activeTab === 'memories' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Shared Memories</h3>
              <p className="text-xs text-zinc-400">
                Keep the moments that matter.
              </p>
            </div>
            <button
              onClick={handleOpenAddMemory}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/20 flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Memory</span>
            </button>
          </div>

          {memories.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center border border-white/5 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">
                  No memories yet.
                </h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Save a moment you'll want to remember.
                </p>
              </div>
              <button
                onClick={handleOpenAddMemory}
                className="mt-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Memory</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {memories.map((m) => {
                const isCreator = m.createdBy === userProfile?.uid;
                const photoSrc = m.imageUrl || m.photoURL;

                return (
                  <div 
                    key={m.id} 
                    className="glass-card rounded-2xl p-4 border border-white/10 space-y-3 hover:border-white/20 transition-all cursor-pointer group"
                    onClick={() => setSelectedMemoryDetail(m)}
                  >
                    {photoSrc && (
                      <div className="rounded-xl overflow-hidden max-h-52 w-full bg-zinc-950 border border-white/5 relative">
                        <img 
                          src={photoSrc} 
                          alt={m.title} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" 
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                          {m.title}
                        </h4>
                        {m.date && (
                          <span className="text-[11px] font-mono text-rose-300/90 shrink-0">
                            {new Date(m.date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        )}
                      </div>

                      {m.description && (
                        <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                          {m.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[10px] text-zinc-400 border-t border-white/5">
                      <span>
                        Created by {m.creatorName || (isCreator ? 'You' : (partnerProfile?.displayName || 'Partner'))}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditMemory(m);
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                          title="Edit memory"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemoryToDelete(m);
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-rose-400 transition-colors"
                          title="Delete memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
      {/* 3. SECTION: SHARED GOALS */}
      {/* ===================================================================== */}
      {activeTab === 'goals' && (
        <SharedGoals />
      )}

      {/* ===================================================================== */}
      {/* 4. SECTION: IMPORTANT DATES & SHARED CALENDAR */}
      {/* ===================================================================== */}
      {activeTab === 'dates' && (
        <ImportantDatesView />
      )}

      {/* ===================================================================== */}
      {/* 5. SECTION: SHARED NOTES */}
      {/* ===================================================================== */}
      {activeTab === 'notes' && (
        <SharedNotesView />
      )}

      {/* ===================================================================== */}
      {/* 6. SECTION: RELATIONSHIP BOUNDARIES & AGREEMENTS */}
      {/* ===================================================================== */}
      {activeTab === 'boundaries' && (
        <BoundariesView />
      )}

      {/* ===================================================================== */}
      {/* SECTION: CONVERSATION HUB */}
      {/* ===================================================================== */}
      {subView === 'conversation' && (
        <ConversationHub />
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD / EDIT MEMORY */}
      {/* ===================================================================== */}
      {activeModal === 'memory' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingMemoryId ? 'Edit Memory' : 'Create Memory'}
                </h3>
                <p className="text-[11px] text-zinc-400">Keep the moments that matter.</p>
              </div>
              <button 
                onClick={() => {
                  setActiveModal(null);
                  setMemPreviewUrl(null);
                  setMemImageFile(null);
                }} 
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMemory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Our First Trip"
                  value={memTitle}
                  onChange={(e) => setMemTitle(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Description <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="A beautiful day we spent together..."
                  value={memDesc}
                  onChange={(e) => setMemDesc(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Date <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={memDate}
                  onChange={(e) => setMemDate(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Photo Input (Optional) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">
                  Photo <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-900 border border-white/10 hover:border-rose-500/50 cursor-pointer text-xs text-zinc-300 hover:text-white transition-all">
                    <Camera className="w-3.5 h-3.5 text-rose-400" />
                    <span>Choose Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {(memPreviewUrl || memImageUrl) && (
                  <div className="relative rounded-xl overflow-hidden max-h-40 border border-white/10 bg-zinc-950">
                    <img 
                      src={memPreviewUrl || memImageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setMemImageFile(null);
                        setMemPreviewUrl(null);
                        setMemImageUrl('');
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/80 text-white hover:bg-rose-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div>
                  <input
                    type="url"
                    placeholder="Or enter direct image URL (optional)"
                    value={memImageUrl}
                    onChange={(e) => setMemImageUrl(e.target.value)}
                    className="w-full bg-zinc-950/60 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setMemPreviewUrl(null);
                    setMemImageFile(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-medium border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !memTitle.trim() || !memDesc.trim()}
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
      {/* MODAL 1B: MEMORY DETAIL VIEW */}
      {/* ===================================================================== */}
      {selectedMemoryDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>Shared Memory</span>
              </span>
              <button 
                onClick={() => setSelectedMemoryDetail(null)} 
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(selectedMemoryDetail.imageUrl || selectedMemoryDetail.photoURL) && (
              <div className="rounded-2xl overflow-hidden max-h-72 w-full bg-zinc-950 border border-white/10">
                <img 
                  src={selectedMemoryDetail.imageUrl || selectedMemoryDetail.photoURL} 
                  alt={selectedMemoryDetail.title} 
                  className="w-full h-full object-contain" 
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-white">
                  {selectedMemoryDetail.title}
                </h3>
                {selectedMemoryDetail.date && (
                  <span className="text-xs font-mono text-rose-300">
                    {new Date(selectedMemoryDetail.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {selectedMemoryDetail.description}
              </p>

              <div className="pt-2 text-[11px] text-zinc-500 border-t border-white/5">
                Created by {selectedMemoryDetail.creatorName || (selectedMemoryDetail.createdBy === userProfile?.uid ? 'You' : 'Partner')}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenEditMemory(selectedMemoryDetail)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => setMemoryToDelete(selectedMemoryDetail)}
                className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold border border-rose-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1C: DELETE MEMORY CONFIRMATION */}
      {/* ===================================================================== */}
      {memoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xs bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Delete this memory?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                This memory will be removed from your shared space.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setMemoryToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDeleteMemory}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md flex items-center justify-center gap-1 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CONNECTION CHECK-IN & HISTORY MODAL */}
      {/* ===================================================================== */}
      <ConnectionCheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        initialTab={checkInModalTab}
      />
    </div>
  );
};
