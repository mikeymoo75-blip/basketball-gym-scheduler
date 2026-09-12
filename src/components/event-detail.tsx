"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatRange } from "@/lib/time";
import { bookingToIcs, downloadIcs } from "@/lib/calendar-ics";
import { slotNoun, slotTitle } from "@/lib/booking-kind";
import { deleteBlockAction } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelPracticeButton } from "@/components/cancel-practice-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { type BoardBlock, type BoardBooking } from "@/components/schedule-board";
import { toDateInput } from "@/lib/time";

export function EventDetail({
  selected,
  onOpenChange,
  currentUserId,
  isAdmin,
  onEdit,
  onEditBlock,
  remainingInSeries = 1,
}: {
  selected:
    | { type: "booking"; item: BoardBooking }
    | { type: "block"; item: BoardBlock }
    | null;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  isAdmin: boolean;
  onEdit: (booking: BoardBooking) => void;
  onEditBlock?: (block: BoardBlock) => void;
  remainingInSeries?: number;
}) {
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
    const canCancelGame = block.kind === "GAME";
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{block.title}</SheetTitle>
            <SheetDescription>
              {block.kind === "CLOSED"
                ? "This gym is closed. Coaches cannot book this day."
                : block.kind === "GAME"
                  ? "This game holds the gym. Coaches can cancel it and book a new time if the slot is open."
                  : "This gym is not bookable during the hold."}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4">
            <Badge variant={block.kind === "GAME" ? "default" : "secondary"}>
              {block.kind === "GAME"
                ? "Game"
                : block.kind === "EVENT"
                  ? "Event"
                  : block.kind === "CLOSED"
                    ? "Closed"
                    : "Blocked hours"}
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
          {(isAdmin && onEditBlock) || canCancelGame ? (
            <SheetFooter>
              {isAdmin && onEditBlock ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onEditBlock(block);
                  }}
                >
                  Edit hold
                </Button>
              ) : null}
              {canCancelGame ? (
                <CancelGameHoldButton
                  blockId={block.id}
                  onCancelled={() => onOpenChange(false)}
                />
              ) : null}
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    );
  }

  const booking = selected.item;
  const canManage = isAdmin || booking.userId === currentUserId;
  const noun = slotNoun(booking.kind);
  const isGame = booking.kind === "GAME";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isGame ? "Game" : "Practice"}</SheetTitle>
          <SheetDescription>
            {booking.teamName} · {booking.userName} · {booking.gymName}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4">
          <Badge variant={isGame ? "default" : "secondary"}>{isGame ? "Game" : "Practice"}</Badge>
          <p className="text-sm">
            <span className="text-muted-foreground">Team · </span>
            {booking.teamName}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">When · </span>
            {format(new Date(booking.startAt), "EEEE, MMM d")} ·{" "}
            {formatRange(new Date(booking.startAt), new Date(booking.endAt))}
          </p>
          {booking.notes ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">{booking.notes}</p>
          ) : null}
        </div>
        <SheetFooter>
          <Button
            variant="outline"
            onClick={() =>
              downloadIcs(
                `${booking.teamName}-${toDateInput(new Date(booking.startAt))}.ics`,
                bookingToIcs({
                  id: booking.id,
                  title: slotTitle(booking.kind, booking.teamName),
                  gymName: booking.gymName,
                  startAt: booking.startAt,
                  endAt: booking.endAt,
                  notes: booking.notes,
                  kind: booking.kind,
                }),
              )
            }
          >
            Add to calendar
          </Button>
          {canManage ? (
            <>
              <Button variant="outline" onClick={() => onEdit(booking)}>
                Edit
              </Button>
              <CancelPracticeButton
                bookingId={booking.id}
                canEmailCoach={isAdmin && booking.userId !== currentUserId}
                remainingInSeries={remainingInSeries}
                noun={noun}
                label={`Cancel ${noun}`}
                onCancelled={() => onOpenChange(false)}
              />
            </>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function CancelGameHoldButton({
  blockId,
  onCancelled,
}: {
  blockId: string;
  onCancelled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Cancel game
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this game?</DialogTitle>
            <DialogDescription>
              This takes it off the calendar so a coach can book the open time, including a
              rescheduled game.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Keep game
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const result = await deleteBlockAction(blockId);
                setPending(false);
                if (result && "error" in result && result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Game cancelled. The slot is open.");
                setOpen(false);
                onCancelled();
              }}
            >
              {pending ? "Cancelling…" : "Yes, cancel game"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
