/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { ActiveConnectionProvider } from './context/ActiveConnectionContext';
import { LandingPage } from './components/LandingPage';
import { Onboarding } from './components/Onboarding';
import { AuthModal } from './components/AuthModal';
import { CouplePairing } from './components/CouplePairing';
import { BottomNav } from './components/BottomNav';
import { HomeDashboard } from './components/HomeDashboard';
import { TrustCheckView } from './components/TrustCheckView';
const AICoachView = React.lazy(() => import('./components/AICoachView'));
const CoupleSpaceView = React.lazy(() => import('./components/CoupleSpaceView'));
const BoundariesView = React.lazy(() => import('./components/BoundariesView'));
const PrivateJournalView = React.lazy(() => import('./components/PrivateJournalView'));
const PrivacyCenterView = React.lazy(() => import('./components/PrivacyCenterView'));
const MyConnectionsView = React.lazy(() => import('./components/MyConnectionsView'));
import { ProfileView } from './components/ProfileView';
import { SubscriptionSettingsView } from './components/SubscriptionSettingsView';
import { PricingModal } from './components/PricingModal';
import { UpgradeModal } from './components/UpgradeModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { NotificationCenter } from './components/NotificationCenter';
import { Users, ShieldCheck } from 'lucide-react';

function MainApp() {
  const { currentUser, userProfile, loading, updateUserProfile } = useAuth();
  const { showPricingModal, closePricingModal } = useSubscription();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'home' | 'connections' | 'trust' | 'coach' | 'couple' | 'profile' | 'journal' | 'boundaries' | 'privacy' | 'subscription'>('home');
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPairingFlow, setShowPairingFlow] = useState(false);
  const [pairingInitialMode, setPairingInitialMode] = useState<'options' | 'create' | 'join'>('options');
  const [coachInitialTopic, setCoachInitialTopic] = useState('');
  const [pendingOnboardingData, setPendingOnboardingData] = useState<any>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center animate-pulse mb-3 shadow-lg shadow-violet-500/20">
          <Users className="w-6 h-6 text-white" />
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
      <main className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl w-full mx-auto px-4 sm:px-6 pt-4 pb-32 flex-1">
        {/* Global Premium Header Bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center text-sm shadow-md shadow-violet-500/10">
              <ShieldCheck className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-widest text-white uppercase">
                TRUSTLY
              </span>
              <span className="block text-[8px] tracking-wider text-zinc-500 font-extrabold uppercase">
                Privacy-First Space
              </span>
            </div>
          </div>

          <NotificationCenter onNavigateTab={setActiveTab} />
        </div>

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

        {activeTab === 'connections' && (
          <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading...</div>}>
            <MyConnectionsView 
              onOpenSpace={() => setActiveTab('couple')}
              onOpenPairing={(mode = 'options') => {
                setPairingInitialMode(mode);
                setShowPairingFlow(true);
              }}
              onOpenPrivacy={() => setActiveTab('privacy')}
            />
          </Suspense>
        )}

        {activeTab === 'trust' && (
          <TrustCheckView onOpenCoachWithTopic={navigateToCoachWithTopic} />
        )}

        {activeTab === 'coach' && (
          <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading...</div>}>
            <AICoachView initialPrompt={coachInitialTopic} />
          </Suspense>
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
          <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading...</div>}>
            <PrivateJournalView />
          </Suspense>
        )}

        {activeTab === 'boundaries' && (
          <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading...</div>}>
            <BoundariesView />
          </Suspense>
        )}

        {activeTab === 'privacy' && (
          <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading...</div>}>
            <PrivacyCenterView />
          </Suspense>
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
      <ActiveConnectionProvider>
        <SubscriptionProvider>
          <MainApp />
        </SubscriptionProvider>
      </ActiveConnectionProvider>
    </AuthProvider>
  );
}
