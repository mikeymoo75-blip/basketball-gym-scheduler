import { format } from "date-fns";
import { PracticesList } from "@/components/practices-list";
import { prisma } from "@/lib/prisma";
import { bookingInclude } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { formatRange } from "@/lib/time";

export default async function PracticesPage() {
  const user = await requireUser();
  const assignedTeams = await prisma.coachTeam.findMany({
    where: { userId: user.id },
    select: { teamId: true },
  });
  const teamIds = assignedTeams.map((row) => row.teamId);
  const teams =
    user.role === "ADMIN"
      ? await prisma.team.findMany({
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        })
      : await prisma.team.findMany({
          where: { id: { in: teamIds }, active: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        });

  const bookings = await prisma.booking.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : teamIds.length
          ? { teamId: { in: teamIds } }
          : { id: { in: [] } },
    include: bookingInclude,
    orderBy: { startAt: "asc" },
  });

  const upcoming = bookings.filter((booking) => booking.endAt >= new Date());
  const past = bookings.filter((booking) => booking.endAt < new Date()).reverse();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Team schedule
        </p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">My practices</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every practice for {user.role === "ADMIN" ? "all teams" : "your teams"}, including ones
          another coach booked. Print this week, this month, or the full list.
        </p>
      </div>
      <PracticesList
        upcoming={upcoming.map(serialize)}
        past={past.map(serialize)}
        teams={teams}
        currentUserId={user.id}
        isAdmin={user.role === "ADMIN"}
      />
    </div>
  );
}

function serialize(booking: {
  id: string;
  gymId: string;
  userId: string;
  seriesId: string | null;
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
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    notes: booking.notes,
    whenLabel: `${format(booking.startAt, "EEE, MMM d")} · ${formatRange(booking.startAt, booking.endAt)}`,
  };
}
