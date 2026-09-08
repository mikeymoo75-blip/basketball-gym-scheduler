"use client";

import { useState } from "react";
import { toast } from "sonner";
import { differenceInMinutes } from "date-fns";
import { createBookingAction, updateBookingAction } from "@/lib/actions";
import { teamsForPerson } from "@/lib/teams";
import { snapToHourStart, timeOptions } from "@/lib/time";
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
  teamId?: string;
};

type GymOption = { id: string; name: string; bookFrom?: string; bookUntil?: string };
export type CoachOption = { id: string; name: string; role?: "ADMIN" | "COACH" };
export type TeamOption = { id: string; name: string; coachIds: string[] };

function personIsAdmin(
  coaches: CoachOption[],
  personId: string,
  actorIsAdmin: boolean,
  currentUserId: string,
) {
  const person = coaches.find((coach) => coach.id === personId);
  if (person?.role) return person.role === "ADMIN";
  return actorIsAdmin && personId === currentUserId;
}

export function BookingDialog({
  open,
  onOpenChange,
  gyms,
  coaches,
  teams,
  isAdmin,
  currentUserId,
  draft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gyms: GymOption[];
  coaches?: CoachOption[];
  teams: TeamOption[];
  isAdmin: boolean;
  currentUserId: string;
  draft: BookingDraft;
}) {
  const [gymId, setGymId] = useState(draft.gymId);
  const [date, setDate] = useState(draft.date);
  const [startTime, setStartTime] = useState(snapToHourStart(draft.startTime));
  const [notes, setNotes] = useState(draft.notes ?? "");
  const [userId, setUserId] = useState(draft.userId ?? currentUserId);
  const [teamId, setTeamId] = useState(draft.teamId ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedGym = gyms.find((gym) => gym.id === gymId);
  const times = timeOptions(selectedGym?.bookFrom, selectedGym?.bookUntil);
  const gymItems = Object.fromEntries(gyms.map((gym) => [gym.id, gym.name]));
  const coachItems = Object.fromEntries((coaches ?? []).map((coach) => [coach.id, coach.name]));
  const coachList = coaches ?? [];
  const availableTeams = teamsForPerson(
    teams,
    userId,
    personIsAdmin(coachList, userId, isAdmin, currentUserId),
  );
  const teamItems = Object.fromEntries(availableTeams.map((team) => [team.id, team.name]));
  const timeItems = Object.fromEntries(times.map((time) => [time.value, time.label]));

  const resetFromDraft = (next: BookingDraft) => {
    const nextUser = next.userId ?? currentUserId;
    const nextTeams = teamsForPerson(
      teams,
      nextUser,
      personIsAdmin(coachList, nextUser, isAdmin, currentUserId),
    );
    setGymId(next.gymId);
    setDate(next.date);
    setStartTime(snapToHourStart(next.startTime));
    setNotes(next.notes ?? "");
    setUserId(nextUser);
    setTeamId(
      next.teamId && nextTeams.some((team) => team.id === next.teamId)
        ? next.teamId
        : (nextTeams[0]?.id ?? "")
    );
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
            Practices are 60 minutes. Tag the team this slot is for. Gym-time limits
            are counted per team, not as one pile for the coach.
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
              teamId,
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
              toast.warning("Monopoly alert sent — this team is over the gym-time limit.");
            }
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <Label>Gym</Label>
            <Select
              value={gymId}
              onValueChange={(value) => {
                if (!value) return;
                setGymId(value);
                const gym = gyms.find((item) => item.id === value);
                const nextTimes = timeOptions(gym?.bookFrom, gym?.bookUntil);
                if (!nextTimes.some((time) => time.value === startTime)) {
                  setStartTime(nextTimes[0]?.value ?? startTime);
                }
              }}
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
              <Label>Who is booking</Label>
              <Select
                value={userId}
                onValueChange={(value) => {
                  if (!value) return;
                  setUserId(value);
                  const nextTeams = teamsForPerson(
                    teams,
                    value,
                    personIsAdmin(coachList, value, isAdmin, currentUserId),
                  );
                  if (!nextTeams.some((team) => team.id === teamId)) {
                    setTeamId(nextTeams[0]?.id ?? "");
                  }
                }}
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
          <div className="space-y-1.5">
            <Label>Team</Label>
            {availableTeams.length === 0 ? (
              <p className="text-sm text-destructive">
                {isAdmin
                  ? teams.length === 0
                    ? "Add a team under Admin → Teams first."
                    : "This coach is not assigned to a team yet. Edit them under People."
                  : "Ask an admin to assign you to a team before you book."}
              </p>
            ) : (
              <Select
                value={teamId}
                onValueChange={(value) => value && setTeamId(value)}
                items={teamItems}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Which team is this for?" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
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
            <Button type="submit" disabled={pending || !gymId || !teamId}>
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
