import { formatDistanceToNow } from "date-fns";
import { NotificationsClient } from "@/components/notifications-client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Inbox
        </p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Notifications</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cancellations land here if an admin takes your practice for a game or other
          function. Monopoly alerts also appear for admins and designated recipients.
        </p>
      </div>
      <NotificationsClient
        items={items.map((item) => {
          let href: string | null = item.type === "MONOPOLY" ? "/admin" : null;
          if (item.meta) {
            try {
              const parsed = JSON.parse(item.meta) as { href?: string };
              if (parsed.href) href = parsed.href;
            } catch {
              href = href;
            }
          }
          return {
            id: item.id,
            title: item.title,
            body: item.body,
            type: item.type,
            read: item.read,
            createdAt: item.createdAt.toISOString(),
            timeAgo: formatDistanceToNow(item.createdAt, { addSuffix: true }),
            href,
          };
        })}
      />
    </div>
  );
}
