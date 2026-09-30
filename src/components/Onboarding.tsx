import React, { useState } from 'react';
import { 
  Heart, 
  ShieldCheck, 
  ArrowRight, 
  Check, 
  ChevronLeft,
  Lock,
  MessageSquare,
  Users,
  Copy,
  Share2,
  Sparkles,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface OnboardingFlowProps {
  onBackToLanding: () => void;
  onFinishedOnboarding: () => void;
  onOpenAuthForPairing: (pendingData?: any) => void;
}

export const Onboarding: React.FC<OnboardingFlowProps> = ({ 
  onBackToLanding, 
  onFinishedOnboarding,
  onOpenAuthForPairing
}) => {
  const { currentUser, userProfile, updateUserProfile, createCouple, joinCouple } = useAuth();

  // Screen stages:
  // 1: Step 1 (Purpose)
  // 2: Step 2 (What Matters)
  // 3: Step 3 (Relationship)
  // 4: Completion Screen
  // 5: Decision Screen (Create or Join)
  // 6: Create Couple Space
  // 7: Join Couple Space
  const [screen, setScreen] = useState<number>(1);

  // State collected during 3 steps
  const [purposes, setPurposes] = useState<string[]>([]);
  const [matters, setMatters] = useState<string[]>([]);
  const [relationshipType, setRelationshipType] = useState<string>('Dating');

  // Space creation state
  const [spaceName, setSpaceName] = useState<string>(
    userProfile?.displayName ? `${userProfile.displayName} & Partner` : 'Our Space'
  );
  const [createdInviteCode, setCreatedInviteCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Space join state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 Options
  const purposeOptions = [
    { id: 'trust', title: 'Build stronger trust', emoji: '❤️', desc: 'Deepen emotional safety and reliable consistency' },
    { id: 'communication', title: 'Communicate better', emoji: '💬', desc: 'Express feelings without triggering defensiveness' },
    { id: 'understand', title: 'Understand each other', emoji: '🧠', desc: 'Discover how your partner perceives situations' },
    { id: 'boundaries', title: 'Set healthy boundaries', emoji: '🤝', desc: 'Clarify expectations with respect and gentleness' },
    { id: 'grow', title: 'Grow together', emoji: '✨', desc: 'Create shared habits, goals, and mutual dreams' },
  ];

  // Step 2 Options
  const mattersOptions = [
    'Communication',
    'Trust',
    'Quality Time',
    'Emotional Connection',
    'Boundaries',
    'Understanding',
    'Honesty',
    'Shared Goals',
  ];

  // Step 3 Options
  const relationshipOptions = [
    { type: 'partner', label: 'Partner / Lover', emoji: '❤️', desc: 'Romantic partner, spouse, or lover' },
    { type: 'parent', label: 'Parent', emoji: '👨‍👩‍👦', desc: 'Mom, dad, or parental figure' },
    { type: 'family', label: 'Family', emoji: '👨‍👩‍👧', desc: 'Sibling, relative, or child' },
    { type: 'best_friend', label: 'Best Friend', emoji: '🧑‍🤝‍🧑', desc: 'Closest friend and confidant' },
    { type: 'friend', label: 'Friend', emoji: '🤝', desc: 'Good friend or peer' },
    { type: 'crush', label: 'Crush', emoji: '💭', desc: 'Someone you are interested in' },
    { type: 'other', label: 'Other', emoji: '👥', desc: 'Any meaningful relationship' },
  ];

  const togglePurpose = (title: string) => {
    if (purposes.includes(title)) {
      setPurposes(purposes.filter(p => p !== title));
    } else {
      setPurposes([...purposes, title]);
    }
  };

  const toggleMatter = (item: string) => {
    if (matters.includes(item)) {
      setMatters(matters.filter(m => m !== item));
    } else {
      setMatters([...matters, item]);
    }
  };

  // Step progression
  const handleNextFromStep1 = () => {
    if (purposes.length > 0) setScreen(2);
  };

  const handleNextFromStep2 = () => {
    if (matters.length > 0) setScreen(3);
  };

  const handleNextFromStep3 = async () => {
    // Persist to user profile if user is already authenticated
    if (currentUser) {
      try {
        await updateUserProfile({
          onboardingGoals: purposes,
          focusAreas: matters,
          relationshipType,
          relationshipStatus: relationshipType,
          onboardingCompleted: true
        });
      } catch (e) {
        console.warn("Profile update notice during onboarding:", e);
      }
    }
    setScreen(4); // Completion transition screen
  };

  // Completion to Decision
  const handleProceedToCreate = () => {
    if (!currentUser) {
      onOpenAuthForPairing({ purposes, matters, relationshipType, targetScreen: 'create' });
      return;
    }
    setScreen(6); // Directly to Create Screen
  };

  const handleProceedToJoin = () => {
    if (!currentUser) {
      onOpenAuthForPairing({ purposes, matters, relationshipType, targetScreen: 'join' });
      return;
    }
    setScreen(7); // Directly to Join Screen
  };

  // Action: Create Space
  const handleCreateSpaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuthForPairing({ purposes, matters, relationshipType, targetScreen: 'create' });
      return;
    }

    setIsSubmitting(true);
    try {
      const couple = await createCouple(relationshipType, spaceName);
      setCreatedInviteCode(couple.inviteCode);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Join Space
  const handleJoinSpaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    if (!currentUser) {
      onOpenAuthForPairing({ purposes, matters, relationshipType, targetScreen: 'join' });
      return;
    }

    setIsSubmitting(true);
    setJoinError('');
    try {
      const success = await joinCouple(joinCodeInput.trim());
      if (success) {
        onFinishedOnboarding();
      } else {
        setJoinError("We couldn't find that invitation. Check the code and try again.");
      }
    } catch (err: any) {
      setJoinError("We couldn't find that invitation. Check the code and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const shareInvitation = async (code: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join our TRUSTLY Space',
          text: `Join me on TRUSTLY to build stronger trust and communicate clearly. Here is our private code: ${code}`,
          url: window.location.origin
        });
      } catch (e) {
        copyCode(code);
      }
    } else {
      copyCode(code);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between max-w-md md:max-w-lg mx-auto px-5 sm:px-6 py-5 relative select-none">
      
      {/* Subtle ambient lighting */}
      <div 
        aria-hidden="true" 
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[450px] h-[350px] rounded-full bg-gradient-to-b from-rose-600/10 via-violet-600/10 to-transparent blur-[120px] pointer-events-none" 
      />

      {/* TOP HEADER: Clean Back Link + 01 / 03 Progress (Shown on steps 1, 2, 3) */}
      {screen <= 3 && (
        <div className="w-full pt-1 mb-6 z-10">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                if (screen === 1) onBackToLanding();
                else setScreen(screen - 1);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer py-1"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
              <span>Back</span>
            </button>

            {/* Numerical Progress Indicator */}
            <span className="font-mono text-xs font-semibold tracking-wider text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              0{screen} / 03
            </span>
          </div>

          {/* Animated Slim Progress Bar */}
          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-rose-500 via-fuchsia-400 to-violet-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(screen / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* STEP ONE: PURPOSE */}
      {/* ========================================================== */}
      {screen === 1 && (
        <div className="flex-1 flex flex-col justify-between animate-fadeIn z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1.5">
              What brings you here?
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mb-6 leading-relaxed">
              Every relationship is different. Tell us what you want to build.
            </p>

            <div className="space-y-3">
              {purposeOptions.map((opt) => {
                const isSelected = purposes.includes(opt.title);
                return (
                  <button
                    key={opt.id}
                    onClick={() => togglePurpose(opt.title)}
                    className={`w-full p-4 rounded-2xl text-left transition-all duration-200 flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? 'bg-rose-500/[0.12] border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.15)] scale-[1.01]'
                        : 'bg-zinc-900/60 hover:bg-zinc-900/90 border-white/[0.07] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 pr-2">
                      <span className="text-2xl shrink-0 filter drop-shadow-sm">{opt.emoji}</span>
                      <div>
                        <div className={`font-semibold text-sm transition-colors ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                          {opt.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                          {opt.desc}
                        </div>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-rose-500 border-rose-500 text-white shadow-[0_0_8px_#f43f5e]'
                        : 'border-zinc-700 bg-zinc-950/60'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom CTA */}
          <div className="pt-6 pb-2">
            <button
              onClick={handleNextFromStep1}
              disabled={purposes.length === 0}
              className={`w-full py-4 rounded-2xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
                purposes.length === 0
                  ? 'bg-zinc-900 text-zinc-500 border border-white/5 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:opacity-95 active:scale-[0.985] ring-1 ring-white/20'
              }`}
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* STEP TWO: WHAT MATTERS */}
      {/* ========================================================== */}
      {screen === 2 && (
        <div className="flex-1 flex flex-col justify-between animate-fadeIn z-10">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                What matters most to you?
              </h1>
            </div>
            
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs sm:text-sm text-zinc-400">
                Choose the areas you'd like to focus on.
              </p>
              {matters.length > 0 && (
                <span className="text-[11px] font-semibold text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 shrink-0">
                  {matters.length} selected
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {mattersOptions.map((item) => {
                const isSelected = matters.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleMatter(item)}
                    className={`p-3.5 rounded-2xl text-left transition-all duration-200 flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? 'bg-rose-500/[0.14] border-rose-500/60 text-white shadow-[0_0_15px_rgba(244,63,94,0.12)] scale-[1.01]'
                        : 'bg-zinc-900/60 hover:bg-zinc-900/90 border-white/[0.07] text-zinc-300 hover:text-white'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-semibold truncate pr-2">
                      {item}
                    </span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-rose-500 border-rose-500 text-white'
                        : 'border-zinc-700 bg-zinc-950/60'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom CTA */}
          <div className="pt-6 pb-2">
            <button
              onClick={handleNextFromStep2}
              disabled={matters.length === 0}
              className={`w-full py-4 rounded-2xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
                matters.length === 0
                  ? 'bg-zinc-900 text-zinc-500 border border-white/5 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:opacity-95 active:scale-[0.985] ring-1 ring-white/20'
              }`}
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* STEP THREE: RELATIONSHIP */}
      {/* ========================================================== */}
      {screen === 3 && (
        <div className="flex-1 flex flex-col justify-between animate-fadeIn z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1.5">
              Who would you like to connect with?
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mb-6 leading-relaxed">
              TRUSTLY helps you build better communication with the people who matter.
            </p>

            <div className="space-y-3">
              {relationshipOptions.map((opt) => {
                const isSelected = relationshipType === opt.label || relationshipType === opt.type;
                return (
                  <button
                    key={opt.type}
                    onClick={() => setRelationshipType(opt.label)}
                    className={`w-full p-4 rounded-2xl text-left transition-all duration-200 flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? 'bg-rose-500/[0.14] border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.15)] scale-[1.01]'
                        : 'bg-zinc-900/60 hover:bg-zinc-900/90 border-white/[0.07] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-2xl shrink-0">{opt.emoji}</span>
                      <div>
                        <div className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                          {opt.label}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {opt.desc}
                        </div>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-rose-500 border-rose-500 text-white' : 'border-zinc-700 bg-zinc-950/60'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}

              {/* Skip for now option */}
              <button
                onClick={() => {
                  setRelationshipType('Connection');
                  handleNextFromStep3();
                }}
                className="w-full py-3 px-4 rounded-xl text-center text-xs font-medium border border-transparent text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
              >
                Skip for now
              </button>
            </div>
          </div>

          {/* Sticky Bottom CTA */}
          <div className="pt-6 pb-2">
            <button
              onClick={handleNextFromStep3}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer ring-1 ring-white/20"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SCREEN 4: COMPLETION TRANSITION */}
      {/* ========================================================== */}
      {screen === 4 && (
        <div className="flex-1 flex flex-col justify-between py-6 text-center animate-scaleUp z-10">
          <div className="flex-1 flex flex-col items-center justify-center">
            
            {/* Large Animated TRUSTLY Symbol */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-rose-500 via-fuchsia-600 to-violet-600 p-[2px] shadow-[0_0_40px_rgba(244,63,94,0.35)] mb-6 animate-trust-node">
              <div className="w-full h-full rounded-3xl bg-zinc-950 flex items-center justify-center border border-white/15">
                <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-rose-400 fill-rose-500/80 filter drop-shadow-md" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              Let's build something stronger.
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 mb-8 max-w-xs">
              Your private space is ready.
            </p>

            {/* Three small core principles */}
            <div className="w-full max-w-xs space-y-2.5 text-left mb-8">
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.07] flex items-center gap-3">
                <span className="text-base shrink-0">🔐</span>
                <span className="text-xs font-medium text-zinc-300">Private by default</span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.07] flex items-center gap-3">
                <span className="text-base shrink-0">🤝</span>
                <span className="text-xs font-medium text-zinc-300">Shared by choice</span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.07] flex items-center gap-3">
                <span className="text-base shrink-0">💬</span>
                <span className="text-xs font-medium text-zinc-300">Built for better conversations</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 w-full">
            <button
              onClick={() => setScreen(5)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white font-semibold text-base shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer flex items-center justify-center gap-2 ring-1 ring-white/20"
            >
              <span>Create My Space</span>
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>

            <button
              onClick={handleProceedToJoin}
              className="w-full py-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 text-zinc-300 font-medium text-xs border border-white/10 hover:border-white/20 cursor-pointer transition-all"
            >
              I already have an invitation
            </button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SCREEN 5: CREATE / JOIN DECISION */}
      {/* ========================================================== */}
      {screen === 5 && (
        <div className="flex-1 flex flex-col justify-between py-2 animate-fadeIn z-10">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setScreen(4)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1.5">
              What would you like to do?
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mb-6 leading-relaxed">
              Begin a shared journey or connect with your partner's existing code.
            </p>

            <div className="space-y-4">
              
              {/* Card 1: Create a Connection Space */}
              <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/70 border border-white/10 hover:border-rose-500/40 transition-all shadow-xl group">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-white mb-1 group-hover:text-rose-300 transition-colors uppercase tracking-wider">
                  CREATE A CONNECTION
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Start a private space and invite the person you want to connect with.
                </p>
                <button
                  onClick={handleProceedToCreate}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:opacity-95 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <span>Create Connection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 2: Join a Connection Space */}
              <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/70 border border-white/10 hover:border-violet-500/40 transition-all shadow-xl group">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-white mb-1 group-hover:text-violet-300 transition-colors uppercase tracking-wider">
                  JOIN A CONNECTION
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Have an invitation code? Enter it to link your connection.
                </p>
                <button
                  onClick={handleProceedToJoin}
                  className="w-full py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white font-semibold text-xs border border-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <span>Join Connection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>

          <div className="pt-6 text-center">
            <span className="text-[11px] text-zinc-500">
              You can disconnect or manage your space at any time in Settings.
            </span>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SCREEN 6: CREATE COUPLE SPACE */}
      {/* ========================================================== */}
      {screen === 6 && (
        <div className="flex-1 flex flex-col justify-between py-2 animate-fadeIn z-10">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setScreen(5)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1.5">
              Your Couple Space
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mb-6 leading-relaxed">
              Create a quiet, private world for the two of you.
            </p>

            {!createdInviteCode ? (
              <form onSubmit={handleCreateSpaceSubmit} className="space-y-4">
                <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-3">
                  <label className="block text-xs font-semibold text-zinc-200">
                    What should we call your space?
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Umar & Partner"
                    value={spaceName}
                    onChange={(e) => setSpaceName(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[11px] text-zinc-400">
                    You can change this anytime.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !spaceName.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white font-semibold text-sm shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer flex items-center justify-center gap-2 ring-1 ring-white/20"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Generate Invitation Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-5 animate-scaleUp">
                {/* Code Revealed Display */}
                <div className="glass-card rounded-3xl p-6 border border-white/15 text-center relative overflow-hidden shadow-2xl">
                  <span className="text-[11px] uppercase tracking-wider text-rose-300 font-bold block mb-2">
                    Invitation Code
                  </span>

                  <div className="my-3 py-3 px-5 rounded-2xl bg-zinc-950 border border-rose-500/40 inline-flex items-center gap-3 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                    <span className="text-2xl sm:text-3xl font-mono font-extrabold tracking-widest text-white">
                      {createdInviteCode}
                    </span>
                    <button
                      onClick={() => copyCode(createdInviteCode)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Copy code"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 max-w-xs mx-auto mt-2 leading-relaxed">
                    Your partner will need this code to join.
                  </p>

                  <div className="flex gap-2.5 mt-5">
                    <button
                      onClick={() => copyCode(createdInviteCode)}
                      className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-white/5 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>

                    <button
                      onClick={() => shareInvitation(createdInviteCode)}
                      className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Invitation</span>
                    </button>
                  </div>
                </div>

                {/* Privacy reassurance */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-400 leading-snug">
                    Nothing is shared with your partner until you choose to share it.
                  </p>
                </div>

                <button
                  onClick={onFinishedOnboarding}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white font-semibold text-sm shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer flex items-center justify-center gap-2 ring-1 ring-white/20"
                >
                  <span>Enter My Space</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 text-center">
            <span className="text-[11px] text-zinc-500">
              Only one partner connection per space is permitted.
            </span>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SCREEN 7: JOIN COUPLE SPACE */}
      {/* ========================================================== */}
      {screen === 7 && (
        <div className="flex-1 flex flex-col justify-between py-2 animate-fadeIn z-10">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setScreen(5)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1.5">
              Enter your invitation code
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mb-6 leading-relaxed">
              Connect directly into the private couple space your partner generated.
            </p>

            {joinError && (
              <div className="p-3.5 mb-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoinSpaceSubmit} className="space-y-4">
              <div className="glass-card rounded-3xl p-6 border border-white/10 text-center">
                <input
                  type="text"
                  required
                  placeholder="TRUST-8F4K2"
                  value={joinCodeInput}
                  onChange={(e) => {
                    setJoinCodeInput(e.target.value.toUpperCase());
                    setJoinError('');
                  }}
                  className="w-full bg-zinc-950 border border-white/15 rounded-2xl px-4 py-4 text-center font-mono text-xl sm:text-2xl font-extrabold tracking-widest text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                />
                <p className="text-[11px] text-zinc-400 mt-2.5">
                  Codes look like: <span className="text-zinc-300 font-mono font-medium">TRUST-XXXXX</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !joinCodeInput.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-rose-600 text-white font-semibold text-sm shadow-[0_0_25px_rgba(139,92,246,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer flex items-center justify-center gap-2 ring-1 ring-white/20 transition-all"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Join Couple Space</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="pt-6 text-center">
            <p className="text-xs text-zinc-400 leading-snug">
              Need a code? Ask your partner to open TRUSTLY and tap "Create Space".
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
