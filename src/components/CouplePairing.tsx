import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Sparkles, 
  KeyRound, 
  ArrowRight, 
  ChevronLeft, 
  Check, 
  Copy, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  X,
  Lock,
  Trash2
} from 'lucide-react';
import { CoupleSpace, ConnectionType, CONNECTION_TYPE_OPTIONS } from '../types';
import { getConnectionLabel, getConnectionEmoji } from '../lib/connection';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
    createCouple, 
    validateInviteCode, 
    confirmJoinCouple 
  } = useAuth();

  const [mode, setMode] = useState<
    'options' | 'type_select' | 'create_form' | 'invite' | 'join' | 'confirm' | 'connected'
  >(() => {
    if (coupleSpace && coupleSpace.status === 'waiting') {
      return 'invite';
    }
    if (initialMode === 'create') return 'type_select';
    return initialMode;
  });

  const [selectedConnectionType, setSelectedConnectionType] = useState<ConnectionType | null>(null);
  const [spaceNameInput, setSpaceNameInput] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [activeCoupleDoc, setActiveCoupleDoc] = useState<CoupleSpace | null>(coupleSpace || null);
  const [pendingConfirmation, setPendingConfirmation] = useState<{ couple: CoupleSpace; creatorName: string } | null>(null);

  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (coupleSpace && (coupleSpace.status === 'connected' || (coupleSpace.memberIds && coupleSpace.memberIds.length >= 2))) {
      setMode('connected');
    }
  }, [coupleSpace?.status]);

  const handleSelectType = (type: ConnectionType) => {
    setSelectedConnectionType(type);
    setErrorMsg('');
  };

  const handleConfirmTypeSelection = () => {
    if (!selectedConnectionType) {
      setErrorMsg("Please choose a connection type to continue.");
      return;
    }
    const label = getConnectionLabel(selectedConnectionType);
    const myName = userProfile?.displayName || 'My';
    setSpaceNameInput(`${myName} & ${label}`);
    setMode('create_form');
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnectionType) return;
    const trimmed = spaceNameInput.trim();
    if (!trimmed) {
      setErrorMsg("Please give your connection space a name.");
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const couple = await createCouple(trimmed, 'General', selectedConnectionType);
      setActiveCoupleDoc(couple);
      setMode('invite');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to create invitation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async () => {
    const docId = activeCoupleDoc?.id || coupleSpace?.id;
    if (!docId) return;

    setErrorMsg('');
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'couples', docId));
      setActiveCoupleDoc(null);
      setMode('options');
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Could not cancel invitation securely. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
      setErrorMsg(err.message || "Invalid or expired invitation code.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmConnect = async () => {
    if (!pendingConfirmation) return;
    setErrorMsg('');
    setLoading(true);
    try {
      await confirmJoinCouple(pendingConfirmation.couple.id);
      setMode('connected');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to accept connection. Please try again.");
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
          title: 'Join my TRUSTLY Connection',
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

  const getCustomTypeInviteLabel = (type: ConnectionType | null) => {
    if (!type) return 'Connection';
    if (type === 'partner') return 'Partner';
    if (type === 'family') return 'Family Member';
    return getConnectionLabel(type);
  };

  return (
    <div className="w-full max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto py-4 px-2 sm:px-4 animate-fadeIn">
      {/* Top Header / Back Bar */}
      <div className="flex items-center justify-between mb-6">
        {mode !== 'options' && mode !== 'connected' ? (
          <button
            onClick={() => {
              setErrorMsg('');
              if (mode === 'type_select') setMode('options');
              else if (mode === 'create_form') setMode('type_select');
              else if (mode === 'invite') setMode('options');
              else if (mode === 'join') setMode('options');
              else if (mode === 'confirm') setMode('join');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 text-zinc-300 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        ) : <div />}

        {onCancel && mode !== 'connected' && (
          <button
            onClick={onCancel}
            className="p-2 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white p-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 1: OPTIONS (Create or Join) */}
      {/* ========================================================= */}
      {mode === 'options' && (
        <div className="space-y-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 mx-auto flex items-center justify-center shadow-xl shadow-rose-500/20">
            <Users className="w-8 h-8 text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Your Connection Space is waiting.
            </h1>
            <p className="text-xs text-zinc-400 mt-2 max-w-xs mx-auto leading-relaxed">
              Connect with someone important to you — a partner, parent, family member, best friend, friend, or anyone who matters.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                setErrorMsg('');
                setMode('type_select');
              }}
              className="w-full p-5 rounded-3xl bg-zinc-900/90 border border-white/10 hover:border-rose-500/40 text-left transition-all group flex items-start justify-between shadow-xl cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-white group-hover:text-rose-300 transition-colors">
                  Create Connection
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-[240px]">
                  Choose who you want to connect with, name your space, and generate a code.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-rose-400 transition-all transform group-hover:translate-x-1" />
            </button>

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
                <h3 className="font-semibold text-base text-white group-hover:text-indigo-300 transition-colors">
                  Join Connection
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-[240px]">
                  Have an invitation code? Enter it here to link your connection space.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400 transition-all transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: TYPE SELECTION */}
      {/* ========================================================= */}
      {mode === 'type_select' && (
        <div className="space-y-6 max-w-xl mx-auto">
          <div className="text-center max-w-md mx-auto">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Who would you like to connect with?
            </h1>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Choose the type of connection you want to create.
            </p>
          </div>

          {/* 7-Type Selection Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4 pt-2">
            {CONNECTION_TYPE_OPTIONS.map((opt) => {
              const isSelected = selectedConnectionType === opt.type;
              return (
                <button
                  key={opt.type}
                  onClick={() => handleSelectType(opt.type)}
                  className={`relative rounded-3xl overflow-hidden text-left transition-all cursor-pointer shadow-lg active:scale-95 flex flex-col justify-end h-48 border group ${
                    isSelected
                      ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-rose-500/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Premium Picture Background */}
                  {opt.image && (
                    <img 
                      src={opt.image} 
                      alt={opt.label} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-115 filter brightness-[0.7] contrast-[1.05]"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  {/* Gradient Vignette to ensure maximum text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

                  {/* Text Details */}
                  <div className="relative p-4 z-10 space-y-1">
                    <h3 className="font-extrabold text-xs sm:text-sm text-white flex items-center justify-between">
                      <span>{opt.label}</span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md animate-scaleUp shrink-0">
                          ✓
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-zinc-300 leading-snug line-clamp-2">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Confirm Continue Button */}
          {selectedConnectionType && (
            <div className="pt-4 flex justify-center animate-fadeIn">
              <button
                onClick={handleConfirmTypeSelection}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-rose-600/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 3: CREATE FORM */}
      {/* ========================================================= */}
      {mode === 'create_form' && selectedConnectionType && (
        <div className="space-y-6 max-w-md mx-auto">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-2xl flex items-center justify-center mx-auto mb-3">
              {getConnectionEmoji(selectedConnectionType)}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Invite your {getCustomTypeInviteLabel(selectedConnectionType)}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Create a private connection with someone important to you.
            </p>
          </div>

          <form onSubmit={handleCreateSpace} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Connection Space Name
              </label>
              <input
                type="text"
                required
                maxLength={50}
                placeholder={`${userProfile?.displayName || 'My'} & ${getConnectionLabel(selectedConnectionType)}`}
                value={spaceNameInput}
                onChange={(e) => setSpaceNameInput(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 focus:border-rose-500 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !spaceNameInput.trim()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating invitation...</span>
                </>
              ) : (
                <>
                  <span>Create Invitation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 4: INVITATION SCREEN (Waiting) */}
      {/* ========================================================= */}
      {mode === 'invite' && (
        <div className="space-y-6 text-center max-w-md mx-auto">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-2xl flex items-center justify-center mx-auto mb-3">
              {getConnectionEmoji(activeCoupleDoc?.connectionType || coupleSpace?.connectionType)}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Waiting for connection
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Your invitation is ready. Status: <strong className="text-amber-400 animate-pulse font-semibold">Waiting for acceptance...</strong>
            </p>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-white/10 text-center space-y-4 shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold block">
                {getCustomTypeInviteLabel(activeCoupleDoc?.connectionType as ConnectionType || coupleSpace?.connectionType as ConnectionType)} Invitation
              </span>
              <span className="text-[11px] text-zinc-400 block">
                Space Name: <strong className="text-white">{activeCoupleDoc?.name || coupleSpace?.name}</strong>
              </span>
            </div>

            <div className="py-3 px-5 rounded-2xl bg-zinc-950 border border-white/10 inline-block shadow-inner">
              <span className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-amber-300 selection:bg-rose-500/20">
                {activeCoupleDoc?.inviteCode || coupleSpace?.inviteCode}
              </span>
            </div>

            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Share this code only with the person you want to connect with.
            </p>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => copyCode(activeCoupleDoc?.inviteCode || coupleSpace?.inviteCode || '')}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>

              <button
                onClick={() => shareCode(activeCoupleDoc?.inviteCode || coupleSpace?.inviteCode || '')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-600 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Invite</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 space-y-2">
            <button
              onClick={onSuccess}
              className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs border border-white/10 cursor-pointer"
            >
              Back to My Connections
            </button>

            <button
              onClick={handleCancelInvitation}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Cancel Invitation</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 5: JOIN CONNECTION */}
      {/* ========================================================= */}
      {mode === 'join' && (
        <div className="space-y-6 max-w-md mx-auto">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Join Connection
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Enter the invitation code shared with you.
            </p>
          </div>

          <form onSubmit={handleValidateCode} className="space-y-4">
            <div>
              <input
                type="text"
                required
                placeholder="TRUST-XXXXX"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 focus:border-indigo-500 rounded-2xl px-4 py-3.5 text-center font-mono text-lg font-bold tracking-widest text-white uppercase placeholder-zinc-600 focus:outline-none transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !inviteCodeInput.trim()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <span>Join Connection</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 6: INVITATION PREVIEW & ACCEPTANCE */}
      {/* ========================================================= */}
      {mode === 'confirm' && pendingConfirmation && (
        <div className="space-y-6 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 animate-bounce">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              You've been invited to connect.
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Validate and link securely to this shared connection.
            </p>
          </div>

          <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-4">
            <div className="space-y-2 text-xs text-left">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-zinc-400">Invited By:</span>
                <span className="text-white font-semibold">{pendingConfirmation.creatorName}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-zinc-400">Connection Type:</span>
                <span className="text-rose-400 font-bold">{getCustomTypeInviteLabel(pendingConfirmation.couple.connectionType as ConnectionType)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-zinc-400">Space Name:</span>
                <span className="text-white font-semibold italic">"{pendingConfirmation.couple.name}"</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed text-left">
              Only chosen shared moments, goals, or reflections appear here. Your personal private records are strictly owner-only.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={handleConfirmConnect}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Accepting...</span>
                </>
              ) : (
                <span>Accept Connection</span>
              )}
            </button>

            <button
              onClick={() => {
                setErrorMsg('');
                setMode('join');
              }}
              className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-semibold text-xs border border-white/5 cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 7: CONNECTED SUCCESS */}
      {/* ========================================================= */}
      {mode === 'connected' && (
        <div className="space-y-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              ● Connected
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Your secure connection space is ready.
            </p>
          </div>

          <button
            onClick={onSuccess}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            Open Connection Space →
          </button>
        </div>
      )}
    </div>
  );
};
