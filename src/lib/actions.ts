"use server";

import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { type BlockKind, type Prisma, type Role } from "@prisma/client";
import { signIn, signOut, unstable_update } from "@/lib/auth";
import { cancelOverlappingPractices, notifyCoachPracticeCancelled } from "@/lib/cancel-notify";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email";
import { evaluateMonopoly } from "@/lib/monopoly";
import { BARN_BOOKING_MESSAGE, isBarnGym } from "@/lib/barn";
import { findOpenSlots } from "@/lib/occupancy";
import { prisma } from "@/lib/prisma";
import { getActiveGyms, getSchedule } from "@/lib/queries";
import { getCurrentUser, requireAdmin, requireUser } from "@/lib/session";
import { isWiredAdmin } from "@/lib/wired-admin";
import { SCHOOL_IN_SESSION_TITLE } from "@/lib/mp-school-calendar";
import { gymNamesForCalendar, type SchoolCalendarId } from "@/lib/school-calendars";
import {
  hoursBetween,
  minutesFromTime,
  overlaps,
  appDayBounds,
  isHourStart,
  parseDateTime,
  toDateInput,
  toTimeInput,
  validateGymHours,
  DAY_START_HOUR,
  DAY_END_HOUR,
} from "@/lib/time";
import { addDays } from "date-fns";
import { parseSlotKind, slotMinutes, slotNoun } from "@/lib/booking-kind";

function revalidateApp() {
  revalidatePath("/", "layout");
}

async function assertNoConflict(
  gymId: string,
  startAt: Date,
  endAt: Date,
  excludeBookingId?: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  if (endAt <= startAt) {
    return "End time must be after start time.";
  }
  const lengthHours = hoursBetween(startAt, endAt);
  if (lengthHours !== 1 && lengthHours !== 2) {
    return "Practices are 1 hour. Games are 2 hours.";
  }

  const gym = await db.gym.findUnique({ where: { id: gymId } });
  if (!gym || !gym.active) {
    return "That gym is not available.";
  }
  const from = minutesFromTime(gym.bookFrom) ?? DAY_START_HOUR * 60;
  const until = minutesFromTime(gym.bookUntil) ?? DAY_END_HOUR * 60;
  const startMinutes = minutesFromTime(toTimeInput(startAt)) ?? -1;
  const endMinutes = minutesFromTime(toTimeInput(endAt)) ?? -1;
  if (startMinutes < from || endMinutes > until || endMinutes <= startMinutes) {
    return `${gym.name} can only be booked from ${gym.bookFrom} to ${gym.bookUntil}.`;
  }

  const [bookings, blocks] = await Promise.all([
    db.booking.findMany({
      where: {
        gymId,
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      include: { user: { select: { name: true } } },
    }),
    db.blockedPeriod.findMany({
      where: {
        gymId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    }),
  ]);

  const bookingHit = bookings.find((booking) =>
    overlaps(startAt, endAt, booking.startAt, booking.endAt)
  );
  if (bookingHit) {
    return `That time is already taken by ${bookingHit.user.name}. A slot cannot be double booked.`;
  }

  const blockHit = blocks.find((block) => overlaps(startAt, endAt, block.startAt, block.endAt));
  if (blockHit) {
    if (blockHit.kind === "CLOSED") {
      return `${blockHit.title}: this gym is closed that day.`;
    }
    return `${blockHit.title} already has this gym blocked.`;
  }

  return null;
}

function assertNotPast(startAt: Date) {
  if (startAt.getTime() <= Date.now()) {
    return "You cannot book a time that has already passed.";
  }
  return null;
}

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/schedule",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "That email or password did not match an active account." };
    }
    throw error;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

async function assertTeamForCoach(teamId: string, coachId: string, actorRole: Role) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { coaches: { select: { userId: true } } },
  });
  if (!team || !team.active) return { error: "That team is not available." };
  const assigned = team.coaches.some((row) => row.userId === coachId);
  if (assigned) return { team };

  const [target, assignmentCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: coachId }, select: { role: true } }),
    prisma.coachTeam.count({ where: { userId: coachId } }),
  ]);
  if (assignmentCount > 0 || target?.role === "COACH") {
    return { error: "That person is not assigned to this team." };
  }
  if (actorRole !== "ADMIN") {
    return { error: "You can only book for a team you coach. Ask an admin to assign you." };
  }
  return { team };
}

