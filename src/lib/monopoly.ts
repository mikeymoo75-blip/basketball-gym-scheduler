import { prisma } from "@/lib/prisma";
import { getUsageSnapshot } from "@/lib/queries";

export async function evaluateMonopoly(teamId: string, coachId?: string) {
  const snapshot = await getUsageSnapshot();
  const team = snapshot.teamRows.find((item) => item.id === teamId);
  const coach = coachId ? snapshot.rows.find((item) => item.id === coachId) : null;
  const flagged = Boolean(team?.overLimit || coach?.overLimit);
  if (!flagged) return null;

  const who = team?.name ?? coach?.name ?? "A team";
  const hours = Math.max(team?.hours ?? 0, coach?.hours ?? 0);
  const reasons = [
    `${hours.toFixed(1)} practice hours in a ${snapshot.settings.monopolyWindowDays}-day look back and ahead`,
    `open gym time is ${snapshot.availableHours.toFixed(0)}h across ${snapshot.coachCount} coaches (equal split ${snapshot.equalHours.toFixed(1)}h, alert at ${snapshot.limitHours.toFixed(1)}h)`,
  ];

  const recent = await prisma.notification.findFirst({
    where: {
      type: "MONOPOLY",
      createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      meta: { contains: teamId },
    },
  });
  if (recent) {
    return { triggered: true, deduped: true, row: team ?? null };
  }

  const recipients = await prisma.user.findMany({
    where: {
      active: true,
      OR: [{ role: "ADMIN" }, { receivesMonopolyAlerts: true }],
    },
    select: { id: true },
  });

  const uniqueIds = [...new Set(recipients.map((item) => item.id))];
  const coaches = team?.coachNames.length ? ` (${team.coachNames.join(", ")})` : "";
  const title = `${who} is over the gym-time limit`;
  const body = `${who}${coaches} now holds ${reasons.join(". ")}. Adding coaches lowers the equal split. Review the usage board before more practices are booked.`;
  const meta = JSON.stringify({
    teamId,
    hours,
    share: team?.share ?? coach?.share ?? 0,
    windowDays: snapshot.settings.monopolyWindowDays,
    availableHours: snapshot.availableHours,
    coachCount: snapshot.coachCount,
    limitHours: snapshot.limitHours,
    href: "/admin",
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

  return { triggered: true, deduped: false, row: team ?? null };
}