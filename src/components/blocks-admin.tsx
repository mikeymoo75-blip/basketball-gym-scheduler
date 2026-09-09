"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { type BlockKind } from "@prisma/client";
import {
  createBlockAction,
  deleteBlockAction,
  deleteBlocksAction,
  updateBlockAction,
  updateClosedGroupAction,
} from "@/lib/actions";
import { blockKindLabel } from "@/lib/block-kind";
import { groupClosedDays } from "@/lib/closed-groups";
import { formatAppWeekday, timeOptions, toDateInput, toTimeInput } from "@/lib/time";
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
  const times = timeOptions(undefined, undefined, 30);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Block | null>(null);
  const [editingGroupIds, setEditingGroupIds] = useState<string[] | null>(null);
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
    setEditingGroupIds(null);
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

  const rows = useMemo(() => {
    const gymOrder = gyms.map((gym) => gym.name);
    const closed = groupClosedDays(blocks, gymOrder);
    const holds = blocks.filter((block) => block.kind !== "CLOSED");
    return [
      ...holds.map((block) => ({
        key: block.id,
        sortAt: block.startAt,
        kind: "hold" as const,
        block,
      })),
      ...closed.map((group) => ({
        key: group.key,
        sortAt: group.startAt,
        kind: "closed" as const,
        group,
      })),
    ].sort((a, b) => a.sortAt.localeCompare(b.sortAt));
  }, [blocks, gyms]);

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => startCreate("CLOSED")}>
          Close a day
        </Button>
        <Button variant="outline" onClick={() => startCreate("MAINTENANCE")}>
          Block hours
        </Button>
        <Button onClick={() => startCreate("GAME")}>Block time</Button>
      </div>
      {blocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground">
          No games or holds yet. Block a gym so coaches cannot book over it.
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) =>
            row.kind === "closed" ? (
              <Card key={row.key}>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{row.group.title}</p>
                      <Badge variant="outline">Closed</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatAppWeekday(new Date(row.group.startAt))}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {row.group.gymNames.map((name) => (
                        <Badge key={name} variant="secondary">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const first = row.group.blocks[0];
                        if (!first) return;
                        setEditing(null);
                        setEditingGroupIds(row.group.blocks.map((block) => block.id));
                        setForm({
                          gymId: first.gymId,
                          date: row.group.date,
                          startTime: toTimeInput(new Date(first.startAt)),
                          endTime: toTimeInput(new Date(first.endAt)),
                          allDay: true,
                          allGyms: row.group.gymNames.length === gyms.length,
                          title: row.group.title,
                          kind: "CLOSED",
                        });
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        const result = await deleteBlocksAction(
                          row.group.blocks.map((block) => block.id),
                        );
                        if ("error" in result && result.error) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success(
                          row.group.gymNames.length > 1
                            ? "Closed day removed from those gyms."
                            : "Hold removed.",
                        );
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card key={row.block.id}>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{row.block.title}</p>
                      <Badge>{blockKindLabel(row.block.kind)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {row.block.gymName} · {row.block.whenLabel}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(row.block);
                        setEditingGroupIds(null);
                        setForm({
                          gymId: row.block.gymId,
                          date: toDateInput(new Date(row.block.startAt)),
                          startTime: toTimeInput(new Date(row.block.startAt)),
                          endTime: toTimeInput(new Date(row.block.endAt)),
                          allDay: false,
                          allGyms: false,
                          title: row.block.title,
                          kind: row.block.kind,
                        });
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        await deleteBlockAction(row.block.id);
                        toast.success("Hold removed.");
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroupIds
                ? "Edit closed day"
                : editing
                  ? "Edit hold"
                  : form.kind === "CLOSED"
                    ? "Close a day"
                    : "Block gym time"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {editingGroupIds
                ? "This updates the title and date for every gym listed on that closed day."
                : form.kind === "CLOSED"
                  ? "Pick one gym, or all gyms. A closed gym shows black that day; the others stay open unless you close them too."
                  : "If a coach already booked this window, their practice is cancelled and they get a notification plus an email."}
            </p>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              const result = editingGroupIds
                ? await updateClosedGroupAction({
                    ids: editingGroupIds,
                    date: form.date,
                    title: form.title,
                  })
                : editing
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
                  editingGroupIds
                    ? "Closed day updated for those gyms."
                    : form.kind === "CLOSED"
                      ? form.allGyms
                        ? "All gyms closed. Coaches will see a gray day on every floor."
                        : "That gym is closed. Other gyms stay open."
                      : form.allGyms
                        ? "Every gym is blocked for that time."
                        : editing
                          ? "Hold updated."
                          : "Gym blocked.",
                );
              }
              setEditing(null);
              setEditingGroupIds(null);
              setOpen(false);
            }}
          >
            <div className="space-y-1.5">
              <Label>Gym</Label>
              <Select
                value={form.allGyms ? "__all__" : form.gymId}
                disabled={Boolean(editingGroupIds)}
                onValueChange={(value) => {
                  if (!value) return;
                  if (value === "__all__") {
                    setForm({ ...form, allGyms: true, gymId: gyms[0]?.id ?? "" });
                    return;
                  }
                  setForm({ ...form, allGyms: false, gymId: value });
                }}
                items={{
                  __all__: "All gyms",
                  ...Object.fromEntries(gyms.map((gym) => [gym.id, gym.name])),
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All gyms</SelectItem>
                  {gyms.map((gym) => (
                    <SelectItem key={gym.id} value={gym.id}>
                      {gym.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {editingGroupIds
                  ? "Gyms on this closed day stay the same. Remove the day and close it again to change which floors are shut."
                  : form.allGyms
                    ? form.kind === "CLOSED"
                      ? "Every floor is closed this day."
                      : "This hold applies to every gym."
                    : form.kind === "CLOSED"
                      ? "Only this gym is closed. The rest stay open for booking."
                      : "Only this gym is blocked. The rest stay open."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder={
                  form.kind === "CLOSED"
                    ? "School closed"
                    : form.kind === "MAINTENANCE"
                      ? "No bookings"
                      : "Varsity vs. Ridgewood"
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select
                value={form.kind}
                disabled={Boolean(editingGroupIds)}
                onValueChange={(value) => {
                  if (!value) return;
                  const kind = value as BlockKind;
                  setForm({
                    ...form,
                    kind,
                    allDay: kind === "CLOSED" ? true : form.allDay,
                    allGyms: form.allGyms,
                  });
                }}
                items={{
                  GAME: "Game",
                  EVENT: "Event",
                  MAINTENANCE: "Blocked hours",
                  CLOSED: "Closed",
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GAME">Game</SelectItem>
                  <SelectItem value="EVENT">Event</SelectItem>
                  <SelectItem value="MAINTENANCE">Blocked hours</SelectItem>
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