export async function createBookingAction(input: {
  gymId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  notes?: string;
  userId?: string;
  teamId?: string;
  repeatWeeks?: number;
  kind?: "PRACTICE" | "GAME";
}) {
  const actor = await requireUser();
  const targetUserId =
    actor.role === "ADMIN" && input.userId ? input.userId : actor.id;
  const kind = parseSlotKind(input.kind);
  const noun = slotNoun(kind);

  if (actor.role !== "ADMIN" && input.userId && input.userId !== actor.id) {
    return { error: "You can only book for yourself." };
  }

  const gym = await prisma.gym.findUnique({ where: { id: input.gymId } });
  if (!gym || !gym.active) {
    return { error: "That gym is not available." };
  }
  if (isBarnGym(gym.name)) {
    return { error: BARN_BOOKING_MESSAGE };
  }
  if (!input.teamId) {
    return { error: `Choose which team this ${noun} is for.` };
  }
  const teamCheck = await assertTeamForCoach(input.teamId, targetUserId, actor.role);
  if ("error" in teamCheck && teamCheck.error) return { error: teamCheck.error };

  const firstStart = parseDateTime(input.date, input.startTime);
  if (!firstStart) {
    return { error: "Pick a valid date and start time." };
  }
  if (!isHourStart(input.startTime)) {
    return { error: "Games and practices start on the hour (for example 5:00 PM, not 5:30 PM)." };
  }
  const past = assertNotPast(firstStart);
  if (past) return { error: past };

  const weeks = Math.min(12, Math.max(1, Math.round(input.repeatWeeks ?? 1)));
  const bookedIds: string[] = [];
  const skipped: string[] = [];
  const seriesId = weeks > 1 ? randomBytes(12).toString("hex") : null;
  const durationMs = slotMinutes(kind) * 60 * 1000;

  try {
    for (let week = 0; week < weeks; week += 1) {
      const startAt = addDays(firstStart, week * 7);
      const endAt = new Date(startAt.getTime() + durationMs);
      if (assertNotPast(startAt)) {
        skipped.push(toDateInput(startAt));
        continue;
      }
      const created = await prisma.$transaction(async (tx) => {
        const conflict = await assertNoConflict(gym.id, startAt, endAt, undefined, tx);
        if (conflict) return { error: conflict };
        const booking = await tx.booking.create({
          data: {
            gymId: gym.id,
            userId: targetUserId,
            teamId: input.teamId!,
            seriesId,
            kind,
            startAt,
            endAt,
            notes: input.notes?.trim() || null,
          },
        });
        return { booking };
      });
      if ("error" in created && created.error) {
        skipped.push(`${toDateInput(startAt)} (${created.error})`);
        continue;
      }
      if ("booking" in created && created.booking) bookedIds.push(created.booking.id);
    }

    if (bookedIds.length === 0) {
      return {
        error: skipped[0]?.includes("(")
          ? skipped[0].replace(/^.*\((.*)\)$/, "$1")
          : `Could not save that ${noun}. Try another gym or time.`,
      };
    }

    const monopoly = kind === "GAME" ? null : await evaluateMonopoly(input.teamId!, targetUserId);
    revalidateApp();
    return {
      ok: true,
      bookingId: bookedIds[0],
      bookedCount: bookedIds.length,
      skipped,
      monopolyTriggered: Boolean(monopoly?.triggered && !monopoly.deduped),
    };
  } catch (error) {
    console.error(error);
    return { error: `Could not save that ${noun}. Try another gym or time.` };
  }
}

