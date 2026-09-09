"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBookingAction } from "@/lib/actions";
import { type CoachOption, type TeamOption } from "@/components/booking-dialog";
import { BARN_BOOKING_MESSAGE, firstBookableGym, isBarnGym } from "@/lib/barn";
import { teamsForPerson } from "@/lib/teams";
import { timeOptions } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BookPageClient({
  gyms,
  coaches,
  teams,
  isAdmin,
  currentUserId,
  initialGymId,
  initialDate,
  initialTime,
}: {
  gyms: { id: string; name: string; bookFrom?: string; bookUntil?: string }[];
  coaches: CoachOption[];
  teams: TeamOption[];
  isAdmin: boolean;
  currentUserId: string;
  initialGymId: string;
  initialDate: string;
  initialTime: string;
}) {
  const router = useRouter();
  const startingGymId =
    gyms.find((gym) => gym.id === initialGymId && !isBarnGym(gym.name))?.id ??
    firstBookableGym(gyms)?.id ??
    "";
  const [gymId, setGymId] = useState(startingGymId);
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialTime);
  const [notes, setNotes] = useState("");
  const [userId, setUserId] = useState(currentUserId);
  const teamsForUser = (coachId: string) => {
    const person = coaches.find((coach) => coach.id === coachId);
    const personIsAdmin =
      person?.role === "ADMIN" || (isAdmin && coachId === currentUserId && !person);
    return teamsForPerson(teams, coachId, personIsAdmin);
  };
  const [teamId, setTeamId] = useState(teamsForUser(currentUserId)[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedGym = gyms.find((gym) => gym.id === gymId);
  const times = timeOptions(selectedGym?.bookFrom, selectedGym?.bookUntil);
  const availableTeams = teamsForUser(userId);
  const gymItems = Object.fromEntries(gyms.map((gym) => [gym.id, gym.name]));
  const coachItems = Object.fromEntries(coaches.map((coach) => [coach.id, coach.name]));
  const teamItems = Object.fromEntries(availableTeams.map((team) => [team.id, team.name]));
  const timeItems = Object.fromEntries(times.map((time) => [time.value, time.label]));

  return (
    <Card className="mt-6">
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            const result = await createBookingAction({
              gymId,
              date,
              startTime,
              durationMinutes: 60,
              notes,
              userId: isAdmin ? userId : currentUserId,
              teamId,
            });
            setPending(false);
            if (result.error) {
              setError(result.error);
              toast.error(result.error);
              return;
            }
            toast.success("Court reserved.");
            if (result.monopolyTriggered) {
              toast.warning("Monopoly alert sent — this team is over the gym-time limit.");
            }
            router.push("/bookings");
          }}
        >
          <div className="space-y-1.5">
            <Label>Gym</Label>
            <Select
              value={gymId}
              onValueChange={(value) => {
                if (!value) return;
                const gym = gyms.find((item) => item.id === value);
                if (isBarnGym(gym?.name)) return;
                setGymId(value);
                const nextTimes = timeOptions(gym?.bookFrom, gym?.bookUntil);
                if (!nextTimes.some((time) => time.value === startTime)) {
                  setStartTime(nextTimes[0]?.value ?? startTime);
                }
              }}
              items={gymItems}
            >
              <SelectTrigger className="h-10 w-full">
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
          {isAdmin ? (
            <div className="space-y-1.5">
              <Label>Who is booking</Label>
              <Select
                value={userId}
                onValueChange={(value) => {
                  if (!value) return;
                  setUserId(value);
                  const next = teamsForUser(value);
                  if (!next.some((team) => team.id === teamId)) {
                    setTeamId(next[0]?.id ?? "");
                  }
                }}
                items={coachItems}
              >
                <SelectTrigger className="h-10 w-full">
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
                <SelectTrigger className="h-10 w-full">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                className="h-10"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Select
                value={startTime}
                onValueChange={(value) => value && setStartTime(value)}
                items={timeItems}
              >
                <SelectTrigger className="h-10 w-full">
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
            Length is <span className="font-medium">60 minutes</span>. Practices end one hour
            after the start time.
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Practice notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What are you working on?"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-10" disabled={pending || !gymId || !teamId}>
            {pending ? "Checking the board…" : "Reserve court"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
