import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  doc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ConversationTopicCategory, 
  ConversationStarterDoc, 
  ConversationStarterContent,
  SharedConversationStarter 
} from '../types';
import { buildConversationStarter, ConversationStarterResult } from '../lib/gemini';
import { sendPartnerNotification } from '../lib/notifications';
import { 
  X, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  ShieldCheck, 
  Info, 
  MessageSquare, 
  Share2, 
  History, 
  Send, 
  Loader2, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  AlertTriangle, 
  PhoneCall,
  Clock,
  Heart,
  CreditCard,
  Users,
  Target,
  HelpCircle
} from 'lucide-react';

interface ConversationStartersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCoachWithTopic?: (topic: string) => void;
  initialTab?: 'create' | 'history';
}

const CATEGORIES: { name: ConversationTopicCategory; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { name: 'Communication', icon: MessageSquare, desc: 'Tone, listening, or how we speak to each other' },
  { name: 'Quality Time', icon: Clock, desc: 'Distractions, busy schedules, or dedicated time' },
  { name: 'Affection', icon: Heart, desc: 'Warmth, tenderness, or emotional closeness' },
  { name: 'Trust', icon: ShieldCheck, desc: 'Transparency, reassurance, or agreements' },
  { name: 'Money', icon: CreditCard, desc: 'Spending, saving, or shared financial goals' },
  { name: 'Family', icon: Users, desc: 'Boundaries, family dynamics, or commitments' },
  { name: 'Future', icon: Target, desc: 'Shared vision, life milestones, or next steps' },
  { name: 'Personal Feelings', icon: Sparkles, desc: 'Vulnerability, individual stress, or inner mood' },
  { name: 'Something Else', icon: HelpCircle, desc: 'Any other dynamic you would like to explore' },
];

