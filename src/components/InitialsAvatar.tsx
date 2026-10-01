import React from 'react';

interface InitialsAvatarProps {
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim().slice(0, 2).toUpperCase();
  }
  return 'TR';
}

export const InitialsAvatar: React.FC<InitialsAvatarProps> = ({
  name,
  email,
  photoURL,
  size = 'md',
  className = ''
}) => {
  const [imageError, setImageError] = React.useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base font-semibold',
    xl: 'w-20 h-20 text-xl font-bold'
  }[size];

  const initials = getInitials(name, email);

  // Pick a stable tasteful dark gradient based on name hash
  const gradients = [
    'from-violet-600 via-indigo-600 to-zinc-900',
    'from-rose-600 via-pink-600 to-zinc-900',
    'from-blue-600 via-cyan-600 to-zinc-900',
    'from-emerald-600 via-teal-600 to-zinc-900',
    'from-amber-600 via-orange-600 to-zinc-900',
    'from-purple-600 via-violet-800 to-zinc-900'
  ];
  
  const charSum = (name || email || 'T').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const gradient = gradients[charSum % gradients.length];

  if (photoURL && !imageError) {
    return (
      <div className={`relative rounded-2xl overflow-hidden shrink-0 border border-white/10 ${sizeClasses} ${className}`}>
        <img
          src={photoURL}
          alt={name || 'Profile'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div 
      className={`relative rounded-2xl overflow-hidden shrink-0 bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold tracking-tight border border-white/10 shadow-inner ${sizeClasses} ${className}`}
      aria-label={name || 'User Initials'}
    >
      <span>{initials}</span>
    </div>
  );
};
