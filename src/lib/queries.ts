import { prisma } from "@/lib/prisma";
import { hoursBetween } from "@/lib/time";
import { type Prisma } from "@prisma/client";

export const bookingInclude = {
  gym: true,
  team: { select: { id: true, name: true } },
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

export async function getActiveTeams() {
  return prisma.team.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { coaches: { select: { userId: true } } },
  });
}

export async function getAllTeams() {
  return prisma.team.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      coaches: { include: { user: { select: { id: true, name: true, role: true } } } },
      _count: { select: { bookings: true } },
    },
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
      team: { select: { id: true, name: true } },
    },
    orderBy: { startAt: "asc" },
  });

  type Practice = {
    id: string;
    gymName: string;
    teamId: string;
    teamName: string;
    startAt: string;
    endAt: string;
    notes: string | null;
    coachName: string;
  };

  const byUser = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      active: boolean;
      hours: number;
      count: number;
      practices: Practice[];
      byTeam: Map<string, { teamId: string; teamName: string; hours: number; count: number }>;
    }
  >();
  const byTeam = new Map<
    string,
    {
      teamId: string;
      name: string;
      hours: number;
      count: number;
      coachNames: Set<string>;
      practices: Practice[];
    }
  >();

  for (const booking of bookings) {
    if (!booking.teamId || !booking.team) continue;
    const hours = hoursBetween(booking.startAt, booking.endAt);
    const practice: Practice = {
      id: booking.id,
      gymName: booking.gym.name,
      teamId: booking.teamId ?? "",
      teamName: booking.team?.name ?? "Unassigned",
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      notes: booking.notes,
      coachName: booking.user.name,
    };

    const current = byUser.get(booking.userId) ?? {
      userId: booking.userId,
      name: booking.user.name,
      email: booking.user.email,
      active: booking.user.active,
      hours: 0,
      count: 0,
      practices: [] as Practice[],
      byTeam: new Map<string, { teamId: string; teamName: string; hours: number; count: number }>(),
    };
    current.hours += hours;
    current.count += 1;
    current.practices.push(practice);
    const coachTeam = current.byTeam.get(booking.teamId) ?? {
      teamId: booking.teamId,
      teamName: booking.team.name,
      hours: 0,
      count: 0,
    };
    coachTeam.hours += hours;
    coachTeam.count += 1;
    current.byTeam.set(booking.teamId, coachTeam);
    byUser.set(booking.userId, current);

    const team = byTeam.get(booking.teamId) ?? {
      teamId: booking.teamId,
      name: booking.team.name,
      hours: 0,
      count: 0,
      coachNames: new Set<string>(),
      practices: [] as Practice[],
    };
    team.hours += hours;
    team.count += 1;
    team.coachNames.add(booking.user.name);
    team.practices.push(practice);
    byTeam.set(booking.teamId, team);
  }

  const coaches = await prisma.user.findMany({
    where: { role: "COACH" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, active: true },
  });
  const teams = await prisma.team.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, active: true },
  });

  const totalHours = [...byTeam.values()].reduce((sum, row) => sum + row.hours, 0);

  const rows = coaches.map((coach) => {
    const usage = byUser.get(coach.id);
    const hours = usage?.hours ?? 0;
    const share = totalHours > 0 ? hours / totalHours : 0;
    const teamBreakdown = [...(usage?.byTeam.values() ?? [])].sort((a, b) => b.hours - a.hours);
    return {
      ...coach,
      hours,
      count: usage?.count ?? 0,
      share,
      overHours: false,
      overShare: false,
      overLimit: false,
      teamBreakdown,
      practices: usage?.practices ?? [],
    };
  });
  rows.sort((a, b) => b.hours - a.hours);

  const teamRows = teams.map((team) => {
    const usage = byTeam.get(team.id);
    const hours = usage?.hours ?? 0;
    const share = totalHours > 0 ? hours / totalHours : 0;
    const overHours = hours >= settings.monopolyHoursThreshold;
    const overShare = share >= settings.monopolyShareThreshold && hours > 0;
    return {
      id: team.id,
      name: team.name,
      active: team.active,
      hours,
      count: usage?.count ?? 0,
      share,
      overHours,
      overShare,
      overLimit: overHours || overShare,
      coachNames: [...(usage?.coachNames ?? [])],
      practices: usage?.practices ?? [],
    };
  });
  teamRows.sort((a, b) => b.hours - a.hours);

  return { settings, windowStart, totalHours, rows, teamRows };
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
