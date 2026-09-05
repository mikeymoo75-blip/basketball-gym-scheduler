import { UsersAdmin } from "@/components/users-admin";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Roster
        </p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">People</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Add coaches, promote admins, and deactivate accounts that should no longer book.
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
        }))}
      />
    </div>
  );
}
