import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { paymentService } from '../lib/payment';
import { trackEvent } from '../lib/analytics';
import { 
  Sparkles, 
  Check, 
  Crown, 
  ShieldCheck, 
  X, 
  AlertCircle, 
  ArrowRight,
  Zap,
  Info,
  Heart,
  MessageSquare,
  Lock,
  ChevronRight
} from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: 'monthly' | 'yearly';
}

export const PricingModal: React.FC<PricingModalProps> = ({ 
  isOpen, 
  onClose,
  initialPlan = 'yearly' 
}) => {
  const { userProfile, currentUser } = useAuth();
  const { isPlus } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(initialPlan);
  const [paymentNotice, setPaymentNotice] = useState<{ type: 'info' | 'error'; message: string; title?: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleChoosePlus = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    setPaymentNotice(null);

    trackEvent('checkout_started', { planId: selectedPlan });

    try {
      const result = await paymentService.createCheckoutSession({
        planId: selectedPlan,
        userId: currentUser.uid,
        userEmail: currentUser.email || ''
      });

      if (!result.success) {
        setPaymentNotice({
          type: 'info',
          title: "Payments aren't connected yet.",
          message: "TRUSTLY Plus is currently in preview mode. Live payment processing via Razorpay & Stripe will be enabled prior to production launch."
        });
      }
    } catch {
      setPaymentNotice({
        type: 'error',
        message: "Something went wrong. Please try again."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const premiumFeatures = [
    { icon: '🧠', title: 'Advanced TRUSTLY Coach', desc: 'Deeper emotional clarity and custom guidance modes' },
    { icon: '💬', title: 'Advanced conversation tools', desc: 'Guided preparation for delicate or difficult moments' },
    { icon: '❤️', title: 'Advanced relationship insights', desc: 'Deeper pulse analytics without invasive tracking' },
    { icon: '📝', title: 'Advanced private journaling', desc: 'Structured prompts for individual emotional clarity' },
    { icon: '🎯', title: 'Advanced couple goals', desc: 'Multi-milestone shared aspirations and habit tracking' },
    { icon: '✨', title: 'Custom check-ins', desc: 'Tailor daily connection prompts to your relationship' },
    { icon: '☁️', title: 'Expanded memory/storage', desc: 'Preserve cherished milestones and photos' },
    { icon: '🔔', title: 'Advanced reminders', desc: 'Thoughtful date countdowns and anniversary alerts' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-md bg-[#0d0d12] border border-white/10 rounded-3xl p-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center pt-2 pb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-indigo-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-2.5">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>TRUSTLY Plus</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Build something stronger.
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Unlock the deeper TRUSTLY experience. Go deeper together.
          </p>
        </div>

        {/* Notice Banner (Payment not connected or Info) */}
        {paymentNotice && (
          <div className="mb-4 p-4 rounded-2xl bg-zinc-900 border border-white/10 text-xs space-y-1 animate-fadeIn">
            {paymentNotice.title && (
              <h5 className="font-bold text-amber-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{paymentNotice.title}</span>
              </h5>
            )}
            <p className="text-zinc-300 leading-relaxed pl-5">
              {paymentNotice.message}
            </p>
          </div>
        )}

        {/* Plan Cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Monthly Plan */}
          <div
            onClick={() => setSelectedPlan('monthly')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
              selectedPlan === 'monthly'
                ? 'bg-rose-500/10 border-rose-500/50 shadow-lg shadow-rose-500/10'
                : 'bg-zinc-950/60 border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Monthly
              </span>
              <div className="mt-1">
                <span className="text-xl font-bold text-white">₹199</span>
                <span className="text-[11px] text-zinc-400"> / month</span>
              </div>
            </div>
            <span className="text-[10px] text-zinc-500 mt-3 block">Billed monthly</span>
          </div>

          {/* Yearly Plan (Highlighted) */}
          <div
            onClick={() => setSelectedPlan('yearly')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
              selectedPlan === 'yearly'
                ? 'bg-gradient-to-b from-rose-500/15 to-purple-600/15 border-rose-500 shadow-xl shadow-rose-500/15'
                : 'bg-zinc-950/60 border-white/5 hover:border-white/15'
            }`}
          >
            <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-[9px] font-bold shadow-md">
              Save ₹889
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider">
                Yearly
              </span>
              <div className="mt-1">
                <span className="text-xl font-bold text-white">₹1,499</span>
                <span className="text-[11px] text-zinc-400"> / year</span>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold mt-3 block">
              Save 37% vs monthly
            </span>
          </div>
        </div>

        {/* Feature List */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-2.5 mb-5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 block mb-1">
            Everything Included in Plus
          </span>
          {premiumFeatures.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs">
              <span className="text-sm shrink-0">{f.icon}</span>
              <div>
                <span className="text-white font-medium">{f.title}</span>
                <span className="text-[11px] text-zinc-400 block leading-tight">{f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy Assurance */}
        <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 flex items-center gap-2 mb-5 text-[11px] text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Cancel anytime. Private by default. TRUSTLY never monitors partners secretly.</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleChoosePlus}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-semibold text-sm shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:opacity-95 active:scale-[0.985] cursor-pointer ring-1 ring-white/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Choose Plus ({selectedPlan === 'yearly' ? '₹1,499/yr' : '₹199/mo'})</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};