export async function updateBookingAction(input: {
  id: string;
  gymId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  notes?: string;
  teamId?: string;
  kind?: "PRACTICE" | "GAME";
}) {
  const actor = await requireUser();
  const existing = await prisma.booking.findUnique({ where: { id: input.id } });
  if (!existing) return { error: "Booking not found." };
  if (actor.role !== "ADMIN" && existing.userId !== actor.id) {
    return { error: "You can only edit your own bookings." };
  }
  const kind = parseSlotKind(input.kind ?? existing.kind);
  const noun = slotNoun(kind);
  const teamId = input.teamId ?? existing.teamId;
  if (!teamId) return { error: `Choose which team this ${noun} is for.` };
  const teamCheck = await assertTeamForCoach(teamId, existing.userId, actor.role);
  if ("error" in teamCheck && teamCheck.error) return { error: teamCheck.error };

  const gym = await prisma.gym.findUnique({ where: { id: input.gymId } });
  if (!gym || !gym.active) {
    return { error: "That gym is not available." };
  }
  if (isBarnGym(gym.name)) {
    return { error: BARN_BOOKING_MESSAGE };
  }

  const startAt = parseDateTime(input.date, input.startTime);
  if (!startAt) {
    return { error: "Pick a valid date and start time." };
  }
  if (!isHourStart(input.startTime)) {
    return { error: "Games and practices start on the hour (for example 5:00 PM, not 5:30 PM)." };
  }
  const past = assertNotPast(startAt);
  if (past) return { error: past };
  const endAt = new Date(startAt.getTime() + slotMinutes(kind) * 60 * 1000);
  try {
    const conflict = await prisma.$transaction(async (tx) => {
      const clash = await assertNoConflict(input.gymId, startAt, endAt, existing.id, tx);
      if (clash) return clash;
      await tx.booking.update({
        where: { id: existing.id },
        data: {
          gymId: input.gymId,
          teamId,
          kind,
          startAt,
          endAt,
          notes: input.notes?.trim() || null,
        },
      });
      return null;
    });
    if (conflict) return { error: conflict };
  } catch (error) {
    console.error(error);
    return { error: `Could not update that ${noun}. Try another gym or time.` };
  }

  if (kind !== "GAME") await evaluateMonopoly(teamId, existing.userId);
  revalidateApp();
  return { ok: true };
}

export async function deleteBookingAction(
  id: string,
  options?: { sendEmail?: boolean; scope?: "this" | "series" },
) {
  const actor = await requireUser();
  const existing = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      gym: { select: { name: true } },
    },
  });
  if (!existing) return { error: "Booking not found." };
  if (actor.role !== "ADMIN" && existing.userId !== actor.id) {
    return { error: "You can only cancel your own bookings." };
  }

  const targets =
    options?.scope === "series" && existing.seriesId
      ? await prisma.booking.findMany({
          where: {
            seriesId: existing.seriesId,
            startAt: { gte: existing.startAt },
            ...(actor.role === "ADMIN" ? {} : { userId: actor.id }),
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
            gym: { select: { name: true } },
          },
          orderBy: { startAt: "asc" },
        })
      : [existing];

  if (targets.length === 0) return { error: "Booking not found." };

  const adminCancelledSomeoneElse =
    actor.role === "ADMIN" && existing.userId !== actor.id;
  const sendEmail = options?.sendEmail ?? true;
  const emailed = adminCancelledSomeoneElse && sendEmail;
  if (emailed) {
    await notifyCoachPracticeCancelled(
      existing,
      "an administrator cancelled it",
      targets.length,
    );
  }
  await prisma.booking.deleteMany({
    where: { id: { in: targets.map((booking) => booking.id) } },
  });
  revalidateApp();
  return { ok: true, emailed, cancelledCount: targets.length };
}

