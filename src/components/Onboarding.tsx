import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  ShieldCheck, 
  Users, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Copy, 
  Share2, 
  Sparkles, 
  Camera, 
  Trash2, 
  Loader2, 
  User, 
  Calendar, 
  HeartHandshake, 
  Plus,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { CONNECTION_TYPE_OPTIONS, ConnectionType } from '../types';
import { getConnectionLabel } from '../lib/connection';
import { CONNECTION_IMAGES } from '../config/images';
import { TrustlyImage } from './TrustlyImage';
import { InitialsAvatar } from './InitialsAvatar';
import { validateImageFile, optimizeImageFile } from '../lib/imageOptimizer';
import { storage, auth } from '../lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

interface OnboardingProps {
  onBackToLanding: () => void;
  onFinishedOnboarding: () => void;
  onOpenAuthForPairing: (pendingData?: any) => void;
}

type OnboardingStep = 'welcome' | 'principles' | 'relationship' | 'profile' | 'connection' | 'success';

export const Onboarding: React.FC<OnboardingProps> = ({
  onBackToLanding,
  onFinishedOnboarding,
  onOpenAuthForPairing
}) => {
  const { 
    currentUser, 
    userProfile, 
    updateUserProfile, 
    createCouple, 
    validateInviteCode, 
    confirmJoinCouple 
  } = useAuth();

  const [step, setStep] = useState<OnboardingStep>('welcome');

  // Step 1 & 2: Relationship choice
  const [selectedConnectionType, setSelectedConnectionType] = useState<ConnectionType>('partner');

  // Step 3: Profile setup
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [birthday, setBirthday] = useState(userProfile?.dateOfBirth || userProfile?.birthday || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(userProfile?.photoURL || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Step 4: Connection creation / joining
  const [connectionMode, setConnectionMode] = useState<'create' | 'join'>('create');
  const [partnerName, setPartnerName] = useState('');
  const [generatedInviteCode, setGeneratedInviteCode] = useState('');
  const [createdSpaceId, setCreatedSpaceId] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [sharedLink, setSharedLink] = useState(false);

  // Join mode state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinPreview, setJoinPreview] = useState<{ couple: any; creatorName: string } | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // General loading & error states
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.displayName && !displayName) {
      setDisplayName(userProfile.displayName);
    }
    if (userProfile?.photoURL && !photoURL) {
      setPhotoURL(userProfile.photoURL);
      setPhotoPreview(userProfile.photoURL);
    }
  }, [userProfile]);

  // Handle Photo selection
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setPhotoError(validation.error || 'Invalid image file.');
      return;
    }

    try {
      setUploadingPhoto(true);
      const optimized = await optimizeImageFile(file, 600, 0.85);
      setPhotoFile(optimized);
      
      const objectUrl = URL.createObjectURL(optimized);
      setPhotoPreview(objectUrl);

      // If user is authenticated, upload directly to Firebase Storage
      if (currentUser) {
        try {
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileRef = storageRef(storage, `users/${currentUser.uid}/profile/${Date.now()}_${sanitizedName}`);
          await uploadBytes(fileRef, optimized, { contentType: optimized.type });
          const downloadUrl = await getDownloadURL(fileRef);
          setPhotoURL(downloadUrl);
        } catch (storageErr) {
          console.warn("Storage upload notice (falling back to local preview):", storageErr);
        }
      }
    } catch (err: any) {
      console.error("Photo process error:", err);
      setPhotoError("Could not process image. Please try another photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoURL('');
    setPhotoError(null);
  };

  // Skip onboarding handler
  const handleSkip = async () => {
    if (currentUser) {
      try {
        await updateUserProfile({
          onboardingCompleted: true
        });
        onFinishedOnboarding();
      } catch (e) {
        console.warn("Skip notice:", e);
        onFinishedOnboarding();
      }
    } else {
      onBackToLanding();
    }
  };

  // Profile Save & Next
  const handleProfileSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setErrorMsg("Please enter your display name to continue.");
      return;
    }

    setErrorMsg(null);
    setIsSaving(true);

    try {
      if (currentUser) {
        await updateUserProfile({
          displayName: trimmedName,
          bio: bio.trim(),
          dateOfBirth: birthday || undefined,
          birthday: birthday || undefined,
          photoURL: photoURL || undefined,
          relationshipType: getConnectionLabel(selectedConnectionType),
          connectionType: selectedConnectionType
        });
        setStep('connection');
      } else {
        // Unauthenticated visitor: collect data and prompt auth modal
        onOpenAuthForPairing({
          displayName: trimmedName,
          bio: bio.trim(),
          birthday,
          photoURL,
          relationshipType: getConnectionLabel(selectedConnectionType),
          connectionType: selectedConnectionType
        });
      }
    } catch (err: any) {
      console.error("Profile submit error:", err);
      setErrorMsg(err.message || "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Generate Invite Code for Connection
  const handleCreateConnection = async () => {
    if (!currentUser) {
      onOpenAuthForPairing({
        relationshipType: getConnectionLabel(selectedConnectionType),
        connectionType: selectedConnectionType
      });
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const spaceTitle = partnerName.trim()
        ? `${displayName || 'User'} & ${partnerName.trim()}`
        : `${getConnectionLabel(selectedConnectionType)} Space`;

      const newCouple = await createCouple(
        spaceTitle,
        getConnectionLabel(selectedConnectionType),
        selectedConnectionType
      );

      setGeneratedInviteCode(newCouple.inviteCode);
      setCreatedSpaceId(newCouple.id);
    } catch (err: any) {
      console.error("Connection creation error:", err);
      setErrorMsg(err.message || "Failed to create connection. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Validate Join Code
  const handleValidateJoinCode = async () => {
    if (!joinCodeInput.trim()) {
      setErrorMsg("Please enter an invitation code.");
      return;
    }

    setErrorMsg(null);
    setIsValidatingCode(true);

    try {
      const result = await validateInviteCode(joinCodeInput.trim());
      setJoinPreview(result);
    } catch (err: any) {
      console.error("Validate code error:", err);
      setErrorMsg(err.message || "That invitation code is invalid or no longer available.");
    } finally {
      setIsValidatingCode(false);
    }
  };

  // Confirm Join
  const handleConfirmJoin = async () => {
    if (!joinPreview) return;
    setIsJoining(true);
    setErrorMsg(null);

    try {
      await confirmJoinCouple(joinPreview.couple.id);
      setStep('success');
    } catch (err: any) {
      console.error("Confirm join error:", err);
      setErrorMsg(err.message || "Failed to join this connection space.");
    } finally {
      setIsJoining(false);
    }
  };

  // Complete Onboarding
  const handleFinish = async () => {
    if (currentUser) {
      try {
        await updateUserProfile({
          onboardingCompleted: true
        });
      } catch (e) {
        console.warn("Complete onboarding notice:", e);
      }
    }
    onFinishedOnboarding();
  };

  const handleCopyCode = async () => {
    if (!generatedInviteCode) return;
    try {
      await navigator.clipboard.writeText(generatedInviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (e) {
      console.warn("Clipboard copy fallback");
    }
  };

  const handleShareInvite = async () => {
    if (!generatedInviteCode) return;
    const shareText = `Join my private ${getConnectionLabel(selectedConnectionType)} space on TRUSTLY using invite code: ${generatedInviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TRUSTLY Private Connection',
          text: shareText,
          url: window.location.origin
        });
        setSharedLink(true);
      } catch (err) {
        // User cancelled or share dismissed
      }
    } else {
      handleCopyCode();
    }
  };

  const relationshipLabel = getConnectionLabel(selectedConnectionType);

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between py-6 px-4 sm:px-6 selection:bg-violet-500/20 selection:text-violet-200 animate-fadeIn">
      {/* Container max width 720-800px on desktop */}
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-center my-auto">
        
        {/* Progress Header Bar (Shown on Steps 2 to 5) */}
        {step !== 'welcome' && step !== 'success' && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setErrorMsg(null);
                  if (step === 'principles') setStep('welcome');
                  else if (step === 'relationship') setStep('principles');
                  else if (step === 'profile') setStep('relationship');
                  else if (step === 'connection') setStep('profile');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                <span className={step === 'relationship' || step === 'profile' || step === 'connection' ? 'text-violet-400 font-bold' : ''}>
                  {step === 'principles' ? 'Introduction' : step === 'relationship' ? '1. Relationship' : step === 'profile' ? '2. Profile' : '3. Connection'}
                </span>
              </div>
            </div>

            {/* Progress line */}
            <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-600 via-pink-600 to-indigo-600 transition-all duration-300"
                style={{
                  width: step === 'principles' ? '25%' : step === 'relationship' ? '50%' : step === 'profile' ? '75%' : '100%'
                }}
              />
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white text-sm">
              ✕
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* 1. WELCOME SCREEN */}
        {/* =================================================================== */}
        {step === 'welcome' && (
          <div className="space-y-6 text-center animate-fadeIn py-4">
            {/* Abstract Connection Visual */}
            <div className="relative w-28 h-28 mx-auto rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-tr from-violet-600/20 via-pink-600/15 to-indigo-600/20 shadow-2xl p-1 flex items-center justify-center">
              <div className="w-full h-full rounded-[22px] bg-zinc-950 flex items-center justify-center text-violet-400">
                <Users className="w-12 h-12 text-violet-400" />
              </div>
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Relationships deserve clarity.
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                A private space for the relationships that matter to you.
              </p>
            </div>

            {/* Highlights Box */}
            <div className="glass-card rounded-3xl p-5 border border-white/10 text-left max-w-md mx-auto space-y-3 bg-zinc-900/40">
              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <div className="w-7 h-7 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400 shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <span>Private by default. Shared only when you choose.</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <div className="w-7 h-7 rounded-xl bg-pink-500/15 flex items-center justify-center text-pink-400 shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span>Works for partners, parents, family, and best friends.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 max-w-sm mx-auto space-y-3">
              <button
                onClick={() => setStep('principles')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-600 to-indigo-600 text-white font-bold text-sm shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleSkip}
                className="w-full py-3 rounded-xl bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 2. TRUSTLY PRINCIPLES */}
        {/* =================================================================== */}
        {step === 'principles' && (
          <div className="space-y-6 animate-fadeIn py-2">
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Built on Three Principles
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                How TRUSTLY keeps your connections safe, healthy, and transparent.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              {/* Card 1 */}
              <div className="glass-card rounded-3xl p-5 border border-white/10 bg-zinc-900/60 space-y-3 flex flex-col justify-between shadow-lg">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Private by default</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Your personal reflections stay yours unless you choose to share them.
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="glass-card rounded-3xl p-5 border border-white/10 bg-zinc-900/60 space-y-3 flex flex-col justify-between shadow-lg">
                <div className="w-10 h-10 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Shared by choice</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    You decide what becomes visible to each connection.
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="glass-card rounded-3xl p-5 border border-white/10 bg-zinc-900/60 space-y-3 flex flex-col justify-between shadow-lg">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Built for real relationships</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Use TRUSTLY with a partner, parent, family member, friend, best friend, crush, or anyone who matters to you.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 max-w-sm mx-auto">
              <button
                onClick={() => setStep('relationship')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-600 to-indigo-600 text-white font-bold text-sm shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 3. WHO DO YOU WANT TO CONNECT WITH? */}
        {/* =================================================================== */}
        {step === 'relationship' && (
          <div className="space-y-6 animate-fadeIn py-2">
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Who would you like to connect with?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                Select the first relationship you want to create a space for. You can add more connections later.
              </p>
            </div>

            {/* All Options Grid (Simultaneously visible, no collapsed dropdown) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {CONNECTION_TYPE_OPTIONS.map((opt) => {
                const isSelected = selectedConnectionType === opt.type;
                const visualImg = CONNECTION_IMAGES[opt.type as keyof typeof CONNECTION_IMAGES] || CONNECTION_IMAGES.other;

                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedConnectionType(opt.type)}
                    className={`p-4 rounded-3xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-br from-violet-600/20 via-pink-600/15 to-violet-600/10 border-violet-500 shadow-lg shadow-violet-500/15 ring-1 ring-violet-500/50'
                        : 'bg-zinc-900/60 hover:bg-zinc-900 border-white/5 hover:border-white/20 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                        <TrustlyImage
                          src={visualImg}
                          alt={opt.label}
                          fallbackType="connection"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'bg-violet-600 border-violet-400 text-white' : 'border-zinc-700'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-violet-200 transition-colors">
                        {opt.label}
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Multiple connections reassurance footer */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5 text-center text-xs text-zinc-400 max-w-md mx-auto">
              <span>You can add more connections later for parents, best friends, or partners.</span>
            </div>

            <div className="pt-2 max-w-sm mx-auto">
              <button
                onClick={() => setStep('profile')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-600 to-indigo-600 text-white font-bold text-sm shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <span>Continue to Profile Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 4. PROFILE SETUP */}
        {/* =================================================================== */}
        {step === 'profile' && (
          <div className="space-y-6 animate-fadeIn py-2 max-w-md mx-auto w-full">
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Create your profile
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Only your display name is required. You can adjust privacy settings at any time.
              </p>
            </div>

            {/* Profile Photo Uploader */}
            <div className="flex flex-col items-center justify-center space-y-3 pt-2">
              <div className="relative">
                <InitialsAvatar
                  name={displayName || 'User'}
                  photoURL={photoPreview || photoURL}
                  size="xl"
                  className="w-24 h-24 text-2xl shadow-xl ring-4 ring-white/5"
                />

                <label
                  htmlFor="onboarding-photo-upload"
                  className="absolute bottom-0 right-0 p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-lg cursor-pointer transition-transform hover:scale-105"
                  title="Upload profile photo"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    id="onboarding-photo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Photo</span>
                </button>
              )}

              {uploadingPhoto && (
                <div className="flex items-center gap-1.5 text-xs text-violet-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing photo...</span>
                </div>
              )}

              {photoError && (
                <p className="text-xs text-rose-400">{photoError}</p>
              )}
            </div>

            {/* Profile Form */}
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Display Name <strong className="text-rose-400">*</strong></span>
                  <span className="text-[10px] text-zinc-500 font-normal">Required</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex, Jordan, Sam"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 transition-colors shadow-inner"
                />
              </div>

              {/* Bio (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>About me</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Optional</span>
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Something about you..."
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-violet-500 transition-colors resize-none shadow-inner"
                />
              </div>

              {/* Birthday (Optional, Private by default) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Birthday</span>
                  <span className="text-[10px] text-emerald-400 font-normal flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Private by default
                  </span>
                </label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors shadow-inner"
                />
                <p className="text-[10px] text-zinc-500">
                  Your birthday stays private unless you choose to share it.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSaving || !displayName.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-600 to-indigo-600 text-white font-bold text-sm shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Continue to Connection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =================================================================== */}
        {/* 5. CREATE OR JOIN CONNECTION */}
        {/* =================================================================== */}
        {step === 'connection' && (
          <div className="space-y-6 animate-fadeIn py-2 max-w-md mx-auto w-full">
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Create your first connection
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Selected connection: <strong className="text-violet-300 font-semibold">{relationshipLabel}</strong>
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="p-1 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center">
              <button
                type="button"
                onClick={() => setConnectionMode('create')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  connectionMode === 'create'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Invite Someone
              </button>
              <button
                type="button"
                onClick={() => setConnectionMode('join')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  connectionMode === 'join'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Join with Code
              </button>
            </div>

            {/* TAB A: CREATE & INVITE */}
            {connectionMode === 'create' && (
              <div className="space-y-4">
                {!generatedInviteCode ? (
                  <div className="glass-card rounded-3xl p-5 border border-white/10 bg-zinc-900/60 space-y-4 shadow-xl">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        What's their name? <span className="text-[10px] text-zinc-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        placeholder={`e.g. ${relationshipLabel === 'Parent' ? 'Mom' : relationshipLabel === 'Best Friend' ? 'Arun' : 'Sarah'}`}
                        className="w-full px-4 py-3 rounded-2xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 transition-colors shadow-inner"
                      />
                    </div>

                    <button
                      onClick={handleCreateConnection}
                      disabled={isSaving}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-violet-600/20 hover:opacity-95 active:scale-[0.985] cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Generate Invite Code</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Invite Generated Screen */
                  <div className="glass-card rounded-3xl p-6 border border-violet-500/30 bg-violet-500/[0.04] text-center space-y-4 shadow-xl animate-fadeIn">
                    <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/30 text-violet-400 mx-auto flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">
                        Invite {partnerName.trim() || relationshipLabel}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                        Share this single-use code with them to connect securely.
                      </p>
                    </div>

                    {/* Code Display */}
                    <div className="p-4 rounded-2xl bg-zinc-950/90 border border-white/10 space-y-1 shadow-inner">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Invite Code</span>
                      <span className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-violet-300">
                        {generatedInviteCode}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleCopyCode}
                        className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                        <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                      </button>

                      <button
                        onClick={handleShareInvite}
                        className="flex-1 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share Invite</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <button
                        onClick={() => setStep('success')}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>Continue to Connection</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB B: JOIN EXISTING CONNECTION */}
            {connectionMode === 'join' && (
              <div className="space-y-4">
                {!joinPreview ? (
                  <div className="glass-card rounded-3xl p-5 border border-white/10 bg-zinc-900/60 space-y-4 shadow-xl">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Enter Invite Code
                      </label>
                      <input
                        type="text"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        placeholder="e.g. TRUST-ABCDE"
                        className="w-full px-4 py-3 rounded-2xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 font-mono text-sm uppercase tracking-wider focus:outline-none focus:border-violet-500 transition-colors shadow-inner"
                      />
                    </div>

                    <button
                      onClick={handleValidateJoinCode}
                      disabled={isValidatingCode || !joinCodeInput.trim()}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-violet-600/20 hover:opacity-95 active:scale-[0.985] cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isValidatingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Find Connection</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Join Preview Confirmation */
                  <div className="glass-card rounded-3xl p-6 border border-emerald-500/30 bg-emerald-500/[0.04] text-center space-y-4 shadow-xl animate-fadeIn">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        You're about to join
                      </span>
                      <h3 className="text-lg font-bold text-white mt-1">
                        {joinPreview.couple.name || 'Private Connection Space'}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Invited by <strong className="text-zinc-200">{joinPreview.creatorName}</strong> ({joinPreview.couple.relationshipType || 'Connection'})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => {
                          setJoinPreview(null);
                          setJoinCodeInput('');
                        }}
                        className="flex-1 py-3 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Decline
                      </button>

                      <button
                        onClick={handleConfirmJoin}
                        disabled={isJoining}
                        className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 transition-all"
                      >
                        {isJoining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        <span>Accept & Join</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* 6. SUCCESS SCREEN */}
        {/* =================================================================== */}
        {step === 'success' && (
          <div className="space-y-6 text-center animate-fadeIn py-6 max-w-md mx-auto w-full">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-violet-500/20 to-pink-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Your connection is ready.
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
                TRUSTLY gives you a private space to build clarity together.
              </p>
            </div>

            {/* Showcase Card */}
            <div className="glass-card rounded-3xl p-5 border border-white/10 text-left bg-zinc-900/60 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3.5">
                <InitialsAvatar
                  name={partnerName || relationshipLabel}
                  size="md"
                />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {partnerName.trim() || relationshipLabel}
                  </h3>
                  <span className="text-[10px] text-violet-300 font-medium">
                    {relationshipLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active</span>
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={handleFinish}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-600 to-indigo-600 text-white font-bold text-sm shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <span>Open Connection</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
