import {
  addDays,
  addMinutes,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 22;
export const SLOT_MINUTES = 30;
export const PRACTICE_MINUTES = 60;
export const WEEK_STARTS_ON = 0;

export function hoursBetween(start: Date, end: Date) {
  return differenceInMinutes(end, start) / 60;
}

export function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function parseDateTime(dateValue: string, timeValue: string) {
  const date = parseDateInput(dateValue);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim());
  if (!date || !timeMatch) return null;
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function toDateInput(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function toTimeInput(date: Date) {
  return format(date, "HH:mm");
}

export function weekRange(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
  const end = endOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
  return { start, end };
}

export function monthRange(anchor: Date) {
  return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
}

export function eachDay(start: Date, end: Date) {
  const days: Date[] = [];
  let cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor <= last) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function minutesFromTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function timeOptions(bookFrom = `${DAY_START_HOUR.toString().padStart(2, "0")}:00`, bookUntil = "22:00") {
  const from = minutesFromTime(bookFrom) ?? DAY_START_HOUR * 60;
  const until = minutesFromTime(bookUntil) ?? DAY_END_HOUR * 60;
  const options: { value: string; label: string }[] = [];
  for (let hour = DAY_START_HOUR; hour < DAY_END_HOUR; hour += 1) {
    for (const minute of [0, 30]) {
      const start = hour * 60 + minute;
      if (start < from) continue;
      if (start + PRACTICE_MINUTES > until) continue;
      const date = new Date(2000, 0, 1, hour, minute);
      options.push({
        value: format(date, "HH:mm"),
        label: format(date, "h:mm a"),
      });
    }
  }
  return options;
}

export function isBookableStart(hour: number, minute: number, bookFrom: string, bookUntil: string) {
  const start = hour * 60 + minute;
  const from = minutesFromTime(bookFrom) ?? DAY_START_HOUR * 60;
  const until = minutesFromTime(bookUntil) ?? DAY_END_HOUR * 60;
  return start >= from && start + PRACTICE_MINUTES <= until;
}

export function formatClock(value: string) {
  const minutes = minutesFromTime(value);
  if (minutes == null) return value;
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return format(date, "h:mm a");
}

export function hourBoundaryOptions() {
  const options: { value: string; label: string }[] = [];
  for (let hour = DAY_START_HOUR; hour <= DAY_END_HOUR; hour += 1) {
    for (const minute of hour === DAY_END_HOUR ? [0] : [0, 30]) {
      const date = new Date(2000, 0, 1, hour, minute);
      options.push({
        value: format(date, "HH:mm"),
        label: format(date, "h:mm a"),
      });
    }
  }
  return options;
}

export function validateGymHours(bookFrom: string, bookUntil: string) {
  const from = minutesFromTime(bookFrom);
  const until = minutesFromTime(bookUntil);
  if (from == null || until == null) return "Pick a valid start and end time.";
  if (until - from < PRACTICE_MINUTES) {
    return "Bookable hours must leave room for a 60-minute practice.";
  }
  return null;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export function eventStyle(start: Date, day: Date) {
  const dayStart = new Date(day);
  dayStart.setHours(DAY_START_HOUR, 0, 0, 0);
  const minutesFromOpen = differenceInMinutes(start, dayStart);
  return minutesFromOpen;
}

export function clampToFacilityDay(date: Date, start: Date, end: Date) {
  const open = new Date(date);
  open.setHours(DAY_START_HOUR, 0, 0, 0);
  const close = new Date(date);
  close.setHours(DAY_END_HOUR, 0, 0, 0);
  const visibleStart = start < open ? open : start;
  const visibleEnd = end > close ? close : end;
  return { visibleStart, visibleEnd };
}

export function hoursInRange(start: Date, end: Date) {
  return Math.max(0, hoursBetween(start, end));
}

export function sameFacilityDay(a: Date, b: Date) {
  return isSameDay(a, b);
}

export function addDuration(start: Date, minutes: number) {
  return addMinutes(start, minutes);
}

export function startOfFacilityDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfFacilityDay(date: Date) {
  return endOfDay(date);
}

export function formatRange(start: Date, end: Date) {
  return `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
}

export function formatDayHeading(date: Date) {
  return format(date, "EEE");
}

export function formatDayNumber(date: Date) {
  return format(date, "d");
}

export function formatWeekLabel(start: Date, end: Date) {
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
  }
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export function formatMonthLabel(date: Date) {
  return format(date, "MMMM yyyy");
}

export { startOfDay, addDays };
