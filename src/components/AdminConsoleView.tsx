import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  setDoc,
  query,
  limit
} from 'firebase/firestore';
import { db, isUsingCustomFirebase, currentFirebaseProjectId } from '../lib/firebase';
import { 
  ShieldAlert, 
  Database, 
  Trash2, 
  RefreshCw, 
  Plus, 
  Edit3, 
  Check, 
  X,
  FileCode,
  Terminal,
  ShieldCheck
} from 'lucide-react';

export const AdminConsoleView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();

  const [activeCollection, setActiveCollection] = useState<string>('users');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Create / Edit modal state
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docIdInput, setDocIdInput] = useState<string>('');
  const [jsonInput, setJsonInput] = useState<string>('{}');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const collections = [
    'users',
    'couples',
    'checkIns',
    'trustChecks',
    'boundaries',
    'journalEntries',
    'sharedMemories',
    'coupleGoals',
    'importantDates',
    'sharedNotes',
    'admins'
  ];

  useEffect(() => {
    fetchCollectionData(activeCollection);
  }, [activeCollection]);

  const fetchCollectionData = async (colName: string) => {
    setLoading(true);
    setStatusMessage('');
    try {
      const q = query(collection(db, colName), limit(50));
      const snap = await getDocs(q);
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e: any) {
      console.error(e);
      setStatusMessage(`Error reading ${colName}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm(`Delete document "${docId}" from "${activeCollection}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, activeCollection, docId));
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setStatusMessage(`Document ${docId} deleted successfully.`);
    } catch (e: any) {
      console.error(e);
      setStatusMessage(`Failed to delete: ${e.message}`);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingDocId(null);
    setDocIdInput(`custom_${Date.now()}`);
    setJsonInput(JSON.stringify({
      createdAt: new Date().toISOString(),
      updatedBy: currentUser?.email || 'admin'
    }, null, 2));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (docItem: any) => {
    const { id, ...data } = docItem;
    setEditingDocId(id);
    setDocIdInput(id);
    setJsonInput(JSON.stringify(data, null, 2));
    setIsModalOpen(true);
  };

  const handleSaveDocument = async () => {
    if (!docIdInput.trim()) {
      setStatusMessage("Document ID cannot be empty.");
      return;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(jsonInput);
    } catch (err: any) {
      setStatusMessage(`Invalid JSON: ${err.message}`);
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, activeCollection, docIdInput.trim());
      await setDoc(docRef, parsed, { merge: true });
      setStatusMessage(`Saved document ${docIdInput.trim()} in ${activeCollection}.`);
      setIsModalOpen(false);
      fetchCollectionData(activeCollection);
    } catch (e: any) {
      console.error(e);
      setStatusMessage(`Save failed: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center glass-card rounded-3xl border border-red-500/20">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Access Restricted</h2>
        <p className="text-xs text-zinc-400">
          Administrator permissions required. Signed in as {currentUser?.email || 'Anonymous'}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Master Admin Access (Permanent)</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Firebase Manager</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreateModal}
            className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1 shadow-lg shadow-rose-600/20 transition-all"
            title="Create new document"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Doc</span>
          </button>

          <button
            onClick={() => fetchCollectionData(activeCollection)}
            className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed -mt-3">
        Full read, write, create, and delete permissions enabled across all database paths for <span className="text-zinc-200 font-mono">{currentUser?.email}</span>.
      </p>

      {/* Active Project Banner */}
      <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-violet-400" />
          <div>
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
              <span>Project: <strong className="text-white font-mono">{currentFirebaseProjectId}</strong></span>
              {isUsingCustomFirebase ? (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Custom Project (Env Vars)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Default Applet Project
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Permanent unrestricted root access granted to your email account.
            </p>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 text-xs text-zinc-200">
          {statusMessage}
        </div>
      )}

      {/* Collection tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {collections.map((col) => (
          <button
            key={col}
            onClick={() => setActiveCollection(col)}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              activeCollection === col
                ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                : 'bg-zinc-950/80 text-zinc-400 border-white/5 hover:border-white/15'
            }`}
          >
            {col}
          </button>
        ))}
      </div>

      {/* Documents list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span>Documents in <strong>{activeCollection}</strong> ({documents.length})</span>
          <span>Max 50 items</span>
        </div>

        {loading ? (
          <div className="glass-card rounded-2xl p-8 text-center text-xs text-zinc-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
            Loading live records from Firestore...
          </div>
        ) : documents.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-xs text-zinc-400 border border-white/5 space-y-3">
            <p>No documents in this collection.</p>
            <button
              onClick={handleOpenCreateModal}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create first document</span>
            </button>
          </div>
        ) : (
          documents.map((docItem) => (
            <div 
              key={docItem.id} 
              className="glass-card rounded-2xl p-4 border border-white/10 space-y-2.5 relative group"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="font-mono text-xs font-bold text-rose-300">
                  {docItem.id}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(docItem)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Edit JSON document"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(docItem.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* JSON preview */}
              <pre className="text-[11px] font-mono bg-zinc-950/80 p-3 rounded-xl border border-white/5 overflow-x-auto text-zinc-300 max-h-48">
                {JSON.stringify(docItem, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#121216] border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">
                  {editingDocId ? `Edit Document: ${editingDocId}` : `New Document in /${activeCollection}`}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Document ID
                </label>
                <input
                  type="text"
                  disabled={Boolean(editingDocId)}
                  value={docIdInput}
                  onChange={(e) => setDocIdInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500 disabled:opacity-60"
                  placeholder="e.g. user_123 or leave custom"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  JSON Data
                </label>
                <textarea
                  rows={10}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-rose-500 font-mono leading-relaxed"
                  placeholder='{ "key": "value" }'
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDocument}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Save Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
