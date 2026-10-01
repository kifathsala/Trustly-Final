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
import { SharedNote, SharedNoteCategory } from '../types';
import { 
  StickyNote, 
  Plus, 
  Search, 
  X, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  Users, 
  Check, 
  Clock, 
  ArrowUpDown, 
  Tag,
  FileText
} from 'lucide-react';
import { sendNotification } from '../lib/notifications';
import { getConnectionLabel } from '../lib/connection';

const CATEGORIES: { name: SharedNoteCategory; badgeClass: string; icon: string }[] = [
  { name: 'General', badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/25', icon: '📝' },
  { name: 'Plans', badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/25', icon: '🗺' },
  { name: 'Tasks', badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25', icon: '✅' },
  { name: 'Ideas', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/25', icon: '💡' },
  { name: 'Important', badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/25', icon: '⭐' },
  { name: 'Other', badgeClass: 'bg-zinc-800 text-zinc-300 border-white/10', icon: '📌' },
];

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Just now';
  const timestamp = new Date(dateString).getTime();
  if (isNaN(timestamp)) return 'Recently';

  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: new Date(dateString).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

function getCategoryInfo(catName?: string) {
  const matched = CATEGORIES.find(c => c.name.toLowerCase() === (catName || 'general').toLowerCase());
  return matched || CATEGORIES[0];
}

export const SharedNotesView: React.FC = () => {
  const { currentUser, userProfile, partnerProfile, coupleSpace } = useAuth();

  const partnerName = partnerProfile?.displayName || coupleSpace?.creatorName || 'Connection Partner';
  const connectionLabel = coupleSpace ? getConnectionLabel(coupleSpace.connectionType) : 'Connection';

  // Notes state
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'updated' | 'newest' | 'oldest'>('updated');

  // Form modal state (Create / Edit)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<SharedNoteCategory>('General');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Detail modal state
  const [selectedNoteDetail, setSelectedNoteDetail] = useState<SharedNote | null>(null);

  // Delete modal state
  const [noteToDelete, setNoteToDelete] = useState<SharedNote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Real-time listener on couples/{coupleId}/sharedNotes
  useEffect(() => {
    if (!coupleSpace?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const notesCol = collection(db, 'couples', coupleSpace.id, 'sharedNotes');
    const q = query(notesCol);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as SharedNote));
      setNotes(items);
      setLoading(false);
    }, (err) => {
      console.error("Shared notes listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [coupleSpace?.id]);

  // Form handlers
  const handleOpenCreateNote = () => {
    setEditingNoteId(null);
    setTitle('');
    setContent('');
    setCategory('General');
    setErrorMsg(null);
    setShowFormModal(true);
  };

  const handleOpenEditNote = (note: SharedNote) => {
    setEditingNoteId(note.id || null);
    setTitle(note.title || '');
    setContent(note.content || '');
    setCategory((note.category as SharedNoteCategory) || 'General');
    setErrorMsg(null);
    setShowFormModal(true);
    // If detail modal is open, close it
    setSelectedNoteDetail(null);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid || !coupleSpace?.id || !title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const noteId = editingNoteId || `note_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const currentUserName = userProfile?.displayName || 'Connection Member';

    try {
      const noteDocRef = doc(db, 'couples', coupleSpace.id, 'sharedNotes', noteId);

      if (editingNoteId) {
        await updateDoc(noteDocRef, {
          title: title.trim(),
          content: content.trim(),
          category,
          updatedAt: timestamp,
          updatedBy: currentUser.uid,
          updatedByName: currentUserName
        });
        setSuccessToast("Note updated.");
      } else {
        const newNote: SharedNote = {
          id: noteId,
          coupleId: coupleSpace.id,
          createdBy: currentUser.uid,
          creatorName: currentUserName,
          title: title.trim(),
          content: content.trim(),
          category,
          createdAt: timestamp,
          updatedAt: timestamp,
          updatedBy: currentUser.uid,
          updatedByName: currentUserName
        };

        await setDoc(noteDocRef, newNote);
        setSuccessToast("Note created.");

        // Notify partner gracefully
        const partnerUid = coupleSpace.memberIds?.find(uid => uid !== currentUser.uid);
        if (partnerUid) {
          sendNotification(partnerUid, {
            type: 'note',
            title: 'New Shared Note 📝',
            body: `${currentUserName} added "${title.trim()}" to shared notes.`,
            connectionId: coupleSpace.id
          }).catch(console.error);
        }
      }

      setShowFormModal(false);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      console.error("Save shared note error:", err);
      setErrorMsg(err.message || "Failed to save note. Please check permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!coupleSpace?.id || !noteToDelete?.id) return;

    setIsDeleting(true);
    try {
      const noteDocRef = doc(db, 'couples', coupleSpace.id, 'sharedNotes', noteToDelete.id);
      await deleteDoc(noteDocRef);
      setNoteToDelete(null);
      if (selectedNoteDetail?.id === noteToDelete.id) {
        setSelectedNoteDetail(null);
      }
    } catch (err) {
      console.error("Delete shared note error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter & Sort
  const filteredNotes = notes
    .filter(n => {
      // Category filter
      if (selectedCategoryFilter !== 'All' && (n.category || 'General').toLowerCase() !== selectedCategoryFilter.toLowerCase()) {
        return false;
      }
      // Search query filter (title and content)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (n.title || '').toLowerCase().includes(q);
        const matchesContent = (n.content || '').toLowerCase().includes(q);
        return matchesTitle || matchesContent;
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      const createA = new Date(a.createdAt).getTime();
      const createB = new Date(b.createdAt).getTime();

      if (sortBy === 'updated') {
        return timeB - timeA;
      }
      if (sortBy === 'newest') {
        return createB - createA;
      }
      if (sortBy === 'oldest') {
        return createA - createB;
      }
      return 0;
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
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <StickyNote className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Shared Notes</h2>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span>With: <strong className="text-white">{partnerName}</strong> ({connectionLabel})</span>
              <span>•</span>
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>Shared with {partnerName}</span>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreateNote}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* SEARCH & CONTROLS TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="updated">Recently updated</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* CATEGORY FILTER PILLS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setSelectedCategoryFilter('All')}
          className={`px-3 py-1 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
            selectedCategoryFilter === 'All'
              ? 'bg-zinc-900 border border-white/15 text-white font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          All ({notes.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = notes.filter(n => (n.category || 'General').toLowerCase() === cat.name.toLowerCase()).length;
          return (
            <button
              key={cat.name}
              onClick={() => setSelectedCategoryFilter(cat.name)}
              className={`px-2.5 py-1 rounded-xl font-medium transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                selectedCategoryFilter === cat.name
                  ? 'bg-zinc-900 border border-white/15 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              {count > 0 && <span className="text-[10px] text-zinc-500">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* NOTES LISTING */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="p-4 rounded-3xl bg-zinc-900/50 border border-white/5 animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-white/10 rounded-md" />
                <div className="h-3 w-16 bg-white/10 rounded-md" />
              </div>
              <div className="h-5 w-3/4 bg-white/10 rounded-md" />
              <div className="h-3 w-full bg-white/5 rounded-md" />
              <div className="h-3 w-2/3 bg-white/5 rounded-md" />
            </div>
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        /* EMPTY STATE */
        <div className="glass-card rounded-3xl p-8 border border-white/5 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-300">
              {searchQuery ? 'No notes match your search.' : 'No shared notes yet.'}
            </h4>
            <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
              {searchQuery 
                ? 'Try a different keyword or clear the search filter.' 
                : 'Keep plans, ideas, and important things together in one private shared place.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={handleOpenCreateNote}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Note</span>
            </button>
          )}
        </div>
      ) : (
        /* NOTES GRID */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredNotes.map((note) => {
            const catInfo = getCategoryInfo(note.category);
            const isCreator = note.createdBy === currentUser?.uid;
            const updatedTime = formatRelativeTime(note.updatedAt || note.createdAt);
            const updaterName = note.updatedByName || (note.updatedBy === currentUser?.uid ? 'You' : (note.creatorName || partnerName));

            return (
              <div
                key={note.id}
                onClick={() => setSelectedNoteDetail(note)}
                className="p-4 rounded-3xl bg-zinc-900/60 border border-white/5 hover:border-white/15 transition-all shadow-md flex flex-col justify-between group space-y-3 cursor-pointer text-left"
              >
                <div className="space-y-2">
                  {/* Category and Shared Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${catInfo.badgeClass}`}>
                      <span>{catInfo.icon}</span>
                      <span>{catInfo.name}</span>
                    </span>

                    <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1">
                      <Users className="w-3 h-3 text-amber-400/80" />
                      <span>Shared with {partnerName}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                    {note.title}
                  </h4>

                  {/* Content Preview */}
                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>

                {/* Footer Toolbar */}
                <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Updated {updatedTime} by {updaterName}</span>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditNote(note)}
                      className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                      title="Edit note"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteToDelete(note)}
                      className="p-1 rounded text-zinc-400 hover:text-rose-400 transition-colors"
                      title="Delete note"
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
      {/* MODAL: CREATE / EDIT SHARED NOTE */}
      {/* ========================================================================= */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingNoteId ? 'Edit Shared Note' : 'New Shared Note'}
                </h3>
                <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                  <Users className="w-3 h-3 text-amber-400" />
                  <span>Shared with {partnerName}</span>
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

            <form onSubmit={handleSaveNote} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trip Plans, Things to remember, Project ideas"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Category <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button
                      type="button"
                      key={cat.name}
                      onClick={() => setCategory(cat.name)}
                      className={`p-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        category === cat.name
                          ? 'bg-amber-500/20 border-amber-500 text-white font-semibold'
                          : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-[10px]">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Content <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="Write your note, plans, tasks, or list here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                />
              </div>

              {/* Submit Buttons */}
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
                  disabled={isSubmitting || !title.trim() || !content.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-95 text-white text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{isSubmitting ? 'Saving...' : editingNoteId ? 'Save Changes' : 'Create Note'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOTE DETAILS VIEW */}
      {/* ========================================================================= */}
      {selectedNoteDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryInfo(selectedNoteDetail.category).badgeClass}`}>
                  {getCategoryInfo(selectedNoteDetail.category).icon} {getCategoryInfo(selectedNoteDetail.category).name}
                </span>
                <span className="text-[10px] font-medium text-zinc-400 flex items-center gap-1">
                  <Users className="w-3 h-3 text-amber-400" />
                  <span>Shared with {partnerName}</span>
                </span>
              </div>

              <button
                onClick={() => setSelectedNoteDetail(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Note Title */}
            <h3 className="text-lg font-bold text-white leading-snug">
              {selectedNoteDetail.title}
            </h3>

            {/* Note Content */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {selectedNoteDetail.content}
            </div>

            {/* Timestamps and Author metadata */}
            <div className="p-3 rounded-2xl bg-zinc-900/30 border border-white/5 text-[11px] text-zinc-400 space-y-1">
              <div>Created by {selectedNoteDetail.creatorName || (selectedNoteDetail.createdBy === currentUser?.uid ? 'You' : partnerName)} on {new Date(selectedNoteDetail.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div>Last updated {formatRelativeTime(selectedNoteDetail.updatedAt || selectedNoteDetail.createdAt)} by {selectedNoteDetail.updatedByName || (selectedNoteDetail.updatedBy === currentUser?.uid ? 'You' : partnerName)}</div>
            </div>

            {/* Actions Toolbar */}
            <div className="pt-2 flex items-center justify-between border-t border-white/5">
              <button
                type="button"
                onClick={() => setNoteToDelete(selectedNoteDetail)}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedNoteDetail(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditNote(selectedNoteDetail)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Note</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xs bg-zinc-950 border border-rose-500/20 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Delete this shared note?</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                This note will be removed from this connection.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setNoteToDelete(null)}
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
                <span>Delete Note</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
