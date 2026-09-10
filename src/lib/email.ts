import { format } from "date-fns";
import { prisma } from "@/lib/prisma";

export type OutboundMail = {
  to: string;
  toName: string;
  subject: string;
  body: string;
  html?: string;
};

export function appUrl() {
  return (process.env.AUTH_URL ?? process.env.APP_URL ?? "http://127.0.0.1:43147").replace(/\/$/, "");
}

export function practiceCancellationCopy(input: {
  coachName: string;
  gymName: string;
  startAt: Date;
  endAt: Date;
  reasonTitle?: string;
}) {
  const dateLabel = format(input.startAt, "EEEE, MMMM d");
  const timeLabel = `${format(input.startAt, "h:mm a")} – ${format(input.endAt, "h:mm a")}`;
  const reasonTitle = input.reasonTitle?.trim();
  const reason =
    reasonTitle === "an administrator cancelled it"
      ? "An administrator cancelled this practice"
      : reasonTitle
        ? `Due to a game or other function (${reasonTitle})`
        : "Due to a game or other function";

  const subject = `Your MP Basketball practice on ${dateLabel} has been cancelled`;
  const body = [
    `Hi ${input.coachName},`,
    "",
    `${reason}, your practice on ${dateLabel} at ${timeLabel} at ${input.gymName} has been cancelled.`,
    "",
    "Please check the schedule and book another open time if you still need the floor.",
    "",
    "Thank you,",
    "MP Basketball",
  ].join("\n");

  const notificationTitle = "Practice cancelled";
  const notificationBody = `${reason}, your practice on ${dateLabel} at ${timeLabel} at ${input.gymName} has been cancelled.`;

  return { dateLabel, timeLabel, subject, body, notificationTitle, notificationBody };
}

