/** Official Eastern Christian 2026–2027 calendar (Approved 11/18/2025). Midland Park campus. */
export const EC_SCHOOL_YEAR_LABEL = "2026-2027";
export const EC_GYM_NAME = "Eastern Christian";
export const EC_FIRST_STUDENT_DAY = "2026-09-01";
export const EC_LAST_STUDENT_DAY = "2027-06-17";
export const EC_EXPECTED_STUDENT_DAYS = 178;

const CLOSED = new Set([
  "2026-09-07", // Labor Day
  "2026-10-08", // Inservice
  "2026-10-09",
  "2026-10-12", // Columbus Day
  "2026-11-05", // Parent conferences — PK–8 off (Midland Park campus closed)
  "2026-11-06",
  "2026-11-26", // Thanksgiving
  "2026-11-27",
  "2026-12-24", // Christmas & New Year
  "2026-12-25",
  "2026-12-28",
  "2026-12-29",
  "2026-12-30",
  "2026-12-31",
  "2027-01-01",
  "2027-01-18", // MLK Jr. Day
  "2027-02-11", // Inservice
  "2027-02-12",
  "2027-02-15", // Presidents' Day
  "2027-03-26", // Good Friday
  "2027-03-29", // Spring break
  "2027-03-30",
  "2027-03-31",
  "2027-04-01",
  "2027-04-02",
  "2027-04-08", // Parent conferences — PK–5 off (Midland Park campus closed)
  "2027-04-09",
  "2027-05-06", // Inservice
  "2027-05-07",
  "2027-05-31", // Memorial Day
]);

/** 12:30 p.m. dismissal on the Eastern Christian calendar. Gym opens after that. */
export const EC_HALF_DAYS: Record<string, string> = {
  "2026-11-25": "Thanksgiving early dismissal",
  "2026-12-23": "Christmas break early dismissal",
  "2027-06-17": "Last day of school",
};

export function ecSchoolInSessionDates() {
  const dates: string[] = [];
  const cursor = new Date(`${EC_FIRST_STUDENT_DAY}T12:00:00.000Z`);
  const last = new Date(`${EC_LAST_STUDENT_DAY}T12:00:00.000Z`);
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
