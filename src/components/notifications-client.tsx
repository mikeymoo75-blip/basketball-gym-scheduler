"use client";

import Link from "next/link";
import { BellOff } from "lucide-react";
import { toast } from "sonner";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Item = {
  id: string;
  title: string;
  body: string;
  type: "MONOPOLY" | "SYSTEM" | "CANCELLATION";
  read: boolean;
  createdAt: string;
  timeAgo: string;
  href?: string | null;
};

export function NotificationsClient({ items }: { items: Item[] }) {
  const unread = items.filter((item) => !item.read).length;

  return (
    <div className="space-y-3">
      {unread > 0 ? (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={async () => {
              await markAllNotificationsReadAction();
              toast.success("All caught up.");
            }}
          >
            Mark all read
          </Button>
        </div>
      ) : null}
      {items.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/60 px-6 py-16 text-center">
          <BellOff className="mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">Quiet board</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No alerts yet. Cancellations and monopoly warnings appear here.
          </p>
        </div>
      ) : (
        items.map((item) => (
          <Card key={item.id} className={item.read ? "opacity-70" : ""}>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.title}</p>
                <Badge variant={item.type === "MONOPOLY" ? "destructive" : "secondary"}>
                  {item.type === "MONOPOLY"
                    ? "Monopoly"
                    : item.type === "CANCELLATION"
                      ? "Cancelled"
                      : "System"}
                </Badge>
                {!item.read ? <Badge>New</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">{item.body}</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{item.timeAgo}</p>
                <div className="flex gap-2">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="inline-flex h-7 items-center rounded-lg border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                    >
                      Open
                    </Link>
                  ) : null}
                  {!item.read ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await markNotificationReadAction(item.id);
                      }}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
