"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookingDialog,
  type BookingDraft,
  type CoachOption,
  type TeamOption,
} from "@/components/booking-dialog";
import { type OccupiedSlot } from "@/lib/occupancy";

export function BookPageClient({
  gyms,
  coaches,
  teams,
  isAdmin,
  currentUserId,
  initialGymId,
  initialDate,
  initialTime,
  occupied,
}: {
  gyms: { id: string; name: string; bookFrom?: string; bookUntil?: string }[];
  coaches: CoachOption[];
  teams: TeamOption[];
  isAdmin: boolean;
  currentUserId: string;
  initialGymId: string;
  initialDate: string;
  initialTime: string;
  occupied: OccupiedSlot[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const draft: BookingDraft = {
    gymId: initialGymId,
    date: initialDate,
    startTime: initialTime,
    durationMinutes: 60,
    userId: currentUserId,
    teamId: teams.find((team) => team.coachIds.includes(currentUserId) || isAdmin)?.id ?? "",
  };

  return (
    <BookingDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) router.push("/bookings");
      }}
      gyms={gyms}
      coaches={coaches}
      teams={teams}
      isAdmin={isAdmin}
      currentUserId={currentUserId}
      draft={draft}
      occupied={occupied}
    />
  );
}
