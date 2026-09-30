import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  User, 
  ShieldCheck, 
  Bell, 
  Lock, 
  LogOut, 
  Trash2, 
  Heart, 
  Sparkles, 
  ChevronRight,
  Crown,
  CheckCircle2,
  BookHeart
} from 'lucide-react';

import { useSubscription } from '../context/SubscriptionContext';

interface ProfileViewProps {
  onOpenPrivacy: () => void;
  onOpenJournal: () => void;
  onOpenBoundaries: () => void;
  onOpenAdmin?: () => void;
  onOpenSubscription: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  onOpenPrivacy,
  onOpenJournal,
  onOpenBoundaries,
  onOpenAdmin,
  onOpenSubscription
}) => {
  const { userProfile, partnerProfile, coupleSpace, logout, updateUserProfile, isAdmin } = useAuth();
  const { isPlus, openPricingModal } = useSubscription();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [relationshipStatus, setRelationshipStatus] = useState(userProfile?.relationshipStatus || 'Dating');
  const [birthday, setBirthday] = useState(userProfile?.birthday || '');
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const openNotifications = async () => {
    setShowNotifModal(true);
    if (!userProfile) return;
    try {
      const snap = await import('firebase/firestore').then(({ collection, getDocs }) => 
        getDocs(collection(db, 'notifications', userProfile.uid, 'items'))
      );
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      setNotifications([]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        relationshipStatus,
        birthday: birthday || undefined
      });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Profile & Settings</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Manage your identity and privacy preferences.</p>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs font-semibold text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20"
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {/* User Card */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-rose-500/20 shrink-0">
            {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>

          <div className="overflow-hidden">
            <h3 className="text-lg font-bold text-white truncate">
              {userProfile?.displayName || 'User'}
            </h3>
            <p className="text-xs text-zinc-400 truncate">{userProfile?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {userProfile?.relationshipStatus || 'In a relationship'}
              </span>
              {coupleSpace && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Paired
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Inline Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-5 pt-4 border-t border-white/10 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Relationship Status</label>
              <select
                value={relationshipStatus}
                onChange={(e) => setRelationshipStatus(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="Dating" className="bg-zinc-900">Dating</option>
                <option value="Engaged" className="bg-zinc-900">Engaged</option>
                <option value="Married" className="bg-zinc-900">Married</option>
                <option value="Long-term relationship" className="bg-zinc-900">Long-term relationship</option>
                <option value="Other" className="bg-zinc-900">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Optional Birthday</label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all"
            >
              {saving ? 'Updating...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>

      {/* Premium Membership Banner */}
      <div 
        onClick={onOpenSubscription}
        className={`cursor-pointer glass-card rounded-3xl p-5 border flex items-center justify-between shadow-xl transition-all ${
          isPlus
            ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-purple-500/15'
            : 'border-white/10 hover:border-white/20 bg-gradient-to-r from-rose-500/10 via-purple-500/5 to-indigo-500/10'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            isPlus ? 'bg-amber-500/25 text-amber-300' : 'bg-gradient-to-tr from-rose-500 to-indigo-600 text-white'
          }`}>
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{isPlus ? 'TRUSTLY Plus Active' : 'TRUSTLY Plus'}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                isPlus ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}>
                {isPlus ? 'Plus Member' : '₹199/mo'}
              </span>
            </h4>
            <p className="text-xs text-zinc-400">
              {isPlus ? 'Advanced Coach, insights & custom check-ins active' : 'Go deeper together • Advanced Coach & insights'}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-400" />
      </div>

      {/* Settings List */}
      <div className="space-y-2">
        {/* Subscription & Billing */}
        <button
          onClick={onOpenSubscription}
          className="w-full p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/5 flex items-center justify-between transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-amber-400" />
            <div className="text-left">
              <span className="text-xs font-semibold text-white block">Subscription & Plan</span>
              <span className="text-[10px] text-zinc-400">
                {isPlus ? 'TRUSTLY Plus (Active)' : 'TRUSTLY Free (Upgrade available)'}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>
        {/* Admin Console (Visible if Admin) */}
        {isAdmin && (
          <button
            onClick={onOpenAdmin}
            className="w-full p-4 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-rose-400" />
              <div className="text-left">
                <span className="text-xs font-semibold text-rose-300 block flex items-center gap-1.5">
                  <span>Firebase Admin Console</span>
                  <span className="px-1.5 py-0.2 text-[9px] bg-rose-500 text-white rounded font-bold">ALL ACCESS</span>
                </span>
                <span className="text-[10px] text-zinc-400">View and manage all Firestore collections & documents</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400" />
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={openNotifications}
          className="w-full p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/5 flex items-center justify-between transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-400" />
            <div className="text-left">
              <span className="text-xs font-semibold text-white block">Notifications</span>
              <span className="text-[10px] text-zinc-400">Activity and partner shared updates</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Privacy Center */}
        <button
          onClick={onOpenPrivacy}
          className="w-full p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/5 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div className="text-left">
              <span className="text-xs font-semibold text-white block">Privacy Center</span>
              <span className="text-[10px] text-zinc-400">Data ownership, permissions, and controls</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Private Journal */}
        <button
          onClick={onOpenJournal}
          className="w-full p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/5 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <BookHeart className="w-5 h-5 text-rose-400" />
            <div className="text-left">
              <span className="text-xs font-semibold text-white block">Private Journal</span>
              <span className="text-[10px] text-zinc-400">Encrypted personal reflections</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Boundaries */}
        <button
          onClick={onOpenBoundaries}
          className="w-full p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/5 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-violet-400" />
            <div className="text-left">
              <span className="text-xs font-semibold text-white block">Our Boundaries</span>
              <span className="text-[10px] text-zinc-400">Negotiated expectations & mutual respect</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Sign Out */}
        <button
          onClick={() => logout()}
          className="w-full p-4 rounded-2xl bg-zinc-900/60 hover:bg-rose-950/20 border border-white/5 hover:border-rose-500/20 flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-zinc-400 group-hover:text-rose-400" />
            <div className="text-left">
              <span className="text-xs font-semibold text-zinc-300 group-hover:text-rose-300 block">Sign Out</span>
              <span className="text-[10px] text-zinc-400">Safely log out of your session</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Brand copy reminder */}
      <div className="text-center pt-4">
        <p className="text-xs text-zinc-400 font-medium italic">
          "Small conversations can create big changes."
        </p>
        <span className="text-[10px] text-zinc-400 mt-1 block">TRUSTLY PWA &bull; v1.0.0</span>
      </div>

      {/* Real Notifications Modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121216] border border-white/10 rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Notifications</h3>
              </div>
              <button 
                onClick={() => setShowNotifModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400 space-y-2">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
                  <Bell className="w-5 h-5 opacity-60" />
                </div>
                <p className="font-semibold text-zinc-300">No new notifications.</p>
                <p className="text-[11px] text-zinc-400">When your partner shares reflections or completes check-ins, updates will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl bg-zinc-950/70 border border-white/5 text-xs">
                    <h5 className="font-semibold text-white">{n.title}</h5>
                    <p className="text-zinc-300 text-[11px] mt-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowNotifModal(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-white/5"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
