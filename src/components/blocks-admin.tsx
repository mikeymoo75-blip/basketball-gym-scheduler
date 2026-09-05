"use client";

import { useState } from "react";
import { toast } from "sonner";
import { type BlockKind } from "@prisma/client";
import { createBlockAction, deleteBlockAction, updateBlockAction } from "@/lib/actions";
import { blockKindLabel } from "@/lib/block-kind";
import { timeOptions, toDateInput, toTimeInput } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

type Block = {
  id: string;
  gymId: string;
  gymName: string;
  title: string;
  kind: BlockKind;
  startAt: string;
  endAt: string;
  whenLabel: string;
};

export function BlocksAdmin({
  gyms,
  blocks,
}: {
  gyms: { id: string; name: string }[];
  blocks: Block[];
}) {
  const times = timeOptions();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Block | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    gymId: gyms[0]?.id ?? "",
    date: toDateInput(new Date()),
    startTime: "17:00",
    endTime: "21:00",
    allDay: false,
    allGyms: false,
    title: "",
    kind: "GAME" as BlockKind,
  });

  const startCreate = (kind: BlockKind = "GAME") => {
    setEditing(null);
    setForm({
      gymId: gyms[0]?.id ?? "",
      date: toDateInput(new Date()),
      startTime: "17:00",
      endTime: "21:00",
      allDay: kind === "CLOSED",
      allGyms: kind === "CLOSED",
      title: "",
      kind,
    });
    setOpen(true);
  };

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => startCreate("CLOSED")}>
          Close a day
        </Button>
        <Button onClick={() => startCreate("GAME")}>Block time</Button>
      </div>
      {blocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground">
          No games or holds yet. Block a gym so coaches cannot book over it.
        </div>
      ) : (
        <div className="grid gap-3">
          {blocks.map((block) => (
            <Card key={block.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{block.title}</p>
                    <Badge variant={block.kind === "CLOSED" ? "outline" : "default"}>
                      {blockKindLabel(block.kind)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {block.gymName} · {block.whenLabel}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(block);
                      setForm({
                        gymId: block.gymId,
                        date: toDateInput(new Date(block.startAt)),
                        startTime: toTimeInput(new Date(block.startAt)),
                        endTime: toTimeInput(new Date(block.endAt)),
                        allDay: block.kind === "CLOSED",
                        allGyms: false,
                        title: block.title,
                        kind: block.kind,
                      });
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      await deleteBlockAction(block.id);
                      toast.success("Hold removed.");
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Edit hold"
                : form.kind === "CLOSED"
                  ? "Close a day"
                  : "Block gym time"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {form.kind === "CLOSED"
                ? "Pick one gym, or all gyms. A closed gym shows black that day; the others stay open unless you close them too."
                : "If a coach already booked this window, their practice is cancelled and they get a notification plus an email."}
            </p>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              const result = editing
                ? await updateBlockAction({
                    id: editing.id,
                    gymId: form.gymId,
                    date: form.date,
                    startTime: form.startTime,
                    endTime: form.endTime,
                    allDay: form.allDay,
                    title: form.title,
                    kind: form.kind,
                  })
                : await createBlockAction(form);
              setPending(false);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              const cancelled =
                "cancelledCoaches" in result ? result.cancelledCoaches ?? [] : [];
              if (cancelled.length > 0) {
                toast.success(
                  `${form.kind === "CLOSED" ? "Day closed" : editing ? "Hold updated" : "Gym blocked"}. Cancelled ${cancelled.join(", ")} and emailed those coaches.`,
                );
              } else {
                toast.success(
                  form.kind === "CLOSED"
                    ? form.allGyms
                      ? "All gyms closed. Coaches will see a black day on every floor."
                      : "That gym is closed. Other gyms stay open."
                    : editing
                      ? "Hold updated."
                      : "Gym blocked.",
                );
              }
              setOpen(false);
            }}
          >
            <div className="space-y-1.5">
              <Label>Gym</Label>
              <Select
                value={form.kind === "CLOSED" && form.allGyms ? "__all__" : form.gymId}
                onValueChange={(value) => {
                  if (!value) return;
                  if (value === "__all__") {
                    setForm({ ...form, allGyms: true, gymId: gyms[0]?.id ?? "" });
                    return;
                  }
                  setForm({ ...form, allGyms: false, gymId: value });
                }}
                items={{
                  ...(form.kind === "CLOSED" ? { __all__: "All gyms" } : {}),
                  ...Object.fromEntries(gyms.map((gym) => [gym.id, gym.name])),
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {form.kind === "CLOSED" ? (
                    <SelectItem value="__all__">All gyms</SelectItem>
                  ) : null}
                  {gyms.map((gym) => (
                    <SelectItem key={gym.id} value={gym.id}>
                      {gym.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.kind === "CLOSED" ? (
                <p className="text-xs text-muted-foreground">
                  {form.allGyms
                    ? "Every floor is closed this day."
                    : "Only this gym is closed. The rest stay open for booking."}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder={form.kind === "CLOSED" ? "School closed" : "Varsity vs. Ridgewood"}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(value) => {
                  if (!value) return;
                  const kind = value as BlockKind;
                  setForm({
                    ...form,
                    kind,
                    allDay: kind === "CLOSED" ? true : form.allDay,
                    allGyms: kind === "CLOSED" ? form.allGyms : false,
                  });
                }}
                items={{
                  GAME: "Game",
                  EVENT: "Event",
                  MAINTENANCE: "Maintenance",
                  CLOSED: "Closed",
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GAME">Game</SelectItem>
                  <SelectItem value="EVENT">Event</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                required
              />
            </div>
            {form.kind === "CLOSED" ? null : (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.allDay}
                  onCheckedChange={(checked) => setForm({ ...form, allDay: Boolean(checked) })}
                />
                All day
              </label>
            )}
            {!form.allDay && form.kind !== "CLOSED" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Select
                    value={form.startTime}
                    onValueChange={(value) => value && setForm({ ...form, startTime: value })}
                    items={Object.fromEntries(times.map((time) => [time.value, time.label]))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {times.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Select
                    value={form.endTime}
                    onValueChange={(value) => value && setForm({ ...form, endTime: value })}
                    items={Object.fromEntries(
                      [...times, { value: "22:00", label: "10:00 PM" }].map((time) => [
                        time.value,
                        time.label,
                      ])
                    )}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...times, { value: "22:00", label: "10:00 PM" }].map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : form.kind === "CLOSED" ? "Close day" : "Save hold"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
