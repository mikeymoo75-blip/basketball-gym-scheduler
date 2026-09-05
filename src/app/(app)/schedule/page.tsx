import { addDays, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { ScheduleBoard } from "@/components/schedule-board";
import { prisma } from "@/lib/prisma";
import { getActiveGyms, getSchedule } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { parseDateInput, toDateInput } from "@/lib/time";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; gym?: string; date?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const view = params.view === "month" ? "month" : "week";
  const gymId = params.gym ?? "all";
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
    ? params.date
    : toDateInput(new Date());
  const anchor = parseDateInput(date);

  const range =
    view === "month"
      ? {
          start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
          end: addDays(endOfWeek(addDays(startOfMonth(anchor), 32), { weekStartsOn: 1 }), 1),
        }
      : {
          start: startOfWeek(anchor, { weekStartsOn: 1 }),
          end: addDays(endOfWeek(anchor, { weekStartsOn: 1 }), 1),
        };

  const [{ bookings, blocks }, gyms, coaches] = await Promise.all([
    getSchedule(range.start, range.end, gymId === "all" ? undefined : gymId),
    getActiveGyms(),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <ScheduleBoard
      gyms={gyms.map((gym) => ({ id: gym.id, name: gym.name }))}
      coaches={coaches}
      bookings={bookings.map((booking) => ({
        id: booking.id,
        gymId: booking.gymId,
        gymName: booking.gym.name,
        userId: booking.userId,
        userName: booking.user.name,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        notes: booking.notes,
      }))}
      blocks={blocks.map((block) => ({
        id: block.id,
        gymId: block.gymId,
        gymName: block.gym.name,
        title: block.title,
        kind: block.kind,
        startAt: block.startAt.toISOString(),
        endAt: block.endAt.toISOString(),
      }))}
      view={view}
      gymId={gymId}
      date={date}
      currentUserId={user.id}
      isAdmin={user.role === "ADMIN"}
    />
  );
}
