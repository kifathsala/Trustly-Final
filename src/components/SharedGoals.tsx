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
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Target, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Loader2, 
  AlertTriangle,
  Info,
  PartyPopper,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { sendNotification } from '../lib/notifications';
import { getConnectionLabel } from '../lib/connection';

interface GoalItem {
  id?: string;
  coupleId: string;
  createdBy: string;
  creatorName: string;
  title: string;
  description: string;
  category: string;
  deadline?: string;
  targetDate?: string;
  status: 'active' | 'completed' | 'archived';
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completedBy?: string;
}

const CATEGORIES = [
  { name: 'Quality Time', icon: '', desc: 'Date nights, dedicated presence, and focused time' },
  { name: 'Communication', icon: '', desc: 'Active listening, weekly check-ins, and openness' },
  { name: 'Health & Wellness', icon: '🌱', desc: 'Daily walks, workouts, or healthy nutrition' },
  { name: 'Travel', icon: '✈', desc: 'Dream trips, day exploration, or weekend getaways' },
  { name: 'Finance', icon: '💰', desc: 'Budget targets, savings, and financial stability' },
  { name: 'Personal Growth', icon: '📚', desc: 'Learning skills, reading books, or meditation' },
  { name: 'Future Plans', icon: '', desc: 'Shared milestones, home organization, or career projects' },
  { name: 'Something Else', icon: '✨', desc: 'Other custom goals built for the two of you' },
];

/**
 * Calculates due date string based on targetDate / deadline.
 */
