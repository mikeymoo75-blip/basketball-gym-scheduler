"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createTeamAction, deleteTeamAction, updateTeamAction } from "@/lib/actions";
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
import { Textarea } from "@/components/ui/textarea";

type Team = {
  id: string;
  name: string;
  notes: string | null;
  active: boolean;
  coachIds: string[];
  coachNames: string[];
  bookingCount: number;
};

export function TeamsAdmin({
  teams,
  coaches,
}: {
  teams: Team[];
  coaches: { id: string; name: string; role?: "ADMIN" | "COACH" }[];
}) {
  const empty = { name: "", notes: "", active: true, coachIds: [] as string[] };
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
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
          Add team
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No teams yet. Add Varsity, JV, freshman, or rec so coaches can tag each practice.
          </p>
        ) : (
          teams.map((team) => (
            <Card key={team.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-lg font-semibold">{team.name}</p>
                    {team.notes ? (
                      <p className="text-sm text-muted-foreground">{team.notes}</p>
                    ) : null}
                  </div>
                  <Badge variant={team.active ? "secondary" : "outline"}>
                    {team.active ? "Active" : "Retired"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {team.coachNames.length
                    ? team.coachNames.join(" · ")
                    : "No coaches assigned yet"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {team.bookingCount} {team.bookingCount === 1 ? "practice" : "practices"} on the board
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(team);
                      setForm({
                        name: team.name,
                        notes: team.notes ?? "",
                        active: team.active,
                        coachIds: team.coachIds,
                      });
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (!confirm(`Remove ${team.name}?`)) return;
                      const result = await deleteTeamAction(team.id);
                      if (result.error) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success("Team removed.");
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit team" : "Add team"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              const result = editing
                ? await updateTeamAction({ id: editing.id, ...form })
                : await createTeamAction(form);
              setPending(false);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success(editing ? "Team updated." : "Team added.");
              setOpen(false);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="team-name">Name</Label>
              <Input
                id="team-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Varsity Boys"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team-notes">Notes</Label>
              <Textarea
                id="team-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Who coaches this team</Label>
              {coaches.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add coaches or admins under People first.</p>
              ) : (
                coaches.map((coach) => (
                  <label key={coach.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.coachIds.includes(coach.id)}
                      onCheckedChange={(checked) =>
                        setForm({
                          ...form,
                          coachIds: checked
                            ? [...form.coachIds, coach.id]
                            : form.coachIds.filter((id) => id !== coach.id),
                        })
                      }
                    />
                    {coach.name}
                    {coach.role === "ADMIN" ? " (admin)" : ""}
                  </label>
                ))
              )}
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