export async function createGymAction(input: {
  name: string;
  address?: string;
  notes?: string;
  active?: boolean;
  bookFrom?: string;
  bookUntil?: string;
}) {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { error: "Gym name is required." };
  const bookFrom = input.bookFrom ?? "06:00";
  const bookUntil = input.bookUntil ?? "22:00";
  const hoursError = validateGymHours(bookFrom, bookUntil);
  if (hoursError) return { error: hoursError };
  const last = await prisma.gym.findFirst({ orderBy: { sortOrder: "desc" } });
  try {
    await prisma.gym.create({
      data: {
        name,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        active: input.active ?? true,
        bookFrom,
        bookUntil,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
    });
  } catch {
    return { error: "A gym with that name already exists." };
  }
  revalidateApp();
  return { ok: true };
}

export async function updateGymAction(input: {
  id: string;
  name: string;
  address?: string;
  notes?: string;
  active: boolean;
  bookFrom?: string;
  bookUntil?: string;
}) {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { error: "Gym name is required." };
  const bookFrom = input.bookFrom ?? "06:00";
  const bookUntil = input.bookUntil ?? "22:00";
  const hoursError = validateGymHours(bookFrom, bookUntil);
  if (hoursError) return { error: hoursError };
  try {
    await prisma.gym.update({
      where: { id: input.id },
      data: {
        name,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        active: input.active,
        bookFrom,
        bookUntil,
      },
    });
  } catch {
    return { error: "Could not update that gym." };
  }
  revalidateApp();
  return { ok: true };
}

export async function deleteGymAction(id: string) {
  await requireAdmin();
  await prisma.gym.delete({ where: { id } });
  revalidateApp();
  return { ok: true as const };
}

export async function createTeamAction(input: {
  name: string;
  notes?: string;
  active?: boolean;
  coachIds?: string[];
}) {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { error: "Team name is required." };
  const last = await prisma.team.findFirst({ orderBy: { sortOrder: "desc" } });
  try {
    const team = await prisma.team.create({
      data: {
        name,
        notes: input.notes?.trim() || null,
        active: input.active ?? true,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
    });
    if (input.coachIds?.length) {
      await prisma.coachTeam.createMany({
        data: input.coachIds.map((userId) => ({ userId, teamId: team.id })),
      });
    }
  } catch {
    return { error: "A team with that name already exists." };
  }
  revalidateApp();
  return { ok: true };
}

export async function updateTeamAction(input: {
  id: string;
  name: string;
  notes?: string;
  active: boolean;
  coachIds: string[];
}) {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { error: "Team name is required." };
  try {
    await prisma.team.update({
      where: { id: input.id },
      data: { name, notes: input.notes?.trim() || null, active: input.active },
    });
    await prisma.coachTeam.deleteMany({ where: { teamId: input.id } });
    if (input.coachIds.length) {
      await prisma.coachTeam.createMany({
        data: input.coachIds.map((userId) => ({ userId, teamId: input.id })),
      });
    }
  } catch {
    return { error: "Could not update that team." };
  }
  revalidateApp();
  return { ok: true };
}

export async function deleteTeamAction(id: string) {
  await requireAdmin();
  const booked = await prisma.booking.count({ where: { teamId: id } });
  if (booked > 0) {
    return { error: "This team still has practices. Move or cancel them first." };
  }
  await prisma.team.delete({ where: { id } });
  revalidateApp();
  return { ok: true };
}

export async function createUserAction(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  active: boolean;
  receivesMonopolyAlerts: boolean;
  teamIds?: string[];
}) {
  await requireAdmin();
  const name = input.name.trim();
  const email = input.email.toLowerCase().trim();
  if (!name || !email || !input.password) {
    return { error: "Name, email, and password are required." };
  }
  if (input.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (input.role === "COACH") {
    const teamCount = await prisma.team.count({ where: { active: true } });
    if (teamCount > 0 && !input.teamIds?.length) {
      return { error: "Assign this coach to at least one team." };
    }
  }
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hash(input.password, 10),
        role: input.role,
        active: input.active,
        receivesMonopolyAlerts: input.role === "ADMIN" ? true : input.receivesMonopolyAlerts,
        mustChangePassword: true,
      },
    });
    if (input.teamIds?.length) {
      await prisma.coachTeam.createMany({
        data: input.teamIds.map((teamId) => ({ userId: user.id, teamId })),
      });
    }
  } catch {
    return { error: "That email is already in use." };
  }
  try {
    await sendWelcomeEmail({
      name,
      email,
      temporaryPassword: input.password,
      role: input.role,
    });
  } catch (error) {
    console.error(error);
  }
  revalidateApp();
  return { ok: true, emailed: true };
}

