import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CoupleGoal, CoupleGoalCategory } from '../types';
import { sendPartnerNotification } from '../lib/notifications';
import { 
  X, 
  Sparkles, 
  Check, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Trash2, 
  Edit3, 
  ArrowRight, 
  ArrowLeft, 
  Trophy, 
  Heart, 
  Plus, 
  Info, 
  AlertTriangle,
  Loader2,
  PartyPopper
} from 'lucide-react';

interface CoupleGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'list' | 'create';
  initialTab?: 'active' | 'milestones';
}

const CATEGORIES: { name: CoupleGoalCategory; icon: string; desc: string }[] = [
  { name: 'Quality Time', icon: '❤️', desc: 'Date nights, phone-free time, and dedicated presence' },
  { name: 'Communication', icon: '💬', desc: 'Active listening, weekly check-ins, and openness' },
  { name: 'Health & Wellness', icon: '🌱', desc: 'Daily walks, healthy habits, and physical wellness' },
  { name: 'Travel', icon: '✈️', desc: 'Weekend getaways, dream trips, and exploring new places' },
  { name: 'Finance', icon: '💰', desc: 'Saving together, budgeting, or shared investments' },
  { name: 'Personal Growth', icon: '📚', desc: 'Reading, learning new skills, or spiritual growth' },
  { name: 'Future Plans', icon: '🎯', desc: 'Home, career milestones, or shared life steps' },
  { name: 'Something Else', icon: '✨', desc: 'Any other meaningful aspiration for the two of you' },
];

