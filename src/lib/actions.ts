"use server";

import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { type BlockKind, type Role } from "@prisma/client";
import { signIn, signOut, unstable_update } from "@/lib/auth";
import { cancelOverlappingPractices, notifyCoachPracticeCancelled } from "@/lib/cancel-notify";
import { evaluateMonopoly } from "@/lib/monopoly";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin, requireUser } from "@/lib/session";
import { hoursBetween, overlaps, parseDateTime, DAY_START_HOUR, DAY_END_HOUR } from "@/lib/time";

function revalidateApp() {
  revalidatePath("/", "layout");
}

async function assertNoConflict(gymId: string, startAt: Date, endAt: Date, excludeBookingId?: string) {
  if (endAt <= startAt) {
    return "End time must be after start time.";
  }
  if (hoursBetween(startAt, endAt) !== 1) {
    return "Practices are 60 minutes.";
  }

  const startHour = startAt.getHours() + startAt.getMinutes() / 60;
  const endHour = endAt.getHours() + endAt.getMinutes() / 60;
  if (startHour < DAY_START_HOUR || endHour > DAY_END_HOUR) {
    return `Gyms are bookable from ${DAY_START_HOUR}:00 AM to 10:00 PM.`;
  }

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        gymId,
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      include: { user: { select: { name: true } } },
    }),
    prisma.blockedPeriod.findMany({
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
    return `That court is already reserved by ${bookingHit.user.name}.`;
  }

  const blockHit = blocks.find((block) => overlaps(startAt, endAt, block.startAt, block.endAt));
  if (blockHit) {
    return `${blockHit.title} already has this gym blocked.`;
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

export async function createBookingAction(input: {
  gymId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  notes?: string;
  userId?: string;
}) {
  const actor = await requireUser();
  const targetUserId =
    actor.role === "ADMIN" && input.userId ? input.userId : actor.id;

  if (actor.role !== "ADMIN" && input.userId && input.userId !== actor.id) {
    return { error: "You can only book for yourself." };
  }

  const gym = await prisma.gym.findUnique({ where: { id: input.gymId } });
  if (!gym || !gym.active) {
    return { error: "That gym is not available." };
  }

  const startAt = parseDateTime(input.date, input.startTime);
  if (!startAt) {
    return { error: "Pick a valid date and start time." };
  }
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

  try {
    const conflict = await assertNoConflict(gym.id, startAt, endAt);
    if (conflict) return { error: conflict };

    const booking = await prisma.booking.create({
      data: {
        gymId: gym.id,
        userId: targetUserId,
        startAt,
        endAt,
        notes: input.notes?.trim() || null,
      },
    });

    const monopoly = await evaluateMonopoly(targetUserId);
    revalidateApp();
    return {
      ok: true,
      bookingId: booking.id,
      monopolyTriggered: Boolean(monopoly?.triggered && !monopoly.deduped),
    };
  } catch (error) {
    console.error(error);
    return { error: "Could not save that practice. Try another gym or time." };
  }
}

export async function updateBookingAction(input: {
  id: string;
  gymId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  notes?: string;
}) {
  const actor = await requireUser();
  const existing = await prisma.booking.findUnique({ where: { id: input.id } });
  if (!existing) return { error: "Booking not found." };
  if (actor.role !== "ADMIN" && existing.userId !== actor.id) {
    return { error: "You can only edit your own bookings." };
  }

  const startAt = parseDateTime(input.date, input.startTime);
  if (!startAt) {
    return { error: "Pick a valid date and start time." };
  }
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
  const conflict = await assertNoConflict(input.gymId, startAt, endAt, existing.id);
  if (conflict) return { error: conflict };

  await prisma.booking.update({
    where: { id: existing.id },
    data: {
      gymId: input.gymId,
      startAt,
      endAt,
      notes: input.notes?.trim() || null,
    },
  });

  await evaluateMonopoly(existing.userId);
  revalidateApp();
  return { ok: true };
}

export async function deleteBookingAction(id: string) {
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

  const notifyCoach = actor.role === "ADMIN" && existing.userId !== actor.id;
  if (notifyCoach) {
    await notifyCoachPracticeCancelled(existing);
  }
  await prisma.booking.delete({ where: { id } });
  revalidateApp();
  return { ok: true, notified: notifyCoach };
}

export async function createGymAction(input: {
  name: string;
  address?: string;
  notes?: string;
  active?: boolean;
}) {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { error: "Gym name is required." };
  const last = await prisma.gym.findFirst({ orderBy: { sortOrder: "desc" } });
  try {
    await prisma.gym.create({
      data: {
        name,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        active: input.active ?? true,
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
}) {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { error: "Gym name is required." };
  try {
    await prisma.gym.update({
      where: { id: input.id },
      data: {
        name,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        active: input.active,
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

export async function createUserAction(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  active: boolean;
  receivesMonopolyAlerts: boolean;
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
  try {
    await prisma.user.create({
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
  } catch {
    return { error: "That email is already in use." };
  }
  revalidateApp();
  return { ok: true };
}

export async function updateUserAction(input: {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  active: boolean;
  receivesMonopolyAlerts: boolean;
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
  if (input.password && input.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
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
  } catch {
    return { error: "Could not update that user." };
  }
  revalidateApp();
  return { ok: true };
}

export async function resetPasswordAction(input: { id: string; password: string }) {
  await requireAdmin();
  if (input.password.length < 8) {
    return { error: "Temporary password must be at least 8 characters." };
  }
  await prisma.user.update({
    where: { id: input.id },
    data: {
      passwordHash: await hash(input.password, 10),
      mustChangePassword: true,
    },
  });
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
  title: string;
  kind: BlockKind;
}) {
  await requireAdmin();
  const title = input.title.trim();
  if (!title) return { error: "Give the block a title (e.g. Varsity vs. Ridgewood)." };
  const startAt = input.allDay
    ? parseDateTime(input.date, "00:00")
    : parseDateTime(input.date, input.startTime);
  const endAt = input.allDay
    ? parseDateTime(input.date, "23:59")
    : parseDateTime(input.date, input.endTime);
  if (!startAt || !endAt) return { error: "Pick a valid date and time." };
  if (endAt <= startAt) return { error: "End time must be after start time." };

  const cancelledCoaches = await cancelOverlappingPractices({
    gymId: input.gymId,
    startAt,
    endAt,
    reasonTitle: title,
  });

  await prisma.blockedPeriod.create({
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
  const startAt = input.allDay
    ? parseDateTime(input.date, "00:00")
    : parseDateTime(input.date, input.startTime);
  const endAt = input.allDay
    ? parseDateTime(input.date, "23:59")
    : parseDateTime(input.date, input.endTime);
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
  await requireAdmin();
  await prisma.blockedPeriod.delete({ where: { id } });
  revalidateApp();
  return { ok: true };
}

export async function updateSettingsAction(input: {
  monopolyWindowDays: number;
  monopolyHoursThreshold: number;
  monopolyShareThreshold: number;
  recipientIds: string[];
}) {
  await requireAdmin();
  if (input.monopolyWindowDays < 7 || input.monopolyWindowDays > 90) {
    return { error: "Window must be between 7 and 90 days." };
  }
  if (input.monopolyHoursThreshold <= 0) {
    return { error: "Hours threshold must be greater than 0." };
  }
  if (input.monopolyShareThreshold <= 0 || input.monopolyShareThreshold > 1) {
    return { error: "Share threshold must be between 1% and 100%." };
  }

  await prisma.appSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      monopolyWindowDays: input.monopolyWindowDays,
      monopolyHoursThreshold: input.monopolyHoursThreshold,
      monopolyShareThreshold: input.monopolyShareThreshold,
    },
    update: {
      monopolyWindowDays: input.monopolyWindowDays,
      monopolyHoursThreshold: input.monopolyHoursThreshold,
      monopolyShareThreshold: input.monopolyShareThreshold,
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
