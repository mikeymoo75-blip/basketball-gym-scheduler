import { SchoolHoursAdmin } from "@/components/school-hours-admin";
import { HALF_DAYS, SCHOOL_HALF_DAY_END, SCHOOL_IN_SESSION_TITLE } from "@/lib/mp-school-calendar";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { calendarDateInAppZone, formatAppWeekday, toTimeInput } from "@/lib/time";

export default async function AdminSchoolHoursPage() {
  await requireAdmin();
  const blocks = await prisma.blockedPeriod.findMany({
    where: { title: SCHOOL_IN_SESSION_TITLE },
    orderBy: { startAt: "asc" },
  });

  const byDate = new Map<
    string,
    { startAt: Date; endAt: Date }
  >();
  for (const block of blocks) {
    const date = calendarDateInAppZone(block.startAt);
    if (!byDate.has(date)) {
      byDate.set(date, { startAt: block.startAt, endAt: block.endAt });
    }
  }

  const days = [...byDate.entries()].map(([date, times]) => {
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
      note: HALF_DAYS[date],
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          District calendar
        </p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">School hours</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          These holds keep Godwin, Highland, and the high school gyms off the board while
          school is in session. A full day is 6:00 AM–5:00 PM. A half day is 6:00 AM–12:30
          PM so coaches can book after dismissal. Change any day, mark a half day, or
          remove a day school is closed. Eastern Christian and The Barn stay open.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {days.length} student day{days.length === 1 ? "" : "s"}
          {days.filter((day) => day.half).length
            ? ` · ${days.filter((day) => day.half).length} half day${days.filter((day) => day.half).length === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>
      <SchoolHoursAdmin days={days} />
    </div>
  );
}
