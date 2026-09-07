import { format } from "date-fns";
import { BlocksAdmin } from "@/components/blocks-admin";
import { prisma } from "@/lib/prisma";
import { getAllGyms } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { formatRange } from "@/lib/time";

export default async function AdminBlocksPage() {
  await requireAdmin();
  const [blocks, gyms, sentMail] = await Promise.all([
    prisma.blockedPeriod.findMany({
      include: { gym: true },
      orderBy: { startAt: "asc" },
    }),
    getAllGyms(),
    prisma.outboundEmail.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
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
      {sentMail.length > 0 ? (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Sent mail
            </p>
            <h2 className="font-heading text-xl font-semibold">Welcome and cancellation emails</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Without an email provider these stay logged here. Add a Resend key to deliver
              them to the coach’s inbox.
            </p>
          </div>
          <div className="grid gap-3">
            {sentMail.map((mail) => (
              <div
                key={mail.id}
                className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
              >
                <p className="text-sm font-medium">{mail.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  To {mail.toName} · {mail.to} · {mail.status === "sent" ? "Sent" : "Logged locally"}
                </p>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                  {mail.body}
                </pre>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