export async function updateUserAction(input: {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  active: boolean;
  receivesMonopolyAlerts: boolean;
  teamIds?: string[];
}) {
  const actor = await requireAdmin();
  const name = input.name.trim();
  const email = input.email.toLowerCase().trim();
  if (!name || !email) return { error: "Name and email are required." };
  if (input.id === actor.id && !input.active) {
    return { error: "You cannot deactivate your own account." };
  }
  if (input.id === actor.id && input.role !== "ADMIN") {
    return { error: "You cannot remove your own admin role." };
  }
  const existing = await prisma.user.findUnique({ where: { id: input.id } });
  if (existing && isWiredAdmin(existing.email)) {
    if (input.role !== "ADMIN" || !input.active || email !== existing.email) {
      return { error: "The built-in admin login cannot be renamed, demoted, or turned off." };
    }
    if (input.password) {
      return { error: "The built-in admin password is set in .env." };
    }
  }
  if (input.password && input.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (input.role === "COACH" && input.teamIds) {
    const teamCount = await prisma.team.count({ where: { active: true } });
    if (teamCount > 0 && input.teamIds.length === 0) {
      return { error: "Assign this coach to at least one team." };
    }
  }

  try {
    await prisma.user.update({
      where: { id: input.id },
      data: {
        name,
        email,
        role: input.role,
        active: input.active,
        receivesMonopolyAlerts: input.receivesMonopolyAlerts,
        ...(input.password
          ? {
              passwordHash: await hash(input.password, 10),
              mustChangePassword: true,
            }
          : {}),
      },
    });
    if (input.teamIds) {
      await prisma.coachTeam.deleteMany({ where: { userId: input.id } });
      if (input.teamIds.length) {
        await prisma.coachTeam.createMany({
          data: input.teamIds.map((teamId) => ({ userId: input.id, teamId })),
        });
      }
    }
  } catch {
    return { error: "Could not update that user." };
  }
  revalidateApp();
  return { ok: true };
}

function generateTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  let value = "";
  for (const byte of bytes) {
    value += alphabet[byte % alphabet.length];
  }
  return `${value}!`;
}

export async function sendTemporaryPasswordAction(id: string) {
  const actor = await requireAdmin();
  if (id === actor.id) {
    return { error: "You cannot reset your own password this way." };
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "That person is already gone." };
  if (isWiredAdmin(user.email)) {
    return { error: "The built-in admin password is set in .env, not by email." };
  }
  if (!user.active) {
    return { error: "Turn the account back on before sending a temporary password." };
  }

  const kind = user.mustChangePassword ? "resent" : "reset";
  const temporaryPassword = generateTempPassword();
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await hash(temporaryPassword, 10),
      mustChangePassword: true,
    },
  });

  try {
    const delivery = await sendWelcomeEmail({
      name: user.name,
      email: user.email,
      temporaryPassword,
      role: user.role,
      kind,
    });
    revalidateApp();
    if (delivery.status === "failed") {
      return {
        error:
          "A new temporary password was saved, but the email did not send. Try the button again.",
      };
    }
    return { ok: true as const, delivery: delivery.status, kind };
  } catch (error) {
    console.error(error);
    revalidateApp();
    return {
      error:
        "A new temporary password was saved, but the email did not send. Try the button again.",
    };
  }
}

export async function deleteUserAction(id: string) {
  const actor = await requireAdmin();
  if (id === actor.id) {
    return { error: "You cannot remove your own account." };
  }
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "That person is already gone." };
  if (isWiredAdmin(target.email)) {
    return { error: "The built-in admin login cannot be removed." };
  }
  if (target.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", id: { not: id } },
    });
    if (otherAdmins === 0) {
      return { error: "You cannot remove the last admin." };
    }
  }
  await prisma.user.delete({ where: { id } });
  revalidateApp();
  return { ok: true };
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const user = await requireUser();
  if (input.newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (input.newPassword !== input.confirmPassword) {
    return { error: "New password and confirmation do not match." };
  }
  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record) return { error: "Account not found." };
  const currentOk = await compare(input.currentPassword, record.passwordHash);
  if (!currentOk) {
    return { error: "Current password is incorrect." };
  }
  if (await compare(input.newPassword, record.passwordHash)) {
    return { error: "Choose a new password, not the temporary one." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hash(input.newPassword, 10),
      mustChangePassword: false,
    },
  });
  await unstable_update({
    user: { mustChangePassword: false },
  });
  revalidateApp();
  return { ok: true };
}

