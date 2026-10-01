import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  MessageSquare, 
  Sparkles, 
  Send, 
  Heart, 
  ChevronRight, 
  ArrowRight, 
  Check, 
  Lock, 
  Users, 
  X, 
  Loader2, 
  Plus, 
  Bookmark, 
  User as UserIcon,
  MessageCircle,
  HelpCircle,
  Clock,
  ArrowLeft,
  ChevronDown
} from 'lucide-react';
import { askTrustlyCoach } from '../lib/gemini';
import { sendNotification } from '../lib/notifications';
import { getConnectionLabel } from '../lib/connection';

interface ConversationItem {
  id?: string;
  createdBy: string;
  creatorName: string;
  content: string;
  category: string;
  visibility: 'private' | 'shared';
  createdAt: string;
  updatedAt?: string;
}

interface ResponseItem {
  id?: string;
  createdBy: string;
  creatorName: string;
  content: string;
  createdAt: string;
}

const CATEGORIES = [
  'Communication',
  'Feelings',
  'Trust',
  'Boundaries',
  'Family',
  'Future',
  'Money',
  'Quality Time',
  'Support',
  'Something Else'
];

const STARTERS = [
  { text: "What is something you wish I understood better?", category: "Communication" },
  { text: "What has been on your mind lately?", category: "Feelings" },
  { text: "What could we do to make our connection stronger?", category: "Quality Time" },
  { text: "Is there anything you want to talk about but haven't known how to start?", category: "Trust" },
  { text: "What is something you appreciate about our connection?", category: "Support" }
];

