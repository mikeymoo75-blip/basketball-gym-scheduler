import { prisma } from "@/lib/prisma";
import { hoursBetween } from "@/lib/time";
import { type Prisma } from "@prisma/client";

export const bookingInclude = {
  gym: true,
  user: { select: { id: true, name: true, email: true, role: true } },
} satisfies Prisma.BookingInclude;

export const blockInclude = {
  gym: true,
} satisfies Prisma.BlockedPeriodInclude;

export async function getSettings() {
  const existing = await prisma.appSettings.findUnique({
    where: { id: "default" },
  });
  if (existing) return existing;
  return prisma.appSettings.create({ data: { id: "default" } });
}

export async function getActiveGyms() {
  return prisma.gym.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getAllGyms() {
  return prisma.gym.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getSchedule(rangeStart: Date, rangeEnd: Date, gymId?: string) {
  const gymFilter = gymId ? { gymId } : {};
  const [bookings, blocks, gyms] = await Promise.all([
    prisma.booking.findMany({
      where: {
        ...gymFilter,
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
      include: bookingInclude,
      orderBy: { startAt: "asc" },
    }),
    prisma.blockedPeriod.findMany({
      where: {
        ...gymFilter,
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
      include: blockInclude,
      orderBy: { startAt: "asc" },
    }),
    getActiveGyms(),
  ]);

  return { bookings, blocks, gyms };
}

export async function getUsageSnapshot() {
  const settings = await getSettings();
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - settings.monopolyWindowDays);

  const bookings = await prisma.booking.findMany({
    where: { startAt: { gte: windowStart } },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, active: true } },
      gym: { select: { name: true } },
    },
    orderBy: { startAt: "asc" },
  });

  const byUser = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      active: boolean;
      hours: number;
      count: number;
      practices: {
        id: string;
        gymName: string;
        startAt: string;
        endAt: string;
        notes: string | null;
      }[];
    }
  >();

  for (const booking of bookings) {
    const hours = hoursBetween(booking.startAt, booking.endAt);
    const current = byUser.get(booking.userId) ?? {
      userId: booking.userId,
      name: booking.user.name,
      email: booking.user.email,
      active: booking.user.active,
      hours: 0,
      count: 0,
      practices: [],
    };
    current.hours += hours;
    current.count += 1;
    current.practices.push({
      id: booking.id,
      gymName: booking.gym.name,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      notes: booking.notes,
    });
    byUser.set(booking.userId, current);
  }

  const coaches = await prisma.user.findMany({
    where: { role: "COACH" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, active: true },
  });

  const totalHours = [...byUser.values()].reduce((sum, row) => sum + row.hours, 0);

  const rows = coaches.map((coach) => {
    const usage = byUser.get(coach.id);
    const hours = usage?.hours ?? 0;
    const share = totalHours > 0 ? hours / totalHours : 0;
    const overHours = hours >= settings.monopolyHoursThreshold;
    const overShare = share >= settings.monopolyShareThreshold && hours > 0;
    return {
      ...coach,
      hours,
      count: usage?.count ?? 0,
      share,
      overHours,
      overShare,
      overLimit: overHours || overShare,
      practices: usage?.practices ?? [],
    };
  });

  rows.sort((a, b) => b.hours - a.hours);

  return { settings, windowStart, totalHours, rows };
}

export function serializeBooking<T extends { startAt: Date; endAt: Date; createdAt: Date; updatedAt?: Date }>(
  booking: T
) {
  return {
    ...booking,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt ? booking.updatedAt.toISOString() : undefined,
  };
}

export function serializeBlock<T extends { startAt: Date; endAt: Date; createdAt: Date }>(block: T) {
  return {
    ...block,
    startAt: block.startAt.toISOString(),
    endAt: block.endAt.toISOString(),
    createdAt: block.createdAt.toISOString(),
  };
}
