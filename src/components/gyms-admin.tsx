"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createGymAction, deleteGymAction, updateGymAction } from "@/lib/actions";
import { formatClock, hourBoundaryOptions } from "@/lib/time";
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
import { Textarea } from "@/components/ui/textarea";

type Gym = {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
  active: boolean;
  bookFrom: string;
  bookUntil: string;
};

const empty = {
  name: "",
  address: "",
  notes: "",
  active: true,
  bookFrom: "06:00",
  bookUntil: "22:00",
};

export function GymsAdmin({ gyms }: { gyms: Gym[] }) {
  const hours = hourBoundaryOptions();
  const hourItems = Object.fromEntries(hours.map((time) => [time.value, time.label]));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Gym | null>(null);
  const [form, setForm] = useState(empty);
  const [pending, setPending] = useState(false);

  const startCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const startEdit = (gym: Gym) => {
    setEditing(gym);
    setForm({
      name: gym.name,
      address: gym.address ?? "",
      notes: gym.notes ?? "",
      active: gym.active,
      bookFrom: gym.bookFrom,
      bookUntil: gym.bookUntil,
    });
    setOpen(true);
  };

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={startCreate}>Add gym</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {gyms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No gyms yet. Add Godwin, Highland, or any floor coaches should book.
          </p>
        ) : null}
        {gyms.map((gym) => (
          <Card key={gym.id}>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-lg font-semibold">{gym.name}</p>
                  {gym.address ? (
                    <p className="text-sm text-muted-foreground">{gym.address}</p>
                  ) : null}
                </div>
                <Badge variant={gym.active ? "secondary" : "outline"}>
                  {gym.active ? "Open" : "Retired"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Bookable {formatClock(gym.bookFrom)} – {formatClock(gym.bookUntil)}
              </p>
              {gym.notes ? <p className="text-sm">{gym.notes}</p> : null}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => startEdit(gym)}>
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm(`Remove ${gym.name} and its bookings?`)) return;
                    await deleteGymAction(gym.id);
                    toast.success("Gym removed.");
                  }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit gym" : "Add gym"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              const result = editing
                ? await updateGymAction({ id: editing.id, ...form })
                : await createGymAction(form);
              setPending(false);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success(editing ? "Gym updated." : "Gym added.");
              setOpen(false);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Description</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bookable from</Label>
                <Select
                  value={form.bookFrom}
                  onValueChange={(value) => value && setForm({ ...form, bookFrom: value })}
                  items={hourItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((time) => (
                      <SelectItem key={`from-${time.value}`} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bookable until</Label>
                <Select
                  value={form.bookUntil}
                  onValueChange={(value) => value && setForm({ ...form, bookUntil: value })}
                  items={hourItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((time) => (
                      <SelectItem key={`until-${time.value}`} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="-mt-1 text-xs text-muted-foreground">
              Coaches can only request 60-minute practices inside this window. You can
              change it later when you know the school hours.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: Boolean(checked) })}
              />
              Available for booking
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
