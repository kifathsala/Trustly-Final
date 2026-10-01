import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useActiveConnection } from '../context/ActiveConnectionContext';
import { ConnectionItem, ConnectionType, CONNECTION_TYPE_OPTIONS } from '../types';
import { InitialsAvatar } from './InitialsAvatar';
import { EditConnectionModal } from './EditConnectionModal';
import { ArchiveConfirmModal } from './ArchiveConfirmModal';
import { RemoveConnectionModal } from './RemoveConnectionModal';
import { 
  Users, 
  Plus, 
  Search, 
  X, 
  SlidersHorizontal, 
  ArrowUpDown, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  Archive, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  ChevronRight, 
  RefreshCw, 
  Lock, 
  Activity, 
  Sparkles,
  Share2,
  Copy,
  ExternalLink
} from 'lucide-react';

interface MyConnectionsViewProps {
  onOpenSpace: (coupleId: string) => void;
  onOpenPairing: (mode?: 'create' | 'join' | 'options') => void;
  onOpenPrivacy?: () => void;
}

type SortOption = 'recently_active' | 'recently_added' | 'name_asc' | 'name_desc';

export const MyConnectionsView: React.FC<MyConnectionsViewProps> = ({
  onOpenSpace,
  onOpenPairing,
  onOpenPrivacy
}) => {
  const { currentUser } = useAuth();
  const {
    connections,
    activeConnections,
    archivedConnections,
    activeConnectionId,
    loading,
    error,
    setActiveConnectionId,
    archiveConnection,
    restoreConnection,
    removeConnection,
    editConnection,
    refreshConnections
  } = useActiveConnection();

  // Search, Filter, Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all'); // 'all', 'archived', or specific connectionType
  const [sortBy, setSortBy] = useState<SortOption>('recently_active');

  // Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modals State
  const [editTarget, setEditTarget] = useState<ConnectionItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ item: ConnectionItem; isRestoring: boolean } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ConnectionItem | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // Filter Categories with Real Factual Counts
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: activeConnections.length,
      archived: archivedConnections.length,
    };

    CONNECTION_TYPE_OPTIONS.forEach(opt => {
      counts[opt.type] = activeConnections.filter(c => c.rawConnectionType === opt.type).length;
    });

    return counts;
  }, [activeConnections, archivedConnections]);

  // Filtered & Sorted Connections
  const displayedConnections = useMemo(() => {
    let list = selectedFilter === 'archived' ? [...archivedConnections] : [...activeConnections];

    // Filter by category if not 'all' or 'archived'
    if (selectedFilter !== 'all' && selectedFilter !== 'archived') {
      list = list.filter(c => c.rawConnectionType === selectedFilter);
    }

    // Search query filter (search by display name or relationship type)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.displayName.toLowerCase().includes(q) ||
        c.relationshipType.toLowerCase().includes(q) ||
        (c.partner?.displayName && c.partner.displayName.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'recently_active') {
        const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : new Date(a.createdAt).getTime();
        const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      }
      if (sortBy === 'recently_added') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'name_asc') {
        return a.displayName.localeCompare(b.displayName);
      }
      if (sortBy === 'name_desc') {
        return b.displayName.localeCompare(a.displayName);
      }
      return 0;
    });

    return list;
  }, [activeConnections, archivedConnections, selectedFilter, searchQuery, sortBy]);

  const handleOpenConnection = async (conn: ConnectionItem) => {
    await setActiveConnectionId(conn.id);
    onOpenSpace(conn.id);
  };

  const handleCopyInviteCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedInviteId(id);
    setTimeout(() => setCopiedInviteId(null), 2500);
  };

  const formatActivityTime = (isoString?: string | null) => {
    if (!isoString) return 'No shared activity yet';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Active just now';
      if (diffMins < 60) return `Active ${diffMins}m ago`;
      if (diffHours < 24) return `Active ${diffHours}h ago`;
      if (diffDays === 1) return 'Active yesterday';
      if (diffDays < 7) return `Active ${diffDays}d ago`;

      return `Active ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    } catch {
      return 'Recent activity';
    }
  };

  return (
    <div className="w-full space-y-6 pb-28 animate-fadeIn">
      {/* Top Header */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold mb-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Private Connections</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Connections</h1>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            The people and relationships that matter to you.
          </p>
        </div>

        <button
          onClick={() => onOpenPairing('options')}
          className="self-start sm:self-auto py-2.5 px-4 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-xs shadow-lg shadow-violet-500/20 hover:opacity-95 active:scale-[0.985] cursor-pointer flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Connection</span>
        </button>
      </div>

      {/* Search Bar & Sort Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your connections by name or relationship type..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-white placeholder:text-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-violet-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort connections"
              className="appearance-none py-3 pl-9 pr-8 rounded-2xl bg-zinc-900 border border-white/10 text-zinc-200 text-xs font-semibold focus:outline-none focus:border-violet-500 cursor-pointer transition-all"
            >
              <option value="recently_active">Recently Active</option>
              <option value="recently_added">Recently Added</option>
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter Category Chips with Live Counts */}
      <div className="overflow-x-auto no-scrollbar pb-1">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedFilter === 'all'
                ? 'bg-violet-600/20 border-violet-500/50 text-white ring-1 ring-violet-500/30'
                : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/15'
            }`}
          >
            <span>All</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedFilter === 'all' ? 'bg-violet-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              {filterCounts.all}
            </span>
          </button>

          {CONNECTION_TYPE_OPTIONS.map((opt) => {
            const count = filterCounts[opt.type] || 0;
            const isSelected = selectedFilter === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => setSelectedFilter(opt.type)}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-violet-600/20 border-violet-500/50 text-white ring-1 ring-violet-500/30'
                    : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/15'
                }`}
              >
                <span>{opt.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-violet-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}

          {/* Archived Filter Chip */}
          <button
            onClick={() => setSelectedFilter('archived')}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedFilter === 'archived'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 ring-1 ring-amber-500/30'
                : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/15'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedFilter === 'archived' ? 'bg-amber-500 text-black font-bold' : 'bg-zinc-800 text-zinc-400'}`}>
              {filterCounts.archived}
            </span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="glass-card rounded-3xl p-6 border border-rose-500/30 bg-rose-500/[0.04] text-center space-y-3">
          <p className="text-xs text-rose-300 font-semibold">{error}</p>
          <button
            onClick={() => refreshConnections()}
            className="py-2 px-4 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-semibold hover:bg-zinc-800 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-3xl bg-zinc-900/60 border border-white/5 animate-pulse p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800" />
                <div className="space-y-2 flex-1">
                  <div className="w-24 h-4 bg-zinc-800 rounded" />
                  <div className="w-16 h-3 bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="w-full h-8 bg-zinc-800/60 rounded-xl" />
            </div>
          ))}
        </div>
      ) : displayedConnections.length === 0 ? (
        /* Empty States */
        <div className="glass-card rounded-3xl p-8 border border-white/10 text-center space-y-4 my-4 animate-scaleUp">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 text-violet-400 flex items-center justify-center mx-auto">
            {searchQuery ? <Search className="w-6 h-6" /> : selectedFilter === 'archived' ? <Archive className="w-6 h-6 text-amber-400" /> : <Users className="w-6 h-6" />}
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-1">
              {searchQuery
                ? `No connections matching "${searchQuery}"`
                : selectedFilter === 'archived'
                ? 'No archived connections'
                : 'Your connections will appear here.'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              {searchQuery
                ? 'Try searching by a different name or relationship type.'
                : selectedFilter === 'archived'
                ? 'Connections you archive will be preserved here safely.'
                : 'Create your first connection with someone who matters to you.'}
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-2">
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-semibold hover:bg-zinc-800 cursor-pointer"
              >
                Clear Search
              </button>
            ) : selectedFilter === 'archived' ? (
              <button
                onClick={() => setSelectedFilter('all')}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-semibold hover:bg-zinc-800 cursor-pointer"
              >
                View Active Connections
              </button>
            ) : (
              <button
                onClick={() => onOpenPairing('options')}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-xs shadow-lg shadow-violet-500/20 hover:opacity-95 cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Connection</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Connection Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {displayedConnections.map((conn) => {
            const isCurrentActive = activeConnectionId === conn.id;
            const isPending = conn.status === 'waiting';
            const isArchived = conn.isArchived;

            return (
              <div
                key={conn.id}
                className={`glass-card rounded-3xl p-5 border transition-all relative overflow-hidden flex flex-col justify-between group shadow-xl ${
                  isCurrentActive 
                    ? 'border-violet-500/50 bg-violet-500/[0.06] ring-1 ring-violet-500/30' 
                    : isArchived
                    ? 'border-white/5 bg-zinc-950/60 opacity-85'
                    : 'border-white/10 hover:border-white/20 bg-zinc-900/60'
                }`}
              >
                {/* Active Indicator Chip */}
                {isCurrentActive && !isArchived && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-l from-violet-600 to-pink-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-bl-xl shadow-md">
                    Active
                  </div>
                )}

                {/* Top Card Row */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <InitialsAvatar
                        name={conn.displayName}
                        photoURL={conn.partner?.photoURL}
                        size="lg"
                      />

                      <div>
                        <h3 className="font-bold text-base text-white truncate max-w-[150px]">
                          {conn.displayName}
                        </h3>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-200 font-semibold">
                            {conn.relationshipType}
                          </span>

                          {isArchived ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                              <Archive className="w-3 h-3" />
                              <span>Archived</span>
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                              <Clock className="w-3 h-3" />
                              <span>Invitation waiting</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Connected</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3-Dots Menu Button */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === conn.id ? null : conn.id);
                        }}
                        className="p-2 rounded-xl bg-zinc-900/80 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                        title="Connection options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === conn.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-20" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                            }} 
                          />
                          <div 
                            className="absolute right-0 top-10 w-48 bg-zinc-950 border border-white/15 rounded-2xl p-1.5 shadow-2xl z-30 space-y-1 animate-scaleUp text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleOpenConnection(conn);
                              }}
                              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:bg-zinc-900 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
                              <span>Open Connection</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                setEditTarget(conn);
                              }}
                              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:bg-zinc-900 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Edit Connection</span>
                            </button>

                            {onOpenPrivacy && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onOpenPrivacy();
                                }}
                                className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:bg-zinc-900 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Manage Privacy</span>
                              </button>
                            )}

                            {isArchived ? (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setArchiveTarget({ item: conn, isRestoring: true });
                                }}
                                className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Restore Connection</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setArchiveTarget({ item: conn, isRestoring: false });
                                }}
                                className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Archive className="w-3.5 h-3.5 text-amber-400" />
                                <span>Archive Connection</span>
                              </button>
                            )}

                            <div className="border-t border-white/5 my-1" />

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                setRemoveTarget(conn);
                              }}
                              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Remove Connection</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pending Invite Quick-Share Box */}
                  {isPending && conn.space.inviteCode && (
                    <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-amber-300">
                        <span className="font-semibold">Invite Code</span>
                        <span className="font-mono font-bold tracking-wider">{conn.space.inviteCode}</span>
                      </div>
                      <button
                        onClick={() => handleCopyInviteCode(conn.space.inviteCode, conn.id)}
                        className="w-full py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-semibold border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copiedInviteId === conn.id ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Copied to clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Invite Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Card Row */}
                <div className="pt-4 mt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 truncate">
                    <Activity className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{formatActivityTime(conn.lastActivityAt)}</span>
                  </div>

                  <button
                    onClick={() => handleOpenConnection(conn)}
                    className="py-2 px-3.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-white text-xs font-semibold border border-violet-500/30 flex items-center gap-1.5 transition-all cursor-pointer group-hover:border-violet-500/60 shrink-0"
                  >
                    <span>Open</span>
                    <ChevronRight className="w-3.5 h-3.5 text-violet-300 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security Isolation Footer */}
      <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex items-center gap-2.5 text-zinc-400 text-xs">
        <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Every connection is strictly isolated. Private reflections and personal records remain visible only to you.</span>
      </div>

      {/* Edit Connection Modal */}
      <EditConnectionModal
        connection={editTarget}
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSave={async (connId, customName, relType) => {
          await editConnection(connId, customName, relType);
        }}
      />

      {/* Archive / Restore Confirmation Modal */}
      <ArchiveConfirmModal
        connection={archiveTarget?.item || null}
        isOpen={Boolean(archiveTarget)}
        isRestoring={archiveTarget?.isRestoring}
        onClose={() => setArchiveTarget(null)}
        onConfirm={async (connId) => {
          if (archiveTarget?.isRestoring) {
            await restoreConnection(connId);
          } else {
            await archiveConnection(connId);
          }
        }}
      />

      {/* Remove Confirmation Modal */}
      <RemoveConnectionModal
        connection={removeTarget}
        isOpen={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={async (connId) => {
          await removeConnection(connId);
        }}
      />
    </div>
  );
};
