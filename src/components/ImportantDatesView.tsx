import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ImportantDate, ImportantDateType } from '../types';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  Repeat, 
  Bell, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Check, 
  X, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  ListFilter,
  Sparkles,
  Heart
} from 'lucide-react';
import { sendNotification } from '../lib/notifications';
import { getConnectionLabel } from '../lib/connection';
import { 
  calculateDateDetails, 
  getDateTypeDetails, 
  getReminderLabel, 
  parseLocalDate 
} from '../lib/dates';

const DATE_TYPES: { type: ImportantDateType; label: string; emoji: string }[] = [
  { type: 'Birthday', label: 'Birthday', emoji: '🎂' },
  { type: 'Anniversary', label: 'Anniversary', emoji: '🥂' },
  { type: 'Family Event', label: 'Family Event', emoji: '👨‍👩‍👧' },
  { type: 'Friendship', label: 'Friendship', emoji: '🤝' },
  { type: 'Milestone', label: 'Milestone', emoji: '🏆' },
  { type: 'Custom', label: 'Custom', emoji: '📅' },
];

export const ImportantDatesView: React.FC = () => {
  const { currentUser, userProfile, partnerProfile, coupleSpace } = useAuth();

  const partnerName = partnerProfile?.displayName || coupleSpace?.creatorName || 'Connection Partner';
  const connectionLabel = coupleSpace ? getConnectionLabel(coupleSpace.connectionType) : 'Connection';

  // Subview: 'upcoming' list or 'calendar' grid
  const [subView, setSubView] = useState<'upcoming' | 'calendar'>('upcoming');
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [type, setType] = useState<ImportantDateType>('Birthday');
  const [repeatYearly, setRepeatYearly] = useState(true);
  const [reminder, setReminder] = useState<'none' | '1_day' | '3_days' | '7_days'>('1_day');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delete modal state
  const [dateToDelete, setDateToDelete] = useState<ImportantDate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  // 1. Subscribe to connection's important dates
  useEffect(() => {
    if (!coupleSpace?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const datesCol = collection(db, 'couples', coupleSpace.id, 'importantDates');
    const q = query(datesCol);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data
        } as ImportantDate;
      });
      setDates(items);
      setLoading(false);
    }, (err) => {
      console.error("Important dates listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [coupleSpace?.id]);

  // Form handlers
  const handleOpenAddDate = (prefillDate?: string) => {
    setEditingDateId(null);
    setTitle('');
    setDateStr(prefillDate || new Date().toISOString().split('T')[0]);
    setType('Birthday');
    setRepeatYearly(true);
    setReminder('1_day');
    setNotes('');
    setErrorMsg(null);
    setShowFormModal(true);
  };

  const handleOpenEditDate = (d: ImportantDate) => {
    setEditingDateId(d.id || null);
    setTitle(d.title || '');
    setDateStr(d.date || '');
    setType((d.type as ImportantDateType) || (d.category as ImportantDateType) || 'Custom');
    setRepeatYearly(d.repeatYearly ?? true);
    setReminder((d.reminder as any) || '1_day');
    setNotes(d.notes || d.description || '');
    setErrorMsg(null);
    setShowFormModal(true);
  };

  const handleSaveDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid || !coupleSpace?.id || !title.trim() || !dateStr) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const dateId = editingDateId || `date_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const creatorName = userProfile?.displayName || 'Connection Member';

    try {
      const dateDocRef = doc(db, 'couples', coupleSpace.id, 'importantDates', dateId);

      if (editingDateId) {
        await updateDoc(dateDocRef, {
          title: title.trim(),
          date: dateStr,
          type,
          category: type,
          repeatYearly,
          reminder,
          reminderDays: reminder === '1_day' ? 1 : reminder === '3_days' ? 3 : reminder === '7_days' ? 7 : 0,
          notes: notes.trim() || null,
          description: notes.trim() || null,
          updatedAt: timestamp
        });
      } else {
        const newDate: ImportantDate = {
          id: dateId,
          coupleId: coupleSpace.id,
          createdBy: currentUser.uid,
          creatorName,
          title: title.trim(),
          date: dateStr,
          type,
          category: type,
          repeatYearly,
          reminder,
          reminderDays: reminder === '1_day' ? 1 : reminder === '3_days' ? 3 : reminder === '7_days' ? 7 : 0,
          notes: notes.trim() || undefined,
          description: notes.trim() || undefined,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        await setDoc(dateDocRef, newDate);

        // Notify partner gracefully
        const partnerUid = coupleSpace.memberIds?.find(uid => uid !== currentUser.uid);
        if (partnerUid) {
          sendNotification(partnerUid, {
            type: 'date',
            title: 'New Important Date 📅',
            body: `${creatorName} added "${title.trim()}" to your shared dates.`,
            connectionId: coupleSpace.id
          }).catch(console.error);
        }
      }

      setShowFormModal(false);
    } catch (err: any) {
      console.error("Save important date error:", err);
      setErrorMsg(err.message || "Failed to save date. Please check permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!coupleSpace?.id || !dateToDelete?.id) return;

    setIsDeleting(true);
    try {
      const dateDocRef = doc(db, 'couples', coupleSpace.id, 'importantDates', dateToDelete.id);
      await deleteDoc(dateDocRef);
      setDateToDelete(null);
    } catch (err) {
      console.error("Delete date error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Sort upcoming dates by days remaining (closest upcoming first, past dates last)
  const sortedUpcoming = [...dates].map(d => {
    const details = calculateDateDetails(d.date, d.repeatYearly);
    return { date: d, details };
  }).sort((a, b) => {
    // If both are today or future, sort ascending by diffDays
    if (a.details.diffDays >= 0 && b.details.diffDays >= 0) {
      return a.details.diffDays - b.details.diffDays;
    }
    // Future before past
    if (a.details.diffDays >= 0 && b.details.diffDays < 0) {
      return -1;
    }
    if (a.details.diffDays < 0 && b.details.diffDays >= 0) {
      return 1;
    }
    // Both are past: sort closest past first
    return b.details.diffDays - a.details.diffDays;
  });

  // Calendar calculation helpers
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-indexed

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedCalendarDate(null);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedCalendarDate(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedCalendarDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to find dates occurring on a calendar day (checking year/month/day or yearly recurrence)
  const getDatesForCalendarDay = (d: number, m: number, y: number): ImportantDate[] => {
    return dates.filter(item => {
      const parsed = parseLocalDate(item.date);
      if (item.repeatYearly) {
        return parsed.month === m + 1 && parsed.day === d;
      }
      return parsed.year === y && parsed.month === m + 1 && parsed.day === d;
    });
  };

  const selectedDayEvents = selectedCalendarDate 
    ? getDatesForCalendarDay(
        selectedCalendarDate.getDate(), 
        selectedCalendarDate.getMonth(), 
        selectedCalendarDate.getFullYear()
      )
    : [];

  return (
    <div className="w-full space-y-6 pb-28 animate-fadeIn text-left">
      {/* HEADER & VIEW SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-purple-400" />
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Important Dates</h2>
            <p className="text-[11px] text-zinc-400">
              With: <strong className="text-white">{partnerName}</strong> ({connectionLabel})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Subview Toggle */}
          <div className="flex items-center bg-zinc-950/80 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setSubView('upcoming')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                subView === 'upcoming'
                  ? 'bg-zinc-900 border border-white/10 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Upcoming</span>
            </button>
            <button
              onClick={() => setSubView('calendar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                subView === 'calendar'
                  ? 'bg-zinc-900 border border-white/10 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenAddDate()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-rose-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Date</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. UPCOMING LIST VIEW */}
      {/* ========================================================================= */}
      {subView === 'upcoming' && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 animate-pulse space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-32 bg-white/10 rounded-md" />
                    <div className="h-4 w-16 bg-white/10 rounded-md" />
                  </div>
                  <div className="h-3 w-48 bg-white/5 rounded-md" />
                </div>
              ))}
            </div>
          ) : sortedUpcoming.length === 0 ? (
            /* EMPTY STATE */
            <div className="glass-card rounded-3xl p-8 border border-white/5 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-300">No important dates yet.</h4>
                <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Save birthdays, anniversaries, trips, and milestones you don't want to forget.
                </p>
              </div>
              <button
                onClick={() => handleOpenAddDate()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Important Date</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {sortedUpcoming.map(({ date: d, details }) => {
                const typeInfo = getDateTypeDetails(d.type || d.category);
                const reminderLabel = getReminderLabel(d.reminder);
                const isCreator = d.createdBy === currentUser?.uid;

                return (
                  <div
                    key={d.id}
                    className="p-4 rounded-3xl bg-zinc-900/60 border border-white/5 hover:border-white/15 transition-all shadow-md flex flex-col justify-between group space-y-3"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${typeInfo.badgeClass}`}>
                          <span>{typeInfo.emoji}</span>
                          <span>{typeInfo.label}</span>
                        </span>

                        {/* Countdown Badge */}
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          details.isToday
                            ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                            : details.isTomorrow
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : details.diffDays > 0 && details.diffDays <= 7
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : details.isPast
                            ? 'bg-zinc-800 text-zinc-400 border-white/5'
                            : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        }`}>
                          {details.countdownText}
                        </span>
                      </div>

                      {/* Title & Date */}
                      <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                        {d.title}
                      </h4>
                      <p className="text-xs text-zinc-300 font-medium mt-0.5 flex items-center gap-1.5">
                        <span>{details.formattedDate}</span>
                        {d.repeatYearly && (
                          <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20 inline-flex items-center gap-0.5">
                            <Repeat className="w-2.5 h-2.5" />
                            <span>Yearly</span>
                          </span>
                        )}
                      </p>

                      {/* Notes / Description if present */}
                      {(d.notes || d.description) && (
                        <p className="text-[11px] text-zinc-400 mt-2 p-2.5 rounded-2xl bg-black/20 border border-white/5 leading-relaxed whitespace-pre-wrap">
                          {d.notes || d.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom toolbar */}
                    <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500">
                      <div className="flex items-center gap-2">
                        {d.reminder && d.reminder !== 'none' && (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Bell className="w-3 h-3 text-purple-400" />
                            <span>{reminderLabel}</span>
                          </span>
                        )}
                        <span>Added by {isCreator ? 'You' : (d.creatorName || partnerName)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditDate(d)}
                          className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                          title="Edit Date"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDateToDelete(d)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-400 transition-colors"
                          title="Delete Date"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CALENDAR VIEW */}
      {/* ========================================================================= */}
      {subView === 'calendar' && (
        <div className="space-y-4">
          {/* Calendar Controller Header */}
          <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {monthNames[month]} {year}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Select a day to view its dates and milestones
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={goToToday}
                  className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, idx) => (
                <div key={idx} className="text-[10px] font-bold uppercase text-zinc-500 py-1">
                  {dayName}
                </div>
              ))}

              {/* Prev month padding days */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => {
                const prevDateNum = daysInPrevMonth - firstDayOfMonth + i + 1;
                return (
                  <div
                    key={`prev-${i}`}
                    className="h-12 sm:h-14 p-1 rounded-xl bg-zinc-950/20 text-zinc-600 text-xs flex flex-col justify-between opacity-40 select-none"
                  >
                    <span>{prevDateNum}</span>
                  </div>
                );
              })}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const cellDate = new Date(year, month, dayNum);
                const dayEvents = getDatesForCalendarDay(dayNum, month, year);

                const today = new Date();
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNum;
                const isSelected = selectedCalendarDate?.getFullYear() === year && 
                                   selectedCalendarDate?.getMonth() === month && 
                                   selectedCalendarDate?.getDate() === dayNum;

                return (
                  <button
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedCalendarDate(cellDate)}
                    className={`h-12 sm:h-14 p-1.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/15 text-white ring-1 ring-purple-500'
                        : isToday
                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                        : dayEvents.length > 0
                        ? 'border-white/10 bg-zinc-900/80 text-zinc-200 hover:border-purple-500/40'
                        : 'border-white/5 bg-zinc-900/30 text-zinc-400 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isToday ? 'text-rose-400' : ''}`}>
                        {dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500 text-white leading-tight">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Indicator dots */}
                    {dayEvents.length > 0 && (
                      <div className="flex items-center gap-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev, evIdx) => (
                          <span key={evIdx} className="text-[10px] leading-none shrink-0" title={ev.title}>
                            {getDateTypeDetails(ev.type || ev.category).emoji}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Calendar Day Events Panel */}
          {selectedCalendarDate && (
            <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-3 animate-fadeIn text-left">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-purple-400" />
                  <span>
                    Events for {monthNames[selectedCalendarDate.getMonth()]} {selectedCalendarDate.getDate()}, {selectedCalendarDate.getFullYear()}
                  </span>
                </h4>

                <button
                  onClick={() => {
                    const formatted = `${selectedCalendarDate.getFullYear()}-${String(selectedCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(selectedCalendarDate.getDate()).padStart(2, '0')}`;
                    handleOpenAddDate(formatted);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add for this day</span>
                </button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-zinc-400 py-2">
                  No events or milestones recorded on this day.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map((d) => {
                    const typeInfo = getDateTypeDetails(d.type || d.category);
                    return (
                      <div
                        key={d.id}
                        className="p-3 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{typeInfo.emoji}</span>
                          <div>
                            <div className="text-xs font-bold text-white">{d.title}</div>
                            <div className="text-[10px] text-zinc-400">
                              {typeInfo.label} {d.repeatYearly ? '· Repeats yearly' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditDate(d)}
                            className="p-1 rounded text-zinc-400 hover:text-white"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDateToDelete(d)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT IMPORTANT DATE */}
      {/* ========================================================================= */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingDateId ? 'Edit Important Date' : 'Add Important Date'}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Shared privately inside your connection
                </p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveDate} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dad's Birthday, Family Trip, Friendship Milestone"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Date & Type Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ImportantDateType)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {DATE_TYPES.map(t => (
                      <option key={t.type} value={t.type}>
                        {t.emoji} {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Repeat Yearly Toggle */}
              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-purple-200">Repeat every year</h4>
                  <p className="text-[10px] text-zinc-400">Calculate upcoming anniversaries & birthdays automatically</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repeatYearly}
                    onChange={(e) => setRepeatYearly(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                </label>
              </div>

              {/* Reminder Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Reminder
                </label>
                <select
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="none">No reminder</option>
                  <option value="1_day">1 day before</option>
                  <option value="3_days">3 days before</option>
                  <option value="7_days">7 days before</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Notes <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Add celebration plans, reservations, or why this day matters..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !dateStr}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-rose-600 hover:opacity-95 text-white text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{editingDateId ? 'Save Changes' : 'Save Date'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {dateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xs bg-zinc-950 border border-rose-500/20 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Delete this important date?</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                This will remove this date from your shared space.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDateToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md flex items-center justify-center gap-1 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
