import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export default async function BookingsRedirectPage() {
  const user = await requireUser();
  redirect(user.role === "ADMIN" ? "/admin/bookings" : "/practices");
}
