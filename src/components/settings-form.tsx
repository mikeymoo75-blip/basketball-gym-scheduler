"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateSettingsAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Person = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "COACH";
  receivesMonopolyAlerts: boolean;
};

export function SettingsForm({
  settings,
  capacity,
  people,
}: {
  settings: {
    monopolyWindowDays: number;
    monopolyFairMultiplier: number;
    supportEmail: string | null;
    supportPhone: string | null;
  };
  capacity: {
    availableHours: number;
    coachCount: number;
    gymCount: number;
    equalHours: number;
    limitHours: number;
  };
  people: Person[];
}) {
  const [windowDays, setWindowDays] = useState(String(settings.monopolyWindowDays));
  const [percent, setPercent] = useState(String(Math.round(settings.monopolyFairMultiplier * 100)));
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail ?? "");
  const [supportPhone, setSupportPhone] = useState(settings.supportPhone ?? "");
  const [recipients, setRecipients] = useState(
    new Set(people.filter((person) => person.receivesMonopolyAlerts).map((person) => person.id))
  );
  const [pending, setPending] = useState(false);

  const multiplier = Math.max(1, Number(percent) / 100 || 1.5);
  const previewEqual =
    capacity.coachCount > 0 ? capacity.availableHours / capacity.coachCount : capacity.availableHours;
  const previewLimit = previewEqual * multiplier;

  return (
    <Card>
      <CardContent>
        <form
          className="grid gap-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            const result = await updateSettingsAction({
              monopolyWindowDays: Number(windowDays),
              monopolyFairMultiplier: Number(percent) / 100,
              recipientIds: [...recipients],
              supportEmail,
              supportPhone,
            });
            setPending(false);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success("Settings saved.");
          }}
        >
          <div className="rounded-xl border bg-muted/40 p-4 text-sm">
            <p className="font-medium">Right now</p>
            <p className="mt-1 text-muted-foreground">
              {capacity.gymCount} gyms · {capacity.availableHours.toFixed(0)} open hours in this
              window · {capacity.coachCount} coach{capacity.coachCount === 1 ? "" : "es"} with a
              team. Equal split is {previewEqual.toFixed(1)}h. Alert at {previewLimit.toFixed(1)}h
              ({percent || "150"}% of equal).
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="window">Window (days back and ahead)</Label>
              <Input
                id="window"
                type="number"
                min={7}
                max={90}
                value={windowDays}
                onChange={(event) => setWindowDays(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Counts practices and open hours from this many days ago through this many days
                from now.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="percent">Alert at % of an equal split</Label>
              <Input
                id="percent"
                type="number"
                min={100}
                max={300}
                step={5}
                value={percent}
                onChange={(event) => setPercent(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                100% flags anyone over a perfectly even split. 150% (default) gives some room.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Help contact</Label>
              <p className="text-xs text-muted-foreground">
                Shown in the side menu after people sign in. Leave blank to hide.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="supportEmail">Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  inputMode="email"
                  placeholder="office@example.com"
                  value={supportEmail}
                  onChange={(event) => setSupportEmail(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supportPhone">Phone</Label>
                <Input
                  id="supportPhone"
                  type="tel"
                  inputMode="tel"
                  placeholder="(201) 555-0100"
                  value={supportPhone}
                  onChange={(event) => setSupportPhone(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Monopoly alert recipients</Label>
              <p className="text-xs text-muted-foreground">
                Admins are always notified. Check anyone else who should see the same alerts.
              </p>
            </div>
            <div className="space-y-2 rounded-xl bg-muted/50 p-3">
              {people.map((person) => (
                <label key={person.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={recipients.has(person.id) || person.role === "ADMIN"}
                    disabled={person.role === "ADMIN"}
                    onCheckedChange={(checked) => {
                      const next = new Set(recipients);
                      if (checked) next.add(person.id);
                      else next.delete(person.id);
                      setRecipients(next);
                    }}
                  />
                  <span>
                    {person.name}
                    <span className="text-muted-foreground">
                      {" "}
                      · {person.role === "ADMIN" ? "Admin (always)" : person.email}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
