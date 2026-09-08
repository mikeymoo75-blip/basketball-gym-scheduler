import { DISTRICT_GYM_NAMES } from "@/lib/mp-school-calendar";
import { EC_GYM_NAME } from "@/lib/ec-school-calendar";

export const SCHOOL_CALENDAR_IDS = ["district", "eastern-christian"] as const;
export type SchoolCalendarId = (typeof SCHOOL_CALENDAR_IDS)[number];

export function gymNamesForCalendar(calendar: SchoolCalendarId) {
  if (calendar === "eastern-christian") return [EC_GYM_NAME];
  return [...DISTRICT_GYM_NAMES];
}
