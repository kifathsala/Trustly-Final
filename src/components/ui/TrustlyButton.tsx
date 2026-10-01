import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface TrustlyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
}

export const TrustlyButton: React.FC<TrustlyButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon,
  loading = false,
  className = '',
  ...props 
}) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:from-violet-500 hover:to-pink-500 shadow-lg shadow-violet-900/20",
    secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-white/5",
    ghost: "text-zinc-400 hover:text-white hover:bg-zinc-800/50",
    danger: "bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 border border-rose-900/30"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};
