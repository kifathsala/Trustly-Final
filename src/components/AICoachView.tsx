import React, { useState } from 'react';
import { askTrustlyCoach } from '../lib/gemini';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Send, 
  MessageSquare, 
  RefreshCw, 
  ShieldCheck, 
  HelpCircle, 
  ArrowRight,
  HeartHandshake,
  AlertTriangle,
  Crown
} from 'lucide-react';

interface AICoachViewProps {
  initialPrompt?: string;
}

export const AICoachView: React.FC<AICoachViewProps> = ({ initialPrompt = '' }) => {
  const { isPlus, openUpgradeModal } = useSubscription();
  const { userProfile, coupleSpace, partnerProfile } = useAuth();

  const activeConnectionType = coupleSpace?.connectionType || userProfile?.connectionType || 'partner';
  const partnerName = partnerProfile?.displayName || undefined;

  const [inputText, setInputText] = useState(initialPrompt);
  const [activeMode, setActiveMode] = useState<'conversation_starter' | 'rewrite_message' | 'understand_situation' | 'prepare_difficult' | 'resolve_argument'>('conversation_starter');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([
    {
      role: 'assistant',
      text: "Hello. I’m TRUSTLY Coach. I'm here to help you articulate your feelings with clarity, kindness, and emotional safety—without blame or defensiveness.",
      time: 'Just now'
    }
  ]);

  const quickActions = [
    { mode: 'conversation_starter', label: 'Help me start a conversation', icon: '', isPlus: false },
    { mode: 'rewrite_message', label: 'Rewrite my message', icon: '', isPlus: true },
    { mode: 'understand_situation', label: 'Help me understand this situation', icon: '', isPlus: false },
    { mode: 'prepare_difficult', label: 'Prepare for difficult talk', icon: '', isPlus: true },
    { mode: 'resolve_argument', label: 'Help us resolve argument', icon: '', isPlus: true },
  ] as const;

  const handleSelectQuickAction = (qa: typeof quickActions[number]) => {
    if (qa.isPlus && !isPlus) {
      openUpgradeModal(qa.label);
      return;
    }
    setActiveMode(qa.mode);
    if (qa.mode === 'rewrite_message') {
      setInputText("Rewrite this kindly: ");
    } else if (qa.mode === 'conversation_starter') {
      setInputText("I feel like my partner is avoiding me.");
    }
  };

  const handleSend = async (customText?: string, modeOverride?: any) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    const currentMode = modeOverride || activeMode;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message
    const newHistory = [
      ...messages,
      { role: 'user' as const, text: textToSend.trim(), time: timeNow }
    ];
    setMessages(newHistory);
    setInputText('');
    setLoading(true);

    try {
      const response = await askTrustlyCoach({
        userQuery: textToSend.trim(),
        contextMode: currentMode,
        connectionType: activeConnectionType,
        personName: partnerName
      });

      setMessages([
        ...newHistory,
        { role: 'assistant', text: response, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } catch (err) {
      setMessages([
        ...newHistory,
        { role: 'assistant', text: "Something went wrong. Please try again.", time: timeNow }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-w-md mx-auto pb-20 animate-fadeIn">
      {/* Header */}
      <div className="pt-2 mb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Objective Communication Advisor</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">TRUSTLY Coach</h1>
          </div>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Distinguish feelings from assumptions. Express needs with empathy and poise.
        </p>
      </div>

      {/* Quick Action Buttons */}
      <div className="overflow-x-auto no-scrollbar py-2 -mx-2 px-2 flex gap-2 shrink-0">
        {quickActions.map((qa) => {
          const isSelected = activeMode === qa.mode;
          return (
            <button
              key={qa.mode}
              onClick={() => handleSelectQuickAction(qa)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isSelected 
                  ? 'bg-violet-600/25 border-violet-500 text-violet-200 shadow-md shadow-violet-600/20' 
                  : 'bg-zinc-900/70 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
              }`}
            >
              <span>{qa.icon}</span>
              <span>{qa.label}</span>
              {qa.isPlus && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PLUS
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Chat Messages scroll area */}
      <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
        {messages.map((m, idx) => (
          <div 
            key={idx} 
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-3xl p-4 text-xs leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-lg shadow-rose-600/15' 
                  : 'bg-zinc-900/90 border border-white/10 text-zinc-200 shadow-xl'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5 text-violet-300 font-semibold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Coach Insight</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
            <span className="text-[10px] text-zinc-400 mt-1 px-2">{m.time}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 w-fit shadow-md">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0.4s]" />
            <span className="text-xs text-zinc-400 ml-1">Reframing respectfully...</span>
          </div>
        )}
      </div>

      {/* Fixed bottom composer */}
      <div className="pt-2 shrink-0">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            placeholder="Type your situation or draft message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            className="w-full bg-zinc-900/95 border border-white/15 rounded-2xl pl-4 pr-12 py-3.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 shadow-xl"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className={`absolute right-2 p-2 rounded-xl transition-all ${
              inputText.trim() 
                ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-md active:scale-95 cursor-pointer' 
                : 'text-zinc-600 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-zinc-400 text-center mt-2">
          TRUSTLY Coach never accuses, judges, or validates paranoia. It builds constructive dialogue.
        </p>
      </div>
    </div>
  );
};
