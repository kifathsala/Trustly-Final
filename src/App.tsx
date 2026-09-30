/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { LandingPage } from './components/LandingPage';
import { Onboarding } from './components/Onboarding';
import { AuthModal } from './components/AuthModal';
import { CouplePairing } from './components/CouplePairing';
import { BottomNav } from './components/BottomNav';
import { HomeDashboard } from './components/HomeDashboard';
import { TrustCheckView } from './components/TrustCheckView';
import { AICoachView } from './components/AICoachView';
import { CoupleSpaceView } from './components/CoupleSpaceView';
import { BoundariesView } from './components/BoundariesView';
import { PrivateJournalView } from './components/PrivateJournalView';
import { PrivacyCenterView } from './components/PrivacyCenterView';
import { ProfileView } from './components/ProfileView';
import { SubscriptionSettingsView } from './components/SubscriptionSettingsView';
import { PricingModal } from './components/PricingModal';
import { UpgradeModal } from './components/UpgradeModal';
import { OfflineIndicator } from './components/OfflineIndicator';

function MainApp() {
  const { currentUser, userProfile, loading, updateUserProfile } = useAuth();
  const { showPricingModal, closePricingModal } = useSubscription();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'home' | 'trust' | 'coach' | 'couple' | 'profile' | 'journal' | 'boundaries' | 'privacy' | 'subscription'>('home');
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPairingFlow, setShowPairingFlow] = useState(false);
  const [pairingInitialMode, setPairingInitialMode] = useState<'options' | 'create' | 'join'>('options');
  const [coachInitialTopic, setCoachInitialTopic] = useState('');
  const [pendingOnboardingData, setPendingOnboardingData] = useState<any>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 flex items-center justify-center animate-pulse mb-3 shadow-lg shadow-rose-500/20">
          <span className="text-xl">❤️</span>
        </div>
        <p className="text-xs text-zinc-400 font-medium tracking-wider uppercase">Loading TRUSTLY...</p>
      </div>
    );
  }

  // 1. User is not authenticated
  if (!currentUser) {
    if (showOnboarding) {
      return (
        <>
          <Onboarding
            onBackToLanding={() => setShowOnboarding(false)}
            onFinishedOnboarding={() => setShowOnboarding(false)}
            onOpenAuthForPairing={(pending) => {
              setPendingOnboardingData(pending);
              setAuthModalMode('signup');
            }}
          />
          {authModalMode && (
            <AuthModal
              initialMode={authModalMode}
              onSuccess={async () => {
                setAuthModalMode(null);
                // When signed up, update with collected onboarding data
                if (pendingOnboardingData) {
                  try {
                    await updateUserProfile({
                      onboardingGoals: pendingOnboardingData.purposes,
                      focusAreas: pendingOnboardingData.matters,
                      relationshipType: pendingOnboardingData.relationshipType,
                      relationshipStatus: pendingOnboardingData.relationshipType
                    });
                  } catch (e) {
                    console.warn("Could not save pending onboarding:", e);
                  }
                }
              }}
              onCancel={() => setAuthModalMode(null)}
            />
          )}
        </>
      );
    }

    return (
      <>
        <LandingPage
          onStartTogether={() => setShowOnboarding(true)}
          onExplore={() => setShowOnboarding(true)}
          onLogin={() => setAuthModalMode('signin')}
        />
        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            onSuccess={() => setAuthModalMode(null)}
            onCancel={() => setAuthModalMode(null)}
          />
        )}
      </>
    );
  }

  // 2. Onboarding not completed
  if (userProfile && userProfile.onboardingCompleted === false) {
    return (
      <Onboarding
        onBackToLanding={() => {}}
        onOpenAuthForPairing={() => {}}
        onFinishedOnboarding={async () => {
          await updateUserProfile({ onboardingCompleted: true });
        }}
      />
    );
  }

  // 3. User explicitly opened pairing flow
  if (showPairingFlow) {
    return (
      <CouplePairing
        initialMode={pairingInitialMode}
        onSuccess={() => {
          setShowPairingFlow(false);
          setActiveTab('couple');
        }}
        onCancel={() => setShowPairingFlow(false)}
      />
    );
  }

  const navigateToCoachWithTopic = (topic: string) => {
    setCoachInitialTopic(topic);
    setActiveTab('coach');
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between selection:bg-rose-500/20 selection:text-rose-200">
      <OfflineIndicator />
      <main className="max-w-md w-full mx-auto px-4 pt-4 flex-1">
        {activeTab === 'home' && (
          <HomeDashboard 
            onNavigateTab={(tab) => {
              if (tab === 'couple' && !userProfile?.coupleId) {
                setPairingInitialMode('options');
                setShowPairingFlow(true);
              } else {
                setActiveTab(tab);
              }
            }}
            onOpenPairing={(mode = 'options') => {
              setPairingInitialMode(mode);
              setShowPairingFlow(true);
            }}
            onOpenCoachWithTopic={navigateToCoachWithTopic}
          />
        )}

        {activeTab === 'trust' && (
          <TrustCheckView onOpenCoachWithTopic={navigateToCoachWithTopic} />
        )}

        {activeTab === 'coach' && (
          <AICoachView initialPrompt={coachInitialTopic} />
        )}

        {activeTab === 'couple' && (
          <CoupleSpaceView />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            onOpenPrivacy={() => setActiveTab('privacy')}
            onOpenJournal={() => setActiveTab('journal')}
            onOpenBoundaries={() => setActiveTab('boundaries')}
            onOpenSubscription={() => setActiveTab('subscription')}
          />
        )}

        {activeTab === 'subscription' && (
          <SubscriptionSettingsView onBack={() => setActiveTab('profile')} />
        )}

        {activeTab === 'journal' && (
          <PrivateJournalView />
        )}

        {activeTab === 'boundaries' && (
          <BoundariesView />
        )}

        {activeTab === 'privacy' && (
          <PrivacyCenterView />
        )}
      </main>

      {/* Global Modals for Subscription and Upgrades */}
      <PricingModal isOpen={showPricingModal} onClose={closePricingModal} />
      <UpgradeModal />

      {/* Floating Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setCoachInitialTopic('');
          setActiveTab(tab);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <MainApp />
      </SubscriptionProvider>
    </AuthProvider>
  );
}
