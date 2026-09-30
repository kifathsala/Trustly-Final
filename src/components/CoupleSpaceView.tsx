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
  Share2
} from 'lucide-react';
import { CouplePairing } from './CouplePairing';
import { CoupleGoalsModal } from './CoupleGoalsModal';

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
    return { daysRemaining: 0, label: 'Today! 🎉', isUpcoming: true, isToday: true, nextOccurrenceDate: targetDate, formattedDate };
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
  const [activeModal, setActiveModal] = useState<'memory' | 'date' | 'note' | 'boundary' | null>(null);
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

  // PHOTO FILE SELECTION (Local preview, NO base64 in Firestore)
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorBanner("Please choose an image under 10MB.");
      return;
    }

    setMemImageFile(file);
    const localUrl = URL.createObjectURL(file);
    setMemPreviewUrl(localUrl);
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

  // 4. RELATIONSHIP BOUNDARIES HANDLERS
  const handleOpenAddBoundary = () => {
    setEditingBoundaryId(null);
    setBoundaryCategory('Communication');
    setBoundaryTitle('');
    setBoundaryDetails('');
    setBoundaryHandling('');
    setErrorBanner(null);
    setActiveModal('boundary');
  };

  const handleOpenEditBoundary = (b: BoundaryItem) => {
    setEditingBoundaryId(b.id || null);
    setBoundaryCategory(b.category || 'Communication');
    setBoundaryTitle(b.title);
    setBoundaryDetails(b.details || b.description || '');
    setBoundaryHandling(b.handling || '');
    setErrorBanner(null);
    setSelectedBoundaryDetail(null);
    setActiveModal('boundary');
  };

  const handleSaveBoundary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleSpace || !userProfile || !boundaryTitle.trim() || !boundaryDetails.trim()) return;

    setIsSubmitting(true);
    setErrorBanner(null);
    try {
      if (editingBoundaryId) {
        // Editing resets agreement status so both partners re-affirm the changes
        await updateDoc(doc(db, 'couples', coupleSpace.id, 'boundaries', editingBoundaryId), {
          title: boundaryTitle.trim(),
          details: boundaryDetails.trim(),
          description: boundaryDetails.trim(),
          handling: boundaryHandling.trim() || undefined,
          category: boundaryCategory,
          status: 'review',
          agreements: { [userProfile.uid]: true },
          updatedAt: new Date().toISOString()
        });
      } else {
        const newBoundary: Omit<BoundaryItem, 'id'> = {
          coupleId: coupleSpace.id,
          createdBy: userProfile.uid,
          creatorName: userProfile.displayName || 'Partner',
          title: boundaryTitle.trim(),
          details: boundaryDetails.trim(),
          description: boundaryDetails.trim(),
          handling: boundaryHandling.trim() || undefined,
          category: boundaryCategory,
          status: 'pending',
          agreements: { [userProfile.uid]: true },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'couples', coupleSpace.id, 'boundaries'), newBoundary);

        if (partnerProfile) {
          await sendPartnerNotification(
            partnerProfile.uid,
            "New Boundary Proposed 🤝",
            `${userProfile.displayName || 'Your partner'} created boundary: "${boundaryTitle.trim()}".`,
            'boundary_proposed'
          );
        }
      }

      setBoundaryTitle('');
      setBoundaryDetails('');
      setBoundaryHandling('');
      setEditingBoundaryId(null);
      setActiveModal(null);
    } catch (err: any) {
      console.error("Save boundary error:", err);
      setErrorBanner("Failed to save boundary.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBoundaryAction = async (boundary: BoundaryItem, action: 'agree' | 'discuss' | 'review') => {
    if (!boundary.id || !coupleSpace || !userProfile) return;

    try {
      const updateData: Partial<BoundaryItem> = {
        updatedAt: new Date().toISOString()
      };

      if (action === 'agree') {
        const newAgreements = { ...(boundary.agreements || {}), [userProfile.uid]: true };
        updateData.agreements = newAgreements;
        updateData.status = 'agreed';
        updateData.agreedBy = userProfile.uid;
        updateData.agreedByName = userProfile.displayName || 'Partner';
        updateData.agreedAt = new Date().toISOString();
      } else if (action === 'discuss') {
        updateData.status = 'discussing';
      } else if (action === 'review') {
        // Re-open agreed boundary for review
        updateData.status = 'review';
        updateData.agreements = { [userProfile.uid]: true };
      }

      await updateDoc(doc(db, 'couples', coupleSpace.id, 'boundaries', boundary.id), updateData);

      // Keep detail view in sync
      if (selectedBoundaryDetail?.id === boundary.id) {
        setSelectedBoundaryDetail({ ...selectedBoundaryDetail, ...updateData });
      }

      if (partnerProfile) {
        const actionText = action === 'agree' ? 'agreed to' : action === 'discuss' ? 'requested to discuss' : 'reopened for review';
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

  const handleConfirmDeleteBoundary = async () => {
    if (!boundaryToDelete?.id || !coupleSpace) return;

    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'couples', coupleSpace.id, 'boundaries', boundaryToDelete.id));
      setBoundaryToDelete(null);
      if (selectedBoundaryDetail?.id === boundaryToDelete.id) {
        setSelectedBoundaryDetail(null);
      }
    } catch (err: any) {
      console.error("Delete boundary error:", err);
      setErrorBanner("Failed to delete boundary.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for Category icons
  const getDateCategoryIcon = (category?: string) => {
    switch (category) {
      case 'Anniversary':
        return '❤️';
      case 'Birthday':
        return '🎂';
      case 'First Meeting':
      case 'First Date':
        return '✨';
      case 'Special Day':
      case 'Milestone':
        return '🌟';
      case 'Trip':
        return '✈️';
      default:
        return '📅';
    }
  };

  const getBoundaryCategoryIcon = (category?: string) => {
    switch (category) {
      case 'Communication':
        return '💬';
      case 'Privacy':
        return '🔒';
      case 'Social Life':
        return '👥';
      case 'Time Together':
        return '⏳';
      case 'Money':
        return '💰';
      case 'Family':
        return '🏡';
      case 'Online/Social Media':
        return '📱';
      case 'Personal Space':
        return '🧘';
      default:
        return '🤝';
    }
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

  // WAITING FOR PARTNER STATE
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
            Your private space, together.
          </p>
        </div>

        {/* Global Action Button */}
        <button
          onClick={() => {
            setErrorBanner(null);
            if (activeTab === 'memories') {
              handleOpenAddMemory();
            } else if (activeTab === 'goals') {
              setGoalsModalMode('create');
              setShowGoalsModal(true);
            } else if (activeTab === 'dates') {
              handleOpenAddDate();
            } else if (activeTab === 'notes') {
              handleOpenAddNote();
            } else if (activeTab === 'boundaries') {
              handleOpenAddBoundary();
            }
          }}
          className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:opacity-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeTab === 'memories' ? 'Add Memory' : 
             activeTab === 'goals' ? 'New Goal' : 
             activeTab === 'dates' ? 'Add Date' : 
             activeTab === 'notes' ? 'Create Note' : 'Create Boundary'}
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
      {/* 3. SECTION: OUR GOALS */}
      {/* ===================================================================== */}
      {activeTab === 'goals' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Couple Goals</h3>
              <p className="text-xs text-zinc-400">
                Build something together.
              </p>
            </div>
            <button
              onClick={() => {
                setGoalsModalMode('create');
                setShowGoalsModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/20 flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create a Goal</span>
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center border border-white/5 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">
                  No shared goals yet.
                </h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Choose something you'd like to work toward together.
                </p>
              </div>
              <button
                onClick={() => {
                  setGoalsModalMode('create');
                  setShowGoalsModal(true);
                }}
                className="mt-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Goal</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((g) => {
                const isCompleted = g.status === 'completed' || g.isCompleted;
                return (
                  <div 
                    key={g.id} 
                    onClick={() => {
                      setGoalsModalMode('list');
                      setGoalsModalTab(isCompleted ? 'milestones' : 'active');
                      setShowGoalsModal(true);
                    }}
                    className="glass-card rounded-2xl p-4 border border-white/10 space-y-2 hover:border-white/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-medium">
                            {g.category}
                          </span>
                          {g.deadline && (
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {g.deadline}
                            </span>
                          )}
                        </div>
                        <h4 className={`text-sm font-bold mt-1 ${isCompleted ? 'line-through text-zinc-400' : 'text-white group-hover:text-rose-300'}`}>
                          {g.title}
                        </h4>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isCompleted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {isCompleted ? 'Completed' : 'Active'}
                      </span>
                    </div>

                    {g.description && (
                      <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                        {g.description}
                      </p>
                    )}

                    <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-400 border-t border-white/5">
                      <span>{isCompleted ? 'Accomplished together 🎉' : 'Tap to view details'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-rose-400 transition-colors" />
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
      {activeTab === 'dates' && (() => {
        // Construct displayed important dates including dynamic birthdays without DB duplication
        const allDisplayedDates: (ImportantDate & { isSystemBirthday?: boolean; isPartnerShared?: boolean })[] = [
          ...importantDates.map(d => ({ ...d, isSystemBirthday: false }))
        ];

        const partnerDOB = partnerProfile?.dateOfBirth || partnerProfile?.birthday;
        if (partnerProfile?.shareBirthday && partnerDOB) {
          allDisplayedDates.push({
            id: 'system_partner_birthday',
            coupleId: coupleSpace?.id || '',
            createdBy: partnerProfile.uid,
            creatorName: partnerProfile.displayName || 'Partner',
            title: `${partnerProfile.displayName || 'Partner'}'s Birthday`,
            date: partnerDOB,
            description: 'Shared partner birthday celebration 🎉',
            repeatYearly: true,
            category: 'Birthday',
            createdAt: '',
            isSystemBirthday: true,
            isPartnerShared: true
          });
        }

        const userDOB = userProfile?.dateOfBirth || userProfile?.birthday;
        if (userDOB) {
          allDisplayedDates.push({
            id: 'system_user_birthday',
            coupleId: coupleSpace?.id || '',
            createdBy: userProfile.uid,
            creatorName: userProfile.displayName || 'You',
            title: 'My Birthday',
            date: userDOB,
            description: userProfile.shareBirthday ? 'Shared with your partner 🎂' : 'Private birthday (visible only to you) 🔒',
            repeatYearly: true,
            category: 'Birthday',
            createdAt: '',
            isSystemBirthday: true,
            isPartnerShared: false
          });
        }

        // Sort upcoming dates closest to today first
        allDisplayedDates.sort((a, b) => {
          const nextA = calculateDateCountdown(a.date, a.repeatYearly).nextOccurrenceDate.getTime();
          const nextB = calculateDateCountdown(b.date, b.repeatYearly).nextOccurrenceDate.getTime();
          return nextA - nextB;
        });

        return (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Important Dates</h3>
                <p className="text-xs text-zinc-400">
                  Never lose track of the moments that matter.
                </p>
              </div>
              <button
                onClick={handleOpenAddDate}
                className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/20 flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Date</span>
              </button>
            </div>

            {allDisplayedDates.length === 0 ? (
              <div className="glass-card rounded-3xl p-8 text-center border border-white/5 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mx-auto flex items-center justify-center">
                  <CalendarHeart className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">
                    No important dates added.
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                    Add anniversaries, birthdays, or special moments.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddDate}
                  className="mt-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-rose-600 text-white font-semibold text-xs shadow-md shadow-purple-600/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add an Important Date</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {allDisplayedDates.map((d) => {
                  const countdown = calculateDateCountdown(d.date, d.repeatYearly);
                  const categoryIcon = getDateCategoryIcon(d.category);

                  return (
                    <div 
                      key={d.id} 
                      className="glass-card rounded-2xl p-4 border border-white/10 space-y-2.5 hover:border-white/20 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${
                            countdown.isToday 
                              ? 'bg-rose-500/20 border border-rose-500/40 animate-pulse' 
                              : 'bg-white/5 border border-white/10'
                          }`}>
                            {categoryIcon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">
                                {d.title}
                              </h4>
                              {d.isSystemBirthday && (
                                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                                  d.isPartnerShared
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                }`}>
                                  {d.isPartnerShared ? 'Shared Birthday' : 'Profile DOB'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                              <span className="font-semibold text-zinc-200">{countdown.formattedDate}</span>
                              {d.repeatYearly && (
                                <span className="flex items-center gap-1 text-[10px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                  <Repeat className="w-2.5 h-2.5" />
                                  <span>Yearly</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Approaching Indicator */}
                        <div className="text-right shrink-0">
                          {countdown.isToday ? (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500 text-white shadow-sm inline-block">
                              Today! 🎉
                            </span>
                          ) : countdown.isUpcoming ? (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                                Coming up
                              </span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 mt-0.5 inline-block">
                                {countdown.label}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 inline-block">
                              {countdown.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {d.description && (
                        <p className="text-xs text-zinc-300 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5">
                          {d.description}
                        </p>
                      )}

                      <div className="pt-2 flex items-center justify-between text-[10px] text-zinc-400 border-t border-white/5">
                        <span>
                          {d.isSystemBirthday 
                            ? (d.isPartnerShared ? `Shared by ${d.creatorName}` : 'Configured in Profile')
                            : `Added by ${d.creatorName || (d.createdBy === userProfile?.uid ? 'You' : (partnerProfile?.displayName || 'Partner'))}`}
                        </span>

                        {!d.isSystemBirthday && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditDate(d)}
                              className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                              title="Edit date"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDateToDelete(d)}
                              className="p-1 rounded text-zinc-400 hover:text-rose-400 transition-colors"
                              title="Delete date"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* 5. SECTION: SHARED NOTES */}
      {/* ===================================================================== */}
      {activeTab === 'notes' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Shared Notes</h3>
              <p className="text-xs text-zinc-400">
                A private space for things you both want to remember.
              </p>
            </div>
            <button
              onClick={handleOpenAddNote}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/20 flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Note</span>
            </button>
          </div>

          {sharedNotes.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center border border-white/5 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                <StickyNote className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">
                  No shared notes yet.
                </h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Keep plans and thoughts you both want to remember in one place.
                </p>
              </div>
              <button
                onClick={handleOpenAddNote}
                className="mt-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-semibold text-xs shadow-md shadow-amber-600/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Note</span>
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
                  <div 
                    key={n.id} 
                    onClick={() => setSelectedNoteDetail(n)}
                    className="glass-card rounded-2xl p-4 border border-white/10 space-y-2 hover:border-white/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {n.title}
                      </h4>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditNote(n);
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                          title="Edit note"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNoteToDelete(n);
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-rose-400 transition-colors"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                      {n.content}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[10px] text-zinc-500 border-t border-white/5">
                      <span>Updated: {formattedTime}</span>
                      <span>By {n.creatorName || (n.createdBy === userProfile?.uid ? 'You' : (partnerProfile?.displayName || 'Partner'))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. SECTION: RELATIONSHIP BOUNDARIES */}
      {/* ===================================================================== */}
      {activeTab === 'boundaries' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Boundaries</h3>
              <p className="text-xs text-zinc-400">
                Talk about what helps both of you feel respected and comfortable.
              </p>
            </div>
            <button
              onClick={handleOpenAddBoundary}
              className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/20 flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Boundary</span>
            </button>
          </div>

          {boundaries.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center border border-white/5 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 mx-auto flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">
                  No boundaries added yet.
                </h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Start a conversation about what matters to both of you.
                </p>
              </div>
              <button
                onClick={handleOpenAddBoundary}
                className="mt-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Boundary</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {boundaries.map((b) => {
                const isProposer = b.createdBy === userProfile?.uid;
                const isAgreed = b.status === 'agreed';
                const isDiscussing = b.status === 'discussing';
                const isReview = b.status === 'review';
                const isPending = b.status === 'pending';
                const categoryIcon = getBoundaryCategoryIcon(b.category);

                return (
                  <div 
                    key={b.id} 
                    onClick={() => setSelectedBoundaryDetail(b)}
                    className="glass-card rounded-2xl p-4 border border-white/10 space-y-3 hover:border-white/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="text-base p-1 rounded-lg bg-white/5 border border-white/10">
                          {categoryIcon}
                        </span>
                        <div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-medium">
                            {b.category}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1 group-hover:text-teal-300 transition-colors">
                            {b.title}
                          </h4>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        isAgreed 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : isDiscussing 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : isReview
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {isAgreed ? 'Agreed' : isDiscussing ? 'In Discussion' : isReview ? 'Needs Review' : 'Waiting for discussion'}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                      {b.details || b.description}
                    </p>

                    {/* Partner Mutual Agreement Prompt & Status */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="text-[11px] flex items-center justify-between text-zinc-400">
                        {isAgreed ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Both partners agreed.
                          </span>
                        ) : isDiscussing ? (
                          <span className="text-amber-300 flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" /> Both of you can discuss this before agreeing.
                          </span>
                        ) : isReview ? (
                          <span className="text-purple-300 flex items-center gap-1">
                            <RefreshCw className="w-3.5 h-3.5" /> Reopened for review and mutual agreement.
                          </span>
                        ) : (
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            {isProposer ? "Your partner hasn't responded yet." : "Review and agree when ready."}
                          </span>
                        )}

                        <span className="text-[10px] text-zinc-500">
                          By {b.creatorName || (isProposer ? 'You' : 'Partner')}
                        </span>
                      </div>

                      {/* Quick Partner Action Buttons */}
                      {!isProposer && !isAgreed && (
                        <div className="pt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleBoundaryAction(b, 'agree')}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                          >
                            Agree
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBoundaryAction(b, 'discuss')}
                            className="flex-1 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                          >
                            Discuss
                          </button>
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
      {/* MODAL 2: ADD / EDIT IMPORTANT DATE */}
      {/* ===================================================================== */}
      {activeModal === 'date' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingDateId ? 'Edit Important Date' : 'Add Important Date'}
                </h3>
                <p className="text-[11px] text-zinc-400">Never lose track of the moments that matter.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveImportantDate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Event Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anniversary, Birthday, First Date"
                  value={dateTitle}
                  onChange={(e) => setDateTitle(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Category
                </label>
                <select
                  value={dateCategory}
                  onChange={(e) => setDateCategory(e.target.value as any)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Anniversary">❤️ Anniversary</option>
                  <option value="Birthday">🎂 Birthday</option>
                  <option value="First Meeting">✨ First Date</option>
                  <option value="Special Day">🌟 Special Day</option>
                  <option value="Custom Date">📅 Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Description <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Add notes, reservations, or why this day is special..."
                  value={dateDesc}
                  onChange={(e) => setDateDesc(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-purple-200">Repeat every year</h4>
                  <p className="text-[10px] text-zinc-400">Calculate upcoming anniversaries automatically</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dateRepeatYearly}
                    onChange={(e) => setDateRepeatYearly(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
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
                  disabled={isSubmitting || !dateTitle.trim() || !dateValue}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-rose-600 text-white text-xs font-semibold shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Date</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2B: DELETE IMPORTANT DATE CONFIRMATION */}
      {/* ===================================================================== */}
      {dateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xs bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Delete this important date?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                This will remove the date for both of you.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setDateToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDeleteDate}
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
      {/* MODAL 3: CREATE / EDIT SHARED NOTE */}
      {/* ===================================================================== */}
      {activeModal === 'note' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingNoteId ? 'Edit Note' : 'Create Note'}
                </h3>
                <p className="text-[11px] text-zinc-400">A private space for things you both want to remember.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Title <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Things to plan for our trip"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Note <span className="text-amber-400">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Look at hotels and decide which dates work for both of us..."
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
                  <span>Save Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3B: NOTE DETAIL VIEW */}
      {/* ===================================================================== */}
      {selectedNoteDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" />
                <span>Shared Note</span>
              </span>
              <button 
                onClick={() => setSelectedNoteDetail(null)} 
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-bold text-white leading-snug">
                {selectedNoteDetail.title}
              </h3>

              <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/5">
                <p className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {selectedNoteDetail.content}
                </p>
              </div>

              <div className="pt-2 text-[11px] text-zinc-400 space-y-0.5 border-t border-white/5">
                <div>Created by {selectedNoteDetail.creatorName || (selectedNoteDetail.createdBy === userProfile?.uid ? 'You' : 'Partner')}</div>
                <div className="text-zinc-500">
                  Last updated {new Date(selectedNoteDetail.updatedAt || selectedNoteDetail.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenEditNote(selectedNoteDetail)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => setNoteToDelete(selectedNoteDetail)}
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
      {/* MODAL 3C: DELETE NOTE CONFIRMATION */}
      {/* ===================================================================== */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xs bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Delete this note?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                This note will be removed for both of you.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setNoteToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDeleteNote}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md flex items-center justify-center gap-1 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete Note</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: CREATE / EDIT RELATIONSHIP BOUNDARY */}
      {/* ===================================================================== */}
      {activeModal === 'boundary' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingBoundaryId ? 'Edit Boundary' : 'Create Boundary'}
                </h3>
                <p className="text-[11px] text-zinc-400">Talk about what helps both of you feel respected and comfortable.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBoundary} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Category <span className="text-teal-400">*</span>
                </label>
                <select
                  value={boundaryCategory}
                  onChange={(e) => setBoundaryCategory(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="Communication">💬 Communication</option>
                  <option value="Privacy">🔒 Privacy</option>
                  <option value="Social Life">👥 Social Life</option>
                  <option value="Time Together">⏳ Time Together</option>
                  <option value="Money">💰 Money</option>
                  <option value="Family">🏡 Family</option>
                  <option value="Online/Social Media">📱 Online/Social Media</option>
                  <option value="Personal Space">🧘 Personal Space</option>
                  <option value="Other">🤝 Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Boundary Title <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discuss major purchases together."
                  value={boundaryTitle}
                  onChange={(e) => setBoundaryTitle(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Details <span className="text-teal-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. We'll talk before making a major shared financial decision."
                  value={boundaryDetails}
                  onChange={(e) => setBoundaryDetails(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  How should we handle this? <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. If something is over ₹5,000, let's give each other a heads-up first."
                  value={boundaryHandling}
                  onChange={(e) => setBoundaryHandling(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-200 text-xs leading-relaxed">
                <p>
                  <strong>Mutual Agreement:</strong> Creating a boundary sets status to "Waiting for discussion". Once both partners agree, it becomes "Agreed".
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
                  disabled={isSubmitting || !boundaryTitle.trim() || !boundaryDetails.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white text-xs font-semibold shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{editingBoundaryId ? 'Update Boundary' : 'Create Boundary'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4B: BOUNDARY DETAIL VIEW */}
      {/* ===================================================================== */}
      {selectedBoundaryDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-base">{getBoundaryCategoryIcon(selectedBoundaryDetail.category)}</span>
                <span className="text-[10px] uppercase tracking-wider text-teal-400 font-semibold">
                  {selectedBoundaryDetail.category}
                </span>
              </div>
              <button 
                onClick={() => setSelectedBoundaryDetail(null)} 
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-white">
                  {selectedBoundaryDetail.title}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  selectedBoundaryDetail.status === 'agreed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : selectedBoundaryDetail.status === 'discussing'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : selectedBoundaryDetail.status === 'review'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}>
                  {selectedBoundaryDetail.status === 'agreed' ? 'Agreed' : selectedBoundaryDetail.status === 'discussing' ? 'In Discussion' : selectedBoundaryDetail.status === 'review' ? 'Needs Review' : 'Waiting for discussion'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-2">
                <h5 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Details</h5>
                <p className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {selectedBoundaryDetail.details || selectedBoundaryDetail.description}
                </p>
              </div>

              {selectedBoundaryDetail.handling && (
                <div className="p-3.5 rounded-2xl bg-teal-950/20 border border-teal-500/20 space-y-1">
                  <h5 className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider">How we handle this</h5>
                  <p className="text-xs text-teal-100 whitespace-pre-wrap leading-relaxed">
                    {selectedBoundaryDetail.handling}
                  </p>
                </div>
              )}

              {/* Agreement State Info */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-xs text-zinc-300">
                {selectedBoundaryDetail.status === 'agreed' ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Both partners agreed.</span>
                  </div>
                ) : selectedBoundaryDetail.status === 'discussing' ? (
                  <div className="flex items-center gap-2 text-amber-300">
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span>Both of you can discuss this before agreeing.</span>
                  </div>
                ) : selectedBoundaryDetail.status === 'review' ? (
                  <div className="flex items-center gap-2 text-purple-300">
                    <RefreshCw className="w-4 h-4 shrink-0" />
                    <span>Boundary updated and waiting for mutual agreement.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Clock className="w-4 h-4 shrink-0 text-indigo-400" />
                    <span>{selectedBoundaryDetail.createdBy === userProfile?.uid ? "Your partner hasn't responded yet." : "Review and agree when ready."}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 text-[11px] text-zinc-500 border-t border-white/5">
                Proposed by {selectedBoundaryDetail.creatorName || (selectedBoundaryDetail.createdBy === userProfile?.uid ? 'You' : 'Partner')}
              </div>
            </div>

            {/* Actions for Boundary */}
            <div className="pt-2 space-y-2">
              {/* If other partner and not agreed: Agree / Discuss buttons */}
              {selectedBoundaryDetail.createdBy !== userProfile?.uid && selectedBoundaryDetail.status !== 'agreed' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBoundaryAction(selectedBoundaryDetail, 'agree')}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    Agree to Boundary
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBoundaryAction(selectedBoundaryDetail, 'discuss')}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Discuss
                  </button>
                </div>
              )}

              {/* If agreed: Allow either partner to reopen with [Review Boundary] */}
              {selectedBoundaryDetail.status === 'agreed' && (
                <button
                  type="button"
                  onClick={() => handleBoundaryAction(selectedBoundaryDetail, 'review')}
                  className="w-full py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Review Boundary</span>
                </button>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenEditBoundary(selectedBoundaryDetail)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBoundaryToDelete(selectedBoundaryDetail)}
                  className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold border border-rose-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4C: DELETE BOUNDARY CONFIRMATION */}
      {/* ===================================================================== */}
      {boundaryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xs bg-[#111116] border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Delete this boundary?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                This boundary will be removed from your shared space.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setBoundaryToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDeleteBoundary}
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
      {/* COUPLE GOALS MODAL INTEGRATION */}
      {/* ===================================================================== */}
      <CoupleGoalsModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        initialMode={goalsModalMode}
        initialTab={goalsModalTab}
      />
    </div>
  );
};
