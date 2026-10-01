import React, { useState } from 'react';
import { Image as ImageIcon, User, HeartHandshake, Users } from 'lucide-react';

interface TrustlyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  fallbackType?: 'avatar' | 'reaction' | 'connection' | 'generic';
  containerClassName?: string;
  className?: string;
  aspectRatio?: string;
}

export const TrustlyImage: React.FC<TrustlyImageProps> = ({
  src,
  alt,
  fallbackType = 'generic',
  containerClassName = '',
  className = '',
  aspectRatio,
  loading = 'lazy',
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const renderFallback = () => {
    switch (fallbackType) {
      case 'avatar':
        return (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-zinc-400">
            <User className="w-1/2 h-1/2 opacity-70" />
          </div>
        );
      case 'connection':
        return (
          <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-violet-950/30 to-zinc-900 flex items-center justify-center text-violet-400/70">
            <Users className="w-1/2 h-1/2 opacity-70" />
          </div>
        );
      case 'reaction':
        return (
          <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-indigo-950/30 to-zinc-900 flex items-center justify-center text-indigo-400/70">
            <HeartHandshake className="w-1/2 h-1/2 opacity-70" />
          </div>
        );
      default:
        return (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500">
            <ImageIcon className="w-1/3 h-1/3 opacity-50" />
          </div>
        );
    }
  };

  const style: React.CSSProperties = {
    ...(aspectRatio ? { aspectRatio } : {}),
    ...rest.style
  };

  if (!src || hasError) {
    return (
      <div 
        className={`relative overflow-hidden ${containerClassName}`} 
        style={style}
        role="img"
        aria-label={alt}
      >
        {renderFallback()}
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden ${containerClassName}`} 
      style={style}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-zinc-900/60 animate-pulse flex items-center justify-center z-10 pointer-events-none" />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className}`}
        {...rest}
      />
    </div>
  );
};
