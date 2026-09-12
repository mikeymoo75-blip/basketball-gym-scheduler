"use client";

import { useMemo, useState } from "react";
import { CalendarOff } from "lucide-react";
import {
  BookingDialog,
  durationFromRange,
  type BookingDraft,
  type CoachOption,
  type TeamOption,
} from "@/components/booking-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CancelPracticeButton } from "@/components/cancel-practice-button";
import { Input } from "@/components/ui/input";
import { bookingToIcs, downloadIcs } from "@/lib/calendar-ics";
import { type OccupiedSlot } from "@/lib/occupancy";
import { toDateInput, toTimeInput } from "@/lib/time";

export type BookingRow = {
  id: string;
  gymId: string;
  gymName: string;
  userId: string;
  userName: string;
  teamId: string;
  teamName: string;
  seriesId: string | null;
  startAt: string;
  endAt: string;
  notes: string | null;
  whenLabel: string;
};

export function remainingInSeries(booking: { seriesId: string | null; startAt: string }, all: { seriesId: string | null; startAt: string }[]) {
  if (!booking.seriesId) return 1;
  return all.filter(
    (row) => row.seriesId === booking.seriesId && row.startAt >= booking.startAt,
  ).length;
}

export function BookingsList({
  upcoming,
  past,
  gyms,
  coaches,
  teams,
  currentUserId,
  isAdmin,
  occupied = [],
}: {
  upcoming: BookingRow[];
  past: BookingRow[];
  gyms: { id: string; name: string }[];
  coaches: CoachOption[];
  teams: TeamOption[];
  currentUserId: string;
  isAdmin: boolean;
  occupied?: OccupiedSlot[];
}) {
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [query, setQuery] = useState("");
  const [gymFilter, setGymFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [coachFilter, setCoachFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [pastLimit, setPastLimit] = useState(8);

  const matches = (booking: BookingRow) => {
    const hay = `${booking.gymName} ${booking.teamName} ${booking.userName} ${booking.whenLabel} ${booking.notes ?? ""}`.toLowerCase();
    if (query.trim() && !hay.includes(query.trim().toLowerCase())) return false;
    if (gymFilter !== "all" && booking.gymId !== gymFilter) return false;
    if (teamFilter !== "all" && booking.teamId !== teamFilter) return false;
    if (coachFilter !== "all" && booking.userId !== coachFilter) return false;
    if (dateFilter && toDateInput(new Date(booking.startAt)) !== dateFilter) return false;
    return true;
  };

  const upcomingRows = useMemo(() => upcoming.filter(matches), [upcoming, query, gymFilter, teamFilter, coachFilter, dateFilter]);
  const pastRows = useMemo(() => past.filter(matches), [past, query, gymFilter, teamFilter, coachFilter, dateFilter]);
  const allRows = useMemo(() => [...upcoming, ...past], [upcoming, past]);

  return (
    <>
      <div className="grid gap-2 rounded-2xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={isAdmin ? "Search gym, team, coach…" : "Search gym, team…"}
        />
        <select
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          value={gymFilter}
          onChange={(event) => setGymFilter(event.target.value)}
        >
          <option value="all">All gyms</option>
          {gyms.map((gym) => (
            <option key={gym.id} value={gym.id}>
              {gym.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          value={teamFilter}
          onChange={(event) => setTeamFilter(event.target.value)}
        >
          <option value="all">All teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        {isAdmin ? (
          <select
            className="h-9 rounded-lg border bg-background px-3 text-sm"
            value={coachFilter}
            onChange={(event) => setCoachFilter(event.target.value)}
          >
            <option value="all">All coaches</option>
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.name}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}
        <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
      </div>
      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold">Upcoming</h2>
        {upcomingRows.length === 0 ? (
          <EmptyState label="No upcoming practices on the board." />
        ) : (
          <div className="grid gap-3">
            {upcomingRows.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                remainingInSeries={remainingInSeries(booking, allRows)}
                canManage={isAdmin || booking.userId === currentUserId}
                canEmailCoach={isAdmin && booking.userId !== currentUserId}
                showCoach={isAdmin || booking.userId !== currentUserId}
                onEdit={() =>
                  setDraft({
                    id: booking.id,
                    gymId: booking.gymId,
                    date: toDateInput(new Date(booking.startAt)),
                    startTime: toTimeInput(new Date(booking.startAt)),
                    durationMinutes: durationFromRange(booking.startAt, booking.endAt),
                    notes: booking.notes ?? "",
                    userId: booking.userId,
                    teamId: booking.teamId,
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold">Past</h2>
        {pastRows.length === 0 ? (
          <EmptyState label="Nothing in the rearview yet." />
        ) : (
          <div className="grid gap-3 opacity-80">
            {pastRows.slice(0, pastLimit).map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                remainingInSeries={1}
                canManage={false}
                showCoach={isAdmin || booking.userId !== currentUserId}
              />
            ))}
            {pastRows.length > pastLimit ? (
              <Button variant="outline" onClick={() => setPastLimit((value) => value + 20)}>
                Show older practices
              </Button>
            ) : null}
          </div>
        )}
      </section>
      {draft ? (
        <BookingDialog
          open
          onOpenChange={(open) => {
            if (!open) setDraft(null);
          }}
          gyms={gyms}
          coaches={coaches}
          teams={teams}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          draft={draft}
          occupied={occupied}
        />
      ) : null}
    </>
  );
}

function BookingCard({
  booking,
  remainingInSeries: remaining,
  canManage,
  canEmailCoach = false,
  showCoach,
  onEdit,
}: {
  booking: BookingRow;
  remainingInSeries: number;
  canManage: boolean;
  canEmailCoach?: boolean;
  showCoach: boolean;
  onEdit?: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{booking.gymName}</p>
            <Badge variant="secondary">{booking.teamName}</Badge>
            {remaining > 1 ? (
              <Badge variant="outline">{remaining} in series</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{booking.whenLabel}</p>
          {showCoach ? (
            <p className="text-sm text-muted-foreground">{booking.userName}</p>
          ) : null}
          {booking.notes ? <p className="mt-1 text-sm">{booking.notes}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              downloadIcs(
                `${booking.teamName}-${toDateInput(new Date(booking.startAt))}.ics`,
                bookingToIcs({
                  id: booking.id,
                  title: `${booking.teamName} practice`,
                  gymName: booking.gymName,
                  startAt: booking.startAt,
                  endAt: booking.endAt,
                  notes: booking.notes,
                }),
              )
            }
          >
            Add to calendar
          </Button>
          {canManage ? (
            <>
              <Button variant="outline" onClick={onEdit}>
                Edit
              </Button>
              <CancelPracticeButton
                bookingId={booking.id}
                canEmailCoach={canEmailCoach}
                remainingInSeries={remaining}
                label="Cancel"
              />
            </>
          ) : null}
        </div>
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
