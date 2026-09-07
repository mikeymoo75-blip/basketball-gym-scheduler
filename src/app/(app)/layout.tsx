import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/change-password");
  const [unread, settings] = await Promise.all([
    prisma.notification.count({
      where: { userId: user.id, read: false },
    }),
    getSettings(),
  ]);

  return (
    <AppShell
      user={user}
      unread={unread}
      supportEmail={settings.supportEmail}
      supportPhone={settings.supportPhone}
    >
      {children}
    </AppShell>
  );
}
