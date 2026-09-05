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
  const [durationMinutes, setDurationMinutes] = useState("90");
  const [notes, setNotes] = useState("");
  const [userId, setUserId] = useState(currentUserId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const times = timeOptions();

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
              durationMinutes: Number(durationMinutes),
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
            <Select value={gymId} onValueChange={(value) => value && setGymId(value)}>
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
              <Select value={userId} onValueChange={(value) => value && setUserId(value)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
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
              <Select value={startTime} onValueChange={(value) => value && setStartTime(value)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
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
          <div className="space-y-1.5">
            <Label>Length</Label>
            <Select
              value={durationMinutes}
              onValueChange={(value) => value && setDurationMinutes(value)}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
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
