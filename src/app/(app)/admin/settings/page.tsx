import { SettingsForm } from "@/components/settings-form";
import { prisma } from "@/lib/prisma";
import { getUsageSnapshot } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [snapshot, people] = await Promise.all([
    getUsageSnapshot(),
    prisma.user.findMany({
      where: { active: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        receivesMonopolyAlerts: true,
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Policy
        </p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Thresholds</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The line is an equal split of open gym hours among coaches who have a team.
          Add a coach and everyone's fair share drops. School-in-session, closed days,
          and games are not counted as open. Help email and phone show in the side menu
          after people sign in.
        </p>
      </div>
      <SettingsForm
        settings={{
          monopolyWindowDays: snapshot.settings.monopolyWindowDays,
          monopolyFairMultiplier: snapshot.multiplier,
          supportEmail: snapshot.settings.supportEmail,
          supportPhone: snapshot.settings.supportPhone,
        }}
        capacity={{
          availableHours: snapshot.availableHours,
          coachCount: snapshot.coachCount,
          gymCount: snapshot.gymCount,
          equalHours: snapshot.equalHours,
          limitHours: snapshot.limitHours,
        }}
        people={people}
      />
    </div>
  );
}
