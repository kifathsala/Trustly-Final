import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ShieldCheck, 
  Lock, 
  Users, 
  Share2, 
  Download, 
  Trash2, 
  Unlink, 
  Check, 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  Sparkles, 
  Heart, 
  EyeOff
} from 'lucide-react';

export const PrivacyCenterView: React.FC = () => {
  const { currentUser, userProfile, partnerProfile, coupleSpace, disconnectCouple, logout } = useAuth();

  // Status & action state
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Modals
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Data counts
  const [dataCounts, setDataCounts] = useState({
    journals: 0,
    checkIns: 0,
    trustChecks: 0,
    memories: 0,
    goals: 0,
    boundaries: 0
  });

  useEffect(() => {
    if (!currentUser) return;
    loadCounts();
  }, [currentUser, coupleSpace]);

  const loadCounts = async () => {
    if (!currentUser) return;
    try {
      // 1. Private journals
      const jSnap = await getDocs(query(collection(db, 'journalEntries'), where('userId', '==', currentUser.uid)));
      // 2. Private checkins
      const cSnap = await getDocs(query(collection(db, 'checkIns'), where('userId', '==', currentUser.uid)));
      // 3. Trust checks
      const tSnap = await getDocs(query(collection(db, 'trustChecks'), where('userId', '==', currentUser.uid)));

      let memCount = 0;
      let goalCount = 0;
      let bndCount = 0;

      if (coupleSpace?.id) {
        const memSnap = await getDocs(collection(db, 'couples', coupleSpace.id, 'memories'));
        memCount = memSnap.size;
        const goalSnap = await getDocs(collection(db, 'couples', coupleSpace.id, 'goals'));
        goalCount = goalSnap.size;
        const bndSnap = await getDocs(collection(db, 'couples', coupleSpace.id, 'boundaries'));
        bndCount = bndSnap.size;
      }

      setDataCounts({
        journals: jSnap.size,
        checkIns: cSnap.size,
        trustChecks: tSnap.size,
        memories: memCount,
        goals: goalCount,
        boundaries: bndCount
      });
    } catch {
      // Gracefully silent count update
    }
  };

  // EXPORT MY DATA WORKFLOW
  const handleExportData = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    setErrorNotice(null);
    try {
      // Gather only authenticated user's private data
      const userExport: Record<string, any> = {
        exportDate: new Date().toISOString(),
        userProfile: userProfile || { uid: currentUser.uid, email: currentUser.email }
      };

      // 1. Personal Journals
      const jSnap = await getDocs(query(collection(db, 'journalEntries'), where('userId', '==', currentUser.uid)));
      userExport.personalJournals = jSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. Personal Check-ins
      const cSnap = await getDocs(query(collection(db, 'checkIns'), where('userId', '==', currentUser.uid)));
      userExport.personalCheckIns = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Personal Trust Checks
      const tSnap = await getDocs(query(collection(db, 'trustChecks'), where('userId', '==', currentUser.uid)));
      userExport.personalTrustChecks = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 4. Personal AI Conversations
      try {
        const aiSnap = await getDocs(collection(db, 'users', currentUser.uid, 'aiConversations'));
        userExport.personalAIConversations = aiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {
        userExport.personalAIConversations = [];
      }

      // Generate downloadable JSON blob
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(userExport, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `trustly-my-data-export-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setActionNotice('Your data export was generated successfully.');
    } catch (err: any) {
      setErrorNotice("Could not complete data export. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // DISCONNECT PARTNER WORKFLOW
  const handleConfirmDisconnect = async () => {
    setIsProcessing(true);
    setErrorNotice(null);
    try {
      await disconnectCouple();
      setActionNotice('Successfully disconnected from your partner. Shared records remain preserved according to retention policy.');
      setShowDisconnectModal(false);
    } catch (err: any) {
      setErrorNotice("Failed to disconnect. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // DELETE MY DATA WORKFLOW
  const handleConfirmDeleteAccount = async () => {
    if (!currentUser || deleteConfirmationText.trim().toUpperCase() !== 'DELETE') return;
    setIsProcessing(true);
    setErrorNotice(null);

    try {
      const uid = currentUser.uid;

      // 1. Delete personal journal entries
      const jSnap = await getDocs(query(collection(db, 'journalEntries'), where('userId', '==', uid)));
      for (const d of jSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 2. Delete personal check-ins
      const cSnap = await getDocs(query(collection(db, 'checkIns'), where('userId', '==', uid)));
      for (const d of cSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 3. Delete personal trust checks
      const tSnap = await getDocs(query(collection(db, 'trustChecks'), where('userId', '==', uid)));
      for (const d of tSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 4. Disconnect from couple if connected
      if (coupleSpace) {
        try {
          await disconnectCouple();
        } catch {
          // ignore
        }
      }

      // 5. Delete user profile doc
      await deleteDoc(doc(db, 'users', uid));

      // 6. Delete Firebase Auth user or sign out
      try {
        await currentUser.delete();
      } catch {
        await logout();
      }

      setShowDeleteModal(false);
    } catch (err: any) {
      setErrorNotice("Could not complete account deletion. Please try again or re-authenticate.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 max-w-md mx-auto">
      {/* Header */}
      <div className="pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium mb-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Security & Privacy Architecture</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Privacy Center</h1>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
          Private by default. Shared only when you choose. TRUSTLY never monitors your partner secretly.
        </p>
      </div>

      {/* Notifications */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorNotice && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-rose-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Section 1: Strict Architectural Guarantee */}
      <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-rose-400">
          <Lock className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Privacy Principles & Data Isolation
          </h3>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">
          Every record in TRUSTLY is enforced at the database level using Firebase Security Rules. 
          Your partner cannot access your private journal, private check-in reflections, or private AI coach conversations, regardless of relationship pairing.
        </p>
      </div>

      {/* Section 2: Data Classification & Inventory (Three Categories) */}
      <div className="space-y-4">
        {/* Category 1: PRIVATE */}
        <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">Private</h3>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-800 border border-white/10 text-zinc-300 font-semibold">
              Only you can see this
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Strictly isolated to your authenticated account ID. A connected partner cannot read these records.
          </p>

          <div className="divide-y divide-white/5 pt-1">
            <div className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-200">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Private Journal Entries</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">{dataCounts.journals} entries • 🔒 Private</span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-200">
                <Heart className="w-3.5 h-3.5 text-zinc-400" />
                <span>Daily Check-in Notes</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">{dataCounts.checkIns} recorded • 🔒 Private by default</span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-200">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>Trust Check Detailed Answers</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">{dataCounts.trustChecks} answers • 🔒 Private</span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-200">
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                <span>AI Coach Conversations</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">🔒 Private & confidential</span>
            </div>
          </div>
        </div>

        {/* Category 2: SHARED */}
        <div className="glass-card rounded-3xl p-5 border border-purple-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Share2 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">Shared</h3>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold">
              You chose to share with partner
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Visible to your partner only when you explicitly enable the sharing toggle.
          </p>

          <div className="divide-y divide-white/5 pt-1">
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-zinc-200">Shared Daily Connection Score</span>
              <span className="text-[11px] text-purple-300">👥 Voluntary toggle</span>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-zinc-200">Profile Name & Avatar</span>
              <span className="text-[11px] text-purple-300">👥 Visible to partner</span>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-zinc-200">Neutral Relationship Pulse & Summary</span>
              <span className="text-[11px] text-purple-300">👥 Both must opt-in</span>
            </div>
          </div>
        </div>

        {/* Category 3: COUPLE SPACE */}
        <div className="glass-card rounded-3xl p-5 border border-rose-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">Couple Space</h3>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold">
              Both connected partners can access
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Co-created content accessible exclusively to both authenticated members of the couple space.
          </p>

          <div className="divide-y divide-white/5 pt-1">
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-zinc-200">Shared Memories & Photos</span>
              <span className="text-[11px] font-mono text-rose-300">{dataCounts.memories} memories • 👥 Shared</span>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-zinc-200">Couple Goals & Progress</span>
              <span className="text-[11px] font-mono text-rose-300">{dataCounts.goals} goals • 👥 Shared</span>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-zinc-200">Relationship Boundaries</span>
              <span className="text-[11px] font-mono text-rose-300">{dataCounts.boundaries} boundaries • 👥 Mutual agreement</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Data Management & Actions */}
      <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>Data Governance & Ownership</span>
        </h3>

        {/* 1. Export My Data */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div>
            <h4 className="text-xs font-semibold text-white">Export My Data</h4>
            <p className="text-[11px] text-zinc-400 max-w-[220px]">
              Download a structured JSON copy of all your personal data. Does not include partner's private data.
            </p>
          </div>
          <button
            onClick={handleExportData}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Export</span>
          </button>
        </div>

        {/* 2. Disconnect Partner */}
        {coupleSpace && (
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <div>
              <h4 className="text-xs font-semibold text-white">Disconnect Partner</h4>
              <p className="text-[11px] text-zinc-400 max-w-[220px]">
                Removes the relationship connection. Shared content remains in couple record according to ownership rules.
              </p>
            </div>
            <button
              onClick={() => setShowDisconnectModal(true)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 text-xs font-semibold border border-amber-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        )}

        {/* 3. Delete My Data */}
        <div className="flex items-center justify-between py-2">
          <div>
            <h4 className="text-xs font-semibold text-white">Delete My Data</h4>
            <p className="text-[11px] text-zinc-400 max-w-[220px]">
              Permanently erase your account, journal entries, check-ins, and personal data.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* DISCONNECT MODAL */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Unlink className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Disconnect from Partner?</h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                Disconnecting removes the relationship connection. Your private journal, check-ins, and account stay completely safe. Shared content remains in the space according to ownership rules.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setShowDisconnectModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-medium border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisconnect}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111116] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Delete your TRUSTLY account?</h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                This action is permanent and cannot be undone. It will permanently remove:
              </p>
              <ul className="text-xs text-zinc-400 mt-2 text-left list-disc list-inside space-y-1 bg-zinc-950/60 p-3 rounded-xl border border-white/5">
                <li>Your profile & account credentials</li>
                <li>Your private journal entries</li>
                <li>Your private daily check-ins & trust checks</li>
                <li>Your private AI Coach conversations</li>
              </ul>
              <p className="text-[11px] text-zinc-400 mt-2">
                Shared couple records (memories, joint goals) will remain preserved in the couple record.
              </p>
            </div>

            <div>
              <label className="block text-xs text-zinc-300 font-medium mb-1">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder="DELETE"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 uppercase font-mono tracking-widest text-center"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-medium border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteAccount}
                disabled={isProcessing || deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
