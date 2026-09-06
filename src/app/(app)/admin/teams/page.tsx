import { TeamsAdmin } from "@/components/teams-admin";
import { getAllTeams } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function AdminTeamsPage() {
  await requireAdmin();
  const [teams, coaches] = await Promise.all([
    getAllTeams(),
    prisma.user.findMany({
      where: { role: "COACH", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Programs
        </p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Teams</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          A coach can run more than one team. Each practice is tagged with the team it
          is for. Gym-time limits are counted per team, so two programs do not look like
          one coach is monopolizing the floor.
        </p>
      </div>
      <TeamsAdmin
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          notes: team.notes,
          active: team.active,
          coachIds: team.coaches.map((row) => row.userId),
          coachNames: team.coaches.map((row) => row.user.name),
          bookingCount: team._count.bookings,
        }))}
        coaches={coaches}
      />
    </div>
  );
}
