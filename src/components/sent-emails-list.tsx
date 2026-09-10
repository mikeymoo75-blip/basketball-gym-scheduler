"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

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
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return emails;
    return emails.filter((mail) =>
      `${mail.subject} ${mail.toName} ${mail.to} ${mail.body}`.toLowerCase().includes(needle),
    );
  }, [emails, query]);

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search subject, recipient, or letter"
      />
      <div className="grid gap-2">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No emails match that search.
          </p>
        ) : null}
        {rows.map((mail) => {
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
    </div>
  );
}
