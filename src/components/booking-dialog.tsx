"use client";

import { useState } from "react";
import { toast } from "sonner";
import { differenceInMinutes } from "date-fns";
import { createBookingAction, updateBookingAction } from "@/lib/actions";
import { timeOptions } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BookingDraft = {
  id?: string;
  gymId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  notes?: string;
  userId?: string;
};

type GymOption = { id: string; name: string };
type CoachOption = { id: string; name: string };

export function BookingDialog({
  open,
  onOpenChange,
  gyms,
  coaches,
  isAdmin,
  currentUserId,
  draft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gyms: GymOption[];
  coaches?: CoachOption[];
  isAdmin: boolean;
  currentUserId: string;
  draft: BookingDraft;
}) {
  const [gymId, setGymId] = useState(draft.gymId);
  const [date, setDate] = useState(draft.date);
  const [startTime, setStartTime] = useState(draft.startTime);
  const [notes, setNotes] = useState(draft.notes ?? "");
  const [userId, setUserId] = useState(draft.userId ?? currentUserId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const times = timeOptions();
  const gymItems = Object.fromEntries(gyms.map((gym) => [gym.id, gym.name]));
  const coachItems = Object.fromEntries((coaches ?? []).map((coach) => [coach.id, coach.name]));
  const timeItems = Object.fromEntries(times.map((time) => [time.value, time.label]));

  const resetFromDraft = (next: BookingDraft) => {
    setGymId(next.gymId);
    setDate(next.date);
    setStartTime(next.startTime);
    setNotes(next.notes ?? "");
    setUserId(next.userId ?? currentUserId);
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetFromDraft(draft);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit practice" : "Book practice"}</DialogTitle>
          <DialogDescription>
            Practices are 60 minutes. The same gym cannot be double-booked, and game
            holds are locked.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            const payload = {
              gymId,
              date,
              startTime,
              durationMinutes: 60,
              notes,
              userId: isAdmin ? userId : currentUserId,
            };
            const result = draft.id
              ? await updateBookingAction({ id: draft.id, ...payload })
              : await createBookingAction(payload);
            setPending(false);
            if (result && "error" in result && result.error) {
              setError(result.error);
              return;
            }
            toast.success(draft.id ? "Practice updated." : "Practice booked.");
            if (result && "monopolyTriggered" in result && result.monopolyTriggered) {
              toast.warning("Monopoly alert sent — this coach is over the usage limit.");
            }
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <Label>Gym</Label>
            <Select
              value={gymId}
              onValueChange={(value) => value && setGymId(value)}
              items={gymItems}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Choose a gym" />
              </SelectTrigger>
              <SelectContent>
                {gyms.map((gym) => (
                  <SelectItem key={gym.id} value={gym.id}>
                    {gym.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAdmin && coaches && coaches.length > 0 ? (
            <div className="space-y-1.5">
              <Label>Coach</Label>
              <Select
                value={userId}
                onValueChange={(value) => value && setUserId(value)}
                items={coachItems}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Choose a coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                className="h-9"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Select
                value={startTime}
                onValueChange={(value) => value && setStartTime(value)}
                items={timeItems}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Choose a time" />
                </SelectTrigger>
                <SelectContent>
                  {times.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-lg bg-muted px-3 py-2 text-sm">
            Length is <span className="font-medium">60 minutes</span>.
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Skill work, scrimmage, film…"
              className="min-h-16"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !gymId}>
              {pending ? "Saving…" : draft.id ? "Save changes" : "Reserve court"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function durationFromRange(startAt: string, endAt: string) {
  return differenceInMinutes(new Date(endAt), new Date(startAt));
}