async function deliverEmail(mail: OutboundMail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "MP Basketball <noreply@midlandpark.local>";

  if (!apiKey) {
    return { status: "logged" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [mail.to],
      subject: mail.subject,
      text: mail.body,
      ...(mail.html ? { html: mail.html } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Resend email failed:", detail);
    return { status: "failed" as const };
  }

  return { status: "sent" as const };
}

export async function sendPracticeCancellation(input: {
  coach: { id: string; name: string; email: string };
  gymName: string;
  startAt: Date;
  endAt: Date;
  reasonTitle?: string;
}) {
  const copy = practiceCancellationCopy({
    coachName: input.coach.name,
    gymName: input.gymName,
    startAt: input.startAt,
    endAt: input.endAt,
    reasonTitle: input.reasonTitle,
  });

  await prisma.notification.create({
    data: {
      userId: input.coach.id,
      type: "CANCELLATION",
      title: copy.notificationTitle,
      body: copy.notificationBody,
      meta: JSON.stringify({
        gymName: input.gymName,
        startAt: input.startAt.toISOString(),
        emailTo: input.coach.email,
        href: `/schedule?date=${format(input.startAt, "yyyy-MM-dd")}`,
      }),
    },
  });

  const delivery = await deliverEmail({
    to: input.coach.email,
    toName: input.coach.name,
    subject: copy.subject,
    body: copy.body,
  });

  await prisma.outboundEmail.create({
    data: {
      to: input.coach.email,
      toName: input.coach.name,
      subject: copy.subject,
      body: copy.body,
      status: delivery.status,
    },
  });

  return delivery;
}

export type WelcomeEmailKind = "new" | "resent" | "reset";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function welcomeAccountCopy(input: {
  name: string;
  email: string;
  temporaryPassword: string;
  role: string;
  kind?: WelcomeEmailKind;
}) {
  const signInUrl = `${appUrl()}/login`;
  const firstName = input.name.trim().split(/\s+/)[0] || input.name;
  const kind = input.kind ?? "new";
  const subject =
    kind === "reset"
      ? "Your MP Basketball password was reset"
      : kind === "resent"
        ? "You have been invited to the MP Basketball Gym Scheduler (sent again)"
        : "You have been invited to the MP Basketball Gym Scheduler";
  const intro =
    kind === "reset"
      ? "Your password for the Midland Park basketball gym schedule was reset. Use the temporary password below. Your old password will not work."
      : kind === "resent"
        ? "Here is a new login for the Midland Park basketball gym schedule. Use this temporary password. Any earlier one will not work."
        : "You now have a login to book gym time for Midland Park basketball.";
  const nextStep =
    kind === "reset"
      ? "When you sign in, you will be asked to choose your own password before you can see the schedule."
      : "The first time you sign in, you will choose your own password. You cannot see the schedule until you do.";
  const body = [
    `Hi ${firstName},`,
    "",
    intro,
    "",
    "Sign in:",
    signInUrl,
    "",
    `Email: ${input.email}`,
    `Temporary password: ${input.temporaryPassword}`,
    "",
    nextStep,
    "",
    "If you were not expecting this, reply to the basketball admin.",
    "",
    "Thank you,",
    "MP Basketball",
    "Midland Park",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f4;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f4;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #d5ddd6;border-radius:8px;">
          <tr>
            <td style="background:#1f4d3a;color:#f4faf6;padding:20px 28px;border-radius:8px 8px 0 0;">
              <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.75;">Midland Park</p>
              <p style="margin:6px 0 0;font-size:22px;font-weight:700;">MP Basketball</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;color:#243028;font-size:16px;line-height:1.55;">
              <p style="margin:0 0 16px;">Hi ${escapeHtml(firstName)},</p>
              <p style="margin:0 0 16px;">${escapeHtml(intro)}</p>
              <p style="margin:0 0 8px;"><a href="${escapeHtml(signInUrl)}" style="color:#1f4d3a;font-weight:700;">Sign in to book gym time</a></p>
              <p style="margin:0 0 4px;"><strong>Email:</strong> ${escapeHtml(input.email)}</p>
              <p style="margin:0 0 16px;"><strong>Temporary password:</strong> ${escapeHtml(input.temporaryPassword)}</p>
              <p style="margin:0 0 16px;">${escapeHtml(nextStep)}</p>
              <p style="margin:0 0 24px;color:#5a655c;font-size:14px;">If you were not expecting this, reply to the basketball admin.</p>
              <p style="margin:0;">Thank you,<br>MP Basketball<br>Midland Park</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, body, html, signInUrl };
}

export async function sendWelcomeEmail(input: {
  name: string;
  email: string;
  temporaryPassword: string;
  role: string;
  kind?: WelcomeEmailKind;
}) {
  const copy = welcomeAccountCopy(input);
  const delivery = await deliverEmail({
    to: input.email,
    toName: input.name,
    subject: copy.subject,
    body: copy.body,
    html: copy.html,
  });

  await prisma.outboundEmail.create({
    data: {
      to: input.email,
      toName: input.name,
      subject: copy.subject,
      body: copy.body,
      status: delivery.status,
    },
  });

  return delivery;
}

export async function sendPasswordResetEmail(input: {
  name: string;
  email: string;
  token: string;
}) {
  const firstName = input.name.trim().split(/\s+/)[0] || input.name;
  const resetUrl = `${appUrl()}/reset-password?token=${encodeURIComponent(input.token)}`;
  const subject = "Reset your MP Basketball password";
  const body = [
    `Hi ${firstName},`,
    "",
    "We received a request to reset your password for the Midland Park basketball gym schedule.",
    "",
    "Use this link. It expires in one hour:",
    resetUrl,
    "",
    "If you did not ask for this, you can ignore this email and your password will stay the same.",
    "",
    "Thank you,",
    "MP Basketball",
  ].join("\n");
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f4;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f4;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #d5ddd6;border-radius:8px;">
          <tr>
            <td style="background:#1f4d3a;color:#f4faf6;padding:20px 28px;border-radius:8px 8px 0 0;">
              <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.75;">Midland Park</p>
              <p style="margin:6px 0 0;font-size:22px;font-weight:700;">MP Basketball</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;color:#243028;font-size:16px;line-height:1.55;">
              <p style="margin:0 0 16px;">Hi ${escapeHtml(firstName)},</p>
              <p style="margin:0 0 16px;">We received a request to reset your password for the Midland Park basketball gym schedule.</p>
              <p style="margin:0 0 16px;"><a href="${escapeHtml(resetUrl)}" style="color:#1f4d3a;font-weight:700;">Reset password</a></p>
              <p style="margin:0 0 16px;color:#5a655c;font-size:14px;">This link expires in one hour. If you did not ask for this, ignore the email and your password stays the same.</p>
              <p style="margin:0;">Thank you,<br>MP Basketball</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const delivery = await deliverEmail({
    to: input.email,
    toName: input.name,
    subject,
    body,
    html,
  });

  await prisma.outboundEmail.create({
    data: {
      to: input.email,
      toName: input.name,
      subject,
      body,
      status: delivery.status,
    },
  });

  return delivery;
}
