import React from 'react';
import { 
  Camera, 
  Target, 
  Calendar, 
  StickyNote, 
  ShieldCheck, 
  Users, 
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { 
  SharedMemory, 
  CoupleGoal, 
  ImportantDate, 
  SharedNote, 
  BoundaryItem 
} from '../types';

interface SharedSpaceGridProps {
  memories: SharedMemory[];
  goals: CoupleGoal[];
  importantDates: ImportantDate[];
  sharedNotes: SharedNote[];
  boundaries: BoundaryItem[];
  onOpenSubView: (tab: 'memories' | 'goals' | 'dates' | 'notes' | 'boundaries' | 'conversation') => void;
  className?: string;
}

export const SharedSpaceGrid: React.FC<SharedSpaceGridProps> = ({
  memories,
  goals,
  importantDates,
  sharedNotes,
  boundaries,
  onOpenSubView,
  className = ''
}) => {
  const activeGoalsCount = goals.filter(g => g.status !== 'completed' && !g.isCompleted && !g.completedAt).length;
  
  const spaceCards = [
    {
      id: 'memories' as const,
      title: 'Memories',
      countText: `${memories.length} ${memories.length === 1 ? 'memory' : 'memories'}`,
      icon: Camera,
      color: 'text-blue-400',
      borderHover: 'hover:border-blue-500/40'
    },
    {
      id: 'goals' as const,
      title: 'Goals',
      countText: `${activeGoalsCount} active ${activeGoalsCount === 1 ? 'goal' : 'goals'}`,
      icon: Target,
      color: 'text-violet-400',
      borderHover: 'hover:border-violet-500/40'
    },
    {
      id: 'dates' as const,
      title: 'Important Dates',
      countText: `${importantDates.length} ${importantDates.length === 1 ? 'date' : 'dates'} saved`,
      icon: Calendar,
      color: 'text-emerald-400',
      borderHover: 'hover:border-emerald-500/40'
    },
    {
      id: 'notes' as const,
      title: 'Notes',
      countText: `${sharedNotes.length} shared ${sharedNotes.length === 1 ? 'note' : 'notes'}`,
      icon: StickyNote,
      color: 'text-amber-400',
      borderHover: 'hover:border-amber-500/40'
    },
    {
      id: 'boundaries' as const,
      title: 'Boundaries',
      countText: `${boundaries.length} ${boundaries.length === 1 ? 'agreement' : 'agreements'}`,
      icon: ShieldCheck,
      color: 'text-teal-400',
      borderHover: 'hover:border-teal-500/40'
    }
  ];

  return (
    <div className={`glass-card rounded-3xl p-5 border border-white/10 space-y-3.5 bg-zinc-900/40 ${className}`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">Shared Space</h2>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">Mutual items</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {spaceCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onOpenSubView(card.id)}
              className={`p-3 sm:p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5 ${card.borderHover} text-left transition-all cursor-pointer flex flex-col justify-between group hover:bg-zinc-950`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center ${card.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </div>

              <div className="mt-2.5">
                <div className="text-xs font-bold text-white group-hover:text-violet-200 transition-colors">
                  {card.title}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                  {card.countText}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
