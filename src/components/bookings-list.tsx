"use client";

import { useState } from "react";
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
import { toDateInput, toTimeInput } from "@/lib/time";

type Row = {
  id: string;
  gymId: string;
  gymName: string;
  userId: string;
  userName: string;
  teamId: string;
  teamName: string;
  startAt: string;
  endAt: string;
  notes: string | null;
  whenLabel: string;
};

export function BookingsList({
  upcoming,
  past,
  gyms,
  coaches,
  teams,
  currentUserId,
  isAdmin,
}: {
  upcoming: Row[];
  past: Row[];
  gyms: { id: string; name: string }[];
  coaches: CoachOption[];
  teams: TeamOption[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [draft, setDraft] = useState<BookingDraft | null>(null);

  return (
    <>
      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState label="No upcoming practices on the board." />
        ) : (
          <div className="grid gap-3">
            {upcoming.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                canManage={isAdmin || booking.userId === currentUserId}
                canEmailCoach={isAdmin && booking.userId !== currentUserId}
                showCoach={isAdmin}
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
        {past.length === 0 ? (
          <EmptyState label="Nothing in the rearview yet." />
        ) : (
          <div className="grid gap-3 opacity-80">
            {past.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                canManage={false}
                showCoach={isAdmin}
              />
            ))}
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
        />
      ) : null}
    </>
  );
}

function BookingCard({
  booking,
  canManage,
  canEmailCoach = false,
  showCoach,
  onEdit,
}: {
  booking: Row;
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
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{booking.whenLabel}</p>
          {showCoach ? (
            <p className="text-sm text-muted-foreground">{booking.userName}</p>
          ) : null}
          {booking.notes ? <p className="mt-1 text-sm">{booking.notes}</p> : null}
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={onEdit}>
              Edit
            </Button>
            <CancelPracticeButton
              bookingId={booking.id}
              canEmailCoach={canEmailCoach}
              label="Cancel"
            />
          </div>
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
