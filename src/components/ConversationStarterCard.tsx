import React, { useState } from 'react';
import { MessageSquare, RefreshCw, ArrowRight, Sparkles } from 'lucide-react';

interface ConversationStarterCardProps {
  onTalkAboutIt: (prompt: string) => void;
  className?: string;
}

const CURATED_STARTERS = [
  "What is something you've appreciated recently?",
  "What is one thing you'd like to do together?",
  "What has been on your mind lately?",
  "What is something you wish I understood better?",
  "What is a small goal you would like us to support each other with?",
  "What is your favorite memory of something we experienced together?",
  "How can I best support you this week?"
];

export const ConversationStarterCard: React.FC<ConversationStarterCardProps> = ({
  onTalkAboutIt,
  className = ''
}) => {
  const [index, setIndex] = useState(0);

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % CURATED_STARTERS.length);
  };

  const currentStarter = CURATED_STARTERS[index];

  return (
    <div className={`glass-card rounded-3xl p-5 border border-violet-500/20 bg-gradient-to-br from-violet-950/20 via-zinc-900/60 to-zinc-950 space-y-4 relative overflow-hidden shadow-xl ${className}`}>
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-48 h-24 bg-violet-600/10 blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-violet-300">
              Something worth talking about
            </h2>
          </div>
          <p className="text-[11px] text-zinc-400 leading-snug">
            Small conversations can make meaningful connections stronger.
          </p>
        </div>
      </div>

      {/* Starter text quote card */}
      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-2 shadow-inner">
        <p className="text-sm font-semibold text-white leading-relaxed">
          &ldquo;{currentStarter}&rdquo;
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 pt-1">
        <button
          onClick={() => onTalkAboutIt(currentStarter)}
          className="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-violet-600/20 active:scale-95"
        >
          <span>Talk about it</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleNext}
          className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
          <span>Another idea</span>
        </button>
      </div>
    </div>
  );
};
