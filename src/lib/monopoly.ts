import { prisma } from "@/lib/prisma";
import { getSettings, getUsageSnapshot } from "@/lib/queries";

export async function evaluateMonopoly(teamId: string) {
  const settings = await getSettings();
  const snapshot = await getUsageSnapshot();
  const row = snapshot.teamRows.find((item) => item.id === teamId);
  if (!row || !row.overLimit) return null;

  const reasons: string[] = [];
  if (row.overHours) {
    reasons.push(
      `${row.hours.toFixed(1)} hours in the last ${settings.monopolyWindowDays} days (limit ${settings.monopolyHoursThreshold})`
    );
  }
  if (row.overShare) {
    reasons.push(
      `${Math.round(row.share * 100)}% of booked gym time (limit ${Math.round(settings.monopolyShareThreshold * 100)}%)`
    );
  }

  const recent = await prisma.notification.findFirst({
    where: {
      type: "MONOPOLY",
      createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      meta: { contains: teamId },
    },
  });
  if (recent) {
    return { triggered: true, deduped: true, row };
  }

  const recipients = await prisma.user.findMany({
    where: {
      active: true,
      OR: [{ role: "ADMIN" }, { receivesMonopolyAlerts: true }],
    },
    select: { id: true },
  });

  const uniqueIds = [...new Set(recipients.map((item) => item.id))];
  const who = row.coachNames.length ? ` (${row.coachNames.join(", ")})` : "";
  const title = `${row.name} is over the gym-time limit`;
  const body = `${row.name}${who} now holds ${reasons.join(" and ")}. Limits are per team, so a coach with two teams is not counted as one pile of hours. Review the usage board before approving more practices.`;
  const meta = JSON.stringify({
    teamId,
    hours: row.hours,
    share: row.share,
    windowDays: settings.monopolyWindowDays,
  });

  if (uniqueIds.length > 0) {
    await prisma.notification.createMany({
      data: uniqueIds.map((id) => ({
        userId: id,
        type: "MONOPOLY" as const,
        title,
        body,
        meta,
      })),
    });
  }

  return { triggered: true, deduped: false, row };
}

export async function notifySystem(userIds: string[], title: string, body: string) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: "SYSTEM" as const,
      title,
      body,
    })),
  });
}
