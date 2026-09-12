import { addDays, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { ScheduleBoard } from "@/components/schedule-board";
import { SCHOOL_IN_SESSION_TITLE } from "@/lib/mp-school-calendar";
import { prisma } from "@/lib/prisma";
import { getActiveGyms, getActiveTeams, getSchedule } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { isBarnGym } from "@/lib/barn";
import { parseDateInput, toDateInput, WEEK_STARTS_ON } from "@/lib/time";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; gym?: string; date?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const view = params.view === "month" ? "month" : "week";
  const gyms = await getActiveGyms();
  const requestedGym = params.gym ?? "all";
  const requestedName = gyms.find((gym) => gym.id === requestedGym)?.name;
  const gymId = isBarnGym(requestedName) ? "all" : requestedGym;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
    ? params.date
    : toDateInput(new Date());
  const anchor = parseDateInput(date) ?? new Date();

  const range =
    view === "month"
      ? {
          start: startOfWeek(startOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON }),
          end: addDays(endOfWeek(addDays(startOfMonth(anchor), 32), { weekStartsOn: WEEK_STARTS_ON }), 1),
        }
      : {
          start: startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON }),
          end: addDays(endOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON }), 1),
        };

  const [{ bookings, blocks }, coaches, teams] = await Promise.all([
    getSchedule(range.start, range.end, gymId === "all" ? undefined : gymId),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    getActiveTeams(),
  ]);

  const seriesIds = [
    ...new Set(bookings.map((booking) => booking.seriesId).filter((id): id is string => Boolean(id))),
  ];
  const seriesRows = seriesIds.length
    ? await prisma.booking.findMany({
        where: { seriesId: { in: seriesIds } },
        select: { seriesId: true, startAt: true },
      })
    : [];

  const boardBlocks =
    view === "month"
      ? blocks.filter((block) => block.title !== SCHOOL_IN_SESSION_TITLE)
      : blocks;

  return (
    <ScheduleBoard
      gyms={gyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        address: gym.address,
        notes: gym.notes,
        bookFrom: gym.bookFrom,
        bookUntil: gym.bookUntil,
      }))}
      coaches={coaches}
      teams={teams.map((team) => ({
        id: team.id,
        name: team.name,
        coachIds: team.coaches.map((row) => row.userId),
      }))}
      bookings={bookings.map((booking) => ({
        id: booking.id,
        gymId: booking.gymId,
        gymName: booking.gym.name,
        userId: booking.userId,
        userName: booking.user.name,
        teamId: booking.teamId ?? "",
        teamName: booking.team?.name ?? "Unassigned",
        seriesId: booking.seriesId,
        remainingInSeries: booking.seriesId
          ? seriesRows.filter(
              (row) => row.seriesId === booking.seriesId && row.startAt >= booking.startAt,
            ).length
          : 1,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        notes: booking.notes,
      }))}
      blocks={boardBlocks.map((block) => ({
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
