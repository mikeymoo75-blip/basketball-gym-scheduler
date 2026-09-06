import { BookPageClient } from "@/components/book-page-client";
import { prisma } from "@/lib/prisma";
import { getActiveGyms, getActiveTeams } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { toDateInput } from "@/lib/time";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ gym?: string; date?: string; time?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const gyms = await getActiveGyms();
  const [coaches, teams] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getActiveTeams(),
  ]);

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        New reservation
      </p>
      <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Book practice</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose a gym, the team this practice is for, a date, and a start time. Every
        practice is 60 minutes. A slot that is already booked, blocked, or outside that
        gym’s hours cannot be taken.
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
        initialGymId={params.gym ?? gyms[0]?.id ?? ""}
        initialDate={params.date ?? toDateInput(new Date())}
        initialTime={params.time ?? "17:00"}
      />
    </div>
  );
}
