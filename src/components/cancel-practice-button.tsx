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
  onCancelled,
  label = "Cancel",
  pendingLabel = "Cancelling…",
  className,
  fullWidth = false,
}: {
  bookingId: string;
  // True when an admin is cancelling someone else's practice, i.e. the only
  // case where a coach can be emailed. When false, no email is ever sent, so
  // we skip the prompt and cancel directly.
  canEmailCoach: boolean;
  onCancelled?: () => void;
  label?: string;
  pendingLabel?: string;
  className?: string;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const runCancel = async (sendEmail: boolean) => {
    setPending(true);
    const result = await deleteBookingAction(bookingId, { sendEmail });
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.emailed
        ? "Practice cancelled. The coach was emailed."
        : "Practice cancelled. No email sent.",
    );
    setOpen(false);
    onCancelled?.();
  };

  if (!canEmailCoach) {
    return (
      <Button
        type="button"
        variant="destructive"
        className={cn(fullWidth && "w-full", className)}
        disabled={pending}
        onClick={() => runCancel(false)}
      >
        {pending ? pendingLabel : label}
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        className={cn(fullWidth && "w-full", className)}
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        {pending ? pendingLabel : label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this practice?</DialogTitle>
            <DialogDescription>
              The practice will be removed from the board. Do you want to email
              the coach to let them know it was cancelled?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Keep practice
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => runCancel(false)}
            >
              No, just cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => runCancel(true)}
            >
              {pending ? "Working…" : "Yes, email coach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
