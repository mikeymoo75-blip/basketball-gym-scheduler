/** Official Midland Park School District 2026–2027 calendar (Board approved 2/24/2026). */
export const SCHOOL_YEAR_LABEL = "2026-2027";
export const SCHOOL_IN_SESSION_TITLE = "School in session";
export const FIRST_STUDENT_DAY = "2026-09-03";
export const LAST_STUDENT_DAY = "2027-06-24";

const CLOSED = new Set([
  "2026-09-07", // Labor Day
  "2026-09-21", // Yom Kippur
  "2026-11-05", // NJEA convention
  "2026-11-06",
  "2026-11-26", // Thanksgiving
  "2026-11-27",
  "2026-12-24", // Winter recess
  "2026-12-25",
  "2026-12-28",
  "2026-12-29",
  "2026-12-30",
  "2026-12-31",
  "2027-01-01", // New Year's
  "2027-01-18", // MLK / staff development
  "2027-02-15", // Presidents' Day recess
  "2027-02-16",
  "2027-02-17",
  "2027-02-18",
  "2027-02-19",
  "2027-03-10", // Eid al-Fitr
  "2027-03-26", // Good Friday
  "2027-04-12", // Spring break
  "2027-04-13",
  "2027-04-14",
  "2027-04-15",
  "2027-04-16",
  "2027-05-31", // Memorial Day
]);

export function schoolInSessionDates() {
  const dates: string[] = [];
  const cursor = new Date(`${FIRST_STUDENT_DAY}T12:00:00.000Z`);
  const last = new Date(`${LAST_STUDENT_DAY}T12:00:00.000Z`);
  while (cursor <= last) {
    const weekday = cursor.getUTCDay();
    const key = cursor.toISOString().slice(0, 10);
    if (weekday !== 0 && weekday !== 6 && !CLOSED.has(key)) {
      dates.push(key);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
