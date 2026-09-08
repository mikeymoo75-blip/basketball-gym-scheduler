"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteSchoolDayAction, saveSchoolDayAction } from "@/lib/actions";
import {
  SCHOOL_DAY_START,
  SCHOOL_FULL_DAY_END,
  SCHOOL_HALF_DAY_END,
} from "@/lib/mp-school-calendar";
import { formatClock, hourBoundaryOptions } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SchoolDayRow = {
  date: string;
  weekday: string;
  monthLabel: string;
  startTime: string;
  endTime: string;
  half: boolean;
  note?: string;
};

export function SchoolHoursAdmin({ days }: { days: SchoolDayRow[] }) {
  const router = useRouter();
  const hours = hourBoundaryOptions();
  const hourItems = Object.fromEntries(hours.map((time) => [time.value, time.label]));
  const [open, setOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: "",
    startTime: SCHOOL_DAY_START,
    endTime: SCHOOL_FULL_DAY_END,
  });
  const [pending, setPending] = useState(false);
  const [halfOnly, setHalfOnly] = useState(false);
  const [monthFilter, setMonthFilter] = useState("all");

  const monthLabels = useMemo(
    () => [...new Set(days.map((day) => day.monthLabel))],
    [days],
  );
  const monthItems = useMemo(
    () => Object.fromEntries([["all", "All months"], ...monthLabels.map((label) => [label, label])]),
    [monthLabels],
  );

  const grouped = useMemo(() => {
    const visible = days.filter((day) => {
      if (halfOnly && !day.half) return false;
      if (monthFilter !== "all" && day.monthLabel !== monthFilter) return false;
      return true;
    });
    const months: { label: string; days: SchoolDayRow[] }[] = [];
    for (const day of visible) {
      const last = months[months.length - 1];
      if (!last || last.label !== day.monthLabel) {
        months.push({ label: day.monthLabel, days: [day] });
      } else {
        last.days.push(day);
      }
    }
    return months;
  }, [days, halfOnly, monthFilter]);

  const startEdit = (day?: SchoolDayRow) => {
    if (day) {
      setEditingDate(day.date);
      setForm({ date: day.date, startTime: day.startTime, endTime: day.endTime });
    } else {
      setEditingDate(null);
      setForm({
        date: "",
        startTime: SCHOOL_DAY_START,
        endTime: SCHOOL_FULL_DAY_END,
      });
    }
    setOpen(true);
  };

  const save = async (date: string, startTime: string, endTime: string) => {
    setPending(true);
    const result = await saveSchoolDayAction({ date, startTime, endTime });
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return false;
    }
    if (result.cancelledCoaches.length) {
      toast.success(
        `School hours saved. Cancelled ${result.cancelledCoaches.join(", ")} and emailed those coaches.`,
      );
    } else {
      toast.success("School hours saved.");
    }
    setOpen(false);
    router.refresh();
    return true;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={halfOnly ? "default" : "outline"}
            onClick={() => setHalfOnly((value) => !value)}
          >
            {halfOnly ? "Showing half days" : "Half days only"}
          </Button>
          {monthLabels.length > 0 ? (
            <Select
              value={monthFilter}
              onValueChange={(value) => value && setMonthFilter(value)}
              items={monthItems}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {monthLabels.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        <Button onClick={() => startEdit()}>Add school day</Button>
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No school days on the board yet. Use Add school day, or restart the app so the
          2026–2027 calendar can load.
        </p>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">No school days match that filter.</p>
      ) : (
        grouped.map((month) => (
          <section key={month.label} className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">{month.label}</h2>
            <div className="grid gap-2">
              {month.days.map((day) => (
                <Card key={day.date}>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {day.weekday}, {day.date.slice(5, 7)}/{day.date.slice(8, 10)}/{day.date.slice(0, 4)}
                        </p>
                        <Badge variant={day.half ? "default" : "secondary"}>
                          {day.half ? "Half day" : "Full day"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatClock(day.startTime)} – {formatClock(day.endTime)}
                        {day.note ? ` · ${day.note}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          save(
                            day.date,
                            SCHOOL_DAY_START,
                            day.half ? SCHOOL_FULL_DAY_END : SCHOOL_HALF_DAY_END,
                          )
                        }
                      >
                        {day.half ? "Make full day" : "Make half day"}
                      </Button>
                      <Button variant="outline" onClick={() => startEdit(day)}>
                        Edit times
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={pending}
                        onClick={async () => {
                          if (!confirm(`Remove school hours on ${day.date}? Gyms stay open that day.`)) {
                            return;
                          }
                          setPending(true);
                          const result = await deleteSchoolDayAction(day.date);
                          setPending(false);
                          if (result.error) {
                            toast.error(result.error);
                            return;
                          }
                          toast.success("School hours removed for that day.");
                          router.refresh();
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDate ? "Edit school hours" : "Add school day"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              await save(form.date, form.startTime, form.endTime);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="school-date">Date</Label>
              <Input
                id="school-date"
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                required
                disabled={Boolean(editingDate)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm({
                    ...form,
                    startTime: SCHOOL_DAY_START,
                    endTime: SCHOOL_FULL_DAY_END,
                  })
                }
              >
                Full day 6:00–5:00
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm({
                    ...form,
                    startTime: SCHOOL_DAY_START,
                    endTime: SCHOOL_HALF_DAY_END,
                  })
                }
              >
                Half day 6:00–12:30
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From</Label>
                <Select
                  value={form.startTime}
                  onValueChange={(value) => value && setForm({ ...form, startTime: value })}
                  items={hourItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Until</Label>
                <Select
                  value={form.endTime}
                  onValueChange={(value) => value && setForm({ ...form, endTime: value })}
                  items={hourItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((time) => (
                      <SelectItem key={`end-${time.value}`} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Applies to Godwin, Highland 1 and 2, and both high school gyms. After the
              until time, coaches can book practice.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !form.date}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
