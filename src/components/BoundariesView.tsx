import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  BoundaryItem, 
  BoundaryCategory, 
  BoundaryStatus, 
  BoundaryAgreementHistoryItem 
} from '../types';
import { 
  Shield, 
  Plus, 
  Check, 
  MessageSquare, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  X, 
  Loader2, 
  Clock, 
  Users, 
  CheckCircle2, 
  Info,
  History,
  Lock,
  MessageCircle
} from 'lucide-react';
import { sendNotification } from '../lib/notifications';
import { getConnectionLabel } from '../lib/connection';

const BOUNDARY_CATEGORIES: { name: BoundaryCategory; label: string; icon: string; badgeClass: string }[] = [
  { name: 'Communication', label: 'Communication', icon: '', badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  { name: 'Privacy', label: 'Privacy', icon: '', badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/25' },
  { name: 'Time', label: 'Time', icon: '', badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25' },
  { name: 'Personal Space', label: 'Personal Space', icon: '', badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/25' },
  { name: 'Family', label: 'Family', icon: '', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  { name: 'Social Media', label: 'Social Media', icon: '', badgeClass: 'bg-pink-500/15 text-pink-300 border-pink-500/25' },
  { name: 'Money', label: 'Money', icon: '', badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' },
  { name: 'Plans', label: 'Plans', icon: '', badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25' },
  { name: 'Other', label: 'Other', icon: '', badgeClass: 'bg-zinc-800 text-zinc-300 border-white/10' },
];

function getCategoryInfo(catName?: string) {
  const matched = BOUNDARY_CATEGORIES.find(c => c.name.toLowerCase() === (catName || '').toLowerCase());
  return matched || BOUNDARY_CATEGORIES[0];
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

export const BoundariesView: React.FC = () => {
  const { currentUser, userProfile, partnerProfile, coupleSpace } = useAuth();

  const partnerName = partnerProfile?.displayName || coupleSpace?.creatorName || 'Connection Partner';
  const connectionLabel = coupleSpace ? getConnectionLabel(coupleSpace.connectionType) : 'Connection';

  // State
  const [boundaries, setBoundaries] = useState<BoundaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'agreed' | 'discussion' | 'review'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Form modal state (Create / Edit)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingBoundaryId, setEditingBoundaryId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BoundaryCategory>('Communication');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Needs Discussion modal state
  const [discussionModalBoundary, setDiscussionModalBoundary] = useState<BoundaryItem | null>(null);
  const [discussionNoteInput, setDiscussionNoteInput] = useState('');
  const [isSubmittingDiscussion, setIsSubmittingDiscussion] = useState(false);

  // Detail modal state
  const [selectedBoundaryDetail, setSelectedBoundaryDetail] = useState<BoundaryItem | null>(null);

  // Delete modal state
  const [boundaryToDelete, setBoundaryToDelete] = useState<BoundaryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Success toast
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Real-time listener on couples/{coupleId}/boundaries
  useEffect(() => {
    if (!coupleSpace?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(db, 'couples', coupleSpace.id, 'boundaries');
    const q = query(colRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as BoundaryItem));
      setBoundaries(items);
      setLoading(false);
    }, (err) => {
      console.error("Boundaries listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [coupleSpace?.id]);

  // Form Openers
  const handleOpenCreateBoundary = () => {
    setEditingBoundaryId(null);
    setTitle('');
    setDescription('');
    setCategory('Communication');
    setErrorMsg(null);
    setShowFormModal(true);
  };

  const handleOpenEditBoundary = (b: BoundaryItem) => {
    setEditingBoundaryId(b.id || null);
    setTitle(b.title || '');
    setDescription(b.description || b.details || '');
    setCategory((b.category as BoundaryCategory) || 'Communication');
    setErrorMsg(null);
    setShowFormModal(true);
    setSelectedBoundaryDetail(null);
  };

  // Save Boundary (Create or Edit)
  const handleSaveBoundary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid || !coupleSpace?.id || !title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const boundaryId = editingBoundaryId || `boundary_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const currentUserName = userProfile?.displayName || 'Connection Member';

    try {
      const docRef = doc(db, 'couples', coupleSpace.id, 'boundaries', boundaryId);

      if (editingBoundaryId) {
        // Edit existing boundary
        const existing = boundaries.find(b => b.id === editingBoundaryId);
        const history = [...(existing?.history || [])];
        history.push({
          action: 'updated',
          userId: currentUser.uid,
          userName: currentUserName,
          timestamp
        });

        await updateDoc(docRef, {
          title: title.trim(),
          description: description.trim(),
          details: description.trim(),
          category,
          updatedAt: timestamp,
          history
        });

        setSuccessToast("Boundary updated.");
      } else {
        // Create new boundary: creator automatically agrees, waiting for partner
        const newHistory: BoundaryAgreementHistoryItem[] = [
          {
            action: 'created',
            userId: currentUser.uid,
            userName: currentUserName,
            timestamp
          },
          {
            action: 'agreed',
            userId: currentUser.uid,
            userName: currentUserName,
            timestamp
          }
        ];

        const newBoundary: BoundaryItem = {
          id: boundaryId,
          coupleId: coupleSpace.id,
          createdBy: currentUser.uid,
          creatorName: currentUserName,
          title: title.trim(),
          description: description.trim(),
          details: description.trim(),
          category,
          status: 'discussion', // Needs partner agreement to become 'agreed'
          agreedBy: [currentUser.uid],
          agreedByNames: { [currentUser.uid]: currentUserName },
          history: newHistory,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        await setDoc(docRef, newBoundary);
        setSuccessToast("Boundary added.");

        // Notify partner
        const partnerUid = coupleSpace.memberIds?.find(uid => uid !== currentUser.uid);
        if (partnerUid) {
          sendNotification(partnerUid, {
            type: 'boundary',
            title: 'New Boundary Proposed ',
            body: `${currentUserName} added a boundary: "${title.trim()}".`,
            connectionId: coupleSpace.id
          }).catch(console.error);
        }
      }

      setShowFormModal(false);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      console.error("Save boundary error:", err);
      setErrorMsg(err.message || "Failed to save boundary.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Agree to boundary
  const handleAgree = async (b: BoundaryItem) => {
    if (!currentUser?.uid || !coupleSpace?.id || !b.id) return;

    const currentUserName = userProfile?.displayName || 'Connection Member';
    const timestamp = new Date().toISOString();

    const existingAgreedBy = Array.isArray(b.agreedBy) ? b.agreedBy : [];
    if (existingAgreedBy.includes(currentUser.uid)) return; // Already agreed

    const newAgreedBy = [...existingAgreedBy, currentUser.uid];
    const newAgreedByNames = { ...(b.agreedByNames || {}), [currentUser.uid]: currentUserName };

    // Both members agreed?
    const allMembersAgreed = (coupleSpace.memberIds || []).every(mId => newAgreedBy.includes(mId));
    const newStatus: BoundaryStatus = allMembersAgreed ? 'agreed' : 'discussion';

    const history = [...(b.history || [])];
    history.push({
      action: 'agreed',
      userId: currentUser.uid,
      userName: currentUserName,
      timestamp
    });

    try {
      const docRef = doc(db, 'couples', coupleSpace.id, 'boundaries', b.id);
      await updateDoc(docRef, {
        agreedBy: newAgreedBy,
        agreedByNames: newAgreedByNames,
        status: newStatus,
        agreedAt: allMembersAgreed ? timestamp : null,
        history,
        updatedAt: timestamp
      });

      setSuccessToast(allMembersAgreed ? "Both agreed! Boundary confirmed " : "You agreed to this boundary.");
      setTimeout(() => setSuccessToast(null), 3000);

      // Notify partner
      const partnerUid = coupleSpace.memberIds?.find(uid => uid !== currentUser.uid);
      if (partnerUid) {
        sendNotification(partnerUid, {
          type: 'boundary',
          title: 'Boundary Agreed ',
          body: `${currentUserName} agreed to "${b.title}".`,
          connectionId: coupleSpace.id
        }).catch(console.error);
      }

      if (selectedBoundaryDetail?.id === b.id) {
        setSelectedBoundaryDetail({
          ...b,
          agreedBy: newAgreedBy,
          agreedByNames: newAgreedByNames,
          status: newStatus,
          agreedAt: allMembersAgreed ? timestamp : undefined,
          history
        });
      }
    } catch (err) {
      console.error("Agree boundary error:", err);
    }
  };

  // Request Discussion
  const handleOpenDiscussionModal = (b: BoundaryItem) => {
    setDiscussionModalBoundary(b);
    setDiscussionNoteInput(b.discussionNote || '');
  };

  const handleConfirmRequestDiscussion = async () => {
    if (!currentUser?.uid || !coupleSpace?.id || !discussionModalBoundary?.id) return;

    setIsSubmittingDiscussion(true);
    const currentUserName = userProfile?.displayName || 'Connection Member';
    const timestamp = new Date().toISOString();

    const history = [...(discussionModalBoundary.history || [])];
    history.push({
      action: 'discussion_requested',
      userId: currentUser.uid,
      userName: currentUserName,
      note: discussionNoteInput.trim() || undefined,
      timestamp
    });

    try {
      const docRef = doc(db, 'couples', coupleSpace.id, 'boundaries', discussionModalBoundary.id);
      await updateDoc(docRef, {
        status: 'discussion',
        discussionNote: discussionNoteInput.trim() || null,
        discussionRequestedBy: currentUser.uid,
        discussionRequestedByName: currentUserName,
        discussionRequestedAt: timestamp,
        history,
        updatedAt: timestamp
      });

      setSuccessToast("Discussion requested.");
      setTimeout(() => setSuccessToast(null), 3000);

      // Notify partner
      const partnerUid = coupleSpace.memberIds?.find(uid => uid !== currentUser.uid);
      if (partnerUid) {
        sendNotification(partnerUid, {
          type: 'boundary',
          title: 'Discussion Requested ',
          body: `${currentUserName} would like to discuss "${discussionModalBoundary.title}".`,
          connectionId: coupleSpace.id
        }).catch(console.error);
      }

      if (selectedBoundaryDetail?.id === discussionModalBoundary.id) {
        setSelectedBoundaryDetail({
          ...discussionModalBoundary,
          status: 'discussion',
          discussionNote: discussionNoteInput.trim() || undefined,
          discussionRequestedBy: currentUser.uid,
          discussionRequestedByName: currentUserName,
          history
        });
      }

      setDiscussionModalBoundary(null);
    } catch (err) {
      console.error("Request discussion error:", err);
    } finally {
      setIsSubmittingDiscussion(false);
    }
  };

  // Request Review (for already agreed boundary)
  const handleRequestReview = async (b: BoundaryItem) => {
    if (!currentUser?.uid || !coupleSpace?.id || !b.id) return;

    const currentUserName = userProfile?.displayName || 'Connection Member';
    const timestamp = new Date().toISOString();

    const history = [...(b.history || [])];
    history.push({
      action: 'review_requested',
      userId: currentUser.uid,
      userName: currentUserName,
      timestamp
    });

    try {
      const docRef = doc(db, 'couples', coupleSpace.id, 'boundaries', b.id);
      await updateDoc(docRef, {
        status: 'review',
        history,
        updatedAt: timestamp
      });

      setSuccessToast("Boundary marked for review.");
      setTimeout(() => setSuccessToast(null), 3000);

      const partnerUid = coupleSpace.memberIds?.find(uid => uid !== currentUser.uid);
      if (partnerUid) {
        sendNotification(partnerUid, {
          type: 'boundary',
          title: 'Boundary Needs Review 🔄',
          body: `${currentUserName} marked "${b.title}" for review.`,
          connectionId: coupleSpace.id
        }).catch(console.error);
      }

      if (selectedBoundaryDetail?.id === b.id) {
        setSelectedBoundaryDetail({
          ...b,
          status: 'review',
          history
        });
      }
    } catch (err) {
      console.error("Request review error:", err);
    }
  };

  // Delete Boundary
  const handleConfirmDelete = async () => {
    if (!coupleSpace?.id || !boundaryToDelete?.id) return;

    setIsDeleting(true);
    try {
      const docRef = doc(db, 'couples', coupleSpace.id, 'boundaries', boundaryToDelete.id);
      await deleteDoc(docRef);
      setBoundaryToDelete(null);
      if (selectedBoundaryDetail?.id === boundaryToDelete.id) {
        setSelectedBoundaryDetail(null);
      }
      setSuccessToast("Boundary deleted.");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error("Delete boundary error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter list
  const filteredBoundaries = boundaries.filter(b => {
    const isAgreed = b.status === 'agreed';
    const isDiscussion = b.status === 'discussion' || b.status === 'pending' || b.status === 'discussing';
    const isReview = b.status === 'review';

    if (statusFilter === 'agreed' && !isAgreed) return false;
    if (statusFilter === 'discussion' && !isDiscussion) return false;
    if (statusFilter === 'review' && !isReview) return false;

    if (categoryFilter !== 'All' && (b.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }

    return true;
  });

  return (
    <div className="w-full space-y-5 pb-28 animate-fadeIn text-left">
      {/* SUCCESS TOAST */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* HEADER & CONNECTION CONTEXT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Shield className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Boundaries & Agreements</h2>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span>With: <strong className="text-white">{partnerName}</strong> ({connectionLabel})</span>
              <span>•</span>
              <span className="text-teal-400 font-medium">Clear expectations built together</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreateBoundary}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Boundary</span>
        </button>
      </div>

      {/* STATUS TABS & CATEGORY FILTERS */}
      <div className="space-y-2.5">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-2xl border border-white/5 w-fit">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-zinc-900 border border-white/10 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({boundaries.length})
          </button>
          <button
            onClick={() => setStatusFilter('agreed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              statusFilter === 'agreed'
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 shadow-sm'
                : 'text-zinc-400 hover:text-emerald-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>Agreed ({boundaries.filter(b => b.status === 'agreed').length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('discussion')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              statusFilter === 'discussion'
                ? 'bg-amber-500/20 border border-amber-500/30 text-amber-200 shadow-sm'
                : 'text-zinc-400 hover:text-amber-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>Discussion ({boundaries.filter(b => b.status === 'discussion' || b.status === 'pending' || b.status === 'discussing').length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('review')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              statusFilter === 'review'
                ? 'bg-purple-500/20 border border-purple-500/30 text-purple-200 shadow-sm'
                : 'text-zinc-400 hover:text-purple-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
            <span>Needs Review ({boundaries.filter(b => b.status === 'review').length})</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setCategoryFilter('All')}
            className={`px-3 py-1 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
              categoryFilter === 'All'
                ? 'bg-zinc-900 border border-white/15 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Categories
          </button>
          {BOUNDARY_CATEGORIES.map(cat => (
            <button
              key={cat.name}
              onClick={() => setCategoryFilter(cat.name)}
              className={`px-2.5 py-1 rounded-xl font-medium transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                categoryFilter === cat.name
                  ? 'bg-zinc-900 border border-white/15 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOUNDARIES LISTING */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="p-5 rounded-3xl bg-zinc-900/50 border border-white/5 animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-32 bg-white/10 rounded-md" />
                <div className="h-4 w-20 bg-white/10 rounded-md" />
              </div>
              <div className="h-4 w-full bg-white/5 rounded-md" />
            </div>
          ))}
        </div>
      ) : filteredBoundaries.length === 0 ? (
        /* EMPTY STATE */
        <div className="glass-card rounded-3xl p-8 border border-white/5 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-300">No boundaries yet.</h4>
            <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
              Clear expectations can make important connections easier to navigate.
            </p>
          </div>
          <button
            onClick={handleOpenCreateBoundary}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Boundary</span>
          </button>
        </div>
      ) : (
        /* BOUNDARY CARDS */
        <div className="space-y-3">
          {filteredBoundaries.map((b) => {
            const catInfo = getCategoryInfo(b.category);
            const isAgreed = b.status === 'agreed';
            const isDiscussion = b.status === 'discussion' || b.status === 'pending' || b.status === 'discussing';
            const isReview = b.status === 'review';

            const agreedList = Array.isArray(b.agreedBy) ? b.agreedBy : [];
            const userHasAgreed = currentUser?.uid ? agreedList.includes(currentUser.uid) : false;
            const isCreator = b.createdBy === currentUser?.uid;

            return (
              <div
                key={b.id}
                onClick={() => setSelectedBoundaryDetail(b)}
                className="p-4 rounded-3xl bg-zinc-900/60 border border-white/5 hover:border-white/15 transition-all shadow-md flex flex-col justify-between group space-y-3 cursor-pointer text-left"
              >
                <div className="space-y-2">
                  {/* Top Bar: Category & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${catInfo.badgeClass}`}>
                      <span>{catInfo.icon}</span>
                      <span>{catInfo.label}</span>
                    </span>

                    {/* Subtle Status Badges (Never aggressive red) */}
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 uppercase tracking-wider ${
                      isAgreed
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                        : isReview
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/25'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isAgreed ? 'bg-emerald-400' : isReview ? 'bg-purple-400' : 'bg-amber-400'
                      }`} />
                      <span>{isAgreed ? 'AGREED' : isReview ? 'NEEDS REVIEW' : 'DISCUSSION'}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors leading-snug">
                    {b.title}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                    {b.description || b.details}
                  </p>

                  {/* If discussion note present */}
                  {b.discussionNote && (
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>{b.discussionRequestedByName || 'Partner'}:</strong> "{b.discussionNote}"
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Info & Quick Actions */}
                <div className="pt-2.5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-zinc-500" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {isAgreed ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Agreed by both</span>
                      </span>
                    ) : userHasAgreed ? (
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Waiting for {partnerName} to agree</span>
                      </span>
                    ) : (
                      <span className="text-amber-300 flex items-center gap-1 font-medium">
                        <Info className="w-3.5 h-3.5" />
                        <span>Review and agree when ready</span>
                      </span>
                    )}
                    <span>•</span>
                    <span>Proposed by {isCreator ? 'You' : (b.creatorName || partnerName)}</span>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {/* If user hasn't agreed, show Agree button */}
                    {!userHasAgreed && (
                      <button
                        type="button"
                        onClick={() => handleAgree(b)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                      >
                        <Check className="w-3 h-3" />
                        <span>Agree</span>
                      </button>
                    )}

                    {/* Needs discussion button */}
                    {!isAgreed && (
                      <button
                        type="button"
                        onClick={() => handleOpenDiscussionModal(b)}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold flex items-center gap-1 cursor-pointer"
                        title="Discuss this boundary"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Discuss</span>
                      </button>
                    )}

                    {/* If already agreed: request review */}
                    {isAgreed && (
                      <button
                        type="button"
                        onClick={() => handleRequestReview(b)}
                        className="px-2 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/20 font-semibold flex items-center gap-1 cursor-pointer"
                        title="Request review"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Review</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEditBoundary(b)}
                      className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                      title="Edit boundary"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBoundaryToDelete(b)}
                      className="p-1 rounded text-zinc-400 hover:text-rose-400 transition-colors"
                      title="Delete boundary"
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

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT BOUNDARY */}
      {/* ========================================================================= */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingBoundaryId ? 'Edit Boundary' : 'Add Boundary'}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Private to you and {partnerName}
                </p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveBoundary} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Category <span className="text-teal-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BoundaryCategory)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  {BOUNDARY_CATEGORIES.map(cat => (
                    <option key={cat.name} value={cat.name}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keep private conversations private, Call before visiting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Description <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the boundary, expectations, or how it helps your relationship..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 resize-none leading-relaxed"
                />
              </div>

              <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-200 text-xs leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>
                  Adding a boundary places it in <strong>Discussion</strong>. Once both of you explicitly agree, it becomes <strong>Agreed</strong>.
                </span>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !description.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:opacity-95 text-white text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{isSubmitting ? 'Saving...' : editingBoundaryId ? 'Save Changes' : 'Add Boundary'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEEDS DISCUSSION */}
      {/* ========================================================================= */}
      {discussionModalBoundary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-2xl relative space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Needs Discussion</h3>
                <p className="text-[11px] text-zinc-400">
                  Share what you'd like to clarify with {partnerName}
                </p>
              </div>
              <button
                onClick={() => setDiscussionModalBoundary(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900 border border-white/5 text-xs text-zinc-300">
              <span className="font-semibold text-white">{discussionModalBoundary.title}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                What would you like to discuss? <span className="text-zinc-500 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Can we talk about how this applies on weekends or trips?"
                value={discussionNoteInput}
                onChange={(e) => setDiscussionNoteInput(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setDiscussionModalBoundary(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingDiscussion}
                onClick={handleConfirmRequestDiscussion}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmittingDiscussion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Request Discussion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BOUNDARY DETAILS & HISTORY */}
      {/* ========================================================================= */}
      {selectedBoundaryDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryInfo(selectedBoundaryDetail.category).badgeClass}`}>
                  {getCategoryInfo(selectedBoundaryDetail.category).icon} {getCategoryInfo(selectedBoundaryDetail.category).label}
                </span>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  selectedBoundaryDetail.status === 'agreed'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                    : selectedBoundaryDetail.status === 'review'
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/25'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                }`}>
                  {selectedBoundaryDetail.status}
                </span>
              </div>

              <button
                onClick={() => setSelectedBoundaryDetail(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white leading-snug">
                {selectedBoundaryDetail.title}
              </h3>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {selectedBoundaryDetail.description || selectedBoundaryDetail.details}
              </div>
            </div>

            {/* Discussion note if present */}
            {selectedBoundaryDetail.discussionNote && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Discussion Note from {selectedBoundaryDetail.discussionRequestedByName || 'Partner'}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  "{selectedBoundaryDetail.discussionNote}"
                </p>
              </div>
            )}

            {/* Agreement History */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-teal-400" />
                <span>Agreement History</span>
              </h4>

              <div className="space-y-1.5 p-3 rounded-2xl bg-zinc-900/40 border border-white/5 text-[11px]">
                {selectedBoundaryDetail.history && selectedBoundaryDetail.history.length > 0 ? (
                  selectedBoundaryDetail.history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-zinc-400 py-0.5">
                      <span>
                        {h.action === 'created' && `Proposed by ${h.userName}`}
                        {h.action === 'agreed' && `Agreed by ${h.userName}`}
                        {h.action === 'discussion_requested' && `Discussion requested by ${h.userName}`}
                        {h.action === 'review_requested' && `Marked for review by ${h.userName}`}
                        {h.action === 'updated' && `Updated by ${h.userName}`}
                      </span>
                      <span className="text-zinc-500">{formatDate(h.timestamp)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-zinc-500">Proposed on {formatDate(selectedBoundaryDetail.createdAt)}</div>
                )}
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setBoundaryToDelete(selectedBoundaryDetail)}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Agree Button if not agreed */}
                {currentUser?.uid && !selectedBoundaryDetail.agreedBy?.includes(currentUser.uid) && (
                  <button
                    type="button"
                    onClick={() => handleAgree(selectedBoundaryDetail)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Agree</span>
                  </button>
                )}

                {/* Needs Discussion */}
                {selectedBoundaryDetail.status !== 'agreed' && (
                  <button
                    type="button"
                    onClick={() => handleOpenDiscussionModal(selectedBoundaryDetail)}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Discuss</span>
                  </button>
                )}

                {/* Request Review */}
                {selectedBoundaryDetail.status === 'agreed' && (
                  <button
                    type="button"
                    onClick={() => handleRequestReview(selectedBoundaryDetail)}
                    className="px-3 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/20 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Request Review</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenEditBoundary(selectedBoundaryDetail)}
                  className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {boundaryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xs bg-zinc-950 border border-rose-500/20 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Delete this boundary?</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                This note will be removed from this connection.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setBoundaryToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md flex items-center justify-center gap-1 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
