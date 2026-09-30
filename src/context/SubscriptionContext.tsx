import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { UserSubscription } from '../types';
import { trackEvent } from '../lib/analytics';

interface SubscriptionContextType {
  isPlus: boolean;
  subscription: UserSubscription | null;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'loading';
  showUpgradeModal: boolean;
  upgradeModalFeature: string | null;
  showPricingModal: boolean;
  devSimulatedPlan: 'free' | 'plus' | null;
  isDevMode: boolean;
  openUpgradeModal: (featureName?: string) => void;
  closeUpgradeModal: () => void;
  openPricingModal: (source?: string) => void;
  closePricingModal: () => void;
  setDevSimulatedPlan: (plan: 'free' | 'plus' | null) => void;
  checkFeatureAccess: (feature: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, loading } = useAuth();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState<string | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Development-Only Test Mode State
  // STRICT RULE: Only active when import.meta.env.DEV is true
  const isDevMode = Boolean(import.meta.env.DEV);
  const [devSimulatedPlan, setDevSimulatedPlan] = useState<'free' | 'plus' | null>(null);

  // Real verified subscription from Firebase user profile
  const realSubscription: UserSubscription = userProfile?.subscription || {
    plan: 'free',
    status: 'inactive',
    provider: null,
    customerId: null,
    subscriptionId: null,
    currentPeriodEnd: null,
    createdAt: null,
    updatedAt: null
  };

  // Determine active Plus status:
  // In production: strictly userProfile.subscription.plan === 'plus' && status === 'active'
  // In dev: if devSimulatedPlan is explicitly set by developer, use it; otherwise use real
  let isPlus = Boolean(
    realSubscription.plan === 'plus' && realSubscription.status === 'active'
  );

  if (isDevMode && devSimulatedPlan !== null) {
    isPlus = devSimulatedPlan === 'plus';
  }

  const subscriptionStatus = loading ? 'loading' : realSubscription.status;

  const openUpgradeModal = (featureName?: string) => {
    setUpgradeModalFeature(featureName || null);
    setShowUpgradeModal(true);
    trackEvent('upgrade_clicked', { source: featureName });
  };

  const closeUpgradeModal = () => {
    setShowUpgradeModal(false);
    setUpgradeModalFeature(null);
  };

  const openPricingModal = (source?: string) => {
    setShowUpgradeModal(false);
    setShowPricingModal(true);
    trackEvent('premium_page_viewed', { source: source || 'direct' });
  };

  const closePricingModal = () => {
    setShowPricingModal(false);
  };

  const checkFeatureAccess = (feature: string): boolean => {
    if (isPlus) return true;
    openUpgradeModal(feature);
    return false;
  };

  return (
    <SubscriptionContext.Provider value={{
      isPlus,
      subscription: realSubscription,
      subscriptionStatus,
      showUpgradeModal,
      upgradeModalFeature,
      showPricingModal,
      devSimulatedPlan,
      isDevMode,
      openUpgradeModal,
      closeUpgradeModal,
      openPricingModal,
      closePricingModal,
      setDevSimulatedPlan,
      checkFeatureAccess
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
