import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  doc, 
  updateDoc, 
  writeBatch,
  getDoc,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppNotification, NotificationPreferences, DEFAULT_PREFERENCES } from '../lib/notifications';
import { 
  Bell, 
  BellRing, 
  X, 
  Check, 
  CheckSquare, 
  Trash2, 
  Settings, 
  Sparkles, 
  Heart, 
  Target, 
  Calendar, 
  ShieldCheck, 
  Lock, 
  ChevronRight, 
  Volume2, 
  VolumeX,
  Loader2,
  CalendarHeart,
  StickyNote
} from 'lucide-react';
import { getConnectionLabel, getConnectionEmoji } from '../lib/connection';

interface NotificationCenterProps {
  onNavigateTab: (tab: any) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigateTab }) => {
  const { currentUser, userProfile, setCoupleSpace } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPrefs, setShowPrefs] = useState(false);
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false);

  // Preference forms
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  // Browser PWA Notification state
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [showPromptBanner, setShowPromptBanner] = useState(false);

  // Live query for user notifications
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const notifCol = collection(db, 'users', currentUser.uid, 'notifications');
    const q = query(notifCol, orderBy('createdAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.isRead).length);
      setLoading(false);
    }, (err) => {
      console.error("Notifications listener error:", err);
      setLoading(false);
    });

    // Check current browser notification permission
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
      if (Notification.permission === 'default') {
        // Show promotion box after some delayed timing to be elegant
        const timer = setTimeout(() => setShowPromptBanner(true), 3000);
        return () => {
          unsubscribe();
          clearTimeout(timer);
        };
      }
    }

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Sync loaded preferences
  useEffect(() => {
    if (userProfile?.notificationPreferences) {
      setPrefs({ ...DEFAULT_PREFERENCES, ...userProfile.notificationPreferences });
    }
  }, [userProfile?.notificationPreferences]);

  const handleMarkAsRead = async (id?: string) => {
    if (!currentUser?.uid || !id) return;
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'notifications', id);
      await updateDoc(docRef, { isRead: true, readAt: new Date().toISOString() });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser?.uid || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(notif => {
        if (!notif.isRead && notif.id) {
          const docRef = doc(db, 'users', currentUser.uid, 'notifications', notif.id);
          batch.update(docRef, { isRead: true, readAt: new Date().toISOString() });
        }
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePreference = async (key: keyof NotificationPreferences) => {
    if (!currentUser?.uid) return;
    setIsUpdatingPrefs(true);
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { notificationPreferences: updated });
    } catch (e) {
      console.error("Failed to update notification preference:", e);
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) return;
    try {
      const res = await Notification.requestPermission();
      setBrowserPermission(res);
      setShowPromptBanner(false);
      if (res === 'granted') {
        new Notification("TRUSTLY Reminders Active", {
          body: "We will remind you of important joint milestones and shared activities securely.",
          icon: '/favicon.ico'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenNotificationTarget = async (notif: AppNotification) => {
    // Mark as read
    if (!notif.isRead) {
      handleMarkAsRead(notif.id);
    }

    if (notif.connectionId) {
      try {
        // Fetch target connection/couple doc to set as active space
        const coupleRef = doc(db, 'couples', notif.connectionId);
        const coupleSnap = await getDoc(coupleRef);
        if (coupleSnap.exists()) {
          setCoupleSpace({ id: coupleSnap.id, ...coupleSnap.data() } as any);
        }
      } catch (err) {
        console.warn("Failed to pre-fetch connection target:", err);
      }
      setIsOpen(false);
      onNavigateTab('couple');
    } else {
      setIsOpen(false);
      onNavigateTab('connections');
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'invitation_waiting':
      case 'connection_accepted':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'shared_memory':
        return <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />;
      case 'shared_note':
        return <StickyNote className="w-4 h-4 text-amber-400" />;
      case 'shared_goal':
      case 'goal_completed':
        return <Target className="w-4 h-4 text-violet-400" />;
      case 'important_date':
        return <Calendar className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <>
      {/* Premium Notification Bell Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2.5 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
        title="Notifications"
      >
        {unreadCount > 0 ? (
          <>
            <BellRing className="w-5 h-5 text-rose-400 animate-pulse" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-bounce ring-1 ring-black" />
          </>
        ) : (
          <Bell className="w-5 h-5" />
        )}
      </button>

      {/* Slide-over Full-Featured Notification Center Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-fadeIn" 
            onClick={() => setIsOpen(false)}
          />

          {/* Panel Container */}
          <div className="relative w-full max-w-sm bg-zinc-950 border-l border-white/10 h-full shadow-2xl flex flex-col justify-between z-10 animate-slideLeft">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-rose-400" />
                <h2 className="text-base font-bold text-white tracking-tight">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-extrabold">
                    {unreadCount} Unread
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPrefs(!showPrefs)}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    showPrefs 
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                      : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                  title="Notification Preferences"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Option 1: Render Preferences Settings Overlay */}
              {showPrefs ? (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-400" />
                      <span>Privacy-First Toggles</span>
                    </span>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Only shared, consensual connections trigger actions. No private AI thoughts or private notes are ever shared.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { key: 'invitations', label: 'Connection Invitations', desc: 'Remind when invites are waiting or accepted' },
                      { key: 'sharedActivity', label: 'Shared Activity', desc: 'Memories, shared notes & proposed boundaries' },
                      { key: 'importantDates', label: 'Important Dates', desc: 'Milestone events & date counts' },
                      { key: 'goals', label: 'Goals & Milestones', desc: 'Joint habits and goal completion celebration' },
                      { key: 'checkIns', label: 'Check-In Reflections', desc: 'Consensually shared sanitized summaries' },
                    ].map((pref) => (
                      <div 
                        key={pref.key}
                        className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-white">{pref.label}</h4>
                          <p className="text-[10px] text-zinc-400 leading-snug">{pref.desc}</p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            disabled={isUpdatingPrefs}
                            checked={prefs[pref.key as keyof NotificationPreferences]}
                            onChange={() => handleTogglePreference(pref.key as keyof NotificationPreferences)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-rose-500" />
                        </label>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowPrefs(false)}
                    className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs border border-white/5 cursor-pointer mt-2"
                  >
                    Back to Alerts
                  </button>
                </div>
              ) : (
                /* Option 2: Render Real Notifications Feed */
                <div className="space-y-2.5">
                  
                  {/* Mark all as read header button */}
                  {unreadCount > 0 && (
                    <div className="flex items-center justify-end">
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Mark all as read</span>
                      </button>
                    </div>
                  )}

                  {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center text-zinc-500 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                      <span className="text-xs font-mono">Syncing alerts...</span>
                    </div>
                  ) : notifications.length === 0 ? (
                    /* Elegant Empty State */
                    <div className="py-24 px-4 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mx-auto text-zinc-600">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-200">You're all caught up.</h4>
                        <p className="text-xs text-zinc-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                          New connection activity will appear here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleOpenNotificationTarget(notif)}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-md cursor-pointer flex items-start gap-3 hover:bg-white/[0.02] ${
                          notif.isRead 
                            ? 'border-white/5 bg-zinc-900/40 text-zinc-400' 
                            : 'border-rose-500/20 bg-rose-500/[0.03] text-white ring-1 ring-rose-500/10'
                        }`}
                      >
                        {/* Unread Glowing Side Bar */}
                        {!notif.isRead && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500 to-violet-500" />
                        )}

                        {/* Event Category Icon Badge */}
                        <div className="p-2 rounded-xl bg-zinc-950 border border-white/10 shrink-0">
                          {getNotifIcon(notif.type)}
                        </div>

                        {/* Title & Body Block */}
                        <div className="flex-1 space-y-0.5">
                          <h4 className={`text-xs font-bold leading-tight ${notif.isRead ? 'text-zinc-300' : 'text-white'}`}>
                            {notif.title}
                          </h4>
                          <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                            {notif.body}
                          </p>

                          <div className="pt-1.5 flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                            <span>
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Just now'}
                            </span>
                            {!notif.isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notif.id);
                                }}
                                className="text-rose-400 hover:text-rose-300 font-bold tracking-wider uppercase inline-flex items-center gap-0.5"
                              >
                                <span>Mark Read</span>
                                <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Browser PWA Consent Prompt banner */}
                  {showPromptBanner && browserPermission === 'default' && (
                    <div className="glass-card rounded-2xl p-4 border border-rose-500/30 bg-rose-500/[0.04] space-y-3 mt-4 animate-fadeIn">
                      <div className="space-y-1 text-left">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-rose-400 fill-rose-500/20" />
                          <span>Enable Browser Alerts</span>
                        </h4>
                        <p className="text-[10px] text-zinc-300 leading-relaxed">
                          Would you like TRUSTLY to remind you about important dates and connection activity?
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowPromptBanner(false)}
                          className="flex-1 py-1.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 text-[10px] font-semibold transition-all hover:text-white cursor-pointer"
                        >
                          Not Now
                        </button>
                        <button
                          onClick={requestBrowserPermission}
                          className="flex-1 py-1.5 rounded-xl bg-rose-600 text-white text-[10px] font-extrabold shadow-md transition-all hover:bg-rose-500 cursor-pointer"
                        >
                          Enable Notifications
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Bottom Panel Status Footer */}
            <div className="p-4 border-t border-white/5 bg-zinc-950/60 flex items-center justify-between text-[10px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Zero-Trust Encryption</span>
              </span>
              <span>PWA Active</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
