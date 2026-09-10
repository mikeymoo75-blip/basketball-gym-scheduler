import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { SentEmailsList } from "@/components/sent-emails-list";

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
          letter is still saved here. Click a row to read the full letter.
        </p>
      </div>
      {sentMail.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground">
          No emails yet. When someone is invited or a practice is cancelled, the letter
          will show up here.
        </div>
      ) : (
        <SentEmailsList
          emails={sentMail.map((mail) => ({
            id: mail.id,
            subject: mail.subject,
            toName: mail.toName,
            to: mail.to,
            status: mail.status,
            createdAtLabel: format(mail.createdAt, "MMM d, yyyy · h:mm a"),
            body: mail.body,
          }))}
        />
      )}
    </div>
  );
}
