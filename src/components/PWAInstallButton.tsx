import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ variant?: 'banner' | 'button' | 'settings' }> = ({ variant = 'banner' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If already installed as standalone PWA or manually dismissed in banner mode
  if (isInstalled || (variant === 'banner' && dismissed)) {
    return null;
  }

  // Neither installable (Chromium/Android) nor iOS
  if (!isInstallable && !isIOS) {
    return null;
  }

  if (variant === 'settings') {
    return (
      <>
        <button
          onClick={isInstallable ? install : () => setShowIOSGuide(true)}
          className="w-full p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/5 flex items-center justify-between transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-indigo-400" />
            <div className="text-left">
              <span className="text-xs font-semibold text-white block">Install TRUSTLY App</span>
              <span className="text-[10px] text-zinc-400">Add to your device home screen</span>
            </div>
          </div>
          <span className="text-xs font-semibold text-indigo-400">Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
            <div className="w-full max-w-sm rounded-3xl bg-[#121216] border border-white/10 p-6 shadow-2xl text-left space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
                <button onClick={() => setShowIOSGuide(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-xs text-zinc-300">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                  <Share className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <span>1. Tap the <strong>Share</strong> icon in the Safari navigation bar at the bottom.</span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                  <PlusSquare className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold border border-white/5"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Floating or Inline Banner
  return (
    <>
      <div className="glass-card rounded-2xl p-3.5 border border-rose-500/20 bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-indigo-500/10 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Install TRUSTLY App</h5>
            <p className="text-[10px] text-zinc-400">Faster access & full screen companion</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={isInstallable ? install : () => setShowIOSGuide(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:opacity-95 text-white font-semibold text-xs shadow-sm cursor-pointer"
          >
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-[#121216] border border-white/10 p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
              <button onClick={() => setShowIOSGuide(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-zinc-300">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                <Share className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <span>1. Tap the <strong>Share</strong> button in Safari's bottom toolbar.</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                <PlusSquare className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <span>2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold border border-white/5 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
