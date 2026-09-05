import { GymsAdmin } from "@/components/gyms-admin";
import { getAllGyms } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";

export default async function AdminGymsPage() {
  await requireAdmin();
  const gyms = await getAllGyms();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Facilities
        </p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Gyms</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          These six floors ship with the seed. Add, rename, or retire a gym without losing
          history on deactivated courts.
        </p>
      </div>
      <GymsAdmin
        gyms={gyms.map((gym) => ({
          id: gym.id,
          name: gym.name,
          address: gym.address,
          notes: gym.notes,
          active: gym.active,
        }))}
      />
    </div>
  );
}
