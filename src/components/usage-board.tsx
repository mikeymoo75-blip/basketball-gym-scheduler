"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { deleteBookingAction } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatRange } from "@/lib/time";
import { cn } from "@/lib/utils";

export type UsagePractice = {
  id: string;
  gymName: string;
  startAt: string;
  endAt: string;
  notes: string | null;
};

export type UsageCoach = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  hours: number;
  count: number;
  share: number;
  overLimit: boolean;
  practices: UsagePractice[];
};

export function UsageBoard({
  windowLabel,
  rows,
}: {
  windowLabel: string;
  rows: UsageCoach[];
}) {
  const router = useRouter();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const coach = rows.find((row) => row.id === coachId) ?? null;
  const groups = useMemo(() => (coach ? groupPractices(coach.practices) : []), [coach]);

  const cancelPractice = async (practice: UsagePractice) => {
    const day = format(new Date(practice.startAt), "EEEE, MMM d");
    const when = formatRange(new Date(practice.startAt), new Date(practice.endAt));
    if (
      !confirm(
        `Cancel ${coach?.name ?? "this coach"}'s practice at ${practice.gymName} on ${day} (${when})? The coach will be notified.`
      )
    ) {
      return;
    }
    setPendingId(practice.id);
    const result = await deleteBookingAction(practice.id);
    setPendingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.notified
        ? "Practice cancelled. The coach was notified and emailed."
        : "Practice cancelled."
    );
    router.refresh();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Hours by coach</CardTitle>
          <CardDescription>
            Sorted by time taken. Click a coach to see their practice days and times.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No coaches yet.</p>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setCoachId(row.id)}
                className={cn(
                  "w-full space-y-1.5 rounded-xl p-2 text-left transition-colors",
                  "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.email}
                      {!row.active ? " · deactivated" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.overLimit ? <Badge variant="destructive">Over limit</Badge> : null}
                    <p className="text-sm tabular-nums">
                      {row.hours.toFixed(1)}h · {row.count} practices · {Math.round(row.share * 100)}%
                    </p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={row.overLimit ? "h-full bg-destructive" : "h-full bg-primary"}
                    style={{ width: `${Math.min(100, Math.max(2, row.share * 100))}%` }}
                  />
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Sheet open={Boolean(coach)} onOpenChange={(open) => !open && setCoachId(null)}>
        <SheetContent className="sm:max-w-md" side="right">
          {coach ? (
            <>
              <SheetHeader>
                <SheetTitle>{coach.name}</SheetTitle>
                <SheetDescription>
                  Practice days and times in the {windowLabel} window.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-6">
                <p className="text-sm text-muted-foreground">
                  {coach.hours.toFixed(1)} hours · {coach.count}{" "}
                  {coach.count === 1 ? "practice" : "practices"}
                  {!coach.active ? " · deactivated" : ""}
                </p>
                {groups.length === 0 ? (
                  <p className="rounded-lg bg-muted px-3 py-4 text-sm text-muted-foreground">
                    {coach.name} has no practices on the board in this window.
                  </p>
                ) : (
                  groups.map((group) => (
                    <div key={group.key} className="space-y-2">
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {group.label}
                      </p>
                      <ul className="space-y-2">
                        {group.items.map((practice) => (
                          <li
                            key={practice.id}
                            className="space-y-3 rounded-lg border bg-card px-3 py-3"
                          >
                            <div>
                              <p className="font-medium">{practice.gymName}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatRange(
                                  new Date(practice.startAt),
                                  new Date(practice.endAt)
                                )}
                              </p>
                              {practice.notes ? (
                                <p className="mt-1 text-sm">{practice.notes}</p>
                              ) : null}
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              className="h-9 w-full bg-destructive text-white hover:bg-destructive/90"
                              disabled={pendingId === practice.id}
                              onClick={() => cancelPractice(practice)}
                            >
                              {pendingId === practice.id ? "Cancelling…" : "Cancel practice"}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function groupPractices(practices: UsagePractice[]) {
  const byDay = new Map<string, { key: string; label: string; items: UsagePractice[] }>();
  for (const practice of practices) {
    const start = new Date(practice.startAt);
    const key = format(start, "yyyy-MM-dd");
    const current = byDay.get(key) ?? {
      key,
      label: format(start, "EEEE, MMM d"),
      items: [],
    };
    current.items.push(practice);
    byDay.set(key, current);
  }
  return [...byDay.values()];
}
