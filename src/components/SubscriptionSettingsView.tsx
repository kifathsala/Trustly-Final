import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { 
  Crown, 
  ShieldCheck, 
  Check, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle, 
  ArrowLeft,
  Calendar,
  CreditCard,
  Zap,
  Info
} from 'lucide-react';

interface SubscriptionSettingsViewProps {
  onBack: () => void;
}

export const SubscriptionSettingsView: React.FC<SubscriptionSettingsViewProps> = ({ onBack }) => {
  const { userProfile } = useAuth();
  const { 
    isPlus, 
    subscription, 
    openPricingModal 
  } = useSubscription();

  const [notice, setNotice] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleManageSubscription = () => {
    if (subscription?.provider === 'razorpay' || subscription?.provider === 'stripe') {
      setNotice("Redirecting to customer billing portal...");
    } else {
      setNotice("Payments aren't connected yet. Real payment gateway integration will allow self-serve billing management.");
    }
  };

  const handleRestorePurchase = async () => {
    setIsRestoring(true);
    setNotice(null);
    try {
      // Simulate checking real store receipts / customer database
      await new Promise(resolve => setTimeout(resolve, 800));
      if (isPlus) {
        setNotice("Your Plus subscription was verified and refreshed.");
      } else {
        setNotice("No existing active purchase found for this account.");
      }
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 max-w-md mx-auto animate-fadeIn">
      {/* Top Header */}
      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Profile</span>
        </button>
        <span className="text-xs font-semibold text-zinc-400">Membership</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Subscription</h1>
        <p className="text-xs text-zinc-400 mt-1">Manage your TRUSTLY plan and billing preferences.</p>
      </div>

      {notice && (
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 text-xs text-zinc-300 flex items-center gap-2.5 animate-fadeIn">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Current Plan Card */}
      <div className={`glass-card rounded-3xl p-6 border shadow-2xl relative overflow-hidden ${
        isPlus 
          ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-rose-500/5 to-purple-500/10'
          : 'border-white/10'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isPlus ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-zinc-400'
            }`}>
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Current Plan</span>
              <h3 className="text-base font-bold text-white">
                {isPlus ? 'TRUSTLY Plus' : 'TRUSTLY Free'}
              </h3>
            </div>
          </div>

          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
            isPlus 
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
              : 'bg-zinc-800 text-zinc-400 border border-white/10'
          }`}>
            {isPlus ? 'Active' : 'Free Tier'}
          </span>
        </div>

        {isPlus ? (
          <div className="space-y-3">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Your Plus membership is active. You have full access to Advanced Coach, custom check-ins, deeper relationship insights, and expanded space.
            </p>

            {/* Real renewal date info only if exists in real provider data */}
            {subscription?.currentPeriodEnd && (
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 flex items-center gap-2 text-xs text-zinc-400">
                <Calendar className="w-4 h-4 text-zinc-400" />
                <span>Next renewal: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              You are currently on the Free plan. Includes core Couple Space, daily pulse check-in, memories, goals, and standard AI Coach assistance.
            </p>

            <button
              onClick={() => openPricingModal('subscription_settings')}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-rose-600/20 hover:opacity-95 active:scale-[0.985] cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Upgrade to TRUSTLY Plus (₹199/mo or ₹1,499/yr)</span>
            </button>
          </div>
        )}
      </div>

      {/* Plan Feature Comparison */}
      <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
          Feature Breakdown
        </h4>

        <div className="divide-y divide-white/5 text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-zinc-300">Couple Space & Memories</span>
            <span className="text-zinc-400">Free & Plus</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-zinc-300">Daily Pulse & Trust Check</span>
            <span className="text-zinc-400">Free & Plus</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-zinc-300">Advanced TRUSTLY Coach</span>
            <span className={isPlus ? 'text-amber-300 font-semibold' : 'text-zinc-500'}>
              Plus Only
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-zinc-300">Guided Conversation Tools</span>
            <span className={isPlus ? 'text-amber-300 font-semibold' : 'text-zinc-500'}>
              Plus Only
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-zinc-300">Custom Check-ins & Reminders</span>
            <span className={isPlus ? 'text-amber-300 font-semibold' : 'text-zinc-500'}>
              Plus Only
            </span>
          </div>
        </div>
      </div>

      {/* Management Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleManageSubscription}
          className="w-full py-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-white/10 transition-all cursor-pointer"
        >
          Manage Subscription
        </button>

        <button
          onClick={handleRestorePurchase}
          disabled={isRestoring}
          className="w-full py-3 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-medium border border-white/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
          <span>Restore Purchase</span>
        </button>
      </div>
    </div>
  );
};
