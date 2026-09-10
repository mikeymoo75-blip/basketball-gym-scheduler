import { addDays } from "date-fns";
import { isBarnGym } from "@/lib/barn";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  isBookableStart,
  overlaps,
  parseDateTime,
  toDateInput,
} from "@/lib/time";

export type OccupiedSlot = {
  id?: string;
  gymId: string;
  gymName: string;
  startAt: string;
  endAt: string;
  label: string;
  kind: "booking" | "block";
};

export function describeConflict(
  occupied: OccupiedSlot[],
  gymId: string,
  startAt: Date,
  endAt: Date,
  excludeBookingId?: string,
) {
  const hit = occupied.find((slot) => {
    if (slot.gymId !== gymId) return false;
    if (excludeBookingId && slot.kind === "booking" && slot.id === excludeBookingId) {
      return false;
    }
    return overlaps(startAt, endAt, new Date(slot.startAt), new Date(slot.endAt));
  });
  if (!hit) return null;
  return hit.kind === "booking" ? `Taken by ${hit.label}` : `${hit.label} has this gym`;
}

export function findOpenSlots(input: {
  gyms: { id: string; name: string; bookFrom?: string; bookUntil?: string }[];
  occupied: OccupiedSlot[];
  gymId?: string;
  from?: Date;
  days?: number;
  limit?: number;
}) {
  const from = input.from ?? new Date();
  const days = input.days ?? 21;
  const limit = input.limit ?? 24;
  const gyms = input.gyms.filter((gym) => !isBarnGym(gym.name));
  const selected = input.gymId ? gyms.filter((gym) => gym.id === input.gymId) : gyms;
  const slots: {
    gymId: string;
    gymName: string;
    date: string;
    startTime: string;
    startAt: string;
    label: string;
  }[] = [];

  for (let dayOffset = 0; dayOffset < days && slots.length < limit; dayOffset += 1) {
    const day = addDays(from, dayOffset);
    const date = toDateInput(day);
    for (let hour = DAY_START_HOUR; hour < DAY_END_HOUR && slots.length < limit; hour += 1) {
      const startTime = `${hour.toString().padStart(2, "0")}:00`;
      const startAt = parseDateTime(date, startTime);
      if (!startAt || startAt.getTime() <= Date.now()) continue;
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
      for (const gym of selected) {
        if (slots.length >= limit) break;
        const bookFrom = gym.bookFrom ?? `${DAY_START_HOUR.toString().padStart(2, "0")}:00`;
        const bookUntil = gym.bookUntil ?? `${DAY_END_HOUR.toString().padStart(2, "0")}:00`;
        if (!isBookableStart(hour, 0, bookFrom, bookUntil)) continue;
        const clash = describeConflict(input.occupied, gym.id, startAt, endAt);
        if (clash) continue;
        const hourLabel = new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }).format(startAt);
        const dayLabel = new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }).format(startAt);
        slots.push({
          gymId: gym.id,
          gymName: gym.name,
          date,
          startTime,
          startAt: startAt.toISOString(),
          label: `${dayLabel} · ${hourLabel} · ${gym.name}`,
        });
      }
    }
  }

  return slots;
}