export async function createBlockAction(input: {
  gymId: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  allGyms?: boolean;
  title: string;
  kind: BlockKind;
}) {
  await requireAdmin();
  const title = input.title.trim();
  if (!title) {
    return {
      error:
        input.kind === "CLOSED"
          ? "Give the closed day a title (e.g. School closed or Holiday)."
          : "Give the block a title (e.g. Varsity vs. Ridgewood).",
    };
  }
  const allDay = input.kind === "CLOSED" ? true : Boolean(input.allDay);
  const dayBounds = allDay ? appDayBounds(input.date) : null;
  const startAt = allDay ? dayBounds?.startAt ?? null : parseDateTime(input.date, input.startTime);
  const endAt = allDay ? dayBounds?.endAt ?? null : parseDateTime(input.date, input.endTime);
  if (!startAt || !endAt) return { error: "Pick a valid date and time." };
  if (endAt <= startAt) return { error: "End time must be after start time." };

  const gyms = input.allGyms
    ? await prisma.gym.findMany({ where: { active: true }, select: { id: true } })
    : [{ id: input.gymId }];
  if (gyms.length === 0) return { error: "No active gyms to close." };

  const cancelledCoaches: string[] = [];
  for (const gym of gyms) {
    const names = await cancelOverlappingPractices({
      gymId: gym.id,
      startAt,
      endAt,
      reasonTitle: title,
    });
    cancelledCoaches.push(...names);
    await prisma.blockedPeriod.create({
      data: {
        gymId: gym.id,
        startAt,
        endAt,
        title,
        kind: input.kind,
      },
    });
  }
  revalidateApp();
  return { ok: true, cancelledCoaches: [...new Set(cancelledCoaches)] };
}

export async function updateBlockAction(input: {
  id: string;
  gymId: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  title: string;
  kind: BlockKind;
}) {
  await requireAdmin();
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };
  const allDay = input.kind === "CLOSED" ? true : Boolean(input.allDay);
  const dayBounds = allDay ? appDayBounds(input.date) : null;
  const startAt = allDay ? dayBounds?.startAt ?? null : parseDateTime(input.date, input.startTime);
  const endAt = allDay ? dayBounds?.endAt ?? null : parseDateTime(input.date, input.endTime);
  if (!startAt || !endAt) return { error: "Pick a valid date and time." };
  if (endAt <= startAt) return { error: "End time must be after start time." };

  const cancelledCoaches = await cancelOverlappingPractices({
    gymId: input.gymId,
    startAt,
    endAt,
    reasonTitle: title,
  });

  await prisma.blockedPeriod.update({
    where: { id: input.id },
    data: {
      gymId: input.gymId,
      startAt,
      endAt,
      title,
      kind: input.kind,
    },
  });
  revalidateApp();
  return { ok: true, cancelledCoaches };
}

export async function deleteBlockAction(id: string) {
  const actor = await requireUser();
  const existing = await prisma.blockedPeriod.findUnique({ where: { id } });
  if (!existing) return { error: "That hold was already removed." };
  if (actor.role !== "ADMIN" && existing.kind !== "GAME") {
    return { error: "Only an admin can remove that hold." };
  }
  await prisma.blockedPeriod.delete({ where: { id } });
  revalidateApp();
  return { ok: true };
}

export async function deleteBlocksAction(ids: string[]) {
  await requireAdmin();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return { error: "Nothing to remove." };
  await prisma.blockedPeriod.deleteMany({ where: { id: { in: unique } } });
  revalidateApp();
  return { ok: true as const };
}

export async function updateClosedGroupAction(input: {
  ids: string[];
  date: string;
  title: string;
}) {
  await requireAdmin();
  const title = input.title.trim();
  if (!title) return { error: "Give the closed day a title (e.g. School closed or Holiday)." };
  const unique = [...new Set(input.ids.filter(Boolean))];
  if (unique.length === 0) return { error: "Nothing to update." };
  const day = appDayBounds(input.date);
  if (!day) return { error: "Pick a valid date." };

  const existing = await prisma.blockedPeriod.findMany({
    where: { id: { in: unique }, kind: "CLOSED" },
    select: { id: true, gymId: true },
  });
  if (existing.length === 0) return { error: "Those closed days were not found." };

  const cancelledCoaches: string[] = [];
  for (const block of existing) {
    const names = await cancelOverlappingPractices({
      gymId: block.gymId,
      startAt: day.startAt,
      endAt: day.endAt,
      reasonTitle: title,
    });
    cancelledCoaches.push(...names);
  }

  await prisma.blockedPeriod.updateMany({
    where: { id: { in: existing.map((block) => block.id) } },
    data: {
      title,
      startAt: day.startAt,
      endAt: day.endAt,
      kind: "CLOSED",
    },
  });
  revalidateApp();
  return { ok: true as const, cancelledCoaches: [...new Set(cancelledCoaches)] };
}

