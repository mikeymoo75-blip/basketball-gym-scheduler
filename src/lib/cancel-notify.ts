import { sendPracticeCancellation } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function notifyCoachPracticeCancelled(
  booking: {
    user: { id: string; name: string; email: string };
    gym: { name: string };
    startAt: Date;
    endAt: Date;
  },
  reasonTitle?: string,
  cancelledCount?: number,
) {
  return sendPracticeCancellation({
    coach: booking.user,
    gymName: booking.gym.name,
    startAt: booking.startAt,
    endAt: booking.endAt,
    reasonTitle,
    cancelledCount,
  });
}

export async function cancelOverlappingPractices(input: {
  gymId: string;
  startAt: Date;
  endAt: Date;
  reasonTitle: string;
}) {
  const clashes = await prisma.booking.findMany({
    where: {
      gymId: input.gymId,
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      gym: { select: { name: true } },
    },
  });

  for (const booking of clashes) {
    await notifyCoachPracticeCancelled(booking, input.reasonTitle);
    await prisma.booking.delete({ where: { id: booking.id } });
  }

  return clashes.map((booking) => booking.user.name);
}
