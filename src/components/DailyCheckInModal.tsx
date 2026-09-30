import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  RelationshipFeeling, 
  UserCheckIn, 
  SharedCheckInSummary 
} from '../types';
import { sendPartnerNotification } from '../lib/notifications';
import { 
  X, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  CheckCircle2, 
  ShieldCheck, 
  Info, 
  Heart, 
  MessageSquare, 
  Calendar, 
  Share2, 
  Eye, 
  EyeOff,
  History,
  Send,
  Loader2
} from 'lucide-react';

interface DailyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCoachWithTopic?: (topic: string) => void;
  onCheckInCompleted?: () => void;
  initialTab?: 'checkin' | 'history';
}

export const DailyCheckInModal: React.FC<DailyCheckInModalProps> = ({
  isOpen,
  onClose,
  onOpenCoachWithTopic,
  onCheckInCompleted,
  initialTab = 'checkin'
}) => {
  const { userProfile, partnerProfile, coupleSpace } = useAuth();

  const [activeTab, setActiveTab] = useState<'checkin' | 'history'>(initialTab);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1); // 1: Feeling, 2: Area, 3: Reflection, 4: Sharing, 5: Complete
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [selectedFeeling, setSelectedFeeling] = useState<RelationshipFeeling>('Very connected');
  const [selectedEmoji, setSelectedEmoji] = useState<string>('❤️');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [reflection, setReflection] = useState<string>('');
  const [shareChoice, setShareChoice] = useState<'private' | 'summary'>('private');
  const [customSummary, setCustomSummary] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState(false);

  // History State
  const [historyItems, setHistoryItems] = useState<UserCheckIn[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  const todayDateStr = new Date().toISOString().split('T')[0];

  const feelings: { label: RelationshipFeeling; emoji: string; desc: string }[] = [
    { label: 'Very connected', emoji: '❤️', desc: 'Feeling deep closeness and mutual warmth' },
    { label: 'Good', emoji: '🙂', desc: 'Things feel comfortable and solid' },
    { label: 'Okay', emoji: '😐', desc: 'Neutral, getting through everyday routines' },
    { label: 'A little distant', emoji: '😕', desc: 'Noticing some emotional or communication space' },
    { label: 'Something is on my mind', emoji: '💭', desc: 'Holding thoughts or feelings worth exploring' }
  ];

  const areasList = [
    'Communication',
    'Trust',
    'Quality Time',
    'Affection',
    'Family',
    'Stress',
    'Money',
    'Something Else'
  ];

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadExistingTodayCheckIn();
      loadHistory();
    }
  }, [isOpen, initialTab, userProfile]);

  const loadExistingTodayCheckIn = async () => {
    if (!userProfile) return;
    try {
      const checkInRef = doc(db, 'users', userProfile.uid, 'checkIns', todayDateStr);
      const snap = await getDoc(checkInRef);
      if (snap.exists()) {
        const data = snap.data() as UserCheckIn;
        setSelectedFeeling(data.feeling);
        setSelectedEmoji(data.feelingEmoji || '❤️');
        setSelectedAreas(data.areas || []);
        setReflection(data.reflection || '');
        setShareChoice(data.shareWithPartner ? 'summary' : 'private');
        setCustomSummary(data.sharedSummary || generateNeutralSummary(data.feeling, data.areas || []));
      } else {
        // Defaults
        setSelectedFeeling('Very connected');
        setSelectedEmoji('❤️');
        setSelectedAreas([]);
        setReflection('');
        setShareChoice('private');
        setStep(1);
      }
    } catch (err) {
      console.warn("Could not fetch today's checkin:", err);
    }
  };

  const loadHistory = async () => {
    if (!userProfile) return;
    setLoadingHistory(true);
    try {
      const q = query(collection(db, 'users', userProfile.uid, 'checkIns'));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserCheckIn));
      // Sort newest date first
      items.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
      setHistoryItems(items);
    } catch (err) {
      console.warn("Could not load checkin history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectFeeling = (item: typeof feelings[number]) => {
    setSelectedFeeling(item.label);
    setSelectedEmoji(item.emoji);
  };

  const toggleArea = (area: string) => {
    if (selectedAreas.includes(area)) {
      setSelectedAreas(selectedAreas.filter(a => a !== area));
    } else {
      setSelectedAreas([...selectedAreas, area]);
    }
  };

  // Generate a respectful, neutral summary from feeling + areas
  const generateNeutralSummary = (feeling: RelationshipFeeling, areas: string[]): string => {
    const areaText = areas.length > 0 
      ? `around ${areas.join(' and ')}` 
      : 'in our everyday connection';

    switch (feeling) {
      case 'Very connected':
        return `Feeling very connected today, especially ${areaText}.`;
      case 'Good':
        return `Feeling good about our relationship today ${areaText}.`;
      case 'Okay':
        return `Feeling okay today. Checking in on ${areaText}.`;
      case 'A little distant':
        return `Feeling a little distant today and would value spending quiet time together ${areaText}.`;
      case 'Something is on my mind':
        return `Having some reflections on my mind today regarding ${areaText} that I would like to talk through calmly.`;
      default:
        return `Completed daily relationship reflection.`;
    }
  };

  // When reaching Step 4, initialize summary if not customized yet
  const handleProceedToStep4 = () => {
    const autoSummary = generateNeutralSummary(selectedFeeling, selectedAreas);
    setCustomSummary(autoSummary);
    setStep(4);
  };

  const handleSubmit = async (chosenShareMode: 'private' | 'summary') => {
    if (!userProfile) return;
    setLoading(true);
    setErrorMsg(null);

    const isShared = chosenShareMode === 'summary';
    const finalSummary = isShared ? (customSummary.trim() || generateNeutralSummary(selectedFeeling, selectedAreas)) : null;

    try {
      const checkInDoc: UserCheckIn = {
        id: todayDateStr,
        userId: userProfile.uid,
        coupleId: coupleSpace?.id || null,
        feeling: selectedFeeling,
        feelingEmoji: selectedEmoji,
        areas: selectedAreas,
        reflection: reflection.trim(), // Stored strictly in user private collection
        shareWithPartner: isShared,
        sharedSummary: finalSummary,
        date: todayDateStr,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 1. STRICTLY PRIVATE: Write to user's private subcollection
      const userDocRef = doc(db, 'users', userProfile.uid, 'checkIns', todayDateStr);
      await setDoc(userDocRef, checkInDoc);

      // 2. VOLUNTARY PARTNER SUMMARY: If user explicitly opted to share with partner and is in couple space
      if (isShared && coupleSpace?.id) {
        const sharedDocId = `${todayDateStr}_${userProfile.uid}`;
        const sharedSummaryDoc: SharedCheckInSummary = {
          id: sharedDocId,
          coupleId: coupleSpace.id,
          userId: userProfile.uid,
          userDisplayName: userProfile.displayName || 'Partner',
          feeling: selectedFeeling,
          feelingEmoji: selectedEmoji,
          areas: selectedAreas,
          sharedSummary: finalSummary!, // Sanitized summary ONLY — NO private reflection!
          date: todayDateStr,
          createdAt: new Date().toISOString()
        };

        const sharedDocRef = doc(db, 'couples', coupleSpace.id, 'sharedCheckIns', sharedDocId);
        await setDoc(sharedDocRef, sharedSummaryDoc);

        // Also notify partner gracefully if helper is present
        try {
          const partnerId = coupleSpace.memberIds?.find(id => id !== userProfile.uid);
          if (partnerId) {
            await sendPartnerNotification(
              partnerId,
              `${userProfile.displayName || 'Your partner'} shared a daily reflection`,
              finalSummary!,
              'checkin'
            );
          }
        } catch (notifErr) {
          console.warn("Notice sending notification:", notifErr);
        }
      }

      setStep(5); // Show completion state
      loadHistory();
      if (onCheckInCompleted) {
        onCheckInCompleted();
      }
    } catch (err: any) {
      console.error("Check-in save error:", err);
      setErrorMsg("We couldn't save your check-in. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const isConcerningState = selectedFeeling === 'A little distant' || selectedFeeling === 'Something is on my mind';

  const handleOpenCoach = () => {
    const areaPhrase = selectedAreas.length > 0 ? selectedAreas.join(', ') : 'our communication';
    const suggestedTopic = `I'm feeling ${selectedFeeling.toLowerCase()} regarding ${areaPhrase}. Can you help me find kind, non-defensive words to share what's on my mind?`;
    onClose();
    if (onOpenCoachWithTopic) {
      onOpenCoachWithTopic(suggestedTopic);
    }
  };

  // Group history items
  const now = new Date();
  const today = todayDateStr;
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const todayEntries = historyItems.filter(item => item.date === today);
  const thisWeekEntries = historyItems.filter(item => item.date < today && item.date >= oneWeekAgo);
  const previousEntries = historyItems.filter(item => item.date < oneWeekAgo);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Glow accents */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('checkin')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                activeTab === 'checkin'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Daily Check-In
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Your Check-ins</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 relative z-10 no-scrollbar">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'checkin' ? (
            <>
              {/* Stepper Progress Bar (Steps 1 to 4) */}
              {step < 5 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Step {step} of 4</span>
                    <div className="relative flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Lock className="w-2.5 h-2.5" /> Private by default
                      </span>
                      <button 
                        type="button"
                        onClick={() => setShowTooltip(!showTooltip)}
                        className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                        title="Privacy Information"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Tooltip info */}
                  {showTooltip && (
                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 text-[11px] text-zinc-300 leading-relaxed animate-fadeIn">
                      Your reflection stays private to your account unless you explicitly choose to share a neutral summary. Your partner never sees your private thoughts or unshared details.
                    </div>
                  )}

                  {/* Progress indicator bar */}
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${(step / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* STEP 1: FEELING */}
              {step === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      How are you feeling about your relationship today?
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Choose the single reflection that resonates most right now.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {feelings.map((item) => {
                      const isSelected = selectedFeeling === item.label;
                      return (
                        <button
                          type="button"
                          key={item.label}
                          onClick={() => handleSelectFeeling(item)}
                          className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-rose-500/15 border-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/40'
                              : 'bg-zinc-900/60 border-white/5 hover:border-white/15 text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <span className="text-2xl shrink-0">{item.emoji}</span>
                            <div>
                              <div className="font-semibold text-sm text-white">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-0.5">
                                {item.desc}
                              </div>
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-rose-500 border-rose-400 text-white' : 'border-zinc-700'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* STEP 2: AREA */}
              {step === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      What's affecting you today?
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Select all areas that apply to your current mood or dynamic.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {areasList.map((area) => {
                      const isSelected = selectedAreas.includes(area);
                      return (
                        <button
                          type="button"
                          key={area}
                          onClick={() => toggleArea(area)}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-purple-500/15 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/40'
                              : 'bg-zinc-900/60 border-white/5 hover:border-white/15 text-zinc-300'
                          }`}
                        >
                          <span className="text-xs font-semibold">{area}</span>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-purple-600 border-purple-400 text-white' : 'border-zinc-700'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: OPTIONAL REFLECTION */}
              {step === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-semibold mb-2">
                      <Lock className="w-3 h-3" />
                      <span>Private by Default</span>
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Want to put it into words?
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Optional self-reflection. This text is stored strictly for your own eyes.
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={4}
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      placeholder="Write anything that's on your mind..."
                      className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                      <span>Reflect honestly without editing for someone else.</span>
                      <span>{reflection.length}/500</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToStep4}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continue to Sharing</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: SHARING */}
              {step === 4 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Privacy & Sharing
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Your check-in is private by default. Choose how you want to save it today.
                    </p>
                  </div>

                  {/* Privacy Badge */}
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-emerald-200 block">Protected Privacy</span>
                      <span className="text-[11px] text-emerald-300/80">
                        Your private reflection is never shared automatically.
                      </span>
                    </div>
                  </div>

                  {/* Two Main Choice Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShareChoice('private')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        shareChoice === 'private'
                          ? 'bg-zinc-800 border-white/30 text-white shadow-lg ring-1 ring-white/20'
                          : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center mb-2 text-zinc-300">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="font-bold text-xs text-white">Keep Private</div>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                        Only you can see this full check-in and reflection.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShareChoice('summary')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        shareChoice === 'summary'
                          ? 'bg-purple-500/15 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/40'
                          : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center mb-2">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div className="font-bold text-xs text-white">Share a Summary</div>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                        Shares a gentle neutral summary with your partner.
                      </p>
                    </button>
                  </div>

                  {/* If user chooses "Share a Summary": Display and allow editing the neutral summary preview */}
                  {shareChoice === 'summary' && (
                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-purple-500/30 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> Neutral Summary Preview
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">Editable</span>
                      </div>

                      <textarea
                        rows={2}
                        value={customSummary}
                        onChange={(e) => setCustomSummary(e.target.value)}
                        className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                      />

                      <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] text-zinc-400 leading-tight">
                        🔒 <span className="text-zinc-300 font-medium">Important:</span> Your private reflection is not included. Only this neutral reflection will be surfaced.
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-4 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSubmit(shareChoice)}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Check-in...</span>
                        </>
                      ) : (
                        <>
                          <span>{shareChoice === 'summary' ? 'Confirm & Share Summary' : 'Save Privately'}</span>
                          <Check className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: COMPLETION / FEEDBACK */}
              {step === 5 && (
                <div className="space-y-5 text-center py-4 animate-fadeIn">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(244,63,94,0.4)]">
                    <span className="text-2xl animate-bounce">💗</span>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Check-in complete 💗
                    </h2>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                      Take a moment to notice what you're feeling.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="glass-card rounded-2xl p-4 border border-white/10 text-left space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                        <span>{selectedEmoji}</span>
                        <span>{selectedFeeling}</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-white/5 text-zinc-400 border border-white/5">
                        {shareChoice === 'summary' ? 'Summary Shared' : 'Private'}
                      </span>
                    </div>

                    {selectedAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedAreas.map(a => (
                          <span key={a} className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Concerning State: Coach Prompting */}
                  {isConcerningState ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-950/40 via-purple-950/20 to-zinc-950/60 border border-violet-500/30 text-left space-y-3">
                      <div className="flex items-center gap-2 text-violet-300 text-xs font-bold">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span>Would you like help putting this into words?</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        TRUSTLY Coach can help you articulate what you're noticing with clarity and warmth, avoiding defensiveness.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenCoach}
                        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Talk to TRUSTLY Coach</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 text-xs text-zinc-400 leading-relaxed">
                      Relationships grow when we choose curiosity and regular presence.
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* HISTORY TAB */
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Your Check-ins</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Private reflections and shared summaries across time.
                </p>
              </div>

              {loadingHistory ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <span className="text-xs font-mono">Loading reflections...</span>
                </div>
              ) : historyItems.length === 0 ? (
                /* EMPTY STATE */
                <div className="glass-card rounded-2xl p-8 text-center border border-white/5 my-4 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-2">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No check-ins yet.</h4>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                    Your reflections will appear here. Start your first check-in to build mutual rhythm.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('checkin');
                      setStep(1);
                    }}
                    className="mt-3 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Start Check-In
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Today Group */}
                  {todayEntries.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 px-1">
                        Today
                      </span>
                      {todayEntries.map((item) => renderHistoryCard(item))}
                    </div>
                  )}

                  {/* This Week Group */}
                  {thisWeekEntries.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 px-1">
                        This Week
                      </span>
                      {thisWeekEntries.map((item) => renderHistoryCard(item))}
                    </div>
                  )}

                  {/* Previous Group */}
                  {previousEntries.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-1">
                        Previous
                      </span>
                      {previousEntries.map((item) => renderHistoryCard(item))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function renderHistoryCard(item: UserCheckIn) {
    const isExpanded = expandedEntryId === item.id;
    return (
      <div 
        key={item.id} 
        className="glass-card rounded-2xl p-4 border border-white/10 space-y-2.5 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{item.feelingEmoji || '❤️'}</span>
            <div>
              <span className="text-xs font-bold text-white block">
                {item.feeling}
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                {item.date}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {item.shareWithPartner ? (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Share2 className="w-2.5 h-2.5" /> Summary Shared
              </span>
            ) : (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-zinc-800 text-zinc-400 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-zinc-400" /> Private
              </span>
            )}

            {item.reflection && (
              <button
                type="button"
                onClick={() => setExpandedEntryId(isExpanded ? null : (item.id || null))}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                title={isExpanded ? 'Hide reflection' : 'View private reflection'}
              >
                {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {item.areas && item.areas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.areas.map((area) => (
              <span 
                key={area} 
                className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-white/5"
              >
                {area}
              </span>
            ))}
          </div>
        )}

        {/* Shared summary preview */}
        {item.sharedSummary && (
          <div className="p-2 rounded-xl bg-purple-950/20 border border-purple-500/20 text-[11px] text-purple-200 leading-snug">
            <span className="text-purple-400 font-semibold block text-[10px]">Shared with partner:</span>
            "{item.sharedSummary}"
          </div>
        )}

        {/* Private reflection expandable */}
        {isExpanded && item.reflection && (
          <div className="p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-[11px] text-zinc-200 leading-relaxed animate-fadeIn">
            <span className="text-rose-400 font-semibold block text-[10px] flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Private Reflection:
            </span>
            {item.reflection}
          </div>
        )}
      </div>
    );
  }
};
