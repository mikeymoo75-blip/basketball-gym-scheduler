"use client";

import { useState } from "react";

export type SentEmailRow = {
  id: string;
  subject: string;
  toName: string;
  to: string;
  status: string;
  createdAtLabel: string;
  body: string;
};

export function SentEmailsList({ emails }: { emails: SentEmailRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      {emails.map((mail) => {
        const open = openId === mail.id;
        return (
          <div
            key={mail.id}
            className="rounded-2xl border border-border/70 bg-card shadow-sm"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : mail.id)}
              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={open}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{mail.subject}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  To {mail.toName} · {mail.to} ·{" "}
                  {mail.status === "sent" ? "Sent" : "Logged locally"} ·{" "}
                  {mail.createdAtLabel}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {open ? "Hide" : "Show"}
              </span>
            </button>
            {open ? (
              <pre className="border-t border-border/60 px-4 py-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                {mail.body}
              </pre>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
