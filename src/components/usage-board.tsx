"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CancelPracticeButton } from "@/components/cancel-practice-button";
import { Badge } from "@/components/ui/badge";
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
  teamName: string;
  coachName?: string;
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
  teamBreakdown: { teamName: string; hours: number; count: number }[];
  practices: UsagePractice[];
};

export type UsageTeam = {
  id: string;
  name: string;
  hours: number;
  count: number;
  share: number;
  overLimit: boolean;
  coachNames: string[];
  practices: UsagePractice[];
};

export function UsageBoard({
  windowLabel,
  rows,
  teamRows,
}: {
  windowLabel: string;
  rows: UsageCoach[];
  teamRows: UsageTeam[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<
    | { type: "coach"; id: string }
    | { type: "team"; id: string }
    | null
  >(null);
  const coach = selected?.type === "coach" ? rows.find((row) => row.id === selected.id) ?? null : null;
  const team = selected?.type === "team" ? teamRows.find((row) => row.id === selected.id) ?? null : null;
  const panelTitle = coach?.name ?? team?.name ?? "";
  const panelPractices = coach?.practices ?? team?.practices ?? [];
  const groups = useMemo(() => groupPractices(panelPractices), [panelPractices]);
  const showTeamOnPractice = Boolean(coach);
  const showCoachOnPractice = Boolean(team);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Hours by team</CardTitle>
          <CardDescription>
            Limits are per team. A coach with two teams is not counted as one pile of hours.
            Click a team to see its practice days and times.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {teamRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams yet.</p>
          ) : (
            teamRows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelected({ type: "team", id: row.id })}
                className={cn(
                  "w-full space-y-1.5 rounded-xl p-2 text-left transition-colors",
                  "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.coachNames.length ? row.coachNames.join(" · ") : "No practices in this window"}
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

      <Card>
        <CardHeader>
          <CardTitle>Hours by coach</CardTitle>
          <CardDescription>
            Totals across every team they book. Click a coach to see each practice and
            which team it was for.
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
                onClick={() => setSelected({ type: "coach", id: row.id })}
                className={cn(
                  "w-full space-y-1.5 rounded-xl p-2 text-left transition-colors",
                  "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.teamBreakdown.length
                        ? row.teamBreakdown
                            .map((item) => `${item.teamName} ${item.hours.toFixed(1)}h`)
                            .join(" · ")
                        : row.email}
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

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-md" side="right">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{panelTitle}</SheetTitle>
                <SheetDescription>
                  Practice days and times in the {windowLabel} window.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-6">
                <p className="text-sm text-muted-foreground">
                  {(coach?.hours ?? team?.hours ?? 0).toFixed(1)} hours ·{" "}
                  {coach?.count ?? team?.count ?? 0}{" "}
                  {(coach?.count ?? team?.count ?? 0) === 1 ? "practice" : "practices"}
                </p>
                {groups.length === 0 ? (
                  <p className="rounded-lg bg-muted px-3 py-4 text-sm text-muted-foreground">
                    No practices on the board in this window.
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
                              {showTeamOnPractice ? (
                                <p className="text-sm">{practice.teamName}</p>
                              ) : null}
                              {showCoachOnPractice && practice.coachName ? (
                                <p className="text-sm text-muted-foreground">{practice.coachName}</p>
                              ) : null}
                              {practice.notes ? (
                                <p className="mt-1 text-sm">{practice.notes}</p>
                              ) : null}
                            </div>
                            <CancelPracticeButton
                              bookingId={practice.id}
                              canEmailCoach
                              label="Cancel practice"
                              fullWidth
                              className="h-9 bg-destructive text-white hover:bg-destructive/90"
                              onCancelled={() => router.refresh()}
                            />
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