function getDeadlineLabel(targetDateStr?: string, isCompleted?: boolean): { label: string; style: string } {
  if (isCompleted) {
    return { label: 'Completed', style: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  }
  if (!targetDateStr) {
    return { label: 'Ongoing', style: 'text-zinc-400 bg-zinc-800/40 border-white/5' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { label: 'Due today ⚠', style: 'text-amber-400 bg-amber-500/15 border-amber-500/30 font-bold' };
  } else if (diffDays === 1) {
    return { label: 'Due tomorrow', style: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20' };
  } else if (diffDays < 0) {
    return { label: `Overdue by ${Math.abs(diffDays)} days ⚠`, style: 'text-rose-400 bg-rose-500/15 border-rose-500/30 font-bold' };
  } else {
    return { label: `Due in ${diffDays} days`, style: 'text-zinc-300 bg-zinc-900 border-white/5' };
  }
}

export const SharedGoals: React.FC = () => {
  const { currentUser, userProfile, partnerProfile, coupleSpace } = useAuth();

  const partnerName = partnerProfile?.displayName || coupleSpace?.creatorName || 'Connection Partner';
  const connectionLabel = coupleSpace ? getConnectionLabel(coupleSpace.connectionType) : 'Connection';

  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Quality Time');
  const [hasTargetDate, setHasTargetDate] = useState(false);
  const [targetDateValue, setTargetDateValue] = useState('');

  // Local interaction states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<GoalItem | null>(null);
  const [celebratedGoal, setCelebratedGoal] = useState<GoalItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Subscribe to connection's goals
  useEffect(() => {
    if (!coupleSpace?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const goalsCol = collection(db, 'couples', coupleSpace.id, 'goals');
    const q = query(goalsCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data
        } as GoalItem;
      });
      setGoals(items);
      setLoading(false);
    }, (error) => {
      console.error("Goals listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [coupleSpace?.id]);

  // Handle Create/Edit Open
  const handleOpenCreate = () => {
    setEditingGoalId(null);
    setGoalTitle('');
    setGoalDescription('');
    setSelectedCategory('Quality Time');
    setHasTargetDate(false);
    setTargetDateValue('');
    setErrorMsg(null);
    setViewMode('create');
  };

  const handleOpenEdit = (goal: GoalItem) => {
    setEditingGoalId(goal.id || null);
    setGoalTitle(goal.title);
    setGoalDescription(goal.description);
    setSelectedCategory(goal.category);
    if (goal.targetDate || goal.deadline) {
      setHasTargetDate(true);
      setTargetDateValue(goal.targetDate || goal.deadline || '');
    } else {
      setHasTargetDate(false);
      setTargetDateValue('');
    }
    setErrorMsg(null);
    setViewMode('create');
  };

  // Save Goal Handler
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid || !coupleSpace?.id || !goalTitle.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const goalId = editingGoalId || `goal_${Date.now()}`;
    const dateVal = hasTargetDate && targetDateValue ? targetDateValue : undefined;
    const timestamp = new Date().toISOString();
    const creatorName = userProfile?.displayName || 'Connection Partner';

    try {
      const goalDocRef = doc(db, 'couples', coupleSpace.id, 'goals', goalId);

      if (editingGoalId) {
        // Safe update
        await updateDoc(goalDocRef, {
          title: goalTitle.trim(),
          description: goalDescription.trim(),
          category: selectedCategory,
          targetDate: dateVal || null,
          deadline: dateVal || null,
          updatedAt: timestamp
        });
      } else {
        // Safe creation
        const newGoal: GoalItem = {
          id: goalId,
          coupleId: coupleSpace.id,
          createdBy: currentUser.uid,
          creatorName,
          title: goalTitle.trim(),
          description: goalDescription.trim(),
          category: selectedCategory,
          targetDate: dateVal,
          deadline: dateVal,
          status: 'active',
          isCompleted: false,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        await setDoc(goalDocRef, newGoal);

        // Notify connected partner securely
        const partnerUid = coupleSpace.memberIds?.find(uid => uid !== currentUser.uid);
        if (partnerUid) {
          sendNotification(partnerUid, {
            type: 'goal',
            title: 'New Shared Goal ',
            body: `${creatorName} created a shared goal: "${goalTitle.trim()}".`,
            connectionId: coupleSpace.id
          }).catch(console.error);
        }
      }

      setViewMode('list');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to save goal. Please check permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Goal status Complete / Reopen
  const handleToggleGoalStatus = async (goal: GoalItem) => {
    if (!currentUser?.uid || !coupleSpace?.id || !goal.id) return;

    const isNowCompleted = !goal.isCompleted;
    const statusVal = isNowCompleted ? 'completed' : 'active';
    const timestamp = new Date().toISOString();
    const creatorName = userProfile?.displayName || 'Connection Partner';

    try {
      const goalDocRef = doc(db, 'couples', coupleSpace.id, 'goals', goal.id);
      await updateDoc(goalDocRef, {
        status: statusVal,
        isCompleted: isNowCompleted,
        completedAt: isNowCompleted ? timestamp : null,
        completedBy: isNowCompleted ? currentUser.uid : null,
        updatedAt: timestamp
      });

      if (isNowCompleted) {
        setCelebratedGoal(goal);

        // Notify partner of accomplishment
        const partnerUid = coupleSpace.memberIds?.find(uid => uid !== currentUser.uid);
        if (partnerUid) {
          sendNotification(partnerUid, {
            type: 'goal',
            title: 'Goal Accomplished Together! ',
            body: `"${goal.title}" has been completed! Another thing you achieved together.`,
            connectionId: coupleSpace.id
          }).catch(console.error);
        }
      }
    } catch (err) {
      console.error("Failed to toggle goal completion:", err);
    }
  };

  // Delete Goal Handler
  const handleDeleteGoal = async () => {
    if (!coupleSpace?.id || !goalToDelete?.id) return;

    setIsSubmitting(true);
    try {
      const goalDocRef = doc(db, 'couples', coupleSpace.id, 'goals', goalToDelete.id);
      await deleteDoc(goalDocRef);
      setGoalToDelete(null);
    } catch (err) {
      console.error("Failed to delete shared goal:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeGoals = goals.filter(g => !g.isCompleted && g.status !== 'completed');
  const completedGoals = goals.filter(g => g.isCompleted || g.status === 'completed');
  const filteredGoals = activeTab === 'active' ? activeGoals : completedGoals;

  return (
    <div className="w-full space-y-6 pb-28 animate-fadeIn relative text-left">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-violet-400" />
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Shared Goals</h2>
            <p className="text-[11px] text-zinc-400">
              With: <strong className="text-white">{partnerName}</strong> ({connectionLabel})
            </p>
          </div>
        </div>

        {viewMode === 'list' && (
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Goal</span>
          </button>
        )}

        {viewMode === 'create' && (
          <button
            onClick={() => setViewMode('list')}
            className="px-3.5 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-300 text-xs font-semibold hover:text-white"
          >
            ✕ Cancel
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* LIST VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* TABS SELECTOR */}
          <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-2xl border border-white/5 w-fit">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-zinc-900 border border-white/10 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Active Progress ({activeGoals.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-zinc-900 border border-white/10 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Completed Milestones ({completedGoals.length})
            </button>
          </div>

          {/* SKELETON LOADER */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(n => (
                <div key={n} className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5 animate-pulse space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-24 bg-white/10 rounded-md" />
                    <div className="h-4 w-16 bg-white/10 rounded-md" />
                  </div>
                  <div className="h-6 w-3/4 bg-white/10 rounded-md" />
                  <div className="h-3 w-1/2 bg-white/5 rounded-md" />
                </div>
              ))}
            </div>
          ) : filteredGoals.length === 0 ? (
            /* EMPTY STATES */
            <div className="glass-card rounded-3xl p-8 border border-white/5 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-300">
                  {activeTab === 'active' ? 'No active shared goals yet.' : 'No completed milestones yet.'}
                </h4>
                <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  {activeTab === 'active' 
                    ? "Choose something you'd like to accomplish together. Every small step builds stronger connections."
                    : "Complete an active goal above to log your first shared milestone together!"}
                </p>
              </div>
              {activeTab === 'active' && (
                <button
                  onClick={handleOpenCreate}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Shared Goal</span>
                </button>
              )}
            </div>
          ) : (
            /* GOAL CARDS GRID */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredGoals.map((goal) => {
                const isCreator = goal.createdBy === currentUser?.uid;
                const dateLabelInfo = getDeadlineLabel(goal.targetDate || goal.deadline, goal.isCompleted);

                return (
                  <div
                    key={goal.id}
                    className="p-4 rounded-3xl bg-zinc-900/60 border border-white/5 flex flex-col justify-between hover:border-white/15 transition-all shadow-md group relative overflow-hidden text-left"
                  >
                    <div className="space-y-3">
                      {/* Badge / Deadline layout */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full inline-block">
                          {goal.category}
                        </span>

                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${dateLabelInfo.style}`}>
                          {dateLabelInfo.label}
                        </span>
                      </div>

                      {/* Content block */}
                      <div className="space-y-1">
                        <h4 className={`text-xs font-bold leading-relaxed ${goal.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                           {goal.title}
                        </h4>
                        {goal.description && (
                          <p className="text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap">
                            {goal.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom toolbar */}
                    <div className="pt-3 border-t border-white/5 mt-4 flex items-center justify-between text-[10px] text-zinc-500">
                      <span>Added by {isCreator ? 'You' : (goal.creatorName || partnerName)}</span>

                      <div className="flex items-center gap-2">
                        {/* Status Checkbox Button */}
                        <button
                          onClick={() => handleToggleGoalStatus(goal)}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            goal.isCompleted
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-emerald-400 hover:text-emerald-300'
                          }`}
                        >
                          {goal.isCompleted ? <Check className="w-3 h-3" /> : null}
                          <span>{goal.isCompleted ? 'Completed' : 'Mark Complete'}</span>
                        </button>

                        {/* Edit Action */}
                        {!goal.isCompleted && (
                          <button
                            onClick={() => handleOpenEdit(goal)}
                            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                            title="Edit goal"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Action */}
                        <button
                          onClick={() => setGoalToDelete(goal)}
                          className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Delete goal"
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

      {/* ========================================================================= */}
      {/* FORM: CREATE / EDIT */}
      {/* ========================================================================= */}
      {viewMode === 'create' && (
        <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-xl text-left max-w-lg mx-auto">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5 pb-2.5 border-b border-white/5 mb-4">
            <Target className="w-4 h-4 text-violet-400" />
            <span>{editingGoalId ? 'Edit Shared Goal' : 'Add Shared Goal'}</span>
          </h3>

          <form onSubmit={handleSaveGoal} className="space-y-4 text-left">
            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Goal Title */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Goal Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="e.g. Plan our next road trip"
                className="w-full bg-zinc-950 border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none"
              />
            </div>

            {/* Goal Description */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                placeholder="Why does this matter to both of you? How will you make time to accomplish it?"
                className="w-full bg-zinc-950 border border-white/10 focus:border-violet-500 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Has target date switch */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Target Date
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHasTargetDate(false);
                    setTargetDateValue('');
                  }}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    !hasTargetDate
                      ? 'border-violet-500 bg-violet-500/10 text-white font-bold'
                      : 'border-white/5 bg-zinc-950 text-zinc-400'
                  }`}
                >
                  Ongoing / No deadline
                </button>
                <button
                  type="button"
                  onClick={() => setHasTargetDate(true)}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    hasTargetDate
                      ? 'border-violet-500 bg-violet-500/10 text-white font-bold'
                      : 'border-white/5 bg-zinc-950 text-zinc-400'
                  }`}
                >
                  Set target date
                </button>
              </div>
            </div>

            {/* Input target date */}
            {hasTargetDate && (
              <div className="animate-fadeIn">
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Choose Target Date
                </label>
                <input
                  type="date"
                  required
                  value={targetDateValue}
                  onChange={(e) => setTargetDateValue(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500 [color-scheme:dark]"
                />
              </div>
            )}

            {/* Submit Action Grid */}
            <div className="flex gap-2.5 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !goalTitle.trim() || !goalDescription.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 hover:opacity-95 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{editingGoalId ? 'Save Changes' : 'Create Shared Goal'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CELEBRATION OVERLAY POPUP */}
      {/* ========================================================================= */}
      {celebratedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn text-center">
          <div className="w-full max-w-sm bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-4">
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] mx-auto animate-bounce">
              <PartyPopper className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white tracking-tight">
                Goal completed 
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-xs mx-auto">
                Another milestone achieved and celebrated together inside your connection space!
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-left">
              <span className="text-[9px] font-bold text-emerald-400 block uppercase">
                {celebratedGoal.category}
              </span>
              <p className="text-xs font-bold text-white mt-1">
                "{celebratedGoal.title}"
              </p>
            </div>

            <button
              onClick={() => setCelebratedGoal(null)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Continue Accomplishing
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-zinc-950 border border-rose-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5.5 h-5.5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Delete this goal?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This will remove this shared goal for both you and your connection partner. This action is irreversible.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900 border border-white/5">
              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">
                {goalToDelete.category}
              </span>
              <p className="text-xs font-bold text-zinc-200 mt-0.5 line-clamp-1">
                "{goalToDelete.title}"
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setGoalToDelete(null)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 border border-white/5 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGoal}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete Goal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
