import React from 'react';
import { CoupleSpace, UserProfile } from '../types';
import { getConnectionLabel } from '../lib/connection';
import { CONNECTION_IMAGES } from '../config/images';
import { TrustlyImage } from './TrustlyImage';
import { InitialsAvatar } from './InitialsAvatar';
import { Calendar, Users, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ConnectionHeroProps {
  coupleSpace: CoupleSpace;
  partnerProfile: UserProfile | null;
  className?: string;
}

export const ConnectionHero: React.FC<ConnectionHeroProps> = ({
  coupleSpace,
  partnerProfile,
  className = ''
}) => {
  const partnerName = partnerProfile?.displayName || coupleSpace?.creatorName || 'Your Connection';
  const relationshipType = getConnectionLabel(coupleSpace?.connectionType);
  const visualImage = CONNECTION_IMAGES[coupleSpace?.connectionType as keyof typeof CONNECTION_IMAGES] || CONNECTION_IMAGES.other;
  
  const connectedDateStr = coupleSpace?.createdAt 
    ? new Date(coupleSpace.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-900/90 via-[#121218] to-zinc-950 p-6 md:p-7 shadow-2xl ${className}`}>
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-48 bg-gradient-to-bl from-violet-600/10 via-pink-600/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-32 bg-indigo-600/5 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-4 max-w-lg">
          {/* Header Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold">
            <Users className="w-3.5 h-3.5 text-violet-400" />
            <span>Your Connection</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {partnerName}
            </h1>
            <p className="text-sm font-medium text-violet-300/90 mt-1">
              {relationshipType}
            </p>
          </div>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-md">
            Make space for meaningful conversations. A private space to reflect, share moments, and stay aligned.
          </p>

          {/* Connected Since Date (only if exists) */}
          {connectedDateStr && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>Connected since <strong className="text-zinc-200 font-semibold">{connectedDateStr}</strong></span>
            </div>
          )}
        </div>

        {/* Visual Showcase Frame */}
        <div className="w-full sm:w-auto self-stretch md:self-auto flex items-center justify-center">
          <div className="relative w-full sm:w-48 md:w-56 h-36 md:h-44 rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-xl group">
            <TrustlyImage
              src={visualImage}
              alt={`${relationshipType} Connection`}
              fallbackType="connection"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-zinc-300 font-medium">
              <span className="truncate">{partnerName}</span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
