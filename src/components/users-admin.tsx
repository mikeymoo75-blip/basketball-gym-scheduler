"use client";

import { useState } from "react";
import { toast } from "sonner";
import { type Role } from "@prisma/client";
import { createUserAction, updateUserAction } from "@/lib/actions";
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

type Person = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  receivesMonopolyAlerts: boolean;
};

const empty = {
  name: "",
  email: "",
  password: "",
  role: "COACH" as Role,
  active: true,
  receivesMonopolyAlerts: false,
};

export function UsersAdmin({ users }: { users: Person[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [form, setForm] = useState(empty);
  const [pending, setPending] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setForm(empty);
            setOpen(true);
          }}
        >
          Add person
        </Button>
      </div>
      <div className="grid gap-3">
        {users.map((person) => (
          <Card key={person.id}>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{person.name}</p>
                  <Badge variant={person.role === "ADMIN" ? "default" : "secondary"}>
                    {person.role === "ADMIN" ? "Admin" : "Coach"}
                  </Badge>
                  {!person.active ? <Badge variant="outline">Inactive</Badge> : null}
                  {person.receivesMonopolyAlerts ? (
                    <Badge variant="outline">Alert recipient</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{person.email}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(person);
                  setForm({
                    name: person.name,
                    email: person.email,
                    password: "",
                    role: person.role,
                    active: person.active,
                    receivesMonopolyAlerts: person.receivesMonopolyAlerts,
                  });
                  setOpen(true);
                }}
              >
                Edit
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit person" : "Add person"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              const result = editing
                ? await updateUserAction({
                    id: editing.id,
                    ...form,
                    password: form.password || undefined,
                  })
                : await createUserAction(form);
              setPending(false);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success(editing ? "Person updated." : "Person added.");
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">
                {editing ? "New password (optional)" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required={!editing}
                minLength={editing ? undefined : 8}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => value && setForm({ ...form, role: value as Role })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COACH">Coach</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: Boolean(checked) })}
              />
              Active account
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.receivesMonopolyAlerts}
                onCheckedChange={(checked) =>
                  setForm({ ...form, receivesMonopolyAlerts: Boolean(checked) })
                }
              />
              Receives monopoly alerts
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
