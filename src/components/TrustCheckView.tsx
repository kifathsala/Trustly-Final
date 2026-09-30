import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TrustCheckDoc, TrustCheckAnswers } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  MessageSquare, 
  Info,
  Compass
} from 'lucide-react';

interface TrustCheckProps {
  onOpenCoachWithTopic?: (topic: string) => void;
}

export const TrustCheckView: React.FC<TrustCheckProps> = ({ onOpenCoachWithTopic }) => {
  const { userProfile, partnerProfile, coupleSpace } = useAuth();

  const [answers, setAnswers] = useState<TrustCheckAnswers>({
    feltHeard: 4,
    feltConnected: 4,
    discussDifficult: 3,
    boundariesRespected: 4,
    wishUnderstood: '',
    transparencySatisfied: 4,
  });

  const [shareWithPartner, setShareWithPartner] = useState<boolean>(false);
  const [hasCompletedCheck, setHasCompletedCheck] = useState<boolean>(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);

  const concernOptions = [
    'Communication suddenly changed',
    'Feeling ignored',
    'Broken agreements',
    'Lack of transparency',
    'Repeated misunderstandings',
    'Emotional distance',
    'Boundary concerns',
  ];

  useEffect(() => {
    if (!userProfile) return;
    loadExistingCheck();
  }, [userProfile]);

  const loadExistingCheck = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      // Check user's latest trust check (real Firestore records only)
      const q = query(
        collection(db, 'trustChecks'),
        where('userId', '==', userProfile.uid),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data() as TrustCheckDoc;
        setAnswers(data.answers);
        setShareWithPartner(data.isSharedWithPartner);
        setHasCompletedCheck(true);
      } else {
        setHasCompletedCheck(false);
      }
    } catch (e) {
      console.warn("Could not load trust checks:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setSaving(true);
    try {
      const docId = `trust_${userProfile.uid}`;
      const docData: TrustCheckDoc = {
        userId: userProfile.uid,
        coupleId: coupleSpace?.id || undefined,
        answers,
        isSharedWithPartner: shareWithPartner,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'trustChecks', docId), docData);
      setHasCompletedCheck(true);
      setShowQuestionnaire(false);
    } catch (e) {
      console.error("Save trust check error:", e);
    } finally {
      setSaving(false);
    }
  };

  const toggleConcern = (concern: string) => {
    if (selectedConcerns.includes(concern)) {
      setSelectedConcerns(selectedConcerns.filter(c => c !== concern));
    } else {
      setSelectedConcerns([...selectedConcerns, concern]);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Private & Voluntary</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Trust Check</h1>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
          Answer privately. Your partner only sees what you explicitly choose to share.
        </p>
      </div>

      {/* 6. TRUST CHECK: Empty State if no real response submitted */}
      {!hasCompletedCheck && !showQuestionnaire ? (
        <div className="glass-card rounded-3xl p-8 border border-white/10 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <Compass className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            Your first Trust Check is waiting.
          </h3>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-6 leading-relaxed">
            Reflect privately on communication, boundaries, and emotional safety. Zero surveillance—only calm mutual insight.
          </p>
          <button
            onClick={() => setShowQuestionnaire(true)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-sm shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer ring-1 ring-white/20"
          >
            Start Trust Check
          </button>
        </div>
      ) : (
        /* Main Questionnaire Card */
        <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-semibold text-zinc-200">Reflective Check</h3>
            </div>
            {hasCompletedCheck && (
              <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Question 1: Do you feel heard recently? */}
            <div>
              <div className="flex justify-between items-center text-xs font-medium text-zinc-300 mb-2">
                <span>Do you feel heard recently?</span>
                <span className="text-rose-400 font-bold">{answers.feltHeard}/5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setAnswers({ ...answers, feltHeard: val })}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      answers.feltHeard === val 
                        ? 'bg-rose-500 text-white shadow-md' 
                        : 'bg-zinc-900/80 text-zinc-400 border border-white/5 hover:border-white/10'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 2: Do you feel emotionally connected? */}
            <div>
              <div className="flex justify-between items-center text-xs font-medium text-zinc-300 mb-2">
                <span>Do you feel emotionally connected?</span>
                <span className="text-rose-400 font-bold">{answers.feltConnected}/5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setAnswers({ ...answers, feltConnected: val })}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      answers.feltConnected === val 
                        ? 'bg-rose-500 text-white shadow-md' 
                        : 'bg-zinc-900/80 text-zinc-400 border border-white/5 hover:border-white/10'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 3: Do you feel comfortable discussing difficult topics? */}
            <div>
              <div className="flex justify-between items-center text-xs font-medium text-zinc-300 mb-2">
                <span>Do you feel comfortable discussing difficult topics?</span>
                <span className="text-rose-400 font-bold">{answers.discussDifficult}/5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setAnswers({ ...answers, discussDifficult: val })}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      answers.discussDifficult === val 
                        ? 'bg-rose-500 text-white shadow-md' 
                        : 'bg-zinc-900/80 text-zinc-400 border border-white/5 hover:border-white/10'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 4: Do you feel your boundaries are respected? */}
            <div>
              <div className="flex justify-between items-center text-xs font-medium text-zinc-300 mb-2">
                <span>Do you feel your boundaries are respected?</span>
                <span className="text-rose-400 font-bold">{answers.boundariesRespected}/5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setAnswers({ ...answers, boundariesRespected: val })}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      answers.boundariesRespected === val 
                        ? 'bg-rose-500 text-white shadow-md' 
                        : 'bg-zinc-900/80 text-zinc-400 border border-white/5 hover:border-white/10'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 5: Transparency */}
            <div>
              <div className="flex justify-between items-center text-xs font-medium text-zinc-300 mb-2">
                <span>Do you feel there is enough transparency in your relationship?</span>
                <span className="text-rose-400 font-bold">{answers.transparencySatisfied}/5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setAnswers({ ...answers, transparencySatisfied: val })}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      answers.transparencySatisfied === val 
                        ? 'bg-rose-500 text-white shadow-md' 
                        : 'bg-zinc-900/80 text-zinc-400 border border-white/5 hover:border-white/10'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 6: Something you wish your partner understood */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Is there something you wish your partner understood better?
              </label>
              <textarea
                rows={2}
                placeholder="e.g. When work gets stressful, I need 15 minutes of quiet before diving into conversations..."
                value={answers.wishUnderstood}
                onChange={(e) => setAnswers({ ...answers, wishUnderstood: e.target.value })}
                className="w-full bg-zinc-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            {/* Voluntary share toggle */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/50 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-rose-400" />
                <div>
                  <span className="text-xs font-medium text-zinc-200 block">Share answers with partner</span>
                  <span className="text-[10px] text-zinc-400">Private by default. Your partner cannot read unless shared.</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareWithPartner}
                  onChange={(e) => setShareWithPartner(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-medium text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Save Responses</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* SECTION: THINGS WORTH TALKING ABOUT */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Things Worth Talking About</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Notice changes or tension? Select what you have observed to prepare a calm conversation.
            </p>
          </div>
        </div>

        {/* Clear anti-paranoia disclaimer */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90 leading-snug">
            <strong>This doesn't prove anything.</strong> It may simply be a sign that an honest, supportive conversation is needed.
          </p>
        </div>

        {/* Voluntary selection chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {concernOptions.map((concern) => {
            const isSelected = selectedConcerns.includes(concern);
            return (
              <button
                key={concern}
                onClick={() => toggleConcern(concern)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                  isSelected 
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-200' 
                    : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {concern}
              </button>
            );
          })}
        </div>

        {selectedConcerns.length > 0 && (
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/10 space-y-3">
            <h4 className="text-xs font-semibold text-zinc-200">
              Guidance for: {selectedConcerns.join(', ')}
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              When addressing these areas, start by expressing how you value the relationship rather than venting frustration.
            </p>

            <button
              onClick={() => onOpenCoachWithTopic?.(`How to gently talk about ${selectedConcerns.join(' and ')} without blame`)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Start a Conversation</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
