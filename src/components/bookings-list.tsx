"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarOff } from "lucide-react";
import { BookingDialog, durationFromRange, type BookingDraft } from "@/components/booking-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteBookingAction } from "@/lib/actions";
import { toDateInput, toTimeInput } from "@/lib/time";

type Row = {
  id: string;
  gymId: string;
  gymName: string;
  userId: string;
  userName: string;
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
  currentUserId,
  isAdmin,
}: {
  upcoming: Row[];
  past: Row[];
  gyms: { id: string; name: string }[];
  coaches: { id: string; name: string }[];
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
  showCoach,
  onEdit,
}: {
  booking: Row;
  canManage: boolean;
  showCoach: boolean;
  onEdit?: () => void;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{booking.gymName}</p>
            <Badge variant="secondary">Practice</Badge>
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
            <Button
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const result = await deleteBookingAction(booking.id);
                setPending(false);
                if (result.error) toast.error(result.error);
                else toast.success("Practice cancelled.");
              }}
            >
              Cancel
            </Button>
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
