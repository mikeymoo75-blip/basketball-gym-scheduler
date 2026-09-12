import { addDays } from "date-fns";
import { BookPageClient } from "@/components/book-page-client";
import { prisma } from "@/lib/prisma";
import { getActiveGyms, getActiveTeams, getSchedule } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { firstBookableGym, isBarnGym } from "@/lib/barn";
import { snapToHourStart, toDateInput } from "@/lib/time";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ gym?: string; date?: string; time?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const gyms = await getActiveGyms();
  const rangeStart = new Date();
  const rangeEnd = addDays(rangeStart, 90);
  const [{ bookings, blocks }, coaches, teams] = await Promise.all([
    getSchedule(rangeStart, rangeEnd),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    getActiveTeams(),
  ]);

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        New reservation
      </p>
      <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Book gym time</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose practice or game, the team, gym, date, and start time. Every slot is 60
        minutes. A time that is already booked or blocked cannot be taken. Cancelled games
        can be put back on any open hour.
      </p>
      <BookPageClient
        gyms={gyms.map((gym) => ({
          id: gym.id,
          name: gym.name,
          bookFrom: gym.bookFrom,
          bookUntil: gym.bookUntil,
        }))}
        coaches={coaches}
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          coachIds: team.coaches.map((row) => row.userId),
        }))}
        isAdmin={user.role === "ADMIN"}
        currentUserId={user.id}
        initialGymId={
          params.gym && !isBarnGym(gyms.find((gym) => gym.id === params.gym)?.name)
            ? params.gym
            : (firstBookableGym(gyms)?.id ?? "")
        }
        initialDate={params.date ?? toDateInput(new Date())}
        initialTime={snapToHourStart(params.time ?? "17:00")}
        occupied={[
          ...bookings.map((booking) => ({
            id: booking.id,
            gymId: booking.gymId,
            gymName: booking.gym.name,
            startAt: booking.startAt.toISOString(),
            endAt: booking.endAt.toISOString(),
            label: booking.team?.name ?? booking.user.name,
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
        ]}
      />
    </div>
  );
}
