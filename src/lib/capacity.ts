import { addDays } from "date-fns";
import { isBarnGym } from "@/lib/barn";
import { prisma } from "@/lib/prisma";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  isBookableStart,
  overlaps,
  parseDateTime,
  toDateInput,
} from "@/lib/time";

export function usageWindow(days: number, now = new Date()) {
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return { start, end };
}

function eachDate(start: Date, end: Date) {
  const dates: string[] = [];
  let cursor = toDateInput(start);
  const last = toDateInput(end);
  while (cursor <= last && dates.length < 400) {
    dates.push(cursor);
    const [year, month, day] = cursor.split("-").map(Number);
    cursor = toDateInput(addDays(new Date(year, month - 1, day, 12, 0, 0), 1));
  }
  return dates;
}

export async function measureGymCapacity(windowStart: Date, windowEnd: Date) {
  const gyms = await prisma.gym.findMany({
    where: { active: true },
    select: { id: true, name: true, bookFrom: true, bookUntil: true },
  });
  const bookable = gyms.filter((gym) => !isBarnGym(gym.name));
  const gymIds = bookable.map((gym) => gym.id);
  const blocks = gymIds.length
    ? await prisma.blockedPeriod.findMany({
        where: {
          gymId: { in: gymIds },
          startAt: { lt: windowEnd },
          endAt: { gt: windowStart },
        },
        select: { gymId: true, startAt: true, endAt: true },
      })
    : [];

  let availableHours = 0;
  const dates = eachDate(windowStart, windowEnd);

  for (const gym of bookable) {
    const gymBlocks = blocks.filter((block) => block.gymId === gym.id);
    for (const date of dates) {
      for (let hour = DAY_START_HOUR; hour < DAY_END_HOUR; hour += 1) {
        if (!isBookableStart(hour, 0, gym.bookFrom, gym.bookUntil)) continue;
        const startTime = `${hour.toString().padStart(2, "0")}:00`;
        const startAt = parseDateTime(date, startTime);
        if (!startAt) continue;
        if (startAt < windowStart || startAt >= windowEnd) continue;
        const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
        const held = gymBlocks.some((block) => overlaps(startAt, endAt, block.startAt, block.endAt));
        if (held) continue;
        availableHours += 1;
      }
    }
  }

  const coachCount = await prisma.user.count({
    where: {
      active: true,
      teams: { some: { team: { active: true } } },
    },
  });

  return { availableHours, coachCount, gymCount: bookable.length };
}

export function fairShare(input: {
  availableHours: number;
  coachCount: number;
  multiplier: number;
}) {
  const coaches = Math.max(1, input.coachCount);
  const equalHours = input.availableHours / coaches;
  const limitHours = equalHours * Math.max(1, input.multiplier);
  const equalShare = coaches > 0 ? 1 / coaches : 1;
  return { equalHours, limitHours, equalShare };
}