export const CoupleGoalsModal: React.FC<CoupleGoalsModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'list',
  initialTab = 'active'
}) => {
  const { userProfile, partnerProfile, coupleSpace } = useAuth();

  const [activeTab, setActiveTab] = useState<'active' | 'milestones'>(initialTab);
  const [isCreating, setIsCreating] = useState<boolean>(initialMode === 'create');
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states for creating / editing
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CoupleGoalCategory>('Quality Time');
  const [goalTitle, setGoalTitle] = useState<string>('');
  const [goalDescription, setGoalDescription] = useState<string>('');
  const [hasDeadline, setHasDeadline] = useState<boolean>(false);
  const [goalDeadline, setGoalDeadline] = useState<string>('');

  // Real-time goals list
  const [goals, setGoals] = useState<CoupleGoal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Detail & Delete Dialog state
  const [selectedGoalDetail, setSelectedGoalDetail] = useState<CoupleGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<CoupleGoal | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Celebration state
  const [celebrationGoal, setCelebrationGoal] = useState<CoupleGoal | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsCreating(initialMode === 'create');
      setActiveTab(initialTab);
      if (initialMode === 'create') {
        resetCreateForm();
      }
    }
  }, [isOpen, initialMode, initialTab]);

  // Real-time Firestore listener on couples/{coupleId}/goals
  useEffect(() => {
    if (!coupleSpace?.id || !isOpen) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const goalsColRef = collection(db, 'couples', coupleSpace.id, 'goals');
    const unsubscribe = onSnapshot(
      goalsColRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            coupleId: coupleSpace.id,
            createdBy: data.createdBy,
            creatorName: data.creatorName || data.creatorId,
            title: data.title,
            description: data.description || '',
            category: data.category || 'Quality Time',
            deadline: data.deadline || data.targetDate || null,
            targetDate: data.targetDate || data.deadline || null,
            status: data.status || (data.isCompleted ? 'completed' : 'active'),
            isCompleted: data.status === 'completed' || data.isCompleted === true,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt,
            completedAt: data.completedAt || null
          } as CoupleGoal;
        });

        // Sort: active first, then newest
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setGoals(items);
        setLoading(false);
      },
      (error) => {
        console.error("Goals real-time listener error:", error);
        setErrorMsg("Failed to load goals in real-time. Please check permissions.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [coupleSpace?.id, isOpen]);

  const resetCreateForm = () => {
    setCreateStep(1);
    setSelectedCategory('Quality Time');
    setGoalTitle('');
    setGoalDescription('');
    setHasDeadline(false);
    setGoalDeadline('');
    setEditingGoalId(null);
    setErrorMsg(null);
  };

  const handleStartCreate = () => {
    resetCreateForm();
    setIsCreating(true);
  };

  const handleStartEdit = (goal: CoupleGoal) => {
    setEditingGoalId(goal.id || null);
    setSelectedCategory((goal.category as CoupleGoalCategory) || 'Quality Time');
    setGoalTitle(goal.title);
    setGoalDescription(goal.description || '');
    if (goal.deadline) {
      setHasDeadline(true);
      setGoalDeadline(goal.deadline);
    } else {
      setHasDeadline(false);
      setGoalDeadline('');
    }
    setCreateStep(1);
    setIsCreating(true);
    setSelectedGoalDetail(null);
  };

  const handleSaveGoal = async () => {
    if (!userProfile || !coupleSpace?.id || !goalTitle.trim()) return;

    setSaving(true);
    setErrorMsg(null);

    const goalId = editingGoalId || `goal_${Date.now()}`;
    const deadlineVal = hasDeadline && goalDeadline ? goalDeadline : null;

    try {
      const goalDocRef = doc(db, 'couples', coupleSpace.id, 'goals', goalId);

      if (editingGoalId) {
        // Update existing goal: preserves original createdBy & createdAt
        await updateDoc(goalDocRef, {
          title: goalTitle.trim(),
          description: goalDescription.trim(),
          category: selectedCategory,
          deadline: deadlineVal,
          targetDate: deadlineVal,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Create new goal
        const newGoalData: CoupleGoal = {
          id: goalId,
          coupleId: coupleSpace.id,
          createdBy: userProfile.uid,
          creatorName: userProfile.displayName || 'Partner',
          title: goalTitle.trim(),
          description: goalDescription.trim(),
          category: selectedCategory,
          deadline: deadlineVal || undefined,
          targetDate: deadlineVal || undefined,
          status: 'active',
          isCompleted: false,
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: undefined
        };
        await setDoc(goalDocRef, newGoalData);

        // Notify partner gracefully
        try {
          const partnerId = coupleSpace.memberIds?.find((id) => id !== userProfile.uid);
          if (partnerId) {
            await sendPartnerNotification(
              partnerId,
              `${userProfile.displayName || 'Your partner'} added a new shared goal`,
              `"${goalTitle.trim()}" in ${selectedCategory}`,
              'goal'
            );
          }
        } catch (notifErr) {
          console.warn("Notice sending goal notification:", notifErr);
        }
      }

      setIsCreating(false);
      resetCreateForm();
    } catch (err: any) {
      console.error("Save goal error:", err);
      setErrorMsg("Failed to save goal. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async (goal: CoupleGoal) => {
    if (!coupleSpace?.id || !goal.id) return;

    const newStatus = goal.status === 'completed' ? 'active' : 'completed';
    const isNowCompleted = newStatus === 'completed';

    try {
      const goalRef = doc(db, 'couples', coupleSpace.id, 'goals', goal.id);
      await updateDoc(goalRef, {
        status: newStatus,
        isCompleted: isNowCompleted,
        completedAt: isNowCompleted ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
      });

      if (isNowCompleted) {
        setCelebrationGoal(goal);
        // Notify partner of shared celebration
        const partnerId = coupleSpace.memberIds?.find((id) => id !== userProfile?.uid);
        if (partnerId && userProfile) {
          try {
            await sendPartnerNotification(
              partnerId,
              `Goal completed together! 🎉`,
              `"${goal.title}" was marked as completed. Another thing you accomplished together.`,
              'goal'
            );
          } catch (e) {
            console.warn("Celebration notification notice:", e);
          }
        }
      }

      if (selectedGoalDetail?.id === goal.id) {
        setSelectedGoalDetail({
          ...selectedGoalDetail,
          status: newStatus,
          isCompleted: isNowCompleted,
          completedAt: isNowCompleted ? new Date().toISOString() : null
        });
      }
    } catch (err) {
      console.error("Complete goal error:", err);
      setErrorMsg("Failed to update status. Please try again.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!coupleSpace?.id || !goalToDelete?.id) return;

    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'couples', coupleSpace.id, 'goals', goalToDelete.id));
      setGoalToDelete(null);
      if (selectedGoalDetail?.id === goalToDelete.id) {
        setSelectedGoalDetail(null);
      }
    } catch (err) {
      console.error("Delete goal error:", err);
      setErrorMsg("Could not delete goal. Please check permissions.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const activeGoals = goals.filter((g) => g.status !== 'completed');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 relative z-10">
          {!isCreating ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  activeTab === 'active'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Active Goals ({activeGoals.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('milestones')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'milestones'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Milestones ({completedGoals.length})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                <span>{editingGoalId ? 'Edit Shared Goal' : 'Create a Shared Goal'}</span>
              </span>
            </div>
          )}

          <div className="flex items-center gap-1">
            {!isCreating && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="p-1.5 rounded-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Create a Goal"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 relative z-10 no-scrollbar">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isCreating ? (
            /* MULTI-STEP CREATION FLOW */
            <div className="space-y-4 animate-fadeIn">
              {/* Progress Indicator */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Step {createStep} of 4</span>
                  <span className="text-rose-400 font-semibold">Shared between both of you</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${(createStep / 4) * 100}%` }}
                  />
                </div>
              </div>

              {/* STEP 1: CATEGORY */}
              {createStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      What would you like to work toward together?
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Choose an area that feels meaningful for your connection.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat.name;
                      return (
                        <button
                          type="button"
                          key={cat.name}
                          onClick={() => setSelectedCategory(cat.name)}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-rose-500/15 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/40'
                              : 'bg-zinc-900/60 border-white/5 hover:border-white/15 text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xl">{cat.icon}</span>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-rose-500 border-rose-400 text-white' : 'border-zinc-700'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{cat.name}</div>
                            <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2 leading-tight">
                              {cat.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        resetCreateForm();
                      }}
                      className="px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateStep(2)}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: TITLE & DESCRIPTION */}
              {createStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-semibold mb-2">
                      <span>{selectedCategory}</span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      What is your goal?
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Keep it uplifting, clear, and something you both feel drawn to.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Goal Title <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={goalTitle}
                        onChange={(e) => setGoalTitle(e.target.value)}
                        placeholder="e.g. Have one phone-free evening together each week"
                        className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl px-3.5 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Tell us a little more about this goal <span className="text-zinc-500 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={goalDescription}
                        onChange={(e) => setGoalDescription(e.target.value)}
                        placeholder="Why does this matter to you both? How would you like to do it?"
                        className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
                        maxLength={300}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCreateStep(1)}
                      className="px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-white/10 flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      disabled={!goalTitle.trim()}
                      onClick={() => setCreateStep(3)}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: DEADLINE (OPTIONAL) */}
              {createStep === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      When would you like to achieve this?
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      No pressure—choose a target date or leave it open-ended.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setHasDeadline(false);
                        setGoalDeadline('');
                      }}
                      className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        !hasDeadline
                          ? 'bg-rose-500/15 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/40'
                          : 'bg-zinc-900/60 border-white/5 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-rose-400" />
                        <div>
                          <div className="text-xs font-bold text-white">No deadline</div>
                          <div className="text-[10px] text-zinc-400">An ongoing habit or gentle shared dream</div>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          !hasDeadline ? 'bg-rose-500 border-rose-400 text-white' : 'border-zinc-700'
                        }`}
                      >
                        {!hasDeadline && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHasDeadline(true)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        hasDeadline
                          ? 'bg-rose-500/15 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/40'
                          : 'bg-zinc-900/60 border-white/5 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        <div>
                          <div className="text-xs font-bold text-white">Choose a date</div>
                          <div className="text-[10px] text-zinc-400">Target a specific day or milestone</div>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          hasDeadline ? 'bg-rose-500 border-rose-400 text-white' : 'border-zinc-700'
                        }`}
                      >
                        {hasDeadline && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>

                    {hasDeadline && (
                      <div className="pt-2 animate-fadeIn">
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Target Date
                        </label>
                        <input
                          type="date"
                          value={goalDeadline}
                          onChange={(e) => setGoalDeadline(e.target.value)}
                          className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 [color-scheme:dark]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCreateStep(2)}
                      className="px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-white/10 flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateStep(4)}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Preview Goal</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: PREVIEW & CREATE */}
              {createStep === 4 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Ready to create this together?
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Both of you will be able to view, complete, and celebrate this goal.
                    </p>
                  </div>

                  {/* Preview Card */}
                  <div className="glass-card rounded-2xl p-4 border border-rose-500/30 bg-rose-950/15 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30">
                        {selectedCategory}
                      </span>
                      {hasDeadline && goalDeadline && (
                        <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-purple-400" />
                          <span>{goalDeadline}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white leading-snug">
                      {goalTitle}
                    </h4>

                    {goalDescription ? (
                      <p className="text-xs text-zinc-300 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5">
                        "{goalDescription}"
                      </p>
                    ) : null}

                    <div className="pt-1 text-[11px] text-zinc-400 flex items-center gap-1">
                      <span>Status:</span>
                      <span className="text-emerald-400 font-semibold">Active</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCreateStep(3)}
                      className="px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-white/10 flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSaveGoal}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Goal...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{editingGoalId ? 'Save Changes' : 'Create Goal'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'active' ? (
            /* ACTIVE GOALS TAB */
            <div className="space-y-3 animate-fadeIn">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <span className="text-xs font-mono">Loading shared goals...</span>
                </div>
              ) : activeGoals.length === 0 ? (
                /* EMPTY STATE - NO ACTIVE GOALS */
                <div className="glass-card rounded-2xl p-8 text-center border border-white/5 my-2 space-y-2.5">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-1">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No active goals.</h4>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                    No pressure — choose something you'd like to work toward together when you're ready.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="mt-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-rose-600/20 flex items-center gap-1.5 mx-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Your First Goal</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="glass-card rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                              {goal.category}
                            </span>
                            {goal.deadline && (
                              <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-purple-400" />
                                <span>{goal.deadline}</span>
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-white leading-snug">
                            {goal.title}
                          </h4>
                        </div>

                        {/* Completion Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(goal)}
                          className="w-7 h-7 rounded-xl border border-zinc-700 hover:border-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center text-zinc-400 hover:text-emerald-300 transition-colors shrink-0 cursor-pointer"
                          title="Mark Complete"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>

                      {goal.description ? (
                        <p className="text-xs text-zinc-300/90 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5">
                          {goal.description}
                        </p>
                      ) : null}

                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-zinc-400">
                        <span>Created by {goal.creatorName || 'Partner'}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(goal)}
                            className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                            title="Edit Goal"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setGoalToDelete(goal)}
                            className="text-zinc-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                            title="Delete Goal"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* SHARED MILESTONES TAB */
            <div className="space-y-3 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Shared Milestones
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Accomplishments and intentions you've realized together.
                </p>
              </div>

              {completedGoals.length === 0 ? (
                /* EMPTY STATE - NO COMPLETED GOALS */
                <div className="glass-card rounded-2xl p-8 text-center border border-white/5 my-2 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-1">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Your completed goals will appear here.</h4>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                    Check off active goals when achieved to celebrate what you've built together.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {completedGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="glass-card rounded-2xl p-4 border border-purple-500/20 bg-purple-950/10 space-y-2 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center gap-1">
                              <PartyPopper className="w-2.5 h-2.5" />
                              <span>{goal.category}</span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white leading-snug">
                            {goal.title}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={() => setGoalToDelete(goal)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Milestone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {goal.description ? (
                        <p className="text-xs text-zinc-300/80 leading-relaxed">
                          "{goal.description}"
                        </p>
                      ) : null}

                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-zinc-400">
                        <span>
                          {goal.completedAt
                            ? `Accomplished on ${new Date(goal.completedAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}`
                            : 'Accomplished together'}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleComplete(goal)}
                          className="text-zinc-500 hover:text-zinc-300 text-[10px] underline cursor-pointer"
                        >
                          Reopen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CELEBRATION MODAL OVERLAY */}
        {celebrationGoal && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-purple-500 text-white flex items-center justify-center shadow-[0_0_35px_rgba(244,63,94,0.5)] mb-3 animate-bounce">
              <PartyPopper className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight">
              Goal completed 🎉
            </h3>
            <p className="text-xs text-rose-200 mt-1 max-w-xs leading-relaxed">
              Another thing you accomplished together.
            </p>

            <div className="my-4 p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 w-full text-left">
              <span className="text-[10px] font-bold text-purple-400 block uppercase">
                {celebrationGoal.category}
              </span>
              <span className="text-xs font-bold text-white mt-0.5 block">
                {celebrationGoal.title}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCelebrationGoal(null)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-rose-600/25 active:scale-[0.98] transition-all"
            >
              Continue Celebrating
            </button>
          </div>
        )}

        {/* DELETE CONFIRMATION DIALOG */}
        {goalToDelete && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md p-6 flex flex-col justify-between animate-fadeIn">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  Delete this goal?
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  This will remove it for both of you.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                  {goalToDelete.category}
                </span>
                <p className="text-xs font-medium text-white">
                  "{goalToDelete.title}"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Goal</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
