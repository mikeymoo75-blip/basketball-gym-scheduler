"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { deleteBookingAction } from "@/lib/actions";
import { formatRange } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { type BoardBlock, type BoardBooking } from "@/components/schedule-board";

export function EventDetail({
  selected,
  onOpenChange,
  currentUserId,
  isAdmin,
  onEdit,
}: {
  selected:
    | { type: "booking"; item: BoardBooking }
    | { type: "block"; item: BoardBlock }
    | null;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  isAdmin: boolean;
  onEdit: (booking: BoardBooking) => void;
}) {
  const [pending, setPending] = useState(false);
  const open = Boolean(selected);

  if (!selected) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent />
      </Sheet>
    );
  }

  if (selected.type === "block") {
    const block = selected.item;
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{block.title}</SheetTitle>
            <SheetDescription>This gym is not bookable during the hold.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4">
            <Badge variant={block.kind === "GAME" ? "default" : "secondary"}>
              {block.kind === "GAME" ? "Game" : block.kind === "EVENT" ? "Event" : "Maintenance"}
            </Badge>
            <p className="text-sm">
              <span className="text-muted-foreground">Gym · </span>
              {block.gymName}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">When · </span>
              {format(new Date(block.startAt), "EEE, MMM d")} ·{" "}
              {formatRange(new Date(block.startAt), new Date(block.endAt))}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const booking = selected.item;
  const canManage = isAdmin || booking.userId === currentUserId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Practice</SheetTitle>
          <SheetDescription>
            {booking.userName} on {booking.gymName}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4">
          <Badge>Practice</Badge>
          <p className="text-sm">
            <span className="text-muted-foreground">When · </span>
            {format(new Date(booking.startAt), "EEEE, MMM d")} ·{" "}
            {formatRange(new Date(booking.startAt), new Date(booking.endAt))}
          </p>
          {booking.notes ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">{booking.notes}</p>
          ) : null}
        </div>
        {canManage ? (
          <SheetFooter>
            <Button variant="outline" onClick={() => onEdit(booking)}>
              Edit
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const result = await deleteBookingAction(booking.id);
                setPending(false);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success(
                  result.notified
                    ? "Practice cancelled. The coach was notified and emailed."
                    : "Practice cancelled.",
                );
                onOpenChange(false);
              }}
            >
              {pending ? "Cancelling…" : "Cancel practice"}
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
