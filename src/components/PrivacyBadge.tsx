import React from 'react';
import { Lock, Users, Settings } from 'lucide-react';

export type PrivacyState = 'private' | 'shared' | 'controlled' | 'shared_with';

interface PrivacyBadgeProps {
  state: PrivacyState;
  connectionName?: string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({
  state,
  connectionName,
  label,
  size = 'sm',
  className = ''
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  if (state === 'private') {
    return (
      <span 
        className={`inline-flex items-center gap-1 font-semibold rounded-full bg-zinc-800/90 border border-white/10 text-zinc-300 ${sizeClasses} ${className}`}
        title="Only you can see this. Private by default."
      >
        <Lock className={`${iconSize} text-emerald-400`} />
        <span>{label || '🔒 Private'}</span>
      </span>
    );
  }

  if (state === 'controlled') {
    return (
      <span 
        className={`inline-flex items-center gap-1 font-semibold rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 ${sizeClasses} ${className}`}
        title="Controlled by your privacy settings."
      >
        <Settings className={`${iconSize} text-amber-400`} />
        <span>{label || '⚙️ Controlled by you'}</span>
      </span>
    );
  }

  if (state === 'shared_with' && connectionName) {
    return (
      <span 
        className={`inline-flex items-center gap-1 font-semibold rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 ${sizeClasses} ${className}`}
        title={`Shared with ${connectionName}`}
      >
        <Users className={`${iconSize} text-violet-400`} />
        <span>Shared with {connectionName}</span>
      </span>
    );
  }

  return (
    <span 
      className={`inline-flex items-center gap-1 font-semibold rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 ${sizeClasses} ${className}`}
      title="Shared with your connected space"
    >
      <Users className={`${iconSize} text-violet-400`} />
      <span>{label || '👥 Shared'}</span>
    </span>
  );
};
