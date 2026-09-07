import { format } from "date-fns";
import { prisma } from "@/lib/prisma";

export type OutboundMail = {
  to: string;
  toName: string;
  subject: string;
  body: string;
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
  const reason = input.reasonTitle?.trim()
    ? `Due to a game or other function (${input.reasonTitle.trim()})`
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

export function welcomeAccountCopy(input: {
  name: string;
  email: string;
  temporaryPassword: string;
  role: string;
  resent?: boolean;
}) {
  const signInUrl = `${appUrl()}/login`;
  const roleLabel = input.role === "ADMIN" ? "an admin" : "a coach";
  const subject = input.resent
    ? "Your MP Basketball sign-in details (sent again)"
    : "You're on the MP Basketball board";
  const intro = input.resent
    ? "An admin is sending your MP Basketball sign-in details again. Use this new temporary password — any earlier one will not work."
    : `An admin added you to MP Basketball as ${roleLabel} so you can use the Midland Park practice board.`;
  const body = [
    `Hi ${input.name},`,
    "",
    intro,
    "",
    "Sign in here:",
    signInUrl,
    "",
    `Username / email: ${input.email}`,
    `Temporary password: ${input.temporaryPassword}`,
    "",
    "The first time you sign in, you will be asked to choose a password only you know. You cannot open the schedule until you do.",
    "",
    "Thank you,",
    "MP Basketball",
  ].join("\n");

  return { subject, body, signInUrl };
}

export async function sendWelcomeEmail(input: {
  name: string;
  email: string;
  temporaryPassword: string;
  role: string;
  resent?: boolean;
}) {
  const copy = welcomeAccountCopy(input);
  const delivery = await deliverEmail({
    to: input.email,
    toName: input.name,
    subject: copy.subject,
    body: copy.body,
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