export const ConversationHub: React.FC = () => {
  const { currentUser, userProfile, partnerProfile, coupleSpace } = useAuth();

  const partnerName = partnerProfile?.displayName || coupleSpace?.creatorName || 'Connection Partner';
  const connectionLabel = coupleSpace ? getConnectionLabel(coupleSpace.connectionType) : 'Connection';

  // Mode: 'hub' | 'compose' | 'detail'
  const [viewMode, setViewMode] = useState<'hub' | 'compose' | 'detail'>('hub');
  const [conversations, setNotifications] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Composer Form state
  const [composerContent, setComposerContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Communication');
  const [composerVisibility, setComposerVisibility] = useState<'private' | 'shared'>('private');
  const [showShareConfirmation, setShowShareConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected detail state
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [newResponseText, setNewResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // AI Coach state
  const [coachInput, setCoachInput] = useState('');
  const [coachAdvice, setCoachAdvice] = useState<string | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(false);

  // Success / error feedbacks
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessSuccessMsg] = useState<string | null>(null);

  // 1. Subscribe to shared conversations inside the connection
  useEffect(() => {
    if (!coupleSpace?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const conversationsCol = collection(db, 'couples', coupleSpace.id, 'conversations');
    const q = query(conversationsCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as ConversationItem));
      setNotifications(items);
      setLoading(false);
    }, (error) => {
      console.error("Shared conversations listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [coupleSpace?.id]);

  // 2. Subscribe to responses when selected conversation changes
  useEffect(() => {
    if (!coupleSpace?.id || !selectedConversation?.id) {
      setResponses([]);
      return;
    }

    setLoadingResponses(true);
    const responsesCol = collection(
      db, 
      'couples', 
      coupleSpace.id, 
      'conversations', 
      selectedConversation.id, 
      'responses'
    );
    const q = query(responsesCol, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as ResponseItem));
      setResponses(items);
      setLoadingResponses(false);
    }, (error) => {
      console.error("Responses listener error:", error);
      setLoadingResponses(false);
    });

    return () => unsubscribe();
  }, [coupleSpace?.id, selectedConversation?.id]);

  // Handle Starter Click
  const handleSelectStarter = (starter: typeof STARTERS[number]) => {
    setComposerContent(starter.text);
    setSelectedCategory(starter.category);
    setComposerVisibility('private'); // Always start private as default safety
    setViewMode('compose');
  };

  // Create Conversation Reflection
  const handleSaveConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid || !composerContent.trim()) return;

    setErrorMsg(null);
    setSuccessSuccessMsg(null);

    // If shared, require confirmation popup
    if (composerVisibility === 'shared' && !showShareConfirmation) {
      setShowShareConfirmation(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const creatorName = userProfile?.displayName || 'Connection Member';

      if (composerVisibility === 'private') {
        // Write to user private collection (owner-only)
        const privateRef = collection(db, 'users', currentUser.uid, 'conversationStarters');
        await addDoc(privateRef, {
          createdBy: currentUser.uid,
          creatorName,
          content: composerContent.trim(),
          category: selectedCategory,
          visibility: 'private',
          createdAt: timestamp
        });

        setSuccessSuccessMsg("Reflection saved securely. Your partner cannot view private reflections.");
        resetForm();
      } else {
        if (!coupleSpace?.id) {
          throw new Error("You must have an active connection to share thoughts.");
        }

        // Write consensually to couples/{coupleId}/conversations/{id}
        const sharedRef = collection(db, 'couples', coupleSpace.id, 'conversations');
        await addDoc(sharedRef, {
          createdBy: currentUser.uid,
          creatorName,
          content: composerContent.trim(),
          category: selectedCategory,
          visibility: 'shared',
          createdAt: timestamp
        });

        // Trigger real notification for partner securely
        const partnerUid = coupleSpace.memberIds?.find(uid => uid !== currentUser.uid);
        if (partnerUid) {
          sendNotification(partnerUid, {
            type: 'shared_note',
            title: 'New Shared Thought 💬',
            body: `${creatorName} shared an intentional thought on "${selectedCategory}".`,
            connectionId: coupleSpace.id
          }).catch(console.error);
        }

        setSuccessSuccessMsg("Thought shared successfully with your connection!");
        resetForm();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to save reflection. Please check your connection.");
    } finally {
      setIsSubmitting(false);
      setShowShareConfirmation(false);
    }
  };

  const resetForm = () => {
    setComposerContent('');
    setSelectedCategory('Communication');
    setComposerVisibility('private');
    setShowShareConfirmation(false);
    setViewMode('hub');
  };

  // Submit Response
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleSpace?.id || !selectedConversation?.id || !newResponseText.trim() || !currentUser?.uid) return;

    setSubmittingResponse(true);
    try {
      const creatorName = userProfile?.displayName || 'Connection Member';
      const timestamp = new Date().toISOString();

      const responsesCol = collection(
        db, 
        'couples', 
        coupleSpace.id, 
        'conversations', 
        selectedConversation.id, 
        'responses'
      );

      await addDoc(responsesCol, {
        createdBy: currentUser.uid,
        creatorName,
        content: newResponseText.trim(),
        createdAt: timestamp
      });

      // Trigger notification to original starter creator
      const targetUid = selectedConversation.createdBy;
      if (targetUid && targetUid !== currentUser.uid) {
        sendNotification(targetUid, {
          type: 'shared_note',
          title: 'New Response 💬',
          body: `${creatorName} replied to your shared thought.`,
          connectionId: coupleSpace.id
        }).catch(console.error);
      }

      setNewResponseText('');
    } catch (err) {
      console.error("Failed to add response:", err);
    } finally {
      setSubmittingResponse(false);
    }
  };

  // Call AI Coach Helper
  const handleAskCoach = async () => {
    if (!coachInput.trim()) return;
    setLoadingCoach(true);
    setCoachAdvice(null);

    try {
      const advice = await askTrustlyCoach({
        userQuery: coachInput.trim(),
        contextMode: 'rewrite_message',
        connectionType: coupleSpace?.connectionType || 'partner',
        personName: partnerName
      });
      setCoachAdvice(advice);
    } catch (err) {
      console.error(err);
      setCoachAdvice("Failed to get response from AI Coach. Please try again.");
    } finally {
      setLoadingCoach(false);
    }
  };

  const handleUseCoachRewrite = () => {
    if (!coachAdvice) return;
    // Extract actual suggestion if formatted nicely, otherwise prefill fully
    setComposerContent(coachAdvice);
    setCoachAdvice(null);
    setCoachInput('');
  };

  return (
    <div className="w-full space-y-6 pb-28 animate-fadeIn">
      {/* HUB HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-rose-400" />
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Conversation Hub</h2>
            <p className="text-[11px] text-zinc-400">
              For: <strong className="text-white">{partnerName}</strong> ({connectionLabel})
            </p>
          </div>
        </div>

        {viewMode !== 'hub' && (
          <button
            onClick={() => {
              setViewMode('hub');
              setSelectedConversation(null);
              setErrorMsg(null);
              setSuccessSuccessMsg(null);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-300 text-xs font-semibold hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessSuccessMsg(null)} className="text-emerald-400">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400">✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE A: MAIN HUB OVERVIEW */}
      {/* ========================================================================= */}
      {viewMode === 'hub' && (
        <div className="space-y-6">
          {/* Start a Conversation CTA */}
          <div className="glass-card rounded-3xl p-5 border border-white/10 relative overflow-hidden shadow-xl space-y-4">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-violet-500/5 pointer-events-none" />
            
            <div className="space-y-1 relative z-10">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>Start an Intentional Conversation</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
                Small steps create big changes. Ask a prompt, reflect, or prepare your thoughts to speak with clarity.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-2 relative z-10">
              <button
                onClick={() => {
                  setComposerContent('');
                  setComposerVisibility('private');
                  setViewMode('compose');
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white font-bold text-xs shadow-lg shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Start a Conversation</span>
              </button>
            </div>
          </div>

          {/* Conversation Starters prompts */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Recommended Conversation Starters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STARTERS.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectStarter(starter)}
                  className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-rose-500/30 text-left transition-all relative overflow-hidden group cursor-pointer shadow-md active:scale-[0.985]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.01] to-transparent pointer-events-none" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full inline-block mb-2">
                    {starter.category}
                  </span>
                  <p className="text-xs text-zinc-200 group-hover:text-white font-medium leading-relaxed">
                    "{starter.text}"
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Shared Thoughts lists */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Shared Thoughts & Topics</h3>
            
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                <span className="text-xs font-mono">Syncing thoughts...</span>
              </div>
            ) : conversations.length === 0 ? (
              /* Calm Empty State */
              <div className="glass-card rounded-3xl p-8 border border-white/5 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-300">No conversations yet.</h4>
                  <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                    Sometimes the hardest part is knowing how to start. Choose a Conversation Starter above or start your own!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {conversations.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedConversation(item);
                      setViewMode('detail');
                    }}
                    className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-white/15 transition-all cursor-pointer shadow-md text-left space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-200 leading-relaxed line-clamp-3">
                      "{item.content}"
                    </p>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>Created by {item.creatorName || (item.createdBy === currentUser?.uid ? 'You' : partnerName)}</span>
                      <span className="text-rose-400 font-semibold flex items-center gap-0.5 group hover:translate-x-0.5 transition-transform">
                        <span>Open Conversation</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE B: mensaje COMPOSER & COACH REWRITE */}
      {/* ========================================================================= */}
      {viewMode === 'compose' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Thought composer */}
            <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-xl text-left space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 pb-2 border-b border-white/5">
                <Bookmark className="w-4 h-4 text-rose-400" />
                <span>Write Your Thought</span>
              </h3>

              <form onSubmit={handleSaveConversation} className="space-y-4">
                {/* Category selection */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Content text */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Share what is on your mind <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={composerContent}
                    onChange={(e) => setComposerContent(e.target.value)}
                    placeholder="Write something you'd like to share..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Visibility choices (Private default safety) */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Visibility <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setComposerVisibility('private')}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        composerVisibility === 'private'
                          ? 'border-rose-500 bg-rose-500/10 text-white'
                          : 'border-white/5 bg-zinc-950/40 text-zinc-400'
                      }`}
                    >
                      <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                      <div className="text-left">
                        <span className="text-xs font-bold block">🔒 Private</span>
                        <span className="text-[9px] block">For your eyes only</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setComposerVisibility('shared')}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        composerVisibility === 'shared'
                          ? 'border-rose-500 bg-rose-500/10 text-white'
                          : 'border-white/5 bg-zinc-950/40 text-zinc-400'
                      }`}
                    >
                      <Users className="w-4 h-4 text-rose-400 shrink-0" />
                      <div className="text-left">
                        <span className="text-xs font-bold block">👥 Shared</span>
                        <span className="text-[9px] block">With {partnerName}</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Confirmation Box inside form if trying to send shared thought */}
                {showShareConfirmation && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2.5 animate-fadeIn">
                    <p className="text-[11px] text-zinc-200 font-medium">
                      Share this thought with <strong className="text-white">{partnerName}</strong>? This will make it visible inside our connection.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowShareConfirmation(false)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 text-[10px] text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[10px] font-bold shadow-md hover:bg-rose-500"
                      >
                        {isSubmitting ? 'Sharing...' : 'Yes, Share'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submitting buttons */}
                {!showShareConfirmation && (
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !composerContent.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-600 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>{composerVisibility === 'private' ? 'Save Private Reflection' : 'Share Thought'}</span>
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* AI Coach Assistant Pane */}
            <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-xl text-left flex flex-col justify-between h-fit min-h-[300px]">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5 pb-2 border-b border-white/5">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span>Ask TRUSTLY Coach</span>
                </h3>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Struggling with wording? Ask the Coach to rewrite your thoughts kindly, clarify feelings, or find non-accusatory "I" phrases.
                </p>

                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={coachInput}
                    onChange={(e) => setCoachInput(e.target.value)}
                    placeholder="e.g. Help me rephrase this kindly: I am mad that you are ignoring my messages."
                    className="w-full bg-zinc-950/80 border border-white/5 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  />
                  <button
                    onClick={handleAskCoach}
                    disabled={loadingCoach || !coachInput.trim()}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loadingCoach ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Consulting Coach...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ask TRUSTLY Coach</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Display coach advice response */}
                {coachAdvice && (
                  <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-xs leading-relaxed space-y-3 animate-fadeIn">
                    <p className="text-zinc-200 whitespace-pre-wrap">{coachAdvice}</p>
                    <button
                      onClick={handleUseCoachRewrite}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-[10px] font-bold text-white transition-all"
                    >
                      Use this in my message
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE C: DETAIL VIEW WITH RESPONSES */}
      {/* ========================================================================= */}
      {viewMode === 'detail' && selectedConversation && (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Main Thought card */}
          <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-xl text-left space-y-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/[0.02] to-violet-500/[0.02] pointer-events-none" />

            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                Topic: {selectedConversation.category}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {selectedConversation.createdAt ? new Date(selectedConversation.createdAt).toLocaleDateString() : 'Recent'}
              </span>
            </div>

            <p className="text-sm text-zinc-100 font-medium leading-relaxed whitespace-pre-wrap">
              "{selectedConversation.content}"
            </p>

            <div className="text-[10px] text-zinc-400 flex items-center justify-between">
              <span>Shared by: <strong className="text-white">{selectedConversation.creatorName || (selectedConversation.createdBy === currentUser?.uid ? 'You' : partnerName)}</strong></span>
              <span className="text-zinc-500 font-mono italic">Shared with Connection</span>
            </div>
          </div>

          {/* Responses conversation segment */}
          <div className="space-y-3 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-rose-400" />
              <span>Responses</span>
            </h3>

            {loadingResponses ? (
              <div className="py-8 text-center text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin text-rose-500 mx-auto mb-1" />
                <span className="text-xs font-mono">Syncing replies...</span>
              </div>
            ) : responses.length === 0 ? (
              <div className="p-5 rounded-2xl bg-zinc-900/40 border border-white/5 text-center text-xs text-zinc-400">
                No replies yet. Speak intentionally when you are both ready.
              </div>
            ) : (
              <div className="space-y-3">
                {responses.map((reply) => {
                  const isSelf = reply.createdBy === currentUser?.uid;
                  return (
                    <div
                      key={reply.id}
                      className={`p-3.5 rounded-2xl border max-w-[85%] text-left space-y-1 ${
                        isSelf 
                          ? 'border-rose-500/20 bg-rose-500/[0.02] ml-auto' 
                          : 'border-white/5 bg-zinc-900/60 mr-auto'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className={`text-[10px] font-bold uppercase ${isSelf ? 'text-rose-400' : 'text-zinc-300'}`}>
                          {reply.creatorName || (isSelf ? 'You' : partnerName)}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono shrink-0">
                          {reply.createdAt ? new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {reply.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Response composer box */}
          <form onSubmit={handleSubmitResponse} className="pt-2 border-t border-white/5 flex gap-2">
            <input
              type="text"
              required
              value={newResponseText}
              onChange={(e) => setNewResponseText(e.target.value)}
              placeholder="Write a response..."
              className="flex-1 bg-zinc-950 border border-white/10 focus:border-rose-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={submittingResponse || !newResponseText.trim()}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer shrink-0"
            >
              {submittingResponse ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
