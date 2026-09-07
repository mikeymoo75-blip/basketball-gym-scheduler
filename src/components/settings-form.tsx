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
  people,
}: {
  settings: {
    monopolyWindowDays: number;
    monopolyHoursThreshold: number;
    monopolyShareThreshold: number;
    supportEmail: string | null;
    supportPhone: string | null;
  };
  people: Person[];
}) {
  const [windowDays, setWindowDays] = useState(String(settings.monopolyWindowDays));
  const [hours, setHours] = useState(String(settings.monopolyHoursThreshold));
  const [share, setShare] = useState(String(Math.round(settings.monopolyShareThreshold * 100)));
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail ?? "");
  const [supportPhone, setSupportPhone] = useState(settings.supportPhone ?? "");
  const [recipients, setRecipients] = useState(
    new Set(people.filter((person) => person.receivesMonopolyAlerts).map((person) => person.id))
  );
  const [pending, setPending] = useState(false);

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
              monopolyHoursThreshold: Number(hours),
              monopolyShareThreshold: Number(share) / 100,
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="window">Window (days)</Label>
              <Input
                id="window"
                type="number"
                min={7}
                max={90}
                value={windowDays}
                onChange={(event) => setWindowDays(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hours">Hours cap</Label>
              <Input
                id="hours"
                type="number"
                min={1}
                step={0.5}
                value={hours}
                onChange={(event) => setHours(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="share">Share cap (%)</Label>
              <Input
                id="share"
                type="number"
                min={1}
                max={100}
                value={share}
                onChange={(event) => setShare(event.target.value)}
              />
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
