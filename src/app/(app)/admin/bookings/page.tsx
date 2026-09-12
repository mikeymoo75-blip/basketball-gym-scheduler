import { format } from "date-fns";
import { BookingsList } from "@/components/bookings-list";
import { prisma } from "@/lib/prisma";
import { bookingInclude, getActiveTeams } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { formatRange } from "@/lib/time";

export default async function AdminBookingsPage() {
  const user = await requireAdmin();
  const bookings = await prisma.booking.findMany({
    include: bookingInclude,
    orderBy: { startAt: "asc" },
  });
  const gyms = await prisma.gym.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
  const coaches = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
  const teams = await getActiveTeams();

  const upcoming = bookings.filter((booking) => booking.endAt >= new Date());
  const past = bookings.filter((booking) => booking.endAt < new Date()).reverse();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Reservations
        </p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Bookings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every practice and game on the board, including ones you booked for another coach
          or team. Filter by gym, team, coach, or date.
        </p>
      </div>
      <BookingsList
        upcoming={upcoming.map(serialize)}
        past={past.map(serialize)}
        gyms={gyms}
        coaches={coaches}
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          coachIds: team.coaches.map((row) => row.userId),
        }))}
        currentUserId={user.id}
        isAdmin
        occupied={bookings.map((booking) => ({
          id: booking.id,
          gymId: booking.gymId,
          gymName: booking.gym.name,
          startAt: booking.startAt.toISOString(),
          endAt: booking.endAt.toISOString(),
          label: booking.team?.name ?? booking.user.name,
          kind: "booking" as const,
        }))}
      />
    </div>
  );
}

function serialize(booking: {
  id: string;
  gymId: string;
  userId: string;
  seriesId: string | null;
  kind?: string | null;
  startAt: Date;
  endAt: Date;
  notes: string | null;
  gym: { name: string };
  user: { name: string };
  teamId: string | null;
  team: { name: string } | null;
}) {
  return {
    id: booking.id,
    gymId: booking.gymId,
    gymName: booking.gym.name,
    userId: booking.userId,
    userName: booking.user.name,
    teamId: booking.teamId ?? "",
    teamName: booking.team?.name ?? "Unassigned",
    seriesId: booking.seriesId,
    kind: booking.kind === "GAME" ? ("GAME" as const) : ("PRACTICE" as const),
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    notes: booking.notes,
    whenLabel: `${format(booking.startAt, "EEE, MMM d")} · ${formatRange(booking.startAt, booking.endAt)}`,
  };
}
