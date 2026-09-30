import React from 'react';
import { 
  Heart, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight,
  Eye,
  MessageSquare,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface LandingProps {
  onStartTogether: () => void;
  onExplore: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingProps> = ({ onStartTogether, onExplore, onLogin }) => {
  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div 
        aria-hidden="true"
        className="absolute top-[-8%] left-1/2 -translate-x-1/2 w-[600px] md:w-[900px] h-[450px] rounded-full bg-gradient-to-b from-rose-600/12 via-violet-600/10 to-transparent blur-[140px] pointer-events-none" 
      />
      <div 
        aria-hidden="true"
        className="absolute top-[40%] right-[-10%] w-[320px] md:w-[480px] h-[320px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" 
      />
      <div 
        aria-hidden="true"
        className="absolute bottom-[-10%] left-[-5%] w-[350px] md:w-[500px] h-[350px] rounded-full bg-rose-600/10 blur-[140px] pointer-events-none" 
      />

      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto pt-5 md:pt-8 px-5 sm:px-8 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-rose-500/20 ring-1 ring-white/10">
            <Heart className="w-4 h-4 text-white fill-white/80" />
          </div>
          <span className="font-bold tracking-wider text-lg bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
            TRUSTLY
          </span>
        </div>

        {/* Sign In Button with larger touch target */}
        <button 
          onClick={onLogin}
          aria-label="Sign in to your TRUSTLY account"
          className="group relative flex items-center justify-center px-4 py-2 min-h-[40px] rounded-full glass-pill border border-white/10 hover:border-white/20 transition-all text-xs font-medium text-zinc-300 hover:text-white active:scale-95 shadow-sm"
        >
          <span>Sign In</span>
          <ChevronRight className="w-3.5 h-3.5 ml-1 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
        </button>
      </header>

      {/* Hero & Main Content */}
      <main className="flex-1 w-full max-w-xl md:max-w-3xl mx-auto px-5 sm:px-8 flex flex-col justify-center py-6 md:py-12 z-10">
        
        {/* Top Centered Section */}
        <div className="flex flex-col items-center text-center">
          
          {/* Section 2: Refined Privacy Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/70 border border-white/10 backdrop-blur-xl shadow-[0_0_20px_rgba(244,63,94,0.08)] mb-6 transition-all hover:border-white/15">
            {/* Tiny animated privacy indicator */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-zinc-300 tracking-wide">
              Zero-snooping &bull; Total consent
            </span>
          </div>

          {/* Section 1: Hero Typography */}
          <h1 className="text-[34px] sm:text-4xl md:text-5xl lg:text-[56px] font-extrabold tracking-tight leading-[1.12] mb-4 text-white">
            Relationships <br />
            <span className="relative inline-block mt-0.5">
              <span className="bg-gradient-to-r from-rose-400 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
                deserve clarity.
              </span>
              {/* Subtle back-glow behind gradient text */}
              <span 
                aria-hidden="true" 
                className="absolute inset-0 bg-gradient-to-r from-rose-500/20 via-fuchsia-500/20 to-violet-500/20 blur-xl -z-10 opacity-70 pointer-events-none" 
              />
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-zinc-400 leading-relaxed max-w-lg mb-7 font-normal">
            A private space to understand each other, communicate better, and build stronger trust &mdash; without assumptions or snooping.
          </p>
        </div>

        {/* Section 3 & 4: Central Trust Connection Card */}
        <div className="relative w-full rounded-3xl p-5 sm:p-6 mb-7 glass-card border border-white/10 overflow-hidden shadow-2xl transition-all duration-300 hover:border-white/15">
          {/* Subtle card interior ambient gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-rose-500/[0.04] via-transparent to-violet-500/[0.04] pointer-events-none" />
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500/20 to-transparent pointer-events-none" />

          {/* Card Top Metadata Bar */}
          <div className="relative flex items-center justify-between mb-5 sm:mb-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-zinc-300 font-bold">
                CONSENT CONNECTION
              </span>
            </div>
            
            <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-300 bg-white/[0.06] px-2.5 py-1 rounded-full border border-white/10 backdrop-blur-md">
              <Lock className="w-3 h-3 text-rose-400" />
              <span>End-to-end Private</span>
            </div>
          </div>

          {/* Central Visualization: Two Elegant Circular Profile Nodes with animated bridge */}
          <div className="relative flex items-center justify-center py-4 sm:py-6">
            <div className="flex items-center justify-between w-full max-w-sm px-2 sm:px-4">
              
              {/* User Node */}
              <div className="flex flex-col items-center z-10">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[1.5px] bg-gradient-to-b from-rose-400 via-rose-500/40 to-transparent shadow-lg shadow-rose-500/15 animate-trust-node">
                  <div className="w-full h-full rounded-full bg-zinc-950 flex flex-col items-center justify-center border border-white/10">
                    <span className="text-xl sm:text-2xl filter drop-shadow-sm">❤️</span>
                  </div>
                  {/* Subtle inner pulse ring */}
                  <div className="absolute -inset-1 rounded-full border border-rose-500/20 animate-pulse pointer-events-none" />
                </div>
                <span className="text-[10px] sm:text-[11px] tracking-wider text-zinc-300 font-semibold mt-2 uppercase">
                  You
                </span>
                <span className="text-[9px] text-emerald-400 font-medium">Consented</span>
              </div>

              {/* Connecting Bridge with Animated Pulse Particles */}
              <div className="flex-1 relative mx-3 sm:mx-5 flex items-center justify-center">
                {/* Baseline connection wire */}
                <div className="w-full h-[1.5px] bg-gradient-to-r from-rose-500/40 via-violet-400/50 to-indigo-500/40" />

                {/* Traveling light signal from left to right */}
                <span 
                  aria-hidden="true" 
                  className="absolute w-2 h-2 rounded-full bg-rose-300 shadow-[0_0_10px_#fda4af] animate-signal-flow pointer-events-none" 
                />
                
                {/* Traveling light signal from right to left */}
                <span 
                  aria-hidden="true" 
                  className="absolute w-2 h-2 rounded-full bg-violet-300 shadow-[0_0_10px_#c4b5fd] animate-signal-flow-reverse pointer-events-none" 
                />

                {/* Central Glowing Consent & Privacy Indicator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-950/95 border border-white/20 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.35)] backdrop-blur-md">
                    <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-300 stroke-[2.2]" />
                  </div>
                </div>
              </div>

              {/* Partner Node */}
              <div className="flex flex-col items-center z-10">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[1.5px] bg-gradient-to-b from-indigo-400 via-purple-500/40 to-transparent shadow-lg shadow-indigo-500/15 animate-trust-node [animation-delay:1.5s]">
                  <div className="w-full h-full rounded-full bg-zinc-950 flex flex-col items-center justify-center border border-white/10">
                    <span className="text-xl sm:text-2xl filter drop-shadow-sm">💫</span>
                  </div>
                  {/* Subtle inner pulse ring */}
                  <div className="absolute -inset-1 rounded-full border border-indigo-500/20 animate-pulse pointer-events-none" />
                </div>
                <span className="text-[10px] sm:text-[11px] tracking-wider text-zinc-300 font-semibold mt-2 uppercase">
                  Your Partner
                </span>
                <span className="text-[9px] text-emerald-400 font-medium">Voluntary</span>
              </div>

            </div>
          </div>

          {/* Section 4: Bottom Quote */}
          <div className="relative text-center pt-3 sm:pt-4 border-t border-white/5 space-y-1">
            <p className="text-xs sm:text-sm text-zinc-300 font-semibold tracking-wide">
              Your Couple Space is waiting.
            </p>
            <p className="text-[11px] sm:text-xs text-zinc-400">
              Invite your partner to start building it together.
            </p>
          </div>
        </div>

        {/* Section 5: Three Refined Benefit Cards */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 mb-7">
          
          {/* Card 1: Understand */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-white/[0.07] hover:border-white/15 transition-all duration-200 flex flex-col items-center text-center group cursor-default">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-2 text-rose-400 group-hover:scale-105 transition-transform">
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.8]" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-200">
              UNDERSTAND
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 leading-snug">
              See what matters.
            </span>
          </div>

          {/* Card 2: Connect */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-white/[0.07] hover:border-white/15 transition-all duration-200 flex flex-col items-center text-center group cursor-default">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-2 text-purple-400 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.8]" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-200">
              CONNECT
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 leading-snug">
              Talk without assumptions.
            </span>
          </div>

          {/* Card 3: Private */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-white/[0.07] hover:border-white/15 transition-all duration-200 flex flex-col items-center text-center group cursor-default">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-2 text-emerald-400 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.8]" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-200">
              PRIVATE
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 leading-snug">
              Your data stays yours.
            </span>
          </div>

        </div>

        {/* Section 6 & 7: CTA Buttons */}
        <div className="flex flex-col gap-3 w-full">
          
          {/* Section 6: Primary CTA: Start Together */}
          <button
            onClick={onStartTogether}
            className="w-full py-4 sm:py-4.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white font-semibold text-base sm:text-lg shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:shadow-[0_0_40px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.985] transition-all cursor-pointer ring-1 ring-white/20"
          >
            <span>Start Together</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </button>

          {/* Section 7: Secondary CTA: Explore TRUSTLY */}
          <button
            onClick={onExplore}
            className="w-full py-3.5 sm:py-4 rounded-2xl bg-zinc-950/60 hover:bg-zinc-900/80 text-zinc-300 hover:text-white font-medium text-sm sm:text-base border border-white/10 hover:border-white/20 active:scale-[0.985] transition-all flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-md shadow-sm"
          >
            <span>Explore TRUSTLY</span>
            <ArrowRight className="w-4 h-4 text-zinc-400" />
          </button>

        </div>

        {/* Section 8: Brand Trust Statement */}
        <div className="flex items-center justify-center gap-1.5 mt-5 text-center">
          <Lock className="w-3 h-3 text-rose-400" />
          <span className="text-xs sm:text-sm font-medium text-zinc-400 tracking-wide">
            Private by default. Shared by choice.
          </span>
        </div>

      </main>

      {/* Footer reassurance with safe-area spacing */}
      <footer className="w-full max-w-5xl mx-auto py-5 px-6 text-center text-[11px] text-zinc-400 z-10 pb-safe">
        Zero monitoring &bull; Voluntary sharing &bull; Safe, honest conversation
      </footer>
    </div>
  );
};
