import { format } from "date-fns";
import { AlertTriangle, Clock3, Percent, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUsageSnapshot } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const snapshot = await getUsageSnapshot();
  const over = snapshot.rows.filter((row) => row.overLimit);
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
          {format(snapshot.windowStart, "MMM d")}. A coach trips an alert at{" "}
          {snapshot.settings.monopolyHoursThreshold} hours or{" "}
          {Math.round(snapshot.settings.monopolyShareThreshold * 100)}% of all booked time.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Clock3}
          label="Booked hours"
          value={snapshot.totalHours.toFixed(1)}
          hint="Across every coach"
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

      <Card>
        <CardHeader>
          <CardTitle>Hours by coach</CardTitle>
          <CardDescription>
            Sorted by time taken. Bars are share of all booked hours in the window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {snapshot.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No coaches yet.</p>
          ) : (
            snapshot.rows.map((row) => (
              <div key={row.id} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.email}
                      {!row.active ? " · deactivated" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.overLimit ? <Badge variant="destructive">Over limit</Badge> : null}
                    <p className="text-sm tabular-nums">
                      {row.hours.toFixed(1)}h · {row.count} practices · {Math.round(row.share * 100)}%
                    </p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={row.overLimit ? "h-full bg-destructive" : "h-full bg-primary"}
                    style={{ width: `${Math.min(100, Math.max(2, row.share * 100))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
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
