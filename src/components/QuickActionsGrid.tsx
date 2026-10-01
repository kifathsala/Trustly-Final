import React from 'react';
import { 
  Activity, 
  MessageSquare, 
  Target, 
  Camera, 
  Calendar, 
  StickyNote, 
  Sparkles, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface QuickActionsGridProps {
  onAction: (actionKey: 'checkin' | 'conversation' | 'goals' | 'memories' | 'dates' | 'notes' | 'coach' | 'privacy') => void;
  className?: string;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  onAction,
  className = ''
}) => {
  const actions = [
    {
      id: 'checkin',
      title: 'Check In',
      desc: 'Reflect on how things feel',
      icon: Activity,
      color: 'text-rose-400',
      borderHover: 'hover:border-rose-500/40',
      bgGlow: 'from-rose-500/10 to-transparent'
    },
    {
      id: 'conversation',
      title: 'Conversation',
      desc: 'Find something worth talking about',
      icon: MessageSquare,
      color: 'text-violet-400',
      borderHover: 'hover:border-violet-500/40',
      bgGlow: 'from-violet-500/10 to-transparent'
    },
    {
      id: 'goals',
      title: 'Shared Goal',
      desc: 'Work toward something together',
      icon: Target,
      color: 'text-indigo-400',
      borderHover: 'hover:border-indigo-500/40',
      bgGlow: 'from-indigo-500/10 to-transparent'
    },
    {
      id: 'memories',
      title: 'Memory',
      desc: 'Keep moments that matter',
      icon: Camera,
      color: 'text-blue-400',
      borderHover: 'hover:border-blue-500/40',
      bgGlow: 'from-blue-500/10 to-transparent'
    },
    {
      id: 'dates',
      title: 'Important Date',
      desc: 'Remember meaningful days',
      icon: Calendar,
      color: 'text-emerald-400',
      borderHover: 'hover:border-emerald-500/40',
      bgGlow: 'from-emerald-500/10 to-transparent'
    },
    {
      id: 'notes',
      title: 'Shared Note',
      desc: 'Keep useful things together',
      icon: StickyNote,
      color: 'text-amber-400',
      borderHover: 'hover:border-amber-500/40',
      bgGlow: 'from-amber-500/10 to-transparent'
    },
    {
      id: 'coach',
      title: 'AI Coach',
      desc: 'Get help with difficult conversations',
      icon: Sparkles,
      color: 'text-purple-400',
      borderHover: 'hover:border-purple-500/40',
      bgGlow: 'from-purple-500/10 to-transparent'
    },
    {
      id: 'privacy',
      title: 'Privacy',
      desc: 'Control what you share',
      icon: ShieldCheck,
      color: 'text-teal-400',
      borderHover: 'hover:border-teal-500/40',
      bgGlow: 'from-teal-500/10 to-transparent'
    }
  ] as const;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>Quick Actions</span>
        </h2>
        <span className="text-[11px] text-zinc-500">Choose a moment</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={() => onAction(act.id as any)}
              className={`group p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 ${act.borderHover} text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-lg`}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${act.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />

              <div className="flex items-start justify-between gap-2">
                <div className={`w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center ${act.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </div>

              <div className="mt-3">
                <h3 className="text-xs font-bold text-white group-hover:text-violet-200 transition-colors">
                  {act.title}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                  {act.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
