"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBookingAction } from "@/lib/actions";
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
  isAdmin,
  currentUserId,
  initialGymId,
  initialDate,
  initialTime,
}: {
  gyms: { id: string; name: string }[];
  coaches: { id: string; name: string }[];
  isAdmin: boolean;
  currentUserId: string;
  initialGymId: string;
  initialDate: string;
  initialTime: string;
}) {
  const router = useRouter();
  const [gymId, setGymId] = useState(initialGymId);
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialTime);
  const [notes, setNotes] = useState("");
  const [userId, setUserId] = useState(currentUserId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const times = timeOptions();
  const gymItems = Object.fromEntries(gyms.map((gym) => [gym.id, gym.name]));
  const coachItems = Object.fromEntries(coaches.map((coach) => [coach.id, coach.name]));
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
            });
            setPending(false);
            if (result.error) {
              setError(result.error);
              toast.error(result.error);
              return;
            }
            toast.success("Court reserved.");
            if (result.monopolyTriggered) {
              toast.warning("Monopoly alert sent — this coach is over the usage limit.");
            }
            router.push("/bookings");
          }}
        >
          <div className="space-y-1.5">
            <Label>Gym</Label>
            <Select
              value={gymId}
              onValueChange={(value) => value && setGymId(value)}
              items={gymItems}
            >
              <SelectTrigger className="h-10 w-full">
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
          {isAdmin ? (
            <div className="space-y-1.5">
              <Label>Coach</Label>
              <Select
                value={userId}
                onValueChange={(value) => value && setUserId(value)}
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
          <Button type="submit" className="h-10" disabled={pending || !gymId}>
            {pending ? "Checking the board…" : "Reserve court"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
