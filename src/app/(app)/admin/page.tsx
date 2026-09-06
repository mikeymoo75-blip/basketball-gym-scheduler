import { format } from "date-fns";
import { AlertTriangle, Clock3, Percent, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UsageBoard } from "@/components/usage-board";
import { getUsageSnapshot } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const snapshot = await getUsageSnapshot();
  const over = snapshot.teamRows.filter((row) => row.overLimit);
  const unreadAlerts = await prisma.notification.count({
    where: { type: "MONOPOLY", read: false },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Athletic office
        </p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Usage board</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Rolling {snapshot.settings.monopolyWindowDays}-day window starting{" "}
          {format(snapshot.windowStart, "MMM d")}. A <span className="font-medium">team</span>{" "}
          trips an alert at {snapshot.settings.monopolyHoursThreshold} hours or{" "}
          {Math.round(snapshot.settings.monopolyShareThreshold * 100)}% of all booked time.
          A coach with two teams is not treated as one pile of hours.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Clock3}
          label="Booked hours"
          value={snapshot.totalHours.toFixed(1)}
          hint="Across every team"
        />
        <StatCard
          icon={Users}
          label="Coaches on the board"
          value={String(snapshot.rows.filter((row) => row.count > 0).length)}
          hint={`${snapshot.rows.length} total coaches`}
        />
        <StatCard
          icon={Percent}
          label="Share limit"
          value={`${Math.round(snapshot.settings.monopolyShareThreshold * 100)}%`}
          hint={`${snapshot.settings.monopolyHoursThreshold}h hour cap`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Over the line"
          value={String(over.length)}
          hint={`${unreadAlerts} unread monopoly alerts`}
        />
      </div>

      <UsageBoard
        windowLabel={`${snapshot.settings.monopolyWindowDays}-day`}
        rows={snapshot.rows.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          active: row.active,
          hours: row.hours,
          count: row.count,
          share: row.share,
          overLimit: row.overLimit,
          teamBreakdown: row.teamBreakdown,
          practices: row.practices,
        }))}
        teamRows={snapshot.teamRows.map((row) => ({
          id: row.id,
          name: row.name,
          hours: row.hours,
          count: row.count,
          share: row.share,
          overLimit: row.overLimit,
          coachNames: row.coachNames,
          practices: row.practices,
        }))}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <Icon className="size-4 text-primary" />
        </div>
        <p className="font-heading text-3xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
