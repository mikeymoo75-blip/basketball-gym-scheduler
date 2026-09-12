"use client";

import { useState } from "react";
import { toast } from "sonner";
import { differenceInMinutes } from "date-fns";
import { createBookingAction, updateBookingAction } from "@/lib/actions";
import { BARN_BOOKING_MESSAGE, firstBookableGym, isBarnGym } from "@/lib/barn";
import { describeConflict, type OccupiedSlot } from "@/lib/occupancy";
import { teamsForPerson } from "@/lib/teams";
import { parseDateTime, snapToHourStart, timeOptions, toDateInput } from "@/lib/time";
import { parseSlotKind, slotMinutes, slotNoun, slotNouns, type SlotKind } from "@/lib/booking-kind";
import { cn } from "@/lib/utils";
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
  kind?: SlotKind;
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
  occupied = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gyms: GymOption[];
  coaches?: CoachOption[];
  teams: TeamOption[];
  isAdmin: boolean;
  currentUserId: string;
  draft: BookingDraft;
  occupied?: OccupiedSlot[];
}) {
  const [gymId, setGymId] = useState(
    gyms.find((gym) => gym.id === draft.gymId && !isBarnGym(gym.name))?.id ??
      firstBookableGym(gyms)?.id ??
      ""
  );
  const [date, setDate] = useState(draft.date);
  const [startTime, setStartTime] = useState(snapToHourStart(draft.startTime));
  const [notes, setNotes] = useState(draft.notes ?? "");
  const [userId, setUserId] = useState(draft.userId ?? currentUserId);
  const [teamId, setTeamId] = useState(draft.teamId ?? "");
  const [kind, setKind] = useState<SlotKind>(parseSlotKind(draft.kind));
  const [repeatWeeks, setRepeatWeeks] = useState("1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedGym = gyms.find((gym) => gym.id === gymId);
  const durationMinutes = slotMinutes(kind);
  const times = timeOptions(selectedGym?.bookFrom, selectedGym?.bookUntil, 60, durationMinutes);
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
  const pickStart = (value: string, nextTimes = times) => {
    if (nextTimes.some((time) => time.value === value)) return value;
    return nextTimes[0]?.value ?? value;
  };

  const resetFromDraft = (next: BookingDraft) => {
    const nextUser = next.userId ?? currentUserId;
    const nextTeams = teamsForPerson(
      teams,
      nextUser,
      personIsAdmin(coachList, nextUser, isAdmin, currentUserId),
    );
    setGymId(
      gyms.find((gym) => gym.id === next.gymId && !isBarnGym(gym.name))?.id ??
        firstBookableGym(gyms)?.id ??
        ""
    );
    setDate(next.date);
    setNotes(next.notes ?? "");
    setUserId(nextUser);
    setTeamId(
      next.teamId && nextTeams.some((team) => team.id === next.teamId)
        ? next.teamId
        : (nextTeams[0]?.id ?? "")
    );
    setKind(parseSlotKind(next.kind));
    const nextDuration = slotMinutes(next.kind);
    const nextGym =
      gyms.find((gym) => gym.id === next.gymId && !isBarnGym(gym.name)) ?? firstBookableGym(gyms);
    const nextTimes = timeOptions(nextGym?.bookFrom, nextGym?.bookUntil, 60, nextDuration);
    setStartTime(pickStart(snapToHourStart(next.startTime), nextTimes));
    setRepeatWeeks("1");
    setError(null);
  };

  const today = toDateInput(new Date());
  const startAt = parseDateTime(date, startTime);
  const conflict =
    startAt && gymId
      ? describeConflict(
          occupied,
          gymId,
          startAt,
          new Date(startAt.getTime() + durationMinutes * 60 * 1000),
          draft.id,
        )
      : null;
  const past = startAt && startAt.getTime() <= Date.now();

  const noun = slotNoun(kind);
  const nouns = slotNouns(kind);

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
          <DialogTitle>{draft.id ? `Edit ${noun}` : `Book ${noun}`}</DialogTitle>
          <DialogDescription>
            {kind === "GAME"
              ? "Games hold the gym for 2 hours and only save if both hours are open. Cancelled games can be put back on any open 2-hour window."
              : "Practices are 1 hour. Tag the team this slot is for. Gym-time limits are counted per team, not as one pile for the coach."}
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
              durationMinutes,
              notes,
              userId: isAdmin ? userId : currentUserId,
              teamId,
              kind,
              repeatWeeks: draft.id ? 1 : Number(repeatWeeks) || 1,
            };
            const result = draft.id
              ? await updateBookingAction({ id: draft.id, ...payload })
              : await createBookingAction(payload);
            setPending(false);
            if (result && "error" in result && result.error) {
              setError(result.error);
              return;
            }
            const bookedCount =
              result && "bookedCount" in result ? Number(result.bookedCount ?? 1) : 1;
            const skipped =
              result && "skipped" in result && Array.isArray(result.skipped) ? result.skipped : [];
            toast.success(
              draft.id
                ? `${kind === "GAME" ? "Game" : "Practice"} updated.`
                : bookedCount > 1
                  ? `${bookedCount} ${nouns} booked.`
                  : `${kind === "GAME" ? "Game" : "Practice"} booked.`,
            );
            if (skipped.length > 0) {
              toast.warning(
                `Skipped ${skipped.length} week${skipped.length === 1 ? "" : "s"} that were taken or in the past.`,
              );
            }
            if (result && "monopolyTriggered" in result && result.monopolyTriggered) {
              toast.warning("Monopoly alert sent — this team is over the gym-time limit.");
            }
            onOpenChange(false);
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setKind("PRACTICE");
                const nextTimes = timeOptions(selectedGym?.bookFrom, selectedGym?.bookUntil, 60, 60);
                setStartTime(pickStart(startTime, nextTimes));
              }}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                kind === "PRACTICE"
                  ? "bg-practice text-practice-foreground"
                  : "border bg-background",
              )}
            >
              Practice
            </button>
            <button
              type="button"
              onClick={() => {
                setKind("GAME");
                const nextTimes = timeOptions(selectedGym?.bookFrom, selectedGym?.bookUntil, 60, 120);
                setStartTime(pickStart(startTime, nextTimes));
              }}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                kind === "GAME"
                  ? "bg-game text-game-foreground"
                  : "border bg-background",
              )}
            >
              Game
            </button>
          </div>
          <div className="space-y-1.5">
            <Label>Gym</Label>
            <Select
              value={gymId}
              onValueChange={(value) => {
                if (!value) return;
                const gym = gyms.find((item) => item.id === value);
                if (isBarnGym(gym?.name)) return;
                setGymId(value);
                const nextTimes = timeOptions(gym?.bookFrom, gym?.bookUntil, 60, durationMinutes);
                setStartTime(pickStart(startTime, nextTimes));
              }}
              items={gymItems}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Choose a gym" />
              </SelectTrigger>
              <SelectContent>
                {gyms.map((gym) => (
                  <SelectItem key={gym.id} value={gym.id} disabled={isBarnGym(gym.name)}>
                    {isBarnGym(gym.name) ? `${gym.name} — contact Kathy Lamonte` : gym.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{BARN_BOOKING_MESSAGE}</p>
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
                min={today}
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
            Length is{" "}
            <span className="font-medium">
              {kind === "GAME" ? "2 hours" : "1 hour"}
            </span>
            {kind === "GAME" ? ". Both hours have to be open." : "."}
          </div>
          {draft.id ? null : (
            <div className="space-y-1.5">
              <Label>Repeat weekly</Label>
              <Select
                value={repeatWeeks}
                onValueChange={(value) => value && setRepeatWeeks(value)}
                items={{
                  "1": "Just this week",
                  "2": "2 weeks",
                  "4": "4 weeks",
                  "6": "6 weeks",
                  "8": "8 weeks",
                  "12": "12 weeks",
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Just this week</SelectItem>
                  <SelectItem value="2">2 weeks</SelectItem>
                  <SelectItem value="4">4 weeks</SelectItem>
                  <SelectItem value="6">6 weeks</SelectItem>
                  <SelectItem value="8">8 weeks</SelectItem>
                  <SelectItem value="12">12 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {past ? (
            <p className="text-sm text-destructive">That time has already passed.</p>
          ) : conflict ? (
            <p className="text-sm text-destructive">{conflict}.</p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={kind === "GAME" ? "Opponent, home/away, notes…" : "Skill work, scrimmage, film…"}
              className="min-h-16"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !gymId || !teamId || Boolean(past) || Boolean(conflict)}>
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
