"use client";

import { useState } from "react";
import { toast } from "sonner";
import { type BlockKind } from "@prisma/client";
import { createBlockAction, deleteBlockAction, updateBlockAction } from "@/lib/actions";
import { timeOptions, toDateInput, toTimeInput } from "@/lib/time";
import { Button } from "@/components/ui/button";
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

type EditableBlock = {
  id: string;
  gymId: string;
  title: string;
  kind: BlockKind;
  startAt: string;
  endAt: string;
};

export function BlockDialog({
  open,
  onOpenChange,
  gyms,
  block,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gyms: { id: string; name: string }[];
  block: EditableBlock | null;
}) {
  const times = timeOptions(undefined, undefined, 30);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState(() => ({
    gymId: block?.gymId ?? gyms[0]?.id ?? "",
    date: block ? toDateInput(new Date(block.startAt)) : toDateInput(new Date()),
    startTime: block ? toTimeInput(new Date(block.startAt)) : "17:00",
    endTime: block ? toTimeInput(new Date(block.endAt)) : "21:00",
    title: block?.title ?? "",
    kind: (block?.kind ?? "GAME") as BlockKind,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{block ? "Edit hold" : "Block gym time"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            const result = block
              ? await updateBlockAction({
                  id: block.id,
                  gymId: form.gymId,
                  date: form.date,
                  startTime: form.startTime,
                  endTime: form.endTime,
                  allDay: form.kind === "CLOSED",
                  title: form.title,
                  kind: form.kind,
                })
              : await createBlockAction({
                  gymId: form.gymId,
                  date: form.date,
                  startTime: form.startTime,
                  endTime: form.endTime,
                  allDay: form.kind === "CLOSED",
                  title: form.title,
                  kind: form.kind,
                });
            setPending(false);
            if (result && "error" in result && result.error) {
              toast.error(result.error);
              return;
            }
            toast.success(block ? "Hold updated." : "Gym blocked.");
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <Label>Gym</Label>
            <Select
              value={form.gymId}
              onValueChange={(value) => value && setForm({ ...form, gymId: value })}
              items={Object.fromEntries(gyms.map((gym) => [gym.id, gym.name]))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {gyms.map((gym) => (
                  <SelectItem key={gym.id} value={gym.id}>
                    {gym.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="block-title">Title</Label>
            <Input
              id="block-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kind</Label>
            <Select
              value={form.kind}
              onValueChange={(value) => value && setForm({ ...form, kind: value as BlockKind })}
              items={{ GAME: "Game", EVENT: "Event", MAINTENANCE: "Blocked hours", CLOSED: "Closed" }}
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
            <Label htmlFor="block-date">Date</Label>
            <Input
              id="block-date"
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
              required
            />
          </div>
          {form.kind === "CLOSED" ? null : (
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
                    [...times, { value: "22:00", label: "10:00 PM" }].map((time) => [time.value, time.label]),
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
          )}
          <DialogFooter>
            {block ? (
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  await deleteBlockAction(block.id);
                  setPending(false);
                  toast.success("Hold removed.");
                  onOpenChange(false);
                }}
              >
                Remove
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