export const ConversationStartersModal: React.FC<ConversationStartersModalProps> = ({
  isOpen,
  onClose,
  onOpenCoachWithTopic,
  initialTab = 'create'
}) => {
  const { userProfile, coupleSpace } = useAuth();

  const [activeTab, setActiveTab] = useState<'create' | 'history'>(initialTab);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<ConversationTopicCategory>('Communication');
  const [userReflection, setUserReflection] = useState<string>('');
  
  // Generated Starter State
  const [generatedContent, setGeneratedContent] = useState<ConversationStarterContent>({
    feeling: '',
    discuss: '',
    starter: ''
  });
  const [isSafetyAlert, setIsSafetyAlert] = useState(false);
  const [safetyGuidance, setSafetyGuidance] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeStarterId, setActiveStarterId] = useState<string | null>(null);
  const [starterStatus, setStarterStatus] = useState<'private' | 'shared'>('private');

  // Confirmation modal state before sharing
  const [showShareConfirm, setShowShareConfirm] = useState(false);

  // History State
  const [historyItems, setHistoryItems] = useState<ConversationStarterDoc[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadHistory();
      if (initialTab === 'create' && step === 1) {
        resetForm();
      }
    }
  }, [isOpen, initialTab, userProfile]);

  const resetForm = () => {
    setStep(1);
    setSelectedCategory('Communication');
    setUserReflection('');
    setGeneratedContent({ feeling: '', discuss: '', starter: '' });
    setIsSafetyAlert(false);
    setSafetyGuidance(null);
    setIsEditing(false);
    setActiveStarterId(null);
    setStarterStatus('private');
    setShowShareConfirm(false);
    setErrorMsg(null);
  };

  const loadHistory = async () => {
    if (!userProfile) return;
    setLoadingHistory(true);
    try {
      const q = query(collection(db, 'users', userProfile.uid, 'conversationStarters'));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ConversationStarterDoc));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setHistoryItems(items);
    } catch (e) {
      console.warn("Could not load conversation starters history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const result: ConversationStarterResult = await buildConversationStarter(
        selectedCategory,
        userReflection
      );

      if (result.isSafetyAlert) {
        setIsSafetyAlert(true);
        setSafetyGuidance(result.safetyGuidance || null);
      } else {
        setIsSafetyAlert(false);
        setSafetyGuidance(null);
      }

      setGeneratedContent({
        feeling: result.feeling,
        discuss: result.discuss,
        starter: result.starter
      });
      setStep(3);
    } catch (err: any) {
      console.error("Generate conversation error:", err);
      setErrorMsg("Unable to generate conversation starter right now. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePrivately = async () => {
    if (!userProfile) return;
    setLoading(true);
    setErrorMsg(null);

    const starterId = activeStarterId || `starter_${Date.now()}`;
    const docData: ConversationStarterDoc = {
      id: starterId,
      userId: userProfile.uid,
      coupleId: coupleSpace?.id || null,
      category: selectedCategory,
      originalReflection: userReflection.trim() || undefined,
      content: generatedContent,
      status: starterStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'users', userProfile.uid, 'conversationStarters', starterId), docData);
      setActiveStarterId(starterId);
      await loadHistory();
      setActiveTab('history');
    } catch (err: any) {
      console.error("Save conversation starter error:", err);
      setErrorMsg("Failed to save. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmShareWithPartner = async () => {
    if (!userProfile || !coupleSpace?.id) return;
    setLoading(true);
    setErrorMsg(null);

    const starterId = activeStarterId || `starter_${Date.now()}`;

    try {
      // 1. Save or update in user's private collection
      const privateDocData: ConversationStarterDoc = {
        id: starterId,
        userId: userProfile.uid,
        coupleId: coupleSpace.id,
        category: selectedCategory,
        originalReflection: userReflection.trim() || undefined,
        content: generatedContent,
        status: 'shared',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', userProfile.uid, 'conversationStarters', starterId), privateDocData);

      // 2. Share ONLY sanitized content in couple-scoped collection (NO raw private reflection)
      const sharedDocData: SharedConversationStarter = {
        id: starterId,
        coupleId: coupleSpace.id,
        userId: userProfile.uid,
        userDisplayName: userProfile.displayName || 'Partner',
        category: selectedCategory,
        content: generatedContent,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'couples', coupleSpace.id, 'sharedConversations', starterId), sharedDocData);

      // 3. Gracefully notify partner
      try {
        const partnerId = coupleSpace.memberIds?.find(id => id !== userProfile.uid);
        if (partnerId) {
          await sendPartnerNotification(
            partnerId,
            `${userProfile.displayName || 'Your partner'} shared a conversation starter`,
            `Topic: ${selectedCategory} — "${generatedContent.starter}"`,
            'note'
          );
        }
      } catch (e) {
        console.warn("Notice sending notification:", e);
      }

      setStarterStatus('shared');
      setActiveStarterId(starterId);
      setShowShareConfirm(false);
      await loadHistory();
      setActiveTab('history');
    } catch (err: any) {
      console.error("Share conversation error:", err);
      setErrorMsg("Failed to share with partner. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, wasShared: boolean) => {
    if (!userProfile) return;
    try {
      await deleteDoc(doc(db, 'users', userProfile.uid, 'conversationStarters', id));

      if (wasShared && coupleSpace?.id) {
        try {
          await deleteDoc(doc(db, 'couples', coupleSpace.id, 'sharedConversations', id));
        } catch (e) {
          console.warn("Notice deleting shared counterpart:", e);
        }
      }

      setHistoryItems(prev => prev.filter(item => item.id !== id));
      if (activeStarterId === id) {
        resetForm();
      }
    } catch (err) {
      console.error("Delete conversation starter error:", err);
    }
  };

  const handleOpenFromHistory = (item: ConversationStarterDoc) => {
    setSelectedCategory(item.category);
    setUserReflection(item.originalReflection || '');
    setGeneratedContent(item.content);
    setActiveStarterId(item.id || null);
    setStarterStatus(item.status);
    setIsEditing(false);
    setStep(3);
    setActiveTab('create');
  };

  const handleOpenCoach = () => {
    const topic = `I want to discuss "${selectedCategory}" with my partner. I'm thinking of starting with: "${generatedContent.starter}". How can I say this calmly and keep our emotional connection safe?`;
    onClose();
    if (onOpenCoachWithTopic) {
      onOpenCoachWithTopic(topic);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Glow accents */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('create')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Conversation Builder
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
              <span>Your Starters</span>
              {historyItems.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-purple-500/30 text-[10px] text-purple-200">
                  {historyItems.length}
                </span>
              )}
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

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 relative z-10 no-scrollbar">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'create' ? (
            <>
              {/* Stepper Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Step {step} of 3</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Lock className="w-2.5 h-2.5" /> Private by default
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${(step / 3) * 100}%` }}
                  />
                </div>
              </div>

              {/* STEP 1: SELECT TOPIC */}
              {step === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      What would you like to talk about?
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Choose the area you want to bring up with kindness and mutual respect.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat.name;
                      const Icon = cat.icon;
                      return (
                        <button
                          type="button"
                          key={cat.name}
                          onClick={() => setSelectedCategory(cat.name)}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-violet-500/15 border-violet-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-violet-500/40'
                              : 'bg-zinc-900/60 border-white/5 hover:border-white/15 text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-violet-400">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-violet-500 border-violet-400 text-white' : 'border-zinc-700'
                            }`}>
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

              {/* STEP 2: DESCRIBE THE SITUATION */}
              {step === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-semibold mb-2">
                      <span>{selectedCategory}</span>
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      What's on your mind?
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Share what you're feeling or what happened. Optional—minimal details are fine.
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={5}
                      value={userReflection}
                      onChange={(e) => setUserReflection(e.target.value)}
                      placeholder="Tell TRUSTLY what you're feeling or what happened..."
                      className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                      <span> This text stays private to your account.</span>
                      <span>{userReflection.length}/600</span>
                    </div>
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
                      disabled={isGenerating}
                      onClick={handleGenerate}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Crafting Gentle Starter...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate Conversation Starter</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: CONVERSATION BUILDER RESULT */}
              {step === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Safety Guidance Callout if triggered */}
                  {isSafetyAlert && (
                    <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-left space-y-2.5 animate-fadeIn">
                      <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Supportive Safety Notice</span>
                      </div>
                      <p className="text-xs text-rose-200/90 leading-relaxed">
                        {safetyGuidance}
                      </p>
                      <div className="pt-1">
                        <a 
                          href="tel:18007997233" 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Call 1-800-799-7233 (Confidential Support)</span>
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 block">
                        Category: {selectedCategory}
                      </span>
                      <h2 className="text-base font-bold text-white tracking-tight">
                        Your Conversation Starter
                      </h2>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEditing(!isEditing)}
                        className={`text-xs px-2.5 py-1 rounded-xl font-medium border flex items-center gap-1 cursor-pointer transition-all ${
                          isEditing 
                            ? 'bg-rose-500 text-white border-rose-400' 
                            : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isEditing ? 'Done Editing' : 'Edit'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="text-xs p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-white/10 cursor-pointer"
                        title="Regenerate"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* 3-Part Structured Cards */}
                  <div className="space-y-3">
                    {/* Part 1: WHAT I'M FEELING */}
                    <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1">
                        <span></span> WHAT I'M FEELING
                      </span>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={generatedContent.feeling}
                          onChange={(e) => setGeneratedContent({ ...generatedContent, feeling: e.target.value })}
                          className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                        />
                      ) : (
                        <p className="text-xs text-zinc-200 font-medium leading-relaxed">
                          "{generatedContent.feeling}"
                        </p>
                      )}
                    </div>

                    {/* Part 2: WHAT I WANT TO DISCUSS */}
                    <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                        <span></span> WHAT I WANT TO DISCUSS
                      </span>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={generatedContent.discuss}
                          onChange={(e) => setGeneratedContent({ ...generatedContent, discuss: e.target.value })}
                          className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                        />
                      ) : (
                        <p className="text-xs text-zinc-200 font-medium leading-relaxed">
                          "{generatedContent.discuss}"
                        </p>
                      )}
                    </div>

                    {/* Part 3: A GENTLE WAY TO START */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/20 via-purple-950/20 to-zinc-900/80 border border-rose-500/25 space-y-1.5 shadow-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                        <span></span> A GENTLE WAY TO START
                      </span>
                      {isEditing ? (
                        <textarea
                          rows={3}
                          value={generatedContent.starter}
                          onChange={(e) => setGeneratedContent({ ...generatedContent, starter: e.target.value })}
                          className="w-full bg-zinc-950/80 border border-rose-500/30 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
                        />
                      ) : (
                        <p className="text-xs text-rose-100 font-semibold leading-relaxed">
                          "{generatedContent.starter}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* AI Coach Helper Option */}
                  <div className="p-3.5 rounded-2xl bg-violet-950/30 border border-violet-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-violet-200 block">Need help saying it?</span>
                      <span className="text-[10px] text-violet-300/80">Refine tone or prepare for a gentle discussion with TRUSTLY Coach.</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenCoach}
                      className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-sm transition-all"
                    >
                      Talk to Coach
                    </button>
                  </div>

                  {/* User Control Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleSavePrivately}
                        className="flex-1 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold text-xs border border-white/10 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Lock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Save Privately</span>
                      </button>

                      {coupleSpace?.id ? (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => setShowShareConfirm(true)}
                          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share with Partner</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="flex-1 py-3 rounded-2xl bg-zinc-900/50 text-zinc-500 font-semibold text-xs border border-white/5 flex items-center justify-center gap-1.5 cursor-not-allowed"
                          title="Connect with a partner to share"
                        >
                          <Share2 className="w-3.5 h-3.5 text-zinc-600" />
                          <span>Pair to Share</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-full py-2 text-[11px] text-zinc-400 hover:text-zinc-200 text-center cursor-pointer"
                    >
                      ← Back to edit situation
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* HISTORY TAB */
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Your Conversation Starters</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Saved topics to help you bring up what matters with care.
                </p>
              </div>

              {loadingHistory ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <span className="text-xs font-mono">Loading saved starters...</span>
                </div>
              ) : historyItems.length === 0 ? (
                /* EMPTY STATE */
                <div className="glass-card rounded-2xl p-8 text-center border border-white/5 my-4 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto mb-2">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Nothing here yet.</h4>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                    When something is on your mind, TRUSTLY can help you find the words.
                  </p>
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab('create');
                    }}
                    className="mt-3 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-rose-600/20"
                  >
                    Start a Conversation
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.map((item) => {
                    const isExpanded = expandedId === item.id;
                    return (
                      <div 
                        key={item.id} 
                        className="glass-card rounded-2xl p-4 border border-white/10 space-y-2.5 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/5 text-zinc-200 border border-white/10">
                              {item.category}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {item.status === 'shared' ? (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <Share2 className="w-2.5 h-2.5" /> Shared
                              </span>
                            ) : (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-zinc-800 text-zinc-400 flex items-center gap-1 border border-white/5">
                                <Lock className="w-2.5 h-2.5" /> Private
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenFromHistory(item)}
                              className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                              title="Open & Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => item.id && handleDelete(item.id, item.status === 'shared')}
                              className="p-1 text-zinc-400 hover:text-rose-400 cursor-pointer"
                              title="Delete starter"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Starter Summary */}
                        <p className="text-xs text-rose-200/90 font-medium leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5">
                          "{item.content.starter}"
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : (item.id || null))}
                            className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide Details' : 'View Breakdown'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const topic = `Regarding ${item.category}: "${item.content.starter}". How can I discuss this with my partner with warmth?`;
                              onClose();
                              if (onOpenCoachWithTopic) onOpenCoachWithTopic(topic);
                            }}
                            className="text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Ask Coach</span>
                          </button>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="space-y-2 pt-2 border-t border-white/5 text-[11px] animate-fadeIn">
                            <div>
                              <span className="text-violet-400 font-bold block text-[10px]">WHAT I'M FEELING:</span>
                              <p className="text-zinc-300">{item.content.feeling}</p>
                            </div>
                            <div>
                              <span className="text-indigo-400 font-bold block text-[10px]">WHAT I WANT TO DISCUSS:</span>
                              <p className="text-zinc-300">{item.content.discuss}</p>
                            </div>
                            {item.originalReflection && (
                              <div className="p-2 rounded-lg bg-zinc-950 border border-white/5">
                                <span className="text-zinc-500 font-bold block text-[9px] flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5 text-zinc-500" /> Private Reflection (Never shared with partner):
                                </span>
                                <p className="text-zinc-400 text-[10px] mt-0.5">{item.originalReflection}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* STEP 4 CONFIRMATION SCREEN BEFORE SHARING */}
        {showShareConfirm && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md p-6 flex flex-col justify-between animate-fadeIn">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
                <Share2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  Share Conversation Starter
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  You're about to share this conversation starter with your partner.
                </p>
              </div>

              {/* Exact Preview of what will be shared */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-purple-500/30 space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                  Topic: {selectedCategory}
                </span>
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase font-bold">What I'm Feeling:</span>
                  <p className="text-zinc-200">"{generatedContent.feeling}"</p>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase font-bold">What I Want to Discuss:</span>
                  <p className="text-zinc-200">"{generatedContent.discuss}"</p>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase font-bold">A Gentle Way to Start:</span>
                  <p className="text-purple-200 font-medium">"{generatedContent.starter}"</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 leading-snug flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Your private reflection remains strictly private. Only this gentle starter is shared.</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowShareConfirm(false)}
                className="flex-1 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmShareWithPartner}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sharing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
