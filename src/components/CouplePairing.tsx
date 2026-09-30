import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Heart, 
  Copy, 
  Check, 
  Share2, 
  ArrowRight, 
  AlertCircle, 
  Sparkles, 
  Users, 
  X, 
  CheckCircle2, 
  ChevronLeft,
  KeyRound,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { CoupleSpace } from '../types';

interface CouplePairingProps {
  initialMode?: 'options' | 'create' | 'join';
  onSuccess: () => void;
  onCancel?: () => void;
}

export const CouplePairing: React.FC<CouplePairingProps> = ({ 
  initialMode = 'options', 
  onSuccess,
  onCancel
}) => {
  const { 
    userProfile, 
    coupleSpace, 
    partnerProfile,
    createCouple, 
    validateInviteCode, 
    confirmJoinCouple 
  } = useAuth();

  // Determine initial mode: if user already created a waiting couple, show invitation screen directly!
  const [mode, setMode] = useState<'options' | 'create' | 'invite' | 'join' | 'confirm' | 'connected'>(() => {
    if (coupleSpace && coupleSpace.status === 'waiting') {
      return 'invite';
    }
    return initialMode;
  });

  const [spaceNameInput, setSpaceNameInput] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [createdCouple, setCreatedCouple] = useState<CoupleSpace | null>(coupleSpace || null);
  const [pendingConfirmation, setPendingConfirmation] = useState<{ couple: CoupleSpace; creatorName: string } | null>(null);

  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // REAL-TIME AUTO UPDATE: If creator is on the invite screen, listen for partner connection
  useEffect(() => {
    if (coupleSpace && (coupleSpace.status === 'connected' || (coupleSpace.memberIds && coupleSpace.memberIds.length >= 2))) {
      setMode('connected');
    }
  }, [coupleSpace]);

  // Handler: CREATE COUPLE
  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = spaceNameInput.trim();
    if (!trimmed) {
      setErrorMsg("Please give your couple space a name.");
      return;
    }
    if (trimmed.length > 50) {
      setErrorMsg("Space name should be 50 characters or fewer.");
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const couple = await createCouple(trimmed, userProfile?.relationshipType || 'Dating');
      setCreatedCouple(couple);
      setMode('invite');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to create Couple Space. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handler: SUBMIT INVITE CODE (Validates code before showing confirmation)
  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    let code = inviteCodeInput.trim().toUpperCase().replace(/\s+/g, '');
    if (!code) {
      setErrorMsg("Please enter an invitation code.");
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const result = await validateInviteCode(code);
      setPendingConfirmation(result);
      setMode('confirm');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Invitation not found. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handler: CONFIRM JOIN
  const handleConfirmConnect = async () => {
    if (!pendingConfirmation) return;
    setErrorMsg('');
    setLoading(true);
    try {
      await confirmJoinCouple(pendingConfirmation.couple.id);
      setMode('connected');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to connect to Couple Space. Please try again.");
      setMode('join');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareCode = async (code: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my TRUSTLY Couple Space',
          text: `Join me on TRUSTLY to build clearer communication and trust. Here is our private code: ${code}`,
          url: window.location.origin
        });
      } catch {
        copyCode(code);
      }
    } else {
      copyCode(code);
    }
  };

  const activeCoupleToDisplay = createdCouple || coupleSpace;

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 max-w-md mx-auto px-5 py-8 flex flex-col justify-between selection:bg-rose-500/20 selection:text-rose-200">
      <div>
        {/* Navigation Bar / Back button */}
        <div className="flex items-center justify-between mb-6">
          {mode !== 'options' && mode !== 'connected' ? (
            <button
              onClick={() => {
                setErrorMsg('');
                if (mode === 'confirm') setMode('join');
                else if (mode === 'invite') setMode('options');
                else setMode('options');
              }}
              className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white flex items-center gap-1 text-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {onCancel && mode !== 'connected' && (
            <button
              onClick={onCancel}
              className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-3.5 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 1. MODE: OPTIONS (Create Couple Space vs Join with Code) */}
        {/* ========================================================= */}
        {mode === 'options' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center pt-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 mx-auto flex items-center justify-center mb-4 shadow-xl shadow-rose-500/20">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Your Couple Space is waiting.
              </h1>
              <p className="text-xs text-zinc-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Create a private space and invite your partner.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              {/* Primary: Create Couple Space */}
              <button
                onClick={() => {
                  setErrorMsg('');
                  setMode('create');
                }}
                className="w-full p-5 rounded-3xl bg-zinc-900/90 border border-white/10 hover:border-rose-500/40 text-left transition-all group flex items-start justify-between shadow-xl cursor-pointer"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-base text-zinc-100 group-hover:text-rose-300 transition-colors">
                    Create Couple Space
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-[240px]">
                    Name your space, generate a private code, and invite your partner.
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-rose-400 transition-all transform group-hover:translate-x-1" />
              </button>

              {/* Secondary: Join with Code */}
              <button
                onClick={() => {
                  setErrorMsg('');
                  setMode('join');
                }}
                className="w-full p-5 rounded-3xl bg-zinc-900/90 border border-white/10 hover:border-indigo-500/40 text-left transition-all group flex items-start justify-between shadow-xl cursor-pointer"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-base text-zinc-100 group-hover:text-indigo-300 transition-colors">
                    Join with Code
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-[240px]">
                    Have an invitation code from your partner? Enter it here to link.
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400 transition-all transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. MODE: CREATE COUPLE (Name Input & Creation) */}
        {/* ========================================================= */}
        {mode === 'create' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center pt-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 mx-auto flex items-center justify-center mb-3 text-rose-400">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Create your Couple Space
              </h1>
              <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto">
                Name your shared world. You can change this anytime.
              </p>
            </div>

            <form onSubmit={handleCreateSpace} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Give your space a name
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  placeholder={`${userProfile?.displayName || 'Umar'} & Partner`}
                  value={spaceNameInput}
                  onChange={(e) => setSpaceNameInput(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 focus:border-rose-500 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all shadow-inner"
                />
                <span className="text-[10px] text-zinc-500 mt-1.5 block">
                  e.g. "Umar & Partner", "Our Haven", "Alex & Jordan"
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || !spaceNameInput.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Space & Generating Code...</span>
                  </>
                ) : (
                  <>
                    <span>Create Space</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. MODE: INVITATION SCREEN (Waiting for partner) */}
        {/* ========================================================= */}
        {mode === 'invite' && activeCoupleToDisplay && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center pt-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-rose-500/20">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Invite your partner
              </h1>
              <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto">
                Share this code with the person you want to connect with.
              </p>
            </div>

            {/* Premium Code Card */}
            <div className="glass-card rounded-3xl p-6 border border-white/10 text-center relative overflow-hidden shadow-2xl">
              <span className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold block mb-2">
                {activeCoupleToDisplay.name || 'Our Couple Space'}
              </span>

              <div className="my-3 py-3 px-4 rounded-2xl bg-zinc-950/80 border border-white/10 inline-block shadow-inner">
                <span className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-white selection:bg-rose-500">
                  {activeCoupleToDisplay.inviteCode}
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 mt-2 max-w-xs mx-auto">
                Your partner enters this code in TRUSTLY to connect with you.
              </p>
            </div>

            {/* Action Buttons: Copy Code / Share Invitation / Done */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => copyCode(activeCoupleToDisplay.inviteCode)}
                  className="py-3 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                  <span>{copied ? 'Code Copied!' : 'Copy Code'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => shareCode(activeCoupleToDisplay.inviteCode)}
                  className="py-3 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-zinc-400" />
                  <span>Share Invitation</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onSuccess}
                className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 font-medium text-xs border border-white/10 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* Real-time waiting indicator */}
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex items-center justify-center gap-3 text-center">
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs text-zinc-300 font-medium">
                Waiting for your partner…
              </span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. MODE: JOIN COUPLE (Input Code) */}
        {/* ========================================================= */}
        {mode === 'join' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center pt-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mx-auto flex items-center justify-center mb-3 text-indigo-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Join your Couple Space
              </h1>
              <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto">
                Enter the invitation code from your partner.
              </p>
            </div>

            <form onSubmit={handleValidateCode} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Invitation Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="TRUST-_____"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-950/80 border border-white/10 focus:border-indigo-500 rounded-2xl px-4 py-3.5 text-base font-mono tracking-wider text-white placeholder-zinc-600 focus:outline-none transition-all shadow-inner"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1.5 block">
                  Example: TRUST-X7K4P (Case-insensitive)
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || !inviteCodeInput.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-rose-600 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating Code...</span>
                  </>
                ) : (
                  <>
                    <span>Join Couple Space</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. MODE: CONFIRMATION (Verify Couple Space Name & Creator) */}
        {/* ========================================================= */}
        {mode === 'confirm' && pendingConfirmation && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center pt-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center mb-3 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Connect to this Couple Space?
              </h1>
              <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto">
                Confirm you want to link your account to this private space.
              </p>
            </div>

            {/* Space Details Card */}
            <div className="glass-card rounded-3xl p-6 border border-white/10 text-center space-y-3">
              <span className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold block">
                Target Couple Space
              </span>
              <h3 className="text-xl font-bold text-white">
                {pendingConfirmation.couple.name}
              </h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Created by <strong>{pendingConfirmation.creatorName}</strong></span>
              </div>
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto pt-2">
                Your private reflections and journals stay private. Only consented shared check-ins and goals will be shared.
              </p>
            </div>

            {/* Buttons: Connect and Cancel */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleConfirmConnect}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting Partner...</span>
                  </>
                ) : (
                  <>
                    <span>Connect</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMode('join')}
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-medium text-xs border border-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. MODE: SUCCESS STATE (You're connected) */}
        {/* ========================================================= */}
        {mode === 'connected' && (
          <div className="space-y-6 text-center animate-scaleUp pt-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 mx-auto flex items-center justify-center mb-3 shadow-2xl shadow-rose-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                You're connected.
              </h1>
              <p className="text-xs text-zinc-400 mt-1.5">
                Your private Couple Space is ready.
              </p>
            </div>

            {/* Visual Two-Node Connection with Real User Initials or Photo */}
            <div className="glass-card rounded-3xl p-6 border border-white/10 my-4 flex items-center justify-center gap-4 sm:gap-6">
              {/* User Node */}
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full border-2 border-rose-500/60 overflow-hidden bg-zinc-900 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}</span>
                  )}
                </div>
                <span className="text-[11px] text-zinc-300 font-semibold mt-2 truncate max-w-[80px]">
                  {userProfile?.displayName || 'You'}
                </span>
              </div>

              {/* Connected Heart Bridge */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 animate-pulse">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                </div>
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold mt-1">
                  Connected
                </span>
              </div>

              {/* Partner Node */}
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full border-2 border-indigo-500/60 overflow-hidden bg-zinc-900 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {partnerProfile?.photoURL ? (
                    <img src={partnerProfile.photoURL} alt={partnerProfile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{partnerProfile?.displayName?.charAt(0).toUpperCase() || 'P'}</span>
                  )}
                </div>
                <span className="text-[11px] text-zinc-300 font-semibold mt-2 truncate max-w-[80px]">
                  {partnerProfile?.displayName || 'Partner'}
                </span>
              </div>
            </div>

            <button
              onClick={onSuccess}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-sm shadow-xl shadow-rose-600/25 active:scale-[0.985] transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              <span>Enter Couple Space →</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Safe Area / Privacy Note */}
      <div className="text-center pt-6 text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>End-to-end private. Voluntary consent only.</span>
      </div>
    </div>
  );
};
