"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteBookingAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

export function CancelPracticeButton({
  bookingId,
  canEmailCoach,
  remainingInSeries = 1,
  noun = "practice",
  onCancelled,
  label = "Cancel",
  pendingLabel = "Cancelling…",
  className,
  fullWidth = false,
}: {
  bookingId: string;
  canEmailCoach: boolean;
  remainingInSeries?: number;
  noun?: "practice" | "game";
  onCancelled?: () => void;
  label?: string;
  pendingLabel?: string;
  className?: string;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [scope, setScope] = useState<"this" | "series">("this");
  const isSeries = remainingInSeries > 1;

  const runCancel = async (sendEmail: boolean, cancelScope: "this" | "series" = scope) => {
    setPending(true);
    const result = await deleteBookingAction(bookingId, { sendEmail, scope: cancelScope });
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const count = result.cancelledCount ?? 1;
    const nouns = noun === "game" ? "games" : "practices";
    toast.success(
      result.emailed
        ? count > 1
          ? `${count} ${nouns} cancelled. The coach was emailed.`
          : `${noun === "game" ? "Game" : "Practice"} cancelled. The coach was emailed.`
        : count > 1
          ? `${count} ${nouns} cancelled.`
          : `${noun === "game" ? "Game" : "Practice"} cancelled.`,
    );
    setOpen(false);
    setScope("this");
    onCancelled?.();
  };

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        className={cn(fullWidth && "w-full", className)}
        disabled={pending}
        onClick={() => {
          setScope("this");
          setOpen(true);
        }}
      >
        {pending ? pendingLabel : label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setScope("this");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this {noun}?</DialogTitle>
            <DialogDescription>
              {isSeries
                ? `This is part of a weekly series (${remainingInSeries} remaining, including this one). Cancel just this date, or this date and every remaining week.`
                : canEmailCoach
                  ? `The ${noun} will be removed from the board. Do you want to email the coach to let them know it was cancelled?`
                  : `This removes it from the board so another coach can take the floor.`}
            </DialogDescription>
          </DialogHeader>
          {isSeries ? (
            <div className="space-y-2">
              <label className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                <input
                  type="radio"
                  name={`cancel-scope-${bookingId}`}
                  className="mt-1"
                  checked={scope === "this"}
                  onChange={() => setScope("this")}
                />
                <span>
                  <span className="font-medium">Just this {noun}</span>
                  <span className="block text-muted-foreground">Only this date comes off the board.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                <input
                  type="radio"
                  name={`cancel-scope-${bookingId}`}
                  className="mt-1"
                  checked={scope === "series"}
                  onChange={() => setScope("series")}
                />
                <span>
                  <span className="font-medium">This and all remaining</span>
                  <span className="block text-muted-foreground">
                    Cancels {remainingInSeries} weekly {noun === "game" ? "games" : "practices"} from this date forward. Past weeks stay.
                  </span>
                </span>
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Keep {noun}
            </Button>
            {canEmailCoach ? (
              <>
                <Button type="button" variant="outline" disabled={pending} onClick={() => runCancel(false)}>
                  No, just cancel
                </Button>
                <Button type="button" variant="destructive" disabled={pending} onClick={() => runCancel(true)}>
                  {pending ? "Working…" : "Yes, email coach"}
                </Button>
              </>
            ) : (
              <Button type="button" variant="destructive" disabled={pending} onClick={() => runCancel(false)}>
                {pending ? pendingLabel : "Yes, cancel"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
