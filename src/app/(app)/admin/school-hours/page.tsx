import { SchoolHoursBoards, type SchoolDayRow } from "@/components/school-hours-admin";
import { EC_GYM_NAME, EC_HALF_DAYS } from "@/lib/ec-school-calendar";
import {
  DISTRICT_GYM_NAMES,
  HALF_DAYS,
  SCHOOL_HALF_DAY_END,
  SCHOOL_IN_SESSION_TITLE,
} from "@/lib/mp-school-calendar";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { calendarDateInAppZone, formatAppWeekday, toTimeInput } from "@/lib/time";

function toRows(
  blocks: { gymName: string; startAt: Date; endAt: Date }[],
  gymNames: readonly string[],
  notes: Record<string, string>,
): SchoolDayRow[] {
  const allowed = new Set(gymNames);
  const byDate = new Map<string, { startAt: Date; endAt: Date }>();
  for (const block of blocks) {
    if (!allowed.has(block.gymName)) continue;
    const date = calendarDateInAppZone(block.startAt);
    if (!byDate.has(date)) {
      byDate.set(date, { startAt: block.startAt, endAt: block.endAt });
    }
  }
  return [...byDate.entries()].map(([date, times]) => {
    const endTime = toTimeInput(times.endAt);
    return {
      date,
      weekday: formatAppWeekday(times.startAt).split(",")[0] ?? "",
      monthLabel: new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        month: "long",
        year: "numeric",
      }).format(times.startAt),
      startTime: toTimeInput(times.startAt),
      endTime,
      half: endTime <= SCHOOL_HALF_DAY_END,
      note: notes[date],
    };
  });
}

export default async function AdminSchoolHoursPage() {
  await requireAdmin();
  const blocks = await prisma.blockedPeriod.findMany({
    where: { title: SCHOOL_IN_SESSION_TITLE },
    include: { gym: true },
    orderBy: { startAt: "asc" },
  });
  const mapped = blocks.map((block) => ({
    gymName: block.gym.name,
    startAt: block.startAt,
    endAt: block.endAt,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          School calendars
        </p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">School hours</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Gray out a gym while that school is in session. Midland Park public schools and
          Eastern Christian use different calendars. Change a day, mark a half day, or
          remove a day the building is closed. The Barn is not on either calendar.
        </p>
      </div>
      <SchoolHoursBoards
        district={toRows(mapped, DISTRICT_GYM_NAMES, HALF_DAYS)}
        easternChristian={toRows(mapped, [EC_GYM_NAME], EC_HALF_DAYS)}
      />
    </div>
  );
}
