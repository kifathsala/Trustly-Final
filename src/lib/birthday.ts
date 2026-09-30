/**
 * Birthday & Date of Birth (DOB) utility functions for TRUSTLY.
 * 
 * Privacy & Logic Rules:
 * 1. Timezone: Uses browser/device local date rather than UTC-only comparison to prevent off-by-one day issues.
 * 2. Leap Year Rule: For Feb 29 birthdays, in non-leap years, the app recognizes and celebrates on February 28.
 * 3. Year / Age Privacy: Birth year and exact age are NEVER exposed or displayed unless explicitly chosen.
 */

export interface BirthdayMatchResult {
  isToday: boolean;
  isUpcoming: boolean;
  daysRemaining: number;
  formattedDisplay: string; // e.g., "12 December"
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Parses DOB string ("YYYY-MM-DD" or "MM-DD") into month (1-12) and day (1-31).
 */
export function parseBirthdayComponents(dobStr?: string): { month: number; day: number; year?: number } | null {
  if (!dobStr) return null;
  const parts = dobStr.trim().split('-');
  
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { month, day, year: isNaN(year) ? undefined : year };
    }
  } else if (parts.length === 2) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    if (!isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { month, day };
    }
  }
  return null;
}

/**
 * Formats a birthday date for safe display without showing the birth year or age.
 * Example output: "12 December"
 */
export function formatBirthdayDisplay(dobStr?: string, includeYear: boolean = false): string {
  const parsed = parseBirthdayComponents(dobStr);
  if (!parsed) return '';
  const monthName = MONTH_NAMES[parsed.month - 1] || '';
  if (includeYear && parsed.year) {
    return `${parsed.day} ${monthName} ${parsed.year}`;
  }
  return `${parsed.day} ${monthName}`;
}

/**
 * Checks if today in the user's local timezone matches the birthday date.
 * Gracefully handles leap years (Feb 29 -> celebrated on Feb 28 in non-leap years).
 */
export function isBirthdayToday(dobStr?: string): boolean {
  const parsed = parseBirthdayComponents(dobStr);
  if (!parsed) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate(); // 1-31

  let targetMonth = parsed.month;
  let targetDay = parsed.day;

  // Leap year rule:
  // If born on Feb 29 and current year is NOT a leap year, celebrate on Feb 28
  if (targetMonth === 2 && targetDay === 29 && !isLeapYear(currentYear)) {
    targetDay = 28;
  }

  return currentMonth === targetMonth && currentDay === targetDay;
}

/**
 * Calculates countdown to the next birthday occurrence.
 */
export function getBirthdayCountdown(dobStr?: string): BirthdayMatchResult | null {
  const parsed = parseBirthdayComponents(dobStr);
  if (!parsed) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const currentYear = now.getFullYear();
  let targetMonth = parsed.month;
  let targetDay = parsed.day;

  // Leap year check for current year
  if (targetMonth === 2 && targetDay === 29 && !isLeapYear(currentYear)) {
    targetDay = 28;
  }

  let nextOccurrence = new Date(currentYear, targetMonth - 1, targetDay);
  nextOccurrence.setHours(0, 0, 0, 0);

  if (nextOccurrence.getTime() < now.getTime()) {
    // Has passed this year, roll to next year
    const nextYear = currentYear + 1;
    let nextYearDay = parsed.day;
    if (targetMonth === 2 && targetDay === 29 && !isLeapYear(nextYear)) {
      nextYearDay = 28;
    }
    nextOccurrence = new Date(nextYear, targetMonth - 1, nextYearDay);
    nextOccurrence.setHours(0, 0, 0, 0);
  }

  const diffTime = nextOccurrence.getTime() - now.getTime();
  const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const isToday = daysRemaining === 0;
  const isUpcoming = daysRemaining > 0 && daysRemaining <= 30;

  return {
    isToday,
    isUpcoming,
    daysRemaining,
    formattedDisplay: formatBirthdayDisplay(dobStr, false)
  };
}