async function gymsForCalendar(calendar: SchoolCalendarId) {
  return prisma.gym.findMany({
    where: { active: true, name: { in: gymNamesForCalendar(calendar) } },
    select: { id: true },
  });
}

async function schoolBlocksOnDate(date: string, gymIds: string[]) {
  const day = appDayBounds(date);
  if (!day || gymIds.length === 0) return [];
  return prisma.blockedPeriod.findMany({
    where: {
      title: SCHOOL_IN_SESSION_TITLE,
      gymId: { in: gymIds },
      startAt: { gte: day.startAt, lte: day.endAt },
    },
  });
}

export async function saveSchoolDayAction(input: {
  calendar?: SchoolCalendarId;
  date: string;
  startTime: string;
  endTime: string;
}) {
  await requireAdmin();
  const calendar = input.calendar ?? "district";
  const startAt = parseDateTime(input.date, input.startTime);
  const endAt = parseDateTime(input.date, input.endTime);
  if (!startAt || !endAt) return { error: "Pick a valid date and time." };
  if (endAt <= startAt) return { error: "End time must be after start time." };

  const gyms = await gymsForCalendar(calendar);
  if (gyms.length === 0) {
    return {
      error:
        calendar === "eastern-christian"
          ? "Add the Eastern Christian gym first."
          : "Add the district gyms first.",
    };
  }

  const existing = await schoolBlocksOnDate(
    input.date,
    gyms.map((gym) => gym.id),
  );
  const cancelledCoaches: string[] = [];
  for (const gym of gyms) {
    const names = await cancelOverlappingPractices({
      gymId: gym.id,
      startAt,
      endAt,
      reasonTitle: SCHOOL_IN_SESSION_TITLE,
    });
    cancelledCoaches.push(...names);
    const current = existing.find((block) => block.gymId === gym.id);
    if (current) {
      await prisma.blockedPeriod.update({
        where: { id: current.id },
        data: { startAt, endAt, kind: "MAINTENANCE" },
      });
    } else {
      await prisma.blockedPeriod.create({
        data: {
          gymId: gym.id,
          startAt,
          endAt,
          title: SCHOOL_IN_SESSION_TITLE,
          kind: "MAINTENANCE",
        },
      });
    }
  }
  revalidateApp();
  return { ok: true as const, cancelledCoaches: [...new Set(cancelledCoaches)] };
}

export async function deleteSchoolDayAction(
  date: string,
  calendar: SchoolCalendarId = "district",
) {
  await requireAdmin();
  const gyms = await gymsForCalendar(calendar);
  const existing = await schoolBlocksOnDate(
    date,
    gyms.map((gym) => gym.id),
  );
  if (existing.length === 0) return { error: "That school day is not on the list." };
  await prisma.blockedPeriod.deleteMany({
    where: { id: { in: existing.map((block) => block.id) } },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function updateSettingsAction(input: {
  monopolyWindowDays: number;
  monopolyFairMultiplier: number;
  recipientIds: string[];
  supportEmail?: string;
  supportPhone?: string;
}) {
  await requireAdmin();
  if (input.monopolyWindowDays < 7 || input.monopolyWindowDays > 90) {
    return { error: "Window must be between 7 and 90 days." };
  }
  if (input.monopolyFairMultiplier < 1 || input.monopolyFairMultiplier > 3) {
    return { error: "Fair-share extra must be between 100% and 300% of an equal split." };
  }
  const supportEmail = input.supportEmail?.trim() || null;
  const supportPhone = input.supportPhone?.trim() || null;
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    return { error: "Enter a valid help email, or leave it blank." };
  }

  await prisma.appSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      monopolyWindowDays: input.monopolyWindowDays,
      monopolyFairMultiplier: input.monopolyFairMultiplier,
      supportEmail,
      supportPhone,
    },
    update: {
      monopolyWindowDays: input.monopolyWindowDays,
      monopolyFairMultiplier: input.monopolyFairMultiplier,
      supportEmail,
      supportPhone,
    },
  });

  await prisma.$transaction([
    prisma.user.updateMany({
      data: { receivesMonopolyAlerts: false },
    }),
    prisma.user.updateMany({
      where: { id: { in: input.recipientIds } },
      data: { receivesMonopolyAlerts: true },
    }),
  ]);

  revalidateApp();
  return { ok: true };
}

