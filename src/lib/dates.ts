/**
 * Robust local date parsing, recurrence calculation, and countdown formatting.
 * Treats calendar dates as pure local dates without UTC shifts.
 */

export interface DateParsed {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

export function parseLocalDate(dateStr: string): DateParsed {
  if (!dateStr) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      day: parseInt(parts[2], 10)
    };
  }
  const fallback = new Date(dateStr);
  return {
    year: fallback.getFullYear(),
    month: fallback.getMonth() + 1,
    day: fallback.getDate()
  };
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export interface NextOccurrenceResult {
  nextDate: Date;
  diffDays: number;
  countdownText: string;
  isToday: boolean;
  isTomorrow: boolean;
  isPast: boolean;
  formattedDate: string;
}

export function calculateDateDetails(dateStr: string, repeatYearly: boolean = false): NextOccurrenceResult {
  const { year: origYear, month, day } = parseLocalDate(dateStr);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let targetDate: Date;

  if (repeatYearly) {
    const currentYear = today.getFullYear();

    // Adjust for leap year if Feb 29
    let targetDay = day;
    if (month === 2 && day === 29 && !isLeapYear(currentYear)) {
      targetDay = 28;
    }

    let thisYearDate = new Date(currentYear, month - 1, targetDay);
    thisYearDate.setHours(0, 0, 0, 0);

    if (thisYearDate.getTime() < today.getTime()) {
      const nextYear = currentYear + 1;
      let nextYearDay = day;
      if (month === 2 && day === 29 && !isLeapYear(nextYear)) {
        nextYearDay = 28;
      }
      targetDate = new Date(nextYear, month - 1, nextYearDay);
    } else {
      targetDate = thisYearDate;
    }
  } else {
    targetDate = new Date(origYear, month - 1, day);
  }
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const isToday = diffDays === 0;
  const isTomorrow = diffDays === 1;
  const isPast = diffDays < 0;

  let countdownText = '';
  if (isToday) {
    countdownText = 'Today';
  } else if (isTomorrow) {
    countdownText = 'Tomorrow';
  } else if (diffDays > 1 && diffDays <= 30) {
    countdownText = `In ${diffDays} days`;
  } else if (diffDays > 30) {
    const months = Math.round(diffDays / 30.4);
    countdownText = months === 1 ? 'In 1 month' : `In ${months} months`;
  } else if (diffDays === -1) {
    countdownText = 'Yesterday';
  } else {
    countdownText = `${Math.abs(diffDays)} days ago`;
  }

  // Format month and day using user's locale
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[month - 1] || '';
  const formattedDate = repeatYearly 
    ? `${monthName} ${day}`
    : `${monthName} ${day}, ${origYear}`;

  return {
    nextDate: targetDate,
    diffDays,
    countdownText,
    isToday,
    isTomorrow,
    isPast,
    formattedDate
  };
}

export function getDateTypeDetails(type?: string): { emoji: string; label: string; badgeClass: string } {
  const t = (type || 'Custom').toLowerCase();
  if (t.includes('birthday')) {
    return { emoji: '🎂', label: 'Birthday', badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/20' };
  }
  if (t.includes('anniversary')) {
    return { emoji: '🥂', label: 'Anniversary', badgeClass: 'bg-pink-500/10 text-pink-300 border-pink-500/20' };
  }
  if (t.includes('family')) {
    return { emoji: '👨‍👩‍👧', label: 'Family Event', badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20' };
  }
  if (t.includes('friendship') || t.includes('friend')) {
    return { emoji: '🤝', label: 'Friendship', badgeClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' };
  }
  if (t.includes('milestone')) {
    return { emoji: '🏆', label: 'Milestone', badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' };
  }
  return { emoji: '📅', label: 'Custom', badgeClass: 'bg-violet-500/10 text-violet-300 border-violet-500/20' };
}

export function getReminderLabel(reminder?: string): string {
  switch (reminder) {
    case '1_day':
      return '1 day before';
    case '3_days':
      return '3 days before';
    case '7_days':
      return '7 days before';
    case 'none':
    default:
      return 'No reminder';
  }
}
