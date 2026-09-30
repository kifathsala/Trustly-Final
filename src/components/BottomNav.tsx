import React from 'react';
import { 
  Heart, 
  ShieldCheck, 
  Sparkles, 
  User, 
  Compass, 
  Flame
} from 'lucide-react';

interface BottomNavProps {
  activeTab: 'home' | 'trust' | 'coach' | 'couple' | 'profile' | 'journal' | 'boundaries' | 'privacy' | 'admin' | 'subscription';
  setActiveTab: (tab: any) => void;
  hasUnreadNotes?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Flame },
    { id: 'trust', label: 'Trust', icon: ShieldCheck },
    { id: 'coach', label: 'Coach', icon: Sparkles },
    { id: 'couple', label: 'Couple', icon: Heart },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 pb-safe pointer-events-auto"
      aria-label="Main Navigation"
    >
      <div className="max-w-md mx-auto px-3 pb-3 pt-1">
        <div className="rounded-2xl p-1.5 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.8)] flex items-center justify-around border border-white/10 bg-zinc-950/85 backdrop-blur-2xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center min-h-[48px] min-w-[54px] py-1.5 px-2 rounded-xl transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 cursor-pointer ${
                  isActive 
                    ? 'text-rose-400 font-semibold' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <span className="absolute inset-0 bg-gradient-to-t from-rose-500/15 via-rose-500/5 to-transparent rounded-xl pointer-events-none" />
                )}
                
                <div className="relative flex items-center justify-center">
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-rose-400' : ''}`} />
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                  )}
                </div>
                <span className={`text-[10px] mt-1 tracking-tight transition-opacity ${isActive ? 'opacity-100 font-bold text-rose-300' : 'opacity-70'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
