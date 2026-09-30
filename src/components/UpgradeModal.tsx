import React from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { Crown, Sparkles, X, ArrowRight, ShieldCheck } from 'lucide-react';

export const UpgradeModal: React.FC = () => {
  const { showUpgradeModal, upgradeModalFeature, closeUpgradeModal, openPricingModal } = useSubscription();

  if (!showUpgradeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-[#0f0f15] border border-rose-500/30 rounded-3xl p-6 shadow-2xl relative text-center space-y-4">
        {/* Close Button */}
        <button
          onClick={closeUpgradeModal}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Badge & Icon */}
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-rose-500/20 via-purple-500/20 to-indigo-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-rose-500/10">
          <Crown className="w-7 h-7 text-amber-300" />
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400">
            TRUSTLY Plus
          </span>
          <h3 className="text-xl font-bold text-white mt-1">
            Go deeper together.
          </h3>
          <p className="text-xs text-zinc-300 mt-2 leading-relaxed max-w-xs mx-auto">
            {upgradeModalFeature ? (
              <span>Unlock <strong>{upgradeModalFeature}</strong>, custom check-ins, deeper relationship insights, and advanced coach tools.</span>
            ) : (
              <span>Unlock Advanced Coach, custom check-ins, deeper insights, and more.</span>
            )}
          </p>
        </div>

        {/* Pricing Summary Box */}
        <div className="py-3 px-4 rounded-2xl bg-zinc-950/80 border border-white/10 flex items-center justify-around text-xs">
          <div>
            <span className="text-zinc-400 text-[10px] block">Monthly</span>
            <span className="text-white font-bold">₹199 / mo</span>
          </div>
          <div className="w-[1px] h-6 bg-white/10" />
          <div>
            <span className="text-rose-300 text-[10px] font-semibold block">Best Value</span>
            <span className="text-white font-bold">₹1,499 / yr</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <button
            onClick={() => openPricingModal('upgrade_modal')}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Choose Plus</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={closeUpgradeModal}
            className="w-full py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};
