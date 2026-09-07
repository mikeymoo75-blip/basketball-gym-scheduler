import { TeamsAdmin } from "@/components/teams-admin";
import { getAllTeams } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function AdminTeamsPage() {
  await requireAdmin();
  const [teams, coaches] = await Promise.all([
    getAllTeams(),
    prisma.user.findMany({
      where: { active: true, role: { in: ["COACH", "ADMIN"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
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
          Add a team, then check who runs it. Coaches and admins can both be on
          a team. When they book practice they only see their teams. Gym-time
          limits are counted per team.
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
