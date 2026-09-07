import { format } from "date-fns";
import { BlocksAdmin } from "@/components/blocks-admin";
import { prisma } from "@/lib/prisma";
import { getAllGyms } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { formatRange } from "@/lib/time";

export default async function AdminBlocksPage() {
  await requireAdmin();
  const [blocks, gyms] = await Promise.all([
    prisma.blockedPeriod.findMany({
      include: { gym: true },
      orderBy: { startAt: "asc" },
    }),
    getAllGyms(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Unavailable
        </p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Games and Closed Days</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Lock a gym for a game or hold, or close a day when school is shut or a building
          event takes the floor. Choose one gym or All gyms. Closed days and blocked
          times show gray on the calendar so coaches can see they are taken. If a coach
          already booked that window, their practice is cancelled and they get a notice
          plus an email.
        </p>
      </div>
      <BlocksAdmin
        gyms={gyms.map((gym) => ({ id: gym.id, name: gym.name }))}
        blocks={blocks.map((block) => ({
          id: block.id,
          gymId: block.gymId,
          gymName: block.gym.name,
          title: block.title,
          kind: block.kind,
          startAt: block.startAt.toISOString(),
          endAt: block.endAt.toISOString(),
          whenLabel: `${format(block.startAt, "EEE, MMM d")} · ${formatRange(block.startAt, block.endAt)}`,
        }))}
      />
    </div>
  );
}
