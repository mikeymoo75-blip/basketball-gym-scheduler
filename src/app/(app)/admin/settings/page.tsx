import { SettingsForm } from "@/components/settings-form";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [settings, people] = await Promise.all([
    getSettings(),
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
          Defaults are a rolling 14-day window, 10 booked hours, or 35% of all reserved
          time — counted per team. Add a help email and phone here too. Coaches only see
          that contact after they sign in.
        </p>
      </div>
      <SettingsForm
        settings={{
          monopolyWindowDays: settings.monopolyWindowDays,
          monopolyHoursThreshold: settings.monopolyHoursThreshold,
          monopolyShareThreshold: settings.monopolyShareThreshold,
          supportEmail: settings.supportEmail,
          supportPhone: settings.supportPhone,
        }}
        people={people}
      />
    </div>
  );
}
