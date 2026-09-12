"use client";

import { useMemo, useState } from "react";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { CalendarOff, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CancelPracticeButton } from "@/components/cancel-practice-button";
import { remainingInSeries, type BookingRow } from "@/components/bookings-list";
import { slotNoun } from "@/lib/booking-kind";
import { WEEK_STARTS_ON } from "@/lib/time";

type PrintRange = "week" | "month" | "all";

export function PracticesList({
  upcoming,
  past,
  teams,
  currentUserId,
  isAdmin,
}: {
  upcoming: BookingRow[];
  past: BookingRow[];
  teams: { id: string; name: string }[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [teamFilter, setTeamFilter] = useState(teams.length === 1 ? teams[0].id : "all");
  const [printRange, setPrintRange] = useState<PrintRange>("week");

  const matchesTeam = (booking: BookingRow) =>
    teamFilter === "all" || booking.teamId === teamFilter;

  const upcomingRows = useMemo(() => upcoming.filter(matchesTeam), [upcoming, teamFilter]);
  const pastRows = useMemo(() => past.filter(matchesTeam), [past, teamFilter]);
  const allRows = useMemo(() => [...upcoming, ...past], [upcoming, past]);

  const printRows = useMemo(() => {
    const now = new Date();
    const source = [...upcomingRows, ...pastRows].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
    if (printRange === "all") return source;
    const start =
      printRange === "week"
        ? startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON })
        : startOfMonth(now);
    const end =
      printRange === "week"
        ? endOfWeek(now, { weekStartsOn: WEEK_STARTS_ON })
        : endOfMonth(now);
    return source.filter((row) => {
      const at = new Date(row.startAt);
      return at >= start && at <= end;
    });
  }, [upcomingRows, pastRows, printRange]);

  const teamLabel =
    teamFilter === "all"
      ? "All teams"
      : (teams.find((team) => team.id === teamFilter)?.name ?? "Team");
  const rangeLabel =
    printRange === "week"
      ? "This week"
      : printRange === "month"
        ? format(new Date(), "MMMM yyyy")
        : "All practices";

  return (
    <>
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:max-w-xs">
          {teams.length > 1 ? (
            <select
              className="h-9 rounded-lg border bg-background px-3 text-sm"
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
            >
              <option value="all">All my teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          ) : teams.length === 1 ? (
            <p className="text-sm font-medium">{teams[0].name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No teams assigned yet.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-lg border bg-background px-3 text-sm"
            value={printRange}
            onChange={(event) => setPrintRange(event.target.value as PrintRange)}
          >
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="all">All practices</option>
          </select>
          <Button
            variant="outline"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
            Print {printRange === "week" ? "week" : printRange === "month" ? "month" : "all"}
          </Button>
        </div>
      </div>

      <section className="no-print space-y-3">
        <h2 className="font-heading text-xl font-semibold">Upcoming</h2>
        {upcomingRows.length === 0 ? (
          <EmptyState label="No upcoming practices for this team." />
        ) : (
          <div className="grid gap-3">
            {upcomingRows.map((booking) => (
              <PracticeCard
                key={booking.id}
                booking={booking}
                remaining={remainingInSeries(booking, allRows)}
                canManage={isAdmin || booking.userId === currentUserId}
                canEmailCoach={isAdmin && booking.userId !== currentUserId}
              />
            ))}
          </div>
        )}
      </section>
      <section className="no-print space-y-3">
        <h2 className="font-heading text-xl font-semibold">Past</h2>
        {pastRows.length === 0 ? (
          <EmptyState label="No past practices for this team." />
        ) : (
          <div className="grid gap-3 opacity-80">
            {pastRows.map((booking) => (
              <PracticeCard key={booking.id} booking={booking} remaining={1} canManage={false} />
            ))}
          </div>
        )}
      </section>

      <div className="print-practices-sheet">
        <h1 className="font-heading text-2xl font-semibold">MP Basketball practices</h1>
        <p className="mt-1 text-sm">
          {teamLabel} · {rangeLabel} · printed {format(new Date(), "MMM d, yyyy")}
        </p>
        {printRows.length === 0 ? (
          <p className="mt-6 text-sm">No practices in this range.</p>
        ) : (
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Type</th>
                <th>Team</th>
                <th>Gym</th>
                <th>Coach</th>
              </tr>
            </thead>
            <tbody>
              {printRows.map((booking) => (
                <tr key={booking.id}>
                  <td>{format(new Date(booking.startAt), "EEE, MMM d")}</td>
                  <td>
                    {format(new Date(booking.startAt), "h:mm a")} – {format(new Date(booking.endAt), "h:mm a")}
                  </td>
                  <td>{booking.kind === "GAME" ? "Game" : "Practice"}</td>
                  <td>{booking.teamName}</td>
                  <td>{booking.gymName}</td>
                  <td>{booking.userName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function PracticeCard({
  booking,
  remaining,
  canManage,
  canEmailCoach = false,
}: {
  booking: BookingRow;
  remaining: number;
  canManage: boolean;
  canEmailCoach?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{booking.gymName}</p>
            <Badge variant={booking.kind === "GAME" ? "default" : "secondary"}>
              {booking.kind === "GAME" ? "Game" : booking.teamName}
            </Badge>
            {booking.kind === "GAME" ? <Badge variant="secondary">{booking.teamName}</Badge> : null}
            {remaining > 1 ? <Badge variant="outline">{remaining} in series</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{booking.whenLabel}</p>
          <p className="text-sm text-muted-foreground">{booking.userName}</p>
          {booking.notes ? <p className="mt-1 text-sm">{booking.notes}</p> : null}
        </div>
        {canManage ? (
          <CancelPracticeButton
            bookingId={booking.id}
            canEmailCoach={canEmailCoach}
            remainingInSeries={remaining}
            noun={slotNoun(booking.kind)}
            label={booking.kind === "GAME" ? "Cancel game" : "Cancel"}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center">
      <CalendarOff className="mb-3 size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
