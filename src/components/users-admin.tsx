"use client";

import { useState } from "react";
import { toast } from "sonner";
import { type Role } from "@prisma/client";
import {
  createUserAction,
  deleteUserAction,
  resendWelcomeAction,
  resetPasswordAction,
  updateUserAction,
} from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  mustChangePassword: boolean;
  teamIds: string[];
  teamNames: string[];
};

const empty = {
  name: "",
  email: "",
  password: "",
  role: "COACH" as Role,
  active: true,
  receivesMonopolyAlerts: false,
  teamIds: [] as string[],
};

function generateTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let value = "";
  for (const byte of bytes) {
    value += alphabet[byte % alphabet.length];
  }
  return `${value}!`;
}

export function UsersAdmin({
  users,
  teams,
  currentUserId,
}: {
  users: Person[];
  teams: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [resetting, setResetting] = useState<Person | null>(null);
  const [removing, setRemoving] = useState<Person | null>(null);
  const [resending, setResending] = useState<Person | null>(null);
  const [form, setForm] = useState(empty);
  const [tempPassword, setTempPassword] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setForm({ ...empty, password: generateTempPassword() });
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
                  {person.mustChangePassword ? (
                    <Badge variant="outline">Must change password</Badge>
                  ) : null}
                  {person.receivesMonopolyAlerts ? (
                    <Badge variant="outline">Alert recipient</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{person.email}</p>
                {person.teamNames.length ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {person.teamNames.join(" · ")}
                  </p>
                ) : person.role === "COACH" ? (
                  <p className="mt-1 text-xs text-muted-foreground">No team assigned</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {person.mustChangePassword && person.id !== currentUserId ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResending(person);
                      setResendOpen(true);
                    }}
                  >
                    Resend welcome
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onClick={() => {
                    setResetting(person);
                    setTempPassword(generateTempPassword());
                    setResetOpen(true);
                  }}
                >
                  Reset password
                </Button>
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
                      teamIds: person.teamIds,
                    });
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
                {person.id !== currentUserId ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setRemoving(person);
                      setRemoveOpen(true);
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit person" : "Add person"}</DialogTitle>
            {!editing ? (
              <DialogDescription>
                Give them a temporary password. They will be asked to choose their own
                the first time they sign in.
              </DialogDescription>
            ) : null}
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
                    password: undefined,
                  })
                : await createUserAction(form);
              setPending(false);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success(
                editing
                  ? "Person updated."
                  : "Person added. A welcome email was sent with the site link and temporary password.",
              );
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
            {!editing ? (
              <div className="space-y-1.5">
                <Label htmlFor="password">Temporary password</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="password"
                    type="text"
                    autoComplete="off"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForm({ ...form, password: generateTempPassword() })}
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy this before you save. They cannot open the schedule until they
                  replace it with a password of their own.
                </p>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => value && setForm({ ...form, role: value as Role })}
                items={{ COACH: "Coach", ADMIN: "Admin" }}
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
            {form.role === "COACH" && teams.length > 0 ? (
              <div className="space-y-2">
                <Label>Teams they coach</Label>
                {teams.map((team) => (
                  <label key={team.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.teamIds.includes(team.id)}
                      onCheckedChange={(checked) =>
                        setForm({
                          ...form,
                          teamIds: checked
                            ? [...form.teamIds, team.id]
                            : form.teamIds.filter((id) => id !== team.id),
                        })
                      }
                    />
                    {team.name}
                  </label>
                ))}
              </div>
            ) : null}
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

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              {resetting
                ? `Set a temporary password for ${resetting.name}. They will have to change it the next time they sign in.`
                : "Set a temporary password."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!resetting) return;
              setPending(true);
              const result = await resetPasswordAction({
                id: resetting.id,
                password: tempPassword,
              });
              setPending(false);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success(
                "Temporary password saved. Share it with them — they must change it on next sign-in.",
              );
              setResetOpen(false);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="tempPassword">Temporary password</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="tempPassword"
                  type="text"
                  autoComplete="off"
                  value={tempPassword}
                  onChange={(event) => setTempPassword(event.target.value)}
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTempPassword(generateTempPassword())}
                >
                  Generate
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Reset password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resendOpen}
        onOpenChange={(next) => {
          setResendOpen(next);
          if (!next) setResending(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resend welcome to {resending?.name ?? "this person"}?</DialogTitle>
            <DialogDescription>
              We will email a new temporary password to {resending?.email ?? "them"} and
              the sign-in link. The old temporary password will stop working. They still
              have to choose their own password the first time they sign in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResendOpen(false);
                setResending(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={pending || !resending}
              onClick={async () => {
                if (!resending) return;
                setPending(true);
                const result = await resendWelcomeAction(resending.id);
                setPending(false);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success(
                  result.delivery === "logged"
                    ? `Letter saved under Games & closed days → Sent mail. Mail is not configured on this machine.`
                    : `Welcome email sent again to ${resending.email}.`,
                );
                setResendOpen(false);
                setResending(null);
              }}
            >
              {pending ? "Sending…" : "Resend welcome"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeOpen}
        onOpenChange={(next) => {
          setRemoveOpen(next);
          if (!next) setRemoving(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removing?.name ?? "this person"}?</DialogTitle>
            <DialogDescription>
              They will be taken off the roster and cannot sign in. Any practices
              they booked are removed from the board. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRemoveOpen(false);
                setRemoving(null);
              }}
            >
              Keep them
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !removing}
              onClick={async () => {
                if (!removing) return;
                setPending(true);
                const result = await deleteUserAction(removing.id);
                setPending(false);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success(`${removing.name} was removed.`);
                setRemoveOpen(false);
                setRemoving(null);
              }}
            >
              {pending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
