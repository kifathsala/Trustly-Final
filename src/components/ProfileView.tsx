import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  User, 
  ShieldCheck, 
  Bell, 
  Lock, 
  LogOut, 
  Heart, 
  ChevronRight,
  Crown,
  CheckCircle2,
  BookHeart,
  Calendar,
  Sparkles,
  Info,
  Loader2,
  Check
} from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { formatBirthdayDisplay, parseBirthdayComponents } from '../lib/birthday';
import { PWAInstallButton } from './PWAInstallButton';

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
  const [saving, setSaving] = useState(false);

  // Birthday & DOB state
  const rawDOB = userProfile?.dateOfBirth || userProfile?.birthday || '';
  const parsedDOB = parseBirthdayComponents(rawDOB);

  const [birthDay, setBirthDay] = useState<string>(parsedDOB ? String(parsedDOB.day) : '');
  const [birthMonth, setBirthMonth] = useState<string>(parsedDOB ? String(parsedDOB.month) : '');
  const [birthYear, setBirthYear] = useState<string>(parsedDOB?.year ? String(parsedDOB.year) : '');
  const [shareBirthday, setShareBirthday] = useState<boolean>(Boolean(userProfile?.shareBirthday));
  const [savingBirthday, setSavingBirthday] = useState(false);
  const [birthdaySaveSuccess, setBirthdaySaveSuccess] = useState(false);
  const [birthdayError, setBirthdayError] = useState<string | null>(null);

  // Notifications modal
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Sync state when userProfile loads/updates
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setRelationshipStatus(userProfile.relationshipStatus || 'Dating');
      const parsed = parseBirthdayComponents(userProfile.dateOfBirth || userProfile.birthday);
      if (parsed) {
        setBirthDay(String(parsed.day));
        setBirthMonth(String(parsed.month));
        setBirthYear(parsed.year ? String(parsed.year) : '');
      }
      setShareBirthday(Boolean(userProfile.shareBirthday));
    }
  }, [userProfile]);

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
        relationshipStatus
      });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBirthday = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBirthdayError(null);
    setBirthdaySaveSuccess(false);

    if (!birthDay || !birthMonth || !birthYear) {
      setBirthdayError("Please select day, month, and year.");
      return;
    }

    const dayNum = parseInt(birthDay, 10);
    const monthNum = parseInt(birthMonth, 10);
    const yearNum = parseInt(birthYear, 10);

    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
      setBirthdayError("Please enter a valid date.");
      return;
    }

    // Days in month validation
    const maxDays = new Date(yearNum, monthNum, 0).getDate();
    if (dayNum < 1 || dayNum > maxDays) {
      setBirthdayError(`Invalid date. Selected month has ${maxDays} days.`);
      return;
    }

    const formattedDOB = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

    setSavingBirthday(true);
    try {
      await updateUserProfile({
        dateOfBirth: formattedDOB,
        birthday: formattedDOB,
        shareBirthday: shareBirthday
      });
      setBirthdaySaveSuccess(true);
      setTimeout(() => setBirthdaySaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Save birthday error:", err);
      setBirthdayError("Could not update birthday. Please try again.");
    } finally {
      setSavingBirthday(false);
    }
  };

  const handleToggleShareBirthday = async (newVal: boolean) => {
    setShareBirthday(newVal);
    if (userProfile?.dateOfBirth || (birthDay && birthMonth && birthYear)) {
      try {
        await updateUserProfile({
          shareBirthday: newVal
        });
        setBirthdaySaveSuccess(true);
        setTimeout(() => setBirthdaySaveSuccess(false), 2000);
      } catch (err) {
        console.error("Toggle share birthday error:", err);
      }
    }
  };

  const months = [
    { value: '1', name: 'January' },
    { value: '2', name: 'February' },
    { value: '3', name: 'March' },
    { value: '4', name: 'April' },
    { value: '5', name: 'May' },
    { value: '6', name: 'June' },
    { value: '7', name: 'July' },
    { value: '8', name: 'August' },
    { value: '9', name: 'September' },
    { value: '10', name: 'October' },
    { value: '11', name: 'November' },
    { value: '12', name: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

  return (
    <div className="space-y-6 pb-28 max-w-md mx-auto animate-fadeIn">
      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Profile & Settings</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Manage your identity and privacy preferences.</p>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs font-semibold text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 cursor-pointer transition-all"
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {/* User Identity Card */}
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
          <form onSubmit={handleSaveProfile} className="mt-5 pt-4 border-t border-white/10 space-y-3.5 animate-fadeIn">
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

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              {saving ? 'Updating...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 1. BIRTHDAY & PRIVACY-FIRST DOB SECTION */}
      {/* ===================================================================== */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-5 shadow-2xl relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-xl">
              🎂
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Birthday</span>
                {rawDOB && (
                  <span className="text-[11px] font-semibold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    {formatBirthdayDisplay(rawDOB, false)}
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Set your date of birth for celebrations and reminders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-300">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Private by default</span>
          </div>
        </div>

        {/* Date Selector Inputs */}
        <form onSubmit={handleSaveBirthday} className="space-y-4 pt-1 border-t border-white/5">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Select your date of birth
            </label>
            
            <div className="grid grid-cols-3 gap-2">
              {/* Day */}
              <div>
                <span className="text-[10px] text-zinc-400 block mb-1">Day</span>
                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  className="w-full bg-zinc-950/90 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="">Day</option>
                  {days.map(d => (
                    <option key={d} value={d} className="bg-zinc-900">{d}</option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div>
                <span className="text-[10px] text-zinc-400 block mb-1">Month</span>
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="w-full bg-zinc-950/90 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="">Month</option>
                  {months.map(m => (
                    <option key={m.value} value={m.value} className="bg-zinc-900">{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <span className="text-[10px] text-zinc-400 block mb-1">Year</span>
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full bg-zinc-950/90 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="">Year</option>
                  {years.map(y => (
                    <option key={y} value={y} className="bg-zinc-900">{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {birthdayError && (
            <p className="text-xs text-rose-400">{birthdayError}</p>
          )}

          {/* Privacy Toggle: Share with partner */}
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white">
                  Share my birthday with my partner
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Allows your partner to see your birthday date (e.g. "{formatBirthdayDisplay(rawDOB || '2000-12-12', false)}") and send warm wishes.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                <input
                  type="checkbox"
                  checked={shareBirthday}
                  onChange={(e) => handleToggleShareBirthday(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600" />
              </label>
            </div>

            <div className="pt-1 flex items-start gap-1.5 text-[10px] text-zinc-500">
              <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <span>
                {shareBirthday 
                  ? 'Your partner will see your birthday date. Your birth year and exact age remain completely private.'
                  : 'Your partner cannot see your birthday date or birth year. Information is strictly owner-only.'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {birthdaySaveSuccess ? (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Birthday saved!
              </span>
            ) : <div />}

            <button
              type="submit"
              disabled={savingBirthday || !birthDay || !birthMonth || !birthYear}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-xs font-semibold shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer hover:opacity-95 transition-all"
            >
              {savingBirthday ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Save Birthday</span>
            </button>
          </div>
        </form>
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
        {/* PWA App Install */}
        <PWAInstallButton variant="settings" />

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
            className="w-full p-4 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 flex items-center justify-between transition-all cursor-pointer"
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
          className="w-full p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/5 flex items-center justify-between transition-all cursor-pointer"
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
          className="w-full p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/5 flex items-center justify-between transition-all cursor-pointer"
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
          className="w-full p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/5 flex items-center justify-between transition-all cursor-pointer"
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
          className="w-full p-4 rounded-2xl bg-zinc-900/60 hover:bg-rose-950/20 border border-white/5 hover:border-rose-500/20 flex items-center justify-between transition-all group cursor-pointer"
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
