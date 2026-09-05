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
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Games & holds</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Lock a gym for games, tournaments, or maintenance. Blocked windows cannot be booked
          and show as green or indigo on the board.
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
