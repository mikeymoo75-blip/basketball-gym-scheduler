import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function AdminEmailsPage() {
  await requireAdmin();
  const sentMail = await prisma.outboundEmail.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Mail
        </p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Sent Emails</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Welcome letters, password resets, and cancellation notices. A coach
          cancelling their own practice does not send mail. When an admin cancels
          someone else’s practice, they are asked whether to email that coach —
          only a “Yes” sends mail. If mail is not set up on this machine, the
          letter is still saved here.
        </p>
      </div>
      {sentMail.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground">
          No emails yet. When someone is invited or a practice is cancelled, the letter
          will show up here.
        </div>
      ) : (
        <div className="grid gap-3">
          {sentMail.map((mail) => (
            <div
              key={mail.id}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <p className="text-sm font-medium">{mail.subject}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                To {mail.toName} · {mail.to} ·{" "}
                {mail.status === "sent" ? "Sent" : "Logged locally"} ·{" "}
                {format(mail.createdAt, "MMM d, yyyy · h:mm a")}
              </p>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                {mail.body}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
