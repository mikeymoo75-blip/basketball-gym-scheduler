import { format } from "date-fns";
import { AlertTriangle, Clock3, Scale, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UsageBoard } from "@/components/usage-board";
import { getUsageSnapshot } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const snapshot = await getUsageSnapshot();
  const overTeams = snapshot.teamRows.filter((row) => row.overLimit);
  const overCoaches = snapshot.rows.filter((row) => row.overLimit);
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
          Open gym hours from {format(snapshot.windowStart, "MMM d")} through{" "}
          {format(snapshot.windowEnd, "MMM d")} ({snapshot.settings.monopolyWindowDays} days
          back and ahead). {snapshot.availableHours.toFixed(0)} open hours ÷{" "}
          {snapshot.coachCount} coach{snapshot.coachCount === 1 ? "" : "es"} ={" "}
          {snapshot.equalHours.toFixed(1)}h equal split. Alert at {snapshot.limitHours.toFixed(1)}h
          ({Math.round(snapshot.multiplier * 100)}% of equal). Games, closed days, and school
          hours are not open time. Add a coach and the split drops.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Clock3}
          label="Open gym hours"
          value={snapshot.availableHours.toFixed(0)}
          hint={`${snapshot.totalHours.toFixed(1)}h of practices booked`}
        />
        <StatCard
          icon={Users}
          label="Coaches in the split"
          value={String(snapshot.coachCount)}
          hint={`${snapshot.rows.length} people on the roster`}
        />
        <StatCard
          icon={Scale}
          label="Equal / alert"
          value={`${snapshot.equalHours.toFixed(1)}h`}
          hint={`Alert at ${snapshot.limitHours.toFixed(1)}h`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Over the line"
          value={String(overTeams.length + overCoaches.length)}
          hint={`${unreadAlerts} unread monopoly alerts`}
        />
      </div>

      <UsageBoard
        windowLabel={`${snapshot.settings.monopolyWindowDays}-day`}
        limitHours={snapshot.limitHours}
        availableHours={snapshot.availableHours}
        equalHours={snapshot.equalHours}
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
