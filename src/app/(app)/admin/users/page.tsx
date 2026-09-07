import { UsersAdmin } from "@/components/users-admin";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { teams: { include: { team: { select: { id: true, name: true } } } } },
  });
  const teams = await prisma.team.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Roster
        </p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">People</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Add coaches, promote admins, or remove someone from the roster.
          Remove takes them off the board — they cannot sign in, and their practices
          are deleted. New people get a temporary password and a welcome email with
          the site link. They must choose their own password on first sign-in.
          If they have not chosen a password yet, use Resend to email a new
          temporary password. After they have signed in, that button becomes Reset
          and emails a new temporary password they must change on next sign-in.
        </p>
      </div>
      <UsersAdmin
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          receivesMonopolyAlerts: user.receivesMonopolyAlerts,
          mustChangePassword: user.mustChangePassword,
          teamIds: user.teams.map((row) => row.teamId),
          teamNames: user.teams.map((row) => row.team.name),
        }))}
        teams={teams}
        currentUserId={admin.id}
      />
    </div>
  );
}
