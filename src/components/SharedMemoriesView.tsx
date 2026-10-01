import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useActiveConnection } from '../context/ActiveConnectionContext';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query 
} from 'firebase/firestore';
import { db, uploadMemoryImage, deleteMemoryImage } from '../lib/firebase';
import { addActivityEvent } from '../lib/activity';
import { SharedMemory, ConnectionItem } from '../types';
import { validateImageFile, optimizeImageFile } from '../lib/imageOptimizer';
import { sendPartnerNotification } from '../lib/notifications';
import { InitialsAvatar } from './InitialsAvatar';
import { TrustlyImage } from './TrustlyImage';
import { 
  Camera, 
  Plus, 
  Search, 
  X, 
  ArrowUpDown, 
  Calendar, 
  Edit3, 
  Trash2, 
  Users, 
  Lock, 
  ChevronRight, 
  Loader2, 
  AlertCircle, 
  Image as ImageIcon, 
  Sparkles,
  Check,
  Upload,
  RefreshCw,
  Eye
} from 'lucide-react';

interface SharedMemoriesViewProps {
  onBackToOverview?: () => void;
  className?: string;
}

type MemorySortOption = 'newest' | 'oldest' | 'recently_added';

export const SharedMemoriesView: React.FC<SharedMemoriesViewProps> = ({
  onBackToOverview,
  className = ''
}) => {
  const { currentUser, userProfile } = useAuth();
  const { 
    activeConnection, 
    activeConnectionId, 
    activeCoupleSpace 
  } = useActiveConnection();

  const [memories, setMemories] = useState<SharedMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Search & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<MemorySortOption>('newest');

  // Modals & Viewer
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<SharedMemory | null>(null);
  const [editingMemory, setEditingMemory] = useState<SharedMemory | null>(null);
  const [deletingMemory, setDeletingMemory] = useState<SharedMemory | null>(null);

  // Form State for Add / Edit
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formPreviewUrl, setFormPreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'optimizing' | 'uploading' | 'saving' | 'done'>('idle');

  const connectionId = activeConnectionId || activeCoupleSpace?.id || null;
  const connectionName = activeConnection?.displayName || activeCoupleSpace?.creatorName || 'Your Connection';
  const relationshipType = activeConnection?.relationshipType || 'Connection';
  const partnerProfile = activeConnection?.partner || null;

  // 1. Real-time Firestore Listener for the Active Connection's Shared Memories
  useEffect(() => {
    if (!connectionId) {
      setMemories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorBanner(null);

    const memoriesCol = collection(db, 'couples', connectionId, 'memories');
    const unsub = onSnapshot(
      memoriesCol,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SharedMemory));
        setMemories(items);
        setLoading(false);
      },
      (err) => {
        console.error('Shared memories listener error:', err);
        setErrorBanner('Unable to load shared memories.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [connectionId]);

  // 2. Keyboard Escape listener for Lightbox Viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedMemory) setSelectedMemory(null);
        if (isAddModalOpen) setIsAddModalOpen(false);
        if (editingMemory) setEditingMemory(false as any);
        if (deletingMemory) setDeletingMemory(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMemory, isAddModalOpen, editingMemory, deletingMemory]);

  // 3. Filtered & Sorted Memories
  const displayedMemories = useMemo(() => {
    let list = [...memories];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => 
        m.title.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      const dateA = new Date(a.memoryDate || a.date || a.createdAt).getTime();
      const dateB = new Date(b.memoryDate || b.date || b.createdAt).getTime();

      if (sortBy === 'newest') {
        return dateB - dateA;
      }
      if (sortBy === 'oldest') {
        return dateA - dateB;
      }
      if (sortBy === 'recently_added') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return list;
  }, [memories, searchQuery, sortBy]);

  // 4. Handle Photo Selection with Validation & Client Optimization
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormError(null);
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setFormError(validation.error || 'Please select a valid JPG, PNG, or WebP image under 5MB.');
      return;
    }

    try {
      setUploadProgress('optimizing');
      const optimized = await optimizeImageFile(file, 1600, 0.85);
      setFormImageFile(optimized);
      const preview = URL.createObjectURL(optimized);
      setFormPreviewUrl(preview);
      setUploadProgress('idle');
    } catch (err) {
      console.warn('Image optimization notice:', err);
      setFormImageFile(file);
      setFormPreviewUrl(URL.createObjectURL(file));
      setUploadProgress('idle');
    }
  };

  const handleOpenAddModal = () => {
    setFormTitle('');
    setFormDesc('');
    setFormDate('');
    setFormImageFile(null);
    setFormPreviewUrl(null);
    setFormError(null);
    setUploadProgress('idle');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (mem: SharedMemory) => {
    setEditingMemory(mem);
    setFormTitle(mem.title || '');
    setFormDesc(mem.description || '');
    setFormDate(mem.memoryDate || mem.date || '');
    setFormImageFile(null);
    setFormPreviewUrl(mem.imageUrl || mem.photoURL || null);
    setFormError(null);
    setUploadProgress('idle');
    if (selectedMemory) setSelectedMemory(null);
  };

  // 5. Submit Add Memory
  const handleSaveAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectionId || !currentUser?.uid) return;

    if (!formTitle.trim()) {
      setFormError('Memory title is required.');
      return;
    }

    if (!formImageFile && !formPreviewUrl) {
      setFormError('A photo is required for shared memories.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const memoryId = `mem_${Date.now()}`;
    let finalImageUrl = '';
    let storagePath = '';

    try {
      if (formImageFile) {
        setUploadProgress('uploading');
        const uploadRes = await uploadMemoryImage(connectionId, memoryId, formImageFile);
        finalImageUrl = uploadRes.downloadUrl;
        storagePath = uploadRes.storagePath;
      } else {
        finalImageUrl = formPreviewUrl || '';
      }

      setUploadProgress('saving');
      const memoryDocRef = doc(db, 'couples', connectionId, 'memories', memoryId);
      const newMemory: SharedMemory = {
        id: memoryId,
        coupleId: connectionId,
        connectionId,
        createdBy: currentUser.uid,
        creatorName: userProfile?.displayName || currentUser.displayName || 'Partner',
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        date: formDate.trim() || undefined,
        memoryDate: formDate.trim() || undefined,
        imageUrl: finalImageUrl,
        photoURL: finalImageUrl,
        storagePath: storagePath || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(memoryDocRef, newMemory);

      // Add timeline event
      await addActivityEvent(connectionId, {
        type: 'MEMORY_CREATED',
        actorId: currentUser.uid,
        relatedId: memoryId,
        title: 'New shared memory added',
        description: `"${formTitle.trim()}"`
      });

      // Notify partner
      if (partnerProfile?.uid) {
        try {
          await sendPartnerNotification(
            partnerProfile.uid,
            'New Shared Memory',
            `${userProfile?.displayName || 'Your connection'} added "${formTitle.trim()}" to your shared memories.`,
            'shared_memory'
          );
        } catch (nErr) {
          console.warn('Could not send notification:', nErr);
        }
      }

      setUploadProgress('done');
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create shared memory:', err);
      setFormError('Unable to upload this memory. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('idle');
    }
  };

  // 6. Submit Edit Memory
  const handleSaveEditMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectionId || !editingMemory?.id || !currentUser?.uid) return;

    if (!formTitle.trim()) {
      setFormError('Memory title is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    let finalImageUrl = editingMemory.imageUrl || editingMemory.photoURL || '';
    let newStoragePath = editingMemory.storagePath || '';
    const oldStoragePath = editingMemory.storagePath;

    try {
      // If user provided a new image file, upload it first
      if (formImageFile) {
        setUploadProgress('uploading');
        const uploadRes = await uploadMemoryImage(connectionId, editingMemory.id, formImageFile);
        finalImageUrl = uploadRes.downloadUrl;
        newStoragePath = uploadRes.storagePath;
      }

      setUploadProgress('saving');
      const memoryDocRef = doc(db, 'couples', connectionId, 'memories', editingMemory.id);
      await updateDoc(memoryDocRef, {
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        date: formDate.trim() || undefined,
        memoryDate: formDate.trim() || undefined,
        imageUrl: finalImageUrl,
        photoURL: finalImageUrl,
        storagePath: newStoragePath || undefined,
        updatedAt: new Date().toISOString()
      });

      // Cleanup old storage file if replaced
      if (formImageFile && oldStoragePath && oldStoragePath !== newStoragePath) {
        try {
          await deleteMemoryImage(oldStoragePath);
        } catch (e) {
          console.warn('Could not clean up old storage file:', e);
        }
      }

      setEditingMemory(null);
    } catch (err: any) {
      console.error('Failed to update memory:', err);
      setFormError('Unable to update this memory. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('idle');
    }
  };

  // 7. Handle Delete Memory
  const handleConfirmDelete = async () => {
    if (!connectionId || !deletingMemory?.id) return;

    setIsSubmitting(true);
    try {
      const memoryDocRef = doc(db, 'couples', connectionId, 'memories', deletingMemory.id);
      await deleteDoc(memoryDocRef);

      // Clean up storage image if exists
      if (deletingMemory.storagePath) {
        await deleteMemoryImage(deletingMemory.storagePath);
      } else if (deletingMemory.imageUrl) {
        await deleteMemoryImage(deletingMemory.imageUrl);
      }

      setDeletingMemory(null);
      if (selectedMemory?.id === deletingMemory.id) {
        setSelectedMemory(null);
      }
    } catch (err: any) {
      console.error('Failed to delete memory:', err);
      setErrorBanner('Failed to delete memory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  if (!connectionId) {
    return (
      <div className={`w-full space-y-4 py-8 text-center ${className}`}>
        <p className="text-xs text-zinc-400">Please select a connection to view shared memories.</p>
      </div>
    );
  }

  return (
    <div className={`w-full space-y-6 pb-28 animate-fadeIn ${className}`}>
      {/* 1. Header & Connection Indicator */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">Shared Memories</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Keep the moments that matter.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Connection Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-900 border border-white/10 text-xs">
            <InitialsAvatar
              name={connectionName}
              photoURL={partnerProfile?.photoURL}
              size="xs"
            />
            <div className="flex flex-col text-left">
              <span className="font-bold text-white leading-tight truncate max-w-[130px]">
                {connectionName}
              </span>
              <span className="text-[10px] text-zinc-400 -mt-0.5">
                {relationshipType}
              </span>
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-xs shadow-lg shadow-violet-500/20 hover:opacity-95 active:scale-[0.985] cursor-pointer flex items-center gap-1.5 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Memory</span>
          </button>
        </div>
      </div>

      {/* Privacy Notice Bar */}
      <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400 shrink-0" />
          <span>
            Shared with <strong>{connectionName}</strong> · Only members of this connection can access these memories.
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-400 shrink-0">
          <Lock className="w-3.5 h-3.5" />
          <span>Private</span>
        </div>
      </div>

      {/* Error banner if any */}
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

      {/* 2. Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories by title or description..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-white placeholder:text-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-violet-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as MemorySortOption)}
              aria-label="Sort memories"
              className="appearance-none py-3 pl-9 pr-8 rounded-2xl bg-zinc-900 border border-white/10 text-zinc-200 text-xs font-semibold focus:outline-none focus:border-violet-500 cursor-pointer transition-all"
            >
              <option value="newest">Newest Date</option>
              <option value="oldest">Oldest Date</option>
              <option value="recently_added">Recently Added</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Responsive Memories Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-2xl bg-zinc-900/60 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : displayedMemories.length === 0 ? (
        /* Empty State */
        <div className="glass-card rounded-3xl p-8 sm:p-10 border border-white/10 text-center space-y-4 my-4 animate-scaleUp">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600/20 via-purple-600/20 to-pink-600/20 border border-violet-500/30 text-violet-400 flex items-center justify-center mx-auto shadow-xl">
            <Camera className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-1">
              {searchQuery ? `No memories matching "${searchQuery}"` : 'Your shared memories will appear here.'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? 'Try searching by a different keyword or clear the search filter.'
                : 'Save photos and moments you want to keep together with this connection.'}
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-2">
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-semibold hover:bg-zinc-800 cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={handleOpenAddModal}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-xs shadow-lg shadow-violet-500/20 hover:opacity-95 active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Memory</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
          {displayedMemories.map((mem) => {
            const photoSrc = mem.imageUrl || mem.photoURL;
            const dateStr = formatDisplayDate(mem.memoryDate || mem.date || mem.createdAt);

            return (
              <div
                key={mem.id}
                onClick={() => setSelectedMemory(mem)}
                className="group relative rounded-2xl overflow-hidden bg-zinc-900/80 border border-white/10 hover:border-violet-500/50 transition-all duration-300 shadow-lg cursor-pointer flex flex-col justify-between"
              >
                {/* Photo container */}
                <div className="relative aspect-square w-full overflow-hidden bg-zinc-950">
                  {photoSrc ? (
                    <TrustlyImage
                      src={photoSrc}
                      alt={mem.title}
                      aspectRatio="1:1"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      fallbackType="generic"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-1 bg-zinc-900/50">
                      <ImageIcon className="w-6 h-6" />
                      <span className="text-[10px]">Image unavailable</span>
                    </div>
                  )}

                  {/* Gradient shadow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Date badge on top */}
                  {dateStr && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-200">
                      {dateStr}
                    </div>
                  )}

                  {/* Title & Info on bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-violet-200 transition-colors truncate">
                      {mem.title}
                    </h4>
                    {mem.description && (
                      <p className="text-[11px] text-zinc-300 line-clamp-1 opacity-90">
                        {mem.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. FULL-SCREEN / LIGHTBOX VIEWER */}
      {/* ===================================================================== */}
      {selectedMemory && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedMemory(null)}
        >
          <div 
            className="relative w-full max-w-2xl bg-zinc-950 border border-white/15 rounded-3xl overflow-hidden shadow-2xl space-y-4 animate-scaleUp max-h-[92vh] flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <InitialsAvatar
                  name={selectedMemory.creatorName}
                  size="sm"
                />
                <div className="truncate">
                  <span className="text-xs font-bold text-white block truncate">
                    {selectedMemory.title}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    Shared by {selectedMemory.creatorName || 'Connection'} · {formatDisplayDate(selectedMemory.memoryDate || selectedMemory.date || selectedMemory.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleOpenEditModal(selectedMemory)}
                  className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                  title="Edit Memory"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setDeletingMemory(selectedMemory);
                  }}
                  className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                  title="Delete Memory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Close Viewer (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lightbox Image Container */}
            <div className="flex-1 overflow-y-auto px-4 flex flex-col items-center justify-center min-h-[250px] max-h-[60vh]">
              {selectedMemory.imageUrl || selectedMemory.photoURL ? (
                <img
                  src={selectedMemory.imageUrl || selectedMemory.photoURL}
                  alt={selectedMemory.title}
                  className="max-h-[55vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/5"
                />
              ) : (
                <div className="w-48 h-48 rounded-2xl bg-zinc-900 border border-white/10 flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs">Image unavailable</span>
                </div>
              )}
            </div>

            {/* Lightbox Description Footer */}
            {selectedMemory.description && (
              <div className="p-4 border-t border-white/10 bg-zinc-950/80">
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed max-h-24 overflow-y-auto pr-1">
                  {selectedMemory.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. ADD MEMORY MODAL */}
      {/* ===================================================================== */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => !isSubmitting && setIsAddModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">Add Shared Memory</h2>
                <p className="text-xs text-zinc-400">Save a moment to your connection space</p>
              </div>
              <button
                onClick={() => !isSubmitting && setIsAddModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveAddMemory} className="space-y-4">
              {/* Photo Input (Required) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Photo <span className="text-rose-400">*</span>
                </label>

                {formPreviewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-zinc-900 border border-white/10 group">
                    <img
                      src={formPreviewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormImageFile(null);
                        setFormPreviewUrl(null);
                      }}
                      className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-white/15 hover:border-violet-500/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 bg-zinc-900/40 hover:bg-zinc-900/80 cursor-pointer transition-all">
                    <Upload className="w-6 h-6 text-violet-400" />
                    <span className="text-xs font-bold text-white">Click or drag photo here</span>
                    <span className="text-[10px] text-zinc-400">JPG, PNG, or WebP up to 5MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handlePhotoSelect}
                      className="sr-only"
                      required
                    />
                  </label>
                )}
              </div>

              {/* Title (Required) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Afternoon Coffee, Road Trip to the Coast"
                  maxLength={80}
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 text-sm transition-all"
                  required
                />
              </div>

              {/* Date (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Date <span className="text-zinc-500 text-[10px] font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 text-sm transition-all"
                />
              </div>

              {/* Description (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Description <span className="text-zinc-500 text-[10px] font-normal">(Optional)</span>
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What made this moment special?"
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 text-sm transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-300 text-xs font-semibold hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-bold shadow-lg shadow-violet-500/20 hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{uploadProgress === 'uploading' ? 'Uploading photo...' : 'Saving memory...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Memory</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. EDIT MEMORY MODAL */}
      {/* ===================================================================== */}
      {editingMemory && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => !isSubmitting && setEditingMemory(null)}
        >
          <div 
            className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">Edit Memory</h2>
                <p className="text-xs text-zinc-400">Update memory details</p>
              </div>
              <button
                onClick={() => !isSubmitting && setEditingMemory(null)}
                className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEditMemory} className="space-y-4">
              {/* Optional replace photo */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Photo
                </label>
                {formPreviewUrl && (
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-zinc-900 border border-white/10 mb-2">
                    <img
                      src={formPreviewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:border-violet-500/40 text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5 text-violet-400" />
                  <span>Replace Photo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handlePhotoSelect}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  maxLength={80}
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 text-sm transition-all"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 text-sm transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 text-sm transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setEditingMemory(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-300 text-xs font-semibold hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-bold shadow-lg shadow-violet-500/20 hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. DELETE CONFIRMATION MODAL */}
      {/* ===================================================================== */}
      {deletingMemory && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => !isSubmitting && setDeletingMemory(null)}
        >
          <div 
            className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Delete this memory?</h2>
                  <p className="text-xs text-zinc-400 truncate max-w-[200px]">
                    {deletingMemory.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isSubmitting && setDeletingMemory(null)}
                className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Everyone in this connection will lose access to this shared memory.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingMemory(null)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-300 text-xs font-semibold hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Memory</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
