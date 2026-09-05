import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/change-password");
  const unread = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return (
    <AppShell user={user} unread={unread}>
      {children}
    </AppShell>
  );
}