export async function markNotificationReadAction(id: string) {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });
  revalidateApp();
  return { ok: true };
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidateApp();
  return { ok: true };
}

export async function getFreshUser() {
  return getCurrentUser();
}

export async function goHome() {
  redirect("/schedule");
}

export async function reorderGymAction(id: string, direction: "up" | "down") {
  await requireAdmin();
  const gyms = await prisma.gym.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const index = gyms.findIndex((gym) => gym.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= gyms.length) return { ok: true as const };
  const ids = gyms.map((gym) => gym.id);
  const [moved] = ids.splice(index, 1);
  ids.splice(swapWith, 0, moved);
  await prisma.$transaction(
    ids.map((gymId, sortOrder) => prisma.gym.update({ where: { id: gymId }, data: { sortOrder } })),
  );
  revalidateApp();
  return { ok: true as const };
}

export async function reorderTeamAction(id: string, direction: "up" | "down") {
  await requireAdmin();
  const teams = await prisma.team.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const index = teams.findIndex((team) => team.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= teams.length) return { ok: true as const };
  const ids = teams.map((team) => team.id);
  const [moved] = ids.splice(index, 1);
  ids.splice(swapWith, 0, moved);
  await prisma.$transaction(
    ids.map((teamId, sortOrder) => prisma.team.update({ where: { id: teamId }, data: { sortOrder } })),
  );
  revalidateApp();
  return { ok: true as const };
}

export async function findOpenSlotsAction(gymId?: string) {
  await requireUser();
  const gyms = await getActiveGyms();
  const from = new Date();
  const rangeEnd = addDays(from, 22);
  const { bookings, blocks } = await getSchedule(from, rangeEnd, gymId && gymId !== "all" ? gymId : undefined);
  const occupied = [
    ...bookings.map((booking) => ({
      id: booking.id,
      gymId: booking.gymId,
      gymName: booking.gym.name,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      label: booking.kind === "GAME" ? `Game · ${booking.team?.name ?? booking.user.name}` : (booking.team?.name ?? booking.user.name),
      kind: "booking" as const,
    })),
    ...blocks.map((block) => ({
      id: block.id,
      gymId: block.gymId,
      gymName: block.gym.name,
      startAt: block.startAt.toISOString(),
      endAt: block.endAt.toISOString(),
      label: block.title,
      kind: "block" as const,
    })),
  ];
  return {
    slots: findOpenSlots({
      gyms: gyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        bookFrom: gym.bookFrom,
        bookUntil: gym.bookUntil,
      })),
      occupied,
      gymId: gymId && gymId !== "all" ? gymId : undefined,
    }),
  };
}

export async function requestPasswordResetAction(emailValue: string) {
  const email = emailValue.toLowerCase().trim();
  if (!email) return { error: "Enter the email on your account." };
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.active) {
    const token = randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    try {
      await sendPasswordResetEmail({ name: user.name, email: user.email, token });
    } catch (error) {
      console.error(error);
    }
  }
  return { ok: true as const };
}

export async function resetPasswordWithTokenAction(input: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const token = input.token.trim();
  if (!token) return { error: "That reset link is missing." };
  if (input.newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (input.newPassword !== input.confirmPassword) {
    return { error: "New password and confirmation do not match." };
  }
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() },
      active: true,
    },
  });
  if (!user) {
    return { error: "That reset link is invalid or expired. Request a new one." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hash(input.newPassword, 10),
      mustChangePassword: false,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });
  return { ok: true as const };
}
